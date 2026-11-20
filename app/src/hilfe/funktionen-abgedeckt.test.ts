/**
 * Wächter „Funktionen abgedeckt“ (Bauplan Nutzen/Erklären, Stufe 1.2): Für jede Funktion aus `funktionen-liste.ts` wird gemessen,
 * ob es Hilfe, Lehre und einen Fundort über die Suche gibt. Wer keines davon hat, steht mit Grund in OHNE_HILFE, OHNE_LEHRE oder OHNE_FUNDORT.
 * Die Listen dürfen nur kürzer werden: Ein Eintrag, der inzwischen abgedeckt ist, lässt den Test scheitern („streichen“).
 * Mit NUTZEN_BERICHT=1 schreibt der Test die volle Tabelle nach docs/nutzen/bestand-funktionen.json (sonst schreibt er nichts).
 */
import { describe, expect, it } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { artikelListe, type Artikel } from './artikel';
import { suche } from './suche';
import { FUNKTIONEN, GRUPPEN, QUALITAET_KACHELN, type Funktion } from './funktionen-liste';
import { EINHEITEN, type Einheit } from '../lernen/lernplan';
import { BEISPIELE } from '../lib/beispiele';
import { FACH_MATRIX } from '../lib/fach';

/* ---------- Ausnahmelisten (id → Grund). Nur kürzer werden lassen. ---------- */
const OHNE_HILFE: Record<string, string> = {};
const OHNE_LEHRE: Record<string, string> = {
  'qca-konfigurationen': 'Die Lehre gehört ins Vorhaben erheben (Mixed Methods, Fälle vergleichen nach Schoonenboom); darum keine zweite Einheit hier',
  'bevoelkerungspyramide': 'Diagrammart, kein eigenes Verfahren',
  'fallgewicht': 'Werkzeug der Datenseite, nur Hilfe nötig',
  'daten-suchen': 'Werkzeug der Datenseite, nur Hilfe nötig',
  'eurostat': 'Spezialwerkzeug, nur Hilfe nötig',
  'raking': 'Spezialwerkzeug, nur Hilfe nötig',
  'kalibrieren-gewichte': 'Spezialwerkzeug, nur Hilfe nötig',
  'vorlage-protokoll': 'Spezialwerkzeug, nur Hilfe nötig',
  'karte-gebiete': 'Spezialwerkzeug, nur Hilfe nötig',
  'tabelle-zusammenstellen': 'Spezialwerkzeug, nur Hilfe nötig',
  'export-ergebnis-word': 'Export, nur Hilfe nötig',
  'export-ergebnis-pdf': 'Export, nur Hilfe nötig',
  'export-ergebnis-excel': 'Export, nur Hilfe nötig',
  'export-tabelle': 'Export, nur Hilfe nötig',
  'export-daten': 'Export, nur Hilfe nötig',
  'export-bericht': 'Export, nur Hilfe nötig',
  'export-projekt': 'Export, nur Hilfe nötig',
};
const OHNE_FUNDORT: Record<string, string> = {};

/* ---------- Messung ---------- */
const de = artikelListe('de'), en = artikelListe('en');
const deNachId = new Map<string, Artikel>(de.map(a => [a.id, a]));
const enIds = new Set(en.map(a => a.id));
const TOP = 10;   // „gefunden“ heißt: ein Artikel der Funktion steht unter den ersten zehn Treffern

