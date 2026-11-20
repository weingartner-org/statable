// B4 Teil 1: Block „Wie verläuft die Veränderung bei jeder Person? (Wachstumskurvenmodell, Latent Growth)“ unter „Verändert sich etwas über mehrere Zeitpunkte?“.
// Erstnutzer-Probe NUR MIT TASTATUR (ab dem Blatt), axe im Block, Überlauf und Bilder in drei Breiten.
//   K1: Block öffnen, Zeitwerte eintragen (0, 8, 26 Wochen), „Wachstumskurve rechnen“. Ziel: höchstens 4 Aktionen.
//   K2: „Als R-Skript mit Daten (.zip)“ → Download. Ziel: 1 Aktion.
// Vorlauf (Maus, nicht gezählt): #beispiele/depression → „Öffnen“ → „Nächste Frage“ (Schritt 2 = Messwiederholung) → „Frage öffnen“.
// Aufruf aus app/:  PORT=5297 SPRACHE=de node e2e/probe/b4-wachstum.mjs
import { chromium } from 'playwright';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const APP = fileURLToPath(new URL('../..', import.meta.url));
const AXE = readFileSync(path.join(APP, 'node_modules/axe-core/axe.min.js'), 'utf8');
const BASE = 'http://127.0.0.1:' + (process.env.PORT || '5297') + '/';
const SPRACHE = process.env.SPRACHE || 'de';
const OUT = path.resolve(APP, '../docs/ausbau/bf-b4');
mkdirSync(OUT, { recursive: true });
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const T = SPRACHE === 'en'
  ? { naechste: 'Next question', frage: 'Open the question', aendern: 'Change columns and options', gruppe: /^Group \(change\)/, ohne: 'Continue without groups', block: /How does each person change over time/, zeit: /Time values of the measurements/, knopf: /Calculate growth curve/, r: /As R script with data/ }
  : { naechste: 'Nächste Frage', frage: 'Frage öffnen', aendern: 'Spalten und Optionen ändern', gruppe: /^Gruppe \(ändern\)/, ohne: 'Ohne Gruppen weiter', block: /Wie verläuft die Veränderung bei jeder Person/, zeit: /Zeitwerte der Messungen/, knopf: /Wachstumskurve rechnen/, r: /Als R-Skript mit Daten/ };
const erg = { zeitpunkt: new Date().toISOString(), sprache: SPRACHE, k: [], axe: [], ueberlauf: [], bilder: [], fehler: [], saetze: '' };

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ locale: SPRACHE === 'en' ? 'en-GB' : 'de-DE', viewport: { width: 1366, height: 900 }, acceptDownloads: true });
await ctx.addInitScript(() => { try { localStorage.setItem('statable-einst', JSON.stringify({ rundgang: false })); } catch { /* weiter */ } });
const page = await ctx.newPage();
page.on('pageerror', (e) => erg.fehler.push(String(e.message).slice(0, 200)));
const fokus = () => page.evaluate(() => { const e = document.activeElement; if (!e) return ''; const l = e.id ? document.querySelector(`label[for="${e.id}"]`)?.textContent : ''; return ((l || e.closest('label')?.textContent || e.getAttribute('aria-label') || e.textContent || e.tagName) + '').trim().slice(0, 140); });
async function tabBis(re, k, max = 500) { for (let i = 0; i < max; i++) { await page.keyboard.press('Tab'); k.tabs++; if (re.test(await fokus())) return; } throw new Error('nicht erreicht: ' + re); }

