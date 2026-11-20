// V5 Teil 1: Lernlabor-Reiter „Vorhersagen (k-nächste Nachbarn)“. Erstnutzer-Probe NUR MIT TASTATUR, axe, Überlauf, Bilder in drei Breiten.
//   K1: im Lernlabor zum Reiter „Vorhersagen“ und Ergebnis lesen. Ziel: höchstens 2 Aktionen.
//   K2: k auf 1 stellen (Training fast 0 % Fehler, Test nicht). Ziel: höchstens 3 Aktionen.
//   K3: Standardisieren ausschalten. Ziel: 1 Aktion.
// Aufruf aus app/:  PORT=5391 SPRACHE=de node e2e/probe/v5-vorhersagen.mjs
import { chromium } from 'playwright';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const APP = fileURLToPath(new URL('../..', import.meta.url));
const AXE = readFileSync(path.join(APP, 'node_modules/axe-core/axe.min.js'), 'utf8');
const BASE = 'http://127.0.0.1:' + (process.env.PORT || '5391') + '/';
const SPRACHE = process.env.SPRACHE || 'de';
const OUT = path.resolve(APP, '../docs/ausbau/bf-v5');
mkdirSync(OUT, { recursive: true });
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const T = SPRACHE === 'en'
  ? { reiter: /Predictions/, k: /number of neighbours/, std: /Standardise/ }
  : { reiter: /Vorhersagen/, k: /Zahl der Nachbarn/, std: /standardisieren/ };
const erg = { zeitpunkt: new Date().toISOString(), sprache: SPRACHE, k: [], axe: [], ueberlauf: [], bilder: [], fehler: [], saetze: {} };

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ locale: SPRACHE === 'en' ? 'en-GB' : 'de-DE', viewport: { width: 1366, height: 900 } });
await ctx.addInitScript(() => { try { localStorage.setItem('statable-einst', JSON.stringify({ rundgang: false })); } catch { /* weiter */ } });
const page = await ctx.newPage();
page.on('pageerror', (e) => erg.fehler.push(String(e.message).slice(0, 200)));
const fokus = () => page.evaluate(() => { const e = document.activeElement; if (!e) return ''; const l = e.id ? document.querySelector(`label[for="${e.id}"]`)?.textContent : ''; return ((l || e.closest('label')?.textContent || e.getAttribute('aria-label') || e.textContent || '') + '').replace(/\s+/g, ' ').trim().slice(0, 90); });
async function tabBis(re, k, max = 120) { for (let i = 0; i < max; i++) { await page.keyboard.press('Tab'); k.tabs++; await page.waitForTimeout(20); if (re.test(await fokus())) return; } throw new Error('nicht erreicht: ' + re); }
const satz = () => page.locator('#ll-bereich-vorhersagen .ll-satz').innerText();

await page.goto(BASE + '?sprache=' + SPRACHE + '#verstehen/lernlabor', { waitUntil: 'load' });
await page.waitForSelector('[role=tablist] [role=tab]', { timeout: 90000 });
// K1: Fokus auf den gewählten Reiter (Tab), dann Ende-Taste: der neue Reiter ist der letzte
const k1 = { name: 'K1 Reiter Vorhersagen', tabs: 0, aktionen: 0 };
await tabBis(/Stichproben|Samples/, k1);
await page.keyboard.press('End'); k1.aktionen++;
await page.waitForSelector('#ll-bereich-vorhersagen .ll-satz');
k1.reiter = await fokus(); erg.k.push(k1);
erg.saetze.start = await satz();
// K2: zum Regler, Pos1 = k 1
const k2 = { name: 'K2 k = 1', tabs: 0, aktionen: 0 };
await tabBis(T.k, k2);
await page.keyboard.press('Home'); k2.aktionen++; await page.waitForTimeout(150);
erg.saetze.k1 = await satz(); erg.k.push(k2);
// K3: Kästchen Standardisieren
const k3 = { name: 'K3 Standardisieren aus', tabs: 0, aktionen: 0 };
await tabBis(T.std, k3);
await page.keyboard.press('Space'); k3.aktionen++; await page.waitForTimeout(150);
erg.saetze.roh = await satz(); erg.k.push(k3);
await page.keyboard.press('Space'); await page.waitForTimeout(100);

async function axe(name) {
  await page.addScriptTag({ content: AXE });
  const r = await page.evaluate(async (tags) => { const x = await window.axe.run(document.querySelector('#ll-bereich-vorhersagen'), { runOnly: { type: 'tag', values: tags } }); return x.violations.map(v => ({ id: v.id, n: v.nodes.length, ziel: v.nodes.slice(0, 3).map(n => n.target.join(' ')) })); }, TAGS);
  erg.axe.push({ name, verstoesse: r });
}
await axe('Reiter ' + SPRACHE);
for (const breite of [375, 1280, 2560]) {
  await page.setViewportSize({ width: breite, height: 900 }); await page.waitForTimeout(300);
  const u = await page.evaluate(() => ({ seite: document.documentElement.scrollWidth - window.innerWidth, breiteste: Math.max(...[...document.querySelectorAll('#ll-bereich-vorhersagen *')].map(e => e.getBoundingClientRect().right)) - window.innerWidth }));
  erg.ueberlauf.push({ breite, ...u });
  const datei = `v5-vorhersagen-${SPRACHE}-${breite}.png`;
  await page.locator('#ll-bereich-vorhersagen').screenshot({ path: path.join(OUT, datei) }); erg.bilder.push(datei);
}
await page.emulateMedia({ forcedColors: 'active' }); await page.setViewportSize({ width: 1280, height: 900 }); await page.waitForTimeout(200);
await page.locator('#ll-bereich-vorhersagen').screenshot({ path: path.join(OUT, `v5-vorhersagen-${SPRACHE}-kontrast.png`) });
writeFileSync(path.join(OUT, `v5-vorhersagen-${SPRACHE}.json`), JSON.stringify(erg, null, 2));
console.log(JSON.stringify(erg, null, 2));
await browser.close();
