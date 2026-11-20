#!/usr/bin/env node
/** Hilfe gegen Oberfläche: zitierte Namen («…», „…”, „…“, “…”) in out-hilfe-*.json, die in keinem Oberflächen-Text der Sprache vorkommen.
 *  Aufruf (in app/): node i18n/knoepfe.mjs ../docs/sprachen/<code>-arbeit [src/lib/messages.<code>.json]   - Leitfaden Falle 24 */
import { readFileSync, readdirSync } from 'node:fs';
const [dir, ...weitere] = process.argv.slice(2); // weitere: z. B. src/lib/messages.<code>.json (Erklärtexte) mitprüfen
const flach = o => Object.values(o).flatMap(v => typeof v === 'string' ? [v] : v && typeof v === 'object' ? flach(v) : []);
const ui = new Set(), alle = [];
for (const f of readdirSync(dir).filter(f => /^out-(oberflaeche|lib|bausteine|saetze)\.json$/.test(f))) for (const t of flach(JSON.parse(readFileSync(`${dir}/${f}`, 'utf8')))) { ui.add(t.trim().replace(/[.…:]+$/, '')); alle.push(t); }
const fehl = new Map();
for (const f of [...readdirSync(dir).filter(f => /^out-hilfe/.test(f)).map(f => `${dir}/${f}`), ...weitere]) {
  const o = JSON.parse(readFileSync(f, 'utf8'));
  const eintraege = f.includes('messages.') ? flach(o).map((t, i) => [`${f.split('/').pop()}#${i}`, t]) : Object.entries(o);
  for (const [k, t] of eintraege) for (const m of String(t).matchAll(/[«„“”]([^«»„“”]{2,60})[»”“]/g)) { // « », „ ” (pl, ro), „ “ (cs, bg), “ ” (nl), ” ” (sv)
    const n = m[1].trim().replace(/[.…:]+$/, '');
    if (!ui.has(n) && !alle.some(a => a.includes(n))) fehl.set(n, (fehl.get(n) ?? []).concat(k));
  }
}
for (const [n, ks] of fehl) console.log(`${n}\t${ks.slice(0, 3).join(',')}`);
console.log(fehl.size, 'nicht gefunden');
