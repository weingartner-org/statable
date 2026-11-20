// Barrierefreiheit Ausbau Stufe A3: Erstnutzer-Probe NUR MIT TASTATUR (Prüfplan A3).
// Aufgaben (wie eine Person, die die Seite zum ersten Mal sieht):
//   1. #kodieren: „Beispielprojekt laden (erfunden)“ auslösen
//   2. Arbeitsweise „Meine Arbeitsweise (Verfahren)“ auf ta-reflexiv stellen (Pfeiltasten)
//   3. Im Bereich „Themen“ drei Themen anlegen (Namen tippen, Enter)
//   4. Einem Thema einen Code zuordnen (Knopf „Code zuordnen“, Kästchen mit Leertaste)
//   5. Ein Thema verwerfen (Stand „verworfen“, übernehmen)
//   6. Arbeitsweise auf IPA stellen, Einzelfall-Modus starten
//   7. Im Dokument Satz mit S markieren, in Randnotizen tippen, speichern
//   8. „Fall als fertig markieren“ auslösen
// Regeln: kein click, kein locator.click, kein fill, kein focus() per Skript. Erlaubt: Tab, Umschalt+Tab,
// Enter, Leertaste, Pfeiltasten, Home, Esc, S und Tippen von Text. Seitenaufruf per goto ist erlaubt.
// Je Schritt höchstens 150 Tastendrücke; danach gilt er als nicht geschafft.
// Aufruf aus app/:  node e2e/probe/bf-ausbau-a3-erstnutzer.mjs
// Ergebnis: docs/ausbau/bf-a3/erstnutzer.json
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const APP = fileURLToPath(new URL('../..', import.meta.url));
const BASE = 'http://127.0.0.1:4291/';
const OUT = path.resolve(APP, '../docs/ausbau/bf-a3');
const MAX = 150;
const RN_TEXT = 'Erstnutzer-Probe Notiz zur Stelle';
const NOTIZ = 'Erstnutzer-Probe: passt nicht zur Frage';

mkdirSync(OUT, { recursive: true });
const ergebnis = {
  zeitpunkt: new Date().toISOString(),
  url: BASE + '#kodieren',
  viewport: '1366x850',
  locale: 'de-DE',
  browser: 'chromium headless',
  eingabe: 'nur Tastatur (Tab, Umschalt+Tab, Enter, Leertaste, Pfeiltasten, Home, Esc, S, Tippen); kein Klick, kein focus() per Skript',
  schritte: [],
  fehler: [],
};

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ locale: 'de-DE', viewport: { width: 1366, height: 850 } });
await ctx.addInitScript(() => {
  try { localStorage.setItem('statable-einst', JSON.stringify({ rundgang: false })); } catch { /* ohne Speicher weiter */ }
});
const page = await ctx.newPage();
page.on('pageerror', (e) => ergebnis.fehler.push(String(e.message).slice(0, 200)));

class Abbruch extends Error {}
let s = null;
function neuerSchritt(name) {
  s = { name, geschafft: false, tasten: 0, zeichen: 0, pfad: [], fokusverlust: 0, nurMaus: [], haenger: [] };
  ergebnis.schritte.push(s);
  console.log(`\n== ${name}`);
}
const haengt = (t) => { s.haenger.push(t); console.log('  HÄNGER: ' + t); };

// Aktives Element nur lesen
const info = () => page.evaluate(() => {
  const e = document.activeElement;
  if (!e || e === document.body || e === document.documentElement) return null;
  let name = e.getAttribute('aria-label') || '';
  if (!name && e.labels && e.labels.length) name = [...e.labels].map((l) => l.textContent).join(' ');
  if (!name) name = e.textContent || e.value || '';
  name = name.replace(/\s+/g, ' ').trim().slice(0, 80);
  return { tag: e.tagName.toLowerCase(), id: e.id || '', typ: e.type || '', wert: e.value || '', name };
});

