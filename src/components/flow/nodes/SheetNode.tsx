"use client";

import * as React from "react";
import Image from "next/image";
import { type NodeProps } from "@xyflow/react";
import { User, Box, Mountain, type LucideIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useFlowStore } from "@/lib/flowStore";
import { composeUpstreamPrompt, collectUpstreamImageRefs } from "@/lib/promptGraph";
import { IMAGE_REFS_HANDLE_ID, PROMPT_HANDLE_ID, SHEET_IMAGE_OUT_ID, SHEET_PROMPT_OUT_ID } from "@/lib/handleIds";
import { isValidImageRefSource, isValidPromptSource } from "@/lib/connectionValidators";
import { SHEET_CONFIGS } from "@/lib/sheetConfig";
import { IMAGE_NODE_MODELS } from "@/lib/providerOptions";
import { capsFor } from "@/lib/modelCapabilities";
import { useHandleSync } from "@/lib/useHandleSync";
import type { SheetKind, SheetNodeData } from "@/lib/types";
import GenNodeFrame from "../GenNodeFrame";
import NodeModelToolbar from "../NodeModelToolbar";
import RunMenu from "../RunMenu";
import TypedHandle from "../TypedHandle";

const ICONS: Record<SheetKind, LucideIcon> = { character: User, object: Box, location: Mountain };
const H0 = 44;
const GAP = 44;

// One component for "character" / "object" (Prop) / "location". Each generates ONE 16:9 image
// split into three cards showing the same subject from three angles.
export default function SheetNode({ id, data, selected }: NodeProps) {
  const d = data as SheetNodeData;
  const config = SHEET_CONFIGS[d.kind];
  const Icon = ICONS[d.kind];
  const nodes = useFlowStore((s) => s.nodes);
  const edges = useFlowStore((s) => s.edges);

  const description = React.useMemo(() => composeUpstreamPrompt(id, nodes as any, edges, PROMPT_HANDLE_ID), [id, nodes, edges]);
  const refs = React.useMemo(() => collectUpstreamImageRefs(id, nodes as any, edges, IMAGE_REFS_HANDLE_ID), [id, nodes, edges]);

  const provider = d.provider ?? "nanobanana";
  const caps = capsFor("image", provider);
  const modelLabel = IMAGE_NODE_MODELS.find((m) => m.value === provider)?.label ?? provider;
  const loading = d.status === "loading";

  useHandleSync(id, [id, provider, caps.imageRefs, d.status]);

  return (
    <GenNodeFrame
      icon={Icon} title={config.label} modelLabel={modelLabel} selected={selected}
      handles={
        <>
          <TypedHandle nodeId={id} kind="text" type="target" id={PROMPT_HANDLE_ID} top={H0} label="Description" validate={isValidPromptSource} />
          {caps.imageRefs > 0 && (
            <TypedHandle nodeId={id} kind="image" type="target" id={IMAGE_REFS_HANDLE_ID} top={H0 + GAP} label={caps.imageLabel} validate={isValidImageRefSource} />
          )}
          <TypedHandle nodeId={id} kind="image" type="source" id={SHEET_IMAGE_OUT_ID} top={H0} label="Sheet image" />
          <TypedHandle nodeId={id} kind="text" type="source" id={SHEET_PROMPT_OUT_ID} top={H0 + GAP} label="Description output" />
        </>
      }
      toolbar={<NodeModelToolbar id={id} kind="sheet" data={d} />}
    >
      <div className="relative w-full bg-secondary/60" style={{ aspectRatio: "16 / 9" }}>
        {d.status === "done" && d.sheetImage ? (
          <Image src={d.sheetImage} alt={`${config.label} sheet`} fill className="object-cover" unoptimized />
        ) : (
          // empty state: the three cards that will be generated
          <div className="absolute inset-0 grid grid-cols-3 gap-px bg-border">
            {config.views.map((v, i) => (
              <div key={i} className="flex flex-col items-center justify-center gap-1.5 bg-secondary/80 px-2 text-center">
                <Icon className="h-5 w-5 text-muted-foreground/50" />
                <span className="text-[11px] text-muted-foreground">{v}</span>
              </div>
            ))}
          </div>
        )}
        {loading && (
          <>
            <Skeleton className="absolute inset-0 rounded-none" />
            <span className="absolute inset-0 z-10 flex items-center justify-center text-sm font-medium">{Math.round(d.progress)}%</span>
          </>
        )}
        {d.status === "error" && (
          <span className="absolute inset-0 z-10 flex items-center justify-center bg-background/70 px-4 text-center text-xs text-destructive">
            Generation failed. Check the description connector and try again.
          </span>
        )}
        {refs.length > 0 && !loading && d.status !== "done" && (
          <div className="absolute bottom-2 left-2 z-10 flex gap-1.5">
            {refs.slice(0, 3).map((url, i) => (
              <div key={i} className="relative h-9 w-9 overflow-hidden rounded-lg border-2 border-card shadow">
                <Image src={url} alt={`reference ${i + 1}`} fill className="object-cover" unoptimized />
              </div>
            ))}
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
          {description || <span className="text-muted-foreground">{config.placeholder}</span>}
        </p>
        <RunMenu nodeId={id} busy={loading} />
      </div>
    </GenNodeFrame>
  );
}
