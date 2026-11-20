import 'fake-indexeddb/auto';
import { beforeAll, describe, expect, it } from 'vitest';
import { abgleichen, abgleichWarnungen, abgleichCodeSatz, smd, K_MAX, type AbgleichEingabe, type AbgleichOk } from './abgleich';
import { s, setzeTestMotor, oeffneTabelle, jetzigesProjekt } from './sitzung.svelte';
import { erzeugeTestMotor } from './testmotor';
import { leseCsv } from './einlesen';
import { ladeProjekt, speichereProjekt } from './ablage';
import { abgleichAnwenden, abgleichEingabe } from './abgleichlauf.svelte';
import { leseProtokoll } from './protokoll';
import ERW from './testdaten/abschluss-erwartet.json';

/* Fachblatt Abschnitt 6: Fallkontrollabgleich gegen die Sollwerte aus lib/testdaten/abschluss-erwartet.json (scripts/abschluss-erwartet.R, unabhängig vom Code der App, zweite Fassung in anderer Reihenfolge).
 * Zeilennummern im Sollwert zählen ab 1. Die Regel ist gierig und hängt von der Zeilenfolge ab; Toleranz 0 heißt Abstand 0; Gleichstand: kleinste Zeile; ohne Zurücklegen. */

type Erg = { k: number; tol: number; paare: { fall: number; kontrollen: number[] }[]; voll: number; ohne: number; kontrollen: number; smd_vor: number; smd_nach: number };
const E = ERW as unknown as { abgleich: { daten: { fall: number[]; sex: string[]; alter: number[] }; ergebnisse: Erg[] } };
const D = E.abgleich.daten;
const eingabe = (k: number, tol: number): AbgleichEingabe => ({ gruppe: D.fall, anker: [D.sex], zahlen: [D.alter], toleranzen: [tol], k });
const ok = (r: ReturnType<typeof abgleichen>): AbgleichOk => { if (!r.ok) throw new Error('kein Ergebnis: ' + r.code); return r; };
const nah = (ist: number | null, soll: number, tol: number, was: string) => { expect(ist, was).not.toBeNull(); expect(Math.abs(ist! - soll), `${was} (ist ${ist}, soll ${soll})`).toBeLessThanOrEqual(Math.max(Math.abs(soll) * tol, 1e-12)); };

describe('Abgleich gegen die Sollwerte (vier Fälle)', () => {
  for (const e of E.abgleich.ergebnisse) {
    it(`k = ${e.k}, Toleranz ${e.tol}: Paare, voll, ohne, Kontrollen, standardisierte Differenz davor und danach`, () => {
      const r = ok(abgleichen(eingabe(e.k, e.tol)));
      expect(r.paare, 'Paare mit Zeilennummern ab 1').toEqual(e.paare.map(p => ({ fall: p.fall, kontrollen: [...p.kontrollen] })));
      expect(r.voll).toBe(e.voll); expect(r.ohne).toBe(e.ohne); expect(r.kontrollen).toBe(e.kontrollen);
      nah(r.smd[0]!.vorher, e.smd_vor, 1e-6, 'SMD vorher'); nah(r.smd[0]!.nachher, e.smd_nach, 1e-6, 'SMD nachher');
    });
  }
  it('die Zahlen des Fachblatts (voll, ohne, Kontrollen) stehen so im Sollwert', () => {
    expect(E.abgleich.ergebnisse.map(e => [e.k, e.tol, e.voll, e.ohne, e.kontrollen])).toEqual([[1, 2, 14, 1, 14], [2, 2, 8, 4, 19], [1, 0, 5, 10, 5], [3, 5, 9, 3, 31]]);
  });
  it('ohne Zurücklegen: keine Kontrolle gehört zu zwei Fällen, und kein Fall ist selbst Kontrolle', () => {
    for (const e of E.abgleich.ergebnisse) {
      const r = ok(abgleichen(eingabe(e.k, e.tol)));
      const alle = r.paare.flatMap(p => p.kontrollen);
      expect(new Set(alle).size).toBe(alle.length);
      for (const c of alle) expect(D.fall[c - 1]).toBe(0);
      for (const p of r.paare) { expect(D.fall[p.fall - 1]).toBe(1); for (const c of p.kontrollen) { expect(D.sex[c - 1]).toBe(D.sex[p.fall - 1]); expect(Math.abs(D.alter[c - 1]! - D.alter[p.fall - 1]!)).toBeLessThanOrEqual(e.tol); } }
    }
  });
});

