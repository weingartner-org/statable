// Erkundung: was passiert nach Klick auf die Karte „Fälle vergleichen“ im Beispiel praktikum? PORT (Standard 4211).
import { chromium } from '@playwright/test';
import { U, seite } from './erheben1-lib.mjs';

const b = await chromium.launch();
const page = await seite(b);
await page.goto(U + '#beispiele'); await page.waitForTimeout(1500);
await page.locator('#t-praktikum').locator('xpath=ancestor::*[.//button[contains(., "Öffnen und üben")]][1]').getByRole('button', { name: /Öffnen und üben/ }).first().click();
await page.waitForTimeout(2500);
await page.getByRole('button', { name: 'Rundgang beenden' }).click({ timeout: 3000 }).catch(() => {});
await page.waitForTimeout(500);
await page.goto(U + '#blatt/neu'); await page.waitForTimeout(1200);
console.log('VOR-URL', page.url(), 'Karten-Knöpfe mit „Fälle“:', await page.getByRole('button', { name: /Fälle/ }).count());
await page.getByRole('button', { name: /Fälle vergleichen/ }).first().click(); await page.waitForTimeout(2000);
console.log('NACH-URL', page.url());
console.log('H', JSON.stringify(await page.locator('h1,h2,h3').allInnerTexts()));
console.log('BTN', JSON.stringify((await page.getByRole('button').allInnerTexts()).filter(x => x.trim()).slice(0, 50)));
console.log('SECTIONS', JSON.stringify(await page.evaluate(() => [...document.querySelectorAll('section')].map(s => s.className + '|' + (s.getAttribute('aria-labelledby') || '')).slice(0, 15))));
await page.screenshot({ path: 'C:/Users/johan/AppData/Local/Temp/claude/841c7e01c49a38e9/0c7011be-d3ea-4724-9026-3249592e1dcf/scratchpad/nach-karte.png' });
await b.close();
