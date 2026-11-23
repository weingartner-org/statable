// P-NACH 4: Englisch-Probe der neuen Bloecke (Delphi, Q-Methode, Concept Mapping, Textanalyse, Papierbogen).
// Aufruf aus app/: PORT=5199 node e2e/probe/pnach-4-englisch.mjs   (Sprache en)
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
const AXE = readFileSync(new URL('../../node_modules/axe-core/axe.min.js', import.meta.url), 'utf8');
const BASE = 'http://127.0.0.1:' + (process.env.PORT || '5199') + '/';
const erg = { bloecke: [], fehler: [] };
const DEWORT = String.raw`[äöüßÄÖÜ]|\b(und|oder|nicht|für|mit|wird|werden|sind|keine|alle|Wörter|Fragen?|Antworten?|Aussagen?|Auswertung|Ergebnis|speichern|einlesen|öffnen|Spalte|Zeile|Hilfe|Wähle|Zahlen|Beispiel|Hinweis|welche|gibt|bitte|noch|nur|wenn|Fachleute|Sichtweisen|Bogen|Bögen)\b`;
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ locale: 'en-GB', viewport: { width: 1366, height: 900 }, acceptDownloads: true });
await ctx.addInitScript(() => { try { localStorage.setItem('statable-einst', JSON.stringify({ rundgang: false })); } catch {} });
const page = await ctx.newPage();
page.on('pageerror', (e) => erg.fehler.push(String(e.message).slice(0, 200)));
async function tabsSel(sel, hauptRe, max = 900) {
  await page.evaluate(() => { document.activeElement?.blur(); window.scrollTo(0, 0); });
  let bis = -1, haupt = -1, name = '';
  for (let n = 1; n < max; n++) {
    await page.keyboard.press('Tab');
    const t = await page.evaluate((s) => { const e = document.activeElement; return e && e.closest(s) ? ((e.getAttribute('aria-label') || e.textContent || '') + '').replace(/\s+/g, ' ').trim() : null; }, sel);
    if (t !== null && bis < 0) bis = n;
    if (t && hauptRe.test(t)) { haupt = n; name = t.slice(0, 80); break; }
  }
  return { bis, haupt, name };
}
async function messe(name, sel, hauptRe) {
  await page.evaluate((s) => { const d = document.querySelector(s); if (d && d.tagName === 'DETAILS') d.open = true; }, sel);
  await page.waitForTimeout(600);
  const tb = await tabsSel(sel, hauptRe);
  const b = { name, tabsBisBlock: tb.bis, tabsBisHauptknopf: tb.haupt, hauptknopf: tb.name, ueberlauf: {}, axe: {} };
  b.titel = await page.evaluate((s) => ((document.querySelector(s).querySelector('summary,h2,h3') || {}).textContent || '').replace(/\s+/g, ' ').trim(), sel);
  b.deutsch = await page.evaluate(({ s, w }) => {
    const re = new RegExp(w); const el = document.querySelector(s); const out = new Set();
    const tw = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    while (tw.nextNode()) { const n = tw.currentNode; const p = n.parentElement; if (!p || /SCRIPT|STYLE/.test(p.tagName)) continue; const t = n.textContent.replace(/\s+/g, ' ').trim(); if (t.length > 1 && re.test(t)) out.add('T: ' + t.slice(0, 110)); }
    el.querySelectorAll('[aria-label],[title],[placeholder],[alt]').forEach(e => ['aria-label', 'title', 'placeholder', 'alt'].forEach(a => { const v = e.getAttribute(a); if (v && re.test(v)) out.add(a + ': ' + v.slice(0, 110)); }));
    return [...out].slice(0, 25);
  }, { s: sel, w: DEWORT });
  for (const w of [375, 1280, 2560]) {
    await page.setViewportSize({ width: w, height: 900 }); await page.waitForTimeout(400);
    b.ueberlauf[w] = await page.evaluate((s) => ({ seite: document.documentElement.scrollWidth > innerWidth + 1, block: Math.round(document.querySelector(s).getBoundingClientRect().right) > innerWidth + 1 }), sel);
    await page.evaluate(AXE);
    b.axe[w] = await page.evaluate(async (s) => (await axe.run(document.querySelector(s), { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } })).violations.map(v => ({ id: v.id, n: v.nodes.length, ex: v.nodes.slice(0, 2).map(n => n.target.join(' ') + ' :: ' + (n.failureSummary || '').split('\n').slice(1, 3).join(' ').slice(0, 140)) })), sel);
  }
  await page.setViewportSize({ width: 1366, height: 900 });
  erg.bloecke.push(b);
}
await page.goto(BASE + '?sprache=en#beispiele/pruefungsangst', { waitUntil: 'load', timeout: 180000 });
await page.waitForSelector('button[aria-describedby="t-pruefungsangst"]', { timeout: 60000 }); await page.locator('button[aria-describedby="t-pruefungsangst"]').click();
await page.waitForTimeout(4000);
for (let i = 0; i < 10; i++) { if (await page.getByText(/How reliably does the scale measure/).first().isVisible().catch(() => false)) break; await page.getByRole('button', { name: 'Next question' }).click(); await page.waitForTimeout(300); }
await page.getByRole('button', { name: 'Open the question' }).click();
await page.waitForFunction(() => /#blatt\/(?!neu)/.test(location.hash), null, { timeout: 60000 });
await page.waitForSelector('details.delphi > summary', { timeout: 180000 }); await page.waitForTimeout(1500);
const HAUPT = /CSV/i;
await messe('Delphi', 'details.delphi', HAUPT);
await messe('Q-Methode', 'details.qmeth', HAUPT);
await messe('Concept Mapping', 'details.cmap', HAUPT);
await page.goto(BASE + '?sprache=en#kodieren/beispiel-mm', { waitUntil: 'load' }); await page.waitForTimeout(4000);
await page.goto(BASE + '?sprache=en#kodieren/woerter', { waitUntil: 'load' }); await page.waitForTimeout(4000);
if (await page.evaluate(() => !!document.querySelector('#ko-ta-t'))) await messe('Textanalyse', 'div.ta', /Whole word list as CSV/); else erg.bloecke.push({ name: 'Textanalyse', fehler: 'nicht erreicht', url: page.url() });
await page.goto(BASE + '?sprache=en#fragebogen', { waitUntil: 'load', timeout: 120000 }); await page.waitForTimeout(3000);
await page.getByRole('button', { name: 'Create new questionnaire' }).click();
await page.getByRole('button', { name: 'Add question' }).click();
await page.locator("#fb-ex-knopf").click(); await page.waitForTimeout(800);
const ex = '[aria-labelledby="fb-ex-bogen-t"]';
if (!(await page.evaluate((s) => !!document.querySelector(s), ex))) await page.evaluate(() => document.querySelectorAll('details').forEach(d => d.open = true));
if (await page.evaluate((s) => !!document.querySelector(s), ex)) await messe('Papierbogen-Export', ex, /Save answer sheet/); else erg.bloecke.push({ name: 'Papierbogen-Export', fehler: 'nicht sichtbar' });
if (await page.evaluate(() => !!document.querySelector('section.pb'))) await messe('Papierbogen einlesen', 'section.pb', /file|Choose|Select|Browse/i);
console.log(JSON.stringify(erg, null, 1));
await browser.close();
