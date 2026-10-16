"use client";

import * as React from "react";
import { type NodeProps } from "@xyflow/react";
import { ArrowUpCircle, Sparkles, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useFlowStore } from "@/lib/flowStore";
import { collectUpstreamVideoRefs } from "@/lib/promptGraph";
import { VIDEO_REF_HANDLE_ID } from "@/lib/handleIds";
import { runUpscaleNode } from "@/lib/runner";
import TypedHandle from "../TypedHandle";
import { isValidVideoRefSource } from "@/lib/connectionValidators";
import { UPSCALE_PROVIDERS } from "@/lib/providerOptions";
import { DEFAULT_IMAGE_PROVIDER } from "@/lib/providerOptions";
import {
  CREATIVITY_OPTIONS,
  UPSCALE_FACTORS,
  SAFETY_TOLERANCES,
  DEFAULT_CREATIVITY,
  DEFAULT_UPSCALE_FACTOR,
  DEFAULT_SAFETY_TOLERANCE,
} from "@/lib/upscaleOptions";
import { downloadUrl } from "@/lib/downloadFile";
import { useHandleSync } from "@/lib/useHandleSync";
import type { UpscaleNodeData } from "@/lib/types";
import NodeShell from "./NodeShell";

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

export default function UpscaleNode({ id, data, selected }: NodeProps) {
  // Defensive defaults: if this node's data is missing fields (e.g. it came
  // from a flow exported by an older version of the app before some field
  // existed), fall back rather than crashing on `undefined.prompt` etc.
  // `importFlow` also now backfills these on import, but this stays as a
  // second line of defense.
  const rawData = data as Partial<UpscaleNodeData> | undefined;
  const upData: UpscaleNodeData = {
    kind: "upscale",
    status: rawData?.status ?? "idle",
    progress: rawData?.progress ?? 0,
    videoUrl: rawData?.videoUrl,
    prompt: rawData?.prompt ?? "",
    creativity: rawData?.creativity ?? DEFAULT_CREATIVITY,
    upscaleFactor: rawData?.upscaleFactor ?? DEFAULT_UPSCALE_FACTOR,
    safetyTolerance: rawData?.safetyTolerance ?? DEFAULT_SAFETY_TOLERANCE,
    provider: rawData?.provider ?? DEFAULT_IMAGE_PROVIDER,
    fallbackNotice: rawData?.fallbackNotice ?? null,
  };
  const updateNodeData = useFlowStore((s) => s.updateNodeData);
  const nodes = useFlowStore((s) => s.nodes);
  const edges = useFlowStore((s) => s.edges);
  const fallbackNotice = upData.fallbackNotice ?? null;
  const [downloading, setDownloading] = React.useState(false);

  const [localPrompt, setLocalPrompt] = React.useState(upData.prompt);
  /* React.useEffect(() => setLocalPrompt(upData.prompt), [upData.prompt]);
 */
  const inputVideo = React.useMemo(
    () => collectUpstreamVideoRefs(id, nodes as any, edges, VIDEO_REF_HANDLE_ID)[0],
    [id, nodes, edges]
  );

  useHandleSync(id, [id, !!inputVideo, fallbackNotice, upData.status]);

  function handlePromptChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const value = e.target.value;
    setLocalPrompt(value);
    updateNodeData(id, { prompt: value });
  }

  // runs through the shared runner so "Run from here / till here" can trigger it too
  const handleUpscale = () => runUpscaleNode(id);

  async function handleDownload() {
    if (!upData.videoUrl) return;
    setDownloading(true);
    await downloadUrl(upData.videoUrl, `cineflow-upscaled-${id}.mp4`);
    setDownloading(false);
  }

  return (
    <NodeShell
      id={id}
      icon={ArrowUpCircle}
      title="Upscale"
      selected={selected}
      width="w-[300px]"
      showTarget={false}
      showSource={false}
      extraHandles={
        <TypedHandle
          nodeId={id}
          kind="video"
          type="target"
          id={VIDEO_REF_HANDLE_ID}
          top="50%"
          label="Video to upscale"
          validate={isValidVideoRefSource}
        />
      }
    >
      <div className="nodrag mb-2">
        <div className="mb-1 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
          Model
        </div>
        <Select
          value={upData.provider}
          onValueChange={(v) => updateNodeData(id, { provider: v as UpscaleNodeData["provider"] })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {UPSCALE_PROVIDERS.map((p) => (
              <SelectItem key={p.value} value={p.value}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="mb-2">
        <div className="mb-1 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
          Prompt (optional)
        </div>
        <Textarea
          value={localPrompt}
          onChange={handlePromptChange}
          placeholder="Describe the clip's content to steer detail — leave empty for a neutral upscale..."
          className="nodrag text-xs"
          rows={2}
        />
      </div>

      <div className="nodrag mb-2 flex gap-2">
        <Field label="Creativity">
          <Select
            value={String(upData.creativity)}
            onValueChange={(v) => updateNodeData(id, { creativity: Number(v) as 0 | 1 })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CREATIVITY_OPTIONS.map((c) => (
                <SelectItem key={c.value} value={String(c.value)}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>

      <div className="nodrag mb-2 flex gap-2">
        <Field label="Upscale factor">
          <Select
            value={String(upData.upscaleFactor)}
            onValueChange={(v) => updateNodeData(id, { upscaleFactor: Number(v) })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {UPSCALE_FACTORS.map((f) => (
                <SelectItem key={f} value={String(f)}>
                  {f}x
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Safety tolerance">
          <Select
            value={String(upData.safetyTolerance)}
            onValueChange={(v) => updateNodeData(id, { safetyTolerance: Number(v) })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SAFETY_TOLERANCES.map((s) => (
                <SelectItem key={s} value={String(s)}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>

      {inputVideo && upData.status !== "done" && (
        <div className="mb-2 flex items-center gap-2 rounded-md border border-violet-400/30 bg-violet-400/10 p-2 text-[10px] text-violet-300">
          <video src={inputVideo} muted loop autoPlay playsInline className="h-8 w-12 rounded object-cover" />
          <span>Video reference connected</span>
        </div>
      )}

      <div className="group/up relative mb-2 flex h-[168px] w-full items-center justify-center overflow-hidden rounded-md bg-secondary/60">
        {upData.status === "loading" && (
          <>
            <Skeleton className="absolute inset-0 rounded-md" />
            <span className="relative z-10 text-xs font-medium text-foreground">
              {Math.round(upData.progress)}%
            </span>
          </>
        )}
        {upData.status === "done" && upData.videoUrl && (
          <>
            <video src={upData.videoUrl} controls className="h-full w-full object-cover" />
            <button
              onClick={handleDownload}
              disabled={downloading}
              title="Download upscaled video"
              className="nodrag absolute bottom-1.5 right-1.5 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity hover:bg-black/80 group-hover/up:opacity-100"
            >
              <Download className="h-3.5 w-3.5" />
            </button>
          </>
        )}
        {upData.status === "idle" && (
          <span className="px-4 text-center text-[11px] text-muted-foreground">
            {inputVideo ? "Ready to upscale" : "Connect a Shot or Video node's video output"}
          </span>
        )}
        {upData.status === "error" && (
          <span className="text-[11px] text-destructive">Upscale failed — try again</span>
        )}
      </div>

      {fallbackNotice && (
        <div className="mb-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-2 text-[10px] leading-relaxed text-amber-400">
          <span className="font-semibold">Original video returned — model wasn&apos;t used:</span> {fallbackNotice}
        </div>
      )}

      <Button
        size="sm"
        className="nodrag w-full"
        disabled={upData.status === "loading" || !inputVideo}
        onClick={handleUpscale}
      >
        <Sparkles className="mr-1.5 h-3.5 w-3.5" />
        {upData.status === "loading" ? "Upscaling..." : "Upscale"}
      </Button>
    </NodeShell>
  );
}
