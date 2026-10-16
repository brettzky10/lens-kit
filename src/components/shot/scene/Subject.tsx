"use client";

import { Component, ReactNode, Suspense, forwardRef, useEffect, useMemo } from "react";
import * as THREE from "three";
import { useGLTF } from "@react-three/drei";
import { SubjectType } from "@/lib/types";
import { CUSTOM_GLTF_PATH } from "@/lib/shot/subjects";

// Flat, matte, colorless — "simple gray subject" per the brief. High contrast
// against the dark stage, no maps/textures anywhere.
const material = () => (
  <meshStandardMaterial color="#c7ccd6" roughness={0.85} metalness={0} />
);

function PersonMesh() {
  return (
    <group>
      <mesh position={[0, 0.95, 0]} castShadow>
        <capsuleGeometry args={[0.22, 0.7, 6, 12]} />
        {material()}
      </mesh>
      <mesh position={[0, 1.62, 0]} castShadow>
        <sphereGeometry args={[0.16, 16, 16]} />
        {material()}
      </mesh>
      <mesh position={[-0.1, 0.35, 0]} castShadow>
        <capsuleGeometry args={[0.09, 0.6, 4, 8]} />
        {material()}
      </mesh>
      <mesh position={[0.1, 0.35, 0]} castShadow>
        <capsuleGeometry args={[0.09, 0.6, 4, 8]} />
        {material()}
      </mesh>
    </group>
  );
}

function CarMesh() {
  const wheelPositions: [number, number, number][] = [
    [-0.85, 0.3, 1.15],
    [0.85, 0.3, 1.15],
    [-0.85, 0.3, -1.15],
    [0.85, 0.3, -1.15],
  ];
  return (
    <group>
      <mesh position={[0, 0.5, 0]} castShadow>
        <boxGeometry args={[1.8, 0.55, 3.8]} />
        {material()}
      </mesh>
      <mesh position={[0, 0.92, -0.2]} castShadow>
        <boxGeometry args={[1.5, 0.4, 1.9]} />
        {material()}
      </mesh>
      {wheelPositions.map((p, i) => (
        <mesh key={i} position={p} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.32, 0.32, 0.24, 16]} />
          {material()}
        </mesh>
      ))}
    </group>
  );
}

function HouseMesh() {
  return (
    <group>
      <mesh position={[0, 1.5, 0]} castShadow>
        <boxGeometry args={[4.2, 3, 3.6]} />
        {material()}
      </mesh>
      <mesh position={[0, 3.55, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[3.05, 1.8, 4]} />
        {material()}
      </mesh>
      <mesh position={[0, 0.7, 1.81]}>
        <boxGeometry args={[0.8, 1.4, 0.05]} />
        {material()}
      </mesh>
    </group>
  );
}

/** Loads the user's own GLTF/GLB from /public/models/custom.glb. */
function CustomGltfMesh({ clayShading }: { clayShading: boolean }) {
  const gltf = useGLTF(CUSTOM_GLTF_PATH);
  const scene = useMemo(() => gltf.scene.clone(true), [gltf.scene]);

  useEffect(() => {
    scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
        if (clayShading) {
          obj.material = new THREE.MeshStandardMaterial({
            color: "#c7ccd6",
            roughness: 0.85,
            metalness: 0,
          });
        }
      }
    });
  }, [scene, clayShading]);

  return <primitive object={scene} />;
}

function CustomFallback() {
  return (
    <mesh position={[0, 0.5, 0]} castShadow>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#6b7280" roughness={0.9} wireframe />
    </mesh>
  );
}

class GltfErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed) return <CustomFallback />;
    return this.props.children;
  }
}

const SUBJECT_MESHES: Record<Exclude<SubjectType, "custom">, () => JSX.Element> = {
  person: PersonMesh,
  car: CarMesh,
  house: HouseMesh,
};

interface SubjectProps {
  type: SubjectType;
  rotationY: number; // radians
  scale: number;
  clayShading?: boolean;
}

const Subject = forwardRef<THREE.Group, SubjectProps>(function Subject(
  { type, rotationY, scale, clayShading = true },
  ref
) {
  return (
    <group ref={ref} position={[0, 0, 0]} rotation={[0, rotationY, 0]} scale={scale}>
      {type === "custom" ? (
        <GltfErrorBoundary>
          <Suspense fallback={<CustomFallback />}>
            <CustomGltfMesh clayShading={clayShading} />
          </Suspense>
        </GltfErrorBoundary>
      ) : (
        SUBJECT_MESHES[type]()
      )}
    </group>
  );
});

export default Subject;
