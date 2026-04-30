const MODULES = [
  "top_slider",
  "user_assets",
  "banner",
  "goods",
  "shop_info",
  "image_ad",
];

const DEFAULT_MODULES = [
  "top_slider",
  "user_assets",
  "shop_info",
];

const DEFAULT_ACTION_BUTTON_SELECTION = ["到店自取", "外卖点单"];
const REPEATABLE_MODULE_TYPES = new Set(["image_ad"]);
const BRAND_PROMPT_MODULES = new Set(["top_slider", "shop_info"]);

const MODULE_LABELS = {
  top_slider: "顶部主视觉轮播",
  user_assets: "客户资产功能入口",
  banner: "首页入口型 Banner",
  goods: "商品展示",
  shop_info: "品牌信息长图展示",
  image_ad: "参考图兜底广告块",
};

const RATIOS = {
  top_slider: "3:4",
  banner: "75:30",
  goods: "4:3",
  shop_info: "9:16",
  image_ad: "1:1",
};

const PROMPT_TYPES = {
  top_slider: "carousel_banner",
  banner: "banner",
  goods: "goods",
  shop_info: "shop_info",
  image_ad: "image_ad",
};

const STRUCTURES = {
  top_slider: "poster_hero",
  banner: "landscape_entry_banner",
  goods: "product_showcase",
  shop_info: "vertical_shop_story",
  image_ad: "reference_image_ad",
};

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasDisplayableBrand(brand) {
  if (!isRecord(brand)) return false;
  const logoPosition =
    typeof brand.logo_position === "string" ? brand.logo_position.trim() : "";
  return Boolean(
    (typeof brand.name === "string" && brand.name.trim()) ||
      (typeof brand.slogan === "string" && brand.slogan.trim()) ||
      (logoPosition && !/^(none|hidden|off)$/i.test(logoPosition)),
  );
}

function isAspectRatioString(value) {
  return typeof value === "string" && /^\d+:\d+$/.test(value.trim());
}

function normalizeAspectRatioHint(value, fallback = "1:1") {
  return isAspectRatioString(value) ? value.trim() : fallback;
}

function isHomepageModuleType(value) {
  return MODULES.includes(value);
}

function isRepeatableModuleType(value) {
  return REPEATABLE_MODULE_TYPES.has(value);
}

function assertHomepageModules(modules) {
  if (!Array.isArray(modules) || modules.length === 0) {
    throw new Error("modules 必须是非空数组。");
  }

  const seen = new Set();
  for (const moduleType of modules) {
    if (!isHomepageModuleType(moduleType)) {
      throw new Error(`不支持的模块: ${String(moduleType)}`);
    }
    if (!isRepeatableModuleType(moduleType) && seen.has(moduleType)) {
      throw new Error(`模块重复: ${moduleType}`);
    }
    seen.add(moduleType);
  }
}

