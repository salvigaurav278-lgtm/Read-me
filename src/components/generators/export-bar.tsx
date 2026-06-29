"use client";

import { useState } from "react";
import { Download, Loader2, Bookmark, BookmarkCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ExportFormat } from "@/lib/generators";

export function ExportBar({
  projectId,
  title,
  formats,
  initialSaved,
}: {
  projectId: string;
  title: string;
  formats: ExportFormat[];
  initialSaved: boolean;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [saved, setSaved] = useState(initialSaved);

  async function download(format: ExportFormat) {
    setBusy(format);
    try {
      const res = await fetch(`/api/projects/${projectId}/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format }),
      });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${title}.${format.toLowerCase()}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Export failed.");
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
    </div>
  );
}
