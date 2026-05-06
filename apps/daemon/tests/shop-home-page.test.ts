import os from 'node:os';
import path from 'node:path';
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

import {
  collectAssetTasks,
  createSeedSchema,
  loadShopHomePageState,
  shopHomePageSkillDir,
} from '../src/shop-home-page.js';

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

  it('keeps shared full-page screenshots as the default reference source', () => {
    const schema = createSeedSchema(buildRequirements(), {
      reference_images: ['page-shot.png'],
    });

    const topSliderRefs = schema.modules
      .find((module: any) => module.type === 'top_slider')
      ?.data?.items?.[0]?.reference_images;
    const userAssetsEntries = schema.modules
      .find((module: any) => module.type === 'user_assets')
      ?.data?.entries;

    expect(topSliderRefs).toEqual(['page-shot.png']);
    expect(userAssetsEntries?.[0]?.reference_images).toEqual(['page-shot.png']);
    expect(userAssetsEntries?.[1]?.reference_images).toEqual(['page-shot.png']);
  });

  it('migrates legacy crop-only reference images back to shared full-page screenshots', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'shop-home-page-'));
    const projectsRoot = path.join(root, 'projects');
    const projectId = 'project-1';
    const projectDir = path.join(projectsRoot, projectId);
    await mkdir(projectDir, { recursive: true });
    const requirements = buildRequirements();
    const styleGuide = {
      version: '1.0',
      preset_id: 'auto',
      reference_images: ['page-shot.png'],
      analysis: {},
      generation_rules: {},
    };
    const schema = createSeedSchema(requirements as any, styleGuide as any) as any;
    schema.modules.find((module: any) => module.type === 'top_slider').data.items[0].reference_images = ['top-slider-ref-hero.png'];
    const userAssetsEntries = schema.modules.find((module: any) => module.type === 'user_assets').data.entries;
    userAssetsEntries[0].reference_images = ['user-assets-ref-strip.png'];
    userAssetsEntries[1].reference_images = ['user-assets-ref-entry-1.png'];

    await writeFile(
      path.join(projectDir, 'shop-home-page.requirements.json'),
      `${JSON.stringify(requirements, null, 2)}\n`,
    );
    await writeFile(
      path.join(projectDir, 'shop-home-page.style-guide.json'),
      `${JSON.stringify(styleGuide, null, 2)}\n`,
    );
    await writeFile(
      path.join(projectDir, 'shop-home-page.schema.json'),
      `${JSON.stringify(schema, null, 2)}\n`,
    );

    const state = await loadShopHomePageState(
      projectsRoot,
      projectId,
      shopHomePageSkillDir(process.cwd()),
    );
    const savedSchema = JSON.parse(
      await readFile(path.join(projectDir, 'shop-home-page.schema.json'), 'utf8'),
    );

    expect((state.schema as any).modules[0].data.items[0].reference_images).toEqual(['page-shot.png']);
    expect((state.schema as any).modules[1].data.entries[0].reference_images).toEqual(['page-shot.png']);
    expect((state.schema as any).modules[1].data.entries[1].reference_images).toEqual(['page-shot.png']);
    expect(savedSchema.modules[0].data.items[0].reference_images).toEqual(['page-shot.png']);
    expect(savedSchema.modules[1].data.entries[0].reference_images).toEqual(['page-shot.png']);
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
    const styleGuide = {
      reference_images: ['page-shot.png'],
      analysis: {
        background_style: 'Warm cream paper tone with large white rounded cards and airy whitespace.',
        layout_style: 'Airy storefront reference with sparse composition, low information density, small title scale, and large empty areas.',
      },
      generation_rules: {
        must: ['Use rounded cards when appropriate.'],
        avoid: [],
      },
    };
    const schema = createSeedSchema(buildRequirements(), styleGuide);

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
    expect(goodsPrompt.generation_notes.join('\n')).toContain('信息密度不得高于参考图对应区域');
    expect(goodsPrompt.generation_notes.join('\n')).toContain('布局风格参考');

    expect(nextGoodsPrompt.layout.padding).toBe(0);
    expect(nextGoodsPrompt.constraints.no_padding).toBe(true);
    expect(nextGoodsPrompt.constraints.no_rounded_corners).toBe(true);

    expect(userAssetsPrompt.layout.padding).toBe(0);
    expect(userAssetsPrompt.constraints.no_padding).toBe(true);
    expect(userAssetsPrompt.constraints.no_rounded_corners).toBe(true);
    expect(userAssetsPrompt.generation_notes.join('\n')).toContain('完整填满 schema 给出的卡位尺寸');
    expect(userAssetsPrompt.generation_notes.join('\n')).toContain('布局风格参考');
    expect(userAssetsPrompt.generation_notes.join('\n')).toContain('文字尺度、信息密度');
    expect(userAssetsPrompt.generation_notes.join('\n')).not.toContain('超大标题');
  });
});
