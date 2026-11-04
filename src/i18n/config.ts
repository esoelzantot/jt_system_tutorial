export const LANGUAGES = [
  { code: 'ar', name: 'العربية', htmlLang: 'ar', dir: 'rtl' },
  { code: 'en', name: 'English', htmlLang: 'en', dir: 'ltr' },
  { code: 'zh', name: '中文', htmlLang: 'zh-CN', dir: 'ltr' },
] as const;

export type Lang = (typeof LANGUAGES)[number]['code'];

/** Languages stored as translations; Arabic is the base text of every document. */
export type TranslationLang = Exclude<Lang, 'ar'>;
export const TRANSLATION_LANGS: readonly TranslationLang[] = ['en', 'zh'];

export const DEFAULT_LANG: Lang = 'ar';

export const languageInfo = (lang: Lang) => LANGUAGES.find((l) => l.code === lang)!;
const isLang = (value: unknown): value is Lang => LANGUAGES.some((l) => l.code === value);

const STORAGE_KEY = 'jt-lang';
const URL_PARAM = 'lang';

/** A link's ?lang= wins (so links can be shared), then the visitor's last choice, then Arabic. */
export function detectLanguage(): Lang {
  const fromUrl = new URLSearchParams(window.location.search).get(URL_PARAM);
  if (isLang(fromUrl)) return fromUrl;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (isLang(stored)) return stored;
  } catch {
    /* storage unavailable: use the default */
  }
  return DEFAULT_LANG;
}

/** Remembers the choice and keeps the address shareable (Arabic needs no parameter). */
export function persistLanguage(lang: Lang) {
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    /* storage unavailable: the choice lasts until the page is closed */
  }
  const url = new URL(window.location.href);
  if (lang === DEFAULT_LANG) url.searchParams.delete(URL_PARAM);
  else url.searchParams.set(URL_PARAM, lang);
  window.history.replaceState(window.history.state, '', url);
}
