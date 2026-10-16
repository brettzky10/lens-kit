"use client";

import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { RigState } from "@/lib/types";
import { applyRigToCamera } from "@/lib/shot/shotMath";

interface CameraRigProps {
  rig: RigState;
}

export default function CameraRig({ rig }: CameraRigProps) {
  const { camera } = useThree();

  useFrame(() => {
    if (camera instanceof THREE.PerspectiveCamera) {
      applyRigToCamera(camera, rig);
    }
  });

  return null;
}
