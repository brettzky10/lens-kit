"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
  EasingType,
  Keyframe,
  KeyframeCamera,
  RigState,
  SceneDisplaySettings,
  SubjectType,
  VideoProject,
  ViewMode,
} from "@/lib/shot/types";
import { SUBJECTS } from "@/lib/shot/subjects";
import { interpolateKeyframes, DEFAULT_BEZIER } from "@/lib/shot/easing";
import { downloadBlob } from "@/lib/shot/download";
import { createCanvasRecorder } from "@/lib/shot/videoRecorder";
import { makeId } from "@/lib/shot/id";
import { useKeyboardOrbit } from "@/lib/shot/useKeyboardOrbit";
import Timeline from "./video/Timeline";
import SceneSettingsPanel from "./video/SceneSettingsPanel";
import KeyframeInspector from "./video/KeyframeInspector";
import VideoExportPanel from "./video/VideoExportPanel";
import VideoLibraryPanel from "./video/VideoLibraryPanel";

const SceneCanvas = dynamic(() => import("./scene/SceneCanvas"), { ssr: false });

function defaultProject(): VideoProject {
  const subjectType: SubjectType = "person";
  const cfg = SUBJECTS[subjectType];
  const base: KeyframeCamera = {
    azimuth: 30,
    elevation: 12,
    distance: cfg.defaultDistance,
    fov: 50,
    roll: 0,
    targetHeight: cfg.defaultTargetHeight,
    subjectRotationY: 0,
    subjectCentered: true,
    frameOffsetX: 0,
    frameOffsetY: 0,
  };
  return {
    fps: 30,
    duration: 4,
    subjectType,
    subjectScale: 1,
    keyframes: [
      { id: makeId(), time: 0, easing: "linear", bezier: DEFAULT_BEZIER, camera: base },
      {
        id: makeId(),
        time: 4,
        easing: "easeInOut",
        bezier: DEFAULT_BEZIER,
        camera: { ...base, azimuth: -30, distance: cfg.defaultDistance * 0.8 },
      },
    ],
  };
}

