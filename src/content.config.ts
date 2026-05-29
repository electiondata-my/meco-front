import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const principle = z.object({
  number: z.string(),
  icon: z.string(),
  title: z.string(),
  description: z.string(),
});

const articles = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/articles' }),
  schema: z.object({
    title: z.string(),
    metaTitle: z.string().optional(),
    description: z.string().optional(),
    principles: z.array(principle).optional(),
  }),
});

const openapi = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/openapi' }),
  schema: z.object({
    title: z.string(),
    pageTitle: z.string().optional(),
    breadcrumb: z.string(),
    description: z.string(),
    keywords: z.string(),
  }),
});

export const collections = { articles, openapi };
