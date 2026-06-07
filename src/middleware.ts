import { defineMiddleware } from "astro:middleware";

// Pages that have no Malay equivalent — redirect ms-MY visitors to the English path
const ENGLISH_ONLY_PATHS = [
  "/openapi",
  "/query-builder",
  "/signin",
  "/console",
  "/map",
  "/data-catalogue",
];

export const onRequest = defineMiddleware(async ({ request }, next) => {
  const url = new URL(request.url);
  const { pathname } = url;

  // ── 1. Auth proxy: /api/auth/* → https://auth.electiondata.my/* ──────────
  if (pathname.startsWith("/api/auth/")) {
    const target = "https://auth.electiondata.my" + pathname.slice("/api/auth".length);
    const proxyUrl = new URL(target);
    proxyUrl.search = url.search;

    return fetch(proxyUrl.toString(), {
      method: request.method,
      headers: request.headers,
      body: ["GET", "HEAD"].includes(request.method) ? undefined : request.body,
      // @ts-ignore — duplex required for streaming body in some runtimes
      duplex: "half",
    });
  }

  // ── 2. Redirect ms-MY/* for English-only pages ───────────────────────────
  if (pathname.startsWith("/ms-MY/") || pathname === "/ms-MY") {
    const pathWithoutLocale = pathname.slice("/ms-MY".length) || "/";
    const isEnglishOnly = ENGLISH_ONLY_PATHS.some(
      (p) => pathWithoutLocale === p || pathWithoutLocale.startsWith(p + "/"),
    );
    if (isEnglishOnly) {
      return Response.redirect(new URL(pathWithoutLocale, url), 302);
    }
  }

  return next();
});
