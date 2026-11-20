// Stufe 3, Prüfung 1, 2, 3, 4, 5 (Teil Ausfüllseite): Fragebogen-Datei (file://) und Link (/ausfuellen/#…) durch alle Schritte bis zur Abschlussseite.
// Je Schritt: axe (1280 und 320 px), waagrechter Überlauf, Zielgröße 44 px (Befragte), Kontrastmodus (forced-colors), Tab-Durchlauf (an Einleitung, erster Frageseite und Abschluss).
// Handy: Pixel 7 Emulation (412 x 915, Berührung) für den Link. Der Plan entsteht über die Oberfläche OHNE Fragen: Die Vorlage „Zustimmung (5 Stufen)“ mit Platzhalter sperrt den Export (siehe Befund), Frageseiten werden hier nicht gemessen.
// Aufruf in app/:  BASIS=http://localhost:4231 node e2e/probe/erheben3-ausfuellen.mjs
import { chromium, devices } from '@playwright/test';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { BASIS, axeSeite, zielgroesse, kontrastmodus, keinUeberlauf, tabWalk, neueSeite, rec, LOG } from './erheben3-lib.mjs';

const OUT = join(tmpdir(), 'erheben3'); mkdirSync(OUT, { recursive: true });
const b = await chromium.launch();

// ---- Plan über die Oberfläche anlegen, Schlüssel übernehmen, Datei und Link holen
let datei, link;
{
  const { ctx, page } = await neueSeite(b, { breitePx: 1280, hoehePx: 900 });
  await page.goto(BASIS + '/#fragebogen'); await page.waitForSelector('h1');
  await page.getByRole('button', { name: 'Neuen Fragebogen anlegen' }).click();
  await page.waitForSelector('#fb-schl-t');
  await page.getByRole('button', { name: 'Neues Schlüsselpaar anlegen' }).click();
  await page.fill('#fb-schl-name', 'Probe Ausfuellen'); await page.fill('#fb-schl-pw1', 'ein langes passwort ausfuellen'); await page.fill('#fb-schl-pw2', 'ein langes passwort ausfuellen');
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 15000 }).catch(async e => { rec({ typ: 'befund', was: 'Schlüsselpaar: kein Download', meldung: await page.evaluate(() => [...document.querySelectorAll('.fehl, [role=alert]')].map(z => z.textContent.trim()).slice(0, 4)) }); throw e; }), page.getByRole('button', { name: 'Schlüsselpaar erzeugen und Datei speichern' }).click()]);
  await dl.saveAs(join(OUT, 'probe-ausfuellen.statable-schluessel'));
  await page.check('#fb-schl-gesichert');
  await page.getByRole('button', { name: 'Öffentlichen Schlüssel in den Fragebogen übernehmen' }).click();
  await page.waitForSelector('#fb-schl-pub');
  await page.getByRole('button', { name: /Exportieren \(Dateiformate\)/ }).click();
  rec({ typ: 'befund', was: 'Zum Verschicken (Datei) vor dem Klick', aria: await page.getByTestId('fb-versand-datei').getAttribute('aria-disabled'), grund: await page.evaluate(() => [...document.querySelectorAll('.ex [id*=grund], #fb-ex-grund, #fb-ex-versand-grund')].map(z => z.textContent.trim()).slice(0, 2)) });
  const [dlf] = await Promise.all([page.waitForEvent('download', { timeout: 15000 }), page.getByTestId('fb-versand-datei').click({ force: true })]);
  datei = join(OUT, 'fragebogen-ausfuellen.html'); await dlf.saveAs(datei);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: /Exportieren \(Dateiformate\)/ }).click();
  await page.getByTestId('fb-versand-link').click();
  await page.getByTestId('fb-link-feld').waitFor();
  link = (await page.inputValue('#fb-ex-link')).replace('https://statable.eu', BASIS);
  rec({ typ: 'datei', was: 'Fragebogen-Datei (für file://)', pfad: datei });
  rec({ typ: 'befund', was: 'Link (lokal umgeschrieben)', wert: link.slice(0, 60) + '…' });
  await ctx.close();
}

