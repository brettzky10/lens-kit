"use client";

import { useState } from "react";
import { Shot } from "@/lib/types";
import { panelClass, panelTitleClass, jsonBlockClass } from "@/lib/shot/ui";
import { Button } from "@/components/ui/button";

export default function ShotJsonPanel({
  shot,
  onExportImage,
}: {
  shot: Shot;
  onExportImage: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const json = JSON.stringify(shot, null, 2);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(json);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard API unavailable — no-op, the textarea is still selectable
    }
  };

  const handleDownloadJson = () => {
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "shot.json";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <section className={panelClass}>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className={panelTitleClass}>Shot JSON</h2>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={handleCopy}>
            {copied ? "Copied" : "Copy"}
          </Button>
          <Button variant="ghost" size="sm" onClick={handleDownloadJson}>
            Download .json
          </Button>
        </div>
      </div>
      <pre className={`${jsonBlockClass} mb-3`}>{json}</pre>
      <Button className="w-full" onClick={onExportImage}>
        Export viewport as PNG
      </Button>
    </section>
  );
}
