import type { ShopHomePageReferenceMode } from './api/projects.js';

export type ShopHomePageTemplateId =
  | 'bakery-doodle-toast'
  | 'bakery-botanical-paper'
  | 'bakery-autumn-sunroom';

export interface ShopHomePageReferenceState {
  mode: ShopHomePageReferenceMode;
  template_reference_images: string[];
  user_reference_images: string[];
  asset_images: string[];
  notes: string;
}

export interface ShopHomePageTemplateDefinition {
  id: ShopHomePageTemplateId;
  label: string;
  description: string;
  previewAsset: string;
  projectReferenceFileName: string;
  presetId:
    | 'bakery-handdrawn-cream'
    | 'bakery-botanical-sage'
    | 'bakery-sunlit-autumn';
  defaultMode: ShopHomePageReferenceMode;
  visibleModules: Array<'top_slider' | 'user_assets'>;
  userAssetsTemplateType: 2 | 3;
  moduleAnalysisDefault: string;
  styleGuideAnalysis: {
    source_summary: string;
    icon_style: string;
    background_style: string;
    layout_style: string;
    tone_keywords: string[];
    must: string[];
    avoid: string[];
  };
}

export const SHOP_HOME_PAGE_TEMPLATES: ShopHomePageTemplateDefinition[] = [
  {
    id: 'bakery-doodle-toast',
    label: '奶油手绘吐司',
    description: '暖奶油纸感、黑色手绘字标和左一右二入口卡。',
    previewAsset: 'templates/bakery-doodle-toast-reference.png',
    projectReferenceFileName: 'bakery-doodle-toast-reference.png',
    presetId: 'bakery-handdrawn-cream',
    defaultMode: 'template_default',
    visibleModules: ['top_slider', 'user_assets'],
    userAssetsTemplateType: 2,
    moduleAnalysisDefault:
      '1. top_slider: 首屏奶油纸感品牌海报，黑色手绘字标、吐司角色和稀疏 hero 构图；2. user_assets: 左一右二客户资产入口，左侧主卡突出到店自取，右侧两张副卡承接外卖点单与商城入口。',
    styleGuideAnalysis: {
      source_summary:
        '整页参考图展示了暖奶油纸感烘焙首页：上方是大字标 hero 海报，下方是白底欢迎会员卡和左一右二入口区。',
      icon_style:
        '黑色手绘字标和 doodle icon，笔触粗糙、略带童趣，图案主体使用面包与吐司角色语言。',
      background_style:
        '暖奶油纸感背景搭配纯白直角卡片，整体低饱和、留白大、黑色标题对比强。',
      layout_style:
        '首屏先展示海报式 hero，再接一张大白卡；卡内入口采用左一右二的主次布局，文字量少，标题尺度大，信息密度低。',
      tone_keywords: ['bakery', 'doodle', 'cream', 'toast', 'playful', 'poster'],
      must: [
        '保持上方海报 hero + 下方大白卡的两段式结构。',
        '客户资产入口只借鉴可见入口卡的布局模式、笔触和留白节奏。',
        '保留暖奶油纸感背景与黑色手绘主标题对比。',
      ],
      avoid: [
        '不要引入底部导航、状态栏、悬浮客服气泡等宿主 UI。',
        '不要把会员总卡或下方优惠券区直接当成入口卡内容复刻。',
      ],
    },
  },
  {
    id: 'bakery-botanical-paper',
    label: '植物纸感花礼',
    description: '植物插画纸感背景、一行三个入口和浅鼠尾草按钮色。',
    previewAsset: 'templates/bakery-botanical-paper-reference.png',
    projectReferenceFileName: 'bakery-botanical-paper-reference.png',
    presetId: 'bakery-botanical-sage',
    defaultMode: 'template_default',
    visibleModules: ['top_slider', 'user_assets'],
    userAssetsTemplateType: 3,
    moduleAnalysisDefault:
      '1. top_slider: 首屏植物插画主视觉，纸感背景与大面积花卉构图；2. user_assets: 一行三个客户资产入口，统一浅底卡片与细腻插画 icon，适合到店选购、花礼配送、积分兑换等平级入口。',
    styleGuideAnalysis: {
      source_summary:
        '整页参考图是纸感植物插画首页：上方大花卉主视觉，下方白底会员卡内嵌一行三个等权入口。',
      icon_style:
        '细腻植物插画风 icon，线条干净、带少量手绘感，适合花礼、生日福利、积分兑换等轻礼品场景。',
      background_style:
        '暖白纸感背景叠加鼠尾草绿色按钮和浅米色入口卡，整体柔和、轻庆典、低对比。',
      layout_style:
        '首屏大面积单主体 hero 之后接一张宽白卡，入口区采用一行三个等权卡片；文字少、留白均匀，信息层级克制。',
      tone_keywords: ['bakery', 'botanical', 'paper', 'sage', 'floral', 'airy'],
      must: [
        '保持植物纸感主视觉和下方宽白卡的组合关系。',
        '客户资产入口沿用一行三个等权布局与浅色卡面。',
        '保留柔和鼠尾草绿色按钮和庆典纸屑式轻装饰语气。',
      ],
      avoid: [
        '不要把生日权益大卡、会员码或底部导航直接复刻进入口卡。',
        '不要加入高饱和促销贴纸、厚重阴影或电商化大 CTA。',
      ],
    },
  },
  {
    id: 'bakery-autumn-sunroom',
    label: '秋日窗景甜品',
    description: '秋日窗景插画 hero、一行三个入口和明亮金黄烘焙氛围。',
    previewAsset: 'templates/bakery-autumn-sunroom-reference.png',
    projectReferenceFileName: 'bakery-autumn-sunroom-reference.png',
    presetId: 'bakery-sunlit-autumn',
    defaultMode: 'template_default',
    visibleModules: ['top_slider', 'user_assets'],
    userAssetsTemplateType: 3,
    moduleAnalysisDefault:
      '1. top_slider: 秋日窗景与甜品桌面的首屏插画 hero，金黄暖阳、甜品器物和大面积场景铺陈；2. user_assets: 一行三个客户资产入口，统一金黄卡面，适合自提、外送、蛋糕预定等平级入口。',
    styleGuideAnalysis: {
      source_summary:
        '整页参考图展示了秋日窗景甜品店首页：上方是大场景插画 hero，下方会员白卡内嵌一行三个金黄入口卡。',
      icon_style:
        '烘焙器物与甜品主体偏插画海报感，入口卡图案以商品或器具为主，文字粗黑、亲切直接。',
      background_style:
        '大面积金黄与奶白配色，阳光窗景和桌面器物构成故事化背景，整体温暖、明亮、节庆感轻。',
      layout_style:
        'hero 区占比很大，以完整场景先建立氛围；下方再落一张白卡承接一行三个入口，留白宽、标题大、入口信息密度低。',
      tone_keywords: ['bakery', 'autumn', 'sunlit', 'dessert', 'warm', 'story'],
      must: [
        '保持大场景 hero 在上、白卡入口区在下的两层关系。',
        '客户资产入口沿用一行三个等权布局与金黄卡面节奏。',
        '保留秋日暖阳、窗景和甜品器物的故事化氛围。',
      ],
      avoid: [
        '不要把充值余额、活动列表或底部导航直接挪进入口卡。',
        '不要把整页 hero 的复杂桌面物件误复制到每张单独入口卡里。',
      ],
    },
  },
];

export const SHOP_HOME_PAGE_TEMPLATE_NONE = '__none__' as const;

export function listShopHomePageTemplates(): ShopHomePageTemplateDefinition[] {
  return SHOP_HOME_PAGE_TEMPLATES.map((template) => ({
    ...template,
    visibleModules: [...template.visibleModules],
    styleGuideAnalysis: {
      ...template.styleGuideAnalysis,
      tone_keywords: [...template.styleGuideAnalysis.tone_keywords],
      must: [...template.styleGuideAnalysis.must],
      avoid: [...template.styleGuideAnalysis.avoid],
    },
  }));
}

export function getShopHomePageTemplateById(
  id: string | null | undefined,
): ShopHomePageTemplateDefinition | null {
  return SHOP_HOME_PAGE_TEMPLATES.find((template) => template.id === id) ?? null;
}

export function buildDefaultShopHomePageReferenceState(
  templateReferenceImages: string[] = [],
): ShopHomePageReferenceState {
  return {
    mode: 'template_default',
    template_reference_images: [...templateReferenceImages],
    user_reference_images: [],
    asset_images: [],
    notes: '',
  };
}
