// Erheben 2, Prüfung 2.1 (Dateien B): alle zehn Exporte einmal herunterladen (Playwright waitForEvent('download')).
// Plan: drei Likert-Fragen aus der Vorlage, Titel gesetzt, keine Sperre. Dateien landen in $TEMP/erheben2-export/.
// Aufruf: PORT=4221 node e2e/probe/erheben2-export.mjs
import { chromium } from '@playwright/test';
import { axe, rec } from './erheben1-lib.mjs';
import { mkdirSync } from 'node:fs';
const PORT = process.env.PORT || 4221;
const ZIEL = process.env.TEMP + '/erheben2-export';
mkdirSync(ZIEL, { recursive: true });
const FORMATE = [
  ['xlsform', /^XLSForm/], ['limesurvey', /^LimeSurvey/], ['surveyjs', /^SurveyJS/], ['pspp', /^PSPP-Syntax/],
  ['kodebuch', /^Kodebuch \(Word\)/], ['word', /^Fragebogen \(Word\)/], ['html', /^Fragebogen \(HTML/],
  ['papier-standard', /^Papierbogen, Standard/], ['papier-gross', /^Papierbogen, Großdruck/], ['text', /^Braille/],
];
const b = await chromium.launch();
const ctx = await b.newContext({ locale: 'de-DE', viewport: { width: 1280, height: 900 }, acceptDownloads: true });
const page = await ctx.newPage();
page.on('pageerror', e => rec({ typ: 'fehler', ort: 'export', meldung: e.message }));
await page.goto(`http://127.0.0.1:${PORT}/#fragebogen`); await page.waitForSelector('h1');
await page.getByRole('button', { name: 'Neuen Fragebogen anlegen' }).click();
await page.getByText('Vorlage einfügen').first().click();
await page.selectOption('#fb-vorlage', 'zustimmung5');
for (let i = 0; i < 3; i++) await page.locator('details.vorlagen').getByRole('button', { name: 'Vorlage einfügen' }).click();
await page.getByText('Titel, Sprachen und Einstellungen des Fragebogens').click();
await page.fill('#fb-titel-de', 'Erhebung Probe Zufriedenheit');
await page.keyboard.press('Tab');
await page.waitForTimeout(300);
const fragen = await page.locator('.gl .eintrag').allInnerTexts();
rec({ typ: 'plan', gliederung: fragen.map(t => t.replace(/\s+/g, ' ').trim()).slice(0, 8) });
await page.getByRole('button', { name: /Exportieren \(Dateiformate\)/ }).click();
await axe(page, 'Export-Menü offen (frei), vor dem Herunterladen', '1280 px');
const ergebnis = [];
for (const [id, re] of FORMATE) {
  if (await page.getByRole('button', { name: /Exportieren \(Dateiformate\)/ }).getAttribute('aria-expanded') !== 'true')
    await page.getByRole('button', { name: /Exportieren \(Dateiformate\)/ }).click();
  try {
    const [dl] = await Promise.all([
      page.waitForEvent('download', { timeout: 15000 }),
      page.getByRole('button', { name: re }).first().click(),
    ]);
    const pfad = ZIEL + '/' + id + '-' + dl.suggestedFilename();
    await dl.saveAs(pfad);
    ergebnis.push({ id, datei: pfad, name: dl.suggestedFilename(), ok: true });
  } catch (e) {
    ergebnis.push({ id, ok: false, fehler: String(e.message).slice(0, 200) });
  }
}
rec({ typ: 'downloads', ergebnis });
// Meldung der Seite nach dem letzten Export
rec({ typ: 'meldung', text: (await page.locator('[role=status]').allInnerTexts()).join(' / ').slice(0, 300) });
await page.setViewportSize({ width: 320, height: 800 }); await page.waitForTimeout(300);
await axe(page, 'Export-Menü offen (frei), nach Downloads', '320 px');
await b.close();
