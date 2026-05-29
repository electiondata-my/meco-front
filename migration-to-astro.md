# ElectionData.MY — Next.js → Astro Migration Plan

> **Purpose:** Forensic audit + itemised checklist for migrating electiondata.my from Next.js 15 (Pages Router) to Astro. Every item is actionable: pick it up, execute, verify done. No ambiguity.
>
> **Working branch:** `refactor/astro` (reset to mirror `main` as of 2026-05-16)

---

## Context

electiondata.my is a public Malaysian election data platform. The vast majority of pages are content + static data display fetched at build time from a JSON/S3 API (`static.electiondata.my`). The current Next.js setup ships a full React bundle to every visitor even for pages that have zero interactivity, hurting load time and requiring expensive Vercel hosting. Astro's static-first, island architecture generates pure HTML by default and adds JavaScript only at the component level where strictly necessary.

---

## Non-Negotiable Constraints

- Every page is statically generated at build time (`output: 'static'`). SSR is forbidden.
- Client islands use either `client:only="react"` or `client:load` — **these are not interchangeable**. The rule:
  - **`client:load`** — default for any React component whose browser API usage is confined to `useEffect`. Astro SSRs the component to HTML at build time (content is in the static HTML, crawlable by Google) and hydrates it client-side. Use this for interactive data tables, dashboards with tabs/filters, and anything where content SEO matters.
  - **`client:only="react"`** — use only when a component calls browser APIs at module or render scope (not inside `useEffect`), making SSR impossible: Leaflet, Mapbox GL, DuckDB WASM, Cloudflare Turnstile. `client:only` skips SSR entirely — **the component's rendered content is absent from static HTML and is invisible to search crawlers.**
  - A `useEffect`-wrapped `window` or `document` call is safe for `client:load`. Only render-scope browser calls require `client:only`.
- All data fetching happens in Astro frontmatter `---` blocks (build-time `fetch()`). No runtime data fetch on static pages.
- The migrated site must have 100% production parity: identical UI, identical features, nothing dropped.

## Data Strategy (Critical for Build Performance)

Static output means **every page renders independently at build time**. Any `fetch()` inside a component (not in `getStaticPaths`) runs once per page, not once per build. With 14,595 candidate pages, a single `fetchJSON` call inside the component body multiplies into 14,595 HTTP requests — each adding ~70–90ms of network latency.

**The rule: `getStaticPaths` fetches once, components fetch never.**

All data that a page needs must be fetched in `getStaticPaths` and distributed as `props`. Components receive `props` only — no `fetchJSON` calls in component bodies.

This applies to two categories:
1. **Page data** (`candidates/all.json`, `parties/all.json`, etc.) — request a bundled "all" file from the backend if individual-per-slug files exist.
2. **i18n translations** — fetch all required namespace files once in `getStaticPaths`, pass as a `translations` prop.

**Critical trap — `Layout` fetches i18n on every page render:**
`src/components/Layout/index.astro` calls `getTranslations(locale, ["common"])` in its frontmatter. Because Layout is included by every page, and because Astro renders each page independently, this call executes once per page — not once per build. With 14,595 candidate pages × 2 locales, that alone produces 29,190 HTTP round-trips to the i18n server during the render phase, on top of what `getStaticPaths` already fetches.

The fix is a module-level cache in both `src/i18n/index.ts` and `src/lib/api.ts`. Since Astro SSG builds run in a single Node.js process, a `Map` at module scope persists for the entire build — each `locale:namespace` key (e.g. `en-GB:common`) is fetched exactly once regardless of how many pages use it. See Phase 1.1 and 1.2 for the cached implementations.

**Build time targets (candidates as the benchmark — 14,595 × 2 locales = 29,190 pages):**

| Strategy | Fetches | Est. build time |
|---|---|---|
| Naive (no cache) | ~29,190 data + ~58,380 i18n | ~20–40 min |
| `all.json` only | 2 data + ~58,380 i18n | ~12–15 min |
| `all.json` + i18n cache | ~6 total | **~1–2 min** |

**When to escalate:** If implementing a page requires fetching a file that only exists in per-slug form (no bundled "all" file), **stop and ask the user** before proceeding. The backend can produce a bundled file in ~10 minutes; a naive implementation produces a build that takes 20+ minutes to run. Always prefer requesting the data shape change over accepting a slow build.

---

## Resolved Architecture Decisions

All open decisions have been resolved prior to migration. No ambiguity remains.

### Decision #1 — URL Structure
**Resolved: `prefixDefaultLocale: false`**

- English pages at `/`, `/about`, `/seats/...` etc. (no prefix)
- Malay pages at `/ms-MY/`, `/ms-MY/about`, etc.
- Directory structure: `src/pages/index.astro`, `src/pages/ms-MY/index.astro`
- Root `index.astro` serves English content directly — no redirect needed

### Decision #2 — Surgical Page Rebuilds (replaces `/api/revalidate`)

**Resolved: `POST_TO_BUILD` env var + Cloudflare Pages Direct Upload**

Astro has no native per-page rebuild. The solution is filtering `getStaticPaths()` at build time using an environment variable, then deploying only the rebuilt files via Wrangler direct upload. Cloudflare deduplicates assets by hash so only changed files are transferred.

**Full pipeline:**
1. Backend data changes (e.g. candidate `P096-john-doe` updated)
2. Backend calls webhook: `{ "pages": ["candidates/P096-john-doe"] }`
3. GitHub Actions triggered with `POST_TO_BUILD=P096-john-doe`
4. `getStaticPaths()` filters to only that slug → Astro builds only those pages
5. `wrangler pages deploy dist/ --project-name=electiondata-my` — CF deduplicates, uploads only new files
6. Live in ~30 seconds

**Implementation pattern** (applied to every dynamic route):
```ts
// src/pages/candidates/[...slug].astro
export async function getStaticPaths() {
  const candidates = await fetchJSON('/candidates/dropdown.json');
  const filter = import.meta.env.POST_TO_BUILD;

  return candidates
    .filter(c => !filter || c.slug === filter)
    .map(c => ({ params: { slug: c.slug }, props: { candidate: c } }));
}
```

**CI workflow** (`.github/workflows/rebuild-page.yml`):
```yaml
on:
  repository_dispatch:
    types: [rebuild-page]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pnpm install
      - run: pnpm build
        env:
          POST_TO_BUILD: ${{ github.event.client_payload.page }}
      - run: npx wrangler pages deploy dist/ --project-name=electiondata-my
        env:
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CF_ACCOUNT_ID }}
          CLOUDFLARE_API_TOKEN: ${{ secrets.CF_API_TOKEN }}
```

For full site rebuilds (no `POST_TO_BUILD` set), all pages are generated as normal.

### Decision #3 — Redelineation URL Structure

**Resolved: single-level `[area-year]` slug with query params**

- Static paths: `/redelineation/peninsular-2018`, `/redelineation/sabah-2023`, etc. (one segment, enumerated from `redelineation/filter.json`)
- No content at `/redelineation` alone — index redirects to default
- Level and seat selection via query params: `?level=parlimen&seat=p001-padang-besar-perlis`
- Query params are read by the React island on mount; `history.pushState` updates the URL so state is shareable/deep-linkable
- The React island handles all toggling — no additional static paths needed

### Decision #4 — `/api/embed`

**Resolved: deleted, no replacement**

The endpoint is not currently in use. If embed functionality is needed in future it will be built from scratch.

---

## Current Stack Summary

