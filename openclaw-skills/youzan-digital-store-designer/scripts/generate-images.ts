import fs from "node:fs/promises";
import path from "node:path";

const SUPPORTED_MODULES = new Set(["top_slider", "user_assets", "banner", "goods", "shop_info", "image_ad"]);

type JsonObject = Record<string, unknown>;

type ImageTarget = {
  id: string;
  moduleId: string;
  moduleType: string;
  targetId: string;
  targetKind: "items" | "entries";
  prompt: string;
  aspectRatio: string;
  size: string;
  files: string[];
};

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

function hasFlag(options: Map<string, string[]>, key: string) {
  return options.has(key);
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

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function normalizeAspectRatio(value: unknown, fallback: string) {
  const raw = cleanString(value);
  return raw || fallback;
}

function sizeForAspectRatio(aspectRatio: string, moduleType: string) {
  const normalized = aspectRatio.replace(/\s+/g, "");
  if (normalized === "9:16") return "1008x1792";
  if (normalized === "3:4") return "1008x1344";
  if (normalized === "16:9") return "1792x1008";
  if (normalized === "4:3") return "1344x1008";
  if (normalized === "1:1") return "1024x1024";
  if (normalized === "75:30") return "1792x1008";
  if (moduleType === "banner") return "1792x1008";
  if (moduleType === "shop_info") return "1008x1792";
  if (moduleType === "top_slider") return "1008x1344";
  if (moduleType === "goods") return "1344x1008";
  return "1024x1024";
}

function defaultAspectRatio(moduleType: string) {
  if (moduleType === "top_slider") return "3:4";
  if (moduleType === "banner") return "75:30";
  if (moduleType === "goods") return "4:3";
  if (moduleType === "shop_info") return "9:16";
  return "1:1";
}

function promptFrom(value: JsonObject, fallback: JsonObject) {
  const prompt = cleanString(value.image_prompt) || cleanString(fallback.image_prompt);
  if (prompt) return prompt;
  const promptSchema = value.image_prompt_schema ?? fallback.image_prompt_schema;
  if (promptSchema && typeof promptSchema === "object") {
    return JSON.stringify(promptSchema);
  }
  return "";
}

function collectReferenceFiles(rootDir: string, ...values: unknown[]) {
  const files: string[] = [];
  for (const value of values) {
    for (const item of asArray(value)) {
      const raw = cleanString(item);
      if (!raw) continue;
      if (/^https?:\/\//i.test(raw)) continue;
      files.push(path.resolve(rootDir, raw));
    }
  }
  return Array.from(new Set(files));
}

async function existingFiles(files: string[]) {
  const out: string[] = [];
  for (const file of files) {
    try {
      const stat = await fs.stat(file);
      if (stat.isFile()) out.push(file);
    } catch {
      // Missing reference files are ignored so a text-only prompt can still run.
    }
  }
  return out;
}

async function collectTargets(rootDir: string, schema: JsonObject) {
  const modules = asArray(schema.modules);
  const targets: ImageTarget[] = [];
  for (const moduleValue of modules) {
    const module = asObject(moduleValue);
    const moduleType = cleanString(module.type);
    const moduleId = cleanString(module.id);
    if (!SUPPORTED_MODULES.has(moduleType) || !moduleId) continue;
    const data = asObject(module.data);
    const moduleRefs = module.reference_images;

    if (moduleType === "user_assets") {
      for (const entryValue of asArray(data.entries)) {
        const entry = asObject(entryValue);
        const targetId = cleanString(entry.id);
        if (!targetId) continue;
        const prompt = promptFrom(entry, module);
        const aspectRatio = normalizeAspectRatio(entry.aspect_ratio, "1:1");
        targets.push({
          id: `${moduleId}.entries.${targetId}`,
          moduleId,
          moduleType,
          targetId,
          targetKind: "entries",
          prompt,
          aspectRatio,
          size: sizeForAspectRatio(aspectRatio, moduleType),
          files: await existingFiles(collectReferenceFiles(rootDir, moduleRefs, entry.reference_images)),
        });
      }
      continue;
    }

    for (const itemValue of asArray(data.items)) {
      const item = asObject(itemValue);
      const targetId = cleanString(item.id);
      if (!targetId) continue;
      const prompt = promptFrom(item, module);
      const aspectRatio = normalizeAspectRatio(item.aspect_ratio, defaultAspectRatio(moduleType));
      targets.push({
        id: `${moduleId}.items.${targetId}`,
        moduleId,
        moduleType,
        targetId,
        targetKind: "items",
        prompt,
        aspectRatio,
        size: sizeForAspectRatio(aspectRatio, moduleType),
        files: await existingFiles(collectReferenceFiles(rootDir, moduleRefs, item.reference_images)),
      });
    }
  }
  return targets;
}

async function main() {
  const { positional, options } = parseArgs(process.argv.slice(2));
  const rootDir = path.resolve(positional[0] ?? ".");
  const schemaPath = path.join(rootDir, "schema.json");
  const manifestPath = path.join(rootDir, "assets-manifest.json");
  const requestsPath = path.join(rootDir, "image-requests.json");
  const schema = await readJson(schemaPath);
  const targets = await collectTargets(rootDir, schema);
  const force = hasFlag(options, "force");

  let manifest: JsonObject = {
    version: "1.0.0",
    generator: "youzan-image-skill",
    generated_at: new Date().toISOString(),
    items: {},
  };
  try {
    manifest = { ...manifest, ...(await readJson(manifestPath)) };
  } catch {
    // A missing manifest is expected on the first run.
  }
  const previousItems = asObject(manifest.items);
  const items: JsonObject = {};
  const requestItems: JsonObject[] = [];

  for (const target of targets) {
    if (!target.prompt) {
      throw new Error(`missing image_prompt for ${target.id}`);
    }
    const previous = asObject(previousItems[target.id]);
    const url = force ? "" : cleanString(previous.url);
    items[target.id] = {
      module_id: target.moduleId,
      module_type: target.moduleType,
      target_id: target.targetId,
      target_kind: target.targetKind,
      aspect_ratio: target.aspectRatio,
      size: target.size,
      prompt: target.prompt,
      files: target.files,
      url,
    };
    requestItems.push({
      id: target.id,
      module_id: target.moduleId,
      module_type: target.moduleType,
      target_id: target.targetId,
      target_kind: target.targetKind,
      aspect_ratio: target.aspectRatio,
      size: target.size,
      prompt: target.prompt,
      files: target.files,
      status: url ? "done" : "pending",
      url,
    });
  }

  manifest.items = items;
  manifest.generator = "youzan-image-skill";
  manifest.generated_at = new Date().toISOString();
  await writeJson(manifestPath, manifest);
  await writeJson(requestsPath, {
    version: "1.0.0",
    generator: "youzan-image-skill",
    generated_at: new Date().toISOString(),
    instructions:
      "Use the global youzan-image Skill for every pending item. After each Skill call returns a URL, run record-image-result.ts with the item id and URL.",
    items: requestItems,
  });
  process.stdout.write(
    `${JSON.stringify(
      {
        ok: true,
        targets: targets.length,
        pending: requestItems.filter((item) => item.status === "pending").length,
        requests: requestsPath,
        manifest: manifestPath,
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
