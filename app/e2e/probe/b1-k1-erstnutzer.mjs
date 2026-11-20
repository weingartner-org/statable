// B1 K1: Erstnutzer-Probe NUR MIT TASTATUR für den R-Skript-Export.
//   K1  Ergebnisblatt (t-Test, Beispiel „lesetraining“): Menü „Export ▾“ des ganzen Blatts erreichen, öffnen, „Als R-Skript mit Daten (.zip)“ wählen → .zip
//   K2  Seite Bericht: Knopf „Als R-Skript (.zip)“ per Tab erreichen, Enter → .zip mit .R und -daten.csv, Skript enthält „blatt_1 <- local({“
//   Bilder (Klicks erlaubt, zählen nicht): in 375/1280/2560 px: Blatt mit offenem Menü, Seitenkopf Bericht; Überlauf und Sichtbarkeit.
// Regeln: kein click, kein fill, kein focus() per Skript während der Messung. Erlaubt: Tab, Umschalt+Tab, Enter, Leertaste, Pfeiltasten, Esc.
// Vorlauf (Adresse, Beispiel öffnen, „Frage öffnen“ per Klick) zählt nicht.
// Aufruf aus app/:  PORT=5231 node e2e/probe/b1-k1-erstnutzer.mjs
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { unzipSync, strFromU8 } from 'fflate';

const APP = fileURLToPath(new URL('../..', import.meta.url));
const BASE = 'http://127.0.0.1:' + (process.env.PORT || '5231') + '/';
const OUT = path.resolve(APP, '../docs/ausbau/bf-b1');
const MAX = 400, LANG_AB = 25;
mkdirSync(OUT, { recursive: true });
const ergebnis = { zeitpunkt: new Date().toISOString(), url: BASE, viewport: '1366x850', locale: 'de-DE', browser: 'chromium headless',
  eingabe: 'nur Tastatur (Tab, Umschalt+Tab, Enter, Leertaste, Pfeiltasten); kein Klick, kein focus() per Skript', schritte: [], fehler: [], bilder: [], breiten: [] };

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ locale: 'de-DE', viewport: { width: 1366, height: 850 }, acceptDownloads: true });
await ctx.addInitScript(() => { try { localStorage.setItem('statable-einst', JSON.stringify({ rundgang: false })); } catch { /* weiter */ } });
const page = await ctx.newPage();
page.on('pageerror', (e) => ergebnis.fehler.push(String(e.message).slice(0, 200)));

class Abbruch extends Error {}
let s = null;
const neuerSchritt = (name) => { s = { name, geschafft: false, tasten: 0, pfad: [], fokusverlust: 0, lang: [], haenger: [], auffaellig: [], notizen: [] }; ergebnis.schritte.push(s); console.log(`\n== ${name}`); };
const haengt = (t) => { s.haenger.push(t); console.log('  HÄNGER: ' + t); };
const auffaellig = (t) => { s.auffaellig.push(t); console.log('  AUFFÄLLIG: ' + t); };
const notiz = (t) => { s.notizen.push(t); console.log('  ' + t); };
const info = () => page.evaluate(() => {
  const e = document.activeElement;
  if (!e || e === document.body || e === document.documentElement) return null;
  let name = e.getAttribute('aria-label') || '';
  if (!name) name = e.textContent || e.value || '';
  name = name.replace(/\s+/g, ' ').trim().slice(0, 120);
  return { tag: e.tagName.toLowerCase(), id: e.id || '', rolle: e.getAttribute('role') || '', name };
});
async function taste(k) {
  if (s.tasten >= MAX) throw new Abbruch(`Budget von ${MAX} Tastendrücken erschöpft`);
  s.tasten++;
  await page.keyboard.press(k);
  await page.waitForTimeout(80);
  const x = await info();
  if (!x) s.fokusverlust++;
  s.pfad.push(`${k} -> ${x ? `${x.rolle || x.tag} „${x.name}“` : 'body (Fokus verloren)'}`);
  return x;
}
async function vor(pred, ziel, k = 'Tab') {
  const v = s.tasten;
  for (;;) { if (s.tasten >= MAX) throw new Abbruch(`Ziel nicht erreicht: ${ziel}`); const x = await taste(k); if (x && pred(x)) break; }
  const n = s.tasten - v; if (n > LANG_AB) s.lang.push(`${ziel}: ${n} Tasten bis dorthin`);
}
async function schritt(name, fn) {
  neuerSchritt(name);
  try { await fn(); if (!s.haenger.length) s.geschafft = true; } catch (e) { haengt(e instanceof Abbruch ? e.message : `Fehler: ${e.message}`.slice(0, 200)); }
  console.log(`  -> ${s.geschafft ? 'GESCHAFFT' : 'NICHT GESCHAFFT'} (Tasten: ${s.tasten}, Fokusverlust: ${s.fokusverlust})`);
}
const meldungen = () => page.evaluate(() => {
  const t = [...document.querySelectorAll('[role=status],[role=alert],[aria-live]')].map((e) => (e.textContent || '').replace(/\s+/g, ' ').trim()).filter(Boolean);
  const k = [...document.querySelectorAll('body *')].filter((e) => e.children.length === 0 && /R-Skript mit Daten gespeichert|R script with data saved/.test(e.textContent || '')).map((e) => ({ klasse: e.className?.toString?.() || e.tagName, text: e.textContent.trim() }));
  return { live: t, sichtbareKarten: k };
});
async function zipPruefen(d, ziel) {
  const p = path.join(OUT, '_dl-' + ziel + '.zip');
  await d.saveAs(p);
  const z = unzipSync(new Uint8Array(readFileSync(p)));
  rmSync(p);
  const namen = Object.keys(z);
  const r = namen.find((n) => n.endsWith('.R')), csv = namen.find((n) => n.endsWith('-daten.csv'));
  const skript = r ? strFromU8(z[r]) : '';
  return { namen, hatR: !!r, hatCsv: !!csv, enthaeltBlatt1: skript.includes('blatt_1 <- local({'), skriptZeilen: skript.split('\n').length, csvZeilen: csv ? strFromU8(z[csv]).split('\n').length : 0 };
}

