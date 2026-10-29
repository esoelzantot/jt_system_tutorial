import { useLayoutEffect, useState, type RefObject } from 'react';

/**
 * Tracks the height of the sticky header and exposes it as `--sticky-offset`,
 * which drives `scroll-margin-top` so scrolled-to headings are never hidden.
 */
export function useStickyOffset(ref: RefObject<HTMLElement | null>) {
  const [offset, setOffset] = useState(0);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const update = () => {
      const height = Math.round(el.getBoundingClientRect().height);
      setOffset(height);
      document.documentElement.style.setProperty('--sticky-offset', `${height}px`);
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);

  return offset;
}
