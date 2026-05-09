---
name: youzan-digital-store-designer
description: |
  纯 OpenClaw Skill，用于生成独立的有赞店铺首页静态包。
  适用于店铺首页 / 商城首页 / 有赞店铺首页需求，产物为本地静态文件，
  不依赖 Open Design host、项目数据库、预览运行时或资产队列。
triggers:
  - "youzan digital store designer"
  - "youzan shop homepage"
  - "shop homepage"
  - "storefront homepage"
  - "店铺首页"
  - "商城首页"
  - "有赞店铺首页"
---

# 有赞数字店铺设计器

本 Skill 在当前工作目录生成一个完整的静态店铺首页包。流程包括：
整理需求、生成 `requirements.json` 和 `schema.json`、运行
`generate-image-assets.ts` 生成真实图片资产、渲染
`dist/shop-home-page.preview.html`，并在完成前校验产物。

不要依赖 Open Design host、项目数据库、预览运行时、聊天 UI 控件或旧的店铺首页资产流水线。不要要求用户打开其它 UI 才能继续。

## 首轮规则

当用户通过 `/youzan-digital-store-designer` 发起新的店铺首页需求时，如果缺少业务内容、页面模块、功能入口或视觉方向，第一轮回复必须直接输出纯文本问题清单，然后停止。

不要在首轮读取文件、运行脚本或检查引用资料。不要输出 XML、UI 标签、隐藏元数据或结构化 UI 语法。不要只说“已经澄清”或“请补充信息”，必须把实际问题写出来。

使用下面这段纯文本话术。用户可以只回答知道的部分；未填写、留空、写“默认”的内容，都由模型根据行业、店铺名称、首页目标、模块和上下文自行决策默认值，不要因此继续追问：

```text
为了生成独立的有赞店铺首页，请先补充下面信息。可以只填你确定的内容，其他留空或写“默认”，我会按店铺场景自动决策。

【需求澄清】
1. 店铺名称：
2. 首页目标：例如突出新品、引导到店自取、提升会员复购
3. 需要的模块：可选 顶部轮播、客户资产、活动轮播、商品展示、店铺细心、图片广告；留空默认由我判断
4. 功能入口：例如到店自取、外卖点单、会员权益、优惠券、新品上新、门店导航；留空默认由我判断
5. 主推商品 / 服务：
6. 其他内容要求：

【视觉澄清】
7. 视觉来源：已有品牌规范 / 参考图，还是没有品牌规范、由我给方向
8. 品牌调性 / 视觉要求：例如暖奶油、手绘感、清透自然、明亮上新、深色高级
9. 参考图路径（可选）：本地文件路径即可
10. 主色或禁忌（可选）：例如主色偏焦糖、不要廉价大促、不要圆角卡片
```

如果用户明确说“跳过问题 / 不要追问 / 直接生成”，或者已回答一部分但把其它项留空，就用模型自行判断的默认值继续生成，不再卡住。

## 资源目录

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
    ├── generate-image-assets.ts
    ├── record-image-result.ts
    ├── render-page.ts
    └── validate-output.ts
