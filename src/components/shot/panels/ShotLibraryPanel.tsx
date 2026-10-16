"use client";

import { useEffect, useState } from "react";
import { SavedShot, Shot } from "@/lib/types";
import { deleteShot, listShots, saveShot } from "@/lib/shot/storage";
import { panelClass, panelTitleClass, mutedNoteClass } from "@/lib/shot/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ShotLibraryPanel({
  currentShot,
  onLoad,
}: {
  currentShot: Shot;
  onLoad: (shot: Shot) => void;
}) {
  const [shots, setShots] = useState<SavedShot[]>([]);
  const [name, setName] = useState("");
  const [importText, setImportText] = useState("");
  const [importError, setImportError] = useState<string | null>(null);

  useEffect(() => {
    setShots(listShots());
  }, []);

  const handleSave = () => {
    saveShot(name, currentShot);
    setShots(listShots());
    setName("");
  };

  const handleDelete = (id: string) => {
    deleteShot(id);
    setShots(listShots());
  };

  const handleImport = () => {
    try {
      const parsed = JSON.parse(importText) as Shot;
      if (!parsed.camera || !parsed.subject) {
        throw new Error("Missing camera or subject fields");
      }
      onLoad(parsed);
      setImportError(null);
      setImportText("");
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Invalid JSON");
    }
  };

  return (
    <section className={panelClass}>
      <h2 className={panelTitleClass}>Shot library</h2>

      <div className="mb-3 flex gap-2">
        <Input placeholder="Name this shot…" value={name} onChange={(e) => setName(e.target.value)} />
        <Button onClick={handleSave}>Save shot</Button>
      </div>

      <ul className="mb-3 flex max-h-60 flex-col gap-2 overflow-y-auto no-scrollbar">
        {shots.length === 0 && <li className={mutedNoteClass}>No saved shots yet.</li>}
        {shots.map((s) => (
          <li
            key={s.id}
            className="flex items-center justify-between gap-2 rounded-md border border-border bg-input px-2.5 py-2"
          >
            <div>
              <div className="text-[13px] text-foreground">{s.name}</div>
              <div className="mt-0.5 text-[11px] text-muted-foreground">
                {new Date(s.createdAt).toLocaleString()} · {s.shot.subject.type}
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => onLoad(s.shot)}>
                Load
              </Button>
              <Button variant="destructive" size="sm" onClick={() => handleDelete(s.id)}>
                Delete
              </Button>
            </div>
          </li>
        ))}
      </ul>

      <details className="group">
        <summary className="mb-2 cursor-pointer text-[12.5px] text-muted-foreground hover:text-foreground">
          Import shot from JSON
        </summary>
        <textarea
          className="mb-2 min-h-[90px] w-full resize-y rounded-md border border-border bg-input p-2.5 font-mono text-[11.5px] text-foreground outline-none focus-visible:border-accent focus-visible:ring-1 focus-visible:ring-ring"
          placeholder='Paste a Shot JSON here, e.g. { "camera": {...}, "subject": {...} }'
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
