// Axe-Probe auf „Einleitung, Einwilligung und Abschluss (Rahmentexte)“ in „Fragebogen planen“: leer, gefüllt, Einwilligung an, Datenschutz-Vorlage mit Platzhalter-Warnung,
// Platzhalter ersetzt, Felder geleert. 1280 und 320 Pixel. Startet selbst einen Vite-Server. Aufruf in app/:  node e2e/probe/3-rahmen.mjs
import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { createServer } from 'vite';
import { fileURLToPath } from 'node:url';

const APP = fileURLToPath(new URL('../..', import.meta.url));
const server = await createServer({ root: APP, logLevel: 'error', server: { port: Number(process.env.PORT || 4372), host: '127.0.0.1', strictPort: false, watch: null } });   // kein Dateiwächter: im Hauptordner liegen public/webr und dist-* mit sehr vielen Dateien
await server.listen();
const U = `http://127.0.0.1:${server.httpServer.address().port}/#fragebogen`;
const b = await chromium.launch();
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
let verstoesse = 0, fehler = 0;
const ok = (c, was) => { console.log((c ? 'ok    ' : 'FEHLER') + ' ' + was); if (!c) fehler++; };
try {
  const page = await (await b.newContext({ locale: 'de-DE', viewport: { width: 1280, height: 1000 } })).newPage();
  page.on('pageerror', e => { console.log('Seitenfehler:', e.message); fehler++; });
  await page.goto(U, { timeout: 300000 });   // erster Aufruf übersetzt die ganze App
  await page.getByRole('button', { name: /Neuen Fragebogen anlegen/ }).click();
  await page.waitForSelector('section.rt');

  const pruefe = async (breite, zustand) => {
    await page.setViewportSize({ width: breite, height: 1000 });
    await page.waitForTimeout(300);
    const res = await new AxeBuilder({ page }).include('section.rt').include('section.ds').withTags(TAGS).analyze();
    verstoesse += res.violations.length;
    console.log(`${breite} px, ${zustand}: ${res.violations.length} Verstöße, ${res.incomplete.length} unklar`);
    for (const v of res.violations) console.log('   ', v.id, v.nodes.map(n => n.target.join(' ') + ' | ' + (n.any[0]?.message || n.all[0]?.message || '').slice(0, 120)));
  };
  const alle = async zustand => { for (const w of [1280, 320]) await pruefe(w, zustand); await page.setViewportSize({ width: 1280, height: 1000 }); };

  await alle('leer');
  ok(await page.locator('section.rt textarea').count() >= 2, 'Felder für Einleitung und Abschluss je Sprache da');
  ok(await page.locator('#fb-rt-ein-de').getAttribute('lang') === 'de', 'Feld trägt lang-Attribut');

  await page.fill('#fb-rt-ein-de', 'Willkommen zur Befragung.');
  await page.locator('#fb-rt-ein-de').blur();
  await page.fill('#fb-rt-abs-de', 'Danke! Rückgabe an [E-Mail eintragen]');
  await page.locator('#fb-rt-abs-de').blur();
  await page.waitForSelector('#fb-rt-abs-de-w');
  ok(/eckigen Klammern/.test(await page.locator('#fb-rt-abs-de-w').innerText()), 'Platzhalter-Warnung beim Abschlusstext');
  ok((await page.locator('#fb-rt-abs-de').getAttribute('aria-describedby')).includes('fb-rt-abs-de-w'), 'Warnung per aria-describedby am Feld');
  await alle('gefüllt mit Platzhalter-Warnung');

  await page.check('#fb-rt-ew-an');
  await page.waitForSelector('#fb-rt-ew-de');
  await page.fill('#fb-rt-ew-de', 'Ich stimme zu.');
  await page.locator('#fb-rt-ew-de').blur();
  ok(await page.locator('#fb-rt-ew-pflicht').isChecked(), 'Pflicht ist vorgewählt');
  await page.uncheck('#fb-rt-ew-pflicht');
  await alle('Einwilligung an');

  await page.getByRole('button', { name: 'Vorlage Teilnahme-Information einsetzen' }).click();
  await page.waitForSelector('#fb-ds-form');
  await page.getByRole('button', { name: 'Texte in den Fragebogen einsetzen' }).click();
  await page.waitForTimeout(300);
  const ja = page.getByRole('button', { name: 'Vorlage einsetzen' });
  if (await ja.count()) await ja.click();
  await page.waitForSelector('#fb-rt-ein-de-w');
  ok(true, 'Vorlage eingesetzt: Platzhalter-Warnung in der Einleitung');
  await alle('nach Vorlage mit Platzhaltern');

  await page.fill('#fb-rt-ein-de', 'Alles ersetzt.');
  await page.locator('#fb-rt-ein-de').blur();
  await page.waitForTimeout(200);
  ok(await page.locator('#fb-rt-ein-de-w').count() === 0, 'Warnung verschwindet nach dem Ersetzen');

  await page.fill('#fb-rt-abs-de', '');
  await page.locator('#fb-rt-abs-de').blur();
  await page.uncheck('#fb-rt-ew-an');
  await page.waitForTimeout(200);
  ok(await page.locator('#fb-rt-ew-de').count() === 0, 'Einwilligung aus: Textfelder weg');
  await alle('geleert');
} finally {
  await b.close();
  await server.close();
}
console.log(verstoesse || fehler ? `${verstoesse} Verstöße, ${fehler} Fehler` : 'alles ok: 0 Verstöße');
process.exit(verstoesse || fehler ? 1 : 0);
