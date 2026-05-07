export type QuestionType =
  | 'radio'
  | 'checkbox'
  | 'select'
  | 'text'
  | 'textarea'
  | 'direction-cards'
  | 'reference-images';

export interface DirectionCard {
  id: string;
  label: string;
  mood: string;
  references: string[];
  palette: string[];
  displayFont: string;
  bodyFont: string;
}

export interface FormQuestion {
  id: string;
  label: string;
  type: QuestionType;
  options?: string[];
  placeholder?: string;
  required?: boolean;
  help?: string;
  defaultValue?: string | string[];
  maxSelections?: number;
  cards?: DirectionCard[];
}

export interface QuestionForm {
  id: string;
  title: string;
  description?: string;
  questions: FormQuestion[];
  submitLabel?: string;
}

export type FormSegment =
  | { kind: 'text'; text: string }
  | { kind: 'form'; form: QuestionForm; raw: string };

const OPEN_RE = /<question-form\b([^>]*)>/i;
const CLOSE_TAG = '</question-form>';

export function splitOnQuestionForms(input: string): FormSegment[] {
  const out: FormSegment[] = [];
  let cursor = 0;
  while (cursor < input.length) {
    const slice = input.slice(cursor);
    const m = OPEN_RE.exec(slice);
    if (!m) {
      out.push({ kind: 'text', text: slice });
      break;
    }
    const openStart = cursor + m.index;
    const openEnd = openStart + m[0].length;
    const closeIdx = input.indexOf(CLOSE_TAG, openEnd);
    if (closeIdx === -1) {
      out.push({ kind: 'text', text: slice });
      break;
    }
    if (openStart > cursor) {
      out.push({ kind: 'text', text: input.slice(cursor, openStart) });
    }
    const body = input.slice(openEnd, closeIdx);
    const attrs = parseAttrs(m[1] ?? '');
    const form = tryParseForm(body, attrs);
    if (form) {
      out.push({ kind: 'form', form, raw: input.slice(openStart, closeIdx + CLOSE_TAG.length) });
    } else {
      out.push({ kind: 'text', text: input.slice(openStart, closeIdx + CLOSE_TAG.length) });
    }
    cursor = closeIdx + CLOSE_TAG.length;
  }
  return out;
}

function parseAttrs(raw: string): Record<string, string> {
  const re = /(\w+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
  const out: Record<string, string> = {};
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw)) !== null) {
    out[m[1] as string] = (m[2] ?? m[3] ?? '') as string;
  }
  return out;
}

function tryParseForm(body: string, attrs: Record<string, string>): QuestionForm | null {
  const trimmed = body.trim();
  if (!trimmed) return null;
  const stripped = trimmed
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();
  let data: unknown;
  try {
    data = JSON.parse(stripped);
  } catch {
    return null;
  }
  if (!data || typeof data !== 'object') return null;
  const obj = data as Record<string, unknown>;
  const rawQuestions = Array.isArray(obj.questions) ? obj.questions : null;
  if (!rawQuestions) return null;
  const questions: FormQuestion[] = [];
  rawQuestions.forEach((q, i) => {
    if (!q || typeof q !== 'object') return;
    const qo = q as Record<string, unknown>;
    const id =
      typeof qo.id === 'string' && qo.id.trim().length > 0
        ? qo.id.trim()
        : `q${i + 1}`;
    const label = typeof qo.label === 'string' ? qo.label : id;
    const type = normalizeType(qo.type);
    const options = Array.isArray(qo.options)
      ? qo.options.filter((o): o is string => typeof o === 'string')
      : undefined;
    const placeholder = typeof qo.placeholder === 'string' ? qo.placeholder : undefined;
    const help = typeof qo.help === 'string' ? qo.help : undefined;
    const required = qo.required === true;
    const maxSelections =
      typeof qo.maxSelections === 'number' &&
      Number.isInteger(qo.maxSelections) &&
      qo.maxSelections > 0
        ? qo.maxSelections
        : undefined;
    const cards = parseDirectionCards(qo.cards);
    const defaultValue =
      typeof qo.defaultValue === 'string'
        ? qo.defaultValue
        : Array.isArray(qo.defaultValue)
          ? qo.defaultValue.filter((v): v is string => typeof v === 'string')
          : typeof qo.default === 'string'
            ? qo.default
            : undefined;
    questions.push({
      id,
      label,
      type,
      ...(options ? { options } : {}),
      ...(placeholder ? { placeholder } : {}),
      ...(help ? { help } : {}),
      ...(required ? { required } : {}),
      ...(defaultValue !== undefined ? { defaultValue } : {}),
      ...(maxSelections !== undefined && type === 'checkbox' ? { maxSelections } : {}),
      ...(cards ? { cards } : {}),
    });
  });
  if (questions.length === 0) return null;
  const id = attrs.id ?? (typeof obj.id === 'string' ? obj.id : 'discovery');
  const title =
    attrs.title ?? (typeof obj.title === 'string' ? obj.title : 'A few quick questions');
  const description = typeof obj.description === 'string' ? obj.description : undefined;
  const submitLabel = typeof obj.submitLabel === 'string' ? obj.submitLabel : undefined;
  return {
    id,
    title,
    questions,
    ...(description ? { description } : {}),
    ...(submitLabel ? { submitLabel } : {}),
  };
}

