import type { Edge, Node } from "@xyflow/react";
import type { AnyNodeData } from "./types";

type FlowNode = Node<AnyNodeData>;

export function findPairedNode(
  nodes: FlowNode[],
  edges: Edge[],
  nodeId: string,
  kind: AnyNodeData["kind"]
): FlowNode | null {
  const neighborsOf = (id: string) =>
    new Set<string>([
      ...edges.filter((e) => e.source === id).map((e) => e.target),
      ...edges.filter((e) => e.target === id).map((e) => e.source),
    ]);

  const myNeighbors = neighborsOf(nodeId);

  for (const nid of myNeighbors) {
    const n = nodes.find((x) => x.id === nid);
    if (n && n.data.kind === kind) return n;
  }

  for (const nid of myNeighbors) {
    const theirNeighbors = neighborsOf(nid);
    for (const nid2 of theirNeighbors) {
      if (nid2 === nodeId) continue;
      const n = nodes.find((x) => x.id === nid2);
      if (n && n.data.kind === kind) return n;
    }
  }

  return null;
}
