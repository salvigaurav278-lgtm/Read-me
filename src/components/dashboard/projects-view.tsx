"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { FileQuestion, Loader2, Plus } from "lucide-react";
import { ProjectCard, type ProjectSummary } from "./project-card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { CONTENT_TYPE_LIST } from "@/lib/content-types";
import { CLASS_LEVELS, SUBJECTS, CLASS_LABELS, SUBJECT_LABELS } from "@/lib/curriculum";

export function ProjectsView({
  savedOnly = false,
  initialQuery = "",
}: {
  savedOnly?: boolean;
  initialQuery?: string;
}) {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState(initialQuery);
  const [type, setType] = useState("");
  const [classLevel, setClassLevel] = useState("");
  const [subject, setSubject] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (savedOnly) params.set("saved", "true");
    if (q) params.set("q", q);
    if (type) params.set("type", type);
    if (classLevel) params.set("class", classLevel);
    if (subject) params.set("subject", subject);
    const res = await fetch(`/api/projects?${params.toString()}`);
    const data = await res.json();
    setProjects(data.projects ?? []);
    setLoading(false);
  }, [savedOnly, q, type, classLevel, subject]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search…"
          className="h-10 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <Select value={type} onChange={(e) => setType(e.target.value)}>
          <option value="">All types</option>
          {CONTENT_TYPE_LIST.map((c) => (
            <option key={c.type} value={c.type}>
              {c.label.replace(" Generator", "")}
            </option>
          ))}
        </Select>
        <Select value={classLevel} onChange={(e) => setClassLevel(e.target.value)}>
          <option value="">All classes</option>
          {CLASS_LEVELS.map((c) => (
            <option key={c} value={c}>
              {CLASS_LABELS[c]}
            </option>
          ))}
        </Select>
        <Select value={subject} onChange={(e) => setSubject(e.target.value)}>
          <option value="">All subjects</option>
          {SUBJECTS.map((s) => (
            <option key={s} value={s}>
              {SUBJECT_LABELS[s]}
            </option>
          ))}
        </Select>
      </div>

      {loading ? (
        <div className="grid place-items-center py-20 text-muted-foreground">
          <Loader2 className="size-6 animate-spin" />
        </div>
      ) : projects.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center">
          <FileQuestion className="size-10 text-muted-foreground" />
          <p className="font-medium">No projects yet</p>
          <p className="text-sm text-muted-foreground">
            {savedOnly ? "Save a project to find it here." : "Generate your first piece of content."}
          </p>
          <Button asChild>
            <Link href="/generate/notes">
              <Plus className="size-4" /> Create content
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <ProjectCard key={p.id} project={p} onRemoved={() => setProjects((prev) => prev.filter((x) => x.id !== p.id))} />
          ))}
        </div>
      )}
    </div>
  );
}
