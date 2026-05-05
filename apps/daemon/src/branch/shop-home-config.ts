export const SHOP_HOME_PAGE_KIND = 'shopHomePage';
export const LEGACY_STOREFRONT_KIND = 'storefront';

export function isBranchShopHomePageProject(project: {
  metadata?: { kind?: string | null } | null;
} | null | undefined) {
  const kind = project?.metadata?.kind;
  return kind === SHOP_HOME_PAGE_KIND || kind === LEGACY_STOREFRONT_KIND;
}
