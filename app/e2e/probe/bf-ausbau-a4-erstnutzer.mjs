// Barrierefreiheit Ausbau Stufe A4: Erstnutzer-Probe NUR MIT TASTATUR (Prüfplan A4, Spaltensätze als Daten).
// Aufgaben (wie eine Person, die die Seite zum ersten Mal sieht; Seite #interviews nach dem Vorlauf):
//   1. Knopf „Feinstrukturanalyse beginnen: …“ mit Tab, Enter → Überschrift „Ausschnitt für die Feinstrukturanalyse wählen“
//   2. Gruppe „Spalten der Deutung (Spaltensatz)“: mit Tab zum Radioknopf, mit Pfeiltaste „IPA: …“ wählen
//   3. Kästchen „Folgetext verdecken (nicht vorauslesen)“ erreichen und angehakt prüfen (nicht ändern)
//   4. Bereich „Eigenen Spaltensatz anlegen oder bearbeiten“ öffnen, „Meine Spalten“ tippen, Spalte 1 „Kontext“,
//      „Spalte hinzufügen“ (Fokus im neuen Namensfeld), „Lesarten“, „Spaltensatz speichern“ → „Meine Spalten (eigener Satz)“ gewählt
//   5. „Sequenzanalyse anlegen“ drücken → Überschrift beginnt mit „Einteilen: Sinneinheiten setzen“
//   6. Im Einteilen Bereich „Spalten der Deutung und Folgetext verdecken (Spaltensatz)“ öffnen; „Meine Spalten (eigener Satz)“ gewählt
// Regeln: kein click, kein locator.click, kein fill, kein check, kein focus() per Skript. Erlaubt: Tab, Umschalt+Tab,
// Enter, Leertaste, Pfeiltasten, Home, End und Tippen von Text. Lesen des Zustands (Fokus, Text, checked) ist erlaubt.
// Vorlauf (Projekt öffnen, Beispielinterview laden) mit Klicks, zählt nicht als Aufgabe.
// Je Schritt höchstens 150 Tastendrücke. Nach jedem Tastendruck wird geprüft, ob der Fokus auf body gefallen ist.
// Aufruf aus app/:  node e2e/probe/bf-ausbau-a4-erstnutzer.mjs
// Ergebnis: docs/ausbau/bf-a4/erstnutzer.json
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const APP = fileURLToPath(new URL('../..', import.meta.url));
const BASE = 'http://127.0.0.1:5194/';
const OUT = path.resolve(APP, '../docs/ausbau/bf-a4');
const MAX = 150;
const LANG_AB = 25; // ab so vielen Tasten gilt ein Weg als lang

mkdirSync(OUT, { recursive: true });
const ergebnis = {
  zeitpunkt: new Date().toISOString(),
  url: BASE + '#interviews',
  viewport: '1366x850',
  locale: 'de-DE',
  browser: 'chromium headless',
  eingabe: 'nur Tastatur (Tab, Umschalt+Tab, Enter, Leertaste, Pfeiltasten, Home, End, Tippen); kein Klick, kein focus() per Skript',
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
  s = { name, geschafft: false, tasten: 0, zeichen: 0, pfad: [], fokusverlust: 0, lang: [], haenger: [], auffaellig: [] };
  ergebnis.schritte.push(s);
  console.log(`\n== ${name}`);
}
const haengt = (t) => { s.haenger.push(t); console.log('  HÄNGER: ' + t); };
const auffaellig = (t) => { s.auffaellig.push(t); console.log('  AUFFÄLLIG: ' + t); };

