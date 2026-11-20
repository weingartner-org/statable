// Barrierefreiheit Ausbau Stufe A2: Erstnutzer-Probe NUR MIT TASTATUR (Prüfplan A2).
// Aufgaben (wie eine Person, die die Seite zum ersten Mal sieht):
//   1. #kodieren/beispiel-mm öffnen (erfundenes Beispiel „Um Hilfe bitten“ als neues Projekt)
//   2. Fälle mit dem Datensatz verknüpfen (Fallvariable survey_id, Spalte survey_id, „Verknüpfen“, Text „5 von 5“)
//   3. Teil „Zahlen und Zitate zusammen zeigen (Joint Display)“ per Pfeiltaste wählen
//   4. Joint Display „Themen nach Erstperson“ anlegen (Art vorgewählt, Name tippen, „Joint Display anlegen“)
//   5. Gruppierung first_generation wählen, alle Themen („Thema: …“) ankreuzen (Tabelle mit no und yes)
//   6. In jeder Zelle eine Belegstelle wählen (Pfeiltaste runter), Quellen „Interview 0…“
//   7. „Als Word speichern“ (Download als .docx)
// Regeln: kein click, kein locator.click, kein fill, kein focus() per Skript. Erlaubt: Tab, Umschalt+Tab,
// Enter, Leertaste, Pfeiltasten, Home, Esc und Tippen von Text. Seitenaufruf per goto ist erlaubt.
// Je Schritt höchstens 150 Tastendrücke; danach gilt er als nicht geschafft.
// Aufruf aus app/:  node e2e/probe/bf-ausbau-a2-erstnutzer.mjs
// Ergebnis: docs/ausbau/bf-a2/erstnutzer.json
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const APP = fileURLToPath(new URL('../..', import.meta.url));
const BASE = 'http://127.0.0.1:5191/';
const OUT = path.resolve(APP, '../docs/ausbau/bf-a2');
const MAX = 150;
const LANG_AB = 25; // ab so vielen Tasten gilt ein Weg als lang
const JD_NAME = 'Themen nach Erstperson';

mkdirSync(OUT, { recursive: true });
const ergebnis = {
  zeitpunkt: new Date().toISOString(),
  url: BASE + '#kodieren/beispiel-mm',
  viewport: '1366x850',
  locale: 'de-DE',
  browser: 'chromium headless',
  eingabe: 'nur Tastatur (Tab, Umschalt+Tab, Enter, Leertaste, Pfeiltasten, Home, Esc, Tippen); kein Klick, kein focus() per Skript',
  schritte: [],
  fehler: [],
};

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ locale: 'de-DE', viewport: { width: 1366, height: 850 }, acceptDownloads: true });
await ctx.addInitScript(() => {
  try { localStorage.setItem('statable-einst', JSON.stringify({ rundgang: false })); } catch { /* ohne Speicher weiter */ }
});
const page = await ctx.newPage();
page.on('pageerror', (e) => ergebnis.fehler.push(String(e.message).slice(0, 200)));

class Abbruch extends Error {}
let s = null;
function neuerSchritt(name) {
  s = { name, geschafft: false, tasten: 0, zeichen: 0, pfad: [], fokusverlust: 0, nurMaus: [], lang: [], haenger: [] };
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
  return { tag: e.tagName.toLowerCase(), id: e.id || '', typ: e.type || '', wert: e.value || '', name, ch: !!e.checked };
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
  const vorher = s.tasten;
  const zurueck = richtung === 'zurueck';
  const r1 = await suche(pred, { rueck: zurueck, max: 75 });
  let r = r1;
  if (!r) r = await suche(pred, { rueck: !zurueck, max: MAX - s.tasten });
  if (!r) throw new Abbruch(`Ziel nicht erreicht: ${ziel}`);
  const n = s.tasten - vorher;
  if (n > LANG_AB) s.lang.push(`${ziel}: ${n} Tasten bis dorthin`);
  return r;
}
const id = (x) => (y) => y.id === x;

