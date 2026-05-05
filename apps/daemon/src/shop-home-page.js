import fs from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { ensureProject, listFiles, writeProjectFile } from './projects.js';
import {
  DEFAULT_MODULES as HOMEPAGE_DEFAULT_MODULES,
  MODULES as HOMEPAGE_MODULES,
  buildInitialHomepageRequirements,
  getRequestedAspectRatio,
  getRequestedItemCount,
  normalizeHomepageModuleSpecs,
  validateHomepageSchema,
} from './lib/homepage-agent-shared.js';
import {
  SHOP_HOME_PAGE_PHONE_CHROME,
  SHOP_HOME_PAGE_STATUS_BATTERY,
  SHOP_HOME_PAGE_STATUS_SIGNAL_BARS,
  SHOP_HOME_PAGE_STATUS_WIFI_PATHS,
} from '../../web/src/shop-home-page/phoneChrome.ts';

export const LEGACY_SHOP_HOME_PAGE_REQUIREMENTS_FILE = 'storefront.requirements.json';
export const LEGACY_SHOP_HOME_PAGE_STYLE_GUIDE_FILE = 'storefront.style-guide.json';
export const LEGACY_SHOP_HOME_PAGE_SCHEMA_FILE = 'storefront.schema.json';
export const LEGACY_SHOP_HOME_PAGE_SCREEN_FILE = 'storefront.screen.html';
export const LEGACY_SHOP_HOME_PAGE_PREVIEW_FILE = 'storefront.preview.html';
export const LEGACY_STOREFRONT_BRIEF_FILE = 'storefront.brief.json';

export const SHOP_HOME_PAGE_BRIEF_FILE = 'shop-home-page.brief.json';
export const SHOP_HOME_PAGE_REQUIREMENTS_FILE = 'shop-home-page.requirements.json';
export const SHOP_HOME_PAGE_STYLE_GUIDE_FILE = 'shop-home-page.style-guide.json';
export const SHOP_HOME_PAGE_SCHEMA_FILE = 'shop-home-page.schema.json';
export const SHOP_HOME_PAGE_SCREEN_FILE = 'shop-home-page.screen.html';
export const SHOP_HOME_PAGE_PREVIEW_FILE = 'shop-home-page.preview.html';

const INTERNAL_STATE_FILE = '.shop-home-page.state.json';
const REQUIREMENTS_TEMPLATE_FILE = path.join('assets', 'requirements.template.json');
const STYLE_GUIDE_TEMPLATE_FILE = path.join('assets', 'style-guide.template.json');
const SCHEMA_TEMPLATE_FILE = path.join('assets', 'schema.template.json');
const SKILL_FILE = 'SKILL.md';
const DEFAULT_MODULES = [...HOMEPAGE_DEFAULT_MODULES];
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

const DEFAULT_ACTION_BUTTON_SELECTION = ['到店自取', '外卖点单'];

const MODULE_RUNTIME_COPY = {
  top_slider: {
    label: '头图轮播',
    alt: '顶部轮播',
    pendingLabel: '顶部轮播运行时生图中...',
  },
  user_assets: {
    label: '会员资产区',
    alt: '客户资产',
    pendingLabel: '客户资产运行时生图中...',
  },
  banner: {
    label: '活动横幅',
    alt: 'Banner',
    pendingLabel: 'Banner 运行时生图中...',
  },
  goods: {
    label: '商品模块',
    alt: '商品展示',
    pendingLabel: '商品组件运行时生图中...',
  },
  shop_info: {
    label: '门店信息',
    alt: '店铺信息',
    pendingLabel: '店铺信息运行时生图中...',
  },
  image_ad: {
    label: '参考广告块',
    alt: '参考广告块',
    pendingLabel: '参考广告块运行时生图中...',
  },
};

const USER_ASSETS_DEFAULTS = {
  greeting: 'Hello',
  nickname: '小赞宝用户',
  avatar:
    'https://img01.yzcdn.cn/upload_files/2023/07/06/Fq4fiVPqT5Ea1l59IThVNBGapfTq.png',
  codeIcon:
    'https://img01.yzcdn.cn/upload_files/2023/07/10/FiPIAQ_DwDBgQ9L4iKpD7O2r4Dd_.png',
  bodyAlt: '客户资产功能区背景图',
  pendingLabel: '客户资产运行时生图中...',
};

const USER_ASSETS_TEMPLATE_TYPES = {
  SINGLE: 7,
  ONE_ROW_TWO: 1,
  LEFT_ONE_RIGHT_TWO: 2,
  ONE_ROW_THREE: 3,
  TWO_ROW_FIVE: 5,
  TWO_ROW_FOUR: 6,
  HOTZONE: 'hotzone',
};

const USER_ASSETS_GRID_GAP = 11;
const USER_ASSETS_TEMPLATE_TYPE_LABELS = {
  7: '单张横图',
  1: '一行两个',
  2: '左一右二',
  3: '一行三个',
  5: '二行五个',
  6: '二行四个',
  hotzone: '热区自由布局',
};

const USER_ASSETS_SLOT_SIZE_SPECS = {
  wide: { width: 611, height: 216, ratio: '611:216' },
  large: { width: 300, height: 456, ratio: '300:456' },
  medium: { width: 300, height: 220, ratio: '300:220' },
  small: { width: 196, height: 220, ratio: '196:220' },
  free: { width: 196, height: 220, ratio: '196:220' },
};

const USER_ASSETS_LAYOUT_SPECS = {
  '7': {
    templateType: USER_ASSETS_TEMPLATE_TYPES.SINGLE,
    slots: [{ id: 'single', role: 'main_action', size: 'wide', position: 'single' }],
    canvasWidth: 611,
    canvasHeight: 216,
  },
  '1': {
    templateType: USER_ASSETS_TEMPLATE_TYPES.ONE_ROW_TWO,
    slots: [
      { id: 'left', role: 'sub_action', size: 'medium', position: 'left' },
      { id: 'right', role: 'sub_action', size: 'medium', position: 'right' },
    ],
    canvasWidth: 611,
    canvasHeight: 220,
  },
  '3': {
    templateType: USER_ASSETS_TEMPLATE_TYPES.ONE_ROW_THREE,
    slots: [
      { id: 'left_1', role: 'sub_action', size: 'small', position: 'left_1' },
      { id: 'center_1', role: 'sub_action', size: 'small', position: 'center_1' },
      { id: 'right_1', role: 'sub_action', size: 'small', position: 'right_1' },
    ],
    canvasWidth: 610,
    canvasHeight: 220,
  },
  '2': {
    templateType: USER_ASSETS_TEMPLATE_TYPES.LEFT_ONE_RIGHT_TWO,
    slots: [
      { id: 'left_large', role: 'main_action', size: 'large', position: 'left_large' },
      { id: 'right_top', role: 'sub_action', size: 'medium', position: 'right_top' },
      { id: 'right_bottom', role: 'sub_action', size: 'medium', position: 'right_bottom' },
    ],
    canvasWidth: 611,
    canvasHeight: 456,
  },
  '6': {
    templateType: USER_ASSETS_TEMPLATE_TYPES.TWO_ROW_FOUR,
    slots: [
      { id: 'top_left', role: 'sub_action', size: 'medium', position: 'top_left' },
      { id: 'top_right', role: 'sub_action', size: 'medium', position: 'top_right' },
      { id: 'bottom_left', role: 'sub_action', size: 'medium', position: 'bottom_left' },
      { id: 'bottom_right', role: 'sub_action', size: 'medium', position: 'bottom_right' },
    ],
    canvasWidth: 611,
    canvasHeight: 451,
  },
  '5': {
    templateType: USER_ASSETS_TEMPLATE_TYPES.TWO_ROW_FIVE,
    slots: [
      { id: 'top_left', role: 'sub_action', size: 'medium', position: 'top_left' },
      { id: 'top_right', role: 'sub_action', size: 'medium', position: 'top_right' },
      { id: 'bottom_left', role: 'sub_action', size: 'small', position: 'bottom_left' },
      { id: 'bottom_center', role: 'sub_action', size: 'small', position: 'bottom_center' },
      { id: 'bottom_right', role: 'sub_action', size: 'small', position: 'bottom_right' },
    ],
    canvasWidth: 611,
    canvasHeight: 451,
  },
};

const USER_ASSETS_PREVIEW_BODY_WIDTH = 311;

const SHOP_HOME_PAGE_TONE_PRESETS = JSON.parse(
  readFileSync(
    new URL('../../../packages/contracts/src/shop-home-page/tone-presets.json', import.meta.url),
    'utf8',
  ),
);

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
      'Warm cream paper tone with large white rounded cards, very sparse orange/yellow accent marks, airy whitespace, and soft warm shadows.',
    layout_style:
      'Oversized poster hero first, then a floating member/action card, then clean supporting entry-card rows that still follow the confirmed layout mode.',
    tone_keywords: ['bakery', 'hand-drawn', 'cream', 'playful', 'poster', 'warm'],
  },
  generation_rules: {
    must: [
      'Use warm cream paper-like backgrounds with mostly black typography and doodle accents.',
      'Keep icons, arrows, crowns, and wordmarks sketchy and hand-drawn rather than polished UI glyphs.',
      'Preserve poster-like hierarchy: oversized hero headline, generous whitespace, and simple module stacking.',
      'Bakery product imagery may be photographic, but overlays can include doodle arrows, crowns, handwritten labels, and rough strokes.',
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
      visual_style: {
        design_principle: 'minimal_ui',
        brand_tone: 'friendly',
        color_system: {
          usage: {
            icon: true,
            accent: true,
            background: false,
          },
        },
        icon: {
          style: 'flat_duotone',
          shape: 'rounded',
          stroke: 'none',
        },
        block: {
          radius: 28,
          shadow: 'soft',
        },
        typography: {
          title_case: 'mixed',
          subtitle_case: 'mixed',
        },
      },
    },
  },
};

const SHOP_HOME_PAGE_TONE_STYLE_GUIDE_PRESETS = Object.fromEntries(
  SHOP_HOME_PAGE_TONE_PRESETS.map((preset) => [
    preset.id,
    {
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
          spacing: toNumber(preset.spacing, DEFAULT_DESIGN_CONTEXT.spacing),
          page_width: 375,
        },
      },
    },
  ]),
);

const STYLE_PRESETS = {
  'bakery-handdrawn-cream': BAKERY_STYLE_GUIDE_PRESET,
  ...SHOP_HOME_PAGE_TONE_STYLE_GUIDE_PRESETS,
};

const BAKERY_STYLE_KEYWORDS = [
  'bakery',
  'bread',
  'pastry',
  'dessert',
  'cake',
  'bake',
  '烘焙',
  '面包',
  '蛋糕',
  '甜品',
  '甜点',
  '烤',
];

const IMAGE_RATIO_MAP = {
  top_slider: '3:4',
  banner: '75:30',
  goods: '4:3',
  shop_info: '9:16',
  image_ad: '1:1',
};

const IMAGE_STRUCTURE_MAP = {
  top_slider: 'poster_hero',
  banner: 'landscape_entry_banner',
  goods: 'product_showcase',
  shop_info: 'vertical_shop_story',
  image_ad: 'reference_image_ad',
};

const IMAGE_PROMPT_TYPE_MAP = {
  top_slider: 'carousel_banner',
  banner: 'banner',
  goods: 'goods',
  shop_info: 'shop_info',
  image_ad: 'image_ad',
};

const BRAND_PROMPT_MODULES = new Set(['top_slider', 'shop_info']);

const IMAGE_FILE_PREFIX = {
  top_slider: 'top-slider',
  user_assets: 'user-assets-entry',
  banner: 'banner',
  goods: 'goods',
  shop_info: 'shop-info',
  image_ad: 'image-ad',
};

function imagePromptAllowsBrand(moduleType) {
  return BRAND_PROMPT_MODULES.has(moduleType);
}

function modulePolicyConstraints(moduleType) {
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

  return {};
}

export function shopHomePageSkillDir(projectRoot) {
  return path.join(projectRoot, 'skills', 'shop-home-page');
}

export async function migrateLegacyStorefrontProjectFiles(projectsRoot, db, projectId) {
  const projectDir = await ensureProject(projectsRoot, projectId);
  const renamePairs = [
    [LEGACY_STOREFRONT_BRIEF_FILE, SHOP_HOME_PAGE_BRIEF_FILE],
    [LEGACY_SHOP_HOME_PAGE_REQUIREMENTS_FILE, SHOP_HOME_PAGE_REQUIREMENTS_FILE],
    [LEGACY_SHOP_HOME_PAGE_STYLE_GUIDE_FILE, SHOP_HOME_PAGE_STYLE_GUIDE_FILE],
    [LEGACY_SHOP_HOME_PAGE_SCHEMA_FILE, SHOP_HOME_PAGE_SCHEMA_FILE],
    [LEGACY_SHOP_HOME_PAGE_SCREEN_FILE, SHOP_HOME_PAGE_SCREEN_FILE],
    [LEGACY_SHOP_HOME_PAGE_PREVIEW_FILE, SHOP_HOME_PAGE_PREVIEW_FILE],
  ];

  for (const [legacyName, nextName] of renamePairs) {
    const legacyPath = path.join(projectDir, legacyName);
    const nextPath = path.join(projectDir, nextName);
    if (await statMaybe(legacyPath)) {
      if (!(await statMaybe(nextPath))) {
        await fs.rename(legacyPath, nextPath);
      }
    }
  }

  if (!db?.prepare) return;
  const row = db.prepare('select metadata_json as metadataJson, skill_id as skillId from projects where id = ?').get(projectId);
  if (!row) return;

  let nextMetadata = row.metadataJson;
  try {
    const parsed =
      typeof row.metadataJson === 'string'
        ? JSON.parse(row.metadataJson)
        : row.metadataJson;
    if (parsed && parsed.kind === 'storefront') {
      parsed.kind = 'shopHomePage';
      nextMetadata = JSON.stringify(parsed);
    }
  } catch {
    /* ignore malformed metadata */
  }

  const nextSkillId = row.skillId === 'storefront-homepage' ? 'shop-home-page' : row.skillId;
  if (nextMetadata !== row.metadataJson || nextSkillId !== row.skillId) {
    db.prepare('update projects set metadata_json = ?, skill_id = ? where id = ?').run(
      nextMetadata ?? null,
      nextSkillId ?? null,
      projectId,
    );
  }
}

export async function loadShopHomePageState(projectsRoot, projectId, skillRoot) {
  const projectDir = await ensureProject(projectsRoot, projectId);
  const templates = await loadSkillTemplates(skillRoot);
  await ensureStorefrontSeedFiles(projectDir, templates);

  const [
    requirementsTextFromFile,
    styleGuideTextFromFile,
    schemaTextFromFile,
    runtimeState,
    files,
  ] = await Promise.all([
    readTextMaybe(path.join(projectDir, SHOP_HOME_PAGE_REQUIREMENTS_FILE)),
    readTextMaybe(path.join(projectDir, SHOP_HOME_PAGE_STYLE_GUIDE_FILE)),
    readTextMaybe(path.join(projectDir, SHOP_HOME_PAGE_SCHEMA_FILE)),
    readRuntimeState(projectDir),
    listFiles(projectsRoot, projectId),
  ]);

  const requirementsText = requirementsTextFromFile ?? templates.requirementsText;
  const requirements = coerceRequirements(tryParseJson(requirementsText));
  const { styleGuide, styleGuideText } = await loadStyleGuideForProject(
    projectDir,
    requirements,
    styleGuideTextFromFile ?? templates.styleGuideText,
    { syncFile: true },
  );
  const schemaText = schemaTextFromFile ?? templates.schemaText;
  const parsedSchema = tryParseJson(schemaTextFromFile);
  const schema = isPlainObject(parsedSchema)
    ? normalizeStorefrontSchema(parsedSchema, requirements, styleGuide)
    : null;
  const validationErrors = schema
    ? validateStorefrontSchema(schema, requirements)
    : schemaTextFromFile && schemaTextFromFile.trim()
      ? ['shop-home-page.schema.json must be valid JSON.']
      : [];

  await ensurePreviewArtifacts(
    projectDir,
    projectId,
    schema,
    requirements,
    validationErrors,
    styleGuide,
  );

  const previewStat = await statMaybe(path.join(projectDir, SHOP_HOME_PAGE_PREVIEW_FILE));
  const previewUpdatedAt = previewStat?.mtimeMs ?? null;
  const derivedStatus = deriveStatus(schema, validationErrors, runtimeState.status);

  return {
    projectId,
    requirements,
    requirementsText,
    styleGuide: toPublicStyleGuide(styleGuide),
    styleGuideText,
    schema,
    schemaText,
    previewFileName: SHOP_HOME_PAGE_PREVIEW_FILE,
    previewUrl: `/api/projects/${encodeURIComponent(projectId)}/files/${encodeURIComponent(SHOP_HOME_PAGE_PREVIEW_FILE)}`,
    screenFileName: SHOP_HOME_PAGE_SCREEN_FILE,
    screenUrl: `/api/projects/${encodeURIComponent(projectId)}/files/${encodeURIComponent(SHOP_HOME_PAGE_SCREEN_FILE)}`,
    previewUpdatedAt,
    files,
    logs: Array.isArray(runtimeState.logs) ? runtimeState.logs : [],
    status: derivedStatus,
    validationErrors,
  };
}

export async function applyShopHomePageSchemaText(projectsRoot, projectId, skillRoot, schemaText) {
  const projectDir = await ensureProject(projectsRoot, projectId);
  const requirements = await readRequirementsForProject(projectDir);
  const styleGuide = await readStyleGuideForProject(projectDir, requirements);
  const raw = tryParseJson(schemaText);
  if (!isPlainObject(raw)) {
    const err = new Error('shop-home-page.schema.json must be valid JSON.');
    err.statusCode = 422;
    throw err;
  }

  const normalized = normalizeStorefrontSchema(raw, requirements, styleGuide);
  const validationErrors = validateStorefrontSchema(normalized, requirements);
  if (validationErrors.length > 0) {
    const err = new Error(validationErrors.join('\n'));
    err.statusCode = 422;
    throw err;
  }

  await persistSchema(projectDir, projectId, normalized, requirements, styleGuide);
  await writeRuntimeState(projectDir, 'schema-ready', 'info', 'shop-home-page.schema.json applied and preview recompiled.');
  return loadShopHomePageState(projectsRoot, projectId, skillRoot);
}

