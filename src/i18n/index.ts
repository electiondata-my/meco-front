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

/**
 * Fetches one or more i18n namespaces at build time (Astro frontmatter only).
 * Results are cached in-process so each locale+namespace is fetched exactly once.
 */
export async function getTranslations(
  locale: string,
  namespaces: string[],
): Promise<Record<string, Record<string, any>>> {
  const results = await Promise.all(namespaces.map(ns => fetchNs(locale, ns)));
  return Object.fromEntries(namespaces.map((ns, i) => [ns, results[i]]));
}

/**
 * Resolves a dot-separated key against a translations object.
 * Supports `{{var}}` interpolation.
 * Falls back to the key string itself when the key is missing.
 */
export function t(
  translations: Record<string, any>,
  key: string,
  vars?: Record<string, string>,
): string {
  const val = key.split('.').reduce((o: any, k) => o?.[k], translations) ?? key;
  return vars
    ? String(val).replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? _)
    : String(val);
}
