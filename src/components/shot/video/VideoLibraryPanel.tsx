"use client";

import { useEffect, useState } from "react";
import { SavedVideoProject, VideoProject } from "@/lib/shot/types";
import { deleteVideoProject, listVideoProjects, saveVideoProject } from "@/lib/shot/videoStorage";
import { panelClass, panelTitleClass, mutedNoteClass } from "@/lib/shot/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function VideoLibraryPanel({
  currentProject,
  onLoad,
}: {
  currentProject: VideoProject;
  onLoad: (project: VideoProject) => void;
}) {
  const [projects, setProjects] = useState<SavedVideoProject[]>([]);
  const [name, setName] = useState("");
  const [importText, setImportText] = useState("");
  const [importError, setImportError] = useState<string | null>(null);

  useEffect(() => {
    setProjects(listVideoProjects());
  }, []);

  const handleSave = () => {
    saveVideoProject(name, currentProject);
    setProjects(listVideoProjects());
    setName("");
  };

  const handleDelete = (id: string) => {
    deleteVideoProject(id);
    setProjects(listVideoProjects());
  };

  const handleImport = () => {
    try {
      const parsed = JSON.parse(importText) as VideoProject;
      if (!Array.isArray(parsed.keyframes)) throw new Error("Missing keyframes array");
      onLoad(parsed);
      setImportError(null);
      setImportText("");
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Invalid JSON");
    }
  };

  return (
    <section className={panelClass}>
      <h2 className={panelTitleClass}>Move library</h2>

      <div className="mb-3 flex gap-2">
        <Input placeholder="Name this move…" value={name} onChange={(e) => setName(e.target.value)} />
        <Button onClick={handleSave}>Save move</Button>
      </div>

      <ul className="mb-3 flex max-h-60 flex-col gap-2 overflow-y-auto no-scrollbar">
        {projects.length === 0 && <li className={mutedNoteClass}>No saved moves yet.</li>}
        {projects.map((p) => (
          <li
            key={p.id}
            className="flex items-center justify-between gap-2 rounded-md border border-border bg-input px-2.5 py-2"
          >
            <div>
              <div className="text-[13px] text-foreground">{p.name}</div>
              <div className="mt-0.5 text-[11px] text-muted-foreground">
                {new Date(p.createdAt).toLocaleString()} · {p.project.keyframes.length} keyframes
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => onLoad(p.project)}>
                Load
              </Button>
              <Button variant="destructive" size="sm" onClick={() => handleDelete(p.id)}>
                Delete
              </Button>
            </div>
          </li>
        ))}
      </ul>

      <details className="group">
        <summary className="mb-2 cursor-pointer text-[12.5px] text-muted-foreground hover:text-foreground">
          Import move from JSON
        </summary>
        <textarea
          className="mb-2 min-h-[90px] w-full resize-y rounded-md border border-border bg-input p-2.5 font-mono text-[11.5px] text-foreground outline-none focus-visible:border-accent focus-visible:ring-1 focus-visible:ring-ring"
          placeholder="Paste a camera move JSON here…"
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
        />
        {importError && <p className="mb-2 text-[12px] text-destructive">{importError}</p>}
        <Button variant="ghost" size="sm" onClick={handleImport}>
          Load from pasted JSON
        </Button>
      </details>
    </section>
  );
}