// ---------------- Vorlauf
let vorlaufOk = false;
try {
  await page.goto(BASE + '#beispiele/lesetraining', { timeout: 180000 });
  await page.waitForTimeout(3000);
  await page.getByRole('button', { name: /^Öffnen/ }).first().click();
  await page.waitForTimeout(4000);
  for (let i = 0; i < 3; i++) { await page.getByRole('button', { name: 'Nächste Frage' }).click(); await page.waitForTimeout(300); }
  await page.getByRole('button', { name: 'Frage öffnen' }).click();    // Beispiel-Schritt 4: t-Test „Zuwachs“ nach „Gruppe“
  await page.waitForFunction(() => /#blatt\/(?!neu)/.test(location.hash), null, { timeout: 60000 });
  await page.waitForSelector('button[aria-label^="Export: ganzes Blatt"]', { timeout: 120000 });
  await page.waitForTimeout(1500);
  vorlaufOk = true;
  ergebnis.vorlauf = 'Adresse #beispiele/lesetraining, Knopf „Öffnen“, dreimal „Nächste Frage“, „Frage öffnen“ (Schritt 4: t-Test, Zuwachs nach Gruppe, Art zwei-gruppen) → #blatt/<id>, Blatt ist automatisch im Bericht';
  console.log('Vorlauf fertig: ' + page.url());
} catch (e) { ergebnis.fehler.push('Vorlauf: ' + String(e.message).slice(0, 200)); console.log('Vorlauf fehlgeschlagen: ' + e.message); }

// ---------------- K1
await schritt('K1 Blatt: „Export ▾“ (ganzes Blatt) erreichen, öffnen, „Als R-Skript mit Daten (.zip)“ wählen → Download .zip', async () => {
  const start = await info();
  notiz(`Start-Fokus nach dem Vorlauf (ohne Skript-focus): ${start ? (start.rolle || start.tag) + ' „' + start.name + '“' : 'body (nichts fokussiert)'}`);
  s.startFokus = start ? start.name : 'body';
  const istZiel = (x) => x.tag === 'button' && x.name.startsWith('Export: ganzes Blatt');
  await vor(istZiel, 'Knopf „Export ▾“ des ganzen Blatts');
  s.tastenBisKnopf = s.tasten;
  notiz(`Tasten bis zum Knopf (Tab ab Start): ${s.tasten}`);
  const vorAktion = s.tasten;
  await taste('Enter');
  const offen = await page.evaluate(() => !!document.querySelector('.em-menue:popover-open'));
  notiz(`Menü offen nach Enter: ${offen}; Fokus: ${(await info())?.name}`);
  if (!offen) haengt('Menü nach Enter nicht offen');
  let x = await info(), pfeile = 0;
  while (!(x && /R-Skript/.test(x.name)) && pfeile < 8) { x = await taste('ArrowDown'); pfeile++; }
  notiz(`Pfeil-unten-Schritte bis „${x?.name}“: ${pfeile}`);
  if (!x || !/R-Skript mit Daten/.test(x.name)) { haengt('Eintrag „Als R-Skript mit Daten (.zip)“ nicht erreicht'); return; }
  const gruppe = await page.evaluate(() => document.activeElement?.closest('[role=group]')?.getAttribute('aria-label') || '');
  notiz(`Gruppe des Eintrags: „${gruppe}“`);
  if (gruppe !== 'Zum Nachrechnen') auffaellig(`Gruppe ist „${gruppe}“, erwartet „Zum Nachrechnen“`);
  const dlP = page.waitForEvent('download', { timeout: 30000 }).then((d) => d, () => null);
  await taste('Enter');
  const d = await dlP;
  s.aktionenAbKnopf = { oeffnen: 1, waehlen: 1, pfeiltastenImMenue: pfeile, tastenAbKnopf: s.tasten - vorAktion + 1 };
  notiz(`Aktionen ab dem Knopf: Menü öffnen (1), Eintrag wählen (1), dazu ${pfeile} Pfeiltasten`);
  if (!d) { haengt('Kein Download nach Enter auf dem Eintrag'); return; }
  const fn = d.suggestedFilename(); notiz(`Download: ${fn}`);
  if (!fn.endsWith('.zip')) haengt('Dateiname endet nicht auf .zip');
  s.zip = await zipPruefen(d, 'k1'); notiz('ZIP: ' + JSON.stringify(s.zip));
  await page.waitForTimeout(600);
  s.meldung = await meldungen(); notiz('Meldung: ' + JSON.stringify(s.meldung));
  const fokus = await info(); notiz(`Fokus nach dem Download: ${fokus ? (fokus.rolle || fokus.tag) + ' „' + fokus.name + '“' : 'body'}`);
  if (!fokus) auffaellig('Fokus nach dem Download auf body');
});
// Gegenprobe: Pfeil oben öffnet das Menü auf dem letzten Eintrag (kürzester Weg)
neuerSchritt('K1b Abkürzung: auf dem Knopf Pfeil oben (öffnet auf dem letzten Eintrag), Enter');
try {
  let x = await info();
  if (!x || !x.name.startsWith('Export: ganzes Blatt')) await vor((y) => y.name.startsWith('Export: ganzes Blatt'), 'Knopf Export ganzes Blatt', 'Shift+Tab');
  const t0 = s.tasten;
  x = await taste('ArrowUp'); notiz(`Pfeil oben auf dem Knopf: Fokus im Menü auf „${x?.name}“`);
  const dlP = page.waitForEvent('download', { timeout: 30000 }).then((d) => d, () => null);
  await taste('Enter'); const d = await dlP;
  if (d && /R-Skript/.test(x?.name || '') && d.suggestedFilename().endsWith('.zip')) s.geschafft = true; else haengt('Abkürzung ergibt keinen .zip-Download');
  notiz(`Tasten ab Knopf mit Abkürzung: ${s.tasten - t0}`);
} catch (e) { haengt(String(e.message).slice(0, 200)); }
console.log(`  -> ${s.geschafft ? 'GESCHAFFT' : 'NICHT GESCHAFFT'} (Tasten: ${s.tasten})`);

// ---------------- Bilder Teil 1 (a): Blatt mit offenem Menü, drei Breiten (Klicks erlaubt, zählen nicht)
async function ueberlauf() { return page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, innerWidth, ueberlauf: document.documentElement.scrollWidth > innerWidth })); }
async function imFenster(sel, text) {
  return page.evaluate(([sel, text]) => {
    const e = [...document.querySelectorAll(sel)].find((x) => (x.textContent || '').includes(text) && x.getClientRects().length);
    if (!e) return { gefunden: false };
    const r = e.getBoundingClientRect();
    return { gefunden: true, links: Math.round(r.left), rechts: Math.round(r.right), oben: Math.round(r.top), unten: Math.round(r.bottom), ganzSichtbar: r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight };
  }, [sel, text]);
}
for (const w of [375, 1280, 2560]) {
  const b = { breite: w };
  await page.setViewportSize({ width: w, height: 900 });
  await page.waitForTimeout(500);
  const knopf = page.locator('button[aria-label^="Export: ganzes Blatt"]');
  await knopf.scrollIntoViewIfNeeded();
  await knopf.click();
  await page.waitForTimeout(500);
  b.k1 = { ...(await ueberlauf()), eintrag: await imFenster('.em-menue:popover-open .em-punkt', 'R-Skript') };
  const f = path.join(OUT, `k1-export-${w}.png`);
  await page.screenshot({ path: f }); ergebnis.bilder.push(f);
  await page.keyboard.press('Escape'); await page.waitForTimeout(200);
  ergebnis.breiten.push(b);
}

