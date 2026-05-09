import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

type JsonObject = Record<string, unknown>;

const DEFAULT_DESIGN_CONTEXT = {
  color_palette: {
    bg: "#F7F3EC",
    card_bg: "#FFFFFF",
    card_subtle: "#F1E8DA",
    text_primary: "#2C241C",
    text_secondary: "#7A6B5C",
    accent: "#B97945",
  },
  radius: "18px",
  shadow: "0 14px 42px rgba(65, 45, 28, 0.12)",
  spacing: 16,
  page_width: 375,
};

const MODULE_RUNTIME_COPY: Record<string, { label: string; alt: string }> = {
  top_slider: { label: "头图轮播", alt: "顶部轮播" },
  user_assets: { label: "会员资产区", alt: "客户资产" },
  banner: { label: "活动横幅", alt: "Banner" },
  goods: { label: "商品模块", alt: "商品展示" },
  shop_info: { label: "门店信息", alt: "店铺信息" },
  image_ad: { label: "参考广告块", alt: "参考广告块" },
};
const IMAGE_MODULE_TYPES = new Set(["top_slider", "banner", "goods", "shop_info", "image_ad"]);

const USER_ASSETS_DEFAULTS = {
  greeting: "Hello",
  nickname: "小赞宝用户",
  avatar: "https://img01.yzcdn.cn/upload_files/2023/07/06/Fq4fiVPqT5Ea1l59IThVNBGapfTq.png",
  codeIcon: "https://img01.yzcdn.cn/upload_files/2023/07/10/FiPIAQ_DwDBgQ9L4iKpD7O2r4Dd_.png",
  bodyAlt: "客户资产功能区背景图",
} as const;

const USER_ASSETS_PREVIEW_BODY_WIDTH = 311;
const USER_ASSETS_GRID_GAP = 11;
const USER_ASSETS_TEMPLATE_TYPES = {
  SINGLE: 7,
  ONE_ROW_TWO: 1,
  LEFT_ONE_RIGHT_TWO: 2,
  ONE_ROW_THREE: 3,
  TWO_ROW_FIVE: 5,
  TWO_ROW_FOUR: 6,
  HOTZONE: "hotzone",
} as const;
const USER_ASSETS_TEMPLATE_TYPE_LABELS: Record<string, string> = {
  "7": "单张横图",
  "1": "一行两个",
  "2": "左一右二",
  "3": "一行三个",
  "5": "二行五个",
  "6": "二行四个",
  hotzone: "热区自由布局",
};
const USER_ASSETS_SLOT_SIZE_SPECS = {
  wide: { width: 611, height: 216 },
  large: { width: 300, height: 456 },
  medium: { width: 300, height: 220 },
  small: { width: 196, height: 220 },
  free: { width: 196, height: 220 },
} as const;
const USER_ASSETS_LAYOUT_SPECS: Record<string, JsonObject> = {
  "7": {
    templateType: 7,
    slots: [{ id: "single", role: "main_action", size: "wide", position: "single" }],
    canvasWidth: 611,
    canvasHeight: 216,
  },
  "1": {
    templateType: 1,
    slots: [
      { id: "left", role: "sub_action", size: "medium", position: "left" },
      { id: "right", role: "sub_action", size: "medium", position: "right" },
    ],
    canvasWidth: 611,
    canvasHeight: 220,
  },
  "3": {
    templateType: 3,
    slots: [
      { id: "left_1", role: "sub_action", size: "small", position: "left_1" },
      { id: "center_1", role: "sub_action", size: "small", position: "center_1" },
      { id: "right_1", role: "sub_action", size: "small", position: "right_1" },
    ],
    canvasWidth: 610,
    canvasHeight: 220,
  },
  "2": {
    templateType: 2,
    slots: [
      { id: "left_large", role: "main_action", size: "large", position: "left_large" },
      { id: "right_top", role: "sub_action", size: "medium", position: "right_top" },
      { id: "right_bottom", role: "sub_action", size: "medium", position: "right_bottom" },
    ],
    canvasWidth: 611,
    canvasHeight: 456,
  },
  "6": {
    templateType: 6,
    slots: [
      { id: "top_left", role: "sub_action", size: "medium", position: "top_left" },
      { id: "top_right", role: "sub_action", size: "medium", position: "top_right" },
      { id: "bottom_left", role: "sub_action", size: "medium", position: "bottom_left" },
      { id: "bottom_right", role: "sub_action", size: "medium", position: "bottom_right" },
    ],
    canvasWidth: 611,
    canvasHeight: 451,
  },
  "5": {
    templateType: 5,
    slots: [
      { id: "top_left", role: "sub_action", size: "medium", position: "top_left" },
      { id: "top_right", role: "sub_action", size: "medium", position: "top_right" },
      { id: "bottom_left", role: "sub_action", size: "small", position: "bottom_left" },
      { id: "bottom_center", role: "sub_action", size: "small", position: "bottom_center" },
      { id: "bottom_right", role: "sub_action", size: "small", position: "bottom_right" },
    ],
    canvasWidth: 611,
    canvasHeight: 451,
  },
};

