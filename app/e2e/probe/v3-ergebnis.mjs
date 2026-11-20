// V3 Teil 2 Ergebnisdatei: Erstnutzer-Probe NUR MIT TASTATUR für die gezählten Schritte, axe, Bilder in drei Breiten.
//   Vorlauf (Klicks, zählt nicht): Lehrperson stellt ein Übungsblatt zusammen; Studierende öffnet den Link, speichert, beantwortet alle Fragen.
//   K3a Studierende: auf dem Übungsblatt „Ergebnis als Datei speichern“ → Datei kommt. Ziel: höchstens 2 Aktionen.
//   K3b Lehrende: Seite des Pfads → „Teilen oder Übungsblatt“ → „Übungsblatt zusammenstellen“ → „Ergebnisdateien wählen“ (4 Dateien: 2 gültig, 1 doppelt, 1 Unsinn) → Tabelle. Ziel: höchstens 4 Aktionen.
//   Danach: axe auf beiden Seiten, Bilder 375/1280/2560 px mit Überlauf, Druckseite des Übungsblatts als Bild.
// Aufruf aus app/:  PORT=5242 node e2e/probe/v3-ergebnis.mjs
import { chromium } from 'playwright';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const APP = fileURLToPath(new URL('../..', import.meta.url));
const AXE = readFileSync(path.join(APP, 'node_modules/axe-core/axe.min.js'), 'utf8');
const BASE = 'http://127.0.0.1:' + (process.env.PORT || '5242') + '/';
const OUT = path.resolve(APP, '../docs/ausbau/bf-v3');
mkdirSync(OUT, { recursive: true });
const PFAD = { id: 'mein-v3erg', name: 'Kurs Beschreiben', einheiten: ['skalenniveau', 'lagemasse-streuung', 'ausreisser'] };
const erg = { zeitpunkt: new Date().toISOString(), url: BASE, k: [], axe: [], bilder: [], fehler: [] };
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

const browser = await chromium.launch({ headless: true });
async function neuerKontext(mitPfad) {
  const ctx = await browser.newContext({ locale: 'de-DE', viewport: { width: 1366, height: 850 }, acceptDownloads: true });
  await ctx.addInitScript(([p, mit]) => { try { localStorage.setItem('statable-einst', JSON.stringify({ rundgang: false })); if (mit && !localStorage.getItem('statable-eigene-pfade')) localStorage.setItem('statable-eigene-pfade', JSON.stringify([p])); } catch { /* weiter */ } }, [PFAD, mitPfad]);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => erg.fehler.push(String(e.message).slice(0, 200)));
  return { ctx, page };
}
const fokus = (page) => page.evaluate(() => { const e = document.activeElement; return e ? ((e.getAttribute('aria-label') || e.textContent || e.value || '') + '').replace(/\s+/g, ' ').trim().slice(0, 80) : ''; });
async function tabBis(page, re, k, max = 160) {
  for (let i = 0; i < max; i++) { await page.keyboard.press('Tab'); k.tabs++; await page.waitForTimeout(30); if (re.test(await fokus(page))) return true; }
  throw new Error('nicht erreicht: ' + re);
}
async function aktion(page, k, taste = 'Enter') { await page.keyboard.press(taste); k.aktionen++; await page.waitForTimeout(250); }
const axe = async (page, zustand) => {
  await page.addScriptTag({ content: AXE });
  const v = await page.evaluate(async (t) => { const r = await window.axe.run(document, { runOnly: { type: 'tag', values: t } }); return r.violations.map(v => ({ id: v.id, n: v.nodes.length, ziel: v.nodes.slice(0, 3).map(x => x.target.join(' ')) })); }, TAGS);
  erg.axe.push({ zustand, verstoesse: v });
};
async function bilder(page, sel, name) {
  for (const w of [375, 1280, 2560]) {
    await page.setViewportSize({ width: w, height: w === 375 ? 812 : 1100 });
    await page.waitForTimeout(300);
    const ueber = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    await page.locator(sel).first().scrollIntoViewIfNeeded();
    const datei = `${name}-${w}.png`; await page.screenshot({ path: path.join(OUT, datei) });
    erg.bilder.push({ datei, breite: w, ueberlaufPx: ueber });
  }
  await page.setViewportSize({ width: 1366, height: 850 });
}

// ---------------- Vorlauf Lehrperson: Blatt zusammenstellen, Link holen
const L = await neuerKontext(true);
await L.page.goto(BASE + '#lernen/pfad/' + PFAD.id); await L.page.waitForSelector('#ln-liste-t');
await L.page.getByRole('button', { name: 'Teilen oder Übungsblatt' }).click();
await L.page.locator('.ub summary').click();
await L.page.getByRole('button', { name: 'Aus jeder Einheit eine Frage' }).click();
await L.page.waitForTimeout(400);
const link = await L.page.locator('#ln-teil-link').inputValue();

// Druckseite einmal als Bild
{
  const fenster = L.page.waitForEvent('popup', { timeout: 8000 });
  await L.page.getByRole('button', { name: 'Übungsblatt drucken' }).click();
  const p2 = await fenster; await p2.waitForLoadState(); await p2.setViewportSize({ width: 900, height: 1200 });
  await p2.screenshot({ path: path.join(OUT, 'v3-druckseite.png'), fullPage: true });
  erg.bilder.push({ datei: 'v3-druckseite.png', breite: 900 });
  await p2.close();
}

