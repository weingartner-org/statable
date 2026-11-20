// Erheben 2, Prüfung 2.1: Eingabemaske bei 320 px (axe, Umbruch, Zielgröße) nach einem Bogen in Durchgang A.
// Aufruf: PORT=4221 node e2e/probe/erheben2-eingabe320.mjs
import { chromium } from '@playwright/test';
import { axe, breite, ziele, rec } from './erheben1-lib.mjs';
const b = await chromium.launch();
const p = await (await b.newContext({ locale: 'de-DE', viewport: { width: 320, height: 800 } })).newPage();
p.on('pageerror', e => rec({ typ: 'fehler', ort: 'eingabe320', meldung: e.message }));
await p.goto(`http://127.0.0.1:${process.env.PORT || 4221}/#fragebogen`); await p.waitForSelector('h1');
await p.getByRole('button', { name: 'Neuen Fragebogen anlegen' }).click();
await p.getByText('Vorlage einfügen').first().click();
await p.selectOption('#fb-vorlage', 'zustimmung5');
for (let i = 0; i < 3; i++) await p.locator('details.vorlagen').getByRole('button', { name: 'Vorlage einfügen' }).click();
await p.getByRole('button', { name: 'Daten eingeben (Eingabemaske)' }).click();
await p.waitForSelector('.em .af'); await p.waitForTimeout(400);
await axe(p, 'Eingabemaske leer', '320 px');
await breite(p, 'Eingabemaske leer 320 px');
await ziele(p, 'Eingabemaske leer 320 px', '.em');
await p.getByLabel('Doppeleingabe, Durchgang A').check();
await p.fill('#fb-em-nr', '1'); await p.keyboard.press('Enter'); await p.keyboard.press('3'); await p.keyboard.press('Enter'); await p.keyboard.press('7'); await p.waitForTimeout(150);
await axe(p, 'Eingabemaske mit Fehler', '320 px');
await breite(p, 'Eingabemaske mit Fehler 320 px');
await b.close();
