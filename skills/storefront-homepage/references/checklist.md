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
- `user_assets.body_image_schema` keeps the `mobile_ui_entry_panel` DSL intact.
- Schema copy, palette, and prompt intent stay aligned with the active style guide or inferred industry preset.
- No HTML artifacts were created.
