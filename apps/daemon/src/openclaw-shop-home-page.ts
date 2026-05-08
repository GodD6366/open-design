// @ts-nocheck
import path from 'node:path';
import {
  extractFirstQuestionForm,
  formatFormAnswers,
  parseSubmittedAnswers,
  questionFormToMarkdown,
} from '@open-design/contracts/question-form';

type OpenClawReplyInput = {
  session: { id: string; projectId: string; conversationId: string };
  assistantText?: string | null;
  state?: { status?: string; validationErrors?: string[] } | null;
  tasks?: Array<{ status?: string }>;
  previewUrl?: string | null;
  projectUrl?: string | null;
  runId?: string | null;
  runStatus?: 'queued' | 'running' | 'succeeded' | 'failed' | 'canceled' | null;
};

export function openClawShopHomePageReplyFromAssistant({
  session,
  assistantText,
  state,
  tasks = [],
  previewUrl = null,
  projectUrl = null,
  runId = null,
  runStatus = null,
}: OpenClawReplyInput) {
  const form = extractFirstQuestionForm(String(assistantText ?? ''));
  if (form) {
    return {
      projectId: session.projectId,
      conversationId: session.conversationId,
      state: 'awaiting_requirements',
      replyMarkdown: questionFormToMarkdown(form),
      replyType: 'requirements_form',
      previewUrl: null,
      projectUrl: null,
      runId,
      runStatus,
      assetTasks: tasks,
      debug: {
        projectUrl,
        assistantText,
        validationErrors: [],
      },
    };
  }

  const validationErrors = Array.isArray(state?.validationErrors)
    ? state.validationErrors
    : [];
  if (validationErrors.length > 0) {
    return {
      projectId: session.projectId,
      conversationId: session.conversationId,
      state: state?.status ?? 'schema-error',
      replyMarkdown: `生成结构后发现校验问题：\n${validationErrors.map((err) => `- ${err}`).join('\n')}`,
      replyType: 'error',
      previewUrl,
      projectUrl: null,
      runId,
      runStatus,
      assetTasks: tasks,
      debug: {
        projectUrl,
        assistantText,
        validationErrors,
      },
    };
  }

  if (runStatus === 'failed' || runStatus === 'canceled') {
    return {
      projectId: session.projectId,
      conversationId: session.conversationId,
      state: state?.status ?? runStatus,
      replyMarkdown:
        String(assistantText ?? '').trim() ||
        (runStatus === 'canceled' ? '店铺首页生成已取消。' : '店铺首页生成失败，请检查当前任务输出。'),
      replyType: 'error',
      previewUrl,
      projectUrl: null,
      runId,
      runStatus,
      assetTasks: tasks,
      debug: {
        projectUrl,
        assistantText,
        validationErrors,
      },
    };
  }

  const previewReady = Boolean(previewUrl) && state?.status === 'assets-ready';
  return {
    projectId: session.projectId,
    conversationId: session.conversationId,
    state: state?.status ?? 'progress',
    replyMarkdown: previewReady
      ? [String(assistantText ?? '').trim() || '店铺首页已生成完成。', '', `预览链接：${previewUrl}`]
          .filter(Boolean)
          .join('\n')
      : String(assistantText ?? '').trim() || '已继续处理店铺首页项目。',
    replyType: previewReady ? 'preview_ready' : 'progress',
    previewUrl,
    projectUrl: null,
    runId,
    runStatus,
    assetTasks: tasks,
    debug: {
      projectUrl,
      assistantText,
      validationErrors,
    },
  };
}

export function openClawNormalizeFormReply(form, raw) {
  const direct = parseSubmittedAnswers(form, raw);
  if (direct) return formatFormAnswers(form, direct);
  const headerLine = `[form answers — ${form.id}]`;
  const normalizedLines = [headerLine];
  const lines = String(raw ?? '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  for (const question of form.questions) {
    let value = '';
    for (const line of lines) {
      const cleaned = line.replace(/^[-*]\s*/, '');
      const idx = cleaned.indexOf(':');
      if (idx === -1) continue;
      const rawLabel = cleaned.slice(0, idx).replace(/（.*?）/g, '').trim();
      if (rawLabel === question.label) {
        value = cleaned.slice(idx + 1).trim();
        break;
      }
    }
    normalizedLines.push(`- ${question.label}: ${value || '(skipped)'}`);
  }
  const answers = parseSubmittedAnswers(form, normalizedLines.join('\n'));
  return answers ? formatFormAnswers(form, answers) : raw;
}

export function openClawProjectPageUrl({ host, resolvedPort, projectId, webPort }) {
  if (!webPort) return null;
  const reportHost = host === '0.0.0.0' || host === '::' ? '127.0.0.1' : host;
  return `http://${reportHost}:${webPort || resolvedPort}/projects/${encodeURIComponent(projectId)}`;
}

export function openClawProjectPageUrlFromBase(baseUrl, projectId) {
  if (!baseUrl) return null;
  return new URL(`/projects/${encodeURIComponent(projectId)}`, `${String(baseUrl).replace(/\/$/, '')}/`).toString();
}

export function openClawAttachmentNameFromUrl(rawUrl, requestedName) {
  try {
    const parsed = new URL(String(rawUrl));
    return requestedName || path.basename(parsed.pathname) || `reference-${Date.now()}.png`;
  } catch {
    return requestedName || `reference-${Date.now()}.png`;
  }
}
