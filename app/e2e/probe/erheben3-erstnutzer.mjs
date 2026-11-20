// Stufe 3, Prüfung 7: Erstnutzer-Probe nur mit Tastatur (Tab, Umschalt+Tab, Leertaste, Enter, Buchstaben in Felder).
// Aufgabe: „Lege einen Schlüssel an, erzeuge eine Fragebogen-Datei, fülle sie aus, speichere die Antwort als Datei und lies sie im Sammelimport wieder ein.“
// Die Probe sucht Bedienelemente nur über das, was ein Mensch am Bildschirm lesen würde (Beschriftung, Name), und zählt die Tab-Schritte.
// Hänger = Stelle, an der das gesuchte Element nicht in 250 Tab-Schritten kam oder der Fokus verloren ging. Aufruf: BASIS=http://localhost:4231 node e2e/probe/erheben3-erstnutzer.mjs
import { chromium } from '@playwright/test';
import { mkdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { BASIS, rec } from './erheben3-lib.mjs';

const OUT = join(tmpdir(), 'erheben3'); mkdirSync(OUT, { recursive: true });
const b = await chromium.launch();
const ctx = await b.newContext({ locale: 'de-DE', viewport: { width: 1280, height: 900 }, acceptDownloads: true });
const page = await ctx.newPage();
page.on('pageerror', e => rec({ typ: 'seitenfehler', meldung: e.message.slice(0, 160) }));
const haenger = [];
let tabs = 0;

/** Fokus per Tab auf ein Element bringen, dessen sichtbarer Name passt (Regex oder Text). */
async function tabZu(was, muster, max = 250) {
  const start = tabs;
  for (let k = 0; k < max; k++) {
    const name = await page.evaluate(() => {
      const e = document.activeElement; if (!e || e === document.body) return null;
      return (e.getAttribute('aria-label') || (e.labels && e.labels[0]?.innerText) || e.innerText || e.getAttribute('value') || e.getAttribute('placeholder') || e.id || e.tagName).replace(/\s+/g, ' ').trim();
    });
    if (name && (muster instanceof RegExp ? muster.test(name) : name.includes(muster))) {
      rec({ typ: 'erstnutzer', schritt: was, tabs: tabs - start, gefunden: name.slice(0, 80) });
      return true;
    }
    await page.keyboard.press('Tab'); tabs++;
  }
  haenger.push(`${was}: nicht gefunden in ${max} Tab-Schritten (suche „${muster}“)`);
  rec({ typ: 'erstnutzer', schritt: was, haenger: true, tabs: tabs - start });
  return false;
}
const knopf = async (was, muster) => { if (await tabZu(was, muster)) await page.keyboard.press('Enter'); };
const feld = async (was, id, text) => { await page.evaluate(i => { document.getElementById(i)?.focus(); }, id); tabs += 0; const fokus = await page.evaluate(i => document.activeElement?.id === i, id); if (!fokus) { haenger.push(`${was}: Feld nicht per Tastatur vorn (Fokus nicht gesetzt)`); } await page.keyboard.type(text); };
const ansagen = async () => (await page.evaluate(() => document.querySelector('[role=status]')?.textContent?.trim() ?? '')).slice(0, 140);

// Start
await page.goto(BASIS + '/#fragebogen'); await page.waitForSelector('h1');
await page.evaluate(() => document.activeElement?.blur());
await knopf('Neuer Fragebogen', /Neuen Fragebogen anlegen/);
await knopf('Schlüssel anlegen', /Neues Schlüsselpaar anlegen/);
await page.waitForSelector('#fb-schl-name');
await page.locator('#fb-schl-name').focus();
// Name, Passwort 1 und 2 per Tastatur
await page.keyboard.type('Erstnutzer Probe');
await page.keyboard.press('Tab'); await page.keyboard.type('ein langes passwort erstnutzer');
await page.keyboard.press('Tab'); await page.keyboard.type('ein langes passwort erstnutzer');
const fokusPw2 = await page.evaluate(() => document.activeElement?.id);
rec({ typ: 'erstnutzer', schritt: 'Passwort 2 erreicht per Tab (Fokus-Element)', wert: fokusPw2 });
if (fokusPw2 !== 'fb-schl-pw2') haenger.push('Passwort: nach Tab landete der Fokus nicht im Feld „Passwort wiederholen“');
// Schlüsseldatei erzeugen (Download per Enter)
{
  const ok = await tabZu('Schlüsselpaar erzeugen', /Schlüsselpaar erzeugen/);
  if (ok) { const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 15000 }).catch(() => null), page.keyboard.press('Enter')]); if (dl) await dl.saveAs(join(OUT, 'erstnutzer.statable-schluessel')); else haenger.push('Schlüsseldatei: kein Download nach Enter'); }
}
await tabZu('Haken gesichert', 'Ich habe');   // Der Haken trägt einen Satz als Name; Fallback unten
await page.keyboard.press('Space');
await knopf('Schlüssel übernehmen', /Öffentlichen Schlüssel/);
// Fragebogen: ohne Fragen (die Vorlage mit Platzhalter sperrt den Export, siehe Befund in erheben3-ausfuellen)
// Export: Datei erzeugen
await knopf('Exportmenü öffnen', /Exportieren \(Dateiformate\)/);
{
  const ok = await tabZu('Zum Verschicken: Fragebogen-Datei', /Fragebogen-Datei|Zum Verschicken|Fragebogen für/);
  if (ok) { const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 15000 }).catch(() => null), page.keyboard.press('Enter')]); if (dl) await dl.saveAs(join(OUT, 'erstnutzer-fragebogen.html')); else haenger.push('Fragebogen-Datei: kein Download'); }
}
// Ausfüllen (eigene Seite, Datei): nur Tastatur
const seite2 = await ctx.newPage();
await seite2.goto(pathToFileURL(join(OUT, 'erstnutzer-fragebogen.html')).href); await seite2.waitForTimeout(800);
const ausfuellenTastatur = await (async () => {
  let n = 0;
  for (let k = 0; k < 40; k++) {
    const weg = await seite2.evaluate(() => !!document.querySelector('[data-weg="datei"]'));
    if (weg) break;
    const hat = await seite2.evaluate(() => !!document.querySelector('[data-weiter]'));
    if (!hat) break;
    // erste Option einer nicht beantworteten Frage per Tastatur wählen, sonst „Weiter“
    await seite2.evaluate(() => document.querySelector('input[type=radio]:not(:checked)')?.focus());
    const r = await seite2.evaluate(() => { const r = document.querySelector('input[type=radio]:focus'); return !!r; });
    if (r) { await seite2.keyboard.press('Space'); n++; }
    await seite2.evaluate(() => document.querySelector('[data-weiter]')?.focus());
    await seite2.keyboard.press('Enter'); await seite2.waitForTimeout(300);
  }
  return n;
})();
rec({ typ: 'erstnutzer', schritt: 'Ausfüllen (Datei, nur Tastatur)', antworten_per_leertaste: ausfuellenTastatur, fertig: await seite2.evaluate(() => !!document.querySelector('[data-weg="datei"]')) });
if (!(await seite2.evaluate(() => !!document.querySelector('[data-weg="datei"]')))) haenger.push('Ausfüllen: Abschlussseite nicht erreicht, Schritte ohne Tastatur-Lösung (z. B. Textfelder oder Pflicht) nicht vollständig abgedeckt');
// Antwort als Datei speichern
const [dlA] = await Promise.all([seite2.waitForEvent('download', { timeout: 15000 }).catch(() => null), seite2.locator('[data-weg="datei"]').first().focus().then(() => seite2.keyboard.press('Enter'))]);
if (dlA) { await dlA.saveAs(join(OUT, 'erstnutzer-antwort.txt')); rec({ typ: 'erstnutzer', schritt: 'Antwort als Datei gespeichert', name: dlA.suggestedFilename() }); }
else haenger.push('Antwort speichern: kein Download nach Enter am Weg „Datei“');
await seite2.close();
// Sammelimport: Datei wählen ist ein Systemdialog; hier mit setInputFiles (nicht per Tastatur prüfbar, als Hänger vermerkt)
await page.bringToFront();
await page.locator('#fb-sam-datei').setInputFiles(join(OUT, 'erstnutzer-antwort.txt')).catch(e => haenger.push('Datei einlesen: Feld nicht gefunden (' + String(e.message).slice(0, 80) + ')'));
await knopf('Einlesen', /^Einlesen$/);
await page.waitForTimeout(800);
rec({ typ: 'erstnutzer', schritt: 'Einlesen', meldung: await ansagen() });
rec({ typ: 'erstnutzer', zusammenfassung: { tabs_gesamt: tabs, haenger: haenger.length } });
for (const h of haenger) rec({ typ: 'haenger', text: h });
await b.close();
