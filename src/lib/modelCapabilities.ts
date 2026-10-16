/**
 * What each model can accept. Drives which input connectors a node shows,
 * how many connections each allows, and what gets pruned when the model changes.
 * Edit the numbers here when a model's schema changes.
 */
import type { Edge } from "@xyflow/react";
import { IMAGE_REFS_HANDLE_ID, VIDEO_REF_HANDLE_ID } from "./handleIds";
import type { ImageModelProvider, VideoGenerationProvider } from "./providerOptions";

export interface InputCaps {
  imageRefs: number; // 0 = no image connector
  videoRefs: number; // 0 = no video connector
  imageLabel: string;
  videoLabel: string;
}

const NONE = "Not supported";

export const VIDEO_CAPS: Record<VideoGenerationProvider, InputCaps> = {
  veo: { imageRefs: 3, videoRefs: 0, imageLabel: "Start / end frame (1-2) or 3 references", videoLabel: NONE },
  seedance: { imageRefs: 30, videoRefs: 10, imageLabel: "Reference images (max 30)", videoLabel: "Reference videos (max 10)" },
  flux: { imageRefs: 10, videoRefs: 1, imageLabel: "Images: start / end / storyboard (max 10)", videoLabel: "Start video (continues from its last frames)" },
  wan: { imageRefs: 1, videoRefs: 0, imageLabel: "First frame", videoLabel: NONE },
  grok: { imageRefs: 1, videoRefs: 0, imageLabel: "Image to animate (required)", videoLabel: NONE },
  minimax: { imageRefs: 1, videoRefs: 0, imageLabel: "First frame", videoLabel: NONE }, // Hailuo 2.3
  local: { imageRefs: 10, videoRefs: 1, imageLabel: "Reference images", videoLabel: "Start video" },
};

export const IMAGE_CAPS: Record<ImageModelProvider, InputCaps> = {
  nanobanana: { imageRefs: 14, videoRefs: 0, imageLabel: "Reference images (max 14)", videoLabel: NONE },
  flux: { imageRefs: 8, videoRefs: 0, imageLabel: "Input images (max 8)", videoLabel: NONE },
  grok: { imageRefs: 1, videoRefs: 0, imageLabel: "Image to edit", videoLabel: NONE },
  local: { imageRefs: 8, videoRefs: 0, imageLabel: "Input images (max 8)", videoLabel: NONE },
};

export function capsFor(kind: "image" | "video", provider: string): InputCaps {
  const table = (kind === "video" ? VIDEO_CAPS : IMAGE_CAPS) as Record<string, InputCaps>;
  return table[provider] ?? table.flux;
}

/** Drop edges that the (new) model can't accept, and trim over-capacity connectors (keeps the first N). */
export function pruneEdgesForCaps(nodeId: string, caps: InputCaps, edges: Edge[]): Edge[] {
  const counts: Record<string, number> = {};
  return edges.filter((e) => {
    if (e.target !== nodeId) return true;
    const limit =
      e.targetHandle === IMAGE_REFS_HANDLE_ID ? caps.imageRefs
      : e.targetHandle === VIDEO_REF_HANDLE_ID ? caps.videoRefs
      : Infinity;
    const key = e.targetHandle ?? "";
    counts[key] = (counts[key] ?? 0) + 1;
    return counts[key] <= limit;
  });
}
