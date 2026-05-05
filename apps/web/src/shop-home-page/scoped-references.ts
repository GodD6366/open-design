import {
  getShopHomePageTopSliderReferenceImages,
  getShopHomePageUserAssetsReferenceImages,
  normalizeShopHomePageReferenceRegions,
  shopHomePageTopSliderReferenceFileName,
  shopHomePageUserAssetsEntryReferenceFileName,
  shopHomePageUserAssetsStripReferenceFileName,
  type ShopHomePageReferenceRegion,
  type ShopHomePageReferenceRegions,
  type ShopHomePageUserAssetsEntryReferenceRegion,
} from '@open-design/contracts/shop-home-page-reference-regions';
import {
  projectFileUrl,
  writeProjectBase64File,
} from '../providers/registry';
import type { ProjectFile } from '../types';
import { SHOP_HOME_PAGE_STYLE_GUIDE_FILE } from './constants';
import type {
  ShopHomePageSchema,
  ShopHomePageState,
  ShopHomePageStyleGuide,
} from './types';

export interface ShopHomePageReferenceCropJob {
  sourceFileName: string;
  outputFileName: string;
  region: ShopHomePageReferenceRegion | ShopHomePageUserAssetsEntryReferenceRegion;
}

function arrayEqual(left: string[] | undefined, right: string[] | undefined): boolean {
  const a = Array.isArray(left) ? left : [];
  const b = Array.isArray(right) ? right : [];
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

function normalizeReferenceImages(value: unknown): string[] {
  return Array.isArray(value)
    ? [...new Set(value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0))]
    : [];
}

function fileMtime(files: ProjectFile[], fileName: string): number | null {
  return files.find((file) => file.name === fileName)?.mtime ?? null;
}

