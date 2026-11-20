import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import erwartet from './testdaten/spaeter-a-erwartet.json';
import { nodeEngine } from './testengine';
import { parseCsv } from '../dialogs/csv';
import { leseVerzeichnis, type Spalte } from './verzeichnis';
import { AssistentFehler, type Daten } from './datenassistent';
import { klassenBefehl, klassenBeschriftung, klassenGrenzen, klassenVorschau, klassenWerte, quantilTyp6, type KlassenOpt } from './klassieren';
import { s } from './sitzung.svelte';

/* ===== Welle S-A, Teil 3: Klassieren mit Vorschau (D3; Fachblatt Abschnitt 3 und „Entscheidungen Opus“) =====
 * Sollwerte: scripts/spaeter-a-erwartet.R → testdaten/spaeter-a-erwartet.json (Abschnitt klassieren): R `cut(x, unique(breaks), include.lowest = TRUE, right = TRUE/FALSE)` mit
 * breaks = c(min, Quantile Typ 6 bzw. seq(min, max, length.out = k + 1), max); gewichtete Quantile = PSPP-HAVERAGE. Zweite Quelle: PSPP selbst (der erzeugte RECODE läuft in der echten Engine). Der Bauer ändert Test und JSON nicht.
 * Das Modul `lib/klassieren.ts` (reine Funktionen) hat diese API - sie ist hier festgelegt; es benutzt den Fehlertyp AssistentFehler aus lib/datenassistent.ts und bildet EINEN Pfad zur RECODE-Syntax:
 *
 *   type KlassenArt = 'gleichbreit' | 'quantil' | 'eigene'
 *   interface KlassenOpt { spalte; ziel; art; k?: number (gleichbreit 5, quantil 4; 1 … 12); grenzen?: number[] (eigene: streng aufsteigend); offen?: boolean (eigene, Standard true: „bis a“ … „über z“);
 *       grenzeZu?: 'unten' | 'oben' (Standard 'unten': Grenzwert gehört zur UNTEREN Klasse = rechts geschlossen; 'oben' = links geschlossen);
 *       gewicht?: { spalte: string; art: 'haeufigkeit' | 'umfrage' }  (Spalte in den Daten; ihre Zahlen sind das Fallgewicht); ueberschreiben?: boolean }
 *   quantilTyp6(werte, p): number                  R quantile(type = 6) (die Regel der Verteilungskarte, NICHT type 7)
 *   klassenGrenzen(werte, { art, k?, grenzen?, offen?, gewichte?, gewichtArt? }): { breaks: number[]; k: number; zusammengefallen: boolean; offen: boolean }
 *       werte = nur gültige Zahlen. gleichbreit/quantil: breaks = eindeutige Grenzen von min bis max (min und max EXAKT, keine Verschiebung wie bei cut(x, k)); k = tatsächliche Klassenzahl
 *       (kleiner als verlangt, wenn Grenzen zusammenfallen: zusammengefallen = true). eigene: breaks = die Grenzen. Gewicht: Zeilen mit Gewicht 0 zählen nicht; Häufigkeitsgewicht = Quantile wie auf der erweiterten Datei (Typ 6);
 *       Umfragegewicht = HAVERAGE mit auf Σw = Zeilen normierten Gewichten (siehe gewichte.test.ts: normiere). Fehler: 'k' (kein ganzes 1 … 12), 'grenzen' (nicht streng aufsteigend, leer), 'konstant' (nur ein verschiedener Wert), 'keine-werte'.
 *   klassenWerte(d: Daten, o): (number | null)[]   Klasse 1 … k je Zeile, null = leer (fehlend, benutzerdefiniert fehlend, Gewicht 0 ist NICHT leer: die Zeile ist klassiert, zählt aber nichts)
 *       Grenzvergleich mit Toleranz 1e-12·max(1,|b|) (0,1 + 0,2 gehört zu „bis 0,3“). Werte außerhalb bei eigene ohne offene Ränder: null.
 *   klassenVorschau(d, o): { klassen: { nr; von: number | null; bis: number | null; vonEin: boolean; bisEin: boolean; beschriftung: string; anzahl: number /* gewichtet *\/; anteil: number }[];
 *       aufGrenze: number /* Fälle (gewichtet) genau auf einer inneren Grenze *\/; gewichtet: boolean; k: number; kGewuenscht: number; zusammengefallen: boolean; gueltig: number /* Summe der Fälle *\/; hinweise: ('informationsverlust' | 'zusammengefallen')[] }
 *   klassenBeschriftung(innereGrenzen: number[], grenzeZu?): string[]    de: „bis 18“, „über 18 bis 25“, „über 25“ bzw. „unter 18“, „18 bis unter 25“, „25 und mehr“ (nie erfundene Zahlen); Zahlen im Format der Sprache
 *   klassenBefehl(d, o): { syntax: string; ziel: string; k: number; labels: Record<string, string> }    RECODE … INTO + FORMATS F8.0 + VALUE LABELS + VARIABLE LEVEL ORDINAL + EXECUTE
 *       Fehlende und benutzerdefiniert fehlende Werte werden VOR den Wertregeln auf leer gesetzt (MISSING=SYSMIS), die Quelle bleibt unverändert, die Toleranz 1e-12 steckt in den Grenzen der Syntax.
 *       Fehler wie in lib/datenassistent.ts: 'name' (ungültiger PSPP-Name), 'ueberschreiben' (Ziel gibt es schon), 'spalte' (keine Zahlenspalte).
 */

