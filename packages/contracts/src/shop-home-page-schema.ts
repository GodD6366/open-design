import { getShopHomePageTonePresets } from './prompts/shop-home-page-tones.js';

type ShopHomePageJsonObject = Record<string, unknown>;

export type ShopHomePageNormalizeOptions = {
  skipSeedImagePrompts?: boolean;
};

const MODULES = [
  'top_slider',
  'user_assets',
  'banner',
  'goods',
  'shop_info',
  'image_ad',
] as const;

const DEFAULT_MODULES = ['top_slider', 'user_assets', 'shop_info'];
const DEFAULT_ACTION_BUTTON_SELECTION = ['到店自取', '外卖点单'];
const REPEATABLE_MODULE_TYPES = new Set(['image_ad']);
const BRAND_PROMPT_MODULES = new Set(['top_slider', 'shop_info']);

const DEFAULT_DESIGN_CONTEXT = {
  theme: 'storefront_overlay',
  color_palette: {
    bg: '#F9F9F9',
    card_bg: '#FFFFFF',
    card_subtle: '#F3F4F6',
    text_primary: '#1F2937',
    text_secondary: '#6B7280',
    accent: '#C98C5A',
  },
  radius: '8px',
  shadow: '0 18px 48px rgba(94, 63, 37, 0.14)',
  spacing: 16,
  page_width: 375,
};

const GENERIC_STYLE_GUIDE = {
  version: '1.0',
  preset_id: 'auto',
  reference_images: [],
  analysis: {
    source_summary: '',
    icon_style: '',
    background_style: '',
    layout_style: '',
    tone_keywords: [],
  },
  generation_rules: {
    must: [],
    avoid: [],
  },
};

const BAKERY_STYLE_GUIDE_PRESET = {
  version: '1.0',
  preset_id: 'bakery-handdrawn-cream',
  reference_images: [],
  analysis: {
    source_summary:
      'Extracted from a bakery storefront template: warm cream paper background, hand-drawn black doodle lettering and icons, playful toast-orange / butter-yellow accents, and a poster-like storefront hierarchy.',
    icon_style:
      'Hand-drawn doodle icons and wordmarks, black marker-like strokes, slightly uneven outlines, playful and cute instead of corporate.',
    background_style:
      'Warm cream paper tone with clean white straight-edge blocks, very sparse orange/yellow accent marks, airy whitespace, and soft warm shadows.',
    layout_style:
      'Reference-sized poster hero first, then a floating member/action card, then clean supporting entry-card rows; preserve the source title scale, sparse text budget, information density, and whitespace rhythm while still following the confirmed layout mode.',
    tone_keywords: ['bakery', 'hand-drawn', 'cream', 'playful', 'poster', 'warm'],
  },
  generation_rules: {
    must: [
      'Use warm cream paper-like backgrounds with mostly black typography, doodle accents, and straight-edge content blocks.',
      'Keep icons, arrows, crowns, and wordmarks sketchy and hand-drawn rather than polished UI glyphs.',
      'Preserve poster-like hierarchy using the reference image title scale, generous whitespace, sparse information density, and simple module stacking.',
      'Bakery product imagery may be photographic, but overlays should stay as sparse as the reference and only include doodle arrows, crowns, handwritten labels, or rough strokes when they do not raise the visual density.',
    ],
    avoid: [
      'no neon gradients or glossy mall-banner rendering',
      'no corporate flat illustration or generic ecommerce icon set',
      'no dense coupon walls or high-noise promotional clutter',
      'no cold tech-blue chrome or glassmorphism',
    ],
  },
  schema_defaults: {
    design_context: {
      theme: 'bakery_handdrawn_cream',
      color_palette: {
        bg: '#F8EFE1',
        card_bg: '#FFFFFF',
        card_subtle: '#F6EEDC',
        text_primary: '#171717',
        text_secondary: '#7D6E61',
        accent: '#E59A2E',
      },
      radius: '26px',
      shadow: '0 20px 52px rgba(128, 92, 47, 0.14)',
      spacing: 16,
      page_width: 375,
    },
    user_assets: {
      greeting: '欢迎回来',
      upgrade_tip: '用手绘感入口承接会员、自取、配送与扫码下单。',
      card_layout: {
        template_type: 2,
      },
    },
  },
};

const IMAGE_RATIO_MAP: Record<string, string> = {
  top_slider: '3:4',
  banner: '75:30',
  goods: '4:3',
  shop_info: '9:16',
  image_ad: '1:1',
};

const IMAGE_STRUCTURE_MAP: Record<string, string> = {
  top_slider: 'poster_hero',
  banner: 'landscape_entry_banner',
  goods: 'product_showcase',
  shop_info: 'vertical_shop_story',
  image_ad: 'reference_image_ad',
};

const IMAGE_PROMPT_TYPE_MAP: Record<string, string> = {
  top_slider: 'carousel_banner',
  banner: 'banner',
  goods: 'goods',
  shop_info: 'shop_info',
  image_ad: 'image_ad',
};

const MODULE_LABELS: Record<string, string> = {
  top_slider: '头图轮播',
  user_assets: '会员资产区',
  banner: '首页入口型 Banner',
  goods: '商品模块',
  shop_info: '门店信息',
  image_ad: '参考广告块',
};

const USER_ASSETS_DEFAULTS = {
  greeting: 'Hello',
  nickname: '小赞宝用户',
  bodyAlt: '客户资产功能区背景图',
};

const USER_ASSETS_TEMPLATE_TYPES = {
  SINGLE: 7,
  ONE_ROW_TWO: 1,
  LEFT_ONE_RIGHT_TWO: 2,
  ONE_ROW_THREE: 3,
  TWO_ROW_FIVE: 5,
  TWO_ROW_FOUR: 6,
  HOTZONE: 'hotzone',
} as const;

const USER_ASSETS_SLOT_SIZE_SPECS: Record<string, { width: number; height: number; ratio: string }> = {
  wide: { width: 611, height: 216, ratio: '611:216' },
  large: { width: 300, height: 456, ratio: '300:456' },
  medium: { width: 300, height: 220, ratio: '300:220' },
  small: { width: 196, height: 220, ratio: '196:220' },
  free: { width: 196, height: 220, ratio: '196:220' },
};

const USER_ASSETS_LAYOUT_SPECS: Record<string, { templateType: number; slots: ShopHomePageJsonObject[] }> = {
  7: {
    templateType: USER_ASSETS_TEMPLATE_TYPES.SINGLE,
    slots: [{ id: 'single', role: 'main_action', size: 'wide', position: 'single' }],
  },
  1: {
    templateType: USER_ASSETS_TEMPLATE_TYPES.ONE_ROW_TWO,
    slots: [
      { id: 'left', role: 'sub_action', size: 'medium', position: 'left' },
      { id: 'right', role: 'sub_action', size: 'medium', position: 'right' },
    ],
  },
  3: {
    templateType: USER_ASSETS_TEMPLATE_TYPES.ONE_ROW_THREE,
    slots: [
      { id: 'left_1', role: 'sub_action', size: 'small', position: 'left_1' },
      { id: 'center_1', role: 'sub_action', size: 'small', position: 'center_1' },
      { id: 'right_1', role: 'sub_action', size: 'small', position: 'right_1' },
    ],
  },
  2: {
    templateType: USER_ASSETS_TEMPLATE_TYPES.LEFT_ONE_RIGHT_TWO,
    slots: [
      { id: 'left_large', role: 'main_action', size: 'large', position: 'left_large' },
      { id: 'right_top', role: 'sub_action', size: 'medium', position: 'right_top' },
      { id: 'right_bottom', role: 'sub_action', size: 'medium', position: 'right_bottom' },
    ],
  },
  6: {
    templateType: USER_ASSETS_TEMPLATE_TYPES.TWO_ROW_FOUR,
    slots: [
      { id: 'top_left', role: 'sub_action', size: 'medium', position: 'top_left' },
      { id: 'top_right', role: 'sub_action', size: 'medium', position: 'top_right' },
      { id: 'bottom_left', role: 'sub_action', size: 'medium', position: 'bottom_left' },
      { id: 'bottom_right', role: 'sub_action', size: 'medium', position: 'bottom_right' },
    ],
  },
  5: {
    templateType: USER_ASSETS_TEMPLATE_TYPES.TWO_ROW_FIVE,
    slots: [
      { id: 'top_left', role: 'sub_action', size: 'medium', position: 'top_left' },
      { id: 'top_right', role: 'sub_action', size: 'medium', position: 'top_right' },
      { id: 'bottom_left', role: 'sub_action', size: 'small', position: 'bottom_left' },
      { id: 'bottom_center', role: 'sub_action', size: 'small', position: 'bottom_center' },
      { id: 'bottom_right', role: 'sub_action', size: 'small', position: 'bottom_right' },
    ],
  },
};

const USER_ASSETS_VISIBLE_REFERENCE_RE =
  /(user_assets|客户资产|入口卡|入口区|功能入口|入口按钮|按钮区|三列入口|三宫格|欢迎卡|会员卡|会员总卡|会员\/欢迎卡|entry[- ]?cards?|customer[- ]?assets?|member\/action card|action card|supporting entry)/i;

