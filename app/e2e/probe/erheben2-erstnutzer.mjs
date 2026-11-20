// Erheben 2, Prüfung 2.3: Erstnutzer-Probe nur mit Tastatur.
// Aufgabe: „Lege einen Fragebogen mit drei Likert-Fragen und einem Filter an und exportiere ihn als Word und XLSForm.“
// Nur Tab, Umschalt+Tab, Pfeile, Enter, Leertaste und Text tippen. Keine Klicks, keine Selektoren nach dem Laden.
// Jeder Schritt wird protokolliert (Fokus vorher/nachher, Anzahl Tab-Stopps). Hängen = Ziel nicht in 150 Tab-Stopps erreicht.
// Ehrlichkeitshinweis: Die Namen der Ziele (z. B. „Vorlage einfügen“) kommen aus dem Entdeckungslauf, nicht aus dem Bildschirm;
// gemessen wird also der Tastaturweg, nicht die Auffindbarkeit allein.
// Aufruf: PORT=4221 node e2e/probe/erheben2-erstnutzer.mjs
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
const PORT = process.env.PORT || 4221;
const ZIEL = process.env.TEMP + '/erheben2-erstnutzer';
mkdirSync(ZIEL, { recursive: true });
const b = await chromium.launch();
const ctx = await b.newContext({ locale: 'de-DE', viewport: { width: 1280, height: 900 }, acceptDownloads: true });
const page = await ctx.newPage();
const schritte = [];
let nr = 0;
const log = (was, extra = '') => { nr++; const z = `${String(nr).padStart(2, '0')}. ${was}${extra ? ' — ' + extra : ''}`; schritte.push(z); console.log('S|' + z); };
const fokus = () => page.evaluate(() => {
  const e = document.activeElement;
  if (!e || e === document.body) return { tag: 'BODY', name: '', kurz: 'BODY' };
  const name = (e.getAttribute('aria-label') || (e.labels && e.labels[0]?.innerText) || e.innerText || e.value || e.getAttribute('title') || e.tagName).replace(/\s+/g, ' ').trim();
  const tag = e.tagName.toLowerCase() + (e.type ? '[' + e.type + ']' : '');
  return { tag, name, id: e.id, kurz: `${tag} „${name.slice(0, 50)}“` };
});
/** Tab, bis der Fokus die Bedingung erfüllt; zählt die Stopps; meldet „hängt“, wenn nach 150 Tabs nichts kommt. */
async function tabBis(beschreibung, pred, cap = 150) {
  for (let i = 1; i <= cap; i++) {
    await page.keyboard.press('Tab');
    const f = await fokus();
    if (pred(f)) { log(`Tab bis „${beschreibung}“`, `${i} Tab-Stopps, Fokus: ${f.kurz}`); return f; }
  }
  log(`HÄNGT: „${beschreibung}“ nach 150 Tab-Stopps nicht erreicht`, `Fokus zuletzt: ${(await fokus()).kurz}`);
  return null;
}
const nameIs = (re) => (f) => re.test(f.name);

await page.goto(`http://127.0.0.1:${PORT}/#fragebogen`);
log('Seite „Fragebogen planen“ geöffnet (Adresse eingegeben)');
await page.keyboard.press('Tab');   // Ausgangspunkt: erster Tab auf der Seite
// 1. Neuer Fragebogen
let f = await tabBis('Neuen Fragebogen anlegen', nameIs(/^Neuen Fragebogen anlegen$/));
if (f) { await page.keyboard.press('Enter'); await page.waitForTimeout(300); log('Enter gedrückt', 'Fokus: ' + (await fokus()).kurz); }

// 2. Titel tippen (Abschnitt ist eingeklappt)
f = await tabBis('Titel, Sprachen und Einstellungen (Abschnitt)', nameIs(/^Titel, Sprachen/));
if (f) { await page.keyboard.press('Enter'); await page.waitForTimeout(200); log('Abschnitt aufgeklappt', 'Fokus: ' + (await fokus()).kurz); }
f = await tabBis('Titel (Deutsch) Eingabefeld', (x) => (x.id ?? '') === 'fb-titel-de');
if (f) { await page.keyboard.type('Zufriedenheit Probe'); log('Titel getippt', 'Zufriedenheit Probe'); }

