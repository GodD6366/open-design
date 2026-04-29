import type { AssetTask, StorefrontState } from './types';

const DEFAULT_ACTION_BUTTON_SELECTION = ['到店自取', '外卖点单'];

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
  return {
    status: input?.status === 'confirmed' ? 'confirmed' : 'needs_confirmation',
    source_prompt: input?.source_prompt ?? '',
    modules: Array.isArray(input?.modules) ? input.modules : [],
    module_content: input?.module_content ?? {},
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

export async function generateStorefrontAssets(
  projectId: string,
  forceRegenerate = false,
): Promise<StorefrontState> {
  const resp = await fetch('/api/storefront/generate-assets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      projectId,
      forceRegenerate,
    }),
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
