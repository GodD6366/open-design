import type { ShopHomePageReferenceRegions } from '@open-design/contracts/shop-home-page-reference-regions';
import type { ProjectFile } from '../types';

export type ShopHomePageModuleType =
  | 'top_slider'
  | 'user_assets'
  | 'banner'
  | 'goods'
  | 'shop_info'
  | 'image_ad';

export interface ShopHomePageModuleSpec {
  type: ShopHomePageModuleType;
  content: string;
  itemCount?: number;
  aspectRatio?: string;
}

export interface ShopHomePageRequirements {
  status: 'needs_confirmation' | 'confirmed';
  source_prompt: string;
  module_specs: ShopHomePageModuleSpec[];
  modules?: ShopHomePageModuleType[];
  module_content?: Partial<Record<ShopHomePageModuleType, string>>;
  style: {
    industry: string;
    brand_name: string;
    primary_color: string;
    tone: string;
    avoid: string[];
  };
  brand_logo: string;
  action_buttons: {
    selected: string[];
    custom: string;
  };
  other_requirements: string;
  counts: {
    sliderCount: number;
    goodsCount: number;
  };
  confirmation_questions?: string[];
}

export interface ShopHomePageStyleGuide {
  version: string;
  preset_id: string;
  reference_images: string[];
  reference_regions?: ShopHomePageReferenceRegions;
  analysis: {
    source_summary: string;
    icon_style: string;
    background_style: string;
    layout_style: string;
    tone_keywords: string[];
  };
  generation_rules: {
    must: string[];
    avoid: string[];
  };
}

export interface ShopHomePageSchemaModule {
  id: string;
  type: ShopHomePageModuleType;
  source?: 'system' | 'ai';
  variant?: string;
  layout?: {
    offsetY?: number;
    zIndex?: number;
    paddingX?: number;
    paddingTop?: number;
    paddingBottom?: number;
  };
  editable?: Record<string, boolean>;
  data: Record<string, unknown>;
}

export interface ShopHomePageSchema {
  page_id: string;
  version: string;
  layout_mode: 'overlay' | 'flow';
  design_context: {
    theme: string;
    color_palette: {
      bg: string;
      card_bg: string;
      card_subtle: string;
      text_primary: string;
      text_secondary: string;
      accent: string;
    };
    radius: string;
    shadow: string;
    spacing: number;
    page_width: number;
  };
  modules: ShopHomePageSchemaModule[];
}

export interface ShopHomePageLogEntry {
  at: number;
  level: 'info' | 'error';
  message: string;
}

export interface AssetTask {
  id: string;
  fileName: string;
  status: 'pending' | 'running' | 'done' | 'failed';
  error?: string | null;
}

export interface ShopHomePageState {
  projectId: string;
  requirements: ShopHomePageRequirements;
  requirementsText: string;
  styleGuide: ShopHomePageStyleGuide;
  styleGuideText: string;
  schema: ShopHomePageSchema | null;
  schemaText: string;
  previewFileName: string | null;
  previewUrl: string | null;
  screenFileName: string | null;
  screenUrl: string | null;
  previewUpdatedAt: number | null;
  files: ProjectFile[];
  logs: ShopHomePageLogEntry[];
  status: string;
  validationErrors: string[];
}
