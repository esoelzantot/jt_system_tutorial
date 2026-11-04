import { useId } from 'react';
import { useI18n } from '../../i18n/I18nContext';
import './SearchBar.css';

interface Props {
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
  disabled?: boolean;
}

export function SearchBar({ value, onChange, onClear, disabled }: Props) {
  const { t } = useI18n();
  const inputId = useId();

  return (
    <div className="search-bar" role="search">
      <label htmlFor={inputId} className="visually-hidden">
        {t.searchLabel}
      </label>
      <svg className="search-bar__icon" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
      <input
        id={inputId}
        className="search-bar__input"
        type="search"
        // While empty the field follows the page, so the placeholder sits on the correct side.
        dir={value ? 'auto' : undefined}
        autoComplete="off"
        spellCheck={false}
        placeholder={t.searchPlaceholder}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape' && value) {
            e.preventDefault();
            onClear();
          }
        }}
      />
      {value && (
        <button type="button" className="search-bar__clear" onClick={onClear} aria-label={t.clearSearch}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
      )}
    </div>
  );
}
