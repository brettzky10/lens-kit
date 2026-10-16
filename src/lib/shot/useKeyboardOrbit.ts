import { useEffect, useRef } from "react";
import { normalizeDeg } from "./shotMath";

interface KeyboardOrbitOptions {
  /** Only responds to keys while true (e.g. view === "camera"). */
  enabled: boolean;
  azimuth: number;
  elevation: number;
  distance: number;
  minDistance?: number;
  maxDistance?: number;
  minElevation?: number;
  maxElevation?: number;
  onChange: (next: { azimuth?: number; elevation?: number; distance?: number }) => void;
}

const AZIMUTH_SPEED = 55; // deg/sec
const ELEVATION_SPEED = 35; // deg/sec
const DISTANCE_SPEED_FRACTION = 0.9; // fraction of current distance per second

/**
 * WASD (+ Q/E for up/down) "fly around the subject" controls: A/D orbit
 * left/right, W/S dolly in/out, Q/E raise/lower the camera. Held keys are
 * polled every animation frame so movement is smooth and framerate-independent.
 */
export function useKeyboardOrbit(opts: KeyboardOrbitOptions) {
  const keys = useRef<Set<string>>(new Set());
  const optsRef = useRef(opts);
  optsRef.current = opts;

  useEffect(() => {
    const isTypingTarget = (target: EventTarget | null) => {
      const el = target as HTMLElement | null;
      const tag = el?.tagName;
      return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el?.isContentEditable;
    };

    const handleDown = (e: KeyboardEvent) => {
      if (!optsRef.current.enabled || isTypingTarget(e.target)) return;
      const key = e.key.toLowerCase();
      if (["w", "a", "s", "d", "q", "e"].includes(key)) {
        keys.current.add(key);
      }
    };
    const handleUp = (e: KeyboardEvent) => {
      keys.current.delete(e.key.toLowerCase());
    };
    const handleBlur = () => keys.current.clear();

    window.addEventListener("keydown", handleDown);
    window.addEventListener("keyup", handleUp);
    window.addEventListener("blur", handleBlur);
    return () => {
      window.removeEventListener("keydown", handleDown);
      window.removeEventListener("keyup", handleUp);
      window.removeEventListener("blur", handleBlur);
    };
  }, []);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();

    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;

      const {
        enabled,
        azimuth,
        elevation,
        distance,
        minDistance = 0.5,
        maxDistance = 40,
        minElevation = -89,
        maxElevation = 89,
        onChange,
      } = optsRef.current;

      if (enabled && keys.current.size > 0) {
        let nextAzimuth = azimuth;
        let nextElevation = elevation;
        let nextDistance = distance;

        if (keys.current.has("a")) nextAzimuth -= AZIMUTH_SPEED * dt;
        if (keys.current.has("d")) nextAzimuth += AZIMUTH_SPEED * dt;
        if (keys.current.has("w")) nextDistance -= distance * DISTANCE_SPEED_FRACTION * dt;
        if (keys.current.has("s")) nextDistance += distance * DISTANCE_SPEED_FRACTION * dt;
        if (keys.current.has("e")) nextElevation += ELEVATION_SPEED * dt;
        if (keys.current.has("q")) nextElevation -= ELEVATION_SPEED * dt;

        nextAzimuth = normalizeDeg(nextAzimuth);
        nextElevation = Math.max(minElevation, Math.min(maxElevation, nextElevation));
        nextDistance = Math.max(minDistance, Math.min(maxDistance, nextDistance));

        if (nextAzimuth !== azimuth || nextElevation !== elevation || nextDistance !== distance) {
          onChange({ azimuth: nextAzimuth, elevation: nextElevation, distance: nextDistance });
        }
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
}
