import { getCollection } from 'astro:content';

export const CATEGORIES = ['All', 'Guides', 'Data & insight'];

const words = (s: string) => s.replace(/<[^>]+>/g, ' ').replace(/[#*>_`-]/g, ' ').split(/\s+/).filter(Boolean).length;

export const formatDate = (d: Date) =>
  d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/London' });

/** Published posts, newest first, with reading time and a stable index for the card artwork. */
export async function getPosts() {
  const all = await getCollection('news', ({ data }) => !data.draft);
  return all
    .sort((a, b) => b.data.date.getTime() - a.data.date.getTime())
    .map((p, i) => ({
      ...p,
      i,
      mins: Math.max(2, Math.round((words(p.body || '') + words(p.data.dek)) / 200)),
      href: `/news/${p.id}/`,
    }));
}
export type Post = Awaited<ReturnType<typeof getPosts>>[number];
