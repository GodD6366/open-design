"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const { existsSync } = require("node:fs");
const { access, mkdir, readFile, stat, writeFile } = require("node:fs/promises");
const { spawn } = require("node:child_process");
const { homedir } = require("node:os");
const path = require("node:path");
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
class CommandError extends Error {
    stdout;
    stderr;
    exitCode;
    constructor(message, result) {
        super(message);
        this.stdout = result.stdout;
        this.stderr = result.stderr;
        this.exitCode = result.exitCode;
    }
}
function parseArgs(argv) {
    const args = { positional: [], options: new Map() };
    for (let index = 0; index < argv.length; index += 1) {
        const token = argv[index];
        if (!token.startsWith("--")) {
            args.positional.push(token);
            continue;
        }
        const eq = token.indexOf("=");
        const key = eq >= 0 ? token.slice(2, eq) : token.slice(2);
        const value = eq >= 0
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
function option(options, key, fallback = "") {
    return options.get(key)?.[0] ?? fallback;
}
function positiveIntegerOption(options, key, fallback) {
    const raw = option(options, key);
    if (!raw)
        return fallback;
    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed <= 0) {
        throw new Error(`--${key} must be a positive number`);
    }
    return Math.round(parsed);
}
function cleanString(value) {
    return typeof value === "string" ? value.trim() : "";
}
function asObject(value) {
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}
function asArray(value) {
    return Array.isArray(value) ? value : [];
}
async function readJson(filePath) {
    const raw = await readFile(filePath, "utf8");
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error(`${filePath} must contain a JSON object`);
    }
    return parsed;
}
async function fileExists(filePath) {
    try {
        const info = await stat(filePath);
        return info.isFile();
    }
    catch {
        return false;
    }
}
function expandHome(raw) {
    if (raw === "~")
        return homedir();
    if (raw.startsWith("~/"))
        return path.join(homedir(), raw.slice(2));
    return raw;
}
function resolvePath(raw) {
    const expanded = expandHome(raw);
    return path.isAbsolute(expanded) ? expanded : path.resolve(process.cwd(), expanded);
}
async function resolveOptionalBin(explicitPath, envName, fallbackPath) {
    const candidates = [explicitPath, process.env[envName] ?? "", fallbackPath].filter((value) => value.trim());
    for (const candidate of candidates) {
        const resolved = resolvePath(candidate);
        if (await fileExists(resolved))
            return resolved;
    }
    return "";
}
function truncate(value, max = 400) {
    return value.length > max ? `${value.slice(0, max)}...` : value;
}
function sanitizeFileStem(value) {
    return value.replace(/[^A-Za-z0-9._-]+/g, "_").replace(/^_+|_+$/g, "") || "image";
}
function assertHttpUrl(value, label = "url") {
    if (!/^https?:\/\/\S+$/i.test(value)) {
        throw new Error(`${label} must be a real http(s) URL`);
    }
    if (/example\.invalid/i.test(value)) {
        throw new Error(`${label} must not be a dry-run placeholder`);
    }
}
function extractLastHttpUrl(value) {
    const matches = value.match(/https?:\/\/[^\s"'<>]+/gi) ?? [];
    return matches.length > 0 ? matches[matches.length - 1].replace(/[),.]+$/, "") : "";
}
function normalizeRequestItem(value) {
    const item = asObject(value);
    const id = cleanString(item.id);
    const prompt = cleanString(item.prompt);
    const size = cleanString(item.size);
    const status = cleanString(item.status);
    const url = cleanString(item.url);
    const source = cleanString(item.source);
    const files = asArray(item.files)
        .map((file) => cleanString(file))
        .filter(Boolean);
    const derivedReferences = asArray(item.derived_references)
        .map((entry) => asObject(entry))
        .map((entry) => ({
        type: cleanString(entry.type),
        previous_request_id: cleanString(entry.previous_request_id),
    }))
        .filter((entry) => entry.type && entry.previous_request_id);
    if (!id)
        throw new Error("image request item is missing id");
    if (!prompt)
        throw new Error(`image request ${id} is missing prompt`);
    if (!/^\d+x\d+$/.test(size))
        throw new Error(`image request ${id} has invalid size: ${size || "(empty)"}`);
    return { id, prompt, size, files, status, url, source, derivedReferences };
}
function generatedImageRelativePath(requestId) {
    return path.join("generated-images", `${sanitizeFileStem(requestId)}.png`).split(path.sep).join("/");
}
function generatedImagePath(rootDir, requestId) {
    return path.join(rootDir, generatedImageRelativePath(requestId));
}
async function resolveDerivedReferenceFiles(rootDir, item) {
    const resolved = [];
    for (const reference of item.derivedReferences) {
        if (reference.type !== "previous-output")
            continue;
        const localPath = generatedImagePath(rootDir, reference.previous_request_id);
        if (await fileExists(localPath)) {
            resolved.push(localPath);
        }
    }
    return resolved;
}
async function cachedDerivedReferencePath(rootDir, requestId, url, refresh = false) {
    const localPath = generatedImagePath(rootDir, requestId);
    if (!refresh && (await fileExists(localPath)))
        return localPath;
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`failed to download prior generated image for ${requestId}: ${response.status}`);
    }
    await mkdir(path.dirname(localPath), { recursive: true });
    await writeFile(localPath, Buffer.from(await response.arrayBuffer()));
    return localPath;
}
async function withDerivedReferenceFiles(rootDir, item) {
    const derivedFiles = await resolveDerivedReferenceFiles(rootDir, item);
    if (derivedFiles.length === 0)
        return item;
    return {
        ...item,
        files: [...item.files, ...derivedFiles.filter((file) => !item.files.includes(file))],
    };
}
async function ensureLocalImageBackup(rootDir, item, url, { refresh = false } = {}) {
    const localPath = generatedImagePath(rootDir, item.id);
    if (!refresh && (await fileExists(localPath)))
        return localPath;
    return await cachedDerivedReferencePath(rootDir, item.id, url, refresh);
}
async function runNodeScript(scriptPath, args, timeoutMs) {
    await access(scriptPath);
    const nodeArgs = [scriptPath, ...args];
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
            if (settled)
                return;
            settled = true;
            child.kill("SIGTERM");
            reject(new CommandError(`command timed out after ${timeoutMs}ms: ${scriptPath}`, {
                stdout,
                stderr,
                exitCode: null,
            }));
        }, timeoutMs);
        child.stdout.on("data", (chunk) => {
            stdout += String(chunk);
        });
        child.stderr.on("data", (chunk) => {
            stderr += String(chunk);
        });
        child.on("error", (error) => {
            if (settled)
                return;
            settled = true;
            clearTimeout(timer);
            reject(error);
        });
        child.on("close", (code) => {
            if (settled)
                return;
            settled = true;
            clearTimeout(timer);
            if (code === 0) {
                resolve({ stdout, stderr });
                return;
            }
            reject(new CommandError(`command failed with exit code ${code}: ${scriptPath}`, {
                stdout,
                stderr,
                exitCode: code,
            }));
        });
    });
}
async function runYouzanImage(binPath, item, timeoutMs) {
    if (!binPath)
        throw new Error("youzan-image CLI not found");
    const args = ["--prompt", item.prompt, "--size", item.size];
    for (const file of item.files)
        args.push("--file", file);
    const result = await runNodeScript(binPath, args, timeoutMs);
    const url = extractLastHttpUrl(result.stdout);
    assertHttpUrl(url, "youzan-image result");
    return url;
}
function resolveOverrideDir(raw, projectRoot) {
    const expanded = expandHome(raw);
    return path.isAbsolute(expanded) ? expanded : path.resolve(projectRoot, expanded);
}
function envOverrideDir(envName, projectRoot) {
    const raw = process.env[envName];
    if (typeof raw !== "string" || !raw.trim())
        return "";
    return resolveOverrideDir(raw.trim(), projectRoot);
}
function findProjectRoot(rootDir) {
    const scriptDir = __dirname;
    const candidates = [process.cwd(), rootDir, scriptDir];
    for (const candidate of candidates) {
        let current = path.resolve(candidate);
        for (;;) {
            if (current === path.dirname(current))
                break;
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
async function readStoredOpenAIConfig(projectRoot) {
    const configDir = envOverrideDir("OD_MEDIA_CONFIG_DIR", projectRoot) ||
        envOverrideDir("OD_DATA_DIR", projectRoot) ||
        path.join(projectRoot, ".od");
    try {
        const raw = await readFile(path.join(configDir, "media-config.json"), "utf8");
        const parsed = JSON.parse(raw);
        return asObject(asObject(asObject(parsed).providers).openai);
    }
    catch (error) {
        if (error && typeof error === "object" && "code" in error && error.code === "ENOENT")
            return {};
        return {};
    }
}
function firstEnv(keys) {
    for (const key of keys) {
        const value = process.env[key];
        if (typeof value === "string" && value.trim())
            return value.trim();
    }
    return "";
}
function readNestedString(value, keys) {
    let current = value;
    for (const key of keys) {
        if (!current || typeof current !== "object")
            return "";
        current = current[key];
    }
    return typeof current === "string" && current.trim() ? current.trim() : "";
}
async function readJsonIfPresent(filePath) {
    try {
        const raw = await readFile(filePath, "utf8");
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === "object" ? parsed : null;
    }
    catch {
        return null;
    }
}
function tokenFromHermesAuth(data) {
    const providerToken = readNestedString(data, ["providers", "openai-codex", "tokens", "access_token"]);
    if (providerToken)
        return providerToken;
    const pool = asObject(asObject(data).credential_pool)["openai-codex"];
    if (Array.isArray(pool)) {
        for (const item of pool) {
            const token = readNestedString(item, ["access_token"]);
            if (token)
                return token;
        }
    }
    return "";
}
function tokenFromCodexAuth(data) {
    return readNestedString(data, ["tokens", "access_token"]) || readNestedString(data, ["OPENAI_API_KEY"]);
}
async function resolveOpenAIOAuthCredential() {
    const hermesAuth = await readJsonIfPresent(path.join(homedir(), ".hermes", "auth.json"));
    const hermesToken = tokenFromHermesAuth(hermesAuth);
    if (hermesToken)
        return hermesToken;
    const codexAuth = await readJsonIfPresent(path.join(homedir(), ".codex", "auth.json"));
    return tokenFromCodexAuth(codexAuth);
}
async function resolveOpenAIConfig(rootDir, modelOverride) {
    const projectRoot = findProjectRoot(rootDir);
    const stored = await readStoredOpenAIConfig(projectRoot);
    const envImageKey = cleanString(process.env.OPENAI_IMAGE_API_KEY);
    const envProviderKey = firstEnv(OPENAI_KEY_ENV_KEYS);
    const apiKey = envImageKey || envProviderKey || cleanString(stored.apiKey) || (await resolveOpenAIOAuthCredential());
    const baseUrl = (firstEnv(OPENAI_BASE_URL_ENV_KEYS) ||
        cleanString(stored.baseUrl) ||
        DEFAULT_OPENAI_BASE_URL).replace(/\/+$/, "");
    const model = modelOverride || cleanString(process.env.OPENAI_IMAGE_MODEL) || DEFAULT_IMAGE_MODEL;
    if (!apiKey) {
        throw new Error("OpenAI image fallback requires OPENAI_IMAGE_API_KEY, OPENAI_API_KEY, a stored .od/media-config.json key, or OpenAI OAuth.");
    }
    return { apiKey, baseUrl, model };
}
function detectAzureEndpoint(baseUrl) {
    if (!baseUrl)
        return false;
    if (/\.azure\.com\b/i.test(baseUrl))
        return true;
    if (/\/openai\/deployments\//i.test(baseUrl))
        return true;
    return false;
}
function buildOpenAIImageUrl(baseUrl, endpoint, isAzure) {
    let parsed;
    try {
        parsed = new URL(baseUrl);
    }
    catch {
        return `${baseUrl.replace(/\/$/, "")}/images/${endpoint}`;
    }
    parsed.pathname = parsed.pathname.replace(/\/+$/, "") + `/images/${endpoint}`;
    if (isAzure && !parsed.searchParams.has("api-version")) {
        parsed.searchParams.set("api-version", AZURE_DEFAULT_API_VERSION);
    }
    return parsed.toString();
}
function imageMimeTypeForPath(filePath) {
    const lower = filePath.toLowerCase();
    if (lower.endsWith(".jpg") || lower.endsWith(".jpeg"))
        return "image/jpeg";
    if (lower.endsWith(".webp"))
        return "image/webp";
    if (lower.endsWith(".gif"))
        return "image/gif";
    return "image/png";
}
async function fetchWithTimeout(url, init, timeoutMs) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        return await fetch(url, { ...init, signal: controller.signal });
    }
    finally {
        clearTimeout(timer);
    }
}
async function responseImageBuffer(response) {
    const text = await response.text();
    if (!response.ok) {
        throw new Error(`openai ${response.status}: ${truncate(text)}`);
    }
    let json;
    try {
        json = JSON.parse(text);
    }
    catch {
        throw new Error(`openai returned non-JSON response: ${truncate(text)}`);
    }
    const item = Array.isArray(json.data) ? json.data[0] : null;
    const entry = asObject(item);
    const b64 = cleanString(entry.b64_json);
    if (b64)
        return Buffer.from(b64, "base64");
    const url = cleanString(entry.url);
    if (url) {
        const imageResponse = await fetch(url);
        if (!imageResponse.ok)
            throw new Error(`openai image fetch ${imageResponse.status}`);
        return Buffer.from(await imageResponse.arrayBuffer());
    }
    throw new Error("openai response had neither b64_json nor url");
}
async function generateOpenAIImage(rootDir, item, config, timeoutMs) {
    const azure = detectAzureEndpoint(config.baseUrl);
    const cleanedFiles = item.files.map(resolvePath);
    for (const file of cleanedFiles) {
        if (!(await fileExists(file)))
            throw new Error(`reference image not found: ${file}`);
    }
    let response;
    if (cleanedFiles.length > 0) {
        const formData = new FormData();
        if (!azure)
            formData.append("model", config.model);
        formData.append("prompt", item.prompt);
        formData.append("size", item.size);
        if (config.model.startsWith("gpt-image-"))
            formData.append("quality", "high");
        for (const filePath of cleanedFiles) {
            const buffer = await readFile(filePath);
            formData.append("image", new Blob([buffer], { type: imageMimeTypeForPath(filePath) }), path.basename(filePath));
        }
        response = await fetchWithTimeout(buildOpenAIImageUrl(config.baseUrl, "edits", azure), {
            method: "POST",
            headers: azure
                ? { Authorization: `Bearer ${config.apiKey}`, "api-key": config.apiKey }
                : { Authorization: `Bearer ${config.apiKey}` },
            body: formData,
        }, timeoutMs);
    }
    else {
        const body = {
            prompt: item.prompt,
            n: 1,
            size: item.size,
        };
        if (!azure)
            body.model = config.model;
        if (config.model.startsWith("gpt-image-")) {
            body.quality = "high";
        }
        else if (config.model.startsWith("dall-e-")) {
            body.response_format = "b64_json";
            body.quality = config.model === "dall-e-3" ? "hd" : "standard";
        }
        response = await fetchWithTimeout(buildOpenAIImageUrl(config.baseUrl, "generations", azure), {
            method: "POST",
            headers: {
                Authorization: `Bearer ${config.apiKey}`,
                "Content-Type": "application/json",
                ...(azure ? { "api-key": config.apiKey } : {}),
            },
            body: JSON.stringify(body),
        }, timeoutMs);
    }
    const buffer = await responseImageBuffer(response);
    const generatedDir = path.join(rootDir, "generated-images");
    await mkdir(generatedDir, { recursive: true });
    const outputPath = path.join(generatedDir, `${sanitizeFileStem(item.id)}.png`);
    await writeFile(outputPath, buffer);
    return outputPath;
}
async function uploadToOss(ossBin, filePath, timeoutMs) {
    if (!ossBin)
        throw new Error("youzan-oss upload CLI not found");
    const result = await runNodeScript(ossBin, ["--file-path", filePath], timeoutMs);
    let json;
    try {
        json = JSON.parse(result.stdout);
    }
    catch {
        throw new Error(`youzan-oss returned non-JSON response: ${truncate(result.stdout || result.stderr)}`);
    }
    const url = cleanString(json.url);
    assertHttpUrl(url, "youzan-oss result");
    return url;
}
async function recordImageResult(rootDir, id, url, source, backupFile, timeoutMs) {
    const scriptDir = __dirname;
    const recordScript = path.join(scriptDir, "record-image-result.cjs");
    const args = [rootDir, "--id", id, "--url", url];
    if (source)
        args.push("--source", source);
    if (backupFile)
        args.push("--backup-file", backupFile);
    await runNodeScript(recordScript, args, timeoutMs);
}
async function processFallback(rootDir, item, config, ossBin, timeoutMs) {
    const localPath = await generateOpenAIImage(rootDir, item, config, timeoutMs);
    return await uploadToOss(ossBin, localPath, timeoutMs);
}
async function main() {
    const { positional, options } = parseArgs(process.argv.slice(2));
    const rootDir = path.resolve(positional[0] ?? ".");
    const timeoutMs = positiveIntegerOption(options, "timeout-ms", DEFAULT_TIMEOUT_MS);
    const model = option(options, "model");
    const youzanImageBin = await resolveOptionalBin(option(options, "youzan-image-bin"), "YOUZAN_IMAGE_BIN", path.join(homedir(), ".cc-switch", "skills", "youzan-image", "bin", "youzan-image.js"));
    const ossUploadBin = await resolveOptionalBin(option(options, "oss-upload-bin"), "YOUZAN_OSS_UPLOAD_BIN", path.join(homedir(), ".cc-switch", "skills", "youzan-oss", "scripts", "upload.js"));
    const requestsPath = path.join(rootDir, "image-requests.json");
    const requests = await readJson(requestsPath);
    const items = asArray(requests.items).map(normalizeRequestItem);
    let openAIConfig = null;
    let done = 0;
    let skipped = 0;
    let fallback = 0;
    for (const item of items) {
        if (item.status === "done" && item.url) {
            assertHttpUrl(item.url, item.id);
            await ensureLocalImageBackup(rootDir, item, item.url);
            await recordImageResult(rootDir, item.id, item.url, item.source, generatedImageRelativePath(item.id), timeoutMs);
            skipped += 1;
            continue;
        }
        const itemWithReferences = await withDerivedReferenceFiles(rootDir, item);
        let url = "";
        let source = "youzan-image";
        try {
            url = await runYouzanImage(youzanImageBin, itemWithReferences, timeoutMs);
            process.stderr.write(`# ${item.id}: youzan-image succeeded\n`);
        }
        catch (error) {
            const reason = error instanceof Error ? error.message : String(error);
            process.stderr.write(`# ${item.id}: youzan-image unavailable or failed, using OpenAI + youzan-oss fallback (${reason})\n`);
            openAIConfig = openAIConfig ?? (await resolveOpenAIConfig(rootDir, model));
            url = await processFallback(rootDir, itemWithReferences, openAIConfig, ossUploadBin, timeoutMs);
            source = "openai-fallback+youzan-oss";
            fallback += 1;
        }
        assertHttpUrl(url, item.id);
        await ensureLocalImageBackup(rootDir, item, url, { refresh: true });
        await recordImageResult(rootDir, item.id, url, source, generatedImageRelativePath(item.id), timeoutMs);
        done += 1;
    }
    process.stdout.write(`${JSON.stringify({
        ok: true,
        total: items.length,
        generated: done,
        skipped,
        fallback,
        requests: requestsPath,
    }, null, 2)}\n`);
}
main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
});
