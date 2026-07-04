"use client";

import { useState } from "react";
import Link from "next/link";
import {
  MoreVertical,
  Download,
  Trash2,
  Bookmark,
  BookmarkCheck,
  Loader2,
  Check,
} from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import { downloadExport } from "@/lib/download";
import { CONTENT_TYPE_CONFIG, type ContentType } from "@/lib/content-types";
import { CLASS_LABELS, SUBJECT_LABELS, type ClassLevel, type Subject } from "@/lib/curriculum";
import { Icon } from "@/components/ui/icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface ProjectSummary {
  id: string;
  title: string;
  type: ContentType;
  status: "GENERATING" | "READY" | "FAILED";
  classLevel: ClassLevel;
  subject: Subject;
  chapter?: string | null;
  saved: boolean;
  updatedAt: string;
}

export function ProjectCard({
  project,
  onRemoved,
}: {
  project: ProjectSummary;
  onRemoved?: (id: string) => void;
}) {
  const cfg = CONTENT_TYPE_CONFIG[project.type];
  const [saved, setSaved] = useState(project.saved);
  const [busy, setBusy] = useState<string | null>(null);
  const [removed, setRemoved] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  if (removed) return null;

  async function download(format: "PDF" | "DOCX" | "PPTX") {
    setBusy(format);
    setSavedMsg(null);
    try {
      const result = await downloadExport(project.id, format, project.title);
      if (result) {
        setSavedMsg(`Saved to ${result.savedTo}`);
        setTimeout(() => setSavedMsg(null), 5000);
      }
    } catch (err) {
      alert((err as Error).message || "Export failed. Make sure the content finished generating.");
    } finally {
      setBusy(null);
    }
  }

  async function toggleSave() {
    const next = !saved;
    setSaved(next);
    await fetch(`/api/projects/${project.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ saved: next }),
    });
  }

  async function remove() {
    if (!confirm("Delete this project? This cannot be undone.")) return;
    await fetch(`/api/projects/${project.id}`, { method: "DELETE" });
    setRemoved(true);
    onRemoved?.(project.id);
  }

  const statusBadge =
    project.status === "READY" ? (
      <Badge variant="success">Ready</Badge>
    ) : project.status === "GENERATING" ? (
      <Badge variant="warning">Generating…</Badge>
    ) : (
      <Badge variant="destructive">Failed</Badge>
    );

  return (
    <div className="group flex flex-col rounded-xl border bg-card p-4 transition-shadow hover:shadow-md">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground">
          <Icon name={cfg.icon} className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <Link href={`/projects/${project.id}`} className="line-clamp-2 font-semibold hover:underline">
            {project.title}
          </Link>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {CLASS_LABELS[project.classLevel]} · {SUBJECT_LABELS[project.subject]} ·{" "}
            {cfg.label.replace(" Generator", "")}
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-8">
              <MoreVertical className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {cfg.exportFormats.map((f) => (
              <DropdownMenuItem key={f} onClick={() => download(f)} disabled={project.status !== "READY"}>
                {busy === f ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
                Export {f}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={toggleSave}>
              {saved ? <BookmarkCheck className="size-4" /> : <Bookmark className="size-4" />}
              {saved ? "Remove from saved" : "Save"}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={remove} className="text-destructive">
              <Trash2 className="size-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {statusBadge}
          {saved && (
            <span className={cn("text-primary")}>
              <BookmarkCheck className="size-4" />
            </span>
          )}
        </div>
        <span className="text-xs text-muted-foreground">{formatDate(project.updatedAt)}</span>
      </div>

      {savedMsg && (
        <p className="mt-2 flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
          <Check className="size-3.5" /> {savedMsg}
        </p>
      )}
    </div>
  );
}