const K = (erwartet as any).klassieren;
const nah = (ist: number, soll: number, tol = 1e-9) => expect(Math.abs(ist - soll), `${ist} gegen ${soll}`).toBeLessThanOrEqual(tol * Math.max(1, Math.abs(soll)));
const nahListe = (ist: number[], soll: number[], tol = 1e-9) => { expect(ist.length, `Länge: ${ist} gegen ${soll}`).toBe(soll.length); soll.forEach((x, i) => nah(ist[i]!, x, tol)); };
s.einst.sprache = 'de'; s.einst.anrede = 'du';
const sp = (name: string, rest: Partial<Spalte> = {}): Spalte => ({ name, bezeichnung: '', art: 'zahl', niveau: 'metrisch', format: 'F8.2', fehlend: [], fehlendText: '', werteLabels: {}, ...rest });
/** x aus dem JSON; JSON trägt nur 15 Stellen, darum wird 0,1 + 0,2 hier wirklich addiert (summe_index). */
const xVon = (f: any): (number | null)[] => { const x = [...f.x] as (number | null)[]; if (f.summe_index) x[f.summe_index - 1] = f.summe_a + f.summe_b; return x; };
const daten = (f: any): Daten => ({ spalten: [sp('x', { fehlend: f.fehlend ?? [] }), ...(f.w ? [sp('w')] : [])], zeilen: xVon(f).map((v, i) => f.w ? [v, f.w[i]] : [v]) });
const opt = (f: any, rechts = true): KlassenOpt => ({ spalte: 'x', ziel: 'xk', art: f.art, k: f.k ?? undefined, grenzen: f.grenzen_eingabe ?? undefined, offen: f.art === 'eigene' ? f.offen : undefined,
  grenzeZu: rechts ? 'unten' : 'oben', gewicht: f.w ? { spalte: 'w', art: f.gewichtart } : undefined });
const gueltigeX = (f: any) => (f.x as (number | null)[]).filter(v => v !== null && !(f.fehlend ?? []).includes(v)) as number[];

