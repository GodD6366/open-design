# Checklist

- `storefront.requirements.json` is valid JSON and `status` is `confirmed`.
- `storefront.style-guide.json` is valid JSON when the project depends on a template or reusable style sample.
- `storefront.schema.json` is valid JSON.
- Top-level schema fields are exactly `page_id`, `version`, `layout_mode`, `design_context`, `modules`.
- `version` is `1.0.0`.
- `layout_mode` is `overlay`.
- `design_context.page_width` is `375`.
- Module order matches `storefront.requirements.json`.
- `top_slider` and `goods` item counts match `counts.sliderCount` / `counts.goodsCount`.
- `banner` has exactly 1 item and `asset_type = png`.
- `banner` and `goods` image prompt schemas do not carry displayable `brand`, logo placement, shop logo, brand mark, watermark, or shop slogan instructions.
- `banner` keeps lightweight entry copy: no tags, price, discount, badge, CTA, coupon wall, or product-card photography background.
- `user_assets.body_image_schema` keeps the `mobile_ui_entry_panel` DSL intact.
- When `user_assets` uses the asymmetric 3-entry layout, its canonical slot positions are `left_large`, `right_top`, `right_bottom`, while existing legacy `left/right_top/right_bottom` projects still preview correctly.
- `user_assets` only describes function icons, titles, and subtitles; icons follow page style while the background remains plain white with no complex background.
- Schema copy, palette, and prompt intent stay aligned with the active style guide or inferred industry preset.
- No HTML artifacts were created.
