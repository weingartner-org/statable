import { chromium } from '@playwright/test';
const U = 'http://127.0.0.1:4195/';
const b = await chromium.launch(); const ctx = await b.newContext({ locale: 'de-DE', viewport: { width: 1280, height: 800 } }); const page = await ctx.newPage();
await page.goto(U + '#beispiele'); await page.waitForTimeout(1500);
await page.getByRole('button', { name: /Öffnen und üben/ }).first().click(); await page.waitForTimeout(2500);
for (const r of ['daten','hilfe','einstellungen','lernen']) {
  await page.goto(U + '#' + r); await page.waitForTimeout(900);
  await page.evaluate(() => { const b = document.body; b.setAttribute('tabindex','-1'); b.focus(); b.blur(); b.removeAttribute('tabindex'); scrollTo(0,0); });
  await page.keyboard.press('Tab'); const a = await page.evaluate(() => document.activeElement?.textContent?.trim());
  await page.keyboard.press('Enter'); await page.waitForTimeout(200);
  const f = await page.evaluate(() => ({ id: document.activeElement?.id, tag: document.activeElement?.tagName }));
  console.log(r, JSON.stringify(a), '->', JSON.stringify(f));
}
await b.close();
