import { SavedShot, Shot } from "./types";

const KEY = "shot-planner:shots";

function readAll(): SavedShot[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(shots: SavedShot[]) {
  window.localStorage.setItem(KEY, JSON.stringify(shots));
}

export function listShots(): SavedShot[] {
  return readAll().sort((a, b) => b.createdAt - a.createdAt);
}

export function saveShot(name: string, shot: Shot): SavedShot {
  const entry: SavedShot = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: name.trim() || "Untitled shot",
    createdAt: Date.now(),
    shot,
  };
  const all = readAll();
  all.push(entry);
  writeAll(all);
  return entry;
}

export function deleteShot(id: string) {
  writeAll(readAll().filter((s) => s.id !== id));
}
