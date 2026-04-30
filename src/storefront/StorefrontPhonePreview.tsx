import { useEffect, useRef, useState } from 'react';
import { projectFileUrl } from '../providers/registry';
import type { StorefrontSchema, StorefrontSchemaModule } from './types';
import {
  STOREFRONT_STATUS_BATTERY,
  STOREFRONT_STATUS_SIGNAL_BARS,
  STOREFRONT_STATUS_WIFI_PATHS,
} from './phoneChrome.js';

type Props = {
  projectId: string;
  schema: StorefrontSchema;
};

type DesignContext = StorefrontSchema['design_context'];

type ImagePromptSchemaLike = {
  content?: {
    title?: string;
    subtitle?: string;
    description?: string;
  };
  style?: {
    background_color?: string;
    primary_color?: string;
    text_color?: string;
  };
};

type ImageItemLike = {
  id?: string;
  image?: string;
  alt?: string;
  aspect_ratio?: string;
  image_prompt_schema?: ImagePromptSchemaLike;
  reference_images?: string[];
};

type UserAssetsSlotLike = {
  id?: string;
  position?: string;
  size?: 'large' | 'medium' | 'small';
};

type UserAssetsMappingLike = {
  icon?: string;
  title?: string;
  subtitle?: string;
};

type UserAssetsSchemaLike = {
  layout?: {
    structure?: string;
    distribution?: string;
    slots?: UserAssetsSlotLike[];
  };
  content?: {
    slots_mapping?: Record<string, UserAssetsMappingLike>;
  };
};

const MODULE_RUNTIME_COPY: Record<
  StorefrontSchemaModule['type'],
  { label: string; alt: string; pendingLabel: string }
> = {
  top_slider: {
    label: '头图轮播',
    alt: '顶部轮播',
    pendingLabel: '顶部轮播运行时生图中...',
  },
  user_assets: {
    label: '会员资产区',
    alt: '客户资产',
    pendingLabel: '客户资产运行时生图中...',
  },
  banner: {
    label: '活动横幅',
    alt: 'Banner',
    pendingLabel: 'Banner 运行时生图中...',
  },
  goods: {
    label: '商品模块',
    alt: '商品展示',
    pendingLabel: '商品组件运行时生图中...',
  },
  shop_info: {
    label: '门店信息',
    alt: '店铺信息',
    pendingLabel: '店铺信息运行时生图中...',
  },
};

const USER_ASSETS_DEFAULTS = {
  greeting: 'Hello',
  nickname: '小赞宝用户',
  avatar:
    'https://img01.yzcdn.cn/upload_files/2023/07/06/Fq4fiVPqT5Ea1l59IThVNBGapfTq.png',
  codeIcon:
    'https://img01.yzcdn.cn/upload_files/2023/07/10/FiPIAQ_DwDBgQ9L4iKpD7O2r4Dd_.png',
  bodyAlt: '客户资产功能区背景图',
  pendingLabel: '客户资产运行时生图中...',
} as const;

