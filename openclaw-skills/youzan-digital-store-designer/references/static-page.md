# Static Page Contract

The generated package is a standalone static mobile homepage. It must be useful
when opened directly from `dist/shop-home-page.preview.html`.

## Files

`render-page.ts` writes:

```text
dist/
├── shop-home-page.preview.html
├── schema.json
├── requirements.json
└── assets-manifest.json
```

Optional local references can be copied to:

```text
dist/references/
```

## Rendering Rules

- Render a mobile-first page at a 375px content width.
- When opened on a phone-sized viewport, show the shop page directly.
- When opened on a desktop/wide viewport, wrap the same static page in a CSS-only
  phone shell.
- Do not depend on external JavaScript, runtime APIs, databases, iframes, or a
  host preview shell.
- The page must contain real generated http(s) CDN image URLs from
  `assets-manifest.json`. Prefer URLs returned by `youzan-image`; when that
  path is unavailable or fails, use the Skill's built-in OpenAI image fallback
  and upload the result through `youzan-oss` before rendering.
- Do not treat placeholders, `example.invalid`, dry-run URLs, empty URLs, local
  file paths, or non-http(s) URLs as completed images.
- Do not include OD runtime dependencies such as interface requests, project
  file URLs, localhost URLs, daemon env vars, or legacy asset commands.
- Do not depend on OD daemon, Codex `image_gen`, or any host-only image flow.
- Keep text compact and aligned with the shop scene.
- Use restrained, work-focused styling suitable for a merchant homepage.

## Asset Manifest

`assets-manifest.json` uses this shape:

```json
{
  "version": "1.0.0",
  "generator": "generate-image-assets.ts",
  "generated_at": "2026-05-09T00:00:00.000Z",
  "items": {
    "top_slider_1.items.hero": {
      "module_id": "top_slider_1",
      "module_type": "top_slider",
      "target_id": "hero",
      "target_kind": "items",
      "size": "1008x1344",
      "prompt": "string",
      "files": [],
      "url": "https://..."
    }
  }
}
```

Target ids are stable:

- image module item: `<module_id>.items.<item_id>`
- user asset entry: `<module_id>.entries.<entry_id>`

## Image Requests

Before rendering, `generate-images.ts` writes `image-requests.json` in the
output directory. `generate-image-assets.ts` then consumes this file and resolves
every pending item; it is not a manual handoff checklist:

```json
{
  "version": "1.0.0",
  "generator": "generate-image-assets.ts",
  "items": [
    {
      "id": "top_slider_1.items.hero",
      "size": "1008x1344",
      "prompt": "string",
      "files": [],
      "status": "pending",
      "url": ""
    }
  ]
}
```

`generate-image-assets.ts` must resolve every pending item before rendering:

- First try the global `youzan-image` Skill with the item's `prompt`, `size`,
  and `files` unchanged.
- If `youzan-image` is missing, times out, fails, returns 5xx / 504, returns no
  usable URL, or returns a non-http(s) URL, automatically fall back to the
  Skill's built-in OpenAI image generation.
- Upload fallback outputs through `youzan-oss` and write the final CDN URL back
  into `assets-manifest.json`.
- Never complete the flow with placeholders, dry-run URLs, `example.invalid`,
  local temp paths, or any other fake asset URL.

The manifest is authoritative for rendering, and every rendered image URL must
be a real reachable http(s) CDN URL.
