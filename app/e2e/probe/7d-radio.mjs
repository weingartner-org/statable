// Welle 7D: warum meldet axe die Radioknöpfe in verstehen/kennzahlen und anteilstest?
import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const U = `http://127.0.0.1:${process.env.PORT || 4197}/`;
const b = await chromium.launch(); const page = await (await b.newContext({ locale: 'de-DE', viewport: { width: 1280, height: 720 } })).newPage();
await page.goto(U + '#beispiele'); await page.waitForTimeout(1500);
await page.getByRole('button', { name: /Öffnen und üben/ }).first().click(); await page.waitForTimeout(2500);
for (const r of ['verstehen/verteilungen', 'verstehen/kennzahlen', 'verstehen/vergleich', 'verstehen/anteilstest']) {
  await page.goto(U + '#' + r); await page.waitForTimeout(700);
  const res = await new AxeBuilder({ page }).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();
  for (const v of res.violations) for (const n of v.nodes) console.log(r, v.id, JSON.stringify(n.any.map(a => a.message)), JSON.stringify(n.any.map(a=>a.relatedNodes?.map(x=>x.html.slice(0,100)))));
}
await b.close();
