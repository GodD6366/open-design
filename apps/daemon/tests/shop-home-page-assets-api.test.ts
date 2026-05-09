import type http from 'node:http';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { startServer } from '../src/server.js';

describe('shopHomePage asset API routes', () => {
  let server: http.Server;
  let baseUrl: string;

  beforeAll(async () => {
    const started = await startServer({ port: 0, returnServer: true }) as {
      url: string;
      server: http.Server;
    };
    baseUrl = started.url;
    server = started.server;
  });

  afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

  it('rejects unknown projects on targeted storefront asset generate route', async () => {
    const res = await fetch(`${baseUrl}/api/shop-home-page/assets/generate`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        projectId: 'missing-project',
        fileNames: ['top-slider-1.png'],
        forceRegenerate: true,
      }),
    });

    expect(res.status).toBe(404);
    await expect(res.text()).resolves.toContain('not found');
  });

  it('keeps legacy enqueue route shape for storefront assets', async () => {
    const res = await fetch(`${baseUrl}/api/shop-home-page/generate-assets/enqueue`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        projectId: 'missing-project',
        forceRegenerate: true,
      }),
    });

    expect(res.status).toBe(404);
    await expect(res.text()).resolves.toContain('not found');
  });
});
