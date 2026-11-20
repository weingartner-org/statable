// V5 Teil 2: Lernpfad „Maschinelles Lernen verstehen“. Probe NUR MIT TASTATUR, axe, Überlauf, Bilder in drei Breiten.
//   K1: vom Lernlabor-Reiter „Vorhersagen“ über „Mehr dazu“ in den Lernpfad. Ziel: höchstens 2 Aktionen ab dem Ergebnis.
//   K2: im Pfad die Einheit „k-nächste Nachbarn“ öffnen. Ziel: höchstens 2 Aktionen.
// Aufruf aus app/:  PORT=5392 SPRACHE=de node e2e/probe/v5-lehre.mjs
import { chromium } from 'playwright';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const APP = fileURLToPath(new URL('../..', import.meta.url));
const AXE = readFileSync(path.join(APP, 'node_modules/axe-core/axe.min.js'), 'utf8');
const BASE = 'http://127.0.0.1:' + (process.env.PORT || '5392') + '/';
const SPRACHE = process.env.SPRACHE || 'de';
const OUT = path.resolve(APP, '../docs/ausbau/bf-v5');
mkdirSync(OUT, { recursive: true });
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const T = SPRACHE === 'en' ? { mehr: /More: learning path/, knn: /k-nearest neighbours/ } : { mehr: /Mehr dazu: Lernpfad/, knn: /k-nächste Nachbarn/ };
const erg = { zeitpunkt: new Date().toISOString(), sprache: SPRACHE, k: [], axe: [], ueberlauf: [], fehler: [] };

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ locale: SPRACHE === 'en' ? 'en-GB' : 'de-DE', viewport: { width: 1366, height: 900 } });
await ctx.addInitScript(() => { try { localStorage.setItem('statable-einst', JSON.stringify({ rundgang: false })); } catch { /* weiter */ } });
const page = await ctx.newPage();
page.on('pageerror', (e) => erg.fehler.push(String(e.message).slice(0, 200)));
const fokus = () => page.evaluate(() => ((document.activeElement?.textContent || '') + '').replace(/\s+/g, ' ').trim().slice(0, 120));
async function tabBis(re, k, max = 200) { for (let i = 0; i < max; i++) { await page.keyboard.press('Tab'); k.tabs++; await page.waitForTimeout(15); if (re.test(await fokus())) return; } throw new Error('nicht erreicht: ' + re); }
async function axe(name) {
  await page.addScriptTag({ content: AXE });
  const r = await page.evaluate(async (tags) => (await window.axe.run(document.querySelector('main') || document, { runOnly: tags })).violations.map(v => `${v.id} (${v.nodes.length})`), TAGS);
  erg.axe.push({ name, verstoesse: r });
}

// K1: Lernlabor-Reiter, Fokus im Ergebnis-Satz, dann per Tab zum Link „Mehr dazu“ und Enter
await page.goto(BASE + '?sprache=' + SPRACHE + '#verstehen/lernlabor/vorhersagen', { waitUntil: 'load' });
await page.waitForSelector('#ll-bereich-vorhersagen .ll-satz', { timeout: 90000 });
await page.locator('#ll-bereich-vorhersagen .ll-satz p').first().click();
const k1 = { name: 'K1 Mehr dazu → Lernpfad', tabs: 0, aktionen: 0 };
await tabBis(T.mehr, k1); k1.aktionen++;
await page.keyboard.press('Enter'); k1.aktionen++;
await page.waitForFunction(() => location.hash.includes('pfad/maschinelles-lernen'), null, { timeout: 30000 });
await page.waitForTimeout(800);
k1.ziel = await page.evaluate(() => location.hash);
erg.k.push(k1);
await axe('Pfad');

// K2: im Pfad die Einheit „k-nächste Nachbarn“
const k2 = { name: 'K2 Einheit kNN öffnen', tabs: 0, aktionen: 0 };
await page.locator('h1, h2').first().click().catch(() => {});
await tabBis(T.knn, k2); k2.aktionen++;
await page.keyboard.press('Enter'); k2.aktionen++;
await page.waitForTimeout(1200);
k2.ziel = await page.evaluate(() => location.hash);
erg.k.push(k2);
await axe('Einheit ml-knn');

// Überlauf und Bilder: Einheit ml-knn (Tabelle) und Pfad in drei Breiten
for (const [name, hash] of [['einheit-ml-knn', '#lernen/ml-knn'], ['einheit-ml-konfusionsmatrix', '#lernen/ml-konfusionsmatrix'], ['pfad', '#lernen/pfad/maschinelles-lernen']]) {
  for (const w of [375, 1280, 2560]) {
    await page.setViewportSize({ width: w, height: 900 });
    await page.goto(BASE + '?sprache=' + SPRACHE + hash, { waitUntil: 'load' });
    await page.waitForTimeout(1500);
    // die Erklärung aufklappen, falls zugeklappt
    await page.evaluate(() => document.querySelectorAll('details').forEach(d => { d.open = true; }));
    await page.waitForTimeout(300);
    const ue = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    erg.ueberlauf.push({ name, breite: w, px: ue });
    await page.screenshot({ path: path.join(OUT, `v5-lehre-${name}-${SPRACHE}-${w}.png`), fullPage: false });
  }
}
await browser.close();
writeFileSync(path.join(OUT, `v5-lehre-${SPRACHE}.json`), JSON.stringify(erg, null, 2));
console.log(JSON.stringify(erg, null, 2));
