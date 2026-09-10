import type { Edge, Node } from "@xyflow/react";
import { CAMERAS } from "./cameraData";
import { LENSES } from "./lensData";
import { SHOTS } from "./shotsData";
import { isSheetKind } from "./types";
import type {
  AnyNodeData,
  CameraNodeData,
  ImageNodeData,
  LensNodeData,
  PromptNodeData,
  ReferenceNodeData,
  SheetNodeData,
  ShotNodeData,
  VideoNodeData,
} from "./types";

type FlowNode = Node<AnyNodeData>;

function textContribution(node: FlowNode): string | null {
  const data = node.data as AnyNodeData;
  if (data.kind === "prompt") {
    const d = data as PromptNodeData;
    return d.text?.trim() ? d.text.trim() : null;
  }
  if (data.kind === "camera") {
    const d = data as CameraNodeData;
    const cam = CAMERAS.find((c) => c.id === d.cameraId);
    return cam ? cam.promptText : null;
  }
  if (data.kind === "lens") {
    const d = data as LensNodeData;
    const lens = LENSES.find((l) => l.id === d.lensId);
    if (!lens) return null;
    return `${lens.promptText(d.focalLength)} at ${d.aperture}`;
  }
  if (isSheetKind(data.kind)) {
    const d = data as SheetNodeData;
    return d.outputPrompt?.trim() ? d.outputPrompt.trim() : null;
  }
  if (data.kind === "shot") {
    const d = data as ShotNodeData;
    const shot = SHOTS.find((s) => s.id === d.selectedShotId);
    return shot ? shot.prompt : null;
  }
  return null;
}

function imageContribution(node: FlowNode): string[] {
  const data = node.data as AnyNodeData;
  if (data.kind === "image") {
    const d = data as ImageNodeData;
    return d.imageUrl ? [d.imageUrl] : [];
  }
  if (data.kind === "reference") {
    const d = data as ReferenceNodeData;
    return d.imageUrl ? [d.imageUrl] : [];
  }
  if (isSheetKind(data.kind)) {
    const d = data as SheetNodeData;
    return d.sheetImage ? [d.sheetImage] : [];
  }
  return [];
}

/**
 * Walk upstream (following edges where this node is the target) and collect
 * every prompt / camera / lens / sheet-node text contribution, ordered from
 * the earliest ancestor to the node itself, then join into one composed
 * sentence.
 *
 * `rootHandleId` (optional) restricts which edges count as "incoming" for
 * the very first hop only — pass a handle id (e.g. PROMPT_HANDLE_ID) to only
 * follow edges connected to that specific target handle, ignoring anything
 * wired into a different handle on the same node (like an image-refs
 * connector). Pass `null` explicitly to only match edges with no handle id.
 * Omit it entirely to follow every incoming edge regardless of handle (the
 * default, and what single-handle nodes want).
 *
 * A Character/Object/Location ("sheet") node is treated as a "leaf"
 * whenever it's encountered as an ancestor (not as the starting node
 * itself): its own ~200-word outputPrompt is used as-is, and we
 * deliberately do NOT keep walking further upstream into whatever raw
 * Prompt/Camera/Lens ingredients were used to build it — that would just
 * duplicate/contradict the already-baked description. When the sheet node
 * IS the starting node (e.g. computing its own generation input), we do
 * walk its upstream chain normally.
 */
export function composeUpstreamPrompt(
  nodeId: string,
  nodes: FlowNode[],
  edges: Edge[],
  rootHandleId?: string | null
): string {
  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const visited = new Set<string>();
  const chain: string[] = [];

  function visit(id: string, isRoot: boolean) {
    if (visited.has(id)) return;
    visited.add(id);

    const node = nodeById.get(id);
    const isSheetLeaf = !isRoot && node && isSheetKind((node.data as AnyNodeData).kind);

    if (!isSheetLeaf) {
      let incoming = edges.filter((e) => e.target === id);
      if (isRoot && rootHandleId !== undefined) {
        incoming = incoming.filter((e) => (e.targetHandle ?? null) === rootHandleId);
      }
      // visit parents first (so earliest ancestor ends up first in the chain)
      for (const e of incoming) {
        visit(e.source, false);
      }
    }

    if (node) {
      // A root sheet node is being asked to compose *its own* input prompt
      // (from whatever feeds its prompt-in handle) — we must not fold its
      // own (possibly stale, possibly not-yet-generated) outputPrompt back
      // in as one of its own ingredients. Any other root kind
      // (Prompt/Camera/Lens/Image/Video) legitimately wants its own
      // contribution included as the final chain element.
      const skipSelf = isRoot && isSheetKind((node.data as AnyNodeData).kind);
      if (!skipSelf) {
        const contribution = textContribution(node);
        if (contribution) chain.push(contribution);
      }
    }
  }

  visit(nodeId, true);
  return chain.join(", ");
}

