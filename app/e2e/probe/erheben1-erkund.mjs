// Erkundung (Stufe 1): Startseite, Datei-Wähler, Dialog-Überschriften und Schaltflächen ausgeben. PORT (Standard 4211).
import { chromium } from '@playwright/test';
const U = `http://127.0.0.1:${process.env.PORT || 4211}/`;
const b = await chromium.launch();
const page = await (await b.newContext({ locale: 'de-DE', viewport: { width: 1280, height: 800 } })).newPage();
await page.goto(U + '#start'); await page.waitForTimeout(1500);
console.log('FILE-INPUTS', await page.locator('input[type=file]').count());
console.log('BUTTONS', JSON.stringify((await page.getByRole('button').allInnerTexts()).slice(0, 40)));
console.log('LINKS', JSON.stringify((await page.getByRole('link').allInnerTexts()).slice(0, 40)));
await page.locator('input[type=file]').first().setInputFiles('C:/Entwicklung/pspp-web/app/src/lib/testdaten/dienste/msforms/msforms-en.xlsx');
await page.waitForTimeout(2500);
console.log('H', JSON.stringify(await page.locator('h1,h2').allInnerTexts()));
console.log('BUTTONS2', JSON.stringify((await page.getByRole('button').allInnerTexts()).slice(0, 60)));
console.log('URL', page.url());
await b.close();
