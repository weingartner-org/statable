import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import erwartet from './testdaten/spaeter-c-erwartet.json';
import { nodeEngine } from './testengine';
import { neuAufbauen } from './eingabe';
import { leseVerzeichnis, type Spalte } from './verzeichnis';
import { parseCsv } from '../dialogs/csv';
import { AssistentFehler, mindestzahl } from './datenassistent';
import { skalenwertBefehl } from './skalabau';
import type { Daten } from './umformen';
import { zaehlenWerte, zaehlenBefehl, anzahlBefehl, fehlendcodesBefehl, sortiereReihenfolge, sortiereDauerhaft, type ZaehlWert } from './datenassistentc';
import { neuerSkalenwertBefehl } from './datenassistent';

/* ===== Später, Welle S-C, Bauer B: Datenassistenten Zählen (COUNT), Fehlendcodes setzen, Sortieren, Skalenwert-Voreinstellung - und die PSPP-Befunde F9-F11/RMV =====
 * Fachblatt 4.1 bis 4.3 und Entscheidung Opus 5: „Fehlende Werte ersetzen“ wird NICHT angeboten (kein Spaltenmittel, keine Zeitreihenverfahren, keine Imputation - RMV gibt es in PSPP nicht und ist für Zeitreihen gebaut);
 * stattdessen „Fehlendcodes setzen“ (nur die Bedeutung ändert sich, nie ein Wert; umkehrbar) und „Skalenwert aus verfügbaren Items“ mit der neuen Voreinstellung „mindestens die Hälfte“ (nur für NEU angelegte Skalenwerte).
 * Rang, Datum und auffällige Fälle haben eigene Testdateien (rangbildung, datumrechnen, auffaellig). Fallgewicht: alle Assistenten sind `unberuehrt` (gewichte-spaeter-c.test.ts).
 * Sollwerte: testdaten/spaeter-c-erwartet.json (daten.zaehlen, daten.fehlendcodes, daten.sortieren, abweichungen) aus scripts/spaeter-c-erwartet.R: Zählen und Mittel in R und PSPP (COUNT, NVALID, NMISS, DESCRIPTIVES),
 * Sortieren: R order() und stringi (ICU, Locale „de“) als Sollwert; PSPP SORT CASES nur als dokumentierte Abweichung. Der Bauer ändert Test, Skript und JSON nicht.
 *
 * ---------------------------------- Schnittstelle (festgelegt vom Prüfer; Modul lib/datenassistentc.ts, Muster datenassistent.ts; AssistentFehler von dort) ----------------------------------
 *  type ZaehlWert = { wert: number } | { bereich: [number | 'LO', number | 'HI'] } | { fehlend: 'MISSING' | 'SYSMIS' }
 *  ZaehlOpt = { spalten: string[]; ziel: string; zaehle: ZaehlWert[]; bezeichnung?: string; ueberschreiben?: boolean }
 *  zaehlenWerte(d: Daten, o: ZaehlOpt): number[]        je Fall, wie viele der Spalten treffen: nur GÜLTIGE Werte zählen bei `wert` und `bereich` (benutzerdefiniert fehlende nie), `MISSING` zählt benutzerdefiniert UND leer, `SYSMIS` nur leer; Ergebnis nie fehlend (0 bei keinem Treffer)
 *  zaehlenBefehl(d, o): { syntax: string; ziel: string; bezeichnung: string; format: string }     PSPP-Syntax; Format F8.0, Messniveau Skala; ⚠ PSPP-COUNT zählt benutzerdefiniert fehlende Werte mit, wenn ein Bereich sie trifft (LO THRU 2 fängt -9 ein): der Befehl muss das verhindern,
 *      seine Werte müssen in der Engine GLEICH zaehlenWerte sein. Fehler: Text-Spalte in der Auswahl → 'spalte'; keine Spalte → 'leer'; Bereich verkehrt herum (5 THRU 2) → 'bereich'; Ziel vergeben → 'ueberschreiben'; ungültiger Name → 'name'.
 *  anzahlBefehl(d, o: { art: 'gueltig' | 'fehlend'; spalten: string[]; ziel: string; bezeichnung?: string; ueberschreiben?: boolean }): { syntax; ziel; bezeichnung; format }     NVALID / NMISS (zwei klare Namen: „Anzahl gültig“, „Anzahl fehlend“); beide zusammen ergeben die Zahl der Spalten
 *  fehlendcodesBefehl(d: Daten, o: { spalten: string[]; codes: number[] }): { syntax: string; rueckgaengig: string; meldungen: { art: 'zuVieleCodes'; spalte: string }[]; vorschau: { spalte: string; betroffen: number; mittelVorher: number | null; mittelNachher: number | null; n: number }[] }
 *      `MISSING VALUES a b (-9, -1).` (≤ 3 einzelne Codes) oder ein Bereich `lo THRU hi`, aber NUR wenn zwischen lo und hi in dieser Spalte kein anderer Wert vorkommt; sonst Meldung zuVieleCodes und diese Spalte bleibt UNMARKIERT. codes: [] hebt die Markierung auf.
 *      rueckgaengig stellt den Zustand davor her (`MISSING VALUES a b ().`). Werte werden nie verändert. vorschau: Mittelwert der Spalte vor/nach der Markierung und gültiges n danach (Wirkung zeigen).
 *  sortiereReihenfolge(d: Daten, schluessel: { spalte: string; richtung: 'auf' | 'ab'; natuerlich?: boolean }[]): number[]      „Ansicht sortieren“: 0-basierte Zeilenindizes in der neuen Reihenfolge, d bleibt unverändert
 *      Regeln: mehrere Schlüssel; FEHLENDE (leer, NaN, benutzerdefiniert) IMMER ans Ende, auch absteigend (Abweichung von PSPP/SPSS, die der Hilfetext nennt); Text in deutscher Reihenfolge (ICU, Locale de: apfel, Äpfel, ärger, Ärger, Birne, Öl, Zebra);
 *      natuerlich: Zahlen im Text natürlich geordnet (1, 2, 10); Datum als Datum (nicht als Text); GLEICHSTÄNDE bleiben in der Eingabereihenfolge (stabil).
 *  sortiereDauerhaft(d, schluessel, o?: { altNummer?: string; auswahl?: number[] }): { daten: Daten; reihenfolge: number[]; auswahl?: number[]; befehl: string; hinweis: string }
 *      neue Daten mit umsortierten Zeilen (alle Spalten, also auch das Fallgewicht, gehen mit); altNummer: neue Spalte mit der alten Zeilennummer (1-basiert); auswahl: Indizes ausgewählter Fälle → neue Indizes (aufsteigend);
 *      befehl: Zeile fürs Befehlsprotokoll („Dauerhaft sortiert nach alter (absteigend), name (aufsteigend)“); hinweis: genau „Danach ändern sich die Zeilennummern.“
 *  Fehler (AssistentFehler): Spalte gibt es nicht → 'spalte'; keine Schlüssel → 'regeln'.
 *  datenassistent.ts: neuerSkalenwertBefehl(fragen: string[], name: string, bezeichnung: string, mindestens: number | 'haelfte' = 'haelfte'): string     für NEU angelegte Skalenwerte; skalenwertBefehl (lib/skalabau.ts) behält seine Voreinstellung 1 - gespeicherte Projekte und Befehle bleiben unverändert.
 *  eingabe.ts: neuAufbauen behält einen Fehlend-BEREICH (fehlendText „-9 THRU -1“), den die Engine gesetzt hat (heute werden nur bis zu drei Einzelwerte aus `fehlend` geschrieben).
 *  docs/PSPP-BEFUNDE.md: Zeilen F9 (CTABLES TOTAL=YES, Gesamtspalte leer), F10 (CTABLES rundet Wörterbuch-Gewichte je Fall), F11 (COLPCT.TOTALN) und `RMV` unter „Fehlende Funktionen“.
 */
