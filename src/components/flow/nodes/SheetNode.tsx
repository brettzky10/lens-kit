"use client";

import * as React from "react";
import Image from "next/image";
import { Handle, Position, type NodeProps, type Connection, type Edge } from "@xyflow/react";
import { User, Box, Mountain, Sparkles, Download, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useFlowStore } from "@/lib/flowStore";
import { composeUpstreamPrompt, collectUpstreamImageRefs } from "@/lib/promptGraph";
import {
  PROMPT_HANDLE_ID,
  IMAGE_REFS_HANDLE_ID,
  SHEET_IMAGE_OUT_ID,
  SHEET_PROMPT_OUT_ID,
  PROMPT_HANDLE_CLASS,
  IMAGE_HANDLE_CLASS,
} from "@/lib/handleIds";
import { isValidPromptSource, isValidImageRefSource } from "@/lib/connectionValidators";
import { SHEET_CONFIGS } from "@/lib/sheetConfig";
import { IMAGE_PROVIDERS } from "@/lib/providerOptions";
import { downloadUrl } from "@/lib/downloadFile";
import type { SheetKind, SheetNodeData } from "@/lib/types";
import NodeShell from "./NodeShell";
import PromptPreview from "./PromptPreview";

const SHEET_ICONS: Record<SheetKind, LucideIcon> = {
  character: User,
  object: Box,
  location: Mountain,
};

