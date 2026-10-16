"use client";

import { MutableRefObject, useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { PerspectiveCamera } from "@react-three/drei";
import * as THREE from "three";
import { RigState, ViewMode } from "@/lib/shot/types";
import { applyRigToCamera } from "@/lib/shot/shotMath";

interface ShotCameraProps {
  rig: RigState;
  view: ViewMode;
  shotCameraRef: MutableRefObject<THREE.PerspectiveCamera | null>;
}

/**
 * The camera being planned. Its transform always tracks the rig, every
 * frame, regardless of which view is currently on screen — so the frustum
 * helper, the path, and (crucially) exports always reflect the real shot
 * even while the viewport is showing a top-down or side observer camera.
 */
export default function ShotCamera({ rig, view, shotCameraRef }: ShotCameraProps) {
  const localRef = useRef<THREE.PerspectiveCamera>(null);

  useEffect(() => {
    shotCameraRef.current = localRef.current;
  }, [shotCameraRef]);

  useFrame(() => {
    if (localRef.current) applyRigToCamera(localRef.current, rig);
  });

  return <PerspectiveCamera ref={localRef} makeDefault={view === "camera"} fov={rig.fov} />;
}