const E = (erwartet as any).daten, ABW = (erwartet as any).abweichungen;
const sp = (name: string, rest: Partial<Spalte> = {}): Spalte => ({ name, bezeichnung: '', art: 'zahl', niveau: 'metrisch', format: 'F8.0', fehlend: [], fehlendText: '', werteLabels: {}, ...rest });
const nah = (ist: number | null | undefined, soll: number | null, w: string) => { if (soll === null) { expect(ist, w).toBeNull(); return; } expect(typeof ist, `${w}: ${ist}`).toBe('number'); expect(Math.abs((ist as number) - soll), `${w}: ${ist} gegen ${soll}`).toBeLessThanOrEqual(1e-9 * Math.max(1, Math.abs(soll))); };
const wert = (v: any) => (Array.isArray(v) ? v[0] : v) as number | string | null;
const code = (f: () => unknown) => { try { f(); } catch (e) { return e instanceof AssistentFehler ? e.code : 'anderer Fehler: ' + (e as Error).message; } return 'kein Fehler'; };
let m: Awaited<ReturnType<typeof nodeEngine>>;
beforeAll(async () => { m = await nodeEngine(); });
function lade(d: Daten) { const { syntax, csv } = neuAufbauen(d.spalten, d.zeilen); const out = m.run('NEW FILE.\n' + syntax, { '/eingabe.csv': csv }); expect(out.filter(i => i.type === 'message' && (i as any).severity === 'error').map((i: any) => i.text)).toEqual([]); }
const ok = (syntax: string) => { const out = m.run(syntax); expect(out.filter(i => i.type === 'message' && /error|warning/.test((i as any).severity ?? '')).map((i: any) => i.text), syntax).toEqual([]); };
function spaltenwerte(name: string): (number | null)[] {
  m.run("SAVE TRANSLATE /OUTFILE='/t.csv' /TYPE=CSV /FIELDNAMES /REPLACE /CELLS=VALUES.");
  const z = parseCsv(new TextDecoder().decode(m.lies('/t.csv'))), j = z[0]!.map(s => s.toLowerCase()).indexOf(name.toLowerCase()); expect(j, `Spalte ${name}`).toBeGreaterThanOrEqual(0);
  return z.slice(1).map(r => (r[j]!.trim() === '' ? null : Number(r[j])));
}
function mw(name: string) { const t = m.run(`DESCRIPTIVES ${name} /STATISTICS=MEAN.`).filter(i => i.type === 'table').find((i: any) => i.label === 'Descriptive Statistics') as any; const c = (r: number, k: number) => t.cells.find((x: any) => x.r === r && x.c === k)?.n; return { n: c(1, 1) as number, mittel: c(1, 2) as number }; }

