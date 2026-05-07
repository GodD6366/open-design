import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const scriptPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'od-shop-home-page.ts');

function runCli(args: string[], envOverrides: Record<string, string | undefined> = {}) {
  const env = { ...process.env };
  for (const [key, value] of Object.entries(envOverrides)) {
    if (value === undefined) {
      delete env[key];
    } else {
      env[key] = value;
    }
  }
  const result = spawnSync(process.execPath, ['--experimental-strip-types', scriptPath, ...args], {
    env,
    encoding: 'utf8',
  });
  return {
    ...result,
    stdoutJson: JSON.parse(result.stdout || '{}') as Record<string, unknown>,
  };
}

test('requires OD_DAEMON_URL or --daemon-url instead of guessing a localhost port', () => {
  const result = runCli(['start', '--brief', 'test brief'], {
    OD_DAEMON_URL: undefined,
  });

  assert.equal(result.status, 1);
  assert.equal(result.stdoutJson.error, 'missing daemon URL');
  assert.deepEqual(result.stdoutJson.details, {
    hint: 'pass --daemon-url or set OD_DAEMON_URL to the running daemon origin',
    avoid: 'do not use a web port such as http://127.0.0.1:3000',
  });
});

test('accepts OD_DAEMON_URL as the daemon source of truth before command dispatch', () => {
  const result = runCli(['bogus-command'], {
    OD_DAEMON_URL: 'http://127.0.0.1:7457',
  });

  assert.equal(result.status, 1);
  assert.equal(result.stdoutJson.error, 'unknown command');
  assert.deepEqual(result.stdoutJson.details, { command: 'bogus-command' });
});
