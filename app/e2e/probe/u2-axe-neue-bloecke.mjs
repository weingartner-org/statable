// U2: axe über neue Seiten (#planung, #fragebogen, #interviews), 375/1280 px, de/en. Aufruf aus app/: PORT=5191 node e2e/probe/u2-axe-neue-bloecke.mjs
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const APP = fileURLToPath(new URL('../..', import.meta.url));
const AXE = readFileSync(path.join(APP, 'node_modules/axe-core/axe.min.js'), 'utf8');
const BASE = 'http://127.0.0.1:' + (process.env.PORT || '5191') + '/';
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const SEITEN = ['#planung', '#fragebogen', '#interviews'];
const browser = await chromium.launch({ headless: true });
for (const sp of ['de', 'en']) for (const w of [375, 1280]) {
  const ctx = await browser.newContext({ locale: sp === 'en' ? 'en-GB' : 'de-DE', viewport: { width: w, height: 900 } });
  await ctx.addInitScript(() => { try { localStorage.setItem('statable-einst', JSON.stringify({ rundgang: false })); } catch {} });
  const page = await ctx.newPage();
  for (const s of SEITEN) {
    await page.goto(BASE + '?sprache=' + sp + s, { waitUntil: 'load', timeout: 120000 });
    await page.waitForTimeout(3000);
    // alle Klappen öffnen (details), ohne Navigation
    await page.evaluate(() => document.querySelectorAll('main details, #inhalt details').forEach(d => d.open = true));
    await page.waitForTimeout(500);
    await page.evaluate(AXE);
    const r = await page.evaluate(async (tags) => (await axe.run(document, { runOnly: { type: 'tag', values: tags } })).violations.map(v => ({ id: v.id, impact: v.impact, n: v.nodes.length, ex: v.nodes.slice(0, 3).map(n => n.target.join(' ') + ' :: ' + (n.failureSummary || '').split('\n').slice(1, 3).join(' ').slice(0, 160)) })), TAGS);
    console.log(sp, w, s, r.length ? JSON.stringify(r, null, 1) : 'axe 0');
  }
  await ctx.close();
}
await browser.close();
