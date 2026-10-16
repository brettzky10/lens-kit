"use client";

import Image from "next/image";
import { type NodeProps } from "@xyflow/react";
import { Aperture } from "lucide-react";
import { useFlowStore } from "@/lib/flowStore";
import { LENSES } from "@/lib/lensData";
import type { LensNodeData } from "@/lib/types";
import NodeShell from "./NodeShell";

export default function LensNode({ id, data, selected }: NodeProps) {
  const lensData = data as LensNodeData;
  const openSetupPanel = useFlowStore((s) => s.openSetupPanel);
  const lens = LENSES.find((l) => l.id === lensData.lensId) ?? LENSES[0];

  return (
    <NodeShell
      id={id}
      icon={Aperture}
      title="Lens"
      selected={selected}
      width="w-[220px]"
      targetKind="text"
      sourceKind="text"
      onClick={() => openSetupPanel(id)}
    >
      <div className="flex items-center gap-3">
        <div className="relative h-12 w-16 shrink-0 overflow-hidden rounded-md bg-secondary/60">
          <Image src={lens.image} alt={lens.name} fill className="object-contain p-1" />
        </div>
        <div className="min-w-0">
          <div className="truncate text-xs font-medium text-foreground">{lens.name}</div>
          <div className="truncate text-[10px] text-muted-foreground">
            {lensData.focalLength}mm · {lensData.aperture}
          </div>
        </div>
      </div>
    </NodeShell>
  );
}