const USER_ASSETS_CANVAS_WIDTH = 632;
const USER_ASSETS_ROW_HEIGHT = 220;
const USER_ASSETS_ROW_GAP = 16;
const USER_ASSETS_PREVIEW_BODY_WIDTH = 311;
const USER_ASSETS_ASYMMETRIC_LARGE_WIDTH = 316;
const USER_ASSETS_ASYMMETRIC_MEDIUM_WIDTH = 300;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function toNumber(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function stringOr(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function moduleTypeLabel(moduleType: StorefrontSchemaModule['type']) {
  return MODULE_RUNTIME_COPY[moduleType]?.label ?? '首页模块';
}

function resolveAssetUrl(projectId: string, value: unknown) {
  const input = stringOr(value);
  if (!input) return '';
  if (/^(https?:|data:|blob:)/i.test(input)) return input;
  return projectFileUrl(projectId, input);
}

function hexToRgba(hex: string, alpha: number) {
  const normalized = /^#[0-9a-f]{6}$/i.test(hex) ? hex.slice(1) : 'c98c5a';
  const bigint = Number.parseInt(normalized, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${clamp(alpha, 0, 1)})`;
}

function shortenText(value: string, max: number) {
  return value.length > max ? `${value.slice(0, Math.max(0, max - 1))}…` : value;
}

function blendSuggestion(suggestion: number | undefined, fallback: number, min: number, max: number) {
  const base =
    suggestion === undefined ? fallback : Math.round(fallback * 0.72 + suggestion * 0.28);
  return clamp(base, min, max);
}

function pageWidthFor(schema: StorefrontSchema) {
  return clamp(schema.design_context.page_width || 375, 320, 430);
}

function spacingFor(schema: StorefrontSchema) {
  return clamp(schema.design_context.spacing || 16, 12, 20);
}

function imageHeightFor(module: StorefrontSchemaModule, index: number, schema: StorefrontSchema) {
  const width = pageWidthFor(schema);
  const data = module.data as { mode?: string; height?: number };
  const mode = stringOr(data.mode, 'single');
  const suggestion = typeof data.height === 'number' ? data.height : undefined;

  if (module.type === 'top_slider' && index === 0) {
    const base =
      mode === 'dual_carousel'
        ? Math.round(width * 0.78)
        : mode === 'horizontal_scroll'
          ? Math.round(width * 0.56)
          : Math.round(width * (4 / 3));
    return blendSuggestion(suggestion, base, 360, 540);
  }
  if (module.type === 'banner') {
    const base = Math.round(width * (400 / 750));
    return blendSuggestion(suggestion, base, Math.round(base * 0.9), Math.round(base * 1.1));
  }
  if (module.type === 'goods') {
    const base =
      mode === 'horizontal_scroll'
        ? Math.round(width * 0.62)
        : Math.round(width * (3 / 4));
    return blendSuggestion(suggestion, base, 200, 280);
  }
  if (module.type === 'shop_info') {
    return blendSuggestion(suggestion, Math.round(width * (16 / 9)), 420, 640);
  }
  return blendSuggestion(suggestion, 180, 120, 260);
}

function userAssetsSlots(schema: UserAssetsSchemaLike | undefined): UserAssetsSlotLike[] {
  return Array.isArray(schema?.layout?.slots) ? schema.layout.slots : [];
}

function userAssetsSlotPosition(slot: UserAssetsSlotLike | undefined) {
  return stringOr(slot?.position || slot?.id);
}

function hasUserAssetsPositions(slots: UserAssetsSlotLike[], ...entries: string[]) {
  const ids = slots.map((slot) => userAssetsSlotPosition(slot));
  return entries.every((entry) => ids.includes(entry));
}

function isAsymmetricThreeUserAssetsLayout(schema: UserAssetsSchemaLike | undefined) {
  const slots = userAssetsSlots(schema);
  if (slots.length !== 3) return false;
  if (!hasUserAssetsPositions(slots, 'right_top', 'right_bottom')) return false;
  if (hasUserAssetsPositions(slots, 'left_large') || hasUserAssetsPositions(slots, 'left')) {
    return true;
  }
  const structure = stringOr(schema?.layout?.structure);
  const distribution = stringOr(schema?.layout?.distribution);
  return (
    structure === 'asymmetric' ||
    structure === 'asymmetric_entry_grid' ||
    distribution === 'one_large_two_stacked'
  );
}

function resolveAsymmetricUserAssetsSlots(schema: UserAssetsSchemaLike | undefined) {
  const slots = userAssetsSlots(schema);
  if (!isAsymmetricThreeUserAssetsLayout(schema)) return null;
  const rightTop = slots.find((slot) => userAssetsSlotPosition(slot) === 'right_top');
  const rightBottom = slots.find((slot) => userAssetsSlotPosition(slot) === 'right_bottom');
  const left = slots.find((slot) => {
    const position = userAssetsSlotPosition(slot);
    return position === 'left_large' || position === 'left';
  }) ?? slots.find((slot) => {
    const position = userAssetsSlotPosition(slot);
    return position !== 'right_top' && position !== 'right_bottom';
  });
  if (!left || !rightTop || !rightBottom) return null;
  return { left, rightTop, rightBottom };
}

function resolveUserAssetsLayoutMetrics(schema: UserAssetsSchemaLike | undefined) {
  const slots = userAssetsSlots(schema);
  if (isAsymmetricThreeUserAssetsLayout(schema)) {
    return {
      canvasWidth: USER_ASSETS_CANVAS_WIDTH,
      canvasHeight: USER_ASSETS_ROW_HEIGHT * 2 + USER_ASSETS_ROW_GAP,
      isFreeform: false,
    };
  }
  if (hasUserAssetsPositions(slots, 'left', 'right') && slots.length === 2) {
    return { canvasWidth: USER_ASSETS_CANVAS_WIDTH, canvasHeight: USER_ASSETS_ROW_HEIGHT, isFreeform: false };
  }
  if (hasUserAssetsPositions(slots, 'left_1', 'center_1', 'right_1') && slots.length === 3) {
    return { canvasWidth: USER_ASSETS_CANVAS_WIDTH, canvasHeight: USER_ASSETS_ROW_HEIGHT, isFreeform: false };
  }
  if (hasUserAssetsPositions(slots, 'top_left', 'top_right', 'bottom_left', 'bottom_right') && slots.length === 4) {
    return {
      canvasWidth: USER_ASSETS_CANVAS_WIDTH,
      canvasHeight: USER_ASSETS_ROW_HEIGHT * 2 + USER_ASSETS_ROW_GAP,
      isFreeform: false,
    };
  }
  if (
    hasUserAssetsPositions(slots, 'top_left', 'top_right', 'bottom_left', 'bottom_center', 'bottom_right') &&
    slots.length === 5
  ) {
    return {
      canvasWidth: USER_ASSETS_CANVAS_WIDTH,
      canvasHeight: USER_ASSETS_ROW_HEIGHT * 2 + USER_ASSETS_ROW_GAP,
      isFreeform: false,
    };
  }
  const rows = Math.max(1, Math.ceil(slots.length / 3));
  return {
    canvasWidth: USER_ASSETS_CANVAS_WIDTH,
    canvasHeight: rows * USER_ASSETS_ROW_HEIGHT + Math.max(0, rows - 1) * USER_ASSETS_ROW_GAP,
    isFreeform: true,
  };
}

function userAssetsHeightFor(module: StorefrontSchemaModule, schema: StorefrontSchema) {
  const data = module.data as {
    height?: number;
    body_image?: string;
    body_image_schema?: UserAssetsSchemaLike;
  };
  const metrics = resolveUserAssetsLayoutMetrics(data.body_image_schema);
  const availableWidth = clamp(
    pageWidthFor(schema) - spacingFor(schema) * 2 - 32,
    260,
    pageWidthFor(schema),
  );
  const imageHeight = Math.round((availableWidth * metrics.canvasHeight) / metrics.canvasWidth);
  const hasBodyImage = Boolean(stringOr(data.body_image));
  const fallback = hasBodyImage ? imageHeight + 134 : 208;
  const maxHeight = metrics.isFreeform ? 760 : 560;
  return hasBodyImage ? blendSuggestion(data.height, fallback, 124, maxHeight) : fallback;
}

function resolvePageLayout(schema: StorefrontSchema): StorefrontSchema {
  const next = JSON.parse(JSON.stringify(schema)) as StorefrontSchema;
  next.modules = next.modules.map((module, index, modules) => {
    const previous = index > 0 ? modules[index - 1] : null;
    const spacing = spacingFor(next);
    const layout =
      module.type === 'top_slider' && index === 0
        ? { offsetY: 0, zIndex: 1, paddingX: 0, paddingTop: 0, paddingBottom: 0 }
        : module.type === 'banner'
          ? { offsetY: 0, zIndex: 1, paddingX: 16, paddingTop: 0, paddingBottom: 6 }
        : module.type === 'user_assets'
          ? {
              offsetY:
                next.layout_mode === 'overlay' && previous?.type === 'top_slider' && index <= 2
                  ? -clamp(pageWidthFor(next) * 0.15, 44, 62)
                  : 0,
              zIndex:
                next.layout_mode === 'overlay' && previous?.type === 'top_slider' && index <= 2
                  ? 3
                  : 1,
              paddingX: spacing,
              paddingTop:
                next.layout_mode === 'overlay' && previous?.type === 'top_slider' && index <= 2
                  ? 0
                  : spacing,
              paddingBottom: spacing,
            }
          : { offsetY: 0, zIndex: 1, paddingX: 0, paddingTop: 0, paddingBottom: 0 };
    module.layout = layout;

    const data = module.data as {
      mode?: string;
      height?: number;
      auto_play_ms?: number;
      items?: ImageItemLike[];
    };
    if (module.type === 'user_assets') {
      (module.data as { height?: number }).height = userAssetsHeightFor(module, next);
    } else {
      data.height = imageHeightFor(module, index, next);
      if (module.type === 'top_slider' && Array.isArray(data.items) && data.items.length >= 2) {
        data.mode = 'carousel_poster';
        data.auto_play_ms = data.auto_play_ms || 3000;
      }
    }
    return module;
  });
  return next;
}

type PlaceholderVariant = 'poster' | 'banner' | 'goods' | 'story' | 'generic';

type PendingPalette = {
  shell: string;
  shellSoft: string;
  orbA: string;
  orbB: string;
  panel: string;
  panelStrong: string;
  edge: string;
  line: string;
  lineStrong: string;
  accentLine: string;
  text: string;
  muted: string;
  shadow: string;
  chip: string;
};

function buildPendingPalette(designContext: DesignContext): PendingPalette {
  const palette = designContext.color_palette;
  return {
    shell: `linear-gradient(155deg, ${hexToRgba(palette.card_bg, 0.96)} 0%, ${hexToRgba(palette.accent, 0.2)} 58%, ${hexToRgba(palette.text_primary, 0.08)} 100%)`,
    shellSoft: `linear-gradient(180deg, ${hexToRgba(palette.card_bg, 0.98)} 0%, ${hexToRgba(palette.accent, 0.1)} 100%)`,
    orbA: hexToRgba(palette.accent, 0.16),
    orbB: hexToRgba(palette.text_primary, 0.06),
    panel: hexToRgba(palette.card_bg, 0.68),
    panelStrong: hexToRgba(palette.card_bg, 0.9),
    edge: hexToRgba(palette.card_bg, 0.48),
    line: hexToRgba(palette.text_primary, 0.14),
    lineStrong: hexToRgba(palette.text_primary, 0.34),
    accentLine: hexToRgba(palette.accent, 0.46),
    text: palette.text_primary,
    muted: hexToRgba(palette.text_primary, 0.62),
    shadow: `0 18px 40px ${hexToRgba(palette.text_primary, 0.08)}`,
    chip: hexToRgba(palette.card_bg, 0.74),
  };
}

function placeholderVariantFor(moduleType: StorefrontSchemaModule['type']): PlaceholderVariant {
  switch (moduleType) {
    case 'top_slider':
      return 'poster';
    case 'banner':
      return 'banner';
    case 'goods':
      return 'goods';
    case 'shop_info':
      return 'story';
    default:
      return 'generic';
  }
}

function GenericPendingImageMark({
  palette,
  label = '图片待生成',
  compact = false,
}: {
  palette: PendingPalette;
  label?: string;
  compact?: boolean;
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: compact ? 6 : 10,
        width: '100%',
        height: '100%',
        minHeight: 0,
        boxSizing: 'border-box',
        color: palette.muted,
        textAlign: 'center',
      }}
    >
      <svg
        width={compact ? 32 : 46}
        height={compact ? 32 : 46}
        viewBox="0 0 46 46"
        fill="none"
        aria-hidden
      >
        <rect x="8" y="10" width="30" height="26" rx="7" stroke="currentColor" strokeWidth="1.6" />
        <circle cx="18" cy="19" r="3.5" fill="currentColor" opacity="0.42" />
        <path
          d="M14 32l7.2-7.2 5.1 5.1 3.5-3.5L36 32"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span style={{ fontSize: compact ? 11 : 12, lineHeight: compact ? '16px' : '18px' }}>
        {label}
      </span>
    </div>
  );
}

function PendingPlaceholder({
  eyebrow,
  title,
  detail,
  status,
  variant,
  designContext,
}: {
  eyebrow: string;
  title: string;
  detail?: string;
  status: string;
  variant: PlaceholderVariant;
  designContext: DesignContext;
}) {
  const palette = buildPendingPalette(designContext);
  void variant;

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        padding: 18,
        background: palette.shellSoft,
        color: palette.text,
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              height: 28,
              padding: '0 12px',
              borderRadius: 999,
              background: palette.chip,
              border: `1px solid ${palette.edge}`,
              fontSize: 11,
              lineHeight: '16px',
              fontWeight: 600,
            }}
          >
            {eyebrow}
          </span>
          <span style={{ fontSize: 11, lineHeight: '16px', color: palette.muted }}>{status}</span>
        </div>
        <div style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', padding: '16px 0 12px' }}>
          <GenericPendingImageMark palette={palette} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxWidth: '80%' }}>
          <strong style={{ fontSize: 13, lineHeight: '18px', fontWeight: 650 }}>{title}</strong>
          {detail ? (
            <span style={{ fontSize: 11, lineHeight: '16px', color: palette.muted }}>{detail}</span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function userAssetsDetailFor(schema: UserAssetsSchemaLike | undefined) {
  const slots = Array.isArray(schema?.layout?.slots) ? schema.layout.slots : [];
  const structure = stringOr(schema?.layout?.structure);
  const layoutLabel =
    structure === 'asymmetric'
      ? '非对称入口布局'
      : structure === 'grid'
        ? '宫格入口布局'
        : structure === 'horizontal'
          ? '横向入口布局'
          : structure === 'vertical'
            ? '纵向入口布局'
            : '入口布局预排';
  return `${slots.length} 个入口 · ${layoutLabel}`;
}

function hasImageAsset(item: ImageItemLike | undefined) {
  return Boolean(stringOr(item?.image));
}

function pendingFrameHeight(hasAsset: boolean, height: number) {
  return hasAsset ? undefined : height;
}

function heroModuleFor(schema: StorefrontSchema) {
  const first = schema.modules[0];
  if (!first || first.type !== 'top_slider') return null;
  return first;
}

function heroHasImage(schema: StorefrontSchema) {
  const hero = heroModuleFor(schema);
  if (!hero) return false;
  const items = Array.isArray((hero.data as { items?: ImageItemLike[] }).items)
    ? ((hero.data as { items?: ImageItemLike[] }).items ?? [])
    : [];
  return items.some((item) => hasImageAsset(item));
}

function StatusSignalIcon({ color }: { color: string }) {
  return (
    <svg width="16" height="12" viewBox="0 0 18 14" fill="none" aria-hidden>
      {STOREFRONT_STATUS_SIGNAL_BARS.map((bar) => (
        <rect
          key={bar.x}
          x={bar.x}
          y={bar.y}
          width={bar.width}
          height={bar.height}
          rx={bar.rx}
          fill={color}
          opacity={bar.opacity}
        />
      ))}
    </svg>
  );
}

function StatusWifiIcon({ color }: { color: string }) {
  return (
    <svg width="16" height="12" viewBox="0 0 18 14" fill="none" aria-hidden>
      {STOREFRONT_STATUS_WIFI_PATHS.map((entry, index) =>
        entry.type === 'circle' ? (
          <circle key={`circle-${index}`} cx={entry.cx} cy={entry.cy} r={entry.r} fill={color} />
        ) : (
          <path
            key={`path-${entry.d}`}
            d={entry.d}
            stroke={color}
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        ),
      )}
    </svg>
  );
}

function StatusBatteryIcon({ color }: { color: string }) {
  return (
    <svg
      className="storefront-phone-battery-icon"
      viewBox={STOREFRONT_STATUS_BATTERY.viewBox}
      fill="none"
      aria-hidden
    >
      <rect
        x={STOREFRONT_STATUS_BATTERY.outline.x}
        y={STOREFRONT_STATUS_BATTERY.outline.y}
        width={STOREFRONT_STATUS_BATTERY.outline.width}
        height={STOREFRONT_STATUS_BATTERY.outline.height}
        rx={STOREFRONT_STATUS_BATTERY.outline.rx}
        fill="none"
        stroke={color}
        strokeOpacity={STOREFRONT_STATUS_BATTERY.outline.strokeOpacity}
      />
      <rect
        x={STOREFRONT_STATUS_BATTERY.nub.x}
        y={STOREFRONT_STATUS_BATTERY.nub.y}
        width={STOREFRONT_STATUS_BATTERY.nub.width}
        height={STOREFRONT_STATUS_BATTERY.nub.height}
        rx={STOREFRONT_STATUS_BATTERY.nub.rx}
        fill={color}
        fillOpacity={STOREFRONT_STATUS_BATTERY.nub.fillOpacity}
      />
      <rect
        x={STOREFRONT_STATUS_BATTERY.fill.x}
        y={STOREFRONT_STATUS_BATTERY.fill.y}
        width={STOREFRONT_STATUS_BATTERY.fill.width}
        height={STOREFRONT_STATUS_BATTERY.fill.height}
        rx={STOREFRONT_STATUS_BATTERY.fill.rx}
        fill={color}
      />
    </svg>
  );
}

function MiniProgramCapsule({
  borderColor,
}: {
  borderColor: string;
}) {
  return (
    <div
      className="storefront-phone-mini-capsule"
      style={{
        background: 'rgba(255,255,255,0.88)',
        borderColor,
      }}
    >
      <div className="storefront-phone-mini-capsule-left" aria-hidden>
        <span />
        <span />
        <span />
      </div>
      <span className="storefront-phone-mini-divider" aria-hidden />
      <div className="storefront-phone-mini-capsule-right" aria-hidden>
        <span />
      </div>
    </div>
  );
}

function UserAssetsEntryGhost({
  item,
  palette,
  large = false,
}: {
  item: UserAssetsMappingLike | undefined;
  palette: PendingPalette;
  large?: boolean;
}) {
  const title = shortenText(stringOr(item?.title, '功能入口'), large ? 10 : 8);
  const subtitle = shortenText(stringOr(item?.subtitle, 'ENTRY'), large ? 14 : 12);
  return (
    <div
      style={{
        height: '100%',
        borderRadius: large ? 24 : 20,
        background: palette.panelStrong,
        border: `1px solid ${palette.edge}`,
        boxShadow: palette.shadow,
        padding: large ? '16px 16px 14px' : '14px 14px 12px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        gap: 12,
      }}
    >
      <div
        style={{
          width: large ? 46 : 38,
          height: large ? 46 : 38,
          borderRadius: large ? 16 : 14,
          background: `linear-gradient(135deg, ${palette.panelStrong}, ${palette.orbA})`,
          border: `1px solid ${palette.edge}`,
        }}
      />
      <div style={{ display: 'grid', gap: 4 }}>
        <strong
          style={{
            fontSize: large ? 18 : 14,
            lineHeight: large ? '24px' : '20px',
            color: palette.text,
            fontWeight: 650,
          }}
        >
          {title}
        </strong>
        <span
          style={{
            fontSize: 10,
            lineHeight: '14px',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            color: palette.muted,
          }}
        >
          {subtitle}
        </span>
      </div>
    </div>
  );
}

function UserAssetsPendingArt({
  designContext,
  schema,
}: {
  designContext: DesignContext;
  schema?: UserAssetsSchemaLike;
}) {
  const palette = buildPendingPalette(designContext);
  const slots = userAssetsSlots(schema);
  const mapping = schema?.content?.slots_mapping ?? {};
  const asymmetricSlots = resolveAsymmetricUserAssetsSlots(schema);

  let layout: JSX.Element;
  if (asymmetricSlots) {
    layout = (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `${USER_ASSETS_ASYMMETRIC_LARGE_WIDTH / USER_ASSETS_ASYMMETRIC_MEDIUM_WIDTH}fr 1fr`,
          gap: USER_ASSETS_ROW_GAP,
          height: '100%',
        }}
      >
        <div>
          <UserAssetsEntryGhost item={mapping[asymmetricSlots.left.id ?? '']} palette={palette} large />
        </div>
        <div style={{ display: 'grid', gap: USER_ASSETS_ROW_GAP }}>
          <UserAssetsEntryGhost item={mapping[asymmetricSlots.rightTop.id ?? '']} palette={palette} />
          <UserAssetsEntryGhost item={mapping[asymmetricSlots.rightBottom.id ?? '']} palette={palette} />
        </div>
      </div>
    );
  } else if (hasUserAssetsPositions(slots, 'top_left', 'top_right', 'bottom_left', 'bottom_right') && slots.length === 4) {
    layout = (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
          gap: USER_ASSETS_ROW_GAP,
          height: '100%',
        }}
      >
        {slots.map((slot, index) => (
          <UserAssetsEntryGhost key={slot.id || index} item={slot.id ? mapping[slot.id] : undefined} palette={palette} />
        ))}
      </div>
    );
  } else if (
    hasUserAssetsPositions(slots, 'top_left', 'top_right', 'bottom_left', 'bottom_center', 'bottom_right') &&
    slots.length === 5
  ) {
    const topSlots = slots.slice(0, 2);
    const bottomSlots = slots.slice(2);
    layout = (
      <div style={{ display: 'grid', gap: USER_ASSETS_ROW_GAP, height: '100%' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: USER_ASSETS_ROW_GAP }}>
          {topSlots.map((slot, index) => (
            <UserAssetsEntryGhost key={slot.id || index} item={slot.id ? mapping[slot.id] : undefined} palette={palette} />
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: USER_ASSETS_ROW_GAP }}>
          {bottomSlots.map((slot, index) => (
            <UserAssetsEntryGhost key={slot.id || index} item={slot.id ? mapping[slot.id] : undefined} palette={palette} />
          ))}
        </div>
      </div>
    );
  } else {
    const fallbackSlots = slots.length > 0 ? slots : [{ id: 'slot-1' }, { id: 'slot-2' }, { id: 'slot-3' }];
    const columns = fallbackSlots.length >= 4 ? 2 : Math.min(fallbackSlots.length, 3);
    layout = (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${Math.max(columns, 1)}, minmax(0, 1fr))`,
          gap: USER_ASSETS_ROW_GAP,
          height: '100%',
        }}
      >
        {fallbackSlots.map((slot, index) => (
          <UserAssetsEntryGhost
            key={slot.id || index}
            item={slot.id && slot.id in mapping ? mapping[slot.id] : undefined}
            palette={palette}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        padding: 8,
        background: palette.shellSoft,
      }}
    >
      {layout}
    </div>
  );
}

