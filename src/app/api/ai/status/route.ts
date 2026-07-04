import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { MODEL, geminiConfigured, strictAi, probeGemini } from "@/lib/ai/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Confirm whether generation will use Gemini or mock content (on the live
 * deployment). Signed-in users only. Add `?probe=1` to make a live Gemini call
 * and see the exact error if generation is failing. */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const keyConfigured = geminiConfigured();
  const wantProbe = new URL(req.url).searchParams.get("probe") === "1";
  const probe = wantProbe ? await probeGemini() : undefined;

  return NextResponse.json({
    provider: "gemini",
    model: MODEL,
    keyConfigured,
    strict: strictAi(),
    willUseMock: !keyConfigured && !strictAi(),
    source: keyConfigured ? "gemini" : "mock",
    ...(probe ? { probe } : {}),
  });
}