export default function VideoPlanner() {
  const [project, setProject] = useState<VideoProject>(defaultProject);
  const [selectedId, setSelectedId] = useState<string | null>(project.keyframes[0]?.id ?? null);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordProgress, setRecordProgress] = useState(0);
  const [view, setView] = useState<ViewMode>("camera");
  const [display, setDisplay] = useState<SceneDisplaySettings>({
    showGrid: true,
    showPath: true,
    showFrustum: false,
    clayShading: true,
  });

  const exportRef = useRef<(() => void) | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Preview playback: loop within [0, duration).
  useEffect(() => {
    if (!isPlaying) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      setCurrentTime((t) => {
        const next = t + dt;
        return next >= project.duration ? 0 : next;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isPlaying, project.duration]);

  const cameraPose = useMemo(
    () => interpolateKeyframes(project.keyframes, currentTime),
    [project.keyframes, currentTime]
  );

  const rig: RigState = useMemo(
    () => ({ ...cameraPose, subjectType: project.subjectType, subjectScale: project.subjectScale }),
    [cameraPose, project.subjectType, project.subjectScale]
  );

  const selectedKeyframe = project.keyframes.find((k) => k.id === selectedId) ?? null;

  const handleSeek = useCallback((t: number) => {
    setCurrentTime(t);
  }, []);

  const handleAddKeyframe = useCallback(() => {
    const camera = interpolateKeyframes(project.keyframes, currentTime);
    setProject((p) => {
      const existingIdx = p.keyframes.findIndex((k) => Math.abs(k.time - currentTime) < 0.02);
      if (existingIdx >= 0) {
        const id = p.keyframes[existingIdx].id;
        setSelectedId(id);
        return {
          ...p,
          keyframes: p.keyframes.map((k, i) => (i === existingIdx ? { ...k, camera } : k)),
        };
      }
      const id = makeId();
      setSelectedId(id);
      const next: Keyframe = { id, time: currentTime, easing: "easeInOut", bezier: DEFAULT_BEZIER, camera };
      return { ...p, keyframes: [...p.keyframes, next].sort((a, b) => a.time - b.time) };
    });
  }, [project.keyframes, currentTime]);

  const handleDeleteSelected = useCallback(() => {
    if (!selectedId) return;
    setProject((p) => ({ ...p, keyframes: p.keyframes.filter((k) => k.id !== selectedId) }));
    setSelectedId(null);
  }, [selectedId]);

  const handleMoveKeyframe = useCallback(
    (id: string, time: number) => {
      const clamped = Math.min(project.duration, Math.max(0, time));
      setProject((p) => ({
        ...p,
        keyframes: p.keyframes.map((k) => (k.id === id ? { ...k, time: clamped } : k)),
      }));
    },
    [project.duration]
  );

  const handleChangeTime = useCallback(
    (time: number) => {
      if (!selectedId) return;
      handleMoveKeyframe(selectedId, time);
    },
    [selectedId, handleMoveKeyframe]
  );

  const handleChangeCamera = useCallback(
    (partial: Partial<KeyframeCamera>) => {
      if (!selectedId) return;
      setProject((p) => ({
        ...p,
        keyframes: p.keyframes.map((k) =>
          k.id === selectedId ? { ...k, camera: { ...k.camera, ...partial } } : k
        ),
      }));
    },
    [selectedId]
  );

  // WASD (+Q/E) flies the *selected* keyframe's camera, and snaps the
  // playhead to it so the viewport shows exactly what's being adjusted.
  useKeyboardOrbit({
    enabled: view === "camera" && !!selectedKeyframe,
    azimuth: selectedKeyframe?.camera.azimuth ?? 0,
    elevation: selectedKeyframe?.camera.elevation ?? 0,
    distance: selectedKeyframe?.camera.distance ?? 5,
    onChange: (next) => {
      if (!selectedKeyframe) return;
      handleChangeCamera(next);
      setCurrentTime(selectedKeyframe.time);
    },
  });

  const handleChangeEasing = useCallback(
    (easing: EasingType) => {
      if (!selectedId) return;
      setProject((p) => ({
        ...p,
        keyframes: p.keyframes.map((k) => (k.id === selectedId ? { ...k, easing } : k)),
      }));
    },
    [selectedId]
  );

  const handleChangeBezier = useCallback(
    (bezier: [number, number, number, number]) => {
      if (!selectedId) return;
      setProject((p) => ({
        ...p,
        keyframes: p.keyframes.map((k) => (k.id === selectedId ? { ...k, bezier } : k)),
      }));
    },
    [selectedId]
  );

  const handleGenerateKeyframes = useCallback((keyframes: Keyframe[]) => {
    const duration = keyframes.length ? keyframes[keyframes.length - 1].time : 4;
    setProject((p) => ({ ...p, keyframes, duration }));
    setSelectedId(keyframes[0]?.id ?? null);
    setCurrentTime(0);
    setIsPlaying(false);
  }, []);

  const handleDurationChange = useCallback((duration: number) => {
    setProject((p) => ({ ...p, duration }));
    setCurrentTime((t) => Math.min(t, duration));
  }, []);

  const handleFpsChange = useCallback((fps: number) => {
    setProject((p) => ({ ...p, fps }));
  }, []);

  const handleSubjectTypeChange = useCallback((subjectType: SubjectType) => {
    setProject((p) => ({ ...p, subjectType }));
  }, []);

  const handleSubjectScaleChange = useCallback((subjectScale: number) => {
    setProject((p) => ({ ...p, subjectScale }));
  }, []);

  const handleDisplayChange = useCallback((partial: Partial<SceneDisplaySettings>) => {
    setDisplay((d) => ({ ...d, ...partial }));
  }, []);

  const handleLoadProject = useCallback((loaded: VideoProject) => {
    setProject(loaded);
    setSelectedId(loaded.keyframes[0]?.id ?? null);
    setCurrentTime(0);
    setIsPlaying(false);
  }, []);

  const handleExportVideo = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const recorder = createCanvasRecorder(canvas, project.fps);
    if (!recorder) {
      alert("Video recording isn't supported in this browser — try Chrome or Edge.");
      return;
    }

    const previousView = view;
    setIsPlaying(false);
    setCurrentTime(0);
    setIsRecording(true);
    setRecordProgress(0);
    // Export is always from the shot camera's perspective, whatever view
    // you were looking at while planning the move.
    setView("camera");

    // Let the view switch + t=0 pose actually render before we start capturing.
    await new Promise((resolve) => requestAnimationFrame(resolve));
    await new Promise((resolve) => requestAnimationFrame(resolve));

    recorder.start();
    const start = performance.now();
    await new Promise<void>((resolve) => {
      const tick = (now: number) => {
        const elapsed = (now - start) / 1000;
        const clamped = Math.min(elapsed, project.duration);
        setCurrentTime(clamped);
        setRecordProgress(clamped / project.duration);
        if (elapsed >= project.duration) {
          resolve();
          return;
        }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });

    const blob = await recorder.stop();
    downloadBlob(blob, "camera-move.webm");
    setIsRecording(false);
    setView(previousView);
  }, [project.duration, project.fps, view]);

  return (
    <div className="flex min-h-0 w-full flex-1">
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="relative min-h-0 flex-1">
          <SceneCanvas
            rig={rig}
            view={view}
            exportRef={exportRef}
            canvasRef={canvasRef}
            showGrid={display.showGrid}
            showFrustum={display.showFrustum}
            clayShading={display.clayShading}
            path={
              display.showPath
                ? {
                    keyframes: project.keyframes,
                    duration: project.duration,
                    subjectType: project.subjectType,
                    subjectScale: project.subjectScale,
                  }
                : undefined
            }
          />
          {isRecording && (
            <div className="pointer-events-none absolute right-4 top-4 flex items-center gap-2 rounded-full border border-accent/40 bg-black/60 px-3 py-1 text-xs text-accent backdrop-blur-sm">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
              Recording {Math.round(recordProgress * 100)}%
            </div>
          )}
          {!isRecording && (
            <div className="pointer-events-none absolute bottom-4 left-4 rounded-full border border-border bg-black/50 px-3 py-1 text-xs text-muted-foreground backdrop-blur-sm">
              {view !== "camera"
                ? "Read-only preview — switch to Camera view to fly"
                : selectedKeyframe
                  ? "WASD to fly the selected keyframe · Q/E up-down"
                  : "Select a keyframe to fly it with WASD"}
            </div>
          )}
        </div>

        <div className="flex-none border-t border-border bg-card px-4 pb-4 pt-3">
          <Timeline
            project={project}
            currentTime={currentTime}
            isPlaying={isPlaying}
            selectedId={selectedId}
            onSeek={handleSeek}
            onTogglePlay={() => setIsPlaying((p) => !p)}
            onSelect={setSelectedId}
            onMoveKeyframe={handleMoveKeyframe}
            onDurationChange={handleDurationChange}
            onFpsChange={handleFpsChange}
            onAddKeyframe={handleAddKeyframe}
            onDeleteSelected={handleDeleteSelected}
          />
        </div>
      </div>

      <aside className="no-scrollbar flex w-[380px] flex-none flex-col gap-3 overflow-y-auto border-l border-border bg-background p-3 pb-10">
        <SceneSettingsPanel
          project={project}
          view={view}
          onViewChange={setView}
          onSubjectTypeChange={handleSubjectTypeChange}
          onSubjectScaleChange={handleSubjectScaleChange}
          display={display}
          onDisplayChange={handleDisplayChange}
        />
        <KeyframeInspector
          keyframe={selectedKeyframe}
          onChangeCamera={handleChangeCamera}
          onChangeTime={handleChangeTime}
          onChangeEasing={handleChangeEasing}
          onChangeBezier={handleChangeBezier}
          onGenerateKeyframes={handleGenerateKeyframes}
        />
        <VideoExportPanel
          project={project}
          isRecording={isRecording}
          recordProgress={recordProgress}
          onExportVideo={handleExportVideo}
          onExportFrame={() => exportRef.current?.()}
        />
        <VideoLibraryPanel currentProject={project} onLoad={handleLoadProject} />
      </aside>
    </div>
  );
}
