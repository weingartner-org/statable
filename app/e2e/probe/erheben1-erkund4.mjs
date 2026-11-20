// Erkundung Stufe 1: Karte und Blatt „Zahlen und Zitate nebeneinander“ im Beispiel praktikum. PORT (Standard 4211).
import { chromium } from '@playwright/test';
const U = `http://127.0.0.1:${process.env.PORT || 4211}/`;
const b = await chromium.launch();
const page = await (await b.newContext({ locale: 'de-DE', viewport: { width: 1280, height: 800 } })).newPage();
await page.goto(U + '#beispiele'); await page.waitForTimeout(1500);
await page.locator('#t-praktikum').locator('xpath=ancestor::*[.//button[contains(., "Öffnen und üben")]][1]').getByRole('button', { name: /Öffnen und üben/ }).first().click(); await page.waitForTimeout(2500);
await page.getByRole('button', { name: 'Rundgang beenden' }).click().catch(e => console.log('kein Rundgang-Ende', e.message.slice(0,80)));
await page.waitForTimeout(800);
await page.getByRole('link', { name: 'Karte' }).click(); await page.waitForTimeout(1500);
console.log('URL1', page.url());
console.log('H1', JSON.stringify(await page.locator('h1,h2,h3').allInnerTexts()));
console.log('BTN1', JSON.stringify((await page.getByRole('button').allInnerTexts()).filter(x=>x.trim()).slice(0, 60)));
console.log('LINKS1', JSON.stringify((await page.getByRole('link').allInnerTexts()).filter(x=>x.trim()).slice(0, 60)));
await b.close();
