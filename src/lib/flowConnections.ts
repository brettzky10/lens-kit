import type { Connection, Edge, Node } from "@xyflow/react";
import { IMAGE_REFS_HANDLE_ID, PROMPT_HANDLE_ID, VIDEO_REF_HANDLE_ID } from "./handleIds";
import { capsFor } from "./modelCapabilities";

/**
 * Structural rules on top of your per-connector validators (isValidPromptSource etc.,
 * which already enforce "text -> text, image -> image, video -> video"):
 *  - no self loops, duplicates or cycles
 *  - an Image/Video node can't take more connections than its selected model allows
 *  - Image/Video nodes only accept their known connectors
 * Direction (output -> input only) is enforced by React Flow's strict connection mode.
 */
export function isValidFlowConnection(c: Connection | Edge, nodes: Node[], edges: Edge[]): boolean {
  if (!c.source || !c.target || c.source === c.target) return false;

  const th = c.targetHandle ?? null;
  const sh = c.sourceHandle ?? null;
  if (edges.some((e) => e.source === c.source && e.target === c.target && (e.sourceHandle ?? null) === sh && (e.targetHandle ?? null) === th))
    return false;

  // cycle: can we already reach the source from the target?
  const seen = new Set<string>();
  const stack = [c.target];
  while (stack.length) {
    const id = stack.pop()!;
    if (id === c.source) return false;
    if (seen.has(id)) continue;
    seen.add(id);
    edges.forEach((e) => e.source === id && stack.push(e.target));
  }

  const target = nodes.find((n) => n.id === c.target);
  const data = target?.data as { kind?: string; provider?: string } | undefined;
  const k = data?.kind;
  if (k === "image" || k === "video" || k === "character" || k === "object" || k === "location") {
    const caps = capsFor(k === "video" ? "video" : "image", data?.provider ?? "");
    const limit =
      th === PROMPT_HANDLE_ID ? Infinity
      : th === IMAGE_REFS_HANDLE_ID ? caps.imageRefs
      : th === VIDEO_REF_HANDLE_ID ? caps.videoRefs
      : 0;
    const used = edges.filter((e) => e.target === c.target && (e.targetHandle ?? null) === th).length;
    if (used >= limit) return false;
  }
  return true;
}
