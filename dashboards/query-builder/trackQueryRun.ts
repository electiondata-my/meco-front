function buildPageHitPayload(pathname: string): Record<string, string | undefined> {
  try {
    return {
      "user-agent": window.navigator.userAgent,
      locale:
        navigator.languages?.[0] ||
        navigator.language ||
        (navigator as any).userLanguage ||
        (navigator as any).browserLanguage ||
        "en",
      referrer: document.referrer,
      pathname,
      href: window.location.href,
    };
  } catch {
    return { pathname };
  }
}

export function trackQueryRun(): void {
  try {
    const tb = (window as any).Tinybird;
    if (!tb?.trackEvent) return;

    tb.trackEvent("page_hit", buildPageHitPayload("/query-run"));
  } catch {}
}
