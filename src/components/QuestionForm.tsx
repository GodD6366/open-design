import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useT } from '../i18n';
import type { DirectionCard, QuestionForm } from '../artifacts/question-form';
import { formatFormAnswers } from '../artifacts/question-form';
import {
  importProjectImageUrl,
  projectRawUrl,
  uploadProjectFile,
} from '../providers/registry';
import type { ChatAttachment, ProjectFile } from '../types';

interface Props {
  form: QuestionForm;
  // Whether the user can still submit answers. The owning AssistantMessage
  // disables the form when the assistant turn is no longer the most recent
  // one (i.e. the user has already moved past it).
  interactive: boolean;
  // Pre-existing answers — when we detect a follow-up user message that
  // begins with "[form answers — <id>]", we parse it back out and pass it
  // here so the rendered form reflects what was sent.
  submittedAnswers?: Record<string, string | string[]>;
  onSubmit?: (text: string, attachments: ChatAttachment[]) => void;
  projectId?: string | null;
  projectFiles?: ProjectFile[];
  onRefreshProjectFiles?: () => Promise<void> | void;
  onEnsureProject?: () => Promise<string | null>;
}

export function QuestionFormView({
  form,
  interactive,
  submittedAnswers,
  onSubmit,
  projectId,
  projectFiles,
  onRefreshProjectFiles,
  onEnsureProject,
}: Props) {
  const t = useT();
  const initial = useMemo(() => buildInitialState(form, submittedAnswers), [form, submittedAnswers]);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>(initial);
  const [pendingFields, setPendingFields] = useState<Record<string, boolean>>({});
  const locked = !interactive || !onSubmit || submittedAnswers !== undefined;
  const handleFieldBusyChange = useCallback((fieldId: string, busy: boolean) => {
    setPendingFields((prev) => {
      const isPending = Boolean(prev[fieldId]);
      if (busy) {
        if (isPending) return prev;
        return { ...prev, [fieldId]: true };
      }
      if (!isPending) return prev;
      const next = { ...prev };
      delete next[fieldId];
      return next;
    });
  }, []);

  function update(id: string, value: string | string[]) {
    if (locked) return;
    setAnswers((prev) => ({ ...prev, [id]: value }));
  }

  function toggleCheckbox(id: string, option: string) {
    setAnswers((prev) => {
      const current = Array.isArray(prev[id]) ? (prev[id] as string[]) : [];
      const has = current.includes(option);
      const next = has ? current.filter((v) => v !== option) : [...current, option];
      return { ...prev, [id]: next };
    });
  }

  function missingRequired(): string | null {
    for (const q of form.questions) {
      if (!q.required) continue;
      const v = answers[q.id];
      if (Array.isArray(v) ? v.length === 0 : !(typeof v === 'string' && v.trim().length > 0)) {
        return q.label;
      }
    }
    return null;
  }

  function handleSubmit() {
    if (locked || !onSubmit) return;
    if (hasPending) return;
    const missing = missingRequired();
    if (missing) {
      // Soft inline guard — surface via aria but don't alert; the disabled
      // state of the submit button covers most cases.
      return;
    }
    onSubmit(formatFormAnswers(form, answers), buildReferenceImageAttachments(form, answers));
  }

  const required = form.questions.filter((q) => q.required);
  const ready = required.every((q) => {
    const v = answers[q.id];
    return Array.isArray(v) ? v.length > 0 : typeof v === 'string' && v.trim().length > 0;
  });
  const hasPending = Object.values(pendingFields).some(Boolean);

  return (
    <div className={`question-form${locked ? ' question-form-locked' : ''}`}>
      <div className="question-form-head">
        <span className="question-form-icon" aria-hidden>?</span>
        <div className="question-form-titles">
          <div className="question-form-title">{form.title}</div>
          {form.description ? (
            <div className="question-form-desc">{form.description}</div>
          ) : null}
        </div>
        {locked ? <span className="question-form-pill">{t('qf.answered')}</span> : null}
      </div>
      <div className="question-form-body">
        {form.questions.map((q) => {
          const value = answers[q.id];
          return (
            <div key={q.id} className="qf-field">
              <label className="qf-label">
                <span>{q.label}</span>
                {q.required ? (
                  <span className="qf-required" aria-label={t('qf.required')}>*</span>
                ) : null}
              </label>
              {q.help ? <div className="qf-help">{q.help}</div> : null}
              {q.type === 'radio' && q.options ? (
                <div className="qf-options">
                  {q.options.map((opt) => (
                    <label key={opt} className={`qf-chip${value === opt ? ' qf-chip-on' : ''}`}>
                      <input
                        type="radio"
                        name={`${form.id}-${q.id}`}
                        value={opt}
                        checked={value === opt}
                        disabled={locked}
                        onChange={() => update(q.id, opt)}
                      />
                      <span>{opt}</span>
                    </label>
                  ))}
                </div>
              ) : null}
              {q.type === 'checkbox' && q.options ? (
                <div className="qf-options">
                  {q.options.map((opt) => {
                    const arr = Array.isArray(value) ? value : [];
                    const on = arr.includes(opt);
                    return (
                      <label key={opt} className={`qf-chip${on ? ' qf-chip-on' : ''}`}>
                        <input
                          type="checkbox"
                          value={opt}
                          checked={on}
                          disabled={locked}
                          onChange={() => toggleCheckbox(q.id, opt)}
                        />
                        <span>{opt}</span>
                      </label>
                    );
                  })}
                </div>
              ) : null}
              {q.type === 'select' && q.options ? (
                <select
                  className="qf-select"
                  value={typeof value === 'string' ? value : ''}
                  disabled={locked}
                  onChange={(e) => update(q.id, e.target.value)}
                >
                  <option value="" disabled>
                    {t('qf.choose')}
                  </option>
                  {q.options.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              ) : null}
              {q.type === 'text' ? (
                <input
                  type="text"
                  className="qf-input"
                  value={typeof value === 'string' ? value : ''}
                  placeholder={q.placeholder}
                  disabled={locked}
                  onChange={(e) => update(q.id, e.target.value)}
                />
              ) : null}
              {q.type === 'textarea' ? (
                <textarea
                  className="qf-textarea"
                  value={typeof value === 'string' ? value : ''}
                  placeholder={q.placeholder}
                  disabled={locked}
                  rows={3}
                  onChange={(e) => update(q.id, e.target.value)}
                />
              ) : null}
              {q.type === 'reference-images' ? (
                <ReferenceImagesField
                  fieldId={q.id}
                  value={Array.isArray(value) ? value : []}
                  disabled={locked}
                  placeholder={q.placeholder}
                  projectId={projectId}
                  projectFiles={projectFiles}
                  onRefreshProjectFiles={onRefreshProjectFiles}
                  onEnsureProject={onEnsureProject}
                  onBusyChange={handleFieldBusyChange}
                  onChange={(next) => update(q.id, next)}
                />
              ) : null}
              {q.type === 'direction-cards' && q.cards && q.cards.length > 0 ? (
                <div className="qf-direction-cards">
                  {q.cards.map((card) => (
                    <DirectionCardView
                      key={card.id}
                      card={card}
                      formId={form.id}
                      questionId={q.id}
                      selected={value === card.id || value === card.label}
                      disabled={locked}
                      onSelect={() => update(q.id, card.id)}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
      <div className="question-form-foot">
        {locked ? (
          <span className="qf-locked-note">
            {submittedAnswers ? t('qf.lockedSubmitted') : t('qf.lockedPrev')}
          </span>
        ) : (
          <span className="qf-hint">{t('qf.hint')}</span>
        )}
        {!locked ? (
          <button
            type="button"
            className="primary"
            onClick={handleSubmit}
            disabled={!ready || hasPending}
            title={
              hasPending
                ? t('qf.submitPendingTitle')
                : ready
                  ? t('qf.submitTitle')
                  : t('qf.submitDisabledTitle')
            }
          >
            {form.submitLabel ?? t('qf.submitDefault')}
          </button>
        ) : null}
      </div>
    </div>
  );
}

function ReferenceImagesField({
  fieldId,
  value,
  disabled,
  placeholder,
  projectId,
  projectFiles,
  onRefreshProjectFiles,
  onEnsureProject,
  onBusyChange,
  onChange,
}: {
  fieldId: string;
  value: string[];
  disabled: boolean;
  placeholder?: string;
  projectId?: string | null;
  projectFiles?: ProjectFile[];
  onRefreshProjectFiles?: () => Promise<void> | void;
  onEnsureProject?: () => Promise<string | null>;
  onBusyChange?: (fieldId: string, busy: boolean) => void;
  onChange: (next: string[]) => void;
}) {
  const t = useT();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [extraFiles, setExtraFiles] = useState<ProjectFile[]>([]);
  const [linkValue, setLinkValue] = useState('');
  const [uploading, setUploading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const availableImages = useMemo(() => {
    const merged = mergeProjectFiles(projectFiles ?? [], extraFiles);
    return merged
      .filter((file) => file.kind === 'image')
      .sort((a, b) => b.mtime - a.mtime);
  }, [extraFiles, projectFiles]);
  const busy = uploading || importing;

  useEffect(() => {
    onBusyChange?.(fieldId, busy);
    return () => {
      onBusyChange?.(fieldId, false);
    };
  }, [busy, fieldId, onBusyChange]);

  async function ensureProjectId(): Promise<string | null> {
    if (projectId) return projectId;
    if (onEnsureProject) return await onEnsureProject();
    return null;
  }

  async function handleFilePicked(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (files.length === 0 || disabled) return;
    setUploading(true);
    const ensuredProjectId = await ensureProjectId();
    if (!ensuredProjectId) {
      setUploading(false);
      setError(t('qf.refNeedProject'));
      return;
    }
    setError(null);
    try {
      const uploaded = (
        await Promise.all(files.map((file) => uploadProjectFile(ensuredProjectId, file)))
      ).filter((file): file is ProjectFile => file !== null);
      if (uploaded.length === 0) {
        setError(t('qf.refUploadFailed'));
        return;
      }
      setExtraFiles((current) => mergeProjectFiles(current, uploaded));
      onChange(uniqueStringList([...value, ...uploaded.map((file) => file.name)]));
      try {
        await onRefreshProjectFiles?.();
      } catch {
        /* ignore refresh failures; the local field already knows about the file */
      }
    } finally {
      setUploading(false);
    }
  }

  async function handleImportLink() {
    const raw = linkValue.trim();
    if (!raw || disabled) return;
    setImporting(true);
    const ensuredProjectId = await ensureProjectId();
    if (!ensuredProjectId) {
      setImporting(false);
      setError(t('qf.refNeedProject'));
      return;
    }
    setError(null);
    try {
      const imported = await importProjectImageUrl(ensuredProjectId, raw);
      setExtraFiles((current) => mergeProjectFiles(current, [imported]));
      onChange(uniqueStringList([...value, imported.name]));
      setLinkValue('');
      try {
        await onRefreshProjectFiles?.();
      } catch {
        /* ignore refresh failures; the local field already knows about the file */
      }
    } catch (err) {
      setError(String(err instanceof Error ? err.message : err));
    } finally {
      setImporting(false);
    }
  }

  const selected = value.map((name) => availableImages.find((file) => file.name === name) ?? null);

  return (
    <div className="qf-reference-images">
      <div className="qf-reference-actions">
        <button
          type="button"
          className="ghost qf-reference-upload"
          disabled={disabled || uploading}
          onClick={() => fileInputRef.current?.click()}
        >
          {uploading ? t('qf.refUploading') : t('qf.refUpload')}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          disabled={disabled || uploading}
          onChange={handleFilePicked}
        />
      </div>
      <div className="qf-reference-import">
        <input
          type="text"
          className="qf-input"
          value={linkValue}
          disabled={disabled || importing}
          placeholder={placeholder ?? t('qf.refUrlPlaceholder')}
          onChange={(event) => setLinkValue(event.target.value)}
        />
        <button
          type="button"
          className="ghost qf-reference-import-btn"
          disabled={disabled || importing || linkValue.trim().length === 0}
          onClick={() => void handleImportLink()}
        >
          {importing ? t('qf.refImporting') : t('qf.refImport')}
        </button>
      </div>
      {value.length > 0 ? (
        <div className="qf-reference-group">
          <div className="qf-reference-group-label">{t('qf.refSelected')}</div>
          <div className="qf-options">
            {selected.map((file, index) => {
              const name = value[index] ?? '';
              const selectedOn = true;
              return (
                <button
                  key={name}
                  type="button"
                  className={`qf-chip${selectedOn ? ' qf-chip-on' : ''}`}
                  disabled={disabled}
                  onClick={() => onChange(value.filter((entry) => entry !== name))}
                  title={name}
                >
                  <span>{file?.name ?? name}</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
      <div className="qf-reference-group">
        <div className="qf-reference-group-label">{t('qf.refExisting')}</div>
        {availableImages.length > 0 ? (
          <div className="qf-reference-file-grid">
            {availableImages.map((file) => {
              const selectedOn = value.includes(file.name);
              return (
                <button
                  key={file.name}
                  type="button"
                  className={`qf-reference-file${selectedOn ? ' qf-reference-file-on' : ''}`}
                  disabled={disabled}
                  onClick={() =>
                    onChange(
                      selectedOn
                        ? value.filter((entry) => entry !== file.name)
                        : uniqueStringList([...value, file.name]),
                    )
                  }
                >
                  {projectId ? (
                    <img src={projectRawUrl(projectId, file.name)} alt={file.name} />
                  ) : (
                    <span className="qf-reference-file-thumb" aria-hidden>
                      {file.name.slice(0, 1).toUpperCase()}
                    </span>
                  )}
                  <span className="qf-reference-file-name">{file.name}</span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="qf-help">{t('qf.refNoImages')}</div>
        )}
      </div>
      {error ? <div className="qf-inline-error">{error}</div> : null}
    </div>
  );
}

function DirectionCardView({
  card,
  formId,
  questionId,
  selected,
  disabled,
  onSelect,
}: {
  card: DirectionCard;
  formId: string;
  questionId: string;
  selected: boolean;
  disabled: boolean;
  onSelect: () => void;
}) {
  const t = useT();
  return (
    <label
      className={`qf-card${selected ? ' qf-card-on' : ''}${disabled ? ' qf-card-disabled' : ''}`}
    >
      <input
        type="radio"
        name={`${formId}-${questionId}`}
        value={card.id}
        checked={selected}
        disabled={disabled}
        onChange={() => onSelect()}
      />
      <div className="qf-card-head">
        <div className="qf-card-title">{card.label}</div>
        {selected ? <span className="qf-card-pill">{t('qf.cardSelected')}</span> : null}
      </div>
      {card.palette.length > 0 ? (
        <div className="qf-card-swatches" aria-hidden>
          {card.palette.slice(0, 6).map((c, i) => (
            <span
              key={i}
              className="qf-card-swatch"
              style={{ background: c }}
              title={c}
            />
          ))}
        </div>
      ) : null}
      <div className="qf-card-types" aria-hidden>
        <span className="qf-card-type-display" style={{ fontFamily: card.displayFont }}>
          Aa
        </span>
        <span className="qf-card-type-body" style={{ fontFamily: card.bodyFont }}>
          {t('qf.cardSampleText')}
        </span>
      </div>
      {card.mood ? <p className="qf-card-mood">{card.mood}</p> : null}
      {card.references.length > 0 ? (
        <p className="qf-card-refs">
          <span className="qf-card-refs-label">{t('qf.cardRefs')}</span>{' '}
          {card.references.slice(0, 4).join(' · ')}
        </p>
      ) : null}
    </label>
  );
}

function buildInitialState(
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

/**
 * Reverse of formatFormAnswers — when we render an old assistant message
 * that contained a form, look at the next user message in the conversation
 * to see if the form was already answered. If so, return the answers map
 * so the form renders in the locked "answered" state with the user's
 * picks visible.
 */
export function parseSubmittedAnswers(
  form: QuestionForm,
  userMessageContent: string,
): Record<string, string | string[]> | null {
  const lines = userMessageContent.split('\n').map((l) => l.trim());
  if (lines.length === 0) return null;
  const header = lines[0] ?? '';
  // We accept any "form answers" header so the agent can paraphrase.
  if (!/^\[form answers/i.test(header)) return null;
  const answers: Record<string, string | string[]> = {};
  const labelToId = new Map<string, string>();
  for (const q of form.questions) labelToId.set(q.label.toLowerCase(), q.id);
  for (let i = 1; i < lines.length; i++) {
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

function mergeProjectFiles(existing: ProjectFile[], incoming: ProjectFile[]): ProjectFile[] {
  const merged = new Map<string, ProjectFile>();
  for (const file of [...existing, ...incoming]) {
    merged.set(file.name, file);
  }
  return [...merged.values()];
}

function uniqueStringList(values: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    const trimmed = value.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    out.push(trimmed);
  }
  return out;
}

function buildReferenceImageAttachments(
  form: QuestionForm,
  answers: Record<string, string | string[]>,
): ChatAttachment[] {
  const seen = new Set<string>();
  const out: ChatAttachment[] = [];
  for (const question of form.questions) {
    if (question.type !== 'reference-images') continue;
    const value = answers[question.id];
    const paths = Array.isArray(value) ? uniqueStringList(value) : [];
    for (const filePath of paths) {
      if (seen.has(filePath)) continue;
      seen.add(filePath);
      out.push({
        path: filePath,
        name: filePath.split('/').pop() || filePath,
        kind: 'image',
      });
    }
  }
  return out;
}
