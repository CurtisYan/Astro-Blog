import { z, defineCollection } from 'astro:content';

const postSchema = z.object({
  title: z.string().optional(),
  date: z.string().optional(),
  tags: z.array(z.string()).optional(),
  excerpt: z.string().optional(),
  draft: z.boolean().optional()
});

export const collections = {
  posts: defineCollection({ schema: postSchema })
};
