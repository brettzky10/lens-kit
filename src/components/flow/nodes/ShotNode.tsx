"use client";

import * as React from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Clapperboard, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useFlowStore } from "@/lib/flowStore";
import { SHOTS } from "@/lib/shotsData";
import { SHOT_PROMPT_OUT_ID, SHOT_VIDEO_OUT_ID, PROMPT_HANDLE_CLASS, VIDEO_REF_HANDLE_CLASS } from "@/lib/handleIds";
import type { ShotNodeData } from "@/lib/types";
import { cn } from "@/lib/utils";
import NodeShell from "./NodeShell";
import PromptPreview from "./PromptPreview";
import { FilterGrid, type FilterDefinition } from "@/components/ui/filter-grid";



const SHOT_FILTERS: FilterDefinition<(typeof SHOTS)[number]>[] = [
  {
    id: "all",
    label: "All",
    match: () => true,
  },
  {
    id: "aerial",
    label: "Aerial",
    match: (shot) => shot.category === "aerial",
  },
  {
    id: "ground",
    label: "Ground / POV",
    match: (shot) => shot.category === "ground",
  },
  {
    id: "action",
    label: "Action",
    match: (shot) => shot.category === "action",
  },
];



function ShotCard({
  shot,
  selected,
  onSelect,
}: {
  shot: (typeof SHOTS)[number];
  selected: boolean;
  onSelect: () => void;
}) {
  const videoRef = React.useRef<HTMLVideoElement>(null);

  return (
    <button
      onClick={onSelect}
      onMouseEnter={() => videoRef.current?.play().catch(() => {})}
      onMouseLeave={() => {
        if (videoRef.current) {
          videoRef.current.pause();
          videoRef.current.currentTime = 0;
        }
      }}
      className={cn(
        "group relative flex h-full w-full flex-col overflow-hidden rounded-lg border text-left transition-colors bg-secondary",
        selected ? "border-primary"
    : "border-border hover:border-muted-foreground"
      )}
    >
      {/* Prompt preview always visible above the video, same visual
          language as every other prompt display in the app. */}
     {/*  <div className="bg-secondary/40 p-2">
        <div className="mb-1 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
          Prompt
        </div>
        <p className="line-clamp-4 text-[10px] leading-snug text-foreground/90">{shot.prompt}</p>
      </div> */}

     <div className="relative h-48 w-full bg-black sm:h-52 lg:h-60 xl:h-72 ">
      <video
        ref={videoRef}
        src={shot.videoUrl}
        muted
        loop
        playsInline
        preload="metadata"
        className="h-full w-full object-cover"
      />

      {selected && (
        <div className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Check className="h-3 w-3" />
        </div>
      )}
    </div>


      <div className="px-2 py-1.5 text-xs font-medium text-foreground">{shot.name}</div>
    </button>
  );
}

export default function ShotNode({ id, data, selected }: NodeProps) {
  const shotData = data as ShotNodeData;
  const updateNodeData = useFlowStore((s) => s.updateNodeData);
  const [open, setOpen] = React.useState(false);

  const selectedShot = SHOTS.find((s) => s.id === shotData.selectedShotId);

  return (
    <NodeShell
      id={id}
      icon={Clapperboard}
      title="Shot"
      selected={selected}
      width="w-[240px]"
      showTarget={false}
      showSource={false}
      extraHandles={
        <>
          <Handle
            type="source"
            position={Position.Right}
            id={SHOT_VIDEO_OUT_ID}
            style={{ top: "35%" }}
            className={VIDEO_REF_HANDLE_CLASS}
          />
          <Handle
            type="source"
            position={Position.Right}
            id={SHOT_PROMPT_OUT_ID}
            style={{ top: "65%" }}
            className={PROMPT_HANDLE_CLASS}
          />
        </>
      }
    >
      {selectedShot && (
        <PromptPreview prompt={selectedShot.prompt} placeholder="" label="Shot prompt" />
      )}

      <div className="mb-2 flex h-28 w-full items-center justify-center overflow-hidden rounded-md bg-secondary/60">
        {selectedShot ? (
          <video
            src={selectedShot.videoUrl}
            muted
            loop
            playsInline
            autoPlay
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="px-3 text-center text-[11px] text-muted-foreground">No shot selected</span>
        )}
      </div>

      {selectedShot && (
        <div className="mb-2 truncate text-xs font-medium text-foreground" title={selectedShot.name}>
          {selectedShot.name}
        </div>
      )}

      <Button size="sm" variant="secondary" className="nodrag w-full" onClick={() => setOpen(true)}>
        Pick
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="nodrag bg-black/10">
          <DialogHeader>
            <DialogTitle>Pick a shot</DialogTitle>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-hidden">
            <FilterGrid
              items={SHOTS}
              filters={SHOT_FILTERS}
              getKey={(shot) => shot.id}
              label="Shot category"
              columns={3}
              rowHeight={250}
              maxRows={3}
              gap={12}
              renderItem={(shot) => (
                <ShotCard
                  shot={shot}
                  selected={shot.id === shotData.selectedShotId}
                  onSelect={() => {
                    updateNodeData(id, {
                      selectedShotId: shot.id,
                    });

                    setOpen(false);
                  }}
                />
              )}
            />
          </div>

        </DialogContent>
      </Dialog>
    </NodeShell>
  );
}
