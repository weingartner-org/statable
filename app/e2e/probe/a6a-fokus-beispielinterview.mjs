// A6a: Fokus nach „Beispielinterview laden“ (nur Tastatur) + axe. Aufruf aus app/:  PORT=4311 node e2e/probe/a6a-fokus-beispielinterview.mjs
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const APP = fileURLToPath(new URL('../..', import.meta.url));
const BASE = 'http://127.0.0.1:' + (process.env.PORT || '4311') + '/';
const AXE = readFileSync(path.join(APP, 'node_modules/axe-core/axe.min.js'), 'utf8');
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ locale: 'de-DE', viewport: { width: 1366, height: 850 } });
await ctx.addInitScript(() => { try { localStorage.setItem('statable-einst', JSON.stringify({ rundgang: false })); } catch {} });
const page = await ctx.newPage();
const fehler = [];
page.on('pageerror', (e) => fehler.push(String(e.message).slice(0, 200)));
await page.goto(BASE + '#interviews', { timeout: 180000, waitUntil: 'load' });
await page.waitForSelector('#iv-beispiel', { timeout: 180000 });
const aktiv = () => page.evaluate(() => { const a = document.activeElement; return { id: a?.id ?? '', tag: a?.tagName, name: (a?.getAttribute('aria-label') || a?.textContent || '').trim().slice(0, 80) }; });
let n = 0;
while ((await aktiv()).id !== 'iv-beispiel' && n++ < 400) await page.keyboard.press('Tab');
console.log('Tabs bis Beispiel-Knopf:', n, JSON.stringify(await aktiv()));
await page.keyboard.press('Enter');
await page.waitForSelector('[id^="iv-zeile-"]', { timeout: 60000 });
await page.waitForTimeout(2500);
console.log('Fokus nach Laden:', JSON.stringify(await aktiv()));
let t = 0, a = await aktiv();
while (!/^Feinstrukturanalyse beginnen/.test(a.name) && t < 400) { await page.keyboard.press('Tab'); t++; a = await aktiv(); }
console.log('Tabs bis Feinstrukturanalyse beginnen (nachher):', t, JSON.stringify(a), '(vorher laut Befund: 122)');
await page.evaluate(AXE.length ? AXE : '');
const x = await page.evaluate(async () => (await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa', 'best-practice'] } })).violations.map(v => ({ id: v.id, n: v.nodes.length, ziel: v.nodes.slice(0, 2).map(k => k.target.join(' ')) })));
console.log('axe Verstöße:', JSON.stringify(x));
console.log('Seitenfehler:', JSON.stringify(fehler));
await browser.close();
