const BASE_S3 = import.meta.env.PUBLIC_API_URL_S3;

/**
 * Build-time fetch helper. Used only in Astro frontmatter — never in browser code.
 */
export async function fetchJSON<T>(path: string, base = BASE_S3): Promise<T> {
  const res = await fetch(`${base}${path}`);
  if (!res.ok) throw new Error(`fetch failed: ${path} (${res.status})`);
  return res.json() as Promise<T>;
}
