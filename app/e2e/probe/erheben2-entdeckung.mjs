// Erheben 2 (Hilfslauf): listet Schaltflächen, Überschriften und Schalter der Seite „Fragebogen planen“ je Zustand. Nur Messung.
import { chromium } from '@playwright/test';
const PORT = process.env.PORT || 4221;
const b = await chromium.launch();
const page = await (await b.newContext({ locale: 'de-DE', viewport: { width: 1280, height: 900 } })).newPage();
page.on('pageerror', e => console.log('pageerror', e.message));
await page.goto(`http://127.0.0.1:${PORT}/#fragebogen`); await page.waitForSelector('h1');
const liste = async (t) => {
  const d = await page.evaluate(() => ({
    h: [...document.querySelectorAll('h1,h2,h3')].map(e => e.tagName + ':' + e.innerText.trim().slice(0, 60)),
    b: [...document.querySelectorAll('button,summary,[role=tab],select,input')].filter(e => e.offsetParent).map(e => e.tagName + '|' + (e.getAttribute('aria-label') || e.innerText || e.id || e.name || '').replace(/\s+/g, ' ').trim().slice(0, 60)),
  }));
  console.log('== ' + t); console.log(d.h.join('\n')); console.log(d.b.join('\n'));
};
await liste('leer');
await page.getByRole('button', { name: 'Neuen Fragebogen anlegen' }).click();
await liste('neu angelegt');
await page.getByText('Vorlage einfügen').first().click();
await liste('Vorlagen offen');
await page.selectOption('#fb-vorlage', 'zustimmung5');
await page.locator('details.vorlagen').getByRole('button', { name: 'Vorlage einfügen' }).click();
await liste('Vorlage eingefügt');
await page.getByRole('button', { name: 'Filter hinzufügen' }).click();
await liste('Filter hinzugefügt');
await b.close();
