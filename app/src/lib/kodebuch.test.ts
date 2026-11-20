import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import erwartet from './testdaten/spaeter-c-erwartet.json';
import { nodeEngine } from './testengine';
import { leseCsv, zurEngine } from './einlesen';
import { liesSpssSyntax } from './spsssyntax';
import { kodebuchAusSyntax, wendeKodebuchAn, type Kodebuch } from './kodebuch';
import { zaehlwertVorschlag } from './mehrfach';
import { leseVerzeichnis } from './verzeichnis';

/* ===== Später, Welle S-C, Bauer B: Kodebuch (D4) - Typ, Aufbau aus der SPSS-Syntax, Anwenden mit Befehlsprotokoll; NICHTS passiert still, alles ist umkehrbar =====
 * Fachblatt 2.3 (Kodebuch-Skizze), 2.4, 2.5 Nr. 1, „Entscheidungen Opus“ Grundsatz und 3: Fehlendcodes werden nur VORGESCHLAGEN; angewendet wird nur, was die Person angekreuzt hat.
 * Sollwerte: testdaten/spaeter-c-erwartet.json (fragebogen.sosci, .sosci_sps, .unbekannt) aus scripts/spaeter-c-erwartet.R; Mittelwerte: R und PSPP DESCRIPTIVES (abweichungen, fehlendcodes).
 * Testdateien sind NACHGEBAUT (testdaten/fragebogen/LIESMICH.md).
 *
 * ---------------------------------- Schnittstelle (festgelegt vom Prüfer; Modul lib/kodebuch.ts) ----------------------------------
 *  type Hersteller = 'sosci' | 'limesurvey' | 'unipark' | 'qualtrics' | 'unbekannt'
 *  interface KodebuchSpalte { name?: string; label?: string; werteLabels?: Record<string, string>; fehlend?: (number | { von: number; bis: number })[]; niveau?: 'nominal' | 'ordinal' | 'skala';
 *                             rolle?: 'frage' | 'metadaten' | 'zeit' | 'text'; gruppe?: { id: string; art: 'mehrfach' | 'itemblock'; zaehlwert?: number | string } }
 *  interface Kodebuch { hersteller: Hersteller; spalten: Record<string, KodebuchSpalte>; fall: { testFilter?: string; vollstaendigFilter?: string } }
 *  kodebuchAusSyntax(syn: SpssSyntaxErgebnis, hersteller?: Hersteller /* Voreinstellung 'unbekannt' *\/): Kodebuch
 *      - label ← VARIABLE LABELS, werteLabels ← VALUE LABELS, fehlend ← MISSING VALUES, niveau ← VARIABLE LEVEL (SCALE → 'skala')
 *      - Mehrfachauswahl-Gruppe: ≥ 2 Spalten mit demselben Namensstamm (`A002_01`, `A002_02` → id `A002`; `q_1`, `q_2` → `q`; Endung `_` + Ziffern) UND denselben zwei Wertelabels; zaehlwert = der Wert, dessen Beschriftung NICHT mit
 *        „nicht“/„not“/„kein“ beginnt und nicht „nein“/„no“ heißt (aus dem KODEBUCH, nicht geraten); bei 0 „nein“ / 1 „ja“ also 1, bei 1 „nicht gewählt“ / 2 „gewählt“ also 2.
 *  wendeKodebuchAn(d: Daten, kb: Kodebuch, wahl?: { fehlend?: boolean; wertelabels?: boolean; labels?: boolean; mehrfachsets?: boolean }):
 *      { daten: Daten; befehle: string[]; rueckgaengig: string[]; sets: MehrfachSet[]; meldungen: { art: 'zuVieleCodes' | 'unbekannteSpalte'; spalte: string }[] }
 *      - OHNE `wahl` (oder alles false): daten unverändert (gleiche Werte, gleiche Spalten), befehle/rueckgaengig/sets leer - „Nichts passiert still“.
 *      - befehle sind PSPP-Syntax im Stil von neuAufbauen: `VARIABLE LABELS A001 'Text'.`, `VALUE LABELS A001 1 'a' 2 'b'.`, `MISSING VALUES A001 (-9, -1).` (diese stehen im Befehlsprotokoll)
 *      - rueckgaengig stellt den Zustand davor her (`MISSING VALUES A001 ().` mit leerer Liste hebt die Markierung auf (PSPP verlangt die Klammern))
 *      - mehr als drei einzelne Codes: ein Bereich `lo THRU hi`, aber NUR wenn in dieser Spalte zwischen lo und hi kein anderer Wert vorkommt; sonst `meldungen` mit art 'zuVieleCodes' und die Spalte bleibt UNMARKIERT (nie still falsch)
 *      - Werte der Daten werden nie verändert (nur ihre Bedeutung)
 */
