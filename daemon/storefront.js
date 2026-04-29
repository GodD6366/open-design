import fs from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { ensureProject, listFiles, writeProjectFile } from './projects.js';
import {
  MODULES as HOMEPAGE_MODULES,
  buildInitialHomepageRequirements,
  validateHomepageSchema,
} from '../../workspace/src/lib/homepage-agent/shared.js';

export const STOREFRONT_BRIEF_FILE = 'storefront.brief.json';
export const STOREFRONT_REQUIREMENTS_FILE = 'storefront.requirements.json';
export const STOREFRONT_STYLE_GUIDE_FILE = 'storefront.style-guide.json';
export const STOREFRONT_SCHEMA_FILE = 'storefront.schema.json';
export const STOREFRONT_SCREEN_FILE = 'storefront.screen.html';
export const STOREFRONT_PREVIEW_FILE = 'storefront.preview.html';

const INTERNAL_STATE_FILE = '.storefront.state.json';
const REQUIREMENTS_TEMPLATE_FILE = path.join('assets', 'requirements.template.json');
const STYLE_GUIDE_TEMPLATE_FILE = path.join('assets', 'style-guide.template.json');
const SCHEMA_TEMPLATE_FILE = path.join('assets', 'schema.template.json');
const SKILL_FILE = 'SKILL.md';
const DEFAULT_MODULES = [...HOMEPAGE_MODULES];

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

const STOREFRONT_TONE_PRESETS = JSON.parse(
  readFileSync(new URL('../src/storefront/tone-presets.json', import.meta.url), 'utf8'),
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
      'Extracted from a bakery storefront template: warm cream paper background, hand-drawn black doodle lettering and icons, playful toast-orange / butter-yellow accents, poster-like hero, and an asymmetric action-card composition.',
    icon_style:
      'Hand-drawn doodle icons and wordmarks, black marker-like strokes, slightly uneven outlines, playful and cute instead of corporate.',
    background_style:
      'Warm cream paper tone with large white rounded cards, very sparse orange/yellow accent marks, airy whitespace, and soft warm shadows.',
    layout_style:
      'Oversized poster hero first, then a floating member/action card, then an asymmetric action grid with one dominant left tile and stacked right tiles.',
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
      layout: {
        structure: 'asymmetric',
        distribution: 'auto_balance',
        alignment: {
          horizontal: 'full_bleed',
          edge: 'no_padding',
        },
        spacing: {
          mode: 'whitespace_only',
          density: 'comfortable',
        },
        grouping: {
          enabled: true,
          visual_method: 'spacing_only',
        },
        slots: [
          { id: 'left_large', role: 'main_action', size: 'large', position: 'left_large' },
          { id: 'right_top', role: 'sub_action', size: 'medium', position: 'right_top' },
          { id: 'right_bottom', role: 'sub_action', size: 'medium', position: 'right_bottom' },
        ],
      },
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
      slots_mapping: {
        left_large: { icon: 'pick_up', title: 'PICK UP', subtitle: '到店自取' },
        right_top: { icon: 'delivery', title: 'DELIVERY', subtitle: '外卖点单' },
        right_bottom: { icon: 'scan_code', title: 'SCAN CODE', subtitle: '扫码下单' },
      },
    },
  },
};

