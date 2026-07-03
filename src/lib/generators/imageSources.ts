// Online educational-image fetch pipeline (behind a feature flag).
//
// Sources: Wikimedia Commons and Openverse — restricted to public-domain,
// CC0 and CC BY / CC BY-SA licensed images. We always request a *rendered
// raster thumbnail* at >= 1200px (so SVG diagrams come back as embeddable PNG
// and the minimum-width rule is met), validate it, then cache it.
//
// The whole path is gated by IMAGE_FETCH_ENABLED=true. When disabled (default)
// or when any network/validation step fails, callers fall back to the offline
// vector library — the system always works without internet.

import { validateImage, imageSize } from "./imageQuality";
import {
  readImageCache,
  writeImageCache,
  blobConfigured,
  type CachedImage,
  type CacheMeta,
} from "./imageCache";
import { imageFetchEnabled } from "@/lib/config/flags";
import { generateImage } from "./imageGenerate";

const THUMB_WIDTH = 1600;
const MIN_WIDTH = 1200;
const FETCH_TIMEOUT_MS = 8000;

/**
 * Online fetching is on when explicitly enabled, and auto-on in production once
 * a Vercel Blob store is attached (so a permanent cache exists). Set
 * IMAGE_FETCH_ENABLED=false to force it off regardless.
 */
export function fetchEnabled(): boolean {
  const v = String(process.env.IMAGE_FETCH_ENABLED ?? "").toLowerCase();
  if (v === "true") return true;
  if (v === "false") return false;
  return blobConfigured();
}

// license acceptance ------------------------------------------------------

const ALLOWED_LICENSE_PATTERNS = [
  /^cc0/i,
  /^cc[-\s]?by(?:[-\s]?sa)?/i,
  /public\s*domain/i,
  /^pdm/i,
  /^pd\b/i,
];

const DENY_TITLE_PATTERNS = [/\bmap\b/i, /\bflag\b/i, /logo/i, /seal/i, /coat[- ]of[- ]arms/i, /watermark/i, /stamp/i];
const PREFER_TITLE_PATTERNS = [/diagram/i, /scheme/i, /structure/i, /labell?ed/i, /cross[- ]section/i, /anatomy/i, /\.svg$/i];

export function isAllowedLicense(license: string | undefined | null): boolean {
  if (!license) return false;
  const s = license.trim().toLowerCase();
  // Reject non-commercial / no-derivatives variants outright.
  if (s.includes("-nc") || s.includes("-nd") || s.includes("noncommercial") || s.includes("no deriv")) {
    return false;
  }
  return ALLOWED_LICENSE_PATTERNS.some((re) => re.test(s));
}

/** Build a focused search query for a concept. */
export function buildQuery(concept: string): string {
  const base = concept.replace(/[-_]/g, " ").trim();
  return /diagram|structure|cycle|map/i.test(base) ? base : `${base} diagram`;
}

function scoreTitle(title: string): number {
  let s = 0;
  for (const re of PREFER_TITLE_PATTERNS) if (re.test(title)) s += 2;
  for (const re of DENY_TITLE_PATTERNS) if (re.test(title)) s -= 5;
  return s;
}

export interface Fetched {
  buf: Buffer;
  meta: CacheMeta;
}

async function getJson(url: string): Promise<any | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { "User-Agent": "RealPathshalaAI/1.0 (educational notes; contact via app)" },
    });
    clearTimeout(t);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function getBuffer(url: string): Promise<Buffer | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { "User-Agent": "RealPathshalaAI/1.0 (educational notes; contact via app)" },
    });
    clearTimeout(t);
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  }
}

// Wikimedia Commons -------------------------------------------------------

