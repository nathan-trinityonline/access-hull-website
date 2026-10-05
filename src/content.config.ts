import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// News and guides: one Markdown file per article in src/content/news/.
// The file name is the URL slug, e.g. spot-a-scam.md -> /news/spot-a-scam/
const news = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/news' }),
  schema: z.object({
    title: z.string(),
    dek: z.string(),
    category: z.enum(['Guides', 'Data & insight']),
    date: z.coerce.date(),
    cta: z.object({ label: z.string(), href: z.string() }),
    draft: z.boolean().optional(),
  }),
});

export const collections = { news };
