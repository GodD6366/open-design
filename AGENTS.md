# Branch Notes

- Hide homepage creation entries `原型`、`幻灯片`、`模板`、`其他` in this branch.
- Keep `店铺首页` as the only visible new-project entry, and keep that exact Chinese label. The canonical internal identifier is `shopHomePage`; treat `storefront` as legacy compatibility only.
- Force the UI language to Simplified Chinese (`zh-CN`) for this branch.
- Do not expose any visible language-switching UI, including the settings dialog and entry-page language menu, unless the user explicitly asks for it.

## ShopHomePage Direction

- Treat `店铺首页` as a dedicated storefront workflow, not just another generic homepage/prototype mode.
- Storefront-facing wording and requirement guidance should stay aligned with the shop scene; prefer storefront-native expressions instead of generic design-language phrasing.
- In the storefront homepage flow, `banner` and `商品` are optional by default. Keep that behavior consistent through the full path, and do not silently add them back as mandatory requirements.
- In the storefront homepage flow, `banner` should not add default padding; only add padding when the user explicitly asks for it.
- In the storefront homepage flow, `user_assets` must use the B-end actual card layout modes and preserve slot-driven aspect ratios.
- In the storefront homepage flow, the default 3-entry layout is `一行三个`; only use `左一右二` when the confirmed request text explicitly implies `左一右二 / 一大两小 / 主次入口`, while existing legacy `left/right_top/right_bottom` projects remain compatible.
- In the storefront homepage flow, `hotzone` is only for more than 5 entries or explicit hotzone/freeform requests, and fixed layouts generate cards sequentially with the first card used as the reference image for later cards.
- In the storefront homepage flow, if the opening turn already contains local reference images, let the current daemon agent analyze them in the first clarification turn and use that result to prefill ordered `module_specs`; unmatched reference blocks should fall back to repeatable `image_ad` modules with ratio hints.
- In the storefront homepage flow, image-bearing modules should keep project-local `reference_images` so downstream asset generation can use real input images instead of text-only prompts.
- In the storefront homepage preview, pending image placeholders should fully fill their module bounds and keep the waiting mark visually centered instead of leaving trailing blank space.
- In the storefront homepage preview contract, `storefront.screen.html` is inner content only; system status UI and phone chrome belong to the outer preview/debug hosts.
- When `shopHomePage` behavior changes on this branch, update this file in the same change with the new high-level direction. Keep the notes behavioral and concise; do not turn `AGENTS.md` into an implementation log.
