"use client";

import * as React from "react";
import { NodeToolbar, Position } from "@xyflow/react";
import { Check, ChevronDown, Copy, Download, Eraser, MoreHorizontal, Trash2, Volume2, VolumeX, Zap } from "lucide-react";
import { useFlowStore } from "@/lib/flowStore";
import { downloadUrl } from "@/lib/downloadFile";
import { IMAGE_NODE_MODELS, VIDEO_PROVIDERS } from "@/lib/providerOptions";
import { IMAGE_ASPECT_RATIOS_BY_PROVIDER, IMAGE_RESOLUTIONS_BY_PROVIDER } from "@/lib/imageOptions";
import {
  applyVideoPatch,
  VIDEO_SUPPORTS_DRAFT,
  VIDEO_ASPECT_RATIOS_BY_PROVIDER,
  VIDEO_DURATIONS_BY_PROVIDER,
  VIDEO_RESOLUTIONS_BY_PROVIDER,
  VIDEO_SUPPORTS_AUDIO,
} from "@/lib/videoOptions";
import type { ImageNodeData, SheetNodeData, VideoNodeData } from "@/lib/types";
import { MenuRow, MiniMenu, toolbarBtn, toolbarIconBtn } from "./MiniMenu";

const label = (v: string) =>
  v === "-1" || v === "auto" || v === "adaptive" ? "Auto" : v === "match_input_image" ? "Match input" : v;
const durationLabel = (v: string) => (v === "-1" || v === "auto" ? "Auto" : `${v}s`);

function OptionMenu({
  name, value, options, onChange, format = label,
}: { name: string; value: string; options: readonly string[]; onChange: (v: string) => void; format?: (v: string) => string }) {
  return (
    <MiniMenu ariaLabel={name} trigger={format(value)}>
      {options.map((o) => (
        <MenuRow key={o} active={o === value} onSelect={() => onChange(o)}>
          {format(o)}
          {o === value && <Check className="ml-auto h-3.5 w-3.5" />}
        </MenuRow>
      ))}
    </MiniMenu>
  );
}

type Props =
  | { id: string; kind: "image"; data: ImageNodeData }
  | { id: string; kind: "video"; data: VideoNodeData }
  | { id: string; kind: "sheet"; data: SheetNodeData }; // Character / Prop / Location: an image node locked to 16:9

