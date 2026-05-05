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
  });
});
