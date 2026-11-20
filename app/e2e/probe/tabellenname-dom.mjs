// Tabellenname im Browser (ohne NVDA): Beispiel „Hilft das Lesetraining?“, Auswertung Gruppen vergleichen. Aufruf: node e2e/probe/tabellenname-dom.mjs [port]
import { chromium } from '@playwright/test';
const BASE = `http://127.0.0.1:${process.argv[2] ?? 4195}/`;
const b = await chromium.launch({ channel: 'msedge', headless: true });
const page = await (await b.newContext({ locale: 'de-DE' })).newPage();
await page.addInitScript(() => {
  window.__namen = [];
  new MutationObserver(() => { for (const t of document.querySelectorAll('main table caption')) { const s = t.textContent.trim(); if (!window.__namen.includes(s)) window.__namen.push(s); } }).observe(document, { subtree: true, childList: true, characterData: true });
});
await page.goto(BASE + '#beispiele');
await page.getByText(/Lesetraining/).first().waitFor({ timeout: 30000 });
const karte = page.locator('*:has-text("Hilft das Lesetraining")').filter({ has: page.getByRole('button', { name: /Öffnen und üben/ }) }).last();
await karte.getByRole('button', { name: /Öffnen und üben/ }).click();
await page.waitForFunction(() => location.hash === '#daten', undefined, { timeout: 30000 });
const ende = page.getByRole('button', { name: 'Rundgang beenden' }); if (await ende.isVisible().catch(() => false)) await ende.click();
await page.goto(BASE + '#blatt/neu');
await page.getByText(/Unterscheiden sich Gruppen/).first().click();
await page.locator('input[value="lesen_vor"]').first().click({ force: true });
await page.waitForTimeout(800);
await page.locator('input[value="klasse"]').first().click({ force: true });
await page.locator('main table.apa').first().waitFor({ timeout: 90000 });
await page.waitForTimeout(1500);
console.log('Namen im Verlauf:', JSON.stringify(await page.evaluate(() => window.__namen)));
console.log('Jetzt:', JSON.stringify(await page.evaluate(() => [...document.querySelectorAll('main table')].map(t => [t.querySelector('caption')?.textContent.trim(), t.rows.length]))));
await b.close();
