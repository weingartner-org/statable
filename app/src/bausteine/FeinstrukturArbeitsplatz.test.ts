/**
 * Feinstruktur-Arbeitsplatz (F3B1), Prüfplan B1 bis B3: Phase Deuten zeigt kein Zeichen nach der aktuellen Sinneinheit - nirgends im DOM.
 * Läuft im echten Chromium (Playwright) gegen die echte App im Vite-Entwicklungsserver (kein jsdom im Projekt).
 * Daten: das erfundene Beispielinterview der App (Knopf „Beispielinterview laden“ auf der Seite Interviews). Projekt: das erste Beispiel-Projekt der Seite Beispiele (Knopf „Öffnen“ der ersten Karte)
 * (ohne Projekt wird nichts gespeichert; mit Projekt läuft der Autospeicher in die IndexedDB des Browsers, und nach dem Neuladen öffnet „Weiterarbeiten“ es wieder).
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { chromium, type Browser, type Page } from '@playwright/test';
import { createServer, type ViteDevServer } from 'vite';
import { fileURLToPath } from 'node:url';
import { SPALTENSAETZE } from '../lib/feinstruktur-spalten';

const APP = fileURLToPath(new URL('../..', import.meta.url));
/** Textanfang und Wort weiter: am Mac andere Tasten als unter Windows und Linux (Chromium folgt dem System). */
const MAC = process.platform === 'darwin';
const ANFANG = MAC ? 'Meta+ArrowUp' : 'Control+Home';
const WORT_WEITER = MAC ? 'Alt+ArrowRight' : 'Control+ArrowRight';
const wort = (w: string) => w.replace(/[^\p{L}\p{N}'-]+/gu, '');

let browser: Browser, server: ViteDevServer, base = '';
/** Wörter der Seite Interviews ohne geladenes Transkript (Seitentexte, versteckte Hilfe) und der Deutungskarte: gehören nicht zum Ausschnitt. */
let bekannt = new Set<string>();
const woerterAus = (s: string) => (s.match(/[\p{L}\p{N}'-]+/gu) ?? []);
beforeAll(async () => {
  server = await createServer({
    root: APP, logLevel: 'error', cacheDir: 'node_modules/.vite-f3b1-test', optimizeDeps: { noDiscovery: true, include: [] },
    server: { host: '127.0.0.1', port: 4392, strictPort: false, watch: null, proxy: {} }
  });
  await server.listen();
  base = `http://127.0.0.1:${(server.httpServer!.address() as { port: number }).port}`;
  browser = await chromium.launch();
}, 300_000);
afterAll(async () => { await browser?.close(); await server?.close(); }, 60_000);

/** Das ganze DOM als HTML, ohne <style> und <script> (der Entwicklungsserver setzt dort Stile und Kommentare ein; das ist kein Inhalt der Seite). */
const alles = (page: Page) => page.evaluate(() => { const k = document.documentElement.cloneNode(true) as HTMLElement; k.querySelectorAll('style,script').forEach(e => e.remove()); return k.outerHTML; });

/** Wörter (ab 5 Buchstaben, nicht schon in einer Einheit bis k), die erst nach Einheit k (0-basiert) vorkommen. */
function spaeter(einheiten: string[][], k: number, bekannt: Set<string>): string[] {
  const bisher = new Set([...einheiten.slice(0, k + 1).flat().map(wort), ...bekannt]);
  return [...new Set(einheiten.slice(k + 1).flat().map(wort))].filter(w => w.length >= 5 && !bisher.has(w));
}
async function pruefe(page: Page, einheiten: string[][], k: number) {
  const html = await alles(page);
  const funde: string[] = [];
  // Erlaubt: die Frage davor (Kontext, steht vor dem Ausschnitt), Wörter der übrigen Seite (bekannt) und die Texte der Deutungskarte
  const kontext = (await page.locator('.kontext').allInnerTexts()).join(' ').split(/\s+/).map(wort);
  for (const w of spaeter(einheiten, k, new Set([...bekannt, ...kontext]))) {
    const m = new RegExp(String.raw`(?<![\p{L}\p{N}])${w}(?![\p{L}\p{N}])`, 'u').exec(html);
    if (m) funde.push(`„${w}“ bei Einheit ${k + 1}: …${html.slice(Math.max(0, m.index - 120), m.index + w.length + 60).replace(/\s+/g, ' ')}…`);
  }
  expect(funde).toEqual([]);   // kurze Ausgabe statt des ganzen DOM
}

/** Öffnet die App, ein Beispiel-Projekt und auf der Seite Interviews das Beispielinterview; legt eine Analyse über die Beiträge von bis `von + 2` an. */
async function vorbereiten(ansichtText: boolean): Promise<Page> {
  const ctx = await browser.newContext({ locale: 'de-DE' });
  const page = await ctx.newPage();
  await page.addInitScript((a) => { try { localStorage.setItem('statable-feinstruktur-ansicht', a); } catch { /* egal */ } }, ansichtText ? 'text' : 'woerter');
  await page.goto(`${base}/#beispiele`, { timeout: 180_000 });
  await page.getByRole('button', { name: 'Öffnen', exact: true }).first().click({ timeout: 120_000 });
  await page.waitForFunction(() => !location.hash.startsWith('#beispiele'), undefined, { timeout: 240_000 });
  await page.waitForTimeout(3000);
  await page.evaluate(() => { location.hash = 'interviews'; });
  await page.getByRole('button', { name: 'Beispielinterview laden (erfunden)' }).waitFor({ timeout: 120_000 });
  bekannt = new Set([...woerterAus(await alles(page)), ...woerterAus(JSON.stringify(SPALTENSAETZE))]);
  await page.getByRole('button', { name: 'Beispielinterview laden (erfunden)' }).click({ timeout: 120_000 });
  await page.getByRole('button', { name: /^Feinstrukturanalyse beginnen: / }).first().waitFor({ timeout: 120_000 });
  return page;
}
async function analyseAnlegen(page: Page, name: string) {
  // Beispielinterview ist geöffnet; zurück zur Liste und Knopf in der Zeile
  await page.getByRole('button', { name: /^Feinstrukturanalyse beginnen: / }).first().click({ timeout: 120_000 });
  await page.getByRole('heading', { level: 2, name: 'Ausschnitt für die Feinstrukturanalyse wählen' }).waitFor();
  await page.locator('#fe-aus-name').fill(name);
  const von = await page.locator('#fe-aus-von').inputValue();
  const optionen = await page.locator('#fe-aus-bis option').count();
  await page.locator('#fe-aus-bis').selectOption({ index: Math.min(optionen - 1, Number(von) + 2) });
  await page.getByRole('button', { name: 'Feinstrukturanalyse anlegen' }).click();
  await page.getByRole('heading', { level: 2, name: /^Einteilen: Sinneinheiten setzen/ }).waitFor();
}

describe('Feinstruktur-Arbeitsplatz im echten Browser', () => {
  it('B1/B3: Ansicht Wörter - für jede aktuelle Einheit kein späteres Wort im DOM; Einträge, Neuladen, Ansicht-Wahl', async () => {
    const page = await vorbereiten(false);
    await analyseAnlegen(page, 'Probe Wörter');
    expect(await page.getByRole('radio', { name: 'Wörter' }).isChecked()).toBe(true);

    // Wörter lesen und Grenzen mit Tastatur setzen (Wort anklicken = Fokus, dann Enter)
    const ws = await page.locator('[role=option]').allInnerTexts();
    expect(ws.length).toBeGreaterThan(20);
    const grenzen = [4, 9, 14, 20].filter(g => g < ws.length - 1);
    await page.locator('[role=option]').first().focus();
    let pos = 0;
    for (const g of grenzen) { while (pos < g) { await page.keyboard.press('ArrowRight'); pos++; } await page.keyboard.press('Enter'); }
    const stellen = [0, ...grenzen, ws.length];
    const einheiten = stellen.slice(0, -1).map((v, i) => ws.slice(v, stellen[i + 1]));
    const n = einheiten.length;
    await page.getByRole('heading', { level: 3, name: `Eingeteilte Sinneinheiten (${n})` }).waitFor();
    expect(await page.getByRole('listitem').filter({ hasText: einheiten[0]![0]! }).count()).toBeGreaterThan(0);

    // Deuten ohne Forschungsfrage geht nicht
    await page.getByRole('button', { name: 'Einteilung fertig, mit dem Deuten beginnen' }).click();
    await page.locator('#fe-frage-fehler').waitFor();
    await page.locator('#fe-frage').fill('Wie erzählt die Person über ihren Weg?');
    await page.getByRole('button', { name: 'Einteilung fertig, mit dem Deuten beginnen' }).click();

    for (let k = 0; k < n; k++) {
      await page.getByRole('heading', { level: 2, name: new RegExp(`^Deuten: Sinneinheit ${k + 1} von ${n}$`) }).waitFor();
      if (k < n - 1) await pruefe(page, einheiten, k);
      // F3c: Gruppenmodus an einem Gerät - nur die aktuelle Einheit, große Schrift, Name freiwillig; nichts Späteres im DOM
      if (k === 1) {
        await page.getByRole('button', { name: 'Gruppenmodus (für den Beamer)' }).click();
        expect(await page.getByRole('button', { name: 'Gruppenmodus (für den Beamer)' }).getAttribute('aria-pressed')).toBe('true');
        expect(await page.getByRole('heading', { level: 3, name: 'Bisherige Sinneinheiten' }).count()).toBe(0);
        expect(await page.getByRole('heading', { level: 3, name: 'Sinneinheit 2', exact: true }).count()).toBe(1);
        await page.getByLabel('Wer trägt gerade ein? (freiwillig)').fill('Person-Ana');
        await pruefe(page, einheiten, k);
      }
      // je Karte: ein Eintrag in zwei Spalten und zwei Lesarten
      await page.locator(`#fe-k${k}-paraphrase-neu`).fill(`Paraphrase-${k}`);
      await page.getByRole('button', { name: 'Paraphrase hinzufügen' }).click();
      await page.locator(`#fe-k${k}-intentionen-neu`).fill(`Intention-${k}`);
      await page.getByRole('button', { name: 'Intention hinzufügen' }).click();
      for (const a of ['a', 'b']) {
        await page.locator(`#fe-k${k}-latent-neu`).fill(`Lesart-${k}${a}`);
        await page.locator(`#fe-k${k}-latent-neu-pruef`).fill(`Prüfung-${k}${a}`);
        await page.getByRole('button', { name: 'Lesart hinzufügen' }).click();
      }
      expect(await page.getByRole('button', { name: 'Lesart 2 löschen' }).count()).toBeGreaterThanOrEqual(1);
      // F3B2: Lesarten der vorigen Einheit prüfen (a hält, b verworfen); keine Vorauswahl durch Statable
      if (k >= 1) {
        expect(await page.getByRole('heading', { level: 3, name: 'Lesarten prüfen' }).count()).toBe(1);
        expect(await page.locator(`input[type=radio][name^="fe-lp-${k}-"]:checked`).count()).toBe(0);
        for (const [a, st, w] of [['a', 'haelt', 'hält'], ['b', 'verworfen', 'verworfen']] as const) {
          await page.getByRole('group', { name: `Stand von Lesart ${k}.${a === 'a' ? 1 : 2} an Sinneinheit ${k + 1}` }).getByRole('radio', { name: w }).check();
          await page.getByRole('button', { name: `Stand von Lesart ${k}.${a === 'a' ? 1 : 2} festhalten` }).click();
          void st;
        }
        expect(await page.locator('.weg li').filter({ hasText: `Lesart-${k - 1}b` }).count()).toBe(1);
      }
      if (k === 1) {
        expect(await page.getByRole('textbox', { name: 'Paraphrase 1 (Person-Ana)' }).count()).toBe(1);
        await pruefe(page, einheiten, k);
        await page.getByRole('button', { name: 'Gruppenmodus (für den Beamer)' }).click();
        expect(await page.getByRole('heading', { level: 3, name: 'Bisherige Sinneinheiten' }).count()).toBe(1);
      }
      // F3B2: Zwischenreflexion nach Einheit 4 als Angebot (freiwillig)
      if (k === 4) {
        await page.getByRole('heading', { level: 3, name: 'Zwischenreflexion nach Sinneinheit 4 (freiwillig)' }).waitFor();
        await page.getByLabel('Welche Begriffe und Spuren behalten Sie im Auge?').fill('Reflexion-Begriffe');
        await page.getByRole('button', { name: 'Zwischenreflexion speichern' }).click();
      }
      if (k < n - 1) await pruefe(page, einheiten, k);   // auch nach dem Schreiben noch nichts Späteres
      await page.getByRole('button', { name: 'Einheit fertig, weiter' }).click();
      if (k < n - 1) { await page.getByRole('heading', { level: 2, name: new RegExp(`^Deuten: Sinneinheit ${k + 2} von ${n}$`) }).waitFor(); await pruefe(page, einheiten, k + 1); }
    }
    await page.getByRole('heading', { level: 2, name: 'Alle Sinneinheiten gedeutet' }).waitFor();
    const ende = await alles(page);
    for (const e of einheiten) expect(ende).toContain(wort(e[e.length - 1]!));
    expect(ende).toContain('Lesart-0a');
    // F3B2: Übersicht als echte Tabelle, verworfene Lesarten sichtbar; Zwischenfazit mit Satzanfang und Textstelle
    await page.getByRole('table', { name: `Übersicht aller ${n} Sinneinheiten` }).waitFor();
    expect(await page.getByRole('columnheader').count()).toBeGreaterThanOrEqual(8);
    expect(await page.locator('table .stand.weg').count()).toBeGreaterThanOrEqual(1);
    expect(ende).toContain('Reflexion-Begriffe');
    await page.getByRole('button', { name: /^Satzanfang einsetzen/ }).click();
    await page.locator('#fe-zf-neu').press('End');
    await page.keyboard.type('Muster-Eins.');
    await page.getByRole('button', { name: 'Deutungsmuster hinzufügen' }).click();
    await page.getByLabel('Sinneinheit für Deutungsmuster 1').selectOption({ index: 2 });
    await page.getByRole('button', { name: 'Textstelle einfügen' }).click();
    await page.locator('#fe-zf-bezug').fill('Bezug-Eins');
    expect(await page.locator('.zf ol.muster li ul li').count()).toBe(1);
    expect(await page.locator('#fe-zf-m-' + '' ).count()).toBe(0);
    // F3c: Ergebnis aufbereiten - Schlüsselentscheidungen, Methodenanhang, Word
    await page.getByRole('heading', { level: 3, name: 'Ergebnis aufbereiten' }).waitFor();
    await page.locator('#fe-se').fill('Schlüssel-Eins');
    expect(await page.getByText(`in ${n} Sinneinheiten eingeteilt`).count()).toBe(1);
    const [laden] = await Promise.all([page.waitForEvent('download', { timeout: 60_000 }), page.getByRole('button', { name: 'Word-Datei speichern' }).click()]);
    expect(laden.suggestedFilename()).toMatch(/Feinstrukturanalyse.docx$/);

    // Neuladen: Ansicht-Wahl und Analyse sind noch da
    await page.getByRole('radio', { name: 'Text' }).count();   // (nur in Phase Einteilen sichtbar; Wahl steht im Speicher)
    expect(await page.evaluate(() => localStorage.getItem('statable-feinstruktur-ansicht'))).toBe('woerter');
    await page.waitForTimeout(1500);   // Autospeicher (400 ms Zeitgeber) abwarten
    await page.goto(`${base}/`, { timeout: 180_000 });
    await page.getByRole('button', { name: /^Weiterarbeiten an/ }).click({ timeout: 120_000 });
    await page.waitForTimeout(3000);
    await page.evaluate(() => { location.hash = 'interviews'; });
    await page.getByRole('button', { name: /^Öffnen: Probe Wörter$/ }).click({ timeout: 120_000 });
    await page.getByRole('heading', { level: 2, name: 'Alle Sinneinheiten gedeutet' }).waitFor({ timeout: 60_000 });
    expect(await alles(page)).toContain('Lesart-0a');
    expect(await alles(page)).toContain(`Paraphrase-${n - 1}`);
    expect(await page.locator('.zf textarea').first().inputValue()).toBe('Nach diesem Ausschnitt deutet sich an, dass Muster-Eins.');
    expect(await page.locator('#fe-zf-bezug').inputValue()).toBe('Bezug-Eins');
    expect(await page.locator('#fe-se').inputValue()).toBe('Schlüssel-Eins');
    expect(await alles(page)).toContain('Reflexion-Begriffe');
    // Solange der Arbeitsplatz offen ist, steht kein anderer Abschnitt der Seite da
    expect(await page.getByRole('heading', { level: 2, name: /^Transkripte/ }).count()).toBe(0);
    await page.context().close();
  }, 400_000);

  it('B1: Ansicht Text - Enter im gesperrten Feld setzt Grenzen; nichts Späteres im DOM; Rückfrage ohne Fenster', async () => {
    const page = await vorbereiten(true);
    await analyseAnlegen(page, 'Probe Text');
    expect(await page.getByRole('radio', { name: 'Text' }).isChecked()).toBe(true);
    const gesamt = await page.locator('#fe-feld').inputValue();
    const ws = gesamt.split(/\s+/).filter(Boolean);
    const feld = page.locator('#fe-feld');
    await feld.focus();
    await page.keyboard.press(ANFANG);
    const schritte = [4, 5, 5];
    const grenzen: number[] = []; let pos = 0;
    for (const st of schritte) {
      for (let i = 0; i < st; i++) { await page.keyboard.press(WORT_WEITER); pos++; }
      await page.keyboard.press('Enter'); grenzen.push(pos);
    }
    // Tippen verändert den Text nicht
    await page.keyboard.type('xyz');
    expect(await feld.inputValue()).toBe(gesamt);
    const stellen = [0, ...grenzen, ws.length];
    const einheiten = stellen.slice(0, -1).map((v, i) => ws.slice(v, stellen[i + 1]));
    const n = einheiten.length;
    await page.getByRole('heading', { level: 3, name: `Eingeteilte Sinneinheiten (${n})` }).waitFor();

    await page.locator('#fe-frage').fill('Wie wird der Weg erzählt?');
    await page.getByRole('button', { name: 'Einteilung fertig, mit dem Deuten beginnen' }).click();
    await page.getByRole('heading', { level: 2, name: new RegExp(`^Deuten: Sinneinheit 1 von ${n}$`) }).waitFor();
    await pruefe(page, einheiten, 0);
    await page.locator('#fe-k0-paraphrase-neu').fill('Paraphrase-0');
    await page.getByRole('button', { name: 'Paraphrase hinzufügen' }).click();
    await page.getByRole('button', { name: 'Einheit fertig, weiter' }).click();
    await page.getByRole('heading', { level: 2, name: new RegExp(`^Deuten: Sinneinheit 2 von ${n}$`) }).waitFor();
    await pruefe(page, einheiten, 1);
    expect(await page.locator('textarea[id=fe-feld]').count()).toBe(0);
    expect(await page.locator('[role=listbox]').count()).toBe(0);

    // Zurück zum Einteilen: Rückfrage als Text mit zwei Knöpfen, kein Dialog
    await page.getByRole('button', { name: 'Zurück zum Einteilen' }).click();
    await page.locator('#fe-zurueck-t').waitFor();
    expect(await page.locator('dialog[open]').count()).toBe(0);
    await page.getByRole('button', { name: 'Nicht ändern' }).click();
    await page.getByRole('heading', { level: 2, name: new RegExp(`^Deuten: Sinneinheit 2 von ${n}$`) }).waitFor();
    await pruefe(page, einheiten, 1);
    await page.getByRole('button', { name: 'Zurück zum Einteilen' }).click();
    await page.getByRole('button', { name: 'Zurück zum Einteilen' }).last().click();
    await page.getByRole('heading', { level: 2, name: /^Einteilen: Sinneinheiten setzen/ }).waitFor();

    // Grenze nach einer gedeuteten Einheit löschen: Rückfrage als Text
    await page.getByRole('radio', { name: 'Wörter' }).check();
    await page.locator('[role=option].grenze').first().focus();   // das erste Wort der zweiten Einheit: davor liegt die gedeutete Einheit 1
    await page.keyboard.press('Enter');
    await page.locator('#fe-rueck-t').waitFor();
    expect(await page.locator('dialog[open]').count()).toBe(0);
    expect(await page.locator('#fe-rueck-t').innerText()).toContain('schon gedeutet');
    await page.getByRole('button', { name: 'Grenze ändern' }).click();
    await page.getByRole('heading', { level: 3, name: `Eingeteilte Sinneinheiten (${n - 1})` }).waitFor();
    expect(await page.evaluate(() => localStorage.getItem('statable-feinstruktur-ansicht'))).toBe('woerter');
    await page.context().close();
  }, 400_000);

  // Stufe A4 (Prüfplan Ausbau A-B14): „nicht vorauslesen“ gilt mit jedem Spaltensatz; mit „Folgetext verdecken“ aus steht der ganze Ausschnitt da
  for (const [satz, spalte, feld] of [[/^IPA/, 'Beschreibend', 'ipa-beschreibend'], [/^Eine freie Spalte/, 'Deutung', 'frei-deutung']] as const) {
    it(`B1 mit Spaltensatz ${spalte === 'Deutung' ? 'frei' : 'IPA'}: Karte mit den Spalten des Satzes, kein späteres Wort im DOM; Folgetext aus zeigt alles`, async () => {
      const page = await vorbereiten(false);
      await page.getByRole('button', { name: /^Feinstrukturanalyse beginnen: / }).first().click({ timeout: 120_000 });
      await page.getByRole('heading', { level: 2, name: 'Ausschnitt für die Feinstrukturanalyse wählen' }).waitFor();
      await page.locator('#fe-aus-name').fill(`Probe ${spalte}`);
      const von = await page.locator('#fe-aus-von').inputValue();
      const optionen = await page.locator('#fe-aus-bis option').count();
      await page.locator('#fe-aus-bis').selectOption({ index: Math.min(optionen - 1, Number(von) + 2) });
      await page.getByRole('radio', { name: satz }).check();
      expect(await page.getByRole('checkbox', { name: /^Folgetext verdecken/ }).isChecked()).toBe(true);
      await page.getByRole('button', { name: 'Sequenzanalyse anlegen' }).click();
      await page.getByRole('heading', { level: 2, name: /^Einteilen: Sinneinheiten setzen/ }).waitFor();
      const ws = await page.locator('[role=option]').allInnerTexts();
      const grenzen = [4, 9, 14].filter(g => g < ws.length - 1);
      await page.locator('[role=option]').first().focus();
      let pos = 0;
      for (const g of grenzen) { while (pos < g) { await page.keyboard.press('ArrowRight'); pos++; } await page.keyboard.press('Enter'); }
      const stellen = [0, ...grenzen, ws.length];
      const einheiten = stellen.slice(0, -1).map((v, i) => ws.slice(v, stellen[i + 1]));
      const n = einheiten.length;
      await page.locator('#fe-frage').fill('Wie?');
      await page.getByRole('button', { name: 'Einteilung fertig, mit dem Deuten beginnen' }).click();
      for (let k = 0; k < n - 1; k++) {
        await page.getByRole('heading', { level: 2, name: new RegExp(`^Deuten: Sinneinheit ${k + 1} von ${n}$`) }).waitFor();
        expect(await page.getByRole('heading', { level: 3, name: spalte, exact: true }).count()).toBe(1);
        expect(await page.getByRole('heading', { level: 3, name: 'Paraphrase', exact: true }).count()).toBe(0);
        await pruefe(page, einheiten, k);
        await page.locator(`#fe-k${k}-${feld}-neu`).fill(`Notiz-${k}`);
        await page.locator(`#fe-k${k}-${feld}-neu`).press('Enter');
        await pruefe(page, einheiten, k);
        await page.getByRole('button', { name: 'Einheit fertig, weiter' }).click();
      }
      // Folgetext verdecken aus (beim Einteilen umschaltbar): dann steht der ganze Ausschnitt beim Deuten da
      await page.getByRole('heading', { level: 2, name: new RegExp(`^Deuten: Sinneinheit ${n} von ${n}$`) }).waitFor();
      await page.getByRole('button', { name: 'Zurück zum Einteilen' }).click();
      await page.getByRole('button', { name: 'Zurück zum Einteilen' }).last().click();
      await page.getByRole('heading', { level: 2, name: /^Einteilen: Sinneinheiten setzen/ }).waitFor();
      await page.locator('summary', { hasText: 'Spalten der Deutung und Folgetext verdecken' }).click();
      await page.getByRole('checkbox', { name: /^Folgetext verdecken/ }).uncheck();
      await page.getByRole('button', { name: 'Einteilung fertig, mit dem Deuten beginnen' }).click();
      await page.locator('.ganz').waitFor();
      const ganz = await page.locator('.ganz').innerText();
      expect(ganz).toContain(wort(einheiten[n - 1]![einheiten[n - 1]!.length - 1]!));
      await page.context().close();
    }, 400_000);
  }
});
