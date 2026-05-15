import { createGzip, gzipSync } from "zlib";
import { createReadStream, createWriteStream, readFileSync, writeFileSync } from "fs";
import { pipeline } from "stream/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = join(__dirname, "..", "public");

const SUB_SITEMAPS = ["sitemap-0.xml", "sitemap-1.xml", "sitemap-2.xml", "sitemap-3.xml"];

async function gzipFile(filename) {
  const src = join(PUBLIC_DIR, filename);
  const dest = join(PUBLIC_DIR, `${filename}.gz`);
  await pipeline(createReadStream(src), createGzip(), createWriteStream(dest));
  console.log(`  ${filename} → ${filename}.gz`);
}

function compressIndex() {
  const indexPath = join(PUBLIC_DIR, "sitemap.xml");
  const gzIndexPath = join(PUBLIC_DIR, "sitemap.xml.gz");
  const updated = readFileSync(indexPath, "utf8").replace(
    /sitemap-(\d+)\.xml<\/loc>/g,
    "sitemap-$1.xml.gz</loc>",
  );
  writeFileSync(gzIndexPath, gzipSync(Buffer.from(updated, "utf8")));
  console.log("  sitemap.xml → sitemap.xml.gz (sub-sitemap refs updated to .gz)");
}

console.log("Compressing sitemaps…");
await Promise.all(SUB_SITEMAPS.map(gzipFile));
compressIndex();
console.log("Done.");