export async function clearShopHomePageSchemaImageSlot(projectsRoot, projectId, fileName) {
  const projectDir = await ensureProject(projectsRoot, projectId);
  const schemaPath = path.join(projectDir, SHOP_HOME_PAGE_SCHEMA_FILE);
  const schemaText = await readTextMaybe(schemaPath);
  const schema = tryParseJson(schemaText);
  if (!isPlainObject(schema) || !Array.isArray(schema.modules)) return;

  let changed = false;
  for (const module of schema.modules) {
    if (module.type === 'user_assets') {
      if (module.data?.body_image === fileName) {
        module.data.body_image = '';
        changed = true;
      }
      if (Array.isArray(module.data?.entries)) {
        for (const entry of module.data.entries) {
          if (entry?.image === fileName) {
            entry.image = '';
            changed = true;
          }
        }
      }
    } else if (Array.isArray(module.data?.items)) {
      for (const item of module.data.items) {
        if (item.image === fileName) {
          item.image = '';
          changed = true;
        }
      }
    }
  }

  if (changed) {
    await fs.writeFile(schemaPath, `${JSON.stringify(schema, null, 2)}\n`, 'utf8');
  }
}

async function ensureStorefrontSeedFiles(projectDir, templates) {
  await writeIfAbsent(
    path.join(projectDir, SHOP_HOME_PAGE_REQUIREMENTS_FILE),
    `${templates.requirementsText.trim()}\n`,
  );
  await writeIfAbsent(
    path.join(projectDir, SHOP_HOME_PAGE_STYLE_GUIDE_FILE),
    `${templates.styleGuideText.trim()}\n`,
  );
  await writeIfAbsent(
    path.join(projectDir, SHOP_HOME_PAGE_SCHEMA_FILE),
    `${templates.schemaText.trim()}\n`,
  );
}

async function loadSkillTemplates(skillRoot) {
  const requirementsText =
    (await readTextMaybe(path.join(skillRoot, REQUIREMENTS_TEMPLATE_FILE)))
    ?? `${JSON.stringify(buildDefaultRequirementsTemplate(), null, 2)}\n`;
  const requirements = coerceRequirements(tryParseJson(requirementsText));
  const styleGuideText =
    (await readTextMaybe(path.join(skillRoot, STYLE_GUIDE_TEMPLATE_FILE)))
    ?? `${JSON.stringify(buildDefaultStyleGuideTemplate(), null, 2)}\n`;
  const styleGuide = coerceStyleGuide(tryParseJson(styleGuideText), requirements);
  const rawSchemaText = await readTextMaybe(path.join(skillRoot, SCHEMA_TEMPLATE_FILE));
  const parsedSchemaText = tryParseJson(rawSchemaText);
  const normalizedTemplateSchema = isPlainObject(parsedSchemaText)
    ? normalizeStorefrontSchema(parsedSchemaText, requirements, styleGuide)
    : null;
  const schemaText = normalizedTemplateSchema && validateStorefrontSchema(normalizedTemplateSchema, requirements).length === 0
    ? `${JSON.stringify(normalizedTemplateSchema, null, 2)}\n`
    : `${JSON.stringify(createSeedSchema(requirements, styleGuide), null, 2)}\n`;
  return { requirementsText, styleGuideText, schemaText };
}

function buildDefaultRequirementsTemplate() {
  return buildInitialHomepageRequirements('店铺首页', {
    status: 'needs_confirmation',
    modules: DEFAULT_MODULES,
    industry: '',
    brand_name: '',
    primary_color: '',
    tone: '',
    avoid: [],
    brand_logo: '',
    action_buttons: {
      selected: [...DEFAULT_ACTION_BUTTON_SELECTION],
      custom: '',
    },
    other_requirements: '',
  });
}

function buildDefaultStyleGuideTemplate() {
  return deepClone(GENERIC_STYLE_GUIDE);
}

async function readRequirementsForProject(projectDir) {
  const text = await readTextMaybe(path.join(projectDir, SHOP_HOME_PAGE_REQUIREMENTS_FILE));
  return coerceRequirements(tryParseJson(text));
}

async function readStyleGuideForProject(projectDir, requirements) {
  const text = await readTextMaybe(path.join(projectDir, SHOP_HOME_PAGE_STYLE_GUIDE_FILE));
  const { styleGuide } = await loadStyleGuideForProject(projectDir, requirements, text, { syncFile: true });
  return styleGuide;
}

async function loadStyleGuideForProject(projectDir, requirements, styleGuideText, options = {}) {
  const styleGuide = coerceStyleGuide(tryParseJson(styleGuideText), requirements);
  const nextText = `${JSON.stringify(toPublicStyleGuide(styleGuide), null, 2)}\n`;
  if (options.syncFile) {
    await writeTextIfChanged(
      path.join(projectDir, SHOP_HOME_PAGE_STYLE_GUIDE_FILE),
      nextText,
    );
  }
  return {
    styleGuide,
    styleGuideText: nextText,
  };
}

function coerceStyleGuide(raw, requirements) {
  const fallback = buildDefaultStyleGuideTemplate();
  const input = isPlainObject(raw) ? raw : {};
  const presetId = resolveStylePresetId(
    stringOr(input.preset_id, fallback.preset_id),
    input,
    requirements,
  );
  const preset = presetId && STYLE_PRESETS[presetId]
    ? deepClone(STYLE_PRESETS[presetId])
    : null;
  const base = preset ?? fallback;

  return {
    version: stringOr(input.version, base.version),
    preset_id: presetId || 'auto',
    reference_images: normalizeReferenceImages(
      Array.isArray(input.reference_images)
        ? input.reference_images
        : base.reference_images,
    ),
    analysis: {
      source_summary: stringOr(input.analysis?.source_summary, base.analysis.source_summary),
      icon_style: stringOr(input.analysis?.icon_style, base.analysis.icon_style),
      background_style: stringOr(input.analysis?.background_style, base.analysis.background_style),
      layout_style: stringOr(input.analysis?.layout_style, base.analysis.layout_style),
      tone_keywords: uniqueStrings(
        Array.isArray(input.analysis?.tone_keywords)
          ? input.analysis.tone_keywords.filter((value) => typeof value === 'string')
          : base.analysis.tone_keywords,
      ),
    },
    generation_rules: {
      must: uniqueStrings(
        Array.isArray(input.generation_rules?.must)
          ? input.generation_rules.must.filter((value) => typeof value === 'string')
          : base.generation_rules.must,
      ),
      avoid: uniqueStrings(
        Array.isArray(input.generation_rules?.avoid)
          ? input.generation_rules.avoid.filter((value) => typeof value === 'string')
          : base.generation_rules.avoid,
      ),
    },
    schema_defaults: base.schema_defaults ? deepClone(base.schema_defaults) : undefined,
  };
}

