import type { Connection, Edge, Node } from "@xyflow/react";
import type { AnyNodeData } from "./types";
import { isSheetKind } from "./types";
import { SHEET_IMAGE_OUT_ID, SHEET_PROMPT_OUT_ID, SHOT_PROMPT_OUT_ID, SHOT_VIDEO_OUT_ID, VIDEO_OUT_ID } from "./handleIds";

type FlowNode = Node<AnyNodeData>;

/**
 * Allowed into a "prompt-in" target handle:
 *  - Prompt / Camera / Lens nodes (their single, unlabeled source handle)
 *  - A Character/Object/Location "sheet" node, but only from its dedicated
 *    sheet-prompt-out source handle (not its image-out handle).
 *  - A Shot node, but only from its dedicated shot-prompt-out source
 *    handle (not its video-out handle).
 */
export function isValidPromptSource(connection: Connection | Edge, nodes: FlowNode[]): boolean {
  const sourceNode = nodes.find((n) => n.id === connection.source);
  const kind = (sourceNode?.data as AnyNodeData | undefined)?.kind;
  if (!kind) return false;
  if (kind === "prompt" || kind === "camera" || kind === "lens") return true;
  if (isSheetKind(kind) && connection.sourceHandle === SHEET_PROMPT_OUT_ID) return true;
  if (kind === "shot" && connection.sourceHandle === SHOT_PROMPT_OUT_ID) return true;
  return false;
}

/**
 * Allowed into an "image-refs-in" target handle:
 *  - Image nodes (their single, unlabeled source handle)
 *  - Reference nodes (their single, unlabeled source handle)
 *  - A Character/Object/Location "sheet" node, but only from its dedicated
 *    sheet-image-out source handle (not its prompt-out handle).
 */
export function isValidImageRefSource(connection: Connection | Edge, nodes: FlowNode[]): boolean {
  const sourceNode = nodes.find((n) => n.id === connection.source);
  const kind = (sourceNode?.data as AnyNodeData | undefined)?.kind;
  if (!kind) return false;
  if (kind === "image" || kind === "reference") return true;
  if (isSheetKind(kind) && connection.sourceHandle === SHEET_IMAGE_OUT_ID) return true;
  return false;
}

/**
 * Allowed into a "video-ref-in" target handle (a single video reference —
 * e.g. flux-3's start_video field, or the Upscale node's input_video):
 *  - A Shot node, but only from its dedicated shot-video-out source handle.
 *  - A Video node, but only from its dedicated video-out source handle
 *    (its generated output).
 */
export function isValidVideoRefSource(connection: Connection | Edge, nodes: FlowNode[]): boolean {
  const sourceNode = nodes.find((n) => n.id === connection.source);
  const kind = (sourceNode?.data as AnyNodeData | undefined)?.kind;
  if (!kind) return false;
  if (kind === "shot" && connection.sourceHandle === SHOT_VIDEO_OUT_ID) return true;
  if (kind === "video" && connection.sourceHandle === VIDEO_OUT_ID) return true;
  return false;
}
