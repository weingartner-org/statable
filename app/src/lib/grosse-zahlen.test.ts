import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { leseCsv, zurEngine, planeSpalten } from './einlesen';
import { nodeEngine } from './testengine';
import { finde } from './tabelle';
import { anova2, anova2Lauf, kovarianz, kovarianzBefehl } from './anova2';
import { tabellenAncova, tabellenAnova2, type AncovaE } from './anova2saetze';
import { regFaktor } from './regfaktor';
import { apaHtml, apaText } from './tabellenexport';
import type { Spalte } from './verzeichnis';
import { tabelleDe, alsExcelZahl } from './export';
import { s } from './sitzung.svelte';
import { FREIGEGEBEN, type Sprache } from '../i18n/laufzeit';
import { PROFILE } from '../i18n/profil';
import { localizeCell } from '../output/format-de';
import type { OutputItem, TableItem } from '../engine/types';

/* Befund B2 (18.10.): PSPP schreibt große Quadratsummen als „9.0E+010“ / „3.6E+013“ (zwei gültige Stellen). Die Anzeige soll die Zahl ausgeschrieben mit Tausendertrenner zeigen.
 * Sollwerte Fall 1: R car::Anova Typ III (vom Chef gerechnet). Fall 2: SPSS 32, Employee data (Datei bleibt außerhalb des Repos, Regel 7).
 * Die Engine liefert den Wert mit voller Genauigkeit in `n` (JSON), nur ihr Text `t` ist gerundet - darum rechnet die Anzeige aus `n`. */

const SOLL1 = { 'Corrected Model': 37622641666666.6, gruppe_F1: 36398016666666.6, geschlecht_F2: 1122408333333.3, 'gruppe_F1 × geschlecht_F2': 102216666666.7, Error: 167650000000, 'Corrected Total': 37790291666666.6 };
const SOLL2 = { 'Corrected Model': 90341824425.066, jobcat: 25962509537.758, minority: 237964814.398, 'jobcat × minority': 788578413.074, Error: 47574671011.274 };

let e: Awaited<ReturnType<typeof nodeEngine>>;
beforeAll(async () => { e = await nodeEngine(); });
afterEach(() => { s.einst.sprache = 'de'; s.einst.zahl = 'sprache'; });

/** Zeichenfolge → Zahl nach den Zeichen der Sprache (Trenner und Dezimalzeichen aus dem Profil, Trenner über Intl). */
function alsZahl(text: string, sp: Sprache): number {
  const gruppe = new Intl.NumberFormat(PROFILE[sp].ort).formatToParts(1e9).find(p => p.type === 'group')!.value;
  expect(text, `${sp}: Tausendertrenner „${gruppe}“`).toContain(gruppe);
  return Number(text.replace(/−/, '-').split(gruppe).join('').replace(/[\s  ]/g, '').replace(PROFILE[sp].dezimal, '.'));
}

/** Quadratsummen-Zellen (Spalte 1) der GLM-Tabelle in der Anzeige: Zeilenname → Text. */
function anzeige(items: OutputItem[]): Record<string, string> {
  const r = finde(items, /^Tests of Between-Subjects Effects$/)!;
  const tb = tabelleDe(r.tabelle, null);
  expect(tb.zeilen.length).toBe(r.t.length);
  return Object.fromEntries(r.t.map((z, i) => [z[0]!, tb.zeilen[i]![1]!.t]));
}

function pruefe(items: OutputItem[], soll: Record<string, number>) {
  for (const sp of FREIGEGEBEN) {
    s.einst.sprache = sp; s.einst.zahl = 'sprache';
    const a = anzeige(items);
    for (const [zeile, wert] of Object.entries(soll)) {
      const t = a[zeile]!;
      expect(t, `${sp} ${zeile}`).toBeTypeOf('string');
      expect(t, `${sp} ${zeile}: keine Zehnerpotenz`).not.toMatch(/E[+-]?\d|e[+-]?\d/);
      const z = alsZahl(t, sp);
      expect(Math.abs(z - wert), `${sp} ${zeile}: „${t}“ gegen ${wert}`).toBeLessThanOrEqual(1e-6 * Math.abs(wert));
    }
  }
}

