// Two-tier permanent cache for the hybrid diagram system.
//
//   1. Vercel Blob  — durable, shared across all serverless invocations. Used
//      automatically in production when BLOB_READ_WRITE_TOKEN is set (the token
//      is provisioned when you attach a Blob store to the Vercel project).
//   2. Local filesystem — used for local/dev or persistent servers, and as a
//      fallback when Blob isn't configured.
//
// A concept is fetched from the internet at most once; thereafter it is served
// from the cache. All operations are best-effort and never throw.

import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, unlinkSync } from "fs";
import { join } from "path";
import { list, put, del } from "@vercel/blob";

export interface CacheMeta {
  source: string;
  license: string;
  sourceUrl: string;
  width: number;
  height: number;
  mime: string;
  fetchedAt: string;
  approved?: boolean;
}

export interface CachedImage {
  buf: Buffer;
  mime: string;
  meta: CacheMeta;
}

export function blobConfigured(): boolean {
  return !!process.env.BLOB_READ_WRITE_TOKEN;
}

function cacheRoot(): string {
  return process.env.IMAGE_CACHE_DIR || join(process.cwd(), "assets", "diagrams", "cache");
}

function extFor(mime: string): string {
  return mime === "image/jpeg" ? "jpg" : "png";
}

function safeId(id: string): string {
  return id.replace(/[^a-z0-9-_]/gi, "_").toLowerCase();
}

/** Cache key, optionally namespaced to a project (per-project overrides). */
function keyOf(id: string, scope?: string): string {
  return scope ? `p_${safeId(scope)}__${safeId(id)}` : safeId(id);
}

const BLOB_PREFIX = "diagrams/";

// ── Vercel Blob helpers ──────────────────────────────────────────────────

async function blobUrl(pathname: string): Promise<string | null> {
  try {
    const { blobs } = await list({ prefix: pathname, limit: 10 });
    const exact = blobs.find((b) => b.pathname === pathname);
    return (exact ?? blobs[0])?.url ?? null;
  } catch {
    return null;
  }
}

async function blobFetch(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  }
}

async function readFromBlob(id: string): Promise<CachedImage | null> {
  const metaUrl = await blobUrl(`${BLOB_PREFIX}${safeId(id)}.json`);
  if (!metaUrl) return null;
  const metaBuf = await blobFetch(metaUrl);
  if (!metaBuf) return null;
  let meta: CacheMeta;
  try {
    meta = JSON.parse(metaBuf.toString("utf8")) as CacheMeta;
  } catch {
    return null;
  }
  const imgUrl = await blobUrl(`${BLOB_PREFIX}${safeId(id)}.${extFor(meta.mime)}`);
  if (!imgUrl) return null;
  const buf = await blobFetch(imgUrl);
  if (!buf) return null;
  return { buf, mime: meta.mime, meta };
}

async function writeToBlob(id: string, buf: Buffer, meta: CacheMeta): Promise<boolean> {
  try {
    const base = `${BLOB_PREFIX}${safeId(id)}`;
    await put(`${base}.${extFor(meta.mime)}`, buf, {
      access: "public",
      contentType: meta.mime,
      addRandomSuffix: false,
      allowOverwrite: true,
    });
    await put(`${base}.json`, JSON.stringify(meta), {
      access: "public",
      contentType: "application/json",
      addRandomSuffix: false,
      allowOverwrite: true,
    });
    return true;
  } catch {
    return false;
  }
}

// ── filesystem helpers ───────────────────────────────────────────────────

function readFromFs(id: string): CachedImage | null {
  try {
    const base = join(cacheRoot(), safeId(id));
    const metaPath = `${base}.json`;
    if (!existsSync(metaPath)) return null;
    const meta = JSON.parse(readFileSync(metaPath, "utf8")) as CacheMeta;
    const imgPath = `${base}.${extFor(meta.mime)}`;
    if (!existsSync(imgPath)) return null;
    return { buf: readFileSync(imgPath), mime: meta.mime, meta };
  } catch {
    return null;
  }
}

function writeToFs(id: string, buf: Buffer, meta: CacheMeta): boolean {
  try {
    const dir = cacheRoot();
    mkdirSync(dir, { recursive: true });
    const base = join(dir, safeId(id));
    writeFileSync(`${base}.${extFor(meta.mime)}`, buf);
    writeFileSync(`${base}.json`, JSON.stringify(meta, null, 2));
    return true;
  } catch {
    return false;
  }
}

// ── public API ───────────────────────────────────────────────────────────

/** Vercel Blob first (production), then local filesystem. `scope` = project id
 * for per-project overrides. */
export async function readImageCache(id: string, scope?: string): Promise<CachedImage | null> {
  const key = keyOf(id, scope);
  if (blobConfigured()) {
    const fromBlob = await readFromBlob(key);
    if (fromBlob) return fromBlob;
  }
  return readFromFs(key);
}

/** Persist to Vercel Blob when configured, otherwise the local filesystem. */
export async function writeImageCache(id: string, buf: Buffer, meta: CacheMeta, scope?: string): Promise<boolean> {
  const key = keyOf(id, scope);
  if (blobConfigured()) return writeToBlob(key, buf, meta);
  return writeToFs(key, buf, meta);
}

/** Remove a cached image (both tiers). Used by reject / regenerate. */
export async function deleteImageCache(id: string, scope?: string): Promise<boolean> {
  id = keyOf(id, scope);
  let ok = false;
  if (blobConfigured()) {
    try {
      const { blobs } = await list({ prefix: `${BLOB_PREFIX}${safeId(id)}`, limit: 10 });
      const urls = blobs.map((b) => b.url);
      if (urls.length) await del(urls);
      ok = true;
    } catch {
      /* ignore */
    }
  }
  try {
    const base = join(cacheRoot(), safeId(id));
    for (const ext of ["png", "jpg", "json"]) {
      const p = `${base}.${ext}`;
      if (existsSync(p)) unlinkSync(p);
    }
    ok = true;
  } catch {
    /* ignore */
  }
  return ok;
}

/** Ids currently present in the cache (either tier). For coverage stats. */
export async function listCachedIds(): Promise<Set<string>> {
  const ids = new Set<string>();
  if (blobConfigured()) {
    try {
      let cursor: string | undefined;
      do {
        const res = await list({ prefix: BLOB_PREFIX, limit: 1000, cursor });
        for (const b of res.blobs) {
          const m = b.pathname.match(/diagrams\/(.+)\.json$/);
          if (m) ids.add(m[1]);
        }
        cursor = res.hasMore ? res.cursor : undefined;
      } while (cursor);
    } catch {
      /* ignore */
    }
  }
  try {
    const dir = cacheRoot();
    if (existsSync(dir)) {
      for (const f of readdirSync(dir)) {
        if (f.endsWith(".json")) ids.add(f.replace(/\.json$/, ""));
      }
    }
  } catch {
    /* ignore */
  }
  return ids;
}