function resolveStylePresetId(rawPresetId, rawStyleGuide, requirements) {
  if (rawPresetId && rawPresetId !== 'auto' && STYLE_PRESETS[rawPresetId]) {
    return rawPresetId;
  }
  const explicitTonePresetId = findStorefrontTonePresetId(stringOr(requirements?.style?.tone));
  if (explicitTonePresetId) {
    return explicitTonePresetId;
  }
  const text = [
    stringOr(requirements?.style?.industry),
    stringOr(requirements?.style?.tone),
    stringOr(requirements?.source_prompt),
    stringOr(rawStyleGuide?.analysis?.source_summary),
    stringOr(rawStyleGuide?.analysis?.icon_style),
    stringOr(rawStyleGuide?.analysis?.background_style),
    stringOr(rawStyleGuide?.analysis?.layout_style),
    ...moduleSpecContents(requirements),
    ...Object.values(requirements?.module_content ?? {}),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  if (BAKERY_STYLE_KEYWORDS.some((keyword) => text.includes(keyword.toLowerCase()))) {
    return 'bakery-handdrawn-cream';
  }
  return rawPresetId === 'auto' ? 'auto' : '';
}

function toPublicStyleGuide(styleGuide) {
  return {
    version: stringOr(styleGuide?.version, '1.0'),
    preset_id: stringOr(styleGuide?.preset_id, 'auto'),
    reference_images: normalizeReferenceImages(
      Array.isArray(styleGuide?.reference_images) ? styleGuide.reference_images : [],
    ),
    analysis: {
      source_summary: stringOr(styleGuide?.analysis?.source_summary),
      icon_style: stringOr(styleGuide?.analysis?.icon_style),
      background_style: stringOr(styleGuide?.analysis?.background_style),
      layout_style: stringOr(styleGuide?.analysis?.layout_style),
      tone_keywords: uniqueStrings(Array.isArray(styleGuide?.analysis?.tone_keywords) ? styleGuide.analysis.tone_keywords : []),
    },
    generation_rules: {
      must: uniqueStrings(Array.isArray(styleGuide?.generation_rules?.must) ? styleGuide.generation_rules.must : []),
      avoid: uniqueStrings(Array.isArray(styleGuide?.generation_rules?.avoid) ? styleGuide.generation_rules.avoid : []),
    },
  };
}

function normalizeAspectRatioHint(value, fallback = '1:1') {
  return typeof value === 'string' && /^\d+:\d+$/.test(value.trim()) ? value.trim() : fallback;
}

function deriveModuleContentFromSpecs(specs) {
  const out = {};
  for (const spec of specs) {
    if (typeof spec?.type !== 'string' || spec.type in out) continue;
    out[spec.type] = stringOr(spec.content);
  }
  return out;
}

function moduleSpecsFor(requirements) {
  const specs = normalizeHomepageModuleSpecs(requirements?.module_specs);
  if (specs && specs.length > 0) {
    return specs;
  }

  const modules = Array.isArray(requirements?.modules) ? requirements.modules : DEFAULT_MODULES;
  const moduleContent = requirements?.module_content ?? {};
  return modules
    .filter((moduleType) => HOMEPAGE_MODULES.includes(moduleType))
    .map((moduleType) => {
      const spec = {
        type: moduleType,
        content: stringOr(moduleContent[moduleType]),
      };
      if (moduleType === 'top_slider') {
        spec.itemCount = toPositiveInteger(requirements?.counts?.sliderCount, 2);
      } else if (moduleType === 'goods') {
        spec.itemCount = toPositiveInteger(requirements?.counts?.goodsCount, 3);
      } else if (moduleType === 'image_ad') {
        spec.aspectRatio = normalizeAspectRatioHint(moduleContent?.image_ad, '1:1');
      }
      return spec;
    });
}

function moduleSpecContents(requirements) {
  return moduleSpecsFor(requirements)
    .map((spec) => stringOr(spec.content))
    .filter(Boolean);
}

function moduleSpecForType(requirements, moduleType, occurrenceIndex = 0) {
  const specs = moduleSpecsFor(requirements).filter((spec) => spec.type === moduleType);
  return specs[occurrenceIndex] ?? null;
}

function coerceRequirements(raw) {
  if (raw && typeof raw === 'object' && raw.style) {
    const specs = moduleSpecsFor(raw);
    return {
      status: raw.status === 'confirmed' ? 'confirmed' : 'needs_confirmation',
      source_prompt: stringOr(raw.source_prompt, '店铺首页'),
      module_specs: specs,
      modules: specs.map((spec) => spec.type),
      module_content: deriveModuleContentFromSpecs(specs),
      style: {
        industry: stringOr(raw.style?.industry),
        brand_name: stringOr(raw.style?.brand_name),
        primary_color: stringOr(raw.style?.primary_color),
        tone: stringOr(raw.style?.tone),
        avoid: Array.isArray(raw.style?.avoid)
          ? raw.style.avoid.filter((item) => typeof item === 'string')
          : [],
      },
      brand_logo: stringOr(raw.brand_logo),
      action_buttons: normalizeActionButtons(raw.action_buttons),
      other_requirements: stringOr(raw.other_requirements),
      counts: {
        sliderCount: getRequestedItemCount(specs, 'top_slider', toPositiveInteger(raw.counts?.sliderCount, 2)),
        goodsCount: getRequestedItemCount(specs, 'goods', toPositiveInteger(raw.counts?.goodsCount, 3)),
      },
      confirmation_questions: Array.isArray(raw.confirmation_questions)
        ? raw.confirmation_questions.filter((item) => typeof item === 'string')
        : undefined,
    };
  }

  if (raw && typeof raw === 'object') {
    return legacyBriefToRequirements(raw);
  }

  return buildDefaultRequirementsTemplate();
}

function legacyBriefToRequirements(rawBrief) {
  const brief = isPlainObject(rawBrief) ? rawBrief : {};
  const sourcePrompt = [
    stringOr(brief.industry),
    stringOr(brief.storeType),
    stringOr(brief.primaryGoal),
    stringOr(brief.featuredCategory),
    stringOr(brief.marketingFocus),
    stringOr(brief.homepageStyle),
    stringOr(brief.brandNotes),
  ]
    .filter(Boolean)
    .join('；') || '店铺首页';

  return buildInitialHomepageRequirements(sourcePrompt, {
    status: 'confirmed',
    modules: DEFAULT_MODULES,
    industry: stringOr(brief.industry),
    brand_name: stringOr(brief.brandName) || stringOr(brief.storeType),
    primary_color: '',
    tone: [stringOr(brief.marketingFocus), stringOr(brief.homepageStyle), stringOr(brief.brandNotes)]
      .filter(Boolean)
      .join('、'),
    avoid: [],
    brand_logo: stringOr(brief.brandLogo),
    other_requirements: '',
  });
}

function normalizeActionButtons(value) {
  const selected = uniqueStrings(
    Array.isArray(value?.selected)
      ? value.selected.map((item) => stringOr(item)).filter(Boolean)
      : Array.isArray(value)
        ? value.map((item) => stringOr(item)).filter(Boolean)
        : [],
  );
  const custom =
    typeof value?.custom === 'string'
      ? value.custom.trim()
      : typeof value === 'string'
        ? value.trim()
        : '';

  if (!selected.length && !custom) {
    return {
      selected: [...DEFAULT_ACTION_BUTTON_SELECTION],
      custom: '',
    };
  }

  return {
    selected,
    custom,
  };
}

function splitActionButtonsCustom(value) {
  if (typeof value !== 'string' || !value.trim()) {
    return [];
  }
  return uniqueStrings(
    value
      .split(/[、/,，\n]+/g)
      .map((item) => item.trim())
      .filter(Boolean),
  );
}

function resolveActionButtonLabels(requirements) {
  const actionButtons = normalizeActionButtons(requirements?.action_buttons);
  const labels = uniqueStrings([
    ...actionButtons.selected,
    ...splitActionButtonsCustom(actionButtons.custom),
  ]);
  return labels.length > 0 ? labels : [...DEFAULT_ACTION_BUTTON_SELECTION];
}

function cloneUserAssetsSlots(slots) {
  return slots.map((slot) => ({ ...slot }));
}

function normalizeUserAssetsTemplateType(value) {
  if (value === USER_ASSETS_TEMPLATE_TYPES.HOTZONE) {
    return USER_ASSETS_TEMPLATE_TYPES.HOTZONE;
  }
  const numeric = Number(value);
  if (
    numeric === USER_ASSETS_TEMPLATE_TYPES.SINGLE ||
    numeric === USER_ASSETS_TEMPLATE_TYPES.ONE_ROW_TWO ||
    numeric === USER_ASSETS_TEMPLATE_TYPES.LEFT_ONE_RIGHT_TWO ||
    numeric === USER_ASSETS_TEMPLATE_TYPES.ONE_ROW_THREE ||
    numeric === USER_ASSETS_TEMPLATE_TYPES.TWO_ROW_FIVE ||
    numeric === USER_ASSETS_TEMPLATE_TYPES.TWO_ROW_FOUR
  ) {
    return numeric;
  }
  return null;
}

function userAssetsTemplateTypeLabel(templateType) {
  return USER_ASSETS_TEMPLATE_TYPE_LABELS[String(templateType)] ?? '客户资产布局';
}

function createHotzoneSlots(count) {
  return Array.from({ length: Math.max(1, count) }, (_, index) => {
    const id = `slot_${index + 1}`;
    return {
      id,
      role: 'sub_action',
      size: 'free',
      position: id,
    };
  });
}

function fixedUserAssetsLayoutSpec(templateType) {
  return USER_ASSETS_LAYOUT_SPECS[String(templateType)] ?? null;
}

function userAssetsLegacySlots(schema) {
  return Array.isArray(schema?.layout?.slots) ? schema.layout.slots.filter(isPlainObject) : [];
}

function userAssetsCardLayoutSlots(layout) {
  return Array.isArray(layout?.slots) ? layout.slots.filter(isPlainObject) : [];
}

function userAssetsSlotPosition(slot) {
  return stringOr(slot?.position || slot?.id);
}

function hasUserAssetsPositions(slots, ...entries) {
  const ids = slots.map((slot) => userAssetsSlotPosition(slot));
  return entries.every((entry) => ids.includes(entry));
}

function templateTypeFromSlots(slots) {
  if (!Array.isArray(slots) || slots.length === 0) return null;
  if (slots.length === 1) {
    const position = userAssetsSlotPosition(slots[0]);
    if (position === 'single' || position === 'slot_1') {
      return USER_ASSETS_TEMPLATE_TYPES.SINGLE;
    }
  }
  if (hasUserAssetsPositions(slots, 'left', 'right') && slots.length === 2) {
    return USER_ASSETS_TEMPLATE_TYPES.ONE_ROW_TWO;
  }
  if (hasUserAssetsPositions(slots, 'left_1', 'center_1', 'right_1') && slots.length === 3) {
    return USER_ASSETS_TEMPLATE_TYPES.ONE_ROW_THREE;
  }
  if (slots.length === 3 && hasUserAssetsPositions(slots, 'right_top', 'right_bottom')) {
    if (hasUserAssetsPositions(slots, 'left_large') || hasUserAssetsPositions(slots, 'left')) {
      return USER_ASSETS_TEMPLATE_TYPES.LEFT_ONE_RIGHT_TWO;
    }
  }
  if (hasUserAssetsPositions(slots, 'top_left', 'top_right', 'bottom_left', 'bottom_right') && slots.length === 4) {
    return USER_ASSETS_TEMPLATE_TYPES.TWO_ROW_FOUR;
  }
  if (
    hasUserAssetsPositions(slots, 'top_left', 'top_right', 'bottom_left', 'bottom_center', 'bottom_right') &&
    slots.length === 5
  ) {
    return USER_ASSETS_TEMPLATE_TYPES.TWO_ROW_FIVE;
  }
  if (slots.every((slot, index) => userAssetsSlotPosition(slot) === `slot_${index + 1}`)) {
    return USER_ASSETS_TEMPLATE_TYPES.HOTZONE;
  }
  return null;
}

function isHotzoneLayoutHint(text) {
  return /热区|自由布局|自由排布|自由发挥|freeform|hot ?zone/i.test(text);
}

function isAsymmetricLayoutHint(text) {
  return /左一右二|一大两小|主次入口|主入口|大卡|左右主次|1大2小/i.test(text);
}

function resolveUserAssetsHintText(requirements) {
  return [
    stringOr(requirements?.source_prompt),
    stringOr(requirements?.module_content?.user_assets),
    stringOr(requirements?.other_requirements),
    stringOr(requirements?.action_buttons?.custom),
  ]
    .filter(Boolean)
    .join(' ');
}

function resolveUserAssetsEntryCount(requirements, value, legacySchema) {
  const labels = resolveActionButtonLabels(requirements);
  const entryCount = Array.isArray(value?.entries) ? value.entries.filter(isPlainObject).length : 0;
  const layoutCount = userAssetsCardLayoutSlots(value?.card_layout).length;
  const legacyCount = Object.keys(legacySchema?.content?.slots_mapping ?? {}).length
    || userAssetsLegacySlots(legacySchema).length;
  return Math.max(labels.length, entryCount, layoutCount, legacyCount, 1);
}

function inferUserAssetsTemplateType(requirements, value, legacySchema, presetTemplateType = null) {
  const direct = normalizeUserAssetsTemplateType(value?.card_layout?.template_type);
  if (direct !== null) return direct;

  const explicitLegacy = templateTypeFromSlots(userAssetsCardLayoutSlots(value?.card_layout));
  if (explicitLegacy !== null) return explicitLegacy;

  const legacyTemplateType = templateTypeFromSlots(userAssetsLegacySlots(legacySchema));
  if (legacyTemplateType !== null) return legacyTemplateType;

  if (presetTemplateType !== null) {
    return presetTemplateType;
  }

  const count = resolveUserAssetsEntryCount(requirements, value, legacySchema);
  const hintText = resolveUserAssetsHintText(requirements);

  if (count > 5 || isHotzoneLayoutHint(hintText)) {
    return USER_ASSETS_TEMPLATE_TYPES.HOTZONE;
  }
  if (count <= 1) {
    return USER_ASSETS_TEMPLATE_TYPES.SINGLE;
  }
  if (count === 2) {
    return USER_ASSETS_TEMPLATE_TYPES.ONE_ROW_TWO;
  }
  if (count === 3) {
    return isAsymmetricLayoutHint(hintText)
      ? USER_ASSETS_TEMPLATE_TYPES.LEFT_ONE_RIGHT_TWO
      : USER_ASSETS_TEMPLATE_TYPES.ONE_ROW_THREE;
  }
  if (count === 4) {
    return USER_ASSETS_TEMPLATE_TYPES.TWO_ROW_FOUR;
  }
  if (count === 5) {
    return USER_ASSETS_TEMPLATE_TYPES.TWO_ROW_FIVE;
  }
  return USER_ASSETS_TEMPLATE_TYPES.HOTZONE;
}

function createUserAssetsCardLayout(templateType, count) {
  if (templateType === USER_ASSETS_TEMPLATE_TYPES.HOTZONE) {
    return {
      template_type: USER_ASSETS_TEMPLATE_TYPES.HOTZONE,
      slots: createHotzoneSlots(count),
    };
  }
  const spec = fixedUserAssetsLayoutSpec(templateType);
  return {
    template_type: templateType,
    slots: spec ? cloneUserAssetsSlots(spec.slots) : createHotzoneSlots(count),
  };
}

function createUserAssetsSubtitle(title, index) {
  const normalized = String(title ?? '').trim();
  if (/^[A-Za-z0-9 _-]+$/.test(normalized) && normalized) {
    return normalized.toUpperCase();
  }
  return `入口 ${index + 1}`;
}

function createUserAssetsEntriesFromLabels(labels, slots, designContext, styleGuide, requirements, templateType) {
  return slots.map((slot, index) => {
    const title = stringOr(labels[index], `入口 ${index + 1}`);
    return createDefaultUserAssetsEntry(
      {
        id: slot.id,
        slot_id: slot.id,
        title,
        subtitle: createUserAssetsSubtitle(title, index),
        icon: 'sparkles',
      },
      slot,
      designContext,
      styleGuide,
      requirements,
      templateType,
      index,
    );
  });
}

function createSeedSchema(requirements, styleGuide) {
  const req = coerceRequirements(requirements);
  const guide = coerceStyleGuide(styleGuide, req);
  const designContextBase = resolveDesignContextBase(guide, req);
  const accent = sanitizeHexColor(
    req.style.primary_color,
    designContextBase.color_palette.accent,
  );
  const designContext = {
    ...designContextBase,
    color_palette: {
      ...designContextBase.color_palette,
      accent,
    },
  };

  const specs = moduleSpecsFor(req);
  const modules = specs.map((spec, index) =>
    createSeedModule(spec, index, req, designContext, guide),
  );

  return {
    page_id: 'shop_home_page',
    version: '1.0.0',
    layout_mode: 'overlay',
    design_context: designContext,
    modules,
  };
}

function createSeedModule(spec, moduleIndex, requirements, designContext, styleGuide) {
  const moduleType = spec.type;
  const base = {
    id: `${moduleType}_${moduleIndex + 1}`,
    type: moduleType,
    source: 'ai',
    variant: 'default',
    layout: {
      offsetY: 0,
      zIndex: 1,
      paddingX: 0,
      paddingTop: 0,
      paddingBottom: 0,
    },
    editable: {
      data: true,
      layout: true,
      variant: true,
    },
  };

  if (moduleType === 'user_assets') {
    const userAssetsDefaults = resolvePresetUserAssetsDefaults(
      styleGuide,
      designContext.color_palette.accent,
      requirements,
    );
    const actionLabels = resolveActionButtonLabels(requirements);
    const entries = createUserAssetsEntriesFromLabels(
      actionLabels,
      userAssetsCardLayoutSlots(userAssetsDefaults.card_layout),
      designContext,
      styleGuide,
      requirements,
      userAssetsDefaults.card_layout.template_type,
    );
    return {
      ...base,
      data: {
        greeting: userAssetsDefaults.greeting,
        nickname: USER_ASSETS_DEFAULTS.nickname,
        upgrade_tip: userAssetsDefaults.upgrade_tip,
        progress_percent: 33,
        card_layout: userAssetsDefaults.card_layout,
        entries,
      },
    };
  }

  const itemCount =
    moduleType === 'top_slider'
      ? spec.itemCount ?? requirements.counts.sliderCount
      : moduleType === 'goods'
        ? spec.itemCount ?? requirements.counts.goodsCount
        : 1;
  const mode =
    moduleType === 'banner'
      ? 'single'
      : moduleType === 'top_slider' && itemCount > 1
        ? 'carousel_poster'
        : 'single';

  return {
    ...base,
    data: {
      mode,
      height: defaultHeightForModule(moduleType),
      auto_play_ms:
        moduleType === 'top_slider' && itemCount > 1
          ? 3000
          : undefined,
      items: Array.from({ length: itemCount }, (_, index) =>
        createSeedImageItem(spec, index, requirements, designContext, styleGuide),
      ),
    },
  };
}

function createSeedImageItem(spec, index, requirements, designContext, styleGuide) {
  const moduleType = spec.type;
  const promptSchema = createDefaultImagePromptSchema(
    spec,
    requirements,
    designContext,
    styleGuide,
    index,
  );
  const base = {
    id: `${moduleType}_${index + 1}`,
    image: '',
    image_prompt_schema: promptSchema,
    reference_images: styleGuide?.reference_images?.length ? [...styleGuide.reference_images] : undefined,
    alt: promptSchema.content.title || `${storefrontModuleLabel(moduleType)} ${index + 1}`,
    aspect_ratio: promptSchema.layout.ratio,
  };
  if (moduleType === 'banner') {
    return {
      ...base,
      asset_type: 'png',
      entry_purpose: '首页入口',
    };
  }
  return base;
}

function createDefaultImagePromptSchema(spec, requirements, designContext, styleGuide, index = 0) {
  const moduleType = spec.type;
  const brandName = requirements.style.brand_name || '店铺品牌';
  const moduleContent = stringOr(spec.content, requirements.module_content?.[moduleType] || '');
  const accent = designContext.color_palette.accent;
  const backgroundColor =
    moduleType === 'goods'
      ? designContext.color_palette.card_subtle
      : designContext.color_palette.bg;
  const type = IMAGE_PROMPT_TYPE_MAP[moduleType];
  const ratio =
    moduleType === 'image_ad'
      ? normalizeAspectRatioHint(spec.aspectRatio, IMAGE_RATIO_MAP.image_ad)
      : IMAGE_RATIO_MAP[moduleType];
  const structure = IMAGE_STRUCTURE_MAP[moduleType];
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
  const description = moduleContent || `${brandName} 店铺首页模块`;
  const styleTone = resolvePromptStyleTone(requirements, styleGuide);

  const promptSchema = {
    type,
    version: '1.0',
    template:
      moduleType === 'banner'
        ? 'promotion'
        : moduleType === 'shop_info'
          ? 'brand'
          : moduleType === 'image_ad'
            ? 'promotion'
          : 'product',
    layout: {
      ratio,
      structure,
      padding: 24,
      full_bleed: true,
    },
    style: {
      background_type:
        moduleType === 'banner'
          ? 'graphic_blocks'
          : styleGuide?.preset_id === 'bakery-handdrawn-cream'
          ? 'solid'
          : moduleType === 'goods'
            ? 'solid'
            : 'gradient',
      background_color: backgroundColor,
      primary_color: accent,
      accent_color: accent,
      text_color: designContext.color_palette.text_primary,
      style_tone: styleTone,
      visual_feel: moduleType === 'banner' ? 'light_campaign_graphic' : 'realistic_ui',
    },
    product: {
      name:
        moduleType === 'goods'
          ? `商品 ${index + 1}`
          : moduleType === 'banner'
            ? '活动入口'
            : moduleType === 'image_ad'
              ? '参考广告块'
            : brandName,
      category: inferCategory(requirements.style.industry),
      visual_type: moduleType === 'banner' ? 'graphic' : 'photo',
      scene:
        moduleType === 'shop_info'
          ? 'composition'
          : moduleType === 'banner'
            ? 'landscape_entry'
            : moduleType === 'image_ad'
              ? 'composition'
            : 'single',
      elements: moduleContent ? [moduleContent] : [],
    },
    content: {
      title,
      subtitle,
      description,
      tags:
        moduleType === 'top_slider' || moduleType === 'shop_info' || moduleType === 'banner'
          ? []
          : ['热卖'],
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
      full_bleed: true,
      ui_only: true,
      ...(moduleType === 'top_slider'
        ? {
            poster_like: true,
            no_bottom_panel: true,
            no_button_ui: true,
            no_tag_chips: true,
            no_dense_text: true,
          }
        : moduleType === 'banner'
          ? {
              no_button_ui: true,
              no_tag_chips: true,
              no_dense_text: true,
              no_price_text: true,
              no_coupon_wall: true,
              lightweight_copy: true,
              visually_distinct_from_goods: true,
              prefer_graphic_blocks: true,
              no_product_showcase_background: true,
            }
          : moduleType === 'image_ad'
            ? {
                no_logo: true,
                keep_reference_composition: true,
              }
          : {}),
      ...modulePolicyConstraints(moduleType),
    },
  };

  if (imagePromptAllowsBrand(moduleType)) {
    promptSchema.brand = {
      name: brandName,
      slogan: requirements.style.tone || '',
      logo_position: moduleType === 'shop_info' ? 'bottom' : 'corner',
    };
  }

  return promptSchema;
}

function slotSizeSpecForUserAssetsSlot(slot) {
  const key = stringOr(slot?.size, 'small');
  return USER_ASSETS_SLOT_SIZE_SPECS[key] ?? USER_ASSETS_SLOT_SIZE_SPECS.small;
}

function createDefaultUserAssetsEntryPromptSchema(
  entrySeed,
  slot,
  designContext,
  styleGuide,
  requirements,
  templateType,
  index = 0,
) {
  const sizeSpec = slotSizeSpecForUserAssetsSlot(slot);
  const styleTone = resolvePromptStyleTone(requirements, styleGuide);
  return {
    type: 'user_asset_entry',
    version: '1.0',
    template: templateType === USER_ASSETS_TEMPLATE_TYPES.HOTZONE ? 'hotzone_entry' : 'entry_card',
    layout: {
      template_type: templateType,
      slot_id: slot.id,
      ratio: sizeSpec.ratio,
      structure:
        templateType === USER_ASSETS_TEMPLATE_TYPES.HOTZONE ? 'hotzone_freeform' : 'storefront_entry_card',
      card_size_px:
        templateType === USER_ASSETS_TEMPLATE_TYPES.HOTZONE
          ? null
          : { width: sizeSpec.width, height: sizeSpec.height },
    },
    style: {
      background_type: 'solid',
      background_color: '#FFFFFF',
      primary_color: designContext.color_palette.accent,
      accent_color: designContext.color_palette.accent,
      text_color: designContext.color_palette.text_primary,
      style_tone: styleTone,
      visual_feel:
        templateType === USER_ASSETS_TEMPLATE_TYPES.HOTZONE
          ? 'storefront_hotzone_entry'
          : 'storefront_entry_card',
    },
    content: {
      title: stringOr(entrySeed?.title, `入口 ${index + 1}`),
      subtitle: stringOr(entrySeed?.subtitle, createUserAssetsSubtitle(entrySeed?.title, index)),
      description: stringOr(requirements?.module_content?.user_assets, '客户资产功能入口'),
    },
    entry: {
      icon: stringOr(entrySeed?.icon, 'sparkles'),
      title: stringOr(entrySeed?.title, `入口 ${index + 1}`),
      subtitle: stringOr(entrySeed?.subtitle, createUserAssetsSubtitle(entrySeed?.title, index)),
      role: stringOr(slot?.role, 'sub_action'),
      size: stringOr(slot?.size, 'small'),
      slot_id: stringOr(slot?.id, `slot_${index + 1}`),
    },
    constraints: {
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
      follow_page_icon_style: true,
      lock_card_size: templateType !== USER_ASSETS_TEMPLATE_TYPES.HOTZONE,
    },
  };
}

function normalizeUserAssetsEntryPromptSchema(input, fallback) {
  const layout = isPlainObject(input?.layout) ? input.layout : {};
  const style = isPlainObject(input?.style) ? input.style : {};
  const content = isPlainObject(input?.content) ? input.content : {};
  const entry = isPlainObject(input?.entry) ? input.entry : {};
  const constraints = isPlainObject(input?.constraints) ? input.constraints : {};

  return {
    type: stringOr(input?.type, fallback.type),
    version: stringOr(input?.version, fallback.version),
    template: stringOr(input?.template, fallback.template),
    layout: {
      ...fallback.layout,
      ...layout,
      ratio: stringOr(layout.ratio, fallback.layout.ratio),
      structure: stringOr(layout.structure, fallback.layout.structure),
      template_type:
        normalizeUserAssetsTemplateType(layout.template_type) ?? fallback.layout.template_type,
      slot_id: stringOr(layout.slot_id, fallback.layout.slot_id),
    },
    style: {
      background_type: stringOr(style.background_type, fallback.style.background_type),
      background_color: stringOr(style.background_color, fallback.style.background_color),
      primary_color: sanitizeHexColor(style.primary_color, fallback.style.primary_color),
      accent_color: sanitizeHexColor(style.accent_color, fallback.style.accent_color),
      text_color: sanitizeHexColor(style.text_color, fallback.style.text_color),
      style_tone: stringOr(style.style_tone, fallback.style.style_tone),
      visual_feel: stringOr(style.visual_feel, fallback.style.visual_feel),
    },
    content: {
      title: stringOr(content.title, fallback.content.title),
      subtitle: stringOr(content.subtitle, fallback.content.subtitle),
      description: stringOr(content.description, fallback.content.description),
    },
    entry: {
      icon: stringOr(entry.icon, fallback.entry.icon),
      title: stringOr(entry.title, fallback.entry.title),
      subtitle: stringOr(entry.subtitle, fallback.entry.subtitle),
      role: stringOr(entry.role, fallback.entry.role),
      size: stringOr(entry.size, fallback.entry.size),
      slot_id: stringOr(entry.slot_id, fallback.entry.slot_id),
    },
    constraints: {
      ...fallback.constraints,
      ...constraints,
    },
  };
}

function createDefaultUserAssetsEntry(
  entrySeed,
  slot,
  designContext,
  styleGuide,
  requirements,
  templateType,
  index = 0,
) {
  const promptSchema = createDefaultUserAssetsEntryPromptSchema(
    entrySeed,
    slot,
    designContext,
    styleGuide,
    requirements,
    templateType,
    index,
  );
  return {
    id: stringOr(entrySeed?.id, `user_assets_entry_${index + 1}`),
    slot_id: stringOr(entrySeed?.slot_id, slot.id),
    title: stringOr(entrySeed?.title, promptSchema.entry.title),
    subtitle: stringOr(entrySeed?.subtitle, promptSchema.entry.subtitle),
    icon: stringOr(entrySeed?.icon, promptSchema.entry.icon),
    image: stringOr(entrySeed?.image),
    image_prompt_schema: normalizeUserAssetsEntryPromptSchema(
      entrySeed?.image_prompt_schema,
      promptSchema,
    ),
    reference_images: normalizeReferenceImages(
      Array.isArray(entrySeed?.reference_images)
        ? entrySeed.reference_images
        : Array.isArray(styleGuide?.reference_images)
          ? styleGuide.reference_images
          : [],
    ),
    alt: stringOr(entrySeed?.alt, promptSchema.content.title),
    no_cache: entrySeed?.no_cache === true,
  };
}

function resolveDesignContextBase(styleGuide, requirements) {
  const presetContext = styleGuide?.schema_defaults?.design_context;
  return {
    ...DEFAULT_DESIGN_CONTEXT,
    ...(isPlainObject(presetContext) ? presetContext : {}),
    theme: stringOr(presetContext?.theme, buildThemeLabel(requirements)),
    color_palette: {
      ...DEFAULT_DESIGN_CONTEXT.color_palette,
      ...(isPlainObject(presetContext?.color_palette) ? presetContext.color_palette : {}),
    },
    page_width: 375,
  };
}

function resolvePresetUserAssetsDefaults(styleGuide, accent, requirements) {
  const preset = styleGuide?.schema_defaults?.user_assets;
  const preferredTemplateType = normalizeUserAssetsTemplateType(preset?.card_layout?.template_type);
  const cardLayout = normalizeUserAssetsCardLayout(
    { card_layout: preset?.card_layout },
    requirements,
    null,
    preferredTemplateType,
  );

  return {
    greeting: stringOr(preset?.greeting, USER_ASSETS_DEFAULTS.greeting),
    upgrade_tip: stringOr(preset?.upgrade_tip, '完善会员等级和权益，提升复购效率。'),
    card_layout: cardLayout,
    visual_style: {
      design_principle: stringOr(preset?.visual_style?.design_principle, 'minimal_ui'),
      brand_tone: stringOr(preset?.visual_style?.brand_tone, 'premium'),
      color_system: {
        usage: {
          icon: preset?.visual_style?.color_system?.usage?.icon !== false,
          accent: preset?.visual_style?.color_system?.usage?.accent !== false,
          background: preset?.visual_style?.color_system?.usage?.background === true,
        },
      },
      icon: {
        style: stringOr(preset?.visual_style?.icon?.style, 'flat_duotone'),
        shape: stringOr(preset?.visual_style?.icon?.shape, 'rounded'),
        stroke: stringOr(preset?.visual_style?.icon?.stroke, 'none'),
      },
      block: {
        radius: toNumber(preset?.visual_style?.block?.radius, 22),
        shadow: stringOr(preset?.visual_style?.block?.shadow, 'soft'),
      },
      typography: {
        title_case: stringOr(preset?.visual_style?.typography?.title_case, 'chinese'),
        subtitle_case: stringOr(preset?.visual_style?.typography?.subtitle_case, 'uppercase'),
      },
    },
    accent,
  };
}

function normalizeStorefrontSchema(input, requirements, styleGuide) {
  const root = isPlainObject(input) && isPlainObject(input.schema) ? input.schema : input;
  const source = isPlainObject(root) ? root : {};
  const req = coerceRequirements(requirements);
  const guide = coerceStyleGuide(styleGuide, req);
  const designContextBase = resolveDesignContextBase(guide, req);
  const accent = sanitizeHexColor(
    source.design_context?.color_palette?.accent ?? req.style.primary_color,
    designContextBase.color_palette.accent,
  );
  const designContext = normalizeDesignContext(source.design_context, accent, req, guide);
  const modulesInput = Array.isArray(source.modules) ? source.modules : [];
  const modules = modulesInput
    .map((module, index) => normalizeModule(module, index, designContext, req, guide))
    .filter(Boolean);

  return {
    page_id: stringOr(source.page_id, 'shop_home_page'),
    version: stringOr(source.version, '1.0.0'),
    layout_mode: source.layout_mode === 'flow' ? 'flow' : 'overlay',
    design_context: designContext,
    modules: modules.length > 0 ? modules : createSeedSchema(req, guide).modules,
  };
}

function normalizeDesignContext(value, accent, requirements, styleGuide) {
  const base = resolveDesignContextBase(styleGuide, requirements);
  const colors = isPlainObject(value?.color_palette) ? value.color_palette : {};
  return {
    theme: stringOr(value?.theme, base.theme),
    color_palette: {
      bg: stringOr(colors.bg, base.color_palette.bg),
      card_bg: stringOr(colors.card_bg, base.color_palette.card_bg),
      card_subtle: stringOr(colors.card_subtle, base.color_palette.card_subtle),
      text_primary: stringOr(colors.text_primary, base.color_palette.text_primary),
      text_secondary: stringOr(colors.text_secondary, base.color_palette.text_secondary),
      accent,
    },
    radius: stringOr(value?.radius, base.radius),
    shadow: stringOr(value?.shadow, base.shadow),
    spacing: toNumber(value?.spacing, base.spacing),
    page_width: 375,
  };
}

function normalizeModule(module, index, designContext, requirements, styleGuide) {
  if (!isPlainObject(module) || !HOMEPAGE_MODULES.includes(module.type)) {
    return null;
  }
  const type = module.type;
  const orderedSpecs = moduleSpecsFor(requirements);
  const spec =
    orderedSpecs[index]?.type === type
      ? orderedSpecs[index]
      : moduleSpecForType(
          requirements,
          type,
          orderedSpecs
            .slice(0, index + 1)
            .filter((entry) => entry.type === type).length - 1,
        ) ?? { type, content: stringOr(requirements?.module_content?.[type]) };
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
      data: normalizeUserAssetsData(module.data, designContext, styleGuide, requirements),
    };
  }

  return {
    ...base,
    data: normalizeImageModuleData(spec, module.data, requirements, designContext, styleGuide),
  };
}

