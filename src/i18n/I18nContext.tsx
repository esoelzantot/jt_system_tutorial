import { createContext, useCallback, useContext, useLayoutEffect, useMemo, useState, type ReactNode } from 'react';
import { detectLanguage, languageInfo, persistLanguage, type Lang } from './config';
import { ar, type Messages } from './messages/ar';
import { en } from './messages/en';
import { zh } from './messages/zh';

const MESSAGES: Record<Lang, Messages> = { ar, en, zh };

interface I18nValue {
  lang: Lang;
  dir: 'rtl' | 'ltr';
  t: Messages;
  setLang: (lang: Lang) => void;
}

const I18nContext = createContext<I18nValue | null>(null);

export function useI18n() {
  const value = useContext(I18nContext);
  if (!value) throw new Error('useI18n must be used inside a language provider');
  return value;
}

const contextValue = (lang: Lang, setLang: (lang: Lang) => void): I18nValue => ({
  lang,
  dir: languageInfo(lang).dir,
  t: MESSAGES[lang],
  setLang,
});

/** The public site's language: applied to <html>, remembered and reflected in the address. */
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(detectLanguage);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    persistLanguage(next);
  }, []);

  // Layout effect: direction and font switch in the same paint as the text.
  useLayoutEffect(() => {
    const { htmlLang, dir } = languageInfo(lang);
    const root = document.documentElement;
    root.lang = htmlLang;
    root.dir = dir;
    document.title = `${MESSAGES[lang].title} | ${MESSAGES[lang].brand}`;
    document.querySelector('meta[name="description"]')?.setAttribute('content', MESSAGES[lang].metaDescription);
  }, [lang]);

  const value = useMemo(() => contextValue(lang, setLang), [lang, setLang]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

const noop = () => {};

/** A fixed language for a subtree, without touching the page (the dashboard's preview). */
export function FixedLanguage({ lang, children }: { lang: Lang; children: ReactNode }) {
  const value = useMemo(() => contextValue(lang, noop), [lang]);
  return (
    <I18nContext.Provider value={value}>
      <div dir={value.dir} lang={languageInfo(lang).htmlLang}>
        {children}
      </div>
    </I18nContext.Provider>
  );
}
