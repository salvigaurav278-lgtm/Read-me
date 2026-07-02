"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Save, Trash2, Plus, Download, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Mapping {
  key: string;
  classLevel: string;
  subject: string;
  chapter: string;
  synonyms: string[];
  concepts: string[];
  keywords: string[];
  formulas: string[];
  experiments: string[];
}

interface Stats {
  totals: { chapters: number; concepts: number; missingDiagrams: number; chaptersWithoutConcepts: number };
  bySubject: { subject: string; chapters: number; concepts: number; missingDiagrams: number }[];
  missingDiagramIds: string[];
}

interface FlagState {
  imageFetch: { effective: boolean; override: boolean | null; env: boolean };
  blobConfigured: boolean;
}

const EMPTY: Mapping = { key: "", classLevel: "CLASS_10", subject: "PHYSICS", chapter: "", synonyms: [], concepts: [], keywords: [], formulas: [], experiments: [] };
const csv = (a: string[]) => a.join(", ");
const parse = (s: string) => s.split(/[,\n]/).map((x) => x.trim()).filter(Boolean);

export function MappingManager() {
  const [mappings, setMappings] = useState<Mapping[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [flags, setFlags] = useState<FlagState | null>(null);
  const [q, setQ] = useState("");
  const [edit, setEdit] = useState<Mapping | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const importRef = useRef<HTMLInputElement>(null);
  const [importMode, setImportMode] = useState<"merge" | "replace">("merge");

  async function load() {
    const [m, f] = await Promise.all([
      fetch("/api/admin/mappings").then((r) => r.json()),
      fetch("/api/admin/flags").then((r) => r.json()),
    ]);
    setMappings(m.mappings ?? []);
    setStats(m.stats ?? null);
    setFlags(f);
  }
  useEffect(() => {
    load();
  }, []);

  async function setFetch(v: boolean | null) {
    setBusy(true);
    try {
      await fetch("/api/admin/flags", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ imageFetch: v }),
      });
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    if (!edit) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/mappings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(edit),
      });
      const data = await res.json();
      setMsg(res.ok ? "Saved" : `Failed: ${data.error}`);
      if (res.ok) {
        setEdit(null);
        await load();
      }
    } finally {
      setBusy(false);
    }
  }

  async function remove(key: string) {
    setBusy(true);
    try {
      await fetch(`/api/admin/mappings?key=${encodeURIComponent(key)}`, { method: "DELETE" });
      if (edit?.key === key) setEdit(null);
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function doImport() {
    const file = importRef.current?.files?.[0];
    if (!file) return;
    setBusy(true);
    setMsg(null);
    try {
      const data = await file.text();
      const format = file.name.toLowerCase().endsWith(".csv") ? "csv" : "json";
      const res = await fetch("/api/admin/mappings/io", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ data, format, mode: importMode }),
      });
      const out = await res.json();
      setMsg(res.ok ? `Imported ${out.imported} (${out.mode})` : `Failed: ${out.error}`);
      if (importRef.current) importRef.current.value = "";
      await load();
    } finally {
      setBusy(false);
    }
  }

  const filtered = mappings.filter((m) =>
    `${m.classLevel} ${m.subject} ${m.chapter} ${m.synonyms.join(" ")}`.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Chapter → Concept Mapping</h1>
        <a href="/admin/diagrams" className="text-sm text-primary underline">
          Diagram Check →
        </a>
      </div>

      {/* Image fetch toggle */}
      {flags && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Online image fetching</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-3">
            <Badge variant={flags.imageFetch.effective ? "success" : "outline"}>
              Currently {flags.imageFetch.effective ? "ON" : "OFF"}
            </Badge>
            <Badge variant={flags.blobConfigured ? "success" : "warning"}>
              Blob {flags.blobConfigured ? "connected" : "not set"}
            </Badge>
            <span className="text-sm text-muted-foreground">
              override: {flags.imageFetch.override === null ? "follow env" : String(flags.imageFetch.override)} · env: {String(flags.imageFetch.env)}
            </span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={busy} onClick={() => setFetch(true)}>Enable</Button>
              <Button size="sm" variant="outline" disabled={busy} onClick={() => setFetch(false)}>Disable</Button>
              <Button size="sm" variant="outline" disabled={busy} onClick={() => setFetch(null)}>Use env default</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Mapping statistics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-4 text-sm">
              <span><b>{stats.totals.chapters}</b> chapters</span>
              <span><b>{stats.totals.concepts}</b> concept links</span>
              <span><b>{stats.totals.missingDiagrams}</b> concepts without a diagram</span>
              <span><b>{stats.totals.chaptersWithoutConcepts}</b> chapters without concepts</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-4">Subject</th><th className="py-2 pr-4">Chapters</th>
                    <th className="py-2 pr-4">Concepts</th><th className="py-2 pr-4">Missing diagrams</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.bySubject.map((s) => (
                    <tr key={s.subject} className="border-b last:border-0">
                      <td className="py-2 pr-4 font-medium">{s.subject}</td>
                      <td className="py-2 pr-4">{s.chapters}</td>
                      <td className="py-2 pr-4">{s.concepts}</td>
                      <td className="py-2 pr-4">{s.missingDiagrams}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {stats.missingDiagramIds.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Concept ids referenced but with no diagram yet: {stats.missingDiagramIds.join(", ")}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Import / Export */}
      <Card>
        <CardHeader><CardTitle className="text-base">Bulk import / export</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          <a href="/api/admin/mappings/io?format=json" className="inline-flex items-center gap-1 rounded-md border px-3 py-2 text-sm hover:bg-muted"><Download className="size-4" /> Export JSON</a>
          <a href="/api/admin/mappings/io?format=csv" className="inline-flex items-center gap-1 rounded-md border px-3 py-2 text-sm hover:bg-muted"><Download className="size-4" /> Export CSV</a>
          <span className="mx-2 h-6 w-px bg-border" />
          <input ref={importRef} type="file" accept=".json,.csv" className="text-sm" />
          <select value={importMode} onChange={(e) => setImportMode(e.target.value as "merge" | "replace")} className="rounded-md border bg-background px-2 py-1 text-sm">
            <option value="merge">merge</option>
            <option value="replace">replace</option>
          </select>
          <Button size="sm" disabled={busy} onClick={doImport}><Upload className="size-4" /> Import</Button>
        </CardContent>
      </Card>

      {/* List + editor */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
            <CardTitle className="text-base">Chapters ({filtered.length})</CardTitle>
            <Button size="sm" variant="outline" onClick={() => setEdit({ ...EMPTY })}><Plus className="size-4" /> New</Button>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input placeholder="Search chapter / subject / synonym…" value={q} onChange={(e) => setQ(e.target.value)} />
            <div className="max-h-[420px] space-y-1 overflow-y-auto">
              {filtered.map((m) => (
                <button key={m.key} onClick={() => setEdit({ ...m })} className={`flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm hover:bg-muted ${edit?.key === m.key ? "border-primary" : ""}`}>
                  <span>
                    <span className="font-medium">{m.chapter}</span>
                    <span className="ml-2 text-xs text-muted-foreground">{m.classLevel} · {m.subject}</span>
                  </span>
                  <Badge variant={m.concepts.length ? "secondary" : "warning"}>{m.concepts.length} concepts</Badge>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">{edit ? (edit.key ? "Edit mapping" : "New mapping") : "Select a chapter"}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {!edit ? (
              <p className="text-sm text-muted-foreground">Choose a chapter on the left, or create a new mapping.</p>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <label className="text-xs">Class
                    <Input value={edit.classLevel} onChange={(e) => setEdit({ ...edit, classLevel: e.target.value })} placeholder="CLASS_10" />
                  </label>
                  <label className="text-xs">Subject
                    <Input value={edit.subject} onChange={(e) => setEdit({ ...edit, subject: e.target.value })} placeholder="PHYSICS" />
                  </label>
                </div>
                <label className="text-xs">Chapter
                  <Input value={edit.chapter} onChange={(e) => setEdit({ ...edit, chapter: e.target.value })} placeholder="Chapter name" />
                </label>
                {([
                  ["Synonyms", "synonyms"],
                  ["Concept ids (diagram ids)", "concepts"],
                  ["Keywords", "keywords"],
                  ["Formulas", "formulas"],
                  ["Experiments", "experiments"],
                ] as const).map(([label, field]) => (
                  <label key={field} className="block text-xs">{label} <span className="text-muted-foreground">(comma or newline separated)</span>
                    <textarea
                      className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                      rows={field === "concepts" ? 3 : 2}
                      value={csv(edit[field] as string[])}
                      onChange={(e) => setEdit({ ...edit, [field]: parse(e.target.value) })}
                    />
                  </label>
                ))}
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" disabled={busy} onClick={save}><Save className="size-4" /> Save</Button>
                  {edit.key && (
                    <Button size="sm" variant="outline" disabled={busy} onClick={() => remove(edit.key)}><Trash2 className="size-4" /> Delete</Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => setEdit(null)}>Cancel</Button>
                </div>
              </>
            )}
            {msg && <p className="text-sm text-muted-foreground">{msg}</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
