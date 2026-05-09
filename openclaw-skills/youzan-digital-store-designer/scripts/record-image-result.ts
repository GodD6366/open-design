import fs from "node:fs/promises";
import path from "node:path";

type JsonObject = Record<string, unknown>;

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

async function readJson(filePath: string): Promise<JsonObject> {
  const raw = await fs.readFile(filePath, "utf8");
  const parsed = JSON.parse(raw) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`${filePath} must contain a JSON object`);
  }
  return parsed as JsonObject;
}

async function writeJson(filePath: string, value: unknown) {
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function cleanString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asObject(value: unknown): JsonObject {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonObject) : {};
}

function assertUrl(value: string) {
  if (!/^https?:\/\/\S+$/i.test(value)) {
    throw new Error("--url must be a real generated image http(s) URL");
  }
  if (/example\.invalid/i.test(value)) {
    throw new Error("--url must be a real generated image URL, not a dry-run placeholder");
  }
}

async function main() {
  const { positional, options } = parseArgs(process.argv.slice(2));
  const rootDir = path.resolve(positional[0] ?? ".");
  const id = option(options, "id");
  const url = option(options, "url");
  const source = option(options, "source");
  if (!id) throw new Error("--id is required");
  if (!url) throw new Error("--url is required");
  assertUrl(url);

  const manifestPath = path.join(rootDir, "assets-manifest.json");
  const requestsPath = path.join(rootDir, "image-requests.json");
  const manifest = await readJson(manifestPath);
  const items = asObject(manifest.items);
  const manifestItem = asObject(items[id]);
  if (Object.keys(manifestItem).length === 0) {
    throw new Error(`unknown image target id: ${id}`);
  }
  manifestItem.url = url;
  if (source) manifestItem.source = source;
  items[id] = manifestItem;
  manifest.items = items;
  manifest.generator = source ? "generate-image-assets.ts" : "youzan-image-skill";
  manifest.generated_at = new Date().toISOString();
  await writeJson(manifestPath, manifest);

  try {
    const requests = await readJson(requestsPath);
    const requestItems = Array.isArray(requests.items) ? requests.items : [];
    requests.items = requestItems.map((item) => {
      const requestItem = asObject(item);
      if (cleanString(requestItem.id) !== id) return item;
      return { ...requestItem, status: "done", url, ...(source ? { source } : {}) };
    });
    requests.generated_at = new Date().toISOString();
    await writeJson(requestsPath, requests);
  } catch {
    // image-requests.json is a convenience file; the manifest is authoritative.
  }

  process.stdout.write(`${JSON.stringify({ ok: true, id, url, manifest: manifestPath }, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
