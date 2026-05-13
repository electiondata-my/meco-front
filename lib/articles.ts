import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { serialize } from "next-mdx-remote/serialize";
import type { MDXRemoteSerializeResult } from "next-mdx-remote";

export type ArticleCollection = "about" | "blog";
export type ArticlePrincipleIcon = "arrow-down-tray" | "scale" | "shield-check";

export interface ArticlePrinciple {
  number: string;
  icon: ArticlePrincipleIcon;
  title: string;
  description: string;
}

export interface ArticleFrontmatter {
  title: string;
  metaTitle?: string;
  description: string;
  date?: string;
  updated?: string;
  author?: string;
  tags?: string[];
  principles?: ArticlePrinciple[];
}

export interface Article {
  source: MDXRemoteSerializeResult;
  frontmatter: ArticleFrontmatter;
  locale: string;
  requestedLocale: string;
}

const CONTENT_DIR = path.join(process.cwd(), "content", "articles");
const DEFAULT_LOCALE = "en-GB";

function articlePath(
  collection: ArticleCollection,
  slug: string,
  locale: string,
) {
  const articleDir =
    collection === "about"
      ? path.join(CONTENT_DIR, collection)
      : path.join(CONTENT_DIR, collection, slug);
  return path.join(articleDir, `${locale}.mdx`);
}

function resolveArticlePath(
  collection: ArticleCollection,
  slug: string,
  locale: string,
) {
  const localizedPath = articlePath(collection, slug, locale);
  if (fs.existsSync(localizedPath)) {
    return { filePath: localizedPath, resolvedLocale: locale };
  }

  // Long-form translations may ship after the English article. Fall back to the
  // canonical English file so routes remain renderable while translation catches up.
  const fallbackPath = articlePath(collection, slug, DEFAULT_LOCALE);
  if (fs.existsSync(fallbackPath)) {
    return { filePath: fallbackPath, resolvedLocale: DEFAULT_LOCALE };
  }

  throw new Error(
    `Article not found: ${collection}/${slug} for locale ${locale}`,
  );
}

export async function getArticle(
  collection: ArticleCollection,
  slug: string,
  locale = DEFAULT_LOCALE,
): Promise<Article> {
  const { filePath, resolvedLocale } = resolveArticlePath(
    collection,
    slug,
    locale,
  );
  const raw = fs.readFileSync(filePath, "utf-8");
  const { content, data } = matter(raw);
  const source = await serialize(content, {
    mdxOptions: {
      remarkPlugins: [],
      rehypePlugins: [],
    },
    blockJS: false,
  });

  return {
    source,
    frontmatter: data as ArticleFrontmatter,
    locale: resolvedLocale,
    requestedLocale: locale,
  };
}

export function getArticleSlugs(collection: ArticleCollection): string[] {
  const collectionDir = path.join(CONTENT_DIR, collection);
  if (!fs.existsSync(collectionDir)) return [];
  if (collection === "about") return ["about"];

  return fs
    .readdirSync(collectionDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}