const SHOP_HOME_PAGE_STATUS_SIGNAL_BARS = [
  { x: 1, y: 9.5, width: 3, height: 2.5, rx: 1.4, opacity: 0.45 },
  { x: 5, y: 7, width: 3, height: 5, rx: 1.4, opacity: 0.61 },
  { x: 9, y: 4.5, width: 3, height: 7.5, rx: 1.4, opacity: 0.77 },
  { x: 13, y: 2, width: 3, height: 10, rx: 1.4, opacity: 0.93 },
];
const SHOP_HOME_PAGE_STATUS_WIFI_PATHS = [
  { d: "M1.7 4.8C3.6 3 6.2 2 9 2c2.8 0 5.4 1 7.3 2.8", type: "path" },
  { d: "M4.4 7.5A6.6 6.6 0 0 1 9 5.8c1.8 0 3.4.6 4.6 1.7", type: "path" },
  { d: "M7.1 10.2A2.9 2.9 0 0 1 9 9.5c.7 0 1.4.3 1.9.7", type: "path" },
  { cx: 9, cy: 12, r: 1.25, type: "circle" },
];
const SHOP_HOME_PAGE_STATUS_BATTERY = {
  viewBox: "0 0 25 11",
  outline: { x: 0.5, y: 0.5, width: 21, height: 10, rx: 2.5, strokeOpacity: 0.45 },
  nub: { x: 22, y: 3.5, width: 1.5, height: 4, rx: 0.4, fillOpacity: 0.45 },
  fill: { x: 2, y: 2, width: 18, height: 7, rx: 1.4 },
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

function stringOr(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function asObject(value: unknown): JsonObject {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonObject) : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function isPlainObject(value: unknown): value is JsonObject {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(value: unknown) {
  return escapeHtml(value);
}

function escapeScriptJson(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

function toNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function toPositiveInteger(value: unknown, fallback: number) {
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function blendSuggestion(suggestion: unknown, fallback: number, min: number, max: number) {
  const base =
    suggestion === undefined || typeof suggestion !== "number"
      ? fallback
      : Math.round(fallback * 0.72 + suggestion * 0.28);
  return clamp(base, min, max);
}

function shortenText(value: string, max: number) {
  return value.length > max ? `${value.slice(0, Math.max(0, max - 1))}…` : value;
}

function styleAttr(styles: Record<string, unknown>) {
  return Object.entries(styles)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .map(([key, value]) => `${camelToKebab(key)}:${String(value)}`)
    .join(";");
}

function camelToKebab(value: string) {
  return value.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`);
}

function sanitizeHexColor(value: unknown, fallback: string) {
  return /^#[0-9a-f]{6}$/i.test(stringOr(value)) ? stringOr(value) : fallback;
}

function hexToRgba(hex: unknown, alpha: number) {
  const normalized = sanitizeHexColor(hex, DEFAULT_DESIGN_CONTEXT.color_palette.accent).slice(1);
  const bigint = Number.parseInt(normalized, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${clamp(alpha, 0, 1)})`;
}

function assetUrl(manifest: JsonObject, id: string) {
  const items = asObject(manifest.items);
  return cleanString(asObject(items[id]).url);
}

function resolveReusableUrl(value: unknown) {
  const input = stringOr(value);
  return /^https?:\/\//i.test(input) ? input : "";
}

function assertRenderableAssetUrl(id: string, value: unknown, errors: string[]) {
  const url = cleanString(value);
  if (!url) {
    errors.push(`${id} missing generated image URL`);
    return;
  }
  if (!/^https?:\/\/\S+$/i.test(url)) {
    errors.push(`${id} must use a real http(s) CDN image URL`);
    return;
  }
  if (/example\.invalid/i.test(url)) {
    errors.push(`${id} must not use a dry-run placeholder URL`);
  }
}

function assertManifestReadyForRendering(schema: JsonObject, manifest: JsonObject) {
  const manifestItems = asObject(manifest.items);
  const errors: string[] = [];
  for (const moduleValue of asArray(schema.modules)) {
    const module = asObject(moduleValue);
    const moduleId = stringOr(module.id);
    const moduleType = stringOr(module.type);
    if (!moduleId) continue;
    const data = asObject(module.data);
    if (moduleType === "user_assets") {
      for (const entryValue of asArray(data.entries)) {
        const entryId = stringOr(asObject(entryValue).id);
        if (!entryId) continue;
        const id = `${moduleId}.entries.${entryId}`;
        assertRenderableAssetUrl(id, asObject(manifestItems[id]).url, errors);
      }
      continue;
    }
    if (!IMAGE_MODULE_TYPES.has(moduleType)) continue;
    for (const itemValue of asArray(data.items)) {
      const itemId = stringOr(asObject(itemValue).id);
      if (!itemId) continue;
      const id = `${moduleId}.items.${itemId}`;
      assertRenderableAssetUrl(id, asObject(manifestItems[id]).url, errors);
    }
  }
  if (errors.length > 0) {
    throw new Error(`assets-manifest.json is not ready for rendering:\n${errors.map((error) => `- ${error}`).join("\n")}`);
  }
}

function normalizeDesignContext(schema: JsonObject) {
  const source = asObject(schema.design_context);
  const colors = asObject(source.color_palette);
  const theme = asObject(schema.theme);
  const themeRadius = typeof theme.radius === "number" ? `${theme.radius}px` : cleanString(theme.radius);
  return {
    color_palette: {
      bg: stringOr(colors.bg, stringOr(theme.background, DEFAULT_DESIGN_CONTEXT.color_palette.bg)),
      card_bg: stringOr(colors.card_bg, stringOr(theme.surface, DEFAULT_DESIGN_CONTEXT.color_palette.card_bg)),
      card_subtle: stringOr(
        colors.card_subtle,
        stringOr(theme.surface_subtle, DEFAULT_DESIGN_CONTEXT.color_palette.card_subtle),
      ),
      text_primary: stringOr(colors.text_primary, stringOr(theme.text, DEFAULT_DESIGN_CONTEXT.color_palette.text_primary)),
      text_secondary: stringOr(
        colors.text_secondary,
        stringOr(theme.muted, DEFAULT_DESIGN_CONTEXT.color_palette.text_secondary),
      ),
      accent: stringOr(colors.accent, stringOr(theme.accent, DEFAULT_DESIGN_CONTEXT.color_palette.accent)),
    },
    radius: stringOr(source.radius, themeRadius || DEFAULT_DESIGN_CONTEXT.radius),
    shadow: stringOr(source.shadow, DEFAULT_DESIGN_CONTEXT.shadow),
    spacing: clamp(toNumber(source.spacing, DEFAULT_DESIGN_CONTEXT.spacing), 12, 20),
    page_width: clamp(toNumber(source.page_width, DEFAULT_DESIGN_CONTEXT.page_width), 320, 430),
  };
}

function normalizeUserAssetsTemplateType(value: unknown): number | "hotzone" | null {
  if (value === USER_ASSETS_TEMPLATE_TYPES.HOTZONE) return USER_ASSETS_TEMPLATE_TYPES.HOTZONE;
  const numeric = Number(value);
  if ([1, 2, 3, 5, 6, 7].includes(numeric)) return numeric;
  return null;
}

function fixedUserAssetsLayoutSpec(templateType: number | "hotzone" | null) {
  if (templateType === null || templateType === USER_ASSETS_TEMPLATE_TYPES.HOTZONE) return null;
  return USER_ASSETS_LAYOUT_SPECS[String(templateType)] ?? null;
}

function userAssetsTemplateTypeLabel(templateType: unknown) {
  return USER_ASSETS_TEMPLATE_TYPE_LABELS[String(templateType)] ?? "客户资产布局";
}

function userAssetsCardLayoutSlots(layout: JsonObject | undefined) {
  return asArray(layout?.slots).map(asObject);
}

function inferTemplateTypeFromEntryCount(count: number) {
  if (count <= 1) return USER_ASSETS_TEMPLATE_TYPES.SINGLE;
  if (count === 2) return USER_ASSETS_TEMPLATE_TYPES.ONE_ROW_TWO;
  if (count === 3) return USER_ASSETS_TEMPLATE_TYPES.ONE_ROW_THREE;
  if (count === 4) return USER_ASSETS_TEMPLATE_TYPES.TWO_ROW_FOUR;
  if (count === 5) return USER_ASSETS_TEMPLATE_TYPES.TWO_ROW_FIVE;
  return USER_ASSETS_TEMPLATE_TYPES.HOTZONE;
}

function resolveUserAssetsCardLayout(data: JsonObject) {
  const explicit = asObject(data.card_layout);
  const explicitTemplateType = normalizeUserAssetsTemplateType(explicit.template_type);
  if (explicitTemplateType !== null && userAssetsCardLayoutSlots(explicit).length > 0) return explicit;

  const legacyLayout = asObject(data.layout);
  const inputEntries = asArray(data.entries).map(asObject);
  const templateType =
    normalizeUserAssetsTemplateType(legacyLayout.template_type) ?? inferTemplateTypeFromEntryCount(inputEntries.length);
  if (templateType === USER_ASSETS_TEMPLATE_TYPES.HOTZONE) {
    const slotCount = Math.max(inputEntries.length, 1);
    return {
      template_type: USER_ASSETS_TEMPLATE_TYPES.HOTZONE,
      slots: Array.from({ length: slotCount }, (_, index) => ({
        id: `slot_${index + 1}`,
        role: "sub_action",
        size: "free",
        position: `slot_${index + 1}`,
      })),
    };
  }
  const spec = fixedUserAssetsLayoutSpec(templateType);
  return spec
    ? {
        template_type: spec.templateType,
        slots: asArray(spec.slots).map((slot) => ({ ...asObject(slot) })),
      }
    : { template_type: USER_ASSETS_TEMPLATE_TYPES.ONE_ROW_THREE, slots: [] };
}

function resolveUserAssetsEntries(data: JsonObject, cardLayout: JsonObject) {
  const slots = userAssetsCardLayoutSlots(cardLayout);
  const inputEntries = asArray(data.entries).map(asObject);
  const entriesBySlotId = new Map(
    inputEntries
      .map((entry) => [stringOr(entry.slot_id || entry.id), entry] as const)
      .filter(([slotId]) => Boolean(slotId)),
  );
  return slots.map((slot, index) => {
    const slotId = stringOr(slot.id, `slot_${index + 1}`);
    const source = entriesBySlotId.get(slotId) ?? inputEntries[index] ?? {};
    const title = stringOr(source.title, `入口 ${index + 1}`);
    return {
      ...source,
      id: stringOr(source.id, slotId),
      slot_id: slotId,
      icon: stringOr(source.icon, "sparkles"),
      title,
      subtitle: stringOr(source.subtitle, "功能入口"),
      image: stringOr(source.image),
      alt: stringOr(source.alt, title),
    };
  });
}

function buildHotzoneRowPattern(count: number) {
  if (count <= 0) return [];
  if (count <= 3) return [count];
  if (count === 4) return [2, 2];
  if (count === 5) return [2, 3];
  const rows = Array(Math.floor(count / 3)).fill(3);
  const remainder = count % 3;
  if (remainder === 0) return rows;
  if (remainder === 2) return [...rows, 2];
  if (rows.length === 0) return [2, 2];
  return [...rows.slice(0, -1), 2, 2];
}

function resolveUserAssetsLayoutMetrics(cardLayout: JsonObject | undefined) {
  const templateType = normalizeUserAssetsTemplateType(cardLayout?.template_type);
  if (templateType === USER_ASSETS_TEMPLATE_TYPES.HOTZONE) {
    const slots = userAssetsCardLayoutSlots(cardLayout);
    const rowPattern = buildHotzoneRowPattern(slots.length || 1);
    return {
      canvasWidth: 611,
      canvasHeight:
        rowPattern.length * USER_ASSETS_SLOT_SIZE_SPECS.free.height
        + Math.max(0, rowPattern.length - 1) * USER_ASSETS_GRID_GAP,
      isFreeform: true,
      rowPattern,
    };
  }
  const spec = fixedUserAssetsLayoutSpec(templateType ?? USER_ASSETS_TEMPLATE_TYPES.ONE_ROW_THREE);
  return {
    canvasWidth: toNumber(spec?.canvasWidth, 611),
    canvasHeight: toNumber(spec?.canvasHeight, 220),
    isFreeform: false,
    rowPattern: [] as number[],
  };
}

function defaultHeightForModule(moduleType: string) {
  switch (moduleType) {
    case "top_slider":
      return 500;
    case "banner":
      return 200;
    case "goods":
      return 260;
    case "shop_info":
      return 540;
    default:
      return 188;
  }
}

function computeImageHeight(module: JsonObject, index: number, schema: JsonObject) {
  const context = asObject(schema.design_context);
  const width = clamp(toNumber(context.page_width, DEFAULT_DESIGN_CONTEXT.page_width), 320, 430);
  const data = asObject(module.data);
  const suggestion = typeof data.height === "number" ? data.height : undefined;
  const mode = stringOr(data.mode, "single");
  const type = stringOr(module.type);
  if (type === "top_slider" && index === 0) {
    const base =
      mode === "dual_carousel"
        ? Math.round(width * 0.78)
        : mode === "horizontal_scroll"
          ? Math.round(width * 0.56)
          : Math.round(width * (4 / 3));
    return blendSuggestion(suggestion, base, 360, 540);
  }
  if (type === "banner") {
    const base = Math.round(width * (400 / 750));
    return blendSuggestion(suggestion, base, Math.round(base * 0.9), Math.round(base * 1.1));
  }
  if (type === "goods") {
    const base = mode === "horizontal_scroll" ? Math.round(width * 0.62) : Math.round(width * (3 / 4));
    return blendSuggestion(suggestion, base, 200, 280);
  }
  if (type === "shop_info") {
    return blendSuggestion(suggestion, Math.round(width * (16 / 9)), 420, 640);
  }
  return blendSuggestion(suggestion, defaultHeightForModule(type), 120, 260);
}

function computeUserAssetsHeight(module: JsonObject, schema: JsonObject) {
  const context = asObject(schema.design_context);
  const data = asObject(module.data);
  const cardLayout = resolveUserAssetsCardLayout(data);
  const entries = resolveUserAssetsEntries(data, cardLayout);
  const metrics = resolveUserAssetsLayoutMetrics(cardLayout);
  const pageWidth = toNumber(context.page_width, DEFAULT_DESIGN_CONTEXT.page_width);
  const spacing = toNumber(context.spacing, DEFAULT_DESIGN_CONTEXT.spacing);
  const availableWidth = clamp(pageWidth - spacing * 2 - 32, 260, pageWidth);
  const imageHeight = Math.round((availableWidth * metrics.canvasHeight) / metrics.canvasWidth);
  const hasRenderableEntries = entries.length > 0 || entries.some((entry) => stringOr(entry.image)) || Boolean(stringOr(data.body_image));
  const fallback = hasRenderableEntries ? imageHeight + 134 : 208;
  const maxHeight = metrics.isFreeform ? 760 : 560;
  return hasRenderableEntries ? blendSuggestion(data.height, fallback, 124, maxHeight) : fallback;
}

function computeModuleLayout(module: JsonObject, index: number, modules: JsonObject[], schema: JsonObject) {
  const context = asObject(schema.design_context);
  const spacing = clamp(toNumber(context.spacing, DEFAULT_DESIGN_CONTEXT.spacing), 12, 20);
  const previous = index > 0 ? modules[index - 1] : null;
  if (module.type === "top_slider" && index === 0) {
    return { offsetY: 0, zIndex: 1, paddingX: 0, paddingTop: 0, paddingBottom: 0 };
  }
  if (module.type === "banner") {
    return { offsetY: 0, zIndex: 1, paddingX: 0, paddingTop: 0, paddingBottom: 0 };
  }
  if (module.type === "user_assets") {
    const shouldOverlap = schema.layout_mode === "overlay" && asObject(previous).type === "top_slider" && index <= 2;
    return {
      offsetY: shouldOverlap ? -clamp(toNumber(context.page_width, DEFAULT_DESIGN_CONTEXT.page_width) * 0.15, 44, 62) : 0,
      zIndex: shouldOverlap ? 3 : 1,
      paddingX: spacing,
      paddingTop: shouldOverlap ? 0 : spacing,
      paddingBottom: spacing,
    };
  }
  return { offsetY: 0, zIndex: 1, paddingX: 0, paddingTop: 0, paddingBottom: 0 };
}

function normalizeSchemaForRendering(schema: JsonObject, manifest: JsonObject) {
  const next = deepClone(schema);
  next.layout_mode = next.layout_mode === "flow" ? "flow" : "overlay";
  next.design_context = normalizeDesignContext(next);
  next.modules = asArray(next.modules).map((moduleValue) => {
    const module = asObject(moduleValue);
    const moduleId = stringOr(module.id);
    const data = asObject(module.data);
    const type = stringOr(module.type);
    if (type === "user_assets") {
      const entries = asArray(data.entries).map((entryValue) => {
        const entry = asObject(entryValue);
        const id = stringOr(entry.id);
        const image = id ? assetUrl(manifest, `${moduleId}.entries.${id}`) : "";
        return { ...entry, ...(image ? { image } : {}) };
      });
      module.data = {
        ...data,
        card_layout: resolveUserAssetsCardLayout({ ...data, entries }),
        entries,
      };
      return module;
    }
    const items = asArray(data.items).map((itemValue) => {
      const item = asObject(itemValue);
      const id = stringOr(item.id);
      const image = id ? assetUrl(manifest, `${moduleId}.items.${id}`) : "";
      return { ...item, ...(image ? { image } : {}) };
    });
    module.data = { ...data, items };
    return module;
  });
  next.modules = asArray(next.modules).map((moduleValue, index, modules) => {
    const module = asObject(moduleValue);
    const data = asObject(module.data);
    module.layout = computeModuleLayout(module, index, modules.map(asObject), next);
    if (module.type === "user_assets") {
      module.data = { ...data, height: computeUserAssetsHeight(module, next) };
      return module;
    }
    if (module.type === "top_slider" && asArray(data.items).length > 1) {
      data.mode = "carousel_poster";
      data.auto_play_ms = toPositiveInteger(data.auto_play_ms, 3000);
    }
    module.data = { ...data, height: computeImageHeight({ ...module, data }, index, next) };
    return module;
  });
  return next;
}

function hasImageAsset(item: unknown) {
  return Boolean(resolveReusableUrl(asObject(item).image));
}

function imageCardStyleAttr(item: unknown, height: number) {
  return hasImageAsset(item) ? "" : `style="${styleAttr({ height: `${height}px` })}"`;
}

function renderGenericPendingImageMark(label = "图片待生成", compact = false) {
  return `<div class="sf-placeholder__generic-image${compact ? " is-compact" : ""}">
    <svg viewBox="0 0 46 46" fill="none" aria-hidden="true">
      <rect x="8" y="10" width="30" height="26" rx="7" stroke="currentColor" stroke-width="1.6"></rect>
      <circle cx="18" cy="19" r="3.5" fill="currentColor" opacity="0.42"></circle>
      <path d="M14 32l7.2-7.2 5.1 5.1 3.5-3.5L36 32" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"></path>
    </svg>
    <span>${escapeHtml(label)}</span>
  </div>`;
}

function renderImagePlaceholder({ eyebrow, title, description, status = "待生成" }: { eyebrow: string; title: string; description: string; status?: string }) {
  return `<div class="sf-placeholder">
    <div class="sf-placeholder__content">
      <div class="sf-placeholder__top">
        <span class="sf-placeholder__chip">${escapeHtml(eyebrow)}</span>
        <span class="sf-placeholder__status">${escapeHtml(status)}</span>
      </div>
      <div class="sf-placeholder__art">${renderGenericPendingImageMark()}</div>
      <div class="sf-placeholder__footer">
        <strong class="sf-placeholder__title">${escapeHtml(title)}</strong>
        <span class="sf-placeholder__desc">${escapeHtml(description)}</span>
      </div>
    </div>
  </div>`;
}

function renderImageItem(moduleType: string, itemValue: unknown) {
  const item = asObject(itemValue);
  if (Object.keys(item).length === 0) {
    return renderImagePlaceholder({
      eyebrow: "内容占位",
      title: "缺少内容",
      description: "当前结构项为空。",
      status: "空状态",
    });
  }
  const imageUrl = resolveReusableUrl(item.image);
  const defaults = MODULE_RUNTIME_COPY[moduleType] ?? MODULE_RUNTIME_COPY.top_slider;
  if (imageUrl) {
    return `<img src="${escapeAttr(imageUrl)}" alt="${escapeAttr(stringOr(item.alt, defaults.alt))}" />`;
  }
  const prompt = asObject(item.image_prompt_schema);
  const content = asObject(prompt.content);
  return renderImagePlaceholder({
    eyebrow: defaults.label,
    title: shortenText(stringOr(content.title, stringOr(item.alt, defaults.alt)), 24),
    description: shortenText(stringOr(content.subtitle, stringOr(content.description, "等待素材生成")), 40),
  });
}

function renderImageModule(module: JsonObject) {
  const data = asObject(module.data);
  const moduleType = stringOr(module.type);
  const height = Math.max(80, toNumber(data.height, defaultHeightForModule(moduleType)));
  const items = asArray(data.items).map(asObject);

  if (stringOr(data.mode) === "horizontal_scroll") {
    return `<div class="sf-goods-horizontal">${items
      .map((item) => {
        const width = Math.min(height * 0.86, 240);
        return `<div class="sf-goods-horizontal__card" style="${styleAttr({
          width: `${width}px`,
          ...(hasImageAsset(item) ? {} : { height: `${height}px` }),
          borderRadius: "var(--sf-radius)",
          backgroundColor: "var(--sf-card-subtle)",
        })}">${renderImageItem(moduleType, item)}</div>`;
      })
      .join("")}</div>`;
  }

  if (moduleType === "goods" && items.length > 1) {
    return `<div class="sf-goods-stack">${items
      .map((item) => `<div class="sf-image-card" ${imageCardStyleAttr(item, height)}>${renderImageItem(moduleType, item)}</div>`)
      .join("")}</div>`;
  }

  if (stringOr(data.mode) === "dual_carousel" && items.length >= 2) {
    const topHeight = Math.max(80, Math.floor((height - 12) / 2));
    return `<div class="sf-dual-carousel" style="${styleAttr({
      minHeight: hasImageAsset(items[0]) && hasImageAsset(items[1]) ? "" : `${height}px`,
    })}">
      <div class="sf-image-card" ${imageCardStyleAttr(items[0], topHeight)}>${renderImageItem(moduleType, items[0])}</div>
      <div class="sf-image-card" ${imageCardStyleAttr(items[1], topHeight)}>${renderImageItem(moduleType, items[1])}</div>
    </div>`;
  }

  if (stringOr(data.mode) === "carousel_poster" && items.length > 1) {
    const carouselItems = items.some((item) => hasImageAsset(item)) ? items.filter((item) => hasImageAsset(item)) : items;
    return `<div class="sf-carousel sf-top-slider"${carouselItems.length > 1 ? ' data-carousel="true"' : ""}>
      ${carouselItems
        .map((item, index) => `<div class="sf-carousel__item${index === 0 ? " is-active" : ""}" ${imageCardStyleAttr(item, height)}>${renderImageItem(moduleType, item)}</div>`)
        .join("")}
      ${carouselItems.length > 1
        ? `<div class="sf-carousel__dots">${carouselItems.map((_, index) => `<span class="${index === 0 ? "is-active" : ""}"></span>`).join("")}</div>`
        : ""}
    </div>`;
  }

  const item = items[0];
  const typeClass = moduleType === "top_slider"
    ? "sf-top-slider"
    : moduleType === "banner"
      ? "sf-banner"
      : moduleType === "shop_info"
        ? "sf-shop-info"
        : "";
  return `<div class="sf-image-card ${typeClass}" ${imageCardStyleAttr(item, height)}>${renderImageItem(moduleType, item)}</div>`;
}

function userAssetsCardRadius(slot: JsonObject | undefined) {
  const size = stringOr(slot?.size);
  return size === "large" || size === "wide" ? 24 : 20;
}

function renderUserAssetsEntryShell(itemValue: unknown, slotValue: unknown) {
  const item = asObject(itemValue);
  const slot = asObject(slotValue);
  const large = stringOr(slot.size) === "large" || stringOr(slot.size) === "wide";
  const title = shortenText(stringOr(item.title, "功能入口"), large ? 10 : 8);
  const subtitle = shortenText(stringOr(item.subtitle, "ENTRY"), large ? 14 : 12);
  return `<div class="sf-user-assets-entry${large ? " is-large" : ""}" style="${styleAttr({
    borderRadius: `${userAssetsCardRadius(slot)}px`,
  })}">
    <div class="sf-user-assets-entry__icon"></div>
    <div class="sf-user-assets-entry__copy">
      <strong class="sf-user-assets-entry__title">${escapeHtml(title)}</strong>
      <span class="sf-user-assets-entry__subtitle">${escapeHtml(subtitle)}</span>
    </div>
  </div>`;
}

function renderUserAssetsCard(entryValue: unknown, slotValue: unknown) {
  const entry = asObject(entryValue);
  const slot = asObject(slotValue);
  const imageUrl = resolveReusableUrl(entry.image);
  if (imageUrl) {
    const alt = stringOr(entry.alt, stringOr(entry.title, "客户资产入口"));
    return `<div class="sf-user-assets-card" style="${styleAttr({ borderRadius: `${userAssetsCardRadius(slot)}px` })}">
      <img src="${escapeAttr(imageUrl)}" alt="${escapeAttr(alt)}" class="sf-user-assets-card__img" />
    </div>`;
  }
  return renderUserAssetsEntryShell(entry, slot);
}

function renderHotzoneRows(slots: JsonObject[], entriesBySlotId: Map<string, JsonObject>) {
  const rowPattern = buildHotzoneRowPattern(slots.length || 1);
  let cursor = 0;
  return rowPattern
    .map((count) => {
      const rowSlots = slots.slice(cursor, cursor + count);
      cursor += count;
      return `<div style="${styleAttr({
        display: "grid",
        gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))`,
        gap: `${USER_ASSETS_GRID_GAP}px`,
      })}">${rowSlots.map((slot) => renderUserAssetsCard(entriesBySlotId.get(stringOr(slot.id)), slot)).join("")}</div>`;
    })
    .join("");
}