describe('Die Regel im Einzelnen', () => {
  const mk = (gruppe: number[], alter: number[], tol: number, k = 1, sex?: string[]): AbgleichEingabe => ({ gruppe, anker: sex ? [sex] : [], zahlen: [alter], toleranzen: [tol], k });
  it('Toleranz 0: nur gleiche Werte passen, der Abstand ist 0, bei Gleichstand gewinnt die kleinste Zeile', () => {
    const r = ok(abgleichen(mk([1, 0, 0, 0, 0], [50, 51, 50, 50, 49], 0, 2)));
    expect(r.paare).toEqual([{ fall: 1, kontrollen: [3, 4] }]);
  });
  it('kleinster Abstand vor kleinster Zeile', () => {
    const r = ok(abgleichen(mk([1, 0, 0, 0], [50, 52, 51, 49], 2)));
    expect(r.paare).toEqual([{ fall: 1, kontrollen: [3] }]);   // Abstand 1 bei Zeile 3 und 4: die kleinste Zeile gewinnt
  });
  it('gierig und von der Zeilenfolge abhängig: andere Folge, andere Paare', () => {
    // Folge 1: Der Fall mit 50 nimmt die 51, der mit 52 bleibt die 53. Folge 2: Der Fall mit 52 nimmt bei Gleichstand die 51 (kleinere Zeile), der mit 50 geht leer aus (53 liegt außerhalb).
    const a = ok(abgleichen(mk([1, 1, 0, 0], [50, 52, 51, 53], 2)));
    const b = ok(abgleichen(mk([1, 1, 0, 0], [52, 50, 51, 53], 2)));
    expect(a.paare).toEqual([{ fall: 1, kontrollen: [3] }, { fall: 2, kontrollen: [4] }]);
    expect(b.paare).toEqual([{ fall: 1, kontrollen: [3] }, { fall: 2, kontrollen: [] }]);
  });
  it('Anker: nur gleiche Anker passen, auch bei Zahlen als Anker', () => {
    const r = ok(abgleichen({ gruppe: [1, 0, 0], anker: [['a', 'b', 'a'], [1, 1, 2]], zahlen: [[5, 5, 5]], toleranzen: [0], k: 2 }));
    expect(r.paare).toEqual([{ fall: 1, kontrollen: [] }]);
    const r2 = ok(abgleichen({ gruppe: [1, 0, 0], anker: [['a', 'b', 'a'], [1, 1, 1]], zahlen: [[5, 5, 5]], toleranzen: [0], k: 2 }));
    expect(r2.paare).toEqual([{ fall: 1, kontrollen: [3] }]);
  });
  it('mehrere Zahlen: Summe der Abstände durch Toleranz; jede Zahl innerhalb ihrer Toleranz', () => {
    const r = ok(abgleichen({ gruppe: [1, 0, 0, 0], anker: [], zahlen: [[10, 11, 10.5, 10], [100, 100, 104, 110]], toleranzen: [2, 10], k: 1 }));
    // Zeile 2: 1/2 + 0 = 0,5; Zeile 3: 0,5/2 + 4/10 = 0,65; Zeile 4: zweite Zahl 10 ≤ 10, Abstand 0 + 1 = 1
    expect(r.paare).toEqual([{ fall: 1, kontrollen: [2] }]);
    const r2 = ok(abgleichen({ gruppe: [1, 0], anker: [], zahlen: [[10, 11], [100, 111]], toleranzen: [2, 10], k: 1 }));
    expect(r2.paare).toEqual([{ fall: 1, kontrollen: [] }]);
  });
  it('fehlende Werte: Die Zeile nimmt nicht teil und wird gezählt', () => {
    const r = ok(abgleichen({ gruppe: [1, 0, 0, null, 2], anker: [['a', 'a', null, 'a', 'a']], zahlen: [[5, 5, 5, 5, 5]], toleranzen: [0], k: 1 }));
    expect(r.ausgeschlossen).toBe(3); expect(r.paare).toEqual([{ fall: 1, kontrollen: [2] }]);
    expect(r.rolle).toEqual(['fall', 'kontrolle', null, null, null]); expect(r.nummer).toEqual([1, 1, null, null, null]);
    const w = abgleichWarnungen(r).join(' ');
    expect(w).toMatch(/3 Zeilen nehmen nicht teil|3 rows do not take part/);
  });
  it('Gruppennummer zählt nur Fälle mit Kontrolle; Fälle ohne Kontrolle bleiben „nicht abgeglichen“', () => {
    const r = ok(abgleichen(mk([1, 1, 0], [10, 90, 11], 2)));
    expect(r.nummer).toEqual([1, null, 1]); expect(r.rolle).toEqual(['fall', null, 'kontrolle']);
    expect(r.faelle).toBe(2); expect(r.ohne).toBe(1); expect(r.voll).toBe(1); expect(r.teilweise).toBe(0);
  });
  it('teilweise abgeglichen wird gezählt', () => {
    const r = ok(abgleichen(mk([1, 0], [10, 10], 0, 3)));
    expect(r.teilweise).toBe(1); expect(r.voll).toBe(0); expect(r.ohne).toBe(0);
  });
  it('Sperren: k außerhalb 1 bis 5, keine Zahl, negative Toleranz, kein Fall, keine Kontrolle', () => {
    const g = [1, 0, 0];
    expect(abgleichen({ ...mk(g, [1, 1, 1], 0), k: 0 })).toEqual({ ok: false, code: 'k-bereich' });
    expect(abgleichen({ ...mk(g, [1, 1, 1], 0), k: K_MAX + 1 })).toEqual({ ok: false, code: 'k-bereich' });
    expect(abgleichen({ gruppe: g, anker: [], zahlen: [], toleranzen: [], k: 1 })).toEqual({ ok: false, code: 'keine-zahl' });
    expect(abgleichen(mk(g, [1, 1, 1], -1))).toEqual({ ok: false, code: 'toleranz' });
    expect(abgleichen(mk([0, 0, 0], [1, 1, 1], 0))).toEqual({ ok: false, code: 'keine-faelle' });
    expect(abgleichen(mk([1, 1, 1], [1, 1, 1], 0))).toEqual({ ok: false, code: 'keine-kontrollen' });
    for (const c of ['k-bereich', 'keine-zahl', 'toleranz', 'keine-faelle', 'keine-kontrollen', 'laenge'] as const) expect(abgleichCodeSatz(c).text.length).toBeGreaterThan(10);
  });
  it('standardisierte Mittelwertdifferenz: (m1 − m0) / √((s1² + s0²)/2), Varianz mit n − 1', () => {
    // fall 2, 4 (m 3, s² 2); kontrolle 1, 3 (m 2, s² 2): 1 / √2
    nah(smd([2, 4], [1, 3]), 1 / Math.SQRT2, 1e-12, 'SMD');
    expect(smd([1], [1, 2])).toBeNull(); expect(smd([1, 1], [1, 1])).toBeNull();
  });
  it('eine große Datei rechnet in einem Zug (Fenster statt aller Kontrollen)', () => {
    const n = 60000, gruppe = Array.from({ length: n }, (_, i) => (i % 10 === 0 ? 1 : 0)), alter = Array.from({ length: n }, (_, i) => (i * 7919) % 90);
    const t0 = Date.now(), r = ok(abgleichen({ gruppe, anker: [], zahlen: [alter], toleranzen: [1], k: 3 }));
    expect(r.faelle).toBe(6000); expect(Date.now() - t0).toBeLessThan(20000);
  });
  it('Warnungen sind immer da: gierig, nur gewählte Merkmale, Auswertung muss den Abgleich berücksichtigen, nicht wählen bis es passt', () => {
    for (const w of [abgleichWarnungen(), abgleichWarnungen(ok(abgleichen(eingabe(1, 2))))]) {
      const t = w.join(' ');
      expect(t).toMatch(/gierig|greedy/); expect(t).toMatch(/Reihenfolge der Zeilen|order of the rows/); expect(t).toMatch(/gewählten Merkmale|chosen characteristics/);
      expect(t).toMatch(/gepaarten oder bedingten|paired or conditional/); expect(t).toMatch(/kein Experiment|not an experiment/); expect(t).toMatch(/bis es passt|until it fits/);
    }
    const mit = abgleichWarnungen(ok(abgleichen(eingabe(1, 2)))).join(' ');
    expect(mit).toMatch(/keine passende Kontrolle|no matching control/);   // Fälle ohne Kontrolle fallen aus dem Vergleich
  });
});