// 3. Drei Likert-Fragen aus der Vorlage
for (let k = 1; k <= 3; k++) {
  f = await tabBis(`Abschnitt „Vorlage einfügen“ (Frage ${k})`, nameIs(/^Vorlage einfügen$/));
  if (k === 1 && f) { await page.keyboard.press('Enter'); await page.waitForTimeout(200); log('Vorlagen-Abschnitt aufgeklappt', 'Fokus: ' + (await fokus()).kurz); }
  f = await tabBis(`Auswahl der Vorlage (Frage ${k})`, (x) => (x.id ?? '') === 'fb-vorlage');
  if (f) { await page.keyboard.type('Zustimmung'); await page.waitForTimeout(150); log('Vorlage per Anfangsbuchstaben gewählt', 'Wert: ' + (await page.evaluate(() => document.getElementById('fb-vorlage').selectedOptions[0]?.text))); }
  f = await tabBis(`Knopf „Vorlage einfügen“ (Frage ${k})`, (x) => x.tag === 'button[button]' && x.name === 'Vorlage einfügen');
  if (f) { await page.keyboard.press('Enter'); await page.waitForTimeout(300); log(`Frage ${k} eingefügt (Enter)`, 'Fokus danach: ' + (await fokus()).kurz); }
}
const anzahl = await page.evaluate(() => document.querySelectorAll('.gl .eintrag').length);
log('Gliederung nach den Vorlagen', `${anzahl} Einträge (Seite + Fragen)`);

// 4. Filter (braucht eine frühere Frage)
f = await tabBis('Filter hinzufügen', nameIs(/^Filter hinzufügen$/));
if (f) { await page.keyboard.press('Enter'); await page.waitForTimeout(300); log('Filter hinzugefügt (Enter)', 'Fokus: ' + (await fokus()).kurz); }
const satz = await page.evaluate(() => document.querySelector('[data-testid=fb-bedingungssatz]')?.innerText ?? '(kein Bedingungssatz gefunden)');
log('Bedingung nach dem Hinzufügen (Standard)', satz.replace(/\s+/g, ' ').slice(0, 160));
// Frage der Bedingung: Standard ist Frage 1; die Auswahl zeigt drei gleich lautende Texte (Befund)
f = await tabBis('Auswahl „Frage“ der Bedingung', (x) => (x.id ?? '').startsWith('fb-bed-f-'));
if (f) log('Auswahl „Frage“ erreicht', 'Optionen: ' + (await page.evaluate((id) => [...document.getElementById(id).options].map(o => o.text.slice(0, 25)).join(' | '), f.id)));
f = await tabBis('Auswahl „Antwort“ der Bedingung', (x) => (x.id ?? '').startsWith('fb-bed-w-'));
if (f) { await page.keyboard.type('stimme eher zu'); await page.waitForTimeout(150); log('Antwort per Tippen gewählt', 'Fokus: ' + (await fokus()).kurz); }
log('Bedingung nach der Änderung', (await page.evaluate(() => document.querySelector('[data-testid=fb-bedingungssatz]')?.innerText ?? '')).replace(/\s+/g, ' ').slice(0, 160));

// 5. Export als Word
f = await tabBis('Exportieren (Dateiformate)', nameIs(/^Exportieren \(Dateiformate\)/));
if (f) { await page.keyboard.press('Enter'); await page.waitForTimeout(200); log('Export-Menü geöffnet (Enter)'); }
f = await tabBis('Fragebogen (Word)', nameIs(/^Fragebogen \(Word\)/));
if (f) {
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 15000 }).catch(() => null), page.keyboard.press('Enter')]);
  if (dl) { await dl.saveAs(ZIEL + '/' + dl.suggestedFilename()); log('Word-Datei gespeichert', dl.suggestedFilename()); }
  else log('HÄNGT: Enter auf „Fragebogen (Word)“ erzeugte keine Datei');
}
// 6. Export als XLSForm
f = await tabBis('XLSForm', nameIs(/^XLSForm/), 150);
if (f) {
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 15000 }).catch(() => null), page.keyboard.press('Enter')]);
  if (dl) { await dl.saveAs(ZIEL + '/' + dl.suggestedFilename()); log('XLSForm-Datei gespeichert', dl.suggestedFilename()); }
  else log('HÄNGT: Enter auf „XLSForm“ erzeugte keine Datei');
}
const meldung = await page.locator('[role=status]').allInnerTexts();
log('Meldung der Seite am Ende', meldung.join(' / ').slice(0, 200));
console.log('ENDE');
console.log(schritte.join('\n'));
await b.close();
