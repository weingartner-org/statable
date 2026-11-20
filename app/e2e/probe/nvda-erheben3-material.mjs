// Material für die NVDA-Messung "Sammelimport" (Stufe 3, headless, ohne NVDA): echter Schlüssel über die Oberfläche, Plan mit Einmal-Codes, mehrere echte Antworten über die Ausfüllseite.
// Ergebnis in %TEMP%\n3-daten\sammel\ : schluessel.statable-schluessel (Passwort 'ein langes passwort 3n'), plan-mit-codes.json, antwort-*.age, antwort-*.txt, brief.txt
// Aufruf in app/:  node e2e/probe/nvda-erheben3-material.mjs   (gegen vite preview Port 4232)
import { chromium } from '@playwright/test';
import { mkdirSync, readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const BASIS = `http://127.0.0.1:${process.env.NVDA_PORT ?? 4232}`;
const DIR = join(tmpdir(), 'n3-daten'); const S = join(DIR, 'sammel'); mkdirSync(S, { recursive: true });
const PW = 'ein langes passwort 3n';
const b = await chromium.launch();
const ctx = await b.newContext({ locale: 'de-DE', viewport: { width: 1400, height: 1000 }, acceptDownloads: true });
const page = await ctx.newPage();
page.on('pageerror', (e) => console.log('pageerror', e.message));
await page.goto(BASIS + '/#fragebogen'); await page.waitForSelector('h1');
await page.locator('input[type=file][accept*=json]').first().setInputFiles(join(DIR, 'testplan.statable-fragebogen.json'));
await page.waitForTimeout(1000);
await page.getByRole('button', { name: 'Neues Schlüsselpaar anlegen' }).click();
await page.fill('#fb-schl-name', 'NVDA Probe'); await page.fill('#fb-schl-pw1', PW); await page.fill('#fb-schl-pw2', PW);
const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Schlüsselpaar erzeugen und Datei speichern' }).click()]);
await dl.saveAs(join(S, 'schluessel.statable-schluessel'));
await page.check('#fb-schl-gesichert');
await page.getByRole('button', { name: 'Öffentlichen Schlüssel in den Fragebogen übernehmen' }).click();
await page.waitForSelector('#fb-schl-pub');
console.log('Schlüssel', (await page.inputValue('#fb-schl-pub')).slice(0, 12));
await page.locator('#fb-codes-anzahl').fill('5');
await page.getByRole('button', { name: 'Codes erzeugen' }).click();
await page.waitForSelector('section.codes table.ct tbody tr');
const codes = await page.locator('section.codes table.ct tbody tr').evaluateAll((trs) => trs.map((t) => (t.innerText.match(/[A-Z0-9]{4}-[A-Z0-9]{4}/) ?? [''])[0]));
console.log('Codes', codes);
const [pd] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Als Datei speichern' }).click()]);
await pd.saveAs(join(S, 'plan-mit-codes.json'));
await page.locator('#fb-ex-knopf').click(); await page.waitForSelector('#fb-ex-versand-t');
await page.getByTestId('fb-versand-link').click(); await page.getByTestId('fb-link-feld').waitFor();
const link = (await page.inputValue('#fb-ex-link')).replace('https://statable.eu', BASIS);

async function antwort(code, art, name) {
  const c2 = await b.newContext({ locale: 'de-DE', viewport: { width: 1400, height: 1000 }, acceptDownloads: true }); const p = await c2.newPage(); await p.goto(link); await p.waitForSelector('[data-schritt="einleitung"]', { timeout: 8000 });
  const weiter = () => p.locator('[data-weiter]').click();
  await weiter();
  if (await p.locator('#einw').count()) { await p.locator('#einw').check(); await weiter(); }
  if (await p.locator('[data-schritt="code"]').count()) { await p.locator('#code').fill(code); await weiter(); }
  await p.locator('[data-seite="auswahl"]').waitFor();
  await p.getByRole('radio', { name: 'Grün', exact: true }).check(); await p.getByRole('checkbox', { name: 'Radio', exact: true }).check(); await weiter();
  await p.locator('[data-seite="felder"]').waitFor(); await p.locator('[data-frage="Z"] input[type=number]').fill('42'); await weiter();
  await p.locator('[data-seite="rang"]').waitFor(); await p.getByRole('button', { name: 'Diese Reihenfolge übernehmen' }).click(); await weiter();
  await p.locator('[data-seite="block"]').waitFor();
  for (const [id, w] of [['B1', 4], ['B2', 2], ['B3', 5]]) await p.locator(`input[data-item="${id}"][value="${w}"]`).check();
  await weiter();
  await p.locator('[data-weg="datei"]').waitFor();
  if (art === 'datei') { const [d] = await Promise.all([p.waitForEvent('download'), p.locator('[data-weg="datei"]').click()]); await d.saveAs(join(S, name)); }
  else writeFileSync(join(S, name), await p.inputValue('#antworttext'));
  await c2.close();
}
await antwort(codes[0], 'datei', 'antwort-1.age');
copyFileSync(join(S, 'antwort-1.age'), join(S, 'antwort-1-nochmal.age'));
await antwort(codes[1], 'text', 'antwort-2.txt');
await antwort(codes[1], 'datei', 'antwort-3.age');
await antwort('ZZZZ-ZZZZ', 'datei', 'antwort-4.age');
writeFileSync(join(S, 'brief.txt'), 'Das ist keine Antwort, nur ein Brief.');
console.log('fertig', S);
await b.close();
