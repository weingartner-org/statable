// D1 (WCAG 3.1.2): Klammern mit englischem Fachbegriff ohne lang="en" in der gerenderten Seite (deutsch).
// Aufruf: PORT=4199 node e2e/probe/d1-sprache.mjs [route ...]   Ohne Routen: alle Hauptrouten.
// Zählt (a) Klammern, die in englische-klammern.json stehen, aber ohne lang="en" ausgegeben werden (sicher falsch),
//        (b) Kandidaten: Klammern mit rein englisch aussehendem Wortlaut, nicht in der Liste (zur Sichtprüfung).
import { chromium, } from '@playwright/test';
import { readFileSync } from 'node:fs';
const liste = new Set(JSON.parse(readFileSync(new URL('../../src/lib/englische-klammern.json', import.meta.url), 'utf8')).map(s => s.toLowerCase().replace(/\s+/g, ' ').trim()));
const U = `http://127.0.0.1:${process.env.PORT || 4199}/`;
const ROUTEN = process.argv.length > 2 ? process.argv.slice(2) : ["start","beispiele","daten","spalten","umformen","karte","blatt","protokoll","befehle","bericht","einstellungen","hilfe","planen","verstehen","lernen","impressum","datenschutz","behoerden","tabelle","amtlich","bearbeiten","blatt/neu","hilfe/daten-vorbereiten","hilfe/fallgewichte","hilfe/fragility-index","hilfe/posterior-predictive","hilfe/faktorenanalyse","bearbeiten/umkodieren","bearbeiten/berechnen","bearbeiten/zusammen","lernen/thema/daten","lernen/pfad/grundlagen","verstehen/verteilungen","verstehen/kennzahlen","verstehen/vergleich","verstehen/anteilstest","verstehen/regression","verstehen/zeitreihen","verstehen/cluster"];
const b = await chromium.launch(); const page = await (await b.newContext({ locale: 'de-DE', viewport: { width: 1280, height: 800 } })).newPage();
await page.goto(U + '#beispiele'); await page.waitForTimeout(1500);
await page.getByRole('button', { name: /Öffnen und üben/ }).first().click(); await page.waitForTimeout(2500);
let a = 0, c = 0; const kand = new Map();
for (const r of ROUTEN) {
  await page.goto(U + '#' + r); await page.waitForTimeout(900);
  const gef = await page.evaluate(() => {
    const aus = []; const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n; (n = w.nextNode());) {
      const p = n.parentElement; if (!p || ['SCRIPT', 'STYLE'].includes(p.tagName)) continue;
      if (p.closest('[lang="en"]')) continue;
      for (const m of n.nodeValue.matchAll(/\(([^()]{3,60})\)/g)) aus.push([m[1], (p.className || p.tagName).toString().slice(0, 40)]);
    }
    return aus;
  });
  for (const [t, k] of gef) {
    const norm = t.toLowerCase().replace(/\s+/g, ' ').trim();
    if (liste.has(norm)) { a++; console.log('FALSCH', r, '|', t, '|', k); }
    else if (/^[A-Za-z][A-Za-z' -]+$/.test(t) && /[a-z]/.test(t) && (process.env.EINZEL || t.includes(' '))) { c++; kand.set(t, (kand.get(t) || 0) + 1); }
  }
}
console.log('ohne lang, in Liste:', a, '| Kandidaten (Mehrwort, nicht in Liste):', c, 'verschiedene', kand.size);
console.log([...kand.entries()].map(([t, n]) => t + ' x' + n).join('\n'));
await b.close();
