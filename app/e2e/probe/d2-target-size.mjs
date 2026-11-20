// D2 (WCAG 2.5.8): axe target-size auf den verstehen-Routen, mehrere Wartezeiten und Reihenfolgen. PORT (Standard 4198), BREITE.
import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const U = `http://127.0.0.1:${process.env.PORT || 4198}/`;
const b = await chromium.launch(); const page = await (await b.newContext({ locale: 'de-DE', viewport: { width: Number(process.env.BREITE || 1280), height: 800 } })).newPage();
await page.goto(U + '#beispiele'); await page.waitForTimeout(1500);
await page.getByRole('button', { name: /Öffnen und üben/ }).first().click(); await page.waitForTimeout(2500);
let n = 0;
if (process.env.ROT) await page.addStyleTag({ content: '.vst-wahl label input,.segment label input{min-width:0!important;min-height:0!important;flex:0 1 auto!important}' }); // Gegenprobe: alte Größe vortäuschen

const vorher = ['verstehen'];
for (const v of vorher) for (const r of ['verstehen/kennzahlen', 'verstehen/anteilstest']) for (const w of [700]) {
  await page.goto(U + '#' + v); await page.waitForTimeout(700);
  await page.goto(U + '#' + r); await page.waitForTimeout(w);
  const res = await new AxeBuilder({ page }).withTags(['wcag22aa']).analyze();
  for (const x of res.violations) for (const k of x.nodes) { n++; console.log(v, '->', r, w, x.id, k.target.join(' '), (k.any[0]?.message || '').slice(0, 110), JSON.stringify(k.any[0]?.relatedNodes?.map(q => q.html.slice(0, 90)))); }
}
console.log('VERSTOESSE', n);
console.log(await page.evaluate(() => [...document.querySelectorAll('input[type=radio]')].map(e => { const r = e.getBoundingClientRect(); return e.value + ':' + Math.round(r.width) + 'x' + Math.round(r.height); }).join(' ')));
await b.close();
