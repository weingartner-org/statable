import { beforeAll, describe, expect, it } from 'vitest';
import ExcelJS from 'exceljs';
import erwartet from './testdaten/spaeter-c-erwartet.json';
import { nodeEngine } from './testengine';
import type { Spalte } from './verzeichnis';
import type { Daten } from './umformen';
import { beschreibe } from './gewichte';
import { kreuz, kreuzProzente, kreuzZellenSyntax } from './ergebnis';
import { rechneTabelle, tabellenStellen, type TabellenSpec } from './tabellenmodell';
import { tabellenSaetze } from './tabellensaetze';
import { tabelleAlsExcel } from './tabellenexcel';
import { s } from './sitzung.svelte';

/* ===== Später, Welle S-C, Bauer A: „Tabelle zusammenstellen“ (T1-T13), Kreuztabelle mit Spalten- und Gesamtprozent, Excel mit Zahlen =====
 * Fachblatt docs/fachblaetter/SPAETER-C-TABELLEN-FRAGEBOGEN.md, Abschnitt 1 und „Entscheidungen Opus (17.10.)“ (gehen vor): Statable rechnet die Tabelle SELBST in JS (PSPP-CTABLES nur als
 * zweite Quelle des Prüfers), Gewichte werden nie gerundet, keine Signifikanztests und keine Buchstaben in der Tabelle, das n steht immer dabei.
 * Sollwerte: scripts/spaeter-c-erwartet.R → testdaten/spaeter-c-erwartet.json (Abschnitt `tabelle`). Erste Quelle R (eigener Nachbau der Tabelle, gewichtete Mediane nach EXAMINE-HAVERAGE),
 * zweite Quelle PSPP-Engine (CTABLES ungewichtet, WEIGHT BY für Häufigkeitsgewichte, /WEIGHT VARIABLE für Umfragegewichte, EXAMINE mit normierten Gewichten, CROSSTABS) auf 1e-9.
 * Der Bauer ändert weder diesen Test noch Skript noch JSON. Alle Zahlen im Ergebnis sind UNGERUNDET (gerundet wird erst bei der Anzeige über profil()).
 *
 * ---------------------------------- Schnittstelle (festgelegt vom Prüfer) ----------------------------------
 *  lib/tabellenmodell.ts   (rein, ohne Oberfläche, wirft Fehler statt zu raten)
 *    rechneTabelle(d: Daten, spec: TabellenSpec): TabellenErgebnis
 *    TabellenSpec = {
 *      spalte: string;                                   // Gruppenspalte (Spalten der Tabelle); Fälle ohne Gruppe fallen heraus
 *      gesamt?: boolean;                                 // Gesamtspalte, Voreinstellung true; Gesamt = SUMME der gezeigten Gruppen, nie „alle Fälle der Datei“
 *      bloecke: Block[];
 *      prozentBasis?: 'spalte' | 'zeile' | 'gesamt';     // Voreinstellung 'spalte' (Anteil innerhalb der Gruppe)
 *      fehlend?: 'gueltig' | 'alle';                     // Voreinstellung 'gueltig'; 'alle' = Nenner alle Fälle der Gruppe, dazu EINE Zeile „keine Angabe“ (schluessel 'keine')
 *      mehrfachBasis?: 'faelle' | 'antworten';           // Voreinstellung 'faelle'
 *      gewicht?: { spalte: string; art: 'haeufigkeit' | 'umfrage' };    // aus lib/gewichte.ts
 *      sets?: MehrfachSet[];                             // aus lib/mehrfach.ts, für Blöcke der Art 'mehrfach'
 *    }
 *    Block = { art: 'kategorial'; spalte: string }                                   // je Stufe n und Prozent; Stufen = Wertelabels (auch 0 %), sonst die vorkommenden Werte, aufsteigend
 *          | { art: 'metrisch'; spalte: string; kennwerte?: ('n' | 'mw' | 'sd' | 'median')[] }   // Voreinstellung alle vier, in dieser Reihenfolge; je Kennwert EINE Zeile
 *          | { art: 'mehrfach'; set: string; mitNull?: boolean }                     // je Option eine Zeile (schluessel = Spaltenname, label = Bezeichnung der Spalte)
 *          | { art: 'top'; spalte: string; stufen: number[] }                        // Top-Box: Anteil der genannten Stufen; OHNE `stufen` wirft es - Statable rät die Richtung nie
 *    TabellenErgebnis = {
 *      spalten: { schluessel: string; label: string; n: number; summeGewichte?: number; antworten?: number }[];   // Gruppen nach Wert, zuletzt 'gesamt' (label 'Gesamt')
 *                                                         //  n = Fälle der Gruppe (Häufigkeitsgewicht: Σw; Umfragegewicht: Zahl der Befragten), summeGewichte nur bei Umfragegewicht, antworten nur bei Mehrfach;
 *                                                         //  besteht die Tabelle NUR aus Mehrfach-Blöcken, ist n die Zahl der GÜLTIGEN Fälle des ersten Sets (die Basis der Prozente; mitNull beachtet) und antworten die Zahl der Nennungen
 *      zeilen: { block: number /* 1-basiert *\/; spalte: string; schluessel: string; art: 'stufe' | 'keineAngabe' | 'kennwert' | 'option' | 'top'; label: string; zellen: Zelle[] }[];   // zellen[j] gehört zu spalten[j]
 *      ohneGruppe: number;                                 // Fälle ohne gültige Gruppe (Fuß)
 *      hinweise: ({ art: 'kleineGruppe'; gruppe: string; n: number } | { art: 'vieleFehlend'; block: number; gruppe: string; anteil: number })[];
 *      gewicht?: { spalte: string; art: 'haeufigkeit' | 'umfrage' };
 *    }
 *    Zelle = { n: number | null; prozent: number | null; wert: number | null; basis: number | null }
 *      Stufe/Option/Top/keineAngabe: n = Zählung (Häufigkeit: Σw; Umfrage: ungewichtete Zahl der Befragten; Mehrfach: Nennungen), prozent = 0..100 (Umfrage gewichtet), basis = Nenner in Fällen (Umfrage: Befragte),
 *      wert null. Kennwert: wert = Zahl (n, M, SD, Median), basis = gültiges n der Gruppe, n und prozent null. n = 0 → prozent/wert null (nie NaN, nie undefined).
 *      Umfragegewicht: SD und Median rechnen mit auf Σw = Zahl der gültigen Zeilen normierten Gewichten (T8: die Skala der Gewichte darf nichts ändern).
 *    tabellenStellen(spec: TabellenSpec): string[]      die Stellen der Sperrtabelle (gewichte-spaeter-c.test.ts): 'tabelle:zusammenstellen', dazu 'tabelle:mehrfach' bei einem Mehrfachset-Block
 *  lib/tabellensaetze.ts   tabellenSaetze(e: TabellenErgebnis, spec: TabellenSpec): { fuss: string[]; hilfe: string[] }     ganze Sätze (L/Lp, du/Sie), nie NaN
 *  lib/tabellenexcel.ts    tabelleAlsExcel(e: TabellenErgebnis): Promise<Uint8Array>     .xlsx: Zahlen als ZAHLEN (ungerundet, Anzeigeformat in der Zelle), nicht als Text „3,83“
 *  lib/ergebnis.ts         kreuzProzente(items: OutputItem[]): { zeilen: string[]; spalten: string[]; n: number[][]; zeile: number[][]; spalte: number[][]; gesamt: number[][] }    (Prozente 0..100, gelesen NACH BESCHRIFTUNG
 *                          „Row %“ / „Column %“ / „Total %“, nie nach Zeilenposition; die Randzellen und die „Expected“-Zahlen der Ränder werden nie gelesen)
 *                          kreuzZellenSyntax(basen?: ('zeile' | 'spalte' | 'gesamt')[]): string    der Teil `/CELLS=…`: ohne Angabe = heutiges Verhalten `/CELLS=COUNT ROW EXPECTED.`
 *  lib/gewichte.ts         beschreibe(y, w, 'umfrage') wird repariert (T8, Entscheidung Opus 1) - siehe den eigenen Block unten.
 */
