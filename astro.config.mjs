import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// No custom rehype transforms for images: keep Markdown images as plain <img> output.

export default defineConfig({
  site: 'https://blog.curvio.org',
  markdown: {
    rehypePlugins: []
  },
  integrations: [sitemap()]
});