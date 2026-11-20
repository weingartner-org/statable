// Barrierefreiheit Ausbau Stufe A1: Erstnutzer-Probe NUR MIT TASTATUR.
// Aufgaben (wie eine Person ohne Vorwissen):
//   1. #kodieren öffnen, „Beispielprojekt laden (erfunden)“ auslösen
//   2. Bereich „Nachvollziehbarkeit (Dokumentation)“ aufklappen, KI-Angabe „Ja“, Zweck „Transkription“, Text tippen
//   3. „Methodenanhang als Word speichern“ auslösen (Download nach docs/ausbau/bf-a1/methodenanhang.docx)
//   4. Seite „Interviews“ erreichen, „Als REFI-QDA-Projekt speichern (.qdpx)“ auslösen (Download nach docs/ausbau/bf-a1/projekt.qdpx)
// Regeln: kein Klick, kein locator.click, kein fill, kein focus() per Skript. Erlaubt sind nur Tab, Umschalt+Tab,
// Enter, Leertaste (Space), Pfeiltasten und das Tippen von Text. Seitenaufruf per goto (Laden) ist erlaubt.
// Je Aufgabe höchstens 120 Tastendrücke; danach wird die Aufgabe abgebrochen und die nächste begonnen.
// Aufruf aus app/:  PORT=4293 node e2e/probe/bf-ausbau-a1-erstnutzer.mjs
// Schreibt Protokoll nach docs/ausbau/bf-a1/erstnutzer.json und Downloads nach docs/ausbau/bf-a1/.
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const APP = fileURLToPath(new URL('../..', import.meta.url));
const BASE = `http://127.0.0.1:${process.env.PORT || 4293}/`;
const OUT = path.resolve(APP, '../docs/ausbau/bf-a1');
const MAX = 120;
const KI_TEXT = 'aTrain auf dem eigenen Rechner, danach mit der Aufnahme verglichen';

mkdirSync(OUT, { recursive: true });
const ergebnis = { zeitpunkt: new Date().toISOString(), url: BASE, browser: 'chromium headless', aufgaben: [], fehler: [] };

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ locale: 'de-DE', viewport: { width: 1280, height: 800 }, acceptDownloads: true });
const page = await ctx.newPage();
page.on('pageerror', (e) => ergebnis.fehler.push(String(e.message).slice(0, 200)));

let aufgabe = null;
function neueAufgabe(name) {
  aufgabe = { name, tasten: 0, zeichen: 0, pfad: [], haenger: [], geschafft: false };
  ergebnis.aufgaben.push(aufgabe);
  console.log(`\n== ${name}`);
}
const haengt = (t) => { aufgabe.haenger.push(t); console.log('  HÄNGER: ' + t); };

// Aktives Element beschreiben (nur Lesen, kein Eingriff)
const info = () => page.evaluate(() => {
  const e = document.activeElement;
  if (!e || e === document.body || e === document.documentElement) return null;
  let name = e.getAttribute('aria-label') || '';
  if (!name && e.labels && e.labels.length) name = [...e.labels].map((l) => l.textContent).join(' ');
  if (!name) name = e.textContent || e.value || '';
  name = name.replace(/\s+/g, ' ').trim().slice(0, 90);
  return {
    tag: e.tagName.toLowerCase(), id: e.id || '', rolle: e.getAttribute('role') || '', typ: e.type || '',
    wert: e.value || '', name, href: e.getAttribute('href') || '',
    abschnitt: e.closest('section')?.getAttribute('aria-label') || '',
  };
});

// Eine Taste drücken und protokollieren
async function taste(k) {
  aufgabe.tasten++;
  await page.keyboard.press(k);
  const x = await info();
  const kurz = x ? `${x.rolle || x.tag}${x.typ ? '[' + x.typ + ']' : ''} „${x.name}“${x.id ? ' #' + x.id : ''}` : 'kein Fokus';
  aufgabe.pfad.push(`${k} -> ${kurz}`);
  return x;
}