describe('B2: große Quadratsummen ohne Zehnerpotenz', () => {
  it('eigene Gehaltsdaten (Cent), zweifaktorielle Varianzanalyse über anova2Lauf: alle 15 Sprachen', () => {
    const A = 'A,A,A,A,B,B,B,B,C,C,C,C'.split(','), G = 'w,m,w,m,w,m,w,m,w,m,w,m'.split(',');
    const Y = [3150000, 3420000, 2980000, 3610000, 4820000, 5130000, 4670000, 5390000, 7240000, 7810000, 6950000, 8120000];
    const tab = leseCsv('gruppe,geschlecht,gehalt_cent\n' + A.map((a, i) => `${a},${G[i]},${Y[i]}`).join('\n') + '\n'), b = zurEngine(tab);
    e.run('NEW FILE.\n' + b.syntax, { '/import.csv': b.csv });
    const items = e.run(anova2Lauf('gehalt_cent', { spalte: 'gruppe', text: true, werte: ['A', 'B', 'C'] }, { spalte: 'geschlecht', text: true, werte: ['w', 'm'] }, tab.kopf));
    // Die Engine liefert den Wert voll genau in n, nur der Text ist auf zwei Stellen gerundet.
    const roh = finde(items, /^Tests of Between-Subjects Effects$/)!;
    const i = roh.t.findIndex(z => z[0] === 'gruppe_F1');
    expect(roh.t[i]![1]).toMatch(/E\+/);
    expect(Math.abs(roh.n[i]![1]! - SOLL1.gruppe_F1)).toBeLessThan(1e-6 * SOLL1.gruppe_F1);
    pruefe(items, SOLL1);
    s.einst.sprache = 'de';
    expect(anzeige(items).gruppe_F1).toMatch(/^36\u00a0398\u00a0016\u00a0666\u00a0666(,\d)?$/);   // Profil de = de-AT: Tausendertrenner geschütztes Leerzeichen (Intl)
    s.einst.sprache = 'en';
    expect(anzeige(items).gruppe_F1).toMatch(/^36,398,016,666,666(\.\d)?$/);
  });

  const SAV = '/Applications/IBM SPSS Statistics/Resources/Samples/English/Employee data.sav';
  describe.skipIf(!existsSync(SAV))('SPSS-Vergleich Employee data (salary nach jobcat × minority)', () => {
    it('Typ-III-Quadratsummen wie SPSS, in allen 15 Sprachen ohne Zehnerpotenz', () => {
      const items = (e.run('NEW FILE.\nGET FILE=\'/employee.sav\'.\nGLM salary BY jobcat minority\n  /DESIGN=jobcat minority jobcat*minority.', { '/employee.sav': new Uint8Array(readFileSync(SAV)) }));
      const t = finde(items, /^Tests of Between-Subjects Effects$/)!;
      expect(t, 'GLM-Tabelle da').not.toBeNull();
      // Die Effektzeilen heißen nach den Variablenbezeichnungen: von der Zeile „Error“ aus gezählt (wie anova2.ts).
      const err = t.t.findIndex(z => z[0] === 'Error');
      const name = (k: number) => t.t[err - k]![0]!;
      const soll = { 'Corrected Model': SOLL2['Corrected Model'], [name(3)]: SOLL2.jobcat, [name(2)]: SOLL2.minority, [name(1)]: SOLL2['jobcat × minority'], Error: SOLL2.Error };
      for (const [k, wert] of Object.entries(soll)) expect(Math.abs(t.n[t.t.findIndex(z => z[0] === k)]![1]! - wert), `${k} Rohwert`).toBeLessThanOrEqual(1e-9 * wert);
      pruefe(items, soll);
    });
  });
});

describe('localizeCell: Exponenten', () => {
  it('positive Exponenten: ausgeschrieben mit Tausendertrenner, Dezimalzeichen und Trenner der Schrift', () => {
    expect(localizeCell({ t: '9.0E+010', n: 90341824425.066 }, 'Type III Sum Of Squares')).toBe('90.341.824.425,07');
    expect(localizeCell({ t: '9.0E+010', n: 90341824425.066 }, 'Sum of Squares', { dezimal: '.', proz: '', gruppe: ',' })).toBe('90,341,824,425.07');
    expect(localizeCell({ t: '1.5E+008', n: -1.5e8 }, 'Sum')).toBe('-150.000.000,00');
    expect(localizeCell({ t: '3.8E+013', n: 37622641666666.664 }, 'Sum')).toBe('37.622.641.666.666,7');
    expect(localizeCell({ t: '1.0E+020', n: 1e20 }, 'Sum')).toBe('100.000.000.000.000.000.000');
  });
  it('negative Exponenten bleiben unverändert lesbar (kleine Zahlen nicht kaputt)', () => {
    expect(localizeCell({ t: '1.2E-005', n: 1.2e-5 }, 'B')).toBe('0,000012');
    expect(localizeCell({ t: '7.2E-015', n: 7.2e-15 }, 'B')).toBe('0,00');
    expect(localizeCell({ t: '7.2E-015', n: 7.2e-15 }, 'Sig.')).toBe('< ,001');
  });
});

