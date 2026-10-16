"use client";

import * as React from "react";
import { Handle, Position, useConnection, type Connection, type Edge, type Node } from "@xyflow/react";
import { Film, ImageIcon, Type, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFlowStore } from "@/lib/flowStore";
import { isValidFlowConnection } from "@/lib/flowConnections";

export type HandleKind = "text" | "image" | "video";

const META: Record<HandleKind, { icon: LucideIcon; label: string; cls: string }> = {
  text: { icon: Type, label: "Text", cls: "bg-muted text-muted-foreground" },
  image: { icon: ImageIcon, label: "Image", cls: "bg-sky-500/20 text-sky-400" },
  video: { icon: Film, label: "Video", cls: "bg-violet-500/20 text-violet-400" },
};

interface Props {
  nodeId: string;
  kind: HandleKind;
  type: "source" | "target";
  /** omit for a node's unlabeled default handle (keeps existing saved edges working) */
  id?: string;
  /** px from the top of the node */
  top: number | string;
  label: string;
  /** your per-connector rule, e.g. isValidPromptSource */
  validate?: (c: Connection | Edge, nodes: any) => boolean;
}

/** Color-coded icon connector. Applies your connector rule + structural rules, and dims while dragging a connection it can't take. */
export default function TypedHandle({ nodeId, kind, type, id, top, label, validate }: Props) {
  const meta = META[kind];
  const Icon = meta.icon;
  const connection = useConnection();

  const check = React.useCallback(
    (c: Connection | Edge) => {
      const { nodes, edges } = useFlowStore.getState();
      return (validate ? validate(c, nodes) : true) && isValidFlowConnection(c, nodes as Node[], edges);
    },
    [validate]
  );

  // While a connection is being dragged, connectors that can't accept it disappear.
  let hidden = false;
  const from = connection.inProgress ? connection.fromHandle : null;
  if (from) {
    const isOrigin = from.nodeId === nodeId && (from.id ?? null) === (id ?? null);
    if (!isOrigin) {
      if (from.type === type) hidden = true; // output->output / input->input is never allowed
      else if (type === "target")
        hidden = !check({ source: from.nodeId, sourceHandle: from.id ?? null, target: nodeId, targetHandle: id ?? null });
      else
        hidden = !check({ source: nodeId, sourceHandle: id ?? null, target: from.nodeId, targetHandle: from.id ?? null });
    }
  }

  return (
    <Handle
      id={id}
      type={type}
      position={type === "target" ? Position.Left : Position.Right}
      isValidConnection={check}
      title={`${label} (${meta.label})`}
      style={{ top, [type === "target" ? "marginLeft" : "marginRight"]: -20 }}
      className={cn(
        "group !flex !h-7 !w-7 items-center justify-center !rounded-full !border-0 transition-opacity duration-150",
        meta.cls,
        hidden && "pointer-events-none opacity-0"
      )}
    >
      <Icon className="pointer-events-none h-3.5 w-3.5" />
      <span
        className={cn(
          "pointer-events-none absolute top-1/2 hidden -translate-y-1/2 whitespace-nowrap rounded-md bg-foreground px-1.5 py-0.5 text-[11px] text-background group-hover:block",
          type === "target" ? "right-full mr-2" : "left-full ml-2"
        )}
      >
        {label}
      </span>
    </Handle>
  );
}
