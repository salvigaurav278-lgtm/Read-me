"use client";

import { useRef, useState } from "react";
import { Loader2, RefreshCw, Search, Upload, Check, X, ImagePlus } from "lucide-react";

/**
 * Inline diagram for a topic, rendered from /api/diagrams/render (SVG for
 * built-in vectors, raster for cached/fetched/uploaded images). Teachers get
 * one-click controls: Regenerate, Search, Replace/Upload, Approve, Reject.
 */
export function DiagramSlot({
  text,
  diagramId,
  caption,
  canManage = false,
  projectId,
}: {
  text: string;
  diagramId?: string;
  caption?: string;
  canManage?: boolean;
  projectId?: string;
}) {
  const [v, setV] = useState(0);
  const [status, setStatus] = useState<"loading" | "ok" | "none">("loading");
  const [busy, setBusy] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [query, setQuery] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const proj = projectId ? `&project=${encodeURIComponent(projectId)}` : "";
  const src = `/api/diagrams/render?text=${encodeURIComponent(text)}${diagramId ? `&id=${encodeURIComponent(diagramId)}` : ""}${proj}&v=${v}`;

  const reload = () => {
    setStatus("loading");
    setV((x) => x + 1);
  };

  async function act(action: string, extra: Record<string, unknown> = {}) {
    setBusy(true);
    try {
      await fetch("/api/diagrams/manage", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text, id: diagramId, project: projectId, action, ...extra }),
      });
      reload();
    } finally {
      setBusy(false);
    }
  }

  async function upload() {
    const f = fileRef.current?.files?.[0];
    if (!f) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("text", text);
      if (diagramId) fd.append("id", diagramId);
      if (projectId) fd.append("project", projectId);
      fd.append("files", f);
      await fetch("/api/diagrams/manage", { method: "POST", body: fd });
      if (fileRef.current) fileRef.current.value = "";
      reload();
    } finally {
      setBusy(false);
    }
  }

  if (status === "none" && !canManage) return null;

  const btn = "inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs hover:bg-muted disabled:opacity-50";

  return (
    <div className="my-3">
      {status !== "none" && (
        <figure className="rounded-lg border bg-muted/20 p-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={caption || "Concept diagram"}
            className="mx-auto max-h-60 w-auto"
            onLoad={() => setStatus("ok")}
            onError={() => setStatus("none")}
          />
          {caption && status === "ok" && (
            <figcaption className="mt-1 text-center text-xs text-muted-foreground">{caption}</figcaption>
          )}
        </figure>
      )}

      {canManage && (
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          {status === "none" ? (
            <button className={btn} disabled={busy} onClick={reload}>
              <ImagePlus className="size-3.5" /> Add diagram
            </button>
          ) : (
            <button className={btn} disabled={busy} onClick={() => act("regenerate")}>
              {busy ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />} Regenerate
            </button>
          )}
          <button className={btn} disabled={busy} onClick={() => setShowSearch((s) => !s)}>
            <Search className="size-3.5" /> Search
          </button>
          <button className={btn} disabled={busy} onClick={() => fileRef.current?.click()}>
            <Upload className="size-3.5" /> Replace
          </button>
          {status === "ok" && (
            <>
              <button className={btn} disabled={busy} onClick={() => act("approve")}>
                <Check className="size-3.5" /> Approve
              </button>
              <button className={btn} disabled={busy} onClick={() => act("reject")}>
                <X className="size-3.5" /> Reject
              </button>
            </>
          )}
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="hidden" onChange={upload} />
        </div>
      )}

      {canManage && showSearch && (
        <div className="mt-1.5 flex gap-1.5">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search an educational image (e.g. human heart labelled)…"
            className="h-8 flex-1 rounded-md border bg-background px-2 text-xs"
            onKeyDown={(e) => e.key === "Enter" && query.trim() && act("search", { query: query.trim() })}
          />
          <button className={btn} disabled={busy || !query.trim()} onClick={() => act("search", { query: query.trim() })}>
            Fetch
          </button>
        </div>
      )}
    </div>
  );
}
