"use client";

import { useState, useEffect, useRef } from "react";
import {
  Circle, Video, CheckCircle2, AlertCircle,
  SlidersHorizontal, Camera, Layers, Save, Film, Download, ChevronDown,
} from "lucide-react";
import { usePrevisStore, LENS_GROUPS, ASPECT_RATIOS, RENDER_RESOLUTIONS, type FocalLength, type RenderResolution } from "@/lib/usePrevisStore";
import { transcodeWebmToMp4, downloadBlob } from "@/lib/exportMp4";

/**
 * Right-side inspector panel.
 *
 * Shows the selected proxy's transform (position/rotation/scale) with numeric
 * inputs when one is selected, or shot-camera framing settings otherwise.
 * Always shows the motion prompt + generate button at the bottom.
 */
/**
 * Styled wrapper around a native <select>. Native option/optgroup popups
 * can't be restyled beyond color-scheme (no shadcn/Radix here), but the
 * closed control gets a modern, non-native look — flat dark field, custom
 * chevron, golf-accent focus ring — consistent with the rest of the panel.
 */
function SelectField({
  className = "",
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select
        {...props}
        style={{ colorScheme: "dark" }}
        className={`w-full appearance-none px-2 py-1.5 pr-6 bg-studio-bg border border-studio-border rounded-md text-[10px] text-studio-text focus:outline-none focus:ring-1 focus:ring-golf/60 focus:border-golf/60 hover:border-studio-borderHover transition-colors cursor-pointer ${className}`}
      >
        {children}
      </select>
      <ChevronDown className="w-3 h-3 text-studio-muted/60 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
    </div>
  );
}

