// Erzeugt src/lib/englische-klammern.json: die Klammertexte, die als Englisch gekennzeichnet werden (WCAG 3.1.2).
// Regel: (1) der Klammertext steht (ohne Groß-/Kleinschreibung) als Titel oder als Klammer in der ENGLISCHEN Glossar-Datei,
// (2) er besteht aus mindestens zwei Wörtern (Einzelwörter wie „Test“, „Median“, „Norm“ sind auch deutsch) oder steht in EINZELWOERTER,
// (3) er steht wirklich in Klammern in einem nicht englischen Text, (4) er ist kein Latein (LATEIN) und keine Formel.
// Aufruf: node scripts/englische-klammern-erzeugen.mjs
import fs from 'node:fs';
const dir = new URL('../src/hilfe/glossar/', import.meta.url);
const norm = s => s.toLowerCase().replace(/-/g, ' ').replace(/\s+/g, ' ').trim();   // Bindestrich wie Leerzeichen (D1, 07.11.)
export const EINZELWOERTER = ['Overfitting', 'Underfitting', 'Faking', 'Shrinkage', 'Surprisal', 'Prewhitening', 'Detrending', 'Seed'];
// Eigennamen und deutsch-englische Mischformen: nicht als Englisch kennzeichnen (Namen gehören keiner Sprache, Mischformen hätten falsche Aussprache).
export const NAMEN = ['kaiser meyer olkin', 'lincoln petersen', 'ryan einot gabriel welsch', 'tucker lewis index', 'granger test', 'fisher z test', 'steel dwass', 'anderson rubin', 'derSimonian laird', 'paule mandel', 'peto peto', 'tarone ware', 'ansari bradley', 'goodman kruskal tau', 'newey west', 'greenhouse geisser'];
export const LATEIN = ['a priori', 'a posteriori', 'post hoc', 'post hoc power', 'per capita', 'per se', 'vice versa', 'x bar', 'y hat'];
const en = JSON.parse(fs.readFileSync(new URL('en.json', dir), 'utf8'));
const E = new Set();
for (const id in en) { const t = en[id].titel; E.add(norm(t)); for (const m of t.matchAll(/\(([^()]+)\)/g)) E.add(norm(m[1])); E.add(norm(t.replace(/\s*\([^()]*\)/g, ''))); const o = norm(t.replace(/\s*\([^()]*\)/g, '')); if (o.split(' ').length >= 3) E.add(o.split(' ').slice(0, -1).join(' ')); /* „Case-cohort study“ -> „Case-cohort“ */ }
const gefunden = new Map();
const scan = s => { if (typeof s !== 'string') return; for (const m of s.matchAll(/\(([^()]{3,70})\)/g)) { const k = norm(m[1]); if (!E.has(k) || /[,;=|]/.test(k) || LATEIN.includes(k) || NAMEN.map(norm).includes(k)) continue; const mehr = k.includes(' ') && /[a-z]{3,}/.test(k) && k.split(' ').length <= 6; if (mehr || EINZELWOERTER.map(norm).includes(k)) gefunden.set(k, m[1]); } };
const geh = o => { if (typeof o === 'string') scan(o); else if (o && typeof o === 'object') Object.values(o).forEach(geh); };
for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.json') && f !== 'en.json')) geh(JSON.parse(fs.readFileSync(new URL(f, dir), 'utf8')));
const liste = [...gefunden.keys()].sort();
if (process.argv[1]?.endsWith('englische-klammern-erzeugen.mjs')) { fs.writeFileSync(new URL('../src/lib/englische-klammern.json', import.meta.url), JSON.stringify(liste, null, 0) + '\n'); console.log(liste.length, 'Einträge'); }
