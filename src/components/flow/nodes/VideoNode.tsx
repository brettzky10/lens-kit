"use client";

import * as React from "react";
import Image from "next/image";
import { type NodeProps } from "@xyflow/react";
import { Film } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useFlowStore } from "@/lib/flowStore";
import { composeUpstreamPrompt, collectUpstreamImageRefs, collectUpstreamVideoRefs } from "@/lib/promptGraph";
import { IMAGE_REFS_HANDLE_ID, PROMPT_HANDLE_ID, VIDEO_OUT_ID, VIDEO_REF_HANDLE_ID } from "@/lib/handleIds";
import { isValidImageRefSource, isValidPromptSource, isValidVideoRefSource } from "@/lib/connectionValidators";
import { VIDEO_PROVIDERS } from "@/lib/providerOptions";
import { capsFor } from "@/lib/modelCapabilities";
import { aspectToCss } from "@/lib/imageOptions";
import { useHandleSync } from "@/lib/useHandleSync";
import type { VideoNodeData } from "@/lib/types";
import GenNodeFrame from "../GenNodeFrame";
import NodeModelToolbar from "../NodeModelToolbar";
import RunMenu from "../RunMenu";
import TypedHandle from "../TypedHandle";

const H0 = 44;
const GAP = 44;

export default function VideoNode({ id, data, selected }: NodeProps) {
  const d = data as VideoNodeData;
  const nodes = useFlowStore((s) => s.nodes);
  const edges = useFlowStore((s) => s.edges);

  const prompt = React.useMemo(() => composeUpstreamPrompt(id, nodes as any, edges, PROMPT_HANDLE_ID), [id, nodes, edges]);
  const imageRefs = React.useMemo(() => collectUpstreamImageRefs(id, nodes as any, edges, IMAGE_REFS_HANDLE_ID), [id, nodes, edges]);
  const videoRefs = React.useMemo(() => collectUpstreamVideoRefs(id, nodes as any, edges, VIDEO_REF_HANDLE_ID), [id, nodes, edges]);

  const caps = capsFor("video", d.provider);
  const modelLabel = VIDEO_PROVIDERS.find((m) => m.value === d.provider)?.label ?? d.provider;
  const loading = d.status === "loading";

  // Connectors shown depend on the model: Veo has no video-reference connector, Seedance / Flux 3 / MiniMax do.
  const imageRow = caps.imageRefs > 0 ? 1 : -1;
  const videoRow = caps.videoRefs > 0 ? (caps.imageRefs > 0 ? 2 : 1) : -1;

  useHandleSync(id, [id, d.provider, caps.imageRefs, caps.videoRefs, d.aspectRatio, d.status]);

  return (
    <GenNodeFrame
      icon={Film} title="Video" modelLabel={modelLabel} selected={selected}
      handles={
        <>
          <TypedHandle nodeId={id} kind="text" type="target" id={PROMPT_HANDLE_ID} top={H0} label="Prompt" validate={isValidPromptSource} />
          {imageRow > 0 && (
            <TypedHandle nodeId={id} kind="image" type="target" id={IMAGE_REFS_HANDLE_ID} top={H0 + GAP * imageRow} label={caps.imageLabel} validate={isValidImageRefSource} />
          )}
          {videoRow > 0 && (
            <TypedHandle nodeId={id} kind="video" type="target" id={VIDEO_REF_HANDLE_ID} top={H0 + GAP * videoRow} label={caps.videoLabel} validate={isValidVideoRefSource} />
          )}
          <TypedHandle nodeId={id} kind="video" type="source" id={VIDEO_OUT_ID} top={H0} label="Video output" />
        </>
      }
      toolbar={<NodeModelToolbar id={id} kind="video" data={d} />}
    >
      <div className="relative flex w-full items-center justify-center bg-secondary/60" style={{ aspectRatio: aspectToCss(d.aspectRatio) }}>
        {loading && (
          <>
            <Skeleton className="absolute inset-0 rounded-none" />
            <span className="relative z-10 text-sm font-medium">{Math.round(d.progress)}%</span>
          </>
        )}
        {d.status === "done" && d.videoUrl && <video src={d.videoUrl} controls className="nodrag h-full w-full object-cover" />}
        {d.status === "idle" && <Film className="h-8 w-8 text-muted-foreground/50" />}
        {d.status === "error" && <span className="px-4 text-center text-xs text-destructive">Generation failed. Check the connectors and try again.</span>}

        {(imageRefs.length > 0 || videoRefs.length > 0) && !loading && d.status !== "done" && (
          <div className="absolute bottom-2 left-2 z-10 flex items-center gap-1.5">
            {imageRefs.slice(0, 3).map((url, i) => (
              <div key={i} className="relative h-9 w-9 overflow-hidden rounded-lg border-2 border-card shadow">
                <Image src={url} alt={`reference ${i + 1}`} fill className="object-cover" unoptimized />
              </div>
            ))}
            {videoRefs.length > 0 && (
              <span className="rounded-lg bg-violet-500/25 px-2 py-1 text-xs text-violet-300">
                {videoRefs.length} video ref{videoRefs.length === 1 ? "" : "s"}
              </span>
            )}
          </div>
        )}
      </div>

      {imageRefs.length >= 3 && d.duration === "auto" && d.provider === "flux" && (
        <div className="mx-4 mt-3 rounded-md border border-amber-500/30 bg-amber-500/10 p-2 text-[11px] leading-relaxed text-amber-400">
          3+ images form a storyboard, which needs an explicit duration. Pick one in the toolbar instead of Auto.
        </div>
      )}
      {d.fallbackNotice && (
        <div className="mx-4 mt-3 rounded-md border border-amber-500/30 bg-amber-500/10 p-2 text-[11px] leading-relaxed text-amber-400">
          <span className="font-semibold">Placeholder video, model wasn&apos;t used:</span> {d.fallbackNotice}
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
