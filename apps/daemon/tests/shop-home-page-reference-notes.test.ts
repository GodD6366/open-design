import { describe, expect, it } from 'vitest';
import { buildStorefrontReferenceUsageNotes } from '../src/shop-home-page.js';

describe('buildStorefrontReferenceUsageNotes', () => {
  it('treats shared storefront screenshots as style-only guidance for goods', () => {
    const notes = buildStorefrontReferenceUsageNotes({
      moduleType: 'goods',
      referenceImages: ['page-shot.png'],
      styleGuide: {
        reference_images: ['page-shot.png'],
      },
    });

    expect(notes.join('\n')).toContain('当前参考图主要用于页面风格、构图密度');
    expect(notes.join('\n')).toContain('信息密度不得高于参考图对应区域');
    expect(notes.join('\n')).toContain('留白和文字尺度定向');
    expect(notes.join('\n')).toContain('不要照搬会员条、底部导航、状态栏、悬浮按钮');
  });

  it('prefers module-specific goods refs over shared storefront screenshots for the subject itself', () => {
    const notes = buildStorefrontReferenceUsageNotes({
      moduleType: 'goods',
      referenceImages: ['page-shot.png', 'croissant-closeup.png'],
      styleGuide: {
        reference_images: ['page-shot.png'],
      },
    });

    expect(notes.join('\n')).toContain('商品主体、包装和摆盘优先跟随那些更具体的参考');
    expect(notes.join('\n')).toContain('已提供更具体的商品参考图');
  });

  it('treats full-page screenshots as icon-area style guidance for user_assets', () => {
    const notes = buildStorefrontReferenceUsageNotes({
      moduleType: 'user_assets',
      referenceImages: ['page-shot.png'],
      styleGuide: {
        reference_images: ['page-shot.png'],
      },
    });

    expect(notes.join('\n')).toContain('可见入口图标区的 icon 笔触');
    expect(notes.join('\n')).toContain('文字尺度和信息密度');
    expect(notes.join('\n')).toContain('具体按钮图案、标题和副标题必须按当前入口需求生成');
  });

  it('treats full-page screenshots as hero-only guidance for top_slider', () => {
    const notes = buildStorefrontReferenceUsageNotes({
      moduleType: 'top_slider',
      referenceImages: ['page-shot.png'],
      styleGuide: {
        reference_images: ['page-shot.png'],
      },
    });

    expect(notes.join('\n')).toContain('顶部主视觉要参考首屏 hero 的空间分布');
    expect(notes.join('\n')).toContain('文字数量和标题尺度');
    expect(notes.join('\n')).toContain('先理解参考图，对图片内容进行组件分析');
    expect(notes.join('\n')).toContain('不要为了“海报感”新增醒目的大号中文标题');
    expect(notes.join('\n')).toContain('不要把客户资产三宫格');
    expect(notes.join('\n')).toContain('参考区域仅限整页截图最上方 hero 组件');
    expect(notes.join('\n')).toContain('客户资产三宫格、入口按钮、会员/欢迎卡、下方 Banner、商品区和品牌故事区都属于其他组件');
  });

  it('keeps banners sparse when a shared storefront screenshot is the only reference', () => {
    const notes = buildStorefrontReferenceUsageNotes({
      moduleType: 'banner',
      referenceImages: ['page-shot.png'],
      styleGuide: {
        reference_images: ['page-shot.png'],
      },
    });

    expect(notes.join('\n')).toContain('Banner 参考整页风格里的色块');
    expect(notes.join('\n')).toContain('留白和文字密度');
    expect(notes.join('\n')).toContain('保持轻量');
  });
});
