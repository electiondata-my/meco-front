import fs from "fs";
import path from "path";
import matter from "gray-matter";
import type { TocItem } from "@dashboards/openapi/config";
import { slugify } from "@lib/docs-utils";
export { slugify };

const CONTENT_DIR = path.join(process.cwd(), "content", "openapi");

export interface DocFrontmatter {
  title: string;
  breadcrumb: string;
  description: string;
  keywords: string;
}

/**
 * Strip common inline markdown from heading text before slugifying.
 * Handles inline code, links, bold, italic.
 */
function stripInlineMarkdown(text: string): string {
  return text
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .trim();
}

/**
 * Extract h2/h3 headings from raw MDX content to build the TOC.
 * Skips headings inside code fences.
 */
export function extractToc(content: string): TocItem[] {
  const items: TocItem[] = [];
  let inCodeFence = false;

  for (const line of content.split("\n")) {
    if (line.startsWith("```")) {
      inCodeFence = !inCodeFence;
      continue;
    }
    if (inCodeFence) continue;

    const match = line.match(/^(#{2,3})\s+(.+)$/);
    if (match) {
      const level = match[1].length as 2 | 3;
      const raw = match[2].trim();
      const text = stripInlineMarkdown(raw);
      const id = slugify(text);
      items.push({ id, text, level });
    }
  }

  return items;
}

/**
 * Read an MDX file from content/openapi/, parse frontmatter.
 * slugParts: e.g. ["introduction"] or ["endpoints", "candidates"]
 */
export function readDocFile(slugParts: string[]): {
  content: string;
  frontmatter: DocFrontmatter;
} {
  const filePath = path.join(CONTENT_DIR, ...slugParts) + ".mdx";
  const raw = fs.readFileSync(filePath, "utf-8");
  const { content, data } = matter(raw);
  return { content, frontmatter: data as DocFrontmatter };
}

/**
 * Recursively scan content/openapi/ and return all slug part arrays.
 * e.g. [["introduction"], ["authentication"], ["endpoints", "candidates"]]
 */
export function getAllDocSlugs(): string[][] {
  return scanDir(CONTENT_DIR, []);
}

function scanDir(dir: string, base: string[]): string[][] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const slugs: string[][] = [];

  for (const entry of entries) {
    if (entry.isDirectory()) {
      slugs.push(...scanDir(path.join(dir, entry.name), [...base, entry.name]));
    } else if (entry.isFile() && entry.name.endsWith(".mdx")) {
      slugs.push([...base, entry.name.replace(/\.mdx$/, "")]);
    }
  }

  return slugs;
}
