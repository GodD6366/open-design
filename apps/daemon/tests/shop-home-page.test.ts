import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { collectAssetTasks, createSeedSchema } from '../src/shop-home-page.js';

function buildRequirements() {
  return {
    status: 'confirmed',
    source_prompt: '烘焙店铺首页',
    module_specs: [
      { type: 'top_slider', content: '品牌海报' },
      { type: 'user_assets', content: '会员入口' },
      { type: 'banner', content: '活动横幅' },
      { type: 'goods', content: '主推商品' },
      { type: 'shop_info', content: '品牌故事' },
      { type: 'image_ad', content: '参考广告块', aspectRatio: '3:4' },
    ],
    style: {
      industry: '烘焙',
      brand_name: '赞的面包屋',
      primary_color: '#E59A2E',
      tone: '暖奶油手绘',
      avoid: [],
    },
    action_buttons: {
      selected: ['到店自取', '外卖点单'],
      custom: '',
    },
    counts: {
      sliderCount: 2,
      goodsCount: 2,
    },
  };
}

describe('createSeedSchema', () => {
  it('defaults storefront image prompts to straight-edge zero-padding constraints', () => {
    const schema = createSeedSchema(buildRequirements(), null);
    const imageModules = schema.modules.filter((module: any) => module.type !== 'user_assets');

    for (const module of imageModules) {
      const firstPrompt = module.data.items?.[0]?.image_prompt_schema;
      expect(firstPrompt.layout.padding).toBe(0);
      expect(firstPrompt.constraints.no_padding).toBe(true);
      expect(firstPrompt.constraints.no_rounded_corners).toBe(true);
    }

    const firstEntryPrompt = schema.modules
      .find((module: any) => module.type === 'user_assets')
      ?.data?.entries?.[0]?.image_prompt_schema;

    expect(firstEntryPrompt.layout.padding).toBe(0);
    expect(firstEntryPrompt.constraints.no_padding).toBe(true);
    expect(firstEntryPrompt.constraints.no_rounded_corners).toBe(true);
  });

  it('prefers localized hero and user_assets crop references over shared full-page screenshots', () => {
    const schema = createSeedSchema(buildRequirements(), {
      reference_images: ['page-shot.png'],
      reference_regions: {
        top_slider: {
          source_image: 'page-shot.png',
          x: 0.08,
          y: 0.05,
          width: 0.84,
          height: 0.34,
        },
        user_assets: {
          strip: {
            source_image: 'page-shot.png',
            x: 0.1,
            y: 0.4,
            width: 0.7,
            height: 0.12,
          },
          entries: [
            {
              source_image: 'page-shot.png',
              x: 0.11,
              y: 0.41,
              width: 0.16,
              height: 0.1,
              target_label: '到店自取',
            },
          ],
        },
      },
    });

    const topSliderRefs = schema.modules
      .find((module: any) => module.type === 'top_slider')
      ?.data?.items?.[0]?.reference_images;
    const userAssetsEntries = schema.modules
      .find((module: any) => module.type === 'user_assets')
      ?.data?.entries;

    expect(topSliderRefs).toEqual(['top-slider-ref-hero.png']);
    expect(userAssetsEntries?.[0]?.reference_images).toEqual([
      'user-assets-ref-entry-1.png',
      'user-assets-ref-strip.png',
    ]);
    expect(userAssetsEntries?.[1]?.reference_images).toEqual([
      'user-assets-ref-strip.png',
    ]);
  });
});

describe('collectAssetTasks', () => {
  it('re-enqueues the first user_assets entry when schema metadata points at a missing file', () => {
    const schema = {
      modules: [
        {
          type: 'user_assets',
          data: {
            body_image: '',
            card_layout: {
              template_type: 1,
              slots: [
                { id: 'left', role: 'sub_action', size: 'medium', position: 'left' },
                { id: 'right', role: 'sub_action', size: 'medium', position: 'right' },
              ],
            },
            entries: [
              {
                id: 'left',
                slot_id: 'left',
                title: '到店自取',
                subtitle: '新鲜出炉 立等可取',
                icon: 'store',
                image: 'user-assets-entry-1.png',
                image_prompt_schema: {},
                reference_images: [],
              },
              {
                id: 'right',
                slot_id: 'right',
                title: '外卖点单',
                subtitle: '配送到家 准时送达',
                icon: 'truck',
                image: '',
                image_prompt_schema: {},
                reference_images: [],
              },
            ],
          },
        },
      ],
    };

    const tasks = collectAssetTasks(schema, null, false, new Set());
    const projectDir = '/tmp/shop-home-page-project';

    expect(tasks.map((task) => task.fileName)).toEqual([
      'user-assets-entry-1.png',
      'user-assets-entry-2.png',
    ]);
    expect(tasks[0]?.buildInputImagePathsFn?.(projectDir)).toEqual([]);
    expect(tasks[1]?.dependsOnFileName).toBe('user-assets-entry-1.png');
    expect(tasks[1]?.buildInputImagePathsFn?.(projectDir)).toEqual([
      path.join(projectDir, 'user-assets-entry-1.png'),
    ]);
  });

  it('forces straight-edge zero-padding rules in runtime image prompts', () => {
    const schema = createSeedSchema(buildRequirements(), null);
    const styleGuide = {
      reference_images: ['page-shot.png'],
      analysis: {
        background_style: 'Warm cream paper tone with large white rounded cards and airy whitespace.',
      },
      generation_rules: {
        must: ['Use rounded cards when appropriate.'],
        avoid: [],
      },
    };

    const tasks = collectAssetTasks(schema, styleGuide, true, new Set());
    const goodsTask = tasks.find((task) => task.fileName === 'goods-1.png');
    const nextGoodsTask = tasks.find((task) => task.fileName === 'goods-2.png');
    const userAssetsTask = tasks.find((task) => task.fileName === 'user-assets-entry-1.png');

    const goodsPrompt = JSON.parse(goodsTask?.prompt ?? '{}');
    const nextGoodsPrompt = JSON.parse(nextGoodsTask?.buildPromptFn?.('/api/projects/demo/files/goods-1.png') ?? '{}');
    const userAssetsPrompt = JSON.parse(userAssetsTask?.prompt ?? '{}');

    expect(goodsPrompt.layout.padding).toBe(0);
    expect(goodsPrompt.layout.full_bleed).toBe(true);
    expect(goodsPrompt.constraints.no_padding).toBe(true);
    expect(goodsPrompt.constraints.no_rounded_corners).toBe(true);
    expect(goodsPrompt.generation_notes.join('\n')).toContain('不要圆角卡片');
    expect(goodsPrompt.generation_notes.join('\n')).toContain('不要内边距');
    expect(goodsPrompt.generation_notes.join('\n')).toContain('straight-edge blocks');
    expect(goodsPrompt.generation_notes.join('\n')).not.toContain('rounded cards');

    expect(nextGoodsPrompt.layout.padding).toBe(0);
    expect(nextGoodsPrompt.constraints.no_padding).toBe(true);
    expect(nextGoodsPrompt.constraints.no_rounded_corners).toBe(true);

    expect(userAssetsPrompt.layout.padding).toBe(0);
    expect(userAssetsPrompt.constraints.no_padding).toBe(true);
    expect(userAssetsPrompt.constraints.no_rounded_corners).toBe(true);
    expect(userAssetsPrompt.generation_notes.join('\n')).toContain('完整填满 schema 给出的卡位尺寸');
  });
});
