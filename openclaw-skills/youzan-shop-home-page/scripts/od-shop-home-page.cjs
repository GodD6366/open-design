const fs = require('node:fs/promises');
const path = require('node:path');

const DEFAULT_POLL_INTERVAL_MS = 5000;

function printJson(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

function fail(message, details) {
  const payload = { ok: false, error: message };
  if (details !== undefined) payload.details = details;
  printJson(payload);
  process.exit(1);
}

function parseArgs(argv) {
  const positional = [];
  const options = new Map();
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) {
      positional.push(token);
      continue;
    }
    const eq = token.indexOf('=');
    const key = eq >= 0 ? token.slice(2, eq) : token.slice(2);
    const value =
      eq >= 0
        ? token.slice(eq + 1)
        : i + 1 < argv.length && !argv[i + 1].startsWith('--')
          ? argv[++i]
          : 'true';
    const current = options.get(key) ?? [];
    current.push(value);
    options.set(key, current);
  }
  return { positional, options };
}

function option(options, key) {
  return options.get(key)?.[0];
}

function optionList(options, key) {
  return options.get(key) ?? [];
}

function toDaemonBaseUrl(raw) {
  const value = raw?.trim() || process.env.OD_DAEMON_URL?.trim() || 'http://172.18.172.190:7457';
  if (!value) {
    fail('missing daemon URL', {
      hint: 'pass --daemon-url or set OD_DAEMON_URL to the running daemon origin',
      avoid: 'do not use a web port such as http://127.0.0.1:3000',
    });
  }
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

async function readBody(resp) {
  const text = await resp.text().catch(() => '');
  if (text) return text;
  return `HTTP ${resp.status}`;
}

async function readJson(resp) {
  if (!resp.ok) {
    let details;
    try {
      details = await resp.json();
    } catch {
      details = await readBody(resp);
    }
    fail(`request failed: ${resp.status} ${resp.statusText}`, details);
  }
  return resp.json();
}

async function requestJson(baseUrl, pathname, init) {
  const resp = await fetch(new URL(pathname, `${baseUrl}/`), init);
  return readJson(resp);
}

async function readTextOptionFile(options, key) {
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

async function encodeAttachment(filePath) {
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

async function buildAttachments(options) {
  const attachments = [];
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

function printOpenClaw(action, response) {
  printJson({
    ok: response.replyType !== 'error',
    action,
    projectId: response.projectId,
    conversationId: response.conversationId,
    state: response.state,
    replyType: response.replyType,
    text: response.replyMarkdown,
    previewUrl: response.previewUrl ?? null,
    projectUrl: response.projectUrl ?? null,
    runId: response.runId ?? null,
    runStatus: response.runStatus ?? null,
    assetTasks: response.assetTasks ?? [],
  });
}

function shouldStopPolling(response) {
  if (response.replyType === 'requirements_form') return true;
  if (response.replyType === 'preview_ready') return true;
  if (response.replyType === 'error') return true;
  return response.runStatus === 'failed' || response.runStatus === 'canceled';
}

function shouldPoll(response) {
  if (shouldStopPolling(response)) return false;
  if (response.replyType !== 'progress') return false;
  if (!response.projectId && !response.sessionId) return false;
  return (
    Boolean(response.runId) ||
    response.runStatus === 'queued' ||
    response.runStatus === 'running' ||
    response.runStatus === 'succeeded'
  );
}

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function pollUntilTerminal(baseUrl, initial, options) {
  let current = initial;
  const projectId = initial.projectId || initial.sessionId;
  if (!projectId) return current;
  const pollMsRaw = Number(option(options, 'poll-ms') ?? '');
  const pollMs =
    Number.isFinite(pollMsRaw) && pollMsRaw > 0
      ? Math.round(pollMsRaw)
      : DEFAULT_POLL_INTERVAL_MS;
  while (shouldPoll(current)) {
    await sleep(pollMs);
    current = await requestJson(
      baseUrl,
      `/api/openclaw/shop-home-page/sessions/${encodeURIComponent(projectId)}`,
    );
  }
  return current;
}

async function startSession(baseUrl, options) {
  const brief =
    option(options, 'brief') ??
    option(options, 'message') ??
    (await readTextOptionFile(options, 'brief-file')) ??
    (await readTextOptionFile(options, 'message-file'));
  if (!brief?.trim()) fail('missing --brief/--message/--brief-file/--message-file');
  const response = await requestJson(baseUrl, '/api/openclaw/shop-home-page/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      brief,
      openclawThreadId: option(options, 'thread-id') ?? null,
      shopHomePageTemplateId: option(options, 'template-id') ?? null,
      attachments: await buildAttachments(options),
      agentId: option(options, 'agent-id') ?? null,
      model: option(options, 'model') ?? null,
      reasoning: option(options, 'reasoning') ?? null,
      waitMode: 'defer',
    }),
  });
  printOpenClaw('start', await pollUntilTerminal(baseUrl, response, options));
}

async function sendMessage(baseUrl, options) {
  const projectId = option(options, 'project-id') ?? option(options, 'session-id');
  if (!projectId) fail('missing --project-id');
  const message =
    option(options, 'message') ??
    option(options, 'answers') ??
    (await readTextOptionFile(options, 'message-file')) ??
    (await readTextOptionFile(options, 'answers-file'));
  if (!message?.trim()) fail('missing --message/--answers/--message-file/--answers-file');
  const response = await requestJson(
    baseUrl,
    `/api/openclaw/shop-home-page/sessions/${encodeURIComponent(projectId)}/messages`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        attachments: await buildAttachments(options),
        agentId: option(options, 'agent-id') ?? null,
        model: option(options, 'model') ?? null,
        reasoning: option(options, 'reasoning') ?? null,
        waitMode: 'defer',
      }),
    },
  );
  printOpenClaw('send', await pollUntilTerminal(baseUrl, response, options));
}

async function getStatus(baseUrl, options) {
  const projectId = option(options, 'project-id') ?? option(options, 'session-id');
  if (!projectId) fail('missing --project-id');
  const response = await requestJson(
    baseUrl,
    `/api/openclaw/shop-home-page/sessions/${encodeURIComponent(projectId)}`,
  );
  printOpenClaw('status', response);
}

function help() {
  printJson({
    ok: true,
    daemonUrl: 'required via --daemon-url or OD_DAEMON_URL; no localhost fallback',
    usage: [
      'start --brief <text> [--file <local-image> ...] [--url <image-url> ...] [--thread-id <id>] [--daemon-url <url>]',
      'send --project-id <id> (--message <text> | --answers-file <path>) [--file <local-image> ...] [--daemon-url <url>]',
      'status --project-id <id> [--daemon-url <url>]',
    ],
    aliases: ['--session-id is accepted as a deprecated alias for --project-id'],
    deprecated: ['create', 'clarify', 'generate', 'assets', 'preview', 'revise'],
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
      return;
    default:
      fail('unknown command', { command });
  }
}

void main().catch((error) => {
  fail(error instanceof Error ? error.message : String(error));
});
