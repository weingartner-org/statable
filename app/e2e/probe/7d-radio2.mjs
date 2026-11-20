import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const U = `http://127.0.0.1:4197/`;
const b = await chromium.launch(); const page = await (await b.newContext({ locale: 'de-DE' })).newPage();
await page.goto(U + '#beispiele'); await page.waitForTimeout(1500);
await page.getByRole('button', { name: /Öffnen und üben/ }).first().click(); await page.waitForTimeout(2500);
for (const r of ['verstehen/verteilungen', 'verstehen/kennzahlen']) {
  await page.goto(U + '#' + r); await page.waitForTimeout(700);
  for (let i = 0; i < 12; i++) await page.keyboard.press('Tab');
  await page.goto(U + '#' + r + '?'); await page.waitForTimeout(300);
  const res = await new AxeBuilder({ page }).withTags(['wcag22aa']).analyze();
  for (const v of res.violations) for (const n of v.nodes) console.log(r, v.id, n.target.join(' '), JSON.stringify(n.any.map(a => a.message)), JSON.stringify(n.any.map(a => a.relatedNodes?.map(x => x.html.slice(0, 120)))));
  console.log(r, await page.evaluate(() => { const e = document.querySelector('.rand-schalter'); if (!e) return 'kein'; const r = e.getBoundingClientRect(); const o = document.elementFromPoint(r.x + r.width/2, r.y + r.height - 1); const o2 = document.elementFromPoint(r.x + r.width/2, r.y + 1); return JSON.stringify([r.x, r.y, r.width, r.height, o?.outerHTML.slice(0,80), o2?.outerHTML.slice(0,80), innerHeight, e.parentElement.className, getComputedStyle(e.parentElement).position]); }));
}
await b.close();