| Layer | Current | Target |
|---|---|---|
| Framework | Next.js 15.5 (Pages Router) | Astro 6.x (upgraded from planned 5.x — see Phase 2 deviation note) |
| Rendering | Mostly ISR (`fallback:"blocking"`) | All static (`getStaticPaths` exhaustive) |
| React | React 19, all components are React | React kept only for islands |
| i18n | `next-i18next` + HTTP backend | Build-time fetch + custom `t()` helper |
| MDX | `next-mdx-remote` | `@astrojs/mdx` (native) |
| Styling | Tailwind 3 + `@govtechmy/myds-style` | Identical (no changes needed) |
| PWA | `next-pwa` | `@vite-pwa/astro` |
| Hosting | Vercel (serverless) | Cloudflare Pages (static) |

---

## Migration Sequence

> **How to work through this:** Complete each phase fully before starting the next. After each page/component, verify against production parity criteria before marking done. Errors found early stay cheap.

```
Phase 0 — Project scaffold & infrastructure
Phase 1 — Global layout & i18n system
Phase 2 — Simple static pages (lowest risk, validate the system)
Phase 3 — MDX pages
Phase 4 — Static data pages (small known path sets)
Phase 5 — Pages previously assumed to need React islands (now static or minimal JS)
Phase 6 — Data Catalogue (largest path set)
Phase 7 — Mapbox-heavy pages
Phase 8 — Auth pages
Phase 9 — Query Builder (DuckDB WASM — most technically isolated)
Phase 10 — PWA, sitemap, deploy pipeline
Phase 11 — Full parity audit
```

---

## Phase 0 — Project Scaffold

### 0.1 — Astro project init

- [x] Init Astro in `meco-front` repo root on `refactor/astro`:
  ```bash
  pnpm create astro@latest . --template minimal --typescript strict --install
  ```
- [x] Replace `package.json` scripts:
  ```json
  {
    "dev": "astro dev",
    "build": "astro build",
    "start": "astro preview",
    "postbuild": "node scripts/compress-sitemaps.mjs"
  }
  ```
- [x] Delete: `next.config.js`, `next-i18next.config.js`, `next-sitemap.config.js`, `pages/`, `middleware.ts` (will be rewritten)

### 0.2 — Install integrations

```bash
pnpm add @astrojs/react @astrojs/mdx @astrojs/sitemap @astrojs/tailwind @vite-pwa/astro
```

### 0.3 — `astro.config.mjs`

```js
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import mdx from '@astrojs/mdx';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';
import { AstroPWA } from '@vite-pwa/astro';

export default defineConfig({
  output: 'static',
  site: 'https://electiondata.my',
  integrations: [react(), mdx(), tailwind(), sitemap(), AstroPWA({})],
  i18n: {
    defaultLocale: 'en-GB',
    locales: ['en-GB', 'ms-MY'],
    routing: { prefixDefaultLocale: false }, // English at /, Malay at /ms-MY/
  },
  vite: {
    ssr: {
      noExternal: ['@govtechmy/myds-react', 'mapbox-gl', 'react-map-gl'],
    },
    optimizeDeps: {
      exclude: ['@duckdb/duckdb-wasm'], // Prevents Vite worker resolution error
    },
  },
});
```

### 0.4 — Directory structure

```
src/
  pages/
    index.astro               # English home (no prefix)
    about.astro
    research.astro
    signin.astro
    console.astro
    query-builder.astro
    404.astro
    byelections/index.astro
    candidates/[...slug].astro
    data-catalogue/
      index.astro
      [id].astro
    elections/[...election].astro
    seats/[...seat].astro
    parties/[...party].astro
    trivia/[...state].astro
    redelineation/[area-year].astro
    map/explorer/index.astro
    openapi/
      index.astro
      [...slug].astro
    ms-MY/                    # Malay equivalents mirror the above
      index.astro
      about.astro
      ...
    api/                      # Empty — /api/embed deleted, /api/revalidate deleted
  components/
  layouts/
  lib/
  i18n/
  content/
    openapi/
    articles/
```

### 0.5 — `tsconfig.json`

- [x] Keep existing path aliases (`@components/*`, `@lib/*`, etc.)
- [x] Set `baseUrl` to `src/`

### 0.6 — Environment variables

Rename all `NEXT_PUBLIC_*` → `PUBLIC_*` across the codebase. Update all references from `process.env.NEXT_PUBLIC_*` → `import.meta.env.PUBLIC_*`.

| Old | New |
|---|---|
| `NEXT_PUBLIC_APP_URL` | `PUBLIC_APP_URL` |
| `NEXT_PUBLIC_APP_ENV` | `PUBLIC_APP_ENV` |
| `NEXT_PUBLIC_API_URL_TB` | `PUBLIC_API_URL_TB` |
| `NEXT_PUBLIC_API_TOKEN_TB` | `PUBLIC_API_TOKEN_TB` |
| `NEXT_PUBLIC_API_URL_S3` | `PUBLIC_API_URL_S3` |
| `NEXT_PUBLIC_I18N_URL` | `PUBLIC_I18N_URL` |
| `NEXT_PUBLIC_TINYBIRD_TOKEN` | `PUBLIC_TINYBIRD_TOKEN` |
| `NEXT_PUBLIC_TINYBIRD_TOKEN_READ` | `PUBLIC_TINYBIRD_TOKEN_READ` |
| `NEXT_PUBLIC_MAPBOX_ACCOUNT` | `PUBLIC_MAPBOX_ACCOUNT` |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | `PUBLIC_MAPBOX_TOKEN` |
| `NEXT_PUBLIC_AUTH_URL` | `PUBLIC_AUTH_URL` |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | `PUBLIC_TURNSTILE_SITE_KEY` |
| `REVALIDATE_TOKEN` | **DELETE** — no ISR in Astro |
| `EDGE_CONFIG` | **DELETE** — Vercel-specific |
| `AUTH_TOKEN` | Keep (middleware basic auth) |
| `PROTECT_DEPLOYMENT` | Keep (middleware) |
| `APP_URL`, `APP_ENV` | Keep (server-side only) |

### 0.7 — GitHub Actions workflows

- [x] **Full rebuild** (`.github/workflows/deploy.yml`): triggered on push to `main`, no `POST_TO_BUILD` set, builds all pages
- [x] **Surgical rebuild** (`.github/workflows/rebuild-page.yml`): triggered by `repository_dispatch`, sets `POST_TO_BUILD` from payload, builds and deploys only affected pages (see Decision #2 above for full implementation)
- [x] Store `CF_ACCOUNT_ID` and `CF_API_TOKEN` in GitHub secrets

**Verify Phase 0:**
- [x] `pnpm dev` starts without errors
- [x] `pnpm build` completes (even with empty `src/pages/`)
- [x] Wrangler can authenticate and deploy to Cloudflare Pages

---

## Phase 1 — Global Layout & Infrastructure

### 1.1 — API layer (`src/lib/api.ts`)

Replace Axios-based `get()` with native `fetch()` for build-time calls. Include a module-level cache so each URL is fetched at most once per build (eliminates duplicate fetches when EN and ms-MY `getStaticPaths` both request the same endpoint):

```ts
const BASE_S3 = import.meta.env.PUBLIC_API_URL_S3;

// Build-time cache: keyed by full URL. Safe because Astro SSG is single-process.
const _cache = new Map<string, unknown>();

export async function fetchJSON<T>(path: string, base = BASE_S3): Promise<T> {
  const url = `${base}${path}`;
  if (_cache.has(url)) return _cache.get(url) as T;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetch failed: ${path} (${res.status})`);
  const data = await res.json() as T;
  _cache.set(url, data);
  return data;
}
```

- [x] Keep Axios only inside React islands that need it (API console, stream calls)
- [x] Remove Axios from all build-time / frontmatter code

### 1.2 — i18n system (`src/i18n/index.ts`)

Include a module-level cache. `Layout/index.astro` calls `getTranslations` in its frontmatter, which runs once per page render — without caching this produces one HTTP request per page per namespace (see Data Strategy for the full explanation):

```ts
const BASE_I18N = import.meta.env.PUBLIC_I18N_URL;

