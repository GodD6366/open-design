import { describe, expect, it } from 'vitest';
import { composeShopHomePageSystemPrompt } from './prompts/shop-home-page.js';

describe('composeShopHomePageSystemPrompt', () => {
  it('pins storefront screenshot guidance to visible modules and explicit reference scope', () => {
    const out = composeShopHomePageSystemPrompt({
      metadata: {
        kind: 'shopHomePage',
      },
    });

    expect(out).toContain('Only treat modules that are visibly present in the uploaded frame as confirmed evidence.');
    expect(out).toContain('Ignore phone chrome, system status UI, bottom tabs, floating widgets, and other host-app UI');
    expect(out).toContain('Reference screenshots only prove the modules visible in that frame.');
    expect(out).toContain('Use `generation_rules.must` and `generation_rules.avoid` to state the reference scope explicitly.');
    expect(out).toContain('When shared `reference_images` come from a full-page storefront screenshot');
    expect(out).toContain('Do not copy unrelated screenshot UI into module assets.');
    expect(out).toContain('composition, whitespace, information density, text amount, and title scale');
    expect(out).toContain('spatial distribution, product count, whitespace ratio, text amount, and title scale');
  });

  it('documents straight-edge zero-padding asset prompts', () => {
    const out = composeShopHomePageSystemPrompt({
      metadata: {
        kind: 'shopHomePage',
      },
    });

    expect(out).toContain('layout.padding = 0');
    expect(out).toContain('constraints.no_padding = true');
    expect(out).toContain('constraints.no_rounded_corners = true');
    expect(out).toContain('clean white straight-edge blocks');
    expect(out).not.toContain('large white rounded cards');
    expect(out).not.toContain('超大标题');
    expect(out).not.toContain('poster-like oversized hero');
  });

  it('requires visible user_assets references to flow into entry reference_images', () => {
    const out = composeShopHomePageSystemPrompt({
      metadata: {
        kind: 'shopHomePage',
      },
    });

    expect(out).toContain('copy that screenshot filename into each `user_assets.data.entries[*].reference_images` by default');
    expect(out).toContain('Do not leave new `user_assets` entries at `reference_images: []`');
    expect(out).toContain('it must not be interpreted as permission to copy the membership summary card, bottom navigation, host-app chrome');
  });

  it('limits full-page screenshots to hero scope for top_slider and icon-area scope for user_assets', () => {
    const out = composeShopHomePageSystemPrompt({
      metadata: {
        kind: 'shopHomePage',
      },
    });

    expect(out).toContain('match the visible hero composition');
    expect(out).toContain('borrow the visible customer-assets icon-area style language plus its whitespace, information density, text hierarchy, and title scale');
    expect(out).toContain('Do not generate or depend on module-local crop files such as `top-slider-ref-hero.png` or `user-assets-ref-strip.png`');
    expect(out).not.toContain('"reference_regions"');
  });
});
