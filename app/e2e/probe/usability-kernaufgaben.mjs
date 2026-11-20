// Usability Stufe 0 (10.11.): 8 Kernaufgaben als Klickpfade messen (Messlatte vor dem Umbau).
// Zweck: Jede Aufgabe läuft als Liste von Schritten (Klick, Tippen, Taste, Datei wählen) in einem frischen Browserkontext (1366x850, de-DE,
//   Rundgang per localStorage "statable-einst" abgeschaltet). Gezählt werden Klicks, Tastendrücke (Kürzel und Sondertasten), getippte Zeichen
//   (getrennt), Schritte und Seitenwechsel (Änderungen des Adress-Hashes). Je Aufgabe: geschafft ja/nein, Fehlerstelle, Weg in Worten.
//   Vorbereitung (App laden, Beispiel öffnen, Blatt anlegen) zählt nicht, sofern sie als "Ausgangslage" bezeichnet ist; die Ausgangslage steht im Weg.
//   "Einsteiger" = sichtbare Maus-Wege; "Profi" = kürzester Weg mit Kürzeln, Befehlspalette (Strg+K), Befehlsfeld.
// Aufruf (Vorschau auf Port 4300): PORT=4300 node e2e/probe/usability-kernaufgaben.mjs [Aufgabennummer ...]
// Ergebnis: e2e/ergebnisse/usability-kernaufgaben-<Datum>.json und .md
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const U = `http://localhost:${process.env.PORT || 4300}/`;
const DATUM = new Date().toISOString().slice(0, 10) + (process.env.MARKE ? '-' + process.env.MARKE : ''); // MARKE=stufe1-vorher hängt einen Namen an
const AUS = new URL('../ergebnisse/', import.meta.url);
mkdirSync(AUS, { recursive: true });
const nurNr = process.argv.slice(2).map(Number);

// Test-CSV: gruppe (A/B), wert, x (Zahl)
const tmp = mkdtempSync(path.join(tmpdir(), 'statable-usab-'));
const CSV = path.join(tmp, 'kleine-studie.csv');
{
  const z = ['gruppe,wert,x'];
  for (let i = 0; i < 40; i++) { const g = i % 2 ? 'B' : 'A'; z.push(`${g},${(10 + (i * 7) % 11 + (g === 'B' ? 3 : 0)).toString()},${(i * 3) % 17}`); }
  writeFileSync(CSV, z.join('\n') + '\n');
}

class NichtGefunden extends Error {}
class Messung {
  constructor(page) { this.page = page; this.klicks = 0; this.tasten = 0; this.zeichen = 0; this.schritte = []; this.weg = []; }
  async klick(loc, text) { this.letzter = 'Klick: ' + text; await loc.click({ timeout: 10000 }); this.klicks++; this.schritte.push(this.letzter); this.weg.push(text); await this.page.waitForTimeout(500); }
  async taste(key, text) { this.letzter = 'Taste: ' + text; await this.page.keyboard.press(key); this.tasten++; this.schritte.push(this.letzter); this.weg.push(text); await this.page.waitForTimeout(500); }
  async tippe(txt, text) { this.letzter = 'Tippen: ' + text; await this.page.keyboard.type(txt, { delay: 5 }); this.zeichen += txt.length; this.schritte.push(this.letzter); this.weg.push(text); await this.page.waitForTimeout(500); }
  async datei(label, pfad, text) {
    this.letzter = 'Datei: ' + text;
    const [fc] = await Promise.all([this.page.waitForEvent('filechooser', { timeout: 10000 }), label.click({ timeout: 10000 })]);
    this.klicks++; await fc.setFiles(pfad); this.schritte.push(this.letzter); this.weg.push(text); await this.page.waitForTimeout(500);
  }
  async pruefe(bedingung, text) { this.letzter = 'Prüfung: ' + text; await bedingung(); }
  nicht(grund) { throw new NichtGefunden(grund); }
}