// Build-time cache: keyed by "locale:namespace". Safe because Astro SSG is single-process.
const _cache = new Map<string, Record<string, any>>();

async function fetchNs(locale: string, ns: string): Promise<Record<string, any>> {
  const key = `${locale}:${ns}`;
  if (_cache.has(key)) return _cache.get(key)!;
  try {
    const data = await fetch(`${BASE_I18N}/${locale}/${ns}.json`).then(r => r.json());
    _cache.set(key, data);
    return data;
  } catch {
    _cache.set(key, {});
    return {};
  }
}

export async function getTranslations(locale: string, namespaces: string[]) {
  const results = await Promise.all(namespaces.map(ns => fetchNs(locale, ns)));
  return Object.fromEntries(namespaces.map((ns, i) => [ns, results[i]]));
}

export function t(
  translations: Record<string, any>,
  key: string,
  vars?: Record<string, string>
): string {
  const val = key.split('.').reduce((o, k) => o?.[k], translations) ?? key;
  return vars
    ? String(val).replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? _)
    : String(val);
}
```

- [x] Translations are fetched in Astro frontmatter only — never in the browser
- [x] React islands receive pre-translated strings as props from the `.astro` parent
- [x] Remove `next-i18next`, `i18next`, `react-i18next` from dependencies
- [x] **Cache required:** `Layout` calls `getTranslations` on every page — without the cache, each of ~30k page renders makes an individual HTTP request to the i18n server

### 1.3 — `src/layouts/BaseLayout.astro`

Replaces `_app.tsx` + `_document.tsx`.

- [x] `<html lang={locale}>` driven by `Astro.currentLocale`
- [x] **Theme script** — runs before paint, defaults to system preference, respects stored preference:
  ```html
  <script is:inline>
    const stored = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const dark = stored ? stored === 'dark' : prefersDark;
    document.documentElement.classList.toggle('dark', dark);
  </script>
  ```
- [x] Fonts loaded via `<link>` preconnect + Google Fonts (remove `next/font`)
- [x] Body `class` from current `_app.tsx` (`inter poppins-variable box-border ...`) moved to `<body>` tag
- [x] Tinybird Flock.js: `<script src="https://unpkg.com/@tinybirdco/flock.js" async defer is:inline />`
- [x] Leaflet CSS: loaded conditionally via `needsLeaflet` prop
- [x] PWA meta tags, apple touch icons (copied from `_document.tsx`)
- [x] `<AutoToast client:load />` from `@govtechmy/myds-react`
- [x] Remove `next-themes` — replaced by inline script above

**Parity criteria:**
- [x] `class="dark"` applied before first paint — no flash of wrong theme
- [x] Defaults to system preference when no stored preference exists
- [x] Stored preference overrides system on return visits
- [x] `lang` attribute matches current locale
- [x] Tinybird script fires on every page load
- [x] Fonts render identically (Inter body, Poppins headings)

### 1.4 — `src/components/Layout/index.astro`

Replaces `components/Layout/index.tsx`. Shell with Header + Footer via slots.

- [x] **Header** — static `.astro` except:
  - `ThemeToggle` → `<ThemeToggle client:load />` (reads `localStorage`, toggles `class="dark"` on `<html>`, dispatches custom event)
  - `LocaleSwitch` → `<LocaleSwitch client:load />` (reads `Astro.currentLocale` as prop, navigates via `window.location`)
- [x] **Footer** — pure `.astro`, static links only (remove any `window.location` usage)

### 1.5 — Middleware (`src/middleware.ts`)

- [x] Redirect `ms-MY/{signin,console,query-builder,openapi,map}` → `/{same path}` (English-only pages)
- [x] Proxy `/api/auth/*` → `https://auth.electiondata.my/*` (replaces `next.config.js` rewrite)
- [x] Optional basic auth when `PROTECT_DEPLOYMENT=true`

**Verify Phase 1:**
- [x] `pnpm dev` — BaseLayout renders with correct lang, fonts, theme script
- [x] Dark/light mode toggle works, survives page reload, defaults to system preference
- [x] Header and footer render correctly in both locales
- [x] Middleware redirects work for English-only pages
- [x] Auth proxy passes requests through correctly

---

## Phase 2 — Simple Static Pages ✅ COMPLETE

> These pages have no dynamic routes and minimal interactivity. They validate that the layout system, i18n, and Tailwind are working before touching anything complex.

**Accepted deviations (signed off 2026-05-18):**

> **Deviation 2A — Dual 404 pages:** Astro static output requires two 404 pages: `src/pages/404.astro` (generates `404.html` for Cloudflare Pages CDN-level 404) and `src/pages/[...404].astro` (catch-all for in-app unmatched navigation). Single-file 404 is insufficient for a static site with client-side navigation. Both files are required and correct.

> **Deviation 2B — Astro 6 content API:** Astro 6.x (installed) uses a `glob()` loader and `render(entry)` imported from `astro:content`, not the Astro 5.x `entry.render()` method. The plan was written against Astro 5.x. Astro 6 is the mandatory runtime version; all content collection usage across Phases 2–3 reflects the Astro 6 API. `src/content.config.ts` uses `defineCollection` with `loader: glob({...})`.

### 2.1 — 404 Page

| | |
|---|---|
| **Current** | `pages/404.tsx` |
| **Target** | `src/pages/404.astro` |

- [x] Pure `.astro`, static content
- [x] Translations from `error` namespace
- [x] Uses `BaseLayout.astro`
- [x] **Deviation 2A:** dual 404 (`404.astro` + `[...404].astro`) implemented and accepted

**Parity criteria:**
- [x] "Page not found" message renders in correct locale
- [x] Navigation link back to home works
- [x] Astro serves this automatically for unmatched routes

### 2.2 — Research (`/research`)

| | |
|---|---|
| **Current** | `pages/research.tsx` — hardcoded `papers` array in `getStaticProps` |
| **Target** | `src/pages/research.astro` + `src/pages/ms-MY/research.astro` |

- [x] Move hardcoded papers array to `src/data/papers.ts` constant
- [x] `ResearchDashboard` (React) — cards with static links → rewrite as `.astro` component, no React island needed
- [x] Translations from `research` namespace

**Parity criteria:**
- [x] All paper cards render with image, title, description, and link
- [x] Both locale URLs render correctly translated labels

### 2.3 — About (`/about`)

| | |
|---|---|
| **Current** | `pages/about.tsx` — reads MDX from `content/articles/about/` via `next-mdx-remote` |
| **Target** | `src/pages/about.astro` + `src/pages/ms-MY/about.astro` |

- [x] Move `content/articles/about/en-GB.mdx` and `ms-MY.mdx` to `src/content/articles/about/`
- [x] Use `@astrojs/mdx` + `getCollection()` — zero client JS — **Deviation 2B:** uses Astro 6 `render(entry)` API
- [x] `Article` wrapper → `.astro` component

**Parity criteria:**
- [x] Article renders with correct locale content
- [x] All inline MDX components (if any) render
- [x] Dark mode typography correct

**Verify Phase 2:**
- [x] All three pages render in both locales without JS errors
- [x] Tailwind classes apply correctly
- [x] Dark mode works on all pages

---

## Phase 3 — MDX / Documentation Pages ✅ COMPLETE

**Implementation note — interactive MDX components:**

> `TabCode`, `TokenInput`, and `CandidatesApiTester` are `client:only="react"` islands. "Zero unnecessary React" does not mean zero React at the cost of losing production features. These three components are production features that require client state; they were correctly ported as islands.
>
> **Architecture:** React Context cannot cross Astro island boundaries. State is shared via `localStorage` + a `openapi-token-change` CustomEvent — the same interface as the original `ApiKeyContext`, adapted for multi-island architecture. Each island reads the token on mount and subscribes to the event for live updates.
>
> **Island wiring:** Components in the MDX `components` prop render server-side by default. Astro wrapper files (`*Island.astro`) containing `client:only="react"` are passed in the `components` override in each page file. `TabCodeIsland.astro` explicitly forwards all six language props (`curl`, `javascript`, `typescript`, `python`, `r`, `go`) from `Astro.props` to the React island.

### 3.1 — OpenAPI Introduction (`/openapi`)

| | |
|---|---|
| **Current** | `pages/openapi.tsx` — reads `content/openapi/introduction.mdx` via `next-mdx-remote` |
| **Target** | `src/pages/openapi/index.astro` (English only) |

- [x] Move `content/openapi/` to `src/content/openapi/` as Astro 6 content collection with `glob()` loader
- [x] MDX custom components rewritten in `src/components/OpenApi/mdxComponents.tsx` — rendered server-side via `<Content components={mdxComponents} />`. **Deviation 3A:** interactive components are static HTML.
- [x] `DocLayout` wrapper → `src/components/OpenApi/DocLayout.astro`
- [x] `src/lib/docs.ts` — `extractToc()` and `slugify()` (Astro-compatible, no Node `fs`)
- [x] `extractToc()` runs in frontmatter from `entry.body`
- [x] Redirect: `src/pages/openapi/introduction.astro` → 301 to `/openapi`
- [x] Middleware redirects `ms-MY/openapi/*` → `/openapi/*` (already in `ENGLISH_ONLY_PATHS`)
- [x] `DocSidebar` and `DocTOC` React islands (`client:load`) — sidebar `mobileOpen` state managed inside the island; mobile trigger dispatches `open-doc-sidebar` CustomEvent from Astro template
- [x] hljs syntax highlighting at build time in `DocCodeBlock.tsx`; dark mode via `html.dark .hljs` CSS overrides in `DocLayout.astro`
- [x] Heading IDs patched by synchronous `<script is:inline>` in `DocLayout.astro` using `el.textContent` — Astro JSX text nodes use `props.value` not `props.children`, making `React.Children` APIs return empty in SSR context

**Parity criteria:**
- [x] Introduction page renders with all MDX components (code blocks, callouts, coloured lists)
- [x] Table of contents renders from `extractToc()` output
- [x] Breadcrumb renders
- [x] API stats (`total_hits`, `total_users`) fetched from Tinybird at build time and displayed

### 3.2 — OpenAPI Docs (`/openapi/[...slug]`)

| | |
|---|---|
| **Current** | `pages/openapi/[...slug].tsx` — `fallback: false`, all paths from `getAllDocSlugs()` |
| **Target** | `src/pages/openapi/[...slug].astro` |

- [x] `getStaticPaths()` uses `getCollection('openapi')` — replaces `getAllDocSlugs()`
- [x] Each entry rendered via Astro 6 `render(entry)` from `astro:content` — replaces `serialize()`
- [x] `extractToc()` runs in frontmatter
- [x] English only
- [x] `currentPath` computed as `/openapi/${entry.id}` — handles nested slugs (e.g. `endpoints/candidates` → `/openapi/endpoints/candidates`)

**Content files migrated** to `src/content/openapi/`:
- `introduction.mdx`, `authentication.mdx`, `errors.mdx`, `versioning.mdx`
- `endpoints/candidates.mdx`
- One fix to `candidates.mdx`: JSX fragment `description: <>...</>` in `EndpointCard` props changed to string literal to avoid "Objects are not valid as a React child" build error

**HTTP status verification (built output):**
- `/openapi` → 200, `/openapi/authentication` → 200, `/openapi/versioning` → 200, `/openapi/errors` → 200, `/openapi/endpoints/candidates` → 200
- `/openapi/introduction` → 301 (meta-refresh in static mode, HTTP 301 in dev mode)
- `/ms-MY/openapi` → 302 (middleware redirect)

**Parity criteria:**
- [x] All MDX doc pages render at correct URLs
- [x] TOC sidebar links work and highlight active section
- [x] Code examples render with syntax highlighting
- [x] Navigation between doc pages works (prev/next from `ALL_PAGES`)
- [x] `POST_TO_BUILD` not applicable here (MDX, not data-driven)

**Verify Phase 3:**
- [x] All OpenAPI pages render without errors
- [x] MDX components (code blocks, callouts, StatusTable, FieldTable, EndpointBadge, EndpointCard, TabCode, GrayList) render correctly
- [x] TOC is correct on multi-section pages
- [x] Islands on candidates page: ThemeToggle×2, LocaleSwitch×2, DocSidebar, DocTOC, AutoToast, TokenInput, TabCode×2, CandidatesApiTester (10 total). Pages without interactive MDX components carry only the 7 layout islands.

---

## Phase 4 — Static Data Pages (Small Known Path Sets) ✅ COMPLETE

### 4.1 — By-Elections (`/byelections`)

| | |
|---|---|
| **Current** | `pages/byelections/index.tsx` → `get('/elections/byelections.json')` |
| **Target** | `src/pages/byelections/index.astro` + `src/pages/ms-MY/byelections/index.astro` |

- [x] Fetch `byelections.json` in frontmatter, sort by date desc in frontmatter
- [x] No `getStaticPaths()` needed — single page
- [x] `POST_TO_BUILD` not applicable (single page, full rebuild handles it)
- [x] Audit `ByElectionsDashboard` — **has interactive sort/filter + on-demand data fetch** → React island required. Mounted as `client:load` (not `client:only`) so seat list is in static HTML for SEO. All browser API calls are inside `useEffect` — SSR-safe.

**Deviation 4A — `ByElectionsDashboard` as React island:**
`ByElectionsDashboard` has state filtering, seat selection, on-demand per-seat result fetching, and a mobile `Drawer`. It cannot be static `.astro`. Implementation: new `src/components/ByElections/ByElectionsDashboard.tsx` receives `seats` (276 entries, sorted desc at build time), `translations`, `apiBaseUrl`, and `locale` as props from the Astro frontmatter. Replaces: `useTranslation` (Next.js) → prop-based `t()` helper; `useRouter` (Next.js) → `history.replaceState` + `URLSearchParams`; `ImageWithFallback` (uses `next/image`) → `<img>` with `onError`; `StateDropdown` (uses `@headlessui/react` Listbox + `useRouter`) → **custom `StateDropdown` component** (plain `useState` + `mousedown` listener — headlessui v2.2.4 breaks render-prop pattern used in original, causing blank page); `ComboBox` + `ElectionTable` + `FullResultContent` (all use `useTranslation`) → inline implementations. Keeps: `useData`, `useCache`, `BarPerc`, `LeftRightCard`, `Drawer*` (all pure React, no Next.js deps).

**`client:only` → `client:load` correction (SEO):** `ByElectionsDashboard` was initially mounted with `client:only="react"`, which caused its content to be absent from static HTML. All `window`/`document` calls in the component are inside `useEffect` — safe for SSR. Corrected to `client:load` so the seat list renders in static HTML and is indexable. Verified: `window.location.search` (line 161) and `document.addEventListener` (line 409) are both inside `useEffect` blocks.

**Additional implementation notes:**
- Tinybird viewcount (`views_by_page.json`) fetched client-side in `useEffect` inside the island (same pattern as the Next.js `Hero` component). Token read from `import.meta.env.PUBLIC_TINYBIRD_TOKEN`.
- Mobile `DrawerTrigger` must call `selectSeat(_seat)` before opening — original had `e.stopPropagation()` only, causing drawer to show the previously-selected seat's data instead of the tapped seat.
- Candidate results table: desktop uses full 3-column table; mobile uses `compactMobileTable` equivalent — party logo stacked above party label (centered), votes bar stacked above count. Matches production `ElectionTable compactMobileTable` layout.
- Coalition field added to `BallotEntry` type; party label rendered as `"PARTY (COALITION)"` on both mobile and desktop when coalition is present and not `"ALONE"`.
- Deep-link scroll (`?result=` param on load → `scrollIntoView`) retained; click-triggered auto-scroll removed (janky UX).

**Parity criteria:**
- [x] All by-elections listed in reverse chronological order (276 seats, dates verified: 2026-01-24 … descending)
- [x] Seat name, date, winner, margin data rendered for each entry (all fields confirmed in serialized props)
- [x] Both locale URLs work

**Verify Phase 4:**
- [x] Both pages render in both locales without JS errors (`pnpm build` clean, 15 pages)
- [x] Tailwind, dark mode, and layout correct on both
- [x] `ByElectionsDashboard` content present in static HTML — `client:load` SSRs the seat list; layout islands: ThemeToggle×2, LocaleSwitch×2, AutoToast + ByElectionsDashboard (6 total)

---

## Phase 5 — Pages Previously Assumed to Need React Islands

> These pages were flagged as React islands in the original audit. After review, most are static or require only vanilla JS. The key rule: if user interaction is navigation (select → go to URL), it's static. If interaction re-renders data on the same page without a navigation, evaluate vanilla JS first before reaching for React.

### 5.1 — Home (`/`) ✅ COMPLETE

| | |
|---|---|
| **Current** | `pages/index.tsx` → 5 parallel `get()` calls: `/seats/current/dropdown.json`, `/candidates/dropdown.json`, `/parties/dropdown.json`, `/dates.json`, `/latest.json`. `HomeDashboard` uses React with `useState` for dropdowns. |
| **Target** | `src/pages/index.astro` + `src/pages/ms-MY/index.astro` — **fully static, no React island** |

**Accepted deviations:**

> **Deviation 5.1A — Custom combobox instead of native `<select>`:** Production uses a React `ComboBox` with a floating dropdown, fuzzy search, and a red gradient circular search button. A native `<select>` would be a visible regression. Replaced with a vanilla JS combobox: text `<input>` + hidden `<select>` as data store + `<ul>` dropdown list. Reads options from `Array.from(selectEl.options)`. All navigation behaviour identical.

> **Deviation 5.1B — `darkMode: "class"` added to `tailwind.config.ts`:** The file was defaulting to the `"media"` strategy, making `dark:` utilities respond to OS preference rather than the `.dark` class toggled by `ThemeToggle`. Added `darkMode: "class"` as a one-line fix.

> **Deviation 5.1C — Party/Election dropdown enrichment:** Party dropdown shows flag image (`/static/images/parties/` or `/static/images/coalitions/` based on type) + a red/blue type pill. Elections dropdown shows state flag (`/static/images/states/{stateKey}.jpeg`). Both match production visuals. Missing flag images show a `?` placeholder rectangle at the same dimensions.

> **Deviation 5.1D — View count fetched client-side:** `PUBLIC_TINYBIRD_TOKEN` and `PUBLIC_API_URL_TB` passed as `data-*` attributes on the count `<span>` at build time; a `<script>` block fetches the Tinybird `views_by_page` pipe on load and updates the span. Matches production pattern exactly.

- [x] Frontmatter fetches all 5 endpoints with `Promise.allSettled()`. Failed fetches fall back to `[]`.
- [x] Hero section, dropdowns, "Latest" section, Explore section, Trust section all rendered as `.astro` markup
- [x] Dropdowns use custom vanilla JS combobox (see Deviation 5.1A)
- [x] `HomeDashboard` React component replaced — `.astro` file is the full implementation
- [x] Translations from `home`, `common`, `seats`, `candidates`, `parties` namespaces

**Parity criteria:**
- [x] Hero renders with correct translated header, description, category label, and two CTA buttons
- [x] Eye icon (heroicons `EyeIcon` solid/20) + view count rendered; view count fetched client-side
- [x] Seat dropdown navigates to `/seats/{type}/{slug}` on selection
- [x] Candidate dropdown navigates to `/candidates/{slug}` on selection
- [x] Party dropdown (with flag + type pill) navigates to `/parties/{uid}/mys` on selection
- [x] Election dropdown (with state flag) navigates to `/elections/{stateKey}/{election}` on selection
- [x] Tabs match production `SegmentTabs` styling (`rounded-lg bg-bg-washed`, active: `rounded-md border border-otl-gray-200 bg-bg-dialog-active shadow-button`)
- [x] "Latest" section renders theme-aware thumbnails (CSS `.dark` selector + `<picture>` element — no `useTheme`)
- [x] Both locale URLs serve correctly translated content
- [x] Zero React JS shipped to the browser for this page

### 5.2 — Elections Explorer (`/elections/[[...election]]`)

| | |
|---|---|
| **Current** | `pages/elections/[[...election]].tsx` — optional catch-all, `fallback: "blocking"`. `ElectionExplorerDashboard` is a single React component containing choropleth map + results table. |
| **Target** | `src/pages/elections/[...election].astro` + `src/pages/ms-MY/elections/[...election].astro` — **static shell, decomposed islands** |

**Important:** This page requires decomposing `ElectionExplorerDashboard`. Do not lift it as a single React island. The component must be split:

- **Choropleth map** (`ChoroplethMap`) → `<ChoroplethMap client:only="react" />` — Leaflet requires browser, must be an island
- **Results table** → `.astro` markup + vanilla JS column sort — React and `@tanstack/react-table` are removed for this component
- **Seat stats / summary** → pure `.astro`

- [ ] `getStaticPaths()` fetches `/dates.json` → enumerates all `{state, election}` pairs
- [ ] `src/pages/elections/index.astro` redirects to `/elections/mys/GE-15`
- [ ] Fetch election data in frontmatter; pass to both the `.astro` template and the `ChoroplethMap` island as props
- [ ] `groupBy(selection, 'state')` logic moves to frontmatter
- [ ] **Results table:** render as `.astro` HTML table; add a `<script>` for column sort (click header → sort rows by that column asc/desc). No framework.
- [ ] Remove `router.isFallback` (not needed; all paths pre-generated)
- [ ] **`POST_TO_BUILD` support:** filter by `state_code/election_name`

**Parity criteria:**
- [ ] Default `/elections` URL shows GE-15 national results
- [ ] All valid election URLs render with correct seat stats and choropleth
- [ ] Choropleth map renders correctly via Leaflet island
- [ ] Results table renders all ballot data
- [ ] Column sort works on the results table (vanilla JS)
- [ ] Invalid state/election combinations return 404
- [ ] Both locales

### 5.3 — Candidates (`/candidates/[[...slug]]`) 🔄 IN PROGRESS

| | |
|---|---|
| **Current** | `pages/candidates/[[...slug]].tsx` — `fallback: "blocking"`. `CandidateDashboard` is React. |
| **Target** | `src/pages/candidates/[...slug].astro` + `src/pages/ms-MY/candidates/[...slug].astro` — **fully static, no React island** |

All candidate data is fetched at build time. The page is purely presentational — bio, election history, results. No interactive filtering exists that would require a framework.

- [x] `getStaticPaths()` fetches `/candidates/dropdown.json` → enumerates all slugs (with `POST_TO_BUILD` filter)
- [x] `src/pages/candidates/index.astro` handles the no-param case
- [x] `src/pages/candidates/[...slug].astro` delegates to `src/components/Candidates/CandidatePage.astro`
- [x] Fetch full candidate data in frontmatter (`/candidates/{slug}.json`)
- [x] Hero section, election history table (All / Parlimen / DUN tabs), result badge rendered as `.astro`
- [x] Party flag shown inline in table rows
- [x] **`POST_TO_BUILD` support:** implemented

**Still needed (polishing phase):**
- [ ] Search box: currently uses native `<select>` — replace with same custom combobox as home page (rounded pill, red gradient button, fuzzy search)
- [ ] `FullResults` column: production table has a 6th column with a button that opens a popover showing all candidates + vote counts for that specific election/seat (fetches `/results/{seat}/{date}.json` on demand). Astro version has only 5 columns. Decision needed: pre-fetch all result sets at build time and inline them, or add a React island for this column only.
- [ ] Table mobile layout: production `ElectionTable` has a compact mobile view (`hideNameInMobileParty`). Astro version is a plain horizontal-scroll table on mobile.
- [ ] Vote percentage bar: production table shows a bar visual for vote percentage alongside the count. Missing from Astro version.
- [ ] Both locale URLs tested

**Parity criteria:**
- [ ] `/candidates` index page renders candidates list
- [x] Individual candidate pages render election history with All/Parlimen/DUN tabs
- [x] Invalid slugs redirect (no 404 loop)
- [ ] Both locales
- [ ] Custom combobox search matching home page style
- [ ] FullResults column (decision on pre-fetch vs island)
- [x] `CandidateElectionTable` mounted as `client:load` — electoral history table (seat names, parties, vote counts) is SSR'd into static HTML and fully crawlable. Confirmed via `curl | grep "Iskandar Puteri"` returning 3 matches (JSON hydration payload + mobile card `<p>` + desktop `<td>`). Was incorrectly `client:only="react"` initially — corrected as part of SEO audit.

### 5.4 — Parties (`/parties/[[...party]]`)

| | |
|---|---|
| **Current** | `pages/parties/[[...party]].tsx` — optional catch-all `[party_uid, state_code]`, handles coalitions |
| **Target** | `src/pages/parties/[...party].astro` + `src/pages/ms-MY/parties/[...party].astro` |

- [ ] `getStaticPaths()` fetches `/parties/dropdown.json`
- [ ] Party data fetched in frontmatter
- [ ] `src/pages/parties/index.astro` handles no-param case (party list)
- [ ] Audit `dashboards/parties.tsx` — chart components stay as React islands; evaluate overall shell
- [ ] **`POST_TO_BUILD` support:** filter by party UID

**Parity criteria:**
- [ ] Party profile page: logo, election history, seat wins/losses rendered
- [ ] Coalition grouping renders correctly
- [ ] State filter (if interactive) works within the React island
- [ ] Both locales

### Stress-test deployment (Phase 5 checkpoint)

Before fully implementing Parties, Elections, and Seats, a Cloudflare Pages stress-test was run with ~30k candidate pages to validate build time and deployment pipeline.

**Approach:** Parties and Elections pages were temporarily replaced with "Coming soon" stubs (their real implementations preserved in commit `cd1529011c0440204a61dafadb88f3b435b3f08c`). Stubs kept the correct `getStaticPaths()` (real dropdown fetches, real POST_TO_BUILD filtering) so the path count was accurate, but the component body was just a `<Layout>` wrapper with a heading. Seats pages did not exist yet and were stubbed with `return []` (no `seats/dropdown.json` endpoint).

**To restore the real implementations:**
```bash
git show cd1529011c0440204a61dafadb88f3b435b3f08c:src/pages/parties/[...party].astro
git show cd1529011c0440204a61dafadb88f3b435b3f08c:src/pages/ms-MY/parties/[...party].astro
git show cd1529011c0440204a61dafadb88f3b435b3f08c:src/pages/elections/[...election].astro
git show cd1529011c0440204a61dafadb88f3b435b3f08c:src/pages/ms-MY/elections/[...election].astro
```

**Verify Phase 5:**
- [ ] Home page fully functional in both locales — dropdown navigation works, zero React JS in bundle
- [ ] Elections page: static content renders, choropleth map island loads, table column sort works with vanilla JS
- [ ] Candidates and Parties render correctly as pure `.astro` in both locales
- [ ] `POST_TO_BUILD` surgical rebuild works end-to-end for at least one candidate — test with Wrangler deploy

---

## Phase 6 — Data Catalogue

### 6.1 — Data Catalogue Index (`/data-catalogue`)

| | |
|---|---|
| **Current** | `pages/data-catalogue/index.tsx` → `get('/catalogue/index-{lang}.json')`. `DataCatalogue` uses `WindowContext` + `useFilter` hook. |
| **Target** | `src/pages/data-catalogue/index.astro` + `src/pages/ms-MY/data-catalogue/index.astro` — **fully static, vanilla JS filter** |

The catalogue index is a searchable grid of items where all data is already loaded at build time. `useFilter` is a client-side text filter on a static list — this is exactly what a small vanilla JS script handles without any framework.

- [ ] Fetch `catalogue/index-en.json` / `catalogue/index-ms.json` in respective locale frontmatter
- [ ] Render full catalogue grid as `.astro` markup — all items in the HTML at load time
- [ ] Add a `<script>` for the search/filter: on input, show/hide grid items by matching against title/description. No framework, no virtual DOM.
- [ ] Remove `WindowContext`, `useFilter`, and the React component entirely
- [ ] Category filter (if present) implemented the same way — vanilla JS toggle on `data-category` attribute

**Parity criteria:**
- [ ] All catalogue items visible in grid/list on load
- [ ] Text search filters items correctly (vanilla JS)
- [ ] Category filter works (vanilla JS)
- [ ] Locale-specific labels render
- [ ] Zero React JS shipped to the browser for this page (`/data-catalogue/[id]`)

| | |
|---|---|
| **Current** | `pages/data-catalogue/[id].tsx` — `getStaticPaths: []` + `fallback: "blocking"` (all generated on-demand) |
| **Target** | `src/pages/data-catalogue/[id].astro` + `src/pages/ms-MY/data-catalogue/[id].astro` |

- [ ] **Path enumeration (critical):** `getStaticPaths()` fetches `catalogue/index-en.json` → extracts all `id` values → generates every path statically. This is the largest single path set on the site.
- [ ] Fetch `catalogue/{id}-en.json` / `catalogue/{id}-ms.json` per path in frontmatter
- [ ] `DataCatalogueShow` — deeply interactive (viz selector, filter hooks, analytics tracking, download, map switching). Keep as `client:load` island, passing full `DCVariable` data as prop.
- [ ] `AnalyticsContext` — fetches `views_by_dc` and `downloads_by_dc_format` client-side on mount (Tinybird). Stays in the React island unchanged.
- [ ] **`POST_TO_BUILD` support:** filter by catalogue ID — critical for this route since it will be the most frequently updated

**Parity criteria:**
- [ ] Every valid catalogue ID resolves to a page (no 404)
- [ ] Chart types (timeseries, bar, choropleth, mapbox, table) render based on `dataviz_set`
- [ ] Viz selector switches chart type
- [ ] Download panel works (CSV, Parquet, etc.)
- [ ] View count and download count display (populated client-side from Tinybird)
- [ ] `?visual=` query param selects correct viz on load
- [ ] Methodology and metadata tabs render
- [ ] Both locale paths work

**Verify Phase 6:**
- [ ] Full catalogue index renders
- [ ] Spot-check 10+ individual catalogue variable pages across different chart types
- [ ] Surgical rebuild test: `POST_TO_BUILD=some-catalogue-id` builds only that ID's pages

---

## Phase 7 — Mapbox-Heavy Pages

> All Mapbox components must be `client:only="react"`. No SSR attempt. The `.astro` page mounts the island with map config as props. Vite config must have `noExternal: ['mapbox-gl', 'react-map-gl']`.

### 7.1 — Seats (`/seats/[[...seat]]`)

| | |
|---|---|
| **Current** | `pages/seats/[[...seat]].tsx` — optional catch-all `[type, seat_slug]`, `fallback: "blocking"` |
| **Target** | `src/pages/seats/[...seat].astro` + `src/pages/ms-MY/seats/[...seat].astro` |

- [ ] `getStaticPaths()` fetches `/seats/current/dropdown.json` → enumerates all `type/slug` pairs
- [ ] Seat static data (stats, election history) fetched in frontmatter and passed as props
- [ ] `src/pages/seats/index.astro` redirects to default seat
- [ ] **Mapbox island:** `dashboards/my-area/mapbox.tsx` → `<MapboxDashboard client:only="react" {...props} />`. Pass vector tile source config as props from Astro frontmatter. Note: Mapbox GL calls browser APIs at module scope — `client:only` is correct here (unlike data tables, which should use `client:load`).
- [ ] `NEXT_PUBLIC_MAPBOX_TOKEN` → `PUBLIC_MAPBOX_TOKEN` (already covered in env var section)
- [ ] **`POST_TO_BUILD` support:** filter by `type/slug`

**Parity criteria:**
- [ ] Seat page loads with static stats rendered above the map
- [ ] Mapbox map renders with vector tiles from `mapbox://` sources
- [ ] Map popups work on feature click
- [ ] Seat type toggle (parlimen/dun) works within the React island
- [ ] Both locales

### 7.2 — Redelineation (`/redelineation/[area-year]`)

| | |
|---|---|
| **Current** | `pages/redelineation/[[...explorer]].tsx` — complex multi-segment catch-all |
| **Target** | `src/pages/redelineation/[area-year].astro` + `src/pages/ms-MY/redelineation/[area-year].astro` |

- [ ] `getStaticPaths()` fetches `redelineation/filter.json` → enumerates `area-year` combinations (e.g. `peninsular-2018`, `sabah-2023`)
- [ ] Default: `src/pages/redelineation/index.astro` redirects to `peninsular-2018`
- [ ] `?level=parlimen&seat=p001-padang-besar-perlis` query params — read by React island on mount via `window.location.search`. Island calls `history.pushState` when user changes selection so URL stays shareable.
- [ ] **Mapbox island:** `MapProvider` + full redelineation map → `client:only="react"`. Pass area/year data as props.
- [ ] **`POST_TO_BUILD` support:** filter by `area-year` slug

**Parity criteria:**
- [ ] Default `/redelineation` shows peninsular 2018 map
- [ ] All area-year combinations render
- [ ] `?level=` toggle switches between parlimen/dun within the island
- [ ] `?seat=` param highlights/zooms to the correct seat on load
- [ ] Full URL (e.g. `/redelineation/peninsular-2018?level=parlimen&seat=p001-...`) is shareable and restores state on load
- [ ] Seat comparison panel shows old vs new boundary data
- [ ] Both locales

### 7.3 — Map Explorer (`/map/explorer`)

| | |
|---|---|
| **Current** | `pages/map/explorer/index.tsx` — custom layout (no header/footer), `getStaticProps` fetches two JSON endpoints |
| **Target** | `src/pages/map/explorer/index.astro` (English only) |

- [ ] Fetch `map/map-layers.json` and `map/dropdown_peninsular_2018_parlimen.json` in frontmatter
- [ ] Page uses `FullscreenLayout.astro` (no header/footer) — create this layout
- [ ] **Mapbox island:** `MapExplorerDelimitation` → `client:only="react"` with `MapProvider`. Pass `sidebar` prop (locale-specific map layers) from frontmatter.
- [ ] Middleware redirects `ms-MY/map/*` → `/map/*`

**Parity criteria:**
- [ ] Full-screen map renders without header/footer
- [ ] Sidebar shows map layer options
- [ ] Map responds to sidebar selections
- [ ] Dropdown for area/year/type works

**Verify Phase 7:**
- [ ] Seats map renders with vector tiles
- [ ] Redelineation map renders; query params restore state correctly on load
- [ ] Map explorer fullscreen layout correct
- [ ] No `window is not defined` errors during build

---

## Phase 8 — Auth Pages

### 8.1 — Sign In (`/signin`) — English only

| | |
|---|---|
| **Current** | `pages/signin.tsx` — Cloudflare Turnstile, OTP request/verify flow, all client-side |
| **Target** | `src/pages/signin.astro` (static shell) + `<SignInForm client:only="react" />` island |

- [ ] Extract all interactive logic into `src/components/SignInForm.tsx`
- [ ] Turnstile script in `.astro` page `<head>`: `<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer />`
- [ ] `useRouter().replace('/console')` → `window.location.replace('/console')` inside the island
- [ ] Middleware redirects `ms-MY/signin` → `/signin`

**Parity criteria:**
- [ ] Email → OTP two-step flow works end-to-end
- [ ] Turnstile invisible widget renders and challenges correctly
- [ ] Rate-limit countdown displays correctly (1-second tick)
- [ ] Already-signed-in users redirected to `/console` on load
- [ ] Error states display with correct copy

### 8.2 — API Console (`/console`) — English only, auth-gated

| | |
|---|---|
| **Current** | `pages/console.tsx` + `dashboards/console/index.tsx` — all client-side, no build-time data |
| **Target** | `src/pages/console.astro` (static shell) + `<ConsoleDashboard client:only="react" />` island |

- [ ] `ConsoleDashboard` stays entirely as React island — manages API key CRUD, realtime usage stats, auth state
- [ ] Static shell provides metadata, page title, layout only
- [ ] Middleware redirects `ms-MY/console` → `/console`

**Parity criteria:**
- [ ] Unauthenticated users redirected to `/signin` (handled inside React island on mount)
- [ ] API key creation, deletion, and listing work
- [ ] Usage/stats charts render
- [ ] All Tinybird queries fire correctly

**Verify Phase 8:**
- [ ] Sign in flow works end-to-end in staging
- [ ] Console loads and manages API keys correctly
- [ ] Auth redirect works for unauthenticated users

---

## Phase 9 — Query Builder

### 9.1 — Query Builder (`/query-builder`) — English only

| | |
|---|---|
| **Current** | `pages/query-builder.tsx` — DuckDB WASM initialised client-side, CodeMirror SQL editor, `@tanstack/react-table` |
| **Target** | `src/pages/query-builder.astro` + `<QueryBuilderDashboard client:only="react" />` island |

- [ ] `QueryBuilderDashboard` is fully browser-side — `client:only="react"` is non-negotiable
- [ ] **DuckDB WASM config** — add to `astro.config.mjs`:
  ```js
  vite: {
    optimizeDeps: { exclude: ['@duckdb/duckdb-wasm'] },
    plugins: [wasm()], // vite-plugin-wasm
  }
  ```
  This resolves the known Vite worker file resolution error. One-line fix.
- [ ] Remove webpack `asyncWebAssembly: true` experiment from old config (not needed in Vite)
- [ ] Middleware redirects `ms-MY/query-builder` → `/query-builder`

**Parity criteria:**
- [ ] DuckDB initialises without errors in browser console
- [ ] SQL editor (CodeMirror) renders with syntax highlighting
- [ ] Query runs and results display in table
- [ ] Dataset selector works
- [ ] Export to CSV/Parquet works

**Verify Phase 9:**
- [ ] Query builder loads and DuckDB initialises in Chrome, Firefox, Safari
- [ ] Run a sample query against a dataset and verify results match production

---

## Phase 10 — PWA, Sitemap, Deploy Pipeline

### 10.1 — PWA

- [ ] Replace `next-pwa` with `@vite-pwa/astro`
- [ ] Copy `public/manifest.json`, icons, splash screens unchanged
- [ ] Delete old PWA generated files from `public/`: `sw.js`, `workbox-*.js`, `fallback-*.js`
- [ ] Configure `@vite-pwa/astro` with same cache strategy + `navigateFallback`
- [ ] PWA meta tags + apple touch icons move to `BaseLayout.astro`

### 10.2 — Sitemap

- [ ] `@astrojs/sitemap` configured in `astro.config.mjs`:
  ```js
  sitemap({
    i18n: {
      defaultLocale: 'en-GB',
      locales: { 'en-GB': 'en-GB', 'ms-MY': 'ms-MY' }
    }
  })
  ```
- [ ] Keep `scripts/compress-sitemaps.mjs` (runs via `postbuild`)
- [ ] Add Cloudflare Pages `_headers` file for `sitemap.xml.gz` content-encoding header

### 10.3 — Cloudflare Pages config

- [ ] `public/_redirects`:
  ```
  /openapi/introduction  /openapi  301
  /api/auth/*  https://auth.electiondata.my/:splat  200
  ```
- [ ] `public/_headers` for sitemap, caching, security headers
- [ ] Confirm Cloudflare Pages project is set to **Direct Upload** mode (not Git integration) to support surgical `POST_TO_BUILD` deploys

### 10.4 — Tailwind

- [ ] Update `tailwind.config.ts` content globs to `src/**` instead of root-level dirs
- [ ] All custom colours, keyframes, animations carry over unchanged
- [ ] `@govtechmy/myds-style` preset unchanged

**Verify Phase 10:**
- [ ] PWA installs correctly on mobile
- [ ] Sitemap generated and accessible at `/sitemap.xml`
- [ ] Redirects work (`/openapi/introduction` → `/openapi`, auth proxy)
- [ ] Full rebuild + surgical rebuild both deploy successfully via Wrangler

---

## Phase 11 — Full Parity Audit

Go through every production URL and compare against the migrated site:

- [ ] **All pages render** — no blank pages, no JS errors in console
- [ ] **Dark mode** — correct on all pages, system default respected, toggle works
- [ ] **Both locales** — every bilingual page checked in both `/` (en) and `/ms-MY/` (ms)
- [ ] **Interactive components** — all dropdowns, filters, charts, maps functional
- [ ] **Mapbox** — seats, redelineation, map explorer all render tiles correctly
- [ ] **Auth flow** — sign in, console, API key management end-to-end
- [ ] **Query builder** — DuckDB loads, queries run, exports work
- [ ] **Tinybird** — view counts appear on catalogue pages
- [ ] **PWA** — installs and works offline
- [ ] **Sitemap** — all URLs present
- [ ] **Surgical rebuild** — test `POST_TO_BUILD` for at least: one candidate, one catalogue item, one election
- [ ] **Performance** — Lighthouse scores on home, a catalogue page, and a seat page

---

## Component Reference

### React Islands (keep as React)

| Component | Type | Reason |
|---|---|---|
| `ChoroplethMap` | `client:only="react"` | Leaflet — browser APIs at module scope, SSR impossible |
| `MapboxDashboard` (seats) | `client:only="react"` | Mapbox GL — browser APIs at module scope |
| `RedelineationMap` | `client:only="react"` | Mapbox GL + `history.pushState` state |
| `MapExplorerDelimitation` | `client:only="react"` | Mapbox GL fullscreen |
| `SignInForm` | `client:only="react"` | Turnstile renders into DOM on mount — browser only |
| `ConsoleDashboard` | `client:only="react"` | Auth state, no meaningful SSR output |
| `QueryBuilderDashboard` | `client:only="react"` | DuckDB WASM, CodeMirror — browser only |
| `TabCodeIsland`, `TokenInput`, `CandidatesApiTester` | `client:only="react"` | API docs interactive widgets — no indexable content |
| `ByElectionsDashboard` | `client:load` | Interactive tabs + on-demand fetch, but seat list must be in static HTML for SEO. All `window`/`document` calls are in `useEffect` — SSR-safe. |
| `CandidateElectionTable` | `client:load` | Tab switching + full-result modal (fetches on demand), but electoral history rows must be in static HTML for SEO. No render-scope browser API calls. |
| `BallotSeat` (elections) | `client:load` | Interactive seat results, no browser API calls at render scope — SSR-safe. |
| `DataCatalogueShow` | `client:load` | Viz selector, chart switching, download panel, Tinybird analytics |
| `ThemeToggle` | `client:load` | `localStorage`, DOM mutation |
| `LocaleSwitch` | `client:load` | `window.location` |
| `AutoToast` | `client:load` | `@govtechmy/myds-react` global |
| All chart components | Used inside islands only | react-chartjs-2, @nivo, react-leaflet |

### Convert to `.astro` (or delete)

| Component | Notes |
|---|---|
| `HomeDashboard` | **Delete** — replace with `.astro` markup + native `<select>` navigation |
| `ElectionExplorerDashboard` | **Decompose** — static shell + results table become `.astro`; only `ChoroplethMap` extracted as island |
| `CandidateDashboard` | **Delete** — replace with `.astro` markup |
| `DataCatalogue` (index) | **Delete** — replace with `.astro` grid + vanilla JS filter script |
| `Layout/index.tsx` | Slot-based layout shell |
| `Layout/Header` | Static shell; ThemeToggle + LocaleSwitch remain as islands |
| `Layout/Footer` | Static links only; remove `window.location` usage |
| `Article/index.tsx` | Pure layout shell |
| `Container/index.tsx` | Pure layout |
| `Card/index.tsx` | Pure layout |
| `Metadata/index.tsx` | Replace with `BaseLayout.astro` head slot |
| `Skeleton/index.tsx` | CSS animation only |
| `Spinner/index.tsx` | CSS animation only |
| `ResearchDashboard` | Static cards |
| `ImageTheme/index.tsx` | Replace `useTheme` with CSS `.dark img` + `<picture>` |
| `Progress/index.tsx` | Replace with Astro View Transitions progress |

### Hooks to remove or replace

| Hook | Action |
|---|---|
| `useTranslation` | Remove — pass translated strings as props from `.astro` parent |
| `useLanguage` | Remove — use `Astro.currentLocale` in `.astro`, pass as prop to islands |
| All other hooks | Keep — only used within React islands |

---

## Risk Register

All risks are low-severity with known mitigations. None are blockers.

| Risk | Mitigation |
|---|---|
| **DuckDB WASM / Vite worker error** | `optimizeDeps: { exclude: ['@duckdb/duckdb-wasm'] }` in Vite config. One-line fix. |
| **Mapbox/Leaflet `window is not defined`** | `client:only="react"` + `ssr: { noExternal: ['mapbox-gl', 'react-map-gl'] }`. Already covered in scaffold. |
| **`@govtechmy/myds-react` SSR** | `ssr: { noExternal: ['@govtechmy/myds-react'] }`. Already in scaffold config. |
| **Path enumeration build time** | Root cause is per-component `fetchJSON` calls multiplying across 14k+ pages — not page count itself. Fix: fetch all data + i18n in `getStaticPaths`, pass as props. With bundled `all.json` files and i18n as props, target build time is **~1–2 min** (6 total HTTP fetches). See Data Strategy section. |
| **`POST_TO_BUILD` + full site consistency** | Surgical builds only update specific pages. If a data change affects multiple pages (e.g. a candidate appears on elections pages too), the webhook payload must list all affected paths. Backend team to document which data changes affect which routes. |
| **next-themes removal / ImageTheme** | Replace `useTheme` with CSS `.dark img` selector or pass theme as prop. Low-impact, affects a small number of components. |
| **chartjs-adapter-luxon** | Remove `transpilePackages` workaround from Next config — not needed in Vite. Verify chart rendering after migration. |