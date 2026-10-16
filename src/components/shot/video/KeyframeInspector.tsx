"use client";

import { useState } from "react";
import { EASING_OPTIONS, EasingType, Keyframe, KeyframeCamera } from "@/lib/shot/types";
import { generateOrbitKeyframes, generateDroneRevealOrbit } from "@/lib/shot/presets";
import { panelClass, panelTitleClass, fieldLabelClass, mutedNoteClass } from "@/lib/shot/ui";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";

interface KeyframeInspectorProps {
  keyframe: Keyframe | null;
  onChangeCamera: (partial: Partial<KeyframeCamera>) => void;
  onChangeTime: (time: number) => void;
  onChangeEasing: (easing: EasingType) => void;
  onChangeBezier: (bezier: [number, number, number, number]) => void;
  onGenerateKeyframes: (keyframes: Keyframe[]) => void;
}

type NumericCameraKey = Exclude<keyof KeyframeCamera, "subjectCentered">;

const CAMERA_FIELDS: { key: NumericCameraKey; label: string; min: number; max: number; step: number }[] = [
  { key: "azimuth", label: "Azimuth °", min: -180, max: 180, step: 1 },
  { key: "elevation", label: "Elevation °", min: -89, max: 89, step: 1 },
  { key: "distance", label: "Distance (m)", min: 0.5, max: 40, step: 0.1 },
  { key: "fov", label: "FOV °", min: 12, max: 120, step: 1 },
  { key: "roll", label: "Roll °", min: -45, max: 45, step: 1 },
  { key: "targetHeight", label: "Look-at height (m)", min: 0, max: 6, step: 0.05 },
  { key: "subjectRotationY", label: "Subject yaw °", min: -180, max: 180, step: 1 },
];

