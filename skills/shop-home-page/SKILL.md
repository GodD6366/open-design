---
name: shop-home-page
description: |
  Chat-driven storefront homepage planning for OD. Use when the task is a
  merchant / shop homepage that must end in workspace-compatible
  `shop-home-page.requirements.json` and `shop-home-page.schema.json`, with mobile
  preview compiled by the host.
triggers:
  - "storefront homepage"
  - "shop homepage"
  - "merchant homepage"
  - "店铺首页"
  - "商城首页"
od:
  mode: shopHomePage
  scenario: marketing
  preview:
    type: shopHomePage
    entry: shop-home-page.preview.html
  design_system:
    requires: false
  default_for: shopHomePage
  example_prompt: "为精品咖啡品牌生成一个移动端店铺首页 schema，先澄清需求，再澄清视觉，再输出 requirements 和 schema。"
---

# Storefront Homepage Skill

This skill is **schema-first** and **chat-driven**.

The canonical outputs are:

- `shop-home-page.requirements.json`
- `shop-home-page.style-guide.json`
- `shop-home-page.schema.json`

The host is responsible for:

- compiling `shop-home-page.screen.html`
- compiling `shop-home-page.preview.html`
- rendering the iPhone frame
- generating images later

## Resource map

```text
shop-home-page/
├── SKILL.md
├── assets/
│   ├── requirements.template.json
│   ├── style-guide.template.json
│   └── schema.template.json
└── references/
    ├── requirements-contract.md
    ├── style-guide-contract.md
    ├── schema-contract.md
    ├── preview-contract.md
    └── checklist.md
```

## Core rules

1. Use the OD chat clarification flow: requirements first, visual second, schema after that.
   - If the opening turn already includes local reference images and the
     current daemon agent can inspect them, analyze them first in the first
     clarification turn, prefill `参考图模块分析`, and preserve its ordered
     `module_specs`.
2. Do not create `index.html`.
3. Do not emit `<artifact>`.
4. Keep `storefront.requirements.json` aligned with the requirements contract.
5. Keep `storefront.style-guide.json` aligned with the style-guide contract when a template or reusable visual reference exists.
6. Keep `storefront.schema.json` aligned with the workspace homepage schema contract.
7. Do not invent unsupported modules beyond:
   - `top_slider`
   - `user_assets`
   - `banner`
   - `goods`
   - `shop_info`
   - `image_ad`

## File workflow

1. Read `references/requirements-contract.md`.
2. Read `references/style-guide-contract.md`.
3. Read `references/schema-contract.md`.
4. Read `references/preview-contract.md`.
5. Read the project-local `storefront.requirements.json`.
6. Read the project-local `storefront.style-guide.json`.
7. Read the project-local `storefront.schema.json`.
8. Overwrite those same project-local files in place.
9. Re-check `references/checklist.md`.

## Output contract

- Write only the JSON files.
- Return one short confirmation line at most.
