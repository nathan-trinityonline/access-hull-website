#!/usr/bin/env node
// Builds public/js/mobile-data.js: predicted mobile signal for every Hull ward, per network.
//
// 1. Lists every live postcode in Kingston upon Hull (E06000010) and its ward from the
//    ONS Postcode Directory (open data, Open Government Licence).
// 2. Asks Ofcom's mobile coverage API about each postcode. Ofcom answers with one row per
//    address (UPRN), giving EE, Three, O2 and Vodafone signal for calls and data,
//    indoors and outdoors: 4 = good ("likely"), 3 = limited, 0 = none.
// 3. Counts addresses per ward and writes the totals (no address-level data is kept).
//
// Needs a free key from https://api.ofcom.org.uk/signup (subscribe to "Mobile coverage"):
//   OFCOM_API_KEY=xxxx node scripts/fetch-mobile-coverage.mjs
// Options: --limit 50 (only the first 50 postcodes, for a quick test)
//          --out path (default public/js/mobile-data.js)
// The free plan allows 100 calls a minute and 50,000 a month; Hull has about 7,000 postcodes,
// so a full run takes a bit over an hour.

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : def; };
const LIMIT = Number(opt('--limit', 0)) || 0;
const OUT = path.resolve(ROOT, opt('--out', 'public/js/mobile-data.js'));
const KEY = process.env.OFCOM_API_KEY;
const OFCOM = (process.env.OFCOM_API_BASE || 'https://api-proxy.ofcom.org.uk').replace(/\/$/, '');
const ONSPD = (process.env.ONSPD_URL || 'https://services1.arcgis.com/ESMARspQHYMw9BZ9/arcgis/rest/services/Online_ONS_Postcode_Directory_Live/FeatureServer/0').replace(/\/$/, '');
const HULL = 'E06000010';
const PER_MINUTE = Number(process.env.OFCOM_PER_MINUTE || 90); // stay under the free plan's 100/min

const OPS = { EE: 'EE', TF: 'O2', H3: 'Three', VO: 'Vodafone' };
const MEASURES = { DataIndoor: 'di', DataOutdoor: 'do', VoiceIndoor: 'vi', VoiceOutdoor: 'vo' };
const FIELD = /^(EE|H3|TF|VO)(Voice|Data)(Indoor|Outdoor)$/i;

if (!KEY) { console.error('OFCOM_API_KEY is not set. Get a free key at https://api.ofcom.org.uk/signup'); process.exit(1); }

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function getJSON(url, init = {}, tries = 5) {
  for (let i = 1; ; i++) {
    let res;
    try { res = await fetch(url, init); } catch (e) { if (i >= tries) throw e; await sleep(2000 * i); continue; }
    if (res.status === 404) return null;
    if (res.ok) return res.json();
    if (res.status === 401 || res.status === 403) throw new Error(`${res.status} from ${new URL(url).host}: check the API key and that it is subscribed to Mobile coverage`);
    if (i >= tries) throw new Error(`${res.status} from ${url}`);
    await sleep((res.status === 429 ? 20000 : 3000) * i);
  }
}

// Ward names and codes come from the existing map, so the two always line up.
async function hullWards() {
  const src = await readFile(path.join(ROOT, 'public/js/ward-data.js'), 'utf8');
  const byCode = {};
  for (const m of src.matchAll(/"([^"]+)": \{"code": "(E05\d+)"/g)) byCode[m[2]] = m[1];
  if (Object.keys(byCode).length < 21) throw new Error('Could not read the 21 Hull wards from public/js/ward-data.js');
  return byCode;
}

// Field names in the ONS directory carry the boundary year (LAD26CD, WD26CD...), so look them up.
async function hullPostcodes() {
  const meta = await getJSON(`${ONSPD}?f=json`);
  const names = (meta.fields || []).map((f) => f.name);
  const latest = (re) => names.filter((n) => re.test(n)).sort().pop();
  const lad = latest(/^LAD\d+CD$/i), wd = latest(/^WD\d+CD$/i);
  const pcds = names.find((n) => /^PCDS$/i.test(n)), doterm = names.find((n) => /^DOTERM$/i.test(n));
  if (!lad || !wd || !pcds) throw new Error(`ONS postcode directory fields not found (have: ${names.join(', ')})`);
  const where = `${lad}='${HULL}'` + (doterm ? ` AND ${doterm} IS NULL` : '');
  const out = [];
  for (let offset = 0; ; ) {
    const q = new URLSearchParams({ where, outFields: `${pcds},${wd}`, returnGeometry: 'false', orderByFields: pcds, resultOffset: String(offset), resultRecordCount: '2000', f: 'json' });
    const page = await getJSON(`${ONSPD}/query?${q}`);
    if (page?.error) throw new Error(`ONS query failed: ${JSON.stringify(page.error)}`);
    const feats = page?.features || [];
    for (const f of feats) out.push({ pc: f.attributes[pcds], ward: f.attributes[wd] });
    offset += feats.length;
    if (!feats.length || !page.exceededTransferLimit) break;
  }
  return { list: out, wardField: wd };
}

