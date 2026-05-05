# Requirements Contract

`storefront.requirements.json` is the structured source of truth produced after
chat clarification.

## Shape

```json
{
  "status": "needs_confirmation | confirmed",
  "source_prompt": "string",
  "module_specs": [
    { "type": "top_slider", "content": "string", "itemCount": 2 },
    { "type": "user_assets", "content": "string" },
    { "type": "image_ad", "content": "string", "aspectRatio": "3:4" }
  ],
  "modules": ["top_slider", "user_assets", "shop_info"],
  "module_content": {
    "top_slider": "string",
    "user_assets": "string",
    "shop_info": "string"
  },
  "style": {
    "industry": "string",
    "brand_name": "string",
    "primary_color": "string",
    "tone": "string",
    "avoid": ["string"]
  },
  "brand_logo": "string",
  "action_buttons": {
    "selected": ["string"],
    "custom": "string"
  },
  "other_requirements": "string",
  "counts": {
    "sliderCount": 2,
    "goodsCount": 3
  }
}
```

## Rules

- `module_specs` is the canonical source of truth. Write it first, then keep
  compatibility fields `modules` and `module_content` aligned with it.
- `module_specs` can only contain the supported storefront module types:
  `top_slider`, `user_assets`, `banner`, `goods`, `shop_info`, `image_ad`.
- Keep `module_specs` order exactly as confirmed by the user.
- Only `image_ad` may repeat. Each repeated `image_ad` entry represents one
  unmatched reference block and may carry an `aspectRatio` like `3:4` or
  `16:9`.
- `modules` is the ordered module-family list derived from `module_specs`, so
  repeated `image_ad` entries collapse to one family entry there.
- `banner` and `goods` are optional by default. Do not silently add them back
  unless the confirmed request or reference analysis requires them.
- `action_buttons.selected` keeps the checked button labels in order; `action_buttons.custom` keeps the raw free-text supplement.
- `sliderCount` only applies to `top_slider`; `goodsCount` only applies to `goods`.
- The requirements clarification form no longer asks for counts directly; use the default `sliderCount = 2` and `goodsCount = 3` unless later edits explicitly change them.
- If the form includes `参考图模块分析`, treat that field as editable
  daemon-side structured analysis and parse it back into ordered
  `module_specs`, preserving repeated `image_ad`.
- Once clarification is complete, set `status` to `confirmed`.