function parseCsv(value) {
  if (typeof value !== "string" || !value.trim()) {
    return [];
  }

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parsePositiveInteger(value, fallback) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function uniqueStrings(values) {
  return [...new Set(values.filter((value) => typeof value === "string"))];
}

function normalizeActionButtons(value) {
  const selected = uniqueStrings(
    Array.isArray(value?.selected)
      ? value.selected.map((item) =>
          typeof item === "string" ? item.trim() : "",
        ).filter(Boolean)
      : Array.isArray(value)
        ? value.map((item) => (typeof item === "string" ? item.trim() : "")).filter(Boolean)
        : [],
  );
  const custom =
    typeof value?.custom === "string"
      ? value.custom.trim()
      : typeof value === "string"
        ? value.trim()
        : "";

  if (!selected.length && !custom) {
    return {
      selected: [...DEFAULT_ACTION_BUTTON_SELECTION],
      custom: "",
    };
  }

  return {
    selected,
    custom,
  };
}

function splitActionButtonCustom(value) {
  if (typeof value !== "string" || !value.trim()) {
    return [];
  }

  return uniqueStrings(
    value
      .split(/[、/,，\n]+/g)
      .map((item) => item.trim())
      .filter(Boolean),
  );
}

function actionButtonLabels(actionButtons) {
  const normalized = normalizeActionButtons(actionButtons);
  const labels = uniqueStrings([
    ...normalized.selected,
    ...splitActionButtonCustom(normalized.custom),
  ]);
  return labels.length > 0 ? labels : [...DEFAULT_ACTION_BUTTON_SELECTION];
}

function inferIndustry(prompt) {
  if (/咖啡|拿铁|espresso|latte|coffee/i.test(prompt)) return "咖啡";
  if (/烘焙|面包|蛋糕|甜品|dessert|bakery/i.test(prompt)) return "烘焙甜品";
  if (/服饰|女装|男装|穿搭|apparel|fashion/i.test(prompt)) return "服饰零售";
  if (/美妆|护肤|彩妆|beauty|skincare/i.test(prompt)) return "美妆护肤";
  if (/餐|饭|菜|茶|饮品|food|restaurant/i.test(prompt)) return "餐饮";
  return "";
}

function inferBrandName(prompt) {
  const parenthesized = prompt.match(
    /[（(]([A-Za-z0-9][A-Za-z0-9 ._-]{1,40})[）)]/,
  );
  if (parenthesized) return parenthesized[1].trim();

  const labeled = prompt.match(/(?:品牌名|品牌|店铺名|店名)[:：]\s*([^，。\n]+)/);
  if (labeled) return labeled[1].trim();

  return "";
}

function inferPrimaryColor(prompt) {
  const hex = prompt.match(/#[0-9a-fA-F]{6}/)?.[0];
  if (hex) return hex;
  if (/绿色|清新|fresh|green/i.test(prompt)) return "#38A169";
  if (/红色|热烈|red/i.test(prompt)) return "#D63C32";
  if (/黑金|高级黑|dark/i.test(prompt)) return "#1F1F1F";
  if (/蓝色|科技|blue|tech/i.test(prompt)) return "#2563EB";
  return "";
}

function inferTone(prompt) {
  const matches = [];
  if (/高品质|高端|精品|premium/i.test(prompt)) matches.push("高品质");
  if (/清新|绿色|fresh/i.test(prompt)) matches.push("清新");
  if (/温暖|治愈|warm/i.test(prompt)) matches.push("温暖");
  if (/科技|简洁|tech|minimal/i.test(prompt)) matches.push("简洁科技");
  return matches.join("、");
}

function moduleContentFor(type, prompt, context) {
  const style = context.style ?? {};
  const buttons = actionButtonLabels(context.action_buttons);
  switch (type) {
    case "top_slider":
      return `围绕${style.brand_name || "店铺品牌"}和核心商品生成完整主视觉海报，强调${style.tone || "品牌气质"}。`;
    case "user_assets":
      return `生成客户资产功能入口，优先覆盖${buttons.join("、")}等用户入口；按实际需求组织入口顺序和分组。`;
    case "banner":
      return /冲|送|优惠|活动|会员|充值|商城|预约/.test(prompt)
        ? "生成首页横向入口 Banner，承接用户提到的营销活动、会员充值、商城或预约入口。"
        : "生成首页横向入口 Banner，用于品牌专题、营销活动或服务入口导流。";
    case "goods":
      return "生成商品营销卡片，画面内必须包含购买行动点、商品卖点和短 CTA。";
    case "shop_info":
      return "生成品牌信息长图，优先表达品牌故事、原料理念、门店信息或首页收尾品牌页。";
    case "image_ad":
      return "承接参考页中暂时无法映射到既有模块的视觉块，保留参考图中的比例、构图关系和核心视觉元素。";
    default:
      return "";
  }
}

function normalizeHomepageModuleSpecs(value) {
  if (value === undefined) {
    return null;
  }

  if (!Array.isArray(value) || value.length === 0) {
    throw new Error("moduleSpecs 必须是非空数组。");
  }

  const seen = new Set();
  return value.map((spec, index) => {
    if (!spec || typeof spec !== "object" || !isHomepageModuleType(spec.type)) {
      throw new Error(`moduleSpecs[${index}].type 不合法。`);
    }

    if (!isRepeatableModuleType(spec.type) && seen.has(spec.type)) {
      throw new Error(`moduleSpecs 不允许重复模块: ${spec.type}`);
    }
    seen.add(spec.type);

    const itemCount =
      typeof spec.itemCount === "number" &&
      Number.isInteger(spec.itemCount) &&
      spec.itemCount > 0
        ? spec.itemCount
        : undefined;

    return {
      type: spec.type,
      content:
        typeof spec.content === "string" && spec.content.trim()
          ? spec.content.trim()
          : "",
      itemCount,
      aspectRatio:
        spec.type === "image_ad"
          ? normalizeAspectRatioHint(spec.aspectRatio, RATIOS.image_ad)
          : undefined,
    };
  });
}

function moduleSpecsFromLegacy(
  modules,
  moduleContent,
  prompt,
  context,
  counts,
) {
  const orderedModules =
    Array.isArray(modules) && modules.length > 0 ? modules : DEFAULT_MODULES;
  assertHomepageModules(orderedModules);

  return orderedModules.map((moduleType) => {
    const spec = {
      type: moduleType,
      content:
        typeof moduleContent?.[moduleType] === "string" &&
        moduleContent[moduleType].trim()
          ? moduleContent[moduleType].trim()
          : moduleContentFor(moduleType, prompt, context),
    };

    if (moduleType === "top_slider") {
      spec.itemCount = counts.sliderCount;
    } else if (moduleType === "goods") {
      spec.itemCount = counts.goodsCount;
    } else if (moduleType === "image_ad") {
      spec.aspectRatio = RATIOS.image_ad;
    }

    return spec;
  });
}

function completeModuleSpecs(specs, prompt, context, counts) {
  return specs.map((spec) => {
    const next = {
      type: spec.type,
      content:
        typeof spec.content === "string" && spec.content.trim()
          ? spec.content.trim()
          : moduleContentFor(spec.type, prompt, context),
    };

    if (spec.type === "top_slider") {
      next.itemCount = parsePositiveInteger(spec.itemCount, counts.sliderCount);
    } else if (spec.type === "goods") {
      next.itemCount = parsePositiveInteger(spec.itemCount, counts.goodsCount);
    } else if (spec.type === "image_ad") {
      next.aspectRatio = normalizeAspectRatioHint(
        spec.aspectRatio,
        RATIOS.image_ad,
      );
    }

    return next;
  });
}

function buildModuleContentFromSpecs(specs) {
  const content = {};
  for (const spec of specs) {
    if (typeof spec.content === "string" && spec.content.trim() && !(spec.type in content)) {
      content[spec.type] = spec.content.trim();
    }
  }
  return content;
}

function buildInitialHomepageRequirements(prompt, overrides = {}) {
  const counts = {
    sliderCount: parsePositiveInteger(overrides.sliderCount, 2),
    goodsCount: parsePositiveInteger(overrides.goodsCount, 3),
  };
  const style = {
    industry:
      typeof overrides.industry === "string" && overrides.industry.trim()
        ? overrides.industry.trim()
        : inferIndustry(prompt),
    brand_name:
      typeof overrides.brand_name === "string" && overrides.brand_name.trim()
        ? overrides.brand_name.trim()
        : inferBrandName(prompt),
    primary_color:
      typeof overrides.primary_color === "string" && overrides.primary_color.trim()
        ? overrides.primary_color.trim()
        : inferPrimaryColor(prompt),
    tone:
      typeof overrides.tone === "string" && overrides.tone.trim()
        ? overrides.tone.trim()
        : inferTone(prompt),
    avoid: Array.isArray(overrides.avoid)
      ? overrides.avoid.filter((item) => typeof item === "string")
      : [],
  };
  const actionButtons = normalizeActionButtons(overrides.action_buttons);
  const context = {
    style,
    action_buttons: actionButtons,
  };
  const normalizedSpecs =
    normalizeHomepageModuleSpecs(overrides.module_specs) ??
    moduleSpecsFromLegacy(
      overrides.modules,
      overrides.module_content,
      prompt,
      context,
      counts,
    );
  const module_specs = completeModuleSpecs(
    normalizedSpecs,
    prompt,
    context,
    counts,
  );

  return {
    status: overrides.status === "confirmed" ? "confirmed" : "needs_confirmation",
    source_prompt: prompt,
    module_specs,
    modules: moduleTypesFor(module_specs),
    module_content: buildModuleContentFromSpecs(module_specs),
    style,
    brand_logo:
      typeof overrides.brand_logo === "string" ? overrides.brand_logo.trim() : "",
    action_buttons: actionButtons,
    other_requirements:
      typeof overrides.other_requirements === "string"
        ? overrides.other_requirements.trim()
        : "",
    counts,
    confirmation_questions: [
      "确认 module_specs 的顺序、模块类型、内容目标和 image_ad 比例提示。",
      "确认 style 中的行业、品牌名、主色、风格和禁忌表达。",
      "确认无误后将 status 改为 confirmed，再进入 schema 生成。",
    ],
  };
}

function moduleTypesFor(specs) {
  return specs ? specs.map((spec) => spec.type) : DEFAULT_MODULES;
}

function getRequestedItemCount(specs, type, fallback) {
  const match = specs?.find(
    (spec) => spec.type === type && typeof spec.itemCount === "number",
  );
  return match?.itemCount ?? fallback;
}

function getRequestedAspectRatio(specs, type, fallback, occurrenceIndex = 0) {
  if (!specs) return fallback;
  const matches = specs.filter((spec) => spec.type === type);
  const target = matches[occurrenceIndex];
  return normalizeAspectRatioHint(target?.aspectRatio, fallback);
}

function buildPromptFromRequirements(requirements) {
  const style = requirements.style ?? {};
  const actionButtons = normalizeActionButtons(requirements.action_buttons);
  const specs = normalizeHomepageModuleSpecs(requirements.module_specs) ?? [];
  const lines = [
    requirements.source_prompt || "",
    "",
    "已确认风格:",
    `- 行业: ${style.industry || ""}`,
    `- 品牌名: ${style.brand_name || ""}`,
    `- 店铺 Logo: ${requirements.brand_logo || ""}`,
    `- 主色: ${style.primary_color || ""}`,
    `- 风格: ${style.tone || ""}`,
    `- 禁忌: ${Array.isArray(style.avoid) ? style.avoid.join("、") : ""}`,
    `- 功能按钮: ${Array.isArray(actionButtons.selected) ? actionButtons.selected.join("、") : ""}`,
    `- 按钮补充: ${actionButtons.custom || ""}`,
    `- 其他要求: ${requirements.other_requirements || ""}`,
    "",
    "已确认模块规格:",
    ...specs.map((spec, index) => {
      const suffix = [];
      if (typeof spec.itemCount === "number") suffix.push(`items=${spec.itemCount}`);
      if (spec.type === "image_ad" && spec.aspectRatio) {
        suffix.push(`ratio=${spec.aspectRatio}`);
      }
      const hint = suffix.length ? ` [${suffix.join(", ")}]` : "";
      return `- ${index + 1}. ${spec.type}${hint}: ${spec.content || ""}`;
    }),
  ];

  return lines.join("\n").trim();
}

function buildModuleSpecs(modules, moduleContent, sliderCount, goodsCount) {
  return moduleSpecsFromLegacy(
    modules,
    moduleContent,
    "",
    { style: {}, action_buttons: normalizeActionButtons(undefined) },
    { sliderCount, goodsCount },
  );
}

function expectedModulesFromRequirements(requirements) {
  if (!requirements) {
    return DEFAULT_MODULES;
  }

  const specs = normalizeHomepageModuleSpecs(requirements.module_specs);
  if (specs && specs.length > 0) {
    return moduleTypesFor(specs);
  }

  assertHomepageModules(requirements.modules);
  return requirements.modules;
}

function fail(errors, message) {
  errors.push(message);
}

function validateModuleOrder(schema, expectedModules, errors) {
  if (!Array.isArray(schema.modules)) {
    fail(errors, "schema.modules 必须是数组。");
    return [];
  }

  const actual = schema.modules.map((module) => module?.type);
  if (actual.length !== expectedModules.length) {
    fail(
      errors,
      `预期 ${expectedModules.length} 个模块，实际 ${actual.length} 个: ${actual.join(", ")}`,
    );
  }

  for (const [index, expected] of expectedModules.entries()) {
    if (actual[index] !== expected) {
      fail(
        errors,
        `第 ${index + 1} 个模块必须是 ${expected}，实际是 ${actual[index] || "缺失"}。`,
      );
    }
  }

  return actual.filter((value) => typeof value === "string");
}

function validateImagePromptSchema(module, item, index, errors) {
  const promptSchema = item.image_prompt_schema;
  const path = `${module.type}.data.items[${index}].image_prompt_schema`;

  if (!isRecord(promptSchema)) {
    fail(errors, `${path} 必须是对象。`);
    return;
  }

  if (promptSchema.type !== PROMPT_TYPES[module.type]) {
    fail(errors, `${path}.type 必须是 ${PROMPT_TYPES[module.type]}。`);
  }

  if (
    !BRAND_PROMPT_MODULES.has(module.type) &&
    hasDisplayableBrand(promptSchema.brand)
  ) {
    fail(errors, `${path}.brand 对 ${module.type} 不应包含店铺 Logo、品牌角标或店铺 slogan。`);
  }

  if (!isRecord(promptSchema.layout)) {
    fail(errors, `${path}.layout 必须是对象。`);
  } else {
    const expectedRatio =
      module.type === "image_ad"
        ? normalizeAspectRatioHint(item.aspect_ratio, RATIOS.image_ad)
        : RATIOS[module.type];
    if (promptSchema.layout.ratio !== expectedRatio) {
      fail(errors, `${path}.layout.ratio 必须是 ${expectedRatio}。`);
    }
    if (promptSchema.layout.structure !== STRUCTURES[module.type]) {
      fail(
        errors,
        `${path}.layout.structure 必须是 ${STRUCTURES[module.type]}。`,
      );
    }
  }

  if (!isRecord(promptSchema.promotion)) {
    fail(errors, `${path}.promotion 必须是对象。`);
  } else if (
    module.type === "goods" &&
    typeof promptSchema.promotion.cta !== "string"
  ) {
    fail(errors, `${path}.promotion.cta 对 goods 必须是非空字符串。`);
  } else if (module.type === "goods" && !promptSchema.promotion.cta.trim()) {
    fail(errors, `${path}.promotion.cta 对 goods 不能为空。`);
  }

  if (module.type === "top_slider") {
    if (promptSchema.promotion?.cta !== "") {
      fail(errors, `${path}.promotion.cta 对 top_slider 必须为空。`);
    }
    if (
      !Array.isArray(promptSchema.content?.tags) ||
      promptSchema.content.tags.length
    ) {
      fail(errors, `${path}.content.tags 对 top_slider 必须是 []。`);
    }
  }

  if (module.type === "banner") {
    const promotion = promptSchema.promotion ?? {};
    for (const key of ["price", "original_price", "discount", "badge", "cta"]) {
      if (promotion[key] !== "") {
        fail(errors, `${path}.promotion.${key} 对 banner 必须为空，活动横幅只保留轻量入口文案。`);
      }
    }
    if (
      !Array.isArray(promptSchema.content?.tags) ||
      promptSchema.content.tags.length
    ) {
      fail(errors, `${path}.content.tags 对 banner 必须是 []，不要生成标签胶囊或券墙信息。`);
    }
  }

  if (module.type === "shop_info") {
    const promotion = promptSchema.promotion ?? {};
    for (const key of ["price", "original_price", "discount", "badge", "cta"]) {
      if (promotion[key] !== "") {
        fail(errors, `${path}.promotion.${key} 对 shop_info 必须为空。`);
      }
    }
    if (
      !Array.isArray(promptSchema.content?.tags) ||
      promptSchema.content.tags.length
    ) {
      fail(errors, `${path}.content.tags 对 shop_info 必须是 []。`);
    }
  }
}

function validateImageModule(module, errors) {
  if (!isRecord(module.data)) {
    fail(errors, `${module.type}.data 必须是对象。`);
    return;
  }

  if (!Array.isArray(module.data.items) || !module.data.items.length) {
    fail(errors, `${module.type}.data.items 必须是非空数组。`);
    return;
  }

  if (module.type === "banner") {
    if (module.data.mode !== "single") {
      fail(errors, "banner.data.mode 必须是 single。");
    }
    if (module.data.items.length !== 1) {
      fail(errors, "banner.data.items 必须正好包含 1 项。");
    }
  }

  for (const [index, item] of module.data.items.entries()) {
    if (!isRecord(item)) {
      fail(errors, `${module.type}.data.items[${index}] 必须是对象。`);
      continue;
    }

    const expectedRatio =
      module.type === "image_ad"
        ? normalizeAspectRatioHint(item.aspect_ratio, RATIOS.image_ad)
        : RATIOS[module.type];
    if (
      module.type === "image_ad"
        ? !isAspectRatioString(item.aspect_ratio)
        : item.aspect_ratio !== expectedRatio
    ) {
      fail(
        errors,
        `${module.type}.data.items[${index}].aspect_ratio 必须是 ${expectedRatio}。`,
      );
    }

    if (module.type === "banner") {
      if (item.asset_type !== "png") {
        fail(errors, "banner.data.items[0].asset_type 必须是 png。");
      }
      if (
        typeof item.entry_purpose !== "string" ||
        !item.entry_purpose.trim()
      ) {
        fail(errors, "banner.data.items[0].entry_purpose 不能为空。");
      }
    }

    validateImagePromptSchema(module, item, index, errors);
  }
}

function validateUserAssets(module, errors) {
  const layout = module.data?.card_layout;
  if (!isRecord(layout)) {
    fail(errors, "user_assets.data.card_layout 必须是对象。");
    return;
  }

  const templateType = layout.template_type;
  const validTemplateType =
    templateType === "hotzone" ||
    templateType === 1 ||
    templateType === 2 ||
    templateType === 3 ||
    templateType === 5 ||
    templateType === 6 ||
    templateType === 7;
  if (!validTemplateType) {
    fail(errors, "user_assets.data.card_layout.template_type 必须是 1/2/3/5/6/7 或 hotzone。");
  }

  const slots = Array.isArray(layout.slots) ? layout.slots : [];
  if (slots.length < 1) {
    fail(errors, "user_assets.data.card_layout.slots 至少需要 1 项。");
    return;
  }

  const expectedSlotsByTemplateType = {
    7: ["single"],
    1: ["left", "right"],
    2: ["left_large", "right_top", "right_bottom"],
    3: ["left_1", "center_1", "right_1"],
    6: ["top_left", "top_right", "bottom_left", "bottom_right"],
    5: ["top_left", "top_right", "bottom_left", "bottom_center", "bottom_right"],
  };
  if (templateType !== "hotzone") {
    const expected = expectedSlotsByTemplateType[templateType];
    if (!expected || slots.length !== expected.length) {
      fail(errors, "user_assets.data.card_layout.slots 数量与 template_type 不匹配。");
    } else {
      expected.forEach((slotId, index) => {
        const slot = slots[index];
        if (!isRecord(slot) || slot.id !== slotId || slot.position !== slotId) {
          fail(errors, `user_assets.data.card_layout.slots[${index}] 必须是 ${slotId}。`);
        }
      });
    }
  } else {
    slots.forEach((slot, index) => {
      const expectedId = `slot_${index + 1}`;
      if (!isRecord(slot) || slot.id !== expectedId || slot.position !== expectedId) {
        fail(errors, "user_assets 热区布局必须使用 slot_1...slot_n 的连续槽位。");
      }
    });
  }

  const entries = Array.isArray(module.data?.entries) ? module.data.entries : [];
  if (entries.length !== slots.length) {
    fail(errors, "user_assets.data.entries 数量必须与 card_layout.slots 完全一致。");
    return;
  }

  const slotIds = new Set(slots.map((slot) => (isRecord(slot) ? slot.id : "")));
  for (const entry of entries) {
    if (!isRecord(entry) || typeof entry.id !== "string" || !entry.id.trim()) {
      fail(errors, "user_assets.data.entries 每项都需要 id。");
      continue;
    }
    if (
      typeof entry.slot_id !== "string" ||
      !entry.slot_id.trim() ||
      !slotIds.has(entry.slot_id)
    ) {
      fail(errors, `user_assets.data.entries.${entry.id} 必须引用 card_layout 中存在的 slot_id。`);
    }
    if (typeof entry.title !== "string" || !entry.title.trim()) {
      fail(errors, `user_assets.data.entries.${entry.id} 必须包含 title。`);
    }
    if (typeof entry.subtitle !== "string") {
      fail(errors, `user_assets.data.entries.${entry.id} 必须包含 subtitle 字符串。`);
    }
    if (typeof entry.icon !== "string" || !entry.icon.trim()) {
      fail(errors, `user_assets.data.entries.${entry.id} 必须包含 icon。`);
    }
    if (!isRecord(entry.image_prompt_schema)) {
      fail(errors, `user_assets.data.entries.${entry.id}.image_prompt_schema 必须是对象。`);
    }
  }
}

function validateHomepageSchema(schema, requirements) {
  const errors = [];
  const expectedModules = expectedModulesFromRequirements(requirements);

  if (!isRecord(schema)) {
    return {
      isValid: false,
      errors: ["schema 必须是对象。"],
      expectedModules,
      actualModules: [],
    };
  }

  if (schema.version !== "1.0.0") {
    fail(errors, 'schema.version 必须是 "1.0.0"。');
  }
  if (schema.layout_mode !== "overlay") {
    fail(errors, 'schema.layout_mode 必须是 "overlay"。');
  }
  if (schema.design_context?.page_width !== 375) {
    fail(errors, "schema.design_context.page_width 必须是 375。");
  }

  const actualModules = validateModuleOrder(schema, expectedModules, errors);

  for (const pageModule of Array.isArray(schema.modules) ? schema.modules : []) {
    if (!MODULES.includes(pageModule?.type)) {
      fail(errors, `不支持的模块类型: ${String(pageModule?.type)}`);
      continue;
    }

    if (pageModule.type === "user_assets") {
      validateUserAssets(pageModule, errors);
    } else {
      validateImageModule(pageModule, errors);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    expectedModules,
    actualModules,
  };
}

function assertHomepageSchemaValid(schema, requirements) {
  const report = validateHomepageSchema(schema, requirements);
  if (!report.isValid) {
    throw new Error(report.errors.join("\n"));
  }

  return report;
}

export {
  DEFAULT_MODULES,
  MODULES,
  MODULE_LABELS,
  PROMPT_TYPES,
  RATIOS,
  STRUCTURES,
  assertHomepageModules,
  assertHomepageSchemaValid,
  buildInitialHomepageRequirements,
  buildModuleSpecs,
  buildPromptFromRequirements,
  expectedModulesFromRequirements,
  getRequestedAspectRatio,
  getRequestedItemCount,
  isHomepageModuleType,
  normalizeHomepageModuleSpecs,
  parseCsv,
  parsePositiveInteger,
  validateHomepageSchema,
  moduleTypesFor,
};
