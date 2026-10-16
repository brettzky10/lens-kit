import type { Edge, Node } from "@xyflow/react";
import { costFor, imageCost, videoCost } from "./creditCosts";
import { IMAGE_REFS_HANDLE_ID, VIDEO_REF_HANDLE_ID } from "./handleIds";
import { isRunnableKind } from "./runner";
import { isSheetKind } from "./types";

export interface RunEstimate {
  credits: number;
  nodeCount: number;
  /** runnable node ids in dependency order (upstream first) */
  nodeIds: string[];
}

export function nodeCost(node: Node, edges: Edge[]): number {
  const d = node.data as any;
  const into = (handle: string) => edges.filter((e) => e.target === node.id && e.targetHandle === handle).length;
  if (d.kind === "image")
    return imageCost(d.provider, { resolution: d.resolution, inputImages: into(IMAGE_REFS_HANDLE_ID) });
  if (d.kind === "video")
    return videoCost(d.provider, {
      duration: d.duration, resolution: d.resolution, audio: d.audio, draft: d.draft,
      hasVideoInput: into(VIDEO_REF_HANDLE_ID) > 0,
    });
  if (isSheetKind(d.kind))
    return imageCost(d.provider, { resolution: d.resolution, inputImages: into(IMAGE_REFS_HANDLE_ID) });
  if (d.kind === "upscale") return costFor("upscale", d.provider);
  return 0;
}

function reach(start: string, edges: Edge[], dir: "down" | "up") {
  const out = new Set<string>();
  const stack = [start];
  while (stack.length) {
    const id = stack.pop()!;
    for (const e of edges) {
      const [from, to] = dir === "down" ? [e.source, e.target] : [e.target, e.source];
      if (from === id && !out.has(to)) { out.add(to); stack.push(to); }
    }
  }
  return out;
}

function topoOrder(ids: string[], edges: Edge[]) {
  const set = new Set(ids);
  const indeg = new Map(ids.map((i) => [i, 0]));
  edges.forEach((e) => set.has(e.source) && set.has(e.target) && indeg.set(e.target, (indeg.get(e.target) ?? 0) + 1));
  const queue = ids.filter((i) => !indeg.get(i));
  const order: string[] = [];
  while (queue.length) {
    const id = queue.shift()!;
    order.push(id);
    edges.forEach((e) => {
      if (e.source !== id || !set.has(e.target)) return;
      indeg.set(e.target, indeg.get(e.target)! - 1);
      if (!indeg.get(e.target)) queue.push(e.target);
    });
  }
  return order;
}

/** self = this node | from = this + everything downstream | till = this + everything upstream */
export function estimateRun(nodeId: string, mode: "self" | "from" | "till", nodes: Node[], edges: Edge[]): RunEstimate {
  const ids = new Set([nodeId]);
  if (mode === "from") reach(nodeId, edges, "down").forEach((i) => ids.add(i));
  if (mode === "till") reach(nodeId, edges, "up").forEach((i) => ids.add(i));
  const runnable = nodes.filter((n) => ids.has(n.id) && isRunnableKind((n.data as any).kind));
  return {
    credits: runnable.reduce((sum, n) => sum + nodeCost(n, edges), 0),
    nodeCount: runnable.length,
    nodeIds: topoOrder(runnable.map((n) => n.id), edges),
  };
}