function renderUserAssetsCardsLayout(cardLayout: JsonObject, entriesValue: unknown[]) {
  const templateType = normalizeUserAssetsTemplateType(cardLayout.template_type);
  const slots = userAssetsCardLayoutSlots(cardLayout);
  const entries = entriesValue.map(asObject);
  const entriesBySlotId = new Map(
    entries.map((entry) => [stringOr(entry.slot_id || entry.id), entry] as const).filter(([slotId]) => Boolean(slotId)),
  );

  if (templateType === USER_ASSETS_TEMPLATE_TYPES.SINGLE) {
    const slot = slots[0] ?? { id: "single", size: "wide" };
    return renderUserAssetsCard(entriesBySlotId.get(stringOr(slot.id)), slot);
  }

  if (templateType === USER_ASSETS_TEMPLATE_TYPES.ONE_ROW_TWO || templateType === USER_ASSETS_TEMPLATE_TYPES.ONE_ROW_THREE) {
    return `<div class="sf-user-assets-placeholder__layout" style="${styleAttr({
      display: "grid",
      gridTemplateColumns: templateType === USER_ASSETS_TEMPLATE_TYPES.ONE_ROW_THREE ? "repeat(3, minmax(0, 1fr))" : "repeat(2, minmax(0, 1fr))",
      gap: `${USER_ASSETS_GRID_GAP}px`,
      height: "100%",
    })}">${slots.map((slot) => renderUserAssetsCard(entriesBySlotId.get(stringOr(slot.id)), slot)).join("")}</div>`;
  }

  if (templateType === USER_ASSETS_TEMPLATE_TYPES.LEFT_ONE_RIGHT_TWO) {
    const left = slots.find((slot) => stringOr(slot.id) === "left_large");
    const rightTop = slots.find((slot) => stringOr(slot.id) === "right_top");
    const rightBottom = slots.find((slot) => stringOr(slot.id) === "right_bottom");
    return `<div class="sf-user-assets-placeholder__layout" style="display:grid;grid-template-columns:1fr 1fr;gap:11px;height:100%">
      <div>${renderUserAssetsCard(entriesBySlotId.get("left_large"), left)}</div>
      <div style="display:grid;gap:11px">
        ${renderUserAssetsCard(entriesBySlotId.get("right_top"), rightTop)}
        ${renderUserAssetsCard(entriesBySlotId.get("right_bottom"), rightBottom)}
      </div>
    </div>`;
  }

  if (templateType === USER_ASSETS_TEMPLATE_TYPES.TWO_ROW_FOUR) {
    return `<div class="sf-user-assets-placeholder__layout" style="display:grid;grid-template-columns:repeat(2, minmax(0, 1fr));gap:11px;height:100%">
      ${slots.map((slot) => renderUserAssetsCard(entriesBySlotId.get(stringOr(slot.id)), slot)).join("")}
    </div>`;
  }

  if (templateType === USER_ASSETS_TEMPLATE_TYPES.TWO_ROW_FIVE) {
    const topSlots = slots.slice(0, 2);
    const bottomSlots = slots.slice(2);
    return `<div class="sf-user-assets-placeholder__layout" style="display:grid;gap:11px;height:100%">
      <div style="display:grid;grid-template-columns:repeat(2, minmax(0, 1fr));gap:11px">
        ${topSlots.map((slot) => renderUserAssetsCard(entriesBySlotId.get(stringOr(slot.id)), slot)).join("")}
      </div>
      <div style="display:grid;grid-template-columns:repeat(3, minmax(0, 1fr));gap:11px">
        ${bottomSlots.map((slot) => renderUserAssetsCard(entriesBySlotId.get(stringOr(slot.id)), slot)).join("")}
      </div>
    </div>`;
  }

  return `<div class="sf-user-assets-placeholder__layout" style="display:grid;gap:11px;height:100%">
    ${renderHotzoneRows(slots, entriesBySlotId)}
  </div>`;
}

