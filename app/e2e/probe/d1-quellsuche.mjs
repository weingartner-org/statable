// D1: Quellsuche: Stellen im Quelltext (ohne Glossare, Sprachdateien, Tests), an denen ein Begriff aus englische-klammern.json in Klammern steht.
// Jede Stelle ist ein Hinweis: Wird der Text über <Sprachteile> ausgegeben, bekommt die Klammer lang="en"; feste Texte in L(de,en) bekommen es nicht.
// Aufruf: node e2e/probe/d1-quellsuche.mjs
import fs from 'node:fs'; import path from 'node:path';
const liste = JSON.parse(fs.readFileSync(new URL('../../src/lib/englische-klammern.json', import.meta.url), 'utf8'));
const dateien = [];
(function geh(d) { for (const f of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, f.name); if (f.isDirectory()) { if (['sprachen', 'glossar', 'node_modules'].includes(f.name)) continue; geh(p); } else if (/\.(svelte|ts)$/.test(f.name) && !/\.test\.ts$/.test(f.name)) dateien.push(p); } })('src');
const SOND = new Set('.*+?^${}()|[]' + String.fromCharCode(92));
const maske = t => [...t].map(c => (SOND.has(c) ? String.fromCharCode(92) + c : c === ' ' ? '[ -]' : c)).join('');
const rx = new RegExp(String.fromCharCode(92) + '((' + liste.map(maske).join('|') + ')' + String.fromCharCode(92) + ')', 'i');
let n = 0; const je = {};
for (const f of dateien) fs.readFileSync(f, 'utf8').split(/\r?\n/).forEach((z, i) => { const m = z.match(rx); if (m) { n++; (je[f.split(String.fromCharCode(92)).join('/')] ||= []).push(`${i + 1}:${m[1]}`); } });
console.log('Zeilen', n, 'Dateien', Object.keys(je).length);
for (const k in je) console.log(k, je[k].length, je[k].slice(0, 4).join(' ; '));
// Zweiter Teil: nur das DEUTSCHE Argument von L(de, en) / Lp / P (Text vor dem ersten Trenner zwischen den zwei Argumenten).
const SEP = [`', '`, `", "`, '`, `'];
let nd = 0; const jd = {};
for (const f of dateien) fs.readFileSync(f, 'utf8').split(/\r?\n/).forEach((z, i) => {
  for (const m of z.matchAll(/\b(?:L|Lp|P|Lx|T)\(\s*(['"`])/g)) {
    const von = m.index + m[0].length; const rest = z.slice(von); const q = m[1];
    const ende = rest.indexOf(q + ',');   // Ende des ersten Arguments
    if (ende < 0) continue; const de = rest.slice(0, ende); const t = de.match(rx);
    if (t) { nd++; (jd[f.split(String.fromCharCode(92)).join('/')] ||= []).push(`${i + 1}:${t[1]}`); }
  }
});
console.log('--- deutsches Argument von L/Lp/P enthält englische Klammer:', nd, 'Zeilen in', Object.keys(jd).length, 'Dateien');
for (const k in jd) console.log(k, jd[k].length, jd[k].slice(0, 5).join(' ; '));