describe('Klassengrenzen gegen R (cut-Grenzen ohne Verschiebung; Quantile Typ 6, nicht Typ 7)', () => {
  for (const f of K.faelle.filter((x: any) => x.art !== 'eigene')) it(`${f.name}: ${f.beschreibung || f.art + ' k=' + f.k}`, () => {
    const x = f.x as (number | null)[], gew = f.w as number[] | undefined;
    const idx = x.map((v, i) => i).filter(i => x[i] !== null && !(f.fehlend ?? []).includes(x[i]));
    const g = klassenGrenzen(idx.map(i => x[i]!), { art: f.art, k: f.k, gewichte: gew ? idx.map(i => gew[i]!) : undefined, gewichtArt: f.gewichtart ?? undefined });
    nahListe(g.breaks, f.breaks, 1e-12); expect(g.k).toBe(f.k_tatsaechlich); expect(g.zusammengefallen).toBe(f.zusammengefallen);
  });
  for (const f of K.faelle.filter((x: any) => x.art === 'eigene')) it(`${f.name}: eigene Grenzen ${JSON.stringify(f.grenzen_eingabe)}${f.offen ? '' : ' ohne offene Ränder'}`, () => {
    const g = klassenGrenzen(gueltigeX(f), { art: 'eigene', grenzen: f.grenzen_eingabe, offen: f.offen });
    nahListe(g.breaks, f.breaks, 1e-12); expect(g.k).toBe(f.k_tatsaechlich); expect(g.offen).toBe(f.offen);
  });
  it('Typ 6 gegen Typ 7 an x = 1,2,2,3,4,4,4,5,6,7,8,9,10,10,12 (Fachblatt 3.5 Nr. 1): Q1 = 3 (nicht 3,5), Q3 = 9 (nicht 8,5)', () => {
    const t = K.typ6_gegen_typ7;
    nahListe([.25, .5, .75].map(p => quantilTyp6(t.x, p)), t.typ6, 1e-12);
    expect(t.typ6).toEqual([3, 5, 9]); expect(t.typ7).toEqual([3.5, 5, 8.5]);
    nahListe(klassenGrenzen(t.x, { art: 'quantil', k: 4 }).breaks, [1, 3, 5, 9, 12]);
  });
  it('Mediansplit: k = 2 mit Quantil gibt die Grenze 5 (der Median; derselbe Wert wie im Baustein „In Gruppen teilen“)', () => {
    nahListe(klassenGrenzen(K.typ6_gegen_typ7.x, { art: 'quantil', k: 2 }).breaks, [1, 5, 12]);
  });
  it('Voreinstellungen: Quantil k = 4, gleich breit k = 5', () => {
    expect(klassenGrenzen([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], { art: 'quantil' }).k).toBe(4);
    expect(klassenGrenzen([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], { art: 'gleichbreit' }).k).toBe(5);
    expect(K.grenzen).toMatchObject({ k_voreinstellung_quantil: 4, k_voreinstellung_gleichbreit: 5, k_max: 12 });
  });
  it('zusammenfallende Grenzen (Bindungen: Quartile 1; 1,5; 4,25 …): weniger Klassen als verlangt, nie doppelte oder leere Klassen durch Duplikate', () => {
    const f = K.faelle.find((x: any) => x.name === 'bindungen_quantil_k4');
    const g = klassenGrenzen(f.x, { art: 'quantil', k: 4 }); expect(g.k).toBe(3); expect(g.zusammengefallen).toBe(true); expect(new Set(g.breaks).size).toBe(g.breaks.length);
    const v = klassenVorschau(daten(f), opt(f)); expect(v.k).toBe(3); expect(v.kGewuenscht).toBe(4); expect(v.zusammengefallen).toBe(true); expect(v.hinweise).toContain('zusammengefallen');
    expect(v.klassen.every(c => c.anzahl > 0)).toBe(true);
  });
});

