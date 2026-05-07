import { describe, expect, it } from 'vitest';

import { SHOP_HOMEPAGE_KIND } from '../types';
import type { ProjectTemplate } from '../types';
import { buildMetadata } from './NewProjectPanel';

describe('NewProjectPanel shop-home-page metadata', () => {
  const templates: ProjectTemplate[] = [];

  it('defaults the selected industry to bakery metadata', () => {
    const metadata = buildMetadata({
      tab: SHOP_HOMEPAGE_KIND,
      fidelity: 'high-fidelity',
      speakerNotes: false,
      animations: false,
      templateId: null,
      templates,
      shopHomePageTemplateId: '__none__',
      shopHomePageIndustryId: 'bakery',
      imageModel: 'gpt-image-2',
      imageAspect: '1:1',
      imageStyle: '',
      videoModel: 'seedance',
      videoAspect: '16:9',
      videoLength: 5,
      audioKind: 'speech',
      audioModel: 'gpt-4o-mini-tts',
      audioDuration: 10,
      voice: '',
      inspirationIds: [],
      promptTemplate: null,
    });

    expect(metadata.shopHomePageIndustryId).toBe('bakery');
    expect(metadata.shopHomePageIndustryLabel).toBe('烘焙');
  });

  it('allows coffee-tea projects to keep using bakery templates', () => {
    const metadata = buildMetadata({
      tab: SHOP_HOMEPAGE_KIND,
      fidelity: 'high-fidelity',
      speakerNotes: false,
      animations: false,
      templateId: null,
      templates,
      shopHomePageTemplateId: 'bakery-doodle-toast',
      shopHomePageIndustryId: 'coffeeTea',
      imageModel: 'gpt-image-2',
      imageAspect: '1:1',
      imageStyle: '',
      videoModel: 'seedance',
      videoAspect: '16:9',
      videoLength: 5,
      audioKind: 'speech',
      audioModel: 'gpt-4o-mini-tts',
      audioDuration: 10,
      voice: '',
      inspirationIds: [],
      promptTemplate: null,
    });

    expect(metadata.shopHomePageIndustryId).toBe('coffeeTea');
    expect(metadata.shopHomePageIndustryLabel).toBe('咖啡茶饮');
    expect(metadata.shopHomePageTemplateId).toBe('bakery-doodle-toast');
  });
});
