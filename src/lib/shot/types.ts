export type Vec3 = [number, number, number];

export type SubjectType = "person" | "car" | "house" | "custom";

export type AppMode = "image" | "video";

/** Which camera the viewport is actually rendered from. Export always uses the shot camera. */
export type ViewMode = "camera" | "top" | "side";

export const VIEW_OPTIONS: { value: ViewMode; label: string }[] = [
  { value: "camera", label: "Camera (shot view)" },
  { value: "top", label: "Top-down" },
  { value: "side", label: "Side" },
];

export type EasingType = "linear" | "easeInOut" | "easeIn" | "easeOut" | "bezier";

export const EASING_OPTIONS: EasingType[] = [
  "linear",
  "easeInOut",
  "easeIn",
  "easeOut",
  "bezier",
];

export interface ShotCamera {
  position: Vec3;
  target: Vec3;
  fov: number;
  roll: number;
  /** Horizontal look-at offset from the subject, in meters (camera-right axis). 0 = centered. */
  frameOffsetX?: number;
  /** Vertical look-at offset from the subject, in meters. 0 = centered. */
  frameOffsetY?: number;
}

export interface ShotSubject {
  type: SubjectType;
  position: Vec3;
  rotation: Vec3;
  scale: number;
}

/** The portable "Shot JSON" — enough to reproduce a shot exactly. */
export interface Shot {
  camera: ShotCamera;
  subject: ShotSubject;
}

export interface SavedShot {
  id: string;
  name: string;
  createdAt: number;
  shot: Shot;
}

/** The animatable camera fields for a single keyframe. */
export interface KeyframeCamera {
  azimuth: number;
  elevation: number;
  distance: number;
  fov: number;
  roll: number;
  targetHeight: number;
  subjectRotationY: number;
  /** When true, offsets are forced to 0 and the camera looks straight at the subject. */
  subjectCentered: boolean;
  /** Horizontal look-at offset from the subject, in meters. Positive = subject shifts right in frame. */
  frameOffsetX: number;
  /** Vertical look-at offset from the subject, in meters. Positive = subject shifts down in frame. */
  frameOffsetY: number;
}

export interface Keyframe {
  id: string;
  time: number; // seconds along the timeline
  /** Easing applied to the segment arriving AT this keyframe (from the previous one). */
  easing: EasingType;
  /** Cubic-bezier control points [x1, y1, x2, y2], used only when easing === "bezier". */
  bezier: [number, number, number, number];
  camera: KeyframeCamera;
}

export interface VideoProject {
  fps: number;
  duration: number; // seconds
  subjectType: SubjectType;
  subjectScale: number;
  keyframes: Keyframe[];
}

export interface SavedVideoProject {
  id: string;
  name: string;
  createdAt: number;
  project: VideoProject;
}

/** The live rig state driving the scene — spherical, not cartesian. */
export interface RigState {
  azimuth: number; // degrees, 0 = camera in front of subject's facing direction
  elevation: number; // degrees, camera above (+) / below (-) subject's horizontal plane
  distance: number; // meters, camera-to-target distance
  fov: number; // degrees, vertical FOV
  roll: number; // degrees, camera roll around its view axis
  targetHeight: number; // meters, height of the look-at point above subject base
  subjectType: SubjectType;
  subjectRotationY: number; // degrees, subject yaw
  subjectScale: number;
  subjectCentered: boolean;
  frameOffsetX: number;
  frameOffsetY: number;
}

export interface SceneDisplaySettings {
  showGrid: boolean;
  showPath: boolean;
  showFrustum: boolean;
  clayShading: boolean;
}

export interface ShotAnalysis {
  distance: number;
  azimuthRelative: number; // -180..180, 0 = front, sign: + left, - right
  elevation: number;
  verticalTilt: number;
  fov: number;
  roll: number;
  perspectiveStrength: number; // 0-100
  perspectiveLabel: string;
  screenX: number; // -1..1 NDC
  screenY: number; // -1..1 NDC
  screenPositionLabel: string;
  subjectAngularSizeDeg: number;
  frameFraction: number; // 0..1+, fraction of vertical FOV the subject occupies
  framingLabel: string;
  aboveBelowLabel: "above" | "below" | "eye-level";
  sideLabel: "left" | "right" | "center";
  relationshipLabel: string; // front / 3/4 front / side / 3/4 rear / rear
}