function renderUserAssetsPendingPlaceholder(cardLayout: JsonObject, entries: JsonObject[]) {
  return `<div class="sf-user-assets-placeholder">
    ${renderUserAssetsCardsLayout(cardLayout, entries)}
  </div>`;
}

function renderUserAssetsModule(module: JsonObject) {
  const data = asObject(module.data);
  const progress = clamp(toNumber(data.progress_percent, 33), 0, 100);
  const cardLayout = resolveUserAssetsCardLayout(data);
  const entries = resolveUserAssetsEntries(data, cardLayout).map(asObject);
  const metrics = resolveUserAssetsLayoutMetrics(cardLayout);
  const hasEntries = entries.length > 0;
  const hasEntryImages = entries.some((entry) => Boolean(resolveReusableUrl(entry.image)));
  const bodyImageUrl = resolveReusableUrl(data.body_image);
  const avatarUrl = resolveReusableUrl(data.avatar) || USER_ASSETS_DEFAULTS.avatar;
  const bodyHeight = hasEntries || bodyImageUrl
    ? Math.round((metrics.canvasHeight / metrics.canvasWidth) * USER_ASSETS_PREVIEW_BODY_WIDTH)
    : clamp(Math.round(toNumber(data.height, 208) * 0.38), 72, 108);
  return `<div class="sf-user-assets" style="${styleAttr({ minHeight: `${Math.max(124, toNumber(data.height, 188))}px` })}">
    <div class="sf-user-assets__top">
      <div>
        <div class="sf-user-assets__greeting">${escapeHtml(stringOr(data.greeting, USER_ASSETS_DEFAULTS.greeting))}</div>
        <div class="sf-user-assets__name">${escapeHtml(stringOr(data.nickname, USER_ASSETS_DEFAULTS.nickname))}</div>
      </div>
      <div class="sf-user-assets__code">
        <img src="${escapeAttr(avatarUrl)}" alt="${escapeAttr(stringOr(data.nickname, USER_ASSETS_DEFAULTS.nickname))}" class="sf-user-assets__avatar" />
        <div class="sf-user-assets__pill"><img src="${escapeAttr(USER_ASSETS_DEFAULTS.codeIcon)}" alt="" class="sf-user-assets__code-icon" />会员码</div>
      </div>
    </div>
    <div class="sf-user-assets__progress"><span style="${styleAttr({ width: `${progress}%` })}"></span></div>
    ${stringOr(data.upgrade_tip) ? `<div class="sf-user-assets__tip">${escapeHtml(data.upgrade_tip)}</div>` : ""}
    <div class="sf-user-assets__body" style="${styleAttr({ height: `${bodyHeight}px` })}">
      ${hasEntryImages
        ? renderUserAssetsCardsLayout(cardLayout, entries)
        : bodyImageUrl
          ? `<img src="${escapeAttr(bodyImageUrl)}" alt="${escapeAttr(stringOr(data.body_alt, USER_ASSETS_DEFAULTS.bodyAlt))}" class="sf-user-assets__body-image" />`
          : renderUserAssetsPendingPlaceholder(cardLayout, entries)}
    </div>
  </div>`;
}

