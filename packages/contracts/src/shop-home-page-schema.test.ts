import { describe, expect, it } from 'vitest';

import { normalizeShopHomePageSchema } from './shop-home-page-schema';

const requirements = {
  status: 'confirmed',
  source_prompt: '烘焙店铺首页',
  module_specs: [
    { type: 'top_slider', content: '春日新品手作烘焙', itemCount: 1 },
    { type: 'user_assets', content: '到店自取、外卖点单、会员中心' },
    { type: 'goods', content: '主推烘焙商品', itemCount: 2 },
    { type: 'shop_info', content: '品牌故事与服务承诺' },
  ],
  modules: ['top_slider', 'user_assets', 'goods', 'shop_info'],
  module_content: {
    top_slider: '春日新品手作烘焙每日新鲜出炉',
    user_assets: '到店自取、外卖点单、会员中心三大核心功能入口',
    goods: '主推面包、蛋糕等烘焙商品',
    shop_info: '赞的面包店品牌故事、服务承诺、营业信息',
  },
  style: {
    industry: '烘焙',
    brand_name: '赞的面包店',
    primary_color: '#B97945',
    tone: '暖奶油烘焙氛围，真实食欲感',
    avoid: [],
    tone_palette: 'tone-warm-cream',
  },
  action_buttons: {
    selected: ['到店自取', '外卖点单', '会员中心'],
    custom: '',
  },
  counts: {
    sliderCount: 1,
    goodsCount: 2,
  },
};

