import { NextRequest, NextResponse } from "next/server";

// These paths are English-only — redirect ms-MY visitors to en-GB
const ENGLISH_ONLY_PATHS = ["/openapi", "/signin", "/console"];

export const config = {
  matcher: [
    // Match all pathnames except for
    // - … if they start with `/api`, `/_next` or `/_vercel`
    // - … the ones containing a dot (e.g. `favicon.ico`)
    "/((?!api|_next|_vercel|admin|.*\\..*).*)",
  ],
};

export async function middleware(request: NextRequest) {
  let response: NextResponse;
  // Bug: Middleware interferes with getServerSideProps, by returning empty pageProps [https://github.com/vercel/next.js/issues/47516]
  // Fixed by removing the 'x-middleware-prefetch' header
  const headers = new Headers(request.headers);
  const purpose = headers.get("purpose");
  if (purpose && purpose.match(/prefetch/i))
    headers.delete("x-middleware-prefetch"); // empty json bugfix (in the browser headers still show, but here it is gone)

  // Redirect ms-MY visitors on English-only pages to the en-GB equivalent
  const pathname = request.nextUrl.pathname;
  if (pathname.startsWith("/ms-MY/") || pathname === "/ms-MY") {
    const pathWithoutLocale = pathname.slice("/ms-MY".length) || "/";
    const isEnglishOnly = ENGLISH_ONLY_PATHS.some(
      p => pathWithoutLocale === p || pathWithoutLocale.startsWith(p + "/"),
    );
    if (isEnglishOnly) {
      const url = request.nextUrl.clone();
      url.pathname = "/en-GB" + pathWithoutLocale;
      return NextResponse.redirect(url);
    }
  }

  // Request authenticated
  response = NextResponse.next({ request: { headers } });

  if (!process.env.PROTECT_DEPLOYMENT) return response;

  // Other deployment
  const basicAuth = request.headers.get("authorization");
  if (basicAuth) {
    const authValue = basicAuth.split(" ")[1];
    const [user, password] = atob(authValue).split(":");
    if (user === "admin" && password === process.env.AUTH_TOKEN) {
      return response;
    }
  }
  return new NextResponse("Auth required", {
    status: 401,
    headers: { "WWW-Authenticate": `Basic realm="Secure Area"` },
  });
}