/* ------------------------------------------------------------------------------------------------ Zählen */
const Z = E.zaehlen;
const zdaten = (): Daten => ({ spalten: (Z.daten.spalten as string[]).map(n => sp(n, { fehlend: Z.daten.fehlend })), zeilen: Z.daten.zeilen.map((r: any[]) => r.map(wert)) }) as Daten;
const zaehlWerte = (z: any[]): ZaehlWert[] => z.map(a => (a.wert !== undefined ? { wert: a.wert } : a.bereich ? { bereich: a.bereich.map((v: string) => (v === 'LO' || v === 'HI' ? v : Number(v))) } : { fehlend: a.fehlend })) as ZaehlWert[];
describe('Zählen (COUNT): wie viele der Spalten treffen - nur gültige Werte, nie fehlend (Fachblatt 4.1)', () => {
  const d = zdaten();
  for (const f of Z.faelle as { name: string; zaehle: any[]; erwartet: number[] }[]) {
    const o = { spalten: ['q1', 'q2', 'q3', 'q4'], ziel: 'zz', zaehle: zaehlWerte(f.zaehle) };
    it(`${f.name}: zaehlenWerte gegen R, der PSPP-Befehl in der Engine gleich zaehlenWerte`, () => {
      expect(zaehlenWerte(d, o), 'JS').toEqual(f.erwartet);
      lade(d); const b = zaehlenBefehl(d, o); ok(b.syntax); expect(spaltenwerte('zz'), 'Engine').toEqual(f.erwartet); expect(b.format).toBe('F8.0'); expect(b.ziel).toBe('zz');
      const v = leseVerzeichnis(m.run('DISPLAY DICTIONARY.')).find(s => s.name === 'zz')!; expect(v.niveau).toBe('metrisch'); expect(v.format).toBe('F8.0');
    });
  }
  it('die Falle: PSPP-COUNT mit „LO THRU 2“ zählt auch den fehlenden Code -9 mit (Beleg in abweichungen.count_bereich_fehlend) - der Befehl des Assistenten tut das nicht', () => {
    const a = ABW.count_bereich_fehlend; expect(a.pspp).not.toEqual(a.soll); expect(a.soll).toEqual(Z.faelle.find((f: any) => f.name === 'bis2').erwartet);
    const o = { spalten: ['q1', 'q2', 'q3', 'q4'], ziel: 'zz', zaehle: [{ bereich: ['LO', 2] }] as ZaehlWert[] }; lade(d); ok(zaehlenBefehl(d, o).syntax); expect(spaltenwerte('zz')).toEqual(a.soll);
  });
  it('mehrere Wertangaben in einem Befehl (1 oder 2), Bereich mit HI (4 THRU HI), Teilauswahl der Spalten', () => {
    expect(zaehlenWerte(d, { spalten: ['q1', 'q2'], ziel: 'z', zaehle: [{ wert: 5 }, { bereich: [1, 2] }] })).toEqual([2, 1, 0, 2, 0, 0, 1, 1]);
    expect(zaehlenWerte(d, { spalten: ['q3', 'q4'], ziel: 'z', zaehle: [{ bereich: [4, 'HI'] }] })).toEqual([0, 0, 2, 0, 0, 0, 2, 1]);
  });
  it('alle Fälle ohne Treffer: 0 (nie leer); Fall mit lauter Lücken bei „wert 5“: 0', () => { const w = zaehlenWerte(d, { spalten: ['q1', 'q2', 'q3', 'q4'], ziel: 'z', zaehle: [{ wert: 99 }] }); expect(w).toEqual(Array(8).fill(0)); });
  it('NVALID und NMISS in der Engine gleich R; zusammen ergeben sie die Zahl der Spalten (Pflichtfall 6)', () => {
    lade(d); const a = anzahlBefehl(d, { art: 'gueltig', spalten: ['q1', 'q2', 'q3', 'q4'], ziel: 'anz_gueltig' }), b = anzahlBefehl(d, { art: 'fehlend', spalten: ['q1', 'q2', 'q3', 'q4'], ziel: 'anz_fehlend' });
    ok(a.syntax); ok(b.syntax); expect(spaltenwerte('anz_gueltig')).toEqual(Z.nvalid); expect(spaltenwerte('anz_fehlend')).toEqual(Z.nmiss);
    expect(Z.nvalid.map((v: number, i: number) => v + Z.nmiss[i])).toEqual(Array(8).fill(4)); expect(a.bezeichnung).not.toBe(b.bezeichnung);
  });
  it('Pflichtfall 8: ein Mehrfachset als Auswahl (Zählwert aus dem Set): Zahl der Nennungen je Person 2, 1, 2, 0, 3, 1, 0, 1', () => {
    const dm: Daten = { spalten: ['oa', 'ob', 'oc'].map(n => sp(n)), zeilen: [[1, 1, 0], [1, 0, 0], [0, 1, 1], [0, 0, 0], [1, 1, 1], [0, 0, 1], [0, 0, 0], [1, 0, 0]] } as Daten;
    expect(zaehlenWerte(dm, { spalten: ['oa', 'ob', 'oc'], ziel: 'nenn', zaehle: [{ wert: 1 }] })).toEqual([2, 1, 2, 0, 3, 1, 0, 1]);
  });
  it('Ränder: Text in der Auswahl, keine Spalte, verkehrter Bereich, Zielname vergeben oder ungültig → AssistentFehler', () => {
    const dt: Daten = { spalten: [sp('q1'), sp('t', { art: 'text', format: 'A8' })], zeilen: [[1, 'a']] } as Daten, z = (o: Partial<{ spalten: string[]; ziel: string; zaehle: ZaehlWert[] }>) => () => zaehlenBefehl(dt, { spalten: ['q1'], ziel: 'n', zaehle: [{ wert: 1 }], ...o });
    expect(code(z({ spalten: ['q1', 't'] }))).toBe('spalte'); expect(code(z({ spalten: [] }))).toBe('leer'); expect(code(z({ zaehle: [{ bereich: [5, 2] }] }))).toBe('bereich'); expect(code(z({ ziel: 'q1' }))).toBe('ueberschreiben'); expect(code(z({ ziel: '1 ungültig' }))).toBe('name');
    expect(code(z({ spalten: ['gibt_es_nicht'] }))).toBe('spalte'); expect(code(z({ zaehle: [] }))).toBe('regeln');
  });
});

