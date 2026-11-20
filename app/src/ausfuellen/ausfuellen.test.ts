/**
 * Paket 2B: Fragetypen-Bibliothek (`app/src/ausfuellen/`), Prüfer-Tests (rot, bevor die Bibliothek gebaut ist).
 *
 * TESTUMGEBUNG: Im Projekt gibt es weder jsdom noch happy-dom (vitest: environment node). Darum laufen diese Tests in einem echten Chromium (Playwright aus app/node_modules):
 * `testhilfe.ts` baut die Bibliothek mit vite (IIFE, global `Ausfuellen`) und lädt sie in eine leere Seite. Rollen und zugängliche Namen kommen vom Browser (`getByRole`).
 * Fehlt `src/ausfuellen/index.ts`, scheitert der Bau in `beforeAll`; jeder Test meldet das als Fehler (rot), die Datei lässt sich trotzdem laden.
 *
 * ============================== FESTLEGUNGEN (gelten für den Bauer wörtlich) ==============================
 * Dateien:   src/ausfuellen/index.ts (Einstieg, exportiert alles Unten), texte.ts, weitere frei. KEIN Svelte, KEIN Import aus ../lib außer `fragebogenplan-bedingung`
 *            (zeigen, Typ Antworten) und `import type` aus ../lib/fragebogenplan (der Rest von fragebogenplan.ts zieht Svelte und xlsx nach).
 * Signaturen (alle Texte `Lok`; Beschriftung = lok[sprache]):
 *   zeichneSeite(plan: FragebogenPlan, seite: Seite, antworten: Antworten, optionen: Optionen): HTMLElement
 *   liesAntworten(wurzel: HTMLElement): Antworten                       liest NUR aus dem DOM der Wurzel; nicht gezeigte Fragen fehlen
 *   pruefeSeite(plan, seite, antworten: Antworten, sprache = 'de', modus: Modus = 'ausfuellen'): SeitenFehler[]     SeitenFehler = { id: string; text: string }   (id = Frage-/Block-id)
 *   fokussiereSeitentitel(wurzel): void                                  Fokus auf die Seitenüberschrift (Aufruf nach Seitenwechsel durch den Aufrufer)
 *   texte: Record<'de' | 'en', Record<Schluessel, string>>               t(sprache, schluessel, werte?: Record<string, string | number>): string   ({n}-Platzhalter ersetzen)
 *   interface Optionen { sprache: string; eng: boolean; modus: 'ausfuellen' | 'eingabe' | 'vorschau';
 *       beiAenderung?(antworten: Antworten, frageId: string): void       nach jeder Änderung; `antworten` = übergebene Antworten + aktueller Stand dieser Seite
 *       beiWeiter?(antworten: Antworten): void                           nur wenn pruefeSeite keine Fehler liefert
 *       beiZurueck?(): void
 *       ansage?(text: string): void                                      zusätzlicher Spiegel der Ansage (Statable hängt hier die gemeinsame Region an)
 *       bildUrl?(datei: string): string }                                src des <img>
 * Antworten (Schlüssel = Element-id): einfach → Code (number); mehrfach → number[] der Codes in Listenreihenfolge; zahl/regler → number; text/datum → string (Datum ISO JJJJ-MM-TT);
 *   Block → je Item-id der Code; rangfolge → number[] der Codes in der gewählten Reihenfolge (erst nach der ersten Änderung; unberührt = kein Schlüssel); einwilligung → 1 (nicht angekreuzt = kein Schlüssel).
 *   Leere Eingaben = kein Schlüssel (nie null oder '').
 * DOM (Wurzel = <section lang=Sprache data-modus=Modus data-seite=Seiten-id>), Reihenfolge: <h2 tabindex="-1"> Seitentitel (seite.titel, sonst plan.titel) ·
 *   Fortschritt (nur wenn plan.einstellungen.fortschritt) · [data-fehlerliste] (nur nach fehlgeschlagenem „Weiter“) · Elemente · [data-ansage] · Knöpfe Zurück / Weiter.
 *   Jede Frage/jeder Block in einem Behälter mit [data-frage="<id>"] (Hinweis: [data-hinweis="<id>"]).
 *   Fortschritt: Text „Seite n von m“ (n = Platz unter den GEZEIGTEN Seiten, m = Zahl der gezeigten Seiten; Seiten mit wennGezeigt falsch zählen nicht).
 *   Ansage-Region: genau ein [data-ansage] mit role="status" (aria-live polite), immer im DOM.
 *   Pflicht: sichtbares Wort t('pflicht') INNERHALB von legend/label/caption der Frage; `required` oder aria-required="true" an Eingabe(n) oder Gruppe.
 *   Hilfe: <p id> im Behälter, aria-describedby am fieldset (Gruppen) bzw. am input (Einzelfelder), bei Block am table.
 *   Einwilligung: fieldset/legend = Fragetext, darin ein Kontrollkästchen mit Beschriftung t('ichStimmeZu').
 *   Block Rechner: table > caption (Blocktext) · th[scope=col] je Stufe (die Eckzelle ist KEIN th[scope=col]) · th[scope=row] je Item · je Zelle radio, Name je Zeile gleich/zwischen Zeilen verschieden,
 *     aria-labelledby = [id der Zeilenkopfzelle, id der Spaltenkopfzelle] (der Browser macht daraus „<Item> <Stufe>“; ein Doppelpunkt ist erlaubt, nicht verlangt).
 *   Block eng:  <h3> mit Blocktext, je Item ein <fieldset><legend>Itemtext</legend> + radios; keine table.
 *   Regler:     fieldset/legend = Fragetext; input[type=range] (min/max aus zahl) mit aria-valuetext „{wert} von {max}“ (mit Liste: + „, Optionstext“) und input[type=number] mit label t('zahlfeld');
 *               das Zahlfeld ist die Wahrheit: unberührt leer, liesAntworten liest es; Regler bewegen schreibt ins Zahlfeld, Zahlfeld ändern setzt den Regler und aria-valuetext.
 *   Rangfolge:  fieldset/legend, <ol> mit je <li> Text + zwei <button type=button> mit aria-label t('nachOben'/'nachUnten', {option}); an den Enden aria-disabled="true" (nicht `disabled`);
 *               nach Klick: Reihenfolge im DOM geändert, Fokus bleibt auf dem gedrückten Knopf (dieselbe Beschriftung), Ansage t('platz', {option, platz, gesamt}).
 *   Mehrfach:   ausschliessende Option wählen hebt alle anderen auf und umgekehrt; Ansage t('andereAufgehoben').
 *   Filter:     nicht gezeigte Elemente (zeigen(el, antworten, plan) mit aktuellem Stand) sind NICHT im DOM; Einblenden fügt an der richtigen Stelle ein, Ansage t('neueFrage'), Fokus unverändert.
 *   Fehler:     Klick auf „Weiter“ (button, Text t('weiter')) ruft pruefeSeite; bei Fehlern: [data-fehlerliste] mit role="alert" und tabindex="-1" bekommt den Fokus, enthält t('fehlerZusammenfassung',{n}),
 *               je Fehler ein <a href="#…"> (Klick setzt den Fokus auf die erste Eingabe der Frage, nicht nur Sprung); an der Frage: Fehlertext mit id, am (an den) fehlerhaften Eingabeelement(en)
 *               aria-invalid="true" + aria-describedby (enthält die Fehler-id). Fehlertext der Frage hat KEIN role="alert". Wird die Frage beantwortet, verschwinden aria-invalid und Fehlertext.
 *               Ohne Fehler: beiWeiter(antworten). „Zurück“ (t('zurueck')) nur wenn einstellungen.zurueck UND nicht die erste gezeigte Seite; Klick → beiZurueck().
 *   modus 'eingabe' (Papier eingeben): pruefeSeite überspringt Pflicht (leere Papierfelder sind echte Daten), `gueltig` bleibt; sonst gleich. 'vorschau': gleich wie 'ausfuellen'.
 * Größe: gebündelt, unkomprimiert < 80 KB (Ziel 60 KB); kein „svelte“ und nichts aus lib/sitzung im Bündel.
 * Nicht von diesen Tests geprüft (nicht festgelegt): Gestaltung, Zufallsreihenfolge, Frage-Bilder, `anders`, Pretest-Kommentar, Zählung der Rangfolge ohne Änderung.
 * ============================================================================================================
 */
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { chromium, type Browser, type Page } from '@playwright/test';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import type { Antwortliste, Bedingung, Block, Element, Frage, FragebogenPlan, Hinweis, Lok, Seite } from '../lib/fragebogenplan';
import { ORDNER, baueBibliothek, oeffneSeite, zeichne, lies, ansage } from './testhilfe';

