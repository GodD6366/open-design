import os from 'node:os';
import path from 'node:path';
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

import {
  applyShopHomePageSchemaText,
  collectAssetTasks,
  createSeedSchema,
  initializeShopHomePageTemplateProject,
  loadShopHomePageState,
  SHOP_HOME_PAGE_REFERENCE_STATE_FILE,
  SHOP_HOME_PAGE_SCHEMA_FILE,
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

  it('omits seed image prompts for unconfirmed empty-template storefront projects', () => {
    const schema = createSeedSchema(
      {
        ...buildRequirements(),
        status: 'needs_confirmation',
      },
      null,
      { skipSeedImagePrompts: true } as any,
    ) as any;

    const imageModules = schema.modules.filter((module: any) => module.type !== 'user_assets');
    for (const module of imageModules) {
      expect(module.data.items?.[0]?.image_prompt_schema).toBeUndefined();
    }

    const firstUserAssetsEntry = schema.modules
      .find((module: any) => module.type === 'user_assets')
      ?.data?.entries?.[0];
    expect(firstUserAssetsEntry?.image_prompt_schema).toBeUndefined();
  });

  it('uses the bakery template preset card layout defaults', () => {
    const schema = createSeedSchema(buildRequirements(), {
      preset_id: 'bakery-handdrawn-cream',
      reference_images: ['page-shot.png'],
      analysis: {
        layout_style: '左一右二客户资产入口',
      },
    }) as any;

    const cardLayout = schema.modules.find((module: any) => module.type === 'user_assets')?.data?.card_layout;
    expect(cardLayout?.template_type).toBe(2);
  });

  it('keeps shared full-page screenshots as the default reference source', () => {
    const schema = createSeedSchema(buildRequirements(), {
      reference_images: ['page-shot.png'],
      analysis: {
        layout_style: '海报感 hero 居首，浮动会员卡片，三等分功能入口排布。',
      },
    });

    const topSliderRefs = schema.modules
      .find((module: any) => module.type === 'top_slider')
      ?.data?.items?.[0]?.reference_images;
    const userAssetsEntries = schema.modules
      .find((module: any) => module.type === 'user_assets')
      ?.data?.entries;
    const shopInfoRefs = schema.modules
      .find((module: any) => module.type === 'shop_info')
      ?.data?.items?.[0]?.reference_images;
    const goodsRefs = schema.modules
      .find((module: any) => module.type === 'goods')
      ?.data?.items?.[0]?.reference_images;

    expect(topSliderRefs).toEqual(['page-shot.png']);
    expect(userAssetsEntries?.[0]?.reference_images).toEqual(['page-shot.png']);
    expect(userAssetsEntries?.[1]?.reference_images).toEqual(['page-shot.png']);
    expect(shopInfoRefs).toEqual([]);
    expect(goodsRefs).toEqual([]);
  });

  it('does not inherit shared full-page screenshots for shop_info when the frame only evidences hero and entries', () => {
    const schema = createSeedSchema(buildRequirements(), {
      reference_images: ['page-shot.png'],
      analysis: {
        source_summary: '首屏烘焙海报，下方会员欢迎卡和三列入口',
        layout_style: '海报感 hero 居首，浮动会员卡片，三等分功能入口排布。',
      },
      generation_rules: {
        must: ['参考图可见的 hero 组件空间分布、产品数量、留白比例、文字数量和标题尺度'],
        avoid: [],
      },
    });

    const shopInfoRefs = schema.modules
      .find((module: any) => module.type === 'shop_info')
      ?.data?.items?.[0]?.reference_images;

    expect(shopInfoRefs).toEqual([]);
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
      analysis: {
        layout_style: '海报感 hero 居首，浮动会员卡片，三等分功能入口排布。',
      },
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

describe('reference-state sync', () => {
  it('initializes template_default reference state and style guide for template storefront projects', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'shop-home-page-'));
    const projectsRoot = path.join(root, 'projects');
    const projectId = 'project-template';
    await initializeShopHomePageTemplateProject(
      projectsRoot,
      projectId,
      process.cwd(),
      {
        shopHomePageTemplateId: 'bakery-doodle-toast',
        shopHomePageIndustryId: 'coffeeTea',
        shopHomePageIndustryLabel: '咖啡茶饮',
      },
    );

    const projectDir = path.join(projectsRoot, projectId);
    const referenceState = JSON.parse(
      await readFile(path.join(projectDir, SHOP_HOME_PAGE_REFERENCE_STATE_FILE), 'utf8'),
    );
    const styleGuide = JSON.parse(
      await readFile(path.join(projectDir, 'shop-home-page.style-guide.json'), 'utf8'),
    );

    expect(referenceState.mode).toBe('template_default');
    expect(referenceState.template_reference_images).toEqual(['bakery-doodle-toast-reference.png']);
    expect(styleGuide.reference_images).toEqual(['bakery-doodle-toast-reference.png']);
    expect(styleGuide.preset_id).toBe('bakery-handdrawn-cream');
    const requirements = JSON.parse(
      await readFile(path.join(projectDir, 'shop-home-page.requirements.json'), 'utf8'),
    );
    expect(requirements.style.industry).toBe('咖啡茶饮');
  });

  it('prefills blank-project requirements from metadata industry on first load', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'shop-home-page-'));
    const projectsRoot = path.join(root, 'projects');
    const projectId = 'project-industry-default';

    const state = await loadShopHomePageState(
      projectsRoot,
      projectId,
      shopHomePageSkillDir(process.cwd()),
      {
        kind: 'shopHomePage',
        shopHomePageIndustryId: 'coffeeTea',
        shopHomePageIndustryLabel: '咖啡茶饮',
      } as any,
    );

    expect(state.requirements.style.industry).toBe('咖啡茶饮');
  });

  it('keeps legacy compatibility when metadata industry is missing', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'shop-home-page-'));
    const projectsRoot = path.join(root, 'projects');
    const projectId = 'project-legacy-compatible';

    const state = await loadShopHomePageState(
      projectsRoot,
      projectId,
      shopHomePageSkillDir(process.cwd()),
      {
        kind: 'shopHomePage',
      } as any,
    );

    expect(state.requirements.style.industry).toBe('');
  });

  it('lets user_explicit reference images override template defaults at load time', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'shop-home-page-'));
    const projectsRoot = path.join(root, 'projects');
    const projectId = 'project-user-explicit';
    const projectDir = path.join(projectsRoot, projectId);
    await mkdir(projectDir, { recursive: true });
    await writeFile(
      path.join(projectDir, 'shop-home-page.requirements.json'),
      `${JSON.stringify(buildRequirements(), null, 2)}\n`,
    );
    await writeFile(
      path.join(projectDir, 'shop-home-page.style-guide.json'),
      `${JSON.stringify({
        version: '1.0',
        preset_id: 'bakery-handdrawn-cream',
        reference_images: ['bakery-doodle-toast-reference.png'],
        analysis: {
          layout_style: '左一右二客户资产入口',
        },
        generation_rules: {
          must: [],
          avoid: [],
        },
      }, null, 2)}\n`,
    );
    await writeFile(
      path.join(projectDir, SHOP_HOME_PAGE_REFERENCE_STATE_FILE),
      `${JSON.stringify({
        mode: 'user_explicit',
        template_reference_images: ['bakery-doodle-toast-reference.png'],
        user_reference_images: ['user-ref-1.png', 'user-ref-2.png'],
        asset_images: ['goods-source.png'],
        notes: 'Use the user refs.',
      }, null, 2)}\n`,
    );

    const state = await loadShopHomePageState(
      projectsRoot,
      projectId,
      shopHomePageSkillDir(process.cwd()),
    );
    const savedStyleGuide = JSON.parse(
      await readFile(path.join(projectDir, 'shop-home-page.style-guide.json'), 'utf8'),
    );

    expect(state.styleGuide.reference_images).toEqual(['user-ref-1.png', 'user-ref-2.png']);
    expect(savedStyleGuide.reference_images).toEqual(['user-ref-1.png', 'user-ref-2.png']);
  });
});

