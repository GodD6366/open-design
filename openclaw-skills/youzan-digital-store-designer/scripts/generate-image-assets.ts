import { existsSync } from "node:fs";
import { access, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { homedir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_TIMEOUT_MS = 600_000;
const DEFAULT_IMAGE_MODEL = "gpt-image-2";
const DEFAULT_OPENAI_BASE_URL = "https://api.openai.com/v1";
const AZURE_DEFAULT_API_VERSION = "2024-02-01";

const OPENAI_KEY_ENV_KEYS = [
  "OD_OPENAI_API_KEY",
  "OPENAI_API_KEY",
  "AZURE_API_KEY",
  "AZURE_OPENAI_API_KEY",
];
const OPENAI_BASE_URL_ENV_KEYS = [
  "OPENAI_IMAGE_COMPATIBLE_BASE_URL",
  "OPENAI_IMAGE_BASE_URL",
  "OPENAI_COMPATIBLE_BASE_URL",
];

type JsonObject = Record<string, unknown>;

type ImageRequestItem = {
  id: string;
  prompt: string;
  size: string;
  files: string[];
  status: string;
  url: string;
};

type OpenAIConfig = {
  apiKey: string;
  baseUrl: string;
  model: string;
};

type ProcessResult = {
  stdout: string;
  stderr: string;
};

class CommandError extends Error {
  stdout: string;
  stderr: string;
  exitCode: number | null;

  constructor(message: string, result: ProcessResult & { exitCode: number | null }) {
    super(message);
    this.stdout = result.stdout;
    this.stderr = result.stderr;
    this.exitCode = result.exitCode;
  }
}

function parseArgs(argv: string[]) {
  const args = { positional: [] as string[], options: new Map<string, string[]>() };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) {
      args.positional.push(token);
      continue;
    }
    const eq = token.indexOf("=");
    const key = eq >= 0 ? token.slice(2, eq) : token.slice(2);
    const value =
      eq >= 0
        ? token.slice(eq + 1)
        : index + 1 < argv.length && !argv[index + 1].startsWith("--")
          ? argv[++index]
          : "true";
    const list = args.options.get(key) ?? [];
    list.push(value);
    args.options.set(key, list);
  }
  return args;
}

function option(options: Map<string, string[]>, key: string, fallback = "") {
  return options.get(key)?.[0] ?? fallback;
}

function positiveIntegerOption(options: Map<string, string[]>, key: string, fallback: number) {
  const raw = option(options, key);
  if (!raw) return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`--${key} must be a positive number`);
  }
  return Math.round(parsed);
}

function cleanString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asObject(value: unknown): JsonObject {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonObject) : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

async function readJson(filePath: string): Promise<JsonObject> {
  const raw = await readFile(filePath, "utf8");
  const parsed = JSON.parse(raw) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`${filePath} must contain a JSON object`);
  }
  return parsed as JsonObject;
}

async function fileExists(filePath: string) {
  try {
    const info = await stat(filePath);
    return info.isFile();
  } catch {
    return false;
  }
}

function expandHome(raw: string) {
  if (raw === "~") return homedir();
  if (raw.startsWith("~/")) return path.join(homedir(), raw.slice(2));
  return raw;
}

function resolvePath(raw: string) {
  const expanded = expandHome(raw);
  return path.isAbsolute(expanded) ? expanded : path.resolve(process.cwd(), expanded);
}

async function resolveOptionalBin(explicitPath: string, envName: string, fallbackPath: string) {
  const candidates = [explicitPath, process.env[envName] ?? "", fallbackPath].filter((value) => value.trim());
  for (const candidate of candidates) {
    const resolved = resolvePath(candidate);
    if (await fileExists(resolved)) return resolved;
  }
  return "";
}

function truncate(value: string, max = 400) {
  return value.length > max ? `${value.slice(0, max)}...` : value;
}

function sanitizeFileStem(value: string) {
  return value.replace(/[^A-Za-z0-9._-]+/g, "_").replace(/^_+|_+$/g, "") || "image";
}

function assertHttpUrl(value: string, label = "url") {
  if (!/^https?:\/\/\S+$/i.test(value)) {
    throw new Error(`${label} must be a real http(s) URL`);
  }
  if (/example\.invalid/i.test(value)) {
    throw new Error(`${label} must not be a dry-run placeholder`);
  }
}

