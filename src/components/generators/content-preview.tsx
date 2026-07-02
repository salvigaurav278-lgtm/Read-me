import type { GeneratedContent } from "@/lib/ai/schemas";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DiagramSlot } from "./diagram-slot";

export function ContentPreview({
  content,
  canManage = false,
  projectId,
  showImages = true,
}: {
  content: GeneratedContent;
  canManage?: boolean;
  projectId?: string;
  showImages?: boolean;
}) {
  const slot = (props: { text: string; diagramId?: string; caption?: string }) =>
    showImages ? <DiagramSlot {...props} canManage={canManage} projectId={projectId} /> : null;
  if (content.kind === "document") {
    return (
      <div className="space-y-6">
        {content.sections.map((s, i) => (
          <section key={i} className="space-y-2">
            <h3 className="text-lg font-semibold text-primary">{s.heading}</h3>
            <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed">
              {s.body.map((b, j) => (
                <li key={j}>{b}</li>
              ))}
            </ul>
            {slot({
              text: `${s.heading} ${s.body.join(" ")} ${s.example ?? ""} ${s.diagram ?? ""}`,
              diagramId: s.diagramId,
              caption: s.diagram,
            })}
            {s.formulas?.length ? (
              <div className="space-y-1 rounded-lg bg-muted/60 p-3">
                {s.formulas.map((f, j) => (
                  <p key={j} className="font-mono text-sm">
                    <span className="font-semibold">{f.name}:</span> {f.expression}
                  </p>
                ))}
              </div>
            ) : null}
          </section>
        ))}
        {content.keyPoints?.length ? (
          <section className="rounded-lg border bg-accent/40 p-4">
            <h3 className="mb-2 font-semibold">Key Points</h3>
            <ul className="list-disc space-y-1 pl-5 text-sm">
              {content.keyPoints.map((k, i) => (
                <li key={i}>{k}</li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    );
  }

  if (content.kind === "paper") {
    const hasAnswers = content.questions.some((q) => q.answer || q.solution?.length);
    return (
      <div className="space-y-6">
        {(content.totalMarks || content.durationMin) && (
          <div className="flex flex-wrap gap-2 text-sm">
            {content.totalMarks ? <Badge variant="outline">Max Marks: {content.totalMarks}</Badge> : null}
            {content.durationMin ? <Badge variant="outline">Time: {content.durationMin} min</Badge> : null}
          </div>
        )}
        {content.instructions?.length ? (
          <section className="rounded-lg bg-muted/60 p-3 text-sm">
            <p className="mb-1 font-semibold">General Instructions</p>
            <ul className="list-disc space-y-0.5 pl-5">
              {content.instructions.map((i, idx) => (
                <li key={idx}>{i}</li>
              ))}
            </ul>
          </section>
        ) : null}

        <ol className="space-y-4">
          {content.questions.map((q) => (
            <li key={q.number} className="space-y-1">
              <p className="text-sm font-medium">
                Q{q.number}. <span className="text-muted-foreground">({q.marks} mark{q.marks === 1 ? "" : "s"})</span> {q.text}
              </p>
              {q.options?.length ? (
                <ul className="pl-5 text-sm text-muted-foreground">
                  {q.options.map((o, i) => (
                    <li key={i}>
                      ({String.fromCharCode(97 + i)}) {o}
                    </li>
                  ))}
                </ul>
              ) : null}
              {slot({
                text: `${q.text} ${(q.options ?? []).join(" ")} ${q.diagram ?? ""}`,
                diagramId: q.diagramId,
                caption: q.diagram,
              })}
            </li>
          ))}
        </ol>

        {hasAnswers && (
          <section className="rounded-lg border bg-accent/30 p-4">
            <h3 className="mb-3 font-semibold">Answer Key &amp; Solutions</h3>
            <div className="space-y-3 text-sm">
              {content.questions
                .filter((q) => q.answer || q.solution?.length)
                .map((q) => (
                  <div key={q.number}>
                    <p>
                      <span className="font-medium">Q{q.number}.</span>{" "}
                      {q.answer && <span>{q.answer}</span>}
                    </p>
                    {q.solution?.length ? (
                      <ol className="list-decimal pl-6 text-muted-foreground">
                        {q.solution.map((step, i) => (
                          <li key={i}>{step}</li>
                        ))}
                      </ol>
                    ) : null}
                  </div>
                ))}
            </div>
          </section>
        )}
      </div>
    );
  }

  // deck
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {content.slides.map((s, i) => (
        <Card key={i} className="overflow-hidden">
          <div className="border-b bg-muted/50 px-4 py-2 text-xs font-medium text-muted-foreground">
            Slide {i + 1}
          </div>
          <CardContent className="space-y-2 p-4">
            <p className="font-semibold">{s.title}</p>
            {s.bullets?.length ? (
              <ul className="list-disc space-y-0.5 pl-5 text-sm">
                {s.bullets.map((b, j) => (
                  <li key={j}>{b}</li>
                ))}
              </ul>
            ) : null}
            {slot({
              text: `${s.title} ${(s.bullets ?? []).join(" ")} ${s.notes ?? ""} ${s.diagram ?? ""}`,
              diagramId: s.diagramId,
              caption: s.diagram,
            })}
            {s.notes ? <p className="text-xs italic text-muted-foreground">Notes: {s.notes}</p> : null}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
