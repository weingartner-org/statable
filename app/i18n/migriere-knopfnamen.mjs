#!/usr/bin/env node
/**
 * Einmalig (31.10.2026): Wenn ein Hilfetext geändert wird, ändert sich sein Schlüssel (Hash aus de + en). Dieses Skript übernimmt die Übersetzungen
 * der 13 Sprachen unter dem alten Schlüssel in den neuen und gleicht dabei die zitierten Knopfnamen an den Namen der Oberfläche in der Sprache an.
 *   node i18n/migriere-knopfnamen.mjs <katalog-alt.json>      (vorher: Quelltext ändern, dann `node i18n/katalog.mjs`; die ALTE katalog.json aus git sichern)
 * Gleich bleibende Zitate bleiben unberührt. Meldet Fälle, die nicht eindeutig zuzuordnen sind.
 */
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
const alt = JSON.parse(readFileSync(process.argv[2], 'utf8')), neu = JSON.parse(readFileSync('src/i18n/katalog.json', 'utf8'));
const norm = s => String(s).trim().replace(/[.…:]+$/, '');
const QDE = /„([^“]{2,60})“/g, QEN = /"([^"]{2,60})"/g;
const quotes = (t, re) => (re === QEN ? t.split('"').filter((_, i) => i % 2 === 1).map(norm) : [...t.matchAll(re)].map(m => norm(m[1])));
const entf = Object.keys(alt).filter(k => !neu[k] && alt[k].orte.some(o => o.startsWith('hilfe/')));
const neuK = Object.keys(neu).filter(k => !alt[k]);
const paare = [];
for (const k of entf) {
  let c = neuK.filter(n => neu[n].de === alt[k].de);
  if (c.length !== 1) c = neuK.filter(n => neu[n].de.slice(0, 20) === alt[k].de.slice(0, 20) && neu[n].en.slice(0, 20) === alt[k].en.slice(0, 20));
  if (c.length === 1) paare.push([k, c[0]]); else console.log('NICHT ZUGEORDNET', k, alt[k].de.slice(0, 60), c.length);
}
console.log(paare.length, 'Paare');
const sprachen = readdirSync('src/i18n/sprachen').filter(f => /^[a-z]{2}\.json$/.test(f) && f !== 'xx.json').map(f => f.slice(0, 2));
const lade = (c, h) => { const f = `src/i18n/sprachen/${c}${h ? '.hilfe' : ''}.json`; return [f, JSON.parse(readFileSync(f, 'utf8'))]; };
const UEBERSETZUNG = (c, d, e) => { // Oberflächentext, dessen Name de/en ist
  const k = Object.keys(neu).find(k => typeof neu[k].de === 'string' && norm(neu[k].de) === d && typeof neu[k].en === 'string' && norm(neu[k].en) === e && !neu[k].orte.every(o => o.startsWith('hilfe/')));
  if (!k) return null;
  const v = lade(c, false)[1][k]; return typeof v === 'string' ? norm(v) : null;
};
const QUOTE = /([«„“”"‹])([^«»„“”"‹›]{2,80})([»“”"›])/g;
for (const c of sprachen) {
  const [fh, hilfe] = lade(c, true), [fk, kern] = lade(c, false);
  let bewegt = 0, angepasst = 0;
  for (const [k, n] of paare) {
    const ziel = k in hilfe ? hilfe : k in kern ? kern : null;
    if (!ziel) { console.log(c, 'fehlt', k); continue; }
    let t = ziel[k];
    if (typeof t === 'string') {
      const dA = quotes(alt[k].de, QDE), dN = quotes(neu[n].de, QDE), eA = quotes(alt[k].en, QEN), eN = quotes(neu[n].en, QEN);
      const qs = [...t.matchAll(QUOTE)];
      if (qs.length === dN.length && dN.length === eN.length) {
        const ersatz = new Map();
        for (let i = 0; i < qs.length; i++) {
          if (dA[i] === dN[i] && eA[i] === eN[i]) continue;
          if (dA[i] !== dN[i]) { // ganzer Artikeltitel: Frage in das Zitat, Fachwort in Klammern dahinter
            const tk = Object.keys(neu).find(x => neu[x].de === 'Hängt ein Zusammenhang bei gleicher dritter Zahl noch? (Partialkorrelation)');
            const tt = tk && (hilfe[tk] ?? kern[tk]);
            const m = typeof tt === 'string' && tt.match(/^(.*?)\s*\(([^()]*)\)\s*$/);
            if (m) ersatz.set(i, [m[1].replace(/[.…:]+$/, m[1].endsWith('?') ? '' : ''), ` (${m[2]})`]); else console.log(c, 'Titel nicht lesbar');
          } else { const u = UEBERSETZUNG(c, dN[i], eN[i]); if (u) ersatz.set(i, [u, '']); else console.log(c, 'Oberflächenname fehlt:', dN[i], '/', eN[i]); }
        }
        let i = 0;
        const t2 = t.replace(QUOTE, (m, a, x, b) => { const r = ersatz.get(i++); if (!r) return m; angepasst++; const [, vor, , nach] = x.match(/^(\s*)([\s\S]*?)(\s*)$/); return `${a}${vor}${r[0]}${nach}${b}${r[1]}`; });
        t = t2;
      } else console.log(c, 'Zitate nicht gleich viele', k, qs.length, dN.length, eN.length);
    }
    ziel[n] = t; delete ziel[k]; bewegt++;
  }
  const sortiert = o => Object.fromEntries(Object.entries(o).sort(([a], [b]) => (a < b ? -1 : 1)));
  writeFileSync(fh, JSON.stringify(sortiert(hilfe), null, 1) + '\n'); writeFileSync(fk, JSON.stringify(sortiert(kern), null, 1) + '\n');
  console.log(c, bewegt, 'verschoben,', angepasst, 'Namen angeglichen');
}