function extractLastHttpUrl(value: string) {
  const matches = value.match(/https?:\/\/[^\s"'<>]+/gi) ?? [];
  return matches.length > 0 ? matches[matches.length - 1].replace(/[),.]+$/, "") : "";
}

function normalizeRequestItem(value: unknown): ImageRequestItem {
  const item = asObject(value);
  const id = cleanString(item.id);
  const prompt = cleanString(item.prompt);
  const size = cleanString(item.size);
  const status = cleanString(item.status);
  const url = cleanString(item.url);
  const files = asArray(item.files)
    .map((file) => cleanString(file))
    .filter(Boolean);
  if (!id) throw new Error("image request item is missing id");
  if (!prompt) throw new Error(`image request ${id} is missing prompt`);
  if (!/^\d+x\d+$/.test(size)) throw new Error(`image request ${id} has invalid size: ${size || "(empty)"}`);
  return { id, prompt, size, files, status, url };
}

async function runNodeScript(scriptPath: string, args: string[], timeoutMs: number): Promise<ProcessResult> {
  await access(scriptPath);
  const nodeArgs = scriptPath.endsWith(".ts")
    ? ["--experimental-strip-types", scriptPath, ...args]
    : [scriptPath, ...args];

  return await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, nodeArgs, {
      cwd: process.cwd(),
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill("SIGTERM");
      reject(
        new CommandError(`command timed out after ${timeoutMs}ms: ${scriptPath}`, {
          stdout,
          stderr,
          exitCode: null,
        }),
      );
    }, timeoutMs);

    child.stdout.on("data", (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });
    child.on("error", (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(error);
    });
    child.on("close", (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }
      reject(
        new CommandError(`command failed with exit code ${code}: ${scriptPath}`, {
          stdout,
          stderr,
          exitCode: code,
        }),
      );
    });
  });
}

async function runYouzanImage(binPath: string, item: ImageRequestItem, timeoutMs: number) {
  if (!binPath) throw new Error("youzan-image CLI not found");
  const args = ["--prompt", item.prompt, "--size", item.size];
  for (const file of item.files) args.push("--file", file);
  const result = await runNodeScript(binPath, args, timeoutMs);
  const url = extractLastHttpUrl(result.stdout);
  assertHttpUrl(url, "youzan-image result");
  return url;
}

function resolveOverrideDir(raw: string, projectRoot: string) {
  const expanded = expandHome(raw);
  return path.isAbsolute(expanded) ? expanded : path.resolve(projectRoot, expanded);
}

function envOverrideDir(envName: string, projectRoot: string) {
  const raw = process.env[envName];
  if (typeof raw !== "string" || !raw.trim()) return "";
  return resolveOverrideDir(raw.trim(), projectRoot);
}

function findProjectRoot(rootDir: string) {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [process.cwd(), rootDir, scriptDir];
  for (const candidate of candidates) {
    let current = path.resolve(candidate);
    for (;;) {
      if (current === path.dirname(current)) break;
      if (current === path.resolve(rootDir) && current !== path.resolve(process.cwd())) {
        // Continue to the normal file checks below; this branch only keeps
        // rootDir in the walk when cwd points somewhere else.
      }
      const packageJson = path.join(current, "package.json");
      const odDir = path.join(current, ".od");
      if (existsSync(packageJson) || existsSync(odDir)) {
        return current;
      }
      current = path.dirname(current);
    }
  }
  return process.cwd();
}

async function readStoredOpenAIConfig(projectRoot: string) {
  const configDir =
    envOverrideDir("OD_MEDIA_CONFIG_DIR", projectRoot) ||
    envOverrideDir("OD_DATA_DIR", projectRoot) ||
    path.join(projectRoot, ".od");
  try {
    const raw = await readFile(path.join(configDir, "media-config.json"), "utf8");
    const parsed = JSON.parse(raw) as unknown;
    return asObject(asObject(asObject(parsed).providers).openai);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") return {};
    return {};
  }
}

