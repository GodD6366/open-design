# Schema Contract

`storefront.schema.json` must stay compatible with the workspace homepage `PageSchema`.

## Top-level fields

- `page_id`
- `version`
- `layout_mode`
- `design_context`
- `modules`

## Fixed values

- `version` must be `1.0.0`
- `layout_mode` must be `overlay`
- `design_context.page_width` must be `375`

## Supported ordered modules

- `top_slider`
- `user_assets`
- `banner`
- `goods`
- `shop_info`

The modules array must contain exactly the confirmed modules from
`storefront.requirements.json`, in that exact order.

## Image-module rules

- `top_slider`
  - `aspect_ratio` = `3:4`
  - `image_prompt_schema.type` = `carousel_banner`
  - `image_prompt_schema.layout.structure` = `poster_hero`
  - `content.tags` must be `[]`
  - `promotion.cta` must be `""`
- `banner`
  - exactly 1 item
  - `data.mode` = `single`
  - `aspect_ratio` = `75:30`
  - `image_prompt_schema.type` = `banner`
  - `image_prompt_schema.layout.structure` = `landscape_entry_banner`
  - `asset_type` = `png`
  - `entry_purpose` required
- `goods`
  - `aspect_ratio` = `4:3`
  - `image_prompt_schema.type` = `goods`
  - `image_prompt_schema.layout.structure` = `product_showcase`
  - `promotion.cta` must be non-empty
- `shop_info`
  - `aspect_ratio` = `9:16`
  - `image_prompt_schema.type` = `shop_info`
  - `image_prompt_schema.layout.structure` = `vertical_shop_story`
  - `content.tags` must be `[]`
  - `promotion.price`, `original_price`, `discount`, `badge`, `cta` must be empty strings

## User-assets rules

- `body_image_schema.type` must be `mobile_ui_entry_panel`
- `body_image_schema.layout.slots` must contain at least 2 slots
- `body_image_schema.content.slots_mapping` must cover every slot id
- every slot mapping must contain `icon`, `title`, `subtitle`
- do not use legacy keys such as `primaryColor`, `divider`, `aspectRatio`, `tone`, `items`
