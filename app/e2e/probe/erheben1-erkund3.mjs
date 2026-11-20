// Erkundung Stufe 1: Beispiel praktikum öffnen, Wege zu „Fälle vergleichen“ und Bericht finden. PORT (Standard 4211).
import { chromium } from '@playwright/test';
const U = `http://127.0.0.1:${process.env.PORT || 4211}/`;
const b = await chromium.launch();
const page = await (await b.newContext({ locale: 'de-DE', viewport: { width: 1280, height: 800 } })).newPage();
await page.goto(U + '#beispiele'); await page.waitForTimeout(1500);
const k = page.locator('#t-praktikum').locator('xpath=ancestor::*[.//button[contains(., "Öffnen und üben")]][1]');
console.log('KARTE', await k.count());
await k.getByRole('button', { name: /Öffnen und üben/ }).first().click(); await page.waitForTimeout(2500);
console.log('URL', page.url());
console.log('H', JSON.stringify(await page.locator('h1,h2').allInnerTexts()));
console.log('BUTTONS', JSON.stringify((await page.getByRole('button').allInnerTexts()).filter(x=>x.trim()).slice(0, 60)));
console.log('LINKS', JSON.stringify((await page.getByRole('link').allInnerTexts()).filter(x=>x.trim()).slice(0, 60)));
console.log('FAELLE-TEXT', await page.getByText('Fälle vergleichen').count());
await b.close();
