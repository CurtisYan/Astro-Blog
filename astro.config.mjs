import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

function addNoReferrerToExternalImages() {
  return (tree) => {
    const visit = (node) => {
      if (!node || typeof node !== 'object') return;

      if (node.type === 'element' && node.tagName === 'img' && node.properties && typeof node.properties.src === 'string') {
        const src = node.properties.src;
        if (/^https?:\/\//i.test(src)) {
          node.properties.referrerpolicy = 'no-referrer';
          node.properties.loading = 'lazy';
          node.properties.decoding = 'async';
        }
      }

      if (Array.isArray(node.children)) {
        for (const child of node.children) {
          visit(child);
        }
      }
    };

    visit(tree);
  };
}

export default defineConfig({
  site: 'https://blog.curvio.org',
  markdown: {
    rehypePlugins: [addNoReferrerToExternalImages]
  },
  integrations: [sitemap()]
});