function normalizeLayout(value) {
  return {
    offsetY: toNumber(value?.offsetY, 0),
    zIndex: toNumber(value?.zIndex, 1),
    paddingX: toNumber(value?.paddingX, 0),
    paddingTop: toNumber(value?.paddingTop, 0),
    paddingBottom: toNumber(value?.paddingBottom, 0),
  };
}

function normalizeEditable(value) {
  const out = {};
  if (isPlainObject(value)) {
    for (const [key, flag] of Object.entries(value)) {
      if (typeof flag === 'boolean') out[key] = flag;
    }
  }
  return Object.keys(out).length > 0
    ? out
    : {
        data: true,
        layout: true,
        variant: true,
      };
}

function normalizeImageModuleData(spec, value, requirements, designContext, styleGuide) {
  const type = spec.type;
  const req = coerceRequirements(requirements);
  const mode = normalizeImageModuleMode(value?.mode, type, value?.items);
  const itemSeedCount =
    type === 'top_slider'
      ? spec.itemCount ?? req.counts.sliderCount
      : type === 'goods'
        ? spec.itemCount ?? req.counts.goodsCount
        : 1;
  const items = Array.isArray(value?.items)
    ? value.items
        .filter(isPlainObject)
        .map((item, index) => normalizeImageItem(spec, item, index, req, designContext, styleGuide))
    : [];
  const normalizedItems = items.length > 0
    ? items
    : Array.from({ length: Math.max(1, itemSeedCount) }, (_, index) =>
        createSeedImageItem(spec, index, req, designContext, styleGuide),
      );

  const result = {
    mode,
    height: toNumber(value?.height, defaultHeightForModule(type)),
    items: normalizedItems,
  };

  if (mode === 'carousel_poster' || mode === 'dual_carousel') {
    result.auto_play_ms = toPositiveInteger(value?.auto_play_ms, type === 'top_slider' ? 3000 : 2600);
  } else if (typeof value?.auto_play_ms === 'number' && Number.isFinite(value.auto_play_ms)) {
    result.auto_play_ms = value.auto_play_ms;
  }

  return result;
}

function normalizeImageItem(spec, item, index, requirements, designContext, styleGuide) {
  const type = spec.type;
  const fallback = createSeedImageItem(spec, index, requirements, designContext, styleGuide);
  const promptSchema = isPlainObject(item.image_prompt_schema)
    ? item.image_prompt_schema
    : fallback.image_prompt_schema;
  const normalized = {
    id: stringOr(item.id, fallback.id),
    image: stringOr(item.image),
    image_prompt_schema: normalizePromptSchema(type, promptSchema, fallback.image_prompt_schema),
    reference_images: normalizeReferenceImages(
      Array.isArray(item.reference_images)
        ? item.reference_images
        : fallback.reference_images ?? [],
    ),
    no_cache: item.no_cache === true,
    alt: stringOr(item.alt, fallback.alt),
    aspect_ratio:
      type === 'image_ad'
        ? normalizeAspectRatioHint(item.aspect_ratio, fallback.aspect_ratio)
        : stringOr(item.aspect_ratio, IMAGE_RATIO_MAP[type]),
  };

  if (type === 'banner') {
    normalized.asset_type = item.asset_type === 'gif' ? 'gif' : 'png';
    normalized.entry_purpose = stringOr(item.entry_purpose, '首页入口');
  }

  return normalized;
}

function normalizePromptSchema(type, input, fallback) {
  const layout = isPlainObject(input.layout) ? input.layout : {};
  const style = isPlainObject(input.style) ? input.style : {};
  const product = isPlainObject(input.product) ? input.product : {};
  const content = isPlainObject(input.content) ? input.content : {};
  const promotion = isPlainObject(input.promotion) ? input.promotion : {};
  const brand = isPlainObject(input.brand) ? input.brand : {};
  const constraints = isPlainObject(input.constraints) ? input.constraints : {};

  const normalized = {
    type: stringOr(input.type, fallback.type),
    version: stringOr(input.version, fallback.version),
    template: stringOr(input.template, fallback.template),
    layout: {
      ratio: stringOr(layout.ratio, fallback.layout.ratio),
      structure: stringOr(layout.structure, fallback.layout.structure),
      padding: toNumber(layout.padding, fallback.layout.padding),
      full_bleed: layout.full_bleed !== false,
    },
    style: {
      background_type: type === 'banner'
        ? fallback.style.background_type
        : stringOr(style.background_type, fallback.style.background_type),
      background_color: stringOr(style.background_color, fallback.style.background_color),
      primary_color: sanitizeHexColor(style.primary_color, fallback.style.primary_color),
      accent_color: sanitizeHexColor(style.accent_color, fallback.style.accent_color),
      text_color: sanitizeHexColor(style.text_color, fallback.style.text_color),
      style_tone: stringOr(style.style_tone, fallback.style.style_tone),
      visual_feel: type === 'banner'
        ? fallback.style.visual_feel
        : stringOr(style.visual_feel, fallback.style.visual_feel),
    },
    product: {
      name: stringOr(product.name, fallback.product.name),
      category: stringOr(product.category, fallback.product.category),
      visual_type: type === 'banner'
        ? fallback.product.visual_type
        : stringOr(product.visual_type, fallback.product.visual_type),
      scene: type === 'banner'
        ? fallback.product.scene
        : stringOr(product.scene, fallback.product.scene),
      elements: Array.isArray(product.elements)
        ? product.elements.filter((value) => typeof value === 'string')
        : fallback.product.elements,
    },
    content: {
      title: stringOr(content.title, fallback.content.title),
      subtitle: stringOr(content.subtitle, fallback.content.subtitle),
      description: stringOr(content.description, fallback.content.description),
      tags: type === 'banner'
        ? []
        : Array.isArray(content.tags)
          ? content.tags.filter((value) => typeof value === 'string')
          : fallback.content.tags,
    },
    promotion: type === 'banner'
      ? {
          price: '',
          original_price: '',
          discount: '',
          badge: '',
          cta: '',
        }
      : {
          price: stringOr(promotion.price, fallback.promotion.price),
          original_price: stringOr(promotion.original_price, fallback.promotion.original_price),
          discount: stringOr(promotion.discount, fallback.promotion.discount),
          badge: stringOr(promotion.badge, fallback.promotion.badge),
          cta: stringOr(promotion.cta, fallback.promotion.cta),
        },
    constraints: {
      ...fallback.constraints,
      ...constraints,
      ...modulePolicyConstraints(type),
    },
  };

  if (imagePromptAllowsBrand(type)) {
    const fallbackBrand = isPlainObject(fallback.brand) ? fallback.brand : {};
    normalized.brand = {
      name: stringOr(brand.name, fallbackBrand.name),
      slogan: stringOr(brand.slogan, fallbackBrand.slogan),
      logo_position: stringOr(brand.logo_position, fallbackBrand.logo_position),
    };
  }

  return normalized;
}

function normalizeUserAssetsData(value, designContext, styleGuide, requirements) {
  const userAssetsDefaults = resolvePresetUserAssetsDefaults(
    styleGuide,
    designContext.color_palette.accent,
    requirements,
  );
  const legacySchema = isPlainObject(value?.body_image_schema) ? value.body_image_schema : null;
  const cardLayout = normalizeUserAssetsCardLayout(
    value,
    requirements,
    legacySchema,
    userAssetsDefaults.card_layout.template_type,
  );
  return {
    greeting: stringOr(value?.greeting, userAssetsDefaults.greeting),
    nickname: stringOr(value?.nickname, USER_ASSETS_DEFAULTS.nickname),
    avatar: stringOr(value?.avatar),
    upgrade_tip: stringOr(value?.upgrade_tip, userAssetsDefaults.upgrade_tip),
    progress_percent: toNumber(value?.progress_percent, 33),
    height: toNumber(value?.height, 188),
    card_layout: cardLayout,
    entries: normalizeUserAssetsEntries(
      value,
      cardLayout,
      designContext,
      styleGuide,
      requirements,
    ),
    body_image: stringOr(value?.body_image),
    body_image_no_cache: value?.body_image_no_cache === true,
    body_alt: stringOr(value?.body_alt, USER_ASSETS_DEFAULTS.bodyAlt),
    body_image_schema: legacySchema ?? undefined,
  };
}

function normalizeUserAssetsCardLayout(value, requirements, legacySchema, preferredTemplateType = null) {
  const templateType = inferUserAssetsTemplateType(
    requirements,
    value,
    legacySchema,
    preferredTemplateType,
  );
  const count = resolveUserAssetsEntryCount(requirements, value, legacySchema);
  return createUserAssetsCardLayout(templateType, count);
}

function legacyUserAssetsMapping(schema) {
  return isPlainObject(schema?.content?.slots_mapping) ? schema.content.slots_mapping : {};
}

function legacyUserAssetsSourceForSlot(mapping, slotId) {
  const aliases = {
    left_large: ['left_large', 'left', 'primary'],
    right_top: ['right_top', 'secondary_1'],
    right_bottom: ['right_bottom', 'secondary_2'],
    left: ['left', 'primary'],
    right: ['right', 'secondary_1'],
    left_1: ['left_1', 'primary'],
    center_1: ['center_1', 'secondary_1'],
    right_1: ['right_1', 'secondary_2'],
    top_left: ['top_left', 'primary'],
    top_right: ['top_right', 'secondary_1'],
    bottom_left: ['bottom_left', 'secondary_2'],
    bottom_center: ['bottom_center', 'secondary_3'],
    bottom_right: ['bottom_right', 'secondary_4'],
    single: ['single', 'primary', 'slot_1'],
  };
  const candidates = aliases[slotId] ?? [slotId];
  for (const candidate of candidates) {
    if (isPlainObject(mapping?.[candidate])) {
      return mapping[candidate];
    }
  }
  return null;
}

function normalizeUserAssetsEntries(value, cardLayout, designContext, styleGuide, requirements) {
  const slots = userAssetsCardLayoutSlots(cardLayout);
  const labels = resolveActionButtonLabels(requirements);
  const inputEntries = Array.isArray(value?.entries) ? value.entries.filter(isPlainObject) : [];
  const legacyMapping = legacyUserAssetsMapping(value?.body_image_schema);
  const entriesBySlotId = new Map();
  for (const entry of inputEntries) {
    const slotId = stringOr(entry.slot_id || entry.id);
    if (slotId) {
      entriesBySlotId.set(slotId, entry);
    }
  }

  return slots.map((slot, index) => {
    const legacySource = legacyUserAssetsSourceForSlot(legacyMapping, slot.id);
    const source =
      entriesBySlotId.get(slot.id)
      ?? legacySource
      ?? {
        id: slot.id,
        slot_id: slot.id,
        title: stringOr(labels[index], `入口 ${index + 1}`),
        subtitle: createUserAssetsSubtitle(labels[index], index),
        icon: 'sparkles',
      };
    return createDefaultUserAssetsEntry(
      source,
      slot,
      designContext,
      styleGuide,
      requirements,
      cardLayout.template_type,
      index,
    );
  });
}

function validateStorefrontSchema(schema, requirements) {
  const report = validateHomepageSchema(schema, requirements);
  const errors = [...report.errors];
  const topSlider = schema.modules.find((module) => module.type === 'top_slider');
  const goods = schema.modules.find((module) => module.type === 'goods');
  const sliderCount = requirements?.counts?.sliderCount;
  const goodsCount = requirements?.counts?.goodsCount;

  if (topSlider && typeof sliderCount === 'number') {
    const count = Array.isArray(topSlider.data?.items) ? topSlider.data.items.length : 0;
    if (count !== sliderCount) {
      errors.push(`top_slider.data.items must contain exactly ${sliderCount} item(s), found ${count}.`);
    }
    if (count === 1 && topSlider.data?.mode !== 'single') {
      errors.push('top_slider.data.mode must be "single" when there is only one hero slide.');
    }
    if (count > 1 && topSlider.data?.mode !== 'carousel_poster') {
      errors.push('top_slider.data.mode must be "carousel_poster" when there are multiple hero slides.');
    }
  }

  if (goods && typeof goodsCount === 'number') {
    const count = Array.isArray(goods.data?.items) ? goods.data.items.length : 0;
    if (count !== goodsCount) {
      errors.push(`goods.data.items must contain exactly ${goodsCount} item(s), found ${count}.`);
    }
  }

  return errors;
}

function deriveStatus(schema, validationErrors, fallbackStatus) {
  if (validationErrors.length > 0) return 'schema-error';
  if (!schema) return fallbackStatus || 'idle';
  if (hasGeneratedAssets(schema)) return 'assets-ready';
  return 'schema-ready';
}

function hasImmersiveHero(schema) {
  const hero = Array.isArray(schema?.modules) ? schema.modules[0] : null;
  if (!hero || hero.type !== 'top_slider') return false;
  const items = Array.isArray(hero.data?.items) ? hero.data.items : [];
  return items.some((item) => hasImageAsset(item));
}

function hasGeneratedAssets(schema) {
  return schema.modules.some((module) => {
    if (module.type === 'user_assets') {
      return Boolean(module.data?.body_image)
        || (Array.isArray(module.data?.entries)
          ? module.data.entries.some((entry) => Boolean(entry?.image))
          : false);
    }
    return Array.isArray(module.data?.items)
      ? module.data.items.some((item) => Boolean(item.image))
      : false;
  });
}