export function PrevisInspector({
  viewfinderCanvasRef,
  beginHiResCapture,
  endHiResCapture,
}: {
  viewfinderCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  /** Bumps the Shot View canvas's native pixel resolution to match a target
   *  export height before recording starts (see PrevisStage for why). */
  beginHiResCapture: (targetHeight: number) => Promise<void>;
  /** Restores the Shot View canvas to its normal, cheap-to-render resolution. */
  endHiResCapture: () => void;
}) {
  const selectedProxyId = usePrevisStore((s) => s.selectedProxyId);
  const selectedProxy = usePrevisStore((s) =>
    s.proxies.find((p) => p.id === s.selectedProxyId),
  );

  return (
    <div className="flex flex-col h-full bg-studio-panel/50 overflow-hidden">
      {/* Transform or Camera settings */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {selectedProxy ? (
          <TransformEditor proxy={selectedProxy} />
        ) : (
          <CameraSettings />
        )}
      </div>

      {/* Prompt + Generate (always visible) */}
      <div className="shrink-0 border-t border-studio-border">
        <PromptAndGenerate
          viewfinderCanvasRef={viewfinderCanvasRef}
          beginHiResCapture={beginHiResCapture}
          endHiResCapture={endHiResCapture}
        />
      </div>
    </div>
  );
}

// =============================================================================
// Transform Editor
// =============================================================================

function TransformEditor({ proxy }: { proxy: NonNullable<ReturnType<typeof usePrevisStore.getState>["proxies"][number]> }) {
  const updateProxy = usePrevisStore((s) => s.updateProxy);
  const pushHistory = usePrevisStore((s) => s.pushHistory);

  const axes = [
    { key: "position" as const, label: "Pos", color: "#ef4444" },
    { key: "rotation" as const, label: "Rot", color: "#22c55e" },
    { key: "scale" as const, label: "Scl", color: "#3b82f6" },
  ] as const;

  const comps = ["X", "Y", "Z"] as const;

  return (
    <div className="p-2.5 flex flex-col gap-2.5">
      {/* Header */}
      <div className="flex items-center gap-1.5">
        <SlidersHorizontal className="w-3 h-3 text-golf" />
        <span className="text-[9px] text-studio-muted/60 uppercase tracking-wider font-semibold truncate">{proxy.label}</span>
        <span className="text-[8px] text-studio-muted/40 uppercase ml-auto">{proxy.kind}</span>
      </div>

      {/* Transform rows */}
      {axes.map((axis) => (
        <div key={axis.key} className="flex flex-col gap-1">
          <div className="flex items-center gap-1">
            <span className="text-[8px] text-studio-muted/60 uppercase tracking-wider w-6">{axis.label}</span>
            <div className="flex-1 grid grid-cols-3 gap-1">
              {comps.map((c, i) => (
                <TransformInput
                  key={c}
                  axisColor={axis.color}
                  label={c}
                  value={proxy[axis.key][i]}
                  onChange={(v) => {
                    pushHistory();
                    const arr = [...proxy[axis.key]] as [number, number, number];
                    arr[i] = v;
                    updateProxy(proxy.id, { [axis.key]: arr });
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      ))}

      {/* Color picker */}
      <div className="flex items-center gap-1.5 pt-0.5">
        <span className="text-[8px] text-studio-muted/60 uppercase tracking-wider w-6">Color</span>
        <input
          type="color"
          value={proxy.color}
          onChange={(e) => updateProxy(proxy.id, { color: e.target.value })}
          className="w-5 h-5 rounded cursor-pointer bg-transparent border border-studio-border"
        />
        <span className="text-[9px] text-studio-muted/40 font-mono">{proxy.color}</span>
      </div>
    </div>
  );
}

function TransformInput({
  label,
  value,
  onChange,
  axisColor,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  axisColor: string;
}) {
  const [text, setText] = useState(String(value.toFixed(2)));

  // Sync external changes (e.g. from gizmo drag)
  useEffect(() => {
    setText(value.toFixed(2));
  }, [value]);

  return (
    <div className="relative flex items-center">
      <span
        className="absolute left-1 text-[7px] font-bold pointer-events-none"
        style={{ color: axisColor }}
      >
        {label}
      </span>
      <input
        type="number"
        step="0.1"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => {
          const v = parseFloat(text);
          if (!isNaN(v)) onChange(v);
          else setText(value.toFixed(2));
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        }}
        className="w-full pl-3.5 pr-0.5 py-1 bg-studio-bg border border-studio-border rounded text-[10px] text-studio-text text-right tabular-nums focus:outline-none focus:border-golf/50 hover:border-studio-borderHover transition-colors"
      />
    </div>
  );
}

// =============================================================================
// Camera Settings (shown when no proxy is selected)
// =============================================================================

function CameraSettings() {
  const {
    focalLength, setFocalLength,
    aspectRatio, setAspectRatio,
    renderResolution, setRenderResolution,
    actionAxisAngle, setActionAxisAngle,
    depthMode, setDepthMode,
    depthRange, setDepthRange,
    cameraChannels, addChannelKeyframe, currentFrame,
  } = usePrevisStore();

  const currentFrameRounded = Math.round(currentFrame);
  const focalAnimated = cameraChannels.focal.length > 0;

  return (
    <div className="p-2.5 flex flex-col gap-2.5">
      <div className="flex items-center gap-1.5">
        <Camera className="w-3 h-3 text-golf" />
        <span className="text-[9px] text-studio-muted/60 uppercase tracking-wider font-semibold">Shot Camera</span>
      </div>

      {/* Focal length — dropdown grouped by lens type */}
      <div className="flex flex-col gap-1">
        <label className="text-[8px] text-studio-muted/60 uppercase tracking-wider">
          Focal Length{focalAnimated && <span className="text-golf ml-1 normal-case">(animated)</span>}
        </label>
        <SelectField
          value={focalLength}
          onChange={(e) => {
            const f = parseInt(e.target.value, 10) as FocalLength;
            setFocalLength(f);
            if (focalAnimated) addChannelKeyframe("focal", currentFrameRounded, f);
          }}
        >
          {LENS_GROUPS.map((group) => (
            <optgroup key={group.label} label={group.label}>
              {group.focal.map((f) => (
                <option key={f} value={f}>{f}mm — {group.hint}</option>
              ))}
            </optgroup>
          ))}
        </SelectField>
      </div>

      {/* Aspect ratio — dropdown */}
      <div className="flex flex-col gap-1">
        <label className="text-[8px] text-studio-muted/60 uppercase tracking-wider">Aspect Ratio</label>
        <SelectField value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value as typeof aspectRatio)}>
          {ASPECT_RATIOS.map((a) => (
            <option key={a.id} value={a.id}>{a.label} ({a.w}:{a.h})</option>
          ))}
        </SelectField>
      </div>

      {/* Render resolution — dropdown */}
      <div className="flex flex-col gap-1">
        <label className="text-[8px] text-studio-muted/60 uppercase tracking-wider">Render Resolution</label>
        <SelectField value={renderResolution} onChange={(e) => setRenderResolution(e.target.value as RenderResolution)}>
          {RENDER_RESOLUTIONS.map((r) => (
            <option key={r.id} value={r.id}>{r.label} ({r.height}p)</option>
          ))}
        </SelectField>
      </div>

      {/* Action axis (180° line) */}
      <div className="flex flex-col gap-1">
        <span className="text-[8px] text-studio-muted/60 uppercase tracking-wider">Action Axis (180° Line)</span>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={0}
            max={360}
            step={5}
            value={actionAxisAngle}
            onChange={(e) => setActionAxisAngle(parseInt(e.target.value, 10))}
            className="flex-1 accent-golf"
          />
          <span className="text-[10px] text-studio-muted tabular-nums w-8 text-right">{actionAxisAngle}°</span>
        </div>
      </div>

      {/* Depth pass toggle */}
      <button
        onClick={() => setDepthMode(!depthMode)}
        className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[10px] font-medium transition-colors ${
          depthMode
            ? "bg-studio-warning/20 text-studio-warning border border-studio-warning/30"
            : "bg-studio-panelHover text-studio-muted hover:text-studio-text border border-transparent"
        }`}
      >
        <Layers className="w-3 h-3" />
        Depth Pass
        <span className="ml-auto text-[8px] opacity-60">{depthMode ? "ON" : "OFF"}</span>
      </button>

      {/* Depth range slider — only visible when depth pass is ON */}
      {depthMode && (
        <div className="flex flex-col gap-1 pl-1 border-l-2 border-studio-warning/30">
          <div className="flex items-center justify-between">
            <span className="text-[8px] text-studio-muted/60 uppercase tracking-wider">Depth Range</span>
            <span className="text-[10px] text-studio-warning tabular-nums">{depthRange}m</span>
          </div>
          <input
            type="range"
            min={2}
            max={40}
            step={1}
            value={depthRange}
            onChange={(e) => setDepthRange(parseInt(e.target.value, 10))}
            className="w-full accent-studio-warning"
          />
          <p className="text-[8px] text-studio-muted/40 leading-relaxed">
            White = at camera · Black = {depthRange}m away. Adjust so your scene fills the gradient.
          </p>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Prompt + Generate
// =============================================================================

function pickRecorderMime(): string {
  const candidates = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm", "video/mp4"];
  for (const c of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(c)) return c;
  }
  return "video/webm";
}

/**
 * WebM bitrate scaled to the target export resolution. The intermediate
 * MediaRecorder capture is now taken at (roughly) the real export
 * resolution instead of a tiny ~360px-tall preview, so it needs meaningfully
 * more bits than a single fixed 8Mbps to not look soft before ffmpeg even
 * gets it. This is a rough per-resolution heuristic, not a precise formula —
 * previs footage (flat-shaded proxies, little texture detail) compresses
 * well, so it doesn't need as much headroom as live-action.
 */
function webmBitrateFor(height: number): number {
  return Math.round(height * 11_000);
}

function PromptAndGenerate({
  viewfinderCanvasRef,
  beginHiResCapture,
  endHiResCapture,
}: {
  viewfinderCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  beginHiResCapture: (targetHeight: number) => Promise<void>;
  endHiResCapture: () => void;
}) {
  const {
    isRecording, setIsRecording, setIsPlaying, setCurrentFrame,
    durationFrames, fps,
    savedPrevisUrl, setSavedPrevisUrl,
    renderResolution,
  } = usePrevisStore();

  const [isTranscoding, setIsTranscoding] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  // Kept in memory only (not localStorage — MP4s are too big); revoked on next render.
  const mp4UrlRef = useRef<string | null>(null);

  const handleRenderPrevis = async () => {
    const canvas = viewfinderCanvasRef.current;
    if (!canvas || isRecording) return;

    const height = RENDER_RESOLUTIONS.find((r) => r.id === renderResolution)?.height ?? 720;

    setCurrentFrame(0);
    setError(null);
    setProgress(0);
    if (mp4UrlRef.current) {
      URL.revokeObjectURL(mp4UrlRef.current);
      mp4UrlRef.current = null;
    }
    setSavedPrevisUrl(null);

    // Raise the canvas's native pixel resolution to match the export target
    // *before* touching MediaRecorder — captureStream() reads whatever
    // resolution the canvas is actually rendering at right now.
    await beginHiResCapture(height);

    setIsPlaying(true);
    setIsRecording(true);

    try {
      const stream = canvas.captureStream(fps);
      const mimeType = pickRecorderMime();
      const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: webmBitrateFor(height) });
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => { if (e.data && e.data.size > 0) chunks.push(e.data); };
      recorder.onstop = async () => {
        setIsPlaying(false);
        setIsRecording(false);
        endHiResCapture(); // back to the cheap preview resolution now that capture is done
        const webmBlob = new Blob(chunks, { type: mimeType });
        // Transcode the recorded WebM to an H.264 MP4 entirely in the browser
        // (ffmpeg.wasm) — no server round-trip, nothing uploaded anywhere.
        try {
          setIsTranscoding(true);
          const mp4Blob = await transcodeWebmToMp4(webmBlob, {
            height,
            fps,
            onProgress: setProgress,
          });
          const url = URL.createObjectURL(mp4Blob);
          mp4UrlRef.current = url;
          setSavedPrevisUrl(url);
        } catch (err) {
          console.error("[Previs] failed to transcode to MP4:", err);
          setError(err instanceof Error ? err.message : "Failed to render previs to MP4");
        } finally {
          setIsTranscoding(false);
        }
      };
      recorder.start();
      const captureMs = (durationFrames / fps) * 1000 + 250;
      setTimeout(() => { if (recorder.state !== "inactive") recorder.stop(); }, captureMs);
    } catch (err) {
      console.error("[Previs] capture failed:", err);
      setIsPlaying(false);
      setIsRecording(false);
      endHiResCapture();
      setError(err instanceof Error ? err.message : "Failed to capture previs");
    }
  };

  const handleDownload = async () => {
    if (!savedPrevisUrl) return;
    const resp = await fetch(savedPrevisUrl);
    const blob = await resp.blob();
    downloadBlob(blob, `previs-${Date.now()}.mp4`);
  };

  return (
    <div className="p-2.5 flex flex-col gap-2">
      <div className="flex items-center gap-1.5">
        <Film className="w-3 h-3 text-golf" />
        <span className="text-[9px] text-studio-muted/60 uppercase tracking-wider font-semibold">Render Previs</span>
      </div>

      <button
        onClick={handleRenderPrevis}
        disabled={isRecording || isTranscoding}
        className="w-full px-3 py-2 bg-golf hover:bg-golf-hover disabled:opacity-50 disabled:cursor-not-allowed text-studio-bg rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 shadow-lg shadow-golf/20 transition-colors"
      >
        {isRecording ? (
          <><Circle className="w-3 h-3 fill-red-500 text-red-500 animate-pulse" /> Recording...</>
        ) : isTranscoding ? (
          <><Save className="w-3 h-3 animate-spin" /> Rendering MP4... {progress > 0 ? `${Math.round(progress * 100)}%` : ""}</>
        ) : (
          <><Video className="w-3.5 h-3.5" /> Render to MP4</>
        )}
      </button>

      {/* Status */}
      {isTranscoding && (
        <div className="flex items-center gap-1.5 text-[10px] text-studio-muted bg-studio-bg/60 border border-studio-border rounded-lg px-2 py-1.5">
          <Save className="w-3 h-3 animate-spin text-golf shrink-0" />
          <span>Transcoding in your browser (first run downloads the ffmpeg engine, ~25MB)...</span>
        </div>
      )}
      {error && (
        <div className="flex items-start gap-1.5 text-[10px] text-studio-danger bg-studio-bg/60 border border-studio-danger/40 rounded-lg px-2 py-1.5">
          <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {savedPrevisUrl && !isTranscoding && (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-[10px] text-studio-success bg-studio-bg/60 border border-studio-success/40 rounded-lg px-2 py-1.5">
            <CheckCircle2 className="w-3 h-3 shrink-0" />
            <span className="truncate flex-1">MP4 ready</span>
            <a
              href={savedPrevisUrl}
              target="_blank"
              rel="noreferrer"
              className="text-golf hover:underline shrink-0"
            >
              preview
            </a>
          </div>
          <button
            onClick={handleDownload}
            className="w-full flex items-center justify-center gap-1.5 px-2.5 py-1.5 bg-golf/15 hover:bg-golf/25 border border-golf/40 text-golf rounded-lg text-[10px] font-semibold transition-colors"
          >
            <Download className="w-3 h-3" />
            Download MP4
          </button>
        </div>
      )}
    </div>
  );
}
