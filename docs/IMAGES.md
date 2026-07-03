# Diagrams & the hybrid image system

Every generated PDF automatically illustrates its concepts, coaching‑note
style. Images are resolved per section in this priority order:

1. **AI‑tagged diagram** — Gemini may return `diagramId` for a section.
2. **Semantic match** — otherwise the section text is matched to a concept
   (`matchConcept` in `diagramRegistry.ts`). Synonyms are handled: *heart*,
   *human heart* and *circulatory system* all resolve to `human-heart`.
3. **Built‑in vector library** — if the concept has a hand‑drawn vector
   (`src/lib/generators/diagrams.ts`), it is drawn (print quality, offline).
4. **Drop‑in asset** — a `assets/diagrams/<id>.png` overrides the vector.
5. **Cache → online fetch** — if no local diagram exists and fetching is on:
   check the **Vercel Blob cache**, then the local filesystem cache; on a miss,
   fetch a public‑domain / CC0 / CC BY educational image from Wikimedia Commons
   then Openverse, validate it, **store it in the cache**, and reuse it forever.
6. **Text‑only** — if nothing suitable is found, the section renders without a
   figure. The export never fails because of images.

Full priority: **local vector → per‑project override → Vercel Blob cache →
filesystem cache → Wikimedia Commons → Openverse → AI generation
(OpenAI Images / Imagen, if configured) → text‑only**.

### Generative AI fallback (optional)

When no real licensed image is found, an educational illustration can be
generated and cached. Configure with `IMAGE_GEN_PROVIDER`:

| Value | Uses |
| --- | --- |
| `openai` | OpenAI Images (`OPENAI_API_KEY`, `OPENAI_IMAGE_MODEL`) |
| `imagen` | Google Imagen via `GEMINI_API_KEY` (`IMAGEN_MODEL`) |
| `auto` | OpenAI if its key is set, else Imagen |
| _(empty)_ | disabled |

Generated images are labeled `AI generated (provider)` in their cache metadata.
Note: generative figures can be scientifically imprecise, so the built‑in
vector library and real licensed images always take precedence.

## Feature flag & offline behaviour

| Env var | Meaning |
| --- | --- |
| `IMAGE_FETCH_ENABLED` | `true` to force online fetching on, `false` to force off. If unset, it is **auto‑on when a Vercel Blob store is attached** (`BLOB_READ_WRITE_TOKEN` present), else off. |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob token (auto‑provisioned by the Blob integration). Enables the permanent production cache. |
| `IMAGE_CACHE_DIR` | Filesystem cache location (default `assets/diagrams/cache`), used when Blob isn't configured. |

With fetching **off** (or no internet) the system uses only the offline vector
library and any previously cached images — it always works.

## Sources & licensing

Online fetching uses **Wikimedia Commons** and **Openverse**, restricted to
**public‑domain, CC0, CC BY and CC BY‑SA** only (NC/ND variants are rejected).
Each fetch requests a rendered raster thumbnail ≥ 1200 px, so SVG diagrams come
back as embeddable PNG at print resolution. Provenance (source, license, URL)
is stored alongside each cached image in a `.json` sidecar. **Never** add
copyrighted textbook scans.

## Quality validation

`imageQuality.ts` enforces: recognised raster format (PNG/JPEG), **width ≥
1200 px**, sane byte size. SVG is rejected for direct embedding (request a
raster thumbnail instead). Watermark/"educational only" detection is heuristic
(title/category filtering + the `… diagram` query) — not guaranteed.

## Caching

Two‑tier, in `imageCache.ts`:

- **Vercel Blob** (production): when `BLOB_READ_WRITE_TOKEN` is present, images
  and their license/provenance sidecar are stored under the `diagrams/` prefix
  in your Blob store — **durable and shared across all serverless invocations**,
  so each concept is fetched at most once, ever.
- **Filesystem** (`IMAGE_CACHE_DIR`, default `assets/diagrams/cache`): used for
  local/dev and persistent servers, and as the fallback when Blob isn't set.

### Setup (Vercel Blob)

1. **Vercel → Storage → Create → Blob**, connect it to the project → Vercel
   sets `BLOB_READ_WRITE_TOKEN` automatically.
2. Redeploy. Fetching auto‑enables and the permanent cache is active.
3. (Optional) set `IMAGE_FETCH_ENABLED=false` any time to force fully offline.

Every cached image keeps a `.json` sidecar with `source`, `license`,
`sourceUrl`, dimensions and `fetchedAt` for attribution/audit.

## Adding diagrams (no code / code)

- **No code:** drop `assets/diagrams/<id>.png` (transparent, ≥1200 px, PD/CC
  only). It is embedded automatically when that concept is detected.
- **New vector:** add a `Draw` function to `CATALOG` in `diagrams.ts`.
- **New concept for fetching:** add an entry to `EXTRA_CONCEPTS` in
  `diagramRegistry.ts` with synonyms and a search `query`.

> Coverage note: the built‑in vector set covers high‑frequency CBSE figures;
> the concept dictionary + online fetch extends coverage across the syllabus
> without hand‑drawing thousands of diagrams.
