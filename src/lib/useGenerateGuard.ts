"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";

/**
 * Every node's "Generate"/"Upscale"/"Edit" button calls
 * `guardOrRedirect()` first. Returns true if the user is signed in (safe
 * to proceed); if not, pushes them to /signin (with a redirect back to
 * /flow) and returns false so the caller can bail out before hitting the
 * API. After a successful generation, call `refreshCredits()` so the
 * toolbar's balance updates immediately without a page reload.
 *
 * `handleAuthError(res, json)` covers the (rarer) case where the client
 * thought it was signed in but the server disagrees by the time the
 * request lands (401 — session expired), or the account doesn't have
 * enough credits (402) — returns a message to show inline, or null if the
 * response wasn't one of those two cases (so the caller should handle the
 * response normally).
 */
export function useGenerateGuard() {
  const { user, refreshCredits } = useAuth();
  const router = useRouter();

  function guardOrRedirect(): boolean {
    if (!user) {
      router.push("/signin?redirect=/flow");
      return false;
    }
    return true;
  }

  function handleAuthError(res: Response, json: any): string | null {
    if (res.status === 401) {
      router.push("/signin?redirect=/flow");
      return "Please sign in to continue.";
    }
    if (res.status === 402) {
      return json?.message ?? `Not enough credits — need ${json?.required}, have ${json?.credits}.`;
    }
    return null;
  }

  return { guardOrRedirect, refreshCredits, handleAuthError };
}
