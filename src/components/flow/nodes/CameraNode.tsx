"use client";

import Image from "next/image";
import { type NodeProps } from "@xyflow/react";
import { Camera } from "lucide-react";
import { useFlowStore } from "@/lib/flowStore";
import { CAMERAS } from "@/lib/cameraData";
import type { CameraNodeData } from "@/lib/types";
import NodeShell from "./NodeShell";

export default function CameraNode({ id, data, selected }: NodeProps) {
  const camData = data as CameraNodeData;
  const openSetupPanel = useFlowStore((s) => s.openSetupPanel);
  const camera = CAMERAS.find((c) => c.id === camData.cameraId) ?? CAMERAS[0];

  return (
    <NodeShell
      id={id}
      icon={Camera}
      title="Camera"
      selected={selected}
      width="w-[220px]"
      onClick={() => openSetupPanel(id)}
    >
      <div className="flex items-center gap-3">
        <div className="relative h-12 w-16 shrink-0 overflow-hidden rounded-md bg-secondary/60">
          <Image src={camera.image} alt={camera.name} fill className="object-contain p-1" />
        </div>
        <div className="min-w-0">
          <div className="truncate text-xs font-medium text-foreground">{camera.name}</div>
          <div className="truncate text-[10px] text-muted-foreground">{camera.sensor}</div>
        </div>
      </div>
    </NodeShell>
  );
}
