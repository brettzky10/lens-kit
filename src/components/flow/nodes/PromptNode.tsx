"use client";

import * as React from "react";
import { type NodeProps } from "@xyflow/react";
import { Type } from "lucide-react";
import { useFlowStore } from "@/lib/flowStore";
import { composeUpstreamPrompt } from "@/lib/promptGraph";
import { isValidPromptSource } from "@/lib/connectionValidators";
import type { PromptNodeData } from "@/lib/types";
import GenNodeFrame from "../GenNodeFrame";
import RunMenu from "../RunMenu";
import TypedHandle from "../TypedHandle";

/** Text node. Same data shape as before ({ kind: "prompt", text }), same chained-input "Composed" preview. */
export default function PromptNode({ id, data, selected }: NodeProps) {
  const d = data as PromptNodeData;
  const updateNodeData = useFlowStore((s) => s.updateNodeData);
  const nodes = useFlowStore((s) => s.nodes);
  const edges = useFlowStore((s) => s.edges);

  // does anything (camera / lens / another prompt) feed INTO this node?
  const hasUpstream = React.useMemo(() => edges.some((e) => e.target === id), [edges, id]);
  const composed = React.useMemo(
    () => (hasUpstream ? composeUpstreamPrompt(id, nodes as any, edges) : null),
    [hasUpstream, id, nodes, edges]
  );

  return (
    <GenNodeFrame
      icon={Type} title="Text" selected={selected} width="w-[340px]"
      handles={
        <>
          <TypedHandle nodeId={id} kind="text" type="target" top={44} label="Text input" validate={isValidPromptSource} />
          <TypedHandle nodeId={id} kind="text" type="source" top={44} label="Text output" />
        </>
      }
    >
      <div className="flex min-h-48 flex-col p-4">
        <textarea
          value={d.text}
          placeholder="Describe the shot…"
          onChange={(e) => updateNodeData(id, { text: e.target.value })}
          className="nodrag nowheel min-h-28 flex-1 resize-none bg-transparent text-[15px] leading-snug outline-none placeholder:text-muted-foreground"
        />
        {composed && (
          <div className="mt-3 rounded-md bg-secondary/60 p-2 text-[11px] leading-relaxed text-muted-foreground">
            <span className="font-medium text-foreground">Composed: </span>{composed}
          </div>
        )}
        <div className="mt-3 flex justify-end">
          <RunMenu nodeId={id} fromOnly />
        </div>
      </div>
    </GenNodeFrame>
  );
}