async function neuerKontext(b) {
  const ctx = await b.newContext({ locale: 'de-DE', viewport: { width: 1366, height: 850 }, acceptDownloads: true });
  await ctx.addInitScript(() => {
    try { if (!localStorage.getItem('statable-einst')) localStorage.setItem('statable-einst', JSON.stringify({ rundgang: false })); } catch { /* egal */ }
    window.__hc = 0; addEventListener('hashchange', () => window.__hc++);
  });
  try { await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: new URL(U).origin }); } catch { /* egal */ }
  const page = await ctx.newPage(); page.setDefaultTimeout(15000);
  return { ctx, page };
}
const warte = (p, ms = 1000) => p.waitForTimeout(ms);
const seitenwechsel = (p) => p.evaluate(() => window.__hc || 0).catch(() => 0);

// ---------- Ausgangslagen (zählen nicht) ----------
async function startseite(page) { await page.goto(U + '#start'); await warte(page, 1800); await page.evaluate(() => { window.__hc = 0; }); }
async function beispielOffen(page) {
  await startseite(page);
  await page.getByRole('button', { name: 'Beispiel öffnen' }).first().click();
  await page.waitForFunction(() => location.hash.startsWith('#daten'), null, { timeout: 120000 }); await warte(page, 2000);
  await page.evaluate(() => { window.__hc = 0; });
}
async function ttestBlattDa(page) {
  await beispielOffen(page);
  await page.getByRole('link', { name: /Neue Auswertung/ }).first().click(); await warte(page, 800);
  await page.locator('[data-karte="gruppen"]').first().click(); await warte(page, 600);
  await page.locator('label.option', { hasText: 'Konzentration' }).first().click(); await warte(page, 500);
  await page.locator('label.option', { hasText: 'Handy im Bett' }).first().click();
  await page.getByRole('heading', { name: 'Ergebnis' }).first().waitFor({ timeout: 30000 }); await warte(page, 2500);
  await page.evaluate(() => { window.__hc = 0; });
}
async function csvOffen(page) {
  await startseite(page);
  const [fc] = await Promise.all([page.waitForEvent('filechooser'), page.locator('label.k', { hasText: 'Datei auswählen' }).click()]);
  await fc.setFiles(CSV);
  await page.waitForFunction(() => location.hash.startsWith('#daten'), null, { timeout: 60000 }); await warte(page, 2000);
  await page.evaluate(() => { window.__hc = 0; });
}

// ---------- Hilfen in den Aufgaben ----------
async function ergebnisDa(m, muster = /./) {
  await m.page.getByRole('heading', { name: 'Ergebnis' }).first().waitFor({ timeout: 30000 });
}
async function waehleGruppenTtest(m, zahl, gruppe) {
  await m.klick(m.page.locator('[data-karte="gruppen"]').first(), 'Karte „Unterscheiden sich Gruppen? (t-Test …)“');
  await m.klick(m.page.locator('label.option', { hasText: zahl }).first(), `Spalte „${zahl}“ wählen`);
  await m.klick(m.page.locator('label.option', { hasText: gruppe }).first(), `Spalte „${gruppe}“ wählen`);
  await ergebnisDa(m);
}
async function palette(m, suche, text) {
  await m.taste('Control+k', 'Strg+K (Befehlspalette)');
  await m.tippe(suche, `„${suche}“ tippen`);
  await warte(m.page, 800);
  await m.taste('Enter', 'Eingabe (ersten Treffer wählen)');
  await warte(m.page, 800);
}