s.einst.sprache = 'de'; s.einst.anrede = 'du';
const E = (erwartet as any).tabelle, F = E.faelle, LG = E.labels.g as Record<string, string>, LQ = E.labels.q as Record<string, string>;
const sp = (name: string, rest: Partial<Spalte> = {}): Spalte => ({ name, bezeichnung: '', art: 'zahl', niveau: 'metrisch', format: 'F8.2', fehlend: [], fehlendText: '', werteLabels: {}, ...rest });
const nah = (ist: number | null | undefined, soll: number | null, was: string) => {
  if (soll === null) { expect(ist, `${was}: soll leer`).toBeNull(); return; }
  expect(typeof ist, `${was}: ${ist}`).toBe('number');
  expect(Number.isNaN(ist as number), `${was}: NaN`).toBe(false);
  expect(Math.abs((ist as number) - soll), `${was}: ${ist} gegen ${soll}`).toBeLessThanOrEqual(1e-9 * Math.max(1, Math.abs(soll)));
};

/** Daten und Spalten aus dem JSON (g mit Labels A/B/C, q1 bis q3 mit Labels 1 bis 5, q3 mit -9 als fehlend, Gewichte; oder das Mehrfach-Beispiel). */
function datenAus(j: any, faktor = 1, ohneLabels: string[] = []): Daten {
  const namen = Object.keys(j) as string[], n = (j.g as unknown[]).length;
  const spalten = namen.map(k => {
    if (k === 'g') return sp('g', { niveau: 'nominal', werteLabels: LG });
    if (k === 'q1' || k === 'q2' || k === 'q3') return sp(k, { niveau: 'ordinal', werteLabels: ohneLabels.includes(k) ? {} : LQ, fehlend: k === 'q3' ? [-9] : [] });
    if (k === 'oa' || k === 'ob' || k === 'oc') return sp(k, { niveau: 'nominal', bezeichnung: ({ oa: 'A', ob: 'B', oc: 'C' } as any)[k] });
    return sp(k);
  });
  const zeilen = Array.from({ length: n }, (_, i) => namen.map(k => { const v = (j[k] as any[])[i]; const x = Array.isArray(v) ? v[0] : v; return x === undefined ? null : k === 'wu' && typeof x === 'number' ? x * faktor : x; }));
  return { spalten, zeilen } as Daten;
}
const lauf = (f: any, faktor = 1) => rechneTabelle(datenAus(f.daten, faktor), f.spec as TabellenSpec);
const col = (e: ReturnType<typeof rechneTabelle>, schluessel: string) => { const j = e.spalten.findIndex(c => c.schluessel === schluessel); expect(j, `Spalte ${schluessel} fehlt: ${e.spalten.map(c => c.schluessel)}`).toBeGreaterThanOrEqual(0); return j; };
const zeile = (e: ReturnType<typeof rechneTabelle>, block: number, schluessel: string) => { const z = e.zeilen.find(r => r.block === block && r.schluessel === schluessel); expect(z, `Zeile ${block}/${schluessel} fehlt: ${e.zeilen.map(r => r.block + '/' + r.schluessel)}`).toBeTruthy(); return z!; };
function vergleiche(e: ReturnType<typeof rechneTabelle>, f: any, was: string) {
  expect(e.spalten.map(c => c.schluessel), `${was}: Spalten`).toEqual(f.spalten.map((c: any) => c.schluessel));
  f.spalten.forEach((c: any, j: number) => { nah(e.spalten[j]!.n, c.n, `${was}: n der Spalte ${c.schluessel}`); if (c.summeGewichte !== undefined && c.summeGewichte !== null) nah(e.spalten[j]!.summeGewichte, c.summeGewichte, `${was}: Σw der Spalte ${c.schluessel}`); });
  for (const c of f.zellen) {
    const z = e.zeilen.find(r => r.block === c.block && r.schluessel === c.zeile);
    expect(z, `${was}: Zeile ${c.block}/${c.zeile} fehlt`).toBeTruthy();
    const x = z!.zellen[col(e, c.spalte)]!, w = `${was}: Block ${c.block} Zeile ${c.zeile} Spalte ${c.spalte}`;
    nah(x.n, c.n, w + ' n'); nah(x.prozent, c.prozent, w + ' Prozent'); nah(x.wert, c.wert, w + ' Wert'); nah(x.basis, c.basis, w + ' Basis');
  }
}
/** In keiner Zelle steht NaN, undefined oder Infinity. */
function keinNaN(e: ReturnType<typeof rechneTabelle>) {
  for (const z of e.zeilen) for (const x of z.zellen) for (const k of ['n', 'prozent', 'wert', 'basis'] as const) { const v = (x as any)[k]; expect(v === null || (typeof v === 'number' && Number.isFinite(v)), `${z.block}/${z.schluessel}.${k} = ${v}`).toBe(true); }
}

