"use client";

import { Grid } from "@react-three/drei";

export default function Stage({ showGrid = true }: { showGrid?: boolean }) {
  return (
    <>
      {/* Solid, flat-lit stage — no HDRI/environment maps, no textures. */}
      <ambientLight intensity={0.5} />
      <directionalLight
        position={[6, 9, 5]}
        intensity={1.6}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
      />
      {/* Cool rim/fill light for contrast against the dark background. */}
      <directionalLight position={[-6, 4, -6]} intensity={0.35} color="#9fb4ff" />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial color="#16181d" roughness={1} />
      </mesh>

      {showGrid && (
        <Grid
          args={[60, 60]}
          position={[0, 0.002, 0]}
          cellSize={0.5}
          cellThickness={0.5}
          cellColor="#2a2e37"
          sectionSize={5}
          sectionThickness={1}
          sectionColor="#3d4350"
          fadeDistance={40}
          fadeStrength={1.5}
          followCamera={false}
          infiniteGrid
        />
      )}
    </>
  );
}
