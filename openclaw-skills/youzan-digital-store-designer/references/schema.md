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

All image-bearing targets must include `image_prompt_schema` and may include
`reference_images`. `image_prompt` is legacy fallback only, used only when
`image_prompt_schema` is missing.

Common image sizes:

- `9:16` -> `1008x1792`
- `3:4` -> `1008x1344`
- `16:9` -> `1792x1008`
- `4:3` -> `1344x1008`
- `1:1` -> `1024x1024`

For `75:30`, use `1792x1008` and describe the required horizontal crop in the
prompt schema.

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
        "image_prompt_schema": {
          "subject": "春日新品面包主视觉",
          "composition": "近景陈列，适合 3:4 竖图首屏",
          "style": "暖奶油烘焙氛围，真实食欲感",
          "constraints": ["直角边缘", "无额外内边距"]
        }
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
        "image_prompt_schema": {
          "subject": "到店自取入口卡片插画",
          "composition": "单卡主体清晰，适配 B 端功能入口卡",
          "style": "简洁图标化，避免复杂背景",
          "constraints": ["直角边缘", "无白边", "无圆角卡片壳"]
        }
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

- New schema must express prompts through `image_prompt_schema`; `image_prompt`
  is only for legacy fallback compatibility.
- `generate-images.cjs` should prefer `item.image_prompt_schema` /
  `entry.image_prompt_schema`, then `module.image_prompt_schema`.
- The final `image-requests.json.items[*].prompt` should preferably be the JSON
  string returned by the Open Design contracts prompt helper, not ad hoc prose.
- Keep prompt schemas lightweight and direct.
- Ask for straight edges and no inner padding by default.
- Do not ask for rounded card shells unless the user explicitly asks for them.
- Do not ask for extra white margins around generated images.
- For full-page references, borrow only the module-relevant composition, spacing,
  density, color hierarchy, and title scale.
- For `user_assets`, each entry prompt describes one card subject, title mood,
  and icon/illustration language; it does not describe the whole membership panel.
- `generate-images.cjs` may load `shop-home-page.style-guide.json` first, then
  `style-guide.json`, and pass it into the shared helper when present.
