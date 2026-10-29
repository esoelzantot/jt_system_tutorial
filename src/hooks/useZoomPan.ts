import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';

export const MIN_SCALE = 1;
export const MAX_SCALE = 6;
const BUTTON_STEP = 1.5;

interface Transform {
  scale: number;
  x: number;
  y: number;
}

const IDENTITY: Transform = { scale: 1, x: 0, y: 0 };
const clampScale = (s: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, s));

/**
 * Zoom (buttons, wheel, pinch, double-click) and pan (drag) for an image that is
 * fitted inside `stageRef` at scale 1. Zooming keeps the point under the cursor or
 * fingers fixed, and panning is clamped so the image never leaves the stage.
 */
export function useZoomPan(stageRef: RefObject<HTMLElement | null>, imageRef: RefObject<HTMLElement | null>) {
  const [transform, setTransform] = useState<Transform>(IDENTITY);
  const transformRef = useRef(transform);
  transformRef.current = transform;

  const clamp = useCallback(
    (t: Transform): Transform => {
      const stage = stageRef.current;
      const image = imageRef.current;
      if (!stage || !image || t.scale <= 1) return { ...t, x: 0, y: 0 };
      // offsetWidth/Height are the fitted size, unaffected by the CSS transform.
      const maxX = Math.max(0, (image.offsetWidth * t.scale - stage.clientWidth) / 2);
      const maxY = Math.max(0, (image.offsetHeight * t.scale - stage.clientHeight) / 2);
      return {
        scale: t.scale,
        x: Math.min(maxX, Math.max(-maxX, t.x)),
        y: Math.min(maxY, Math.max(-maxY, t.y)),
      };
    },
    [stageRef, imageRef],
  );

  /** Zooms to `nextScale` keeping the client point (default: stage centre) in place. */
  const zoomTo = useCallback(
    (nextScale: number, clientX?: number, clientY?: number) => {
      const stage = stageRef.current;
      if (!stage) return;
      const rect = stage.getBoundingClientRect();
      const px = (clientX ?? rect.left + rect.width / 2) - (rect.left + rect.width / 2);
      const py = (clientY ?? rect.top + rect.height / 2) - (rect.top + rect.height / 2);

      setTransform((prev) => {
        const scale = clampScale(nextScale);
        const ratio = scale / prev.scale;
        return clamp({ scale, x: px - (px - prev.x) * ratio, y: py - (py - prev.y) * ratio });
      });
    },
    [stageRef, clamp],
  );

  const zoomIn = useCallback(() => zoomTo(transformRef.current.scale * BUTTON_STEP), [zoomTo]);
  const zoomOut = useCallback(() => zoomTo(transformRef.current.scale / BUTTON_STEP), [zoomTo]);
  const reset = useCallback(() => setTransform(IDENTITY), []);

  // Pointer handling: one pointer pans, two pointers pinch-zoom.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const pointers = new Map<number, { x: number; y: number }>();
    let pinchDistance = 0;

    const distance = () => {
      const [a, b] = [...pointers.values()];
      return Math.hypot(a.x - b.x, a.y - b.y);
    };

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      stage.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 2) pinchDistance = distance();
    };

    const onPointerMove = (e: PointerEvent) => {
      const prev = pointers.get(e.pointerId);
      if (!prev) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (pointers.size === 2) {
        const next = distance();
        const [a, b] = [...pointers.values()];
        if (pinchDistance > 0) zoomTo((transformRef.current.scale * next) / pinchDistance, (a.x + b.x) / 2, (a.y + b.y) / 2);
        pinchDistance = next;
      } else if (pointers.size === 1 && transformRef.current.scale > 1) {
        const dx = e.clientX - prev.x;
        const dy = e.clientY - prev.y;
        setTransform((t) => clamp({ ...t, x: t.x + dx, y: t.y + dy }));
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      pointers.delete(e.pointerId);
      pinchDistance = 0;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const factor = Math.exp(-e.deltaY * (e.deltaMode === 1 ? 0.05 : 0.002));
      zoomTo(transformRef.current.scale * factor, e.clientX, e.clientY);
    };

    const onDoubleClick = (e: MouseEvent) => {
      if (transformRef.current.scale > 1) reset();
      else zoomTo(2.5, e.clientX, e.clientY);
    };

    stage.addEventListener('pointerdown', onPointerDown);
    stage.addEventListener('pointermove', onPointerMove);
    stage.addEventListener('pointerup', onPointerUp);
    stage.addEventListener('pointercancel', onPointerUp);
    stage.addEventListener('wheel', onWheel, { passive: false });
    stage.addEventListener('dblclick', onDoubleClick);
    return () => {
      stage.removeEventListener('pointerdown', onPointerDown);
      stage.removeEventListener('pointermove', onPointerMove);
      stage.removeEventListener('pointerup', onPointerUp);
      stage.removeEventListener('pointercancel', onPointerUp);
      stage.removeEventListener('wheel', onWheel);
      stage.removeEventListener('dblclick', onDoubleClick);
    };
  }, [stageRef, zoomTo, reset, clamp]);

  // Re-clamp when the viewport changes size (rotation, window resize).
  useEffect(() => {
    const onResize = () => setTransform((t) => clamp(t));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [clamp]);

  return { ...transform, zoomIn, zoomOut, reset };
}
