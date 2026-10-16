"use client";

import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { RigState } from "@/lib/types";
import { applyRigToCamera } from "@/lib/shot/shotMath";

export default function CameraFrustum({ rig }: { rig: RigState }) {
  const helperCamera = useMemo(() => new THREE.PerspectiveCamera(rig.fov, 16 / 9, 0.1, 10), []);
  const helper = useMemo(() => new THREE.CameraHelper(helperCamera), [helperCamera]);

  useEffect(() => {
    return () => {
      helper.dispose();
    };
  }, [helper]);

  useFrame(() => {
    helperCamera.far = Math.min(Math.max(rig.distance * 1.15, 1), 15);
    applyRigToCamera(helperCamera, rig);
    helper.update();
  });

  return <primitive object={helper} />;
}