/* ------------------------------------------------------------------ Aufbau */
let browser: Browser | null = null;
let code = '';
let bauFehler: unknown = null;
const offen: Page[] = [];

beforeAll(async () => {
  try { code = await baueBibliothek(); } catch (e) { bauFehler = e; }
  browser = await chromium.launch();
}, 300_000);   // Opus 08.11. (Stufe 3): nur das Zeitlimit erhöht - Bau und Chromium brauchen unter der Last der vollen Suite länger als 2 Minuten
afterAll(async () => { await browser?.close(); }, 60_000);   // Aufräumen (Browser, Server) braucht unter der Last der vollen Suite länger als 10 s
afterEach(async () => { while (offen.length) await offen.pop()!.close(); });

/** Neue Seite mit geladener Bibliothek; wirft, solange die Bibliothek nicht gebaut werden kann (= rot). */
async function neu(sprache = 'de'): Promise<Page> {
  if (bauFehler) throw new Error(`Bibliothek nicht gebaut: ${bauFehler instanceof Error ? bauFehler.message : String(bauFehler)}`);
  const p = await oeffneSeite(browser!, code, sprache);
  offen.push(p);
  return p;
}

/* ------------------------------------------------------------------ Fixtures */
const zw = (de: string, en = de + ' (en)'): Lok => ({ de, en });
const opt = (liste: string, wert: number, de: string, extra: object = {}) => ({ id: `${liste}:${wert}`, wert, text: zw(de), ...extra });
const l5: Antwortliste = { id: 'l5', name: 'l5', geordnet: true, optionen: [1, 2, 3, 4, 5].map(i => opt('l5', i, `Stufe ${i}`)) };
const farben: Antwortliste = { id: 'farben', name: 'farben', geordnet: false, optionen: [opt('farben', 1, 'Rot'), opt('farben', 2, 'Grün'), opt('farben', 3, 'Blau')] };
const medien: Antwortliste = { id: 'medien', name: 'medien', geordnet: false,
  optionen: [opt('medien', 1, 'Zeitung'), opt('medien', 2, 'Radio'), opt('medien', 3, 'Internet'), opt('medien', 4, 'Nichts davon', { ausschliessend: true })] };
const prio: Antwortliste = { id: 'prio', name: 'prio', geordnet: false,
  optionen: [opt('prio', 1, 'Familie'), opt('prio', 2, 'Arbeit'), opt('prio', 3, 'Freizeit'), opt('prio', 4, 'Gesundheit'), opt('prio', 5, 'Geld')] };

const frage = (id: string, typ: Frage['typ'], extra: Partial<Frage> = {}): Frage =>
  ({ art: 'frage', id, name: id, typ, text: zw(`Frage ${id}`), kodebuch: { niveau: 'nominal' }, ...extra });
const seite = (id: string, elemente: Element[], extra: Partial<Seite> = {}): Seite => ({ art: 'seite', id, name: id, titel: zw(`Titel ${id}`), elemente, ...extra });
const plan = (seiten: Seite[], extra: Partial<FragebogenPlan> = {}): FragebogenPlan => ({
  format: 'statable-fragebogen', version: 1, id: 'p-1', revision: 1, titel: zw('Umfrage'), sprachen: ['de', 'en'],
  einstellungen: { fortschritt: true, zurueck: true, pretest: false, fehlendFilter: 'code' },
  antwortlisten: [l5, farben, medien, prio], skalen: [], elemente: seiten, geaendert: 1, ...extra });
const block = (extra: Partial<Block> = {}): Block => ({ art: 'block', id: 'B', name: 'B', text: zw('Wie sehr stimmen Sie zu?'), liste: 'l5', kodebuch: { niveau: 'ordinal' },
  items: [{ id: 'B1', name: 'b1', text: zw('Item 1') }, { id: 'B2', name: 'b2', text: zw('Item 2') }, { id: 'B3', name: 'b3', text: zw('Item 3') }], ...extra });
const hinweis = (id: string, extra: Partial<Hinweis> = {}): Hinweis => ({ art: 'hinweis', id, name: id, text: zw(`Hinweis ${id}`), ...extra });

const einfach = frage('F1', 'einfach', { text: zw('Welche Farbe?'), hilfe: zw('Bitte eine Farbe wählen.'), liste: 'farben' });
const mehrfach = frage('F2', 'mehrfach', { text: zw('Welche Medien nutzen Sie?'), liste: 'medien' });
const P = plan([
  seite('s-einfach', [einfach]),
  seite('s-mehrfach', [mehrfach]),
  seite('s-felder', [
    frage('Z', 'zahl', { text: zw('Wie alt sind Sie?'), hilfe: zw('In ganzen Jahren.'), zahl: { min: 0, max: 120, ganz: true, einheit: zw('Jahre') }, kodebuch: { niveau: 'skala' } }),
    frage('T', 'text', { text: zw('Ihr Beruf?'), text_: { mehrzeilig: false, maxZeichen: 50 } }),
    frage('T2', 'text', { text: zw('Anmerkungen?'), text_: { mehrzeilig: true } }),
    frage('D', 'datum', { text: zw('Geburtsdatum?') }),
  ]),
  seite('s-regler', [frage('R', 'regler', { text: zw('Wie zufrieden?'), zahl: { min: 1, max: 7, schritt: 1, ganz: true }, hilfe: zw('1 = gar nicht, 7 = sehr') })]),
  seite('s-regler-liste', [frage('RL', 'regler', { text: zw('Zufriedenheit'), liste: 'l5', zahl: { min: 1, max: 5, ganz: true } })]),
  seite('s-rang', [frage('RG', 'rangfolge', { text: zw('Was ist Ihnen wichtig?'), hilfe: zw('Ordnen Sie von wichtig nach unwichtig.'), liste: 'prio' })]),
  seite('s-einw', [frage('E', 'einwilligung', { text: zw('Ich habe die Information gelesen.'), pflicht: { an: true } })]),
  seite('s-block', [block({ hilfe: zw('Eine Antwort je Zeile.') })]),
  seite('s-block-pflicht', [block({ pflicht: { an: true } })]),
  seite('s-pflicht', [
    frage('P1', 'einfach', { text: zw('Pflichtfrage eins'), liste: 'farben', pflicht: { an: true } }),
    frage('P2', 'zahl', { text: zw('Pflichtfrage zwei'), zahl: { min: 0, max: 99, ganz: true }, pflicht: { an: true } }),
    frage('P3', 'text', { text: zw('Freiwillig') }),
  ]),
  seite('s-gueltig', [frage('G', 'zahl', { text: zw('Alter'), zahl: { min: 0, max: 120, ganz: true }, gueltig: { regel: { frage: 'G', ist: '≥', wert: 16 }, meldung: zw('Mindestens 16 Jahre') } })]),
  seite('s-filter', [
    frage('A', 'einfach', { text: zw('Rauchen Sie?'), liste: 'farben' }),
    frage('B', 'einfach', { text: zw('Wie viel?'), liste: 'l5', wennGezeigt: { frage: 'A', ist: '=', wert: 1 } }),
    frage('C', 'text', { text: zw('Zum Schluss') }),
  ]),
  seite('s-filter-pflicht', [
    frage('A', 'einfach', { text: zw('Rauchen Sie?'), liste: 'farben' }),
    frage('B', 'einfach', { text: zw('Wie viel?'), liste: 'l5', pflicht: { an: true }, wennGezeigt: { frage: 'A', ist: '=', wert: 1 } }),
  ]),
  seite('s-hinweis', [
    hinweis('H1', { bild: { datei: 'karte.png', alt: zw('Eine Karte der Stadt') } }),
    hinweis('H2', { wennGezeigt: { frage: 'A', ist: '=', wert: 1 } }),
    frage('F9', 'text', { text: zw('Nach dem Hinweis') }),
  ]),
]);
/** Vier Seiten, die dritte nur, wenn Q1 = 1 */
const p4 = (cond?: Bedingung, extra: Partial<FragebogenPlan> = {}) => plan([
  seite('q1', [frage('Q1', 'einfach', { liste: 'farben' })]),
  seite('q2', [frage('Q2', 'text')]),
  seite('q3', [frage('Q3', 'text')], cond ? { wennGezeigt: cond } : {}),
  seite('q4', [frage('Q4', 'text')]),
], extra);

