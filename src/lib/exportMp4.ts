/**
 * Client-side MP4 export.
 *
 * The viewfinder canvas is captured to a WebM blob via MediaRecorder (see
 * PrevisInspector). Browsers cannot record MP4/H.264 directly, so this module
 * transcodes that WebM to MP4 entirely in the browser using ffmpeg.wasm —
 * no server, no upload, nothing leaves the machine.
 *
 * The ffmpeg-core wasm/js bundle (~25MB) is fetched from a CDN on first use
 * and cached by the browser; the FFmpeg instance itself is reused across
 * calls (loading it is the slow part, ~1-2s).
 */

import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

const CORE_VERSION = "0.12.6";
const CORE_BASE = `https://unpkg.com/@ffmpeg/core@${CORE_VERSION}/dist/umd`;

let ffmpegPromise: Promise<FFmpeg> | null = null;

async function getFFmpeg(onLog?: (msg: string) => void): Promise<FFmpeg> {
  if (!ffmpegPromise) {
    ffmpegPromise = (async () => {
      const ffmpeg = new FFmpeg();
      if (onLog) ffmpeg.on("log", ({ message }) => onLog(message));
      const [coreURL, wasmURL] = await Promise.all([
        toBlobURL(`${CORE_BASE}/ffmpeg-core.js`, "text/javascript"),
        toBlobURL(`${CORE_BASE}/ffmpeg-core.wasm`, "application/wasm"),
      ]);
      await ffmpeg.load({ coreURL, wasmURL });
      return ffmpeg;
    })();
  }
  return ffmpegPromise;
}

export interface TranscodeOptions {
  /** Target output height in pixels; width is derived from the source aspect ratio. */
  height: number;
  /**
   * Output frame rate. `MediaRecorder`'s captured WebM has irregular frame
   * timestamps (it only writes a new frame when the canvas actually changes,
   * plus occasional gaps if the tab was briefly busy) — most desktop players
   * handle that variable frame rate far worse than a browser's <video> tag
   * does, which reads like stutter/lag even though the source motion was
   * smooth. Passing `-r` here forces ffmpeg to resample to a real constant
   * frame rate (duplicating/dropping as needed) so playback is even
   * everywhere, not just in-browser.
   */
  fps: number;
  /** Constant-rate H.264 quality — lower is better/bigger (18-28 is the usual range). */
  crf?: number;
  onProgress?: (ratio: number) => void;
  onLog?: (msg: string) => void;
}

/** Transcode a recorded WebM (VP8/VP9) blob to an H.264 MP4 blob. */
export async function transcodeWebmToMp4(
  webmBlob: Blob,
  { height, fps, crf = 20, onProgress, onLog }: TranscodeOptions,
): Promise<Blob> {
  const ffmpeg = await getFFmpeg(onLog);

  const offProgress = onProgress
    ? (() => {
        const handler = ({ progress }: { progress: number }) => onProgress(Math.max(0, Math.min(1, progress)));
        ffmpeg.on("progress", handler);
        return () => ffmpeg.off("progress", handler);
      })()
    : null;

  const inputName = "input.webm";
  const outputName = "output.mp4";

  try {
    await ffmpeg.writeFile(inputName, await fetchFile(webmBlob));
    await ffmpeg.exec([
      "-i", inputName,
      // Even width derived from source aspect ratio (-2 keeps it a multiple of 2, required by yuv420p).
      // Only scales DOWN in practice — the capture is now sized to match the
      // target resolution already (see PrevisStage's capture-time dpr bump),
      // so this filter is mostly a safety net rather than doing real upscaling.
      "-vf", `scale=-2:${height}`,
      // Force a real constant frame rate on the output (see TranscodeOptions.fps doc).
      "-r", String(fps),
      "-c:v", "libx264",
      "-preset", "veryfast",
      "-crf", String(crf),
      "-pix_fmt", "yuv420p",
      "-movflags", "+faststart",
      "-an",
      outputName,
    ]);
    const data = await ffmpeg.readFile(outputName);
    const bytes = data as Uint8Array;
    return new Blob([bytes.slice().buffer], { type: "video/mp4" });
  } finally {
    offProgress?.();
    try {
      await ffmpeg.deleteFile(inputName);
      await ffmpeg.deleteFile(outputName);
    } catch {
      // Best-effort cleanup — fine if these fail (e.g. exec threw before writing output).
    }
  }
}

/** Trigger a browser download for a blob without navigating away from the page. */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
