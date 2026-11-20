// Erkundung Stufe 1 (Fälle vergleichen, Bericht, Lernen, Hilfe). PORT (Standard 4211).
import { chromium } from '@playwright/test';
const U = `http://127.0.0.1:${process.env.PORT || 4211}/`;
const b = await chromium.launch();
const page = await (await b.newContext({ locale: 'de-DE', viewport: { width: 1280, height: 800 } })).newPage();
await page.goto(U + '#beispiele'); await page.waitForTimeout(1500);
const karten = await page.getByRole('button', { name: /Öffnen und üben/ }).allInnerTexts();
console.log('UEBEN-BUTTONS', karten.length);
const ids = await page.evaluate(() => [...document.querySelectorAll('[id]')].map(e => e.id).filter(x => /prakt/i.test(x)).slice(0, 10));
console.log('IDS', JSON.stringify(ids));
await b.close();