describe('Zuordnung je Zeile gegen R (rechts geschlossen = Standard, links geschlossen umschaltbar)', () => {
  for (const f of K.faelle) for (const seite of ['rechts', 'links'] as const) it(`${f.name}, ${seite} geschlossen`, () => {
    const w = klassenWerte(daten(f), opt(f, seite === 'rechts'));
    expect(w).toEqual((f[seite].klasse as (number | null)[]).map(v => v ?? null));
  });
  it('Werte genau auf der Grenze: eigene Grenzen 4 und 8 - rechts „4“ zur unteren Klasse (7/4/4), links zur oberen (4/6/5); sonst gleiche Daten', () => {
    const f = K.faelle.find((x: any) => x.name === 'eigene_auf_grenze');
    expect(f.rechts.anzahl).toEqual([7, 4, 4]); expect(f.links.anzahl).toEqual([4, 6, 5]);
    expect(klassenVorschau(daten(f), opt(f, true)).klassen.map(c => c.anzahl)).toEqual([7, 4, 4]);
    expect(klassenVorschau(daten(f), opt(f, false)).klassen.map(c => c.anzahl)).toEqual([4, 6, 5]);
    expect(klassenVorschau(daten(f), opt(f)).aufGrenze).toBe(f.aufGrenze);   // 3 × 4 und 1 × 8
  });
  it('Standard ist rechts geschlossen (ohne grenzeZu)', () => {
    const f = K.faelle.find((x: any) => x.name === 'eigene_auf_grenze'), o = opt(f); delete o.grenzeZu;
    expect(klassenWerte(daten(f), o)).toEqual(f.rechts.klasse);
  });
  it('Dezimalfehler: 0,1 + 0,2 (= 0,30000000000000004) und 0,3 gehören beide zu „bis 0,3“ (Toleranz 1e-12); links: beide zur oberen Klasse', () => {
    const f = K.faelle.find((x: any) => x.name === 'dezimalfehler'); const d = daten(f);
    expect(d.zeilen[2]![0]).toBe(0.1 + 0.2); expect(d.zeilen[2]![0]).not.toBe(0.3);
    expect(klassenWerte(d, opt(f, true))).toEqual([1, 1, 1, 1, 2]); expect(klassenWerte(d, opt(f, false))).toEqual([1, 1, 2, 2, 2]);
    expect(f.rechts.anzahl).toEqual([4, 1]); expect(f.links.anzahl).toEqual([2, 3]);
  });
  it('fehlende Werte und der Code 99 bleiben leer und gehen weder in min/max noch in die Klassen ein; Messniveau der Spalte ändert nichts', () => {
    const f = K.faelle.find((x: any) => x.name === 'fehlend'), w = klassenWerte(daten(f), opt(f));
    expect(w.filter(v => v === null).length).toBe(4); expect(w[4]).toBeNull(); expect(w[2]).toBeNull();
    const ohne = klassenWerte({ spalten: [sp('x')], zeilen: f.x.map((v: number | null) => [v === 99 ? null : v]) }, opt(f)); expect(w).toEqual(ohne);
  });
});

