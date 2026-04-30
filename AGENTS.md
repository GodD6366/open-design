# Branch Notes

- Hide homepage creation entries `原型`、`幻灯片`、`模板`、`其他` in this branch.
- Keep `店铺首页` as the only visible new-project entry, and keep that exact Chinese label.
- Force the UI language to Simplified Chinese (`zh-CN`) for this branch.
- Do not expose any visible language-switching UI, including the settings dialog and entry-page language menu, unless the user explicitly asks for it.

## Storefront Homepage Direction

- Treat `店铺首页` as a dedicated storefront workflow, not just another generic homepage/prototype mode.
- Storefront-facing wording and requirement guidance should stay aligned with the shop scene; prefer storefront-native expressions instead of generic design-language phrasing.
- In the storefront homepage flow, `banner` and `商品` are optional by default. Keep that behavior consistent through the full path, and do not silently add them back as mandatory requirements.
- When storefront homepage behavior changes on this branch, update this file in the same change with the new high-level direction. Keep the notes behavioral and concise; do not turn `AGENTS.md` into an implementation log.
