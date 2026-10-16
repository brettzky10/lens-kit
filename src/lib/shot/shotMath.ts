import * as THREE from "three";
import { RigState, Shot, ShotAnalysis, ShotCamera, ShotSubject, Vec3 } from "./types";
import { SUBJECTS } from "./subjects";

const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;

/** Normalize an angle in degrees to the range (-180, 180]. */
export function normalizeDeg(deg: number): number {
  let d = deg % 360;
  if (d > 180) d -= 360;
  if (d <= -180) d += 360;
  return d;
}

/**
 * Convert the rig's spherical state (azimuth/elevation/distance around the
 * subject) into a cartesian camera position + look-at target.
 *
 * Convention: subject sits at the origin, facing +Z when subjectRotationY = 0.
 * azimuth = 0 means the camera is on the subject's forward axis (subject
 * facing the camera, i.e. a "front" shot). Positive azimuth sweeps toward
 * the subject's left, negative toward the subject's right.
 *
 * The camera's *position* always orbits the subject exactly at
 * azimuth/elevation/distance —framing offsets never move the camera, they
 * only shift what it's aimed at, exactly like nudging composition on a real
 * rig without changing where you're standing.
 */
export function rigToCartesian(rig: RigState): { position: Vec3; target: Vec3 } {
  const worldAzimuth = rig.azimuth + rig.subjectRotationY;
  const azRad = worldAzimuth * DEG2RAD;
  const elRad = rig.elevation * DEG2RAD;

  const horizontal = rig.distance * Math.cos(elRad);
  const x = horizontal * Math.sin(azRad);
  const y = rig.distance * Math.sin(elRad) + rig.targetHeight;
  const z = horizontal * Math.cos(azRad);

  // Camera-right vector in the horizontal plane at this azimuth
  // (right = normalize(cross(forward, worldUp)), forward = -(sin az, 0, cos az)).
  const rightX = Math.cos(azRad);
  const rightZ = -Math.sin(azRad);

  const offsetX = rig.subjectCentered ? 0 : rig.frameOffsetX;
  const offsetY = rig.subjectCentered ? 0 : rig.frameOffsetY;

  // Negative sign: shifting the *target* toward camera-right makes the
  // subject appear to camera-left, and vice versa — so a positive
  // frameOffsetX reads as "subject shifts right in frame".
  const targetX = -rightX * offsetX;
  const targetZ = -rightZ * offsetX;
  const targetY = rig.targetHeight + offsetY;

  return {
    position: [x, y, z],
    target: [targetX, targetY, targetZ],
  };
}

/**
 * Inverse of rigToCartesian: recover azimuth/elevation/distance/targetHeight
 * from a raw camera position (the subject is always at the world origin, so
 * the camera's orbital parameters can be read directly off its position,
 * independent of any framing offset baked into the target).
 */
export function cartesianToRig(
  position: Vec3,
  target: Vec3,
  subjectRotationY: number,
  frameOffsetY = 0
): { azimuth: number; elevation: number; distance: number; targetHeight: number } {
  const dx = position[0];
  const dz = position[2];
  const targetHeight = target[1] - frameOffsetY;
  const dy = position[1] - targetHeight;

  const horizontal = Math.sqrt(dx * dx + dz * dz);
  const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
  const elevation = RAD2DEG * Math.atan2(dy, horizontal);
  const worldAzimuth = RAD2DEG * Math.atan2(dx, dz);
  const azimuth = normalizeDeg(worldAzimuth - subjectRotationY);

  return { azimuth, elevation, distance, targetHeight };
}

/** Build a portable Shot JSON from the live rig state. */
export function rigToShot(rig: RigState): Shot {
  const { position, target } = rigToCartesian(rig);
  const camera: ShotCamera = {
    position: [round3(position[0]), round3(position[1]), round3(position[2])],
    target: [round3(target[0]), round3(target[1]), round3(target[2])],
    fov: round1(rig.fov),
    roll: round1(rig.roll),
    frameOffsetX: round3(rig.subjectCentered ? 0 : rig.frameOffsetX),
    frameOffsetY: round3(rig.subjectCentered ? 0 : rig.frameOffsetY),
  };
  const subject: ShotSubject = {
    type: rig.subjectType,
    position: [0, 0, 0],
    rotation: [0, round3(rig.subjectRotationY * DEG2RAD), 0],
    scale: round3(rig.subjectScale),
  };
  return { camera, subject };
}

