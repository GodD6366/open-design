# Static Page Contract

The generated package is a standalone static mobile homepage. It must be useful
when opened directly from `dist/shop-home-page.preview.html`.

## Files

`render-page.cjs` writes:

```text
dist/
├── shop-home-page.preview.html
├── schema.json
├── requirements.json
├── generated-images/
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
- `render-page.cjs` must be able to render the page framework before image
  generation finishes. Empty manifest URLs mean "image pending" and should
  render the standard component pending state.
- Final image-ready renders must contain real generated http(s) CDN image URLs
  from `assets-manifest.json`. Prefer URLs returned by `youzan-image`; when
  that path is unavailable or fails, use the Skill's built-in OpenAI image
  fallback and upload the result through `youzan-oss`.
- Do not treat placeholders, `example.invalid`, dry-run URLs, local file paths,
  or non-http(s) URLs as completed images. Empty URLs are allowed only for the
  early framework preview.
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
  "generator": "generate-image-assets.cjs",
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
      "backup_file": "generated-images/top_slider_1.items.hero.png",
      "url": "https://..."
    }
  }
}
```

Target ids are stable:

- image module item: `<module_id>.items.<item_id>`
- user asset entry: `<module_id>.entries.<entry_id>`

## Image Requests

Before rendering, `generate-images.cjs` writes `image-requests.json` in the
output directory. `generate-image-assets.cjs` then consumes this file and resolves
every pending item; it is not a manual handoff checklist:

```json
{
  "version": "1.0.0",
  "generator": "generate-image-assets.cjs",
  "items": [
    {
      "id": "top_slider_1.items.hero",
      "size": "1008x1344",
      "prompt": "string",
      "files": [],
      "backup_file": "generated-images/top_slider_1.items.hero.png",
      "status": "pending",
      "url": ""
    }
  ]
}
```

`generate-image-assets.cjs` can run after the initial framework preview exists.
It must resolve every pending item before the final image-ready render:

- First try the global `youzan-image` Skill with the item's `prompt`, `size`,
  and `files` unchanged.
- If `youzan-image` is missing, times out, fails, returns 5xx / 504, returns no
  usable URL, or returns a non-http(s) URL, automatically fall back to the
  Skill's built-in OpenAI image generation.
- Upload fallback outputs through `youzan-oss` and write the final CDN URL back
  into `assets-manifest.json`.
- Save every resolved generated image under `generated-images/` as a local
  backup, and write the relative backup path to `backup_file` in both
  `assets-manifest.json` and `image-requests.json`.
- Never complete the flow with placeholders, dry-run URLs, `example.invalid`,
  local temp paths, or any other fake asset URL.

The manifest is authoritative for rendering. Empty URLs render pending states in
the early preview; every non-empty rendered image URL must be a real reachable
http(s) CDN URL. Final renders should run `render-page.cjs --strict-images` and
`validate-output.cjs` without `--allow-missing-images`.
Local backups under `generated-images/` are copied into `dist/generated-images/`
for recovery and later sequential references; rendering must still use CDN URLs.
