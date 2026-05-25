import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const posts = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/posts' }),
  schema: z.object({
    title: z.string().optional(),
    date: z.preprocess((value) => {
      if (value instanceof Date) return value.toISOString();
      if (typeof value === 'string') return value;
      return value;
    }, z.string().optional()),
    tags: z.any().optional(),
    keywords: z.any().optional(),
    thumbnail: z.any().optional(),
    excerpt: z.preprocess((value) => {
      if (value === false) return undefined;
      return value;
    }, z.string().optional()),
    draft: z.boolean().optional()
  })
});

const pages = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/pages' }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    date: z.preprocess((value) => {
      if (value instanceof Date) return value.toISOString();
      if (typeof value === 'string') return value;
      return value;
    }, z.string().optional()),
    draft: z.boolean().optional()
  })
});

export const collections = { posts, pages };