await page.goto(BASE + '?sprache=' + SPRACHE + '#beispiele/depression', { waitUntil: 'load', timeout: 180000 });
await page.waitForTimeout(2500);
await page.waitForSelector('button[aria-describedby="t-depression"]', { timeout: 60000 }); await page.locator('button[aria-describedby="t-depression"]').click();
await page.waitForTimeout(4000);
await page.getByRole('button', { name: T.naechste }).click(); await page.waitForTimeout(300);
await page.getByRole('button', { name: T.frage }).click();
await page.waitForFunction(() => /#blatt\/(?!neu)/.test(location.hash), null, { timeout: 60000 });
await page.waitForTimeout(4000);
// Das Beispiel hat eine Gruppenspalte; das Wachstumskurvenmodell gilt nur ohne Gruppen: Gruppe abwählen (Maus, Vorlauf)
await page.locator('summary', { hasText: T.aendern }).click(); await page.waitForTimeout(300);
await page.getByRole('button', { name: T.gruppe }).click(); await page.waitForTimeout(500);
await page.getByRole('button', { name: T.ohne }).click(); await page.waitForTimeout(1500);
await page.waitForSelector('details.wachstum > summary', { timeout: 180000 });
await page.waitForTimeout(1000);
erg.vorlauf = page.url();

await page.evaluate(() => { document.activeElement?.blur(); window.scrollTo(0, 0); });
const k1 = { name: 'K1 Wachstumskurve rechnen', tabs: 0, aktionen: 0 };
await tabBis(T.block, k1);
await page.keyboard.press('Enter'); k1.aktionen++;
await tabBis(T.zeit, k1);
await page.keyboard.type('0, 8, 26'); k1.aktionen++;
await tabBis(T.knopf, k1); await page.keyboard.press('Enter'); k1.aktionen++;
await page.waitForSelector('details.wachstum table caption', { timeout: 240000 });
erg.saetze = (await page.locator('details.wachstum .wk-saetze').innerText()).slice(0, 1200);
erg.k.push(k1);

const k2 = { name: 'K2 R-Skript', tabs: 0, aktionen: 0 };
await tabBis(T.r, k2);
const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 20000 }), page.keyboard.press('Enter')]); k2.aktionen++;
k2.datei = dl.suggestedFilename(); erg.k.push(k2);

await page.addScriptTag({ content: AXE });
const axeLauf = (sel) => page.evaluate(async ({ tags, sel }) => { const x = await window.axe.run(document.querySelector(sel), { runOnly: { type: 'tag', values: tags } }); return x.violations.map(v => ({ id: v.id, n: v.nodes.length, ziel: v.nodes[0]?.target?.join(' ').slice(0, 120) })); }, { tags: TAGS, sel });
await page.locator('details.wachstum .eingabe').evaluate(e => e.scrollIntoView({ block: 'center' })); await page.waitForTimeout(300);
erg.axeEingaben = [...(await axeLauf('details.wachstum .eingabe')), ...(await axeLauf('details.wachstum .schalter'))];
await page.locator('details.wachstum table').first().evaluate(e => e.scrollIntoView({ block: 'center' })); await page.waitForTimeout(300);
erg.axeErgebnis = [...(await axeLauf('details.wachstum table')), ...(await axeLauf('details.wachstum .wk-saetze'))];
erg.axe = [...erg.axeEingaben, ...erg.axeErgebnis];
for (const breite of [375, 1280, 2560]) {
  await page.setViewportSize({ width: breite, height: 900 }); await page.waitForTimeout(400);
  const ue = await page.evaluate(() => { const b = document.querySelector('details.wachstum'); const r = b.getBoundingClientRect(); return { seite: document.documentElement.scrollWidth > window.innerWidth + 1, block: Math.round(r.right) > window.innerWidth + 1 }; });
  erg.ueberlauf.push({ breite, ...ue });
  const datei = `b4-wachstum-${SPRACHE}-${breite}.png`;
  await page.locator('details.wachstum').screenshot({ path: path.join(OUT, datei) }); erg.bilder.push(datei);
}
writeFileSync(path.join(OUT, `b4-wachstum-${SPRACHE}.json`), JSON.stringify(erg, null, 2));
console.log(JSON.stringify(erg, null, 2));
await browser.close();