describe('T1 Kennwerte ungewichtet: q1, q2, q3 je Gruppe A, B und Gesamt (R = PSPP-CTABLES, Fachblatt-Zahlen gegengelesen)', () => {
  const f = F.t1;
  it('alle 36 Zellen gegen R und PSPP; Spalten A, B, Gesamt mit n 6, 6, 12', () => {
    const e = lauf(f); vergleiche(e, f, 't1'); keinNaN(e);
    expect(e.spalten.map(c => c.label)).toEqual(['A', 'B', 'Gesamt']);
  });
  it('Fachblatt-Zahlen: q1 A M 3,8333 SD 1,1690 Md 4; Gesamt M 3,4167 SD 1,3114 Md 3,5; q3 ohne den -9-Fall: A n 5, Gesamt n 11 M 3,2727', () => {
    const e = lauf(f);
    nah(zeile(e, 1, 'mw').zellen[col(e, '1')]!.wert, 23 / 6, 'M q1 A'); nah(zeile(e, 1, 'sd').zellen[col(e, '1')]!.wert, 1.1690451944500122, 'SD q1 A'); nah(zeile(e, 1, 'median').zellen[col(e, '1')]!.wert, 4, 'Md q1 A');
    nah(zeile(e, 1, 'mw').zellen[col(e, 'gesamt')]!.wert, 41 / 12, 'M q1 Gesamt'); nah(zeile(e, 1, 'median').zellen[col(e, 'gesamt')]!.wert, 3.5, 'Md q1 Gesamt');
    nah(zeile(e, 3, 'n').zellen[col(e, '1')]!.wert, 5, 'n q3 A'); nah(zeile(e, 3, 'n').zellen[col(e, 'gesamt')]!.wert, 11, 'n q3 Gesamt'); nah(zeile(e, 3, 'mw').zellen[col(e, 'gesamt')]!.wert, 36 / 11, 'M q3 Gesamt');
  });
  it('Kennwerte ohne Angabe: alle vier, in der Reihenfolge n, M, SD, Median; mit Angabe nur die gewählten', () => {
    const d = datenAus(f.daten);
    const alle = rechneTabelle(d, { spalte: 'g', bloecke: [{ art: 'metrisch', spalte: 'q1' }] });
    expect(alle.zeilen.map(z => z.schluessel)).toEqual(['n', 'mw', 'sd', 'median']);
    const nur = rechneTabelle(d, { spalte: 'g', bloecke: [{ art: 'metrisch', spalte: 'q1', kennwerte: ['mw', 'n'] }] });
    expect(nur.zeilen.map(z => z.schluessel)).toEqual(['mw', 'n']);
  });
  it('Gesamtspalte weglassen: gesamt: false', () => {
    const e = rechneTabelle(datenAus(f.daten), { spalte: 'g', gesamt: false, bloecke: [{ art: 'metrisch', spalte: 'q1' }] });
    expect(e.spalten.map(c => c.schluessel)).toEqual(['1', '2']);
  });
});

