const CANDIDATE_MIME_TYPES = [
  "video/webm;codecs=vp9",
  "video/webm;codecs=vp8",
  "video/webm",
];

export function pickSupportedMimeType(): string | null {
  if (typeof MediaRecorder === "undefined") return null;
  for (const type of CANDIDATE_MIME_TYPES) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return null;
}

export interface CanvasRecorder {
  start: () => void;
  stop: () => Promise<Blob>;
}

/**
 * Wraps MediaRecorder around a live canvas' captured stream. The caller is
 * responsible for actually driving playback (advancing time) for the
 * duration of the recording — this only handles encoding.
 */
export function createCanvasRecorder(canvas: HTMLCanvasElement, fps: number): CanvasRecorder | null {
  const mimeType = pickSupportedMimeType();
  if (!mimeType) return null;

  const stream = (canvas as HTMLCanvasElement & { captureStream: (fps?: number) => MediaStream }).captureStream(
    fps
  );
  const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 12_000_000 });
  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  let resolveStop: ((blob: Blob) => void) | null = null;

  recorder.onstop = () => {
    const blob = new Blob(chunks, { type: mimeType });
    resolveStop?.(blob);
  };

  return {
    start: () => recorder.start(),
    stop: () =>
      new Promise<Blob>((resolve) => {
        resolveStop = resolve;
        if (recorder.state !== "inactive") recorder.stop();
      }),
  };
}
