"use client";

import * as React from "react";
import Image from "next/image";
import { ChevronUp, ChevronDown, X } from "lucide-react";
import { useFlowStore } from "@/lib/flowStore";
import { CAMERAS } from "@/lib/cameraData";
import { LENSES, FOCAL_LENGTHS, APERTURES } from "@/lib/lensData";
import { findPairedNode } from "@/lib/findPairedNode";
import type { CameraNodeData, LensNodeData } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

function Selector({
  label,
  sublabel,
  image,
  value,
  disabled,
  onUp,
  onDown,
}: {
  label: string;
  sublabel?: string;
  image?: string;
  value: string;
  disabled?: boolean;
  onUp?: () => void;
  onDown?: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col items-center gap-2">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <div
        className={cn(
          "flex h-24 w-24 items-center justify-center rounded-xl bg-secondary/60",
          disabled && "opacity-30"
        )}
      >
        {image ? (
          <div className="relative h-full w-full">
            <Image src={image} alt={value} fill className="object-contain p-2" />
          </div>
        ) : (
          <span className="text-2xl font-semibold text-foreground">{value}</span>
        )}
      </div>
      <button
        disabled={disabled}
        onClick={onUp}
        className="text-muted-foreground transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
      >
        <ChevronUp className="h-4 w-4" />
      </button>
      <div className="text-center leading-tight">
        <div className={cn("text-sm font-medium text-foreground", disabled && "text-muted-foreground")}>
          {value}
        </div>
        {sublabel && <div className="text-[10px] text-muted-foreground">{sublabel}</div>}
      </div>
      <button
        disabled={disabled}
        onClick={onDown}
        className="text-muted-foreground transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
      >
        <ChevronDown className="h-4 w-4" />
      </button>
    </div>
  );
}

export default function BottomSetupPanel() {
  const activeSetupNodeId = useFlowStore((s) => s.activeSetupNodeId);
  const closeSetupPanel = useFlowStore((s) => s.closeSetupPanel);
  const nodes = useFlowStore((s) => s.nodes);
  const edges = useFlowStore((s) => s.edges);
  const updateNodeData = useFlowStore((s) => s.updateNodeData);

  const activeNode = nodes.find((n) => n.id === activeSetupNodeId) ?? null;

  const cameraNode = React.useMemo(() => {
    if (!activeNode) return null;
    if (activeNode.data.kind === "camera") return activeNode;
    return findPairedNode(nodes as any, edges, activeNode.id, "camera");
  }, [activeNode, nodes, edges]);

  const lensNode = React.useMemo(() => {
    if (!activeNode) return null;
    if (activeNode.data.kind === "lens") return activeNode;
    return findPairedNode(nodes as any, edges, activeNode.id, "lens");
  }, [activeNode, nodes, edges]);

  if (!activeNode) return null;

  const camData = cameraNode?.data as CameraNodeData | undefined;
  const lensData = lensNode?.data as LensNodeData | undefined;

  const cameraIdx = camData ? CAMERAS.findIndex((c) => c.id === camData.cameraId) : -1;
  const camera = cameraIdx >= 0 ? CAMERAS[cameraIdx] : undefined;

  const lensIdx = lensData ? LENSES.findIndex((l) => l.id === lensData.lensId) : -1;
  const lens = lensIdx >= 0 ? LENSES[lensIdx] : undefined;

  const focalIdx = lensData ? FOCAL_LENGTHS.indexOf(lensData.focalLength) : -1;
  const apertureIdx = lensData ? APERTURES.indexOf(lensData.aperture) : -1;

  function cycle<T>(arr: T[], idx: number, dir: 1 | -1): T {
    const next = (idx + dir + arr.length) % arr.length;
    return arr[next];
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center pb-6">
      <div className="pointer-events-auto w-full max-w-3xl rounded-2xl border border-border bg-popover/95 p-5 shadow-2xl backdrop-blur">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">Shot setup</span>
          <button onClick={closeSetupPanel} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-start gap-2">
          <Selector
            label="Focal length"
            sublabel="mm"
            value={lensData ? `${lensData.focalLength}` : "—"}
            disabled={!lensNode}
            onUp={() =>
              lensNode &&
              updateNodeData(lensNode.id, {
                focalLength: cycle(FOCAL_LENGTHS, focalIdx, 1),
              } as Partial<LensNodeData>)
            }
            onDown={() =>
              lensNode &&
              updateNodeData(lensNode.id, {
                focalLength: cycle(FOCAL_LENGTHS, focalIdx, -1),
              } as Partial<LensNodeData>)
            }
          />

          <Selector
            label="Lens"
            sublabel={lens ? lens.maxAperture : "Not connected"}
            image={lens?.image}
            value={lens?.name ?? "—"}
            disabled={!lensNode}
            onUp={() => {
              if (!lensNode) return;
              const newLens = cycle(LENSES, lensIdx, 1);
              updateNodeData(lensNode.id, { lensId: newLens.id } as Partial<LensNodeData>);
            }}
            onDown={() => {
              if (!lensNode) return;
              const newLens = cycle(LENSES, lensIdx, -1);
              updateNodeData(lensNode.id, { lensId: newLens.id } as Partial<LensNodeData>);
            }}
          />

          <Selector
            label="Camera"
            sublabel={camera ? "Digital" : "Not connected"}
            image={camera?.image}
            value={camera?.name ?? "—"}
            disabled={!cameraNode}
            onUp={() =>
              cameraNode &&
              updateNodeData(cameraNode.id, {
                cameraId: cycle(CAMERAS, cameraIdx, 1).id,
              } as Partial<CameraNodeData>)
            }
            onDown={() =>
              cameraNode &&
              updateNodeData(cameraNode.id, {
                cameraId: cycle(CAMERAS, cameraIdx, -1).id,
              } as Partial<CameraNodeData>)
            }
          />

          <Selector
            label="Aperture"
            sublabel="T-stop equiv."
            value={lensData?.aperture ?? "—"}
            disabled={!lensNode}
            onUp={() =>
              lensNode &&
              updateNodeData(lensNode.id, {
                aperture: cycle(APERTURES, apertureIdx, 1),
              } as Partial<LensNodeData>)
            }
            onDown={() =>
              lensNode &&
              updateNodeData(lensNode.id, {
                aperture: cycle(APERTURES, apertureIdx, -1),
              } as Partial<LensNodeData>)
            }
          />
        </div>

        <div className="mt-4 flex justify-center">
          <Button size="sm" onClick={closeSetupPanel}>
            + Save setup
          </Button>
        </div>
      </div>
    </div>
  );
}
