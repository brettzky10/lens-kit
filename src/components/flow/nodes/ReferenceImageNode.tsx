"use client";

import * as React from "react";
import Image from "next/image";
import {
  Handle,
  Position,
  type NodeProps,
} from "@xyflow/react";

import {
  ImagePlus,
  Upload,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { useFlowStore } from "@/lib/flowStore";
import { REFERENCE_IMAGE_OUT_ID } from "@/lib/handleIds";
import type { ReferenceImageNodeData } from "@/lib/types";

import NodeShell from "./NodeShell";

export default function ReferenceImageNode({
  id,
  data,
  selected,
}: NodeProps) {
  const refData = data as ReferenceImageNodeData;

  const updateNodeData = useFlowStore(
    (state) => state.updateNodeData
  );

  const inputRef = React.useRef<HTMLInputElement | null>(null);

  const [dragging, setDragging] = React.useState(false);

  const handleFile = React.useCallback(
    (file: File) => {
      if (!file.type.startsWith("image/")) {
        return;
      }

      /*
       * For now we store the image as a data URL.
       *
       * This makes the node completely self-contained and means
       * export/import also preserves the reference image.
       *
       * Once you have your Supabase upload endpoint in place,
       * this can be changed to store a permanent Supabase URL instead.
       */
      const reader = new FileReader();

      reader.onload = () => {
        const imageUrl = reader.result as string;

        updateNodeData(id, {
          imageUrl,
          fileName: file.name,
        });
      };

      reader.readAsDataURL(file);
    },
    [id, updateNodeData]
  );

  const handleInputChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    if (file) {
      handleFile(file);
    }

    event.target.value = "";
  };

  const handleDrop = (
    event: React.DragEvent<HTMLDivElement>
  ) => {
    event.preventDefault();
    setDragging(false);

    const file = event.dataTransfer.files?.[0];

    if (file) {
      handleFile(file);
    }
  };

  const removeImage = (
    event: React.MouseEvent<HTMLButtonElement>
  ) => {
    event.stopPropagation();

    updateNodeData(id, {
      imageUrl: undefined,
      fileName: undefined,
    });
  };

  return (
    <NodeShell
      id={id}
      icon={ImagePlus}
      title="Reference Image"
      selected={selected}
      width="w-[280px]"
      showTarget={false}
      showSource={false}
      extraHandles={
        <Handle
          type="source"
          position={Position.Right}
          id={REFERENCE_IMAGE_OUT_ID}
          style={{
            top: "50%",
          }}
          className="
            !h-3
            !w-3
            !border-2
            !border-background
            !bg-sky-400
          "
        />
      }
    >
      <div
        className={`
          nodrag
          relative
          flex
          h-[180px]
          w-full
          cursor-pointer
          items-center
          justify-center
          overflow-hidden
          rounded-md
          border
          border-dashed
          transition
          ${
            dragging
              ? "border-sky-400 bg-sky-400/10"
              : "border-border bg-secondary/40 hover:border-sky-400/60 hover:bg-secondary/60"
          }
        `}
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => {
          setDragging(false);
        }}
        onDrop={handleDrop}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={handleInputChange}
        />

        {refData.imageUrl ? (
          <>
            <Image
              src={refData.imageUrl}
              alt={refData.fileName ?? "Reference image"}
              fill
              unoptimized
              className="object-cover"
            />

            <button
              type="button"
              className="
                nodrag
                absolute
                right-2
                top-2
                z-20
                flex
                h-6
                w-6
                items-center
                justify-center
                rounded-full
                border
                border-white/20
                bg-black/70
                text-white
                transition
                hover:bg-black/90
              "
              onClick={removeImage}
            >
              <X className="h-3.5 w-3.5" />
            </button>

            <div
              className="
                pointer-events-none
                absolute
                inset-x-0
                bottom-0
                bg-gradient-to-t
                from-black/80
                to-transparent
                px-2
                pb-2
                pt-8
              "
            >
              <p className="truncate text-[10px] text-white/90">
                {refData.fileName ?? "Reference image"}
              </p>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-2 text-center">
            <div
              className="
                flex
                h-10
                w-10
                items-center
                justify-center
                rounded-full
                bg-sky-400/10
                text-sky-400
              "
            >
              <Upload className="h-4 w-4" />
            </div>

            <div>
              <p className="text-xs font-medium text-foreground">
                Drop reference image
              </p>

              <p className="mt-1 text-[10px] text-muted-foreground">
                or click to browse
              </p>
            </div>
          </div>
        )}
      </div>

      {refData.imageUrl && (
        <Button
          size="sm"
          variant="outline"
          className="nodrag mt-2 w-full"
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="mr-1.5 h-3.5 w-3.5" />
          Replace image
        </Button>
      )}

      <div className="mt-2 flex items-center gap-1.5 text-[9px] text-muted-foreground">
        <span className="h-2 w-2 rounded-full bg-sky-400" />
        <span>Reference image output</span>
      </div>
    </NodeShell>
  );
}