function normalizeType(raw: unknown): QuestionType {
  if (typeof raw !== 'string') return 'text';
  const lower = raw.toLowerCase().trim();
  if (lower === 'radio' || lower === 'single' || lower === 'choice') return 'radio';
  if (lower === 'checkbox' || lower === 'multi' || lower === 'multiple') return 'checkbox';
  if (lower === 'select' || lower === 'dropdown') return 'select';
  if (lower === 'textarea' || lower === 'long' || lower === 'paragraph') return 'textarea';
  if (
    lower === 'direction-cards' ||
    lower === 'directions' ||
    lower === 'cards' ||
    lower === 'direction'
  ) {
    return 'direction-cards';
  }
  if (lower === 'reference-images' || lower === 'reference_images') {
    return 'reference-images';
  }
  return 'text';
}

function parseDirectionCards(raw: unknown): DirectionCard[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const out: DirectionCard[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue;
    const e = entry as Record<string, unknown>;
    const id = typeof e.id === 'string' && e.id.trim().length > 0 ? e.id.trim() : null;
    const label = typeof e.label === 'string' ? e.label : null;
    if (id === null || label === null) continue;
    const mood = typeof e.mood === 'string' ? e.mood : '';
    const references = Array.isArray(e.references)
      ? e.references.filter((r): r is string => typeof r === 'string').slice(0, 6)
      : [];
    const palette = Array.isArray(e.palette)
      ? e.palette.filter((p): p is string => typeof p === 'string').slice(0, 8)
      : [];
    const displayFont = typeof e.displayFont === 'string' ? e.displayFont : 'Georgia, serif';
    const bodyFont =
      typeof e.bodyFont === 'string'
        ? e.bodyFont
        : '-apple-system, system-ui, sans-serif';
    out.push({ id, label, mood, references, palette, displayFont, bodyFont });
  }
  return out.length > 0 ? out : undefined;
}

export function buildInitialFormState(
  form: QuestionForm,
  submitted: Record<string, string | string[]> | undefined,
): Record<string, string | string[]> {
  const out: Record<string, string | string[]> = {};
  for (const q of form.questions) {
    if (submitted && submitted[q.id] !== undefined) {
      out[q.id] = submitted[q.id]!;
      continue;
    }
    if (q.defaultValue !== undefined) {
      out[q.id] = q.defaultValue;
      continue;
    }
    if (q.type === 'checkbox' || q.type === 'reference-images') {
      out[q.id] = [];
    } else {
      out[q.id] = '';
    }
  }
  return out;
}

