import { useCallback, useEffect, useRef, useState } from 'react';
import { prefersReducedMotion, sectionDomId, watchScrollEnd } from '../utils/dom';

/**
 * Distance below the sticky header at which a section becomes active. It is a bit
 * larger than the scroll-margin used when jumping to a section (see CSS), so a
 * section that was scrolled to is always the active one.
 */
const ACTIVATION_GAP = 32;

interface Options {
  sectionIds: string[];
  stickyOffset: number;
  /** Tracking pauses while sections are not rendered (e.g. search results are shown). */
  enabled: boolean;
}

const isAtPageBottom = () =>
  window.scrollY > 0 &&
  window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;

/**
 * Active-section rule: the last section whose top edge has crossed the activation line
 * just below the sticky header. Before the first section crosses, the first one is
 * active; once the page cannot scroll any further, the last one is.
 *
 * Tracking pauses while a programmatic (menu / search) scroll runs, so the selected
 * item stays highlighted, and resumes when that scroll settles or the user interrupts it.
 */
export function useActiveSection({ sectionIds, stickyOffset, enabled }: Options) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const lockedRef = useRef(false);
  const cancelWatchRef = useRef<(() => void) | null>(null);

  const computeActive = useCallback((): string | null => {
    if (sectionIds.length === 0) return null;
    if (isAtPageBottom()) return sectionIds[sectionIds.length - 1];

    const line = stickyOffset + ACTIVATION_GAP;
    let current = sectionIds[0];
    for (const id of sectionIds) {
      const el = document.getElementById(sectionDomId(id));
      if (!el) continue;
      if (el.getBoundingClientRect().top <= line) current = id;
      else break;
    }
    return current;
  }, [sectionIds, stickyOffset]);

  const sync = useCallback(() => {
    if (!lockedRef.current) setActiveId(computeActive());
  }, [computeActive]);

  // IntersectionObserver over a 1px band at the activation line: it fires exactly when a
  // section edge crosses the line, which is the only moment the active section can change.
  useEffect(() => {
    if (!enabled || sectionIds.length === 0) return;

    let observer: IntersectionObserver | null = null;
    const observe = () => {
      observer?.disconnect();
      const line = stickyOffset + ACTIVATION_GAP;
      const bottomMargin = Math.max(0, window.innerHeight - line - 1);
      observer = new IntersectionObserver(sync, {
        rootMargin: `-${line}px 0px -${bottomMargin}px 0px`,
        threshold: 0,
      });
      for (const id of sectionIds) {
        const el = document.getElementById(sectionDomId(id));
        if (el) observer.observe(el);
      }
    };

    // The band can't detect "scrolled to the very bottom", so watch only that edge.
    let atBottom = isAtPageBottom();
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const nowAtBottom = isAtPageBottom();
        if (nowAtBottom !== atBottom) {
          atBottom = nowAtBottom;
          sync();
        }
      });
    };

    let resizeTimer = 0;
    const onResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        observe();
        sync();
      }, 100);
    };

    observe();
    sync();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    return () => {
      observer?.disconnect();
      cancelAnimationFrame(frame);
      window.clearTimeout(resizeTimer);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
    };
  }, [enabled, sectionIds, stickyOffset, sync]);

  useEffect(() => () => cancelWatchRef.current?.(), []);

  /**
   * Marks `sectionId` active immediately, then smooth-scrolls to the element returned by
   * `getTarget` on the next frame, after React has committed freshly expanded or unhidden content.
   */
  const navigate = useCallback(
    (sectionId: string, getTarget: () => HTMLElement | null, onArrive?: (el: HTMLElement) => void) => {
      cancelWatchRef.current?.();
      lockedRef.current = true;
      setActiveId(sectionId);

      requestAnimationFrame(() => {
        const target = getTarget();
        if (!target) {
          lockedRef.current = false;
          return;
        }
        target.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
        onArrive?.(target);

        cancelWatchRef.current = watchScrollEnd(
          // Settled: keep the selected section; tracking resumes on the next real scroll.
          () => {
            lockedRef.current = false;
            cancelWatchRef.current = null;
          },
          // The user took over mid-scroll: follow the page again right away.
          () => {
            lockedRef.current = false;
            cancelWatchRef.current = null;
            requestAnimationFrame(sync);
          },
        );
      });
    },
    [sync],
  );

  return { activeId: activeId ?? sectionIds[0] ?? null, navigate };
}