/** Recover a rig state from an arbitrary Shot JSON (e.g. pasted or loaded). */
export function shotToRig(shot: Shot): RigState {
  const subjectRotationYDeg = shot.subject.rotation[1] * RAD2DEG;
  const frameOffsetX = shot.camera.frameOffsetX ?? 0;
  const frameOffsetY = shot.camera.frameOffsetY ?? 0;
  const { azimuth, elevation, distance, targetHeight } = cartesianToRig(
    shot.camera.position,
    shot.camera.target,
    subjectRotationYDeg,
    frameOffsetY
  );
  return {
    azimuth,
    elevation,
    distance,
    fov: shot.camera.fov,
    roll: shot.camera.roll,
    targetHeight,
    subjectType: shot.subject.type,
    subjectRotationY: normalizeDeg(subjectRotationYDeg),
    subjectScale: shot.subject.scale,
    subjectCentered: frameOffsetX === 0 && frameOffsetY === 0,
    frameOffsetX,
    frameOffsetY,
  };
}

function round3(n: number) {
  return Math.round(n * 1000) / 1000;
}
function round1(n: number) {
  return Math.round(n * 10) / 10;
}

const PERSPECTIVE_LABELS: [number, string][] = [
  [22, "compressed / telephoto"],
  [40, "mild"],
  [58, "natural"],
  [78, "pronounced / wide-angle"],
  [Infinity, "extreme / fisheye-like"],
];

function perspectiveStrength(fov: number): { score: number; label: string } {
  // Map a 10-120 degree FOV range onto a 0-100 "perspective strength" score.
  const score = THREE.MathUtils.clamp(
    THREE.MathUtils.mapLinear(fov, 10, 120, 4, 100),
    0,
    100
  );
  const label = PERSPECTIVE_LABELS.find(([max]) => score < max)?.[1] ?? "extreme";
  return { score: Math.round(score), label };
}

function framingLabel(frameFraction: number): string {
  if (frameFraction > 0.9) return "extreme close-up";
  if (frameFraction > 0.5) return "close-up";
  if (frameFraction > 0.28) return "medium close-up";
  if (frameFraction > 0.14) return "medium shot";
  if (frameFraction > 0.06) return "medium wide / full shot";
  return "wide / establishing shot";
}

function relationshipLabel(absAzimuth: number): string {
  if (absAzimuth <= 22.5) return "front";
  if (absAzimuth <= 67.5) return "3/4 front";
  if (absAzimuth <= 112.5) return "side (profile)";
  if (absAzimuth <= 157.5) return "3/4 rear";
  return "rear";
}

function screenPositionLabel(ndcX: number, ndcY: number): string {
  const col = ndcX < -0.2 ? "left" : ndcX > 0.2 ? "right" : "center";
  const row = ndcY < -0.2 ? "lower" : ndcY > 0.2 ? "upper" : "middle";

  if (col === "center" && row === "middle") return "centered";
  if (row === "middle") return `centered, slightly ${col}`;
  if (col === "center") return `centered, slightly ${row}`;
  return `${row}-${col}`;
}

/**
 * Position + orient a three.js camera to match the rig state. Shared by the
 * live render loop and the (throwaway) camera used for off-screen analysis,
 * so both agree exactly.
 */
export function applyRigToCamera(camera: THREE.PerspectiveCamera, rig: RigState) {
  const { position, target } = rigToCartesian(rig);
  camera.position.set(position[0], position[1], position[2]);
  camera.up.set(0, 1, 0);
  camera.lookAt(target[0], target[1], target[2]);
  camera.rotateZ(rig.roll * DEG2RAD);
  camera.fov = rig.fov;
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld(true);
}

/**
 * Compute the shot analysis directly from rig state, using a disposable
 * camera. Use this anywhere outside the R3F render loop (e.g. the sidebar).
 */
export function computeAnalysis(rig: RigState, aspect: number): ShotAnalysis {
  const camera = new THREE.PerspectiveCamera(rig.fov, aspect, 0.1, 1000);
  applyRigToCamera(camera, rig);
  const target = rigToCartesian(rig).target;
  return analyzeShot(camera, rig, target);
}

