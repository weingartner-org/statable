import { chromium } from '@playwright/test';
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const page = await (await browser.newContext({ locale: 'de-DE' })).newPage();
await page.goto('http://127.0.0.1:4310/src/ausfuellen/vorschau.html', { waitUntil: 'load' }); await page.waitForTimeout(2500);
await page.locator('[data-sprache=en]').click(); await page.waitForTimeout(500);
console.log(await page.evaluate(() => 'html lang=' + document.documentElement.lang + ' | lang-Attribute im Inhalt: ' + [...document.querySelectorAll('#bibliothek [lang]')].map((e) => e.tagName + ':' + e.lang).slice(0, 8).join(',')));
await browser.close();
