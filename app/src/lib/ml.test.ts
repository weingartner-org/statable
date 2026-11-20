// Wächter für V5 (lib/ml.ts): Rechnung gegen die Sollwerte aus R (scripts/ml-erwartet.R, class::knn und eigene Basis-R-Funktion).
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import erwartet from './testdaten/ml-erwartet.json';
import { faltenEinteilung, konfusion, knnAlleK, mischen, mlRechne, pinguinDaten, teile, type MlMerkmal, type MlZiel } from './ml';
import { zufall } from './zufall';
import { render } from 'svelte/server';
import { inSprache } from './sitzung.svelte';
import { mlSaetze } from './mlsaetze';
import LernlaborVorhersagen from '../bausteine/LernlaborVorhersagen.svelte';
import { PINGUIN_ART, PINGUIN_FLOSSE, PINGUIN_GESCHLECHT, PINGUIN_MASSE, PINGUIN_SCHNABEL_LAENGE, PINGUIN_SCHNABEL_TIEFE } from './ml-pinguine';

interface Fall {
  name: string; ziel: string; merkmale: string[]; standardisieren: boolean; anteil: number; K: number; klassen: string[]; n: number;
  zeilenDerFaelle: number[]; training: number[]; test: number[]; falte: number[]; mittel: number[] | null; sd: number[] | null;
  ks: number[]; fehlerTraining: number[]; fehlerTest: number[]; fehlerCV: number[]; gleichstaendeTest: number[]; bestesK: number;
  vorhersage: Record<string, number[]>; konfusion: Record<string, number[][]>;
}
const FAELLE = erwartet as unknown as Fall[];
const MERKMAL: Record<string, MlMerkmal> = { schnabel_laenge_mm: 'schnabel_laenge', schnabel_tiefe_mm: 'schnabel_tiefe', flosse_mm: 'flosse', koerpermasse_g: 'masse' };
const ZIEL: Record<string, MlZiel> = { pinguinart: 'art', geschlecht: 'geschlecht' };

describe('Pinguin-Daten im Programm = CSV', () => {
  it('jede Zeile, jede Spalte', () => {
    const pfad = fileURLToPath(new URL('../../public/beispiel/pinguine-antarktis.csv', import.meta.url));
    const z = readFileSync(pfad, 'utf8').trim().split(/\r?\n/).slice(1).map(l => l.split(';'));
    expect(z.length).toBe(344);
    const num = (s: string) => (s === '' ? null : Number(s.replace(',', '.')));
    const art: Record<string, number> = { Adeliepinguin: 0, 'Zügelpinguin': 1, Eselspinguin: 2 };
    const ges: Record<string, number> = { weiblich: 0, 'männlich': 1 };
    z.forEach((r, i) => {
      expect(PINGUIN_ART[i]).toBe(art[r[0]!]);
      expect(PINGUIN_GESCHLECHT[i]).toBe(r[6] === '' ? null : ges[r[6]!]);
      expect(PINGUIN_SCHNABEL_LAENGE[i]).toBe(num(r[2]!));
      expect(PINGUIN_SCHNABEL_TIEFE[i]).toBe(num(r[3]!));
      expect(PINGUIN_FLOSSE[i]).toBe(num(r[4]!));
      expect(PINGUIN_MASSE[i]).toBe(num(r[5]!));
    });
  });
});

describe('kNN, Kreuzvalidierung, Konfusionsmatrix gegen R', () => {
  for (const f of FAELLE) {
    it(f.name, () => {
      const dat = pinguinDaten(ZIEL[f.ziel]!, MERKMAL[f.merkmale[0]!]!, MERKMAL[f.merkmale[1]!]!);
      expect(dat.zeilen).toEqual(f.zeilenDerFaelle);
      expect(dat.X.length).toBe(f.n);
      const r = mlRechne({ X: dat.X, y: dat.y, nKlassen: dat.nKlassen, training: f.training, test: f.test, falte: f.falte, K: f.K, standardisieren: f.standardisieren });
      expect(r.ks).toEqual(f.ks);
      if (f.mittel && f.sd) { r.skala!.mittel.forEach((m, j) => expect(m).toBeCloseTo(f.mittel![j]!, 10)); r.skala!.sd.forEach((s, j) => expect(s).toBeCloseTo(f.sd![j]!, 10)); }
      else expect(r.skala).toBeNull();
      r.ks.forEach((_, j) => {
        expect(r.fehlerTraining[j]).toBeCloseTo(f.fehlerTraining[j]!, 12);
        expect(r.fehlerTest[j]).toBeCloseTo(f.fehlerTest[j]!, 12);
        expect(r.fehlerCV[j]).toBeCloseTo(f.fehlerCV[j]!, 12);
        expect(r.gleichstandTest[j]).toBe(f.gleichstaendeTest[j]);
      });
      expect(r.bestesK).toBe(f.bestesK);
      for (const k of ['1', '15']) {
        const j = r.ks.indexOf(Number(k));
        expect(r.vorhersageTest[j]).toEqual(f.vorhersage[k]);
        const yte = f.test.map(i => dat.y[i]!);
        expect(konfusion(yte, r.vorhersageTest[j]!, dat.nKlassen)).toEqual(f.konfusion[k]);
      }
    });
  }
});

