import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { A } from '../strings';
import { Dialog } from './Dialog';
import { Icon } from './Icon';

// ---------- toasts ----------

interface Toast {
  id: number;
  kind: 'success' | 'error';
  text: string;
}

// ---------- confirm ----------

interface ConfirmOptions {
  title: string;
  text: string;
  confirmLabel: string;
  cancelLabel?: string;
  danger?: boolean;
}

interface Feedback {
  toast: (text: string, kind?: Toast['kind']) => void;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const FeedbackContext = createContext<Feedback | null>(null);

export function useFeedback() {
  const ctx = useContext(FeedbackContext);
  if (!ctx) throw new Error('useFeedback must be used inside <FeedbackProvider>');
  return ctx;
}

/** Toasts and a promise-based confirm dialog for the whole dashboard. */
export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);
  const [pending, setPending] = useState<(ConfirmOptions & { resolve: (ok: boolean) => void }) | null>(null);

  const toast = useCallback((text: string, kind: Toast['kind'] = 'success') => {
    const id = ++nextId.current;
    setToasts((list) => [...list, { id, kind, text }]);
    window.setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), 3500);
  }, []);

  const confirm = useCallback(
    (options: ConfirmOptions) => new Promise<boolean>((resolve) => setPending({ ...options, resolve })),
    [],
  );

  const settle = (ok: boolean) => {
    pending?.resolve(ok);
    setPending(null);
  };

  return (
    <FeedbackContext.Provider value={{ toast, confirm }}>
      {children}

      <Dialog open={pending !== null} onRequestClose={() => settle(false)} labelledBy="adm-confirm-title">
        {pending && (
          <div className="adm-dialog__body">
            {pending.danger && (
              <span className="adm-dialog__icon">
                <Icon name="alert" />
              </span>
            )}
            <h2 id="adm-confirm-title" className="adm-dialog__title">
              {pending.title}
            </h2>
            <p className="adm-dialog__text">{pending.text}</p>
            <div className="adm-dialog__actions">
              <button type="button" className="adm-btn adm-btn--ghost" onClick={() => settle(false)}>
                {pending.cancelLabel ?? A.cancel}
              </button>
              <button
                type="button"
                className={`adm-btn ${pending.danger ? 'adm-btn--danger' : 'adm-btn--primary'}`}
                onClick={() => settle(true)}
                autoFocus
              >
                {pending.confirmLabel}
              </button>
            </div>
          </div>
        )}
      </Dialog>

      <div className="adm-toasts" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`adm-toast adm-toast--${t.kind}`}>
            <Icon name={t.kind === 'success' ? 'check' : 'alert'} />
            {t.text}
          </div>
        ))}
      </div>
    </FeedbackContext.Provider>
  );
}