function renderModule(moduleValue: unknown) {
  const module = asObject(moduleValue);
  const inner = module.type === "user_assets" ? renderUserAssetsModule(module) : renderImageModule(module);
  if (!inner) return "";
  const layout = asObject(module.layout);
  return `<section class="sf-module" style="${styleAttr({
    marginTop: `${toNumber(layout.offsetY, 0)}px`,
    zIndex: String(toNumber(layout.zIndex, 1)),
    paddingLeft: `${toNumber(layout.paddingX, 0)}px`,
    paddingRight: `${toNumber(layout.paddingX, 0)}px`,
    paddingTop: `${toNumber(layout.paddingTop, 0)}px`,
    paddingBottom: `${toNumber(layout.paddingBottom, 0)}px`,
  })}"><div class="sf-module__inner">${inner}</div></section>`;
}

function heroHasImage(schema: JsonObject) {
  const first = asObject(asArray(schema.modules)[0]);
  if (first.type !== "top_slider") return false;
  return asArray(asObject(first.data).items).some((item) => hasImageAsset(item));
}

function themeCss(schema: JsonObject) {
  const context = asObject(schema.design_context);
  const colors = asObject(context.color_palette);
  const immersiveHero = heroHasImage(schema);
  return `:root {
  --sf-bg: ${stringOr(colors.bg, DEFAULT_DESIGN_CONTEXT.color_palette.bg)};
  --sf-card-bg: ${stringOr(colors.card_bg, DEFAULT_DESIGN_CONTEXT.color_palette.card_bg)};
  --sf-card-subtle: ${stringOr(colors.card_subtle, DEFAULT_DESIGN_CONTEXT.color_palette.card_subtle)};
  --sf-fg: ${stringOr(colors.text_primary, DEFAULT_DESIGN_CONTEXT.color_palette.text_primary)};
  --sf-muted: ${stringOr(colors.text_secondary, DEFAULT_DESIGN_CONTEXT.color_palette.text_secondary)};
  --sf-accent: ${stringOr(colors.accent, DEFAULT_DESIGN_CONTEXT.color_palette.accent)};
  --sf-accent-soft: ${hexToRgba(colors.accent, 0.18)};
  --sf-shadow-soft: ${hexToRgba(colors.text_primary, 0.08)};
  --sf-radius: ${stringOr(context.radius, DEFAULT_DESIGN_CONTEXT.radius)};
  --sf-shadow: ${stringOr(context.shadow, DEFAULT_DESIGN_CONTEXT.shadow)};
  --sf-page-width: ${toNumber(context.page_width, DEFAULT_DESIGN_CONTEXT.page_width)}px;
  --sf-overlay-bg: linear-gradient(180deg, ${hexToRgba(colors.bg, immersiveHero ? 0.14 : 0.86)} 0%, ${hexToRgba(colors.bg, immersiveHero ? 0.04 : 0.16)} 78%, ${hexToRgba(colors.bg, 0)} 100%);
  --sf-overlay-bg-scrolled: linear-gradient(180deg, ${hexToRgba(colors.bg, 0.9)} 0%, ${hexToRgba(colors.bg, 0.22)} 78%, ${hexToRgba(colors.bg, 0)} 100%);
  --sf-phone-chrome-color: ${stringOr(colors.text_primary, DEFAULT_DESIGN_CONTEXT.color_palette.text_primary)};
  --sf-phone-capsule-border: ${immersiveHero ? "rgba(255,255,255,0.18)" : hexToRgba(colors.text_primary, 0.08)};
  --sf-phone-capsule-shadow: 0 12px 28px ${hexToRgba(colors.text_primary, immersiveHero ? 0.06 : 0.08)};
}\n`;
}

