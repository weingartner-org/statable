// Stufe 3C: „Zum Verschicken“ im Export-Menü von „Fragebogen planen“ (gesperrt ohne Schlüssel, Datei, Link mit „Kopieren“) und die gebaute Ausfüllseite /ausfuellen/ (vite preview).
// Aufruf: PORT=5199 node e2e/probe/3c-versand.mjs   (gegen `vite preview` nach `vite build`)
import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const BASIS = `http://localhost:${process.env.PORT || 5199}`;
let fehler = 0;
const ok = (b, was) => { console.log((b ? 'ok    ' : 'FEHLER') + ' ' + was); if (!b) fehler++; };
const b = await chromium.launch();
const ctx = await b.newContext({ locale: 'de-DE', viewport: { width: 1400, height: 1000 }, acceptDownloads: true });
await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: BASIS });
const page = await ctx.newPage();
page.on('pageerror', e => { console.log('pageerror', e.message); fehler++; });
await page.goto(BASIS + '/#fragebogen'); await page.waitForSelector('h1');
await page.getByRole('button', { name: 'Neuen Fragebogen anlegen' }).click();
await page.waitForSelector('#fb-schl-t');
await page.locator('#fb-ex-knopf').click();
await page.waitForSelector('#fb-ex-versand-t');

// ---- ohne Schlüssel: gesperrt mit Erklärung
const datei = page.getByTestId('fb-versand-datei'), link = page.getByTestId('fb-versand-link');
ok(await datei.getAttribute('aria-disabled') === 'true' && await link.getAttribute('aria-disabled') === 'true', 'ohne Schlüssel (oder mit Fehlern): beide Knöpfe gesperrt (aria-disabled)');
const grund = (await page.locator('#fb-ex-versand-grund, #fb-ex-grund').first().innerText());
console.log('   Grund:', grund.slice(0, 160));
ok(/Schlüssel|Fehler/.test(grund), 'Grund steht da');
await link.click({ force: true });
ok(await page.getByTestId('fb-link-feld').count() === 0, 'gesperrt: kein Link entsteht');

// ---- Schlüssel anlegen
await page.getByRole('button', { name: 'Neues Schlüsselpaar anlegen' }).click();
await page.fill('#fb-schl-name', 'Umfrage Seminar'); await page.fill('#fb-schl-pw1', 'ein langes passwort 1'); await page.fill('#fb-schl-pw2', 'ein langes passwort 1');
const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Schlüsselpaar erzeugen und Datei speichern' }).click()]);
await dl.saveAs(join(mkdtempSync(join(tmpdir(), 'schl-')), 'k.statable-schluessel'));
await page.check('#fb-schl-gesichert');
await page.getByRole('button', { name: 'Öffentlichen Schlüssel in den Fragebogen übernehmen' }).click();
await page.waitForSelector('#fb-schl-pub');
const pub = await page.inputValue('#fb-schl-pub');

// ---- mit Schlüssel
const offen = await page.locator('#fb-ex-liste').count();
if (!offen) await page.locator('#fb-ex-knopf').click();
await page.waitForSelector('#fb-ex-versand-t');
const gesperrt = await link.getAttribute('aria-disabled');
console.log('   nach dem Schlüssel: aria-disabled =', gesperrt, '; Grund:', (await page.locator('#fb-ex-versand-grund, #fb-ex-grund').first().innerText().catch(() => '(keiner)')).slice(0, 140));
if (gesperrt === 'true') console.log('   (Der leere Plan hat Fehler: Probe läuft mit den Beispielen weiter, wenn möglich)');

const axeMenue = async name => {
  await page.waitForTimeout(400);
  const r = await new AxeBuilder({ page }).include('.ex').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
  ok(r.violations.length === 0, `axe ${name}: ${r.violations.map(v => v.id + ' ' + v.nodes.map(n => n.target.join(' ')).join('|')).join('; ') || '0 Verstöße'}`);
};
await axeMenue('Export-Menü mit „Zum Verschicken“');
if (gesperrt !== 'true') {
  await link.click();
  await page.getByTestId('fb-link-feld').waitFor();
  const url = await page.inputValue('#fb-ex-link');
  ok(url.startsWith('https://statable.eu/ausfuellen/#'), 'Link beginnt mit https://statable.eu/ausfuellen/#');
  await page.getByRole('button', { name: 'Link kopieren', exact: true }).click();
  ok(await page.evaluate(() => navigator.clipboard.readText()) === url, 'Kopieren legt den Link in die Zwischenablage');
  await axeMenue('mit Link-Feld');
  // Der Link, lokal geöffnet: die gebaute Seite
  const p2 = await ctx.newPage(); p2.on('pageerror', e => { console.log('pageerror(2)', e.message); fehler++; });
  await p2.goto(url.replace('https://statable.eu', BASIS));
  await p2.waitForSelector('[data-schritt="einleitung"]');
  ok(await p2.locator('h1').count() === 1, 'Ausfüllseite aus dem Link zeigt den Fragebogen (gebaute Seite unter /ausfuellen/)');
  const [d2] = await Promise.all([page.waitForEvent('download'), page.getByTestId('fb-versand-datei').click()]);
  const text = readFileSync(await d2.path(), 'utf8');
  ok(d2.suggestedFilename().endsWith('Fragebogen-Datei.html') && text.includes(pub) && !text.includes('AGE-SECRET-KEY'), 'Fragebogen-Datei: Name ' + d2.suggestedFilename() + ', enthält den öffentlichen Schlüssel, keinen privaten');
  console.log('   Dateigröße:', Buffer.byteLength(text), 'Byte');
}
await b.close();
console.log(fehler ? `${fehler} Fehler` : 'alles ok');
process.exit(fehler ? 1 : 0);
