"use client";

import { Capacitor } from "@capacitor/core";
import { slugify } from "@/lib/utils";

/**
 * Download a generated export reliably across desktop, mobile browsers and the
 * Android (Capacitor) app.
 *
 * - Native app → fetch the bytes and save straight into the public Documents
 *   folder with @capacitor/filesystem, then report where it landed. No share
 *   sheet — tapping a format button behaves like a real download.
 * - Web / mobile browser → navigate to the GET endpoint, which streams the file
 *   with `Content-Disposition: attachment` so the browser's own download manager
 *   handles it (blob + `<a download>` is unreliable in mobile/WebView contexts).
 *
 * Returns `{ savedTo }` on native (so the UI can confirm the location) or `null`
 * on web, where the browser's own download UI is the confirmation.
 */
export async function downloadExport(
  projectId: string,
  format: "PDF" | "DOCX" | "PPTX",
  title: string,
  images = true,
): Promise<{ savedTo: string } | null> {
  const fileName = `${slugify(title) || "document"}.${format.toLowerCase()}`;
  const url = `/api/projects/${projectId}/export?format=${format}${images ? "" : "&images=0"}`;

  if (Capacitor.isNativePlatform()) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Export failed (${res.status})`);
    const blob = await res.blob();
    const base64 = await blobToBase64(blob);

    const { Filesystem, Directory } = await import("@capacitor/filesystem");
    const written = await Filesystem.writeFile({
      path: fileName,
      data: base64,
      directory: Directory.Documents,
      recursive: true,
    });
    return { savedTo: friendlyPath(written.uri, fileName) };
  }

  // Web / mobile browser: native browser download via the attachment response.
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  return null;
}

/** Turn a file:// URI into a short "Documents/name.pdf"-style label for the UI. */
function friendlyPath(uri: string, fileName: string): string {
  const m = uri.match(/\/(Documents|Downloads?)\/[^/]*$/i);
  return m ? `${m[1]}/${fileName}` : `Documents/${fileName}`;
}

/** Convert a Blob to a base64 string (no data: prefix) for Filesystem.writeFile. */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.onloadend = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1] ?? "");
    };
    reader.readAsDataURL(blob);
  });
}