const FB = (erwartet as any).fragebogen, SO = FB.sosci, SP = FB.sosci_sps;
const datei = (n: string) => readFileSync(new URL(`./testdaten/fragebogen/${n}`, import.meta.url), 'utf8');
const sosciKb = (): Kodebuch => kodebuchAusSyntax(liesSpssSyntax(datei('sosci-nachgebaut.sps')), 'sosci');
const nah = (a: number, b: number, w = '') => expect(Math.abs(a - b), `${w}: ${a} gegen ${b}`).toBeLessThanOrEqual(1e-9 * Math.max(1, Math.abs(b)));

describe('Kodebuch aus der SoSci-.sps (Pflichtfall 2: Zählwert 2 aus dem Kodebuch, nicht aus zaehlwertVorschlag)', () => {
  const kb = sosciKb();
  it('Hersteller, Labels, Wertelabels, Fehlend und Niveau je Spalte', () => {
    expect(kb.hersteller).toBe('sosci');
    expect(kb.spalten.A001).toMatchObject({ label: SP.variablenlabels.A001, werteLabels: SP.wertelabels.A001, niveau: 'ordinal' });
    expect(kb.spalten.A001!.fehlend).toEqual([-9, -1]);
    expect(kb.spalten.A002_01).toMatchObject({ label: SP.variablenlabels.A002_01, niveau: 'nominal' });
    expect(kb.spalten.TIME_SUM!.niveau).toBe('skala');
  });
  it('Mehrfachauswahl A002_01 bis A002_03: eine Gruppe `A002`, Art mehrfach, Zählwert 2 (1 = nicht gewählt, 2 = gewählt)', () => {
    for (const n of ['A002_01', 'A002_02', 'A002_03']) expect(kb.spalten[n]!.gruppe, n).toEqual({ id: 'A002', art: 'mehrfach', zaehlwert: 2 });
    expect(kb.spalten.A001!.gruppe).toBeUndefined();
  });
  it('die Falle, die das Kodebuch umgeht: zaehlwertVorschlag([1, 2]) ohne Beschriftung (CSV ohne .sps) rät 1 = „nicht gewählt“ (die kleinere Zahl)', () => {
    expect(zaehlwertVorschlag([1, 2])).toBe(1);
  });
  it('Zählwert aus den Beschriftungen: 0 „nein“ / 1 „ja“ → 1; 1 „nicht gewählt“ / 2 „gewählt“ → 2; ein Stamm mit nur einer Spalte ist keine Gruppe', () => {
    const a = kodebuchAusSyntax(liesSpssSyntax("VALUE LABELS m_1 m_2 0 'nein' 1 'ja'.\nVALUE LABELS einzel 0 'nein' 1 'ja'."));
    expect(a.spalten.m_1!.gruppe).toEqual({ id: 'm', art: 'mehrfach', zaehlwert: 1 }); expect(a.spalten.m_2!.gruppe!.zaehlwert).toBe(1); expect(a.spalten.einzel!.gruppe).toBeUndefined();
    const b = kodebuchAusSyntax(liesSpssSyntax("VALUE LABELS x_1 x_2 x_3 1 'nicht gewählt' 2 'gewählt'."));
    expect(b.spalten.x_3!.gruppe).toEqual({ id: 'x', art: 'mehrfach', zaehlwert: 2 });
  });
  it('leere Syntax: leeres Kodebuch, kein Fehler', () => { const k = kodebuchAusSyntax(liesSpssSyntax(''), 'unbekannt'); expect(k.hersteller).toBe('unbekannt'); expect(k.spalten).toEqual({}); });
});

