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

function wrapStandaloneImages() {
  return (tree) => {
    let imageCount = 0;

    const isImageElement = (node) => {
      return node && typeof node === 'object' && node.type === 'element' && node.tagName === 'img';
    };

    const isStandaloneImageParagraph = (node) => {
      if (!node || typeof node !== 'object' || node.type !== 'element' || node.tagName !== 'p') {
        return false;
      }

      const children = Array.isArray(node.children) ? node.children.filter((child) => {
        return !(child.type === 'text' && String(child.value || '').trim() === '');
      }) : [];

      return children.length === 1 && isImageElement(children[0]);
    };

    const visit = (node, parent = null, index = -1) => {
      if (!node || typeof node !== 'object') return;

      if (Array.isArray(node.children)) {
        for (let childIndex = 0; childIndex < node.children.length; childIndex += 1) {
          const child = node.children[childIndex];

          if (isStandaloneImageParagraph(child)) {
            const imageNode = child.children.find(isImageElement);
            const isLeadImage = imageCount === 0;
            imageCount += 1;

            node.children[childIndex] = {
              type: 'element',
              tagName: 'figure',
              properties: {
                className: ['wp-block-image', isLeadImage ? 'is-lead-image' : 'is-regular-image']
              },
              children: [imageNode]
            };
            continue;
          }

          visit(child, node, childIndex);
        }
      }
    };

    visit(tree);
  };
}

export default defineConfig({
  site: 'https://blog.curvio.org',
  markdown: {
    rehypePlugins: [wrapStandaloneImages, addNoReferrerToExternalImages]
  },
  integrations: [sitemap()]
});