/* ------------------------------------------------------------------------------------------------ Fehlendcodes setzen */
const FC = E.fehlendcodes;
const einspaltig = (name: string, werte: number[]): Daten => ({ spalten: [sp(name)], zeilen: werte.map(v => [v]) }) as Daten;
describe('Fehlendcodes setzen (MISSING VALUES): nur die Bedeutung ändert sich, nie ein Wert; umkehrbar (Fachblatt 4.2, Befund 4)', () => {
  it('Pflichtfall 1: SoSci-Werte 4, 5, -9, 3, -1, 2: Mittel roh 0,667 (n 6), nach MISSING VALUES (-9, -1) 3,50 (n 4); die Vorschau zeigt beides vorher', () => {
    const d = einspaltig('x', FC.sosci6.werte), b = fehlendcodesBefehl(d, { spalten: ['x'], codes: FC.sosci6.codes });
    expect(b.syntax).toBe('MISSING VALUES x (-9, -1).'); expect(b.meldungen).toEqual([]);
    expect(b.vorschau).toEqual([{ spalte: 'x', betroffen: 2, mittelVorher: expect.any(Number), mittelNachher: expect.any(Number), n: 4 }]);
    nah(b.vorschau[0]!.mittelVorher, FC.sosci6.mittel_roh, 'Vorschau vorher'); nah(b.vorschau[0]!.mittelNachher, FC.sosci6.mittel_mit, 'Vorschau nachher');
    lade(d); nah(mw('x').mittel, FC.sosci6.mittel_roh, 'Engine vorher'); ok(b.syntax); const n = mw('x'); nah(n.mittel, FC.sosci6.mittel_mit, 'Engine nachher'); expect(n.n).toBe(FC.sosci6.n_mit);
    expect(spaltenwerte('x')).toEqual(FC.sosci6.werte);   // die Werte bleiben
  });
  it('Pflichtfall 2: Rückgängig - nach `rueckgaengig` ist es wieder 0,667 (n 6) und der Befehl ist ohne Meldung gelaufen', () => {
    const d = einspaltig('x', FC.sosci6.werte), b = fehlendcodesBefehl(d, { spalten: ['x'], codes: [-9, -1] }); lade(d); ok(b.syntax); ok(b.rueckgaengig);
    const n = mw('x'); nah(n.mittel, FC.sosci6.mittel_roh, 'zurück'); expect(n.n).toBe(6);
  });
  it('codes: [] hebt die Markierung auf (`MISSING VALUES x ().` - PSPP verlangt die leeren Klammern); mehrere Spalten in einem Befehl: `MISSING VALUES a b (-9).`', () => {
    const d: Daten = { spalten: [sp('a'), sp('b')], zeilen: [[1, -9], [-9, 2]] } as Daten;
    expect(fehlendcodesBefehl(d, { spalten: ['a', 'b'], codes: [-9] }).syntax).toBe('MISSING VALUES a b (-9).'); expect(fehlendcodesBefehl(d, { spalten: ['a', 'b'], codes: [] }).syntax).toBe('MISSING VALUES a b ().');
  });
  it('mehr als drei Codes: -1, -2, -3, -8, -9 in einer Spalte, die sonst positiv ist → ein Bereich `-9 THRU -1`, Mittel roh -1,75 gegen 3 (n 3)', () => {
    const c = FC.codes5, d = einspaltig('s5', c.werte), b = fehlendcodesBefehl(d, { spalten: ['s5'], codes: c.codes });
    expect(b.syntax).toBe(`MISSING VALUES s5 (${c.bereich}).`); lade(d); ok(b.syntax); const n = mw('s5'); nah(n.mittel, c.mittel_mit, 'Mittel mit Bereich'); expect(n.n).toBe(c.n_mit); nah(c.mittel_roh, -1.75, 'roh');
  });
  it('der Bereich würde einen GÜLTIGEN Wert (-5) einfangen → Meldung zuVieleCodes und die Spalte bleibt UNMARKIERT (PSPP würde -5 still zu fehlend machen: Mittel 7,5 statt 3,33)', () => {
    const t = FC.temp, d = einspaltig('temp', t.werte), b = fehlendcodesBefehl(d, { spalten: ['temp'], codes: t.codes });
    expect(b.meldungen).toEqual([{ art: 'zuVieleCodes', spalte: 'temp' }]); expect(b.syntax).not.toContain('MISSING VALUES temp'); expect(b.vorschau.filter(v => v.spalte === 'temp')).toEqual([]);
    nah(t.pspp_bereich.mittel, 7.5, 'Beleg PSPP'); expect(t.pspp_bereich.n).toBe(2); nah(t.mittel_mit_codes_allein, (t.werte.filter((v: number) => !t.codes.includes(v)) as number[]).reduce((a, b) => a + b, 0) / 3, 'Soll ohne Bereich');
  });
  it('Spalte mit Wertelabels und Fehlend schon gesetzt: der Befehl ersetzt die alte Markierung (kein Anhängen, kein stilles Behalten)', () => {
    const d: Daten = { spalten: [sp('x', { fehlend: [-9] })], zeilen: [[1], [-9], [-1]] } as Daten; lade(d); const b = fehlendcodesBefehl(d, { spalten: ['x'], codes: [-1] }); ok(b.syntax);
    expect(leseVerzeichnis(m.run('DISPLAY DICTIONARY.')).find(s => s.name === 'x')!.fehlend).toEqual([-1]);
  });
  it('Text-Spalte oder fehlende Spalte: Fehler (AssistentFehler spalte)', () => {
    const d: Daten = { spalten: [sp('t', { art: 'text', format: 'A8' })], zeilen: [['a']] } as Daten; expect(code(() => fehlendcodesBefehl(d, { spalten: ['t'], codes: [-9] }))).toBe('spalte'); expect(code(() => fehlendcodesBefehl(d, { spalten: ['gibt_es_nicht'], codes: [-9] }))).toBe('spalte');
  });
  it('neuAufbauen behält einen Fehlend-BEREICH, den die Engine gesetzt hat (sonst ginge -9 THRU -1 beim nächsten Neuaufbau still verloren, z. B. nach Sortieren oder Umformen)', () => {
    const d = einspaltig('s5', FC.codes5.werte); lade(d); ok(fehlendcodesBefehl(d, { spalten: ['s5'], codes: FC.codes5.codes }).syntax);
    const sps = leseVerzeichnis(m.run('DISPLAY DICTIONARY.')); const s5 = sps.find(s => s.name === 's5')!; expect(s5.fehlendText).toMatch(/THRU/);
    const { syntax } = neuAufbauen(sps, FC.codes5.werte.map((v: number) => [v])); expect(syntax).toMatch(/MISSING VALUES s5 \(-9 THRU -1\)/);
  });
  it('„Fehlende Werte ersetzen“ gibt es nicht: das Modul bietet kein Ersetzen durch Spaltenmittel, Median, LINT oder TREND an', async () => {
    const modul = await import('./datenassistentc'); expect(Object.keys(modul).filter(k => /ersetz|impute|smean|lint|trend|rmv/i.test(k))).toEqual([]);
  });
});

