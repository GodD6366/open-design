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
- `image_ad`

The modules array must contain exactly the confirmed modules from
`storefront.requirements.json.module_specs`, in that exact order. Only
`image_ad` may repeat.

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
  - `image_prompt_schema.brand` must be omitted or empty; do not show shop logo, brand corner mark, watermark, or shop slogan
  - `content.tags` must be `[]`
  - `promotion.price`, `original_price`, `discount`, `badge`, `cta` must be empty strings
  - visual direction must stay lightweight and distinct from `goods`: prefer horizontal color blocks, light graphics, texture, illustration, or sticker-like elements over product-card photography
- `goods`
  - `aspect_ratio` = `4:3`
  - `image_prompt_schema.type` = `goods`
  - `image_prompt_schema.layout.structure` = `product_showcase`
  - `promotion.cta` must be non-empty
  - `image_prompt_schema.brand` must be omitted or empty; do not show shop logo, brand corner mark, watermark, or shop slogan
- `shop_info`
  - `aspect_ratio` = `9:16`
  - `image_prompt_schema.type` = `shop_info`
  - `image_prompt_schema.layout.structure` = `vertical_shop_story`
  - `content.tags` must be `[]`
  - `promotion.price`, `original_price`, `discount`, `badge`, `cta` must be empty strings
- `image_ad`
  - `aspect_ratio` follows the matching `requirements.module_specs[*].aspectRatio`
  - `image_prompt_schema.type` = `image_ad`
  - `image_prompt_schema.layout.structure` = `reference_image_ad`
  - the visual should preserve the analyzed reference-block composition and not collapse into a generic goods/banner recipe

## User-assets rules

- `user_assets.data` is authored around `card_layout` and `entries`
- `card_layout.template_type` must be one of `7`, `1`, `2`, `3`, `6`, `5`, `hotzone`
- fixed-layout slot ids must stay canonical:
  - `7 -> single`
  - `1 -> left/right`
  - `2 -> left_large/right_top/right_bottom`
  - `3 -> left_1/center_1/right_1`
  - `6 -> top_left/top_right/bottom_left/bottom_right`
  - `5 -> top_left/top_right/bottom_left/bottom_center/bottom_right`
- `hotzone` uses `slot_1 ... slot_n` and should only be used for more than 5 entries or explicit hotzone/freeform requests
- default layout inference is `1 -> 7`, `2 -> 1`, `3 -> 3`, `4 -> 6`, `5 -> 5`, `>5 -> hotzone`; only use `2` for 3 entries when the request text explicitly implies `左一右二 / 一大两小 / 主次入口`
- `entries.length` must equal `card_layout.slots.length`
- every entry must contain `id`, `slot_id`, `icon`, `title`, `subtitle`, `image_prompt_schema`
- keep confirmed button wording in `entries[*].title`; do not normalize it into hidden categories
- each entry image prompt only describes one entry card; fixed layouts respect card size, hotzone may be freer
- existing saved schemas may still carry legacy `body_image_schema` / `slots_mapping` data, including the asymmetric alias `left/right_top/right_bottom`; runtime compatibility must remain intact
- background must stay plain white; do not use gradients, patterns, scenic illustration, photography, paper texture, or other complex backgrounds
- do not introduce shop logo, brand corner mark, watermark, or shop slogan into the entry-panel image
- do not use legacy keys such as `primaryColor`, `divider`, `aspectRatio`, `tone`, `items`
- legacy `body_image`, `body_alt`, and `body_image_schema` are compatibility fields only, not the primary generated structure
- all image-bearing modules may keep local `reference_images` so downstream
  asset generation can use image-edit mode instead of text-only generation
