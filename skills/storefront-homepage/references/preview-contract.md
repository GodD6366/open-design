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
  - `user_assets` as membership/entry panel
  - `banner` as single wide entry module
  - `goods` as product cards
  - `shop_info` as tall story poster

Do not try to approximate preview by authoring HTML. The host compiles
`storefront.preview.html` and `storefront.screen.html` from
`storefront.schema.json`.
