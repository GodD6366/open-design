import TONE_PRESETS_RAW from './tone-presets.json';

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

const STOREFRONT_TONE_PRESETS = TONE_PRESETS_RAW as StorefrontTonePreset[];

export function getStorefrontTonePresets(): StorefrontTonePreset[] {
  return STOREFRONT_TONE_PRESETS;
}

export function renderStorefrontToneFormBody(): string {
  const cards = STOREFRONT_TONE_PRESETS.map((preset) => ({
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
          options: STOREFRONT_TONE_PRESETS.map((preset) => preset.id),
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

export function renderStorefrontToneSpecBlock(): string {
  const lines: string[] = [
    '## Storefront tone presets',
    '',
    'When the storefront visual form includes a `tone_palette` id, treat it as a deterministic preset. Write its label into `storefront.requirements.json.style.tone`, write its accent into `style.primary_color` unless the user provided `accent_override`, write the preset id into `storefront.style-guide.json.preset_id`, and carry its `toneKeywords` into `storefront.style-guide.json.analysis.tone_keywords`.',
    '',
    'If `brand_reference_mode` says the user already has a brand/template reference, the reference images and brand notes outrank the tone preset. In that case, keep the reference-led style guide, but you may still use the chosen tone as a soft color preference.',
    '',
    'If the visual form contains `reference_images`, those values are already project-local filenames. Copy them into `storefront.style-guide.json.reference_images` verbatim. Never keep remote image URLs there.',
    '',
  ];

  for (const preset of STOREFRONT_TONE_PRESETS) {
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

export function storefrontTonePresetIds(): string[] {
  return STOREFRONT_TONE_PRESETS.map((preset) => preset.id);
}