function renderStatusSignalIcon() {
  return `<svg width="16" height="12" viewBox="0 0 18 14" fill="none" aria-hidden="true">${SHOP_HOME_PAGE_STATUS_SIGNAL_BARS.map((bar) => `<rect x="${bar.x}" y="${bar.y}" width="${bar.width}" height="${bar.height}" rx="${bar.rx}" fill="currentColor" opacity="${bar.opacity}"></rect>`).join("")}</svg>`;
}

function renderStatusWifiIcon() {
  return `<svg width="16" height="12" viewBox="0 0 18 14" fill="none" aria-hidden="true">${SHOP_HOME_PAGE_STATUS_WIFI_PATHS.map((entry) => entry.type === "circle"
    ? `<circle cx="${entry.cx}" cy="${entry.cy}" r="${entry.r}" fill="currentColor"></circle>`
    : `<path d="${entry.d}" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"></path>`).join("")}</svg>`;
}

function renderStatusBatteryIcon() {
  return `<svg class="storefront-phone-battery-icon" viewBox="${SHOP_HOME_PAGE_STATUS_BATTERY.viewBox}" fill="none" aria-hidden="true">
    <rect x="${SHOP_HOME_PAGE_STATUS_BATTERY.outline.x}" y="${SHOP_HOME_PAGE_STATUS_BATTERY.outline.y}" width="${SHOP_HOME_PAGE_STATUS_BATTERY.outline.width}" height="${SHOP_HOME_PAGE_STATUS_BATTERY.outline.height}" rx="${SHOP_HOME_PAGE_STATUS_BATTERY.outline.rx}" fill="none" stroke="currentColor" stroke-opacity="${SHOP_HOME_PAGE_STATUS_BATTERY.outline.strokeOpacity}"></rect>
    <rect x="${SHOP_HOME_PAGE_STATUS_BATTERY.nub.x}" y="${SHOP_HOME_PAGE_STATUS_BATTERY.nub.y}" width="${SHOP_HOME_PAGE_STATUS_BATTERY.nub.width}" height="${SHOP_HOME_PAGE_STATUS_BATTERY.nub.height}" rx="${SHOP_HOME_PAGE_STATUS_BATTERY.nub.rx}" fill="currentColor" fill-opacity="${SHOP_HOME_PAGE_STATUS_BATTERY.nub.fillOpacity}"></rect>
    <rect x="${SHOP_HOME_PAGE_STATUS_BATTERY.fill.x}" y="${SHOP_HOME_PAGE_STATUS_BATTERY.fill.y}" width="${SHOP_HOME_PAGE_STATUS_BATTERY.fill.width}" height="${SHOP_HOME_PAGE_STATUS_BATTERY.fill.height}" rx="${SHOP_HOME_PAGE_STATUS_BATTERY.fill.rx}" fill="currentColor"></rect>
  </svg>`;
}

