import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const b = await chromium.launch(); const ctx = await b.newContext({ locale: 'de-DE', viewport: { width: 1280, height: 800 } }); const page = await ctx.newPage();
const U = 'http://127.0.0.1:4195/';
await page.goto(U + '#beispiele'); await page.waitForTimeout(1500);
await page.getByRole('button', { name: /Öffnen und üben/ }).first().click(); await page.waitForTimeout(2500);
const alle = new Map();
for (const r of ['start','daten','spalten','befehle','hilfe','planen','bearbeiten','hilfe/fallgewichte','verstehen/verteilungen','verstehen/anteilstest','bearbeiten/umkodieren']) {
  await page.goto(U + '#' + r); await page.waitForTimeout(900);
  const x = await new AxeBuilder({ page }).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();
  for (const i of x.incomplete) { const k = i.id; const e = alle.get(k) ?? { routen: [], knoten: 0, bsp: '' }; e.routen.push(r); e.knoten += i.nodes.length; e.bsp ||= i.nodes[0]?.target?.join(' ') + ' | ' + (i.nodes[0]?.any[0]?.message||'').slice(0,100); alle.set(k, e); }
}
console.log(JSON.stringify([...alle.entries()], null, 1));
await b.close();
