// Barrierefreiheit Ausbau Stufe A5: Erstnutzer-Probe NUR MIT TASTATUR (Berichtshilfe COREQ/SRQR im Bereich Nachvollziehbarkeit).
// Aufgaben (jede einzeln gemessen: geschafft ja/nein, Zahl der Tasten):
//   1. Strg+K, „COREQ“ tippen, Enter → Fokus auf der Überschrift #ko-bh-t
//   2. Von dort per Tab zur Liste (name ko-bh-liste), Pfeiltaste → SRQR, zurück per Pfeiltaste → COREQ
//   3. Per Tab zum Kästchen #ko-bh-filter, Leertaste an, dann wieder aus
//   4. Per Tab zur ersten Zeile (name ko-bh-coreq-coreq-01) „Erfüllt“ wählen (Leertaste), per Tab ins Feld
//      #ko-bh-f-coreq-01, „S. 5“ tippen, Tab → #ko-bh-zahl enthält „1 von 32“
//   5. Per Umschalt+Tab zum Knopf #ko-bh-word (steht seit der ersten Probe über der Tabelle), Enter → Download
// Regeln: kein click, kein locator.click, kein fill, kein check, kein focus() per Skript. Erlaubt: Tab, Umschalt+Tab,
// Enter, Leertaste, Pfeiltasten, Strg+K und Tippen von Text. Lesen des Zustands (Fokus, Text, checked) ist erlaubt.
// Vorlauf (Seite öffnen, Beispielprojekt laden) per Adresse, zählt nicht als Aufgabe.
// Je Aufgabe höchstens 400 Tastendrücke. Nach jedem Tastendruck wird geprüft, ob der Fokus auf body gefallen ist.
// Aufruf aus app/:  PORT=5195 node e2e/probe/bf-ausbau-a5-erstnutzer.mjs
// Ergebnis: docs/ausbau/bf-a5/erstnutzer.json
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const APP = fileURLToPath(new URL('../..', import.meta.url));
const BASE = 'http://127.0.0.1:' + (process.env.PORT || '5195') + '/';
const OUT = path.resolve(APP, '../docs/ausbau/bf-a5');
const MAX = 400;
const LANG_AB = 25; // ab so vielen Tasten gilt ein Weg als lang

mkdirSync(OUT, { recursive: true });
const ergebnis = {
  zeitpunkt: new Date().toISOString(),
  url: BASE + '#kodieren/beispiel-mm',
  viewport: '1366x850',
  locale: 'de-DE',
  browser: 'chromium headless',
  eingabe: 'nur Tastatur (Tab, Umschalt+Tab, Enter, Leertaste, Pfeiltasten, Strg+K, Tippen); kein Klick, kein focus() per Skript',
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
  s = { name, geschafft: false, tasten: 0, zeichen: 0, pfad: [], fokusverlust: 0, lang: [], haenger: [], auffaellig: [], notizen: [] };
  ergebnis.schritte.push(s);
  console.log(`\n== ${name}`);
}
const haengt = (t) => { s.haenger.push(t); console.log('  HÄNGER: ' + t); };
const auffaellig = (t) => { s.auffaellig.push(t); console.log('  AUFFÄLLIG: ' + t); };
const notiz = (t) => { s.notizen.push(t); console.log('  ' + t); };

// Aktives Element nur lesen (Name, Typ, Gruppe, Häkchen, id, Wert)
const info = () => page.evaluate(() => {
  const e = document.activeElement;
  if (!e || e === document.body || e === document.documentElement) return null;
  let name = e.getAttribute('aria-label') || '';
  if (!name && e.labels && e.labels.length) name = [...e.labels].map((l) => l.textContent).join(' ');
  if (!name) name = e.textContent || e.value || '';
  name = name.replace(/\s+/g, ' ').trim().slice(0, 120);
  return { tag: e.tagName.toLowerCase(), id: e.id || '', typ: e.type || '', grp: e.name || '', wert: e.value || '', name, ch: !!e.checked };
});

// Eine Taste drücken und protokollieren (Strg+K ist eine Taste mit Kombination)
async function taste(k) {
  if (s.tasten >= MAX) throw new Abbruch(`Budget von ${MAX} Tastendrücken erschöpft`);
  s.tasten++;
  await page.keyboard.press(k);
  await page.waitForTimeout(80);
  const x = await info();
  if (!x) s.fokusverlust++;
  const kurz = x ? `${x.typ ? x.tag + '[' + x.typ + ']' : x.tag} „${x.name}“${x.id ? ' #' + x.id : ''}` : 'body (Fokus verloren)';
  s.pfad.push(`${k} -> ${kurz}`);
  return x;
}

// Tippen (zählt Zeichen, nicht Tasten)
async function tippe(text) {
  await page.keyboard.type(text);
  s.zeichen += text.length;
  await page.waitForTimeout(80);
}