// Ofcom returns an array of envelopes, each with an Availability array (one row per address).
function addressRows(body) {
  const rows = [];
  const walk = (v) => {
    if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === 'object') {
      if (Object.keys(v).some((k) => FIELD.test(k))) rows.push(v);
      else Object.values(v).forEach(walk);
    }
  };
  walk(body);
  return rows;
}

const level = (v) => { const n = Number(v); return n >= 4 ? 0 : n === 3 ? 1 : 2; }; // index into [good, limited, none]

function emptyWard() {
  const w = { n: 0, postcodes: 0 };
  for (const op of [...Object.values(OPS), 'Any']) { w[op] = {}; for (const m of Object.values(MEASURES)) w[op][m] = [0, 0, 0]; }
  return w;
}

function tally(w, row) {
  const best = {};
  for (const [k, v] of Object.entries(row)) {
    const m = FIELD.exec(k); if (!m) continue;
    const op = OPS[m[1].toUpperCase()];
    const key = MEASURES[m[2][0].toUpperCase() + m[2].slice(1).toLowerCase() + m[3][0].toUpperCase() + m[3].slice(1).toLowerCase()];
    const lv = level(v);
    w[op][key][lv]++;
    best[key] = Math.min(best[key] ?? 2, lv);
  }
  for (const [key, lv] of Object.entries(best)) w.Any[key][lv]++;
  w.n++;
}

const main = async () => {
  const byCode = await hullWards();
  const { list, wardField } = await hullPostcodes();
  const known = list.filter((p) => byCode[p.ward]);
  console.log(`ONS: ${list.length} live Hull postcodes (${wardField}); ${known.length} in a known ward.`);
  if (!known.length) throw new Error('No Hull postcodes matched a ward. The ward codes may have changed.');
  const todo = LIMIT ? known.slice(0, LIMIT) : known;

  const wards = Object.fromEntries(Object.values(byCode).map((n) => [n, emptyWard()]));
  const gap = Math.ceil(60000 / PER_MINUTE);
  let done = 0, missing = 0, next = Date.now();
  for (const p of todo) {
    const wait = next - Date.now(); if (wait > 0) await sleep(wait);
    next = Date.now() + gap;
    const pc = p.pc.replace(/\s+/g, '').toUpperCase();
    const body = await getJSON(`${OFCOM}/mobile/coverage/${encodeURIComponent(pc)}`, { headers: { 'Ocp-Apim-Subscription-Key': KEY, Accept: 'application/json' } });
    const rows = body ? addressRows(body) : [];
    const w = wards[byCode[p.ward]];
    if (rows.length) w.postcodes++; else missing++;
    rows.forEach((r) => tally(w, r));
    if (++done % 250 === 0) console.log(`  ${done}/${todo.length} postcodes`);
  }

  const premises = Object.values(wards).reduce((s, w) => s + w.n, 0);
  console.log(`Ofcom: ${premises} addresses in ${todo.length - missing} postcodes (${missing} postcodes had no data).`);
  if (!premises) throw new Error('Ofcom returned no addresses, so nothing was written.');
  const data = {
    updated: new Date().toISOString().slice(0, 10),
    postcodes: todo.length - missing,
    premises,
    partial: Boolean(LIMIT),
    wards,
  };
  const js = `// Predicted mobile signal by Hull ward and network. Built by scripts/fetch-mobile-coverage.mjs; do not edit by hand.\n`
    + `// Each measure is [good, limited, none] counts of addresses. Sources: Ofcom mobile coverage API; ONS Postcode Directory (OGL).\n`
    + `const MOB=${JSON.stringify(data)};\n`;
  await writeFile(OUT, js);
  console.log(`Wrote ${path.relative(ROOT, OUT)}`);
};

main().catch((e) => { console.error(e.message || e); process.exit(1); });