async function ensurePreviewArtifacts(projectDir, projectId, schema, requirements, validationErrors, styleGuide) {
  const screenHtml = compileStorefrontScreen({
    projectId,
    schema,
    requirements,
    validationErrors,
  });
  await writeTextIfChanged(
    path.join(projectDir, SHOP_HOME_PAGE_SCREEN_FILE),
    screenHtml,
  );
  const screenStat = await statMaybe(path.join(projectDir, SHOP_HOME_PAGE_SCREEN_FILE));
  const previewHtml = compileStorefrontPreview({
    projectId,
    previewUpdatedAt: screenStat?.mtimeMs ?? Date.now(),
    designContext: schema?.design_context ?? resolveDesignContextBase(styleGuide, requirements),
  });
  await writeTextIfChanged(
    path.join(projectDir, SHOP_HOME_PAGE_PREVIEW_FILE),
    previewHtml,
  );
}

async function persistSchema(projectDir, projectId, schema, requirements, styleGuide) {
  await Promise.all([
    fs.writeFile(
      path.join(projectDir, SHOP_HOME_PAGE_SCHEMA_FILE),
      `${JSON.stringify(schema, null, 2)}\n`,
      'utf8',
    ),
    ensurePreviewArtifacts(projectDir, projectId, schema, requirements, [], styleGuide),
  ]);
}

function compileStorefrontPreview({ projectId, previewUpdatedAt, designContext }) {
  const screenPath = `/api/projects/${encodeURIComponent(projectId)}/files/${encodeURIComponent(SHOP_HOME_PAGE_SCREEN_FILE)}?v=${Math.round(previewUpdatedAt)}`;
  const bg = stringOr(designContext?.color_palette?.bg, DEFAULT_DESIGN_CONTEXT.color_palette.bg);
  const accent = stringOr(designContext?.color_palette?.accent, DEFAULT_DESIGN_CONTEXT.color_palette.accent);
  const text = stringOr(designContext?.color_palette?.text_primary, DEFAULT_DESIGN_CONTEXT.color_palette.text_primary);
  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>店铺首页预览</title>
    <style>
      * { box-sizing: border-box; }
      html, body { margin: 0; min-height: 100%; }
      body {
        display: grid;
        place-items: center;
        min-height: 100vh;
        padding: 24px;
        background:
          radial-gradient(circle at top, ${hexToRgba(accent, 0.18)}, transparent 34%),
          linear-gradient(180deg, ${hexToRgba(bg, 0.96)} 0%, ${hexToRgba(bg, 1)} 100%);
        font: 14px/1.5 -apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif;
        color: ${text};
      }
      .preview-stage {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;
      }
      .preview-caption {
        font-size: 11px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: rgba(31, 41, 55, 0.58);
      }
      .preview-shell {
        position: relative;
        width: 390px;
        height: 844px;
      }
      .preview-device {
        position: relative;
        width: 390px;
        height: 844px;
        border-radius: 56px;
        padding: 12px;
        background:
          linear-gradient(160deg, #2a2a2c 0%, #1a1a1c 50%, #0e0e10 100%);
        box-shadow:
          0 0 0 1px rgba(255,255,255,0.04) inset,
          0 0 0 2px #000 inset,
          0 28px 60px -12px rgba(0,0,0,0.45),
          0 8px 20px -8px rgba(0,0,0,0.35);
        isolation: isolate;
      }
      .preview-device::before,
      .preview-device::after {
        content: "";
        position: absolute;
        width: 3px;
        top: 100px;
        bottom: 100px;
        background:
          linear-gradient(to bottom, transparent 0%, rgba(255,255,255,0.06) 8%, transparent 16%, transparent 84%, rgba(255,255,255,0.04) 92%, transparent 100%);
        pointer-events: none;
      }
      .preview-device::before { left: -1px; }
      .preview-device::after { right: -1px; }
      .preview-rail {
        position: absolute;
        width: 4px;
        background: #0a0a0c;
        border-radius: 2px;
      }
      .preview-rail-left-1 { left: -3px; top: 174px; height: 32px; }
      .preview-rail-left-2 { left: -3px; top: 220px; height: 60px; }
      .preview-rail-left-3 { left: -3px; top: 290px; height: 60px; }
      .preview-rail-right-1 { right: -3px; top: 250px; height: 100px; }
      .preview-island {
        position: absolute;
        top: 22px;
        left: 50%;
        transform: translateX(-50%);
        width: 124px;
        height: 36px;
        border-radius: 999px;
        background: #000;
        z-index: 5;
      }
      .preview-screen {
        position: relative;
        width: 100%;
        height: 100%;
        border-radius: 44px;
        overflow: hidden;
        background: ${bg};
      }
      .preview-statusbar {
        position: absolute;
        inset: 0 0 auto;
        z-index: 6;
        pointer-events: none;
        padding: ${SHOP_HOME_PAGE_PHONE_CHROME.statusBarPaddingTop}px ${SHOP_HOME_PAGE_PHONE_CHROME.statusBarPaddingX}px 0;
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        font-size: ${SHOP_HOME_PAGE_PHONE_CHROME.statusBarFontSize}px;
        line-height: ${SHOP_HOME_PAGE_PHONE_CHROME.statusBarLineHeight}px;
        font-weight: 600;
        letter-spacing: -0.01em;
        color: ${text};
      }
      .preview-statusbar__right {
        display: inline-flex;
        align-items: center;
        gap: ${SHOP_HOME_PAGE_PHONE_CHROME.statusBarGap}px;
      }
      .preview-statusbar__right svg {
        display: block;
        flex: none;
      }
      .preview-statusbar__battery {
        width: 25px;
        height: 11px;
      }
      .preview-inner {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        border: 0;
        background: ${bg};
      }
      .preview-home-indicator {
        position: absolute;
        left: 0;
        right: 0;
        bottom: 0;
        height: ${SHOP_HOME_PAGE_PHONE_CHROME.homeIndicatorHeight}px;
        z-index: 7;
        pointer-events: none;
      }
      .preview-home-indicator::after {
        content: "";
        position: absolute;
        left: 50%;
        bottom: ${SHOP_HOME_PAGE_PHONE_CHROME.homeIndicatorBottom}px;
        transform: translateX(-50%);
        width: ${SHOP_HOME_PAGE_PHONE_CHROME.homeIndicatorWidth}px;
        height: 5px;
        border-radius: 999px;
        background: #1a1916;
        opacity: 0.85;
      }
    </style>
  </head>
  <body>
    <div class="preview-stage">
      <div class="preview-caption">Workspace storefront runtime preview</div>
      <div class="preview-shell">
        <div class="preview-device">
          <span class="preview-rail preview-rail-left-1" aria-hidden="true"></span>
          <span class="preview-rail preview-rail-left-2" aria-hidden="true"></span>
          <span class="preview-rail preview-rail-left-3" aria-hidden="true"></span>
          <span class="preview-rail preview-rail-right-1" aria-hidden="true"></span>
          <span class="preview-island" aria-hidden="true"></span>
          <div class="preview-screen">
            <div class="preview-statusbar">
              <span>9:41</span>
              <span class="preview-statusbar__right">
                ${renderStatusSignalIcon()}
                ${renderStatusWifiIcon()}
                ${renderStatusBatteryIcon('preview-statusbar__battery')}
              </span>
            </div>
            <iframe
              class="preview-inner"
              title="店铺首页内屏"
              loading="lazy"
              sandbox="allow-scripts allow-same-origin"
              src="${escapeAttr(screenPath)}"
            ></iframe>
            <div class="preview-home-indicator" aria-hidden="true"></div>
          </div>
        </div>
      </div>
    </div>
  </body>
</html>`;
}

function compileStorefrontScreen({ projectId, schema, requirements, validationErrors }) {
  if (!schema) {
    return compileEmptyScreen(validationErrors.length > 0
      ? validationErrors.join('\n')
      : '请先通过左侧对话完成需求与视觉澄清，再生成页面结构文件。');
  }

  const resolved = resolvePageLayout(schema);
  const context = resolved.design_context;
  const bgSoft = hexToRgba(context.color_palette.bg, 0.96);
  const accentSoft = hexToRgba(context.color_palette.accent, 0.18);
  const shadowSoft = hexToRgba(context.color_palette.text_primary, 0.08);
  const immersiveHero = hasImmersiveHero(resolved);
  const errorBanner = validationErrors.length > 0
    ? `<div class="sf-error-banner">
        <strong>Schema validation warnings</strong>
        <pre>${escapeHtml(validationErrors.join('\n'))}</pre>
      </div>`
    : '';
  const modulesHtml = resolved.modules.map((module) =>
    renderModule(projectId, module, context),
  ).join('\n');

  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>店铺首页调试屏幕</title>
    <style>
      :root {
        --sf-bg: ${context.color_palette.bg};
        --sf-card-bg: ${context.color_palette.card_bg};
        --sf-card-subtle: ${context.color_palette.card_subtle};
        --sf-fg: ${context.color_palette.text_primary};
        --sf-muted: ${context.color_palette.text_secondary};
        --sf-accent: ${context.color_palette.accent};
        --sf-accent-soft: ${accentSoft};
        --sf-shadow-soft: ${shadowSoft};
        --sf-radius: ${context.radius};
        --sf-shadow: ${context.shadow};
        --sf-page-width: ${context.page_width}px;
      }
      * { box-sizing: border-box; }
      html, body { margin: 0; padding: 0; min-height: 100%; height: 100%; }
      body {
        background:
          radial-gradient(circle at top, var(--sf-accent-soft), transparent 34%),
          linear-gradient(180deg, ${bgSoft} 0%, var(--sf-bg) 100%);
        color: var(--sf-fg);
        font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif;
        -webkit-font-smoothing: antialiased;
        overflow: hidden;
      }
      .sf-screen {
        position: relative;
        height: 100vh;
        overflow: hidden;
      }
      .sf-scroll {
        position: absolute;
        inset: 0;
        overflow-y: auto;
        overflow-x: hidden;
        padding-bottom: 24px;
        scrollbar-width: none;
      }
      .sf-scroll::-webkit-scrollbar {
        width: 0;
        height: 0;
      }
      .sf-overlay {
        position: absolute;
        inset: 0 0 auto;
        z-index: 8;
        pointer-events: none;
        background: linear-gradient(180deg, ${hexToRgba(context.color_palette.bg, immersiveHero ? 0.14 : 0.86)} 0%, ${hexToRgba(context.color_palette.bg, immersiveHero ? 0.04 : 0.16)} 78%, ${hexToRgba(context.color_palette.bg, 0)} 100%);
        transition: background 220ms ease;
      }
      .sf-capsule-wrap {
        display: flex;
        justify-content: flex-end;
        padding: ${SHOP_HOME_PAGE_PHONE_CHROME.capsuleOffsetTop}px ${SHOP_HOME_PAGE_PHONE_CHROME.capsulePaddingX}px 0;
      }
      .sf-mini-capsule {
        width: 84px;
        height: 30px;
        border-radius: 15px;
        backdrop-filter: blur(18px) saturate(1.35);
        -webkit-backdrop-filter: blur(18px) saturate(1.35);
        border: 1px solid ${immersiveHero ? 'rgba(255,255,255,0.18)' : hexToRgba(context.color_palette.text_primary, 0.08)};
        background: rgba(255,255,255,0.88);
        box-shadow: 0 12px 28px ${hexToRgba(context.color_palette.text_primary, immersiveHero ? 0.06 : 0.08)};
        display: grid;
        align-items: center;
        grid-template-columns: 1fr 1px 1fr;
        padding: 0 8px;
        transition: border-color 220ms ease, box-shadow 220ms ease;
      }
      .sf-mini-capsule__left,
      .sf-mini-capsule__right {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 3px;
      }
      .sf-mini-capsule__left span {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: rgba(28,27,26,0.88);
      }
      .sf-mini-capsule__divider {
        width: 1px;
        height: 13px;
        background: rgba(28,27,26,0.1);
        justify-self: center;
      }
      .sf-mini-capsule__right span {
        position: relative;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        border: 2.5px solid rgba(28,27,26,0.9);
        display: block;
      }
      .sf-mini-capsule__right span::after {
        content: "";
        position: absolute;
        inset: 3px;
        border-radius: 50%;
        background: rgba(28,27,26,0.9);
      }
      .sf-screen.is-scrolled .sf-overlay {
        background: linear-gradient(180deg, ${hexToRgba(context.color_palette.bg, 0.9)} 0%, ${hexToRgba(context.color_palette.bg, 0.22)} 78%, ${hexToRgba(context.color_palette.bg, 0)} 100%);
      }
      .sf-screen.is-scrolled .sf-mini-capsule {
        border-color: ${hexToRgba(context.color_palette.text_primary, 0.12)};
        box-shadow: 0 12px 28px ${hexToRgba(context.color_palette.text_primary, 0.12)};
      }
      .sf-root {
        width: 100%;
        max-width: var(--sf-page-width);
        margin: 0 auto;
        background: transparent;
        border-radius: var(--sf-radius);
        overflow: hidden;
      }
      .sf-error-banner {
        margin: 12px 12px 0;
        padding: 12px 14px;
        border-radius: 12px;
        border: 1px solid rgba(220, 38, 38, 0.18);
        background: rgba(254, 242, 242, 0.92);
        color: #991b1b;
        box-shadow: 0 8px 24px rgba(220, 38, 38, 0.08);
      }
      .sf-error-banner strong { display: block; margin-bottom: 6px; }
      .sf-error-banner pre {
        margin: 0;
        white-space: pre-wrap;
        font: 12px/1.5 ui-monospace, "SF Mono", Menlo, monospace;
      }
      .sf-module {
        position: relative;
      }
      .sf-module__inner {
        position: relative;
      }
      .sf-image-fill,
      .sf-image-fill img {
        display: block;
        width: 100%;
        height: 100%;
      }
      .sf-placeholder {
        display: flex;
        flex-direction: column;
        width: 100%;
        height: 100%;
        overflow: hidden;
        padding: 18px;
        background:
          linear-gradient(180deg, rgba(255,255,255,0.98) 0%, var(--sf-accent-soft) 100%);
        color: var(--sf-fg);
      }
      .sf-placeholder__content {
        display: flex;
        flex-direction: column;
        height: 100%;
      }
      .sf-placeholder__top {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 12px;
      }
      .sf-placeholder__chip {
        display: inline-flex;
        align-items: center;
        height: 28px;
        padding: 0 12px;
        border-radius: 999px;
        border: 1px solid rgba(255,255,255,0.48);
        background: rgba(255,255,255,0.74);
        font-size: 11px;
        line-height: 16px;
        font-weight: 600;
      }
      .sf-placeholder__status {
        font-size: 11px;
        line-height: 16px;
        color: rgba(31,41,55,0.62);
      }
      .sf-placeholder__art {
        flex: 1;
        min-height: 0;
        display: flex;
        align-items: center;
        padding: 16px 0 12px;
      }
      .sf-placeholder__generic-image {
        width: 100%;
        height: 100%;
        min-height: 0;
        box-sizing: border-box;
        color: rgba(31,41,55,0.62);
        display: grid;
        place-items: center;
        gap: 10px;
      }
      .sf-placeholder__generic-image svg {
        width: 46px;
        height: 46px;
      }
      .sf-placeholder__generic-image span {
        font-size: 12px;
        line-height: 18px;
      }
      .sf-placeholder__generic-image.is-compact {
        gap: 6px;
      }
      .sf-placeholder__generic-image.is-compact svg {
        width: 32px;
        height: 32px;
      }
      .sf-placeholder__generic-image.is-compact span {
        font-size: 11px;
        line-height: 16px;
      }
      .sf-placeholder__footer {
        display: flex;
        flex-direction: column;
        gap: 4px;
        max-width: 76%;
      }
      .sf-placeholder__title {
        font-size: 13px;
        line-height: 18px;
        font-weight: 650;
      }
      .sf-placeholder__desc {
        font-size: 11px;
        line-height: 16px;
        color: rgba(31,41,55,0.62);
      }
      .sf-user-assets-placeholder {
        display: block;
        height: 100%;
        overflow: hidden;
        padding: 8px;
        background: linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(201,140,90,0.1) 100%);
      }
      .sf-top-slider,
      .sf-banner,
      .sf-shop-info {
        width: 100%;
      }
      .sf-carousel {
        position: relative;
        width: 100%;
        overflow: hidden;
      }
      .sf-carousel__item {
        display: none;
        opacity: 0;
        transition: opacity .45s ease;
      }
      .sf-carousel__item.is-active {
        display: block;
        position: relative;
        opacity: 1;
      }
      .sf-carousel__dots {
        position: absolute;
        left: 50%;
        bottom: 14px;
        transform: translateX(-50%);
        display: flex;
        gap: 6px;
      }
      .sf-carousel__dots span {
        width: 6px;
        height: 6px;
        border-radius: 999px;
        background: rgba(255,255,255,0.35);
      }
      .sf-carousel__dots span.is-active {
        background: rgba(255,255,255,0.92);
      }
      .sf-user-assets {
        display: flex;
        flex-direction: column;
        gap: 12px;
        min-height: 188px;
        padding: 6px 16px;
        width: 100%;
        background: var(--sf-card-bg);
        border-radius: var(--sf-radius);
        box-shadow: var(--sf-shadow);
      }
      .sf-user-assets__top {
        display: flex;
        justify-content: space-between;
        gap: 12px;
      }
      .sf-user-assets__greeting {
        margin-top: 10px;
        margin-bottom: 4px;
        font-size: 14px;
        line-height: 20px;
      }
      .sf-user-assets__name {
        font-size: 18px;
        font-weight: 650;
        line-height: 24px;
      }
      .sf-user-assets__code {
        flex-shrink: 0;
        margin-top: -35px;
        text-align: center;
      }
      .sf-user-assets__avatar {
        width: 58px;
        height: 58px;
        margin: 0 auto 8px;
        border-radius: 50%;
        border: 2px solid var(--sf-card-bg);
        box-sizing: border-box;
        display: block;
        object-fit: cover;
      }
      .sf-user-assets__pill {
        width: 76px;
        height: 24px;
        border-radius: 16px;
        background: #2f2f34;
        color: #fff;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        line-height: 18px;
      }
      .sf-user-assets__code-icon {
        width: 14px;
        height: 14px;
        margin-right: 2px;
      }
      .sf-user-assets__progress {
        width: 100%;
        height: 4px;
        background: #f2f3f5;
        border-radius: 3px;
        position: relative;
      }
      .sf-user-assets__progress > span {
        position: absolute;
        left: 0;
        top: 0;
        height: 4px;
        border-radius: 3px;
        background: #000;
      }
      .sf-user-assets__tip {
        font-size: 12px;
        line-height: 18px;
        color: var(--sf-muted);
      }
      .sf-user-assets__body {
        flex: 0 0 auto;
        border-radius: 6px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--sf-card-bg);
        overflow: hidden;
      }
      .sf-user-assets__body-image {
        display: block;
        width: 100%;
        height: 100%;
        object-fit: contain;
        object-position: center;
      }
      .sf-user-assets-card {
        width: 100%;
        height: 100%;
        overflow: hidden;
        border-radius: 20px;
        background: rgba(255,255,255,0.94);
      }
      .sf-user-assets-card__img {
        display: block;
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .sf-goods-stack {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .sf-goods-horizontal {
        display: flex;
        gap: 12px;
        overflow-x: auto;
        padding-bottom: 2px;
        scrollbar-width: none;
      }
      .sf-goods-horizontal::-webkit-scrollbar { display: none; }
      .sf-goods-horizontal__card {
        flex: 0 0 auto;
        overflow: hidden;
      }
      .sf-image-card {
        width: 100%;
        overflow: hidden;
      }
      .sf-carousel__item > img,
      .sf-goods-horizontal__card > img,
      .sf-image-card img {
        display: block;
        width: 100%;
        height: auto;
      }
    </style>
  </head>
  <body>
    <div class="sf-screen${immersiveHero ? ' is-immersive' : ''}" id="sfScreen">
      <div class="sf-overlay">
        <div class="sf-capsule-wrap" aria-hidden="true">
          ${renderMiniProgramCapsule()}
        </div>
      </div>
      <div class="sf-scroll" id="sfScroll">
        <main class="sf-root">
          ${errorBanner}
          ${modulesHtml}
        </main>
      </div>
    </div>
    <script>
      (function () {
        var screen = document.getElementById('sfScreen');
        var scrollRoot = document.getElementById('sfScroll');
        if (screen && scrollRoot) {
          var handleChrome = function () {
            var top = scrollRoot.scrollTop || 0;
            screen.classList.toggle('is-scrolled', top > 36);
          };
          handleChrome();
          scrollRoot.addEventListener('scroll', handleChrome, { passive: true });
        }
        var carousels = document.querySelectorAll('[data-carousel]');
        carousels.forEach(function (root) {
          var items = root.querySelectorAll('.sf-carousel__item');
          var dots = root.querySelectorAll('.sf-carousel__dots span');
          if (!items || items.length < 2) return;
          var index = 0;
          window.setInterval(function () {
            items[index].classList.remove('is-active');
            if (dots[index]) dots[index].classList.remove('is-active');
            index = (index + 1) % items.length;
            items[index].classList.add('is-active');
            if (dots[index]) dots[index].classList.add('is-active');
          }, 3000);
        });
      })();
    </script>
  </body>
</html>`;
}

function compileEmptyScreen(message) {
  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>店铺首页调试屏幕</title>
    <style>
      * { box-sizing: border-box; }
      html, body { margin: 0; min-height: 100%; }
      body {
        display: grid;
        place-items: center;
        min-height: 100vh;
        padding: 24px;
        background: #F9F9F9;
        color: #1f2937;
        font: 14px/1.6 -apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif;
      }
      .sf-empty {
        width: min(100%, 320px);
        padding: 18px 20px;
        border-radius: 18px;
        border: 1px solid rgba(31, 41, 55, 0.08);
        background: rgba(255,255,255,0.94);
        box-shadow: 0 16px 48px rgba(15, 23, 42, 0.08);
      }
      .sf-empty strong {
        display: block;
        margin-bottom: 8px;
        font-size: 16px;
      }
      .sf-empty pre {
        margin: 0;
        white-space: pre-wrap;
        font: 13px/1.6 -apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif;
        color: #6b7280;
      }
    </style>
  </head>
  <body>
    <div class="sf-empty">
      <strong>正在等待页面结构。</strong>
      <pre>${escapeHtml(message)}</pre>
    </div>
  </body>
</html>`;
}

function renderModule(projectId, module, designContext) {
  const inner = renderModuleInner(projectId, module, designContext);
  if (!inner) return '';
  const layout = module.layout ?? {};
  return `<section class="sf-module" style="${styleAttr({
    marginTop: `${layout.offsetY ?? 0}px`,
    zIndex: String(layout.zIndex ?? 1),
    paddingLeft: `${layout.paddingX ?? 0}px`,
    paddingRight: `${layout.paddingX ?? 0}px`,
    paddingTop: `${layout.paddingTop ?? 0}px`,
    paddingBottom: `${layout.paddingBottom ?? 0}px`,
  })}"><div class="sf-module__inner">${inner}</div></section>`;
}

