// Stufe A6a Teil 2: Erstnutzer-Probe NUR MIT TASTATUR über den ganzen Weg Interviews -> Kodieren -> Thema -> Joint Display -> Berichtshilfe -> Methodenanhang (Word).
// Regeln wie in den Proben A3/A5: kein click, kein fill, kein focus() per Skript; erlaubt Tab, Umschalt+Tab, Enter, Leertaste, Pfeile, Esc, Buchstaben/Ziffern im Textfeld, Strg+K und Tippen.
// Vorlauf (Adresse #interviews) und Warten zählen nicht. Aufruf aus app/:  PORT=5391 node e2e/probe/bf-ausbau-a6a-erstnutzer.mjs   Ergebnis: docs/ausbau/bf-a6a/erstnutzer.json
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { pruefeDocx } from '../../../scripts/docx-pruefen.mjs';

const APP = fileURLToPath(new URL('../..', import.meta.url));
const BASE = 'http://127.0.0.1:' + (process.env.PORT || '5391') + '/';
const OUT = path.resolve(APP, '../docs/ausbau/bf-a6a');
const MAX = Number(process.env.MAX || 300);
const LANG_AB = 25;
mkdirSync(OUT, { recursive: true });
const ergebnis = { zeitpunkt: new Date().toISOString(), url: BASE + '#interviews', viewport: '1366x850', locale: 'de-DE', browser: 'chromium headless', eingabe: 'nur Tastatur', schritte: [], fehler: [] };

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ locale: 'de-DE', viewport: { width: 1366, height: 850 }, acceptDownloads: true });
await ctx.addInitScript(() => { try { localStorage.setItem('statable-einst', JSON.stringify({ rundgang: false })); } catch { /* egal */ } });
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

const info = () => page.evaluate(() => {
  const e = document.activeElement;
  if (!e || e === document.body || e === document.documentElement) return null;
  let name = e.getAttribute('aria-label') || '';
  if (!name && e.labels && e.labels.length) name = [...e.labels].map((l) => l.textContent).join(' ');
  if (!name) name = e.textContent || e.value || '';
  name = name.replace(/\s+/g, ' ').trim().slice(0, 120);
  return { tag: e.tagName.toLowerCase(), id: e.id || '', typ: e.type || '', grp: e.name || '', wert: e.value || '', name, ch: !!e.checked };
});
async function taste(k) {
  if (s.tasten >= MAX) throw new Abbruch(`Budget von ${MAX} Tastendrücken erschöpft`);
  s.tasten++;
  await page.keyboard.press(k);
  await page.waitForTimeout(70);
  const x = await info();
  if (!x) s.fokusverlust++;
  s.pfad.push(`${k} -> ${x ? `${x.typ ? x.tag + '[' + x.typ + ']' : x.tag} „${x.name}“${x.id ? ' #' + x.id : ''}` : 'body (Fokus verloren)'}`);
  return x;
}
async function tippe(t) { await page.keyboard.type(t); s.zeichen += t.length; await page.waitForTimeout(80); }
async function vor2(pred, k, max) {
  const vorher = s.tasten;
  for (let i = 0; i < max; i++) {
    if (s.tasten >= MAX) throw new Abbruch('Budget erschöpft');
    const x = await taste(k);
    if (x && pred(x)) { const n = s.tasten - vorher; if (n > LANG_AB) s.lang.push(`${n} Tasten bis dorthin`); return x; }
  }
  return null;
}
async function finde(pred, ziel, richtung = 'vor', max1 = 80) {
  const r1 = await vor2(pred, richtung === 'vor' ? 'Tab' : 'Shift+Tab', max1);
  if (r1) return r1;
  const r2 = await vor2(pred, richtung === 'vor' ? 'Shift+Tab' : 'Tab', MAX);
  if (r2) { auffaellig(`${ziel}: erst in die andere Richtung gefunden`); return r2; }
  throw new Abbruch(`Ziel nicht erreicht: ${ziel}`);
}
const id = (x) => (y) => y.id === x;
async function stelleAuswahl(selId, wert) {
  let letzter = null, gedreht = false;
  for (;;) {
    const v = await page.evaluate((i) => document.getElementById(i)?.value ?? null, selId);
    if (v === wert) return v;
    if (v === letzter) { if (gedreht) throw new Abbruch(`Wert ${wert} nicht gefunden`); await taste('Home'); gedreht = true; letzter = null; continue; }
    letzter = v; await taste('ArrowDown');
  }
}
async function palette(suche, erwartetHash, runter = 0) {
  await taste('Control+k'); await page.waitForTimeout(250);
  await tippe(suche); await page.waitForTimeout(400);
  for (let i = 0; i < runter; i++) await taste('ArrowDown');
  await taste('Enter'); await page.waitForTimeout(1500);
  if (erwartetHash) { const h = await page.evaluate(() => location.hash); if (!h.startsWith('#' + erwartetHash)) haengt(`Strg+K „${suche}“ führt nach ${h}, erwartet #${erwartetHash}`); }
}
const text = (sel) => page.evaluate((q) => document.querySelector(q)?.textContent?.replace(/\s+/g, ' ').trim() ?? '', sel);
async function schritt(name, fn) {
  neuerSchritt(name);
  try { await fn(); if (s.haenger.length === 0) s.geschafft = true; }
  catch (e) { haengt(e instanceof Abbruch ? e.message : `Fehler: ${e.message}`.slice(0, 200)); }
  console.log(`  -> ${s.geschafft ? 'GESCHAFFT' : 'NICHT GESCHAFFT'} (Tasten: ${s.tasten}, Fokusverlust: ${s.fokusverlust})`);
}

