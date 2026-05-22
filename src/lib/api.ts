const BASE_S3 = import.meta.env.PUBLIC_API_URL_S3;

// Build-time cache: keyed by full URL. Safe because Astro SSG is single-process.
const _cache = new Map<string, unknown>();

/**
 * Build-time fetch helper. Used only in Astro frontmatter — never in browser code.
 * Results are cached in-process so each URL is fetched exactly once per build.
 */
export async function fetchJSON<T>(path: string, base = BASE_S3): Promise<T> {
  const url = `${base}${path}`;
  if (_cache.has(url)) return _cache.get(url) as T;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetch failed: ${path} (${res.status})`);
  const data = await res.json() as T;
  _cache.set(url, data);
  return data;
}
