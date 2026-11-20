// B2 Teil 2d-2: Block „Gibt es an einer Schwelle einen Sprung? (Regressions-Diskontinuität)“ in „Weitere Auswertungen“ der Regressionskarte.
// Erstnutzer-Probe NUR MIT TASTATUR (ab dem Blatt), axe im Block, Überlauf und Bilder in drei Breiten. Daten: Senatswahlen (src/lib/testdaten/senat.csv, vote, margin).
//   K1: Block öffnen, Ergebnis, Zuteilungsvariable wählen (Schwelle 0 und Bandbreiten-Vorschlag stehen schon da), „Sprung rechnen“. Ziel: höchstens 5 Aktionen.
//   K2: „Als R-Skript mit Daten (.zip)“ → Download. Ziel: 1 Aktion.
// Vorlauf (Maus, nicht gezählt): Datei öffnen → Neue Auswertung → Regression → vote aus margin.
// Aufruf aus app/:  PORT=5297 SPRACHE=de node e2e/probe/b2-rd.mjs
import { chromium } from 'playwright';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const APP = fileURLToPath(new URL('../..', import.meta.url));
const AXE = readFileSync(path.join(APP, 'node_modules/axe-core/axe.min.js'), 'utf8');
const BASE = 'http://127.0.0.1:' + (process.env.PORT || '5297') + '/';
const SPRACHE = process.env.SPRACHE || 'de';
const OUT = path.resolve(APP, '../docs/ausbau/bf-b2');
mkdirSync(OUT, { recursive: true });
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const T = SPRACHE === 'en'
  ? { neu: /^New analysis$/, karte: /predicted/, fertig: /^Done/, block: /Is there a jump at a threshold/, ziel: /What should be compared/, gruppe: /Which column decides about the treatment/, knopf: /^Calculate jump/, r: /As R script with data/ }
  : { neu: /^Neue Auswertung$/, karte: /vorhersagen/, fertig: /^Fertig/, block: /Gibt es an einer Schwelle einen Sprung/, ziel: /Was soll verglichen werden/, gruppe: /Welche Spalte entscheidet/, knopf: /^Sprung rechnen/, r: /Als R-Skript mit Daten/ };
const erg = { zeitpunkt: new Date().toISOString(), sprache: SPRACHE, k: [], axe: [], ueberlauf: [], bilder: [], fehler: [], saetze: '' };

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ locale: SPRACHE === 'en' ? 'en-GB' : 'de-DE', viewport: { width: 1366, height: 900 }, acceptDownloads: true });
await ctx.addInitScript(() => { try { localStorage.setItem('statable-einst', JSON.stringify({ rundgang: false })); } catch { /* weiter */ } });
const page = await ctx.newPage();
page.on('pageerror', (e) => erg.fehler.push(String(e.message).slice(0, 200)));
const fokus = () => page.evaluate(() => { const e = document.activeElement; if (!e) return ''; const l = e.id ? document.querySelector(`label[for="${e.id}"]`)?.textContent : ''; return ((l || e.closest('label')?.textContent || e.getAttribute('aria-label') || e.textContent || '') + '').replace(/\s+/g, ' ').trim().slice(0, 120); });
async function tabBis(re, k, max = 600) { for (let i = 0; i < max; i++) { await page.keyboard.press('Tab'); k.tabs++; if (re.test(await fokus())) return; } throw new Error('nicht erreicht: ' + re); }

await page.goto(BASE + '?sprache=' + SPRACHE, { waitUntil: 'load', timeout: 180000 });
await page.waitForTimeout(3000);
await page.locator('input[type=file]').first().setInputFiles(path.join(APP, 'src/lib/testdaten/senat.csv'));
await page.waitForTimeout(6000);
await page.locator('a, button').filter({ hasText: T.neu }).first().click();
await page.waitForTimeout(2500);
await page.getByRole('button', { name: T.karte }).first().click(); await page.waitForTimeout(2500);
const karte = (n) => page.locator('text="' + n + '" >> visible=true').first();
await karte('vote').click(); await page.waitForTimeout(1200);
await karte('margin').click();
await page.getByRole('button', { name: T.fertig }).click();
await page.waitForSelector('details.rdd > summary', { timeout: 180000 });
await page.waitForTimeout(1000);
erg.vorlauf = page.url();

await page.evaluate(() => { document.activeElement?.blur(); window.scrollTo(0, 0); });
const k1 = { name: 'K1 Sprung rechnen', tabs: 0, aktionen: 0 };
await tabBis(T.block, k1);
await page.keyboard.press('Enter'); k1.aktionen++;
await tabBis(T.ziel, k1);
await page.locator('details.rdd select').nth(0).selectOption('vote'); k1.aktionen++;
await tabBis(T.gruppe, k1);
await page.locator('details.rdd select').nth(1).selectOption('margin'); k1.aktionen++;
await tabBis(T.knopf, k1); await page.keyboard.press('Enter'); k1.aktionen++;
await page.waitForSelector('details.rdd .rdd-saetze', { timeout: 60000 });
erg.saetze = (await page.locator('details.rdd .rdd-saetze').innerText()).slice(0, 1500);
erg.tabellen = await page.locator('details.rdd table tbody tr').allInnerTexts();
erg.k.push(k1);

const k2 = { name: 'K2 R-Skript', tabs: 0, aktionen: 0 };
await tabBis(T.r, k2);
const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 20000 }), page.keyboard.press('Enter')]); k2.aktionen++;
k2.datei = dl.suggestedFilename(); erg.k.push(k2);

await page.addScriptTag({ content: AXE });
const axeLauf = (sel) => page.evaluate(async ({ tags, sel }) => { const x = await window.axe.run(document.querySelector(sel), { runOnly: { type: 'tag', values: tags } }); return x.violations.map(v => ({ id: v.id, n: v.nodes.length, ziel: v.nodes[0]?.target?.join(' ') })); }, { tags: TAGS, sel });
await page.locator('details.rdd .rdd-zeile').first().evaluate(e => e.scrollIntoView({ block: 'center' })); await page.waitForTimeout(300);
erg.axeEingaben = await axeLauf('details.rdd');
await page.locator('details.rdd .rdd-saetze').evaluate(e => e.scrollIntoView({ block: 'center' })); await page.waitForTimeout(300);
erg.axeErgebnis = [...(await axeLauf('details.rdd .rdd-saetze')), ...(await axeLauf('details.rdd div[style*="overflow-x"] table'))];
erg.axe = [...erg.axeEingaben, ...erg.axeErgebnis];
for (const breite of [375, 1280, 2560]) {
  await page.setViewportSize({ width: breite, height: 900 }); await page.waitForTimeout(400);
  const ue = await page.evaluate(() => { const b = document.querySelector('details.rdd'); const r = b.getBoundingClientRect(); return { seite: document.documentElement.scrollWidth > window.innerWidth + 1, block: Math.round(r.right) > window.innerWidth + 1 }; });
  erg.ueberlauf.push({ breite, ...ue });
  const datei = `b2-rd-${SPRACHE}-${breite}.png`;
  await page.locator('details.rdd').screenshot({ path: path.join(OUT, datei) }); erg.bilder.push(datei);
}
writeFileSync(path.join(OUT, `b2-rd-${SPRACHE}.json`), JSON.stringify(erg, null, 2));
console.log(JSON.stringify(erg, null, 2));
await browser.close();
