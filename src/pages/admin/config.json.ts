// The content editor reads its settings from /admin/config.json, a copy of
// public/admin/config.yml made at build time. Some hosts refuse to serve .yml
// files, and Decap then starts with no collections.
import { readFileSync } from 'node:fs';
import { parse } from 'yaml';

export const GET = () =>
  new Response(JSON.stringify(parse(readFileSync('public/admin/config.yml', 'utf8'))), {
    headers: { 'Content-Type': 'application/json' },
  });
