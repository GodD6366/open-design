"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("node:fs/promises");
const path = require("node:path");
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
async function readJson(filePath) {
    const raw = await fs.readFile(filePath, "utf8");
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error(`${filePath} must contain a JSON object`);
    }
    return parsed;
}
async function writeJson(filePath, value) {
    await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}
function cleanString(value) {
    return typeof value === "string" ? value.trim() : "";
}
function asObject(value) {
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}
function assertUrl(value) {
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
    const backupFile = option(options, "backup-file");
    if (!id)
        throw new Error("--id is required");
    if (!url)
        throw new Error("--url is required");
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
    if (source)
        manifestItem.source = source;
    if (backupFile)
        manifestItem.backup_file = backupFile;
    items[id] = manifestItem;
    manifest.items = items;
    manifest.generator = source ? "generate-image-assets.cjs" : "youzan-image-skill";
    manifest.generated_at = new Date().toISOString();
    await writeJson(manifestPath, manifest);
    try {
        const requests = await readJson(requestsPath);
        const requestItems = Array.isArray(requests.items) ? requests.items : [];
        requests.items = requestItems.map((item) => {
            const requestItem = asObject(item);
            if (cleanString(requestItem.id) !== id)
                return item;
            return { ...requestItem, status: "done", url, ...(source ? { source } : {}), ...(backupFile ? { backup_file: backupFile } : {}) };
        });
        requests.generated_at = new Date().toISOString();
        await writeJson(requestsPath, requests);
    }
    catch {
        // image-requests.json is a convenience file; the manifest is authoritative.
    }
    process.stdout.write(`${JSON.stringify({ ok: true, id, url, manifest: manifestPath }, null, 2)}\n`);
}
main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
});
