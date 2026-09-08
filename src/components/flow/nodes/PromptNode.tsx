"use client";

import * as React from "react";
import { type NodeProps, useStore } from "@xyflow/react";
import { FileText } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { useFlowStore } from "@/lib/flowStore";
import { composeUpstreamPrompt } from "@/lib/promptGraph";
import type { PromptNodeData } from "@/lib/types";
import NodeShell from "./NodeShell";

export default function PromptNode({ id, data, selected }: NodeProps) {
  const promptData = data as PromptNodeData;
  const updateNodeData = useFlowStore((s) => s.updateNodeData);
  const nodes = useFlowStore((s) => s.nodes);
  const edges = useFlowStore((s) => s.edges);

  // does anything feed INTO this prompt node? (e.g. chained camera/lens upstream)
  const hasUpstream = React.useMemo(
    () => edges.some((e) => e.target === id),
    [edges, id]
  );
  const composed = React.useMemo(
    () => (hasUpstream ? composeUpstreamPrompt(id, nodes as any, edges) : null),
    [hasUpstream, id, nodes, edges]
  );

  return (
    <NodeShell id={id} icon={FileText} title="Prompt" selected={selected} width="w-[300px]">
      <Textarea
        value={promptData.text}
        onChange={(e) => updateNodeData(id, { text: e.target.value })}
        placeholder="Describe the shot..."
        className="nodrag text-xs"
        rows={4}
      />
      {composed && (
        <div className="mt-2 rounded-md bg-secondary/60 p-2 text-[11px] leading-relaxed text-muted-foreground">
          <span className="font-medium text-foreground">Composed: </span>
          {composed}
        </div>
      )}
    </NodeShell>
  );
}
