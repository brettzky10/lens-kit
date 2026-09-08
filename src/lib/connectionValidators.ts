import type { Connection, Edge, Node } from "@xyflow/react";
import type { AnyNodeData } from "./types";

import {
  CHARACTER_IMAGE_OUT_ID,
  CHARACTER_PROMPT_OUT_ID,
  REFERENCE_IMAGE_OUT_ID,
} from "./handleIds";

type FlowNode = Node<AnyNodeData>;

/**
 * Allowed into a "prompt-in" target handle:
 *
 * - Prompt
 * - Camera
 * - Lens
 * - Character prompt output
 */
export function isValidPromptSource(
  connection: Connection | Edge,
  nodes: FlowNode[]
): boolean {
  const sourceNode = nodes.find((n) => n.id === connection.source);

  const kind = (sourceNode?.data as AnyNodeData | undefined)?.kind;

  if (kind === "prompt" || kind === "camera" || kind === "lens") {
    return true;
  }

  if (
    kind === "character" &&
    connection.sourceHandle === CHARACTER_PROMPT_OUT_ID
  ) {
    return true;
  }

  return false;
}

/**
 * Allowed into an "image-refs-in" target handle:
 *
 * - Image output
 * - Character image output
 * - Reference Image output
 */
export function isValidImageRefSource(
  connection: Connection | Edge,
  nodes: FlowNode[]
): boolean {
  const sourceNode = nodes.find((n) => n.id === connection.source);

  const kind = (sourceNode?.data as AnyNodeData | undefined)?.kind;

  if (kind === "image") {
    return true;
  }

  if (
    kind === "character" &&
    connection.sourceHandle === CHARACTER_IMAGE_OUT_ID
  ) {
    return true;
  }

  if (
    kind === "reference" &&
    connection.sourceHandle === REFERENCE_IMAGE_OUT_ID
  ) {
    return true;
  }

  return false;
}