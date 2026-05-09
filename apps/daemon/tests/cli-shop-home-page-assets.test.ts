import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

describe('od shop-home-page-assets CLI help contract', () => {
  const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('prints root help that includes shop-home-page-assets subcommand', async () => {
    const originalArgv = process.argv;
    process.argv = ['node', 'cli', '--help'];
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(((code?: number) => {
      throw new Error(`exit:${code ?? 0}`);
    }) as any);

    await expect(import('../src/cli.js?root-help')).rejects.toThrow('exit:0');
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('od shop-home-page-assets generate --project <id> [--file <name> ...] [--force]'),
    );

    exitSpy.mockRestore();
    process.argv = originalArgv;
  });

  it('prints storefront asset help usage', async () => {
    const originalArgv = process.argv;
    process.argv = ['node', 'cli', 'shop-home-page-assets', '--help'];
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(((code?: number) => {
      throw new Error(`exit:${code ?? 0}`);
    }) as any);

    await expect(import('../src/cli.js?asset-help')).rejects.toThrow('exit:0');
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('Usage: od shop-home-page-assets generate --project <id> [opts]'),
    );

    exitSpy.mockRestore();
    process.argv = originalArgv;
  });

  it('validates project id for storefront asset generate', async () => {
    const originalArgv = process.argv;
    process.argv = ['node', 'cli', 'shop-home-page-assets', 'generate', '--force'];
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(((code?: number) => {
      throw new Error(`exit:${code ?? 0}`);
    }) as any);

    await expect(import('../src/cli.js?asset-generate-missing-project')).rejects.toThrow('exit:2');
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('project id required. Pass --project <id> or set OD_PROJECT_ID.'),
    );

    exitSpy.mockRestore();
    process.argv = originalArgv;
  });
});
