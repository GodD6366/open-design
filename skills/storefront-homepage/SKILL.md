---
name: storefront-homepage
description: |
  Chat-driven storefront homepage planning for OD. Use when the task is a
  merchant / shop homepage that must end in workspace-compatible
  `storefront.requirements.json` and `storefront.schema.json`, with mobile
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
    entry: storefront.preview.html
  design_system:
    requires: false
  default_for: shopHomePage
  example_prompt: "为精品咖啡品牌生成一个移动端店铺首页 schema，先澄清需求，再澄清视觉，再输出 requirements 和 schema。"
---

# Storefront Homepage Skill

This skill is **schema-first** and **chat-driven**.

The canonical outputs are:

- `storefront.requirements.json`
- `storefront.style-guide.json`
- `storefront.schema.json`

The host is responsible for:

- compiling `storefront.screen.html`
- compiling `storefront.preview.html`
- rendering the iPhone frame
- generating images later

## Resource map

```text
storefront-homepage/
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
