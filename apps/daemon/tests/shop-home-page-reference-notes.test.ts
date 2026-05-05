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

  it('treats user_assets strip references as style-only when there is no entry crop match', () => {
    const notes = buildStorefrontReferenceUsageNotes({
      moduleType: 'user_assets',
      referenceImages: ['user-assets-ref-strip.png'],
      styleGuide: {
        reference_regions: {
          user_assets: {
            strip: {
              source_image: 'page-shot.png',
              x: 0.1,
              y: 0.4,
              width: 0.7,
              height: 0.12,
            },
          },
        },
      },
    });

    expect(notes.join('\n')).toContain('客户资产图标区局部参考');
    expect(notes.join('\n')).toContain('具体按钮图案和文字按当前需求生成');
  });

  it('treats top_slider hero crops as localized hero references instead of whole-page guidance', () => {
    const notes = buildStorefrontReferenceUsageNotes({
      moduleType: 'top_slider',
      referenceImages: ['top-slider-ref-hero.png'],
      styleGuide: {
        reference_regions: {
          top_slider: {
            source_image: 'page-shot.png',
            x: 0.08,
            y: 0.05,
            width: 0.84,
            height: 0.34,
          },
        },
      },
    });

    expect(notes.join('\n')).toContain('头图 hero 局部参考图');
    expect(notes.join('\n')).toContain('不要把客户资产入口条');
  });
});
