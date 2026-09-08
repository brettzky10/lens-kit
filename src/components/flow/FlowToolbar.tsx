"use client";

import * as React from "react";
import Link from "next/link";
import { Clapperboard, Save, Upload, Cloud, Lock } from "lucide-react";
import { useFlowStore } from "@/lib/flowStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function FlowToolbar() {
  const flowName = useFlowStore((s) => s.flowName);
  const setFlowName = useFlowStore((s) => s.setFlowName);
  const exportFlow = useFlowStore((s) => s.exportFlow);
  const importFlow = useFlowStore((s) => s.importFlow);

  const [editing, setEditing] = React.useState(false);
  const [draftName, setDraftName] = React.useState(flowName);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  function handleSave() {
    const json = exportFlow();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${flowName.replace(/\s+/g, "-").toLowerCase() || "flow"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleImportClick() {
    fileInputRef.current?.click();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") importFlow(reader.result);
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-center justify-between p-4">
      <div className="pointer-events-auto flex items-center gap-3 rounded-xl border border-border bg-card/95 px-3 py-2 shadow-lg backdrop-blur">
        <Link href="/" className="flex items-center gap-2 text-primary">
          <Clapperboard className="h-5 w-5" />
        </Link>
        <div className="h-5 w-px bg-border" />
        {editing ? (
          <Input
            autoFocus
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            onBlur={() => {
              setFlowName(draftName || "Untitled Flow");
              setEditing(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setFlowName(draftName || "Untitled Flow");
                setEditing(false);
              }
              if (e.key === "Escape") {
                setDraftName(flowName);
                setEditing(false);
              }
            }}
            className="h-7 w-48 text-sm"
          />
        ) : (
          <button
            onClick={() => {
              setDraftName(flowName);
              setEditing(true);
            }}
            className="rounded px-1 text-sm font-medium text-foreground hover:bg-accent"
          >
            {flowName}
          </button>
        )}
      </div>

      <div className="pointer-events-auto flex items-center gap-2 rounded-xl border border-border bg-card/95 px-2 py-2 shadow-lg backdrop-blur">
        <Button size="sm" variant="secondary" onClick={handleSave}>
          <Save className="mr-1.5 h-3.5 w-3.5" />
          Save flow
        </Button>
        <Button size="sm" variant="secondary" onClick={handleImportClick}>
          <Upload className="mr-1.5 h-3.5 w-3.5" />
          Import
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={handleFileChange}
        />
        <div className="h-5 w-px bg-border" />
        <Link
          href="/auth"
          title="Sign in to enable cloud autosave"
          className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <Cloud className="h-3.5 w-3.5" />
          <Lock className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}
