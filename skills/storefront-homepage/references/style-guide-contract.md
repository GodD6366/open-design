# Style Guide Contract

`storefront.style-guide.json` is a project-local sidecar used when schema
generation must follow a concrete visual template or reusable industry preset.

## Shape

```json
{
  "version": "1.0",
  "preset_id": "auto | bakery-handdrawn-cream | tone-*",
  "reference_images": ["project-local filename"],
  "analysis": {
    "source_summary": "string",
    "icon_style": "string",
    "background_style": "string",
    "layout_style": "string",
    "tone_keywords": ["string"]
  },
  "generation_rules": {
    "must": ["string"],
    "avoid": ["string"]
  }
}
```

## Rules

- Keep this file lightweight and reusable. It is not the final schema.
- If the user gives a template screenshot or uploaded reference image, record
  the filename in `reference_images` when possible.
- If the user gives a reference image URL, download it into the project first,
  then record only the local filename in `reference_images`.
- `preset_id = bakery-handdrawn-cream` means:
  - icon / wordmark style is hand-drawn doodle, black marker-like strokes,
    slightly uneven, playful, not corporate
  - background uses warm cream paper tones, large white rounded cards, very
    sparse orange / yellow accents
  - layout follows a poster-like hero, then floating card, then asymmetric
    action grid with one dominant left tile and stacked right tiles
- The style guide should steer `design_context`, module copy, prompt schema
  details, `reference_images`, and asset generation prompts, while keeping
  `storefront.schema.json` workspace-compatible.