// Mit Tab vorwärts suchen, bis das Ziel den Fokus hat (Budget bis MAX)
async function vor(pred, ziel, k = 'Tab') {
  const vorher = s.tasten;
  for (;;) {
    if (s.tasten >= MAX) throw new Abbruch(`Ziel nicht erreicht: ${ziel}`);
    const x = await taste(k);
    if (x && pred(x)) break;
  }
  const n = s.tasten - vorher;
  if (n > LANG_AB) s.lang.push(`${ziel}: ${n} Tasten bis dorthin`);
  return info();
}

// Mit Pfeiltaste in einer Gruppe auf das Ziel stellen (höchstens 6 Schritte nach unten; Gruppen wechseln am Ende zurück)
async function pfeilZu(pred, ziel) {
  for (let i = 0; i < 6; i++) {
    const x = await info();
    if (x && pred(x)) return x;
    await taste('ArrowDown');
  }
  throw new Abbruch(`Pfeiltaste erreicht ${ziel} nicht`);
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

// Liegt der Fokus nach einer Aktion noch auf dem Ziel? Wenn nicht: notieren und per Tab neu suchen
async function fokusNoch(id, ziel) {
  const x = await info();
  if (x && x.id === id) return x;
  auffaellig(`Fokus nach der Aktion nicht mehr auf ${ziel} (Fokus: ${x ? x.name + ' #' + x.id : 'keiner'}); neu per Tab gesucht`);
  return vor((y) => y.id === id, ziel);
}

// ------------------------------------------------------------------ Vorlauf (Adresse und Warten, zählt nicht)
try {
  await page.goto(BASE + '#kodieren', { timeout: 180000 });
  await page.waitForSelector('#ko-t', { timeout: 120000 });
  await page.evaluate(() => { location.hash = 'kodieren/beispiel-mm'; });
  await page.waitForSelector('#ko-mm-t', { timeout: 120000 });
  await page.waitForTimeout(800);
  console.log('Vorlauf fertig: #kodieren/beispiel-mm');
} catch (e) {
  ergebnis.fehler.push('Vorlauf: ' + String(e.message).slice(0, 200));
  console.log('Vorlauf fehlgeschlagen: ' + e.message);
}

// ------------------------------------------------------------------ 1
await schritt('1 Strg+K, „COREQ“ tippen, Enter → Fokus auf der Überschrift #ko-bh-t', async () => {
  await taste('Control+k');
  await page.waitForTimeout(250);
  const offen = await page.evaluate(() => !!document.querySelector('input[type=search], [role=dialog] input, [role=combobox]'));
  if (!offen) auffaellig('Befehlspalette nach Strg+K nicht eindeutig erkennbar');
  await tippe('COREQ');
  await taste('Enter');
  const da = await page.waitForFunction(() => document.activeElement?.id === 'ko-bh-t', null, { timeout: 5000 })
    .then(() => true).catch(() => false);
  const f = await info();
  notiz(`Fokus nach Enter: ${f ? f.name + ' #' + f.id : 'keiner'}`);
  if (!da) haengt(`Fokus steht nicht auf #ko-bh-t (Fokus: ${f ? f.name + ' #' + f.id : 'keiner'})`);
});

// ------------------------------------------------------------------ 2
await schritt('2 Per Tab zur Liste, Pfeiltaste auf SRQR, zurück auf COREQ', async () => {
  const r = await vor((x) => x.typ === 'radio' && x.grp === 'ko-bh-liste', 'Liste (Optionsfeld) ko-bh-liste');
  notiz(`Erster Listenpunkt im Fokus: ${r ? r.name + ' (gewählt: ' + r.ch + ')' : 'keiner'}`);
  const srqr = await pfeilZu((x) => x.typ === 'radio' && x.grp === 'ko-bh-liste' && x.name.startsWith('SRQR'), 'SRQR');
  notiz(`Nach Pfeiltaste: ${srqr.name} (gewählt: ${srqr.ch})`);
  if (!srqr.ch) haengt('SRQR ist nach der Pfeiltaste nicht gewählt');
  // zurück: Pfeil hoch bis COREQ
  let coreq = null;
  for (let i = 0; i < 6 && !coreq; i++) {
    await taste('ArrowUp');
    const x = await info();
    if (x && x.typ === 'radio' && x.grp === 'ko-bh-liste' && x.name.startsWith('COREQ')) coreq = x;
  }
  if (!coreq) haengt('Pfeiltaste nach oben erreicht COREQ nicht');
  else {
    notiz(`Zurück auf COREQ: ${coreq.name} (gewählt: ${coreq.ch})`);
    if (!coreq.ch) haengt('COREQ ist nach dem Zurückgehen nicht gewählt');
  }
});

// ------------------------------------------------------------------ 3
await schritt('3 Kästchen #ko-bh-filter per Tab, Leertaste an, dann aus', async () => {
  await vor((x) => x.id === 'ko-bh-filter', 'Kästchen #ko-bh-filter');
  await taste('Space');
  const an = await fokusNoch('ko-bh-filter', 'Kästchen #ko-bh-filter');
  notiz(`Nach Leertaste: ${an.name} (angehakt: ${an.ch})`);
  if (!an.ch) haengt('Kästchen ist nach der Leertaste nicht angehakt');
  await taste('Space');
  const aus = await fokusNoch('ko-bh-filter', 'Kästchen #ko-bh-filter (zum Abschalten)');
  notiz(`Nach zweiter Leertaste: ${aus.name} (angehakt: ${aus.ch})`);
  if (aus.ch) haengt('Kästchen ist nach der zweiten Leertaste noch angehakt');
});

// ------------------------------------------------------------------ 4
await schritt('4 Zeile 1: „Erfüllt“ wählen, Feld #ko-bh-f-coreq-01 „S. 5“, Zähler „1 von 32“', async () => {
  const p1 = await vor((x) => x.typ === 'radio' && x.grp === 'ko-bh-coreq-coreq-01', 'Optionsfeld Punkt 1 (ko-bh-coreq-coreq-01)');
  notiz(`Erster Optionsknopf der Zeile im Fokus: ${p1.name} (gewählt: ${p1.ch})`);
  if (!p1.name.startsWith('Erfüllt')) {
    await pfeilZu((x) => x.typ === 'radio' && x.grp === 'ko-bh-coreq-coreq-01' && x.name.startsWith('Erfüllt'), 'Erfüllt');
  }
  await taste('Space');
  const erf = await info();
  notiz(`„Erfüllt“ nach Leertaste: ${erf ? erf.name + ' (gewählt: ' + erf.ch + ')' : 'keiner'}`);
  if (!erf || !erf.ch || !erf.name.startsWith('Erfüllt')) haengt('„Erfüllt“ ist nach der Leertaste nicht gewählt');
  await vor((x) => x.id === 'ko-bh-f-coreq-01', 'Feld #ko-bh-f-coreq-01 (Belegstelle)');
  await tippe('S. 5');
  await taste('Tab');
  const zahl = await page.evaluate(() => document.getElementById('ko-bh-zahl')?.textContent?.replace(/\s+/g, ' ').trim() ?? '');
  notiz(`Text in #ko-bh-zahl: „${zahl}“`);
  if (!zahl.includes('1 von 32')) haengt(`#ko-bh-zahl enthält nicht „1 von 32“ (Text: „${zahl}“)`);
});

// ------------------------------------------------------------------ 5
await schritt('5 Knopf #ko-bh-word über der Tabelle per Umschalt+Tab (zurück von Zeile 1), Enter → Download', async () => {
  await vor((x) => x.id === 'ko-bh-word', 'Knopf #ko-bh-word', 'Shift+Tab');
  const dlP = page.waitForEvent('download', { timeout: 20000 }).then((d) => d, () => null);
  await taste('Enter');
  const d = await dlP;
  if (!d) haengt('Kein Download nach Enter auf #ko-bh-word');
  else notiz(`Download: ${d.suggestedFilename()}`);
});

// ------------------------------------------------------------------ Auswertung
ergebnis.zusammenfassung = ergebnis.schritte.map((x) => ({
  schritt: x.name, geschafft: x.geschafft, tasten: x.tasten, zeichen: x.zeichen,
  fokusverlust: x.fokusverlust, lang: x.lang.length, haenger: x.haenger.length, auffaellig: x.auffaellig.length,
}));
ergebnis.gesamtTasten = ergebnis.schritte.reduce((a, x) => a + x.tasten, 0);
ergebnis.fokusverlustGesamt = ergebnis.schritte.reduce((a, x) => a + x.fokusverlust, 0);
ergebnis.mausEingesetzt = false;
writeFileSync(path.join(OUT, 'erstnutzer.json'), JSON.stringify(ergebnis, null, 2) + '\n', 'utf8');
console.log('\nZusammenfassung:');
for (const z of ergebnis.zusammenfassung) console.log(`  ${z.geschafft ? 'ja ' : 'nein'} | Tasten ${String(z.tasten).padStart(3)} | Fokusverlust ${z.fokusverlust} | lang ${z.lang} | Hänger ${z.haenger} | ${z.schritt}`);
console.log(`Summe Tasten: ${ergebnis.gesamtTasten}, Fokusverluste: ${ergebnis.fokusverlustGesamt}`);
console.log(`Fehler auf der Seite: ${ergebnis.fehler.length}`);
await ctx.close();
await browser.close();