function styleGuideReferenceRegions(styleGuide: ShopHomePageStyleGuide): ShopHomePageReferenceRegions | undefined {
  return normalizeShopHomePageReferenceRegions(styleGuide.reference_regions);
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Could not load image: ${url}`));
    image.src = url;
  });
}

function dataUrlBase64(dataUrl: string): string {
  const comma = dataUrl.indexOf(',');
  return comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
}

function shouldReplaceReferences(
  currentRefs: string[],
  pageLevelRefs: string[],
  desiredRefs: string[],
): boolean {
  if (arrayEqual(currentRefs, desiredRefs)) return false;
  if (currentRefs.length === 0) return desiredRefs.length > 0;
  if (arrayEqual(currentRefs, pageLevelRefs)) return true;
  return false;
}

function resolveUserAssetsEntryLabel(entry: any): string {
  if (typeof entry?.title === 'string' && entry.title.trim()) return entry.title.trim();
  if (typeof entry?.image_prompt_schema?.entry?.title === 'string' && entry.image_prompt_schema.entry.title.trim()) {
    return entry.image_prompt_schema.entry.title.trim();
  }
  if (typeof entry?.image_prompt_schema?.content?.title === 'string' && entry.image_prompt_schema.content.title.trim()) {
    return entry.image_prompt_schema.content.title.trim();
  }
  return '';
}

function resolveUserAssetsEntryDesiredRefs(
  referenceRegions: ShopHomePageReferenceRegions | undefined,
  entryLabel: string,
): string[] {
  return getShopHomePageUserAssetsReferenceImages(referenceRegions, entryLabel);
}

function collectReferenceCropJobs(
  styleGuide: ShopHomePageStyleGuide,
): ShopHomePageReferenceCropJob[] {
  const referenceRegions = styleGuideReferenceRegions(styleGuide);
  if (!referenceRegions) return [];

  const jobs: ShopHomePageReferenceCropJob[] = [];
  if (referenceRegions.top_slider) {
    jobs.push({
      sourceFileName: referenceRegions.top_slider.source_image,
      outputFileName: shopHomePageTopSliderReferenceFileName(
        referenceRegions.top_slider,
      ),
      region: referenceRegions.top_slider,
    });
  }
  if (referenceRegions.user_assets?.strip) {
    jobs.push({
      sourceFileName: referenceRegions.user_assets.strip.source_image,
      outputFileName: shopHomePageUserAssetsStripReferenceFileName(
        referenceRegions.user_assets.strip,
      ),
      region: referenceRegions.user_assets.strip,
    });
  }
  for (
    let index = 0;
    index < (referenceRegions.user_assets?.entries ?? []).length;
    index += 1
  ) {
    const region = referenceRegions.user_assets?.entries?.[index];
    if (!region) continue;
    jobs.push({
      sourceFileName: region.source_image,
      outputFileName: shopHomePageUserAssetsEntryReferenceFileName(region, index),
      region,
    });
  }
  return jobs;
}

export function needsShopHomePageReferenceMaterialization(
  job: ShopHomePageReferenceCropJob,
  files: ProjectFile[],
): boolean {
  const styleGuideMtime = fileMtime(files, SHOP_HOME_PAGE_STYLE_GUIDE_FILE) ?? 0;
  const sourceMtime = fileMtime(files, job.sourceFileName) ?? 0;
  const outputMtime = fileMtime(files, job.outputFileName);
  if (outputMtime === null) return true;
  return outputMtime < Math.max(styleGuideMtime, sourceMtime);
}

export async function cropShopHomePageReferenceRegionToDataUrl(
  projectId: string,
  region: ShopHomePageReferenceRegion,
): Promise<string> {
  const image = await loadImage(projectFileUrl(projectId, region.source_image));
  const sourceX = Math.round(region.x * image.naturalWidth);
  const sourceY = Math.round(region.y * image.naturalHeight);
  const sourceWidth = Math.max(1, Math.round(region.width * image.naturalWidth));
  const sourceHeight = Math.max(1, Math.round(region.height * image.naturalHeight));
  const width = Math.max(1, Math.min(sourceWidth, image.naturalWidth - sourceX));
  const height = Math.max(1, Math.min(sourceHeight, image.naturalHeight - sourceY));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Canvas is unavailable in this browser.');
  }
  context.drawImage(
    image,
    sourceX,
    sourceY,
    width,
    height,
    0,
    0,
    width,
    height,
  );
  return canvas.toDataURL('image/png');
}

export async function materializeShopHomePageReferenceRegions(
  projectId: string,
  styleGuide: ShopHomePageStyleGuide,
  files: ProjectFile[],
): Promise<{ wroteFiles: boolean; ready: boolean }> {
  const jobs = collectReferenceCropJobs(styleGuide).filter((job) =>
    files.some((file) => file.name === job.sourceFileName) &&
    needsShopHomePageReferenceMaterialization(job, files),
  );
  if (jobs.length === 0) return { wroteFiles: false, ready: true };

  let wroteFiles = false;
  let ready = true;
  for (const job of jobs) {
    const dataUrl = await cropShopHomePageReferenceRegionToDataUrl(
      projectId,
      job.region,
    );
    const file = await writeProjectBase64File(
      projectId,
      job.outputFileName,
      dataUrlBase64(dataUrl),
    );
    if (file) {
      wroteFiles = true;
    } else {
      ready = false;
    }
  }
  return { wroteFiles, ready };
}

export function backfillShopHomePageScopedReferenceImages(
  schema: ShopHomePageSchema | null,
  styleGuide: ShopHomePageStyleGuide,
): { schema: ShopHomePageSchema | null; changed: boolean } {
  if (!schema) return { schema, changed: false };
  const referenceRegions = styleGuideReferenceRegions(styleGuide);
  if (!referenceRegions) return { schema, changed: false };

  const pageLevelRefs = normalizeReferenceImages(styleGuide.reference_images);
  const next = JSON.parse(JSON.stringify(schema)) as ShopHomePageSchema;
  let changed = false;

  for (const module of next.modules as any[]) {
    if (module?.type === 'top_slider' && Array.isArray(module?.data?.items)) {
      const desiredRefs = getShopHomePageTopSliderReferenceImages(referenceRegions);
      if (desiredRefs.length === 0) continue;
      for (const item of module.data.items) {
        const currentRefs = normalizeReferenceImages(item?.reference_images);
        if (!shouldReplaceReferences(currentRefs, pageLevelRefs, desiredRefs)) continue;
        item.reference_images = desiredRefs;
        changed = true;
      }
      continue;
    }

    if (module?.type === 'user_assets' && Array.isArray(module?.data?.entries)) {
      for (const entry of module.data.entries) {
        const entryLabel = resolveUserAssetsEntryLabel(entry);
        const desiredRefs = resolveUserAssetsEntryDesiredRefs(
          referenceRegions,
          entryLabel,
        );
        const currentRefs = normalizeReferenceImages(entry?.reference_images);
        if (!shouldReplaceReferences(currentRefs, pageLevelRefs, desiredRefs)) {
          continue;
        }
        entry.reference_images = desiredRefs;
        changed = true;
      }
    }
  }

  return { schema: changed ? next : schema, changed };
}

export async function syncShopHomePageScopedReferences(
  projectId: string,
  state: ShopHomePageState,
): Promise<{ wroteFiles: boolean; nextSchemaText: string | null }> {
  const { wroteFiles, ready } = await materializeShopHomePageReferenceRegions(
    projectId,
    state.styleGuide,
    state.files,
  );
  const { schema, changed } = backfillShopHomePageScopedReferenceImages(
    state.schema,
    state.styleGuide,
  );
  return {
    wroteFiles,
    nextSchemaText:
      changed && schema && ready
        ? `${JSON.stringify(schema, null, 2)}\n`
        : null,
  };
}

export const __testOnly = {
  collectReferenceCropJobs,
  resolveUserAssetsEntryDesiredRefs,
  resolveUserAssetsEntryLabel,
  styleGuideReferenceRegions,
};