describe('Vorschau: Tabelle Klasse - Von/Bis - Anzahl - Anteil, Fälle auf der Grenze, gewichtet gezählt', () => {
  for (const f of K.faelle) it(`${f.name}: Anzahl und Anteil je Klasse (gewichtet wo ein Gewicht gesetzt ist)`, () => {
    const v = klassenVorschau(daten(f), opt(f));
    nahListe(v.klassen.map(c => c.anzahl), f.rechts.anzahl, 1e-9); expect(v.k).toBe(f.k_tatsaechlich);
    const S = (f.rechts.anzahl as number[]).reduce((a, b) => a + b, 0); nah(v.gueltig, S);
    nahListe(v.klassen.map(c => c.anteil), (f.rechts.anzahl as number[]).map(a => a / S), 1e-12); nah(v.klassen.reduce((a, c) => a + c.anteil, 0), 1, 1e-12);
    expect(v.gewichtet).toBe(!!f.w); expect(v.hinweise).toContain('informationsverlust');
    expect(v.klassen.map(c => c.nr)).toEqual(v.klassen.map((_, i) => i + 1));
  });
  it('Fälle genau auf einer inneren Grenze (Quartil-Klassen enthalten Datenwerte als Grenzen): gezählt, bei Gewicht gewichtet', () => {
    for (const f of K.faelle) nah(klassenVorschau(daten(f), opt(f)).aufGrenze, f.aufGrenze, 1e-9);
    expect(K.faelle.find((x: any) => x.name === 'quantil_k4_typ6').aufGrenze).toBe(3);
  });
  it('Von/Bis mit Zeichen: gleich breit k = 3: Grenzen 1; 4,6667; 8,3333; 12 - rechts: erste Klasse schließt den kleinsten Wert ein, jede „bis“-Grenze ein, „von“ nicht', () => {
    const f = K.faelle[0], v = klassenVorschau(daten(f), opt(f, true)).klassen;
    nah(v[0]!.von!, 1); nah(v[0]!.bis!, f.breaks[1]); nah(v[1]!.von!, f.breaks[1]); nah(v[2]!.bis!, 12);
    expect(v.map(c => [c.vonEin, c.bisEin])).toEqual([[true, true], [false, true], [false, true]]);
    const l = klassenVorschau(daten(f), opt(f, false)).klassen;
    expect(l.map(c => [c.vonEin, c.bisEin])).toEqual([[true, false], [true, false], [true, true]]);
  });
  it('Quantil-Klassen mit Fallgewicht: Häufigkeit = wie die erweiterte Datei; Umfragegewicht normiert, die Zählung nimmt die ROHEN Gewichte; ×1000 ändert die Grenzen nicht', () => {
    const h = K.faelle.find((x: any) => x.name === 'quantil_haeufigkeit'), u = K.faelle.find((x: any) => x.name === 'quantil_umfrage'), u1000 = K.faelle.find((x: any) => x.name === 'quantil_umfrage_skaliert');
    expect(klassenVorschau(daten(h), opt(h)).klassen.map(c => c.anzahl)).toEqual(h.rechts.anzahl);   // 8/6/6/6, die Zeile mit Gewicht 0 zählt nicht
    nahListe(u.breaks, u1000.breaks, 1e-12);
    nahListe(klassenVorschau(daten(u), opt(u)).klassen.map(c => c.anzahl), u.rechts.anzahl); nahListe(klassenVorschau(daten(u1000), opt(u1000)).klassen.map(c => c.anzahl), u1000.rechts.anzahl);
  });
});

describe('Beschriftung nennt immer die Regel (nie erfundene Zahlen)', () => {
  it('rechts geschlossen: „bis 18“, „über 18 bis 25“, „über 25“', () => { expect(klassenBeschriftung(K.beschriftung.grenzen)).toEqual(K.beschriftung.rechts_de); expect(klassenBeschriftung(K.beschriftung.grenzen, 'unten')).toEqual(K.beschriftung.rechts_de); });
  it('links geschlossen: „unter 18“, „18 bis unter 25“, „25 und mehr“', () => { expect(klassenBeschriftung(K.beschriftung.grenzen, 'oben')).toEqual(K.beschriftung.links_de); });
  it('Dezimalzahlen im Format der Sprache (Komma)', () => {
    const d = K.beschriftung.dezimal_de; expect(klassenBeschriftung(d.grenzen)).toEqual(d.rechts); expect(klassenBeschriftung(d.grenzen, 'oben')).toEqual(d.links);
  });
  it('die Vorschau trägt dieselben Beschriftungen (eigene Grenzen 4 und 8)', () => {
    const f = K.faelle.find((x: any) => x.name === 'eigene_auf_grenze');
    expect(klassenVorschau(daten(f), opt(f, true)).klassen.map(c => c.beschriftung)).toEqual(['bis 4', 'über 4 bis 8', 'über 8']);
    expect(klassenVorschau(daten(f), opt(f, false)).klassen.map(c => c.beschriftung)).toEqual(['unter 4', '4 bis unter 8', '8 und mehr']);
  });
});

