"use client";

import { useEffect, MutableRefObject } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { exportCanvasImage } from "@/lib/shot/exportImage";

interface ExportHandlerProps {
  exportRef: MutableRefObject<(() => void) | null>;
  shotCameraRef: MutableRefObject<THREE.PerspectiveCamera | null>;
  canvasRef?: MutableRefObject<HTMLCanvasElement | null>;
}

/**
 * Exposes an imperative "export the current frame" function that always
 * renders from the shot camera — regardless of which camera the viewport is
 * currently displaying (top/side/camera view).
 */
export default function ExportHandler({ exportRef, shotCameraRef, canvasRef }: ExportHandlerProps) {
  const { gl, scene } = useThree();

  useEffect(() => {
    exportRef.current = () => {
      const shotCamera = shotCameraRef.current;
      if (!shotCamera) return;
      exportCanvasImage(gl, scene, shotCamera, "shot-reference.png");
    };
    if (canvasRef) canvasRef.current = gl.domElement;
    return () => {
      exportRef.current = null;
    };
  }, [exportRef, shotCameraRef, canvasRef, gl, scene]);

  return null;
}
