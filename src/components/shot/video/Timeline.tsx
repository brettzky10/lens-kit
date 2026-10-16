"use client";

import { useCallback, useRef, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { VideoProject } from "@/lib/shot/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface TimelineProps {
  project: VideoProject;
  currentTime: number;
  isPlaying: boolean;
  selectedId: string | null;
  onSeek: (t: number) => void;
  onTogglePlay: () => void;
  onSelect: (id: string) => void;
  onMoveKeyframe: (id: string, t: number) => void;
  onDurationChange: (d: number) => void;
  onFpsChange: (fps: number) => void;
  onAddKeyframe: () => void;
  onDeleteSelected: () => void;
}

export default function Timeline({
  project,
  currentTime,
  isPlaying,
  selectedId,
  onSeek,
  onTogglePlay,
  onSelect,
  onMoveKeyframe,
  onDurationChange,
  onFpsChange,
  onAddKeyframe,
  onDeleteSelected,
}: TimelineProps) {
  const trackRef = useRef<HTMLDivElement>(null);

  const timeFromClientX = useCallback(
    (clientX: number) => {
      const el = trackRef.current;
      if (!el) return 0;
      const rect = el.getBoundingClientRect();
      const frac = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
      return frac * project.duration;
    },
    [project.duration]
  );

  const handleTrackPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    onSeek(timeFromClientX(e.clientX));
  };

  const handleMarkerPointerDown = (id: string) => (e: ReactPointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    onSelect(id);
    const move = (ev: PointerEvent) => onMoveKeyframe(id, timeFromClientX(ev.clientX));
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const playheadPct = project.duration > 0 ? (currentTime / project.duration) * 100 : 0;
  const sorted = [...project.keyframes].sort((a, b) => a.time - b.time);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-4">
        <Button size="icon" onClick={onTogglePlay} aria-label={isPlaying ? "Pause" : "Play"}>
          {isPlaying ? (
            <span className="flex gap-[3px]">
              <span className="h-3 w-[3px] bg-accent-foreground" />
              <span className="h-3 w-[3px] bg-accent-foreground" />
            </span>
          ) : (
            <span
              className="ml-0.5 h-0 w-0 border-y-[6px] border-l-[9px] border-y-transparent border-l-accent-foreground"
              aria-hidden
            />
          )}
        </Button>

        <span className="font-mono text-[12.5px] text-muted-foreground">
          {currentTime.toFixed(2)}s <span className="text-muted-foreground/50">/</span>{" "}
          {project.duration.toFixed(2)}s
        </span>

        <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          Duration
          <div className="w-16">
            <Input
              type="number"
              min={0.5}
              step={0.5}
              value={project.duration}
              onChange={(e) => onDurationChange(Math.max(0.5, Number(e.target.value)))}
            />
          </div>
        </label>
        <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          FPS
          <div className="w-16">
            <Input
              type="number"
              min={12}
              max={60}
              step={1}
              value={project.fps}
              onChange={(e) => onFpsChange(Math.min(60, Math.max(12, Number(e.target.value))))}
            />
          </div>
        </label>

        <div className="ml-auto flex gap-2">
          <Button variant="ghost" size="sm" onClick={onAddKeyframe}>
            + Keyframe
          </Button>
          <Button variant="destructive" size="sm" onClick={onDeleteSelected} disabled={!selectedId}>
            Delete selected
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-border">
        {/* Camera lane */}
        <div className="flex items-stretch bg-input/60">
          <LaneLabel>Camera</LaneLabel>
          <div ref={trackRef} onPointerDown={handleTrackPointerDown} className="relative h-14 flex-1 cursor-pointer">
            <div className="pointer-events-none absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 bg-border" />
            <div
              className="pointer-events-none absolute inset-y-0 left-0 bg-accent/10"
              style={{ width: `${playheadPct}%` }}
            />
            <div
              className="pointer-events-none absolute top-0 z-20 h-full w-px bg-gradient-to-b from-foreground/80 to-foreground/10"
              style={{ left: `${playheadPct}%` }}
            >
              <div className="absolute -top-1 left-1/2 h-3 w-3 -translate-x-1/2 rounded-full bg-foreground shadow-[0_0_0_3px_rgba(231,233,238,0.15)]" />
            </div>

            {sorted.map((k) => {
              const pct = project.duration > 0 ? (k.time / project.duration) * 100 : 0;
              const selected = k.id === selectedId;
              return (
                <div
                  key={k.id}
                  onPointerDown={handleMarkerPointerDown(k.id)}
                  title={`t = ${k.time.toFixed(2)}s · ${k.easing}`}
                  className={`absolute top-1/2 z-10 h-4 w-4 -translate-x-1/2 -translate-y-1/2 cursor-grab rounded-full border-2 transition-transform hover:scale-125 active:cursor-grabbing ${
                    selected
                      ? "scale-125 border-foreground bg-accent shadow-[0_0_0_3px_rgba(103,216,196,0.35)]"
                      : "border-accent/60 bg-accent"
                  }`}
                  style={{ left: `${pct}%` }}
                />
              );
            })}
          </div>
        </div>

        {/* Subject lane — shows per-keyframe framing (centered vs. off-center) */}
        <div className="flex items-stretch border-t border-border bg-input/30">
          <LaneLabel>Subject</LaneLabel>
          <div onPointerDown={handleTrackPointerDown} className="relative h-8 flex-1 cursor-pointer">
            <div className="pointer-events-none absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 bg-border/60" />
            <div
              className="pointer-events-none absolute top-0 z-10 h-full w-px bg-foreground/20"
              style={{ left: `${playheadPct}%` }}
            />
            {sorted.map((k) => {
              const pct = project.duration > 0 ? (k.time / project.duration) * 100 : 0;
              const selected = k.id === selectedId;
              const centered = k.camera.subjectCentered;
              return (
                <div
                  key={k.id}
                  onPointerDown={handleMarkerPointerDown(k.id)}
                  title={
                    centered
                      ? "Subject centered"
                      : `Off-center · offset ${k.camera.frameOffsetX.toFixed(1)}, ${k.camera.frameOffsetY.toFixed(1)} m`
                  }
                  className={`absolute top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 cursor-grab transition-transform hover:scale-125 active:cursor-grabbing ${
                    centered ? "h-2 w-2 rounded-full bg-muted-foreground/50" : "h-2.5 w-2.5 rotate-45 rounded-[2px] bg-accent"
                  } ${selected ? "scale-125 ring-2 ring-foreground/70" : ""}`}
                  style={{ left: `${pct}%` }}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function LaneLabel({ children }: { children: ReactNode }) {
  return (
    <div className="flex w-16 flex-none items-center border-r border-border px-2 text-[10.5px] uppercase tracking-wide text-muted-foreground">
      {children}
    </div>
  );
}
