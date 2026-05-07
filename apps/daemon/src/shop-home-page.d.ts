export const SHOP_HOME_PAGE_REFERENCE_STATE_FILE: 'shop-home-page.reference-state.json';
export const SHOP_HOME_PAGE_SCHEMA_FILE: 'shop-home-page.schema.json';

export function shopHomePageSkillDir(projectRoot: string): string;

export function createSeedSchema(
  requirements: Record<string, unknown>,
  styleGuide: Record<string, unknown> | null | undefined,
  options?: { skipSeedImagePrompts?: boolean } | null,
): any;

export function initializeShopHomePageTemplateProject(
  projectsRoot: string,
  projectId: string,
  projectRoot: string,
  metadata: Record<string, unknown> | null | undefined,
): Promise<void>;

export function loadShopHomePageState(
  projectsRoot: string,
  projectId: string,
  skillRoot: string,
  metadata?: Record<string, unknown> | null,
): Promise<any>;

export function applyShopHomePageSchemaText(
  projectsRoot: string,
  projectId: string,
  skillRoot: string,
  schemaText: string,
  moduleSpecs?: unknown,
): Promise<any>;

export function collectAssetTasks(schema: any): any[];
