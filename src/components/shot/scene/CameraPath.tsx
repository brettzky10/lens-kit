"use client";

import { useMemo } from "react";
import { Line } from "@react-three/drei";
import { Keyframe, SubjectType } from "@/lib/shot/types";
import { interpolateKeyframes } from "@/lib/shot/easing";
import { rigToCartesian } from "@/lib/shot/shotMath";

const SAMPLES = 120;

interface CameraPathProps {
  keyframes: Keyframe[];
  duration: number;
  subjectType: SubjectType;
  subjectScale: number;
}

export default function CameraPath({
  keyframes,
  duration,
  subjectType,
  subjectScale,
}: CameraPathProps) {
  const points = useMemo(() => {
    if (keyframes.length < 2 || duration <= 0) return [];
    const pts: [number, number, number][] = [];
    for (let i = 0; i <= SAMPLES; i++) {
      const t = (i / SAMPLES) * duration;
      const cam = interpolateKeyframes(keyframes, t);
      const { position } = rigToCartesian({ ...cam, subjectType, subjectScale });
      pts.push(position);
    }
    return pts;
  }, [keyframes, duration, subjectType, subjectScale]);

  const markers = useMemo(() => {
    return keyframes.map((k) => {
      const { position } = rigToCartesian({ ...k.camera, subjectType, subjectScale });
      return { id: k.id, position };
    });
  }, [keyframes, subjectType, subjectScale]);

  if (points.length < 2) return null;

  return (
    <group>
      <Line points={points} color="#e8a33d" lineWidth={1.5} transparent opacity={0.85} />
      {markers.map((m) => (
        <mesh key={m.id} position={m.position}>
          <sphereGeometry args={[0.06, 12, 12]} />
          <meshBasicMaterial color="#e8a33d" />
        </mesh>
      ))}
    </group>
  );
}
