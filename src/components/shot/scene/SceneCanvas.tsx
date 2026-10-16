"use client";

import { MutableRefObject, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import Subject from "./Subject";
import ShotCamera from "./ShotCamera";
import ObserverCamera from "./ObserverCamera";
import CameraGizmo from "./CameraGizmo";
import Stage from "./Stage";
import ExportHandler from "./ExportHandler";
import CameraPath from "./CameraPath";
import CameraFrustum from "./CameraFrustum";
import { Keyframe, RigState, SubjectType, ViewMode } from "@/lib/shot/types";

interface SceneCanvasProps {
  rig: RigState;
  view: ViewMode;
  exportRef: MutableRefObject<(() => void) | null>;
  canvasRef?: MutableRefObject<HTMLCanvasElement | null>;
  showGrid?: boolean;
  showFrustum?: boolean;
  clayShading?: boolean;
  /** Video mode only — draws the full sampled camera path. */
  path?: {
    keyframes: Keyframe[];
    duration: number;
    subjectType: SubjectType;
    subjectScale: number;
  };
}

export default function SceneCanvas({
  rig,
  view,
  exportRef,
  canvasRef,
  showGrid = true,
  showFrustum = false,
  clayShading = true,
  path,
}: SceneCanvasProps) {
  const shotCameraRef = useRef<THREE.PerspectiveCamera | null>(null);

  return (
    <Canvas shadows gl={{ preserveDrawingBuffer: true, antialias: true }} dpr={[1, 2]}>
      <color attach="background" args={["#101216"]} />
      <fog attach="fog" args={["#101216", 22, 60]} />

      <ShotCamera rig={rig} view={view} shotCameraRef={shotCameraRef} />
      {view !== "camera" && <ObserverCamera rig={rig} view={view} />}
      <ExportHandler exportRef={exportRef} shotCameraRef={shotCameraRef} canvasRef={canvasRef} />

      <Stage showGrid={showGrid} />
      <Subject
        type={rig.subjectType}
        rotationY={(rig.subjectRotationY * Math.PI) / 180}
        scale={rig.subjectScale}
        clayShading={clayShading}
      />

      {view !== "camera" && <CameraGizmo shotCameraRef={shotCameraRef} />}
      {showFrustum && <CameraFrustum rig={rig} />}
      {path && path.keyframes.length > 1 && (
        <CameraPath
          keyframes={path.keyframes}
          duration={path.duration}
          subjectType={path.subjectType}
          subjectScale={path.subjectScale}
        />
      )}
    </Canvas>
  );
}