/* ------------------------------------------------------------------------------------------------ Sortieren */
const SO = E.sortieren;
const sdaten = (): Daten => ({ spalten: [sp('gruppe', { niveau: 'nominal' }), sp('alter', { fehlend: SO.daten.fehlend_alter }), sp('name', { art: 'text', format: 'A10', niveau: 'nominal' }), sp('nr'), sp('w')], zeilen: SO.daten.zeilen.map((r: any[]) => r.map(wert)) }) as Daten;
describe('Sortieren: Ansicht (Voreinstellung) ändert nichts; deutsche Reihenfolge, fehlende ans Ende, stabil (Fachblatt 4.3)', () => {
  for (const f of SO.faelle as { name: string; text: string; schluessel: { spalte: string; richtung: 'auf' | 'ab' }[]; reihenfolge: number[] }[]) it(`${f.name}: ${f.text}`, () => {
    const d = sdaten(), kopie = JSON.parse(JSON.stringify(d)); expect(sortiereReihenfolge(d, f.schluessel)).toEqual(f.reihenfolge); expect(d, 'die Ansicht ändert die Daten nicht').toEqual(kopie);
  });
  it('die Abweichung von PSPP SORT CASES (dokumentiert): PSPP stellt systemfehlende bei aufsteigend nach vorn und sortiert -9 als Zahl hinein - Statable hält beides am Ende', () => {
    const a = ABW.sortieren_pspp, st = sortiereReihenfolge(sdaten(), [{ spalte: 'alter', richtung: 'auf' }]); expect(a.pspp_alter_auf).toEqual([2, 4, 1, 7, 0, 6, 5, 3]); expect(st).not.toEqual(a.pspp_alter_auf); expect(st.slice(-2)).toEqual([2, 4]);
    expect(sortiereReihenfolge(sdaten(), [{ spalte: 'alter', richtung: 'ab' }]).slice(-2)).toEqual([2, 4]);   // absteigend: wieder am Ende
  });
  it('Text mit Ziffern: Voreinstellung nach Zeichen (1, 10, 2, a20, a3, B1), mit natuerlich nach Zahlenwert (1, 2, 10, a3, a20, B1)', () => {
    const d: Daten = { spalten: [sp('t', { art: 'text', format: 'A8', niveau: 'nominal' })], zeilen: ['2', '10', '1', 'a20', 'a3', 'B1'].map(t => [t]) } as Daten, namen = (o: number[]) => o.map(i => d.zeilen[i]![0]);
    expect(namen(sortiereReihenfolge(d, [{ spalte: 't', richtung: 'auf' }]))).toEqual(['1', '10', '2', 'a20', 'a3', 'B1']); expect(namen(sortiereReihenfolge(d, [{ spalte: 't', richtung: 'auf', natuerlich: true }]))).toEqual(['1', '2', '10', 'a3', 'a20', 'B1']);
  });
  it('Datum als Datum, nicht als Text: ADATE (Monat zuerst) 12/31/2019, 01/15/2020, 06/30/2019 → 06/30/2019, 12/31/2019, 01/15/2020', () => {
    const d: Daten = { spalten: [sp('dat', { art: 'datum', format: 'ADATE10' })], zeilen: [['12/31/2019'], ['01/15/2020'], ['06/30/2019']] } as Daten;
    expect(sortiereReihenfolge(d, [{ spalte: 'dat', richtung: 'auf' }])).toEqual([2, 0, 1]); expect(sortiereReihenfolge(d, [{ spalte: 'dat', richtung: 'ab' }])).toEqual([1, 0, 2]);
  });
  it('Fehler: Spalte unbekannt → spalte, keine Schlüssel → regeln', () => { expect(code(() => sortiereReihenfolge(sdaten(), [{ spalte: 'gibt_es_nicht', richtung: 'auf' }]))).toBe('spalte'); expect(code(() => sortiereReihenfolge(sdaten(), []))).toBe('regeln'); });
  it('leere Daten und eine Zeile: kein Fehler', () => { const d = sdaten(); expect(sortiereReihenfolge({ ...d, zeilen: [] }, [{ spalte: 'alter', richtung: 'auf' }])).toEqual([]); expect(sortiereReihenfolge({ ...d, zeilen: [d.zeilen[0]!] }, [{ spalte: 'alter', richtung: 'ab' }])).toEqual([0]); });
});