// Mit Tab weitergehen, bis das Ziel fokussiert ist (höchstens bis zum Budget)
async function tabBis(pred, ziel) {
  while (aufgabe.tasten < MAX) {
    const x = await taste('Tab');
    if (x && pred(x)) return x;
  }
  haengt(`Budget von ${MAX} Tastendrücken erschöpft beim Suchen nach: ${ziel}`);
  return null;
}

const wartet = (sel, ms = 20000) => page.waitForSelector(sel, { timeout: ms }).then(() => true).catch(() => false);

// ---------------------------------------------------------------- Aufgabe 1
neueAufgabe('1 Beispielprojekt laden (#kodieren)');
await page.goto(BASE + '#kodieren');
await page.waitForSelector('#ko-t', { timeout: 30000 });
await page.waitForTimeout(1200);
{
  const x = await tabBis((x) => x.id === 'ko-laden', 'Knopf „Beispielprojekt laden (erfunden)“');
  if (x) {
    await taste('Enter');
    const geladen = await wartet('#ko-text');
    await page.waitForTimeout(1500);
    if (geladen) aufgabe.geschafft = true; else haengt('Nach Enter wurde kein Beispielprojekt geladen');
  }
}

// ---------------------------------------------------------------- Aufgabe 2
neueAufgabe('2 KI-Angabe „Ja“, Zweck „Transkription“, Text');
{
  const sum = await tabBis((x) => x.id === 'ko-nachv-auf', 'Aufklapper „Änderungsprotokoll, KI-Angabe und Methodenanhang zeigen“');
  let ok = !!sum;
  if (sum) {
    await taste('Enter'); // aufklappen
    await page.waitForTimeout(500);
    // Radio-Gruppe „KI-Nutzung“: Tab kommt auf das aktuelle Feld, dann Pfeiltasten bis „Ja“ (Wert ja)
    const radio = await tabBis((x) => x.typ === 'radio' && ['offen', 'nein', 'ja'].includes(x.wert), 'Radio „Haben Sie KI genutzt?“');
    if (!radio) ok = false;
    if (radio) {
      for (let i = 0; i < 4 && aufgabe.tasten < MAX; i++) {
        const gewaehlt = await page.evaluate(() => document.querySelector('input[name="nv-ki"]:checked')?.value ?? null);
        if (gewaehlt === 'ja') break;
        await taste('ArrowDown');
        await page.waitForTimeout(300);
      }
      const gewaehlt = await page.evaluate(() => document.querySelector('input[name="nv-ki"]:checked')?.value ?? null);
      console.log(`  gewählt: ${gewaehlt}`);
      if (gewaehlt !== 'ja') { haengt(`„Ja“ mit Pfeiltasten nicht gewählt (gewählt: ${gewaehlt})`); ok = false; }
    }
    // Checkbox „Transkription“ (erscheint erst nach „Ja“)
    await page.waitForTimeout(300);
    const cb = await tabBis((x) => x.typ === 'checkbox' && x.name === 'Transkription', 'Kästchen „Transkription“');
    if (cb) {
      await taste('Space');
      await page.waitForTimeout(300);
      const an = await page.evaluate(() => [...document.querySelectorAll('input[type=checkbox]')].find((c) => c.labels?.[0]?.textContent === 'Transkription')?.checked ?? null);
      console.log(`  Transkription angekreuzt: ${an}`);
      if (!an) { haengt('Kästchen „Transkription“ nach Leertaste nicht angekreuzt'); ok = false; }
    } else ok = false;
    // Textfeld
    const txt = await tabBis((x) => x.id === 'nv-ki-text', 'Textfeld „Wofür und mit welchem Werkzeug?“');
    if (txt) {
      await page.keyboard.type(KI_TEXT, { delay: 15 });
      aufgabe.zeichen += KI_TEXT.length;
      await page.waitForTimeout(400);
      const wert = await page.locator('#nv-ki-text').inputValue();
      console.log(`  Text gespeichert im Feld: ${wert === KI_TEXT}`);
      if (wert !== KI_TEXT) { haengt('Eingetippter Text steht nicht im Feld'); ok = false; }
    } else ok = false;
  }
  aufgabe.geschafft = ok && aufgabe.haenger.length === 0;
}

