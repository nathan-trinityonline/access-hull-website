import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { satteri } from '@astrojs/markdown-satteri';

// Set SITE_URL in the hosting environment once the real domain is known.
export default defineConfig({
  site: process.env.SITE_URL || 'https://accesshull.co.uk',
  trailingSlash: 'always',
  build: { format: 'directory' },
  // Keep article quotes exactly as written (no automatic curly quotes)
  markdown: { processor: satteri({ features: { smartPunctuation: false } }) },
  integrations: [sitemap({ filter: (page) => !/\/(thank-you|404)\/?$/.test(page) })],
});
