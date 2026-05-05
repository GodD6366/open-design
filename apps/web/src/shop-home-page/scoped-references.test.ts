import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../providers/registry', () => ({
  projectFileUrl: (projectId: string, name: string) =>
    `/api/projects/${projectId}/raw/${name}`,
  writeProjectBase64File: vi.fn(),
}));

import {
  backfillShopHomePageScopedReferenceImages,
  cropShopHomePageReferenceRegionToDataUrl,
  materializeShopHomePageReferenceRegions,
  needsShopHomePageReferenceMaterialization,
} from './scoped-references';
import { writeProjectBase64File } from '../providers/registry';
import type { ShopHomePageSchema, ShopHomePageStyleGuide } from './types';

const writeProjectBase64FileMock = vi.mocked(writeProjectBase64File);

function buildStyleGuide(): ShopHomePageStyleGuide {
  return {
    version: '1.0',
    preset_id: 'bakery-handdrawn-cream',
    reference_images: ['page-shot.png'],
    reference_regions: {
      top_slider: {
        source_image: 'page-shot.png',
        x: 0.08,
        y: 0.05,
        width: 0.84,
        height: 0.34,
      },
      user_assets: {
        strip: {
          source_image: 'page-shot.png',
          x: 0.1,
          y: 0.4,
          width: 0.7,
          height: 0.12,
        },
        entries: [
          {
            source_image: 'page-shot.png',
            x: 0.11,
            y: 0.41,
            width: 0.16,
            height: 0.1,
            target_label: '到店自取',
          },
        ],
      },
    },
    analysis: {
      source_summary: '',
      icon_style: '',
      background_style: '',
      layout_style: '',
      tone_keywords: [],
    },
    generation_rules: {
      must: [],
      avoid: [],
    },
  };
}

function buildSchema(): ShopHomePageSchema {
  return {
    page_id: 'shop_home_page',
    version: '1.0.0',
    layout_mode: 'overlay',
    design_context: {
      theme: 'test',
      color_palette: {
        bg: '#fff',
        card_bg: '#fff',
        card_subtle: '#fff',
        text_primary: '#000',
        text_secondary: '#111',
        accent: '#f90',
      },
      radius: '8px',
      shadow: 'none',
      spacing: 16,
      page_width: 375,
    },
    modules: [
      {
        id: 'top_slider_1',
        type: 'top_slider',
        data: {
          items: [
            {
              id: 'hero_1',
              reference_images: ['page-shot.png'],
            },
          ],
        },
      },
      {
        id: 'user_assets_1',
        type: 'user_assets',
        data: {
          entries: [
            {
              id: 'entry_1',
              title: '到店自取',
              reference_images: [],
            },
            {
              id: 'entry_2',
              title: '会员专享',
              reference_images: ['page-shot.png'],
            },
          ],
        },
      },
    ],
  };
}

describe('backfillShopHomePageScopedReferenceImages', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    writeProjectBase64FileMock.mockReset();
  });

  it('rewrites top_slider and user_assets to localized crop references', () => {
    const { schema, changed } = backfillShopHomePageScopedReferenceImages(
      buildSchema(),
      buildStyleGuide(),
    );

    expect(changed).toBe(true);
    expect((schema as any).modules[0].data.items[0].reference_images).toEqual([
      'top-slider-ref-hero.png',
    ]);
    expect((schema as any).modules[1].data.entries[0].reference_images).toEqual([
      'user-assets-ref-entry-1.png',
      'user-assets-ref-strip.png',
    ]);
    expect((schema as any).modules[1].data.entries[1].reference_images).toEqual([
      'user-assets-ref-strip.png',
    ]);
  });
});

describe('localized crop materialization', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    writeProjectBase64FileMock.mockReset();
  });

  it('computes stale crops from source/style-guide mtimes', () => {
    const styleGuide = buildStyleGuide();
    const region = styleGuide.reference_regions?.top_slider!;
    expect(
      needsShopHomePageReferenceMaterialization(
        {
          sourceFileName: 'page-shot.png',
          outputFileName: 'top-slider-ref-hero.png',
          region,
        },
        [
          { name: 'page-shot.png', mtime: 10 } as any,
          { name: 'shop-home-page.style-guide.json', mtime: 20 } as any,
        ],
      ),
    ).toBe(true);

    expect(
      needsShopHomePageReferenceMaterialization(
        {
          sourceFileName: 'page-shot.png',
          outputFileName: 'top-slider-ref-hero.png',
          region,
        },
        [
          { name: 'page-shot.png', mtime: 10 } as any,
          { name: 'shop-home-page.style-guide.json', mtime: 20 } as any,
          { name: 'top-slider-ref-hero.png', mtime: 21 } as any,
        ],
      ),
    ).toBe(false);
  });

  it('crops and writes deterministic localized reference files', async () => {
    class FakeImage {
      naturalWidth = 1000;
      naturalHeight = 500;
      onload: null | (() => void) = null;
      onerror: null | (() => void) = null;

      set src(_value: string) {
        queueMicrotask(() => this.onload?.());
      }
    }

    const drawImage = vi.fn();
    const toDataURL = vi.fn(() => 'data:image/png;base64,QUJD');
    vi.stubGlobal('Image', FakeImage as any);
    vi.stubGlobal('document', {
      createElement: (tagName: string) => {
        if (tagName !== 'canvas') {
          throw new Error(`Unexpected tag: ${tagName}`);
        }
        return {
          width: 0,
          height: 0,
          getContext: () => ({ drawImage }),
          toDataURL,
        };
      },
    });
    writeProjectBase64FileMock.mockResolvedValue({ name: 'top-slider-ref-hero.png' } as any);

    const styleGuide = buildStyleGuide();
    const region = styleGuide.reference_regions?.top_slider!;
    const dataUrl = await cropShopHomePageReferenceRegionToDataUrl(
      'project-1',
      region,
    );

    expect(dataUrl).toBe('data:image/png;base64,QUJD');
    expect(drawImage).toHaveBeenCalledWith(
      expect.any(FakeImage),
      80,
      25,
      840,
      170,
      0,
      0,
      840,
      170,
    );

    const result = await materializeShopHomePageReferenceRegions(
      'project-1',
      styleGuide,
      [
        { name: 'page-shot.png', mtime: 10 } as any,
        { name: 'shop-home-page.style-guide.json', mtime: 20 } as any,
      ],
    );

    expect(result).toEqual({ wroteFiles: true, ready: true });
    expect(writeProjectBase64FileMock).toHaveBeenCalledWith(
      'project-1',
      'top-slider-ref-hero.png',
      'QUJD',
    );
  });
});