const legende = (page: Page, frageId: string) => page.evaluate(id => (document.querySelector(`[data-frage="${id}"] legend`)?.textContent ?? '').replace(/\s+/g, ' ').trim(), frageId);
const beschrieben = (page: Page, sel: string): Promise<string[]> => page.evaluate(s => {
  const e = document.querySelector(s); if (!e) return [];
  return (e.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(Boolean).map(i => (document.getElementById(i)?.textContent ?? '').replace(/\s+/g, ' ').trim());
}, sel);
const fokusTreffer = (page: Page) => page.evaluate(() => { const a = document.activeElement as HTMLElement | null; return a ? { tag: a.tagName.toLowerCase(), name: a.getAttribute('aria-label') ?? a.textContent?.trim() ?? '', id: a.id } : null; });

/* ================================================================== Bibliothek, Texte, Größe */
describe('Texte der Bibliothek (texte.ts)', () => {
  const SCHLUESSEL = ['weiter', 'zurueck', 'pflicht', 'bitteBeantworten', 'seiteVon', 'nachOben', 'nachUnten', 'platz', 'fehlerZusammenfassung', 'neueFrage', 'andereAufgehoben', 'zahlfeld', 'reglerWert', 'ichStimmeZu'];
  it('de und en haben dieselben Schlüssel, alle befüllt, die Pflichtschlüssel sind da', async () => {
    const p = await neu();
    const t = await p.evaluate(() => (window as any).Ausfuellen.texte);
    expect(Object.keys(t).sort()).toEqual(expect.arrayContaining(['de', 'en']));
    expect(Object.keys(t.de).sort()).toEqual(Object.keys(t.en).sort());
    for (const s of SCHLUESSEL) { expect(t.de[s], `de.${s}`).toBeTruthy(); expect(t.en[s], `en.${s}`).toBeTruthy(); }
    for (const s of Object.keys(t.de)) { expect(typeof t.de[s]).toBe('string'); expect(t.de[s].trim()).not.toBe(''); expect(t.en[s].trim()).not.toBe(''); }
  });
  it('t() ersetzt Platzhalter in beiden Sprachen; de und en unterscheiden sich', async () => {
    const p = await neu();
    const r = await p.evaluate(() => { const A = (window as any).Ausfuellen; return {
      de: A.t('de', 'seiteVon', { n: 2, gesamt: 4 }), en: A.t('en', 'seiteVon', { n: 2, gesamt: 4 }),
      platz: A.t('de', 'platz', { option: 'Arbeit', platz: 2, gesamt: 5 }), oben: A.t('de', 'nachOben', { option: 'Arbeit' }), unten: A.t('en', 'nachUnten', { option: 'Arbeit' }),
      fz: A.t('de', 'fehlerZusammenfassung', { n: 2 }), rw: A.t('de', 'reglerWert', { wert: 3, max: 7 }) }; });
    expect(r.de).toBe('Seite 2 von 4');
    expect(r.en).toBe('Page 2 of 4');
    expect(r.platz).toBe('Arbeit jetzt auf Platz 2 von 5');
    expect(r.oben).toBe('Arbeit nach oben');
    expect(r.unten).toContain('Arbeit');
    expect(r.unten).not.toBe('Arbeit nach unten');
    expect(r.fz).toContain('2');
    expect(r.rw).toBe('3 von 7');
  });
});

describe('Größe und Abhängigkeiten', () => {
  it('gebündelt unkomprimiert unter 80 KB (Ziel 60 KB), ohne Svelte und ohne lib/sitzung', async () => {
    const gebaut = await baueBibliothek();   // wirft, solange index.ts fehlt
    const kb = Buffer.byteLength(gebaut, 'utf8') / 1024;
    console.log(`[ausfuellen] Bündel ${kb.toFixed(1)} KB unkomprimiert (Grenze 80, Ziel 60)`);
    expect(kb).toBeLessThan(80);
    expect(gebaut).not.toMatch(/svelte/i);
    expect(gebaut).not.toMatch(/sitzung/);
  }, 60_000);
  it('Quelltexte der Bibliothek importieren kein Svelte und nichts außer fragebogenplan-bedingung aus ../lib', () => {
    const dateien = readdirSync(ORDNER).filter(f => /\.ts$/.test(f) && !/\.test\.ts$/.test(f) && f !== 'testhilfe.ts');
    expect(dateien).toEqual(expect.arrayContaining(['index.ts', 'texte.ts']));
    for (const f of dateien) {
      const text = readFileSync(join(ORDNER, f), 'utf8');
      for (const m of text.matchAll(/^\s*import\s+(type\s+)?[^;]*?from\s+['"]([^'"]+)['"]/gm)) {
        const [, typ, quelle] = m;
        expect(quelle, `${f}: ${m[0]}`).not.toMatch(/svelte/);
        // seite.ts (Stufe 3C) ist der Einstieg der Ausfüllseite, nicht die Bibliothek: es braucht zusätzlich das Verschlüsseln der Antwort (lib/antwortsatz).
        const erlaubt = f === 'seite.ts' ? /(fragebogenplan-bedingung|antwortsatz)$/ : /fragebogenplan-bedingung$/;
        if (/\/lib\//.test(quelle!) && !typ) expect(quelle, `${f}: Laufzeit-Import aus lib`).toMatch(erlaubt);
      }
    }
  });
});

/* ================================================================== Einfachauswahl */
describe('einfach', () => {
  it('fieldset/legend = Fragetext, native Radios mit label, gleicher Name, keine role=radio-Nachbildung', async () => {
    const p = await neu(); await zeichne(p, P, 's-einfach');
    expect(await p.locator('fieldset').count()).toBe(1);
    expect(await legende(p, 'F1')).toBe('Welche Farbe?');
    expect(await p.locator('[data-frage="F1"] input[type=radio]').count()).toBe(3);
    expect(await p.locator('[role=radio]').count()).toBe(0);
    const r = await p.evaluate(() => Array.from(document.querySelectorAll<HTMLInputElement>('input[type=radio]')).map(i => ({ label: i.labels?.[0]?.textContent?.trim(), name: i.name })));
    expect(r.map(x => x.label)).toEqual(['Rot', 'Grün', 'Blau']);
    expect(new Set(r.map(x => x.name)).size).toBe(1);
    expect(await p.getByRole('group', { name: 'Welche Farbe?' }).isVisible()).toBe(true);
    expect(await p.getByRole('radio', { name: 'Grün' }).isVisible()).toBe(true);
  });
  it('Hilfe: <p id> + aria-describedby am fieldset', async () => {
    const p = await neu(); await zeichne(p, P, 's-einfach');
    expect(await beschrieben(p, 'fieldset')).toEqual(['Bitte eine Farbe wählen.']);
    expect(await p.locator('p[id]', { hasText: 'Bitte eine Farbe wählen.' }).count()).toBe(1);
  });
  it('Antwort lesen und vorbelegen (Rundreise), beiAenderung meldet Stand und Frage', async () => {
    const p = await neu(); await zeichne(p, P, 's-einfach');
    expect(await lies(p)).toEqual({});
    await p.getByRole('radio', { name: 'Grün' }).check();
    expect(await lies(p)).toEqual({ F1: 2 });
    const aend = await p.evaluate(() => (window as any).__aend);
    expect(aend.at(-1)).toEqual([{ F1: 2 }, 'F1']);
    await zeichne(p, P, 's-einfach', { F1: 3 });
    expect(await p.getByRole('radio', { name: 'Blau' }).isChecked()).toBe(true);
    expect(await lies(p)).toEqual({ F1: 3 });
  });
  it('englisch: Texte aus Lok[en], lang an der Wurzel', async () => {
    const p = await neu('en'); await zeichne(p, P, 's-einfach', {}, { sprache: 'en' });
    expect(await legende(p, 'F1')).toBe('Welche Farbe? (en)');
    expect(await p.evaluate(() => document.querySelector('[data-seite]')?.getAttribute('lang'))).toBe('en');
  });
});

/* ================================================================== Mehrfachauswahl */
describe('mehrfach', () => {
  it('fieldset/legend, native Kontrollkästchen mit label', async () => {
    const p = await neu(); await zeichne(p, P, 's-mehrfach');
    expect(await legende(p, 'F2')).toBe('Welche Medien nutzen Sie?');
    expect(await p.locator('[data-frage="F2"] input[type=checkbox]').count()).toBe(4);
    expect(await p.getByRole('checkbox', { name: 'Radio' }).isVisible()).toBe(true);
    expect(await p.getByRole('group', { name: 'Welche Medien nutzen Sie?' }).isVisible()).toBe(true);
  });
  it('Antwort lesen: Codes in Listenreihenfolge, abwählen entfernt', async () => {
    const p = await neu(); await zeichne(p, P, 's-mehrfach');
    await p.getByRole('checkbox', { name: 'Internet' }).check();
    await p.getByRole('checkbox', { name: 'Zeitung' }).check();
    expect(await lies(p)).toEqual({ F2: [1, 3] });
    await p.getByRole('checkbox', { name: 'Internet' }).uncheck();
    expect(await lies(p)).toEqual({ F2: [1] });
    await p.getByRole('checkbox', { name: 'Zeitung' }).uncheck();
    expect(await lies(p)).toEqual({});
    await zeichne(p, P, 's-mehrfach', { F2: [2, 3] });
    expect(await p.getByRole('checkbox', { name: 'Radio' }).isChecked()).toBe(true);
  });
  it('ausschliessend: „Nichts davon“ hebt die anderen auf (mit Ansage) und umgekehrt', async () => {
    const p = await neu(); await zeichne(p, P, 's-mehrfach');
    await p.getByRole('checkbox', { name: 'Zeitung' }).check();
    await p.getByRole('checkbox', { name: 'Radio' }).check();
    await p.getByRole('checkbox', { name: 'Nichts davon' }).check();
    expect(await lies(p)).toEqual({ F2: [4] });
    expect(await p.getByRole('checkbox', { name: 'Zeitung' }).isChecked()).toBe(false);
    const text = await p.evaluate(() => (window as any).Ausfuellen.t('de', 'andereAufgehoben'));
    expect(await ansage(p)).toBe(text);
    expect(await p.evaluate(() => (window as any).__ansagen.at(-1))).toBe(text);
    await p.getByRole('checkbox', { name: 'Internet' }).check();
    expect(await lies(p)).toEqual({ F2: [3] });
    expect(await p.getByRole('checkbox', { name: 'Nichts davon' }).isChecked()).toBe(false);
  });
});

/* ================================================================== Zahl, Text, Datum */
describe('zahl, text, datum', () => {
  it('native Eingaben mit label = Fragetext, Hilfe per aria-describedby', async () => {
    const p = await neu(); await zeichne(p, P, 's-felder');
    const r = await p.evaluate(() => Array.from(document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('[data-frage] input, [data-frage] textarea')).map(i => ({ id: i.closest('[data-frage]')!.getAttribute('data-frage'), tag: i.tagName.toLowerCase(), type: (i as HTMLInputElement).type, label: i.labels?.[0]?.textContent?.replace(/\s+/g, ' ').trim() })));
    expect(r.map(x => x.id)).toEqual(['Z', 'T', 'T2', 'D']);
    expect(r.map(x => x.label)).toEqual(['Wie alt sind Sie?', 'Ihr Beruf?', 'Anmerkungen?', 'Geburtsdatum?']);
    expect(r.map(x => x.type)).toEqual(['number', 'text', 'textarea', 'date']);
    expect(await p.getByRole('spinbutton', { name: 'Wie alt sind Sie?' }).isVisible()).toBe(true);
    expect(await beschrieben(p, '[data-frage="Z"] input')).toEqual(['In ganzen Jahren.']);
  });
  it('Zahl: min, max, step 1 bei ganz; Text: maxlength; Einheit sichtbar', async () => {
    const p = await neu(); await zeichne(p, P, 's-felder');
    const z = await p.evaluate(() => { const i = document.querySelector<HTMLInputElement>('[data-frage="Z"] input')!; return { min: i.min, max: i.max, step: i.step }; });
    expect(z).toEqual({ min: '0', max: '120', step: '1' });
    expect(await p.evaluate(() => document.querySelector<HTMLInputElement>('[data-frage="T"] input')!.maxLength)).toBe(50);
    expect(await p.locator('[data-frage="Z"]').innerText()).toContain('Jahre');
  });
  it('Antworten lesen (Zahl als number, Datum ISO) und vorbelegen; leer = kein Schlüssel', async () => {
    const p = await neu(); await zeichne(p, P, 's-felder');
    expect(await lies(p)).toEqual({});
    await p.getByRole('spinbutton', { name: 'Wie alt sind Sie?' }).fill('42');
    await p.getByLabel('Ihr Beruf?').fill('Lehrerin');
    await p.getByLabel('Anmerkungen?').fill('Zeile 1\nZeile 2');
    await p.getByLabel('Geburtsdatum?').fill('1984-05-17');
    expect(await lies(p)).toEqual({ Z: 42, T: 'Lehrerin', T2: 'Zeile 1\nZeile 2', D: '1984-05-17' });
    await zeichne(p, P, 's-felder', { Z: 7, T: 'x', D: '2000-01-02' });
    expect(await p.getByLabel('Wie alt sind Sie?').inputValue()).toBe('7');
    expect(await p.getByLabel('Geburtsdatum?').inputValue()).toBe('2000-01-02');
    await p.getByLabel('Ihr Beruf?').fill('');
    expect((await lies(p)).T).toBeUndefined();
  });
});

/* ================================================================== Regler */
describe('regler', () => {
  it('range mit aria-valuetext UND Zahlfeld, fieldset/legend, Hilfe', async () => {
    const p = await neu(); await zeichne(p, P, 's-regler');
    expect(await legende(p, 'R')).toBe('Wie zufrieden?');
    const r = await p.evaluate(() => { const g = document.querySelector('[data-frage="R"]')!; const rg = g.querySelector<HTMLInputElement>('input[type=range]')!; const n = g.querySelector<HTMLInputElement>('input[type=number]')!;
      return { min: rg.min, max: rg.max, nmin: n.min, nmax: n.max, valuetext: rg.hasAttribute('aria-valuetext'), nlabel: n.labels?.[0]?.textContent?.trim() }; });
    expect(r).toMatchObject({ min: '1', max: '7', nmin: '1', nmax: '7', valuetext: true });
    expect(r.nlabel).toBeTruthy();
    expect(await p.getByRole('slider').isVisible()).toBe(true);
    expect(await p.getByRole('spinbutton').isVisible()).toBe(true);
    expect(await p.getByRole('slider').getAttribute('aria-label') ?? await p.getByRole('slider').getAttribute('aria-labelledby')).toBeTruthy();
    expect((await beschrieben(p, '[data-frage="R"] fieldset')).join(' ')).toContain('1 = gar nicht');
  });
  it('gleichlaufend: Regler → Zahlfeld und Zahlfeld → Regler, aria-valuetext „3 von 7“', async () => {
    const p = await neu(); await zeichne(p, P, 's-regler');
    expect(await lies(p)).toEqual({});     // unberührt = keine Antwort
    const g = '[data-frage="R"]';
    await p.locator(`${g} input[type=range]`).evaluate((e: HTMLInputElement) => { e.value = '3'; e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })); });
    expect(await p.locator(`${g} input[type=number]`).inputValue()).toBe('3');
    expect(await p.locator(`${g} input[type=range]`).getAttribute('aria-valuetext')).toBe('3 von 7');
    expect(await lies(p)).toEqual({ R: 3 });
    await p.locator(`${g} input[type=number]`).fill('6');
    expect(await p.locator(`${g} input[type=range]`).inputValue()).toBe('6');
    expect(await p.locator(`${g} input[type=range]`).getAttribute('aria-valuetext')).toBe('6 von 7');
    expect(await lies(p)).toEqual({ R: 6 });
    expect((await p.evaluate(() => (window as any).__aend.at(-1)))[1]).toBe('R');
  });
  it('mit Antwortliste: aria-valuetext nennt auch den Optionstext', async () => {
    const p = await neu(); await zeichne(p, P, 's-regler-liste', { RL: 4 });
    expect(await p.locator('[data-frage="RL"] input[type=range]').getAttribute('aria-valuetext')).toBe('4 von 5, Stufe 4');
    expect(await p.locator('[data-frage="RL"] input[type=number]').inputValue()).toBe('4');
  });
});

