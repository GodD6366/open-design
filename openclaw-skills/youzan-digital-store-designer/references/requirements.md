# Requirements Contract

The skill collects enough information to generate a static Youzan shop homepage.
Use plain-text clarification, not OD interactive UI markup. The generated
package stays standalone and does not depend on OD daemon/project state.

## Essential Fields

Use these stable requirement fields in `requirements.json`:

```json
{
  "status": "confirmed",
  "source_prompt": "original user brief or merged confirmed answers",
  "industry": "烘焙 | 咖啡茶饮 | other user-provided industry",
  "shop_name": "string",
  "brand_logo": "string",
  "homepage_goal": "string",
  "modules": ["top_slider", "user_assets"],
  "module_specs": [
    { "type": "top_slider", "content": "string", "itemCount": 1 },
    { "type": "user_assets", "content": "string" },
    { "type": "image_ad", "content": "string", "aspectRatio": "3:4" }
  ],
  "module_content": {
    "top_slider": "string",
    "user_assets": "string"
  },
  "action_buttons": {
    "selected": ["到店自取", "外卖点单", "会员权益"],
    "custom": ""
  },
  "style": {
    "tone": "string",
    "primary_color": "string",
    "avoid": ["string"],
    "visual_source": "已有品牌规范 / 参考图，请按品牌走 | 没有品牌规范，请给我一个方向",
    "tone_palette": "tone-warm-cream | tone-fresh-natural | tone-bright-pop | tone-premium-dark | tone-soft-lifestyle"
  },
  "visual": {
    "brand_reference_mode": "string",
    "brand_notes": "string",
    "template_style_notes": "string",
    "tone_palette": "string",
    "accent_override": "string"
  },
  "product_focus": "string",
  "reference_images": ["relative/local/path.png"],
  "other_requirements": "string",
  "extended_answers": [
    { "id": "module_analysis", "label": "参考图模块分析", "type": "textarea", "answer": "string" },
    { "id": "ext_campaign_focus", "label": "本次重点想推什么", "type": "text", "answer": "string" }
  ],
  "counts": {
    "sliderCount": 1,
    "goodsCount": 2
  }
}
```

## Plain-Text Requirement Clarification

If required information is missing, ask these questions as ordinary text:

- 店铺名称
- 首页目标
- 需要的模块
- 功能入口
- 主推商品 / 服务
- 其他内容要求

The first assistant clarification must include the actual question text. Do not
only say that questions were sent.

You may add 0-3 extension questions only when they materially affect schema,
copy, or image prompts. Store those answers under `extended_answers`.

When usable opening reference images exist, insert a conditional `module_analysis`
textarea immediately after `modules`. It is an editable ordered module analysis:

- Parse it back into ordered `module_specs`.
- Preserve repeated `image_ad` blocks.
- Preserve ratio hints such as `[ratio=3:4]`.
- Also keep the raw answer under `extended_answers`.
- Do not use screenshots to infer off-screen modules.

## Plain-Text Visual Clarification

If visual direction is missing, ask these questions as ordinary text:

- 视觉来源：已有品牌规范 / 参考图，还是没有品牌规范、由我给方向
- 品牌调性 / 视觉要求
- 参考图路径（可选）
- 主色或禁忌（可选）

Visual answers are not a separate output file. Store them in
`requirements.json.visual`, mirror local submitted image paths into
`requirements.json.reference_images`, and use them to drive `schema.json.theme`,
copy tone, and each module's image prompts/reference files.

Tone palette defaults:

- `tone-warm-cream`: warm cream paper, white surfaces, toast-orange accent.
- `tone-fresh-natural`: pale green neutrals, clean white modules, airy natural
  rhythm.
- `tone-bright-pop`: pale warm base, coral-orange accent, energetic new-arrival
  campaign feel.
- `tone-premium-dark`: charcoal surfaces, warm gold-brown accent, boutique
  premium feel.
- `tone-soft-lifestyle`: warm off-white, clay accent, soft editorial retail
  rhythm.

If `brand_reference_mode` says the user has a brand/template reference, submitted
`reference_images`, `brand_notes`, and `template_style_notes` outrank the tone
palette. If the user has no brand reference, `tone_palette` is the deterministic
visual default.

## Field Mapping

- `shop_name` maps to top-level `shop_name`, `schema.page.brand_name`, and
  module copy where relevant.
- `brand_logo` maps to `brand_logo`; do not force it into every image prompt.
- `industry` maps to top-level `industry` and `schema.page.industry`.
- `homepage_goal` maps to top-level `homepage_goal` and `schema.page.goal`.
- `modules` is an inclusion filter over the fixed order
  `top_slider -> user_assets -> banner -> goods -> shop_info -> image_ad`.
- `action_buttons` maps to `action_buttons.selected` in the submitted order.
- `action_buttons_custom` maps to `action_buttons.custom`.
- `product_focus` maps to product/module copy and relevant image prompts.
- `other_requirements` maps to the top-level field and prompt constraints.
- Non-fixed requirement questions and `module_analysis` are stored in
  `extended_answers` as an array of `{ id, label, type, answer }`.

## Defaults

- If the industry is unknown but the brief mentions bakery, pastry, bread, cake,
  dessert, 烘焙, 面包, 蛋糕, or 甜品, use `烘焙`.
- If the industry is unknown but the brief mentions coffee, tea, latte, 咖啡,
  茶饮, 奶茶, or 饮品, use `咖啡茶饮`.
- If modules are not specified, use `top_slider` and `user_assets`; add
  `shop_info` only when the brief asks for brand/story/shop-introduction content.
- Do not add `banner` or `goods` unless requested or clearly implied.
- If action buttons are missing, use `到店自取` and `外卖点单`.
- If exactly 3 action buttons are confirmed, use the `一行三个` layout unless the
  request explicitly asks for primary/secondary emphasis.
- Use `counts.sliderCount = 1` and `counts.goodsCount = 2` unless the user later
  explicitly changes counts.
- Use straight edges and zero inner padding in generated image prompts unless
  the user explicitly asks for rounded shells or padding.
