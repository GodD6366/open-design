import TONE_PRESETS_RAW from './shop-home-page-tone-presets.json';

export interface StorefrontTonePreset {
  id: string;
  label: string;
  summary: string;
  references: string[];
  displayFont: string;
  bodyFont: string;
  palette: {
    bg: string;
    cardBg: string;
    cardSubtle: string;
    textPrimary: string;
    textSecondary: string;
    accent: string;
  };
  theme: string;
  radius: string;
  shadow: string;
  toneKeywords: string[];
  analysis: {
    sourceSummary: string;
    iconStyle: string;
    backgroundStyle: string;
    layoutStyle: string;
  };
  generationRules: {
    must: string[];
    avoid: string[];
  };
}

const SHOP_HOME_PAGE_TONE_PRESETS = TONE_PRESETS_RAW as StorefrontTonePreset[];

export function getShopHomePageTonePresets(): StorefrontTonePreset[] {
  return SHOP_HOME_PAGE_TONE_PRESETS;
}

export function renderShopHomePageToneFormBody(): string {
  const cards = SHOP_HOME_PAGE_TONE_PRESETS.map((preset) => ({
    id: preset.id,
    label: preset.label,
    mood: preset.summary,
    references: preset.references,
    palette: [
      preset.palette.bg,
      preset.palette.cardBg,
      preset.palette.cardSubtle,
      preset.palette.textSecondary,
      preset.palette.textPrimary,
      preset.palette.accent,
    ],
    displayFont: preset.displayFont,
    bodyFont: preset.bodyFont,
  }));

  return JSON.stringify(
    {
      description:
        '没有明确品牌规范时，选一个更贴近店铺首页的色调搭配。它会直接决定默认主色、色调关键词和 schema 调色。',
      questions: [
        {
          id: 'tone_palette',
          label: '色调搭配',
          type: 'direction-cards',
          options: SHOP_HOME_PAGE_TONE_PRESETS.map((preset) => preset.id),
          cards,
        },
        {
          id: 'accent_override',
          label: '主色微调（可选）',
          type: 'text',
          placeholder: '例如：把橙色改成更偏焦糖，或主按钮不要这么亮',
        },
      ],
    },
    null,
    2,
  );
}

export function renderShopHomePageToneSpecBlock(): string {
  const lines: string[] = [
    '## Storefront tone presets',
    '',
    'When the shop-home-page visual form includes a `tone_palette` id, treat it as a deterministic preset. Write its label into `shop-home-page.requirements.json.style.tone`, write its accent into `style.primary_color` unless the user provided `accent_override`, write the preset id into `shop-home-page.style-guide.json.preset_id`, and carry its `toneKeywords` into `shop-home-page.style-guide.json.analysis.tone_keywords`.',
    '',
    'If `brand_reference_mode` says the user already has a brand/template reference, the reference images and brand notes outrank the tone preset. In that case, keep the reference-led style guide, but you may still use the chosen tone as a soft color preference.',
    '',
    'If the visual form contains `reference_images`, those values are already project-local filenames. Copy them into `shop-home-page.style-guide.json.reference_images` verbatim. Never keep remote image URLs there.',
    '',
  ];

  for (const preset of SHOP_HOME_PAGE_TONE_PRESETS) {
    lines.push(`### ${preset.label}  \`(id: ${preset.id})\``);
    lines.push('');
    lines.push(`**Summary:** ${preset.summary}`);
    lines.push('');
    lines.push(`**References:** ${preset.references.join(' · ')}.`);
    lines.push('');
    lines.push('**Palette:**');
    lines.push('');
    lines.push('```json');
    lines.push(
      JSON.stringify(
        {
          bg: preset.palette.bg,
          card_bg: preset.palette.cardBg,
          card_subtle: preset.palette.cardSubtle,
          text_primary: preset.palette.textPrimary,
          text_secondary: preset.palette.textSecondary,
          accent: preset.palette.accent,
        },
        null,
        2,
      ),
    );
    lines.push('```');
    lines.push('');
    lines.push(`**Tone keywords:** ${preset.toneKeywords.join(', ')}`);
    lines.push('');
    lines.push(`**Icon style:** ${preset.analysis.iconStyle}`);
    lines.push('');
    lines.push(`**Background style:** ${preset.analysis.backgroundStyle}`);
    lines.push('');
    lines.push(`**Layout style:** ${preset.analysis.layoutStyle}`);
    lines.push('');
  }

  return lines.join('\n');
}

export function shopHomePageTonePresetIds(): string[] {
  return SHOP_HOME_PAGE_TONE_PRESETS.map((preset) => preset.id);
}