// Eine Taste drücken und protokollieren
async function taste(k) {
  if (s.tasten >= MAX) throw new Abbruch(`Budget von ${MAX} Tastendrücken erschöpft`);
  s.tasten++;
  await page.keyboard.press(k);
  await page.waitForTimeout(60);
  const x = await info();
  if (!x) s.fokusverlust++;
  const kurz = x ? `${x.typ ? x.tag + '[' + x.typ + ']' : x.tag} „${x.name}“${x.id ? ' #' + x.id : ''}` : 'body (Fokus verloren)';
  s.pfad.push(`${k} -> ${kurz}`);
  return x;
}

// Mit Tab (oder Umschalt+Tab) suchen, bis das Ziel den Fokus hat
async function suche(pred, { rueck = false, max = Infinity } = {}) {
  for (let i = 0; i < max; i++) {
    const x = await taste(rueck ? 'Shift+Tab' : 'Tab');
    if (x && pred(x)) return x;
  }
  return null;
}
// Erst in die vermutete Richtung (begrenzt), dann in die Gegenrichtung
async function finde(pred, ziel, richtung = 'vor') {
  const zurueck = richtung === 'zurueck';
  const r1 = await suche(pred, { rueck: zurueck, max: 75 });
  if (r1) return r1;
  const r2 = await suche(pred, { rueck: !zurueck });
  if (r2) return r2;
  throw new Abbruch(`Ziel nicht erreicht: ${ziel}`);
}
const id = (x) => (y) => y.id === x;

// Auswahlfeld mit Pfeiltasten auf einen Wert stellen (Fokus steht schon darauf)
async function stelleAuswahl(selId, wert) {
  const wert_ = () => page.evaluate((i) => document.getElementById(i)?.value ?? null, selId);
  let letzter = null, gedreht = false;
  for (;;) {
    const v = await wert_();
    if (v === wert) return v;
    if (v === letzter) {
      if (gedreht) throw new Abbruch(`Wert „${wert}“ in der Auswahl nicht gefunden`);
      await taste('Home'); gedreht = true; letzter = null; continue;
    }
    letzter = v;
    await taste('ArrowDown');
  }
}

async function schritt(name, fn) {
  neuerSchritt(name);
  try {
    await fn();
    if (s.haenger.length === 0) s.geschafft = true;
  } catch (e) {
    haengt(e instanceof Abbruch ? e.message : `Fehler: ${e.message}`.slice(0, 200));
  }
  console.log(`  -> ${s.geschafft ? 'GESCHAFFT' : 'NICHT GESCHAFFT'} (Tasten: ${s.tasten}, Fokusverlust: ${s.fokusverlust})`);
}

const themenZahl = () => page.evaluate(() => (document.getElementById('th-liste-t')?.textContent.match(/\((\d+)\)/) ?? [])[1] ?? null);
const codeZahl = () => page.evaluate(() => (document.getElementById('th-codes-t')?.textContent.match(/\((\d+)\)/) ?? [])[1] ?? null);
const text = (sel) => page.evaluate((q) => document.querySelector(q)?.textContent?.replace(/\s+/g, ' ').trim() ?? '', sel);

// ------------------------------------------------------------------ Start
neuerSchritt('0 Seite öffnen (Adresse, einmalig)');
await page.goto(BASE + '#kodieren');
await page.waitForSelector('#ko-t', { timeout: 30000 });
await page.waitForTimeout(1200);
s.geschafft = true;
console.log('  Seite da');

// ------------------------------------------------------------------ 1
await schritt('1 Beispielprojekt laden (erfunden)', async () => {
  await finde(id('ko-laden'), 'Knopf „Beispielprojekt laden (erfunden)“', 'vor');
  await taste('Enter');
  await page.waitForSelector('#ko-text', { timeout: 20000 });
  await page.waitForTimeout(1000);
});

