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
    expect(out).toContain('Full-page storefront screenshot `reference_images` are module-scoped.');
    expect(out).toContain('Do not copy unrelated screenshot UI into module assets.');
    expect(out).toContain('composition, whitespace, information density, text amount, and title scale');
    expect(out).toContain('spatial distribution, product count, whitespace ratio, text amount, and title scale');
    expect(out).toContain('先理解参考图，对图片内容进行组件分析，然后对实际要绘制的组件进行参考，不要被其他不相关内容影响。');
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

  it('documents the reference-state sidecar and explicit user reference promotion', () => {
    const out = composeShopHomePageSystemPrompt({
      metadata: {
        kind: 'shopHomePage',
      },
    });

    expect(out).toContain('shop-home-page.reference-state.json');
    expect(out).toContain('the only project-local source of truth');
    expect(out).toContain('用 xxx 图当参考图');
    expect(out).toContain('user_reference_images');
    expect(out).toContain('asset_images');
    expect(out).toContain('Template default images belong in `template_reference_images` only.');
  });

  it('requires visible user_assets references to flow into entry reference_images', () => {
    const out = composeShopHomePageSystemPrompt({
      metadata: {
        kind: 'shopHomePage',
      },
    });

    expect(out).toContain('copy that screenshot filename into each `user_assets.data.entries[*].reference_images` by default');
    expect(out).toContain('Do not leave new `user_assets` entries at `reference_images: []`');
    expect(out).toContain('entry-card layout mode, icon stroke, subject composition, card background color, text color contrast');
    expect(out).toContain('it must not be interpreted as permission to copy the membership summary card, bottom navigation, host-app chrome');
    expect(out).toContain('do not attach it to absent modules such as `shop_info`, `goods`, or `banner` just for style');
  });

  it('limits full-page screenshots to hero scope for top_slider and icon-area scope for user_assets', () => {
    const out = composeShopHomePageSystemPrompt({
      metadata: {
        kind: 'shopHomePage',
      },
    });

    expect(out).toContain('match only the visible top hero component');
    expect(out).toContain('Treat customer-asset grids, entry buttons, membership/welcome cards, banners, goods, shop_info, and all lower-page content as forbidden visual regions for the hero.');
    expect(out).toContain('borrow the visible customer-assets entry-card layout mode, icon-area style language, card background color, text color contrast, whitespace, information density, text hierarchy, and title scale');
    expect(out).toContain('Do not generate or depend on module-local crop files such as `top-slider-ref-hero.png` or `user-assets-ref-strip.png`');
    expect(out).not.toContain('"reference_regions"');
  });

  it('lets user_assets references drive card colors instead of forcing white', () => {
    const out = composeShopHomePageSystemPrompt({
      metadata: {
        kind: 'shopHomePage',
      },
    });

    expect(out).toContain('fallback to a plain white card background with the page text color');
    expect(out).toContain('card background color');
    expect(out).toContain('text color contrast');
    expect(out).not.toContain('the canvas background must stay plain white');
  });

  it('requires reference-led prompts to avoid conflicting visual descriptors', () => {
    const out = composeShopHomePageSystemPrompt({
      metadata: {
        kind: 'shopHomePage',
      },
    });

    expect(out).toContain('reference-led image prompts');
    expect(out).toContain('Do not combine incompatible visual axes');
    expect(out).toContain('style.visual_feel = "handdrawn_poster"');
    expect(out).toContain('product.visual_type = "photo"');
    expect(out).toContain('prefer omitting or softening fields like `style.background_type`, `style.visual_feel`, `product.visual_type`, and `product.scene`');
  });

  it('supports non-interactive automation mode for external controllers', () => {
    const out = composeShopHomePageSystemPrompt({
      metadata: {
        kind: 'shopHomePage',
      },
      automationMode: true,
      requestSource: 'openclaw',
    });

    expect(out).toContain('## Automation mode');
    expect(out).toContain('Do not emit any `<question-form>` blocks in this mode.');
    expect(out).toContain('Set `shop-home-page.requirements.json.status` to `confirmed`');
  });

  it('tightens automation mode when requirements and visual answers are already present', () => {
    const out = composeShopHomePageSystemPrompt({
      metadata: {
        kind: 'shopHomePage',
      },
      automationMode: true,
      automationHasRequirementsAnswers: true,
      automationHasVisualAnswers: true,
      requestSource: 'openclaw',
    });

    expect(out).toContain('already contains `[form answers — storefront-requirements]`');
    expect(out).toContain('already contains `[form answers — shop-home-page-visual]`');
    expect(out).toContain('do not ask any more questions');
    expect(out).toContain('do not open `.od-skills/`');
    expect(out).toContain('do not continue exploring unrelated files');
  });

  it('treats metadata industry as a known default for requirement clarification', () => {
    const out = composeShopHomePageSystemPrompt({
      metadata: {
        kind: 'shopHomePage',
        shopHomePageIndustryId: 'coffeeTea',
        shopHomePageIndustryLabel: '咖啡茶饮',
      },
    });

    expect(out).toContain('Treat it as a known default for `所属行业`');
    expect(out).toContain('do not re-ask that field as unknown');
    expect(out).toContain('allow the user to override it later');
  });

  it('documents fixed requirements questions, conditional module analysis, and dynamic extensions', () => {
    const out = composeShopHomePageSystemPrompt({
      metadata: {
        kind: 'shopHomePage',
      },
    });

    expect(out).toContain('Always include these fixed questions in this exact order:');
    expect(out).toContain('1. `brand_name`');
    expect(out).toContain('4. `modules`');
    expect(out).toContain('5. `action_buttons`');
    expect(out).toContain('6. `action_buttons_custom`');
    expect(out).toContain('7. `other_requirements`');
    expect(out).toContain('Default this field to `top_slider + user_assets + goods + shop_info`');
    expect(out).toContain('When usable opening reference images exist, insert one conditional question immediately after `modules`: `module_analysis`');
    expect(out).toContain('If there are no usable opening reference images, do not include `module_analysis` at all.');
    expect(out).toContain('You may append 0-3 additional extension questions between `action_buttons_custom` and `other_requirements`.');
    expect(out).toContain('prefixed with `ext_`');
    expect(out).toContain('"extended_answers"');
    expect(out).toContain('Persist every non-fixed question answer into `extended_answers`');
    expect(out).toContain('When `module_analysis` is absent, derive `module_specs` deterministically by filtering the fixed module order `top_slider -> user_assets -> banner -> goods -> shop_info -> image_ad`');
  });

  it('keeps bridge metadata on the normal two-step flow for web chat', () => {
    const out = composeShopHomePageSystemPrompt({
      metadata: {
        kind: 'shopHomePage',
        externalControlMode: 'shop-home-page-bridge',
      },
      requestSource: 'web-chat',
    });

    expect(out).toContain('On a fresh storefront brief, your first assistant turn must be');
    expect(out).toContain('<question-form id="shop-home-page-visual" title="视觉澄清">');
    expect(out).not.toContain('do not emit a second human-facing visual clarification form');
  });

  it('keeps bridge metadata in bridge mode for openclaw requests', () => {
    const out = composeShopHomePageSystemPrompt({
      metadata: {
        kind: 'shopHomePage',
        externalControlMode: 'shop-home-page-bridge',
      },
      requestSource: 'openclaw',
    });

    expect(out).toContain('external-control bridge project');
    expect(out).toContain('do not emit a second human-facing visual clarification form');
    expect(out).not.toContain(
      'your next assistant turn must be: one short Chinese sentence + a `<question-form id="shop-home-page-visual" title="视觉澄清">` block + stop.',
    );
  });

  it('uses the normalized visual form id in the interactive workflow text', () => {
    const out = composeShopHomePageSystemPrompt({
      metadata: {
        kind: 'shopHomePage',
      },
      requestSource: 'web-chat',
    });

    expect(out).toContain('<question-form id="shop-home-page-visual" title="视觉澄清">');
    expect(out).not.toContain('<question-form id="storefront-visual" title="视觉澄清">');
  });
});