describe('Excel und Tabellen-Ansicht', () => {
  it('Excel liest die ausgeschriebene Zahl als Zahl (Trenner Punkt, Komma oder Leerzeichen)', () => {
    expect(alsExcelZahl('36.398.016.666.666,7', true)?.wert).toBeCloseTo(36398016666666.7, 0);
    expect(alsExcelZahl('36,398,016,666,666.7', false)?.wert).toBeCloseTo(36398016666666.7, 0);
    expect(alsExcelZahl('36 398 016 666 666,7', true)?.wert).toBeCloseTo(36398016666666.7, 0);
  });
});

describe('Regression, Kovarianzanalyse, Tabellen-Ansicht, Word: keine Zehnerpotenz mehr', () => {
  const kein = (tb: ReturnType<typeof tabelleDe>, was: string) => { for (const z of tb.zeilen) for (const c of z) if (c.zahl) expect(c.t, was).not.toMatch(/\d[Ee][+-]\d/); };
  it('Regression (ANOVA-Tabelle mit Quadratsummen) und Kovarianzanalyse (Statable-Tabellen aus den vier Regressionen)', () => {
    const g = 'A,A,A,A,B,B,B,B,C,C,C,C'.split(','), x = [30, 34, 29, 41, 45, 38, 36, 50, 52, 48, 44, 55];
    const y = [3150000, 3420000, 2980000, 3610000, 4820000, 5130000, 4670000, 5390000, 7240000, 7810000, 6950000, 8120000];
    const tab = leseCsv('g,x,y\n' + g.map((a, i) => `${a},${x[i]},${y[i]}`).join('\n') + '\n');
    const plan = planeSpalten(tab).find(q => q.name === 'g')!;
    const sp: Spalte = { name: 'g', bezeichnung: '', art: plan.art, niveau: 'nominal', format: '', fehlend: [], fehlendText: '', werteLabels: {} };
    const faktor = regFaktor(sp, g, tab.kopf)!, b = zurEngine(tab);
    e.run('NEW FILE.\n' + b.syntax, { '/import.csv': b.csv });
    const items = e.run(kovarianzBefehl('y', faktor, 'x'));
    const anova = items.filter((i): i is TableItem => i.type === 'table' && /^ANOVA/.test(i.label));
    expect(anova.length).toBeGreaterThanOrEqual(4);
    expect(anova[0]!.cells.some(c => /E\+/.test(c.t)), 'PSPP schreibt die Regressions-Quadratsummen als Zehnerpotenz').toBe(true);
    for (const sprache of ['de', 'en', 'fr'] as const) {
      s.einst.sprache = sprache;
      for (const a of anova) kein(tabelleDe(a, null), `Regression ${sprache}`);
      const r = kovarianz(items, { g, x, y, stufen: faktor.stufen.map(st => st.name) });
      for (const tbl of tabellenAncova({ ...r, y: 'y', g: 'g', x: 'x' } as AncovaE, q => q)) kein(tabelleDe(tbl, null), `Kovarianzanalyse ${sprache}`);
    }
    // Word (APA-Tabelle, Tabellen-Ansicht in Farbe) nutzt dieselben Zeilen wie die Anzeige
    s.einst.sprache = 'de';
    const tb = tabelleDe(anova[0]!, null), apa = apaText(tb, 1, null) + apaHtml(tb, 1, null);
    expect(apa).not.toMatch(/\d[Ee][+-]\d/);
    expect(apa).toMatch(/\d\u00a0\d{3}\u00a0\d{3}/);
  });
});