// ---------------- K2
await page.setViewportSize({ width: 1366, height: 850 });
await page.evaluate(() => { location.hash = 'bericht'; });
await page.waitForSelector('text=Als R-Skript (.zip)', { timeout: 60000 });
await page.waitForTimeout(1500);
await schritt('K2 Bericht: Knopf „Als R-Skript (.zip)“ per Tab, Enter → Download .zip mit .R und -daten.csv', async () => {
  const start = await info();
  notiz(`Start-Fokus nach Adresswechsel #bericht: ${start ? (start.rolle || start.tag) + ' „' + start.name + '“' : 'body (nichts fokussiert)'}`);
  s.startFokus = start ? start.name : 'body';
  await vor((x) => x.tag === 'button' && x.name.includes('Als R-Skript (.zip)'), 'Knopf „Als R-Skript (.zip)“');
  notiz(`Tasten bis zum Knopf: ${s.tasten}`);
  const dlP = page.waitForEvent('download', { timeout: 30000 }).then((d) => d, () => null);
  await taste('Enter');
  const d = await dlP;
  if (!d) { haengt('Kein Download nach Enter'); return; }
  const fn = d.suggestedFilename(); notiz(`Download: ${fn}`);
  if (!fn.endsWith('.zip')) haengt('Dateiname endet nicht auf .zip');
  s.zip = await zipPruefen(d, 'k2'); notiz('ZIP: ' + JSON.stringify(s.zip));
  if (s.zip.namen.length !== 2 || !s.zip.hatR || !s.zip.hatCsv) haengt('ZIP enthält nicht genau .R und -daten.csv');
  if (!s.zip.enthaeltBlatt1) haengt('R-Skript enthält „blatt_1 <- local({“ nicht');
  await page.waitForTimeout(600);
  s.meldung = await meldungen(); notiz('Meldung: ' + JSON.stringify(s.meldung));
  const fokus = await info(); notiz(`Fokus nach dem Download: ${fokus ? (fokus.rolle || fokus.tag) + ' „' + fokus.name + '“' : 'body'}`);
  if (!fokus) auffaellig('Fokus nach dem Download auf body');
});