// ---------------- Vorlauf Studierende: Link öffnen, speichern, alle Fragen beantworten
const S = await neuerKontext(false);
await S.page.goto(link); await S.page.waitForSelector('#pi-name');
await S.page.getByRole('button', { name: 'In meine Pfade speichern' }).click();
await S.page.waitForSelector('#ln-liste-t');
await S.page.getByRole('link', { name: /Übungsblatt: Kurs Beschreiben/ }).first().click();
await S.page.waitForSelector('h1#ln-t'); await S.page.waitForTimeout(800);
for (let i = 0; i < 10; i++) {
  if (await S.page.locator('.ue-antwort').count()) await S.page.locator('.ue-antwort').first().click();
  else if (await S.page.getByRole('button', { name: 'Prüfen' }).count()) await S.page.getByRole('button', { name: 'Prüfen' }).click();
  else break;
  await S.page.waitForTimeout(200);
  const weiter = S.page.getByRole('button', { name: /Nächste Frage|Zum Ergebnis/ });
  if (!(await weiter.count())) break;
  const ende = /Zum Ergebnis/.test(await weiter.first().textContent());
  await weiter.first().click(); await S.page.waitForTimeout(200);
  if (ende) break;
}
erg.stand = (await S.page.locator('.pa-ergebnis p').first().textContent()).trim();

// ---------------- K3a Studierende speichert das Ergebnis
let dateiText = '';
{
  const k = { name: 'K3a Ergebnis als Datei speichern', ziel: 'höchstens 2 Aktionen', aktionen: 0, tabs: 0, geschafft: false, notiz: [] };
  try {
    await S.page.locator('h1#ln-t').focus();
    const dl = S.page.waitForEvent('download', { timeout: 8000 });
    await tabBis(S.page, /^Ergebnis als Datei speichern$/, k); await aktion(S.page, k);
    const d = await dl;
    const ziel = path.join(OUT, 'v3-ergebnis-probe.json'); await d.saveAs(ziel);
    dateiText = readFileSync(ziel, 'utf8');
    k.notiz.push('Datei: ' + d.suggestedFilename());
    k.notiz.push('Ansage: ' + ((await S.page.locator('#ansage-hoeflich').textContent()) || '').trim());
    const j = JSON.parse(dateiText);
    k.geschafft = j.art === 'statable-uebungsergebnis' && j.fragen.length === PFAD.einheiten.length && Object.keys(j.antworten).length === j.fragen.length;
  } catch (e) { k.notiz.push('Fehler: ' + e.message); }
  erg.k.push(k); console.log(JSON.stringify(k));
  await axe(S.page, 'Übungsblatt mit Ergebnis-Abschnitt');
  await bilder(S.page, '.pa-ergebnis', 'v3-ergebnis-studierende');
}

// ---------------- K3b Lehrperson liest die Dateien ein
{
  const j = JSON.parse(dateiText);
  const zweite = { ...j, name: 'Zweite Person', antworten: Object.fromEntries(j.fragen.map((id, i) => [id, i % 2 === 0])) };
  const dateien = [
    { name: 'a.json', mimeType: 'application/json', buffer: Buffer.from(dateiText) },
    { name: 'b.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(zweite)) },
    { name: 'a-kopie.json', mimeType: 'application/json', buffer: Buffer.from(dateiText) },
    { name: 'unsinn.json', mimeType: 'application/json', buffer: Buffer.from('{"hallo": 1}') }
  ];
  const k = { name: 'K3b Ergebnisse einlesen', ziel: 'höchstens 4 Aktionen', aktionen: 0, tabs: 0, geschafft: false, notiz: [] };
  try {
    await L.page.goto(BASE + '#lernen'); await L.page.goto(BASE + '#lernen/pfad/' + PFAD.id); await L.page.reload(); await L.page.waitForSelector('#ln-liste-t');
    await tabBis(L.page, /^Teilen oder Übungsblatt$/, k); await aktion(L.page, k);
    const offen = await L.page.locator('.ub').evaluate(e => e.open);
    if (!offen) { await tabBis(L.page, /^Übungsblatt zusammenstellen/, k); await aktion(L.page, k); await L.page.waitForTimeout(800); }
    else k.notiz.push('Bereich war schon offen');
    const wahl = L.page.waitForEvent('filechooser', { timeout: 8000 });
    await tabBis(L.page, /^Ergebnisdateien wählen$/, k); await aktion(L.page, k);
    const fc = await wahl; await fc.setFiles(dateien); await L.page.waitForTimeout(600);
    const zeilen = await L.page.locator('.ub-tab tbody tr').allTextContents();
    k.notiz.push('Ansage: ' + ((await L.page.locator('#ansage-hoeflich').textContent()) || '').trim());
    k.notiz.push('Tabelle: ' + zeilen.map(z => z.replace(/\s+/g, ' ').trim().slice(-30)).join(' | '));
    k.geschafft = zeilen.length === PFAD.einheiten.length && /2 Ergebnisse gezählt/.test(await L.page.locator('.ub-innen').textContent());
  } catch (e) { k.notiz.push('Fehler: ' + e.message); }
  erg.k.push(k); console.log(JSON.stringify(k));
  await axe(L.page, 'Übungsblatt-Bereich mit eingelesenen Ergebnissen');
  await bilder(L.page, '.ub-ergebnisse', 'v3-ergebnis-lehrende');
}

await browser.close();
writeFileSync(path.join(OUT, 'probe-ergebnis.json'), JSON.stringify(erg, null, 2));
console.log(JSON.stringify({ stand: erg.stand, axe: erg.axe.map(a => ({ z: a.zustand, n: a.verstoesse.length, v: a.verstoesse })), bilder: erg.bilder, fehler: erg.fehler }, null, 1));