// This single component is registered for all three node types
// ("character" / "object" / "location") — it reads data.kind to pick the
// right icon/labels/layout instructions from lib/sheetConfig.ts.
export default function SheetNode({ id, data, selected }: NodeProps) {
  const sheetData = data as SheetNodeData;
  const kind = sheetData.kind;
  const config = SHEET_CONFIGS[kind];
  const Icon = SHEET_ICONS[kind];

  const updateNodeData = useFlowStore((s) => s.updateNodeData);
  const nodes = useFlowStore((s) => s.nodes);
  const edges = useFlowStore((s) => s.edges);
  const [fallbackNotice, setFallbackNotice] = React.useState<string | null>(null);
  const [downloading, setDownloading] = React.useState(false);

  const inputPrompt = React.useMemo(
    () => composeUpstreamPrompt(id, nodes as any, edges, PROMPT_HANDLE_ID),
    [id, nodes, edges]
  );
  const referenceImages = React.useMemo(
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
    updateNodeData(id, { status: "loading", progress: 0 });

    const interval = setInterval(() => {
      updateNodeData(id, {
        progress: Math.min(
          95,
          (((useFlowStore.getState().nodes.find((n) => n.id === id)?.data as SheetNodeData)
            ?.progress ?? 0) + Math.random() * 10)
        ),
      });
    }, 450);

    try {
      const res = await fetch("/api/generate-sheet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          prompt: inputPrompt,
          imageRefs: referenceImages,
          provider: sheetData.provider,
        }),
      });
      const json = await res.json();
      clearInterval(interval);
      if (!res.ok) throw new Error(json.error ?? `Failed to generate ${kind} sheet.`);
      if (json.fallback) setFallbackNotice(json.fallbackReason ?? "Using placeholder sheet.");
      updateNodeData(id, {
        status: "done",
        progress: 100,
        sheetImage: json.sheetImage ?? undefined,
        outputPrompt: json.outputPrompt ?? "",
      });
    } catch (err) {
      clearInterval(interval);
      updateNodeData(id, { status: "error", progress: 0 });
    }
  }

  async function handleDownload() {
    if (!sheetData.sheetImage) return;
    setDownloading(true);
    const url = sheetData.sheetImage;
    const ext = url.includes(".png") ? "png" : url.includes(".webp") ? "webp" : "jpg";
    await downloadUrl(url, `cineflow-${kind}-sheet-${id}.${ext}`);
    setDownloading(false);
  }

  return (
    <NodeShell
      id={id}
      icon={Icon}
      title={config.label}
      selected={selected}
      width="w-[320px]"
      showTarget={false}
      showSource={false}
      extraHandles={
        <>
          {/* Inputs — left edge */}
          <Handle
            type="target"
            position={Position.Left}
            id={PROMPT_HANDLE_ID}
            isValidConnection={promptValidator}
            style={{ top: "30%" }}
            className={PROMPT_HANDLE_CLASS}
          />
          <Handle
            type="target"
            position={Position.Left}
            id={IMAGE_REFS_HANDLE_ID}
            isValidConnection={imageRefValidator}
            style={{ top: "55%" }}
            className={IMAGE_HANDLE_CLASS}
          />
          {/* Outputs — right edge */}
          <Handle
            type="source"
            position={Position.Right}
            id={SHEET_IMAGE_OUT_ID}
            style={{ top: "35%" }}
            className={IMAGE_HANDLE_CLASS}
          />
          <Handle
            type="source"
            position={Position.Right}
            id={SHEET_PROMPT_OUT_ID}
            style={{ top: "65%" }}
            className={PROMPT_HANDLE_CLASS}
          />
        </>
      }
    >
      <div className="nodrag mb-2">
        <div className="mb-1 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
          Model
        </div>
        <Select
          value={sheetData.provider}
          onValueChange={(v) => updateNodeData(id, { provider: v as SheetNodeData["provider"] })}
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
        prompt={inputPrompt}
        placeholder={`Connect a Prompt node (and optionally Camera / Lens) to describe this ${config.subjectNoun}...`}
        label={`${config.label} description input`}
      />

      {referenceImages.length > 0 && (
        <div className="mb-2 flex gap-1.5">
          {referenceImages.map((url, i) => (
            <div key={i} className="relative h-8 w-12 overflow-hidden rounded border border-border">
              <Image src={url} alt={`reference ${i}`} fill className="object-cover" unoptimized />
            </div>
          ))}
        </div>
      )}

      <div className="group/sheet relative mb-2 flex h-[220px] w-full items-center justify-center overflow-hidden rounded-md bg-secondary/60">
        {sheetData.status === "loading" && (
          <>
            <Skeleton className="absolute inset-0 rounded-md" />
            <div className="absolute inset-0 z-10 flex items-center justify-center">
              <div className="rounded-md bg-background/80 px-3 py-2 text-center backdrop-blur-sm">
                <div className="text-xs font-medium">Generating {config.subjectNoun} sheet</div>
                <div className="mt-1 text-[10px] text-muted-foreground">{Math.round(sheetData.progress)}%</div>
              </div>
            </div>
          </>
        )}
        {sheetData.status === "done" && sheetData.sheetImage && (
          <>
            <Image src={sheetData.sheetImage} alt={`${config.label} sheet`} fill className="object-contain" unoptimized />
            <button
              onClick={handleDownload}
              disabled={downloading}
              title="Download sheet"
              className="nodrag absolute bottom-1.5 right-1.5 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity hover:bg-black/80 group-hover/sheet:opacity-100"
            >
              <Download className="h-3.5 w-3.5" />
            </button>
          </>
        )}
        {!sheetData.sheetImage && sheetData.status !== "loading" && (
          <div className="flex flex-col items-center justify-center text-center">
            <Icon className="mb-2 h-6 w-6 text-muted-foreground/50" />
            <span className="px-4 text-[10px] text-muted-foreground">
              {kind === "character" && "Facial + full frontal + full back"}
              {kind === "object" && "Side + full front + full back"}
              {kind === "location" && "Establishing + alt angle + detail"}
            </span>
            <span className="mt-1 text-[9px] text-muted-foreground/70">One combined reference sheet</span>
          </div>
        )}
        {sheetData.status === "error" && (
          <span className="absolute inset-0 flex items-center justify-center text-[11px] text-destructive">
            Generation failed — try again
          </span>
        )}
      </div>

      {sheetData.status === "done" && sheetData.outputPrompt && (
        <PromptPreview prompt={sheetData.outputPrompt} placeholder="" label={`${config.label} prompt output`} />
      )}

      {fallbackNotice && (
        <div className="mb-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-2 text-[10px] leading-relaxed text-amber-400">
          <span className="font-semibold">Placeholder sheet — model wasn&apos;t used:</span> {fallbackNotice}
        </div>
      )}

      <Button
        size="sm"
        className="nodrag w-full"
        disabled={sheetData.status === "loading" || (!inputPrompt && referenceImages.length === 0)}
        onClick={handleGenerate}
      >
        <Sparkles className="mr-1.5 h-3.5 w-3.5" />
        {sheetData.status === "loading" ? "Generating sheet..." : `Generate ${config.subjectNoun} sheet`}
      </Button>
    </NodeShell>
  );
}