// ------------------------------------------------------------------ 2
await schritt('2 Arbeitsweise „Meine Arbeitsweise (Verfahren)“ auf reflexive TA (Pfeiltasten)', async () => {
  await finde(id('ko-arbeitsweise'), 'Auswahl „Meine Arbeitsweise“', 'zurueck');
  await stelleAuswahl('ko-arbeitsweise', 'ta-reflexiv');
  await page.waitForTimeout(400);
  await page.waitForSelector('#th-neu-name', { timeout: 10000 });
});

// ------------------------------------------------------------------ 3
await schritt('3 Drei Themen anlegen (Namen tippen, Enter)', async () => {
  const namen = ['Weg ins Studium', 'Sorgen ums Geld', 'Hilfe suchen'];
  for (let i = 0; i < namen.length; i++) {
    await finde(id('th-neu-name'), 'Namensfeld „Name des Themas“', i === 0 ? 'vor' : 'zurueck');
    await page.keyboard.type(namen[i]);
    s.zeichen += namen[i].length;
    await taste('Enter');
    await page.waitForTimeout(400);
    const z = await info();
    if (!z || z.id !== 'th-detail-t') haengt(`Nach Enter bei „${namen[i]}“ nicht im neuen Thema (Fokus: ${z?.id || 'keiner'})`);
  }
  const n = await themenZahl();
  console.log(`  Themen in der Liste: ${n}`);
  if (n !== '3') haengt(`Erwartet 3 Themen, gefunden ${n}`);
});

// ------------------------------------------------------------------ 4
await schritt('4 Code „einem Thema“ zuordnen (Knopf, Kästchen mit Leertaste)', async () => {
  await finde(id('th-code-zuordnen'), 'Knopf „Code zuordnen“', 'vor');
  const vorher = await codeZahl();
  await taste('Enter');
  await page.waitForTimeout(300);
  await finde((x) => x.typ === 'checkbox', 'Kästchen im Suchbereich „Codes“', 'vor');
  await taste('Space');
  await page.waitForTimeout(300);
  const nachher = await codeZahl();
  console.log(`  Codes des Themas: ${vorher} -> ${nachher}`);
  if (Number(nachher) <= Number(vorher)) haengt(`Code nicht zugeordnet (vorher ${vorher}, nachher ${nachher})`);
  await taste('Escape');
  await page.waitForTimeout(200);
  const z = await info();
  if (!z || z.id !== 'th-code-zuordnen') haengt(`Nach Esc nicht zurück auf dem Knopf „Code zuordnen“ (Fokus: ${z?.id || 'keiner'})`);
});

// ------------------------------------------------------------------ 5
await schritt('5 Thema verwerfen (Stand „verworfen“ wählen, übernehmen)', async () => {
  await finde((x) => x.typ === 'radio' && ['kandidat', 'aktiv', 'verworfen'].includes(x.wert), 'Optionsfeld Stand', 'zurueck');
  for (let i = 0; i < 4; i++) {
    const c = await page.evaluate(() => document.querySelector('input[name="th-stand"]:checked')?.value ?? null);
    if (c === 'verworfen') break;
    await taste('ArrowDown');
  }
  const gew = await page.evaluate(() => document.querySelector('input[name="th-stand"]:checked')?.value ?? null);
  if (gew !== 'verworfen') throw new Abbruch(`„verworfen“ mit Pfeiltasten nicht gewählt (gewählt: ${gew})`);
  await finde(id('th-stand-knopf'), 'Knopf „Stand übernehmen“', 'vor');
  await taste('Enter');
  await page.waitForTimeout(400);
  const fehler = await text('#th-fehler');
  if (fehler) {
    haengt(`Hinweis vor dem Übernehmen: „${fehler.slice(0, 120)}“ - Notiz nötig, Notiz getippt`);
    await finde(id('th-stand-notiz'), 'Feld „Notiz zum Stand“', 'zurueck');
    await page.keyboard.type(NOTIZ);
    s.zeichen += NOTIZ.length;
    await finde(id('th-stand-knopf'), 'Knopf „Stand übernehmen“', 'vor');
    await taste('Enter');
    await page.waitForTimeout(400);
  }
  const titel = await text('#th-detail-t');
  console.log(`  Überschrift: ${titel}`);
  if (!/verworfen/.test(titel)) haengt(`Überschrift ohne „verworfen“: ${titel}`);
});

