import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { MODEL, geminiConfigured, strictAi } from "@/lib/ai/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Confirm whether generation will use Gemini or mock content (on the live
 * deployment). Signed-in users only. */
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const keyConfigured = geminiConfigured();
  return NextResponse.json({
    provider: "gemini",
    model: MODEL,
    keyConfigured,
    strict: strictAi(),
    willUseMock: !keyConfigured && !strictAi(),
    source: keyConfigured ? "gemini" : "mock",
  });
}