export default function KeyframeInspector({
  keyframe,
  onChangeCamera,
  onChangeTime,
  onChangeEasing,
  onChangeBezier,
  onGenerateKeyframes,
}: KeyframeInspectorProps) {
  const [orbit, setOrbit] = useState({
    count: 8,
    duration: 6,
    elevation: 15,
    distance: 6,
    fov: 45,
    targetHeight: 1.2,
    direction: 1 as 1 | -1,
  });

  const [drone, setDrone] = useState({
    revealDuration: 1.6,
    revealElevation: 55,
    revealDistanceMultiplier: 3.5,
  });

  return (
    <section className={panelClass}>
      <h2 className={panelTitleClass}>Keyframe inspector</h2>

      {keyframe ? (
        <>
          <div className="mb-3 flex items-center justify-between gap-3">
            <label className={fieldLabelClass}>Time (s)</label>
            <div className="w-24">
              <Input
                type="number"
                min={0}
                step={0.05}
                value={keyframe.time}
                onChange={(e) => onChangeTime(Math.max(0, Number(e.target.value)))}
              />
            </div>
          </div>

          <div className="mb-3 flex flex-col gap-3">
            {CAMERA_FIELDS.map((f) => (
              <SliderField
                key={f.key}
                label={f.label}
                min={f.min}
                max={f.max}
                step={f.step}
                value={keyframe.camera[f.key]}
                onChange={(v) => onChangeCamera({ [f.key]: v })}
              />
            ))}
          </div>

          <div className="mb-3 flex items-center justify-between gap-3 border-t border-border pt-3">
            <label className={fieldLabelClass}>Subject centered</label>
            <Switch
              checked={keyframe.camera.subjectCentered}
              onCheckedChange={(centered) =>
                onChangeCamera(
                  centered ? { subjectCentered: true, frameOffsetX: 0, frameOffsetY: 0 } : { subjectCentered: false }
                )
              }
            />
          </div>

          {!keyframe.camera.subjectCentered && (
            <div className="mb-3 flex flex-col gap-3 rounded-md border border-border bg-input/60 p-3">
              <SliderField
                label="Frame offset X (m)"
                min={-5}
                max={5}
                step={0.05}
                value={keyframe.camera.frameOffsetX}
                onChange={(v) => onChangeCamera({ frameOffsetX: v })}
              />
              <SliderField
                label="Frame offset Y (m)"
                min={-3}
                max={3}
                step={0.05}
                value={keyframe.camera.frameOffsetY}
                onChange={(v) => onChangeCamera({ frameOffsetY: v })}
              />
              <p className={mutedNoteClass}>Positive X shifts the subject right in frame, positive Y shifts it down.</p>
            </div>
          )}

          <div className="mb-3 flex items-center justify-between gap-3">
            <label className={fieldLabelClass}>Interpolation</label>
            <div className="w-40">
              <Select value={keyframe.easing} onValueChange={(v) => onChangeEasing(v as EasingType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EASING_OPTIONS.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {easingLabel(opt)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {keyframe.easing === "bezier" && (
            <div className="mb-3 grid grid-cols-2 gap-x-3 gap-y-3">
              {(["x1", "y1", "x2", "y2"] as const).map((label, i) => (
                <SliderField
                  key={label}
                  label={label}
                  min={label.startsWith("x") ? 0 : -1}
                  max={label.startsWith("x") ? 1 : 2}
                  step={0.01}
                  value={keyframe.bezier[i]}
                  onChange={(v) => {
                    const next = [...keyframe.bezier] as [number, number, number, number];
                    next[i] = v;
                    onChangeBezier(next);
                  }}
                />
              ))}
            </div>
          )}
        </>
      ) : (
        <p className={`${mutedNoteClass} mb-3`}>
          Select a keyframe on the timeline to edit it, or generate one of the presets below.
        </p>
      )}

      <details className="group border-t border-border pt-3" open={!keyframe}>
        <summary className="mb-2 cursor-pointer text-[12.5px] font-medium text-muted-foreground hover:text-foreground">
          Quick orbit generator
        </summary>
        <p className={`${mutedNoteClass} mb-3`}>
          Generates an evenly-spaced, constant-speed 360° orbit and replaces the current
          keyframes.
        </p>
        <div className="mb-3 flex flex-col gap-3">
          <SliderField
            label="Keyframes"
            min={3}
            max={24}
            step={1}
            value={orbit.count}
            onChange={(v) => setOrbit((o) => ({ ...o, count: v }))}
          />
          <SliderField
            label="Duration (s)"
            min={1}
            max={30}
            step={0.5}
            value={orbit.duration}
            onChange={(v) => setOrbit((o) => ({ ...o, duration: v }))}
          />
          <SliderField
            label="Elevation °"
            min={-89}
            max={89}
            step={1}
            value={orbit.elevation}
            onChange={(v) => setOrbit((o) => ({ ...o, elevation: v }))}
          />
          <SliderField
            label="Distance (m)"
            min={0.5}
            max={40}
            step={0.1}
            value={orbit.distance}
            onChange={(v) => setOrbit((o) => ({ ...o, distance: v }))}
          />
          <SliderField
            label="FOV °"
            min={12}
            max={120}
            step={1}
            value={orbit.fov}
            onChange={(v) => setOrbit((o) => ({ ...o, fov: v }))}
          />
          <SliderField
            label="Look-at height (m)"
            min={0}
            max={6}
            step={0.05}
            value={orbit.targetHeight}
            onChange={(v) => setOrbit((o) => ({ ...o, targetHeight: v }))}
          />
        </div>
        <div className="mb-3 flex items-center justify-between gap-3">
          <label className={fieldLabelClass}>Direction</label>
          <div className="w-40">
            <Select
              value={String(orbit.direction)}
              onValueChange={(v) => setOrbit((o) => ({ ...o, direction: Number(v) as 1 | -1 }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Clockwise</SelectItem>
                <SelectItem value="-1">Counter-clockwise</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button className="w-full" onClick={() => onGenerateKeyframes(generateOrbitKeyframes(orbit))}>
          Generate orbit
        </Button>
      </details>

      <details className="group border-t border-border pt-3 mt-3">
        <summary className="mb-2 cursor-pointer text-[12.5px] font-medium text-muted-foreground hover:text-foreground">
          Drone reveal → orbit
        </summary>
        <p className={`${mutedNoteClass} mb-3`}>
          Starts far, high, and off-frame, swoops in to find the subject, then settles into the
          orbit above. Uses the orbit settings for elevation, distance, FOV, look-at height,
          keyframe count and direction.
        </p>
        <div className="mb-3 flex flex-col gap-3">
          <SliderField
            label="Reveal duration (s)"
            min={0.5}
            max={8}
            step={0.1}
            value={drone.revealDuration}
            onChange={(v) => setDrone((d) => ({ ...d, revealDuration: v }))}
          />
          <SliderField
            label="Reveal elevation °"
            min={0}
            max={89}
            step={1}
            value={drone.revealElevation}
            onChange={(v) => setDrone((d) => ({ ...d, revealElevation: v }))}
          />
          <SliderField
            label="Reveal distance ×"
            min={1.5}
            max={8}
            step={0.1}
            value={drone.revealDistanceMultiplier}
            onChange={(v) => setDrone((d) => ({ ...d, revealDistanceMultiplier: v }))}
          />
        </div>
        <Button
          className="w-full"
          onClick={() =>
            onGenerateKeyframes(
              generateDroneRevealOrbit({
                orbitCount: orbit.count,
                orbitDuration: orbit.duration,
                elevation: orbit.elevation,
                distance: orbit.distance,
                fov: orbit.fov,
                targetHeight: orbit.targetHeight,
                direction: orbit.direction,
                revealDuration: drone.revealDuration,
                revealElevation: drone.revealElevation,
                revealDistanceMultiplier: drone.revealDistanceMultiplier,
              })
            )
          }
        >
          Generate drone reveal
        </Button>
      </details>
    </section>
  );
}

function SliderField({
  label,
  min,
  max,
  step,
  value,
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-3">
        <span className={fieldLabelClass}>{label}</span>
        <div className="w-20">
          <Input
            type="number"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            className="text-right"
          />
        </div>
      </div>
      <Slider
        min={min}
        max={max}
        step={step}
        value={[value]}
        onValueChange={([v]) => onChange(v)}
      />
    </div>
  );
}

function easingLabel(easing: EasingType): string {
  switch (easing) {
    case "linear":
      return "Linear";
    case "easeInOut":
      return "Ease In / Out";
    case "easeIn":
      return "Ease In";
    case "easeOut":
      return "Ease Out";
    case "bezier":
      return "Bezier (custom)";
  }
}
