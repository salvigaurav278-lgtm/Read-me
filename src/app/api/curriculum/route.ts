import { NextResponse } from "next/server";
import { CHAPTERS, type ClassLevel, type Subject } from "@/lib/curriculum";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const classLevel = searchParams.get("class") as ClassLevel | null;
  const subject = searchParams.get("subject") as Subject | null;

  const chapters = CHAPTERS.filter(
    (c) =>
      (!classLevel || c.classLevel === classLevel) &&
      (!subject || c.subject === subject),
  ).map((c) => c.name);

  return NextResponse.json({ chapters });
}
