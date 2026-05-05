# Preview Contract

The host renders a mobile storefront preview from schema only.

## Important assumptions

- The page runtime is mobile-first and rendered at width `375`.
- The page sits inside an iPhone frame preview supplied by the host.
- `storefront.screen.html` is the inner screen content only. It should not
  render a second system status bar or phone shell.
- `storefront.preview.html` owns the outer phone chrome, system status bar,
  and home indicator.
- Preview logic follows the workspace homepage renderer:
  - overlay layout mode
  - `top_slider` as poster carousel
  - `user_assets` as B-end actual membership entry-card layout, driven by `data.card_layout + data.entries`
  - `banner` as single wide entry module
  - `goods` as product cards
  - `shop_info` as tall story poster

`user_assets` preview rules:

- fixed layouts (`7/1/2/3/6/5`) render per-card layout directly instead of merging all buttons into one panel image
- `hotzone` uses free row balancing without strict fixed card-size requirements
- legacy `body_image` / `body_image_schema` only serve as compatibility fallback for old projects

Do not try to approximate preview by authoring HTML. The host compiles
`storefront.preview.html` and `storefront.screen.html` from
`storefront.schema.json`.
