# Style Guide Contract

`shop-home-page.style-guide.json` is a project-local sidecar used when schema
generation must follow a concrete visual template or reusable industry preset.

## Shape

```json
{
  "version": "1.0",
  "preset_id": "auto | bakery-handdrawn-cream | bakery-botanical-sage | bakery-sunlit-autumn | tone-*",
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
- `reference_images` is the effective reference-image set used downstream by schema normalization and asset generation.
- The source of truth for deciding that set is `shop-home-page.reference-state.json`, not ad hoc inference from whatever files happen to be in the project.
- If the user gives a template screenshot or uploaded reference image, record
  the filename in `reference_images` when possible.
- If the user explicitly says “用 xxx 图当参考图”, that image should move into
  `shop-home-page.reference-state.json.user_reference_images`, and
  `reference_images` should then mirror that explicit user set.
- If the user explicitly says an image is 素材 / 商品图 / logo / 活动图 /
  页面内容图, keep it out of `reference_images` and store it under
  `shop-home-page.reference-state.json.asset_images`.
- If the user gives a reference image URL, download it into the project first,
  then record only the local filename in `reference_images`.
- When visual-stage reference images exist, `analysis.source_summary`,
  `analysis.icon_style`, `analysis.background_style`, and
  `analysis.layout_style` should capture reusable cues from that page, not
  only a generic tone label.
- `preset_id = bakery-handdrawn-cream` means:
  - icon / wordmark style is hand-drawn doodle, black marker-like strokes,
    slightly uneven, playful, not corporate
  - background uses warm cream paper tones, clean straight-edge white cards,
    very sparse orange / yellow accents
  - layout follows a poster-like hero, then floating card, then asymmetric
    action grid with one dominant left tile and stacked right tiles
- `preset_id = bakery-botanical-sage` means:
  - botanical paper hero, sage buttons, one-row-three equal entry cards,
    airy paper-gift rhythm
- `preset_id = bakery-sunlit-autumn` means:
  - warm yellow illustrated hero, one-row-three equal entry cards,
    story-led dessert window display mood
- The style guide should steer `design_context`, module copy, prompt schema
  details, `reference_images`, and asset generation prompts, while keeping
  `shop-home-page.schema.json` workspace-compatible.