describe('Fehler (AssistentFehler mit Code; Oberfläche sagt sie in Worten)', () => {
  const x15 = K.typ6_gegen_typ7.x as number[];
  const d: Daten = { spalten: [sp('x'), sp('t', { art: 'text', format: 'A4' })], zeilen: x15.map(v => [v, 'a']) };
  const code = (f: () => unknown) => { try { f(); } catch (e) { expect(e).toBeInstanceOf(AssistentFehler); return (e as AssistentFehler).code; } return 'kein Fehler'; };
  const o = (r: Partial<KlassenOpt>): KlassenOpt => ({ spalte: 'x', ziel: 'xk', art: 'gleichbreit', k: 3, ...r });
  it('k: nicht ganz, 0, 13', () => { for (const k of [0, 13, 2.5, -1]) expect(code(() => klassenGrenzen(x15, { art: 'gleichbreit', k })), `k=${k}`).toBe('k'); expect(code(() => klassenGrenzen(x15, { art: 'quantil', k: 13 }))).toBe('k'); });
  it('k = 1 und k = 12 gehen', () => { expect(klassenGrenzen(x15, { art: 'gleichbreit', k: 1 }).k).toBe(1); expect(klassenGrenzen(x15, { art: 'gleichbreit', k: 12 }).k).toBe(12); });
  it('eigene Grenzen: nicht aufsteigend, doppelt, leer', () => {
    for (const g of [[8, 4], [4, 4], []]) expect(code(() => klassenGrenzen(x15, { art: 'eigene', grenzen: g })), JSON.stringify(g)).toBe('grenzen');
  });
  it('nur ein verschiedener Wert (gleich breit und Quantil): konstant; keine gültigen Werte: keine-werte', () => {
    expect(code(() => klassenGrenzen([3, 3, 3], { art: 'gleichbreit', k: 3 }))).toBe('konstant'); expect(code(() => klassenGrenzen([3, 3, 3], { art: 'quantil', k: 2 }))).toBe('konstant');
    expect(code(() => klassenGrenzen([], { art: 'gleichbreit', k: 3 }))).toBe('keine-werte');
  });
  it('Ziel: ungültiger Name, vorhanden (nie still überschreiben), Quelle ist Text', () => {
    expect(code(() => klassenBefehl(d, o({ ziel: '1abc' })))).toBe('name'); expect(code(() => klassenBefehl(d, o({ ziel: 'x' })))).toBe('ueberschreiben'); expect(code(() => klassenBefehl(d, o({ spalte: 't' })))).toBe('spalte');
    expect(code(() => klassenVorschau(d, o({ ziel: 'X' })))).toBe('ueberschreiben');
  });
  it('mit „überschreiben“ geht das Ziel mit vorhandenem Namen', () => { expect(code(() => klassenBefehl(d, o({ ziel: 'x', ueberschreiben: true })))).toBe('kein Fehler'); });
});