```

## 工作流

1. 新需求且缺少关键信息：输出上面的纯文本澄清问题并停止。
2. 用户已回答，或明确允许使用默认值：读取 `references/requirements.md` 和 `references/schema.md`，在当前输出目录写入 `requirements.json` 与 `schema.json`。
3. 基于 `schema.json` 生成图片请求。运行本 Skill 的脚本，并把输出目录作为第一个参数：

   ```bash
   node --experimental-strip-types "$SKILL_DIR/scripts/generate-images.ts" "$OUTPUT_DIR"
   ```

   该脚本只写入 `image-requests.json` 和带空 URL 槽位的 `assets-manifest.json`，不要在该脚本中直接调用图片服务。
4. 立即渲染可打开的页面框架预览。图片可以稍后生成，预览页必须先产出：

   ```bash
   node --experimental-strip-types "$SKILL_DIR/scripts/render-page.ts" "$OUTPUT_DIR"
   ```

   该步骤写入 `dist/shop-home-page.preview.html`、`dist/schema.json`、`dist/requirements.json` 和 `dist/assets-manifest.json`。图片 URL 为空时，页面使用正式组件的待生成态展示模块框架；但仍禁止 `example.invalid`、dry-run URL、本地文件路径或非 http(s) 假图地址。
5. 消费 `image-requests.json.items` 中每个 `status = "pending"` 的条目，生成真实图片资产并回写 CDN URL：

   ```bash
   node --experimental-strip-types "$SKILL_DIR/scripts/generate-image-assets.ts" "$OUTPUT_DIR"
   ```

   `generate-image-assets.ts` 必须负责整条图片工作流，而不是让操作者人工逐条补图：
   - 优先调用全局 `youzan-image`，并将每个条目的 `prompt`、`size`、`files` 原样传入，不要改写、截断或合并 prompt。
   - 当 `youzan-image` 缺失、超时、调用失败、返回 5xx / 504、返回空结果、没有可用 URL，或 URL 不是可直接访问的真实 http(s) 地址时，自动兜底到 Skill 内置 OpenAI 生图流程。
   - OpenAI 兜底生成后，必须通过 `youzan-oss` 上传，并把最终 CDN URL 写回 `assets-manifest.json`；静态包中不允许保留本地文件路径或临时文件引用。
   - 严禁依赖 OD daemon、旧资产队列、Codex `image_gen`、dry-run URL、`example.invalid`、空 URL 或任意占位图完成页面。
6. 图片生成完成后，重渲染最终静态页面，并启用严格图片校验：

   ```bash
   node --experimental-strip-types "$SKILL_DIR/scripts/render-page.ts" "$OUTPUT_DIR" --strict-images
   ```

7. 回复前必须校验。若只是先交付框架预览、图片仍在稍后生成，允许缺失图片；最终图片版必须不加该参数：

   ```bash
   node --experimental-strip-types "$SKILL_DIR/scripts/validate-output.ts" "$OUTPUT_DIR" --allow-missing-images
   node --experimental-strip-types "$SKILL_DIR/scripts/validate-output.ts" "$OUTPUT_DIR"
   ```

8. 最终只需简短回复完成状态和本地入口文件 `dist/shop-home-page.preview.html`。若图片尚未生成完成，明确说明当前是框架预览，后续运行 `generate-image-assets.ts` 后再用 `render-page.ts --strict-images` 刷新最终图片版。

`$SKILL_DIR` 指包含本 `SKILL.md` 的目录。`$OUTPUT_DIR` 指当前任务的输出目录，也就是 `requirements.json` 和 `schema.json` 所在目录。如果运行器已把脚本复制到输出目录，也可以使用 `scripts/<name>.ts`。

## 回答解析

按用户回答的中文标签理解内容，不依赖 UI 字段名：

- `店铺名称` -> `requirements.shop_name`
- `首页目标` -> `requirements.homepage_goal`
- `需要的模块` -> `requirements.module_specs` 和 `requirements.modules`
- 模块中文名映射：`顶部轮播` -> `top_slider`，`客户资产` -> `user_assets`，`活动轮播` -> `banner`，`商品展示` -> `goods`，`店铺细心` -> `shop_info`，`图片广告` -> `image_ad`
- `功能入口` -> `requirements.action_buttons.selected`
- `主推商品 / 服务` -> `requirements.product_focus`
- `其他内容要求` -> `requirements.other_requirements`
- `视觉来源` -> `requirements.visual.brand_reference_mode`
- `品牌调性 / 视觉要求` -> `requirements.visual.brand_notes`
- `参考图路径` -> `requirements.reference_images`
- `主色或禁忌` -> `requirements.style.primary_color` 和 `requirements.style.avoid`

当用户提到参考截图时，只把它们作为相关模块的本地参考图。整页截图只能借用与模块相关的构图、间距、信息密度、标题尺度、色彩层级和 icon 语言；不要复制底部导航、会员摘要条、系统状态栏或无关 UI。

## 默认值策略

- 用户未填写或写“默认”时，由模型自行决策默认值，不要继续追问。
- 行业未知但需求提到烘焙、面包、蛋糕、甜品等，默认 `烘焙`。
- 行业未知但需求提到咖啡、茶饮、奶茶、饮品等，默认 `咖啡茶饮`。
- 模块未指定时，默认至少使用 `top_slider` 和 `user_assets`；只有需求明确涉及品牌故事、门店介绍、营业信息时才加入 `shop_info`。
- `banner` 和 `goods` 默认可选，不要静默加成必选模块；只有用户要求或需求强烈暗示时再加入。
- 功能入口未填写时，根据场景自行选择，常见默认是 `到店自取`、`外卖点单`、`会员权益`、`优惠券`。
- 视觉方向未填写时，根据行业和商品自行选择；烘焙常用暖奶油 / 手绘 / 食欲感，咖啡茶饮常用清透自然 / 精品感 / 生活方式。
- 主色未填写时，按视觉方向生成调色，不要追问。
- 禁忌未填写时，默认避免廉价大促、密集券墙、复杂内边距、圆角图片壳和无关 UI。

## 输出契约

完成后必须有：

- `dist/shop-home-page.preview.html`
- `dist/schema.json`
- `dist/requirements.json`
- `dist/assets-manifest.json`

可选的本地参考图可以复制到 `dist/references/`。

## 核心规则

- 澄清只使用纯文本，不使用 OD 的交互式 UI 协议。
- 不使用 OD daemon、web、数据库、项目状态、聊天 UI 控件、旧资产队列或 daemon 资产接口。
- `shop-home-page.preview.html` 必须是可直接打开的自包含静态页面，不包含 OD 运行时、iframe、接口请求、localhost 地址或项目文件 URL。
- 预览页必须用 CSS 响应式适配：手机视口直接显示页面，PC / 宽屏视口显示手机壳包裹效果。
- 页面框架预览必须先生成；图片 URL 为空时展示正式组件的待生成态，不阻塞 `dist/shop-home-page.preview.html` 产出。
- 最终图片版必须使用 `assets-manifest.json` 中的真实 http(s) CDN 地址；优先来自 `youzan-image`，兜底时来自 Skill 内置 OpenAI 生图后再经 `youzan-oss` 上传。
- 视觉细节从用户回答、参考图、行业、店铺名、商品和首页目标推断。
- `banner` 和 `goods` 默认可选。
- 3 个 `user_assets` 入口默认布局是 `一行三个`。
- 只有用户明确说 `左一右二`、`一大两小`、`主次入口` 或等价表达时，才使用 `左一右二`。
- 只有入口数量超过 5 个，或用户明确要求热区 / 自由布局时，才使用 `hotzone`。
- 图片提示词默认要求直角边缘、零内边距；除非用户明确要求，不要生成圆角卡片壳或额外白边。
- 图片生成入口固定为 `generate-image-assets.ts`。它优先使用全局 `youzan-image`，必要时自动兜底到 Skill 内置 OpenAI 生图 + `youzan-oss` 上传；不要改回人工逐条调用。
- 严禁使用 OD daemon、Codex `image_gen`、dry-run URL、占位图或非 http(s) 资源冒充已完成图片；空 URL 只允许表示“图片稍后生成”的框架预览状态。
- `youzan-shop` 和 `youzan-item` 是未来可选集成，不要假设它们已存在。
