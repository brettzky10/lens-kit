"use client";

import * as React from "react";
import { Handle, Position } from "@xyflow/react";
import { X, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFlowStore } from "@/lib/flowStore";

interface NodeShellProps {
  id: string;
  icon: LucideIcon;
  title: string;
  accent?: string;
  showTarget?: boolean;
  showSource?: boolean;
  width?: string;
  children?: React.ReactNode;
  extraHandles?: React.ReactNode;
  onClick?: () => void;
  selected?: boolean;
}

export default function NodeShell({
  id,
  icon: Icon,
  title,
  accent = "text-primary",
  showTarget = true,
  showSource = true,
  width = "w-[280px]",
  children,
  extraHandles,
  onClick,
  selected,
}: NodeShellProps) {
  const removeNode = useFlowStore((s) => s.removeNode);

  return (
    <div
      onClick={onClick}
      className={cn(
        "group relative rounded-xl border bg-card shadow-lg transition-colors",
        width,
        selected ? "border-primary" : "border-border",
        onClick && "cursor-pointer"
      )}
    >
      {showTarget && (
        <Handle
          type="target"
          position={Position.Left}
          className="!bg-primary"
        />
      )}
      {showSource && (
        <Handle
          type="source"
          position={Position.Right}
          className="!bg-primary"
        />
      )}
      {extraHandles}

      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
        <div className="flex items-center gap-2">
          <Icon className={cn("h-3.5 w-3.5", accent)} />
          <span className="text-xs font-medium text-foreground">{title}</span>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            removeNode(id);
          }}
          className="nodrag opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
        >
          <X className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </div>
      <div className="p-3">{children}</div>
    </div>
  );
}
