import { useEffect, useRef, type ReactNode } from 'react';

interface Props {
  open: boolean;
  /** Called for Esc / backdrop clicks; return without closing to keep it open. */
  onRequestClose: () => void;
  labelledBy: string;
  className?: string;
  children: ReactNode;
}

/** Native modal <dialog>: focus trapping, Esc and the top layer come for free. */
export function Dialog({ open, onRequestClose, labelledBy, className = '', children }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={`adm-dialog ${className}`}
      aria-labelledby={labelledBy}
      onCancel={(e) => {
        e.preventDefault();
        onRequestClose();
      }}
      onMouseDown={(e) => {
        // A press on the backdrop lands on the <dialog> element itself.
        if (e.target === e.currentTarget) onRequestClose();
      }}
    >
      {open && children}
    </dialog>
  );
}
