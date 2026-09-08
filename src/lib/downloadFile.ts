/**
 * Fetches a URL as a blob and triggers a browser "Save As" download. Using
 * fetch->blob rather than a plain <a download> works reliably even for
 * cross-origin hosts (Replicate's CDN, picsum, etc.) that a plain anchor's
 * download attribute won't force-save for. Falls back to opening the URL
 * in a new tab if the fetch fails (e.g. a host that blocks CORS).
 */
export async function downloadUrl(url: string, filename: string): Promise<void> {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(objectUrl);
  } catch {
    window.open(url, "_blank");
  }
}