export async function fetchFromWikimedia(concept: string): Promise<Fetched | null> {
  const q = encodeURIComponent(buildQuery(concept));
  const api =
    `https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*` +
    `&generator=search&gsrsearch=${q}&gsrnamespace=6&gsrlimit=10` +
    `&prop=imageinfo&iiprop=url|mime|size|extmetadata&iiurlwidth=${THUMB_WIDTH}`;
  const json = await getJson(api);
  const pages: any[] = json?.query?.pages ? Object.values(json.query.pages) : [];
  const candidates = pages
    .map((p) => {
      const ii = p?.imageinfo?.[0];
      if (!ii) return null;
      const em = ii.extmetadata ?? {};
      const license = em.LicenseShortName?.value || em.License?.value || "";
      return {
        title: String(p.title ?? ""),
        thumburl: ii.thumburl as string | undefined,
        width: Number(ii.thumbwidth ?? ii.width ?? 0),
        mime: String(ii.thumbmime || ii.mime || ""),
        license,
        descUrl: ii.descriptionurl as string | undefined,
      };
    })
    .filter((c): c is NonNullable<typeof c> => !!c && !!c.thumburl && isAllowedLicense(c.license))
    .sort((a, b) => scoreTitle(b.title) - scoreTitle(a.title));

  for (const c of candidates) {
    if (scoreTitle(c.title) < 0) continue;
    const buf = await getBuffer(c.thumburl!);
    if (!buf) continue;
    const v = validateImage(buf, { minWidth: MIN_WIDTH });
    if (!v.ok) continue;
    return {
      buf,
      meta: {
        source: "Wikimedia Commons",
        license: c.license,
        sourceUrl: c.descUrl || c.thumburl!,
        width: v.size!.width,
        height: v.size!.height,
        mime: v.size!.mime,
        fetchedAt: new Date().toISOString(),
      },
    };
  }
  return null;
}

// Openverse ---------------------------------------------------------------

export async function fetchFromOpenverse(concept: string): Promise<Fetched | null> {
  const q = encodeURIComponent(buildQuery(concept));
  const api = `https://api.openverse.org/v1/images/?q=${q}&license=cc0,pdm,by,by-sa&size=large&per_page=8`;
  const json = await getJson(api);
  const results: any[] = json?.results ?? [];
  for (const r of results) {
    const url = r?.url as string | undefined;
    if (!url) continue;
    if (!isAllowedLicense(r.license)) continue;
    if (DENY_TITLE_PATTERNS.some((re) => re.test(String(r.title ?? "")))) continue;
    const buf = await getBuffer(url);
    if (!buf) continue;
    const v = validateImage(buf, { minWidth: MIN_WIDTH });
    if (!v.ok) continue;
    return {
      buf,
      meta: {
        source: "Openverse",
        license: String(r.license || ""),
        sourceUrl: String(r.foreign_landing_url || url),
        width: v.size!.width,
        height: v.size!.height,
        mime: v.size!.mime,
        fetchedAt: new Date().toISOString(),
      },
    };
  }
  return null;
}

/** Fetch a fresh image for an explicit query (bypasses cache & flag). Used by
 * the teacher "Search / replace" action. */
export async function fetchImageForQuery(query: string): Promise<Fetched | null> {
  return (await fetchFromWikimedia(query)) || (await fetchFromOpenverse(query));
}

/**
 * Resolve an image for a concept: cache first (permanent), then — only if the
 * feature flag is on — the online sources, caching any success for reuse.
 * Returns null if nothing suitable is found (caller falls back to vectors).
 */
export async function acquireImage(
  id: string,
  concept: string,
  opts: { allowFetch?: boolean; scope?: string } = {},
): Promise<CachedImage | null> {
  // 1. Per-project override (teacher Replace/Search/Regenerate for this project).
  if (opts.scope) {
    const scoped = await readImageCache(id, opts.scope);
    if (scoped) return scoped;
  }
  // 2. Global cache — admin uploads or a previously fetched image (shared).
  const cached = await readImageCache(id);
  if (cached) return cached;
  // 3. Fetch (only when allowed and the flag is on); cache globally for reuse.
  if (opts.allowFetch === false || !(await imageFetchEnabled())) return null;

  //   3a. Real licensed images first (Wikimedia → Openverse).
  //   3b. Fallback: generate an AI illustration (OpenAI Images / Imagen).
  const result =
    (await fetchFromWikimedia(concept)) ||
    (await fetchFromOpenverse(concept)) ||
    (await generateImage(concept));
  if (!result) return null;

  await writeImageCache(id, result.buf, result.meta);
  return { buf: result.buf, mime: result.meta.mime, meta: result.meta };
}

export { imageSize };