/* ================================================================== Rangfolge */
describe('rangfolge', () => {
  it('fieldset/legend, ol mit je zwei Knöpfen „<Option> nach oben/unten“, Enden aria-disabled', async () => {
    const p = await neu(); await zeichne(p, P, 's-rang');
    expect(await legende(p, 'RG')).toBe('Was ist Ihnen wichtig?');
    expect(await p.locator('[data-frage="RG"] ol > li').count()).toBe(5);
    expect(await p.locator('[data-frage="RG"] ol > li button[type=button]').count()).toBe(10);
    expect(await p.getByRole('button', { name: 'Arbeit nach oben', exact: true }).isVisible()).toBe(true);
    expect(await p.getByRole('button', { name: 'Arbeit nach unten', exact: true }).isVisible()).toBe(true);
    expect(await p.getByRole('button', { name: 'Familie nach oben', exact: true }).getAttribute('aria-disabled')).toBe('true');
    expect(await p.getByRole('button', { name: 'Geld nach unten', exact: true }).getAttribute('aria-disabled')).toBe('true');
    expect(await p.getByRole('button', { name: 'Arbeit nach oben', exact: true }).getAttribute('aria-disabled')).not.toBe('true');
    expect((await beschrieben(p, '[data-frage="RG"] fieldset')).join(' ')).toContain('Ordnen Sie');
  });
  it('Klick ändert die Reihenfolge, Fokus bleibt auf dem Knopf, Ansage „… jetzt auf Platz 2 von 5“', async () => {
    const p = await neu(); await zeichne(p, P, 's-rang');
    expect(await lies(p)).toEqual({});     // unberührt = keine Antwort
    await p.getByRole('button', { name: 'Familie nach unten', exact: true }).click();
    expect((await p.locator('[data-frage="RG"] ol > li').allInnerTexts()).map(t => t.split('\n')[0]!.trim().split(' ')[0])).toEqual(['Arbeit', 'Familie', 'Freizeit', 'Gesundheit', 'Geld']);
    expect(await ansage(p)).toBe('Familie jetzt auf Platz 2 von 5');
    expect(await fokusTreffer(p)).toMatchObject({ tag: 'button', name: 'Familie nach unten' });
    await p.getByRole('button', { name: 'Geld nach oben', exact: true }).click();
    expect(await ansage(p)).toBe('Geld jetzt auf Platz 4 von 5');
    expect(await fokusTreffer(p)).toMatchObject({ name: 'Geld nach oben' });
    expect(await lies(p)).toEqual({ RG: [2, 1, 3, 5, 4] });
    expect((await p.evaluate(() => (window as any).__aend.at(-1)))[1]).toBe('RG');
  });
  it('Knopf am Ende ändert nichts; vorbelegte Reihenfolge wird gezeichnet', async () => {
    const p = await neu(); await zeichne(p, P, 's-rang', { RG: [3, 1, 2, 4, 5] });
    expect((await p.locator('[data-frage="RG"] ol > li').allInnerTexts()).map(t => t.trim().split(/\s/)[0])).toEqual(['Freizeit', 'Familie', 'Arbeit', 'Gesundheit', 'Geld']);
    await p.getByRole('button', { name: 'Freizeit nach oben', exact: true }).click({ force: true });   // aria-disabled: Playwright würde sonst auf „enabled“ warten (Opus 08.11.)
    expect(await lies(p)).toEqual({ RG: [3, 1, 2, 4, 5] });
  });
});

