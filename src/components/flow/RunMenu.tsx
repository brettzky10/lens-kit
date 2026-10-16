"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFlowStore } from "@/lib/flowStore";
import { estimateRun, type RunEstimate } from "@/lib/estimateRun";
import { runNodes } from "@/lib/runner";
import { MenuRow, MiniMenu } from "./MiniMenu";

const fmt = (e: RunEstimate) =>
  `${e.credits.toLocaleString("en-US")} credits, ${e.nodeCount} node${e.nodeCount === 1 ? "" : "s"}`;

const pill = "bg-foreground text-background";

/** "Run" split button. Dropdown: Run from here / Run till here, each with credits + node count. */
export default function RunMenu({ nodeId, fromOnly = false, busy = false }: { nodeId: string; fromOnly?: boolean; busy?: boolean }) {
  const nodes = useFlowStore((s) => s.nodes);
  const edges = useFlowStore((s) => s.edges);
  const self = React.useMemo(() => estimateRun(nodeId, "self", nodes, edges), [nodeId, nodes, edges]);
  const from = React.useMemo(() => estimateRun(nodeId, "from", nodes, edges), [nodeId, nodes, edges]);
  const till = React.useMemo(() => estimateRun(nodeId, "till", nodes, edges), [nodeId, nodes, edges]);

  if (fromOnly) {
    return (
      <button
        type="button" disabled={busy || from.nodeCount === 0} onClick={() => runNodes(from.nodeIds)}
        title={fmt(from)}
        className={cn("nodrag h-8 rounded-lg px-3 text-sm font-medium disabled:opacity-40", pill)}
      >
        Run from here
      </button>
    );
  }

  return (
    <div className={cn("nodrag flex items-center rounded-lg", pill)}>
      <button
        type="button" disabled={busy} onClick={() => runNodes(self.nodeIds)}
        title={`${self.credits.toLocaleString("en-US")} credits`}
        className="h-8 rounded-l-lg px-3 text-sm font-medium disabled:opacity-40"
      >
        {busy ? "Running…" : "Run"}
      </button>
      <span className="h-4 w-px bg-background/30" />
      <MiniMenu
        ariaLabel="Run options" side="top" align="end" disabled={busy}
        triggerClassName="flex h-8 w-7 items-center justify-center rounded-r-lg disabled:opacity-40"
        menuClassName="w-64"
        trigger={<ChevronDown className="h-4 w-4" />}
      >
        <MenuRow onSelect={() => runNodes(from.nodeIds)} disabled={from.nodeCount === 0}>
          <div className="flex flex-col gap-0.5 py-0.5">
            <span className="font-medium">Run from here</span>
            <span className="text-xs text-muted-foreground">Runs this node and subsequent nodes</span>
            <span className="text-xs font-medium">{fmt(from)}</span>
          </div>
        </MenuRow>
        <MenuRow onSelect={() => runNodes(till.nodeIds)} disabled={till.nodeCount <= 1}>
          <div className="flex flex-col gap-0.5 py-0.5">
            <span className="font-medium">Run till here</span>
            <span className="text-xs text-muted-foreground">Runs this node and all nodes leading up to it</span>
            <span className="text-xs font-medium">{fmt(till)}</span>
          </div>
        </MenuRow>
      </MiniMenu>
    </div>
  );
}