function renderModuleInner(projectId, module, designContext) {
  if (module.type === 'user_assets') {
    return renderUserAssetsModule(projectId, module);
  }

  const data = module.data ?? {};
  const height = Math.max(80, toNumber(data.height, defaultHeightForModule(module.type)));
  const items = Array.isArray(data.items) ? data.items : [];

  if (data.mode === 'horizontal_scroll') {
    return `<div class="sf-goods-horizontal">${items
      .map((item) => {
        const width = Math.min(height * 0.86, 240);
        return `<div class="sf-goods-horizontal__card" style="${styleAttr({
          width: `${width}px`,
          ...(hasImageAsset(item) ? {} : { height: `${height}px` }),
          borderRadius: designContext.radius,
          backgroundColor: designContext.color_palette.card_subtle,
        })}">${renderImageItem(projectId, module.type, item, height)}</div>`;
      })
      .join('')}</div>`;
  }

  if (module.type === 'goods' && items.length > 1) {
    return `<div class="sf-goods-stack">${items
      .map((item) => `<div class="sf-image-card" ${imageCardStyleAttr(item, height)}>${renderImageItem(projectId, module.type, item, height)}</div>`)
      .join('')}</div>`;
  }

  if (data.mode === 'carousel_poster' && items.length > 1) {
    const carouselItems = items.some((item) => hasImageAsset(item))
      ? items.filter((item) => hasImageAsset(item))
      : items;
    return `<div class="sf-carousel sf-top-slider"${carouselItems.length > 1 ? ' data-carousel="true"' : ''}>
      ${carouselItems
        .map((item, index) => `<div class="sf-carousel__item${index === 0 ? ' is-active' : ''}" ${imageCardStyleAttr(item, height)}>${renderImageItem(projectId, module.type, item, height)}</div>`)
        .join('')}
      ${carouselItems.length > 1
        ? `<div class="sf-carousel__dots">
        ${carouselItems.map((_, index) => `<span class="${index === 0 ? 'is-active' : ''}"></span>`).join('')}
      </div>`
        : ''}
    </div>`;
  }

  if (data.mode === 'dual_carousel' && items.length >= 2) {
    const topHeight = Math.max(80, Math.floor((height - 12) / 2));
    const first = items[0];
    const second = items[1];

    // gap:12px

    return `<div style="display:flex;flex-direction:column;${hasImageAsset(first) && hasImageAsset(second) ? '' : `;min-height:${height}px`}">
      <div class="sf-image-card" ${imageCardStyleAttr(first, topHeight)}>${renderImageItem(projectId, module.type, first, topHeight)}</div>
      <div class="sf-image-card" ${imageCardStyleAttr(second, topHeight)}>${renderImageItem(projectId, module.type, second, topHeight)}</div>
    </div>`;
  }

  const heroItem = items[0];
  return `<div class="sf-image-card ${module.type === 'top_slider' ? 'sf-top-slider' : module.type === 'banner' ? 'sf-banner' : module.type === 'shop_info' ? 'sf-shop-info' : ''}" ${imageCardStyleAttr(heroItem, height)}>${renderImageItem(projectId, module.type, heroItem, height)}</div>`;
}

function hasImageAsset(item) {
  return Boolean(stringOr(item?.image));
}

function imageCardStyleAttr(item, height) {
  return hasImageAsset(item) ? '' : `style="height:${height}px"`;
}

function renderUserAssetsModule(projectId, module) {
  const data = module.data ?? {};
  const progress = Math.max(0, Math.min(100, toNumber(data.progress_percent, 33)));
  const metrics = resolveUserAssetsLayoutMetrics(data.card_layout);
  const entries = Array.isArray(data.entries) ? data.entries.filter(isPlainObject) : [];
  const hasEntries = entries.length > 0;
  const hasEntryImages = entries.some((entry) => Boolean(resolveAssetUrl(projectId, entry.image)));
  const asset = resolveAssetUrl(projectId, data.body_image);
  const avatar = resolveAssetUrl(projectId, data.avatar || USER_ASSETS_DEFAULTS.avatar);
  const bodyHeight = (hasEntries || asset)
    ? Math.round((metrics.canvasHeight / metrics.canvasWidth) * USER_ASSETS_PREVIEW_BODY_WIDTH)
    : clamp(Math.round(toNumber(data.height, 208) * 0.38), 72, 108);
  return `<div class="sf-user-assets" style="min-height:${Math.max(124, toNumber(data.height, 188))}px">
    <div class="sf-user-assets__top">
      <div>
        <div class="sf-user-assets__greeting">${escapeHtml(stringOr(data.greeting, USER_ASSETS_DEFAULTS.greeting))}</div>
        <div class="sf-user-assets__name">${escapeHtml(stringOr(data.nickname, USER_ASSETS_DEFAULTS.nickname))}</div>
      </div>
      <div class="sf-user-assets__code">
        <img src="${escapeAttr(avatar)}" alt="${escapeAttr(stringOr(data.nickname, USER_ASSETS_DEFAULTS.nickname))}" class="sf-user-assets__avatar" />
        <div class="sf-user-assets__pill"><img src="${escapeAttr(USER_ASSETS_DEFAULTS.codeIcon)}" alt="" class="sf-user-assets__code-icon" />会员码</div>
      </div>
    </div>
    <div class="sf-user-assets__progress"><span style="width:${progress}%"></span></div>
    ${stringOr(data.upgrade_tip)
      ? `<div class="sf-user-assets__tip">${escapeHtml(data.upgrade_tip)}</div>`
      : ''}
    <div class="sf-user-assets__body" style="height:${bodyHeight}px">
      ${hasEntryImages
        ? renderUserAssetsCardsLayout(projectId, data.card_layout, entries)
        : asset
          ? `<img src="${escapeAttr(asset)}" alt="${escapeAttr(stringOr(data.body_alt, USER_ASSETS_DEFAULTS.bodyAlt))}" class="sf-user-assets__body-image" />`
          : renderUserAssetsPendingPlaceholder(data.card_layout, entries)}
    </div>
  </div>`;
}

function renderImageItem(projectId, moduleType, item, height) {
  if (!item) {
    return renderImagePlaceholder({
      eyebrow: '内容占位',
      title: '缺少内容',
      description: '当前结构项为空。',
      status: '空状态',
      variant: 'generic',
    });
  }
  const imageUrl = resolveAssetUrl(projectId, item.image);
  const defaults = MODULE_RUNTIME_COPY[moduleType] ?? MODULE_RUNTIME_COPY.top_slider;
  if (imageUrl) {
    return `<img src="${escapeAttr(imageUrl)}" alt="${escapeAttr(stringOr(item.alt, defaults.alt))}" />`;
  }

  const prompt = isPlainObject(item.image_prompt_schema) ? item.image_prompt_schema : {};
  return renderImagePlaceholder({
    eyebrow: storefrontModuleLabel(moduleType),
    title: shortenText(stringOr(prompt.content?.title, stringOr(item.alt, defaults.alt)), 24),
    description: shortenText(
      stringOr(prompt.content?.subtitle, stringOr(prompt.content?.description, '等待素材生成')),
      40,
    ),
    status: '待生成',
    variant: placeholderVariantForModule(moduleType),
  });
}

function storefrontModuleLabel(moduleType) {
  return MODULE_RUNTIME_COPY[moduleType]?.label ?? '首页模块';
}

function placeholderVariantForModule(moduleType) {
  switch (moduleType) {
    case 'top_slider':
      return 'poster';
    case 'banner':
      return 'banner';
    case 'goods':
      return 'goods';
    case 'shop_info':
      return 'story';
    default:
      return 'generic';
  }
}

function renderPlaceholderLine(width, strong = false, height = 10) {
  return `<div class="sf-ph-line${strong ? ' is-strong' : ''}" style="${styleAttr({ width, height: `${height}px` })}"></div>`;
}

function renderPlaceholderPill(width) {
  return `<div class="sf-ph-pill" style="${styleAttr({ width: `${width}px` })}"></div>`;
}

function renderGenericPendingImageMark(label = '图片待生成', compact = false) {
  return `<div class="sf-placeholder__generic-image${compact ? ' is-compact' : ''}">
    <svg viewBox="0 0 46 46" fill="none" aria-hidden="true">
      <rect x="8" y="10" width="30" height="26" rx="7" stroke="currentColor" stroke-width="1.6"></rect>
      <circle cx="18" cy="19" r="3.5" fill="currentColor" opacity="0.42"></circle>
      <path d="M14 32l7.2-7.2 5.1 5.1 3.5-3.5L36 32" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"></path>
    </svg>
    <span>${escapeHtml(label)}</span>
  </div>`;
}

function renderStatusSignalIcon() {
  return `<svg width="16" height="12" viewBox="0 0 18 14" fill="none" aria-hidden="true">
    ${SHOP_HOME_PAGE_STATUS_SIGNAL_BARS.map((bar) => `<rect x="${bar.x}" y="${bar.y}" width="${bar.width}" height="${bar.height}" rx="${bar.rx}" fill="currentColor" opacity="${bar.opacity}"></rect>`).join('')}
  </svg>`;
}

function renderStatusWifiIcon() {
  return `<svg width="16" height="12" viewBox="0 0 18 14" fill="none" aria-hidden="true">
    ${SHOP_HOME_PAGE_STATUS_WIFI_PATHS.map((entry) => entry.type === 'circle'
      ? `<circle cx="${entry.cx}" cy="${entry.cy}" r="${entry.r}" fill="currentColor"></circle>`
      : `<path d="${entry.d}" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"></path>`).join('')}
  </svg>`;
}

function renderStatusBatteryIcon(className = '') {
  const classAttr = className ? ` class="${className}"` : '';
  return `<svg${classAttr} viewBox="${SHOP_HOME_PAGE_STATUS_BATTERY.viewBox}" fill="none" aria-hidden="true">
    <rect x="${SHOP_HOME_PAGE_STATUS_BATTERY.outline.x}" y="${SHOP_HOME_PAGE_STATUS_BATTERY.outline.y}" width="${SHOP_HOME_PAGE_STATUS_BATTERY.outline.width}" height="${SHOP_HOME_PAGE_STATUS_BATTERY.outline.height}" rx="${SHOP_HOME_PAGE_STATUS_BATTERY.outline.rx}" fill="none" stroke="currentColor" stroke-opacity="${SHOP_HOME_PAGE_STATUS_BATTERY.outline.strokeOpacity}"></rect>
    <rect x="${SHOP_HOME_PAGE_STATUS_BATTERY.nub.x}" y="${SHOP_HOME_PAGE_STATUS_BATTERY.nub.y}" width="${SHOP_HOME_PAGE_STATUS_BATTERY.nub.width}" height="${SHOP_HOME_PAGE_STATUS_BATTERY.nub.height}" rx="${SHOP_HOME_PAGE_STATUS_BATTERY.nub.rx}" fill="currentColor" fill-opacity="${SHOP_HOME_PAGE_STATUS_BATTERY.nub.fillOpacity}"></rect>
    <rect x="${SHOP_HOME_PAGE_STATUS_BATTERY.fill.x}" y="${SHOP_HOME_PAGE_STATUS_BATTERY.fill.y}" width="${SHOP_HOME_PAGE_STATUS_BATTERY.fill.width}" height="${SHOP_HOME_PAGE_STATUS_BATTERY.fill.height}" rx="${SHOP_HOME_PAGE_STATUS_BATTERY.fill.rx}" fill="currentColor"></rect>
  </svg>`;
}

function renderMiniProgramCapsule() {
  return `<div class="sf-mini-capsule">
    <div class="sf-mini-capsule__left">
      <span></span>
      <span></span>
      <span></span>
    </div>
    <span class="sf-mini-capsule__divider"></span>
    <div class="sf-mini-capsule__right">
      <span></span>
    </div>
  </div>`;
}

function renderImagePlaceholderArt(_variant) {
  return renderGenericPendingImageMark();
}

function userAssetsDetailFor(cardLayout) {
  const slots = userAssetsCardLayoutSlots(cardLayout);
  return `${slots.length} 个入口 · ${userAssetsTemplateTypeLabel(cardLayout?.template_type)}`;
}

function renderUserAssetsEntryShell(item, slot) {
  const large = stringOr(slot?.size) === 'large' || stringOr(slot?.size) === 'wide';
  const title = shortenText(stringOr(item?.title, '功能入口'), large ? 10 : 8);
  const subtitle = shortenText(stringOr(item?.subtitle, 'ENTRY'), large ? 14 : 12);
  return `<div class="sf-user-assets-entry${large ? ' is-large' : ''}">
    <div class="sf-user-assets-entry__icon"></div>
    <div class="sf-user-assets-entry__copy">
      <strong class="sf-user-assets-entry__title">${escapeHtml(title)}</strong>
      <span class="sf-user-assets-entry__subtitle">${escapeHtml(subtitle)}</span>
    </div>
  </div>`;
}

function renderUserAssetsCard(projectId, entry, slot) {
  const imageUrl = resolveAssetUrl(projectId, entry?.image);
  if (imageUrl) {
    const alt = stringOr(entry?.alt, stringOr(entry?.title, '客户资产入口'));
    return `<div class="sf-user-assets-card"><img src="${escapeAttr(imageUrl)}" alt="${escapeAttr(alt)}" class="sf-user-assets-card__img" /></div>`;
  }
  return renderUserAssetsEntryShell(entry, slot);
}

function renderHotzoneRows(projectId, slots, entriesBySlotId) {
  const rowPattern = buildHotzoneRowPattern(slots.length || 1);
  let cursor = 0;
  return rowPattern.map((count) => {
    const rowSlots = slots.slice(cursor, cursor + count);
    cursor += count;
    return `<div style="${styleAttr({
      display: 'grid',
      gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))`,
      gap: `${USER_ASSETS_GRID_GAP}px`,
    })}">${rowSlots.map((slot) => renderUserAssetsCard(projectId, entriesBySlotId.get(slot.id), slot)).join('')}</div>`;
  }).join('');
}