/* ================================================================== Einwilligung und Hinweis */
describe('einwilligung, hinweis', () => {
  it('Einwilligung: fieldset/legend = Text, Kontrollkästchen „Ich stimme zu“, Pflicht; lesen = 1', async () => {
    const p = await neu(); await zeichne(p, P, 's-einw');
    expect(await legende(p, 'E')).toContain('Ich habe die Information gelesen.');
    const name = await p.evaluate(() => (window as any).Ausfuellen.t('de', 'ichStimmeZu'));
    const kasten = p.getByRole('checkbox', { name });
    expect(await kasten.isVisible()).toBe(true);
    expect(await lies(p)).toEqual({});
    await kasten.check();
    expect(await lies(p)).toEqual({ E: 1 });
    await kasten.uncheck();
    expect(await lies(p)).toEqual({});
  });
  it('Hinweis: Text, Bild mit Alternativtext und src über bildUrl, bedingter Hinweis', async () => {
    const p = await neu(); await zeichne(p, P, 's-hinweis');
    expect(await p.locator('[data-hinweis="H1"]').innerText()).toContain('Hinweis H1');
    const img = await p.evaluate(() => { const i = document.querySelector<HTMLImageElement>('[data-hinweis="H1"] img')!; return { alt: i.alt, src: i.getAttribute('src') }; });
    expect(img).toEqual({ alt: 'Eine Karte der Stadt', src: 'bilder/karte.png' });
    expect(await p.locator('[data-hinweis="H2"]').count()).toBe(0);
    expect(await lies(p)).toEqual({});
  });
});

