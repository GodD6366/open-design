import type {
  ShopHomePageComposerDraftItem,
  ShopHomePageModuleSpec,
  ShopHomePageSchema,
  ShopHomePageSchemaModule,
  ShopHomePageState,
} from './types';

export function storefrontModuleLabel(moduleType: string): string {
  switch (moduleType) {
    case 'top_slider':
      return '头图轮播';
    case 'user_assets':
      return '会员资产区';
    case 'banner':
      return '活动横幅';
    case 'goods':
      return '商品模块';
    case 'shop_info':
      return '门店信息';
    case 'image_ad':
      return '参考广告块';
    default:
      return '未命名模块';
  }
}

export function buildComposerDraft(
  state: ShopHomePageState | null,
): { items: ShopHomePageComposerDraftItem[]; disabledReason: string | null } {
  const schema = state?.schema;
  const specs = state?.requirements?.module_specs ?? [];
  if (!schema) {
    return { items: [], disabledReason: '当前还没有可编排的页面结构，请先生成并应用结构。' };
  }
  if (!Array.isArray(schema.modules) || schema.modules.length === 0) {
    return { items: [], disabledReason: '当前结构没有模块，请先用高级模式修复 JSON。' };
  }
  if (!Array.isArray(specs) || specs.length === 0) {
    return { items: [], disabledReason: '当前需求结构缺少模块规格，请先用高级模式修复 JSON。' };
  }
  if (schema.modules.length !== specs.length) {
    return { items: [], disabledReason: '当前结构与需求模块数量不一致，请先用高级模式修复 JSON。' };
  }

  const counts = new Map<string, number>();
  const items: ShopHomePageComposerDraftItem[] = [];
  for (let index = 0; index < specs.length; index += 1) {
    const spec = specs[index];
    const schemaModule = schema.modules[index];
    if (!spec || !schemaModule || spec.type !== schemaModule.type) {
      return { items: [], disabledReason: '当前结构与需求模块顺序不一致，请先用高级模式修复 JSON。' };
    }
    const nextOccurrence = (counts.get(spec.type) ?? 0) + 1;
    counts.set(spec.type, nextOccurrence);
    items.push({
      key: `${schemaModule.id || spec.type}-${index}`,
      index,
      moduleType: spec.type,
      label: storefrontModuleLabel(spec.type),
      occurrence: nextOccurrence,
      spec,
      schemaModule,
    });
  }

  return { items: normalizeComposerDraft(items), disabledReason: null };
}

export function moveComposerItem<T>(items: T[], index: number, direction: -1 | 1): T[] {
  const nextIndex = index + direction;
  if (index < 0 || index >= items.length || nextIndex < 0 || nextIndex >= items.length) {
    return items;
  }
  const next = [...items];
  const [picked] = next.splice(index, 1);
  next.splice(nextIndex, 0, picked as T);
  return next;
}

export function removeComposerItem<T>(items: T[], index: number): T[] {
  if (items.length <= 1 || index < 0 || index >= items.length) {
    return items;
  }
  return items.filter((_, itemIndex) => itemIndex !== index);
}

export function composeSchemaText(
  schema: ShopHomePageSchema,
  modules: ShopHomePageSchemaModule[],
): string {
  return `${JSON.stringify({ ...schema, modules }, null, 2)}\n`;
}

export function composeRequirementsSummary(specs: ShopHomePageModuleSpec[]): string {
  return specs.map((spec) => storefrontModuleLabel(spec.type)).join(' → ');
}

export function normalizeComposerDraft(
  items: ShopHomePageComposerDraftItem[],
): ShopHomePageComposerDraftItem[] {
  const counts = new Map<string, number>();
  return items.map((item, index) => {
    const nextOccurrence = (counts.get(item.moduleType) ?? 0) + 1;
    counts.set(item.moduleType, nextOccurrence);
    return {
      ...item,
      index,
      occurrence: nextOccurrence,
    };
  });
}