/**
 * Compute the full human-readable + numeric shot analysis. Requires a live
 * three.js camera (with up-to-date world + projection matrices) so the
 * screen-space projection matches exactly what will be exported.
 */
export function analyzeShot(
  camera: THREE.PerspectiveCamera,
  rig: RigState,
  target: Vec3
): ShotAnalysis {
  const subjectConfig = SUBJECTS[rig.subjectType];
  const subjectWorldPos = new THREE.Vector3(0, 0, 0);

  const camPos = camera.position;
  const dx = camPos.x - subjectWorldPos.x;
  const dy = camPos.y - subjectWorldPos.y;
  const dz = camPos.z - subjectWorldPos.z;
  const horizontalDist = Math.sqrt(dx * dx + dz * dz);
  const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

  const elevation = RAD2DEG * Math.atan2(dy, horizontalDist);
  const worldAzimuth = RAD2DEG * Math.atan2(dx, dz);
  const azimuthRelative = normalizeDeg(worldAzimuth - rig.subjectRotationY);

  // Vertical tilt: how much the camera pitches to keep the target framed.
  const forward = new THREE.Vector3();
  camera.getWorldDirection(forward);
  const verticalTilt = RAD2DEG * Math.atan2(forward.y, Math.sqrt(forward.x ** 2 + forward.z ** 2)) * -1;

  const { score: perspectiveScore, label: perspectiveLabel } = perspectiveStrength(rig.fov);

  // Project subject center to NDC using the live camera matrices.
  const projected = subjectWorldPos.clone().project(camera);
  const screenX = THREE.MathUtils.clamp(projected.x, -1.5, 1.5);
  const screenY = THREE.MathUtils.clamp(projected.y, -1.5, 1.5);

  const scaledRadius = subjectConfig.boundingRadius * rig.subjectScale * 2; // full height-ish extent
  const angularSizeDeg = 2 * RAD2DEG * Math.atan(scaledRadius / Math.max(distance, 0.01));
  const frameFraction = angularSizeDeg / rig.fov;

  const absAzimuth = Math.abs(azimuthRelative);

  return {
    distance,
    azimuthRelative,
    elevation,
    verticalTilt,
    fov: rig.fov,
    roll: rig.roll,
    perspectiveStrength: perspectiveScore,
    perspectiveLabel,
    screenX,
    screenY,
    screenPositionLabel: screenPositionLabel(screenX, screenY),
    subjectAngularSizeDeg: angularSizeDeg,
    frameFraction,
    framingLabel: framingLabel(frameFraction),
    aboveBelowLabel: elevation > 2 ? "above" : elevation < -2 ? "below" : "eye-level",
    sideLabel: azimuthRelative < -3 ? "right" : azimuthRelative > 3 ? "left" : "center",
    relationshipLabel: relationshipLabel(absAzimuth),
  };
}

/** Render the analysis into the compact human-readable shot description block. */
export function describeShot(a: ShotAnalysis): string {
  const lines: string[] = [];
  lines.push(`Camera: ${a.relationshipLabel}`);

  if (a.aboveBelowLabel === "eye-level") {
    lines.push(`Elevation: eye-level with subject`);
  } else {
    lines.push(`Elevation: ${Math.abs(a.elevation).toFixed(0)}° ${a.aboveBelowLabel} subject`);
  }

  if (a.sideLabel === "center") {
    lines.push(`Horizontal angle: 0° (directly facing subject)`);
  } else {
    lines.push(`Horizontal angle: ${Math.abs(a.azimuthRelative).toFixed(0)}° to subject's ${a.sideLabel}`);
  }

  lines.push(`Distance: ${a.distance.toFixed(1)}m`);
  lines.push(`FOV: ${a.fov.toFixed(0)}°`);
  lines.push(`Framing: ${a.framingLabel}, subject ${a.screenPositionLabel}`);
  lines.push(`Roll: ${a.roll.toFixed(0)}°`);
  lines.push(`Perspective: ${a.perspectiveLabel} (${a.perspectiveStrength}/100)`);
  return lines.join("\n");
}