/* ================================================================== Block */
describe('block am Rechner (Tabelle)', () => {
  it('table mit caption, th scope=col je Stufe, th scope=row je Item, Radio je Zelle', async () => {
    const p = await neu(); await zeichne(p, P, 's-block', {}, { eng: false });
    expect(await p.locator('table').count()).toBe(1);
    expect((await p.locator('table > caption').innerText()).trim()).toContain('Wie sehr stimmen Sie zu?');
    expect(await p.locator('table th[scope=col]').allInnerTexts()).toEqual(['Stufe 1', 'Stufe 2', 'Stufe 3', 'Stufe 4', 'Stufe 5']);
    expect(await p.locator('table th[scope=row]').allInnerTexts()).toEqual(['Item 1', 'Item 2', 'Item 3']);
    expect(await p.locator('table input[type=radio]').count()).toBe(15);
    expect(await p.locator('fieldset').count()).toBe(0);
    expect(await p.getByRole('table').isVisible()).toBe(true);
    expect(await p.getByRole('columnheader').count()).toBe(5);
    expect(await p.getByRole('rowheader').count()).toBe(3);
    expect((await beschrieben(p, 'table')).join(' ')).toContain('Eine Antwort je Zeile.');
  });
  it('Radio-Name je Zeile gleich, zwischen Zeilen verschieden; Name „<Item>: <Stufe>“ über aria-labelledby', async () => {
    const p = await neu(); await zeichne(p, P, 's-block');
    const zeilen = await p.evaluate(() => Array.from(document.querySelectorAll('table tbody tr, table tr')).filter(tr => tr.querySelector('input[type=radio]')).map(tr => Array.from(tr.querySelectorAll<HTMLInputElement>('input[type=radio]')).map(i => i.name)));
    expect(zeilen.length).toBe(3);
    for (const z of zeilen) { expect(z.length).toBe(5); expect(new Set(z).size).toBe(1); }
    expect(new Set(zeilen.map(z => z[0])).size).toBe(3);
    const lab = await p.evaluate(() => { const i = document.querySelectorAll<HTMLInputElement>('table input[type=radio]')[6]!;   // Zeile 2, Stufe 2
      return { ids: (i.getAttribute('aria-labelledby') ?? '').split(/\s+/).filter(Boolean).map(id => document.getElementById(id)?.textContent?.trim()), hatLabel: !!i.labels?.length }; });
    expect(lab.ids).toEqual(['Item 2', 'Stufe 2']);
    expect(await p.getByRole('radio', { name: /^Item 2[:\s]+Stufe 4$/ }).isVisible()).toBe(true);
  });
  it('Antworten je Item lesen und vorbelegen', async () => {
    const p = await neu(); await zeichne(p, P, 's-block');
    await p.getByRole('radio', { name: /^Item 1[:\s]+Stufe 2$/ }).check();
    await p.getByRole('radio', { name: /^Item 3[:\s]+Stufe 5$/ }).check();
    await p.getByRole('radio', { name: /^Item 3[:\s]+Stufe 1$/ }).check();
    expect(await lies(p)).toEqual({ B1: 2, B3: 1 });
    expect((await p.evaluate(() => (window as any).__aend.at(-1)))[1]).toMatch(/^B/);
    await zeichne(p, P, 's-block', { B2: 4 });
    expect(await p.getByRole('radio', { name: /^Item 2[:\s]+Stufe 4$/ }).isChecked()).toBe(true);
  });
});

describe('block am Handy (eng: true)', () => {
  it('Überschrift mit Blockfrage, je Item ein fieldset/legend, keine Tabelle', async () => {
    const p = await neu(); await zeichne(p, P, 's-block', {}, { eng: true });
    expect(await p.locator('table').count()).toBe(0);
    expect(await p.locator('h3').allInnerTexts()).toEqual([expect.stringContaining('Wie sehr stimmen Sie zu?')]);
    expect(await p.locator('[data-frage="B"] fieldset').count()).toBe(3);
    expect(await p.locator('[data-frage="B"] fieldset > legend').allInnerTexts()).toEqual(['Item 1', 'Item 2', 'Item 3']);
    expect(await p.locator('[data-frage="B"] fieldset:first-of-type input[type=radio]').count()).toBe(5);
    expect(await p.getByRole('group', { name: 'Item 2' }).isVisible()).toBe(true);
    expect(await p.getByRole('group', { name: 'Item 2' }).getByRole('radio', { name: 'Stufe 3' }).isVisible()).toBe(true);
  });
  it('Antworten je Item', async () => {
    const p = await neu(); await zeichne(p, P, 's-block', { B1: 5 }, { eng: true });
    expect(await p.getByRole('group', { name: 'Item 1' }).getByRole('radio', { name: 'Stufe 5' }).isChecked()).toBe(true);
    await p.getByRole('group', { name: 'Item 3' }).getByRole('radio', { name: 'Stufe 2' }).check();
    expect(await lies(p)).toEqual({ B1: 5, B3: 2 });
  });
});

/* ================================================================== Pflicht */
describe('Pflicht', () => {
  it('Wort „Pflicht“ sichtbar an der Frage (nicht nur ein Stern), required/aria-required, freiwillige Fragen ohne', async () => {
    const p = await neu(); await zeichne(p, P, 's-pflicht');
    const wort = await p.evaluate(() => (window as any).Ausfuellen.t('de', 'pflicht'));
    expect(await legende(p, 'P1')).toContain(wort);
    expect(await legende(p, 'P1')).toContain('Pflichtfrage eins');
    const labelP2 = await p.evaluate(() => document.querySelector<HTMLInputElement>('[data-frage="P2"] input')!.labels![0]!.textContent!);
    expect(labelP2).toContain(wort);
    const markiert = await p.evaluate(() => ['P1', 'P2', 'P3'].map(id => !!document.querySelector(`[data-frage="${id}"] [required], [data-frage="${id}"] [aria-required="true"]`)));
    expect(markiert).toEqual([true, true, false]);
    expect(await p.locator('[data-frage="P3"]').innerText()).not.toContain(wort);
  });
  it('Einwilligung mit Pflicht und Block mit Pflicht tragen das Wort ebenfalls', async () => {
    const p = await neu(); await zeichne(p, P, 's-block-pflicht');
    const wort = await p.evaluate(() => (window as any).Ausfuellen.t('de', 'pflicht'));
    expect((await p.locator('table > caption').innerText())).toContain(wort);
    expect(await p.locator('[data-frage="B"] [required], [data-frage="B"] [aria-required="true"], [data-frage="B"][aria-required="true"], table[aria-required="true"]').count()).toBeGreaterThan(0);
  });
});

