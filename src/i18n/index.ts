const BASE_I18N = import.meta.env.PUBLIC_I18N_URL;

/**
 * Fetches one or more i18n namespaces at build time (Astro frontmatter only).
 * Falls back to {} for any namespace that fails to load.
 */
export async function getTranslations(
  locale: string,
  namespaces: string[],
): Promise<Record<string, Record<string, any>>> {
  const results = await Promise.allSettled(
    namespaces.map(ns =>
      fetch(`${BASE_I18N}/${locale}/${ns}.json`).then(r => r.json()),
    ),
  );
  return Object.fromEntries(
    namespaces.map((ns, i) => [
      ns,
      results[i].status === 'fulfilled' ? results[i].value : {},
    ]),
  );
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