function stringOr(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function isGenericShopBrandPlaceholder(value: unknown) {
  const normalized = stringOr(value).replace(/\s+/g, '').toLowerCase();
  return [
    '店铺品牌',
    '店铺名称',
    '店铺名',
    '门店品牌',
    '品牌名称',
    '品牌名',
    'shopbrand',
    'storebrand',
    'brandname',
  ].includes(normalized);
}

function isGenericCategoryPlaceholder(value: unknown) {
  const normalized = stringOr(value).replace(/\s+/g, '').toLowerCase();
  return ['retail', 'store', 'shop', 'general', 'homepage'].includes(normalized);
}

function stringOrSpecific(value: unknown, fallback: unknown, isPlaceholder: (value: unknown) => boolean) {
  const current = stringOr(value);
  const fallbackValue = stringOr(fallback);
  if (!current) return fallbackValue;
  if (fallbackValue && current !== fallbackValue && isPlaceholder(current)) return fallbackValue;
  return current;
}

function isPlainObject(value: unknown): value is ShopHomePageJsonObject {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function asObject(value: unknown): ShopHomePageJsonObject {
  return isPlainObject(value) ? value : {};
}

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function toNumber(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function toPositiveInteger(value: unknown, fallback: number) {
  return Number.isInteger(value) && Number(value) > 0 ? Number(value) : fallback;
}

function uniqueStrings(values: unknown[]) {
  return [...new Set(values.filter((value): value is string => typeof value === 'string'))];
}

function sanitizeHexColor(value: unknown, fallback: string) {
  return /^#[0-9a-f]{6}$/i.test(stringOr(value)) ? stringOr(value) : fallback;
}

function normalizeReferenceImages(values: unknown) {
  return uniqueStrings(
    Array.isArray(values)
      ? values
          .filter((value): value is string => typeof value === 'string')
          .map((value) => value.trim())
          .filter((value) => value.length > 0 && !/^(https?:|data:|blob:)/i.test(value))
      : [],
  );
}

function sharedStyleGuideReferenceImages(styleGuide: ShopHomePageJsonObject) {
  return normalizeReferenceImages(Array.isArray(styleGuide.reference_images) ? styleGuide.reference_images : []);
}

function isLegacyScopedReferenceImage(value: string) {
  const fileName = value.split('/').pop() ?? value;
  return (
    /^top-slider-ref-hero\.png$/i.test(fileName) ||
    /^user-assets-ref-strip\.png$/i.test(fileName) ||
    /^user-assets-ref-entry-\d+\.png$/i.test(fileName)
  );
}

function normalizeLegacyScopedReferenceImages(value: unknown, styleGuide: ShopHomePageJsonObject) {
  const refs = normalizeReferenceImages(value);
  if (refs.length === 0) return refs;
  if (refs.every((ref) => isLegacyScopedReferenceImage(ref))) {
    return sharedStyleGuideReferenceImages(styleGuide);
  }
  return refs;
}

function normalizeAspectRatioHint(value: unknown, fallback = '1:1') {
  return typeof value === 'string' && /^\d+:\d+$/.test(value.trim()) ? value.trim() : fallback;
}

function normalizeActionButtons(value: unknown) {
  const input = asObject(value);
  const selected = uniqueStrings(
    Array.isArray(input.selected)
      ? input.selected.map((item) => stringOr(item)).filter(Boolean)
      : Array.isArray(value)
        ? value.map((item) => stringOr(item)).filter(Boolean)
        : [],
  );
  const custom =
    typeof input.custom === 'string'
      ? input.custom.trim()
      : typeof value === 'string'
        ? value.trim()
        : '';

  if (!selected.length && !custom) {
    return {
      selected: [...DEFAULT_ACTION_BUTTON_SELECTION],
      custom: '',
    };
  }

  return { selected, custom };
}

function hasLegacyRequirementsFields(input: ShopHomePageJsonObject) {
  return Boolean(
    stringOr(input.shop_name) ||
      stringOr(input.brand_name) ||
      stringOr(input.industry) ||
      stringOr(input.homepage_goal) ||
      stringOr(input.product_focus) ||
      isPlainObject(input.visual) ||
      isPlainObject(input.action_buttons) ||
      Array.isArray(input.modules) ||
      input.module_specs !== undefined ||
      isPlainObject(input.module_content),
  );
}

function normalizeStyleAvoid(value: unknown) {
  return Array.isArray(value) ? value.filter((item) => typeof item === 'string') : [];
}

function resolveLegacyThemeValue(
  key: string,
  input: ShopHomePageJsonObject,
  source: ShopHomePageJsonObject,
  fallback = '',
) {
  const inputTheme = asObject(input.theme);
  const sourceTheme = asObject(source.theme);
  const inputDesignContext = asObject(input.design_context);
  const sourceDesignContext = asObject(source.design_context);
  const inputColors = asObject(inputDesignContext.color_palette);
  const sourceColors = asObject(sourceDesignContext.color_palette);
  return stringOr(
    inputTheme[key],
    stringOr(sourceTheme[key], stringOr(inputColors[key], stringOr(sourceColors[key], fallback))),
  );
}

function splitActionButtonsCustom(value: unknown) {
  if (typeof value !== 'string' || !value.trim()) return [];
  return uniqueStrings(value.split(/[、/,，\n]+/g).map((item) => item.trim()).filter(Boolean));
}

function resolveActionButtonLabels(requirements: ShopHomePageJsonObject) {
  const actionButtons = normalizeActionButtons(requirements.action_buttons);
  const labels = uniqueStrings([
    ...actionButtons.selected,
    ...splitActionButtonsCustom(actionButtons.custom),
  ]);
  return labels.length > 0 ? labels : [...DEFAULT_ACTION_BUTTON_SELECTION];
}

function isHomepageModuleType(value: unknown) {
  return typeof value === 'string' && MODULES.includes(value as (typeof MODULES)[number]);
}

function normalizeHomepageModuleSpecs(value: unknown) {
  if (value === undefined) return null;
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error('moduleSpecs 必须是非空数组。');
  }

  const seen = new Set<string>();
  return value.map((rawSpec, index) => {
    const spec = asObject(rawSpec);
    const type = stringOr(spec.type);
    if (!isHomepageModuleType(type)) {
      throw new Error(`moduleSpecs[${index}].type 不合法。`);
    }
    if (!REPEATABLE_MODULE_TYPES.has(type) && seen.has(type)) {
      throw new Error(`moduleSpecs 不允许重复模块: ${type}`);
    }
    seen.add(type);
    return {
      type,
      content: stringOr(spec.content),
      itemCount: Number.isInteger(spec.itemCount) && Number(spec.itemCount) > 0 ? Number(spec.itemCount) : undefined,
      aspectRatio: type === 'image_ad' ? normalizeAspectRatioHint(spec.aspectRatio, IMAGE_RATIO_MAP.image_ad) : undefined,
    };
  });
}

function deriveModuleContentFromSpecs(specs: Array<ShopHomePageJsonObject>) {
  const out: Record<string, string> = {};
  for (const spec of specs) {
    const type = stringOr(spec.type);
    if (!type || type in out) continue;
    out[type] = stringOr(spec.content);
  }
  return out;
}

function moduleSpecsFor(requirements: ShopHomePageJsonObject) {
  const specs = normalizeHomepageModuleSpecs(requirements.module_specs);
  if (specs && specs.length > 0) return specs;

  const modules = Array.isArray(requirements.modules) ? requirements.modules : DEFAULT_MODULES;
  const moduleContent = asObject(requirements.module_content);
  return modules
    .filter((moduleType) => isHomepageModuleType(moduleType))
    .map((moduleType) => {
      const spec: ShopHomePageJsonObject = {
        type: moduleType,
        content: stringOr(moduleContent[moduleType]),
      };
      if (moduleType === 'top_slider') {
        spec.itemCount = toPositiveInteger(asObject(requirements.counts).sliderCount, 2);
      } else if (moduleType === 'goods') {
        spec.itemCount = toPositiveInteger(asObject(requirements.counts).goodsCount, 3);
      } else if (moduleType === 'image_ad') {
        spec.aspectRatio = normalizeAspectRatioHint(moduleContent.image_ad, '1:1');
      }
      return spec;
    });
}

function moduleSpecForType(requirements: ShopHomePageJsonObject, moduleType: string, occurrenceIndex = 0) {
  const specs = moduleSpecsFor(requirements).filter((spec) => spec.type === moduleType);
  return specs[occurrenceIndex] ?? null;
}

function coerceRequirements(raw: unknown, sourceInput: unknown = null): ShopHomePageJsonObject {
  const input = asObject(raw);
  const source = asObject(sourceInput);
  if (isPlainObject(input.style) || hasLegacyRequirementsFields(input) || isPlainObject(source.page)) {
    const specs = moduleSpecsFor(input);
    const style = asObject(input.style);
    const visual = asObject(input.visual);
    const page = asObject(source.page);
    const counts = asObject(input.counts);
    const primaryColor = stringOr(
      style.primary_color,
      stringOr(
        visual.accent_override,
        stringOr(
          resolveLegacyThemeValue('primary_color', input, source),
          stringOr(resolveLegacyThemeValue('accent_color', input, source), resolveLegacyThemeValue('accent', input, source)),
        ),
      ),
    );
    return {
      status: input.status === 'confirmed' ? 'confirmed' : 'needs_confirmation',
      source_prompt: stringOr(input.source_prompt, stringOr(input.homepage_goal, stringOr(page.goal, '店铺首页'))),
      module_specs: specs,
      modules: specs.map((spec) => spec.type),
      module_content: deriveModuleContentFromSpecs(specs),
      style: {
        industry: stringOr(style.industry, stringOr(input.industry, stringOr(page.industry))),
        brand_name: stringOr(
          style.brand_name,
          stringOr(input.shop_name, stringOr(input.brand_name, stringOr(page.brand_name, stringOr(page.title)))),
        ),
        primary_color: primaryColor,
        tone: stringOr(style.tone, stringOr(visual.brand_notes, stringOr(input.homepage_goal, stringOr(page.goal)))),
        visual_source: stringOr(style.visual_source, stringOr(visual.brand_reference_mode)),
        tone_palette: stringOr(style.tone_palette, stringOr(visual.tone_palette)),
        avoid: normalizeStyleAvoid(style.avoid).length > 0 ? normalizeStyleAvoid(style.avoid) : normalizeStyleAvoid(input.avoid),
      },
      brand_logo: stringOr(input.brand_logo, stringOr(page.brand_logo)),
      action_buttons: normalizeActionButtons(input.action_buttons),
      other_requirements: stringOr(input.other_requirements),
      extended_answers: Array.isArray(input.extended_answers)
        ? input.extended_answers
            .filter(isPlainObject)
            .map((item) => ({
              id: stringOr(item.id),
              label: stringOr(item.label),
              type: stringOr(item.type),
              answer: Array.isArray(item.answer)
                ? item.answer.filter((value) => typeof value === 'string')
                : stringOr(item.answer),
            }))
            .filter((item) => item.id && item.label && item.type)
        : [],
      counts: {
        sliderCount: getRequestedItemCount(specs, 'top_slider', toPositiveInteger(counts.sliderCount, 1)),
        goodsCount: getRequestedItemCount(specs, 'goods', toPositiveInteger(counts.goodsCount, 2)),
      },
      confirmation_questions: Array.isArray(input.confirmation_questions)
        ? input.confirmation_questions.filter((item) => typeof item === 'string')
        : undefined,
    };
  }
  return {
    status: 'needs_confirmation',
    source_prompt: '店铺首页',
    module_specs: [],
    modules: DEFAULT_MODULES,
    module_content: {},
    style: { industry: '', brand_name: '', primary_color: '', tone: '', avoid: [] },
    brand_logo: '',
    action_buttons: { selected: [...DEFAULT_ACTION_BUTTON_SELECTION], custom: '' },
    other_requirements: '',
    extended_answers: [],
    counts: { sliderCount: 1, goodsCount: 2 },
  };
}

function getRequestedItemCount(specs: Array<ShopHomePageJsonObject> | null, type: string, fallback: number) {
  const match = specs?.find((spec) => spec.type === type && typeof spec.itemCount === 'number');
  return typeof match?.itemCount === 'number' ? match.itemCount : fallback;
}

function toneStyleGuidePreset(id: string) {
  if (id === 'bakery-handdrawn-cream') return deepClone(BAKERY_STYLE_GUIDE_PRESET);
  const preset = getShopHomePageTonePresets().find((item) => item.id === id);
  if (!preset) return null;
  return {
    version: '1.0',
    preset_id: preset.id,
    reference_images: [],
    analysis: {
      source_summary: stringOr(preset.analysis?.sourceSummary),
      icon_style: stringOr(preset.analysis?.iconStyle),
      background_style: stringOr(preset.analysis?.backgroundStyle),
      layout_style: stringOr(preset.analysis?.layoutStyle),
      tone_keywords: Array.isArray(preset.toneKeywords)
        ? preset.toneKeywords.filter((value) => typeof value === 'string')
        : [],
    },
    generation_rules: {
      must: Array.isArray(preset.generationRules?.must)
        ? preset.generationRules.must.filter((value) => typeof value === 'string')
        : [],
      avoid: Array.isArray(preset.generationRules?.avoid)
        ? preset.generationRules.avoid.filter((value) => typeof value === 'string')
        : [],
    },
    schema_defaults: {
      design_context: {
        theme: stringOr(preset.theme, preset.id.replace(/-/g, '_')),
        color_palette: {
          bg: stringOr(preset.palette?.bg, DEFAULT_DESIGN_CONTEXT.color_palette.bg),
          card_bg: stringOr(preset.palette?.cardBg, DEFAULT_DESIGN_CONTEXT.color_palette.card_bg),
          card_subtle: stringOr(preset.palette?.cardSubtle, DEFAULT_DESIGN_CONTEXT.color_palette.card_subtle),
          text_primary: stringOr(preset.palette?.textPrimary, DEFAULT_DESIGN_CONTEXT.color_palette.text_primary),
          text_secondary: stringOr(preset.palette?.textSecondary, DEFAULT_DESIGN_CONTEXT.color_palette.text_secondary),
          accent: stringOr(preset.palette?.accent, DEFAULT_DESIGN_CONTEXT.color_palette.accent),
        },
        radius: stringOr(preset.radius, DEFAULT_DESIGN_CONTEXT.radius),
        shadow: stringOr(preset.shadow, DEFAULT_DESIGN_CONTEXT.shadow),
        spacing: DEFAULT_DESIGN_CONTEXT.spacing,
        page_width: 375,
      },
    },
  };
}

function resolveStylePresetId(rawPresetId: string, rawStyleGuide: ShopHomePageJsonObject, requirements: ShopHomePageJsonObject) {
  if (rawPresetId && rawPresetId !== 'auto' && toneStyleGuidePreset(rawPresetId)) return rawPresetId;
  const visualSource = stringOr(asObject(requirements.style).visual_source);
  const tonePalette = stringOr(asObject(requirements.style).tone_palette);
  const tonePresetId = tonePalette || visualSource;
  if (tonePresetId && toneStyleGuidePreset(tonePresetId)) return tonePresetId;
  const text = [
    stringOr(asObject(requirements.style).industry),
    stringOr(asObject(requirements.style).tone),
    stringOr(requirements.source_prompt),
    stringOr(asObject(rawStyleGuide.analysis).source_summary),
    stringOr(asObject(rawStyleGuide.analysis).icon_style),
    stringOr(asObject(rawStyleGuide.analysis).background_style),
    stringOr(asObject(rawStyleGuide.analysis).layout_style),
    ...moduleSpecsFor(requirements).map((spec) => stringOr(spec.content)),
  ].join(' ').toLowerCase();
  if (/bread|pastry|dessert|cake|bake|烘焙|面包|蛋糕|甜品|甜点|烤/.test(text)) {
    const warmCream = toneStyleGuidePreset('tone-warm-cream');
    if (warmCream) return 'tone-warm-cream';
  }
  return rawPresetId === 'auto' ? 'auto' : '';
}

export function coerceShopHomePageStyleGuide(raw: unknown, requirementsInput: unknown = null) {
  const requirements = coerceRequirements(requirementsInput);
  const fallback: ShopHomePageJsonObject = deepClone(GENERIC_STYLE_GUIDE);
  const input = asObject(raw);
  const rawPresetId = stringOr(input.preset_id, stringOr(fallback.preset_id));
  const presetId = resolveStylePresetId(rawPresetId, input, requirements);
  const preset = presetId && presetId !== 'auto' ? toneStyleGuidePreset(presetId) : null;
  const base = preset ?? fallback;
  const baseAnalysis = asObject(base.analysis);
  const baseGenerationRules = asObject(base.generation_rules);
  const analysis = asObject(input.analysis);
  const generationRules = asObject(input.generation_rules);
  return {
    version: stringOr(input.version, stringOr(base.version)),
    preset_id: presetId || 'auto',
    reference_images: normalizeReferenceImages(
      Array.isArray(input.reference_images) ? input.reference_images : base.reference_images,
    ),
    analysis: {
      source_summary: stringOr(analysis.source_summary, stringOr(baseAnalysis.source_summary)),
      icon_style: stringOr(analysis.icon_style, stringOr(baseAnalysis.icon_style)),
      background_style: stringOr(analysis.background_style, stringOr(baseAnalysis.background_style)),
      layout_style: stringOr(analysis.layout_style, stringOr(baseAnalysis.layout_style)),
      tone_keywords: uniqueStrings(
        Array.isArray(analysis.tone_keywords)
          ? analysis.tone_keywords.filter((value) => typeof value === 'string')
          : Array.isArray(baseAnalysis.tone_keywords) ? baseAnalysis.tone_keywords : [],
      ),
    },
    generation_rules: {
      must: uniqueStrings(
        Array.isArray(generationRules.must)
          ? generationRules.must.filter((value) => typeof value === 'string')
          : Array.isArray(baseGenerationRules.must) ? baseGenerationRules.must : [],
      ),
      avoid: uniqueStrings(
        Array.isArray(generationRules.avoid)
          ? generationRules.avoid.filter((value) => typeof value === 'string')
          : Array.isArray(baseGenerationRules.avoid) ? baseGenerationRules.avoid : [],
      ),
    },
    schema_defaults: isPlainObject(base.schema_defaults) ? deepClone(base.schema_defaults) : undefined,
  };
}

function buildThemeLabel(requirements: ShopHomePageJsonObject) {
  const tone = stringOr(asObject(requirements.style).tone, 'storefront');
  const industry = stringOr(asObject(requirements.style).industry, 'homepage');
  return `${industry}_${tone}`.replace(/\s+/g, '_').toLowerCase();
}

function resolveDesignContextBase(styleGuide: ShopHomePageJsonObject, requirements: ShopHomePageJsonObject) {
  const presetContext = asObject(asObject(styleGuide.schema_defaults).design_context);
  return {
    ...DEFAULT_DESIGN_CONTEXT,
    ...presetContext,
    theme: stringOr(presetContext.theme, buildThemeLabel(requirements)),
    color_palette: {
      ...DEFAULT_DESIGN_CONTEXT.color_palette,
      ...(isPlainObject(presetContext.color_palette) ? presetContext.color_palette : {}),
    },
    page_width: 375,
  };
}

function normalizeDesignContext(value: unknown, accent: string, requirements: ShopHomePageJsonObject, styleGuide: ShopHomePageJsonObject) {
  const base = resolveDesignContextBase(styleGuide, requirements);
  const source = asObject(value);
  const colors = asObject(source.color_palette);
  return {
    theme: stringOr(source.theme, stringOr(base.theme, DEFAULT_DESIGN_CONTEXT.theme)),
    color_palette: {
      bg: stringOr(colors.bg, stringOr(base.color_palette.bg, DEFAULT_DESIGN_CONTEXT.color_palette.bg)),
      card_bg: stringOr(colors.card_bg, stringOr(base.color_palette.card_bg, DEFAULT_DESIGN_CONTEXT.color_palette.card_bg)),
      card_subtle: stringOr(colors.card_subtle, stringOr(base.color_palette.card_subtle, DEFAULT_DESIGN_CONTEXT.color_palette.card_subtle)),
      text_primary: stringOr(colors.text_primary, stringOr(base.color_palette.text_primary, DEFAULT_DESIGN_CONTEXT.color_palette.text_primary)),
      text_secondary: stringOr(colors.text_secondary, stringOr(base.color_palette.text_secondary, DEFAULT_DESIGN_CONTEXT.color_palette.text_secondary)),
      accent,
    },
    radius: stringOr(source.radius, stringOr(base.radius, DEFAULT_DESIGN_CONTEXT.radius)),
    shadow: stringOr(source.shadow, stringOr(base.shadow, DEFAULT_DESIGN_CONTEXT.shadow)),
    spacing: toNumber(source.spacing, toNumber(base.spacing, DEFAULT_DESIGN_CONTEXT.spacing)),
    page_width: 375,
  };
}

function normalizeDesignContextInput(source: ShopHomePageJsonObject) {
  const designContext = asObject(source.design_context);
  const theme = asObject(source.theme);
  if (Object.keys(theme).length === 0) return designContext;
  const colors = asObject(designContext.color_palette);
  const colorPalette = {
    ...colors,
  };
  const bg = stringOr(colors.bg, stringOr(theme.background, stringOr(theme.bg)));
  const cardBg = stringOr(colors.card_bg, stringOr(theme.card_bg));
  const cardSubtle = stringOr(colors.card_subtle, stringOr(theme.card_subtle));
  const textPrimary = stringOr(colors.text_primary, stringOr(theme.text_primary));
  const textSecondary = stringOr(colors.text_secondary, stringOr(theme.text_secondary));
  const accent = stringOr(colors.accent, stringOr(theme.accent, stringOr(theme.accent_color, stringOr(theme.primary_color))));
  if (bg) colorPalette.bg = bg;
  if (cardBg) colorPalette.card_bg = cardBg;
  if (cardSubtle) colorPalette.card_subtle = cardSubtle;
  if (textPrimary) colorPalette.text_primary = textPrimary;
  if (textSecondary) colorPalette.text_secondary = textSecondary;
  if (accent) colorPalette.accent = accent;
  return {
    ...designContext,
    theme: stringOr(designContext.theme, stringOr(theme.tone_palette, stringOr(theme.tone, stringOr(theme.theme)))),
    color_palette: colorPalette,
  };
}

function normalizeLayout(value: unknown) {
  const input = asObject(value);
  return {
    offsetY: toNumber(input.offsetY, 0),
    zIndex: toNumber(input.zIndex, 1),
    paddingX: toNumber(input.paddingX, 0),
    paddingTop: toNumber(input.paddingTop, 0),
    paddingBottom: toNumber(input.paddingBottom, 0),
  };
}

function normalizeEditable(value: unknown) {
  const input = asObject(value);
  const out: Record<string, boolean> = {};
  for (const [key, flag] of Object.entries(input)) {
    if (typeof flag === 'boolean') out[key] = flag;
  }
  return Object.keys(out).length > 0 ? out : { data: true, layout: true, variant: true };
}

function modulePolicyConstraints(moduleType: string) {
  if (moduleType === 'banner') {
    return {
      no_logo: true,
      no_brand_mark: true,
      no_shop_slogan: true,
      no_price_text: true,
      no_coupon_wall: true,
      no_complex_cta: true,
      lightweight_copy: true,
      visually_distinct_from_goods: true,
      prefer_graphic_blocks: true,
      no_product_showcase_background: true,
    };
  }
  if (moduleType === 'goods') {
    return {
      no_logo: true,
      no_brand_mark: true,
      no_shop_slogan: true,
    };
  }
  if (moduleType === 'image_ad') {
    return {
      no_logo: true,
      keep_reference_composition: true,
    };
  }
  return {};
}

const REMOVED_DENSITY_CONSTRAINT_KEYS = [
  'low_visual_density',
  'single_focal_subject',
  'minimal_visible_text',
  'no_infographic',
  'no_collage',
  'no_step_by_step',
  'no_story_paragraphs',
  'no_process_grid',
  'no_business_hours_list',
  'max_visual_subjects',
  'max_visible_text_blocks',
  'no_blackboard_menu',
  'no_menu_board',
  'no_service_list',
  'no_lower_module_content',
  'no_price_text',
  'no_purchase_button',
  'cta_semantic_only',
  'no_sku_grid',
  'no_timeline',
  'no_promise_grid',
  'no_icon_grid',
  'no_map_card',
  'no_contact_list',
  'no_business_hours_card',
] as const;

function removeRemovedDensityConstraints(value: ShopHomePageJsonObject) {
  const next = { ...value };
  for (const key of REMOVED_DENSITY_CONSTRAINT_KEYS) {
    delete next[key];
  }
  return next;
}

function imagePromptAllowsBrand(moduleType: string) {
  return BRAND_PROMPT_MODULES.has(moduleType);
}

function shouldSkipSeedImagePrompts(options?: ShopHomePageNormalizeOptions | null) {
  return options?.skipSeedImagePrompts === true;
}

function normalizeImageModuleMode(mode: unknown, type: string, items: unknown) {
  if (mode === 'carousel_poster' || mode === 'dual_carousel' || mode === 'horizontal_scroll') return mode;
  if (type === 'top_slider' && Array.isArray(items) && items.length > 1) return 'carousel_poster';
  return 'single';
}

function defaultHeightForModule(moduleType: string) {
  switch (moduleType) {
    case 'top_slider':
      return 500;
    case 'banner':
      return 200;
    case 'goods':
      return 260;
    case 'shop_info':
      return 540;
    default:
      return 188;
  }
}

function inferCategory(industry: unknown) {
  const normalized = stringOr(industry).toLowerCase();
  if (normalized.includes('咖啡')) return 'coffee';
  if (normalized.includes('烘焙') || normalized.includes('甜')) return 'dessert';
  if (normalized.includes('餐') || normalized.includes('茶') || normalized.includes('饮')) return 'food';
  return 'retail';
}

function resolvePromptStyleTone(requirements: ShopHomePageJsonObject, styleGuide: ShopHomePageJsonObject) {
  const explicitTone = stringOr(asObject(requirements.style).tone);
  if (explicitTone) return explicitTone;
  const toneKeywords = asObject(styleGuide.analysis).tone_keywords;
  const toneKeyword = Array.isArray(toneKeywords)
    ? toneKeywords.find((value): value is string => typeof value === 'string' && value.trim().length > 0)
    : '';
  return stringOr(toneKeyword, 'storefront');
}

function moduleScopedReferenceImages(styleGuide: ShopHomePageJsonObject) {
  return normalizeReferenceImages(styleGuide.reference_images);
}

function styleGuideIndicatesVisibleUserAssets(styleGuide: ShopHomePageJsonObject) {
  const analysis = asObject(styleGuide.analysis);
  const generationRules = asObject(styleGuide.generation_rules);
  const text = [
    stringOr(analysis.source_summary),
    stringOr(analysis.icon_style),
    stringOr(analysis.background_style),
    stringOr(analysis.layout_style),
    ...(Array.isArray(generationRules.must) ? generationRules.must : []),
    ...(Array.isArray(generationRules.avoid) ? generationRules.avoid : []),
  ].filter(Boolean).join(' ');
  return USER_ASSETS_VISIBLE_REFERENCE_RE.test(text);
}

function defaultReferenceImagesForModule(moduleType: string, styleGuide: ShopHomePageJsonObject) {
  const refs = moduleScopedReferenceImages(styleGuide);
  if (refs.length === 0) return refs;
  if (moduleType === 'top_slider' || moduleType === 'image_ad') return refs;
  if (moduleType === 'user_assets' && styleGuideIndicatesVisibleUserAssets(styleGuide)) return refs;
  return [];
}

function createDefaultImagePromptSchema(
  spec: ShopHomePageJsonObject,
  requirements: ShopHomePageJsonObject,
  designContext: ShopHomePageJsonObject,
  styleGuide: ShopHomePageJsonObject,
  index = 0,
) {
  const moduleType = stringOr(spec.type);
  const brandName = stringOr(asObject(requirements.style).brand_name, '店铺品牌');
  const moduleContent = stringOr(spec.content, stringOr(asObject(requirements.module_content)[moduleType]));
  const colorPalette = asObject(designContext.color_palette);
  const accent = stringOr(colorPalette.accent, DEFAULT_DESIGN_CONTEXT.color_palette.accent);
  const backgroundColor =
    moduleType === 'goods'
      ? stringOr(colorPalette.card_subtle, DEFAULT_DESIGN_CONTEXT.color_palette.card_subtle)
      : stringOr(colorPalette.bg, DEFAULT_DESIGN_CONTEXT.color_palette.bg);
  const ratio = moduleType === 'image_ad'
    ? normalizeAspectRatioHint(spec.aspectRatio, IMAGE_RATIO_MAP.image_ad)
    : IMAGE_RATIO_MAP[moduleType];
  const itemLabel = index > 0 ? ` ${index + 1}` : '';
  const title =
    moduleType === 'top_slider'
      ? `${brandName}${itemLabel}`
      : moduleType === 'banner'
        ? '活动入口'
        : moduleType === 'goods'
          ? `主推商品${itemLabel}`
          : moduleType === 'image_ad'
            ? `参考广告块${itemLabel}`
            : '品牌故事';
  const subtitle =
    moduleType === 'top_slider'
      ? 'SPRING FEATURE'
      : moduleType === 'banner'
        ? 'DISCOVER'
        : moduleType === 'goods'
          ? 'LIMITED PICK'
          : moduleType === 'image_ad'
            ? 'REFERENCE BLOCK'
            : 'ABOUT THE BRAND';
  const styleTone = resolvePromptStyleTone(requirements, styleGuide);
  const promptSchema: ShopHomePageJsonObject = {
    type: IMAGE_PROMPT_TYPE_MAP[moduleType],
    version: '1.0',
    template: moduleType === 'banner' ? 'promotion' : moduleType === 'shop_info' ? 'brand' : moduleType === 'image_ad' ? 'promotion' : 'product',
    layout: {
      ratio,
      structure: IMAGE_STRUCTURE_MAP[moduleType],
      padding: 0,
      full_bleed: true,
    },
    style: {
      background_type:
        moduleType === 'banner'
          ? 'graphic_blocks'
          : moduleType === 'goods'
            ? 'solid'
            : 'gradient',
      background_color: backgroundColor,
      primary_color: accent,
      accent_color: accent,
      text_color: stringOr(colorPalette.text_primary, DEFAULT_DESIGN_CONTEXT.color_palette.text_primary),
      style_tone: styleTone,
      visual_feel: moduleType === 'banner' ? 'light_campaign_graphic' : 'realistic_ui',
    },
    product: {
      name: moduleType === 'goods' ? `商品 ${index + 1}` : moduleType === 'banner' ? '活动入口' : moduleType === 'image_ad' ? '参考广告块' : brandName,
      category: inferCategory(asObject(requirements.style).industry),
      visual_type: moduleType === 'banner' ? 'graphic' : 'photo',
      scene: moduleType === 'shop_info' ? 'composition' : moduleType === 'banner' ? 'landscape_entry' : moduleType === 'image_ad' ? 'composition' : 'single',
      elements: moduleContent ? [moduleContent] : [],
    },
    content: {
      title,
      subtitle,
      description: moduleContent || `${brandName} 店铺首页模块`,
      tags: moduleType === 'top_slider' || moduleType === 'shop_info' || moduleType === 'banner' ? [] : ['热卖'],
    },
    promotion: {
      price: moduleType === 'goods' ? '¥99 起' : '',
      original_price: '',
      discount: '',
      badge: '',
      cta: moduleType === 'goods' ? '立即购买' : '',
    },
    constraints: {
      no_border: true,
      no_divider: true,
      no_margin_lr: true,
      no_rounded_corners: true,
      no_padding: true,
      full_bleed: true,
      ui_only: true,
      ...(moduleType === 'top_slider'
        ? {}
        : moduleType === 'banner'
          ? { no_button_ui: true, no_tag_chips: true, no_dense_text: true }
          : moduleType === 'image_ad'
            ? {}
            : {}),
      ...modulePolicyConstraints(moduleType),
    },
  };
  if (imagePromptAllowsBrand(moduleType)) {
    promptSchema.brand = {
      name: brandName,
      slogan: stringOr(asObject(requirements.style).tone),
      logo_position: moduleType === 'shop_info' ? 'bottom' : 'corner',
    };
  }
  return promptSchema;
}

function normalizePromptSchema(type: string, inputValue: unknown, fallback: ShopHomePageJsonObject) {
  const input = asObject(inputValue);
  if (Object.keys(input).length > 0 && !isPlainObject(input.layout) && !isPlainObject(input.style) && !isPlainObject(input.content)) {
    return { ...fallback, raw_prompt_schema: deepClone(input) };
  }
  const layout = asObject(input.layout);
  const style = asObject(input.style);
  const product = asObject(input.product);
  const content = asObject(input.content);
  const promotion = asObject(input.promotion);
  const brand = asObject(input.brand);
  const constraints = removeRemovedDensityConstraints(asObject(input.constraints));
  const fallbackLayout = asObject(fallback.layout);
  const fallbackStyle = asObject(fallback.style);
  const fallbackProduct = asObject(fallback.product);
  const fallbackContent = asObject(fallback.content);
  const fallbackPromotion = asObject(fallback.promotion);
  const normalized: ShopHomePageJsonObject = {
    type: stringOr(input.type, stringOr(fallback.type)),
    version: stringOr(input.version, stringOr(fallback.version)),
    template: stringOr(input.template, stringOr(fallback.template)),
    layout: {
      ratio: stringOr(layout.ratio, stringOr(fallbackLayout.ratio)),
      structure: stringOr(layout.structure, stringOr(fallbackLayout.structure)),
      padding: toNumber(layout.padding, toNumber(fallbackLayout.padding, 0)),
      full_bleed: layout.full_bleed !== false,
    },
    style: {
      background_type: type === 'banner' ? fallbackStyle.background_type : stringOr(style.background_type, stringOr(fallbackStyle.background_type)),
      background_color: stringOr(style.background_color, stringOr(fallbackStyle.background_color)),
      primary_color: sanitizeHexColor(style.primary_color, stringOr(fallbackStyle.primary_color)),
      accent_color: sanitizeHexColor(style.accent_color, stringOr(fallbackStyle.accent_color)),
      text_color: sanitizeHexColor(style.text_color, stringOr(fallbackStyle.text_color)),
      style_tone: stringOr(style.style_tone, stringOr(fallbackStyle.style_tone)),
      visual_feel: type === 'banner' ? fallbackStyle.visual_feel : stringOr(style.visual_feel, stringOr(fallbackStyle.visual_feel)),
    },
    product: {
      name: stringOrSpecific(product.name, fallbackProduct.name, isGenericShopBrandPlaceholder),
      category: stringOrSpecific(product.category, fallbackProduct.category, isGenericCategoryPlaceholder),
      visual_type: type === 'banner' ? fallbackProduct.visual_type : stringOr(product.visual_type, stringOr(fallbackProduct.visual_type)),
      scene: type === 'banner' ? fallbackProduct.scene : stringOr(product.scene, stringOr(fallbackProduct.scene)),
      elements: Array.isArray(product.elements) ? product.elements.filter((value) => typeof value === 'string') : fallbackProduct.elements,
    },
    content: {
      title: stringOrSpecific(content.title, fallbackContent.title, isGenericShopBrandPlaceholder),
      subtitle: stringOr(content.subtitle, stringOr(fallbackContent.subtitle)),
      description: stringOr(content.description, stringOr(fallbackContent.description)),
      tags: type === 'banner' ? [] : Array.isArray(content.tags) ? content.tags.filter((value) => typeof value === 'string') : fallbackContent.tags,
    },
    promotion: type === 'banner'
      ? { price: '', original_price: '', discount: '', badge: '', cta: '' }
      : {
          price: stringOr(promotion.price, stringOr(fallbackPromotion.price)),
          original_price: stringOr(promotion.original_price, stringOr(fallbackPromotion.original_price)),
          discount: stringOr(promotion.discount, stringOr(fallbackPromotion.discount)),
          badge: stringOr(promotion.badge, stringOr(fallbackPromotion.badge)),
          cta: stringOr(promotion.cta, stringOr(fallbackPromotion.cta)),
        },
    constraints: {
      ...asObject(fallback.constraints),
      ...constraints,
      ...modulePolicyConstraints(type),
    },
  };
  if (imagePromptAllowsBrand(type)) {
    const fallbackBrand = asObject(fallback.brand);
    normalized.brand = {
      name: stringOrSpecific(brand.name, fallbackBrand.name, isGenericShopBrandPlaceholder),
      slogan: stringOr(brand.slogan, stringOr(fallbackBrand.slogan)),
      logo_position: stringOr(brand.logo_position, stringOr(fallbackBrand.logo_position)),
    };
  }
  return normalized;
}

function createSeedImageItem(spec: ShopHomePageJsonObject, index: number, requirements: ShopHomePageJsonObject, designContext: ShopHomePageJsonObject, styleGuide: ShopHomePageJsonObject, options?: ShopHomePageNormalizeOptions | null) {
  const moduleType = stringOr(spec.type);
  const promptSchema = createDefaultImagePromptSchema(spec, requirements, designContext, styleGuide, index);
  const content = asObject(promptSchema.content);
  const base: ShopHomePageJsonObject = {
    id: `${moduleType}_${index + 1}`,
    image: '',
    reference_images: defaultReferenceImagesForModule(moduleType, styleGuide),
    alt: stringOr(content.title, `${MODULE_LABELS[moduleType] ?? '首页模块'} ${index + 1}`),
    aspect_ratio: stringOr(asObject(promptSchema.layout).ratio, IMAGE_RATIO_MAP[moduleType]),
  };
  if (!shouldSkipSeedImagePrompts(options)) base.image_prompt_schema = promptSchema;
  if (moduleType === 'banner') {
    return { ...base, asset_type: 'png', entry_purpose: '首页入口' };
  }
  return base;
}

function normalizeImageItem(spec: ShopHomePageJsonObject, itemValue: unknown, index: number, requirements: ShopHomePageJsonObject, designContext: ShopHomePageJsonObject, styleGuide: ShopHomePageJsonObject, options?: ShopHomePageNormalizeOptions | null) {
  const item = asObject(itemValue);
  const type = stringOr(spec.type);
  const fallback = createSeedImageItem(spec, index, requirements, designContext, styleGuide, options);
  const normalized: ShopHomePageJsonObject = {
    id: stringOr(item.id, stringOr(fallback.id)),
    image: stringOr(item.image),
    reference_images: normalizeReferenceImages(
      Array.isArray(item.reference_images)
        ? normalizeLegacyScopedReferenceImages(item.reference_images, styleGuide)
        : fallback.reference_images,
    ),
    no_cache: item.no_cache === true,
    alt: stringOr(item.alt, stringOr(fallback.alt)),
    aspect_ratio: type === 'image_ad' ? normalizeAspectRatioHint(item.aspect_ratio, stringOr(fallback.aspect_ratio)) : stringOr(item.aspect_ratio, IMAGE_RATIO_MAP[type]),
  };
  const promptSchema = isPlainObject(item.image_prompt_schema)
    ? item.image_prompt_schema
    : isPlainObject(fallback.image_prompt_schema)
      ? fallback.image_prompt_schema
      : null;
  if (!shouldSkipSeedImagePrompts(options) && promptSchema && isPlainObject(fallback.image_prompt_schema)) {
    normalized.image_prompt_schema = normalizePromptSchema(type, promptSchema, fallback.image_prompt_schema);
  }
  if (type === 'banner') {
    normalized.asset_type = item.asset_type === 'gif' ? 'gif' : 'png';
    normalized.entry_purpose = stringOr(item.entry_purpose, '首页入口');
  }
  return normalized;
}

function normalizeImageModuleData(spec: ShopHomePageJsonObject, value: unknown, requirements: ShopHomePageJsonObject, designContext: ShopHomePageJsonObject, styleGuide: ShopHomePageJsonObject, options?: ShopHomePageNormalizeOptions | null) {
  const input = asObject(value);
  const type = stringOr(spec.type);
  const mode = normalizeImageModuleMode(input.mode, type, input.items);
  const itemSeedCount =
    type === 'top_slider'
      ? Number(spec.itemCount ?? asObject(requirements.counts).sliderCount ?? 1)
      : type === 'goods'
        ? Number(spec.itemCount ?? asObject(requirements.counts).goodsCount ?? 2)
        : 1;
  const items = Array.isArray(input.items)
    ? input.items.filter(isPlainObject).map((item, index) => normalizeImageItem(spec, item, index, requirements, designContext, styleGuide, options))
    : [];
  return {
    mode,
    height: toNumber(input.height, defaultHeightForModule(type)),
    items: items.length > 0
      ? items
      : Array.from({ length: Math.max(1, itemSeedCount) }, (_, index) => createSeedImageItem(spec, index, requirements, designContext, styleGuide, options)),
    ...(mode === 'carousel_poster' || mode === 'dual_carousel'
      ? { auto_play_ms: toPositiveInteger(input.auto_play_ms, type === 'top_slider' ? 3000 : 2600) }
      : typeof input.auto_play_ms === 'number' && Number.isFinite(input.auto_play_ms)
        ? { auto_play_ms: input.auto_play_ms }
        : {}),
  };
}

function normalizeUserAssetsTemplateType(value: unknown) {
  if (value === USER_ASSETS_TEMPLATE_TYPES.HOTZONE) return USER_ASSETS_TEMPLATE_TYPES.HOTZONE;
  const numeric = Number(value);
  return [1, 2, 3, 5, 6, 7].includes(numeric) ? numeric : null;
}

function cloneUserAssetsSlots(slots: ShopHomePageJsonObject[]) {
  return slots.map((slot) => ({ ...slot }));
}

function fixedUserAssetsLayoutSpec(templateType: unknown) {
  return USER_ASSETS_LAYOUT_SPECS[String(templateType)] ?? null;
}

function userAssetsCardLayoutSlots(layout: unknown) {
  return Array.isArray(asObject(layout).slots) ? (asObject(layout).slots as unknown[]).filter(isPlainObject) : [];
}

function createHotzoneSlots(count: number) {
  return Array.from({ length: Math.max(1, count) }, (_, index) => {
    const id = `slot_${index + 1}`;
    return { id, role: 'sub_action', size: 'free', position: id };
  });
}

function inferUserAssetsTemplateType(requirements: ShopHomePageJsonObject, value: ShopHomePageJsonObject, presetTemplateType: unknown = null) {
  const direct = normalizeUserAssetsTemplateType(asObject(value.card_layout).template_type ?? asObject(value.layout).template_type);
  if (direct !== null) return direct;
  const preferred = normalizeUserAssetsTemplateType(presetTemplateType);
  if (preferred !== null) return preferred;
  const count = resolveUserAssetsEntryCount(requirements, value);
  const hintText = [
    stringOr(requirements.source_prompt),
    stringOr(asObject(requirements.module_content).user_assets),
    stringOr(requirements.other_requirements),
    stringOr(asObject(requirements.action_buttons).custom),
  ].join(' ');
  if (count > 5 || /热区|自由布局|自由排布|自由发挥|freeform|hot ?zone/i.test(hintText)) return USER_ASSETS_TEMPLATE_TYPES.HOTZONE;
  if (count <= 1) return USER_ASSETS_TEMPLATE_TYPES.SINGLE;
  if (count === 2) return USER_ASSETS_TEMPLATE_TYPES.ONE_ROW_TWO;
  if (count === 3) return /左一右二|一大两小|主次入口|主入口|大卡|左右主次|1大2小/i.test(hintText)
    ? USER_ASSETS_TEMPLATE_TYPES.LEFT_ONE_RIGHT_TWO
    : USER_ASSETS_TEMPLATE_TYPES.ONE_ROW_THREE;
  if (count === 4) return USER_ASSETS_TEMPLATE_TYPES.TWO_ROW_FOUR;
  if (count === 5) return USER_ASSETS_TEMPLATE_TYPES.TWO_ROW_FIVE;
  return USER_ASSETS_TEMPLATE_TYPES.HOTZONE;
}

function resolveUserAssetsEntryCount(requirements: ShopHomePageJsonObject, value: ShopHomePageJsonObject) {
  const labels = resolveActionButtonLabels(requirements);
  const entryCount = Array.isArray(value.entries) ? value.entries.filter(isPlainObject).length : 0;
  const layoutCount = userAssetsCardLayoutSlots(value.card_layout).length || userAssetsCardLayoutSlots(value.layout).length;
  return Math.max(labels.length, entryCount, layoutCount, 1);
}

function createUserAssetsCardLayout(templateType: unknown, count: number) {
  if (templateType === USER_ASSETS_TEMPLATE_TYPES.HOTZONE) {
    return { template_type: USER_ASSETS_TEMPLATE_TYPES.HOTZONE, slots: createHotzoneSlots(count) };
  }
  const spec = fixedUserAssetsLayoutSpec(templateType);
  return {
    template_type: templateType,
    slots: spec ? cloneUserAssetsSlots(spec.slots) : createHotzoneSlots(count),
  };
}

function normalizeUserAssetsCardLayout(value: ShopHomePageJsonObject, requirements: ShopHomePageJsonObject, preferredTemplateType: unknown = null) {
  const templateType = inferUserAssetsTemplateType(requirements, value, preferredTemplateType);
  const count = resolveUserAssetsEntryCount(requirements, value);
  return createUserAssetsCardLayout(templateType, count);
}

function createUserAssetsSubtitle(title: unknown, index: number) {
  const normalized = String(title ?? '').trim();
  if (/^[A-Za-z0-9 _-]+$/.test(normalized) && normalized) return normalized.toUpperCase();
  return `入口 ${index + 1}`;
}

function sanitizeUserAssetsEntryDescription(
  value: unknown,
  fallbackContent: ShopHomePageJsonObject,
  fallbackEntry: ShopHomePageJsonObject,
) {
  const raw = stringOr(value);
  const subtitle = stringOr(fallbackContent.subtitle, stringOr(fallbackEntry.subtitle));
  const title = stringOr(fallbackContent.title, stringOr(fallbackEntry.title));
  const fallback = subtitle || title || '客户资产功能入口';
  if (!raw) return fallback;
  if (raw === subtitle || (!subtitle && raw === title)) return raw;
  if (/[、|/／]/.test(raw)) return fallback;
  if (/(三大|多个|核心功能|功能入口|入口区|按钮|模块|客户资产|会员资产)/.test(raw)) {
    return fallback;
  }
  return raw;
}

function slotSizeSpecForUserAssetsSlot(slot: ShopHomePageJsonObject) {
  const key = stringOr(slot.size, 'small');
  return USER_ASSETS_SLOT_SIZE_SPECS[key] ?? USER_ASSETS_SLOT_SIZE_SPECS.small!;
}

function createDefaultUserAssetsEntryPromptSchema(
  entrySeed: ShopHomePageJsonObject,
  slot: ShopHomePageJsonObject,
  designContext: ShopHomePageJsonObject,
  styleGuide: ShopHomePageJsonObject,
  requirements: ShopHomePageJsonObject,
  templateType: unknown,
  index = 0,
) {
  const sizeSpec = slotSizeSpecForUserAssetsSlot(slot);
  const styleTone = resolvePromptStyleTone(requirements, styleGuide);
  const colorPalette = asObject(designContext.color_palette);
  const entryTitle = stringOr(entrySeed.title, `入口 ${index + 1}`);
  const entrySubtitle = stringOr(entrySeed.subtitle, createUserAssetsSubtitle(entrySeed.title, index));
  return {
    type: 'user_asset_entry',
    version: '1.0',
    template: templateType === USER_ASSETS_TEMPLATE_TYPES.HOTZONE ? 'hotzone_entry' : 'entry_card',
    layout: {
      template_type: templateType,
      slot_id: slot.id,
      ratio: sizeSpec.ratio,
      structure: templateType === USER_ASSETS_TEMPLATE_TYPES.HOTZONE ? 'hotzone_freeform' : 'storefront_entry_card',
      padding: 0,
      card_size_px: templateType === USER_ASSETS_TEMPLATE_TYPES.HOTZONE ? null : { width: sizeSpec.width, height: sizeSpec.height },
    },
    style: {
      background_type: 'solid',
      background_color: '#FFFFFF',
      primary_color: colorPalette.accent,
      accent_color: colorPalette.accent,
      text_color: colorPalette.text_primary,
      style_tone: styleTone,
      visual_feel: templateType === USER_ASSETS_TEMPLATE_TYPES.HOTZONE ? 'storefront_hotzone_entry' : 'storefront_entry_card',
    },
    content: {
      title: entryTitle,
      subtitle: entrySubtitle,
      description: entrySubtitle || entryTitle,
    },
    entry: {
      icon: stringOr(entrySeed.icon, 'sparkles'),
      title: entryTitle,
      subtitle: entrySubtitle,
      role: stringOr(slot.role, 'sub_action'),
      size: stringOr(slot.size, 'small'),
      slot_id: stringOr(slot.id, `slot_${index + 1}`),
    },
    constraints: {
      single_icon_and_description_only: true,
      max_visible_text_lines: 1,
      no_entry_title_when_subtitle_exists: true,
      no_module_summary_text: true,
      no_other_entry_names: true,
      no_third_line_text: true,
      pure_white_background: true,
      no_border: true,
      no_divider: true,
      no_outline: true,
      no_extra_cards: true,
      no_floating_elements: templateType !== USER_ASSETS_TEMPLATE_TYPES.HOTZONE,
      no_circle_entries: true,
      no_logo: true,
      no_brand_mark: true,
      no_shop_slogan: true,
      no_rounded_corners: true,
      no_padding: true,
      follow_page_icon_style: true,
      lock_card_size: templateType !== USER_ASSETS_TEMPLATE_TYPES.HOTZONE,
    },
  };
}

function normalizeUserAssetsEntryPromptSchema(inputValue: unknown, fallback: ShopHomePageJsonObject) {
  const input = asObject(inputValue);
  if (Object.keys(input).length > 0 && !isPlainObject(input.layout) && !isPlainObject(input.style) && !isPlainObject(input.content)) {
    return { ...fallback, raw_prompt_schema: deepClone(input) };
  }
  const layout = asObject(input.layout);
  const style = asObject(input.style);
  const content = asObject(input.content);
  const entry = asObject(input.entry);
  const constraints = asObject(input.constraints);
  const fallbackLayout = asObject(fallback.layout);
  const fallbackStyle = asObject(fallback.style);
  const fallbackContent = asObject(fallback.content);
  const fallbackEntry = asObject(fallback.entry);
  const normalizedTitle = stringOr(content.title, stringOr(fallbackContent.title));
  const normalizedSubtitle = stringOr(content.subtitle, stringOr(fallbackContent.subtitle));
  const descriptionFallbackContent = {
    ...fallbackContent,
    title: normalizedTitle,
    subtitle: normalizedSubtitle,
  };
  return {
    type: stringOr(input.type, stringOr(fallback.type)),
    version: stringOr(input.version, stringOr(fallback.version)),
    template: stringOr(input.template, stringOr(fallback.template)),
    layout: {
      ...fallbackLayout,
      ...layout,
      ratio: stringOr(layout.ratio, stringOr(fallbackLayout.ratio)),
      structure: stringOr(layout.structure, stringOr(fallbackLayout.structure)),
      template_type: normalizeUserAssetsTemplateType(layout.template_type) ?? fallbackLayout.template_type,
      slot_id: stringOr(layout.slot_id, stringOr(fallbackLayout.slot_id)),
    },
    style: {
      background_type: stringOr(style.background_type, stringOr(fallbackStyle.background_type)),
      background_color: stringOr(style.background_color, stringOr(fallbackStyle.background_color)),
      primary_color: sanitizeHexColor(style.primary_color, stringOr(fallbackStyle.primary_color)),
      accent_color: sanitizeHexColor(style.accent_color, stringOr(fallbackStyle.accent_color)),
      text_color: sanitizeHexColor(style.text_color, stringOr(fallbackStyle.text_color)),
      style_tone: stringOr(style.style_tone, stringOr(fallbackStyle.style_tone)),
      visual_feel: stringOr(style.visual_feel, stringOr(fallbackStyle.visual_feel)),
    },
    content: {
      title: normalizedTitle,
      subtitle: normalizedSubtitle,
      description: sanitizeUserAssetsEntryDescription(content.description, descriptionFallbackContent, fallbackEntry),
    },
    entry: {
      icon: stringOr(entry.icon, stringOr(fallbackEntry.icon)),
      title: stringOr(entry.title, stringOr(fallbackEntry.title)),
      subtitle: stringOr(entry.subtitle, stringOr(fallbackEntry.subtitle)),
      role: stringOr(entry.role, stringOr(fallbackEntry.role)),
      size: stringOr(entry.size, stringOr(fallbackEntry.size)),
      slot_id: stringOr(entry.slot_id, stringOr(fallbackEntry.slot_id)),
    },
    constraints: {
      ...asObject(fallback.constraints),
      ...constraints,
    },
  };
}

function createDefaultUserAssetsEntry(
  entrySeed: ShopHomePageJsonObject,
  slot: ShopHomePageJsonObject,
  designContext: ShopHomePageJsonObject,
  styleGuide: ShopHomePageJsonObject,
  requirements: ShopHomePageJsonObject,
  templateType: unknown,
  index = 0,
  options?: ShopHomePageNormalizeOptions | null,
) {
  const promptSchema = createDefaultUserAssetsEntryPromptSchema(entrySeed, slot, designContext, styleGuide, requirements, templateType, index);
  const promptContent = asObject(promptSchema.content);
  const entry: ShopHomePageJsonObject = {
    id: stringOr(entrySeed.id, `user_assets_entry_${index + 1}`),
    slot_id: stringOr(entrySeed.slot_id, stringOr(slot.id)),
    title: stringOr(entrySeed.title, stringOr(asObject(promptSchema.entry).title)),
    subtitle: stringOr(entrySeed.subtitle, stringOr(asObject(promptSchema.entry).subtitle)),
    icon: stringOr(entrySeed.icon, stringOr(asObject(promptSchema.entry).icon)),
    image: stringOr(entrySeed.image),
    reference_images: normalizeReferenceImages(
      Array.isArray(entrySeed.reference_images)
        ? normalizeLegacyScopedReferenceImages(entrySeed.reference_images, styleGuide)
        : defaultReferenceImagesForModule('user_assets', styleGuide),
    ),
    alt: stringOr(entrySeed.alt, stringOr(promptContent.title)),
    no_cache: entrySeed.no_cache === true,
  };
  if (!shouldSkipSeedImagePrompts(options)) {
    entry.image_prompt_schema = normalizeUserAssetsEntryPromptSchema(entrySeed.image_prompt_schema, promptSchema);
  }
  return entry;
}

function normalizeUserAssetsEntries(
  value: ShopHomePageJsonObject,
  cardLayout: ShopHomePageJsonObject,
  designContext: ShopHomePageJsonObject,
  styleGuide: ShopHomePageJsonObject,
  requirements: ShopHomePageJsonObject,
  options?: ShopHomePageNormalizeOptions | null,
) {
  const slots = userAssetsCardLayoutSlots(cardLayout);
  const labels = resolveActionButtonLabels(requirements);
  const inputEntries = Array.isArray(value.entries) ? value.entries.filter(isPlainObject) : [];
  const entriesBySlotId = new Map<string, ShopHomePageJsonObject>();
  for (const entry of inputEntries) {
    const slotId = stringOr(entry.slot_id || entry.id);
    if (slotId) entriesBySlotId.set(slotId, entry);
  }
  return slots.map((slot, index) => {
    const source = entriesBySlotId.get(stringOr(slot.id)) ?? inputEntries[index] ?? {
      id: slot.id,
      slot_id: slot.id,
      title: stringOr(labels[index], `入口 ${index + 1}`),
      subtitle: createUserAssetsSubtitle(labels[index], index),
      icon: 'sparkles',
    };
    return createDefaultUserAssetsEntry(source, slot, designContext, styleGuide, requirements, cardLayout.template_type, index, options);
  });
}

function resolvePresetUserAssetsDefaults(styleGuide: ShopHomePageJsonObject, accent: string, requirements: ShopHomePageJsonObject) {
  const preset = asObject(asObject(styleGuide.schema_defaults).user_assets);
  const preferredTemplateType = normalizeUserAssetsTemplateType(asObject(preset.card_layout).template_type);
  const cardLayout = normalizeUserAssetsCardLayout({ card_layout: preset.card_layout }, requirements, preferredTemplateType);
  return {
    greeting: stringOr(preset.greeting, USER_ASSETS_DEFAULTS.greeting),
    upgrade_tip: stringOr(preset.upgrade_tip, '完善会员等级和权益，提升复购效率。'),
    card_layout: cardLayout,
    accent,
  };
}

function normalizeUserAssetsData(value: unknown, designContext: ShopHomePageJsonObject, styleGuide: ShopHomePageJsonObject, requirements: ShopHomePageJsonObject, options?: ShopHomePageNormalizeOptions | null) {
  const input = asObject(value);
  const colorPalette = asObject(designContext.color_palette);
  const userAssetsDefaults = resolvePresetUserAssetsDefaults(styleGuide, stringOr(colorPalette.accent), requirements);
  const cardLayout = normalizeUserAssetsCardLayout(input, requirements, asObject(userAssetsDefaults.card_layout).template_type);
  return {
    greeting: stringOr(input.greeting, userAssetsDefaults.greeting),
    nickname: stringOr(input.nickname, USER_ASSETS_DEFAULTS.nickname),
    avatar: stringOr(input.avatar),
    upgrade_tip: stringOr(input.upgrade_tip, userAssetsDefaults.upgrade_tip),
    progress_percent: toNumber(input.progress_percent, 33),
    height: toNumber(input.height, 188),
    card_layout: cardLayout,
    entries: normalizeUserAssetsEntries(input, cardLayout, designContext, styleGuide, requirements, options),
    body_image: stringOr(input.body_image),
    body_image_no_cache: input.body_image_no_cache === true,
    body_alt: stringOr(input.body_alt, USER_ASSETS_DEFAULTS.bodyAlt),
    ...(isPlainObject(input.body_image_schema) ? { body_image_schema: input.body_image_schema } : {}),
  };
}

function normalizeModule(moduleValue: unknown, index: number, designContext: ShopHomePageJsonObject, requirements: ShopHomePageJsonObject, styleGuide: ShopHomePageJsonObject, options?: ShopHomePageNormalizeOptions | null) {
  const module = asObject(moduleValue);
  const type = stringOr(module.type);
  if (!isHomepageModuleType(type)) return null;
  const orderedSpecs = moduleSpecsFor(requirements);
  const occurrenceIndex = orderedSpecs.slice(0, index + 1).filter((entry) => entry.type === type).length - 1;
  const spec = orderedSpecs[index]?.type === type
    ? orderedSpecs[index]
    : moduleSpecForType(requirements, type, occurrenceIndex) ?? { type, content: stringOr(asObject(requirements.module_content)[type]) };
  const base = {
    id: stringOr(module.id, `${type}_${index + 1}`),
    type,
    source: module.source === 'system' ? 'system' : 'ai',
    variant: stringOr(module.variant, 'default'),
    layout: normalizeLayout(module.layout),
    editable: normalizeEditable(module.editable),
  };
  if (type === 'user_assets') {
    return {
      ...base,
      data: normalizeUserAssetsData(module.data, designContext, styleGuide, requirements, options),
    };
  }
  return {
    ...base,
    data: normalizeImageModuleData(spec, module.data, requirements, designContext, styleGuide, options),
  };
}

export function createShopHomePageSeedSchema(requirementsInput: unknown, styleGuideInput?: unknown, options?: ShopHomePageNormalizeOptions | null) {
  const requirements = coerceRequirements(requirementsInput);
  const styleGuide = coerceShopHomePageStyleGuide(styleGuideInput, requirements);
  const designContextBase = resolveDesignContextBase(styleGuide, requirements);
  const accent = sanitizeHexColor(asObject(requirements.style).primary_color, stringOr(asObject(designContextBase.color_palette).accent));
  const designContext = {
    ...designContextBase,
    color_palette: {
      ...asObject(designContextBase.color_palette),
      accent,
    },
  };
  const modules = moduleSpecsFor(requirements).map((spec, index) => {
    const base = {
      id: `${spec.type}_${index + 1}`,
      type: spec.type,
      source: 'ai',
      variant: 'default',
      layout: normalizeLayout(null),
      editable: normalizeEditable(null),
    };
    if (spec.type === 'user_assets') {
      return {
        ...base,
        data: normalizeUserAssetsData({}, designContext, styleGuide, requirements, options),
      };
    }
    return {
      ...base,
      data: normalizeImageModuleData(spec, {}, requirements, designContext, styleGuide, options),
    };
  });
  return {
    page_id: 'shop_home_page',
    version: '1.0.0',
    layout_mode: 'overlay',
    design_context: designContext,
    modules,
  };
}

export function normalizeShopHomePageSchema(
  input: unknown,
  requirementsInput: unknown,
  styleGuideInput?: unknown,
  options?: ShopHomePageNormalizeOptions | null,
) {
  const root = isPlainObject(input) && isPlainObject(input.schema) ? input.schema : input;
  const source = asObject(root);
  const requirements = coerceRequirements(requirementsInput, source);
  const styleGuide = coerceShopHomePageStyleGuide(styleGuideInput, requirements);
  const designContextBase = resolveDesignContextBase(styleGuide, requirements);
  const designContextInput = normalizeDesignContextInput(source);
  const accent = sanitizeHexColor(
    stringOr(asObject(asObject(designContextInput).color_palette).accent, stringOr(asObject(requirements.style).primary_color)),
    stringOr(asObject(designContextBase.color_palette).accent),
  );
  const designContext = normalizeDesignContext(designContextInput, accent, requirements, styleGuide);
  const modulesInput = Array.isArray(source.modules) ? source.modules : [];
  const modules = modulesInput
    .map((module, index) => normalizeModule(module, index, designContext, requirements, styleGuide, options))
    .filter(Boolean);
  return {
    page_id: stringOr(source.page_id, 'shop_home_page'),
    version: stringOr(source.version, '1.0.0'),
    layout_mode: source.layout_mode === 'flow' ? 'flow' : 'overlay',
    design_context: designContext,
    modules: modules.length > 0 ? modules : createShopHomePageSeedSchema(requirements, styleGuide, options).modules,
  };
}
