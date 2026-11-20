// Erkundung ohne NVDA (headless): Wege für f6d (Neurechnen) und f6f (Skala)
import { chromium } from '@playwright/test';
const BASE = 'http://127.0.0.1:4194/';
const b = await chromium.launch({ channel: 'msedge', headless: true });
const page = await (await b.newContext({ locale: 'de-DE' })).newPage();
const w = (ms) => page.waitForTimeout(ms);
async function bsp(name) {
  await page.goto(BASE + '#beispiele'); await w(1500);
  const k = page.locator('*:has-text("' + name + '")').filter({ has: page.getByRole('button', { name: /Öffnen und üben/ }) }).last();
  await k.getByRole('button', { name: /Öffnen und üben/ }).click();
  await page.waitForFunction(() => location.hash === '#daten', undefined, { timeout: 30000 });
  const e = page.getByRole('button', { name: 'Rundgang beenden' }); if (await e.isVisible().catch(() => false)) await e.click();
}
const knoepfe = () => page.evaluate(() => [...document.querySelectorAll('main button, main a.k')].filter((x) => x.offsetParent).map((x) => x.textContent.trim().replace(/\s+/g, ' ').slice(0, 50)));
await bsp('Hilft das Lesetraining');
await page.goto(BASE + '#blatt/neu'); await w(1000);
await page.getByText(/Unterscheiden sich Gruppen/).first().click();
await page.locator('input[value="lesen_vor"]').first().click({ force: true }); await w(800);
await page.locator('input[value="klasse"]').first().click({ force: true });
await page.locator('main table.apa').first().waitFor({ timeout: 90000 }); await w(2000);
console.log('ERGEBNIS-Knöpfe:', JSON.stringify((await knoepfe()).slice(0, 25)));
console.log('Radios:', JSON.stringify(await page.evaluate(() => [...document.querySelectorAll('main input[type=radio]')].map((x) => x.name + '=' + x.value + (x.checked ? '*' : '') + (x.offsetParent ? '' : '(unsichtbar)')))));
await bsp('Fragebogen zur Prüfungsangst');
await page.goto(BASE + '#blatt/neu'); await w(1000);
await page.getByRole('button', { name: /Wie zuverlässig misst meine Skala/ }).first().click(); await w(800);
for (const n of ['pa1', 'pa2', 'pa3', 'pa4']) await page.locator('input[type=checkbox][value="' + n + '"]').first().check({ force: true });
console.log('Skala-Knöpfe:', JSON.stringify(await knoepfe()));
await w(2500);
console.log('hash', await page.evaluate(() => location.hash), 'Tabellen', await page.locator('main table.apa').count());
console.log('sw-name da:', await page.locator('#sw-name').count(), 'sm-name', await page.locator('#sm-name').count());
await b.close();