function renderUserAssetsCardsLayout(projectId, cardLayout, entries) {
  const templateType = normalizeUserAssetsTemplateType(cardLayout?.template_type);
  const slots = userAssetsCardLayoutSlots(cardLayout);
  const entriesBySlotId = new Map(
    (Array.isArray(entries) ? entries : [])
      .filter(isPlainObject)
      .map((entry) => [stringOr(entry.slot_id || entry.id), entry]),
  );

  if (templateType === USER_ASSETS_TEMPLATE_TYPES.SINGLE) {
    const slot = slots[0] ?? { id: 'single', size: 'wide' };
    return renderUserAssetsCard(projectId, entriesBySlotId.get(stringOr(slot.id)), slot);
  }

  if (templateType === USER_ASSETS_TEMPLATE_TYPES.ONE_ROW_TWO) {
    return `<div class="sf-user-assets-placeholder__layout" style="${styleAttr({
      display: 'grid',
      gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
      gap: `${USER_ASSETS_GRID_GAP}px`,
      height: '100%',
    })}">${slots.map((slot) => renderUserAssetsCard(projectId, entriesBySlotId.get(slot.id), slot)).join('')}</div>`;
  }

  if (templateType === USER_ASSETS_TEMPLATE_TYPES.ONE_ROW_THREE) {
    return `<div class="sf-user-assets-placeholder__layout" style="${styleAttr({
      display: 'grid',
      gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
      gap: `${USER_ASSETS_GRID_GAP}px`,
      height: '100%',
    })}">${slots.map((slot) => renderUserAssetsCard(projectId, entriesBySlotId.get(slot.id), slot)).join('')}</div>`;
  }

  if (templateType === USER_ASSETS_TEMPLATE_TYPES.LEFT_ONE_RIGHT_TWO) {
    const left = slots.find((slot) => slot.id === 'left_large');
    const rightTop = slots.find((slot) => slot.id === 'right_top');
    const rightBottom = slots.find((slot) => slot.id === 'right_bottom');
    return `<div class="sf-user-assets-placeholder__layout" style="${styleAttr({
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: `${USER_ASSETS_GRID_GAP}px`,
      height: '100%',
    })}">
      <div>${renderUserAssetsCard(projectId, entriesBySlotId.get('left_large'), left)}</div>
      <div style="display:grid;gap:11px">
        ${renderUserAssetsCard(projectId, entriesBySlotId.get('right_top'), rightTop)}
        ${renderUserAssetsCard(projectId, entriesBySlotId.get('right_bottom'), rightBottom)}
      </div>
    </div>`;
  }

  if (templateType === USER_ASSETS_TEMPLATE_TYPES.TWO_ROW_FOUR) {
    return `<div class="sf-user-assets-placeholder__layout" style="${styleAttr({
      display: 'grid',
      gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
      gap: `${USER_ASSETS_GRID_GAP}px`,
      height: '100%',
    })}">${slots.map((slot) => renderUserAssetsCard(projectId, entriesBySlotId.get(slot.id), slot)).join('')}</div>`;
  }

  if (templateType === USER_ASSETS_TEMPLATE_TYPES.TWO_ROW_FIVE) {
    const topSlots = slots.slice(0, 2);
    const bottomSlots = slots.slice(2);
    return `<div class="sf-user-assets-placeholder__layout" style="display:grid;gap:11px;height:100%">
      <div style="display:grid;grid-template-columns:repeat(2, minmax(0, 1fr));gap:11px">
        ${topSlots.map((slot) => renderUserAssetsCard(projectId, entriesBySlotId.get(slot.id), slot)).join('')}
      </div>
      <div style="display:grid;grid-template-columns:repeat(3, minmax(0, 1fr));gap:11px">
        ${bottomSlots.map((slot) => renderUserAssetsCard(projectId, entriesBySlotId.get(slot.id), slot)).join('')}
      </div>
    </div>`;
  }

  return `<div class="sf-user-assets-placeholder__layout" style="display:grid;gap:11px;height:100%">
    ${renderHotzoneRows(projectId, slots, entriesBySlotId)}
  </div>`;
}

function renderUserAssetsPendingPlaceholder(cardLayout, entries) {
  return `<div class="sf-user-assets-placeholder">
    ${renderUserAssetsCardsLayout('', cardLayout, entries)}
  </div>`;
}

function renderImagePlaceholder({ eyebrow, title, description, status = '待生成', variant = 'generic' }) {
  return `<div class="sf-placeholder">
    <div class="sf-placeholder__content">
      <div class="sf-placeholder__top">
        <span class="sf-placeholder__chip">${escapeHtml(eyebrow)}</span>
        <span class="sf-placeholder__status">${escapeHtml(status)}</span>
      </div>
      <div class="sf-placeholder__art">${renderImagePlaceholderArt(variant)}</div>
      <div class="sf-placeholder__footer">
        <strong class="sf-placeholder__title">${escapeHtml(title)}</strong>
        <span class="sf-placeholder__desc">${escapeHtml(description)}</span>
      </div>
    </div>
  </div>`;
}

function resolvePageLayout(schema) {
  const clone = deepClone(schema);
  clone.modules = clone.modules.map((module, index, modules) =>
    resolveModuleLayout(module, index, modules, clone),
  );
  return clone;
}

function resolveModuleLayout(module, index, modules, schema) {
  const nextModule = deepClone(module);
  nextModule.layout = computeModuleLayout(nextModule, index, modules, schema);
  if (nextModule.type === 'user_assets') {
    nextModule.data.height = computeUserAssetsHeight(nextModule, schema);
    return nextModule;
  }
  nextModule.data.height = computeImageHeight(nextModule, index, schema);
  if (nextModule.type === 'top_slider') {
    const count = Array.isArray(nextModule.data.items) ? nextModule.data.items.length : 0;
    if (count > 1) {
      nextModule.data.mode = 'carousel_poster';
      nextModule.data.auto_play_ms = toPositiveInteger(nextModule.data.auto_play_ms, 3000);
    }
  }
  return nextModule;
}

function computeModuleLayout(module, index, modules, schema) {
  const spacing = clamp(schema.design_context.spacing || 16, 12, 20);
  const previous = index > 0 ? modules[index - 1] : null;
  if (module.type === 'top_slider' && index === 0) {
    return { offsetY: 0, zIndex: 1, paddingX: 0, paddingTop: 0, paddingBottom: 0 };
  }
  if (module.type === 'user_assets') {
    const shouldOverlap =
      schema.layout_mode === 'overlay' &&
      previous?.type === 'top_slider' &&
      index <= 2;
    const overlap = shouldOverlap
      ? -clamp(schema.design_context.page_width * 0.15, 44, 62)
      : 0;
    return {
      offsetY: overlap,
      zIndex: shouldOverlap ? 3 : 1,
      paddingX: spacing,
      paddingTop: shouldOverlap ? 0 : spacing,
      paddingBottom: spacing,
    };
  }
  return { offsetY: 0, zIndex: 1, paddingX: 0, paddingTop: 0, paddingBottom: 0 };
}

function computeImageHeight(module, index, schema) {
  const width = clamp(schema.design_context.page_width || 375, 320, 430);
  const suggestion = toNumber(module.data?.height, defaultHeightForModule(module.type));
  if (module.type === 'top_slider' && index === 0) {
    const mode = module.data?.mode;
    const base =
      mode === 'dual_carousel'
        ? Math.round(width * 0.78)
        : mode === 'horizontal_scroll'
          ? Math.round(width * 0.56)
          : Math.round(width * (4 / 3));
    return blendSuggestion(suggestion, base, 360, 540);
  }
  if (module.type === 'banner') {
    const base = Math.round(width * (400 / 750));
    return blendSuggestion(suggestion, base, Math.round(base * 0.9), Math.round(base * 1.1));
  }
  if (module.type === 'goods') {
    const base =
      module.data?.mode === 'horizontal_scroll'
        ? Math.round(width * 0.62)
        : Math.round(width * (3 / 4));
    return blendSuggestion(suggestion, base, 200, 280);
  }
  if (module.type === 'shop_info') {
    return blendSuggestion(suggestion, Math.round(width * (16 / 9)), 420, 640);
  }
  return suggestion;
}

function computeUserAssetsHeight(module, schema) {
  const metrics = resolveUserAssetsLayoutMetrics(module.data.card_layout);
  const availableWidth = clamp(
    schema.design_context.page_width - schema.design_context.spacing * 2 - 32,
    260,
    schema.design_context.page_width,
  );
  const imageHeight = Math.round((availableWidth * metrics.canvasHeight) / metrics.canvasWidth);
  const hasEntries = Array.isArray(module.data.entries) && module.data.entries.length > 0;
  const hasGeneratedEntries = Array.isArray(module.data.entries)
    ? module.data.entries.some((entry) => stringOr(entry?.image))
    : false;
  const hasLegacyBodyImage = Boolean(stringOr(module.data.body_image));
  const hasRenderableEntries = hasEntries || hasGeneratedEntries || hasLegacyBodyImage;
  const fallback = hasRenderableEntries ? imageHeight + 134 : 208;
  const maxHeight = metrics.isFreeform ? 760 : 560;
  return hasRenderableEntries
    ? blendSuggestion(toNumber(module.data.height, fallback), fallback, 124, maxHeight)
    : fallback;
}

function buildHotzoneRowPattern(count) {
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

function resolveUserAssetsLayoutMetrics(cardLayout) {
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
    canvasWidth: spec?.canvasWidth ?? 611,
    canvasHeight: spec?.canvasHeight ?? 220,
    isFreeform: false,
    rowPattern: [],
  };
}

function collectAssetTasks(schema, styleGuide, forceRegenerate) {
  const tasks = [];

  for (const module of schema.modules) {
    if (module.type === 'user_assets') {
      const entries = Array.isArray(module.data.entries) ? module.data.entries.filter(isPlainObject) : [];
      const templateType = normalizeUserAssetsTemplateType(module.data.card_layout?.template_type);
      const isHotzone = templateType === USER_ASSETS_TEMPLATE_TYPES.HOTZONE;
      const hasLegacyBodyImage = Boolean(stringOr(module.data.body_image));
      if (!forceRegenerate && hasLegacyBodyImage && !entries.some((entry) => stringOr(entry.image))) {
        continue;
      }

      let firstEntryFileName = null;
      entries.forEach((entry, index) => {
        if (!forceRegenerate && stringOr(entry.image)) {
          if (!isHotzone && index === 0) {
            firstEntryFileName = stringOr(entry.image);
          }
          return;
        }
        const slot = userAssetsCardLayoutSlots(module.data.card_layout).find(
          (candidate) => stringOr(candidate.id) === stringOr(entry.slot_id),
        );
        const sizeSpec = slotSizeSpecForUserAssetsSlot(slot);
        const fileName = `${IMAGE_FILE_PREFIX.user_assets}-${index + 1}.png`;
        const sequentialReference = !isHotzone && index > 0 && firstEntryFileName;
        tasks.push({
          fileName,
          prompt: sequentialReference ? null : buildUserAssetsEntryPrompt(entry, slot, module.data.card_layout, styleGuide),
          buildPromptFn: sequentialReference
            ? () => buildUserAssetsEntryPrompt(entry, slot, module.data.card_layout, styleGuide)
            : null,
          dependsOnFileName: sequentialReference ? firstEntryFileName : null,
          size:
            templateType === USER_ASSETS_TEMPLATE_TYPES.HOTZONE
              ? '1024x1024'
              : resolveSizeFromDimensions(sizeSpec.width, sizeSpec.height),
          inputImagePaths: [],
          buildInputImagePathsFn: (projectDir) =>
            collectUserAssetsReferenceImagePaths(entry, firstEntryFileName, projectDir),
          assign: (resolvedFileName) => {
            entry.image = resolvedFileName;
            entry.no_cache = false;
            module.data.body_image = '';
            module.data.body_image_no_cache = false;
          },
        });
        if (!isHotzone && index === 0) {
          firstEntryFileName = fileName;
        }
      });
      continue;
    }

    if (!Array.isArray(module.data.items)) continue;
    let firstGoodsFileName = null;
    module.data.items.forEach((item, index) => {
      if (!forceRegenerate && stringOr(item.image)) return;
      const fileName = `${IMAGE_FILE_PREFIX[module.type]}-${index + 1}.png`;
      const isSubsequentGoods = module.type === 'goods' && index > 0 && firstGoodsFileName !== null;
      tasks.push({
        fileName,
        prompt: isSubsequentGoods ? null : buildImagePrompt(module.type, item, styleGuide),
        buildPromptFn: isSubsequentGoods
          ? (refUrl) => buildImagePrompt(module.type, {
              ...item,
              reference_images: [refUrl, ...(Array.isArray(item.reference_images) ? item.reference_images : [])],
            }, styleGuide)
          : null,
        dependsOnFileName: isSubsequentGoods ? firstGoodsFileName : null,
        size: resolveSizeFromAspectRatio(item.aspect_ratio),
        inputImagePaths: [],
        buildInputImagePathsFn: (projectDir) =>
          collectImageItemReferenceImagePaths(
            item,
            isSubsequentGoods ? firstGoodsFileName : null,
            projectDir,
          ),
        assign: (fn) => { item.image = fn; item.no_cache = false; },
      });
      if (module.type === 'goods' && index === 0) firstGoodsFileName = fileName;
    });
  }

  return tasks;
}

function buildImagePrompt(moduleType, item, styleGuide) {
  const promptSchema = deepClone(item.image_prompt_schema ?? {});
  const styleNotes = buildStyleGenerationNotes(styleGuide, moduleType);
  if (moduleType === 'banner') {
    promptSchema.generation_notes = [
      ...styleNotes,
      '活动横幅定位为首页入口导流：只保留短标题和短副标题，不要价格、券墙、复杂按钮或多层促销信息。',
      '不要在画面中展示店铺 Logo、品牌角标、店铺名称水印或店铺 slogan。',
      '横幅必须和商品图明显区分：使用横向色块、轻图形、纹理、插画或贴纸式元素；避免做成商品摄影卡片、白底商品图或与商品模块相同的背景画风。',
    ];
  } else if (moduleType === 'goods') {
    const cta = stringOr(promptSchema.promotion?.cta, '立即购买');
    promptSchema.generation_notes = [
      ...styleNotes,
      `商品图必须是带转化动作的营销卡片，购买行动点属于图片内容本身；请将“${cta}”直接设计在画面里，例如按钮、行动条或购买引导区。`,
      '不要在商品图中展示店铺 Logo、品牌角标、店铺名称水印或 logo placeholder；画面重点放在商品主体、卖点和购买行动点。',
      Array.isArray(item.reference_images) && item.reference_images.length > 0
        ? '已提供参考图：请沿用参考图中的商品主体、包装或摆盘方式、摄影风格、材质质感和整体气质。'
        : '未提供参考图：可以根据提示词自由发挥商品主体、场景和购买引导，但必须保持强转化视觉。',
    ];
  } else if (moduleType === 'image_ad') {
    promptSchema.generation_notes = [
      ...styleNotes,
      Array.isArray(item.reference_images) && item.reference_images.length > 0
        ? '该广告块来自参考图中的未映射视觉块：保留参考图里的构图比例、主体层级、背景处理和视觉语气，不要改写成通用商品卡或标准横幅。'
        : '该广告块用于承接参考页中的独立视觉块，保持强视觉表达，不要退化成普通商品卡。',
    ];
  } else if (styleNotes.length > 0) {
    promptSchema.generation_notes = styleNotes;
  }
  if (Array.isArray(item.reference_images) && item.reference_images.length > 0) {
    promptSchema.reference_style = {
      preset_id: stringOr(styleGuide?.preset_id, 'custom'),
      reference_images: item.reference_images,
    };
  }
  return JSON.stringify(promptSchema);
}

function buildUserAssetsEntryPrompt(entry, slot, cardLayout, styleGuide) {
  const promptSchema = deepClone(entry?.image_prompt_schema ?? {});
  const styleNotes = buildUserAssetsGenerationNotes(styleGuide);
  promptSchema.generation_notes = [
    ...styleNotes,
    `当前入口卡片布局为 ${userAssetsTemplateTypeLabel(cardLayout?.template_type)}，当前卡片槽位是 ${stringOr(slot?.id, 'slot')}。`,
    '客户资产入口卡片只表达当前这个功能入口，不要在一张图里额外生成别的按钮卡片、额外小入口或整组宫格。',
    '入口卡片中的 icon、标题、副标题必须保留在卡片内部，跟随页面整体风格，但背景保持纯白，不要渐变、纹理、插画场景或摄影背景。',
    '不要展示店铺 Logo、品牌角标、店铺名称水印或店铺 slogan。',
  ];
  if (cardLayout?.template_type === USER_ASSETS_TEMPLATE_TYPES.LEFT_ONE_RIGHT_TWO) {
    promptSchema.generation_notes.push(
      '左一右二布局里，左侧主卡与右侧两张副卡必须保持同一套网格语言；如果当前槽位不是主卡，不要误画成大卡。',
    );
  }
  if (cardLayout?.template_type === USER_ASSETS_TEMPLATE_TYPES.HOTZONE) {
    promptSchema.generation_notes.push(
      '热区自由布局没有固定尺寸要求，可以自由发挥卡片造型，但仍要保证单张卡片可独立使用，并且不要在画面里出现第二张卡片。',
    );
  }
  if (Array.isArray(entry?.reference_images) && entry.reference_images.length > 0) {
    promptSchema.reference_style = {
      preset_id: stringOr(styleGuide?.preset_id, 'custom'),
      reference_images: entry.reference_images,
    };
  }
  return JSON.stringify(promptSchema);
}

function collectUserAssetsReferenceImagePaths(entry, firstEntryFileName, projectDir) {
  const paths = [];
  if (firstEntryFileName && projectDir) {
    paths.push(path.join(projectDir, firstEntryFileName));
  }
  for (const referenceImage of Array.isArray(entry?.reference_images) ? entry.reference_images : []) {
    const fileName = stringOr(referenceImage);
    if (!fileName || /^(https?:|data:|blob:)/i.test(fileName) || !projectDir) continue;
    paths.push(path.join(projectDir, fileName));
  }
  return [...new Set(paths)];
}

