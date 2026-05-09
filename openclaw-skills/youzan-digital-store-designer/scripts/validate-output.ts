import fs from "node:fs/promises";
import path from "node:path";

const SUPPORTED_MODULES = new Set(["top_slider", "user_assets", "banner", "goods", "shop_info", "image_ad"]);
const IMAGE_MODULES = new Set(["top_slider", "banner", "goods", "shop_info", "image_ad"]);

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

function hasFlag(options: Map<string, string[]>, key: string) {
  return options.has(key);
}

async function exists(filePath: string) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readJson(filePath: string): Promise<JsonObject> {
  const raw = await fs.readFile(filePath, "utf8");
  const parsed = JSON.parse(raw) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`${filePath} must contain a JSON object`);
  }
  return parsed as JsonObject;
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

function fail(errors: string[]) {
  process.stderr.write(`Validation failed:\n${errors.map((error) => `- ${error}`).join("\n")}\n`);
  process.exit(1);
}

function collectExpectedAssetIds(schema: JsonObject) {
  const ids: string[] = [];
  for (const moduleValue of asArray(schema.modules)) {
    const module = asObject(moduleValue);
    const type = cleanString(module.type);
    const moduleId = cleanString(module.id);
    if (!moduleId) continue;
    const data = asObject(module.data);
    if (type === "user_assets") {
      for (const entryValue of asArray(data.entries)) {
        const entryId = cleanString(asObject(entryValue).id);
        if (entryId) ids.push(`${moduleId}.entries.${entryId}`);
      }
      continue;
    }
    if (IMAGE_MODULES.has(type)) {
      for (const itemValue of asArray(data.items)) {
        const itemId = cleanString(asObject(itemValue).id);
        if (itemId) ids.push(`${moduleId}.items.${itemId}`);
      }
    }
  }
  return ids;
}

function validateRequirements(requirements: JsonObject, errors: string[]) {
  if (requirements.status !== "confirmed") {
    errors.push("requirements.status must be confirmed");
  }
  if (!cleanString(requirements.shop_name)) {
    errors.push("requirements.shop_name is required");
  }
  if (!cleanString(requirements.industry)) {
    errors.push("requirements.industry is required");
  }
  if (!Array.isArray(requirements.module_specs) || requirements.module_specs.length === 0) {
    errors.push("requirements.module_specs must be a non-empty array");
  }
}

function validateSchema(schema: JsonObject, requirements: JsonObject, errors: string[]) {
  if (schema.version !== "1.0.0") {
    errors.push("schema.version must be 1.0.0");
  }
  const modules = asArray(schema.modules).map(asObject);
  if (modules.length === 0) {
    errors.push("schema.modules must be a non-empty array");
  }
  const requiredOrder = asArray(requirements.module_specs)
    .map((item) => cleanString(asObject(item).type))
    .filter(Boolean);
  const actualOrder = modules.map((module) => cleanString(module.type));
  if (requiredOrder.length > 0 && JSON.stringify(requiredOrder) !== JSON.stringify(actualOrder)) {
    errors.push("schema.modules order must match requirements.module_specs");
  }
  for (const module of modules) {
    const type = cleanString(module.type);
    const id = cleanString(module.id);
    if (!id) errors.push("every module must have id");
    if (!SUPPORTED_MODULES.has(type)) errors.push(`unsupported module type: ${type || "(missing)"}`);
    const data = asObject(module.data);
    if (type === "user_assets") {
      const entries = asArray(data.entries);
      const layout = asObject(data.layout);
      const templateType = layout.template_type;
      if (entries.length === 0) errors.push(`${id}.data.entries must be non-empty`);
      if (entries.length === 3 && templateType !== 3) {
        const intent = `${cleanString(data.layout_intent)} ${cleanString(module.layout_intent)} ${cleanString(requirements.source_prompt)}`;
        if (!/(左一右二|一大两小|主次入口|primary|secondary)/i.test(intent)) {
          errors.push(`${id} has 3 entries and must default to template_type 3`);
        }
      }
      if (entries.length > 5 && templateType !== "hotzone") {
        errors.push(`${id} has more than 5 entries and must use hotzone layout`);
      }
      if (templateType === "hotzone" && entries.length <= 5) {
        const intent = `${cleanString(data.layout_intent)} ${cleanString(module.layout_intent)} ${cleanString(requirements.source_prompt)}`;
        if (!/(hotzone|freeform|热区|自由)/i.test(intent)) {
          errors.push(`${id} uses hotzone without enough entries or explicit hotzone/freeform intent`);
        }
      }
      for (const entryValue of entries) {
        const entry = asObject(entryValue);
        if (!cleanString(entry.id)) errors.push(`${id}.entries item missing id`);
        if (!cleanString(entry.title)) errors.push(`${id}.entries item missing title`);
        if (!cleanString(entry.image_prompt)) errors.push(`${id}.entries item missing image_prompt`);
      }
    }
    if (IMAGE_MODULES.has(type)) {
      const items = asArray(data.items);
      if (items.length === 0) errors.push(`${id}.data.items must be non-empty`);
      for (const itemValue of items) {
        const item = asObject(itemValue);
        if (!cleanString(item.id)) errors.push(`${id}.items item missing id`);
        if (!cleanString(item.image_prompt)) errors.push(`${id}.items item missing image_prompt`);
      }
    }
  }
}

