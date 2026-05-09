# Schema Contract

`schema.json` is the static homepage source of truth. It must be JSON and must
not depend on a host renderer.

## Top-Level Shape

```json
{
  "version": "1.0.0",
  "page": {
    "title": "string",
    "industry": "string",
    "brand_name": "string",
    "goal": "string"
  },
  "theme": {
    "background": "#F7F3EC",
    "surface": "#FFFFFF",
    "surface_subtle": "#F1E8DA",
    "text": "#2C241C",
    "muted": "#7A6B5C",
    "accent": "#B97945",
    "radius": 8
  },
  "modules": []
}
```

## Supported Modules

Only these module types are supported in v1:

- `top_slider`
- `user_assets`
- `banner`
- `goods`
- `shop_info`
- `image_ad`

The module order must match `requirements.json.module_specs`.

## Image Modules

All image-bearing targets must include an `image_prompt` and may include
`reference_images`.

Common image sizes:

- `9:16` -> `1008x1792`
- `3:4` -> `1008x1344`
- `16:9` -> `1792x1008`
- `4:3` -> `1344x1008`
- `1:1` -> `1024x1024`

For `75:30`, use `1792x1008` and describe the required horizontal crop in the
prompt.

### `top_slider`

```json
{
  "id": "top_slider_1",
  "type": "top_slider",
  "title": "春日新品",
  "subtitle": "手作烘焙每日新鲜出炉",
  "data": {
    "items": [
      {
        "id": "hero",
        "title": "春日新品",
        "subtitle": "手作烘焙每日新鲜出炉",
        "aspect_ratio": "3:4",
        "image_prompt": "..."
      }
    ]
  }
}
```

### `banner`

Banner is optional by default. It should be a lightweight horizontal entry, not a
dense product card. Use `aspect_ratio = "75:30"`.

### `goods`

Goods is optional by default. When present, use product-specific copy and
`aspect_ratio = "4:3"`.

### `shop_info`

Use only for shop story, brand credibility, opening hours, address, service
promise, or similar content. Use `aspect_ratio = "9:16"`.

### `image_ad`

Use for repeatable reference-style ad blocks. It may repeat. Preserve the
confirmed order and any requested aspect ratio.

## `user_assets`

`user_assets` renders B-end style action cards. Its background should stay plain
and clean; do not generate complex scenic backgrounds, heavy gradients, watermarks,
logo corner marks, or extra padding.

```json
{
  "id": "user_assets_1",
  "type": "user_assets",
  "title": "会员服务",
  "data": {
    "layout": {
      "label": "一行三个",
      "template_type": 3
    },
    "entries": [
      {
        "id": "entry_1",
        "title": "到店自取",
        "subtitle": "提前下单免等待",
        "icon": "bag",
        "image_prompt": "..."
      }
    ]
  }
}
```

Layout inference:

- 1 entry -> `template_type = 7`, label `单张横图`
- 2 entries -> `template_type = 1`, label `一行两个`
- 3 entries -> `template_type = 3`, label `一行三个`
- 4 entries -> `template_type = 6`, label `二行四个`
- 5 entries -> `template_type = 5`, label `二行五个`
- More than 5 entries -> `template_type = "hotzone"`, label `热区自由布局`

Use `template_type = 2`, label `左一右二`, only when the confirmed request text
explicitly implies `左一右二`, `一大两小`, `主次入口`, or a primary action plus two
secondary actions.

## Prompt Rules

- Keep image prompts lightweight and direct.
- Ask for straight edges and no inner padding by default.
- Do not ask for rounded card shells unless the user explicitly asks for them.
- Do not ask for extra white margins around generated images.
- For full-page references, borrow only the module-relevant composition, spacing,
  density, color hierarchy, and title scale.
- For `user_assets`, each entry prompt describes one card subject, title mood,
  and icon/illustration language; it does not describe the whole membership panel.
