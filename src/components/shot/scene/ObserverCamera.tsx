"use client";

import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { OrthographicCamera } from "@react-three/drei";
import * as THREE from "three";
import { RigState, ViewMode } from "@/lib/shot/types";
import { SUBJECTS } from "@/lib/shot/subjects";

interface ObserverCameraProps {
  rig: RigState;
  view: Exclude<ViewMode, "camera">;
}

/**
 * A fixed orthographic camera used for the "top" and "side" views, framing
 * both the subject and the planned shot camera so their relationship is easy
 * to read at a glance. Never used for export.
 */
export default function ObserverCamera({ rig, view }: ObserverCameraProps) {
  const camRef = useRef<THREE.OrthographicCamera>(null);
  const size = useThree((s) => s.size);

  useFrame(() => {
    const cam = camRef.current;
    if (!cam) return;

    const subjectRadius = SUBJECTS[rig.subjectType].boundingRadius * rig.subjectScale;
    const radius = Math.max(rig.distance * 1.25, subjectRadius * 3, 2) + 1;
    const targetY = rig.targetHeight;

    cam.zoom = size.height / (2 * radius);
    cam.near = 0.01;
    cam.far = radius * 6;

    if (view === "top") {
      cam.position.set(0.0001, radius * 3, 0.0001);
      cam.up.set(0, 0, -1);
    } else {
      cam.position.set(radius * 3, targetY, 0.0001);
      cam.up.set(0, 1, 0);
    }
    cam.lookAt(0, targetY, 0);
    cam.updateProjectionMatrix();
  });

  return <OrthographicCamera ref={camRef} makeDefault />;
}
