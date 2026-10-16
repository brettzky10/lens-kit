import { DEFAULT_BEZIER } from "./easing";
import { makeId } from "./id";
import { normalizeDeg } from "./shotMath";
import { Keyframe } from "./types";

export interface OrbitOptions {
  count: number; // number of segments around the circle (keyframes = count + 1)
  duration: number; // seconds, total time for the full orbit
  elevation: number;
  distance: number;
  fov: number;
  targetHeight: number;
  startAzimuth?: number;
  direction?: 1 | -1; // 1 = clockwise (left→right), -1 = counter-clockwise
}

/**
 * A constant-speed 360° orbit: evenly spaced keyframes with linear easing
 * (linear = constant angular velocity = a smooth, uniform orbit).
 */
export function generateOrbitKeyframes(opts: OrbitOptions): Keyframe[] {
  const { count, duration, elevation, distance, fov, targetHeight, startAzimuth = 0, direction = 1 } = opts;
  const safeCount = Math.max(3, Math.round(count));
  const keyframes: Keyframe[] = [];

  for (let i = 0; i <= safeCount; i++) {
    const azimuth = normalizeDeg(startAzimuth + direction * i * (360 / safeCount));
    keyframes.push({
      id: makeId(),
      time: (i / safeCount) * duration,
      easing: "linear",
      bezier: DEFAULT_BEZIER,
      camera: {
        azimuth,
        elevation,
        distance,
        fov,
        roll: 0,
        targetHeight,
        subjectRotationY: 0,
        subjectCentered: true,
        frameOffsetX: 0,
        frameOffsetY: 0,
      },
    });
  }
  return keyframes;
}

export interface DroneRevealOptions {
  /** Segments in the orbit phase (keyframes = orbitCount + 1, plus the 2 reveal keyframes). */
  orbitCount: number;
  orbitDuration: number; // seconds spent orbiting once the camera arrives
  elevation: number; // orbit elevation
  distance: number; // orbit distance
  fov: number;
  targetHeight: number;
  startAzimuth?: number;
  direction?: 1 | -1;
  revealDuration: number; // seconds for the swoop-in
  revealDistanceMultiplier?: number; // how much farther out the reveal starts
  revealElevation?: number; // steeper starting angle, drone-like
}

/**
 * A "drone reveal" move: starts far, high, and with the subject pushed out
 * of frame; swoops in and settles the subject into frame; then continues
 * into a steady constant-speed orbit for the rest of the duration.
 */
export function generateDroneRevealOrbit(opts: DroneRevealOptions): Keyframe[] {
  const {
    orbitCount,
    orbitDuration,
    elevation,
    distance,
    fov,
    targetHeight,
    startAzimuth = 0,
    direction = 1,
    revealDuration,
    revealDistanceMultiplier = 3.5,
    revealElevation = 55,
  } = opts;

  const keyframes: Keyframe[] = [];

  // 1) Far, high, off-frame start — the subject is deliberately pushed to
  // the edge of frame via a large framing offset, not by looking away.
  keyframes.push({
    id: makeId(),
    time: 0,
    easing: "linear",
    bezier: DEFAULT_BEZIER,
    camera: {
      azimuth: normalizeDeg(startAzimuth - direction * 50),
      elevation: revealElevation,
      distance: distance * revealDistanceMultiplier,
      fov,
      roll: 0,
      targetHeight,
      subjectRotationY: 0,
      subjectCentered: false,
      frameOffsetX: distance * 0.9,
      frameOffsetY: distance * 0.3,
    },
  });

  // 2) Arrival — decelerate into frame, subject settles centered.
  keyframes.push({
    id: makeId(),
    time: revealDuration,
    easing: "easeOut",
    bezier: DEFAULT_BEZIER,
    camera: {
      azimuth: startAzimuth,
      elevation,
      distance,
      fov,
      roll: 0,
      targetHeight,
      subjectRotationY: 0,
      subjectCentered: true,
      frameOffsetX: 0,
      frameOffsetY: 0,
    },
  });

  // 3) Continue into a steady orbit for the remaining duration.
  const safeCount = Math.max(2, Math.round(orbitCount));
  for (let i = 1; i <= safeCount; i++) {
    const azimuth = normalizeDeg(startAzimuth + direction * i * (360 / safeCount));
    keyframes.push({
      id: makeId(),
      time: revealDuration + (i / safeCount) * orbitDuration,
      easing: "linear",
      bezier: DEFAULT_BEZIER,
      camera: {
        azimuth,
        elevation,
        distance,
        fov,
        roll: 0,
        targetHeight,
        subjectRotationY: 0,
        subjectCentered: true,
        frameOffsetX: 0,
        frameOffsetY: 0,
      },
    });
  }

  return keyframes;
}
