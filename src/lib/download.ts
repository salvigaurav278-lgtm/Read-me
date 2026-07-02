"use client";

import { Capacitor } from "@capacitor/core";
import { slugify } from "@/lib/utils";

/**
 * Download a generated export reliably across desktop, mobile browsers and the
 * Android (Capacitor) app.
 *
 * - Native app → fetch the bytes, save to the device with @capacitor/filesystem,
 *   then open the OS share/open sheet so the user can view or save the file.
 * - Web / mobile browser → navigate to the GET endpoint, which streams the file
 *   with `Content-Disposition: attachment` so the browser's own download manager
 *   handles it (blob + `<a download>` is unreliable in mobile/WebView contexts).
 */
export async function downloadExport(
  projectId: string,
  format: "PDF" | "DOCX" | "PPTX",
  title: string,
  images = true,
): Promise<void> {
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

    // Offer to open/share the saved file; if the user dismisses, it's still in Documents.
    try {
      const { Share } = await import("@capacitor/share");
      await Share.share({ title: fileName, files: [written.uri] });
    } catch {
      /* share cancelled or unavailable — file is saved under Documents */
    }
    return;
  }

  // Web / mobile browser: native browser download via the attachment response.
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
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
