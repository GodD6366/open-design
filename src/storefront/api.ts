import type {
  AssetTask,
  StorefrontModuleSpec,
  StorefrontModuleType,
  StorefrontState,
} from './types';

const DEFAULT_ACTION_BUTTON_SELECTION = ['到店自取', '外卖点单'];

function normalizeAspectRatio(value: unknown, fallback = '1:1'): string {
  return typeof value === 'string' && /^\d+:\d+$/.test(value.trim()) ? value.trim() : fallback;
}

function normalizeModuleSpecs(
  input: StorefrontState['requirements'] | undefined,
): StorefrontModuleSpec[] {
  if (Array.isArray(input?.module_specs) && input.module_specs.length > 0) {
    return input.module_specs
      .filter((spec): spec is StorefrontModuleSpec => Boolean(spec && typeof spec === 'object'))
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

function deriveModules(specs: StorefrontModuleSpec[]): StorefrontModuleType[] {
  return specs.map((spec) => spec.type);
}

function deriveModuleContent(specs: StorefrontModuleSpec[]): Partial<Record<StorefrontModuleType, string>> {
  const content: Partial<Record<StorefrontModuleType, string>> = {};
  specs.forEach((spec) => {
    if (!(spec.type in content)) {
      content[spec.type] = spec.content;
    }
  });
  return content;
}

function normalizeActionButtons(input: StorefrontState['requirements']['action_buttons'] | undefined) {
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

function normalizeStorefrontRequirements(
  input: StorefrontState['requirements'] | undefined,
): StorefrontState['requirements'] {
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

function normalizeStorefrontState(state: StorefrontState): StorefrontState {
  return {
    ...state,
    requirements: normalizeStorefrontRequirements(state?.requirements),
    requirementsText: state?.requirementsText ?? '',
    styleGuide: state?.styleGuide ?? {
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

export async function fetchStorefrontState(projectId: string): Promise<StorefrontState> {
  const resp = await fetch(`/api/storefront/state/${encodeURIComponent(projectId)}`);
  const json = await jsonOrThrow<{ state: StorefrontState }>(resp);
  return normalizeStorefrontState(json.state);
}

export async function applyStorefrontSchema(
  projectId: string,
  schemaText: string,
): Promise<StorefrontState> {
  const resp = await fetch('/api/storefront/apply-schema', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ projectId, schemaText }),
  });
  const json = await jsonOrThrow<{ state: StorefrontState }>(resp);
  return normalizeStorefrontState(json.state);
}

export async function enqueueStorefrontAssets(
  projectId: string,
  forceRegenerate = false,
): Promise<{ tasks: AssetTask[]; state: StorefrontState }> {
  const resp = await fetch('/api/storefront/generate-assets/enqueue', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      projectId,
      forceRegenerate,
    }),
  });
  const json = await jsonOrThrow<{ tasks: AssetTask[]; state: StorefrontState }>(resp);
  return { tasks: json.tasks, state: normalizeStorefrontState(json.state) };
}

export async function fetchStorefrontAssetTasks(
  projectId: string,
): Promise<AssetTask[]> {
  const resp = await fetch(`/api/storefront/generate-tasks/${encodeURIComponent(projectId)}`);
  const json = await jsonOrThrow<{ tasks: AssetTask[] }>(resp);
  return json.tasks;
}