/* ================================================================== Prüfung und Fehler */
describe('pruefeSeite', () => {
  const pruefe = (p: Page, seiteId: string, antworten: object, sprache = 'de', modus = 'ausfuellen') =>
    p.evaluate(([pl, sid, a, s, m]) => { const A = (window as any).Ausfuellen; return A.pruefeSeite(pl, (pl as any).elemente.find((x: any) => x.id === sid), a, s, m); }, [P, seiteId, antworten, sprache, modus] as const);
  it('liefert je fehlender Pflichtfrage einen Fehler { id, text }', async () => {
    const p = await neu();
    const f = await pruefe(p, 's-pflicht', {});
    expect(f.map((x: any) => x.id)).toEqual(['P1', 'P2']);
    expect(f[0].text).toMatch(/Pflicht/);
    expect(f[0].text).toMatch(/beantworten/i);
    expect((await pruefe(p, 's-pflicht', { P1: 2 })).map((x: any) => x.id)).toEqual(['P2']);
    expect(await pruefe(p, 's-pflicht', { P1: 2, P2: 0 })).toEqual([]);      // 0 ist eine Antwort
  });
  it('englisch; eigene Meldung der Frage geht vor', async () => {
    const p = await neu();
    const f = await pruefe(p, 's-pflicht', {}, 'en');
    expect(f[0].text).toMatch(/Required/i);
    const g = await p.evaluate(() => { const A = (window as any).Ausfuellen; const s = { art: 'seite', id: 'x', name: 'x', elemente: [{ art: 'frage', id: 'M', name: 'M', typ: 'text', text: { de: 'M' }, pflicht: { an: true, meldung: { de: 'Bitte Namen nennen' } }, kodebuch: { niveau: 'nominal' } }] };
      return A.pruefeSeite({ elemente: [s], einstellungen: {}, antwortlisten: [], sprachen: ['de'], titel: { de: 'T' } }, s, {}, 'de'); });
    expect(g[0].text).toBe('Bitte Namen nennen');
  });
  it('nicht gezeigte Pflichtfragen zählen nicht; gezeigte schon', async () => {
    const p = await neu();
    expect(await pruefe(p, 's-filter-pflicht', { A: 2 })).toEqual([]);
    expect((await pruefe(p, 's-filter-pflicht', { A: 1 })).map((x: any) => x.id)).toEqual(['B']);
    expect(await pruefe(p, 's-filter-pflicht', { A: 1, B: 3 })).toEqual([]);
  });
  it('Plausibilitätsregel (gueltig) mit eigener Meldung; leere Antwort ist dort kein Fehler', async () => {
    const p = await neu();
    expect(await pruefe(p, 's-gueltig', { G: 10 })).toEqual([{ id: 'G', text: 'Mindestens 16 Jahre' }]);
    expect(await pruefe(p, 's-gueltig', { G: 20 })).toEqual([]);
    expect(await pruefe(p, 's-gueltig', {})).toEqual([]);
  });
  it('Einwilligung mit Pflicht: ohne Haken Fehler', async () => {
    const p = await neu();
    expect((await pruefe(p, 's-einw', {})).map((x: any) => x.id)).toEqual(['E']);
    expect(await pruefe(p, 's-einw', { E: 1 })).toEqual([]);
  });
  it('Block mit Pflicht: jedes Item muss beantwortet sein (Fehler auf dem Block)', async () => {
    const p = await neu();
    expect((await pruefe(p, 's-block-pflicht', { B1: 1, B2: 2 })).map((x: any) => x.id)).toEqual(['B']);
    expect(await pruefe(p, 's-block-pflicht', { B1: 1, B2: 2, B3: 3 })).toEqual([]);
  });
  it('modus „eingabe“ überspringt Pflicht, behält aber gueltig', async () => {
    const p = await neu();
    expect(await pruefe(p, 's-pflicht', {}, 'de', 'eingabe')).toEqual([]);
    expect((await pruefe(p, 's-gueltig', { G: 3 }, 'de', 'eingabe')).map((x: any) => x.id)).toEqual(['G']);
    expect((await pruefe(p, 's-pflicht', {}, 'de', 'vorschau')).length).toBe(2);
  });
});

describe('Fehler anzeigen (Weiter-Knopf)', () => {
  it('vor „Weiter“ kein role=alert; Klick ohne Antworten: Zusammenfassung oben bekommt den Fokus, Sprunglinks, beiWeiter nicht gerufen', async () => {
    const p = await neu(); await zeichne(p, P, 's-pflicht');
    expect(await p.locator('[role=alert]').count()).toBe(0);
    await p.getByRole('button', { name: 'Weiter', exact: true }).click();
    expect(await p.locator('[role=alert]').count()).toBe(1);
    const z = p.locator('[data-fehlerliste]');
    expect(await z.isVisible()).toBe(true);
    expect(await z.getAttribute('role')).toBe('alert');
    expect(await z.getAttribute('tabindex')).toBe('-1');
    expect(await p.evaluate(() => document.activeElement === document.querySelector('[data-fehlerliste]'))).toBe(true);
    expect(await z.innerText()).toContain('2');
    expect(await z.locator('a[href^="#"]').count()).toBe(2);
    expect(await p.evaluate(() => (window as any).__weiter.length)).toBe(0);
    // Reihenfolge: Überschrift, dann Zusammenfassung, dann die Fragen
    const pos = await p.evaluate(() => { const r = document.querySelector('[data-seite]')!; const k = Array.from(r.querySelectorAll('h2, [data-fehlerliste], [data-frage]')); return k.map(e => e.matches('h2') ? 'h2' : e.matches('[data-fehlerliste]') ? 'liste' : 'frage'); });
    expect(pos.slice(0, 3)).toEqual(['h2', 'liste', 'frage']);
  });
  it('Fehler an der Frage: aria-invalid am Eingabeelement, aria-describedby auf den Fehlertext ohne role=alert', async () => {
    const p = await neu(); await zeichne(p, P, 's-pflicht');
    await p.getByRole('button', { name: 'Weiter', exact: true }).click();
    const r = await p.evaluate(() => ['P1', 'P2'].map(id => {
      const inv = Array.from(document.querySelectorAll<HTMLElement>(`[data-frage="${id}"] [aria-invalid="true"]`));
      return { n: inv.length, texte: inv.map(e => (e.getAttribute('aria-describedby') ?? '').split(/\s+/).map(i => document.getElementById(i)?.textContent ?? '').join(' ')),
        alert: document.querySelectorAll(`[data-frage="${id}"] [role=alert]`).length };
    }));
    for (const x of r) { expect(x.n).toBeGreaterThan(0); for (const t of x.texte) expect(t).toMatch(/Pflicht/); expect(x.alert).toBe(0); }
    expect(await p.locator('[data-frage="P3"] [aria-invalid="true"]').count()).toBe(0);
  });
  it('Sprunglink setzt den Fokus auf die erste Eingabe der Frage', async () => {
    const p = await neu(); await zeichne(p, P, 's-pflicht');
    await p.getByRole('button', { name: 'Weiter', exact: true }).click();
    await p.locator('[data-fehlerliste] a').nth(1).click();
    expect(await p.evaluate(() => { const a = document.activeElement!; return { in: !!a.closest('[data-frage="P2"]'), tag: a.tagName.toLowerCase() }; })).toEqual({ in: true, tag: 'input' });
    await p.locator('[data-fehlerliste] a').nth(0).click();
    expect(await p.evaluate(() => !!document.activeElement!.closest('[data-frage="P1"]') && document.activeElement!.matches('input'))).toBe(true);
  });
  it('Beantworten löscht aria-invalid und Fehlertext dieser Frage; danach geht „Weiter“ durch', async () => {
    const p = await neu(); await zeichne(p, P, 's-pflicht');
    await p.getByRole('button', { name: 'Weiter', exact: true }).click();
    await p.getByRole('radio', { name: 'Rot' }).check();
    expect(await p.locator('[data-frage="P1"] [aria-invalid="true"]').count()).toBe(0);
    expect(await p.locator('[data-frage="P2"] [aria-invalid="true"]').count()).toBeGreaterThan(0);
    await p.getByLabel('Pflichtfrage zwei').fill('5');
    expect(await p.locator('[aria-invalid="true"]').count()).toBe(0);
    await p.getByRole('button', { name: 'Weiter', exact: true }).click();
    expect(await p.evaluate(() => (window as any).__weiter)).toEqual([{ P1: 1, P2: 5 }]);
  });
  it('englisch: Knopf „Next“-Text kommt aus texte.en', async () => {
    const p = await neu('en'); await zeichne(p, P, 's-pflicht', {}, { sprache: 'en' });
    const weiter = await p.evaluate(() => (window as any).Ausfuellen.t('en', 'weiter'));
    await p.getByRole('button', { name: weiter, exact: true }).click();
    expect(await p.locator('[data-fehlerliste]').innerText()).toContain('2');
  });
});

