import { afterEach, describe, expect, it, vi } from 'vitest';

import { createClientId } from './id';

describe('createClientId', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('uses native randomUUID when available', () => {
    const randomUUID = vi.fn(() => 'native-id');
    vi.stubGlobal('crypto', { randomUUID });

    expect(createClientId()).toBe('native-id');
    expect(randomUUID).toHaveBeenCalledOnce();
  });

  it('falls back to getRandomValues when randomUUID is unavailable', () => {
    vi.stubGlobal('crypto', {
      getRandomValues(bytes: Uint8Array) {
        bytes.fill(0);
        return bytes;
      },
    });

    expect(createClientId()).toBe('00000000-0000-4000-8000-000000000000');
  });

  it('still returns a backend-safe id without Web Crypto', () => {
    vi.stubGlobal('crypto', undefined);
    vi.spyOn(Math, 'random').mockReturnValue(0);

    expect(createClientId()).toBe('00000000-0000-4000-8000-000000000000');
  });
});
