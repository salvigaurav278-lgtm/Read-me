// Generic JSON config store (editable at runtime without code changes).
// Vercel Blob in production (config/ prefix), local filesystem otherwise.
// Used for chapter→concept mapping overrides and feature flags.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { list, put } from "@vercel/blob";
import { blobConfigured } from "@/lib/generators/imageCache";

const PREFIX = "config/";

function fsDir(): string {
  return process.env.CONFIG_DIR || join(process.cwd(), "assets", "config");
}

export async function readJson<T>(key: string): Promise<T | null> {
  if (blobConfigured()) {
    try {
      const { blobs } = await list({ prefix: `${PREFIX}${key}.json`, limit: 10 });
      const b = blobs.find((x) => x.pathname === `${PREFIX}${key}.json`) ?? blobs[0];
      if (b) {
        const res = await fetch(b.url, { cache: "no-store" });
        if (res.ok) return (await res.json()) as T;
      }
    } catch {
      /* ignore, fall through */
    }
  }
  try {
    const p = join(fsDir(), `${key}.json`);
    if (existsSync(p)) return JSON.parse(readFileSync(p, "utf8")) as T;
  } catch {
    /* ignore */
  }
  return null;
}

export async function writeJson(key: string, obj: unknown): Promise<boolean> {
  if (blobConfigured()) {
    try {
      await put(`${PREFIX}${key}.json`, JSON.stringify(obj), {
        access: "public",
        contentType: "application/json",
        addRandomSuffix: false,
        allowOverwrite: true,
      });
      return true;
    } catch {
      /* fall through to fs */
    }
  }
  try {
    const dir = fsDir();
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, `${key}.json`), JSON.stringify(obj, null, 2));
    return true;
  } catch {
    return false;
  }
}