// ---------------- Bilder Teil 2 (b): Seitenkopf Bericht
for (const w of [375, 1280, 2560]) {
  const b = ergebnis.breiten.find((x) => x.breite === w);
  await page.setViewportSize({ width: w, height: 900 });
  await page.waitForTimeout(600);
  await page.evaluate(() => window.scrollTo(0, 0));
  b.k2 = { ...(await ueberlauf()), knopf: await imFenster('button', 'Als R-Skript (.zip)') };
  const f = path.join(OUT, `k2-bericht-${w}.png`);
  await page.screenshot({ path: f }); ergebnis.bilder.push(f);
}

ergebnis.zusammenfassung = ergebnis.schritte.map((x) => ({ schritt: x.name, geschafft: x.geschafft, tasten: x.tasten, fokusverlust: x.fokusverlust, lang: x.lang.length, haenger: x.haenger.length, auffaellig: x.auffaellig.length }));
ergebnis.mausEingesetzt = false;
writeFileSync(path.join(OUT, 'erstnutzer-k1.json'), JSON.stringify(ergebnis, null, 2) + '\n', 'utf8');
console.log('\nZusammenfassung:'); for (const z of ergebnis.zusammenfassung) console.log(`  ${z.geschafft ? 'ja ' : 'nein'} | Tasten ${String(z.tasten).padStart(3)} | Fokusverlust ${z.fokusverlust} | Hänger ${z.haenger} | ${z.schritt}`);
console.log('Breiten:', JSON.stringify(ergebnis.breiten)); console.log('Fehler auf der Seite:', ergebnis.fehler.length, 'Vorlauf ok:', vorlaufOk);
await ctx.close(); await browser.close();
