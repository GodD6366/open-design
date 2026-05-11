export type ShopHomePageJsonObject = Record<string, unknown>;

export type ShopHomePageImagePromptInput = {
  moduleType: string;
  item: ShopHomePageJsonObject;
  styleGuide?: ShopHomePageJsonObject | null;
};

export type ShopHomePageUserAssetsEntryPromptInput = {
  entry: ShopHomePageJsonObject;
  slot?: ShopHomePageJsonObject | null;
  cardLayout?: ShopHomePageJsonObject | null;
  styleGuide?: ShopHomePageJsonObject | null;
};

export const USER_ASSETS_TEMPLATE_TYPES = {
  SINGLE: 7,
  ONE_ROW_TWO: 1,
  LEFT_ONE_RIGHT_TWO: 2,
  ONE_ROW_THREE: 3,
  TWO_ROW_FIVE: 5,
  TWO_ROW_FOUR: 6,
  HOTZONE: 'hotzone',
} as const;

const USER_ASSETS_TEMPLATE_TYPE_LABELS: Record<string, string> = {
  7: '单张横图',
  1: '一行两个',
  2: '左一右二',
  3: '一行三个',
  5: '二行五个',
  6: '二行四个',
  hotzone: '热区自由布局',
};

export const ZERO_PADDING_GENERATION_NOTES = [
  '画面必须使用直角外轮廓输出：不要圆角卡片、圆角白底块、圆角外框或任何圆角包装层。',
  '不要内边距、安全边、留白边框；画布边缘直出但不要因此放大标题、增加文字或塞满装饰，不要再额外套一层卡片。',
  '画布四边必须是连续的主体背景，不要生成底部灰线、投影边、描边、分隔线、伪浏览器边框或透明留边。',
];

export const STOREFRONT_REFERENCE_COMPONENT_ANALYSIS_NOTE =
  '先理解参考图，对图片内容进行组件分析，然后对实际要绘制的组件进行参考，不要被其他不相关内容影响。';

const TOP_SLIDER_CROSS_MODULE_CUE_RE =
  /(user_assets|客户资产|入口卡|入口区|功能入口|入口按钮|按钮区|三列入口|三宫格|欢迎卡|会员卡|会员总卡|会员\/欢迎卡|悬浮欢迎|悬浮会员|下方|底部|banner|Banner|商品|goods|shop_info|品牌故事)/i;

const USER_ASSETS_CROSS_MODULE_CUE_RE =
  /(top_slider|首屏\s*hero|顶部\s*hero|顶部主视觉|主视觉|品牌海报|海报式|poster\s*hero|品牌字标|居中店名|店名|首屏|hero\s*composition)/i;

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

