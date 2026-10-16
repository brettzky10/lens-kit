import { SubjectType } from "./types";

export interface SubjectConfig {
  label: string;
  /** Rough radius (m) used for framing/scale-in-frame math. */
  boundingRadius: number;
  /** Rough total height (m), used to set a sensible default look-at height. */
  boundingHeight: number;
  /** Default target (look-at) height above the ground, in meters. */
  defaultTargetHeight: number;
  /** Sensible default camera distance, in meters. */
  defaultDistance: number;
}

export const SUBJECTS: Record<SubjectType, SubjectConfig> = {
  person: {
    label: "Person",
    boundingRadius: 0.45,
    boundingHeight: 1.8,
    defaultTargetHeight: 1.4,
    defaultDistance: 4.5,
  },
  car: {
    label: "Car",
    boundingRadius: 1.35,
    boundingHeight: 1.4,
    defaultTargetHeight: 0.6,
    defaultDistance: 7,
  },
  house: {
    label: "House",
    boundingRadius: 3.2,
    boundingHeight: 5.5,
    defaultTargetHeight: 2.2,
    defaultDistance: 14,
  },
  custom: {
    label: "Custom GLTF",
    boundingRadius: 1.3,
    boundingHeight: 1.6,
    defaultTargetHeight: 0.8,
    defaultDistance: 6,
  },
};

/** Path the custom subject is loaded from — drop your .glb/.gltf here. */
export const CUSTOM_GLTF_PATH = "/models/custom.glb";

export const SUBJECT_OPTIONS = Object.keys(SUBJECTS) as SubjectType[];