describe('Der erzeugte Befehl in der ECHTEN PSPP-Engine (zweite Quelle): gleiche Klassen wie R und wie klassenWerte', () => {
  let e: Awaited<ReturnType<typeof nodeEngine>>;
  beforeAll(async () => { e = await nodeEngine(); });
  const ok = (syntax: string, dateien: Record<string, Uint8Array> = {}) => {
    const r = e.run(syntax, dateien); const probleme = r.filter(i => i.type === 'message' && /error|warning/.test((i as { severity?: string }).severity ?? '')).map(i => (i as { text?: string }).text ?? '');
    expect(probleme.filter(t => !/weight value that was user-missing/.test(t)), `PSPP meldet Probleme bei:\n${syntax}`).toEqual([]); return r;
  };
  /** Volle Genauigkeit der Zahlen (neuAufbauen kürzt auf 6 Stellen): CSV wie JS sie schreibt. */
  const lade = (f: any) => {
    const zeilen = xVon(f).map((v, i) => [v === null ? '' : String(v), ...(f.w ? [String(f.w[i])] : [])].join(','));
    ok(`NEW FILE.\nDATA LIST FILE='/k.csv' LIST (',') /x ${f.w ? 'w ' : ''}(F40.16).\n${(f.fehlend ?? []).length ? `MISSING VALUES x (${(f.fehlend as number[]).join(',')}).` : ''}\nEXECUTE.`, { '/k.csv': new TextEncoder().encode(zeilen.join('\n') + '\n') });
  };
  const lies = () => {
    e.run("SAVE TRANSLATE /OUTFILE='/t.csv' /TYPE=CSV /FIELDNAMES /REPLACE /CELLS=VALUES.");
    const roh = parseCsv(new TextDecoder().decode(e.lies('/t.csv'))); const kopf = roh[0]!.map(h => h.trim().toLowerCase());
    return { kopf, zeilen: roh.slice(1).map(z => z.map(c => (c.trim() === '' ? null : Number(c)))) };
  };
  const spalte = (t: ReturnType<typeof lies>, n: string) => { const i = t.kopf.indexOf(n); expect(i, `Spalte ${n}: ${t.kopf}`).toBeGreaterThanOrEqual(0); return t.zeilen.map(z => z[i] ?? null); };
  for (const f of K.faelle) for (const seite of ['rechts', 'links'] as const) it(`${f.name}, ${seite} geschlossen: PSPP-Klassen = R = klassenWerte; Zählung (gewichtet) = R`, () => {
    lade(f); const o = opt(f, seite === 'rechts'), b = klassenBefehl(daten(f), o);
    ok(b.syntax);
    const t = lies(), neu = spalte(t, 'xk');
    expect(neu, 'PSPP gegen R').toEqual((f[seite].klasse as (number | null)[]).map(v => v ?? null));
    expect(neu, 'PSPP gegen klassenWerte').toEqual(klassenWerte(daten(f), o));
    const w = f.w ? spalte(t, 'w') : neu.map(() => 1), Kk = f.k_tatsaechlich, zaehl = Array.from({ length: Kk }, (_, j) => w.reduce<number>((a, g, r) => a + (neu[r] === j + 1 ? (g ?? 0) : 0), 0));
    nahListe(zaehl, f[seite].anzahl, 1e-9);
    expect(b.k).toBe(Kk);
  });
  it('Quelle unverändert, neue Spalte ordinal mit Wertelabels (Beschriftung der Regel), Format ohne Dezimalstellen, Zeilenzahl gleich', () => {
    const f = K.faelle.find((x: any) => x.name === 'eigene_auf_grenze'); lade(f); const vorher = spalte(lies(), 'x');
    const b = klassenBefehl(daten(f), opt(f)); ok(b.syntax);
    expect(b.labels).toEqual({ 1: 'bis 4', 2: 'über 4 bis 8', 3: 'über 8' });
    const dict = leseVerzeichnis(e.run('DISPLAY DICTIONARY.')), neu = dict.find(c => c.name === 'xk')!;
    expect(neu.niveau).toBe('ordinal'); expect(neu.werteLabels).toEqual({ '1': 'bis 4', '2': 'über 4 bis 8', '3': 'über 8' }); expect(neu.format).toMatch(/^F\d+\.0$/);
    expect(spalte(lies(), 'x')).toEqual(vorher); expect(dict.map(c => c.name)).toEqual(['x', 'xk']);
    expect(/RECODE/.test(b.syntax) && /INTO xk/.test(b.syntax) && /MISSING=SYSMIS/.test(b.syntax)).toBe(true);
  });
  it('Dezimalfehler in PSPP wirklich vorhanden (0,30000000000000004 ≠ 0,3) und trotzdem richtig klassiert', () => {
    const f = K.faelle.find((x: any) => x.name === 'dezimalfehler'); lade(f);
    e.run('COMPUTE gleich = (x = 0.3).\nEXECUTE.'); expect(spalte(lies(), 'gleich')).toEqual([0, 0, 0, 1, 0]);   // sonst prüft der Test nichts
    ok(klassenBefehl(daten(f), opt(f, true)).syntax); expect(spalte(lies(), 'xk')).toEqual([1, 1, 1, 1, 2]);
  });
  it('Quantil-Regel gegen PSPP: FREQUENCIES /PERCENTILES /ALGORITHM=COMPATIBLE (Verteilungskarte) gibt dieselben Grenzen wie klassenGrenzen (Typ 6), nicht Typ 7', () => {
    const f = K.faelle.find((x: any) => x.name === 'quantil_k4_typ6'); lade(f);
    const out = e.run('FREQUENCIES x /FORMAT=NOTABLE /PERCENTILES=25 50 75 /ALGORITHM=COMPATIBLE.') as any[];
    const t = out.find(i => i.type === 'table' && i.label === 'Statistics'), q: number[] = [];
    for (const c of t.cells) if (c.c === t.cols - 1 && c.r >= t.rows - 3) q.push(c.n);
    nahListe(q, [3, 5, 9]); nahListe(q, f.breaks.slice(1, -1), 1e-12);
  });
  it('gewichtete Quantil-Klassen = PSPP: Häufigkeit (FREQUENCIES COMPATIBLE) und Umfrage (EXAMINE HAVERAGE mit normierten Gewichten) liefern die Grenzen aus R', () => {
    const h = K.faelle.find((x: any) => x.name === 'quantil_haeufigkeit'); lade(h);
    const sed = (e.run('WEIGHT BY w.\nFREQUENCIES x /FORMAT=NOTABLE /PERCENTILES=25 50 75 /ALGORITHM=COMPATIBLE.\nWEIGHT OFF.') as any[]).find(i => i.type === 'table' && i.label === 'Statistics');
    const q: number[] = []; for (const c of sed.cells) if (c.c === sed.cols - 1 && c.r >= sed.rows - 3) q.push(c.n);
    nahListe(q, h.breaks.slice(1, -1), 1e-12);
    const u = K.faelle.find((x: any) => x.name === 'quantil_umfrage'), k = u.w.length, S = (u.w as number[]).reduce((a, b) => a + b, 0), wn = (u.w as number[]).map(v => v * k / S);
    const zeilen = (u.x as number[]).map((v, r) => `${v},${wn[r]}`).join('\n') + '\n';
    const ex = e.run(`NEW FILE.\nDATA LIST FILE='/n.csv' LIST (',') /x wn (F40.16).\nWEIGHT BY wn.\nEXAMINE VARIABLES=x /PERCENTILES(25,50,75)=HAVERAGE /PLOT=NONE /STATISTICS=NONE.`, { '/n.csv': new TextEncoder().encode(zeilen) }) as any[];
    const pt = ex.find(i => i.type === 'table' && i.label === 'Percentiles'), qu: number[] = [];
    for (const c of pt.cells) if (c.r === 2 && typeof c.n === 'number' && c.c >= 2) qu.push(c.n);
    nahListe(qu, u.breaks.slice(1, -1), 1e-9);
  });
});

describe('Ein Pfad: Baustein „In Gruppen teilen“ (Median) und der Assistent benutzen denselben Code (Fachblatt 3.3)', () => {
  it('bausteine.ts importiert lib/klassieren', () => {
    const q = readFileSync(new URL('./bausteine.ts', import.meta.url), 'utf8');
    expect(/from '\.\/klassieren'/.test(q), 'In Gruppen teilen (Median) ruft klassenBefehl mit art quantil und k = 2').toBe(true);
  });
});