function stringOr(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function isPlainObject(value: unknown): value is ShopHomePageJsonObject {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function asObject(value: unknown): ShopHomePageJsonObject {
  return isPlainObject(value) ? value : {};
}

function uniqueStrings(values: unknown[]) {
  return [...new Set(values.filter((value): value is string => typeof value === 'string'))];
}

function cloneJsonObject(value: unknown): ShopHomePageJsonObject {
  if (!isPlainObject(value)) return {};
  return JSON.parse(JSON.stringify(value)) as ShopHomePageJsonObject;
}

function firstString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

function sanitizeUserAssetsEntryPromptContent(promptSchema: ShopHomePageJsonObject) {
  const content = isPlainObject(promptSchema.content) ? { ...promptSchema.content } : {};
  const entry = isPlainObject(promptSchema.entry) ? { ...promptSchema.entry } : {};
  const subtitle = stringOr(content.subtitle, stringOr(entry.subtitle));
  const title = stringOr(content.title, stringOr(entry.title));
  const description = stringOr(content.description);
  const looksLikeModuleSummary =
    /[、|/／]/.test(description) ||
    /(三大|多个|核心功能|功能入口|入口区|按钮|模块|客户资产|会员资产)/.test(description);
  const visibleText = subtitle || (!looksLikeModuleSummary ? description : '') || title;
  const forbiddenVisibleText = uniqueStrings([title].filter((value) => value && value !== visibleText));

  delete content.title;

  promptSchema.content = {
    ...content,
    subtitle: visibleText,
    description: visibleText,
    visible_text: visibleText,
    text_role: 'single_description_line',
    ...(title ? { non_visible_entry_intent: title } : {}),
    ...(forbiddenVisibleText.length > 0 ? { forbidden_visible_text: forbiddenVisibleText } : {}),
  };
  promptSchema.entry = {
    ...entry,
    ...(title ? { title } : {}),
    ...(visibleText ? { visible_text: visibleText } : {}),
    title_visibility: title && title !== visibleText ? 'semantic_intent_only_do_not_render' : 'not_needed',
  };

  const constraints = isPlainObject(promptSchema.constraints) ? promptSchema.constraints : {};
  promptSchema.constraints = {
    ...constraints,
    single_icon_and_description_only: true,
    max_visible_text_lines: 1,
    no_entry_title_when_subtitle_exists: true,
    no_module_summary_text: true,
    no_other_entry_names: true,
    no_third_line_text: true,
  };

  return promptSchema;
}

export function normalizeStorefrontReferenceImages(values: unknown) {
  return uniqueStrings(
    Array.isArray(values)
      ? values
          .filter((value): value is string => typeof value === 'string')
          .map((value) => value.trim())
          .filter(
            (value) =>
              value.length > 0 &&
              !/^(https?:|data:|blob:)/i.test(value),
          )
      : [],
  );
}

function coerceStyleGuideForPrompts(raw: unknown) {
  const input = asObject(raw);
  const analysis = asObject(input.analysis);
  const generationRules = asObject(input.generation_rules);

  return {
    version: stringOr(input.version, GENERIC_STYLE_GUIDE.version),
    preset_id: stringOr(input.preset_id, GENERIC_STYLE_GUIDE.preset_id),
    reference_images: normalizeStorefrontReferenceImages(
      Array.isArray(input.reference_images) ? input.reference_images : GENERIC_STYLE_GUIDE.reference_images,
    ),
    analysis: {
      source_summary: stringOr(analysis.source_summary, GENERIC_STYLE_GUIDE.analysis.source_summary),
      icon_style: stringOr(analysis.icon_style, GENERIC_STYLE_GUIDE.analysis.icon_style),
      background_style: stringOr(analysis.background_style, GENERIC_STYLE_GUIDE.analysis.background_style),
      layout_style: stringOr(analysis.layout_style, GENERIC_STYLE_GUIDE.analysis.layout_style),
      tone_keywords: uniqueStrings(
        Array.isArray(analysis.tone_keywords)
          ? analysis.tone_keywords
          : GENERIC_STYLE_GUIDE.analysis.tone_keywords,
      ),
    },
    generation_rules: {
      must: uniqueStrings(
        Array.isArray(generationRules.must)
          ? generationRules.must
          : GENERIC_STYLE_GUIDE.generation_rules.must,
      ),
      avoid: uniqueStrings(
        Array.isArray(generationRules.avoid)
          ? generationRules.avoid
          : GENERIC_STYLE_GUIDE.generation_rules.avoid,
      ),
    },
  };
}

function userAssetsTemplateTypeLabel(templateType: unknown) {
  return USER_ASSETS_TEMPLATE_TYPE_LABELS[String(templateType)] ?? '客户资产布局';
}

function splitStorefrontReferenceImages(referenceImages: unknown, styleGuide: unknown) {
  const normalizedReferenceImages = normalizeStorefrontReferenceImages(referenceImages);
  const guide = asObject(styleGuide);
  const styleGuideReferenceSet = new Set(
    normalizeStorefrontReferenceImages(Array.isArray(guide.reference_images) ? guide.reference_images : []),
  );
  const styleGuideReferences = normalizedReferenceImages.filter((referenceImage) =>
    styleGuideReferenceSet.has(referenceImage),
  );
  const moduleSpecificReferences = normalizedReferenceImages.filter((referenceImage) =>
    !styleGuideReferenceSet.has(referenceImage),
  );
  return {
    normalizedReferenceImages,
    styleGuideReferences,
    moduleSpecificReferences,
  };
}

export function sanitizeReferenceLedPromptSchema(
  promptSchema: ShopHomePageJsonObject,
  { moduleType, hasReferenceImages }: { moduleType?: string; hasReferenceImages?: boolean } = {},
) {
  if (!hasReferenceImages || !isPlainObject(promptSchema)) return promptSchema;

  const style = isPlainObject(promptSchema.style) ? { ...promptSchema.style } : null;
  const product = isPlainObject(promptSchema.product) ? { ...promptSchema.product } : null;

  if (style) {
    delete style.background_type;
    if (moduleType === 'user_assets') {
      delete style.background_color;
      delete style.text_color;
      delete style.primary_color;
      delete style.accent_color;
    }
    delete style.visual_feel;
    promptSchema.style = style;
  }
  if (product) {
    delete product.visual_type;
    delete product.scene;
    promptSchema.product = product;
  }

  const constraints = isPlainObject(promptSchema.constraints) ? { ...promptSchema.constraints } : {};
  if (moduleType === 'top_slider') {
    promptSchema.constraints = {
      ...constraints,
      reference_region: 'top_hero_only',
      forbid_customer_asset_buttons: true,
      forbid_member_or_welcome_card: true,
      forbid_lower_page_ui: true,
    };
  } else if (moduleType === 'user_assets') {
    delete constraints.pure_white_background;
    promptSchema.constraints = {
      ...constraints,
      reference_region: 'customer_asset_icon_card_only',
      forbid_hero_products: true,
      forbid_brand_hero_wordmark: true,
      forbid_member_summary_ui: true,
    };
  } else {
    promptSchema.constraints = constraints;
  }

  return promptSchema;
}

export function sanitizeStorefrontPromptCue(value: unknown) {
  return stringOr(value)
    .replace(/large white rounded cards/gi, 'clean white straight-edge blocks')
    .replace(/white rounded cards/gi, 'white straight-edge blocks')
    .replace(/rounded cards?/gi, 'straight-edge blocks')
    .replace(/rounded white cards?/gi, 'straight-edge white blocks')
    .replace(/圆角白底块/g, '直角白底模块')
    .replace(/圆角卡片/g, '直角模块')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function moduleScopedStorefrontCue(value: unknown, moduleType: string) {
  const cue = sanitizeStorefrontPromptCue(value);
  if (!cue) return '';
  if (moduleType === 'top_slider' && TOP_SLIDER_CROSS_MODULE_CUE_RE.test(cue)) {
    return '';
  }
  if (moduleType === 'user_assets' && USER_ASSETS_CROSS_MODULE_CUE_RE.test(cue)) {
    return '';
  }
  return cue;
}

export function buildStorefrontReferenceUsageNotes({
  moduleType = '',
  referenceImages,
  styleGuide,
}: {
  moduleType?: string;
  referenceImages?: unknown;
  styleGuide?: ShopHomePageJsonObject | null | undefined;
} = {}) {
  const {
    normalizedReferenceImages,
    styleGuideReferences,
    moduleSpecificReferences,
  } = splitStorefrontReferenceImages(referenceImages, styleGuide);
  if (normalizedReferenceImages.length === 0) return [];

  const notes: string[] = [];
  notes.push(STOREFRONT_REFERENCE_COMPONENT_ANALYSIS_NOTE);
  if (styleGuideReferences.length > 0) {
    notes.push(
      '若参考图是整页店铺截图，必须同时参考其中可复用的背景肌理、插画或 icon 笔触、配色气质、当前可见模块的构图语言、留白比例、信息密度、文字数量和标题尺度；不要照搬会员条、底部导航、状态栏、悬浮按钮或未确认的下一屏内容。',
      '共享参考图会约束版式与密度：当前模块的信息密度不得高于参考图对应区域，文字块数量、字重和字号层级要接近参考图；不要生成未请求的大标题、营销口号、促销标签或满屏装饰。',
    );
    if (moduleType === 'top_slider') {
      notes.push('顶部主视觉要参考首屏 hero 的空间分布、主体数量、留白比例、文字数量和标题尺度；不要为了“海报感”新增醒目的大号中文标题、额外 slogan、CTA、标签或密集涂鸦。');
      notes.push('顶部主视觉的参考区域仅限整页截图最上方 hero 组件；客户资产三宫格、入口按钮、会员/欢迎卡、下方 Banner、商品区和品牌故事区都属于其他组件，不得移植到轮播头图。');
    } else if (moduleType === 'user_assets') {
      notes.push('客户资产入口卡片只沿用可见入口图标区的 icon 笔触、卡片布局方式、卡片底色、文字颜色对比、配色语气、留白关系、标题层级、文字尺度和信息密度，不要把整页参考图中的会员总卡、底部导航或多模块组合直接画进单张入口卡。');
    } else if (moduleType === 'banner') {
      notes.push('Banner 参考整页风格里的色块、纹理、插画语气、留白和文字密度；保持轻量，不要直接搬用会员条、商品卡、导航条或其他运营模块。');
    } else if (moduleType === 'goods') {
      notes.push(
        moduleSpecificReferences.length > 0
          ? '若同时提供了更具体的商品参考图，商品主体、包装和摆盘优先跟随那些更具体的参考；整页截图仍用于页面风格、留白、信息密度和文字尺度定向。'
          : '当前参考图主要用于页面风格、构图密度、留白和文字尺度定向，不代表商品主体参考；商品主体、摆盘和购买引导需按当前商品文案重新设计。',
      );
    } else if (moduleType === 'shop_info') {
      notes.push('品牌信息长图参考整体品牌语气、插画背景、留白和文字密度，不要直接复刻参考页里的会员权益、交易入口或其他运营型 UI。');
    }
  }

  if (moduleType === 'user_assets') {
    notes.push('客户资产入口只模仿整页参考图里可见入口卡的布局方式、卡片底色、文字颜色、图标区笔触、留白、标题层级、文字尺度、信息密度和配色节奏；具体按钮图案、标题和副标题必须按当前入口需求生成，不要借用 hero 商品主体、会员汇总卡、其他按钮主体或原文案。');
  }

  if (moduleType === 'top_slider') {
    notes.push('顶部主视觉只参考整页图中的首屏 hero 氛围、构图、留白、文字数量、标题尺度和品牌气质，不要把客户资产三宫格、会员卡、活动 Banner 或下方内容直接带进轮播头图。');
  }

  if (moduleSpecificReferences.length > 0 && moduleType === 'goods') {
    notes.push('已提供更具体的商品参考图：可参考其中的商品主体、包装、摆盘、材质和摄影/插画方式，但仍需保持当前页面的统一品牌风格。');
  }

  return uniqueStrings(notes.filter(Boolean));
}

export function buildUserAssetsGenerationNotes(styleGuide: ShopHomePageJsonObject | null | undefined) {
  const notes: string[] = [];
  const guide = coerceStyleGuideForPrompts(styleGuide);
  if (guide.analysis.icon_style) {
    notes.push(`入口 icon 风格参考页面视觉：${guide.analysis.icon_style}`);
  }
  if (guide.analysis.background_style) {
    notes.push(`入口卡底色与文字对比参考页面视觉：${sanitizeStorefrontPromptCue(guide.analysis.background_style)}`);
  }
  const layoutStyle = moduleScopedStorefrontCue(guide.analysis.layout_style, 'user_assets');
  if (layoutStyle) {
    notes.push(`布局风格参考：${layoutStyle}`);
  }
  if (guide.generation_rules.avoid.length > 0) {
    const avoidNotes = guide.generation_rules.avoid
      .map((value) => moduleScopedStorefrontCue(value, 'user_assets'))
      .filter(Boolean);
    if (avoidNotes.length > 0) {
      notes.push(`避免：${avoidNotes.join('；')}`);
    }
  }
  if (guide.preset_id === 'bakery-handdrawn-cream') {
    notes.push('入口 icon 可以保留手绘涂鸦感和暖橙点缀；无参考图时默认白底，有参考图时优先跟随可见入口卡的底色与文字对比，不要引入奶油纸感整页背景或海报场景。');
  }
  return uniqueStrings(notes.filter(Boolean));
}

export function enforceStraightEdgeZeroPaddingPrompt(
  promptSchema: ShopHomePageJsonObject,
  { includeFullBleed = false }: { includeFullBleed?: boolean } = {},
) {
  const next = isPlainObject(promptSchema) ? promptSchema : {};
  const layout = isPlainObject(next.layout) ? next.layout : {};
  const constraints = isPlainObject(next.constraints) ? next.constraints : {};
  next.layout = {
    ...layout,
    padding: 0,
    ...(includeFullBleed ? { full_bleed: true } : {}),
  };
  next.constraints = {
    ...constraints,
    no_rounded_corners: true,
    no_padding: true,
  };
  return next;
}

export function buildStyleGenerationNotes(
  styleGuide: ShopHomePageJsonObject | null | undefined,
  moduleType: string,
) {
  const notes: string[] = [];
  const guide = coerceStyleGuideForPrompts(styleGuide);
  if (guide.analysis.icon_style) {
    notes.push(`视觉风格参考：${sanitizeStorefrontPromptCue(guide.analysis.icon_style)}`);
  }
  if (guide.analysis.background_style) {
    notes.push(`背景风格参考：${sanitizeStorefrontPromptCue(guide.analysis.background_style)}`);
  }
  const layoutStyle = moduleScopedStorefrontCue(guide.analysis.layout_style, moduleType);
  if (layoutStyle) {
    notes.push(`布局风格参考：${layoutStyle}`);
  }
  notes.push(...guide.generation_rules.must.map((value) => moduleScopedStorefrontCue(value, moduleType)).filter(Boolean));
  if (guide.generation_rules.avoid.length > 0) {
    const avoidNotes = guide.generation_rules.avoid
      .map((value) => moduleScopedStorefrontCue(value, moduleType))
      .filter(Boolean);
    if (avoidNotes.length > 0) {
      notes.push(`避免：${avoidNotes.join('；')}`);
    }
  }
  if (guide.preset_id === 'bakery-handdrawn-cream') {
    if (moduleType === 'top_slider') {
      notes.push('顶部主视觉优先做成参考图驱动的手绘感海报：标题大小、文字数量、主体数量和留白比例跟随参考图，不要额外放大中文标题或塞满涂鸦装饰。');
    } else if (moduleType === 'user_assets') {
      notes.push('客户资产入口卡片可以保留手绘招牌感标题和轻涂鸦细节，但文字尺度、信息密度和布局仍需服从参考图与当前 schema 里的实际卡片模式。');
    } else if (moduleType === 'goods') {
      notes.push('商品图主体可以是真实烘焙产品摄影，但只允许参考图密度范围内的少量手绘箭头、贴纸和标题覆盖，不要做成标准商城白底商品图。');
    }
  }
  return uniqueStrings(notes.filter(Boolean));
}

export function buildShopHomePageImagePromptObject({
  moduleType,
  item,
  styleGuide,
}: ShopHomePageImagePromptInput) {
  const promptSchema = enforceStraightEdgeZeroPaddingPrompt(
    cloneJsonObject(item.image_prompt_schema),
    { includeFullBleed: true },
  );
  const referenceImages = Array.isArray(item.reference_images) ? item.reference_images : [];
  const hasReferenceImages = referenceImages.length > 0;
  sanitizeReferenceLedPromptSchema(promptSchema, {
    moduleType,
    hasReferenceImages,
  });
  const styleNotes = buildStyleGenerationNotes(styleGuide, moduleType);
  const referenceUsageNotes = buildStorefrontReferenceUsageNotes({
    moduleType,
    referenceImages,
    styleGuide,
  });
  if (moduleType === 'banner') {
    promptSchema.generation_notes = [
      ...styleNotes,
      ...referenceUsageNotes,
      ...ZERO_PADDING_GENERATION_NOTES,
      '活动横幅定位为首页入口导流：只保留短标题和短副标题，不要价格、券墙、复杂按钮或多层促销信息。',
      '不要在画面中展示店铺 Logo、品牌角标、店铺名称水印或店铺 slogan。',
      '横幅必须和商品图明显区分：使用横向色块、轻图形、纹理、插画或贴纸式元素；避免做成商品摄影卡片、白底商品图或与商品模块相同的背景画风。',
    ];
  } else if (moduleType === 'goods') {
    const cta = stringOr(asObject(promptSchema.promotion).cta, '立即购买');
    promptSchema.generation_notes = [
      ...styleNotes,
      ...referenceUsageNotes,
      ...ZERO_PADDING_GENERATION_NOTES,
      `商品图必须是带转化动作的营销卡片，购买行动点属于图片内容本身；请将“${cta}”直接设计在画面里，例如按钮、行动条或购买引导区。`,
      '不要在商品图中展示店铺 Logo、品牌角标、店铺名称水印或 logo placeholder；画面重点放在商品主体、卖点和购买行动点。',
      hasReferenceImages
        ? '有参考图时，只复用与当前商品模块直接相关的主体、摆盘或局部风格信息；不要把参考页里其他运营条、导航、会员区或无关 UI 元素带进商品图。'
        : '未提供参考图：可以根据提示词自由发挥商品主体、场景和购买引导，但必须保持强转化视觉。',
    ];
  } else if (moduleType === 'image_ad') {
    promptSchema.generation_notes = [
      ...styleNotes,
      ...referenceUsageNotes,
      ...ZERO_PADDING_GENERATION_NOTES,
      hasReferenceImages
        ? '该广告块来自参考图中的未映射视觉块：保留参考图里的构图比例、主体层级、背景处理和视觉语气，不要改写成通用商品卡或标准横幅。'
        : '该广告块用于承接参考页中的独立视觉块，保持强视觉表达，不要退化成普通商品卡。',
    ];
  } else if (styleNotes.length > 0 || referenceUsageNotes.length > 0) {
    promptSchema.generation_notes = [...styleNotes, ...referenceUsageNotes, ...ZERO_PADDING_GENERATION_NOTES];
  } else {
    promptSchema.generation_notes = [...ZERO_PADDING_GENERATION_NOTES];
  }
  if (hasReferenceImages) {
    promptSchema.reference_style = {
      preset_id: stringOr(styleGuide?.preset_id, 'custom'),
      reference_images: referenceImages,
    };
  }
  return promptSchema;
}

export function buildShopHomePageImagePrompt(input: ShopHomePageImagePromptInput) {
  return JSON.stringify(buildShopHomePageImagePromptObject(input));
}

export function buildShopHomePageUserAssetsEntryPromptObject({
  entry,
  slot,
  cardLayout,
  styleGuide,
}: ShopHomePageUserAssetsEntryPromptInput) {
  const promptSchema = enforceStraightEdgeZeroPaddingPrompt(
    cloneJsonObject(entry.image_prompt_schema),
  );
  sanitizeUserAssetsEntryPromptContent(promptSchema);
  const referenceImages = Array.isArray(entry.reference_images) ? entry.reference_images : [];
  const hasReferenceImages = referenceImages.length > 0;
  sanitizeReferenceLedPromptSchema(promptSchema, {
    moduleType: 'user_assets',
    hasReferenceImages,
  });
  const styleNotes = buildUserAssetsGenerationNotes(styleGuide);
  const referenceUsageNotes = buildStorefrontReferenceUsageNotes({
    moduleType: 'user_assets',
    referenceImages,
    styleGuide,
  });
  promptSchema.generation_notes = [
    ...styleNotes,
    ...referenceUsageNotes,
    ...ZERO_PADDING_GENERATION_NOTES,
    `当前入口卡片布局为 ${userAssetsTemplateTypeLabel(cardLayout?.template_type)}，当前卡片槽位是 ${stringOr(slot?.id, 'slot')}。`,
    '客户资产入口卡片只表达当前这个功能入口，不要在一张图里额外生成别的按钮卡片、额外小入口或整组宫格。',
    '默认只生成一个 icon 和一行说明文字；说明文字优先使用 content.visible_text 或当前 entry.subtitle，entry.title 只用于理解图标语义，不要把 title 画成可见文字，不要再额外生成第三行文字、模块总说明、项目符号或营销口号，除非 schema 明确要求。',
    '如果 content.description 看起来是多个入口名称的汇总（例如用顿号列出其它按钮），不要把它画进图片；图片里也不要出现其它入口名称。',
    hasReferenceImages
      ? '入口卡片中的 icon 和单行说明文字必须保留在卡片内部；有参考图时，卡片布局方式、底色和文字颜色优先跟随可见参考入口区，不要强行改回白底。'
      : '入口卡片中的 icon 和单行说明文字必须保留在卡片内部；无参考图时默认使用纯白直角底卡和页面文字色，不要渐变、纹理、插画场景或摄影背景。',
    '不要展示店铺 Logo、品牌角标、店铺名称水印或店铺 slogan。',
    '当前入口图必须完整填满 schema 给出的卡位尺寸，不要再额外套圆角白底卡片、内边距衬板或留白外框。',
  ];
  if (cardLayout?.template_type === USER_ASSETS_TEMPLATE_TYPES.LEFT_ONE_RIGHT_TWO) {
    (promptSchema.generation_notes as string[]).push(
      '左一右二布局里，左侧主卡与右侧两张副卡必须保持同一套网格语言；如果当前槽位不是主卡，不要误画成大卡。',
    );
  }
  if (cardLayout?.template_type === USER_ASSETS_TEMPLATE_TYPES.HOTZONE) {
    (promptSchema.generation_notes as string[]).push(
      '热区自由布局没有固定尺寸要求，可以自由发挥卡片造型，但仍要保证单张卡片可独立使用，并且不要在画面里出现第二张卡片。',
    );
  }
  if (hasReferenceImages) {
    promptSchema.reference_style = {
      preset_id: stringOr(styleGuide?.preset_id, 'custom'),
      reference_images: referenceImages,
    };
  }
  return promptSchema;
}

export function buildShopHomePageUserAssetsEntryPrompt(input: ShopHomePageUserAssetsEntryPromptInput) {
  return JSON.stringify(buildShopHomePageUserAssetsEntryPromptObject(input));
}
