import type { ProjectFile } from '../types';

export type StorefrontModuleType =
  | 'top_slider'
  | 'user_assets'
  | 'banner'
  | 'goods'
  | 'shop_info';

export interface StorefrontRequirements {
  status: 'needs_confirmation' | 'confirmed';
  source_prompt: string;
  modules: StorefrontModuleType[];
  module_content: Partial<Record<StorefrontModuleType, string>>;
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

export interface StorefrontStyleGuide {
  version: string;
  preset_id: string;
  reference_images: string[];
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

export interface StorefrontSchemaModule {
  id: string;
  type: StorefrontModuleType;
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

export interface StorefrontSchema {
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
  modules: StorefrontSchemaModule[];
}

export interface StorefrontLogEntry {
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

export interface StorefrontState {
  projectId: string;
  requirements: StorefrontRequirements;
  requirementsText: string;
  styleGuide: StorefrontStyleGuide;
  styleGuideText: string;
  schema: StorefrontSchema | null;
  schemaText: string;
  previewFileName: string | null;
  previewUrl: string | null;
  screenFileName: string | null;
  screenUrl: string | null;
  previewUpdatedAt: number | null;
  files: ProjectFile[];
  logs: StorefrontLogEntry[];
  status: string;
  validationErrors: string[];
}
