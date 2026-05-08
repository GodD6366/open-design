import type { ProjectFile } from './files.js';
import type { PreviewCommentPosition } from './comments.js';

export type ChatRole = 'user' | 'assistant';

export interface ChatRequest {
  agentId: string;
  message: string;
  systemPrompt?: string;
  automationMode?: boolean | null;
  persistMessages?: boolean | null;
  projectId?: string | null;
  conversationId?: string | null;
  assistantMessageId?: string | null;
  clientRequestId?: string | null;
  skillId?: string | null;
  designSystemId?: string | null;
  attachments?: string[];
  commentAttachments?: ChatCommentAttachment[];
  model?: string | null;
  reasoning?: string | null;
}

export interface ChatRunCreateRequest extends ChatRequest {
  projectId: string;
  conversationId: string;
  assistantMessageId: string;
  clientRequestId: string;
}

export type ChatRunStatus = 'queued' | 'running' | 'succeeded' | 'failed' | 'canceled';

export interface ChatRunCreateResponse {
  runId: string;
}

export interface ChatRunStatusResponse {
  id: string;
  projectId: string | null;
  conversationId: string | null;
  assistantMessageId: string | null;
  agentId: string | null;
  status: ChatRunStatus;
  createdAt: number;
  updatedAt: number;
  exitCode?: number | null;
  signal?: string | null;
}

export interface ChatRunListResponse {
  runs: ChatRunStatusResponse[];
}

export interface ChatRunCancelResponse {
  ok: true;
}

export interface ChatAttachment {
  path: string;
  name: string;
  kind: 'image' | 'file';
  size?: number;
}

export interface ChatCommentAttachment {
  id: string;
  order: number;
  filePath: string;
  elementId: string;
  selector: string;
  label: string;
  comment: string;
  currentText: string;
  pagePosition: PreviewCommentPosition;
  htmlHint: string;
}

export type PersistedAgentEvent =
  | { kind: 'status'; label: string; detail?: string }
  | { kind: 'text'; text: string }
  | { kind: 'thinking'; text: string }
  | { kind: 'tool_use'; id: string; name: string; input: unknown }
  | { kind: 'tool_result'; toolUseId: string; content: string; isError: boolean }
  | { kind: 'usage'; inputTokens?: number; outputTokens?: number; costUsd?: number; durationMs?: number }
  | { kind: 'raw'; line: string };

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  agentId?: string;
  agentName?: string;
  events?: PersistedAgentEvent[];
  createdAt?: number;
  runId?: string;
  runStatus?: ChatRunStatus;
  lastRunEventId?: string;
  startedAt?: number;
  endedAt?: number;
  attachments?: ChatAttachment[];
  commentAttachments?: ChatCommentAttachment[];
  producedFiles?: ProjectFile[];
}

export type OpenClawShopHomePageReplyType =
  | 'requirements_form'
  | 'progress'
  | 'preview_ready'
  | 'error';

export interface OpenClawShopHomePageAttachmentInput {
  path?: string;
  name?: string;
  url?: string;
  contentBase64?: string;
}

export interface OpenClawShopHomePageSessionRequest {
  brief: string;
  attachments?: OpenClawShopHomePageAttachmentInput[];
  openclawThreadId?: string | null;
  agentId?: string | null;
  model?: string | null;
  reasoning?: string | null;
  waitMode?: 'block' | 'defer';
}

export interface OpenClawShopHomePageMessageRequest {
  message: string;
  attachments?: OpenClawShopHomePageAttachmentInput[];
  agentId?: string | null;
  model?: string | null;
  reasoning?: string | null;
  waitMode?: 'block' | 'defer';
}

export interface OpenClawShopHomePageSessionResponse {
  projectId: string;
  conversationId: string;
  sessionId?: string;
  state: string;
  replyMarkdown: string;
  replyType: OpenClawShopHomePageReplyType;
  previewUrl?: string | null;
  projectUrl?: string | null;
  runId?: string | null;
  runStatus?: ChatRunStatus | null;
  assetTasks?: Array<{ id: string; fileName?: string; status: string; error?: string | null }>;
  debug?: {
    projectUrl?: string | null;
    assistantText?: string | null;
    validationErrors?: string[];
  };
}