describe('T2 Spaltenprozent q3, Basis gültig; Zeilen- und Gesamtprozent', () => {
  it('Spaltenprozent: A (Basis 5) 0 / 20 / 20 / 60 / 0, B (Basis 6) 16,67 / 0 / 50 / 16,67 / 16,67; jede Spalte summiert 100; Stufen 1 bis 5 aus den Wertelabels, auch bei 0 %', () => {
    const e = lauf(F.t2); vergleiche(e, F.t2, 't2'); keinNaN(e);
    expect(e.zeilen.map(z => z.schluessel)).toEqual(['1', '2', '3', '4', '5']);
    expect(e.zeilen.map(z => z.label)).toEqual(['sehr niedrig', 'niedrig', 'mittel', 'hoch', 'sehr hoch']);
    for (const c of ['1', '2']) nah(e.zeilen.reduce((a, z) => a + (z.zellen[col(e, c)]!.prozent ?? 0), 0), 100, `Spalte ${c} summiert 100`);
    expect(e.zeilen[0]!.zellen[col(e, '1')]).toMatchObject({ n: 0, basis: 5 }); expect(e.zeilen[0]!.zellen[col(e, '1')]!.prozent).toBe(0);
  });
  it('Zeilenprozent: Anteil der Gruppe an den Personen mit dieser Antwort; Gesamtspalte 100; Stufe ohne Fall: leer', () => {
    const e = lauf(F.t2_zeile); vergleiche(e, F.t2_zeile, 't2_zeile'); keinNaN(e);
    nah(zeile(e, 1, '3').zellen[col(e, 'gesamt')]!.prozent, 100, 'Gesamt 100');
  });
  it('Gesamtprozent: Anteil an allen 11 gültigen Fällen; alle Zellen A+B zusammen 100', () => {
    const e = lauf(F.t2_gesamt); vergleiche(e, F.t2_gesamt, 't2_gesamt'); keinNaN(e);
    let sum = 0; for (const z of e.zeilen) for (const c of ['1', '2']) sum += z.zellen[col(e, c)]!.prozent ?? 0; nah(sum, 100, 'Summe aller Zellen');
  });
  it('ohne Wertelabels: die vorkommenden Werte, aufsteigend (q2 hat 1 bis 5)', () => {
    const e = rechneTabelle(datenAus(F.t2.daten, 1, ['q2']), { spalte: 'g', bloecke: [{ art: 'kategorial', spalte: 'q2' }] });
    expect(e.zeilen.map(z => z.schluessel)).toEqual(['1', '2', '3', '4', '5']);
  });
});

describe('T3 Basis „alle“: eigene Zeile „keine Angabe“, Spalte summiert 100', () => {
  it('A: Basis 6, keine Angabe 16,67 %; B unverändert (kein fehlender Fall); Gesamt 1 von 12', () => {
    const e = lauf(F.t3); vergleiche(e, F.t3, 't3'); keinNaN(e);
    const k = zeile(e, 1, 'keine'); expect(k.art).toBe('keineAngabe');
    nah(k.zellen[col(e, '1')]!.prozent, 100 / 6, 'keine Angabe A'); nah(k.zellen[col(e, '2')]!.prozent, 0, 'keine Angabe B');
    for (const c of ['1', '2', 'gesamt']) nah(e.zeilen.reduce((a, z) => a + (z.zellen[col(e, c)]!.prozent ?? 0), 0), 100, `Spalte ${c} summiert 100`);
  });
  it('Basis gültig: keine Zeile „keine Angabe“', () => { expect(lauf(F.t2).zeilen.some(z => z.schluessel === 'keine')).toBe(false); });
});

describe('T4 Umfragegewicht (Kommagewichte): n bleibt die Zahl der Befragten, gewichtete Prozente und Mittel, nie gerundet', () => {
  const e0 = () => lauf(F.t4);
  it('alle Zellen gegen R und PSPP (/WEIGHT VARIABLE); SD und Median mit normierten Gewichten (EXAMINE/DESCRIPTIVES bestätigt)', () => { const e = e0(); vergleiche(e, F.t4, 't4'); keinNaN(e); });
  it('Σw je Gruppe: 7,0 / 7,3 / 14,3 und n = 6 / 6 / 12 (Befragte); die Zählung in den Zellen ist die ungewichtete: Stufe 4 in A = 2 Personen', () => {
    const e = e0();
    expect(e.spalten.map(c => c.n)).toEqual([6, 6, 12]);
    nah(e.spalten[0]!.summeGewichte, 7, 'Σw A'); nah(e.spalten[1]!.summeGewichte, 7.3, 'Σw B'); nah(e.spalten[2]!.summeGewichte, 14.3, 'Σw Gesamt');
    expect(zeile(e, 1, '4').zellen[0]!.n).toBe(2);
  });
  it('NICHT das gerundete Wörterbuch-Gewicht von PSPP-CTABLES: A hat n 6 (nicht 8) und M 3,5857 (nicht 3,75)', () => {
    const e = e0(); nah(zeile(e, 2, 'n').zellen[0]!.wert, 6, 'n'); nah(zeile(e, 2, 'mw').zellen[0]!.wert, 3.585714285714286, 'M');
    expect(Math.abs(zeile(e, 2, 'mw').zellen[0]!.wert! - 3.75)).toBeGreaterThan(0.1);
  });
  it('das Fachblatt-Beispiel: gewichtete Prozente A 14,29 / 31,43 / 35,71 / 18,57 (Stufe 1: 0), B 13,70 / 17,81 / 27,40 / 27,40 / 13,70', () => {
    const e = e0(); const p = (b: string, st: string) => zeile(e, 1, st).zellen[col(e, b)]!.prozent!;
    expect([2, 3, 4, 5].map(st => Math.round(p('1', String(st)) * 100) / 100)).toEqual([14.29, 31.43, 35.71, 18.57]);
    expect([1, 2, 3, 4, 5].map(st => Math.round(p('2', String(st)) * 100) / 100)).toEqual([13.7, 17.81, 27.4, 27.4, 13.7]);
  });
});

