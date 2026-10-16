/**
 * Node execution, lifted out of the components so "Run from here / Run till here"
 * can run any node in the graph. Prompt and references are read from the store at
 * run time, so downstream nodes see their upstream outputs as soon as they finish.
 *
 * Sheet / Upscale / Edit nodes: move their generate logic into a function and
 * register it with registerNodeRunner("character", fn) etc. They're only counted
 * in credit estimates and executed once registered.
 */
import { useFlowStore } from "./flowStore";
import {
  collectUpstreamImageRefs,
  collectUpstreamVideoRefs,
  composeUpstreamPrompt,
} from "./promptGraph";
import { IMAGE_REFS_HANDLE_ID, PROMPT_HANDLE_ID, VIDEO_REF_HANDLE_ID } from "./handleIds";
import { buildSheetPrompt } from "./sheetConfig";
import type { ImageNodeData, SheetNodeData, UpscaleNodeData, VideoNodeData } from "./types";

export type NodeRunner = (id: string) => Promise<void>;
const get = () => useFlowStore.getState();
const patch = (id: string, p: Record<string, unknown>) => get().updateNodeData(id, p as any);
const dataOf = <T,>(id: string) => get().nodes.find((n) => n.id === id)?.data as T | undefined;

function startProgress(id: string, step: number, ms: number) {
  return setInterval(() => {
    const cur = (dataOf<{ progress?: number }>(id)?.progress ?? 0) + Math.random() * step;
    patch(id, { progress: Math.min(95, cur) });
  }, ms);
}

export async function runImageNode(id: string) {
  const { nodes, edges } = get();
  const d = dataOf<ImageNodeData>(id);
  if (!d || d.status === "loading") return;

  const prompt = composeUpstreamPrompt(id, nodes as any, edges, PROMPT_HANDLE_ID);
  const imageRefs = collectUpstreamImageRefs(id, nodes as any, edges, IMAGE_REFS_HANDLE_ID);
  if (!prompt) return void patch(id, { status: "error", progress: 0 });

  patch(id, { status: "loading", progress: 0, prompt, fallbackNotice: null });
  const timer = startProgress(id, 18, 350);
  try {
    const res = await fetch("/api/generate-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt, imageRefs, provider: d.provider,
        aspectRatio: d.aspectRatio, resolution: d.resolution,
      }),
    });
    const json = await res.json();
    if (!res.ok || !json.imageUrl) throw new Error(json.error ?? "No image returned");
    patch(id, {
      status: "done", progress: 100, imageUrl: json.imageUrl,
      fallbackNotice: json.fallback ? (json.fallbackReason ?? "Using placeholder image.") : null,
    });
  } catch {
    patch(id, { status: "error", progress: 0 });
  } finally {
    clearInterval(timer);
  }
}

export async function runVideoNode(id: string) {
  const { nodes, edges } = get();
  const d = dataOf<VideoNodeData>(id);
  if (!d || d.status === "loading") return;

  const prompt = composeUpstreamPrompt(id, nodes as any, edges, PROMPT_HANDLE_ID);
  const imageRefs = collectUpstreamImageRefs(id, nodes as any, edges, IMAGE_REFS_HANDLE_ID);
  const videoRefs = collectUpstreamVideoRefs(id, nodes as any, edges, VIDEO_REF_HANDLE_ID);
  if (!prompt && imageRefs.length === 0 && videoRefs.length === 0)
    return void patch(id, { status: "error", progress: 0 });

  patch(id, { status: "loading", progress: 0, prompt, fallbackNotice: null });
  const timer = startProgress(id, 12, 400);
  try {
    const res = await fetch("/api/generate-video", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt, imageRefs, videoRefs,
        duration: d.duration, resolution: d.resolution, aspectRatio: d.aspectRatio,
        audio: d.audio !== false, draft: d.draft === true, provider: d.provider,
      }),
    });
    const json = await res.json();
    if (!res.ok || !json.videoUrl) throw new Error(json.error ?? "No video returned");
    patch(id, {
      status: "done", progress: 100, videoUrl: json.videoUrl,
      fallbackNotice: json.fallback ? (json.fallbackReason ?? "Using placeholder video.") : null,
    });
  } catch {
    patch(id, { status: "error", progress: 0 });
  } finally {
    clearInterval(timer);
  }
}

