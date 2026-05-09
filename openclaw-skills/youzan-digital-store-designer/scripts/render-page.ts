import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

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

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeScriptJson(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

function assetUrl(manifest: JsonObject, id: string, fallback = "") {
  const items = asObject(manifest.items);
  return cleanString(asObject(items[id]).url) || fallback;
}

function imageHtml(url: string, alt: string, className: string) {
  if (url) {
    return `<img class="${className}" src="${escapeHtml(url)}" alt="${escapeHtml(alt)}" loading="lazy" />`;
  }
  return `<div class="placeholder ${className}" role="img" aria-label="${escapeHtml(alt)}">${escapeHtml(alt || "图片待生成")}</div>`;
}

function firstItem(module: JsonObject) {
  return asObject(asArray(asObject(module.data).items)[0]);
}

function renderTopSlider(module: JsonObject, manifest: JsonObject) {
  const item = firstItem(module);
  const moduleId = cleanString(module.id);
  const itemId = cleanString(item.id) || "hero";
  const title = cleanString(item.title) || cleanString(module.title);
  const subtitle = cleanString(item.subtitle) || cleanString(module.subtitle);
  const url = assetUrl(manifest, `${moduleId}.items.${itemId}`, cleanString(item.image_url));
  return `<section class="module hero">
  ${imageHtml(url, title || "顶部主视觉", "hero__image")}
  <div class="hero__copy">
    <h1 class="hero__title">${escapeHtml(title)}</h1>
    ${subtitle ? `<p class="hero__subtitle">${escapeHtml(subtitle)}</p>` : ""}
  </div>
</section>`;
}

function renderUserAssets(module: JsonObject, manifest: JsonObject) {
  const data = asObject(module.data);
  const layout = asObject(data.layout);
  const templateType = cleanString(layout.template_type) || String(layout.template_type ?? "1");
  const entries = asArray(data.entries).map(asObject);
  const moduleId = cleanString(module.id);
  const cards = entries
    .map((entry) => {
      const id = cleanString(entry.id);
      const title = cleanString(entry.title);
      const subtitle = cleanString(entry.subtitle);
      const url = assetUrl(manifest, `${moduleId}.entries.${id}`, cleanString(entry.image_url));
      return `<article class="asset-entry">
  ${imageHtml(url, title || "功能入口", "asset-entry__image")}
  <h3 class="asset-entry__title">${escapeHtml(title)}</h3>
  ${subtitle ? `<p class="asset-entry__subtitle">${escapeHtml(subtitle)}</p>` : ""}
</article>`;
    })
    .join("\n");
  return `<section class="module panel">
  <div class="section-heading">
    <h2 class="section-title">${escapeHtml(cleanString(module.title) || "会员服务")}</h2>
    ${cleanString(module.subtitle) ? `<p class="section-subtitle">${escapeHtml(cleanString(module.subtitle))}</p>` : ""}
  </div>
  <div class="asset-grid" data-layout="${escapeHtml(templateType)}">
${cards}
  </div>
</section>`;
}

function renderImageModule(module: JsonObject, manifest: JsonObject, className: string) {
  const item = firstItem(module);
  const moduleId = cleanString(module.id);
  const itemId = cleanString(item.id) || "image";
  const title = cleanString(item.title) || cleanString(module.title);
  const subtitle = cleanString(item.subtitle) || cleanString(module.subtitle);
  const url = assetUrl(manifest, `${moduleId}.items.${itemId}`, cleanString(item.image_url));
  return `<section class="module ${className}">
  ${imageHtml(url, title || cleanString(module.type), `${className}__image`)}
  <div class="${className}__copy">
    <h2 class="module-title">${escapeHtml(title)}</h2>
    ${subtitle ? `<p class="module-copy">${escapeHtml(subtitle)}</p>` : ""}
  </div>
</section>`;
}

function renderModule(moduleValue: unknown, manifest: JsonObject) {
  const module = asObject(moduleValue);
  const type = cleanString(module.type);
  if (type === "top_slider") return renderTopSlider(module, manifest);
  if (type === "user_assets") return renderUserAssets(module, manifest);
  if (type === "banner") return renderImageModule(module, manifest, "banner");
  if (type === "goods") return renderImageModule(module, manifest, "goods");
  if (type === "shop_info") return renderImageModule(module, manifest, "story");
  if (type === "image_ad") return renderImageModule(module, manifest, "image-card");
  return "";
}

function themeCss(schema: JsonObject) {
  const theme = asObject(schema.theme);
  const entries: Array<[string, string]> = [
    ["--shop-bg", cleanString(theme.background)],
    ["--shop-surface", cleanString(theme.surface)],
    ["--shop-surface-subtle", cleanString(theme.surface_subtle)],
    ["--shop-text", cleanString(theme.text)],
    ["--shop-muted", cleanString(theme.muted)],
    ["--shop-accent", cleanString(theme.accent)],
  ];
  const radius = typeof theme.radius === "number" ? `${theme.radius}px` : cleanString(theme.radius);
  if (radius) entries.push(["--shop-radius", radius]);
  const body = entries
    .filter(([, value]) => value)
    .map(([key, value]) => `  ${key}: ${value};`)
    .join("\n");
  return body ? `:root {\n${body}\n}\n` : "";
}

async function copyIfExists(from: string, to: string) {
  try {
    await fs.copyFile(from, to);
  } catch (error) {
    throw new Error(`failed to copy ${from} to ${to}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function main() {
  const { positional, options } = parseArgs(process.argv.slice(2));
  const rootDir = path.resolve(positional[0] ?? ".");
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const skillDir = path.resolve(scriptDir, "..");
  const templateDir = path.resolve(option(options, "template-dir", path.join(skillDir, "assets", "template")));
  const schema = await readJson(path.join(rootDir, "schema.json"));
  const requirements = await readJson(path.join(rootDir, "requirements.json"));
  const manifest = await readJson(path.join(rootDir, "assets-manifest.json"));
  const template = await fs.readFile(path.join(templateDir, "index.template.html"), "utf8");
  const baseCss = await fs.readFile(path.join(templateDir, "tokens.css"), "utf8");
  const page = asObject(schema.page);
  const pageTitle = cleanString(page.title) || cleanString(page.brand_name) || "店铺首页";
  const appHtml = asArray(schema.modules)
    .map((module) => renderModule(module, manifest))
    .filter(Boolean)
    .join("\n");
  const html = template
    .replaceAll("__PAGE_TITLE__", escapeHtml(pageTitle))
    .replace("__APP_CSS__", `${baseCss}\n${themeCss(schema)}`)
    .replace("__APP_HTML__", appHtml)
    .replace("__SCHEMA_JSON__", escapeScriptJson(schema));

  const distDir = path.join(rootDir, "dist");
  await fs.mkdir(distDir, { recursive: true });
  await fs.writeFile(path.join(distDir, "index.html"), html);
  await writeJson(path.join(distDir, "schema.json"), schema);
  await writeJson(path.join(distDir, "requirements.json"), requirements);
  await writeJson(path.join(distDir, "assets-manifest.json"), manifest);

  try {
    await fs.mkdir(path.join(distDir, "references"), { recursive: true });
    for (const ref of asArray(requirements.reference_images)) {
      const rel = cleanString(ref);
      if (!rel || /^https?:\/\//i.test(rel)) continue;
      await copyIfExists(path.resolve(rootDir, rel), path.join(distDir, "references", path.basename(rel)));
    }
  } catch {
    // Reference copies are optional; rendering should not fail because of them.
  }

  process.stdout.write(`${JSON.stringify({ ok: true, entry: path.join(distDir, "index.html") }, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