describe('T8 Skalen-Invarianz (Pflicht): Umfragegewichte mal 10, mal 0,1, mal 7 ändern M, Prozente, SD und Median nicht', () => {
  for (const faktor of E.faelle.t8.faktoren as number[]) it(`Faktor ${faktor}: dieselben Zahlen wie T4`, () => {
    const e = lauf(F.t4, faktor); vergleiche(e, { ...F.t4, spalten: F.t4.spalten.map((c: any) => ({ ...c, summeGewichte: undefined })) }, `T8 x${faktor}`); keinNaN(e);
    nah(e.spalten[0]!.summeGewichte, 7 * faktor, 'Σw wächst mit, ist aber keine Zählung');
  });
  it('beschreibe() aus lib/gewichte.ts (Entscheidung Opus 1): SD und Varianz bei Umfragegewicht skalenfrei - Gewicht mal 10 ändert die SD nicht', () => {
    const b = F.t8.beschreibe;
    const a1 = beschreibe(b.y, b.w, 'umfrage'), a10 = beschreibe(b.y, b.w.map((v: number) => 10 * v), 'umfrage');
    nah(a1.sd, b.sd_normiert, 'SD auf Σw = Zeilen normiert'); nah(a1.varianz, b.varianz_normiert, 'Varianz normiert'); nah(a10.sd, b.sd_normiert, 'SD bei Gewicht mal 10'); nah(a10.mittel, a1.mittel, 'Mittel');
    expect(Math.abs(b.sd_roh - b.sd_normiert), 'der alte Weg (rohes Σw - 1) liefert wirklich etwas anderes').toBeGreaterThan(1e-3);
  });
  it('⚠ Konflikt mit gewicht.test.ts, den der Bauer A auflöst: nach der Reparatur gelten dort F.umfrage.varianz/sd und U.varianz/sd (Datensatz mit Σw ≠ Zeilen) nicht mehr; die neuen Sollwerte stehen in spaeter-c-erwartet.json (tabelle.faelle.t8.beschreibe, abweichungen.beschreibe_umfragegewicht). Regressionstest: Mittel, Quartile, Kish, Designeffekt bleiben unverändert.', () => {
    const b = F.t8.beschreibe, r = beschreibe(b.y, b.w, 'umfrage');
    expect(Object.keys(r)).not.toContain('se');   // weiterhin kein Standardfehler bei Umfragegewicht
    expect(r.kish).toBeGreaterThan(0); expect(r.designeffekt).toBeGreaterThan(0);
  });
});

describe('T5 Häufigkeitsgewicht: n = Σw (ganzzahlig, kein Runden nötig), Kennwerte der erweiterten Menge', () => {
  it('alle Zellen gegen R (rep) und PSPP (WEIGHT BY); Fachblatt: q1 A n 9 M 4,2222 SD 1,0929 Md 5, Gesamt n 16', () => {
    const e = lauf(F.t5); vergleiche(e, F.t5, 't5'); keinNaN(e);
    nah(zeile(e, 2, 'n').zellen[0]!.wert, 9, 'n A'); nah(zeile(e, 2, 'mw').zellen[0]!.wert, 38 / 9, 'M A'); nah(zeile(e, 2, 'n').zellen[2]!.wert, 16, 'n Gesamt');
    expect(e.spalten.map(c => c.n)).toEqual([9, 7, 16]);
    expect(e.spalten[0]!.summeGewichte, 'keine Σw-Angabe bei Häufigkeitsgewicht: n ist Σw').toBeUndefined();
  });
  it('nicht ganzzahliges Gewicht als Häufigkeitsgewicht: Fehler (wird nie gerundet)', () => {
    expect(() => rechneTabelle(datenAus(F.t4.daten), { ...F.t4.spec, gewicht: { spalte: 'wu', art: 'haeufigkeit' } })).toThrow();
  });
});

describe('T6 Mehrfachset in der Tabelle (8 Personen, Optionen A, B, C, Gruppen g1/g2)', () => {
  it('% der Fälle, ohne Fälle ohne Nennung: g1 66,7 / 66,7 / 33,3 (Σ 166,7), g2 66,7 / 33,3 / 66,7; Fälle 3 / 3 / 6', () => {
    const f = F.t6_faelle, e = lauf(f); vergleiche(e, f, 't6_faelle'); keinNaN(e);
    expect(e.spalten.map(c => c.n)).toEqual([3, 3, 6]); expect(e.spalten.map(c => c.antworten)).toEqual([5, 5, 10]);
    expect(e.zeilen.map(z => z.label)).toEqual(['A', 'B', 'C']); expect(e.zeilen.every(z => z.art === 'option')).toBe(true);
    nah(e.zeilen.reduce((a, z) => a + z.zellen[0]!.prozent!, 0), 500 / 3, 'Summe g1 über 100 %');
  });
  it('% der Antworten (Summe 100 %): g1 40 / 40 / 20, g2 40 / 20 / 40', () => {
    const f = F.t6_antworten, e = lauf(f); vergleiche(e, f, 't6_antworten');
    for (let j = 0; j < 3; j++) nah(e.zeilen.reduce((a, z) => a + z.zellen[j]!.prozent!, 0), 100, `Spalte ${j} summiert 100`);
  });
  it('mitNull: Fälle ohne Nennung zählen mit (je Gruppe 4 Fälle): % der Fälle g1 50 / 50 / 25', () => { const f = F.t6_nullen, e = lauf(f); vergleiche(e, f, 't6_nullen'); expect(e.spalten.map(c => c.n)).toEqual([4, 4, 8]); });
  it('eine Person ohne jede Angabe zählt nie, auch nicht mit mitNull (Zahlen wie ohne sie)', () => { const f = F.t6_leer, e = lauf(f); vergleiche(e, f, 't6_leer'); expect(e.spalten.map(c => c.n)).toEqual([4, 4, 8]); });
  it('Gewichte gelten für Fälle, nicht für Antworten (IBM): Set mit Umfragegewicht rechnet gewichtete Prozente der Fälle - hier nur: wirft nicht, kein NaN', () => {
    const f = F.t6_faelle, d = datenAus({ ...f.daten, wu: [1, 1.5, 2, 1, 1, 0.5, 1, 1] });
    const e = rechneTabelle(d, { ...f.spec, gewicht: { spalte: 'wu', art: 'umfrage' } }); keinNaN(e); expect(e.spalten.map(c => c.n)).toEqual([3, 3, 6]);
  });
  it('kein Chi-Quadrat, kein p, keine Buchstaben im Ergebnis (Entscheidung Opus 2): die Zellen kennen nur n, Prozent, Wert, Basis', () => {
    const e = lauf(F.t6_faelle); expect(Object.keys(e.zeilen[0]!.zellen[0]!).sort()).toEqual(['basis', 'n', 'prozent', 'wert']);
    expect(Object.keys(e).sort()).toEqual(expect.not.arrayContaining(['p', 'test', 'buchstaben', 'signifikanz']));
  });
});

