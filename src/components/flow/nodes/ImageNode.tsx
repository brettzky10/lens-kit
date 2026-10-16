"use client";

import * as React from "react";
import Image from "next/image";
import { type NodeProps } from "@xyflow/react";
import { ImageIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useFlowStore } from "@/lib/flowStore";
import { composeUpstreamPrompt, collectUpstreamImageRefs } from "@/lib/promptGraph";
import { IMAGE_REFS_HANDLE_ID, PROMPT_HANDLE_ID } from "@/lib/handleIds";
import { isValidImageRefSource, isValidPromptSource } from "@/lib/connectionValidators";
import { IMAGE_NODE_MODELS } from "@/lib/providerOptions";
import { capsFor } from "@/lib/modelCapabilities";
import { aspectToCss } from "@/lib/imageOptions";
import { useHandleSync } from "@/lib/useHandleSync";
import type { ImageNodeData } from "@/lib/types";
import GenNodeFrame from "../GenNodeFrame";
import NodeModelToolbar from "../NodeModelToolbar";
import RunMenu from "../RunMenu";
import TypedHandle from "../TypedHandle";

const H0 = 44; // first connector, px from top
const GAP = 44;

export default function ImageNode({ id, data, selected }: NodeProps) {
  const d = data as ImageNodeData;
  const nodes = useFlowStore((s) => s.nodes);
  const edges = useFlowStore((s) => s.edges);

  const prompt = React.useMemo(() => composeUpstreamPrompt(id, nodes as any, edges, PROMPT_HANDLE_ID), [id, nodes, edges]);
  const imageRefs = React.useMemo(() => collectUpstreamImageRefs(id, nodes as any, edges, IMAGE_REFS_HANDLE_ID), [id, nodes, edges]);

  const caps = capsFor("image", d.provider);
  const modelLabel = IMAGE_NODE_MODELS.find((m) => m.value === d.provider)?.label ?? d.provider;
  const loading = d.status === "loading";

  // connectors appear/disappear with the model, so React Flow must re-measure them
  useHandleSync(id, [id, d.provider, caps.imageRefs, d.aspectRatio, d.status]);

  return (
    <GenNodeFrame
      icon={ImageIcon} title="Image" modelLabel={modelLabel} selected={selected}
      handles={
        <>
          <TypedHandle nodeId={id} kind="text" type="target" id={PROMPT_HANDLE_ID} top={H0} label="Prompt" validate={isValidPromptSource} />
          {caps.imageRefs > 0 && (
            <TypedHandle nodeId={id} kind="image" type="target" id={IMAGE_REFS_HANDLE_ID} top={H0 + GAP} label={caps.imageLabel} validate={isValidImageRefSource} />
          )}
          <TypedHandle nodeId={id} kind="image" type="source" top={H0} label="Image output" />
        </>
      }
      toolbar={<NodeModelToolbar id={id} kind="image" data={d} />}
    >
      <div className="relative flex w-full items-center justify-center bg-secondary/60" style={{ aspectRatio: aspectToCss(d.aspectRatio) }}>
        {loading && (
          <>
            <Skeleton className="absolute inset-0 rounded-none" />
            <span className="relative z-10 text-sm font-medium">{Math.round(d.progress)}%</span>
          </>
        )}
        {d.status === "done" && d.imageUrl && <Image src={d.imageUrl} alt="Generated" fill className="object-cover" unoptimized />}
        {d.status === "idle" && <ImageIcon className="h-8 w-8 text-muted-foreground/50" />}
        {d.status === "error" && <span className="px-4 text-center text-xs text-destructive">Generation failed. Check the prompt connector and try again.</span>}

        {imageRefs.length > 0 && (
          <div className="absolute bottom-2 left-2 z-10 flex gap-1.5">
            {imageRefs.slice(0, 3).map((url, i) => (
              <div key={i} className="relative h-9 w-9 overflow-hidden rounded-lg border-2 border-card shadow">
                <Image src={url} alt={`reference ${i + 1}`} fill className="object-cover" unoptimized />
              </div>
            ))}
            {imageRefs.length > 3 && (
              <div className="flex h-9 w-9 items-center justify-center rounded-lg border-2 border-card bg-background/80 text-xs">+{imageRefs.length - 3}</div>
            )}
          </div>
        )}
      </div>

      {d.fallbackNotice && (
        <div className="mx-4 mt-3 rounded-md border border-amber-500/30 bg-amber-500/10 p-2 text-[11px] leading-relaxed text-amber-400">
          <span className="font-semibold">Placeholder image, model wasn&apos;t used:</span> {d.fallbackNotice}
        </div>
      )}

      <div className="flex items-end gap-3 p-4">
        <p className="nowheel line-clamp-3 min-h-10 flex-1 text-[15px] leading-snug">
          {prompt || <span className="text-muted-foreground">Connect a Prompt node to the text connector…</span>}
        </p>
        <RunMenu nodeId={id} busy={loading} />
      </div>
    </GenNodeFrame>
  );
}
