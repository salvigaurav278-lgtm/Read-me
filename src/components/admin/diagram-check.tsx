"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Search, Upload, CheckCircle2, XCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ResolveResult {
  resolved: boolean;
  topic: string;
  id?: string;
  label?: string;
  subject?: string;
  hasVector?: boolean;
  source?: string;
  license?: string;
  sourceUrl?: string;
  dimensions?: string;
  approved?: boolean;
  cacheStatus?: string;
  fetchEnabled?: boolean;
}

interface Coverage {
  subjects: { subject: string; total: number; vector: number; cached: number; missing: number }[];
  totals: { total: number; vector: number; cached: number; missing: number };
  missing: { id: string; label: string; subject: string }[];
  sources: { vector: number; real: number; ai: number; upload: number; other: number; cached: number };
  generator: string | null;
  fetchEnabled: boolean;
  blobConfigured: boolean;
}

function statusBadge(status?: string) {
  switch (status) {
    case "cached":
      return <Badge variant="success">Cached</Badge>;
    case "asset-override":
      return <Badge variant="success">Uploaded asset</Badge>;
    case "vector":
      return <Badge>Local vector</Badge>;
    case "missing":
      return <Badge variant="warning">No diagram yet</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

export function DiagramCheck() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<ResolveResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [coverage, setCoverage] = useState<Coverage | null>(null);
  const [showMissing, setShowMissing] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);
  const uploadRef = useRef<HTMLInputElement>(null);
  const bulkRef = useRef<HTMLInputElement>(null);
  const [license, setLicense] = useState("");
  const [busy, setBusy] = useState(false);
  const [bulkResults, setBulkResults] = useState<{ id: string; ok: boolean; reason?: string; known?: boolean }[]>([]);

  async function loadCoverage() {
    const res = await fetch("/api/admin/diagrams/coverage");
    if (res.ok) setCoverage(await res.json());
  }
  useEffect(() => {
    loadCoverage();
  }, []);

  async function search(topic = query) {
    if (!topic.trim()) return;
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/diagrams/resolve?topic=${encodeURIComponent(topic)}`);
      const data = (await res.json()) as ResolveResult;
      setResult(data);
      setPreviewKey((k) => k + 1);
    } finally {
      setLoading(false);
    }
  }

  async function cacheAction(action: "approve" | "reject" | "rebuild") {
    if (!result?.id) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/diagrams/cache", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: result.id, action }),
      });
      const data = await res.json();
      setMsg(data.ok ? `Done: ${action}` : `Failed: ${data.error ?? action}`);
      await search(result.topic);
      await loadCoverage();
    } finally {
      setBusy(false);
    }
  }

  async function upload() {
    const file = uploadRef.current?.files?.[0];
    if (!file || !result?.id) return;
    setBusy(true);
    setMsg(null);
    try {
      const fd = new FormData();
      fd.append("id", result.id);
      if (license.trim()) fd.append("license", license.trim());
      fd.append("files", file);
      const res = await fetch("/api/admin/diagrams/upload", { method: "POST", body: fd });
      const data = await res.json();
      const r = data.results?.[0];
      setMsg(r?.ok ? `Uploaded & optimised (${r.width}px)` : `Failed: ${r?.reason ?? "error"}`);
      if (uploadRef.current) uploadRef.current.value = "";
      await search(result.topic);
      await loadCoverage();
    } finally {
      setBusy(false);
    }
  }

  async function bulkUpload() {
    const files = bulkRef.current?.files;
    if (!files || !files.length) return;
    setBusy(true);
    setMsg(null);
    setBulkResults([]);
    try {
      const fd = new FormData();
      if (license.trim()) fd.append("license", license.trim());
      Array.from(files).forEach((f) => fd.append("files", f));
      const res = await fetch("/api/admin/diagrams/upload", { method: "POST", body: fd });
      const data = await res.json();
      setBulkResults(data.results ?? []);
      if (bulkRef.current) bulkRef.current.value = "";
      await loadCoverage();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-2xl font-bold">Diagram Check</h1>
        {coverage && (
          <>
            <Badge variant={coverage.fetchEnabled ? "success" : "outline"}>
              Fetch {coverage.fetchEnabled ? "on" : "off"}
            </Badge>
            <Badge variant={coverage.blobConfigured ? "success" : "warning"}>
              Blob cache {coverage.blobConfigured ? "connected" : "not set"}
            </Badge>
            <Badge variant={coverage.generator ? "success" : "outline"}>
              AI images {coverage.generator ? `on (${coverage.generator})` : "off"}
            </Badge>
          </>
        )}
      </div>

      {/* Image source breakdown */}
      {coverage && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Image sources</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2 text-sm">
            <Badge>Local vectors: {coverage.sources.vector}</Badge>
            <Badge variant="success">Real (Wikimedia/Openverse): {coverage.sources.real}</Badge>
            <Badge variant="secondary">AI-generated: {coverage.sources.ai}</Badge>
            <Badge variant="secondary">Uploaded: {coverage.sources.upload}</Badge>
            {coverage.sources.other > 0 && <Badge variant="outline">Other: {coverage.sources.other}</Badge>}
            <span className="ml-auto text-muted-foreground">Cached images: {coverage.sources.cached}</span>
          </CardContent>
        </Card>
      )}

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Search a chapter or topic</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              placeholder="e.g. Human Heart, Filtration, AC Generator…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && search()}
            />
            <Button onClick={() => search()} disabled={loading} className="shrink-0">
              {loading ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
              Search
            </Button>
          </div>

          {result && !result.resolved && (
            <p className="text-sm text-muted-foreground">
              No diagram concept matched “{result.topic}”. Upload one below, or it stays text-only.
            </p>
          )}

          {result?.resolved && (
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{result.label}</span>
                  <Badge variant="secondary">{result.subject}</Badge>
                  {statusBadge(result.cacheStatus)}
                  {result.approved && <Badge variant="success">Approved</Badge>}
                </div>
                <dl className="grid grid-cols-3 gap-x-2 gap-y-1 text-sm">
                  <dt className="text-muted-foreground">Concept id</dt>
                  <dd className="col-span-2 font-mono text-xs">{result.id}</dd>
                  <dt className="text-muted-foreground">Source</dt>
                  <dd className="col-span-2">{result.source}</dd>
                  <dt className="text-muted-foreground">License</dt>
                  <dd className="col-span-2">{result.license || "—"}</dd>
                  {result.dimensions && (
                    <>
                      <dt className="text-muted-foreground">Size</dt>
                      <dd className="col-span-2">{result.dimensions}px</dd>
                    </>
                  )}
                  {result.sourceUrl && (
                    <>
                      <dt className="text-muted-foreground">URL</dt>
                      <dd className="col-span-2 truncate">
                        <a href={result.sourceUrl} target="_blank" rel="noreferrer" className="text-primary underline">
                          {result.sourceUrl}
                        </a>
                      </dd>
                    </>
                  )}
                </dl>

                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" disabled={busy || result.cacheStatus !== "cached"} onClick={() => cacheAction("approve")}>
                    <CheckCircle2 className="size-4" /> Approve
                  </Button>
                  <Button size="sm" variant="outline" disabled={busy || result.cacheStatus !== "cached"} onClick={() => cacheAction("reject")}>
                    <XCircle className="size-4" /> Reject
                  </Button>
                  <Button size="sm" variant="outline" disabled={busy} onClick={() => cacheAction("rebuild")}>
                    <RefreshCw className="size-4" /> Rebuild
                  </Button>
                </div>

                <div className="space-y-2 rounded-lg border p-3">
                  <p className="text-sm font-medium">Replace / upload image for this topic</p>
                  <input ref={uploadRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="block w-full text-sm" />
                  <Input placeholder="License (e.g. CC BY 4.0, or your own)" value={license} onChange={(e) => setLicense(e.target.value)} />
                  <Button size="sm" onClick={upload} disabled={busy}>
                    {busy ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />} Upload & optimise
                  </Button>
                </div>
              </div>

              {/* Preview exactly as in the PDF */}
              <div className="min-h-[320px] overflow-hidden rounded-lg border bg-muted/30">
                <iframe
                  key={previewKey}
                  title="PDF preview"
                  className="h-[320px] w-full"
                  src={`/api/admin/diagrams/preview?id=${encodeURIComponent(result.id ?? "")}&topic=${encodeURIComponent(result.topic)}`}
                />
              </div>
            </div>
          )}

          {msg && <p className="text-sm text-muted-foreground">{msg}</p>}
        </CardContent>
      </Card>

      {/* Bulk upload */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Bulk upload & mapping</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Select many images — each file is mapped to a concept id from its file name
            (e.g. <code>human-heart.png</code> → <code>human-heart</code>). All are optimised to print-quality PNG.
          </p>
          <input ref={bulkRef} type="file" multiple accept="image/png,image/jpeg,image/webp,image/svg+xml" className="block w-full text-sm" />
          <Button size="sm" onClick={bulkUpload} disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />} Upload all
          </Button>
          {bulkResults.length > 0 && (
            <ul className="space-y-1 text-sm">
              {bulkResults.map((r) => (
                <li key={r.id} className="flex items-center gap-2">
                  {r.ok ? <CheckCircle2 className="size-4 text-green-600" /> : <XCircle className="size-4 text-destructive" />}
                  <span className="font-mono text-xs">{r.id}</span>
                  {r.ok && !r.known && <Badge variant="warning">unknown concept — won’t auto-attach</Badge>}
                  {!r.ok && <span className="text-muted-foreground">{r.reason}</span>}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Coverage */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Coverage by subject</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!coverage ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="py-2 pr-4">Subject</th>
                      <th className="py-2 pr-4">Concepts</th>
                      <th className="py-2 pr-4">Vector</th>
                      <th className="py-2 pr-4">Cached</th>
                      <th className="py-2 pr-4">Missing</th>
                    </tr>
                  </thead>
                  <tbody>
                    {coverage.subjects.map((s) => (
                      <tr key={s.subject} className="border-b last:border-0">
                        <td className="py-2 pr-4 font-medium">{s.subject}</td>
                        <td className="py-2 pr-4">{s.total}</td>
                        <td className="py-2 pr-4">{s.vector}</td>
                        <td className="py-2 pr-4">{s.cached}</td>
                        <td className="py-2 pr-4">{s.missing}</td>
                      </tr>
                    ))}
                    <tr className="font-semibold">
                      <td className="py-2 pr-4">Total</td>
                      <td className="py-2 pr-4">{coverage.totals.total}</td>
                      <td className="py-2 pr-4">{coverage.totals.vector}</td>
                      <td className="py-2 pr-4">{coverage.totals.cached}</td>
                      <td className="py-2 pr-4">{coverage.totals.missing}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <Button size="sm" variant="outline" onClick={() => setShowMissing((v) => !v)}>
                {showMissing ? "Hide" : "Show"} {coverage.missing.length} topics with no diagram yet
              </Button>
              {showMissing && (
                <div className="flex flex-wrap gap-2">
                  {coverage.missing.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => {
                        setQuery(m.label);
                        search(m.label);
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      className="rounded-full border px-3 py-1 text-xs hover:bg-muted"
                    >
                      {m.label} <span className="text-muted-foreground">· {m.subject}</span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