describe('Dauerhaft sortieren (Pflichtfall 5): Fallgewicht, Auswahl und Befehlsprotokoll gehen mit', () => {
  const schl = [{ spalte: 'alter', richtung: 'ab' as const }, { spalte: 'name', richtung: 'auf' as const }];
  it('die Zeilen sind umsortiert, ALLE Spalten gehen mit (auch das Fallgewicht w), das Original bleibt unverändert', () => {
    const d = sdaten(), kopie = JSON.parse(JSON.stringify(d)), r = sortiereDauerhaft(d, schl); expect(d).toEqual(kopie);
    r.daten.zeilen.forEach((z, k) => expect(z, `Zeile ${k}`).toEqual(d.zeilen[r.reihenfolge[k]!])); expect(r.daten.spalten).toEqual(d.spalten); expect(r.reihenfolge).toEqual(sortiereReihenfolge(d, schl));
    const w = r.daten.zeilen.map(z => z[4]); expect(w).toEqual(r.reihenfolge.map(i => SO.daten.zeilen[i][4]));
  });
  it('altNummer: eine neue Spalte mit der alten Zeilennummer (1-basiert); auswahl: die ausgewählten Fälle behalten ihre Identität', () => {
    const d = sdaten(), r = sortiereDauerhaft(d, [{ spalte: 'alter', richtung: 'ab' }], { altNummer: 'fallnr_alt', auswahl: [0, 2, 4] });
    const j = r.daten.spalten.findIndex(s => s.name === 'fallnr_alt'); expect(j).toBe(d.spalten.length); expect(r.daten.zeilen.map(z => z[j])).toEqual(r.reihenfolge.map(i => i + 1));
    expect(r.auswahl).toEqual([...[0, 2, 4].map(i => r.reihenfolge.indexOf(i))].sort((a, b) => a - b));
  });
  it('Befehlsprotokoll nennt Schlüssel und Richtung; der Hinweis sagt, dass sich die Zeilennummern ändern', () => {
    const r = sortiereDauerhaft(sdaten(), schl); expect(r.befehl).toBe('Dauerhaft sortiert nach alter (absteigend), name (aufsteigend)'); expect(r.hinweis).toBe('Danach ändern sich die Zeilennummern.');
  });
  it('dieselbe Reihenfolge, nochmal sortiert, ändert nichts mehr (stabil, vorhersagbar)', () => { const r1 = sortiereDauerhaft(sdaten(), schl), r2 = sortiereDauerhaft(r1.daten, schl); expect(r2.reihenfolge).toEqual(r1.reihenfolge.map((_, i) => i)); });
  it('nach dem Neuaufbau in der Engine bleibt das Fallgewicht an seinen Zeilen und der -9-Code fehlend (neuAufbauen schreibt MISSING VALUES)', () => {
    const r = sortiereDauerhaft(sdaten(), [{ spalte: 'alter', richtung: 'auf' }]); lade(r.daten);
    expect(spaltenwerte('w')).toEqual(r.reihenfolge.map(i => SO.daten.zeilen[i][4])); expect(leseVerzeichnis(m.run('DISPLAY DICTIONARY.')).find(s => s.name === 'alter')!.fehlend).toEqual([-9]);
  });
});

