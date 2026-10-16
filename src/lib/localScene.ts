import type { PrevisScenePayload } from "./usePrevisStore";

/**
 * Standalone-app persistence.
 *
 * The original PrevisStage saved/loaded scenes through a project Vault
 * backend (`/api/previs/:projectId`). This app has no backend, so scenes are
 * kept in the browser's localStorage instead — same JSON payload, just a
 * different transport. Swap this module out for real API calls if you wire
 * this page up to a server later.
 */

const STORAGE_PREFIX = "previs-scene:";

export async function fetchPrevisScene(
  projectId: string = "default",
): Promise<{ scene: PrevisScenePayload | null }> {
  if (typeof window === "undefined") return { scene: null };
  try {
    const raw = window.localStorage.getItem(STORAGE_PREFIX + projectId);
    return { scene: raw ? (JSON.parse(raw) as PrevisScenePayload) : null };
  } catch (err) {
    console.error("[localScene] failed to read scene:", err);
    return { scene: null };
  }
}

export async function savePrevisScene(
  projectId: string,
  scene: PrevisScenePayload,
): Promise<{ status: string; bytes: number }> {
  if (typeof window === "undefined") return { status: "skipped", bytes: 0 };
  const json = JSON.stringify(scene);
  window.localStorage.setItem(STORAGE_PREFIX + projectId, json);
  return { status: "ok", bytes: json.length };
}
