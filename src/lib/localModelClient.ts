/**
 * Calls a locally-hosted (LAN) generation API as an alternative to
 * Replicate. Since every local setup (ComfyUI, Automatic1111, a custom
 * FastAPI/Flask server, etc.) speaks a different request/response shape,
 * this assumes a REASONABLE GENERIC CONTRACT and handles a few common
 * response shapes defensively. Adjust `buildRequestBody` / the response
 * parsing below to match your actual server's API exactly.
 *
 * ASSUMED CONTRACT (adjust as needed):
 *   Request:  POST <LOCAL_IMAGE_API_URL or LOCAL_VIDEO_API_URL>
 *             Content-Type: application/json
 *             Authorization: Bearer <LOCAL_API_KEY>   (only if that env var is set)
 *             Body: { prompt, imageRefs, resolution, aspectRatio }
 *                   or { prompt, imageRefs, duration, resolution, aspectRatio } for video
 *
 *   Response: any ONE of —
 *     - a raw image/video binary (Content-Type: image/* or video/*)
 *     - JSON { imageUrl: "https://..." }              (image)
 *     - JSON { videoUrl: "https://..." }               (video)
 *     - JSON { url: "https://..." }
 *     - JSON { image: "<base64>" } or { image: "data:image/png;base64,..." }
 *     - JSON { video: "<base64>" } or { video: "data:video/mp4;base64,..." }
 */

interface LocalCallResult {
  url: string;
}

async function callLocalApi(
  envUrlVarName: "LOCAL_IMAGE_API_URL" | "LOCAL_VIDEO_API_URL",
  body: Record<string, unknown>,
  mediaField: "imageUrl" | "videoUrl",
  base64Field: "image" | "video",
  defaultMime: string
): Promise<LocalCallResult> {
  const url = process.env[envUrlVarName];
  if (!url) {
    throw new Error(
      `No ${envUrlVarName} set in the server environment — add it to .env.local pointing at your local model's endpoint.`
    );
  }

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (process.env.LOCAL_API_KEY) {
    headers.Authorization = `Bearer ${process.env.LOCAL_API_KEY}`;
  }

  const res = await fetch(url, { method: "POST", headers, body: JSON.stringify(body) });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Local model API returned ${res.status}${text ? `: ${text.slice(0, 300)}` : ""}`);
  }

  const contentType = res.headers.get("content-type") || "";

  // Binary response — encode as a data URL directly.
  if (contentType.startsWith("image/") || contentType.startsWith("video/")) {
    const buffer = Buffer.from(await res.arrayBuffer());
    return { url: `data:${contentType};base64,${buffer.toString("base64")}` };
  }

  // Otherwise assume JSON and check the common field names.
  const json = await res.json().catch(() => {
    throw new Error("Local model API response wasn't valid JSON and wasn't an image/video binary.");
  });

  const direct = json[mediaField] || json.url;
  if (typeof direct === "string" && direct.length > 0) {
    return { url: direct };
  }

  const b64 = json[base64Field];
  if (typeof b64 === "string" && b64.length > 0) {
    return { url: b64.startsWith("data:") ? b64 : `data:${defaultMime};base64,${b64}` };
  }

  throw new Error(
    `Local model API response didn't include a recognizable "${mediaField}"/"url"/"${base64Field}" field. Got keys: ${Object.keys(json).join(", ") || "(none)"}`
  );
}

export function callLocalImageApi(body: Record<string, unknown>): Promise<LocalCallResult> {
  return callLocalApi("LOCAL_IMAGE_API_URL", body, "imageUrl", "image", "image/png");
}

export function callLocalVideoApi(body: Record<string, unknown>): Promise<LocalCallResult> {
  return callLocalApi("LOCAL_VIDEO_API_URL", body, "videoUrl", "video", "video/mp4");
}
