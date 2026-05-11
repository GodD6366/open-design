import { describe, expect, it } from 'vitest';

import {
  buildShopHomePageImagePromptObject,
  buildShopHomePageUserAssetsEntryPromptObject,
  buildStorefrontReferenceUsageNotes,
} from './shop-home-page-image-prompts';

const styleGuide = {
  preset_id: 'bakery-handdrawn-cream',
  reference_images: ['page-shot.png'],
  analysis: {
    icon_style: '黑色手绘 doodle icon',
    background_style: 'Warm cream paper tone with large white rounded cards.',
    layout_style: '海报式 hero 在上，下方悬浮欢迎卡承接客户资产三列入口，再衔接 Banner 和商品区。',
  },
  generation_rules: {
    must: ['借鉴暖橙纸感与黑色手绘笔触。'],
    avoid: ['no dense coupon wall'],
  },
};

describe('shop-home-page image prompts', () => {
  it('forces straight-edge zero-padding and full bleed for image modules', () => {
    const prompt = buildShopHomePageImagePromptObject({
      moduleType: 'goods',
      item: {
        image_prompt_schema: {
          layout: { padding: 24 },
          constraints: { no_padding: false },
          promotion: { cta: '立即下单' },
        },
        reference_images: [],
      },
      styleGuide: null,
    });

    expect(prompt.layout).toMatchObject({ padding: 0, full_bleed: true });
    expect(prompt.constraints).toMatchObject({
      no_padding: true,
      no_rounded_corners: true,
    });
    expect((prompt.generation_notes as string[]).join('\n')).toContain('不要圆角卡片');
    expect((prompt.generation_notes as string[]).join('\n')).toContain('不要生成底部灰线');
    expect(JSON.stringify(prompt)).toContain('立即下单');
    expect((prompt.generation_notes as string[]).join('\n')).toContain('商品图必须是带转化动作的营销卡片');
  });

  it('scopes top slider references to the visible hero region', () => {
    const prompt = buildShopHomePageImagePromptObject({
      moduleType: 'top_slider',
      item: {
        image_prompt_schema: {
          style: { background_type: 'poster', visual_feel: 'handdrawn_poster' },
          constraints: {},
        },
        reference_images: ['page-shot.png'],
      },
      styleGuide,
    });
    const notes = (prompt.generation_notes as string[]).join('\n');

    expect(notes).toContain('先理解参考图，对图片内容进行组件分析');
    expect(notes).toContain('参考区域仅限整页截图最上方 hero 组件');
    expect(notes).toContain('借鉴暖橙纸感与黑色手绘笔触');
    expect(notes).not.toContain('下方悬浮欢迎卡承接客户资产三列入口');
    expect(prompt.constraints).toMatchObject({
      reference_region: 'top_hero_only',
      forbid_customer_asset_buttons: true,
      forbid_lower_page_ui: true,
    });
    expect((prompt.style as Record<string, unknown>).background_type).toBeUndefined();
    expect((prompt.style as Record<string, unknown>).visual_feel).toBeUndefined();
  });

  it('keeps user asset prompts as single entry cards and lets references drive card colors', () => {
    const prompt = buildShopHomePageUserAssetsEntryPromptObject({
      entry: {
        image_prompt_schema: {
          content: {
            title: '到店自取',
            subtitle: '提前下单免等待',
            description: '到店自取、外卖点单、会员中心',
          },
          style: {
            background_color: '#FFFFFF',
            text_color: '#171717',
            primary_color: '#111111',
            accent_color: '#FFAA00',
          },
          constraints: { pure_white_background: true },
        },
        reference_images: ['page-shot.png'],
      },
      slot: { id: 'right_top' },
      cardLayout: { template_type: 2 },
      styleGuide,
    });
    const notes = (prompt.generation_notes as string[]).join('\n');

    expect(notes).toContain('当前入口卡片布局为 左一右二');
    expect(notes).toContain('只表达当前这个功能入口');
    expect(notes).toContain('不要在一张图里额外生成别的按钮卡片');
    expect(notes).toContain('默认只生成一个 icon 和一行说明文字');
    expect(notes).toContain('entry.title 只用于理解图标语义，不要把 title 画成可见文字');
    expect(notes).toContain('不要再额外生成第三行文字、模块总说明');
    expect(notes).toContain('不要把它画进图片；图片里也不要出现其它入口名称');
    expect(notes).toContain('底色和文字颜色优先跟随可见参考入口区');
    expect(notes).toContain('左侧主卡与右侧两张副卡必须保持同一套网格语言');
    expect(notes).toContain('不要生成底部灰线');
    expect(prompt.content).toMatchObject({
      subtitle: '提前下单免等待',
      description: '提前下单免等待',
      visible_text: '提前下单免等待',
      text_role: 'single_description_line',
      non_visible_entry_intent: '到店自取',
      forbidden_visible_text: ['到店自取'],
    });
    expect((prompt.content as Record<string, unknown>).title).toBeUndefined();
    expect(prompt.entry).toMatchObject({
      title: '到店自取',
      visible_text: '提前下单免等待',
      title_visibility: 'semantic_intent_only_do_not_render',
    });
    expect(prompt.constraints).toMatchObject({
      single_icon_and_description_only: true,
      max_visible_text_lines: 1,
      no_module_summary_text: true,
      no_other_entry_names: true,
      no_third_line_text: true,
    });
    expect((prompt.style as Record<string, unknown>).background_color).toBeUndefined();
    expect((prompt.style as Record<string, unknown>).text_color).toBeUndefined();
    expect((prompt.constraints as Record<string, unknown>).pure_white_background).toBeUndefined();
    expect(prompt.constraints).toMatchObject({
      reference_region: 'customer_asset_icon_card_only',
      forbid_hero_products: true,
      forbid_member_summary_ui: true,
    });
  });

  it('adds module-specific notes for goods, banner, and image ads', () => {
    const goodsPrompt = buildShopHomePageImagePromptObject({
      moduleType: 'goods',
      item: {
        image_prompt_schema: { promotion: { cta: '马上购买' } },
        reference_images: ['page-shot.png', 'croissant.png'],
      },
      styleGuide,
    });
    const bannerPrompt = buildShopHomePageImagePromptObject({
      moduleType: 'banner',
      item: { image_prompt_schema: {}, reference_images: ['page-shot.png'] },
      styleGuide,
    });
    const imageAdPrompt = buildShopHomePageImagePromptObject({
      moduleType: 'image_ad',
      item: { image_prompt_schema: {}, reference_images: ['page-shot.png'] },
      styleGuide,
    });

    expect((goodsPrompt.generation_notes as string[]).join('\n')).toContain('商品主体、包装和摆盘优先跟随那些更具体的参考');
    expect(JSON.stringify(goodsPrompt)).toContain('马上购买');
    expect((goodsPrompt.generation_notes as string[]).join('\n')).toContain('购买行动点属于图片内容本身');
    expect(goodsPrompt.promotion).toMatchObject({
      cta: '马上购买',
    });
    expect((bannerPrompt.generation_notes as string[]).join('\n')).toContain('活动横幅定位为首页入口导流');
    expect((imageAdPrompt.generation_notes as string[]).join('\n')).toContain('该广告块来自参考图中的未映射视觉块');
  });

  it('keeps shop info copy available for brand information posters', () => {
    const prompt = buildShopHomePageImagePromptObject({
      moduleType: 'shop_info',
      item: {
        image_prompt_schema: {
          product: { name: '赞的面包店', elements: ['品牌故事、手作工艺、营业时间和服务承诺'] },
          content: {
            title: '品牌故事',
            subtitle: 'ABOUT',
            description: '我们从一间小店开始，坚持每日现烤，为社区带来健康安心的面包。',
          },
          brand: { name: '赞的面包店', slogan: '手作温度，自然好味' },
        },
        reference_images: [],
      },
      styleGuide: null,
    });
    const notes = (prompt.generation_notes as string[]).join('\n');

    expect(notes).toContain('不要圆角卡片');
    expect(notes).not.toContain('不是整张品牌故事信息图');
    expect(notes).not.toContain('不要生成多段故事正文');
    expect(prompt.constraints).toMatchObject({
      no_padding: true,
      no_rounded_corners: true,
    });
    expect(prompt.content).toMatchObject({
      title: '品牌故事',
      description: '我们从一间小店开始，坚持每日现烤，为社区带来健康安心的面包。',
    });
    expect(prompt.brand).toMatchObject({
      name: '赞的面包店',
      slogan: '手作温度，自然好味',
    });
  });

  it('exports reference usage notes as a standalone contract helper', () => {
    const notes = buildStorefrontReferenceUsageNotes({
      moduleType: 'user_assets',
      referenceImages: ['page-shot.png'],
      styleGuide,
    });

    expect(notes.join('\n')).toContain('可见入口图标区的 icon 笔触');
    expect(notes.join('\n')).toContain('具体按钮图案、标题和副标题必须按当前入口需求生成');
  });
});
