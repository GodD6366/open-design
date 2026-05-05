import type { Locale } from '../i18n';
import type { CreateTab } from '../components/NewProjectPanel';
import { SHOP_HOMEPAGE_KIND, isShopHomePageKind } from '../types';

export function getForcedLocale(): Locale {
  return 'zh-CN';
}

export function shouldShowLanguageUI(): boolean {
  return false;
}

export function getCreateEntryPolicy(): {
  visibleTabs: CreateTab[];
  defaultTab: CreateTab;
} {
  return {
    visibleTabs: [SHOP_HOMEPAGE_KIND],
    defaultTab: SHOP_HOMEPAGE_KIND,
  };
}

export function shouldRouteToShopHomePageView(project: {
  metadata?: { kind?: string | null } | null;
} | null | undefined): boolean {
  return isShopHomePageKind(project?.metadata?.kind);
}