/* ------------------------------------------------------------------------------------------------ Skalenwert-Voreinstellung und PSPP-Befunde */
describe('Skalenwert aus verfügbaren Items: neu angelegte Skalenwerte mit „mindestens die Hälfte“ (Entscheidung Opus 5)', () => {
  const f6 = ['f1', 'f2', 'f3', 'f4', 'f5', 'f6'];
  it('neuerSkalenwertBefehl: Voreinstellung die Hälfte (6 Fragen → MEAN.3, 5 Fragen → MEAN.3, 4 Fragen → MEAN.2); ausdrückliche Zahl bleibt', () => {
    expect(neuerSkalenwertBefehl(f6, 'skala', 'Skala')).toContain('MEAN.3(f1, f2, f3, f4, f5, f6)'); expect(neuerSkalenwertBefehl(f6.slice(0, 5), 'skala', 'Skala')).toContain('MEAN.3(');
    expect(neuerSkalenwertBefehl(f6.slice(0, 4), 'skala', 'Skala')).toContain('MEAN.2('); expect(neuerSkalenwertBefehl(f6, 'skala', 'Skala', 1)).toContain('MEAN(f1'); expect(neuerSkalenwertBefehl(f6, 'skala', 'Skala', 5)).toContain('MEAN.5(');
    expect(mindestzahl(6, 'haelfte')).toBe(3);
  });
  it('gespeicherte Projekte und Befehle bleiben unverändert: skalenwertBefehl hat weiter die Voreinstellung 1 (kein .n)', () => { expect(skalenwertBefehl(f6, 'skala', 'Skala')).toContain('COMPUTE skala = MEAN(f1'); expect(skalenwertBefehl(f6, 'skala', 'Skala')).not.toContain('MEAN.'); });
  it('Pflichtfall 4 „Fehlende Werte“: eine Person mit weniger als der Hälfte der Items bleibt LEER (nicht 0), die mit genug bekommt den Mittelwert der vorhandenen', () => {
    const d: Daten = { spalten: f6.map(n => sp(n)), zeilen: [[4, 5, null, null, null, null], [4, 5, 3, null, null, null], [null, null, null, null, null, null], [1, 2, 3, 4, 5, 3]] } as Daten; lade(d);
    ok(neuerSkalenwertBefehl(f6, 'skala', 'Skala')); const v = spaltenwerte('skala'); expect(v[0]).toBeNull(); nah(v[1], 4, 'drei von sechs: 4'); expect(v[2]).toBeNull(); nah(v[3], 3, 'alle: 3');
  });
});

