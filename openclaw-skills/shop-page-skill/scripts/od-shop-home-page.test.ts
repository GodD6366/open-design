import assert from 'node:assert/strict';
import http from 'node:http';
import { once } from 'node:events';
import { spawn } from 'node:child_process';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const scriptPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'od-shop-home-page.ts');

async function closeServer(server: http.Server): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

function runCli(
  args: string[],
  envOverrides: Record<string, string | undefined> = {},
): Promise<{ status: number | null; stdoutJson: Record<string, unknown>; stderr: string }> {
  const env = { ...process.env };
  for (const [key, value] of Object.entries(envOverrides)) {
    if (value === undefined) delete env[key];
    else env[key] = value;
  }
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['--experimental-strip-types', scriptPath, ...args], {
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });
    child.on('error', reject);
    child.on('close', (status) => {
      resolve({
        status,
        stdoutJson: JSON.parse(stdout || '{}') as Record<string, unknown>,
        stderr,
      });
    });
  });
}

test('requires OD_DAEMON_URL or --daemon-url instead of guessing a localhost port', async () => {
  const result = await runCli(['start', '--brief', 'test brief'], {
    OD_DAEMON_URL: undefined,
  });

  assert.equal(result.status, 1);
  assert.equal(result.stdoutJson.error, 'missing daemon URL');
  assert.deepEqual(result.stdoutJson.details, {
    hint: 'pass --daemon-url or set OD_DAEMON_URL to the running daemon origin',
    avoid: 'do not use a web port such as http://127.0.0.1:3000',
  });
});

test('accepts OD_DAEMON_URL as the daemon source of truth before command dispatch', async () => {
  const result = await runCli(['bogus-command'], {
    OD_DAEMON_URL: 'http://127.0.0.1:7457',
  });

  assert.equal(result.status, 1);
  assert.equal(result.stdoutJson.error, 'unknown command');
  assert.deepEqual(result.stdoutJson.details, { command: 'bogus-command' });
});

test('start exits immediately when the daemon returns a requirements form', async () => {
  let requestCount = 0;
  const server = http.createServer((req, res) => {
    requestCount += 1;
    assert.equal(req.method, 'POST');
    assert.equal(req.url, '/api/openclaw/shop-home-page/sessions');
    let body = '';
    req.setEncoding('utf8');
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      const parsed = JSON.parse(body);
      assert.equal(parsed.waitMode, 'defer');
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(
        JSON.stringify({
          projectId: 'p1',
          conversationId: 'c1',
          state: 'awaiting_requirements',
          replyType: 'requirements_form',
          replyMarkdown: '## 需求澄清',
          runId: null,
          runStatus: null,
          assetTasks: [],
        }),
      );
    });
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 0;

  try {
    const result = await runCli(
      ['start', '--brief', '帮我生成首页', '--poll-ms', '5'],
      { OD_DAEMON_URL: `http://127.0.0.1:${port}` },
    );

    assert.equal(result.status, 0);
    assert.equal(result.stdoutJson.replyType, 'requirements_form');
    assert.equal(result.stdoutJson.projectId, 'p1');
    assert.equal('sessionId' in result.stdoutJson, false);
    assert.equal(requestCount, 1);
  } finally {
    await closeServer(server);
  }
});

test('send polls status instead of resending the same message while the run is active', async () => {
  const hits = { send: 0, status: 0 };
  const statusReplies = [
    {
      projectId: 'p1',
      conversationId: 'c1',
      state: 'schema-ready',
      replyType: 'progress',
      replyMarkdown: '继续处理中',
      runId: 'run-1',
      runStatus: 'running',
      assetTasks: [],
    },
    {
      projectId: 'p1',
      conversationId: 'c1',
      state: 'assets-generating',
      replyType: 'progress',
      replyMarkdown: '素材生成中',
      runId: 'run-1',
      runStatus: 'succeeded',
      assetTasks: [{ id: 'a1', status: 'running' }],
    },
    {
      projectId: 'p1',
      conversationId: 'c1',
      state: 'assets-ready',
      replyType: 'preview_ready',
      replyMarkdown: '店铺首页已生成完成。\n\n预览链接：http://preview',
      previewUrl: 'http://preview',
      runId: 'run-1',
      runStatus: 'succeeded',
      assetTasks: [{ id: 'a1', status: 'done' }],
    },
  ];
  const server = http.createServer((req, res) => {
    if (req.method === 'POST' && req.url === '/api/openclaw/shop-home-page/sessions/p1/messages') {
      hits.send += 1;
      let body = '';
      req.setEncoding('utf8');
      req.on('data', (chunk) => {
        body += chunk;
      });
      req.on('end', () => {
        const parsed = JSON.parse(body);
        assert.equal(parsed.waitMode, 'defer');
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(
          JSON.stringify({
            projectId: 'p1',
            conversationId: 'c1',
            state: 'generating',
            replyType: 'progress',
            replyMarkdown: '店铺首页结构仍在生成中，请继续等待当前任务完成。',
            runId: 'run-1',
            runStatus: 'queued',
            assetTasks: [],
          }),
        );
      });
      return;
    }

    if (req.method === 'GET' && req.url === '/api/openclaw/shop-home-page/sessions/p1') {
      const next = statusReplies[Math.min(hits.status, statusReplies.length - 1)]!;
      hits.status += 1;
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify(next));
      return;
    }

    res.writeHead(404);
    res.end();
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 0;

  try {
    const result = await runCli(
      ['send', '--project-id', 'p1', '--message', '这些需求确认了', '--poll-ms', '5'],
      { OD_DAEMON_URL: `http://127.0.0.1:${port}` },
    );

    assert.equal(result.status, 0);
    assert.equal(hits.send, 1);
    assert.equal(hits.status, 3);
    assert.equal('sessionId' in result.stdoutJson, false);
    assert.equal(result.stdoutJson.replyType, 'preview_ready');
    assert.equal(result.stdoutJson.runId, 'run-1');
    assert.equal(result.stdoutJson.runStatus, 'succeeded');
    assert.equal(result.stdoutJson.previewUrl, 'http://preview');
  } finally {
    await closeServer(server);
  }
});