const STOREFRONT_TONE_STYLE_GUIDE_PRESETS = Object.fromEntries(
  STOREFRONT_TONE_PRESETS.map((preset) => [
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
  ...STOREFRONT_TONE_STYLE_GUIDE_PRESETS,
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
};

const IMAGE_STRUCTURE_MAP = {
  top_slider: 'poster_hero',
  banner: 'landscape_entry_banner',
  goods: 'product_showcase',
  shop_info: 'vertical_shop_story',
};

const IMAGE_PROMPT_TYPE_MAP = {
  top_slider: 'carousel_banner',
  banner: 'banner',
  goods: 'goods',
  shop_info: 'shop_info',
};

const IMAGE_FILE_PREFIX = {
  top_slider: 'top-slider',
  user_assets: 'user-assets',
  banner: 'banner',
  goods: 'goods',
  shop_info: 'shop-info',
};

export function storefrontSkillDir(projectRoot) {
  return path.join(projectRoot, 'skills', 'storefront-homepage');
}

export async function loadStorefrontState(projectsRoot, projectId, skillRoot) {
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
    readTextMaybe(path.join(projectDir, STOREFRONT_REQUIREMENTS_FILE)),
    readTextMaybe(path.join(projectDir, STOREFRONT_STYLE_GUIDE_FILE)),
    readTextMaybe(path.join(projectDir, STOREFRONT_SCHEMA_FILE)),
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
      ? ['storefront.schema.json must be valid JSON.']
      : [];

  await ensurePreviewArtifacts(
    projectDir,
    projectId,
    schema,
    requirements,
    validationErrors,
    styleGuide,
  );

  const previewStat = await statMaybe(path.join(projectDir, STOREFRONT_PREVIEW_FILE));
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
    previewFileName: STOREFRONT_PREVIEW_FILE,
    previewUrl: `/api/projects/${encodeURIComponent(projectId)}/files/${encodeURIComponent(STOREFRONT_PREVIEW_FILE)}`,
    screenFileName: STOREFRONT_SCREEN_FILE,
    screenUrl: `/api/projects/${encodeURIComponent(projectId)}/files/${encodeURIComponent(STOREFRONT_SCREEN_FILE)}`,
    previewUpdatedAt,
    files,
    logs: Array.isArray(runtimeState.logs) ? runtimeState.logs : [],
    status: derivedStatus,
    validationErrors,
  };
}

export async function saveStorefrontBrief(projectsRoot, projectId, skillRoot, rawBrief) {
  const projectDir = await ensureProject(projectsRoot, projectId);
  const templates = await loadSkillTemplates(skillRoot);
  const requirements = legacyBriefToRequirements(rawBrief);
  const { styleGuide, styleGuideText } = await loadStyleGuideForProject(
    projectDir,
    requirements,
    templates.styleGuideText,
    { syncFile: true },
  );
  const schemaPath = path.join(projectDir, STOREFRONT_SCHEMA_FILE);
  const hasSchema = await statMaybe(schemaPath);
  const seedSchema = createSeedSchema(requirements, styleGuide);

  await Promise.all([
    fs.writeFile(
      path.join(projectDir, STOREFRONT_BRIEF_FILE),
      `${JSON.stringify(rawBrief ?? {}, null, 2)}\n`,
      'utf8',
    ),
    fs.writeFile(
      path.join(projectDir, STOREFRONT_REQUIREMENTS_FILE),
      `${JSON.stringify(requirements, null, 2)}\n`,
      'utf8',
    ),
    writeTextIfChanged(
      path.join(projectDir, STOREFRONT_STYLE_GUIDE_FILE),
      styleGuideText,
    ),
    hasSchema
      ? Promise.resolve()
      : fs.writeFile(
          schemaPath,
          `${JSON.stringify(seedSchema, null, 2)}\n`,
          'utf8',
        ),
  ]);
  await ensurePreviewArtifacts(
    projectDir,
    projectId,
    hasSchema
      ? normalizeStorefrontSchema(tryParseJson(await readTextMaybe(schemaPath)) ?? {}, requirements, styleGuide)
      : seedSchema,
    requirements,
    [],
    styleGuide,
  );

  await writeRuntimeState(
    projectDir,
    'requirements-ready',
    'info',
    'Legacy storefront brief was converted into storefront.requirements.json.',
  );

  await ensureStorefrontSeedFiles(projectDir, templates);
  return loadStorefrontState(projectsRoot, projectId, skillRoot);
}

export async function applyStorefrontSchemaText(projectsRoot, projectId, skillRoot, schemaText) {
  const projectDir = await ensureProject(projectsRoot, projectId);
  const requirements = await readRequirementsForProject(projectDir);
  const styleGuide = await readStyleGuideForProject(projectDir, requirements);
  const raw = tryParseJson(schemaText);
  if (!isPlainObject(raw)) {
    const err = new Error('storefront.schema.json must be valid JSON.');
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
  await writeRuntimeState(projectDir, 'schema-ready', 'info', 'storefront.schema.json applied and preview recompiled.');
  return loadStorefrontState(projectsRoot, projectId, skillRoot);
}

export async function finalizeGeneratedSchema(projectsRoot, projectId, skillRoot) {
  const projectDir = await ensureProject(projectsRoot, projectId);
  const [requirements, schemaText] = await Promise.all([
    readRequirementsForProject(projectDir),
    readTextMaybe(path.join(projectDir, STOREFRONT_SCHEMA_FILE)),
  ]);
  const styleGuide = await readStyleGuideForProject(projectDir, requirements);

  const raw = tryParseJson(schemaText);
  if (!isPlainObject(raw)) {
    return {
      ok: false,
      errors: ['storefront.schema.json is not valid JSON after the agent run.'],
    };
  }

  const normalized = normalizeStorefrontSchema(raw, requirements, styleGuide);
  const validationErrors = validateStorefrontSchema(normalized, requirements);
  if (validationErrors.length > 0) {
    return {
      ok: false,
      errors: validationErrors,
    };
  }

  await persistSchema(projectDir, projectId, normalized, requirements, styleGuide);
  await writeRuntimeState(projectDir, 'schema-ready', 'info', 'Schema generated and preview recompiled.');
  return {
    ok: true,
    value: await loadStorefrontState(projectsRoot, projectId, skillRoot),
  };
}

export async function generateStorefrontAssets(
  projectsRoot,
  projectId,
  skillRoot,
  options = {},
) {
  const projectDir = await ensureProject(projectsRoot, projectId);
  const [requirements, schemaText] = await Promise.all([
    readRequirementsForProject(projectDir),
    readTextMaybe(path.join(projectDir, STOREFRONT_SCHEMA_FILE)),
  ]);
  const styleGuide = await readStyleGuideForProject(projectDir, requirements);

  const raw = tryParseJson(schemaText);
  if (!isPlainObject(raw)) {
    const err = new Error('Generate a valid storefront.schema.json before generating assets.');
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

  const tasks = collectAssetTasks(schema, styleGuide, Boolean(options.forceRegenerate));
  if (tasks.length === 0) {
    await writeRuntimeState(projectDir, 'assets-ready', 'info', 'No pending storefront image slots required generation.');
    return loadStorefrontState(projectsRoot, projectId, skillRoot);
  }

  const imageConfig = resolveImageConfig(options);
  const taskLogs = [];
  for (const task of tasks) {
    try {
      const existingFile = !options.forceRegenerate
        ? await statMaybe(path.join(projectDir, task.fileName))
        : null;
      if (!existingFile) {
        const generated = await generatePromptImage(task.prompt, task.size, imageConfig);
        await writeProjectFile(projectsRoot, projectId, task.fileName, generated.buffer, {
          overwrite: true,
        });
      }
      task.assign(task.fileName);
      taskLogs.push(`${task.fileName}: generated`);
      await persistSchema(projectDir, projectId, schema, requirements, styleGuide);
      await writeRuntimeState(projectDir, 'assets-ready', 'info', `${task.fileName}: generated`);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      taskLogs.push(`${task.fileName}: ${err.message}`);
      await writeRuntimeState(projectDir, 'assets-ready', 'error', `${task.fileName}: ${err.message}`);
      throw err;
    }
  }

  await writeRuntimeState(
    projectDir,
    'assets-ready',
    'info',
    `Generated ${tasks.length} storefront asset(s).\n${taskLogs.join('\n')}`,
  );
  return loadStorefrontState(projectsRoot, projectId, skillRoot);
}

export async function loadStorefrontPromptContext(skillRoot) {
  const [
    skill,
    requirementsTemplate,
    styleGuideTemplate,
    schemaTemplate,
    requirementsContract,
    styleGuideContract,
    schemaContract,
    previewContract,
    checklist,
  ] = await Promise.all([
    readTextMaybe(path.join(skillRoot, SKILL_FILE)),
    readTextMaybe(path.join(skillRoot, REQUIREMENTS_TEMPLATE_FILE)),
    readTextMaybe(path.join(skillRoot, STYLE_GUIDE_TEMPLATE_FILE)),
    readTextMaybe(path.join(skillRoot, SCHEMA_TEMPLATE_FILE)),
    readTextMaybe(path.join(skillRoot, 'references', 'requirements-contract.md')),
    readTextMaybe(path.join(skillRoot, 'references', 'style-guide-contract.md')),
    readTextMaybe(path.join(skillRoot, 'references', 'schema-contract.md')),
    readTextMaybe(path.join(skillRoot, 'references', 'preview-contract.md')),
    readTextMaybe(path.join(skillRoot, 'references', 'checklist.md')),
  ]);

  return {
    skill: skill ?? '',
    requirementsTemplate: requirementsTemplate ?? '',
    styleGuideTemplate: styleGuideTemplate ?? '',
    schemaTemplate: schemaTemplate ?? '',
    requirementsContract: requirementsContract ?? '',
    styleGuideContract: styleGuideContract ?? '',
    schemaContract: schemaContract ?? '',
    previewContract: previewContract ?? '',
    checklist: checklist ?? '',
  };
}

export function buildStorefrontAgentPrompt(context, validationErrors = []) {
  const repairs = validationErrors.length > 0
    ? `\nValidation errors from the previous attempt:\n${validationErrors.map((error) => `- ${error}`).join('\n')}\n`
    : '';

  return [
    'You are generating a storefront homepage schema for Open Design.',
    'Work only inside the current project directory.',
    'Read these project-local files first:',
    '- storefront.requirements.json',
    '- storefront.style-guide.json',
    '- storefront.schema.json',
    '',
    'Then overwrite storefront.schema.json in place so it matches the confirmed requirements.',
    'Do not emit <artifact>. Do not create index.html. Do not write any preview HTML.',
    'You may also update storefront.requirements.json and storefront.style-guide.json if confirmed requirements or template-style references need to be synchronized, but keep their contracts stable.',
    repairs.trim(),
    context.skill?.trim() ? `## Skill\n${context.skill.trim()}` : '',
    context.requirementsContract?.trim()
      ? `## Requirements contract\n${context.requirementsContract.trim()}`
      : '',
    context.styleGuideContract?.trim()
      ? `## Style-guide contract\n${context.styleGuideContract.trim()}`
      : '',
    context.schemaContract?.trim()
      ? `## Schema contract\n${context.schemaContract.trim()}`
      : '',
    context.previewContract?.trim()
      ? `## Preview/runtime assumptions\n${context.previewContract.trim()}`
      : '',
    context.checklist?.trim() ? `## Checklist\n${context.checklist.trim()}` : '',
    context.requirementsTemplate?.trim()
      ? `## Seed requirements template\n${context.requirementsTemplate.trim()}`
      : '',
    context.styleGuideTemplate?.trim()
      ? `## Seed style-guide template\n${context.styleGuideTemplate.trim()}`
      : '',
    context.schemaTemplate?.trim()
      ? `## Seed schema template\n${context.schemaTemplate.trim()}`
      : '',
    'Output only a short confirmation line after the file write is done.',
  ]
    .filter(Boolean)
    .join('\n\n');
}

async function ensureStorefrontSeedFiles(projectDir, templates) {
  await writeIfAbsent(
    path.join(projectDir, STOREFRONT_REQUIREMENTS_FILE),
    `${templates.requirementsText.trim()}\n`,
  );
  await writeIfAbsent(
    path.join(projectDir, STOREFRONT_STYLE_GUIDE_FILE),
    `${templates.styleGuideText.trim()}\n`,
  );
  await writeIfAbsent(
    path.join(projectDir, STOREFRONT_SCHEMA_FILE),
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
  const text = await readTextMaybe(path.join(projectDir, STOREFRONT_REQUIREMENTS_FILE));
  return coerceRequirements(tryParseJson(text));
}

async function readStyleGuideForProject(projectDir, requirements) {
  const text = await readTextMaybe(path.join(projectDir, STOREFRONT_STYLE_GUIDE_FILE));
  const { styleGuide } = await loadStyleGuideForProject(projectDir, requirements, text, { syncFile: true });
  return styleGuide;
}

async function loadStyleGuideForProject(projectDir, requirements, styleGuideText, options = {}) {
  const styleGuide = coerceStyleGuide(tryParseJson(styleGuideText), requirements);
  const nextText = `${JSON.stringify(toPublicStyleGuide(styleGuide), null, 2)}\n`;
  if (options.syncFile) {
    await writeTextIfChanged(
      path.join(projectDir, STOREFRONT_STYLE_GUIDE_FILE),
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

function coerceRequirements(raw) {
  if (raw && typeof raw === 'object' && Array.isArray(raw.modules) && raw.style) {
    const modules = uniqueStrings(raw.modules).filter((moduleType) =>
      DEFAULT_MODULES.includes(moduleType),
    );
    return {
      status: raw.status === 'confirmed' ? 'confirmed' : 'needs_confirmation',
      source_prompt: stringOr(raw.source_prompt, '店铺首页'),
      modules: modules.length > 0 ? modules : DEFAULT_MODULES,
      module_content: normalizeModuleContent(raw.module_content),
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
        sliderCount: toPositiveInteger(raw.counts?.sliderCount, 2),
        goodsCount: toPositiveInteger(raw.counts?.goodsCount, 3),
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

function normalizeModuleContent(input) {
  const out = {};
  for (const moduleType of DEFAULT_MODULES) {
    out[moduleType] = stringOr(input?.[moduleType]);
  }
  return out;
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

function createUserAssetsSlots(count) {
  if (count <= 1) {
    return [
      { id: 'slot_1', role: 'main_action', size: 'medium', position: 'slot_1' },
    ];
  }
  if (count === 2) {
    return [
      { id: 'left', role: 'sub_action', size: 'medium', position: 'left' },
      { id: 'right', role: 'sub_action', size: 'medium', position: 'right' },
    ];
  }
  if (count === 3) {
    return [
      { id: 'left_1', role: 'sub_action', size: 'medium', position: 'left_1' },
      { id: 'center_1', role: 'sub_action', size: 'medium', position: 'center_1' },
      { id: 'right_1', role: 'sub_action', size: 'medium', position: 'right_1' },
    ];
  }
  if (count === 4) {
    return [
      { id: 'top_left', role: 'sub_action', size: 'medium', position: 'top_left' },
      { id: 'top_right', role: 'sub_action', size: 'medium', position: 'top_right' },
      { id: 'bottom_left', role: 'sub_action', size: 'medium', position: 'bottom_left' },
      { id: 'bottom_right', role: 'sub_action', size: 'medium', position: 'bottom_right' },
    ];
  }
  if (count === 5) {
    return [
      { id: 'top_left', role: 'sub_action', size: 'medium', position: 'top_left' },
      { id: 'top_right', role: 'sub_action', size: 'medium', position: 'top_right' },
      { id: 'bottom_left', role: 'sub_action', size: 'medium', position: 'bottom_left' },
      { id: 'bottom_center', role: 'sub_action', size: 'medium', position: 'bottom_center' },
      { id: 'bottom_right', role: 'sub_action', size: 'medium', position: 'bottom_right' },
    ];
  }
  return Array.from({ length: count }, (_, index) => ({
    id: `slot_${index + 1}`,
    role: 'sub_action',
    size: 'medium',
    position: `slot_${index + 1}`,
  }));
}

function createUserAssetsSlotsMapping(labels, slots) {
  return Object.fromEntries(
    slots.map((slot, index) => [
      slot.id,
      {
        icon: 'sparkles',
        title: stringOr(labels[index], `入口 ${index + 1}`),
        subtitle: '功能入口',
      },
    ]),
  );
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

  const modules = req.modules.map((moduleType) =>
    createSeedModule(moduleType, req, designContext, guide),
  );

  return {
    page_id: 'storefront_homepage',
    version: '1.0.0',
    layout_mode: 'overlay',
    design_context: designContext,
    modules,
  };
}

function createSeedModule(moduleType, requirements, designContext, styleGuide) {
  const base = {
    id: `${moduleType}_1`,
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
    return {
      ...base,
      data: {
        greeting: userAssetsDefaults.greeting,
        nickname: USER_ASSETS_DEFAULTS.nickname,
        upgrade_tip: userAssetsDefaults.upgrade_tip,
        progress_percent: 33,
        body_image: '',
        body_image_no_cache: false,
        body_alt: USER_ASSETS_DEFAULTS.bodyAlt,
        body_image_schema: createDefaultUserAssetsImageSchema(
          designContext.color_palette.accent,
          styleGuide,
          requirements,
        ),
      },
    };
  }

  const itemCount =
    moduleType === 'top_slider'
      ? requirements.counts.sliderCount
      : moduleType === 'goods'
        ? requirements.counts.goodsCount
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
        createSeedImageItem(moduleType, index, requirements, designContext, styleGuide),
      ),
    },
  };
}

function createSeedImageItem(moduleType, index, requirements, designContext, styleGuide) {
  const promptSchema = createDefaultImagePromptSchema(
    moduleType,
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

function createDefaultImagePromptSchema(moduleType, requirements, designContext, styleGuide, index = 0) {
  const brandName = requirements.style.brand_name || '店铺品牌';
  const moduleContent = requirements.module_content?.[moduleType] || '';
  const accent = designContext.color_palette.accent;
  const backgroundColor =
    moduleType === 'goods'
      ? designContext.color_palette.card_subtle
      : designContext.color_palette.bg;
  const type = IMAGE_PROMPT_TYPE_MAP[moduleType];
  const ratio = IMAGE_RATIO_MAP[moduleType];
  const structure = IMAGE_STRUCTURE_MAP[moduleType];
  const itemLabel = index > 0 ? ` ${index + 1}` : '';
  const title =
    moduleType === 'top_slider'
      ? `${brandName}${itemLabel}`
      : moduleType === 'banner'
        ? '精选入口'
        : moduleType === 'goods'
          ? `主推商品${itemLabel}`
          : '品牌故事';
  const subtitle =
    moduleType === 'top_slider'
      ? 'SPRING FEATURE'
      : moduleType === 'banner'
        ? 'DISCOVER MORE'
        : moduleType === 'goods'
          ? 'LIMITED PICK'
          : 'ABOUT THE BRAND';
  const description = moduleContent || `${brandName} 店铺首页模块`;
  const styleTone = resolvePromptStyleTone(requirements, styleGuide);

  return {
    type,
    version: '1.0',
    template:
      moduleType === 'banner'
        ? 'promotion'
        : moduleType === 'shop_info'
          ? 'brand'
          : 'product',
    layout: {
      ratio,
      structure,
      padding: 24,
      full_bleed: true,
    },
    style: {
      background_type:
        styleGuide?.preset_id === 'bakery-handdrawn-cream'
          ? 'solid'
          : moduleType === 'goods'
            ? 'solid'
            : 'gradient',
      background_color: backgroundColor,
      primary_color: accent,
      accent_color: accent,
      text_color: designContext.color_palette.text_primary,
      style_tone: styleTone,
      visual_feel: 'realistic_ui',
    },
    product: {
      name: moduleType === 'goods' ? `商品 ${index + 1}` : brandName,
      category: inferCategory(requirements.style.industry),
      visual_type: 'photo',
      scene: moduleType === 'shop_info' ? 'composition' : 'single',
      elements: moduleContent ? [moduleContent] : [],
    },
    content: {
      title,
      subtitle,
      description,
      tags:
        moduleType === 'top_slider' || moduleType === 'shop_info'
          ? []
          : moduleType === 'banner'
            ? ['精选', '入口']
            : ['热卖'],
    },
    promotion: {
      price: moduleType === 'goods' ? '¥99 起' : '',
      original_price: '',
      discount: '',
      badge: moduleType === 'banner' ? '活动' : '',
      cta: moduleType === 'goods' ? '立即购买' : '',
    },
    brand: {
      name: brandName,
      slogan: requirements.style.tone || '',
      logo_position: moduleType === 'shop_info' ? 'bottom' : 'corner',
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
            }
          : {}),
    },
  };
}

function createDefaultUserAssetsImageSchema(accent, styleGuide, requirements) {
  const userAssetsDefaults = resolvePresetUserAssetsDefaults(styleGuide, accent, requirements);
  return {
    type: 'mobile_ui_entry_panel',
    instruction: {
      strict_mode: true,
      canvas_rules: {
        background: 'pure_white',
        no_border: true,
        no_divider: true,
        no_outline: true,
      },
    },
    layout: userAssetsDefaults.layout,
    visual_style: {
      design_principle: userAssetsDefaults.visual_style.design_principle,
      brand_tone: userAssetsDefaults.visual_style.brand_tone,
      color_system: {
        primary: accent,
        usage: userAssetsDefaults.visual_style.color_system.usage,
      },
      icon: userAssetsDefaults.visual_style.icon,
      block: userAssetsDefaults.visual_style.block,
      typography: userAssetsDefaults.visual_style.typography,
    },
    content: {
      mode: 'dynamic_binding',
      source: 'slots_mapping',
      fields: ['icon', 'title', 'subtitle'],
      slots_mapping: userAssetsDefaults.slots_mapping,
    },
    constraints: [
      'pure_white_background',
      'no_border',
      'no_divider',
      'no_outline',
      'no_extra_cards',
      'no_floating_elements',
      'no_circle_entries',
    ],
    output: {
      aspect_ratio: 'dynamic',
      format: 'image',
      target: 'mobile_ui',
    },
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
  const actionLabels = resolveActionButtonLabels(requirements);
  const slots = createUserAssetsSlots(actionLabels.length);
  const slotsMapping = createUserAssetsSlotsMapping(actionLabels, slots);

  return {
    greeting: stringOr(preset?.greeting, USER_ASSETS_DEFAULTS.greeting),
    upgrade_tip: stringOr(preset?.upgrade_tip, '完善会员等级和权益，提升复购效率。'),
    layout: {
      structure: actionLabels.length > 5 ? 'freeform' : 'grid',
      distribution: stringOr(preset?.layout?.distribution, 'auto_balance'),
      alignment: {
        horizontal: stringOr(preset?.layout?.alignment?.horizontal, 'full_bleed'),
        edge: stringOr(preset?.layout?.alignment?.edge, 'no_padding'),
      },
      spacing: {
        mode: stringOr(preset?.layout?.spacing?.mode, 'whitespace_only'),
        density: stringOr(preset?.layout?.spacing?.density, 'comfortable'),
      },
      grouping: {
        enabled: preset?.layout?.grouping?.enabled !== false,
        visual_method: stringOr(preset?.layout?.grouping?.visual_method, 'spacing_only'),
      },
      slots,
    },
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
    slots_mapping: slotsMapping,
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
    page_id: stringOr(source.page_id, 'storefront_homepage'),
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
  if (!isPlainObject(module) || !DEFAULT_MODULES.includes(module.type)) {
    return null;
  }
  const type = module.type;
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
    data: normalizeImageModuleData(type, module.data, requirements, designContext, styleGuide),
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

function normalizeImageModuleData(type, value, requirements, designContext, styleGuide) {
  const req = coerceRequirements(requirements);
  const mode = normalizeImageModuleMode(value?.mode, type, value?.items);
  const itemSeedCount =
    type === 'top_slider'
      ? req.counts.sliderCount
      : type === 'goods'
        ? req.counts.goodsCount
        : 1;
  const items = Array.isArray(value?.items)
    ? value.items
        .filter(isPlainObject)
        .map((item, index) => normalizeImageItem(type, item, index, req, designContext, styleGuide))
    : [];
  const normalizedItems = items.length > 0
    ? items
    : Array.from({ length: Math.max(1, itemSeedCount) }, (_, index) =>
        createSeedImageItem(type, index, req, designContext, styleGuide),
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

function normalizeImageItem(type, item, index, requirements, designContext, styleGuide) {
  const fallback = createSeedImageItem(type, index, requirements, designContext, styleGuide);
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
    aspect_ratio: stringOr(item.aspect_ratio, IMAGE_RATIO_MAP[type]),
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

  return {
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
      background_type: stringOr(style.background_type, fallback.style.background_type),
      background_color: stringOr(style.background_color, fallback.style.background_color),
      primary_color: sanitizeHexColor(style.primary_color, fallback.style.primary_color),
      accent_color: sanitizeHexColor(style.accent_color, fallback.style.accent_color),
      text_color: sanitizeHexColor(style.text_color, fallback.style.text_color),
      style_tone: stringOr(style.style_tone, fallback.style.style_tone),
      visual_feel: stringOr(style.visual_feel, fallback.style.visual_feel),
    },
    product: {
      name: stringOr(product.name, fallback.product.name),
      category: stringOr(product.category, fallback.product.category),
      visual_type: stringOr(product.visual_type, fallback.product.visual_type),
      scene: stringOr(product.scene, fallback.product.scene),
      elements: Array.isArray(product.elements)
        ? product.elements.filter((value) => typeof value === 'string')
        : fallback.product.elements,
    },
    content: {
      title: stringOr(content.title, fallback.content.title),
      subtitle: stringOr(content.subtitle, fallback.content.subtitle),
      description: stringOr(content.description, fallback.content.description),
      tags: Array.isArray(content.tags)
        ? content.tags.filter((value) => typeof value === 'string')
        : fallback.content.tags,
    },
    promotion: {
      price: stringOr(promotion.price, fallback.promotion.price),
      original_price: stringOr(promotion.original_price, fallback.promotion.original_price),
      discount: stringOr(promotion.discount, fallback.promotion.discount),
      badge: stringOr(promotion.badge, fallback.promotion.badge),
      cta: stringOr(promotion.cta, fallback.promotion.cta),
    },
    brand: {
      name: stringOr(brand.name, fallback.brand.name),
      slogan: stringOr(brand.slogan, fallback.brand.slogan),
      logo_position: stringOr(brand.logo_position, fallback.brand.logo_position),
    },
    constraints: {
      ...fallback.constraints,
      ...constraints,
    },
  };
}

function normalizeUserAssetsData(value, designContext, styleGuide, requirements) {
  const fallbackSchema = createDefaultUserAssetsImageSchema(
    designContext.color_palette.accent,
    styleGuide,
    requirements,
  );
  const userAssetsDefaults = resolvePresetUserAssetsDefaults(
    styleGuide,
    designContext.color_palette.accent,
    requirements,
  );
  return {
    greeting: stringOr(value?.greeting, userAssetsDefaults.greeting),
    nickname: stringOr(value?.nickname, USER_ASSETS_DEFAULTS.nickname),
    avatar: stringOr(value?.avatar),
    upgrade_tip: stringOr(value?.upgrade_tip, userAssetsDefaults.upgrade_tip),
    progress_percent: toNumber(value?.progress_percent, 33),
    height: toNumber(value?.height, 188),
    body_image: stringOr(value?.body_image),
    body_image_no_cache: value?.body_image_no_cache === true,
    body_alt: stringOr(value?.body_alt, USER_ASSETS_DEFAULTS.bodyAlt),
    body_image_schema: isPlainObject(value?.body_image_schema)
      ? normalizeUserAssetsSchema(value.body_image_schema, fallbackSchema)
      : fallbackSchema,
  };
}

function normalizeUserAssetsSchema(input, fallback) {
  const layout = isPlainObject(input.layout) ? input.layout : {};
  const spacing = isPlainObject(layout.spacing) ? layout.spacing : {};
  const alignment = isPlainObject(layout.alignment) ? layout.alignment : {};
  const grouping = isPlainObject(layout.grouping) ? layout.grouping : {};
  const visualStyle = isPlainObject(input.visual_style) ? input.visual_style : {};
  const colorSystem = isPlainObject(visualStyle.color_system) ? visualStyle.color_system : {};
  const usage = isPlainObject(colorSystem.usage) ? colorSystem.usage : {};
  const icon = isPlainObject(visualStyle.icon) ? visualStyle.icon : {};
  const block = isPlainObject(visualStyle.block) ? visualStyle.block : {};
  const typography = isPlainObject(visualStyle.typography) ? visualStyle.typography : {};
  const content = isPlainObject(input.content) ? input.content : {};
  const slotsMapping = isPlainObject(content.slots_mapping) ? content.slots_mapping : {};
  const output = isPlainObject(input.output) ? input.output : {};

  return {
    type: stringOr(input.type, fallback.type),
    instruction: fallback.instruction,
    layout: {
      structure: stringOr(layout.structure, fallback.layout.structure),
      distribution: stringOr(layout.distribution, fallback.layout.distribution),
      alignment: {
        horizontal: stringOr(alignment.horizontal, fallback.layout.alignment.horizontal),
        edge: stringOr(alignment.edge, fallback.layout.alignment.edge),
      },
      spacing: {
        mode: stringOr(spacing.mode, fallback.layout.spacing.mode),
        density: stringOr(spacing.density, fallback.layout.spacing.density),
      },
      grouping: {
        enabled: grouping.enabled !== false,
        visual_method: stringOr(grouping.visual_method, fallback.layout.grouping.visual_method),
      },
      slots: normalizeUserAssetsSlots(layout.slots, fallback.layout.slots),
    },
    visual_style: {
      design_principle: stringOr(visualStyle.design_principle, fallback.visual_style.design_principle),
      brand_tone: stringOr(visualStyle.brand_tone, fallback.visual_style.brand_tone),
      color_system: {
        primary: sanitizeHexColor(colorSystem.primary, fallback.visual_style.color_system.primary),
        usage: {
          icon: usage.icon !== false,
          accent: usage.accent !== false,
          background: usage.background === true,
        },
      },
      icon: {
        style: stringOr(icon.style, fallback.visual_style.icon.style),
        shape: stringOr(icon.shape, fallback.visual_style.icon.shape),
        stroke: stringOr(icon.stroke, fallback.visual_style.icon.stroke),
      },
      block: {
        radius: toNumber(block.radius, fallback.visual_style.block.radius),
        shadow: stringOr(block.shadow, fallback.visual_style.block.shadow),
      },
      typography: {
        title_case: stringOr(typography.title_case, fallback.visual_style.typography.title_case),
        subtitle_case: stringOr(typography.subtitle_case, fallback.visual_style.typography.subtitle_case),
      },
    },
    content: {
      mode: stringOr(content.mode, fallback.content.mode),
      source: stringOr(content.source, fallback.content.source),
      fields: Array.isArray(content.fields)
        ? content.fields.filter((value) => typeof value === 'string')
        : fallback.content.fields,
      slots_mapping: normalizeUserAssetsSlotsMapping(
        slotsMapping,
        normalizeUserAssetsSlots(layout.slots, fallback.layout.slots),
        fallback.content.slots_mapping,
      ),
    },
    constraints: Array.isArray(input.constraints)
      ? input.constraints.filter((value) => typeof value === 'string')
      : fallback.constraints,
    output: {
      aspect_ratio: stringOr(output.aspect_ratio, fallback.output.aspect_ratio),
      format: stringOr(output.format, fallback.output.format),
      target: stringOr(output.target, fallback.output.target),
    },
  };
}

function normalizeUserAssetsSlots(slots, fallbackSlots) {
  if (!Array.isArray(slots) || slots.length < 1) {
    return fallbackSlots;
  }
  return slots
    .filter(isPlainObject)
    .map((slot, index) => ({
      id: stringOr(slot.id, `slot_${index + 1}`),
      role: stringOr(slot.role, 'sub_action'),
      size: stringOr(slot.size, 'medium'),
      position: stringOr(slot.position, stringOr(slot.id, `slot_${index + 1}`)),
    }));
}

function normalizeUserAssetsSlotsMapping(mapping, slots, fallbackMapping) {
  const out = {};
  for (const slot of slots) {
    const source = isPlainObject(mapping?.[slot.id]) ? mapping[slot.id] : fallbackMapping?.[slot.id];
    out[slot.id] = {
      icon: stringOr(source?.icon, 'sparkles'),
      title: stringOr(source?.title, '入口'),
      subtitle: stringOr(source?.subtitle, '功能入口'),
    };
  }
  return out;
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

function hasGeneratedAssets(schema) {
  return schema.modules.some((module) => {
    if (module.type === 'user_assets') {
      return Boolean(module.data?.body_image);
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
    path.join(projectDir, STOREFRONT_SCREEN_FILE),
    screenHtml,
  );
  const screenStat = await statMaybe(path.join(projectDir, STOREFRONT_SCREEN_FILE));
  const previewHtml = compileStorefrontPreview({
    projectId,
    previewUpdatedAt: screenStat?.mtimeMs ?? Date.now(),
    designContext: schema?.design_context ?? resolveDesignContextBase(styleGuide, requirements),
  });
  await writeTextIfChanged(
    path.join(projectDir, STOREFRONT_PREVIEW_FILE),
    previewHtml,
  );
}

async function persistSchema(projectDir, projectId, schema, requirements, styleGuide) {
  await Promise.all([
    fs.writeFile(
      path.join(projectDir, STOREFRONT_SCHEMA_FILE),
      `${JSON.stringify(schema, null, 2)}\n`,
      'utf8',
    ),
    ensurePreviewArtifacts(projectDir, projectId, schema, requirements, [], styleGuide),
  ]);
}

function compileStorefrontPreview({ projectId, previewUpdatedAt, designContext }) {
  const screenPath = `/api/projects/${encodeURIComponent(projectId)}/files/${encodeURIComponent(STOREFRONT_SCREEN_FILE)}?v=${Math.round(previewUpdatedAt)}`;
  const frameSrc = `/frames/iphone-15-pro.html?screen=${encodeURIComponent(screenPath)}`;
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
      iframe {
        width: 430px;
        height: 920px;
        border: 0;
        background: transparent;
      }
    </style>
  </head>
  <body>
    <div class="preview-stage">
      <div class="preview-caption">Workspace storefront runtime preview</div>
      <iframe src="${escapeAttr(frameSrc)}" loading="lazy"></iframe>
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
      html, body { margin: 0; padding: 0; min-height: 100%; }
      body {
        background:
          radial-gradient(circle at top, var(--sf-accent-soft), transparent 34%),
          linear-gradient(180deg, ${bgSoft} 0%, var(--sf-bg) 100%);
        color: var(--sf-fg);
        font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif;
        -webkit-font-smoothing: antialiased;
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
        padding: 12px;
        border-radius: 24px;
        border: 1px dashed rgba(255,255,255,0.58);
        background: rgba(255,255,255,0.68);
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
        position: relative;
        display: flex;
        flex-direction: column;
        gap: 10px;
        height: 100%;
        overflow: hidden;
        padding: 12px;
        background: linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(201,140,90,0.1) 100%);
      }
      .sf-user-assets-placeholder::before {
        content: "";
        position: absolute;
        top: -30px;
        right: -28px;
        width: 120px;
        height: 120px;
        border-radius: 50%;
        background: rgba(201,140,90,0.16);
      }
      .sf-user-assets-placeholder__inner {
        position: relative;
        z-index: 1;
        display: flex;
        flex-direction: column;
        gap: 10px;
        height: 100%;
      }
      .sf-user-assets-placeholder__layout {
        flex: 1;
        min-height: 0;
      }
      .sf-user-assets-entry {
        height: 100%;
        border-radius: 20px;
        background: rgba(255,255,255,0.9);
        border: 1px solid rgba(255,255,255,0.48);
        box-shadow: 0 18px 40px rgba(31,41,55,0.08);
        padding: 14px 14px 12px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        gap: 12px;
      }
      .sf-user-assets-entry.is-large {
        border-radius: 24px;
        padding: 16px 16px 14px;
      }
      .sf-user-assets-entry__icon {
        width: 38px;
        height: 38px;
        border-radius: 14px;
        background: linear-gradient(135deg, rgba(255,255,255,0.9), rgba(201,140,90,0.16));
        border: 1px solid rgba(255,255,255,0.48);
      }
      .sf-user-assets-entry.is-large .sf-user-assets-entry__icon {
        width: 46px;
        height: 46px;
        border-radius: 16px;
      }
      .sf-user-assets-entry__copy {
        display: grid;
        gap: 4px;
      }
      .sf-user-assets-entry__title {
        font-size: 14px;
        line-height: 20px;
        font-weight: 650;
      }
      .sf-user-assets-entry.is-large .sf-user-assets-entry__title {
        font-size: 18px;
        line-height: 24px;
      }
      .sf-user-assets-entry__subtitle {
        font-size: 10px;
        line-height: 14px;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        color: rgba(31,41,55,0.62);
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
        background: var(--sf-card-subtle);
        overflow: hidden;
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
    <main class="sf-root">
      ${errorBanner}
      ${modulesHtml}
    </main>
    <script>
      (function () {
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
    return `<div class="sf-carousel sf-top-slider" data-carousel="true">
      ${items
        .map((item, index) => `<div class="sf-carousel__item${index === 0 ? ' is-active' : ''}" ${imageCardStyleAttr(item, height)}>${renderImageItem(projectId, module.type, item, height)}</div>`)
        .join('')}
      <div class="sf-carousel__dots">
        ${items.map((_, index) => `<span class="${index === 0 ? 'is-active' : ''}"></span>`).join('')}
      </div>
    </div>`;
  }

  if (data.mode === 'dual_carousel' && items.length >= 2) {
    const topHeight = Math.max(80, Math.floor((height - 12) / 2));
    const first = items[0];
    const second = items[1];
    return `<div style="display:flex;flex-direction:column;gap:12px${hasImageAsset(first) && hasImageAsset(second) ? '' : `;min-height:${height}px`}">
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
  const metrics = resolveUserAssetsLayoutMetrics(data.body_image_schema);
  const asset = resolveAssetUrl(projectId, data.body_image);
  const avatar = resolveAssetUrl(projectId, data.avatar || USER_ASSETS_DEFAULTS.avatar);
  const bodyHeight = Math.round((metrics.canvasHeight / metrics.canvasWidth) * 311);
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
      ${asset
        ? `<img src="${escapeAttr(asset)}" alt="${escapeAttr(stringOr(data.body_alt, USER_ASSETS_DEFAULTS.bodyAlt))}" class="sf-image-fill" />`
        : renderUserAssetsPendingPlaceholder(data.body_image_schema)}
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

function renderGenericPendingImageMark(label = '图片待生成') {
  return `<div class="sf-placeholder__generic-image">
    <svg viewBox="0 0 46 46" fill="none" aria-hidden="true">
      <rect x="8" y="10" width="30" height="26" rx="7" stroke="currentColor" stroke-width="1.6"></rect>
      <circle cx="18" cy="19" r="3.5" fill="currentColor" opacity="0.42"></circle>
      <path d="M14 32l7.2-7.2 5.1 5.1 3.5-3.5L36 32" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"></path>
    </svg>
    <span>${escapeHtml(label)}</span>
  </div>`;
}

function renderImagePlaceholderArt(_variant) {
  return renderGenericPendingImageMark();
}

function userAssetsDetailFor(schema) {
  const slots = Array.isArray(schema?.layout?.slots) ? schema.layout.slots : [];
  const structure = stringOr(schema?.layout?.structure);
  const layoutLabel = structure === 'asymmetric'
    ? '非对称入口布局'
    : structure === 'grid'
      ? '宫格入口布局'
      : structure === 'horizontal'
        ? '横向入口布局'
        : structure === 'vertical'
          ? '纵向入口布局'
          : '入口布局预排';
  return `${slots.length} 个入口 · ${layoutLabel}`;
}

function renderUserAssetsEntry(item, large = false) {
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

function renderUserAssetsPendingLayout(schema) {
  const slots = Array.isArray(schema?.layout?.slots) ? schema.layout.slots : [];
  const mapping = isPlainObject(schema?.content?.slots_mapping) ? schema.content.slots_mapping : {};
  const ids = slots.map((slot) => stringOr(slot.position || slot.id));
  const has = (...entries) => entries.every((entry) => ids.includes(entry));

  if (has('left_large', 'right_top', 'right_bottom')) {
    const left = slots.find((slot) => stringOr(slot.position) === 'left_large');
    const rightTop = slots.find((slot) => stringOr(slot.position) === 'right_top');
    const rightBottom = slots.find((slot) => stringOr(slot.position) === 'right_bottom');
    return `<div class="sf-user-assets-placeholder__layout" style="${styleAttr({
      display: 'grid',
      gridTemplateColumns: '1.08fr 1fr',
      gap: '10px',
      height: '100%',
    })}">
      <div>${renderUserAssetsEntry(left?.id ? mapping[left.id] : undefined, true)}</div>
      <div style="display:grid;gap:10px">
        ${renderUserAssetsEntry(rightTop?.id ? mapping[rightTop.id] : undefined)}
        ${renderUserAssetsEntry(rightBottom?.id ? mapping[rightBottom.id] : undefined)}
      </div>
    </div>`;
  }

  if (has('top_left', 'top_right', 'bottom_left', 'bottom_right') && slots.length === 4) {
    return `<div class="sf-user-assets-placeholder__layout" style="${styleAttr({
      display: 'grid',
      gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
      gap: '10px',
      height: '100%',
    })}">
      ${slots.map((slot) => renderUserAssetsEntry(slot.id ? mapping[slot.id] : undefined)).join('')}
    </div>`;
  }

  if (
    has('top_left', 'top_right', 'bottom_left', 'bottom_center', 'bottom_right') &&
    slots.length === 5
  ) {
    const topSlots = slots.slice(0, 2);
    const bottomSlots = slots.slice(2);
    return `<div class="sf-user-assets-placeholder__layout" style="display:grid;gap:10px;height:100%">
      <div style="display:grid;grid-template-columns:repeat(2, minmax(0, 1fr));gap:10px">
        ${topSlots.map((slot) => renderUserAssetsEntry(slot.id ? mapping[slot.id] : undefined)).join('')}
      </div>
      <div style="display:grid;grid-template-columns:repeat(3, minmax(0, 1fr));gap:10px">
        ${bottomSlots.map((slot) => renderUserAssetsEntry(slot.id ? mapping[slot.id] : undefined)).join('')}
      </div>
    </div>`;
  }

  const fallbackSlots = slots.length > 0 ? slots : [{ id: 'slot-1' }, { id: 'slot-2' }, { id: 'slot-3' }];
  const columns = fallbackSlots.length >= 4 ? 2 : Math.min(fallbackSlots.length, 3);
  return `<div class="sf-user-assets-placeholder__layout" style="${styleAttr({
    display: 'grid',
    gridTemplateColumns: `repeat(${Math.max(columns, 1)}, minmax(0, 1fr))`,
    gap: '10px',
    height: '100%',
  })}">
    ${fallbackSlots.map((slot) => renderUserAssetsEntry(slot.id ? mapping[slot.id] : undefined)).join('')}
  </div>`;
}

function renderUserAssetsPendingPlaceholder(schema) {
  return `<div class="sf-user-assets-placeholder">
    <div class="sf-user-assets-placeholder__inner">
      <div class="sf-placeholder__top">
        <span class="sf-placeholder__chip">入口布局预览</span>
        <span class="sf-placeholder__status">待生成</span>
      </div>
      <div style="flex:1;min-height:0;display:flex;align-items:center">
        ${renderGenericPendingImageMark('入口素材待生成')}
      </div>
      <div class="sf-placeholder__footer">
        <strong class="sf-placeholder__title">默认入口布局</strong>
        <span class="sf-placeholder__desc">${escapeHtml(userAssetsDetailFor(schema))}</span>
      </div>
    </div>
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
  const metrics = resolveUserAssetsLayoutMetrics(module.data.body_image_schema);
  const availableWidth = clamp(
    schema.design_context.page_width - schema.design_context.spacing * 2 - 32,
    260,
    schema.design_context.page_width,
  );
  const imageHeight = Math.round((availableWidth * metrics.canvasHeight) / metrics.canvasWidth);
  const hasBodyImage = Boolean(
    module.data.body_image ||
      Object.keys(module.data.body_image_schema?.content?.slots_mapping ?? {}).length,
  );
  const fallback = hasBodyImage ? imageHeight + 134 : 132;
  const maxHeight = metrics.isFreeform ? 760 : 560;
  return blendSuggestion(toNumber(module.data.height, fallback), fallback, 124, maxHeight);
}

function resolveUserAssetsLayoutMetrics(schema) {
  const slots = Array.isArray(schema?.layout?.slots) ? schema.layout.slots : [];
  const ids = slots.map((slot) => stringOr(slot.position || slot.id));
  const has = (...entries) => entries.every((entry) => ids.includes(entry));
  if (has('left_large', 'right_top', 'right_bottom')) {
    return { canvasWidth: 632, canvasHeight: 456, isFreeform: false };
  }
  if (has('left', 'right') && slots.length === 2) {
    return { canvasWidth: 632, canvasHeight: 220, isFreeform: false };
  }
  if (has('left_1', 'center_1', 'right_1') && slots.length === 3) {
    return { canvasWidth: 632, canvasHeight: 220, isFreeform: false };
  }
  if (has('top_left', 'top_right', 'bottom_left', 'bottom_right') && slots.length === 4) {
    return { canvasWidth: 632, canvasHeight: 456, isFreeform: false };
  }
  if (
    has('top_left', 'top_right', 'bottom_left', 'bottom_center', 'bottom_right') &&
    slots.length === 5
  ) {
    return { canvasWidth: 632, canvasHeight: 456, isFreeform: false };
  }
  const rows = Math.max(1, Math.ceil(slots.length / 3));
  return {
    canvasWidth: 632,
    canvasHeight: rows * 220 + Math.max(0, rows - 1) * 16,
    isFreeform: true,
  };
}

function collectAssetTasks(schema, styleGuide, forceRegenerate) {
  const tasks = [];

  for (const module of schema.modules) {
    if (module.type === 'user_assets') {
      if (!forceRegenerate && stringOr(module.data.body_image)) continue;
      const metrics = resolveUserAssetsLayoutMetrics(module.data.body_image_schema);
      tasks.push({
        fileName: `${IMAGE_FILE_PREFIX.user_assets}-1.png`,
        prompt: buildUserAssetsPrompt(module.data.body_image_schema, styleGuide),
        size: resolveSizeFromDimensions(metrics.canvasWidth, metrics.canvasHeight),
        assign: (fileName) => {
          module.data.body_image = fileName;
          module.data.body_image_no_cache = false;
        },
      });
      continue;
    }

    if (!Array.isArray(module.data.items)) continue;
    module.data.items.forEach((item, index) => {
      if (!forceRegenerate && stringOr(item.image)) return;
      tasks.push({
        fileName: `${IMAGE_FILE_PREFIX[module.type]}-${index + 1}.png`,
        prompt: buildImagePrompt(module.type, item, styleGuide),
        size: resolveSizeFromAspectRatio(item.aspect_ratio),
        assign: (fileName) => {
          item.image = fileName;
          item.no_cache = false;
        },
      });
    });
  }

  return tasks;
}

function buildImagePrompt(moduleType, item, styleGuide) {
  const promptSchema = deepClone(item.image_prompt_schema ?? {});
  const styleNotes = buildStyleGenerationNotes(styleGuide, moduleType);
  if (moduleType === 'goods') {
    const cta = stringOr(promptSchema.promotion?.cta, '立即购买');
    promptSchema.generation_notes = [
      ...styleNotes,
      `商品图必须是带转化动作的营销卡片，购买行动点属于图片内容本身；请将“${cta}”直接设计在画面里，例如按钮、行动条或购买引导区。`,
      Array.isArray(item.reference_images) && item.reference_images.length > 0
        ? '已提供参考图：请沿用参考图中的商品主体、包装或摆盘方式、摄影风格、材质质感和整体气质。'
        : '未提供参考图：可以根据提示词自由发挥商品主体、场景和购买引导，但必须保持强转化视觉。',
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

function buildUserAssetsPrompt(bodyImageSchema, styleGuide) {
  const promptSchema = deepClone(bodyImageSchema ?? {});
  const styleNotes = buildStyleGenerationNotes(styleGuide, 'user_assets');
  if (styleNotes.length > 0) {
    promptSchema.generation_notes = styleNotes;
  }
  if (Array.isArray(styleGuide?.reference_images) && styleGuide.reference_images.length > 0) {
    promptSchema.reference_style = {
      preset_id: stringOr(styleGuide?.preset_id, 'custom'),
      reference_images: styleGuide.reference_images,
    };
  }
  return JSON.stringify(promptSchema);
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
      notes.push('客户资产入口图采用左大右二的不对称卡片布局，标题更像手写英文招牌而不是常规系统按钮。');
    } else if (moduleType === 'goods') {
      notes.push('商品图主体可以是真实烘焙产品摄影，但允许少量手绘箭头、贴纸和标题覆盖，不要做成标准商城白底商品图。');
    }
  }
  return uniqueStrings(notes.filter(Boolean));
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

async function generatePromptImage(prompt, size, config) {
  const response = await fetch(`${config.baseUrl}/images/generations`, {
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
  const minSide = 1024;
  const rounded = (value) => Math.max(minSide, Math.round(value / 16) * 16);
  return `${rounded(width)}x${rounded(height)}`;
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
