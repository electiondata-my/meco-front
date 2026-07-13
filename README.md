## Table of Contents

- [Approach to the Frontend](#approach-to-the-frontend)
- [License](#license)
- [Installation](#installation)
- [Key Commands](#commands-to-know)
- [Contributing](#contributing)

## Approach to the Frontend

This is a fully static Astro site (~40,000 pages) deployed to Cloudflare Pages. Some keys things you should know about frontend choices made for this project:

- **Build-time data fetching.** All page-level data is fetched once during `getStaticPaths` and passed down as props. Where a page type has many permutations (e.g. 15,000 candidates across 10,000 electoral contests in 822 current seats), we fetch a single `json` that covers every slug — never per-slug requests. Some interactive components (e.g. mostly modal popups) fetch detail data on demand at runtime (client-side), but only where embedding it at build time would be impractical.

- **Surgical rebuilds.** Cloudflare Pages supports deploying individual pages without a full rebuild. Setting a `POST_TO_BUILD_*` variable builds only the target pages into `dist-surgical/`, which is then rsynced into the existing `dist/` and deployed — e.g. `POST_TO_BUILD_ELECTIONS=jhr/SE-16 pnpm build && pnpm deploy`. This is used for time-sensitive updates (e.g. live election results). Because a Pages deployment is a snapshot of whatever `dist/` it is handed, surgical rebuilds require a warm `dist/`, and **all deploys must originate from the same machine** — a full deploy from elsewhere desyncs that tree and the next surgical deploy will revert it.

- **Internationalisation.** The site is bilingual (English at `/`, Malay at `/ms-MY/`). Translation strings live in a separate repo (served as JSON files via R2) and are fetched at build time. A small middleware redirects Malay visitors away from English-only pages (e.g. `/openapi`, `/console`).

- **Astro + React islands.** Pages are `.astro` files. Interactive components (charts, maps, dropdowns) are React islands, hydrated only where needed. Tailwind is used for all styling.

- **Auth.** A Cloudflare Worker handles OTP login, sessions, and rate limiting for the API console. The frontend proxies `/api/auth/*` to it — in production via middleware, in development via the Vite dev server proxy.

## License

In the name of democracy, this project is released into the public domain under [CC0 1.0 Universal (CC0 1.0) Public Domain Dedication](https://creativecommons.org/publicdomain/zero/1.0/). You are free to use, modify, and distribute the code without any restrictions.

## Installation

We recommend using `pnpm` to manage the project's dependencies.

Copy `.env.example` to `.env` and fill in the required values before running the project.

- ✅ indicates a required variable (core features won't work without these)
- ⬜️ indicates an optional variable (only affects non-core features)

| Variable                    | Required | Default                                | Description                                                   |
| --------------------------- | -------- | -------------------------------------- | ------------------------------------------------------------- |
| `PUBLIC_APP_URL`            | ✅       | https://electiondata.my                | Client-side base app domain                                   |
| `PUBLIC_API_URL_TB`         | ⬜️       | https://api.us-west-2.aws.tinybird.co  | Tinybird API base URL                                         |
| `PUBLIC_TINYBIRD_TOKEN`     | ⬜️      | (private, get your own)                | Tinybird token for analytics                                  |
| `PUBLIC_API_URL_R2`         | ✅       | https://internal.electiondata.my       | Static assets served via Cloudflare R2; no token needed       |
| `PUBLIC_I18N_URL`           | ✅       | https://internal.electiondata.my/i18n  | i18n resources served via Cloudflare; no token needed         |
| `PUBLIC_MAPBOX_ACCOUNT`     | ✅       | (private, get your own)                | Mapbox account ID; map features won't work without this       |
| `PUBLIC_MAPBOX_TOKEN`       | ✅       | (private, get your own)                | Mapbox API access token; map features won't work without this |
| `PUBLIC_AUTH_URL`           | ✅       | /api/auth                              | URL for the auth service                                      |
| `PUBLIC_TURNSTILE_SITE_KEY` | ✅       | (private, get your own)                | Cloudflare Turnstile site key for bot protection              |

## Commands to Know

```bash
# Start development server
pnpm dev

# Build production app
pnpm build

# Deploy to Cloudflare Pages (production)
pnpm deploy

# Deploy to Cloudflare Pages (staging)
pnpm deploy-staging
```

## Contributing

Thank you for supporting this open source project dedicated to the public domain! When contributing, consider first opening an issue — so that everyone is on the same page. Happy coding!
