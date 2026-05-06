import type {
  AssetTask,
  ShopHomePageModuleSpec,
  ShopHomePageModuleType,
  ShopHomePageState,
} from './types';

const DEFAULT_ACTION_BUTTON_SELECTION = ['到店自取', '外卖点单'];

function normalizeAspectRatio(value: unknown, fallback = '1:1'): string {
  return typeof value === 'string' && /^\d+:\d+$/.test(value.trim()) ? value.trim() : fallback;
}

function normalizeModuleSpecs(
  input: ShopHomePageState['requirements'] | undefined,
): ShopHomePageModuleSpec[] {
  if (Array.isArray(input?.module_specs) && input.module_specs.length > 0) {
    return input.module_specs
      .filter((spec): spec is ShopHomePageModuleSpec => Boolean(spec && typeof spec === 'object'))
      .map((spec) => ({
        type: spec.type,
        content: typeof spec.content === 'string' ? spec.content : '',
        itemCount: typeof spec.itemCount === 'number' ? spec.itemCount : undefined,
        aspectRatio:
          spec.type === 'image_ad'
            ? normalizeAspectRatio(spec.aspectRatio, '1:1')
            : undefined,
      }));
  }

  const modules = Array.isArray(input?.modules) ? input.modules : [];
  const moduleContent = input?.module_content ?? {};
  return modules.map((type) => ({
    type,
    content: typeof moduleContent[type] === 'string' ? moduleContent[type] : '',
    itemCount:
      type === 'top_slider'
        ? input?.counts?.sliderCount ?? 2
        : type === 'goods'
          ? input?.counts?.goodsCount ?? 3
          : undefined,
    aspectRatio: type === 'image_ad' ? '1:1' : undefined,
  }));
}

function deriveModules(specs: ShopHomePageModuleSpec[]): ShopHomePageModuleType[] {
  return specs.map((spec) => spec.type);
}

function deriveModuleContent(specs: ShopHomePageModuleSpec[]): Partial<Record<ShopHomePageModuleType, string>> {
  const content: Partial<Record<ShopHomePageModuleType, string>> = {};
  specs.forEach((spec) => {
    if (!(spec.type in content)) {
      content[spec.type] = spec.content;
    }
  });
  return content;
}

function normalizeActionButtons(input: ShopHomePageState['requirements']['action_buttons'] | undefined) {
  const selected = Array.isArray(input?.selected)
    ? [...new Set(input.selected.filter((value): value is string => typeof value === 'string'))]
    : [];
  const custom = typeof input?.custom === 'string' ? input.custom : '';
  if (selected.length === 0 && !custom.trim()) {
    return {
      selected: [...DEFAULT_ACTION_BUTTON_SELECTION],
      custom: '',
    };
  }
  return { selected, custom };
}

function normalizeShopHomePageRequirements(
  input: ShopHomePageState['requirements'] | undefined,
): ShopHomePageState['requirements'] {
  const module_specs = normalizeModuleSpecs(input);
  return {
    status: input?.status === 'confirmed' ? 'confirmed' : 'needs_confirmation',
    source_prompt: input?.source_prompt ?? '',
    module_specs,
    modules: deriveModules(module_specs),
    module_content: deriveModuleContent(module_specs),
    style: {
      industry: input?.style?.industry ?? '',
      brand_name: input?.style?.brand_name ?? '',
      primary_color: input?.style?.primary_color ?? '',
      tone: input?.style?.tone ?? '',
      avoid: Array.isArray(input?.style?.avoid) ? input.style.avoid : [],
    },
    brand_logo: input?.brand_logo ?? '',
    action_buttons: normalizeActionButtons(input?.action_buttons),
    other_requirements: input?.other_requirements ?? '',
    counts: {
      sliderCount: input?.counts?.sliderCount ?? 2,
      goodsCount: input?.counts?.goodsCount ?? 3,
    },
    confirmation_questions: Array.isArray(input?.confirmation_questions)
      ? input.confirmation_questions
      : [],
  };
}

function normalizeShopHomePageState(state: ShopHomePageState): ShopHomePageState {
  const baseStyleGuide = state?.styleGuide ?? {
    version: '1.0',
    preset_id: 'auto',
    reference_images: [],
    analysis: {
      source_summary: '',
      icon_style: '',
      background_style: '',
      layout_style: '',
      tone_keywords: [],
    },
    generation_rules: {
      must: [],
      avoid: [],
    },
  };
  return {
    ...state,
    requirements: normalizeShopHomePageRequirements(state?.requirements),
    requirementsText: state?.requirementsText ?? '',
    styleGuide: {
      ...baseStyleGuide,
    },
    styleGuideText: state?.styleGuideText ?? '',
    schemaText: state?.schemaText ?? '',
    logs: Array.isArray(state?.logs) ? state.logs : [],
    validationErrors: Array.isArray(state?.validationErrors) ? state.validationErrors : [],
    status: state?.status ?? 'idle',
  };
}

async function readError(resp: Response): Promise<string> {
  try {
    const json = await resp.json() as { error?: string };
    if (json?.error) return json.error;
  } catch {
    /* ignore */
  }
  try {
    const text = await resp.text();
    if (text) return text;
  } catch {
    /* ignore */
  }
  return `Request failed with ${resp.status}`;
}

async function jsonOrThrow<T>(resp: Response): Promise<T> {
  if (!resp.ok) {
    throw new Error(await readError(resp));
  }
  return await resp.json() as T;
}

export async function fetchShopHomePageState(projectId: string): Promise<ShopHomePageState> {
  const resp = await fetch(`/api/shop-home-page/state/${encodeURIComponent(projectId)}`);
  const json = await jsonOrThrow<{ state: ShopHomePageState }>(resp);
  return normalizeShopHomePageState(json.state);
}

export async function applyShopHomePageSchema(
  projectId: string,
  schemaText: string,
): Promise<ShopHomePageState> {
  const resp = await fetch('/api/shop-home-page/apply-schema', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ projectId, schemaText }),
  });
  const json = await jsonOrThrow<{ state: ShopHomePageState }>(resp);
  return normalizeShopHomePageState(json.state);
}

export async function enqueueShopHomePageAssets(
  projectId: string,
  forceRegenerate = false,
): Promise<{ tasks: AssetTask[]; state: ShopHomePageState }> {
  const resp = await fetch('/api/shop-home-page/generate-assets/enqueue', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      projectId,
      forceRegenerate,
    }),
  });
  const json = await jsonOrThrow<{ tasks: AssetTask[]; state: ShopHomePageState }>(resp);
  return { tasks: json.tasks, state: normalizeShopHomePageState(json.state) };
}

export async function fetchShopHomePageAssetTasks(
  projectId: string,
): Promise<AssetTask[]> {
  const resp = await fetch(`/api/shop-home-page/generate-tasks/${encodeURIComponent(projectId)}`);
  const json = await jsonOrThrow<{ tasks: AssetTask[] }>(resp);
  return json.tasks;
}
