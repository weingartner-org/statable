// Erheben 2, Prüfung 2.1: „Fragebogen planen“ je Zustand. axe (wcag2a…wcag22aa) bei 1280 und 320 px,
// Zielgröße (24 px), waagrechter Überlauf, Kontrastmodus (forced-colors) mit Tastatur-Fokus-Sichtbarkeit.
// Aufruf: PORT=4221 node e2e/probe/erheben2-zustaende.mjs
import { chromium } from '@playwright/test';
import { axe, breite, ziele, tabDurchlauf, rec } from './erheben1-lib.mjs';
const PORT = process.env.PORT || 4221;
const U = `http://127.0.0.1:${PORT}/#fragebogen`;
const b = await chromium.launch();

async function vorlage(page, n = 1, wert = 'zustimmung5') {
  await page.getByText('Vorlage einfügen').first().click();
  await page.selectOption('#fb-vorlage', wert);
  for (let i = 0; i < n; i++) await page.locator('details.vorlagen').getByRole('button', { name: 'Vorlage einfügen' }).click();
}
const ZUSTAENDE = {
  'leer': async () => {},
  'Vorlage Zustimmung 5 Stufen': async (p) => { await p.getByRole('button', { name: 'Neuen Fragebogen anlegen' }).click(); await vorlage(p); },
  'Frage mit Filter': async (p) => { await p.getByRole('button', { name: 'Neuen Fragebogen anlegen' }).click(); await vorlage(p, 2); await p.getByRole('button', { name: 'Filter hinzufügen' }).click(); },
  'Antwortlisten': async (p) => { await p.getByRole('button', { name: 'Neuen Fragebogen anlegen' }).click(); await vorlage(p); await p.getByRole('button', { name: 'Antwortlisten' }).click(); await p.waitForSelector('table.opt'); },
  'Kodebuch': async (p) => { await p.getByRole('button', { name: 'Neuen Fragebogen anlegen' }).click(); await vorlage(p); await p.getByRole('button', { name: 'Kodebuch' }).click(); await p.waitForSelector('table.kodebuch'); },
  'Befunde mit Fehler (Frage ohne Antwortliste)': async (p) => { await p.getByRole('button', { name: 'Neuen Fragebogen anlegen' }).click(); await vorlage(p); await p.getByRole('button', { name: 'Frage hinzufügen' }).click(); },
  'Vorschau Rechner': async (p) => { await p.getByRole('button', { name: 'Neuen Fragebogen anlegen' }).click(); await vorlage(p); await p.getByRole('button', { name: 'Rechner', exact: true }).click(); },
  'Vorschau Handy': async (p) => { await p.getByRole('button', { name: 'Neuen Fragebogen anlegen' }).click(); await vorlage(p); await p.getByRole('button', { name: 'Handy', exact: true }).click(); },
  'Export-Menü offen (frei)': async (p) => { await p.getByRole('button', { name: 'Neuen Fragebogen anlegen' }).click(); await vorlage(p); await p.getByRole('button', { name: /Exportieren \(Dateiformate\)/ }).click(); },
  'Export-Menü offen (gesperrt)': async (p) => { await p.getByRole('button', { name: 'Neuen Fragebogen anlegen' }).click(); await vorlage(p); await p.getByRole('button', { name: 'Frage hinzufügen' }).click(); await p.getByRole('button', { name: /Exportieren \(Dateiformate\)/ }).click(); },
  'Pretest an': async (p) => { await p.getByRole('button', { name: 'Neuen Fragebogen anlegen' }).click(); await vorlage(p); await p.getByText('Titel, Sprachen und Einstellungen des Fragebogens').click(); await p.getByLabel('Pretest-Modus (Kommentar je Frage)').check(); },
};

for (const [name, bau] of Object.entries(ZUSTAENDE)) {
  // 1280 px, normaler Kontrast
  let kontext = await b.newContext({ locale: 'de-DE', viewport: { width: 1280, height: 900 } });
  let p = await kontext.newPage(); p.on('pageerror', e => rec({ typ: 'fehler', ort: name, meldung: e.message }));
  await p.goto(U); await p.waitForSelector('h1'); await bau(p); await p.waitForTimeout(500);
  await axe(p, name, '1280 px');
  await breite(p, name + ' 1280 px');
  await ziele(p, name + ' 1280 px');
  await p.setViewportSize({ width: 320, height: 800 }); await p.waitForTimeout(400);
  await axe(p, name, '320 px');
  await breite(p, name + ' 320 px');
  await kontext.close();
  // Kontrastmodus (forced-colors): Fokus sichtbar? Erreichbarkeit mit Tab in 1280 px
  kontext = await b.newContext({ locale: 'de-DE', viewport: { width: 1280, height: 900 }, forcedColors: 'active' });
  p = await kontext.newPage(); p.on('pageerror', e => rec({ typ: 'fehler', ort: name, meldung: e.message }));
  await p.goto(U); await p.waitForSelector('h1'); await bau(p); await p.waitForTimeout(500);
  const fc = await p.evaluate(() => matchMedia('(forced-colors: active)').matches);
  rec({ typ: 'forced-colors', ort: name, aktiv: fc });
  await axe(p, name, 'Kontrastmodus');
  await tabDurchlauf(p, 'body', name + ' Kontrastmodus');
  await kontext.close();
}
await b.close();