try {
  await page.goto(BASE + '#interviews', { timeout: 180000 });
  await page.waitForSelector('#iv-beispiel', { timeout: 120000 });
  await page.waitForTimeout(1500);
  console.log('Vorlauf fertig');
} catch (e) { ergebnis.fehler.push('Vorlauf: ' + String(e.message).slice(0, 200)); }

await schritt('1 Beispielinterview laden (#iv-beispiel)', async () => {
  await finde(id('iv-beispiel'), 'Knopf Beispielinterview laden');
  await taste('Enter');
  await page.waitForSelector('#iv-offen-t', { timeout: 30000 });
  await page.waitForTimeout(800);
});
await schritt('2 In den Kodier-Arbeitsplatz und Dokument öffnen', async () => {
  // U1 Teil 2: Knopf „Kodieren: <Transkript>“ in der Transkript-Zeile öffnet das Dokument im Kodier-Arbeitsplatz, Fokus im Text
  await finde((x) => x.tag === 'button' && /^Kodieren: /.test(x.name), 'Knopf „Kodieren: <Transkript>“');
  await taste('Enter');
  await page.waitForSelector('#ko-text', { timeout: 30000 });
  await page.waitForTimeout(1200);
  const f = await info();
  notiz('Fokus nach dem Wechsel: ' + JSON.stringify(f));
  if (f?.id !== 'ko-text') auffaellig('Fokus nach „Kodieren“ nicht im Dokumenttext');
});
await schritt('3 Arbeitsweise „reflexive Thematische Analyse“ wählen', async () => {
  await finde(id('ko-arbeitsweise'), 'Auswahl Arbeitsweise', 'zurueck');
  await stelleAuswahl('ko-arbeitsweise', 'ta-reflexiv');
  await page.waitForSelector('#th-neu-name', { timeout: 10000 });
});
await schritt('4 Eine Stelle kodieren (Neuer Code, Satz markieren, Ziffer 1)', async () => {
  await finde((x) => x.tag === 'button' && x.name === 'Neuer Code', 'Knopf Neuer Code', 'zurueck');
  await taste('Enter');
  await page.waitForFunction(() => document.activeElement?.id === 'ko-baum-name', null, { timeout: 4000 }).catch(() => haengt('Fokus nach „Neuer Code“ nicht im Namensfeld'));
  await tippe('Hilfe suchen'); await taste('Enter'); await page.waitForTimeout(500);
  await finde(id('ko-text'), 'Dokumenttext #ko-text', 'zurueck');
  await taste('s'); await page.waitForTimeout(300);
  await taste('1'); await page.waitForTimeout(900);
  const a = await page.evaluate(() => (document.getElementById('ansage-dringend')?.textContent || '') + ' | ' + (document.getElementById('ansage-hoeflich')?.textContent || ''));
  notiz('Ansage nach Ziffer 1: ' + a.slice(0, 160));
  await taste('i'); await page.waitForTimeout(700);
  const a2 = await page.evaluate(() => (document.getElementById('ansage-dringend')?.textContent || '') + ' | ' + (document.getElementById('ansage-hoeflich')?.textContent || ''));
  notiz('Ansage nach i (Was ist hier kodiert?): ' + a2.slice(0, 200));
  const codes = await page.evaluate(() => [...document.querySelectorAll('[id^="ko-b-"]')].length);
  notiz('Codes im Baum (ko-b-*): ' + codes);
  if (!/Hilfe suchen/.test(a + ' ' + a2)) haengt('Kodieren per Ziffer 1 nicht bestätigt/erkennbar (Ansage: ' + a.slice(0, 80) + ' / i: ' + a2.slice(0, 80) + ')');
  else if (!/kodiert|coded|Hilfe suchen/i.test(a)) auffaellig('Nach der Ziffer 1 keine sofortige Bestätigung, erst nach i');
});
await schritt('5 Thema anlegen (Name tippen, Enter)', async () => {
  await finde(id('th-neu-name'), 'Namensfeld Thema');
  await tippe('Hilfe annehmen'); await taste('Enter'); await page.waitForTimeout(500);
  const n = await page.evaluate(() => (document.getElementById('th-liste-t')?.textContent.match(/\((\d+)\)/) ?? [])[1] ?? null);
  notiz('Themen in der Liste: ' + n);
  if (n !== '1') haengt('Thema nicht angelegt (Zahl ' + n + ')');
});
await schritt('6 Joint Display ansehen (Mixed-Methods-Beispiel, verknüpfen, Joint Display anlegen)', async () => {
  await palette('Mixed-Methods-Beispiel', 'kodieren');
  await page.waitForSelector('#ko-mm-t', { timeout: 120000 }).catch(() => haengt('Mixed-Methods-Beispiel öffnet nicht'));
  notiz('Fokus: ' + JSON.stringify(await info()));
  await finde(id('ko-mm-vk-knopf'), 'Knopf Verknüpfen');
  await taste('Enter'); await page.waitForTimeout(600);
  await palette('Joint Display', 'kodieren');
  if (!(await page.locator('#ko-mm-jd-t').count())) {
    auffaellig('Strg+K „Joint Display“: erster Treffer ist der Fachbegriff (öffnet Erklärung), das Werkzeug ist der zweite - eine Pfeiltaste mehr');
    await page.keyboard.press('Escape'); await page.waitForTimeout(300);
    await palette('Joint Display', 'kodieren', 1);
  }
  await page.waitForSelector('#ko-mm-jd-t', { timeout: 5000 }).catch(() => haengt('Joint-Display-Bereich auch mit dem Langtitel nicht da'));
  notiz('Fokus: ' + JSON.stringify(await info()));
  if (!(await page.locator('#ko-mm-jd-neu-name').count())) throw new Abbruch('kein Namensfeld, Seite nicht erreicht');
  await finde(id('ko-mm-jd-neu-name'), 'Namensfeld Joint Display');
  await tippe('Themen nach Gruppe'); await taste('Enter'); await page.waitForTimeout(800);
  notiz('Fokus nach Enter im Namensfeld: ' + JSON.stringify(await info()));
  if (!(await page.locator('#ko-mm-jd-tab-t').count())) {
    await finde(id('ko-mm-jd-neu-btn'), 'Knopf Joint Display anlegen'); await taste('Enter'); await page.waitForTimeout(800);
  }
  if (!(await page.locator('#ko-mm-jd-tab-t').count())) haengt('Keine Joint-Display-Tabelle sichtbar');
});
await schritt('7 Berichtshilfe öffnen und einen Punkt setzen', async () => {
  await palette('COREQ', 'kodieren');
  await page.waitForFunction(() => document.activeElement?.id === 'ko-bh-t', null, { timeout: 5000 }).catch(() => haengt('Fokus nicht auf #ko-bh-t'));
  const p1 = await finde((x) => x.typ === 'radio' && x.grp === 'ko-bh-coreq-coreq-01', 'Optionsfeld Punkt 1');
  if (!p1.name.startsWith('Erfüllt')) { for (let i = 0; i < 4; i++) { await taste('ArrowDown'); const x = await info(); if (x && x.name.startsWith('Erfüllt')) break; } }
  await taste('Space');
  const zahl = await text('#ko-bh-zahl');
  notiz('Zähler: ' + zahl);
  if (!/1 von 32/.test(zahl)) haengt('Zähler zeigt nicht „1 von 32“: ' + zahl);
});
let wordPfad = null;
await schritt('8 Methodenanhang als Word speichern', async () => {
  auffaellig('Strg+K „Nachvollziehbarkeit“ und „Methodenanhang“ haben keinen Treffer im Kodier-Arbeitsplatz (nur Berichtshilfe und Hilfeartikel); Weg über den Sprungknopf');
  await finde((x) => x.tag === 'button' && /Zur Nachvollziehbarkeit/.test(x.name), 'Sprungknopf „Zur Nachvollziehbarkeit“', 'zurueck', 120);
  await taste('Enter'); await page.waitForTimeout(800);
  const offen = await page.evaluate(() => document.getElementById('ko-nachv-auf')?.closest('details')?.open ?? null);
  notiz('Klappe „Änderungsprotokoll, KI-Angabe und Methodenanhang“ nach dem Sprung offen: ' + offen);
  if (offen === false) {
    auffaellig('Sprung „Zur Nachvollziehbarkeit“ lässt die Klappe zu (Berichtshilfe-Sprung öffnet sie): ein Tab + Enter mehr');
    await finde(id('ko-nachv-auf'), 'Klappe Nachvollziehbarkeit aufmachen', 'vor', 5);
    await taste('Enter'); await page.waitForTimeout(600);
  }
  await finde(id('nv-anh-word'), 'Knopf Methodenanhang als Word speichern', 'vor', MAX - 20);
  const dlP = page.waitForEvent('download', { timeout: 60000 }).then((d) => d, () => null);
  await taste('Enter');
  const d = await dlP;
  if (!d) { haengt('Kein Download nach Enter'); return; }
  wordPfad = path.join(OUT, 'methodenanhang-a6a.docx');
  await d.saveAs(wordPfad);
  notiz('Download: ' + d.suggestedFilename());
});
if (wordPfad) { try { ergebnis.wordBefunde = pruefeDocx(readFileSync(wordPfad)); console.log('docx-pruefen:', JSON.stringify(ergebnis.wordBefunde).slice(0, 500)); } catch (e) { ergebnis.fehler.push('docx: ' + e.message); } }

ergebnis.zusammenfassung = ergebnis.schritte.map((x) => ({ schritt: x.name, geschafft: x.geschafft, tasten: x.tasten, zeichen: x.zeichen, fokusverlust: x.fokusverlust, lang: x.lang.length, haenger: x.haenger, auffaellig: x.auffaellig }));
ergebnis.gesamtTasten = ergebnis.schritte.reduce((a, x) => a + x.tasten, 0);
writeFileSync(path.join(OUT, 'erstnutzer.json'), JSON.stringify(ergebnis, null, 2) + '\n', 'utf8');
console.log('\nZusammenfassung:');
for (const z of ergebnis.zusammenfassung) console.log(`  ${z.geschafft ? 'ja  ' : 'nein'} | Tasten ${String(z.tasten).padStart(3)} | Fokusverlust ${z.fokusverlust} | lang ${z.lang} | ${z.schritt}${z.haenger.length ? ' | HÄNGER: ' + z.haenger.join(' ; ') : ''}`);
console.log('Summe Tasten:', ergebnis.gesamtTasten, 'Fehler:', ergebnis.fehler.length);
await ctx.close(); await browser.close();
