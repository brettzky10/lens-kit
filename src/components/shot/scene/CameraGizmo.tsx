"use client";

import { MutableRefObject, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export default function CameraGizmo({
  shotCameraRef,
}: {
  shotCameraRef: MutableRefObject<THREE.PerspectiveCamera | null>;
}) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    const cam = shotCameraRef.current;
    const group = groupRef.current;
    if (!cam || !group) return;
    group.position.copy(cam.position);
    group.quaternion.copy(cam.quaternion);
  });

  return (
    <group ref={groupRef}>
      <mesh>
        <boxGeometry args={[0.22, 0.16, 0.28]} />
        <meshBasicMaterial color="#f0a63f" />
      </mesh>
      <mesh position={[0, 0, -0.22]} rotation={[-Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.1, 0.18, 12]} />
        <meshBasicMaterial color="#f0a63f" />
      </mesh>
    </group>
  );
}
