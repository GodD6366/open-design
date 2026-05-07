import { describe, expect, it } from 'vitest';

import {
  buildComposerDraft,
  composeSchemaText,
  moveComposerItem,
  removeComposerItem,
} from './composer';
import type { ShopHomePageState } from './types';

function buildState(): ShopHomePageState {
  return {
    projectId: 'project-1',
    requirements: {
      status: 'confirmed',
      source_prompt: '店铺首页',
      module_specs: [
        { type: 'top_slider', content: '头图' },
        { type: 'image_ad', content: '广告一', aspectRatio: '3:4' },
        { type: 'image_ad', content: '广告二', aspectRatio: '1:1' },
        { type: 'shop_info', content: '门店信息' },
      ],
      modules: ['top_slider', 'image_ad', 'image_ad', 'shop_info'],
      module_content: {
        top_slider: '头图',
        image_ad: '广告一',
        shop_info: '门店信息',
      },
      style: {
        industry: '',
        brand_name: '',
        primary_color: '',
        tone: '',
        avoid: [],
      },
      brand_logo: '',
      action_buttons: {
        selected: [],
        custom: '',
      },
      other_requirements: '',
      counts: {
        sliderCount: 1,
        goodsCount: 2,
      },
      confirmation_questions: [],
    },
    requirementsText: '',
    styleGuide: {
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
    },
    styleGuideText: '',
    schema: {
      page_id: 'shop_home_page',
      version: '1.0.0',
      layout_mode: 'overlay',
      design_context: {
        theme: 'demo',
        color_palette: {
          bg: '#fff',
          card_bg: '#fff',
          card_subtle: '#eee',
          text_primary: '#111',
          text_secondary: '#666',
          accent: '#f60',
        },
        radius: '8px',
        shadow: 'none',
        spacing: 16,
        page_width: 375,
      },
      modules: [
        { id: 'top_slider_1', type: 'top_slider', data: {} },
        { id: 'image_ad_2', type: 'image_ad', data: {} },
        { id: 'image_ad_3', type: 'image_ad', data: {} },
        { id: 'shop_info_4', type: 'shop_info', data: {} },
      ],
    },
    schemaText: '',
    previewFileName: null,
    previewUrl: null,
    screenFileName: null,
    screenUrl: null,
    previewUpdatedAt: null,
    files: [],
    logs: [],
    status: 'schema-ready',
    validationErrors: [],
  };
}

describe('shop-home-page composer helpers', () => {
  it('builds composer rows and keeps repeated image_ad occurrences distinct', () => {
    const draft = buildComposerDraft(buildState());
    expect(draft.disabledReason).toBeNull();
    expect(draft.items.map((item) => `${item.moduleType}:${item.occurrence}`)).toEqual([
      'top_slider:1',
      'image_ad:1',
      'image_ad:2',
      'shop_info:1',
    ]);
  });

  it('rejects misaligned requirements and schema order', () => {
    const state = buildState();
    state.schema!.modules[1] = { id: 'shop_info_2', type: 'shop_info', data: {} };
    const draft = buildComposerDraft(state);
    expect(draft.items).toEqual([]);
    expect(draft.disabledReason).toContain('顺序不一致');
  });

  it('moves and removes rows while preserving item identity', () => {
    const draft = buildComposerDraft(buildState()).items;
    const moved = moveComposerItem(draft, 3, -1);
    expect(moved.map((item) => item.schemaModule.id)).toEqual([
      'top_slider_1',
      'image_ad_2',
      'shop_info_4',
      'image_ad_3',
    ]);

    const removed = removeComposerItem(moved, 1);
    expect(removed.map((item) => item.schemaModule.id)).toEqual([
      'top_slider_1',
      'shop_info_4',
      'image_ad_3',
    ]);
  });

  it('rebuilds schema text with reordered modules', () => {
    const state = buildState();
    const moved = moveComposerItem(buildComposerDraft(state).items, 3, -1);
    const schemaText = composeSchemaText(state.schema!, moved.map((item) => item.schemaModule));
    expect(JSON.parse(schemaText).modules.map((module: { id: string }) => module.id)).toEqual([
      'top_slider_1',
      'image_ad_2',
      'shop_info_4',
      'image_ad_3',
    ]);
  });
});
