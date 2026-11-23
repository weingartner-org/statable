import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  KUERZEL, AKTIONEN, finde, tastePasst, zeige, kuerzelAttribut, reiterHashes, reiterIndex, reiterKuerzel, reiterTitel,
  beschreibeStelle, imEingabefeld, type Kn, type TastenEreignis, type Kuerzel,
} from './kuerzel';

/** Wächter Barrierefreiheit Welle 2 (Tastatur): Die Kürzel stehen in EINER Liste (`kuerzel.ts`).
 *  - Jede Zeile hat einen Empfänger (`AKTIONEN`) oder `extern` mit Datei und Marke, die dort wirklich steht.
 *  - Es gibt keinen globalen Tasten-Handler (window/document) außerhalb der Ausnahmeliste, und jede Ausnahme hat einen Grund.
 *  - Keine Taste doppelt; keine Taste, die NVDA (nvda-tasten.json) oder der Browser (browser-sperre.json) belegt; keine blanke Einzeltaste global (WCAG 2.1.4).
 *  - Alt wird nie nur über `e.key` erkannt (QWERTZ: Z-Taste meldet code KeyY; Mac: Wahl+Taste erzeugt Sonderzeichen). */

const SRC = fileURLToPath(new URL('..', import.meta.url));
const DOCS = fileURLToPath(new URL('../../../docs/barrierefreiheit/', import.meta.url));

function dateien(ordner: string, aus: string[] = []): string[] {
  for (const n of readdirSync(ordner)) {
    const p = join(ordner, n);
    if (statSync(p).isDirectory()) { if (n !== 'node_modules') dateien(p, aus); }
    else if (/\.(svelte|ts)$/.test(n) && !/\.test\.ts$/.test(n) && !/\.d\.ts$/.test(n)) aus.push(p);
  }
  return aus;
}
const rel = (p: string) => p.slice(SRC.length).replace(/\\/g, '/');
const quellen = (): Map<string, string> => new Map(dateien(SRC).map(p => [rel(p), readFileSync(p, 'utf8')]));

/* ---------- Globale Tasten-Handler ---------- */