// Aktives Element nur lesen (Name, Typ, Gruppe, Häkchen)
const info = () => page.evaluate(() => {
  const e = document.activeElement;
  if (!e || e === document.body || e === document.documentElement) return null;
  let name = e.getAttribute('aria-label') || '';
  if (!name && e.labels && e.labels.length) name = [...e.labels].map((l) => l.textContent).join(' ');
  if (!name) name = e.textContent || e.value || '';
  name = name.replace(/\s+/g, ' ').trim().slice(0, 120);
  return { tag: e.tagName.toLowerCase(), id: e.id || '', typ: e.type || '', grp: e.name || '', wert: e.value || '', name, ch: !!e.checked };
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

// Mit Tab vorwärts suchen, bis das Ziel den Fokus hat (Budget bis MAX)
async function vor(pred, ziel) {
  const vorher = s.tasten;
  for (;;) {
    if (s.tasten >= MAX) throw new Abbruch(`Ziel nicht erreicht: ${ziel}`);
    const x = await taste('Tab');
    if (x && pred(x)) break;
  }
  const n = s.tasten - vorher;
  if (n > LANG_AB) s.lang.push(`${ziel}: ${n} Tasten bis dorthin`);
  return info();
}

// Mit Pfeiltaste runter in einer Gruppe auf das Ziel stellen (höchstens 6 Schritte)
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

// Gewählter Spaltensatz in der Gruppe (Radioknopf), nur lesen
const gewaehlterSatz = () => page.evaluate(() => {
  const r = document.querySelector('input[type=radio][name$="-satz"]:checked');
  return r ? (r.labels?.[0]?.textContent || '').replace(/\s+/g, ' ').trim() : null;
});

// ------------------------------------------------------------------ Vorlauf (Klicks, zählt nicht)
try {
  await page.goto(BASE + '#beispiele', { timeout: 180000 });
  await page.getByRole('button', { name: 'Öffnen', exact: true }).first().click({ timeout: 120000 });
  await page.waitForFunction(() => !location.hash.startsWith('#beispiele'), undefined, { timeout: 240000 });
  await page.waitForTimeout(3000);
  await page.evaluate(() => { location.hash = 'interviews'; });
  await page.getByRole('button', { name: 'Beispielinterview laden (erfunden)' }).click({ timeout: 120000 });
  await page.getByRole('button', { name: /^Feinstrukturanalyse beginnen: / }).first().waitFor({ timeout: 120000 });
  await page.waitForTimeout(800);
  console.log('Vorlauf fertig: #interviews mit Beispielinterview');
} catch (e) {
  ergebnis.fehler.push('Vorlauf: ' + String(e.message).slice(0, 200));
  console.log('Vorlauf fehlgeschlagen: ' + e.message);
}

// ------------------------------------------------------------------ 1
await schritt('1 Knopf „Feinstrukturanalyse beginnen“ mit Tab und Enter öffnen', async () => {
  await vor((x) => x.name.startsWith('Feinstrukturanalyse beginnen'), 'Knopf „Feinstrukturanalyse beginnen“');
  await taste('Enter');
  const da = await page.waitForFunction(
    () => [...document.querySelectorAll('h2')].some((h) => h.textContent.includes('Ausschnitt für die Feinstrukturanalyse wählen')),
    null, { timeout: 15000 },
  ).then(() => true).catch(() => false);
  if (!da) haengt('Überschrift „Ausschnitt für die Feinstrukturanalyse wählen“ kommt nicht');
  const f = await info();
  console.log(`  Fokus nach dem Öffnen: ${f ? f.name : 'keiner'}`);
  if (!f || !f.name.startsWith('Ausschnitt für die Feinstrukturanalyse wählen')) {
    auffaellig(`Fokus steht nach dem Öffnen nicht auf der Überschrift (Fokus: ${f ? f.name : 'keiner'})`);
  }
});

// ------------------------------------------------------------------ 2
await schritt('2 Gruppe „Spalten der Deutung (Spaltensatz)“: Radioknopf „IPA“ per Pfeiltaste', async () => {
  const r = await vor((x) => x.typ === 'radio' && x.grp.endsWith('-satz'), 'Radioknopf der Gruppe „Spalten der Deutung (Spaltensatz)“');
  console.log(`  Erster Radioknopf im Fokus: ${r.name} (gewählt: ${r.ch})`);
  const legende = await page.evaluate(() => document.activeElement?.closest('fieldset')?.querySelector('legend')?.textContent?.replace(/\s+/g, ' ').trim() ?? '');
  console.log(`  Gruppenname: ${legende}`);
  if (!legende.startsWith('Spalten der Deutung (Spaltensatz)')) haengt(`Gruppe heißt „${legende}“`);
  const ipa = await pfeilZu((x) => x.typ === 'radio' && x.grp.endsWith('-satz') && x.name.startsWith('IPA'), 'IPA');
  console.log(`  Gewählt nach Pfeiltaste: ${ipa.name} (checked: ${ipa.ch})`);
  if (!ipa.ch) haengt('„IPA“ ist nach der Pfeiltaste nicht gewählt');
  if (!ipa.name.includes('Randnotizen')) auffaellig(`Name des Radioknopfs unklar: ${ipa.name}`);
});

// ------------------------------------------------------------------ 3
await schritt('3 Kästchen „Folgetext verdecken (nicht vorauslesen)“ erreichen, angehakt prüfen', async () => {
  const k = await vor((x) => x.typ === 'checkbox' && x.name.startsWith('Folgetext verdecken'), 'Kästchen „Folgetext verdecken“');
  console.log(`  Kästchen: ${k.name} (angehakt: ${k.ch})`);
  if (!k.ch) haengt('Kästchen „Folgetext verdecken“ ist nicht angehakt');
});

// ------------------------------------------------------------------ 4
await schritt('4 Eigenen Spaltensatz „Meine Spalten“ mit Spalte „Kontext“ und „Lesarten“ anlegen und speichern', async () => {
  await vor((x) => x.tag === 'summary' && x.name.startsWith('Eigenen Spaltensatz anlegen'), 'Bereich „Eigenen Spaltensatz anlegen oder bearbeiten“');
  await taste('Enter');
  await page.waitForTimeout(200);
  const offen = await page.evaluate(() => document.querySelector('details.editor')?.open ?? null);
  if (!offen) haengt('Bereich „Eigenen Spaltensatz anlegen oder bearbeiten“ ist nach Enter nicht offen');

  await vor((x) => x.tag === 'input' && x.name === 'Name des Spaltensatzes', 'Feld „Name des Spaltensatzes“');
  await page.keyboard.type('Meine Spalten');
  s.zeichen += 'Meine Spalten'.length;

  await vor((x) => x.tag === 'input' && x.name === 'Name der Spalte', 'Feld „Name der Spalte“ (Spalte 1)');
  await page.keyboard.type('Kontext');
  s.zeichen += 'Kontext'.length;

  await vor((x) => x.tag === 'button' && x.name === 'Spalte hinzufügen', 'Knopf „Spalte hinzufügen“');
  await taste('Enter');
  await page.waitForTimeout(250);
  const f = await info();
  const istLetztes = await page.evaluate(() => {
    const felder = [...document.querySelectorAll('input[type=text]')].filter((i) => (i.labels?.[0]?.textContent || '').trim() === 'Name der Spalte');
    return felder.length >= 2 && document.activeElement === felder[felder.length - 1];
  });
  console.log(`  Fokus nach „Spalte hinzufügen“: ${f ? f.name + ' (Wert „' + f.wert + '“)' : 'keiner'}; im neuen Feld: ${istLetztes}`);
  if (!istLetztes) haengt(`Fokus nach „Spalte hinzufügen“ nicht im neuen Namensfeld (Fokus: ${f ? f.name : 'keiner'})`);

  await page.keyboard.type('Lesarten');
  s.zeichen += 'Lesarten'.length;

  await vor((x) => x.tag === 'button' && x.name === 'Spaltensatz speichern', 'Knopf „Spaltensatz speichern“');
  await taste('Enter');
  await page.waitForTimeout(300);
  const gew = await gewaehlterSatz();
  console.log(`  Gewählter Spaltensatz nach dem Speichern: ${gew}`);
  if (!gew || !gew.startsWith('Meine Spalten (eigener Satz)')) haengt(`„Meine Spalten (eigener Satz)“ nicht gewählt (gewählt: ${gew})`);
});

// ------------------------------------------------------------------ 5
await schritt('5 Knopf „Sequenzanalyse anlegen“ drücken, Einteilen erscheint', async () => {
  await vor((x) => x.tag === 'button' && x.name === 'Sequenzanalyse anlegen', 'Knopf „Sequenzanalyse anlegen“');
  await taste('Enter');
  const da = await page.waitForFunction(
    () => [...document.querySelectorAll('h2')].some((h) => h.textContent.trim().startsWith('Einteilen: Sinneinheiten setzen')),
    null, { timeout: 15000 },
  ).then(() => true).catch(() => false);
  if (!da) haengt('Überschrift „Einteilen: Sinneinheiten setzen …“ kommt nicht');
});

// ------------------------------------------------------------------ 6
await schritt('6 Im Einteilen Bereich „Spalten der Deutung und Folgetext verdecken (Spaltensatz)“ öffnen', async () => {
  await vor((x) => x.tag === 'summary' && x.name.startsWith('Spalten der Deutung und Folgetext verdecken'), 'Bereich „Spalten der Deutung und Folgetext verdecken (Spaltensatz)“');
  await taste('Enter');
  await page.waitForTimeout(200);
  const offen = await page.evaluate(() => [...document.querySelectorAll('details')].some((d) => d.open && d.querySelector('input[type=radio][name$="-satz"]')));
  if (!offen) haengt('Bereich ist nach Enter nicht offen');
  const gew = await gewaehlterSatz();
  console.log(`  Gewählter Spaltensatz im Einteilen: ${gew}`);
  if (!gew || !gew.startsWith('Meine Spalten (eigener Satz)')) haengt(`„Meine Spalten (eigener Satz)“ nicht gewählt (gewählt: ${gew})`);
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