describe('normalizeShopHomePageSchema', () => {
  it('normalizes simplified OpenClaw schema into OD shopHomePage structure', () => {
    const schema = normalizeShopHomePageSchema(
      {
        version: '1.0.0',
        page: {
          title: '赞的面包店',
        },
        theme: {
          background: '#F7F3EC',
        },
        modules: [
          {
            id: 'top_slider_1',
            type: 'top_slider',
            data: {
              items: [
                {
                  id: 'hero_1',
                  image_prompt_schema: {
                    subject: '春日新品面包主视觉',
                  },
                },
              ],
            },
          },
          {
            id: 'user_assets_1',
            type: 'user_assets',
            data: {
              layout: { label: '一行三个', template_type: 3 },
              entries: [
                { id: 'entry_1', title: '到店自取', subtitle: '提前下单免等待', icon: 'bag' },
                { id: 'entry_2', title: '外卖点单', subtitle: '新鲜直达', icon: 'delivery' },
                { id: 'entry_3', title: '会员中心', subtitle: '专享权益', icon: 'vip' },
              ],
            },
          },
        ],
      },
      requirements,
      null,
    ) as any;

    expect(schema).toMatchObject({
      page_id: 'shop_home_page',
      version: '1.0.0',
      layout_mode: 'overlay',
      design_context: {
        page_width: 375,
        color_palette: {
          accent: '#B97945',
        },
      },
    });
    expect(schema.page).toBeUndefined();
    expect(schema.theme).toBeUndefined();

    const hero = schema.modules.find((module: any) => module.type === 'top_slider');
    expect(hero.layout).toMatchObject({ offsetY: 0, zIndex: 1, paddingX: 0 });
    expect(hero.editable).toMatchObject({ data: true, layout: true, variant: true });
    expect(hero.data).toMatchObject({ mode: 'single', height: 500 });
    expect(hero.data.items[0]).toMatchObject({
      id: 'hero_1',
      image: '',
      reference_images: [],
      no_cache: false,
      aspect_ratio: '3:4',
    });
    expect(hero.data.items[0].image_prompt_schema.constraints).toMatchObject({
      no_padding: true,
      no_rounded_corners: true,
      full_bleed: true,
    });

    const userAssets = schema.modules.find((module: any) => module.type === 'user_assets');
    expect(userAssets.data).toMatchObject({
      greeting: 'Hello',
      nickname: '小赞宝用户',
      progress_percent: 33,
      height: 188,
      card_layout: {
        template_type: 3,
        slots: [
          { id: 'left_1', role: 'sub_action', size: 'small', position: 'left_1' },
          { id: 'center_1', role: 'sub_action', size: 'small', position: 'center_1' },
          { id: 'right_1', role: 'sub_action', size: 'small', position: 'right_1' },
        ],
      },
    });
    expect(userAssets.data.layout).toBeUndefined();
    expect(userAssets.data.entries[0]).toMatchObject({
      id: 'entry_1',
      slot_id: 'left_1',
      title: '到店自取',
      image: '',
      reference_images: [],
      alt: '到店自取',
      no_cache: false,
    });
    expect(userAssets.data.entries[0].image_prompt_schema).toMatchObject({
      type: 'user_asset_entry',
      layout: {
        template_type: 3,
        slot_id: 'left_1',
        ratio: '196:220',
        padding: 0,
      },
      content: {
        title: '到店自取',
        subtitle: '提前下单免等待',
        description: '提前下单免等待',
      },
      constraints: {
        no_padding: true,
        no_rounded_corners: true,
        single_icon_and_description_only: true,
        max_visible_text_lines: 1,
        no_module_summary_text: true,
        no_other_entry_names: true,
        no_third_line_text: true,
      },
    });
  });

  it('preserves legacy Skill shop, industry, and theme fields during normalization', () => {
    const schema = normalizeShopHomePageSchema(
      {
        version: '1.0.0',
        page: {
          brand_name: '页面里的店名',
          industry: '页面里的行业',
          goal: '页面里的目标',
        },
        theme: {
          background: '#FFF9F0',
          primary_color: '#D4A574',
          text_primary: '#2B2118',
        },
        modules: [
          {
            type: 'top_slider',
            data: {
              items: [{ id: 'hero' }],
            },
          },
          {
            type: 'goods',
            data: {
              items: [{ id: 'goods_1' }],
            },
          },
        ],
      },
      {
        status: 'confirmed',
        source_prompt: '创建一个烘焙店铺首页',
        industry: '烘焙',
        shop_name: '赞的面包店',
        homepage_goal: '突出新品、引导到店自取',
        modules: ['top_slider', 'goods'],
        module_specs: [
          { type: 'top_slider', content: '春日新品手作烘焙', itemCount: 1 },
          { type: 'goods', content: '主推商品展示', itemCount: 1 },
        ],
        action_buttons: { selected: ['到店自取'], custom: '' },
        style: {
          primary_color: '#D4A574',
          tone: '暖奶油烘焙氛围',
          tone_palette: 'tone-warm-cream',
          visual_source: '没有品牌规范，请给我一个方向',
        },
        counts: { sliderCount: 1, goodsCount: 1 },
      },
      null,
    ) as any;

    expect(schema.design_context).toMatchObject({
      theme: 'tone_warm_cream',
      color_palette: {
        bg: '#FFF9F0',
        text_primary: '#2B2118',
        accent: '#D4A574',
      },
    });

    const hero = schema.modules.find((module: any) => module.type === 'top_slider');
    expect(hero.data.items[0].image_prompt_schema.product).toMatchObject({
      name: '赞的面包店',
      category: 'dessert',
    });
    expect(hero.data.items[0].image_prompt_schema.content.title).toBe('赞的面包店');
    expect(hero.data.items[0].image_prompt_schema.brand.name).toBe('赞的面包店');

    const goods = schema.modules.find((module: any) => module.type === 'goods');
    expect(goods.data.items[0].image_prompt_schema.product.category).toBe('dessert');
  });

  it('falls back to legacy schema page fields when requirements omit shop metadata', () => {
    const schema = normalizeShopHomePageSchema(
      {
        page: {
          brand_name: '页面店铺名',
          industry: '咖啡茶饮',
          goal: '提升会员复购',
        },
        modules: [
          {
            type: 'top_slider',
            data: {},
          },
        ],
      },
      {},
      null,
    ) as any;

    const hero = schema.modules.find((module: any) => module.type === 'top_slider');
    expect(hero.data.items[0].image_prompt_schema.product).toMatchObject({
      name: '页面店铺名',
      category: 'coffee',
    });
    expect(hero.data.items[0].image_prompt_schema.brand.name).toBe('页面店铺名');
  });

  it('repairs previously normalized placeholder prompt fields from current requirements', () => {
    const schema = normalizeShopHomePageSchema(
      {
        modules: [
          {
            type: 'top_slider',
            data: {
              items: [
                {
                  id: 'hero',
                  alt: '店铺品牌',
                  image_prompt_schema: {
                    type: 'carousel_banner',
                    product: {
                      name: '店铺品牌',
                      category: 'retail',
                    },
                    content: {
                      title: '店铺品牌',
                      subtitle: 'SPRING FEATURE',
                    },
                    brand: {
                      name: '店铺品牌',
                      slogan: '暖奶油烘焙氛围',
                    },
                  },
                },
              ],
            },
          },
          {
            type: 'shop_info',
            data: {
              items: [
                {
                  id: 'shop_info_1',
                  image_prompt_schema: {
                    type: 'shop_info',
                    product: {
                      name: '店铺品牌',
                      category: 'retail',
                    },
                    brand: {
                      name: '店铺品牌',
                    },
                  },
                },
              ],
            },
          },
        ],
      },
      requirements,
      null,
    ) as any;

    const hero = schema.modules.find((module: any) => module.type === 'top_slider');
    expect(hero.data.items[0].image_prompt_schema.product).toMatchObject({
      name: '赞的面包店',
      category: 'dessert',
    });
    expect(hero.data.items[0].image_prompt_schema.content.title).toBe('赞的面包店');
    expect(hero.data.items[0].image_prompt_schema.brand.name).toBe('赞的面包店');

    const shopInfo = schema.modules.find((module: any) => module.type === 'shop_info');
    expect(shopInfo.data.items[0].image_prompt_schema.product).toMatchObject({
      name: '赞的面包店',
      category: 'dessert',
    });
    expect(shopInfo.data.items[0].image_prompt_schema.brand.name).toBe('赞的面包店');
  });

  it('cleans legacy user_assets entry descriptions that contain module summaries', () => {
    const schema = normalizeShopHomePageSchema(
      {
        modules: [
          {
            id: 'user_assets_1',
            type: 'user_assets',
            data: {
              card_layout: { template_type: 3 },
              entries: [
                {
                  id: 'entry_1',
                  title: '到店自取',
                  subtitle: '提前下单免等待',
                  image_prompt_schema: {
                    content: {
                      title: '到店自取',
                      subtitle: '提前下单免等待',
                      description: '到店自取、外卖点单、会员中心',
                    },
                  },
                },
              ],
            },
          },
        ],
      },
      requirements,
      null,
    ) as any;

    const userAssets = schema.modules.find((module: any) => module.type === 'user_assets');
    expect(userAssets.data.entries[0].image_prompt_schema.content).toMatchObject({
      title: '到店自取',
      subtitle: '提前下单免等待',
      description: '提前下单免等待',
    });
  });

  it('seeds image module prompt schemas without low-density-only constraints', () => {
    const schema = normalizeShopHomePageSchema({}, requirements, null) as any;
    const goods = schema.modules.find((module: any) => module.type === 'goods');
    const shopInfo = schema.modules.find((module: any) => module.type === 'shop_info');

    expect(goods.data.items[0].image_prompt_schema.constraints).toMatchObject({
      no_padding: true,
      no_rounded_corners: true,
      full_bleed: true,
      no_logo: true,
      no_brand_mark: true,
      no_shop_slogan: true,
    });
    expect(goods.data.items[0].image_prompt_schema.promotion).toMatchObject({
      price: '¥99 起',
      cta: '立即购买',
    });
    expect(shopInfo.data.items[0].image_prompt_schema.constraints).toMatchObject({
      no_padding: true,
      no_rounded_corners: true,
      full_bleed: true,
      ui_only: true,
    });
  });

  it('removes previously persisted low-density-only constraints from legacy schemas', () => {
    const schema = normalizeShopHomePageSchema(
      {
        modules: [
          {
            type: 'goods',
            data: {
              items: [
                {
                  id: 'goods_1',
                  image_prompt_schema: {
                    constraints: {
                      low_visual_density: true,
                      single_focal_subject: true,
                      minimal_visible_text: true,
                      no_infographic: true,
                      no_collage: true,
                      no_purchase_button: true,
                      cta_semantic_only: true,
                      no_logo: true,
                    },
                    promotion: {
                      price: '¥99 起',
                      cta: '立即购买',
                    },
                  },
                },
              ],
            },
          },
          {
            type: 'shop_info',
            data: {
              items: [
                {
                  id: 'shop_info_1',
                  image_prompt_schema: {
                    constraints: {
                      no_story_paragraphs: true,
                      no_process_grid: true,
                      no_business_hours_list: true,
                    },
                  },
                },
              ],
            },
          },
        ],
      },
      requirements,
      null,
    ) as any;

    const goodsConstraints = schema.modules.find((module: any) => module.type === 'goods').data.items[0].image_prompt_schema.constraints;
    const shopInfoConstraints = schema.modules.find((module: any) => module.type === 'shop_info').data.items[0].image_prompt_schema.constraints;

    expect(goodsConstraints).toMatchObject({
      no_logo: true,
      no_padding: true,
      no_rounded_corners: true,
    });
    expect(goodsConstraints).not.toHaveProperty('low_visual_density');
    expect(goodsConstraints).not.toHaveProperty('cta_semantic_only');
    expect(goodsConstraints).not.toHaveProperty('no_purchase_button');
    expect(shopInfoConstraints).not.toHaveProperty('no_story_paragraphs');
    expect(shopInfoConstraints).not.toHaveProperty('no_process_grid');
    expect(shopInfoConstraints).not.toHaveProperty('no_business_hours_list');
  });
});
