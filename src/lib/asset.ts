// Adds a content hash to files in public/ (e.g. /js/site.js?v=1a2b3c4d).
// The host caches /js/ files for a year, so without this, returning visitors keep old scripts and data.
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';

const cache = new Map<string, string>();
export function asset(p: string): string {
  if (!cache.has(p)) {
    const buf = readFileSync(path.join(process.cwd(), 'public', p));
    cache.set(p, `${p}?v=${createHash('sha1').update(buf).digest('hex').slice(0, 8)}`);
  }
  return cache.get(p)!;
}