function renderMiniProgramCapsule() {
  return `<div class="storefront-phone-mini-capsule">
    <div class="storefront-phone-mini-capsule-left" aria-hidden="true"><span></span><span></span><span></span></div>
    <span class="storefront-phone-mini-divider" aria-hidden="true"></span>
    <div class="storefront-phone-mini-capsule-right" aria-hidden="true"><span></span></div>
  </div>`;
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
  const rawSchema = await readJson(path.join(rootDir, "schema.json"));
  const requirements = await readJson(path.join(rootDir, "requirements.json"));
  const manifest = await readJson(path.join(rootDir, "assets-manifest.json"));
  assertManifestReadyForRendering(rawSchema, manifest);
  const schema = normalizeSchemaForRendering(rawSchema, manifest);
  const template = await fs.readFile(path.join(templateDir, "index.template.html"), "utf8");
  const baseCss = await fs.readFile(path.join(templateDir, "tokens.css"), "utf8");
  const page = asObject(schema.page);
  const pageTitle = cleanString(page.title) || cleanString(page.brand_name) || "店铺首页";
  const appHtml = asArray(schema.modules)
    .map((module) => renderModule(module))
    .filter(Boolean)
    .join("\n");
  const html = template
    .replaceAll("__PAGE_TITLE__", escapeHtml(pageTitle))
    .replace("__APP_CSS__", `${baseCss}\n${themeCss(schema)}`)
    .replace("__STATUS_SIGNAL__", renderStatusSignalIcon())
    .replace("__STATUS_WIFI__", renderStatusWifiIcon())
    .replace("__STATUS_BATTERY__", renderStatusBatteryIcon())
    .replace("__MINI_CAPSULE__", renderMiniProgramCapsule())
    .replace("__APP_HTML__", appHtml)
    .replace("__SCHEMA_JSON__", escapeScriptJson(schema));

  const distDir = path.join(rootDir, "dist");
  await fs.mkdir(distDir, { recursive: true });
  const entryPath = path.join(distDir, "shop-home-page.preview.html");
  await fs.writeFile(entryPath, html);
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

  process.stdout.write(`${JSON.stringify({ ok: true, entry: entryPath }, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