function PreviewFrame({
  projectId,
  item,
  moduleType,
  designContext,
}: {
  projectId: string;
  item: ImageItemLike | undefined;
  moduleType: StorefrontSchemaModule['type'];
  designContext: DesignContext;
}) {
  if (!item) {
    return (
      <PendingPlaceholder
        eyebrow="内容占位"
        title="缺少内容"
        detail="当前结构项为空。"
        status="空状态"
        variant="generic"
        designContext={designContext}
      />
    );
  }

  const imageUrl = resolveAssetUrl(projectId, item.image);
  const defaults = MODULE_RUNTIME_COPY[moduleType];
  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={stringOr(item.alt, defaults.alt)}
        style={{ display: 'block', width: '100%', height: 'auto' }}
      />
    );
  }

  const prompt = item.image_prompt_schema;
  return (
    <PendingPlaceholder
      eyebrow={moduleTypeLabel(moduleType)}
      title={shortenText(stringOr(prompt?.content?.title, stringOr(item.alt, defaults.alt)), 24)}
      detail={shortenText(stringOr(prompt?.content?.subtitle, stringOr(prompt?.content?.description, '等待素材生成')), 40)}
      status="待生成"
      variant={placeholderVariantFor(moduleType)}
      designContext={designContext}
    />
  );
}

