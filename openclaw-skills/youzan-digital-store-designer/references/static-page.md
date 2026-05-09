# Static Page Contract

The generated package is a standalone static mobile homepage. It must be useful
when opened directly from `dist/index.html`.

## Files

`render-page.ts` writes:

```text
dist/
├── index.html
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
- Do not depend on external JavaScript, runtime APIs, databases, iframes, or a
  host preview shell.
- The page must contain real generated image URLs from `assets-manifest.json`.
- Do not treat placeholders, `example.invalid`, or empty URLs as completed images.
- Keep text compact and aligned with the shop scene.
- Use restrained, work-focused styling suitable for a merchant homepage.

## Asset Manifest

`assets-manifest.json` uses this shape:

```json
{
  "version": "1.0.0",
  "generator": "youzan-image-skill",
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

Before rendering, `generate-images.ts` writes `image-requests.json` in the output
directory. This file is the handoff to the global `youzan-image` Skill:

```json
{
  "version": "1.0.0",
  "generator": "youzan-image-skill",
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

For each pending item, call the global `youzan-image` Skill with the item's
`prompt`, `size`, and `files`. After the Skill returns a URL, record it with
`record-image-result.ts`; the manifest is authoritative for rendering.
