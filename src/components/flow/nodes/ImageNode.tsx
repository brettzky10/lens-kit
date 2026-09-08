"use client";

import * as React from "react";
import Image from "next/image";
import { Handle, Position, type NodeProps, type Connection, type Edge } from "@xyflow/react";
import { ImageIcon, Sparkles, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useFlowStore } from "@/lib/flowStore";
import { composeUpstreamPrompt, collectUpstreamImageRefs } from "@/lib/promptGraph";
import {
  PROMPT_HANDLE_ID,
  IMAGE_REFS_HANDLE_ID,
  PROMPT_HANDLE_CLASS,
  IMAGE_HANDLE_CLASS,
} from "@/lib/handleIds";
import { isValidPromptSource, isValidImageRefSource } from "@/lib/connectionValidators";
import { IMAGE_PROVIDERS } from "@/lib/providerOptions";
import { downloadUrl } from "@/lib/downloadFile";
import type { ImageNodeData } from "@/lib/types";
import NodeShell from "./NodeShell";
import PromptPreview from "./PromptPreview";

export default function ImageNode({ id, data, selected }: NodeProps) {
  const imgData = data as ImageNodeData;
  const updateNodeData = useFlowStore((s) => s.updateNodeData);
  const nodes = useFlowStore((s) => s.nodes);
  const edges = useFlowStore((s) => s.edges);
  const [fallbackNotice, setFallbackNotice] = React.useState<string | null>(null);
  const [downloading, setDownloading] = React.useState(false);

  // Only follows edges wired into the "prompt" connector (Prompt / Camera /
  // Lens / Character / Object / Location nodes) — ignores anything wired
  // into the separate image-refs connector, same handle-scoped traversal
  // as the Video node.
  const composedPrompt = React.useMemo(
    () => composeUpstreamPrompt(id, nodes as any, edges, PROMPT_HANDLE_ID),
    [id, nodes, edges]
  );

  // Only follows edges wired into the "image refs" connector (Image /
  // Reference / Character / Object / Location nodes).
  const imageRefs = React.useMemo(
    () => collectUpstreamImageRefs(id, nodes as any, edges, IMAGE_REFS_HANDLE_ID),
    [id, nodes, edges]
  );

  const promptValidator = React.useCallback(
    (connection: Connection | Edge) => isValidPromptSource(connection, nodes as any),
    [nodes]
  );

  const imageRefValidator = React.useCallback(
    (connection: Connection | Edge) => isValidImageRefSource(connection, nodes as any),
    [nodes]
  );

  async function handleGenerate() {
    setFallbackNotice(null);
    updateNodeData(id, { status: "loading", progress: 0, prompt: composedPrompt });

    const interval = setInterval(() => {
      updateNodeData(id, {
        progress: Math.min(
          95,
          (((useFlowStore.getState().nodes.find((n) => n.id === id)?.data as ImageNodeData)
            ?.progress ?? 0) + Math.random() * 18)
        ),
      });
    }, 350);

    try {
      const res = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: composedPrompt, imageRefs, provider: imgData.provider }),
      });
      const json = await res.json();
      clearInterval(interval);
      if (json.fallback) setFallbackNotice(json.fallbackReason ?? "Using placeholder image.");
      updateNodeData(id, { status: "done", progress: 100, imageUrl: json.imageUrl });
    } catch (err) {
      clearInterval(interval);
      updateNodeData(id, { status: "error", progress: 0 });
    }
  }

  async function handleDownload() {
    if (!imgData.imageUrl) return;
    setDownloading(true);
    const ext = imgData.imageUrl.includes(".png") ? "png" : imgData.imageUrl.includes(".webp") ? "webp" : "jpg";
    await downloadUrl(imgData.imageUrl, `cineflow-image-${id}.${ext}`);
    setDownloading(false);
  }

  return (
    <NodeShell
      id={id}
      icon={ImageIcon}
      title="Image"
      selected={selected}
      width="w-[300px]"
      showTarget={false}
      extraHandles={
        <>
          <Handle
            type="target"
            position={Position.Left}
            id={PROMPT_HANDLE_ID}
            isValidConnection={promptValidator}
            style={{ top: "38%" }}
            className={PROMPT_HANDLE_CLASS}
          />
          <Handle
            type="target"
            position={Position.Left}
            id={IMAGE_REFS_HANDLE_ID}
            isValidConnection={imageRefValidator}
            style={{ top: "68%" }}
            className={IMAGE_HANDLE_CLASS}
          />
        </>
      }
    >
      <div className="nodrag mb-2">
        <div className="mb-1 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
          Model
        </div>
        <Select
          value={imgData.provider}
          onValueChange={(v) => updateNodeData(id, { provider: v as ImageNodeData["provider"] })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {IMAGE_PROVIDERS.map((p) => (
              <SelectItem key={p.value} value={p.value}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <PromptPreview
        prompt={composedPrompt}
        placeholder="Connect a Prompt node (and optionally Camera / Lens nodes) to the top-left connector to build this shot..."
      />

      {imageRefs.length > 0 && (
        <div className="mb-2 flex gap-1.5">
          {imageRefs.map((url, i) => (
            <div key={i} className="relative h-8 w-12 overflow-hidden rounded border border-border">
              <Image src={url} alt={`ref ${i}`} fill className="object-cover" unoptimized />
            </div>
          ))}
        </div>
      )}

      <div className="group/img relative mb-2 flex h-[168px] w-full items-center justify-center overflow-hidden rounded-md bg-secondary/60">
        {imgData.status === "loading" && (
          <>
            <Skeleton className="absolute inset-0 rounded-md" />
            <span className="relative z-10 text-xs font-medium text-foreground">
              {Math.round(imgData.progress)}%
            </span>
          </>
        )}
        {imgData.status === "done" && imgData.imageUrl && (
          <>
            <Image src={imgData.imageUrl} alt="Generated" fill className="object-cover" unoptimized />
            <button
              onClick={handleDownload}
              disabled={downloading}
              title="Download image"
              className="nodrag absolute bottom-1.5 right-1.5 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity hover:bg-black/80 group-hover/img:opacity-100"
            >
              <Download className="h-3.5 w-3.5" />
            </button>
          </>
        )}
        {imgData.status === "idle" && (
          <span className="text-[11px] text-muted-foreground">Your generation will appear here</span>
        )}
        {imgData.status === "error" && (
          <span className="text-[11px] text-destructive">Generation failed — try again</span>
        )}
      </div>

      {fallbackNotice && (
        <div className="mb-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-2 text-[10px] leading-relaxed text-amber-400">
          <span className="font-semibold">Placeholder image — model wasn&apos;t used:</span> {fallbackNotice}
        </div>
      )}

      <Button
        size="sm"
        className="nodrag w-full"
        disabled={imgData.status === "loading" || !composedPrompt}
        onClick={handleGenerate}
      >
        <Sparkles className="mr-1.5 h-3.5 w-3.5" />
        {imgData.status === "loading" ? "Generating..." : "Generate image"}
      </Button>
    </NodeShell>
  );
}
