import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const U = `http://127.0.0.1:4197/`;
const b = await chromium.launch(); const page = await (await b.newContext({ locale: 'de-DE' })).newPage();
await page.goto(U + '#beispiele'); await page.waitForTimeout(1500);
await page.getByRole('button', { name: /Öffnen und üben/ }).first().click(); await page.waitForTimeout(2500);
for (const w of [100, 400, 700, 1500]) for (const r of ['verstehen/kennzahlen', 'verstehen/anteilstest']) {
  await page.goto(U + '#blatt'); await page.waitForTimeout(500);
  await page.goto(U + '#' + r); await page.waitForTimeout(w);
  const res = await new AxeBuilder({ page }).withTags(['wcag22aa']).analyze();
  console.log(w, r, JSON.stringify(res.violations.map(v => v.nodes.map(n => n.target.join(' ') + ' ' + n.any[0]?.message.slice(0, 120)))));
}
await b.close();