/* ================================================================== Seitenwechsel */
describe('Seitenwechsel', () => {
  it('Überschrift h2 mit tabindex=-1 und Seitentitel; Fortschritt „Seite 2 von 4“', async () => {
    const p = await neu(); await zeichne(p, p4(), 'q2');
    expect(await p.locator('h2').count()).toBe(1);
    expect(await p.locator('h2').innerText()).toBe('Titel q2');
    expect(await p.locator('h2').getAttribute('tabindex')).toBe('-1');
    expect(await p.getByText('Seite 2 von 4', { exact: true }).isVisible()).toBe(true);
  });
  it('Seite ohne eigenen Titel: Überschrift = Titel des Fragebogens', async () => {
    const q = p4(); delete q.elemente[1]!.titel;
    const p = await neu(); await zeichne(p, q, 'q2');
    expect(await p.locator('h2').innerText()).toBe('Umfrage');
  });
  it('englisch: „Page 2 of 4“, Überschrift englisch', async () => {
    const p = await neu('en'); await zeichne(p, p4(), 'q2', {}, { sprache: 'en' });
    expect(await p.getByText('Page 2 of 4', { exact: true }).isVisible()).toBe(true);
    expect(await p.locator('h2').innerText()).toBe('Titel q2 (en)');
  });
  it('verborgene Seiten zählen nicht mit: Seite 4 ist „Seite 3 von 3“', async () => {
    const cond: Bedingung = { frage: 'Q1', ist: '=', wert: 1 };
    const p = await neu(); await zeichne(p, p4(cond), 'q4', { Q1: 2 });
    expect(await p.getByText('Seite 3 von 3', { exact: true }).isVisible()).toBe(true);
    await zeichne(p, p4(cond), 'q4', { Q1: 1 });
    expect(await p.getByText('Seite 4 von 4', { exact: true }).isVisible()).toBe(true);
  });
  it('einstellungen.fortschritt = false: kein Fortschrittstext', async () => {
    const q = p4(undefined, { einstellungen: { fortschritt: false, zurueck: true, pretest: false, fehlendFilter: 'code' } });
    const p = await neu(); await zeichne(p, q, 'q2');
    expect(await p.getByText(/Seite \d+ von/).count()).toBe(0);
  });
  it('fokussiereSeitentitel setzt den Fokus auf die Überschrift', async () => {
    const p = await neu(); await zeichne(p, p4(), 'q2');
    await p.evaluate(() => { const w = window as any; w.Ausfuellen.fokussiereSeitentitel(w.__wurzel); });
    expect(await p.evaluate(() => document.activeElement === document.querySelector('h2'))).toBe(true);
  });
  it('Zurück nur ab der zweiten gezeigten Seite und nur mit einstellungen.zurueck; Klick ruft beiZurueck', async () => {
    const p = await neu();
    await zeichne(p, p4(), 'q1');
    expect(await p.getByRole('button', { name: 'Zurück', exact: true }).count()).toBe(0);
    await zeichne(p, p4(), 'q2');
    await p.getByRole('button', { name: 'Zurück', exact: true }).click();
    expect(await p.evaluate(() => (window as any).__zurueck.length)).toBe(1);
    await zeichne(p, p4(undefined, { einstellungen: { fortschritt: true, zurueck: false, pretest: false, fehlendFilter: 'code' } }), 'q2');
    expect(await p.getByRole('button', { name: 'Zurück', exact: true }).count()).toBe(0);
  });
  it('Weiter ohne Pflichtfragen ruft sofort beiWeiter mit allen Antworten (übergebene + dieser Seite)', async () => {
    const p = await neu(); await zeichne(p, p4(), 'q2', { Q1: 3 });
    await p.getByLabel('Frage Q2').fill('hallo');
    await p.getByRole('button', { name: 'Weiter', exact: true }).click();
    expect(await p.evaluate(() => (window as any).__weiter)).toEqual([{ Q1: 3, Q2: 'hallo' }]);
  });
  it('Wurzel: section mit lang, data-modus, genau eine Ansage-Region (role=status)', async () => {
    const p = await neu(); await zeichne(p, p4(), 'q2', {}, { modus: 'vorschau' });
    const r = await p.evaluate(() => { const w = (window as any).__wurzel as HTMLElement; return { tag: w.tagName.toLowerCase(), lang: w.lang, modus: w.getAttribute('data-modus'), seite: w.getAttribute('data-seite'),
      regionen: w.querySelectorAll('[data-ansage]').length, rolle: w.querySelector('[data-ansage]')?.getAttribute('role') }; });
    expect(r).toEqual({ tag: 'section', lang: 'de', modus: 'vorschau', seite: 'q2', regionen: 1, rolle: 'status' });
  });
});

/* ================================================================== Filter */
describe('Filter (wennGezeigt)', () => {
  it('nicht gezeigte Frage ist nicht im DOM und fehlt in liesAntworten', async () => {
    const p = await neu(); await zeichne(p, P, 's-filter');
    expect(await p.locator('[data-frage="B"]').count()).toBe(0);
    expect(await p.locator('[data-frage]').evaluateAll(e => e.map(x => x.getAttribute('data-frage')))).toEqual(['A', 'C']);
    expect(await lies(p)).toEqual({});
  });
  it('Antwort blendet die Frage an der richtigen Stelle ein: Ansage, kein Fokuswechsel', async () => {
    const p = await neu(); await zeichne(p, P, 's-filter');
    await p.getByRole('radio', { name: 'Rot' }).check();
    expect(await p.locator('[data-frage]').evaluateAll(e => e.map(x => x.getAttribute('data-frage')))).toEqual(['A', 'B', 'C']);
    const text = await p.evaluate(() => (window as any).Ausfuellen.t('de', 'neueFrage'));
    expect(await ansage(p)).toBe(text);
    expect(await p.evaluate(() => (window as any).__ansagen)).toContain(text);
    expect(await p.evaluate(() => { const a = document.activeElement as HTMLInputElement; return a.matches('input[type=radio]') && !!a.closest('[data-frage="A"]') && a.checked; })).toBe(true);
    expect(await p.getByRole('group', { name: 'Wie viel?' }).isVisible()).toBe(true);
  });
  it('Gegenrichtung: Frage verschwindet samt ihrer Antwort', async () => {
    const p = await neu(); await zeichne(p, P, 's-filter');
    await p.getByRole('radio', { name: 'Rot' }).check();
    await p.getByRole('radio', { name: 'Stufe 3' }).check();
    expect(await lies(p)).toEqual({ A: 1, B: 3 });
    await p.getByRole('radio', { name: 'Grün' }).check();
    expect(await p.locator('[data-frage="B"]').count()).toBe(0);
    expect(await lies(p)).toEqual({ A: 2 });
  });
  it('schon beim Zeichnen gezeigt: keine Ansage; bedingter Hinweis folgt derselben Regel', async () => {
    const p = await neu(); await zeichne(p, P, 's-filter', { A: 1 });
    expect(await p.locator('[data-frage="B"]').count()).toBe(1);
    expect(await ansage(p)).toBe('');
    await zeichne(p, P, 's-hinweis', { A: 1 });
    expect(await p.locator('[data-hinweis="H2"]').count()).toBe(1);
  });
  it('Antwort von einer früheren Seite steuert die Filter dieser Seite', async () => {
    const q = plan([seite('s1', [frage('A', 'einfach', { liste: 'farben' })]), seite('s2', [frage('B', 'text', { wennGezeigt: { frage: 'A', ist: '=', wert: 3 } })])]);
    const p = await neu(); await zeichne(p, q, 's2', { A: 3 });
    expect(await p.locator('[data-frage="B"]').count()).toBe(1);
    await zeichne(p, q, 's2', { A: 2 });
    expect(await p.locator('[data-frage="B"]').count()).toBe(0);
  });
});

/* ================================================================== Ansage über Aufrufer */
describe('Ansage', () => {
  it('Region und optionen.ansage bekommen denselben Text (Spiegel für die gemeinsame Region von Statable)', async () => {
    const p = await neu(); await zeichne(p, P, 's-rang');
    await p.getByRole('button', { name: 'Arbeit nach oben', exact: true }).click();
    expect(await ansage(p)).toBe('Arbeit jetzt auf Platz 1 von 5');
    expect(await p.evaluate(() => (window as any).__ansagen.at(-1))).toBe('Arbeit jetzt auf Platz 1 von 5');
  });
});
