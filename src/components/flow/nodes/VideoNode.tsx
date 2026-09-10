"use client";

import * as React from "react";
import Image from "next/image";
import { Handle, Position, type NodeProps, type Connection, type Edge } from "@xyflow/react";
import { Film, Sparkles, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { useFlowStore } from "@/lib/flowStore";
import { composeUpstreamPrompt, collectUpstreamImageRefs, collectUpstreamVideoRefs } from "@/lib/promptGraph";
import {
  VIDEO_DURATIONS_BY_PROVIDER,
  VIDEO_RESOLUTIONS_BY_PROVIDER,
  VIDEO_ASPECT_RATIOS_BY_PROVIDER,
  DEFAULT_DURATION_BY_PROVIDER,
  DEFAULT_RESOLUTION_BY_PROVIDER,
  DEFAULT_ASPECT_RATIO_BY_PROVIDER,
} from "@/lib/videoOptions";
import { VIDEO_PROVIDERS } from "@/lib/providerOptions";
import {
  PROMPT_HANDLE_ID,
  IMAGE_REFS_HANDLE_ID,
  VIDEO_REF_HANDLE_ID,
  VIDEO_OUT_ID,
  PROMPT_HANDLE_CLASS,
  IMAGE_HANDLE_CLASS,
  VIDEO_REF_HANDLE_CLASS,
} from "@/lib/handleIds";
import { isValidPromptSource, isValidImageRefSource, isValidVideoRefSource } from "@/lib/connectionValidators";
import { downloadUrl } from "@/lib/downloadFile";
import { useHandleSync } from "@/lib/useHandleSync";
import type { VideoNodeData } from "@/lib/types";
import NodeShell from "./NodeShell";
import PromptPreview from "./PromptPreview";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex-1">
      <div className="mb-1 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      {children}
    </div>
  );
}