describe('T9-T12 Ränder: leere Gruppe, Top-Box, fehlende Gruppe, kleine Gruppe, viele fehlende Werte', () => {
  it('T9 Gruppe B ohne gültige Antwort in q3: n = 0, Prozent und M leer (null), nie NaN; Gesamt = nur A', () => {
    const e = lauf(F.t9); vergleiche(e, F.t9, 't9'); keinNaN(e);
    const b = col(e, '2');
    for (const z of e.zeilen.filter(r => r.block === 1)) { expect(z.zellen[b]!.prozent).toBeNull(); expect(z.zellen[b]!.n).toBe(0); }
    expect(zeile(e, 2, 'mw').zellen[b]!.wert).toBeNull(); expect(zeile(e, 2, 'sd').zellen[b]!.wert).toBeNull(); expect(zeile(e, 2, 'median').zellen[b]!.wert).toBeNull(); expect(zeile(e, 2, 'n').zellen[b]!.wert).toBe(0);
  });
  it('T10 Top-2-Box: A 66,67 % (4 von 6), B 33,33 %, Gesamt 50 %; die Richtung wählt die Person: Stufen 1-2 geben A 16,67 %, B 33,33 %', () => {
    for (const k of ['t10', 't10_unten']) { const e = lauf(F[k]); vergleiche(e, F[k], k); keinNaN(e); const z = zeile(e, 1, 'top'); expect(z.art).toBe('top'); expect(z.label).toMatch(/[45]|[12]/); }
    nah(zeile(lauf(F.t10), 1, 'top').zellen[0]!.prozent, 200 / 3, 'A'); nah(zeile(lauf(F.t10_unten), 1, 'top').zellen[0]!.prozent, 100 / 6, 'A unten');
  });
  it('T10 Statable rät die Richtung nie: Top-Box ohne Stufen wirft', () => {
    expect(() => rechneTabelle(datenAus(F.t10.daten), { spalte: 'g', bloecke: [{ art: 'top', spalte: 'q1' } as any] })).toThrow();
    expect(() => rechneTabelle(datenAus(F.t10.daten), { spalte: 'g', bloecke: [{ art: 'top', spalte: 'q1', stufen: [] }] })).toThrow();
  });
  it('T11 ein Fall ohne Gruppenangabe: Gesamt bleibt 12 (A + B), ohneGruppe 1', () => {
    const e = lauf(F.t11); vergleiche(e, F.t11, 't11'); expect(e.ohneGruppe).toBe(1); expect(e.spalten.map(c => c.n)).toEqual([6, 6, 12]);
  });
  it('T12 Gruppe C mit drei Fällen: Hinweis „kleine Gruppe“ (n < 5), die Zahlen werden trotzdem gezeigt; A und B (6) ohne Hinweis', () => {
    const e = lauf(F.t12); vergleiche(e, F.t12, 't12'); keinNaN(e);
    expect(e.hinweise.filter(h => h.art === 'kleineGruppe')).toEqual([{ art: 'kleineGruppe', gruppe: '3', n: 3 }]);
    expect(lauf(F.t1).hinweise.filter(h => h.art === 'kleineGruppe')).toEqual([]);
  });
  it('T12 viele fehlende Werte (mehr als 20 % in einer Gruppe): A hat 2 von 6 fehlend → Hinweis; die Basis 17 % (1 von 6) in der Standardtabelle nicht', () => {
    const e = lauf(F.t12_fehlend); vergleiche(e, F.t12_fehlend, 't12_fehlend');
    const h = e.hinweise.filter(x => x.art === 'vieleFehlend'); expect(h.length).toBe(1); expect(h[0]).toMatchObject({ block: 1, gruppe: '1' }); nah((h[0] as any).anteil, 1 / 3, 'Anteil');
    expect(lauf(F.t2).hinweise.filter(x => x.art === 'vieleFehlend')).toEqual([]);
  });
  it('leere Daten (0 Zeilen) und nur eine Gruppe: kein Fehler, kein NaN', () => {
    const d0: Daten = { spalten: datenAus(F.t1.daten).spalten, zeilen: [] };
    const e0 = rechneTabelle(d0, { spalte: 'g', bloecke: [{ art: 'kategorial', spalte: 'q1' }, { art: 'metrisch', spalte: 'q1' }] }); keinNaN(e0);
    const d1 = datenAus(F.t1.daten); d1.zeilen = d1.zeilen.filter(z => z[0] === 1);
    const e1 = rechneTabelle(d1, { spalte: 'g', bloecke: [{ art: 'metrisch', spalte: 'q1' }] }); keinNaN(e1); expect(e1.spalten.map(c => c.schluessel)).toEqual(['1', 'gesamt']);
  });
  it('unbekannte Spalte oder Set: Fehler statt Raten', () => {
    expect(() => rechneTabelle(datenAus(F.t1.daten), { spalte: 'g', bloecke: [{ art: 'metrisch', spalte: 'gibt_es_nicht' }] })).toThrow();
    expect(() => rechneTabelle(datenAus(F.t1.daten), { spalte: 'gibt_es_nicht', bloecke: [{ art: 'metrisch', spalte: 'q1' }] })).toThrow();
    expect(() => rechneTabelle(datenAus(F.t1.daten), { spalte: 'g', bloecke: [{ art: 'mehrfach', set: 'X' }] })).toThrow();
  });
});

