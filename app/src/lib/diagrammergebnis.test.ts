import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { leseCsv, zurEngine } from './einlesen';
import { faktoren, vorhersage } from './ergebnis';
import { reste } from './diagrammdaten';
import { nodeEngine } from './testengine';
import { VERFAHREN } from './verfahren';

/* Eigenwerte für den Scree-Plot und Koeffizienten für die Reste, aus der echten PSPP-Engine; Vergleichswerte aus R (scripts/diagramme-erwartet.R). */
let e: Awaited<ReturnType<typeof nodeEngine>>;
const roh = (n: string) => readFileSync(new URL(`./testdaten/${n}`, import.meta.url), 'utf8');
beforeAll(async () => { e = await nodeEngine(); });

describe('Faktorenanalyse: Eigenwerte aller Komponenten', () => {
  beforeAll(() => { const b = zurEngine(leseCsv(roh('bfi-ausschnitt.csv'))); e.run(b.syntax, { '/import.csv': b.csv }); });
  it('der Befehl des Verfahrens verlangt INITIAL', () => {
    const v = VERFAHREN.find(x => x.id === 'faktor')!;
    expect(v.syntax({ l1: ['A2', 'A3', 'A4'], l2: [], l3: [], l4: [] }, {} as never)).toContain('INITIAL');
  });
  it('wie R eigen(cor(x)) bei neun Fragen, 378 vollständige Fälle; zwei Faktoren extrahiert', () => {
    const v = VERFAHREN.find(x => x.id === 'faktor')!;
    const r = faktoren(e.run(v.syntax({ l1: ['A2', 'A3', 'A4', 'A5', 'N1', 'N2', 'N3', 'N4', 'N5'], l2: [], l3: [], l4: [] }, {} as never)));
    expect(r.eigen!.map(x => +x.toFixed(4))).toEqual([3.0616, 2.0292, 0.8983, 0.7165, 0.6383, 0.5814, 0.4339, 0.3735, 0.2672]);
    expect(r.faktoren.length).toBe(2);
    expect(r.n).toBe(378);
  });
  it('ohne INITIAL (Projekte von früher): keine Eigenwerte, sonst unverändert', () => {
    const r = faktoren(e.run('FACTOR /VARIABLES=A2 A3 A4 A5 N1 N2 N3 N4 N5 /PRINT=UNIVARIATE ROTATION /FORMAT=SORT BLANK(.30) /CRITERIA=MINEIGEN(1) ITERATE(25) /EXTRACTION=PC /ROTATION=VARIMAX.'));
    expect(r.eigen).toBeUndefined();
    expect(r.faktoren.length).toBe(2);
  });
});

describe('Regression: Reste aus den PSPP-Koeffizienten', () => {
  it('Koeffizienten B aus der PSPP-Tabelle ergeben dieselben Reste wie R lm', async () => {
    const b = zurEngine(leseCsv(roh('schlaf-und-konzentration.csv')));
    const e2 = await nodeEngine();
    e2.run(b.syntax, { '/import.csv': b.csv });
    const r = vorhersage(e2.run('REGRESSION\n  /VARIABLES=alter schlaf_stunden kaffee_tassen\n  /DEPENDENT=konzentration\n  /METHOD=ENTER\n  /STATISTICS=COEFF R ANOVA CI(95).'), 'konzentration');
    const zeilen = leseCsv(roh('schlaf-und-konzentration.csv')).zeilen;
    const kopf = leseCsv(roh('schlaf-und-konzentration.csv')).kopf;
    const nr = (z: unknown[], n: string) => { const v = z[kopf.indexOf(n)]; return v === null || v === undefined ? null : Number(String(v).replace(',', '.')); };
    const daten = zeilen.map(z => ['konzentration', 'alter', 'schlaf_stunden', 'kaffee_tassen'].map(n => nr(z, n)));
    const q = reste(daten, r.praediktoren.map(p => p.b))!;
    expect(q.n).toBe(115);
    expect(q.konstante).toBeCloseTo(33.58631448, 4);
    expect(q.rest.slice(0, 3).map(x => +x.toFixed(3))).toEqual([6.121, 11.745, 2.965]);
  });
});

describe('Wahl der Diagramme (blatt.dv) in der Projektdatei', () => {
  const proj = (dv?: unknown) => ({ name: 'p', quelle: 'q', sav: new Uint8Array([1, 2, 3]), blaetter: [{ id: 'a', titel: 't', art: 'verteilung', l1: null, l2: null, syntax: '', items: [], ergebnis: null, imBericht: true, notiz: '', zeit: 1, ...(dv ? { dv } : {}) }], entscheid: {}, zeit: 1 }) as never;
  it('Rundreise: die gewählte Art bleibt nach dem Neuladen', async () => {
    const { projektAlsDatei, leseProjektdatei } = await import('./projektdatei');
    const z = leseProjektdatei(projektAlsDatei(proj({ verteilung: 'box', kreuz: 'gestapelt', zu: true })));
    expect(z.blaetter[0]!.dv).toEqual({ verteilung: 'box', kreuz: 'gestapelt', zu: true });
  });
  it('alte Projekte ohne dv laden; fehlende Felder gelten als Vorschlag', async () => {
    const { projektAlsDatei, leseProjektdatei } = await import('./projektdatei');
    const { dvMit, dvGrund } = await import('./diagramm');
    const z = leseProjektdatei(projektAlsDatei(proj()));
    expect(z.blaetter[0]!.dv).toBeUndefined();
    expect(dvMit(z.blaetter[0]!.dv)).toEqual(dvGrund);
    expect(dvMit({ rest: 'qq' })).toEqual({ ...dvGrund, rest: 'qq' });
  });
});