describe('Statable-Tabellen (fxg): Quadratsumme und mittleres Quadrat mit Tausendertrenner', () => {
  const A = 'A,A,A,A,B,B,B,B,C,C,C,C'.split(','), G = 'w,m,w,m,w,m,w,m,w,m,w,m'.split(',');
  const Y = [3150000, 3420000, 2980000, 3610000, 4820000, 5130000, 4670000, 5390000, 7240000, 7810000, 6950000, 8120000];
  const lauf = () => {
    const tab = leseCsv('gruppe,geschlecht,gehalt_cent\n' + A.map((a, i) => `${a},${G[i]},${Y[i]}`).join('\n') + '\n'), b = zurEngine(tab);
    e.run('NEW FILE.\n' + b.syntax, { '/import.csv': b.csv });
    const items = e.run(anova2Lauf('gehalt_cent', { spalte: 'gruppe', text: true, werte: ['A', 'B', 'C'] }, { spalte: 'geschlecht', text: true, werte: ['w', 'm'] }, tab.kopf));
    const r = anova2(items, { a: A, b: G, y: Y, aStufen: ['A', 'B', 'C'], bStufen: ['w', 'm'] })!;
    return tabellenAnova2({ ...r, yCol: 'gehalt_cent', aCol: 'gruppe', bCol: 'geschlecht' }, q => q)[0]!;
  };
  /** Zeile „gruppe“: Quadratsumme (Spalte 1), mittleres Quadrat (Spalte 3), Fehler-Zeile. */
  const zellen = (it: TableItem) => { const tb = tabelleDe(it, null); const z = (k: string) => tb.zeilen.find(r => r[0]!.t === k)!; return { ss: z('gruppe')[1]!.t, ms: z('gruppe')[3]!.t, fss: z('Fehler')[1]!.t, fms: z('Fehler')[3]!.t, df: z('gruppe')[2]!.t }; };

  it('alle 15 Sprachen: Trenner der Sprache, Wert wie R (1e-6), df und F unberührt', () => {
    const it = lauf();
    for (const sp of FREIGEGEBEN) {
      s.einst.sprache = sp; s.einst.zahl = 'sprache';
      const z = zellen(it);
      expect(Math.abs(alsZahl(z.ss, sp) - SOLL1.gruppe_F1), `${sp} SS „${z.ss}“`).toBeLessThanOrEqual(1e-6 * SOLL1.gruppe_F1);
      expect(Math.abs(alsZahl(z.ms, sp) - SOLL1.gruppe_F1 / 2), `${sp} MS „${z.ms}“`).toBeLessThanOrEqual(1e-6 * SOLL1.gruppe_F1 / 2);
      expect(Math.abs(alsZahl(z.fss, sp) - SOLL1.Error), `${sp} Fehler SS`).toBeLessThanOrEqual(1e-6 * SOLL1.Error);
      expect(z.df).toBe('2');
    }
  });
  it('de, en, fr ausdrücklich; Punkt als Trenner wird nicht Dezimalpunkt', () => {
    const it = lauf();
    s.einst.sprache = 'de'; expect(zellen(it).ss).toMatch(/^36\u00a0398\u00a0016\u00a0666\u00a0666(,\d)?$/);
    s.einst.sprache = 'en'; expect(zellen(it).ss).toMatch(/^36,398,016,666,666(\.\d)?$/);
    s.einst.sprache = 'fr'; expect(zellen(it).ss).toMatch(/^36\u202f398\u202f016\u202f666\u202f666(,\d)?$/);
    // Spanisch trennt mit Punkt (Dezimalkomma): bleibt Trenner. Mit „Zahlen: Punkt“ ist der Punkt Dezimalzeichen, der Trenner wechselt auf Komma.
    s.einst.sprache = 'es'; s.einst.zahl = 'sprache'; expect(zellen(it).ss).toMatch(/^36\.398\.016\.666\.666(,\d)?$/);
    s.einst.zahl = 'punkt'; expect(zellen(it).ss).toMatch(/^36,398,016,666,666(\.\d)?$/);
  });
  it('Word/Excel lesen die Zahl weiter als Zahl', () => {
    const it = lauf();
    for (const [sp, dez] of [['de', true], ['en', false], ['fr', true], ['es', true]] as const) {
      s.einst.sprache = sp; const ss = zellen(it).ss;
      expect(alsExcelZahl(ss, dez)?.wert, `${sp} „${ss}“`).toBeCloseTo(SOLL1.gruppe_F1, -1);
    }
  });
  it('kleine Werte (unter 1000) bleiben wie bisher, g stört nicht', () => {
    expect(localizeCell({ t: '12.35', n: 12.345, g: true }, 'Mean Square')).toBe('12,35');
  });
});
