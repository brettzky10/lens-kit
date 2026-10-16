"use client";

import { useState } from "react";
import { VideoProject } from "@/lib/shot/types";
import { downloadJson } from "@/lib/shot/download";
import { panelClass, panelTitleClass, jsonBlockClass, mutedNoteClass } from "@/lib/shot/ui";
import { Button } from "@/components/ui/button";

interface VideoExportPanelProps {
  project: VideoProject;
  isRecording: boolean;
  recordProgress: number; // 0-1
  onExportVideo: () => void;
  onExportFrame: () => void;
}

export default function VideoExportPanel({
  project,
  isRecording,
  recordProgress,
  onExportVideo,
  onExportFrame,
}: VideoExportPanelProps) {
  const [copied, setCopied] = useState(false);
  const json = JSON.stringify(project, null, 2);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(json);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable — no-op
    }
  };

  return (
    <section className={panelClass}>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className={panelTitleClass}>Camera move JSON</h2>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={handleCopy}>
            {copied ? "Copied" : "Copy"}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => downloadJson(project, "camera-move.json")}>
            Download .json
          </Button>
        </div>
      </div>
      <pre className={`${jsonBlockClass} mb-3`}>{json}</pre>

      <Button variant="ghost" className="mb-2 w-full" onClick={onExportFrame} disabled={isRecording}>
        Export current frame (PNG)
      </Button>
      <Button className="w-full" onClick={onExportVideo} disabled={isRecording}>
        {isRecording ? `Recording… ${Math.round(recordProgress * 100)}%` : "Export video (.webm)"}
      </Button>
      <p className={`${mutedNoteClass} mt-2`}>
        Recorded in real time at the project&apos;s fps, straight from the viewport — always from the
        camera&apos;s own perspective, whatever view you were looking at while planning.
      </p>
    </section>
  );
}