// ------------------------------------------------------------------ 6
await schritt('6 Arbeitsweise auf IPA, Einzelfall-Modus mit einem Fall starten', async () => {
  await finde(id('ko-arbeitsweise'), 'Auswahl „Meine Arbeitsweise“', 'zurueck');
  await stelleAuswahl('ko-arbeitsweise', 'ipa');
  await page.waitForTimeout(500);
  await finde(id('ko-ez-start'), 'Knopf „Einzelfall-Modus starten“', 'vor');
  await taste('Enter');
  await page.waitForTimeout(600);
  const st = await text('#ko-ez-status');
  console.log(`  Status: ${st.slice(0, 100)}`);
  if (!/Sie sehen nur Fall/.test(st)) haengt(`Einzelfall-Modus nicht an: ${st.slice(0, 100)}`);
});

// ------------------------------------------------------------------ 7
await schritt('7 Satz mit S markieren, Randnotiz tippen, speichern', async () => {
  await finde(id('ko-text'), 'Dokumenttext „ko-text“', 'vor');
  await taste('s');
  await page.waitForSelector('#ko-rn-formular', { timeout: 3000 }).catch(() => haengt('Randnotizen-Formular erscheint nach S nicht'));
  await finde((x) => x.tag === 'textarea' && x.id.startsWith('ko-rn-'), 'Textfeld einer Schicht der Randnotizen', 'vor');
  await page.keyboard.type(RN_TEXT);
  s.zeichen += RN_TEXT.length;
  await finde(id('ko-rn-speichern'), 'Knopf „Randnotizen speichern“', 'vor');
  await taste('Enter');
  await page.waitForTimeout(500);
  const liste = await text('#ko-rn-liste');
  if (!liste.includes(RN_TEXT)) haengt('Randnotiz nach dem Speichern nicht in der Liste');
});

// ------------------------------------------------------------------ 8
await schritt('8 „Fall als fertig markieren“', async () => {
  await finde(id('ko-ez-fertig'), 'Knopf „Fall als fertig markieren“', 'zurueck');
  await taste('Enter');
  await page.waitForTimeout(600);
  const st = await text('#ko-ez-status');
  const alle = await text('#ko-ez-alle');
  console.log(`  Status: ${st.slice(0, 120)}`);
  if (!/fertig/.test(st + ' ' + alle)) haengt(`Kein Hinweis auf „fertig“: ${st.slice(0, 120)}`);
});

// ------------------------------------------------------------------ Auswertung
ergebnis.zusammenfassung = ergebnis.schritte.map((x) => ({
  schritt: x.name, geschafft: x.geschafft, tasten: x.tasten, zeichen: x.zeichen,
  fokusverlust: x.fokusverlust, haenger: x.haenger.length, nurMaus: x.nurMaus.length,
}));
ergebnis.gesamtTasten = ergebnis.schritte.reduce((a, x) => a + x.tasten, 0);
ergebnis.mausEingesetzt = false;
writeFileSync(path.join(OUT, 'erstnutzer.json'), JSON.stringify(ergebnis, null, 2), 'utf8');
console.log('\nZusammenfassung:');
for (const z of ergebnis.zusammenfassung) console.log(`  ${z.geschafft ? 'ja ' : 'nein'} | Tasten ${String(z.tasten).padStart(3)} | Fokusverlust ${z.fokusverlust} | Hänger ${z.haenger} | ${z.schritt}`);
console.log(`Fehler auf der Seite: ${ergebnis.fehler.length}`);
await ctx.close();
await browser.close();