export function formatFormAnswers(
  form: QuestionForm,
  answers: Record<string, string | string[]>,
): string {
  const lines: string[] = [];
  lines.push(`[form answers — ${form.id}]`);
  for (const q of form.questions) {
    const v = answers[q.id];
    let display: string;
    if (Array.isArray(v)) display = v.length > 0 ? v.join(', ') : '(skipped)';
    else if (typeof v === 'string') display = v.trim().length > 0 ? v.trim() : '(skipped)';
    else display = '(skipped)';
    lines.push(`- ${q.label}: ${display}`);
  }
  return lines.join('\n');
}

export function parseSubmittedAnswers(
  form: QuestionForm,
  userMessageContent: string,
): Record<string, string | string[]> | null {
  const lines = userMessageContent.split('\n').map((l) => l.trim());
  if (lines.length === 0) return null;
  const header = lines[0] ?? '';
  if (!/^\[form answers/i.test(header)) return null;
  const answers: Record<string, string | string[]> = {};
  const labelToId = new Map<string, string>();
  for (const q of form.questions) labelToId.set(q.label.toLowerCase(), q.id);
  for (let i = 1; i < lines.length; i += 1) {
    const line = lines[i] ?? '';
    const m = /^[-*]\s*([^:]+):\s*(.*)$/.exec(line);
    if (!m) continue;
    const labelKey = m[1]!.trim().toLowerCase();
    const value = m[2]!.trim();
    const id = labelToId.get(labelKey);
    if (!id) continue;
    const q = form.questions.find((x) => x.id === id);
    if (!q) continue;
    if (q.type === 'checkbox' || q.type === 'reference-images') {
      answers[id] = value
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0 && s.toLowerCase() !== '(skipped)');
    } else {
      answers[id] = value.toLowerCase() === '(skipped)' ? '' : value;
    }
  }
  return Object.keys(answers).length > 0 ? answers : null;
}

export function questionFormToMarkdown(form: QuestionForm): string {
  const lines: string[] = [];
  lines.push(`## ${form.title}`);
  if (form.description) {
    lines.push('');
    lines.push(form.description);
  }
  lines.push('');
  lines.push('请复制下面模板，按需编辑每一项后直接回复：');
  lines.push('');
  lines.push('```text');
  lines.push(`[form answers — ${form.id}]`);
  for (const question of form.questions) {
    const suffixes: string[] = [];
    if (question.required) suffixes.push('必填');
    if (question.type === 'checkbox') suffixes.push('可多选，逗号分隔');
    if (question.type === 'radio' || question.type === 'select' || question.type === 'direction-cards') {
      suffixes.push('单选');
    }
    const defaultValue = Array.isArray(question.defaultValue)
      ? question.defaultValue.join(', ')
      : question.defaultValue ?? '';
    lines.push(`- ${question.label}: ${defaultValue}`);
  }
  lines.push('```');

  const detailLines: string[] = [];
  for (const question of form.questions) {
    const suffixes: string[] = [];
    if (question.required) suffixes.push('必填');
    if (question.type === 'checkbox') suffixes.push('可多选，逗号分隔');
    if (question.type === 'radio' || question.type === 'select' || question.type === 'direction-cards') {
      suffixes.push('单选');
    }
    if (suffixes.length > 0) {
      detailLines.push(`- ${question.label} 要求: ${suffixes.join('；')}`);
    }
    if (question.options && question.options.length > 0) {
      detailLines.push(`- ${question.label} 选项: ${question.options.join(' / ')}`);
    }
    if (question.placeholder) {
      detailLines.push(`- ${question.label} 示例: ${question.placeholder}`);
    }
    if (question.help) {
      detailLines.push(`- ${question.label} 说明: ${question.help}`);
    }
  }
  if (detailLines.length > 0) {
    lines.push('');
    lines.push('字段说明：');
    lines.push(...detailLines);
  }
  return lines.join('\n');
}

export function extractFirstQuestionForm(input: string): QuestionForm | null {
  const segment = splitOnQuestionForms(input).find((item) => item.kind === 'form');
  return segment?.kind === 'form' ? segment.form : null;
}
