---
name: youzan-digital-store-designer
description: |
  Pure OpenClaw skill for generating a standalone Youzan shop homepage package.
  Use for 店铺首页 / 商城首页 / 有赞店铺首页 requests that should produce local
  static files without relying on an Open Design host, project database, preview
  runtime, or asset queue.
triggers:
  - "youzan digital store designer"
  - "youzan shop homepage"
  - "shop homepage"
  - "storefront homepage"
  - "店铺首页"
  - "商城首页"
  - "有赞店铺首页"
---

# Youzan Digital Store Designer

Generate a complete static shop homepage package in the current working
directory. This skill is self-contained: it writes local files, calls the global
`youzan-image` generator for images, renders `dist/index.html`, and validates the
result.

Do not depend on an Open Design host, project database, preview runtime, chat UI
widgets, or the existing storefront asset pipeline. Do not ask the user to open
another UI to continue.

## Fresh Brief Rule

For a fresh `/youzan-digital-store-designer` storefront homepage brief, do not
read files, run scripts, or inspect references before replying. If the brief is
missing business content, page modules, action entries, or visual direction, the
first assistant message must be pure text with the actual questions listed.

Never emit XML, UI tags, hidden metadata, or structured UI syntax. Do not say
that clarification was sent unless the actual questions are in the same message.

Use this exact plain-text structure, omitting only fields the user already
answered clearly:

```text
为了生成独立的有赞店铺首页，请先补充下面信息。可以直接复制后填写，没要求的项写“默认”。

【需求澄清】
1. 店铺名称：
2. 首页目标：例如突出新品、引导到店自取、提升会员复购
3. 需要的模块：可选 top_slider、user_assets、banner、goods、shop_info、image_ad；默认 top_slider + user_assets
4. 功能入口：例如到店自取、外卖点单、会员权益、优惠券、新品上新、门店导航；默认到店自取 + 外卖点单
5. 主推商品 / 服务：
6. 其他内容要求：

【视觉澄清】
7. 视觉来源：已有品牌规范 / 参考图，还是没有品牌规范、由我给方向
8. 品牌调性 / 视觉要求：例如暖奶油、手绘感、清透自然、明亮上新、深色高级
9. 参考图路径（可选）：本地文件路径即可
10. 主色或禁忌（可选）：例如主色偏焦糖、不要廉价大促、不要圆角卡片
```

If only visual information is missing after requirement answers, ask only the
`视觉澄清` section as plain text. If the user explicitly says to skip questions or
answers "默认", infer conservative defaults and continue.

## Resource Map

```text
youzan-digital-store-designer/
├── SKILL.md
├── references/
│   ├── requirements.md
│   ├── schema.md
│   └── static-page.md
├── assets/template/
│   ├── index.template.html
│   └── tokens.css
└── scripts/
    ├── generate-images.ts
    ├── render-page.ts
    └── validate-output.ts
```

## Workflow

1. Fresh brief with missing information: reply with the plain-text clarification
   script above and stop.
2. Requirement and visual answers present: read `references/requirements.md` and
   `references/schema.md`, then write `requirements.json` plus `schema.json` in
   the current working directory.
3. Generate image assets from `schema.json`. Run the bundled scripts from this
   skill directory and pass the output working directory as the first argument:

   ```bash
   node --experimental-strip-types "$SKILL_DIR/scripts/generate-images.ts" "$OUTPUT_DIR"
   ```

   This script calls `/Users/godd/.cc-switch/skills/youzan-image/bin/youzan-image.js`
   and writes `assets-manifest.json`.
4. Render the static package:

   ```bash
   node --experimental-strip-types "$SKILL_DIR/scripts/render-page.ts" "$OUTPUT_DIR"
   ```

   This writes `dist/index.html`, `dist/schema.json`, `dist/requirements.json`, and
   `dist/assets-manifest.json`.
5. Validate before replying:

   ```bash
   node --experimental-strip-types "$SKILL_DIR/scripts/validate-output.ts" "$OUTPUT_DIR"
   ```

6. Reply with a short completion message and the local entry file
   `dist/index.html`.

`$SKILL_DIR` means the directory containing this `SKILL.md`. `$OUTPUT_DIR` means
the current task/output directory where `requirements.json` and `schema.json`
were written. If the skill runner already copied the bundled scripts into the
output directory, `scripts/<name>.ts` is also acceptable.

## Answer Interpretation

Treat plain-text answers by label, not by UI ids. Map common labels as follows:

- `店铺名称` -> `requirements.shop_name`
- `首页目标` -> `requirements.homepage_goal`
- `需要的模块` -> `requirements.module_specs` and `requirements.modules`
- `功能入口` -> `requirements.action_buttons.selected`
- `主推商品 / 服务` -> `requirements.product_focus`
- `其他内容要求` -> `requirements.other_requirements`
- `视觉来源` -> `requirements.visual.brand_reference_mode`
- `品牌调性 / 视觉要求` -> `requirements.visual.brand_notes`
- `参考图路径` -> `requirements.reference_images`
- `主色或禁忌` -> `requirements.style.primary_color` and
  `requirements.style.avoid`

When answers mention reference screenshots, use them as local reference images
only for relevant modules. Full-page screenshots borrow composition, spacing,
density, title scale, palette, and icon language; do not copy bottom navigation,
member summary strips, status bars, or unrelated UI.

## Output Contract

Required files after completion:

- `dist/index.html`
- `dist/schema.json`
- `dist/requirements.json`
- `dist/assets-manifest.json`

Optional local reference images may be copied to `dist/references/`.

## Core Rules

- Clarification is pure text only in this standalone skill.
- Do not use OD daemon, web, DB, project state, chat UI controls,
  legacy storefront asset queues, or daemon asset APIs.
- Infer remaining visual detail from the brief, plain-text visual answers,
  reference images, industry, brand name, products, and business goals.
- `banner` and `goods` are optional by default.
- The default 3-entry `user_assets` layout is `一行三个`.
- Use `左一右二` only when the confirmed request explicitly says `左一右二`,
  `一大两小`, `主次入口`, or equivalent wording.
- Use `hotzone` only for more than 5 entries or explicit hotzone/freeform
  requests.
- Image prompts default to straight edges and zero inner padding unless the user
  explicitly asks otherwise.
- `youzan-image` is the only image-generation dependency for v1.
- `youzan-shop` and `youzan-item` are future optional integrations; do not assume
  they exist.
