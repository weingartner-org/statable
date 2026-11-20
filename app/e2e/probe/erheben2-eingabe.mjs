// Erheben 2, Prüfung 2.1 für Eingabemaske (Durchgang A und B) und Abgleich mit einer Abweichung:
// axe bei 1280 und 320 px, Tastatur (Code tippen, Enter weiter, Strg+Enter speichert), Fokus, Zielgröße.
// Aufruf: PORT=4221 node e2e/probe/erheben2-eingabe.mjs
import { chromium } from '@playwright/test';
import { axe, breite, ziele, tabDurchlauf, rec } from './erheben1-lib.mjs';
import { mkdirSync } from 'node:fs';
const PORT = process.env.PORT || 4221;
const PROTO = process.env.TEMP + '/erheben2-protokoll';
mkdirSync(PROTO, { recursive: true });
const b = await chromium.launch();
const ctx = await b.newContext({ locale: 'de-DE', viewport: { width: 1280, height: 900 }, acceptDownloads: true });
const page = await ctx.newPage();
page.on('pageerror', e => rec({ typ: 'fehler', ort: 'eingabe', meldung: e.message }));
const ok = (b2, was) => rec({ typ: 'pruefung', ort: 'Eingabe/Abgleich', ergebnis: b2 ? 'ok' : 'FEHLER', was });
await page.goto(`http://127.0.0.1:${PORT}/#fragebogen`); await page.waitForSelector('h1');
await page.getByRole('button', { name: 'Neuen Fragebogen anlegen' }).click();
await page.getByText('Vorlage einfügen').first().click();
await page.selectOption('#fb-vorlage', 'zustimmung5');
for (let i = 0; i < 3; i++) await page.locator('details.vorlagen').getByRole('button', { name: 'Vorlage einfügen' }).click();

await page.getByRole('button', { name: 'Daten eingeben (Eingabemaske)' }).click();
await page.waitForSelector('.em .af');
await page.waitForTimeout(400);
await axe(page, 'Eingabemaske leer', '1280 px');
await tabDurchlauf(page, '.em', 'Eingabemaske Durchgang A');
ok(await page.locator('.em .af [data-frage]').count() === 3, 'drei Fragen in der Maske');
await page.getByLabel('Doppeleingabe, Durchgang A').check();
await page.fill('#fb-em-nr', '1');
await page.keyboard.press('Enter');
ok(await page.evaluate(() => !!document.activeElement?.closest('[data-frage]')), 'Enter in der Bogen-Nummer springt in die erste Frage');
await page.keyboard.press('3');
ok(await page.locator('.em .af [data-frage]').nth(0).locator('input:checked').getAttribute('value') === '3', 'Code 3 getippt wählt Option 3');
await page.waitForTimeout(100);
await page.keyboard.press('Enter');
await page.keyboard.press('7');
await page.waitForTimeout(100);
ok(/Code „7“/.test(await page.locator('.em .af .fehlertext').first().innerText()), 'unbekannter Code 7 ist Fehler an der Frage');
await axe(page, 'Eingabemaske mit Fehler', '1280 px');
await page.keyboard.press('2');
ok(await page.locator('.em .af .fehlertext').count() === 0, 'Fehler verschwindet bei gültigem Code');
await page.keyboard.press('Enter'); await page.keyboard.press('4');
await page.keyboard.press('Control+Enter'); await page.waitForTimeout(300);
ok(await page.locator('table.bt tbody tr').count() === 1, 'Strg+Enter speichert Bogen 1');
ok(await page.evaluate(() => document.activeElement?.id === 'fb-em-nr'), 'Fokus auf Bogen-Nummer nach dem Speichern');
for (const [nr, w] of [['2', ['1', '1', '1']], ['3', ['5', '5', '5']]]) {
  await page.fill('#fb-em-nr', nr); await page.keyboard.press('Enter');
  for (const c of w) { await page.keyboard.press(c); await page.keyboard.press('Enter'); }
  await page.keyboard.press('Control+Enter'); await page.waitForTimeout(250);
}
ok(await page.locator('table.bt tbody tr').count() === 3, 'drei Bögen in Durchgang A');
await page.fill('#fb-em-nr', '2'); await page.keyboard.press('Enter'); await page.keyboard.press('Control+Enter'); await page.waitForTimeout(200);
ok(/gibt es in diesem Durchgang schon/.test(await page.locator('#fb-em-nr-f').innerText()), 'doppelte Bogen-Nummer wird abgewiesen');
await axe(page, 'Eingabemaske mit Liste und Nummernfehler', '1280 px');

await page.getByLabel('Doppeleingabe, Durchgang B').check();
ok(await page.locator('table.bt').count() === 0, 'Durchgang B zeigt keine Bögen aus A');
for (const [nr, w] of [['1', ['3', '2', '3']], ['2', ['1', '1', '1']]]) {
  await page.fill('#fb-em-nr', nr); await page.keyboard.press('Enter');
  for (const c of w) { await page.keyboard.press(c); await page.keyboard.press('Enter'); }
  await page.keyboard.press('Control+Enter'); await page.waitForTimeout(250);
}
ok(await page.locator('table.bt tbody tr').count() === 2, 'zwei Bögen in Durchgang B');

await page.getByRole('button', { name: 'Abgleich und Protokoll' }).click();
await page.waitForSelector('table.abw');
await page.waitForTimeout(400);
ok(await page.locator('table.abw').first().locator('tbody tr').count() === 1, 'eine Abweichung in der Tabelle');
await axe(page, 'Abgleich (offen)', '1280 px');
ok(await page.getByRole('button', { name: 'Datensatz erzeugen' }).getAttribute('aria-disabled') === 'true', 'Datensatz erzeugen gesperrt, solange offen');
const grp = page.getByRole('group', { name: /Entscheidung für Bogen 1/ });
await grp.getByLabel('Neuer Wert').check();
await grp.locator('input[type=text]').fill('9');
ok(await page.locator('.fehlertext').count() === 1, 'neuer Wert 9 ist Fehler');
await grp.locator('input[type=text]').fill('4');
await page.getByLabel('Nur einfach erfasst übernehmen').check();
await page.waitForTimeout(300);
await axe(page, 'Abgleich (fertig)', '1280 px');
const satz = await page.locator('blockquote.satz').innerText();
ok(/1 Bogen wurde nur in einem Durchgang/.test(satz) && /2 Bögen/.test(satz) && /1 mit neuem Wert/.test(satz), 'Protokolltext stimmt');
const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Protokoll als Word-Datei' }).click()]);
ok(/\.docx$/.test(dl.suggestedFilename()), 'Word-Protokoll: ' + dl.suggestedFilename());
await dl.saveAs(PROTO + '/' + dl.suggestedFilename());
await page.getByRole('button', { name: 'Datensatz erzeugen' }).click();
await page.waitForFunction(() => /Datensatz erzeugt/.test(document.body.innerText), null, { timeout: 30000 }).catch(() => {});
ok(/Datensatz erzeugt/.test(await page.evaluate(() => document.body.innerText)), 'Datensatz erzeugt');
await ziele(page, 'Abgleich (fertig) 1280 px');

await page.setViewportSize({ width: 320, height: 800 }); await page.waitForTimeout(400);
await axe(page, 'Abgleich (fertig)', '320 px');
await breite(page, 'Abgleich (fertig) 320 px');
await b.close();
