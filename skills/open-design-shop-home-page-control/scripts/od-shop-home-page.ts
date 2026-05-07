import fs from 'node:fs/promises';
import path from 'node:path';

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

type OpenClawResponse = {
  sessionId: string;
  projectId: string;
  conversationId: string;
  state: string;
  replyMarkdown: string;
  replyType: 'requirements_form' | 'progress' | 'preview_ready' | 'error';
  previewUrl?: string | null;
  projectUrl?: string | null;
  runId?: string | null;
  assetTasks?: Array<{ id: string; fileName?: string; status: string; error?: string | null }>;
  debug?: Json;
};

function printJson(value: Json): void {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

function fail(message: string, details?: Json): never {
  const payload: Record<string, Json> = { ok: false, error: message };
  if (details !== undefined) payload.details = details;
  printJson(payload);
  process.exit(1);
}

function parseArgs(argv: string[]) {
  const positional: string[] = [];
  const options = new Map<string, string[]>();
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i]!;
    if (!token.startsWith('--')) {
      positional.push(token);
      continue;
    }
    const eq = token.indexOf('=');
    const key = eq >= 0 ? token.slice(2, eq) : token.slice(2);
    const value =
      eq >= 0
        ? token.slice(eq + 1)
        : i + 1 < argv.length && !argv[i + 1]!.startsWith('--')
          ? argv[++i]!
          : 'true';
    const current = options.get(key) ?? [];
    current.push(value);
    options.set(key, current);
  }
  return { positional, options };
}

function option(options: Map<string, string[]>, key: string): string | undefined {
  return options.get(key)?.[0];
}

function optionList(options: Map<string, string[]>, key: string): string[] {
  return options.get(key) ?? [];
}

function toDaemonBaseUrl(raw?: string): string {
  const value = raw ?? process.env.OD_DAEMON_URL ?? 'http://127.0.0.1:17456';
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol)) {
      fail('daemon URL must use http or https', { daemonUrl: value });
    }
    return url.toString().replace(/\/+$/, '');
  } catch {
    fail('invalid daemon URL', { daemonUrl: value });
  }
}

async function readBody(resp: Response): Promise<string> {
  const text = await resp.text().catch(() => '');
  if (text) return text;
  return `HTTP ${resp.status}`;
}

async function readJson<T>(resp: Response): Promise<T> {
  if (!resp.ok) {
    let details: Json | undefined;
    try {
      details = (await resp.json()) as Json;
    } catch {
      details = await readBody(resp);
    }
    fail(`request failed: ${resp.status} ${resp.statusText}`, details);
  }
  return (await resp.json()) as T;
}

async function requestJson<T>(baseUrl: string, pathname: string, init?: RequestInit): Promise<T> {
  const resp = await fetch(new URL(pathname, `${baseUrl}/`), init);
  return readJson<T>(resp);
}