/**
 * Walk upstream and collect connected Image / Reference / sheet-node image
 * URLs. Same `rootHandleId` behavior as {@link composeUpstreamPrompt}, and
 * the same sheet-node leaf treatment: a Character/Object/Location ancestor
 * contributes its own generated sheet images but we don't keep walking past
 * it into whatever reference photos were used to generate it.
 */
export function collectUpstreamImageRefs(
  nodeId: string,
  nodes: FlowNode[],
  edges: Edge[],
  rootHandleId?: string | null
): string[] {
  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const visited = new Set<string>();
  const refs: string[] = [];

  function visit(id: string, isRoot: boolean) {
    if (visited.has(id)) return;
    visited.add(id);

    const node = nodeById.get(id);
    const isSheetLeaf = !isRoot && node && isSheetKind((node.data as AnyNodeData).kind);

    // A root Image/Reference/sheet node shouldn't fold its own already-
    // generated (or provided) output back in as one of its "input"
    // reference images — only ancestor nodes contribute here.
    if (!isRoot && node) refs.push(...imageContribution(node));

    if (!isSheetLeaf) {
      let incoming = edges.filter((e) => e.target === id);
      if (isRoot && rootHandleId !== undefined) {
        incoming = incoming.filter((e) => (e.targetHandle ?? null) === rootHandleId);
      }
      for (const e of incoming) {
        visit(e.source, false);
      }
    }
  }

  visit(nodeId, true);
  // flux-2-max's `input_images` field accepts at most 8 images.
  return refs.slice(0, 8);
}

function videoContribution(node: FlowNode): string[] {
  const data = node.data as AnyNodeData;
  if (data.kind === "shot") {
    const d = data as ShotNodeData;
    const shot = SHOTS.find((s) => s.id === d.selectedShotId);
    return shot ? [shot.videoUrl] : [];
  }
  if (data.kind === "video") {
    const d = data as VideoNodeData;
    return d.videoUrl ? [d.videoUrl] : [];
  }
  return [];
}

/**
 * Walk upstream and collect connected Shot / Video node video clip URLs
 * (e.g. flux-3's start_video — take the first one — or Seedance 2.5's
 * reference_videos array, or the Upscale node's single input_video). Same
 * `rootHandleId` behavior as the other traversal helpers, and the same
 * leaf treatment as sheet/image nodes: a Shot/Video ancestor contributes
 * its own clip but we don't keep walking past it into whatever fed it.
 */
export function collectUpstreamVideoRefs(
  nodeId: string,
  nodes: FlowNode[],
  edges: Edge[],
  rootHandleId?: string | null
): string[] {
  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const visited = new Set<string>();
  const refs: string[] = [];

  function visit(id: string, isRoot: boolean) {
    if (visited.has(id)) return;
    visited.add(id);

    const node = nodeById.get(id);
    const kind = node ? (node.data as AnyNodeData).kind : undefined;
    const isVideoSourceLeaf = !isRoot && (kind === "shot" || kind === "video");

    if (!isRoot && node) refs.push(...videoContribution(node));

    if (!isVideoSourceLeaf) {
      let incoming = edges.filter((e) => e.target === id);
      if (isRoot && rootHandleId !== undefined) {
        incoming = incoming.filter((e) => (e.targetHandle ?? null) === rootHandleId);
      }
      for (const e of incoming) {
        visit(e.source, false);
      }
    }
  }

  visit(nodeId, true);
  // Seedance 2.5's reference_videos accepts up to 10.
  return refs.slice(0, 10);
}