describe('applyShopHomePageSchemaText with module specs sync', () => {
  it('allows promptless storefront schemas before requirements are confirmed', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'shop-home-page-'));
    const projectsRoot = path.join(root, 'projects');
    const projectId = 'project-promptless-needs-confirmation';
    const projectDir = path.join(projectsRoot, projectId);
    await mkdir(projectDir, { recursive: true });

    const requirements = {
      status: 'needs_confirmation',
      source_prompt: '店铺首页',
      module_specs: [
        { type: 'top_slider', content: '' },
        { type: 'user_assets', content: '' },
        { type: 'shop_info', content: '' },
      ],
      modules: ['top_slider', 'user_assets', 'shop_info'],
      module_content: {
        top_slider: '',
        user_assets: '',
        shop_info: '',
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
        selected: ['到店自取', '外卖点单'],
        custom: '',
      },
      other_requirements: '',
      counts: {
        sliderCount: 1,
        goodsCount: 2,
      },
      confirmation_questions: [],
    };
    const schema = createSeedSchema(
      requirements as any,
      null,
      { skipSeedImagePrompts: true } as any,
    ) as any;

    await writeFile(path.join(projectDir, 'shop-home-page.requirements.json'), `${JSON.stringify(requirements, null, 2)}\n`);
    await writeFile(path.join(projectDir, SHOP_HOME_PAGE_SCHEMA_FILE), `${JSON.stringify(schema, null, 2)}\n`);

    const state = await applyShopHomePageSchemaText(
      projectsRoot,
      projectId,
      shopHomePageSkillDir(process.cwd()),
      `${JSON.stringify(schema, null, 2)}\n`,
      requirements.module_specs as any,
    );

    expect(state.validationErrors).toEqual([]);
    expect((state.schema as any).modules[0].data.items[0].image_prompt_schema).toBeUndefined();
    expect((state.schema as any).modules[1].data.entries[0].image_prompt_schema).toBeUndefined();
  });

  it('reorders requirements.module_specs and schema.modules together', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'shop-home-page-'));
    const projectsRoot = path.join(root, 'projects');
    const projectId = 'project-reorder';
    const projectDir = path.join(projectsRoot, projectId);
    await mkdir(projectDir, { recursive: true });

    const requirements = buildRequirements();
    const schema = createSeedSchema(requirements as any, null);
    await writeFile(path.join(projectDir, 'shop-home-page.requirements.json'), `${JSON.stringify(requirements, null, 2)}\n`);
    await writeFile(path.join(projectDir, SHOP_HOME_PAGE_SCHEMA_FILE), `${JSON.stringify(schema, null, 2)}\n`);

    const reorderedSpecs = [
      requirements.module_specs[0],
      requirements.module_specs[2],
      requirements.module_specs[1],
      requirements.module_specs[3],
      requirements.module_specs[4],
      requirements.module_specs[5],
    ];
    const reorderedSchema = {
      ...schema,
      modules: [
        schema.modules[0],
        schema.modules[2],
        schema.modules[1],
        schema.modules[3],
        schema.modules[4],
        schema.modules[5],
      ],
    };

    const state = await applyShopHomePageSchemaText(
      projectsRoot,
      projectId,
      shopHomePageSkillDir(process.cwd()),
      `${JSON.stringify(reorderedSchema, null, 2)}\n`,
      reorderedSpecs,
    );

    expect(state.requirements.module_specs.map((spec: any) => spec.type)).toEqual([
      'top_slider',
      'banner',
      'user_assets',
      'goods',
      'shop_info',
      'image_ad',
    ]);
    expect((state.schema as any).modules.map((module: any) => module.type)).toEqual([
      'top_slider',
      'banner',
      'user_assets',
      'goods',
      'shop_info',
      'image_ad',
    ]);
  });

  it('deletes a middle module from both requirements and schema without restoring optional modules', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'shop-home-page-'));
    const projectsRoot = path.join(root, 'projects');
    const projectId = 'project-delete';
    const projectDir = path.join(projectsRoot, projectId);
    await mkdir(projectDir, { recursive: true });

    const requirements = buildRequirements();
    const schema = createSeedSchema(requirements as any, null);
    await writeFile(path.join(projectDir, 'shop-home-page.requirements.json'), `${JSON.stringify(requirements, null, 2)}\n`);
    await writeFile(path.join(projectDir, SHOP_HOME_PAGE_SCHEMA_FILE), `${JSON.stringify(schema, null, 2)}\n`);

    const nextSpecs = requirements.module_specs.filter((spec: any) => spec.type !== 'banner' && spec.type !== 'goods');
    const nextSchema = {
      ...schema,
      modules: schema.modules.filter((module: any) => module.type !== 'banner' && module.type !== 'goods'),
    };

    const state = await applyShopHomePageSchemaText(
      projectsRoot,
      projectId,
      shopHomePageSkillDir(process.cwd()),
      `${JSON.stringify(nextSchema, null, 2)}\n`,
      nextSpecs,
    );

    expect(state.requirements.module_specs.map((spec: any) => spec.type)).toEqual([
      'top_slider',
      'user_assets',
      'shop_info',
      'image_ad',
    ]);
    expect(state.requirements.modules).toEqual([
      'top_slider',
      'user_assets',
      'shop_info',
      'image_ad',
    ]);
    expect((state.schema as any).modules.map((module: any) => module.type)).toEqual([
      'top_slider',
      'user_assets',
      'shop_info',
      'image_ad',
    ]);
  });

  it('treats repeated image_ad instances independently during reordering and deletion', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'shop-home-page-'));
    const projectsRoot = path.join(root, 'projects');
    const projectId = 'project-image-ad';
    const projectDir = path.join(projectsRoot, projectId);
    await mkdir(projectDir, { recursive: true });

    const requirements = {
      ...buildRequirements(),
      module_specs: [
        { type: 'top_slider', content: '头图' },
        { type: 'image_ad', content: '广告一', aspectRatio: '3:4' },
        { type: 'image_ad', content: '广告二', aspectRatio: '1:1' },
        { type: 'shop_info', content: '门店信息' },
      ],
    };
    const schema = createSeedSchema(requirements as any, null);
    await writeFile(path.join(projectDir, 'shop-home-page.requirements.json'), `${JSON.stringify(requirements, null, 2)}\n`);
    await writeFile(path.join(projectDir, SHOP_HOME_PAGE_SCHEMA_FILE), `${JSON.stringify(schema, null, 2)}\n`);

    const nextSpecs = [
      requirements.module_specs[0],
      requirements.module_specs[2],
      requirements.module_specs[3],
    ];
    const nextSchema = {
      ...schema,
      modules: [
        schema.modules[0],
        schema.modules[2],
        schema.modules[3],
      ],
    };

    const state = await applyShopHomePageSchemaText(
      projectsRoot,
      projectId,
      shopHomePageSkillDir(process.cwd()),
      `${JSON.stringify(nextSchema, null, 2)}\n`,
      nextSpecs,
    );

    expect(state.requirements.module_specs).toEqual([
      expect.objectContaining({ type: 'top_slider', content: '头图' }),
      expect.objectContaining({ type: 'image_ad', content: '广告二', aspectRatio: '1:1' }),
      expect.objectContaining({ type: 'shop_info', content: '门店信息' }),
    ]);
    expect((state.schema as any).modules.map((module: any) => module.id)).toEqual([
      'top_slider_1',
      'image_ad_3',
      'shop_info_4',
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
    const styleGuide = {
      reference_images: ['page-shot.png'],
      analysis: {
        background_style: 'Warm cream paper tone with large white rounded cards and airy whitespace.',
        layout_style: 'Airy storefront reference with sparse composition, low information density, small title scale, large empty areas, and a visible customer-assets entry area below the hero.',
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
    expect(goodsPrompt.generation_notes.join('\n')).toContain('布局风格参考');

    expect(nextGoodsPrompt.layout.padding).toBe(0);
    expect(nextGoodsPrompt.constraints.no_padding).toBe(true);
    expect(nextGoodsPrompt.constraints.no_rounded_corners).toBe(true);

    expect(userAssetsPrompt.layout.padding).toBe(0);
    expect(userAssetsPrompt.constraints.no_padding).toBe(true);
    expect(userAssetsPrompt.constraints.no_rounded_corners).toBe(true);
    expect(userAssetsPrompt.generation_notes.join('\n')).toContain('完整填满 schema 给出的卡位尺寸');
    expect(userAssetsPrompt.generation_notes.join('\n')).toContain('布局风格参考');
    expect(userAssetsPrompt.generation_notes.join('\n')).not.toContain('超大标题');
    expect(userAssetsPrompt.style.background_color).toBeUndefined();
    expect(userAssetsPrompt.style.text_color).toBeUndefined();
    expect(userAssetsPrompt.style.primary_color).toBeUndefined();
    expect(userAssetsPrompt.style.accent_color).toBeUndefined();
    expect(userAssetsPrompt.constraints.pure_white_background).toBeUndefined();
    expect(userAssetsPrompt.generation_notes.join('\n')).toContain('底色和文字颜色优先跟随可见参考入口区');
    expect(userAssetsPrompt.generation_notes.join('\n')).not.toContain('背景保持纯白');
  });

  it('keeps white-card fallback for user_assets without reference images', () => {
    const schema = createSeedSchema(buildRequirements(), null);
    const tasks = collectAssetTasks(schema, null, true, new Set());
    const userAssetsTask = tasks.find((task) => task.fileName === 'user-assets-entry-1.png');
    const userAssetsPrompt = JSON.parse(userAssetsTask?.prompt ?? '{}');

    expect(userAssetsPrompt.style.background_color).toBe('#FFFFFF');
    expect(userAssetsPrompt.style.text_color).toBe('#171717');
    expect(userAssetsPrompt.constraints.pure_white_background).toBe(true);
    expect(userAssetsPrompt.generation_notes.join('\n')).toContain('无参考图时默认使用纯白直角底卡和页面文字色');
  });

  it('does not enqueue image tasks for promptless empty-template seed schema', () => {
    const schema = createSeedSchema(
      {
        ...buildRequirements(),
        status: 'needs_confirmation',
      },
      null,
      { skipSeedImagePrompts: true } as any,
    );

    const tasks = collectAssetTasks(schema as any, null, false, new Set());
    expect(tasks).toEqual([]);
  });

  it('adds component-analysis guidance to every referenced image prompt', () => {
    const styleGuide = {
      reference_images: ['page-shot.png'],
      analysis: {
        icon_style: '手绘 icon',
        background_style: '暖橙纸感',
        layout_style: '首屏 hero 稀疏构图，下方客户资产入口区',
      },
      generation_rules: {
        must: [],
        avoid: [],
      },
    };
    const schema = createSeedSchema(buildRequirements(), styleGuide);
    const tasks = collectAssetTasks(schema, styleGuide, true, new Set());

    for (const task of tasks.filter((candidate) => {
      if (!candidate.prompt) return false;
      if (candidate.fileName.startsWith('top-slider-')) return true;
      return candidate.fileName.startsWith('user-assets-entry-');
    })) {
      const prompt = JSON.parse(task.prompt ?? '{}');
      expect(prompt.generation_notes.join('\n')).toContain(
        '先理解参考图，对图片内容进行组件分析，然后对实际要绘制的组件进行参考，不要被其他不相关内容影响。',
      );
    }
  });

  it('keeps top_slider runtime prompts scoped away from customer asset reference regions', () => {
    const styleGuide = {
      reference_images: ['page-shot.png'],
      analysis: {
        icon_style: '黑色手绘 doodle icon',
        background_style: '暖橙纸感背景',
        layout_style: '海报式 hero 在上，下方悬浮欢迎卡承接客户资产三列入口，再衔接 Banner 和商品区。',
      },
      generation_rules: {
        must: [
          '整体保持上方海报 hero、下方悬浮欢迎卡、三列入口、Banner 和商品区的海报式节奏。',
          '借鉴暖橙纸感与黑色手绘笔触。',
        ],
        avoid: [],
      },
    };
    const schema = createSeedSchema(buildRequirements(), styleGuide);
    const tasks = collectAssetTasks(schema, styleGuide, true, new Set());
    const topSliderTask = tasks.find((task) => task.fileName === 'top-slider-1.png');
    const topSliderPrompt = JSON.parse(topSliderTask?.prompt ?? '{}');
    const notes = topSliderPrompt.generation_notes.join('\n');

    expect(notes).toContain('借鉴暖橙纸感与黑色手绘笔触');
    expect(notes).toContain('参考区域仅限整页截图最上方 hero 组件');
    expect(notes).not.toContain('下方悬浮欢迎卡承接客户资产三列入口');
    expect(notes).not.toContain('整体保持上方海报 hero、下方悬浮欢迎卡、三列入口、Banner 和商品区的海报式节奏');
    expect(topSliderPrompt.constraints.reference_region).toBe('top_hero_only');
    expect(topSliderPrompt.constraints.forbid_customer_asset_buttons).toBe(true);
    expect(topSliderPrompt.constraints.forbid_lower_page_ui).toBe(true);
  });

  it('reduces conflicting visual descriptors when runtime prompts use reference images', () => {
    const styleGuide = {
      preset_id: 'bakery-handdrawn-cream',
      reference_images: ['page-shot.png'],
      analysis: {
        background_style: 'warm cream paper',
        layout_style: 'sparse hero layout',
      },
      generation_rules: {
        must: [],
        avoid: [],
      },
    };
    const schema = createSeedSchema(buildRequirements(), styleGuide) as any;
    const topSlider = schema.modules.find((module: any) => module.type === 'top_slider');
    const promptSchema = topSlider.data.items[0].image_prompt_schema;
    promptSchema.style.background_type = 'illustrated_paper';
    promptSchema.style.visual_feel = 'handdrawn_poster';
    promptSchema.product.visual_type = 'photo';
    promptSchema.product.scene = 'composition';

    const tasks = collectAssetTasks(schema, styleGuide, true, new Set());
    const topSliderTask = tasks.find((task) => task.fileName === 'top-slider-1.png');
    const topSliderPrompt = JSON.parse(topSliderTask?.prompt ?? '{}');

    expect(topSliderPrompt.style.background_type).toBeUndefined();
    expect(topSliderPrompt.style.visual_feel).toBeUndefined();
    expect(topSliderPrompt.product.visual_type).toBeUndefined();
    expect(topSliderPrompt.product.scene).toBeUndefined();
    expect(JSON.stringify(topSliderPrompt)).not.toContain('handdrawn_poster');
    expect(JSON.stringify(topSliderPrompt)).not.toContain('"visual_type":"photo"');
    expect(topSliderPrompt.layout.ratio).toBe('3:4');
    expect(topSliderPrompt.layout.structure).toBe('poster_hero');
    expect(topSliderPrompt.constraints.no_padding).toBe(true);
    expect(topSliderPrompt.reference_style.reference_images).toEqual(['page-shot.png']);
  });
});
