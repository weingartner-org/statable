// Erkundung: Entsteht das Blatt „Zahlen und Zitate“ durch den Rundgang des Beispiels? PORT (Standard 4211).
import { chromium } from '@playwright/test';
import { U, seite } from './erheben1-lib.mjs';

const b = await chromium.launch();
const page = await seite(b);
await page.goto(U + '#beispiele'); await page.waitForTimeout(1500);
await page.locator('#t-praktikum').locator('xpath=ancestor::*[.//button[contains(., "Öffnen und üben")]][1]').getByRole('button', { name: /Öffnen und üben/ }).first().click();
await page.waitForTimeout(2500);
for (let k = 0; k < 4; k++) {
  const weiter = page.getByRole('button', { name: /^Weiter$|^Nächste Frage$/ }).first();
  if (!await weiter.count()) { console.log('KEIN WEITER bei Schritt', k); break; }
  await weiter.click().catch(() => {}); await page.waitForTimeout(1200);
  console.log('SCHRITT', k, page.url(), 'faelle', await page.locator('section.faelle').count(), 'reiter', JSON.stringify(await page.evaluate(() => [...document.querySelectorAll('a[href^="#blatt/"]')].map(a => a.innerText.trim().slice(0, 30)).slice(0, 8))));
}
await b.close();
