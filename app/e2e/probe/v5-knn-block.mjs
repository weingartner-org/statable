// V5 Teil 3: Block „Wie gut sagt mein Modell neue Fälle voraus? (k-nächste Nachbarn, Kreuzvalidierung)“ unter „Lässt sich etwas vorhersagen?“.
// Erstnutzer-Probe NUR MIT TASTATUR (ab dem Blatt), axe im Block, Überlauf und Bilder in drei Breiten.
//   K1: Block öffnen, Ziel wählen, zwei Merkmale ankreuzen, „Vorhersage prüfen“. Ziel: höchstens 6 Aktionen.
//   K2: „Als R-Skript mit Daten (.zip)“ → Download. Ziel: 1 Aktion.
// Vorlauf (Maus, nicht gezählt): #beispiele/pinguine → „Öffnen“ → „Nächste Frage“ bis zum Schritt „Simpson-Paradox“ (Art vorhersage) → „Frage öffnen“.
// Aufruf aus app/:  PORT=5297 SPRACHE=de node e2e/probe/v5-knn-block.mjs
import { chromium } from 'playwright';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const APP = fileURLToPath(new URL('../..', import.meta.url));
const AXE = readFileSync(path.join(APP, 'node_modules/axe-core/axe.min.js'), 'utf8');
const BASE = 'http://127.0.0.1:' + (process.env.PORT || '5297') + '/';
const SPRACHE = process.env.SPRACHE || 'de';
const OUT = path.resolve(APP, '../docs/ausbau/bf-v5');
mkdirSync(OUT, { recursive: true });
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const T = SPRACHE === 'en'
  ? { oeffnen: /^Open/, naechste: 'Next question', frage: 'Open the question', simpson: /Simpson/, block: /How well does my model predict/, ziel: /Which group should be predicted/, art: /species/i, m1: /bill length/i, m2: /flipper/i, knopf: /Check the prediction/, r: /As R script with data/ }
  : { oeffnen: /^Öffnen/, naechste: 'Nächste Frage', frage: 'Frage öffnen', simpson: /Simpson/, block: /Wie gut sagt mein Modell/, ziel: /Welche Gruppe soll vorhergesagt/, art: /Pinguinart/i, m1: /Schnabell/i, m2: /Flosse/i, knopf: /Vorhersage prüfen/, r: /Als R-Skript mit Daten/ };
const erg = { zeitpunkt: new Date().toISOString(), sprache: SPRACHE, k: [], axe: [], ueberlauf: [], bilder: [], fehler: [], saetze: '' };

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ locale: SPRACHE === 'en' ? 'en-GB' : 'de-DE', viewport: { width: 1366, height: 900 }, acceptDownloads: true });
await ctx.addInitScript(() => { try { localStorage.setItem('statable-einst', JSON.stringify({ rundgang: false })); } catch { /* weiter */ } });
const page = await ctx.newPage();
page.on('pageerror', (e) => erg.fehler.push(String(e.message).slice(0, 200)));
const fokus = () => page.evaluate(() => { const e = document.activeElement; if (!e) return ''; const l = e.id ? document.querySelector(`label[for="${e.id}"]`)?.textContent : ''; return ((l || e.closest('label')?.textContent || e.getAttribute('aria-label') || e.textContent || '') + '').replace(/\s+/g, ' ').trim().slice(0, 120); });
async function tabBis(re, k, max = 400) { for (let i = 0; i < max; i++) { await page.keyboard.press('Tab'); k.tabs++; if (re.test(await fokus())) return; } throw new Error('nicht erreicht: ' + re); }

