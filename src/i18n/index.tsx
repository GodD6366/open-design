'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { en } from './locales/en';
import { ptBR } from './locales/pt-BR';
import { zhCN } from './locales/zh-CN';
import type { Dict, Locale } from './types';

export { LOCALES, LOCALE_LABEL } from './types';
export type { Locale } from './types';

type DictKey = keyof Dict;

const DICTS: Record<Locale, Dict> = {
  'en': en,
  'zh-CN': zhCN,
  'pt-BR': ptBR,
};

const LS_KEY = 'open-design:locale';
const FORCED_LOCALE: Locale = 'zh-CN';

function detectInitialLocale(): Locale {
  return FORCED_LOCALE;
}

interface I18nContextValue {
  locale: Locale;
  setLocale: (next: Locale) => void;
  t: (key: DictKey, vars?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

interface ProviderProps {
  initial?: Locale;
  children: ReactNode;
}

export function I18nProvider({ initial, children }: ProviderProps) {
  const [locale, setLocaleState] = useState<Locale>(() => initial ?? detectInitialLocale());

  // Keep <html lang="…"> in sync so screen readers and CSS hooks pick the
  // right language token without each component having to set lang itself.
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('lang', locale);
    }
  }, [locale]);

  useEffect(() => {
    try {
      window.localStorage.setItem(LS_KEY, FORCED_LOCALE);
    } catch {
      /* ignore */
    }
  }, []);

  const setLocale = useCallback((_next: Locale) => {
    setLocaleState(FORCED_LOCALE);
    try {
      window.localStorage.setItem(LS_KEY, FORCED_LOCALE);
    } catch {
      /* ignore */
    }
  }, []);

  const t = useCallback(
    (key: DictKey, vars?: Record<string, string | number>): string => {
      const dict = DICTS[locale] ?? en;
      const raw = dict[key] ?? en[key] ?? key;
      if (!vars) return raw;
      return raw.replace(/\{(\w+)\}/g, (_, name: string) => {
        const v = vars[name];
        return v == null ? `{${name}}` : String(v);
      });
    },
    [locale],
  );

  const value = useMemo<I18nContextValue>(
    () => ({ locale, setLocale, t }),
    [locale, setLocale, t],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    // Fall back to a stand-alone Chinese translator when no provider is
    // mounted (e.g. an isolated test). This keeps the API safe to call
    // without requiring every callsite to wrap in a provider.
    return {
      locale: FORCED_LOCALE,
      setLocale: () => {},
      t: (key, vars) => {
        const raw = zhCN[key] ?? en[key] ?? key;
        if (!vars) return raw;
        return raw.replace(/\{(\w+)\}/g, (_, n: string) => {
          const v = vars[n];
          return v == null ? `{${n}}` : String(v);
        });
      },
    };
  }
  return ctx;
}

// Convenience for components that only need the translator function.
export function useT(): I18nContextValue['t'] {
  return useI18n().t;
}
