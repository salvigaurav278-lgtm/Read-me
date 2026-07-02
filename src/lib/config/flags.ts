// Runtime feature flags (editable from the admin dashboard, no redeploy).
// Currently: the image-fetch toggle, layered over env defaults.

import { readJson, writeJson } from "./configStore";

interface Flags {
  imageFetch?: boolean | null; // true/false override, or null/undefined = use env
}

const KEY = "flags";

export async function getFlags(): Promise<Flags> {
  return (await readJson<Flags>(KEY)) ?? {};
}

/** Env-derived default for image fetching. */
export function imageFetchFromEnv(): boolean {
  const v = String(process.env.IMAGE_FETCH_ENABLED ?? "").toLowerCase();
  if (v === "true") return true;
  if (v === "false") return false;
  return !!process.env.BLOB_READ_WRITE_TOKEN;
}

/** Effective image-fetch state: dashboard override wins, else env. */
export async function imageFetchEnabled(): Promise<boolean> {
  const f = await getFlags();
  if (typeof f.imageFetch === "boolean") return f.imageFetch;
  return imageFetchFromEnv();
}

/** Set (or clear with null) the image-fetch override. */
export async function setImageFetch(value: boolean | null): Promise<void> {
  const f = await getFlags();
  f.imageFetch = value;
  await writeJson(KEY, f);
}