describe('PSPP-Befunde F9 bis F11 und RMV stehen in docs/PSPP-BEFUNDE.md (Bauer B trägt sie ein; Fehlerbericht schickt später Johannes)', () => {
  const t = readFileSync(new URL('../../../docs/PSPP-BEFUNDE.md', import.meta.url), 'utf8');
  it('F9 (Gesamtspalte leer), F10 (Wörterbuch-Gewicht gerundet), F11 (COLPCT.TOTALN)', () => {
    for (const [f, wort] of [['F9', /TOTAL=YES|Gesamtspalte/], ['F10', /gerundet|rundet/], ['F11', /TOTALN/]] as const) { const z = t.split('\n').find(l => l.startsWith(`| ${f} |`)); expect(z, `Zeile ${f}`).toBeTruthy(); expect(z!, f).toMatch(wort); expect(z!, f).toContain('CTABLES'); }
  });
  it('RMV unter „Fehlende Funktionen“ („not yet implemented“) mit dem Hinweis, dass Statable es bewusst nicht anbietet', () => {
    const i = t.indexOf('## Fehlende Funktionen'), j = t.indexOf('## Kleinigkeiten'); const abschnitt = t.slice(i, j); const zeile = abschnitt.split('\n').find(l => l.includes('RMV'));
    expect(zeile, 'Zeile mit RMV').toBeTruthy(); expect(zeile!).toMatch(/not yet implemented/); expect(zeile!).toMatch(/bewusst|nicht angeboten|nicht an/);
  });
});
