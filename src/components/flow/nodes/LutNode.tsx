"use client";

import * as React from "react";
import Image from "next/image";
import { Handle, Position, type NodeProps, type Connection, type Edge } from "@xyflow/react";
import { Palette, Download, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useFlowStore } from "@/lib/flowStore";
import { collectUpstreamImageRefs } from "@/lib/promptGraph";
import { IMAGE_REFS_HANDLE_ID, IMAGE_HANDLE_CLASS } from "@/lib/handleIds";
import { isValidImageRefSource } from "@/lib/connectionValidators";
import { LUT_PRESETS, applyLutToImage } from "@/lib/lutPresets";
import { downloadUrl } from "@/lib/downloadFile";
import { useHandleSync } from "@/lib/useHandleSync";
import { cn } from "@/lib/utils";
import type { LutNodeData } from "@/lib/types";
import NodeShell from "./NodeShell";

function LutCard({
  preset,
  selected,
  onSelect,
}: {
  preset: (typeof LUT_PRESETS)[number];
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        "flex flex-col overflow-hidden rounded-lg border text-left transition-colors",
        selected ? "border-primary" : "border-border hover:border-muted-foreground"
      )}
    >
      <div className="relative aspect-video w-full" style={{ background: preset.previewGradient }}>
        {selected && (
          <div className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Check className="h-3 w-3" />
          </div>
        )}
      </div>
      <div className="px-2 py-1.5 text-xs font-medium text-foreground">{preset.name}</div>
    </button>
  );
}

export default function LutNode({ id, data, selected }: NodeProps) {
  const lutData = data as LutNodeData;
  const updateNodeData = useFlowStore((s) => s.updateNodeData);
  const nodes = useFlowStore((s) => s.nodes);
  const edges = useFlowStore((s) => s.edges);
  const [open, setOpen] = React.useState(false);
  const [errorNotice, setErrorNotice] = React.useState<string | null>(null);

  const inputImage = React.useMemo(
    () => collectUpstreamImageRefs(id, nodes as any, edges, IMAGE_REFS_HANDLE_ID)[0],
    [id, nodes, edges]
  );

  const imageRefValidator = React.useCallback(
    (connection: Connection | Edge) => isValidImageRefSource(connection, nodes as any),
    [nodes]
  );

  useHandleSync(id, [id, !!inputImage, lutData.status, errorNotice]);

  const selectedPreset = LUT_PRESETS.find((p) => p.id === lutData.lutId);

  // Re-process automatically whenever the connected image or the chosen
  // look changes — this is instant client-side canvas work, not an API
  // call, so there's no reason to require an explicit "Generate" click.
  React.useEffect(() => {
    if (!inputImage || !selectedPreset) return;
    let cancelled = false;
    setErrorNotice(null);
    updateNodeData(id, { status: "processing" });
    applyLutToImage(inputImage, selectedPreset)
      .then((result) => {
        if (cancelled) return;
        updateNodeData(id, { status: "done", processedImage: result });
      })
      .catch((err) => {
        if (cancelled) return;
        setErrorNotice(err?.message || String(err));
        updateNodeData(id, { status: "error" });
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputImage, lutData.lutId]);

  async function handleDownload() {
    if (!lutData.processedImage) return;
    await downloadUrl(lutData.processedImage, `cineflow-lut-${id}.jpg`);
  }

  return (
    <NodeShell
      id={id}
      icon={Palette}
      title="Color LUT"
      selected={selected}
      width="w-[260px]"
      showSource
      extraHandles={
        <Handle
          type="target"
          position={Position.Left}
          id={IMAGE_REFS_HANDLE_ID}
          isValidConnection={imageRefValidator}
          className={IMAGE_HANDLE_CLASS}
        />
      }
    >
      <div className="group/lut relative mb-2 flex h-32 w-full items-center justify-center overflow-hidden rounded-md bg-secondary/60">
        {lutData.status === "processing" && (
          <>
            <Skeleton className="absolute inset-0 rounded-md" />
            <span className="relative z-10 text-[11px] text-muted-foreground">Applying look...</span>
          </>
        )}
        {lutData.status === "done" && lutData.processedImage && (
          <>
            <Image src={lutData.processedImage} alt="Graded" fill className="object-cover" unoptimized />
            <button
              onClick={handleDownload}
              title="Download graded image"
              className="nodrag absolute bottom-1.5 right-1.5 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity hover:bg-black/80 group-hover/lut:opacity-100"
            >
              <Download className="h-3.5 w-3.5" />
            </button>
          </>
        )}
        {lutData.status !== "processing" && lutData.status !== "done" && (
          <span className="px-3 text-center text-[11px] text-muted-foreground">
            {!inputImage
              ? "Connect an image"
              : !selectedPreset
                ? "Pick a look"
                : "Ready"}
          </span>
        )}
      </div>

      {selectedPreset && (
        <div className="mb-2 flex items-center gap-2">
          <div className="h-5 w-5 shrink-0 rounded" style={{ background: selectedPreset.previewGradient }} />
          <span className="truncate text-xs font-medium text-foreground">{selectedPreset.name}</span>
        </div>
      )}

      {errorNotice && (
        <div className="mb-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-2 text-[10px] leading-relaxed text-amber-400">
          {errorNotice}
        </div>
      )}

      <Button size="sm" variant="secondary" className="nodrag w-full" onClick={() => setOpen(true)}>
        Pick a look
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="nodrag">
          <DialogHeader>
            <DialogTitle>Pick a color LUT</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {LUT_PRESETS.map((preset) => (
              <LutCard
                key={preset.id}
                preset={preset}
                selected={preset.id === lutData.lutId}
                onSelect={() => {
                  updateNodeData(id, { lutId: preset.id });
                  setOpen(false);
                }}
              />
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </NodeShell>
  );
}
