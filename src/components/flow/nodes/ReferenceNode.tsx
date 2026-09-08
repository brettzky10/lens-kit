"use client";

import * as React from "react";
import Image from "next/image";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { ImagePlus, X, Upload } from "lucide-react";
import { useFlowStore } from "@/lib/flowStore";
import { fileToDownscaledDataUrl } from "@/lib/imageDownscale";
import { IMAGE_HANDLE_CLASS } from "@/lib/handleIds";
import type { ReferenceNodeData } from "@/lib/types";
import { cn } from "@/lib/utils";
import NodeShell from "./NodeShell";

export default function ReferenceNode({ id, data, selected }: NodeProps) {
  const refData = data as ReferenceNodeData;
  const updateNodeData = useFlowStore((s) => s.updateNodeData);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("That's not an image file.");
      return;
    }
    setError(null);
    try {
      const dataUrl = await fileToDownscaledDataUrl(file);
      updateNodeData(id, { imageUrl: dataUrl, fileName: file.name });
    } catch (err) {
      setError("Couldn't read that image — try a different file.");
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(false);
    handleFile(e.dataTransfer.files?.[0]);
  }

  return (
    <NodeShell
      id={id}
      icon={ImagePlus}
      title="Reference"
      selected={selected}
      width="w-[220px]"
      showTarget={false}
      extraHandles={
        <Handle type="source" position={Position.Right} className={IMAGE_HANDLE_CLASS} />
      }
    >
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          "nodrag relative flex h-32 w-full cursor-pointer flex-col items-center justify-center gap-1.5 overflow-hidden rounded-md border-2 border-dashed transition-colors",
          isDragOver ? "border-sky-400 bg-sky-400/10" : "border-border bg-secondary/40 hover:bg-secondary/60"
        )}
      >
        {refData.imageUrl ? (
          <>
            <Image src={refData.imageUrl} alt={refData.fileName ?? "reference"} fill className="object-cover" />
            <button
              onClick={(e) => {
                e.stopPropagation();
                updateNodeData(id, { imageUrl: undefined, fileName: undefined });
              }}
              className="absolute right-1 top-1 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
              title="Remove image"
            >
              <X className="h-3 w-3" />
            </button>
          </>
        ) : (
          <>
            <Upload className="h-5 w-5 text-muted-foreground" />
            <span className="px-2 text-center text-[10px] text-muted-foreground">
              Drop an image here, or click to browse
            </span>
          </>
        )}
      </div>

      {error && <div className="mt-1.5 text-[10px] text-destructive">{error}</div>}
      {refData.fileName && (
        <div className="mt-1.5 truncate text-[10px] text-muted-foreground" title={refData.fileName}>
          {refData.fileName}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
    </NodeShell>
  );
}
