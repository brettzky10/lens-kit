import { useEffect } from "react";
import { useUpdateNodeInternals } from "@xyflow/react";

/**
 * Nodes with multiple handles positioned via percentages (top: "30%" etc)
 * combined with conditionally-rendered rows above/below them (reference
 * image thumbnails, fallback notices, status banners...) can drift out of
 * sync with React Flow's cached handle bounds — the dots render in the
 * right visual spot, but connections snap to the stale cached position.
 * Call this with the node's id and a dependency list covering everything
 * that changes this node's rendered height, and it'll tell React Flow to
 * remeasure whenever any of those change.
 */
export function useHandleSync(nodeId: string, deps: React.DependencyList) {
  const updateNodeInternals = useUpdateNodeInternals();
  useEffect(() => {
    updateNodeInternals(nodeId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
