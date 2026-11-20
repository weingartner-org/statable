import { chromium } from '@playwright/test';
const BASE = 'http://127.0.0.1:4194/';
const b = await chromium.launch({ channel: 'msedge', headless: true });
const page = await (await b.newContext({ locale: 'de-DE' })).newPage();
const w = (ms) => page.waitForTimeout(ms);
await page.goto(BASE + '#beispiele'); await w(1500);
const k = page.locator('*:has-text("Fragebogen zur Prüfungsangst")').filter({ has: page.getByRole('button', { name: /Öffnen und üben/ }) }).last();
await k.getByRole('button', { name: /Öffnen und üben/ }).click();
await page.waitForFunction(() => location.hash === '#daten', undefined, { timeout: 30000 });
const e = page.getByRole('button', { name: 'Rundgang beenden' }); if (await e.isVisible().catch(() => false)) await e.click();
for (const set of [['pa1','pa2','pa3','pa4','pa5','pa6','pa7','pa8'], ['selbstwirksamkeit','lernzeit','pa1'], ['pa1','pa2']]) {
  await page.goto(BASE + '#blatt/neu'); await w(1000);
  await page.getByRole('button', { name: /Wie zuverlässig misst meine Skala/ }).first().click(); await w(800);
  for (const n of set) await page.locator('input[type=checkbox][value="' + n + '"]').first().check({ force: true });
  await page.getByRole('button', { name: /Fertig/ }).first().click();
  await page.locator('main table.apa').first().waitFor({ timeout: 60000 }).catch(() => {}); await w(2500);
  console.log(set.join(','), '=> sw-name', await page.locator('#sw-name').count(), 'sm-name', await page.locator('#sm-name').count(), 'umpol-Text', await page.evaluate(() => /umpol/i.test(document.querySelector('.skala-weiter')?.textContent ?? '')), 'hash', await page.evaluate(() => location.hash));
}
await b.close();
