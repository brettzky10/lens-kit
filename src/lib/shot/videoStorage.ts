import { makeId } from "./id";
import { SavedVideoProject, VideoProject } from "./types";

const KEY = "shot-planner:video-projects";

function readAll(): SavedVideoProject[] {
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

function writeAll(projects: SavedVideoProject[]) {
  window.localStorage.setItem(KEY, JSON.stringify(projects));
}

export function listVideoProjects(): SavedVideoProject[] {
  return readAll().sort((a, b) => b.createdAt - a.createdAt);
}

export function saveVideoProject(name: string, project: VideoProject): SavedVideoProject {
  const entry: SavedVideoProject = {
    id: makeId(),
    name: name.trim() || "Untitled move",
    createdAt: Date.now(),
    project,
  };
  const all = readAll();
  all.push(entry);
  writeAll(all);
  return entry;
}

export function deleteVideoProject(id: string) {
  writeAll(readAll().filter((p) => p.id !== id));
}
