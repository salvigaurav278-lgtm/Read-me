"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles, Wand2 } from "lucide-react";
import {
  CONTENT_TYPE_CONFIG,
  defaultParams,
  type ContentType,
} from "@/lib/content-types";
import {
  CLASS_LEVELS,
  SUBJECTS_BY_CLASS,
  CLASS_LABELS,
  SUBJECT_LABELS,
  type ClassLevel,
  type Subject,
} from "@/lib/curriculum";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function GeneratorForm({ type }: { type: ContentType }) {
  const cfg = CONTENT_TYPE_CONFIG[type];
  const router = useRouter();

  const [classLevel, setClassLevel] = useState<ClassLevel>("CLASS_10");
  const subjects = SUBJECTS_BY_CLASS[classLevel];
  const [subject, setSubject] = useState<Subject>(subjects[0]);
  const [chapter, setChapter] = useState("");
  const [topic, setTopic] = useState("");
  const [params, setParams] = useState<Record<string, unknown>>(() => defaultParams(type));
  const [chapters, setChapters] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Keep subject valid when the class changes.
  useEffect(() => {
    if (!SUBJECTS_BY_CLASS[classLevel].includes(subject)) {
      setSubject(SUBJECTS_BY_CLASS[classLevel][0]);
    }
  }, [classLevel, subject]);

  // Reset params when switching generator type.
  useEffect(() => {
    setParams(defaultParams(type));
  }, [type]);

  // Load chapter suggestions.
  useEffect(() => {
    let active = true;
    fetch(`/api/curriculum?class=${classLevel}&subject=${subject}`)
      .then((r) => r.json())
      .then((d) => {
        if (active) setChapters(d.chapters ?? []);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [classLevel, subject]);

  const setParam = (key: string, value: unknown) =>
    setParams((p) => ({ ...p, [key]: value }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, classLevel, subject, chapter, topic, params }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Generation failed");
      router.push(`/projects/${data.id}`);
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  }

  const optionFields = useMemo(() => cfg.fields, [cfg]);

  return (
    <form onSubmit={onSubmit} className="grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Target</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Class</Label>
            <Select value={classLevel} onChange={(e) => setClassLevel(e.target.value as ClassLevel)}>
              {CLASS_LEVELS.map((c) => (
                <option key={c} value={c}>
                  {CLASS_LABELS[c]}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Subject</Label>
            <Select value={subject} onChange={(e) => setSubject(e.target.value as Subject)}>
              {subjects.map((s) => (
                <option key={s} value={s}>
                  {SUBJECT_LABELS[s]}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="chapter">Chapter</Label>
            <Input
              id="chapter"
              list="chapter-options"
              value={chapter}
              onChange={(e) => setChapter(e.target.value)}
              placeholder="Select or type a chapter name"
            />
            <datalist id="chapter-options">
              {chapters.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="topic">Topic focus (optional)</Label>
            <Input
              id="topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Narrow down to a specific topic"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Options</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {optionFields.map((f) => {
            if (f.kind === "select") {
              return (
                <div key={f.key} className="space-y-2">
                  <Label>{f.label}</Label>
                  <Select
                    value={String(params[f.key] ?? f.default)}
                    onChange={(e) => setParam(f.key, e.target.value)}
                  >
                    {f.options.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </Select>
                </div>
              );
            }
            if (f.kind === "number") {
              return (
                <div key={f.key} className="space-y-2">
                  <Label>{f.label}</Label>
                  <Input
                    type="number"
                    min={f.min}
                    max={f.max}
                    value={Number(params[f.key] ?? f.default)}
                    onChange={(e) => setParam(f.key, Number(e.target.value))}
                  />
                </div>
              );
            }
            return (
              <label key={f.key} className="flex cursor-pointer items-center justify-between gap-3">
                <span className="text-sm font-medium">{f.label}</span>
                <input
                  type="checkbox"
                  checked={Boolean(params[f.key] ?? f.default)}
                  onChange={(e) => setParam(f.key, e.target.checked)}
                  className="size-4 accent-[hsl(var(--primary))]"
                />
              </label>
            );
          })}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Generating…
              </>
            ) : (
              <>
                <Wand2 className="size-4" /> Generate
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {loading && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-background/70 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4 rounded-xl border bg-card p-8 shadow-lg">
            <span className="grid size-12 place-items-center rounded-full bg-primary text-primary-foreground">
              <Sparkles className="size-6 animate-pulse" />
            </span>
            <p className="font-medium">Real Pathshala AI is writing your {cfg.label.replace(" Generator", "").toLowerCase()}…</p>
            <p className="text-sm text-muted-foreground">This usually takes 10–30 seconds.</p>
            <div className="h-1.5 w-56 overflow-hidden rounded-full bg-muted">
              <div className="h-full w-1/2 animate-[shimmer_1.5s_infinite] rounded-full bg-primary" />
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
