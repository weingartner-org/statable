import { describe, expect, it } from 'vitest';
import { baum, vorhersage, regressionsbaum, regVorhersage, wichtigkeit, type Merkmal } from './baum';
import RDATEN from './regbaum-daten.csv?raw';
import RREF from './regbaum-ref.csv?raw';
import RREF2 from './regbaum-ref2.csv?raw';
import DATEN from './baum-daten.csv?raw';
import REF from './baum-ref.csv?raw';
import IRIS from './baum-iris.csv?raw';
import IRIS_REF from './baum-iris-ref.csv?raw';
import IRIS_REF2 from './baum-iris-ref2.csv?raw';

/* Sollwerte: R `rpart(klasse ~ a + b + k, data = d, method = "class")` (rpart, Voreinstellungen) auf baum-daten.csv (300 Fälle, set.seed(8)): 9 Blätter, vorhergesagte Klasse und Blatt je Fall (baum-ref.csv). */
const z = DATEN.trim().split('\n').slice(1).map(r => r.split(','));
const klasse = z.map(r => r[0]!);
const m: Merkmal[] = [{ name: 'a', art: 'zahl', werte: z.map(r => Number(r[1])) }, { name: 'b', art: 'zahl', werte: z.map(r => Number(r[2])) }, { name: 'k', art: 'kategorie', werte: z.map(r => r[3]!) }];
const ref = REF.trim().split('\n').slice(1).map(r => r.split(','));

describe('Entscheidungsbaum gegen rpart', () => {
  it('Blätter und vorhergesagte Klasse wie rpart', () => {
    const b = baum(klasse, m);
    if ('fehler' in b) throw new Error(b.fehler);
    expect(b.blaetter).toBe(9);
    const pred = klasse.map((_, i) => b.klassen[vorhersage(b, m, i).klasse]);
    expect(pred.filter((p, i) => p !== ref[i]![0]).length).toBe(0);
    // gleiche Blattgrößen
    const meine: Record<string, number> = {}, ihre: Record<string, number> = {};
    klasse.forEach((_, i) => { const bl = vorhersage(b, m, i).blatt; const kk = `${bl.n}/${bl.zaehl.join(',')}`; meine[kk] = (meine[kk] ?? 0) + 1; });
    ref.forEach(r => { ihre[r[1]!] = (ihre[r[1]!] ?? 0) + 1; });
    expect(Object.values(meine).sort((x, y) => x - y)).toEqual(Object.values(ihre).sort((x, y) => x - y));
  });
  it('drei Klassen (iris), Voreinstellungen und feinere Einstellungen wie rpart', () => {
    const q = IRIS.trim().split('\n').slice(1).map(r => r.split(',')), kl = q.map(r => r[0]!);
    const mm: Merkmal[] = ['sl', 'sw', 'pl', 'pw'].map((name, j) => ({ name, art: 'zahl' as const, werte: q.map(r => Number(r[j + 1])) }));
    const b = baum(kl, mm); if ('fehler' in b) throw new Error(b.fehler);
    const r1 = IRIS_REF.trim().split('\n').slice(1).map(r => r.split(',')[0]);
    expect(kl.map((_, i) => b.klassen[vorhersage(b, mm, i).klasse]).filter((p, i) => p !== r1[i]).length).toBe(0);
    const f = baum(kl, mm, { cp: 0.001, minSplit: 10, minBucket: 3 }); if ('fehler' in f) throw new Error(f.fehler);
    const r2 = IRIS_REF2.trim().split('\n').slice(1);
    expect(kl.map((_, i) => f.klassen[vorhersage(f, mm, i).klasse]).filter((p, i) => p !== r2[i]).length).toBe(0);
  });
  it('Regressionsbaum (Zahl als Ziel) wie rpart anova', () => {
    const q = RDATEN.trim().split('\n').slice(1).map(r => r.split(',')), y = q.map(r => Number(r[3]));
    const mm: Merkmal[] = [{ name: 'a', art: 'zahl', werte: q.map(r => Number(r[0])) }, { name: 'b', art: 'zahl', werte: q.map(r => Number(r[1])) }, { name: 'k', art: 'kategorie', werte: q.map(r => r[2]!) }];
    const gl = (opt: object, ref: string, blaetter: number) => {
      const b = regressionsbaum(y, mm, opt); if ('fehler' in b) throw new Error(b.fehler);
      expect(b.blaetter).toBe(blaetter);
      const r = ref.trim().split('\n').slice(1).map(Number);
      y.forEach((_, i) => expect(regVorhersage(b, mm, i).wert).toBeCloseTo(r[i]!, 8));
    };
    gl({}, RREF, 12); gl({ cp: 0.002, minSplit: 10, minBucket: 4 }, RREF2, 21);
  });
  it('Fehlerfälle', () => {
    expect(baum(klasse.map(() => 'x'), m)).toEqual({ fehler: 'eine-klasse' });
    expect(baum(klasse, [])).toEqual({ fehler: 'kein-merkmal' });
    expect(baum(klasse.slice(0, 5), m.map(q => ({ ...q, werte: q.werte.slice(0, 5) })))).toEqual({ fehler: 'zu-wenig-faelle' });
  });
});

describe('wichtigkeit', () => {
  it('Anteile summieren zu 1, nur gewählte Teilungen zählen', () => {
    const w = wichtigkeit({ teilung: { merkmal: 0, verbesserung: 6 }, links: { teilung: { merkmal: 2, verbesserung: 2 }, links: {}, rechts: {} }, rechts: {} }, 3);
    expect(w[0]).toBeCloseTo(0.75, 10); expect(w[1]).toBe(0); expect(w[2]).toBeCloseTo(0.25, 10);
    expect(wichtigkeit({}, 2)).toEqual([0, 0]);
  });
});
