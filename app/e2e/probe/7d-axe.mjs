// Welle 7D: axe (target-size, label) auf den Befund-Routen, gegen PORT (Standard 4197)
import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const U = `http://127.0.0.1:${process.env.PORT || 4197}/`;
const b = await chromium.launch(); const page = await (await b.newContext({ locale: 'de-DE', viewport: { width: 1280, height: 800 } })).newPage();
await page.goto(U + '#beispiele'); await page.waitForTimeout(1500);
await page.getByRole('button', { name: /Öffnen und üben/ }).first().click(); await page.waitForTimeout(2500);
for (const r of ['blatt', 'blatt/neu', 'verstehen/kennzahlen', 'verstehen/anteilstest', 'bearbeiten/zusammen']) {
  await page.goto(U + '#' + r); await page.waitForTimeout(1200);
  const res = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
  console.log(r, JSON.stringify(res.violations.map(v => [v.id, v.nodes.map(n => n.target.join(' ') + ' ' + (n.any[0]?.message || n.all[0]?.message || '').slice(0, 90))])));
}
await b.close();