describe('Fallgewicht: die Stellen der Sperrtabelle (lib/gewichte.ts, Schlüssel tabelle:zusammenstellen und tabelle:mehrfach; Soll in gewichte-spaeter-c.test.ts)', () => {
  it('tabellenStellen: immer die Zusammenstellung, mit einem Mehrfachset-Block auch tabelle:mehrfach', () => {
    expect(tabellenStellen({ spalte: 'g', bloecke: [{ art: 'metrisch', spalte: 'q1' }, { art: 'kategorial', spalte: 'q2' }] })).toEqual(['tabelle:zusammenstellen']);
    expect(tabellenStellen({ spalte: 'g', bloecke: [{ art: 'metrisch', spalte: 'q1' }, { art: 'mehrfach', set: 'S' }] })).toEqual(['tabelle:zusammenstellen', 'tabelle:mehrfach']);
    expect(tabellenStellen({ spalte: 'g', bloecke: [{ art: 'top', spalte: 'q1', stufen: [4, 5] }] })).toEqual(['tabelle:zusammenstellen']);
  });
});

describe('Sätze: Fuß und Hilfe in ganzen Sätzen (de/du), nie NaN (Fachblatt 1.4, 1.5, 1.7, 1.10)', () => {
  const text = (f: any) => { const e = lauf(f); const t = tabellenSaetze(e, f.spec); expect(t.fuss.concat(t.hilfe).join(' ')).not.toMatch(/NaN|undefined|Infinity|\$\{/); return t; };
  it('Standard: „Prozente innerhalb der Gruppe, gültige Antworten“; Mittelwert-Hilfe „gleiche Abstände zwischen den Stufen“', () => {
    s.einst.sprache = 'de'; s.einst.anrede = 'du';
    const t = text({ ...F.t1, spec: { ...F.t1.spec, bloecke: [...F.t1.spec.bloecke, { art: 'kategorial', spalte: 'q3' }] } });
    expect(t.fuss.join(' ')).toContain('Prozente innerhalb der Gruppe'); expect(t.fuss.join(' ')).toContain('gültige Antworten');
    expect(t.hilfe.join(' ')).toContain('gleiche Abstände zwischen den Stufen'); expect(t.hilfe.join(' ')).toContain('Prozentverteilung');
  });
  it('Basis „alle“ nennt es; Basis „Zeile“ erklärt, dass Prozente über die Gruppen laufen', () => {
    expect(text(F.t3).fuss.join(' ')).toMatch(/alle Fälle/);
    expect(text(F.t2_zeile).hilfe.concat(text(F.t2_zeile).fuss).join(' ')).toMatch(/Zeile|Personen mit dieser Antwort/);
  });
  it('Fall ohne Gruppenangabe: „1 Fall ohne Gruppenangabe“, bei mehreren „… Fälle ohne Gruppenangabe“ (Lp)', () => {
    expect(text(F.t11).fuss.join(' ')).toContain('1 Fall ohne Gruppenangabe');
    const f = F.t11, d = datenAus(f.daten); d.zeilen.push([null, 14, 3, 3, 3, 1, 1], [null, 15, 2, 3, 3, 1, 1]); const e = rechneTabelle(d, f.spec);
    expect(e.ohneGruppe).toBe(3); expect(tabellenSaetze(e, f.spec).fuss.join(' ')).toContain('3 Fälle ohne Gruppenangabe');
  });
  it('kleine Gruppe und viele fehlende Werte: ganze Hinweissätze', () => {
    expect(text(F.t12).fuss.join(' ')).toMatch(/kleine Gruppe/); expect(text(F.t12).fuss.join(' ')).toMatch(/unsicher/);
    expect(text(F.t12_fehlend).fuss.join(' ')).toContain('viele Fälle ohne Antwort');
  });
  it('Umfragegewicht: nennt das Umfragegewicht, die Summe der Gewichte und „Befragte“; Häufigkeitsgewicht nennt das Fallgewicht; die SPSS-Abweichung steht in der Hilfe („Statable rundet nie“)', () => {
    const u = text(F.t4), h = text(F.t5);
    expect(u.fuss.join(' ')).toContain('Umfragegewicht'); expect(u.fuss.join(' ')).toMatch(/Summe der Gewichte/); expect(u.fuss.join(' ')).toContain('Befragte'); expect(u.hilfe.join(' ')).toContain('Statable rundet nie');
    expect(h.fuss.join(' ')).toContain('Fallgewicht');
  });
  it('Englisch: dieselben Hinweise, englisch', () => {
    s.einst.sprache = 'en';
    try { const t = text(F.t11); expect(t.fuss.join(' ')).not.toContain('ohne Gruppenangabe'); expect(t.fuss.join(' ')).toMatch(/group/i); } finally { s.einst.sprache = 'de'; }
  });
});

describe('T13 Export: Excel enthält die 12 Zahlen als Zahlen, ungerundet (kein Text „3,83“)', () => {
  it('die zwölf Kennwerte von q1 stehen als numerische Zellen, der Wert ungerundet, das Anzeigeformat in der Zelle', async () => {
    const f = F.t13, e = lauf(f), bytes = await tabelleAlsExcel(e);
    const wb = new ExcelJS.Workbook(); await wb.xlsx.load(bytes as any); const ws = wb.worksheets[0]!;
    const zahlen: { wert: number; fmt: string }[] = [], texte: string[] = [];
    ws.eachRow(r => r.eachCell(c => { if (typeof c.value === 'number') zahlen.push({ wert: c.value, fmt: c.numFmt }); else if (typeof c.value === 'string') texte.push(c.value); }));
    for (const c of f.zellen) { const ok = zahlen.some(z => Math.abs(z.wert - c.wert) <= 1e-9 * Math.max(1, Math.abs(c.wert))); expect(ok, `Zahl ${c.zeile}/${c.spalte} = ${c.wert} fehlt als numerische Zelle`).toBe(true); }
    const mw = zahlen.find(z => Math.abs(z.wert - 23 / 6) < 1e-9)!; expect(mw.fmt, 'Anzeigeformat der Zelle').toBeTruthy();
    expect(texte.filter(t => /^-?\d+([.,]\d+)?$/.test(t.trim())), 'Zahlen als Text').toEqual([]);
  });
  it('Spaltenprozente: Anzahl und Prozent als getrennte Zahlen (kein „23 (45,1 %)“ als Text)', async () => {
    const e = lauf(F.t2), wb = new ExcelJS.Workbook(); await wb.xlsx.load((await tabelleAlsExcel(e)) as any);
    const texte: string[] = []; wb.worksheets[0]!.eachRow(r => r.eachCell(c => { if (typeof c.value === 'string') texte.push(c.value); }));
    expect(texte.filter(t => /\d+\s*\(\s*\d+[.,]?\d*\s*%\s*\)/.test(t))).toEqual([]);
  });
});

/* ------------------------------------------------------------------------------------------------ Kreuztabelle: Spalten- und Gesamtprozent */
let motor: Awaited<ReturnType<typeof nodeEngine>>;
beforeAll(async () => { motor = await nodeEngine(); });
const csv = (z: number[][]) => new TextEncoder().encode(z.map(r => r.join(',')).join('\n') + '\n');
describe('T7 Kreuztabelle mit Gewichten (Zellhäufigkeiten): Zeilen-, Spalten- und Gesamtprozent, gelesen nach Beschriftung', () => {
  const T7 = E.faelle.t7;
  const lade = (cells: string) => motor.run(`DATA LIST FILE='/k.csv' LIST (',') /z s w (F8.0).\nWEIGHT BY w.\nCROSSTABS /TABLES=z BY s\n  /STATISTICS=CHISQ\n  ${cells}`, { '/k.csv': csv((T7.zeilen as number[][][]).flat()) });
  it('kreuzZellenSyntax: ohne Angabe wie bisher (COUNT ROW EXPECTED); mit Spalte und Gesamt zusätzlich COLUMN und TOTAL', () => {
    expect(kreuzZellenSyntax()).toBe('/CELLS=COUNT ROW EXPECTED.');
    const a = kreuzZellenSyntax(['zeile', 'spalte', 'gesamt']); expect(a).toContain('COUNT'); expect(a).toContain('ROW'); expect(a).toContain('COLUMN'); expect(a).toContain('TOTAL'); expect(a).toContain('EXPECTED');
    expect(kreuzZellenSyntax(['spalte'])).not.toContain('ROW');
  });
  it('kreuzProzente liest alle drei Richtungen: Zeile 40 / 60, 85,714 / 14,286; Spalte 25 / 75, 75 / 25; Gesamt 16,667 / 25, 50 / 8,333 (R und PSPP)', () => {
    const items = lade(kreuzZellenSyntax(['zeile', 'spalte', 'gesamt'])), k = kreuzProzente(items);
    expect(k.zeilen.length).toBe(2); expect(k.spalten.length).toBe(2);
    T7.zeilenprozent.forEach((r: number[], i: number) => r.forEach((v, j) => nah(k.zeile[i]![j], v, `Zeile% ${i}${j}`)));
    T7.spaltenprozent.forEach((r: number[], i: number) => r.forEach((v, j) => nah(k.spalte[i]![j], v, `Spalte% ${i}${j}`)));
    T7.gesamtprozent.forEach((r: number[], i: number) => r.forEach((v, j) => nah(k.gesamt[i]![j], v, `Gesamt% ${i}${j}`)));
    T7.zellen.forEach((r: number[], i: number) => r.forEach((v, j) => nah(k.n[i]![j], v, `n ${i}${j}`)));
  });
  it('die Ränder werden nie gelesen: die „Expected“-Zahlen der Randzellen sind unbrauchbar (0,4167 statt 5), die Matrizen haben nur 2 × 2 Einträge', () => {
    const k = kreuzProzente(lade(kreuzZellenSyntax(['zeile', 'spalte', 'gesamt'])));
    expect(k.zeile.map(r => r.length)).toEqual([2, 2]); expect(k.spalte.map(r => r.length)).toEqual([2, 2]); expect(k.gesamt.map(r => r.length)).toEqual([2, 2]);
  });
  it('nur Spaltenprozent angefordert: kreuzProzente liefert spalte, die anderen Matrizen sind leer (nie aus dem Rand geraten)', () => {
    const k = kreuzProzente(lade('/CELLS=COUNT COLUMN.'));
    nah(k.spalte[0]![0]!, 25, 'Spalte%'); expect(k.zeile.flat().length).toBe(0); expect(k.gesamt.flat().length).toBe(0);
  });
  it('kreuz() (Chi-Quadrat, Sätze) liest dieselbe Tabelle mit allen Zellenarten weiter richtig', () => {
    const k = kreuz(lade(kreuzZellenSyntax(['zeile', 'spalte', 'gesamt'])));
    nah(k.chi2, T7.chi2, 'χ²'); nah(k.p, T7.p, 'p'); expect(k.df).toBe(1); expect(k.n).toBe(12);
    expect(k.zaehlung!.tab).toEqual(T7.zellen);
  });
  it('Voreinstellung der Kreuztabelle bleibt „Zeile“ (heutiges Verhalten, nichts bricht), in der Zusammenstellung dagegen „Spalte“', () => {
    expect(kreuzZellenSyntax()).toContain('ROW'); expect(kreuzZellenSyntax()).not.toContain('COLUMN');
    const e = lauf(F.t2); nah(zeile(e, 1, '4').zellen[0]!.prozent, 60, 'Spalte ist die Voreinstellung der Tabelle');
  });
});
