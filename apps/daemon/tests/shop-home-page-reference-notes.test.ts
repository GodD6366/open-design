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
});
