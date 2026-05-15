/** @type {import('next-sitemap').IConfig} */

const APP_URL = process.env.APP_URL || "https://electiondata.my";
const STATIC_BASE = "https://static.electiondata.my";
const LOCALES = ["en-GB", "ms-MY"];

// Reverse map: display name used in dates.json → state code used in URL
const STATE_NAME_TO_CODE = {
  Malaysia: "mys",
  Johor: "jhr",
  Kedah: "kdh",
  Kelantan: "ktn",
  "W.P. Kuala Lumpur": "kul",
  "W.P. Labuan": "lbn",
  Melaka: "mlk",
  "Negeri Sembilan": "nsn",
  Pahang: "phg",
  Perak: "prk",
  Perlis: "pls",
  "Pulau Pinang": "png",
  "W.P. Putrajaya": "pjy",
  Sabah: "sbh",
  Sarawak: "swk",
  Selangor: "sgr",
  Terengganu: "trg",
};

function makeEntry(path, priority = 0.7) {
  return {
    loc: path,
    changefreq: "weekly",
    priority,
    alternateRefs: LOCALES.map(locale => ({
      href: `${APP_URL}/${locale}${path}`,
      hreflang: locale,
    })),
  };
}

/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: APP_URL,
  generateIndexSitemap: true,
  generateRobotsTxt: false,
  priority: 0.7,
  autoLastmod: true,
  outDir: "public",
  exclude: ["/404", "/ms-MY/404", "/500", "/ms-MY/500"],

  // Attach alternateRefs to all statically-discovered pages
  transform: async (config, path) => ({
    loc: path,
    changefreq: config.changefreq,
    priority: config.priority,
    lastmod: config.autoLastmod ? new Date().toISOString() : undefined,
    alternateRefs: LOCALES.map(locale => ({
      href: `${APP_URL}/${locale}${path}`,
      hreflang: locale,
    })),
  }),

  additionalPaths: async _config => {
    const results = [];
    const fetchJson = url =>
      fetch(url)
        .then(r => r.json())
        .catch(() => ({}));

    const [candidates, parties, elections, seats] = await Promise.all([
      fetchJson(`${STATIC_BASE}/candidates/dropdown.json`),
      fetchJson(`${STATIC_BASE}/parties/dropdown.json`),
      fetchJson(`${STATIC_BASE}/dates.json`),
      fetchJson(`${STATIC_BASE}/seats/current/dropdown.json`),
    ]);

    // /candidates/{slug}
    for (const { slug } of candidates?.data ?? []) {
      if (slug) results.push(makeEntry(`/candidates/${slug}`));
    }

    // /parties/{party_uid} — no state suffix, page defaults to Malaysia
    // NOTE: parties endpoint is double-nested: { data: { data: [...] } }
    for (const { party_uid } of parties?.data?.data ?? []) {
      if (party_uid) results.push(makeEntry(`/parties/${party_uid}`, 0.6));
    }

    // /elections/{state_code}/{election_name}
    // dates.json uses full state display names; URL needs state code
    for (const { state, election } of elections?.data ?? []) {
      const stateCode = STATE_NAME_TO_CODE[state];
      if (stateCode && election) {
        results.push(makeEntry(`/elections/${stateCode}/${election}`));
      }
    }

    // /seats/{type}/{slug}
    for (const { type, slug } of seats?.data ?? []) {
      if (type && slug) results.push(makeEntry(`/seats/${type}/${slug}`));
    }

    return results;
  },
};
