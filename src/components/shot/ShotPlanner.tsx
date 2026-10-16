"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { LevaPanel, useControls, useCreateStore, folder } from "leva";
import dynamic from "next/dynamic";
import { RigState, Shot, ViewMode } from "@/lib/shot/types";
import { SUBJECT_OPTIONS, SUBJECTS } from "@/lib/shot/subjects";
import { computeAnalysis, rigToShot, shotToRig } from "@/lib/shot/shotMath";
import { useOrbitDrag } from "@/lib/shot/useOrbitDrag";
import { useKeyboardOrbit } from "@/lib/shot/useKeyboardOrbit";
import ShotInfoPanel from "./panels/ShotInfoPanel";
import ShotJsonPanel from "./panels/ShotJsonPanel";
import ShotLibraryPanel from "./panels/ShotLibraryPanel";

// The Canvas touches window/WebGL, so it must never run during SSR.
const SceneCanvas = dynamic(() => import("./scene/SceneCanvas"), { ssr: false });

const DEFAULT_SUBJECT = SUBJECTS.person;

const LEVA_THEME_VARS = {
  "--leva-colors-elevation1": "#111419",
  "--leva-colors-elevation2": "#161a20",
  "--leva-colors-elevation3": "#1e232b",
  "--leva-colors-accent1": "#67d8c4",
  "--leva-colors-accent2": "#67d8c4",
  "--leva-colors-accent3": "#8ee6d6",
  "--leva-colors-highlight1": "#9aa1ad",
  "--leva-colors-highlight2": "#c7cbd3",
  "--leva-colors-highlight3": "#e7e9ee",
  "--leva-colors-vivid1": "#67d8c4",
  "--leva-radii-sm": "6px",
  "--leva-radii-lg": "8px",
} as CSSProperties;

export default function ShotPlanner() {
  const levaStore = useCreateStore();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const exportRef = useRef<(() => void) | null>(null);
  const [aspect, setAspect] = useState(16 / 9);

  const [values, set] = useControls(
    () => ({
      Camera: folder({
        azimuth: { value: 30, min: -180, max: 180, step: 1, label: "Azimuth °" },
        elevation: { value: 12, min: -89, max: 89, step: 1, label: "Elevation °" },
        distance: {
          value: DEFAULT_SUBJECT.defaultDistance,
          min: 0.5,
          max: 40,
          step: 0.1,
          label: "Distance (m)",
        },
        fov: { value: 50, min: 12, max: 120, step: 1, label: "FOV °" },
        roll: { value: 0, min: -45, max: 45, step: 1, label: "Roll °" },
        targetHeight: {
          value: DEFAULT_SUBJECT.defaultTargetHeight,
          min: 0,
          max: 6,
          step: 0.05,
          label: "Look-at height (m)",
        },
      }),
      Subject: folder({
        subjectType: { value: "person", options: SUBJECT_OPTIONS, label: "Type" },
        subjectRotationY: { value: 0, min: -180, max: 180, step: 1, label: "Yaw °" },
        subjectScale: { value: 1, min: 0.5, max: 2, step: 0.05, label: "Scale" },
        clayShading: { value: true, label: "Clay shading (custom GLTF)" },
      }),
      Framing: folder({
        subjectCentered: { value: true, label: "Subject centered" },
        frameOffsetX: {
          value: 0,
          min: -5,
          max: 5,
          step: 0.05,
          label: "Offset X (m)",
          render: (get) => !get("Framing.subjectCentered"),
        },
        frameOffsetY: {
          value: 0,
          min: -3,
          max: 3,
          step: 0.05,
          label: "Offset Y (m)",
          render: (get) => !get("Framing.subjectCentered"),
        },
      }),
      Scene: folder({
        view: { value: "camera", options: { Camera: "camera", "Top-down": "top", Side: "side" }, label: "View" },
        showGrid: { value: true, label: "Grid" },
        showFrustum: { value: false, label: "Camera frustum" },
      }),
    }),
    { store: levaStore }
  );

  const rig: RigState = values as unknown as RigState;
  const { showGrid, showFrustum, clayShading, view } = values as unknown as {
    showGrid: boolean;
    showFrustum: boolean;
    clayShading: boolean;
    view: ViewMode;
  };

  const orbitHandlers = useOrbitDrag({
    azimuth: rig.azimuth,
    elevation: rig.elevation,
    distance: rig.distance,
    onChange: (next) => set(next),
  });

  useKeyboardOrbit({
    enabled: view === "camera",
    azimuth: rig.azimuth,
    elevation: rig.elevation,
    distance: rig.distance,
    onChange: (next) => set(next),
  });

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      if (height > 0) setAspect(width / height);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const shot: Shot = useMemo(() => rigToShot(rig), [rig]);
  const analysis = useMemo(() => computeAnalysis(rig, aspect), [rig, aspect]);

  const handleLoadShot = (loaded: Shot) => {
    set(shotToRig(loaded));
  };

  return (
    <div className="flex h-full w-full min-h-0">
      <div
        ref={wrapperRef}
        className="relative min-h-0 min-w-0 flex-1 touch-none cursor-grab active:cursor-grabbing"
        onPointerDown={view === "camera" ? orbitHandlers.onPointerDown : undefined}
        onPointerMove={view === "camera" ? orbitHandlers.onPointerMove : undefined}
        onPointerUp={view === "camera" ? orbitHandlers.onPointerUp : undefined}
        onWheel={view === "camera" ? orbitHandlers.onWheel : undefined}
      >
        <SceneCanvas
          rig={rig}
          view={view}
          exportRef={exportRef}
          showGrid={showGrid}
          showFrustum={showFrustum}
          clayShading={clayShading}
        />
        <div className="pointer-events-none absolute bottom-4 left-4 rounded-full border border-border bg-black/50 px-3 py-1 text-xs text-muted-foreground backdrop-blur-sm">
          {view === "camera"
            ? "Drag to orbit · Scroll to dolly · WASD to fly · Q/E up-down"
            : "Read-only preview — switch to Camera view to orbit"}
        </div>
      </div>

      <aside className="no-scrollbar flex w-[380px] flex-none flex-col gap-3 overflow-y-auto border-l border-border bg-background p-3 pb-10">
        <div
          className="overflow-hidden rounded-lg border border-border bg-card shadow-panel"
          style={LEVA_THEME_VARS}
        >
          <LevaPanel store={levaStore} fill flat titleBar={false} />
        </div>
        <ShotInfoPanel analysis={analysis} />
        <ShotJsonPanel shot={shot} onExportImage={() => exportRef.current?.()} />
        <ShotLibraryPanel currentShot={shot} onLoad={handleLoadShot} />
      </aside>
    </div>
  );
}
