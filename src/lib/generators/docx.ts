import {
  Document,
  Packer,
  Paragraph,
  HeadingLevel,
  TextRun,
  ImageRun,
  AlignmentType,
} from "docx";
import type { GeneratedContent } from "@/lib/ai/schemas";
import type { ExportMeta } from "./index";
import { resolveItemImage, type ResolvedImage } from "./imageResolve";

function p(text: string, opts: { bold?: boolean; italics?: boolean } = {}) {
  return new Paragraph({
    children: [new TextRun({ text, bold: opts.bold, italics: opts.italics })],
  });
}

function bullet(text: string) {
  return new Paragraph({ text, bullet: { level: 0 } });
}

/** Image + caption paragraphs, scaled to fit the page width (~380px). */
function imageParagraphs(img: ResolvedImage): Paragraph[] {
  const maxW = 380;
  const w = Math.min(maxW, img.width);
  const h = Math.round(w * (img.height / img.width));
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new ImageRun({
          type: img.mime === "image/jpeg" ? "jpg" : "png",
          data: img.buf,
          transformation: { width: w, height: h },
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: img.caption, italics: true, size: 16, color: "6B7280" })],
    }),
  ];
}

export async function renderDocx(content: GeneratedContent, meta: ExportMeta = {}): Promise<Buffer> {
  const scope = meta.projectId;
  const withImages = meta.images !== false;
  const children: Paragraph[] = [
    new Paragraph({ text: content.title, heading: HeadingLevel.TITLE }),
    p("Generated with Real Pathshala AI", { italics: true }),
  ];

  const addImage = async (text: string, aiId: string | undefined, caption: string | undefined) => {
    if (!withImages) return;
    const img = await resolveItemImage(text, aiId, caption, scope);
    if (img) children.push(...imageParagraphs(img));
  };

  if (content.kind === "document") {
    for (const s of content.sections) {
      children.push(new Paragraph({ text: s.heading, heading: HeadingLevel.HEADING_1 }));
      for (const b of s.body) children.push(bullet(b));
      await addImage(`${s.heading} ${s.body.join(" ")} ${s.example ?? ""} ${s.diagram ?? ""}`, s.diagramId, s.diagram);
      for (const f of s.formulas ?? []) children.push(p(`${f.name}:  ${f.expression}`, { bold: true }));
    }
    if (content.keyPoints?.length) {
      children.push(new Paragraph({ text: "Key Points", heading: HeadingLevel.HEADING_1 }));
      for (const k of content.keyPoints) children.push(bullet(k));
    }
  } else if (content.kind === "paper") {
    const info: string[] = [];
    if (content.totalMarks) info.push(`Maximum Marks: ${content.totalMarks}`);
    if (content.durationMin) info.push(`Time: ${content.durationMin} min`);
    if (info.length) children.push(p(info.join("     "), { bold: true }));
    if (content.instructions?.length) {
      children.push(new Paragraph({ text: "General Instructions", heading: HeadingLevel.HEADING_1 }));
      for (const i of content.instructions) children.push(bullet(i));
    }
    children.push(new Paragraph({ text: "Questions", heading: HeadingLevel.HEADING_1 }));
    for (const q of content.questions) {
      children.push(p(`Q${q.number}. (${q.marks} mark${q.marks === 1 ? "" : "s"})  ${q.text}`, { bold: true }));
      q.options?.forEach((o, i) => children.push(p(`   (${String.fromCharCode(97 + i)}) ${o}`)));
      await addImage(`${q.text} ${(q.options ?? []).join(" ")} ${q.diagram ?? ""}`, q.diagramId, q.diagram);
    }
    const hasAnswers = content.questions.some((q) => q.answer || q.solution?.length);
    if (hasAnswers) {
      children.push(new Paragraph({ text: "Answer Key & Solutions", heading: HeadingLevel.HEADING_1, pageBreakBefore: true }));
      for (const q of content.questions) {
        if (!q.answer && !q.solution?.length) continue;
        children.push(p(`Q${q.number}.`, { bold: true }));
        if (q.answer) children.push(p(`Answer: ${q.answer}`));
        q.solution?.forEach((step, i) => children.push(p(`   ${i + 1}. ${step}`)));
      }
    }
  } else {
    for (let i = 0; i < content.slides.length; i++) {
      const slide = content.slides[i];
      children.push(new Paragraph({ text: `Slide ${i + 1}: ${slide.title}`, heading: HeadingLevel.HEADING_1 }));
      slide.bullets?.forEach((b) => children.push(bullet(b)));
      await addImage(`${slide.title} ${(slide.bullets ?? []).join(" ")} ${slide.notes ?? ""} ${slide.diagram ?? ""}`, slide.diagramId, slide.diagram);
      if (slide.notes) children.push(p(`Notes: ${slide.notes}`, { italics: true }));
    }
  }

  const doc = new Document({ sections: [{ children }] });
  return Packer.toBuffer(doc);
}
