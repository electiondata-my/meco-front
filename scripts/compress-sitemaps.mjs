import { createGzip, gzipSync } from "zlib";
import { createReadStream, createWriteStream, readFileSync, writeFileSync, readdirSync } from "fs";
import { pipeline } from "stream/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = join(__dirname, "..", "dist");

const SUB_SITEMAPS = readdirSync(PUBLIC_DIR)
  .filter((f) => /^sitemap-\d+\.xml$/.test(f))
  .sort();

async function gzipFile(filename) {
  const src = join(PUBLIC_DIR, filename);
  const dest = join(PUBLIC_DIR, `${filename}.gz`);
  await pipeline(createReadStream(src), createGzip(), createWriteStream(dest));
  console.log(`  ${filename} → ${filename}.gz`);
}

function compressIndex() {
  const indexPath = join(PUBLIC_DIR, "sitemap-index.xml");
  const gzIndexPath = join(PUBLIC_DIR, "sitemap-index.xml.gz");
  const updated = readFileSync(indexPath, "utf8").replace(
    /sitemap-(\d+)\.xml<\/loc>/g,
    "sitemap-$1.xml.gz</loc>",
  );
  writeFileSync(gzIndexPath, gzipSync(Buffer.from(updated, "utf8")));
  console.log("  sitemap-index.xml → sitemap-index.xml.gz (sub-sitemap refs updated to .gz)");
}

console.log("Compressing sitemaps…");
await Promise.all(SUB_SITEMAPS.map(gzipFile));
compressIndex();
console.log("Done.");
