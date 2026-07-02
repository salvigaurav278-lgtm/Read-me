// Local image cache for the hybrid diagram system.
//
// Fetched educational images are written here so a concept is only ever
// downloaded once and is reused in every future PDF. The cache directory is
// configurable via IMAGE_CACHE_DIR.
//
// NOTE on hosting: on ephemeral/serverless filesystems (e.g. Vercel) only /tmp
// is writable and it is not shared across invocations, so the cache is
// effectively per-instance there. For a truly permanent cache either point
// IMAGE_CACHE_DIR at a persistent volume, commit the cache directory, or wire a
// blob store (see docs/IMAGES.md). On a normal server/local run it is durable.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

export interface CacheMeta {
  source: string;
  license: string;
  sourceUrl: string;
  width: number;
  height: number;
  mime: string;
  fetchedAt: string;
}

export interface CachedImage {
  buf: Buffer;
  mime: string;
  meta: CacheMeta;
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

/** Return a cached image for the concept id, or null. */
export function readImageCache(id: string): CachedImage | null {
  try {
    const dir = cacheRoot();
    const base = join(dir, safeId(id));
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

/** Persist an image + metadata for the concept id. Best-effort. */
export function writeImageCache(id: string, buf: Buffer, meta: CacheMeta): boolean {
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

export function isCached(id: string): boolean {
  try {
    return existsSync(join(cacheRoot(), `${safeId(id)}.json`));
  } catch {
    return false;
  }
}
