import {
  Document,
  Packer,
  Paragraph,
  HeadingLevel,
  TextRun,
} from "docx";
import type { GeneratedContent } from "@/lib/ai/schemas";

function p(text: string, opts: { bold?: boolean; italics?: boolean } = {}) {
  return new Paragraph({
    children: [new TextRun({ text, bold: opts.bold, italics: opts.italics })],
  });
}

function bullet(text: string) {
  return new Paragraph({ text, bullet: { level: 0 } });
}

export async function renderDocx(content: GeneratedContent): Promise<Buffer> {
  const children: Paragraph[] = [
    new Paragraph({ text: content.title, heading: HeadingLevel.TITLE }),
    p("Generated with Real Pathshala AI", { italics: true }),
  ];

  if (content.kind === "document") {
    for (const s of content.sections) {
      children.push(new Paragraph({ text: s.heading, heading: HeadingLevel.HEADING_1 }));
      for (const b of s.body) children.push(bullet(b));
      for (const f of s.formulas ?? []) children.push(p(`${f.name}:  ${f.expression}`, { bold: true }));
    }
    if (content.keyPoints?.length) {
      children.push(new Paragraph({ text: "Key Points", heading: HeadingLevel.HEADING_1 }));
      for (const k of content.keyPoints) children.push(bullet(k));
    }
  } else if (content.kind === "paper") {
    const meta: string[] = [];
    if (content.totalMarks) meta.push(`Maximum Marks: ${content.totalMarks}`);
    if (content.durationMin) meta.push(`Time: ${content.durationMin} min`);
    if (meta.length) children.push(p(meta.join("     "), { bold: true }));
    if (content.instructions?.length) {
      children.push(new Paragraph({ text: "General Instructions", heading: HeadingLevel.HEADING_1 }));
      for (const i of content.instructions) children.push(bullet(i));
    }
    children.push(new Paragraph({ text: "Questions", heading: HeadingLevel.HEADING_1 }));
    for (const q of content.questions) {
      children.push(p(`Q${q.number}. (${q.marks} mark${q.marks === 1 ? "" : "s"})  ${q.text}`, { bold: true }));
      q.options?.forEach((o, i) => children.push(p(`   (${String.fromCharCode(97 + i)}) ${o}`)));
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
    content.slides.forEach((slide, i) => {
      children.push(new Paragraph({ text: `Slide ${i + 1}: ${slide.title}`, heading: HeadingLevel.HEADING_1 }));
      slide.bullets?.forEach((b) => children.push(bullet(b)));
      if (slide.notes) children.push(p(`Notes: ${slide.notes}`, { italics: true }));
    });
  }

  const doc = new Document({ sections: [{ children }] });
  return Packer.toBuffer(doc);
}