const GLOBAL = [
  /(?<![\w.$?])addEventListener\(\s*['"]key(?:down|up|press)['"]/,                   // addEventListener('keydown', ...) am Fenster
  /\b(?:window|document)\??\.addEventListener\(\s*['"]key(?:down|up|press)['"]/,      // window./document.addEventListener
  /<svelte:(?:window|document|body)[^>]*\bonkey(?:down|up|press)/,                    // <svelte:window onkeydown={...}>
  /for \(const \w+ of \[[^\]]*['"]keydown['"][^\]]*\]\)\s*addEventListener/,         // Schleife über Ereignisnamen am Fenster
];
/** Datei (relativ zu app/src) -> Grund, warum sie einen globalen Tasten-Handler haben darf. */
export const GLOBAL_AUSNAHMEN: Record<string, string> = {
  'App.svelte': 'Zentraler Handler: ruft `behandle` (lib/kuerzel.ts) und hält Esc für Meldungen, Strg+Z/Y und Strg+S/Umschalt+S (stehen als extern in der Liste).',
  'lib/begriffsstart.svelte.ts': 'Esc in der Seitenleiste geht eine Ebene zurück, wirkt nur, wenn der Fokus in `aside.rand` steht.',
  'bausteine/Melden.svelte': 'Alt+Umschalt+P öffnet Melden (steht als extern in der Liste); Capture, damit es auch aus Feldern und Fenstern wirkt.',
  'bausteine/Tipp.svelte': 'Esc schickt den Hinweis weg, wirkt nur, solange einer sichtbar ist.',
  'seiten/Hilfe.svelte': 'Strg+/ setzt den Fokus ins Suchfeld der Hilfe (steht als extern in der Liste); Strg ist dabei, also keine Einzeltaste.',
  'bausteine/DatenSuchen.svelte': 'Strg+Bild ab/auf und F3 (Umschalt+F3) gehen zum nächsten oder vorigen Treffer, wirken nur, solange gesucht wird und es Treffer gibt (Strg ist dabei, F3 ist keine Zeichentaste).',
  'seiten/Daten.svelte': 'Esc schließt den Daten-Check, wirkt nur, solange er offen ist.',
  'lib/zaehlen.ts': 'Zählt nur „Mensch ist aktiv“ (passiv, ohne Wirkung auf die Seite).',
  'lib/spendenerinnerung.svelte.ts': 'Zählt nur „Mensch ist aktiv“ für die Spendenerinnerung nach 10 Stunden (passiv, ohne Wirkung auf die Seite, nichts geht an einen Server).',
  'bausteine/TranskriptAnsicht.svelte': 'F4, F8, F9, Umschalt+F8/F9 und Umschalt+F4 steuern die Aufnahme (stehen als extern in der Liste); wirken nur, solange ein Transkript geöffnet ist, auch im Textfeld, und nur mit geladener Aufnahme (sonst bleibt die Taste frei).',
  'seiten/Fragebogen.svelte': 'Strg+Z macht auf der Seite „Fragebogen planen“ die letzte Planänderung rückgängig (eigener Verlauf des Plans); wirkt nicht in Feldern und nicht bei offenem Dialog (Erheben 2C, Opus 08.11.).',
};
export function findeGlobaleHandler(q: Map<string, string>): string[] {
  const treffer: string[] = [];
  for (const [datei, text] of q) if (GLOBAL.some(r => r.test(text))) treffer.push(datei);
  return treffer.sort();
}

/* ---------- Alt nie nur über e.key ---------- */

/** Verlangt die Datei die Alt-Taste als Bedingung (nicht: schließt sie aus)? */
const VERLANGT_ALT = /if \(\s*!\w+\.altKey\b|(?<!!)\b\w+\.altKey\s*&&|return\s+\w+\.altKey/;
/** Dateien, die Alt über `e.code` oder den Helfer erkennen. */
const ALT_SICHER = /\.code\b|istAltZ|tastePasst/;
export const ALT_AUSNAHMEN: Record<string, string> = {
  'bausteine/Reihenfolge.svelte': 'Alt+Pfeil hoch/runter: Pfeiltasten heißen in jeder Tastaturbelegung gleich (key ArrowUp/ArrowDown), nur auf einem Eintrag der Übung.',
  'bausteine/FragebogenGliederung.svelte': 'Alt+Pfeil hoch/runter verschiebt ein Element der Gliederung; Pfeiltasten heißen in jeder Belegung gleich, nur auf einem Eintrag der Gliederung (Erheben 2C, Opus 08.11.).',
};
export function findeAltNurKey(q: Map<string, string>): string[] {
  return [...q].filter(([d, t]) => VERLANGT_ALT.test(t) && !ALT_SICHER.test(t) && !(d in ALT_AUSNAHMEN)).map(([d]) => d).sort();
}

/* ---------- Tastennamen ---------- */

const MOD_DE: Record<string, string> = { keine: '', umschalt: 'Umschalt+', alt: 'Alt+', strg: 'Strg+', 'strg+umschalt': 'Strg+Umschalt+', 'alt+umschalt': 'Alt+Umschalt+' };
/** Alle deutschen Schreibweisen der Tasten einer Zeile, so wie NVDA-Handbuch und Browser-Liste sie nennen könnten. */
export function namen(k: Kuerzel): string[] {
  return k.tasten.flatMap(t => {
    const b = /^Key(.)$/.exec(t)?.[1] ?? /^Digit(\d)$/.exec(t)?.[1];
    const ort = b ? [b] : t === 'PageDown' ? ['Bild ab', 'Seite nach unten'] : t === 'PageUp' ? ['Bild auf', 'Seite nach oben'] : t === 'Escape' ? ['Esc', 'Escape', 'Escape-Taste'] : t === 'Enter' ? ['Eingabetaste', 'Eingabe'] : t === 'Slash' ? ['/'] : t === 'ArrowUp' ? ['Pfeil nach oben'] : t === 'ArrowDown' ? ['Pfeil nach unten'] : [t];
    return ort.map(o => (MOD_DE[k.mod] + o).toLowerCase());
  });
}
/** Zerlegt einen Eintrag aus den Listen in einzelne Kombinationen: „A oder B“, „A, B“ und Bereiche „Strg+1 bis Strg+9“. */
export function zerlege(eintrag: string): string[] {
  const aus: string[] = [];
  for (const teil of eintrag.split(/\s+oder\s+|,\s*/)) {
    const m = /^(.*?)(\d)\s+bis\s+.*?(\d)$/.exec(teil.trim());
    if (m) { for (let n = Number(m[2]); n <= Number(m[3]); n++) aus.push((m[1]! + n).toLowerCase()); }
    else aus.push(teil.trim().toLowerCase());
  }
  return aus;
}
const lese = <T>(datei: string): T => JSON.parse(readFileSync(join(DOCS, datei), 'utf8')) as T;

/* ---------- Attrappen ---------- */

interface Attr { [k: string]: string }
function kn(tag: string, attr: Attr = {}, text = '', bereiche: Record<string, Kn> = {}, extra: Partial<Kn> = {}): Kn {
  const k: Kn = {
    tagName: tag.toUpperCase(), textContent: text,
    getAttribute: n => (n in attr ? attr[n]! : null),
    closest: sel => (sel in bereiche ? bereiche[sel]! : null),
    ...extra,
  };
  return k;
}
const ev = (key: string, code: string, o: Partial<TastenEreignis> = {}): TastenEreignis => ({ key, code, altKey: false, ctrlKey: false, metaKey: false, shiftKey: false, ...o });

/* ================================================================ */

describe('Liste KUERZEL', () => {
  it('jede Zeile hat einen Empfänger oder extern mit Datei und Marke, die dort steht', () => {
    for (const k of KUERZEL) {
      if (k.extern) {
        const p = join(SRC, k.extern.datei);
        expect(existsSync(p), `${k.id}: Datei ${k.extern.datei} fehlt`).toBe(true);
        expect(readFileSync(p, 'utf8').includes(k.extern.marke), `${k.id}: Marke „${k.extern.marke}“ steht nicht in ${k.extern.datei}`).toBe(true);
      } else expect(typeof AKTIONEN[k.id], `${k.id}: keine Aktion`).toBe('function');
    }
  });
  it('jede Aktion gehört zu einer Zeile ohne extern', () => {
    for (const id of Object.keys(AKTIONEN)) expect(KUERZEL.some(k => k.id === id && !k.extern), `Aktion ${id} ohne Zeile`).toBe(true);
  });
  it('Ids und Tasten sind eindeutig', () => {
    expect(new Set(KUERZEL.map(k => k.id)).size).toBe(KUERZEL.length);
    const gesehen = new Map<string, string>();
    for (const k of KUERZEL) for (const t of k.tasten) {
      const schluessel = `${k.mod}+${t}`;
      if (gesehen.has(schluessel) && (k.teilt === gesehen.get(schluessel))) continue;   // dieselbe Taste an zwei Orten, die sich nie überschneiden (Feld `teilt`, Opus 08.11.)
      expect(gesehen.has(schluessel), `${k.id} und ${gesehen.get(schluessel)} belegen beide ${schluessel}`).toBe(false);
      gesehen.set(schluessel, k.id);
    }
  });
  it('keine Taste, die NVDA oder der Browser belegt (für die neuen Kürzel ohne extern)', () => {
    const nvda = new Set(lese<{ tasten: { taste: string | null }[] }>('nvda-tasten.json').tasten.flatMap(t => (t.taste ? zerlege(t.taste) : [])));
    const sperre = new Set(lese<{ sperren: { taste: string }[] }>('browser-sperre.json').sperren.flatMap(t => zerlege(t.taste)));
    expect(nvda.size).toBeGreaterThan(100);
    expect(sperre.size).toBeGreaterThan(10);
    for (const k of KUERZEL.filter(x => !x.extern)) for (const n of namen(k)) {
      expect(nvda.has(n), `${k.id}: ${n} steht in nvda-tasten.json`).toBe(false);
      expect(sperre.has(n), `${k.id}: ${n} steht in browser-sperre.json`).toBe(false);
    }
  });
  it('keine blanke Einzeltaste global: jede Zeile ohne Modifikator sagt, wo sie gilt', () => {
    for (const k of KUERZEL.filter(x => x.mod === 'keine')) expect(typeof k.gilt, `${k.id}: Einzeltaste ohne „gilt“`).toBe('function');
  });
  it('jede Zeile hat Text und Wirkung', () => {
    for (const k of KUERZEL) { expect(k.text().length, k.id).toBeGreaterThan(2); expect(k.wirkung().length, k.id).toBeGreaterThan(5); expect(k.anzeige.length).toBeGreaterThan(0); }
  });
});

describe('Quelltext-Wächter', () => {
  it('globale Tasten-Handler nur in der Ausnahmeliste, jede mit Grund', () => {
    const q = quellen();
    expect(q.size).toBeGreaterThan(100);
    const fremd = findeGlobaleHandler(q).filter(d => !(d in GLOBAL_AUSNAHMEN));
    expect(fremd, `globale keydown-Handler ohne Eintrag in GLOBAL_AUSNAHMEN: ${fremd.join(', ')}`).toEqual([]);
    for (const [d, grund] of Object.entries(GLOBAL_AUSNAHMEN)) { expect(grund.length, d).toBeGreaterThan(20); expect(q.has(d), `Ausnahme ${d} gibt es nicht`).toBe(true); }
  });
  it('die Ausnahmeliste ist nicht zu großzügig: jede Datei darin hat noch einen globalen Handler', () => {
    const q = quellen(); const da = new Set(findeGlobaleHandler(q));
    for (const d of Object.keys(GLOBAL_AUSNAHMEN)) expect(da.has(d), `${d} hat keinen globalen Handler mehr - Ausnahme streichen`).toBe(true);
  });
  it('Alt wird nie nur über e.key erkannt', () => {
    const q = quellen();
    const schlecht = findeAltNurKey(q);
    expect(schlecht, `Alt nur über e.key in: ${schlecht.join(', ')}`).toEqual([]);
    for (const d of Object.keys(ALT_AUSNAHMEN)) expect(q.has(d), d).toBe(true);
  });
  it('Fühler: der Wächter erkennt eingepflanzte Fehler', () => {
    const fehl = new Map([['x.svelte', "<svelte:window onkeydown={(e) => { if (e.key === 'q') tu(); }} />"], ['y.ts', "if (e.altKey && e.key === 'k') tu();"], ['z.ts', "document.addEventListener('keydown', f);"]]);
    expect(findeGlobaleHandler(fehl)).toEqual(['x.svelte', 'z.ts']);
    expect(findeAltNurKey(fehl)).toEqual(['y.ts']);
    expect(findeAltNurKey(new Map([['ok.ts', "if (e.altKey && e.code === 'KeyK') tu();"]]))).toEqual([]);
    expect(findeGlobaleHandler(new Map([['lokal.svelte', "ort.addEventListener('keydown', f); liste?.addEventListener('keydown', g);"]]))).toEqual([]);
  });
});

describe('Tasten erkennen (Tastaturlayout)', () => {
  it('deutsche Tastatur: Alt+Z meldet key z, code KeyY - gilt als Alt+Z', () => expect(finde(ev('z', 'KeyY', { altKey: true }))?.id).toBe('zurueck'));
  it('deutsche Tastatur: die Y-Taste (key y, code KeyZ) ist nicht Alt+Z', () => expect(finde(ev('y', 'KeyZ', { altKey: true }))).toBeUndefined());
  it('Mac: Wahl+Taste erzeugt ein Sonderzeichen, der Tastenort zählt', () => expect(finde(ev('†', 'KeyT', { altKey: true }))?.id).toBe('liste'));
  it('andere Schrift: key kein lateinischer Buchstabe, der Tastenort zählt', () => expect(finde(ev('к', 'KeyK', { altKey: true }))?.id).toBe('farben'));
  it('Alt+Ziffern über den Tastenort, auch wenn key etwas anderes ist (Mac, französische Tastatur)', () => {
    expect(finde(ev('1', 'Digit1', { altKey: true }))?.id).toBe('reiter-ziffer');
    expect(finde(ev('¡', 'Digit1', { altKey: true }))?.id).toBe('reiter-ziffer');
    expect(finde(ev('&', 'Digit1', { altKey: true }))?.id).toBe('reiter-ziffer');
  });
  it('Alt+Bild ab und auf', () => { expect(finde(ev('PageDown', 'PageDown', { altKey: true }))?.id).toBe('reiter-weiter'); expect(finde(ev('PageUp', 'PageUp', { altKey: true }))?.id).toBe('reiter-zurueck'); });
  it('Strg+K und Cmd+K, nicht mit Alt oder Umschalt', () => {
    expect(finde(ev('k', 'KeyK', { ctrlKey: true }))?.id).toBe('palette');
    expect(finde(ev('k', 'KeyK', { metaKey: true }))?.id).toBe('palette');
    expect(finde(ev('k', 'KeyK', { ctrlKey: true, shiftKey: true }))).toBeUndefined();
    expect(finde(ev('k', 'KeyK', { ctrlKey: true, altKey: true }))).toBeUndefined();
  });
  it('AltGr (Strg+Alt) bleibt unberührt: AltGr+Q ist das @', () => expect(finde(ev('@', 'KeyQ', { ctrlKey: true, altKey: true }))).toBeUndefined());
  it('Alt mit Umschalt oder Strg ist kein Alt+Buchstabe', () => { expect(finde(ev('T', 'KeyT', { altKey: true, shiftKey: true }))).toBeUndefined(); expect(finde(ev('t', 'KeyT', { altKey: true, ctrlKey: true }))).toBeUndefined(); });
  it('blanke Buchstaben und Ziffern lösen nichts aus', () => { expect(finde(ev('k', 'KeyK'))).toBeUndefined(); expect(finde(ev('1', 'Digit1'))).toBeUndefined(); });
  it('Kürzel mit eigenem Empfänger anderswo (extern) trifft finde nicht', () => { expect(finde(ev('s', 'KeyS', { ctrlKey: true }))).toBeUndefined(); expect(finde(ev('P', 'KeyP', { altKey: true, shiftKey: true }))).toBeUndefined(); });
  it('tastePasst: Buchstabe über key, sonst Ort', () => { expect(tastePasst('KeyZ', { key: 'z', code: 'KeyY' })).toBe(true); expect(tastePasst('KeyZ', { key: 'y', code: 'KeyZ' })).toBe(false); expect(tastePasst('KeyZ', { key: 'Ω', code: 'KeyZ' })).toBe(true); });
});

describe('Anzeige', () => {
  it('Mac: Alt heißt Wahl, Strg heißt Cmd; Windows bleibt', () => {
    expect(zeige('Alt+T', true)).toBe('Wahl+T'); expect(zeige('Strg+K', true)).toBe('Cmd+K'); expect(zeige('Alt+T', false)).toBe('Alt+T');
  });
  it('aria-keyshortcuts bleibt in ARIA-Schreibweise (Alt+X), auch für den Mac', () => {
    expect(kuerzelAttribut('alt', 'KeyH')).toBe('Alt+H'); expect(kuerzelAttribut('alt', 'Digit3')).toBe('Alt+3'); expect(kuerzelAttribut('strg', 'KeyK')).toBe('Control+K'); expect(kuerzelAttribut('alt', 'PageDown')).toBe('Alt+PageDown');
  });
});

describe('Reiter', () => {
  const ids = ['a1', 'b2'];
  it('Reihenfolge wie im Kopf: Daten, Blätter, Neue Auswertung, Bericht, Befehle, Protokoll', () => {
    expect(reiterHashes(ids)).toEqual(['daten', 'blatt/a1', 'blatt/b2', 'blatt/neu', 'bericht', 'befehle', 'protokoll']);
  });
  it('Spalten, Umformen, Bearbeiten zählen zu Daten; unbekannte Seite: -1', () => {
    const h = reiterHashes(ids);
    expect(reiterIndex(h, '#daten')).toBe(0); expect(reiterIndex(h, 'spalten')).toBe(0); expect(reiterIndex(h, 'umformen/x')).toBe(0);
    expect(reiterIndex(h, 'blatt/b2')).toBe(2); expect(reiterIndex(h, 'hilfe')).toBe(-1);
  });
  it('Titel', () => { expect(reiterTitel('blatt/a1', [{ id: 'a1', titel: 'Alter nach Gruppe' }])).toBe('Alter nach Gruppe'); expect(reiterTitel('bericht', [])).toBe('Bericht'); });
  it('aria-keyshortcuts: Alt+Nummer bis 9, dazu das eigene Kürzel', () => {
    expect(reiterKuerzel(ids, 'daten')).toBe('Alt+1'); expect(reiterKuerzel(ids, 'blatt/neu', 'Alt+N')).toBe('Alt+4 Alt+N'); expect(reiterKuerzel(ids, 'bericht', 'Alt+B')).toBe('Alt+5 Alt+B');
    const viele = Array.from({ length: 12 }, (_, i) => 'x' + i);
    expect(reiterKuerzel(viele, 'blatt/x11')).toBeUndefined(); expect(reiterKuerzel(viele, 'bericht', 'Alt+B')).toBe('Alt+B');
  });
});

describe('beschreibeStelle (Alt+W)', () => {
  const nav = kn('nav', { 'aria-label': 'Heft' });
  const haupt = kn('main');
  it('Knopf im Hauptbereich im Reiter: Reiter, Bereich, Rolle und Name', () => {
    const b = kn('button', {}, 'Rechnen', { main: haupt });
    expect(beschreibeStelle(b, { reiter: { nr: 2, von: 5, titel: 'Alter nach Gruppe' } })).toBe('Reiter 2 von 5: Alter nach Gruppe. Bereich: Hauptbereich. Schaltfläche „Rechnen“.');
  });
  it('Link in der Navigation: Bereich mit Namen; aria-label geht vor Text', () => {
    const a = kn('a', { 'aria-label': 'Auswertung schließen' }, 'x', { nav });
    expect(beschreibeStelle(a, { seite: 'Hilfe' })).toBe('Seite: Hilfe. Bereich: Navigation Heft. Link „Auswertung schließen“.');
  });
  it('Name über aria-labelledby', () => {
    const feld = kn('input', { type: 'search', 'aria-labelledby': 'l1' }, '', { main: haupt }, { ownerDocument: { getElementById: id => (id === 'l1' ? { textContent: 'Hilfe durchsuchen' } : null) } });
    expect(beschreibeStelle(feld)).toBe('Bereich: Hauptbereich. Suchfeld „Hilfe durchsuchen“.');
  });
  it('Überschrift mit Ebene', () => expect(beschreibeStelle(kn('h1', {}, 'Daten', { main: haupt }), { reiter: { nr: 1, von: 4, titel: 'Daten' } })).toBe('Reiter 1 von 4: Daten. Bereich: Hauptbereich. Überschrift Ebene 1 „Daten“.'));
  it('Tabellenzelle: Zeile, Spalte, Spaltenkopf und Zeilenkopf (langer Name aus aria-label)', () => {
    const kopf0 = kn('th', {}, 'Gruppe'), kopf1 = kn('th', { 'aria-label': 'Mittelwert in Jahren' }, 'MW'), zk = kn('th', {}, 'A'), zelle = kn('td', {}, '3,2');
    const tabelle = kn('table', {}, '', {}, { rows: [{ cells: [kopf0, kopf1] }, { cells: [zk, zelle] }] });
    zelle.cellIndex = 1; zelle.parentElement = { ...kn('tr'), rowIndex: 1 };
    zelle.closest = sel => (sel === 'td, th' ? zelle : sel === 'table' ? tabelle : sel === 'main' ? haupt : null);
    expect(beschreibeStelle(zelle, { reiter: { nr: 2, von: 5, titel: 'Tabelle' } })).toBe('Reiter 2 von 5: Tabelle. Bereich: Hauptbereich. Tabellenzelle „3,2“. Zeile 2, Spalte 2, Spaltenkopf Mittelwert in Jahren, Zeilenkopf A.');
  });
  it('Zeilenkopfzelle: Rolle, Zeile und Spalte, keine Ecke als Spaltenkopf', () => {
    const ecke = kn('th', { 'aria-label': 'Zeile. Spaltenköpfe: Bezeichnungen' }), zk = kn('th', { scope: 'row' }, '1');
    const tabelle = kn('table', {}, '', {}, { rows: [{ cells: [ecke] }, { cells: [zk] }] });
    zk.cellIndex = 0; zk.parentElement = { ...kn('tr'), rowIndex: 1 };
    zk.closest = sel => (sel === 'td, th' ? zk : sel === 'table' ? tabelle : null);
    expect(beschreibeStelle(zk)).toBe('Zeilenkopfzelle „1“. Zeile 2, Spalte 1.');
  });
  it('Dialog geht vor Hauptbereich', () => {
    const dlg = kn('dialog', { 'aria-labelledby': 't' }, '', {}, { ownerDocument: { getElementById: () => ({ textContent: 'Melden' }) } });
    expect(beschreibeStelle(kn('button', {}, 'Senden', { 'dialog, [role=dialog]': dlg, main: haupt }))).toBe('Bereich: Dialog Melden. Schaltfläche „Senden“.');
  });
  it('kein Element im Fokus', () => expect(beschreibeStelle(null)).toBe('Kein Element im Fokus.'));
  it('nur Reiter, wenn kein Element da ist', () => expect(beschreibeStelle(null, { reiter: { nr: 1, von: 4, titel: 'Daten' } })).toBe('Reiter 1 von 4: Daten.'));
});

describe('imEingabefeld: Alt-Kürzel gelten auch auf Schaltern', () => {
  const el = (tagName: string, type = '', isContentEditable = false) => ({ tagName, type, isContentEditable }) as unknown as EventTarget;
  it('Textfelder, Textbereiche, Auswahllisten und bearbeitbare Stellen sind Eingabefelder', () => {
    for (const t of ['text', 'search', 'number', 'email', '']) expect(imEingabefeld(el('INPUT', t)), t).toBe(true);
    expect(imEingabefeld(el('TEXTAREA'))).toBe(true);
    expect(imEingabefeld(el('SELECT'))).toBe(true);
    expect(imEingabefeld(el('DIV', '', true))).toBe(true);
  });
  it('Checkbox, Radio, Regler und Knopf-Eingaben sind keine Eingabefelder', () => {
    for (const t of ['checkbox', 'radio', 'range', 'button', 'submit', 'reset', 'color']) expect(imEingabefeld(el('INPUT', t)), t).toBe(false);
    expect(imEingabefeld(null)).toBe(false);
  });
});
