// Stufe 1, Prüfung 1: Dialog „Fragebogen erkannt“ je Datei: axe, Tab-Durchlauf, Esc, 320 px, Zielgröße, forced-colors.
// Aufruf: PORT=4211 node e2e/probe/erheben1-dialog.mjs
import { chromium } from '@playwright/test';
import { U, axe, tabDurchlauf, breite, ziele, seite, rec, LOG } from './erheben1-lib.mjs';

const DATEIEN = [
  ['msforms', 'C:/Entwicklung/pspp-web/app/src/lib/testdaten/dienste/msforms/msforms-en.xlsx'],
  ['nextcloud', 'C:/Entwicklung/pspp-web/app/src/lib/testdaten/dienste/nextcloud/nextcloud-de.csv'],
  ['googleforms', 'C:/Entwicklung/pspp-web/app/src/lib/testdaten/dienste/googleforms/googleforms-en.csv'],
  ['kobo', 'C:/Entwicklung/pspp-web/app/src/lib/testdaten/dienste/kobo/kobo-xml-eins-null.xlsx'],
];
const MENSA = 'C:/Entwicklung/pspp-web/app/src/lib/testdaten/dienste/xlsform/mensa.xlsx';

const b = await chromium.launch();

async function oeffne(page, datei, ort) {
  await page.goto(U + '#start'); await page.waitForTimeout(1200);
  await page.locator('input[type=file]').first().setInputFiles(datei);
  try { await page.getByRole('heading', { name: /Fragebogen erkannt/ }).waitFor({ timeout: 10000 }); rec({ typ: 'schritt', ort, ok: true, text: 'Dialog erscheint' }); }
  catch { rec({ typ: 'schritt', ort, ok: false, text: 'Dialog „Fragebogen erkannt“ erscheint nicht (10 s)' }); return false; }
  await page.waitForTimeout(600);
  return true;
}

// 1. Hauptlauf 1280 px je Datei
for (const [name, datei] of DATEIEN) {
  const page = await seite(b);
  const ort = `Dialog ${name} (1280 px)`;
  if (!await oeffne(page, datei, ort)) { await page.context().close(); continue; }
  await axe(page, ort, 'Zustand: nur erkannt');
  await tabDurchlauf(page, '.fb', ort + ' Tab');
  if (name === 'kobo') {
    const feld = page.locator('.fb input[type=file][accept*="xlsx"]');
    rec({ typ: 'schritt', ort, ok: await feld.count() > 0, text: 'XLSForm-Feld im Dialog gefunden (' + await feld.count() + ')' });
    await feld.first().setInputFiles(MENSA);
    await page.waitForTimeout(2500);
    rec({ typ: 'schritt', ort, ok: await page.getByText(/Gelesen aus mensa/).count() > 0, text: 'XLSForm mensa.xlsx gelesen' });
    await axe(page, ort, 'Zustand: mit XLSForm mensa.xlsx');
    await tabDurchlauf(page, '.fb', ort + ' Tab mit XLSForm');
  }
  // Esc: der Dialog ist kein Fenster; prüfen, was Esc tut
  await page.keyboard.press('Escape'); await page.waitForTimeout(500);
  const offen = await page.getByRole('heading', { name: /Fragebogen erkannt/ }).isVisible().catch(() => false);
  rec({ typ: 'esc', ort, dialogNachEsc: offen ? 'bleibt offen' : 'geschlossen' });
  await page.context().close();
}

// 2. 320 px und Zielgröße je Datei
for (const [name, datei] of DATEIEN) {
  const page = await seite(b, 320);
  const ort = `Dialog ${name} (320 px)`;
  if (!await oeffne(page, datei, ort)) { await page.context().close(); continue; }
  await breite(page, ort);
  await ziele(page, ort, '.fb');
  await axe(page, ort, 'Zustand: 320 px');
  await page.context().close();
}

// 3. forced-colors je Datei: Bedienelemente mit Rahmen oder Umriss, sonst unsichtbar
for (const [name, datei] of DATEIEN) {
  const ctx = await b.newContext({ locale: 'de-DE', viewport: { width: 1280, height: 800 }, forcedColors: 'active' });
  const page = await ctx.newPage();
  const ort = `Dialog ${name} (forced-colors)`;
  if (!await oeffne(page, datei, ort)) { await ctx.close(); continue; }
  const d = await page.evaluate(() => {
    const out = { n: 0, ohneRahmen: [] };
    for (const e of document.querySelectorAll('.fb button,.fb input:not([type=hidden]),.fb select,.fb textarea,.fb summary,.fb label.k')) {
      const r = e.getBoundingClientRect(); if (r.width === 0 || r.height === 0 || e.classList.contains('nur-vorleser')) continue;
      out.n++;
      const s = getComputedStyle(e);
      const rahmen = (s.borderStyle !== 'none' && parseFloat(s.borderWidth) > 0) || (s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0);
      if (!rahmen && e.tagName !== 'INPUT') out.ohneRahmen.push(`${e.tagName.toLowerCase()} „${(e.getAttribute('aria-label') || e.innerText || '').trim().slice(0, 30)}“`);
    }
    return out;
  });
  rec({ typ: 'forced', ort, bedienelemente: d.n, ohne_rahmen_oder_umriss: d.ohneRahmen.length, beispiele: d.ohneRahmen.slice(0, 6) });
  await axe(page, ort, 'Zustand: forced-colors');
  await ctx.close();
}

await b.close();
console.log('FERTIG', LOG.length);
