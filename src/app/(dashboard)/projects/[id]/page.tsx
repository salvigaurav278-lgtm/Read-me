import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, AlertTriangle, Loader2 } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generatedContentSchema } from "@/lib/ai/schemas";
import { CONTENT_TYPE_CONFIG, type ContentType } from "@/lib/content-types";
import { CLASS_LABELS, SUBJECT_LABELS, type ClassLevel, type Subject } from "@/lib/curriculum";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ContentPreview } from "@/components/generators/content-preview";
import { ExportBar } from "@/components/generators/export-bar";
import { ImagesToggle } from "@/components/generators/images-toggle";
import { noteStyleAllowsDiagrams } from "@/lib/ai/prompts";

export default async function ProjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ images?: string }>;
}) {
  const session = await auth();
  const { id } = await params;
  const { images } = await searchParams;

  const project = await prisma.project.findUnique({ where: { id } });
  if (!project || project.userId !== session!.user.id) notFound();

  const styleAllowsDiagrams =
    project.type !== "NOTES" ||
    noteStyleAllowsDiagrams((project.params as { style?: unknown } | null)?.style);
  const showImages = images !== "off" && styleAllowsDiagrams;

  const cfg = CONTENT_TYPE_CONFIG[project.type as ContentType];
  const parsed = project.content
    ? generatedContentSchema.safeParse(project.content)
    : null;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href="/history">
          <ArrowLeft className="size-4" /> Back to history
        </Link>
      </Button>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{project.title}</h1>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge variant="outline">{cfg.label.replace(" Generator", "")}</Badge>
            <Badge variant="outline">{CLASS_LABELS[project.classLevel as ClassLevel]}</Badge>
            <Badge variant="outline">{SUBJECT_LABELS[project.subject as Subject]}</Badge>
          </div>
        </div>
        {project.status === "READY" && parsed?.success && (
          <div className="flex flex-wrap items-center gap-2">
            {styleAllowsDiagrams && <ImagesToggle on={showImages} />}
            <ExportBar
              projectId={project.id}
              title={project.title}
              formats={cfg.exportFormats}
              initialSaved={project.saved}
              images={showImages}
            />
          </div>
        )}
      </div>

      {project.status === "GENERATING" && (
        <Card>
          <CardContent className="flex items-center gap-3 p-6 text-muted-foreground">
            <Loader2 className="size-5 animate-spin" /> Generating content… refresh in a moment.
          </CardContent>
        </Card>
      )}

      {project.status === "FAILED" && (
        <Card>
          <CardContent className="flex items-start gap-3 p-6">
            <AlertTriangle className="size-5 text-destructive" />
            <div>
              <p className="font-medium">Generation failed</p>
              <p className="text-sm text-muted-foreground">{project.error ?? "Please try again."}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {project.status === "READY" && project.mocked && (
        <Card>
          <CardContent className="flex items-start gap-3 p-4">
            <AlertTriangle className="size-5 text-amber-500" />
            <p className="text-sm text-muted-foreground">
              This is <b>sample (mock) content</b> — <code>GEMINI_API_KEY</code> was not configured when it
              was generated. Set the key and regenerate to get real AI content from Gemini.
            </p>
          </CardContent>
        </Card>
      )}

      {project.status === "READY" && parsed?.success && (
        <Card>
          <CardContent className="p-6">
            <ContentPreview
              content={parsed.data}
              canManage={session!.user.role === "TEACHER" || session!.user.role === "ADMIN"}
              projectId={project.id}
              showImages={showImages}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
