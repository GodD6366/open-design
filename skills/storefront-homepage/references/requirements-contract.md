# Requirements Contract

`storefront.requirements.json` is the structured source of truth produced after
chat clarification.

## Shape

```json
{
  "status": "needs_confirmation | confirmed",
  "source_prompt": "string",
  "modules": ["top_slider", "user_assets", "banner", "goods", "shop_info"],
  "module_content": {
    "top_slider": "string",
    "user_assets": "string",
    "banner": "string",
    "goods": "string",
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

- `modules` can only contain the five supported storefront module types.
- Keep module order exactly as confirmed by the user.
- `action_buttons.selected` keeps the checked button labels in order; `action_buttons.custom` keeps the raw free-text supplement.
- `sliderCount` only applies to `top_slider`; `goodsCount` only applies to `goods`.
- The requirements clarification form no longer asks for counts directly; use the default `sliderCount = 2` and `goodsCount = 3` unless later edits explicitly change them.
- Once clarification is complete, set `status` to `confirmed`.
