import { UI } from '../../constants/ui';
import './StatusMessage.css';

interface Props {
  kind: 'empty' | 'error';
  title: string;
  hint?: string;
  onRetry?: () => void;
}

export function StatusMessage({ kind, title, hint, onRetry }: Props) {
  return (
    <div className={`status status--${kind}`} role={kind === 'error' ? 'alert' : undefined}>
      <svg className="status__icon" viewBox="0 0 24 24" aria-hidden="true">
        {kind === 'error' ? (
          <>
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7.5v5.5M12 16.5v.01" />
          </>
        ) : (
          <>
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5M8.5 11h5" />
          </>
        )}
      </svg>
      <p className="status__title">{title}</p>
      {hint && <p className="status__hint">{hint}</p>}
      {onRetry && (
        <button type="button" className="button button--primary" onClick={onRetry}>
          {UI.retry}
        </button>
      )}
    </div>
  );
}

/** Placeholder shaped like the content, shown while Firestore loads. */
export function LoadingSkeleton() {
  return (
    <div className="skeleton" role="status" aria-live="polite">
      <span className="visually-hidden">{UI.loading}</span>
      {[0, 1].map((section) => (
        <div key={section} className="skeleton__section" aria-hidden="true">
          <div className="skeleton__line skeleton__line--title" />
          {[0, 1, 2].map((row) => (
            <div key={row} className="skeleton__row" />
          ))}
        </div>
      ))}
    </div>
  );
}