/** Füllt die Antworten einer Seite aus (erste Option je Frage, Testtext je Textfeld, Einwilligung), dann „Weiter“. */
async function fuelleUndWeiter(page) {
  if (await page.locator('[data-schritt="einwilligung"] #einw').count()) await page.locator('#einw').check().catch(() => {});
  const namen = await page.evaluate(() => [...new Set([...document.querySelectorAll('input[type=radio][name]')].filter(r => !r.checked).map(r => r.name))]);
  for (const n of namen) {
    const gruppe = await page.evaluate(nm => [...document.querySelectorAll('input[type=radio]')].some(r => r.name === nm && r.checked), n);
    if (!gruppe) await page.locator(`input[type=radio][name="${n}"]`).first().check({ force: true }).catch(() => {});
  }
  for (const c of await page.locator('[data-frage] input[type=checkbox]').all()) { /* Mehrfachauswahl: erste Option je Frage */ }
  for (const t of await page.locator('[data-frage] input[type=text]:visible, [data-frage] textarea:visible, [data-frage] [data-feld]:visible').all()) {
    if (!(await t.inputValue().catch(() => '')).trim()) await t.fill('Test').catch(() => {});
  }
  for (const z of await page.locator('[data-frage] input[type=number]:visible').all()) {
    if (!(await z.inputValue().catch(() => ''))) await z.fill('3').catch(() => {});
  }
  for (const d of await page.locator('[data-frage] input[type=date]:visible').all()) {
    if (!(await d.inputValue().catch(() => ''))) await d.fill('1990-05-17').catch(() => {});
  }
  const weiter = page.locator('[data-weiter]').first();
  if (await weiter.count()) await weiter.click({ timeout: 5000 }).catch(() => {});
}

const schrittName = (page) => page.evaluate(() =>
  document.querySelector('[data-schritt]')?.getAttribute('data-schritt') ?? document.querySelector('[data-seite]')?.getAttribute('data-seite') ?? (document.querySelector('[data-weg="datei"]') ? 'abschluss' : 'unbekannt'));

/** Durchlauf der Ausfüllseite. `modus`: 'normal' | 'kontrast' ; `breitePx` ; `geraet` (Handy-Emulation). */
async function durchlauf(name, url, { breitePx = 1280, hoehePx = 900, modus = 'normal', geraet = null, mitTab = true } = {}) {
  const extra = { ...(geraet ?? {}), ...(modus === 'kontrast' ? { forcedColors: 'active' } : {}) };
  const ctx = await b.newContext({ locale: 'de-DE', acceptDownloads: true, ...extra, viewport: geraet ? geraet.viewport : { width: breitePx, height: hoehePx } });
  const page = await ctx.newPage();
  page.on('pageerror', e => rec({ typ: 'seitenfehler', ort: name, meldung: e.message.slice(0, 160) }));
  await page.goto(url); await page.waitForTimeout(800);
  for (let i = 0; i < 20; i++) {
    await page.waitForTimeout(350);
    const s = await schrittName(page);
    const ort = `${name} / ${s}`;
    if (modus === 'kontrast') {
      await axeSeite(page, ort, 'Kontrastmodus');
      await kontrastmodus(page, ort);
    } else {
      await axeSeite(page, ort, `${breitePx} px`);
      await keinUeberlauf(page, ort);
      await zielgroesse(page, ort, 44);
      if (mitTab && (s === 'einleitung' || i === 2 || s === 'abschluss')) await tabWalk(page, 'body', ort);
    }
    if (s === 'abschluss') break;
    await fuelleUndWeiter(page);
  }
  rec({ typ: 'ablauf', ort: name, modus, ende: await schrittName(page) });
  await ctx.close();
}

// 1. Datei (file://) bei 1280 und 320 px, Normal und Kontrast
await durchlauf('Datei 1280 px', pathToFileURL(datei).href, { breitePx: 1280 });
await durchlauf('Datei 320 px', pathToFileURL(datei).href, { breitePx: 320, hoehePx: 800, mitTab: false });
await durchlauf('Datei Kontrast', pathToFileURL(datei).href, { modus: 'kontrast' });
// 2. Link bei 1280 und 320 px, Handy (Pixel 7), Kontrast
await durchlauf('Link 1280 px', link, { breitePx: 1280 });
await durchlauf('Link 320 px', link, { breitePx: 320, hoehePx: 800, mitTab: false });
await durchlauf('Link Handy Pixel 7', link, { geraet: devices['Pixel 7'], mitTab: false });
await durchlauf('Link Kontrast', link, { modus: 'kontrast' });

await b.close();
console.log('ENDE ausfuellen; Seitenfehler:', LOG.filter(z => z.typ === 'seitenfehler').length);
