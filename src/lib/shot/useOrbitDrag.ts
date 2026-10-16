import { useCallback, useRef } from "react";
import { normalizeDeg } from "./shotMath";

interface OrbitDragOptions {
  azimuth: number;
  elevation: number;
  distance: number;
  minDistance?: number;
  maxDistance?: number;
  onChange: (next: { azimuth?: number; elevation?: number; distance?: number }) => void;
}

/**
 * Returns pointer/wheel handlers that turn a click-drag into azimuth/elevation
 * changes, and a scroll wheel into a distance (dolly) change. Attach to the
 * element wrapping the <Canvas>.
 */
export function useOrbitDrag(opts: OrbitDragOptions) {
  const dragging = useRef(false);
  const last = useRef({ x: 0, y: 0 });
  const optsRef = useRef(opts);
  optsRef.current = opts;

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    dragging.current = true;
    last.current = { x: e.clientX, y: e.clientY };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return;
    const dx = e.clientX - last.current.x;
    const dy = e.clientY - last.current.y;
    last.current = { x: e.clientX, y: e.clientY };

    const { azimuth, elevation, onChange } = optsRef.current;
    const nextAzimuth = normalizeDeg(azimuth + dx * 0.35);
    const nextElevation = Math.max(-89, Math.min(89, elevation - dy * 0.35));
    onChange({ azimuth: nextAzimuth, elevation: nextElevation });
  }, []);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    dragging.current = false;
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  }, []);

  const onWheel = useCallback((e: React.WheelEvent) => {
    const { distance, minDistance = 0.5, maxDistance = 40, onChange } = optsRef.current;
    const next = Math.max(minDistance, Math.min(maxDistance, distance + e.deltaY * 0.01));
    onChange({ distance: next });
  }, []);

  return { onPointerDown, onPointerMove, onPointerUp, onWheel };
}