// Auswahlfeld mit Pfeiltaste runter auf einen Eintrag stellen (Fokus steht schon darauf).
// passt(c) bekommt { t: Text, v: Wert } der gewählten Option. Vorher wird nur geprüft, nichts gedrückt, wenn es schon passt.
async function stelleAuswahl(selId, passt, ziel) {
  const n = await page.evaluate((i) => document.getElementById(i)?.options.length ?? 0, selId);
  const lies = () => page.evaluate((i) => {
    const o = document.getElementById(i)?.selectedOptions?.[0];
    return o ? { t: o.textContent.trim(), v: o.value } : null;
  }, selId);
  for (let k = 0; k <= n; k++) {
    const c = await lies();
    if (c && passt(c)) return c;
    if (k === n) break;
    await taste('ArrowDown');
  }
  throw new Abbruch(`${ziel}: Eintrag nicht gefunden (Auswahl hat ${n} Einträge)`);
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

const text = (sel) => page.evaluate((q) => document.querySelector(q)?.textContent?.replace(/\s+/g, ' ').trim() ?? '', sel);
const themenStand = () => page.evaluate(() => {
  const k = [...document.querySelectorAll('input[type=checkbox]')].filter((i) => (i.labels?.[0]?.textContent || '').trim().startsWith('Thema:'));
  return { gesamt: k.length, an: k.filter((i) => i.checked).length };
});
const tabKopf = () => page.evaluate(() => {
  const h = document.getElementById('ko-mm-jd-tab-t');
  const th = h?.nextElementSibling?.querySelector('thead');
  return th ? [...th.querySelectorAll('th')].map((x) => x.textContent.replace(/\s+/g, ' ').trim()) : [];
});
const tabText = () => page.evaluate(() => document.getElementById('ko-mm-jd-tab-t')?.nextElementSibling?.textContent?.replace(/\s+/g, ' ') ?? '');

// ------------------------------------------------------------------ 1
neuerSchritt('1 Beispiel „Um Hilfe bitten“ öffnen (Adresse #kodieren/beispiel-mm)');
await page.goto(BASE + '#kodieren/beispiel-mm');
await page.waitForFunction(
  () => [...document.querySelectorAll('h3')].some((h) => h.textContent.includes('Zahlen und Texte verbinden')),
  null,
  { timeout: 60000 },
).then(() => { s.geschafft = true; console.log('  Überschrift da'); })
  .catch(() => haengt('Überschrift „Zahlen und Texte verbinden (Mixed Methods)“ kommt nicht (60 s)'));
await page.waitForTimeout(1200);
console.log(`  -> ${s.geschafft ? 'GESCHAFFT' : 'NICHT GESCHAFFT'}`);

// ------------------------------------------------------------------ 2
await schritt('2 Fälle mit dem Datensatz verknüpfen (survey_id, „Verknüpfen“, „5 von 5“)', async () => {
  await finde(id('ko-mm-vk-var'), 'Auswahl „Fallvariable der Interviews“', 'vor');
  const v = await stelleAuswahl('ko-mm-vk-var', (c) => c.t === 'survey_id', 'Fallvariable');
  console.log(`  Fallvariable: ${v.t}`);
  await finde(id('ko-mm-vk-sp'), 'Auswahl „Spalte im Datensatz“', 'vor');
  const sp = await stelleAuswahl('ko-mm-vk-sp', (c) => c.t === 'survey_id' || c.t.endsWith('(survey_id)'), 'Spalte');
  console.log(`  Spalte: ${sp.t}`);
  await finde(id('ko-mm-vk-knopf'), 'Knopf „Verknüpfen“', 'vor');
  await taste('Enter');
  await page.waitForTimeout(500);
  const erg = await text('#ko-mm-vk-erg');
  console.log(`  Ergebnis: ${erg.slice(0, 120)}`);
  if (!erg.includes('5 von 5')) haengt(`Kein „5 von 5“ im Ergebnis: ${erg.slice(0, 120)}`);
});

// ------------------------------------------------------------------ 3
await schritt('3 Teil „Zahlen und Zitate zusammen zeigen (Joint Display)“ per Pfeiltaste', async () => {
  await finde((x) => x.typ === 'radio' && x.wert === 'verknuepfen', 'Optionsfeld „Teil“ (Fälle verknüpfen)', 'zurueck');
  await taste('ArrowDown');
  await page.waitForTimeout(400);
  const c = await page.evaluate(() => document.querySelector('input[name="ko-mm-teil"]:checked')?.value ?? null);
  console.log(`  Gewählter Teil: ${c}`);
  if (c !== 'displays') haengt(`Teil „displays“ nicht gewählt (gewählt: ${c})`);
  await page.waitForSelector('#ko-mm-jd-neu-name', { timeout: 5000 }).catch(() => haengt('Feld „Name“ des neuen Joint Displays erscheint nicht'));
});

// ------------------------------------------------------------------ 4
await schritt('4 Joint Display „Themen nach Erstperson“ anlegen', async () => {
  await finde(id('ko-mm-jd-neu-name'), 'Feld „Name“ (neues Joint Display)', 'vor');
  const art = await page.evaluate(() => document.querySelector('input[name="ko-mm-jd-art"]:checked')?.value ?? null);
  console.log(`  Vorgewählte Art: ${art}`);
  if (art !== 'qual-nach-gruppen') haengt(`Art nicht vorgewählt (${art})`);
  await page.keyboard.type(JD_NAME);
  s.zeichen += JD_NAME.length;
  await finde(id('ko-mm-jd-neu-btn'), 'Knopf „Joint Display anlegen“', 'vor');
  await taste('Enter');
  await page.waitForTimeout(600);
  const z = await info();
  if (!z || z.id !== 'ko-mm-jd-name-t') haengt(`Nach dem Anlegen nicht bei der Überschrift des neuen Displays (Fokus: ${z?.id || 'keiner'})`);
});

// ------------------------------------------------------------------ 5
await schritt('5 Gruppierung first_generation, alle Themen ankreuzen (Tabelle no / yes)', async () => {
  await finde(id('ko-mm-jd-gruppe'), 'Auswahl „Spalten bilden nach (Gruppierung)“', 'vor');
  const g = await stelleAuswahl('ko-mm-jd-gruppe', (c) => c.v.startsWith('variable:') && c.t === 'first_generation', 'Gruppierung');
  console.log(`  Gruppierung: ${g.t}`);
  await page.waitForTimeout(300);
  const st = await themenStand();
  console.log(`  Themen-Kästchen: ${st.gesamt}`);
  if (st.gesamt === 0) haengt('Keine Kästchen „Thema: …“ gefunden');
  for (let i = 0; i < 120; i++) {
    const cur = await themenStand();
    if (cur.gesamt > 0 && cur.an >= cur.gesamt) break;
    const x = await taste('Tab');
    if (x && x.typ === 'checkbox' && x.name.startsWith('Thema:') && !x.ch) await taste('Space');
    await page.waitForTimeout(40);
  }
  await page.waitForTimeout(400);
  const fin = await themenStand();
  console.log(`  Themen angekreuzt: ${fin.an} von ${fin.gesamt}`);
  if (fin.gesamt === 0 || fin.an < fin.gesamt) haengt(`Nicht alle Themen angekreuzt (${fin.an} von ${fin.gesamt})`);
  const kopf = await tabKopf();
  console.log(`  Spaltenköpfe: ${kopf.join(' | ')}`);
  if (!kopf.some((x) => /^no\b/.test(x)) || !kopf.some((x) => /^yes\b/.test(x))) haengt(`Spaltenköpfe „no“ und „yes“ fehlen (gefunden: ${kopf.join(', ')})`);
});

// ------------------------------------------------------------------ 6
await schritt('6 In jeder Zelle eine Belegstelle wählen (Pfeiltaste runter)', async () => {
  const n = await page.evaluate(() => document.querySelectorAll('select[id^="ko-mm-jd-b-"]').length);
  console.log(`  Auswahlfelder „Belegstelle wählen“: ${n}`);
  if (n === 0) haengt('Keine Auswahlfelder „Belegstelle wählen“ gefunden');
  const fertig = new Set();
  for (let i = 0; i < n; i++) {
    const x = await finde((y) => y.tag === 'select' && y.id.startsWith('ko-mm-jd-b-') && !fertig.has(y.id), `Belegstelle ${i + 1} von ${n}`, 'vor');
    fertig.add(x.id);
    const opts = await page.evaluate((i2) => document.getElementById(i2)?.options.length ?? 0, x.id);
    if (opts <= 1) { haengt(`Keine Belegstelle zur Wahl bei ${x.name}`); continue; }
    await taste('ArrowDown');
    await page.waitForTimeout(150);
  }
  const txt = await tabText();
  const quellen = txt.match(/Interview 0\d*/g) ?? [];
  console.log(`  Quellen in der Tabelle: ${quellen.length}`);
  if (!quellen.length) haengt('In der Tabelle steht keine Quelle „Interview 0…“');
});

// ------------------------------------------------------------------ 7
await schritt('7 „Als Word speichern“ (Download als .docx)', async () => {
  await finde(id('ko-mm-jd-word'), 'Knopf „Als Word speichern“', 'vor');
  const dlP = page.waitForEvent('download', { timeout: 60000 });
  dlP.catch(() => {});
  await taste('Enter');
  try {
    const dl = await dlP;
    const name = dl.suggestedFilename();
    const bytes = statSync(await dl.path()).size;
    ergebnis.download = { name, bytes };
    console.log(`  Download: ${name} (${bytes} Byte)`);
    if (!/\.docx$/.test(name)) haengt(`Datei endet nicht auf .docx: ${name}`);
  } catch (e) {
    haengt('Kein Download: ' + String(e.message).slice(0, 120));
  }
});

// ------------------------------------------------------------------ Auswertung
ergebnis.zusammenfassung = ergebnis.schritte.map((x) => ({
  schritt: x.name, geschafft: x.geschafft, tasten: x.tasten, zeichen: x.zeichen,
  fokusverlust: x.fokusverlust, lang: x.lang.length, haenger: x.haenger.length, nurMaus: x.nurMaus.length,
}));
ergebnis.gesamtTasten = ergebnis.schritte.reduce((a, x) => a + x.tasten, 0);
ergebnis.mausEingesetzt = false;
writeFileSync(path.join(OUT, 'erstnutzer.json'), JSON.stringify(ergebnis, null, 2), 'utf8');
console.log('\nZusammenfassung:');
for (const z of ergebnis.zusammenfassung) console.log(`  ${z.geschafft ? 'ja ' : 'nein'} | Tasten ${String(z.tasten).padStart(3)} | Fokusverlust ${z.fokusverlust} | lang ${z.lang} | Hänger ${z.haenger} | ${z.schritt}`);
console.log(`Fehler auf der Seite: ${ergebnis.fehler.length}`);
await ctx.close();
await browser.close();
