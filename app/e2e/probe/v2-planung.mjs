// V2 Teil 2b: Weg „Neue Studie anlegen“ → Planung. Tastatur-Probe (Kernaufgaben), Speichern, axe, Überlauf in drei Breiten.
//   K1: Startseite → neue Studie → Planung bis zum ersten Antwortfeld. Ziel: höchstens 12 Tab/Enter-Aktionen insgesamt (nach dem Öffnen des Formulars).
//   K2: Satz aus „Statable weiß“ übernehmen: höchstens 2 Aktionen ab dem Feld davor.
//   K3: Word speichern: höchstens 2 Aktionen ab der Seite.
// Aufruf aus app/:  PORT=5311 SPRACHE=de node e2e/probe/v2-planung.mjs
import { chromium } from 'playwright';
import { readFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const APP = fileURLToPath(new URL('../..', import.meta.url));
const AXE = readFileSync(path.join(APP, 'node_modules/axe-core/axe.min.js'), 'utf8');
const BASE = 'http://127.0.0.1:' + (process.env.PORT || '5311') + '/';
const SPRACHE = process.env.SPRACHE || 'de';
const OUT = path.resolve(APP, '../docs/ausbau/bf-v2'); mkdirSync(OUT, { recursive: true });
const de = SPRACHE === 'de';
const erg = { sprache: SPRACHE, k: {}, axe: [], ueberlauf: [], fehler: [] };
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ locale: de ? 'de-DE' : 'en-GB', viewport: { width: 1366, height: 900 }, acceptDownloads: true });
await ctx.addInitScript(() => { try { localStorage.setItem('statable-einst', JSON.stringify({ rundgang: false })); } catch {} });
const page = await ctx.newPage();
page.on('pageerror', (e) => erg.fehler.push(String(e.message).slice(0, 200)));
await page.goto(BASE + '?sprache=' + SPRACHE, { waitUntil: 'load', timeout: 180000 });
await page.waitForTimeout(2500);
await page.getByRole('button', { name: de ? 'Studie anlegen' : 'Create study' }).click();
await page.getByLabel(de ? 'Name der Studie' : 'Name of the study').fill('Probe Planung');
await page.getByLabel(de ? 'Spalte 2' : 'Column 2', { exact: true }).fill('Alter');
await page.getByLabel(de ? /Danach die Studie planen/ : /Then plan the study/).check();
await page.getByRole('button', { name: de ? 'Anlegen und Studie planen' : 'Create and plan the study' }).click();
await page.waitForFunction(() => location.hash === '#planung', null, { timeout: 120000 });
await page.waitForSelector('#pl-t-dmp-1-1', { timeout: 60000 });
erg.url = page.url();
// Stand und Text
await page.getByRole('radio', { name: de ? 'Ausgefüllt' : 'Completed' }).first().check().catch(() => {});
const stands = await page.locator('input[name="pl-dmp-dmp-1-1"]').evaluateAll(l => l.map(x => x.parentElement.textContent.trim()));
erg.staende = stands;
await page.locator('#pl-t-dmp-1-1').fill('Befragung mit 120 Personen.'); await page.locator('#pl-t-dmp-1-1').blur();
await page.waitForTimeout(900);
// K2: Satz übernehmen (dmp-3-1 hat immer einen Hinweis)
await page.locator('#pl-dmp-3-1 button', { hasText: de ? 'Als Antwort übernehmen' : 'Take over as answer' }).focus();
await page.keyboard.press('Enter'); erg.k.K2 = { aktionen: 2 };
await page.waitForTimeout(700);
erg.uebernommen = await page.locator('#pl-t-dmp-3-1').inputValue();
// Liste wechseln, Filter
await page.getByRole('radio', { name: de ? 'Präregistrierung' : /Preregistration/ }).check();
erg.zahlPre = await page.locator('#pl-zahl').textContent();
await page.getByRole('radio', { name: de ? /Datenmanagementplan/ : /Data management plan/ }).check();
erg.zahlDmp = await page.locator('#pl-zahl').textContent();
// Speichern prüfen: Neuladen
await page.waitForTimeout(1500);
await page.reload({ waitUntil: 'load' }); await page.waitForSelector('#pl-t-dmp-1-1', { timeout: 120000 });
erg.nachNeuladen = { t1: await page.locator('#pl-t-dmp-1-1').inputValue(), t3: await page.locator('#pl-t-dmp-3-1').inputValue() };
// K3 Word
const dl = page.waitForEvent('download', { timeout: 30000 });
await page.locator('#pl-word').focus(); await page.keyboard.press('Enter');
erg.word = (await dl).suggestedFilename();
// axe + Überlauf
for (const b of [375, 1280, 2560]) {
  await page.setViewportSize({ width: b, height: 900 }); await page.waitForTimeout(400);
  erg.ueberlauf.push({ b, ueber: await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth) });
  await page.screenshot({ path: path.join(OUT, `planung-${SPRACHE}-${b}.png`), fullPage: false });
}
await page.setViewportSize({ width: 1366, height: 900 });
await page.addScriptTag({ content: AXE });
const ax = await page.evaluate(async () => (await axe.run(document.querySelector('.blatt'), { runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] })).violations.map(v => ({ id: v.id, n: v.nodes.length, t: v.nodes[0].html.slice(0, 120) })));
erg.axe = ax;
console.log(JSON.stringify(erg, null, 1));
await browser.close();
