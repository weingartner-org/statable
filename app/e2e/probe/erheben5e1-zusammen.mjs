// Stufe 5, Paket 5E1: .qdpx zum vorhandenen Projekt hinzufügen (Rückfrage „dieselbe Person?“), Ersetzen mit Rückfrage, Fall-Code-Matrix mit Zitaten als Datensatz, 320 px.
// Aufruf aus app/ (Vorschau auf Port 4251 läuft):  node e2e/probe/erheben5e1-zusammen.mjs [de|en]
import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { fileURLToPath } from 'node:url';

const BASE = process.env.BASE || 'http://127.0.0.1:4251';
const sprache = process.argv[2] === 'en' ? 'en' : 'de';
const QDPX = fileURLToPath(new URL('../../src/lib/testdaten/qdpx/', import.meta.url));
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const T = sprache === 'de'
  ? { hinzu: /Hinzufügen/, ersetzenWahl: /Das vorhandene Projekt ersetzen/, weiterErsetzen: /Weiter zum Ersetzen/, ja: /^Ersetzen$/, erstellen: 'Tabelle erstellen', datensatz: 'Als Datensatz übernehmen', zitate: /Zitate als Textspalten/ }
  : { hinzu: /^Add$/, ersetzenWahl: /Replace the existing project/, weiterErsetzen: /Continue to replace/, ja: /^Replace$/, erstellen: 'Create table', datensatz: 'Take over as data set', zitate: /Take over quotes as text columns/ };
const b = await chromium.launch();
let verstoesse = 0;
async function lauf(breite) {
  const ctx = await b.newContext({ locale: sprache === 'en' ? 'en-US' : 'de-DE', viewport: { width: breite, height: 900 }, serviceWorkers: 'block', colorScheme: 'light' });
  const page = await ctx.newPage();
  const fehler = [];
  page.on('pageerror', e => fehler.push('Seitenfehler: ' + e.message.slice(0, 300)));
  page.on('console', m => { if (m.type() === 'error') fehler.push('Konsole: ' + m.text().slice(0, 300)); });
  const axe = async (name, sel) => {
    const r = await new AxeBuilder({ page }).withTags(TAGS).include(sel).analyze();
    verstoesse += r.violations.length;
    console.log(`[${breite}] axe ${name}: ${r.violations.length}`, r.violations.map(v => v.id + ' ' + v.nodes.map(n => n.target.join(' ')).join(';')).join(' | ').slice(0, 300));
  };
  const ueberlauf = async (name) => { const o = await page.evaluate(() => ({ s: document.documentElement.scrollWidth, w: document.documentElement.clientWidth })); console.log(`[${breite}] Überlauf ${name}: ${o.s > o.w + 1 ? 'JA ' + o.s + '>' + o.w : 'nein'}`); };
  await page.goto(`${BASE}/${sprache === 'en' ? '?sprache=en' : ''}#interviews`, { timeout: 240000 });
  await page.waitForSelector('#iv-t', { timeout: 240000 });
  await page.waitForTimeout(2500);
  const datei = page.locator('input[type=file][accept=".qdpx"]');
  await datei.setInputFiles(QDPX + 'zusammen-a.qdpx');
  await page.waitForSelector('#qx-erg-t');
  console.log(`[${breite}] A eingelesen:`, (await page.locator('#qx-erg-t').locator('xpath=following-sibling::p[1]').innerText()).slice(0, 200));
  // B hinzufügen: Dialog mit Frage „dieselbe Person?“
  await datei.setInputFiles(QDPX + 'zusammen-b.qdpx');
  await page.waitForSelector('#qx-dlg-t');
  await page.waitForTimeout(500);
  const dlgText = (await page.locator('dialog[open]').innerText()).replace(/\s+/g, ' ');
  console.log(`[${breite}] Dialog:`, dlgText.slice(0, 700));
  console.log(`[${breite}] Fokus im Dialog:`, await page.evaluate(() => document.activeElement?.id || document.activeElement?.tagName));
  await axe('Dialog', 'dialog[open]');
  // zweite Rückfrage mit „Ja“ für die erste Person beantworten
  const ja = page.locator('dialog[open] input[type=radio][value=ja]').first();
  if (await ja.count()) await ja.check();
  await page.getByRole('button', { name: T.hinzu }).click();
  await page.waitForSelector('#qx-erg-t');
  await page.waitForTimeout(600);
  console.log(`[${breite}] Nach Hinzufügen:`, (await page.locator('.qx').innerText()).replace(/\s+/g, ' ').slice(0, 1400));
  await axe('qdpx nach Hinzufügen', '.qx');
  await ueberlauf('qdpx');
  // Matrix mit Zitaten als Datensatz
  await page.getByRole('button', { name: T.erstellen }).click();
  await page.waitForSelector('#qm-erg-t');
  await axe('Matrix', '.matrix');
  await ueberlauf('Matrix');
  await page.getByLabel(T.zitate).check();
  await page.getByRole('button', { name: T.datensatz, exact: true }).last().click();
  await page.waitForFunction(() => location.hash.startsWith('#daten'), null, { timeout: 120000 }).catch(() => console.log(`[${breite}] kein Wechsel zur Datenansicht`));
  await page.waitForTimeout(2500);
  console.log(`[${breite}] Datenansicht:`, (await page.locator('main').innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 500));
  await page.goto(`${BASE}/${sprache === 'en' ? '?sprache=en' : ''}#interviews`);
  await page.waitForSelector('#iv-t');
  await page.waitForTimeout(1500);
  console.log(`[${breite}] Interviews nach Datensatz noch da:`, await page.locator('#qx-dok-t').count());
  // Ersetzen mit Rückfrage
  await datei.setInputFiles(QDPX + 'zusammen-c.qdpx').catch(() => {});
  await page.waitForTimeout(800);
  if (await page.locator('#qx-dlg-t').count()) {
    await page.getByLabel(T.ersetzenWahl).check();
    await page.getByRole('button', { name: T.weiterErsetzen }).click();
    await page.waitForTimeout(600);
    console.log(`[${breite}] Rückfrage Ersetzen:`, (await page.locator('dialog[open]').innerText()).replace(/\s+/g, ' ').slice(0, 300), '| Fokus:', await page.evaluate(() => document.activeElement?.id));
    await axe('Rückfrage Ersetzen', 'dialog[open]');
    await page.getByRole('button', { name: T.ja }).click();
    await page.waitForSelector('#qx-erg-t');
    console.log(`[${breite}] Ersetzt:`, (await page.locator('#qx-erg-t').locator('xpath=following-sibling::p[1]').innerText()).slice(0, 200));
  } else console.log(`[${breite}] kein Dialog beim zweiten Einlesen (Projekt leer nach Neuladen?)`);
  console.log(`[${breite}] Fehler:`, fehler.length ? fehler.join(' || ') : 'keine');
  await ctx.close();
}
await lauf(1280);
await lauf(320);
console.log('Verstöße gesamt:', verstoesse);
await b.close();
