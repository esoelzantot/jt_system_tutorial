import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { LANGUAGES, languageInfo, type Lang } from '../../i18n/config';
import { useI18n } from '../../i18n/I18nContext';
import './LanguageSwitcher.css';

interface Props {
  onChange: (lang: Lang) => void;
}

/** Language menu for the header. Each name is shown in its own language so it can always be found. */
export function LanguageSwitcher({ onChange }: Props) {
  const { lang, t } = useI18n();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  const items = () => [...(rootRef.current?.querySelectorAll<HTMLElement>('[role="menuitemradio"]') ?? [])];

  // Opening moves focus to the current language, as a menu should.
  useEffect(() => {
    if (open) rootRef.current?.querySelector<HTMLElement>('[aria-checked="true"]')?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  const close = () => {
    setOpen(false);
    buttonRef.current?.focus();
  };

  const onMenuKeyDown = (e: KeyboardEvent) => {
    const list = items();
    const i = list.indexOf(document.activeElement as HTMLElement);
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
    } else if (e.key === 'Tab') {
      setOpen(false);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      list[(i + 1) % list.length]?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      list[(i - 1 + list.length) % list.length]?.focus();
    } else if (e.key === 'Home') {
      e.preventDefault();
      list[0]?.focus();
    } else if (e.key === 'End') {
      e.preventDefault();
      list[list.length - 1]?.focus();
    }
  };

  return (
    <div ref={rootRef} className="lang" onKeyDown={open ? onMenuKeyDown : undefined}>
      <button
        ref={buttonRef}
        type="button"
        className="lang__button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={`${t.chooseLanguage}: ${languageInfo(lang).name}`}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
            e.preventDefault();
            setOpen(true);
          }
        }}
      >
        <svg className="lang__globe" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.500 5.600 12 3z" />
        </svg>
        <span className="lang__current" lang={languageInfo(lang).htmlLang}>
          {languageInfo(lang).name}
        </span>
        <svg className="lang__chevron" viewBox="0 0 24 24" aria-hidden="true">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div id={menuId} className="lang__menu" role="menu" aria-label={t.chooseLanguage}>
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              type="button"
              role="menuitemradio"
              aria-checked={l.code === lang}
              lang={l.htmlLang}
              dir={l.dir}
              className="lang__item"
              onClick={() => {
                if (l.code !== lang) onChange(l.code);
                close();
              }}
            >
              <span>{l.name}</span>
              {l.code === lang && (
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="m5 12.500 4.500 4.500L19 7.500" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