// ---------- Aufgaben ----------
const AUFGABEN = [
  { nr: 1, titel: 'Beispiel öffnen, erste Auswertung, Satz für die Arbeit kopieren', varianten: {
    Einsteiger: async (m) => {
      const p = m.page; await startseite(p);
      await m.klick(p.getByRole('button', { name: 'Beispiel öffnen' }).first(), 'Startseite: „Beispiel öffnen“');
      await p.waitForFunction(() => location.hash.startsWith('#daten'), null, { timeout: 120000 }); await warte(p, 2000);
      await m.klick(p.getByRole('link', { name: /Neue Auswertung/ }).first(), 'Reiter „Neue Auswertung“');
      await waehleGruppenTtest(m, 'Konzentration', 'Handy im Bett');
      await m.klick(p.locator('.apa-zeile button', { hasText: 'Kopieren' }).first(), '„Kopieren“ bei der APA-Zeile (Für deine Arbeit)');
      const t = await p.evaluate(() => navigator.clipboard.readText());
      if (!/t\(|p\s*=/.test(t)) throw new Error('Zwischenablage ohne APA-Zeile: ' + t.slice(0, 60));
    },
    Profi: async (m) => {
      const p = m.page; await startseite(p);
      await m.klick(p.getByRole('button', { name: 'Beispiel öffnen' }).first(), 'Startseite: „Beispiel öffnen“');
      await p.waitForFunction(() => location.hash.startsWith('#daten'), null, { timeout: 120000 }); await warte(p, 2000);
      await palette(m, 't-Test', 'Befehlspalette: t-Test');
      // Die Pfeiltasten wählen im Auswahlfeld sofort (und rechnen) - ein reiner Tastenweg zu "Konzentration" und "Handy im Bett" führt nicht ans Ziel; Auswahl per Maus.
      await m.klick(p.locator('label.option', { hasText: 'Konzentration' }).first(), 'Spalte „Konzentration“ wählen (Maus)');
      await m.klick(p.locator('label.option', { hasText: 'Handy im Bett' }).first(), 'Spalte „Handy im Bett“ wählen (Maus)');
      await ergebnisDa(m);
      await m.klick(p.locator('.apa-zeile button', { hasText: 'Kopieren' }).first(), '„Kopieren“ (APA-Zeile)');
      const t = await p.evaluate(() => navigator.clipboard.readText());
      if (!/t\(|p\s*=/.test(t)) throw new Error('Zwischenablage ohne APA-Zeile');
    } } },
  { nr: 2, titel: 'Eigene CSV öffnen, Gruppe festlegen, t-Test', varianten: {
    Einsteiger: async (m) => {
      const p = m.page; await startseite(p);
      await m.datei(p.locator('label.k', { hasText: 'Datei auswählen' }), CSV, 'Startseite: „Datei auswählen“, CSV wählen');
      await p.waitForFunction(() => location.hash.startsWith('#daten'), null, { timeout: 60000 }); await warte(p, 2000);
      // Die Spalte "gruppe" (Text A/B) wird von Statable als Gruppe erkannt; ein eigener Schritt "als Gruppe festlegen" war nicht nötig - das prüft der nächste Schritt.
      await m.klick(p.getByRole('link', { name: /Neue Auswertung/ }).first(), 'Reiter „Neue Auswertung“');
      await waehleGruppenTtest(m, 'wert', 'gruppe');
      const txt = await p.locator('#inhalt').innerText();
      if (!/Welch|t-Test/i.test(txt)) throw new Error('kein t-Test im Ergebnis');
    },
    Profi: async (m) => {
      const p = m.page; await startseite(p);
      await m.datei(p.locator('label.k', { hasText: 'Datei auswählen' }), CSV, 'Startseite: „Datei auswählen“, CSV wählen');
      await p.waitForFunction(() => location.hash.startsWith('#daten'), null, { timeout: 60000 }); await warte(p, 2000);
      await m.taste('Alt+4', 'Alt+4 (Reiter Befehle)');
      await m.klick(p.locator('.syntaxfeld textarea').first(), 'ins Befehlsfeld klicken');
      await m.tippe("T-TEST GROUPS=gruppe('A' 'B') /VARIABLES=wert.", 'T-TEST-Befehl tippen');
      await m.taste('Control+Enter', 'Strg+Eingabe (ausführen)');
      await p.getByText(/Group Statistics|Gruppenstatistik|Independent Samples|Test bei unabhängigen/i).first().waitFor({ timeout: 30000 });
    } } },
  { nr: 3, titel: 'Ergebnis in den Bericht, Word herunterladen', varianten: {
    Einsteiger: async (m) => {
      const p = m.page; await ttestBlattDa(p);
      // Ausgangslage: Blatt steht schon "Im Bericht" (Schalter oben rechts ist standardmäßig an).
      await m.klick(p.getByRole('link', { name: 'Bericht' }).first(), 'Reiter „Bericht“');
      const [d] = await Promise.all([p.waitForEvent('download', { timeout: 60000 }), m.klick(p.getByRole('button', { name: /Als Word-Datei/ }).first(), '„Als Word-Datei“')]);
      if (!/\.docx$/i.test(d.suggestedFilename())) throw new Error('Download ist keine .docx: ' + d.suggestedFilename());
    },
    Profi: async (m) => {
      const p = m.page; await ttestBlattDa(p);
      await m.taste('Alt+b', 'Alt+B (Bericht)');
      const [d] = await Promise.all([p.waitForEvent('download', { timeout: 60000 }), (async () => { await m.klick(p.getByRole('button', { name: /Als Word-Datei/ }).first(), '„Als Word-Datei“ (Maus; Tastenweg: Tab-Reihenfolge nicht gemessen)'); })()]);
      if (!/\.docx$/i.test(d.suggestedFilename())) throw new Error('keine .docx');
    } } },
  { nr: 4, titel: 'Profi: Datei öffnen, Regression per Befehl, ohne Maus (nach der Dateiwahl)', varianten: {
    Profi: async (m) => {
      const p = m.page; await startseite(p);
      await m.datei(p.locator('label.k', { hasText: 'Datei auswählen' }), CSV, 'Startseite: „Datei auswählen“, CSV wählen (1 Klick, Dateidialog nicht automatisierbar ohne Maus)');
      await p.waitForFunction(() => location.hash.startsWith('#daten'), null, { timeout: 60000 }); await warte(p, 2000);
      await m.taste('Alt+4', 'Alt+4 (Reiter Befehle)');
      // Ohne Maus: Fokus ins Befehlsfeld per Tab? Erst prüfen, ob das Feld schon den Fokus hat.
      const fokusImFeld = await p.evaluate(() => document.activeElement?.tagName === 'TEXTAREA');
      if (!fokusImFeld) { m.weg.push('Fokus liegt nicht im Befehlsfeld (Hinweis)'); await p.locator('.syntaxfeld textarea').first().focus(); m.weg.push('(Fokus per Skript gesetzt, nicht gezählt: kein dokumentierter Tastenweg ins Befehlsfeld)'); }
      await m.tippe('REGRESSION /DEPENDENT=wert /METHOD=ENTER x.', 'REGRESSION-Befehl tippen');
      await m.taste('Control+Enter', 'Strg+Eingabe (ausführen)');
      await p.getByText(/Coefficients|Koeffizienten|R Square|Model Summary|Modellzusammenfassung/i).first().waitFor({ timeout: 30000 });
    },
    // Stufe 9: derselbe Weg, aber über die Suche statt über Alt+4.
    'Profi Suche': async (m) => {
      const p = m.page; await startseite(p);
      await m.datei(p.locator('label.k', { hasText: 'Datei auswählen' }), CSV, 'Startseite: „Datei auswählen“, CSV wählen (1 Klick, Dateidialog nicht automatisierbar ohne Maus)');
      await p.waitForFunction(() => location.hash.startsWith('#daten'), null, { timeout: 60000 }); await warte(p, 2000);
      await palette(m, 'Befehle', 'Suche: Befehle');
      await warte(p, 800);
      if (!(await p.evaluate(() => location.hash === '#befehle'))) throw new NichtGefunden('Suche „Befehle“ führt nicht zu #befehle');
      const fokusImFeld = await p.evaluate(() => document.activeElement?.tagName === 'TEXTAREA');
      if (!fokusImFeld) { m.weg.push('Fokus liegt nicht im Befehlsfeld (Hinweis)'); await p.locator('.syntaxfeld textarea').first().focus(); m.weg.push('(Fokus per Skript gesetzt, nicht gezählt)'); }
      await m.tippe('REGRESSION /DEPENDENT=wert /METHOD=ENTER x.', 'REGRESSION-Befehl tippen');
      await m.taste('Control+Enter', 'Strg+Eingabe (ausführen)');
      await p.getByText(/Coefficients|Koeffizienten|R Square|Model Summary|Modellzusammenfassung/i).first().waitFor({ timeout: 30000 });
    } } },
  { nr: 5, titel: 'Einsteiger: erste Lerneinheit finden und beginnen', varianten: {
    Einsteiger: async (m) => {
      const p = m.page; await startseite(p);
      await m.klick(p.getByRole('link', { name: 'Lernen' }).first(), 'Kopfzeile: „Lernen“');
      await p.getByRole('heading', { name: 'Lernen' }).first().waitFor();
      // Stufe 6: Ziel ist die erste Einheit von „Statistik von Anfang an 1“ (`#lernen/skalenniveau`), nicht irgendeine Einheit der Themenliste.
      // Weg: „Hier anfangen“ sichtbar → klicken. Sonst (vor Stufe 6) wie eine Einsteigerin: Reiter „Lernpfade“ → Pfad „Statistik von Anfang an 1“ → „Anfangen“.
      const hier = p.getByRole('link', { name: /^Hier anfangen/ }).first();
      if (await hier.count() && await hier.isVisible()) await m.klick(hier, '„Hier anfangen“');
      else {
        await m.klick(p.getByRole('link', { name: 'Lernpfade', exact: true }).first(), 'Reiter „Lernpfade“');
        await m.klick(p.locator('a[href="#lernen/pfad/grundlagen"]').first(), 'Pfad „Statistik von Anfang an 1“');
        await m.klick(p.getByRole('link', { name: /^(Anfangen|Hier anfangen)/ }).first(), '„Anfangen“');
      }
      await p.waitForFunction(() => /^#lernen\/skalenniveau(\/|$)/.test(location.hash), null, { timeout: 15000 }).catch(() => m.nicht('nicht bei der ersten Einheit von „Statistik von Anfang an 1“ gelandet: ' + p.url()));
      await p.getByRole('heading').first().waitFor();
    },
    Profi: async (m) => {
      const p = m.page; await startseite(p);
      await m.taste('Alt+l', 'Alt+L (Lernen)');
      const erste = p.locator('.ln-inhalt ol a[href^="#lernen/"]') /* Stufe 6: links stehen jetzt Pfade und „Eigenen Pfad erstellen“ */.first();
      if (!(await erste.count())) m.nicht('keine Einheit in der Liste gefunden');
      await m.klick(erste, 'erste Einheit der Liste');
      await p.waitForFunction(() => /^#lernen\/[^/]+/.test(location.hash) && !location.hash.startsWith('#lernen/pfad') && !location.hash.startsWith('#lernen/thema'), null, { timeout: 15000 });
    } } },
  { nr: 6, titel: 'Rangtest statt t-Test wählen (Ausgangslage: Beispiel offen; Einsteiger inkl. t-Test-Blatt, Profi ab Blatt)', varianten: {
    Einsteiger: async (m) => {
      const p = m.page; await beispielOffen(p);
      await m.klick(p.getByRole('link', { name: /Neue Auswertung/ }).first(), 'Reiter „Neue Auswertung“');
      await waehleGruppenTtest(m, 'Konzentration', 'Handy im Bett');
      await m.klick(p.locator('label', { hasText: 'Ohne Normalverteilung (Rangtest)' }).first(), '„Ohne Normalverteilung (Rangtest)“');
      await p.getByText(/Mann-Whitney|Rangsumme|Wilcoxon/i).first().waitFor({ timeout: 30000 });
    },
    Profi: async (m) => {
      const p = m.page; await ttestBlattDa(p);
      await m.klick(p.locator('label', { hasText: 'Ohne Normalverteilung (Rangtest)' }).first(), '„Ohne Normalverteilung (Rangtest)“ (Ausgangslage: t-Test-Blatt offen)');
      await p.getByText(/Mann-Whitney|Rangsumme|Wilcoxon/i).first().waitFor({ timeout: 30000 });
    } } },
  { nr: 7, titel: 'Ein Diagramm ohne Logo speichern', varianten: {
    // Stufe 4: neuer Weg über das Diagramm-Menü. Der alte Weg über die Einstellungen bleibt als „Weg alt“ gezählt.
    'Diagramm-Menü': async (m) => {
      const p = m.page; await ttestBlattDa(p);
      const knopf = async () => { const dg = p.locator('.dgx-leiste').first().locator('..').getByRole('button', { name: /Export/ }).first(); return (await dg.count()) ? dg : p.getByRole('button', { name: /Export/ }).first(); };
      await m.klick(await knopf(), 'Diagramm: „Export“');
      const eintrag = p.locator('label.ez-zeile, [role=menuitemcheckbox], [role=menuitem], label').filter({ hasText: 'Statable-Logo klein unten in Diagrammen' }).first();
      await m.klick(eintrag, 'Eintrag „Statable-Logo klein unten in Diagrammen“ anklicken');
      if (!(await p.getByRole('menuitem', { name: /PNG/ }).first().isVisible().catch(() => false))) await m.klick(await knopf(), 'Diagramm: „Export“ (wieder öffnen)');
      const [d] = await Promise.all([p.waitForEvent('download', { timeout: 30000 }), m.klick(p.getByRole('menuitem', { name: /PNG/ }).first(), 'Menüpunkt „PNG (300 dpi, für den Druck)“')]);
      if (!/\.png$/i.test(d.suggestedFilename())) throw new Error('keine PNG: ' + d.suggestedFilename());
    },
    'Weg alt Einsteiger': async (m) => {
      const p = m.page; await ttestBlattDa(p);
      await m.klick(p.getByRole('link', { name: 'Einstellungen' }).first(), 'Kopfzeile: „Einstellungen“ (Zahnrad)');
      const sch = p.locator('label.ez-zeile', { hasText: 'Statable-Logo klein unten in Diagrammen' }).first();
      await m.klick(sch, 'Schalter „Statable-Logo klein unten in Diagrammen“ ausschalten');
      const an = await sch.locator('input').isChecked();
      if (an) throw new Error('Schalter blieb an');
      await m.klick(p.getByRole('link', { name: /Handy im Bett/ }).first(), 'Reiter des Blatts „Handy im Bett …“');
      await p.getByRole('heading', { name: 'Ergebnis' }).first().waitFor();
      const menue = p.locator('.dgx-leiste').first().locator('..').getByRole('button', { name: /Export/ }).first();
      const knopf = (await menue.count()) ? menue : p.getByRole('button', { name: /Export/ }).first();
      await m.klick(knopf, 'Diagramm: „Export“');
      const [d] = await Promise.all([p.waitForEvent('download', { timeout: 30000 }), m.klick(p.getByRole('menuitem', { name: /PNG/ }).first(), 'Menüpunkt „PNG (300 dpi, für den Druck)“')]);
      if (!/\.png$/i.test(d.suggestedFilename())) throw new Error('keine PNG: ' + d.suggestedFilename());
    },
    'Weg alt Profi': async (m) => {
      const p = m.page; await ttestBlattDa(p);
      await m.taste('Alt+o', 'Alt+O (Einstellungen)');
      const sch = p.locator('label.ez-zeile', { hasText: 'Statable-Logo klein unten in Diagrammen' }).first();
      await m.klick(sch, 'Schalter „Statable-Logo …“ ausschalten (Maus; Tastenweg: Tab-Anzahl nicht gemessen)');
      // Befund: Alt+O und Alt+2 wirken nicht, solange der Fokus im Schalter steht (geprüft; Kürzel gelten nicht im Eingabefeld). Darum Maus auf den Reiter.
      await m.klick(p.getByRole('link', { name: /Handy im Bett/ }).first(), 'Reiter des Blatts (Maus; Alt+2/Alt+O wirken mit Fokus im Schalter nicht)');
      await p.getByRole('heading', { name: 'Ergebnis' }).first().waitFor();
      await m.klick(p.locator('.dgx-leiste').first().locator('..').getByRole('button', { name: /Export/ }).first(), 'Diagramm: „Export“');
      const [d] = await Promise.all([p.waitForEvent('download', { timeout: 30000 }), m.klick(p.getByRole('menuitem', { name: /PNG/ }).first(), 'Menüpunkt „PNG“')]);
      if (!/\.png$/i.test(d.suggestedFilename())) throw new Error('keine PNG');
    } } },
  { nr: 8, titel: 'Sprache auf Englisch, Schrift vergrößern', varianten: {
    Einsteiger: async (m) => {
      const p = m.page; await startseite(p);
      // Seit Stufe 1: Schriftgröße, Farben und Sprache stecken im Menü „Ansicht“ (Aa Ansicht ▾).
      await m.klick(p.locator('.ansicht-menue > button').first(), 'Kopfzeile: Menü „Ansicht“');
      await m.klick(p.getByRole('menuitem', { name: /English/ }).or(p.getByRole('option', { name: /English/ })).or(p.getByRole('button', { name: /^English/ })).or(p.getByRole('radio', { name: /English/ })).first(), '„English“ wählen');
      await warte(p, 1500);
      if (!(await p.getByRole('button', { name: /^(Larger|Größer)/ }).first().isVisible())) await m.klick(p.locator('.ansicht-menue > button').first(), 'Menü „Ansicht“ wieder öffnen');
      await m.klick(p.getByRole('button', { name: /^(Larger|Größer)/ }).first(), '„Größer“ (+)');
      const t = await p.evaluate(() => document.querySelector('h1')?.textContent || '');
      const gr = await p.getByRole('button', { name: /^(Larger|Größer)/ }).first().getAttribute('aria-label');
      if (!/Larger/.test(gr || '')) throw new Error('Oberfläche nicht englisch: ' + gr);
      if (!/now 1[1-9]\d|now [2-9]\d\d/.test(gr || '') && !/now 1[1-9]\d ?%/.test(gr || '')) m.weg.push('Hinweis: Größenangabe danach: ' + gr);
    },
    Profi: async (m) => {
      const p = m.page; await startseite(p);
      await palette(m, 'English', 'Befehlspalette: English');
      await warte(p, 1000);
      await palette(m, 'larger', 'Befehlspalette: larger');
      await p.locator('.ansicht-menue > button').first().click();   // nur zum Ablesen, nicht gezählt
      const gr = await p.getByRole('button', { name: /^(Larger|Größer)/ }).first().getAttribute('aria-label');
      if (!/Larger/.test(gr || '')) throw new Error('Oberfläche nicht englisch: ' + gr);
      m.weg.push('Größe danach: ' + gr);
    } } },
  // Stufe 9 (10.11.): „Wo stelle ich die Sprache um?“ über die Suche. Geschafft, wenn danach der Fokus in der Sprachwahl liegt
  // (Menü „Ansicht“, #sprachwahl-feld) - die Sprache selbst wird nicht umgestellt.
  { nr: 9, titel: 'Wo stelle ich die Sprache um? (über die Suche)', varianten: {
    Einsteiger: async (m) => {
      const p = m.page; await startseite(p);
      const k = p.locator('.kopf-suche').first();
      if (!(await k.count())) throw new NichtGefunden('Kein Suchfeld in der Kopfzeile (.kopf-suche)');
      await m.klick(k, 'Kopfzeile: „Suchen …“');
      await m.tippe('Sprache', '„Sprache“ tippen'); await warte(p, 800);
      await m.taste('Enter', 'Eingabe (ersten Treffer wählen)'); await warte(p, 1200);
      await sprachwahlErreicht(m);
    },
    Profi: async (m) => {
      const p = m.page; await startseite(p);
      await palette(m, 'Sprache', 'Suche: Sprache'); await warte(p, 600);
      await sprachwahlErreicht(m);
    } } },
];

async function sprachwahlErreicht(m) {
  const r = await m.page.evaluate(() => ({ fokus: !!document.activeElement?.closest('#sprachwahl-feld'), hash: location.hash, sprache: document.documentElement.lang }));
  m.weg.push(`danach: Fokus in der Sprachwahl ${r.fokus ? 'ja' : 'nein'}, Adresse ${r.hash}, lang=${r.sprache}`);
  if (!r.fokus) throw new NichtGefunden('Sprachwahl nicht erreicht');
}

const b = await chromium.launch();
const ergebnis = { erstellt: new Date().toISOString(), url: U, csv: CSV, aufgaben: [] };
for (const a of AUFGABEN) {
  if (nurNr.length && !nurNr.includes(a.nr)) continue;
  for (const [variante, fn] of Object.entries(a.varianten)) {
    const { ctx, page } = await neuerKontext(b);
    const m = new Messung(page);
    const e = { nr: a.nr, titel: a.titel, variante, geschafft: false, status: 'fehlgeschlagen' };
    try {
      await fn(m);
      e.geschafft = true; e.status = 'geschafft';
    } catch (err) {
      e.status = err instanceof NichtGefunden ? 'nicht gefunden' : 'fehlgeschlagen';
      const hash = await page.evaluate(() => location.hash).catch(() => '?');
      e.fehlerstelle = (m.letzter ?? 'Ausgangslage') + ' | ' + String(err.message || err).split('\n')[0].slice(0, 220) + ' (Adresse: ' + hash + ')';
    }
    e.klicks = m.klicks; e.tasten = m.tasten; e.zeichen = m.zeichen; e.schritte = m.schritte.length; e.seitenwechsel = await seitenwechsel(page);
    e.weg = m.weg.join(' → ');
    ergebnis.aufgaben.push(e);
    console.log(`${a.nr} ${variante.padEnd(10)} ${e.status.padEnd(14)} Klicks ${e.klicks} Tasten ${e.tasten} Zeichen ${e.zeichen} Schritte ${e.schritte} Seitenwechsel ${e.seitenwechsel}${e.fehlerstelle ? '  <- ' + e.fehlerstelle : ''}`);
    await ctx.close();
  }
}
await b.close();

writeFileSync(new URL(`usability-kernaufgaben-${DATUM}.json`, AUS), JSON.stringify(ergebnis, null, 2));
let md = `# Usability Kernaufgaben ${DATUM}\n\nErzeugt von e2e/probe/usability-kernaufgaben.mjs gegen ${U}. Tasten = Kürzel und Sondertasten; Zeichen = getippte Buchstaben (getrennt gezählt).\n\n| Nr | Aufgabe | Variante | geschafft | Klicks | Tasten | Zeichen | Schritte | Seitenwechsel | Weg / Fehlerstelle |\n|---|---|---|---|---|---|---|---|---|---|\n`;
for (const e of ergebnis.aufgaben) md += `| ${e.nr} | ${e.titel} | ${e.variante} | ${e.status} | ${e.klicks} | ${e.tasten} | ${e.zeichen} | ${e.schritte} | ${e.seitenwechsel} | ${e.weg}${e.fehlerstelle ? ' **Fehlerstelle: ' + e.fehlerstelle + '**' : ''} |\n`;
writeFileSync(new URL(`usability-kernaufgaben-${DATUM}.md`, AUS), md);
console.log('Fertig: e2e/ergebnisse/usability-kernaufgaben-' + DATUM + '.json/.md');