function validateManifest(schema: JsonObject, manifest: JsonObject, allowMissingImages: boolean, errors: string[]) {
  const items = asObject(manifest.items);
  for (const id of collectExpectedAssetIds(schema)) {
    const entry = asObject(items[id]);
    const url = cleanString(entry.url);
    if (!url && !allowMissingImages) {
      errors.push(`assets-manifest missing generated url for ${id}`);
    }
    if (url && /example\.invalid/i.test(url)) {
      errors.push(`assets-manifest contains placeholder url for ${id}`);
    }
    if (url && !/^https?:\/\//i.test(url)) {
      errors.push(`assets-manifest url for ${id} must be an http(s) CDN URL`);
    }
  }
}

async function resolvePackageDir(rootDir: string) {
  if (await exists(path.join(rootDir, "shop-home-page.preview.html"))) return rootDir;
  const distDir = path.join(rootDir, "dist");
  if (await exists(path.join(distDir, "shop-home-page.preview.html"))) return distDir;
  return rootDir;
}

async function validatePreviewHtml(packageDir: string, errors: string[]) {
  const filePath = path.join(packageDir, "shop-home-page.preview.html");
  let html = "";
  try {
    html = await fs.readFile(filePath, "utf8");
  } catch {
    return;
  }
  const forbiddenPatterns = [
    /<iframe\b/i,
    /\/api\/shop-home-page/i,
    /\/api\/projects/i,
    new RegExp(`OD_${"DAEMON"}_URL`, "i"),
    new RegExp(`OD_${"PROJECT"}_ID`, "i"),
    new RegExp(`shop-home-page-${"assets"}`, "i"),
    new RegExp(`apps/${"daemon"}`, "i"),
    /localhost:\d+/i,
  ];
  for (const pattern of forbiddenPatterns) {
    if (pattern.test(html)) {
      errors.push(`shop-home-page.preview.html contains forbidden runtime dependency: ${pattern}`);
    }
  }
  for (const className of [
    "storefront-phone-stage",
    "storefront-phone-device",
    "storefront-phone-screen",
    "storefront-phone-scroll",
    "sf-root",
  ]) {
    if (!html.includes(className)) {
      errors.push(`shop-home-page.preview.html missing standard storefront preview class: ${className}`);
    }
  }
}

async function main() {
  const { positional, options } = parseArgs(process.argv.slice(2));
  const rootDir = path.resolve(positional[0] ?? ".");
  const packageDir = await resolvePackageDir(rootDir);
  const errors: string[] = [];
  for (const fileName of ["shop-home-page.preview.html", "schema.json", "requirements.json", "assets-manifest.json"]) {
    if (!(await exists(path.join(packageDir, fileName)))) {
      errors.push(`missing ${path.join(packageDir, fileName)}`);
    }
  }
  if (errors.length > 0) fail(errors);

  const schema = await readJson(path.join(packageDir, "schema.json"));
  const requirements = await readJson(path.join(packageDir, "requirements.json"));
  const manifest = await readJson(path.join(packageDir, "assets-manifest.json"));
  validateRequirements(requirements, errors);
  validateSchema(schema, requirements, errors);
  validateManifest(schema, manifest, hasFlag(options, "allow-missing-images"), errors);
  await validatePreviewHtml(packageDir, errors);
  if (errors.length > 0) fail(errors);

  process.stdout.write(`${JSON.stringify({ ok: true, packageDir }, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