function collectImageItemReferenceImagePaths(item, priorGeneratedFileName, projectDir) {
  const paths = [];
  if (priorGeneratedFileName && projectDir) {
    paths.push(path.join(projectDir, priorGeneratedFileName));
  }
  for (const referenceImage of Array.isArray(item?.reference_images) ? item.reference_images : []) {
    const fileName = stringOr(referenceImage);
    if (!fileName || /^(https?:|data:|blob:)/i.test(fileName) || !projectDir) continue;
    paths.push(path.join(projectDir, fileName));
  }
  return [...new Set(paths)];
}

function buildUserAssetsGenerationNotes(styleGuide) {
  const notes = [];
  const guide = coerceStyleGuide(styleGuide, null);
  if (guide.analysis?.icon_style) {
    notes.push(`入口 icon 风格参考页面视觉：${guide.analysis.icon_style}`);
  }
  if (Array.isArray(guide.generation_rules?.avoid) && guide.generation_rules.avoid.length > 0) {
    notes.push(`避免：${guide.generation_rules.avoid.join('；')}`);
  }
  if (guide.preset_id === 'bakery-handdrawn-cream') {
    notes.push('入口 icon 可以保留手绘涂鸦感和暖橙点缀，但背景仍必须是纯白，不要奶油纸感底纹或海报背景。');
  }
  return uniqueStrings(notes.filter(Boolean));
}

function buildStyleGenerationNotes(styleGuide, moduleType) {
  const notes = [];
  const guide = coerceStyleGuide(styleGuide, null);
  if (guide.analysis?.icon_style) {
    notes.push(`视觉风格参考：${guide.analysis.icon_style}`);
  }
  if (guide.analysis?.background_style) {
    notes.push(`背景风格参考：${guide.analysis.background_style}`);
  }
  if (guide.analysis?.layout_style && moduleType === 'user_assets') {
    notes.push(`布局风格参考：${guide.analysis.layout_style}`);
  }
  if (Array.isArray(guide.generation_rules?.must)) {
    notes.push(...guide.generation_rules.must);
  }
  if (Array.isArray(guide.generation_rules?.avoid) && guide.generation_rules.avoid.length > 0) {
    notes.push(`避免：${guide.generation_rules.avoid.join('；')}`);
  }
  if (guide.preset_id === 'bakery-handdrawn-cream') {
    if (moduleType === 'top_slider') {
      notes.push('顶部主视觉优先做成手绘感海报：超大标题、奶油色底、可加入涂鸦皇冠/箭头/吐司边缘橙色高光。');
    } else if (moduleType === 'user_assets') {
      notes.push('客户资产入口卡片可以保留手绘招牌感标题和轻涂鸦细节，但布局仍需服从当前 schema 里的实际卡片模式。');
    } else if (moduleType === 'goods') {
      notes.push('商品图主体可以是真实烘焙产品摄影，但允许少量手绘箭头、贴纸和标题覆盖，不要做成标准商城白底商品图。');
    }
  }
  return uniqueStrings(notes.filter(Boolean));
}

// ---------------------------------------------------------------------------
// Image generation queue – max 3 concurrent tasks per process
// ---------------------------------------------------------------------------

const assetQueue = {
  tasks: new Map(),        // id -> { id, projectId, fileName, status, error, run, assign, schema, projectDir, projectsRoot, requirements, styleGuide }
  running: new Set(),      // running task ids
  maxConcurrency: 3,
};

function generateTaskId() {
  return `at_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function queueTryProcess() {
  while (assetQueue.running.size < assetQueue.maxConcurrency) {
    const next = [...assetQueue.tasks.values()].find((t) => {
      if (t.status !== 'pending' || assetQueue.running.has(t.id)) return false;
      if (t.dependsOnFileName) {
        const dep = [...assetQueue.tasks.values()].find(
          (d) => d.projectId === t.projectId && d.fileName === t.dependsOnFileName,
        );
        if (dep && dep.status !== 'done') return false;
      }
      return true;
    });
    if (!next) break;

    assetQueue.running.add(next.id);
    next.status = 'running';
    console.log(`[storefront] 开始生图: ${next.fileName} (并发: ${assetQueue.running.size}/${assetQueue.maxConcurrency})\n提示词: ${JSON.stringify(next.prompt ?? '(依赖前置任务)').slice(0, 300)}`);
    runAssetTask(next).finally(() => {
      assetQueue.running.delete(next.id);
      queueTryProcess();
    });
  }
}

async function runAssetTask(task) {
  try {
    let inputImagePaths = Array.isArray(task.inputImagePaths) ? task.inputImagePaths : [];
    if (task.buildInputImagePathsFn) {
      inputImagePaths = task.buildInputImagePathsFn(task.projectDir);
    }
    if (task.buildPromptFn) {
      const refUrl = `/api/projects/${encodeURIComponent(task.projectId)}/files/${encodeURIComponent(task.dependsOnFileName)}`;
      task.prompt = task.buildPromptFn(refUrl);
    }
    const existingFile = task.skipIfExists
      ? await statMaybe(path.join(task.projectDir, task.fileName))
      : null;
    if (!existingFile) {
      const imageConfig = resolveImageConfig(task.imageConfigOptions);
      const generated = await generatePromptImage(task.prompt, task.size, imageConfig, inputImagePaths);
      await writeProjectFile(task.projectsRoot, task.projectId, task.fileName, generated.buffer, {
        overwrite: true,
      });
    }
    task.assign(task.fileName);
    await persistSchema(task.projectDir, task.projectId, task.schema, task.requirements, task.styleGuide);
    await writeRuntimeState(task.projectDir, 'assets-ready', 'info', `${task.fileName}: generated`);
    task.status = 'done';
    console.log(`[storefront] 生图完成: ${task.fileName}`);
  } catch (error) {
    task.error = error instanceof Error ? error.message : String(error);
    console.error(`[storefront] 生图失败: ${task.fileName} — ${task.error}`);
    await writeRuntimeState(task.projectDir, 'assets-ready', 'error', `${task.fileName}: ${task.error}`);
    task.status = 'failed';
  }
}

export function getShopHomePageAssetTaskStatus(projectId) {
  const out = [];
  for (const task of assetQueue.tasks.values()) {
    if (task.projectId !== projectId) continue;
    out.push({ id: task.id, fileName: task.fileName, status: task.status, error: task.error ?? null });
  }
  return out;
}

export function cleanupAssetTasks(projectId) {
  for (const [id, task] of assetQueue.tasks) {
    if (task.projectId === projectId && task.status !== 'pending' && task.status !== 'running') {
      assetQueue.tasks.delete(id);
    }
  }
}

export async function enqueueShopHomePageAssetTasks(projectsRoot, projectId, skillRoot, options = {}) {
  const projectDir = await ensureProject(projectsRoot, projectId);
  const [requirements, schemaText] = await Promise.all([
    readRequirementsForProject(projectDir),
    readTextMaybe(path.join(projectDir, SHOP_HOME_PAGE_SCHEMA_FILE)),
  ]);
  const styleGuide = await readStyleGuideForProject(projectDir, requirements);

  const raw = tryParseJson(schemaText);
  if (!isPlainObject(raw)) {
    const err = new Error('Generate a valid shop-home-page.schema.json before generating assets.');
    err.statusCode = 422;
    throw err;
  }

  const schema = normalizeStorefrontSchema(raw, requirements, styleGuide);
  const validationErrors = validateStorefrontSchema(schema, requirements);
  if (validationErrors.length > 0) {
    const err = new Error(validationErrors.join('\n'));
    err.statusCode = 422;
    throw err;
  }

  const collected = collectAssetTasks(schema, styleGuide, Boolean(options.forceRegenerate));
  if (collected.length === 0) {
    await writeRuntimeState(projectDir, 'assets-ready', 'info', 'No pending storefront image slots required generation.');
    return { tasks: [], state: await loadShopHomePageState(projectsRoot, projectId, skillRoot) };
  }

  // Clean up finished tasks for this project before enqueuing new ones
  cleanupAssetTasks(projectId);

  const enqueued = [];
  for (const task of collected) {
    const id = generateTaskId();
    assetQueue.tasks.set(id, {
      id,
      projectId,
      fileName: task.fileName,
      prompt: task.prompt,
      size: task.size,
      buildPromptFn: task.buildPromptFn ?? null,
      dependsOnFileName: task.dependsOnFileName ?? null,
      inputImagePaths: Array.isArray(task.inputImagePaths) ? task.inputImagePaths : [],
      buildInputImagePathsFn: task.buildInputImagePathsFn ?? null,
      assign: task.assign,
      schema,
      projectDir,
      projectsRoot,
      requirements,
      styleGuide,
      skipIfExists: !options.forceRegenerate,
      imageConfigOptions: options,
      status: 'pending',
      error: null,
    });
    enqueued.push({ id, fileName: task.fileName, status: 'pending' });
  }

  await writeRuntimeState(projectDir, 'assets-generating', 'info', `Enqueued ${enqueued.length} image task(s).`);

  // Kick the queue
  queueTryProcess();

  return { tasks: enqueued, state: await loadShopHomePageState(projectsRoot, projectId, skillRoot) };
}

function resolveImageConfig(options) {
  const apiKey = (
    options.imageApiKey ||
    process.env.OPENAI_IMAGE_API_KEY ||
    process.env.OPENAI_API_KEY
  );
  const baseUrl = (
    options.imageBaseUrl ||
    process.env.OPENAI_IMAGE_COMPATIBLE_BASE_URL ||
    process.env.OPENAI_IMAGE_BASE_URL ||
    process.env.OPENAI_COMPATIBLE_BASE_URL ||
    'https://api.openai.com/v1'
  ).replace(/\/+$/, '');
  const model = options.imageModel || process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1';
  if (!apiKey) {
    const err = new Error('Image generation requires OPENAI_IMAGE_API_KEY or OPENAI_API_KEY.');
    err.statusCode = 400;
    throw err;
  }
  return { apiKey, baseUrl, model };
}

function imageMimeTypeForPath(filePath) {
  const lower = String(filePath).toLowerCase();
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.gif')) return 'image/gif';
  return 'image/png';
}

async function generatePromptImage(prompt, size, config, inputImagePaths = []) {
  const cleanedInputImagePaths = Array.isArray(inputImagePaths)
    ? inputImagePaths.filter((filePath) => typeof filePath === 'string' && filePath)
    : [];
  const isEditRequest = cleanedInputImagePaths.length > 0;
  let response;

  if (isEditRequest) {
    const formData = new FormData();
    formData.append('model', config.model);
    formData.append('prompt', prompt);
    formData.append('size', size);
    for (const filePath of cleanedInputImagePaths) {
      const buffer = await fs.readFile(filePath);
      formData.append(
        'image',
        new Blob([buffer], { type: imageMimeTypeForPath(filePath) }),
        path.basename(filePath),
      );
    }
    response = await fetch(`${config.baseUrl}/images/edits`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: formData,
    });
  } else {
    response = await fetch(`${config.baseUrl}/images/generations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        prompt,
        size,
      }),
    });
  }
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Image generation failed with ${response.status}`);
  }
  const json = await response.json();
  const item = Array.isArray(json?.data) ? json.data[0] : null;
  if (!item) {
    throw new Error('Image generation returned no data.');
  }

  let buffer;
  if (typeof item.b64_json === 'string') {
    buffer = Buffer.from(item.b64_json, 'base64');
  } else if (typeof item.url === 'string') {
    const imgResponse = await fetch(item.url);
    if (!imgResponse.ok) {
      throw new Error(`Could not download generated image from ${item.url}`);
    }
    buffer = Buffer.from(await imgResponse.arrayBuffer());
  } else {
    throw new Error('Unsupported image response payload.');
  }

  const [width, height] = size.split('x').map((part) => Number(part));
  return {
    buffer,
    width,
    height,
  };
}

function resolveSizeFromAspectRatio(aspectRatio) {
  if (typeof aspectRatio !== 'string' || !aspectRatio.includes(':')) {
    return '1024x1024';
  }
  const [width, height] = aspectRatio
    .split(':')
    .map((part) => Number(part.trim()));
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return '1024x1024';
  }
  const minSide = 1024;
  const rounded = (value) => Math.max(minSide, Math.round(value / 16) * 16);
  if (width >= height) {
    return `${rounded((minSide * width) / height)}x${rounded(minSide)}`;
  }
  return `${rounded(minSide)}x${rounded((minSide * height) / width)}`;
}

function resolveSizeFromDimensions(width, height) {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return '1024x1024';
  }
  const minSide = 1024;
  const rounded = (value) => Math.max(minSide, Math.round(value / 16) * 16);
  if (width >= height) {
    return `${rounded((minSide * width) / height)}x${rounded(minSide)}`;
  }
  return `${rounded(minSide)}x${rounded((minSide * height) / width)}`;
}

async function writeRuntimeState(projectDir, status, level, message) {
  const current = await readRuntimeState(projectDir);
  const next = {
    status,
    logs: [
      ...(Array.isArray(current.logs) ? current.logs : []),
      {
        at: Date.now(),
        level,
        message,
      },
    ].slice(-60),
  };
  await fs.writeFile(
    path.join(projectDir, INTERNAL_STATE_FILE),
    `${JSON.stringify(next, null, 2)}\n`,
    'utf8',
  );
  return next;
}

async function readRuntimeState(projectDir) {
  return tryParseJson(
    await readTextMaybe(path.join(projectDir, INTERNAL_STATE_FILE)),
  ) ?? {
    status: 'idle',
    logs: [],
  };
}

async function writeIfAbsent(filePath, content) {
  const existing = await statMaybe(filePath);
  if (existing) return;
  await fs.writeFile(filePath, content, 'utf8');
}

async function writeTextIfChanged(filePath, content) {
  const existing = await readTextMaybe(filePath);
  if (existing === content) return;
  await fs.writeFile(filePath, content, 'utf8');
}

async function readTextMaybe(filePath) {
  try {
    return await fs.readFile(filePath, 'utf8');
  } catch (error) {
    if (error && error.code === 'ENOENT') return null;
    throw error;
  }
}

async function statMaybe(filePath) {
  try {
    return await fs.stat(filePath);
  } catch (error) {
    if (error && error.code === 'ENOENT') return null;
    throw error;
  }
}

function tryParseJson(text) {
  if (typeof text !== 'string' || !text.trim()) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function defaultHeightForModule(moduleType) {
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

function normalizeImageModuleMode(mode, type, items) {
  if (mode === 'carousel_poster' || mode === 'dual_carousel' || mode === 'horizontal_scroll') {
    return mode;
  }
  if (type === 'top_slider' && Array.isArray(items) && items.length > 1) {
    return 'carousel_poster';
  }
  return 'single';
}

function inferCategory(industry) {
  const normalized = stringOr(industry).toLowerCase();
  if (normalized.includes('咖啡')) return 'coffee';
  if (normalized.includes('烘焙') || normalized.includes('甜')) return 'dessert';
  if (normalized.includes('餐') || normalized.includes('茶') || normalized.includes('饮')) return 'food';
  return 'retail';
}

function buildThemeLabel(requirements) {
  const tone = stringOr(requirements?.style?.tone, 'storefront');
  const industry = stringOr(requirements?.style?.industry, 'homepage');
  return `${industry}_${tone}`.replace(/\s+/g, '_').toLowerCase();
}

function normalizeReferenceImages(values) {
  return uniqueStrings(
    Array.isArray(values)
      ? values
          .filter((value) => typeof value === 'string')
          .map((value) => value.trim())
          .filter(
            (value) =>
              value.length > 0 &&
              !/^(https?:|data:|blob:)/i.test(value),
          )
      : [],
  );
}

function findStorefrontTonePresetId(value) {
  const needle = stringOr(value).trim().toLowerCase();
  if (!needle) return '';
  const match = STOREFRONT_TONE_PRESETS.find(
    (preset) =>
      preset.id.toLowerCase() === needle ||
      stringOr(preset.label).trim().toLowerCase() === needle,
  );
  return match?.id ?? '';
}

function resolvePromptStyleTone(requirements, styleGuide) {
  const explicitTone = stringOr(requirements?.style?.tone);
  if (explicitTone) return explicitTone;
  const preset = STYLE_PRESETS[stringOr(styleGuide?.preset_id)];
  const toneKeyword = Array.isArray(preset?.analysis?.tone_keywords)
    ? preset.analysis.tone_keywords.find((value) => typeof value === 'string' && value.trim())
    : '';
  return stringOr(toneKeyword, 'storefront');
}

function resolveAssetUrl(projectId, value) {
  const input = stringOr(value);
  if (!input) return '';
  if (/^(https?:|data:|blob:)/i.test(input)) return input;
  const safePath = input
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
  return `/api/projects/${encodeURIComponent(projectId)}/files/${safePath}`;
}

function stringOr(value, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function shortenText(value, max) {
  return value.length > max ? `${value.slice(0, Math.max(0, max - 1))}…` : value;
}

function toNumber(value, fallback) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function toPositiveInteger(value, fallback) {
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

function sanitizeHexColor(value, fallback) {
  return /^#[0-9a-f]{6}$/i.test(stringOr(value)) ? value : fallback;
}

function hexToRgba(hex, alpha) {
  const normalized = sanitizeHexColor(hex, DEFAULT_DESIGN_CONTEXT.color_palette.accent).slice(1);
  const bigint = Number.parseInt(normalized, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  const safeAlpha = clamp(typeof alpha === 'number' ? alpha : 1, 0, 1);
  return `rgba(${r}, ${g}, ${b}, ${safeAlpha})`;
}

function uniqueStrings(values) {
  return [...new Set(values.filter((value) => typeof value === 'string'))];
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function blendSuggestion(suggestion, fallback, min, max) {
  const base = suggestion === undefined
    ? fallback
    : Math.round(fallback * 0.72 + suggestion * 0.28);
  return clamp(base, min, max);
}

function styleAttr(styles) {
  return Object.entries(styles)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${camelToKebab(key)}:${String(value)}`)
    .join(';');
}

function camelToKebab(value) {
  return value.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function escapeAttr(value) {
  return escapeHtml(value).replaceAll('"', '&quot;');
}
