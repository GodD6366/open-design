export interface ShopHomePageReferenceRegion {
  source_image: string;
  x: number;
  y: number;
  width: number;
  height: number;
  output_file?: string;
}

export interface ShopHomePageUserAssetsEntryReferenceRegion
  extends ShopHomePageReferenceRegion {
  target_label: string;
}

export interface ShopHomePageReferenceRegions {
  top_slider?: ShopHomePageReferenceRegion | null;
  user_assets?: {
    strip?: ShopHomePageReferenceRegion | null;
    entries?: ShopHomePageUserAssetsEntryReferenceRegion[];
  } | null;
}

const TOP_SLIDER_REFERENCE_FILE = 'top-slider-ref-hero.png';
const USER_ASSETS_STRIP_REFERENCE_FILE = 'user-assets-ref-strip.png';

function stringOr(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function clampUnit(value: unknown, fallback = 0): number {
  const num = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.min(1, Math.max(0, num));
}

function normalizeOutputFile(value: unknown): string | undefined {
  const fileName = stringOr(value);
  return fileName || undefined;
}

function normalizeRegionBase(input: unknown): ShopHomePageReferenceRegion | null {
  const source_image = stringOr((input as ShopHomePageReferenceRegion | null)?.source_image);
  if (!source_image) return null;
  const x = clampUnit((input as ShopHomePageReferenceRegion | null)?.x, 0);
  const y = clampUnit((input as ShopHomePageReferenceRegion | null)?.y, 0);
  const width = Math.min(1 - x, clampUnit((input as ShopHomePageReferenceRegion | null)?.width, 0));
  const height = Math.min(1 - y, clampUnit((input as ShopHomePageReferenceRegion | null)?.height, 0));
  if (width <= 0 || height <= 0) return null;
  const output_file = normalizeOutputFile((input as ShopHomePageReferenceRegion | null)?.output_file);
  return {
    source_image,
    x,
    y,
    width,
    height,
    ...(output_file ? { output_file } : {}),
  };
}

export function normalizeShopHomePageReferenceRegion(
  input: unknown,
): ShopHomePageReferenceRegion | null {
  return normalizeRegionBase(input);
}

export function normalizeShopHomePageReferenceTargetLabel(value: unknown): string {
  return stringOr(value)
    .normalize('NFKC')
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

export function normalizeShopHomePageReferenceRegions(
  input: unknown,
): ShopHomePageReferenceRegions | undefined {
  if (!input || typeof input !== 'object') return undefined;
  const root = input as ShopHomePageReferenceRegions;
  const top_slider = normalizeRegionBase(root.top_slider);
  const strip = normalizeRegionBase(root.user_assets?.strip);
  const entries = Array.isArray(root.user_assets?.entries)
    ? root.user_assets.entries
        .map((entry) => {
          const region = normalizeRegionBase(entry);
          const target_label = stringOr(entry?.target_label);
          if (!region || !target_label) return null;
          return {
            ...region,
            target_label,
          };
        })
        .filter((entry): entry is ShopHomePageUserAssetsEntryReferenceRegion => Boolean(entry))
    : [];

  if (!top_slider && !strip && entries.length === 0) return undefined;
  return {
    ...(top_slider ? { top_slider } : {}),
    ...(strip || entries.length > 0
      ? {
          user_assets: {
            ...(strip ? { strip } : {}),
            ...(entries.length > 0 ? { entries } : {}),
          },
        }
      : {}),
  };
}

export function shopHomePageTopSliderReferenceFileName(
  region?: ShopHomePageReferenceRegion | null,
): string {
  return stringOr(region?.output_file) || TOP_SLIDER_REFERENCE_FILE;
}

export function shopHomePageUserAssetsStripReferenceFileName(
  region?: ShopHomePageReferenceRegion | null,
): string {
  return stringOr(region?.output_file) || USER_ASSETS_STRIP_REFERENCE_FILE;
}

export function shopHomePageUserAssetsEntryReferenceFileName(
  region: ShopHomePageUserAssetsEntryReferenceRegion,
  index: number,
): string {
  return stringOr(region?.output_file) || `user-assets-ref-entry-${index + 1}.png`;
}

export function findShopHomePageUserAssetsEntryReferenceRegion(
  referenceRegions: ShopHomePageReferenceRegions | undefined,
  targetLabel: string,
): { region: ShopHomePageUserAssetsEntryReferenceRegion; index: number } | null {
  const entries = referenceRegions?.user_assets?.entries ?? [];
  const normalizedTarget = normalizeShopHomePageReferenceTargetLabel(targetLabel);
  if (!normalizedTarget) return null;
  for (let index = 0; index < entries.length; index += 1) {
    const region = entries[index];
    if (!region) continue;
    if (
      normalizeShopHomePageReferenceTargetLabel(region.target_label) ===
      normalizedTarget
    ) {
      return { region, index };
    }
  }
  return null;
}

export function getShopHomePageTopSliderReferenceImages(
  referenceRegions: ShopHomePageReferenceRegions | undefined,
): string[] {
  const region = referenceRegions?.top_slider;
  return region ? [shopHomePageTopSliderReferenceFileName(region)] : [];
}

export function getShopHomePageUserAssetsReferenceImages(
  referenceRegions: ShopHomePageReferenceRegions | undefined,
  targetLabel: string,
): string[] {
  const files: string[] = [];
  const match = findShopHomePageUserAssetsEntryReferenceRegion(
    referenceRegions,
    targetLabel,
  );
  if (match) {
    files.push(
      shopHomePageUserAssetsEntryReferenceFileName(match.region, match.index),
    );
  }
  const strip = referenceRegions?.user_assets?.strip;
  if (strip) {
    files.push(shopHomePageUserAssetsStripReferenceFileName(strip));
  }
  return [...new Set(files.filter(Boolean))];
}

export function listShopHomePageReferenceRegionOutputFiles(
  referenceRegions: ShopHomePageReferenceRegions | undefined,
): string[] {
  const files: string[] = [];
  if (referenceRegions?.top_slider) {
    files.push(shopHomePageTopSliderReferenceFileName(referenceRegions.top_slider));
  }
  if (referenceRegions?.user_assets?.strip) {
    files.push(
      shopHomePageUserAssetsStripReferenceFileName(
        referenceRegions.user_assets.strip,
      ),
    );
  }
  for (let index = 0; index < (referenceRegions?.user_assets?.entries ?? []).length; index += 1) {
    const entry = referenceRegions?.user_assets?.entries?.[index];
    if (!entry) continue;
    files.push(shopHomePageUserAssetsEntryReferenceFileName(entry, index));
  }
  return [...new Set(files.filter(Boolean))];
}