function firstEnv(keys: string[]) {
  for (const key of keys) {
    const value = process.env[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function readNestedString(value: unknown, keys: string[]) {
  let current = value;
  for (const key of keys) {
    if (!current || typeof current !== "object") return "";
    current = (current as JsonObject)[key];
  }
  return typeof current === "string" && current.trim() ? current.trim() : "";
}

async function readJsonIfPresent(filePath: string) {
  try {
    const raw = await readFile(filePath, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function tokenFromHermesAuth(data: unknown) {
  const providerToken = readNestedString(data, ["providers", "openai-codex", "tokens", "access_token"]);
  if (providerToken) return providerToken;
  const pool = asObject(asObject(data).credential_pool)["openai-codex"];
  if (Array.isArray(pool)) {
    for (const item of pool) {
      const token = readNestedString(item, ["access_token"]);
      if (token) return token;
    }
  }
  return "";
}

function tokenFromCodexAuth(data: unknown) {
  return readNestedString(data, ["tokens", "access_token"]) || readNestedString(data, ["OPENAI_API_KEY"]);
}

async function resolveOpenAIOAuthCredential() {
  const hermesAuth = await readJsonIfPresent(path.join(homedir(), ".hermes", "auth.json"));
  const hermesToken = tokenFromHermesAuth(hermesAuth);
  if (hermesToken) return hermesToken;
  const codexAuth = await readJsonIfPresent(path.join(homedir(), ".codex", "auth.json"));
  return tokenFromCodexAuth(codexAuth);
}

async function resolveOpenAIConfig(rootDir: string, modelOverride: string): Promise<OpenAIConfig> {
  const projectRoot = findProjectRoot(rootDir);
  const stored = await readStoredOpenAIConfig(projectRoot);
  const envImageKey = cleanString(process.env.OPENAI_IMAGE_API_KEY);
  const envProviderKey = firstEnv(OPENAI_KEY_ENV_KEYS);
  const apiKey = envImageKey || envProviderKey || cleanString(stored.apiKey) || (await resolveOpenAIOAuthCredential());
  const baseUrl = (
    firstEnv(OPENAI_BASE_URL_ENV_KEYS) ||
    cleanString(stored.baseUrl) ||
    DEFAULT_OPENAI_BASE_URL
  ).replace(/\/+$/, "");
  const model = modelOverride || cleanString(process.env.OPENAI_IMAGE_MODEL) || DEFAULT_IMAGE_MODEL;
  if (!apiKey) {
    throw new Error(
      "OpenAI image fallback requires OPENAI_IMAGE_API_KEY, OPENAI_API_KEY, a stored .od/media-config.json key, or OpenAI OAuth.",
    );
  }
  return { apiKey, baseUrl, model };
}

function detectAzureEndpoint(baseUrl: string) {
  if (!baseUrl) return false;
  if (/\.azure\.com\b/i.test(baseUrl)) return true;
  if (/\/openai\/deployments\//i.test(baseUrl)) return true;
  return false;
}

function buildOpenAIImageUrl(baseUrl: string, endpoint: "generations" | "edits", isAzure: boolean) {
  let parsed: URL;
  try {
    parsed = new URL(baseUrl);
  } catch {
    return `${baseUrl.replace(/\/$/, "")}/images/${endpoint}`;
  }
  parsed.pathname = parsed.pathname.replace(/\/+$/, "") + `/images/${endpoint}`;
  if (isAzure && !parsed.searchParams.has("api-version")) {
    parsed.searchParams.set("api-version", AZURE_DEFAULT_API_VERSION);
  }
  return parsed.toString();
}

function imageMimeTypeForPath(filePath: string) {
  const lower = filePath.toLowerCase();
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".gif")) return "image/gif";
  return "image/png";
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function responseImageBuffer(response: Response) {
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`openai ${response.status}: ${truncate(text)}`);
  }
  let json: JsonObject;
  try {
    json = JSON.parse(text) as JsonObject;
  } catch {
    throw new Error(`openai returned non-JSON response: ${truncate(text)}`);
  }
  const item = Array.isArray(json.data) ? json.data[0] : null;
  const entry = asObject(item);
  const b64 = cleanString(entry.b64_json);
  if (b64) return Buffer.from(b64, "base64");
  const url = cleanString(entry.url);
  if (url) {
    const imageResponse = await fetch(url);
    if (!imageResponse.ok) throw new Error(`openai image fetch ${imageResponse.status}`);
    return Buffer.from(await imageResponse.arrayBuffer());
  }
  throw new Error("openai response had neither b64_json nor url");
}

async function generateOpenAIImage(
  rootDir: string,
  item: ImageRequestItem,
  config: OpenAIConfig,
  timeoutMs: number,
) {
  const azure = detectAzureEndpoint(config.baseUrl);
  const cleanedFiles = item.files.map(resolvePath);
  for (const file of cleanedFiles) {
    if (!(await fileExists(file))) throw new Error(`reference image not found: ${file}`);
  }

  let response: Response;
  if (cleanedFiles.length > 0) {
    const formData = new FormData();
    if (!azure) formData.append("model", config.model);
    formData.append("prompt", item.prompt);
    formData.append("size", item.size);
    if (config.model.startsWith("gpt-image-")) formData.append("quality", "high");
    for (const filePath of cleanedFiles) {
      const buffer = await readFile(filePath);
      formData.append(
        "image",
        new Blob([buffer], { type: imageMimeTypeForPath(filePath) }),
        path.basename(filePath),
      );
    }
    response = await fetchWithTimeout(
      buildOpenAIImageUrl(config.baseUrl, "edits", azure),
      {
        method: "POST",
        headers: azure
          ? { Authorization: `Bearer ${config.apiKey}`, "api-key": config.apiKey }
          : { Authorization: `Bearer ${config.apiKey}` },
        body: formData,
      },
      timeoutMs,
    );
  } else {
    const body: JsonObject = {
      prompt: item.prompt,
      n: 1,
      size: item.size,
    };
    if (!azure) body.model = config.model;
    if (config.model.startsWith("gpt-image-")) {
      body.quality = "high";
    } else if (config.model.startsWith("dall-e-")) {
      body.response_format = "b64_json";
      body.quality = config.model === "dall-e-3" ? "hd" : "standard";
    }
    response = await fetchWithTimeout(
      buildOpenAIImageUrl(config.baseUrl, "generations", azure),
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          "Content-Type": "application/json",
          ...(azure ? { "api-key": config.apiKey } : {}),
        },
        body: JSON.stringify(body),
      },
      timeoutMs,
    );
  }

  const buffer = await responseImageBuffer(response);
  const generatedDir = path.join(rootDir, "generated-images");
  await mkdir(generatedDir, { recursive: true });
  const outputPath = path.join(generatedDir, `${sanitizeFileStem(item.id)}.png`);
  await writeFile(outputPath, buffer);
  return outputPath;
}

async function uploadToOss(ossBin: string, filePath: string, timeoutMs: number) {
  if (!ossBin) throw new Error("youzan-oss upload CLI not found");
  const result = await runNodeScript(ossBin, ["--file-path", filePath], timeoutMs);
  let json: JsonObject;
  try {
    json = JSON.parse(result.stdout) as JsonObject;
  } catch {
    throw new Error(`youzan-oss returned non-JSON response: ${truncate(result.stdout || result.stderr)}`);
  }
  const url = cleanString(json.url);
  assertHttpUrl(url, "youzan-oss result");
  return url;
}

async function recordImageResult(rootDir: string, id: string, url: string, source: string, timeoutMs: number) {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const recordScript = path.join(scriptDir, "record-image-result.ts");
  await runNodeScript(recordScript, [rootDir, "--id", id, "--url", url, "--source", source], timeoutMs);
}

async function processFallback(
  rootDir: string,
  item: ImageRequestItem,
  config: OpenAIConfig,
  ossBin: string,
  timeoutMs: number,
) {
  const localPath = await generateOpenAIImage(rootDir, item, config, timeoutMs);
  return await uploadToOss(ossBin, localPath, timeoutMs);
}

async function main() {
  const { positional, options } = parseArgs(process.argv.slice(2));
  const rootDir = path.resolve(positional[0] ?? ".");
  const timeoutMs = positiveIntegerOption(options, "timeout-ms", DEFAULT_TIMEOUT_MS);
  const model = option(options, "model");
  const youzanImageBin = await resolveOptionalBin(
    option(options, "youzan-image-bin"),
    "YOUZAN_IMAGE_BIN",
    path.join(homedir(), ".cc-switch", "skills", "youzan-image", "bin", "youzan-image.js"),
  );
  const ossUploadBin = await resolveOptionalBin(
    option(options, "oss-upload-bin"),
    "YOUZAN_OSS_UPLOAD_BIN",
    path.join(homedir(), ".cc-switch", "skills", "youzan-oss", "scripts", "upload.js"),
  );

  const requestsPath = path.join(rootDir, "image-requests.json");
  const requests = await readJson(requestsPath);
  const items = asArray(requests.items).map(normalizeRequestItem);
  let openAIConfig: OpenAIConfig | null = null;
  let done = 0;
  let skipped = 0;
  let fallback = 0;

  for (const item of items) {
    if (item.status === "done" && item.url) {
      assertHttpUrl(item.url, item.id);
      skipped += 1;
      continue;
    }

    let url = "";
    let source = "youzan-image";
    try {
      url = await runYouzanImage(youzanImageBin, item, timeoutMs);
      process.stderr.write(`# ${item.id}: youzan-image succeeded\n`);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      process.stderr.write(`# ${item.id}: youzan-image unavailable or failed, using OpenAI + youzan-oss fallback (${reason})\n`);
      openAIConfig = openAIConfig ?? (await resolveOpenAIConfig(rootDir, model));
      url = await processFallback(rootDir, item, openAIConfig, ossUploadBin, timeoutMs);
      source = "openai-fallback+youzan-oss";
      fallback += 1;
    }

    assertHttpUrl(url, item.id);
    await recordImageResult(rootDir, item.id, url, source, timeoutMs);
    done += 1;
  }

  process.stdout.write(
    `${JSON.stringify(
      {
        ok: true,
        total: items.length,
        generated: done,
        skipped,
        fallback,
        requests: requestsPath,
      },
      null,
      2,
    )}\n`,
  );
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