export default function VideoNode({ id, data, selected }: NodeProps) {
  const vidData = data as VideoNodeData;
  const updateNodeData = useFlowStore((s) => s.updateNodeData);
  const nodes = useFlowStore((s) => s.nodes);
  const edges = useFlowStore((s) => s.edges);
  const [fallbackNotice, setFallbackNotice] = React.useState<string | null>(null);
  const [downloading, setDownloading] = React.useState(false);

  // Only follow edges wired into the "prompt" connector — Prompt / Camera /
  // Lens / Character / Object / Location / Shot nodes connected there.
  // Anything wired into the separate "image refs"/"video refs" connectors
  // (and their own upstream lineage) is deliberately ignored here.
  const composedPrompt = React.useMemo(
    () => composeUpstreamPrompt(id, nodes as any, edges, PROMPT_HANDLE_ID),
    [id, nodes, edges]
  );

  // Only follow edges wired into the "image refs" connector — Image /
  // Reference / Character / Object / Location nodes connected there.
  // Used as flux-3's `images`, or Seedance 2.5's `reference_images`.
  const imageRefs = React.useMemo(
    () => collectUpstreamImageRefs(id, nodes as any, edges, IMAGE_REFS_HANDLE_ID),
    [id, nodes, edges]
  );

  // Only follows the "video reference" connector — one or more Shot/Video
  // clips. flux-3 only uses a single value (sent as start_video); Seedance
  // 2.5 and MiniMax H3 can take the whole list (reference_videos /
  // reference_video_urls).
  const videoRefs = React.useMemo(
    () => collectUpstreamVideoRefs(id, nodes as any, edges, VIDEO_REF_HANDLE_ID),
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

  const videoRefValidator = React.useCallback(
    (connection: Connection | Edge) => isValidVideoRefSource(connection, nodes as any),
    [nodes]
  );

  // The handles above are positioned via percentages, and this node's
  // height shifts with conditional content (ref thumbnails, video-ref
  // banner, storyboard warning, fallback notice) — resync React Flow's
  // cached handle bounds whenever any of that appears/disappears so
  // connections keep landing exactly where the dots are drawn.
  useHandleSync(id, [
    id,
    imageRefs.length,
    videoRefs.length,
    imageRefs.length >= 3 && vidData.duration === "auto",
    fallbackNotice,
    vidData.status,
  ]);

  const durationOptions = VIDEO_DURATIONS_BY_PROVIDER[vidData.provider] ?? VIDEO_DURATIONS_BY_PROVIDER.flux;
  const resolutionOptions = VIDEO_RESOLUTIONS_BY_PROVIDER[vidData.provider] ?? VIDEO_RESOLUTIONS_BY_PROVIDER.flux;
  const aspectRatioOptions = VIDEO_ASPECT_RATIOS_BY_PROVIDER[vidData.provider] ?? VIDEO_ASPECT_RATIOS_BY_PROVIDER.flux;

  function handleProviderChange(v: string) {
    const provider = v as VideoNodeData["provider"];
    updateNodeData(id, {
      provider,
      // Each provider has a different enum for these three fields — reset
      // to that provider's defaults so we don't carry over an invalid
      // value (e.g. flux's "auto" duration isn't valid for Seedance).
      duration: DEFAULT_DURATION_BY_PROVIDER[provider],
      resolution: DEFAULT_RESOLUTION_BY_PROVIDER[provider],
      aspectRatio: DEFAULT_ASPECT_RATIO_BY_PROVIDER[provider],
    });
  }

  async function handleGenerate() {
    setFallbackNotice(null);
    updateNodeData(id, { status: "loading", progress: 0, prompt: composedPrompt });

    const interval = setInterval(() => {
      updateNodeData(id, {
        progress: Math.min(
          95,
          (((useFlowStore.getState().nodes.find((n) => n.id === id)?.data as VideoNodeData)
            ?.progress ?? 0) + Math.random() * 12)
        ),
      });
    }, 400);

    try {
      const res = await fetch("/api/generate-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: composedPrompt,
          imageRefs,
          videoRefs,
          duration: vidData.duration,
          resolution: vidData.resolution,
          aspectRatio: vidData.aspectRatio,
          provider: vidData.provider,
        }),
      });
      const json = await res.json();
      clearInterval(interval);
      if (json.fallback) setFallbackNotice(json.fallbackReason ?? "Using placeholder video.");
      updateNodeData(id, { status: "done", progress: 100, videoUrl: json.videoUrl });
    } catch (err) {
      clearInterval(interval);
      updateNodeData(id, { status: "error", progress: 0 });
    }
  }

  async function handleDownload() {
    if (!vidData.videoUrl) return;
    setDownloading(true);
    await downloadUrl(vidData.videoUrl, `cineflow-video-${id}.mp4`);
    setDownloading(false);
  }

  return (
    <NodeShell
      id={id}
      icon={Film}
      title="Video"
      selected={selected}
      width="w-[300px]"
      showSource={false}
      showTarget={false}
      extraHandles={
        <>
          <Handle
            type="target"
            position={Position.Left}
            id={PROMPT_HANDLE_ID}
            isValidConnection={promptValidator}
            style={{ top: "28%" }}
            className={PROMPT_HANDLE_CLASS}
          />
          <Handle
            type="target"
            position={Position.Left}
            id={IMAGE_REFS_HANDLE_ID}
            isValidConnection={imageRefValidator}
            style={{ top: "52%" }}
            className={IMAGE_HANDLE_CLASS}
          />
          <Handle
            type="target"
            position={Position.Left}
            id={VIDEO_REF_HANDLE_ID}
            isValidConnection={videoRefValidator}
            style={{ top: "76%" }}
            className={VIDEO_REF_HANDLE_CLASS}
          />
          <Handle
            type="source"
            position={Position.Right}
            id={VIDEO_OUT_ID}
            className={VIDEO_REF_HANDLE_CLASS}
          />
        </>
      }
    >
      <div className="nodrag mb-2">
        <div className="mb-1 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
          Model
        </div>
        <Select value={vidData.provider} onValueChange={handleProviderChange}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {VIDEO_PROVIDERS.map((p) => (
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

      <div className="nodrag mb-2 flex gap-2">
        <Field label="Duration">
          <Select
            value={vidData.duration}
            onValueChange={(v) => updateNodeData(id, { duration: v })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {durationOptions.map((d) => (
                <SelectItem key={d} value={d}>
                  {d === "auto" ? "auto" : d === "-1" ? "auto (-1)" : `${d}s`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Resolution">
          <Select
            value={vidData.resolution}
            onValueChange={(v) => updateNodeData(id, { resolution: v })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {resolutionOptions.map((r) => (
                <SelectItem key={r} value={r}>
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Aspect ratio">
          <Select
            value={vidData.aspectRatio}
            onValueChange={(v) => updateNodeData(id, { aspectRatio: v })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {aspectRatioOptions.map((a) => (
                <SelectItem key={a} value={a}>
                  {a}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>

      {imageRefs.length > 0 && (
        <div className="mb-2 flex gap-1.5">
          {imageRefs.map((url, i) => (
            <div key={i} className="relative h-8 w-12 overflow-hidden rounded border border-border">
              <Image src={url} alt={`ref ${i}`} fill className="object-cover" unoptimized />
            </div>
          ))}
        </div>
      )}

      {videoRefs.length > 0 && (
        <div className="mb-2 flex flex-col gap-1.5 rounded-md border border-violet-400/30 bg-violet-400/10 p-2 text-[10px] text-violet-300">
          <span>
            {vidData.provider === "seedance" || vidData.provider === "minimax"
              ? `${videoRefs.length} video reference${videoRefs.length === 1 ? "" : "s"}`
              : "Video reference (continues from this clip)"}
          </span>
          <div className="flex gap-1.5">
            {(vidData.provider === "seedance" || vidData.provider === "minimax"
              ? videoRefs
              : videoRefs.slice(0, 1)
            ).map((url, i) => (
              <video
                key={i}
                src={url}
                muted
                loop
                autoPlay
                playsInline
                className="h-8 w-12 rounded object-cover"
              />
            ))}
          </div>
        </div>
      )}

      {imageRefs.length >= 3 && vidData.duration === "auto" && vidData.provider === "flux" && (
        <div className="mb-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-2 text-[10px] leading-relaxed text-amber-400">
          3+ reference images form a storyboard, which needs an explicit duration — pick a value above instead of &quot;auto&quot;.
        </div>
      )}

      <div className="relative mb-2 flex h-[168px] w-full items-center justify-center overflow-hidden rounded-md bg-secondary/60">
        {vidData.status === "loading" && (
          <>
            <Skeleton className="absolute inset-0 rounded-md" />
            <span className="relative z-10 text-xs font-medium text-foreground">
              {Math.round(vidData.progress)}%
            </span>
          </>
        )}
        {vidData.status === "done" && vidData.videoUrl && (
          <video src={vidData.videoUrl} controls className="h-full w-full object-cover" />
        )}
        {vidData.status === "idle" && (
          <span className="text-[11px] text-muted-foreground">Your generation will appear here</span>
        )}
        {vidData.status === "error" && (
          <span className="text-[11px] text-destructive">Generation failed — try again</span>
        )}
      </div>

      {fallbackNotice && (
        <div className="mb-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-2 text-[10px] leading-relaxed text-amber-400">
          <span className="font-semibold">Placeholder video — model wasn&apos;t used:</span> {fallbackNotice}
        </div>
      )}

      <div className="flex gap-2">
        <Button
          size="sm"
          className="nodrag flex-1"
          disabled={vidData.status === "loading" || (!composedPrompt && imageRefs.length === 0 && videoRefs.length === 0)}
          onClick={handleGenerate}
        >
          <Sparkles className="mr-1.5 h-3.5 w-3.5" />
          {vidData.status === "loading" ? "Generating..." : "Generate video"}
        </Button>

        {vidData.status === "done" && vidData.videoUrl && (
          <Button
            size="sm"
            variant="secondary"
            className="nodrag"
            disabled={downloading}
            onClick={handleDownload}
            title="Download video"
          >
            <Download className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </NodeShell>
  );
}