/** Floating toolbar under an Image / Video node: model, aspect ratio, resolution, duration, audio, download, delete, more. */
export default function NodeModelToolbar(props: Props) {
  const { id, kind } = props;
  const data = props.data as any;
  const provider: string = data.provider;
  const isVideo = kind === "video";
  const isSheet = kind === "sheet";

  const updateNodeData = useFlowStore((s) => s.updateNodeData);
  const setNodeProvider = useFlowStore((s) => s.setNodeProvider);
  const removeNode = useFlowStore((s) => s.removeNode);
  const addNode = useFlowStore((s) => s.addNode);

  const models: { value: string; label: string }[] = isVideo ? VIDEO_PROVIDERS : IMAGE_NODE_MODELS;
  const modelLabel = models.find((m) => m.value === provider)?.label ?? provider;
  const aspects = isSheet ? [] : (isVideo ? VIDEO_ASPECT_RATIOS_BY_PROVIDER : IMAGE_ASPECT_RATIOS_BY_PROVIDER)[provider as never] ?? [];
  const resolutions = (isVideo ? VIDEO_RESOLUTIONS_BY_PROVIDER : IMAGE_RESOLUTIONS_BY_PROVIDER)[provider as never] ?? [];
  const durations = isVideo ? VIDEO_DURATIONS_BY_PROVIDER[provider as never] ?? [] : [];
  const supportsAudio = isVideo && VIDEO_SUPPORTS_AUDIO[provider as never];
  const supportsDraft = isVideo && VIDEO_SUPPORTS_DRAFT[provider as never];
  const draft = isVideo && data.draft === true;
  // route video changes through applyVideoPatch so invalid combos (Hailuo 1080p+10s, draft+1080p) are fixed
  const patchVideo = (p: Record<string, unknown>) => updateNodeData(id, applyVideoPatch(provider as never, data, p) as any);
  const resolutionOptions = draft ? resolutions.filter((r) => r === "720p") : resolutions;
  const outputUrl: string | undefined = isVideo ? data.videoUrl : isSheet ? data.sheetImage : data.imageUrl;

  async function download() {
    if (!outputUrl) return;
    const ext = isVideo ? "mp4" : outputUrl.includes(".png") ? "png" : outputUrl.includes(".webp") ? "webp" : "jpg";
    await downloadUrl(outputUrl, `cineflow-${kind}-${id}.${ext}`);
  }

  function duplicate() {
    const src = useFlowStore.getState().nodes.find((n) => n.id === id);
    if (!src) return;
    const newId = addNode((isSheet ? data.kind : kind) as any, { x: src.position.x + 48, y: src.position.y + 48 });
    updateNodeData(newId, {
      ...data, status: "idle", progress: 0, imageUrl: undefined, videoUrl: undefined, sheetImage: undefined, fallbackNotice: null,
    });
  }

  return (
    <NodeToolbar nodeId={id} position={Position.Bottom} offset={14} isVisible>
      <div className="nodrag nopan flex items-center gap-0.5 rounded-xl border border-border bg-card p-1 shadow-lg">
        <MiniMenu ariaLabel="Model" menuClassName="min-w-56" trigger={<>{modelLabel}<ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /></>}>
          {models.map((m) => (
            <MenuRow key={m.value} active={m.value === provider} onSelect={() => setNodeProvider(id, m.value)}>
              {m.label}
              {m.value === provider && <Check className="ml-auto h-3.5 w-3.5" />}
            </MenuRow>
          ))}
        </MiniMenu>

        {aspects.length > 0 && (
          <OptionMenu name="Aspect ratio" value={data.aspectRatio ?? aspects[0]} options={aspects}
            onChange={(v) => updateNodeData(id, { aspectRatio: v })} />
        )}
        {resolutions.length > 0 && (
          <OptionMenu name="Resolution" value={data.resolution ?? resolutionOptions[0]} options={resolutionOptions}
            onChange={(v) => (isVideo ? patchVideo({ resolution: v }) : updateNodeData(id, { resolution: v }))} />
        )}
        {isVideo && durations.length > 0 && (
          <OptionMenu name="Duration" value={data.duration ?? durations[0]} options={durations}
            format={durationLabel} onChange={(v) => patchVideo({ duration: v })} />
        )}
        {supportsAudio && (
          <button type="button" className={toolbarIconBtn}
            aria-label={data.audio !== false ? "Audio on (click to turn off)" : "Audio off (click to turn on)"}
            title={data.audio !== false ? "Audio on" : "Audio off, cheaper on some models"}
            onClick={() => updateNodeData(id, { audio: data.audio === false })}>
            {data.audio !== false ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </button>
        )}
        {supportsDraft && (
          <button type="button" className={`${toolbarBtn} ${draft ? "bg-accent text-primary" : ""}`}
            aria-pressed={draft} title="Draft: faster, cheaper, 720p only" onClick={() => patchVideo({ draft: !draft })}>
            <Zap className="h-3.5 w-3.5" />Draft
          </button>
        )}

        <span className="mx-0.5 h-5 w-px bg-border" />
        <button type="button" className={toolbarIconBtn} aria-label="Download" title="Download" disabled={!outputUrl} onClick={download}>
          <Download className="h-4 w-4" />
        </button>
        <button type="button" className={toolbarIconBtn} aria-label="Delete node" title="Delete" onClick={() => removeNode(id)}>
          <Trash2 className="h-4 w-4" />
        </button>
        <MiniMenu ariaLabel="More options" align="end" triggerClassName={toolbarIconBtn} trigger={<MoreHorizontal className="h-4 w-4" />}>
          <MenuRow onSelect={duplicate}><Copy className="h-3.5 w-3.5" />Duplicate</MenuRow>
          <MenuRow disabled={!outputUrl}
            onSelect={() => updateNodeData(id, { status: "idle", progress: 0, imageUrl: undefined, videoUrl: undefined, sheetImage: undefined, fallbackNotice: null })}>
            <Eraser className="h-3.5 w-3.5" />Clear output
          </MenuRow>
        </MiniMenu>
      </div>
    </NodeToolbar>
  );
}