function ImageAdModule({
  projectId,
  module,
  designContext,
}: {
  projectId: string;
  module: StorefrontSchemaModule;
  designContext: DesignContext;
}) {
  const data = (module.data ?? {}) as {
    mode?: string;
    height?: number;
    auto_play_ms?: number;
    items?: ImageItemLike[];
  };
  const items = Array.isArray(data.items) ? data.items : [];
  const [currentIndex, setCurrentIndex] = useState(0);
  const activeIndex = items.length > 0 ? currentIndex % items.length : 0;
  const hasImage = (item: ImageItemLike | undefined) => Boolean(resolveAssetUrl(projectId, item?.image));
  const carouselItems =
    data.mode === 'carousel_poster' && items.some((item) => hasImage(item))
      ? items.filter((item) => hasImage(item))
      : items;
  const carouselActiveIndex =
    carouselItems.length > 0 ? currentIndex % carouselItems.length : 0;

  useEffect(() => {
    if (data.mode !== 'carousel_poster' || carouselItems.length < 2) return;
    const timer = window.setInterval(() => {
      setCurrentIndex((value) => value + 1);
    }, data.auto_play_ms || 2800);
    return () => window.clearInterval(timer);
  }, [carouselItems.length, data.auto_play_ms, data.mode]);

  if (items.length === 0) return null;

  if (data.mode === 'horizontal_scroll') {
    return (
      <section style={{ overflowX: 'auto' }}>
        <div style={{ display: 'flex', gap: 12 }}>
          {items.map((item, index) => (
            <div
              key={item.id || String(index)}
              style={{
                width: Math.min((data.height || 260) * 0.86, 240),
                height: hasImage(item) ? undefined : data.height || 260,
                overflow: 'hidden',
                borderRadius: designContext.radius,
                background: designContext.color_palette.card_subtle,
                flex: '0 0 auto',
              }}
            >
              <PreviewFrame
                projectId={projectId}
                item={item}
                moduleType={module.type}
                designContext={designContext}
              />
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (module.type === 'goods' && items.length > 1) {
    return (
      <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {items.map((item, index) => (
          <div
            key={item.id || String(index)}
            style={{ height: pendingFrameHeight(hasImage(item), data.height || 300), overflow: 'hidden' }}
          >
            <PreviewFrame
              projectId={projectId}
              item={item}
              moduleType={module.type}
              designContext={designContext}
            />
          </div>
        ))}
      </section>
    );
  }

  if (data.mode === 'dual_carousel' && items.length >= 2) {
    const topItem = items[activeIndex];
    const bottomItem = items[(activeIndex + 1) % items.length];
    const topReady = hasImage(topItem);
    const bottomReady = hasImage(bottomItem);
    return (
      <section
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          height: !topReady && !bottomReady ? data.height || 420 : undefined,
        }}
      >
        <div
          style={{
            height: pendingFrameHeight(topReady, Math.max(80, Math.floor(((data.height || 420) - 12) / 2))),
            overflow: 'hidden',
          }}
        >
          <PreviewFrame projectId={projectId} item={topItem} moduleType={module.type} designContext={designContext} />
        </div>
        <div
          style={{
            height: pendingFrameHeight(bottomReady, Math.max(80, Math.floor(((data.height || 420) - 12) / 2))),
            overflow: 'hidden',
          }}
        >
          <PreviewFrame projectId={projectId} item={bottomItem} moduleType={module.type} designContext={designContext} />
        </div>
      </section>
    );
  }

  if (data.mode === 'carousel_poster' && carouselItems.length > 1) {
    const activeItem = carouselItems[carouselActiveIndex];
    return (
      <section
        style={{
          position: 'relative',
          overflow: 'hidden',
          height: pendingFrameHeight(hasImage(activeItem), data.height || 300),
        }}
      >
        {carouselItems.map((item, index) => (
          <div
            key={item.id || String(index)}
            style={{
              position: index === carouselActiveIndex ? 'relative' : 'absolute',
              inset: index === carouselActiveIndex ? undefined : 0,
              height: hasImage(item) ? undefined : '100%',
              opacity: index === carouselActiveIndex ? 1 : 0,
              transition: 'opacity 700ms ease',
            }}
          >
            <PreviewFrame
              projectId={projectId}
              item={item}
              moduleType={module.type}
              designContext={designContext}
            />
          </div>
        ))}
      </section>
    );
  }

  if (data.mode === 'carousel_poster' && carouselItems.length === 1) {
    const item = carouselItems[0];
    return (
      <section
        style={{
          position: 'relative',
          overflow: 'hidden',
          height: pendingFrameHeight(hasImage(item), data.height || 300),
        }}
      >
        <PreviewFrame
          projectId={projectId}
          item={item}
          moduleType={module.type}
          designContext={designContext}
        />
      </section>
    );
  }

  return (
    <section
      style={{
        position: 'relative',
        overflow: 'hidden',
        height: pendingFrameHeight(hasImage(items[0]), data.height || 300),
      }}
    >
      <PreviewFrame
        projectId={projectId}
        item={items[0]}
        moduleType={module.type}
        designContext={designContext}
      />
    </section>
  );
}

function UserAssetsModule({
  projectId,
  module,
  designContext,
}: {
  projectId: string;
  module: StorefrontSchemaModule;
  designContext: DesignContext;
}) {
  const data = (module.data ?? {}) as {
    greeting?: string;
    nickname?: string;
    avatar?: string;
    upgrade_tip?: string;
    progress_percent?: number;
    height?: number;
    body_image?: string;
    body_alt?: string;
    body_image_schema?: UserAssetsSchemaLike;
  };
  const metrics = resolveUserAssetsLayoutMetrics(data.body_image_schema);
  const bodyImageUrl = resolveAssetUrl(projectId, data.body_image);
  const hasBodyImage = Boolean(bodyImageUrl);
  const bodyHeight = hasBodyImage
    ? Math.round((metrics.canvasHeight / metrics.canvasWidth) * USER_ASSETS_PREVIEW_BODY_WIDTH)
    : clamp(Math.round(toNumber(data.height, 208) * 0.38), 72, 108);
  const avatarUrl = resolveAssetUrl(projectId, data.avatar || USER_ASSETS_DEFAULTS.avatar);
  const progress = clamp(toNumber(data.progress_percent, 33), 0, 100);
  return (
    <section
      style={{
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        minHeight: `${toNumber(data.height, 188)}px`,
        padding: '6px 16px',
        width: '100%',
        backgroundColor: '#fff',
        borderRadius: designContext.radius,
        boxShadow: designContext.shadow,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <div style={{ fontSize: 14, lineHeight: '20px', marginBottom: 4, marginTop: 10 }}>
            {stringOr(data.greeting, USER_ASSETS_DEFAULTS.greeting)}
          </div>
          <div style={{ fontSize: 18, fontWeight: 650, lineHeight: '24px' }}>
            {stringOr(data.nickname, USER_ASSETS_DEFAULTS.nickname)}
          </div>
        </div>
        <div style={{ flexShrink: 0, textAlign: 'center', marginTop: -35 }}>
          <img
            src={avatarUrl}
            alt={stringOr(data.nickname, USER_ASSETS_DEFAULTS.nickname)}
            style={{
              width: 58,
              height: 58,
              margin: '0 auto 8px',
              borderRadius: '50%',
              border: `2px solid ${designContext.color_palette.card_bg}`,
              boxSizing: 'border-box',
              display: 'block',
            }}
          />
          <div
            style={{
              width: 76,
              height: 24,
              borderRadius: 16,
              backgroundColor: '#2f2f34',
              color: '#fff',
              fontSize: 12,
              lineHeight: '18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <img
              src={USER_ASSETS_DEFAULTS.codeIcon}
              alt=""
              style={{ width: 14, height: 14, marginRight: 2 }}
            />
            会员码
          </div>
        </div>
      </div>
      <div style={{ width: '100%', height: 4, background: '#f2f3f5', borderRadius: 3, position: 'relative' }}>
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            height: 4,
            borderRadius: 3,
            backgroundColor: '#000',
            width: `${progress}%`,
          }}
        />
      </div>
      {data.upgrade_tip ? (
        <div style={{ color: designContext.color_palette.text_secondary, fontSize: 12, lineHeight: '18px' }}>
          {data.upgrade_tip}
        </div>
      ) : null}
      <div
        style={{
          flex: '0 0 auto',
          height: bodyHeight,
          borderRadius: 6,
          backgroundColor: designContext.color_palette.card_bg,
          overflow: 'hidden',
        }}
      >
        {bodyImageUrl ? (
          <img
            src={bodyImageUrl}
            alt={stringOr(data.body_alt, USER_ASSETS_DEFAULTS.bodyAlt)}
            style={{ display: 'block', width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'center' }}
          />
        ) : (
          <UserAssetsPendingArt designContext={designContext} schema={data.body_image_schema} />
        )}
      </div>
    </section>
  );
}

function ModuleRenderer({
  projectId,
  module,
  designContext,
}: {
  projectId: string;
  module: StorefrontSchemaModule;
  designContext: DesignContext;
}) {
  const layout = module.layout ?? {};
  return (
    <div
      style={{
        position: 'relative',
        zIndex: toNumber(layout.zIndex, 1),
        marginTop: toNumber(layout.offsetY, 0),
        paddingLeft: toNumber(layout.paddingX, 0),
        paddingRight: toNumber(layout.paddingX, 0),
        paddingTop: toNumber(layout.paddingTop, 0),
        paddingBottom: toNumber(layout.paddingBottom, 0),
      }}
    >
      {module.type === 'user_assets' ? (
        <UserAssetsModule projectId={projectId} module={module} designContext={designContext} />
      ) : (
        <ImageAdModule projectId={projectId} module={module} designContext={designContext} />
      )}
    </div>
  );
}

export function StorefrontPhonePreview({ projectId, schema }: Props) {
  const resolved = resolvePageLayout(schema);
  const context = resolved.design_context;
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const deviceRef = useRef<HTMLDivElement | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const immersiveHero = heroHasImage(resolved);
  const navProgress = clamp(scrollTop / 92, 0, 1);
  const chromeColor = context.color_palette.text_primary;
  const overlayBaseAlpha = immersiveHero ? 0.14 : 0.84;
  const overlayAlpha = clamp(overlayBaseAlpha + navProgress * 0.72, overlayBaseAlpha, 0.92);
  const overlayFadeAlpha = immersiveHero
    ? clamp(0.04 + navProgress * 0.4, 0.04, 0.48)
    : clamp(0.14 + navProgress * 0.16, 0.14, 0.3);
  const chromeBorder = immersiveHero && navProgress < 0.12
    ? 'rgba(255,255,255,0.18)'
    : hexToRgba(context.color_palette.text_primary, 0.08 + navProgress * 0.08);
  const overlayBackground = `linear-gradient(180deg, ${hexToRgba(
    context.color_palette.bg,
    overlayAlpha,
  )} 0%, ${hexToRgba(context.color_palette.bg, overlayFadeAlpha)} 76%, ${hexToRgba(
    context.color_palette.bg,
    0,
  )} 100%)`;
  const navShadow =
    navProgress > 0.12
      ? `0 12px 28px ${hexToRgba(context.color_palette.text_primary, 0.08 + navProgress * 0.06)}`
      : 'none';

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;
    const handleScroll = () => {
      setScrollTop(node.scrollTop);
    };
    handleScroll();
    node.addEventListener('scroll', handleScroll, { passive: true });
    return () => node.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const stage = stageRef.current;
    const device = deviceRef.current;
    if (!stage || !device) return;
    const container = stage.parentElement;
    const scaleBox = device.parentElement;
    const PHONE_W = 390;
    const PHONE_H = 844;
    const HORIZONTAL_PADDING = 32;
    const VERTICAL_PADDING = 32;
    const update = () => {
      const bounds = container?.getBoundingClientRect() ?? stage.getBoundingClientRect();
      const availableW = Math.max(0, bounds.width - HORIZONTAL_PADDING);
      const availableH = Math.max(0, bounds.height - VERTICAL_PADDING);
      const scale = Math.min(1, availableW / PHONE_W, availableH / PHONE_H);
      device.style.transform = `scale(${scale})`;
      if (scaleBox) {
        scaleBox.style.width = `${PHONE_W * scale}px`;
        scaleBox.style.height = `${PHONE_H * scale}px`;
      }
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(stage);
    if (container) observer.observe(container);
    window.addEventListener('resize', update);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', update);
    };
  }, []);

  return (
    <div className="storefront-phone-stage" ref={stageRef}>
      <div className="storefront-phone-scale-box">
        <div className="storefront-phone-device" ref={deviceRef}>
          <span className="storefront-phone-rail storefront-phone-rail-left-1" aria-hidden />
          <span className="storefront-phone-rail storefront-phone-rail-left-2" aria-hidden />
          <span className="storefront-phone-rail storefront-phone-rail-left-3" aria-hidden />
          <span className="storefront-phone-rail storefront-phone-rail-right-1" aria-hidden />
          <span className="storefront-phone-island" aria-hidden />
          <div className="storefront-phone-screen">
            <div className="storefront-phone-overlay" style={{ background: overlayBackground }}>
              <div className="storefront-phone-statusbar" style={{ color: chromeColor }}>
                <span>9:41</span>
                <span className="storefront-phone-status-right">
                  <StatusSignalIcon color={chromeColor} />
                  <StatusWifiIcon color={chromeColor} />
                  <StatusBatteryIcon color={chromeColor} />
                </span>
              </div>
              <div className="storefront-phone-capsule-wrap" style={{ boxShadow: navShadow }}>
                <MiniProgramCapsule borderColor={chromeBorder} />
              </div>
            </div>
            <div ref={scrollRef} className="storefront-phone-scroll">
              <div
                style={{
                  background: context.color_palette.bg,
                  width: '100%',
                  maxWidth: context.page_width,
                  borderRadius: context.radius,
                  overflow: 'hidden',
                  margin: '0 auto',
                }}
              >
                <div style={{ position: 'relative' }}>
                  {resolved.modules.map((module) => (
                    <ModuleRenderer
                      key={module.id}
                      projectId={projectId}
                      module={module}
                      designContext={context}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="storefront-phone-home-indicator" aria-hidden />
          </div>
        </div>
      </div>
    </div>
  );
}
