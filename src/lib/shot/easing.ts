import { EasingType, Keyframe, KeyframeCamera } from "./types";
import { normalizeDeg } from "./shotMath";

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Lerp an angle in degrees the short way round, so 350° -> 10° doesn't spin the long way. */
export function shortestAngleLerp(a: number, b: number, t: number): number {
  const diff = normalizeDeg(b - a);
  return a + diff * t;
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
function easeInCubic(t: number): number {
  return t * t * t;
}
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/** Evaluate a CSS-style cubic-bezier(x1,y1,x2,y2) easing curve at input t (0-1). */
export function cubicBezier(t: number, points: [number, number, number, number]): number {
  const [x1, y1, x2, y2] = points;
  const bezierX = (u: number) =>
    3 * (1 - u) * (1 - u) * u * x1 + 3 * (1 - u) * u * u * x2 + u * u * u;
  const bezierY = (u: number) =>
    3 * (1 - u) * (1 - u) * u * y1 + 3 * (1 - u) * u * u * y2 + u * u * u;

  // Binary-search for the curve parameter u whose x matches the input t.
  let lo = 0;
  let hi = 1;
  let u = t;
  for (let i = 0; i < 24; i++) {
    const x = bezierX(u);
    if (Math.abs(x - t) < 1e-4) break;
    if (x < t) lo = u;
    else hi = u;
    u = (lo + hi) / 2;
  }
  return bezierY(u);
}

export const DEFAULT_BEZIER: [number, number, number, number] = [0.42, 0, 0.58, 1];

export function applyEasing(
  t: number,
  easing: EasingType,
  bezier: [number, number, number, number] = DEFAULT_BEZIER
): number {
  const clamped = Math.min(1, Math.max(0, t));
  switch (easing) {
    case "linear":
      return clamped;
    case "easeInOut":
      return easeInOutCubic(clamped);
    case "easeIn":
      return easeInCubic(clamped);
    case "easeOut":
      return easeOutCubic(clamped);
    case "bezier":
      return cubicBezier(clamped, bezier);
    default:
      return clamped;
  }
}

const FALLBACK_CAMERA: KeyframeCamera = {
  azimuth: 30,
  elevation: 12,
  distance: 5,
  fov: 50,
  roll: 0,
  targetHeight: 1.4,
  subjectRotationY: 0,
  subjectCentered: true,
  frameOffsetX: 0,
  frameOffsetY: 0,
};

/** Interpolate the camera pose for the timeline at a given time (seconds). */
export function interpolateKeyframes(keyframes: Keyframe[], time: number): KeyframeCamera {
  if (keyframes.length === 0) return FALLBACK_CAMERA;

  const sorted = [...keyframes].sort((a, b) => a.time - b.time);
  if (sorted.length === 1) return sorted[0].camera;
  if (time <= sorted[0].time) return sorted[0].camera;
  if (time >= sorted[sorted.length - 1].time) return sorted[sorted.length - 1].camera;

  let k0 = sorted[0];
  let k1 = sorted[1];
  for (let i = 0; i < sorted.length - 1; i++) {
    if (time >= sorted[i].time && time <= sorted[i + 1].time) {
      k0 = sorted[i];
      k1 = sorted[i + 1];
      break;
    }
  }

  const span = k1.time - k0.time || 1;
  const rawT = (time - k0.time) / span;
  const t = applyEasing(rawT, k1.easing, k1.bezier);

  return {
    azimuth: shortestAngleLerp(k0.camera.azimuth, k1.camera.azimuth, t),
    elevation: lerp(k0.camera.elevation, k1.camera.elevation, t),
    distance: lerp(k0.camera.distance, k1.camera.distance, t),
    fov: lerp(k0.camera.fov, k1.camera.fov, t),
    roll: lerp(k0.camera.roll, k1.camera.roll, t),
    targetHeight: lerp(k0.camera.targetHeight, k1.camera.targetHeight, t),
    subjectRotationY: shortestAngleLerp(k0.camera.subjectRotationY, k1.camera.subjectRotationY, t),
    // Framing offset eases smoothly too — a move can drift from centered to
    // off-center (or back) over the segment, not just snap at the keyframe.
    // subjectCentered below is derived from the *result*, so it's only true
    // exactly where the effective offset is actually zero.
    ...interpolatedOffset(k0.camera, k1.camera, t),
  };
}

function interpolatedOffset(
  a: KeyframeCamera,
  b: KeyframeCamera,
  t: number
): Pick<KeyframeCamera, "subjectCentered" | "frameOffsetX" | "frameOffsetY"> {
  const frameOffsetX = lerp(a.subjectCentered ? 0 : a.frameOffsetX, b.subjectCentered ? 0 : b.frameOffsetX, t);
  const frameOffsetY = lerp(a.subjectCentered ? 0 : a.frameOffsetY, b.subjectCentered ? 0 : b.frameOffsetY, t);
  return { subjectCentered: frameOffsetX === 0 && frameOffsetY === 0, frameOffsetX, frameOffsetY };
}