describe('Bausteine', () => {
  it('Mischen ist eine Reihenfolge, gleicher Startwert gleich', () => {
    const a = mischen(50, zufall(3)), b = mischen(50, zufall(3));
    expect(a).toEqual(b);
    expect([...a].sort((x, y) => x - y)).toEqual(Array.from({ length: 50 }, (_, i) => i));
  });
  it('Aufteilen und Falten', () => {
    const t = teile(333, 0.7, zufall(1));
    expect(t.training.length).toBe(233); expect(t.test.length).toBe(100);
    expect(new Set([...t.training, ...t.test]).size).toBe(333);
    const f = faltenEinteilung(233, 5, zufall(2));
    const groesse = [0, 1, 2, 3, 4].map(q => f.filter(x => x === q).length);
    expect(Math.max(...groesse) - Math.min(...groesse)).toBeLessThanOrEqual(1);
  });
  it('Gleichstand: Klasse mit dem nächsten Nachbarn, sonst die kleinere Nummer', () => {
    // k = 2: ein Nachbar je Klasse; Klasse 1 liegt näher
    expect(knnAlleK([[0], [3], [1]], [0, 0, 1], [[0.9]], [2], 2).vorhersage[0]).toEqual([1]);
    // genau gleich weit: kleinere Nummer
    const g = knnAlleK([[-1], [1]], [1, 0], [[0]], [1], 2);
    expect(g.vorhersage[0]).toEqual([0]); expect(g.gleichstand[0]).toBe(1);
  });
  it('k = 1 auf den Trainingsdaten: Fehler nur bei doppelten Punkten mit anderer Klasse', () => {
    const r = mlRechne({ X: [[0], [0], [5], [9]], y: [0, 1, 1, 0], nKlassen: 2, training: [0, 1, 2, 3], test: [], falte: [0, 1, 0, 1], K: 2, standardisieren: false, ks: [1] });
    expect(r.fehlerTraining[0]).toBeCloseTo(0.25, 12);
  });
});

describe('Sätze und Reiter', () => {
  const f = FAELLE[0]!;
  const dat = pinguinDaten('geschlecht', 'schnabel_tiefe', 'masse');
  const erg = mlRechne({ X: dat.X, y: dat.y, nKlassen: 2, training: f.training, test: f.test, falte: f.falte, K: 5, standardisieren: true });
  const basis = { n: dat.X.length, nTraining: f.training.length, nTest: f.test.length, startwert: 1, K: 5, standardisieren: true, erg };
  it('k = 1: Einzahl im Englischen, großer Abstand nennt Überanpassung (Sollwert aus R)', () => {
    const en = inSprache('en', () => mlSaetze({ ...basis, k: 1, j: 0 }));
    expect(en[1]).toContain('With k = 1 neighbour it predicts');
    const abstand = (f.fehlerTest[0]! - f.fehlerTraining[0]!) * 100;
    expect(abstand).toBeGreaterThanOrEqual(5);
    expect(inSprache('de', () => mlSaetze({ ...basis, k: 1, j: 0 }))[2]).toContain('Überanpassung (overfitting)');
    expect(inSprache('de', () => mlSaetze({ ...basis, k: 1, j: 0 }))[3]).toContain(`k = ${f.bestesK}`);
  });
  it('kleiner Abstand: kein Satz „großer Abstand“', () => {
    const j = erg.ks.findIndex((_, q) => Math.abs(erg.fehlerTest[q]! - erg.fehlerTraining[q]!) * 100 < 5);
    expect(j).toBeGreaterThan(0);
    const de = inSprache('de', () => mlSaetze({ ...basis, k: erg.ks[j]!, j }));
    expect(de[2]).toContain('nahe beieinander'); expect(de.join(' ')).not.toContain('großer Abstand');
  });
  it('Reiter rendert in de und en', () => {
    for (const sp of ['de', 'en'] as const) {
      const html = inSprache(sp, () => render(LernlaborVorhersagen, { props: { startwert: 1, anstoss: 0 } }).body);
      expect(html).toContain(sp === 'de' ? 'Konfusionsmatrix der Testdaten' : 'Confusion matrix of the test data');
      expect(html).toContain('role="img"');
    }
  });
});