describe('Kodebuch anwenden: Vorschlag mit Kästchen, Befehlsprotokoll, umkehrbar (Pflichtfall 1: M 3,50 statt 0,667)', () => {
  let m: Awaited<ReturnType<typeof nodeEngine>>;
  beforeAll(async () => { m = await nodeEngine(); });
  const lade = () => { const t = leseCsv(datei('sosci-nachgebaut.csv')); const z = zurEngine(t); m.run('NEW FILE.\n' + z.syntax, { '/import.csv': z.csv }); return z; };
  const daten = () => { const items = m.run('DISPLAY DICTIONARY.'); return { spalten: leseVerzeichnis(items), zeilen: [] as (string | number | null)[][] }; };
  const stat = () => { const t = m.run('DESCRIPTIVES A001 /STATISTICS=MEAN.').filter(i => i.type === 'table').find((i: any) => i.label === 'Descriptive Statistics') as any; const c = (r: number, k: number) => t.cells.find((x: any) => x.r === r && x.c === k)?.n; return { n: c(1, 1) as number, mittel: c(1, 2) as number }; };
  it('ohne Auswahl passiert nichts: keine Befehle, Daten und Spalten unverändert', () => {
    const d = daten(), r = wendeKodebuchAn(d, sosciKb());
    expect(r.befehle).toEqual([]); expect(r.rueckgaengig).toEqual([]); expect(r.sets).toEqual([]); expect(r.daten).toEqual(d);
    const r2 = wendeKodebuchAn(d, sosciKb(), { fehlend: false, wertelabels: false, labels: false, mehrfachsets: false }); expect(r2.befehle).toEqual([]);
  });
  it('Befehlsprotokoll: MISSING VALUES A001 (-9, -1), VALUE LABELS mit allen sieben Beschriftungen, VARIABLE LABELS', () => {
    lade(); const r = wendeKodebuchAn(daten(), sosciKb(), { fehlend: true, wertelabels: true, labels: true });
    expect(r.befehle).toContain('MISSING VALUES A001 (-9, -1).');
    const vl = r.befehle.find(b => b.startsWith('VALUE LABELS A001 '))!; expect(vl).toBeTruthy(); expect(vl).toContain("-9 'nicht beantwortet'"); expect(vl).toContain("5 'sehr zufrieden'"); expect(vl.endsWith('.')).toBe(true);
    expect(r.befehle).toContain("VARIABLE LABELS A001 'Wie zufrieden sind Sie mit dem Seminar?'.");
  });
  it('in der echten Engine: Mittel vor der Markierung 0,667 (n 6), danach 3,50 (n 4) - und nach `rueckgaengig` wieder 0,667', () => {
    lade(); const vorher = stat();
    nah(vorher.mittel, SO.mittel.roh, 'Mittel roh'); expect(vorher.n).toBe(SO.mittel.n_roh);
    const r = wendeKodebuchAn(daten(), sosciKb(), { fehlend: true, wertelabels: true, labels: true });
    const ok = (befehle: string[]) => { const out = m.run(befehle.join('\n')); expect(out.filter(i => i.type === 'message' && (i as any).severity === 'error').map((i: any) => i.text), befehle.join('\n')).toEqual([]); };
    ok(r.befehle); const nachher = stat(); nah(nachher.mittel, SO.mittel.mit_markierung, 'Mittel markiert'); expect(nachher.n).toBe(SO.mittel.n_mit);
    expect(leseVerzeichnis(m.run('DISPLAY DICTIONARY.')).find(s => s.name === 'A001')!.fehlend.sort((a, b) => a - b)).toEqual([-9, -1]);
    ok(r.rueckgaengig); const zurueck = stat(); nah(zurueck.mittel, SO.mittel.roh, 'Mittel nach Rückgängig'); expect(zurueck.n).toBe(SO.mittel.n_roh);
  });
  it('die Werte bleiben, wie sie sind: nur die Bedeutung ändert sich (Spaltenwerte der Daten gleich vorher und nachher)', () => {
    const d = { spalten: daten().spalten, zeilen: [[4], [5], [-9], [3], [-1], [2]] as (number | null)[][] };
    const d1 = { spalten: d.spalten.filter(s => s.name === 'A001'), zeilen: d.zeilen };
    const r = wendeKodebuchAn(d1 as any, sosciKb(), { fehlend: true }); expect(r.daten.zeilen).toEqual(d1.zeilen);
    expect(r.daten.spalten.find(s => s.name === 'A001')!.fehlend.sort((a, b) => a - b)).toEqual([-9, -1]);
  });
  it('Mehrfachsets: A002 mit Zählwert 2 aus dem Kodebuch (Name, Beschriftung ohne die Optionsendung, drei Spalten)', () => {
    const r = wendeKodebuchAn(daten(), sosciKb(), { mehrfachsets: true });
    expect(r.sets.length).toBe(1); expect(r.sets[0]).toMatchObject({ name: 'A002', spalten: ['A002_01', 'A002_02', 'A002_03'], zaehlwert: 2 });
    expect(r.befehle).toEqual([]);   // ein Set ist kein PSPP-Befehl, sondern Projektzustand
  });
});

