import type { GeneratedContent } from "@/lib/ai/schemas";
import { renderPdf } from "./pdf";
import { renderDocx } from "./docx";
import { renderPptx } from "./pptx";

export type ExportFormat = "PDF" | "DOCX" | "PPTX";

const MIME: Record<ExportFormat, string> = {
  PDF: "application/pdf",
  DOCX: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  PPTX: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
};

const EXT: Record<ExportFormat, string> = {
  PDF: "pdf",
  DOCX: "docx",
  PPTX: "pptx",
};

export function mimeFor(format: ExportFormat) {
  return MIME[format];
}

export function extFor(format: ExportFormat) {
  return EXT[format];
}

export async function renderExport(
  format: ExportFormat,
  content: GeneratedContent,
): Promise<Buffer> {
  switch (format) {
    case "PDF":
      return renderPdf(content);
    case "DOCX":
      return renderDocx(content);
    case "PPTX":
      return renderPptx(content);
  }
}