/** Hat der Artikel einen Teil „So geht es in Statable“ (Klickweg)? Sonst Heuristik: er nennt „Neue Auswertung“ oder „Weitere Auswertungen“ als Weg. */
function hatStatableTeil(a: Artikel): boolean {
  if (a.inhalt.some(b => typeof b !== 'string' && 'h' in b && /^So geht es( in Statable)?(:.*)?$/.test(b.h))) return true;
  const text = a.inhalt.map(b => (typeof b === 'string' ? b : 'ol' in b ? b.ol.join(' ') : 'ul' in b ? b.ul.join(' ') : '')).join(' ');
  // Begriffe (A-Z) haben den Teil als Absatz „So geht es in Statable: …“ (Feld `statable`)
  return /„Neue Auswertung“|„Weitere Auswertungen“|(^| )So geht es in Statable: /.test(text);
}
/** Einheiten, die eine Funktion lehren: Karte, Hilfe-Artikel oder (bei Lernlabor und Verstehen) der Regler `probieren`. */
function einheitenVon(f: Funktion): Einheit[] {
  if (f.gruppe === 'verstehen') {
    const [art, ...rest] = f.id.split('-'), id = rest.join('-');
    const passt = (p: string) => art === 'labor' ? p === `lernlabor/${id}` : art === 'probieren' ? p === `probieren/${id}` : id === 'lernlabor' ? p.startsWith('lernlabor') : p.split('/')[0] === id;
    return EINHEITEN.filter(e => e.probieren.some(passt));
  }
  return EINHEITEN.filter(e => (f.gruppe === 'neue-auswertung' && e.karte === f.id) || f.hilfe.some(h => e.hilfe.includes(h)));
}
const schrittKarten = new Set(BEISPIELE.flatMap(b => b.schritte.map(s => s.art)));
const treffer = (liste: Artikel[], q: string | undefined, sp: 'de' | 'en', ids: string[]) =>
  !!q && suche(liste, q, sp).slice(0, TOP).some(t => ids.includes(t.artikel.id));
const SPSS_MENUE = deNachId.get('spss-menue')!;
const spssText = SPSS_MENUE.inhalt.map(b => (typeof b === 'string' ? b : 'ul' in b ? b.ul.join(' ') : 'ol' in b ? b.ol.join(' ') : '')).join(' ');

interface Zeile {
  id: string; gruppe: string; name: string; hilfe: string[]; hilfeDa: boolean; hilfeStatable: boolean; einheiten: string[]; fragen: number; rechnen: boolean; probieren: boolean;
  suche: { fach: boolean | null; en: boolean | null; spss: boolean | null }; fundorte: string[];
}
function messe(f: Funktion): Zeile {
  const da = f.hilfe.filter(h => deNachId.has(h) && enIds.has(h));
  const eh = einheitenVon(f);
  const q = f.suche ?? {};
  const fach = da.length ? treffer(de, q.fach ?? f.name.de, 'de', da) : null;
  const eng = da.length ? treffer(en, q.en ?? f.name.en, 'en', da) : null;
  // SPSS-Name: findet die Suche den Artikel der Funktion oder die SPSS-Übersicht, und steht der Name dort wirklich?
  const spss = f.spss && da.length ? treffer(de, f.spss, 'de', [...da, 'spss-menue']) && (/^(Datei|Variablenansicht|Syntax)/.test(f.spss) || spssText.toLowerCase().includes(f.spss.toLowerCase().split(' ')[0]!)) : null;
  const fundorte: string[] = [];
  if (fach) fundorte.push('suche-fach');
  if (eng) fundorte.push('suche-en');
  if (spss) fundorte.push('suche-spss');
  const karte = f.karte ?? (f.gruppe === 'neue-auswertung' ? f.id : undefined);
  if (f.gruppe === 'neue-auswertung') fundorte.push('kachel', 'palette');
  if (QUALITAET_KACHELN.some(k => k.funktion === f.id)) fundorte.push('kachel-qualitaet', 'palette');
  if (f.gruppe === 'verstehen') fundorte.push('verstehen-seite');
  if (f.gruppe === 'rechner') fundorte.push('planen-seite', 'palette');
  if (f.gruppe === 'assistent' || f.gruppe === 'datenwerkzeug') fundorte.push('daten-menue');
  if (f.gruppe === 'export') fundorte.push('export-menue');
  if (da.length) fundorte.push('palette-hilfe');
  if (karte && FACH_MATRIX[karte] && f.gruppe !== 'weitere') fundorte.push('fach-schalter');
  if (karte && f.gruppe === 'neue-auswertung' && schrittKarten.has(karte)) fundorte.push('beispiel-schritt');
  if (eh.length) fundorte.push('lernen-einheit');
  return {
    id: f.id, gruppe: f.gruppe, name: f.name.de, hilfe: f.hilfe, hilfeDa: da.length > 0, hilfeStatable: da.some(h => hatStatableTeil(deNachId.get(h)!)),
    einheiten: eh.map(e => e.id), fragen: eh.reduce((n, e) => n + e.fragen.length, 0), rechnen: eh.some(e => (e.rechnen?.length ?? 0) > 0), probieren: eh.some(e => e.probieren.length > 0 || e.beispiele.length > 0),
    suche: { fach, en: eng, spss: spss === null ? null : !!spss }, fundorte: [...new Set(fundorte)]
  };
}
const ZEILEN = FUNKTIONEN.map(messe);
// Fundort zählt nur bei Funktionen mit Hilfe-Artikel (ohne Artikel kann die Suche nichts finden: das steht schon in OHNE_HILFE).
const ohneHilfe = ZEILEN.filter(z => !z.hilfeDa).map(z => z.id);
const ohneLehre = ZEILEN.filter(z => z.einheiten.length === 0).map(z => z.id);
const ohneFundort = ZEILEN.filter(z => z.hilfeDa && !(z.suche.fach && z.suche.en)).map(z => z.id);

