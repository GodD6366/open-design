# 需求契约

本 Skill 收集生成静态有赞店铺首页所需的信息。澄清只使用纯文本，不使用 OD 交互式 UI 标记。生成包保持独立，不依赖 OD daemon 或项目状态。

用户未填写、留空或写“默认”的内容，都由模型根据行业、店铺名称、首页目标、模块和上下文自行决策默认值，不要因为缺少可推断字段而反复追问。

## Essential Fields

Use these stable requirement fields in `requirements.json`:

```json
{
  "status": "confirmed",
  "source_prompt": "original user brief or merged confirmed answers",
  "industry": "烘焙 | 咖啡茶饮 | other user-provided industry",
  "shop_name": "string",
  "brand_logo": "string",
  "homepage_goal": "string",
  "modules": ["top_slider", "user_assets"],
  "module_specs": [
    { "type": "top_slider", "content": "string", "itemCount": 1 },
    { "type": "user_assets", "content": "string" },
    { "type": "image_ad", "content": "string", "aspectRatio": "3:4" }
  ],
  "module_content": {
    "top_slider": "string",
    "user_assets": "string"
  },
  "action_buttons": {
    "selected": ["到店自取", "外卖点单", "会员权益"],
    "custom": ""
  },
  "style": {
    "industry": "烘焙 | 咖啡茶饮 | other user-provided industry",
    "brand_name": "string",
    "tone": "string",
    "primary_color": "string",
    "avoid": ["string"],
    "visual_source": "已有品牌规范 / 参考图，请按品牌走 | 没有品牌规范，请给我一个方向",
    "tone_palette": "tone-warm-cream | tone-fresh-natural | tone-bright-pop | tone-premium-dark | tone-soft-lifestyle"
  },
  "visual": {
    "brand_reference_mode": "string",
    "brand_notes": "string",
    "template_style_notes": "string",
    "tone_palette": "string",
    "accent_override": "string"
  },
  "product_focus": "string",
  "reference_images": ["relative/local/path.png"],
  "other_requirements": "string",
  "extended_answers": [
    { "id": "module_analysis", "label": "参考图模块分析", "type": "textarea", "answer": "string" },
    { "id": "ext_campaign_focus", "label": "本次重点想推什么", "type": "text", "answer": "string" }
  ],
  "counts": {
    "sliderCount": 1,
    "goodsCount": 2
  }
}
```

## 纯文本需求澄清

如果需要澄清，直接用普通文本询问这些问题：

- 店铺名称
- 首页目标
- 需要的模块
- 功能入口
- 主推商品 / 服务
- 其他内容要求

首轮澄清必须包含实际问题文本。不要只说问题已经发出。

只有当扩展问题会实质影响 schema、文案或图片提示词时，才额外增加 0-3 个问题。答案写入 `extended_answers`。

When usable opening reference images exist, insert a conditional `module_analysis`
textarea immediately after `modules`. It is an editable ordered module analysis:

- Parse it back into ordered `module_specs`.
- Preserve repeated `image_ad` blocks.
- Preserve ratio hints such as `[ratio=3:4]`.
- Also keep the raw answer under `extended_answers`.
- Do not use screenshots to infer off-screen modules.

## 纯文本视觉澄清

如果视觉方向缺失，直接用普通文本询问这些问题：

- 视觉来源：已有品牌规范 / 参考图，还是没有品牌规范、由我给方向
- 品牌调性 / 视觉要求
- 参考图路径（可选）
- 主色或禁忌（可选）

视觉答案不是单独输出文件。将其写入 `requirements.json.visual`，把用户提交的本地图片路径同步到 `requirements.json.reference_images`，并用于驱动 `schema.json.theme`、文案调性和各模块图片提示词 / 参考文件。

色调默认值：

- `tone-warm-cream`: warm cream paper, white surfaces, toast-orange accent.
- `tone-fresh-natural`: pale green neutrals, clean white modules, airy natural
  rhythm.
- `tone-bright-pop`: pale warm base, coral-orange accent, energetic new-arrival
  campaign feel.
- `tone-premium-dark`: charcoal surfaces, warm gold-brown accent, boutique
  premium feel.
- `tone-soft-lifestyle`: warm off-white, clay accent, soft editorial retail
  rhythm.

如果 `brand_reference_mode` 表示用户有品牌规范或模板参考，则 `reference_images`、`brand_notes`、`template_style_notes` 优先于色调预设。没有品牌参考时，`tone_palette` 作为确定性视觉默认值。

## 字段映射

- `shop_name` maps to top-level `shop_name`; also write the same value to
  `style.brand_name` so the OD prompt/schema helper can use it deterministically.
- `brand_logo` maps to `brand_logo`; do not force it into every image prompt.
- `industry` maps to top-level `industry`; also write the same value to
  `style.industry` so category, tone preset selection, and prompt schemas stay
  aligned with OD.
- `homepage_goal` maps to top-level `homepage_goal` and `schema.page.goal`.
- Module labels from clarification map to schema types: `顶部轮播` -> `top_slider`,
  `客户资产` -> `user_assets`, `活动轮播` -> `banner`, `商品展示` -> `goods`,
  `店铺细心` -> `shop_info`, `图片广告` -> `image_ad`.
- `modules` is an inclusion filter over the fixed order
  `top_slider -> user_assets -> banner -> goods -> shop_info -> image_ad`.
- `action_buttons` maps to `action_buttons.selected` in the submitted order.
- `action_buttons_custom` maps to `action_buttons.custom`.
- `product_focus` maps to product/module copy and relevant image prompts.
- `other_requirements` maps to the top-level field and prompt constraints.
- Non-fixed requirement questions and `module_analysis` are stored in
  `extended_answers` as an array of `{ id, label, type, answer }`.

## 默认值

- 用户未填写或写“默认”时，由模型自行决策默认值，不要继续追问。
- 行业未知但需求提到 bakery、pastry、bread、cake、dessert、烘焙、面包、蛋糕或甜品时，使用 `烘焙`。
- 行业未知但需求提到 coffee、tea、latte、咖啡、茶饮、奶茶或饮品时，使用 `咖啡茶饮`。
- 模块未指定时，默认使用 `top_slider` 和 `user_assets`；只有需求要求品牌故事、门店介绍、营业信息时才加入 `shop_info`。
- 不要加入 `banner` 或 `goods`，除非用户要求或需求明确暗示。
- 功能入口缺失时，根据店铺场景自行选择，常见默认是 `到店自取`、`外卖点单`、`会员权益`、`优惠券`。
- 如果确认了 3 个功能入口，默认使用 `一行三个`；只有明确要求主次入口、一大两小或左一右二时才使用非等分布局。
- 视觉方向缺失时，根据行业和商品自行选择；烘焙可偏暖奶油、食欲感、手绘；咖啡茶饮可偏清透自然、精品感、生活方式。
- 主色缺失时，按视觉方向生成调色；禁忌缺失时，默认避免廉价大促、密集券墙、复杂内边距、圆角图片壳和无关 UI。
- 使用 `counts.sliderCount = 1` 和 `counts.goodsCount = 2`，除非用户明确改数量。
- 图片提示词默认使用直角边缘和零内边距，除非用户明确要求圆角壳或内边距。
