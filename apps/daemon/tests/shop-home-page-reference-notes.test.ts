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

    expect(notes.join('\n')).toContain('当前参考图主要用于页面风格定向');
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

    expect(notes.join('\n')).toContain('客户资产入口卡片只沿用 icon 笔触');
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

    expect(notes.join('\n')).toContain('顶部主视觉只参考首屏海报的背景氛围');
    expect(notes.join('\n')).toContain('不要把客户资产三宫格');
  });
});