describe('mehr als drei Codes: Bereich nur, wenn er nichts Gültiges einfängt (PSPP erlaubt höchstens drei einzelne Werte oder einen Bereich)', () => {
  const sp = (name: string) => ({ name, bezeichnung: '', art: 'zahl' as const, niveau: 'metrisch' as const, format: 'F8.0', fehlend: [], fehlendText: '', werteLabels: {} });
  const kb = (codes: number[], name: string): Kodebuch => ({ hersteller: 'sosci', spalten: { [name]: { fehlend: codes } }, fall: {} });
  it('codes5: -1, -2, -3, -8, -9 und sonst nur positive Werte → MISSING VALUES … (-9 THRU -1).', () => {
    const w = (erwartet as any).daten.fehlendcodes.codes5.werte as number[];
    const r = wendeKodebuchAn({ spalten: [sp('s5')], zeilen: w.map(v => [v]) } as any, kb([-1, -2, -3, -8, -9], 's5'), { fehlend: true });
    expect(r.befehle).toEqual(['MISSING VALUES s5 (-9 THRU -1).']); expect(r.meldungen).toEqual([]);
  });
  it('temp: ein gültiger Wert -5 liegt im Bereich → keine Markierung, Meldung zuVieleCodes (nie still falsch)', () => {
    const w = (erwartet as any).daten.fehlendcodes.temp.werte as number[];
    const r = wendeKodebuchAn({ spalten: [sp('temp')], zeilen: w.map(v => [v]) } as any, kb([-1, -2, -3, -8], 'temp'), { fehlend: true });
    expect(r.befehle.filter(b => b.startsWith('MISSING VALUES'))).toEqual([]); expect(r.meldungen).toEqual([{ art: 'zuVieleCodes', spalte: 'temp' }]);
  });
  it('höchstens drei einzelne Codes bleiben einzelne Codes', () => {
    const r = wendeKodebuchAn({ spalten: [sp('q')], zeilen: [[1], [-9], [-1], [3]] } as any, kb([-9, -1], 'q'), { fehlend: true }); expect(r.befehle).toEqual(['MISSING VALUES q (-9, -1).']);
  });
  it('Spalte, die es in den Daten nicht gibt: Meldung unbekannteSpalte, kein Absturz', () => {
    const r = wendeKodebuchAn({ spalten: [sp('q')], zeilen: [[1]] } as any, kb([-9], 'gibt_es_nicht'), { fehlend: true }); expect(r.meldungen).toEqual([{ art: 'unbekannteSpalte', spalte: 'gibt_es_nicht' }]);
  });
});
