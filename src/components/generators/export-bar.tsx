"use client";

import { useState } from "react";
import { Download, Loader2, Bookmark, BookmarkCheck, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { downloadExport } from "@/lib/download";
import type { ExportFormat } from "@/lib/generators";

export function ExportBar({
  projectId,
  title,
  formats,
  initialSaved,
  images = true,
}: {
  projectId: string;
  title: string;
  formats: ExportFormat[];
  initialSaved: boolean;
  images?: boolean;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [saved, setSaved] = useState(initialSaved);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  async function download(format: ExportFormat) {
    setBusy(format);
    setSavedMsg(null);
    try {
      const result = await downloadExport(projectId, format, title, images);
      // On the native app the file is written straight to storage — confirm the
      // location (web browsers show their own download UI, so result is null).
      if (result) {
        setSavedMsg(`Saved to ${result.savedTo}`);
        setTimeout(() => setSavedMsg(null), 5000);
      }
    } catch (err) {
      alert((err as Error).message || "Export failed.");
    } finally {
      setBusy(null);
    }
  }

  async function toggleSave() {
    const next = !saved;
    setSaved(next);
    await fetch(`/api/projects/${projectId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ saved: next }),
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {formats.map((f) => (
        <Button key={f} variant="outline" onClick={() => download(f)} disabled={busy !== null}>
          {busy === f ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
          {f}
        </Button>
      ))}
      <Button variant={saved ? "default" : "secondary"} onClick={toggleSave}>
        {saved ? <BookmarkCheck className="size-4" /> : <Bookmark className="size-4" />}
        {saved ? "Saved" : "Save"}
      </Button>
      {savedMsg && (
        <span className="flex items-center gap-1 text-sm text-emerald-600 dark:text-emerald-400">
          <Check className="size-4" /> {savedMsg}
        </span>
      )}
    </div>
  );
}