export async function runUpscaleNode(id: string) {
  const { nodes, edges } = get();
  const d = dataOf<UpscaleNodeData>(id);
  if (!d || d.status === "loading") return;
  const inputVideo = collectUpstreamVideoRefs(id, nodes as any, edges, VIDEO_REF_HANDLE_ID)[0];
  if (!inputVideo) return void patch(id, { status: "error", progress: 0 });

  patch(id, { status: "loading", progress: 0, fallbackNotice: null });
  const timer = startProgress(id, 10, 450);
  try {
    const res = await fetch("/api/upscale-video", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        inputVideo, prompt: d.prompt, creativity: d.creativity,
        upscaleFactor: d.upscaleFactor, safetyTolerance: d.safetyTolerance, provider: d.provider,
      }),
    });
    const json = await res.json();
    if (!res.ok || !json.videoUrl) throw new Error(json.error ?? "No video returned");
    patch(id, {
      status: "done", progress: 100, videoUrl: json.videoUrl,
      fallbackNotice: json.fallback ? (json.fallbackReason ?? "Returned the original video, unscaled.") : null,
    });
  } catch {
    patch(id, { status: "error", progress: 0 });
  } finally {
    clearInterval(timer);
  }
}

export async function runSheetNode(id: string) {
  const { nodes, edges } = get();
  const d = dataOf<SheetNodeData>(id);
  if (!d || d.status === "loading") return;
  const description = composeUpstreamPrompt(id, nodes as any, edges, PROMPT_HANDLE_ID).trim();
  const imageRefs = collectUpstreamImageRefs(id, nodes as any, edges, IMAGE_REFS_HANDLE_ID);
  if (!description && imageRefs.length === 0) return void patch(id, { status: "error", progress: 0 });

  patch(id, { status: "loading", progress: 0, fallbackNotice: null });
  const timer = startProgress(id, 18, 350);
  try {
    // one generation: a 16:9 image split into three cards of the same character / prop / location
    const res = await fetch("/api/generate-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: buildSheetPrompt(d.kind, description, imageRefs.length > 0),
        imageRefs, provider: d.provider, aspectRatio: "16:9", resolution: d.resolution,
      }),
    });
    const json = await res.json();
    if (!res.ok || !json.imageUrl) throw new Error(json.error ?? `Failed to generate ${d.kind} sheet.`);
    patch(id, {
      status: "done", progress: 100, sheetImage: json.imageUrl,
      outputPrompt: description, // what downstream Image/Video nodes receive from the prompt output
      fallbackNotice: json.fallback ? (json.fallbackReason ?? "Using placeholder image.") : null,
    });
  } catch {
    patch(id, { status: "error", progress: 0 });
  } finally {
    clearInterval(timer);
  }
}

const RUNNERS: Record<string, NodeRunner> = {
  image: runImageNode,
  video: runVideoNode,
  upscale: runUpscaleNode,
  character: runSheetNode,
  object: runSheetNode,
  location: runSheetNode,
};
export const registerNodeRunner = (kind: string, fn: NodeRunner) => void (RUNNERS[kind] = fn);
export const isRunnableKind = (kind: string) => kind in RUNNERS;

/** Runs nodes one after another (ids must already be in dependency order). Stops at the first failure. */
export async function runNodes(ids: string[]) {
  for (const id of ids) {
    const kind = (dataOf<{ kind: string }>(id))?.kind;
    const runner = kind ? RUNNERS[kind] : undefined;
    if (!runner) continue;
    await runner(id);
    if (dataOf<{ status?: string }>(id)?.status === "error") break;
  }
}