/* Verschachtelte Angaben nur über $state.snapshot speichern (Muster lib/speichern-verschachtelt.test.ts): der Abgleich legt zwei Spalten und einen Protokolleintrag an;
 * Speichern in die Ablage und Neuladen müssen klappen, und der Eintrag steht danach noch da - als „nicht wiederholbar“. */
describe('Abgleich: Speichern und Neuladen', () => {
  beforeAll(async () => { setzeTestMotor(await erzeugeTestMotor()); }, 120000);
  it('legt Gruppe und Abgleich an, das Protokoll nennt Regel und Zählung, und das Projekt lässt sich speichern und laden', async () => {
    const zeilen = ['fall,sex,alter', '1,f,50', '0,f,51', '0,m,50', '1,m,60', '0,f,80', '0,m,61'].join('\n') + '\n';
    await oeffneTabelle(leseCsv(zeilen), 'abgleich');
    const wahl = { fall: 'fall', anker: ['sex'], zahlen: [{ spalte: 'alter', toleranz: 2 }], k: 1 };
    const e = abgleichEingabe(wahl, s.spalten, s.zeilen)!;
    const r = abgleichen(e); expect(r.ok).toBe(true);
    const n = await abgleichAnwenden(wahl, ok(r));
    expect(n).not.toBeNull();
    expect(s.spalten.map(c => c.name)).toEqual(['fall', 'sex', 'alter', n!.gruppe, n!.rolle]);
    const gi = s.spalten.findIndex(c => c.name === n!.gruppe), ri = s.spalten.findIndex(c => c.name === n!.rolle);
    expect(s.zeilen.map(z => z[gi])).toEqual([1, 1, null, 2, null, 2]);
    expect(s.zeilen.map(z => z[ri])).toEqual(['Fall', 'Kontrolle', 'nicht abgeglichen', 'Fall', 'nicht abgeglichen', 'Kontrolle']);
    const eintrag = s.protokoll.at(-1)!;
    expect(eintrag.art).toBe('abgleich'); expect(eintrag.nicht).toBe('art'); expect(eintrag.wiederhol).toBeUndefined();
    expect(eintrag.abgleich).toEqual({ fall: 'fall', k: 1, anker: ['sex'], zahlen: [{ spalte: 'alter', toleranz: 2 }], faelle: 2, voll: 2, teilweise: 0, ohne: 0, ausgeschlossen: 0 });
    const p = await jetzigesProjekt();
    expect(p).not.toBeNull();
    await speichereProjekt(p!);
    const g = await ladeProjekt(p!.id);
    const geladen = g?.protokoll?.find(x => x.art === 'abgleich');
    expect(geladen?.abgleich?.faelle).toBe(2); expect(geladen?.abgleich?.zahlen).toEqual([{ spalte: 'alter', toleranz: 2 }]);
    expect(geladen?.nicht).toBe('art');
    // auch der Weg über die Projektdatei (Lesen aus fremder Hand) behält die Regel
    const gelesen = leseProtokoll(JSON.parse(JSON.stringify(s.protokoll)), (x): x is string => typeof x === 'string', () => null).find(x => x.art === 'abgleich');
    expect(gelesen?.abgleich).toEqual(eintrag.abgleich); expect(gelesen?.nicht).toBe('art');
    expect(leseProtokoll([{ art: 'abgleich', abgleich: { fall: 5, zahlen: 'x', anker: [1, 'a'] } }], (x): x is string => typeof x === 'string', () => null)[0]?.abgleich).toEqual({ fall: '', k: 0, anker: ['a'], zahlen: [], faelle: 0, voll: 0, teilweise: 0, ohne: 0, ausgeschlossen: 0 });
  }, 120000);
});