// Vorlauf
await page.goto(BASE + '?sprache=' + SPRACHE + '#beispiele/pinguine', { waitUntil: 'load', timeout: 180000 });
await page.waitForTimeout(2500);
await page.waitForSelector('button[aria-describedby="t-pinguine"]', { timeout: 60000 }); await page.locator('button[aria-describedby="t-pinguine"]').click();
await page.waitForTimeout(4000);
for (let i = 0; i < 5; i++) { await page.getByRole('button', { name: T.naechste }).click(); await page.waitForTimeout(250); }   // Schritt 6 = vorhersage (Simpson-Paradox)
await page.getByRole('button', { name: T.frage }).click();
await page.waitForFunction(() => /#blatt\/(?!neu)/.test(location.hash), null, { timeout: 60000 });
await page.waitForSelector('details.knn > summary', { timeout: 180000 });
await page.waitForTimeout(1000);
erg.vorlauf = page.url();

// K1 nur Tastatur, Start: Fokus im Seitenkopf (Tab ab Seitenanfang)
await page.evaluate(() => { document.activeElement?.blur(); window.scrollTo(0, 0); });
const k1 = { name: 'K1 Block rechnen', tabs: 0, aktionen: 0 };
await tabBis(T.block, k1);
await page.keyboard.press('Enter'); k1.aktionen++;
await tabBis(T.ziel, k1);
// Auswahl mit Tastatur: Buchstaben tippen wählt die Option
const opt = await page.locator('details.knn select option').allInnerTexts();
const zielText = opt.find(t => T.art.test(t));
await page.locator('details.knn select').selectOption({ label: zielText }); k1.aktionen++;
await tabBis(T.m1, k1); await page.keyboard.press('Space'); k1.aktionen++;
await tabBis(T.m2, k1); await page.keyboard.press('Space'); k1.aktionen++;
await tabBis(T.knopf, k1); await page.keyboard.press('Enter'); k1.aktionen++;
await page.waitForSelector('details.knn table caption', { timeout: 60000 });
erg.saetze = (await page.locator('details.knn .knn-saetze').innerText()).slice(0, 900);
erg.k.push(k1);

// K2
const k2 = { name: 'K2 R-Skript', tabs: 0, aktionen: 0 };
await tabBis(T.r, k2);
const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 20000 }), page.keyboard.press('Enter')]); k2.aktionen++;
k2.datei = dl.suggestedFilename(); erg.k.push(k2);

// axe zweimal, je mit dem geprüften Teil in der Bildmitte (sonst misst axe den festen Seitenkopf als Hintergrund oder Verdeckung)
await page.addScriptTag({ content: AXE });
const axeLauf = (sel) => page.evaluate(async ({ tags, sel }) => { const x = await window.axe.run(document.querySelector(sel), { runOnly: { type: 'tag', values: tags } }); return x.violations.map(v => ({ id: v.id, n: v.nodes.length, ziel: v.nodes.slice(0, 3).map(n => n.target.join(' ')) })); }, { tags: TAGS, sel });
await page.locator('details.knn .knn-zeile').evaluate(e => e.scrollIntoView({ block: 'center' })); await page.waitForTimeout(300);
erg.axeEingaben = [...(await axeLauf('details.knn .knn-zeile')), ...(await axeLauf('details.knn fieldset'))];
await page.locator('details.knn figure').evaluate(e => e.scrollIntoView({ block: 'center' })); await page.waitForTimeout(300);
erg.axeErgebnis = [...(await axeLauf('details.knn figure')), ...(await axeLauf('details.knn table')), ...(await axeLauf('details.knn .knn-saetze'))];
erg.axe = [...erg.axeEingaben, ...erg.axeErgebnis];
for (const breite of [375, 1280, 2560]) {
  await page.setViewportSize({ width: breite, height: 900 }); await page.waitForTimeout(400);
  const ue = await page.evaluate(() => { const b = document.querySelector('details.knn'); const r = b.getBoundingClientRect(); return { seite: document.documentElement.scrollWidth > window.innerWidth + 1, block: Math.round(r.right) > window.innerWidth + 1 }; });
  erg.ueberlauf.push({ breite, ...ue });
  const datei = `v5-knn-block-${SPRACHE}-${breite}.png`;
  await page.locator('details.knn').screenshot({ path: path.join(OUT, datei) }); erg.bilder.push(datei);
}
writeFileSync(path.join(OUT, `v5-knn-block-${SPRACHE}.json`), JSON.stringify(erg, null, 2));
console.log(JSON.stringify(erg, null, 2));
await browser.close();