/** Liste und Messung müssen übereinstimmen: nichts fehlt, nichts ist zu viel. */
function pruefe(liste: Record<string, string>, fehlt: string[], was: string) {
  const unbekannt = Object.keys(liste).filter(id => !FUNKTIONEN.some(f => f.id === id));
  expect(unbekannt, `${was}: Einträge ohne Funktion`).toEqual([]);
  expect(fehlt.filter(id => !(id in liste)), `${was}: neue Lücke - Funktion mit Hilfe, Lehre oder Fundort versehen oder mit Grund eintragen`).toEqual([]);
  expect(Object.keys(liste).filter(id => !fehlt.includes(id)), `${was}: inzwischen abgedeckt - streichen`).toEqual([]);
  expect(Object.entries(liste).filter(([, g]) => g.trim().length < 8).map(([id]) => id), `${was}: Grund fehlt`).toEqual([]);
}

describe('Funktionen abgedeckt', () => {
  it('Kennungen sind eindeutig, jede Funktion hat Namen und Quelle', () => {
    expect(new Set(FUNKTIONEN.map(f => f.id)).size).toBe(FUNKTIONEN.length);
    for (const f of FUNKTIONEN) { expect(f.name.de.length, f.id).toBeGreaterThan(2); expect(f.name.en.length, f.id).toBeGreaterThan(2); expect(f.quelle.length, f.id).toBeGreaterThan(5); }
    expect(new Set(FUNKTIONEN.map(f => f.gruppe))).toEqual(new Set(GRUPPEN.map(g => g.id)));
  });
  it('Hilfe: jede Funktion hat einen Artikel (deutsch und englisch) oder steht in OHNE_HILFE', () => { pruefe(OHNE_HILFE, ohneHilfe, 'OHNE_HILFE'); });
  it('Lehre: jede Funktion kommt in einer Einheit vor oder steht in OHNE_LEHRE', () => { pruefe(OHNE_LEHRE, ohneLehre, 'OHNE_LEHRE'); });
  it('Fundort: die Suche findet jede Funktion mit Hilfe über Fachbegriff und englischen Namen oder sie steht in OHNE_FUNDORT', () => { pruefe(OHNE_FUNDORT, ohneFundort, 'OHNE_FUNDORT'); });
  it('Bericht (nur mit NUTZEN_BERICHT=1): Tabelle nach docs/nutzen/bestand-funktionen.json', () => {
    if (!process.env.NUTZEN_BERICHT) return;
    const ziel = fileURLToPath(new URL('../../../docs/nutzen/bestand-funktionen.json', import.meta.url));
    mkdirSync(fileURLToPath(new URL('../../../docs/nutzen/', import.meta.url)), { recursive: true });
    writeFileSync(ziel, JSON.stringify(ZEILEN, null, 2) + '\n', 'utf8');
    expect(ZEILEN.length).toBeGreaterThan(100);
  });
});
