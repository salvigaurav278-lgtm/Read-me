import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { getFlags, imageFetchEnabled, imageFetchFromEnv, setImageFetch } from "@/lib/config/flags";
import { blobConfigured } from "@/lib/generators/imageCache";

export const runtime = "nodejs";

export async function GET() {
  const g = await requireAdmin();
  if (!g.ok) return NextResponse.json({ error: g.error }, { status: g.status });
  const flags = await getFlags();
  return NextResponse.json({
    imageFetch: {
      effective: await imageFetchEnabled(),
      override: flags.imageFetch ?? null, // null = follow env
      env: imageFetchFromEnv(),
    },
    blobConfigured: blobConfigured(),
  });
}

// POST { imageFetch: true | false | null }  (null = follow env default)
export async function POST(req: NextRequest) {
  const g = await requireAdmin();
  if (!g.ok) return NextResponse.json({ error: g.error }, { status: g.status });
  const body = (await req.json().catch(() => ({}))) as { imageFetch?: boolean | null };
  const v = body.imageFetch === true ? true : body.imageFetch === false ? false : null;
  await setImageFetch(v);
  return NextResponse.json({ ok: true, imageFetch: { effective: await imageFetchEnabled(), override: v } });
}
