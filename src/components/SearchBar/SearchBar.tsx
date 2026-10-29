import { useId } from 'react';
import { UI } from '../../constants/ui';
import './SearchBar.css';

interface Props {
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
  disabled?: boolean;
}

export function SearchBar({ value, onChange, onClear, disabled }: Props) {
  const inputId = useId();

  return (
    <div className="search-bar" role="search">
      <label htmlFor={inputId} className="visually-hidden">
        {UI.searchLabel}
      </label>
      <svg className="search-bar__icon" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
      <input
        id={inputId}
        className="search-bar__input"
        type="search"
        dir="auto"
        autoComplete="off"
        spellCheck={false}
        placeholder={UI.searchPlaceholder}
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
        <button type="button" className="search-bar__clear" onClick={onClear} aria-label={UI.clearSearch}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
      )}
    </div>
  );
}
