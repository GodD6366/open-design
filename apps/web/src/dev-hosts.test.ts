import { describe, expect, it } from 'vitest';

import { resolveAllowedDevOriginsForHost } from './dev-hosts';

describe('resolveAllowedDevOriginsForHost', () => {
  it('includes the explicit LAN IP when binding to one address', () => {
    const origins = resolveAllowedDevOriginsForHost('192.168.1.8');
    expect(origins).toContain('192.168.1.8');
    expect(origins).toContain('127.0.0.1');
    expect(origins).toContain('localhost');
  });

  it('includes private-network wildcard ranges when binding to all interfaces', () => {
    const origins = resolveAllowedDevOriginsForHost('0.0.0.0');
    expect(origins).toContain('10.*.*.*');
    expect(origins).toContain('172.18.*.*');
    expect(origins).toContain('192.168.*.*');
    expect(origins).toContain('100.64.*.*');
    expect(origins).toContain('100.127.*.*');
  });
});
