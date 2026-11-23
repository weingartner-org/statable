// P-NACH 2: Papierbogen-Export in Fragebogen planen. Aufruf aus app/: PORT=5191 node e2e/probe/pnach-2-export.mjs
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
const AXE = readFileSync(new URL('../../node_modules/axe-core/axe.min.js', import.meta.url), 'utf8');
const BASE = 'http://127.0.0.1:' + (process.env.PORT || '5191') + '/';
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ locale: 'de-DE', viewport: { width: 1366, height: 900 } });
await ctx.addInitScript(() => { try { localStorage.setItem('statable-einst', JSON.stringify({ rundgang: false })); } catch {} });
const page = await ctx.newPage();
await page.goto(BASE + '?sprache=de#fragebogen', { waitUntil: 'load', timeout: 120000 });
await page.waitForTimeout(3000);
await page.getByRole('button', { name: 'Neuen Fragebogen anlegen' }).click();
await page.getByRole('button', { name: 'Frage hinzufügen' }).click();
await page.fill('#fb-fragetext-de', 'Rauchen Sie?');
await page.keyboard.press('Tab');
await page.waitForTimeout(800);
const sel = '[aria-labelledby="fb-ex-bogen-t"]';
let da = await page.evaluate((s) => !!document.querySelector(s), sel);
if (!da) {
  console.log('Knöpfe:', JSON.stringify(await page.evaluate(() => [...document.querySelectorAll('button,summary,a')].map(x => x.textContent.replace(/\s+/g, ' ').trim()).filter(t => /xport|speichern|teilen/i.test(t)).slice(0, 20))));
  for (const n of [/Exportieren/, /Speichern und Export/, /Export/, /Teilen/]) { const b = page.getByRole('button', { name: n }).first(); if (await b.count()) { await b.click().catch(() => {}); await page.waitForTimeout(800); da = await page.evaluate((s) => !!document.querySelector(s), sel); if (da) break; } }
  if (!da) await page.evaluate(() => document.querySelectorAll('details').forEach(d => d.open = true));
  da = await page.evaluate((s) => !!document.querySelector(s), sel);
}
const erg = { sichtbar: da, axe: {}, ueberlauf: {} };
if (da) {
  // Tabs vom Seitenanfang bis in den Block
  await page.evaluate(() => { document.activeElement?.blur(); window.scrollTo(0, 0); });
  let t = -1; for (let n = 1; n < 900; n++) { await page.keyboard.press('Tab'); if (await page.evaluate((s) => !!document.activeElement?.closest(s), sel)) { t = n; break; } }
  erg.tabs = t;
  for (const w of [375, 1280, 2560]) {
    await page.setViewportSize({ width: w, height: 900 }); await page.waitForTimeout(400);
    erg.ueberlauf[w] = await page.evaluate((s) => ({ seite: document.documentElement.scrollWidth > innerWidth + 1, block: Math.round(document.querySelector(s).getBoundingClientRect().right) > innerWidth + 1 }), sel);
    await page.locator(sel).screenshot({ path: 'C:/Entwicklung/autonom/pnach-ausgabe/pnach2-papierbogen-export-' + w + '.png' });
    if (w !== 2560) { await page.evaluate(AXE); erg.axe[w] = await page.evaluate(async (s) => (await axe.run(document.querySelector(s), { runOnly: { type: 'tag', values: ['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa'] } })).violations.map(v => ({ id: v.id, n: v.nodes.length, ex: v.nodes.slice(0,2).map(n => n.target.join(' ') + ' :: ' + (n.failureSummary||'').slice(0,140)) })), sel); }
  }
}
console.log(JSON.stringify(erg, null, 1));
await browser.close();
