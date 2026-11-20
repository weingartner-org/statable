// D8 (WCAG 1.4.1 Benutzung von Farbe): (1) Graustufen-Fotos wichtiger Seiten, (2) Diagramme: Farbgruppen mit zweitem Merkmal (Form, Strichart, Beschriftung)?,
// (3) ungültige Eingaben mit Text, (4) Üben: Richtig/Falsch als Text, (5) Fortschrittsring/Balken mit Form.
// Aufruf: PORT=4199 node e2e/probe/d8-farbe.mjs   (Fotos nach e2e/ergebnisse/d8/)
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
const U = `http://127.0.0.1:${process.env.PORT || 4199}/`;
mkdirSync('e2e/ergebnisse/d8', { recursive: true });
const b = await chromium.launch(); const page = await (await b.newContext({ locale: 'de-DE', viewport: { width: 1280, height: 900 } })).newPage();
await page.goto(U + '#beispiele'); await page.waitForTimeout(1500);
await page.getByRole('button', { name: /Öffnen und üben/ }).first().click(); await page.waitForTimeout(2500);
const grau = () => page.addStyleTag({ content: 'html{filter:grayscale(1)!important}' });
// (2) Diagramme
const ROUTEN = ['verstehen/verteilungen', 'verstehen/kennzahlen', 'verstehen/vergleich', 'verstehen/anteilstest', 'verstehen/regression', 'verstehen/zeitreihen', 'verstehen/cluster', 'planen', 'blatt', 'lernen'];
for (const r of ROUTEN) {
  await page.goto(U + '#' + r); await page.waitForTimeout(1000);
  const ergebnis = await page.evaluate(() => {
    const aus = [];
    for (const svg of document.querySelectorAll('#inhalt svg')) {
      if (svg.closest('.logo') || (svg.getAttribute('aria-hidden') === 'true' && svg.getBoundingClientRect().width < 40)) continue;
      const farben = new Map();
      for (const e of svg.querySelectorAll('path,line,polyline,circle,rect,polygon,ellipse')) {
        const s = getComputedStyle(e); const r = e.getBoundingClientRect(); if (r.width * r.height < 2 && e.tagName !== 'line' && e.tagName !== 'polyline') continue;
        for (const k of ['stroke', 'fill']) { const c = s[k]; if (!c || c === 'none' || c === 'rgba(0, 0, 0, 0)') continue; const a = farben.get(c) || { n: 0, art: new Set(), dash: new Set() }; a.n++; a.art.add(e.tagName); a.dash.add(s.strokeDasharray); farben.set(c, a); }
      }
      const texte = [...svg.querySelectorAll('text')].map(t => t.textContent.trim()).filter(Boolean);
      const daten = [...farben.entries()].filter(([c, a]) => a.n >= 1);
      aus.push({ titel: (svg.querySelector('title')?.textContent || svg.getAttribute('aria-label') || '').slice(0, 50), farben: daten.map(([c, a]) => c + ' x' + a.n + ' ' + [...a.art].join('/') + ' dash=' + [...a.dash].join('|')), texte: texte.length, legendeInSvg: texte.some(t => t.length > 3) });
    }
    return aus;
  });
  console.log('##', r, 'SVGs', ergebnis.length);
  for (const g of ergebnis) console.log('   ', g.titel, '| Farben', g.farben.length, '| Texte', g.texte, '|', g.farben.slice(0, 6).join(' ; '));
  await grau(); await page.screenshot({ path: `e2e/ergebnisse/d8/${r.replace(/\//g, '_')}.png` }); await page.reload(); await page.waitForTimeout(800);
}
// (3) ungültige Eingabe (Planen)
await page.goto(U + '#planen'); await page.waitForTimeout(1000);
const feld = page.locator('input[type=text]').first(); await feld.fill('abc'); await feld.blur(); await page.waitForTimeout(300);
const inv = await page.evaluate(() => [...document.querySelectorAll('[aria-invalid="true"]')].map(e => ({ id: e.id, hilfe: (e.getAttribute('aria-describedby') || '').split(' ').map(i => document.getElementById(i)?.textContent.trim().slice(0, 80)).filter(Boolean) })));
console.log('## ungültige Eingaben (Planen):', JSON.stringify(inv));
await b.close();
