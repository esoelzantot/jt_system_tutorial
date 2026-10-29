import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { UI } from '../../constants/ui';
import { MAX_SCALE, MIN_SCALE, useZoomPan } from '../../hooks/useZoomPan';
import type { TutorialImage } from '../../types/tutorial';
import './ImageViewer.css';

interface Props {
  image: TutorialImage;
  onClose: () => void;
}

/**
 * Full-screen, zoomable screenshot viewer. Opening it locks page scrolling without
 * moving the page, and closing it returns focus to the element that opened it, so the
 * reader's place in the tutorial (and any open answers) is untouched.
 */
export function ImageViewer({ image, onClose }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const { scale, x, y, zoomIn, zoomOut, reset } = useZoomPan(stageRef, imageRef);

  // Scroll lock + focus management.
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const root = document.documentElement;
    const previousOverflow = root.style.overflow;
    root.style.overflow = 'hidden';
    closeRef.current?.focus();

    return () => {
      root.style.overflow = previousOverflow;
      opener?.focus({ preventScroll: true });
    };
  }, []);

  // Keyboard: Escape closes, +/-/0 zoom, Tab stays inside the dialog.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === '+' || e.key === '=') {
        zoomIn();
      } else if (e.key === '-') {
        zoomOut();
      } else if (e.key === '0') {
        reset();
      } else if (e.key === 'Tab') {
        const focusable = dialogRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled)');
        if (!focusable || focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose, zoomIn, zoomOut, reset]);

  return createPortal(
    <div ref={dialogRef} className="viewer" role="dialog" aria-modal="true" aria-label={UI.viewerLabel}>
      <div className="viewer__toolbar">
        <p className="viewer__caption" dir="auto">
          {image.alt}
        </p>
        <div className="viewer__controls">
          <button type="button" className="viewer__button" onClick={zoomOut} disabled={scale <= MIN_SCALE} aria-label={UI.zoomOut} title={UI.zoomOut}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5M8 11h6" />
            </svg>
          </button>
          <span className="viewer__zoom-level" aria-live="polite">
            {Math.round(scale * 100)}%
          </span>
          <button type="button" className="viewer__button" onClick={zoomIn} disabled={scale >= MAX_SCALE} aria-label={UI.zoomIn} title={UI.zoomIn}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5M11 8v6M8 11h6" />
            </svg>
          </button>
          <button type="button" className="viewer__button" onClick={reset} disabled={scale === 1 && x === 0 && y === 0} aria-label={UI.resetZoom} title={UI.resetZoom}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 12a8 8 0 1 0 2.4-5.7M4 4v4h4" />
            </svg>
          </button>
          <button ref={closeRef} type="button" className="viewer__button viewer__button--close" onClick={onClose} aria-label={UI.close} title={UI.close}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>
      </div>

      <div ref={stageRef} className={`viewer__stage${scale > 1 ? ' viewer__stage--zoomed' : ''}`}>
        {status === 'loading' && <span className="viewer__spinner" aria-label={UI.loading} />}
        {status === 'error' && <p className="viewer__error">{UI.imageLoadError}</p>}
        <img
          ref={imageRef}
          className="viewer__image"
          src={image.url}
          alt={image.alt}
          draggable={false}
          onLoad={() => setStatus('ready')}
          onError={() => setStatus('error')}
          style={{
            transform: `translate(${x}px, ${y}px) scale(${scale})`,
            visibility: status === 'ready' ? 'visible' : 'hidden',
          }}
        />
      </div>
    </div>,
    document.body,
  );
}