async function readTextOptionFile(options: Map<string, string[]>, key: string): Promise<string | null> {
  const filePath = option(options, key);
  if (!filePath) return null;
  const absolute = path.resolve(filePath);
  try {
    return await fs.readFile(absolute, 'utf8');
  } catch (error) {
    fail('failed to read text file', {
      option: key,
      file: absolute,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

async function encodeAttachment(filePath: string): Promise<Json> {
  const absolute = path.resolve(filePath);
  try {
    const bytes = await fs.readFile(absolute);
    return {
      name: path.basename(absolute),
      contentBase64: bytes.toString('base64'),
    };
  } catch (error) {
    fail('failed to read attachment', {
      file: absolute,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

async function buildAttachments(options: Map<string, string[]>): Promise<Json[]> {
  const attachments: Json[] = [];
  for (const filePath of optionList(options, 'file')) {
    attachments.push(await encodeAttachment(filePath));
  }
  for (const filePath of optionList(options, 'attachment-file')) {
    attachments.push(await encodeAttachment(filePath));
  }
  for (const projectPath of optionList(options, 'attachment')) {
    attachments.push({ path: projectPath });
  }
  for (const url of optionList(options, 'url')) {
    attachments.push({ url });
  }
  return attachments;
}

function printOpenClaw(action: string, response: OpenClawResponse): void {
  printJson({
    ok: response.replyType !== 'error',
    action,
    sessionId: response.sessionId,
    projectId: response.projectId,
    conversationId: response.conversationId,
    state: response.state,
    replyType: response.replyType,
    text: response.replyMarkdown,
    previewUrl: response.previewUrl ?? null,
    projectUrl: response.projectUrl ?? null,
    runId: response.runId ?? null,
    assetTasks: response.assetTasks ?? [],
  });
}

async function startSession(baseUrl: string, options: Map<string, string[]>): Promise<void> {
  const brief =
    option(options, 'brief') ??
    option(options, 'message') ??
    (await readTextOptionFile(options, 'brief-file')) ??
    (await readTextOptionFile(options, 'message-file'));
  if (!brief?.trim()) fail('missing --brief/--message/--brief-file/--message-file');
  const response = await requestJson<OpenClawResponse>(baseUrl, '/api/openclaw/shop-home-page/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      brief,
      openclawThreadId: option(options, 'thread-id') ?? null,
      attachments: await buildAttachments(options),
      agentId: option(options, 'agent-id') ?? null,
      model: option(options, 'model') ?? null,
      reasoning: option(options, 'reasoning') ?? null,
    }),
  });
  printOpenClaw('start', response);
}

async function sendMessage(baseUrl: string, options: Map<string, string[]>): Promise<void> {
  const sessionId = option(options, 'session-id') ?? option(options, 'project-id');
  if (!sessionId) fail('missing --session-id');
  const message =
    option(options, 'message') ??
    option(options, 'answers') ??
    (await readTextOptionFile(options, 'message-file')) ??
    (await readTextOptionFile(options, 'answers-file'));
  if (!message?.trim()) fail('missing --message/--answers/--message-file/--answers-file');
  const response = await requestJson<OpenClawResponse>(
    baseUrl,
    `/api/openclaw/shop-home-page/sessions/${encodeURIComponent(sessionId)}/messages`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        attachments: await buildAttachments(options),
        agentId: option(options, 'agent-id') ?? null,
        model: option(options, 'model') ?? null,
        reasoning: option(options, 'reasoning') ?? null,
      }),
    },
  );
  printOpenClaw('send', response);
}

async function getStatus(baseUrl: string, options: Map<string, string[]>): Promise<void> {
  const sessionId = option(options, 'session-id') ?? option(options, 'project-id');
  if (!sessionId) fail('missing --session-id');
  const response = await requestJson<OpenClawResponse>(
    baseUrl,
    `/api/openclaw/shop-home-page/sessions/${encodeURIComponent(sessionId)}`,
  );
  printOpenClaw('status', response);
}

function help(): void {
  printJson({
    ok: true,
    usage: [
      'start --brief <text> [--file <local-image> ...] [--url <image-url> ...] [--thread-id <id>] [--daemon-url <url>]',
      'send --session-id <id> (--message <text> | --answers-file <path>) [--file <local-image> ...] [--daemon-url <url>]',
      'status --session-id <id> [--daemon-url <url>]',
    ],
    deprecated: [
      'create',
      'clarify',
      'generate',
      'assets',
      'preview',
      'revise',
    ],
  });
}

async function main() {
  const { positional, options } = parseArgs(process.argv.slice(2));
  const command = positional[0];
  if (!command || command === 'help' || command === '--help') {
    help();
    return;
  }
  const baseUrl = toDaemonBaseUrl(option(options, 'daemon-url'));
  switch (command) {
    case 'start':
    case 'create':
      await startSession(baseUrl, options);
      return;
    case 'send':
    case 'send-message':
      await sendMessage(baseUrl, options);
      return;
    case 'status':
    case 'preview':
      await getStatus(baseUrl, options);
      return;
    case 'clarify':
    case 'generate':
    case 'assets':
    case 'revise':
      fail(`deprecated private command: ${command}`, {
        hint: 'use start/send/status so the daemon OpenClaw chat proxy owns the real project conversation',
      });
    default:
      fail('unknown command', { command });
  }
}

void main().catch((error: unknown) => {
  fail(error instanceof Error ? error.message : String(error));
});
