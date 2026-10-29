export const sectionDomId = (sectionId: string) => `section-${sectionId}`;
export const questionDomId = (questionId: string) => `question-${questionId}`;
export const questionButtonDomId = (questionId: string) => `question-${questionId}-button`;
export const questionPanelDomId = (questionId: string) => `question-${questionId}-panel`;

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Scrolls `delta` within a scroll container only, never the page (works in RTL too). */
export function scrollChildIntoContainer(container: HTMLElement, child: HTMLElement, axis: 'x' | 'y') {
  const c = container.getBoundingClientRect();
  const r = child.getBoundingClientRect();
  const behavior: ScrollBehavior = prefersReducedMotion() ? 'auto' : 'smooth';

  if (axis === 'x') {
    if (r.left >= c.left && r.right <= c.right) return;
    container.scrollBy({ left: r.left + r.width / 2 - (c.left + c.width / 2), behavior });
  } else {
    if (r.top >= c.top && r.bottom <= c.bottom) return;
    container.scrollBy({ top: r.top + r.height / 2 - (c.top + c.height / 2), behavior });
  }
}

const SCROLL_IDLE_MS = 140;
const SCROLL_MAX_MS = 2000;

/**
 * Calls `onSettled` once a programmatic window scroll has stopped, or `onInterrupted`
 * as soon as the user takes over with wheel / touch / keyboard. Returns a cancel function.
 */
export function watchScrollEnd(onSettled: () => void, onInterrupted: () => void): () => void {
  let idleTimer = window.setTimeout(finish, SCROLL_IDLE_MS * 2);
  const maxTimer = window.setTimeout(finish, SCROLL_MAX_MS);
  const supportsScrollEnd = 'onscrollend' in window;

  function onScroll() {
    window.clearTimeout(idleTimer);
    idleTimer = window.setTimeout(finish, SCROLL_IDLE_MS);
  }
  function cleanup() {
    window.clearTimeout(idleTimer);
    window.clearTimeout(maxTimer);
    window.removeEventListener('scroll', onScroll);
    if (supportsScrollEnd) window.removeEventListener('scrollend', finish);
    for (const type of INTERRUPT_EVENTS) window.removeEventListener(type, interrupt);
  }
  function finish() {
    cleanup();
    onSettled();
  }
  function interrupt() {
    cleanup();
    onInterrupted();
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  if (supportsScrollEnd) window.addEventListener('scrollend', finish);
  for (const type of INTERRUPT_EVENTS) window.addEventListener(type, interrupt, { passive: true });

  return cleanup;
}

const INTERRUPT_EVENTS = ['wheel', 'touchstart', 'keydown', 'mousedown'] as const;