// ---------------------------------------------------------------- Aufgabe 3
neueAufgabe('3 Methodenanhang als Word speichern');
{
  const x = await tabBis((x) => x.id === 'nv-anh-word', 'Knopf „Methodenanhang als Word speichern“');
  if (x) {
    const [dl] = await Promise.all([
      page.waitForEvent('download', { timeout: 25000 }).catch(() => null),
      taste('Enter'),
    ]);
    if (dl) {
      const ziel = path.join(OUT, 'methodenanhang.docx');
      await dl.saveAs(ziel);
      console.log(`  Download: ${dl.suggestedFilename()} -> ${ziel}`);
      aufgabe.geschafft = true;
      aufgabe.datei = ziel;
    } else haengt('Kein Download nach Enter auf „Methodenanhang als Word speichern“');
  }
}

// ---------------------------------------------------------------- Aufgabe 4: Seite Interviews erreichen (ohne Adresse)
// Weg: „Zurück zur Übersicht“ (Kopf von #kodieren) -> Startseite -> Link „Interviews vorbereiten und auswerten“
neueAufgabe('4 Seite Interviews erreichen (über Übersicht, ohne Adresse)');
{
  const zurueck = await tabBis((x) => x.name === 'Zurück zur Übersicht', 'Knopf „Zurück zur Übersicht“');
  if (zurueck) {
    await taste('Enter');
    await page.waitForTimeout(800);
    const link = await tabBis((x) => x.tag === 'a' && x.href === '#interviews', 'Link „Interviews vorbereiten und auswerten“ auf der Übersicht');
    if (link) {
      await taste('Enter');
      await page.waitForTimeout(800);
      aufgabe.geschafft = true;
    }
  }
  if (!aufgabe.geschafft) {
    // Hilfsweg, nur damit die Prüfung weitergeht: Seitenwechsel über die Adresse (Hash, ohne Neuladen).
    await page.evaluate(() => { location.hash = '#interviews'; });
    await page.waitForTimeout(800);
    haengt('Seite „Interviews“ nicht per Tastatur erreicht; Hilfsweg über die Adresse (Hash) genutzt');
  }
}

// ---------------------------------------------------------------- Aufgabe 4b: REFI-QDA-Knopf
neueAufgabe('4b Knopf „Als REFI-QDA-Projekt speichern (.qdpx)“ (eigenes Budget)');
{
  const bereit = await wartet('#iv-qdpx-speichern', 15000);
  console.log(`  Interviews-Seite da: ${bereit}`);
  if (bereit) {
    const knopf = await tabBis((x) => x.id === 'iv-qdpx-speichern', 'Knopf „Als REFI-QDA-Projekt speichern (.qdpx)“');
    if (knopf) {
      const [dl] = await Promise.all([
        page.waitForEvent('download', { timeout: 25000 }).catch(() => null),
        taste('Enter'),
      ]);
      if (dl) {
        const ziel = path.join(OUT, 'projekt.qdpx');
        await dl.saveAs(ziel);
        console.log(`  Download: ${dl.suggestedFilename()} -> ${ziel}`);
        aufgabe.geschafft = true;
        aufgabe.datei = ziel;
      } else haengt('Kein Download nach Enter auf „Als REFI-QDA-Projekt speichern (.qdpx)“');
    }
  } else haengt('Seite „Interviews“ nicht erreicht');
}

ergebnis.zusammenfassung = ergebnis.aufgaben.map((a) => ({ name: a.name, geschafft: a.geschafft, tasten: a.tasten, zeichen: a.zeichen, haenger: a.haenger.length }));
writeFileSync(path.join(OUT, 'erstnutzer.json'), JSON.stringify(ergebnis, null, 2), 'utf8');
console.log('\nZusammenfassung:', JSON.stringify(ergebnis.zusammenfassung, null, 1));
await ctx.close();
await browser.close();
