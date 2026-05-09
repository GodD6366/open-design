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
- The page should contain real generated image URLs from `assets-manifest.json`.
- If an image is unavailable during a dry run, render a visibly labeled placeholder
  so validation can distinguish it from a completed run.
- Keep text compact and aligned with the shop scene.
- Use restrained, work-focused styling suitable for a merchant homepage.

## Asset Manifest

`assets-manifest.json` uses this shape:

```json
{
  "version": "1.0.0",
  "generator": "youzan-image",
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
