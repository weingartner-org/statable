import { describe, expect, it } from 'vitest';
import { typicalError } from './typicalerror';
import { blandAltman } from './blandaltman';
import ERW from './testdaten/welle7-erwartet.json';

/* Welle 7, M8 Typical Error (Hopkins 2000, Sports Med 30:1-15). ROTE TESTS des Prüfers (Fachblatt docs/fachblaetter/WELLE7-MEDIZIN-TESTS-PCA.md, Nachtrag Punkt 2).
 * Der Bauer darf diese Datei nicht ändern; er baut app/src/lib/typicalerror.ts, bis sie grün ist.
 * Sollwerte: scripts/welle7-erwartet.R -> testdaten/welle7-erwartet.json, Abschnitt `typicalerror` (R 4.6.1; zweite Quelle: Residual-Mittelquadrat der ANOVA y ~ Person + Zeitpunkt, 1e-10).
 *
 * API (Modul lib/typicalerror.ts, JS; wiederverwendet: chi2Quantil aus power.ts, tQuantil aus verteilung.ts):
 *   typicalError(paare) : TypicalError
 *     paare = [[Messung 1, Messung 2], …] je Person (nur vollständige Paare; Test-Retest ohne Eingriff). Wirft Error bei weniger als 3 Paaren oder wenn alle Differenzen gleich sind (wie blandAltman).
 *   TypicalError = {
 *     n, df (= n - 1),
 *     sdDiff          SD der Differenzen d = Messung 2 - Messung 1 (nicht n, sondern n - 1 im Nenner)
 *     te              {wert, lo, hi}: TE = sdDiff/√2; KI über χ²(n - 1): TE·√(df/χ²₀,₉₇₅), TE·√(df/χ²₀,₀₂₅)
 *     aenderung       {wert, lo, hi}: Änderung des Mittelwerts = mean(d) (Messung 2 - Messung 1, wie Hopkins; ⚠ Bland-Altman rechnet erste - zweite Spalte, das Vorzeichen ist also UMGEKEHRT), t-KI mit df
 *     cv              {wert, lo, hi} | null: Variationskoeffizient in % = 100·(exp(TE_ln) - 1), TE_ln = TE der ln-Werte; KI: dieselbe χ²-Umrechnung auf TE_ln, dann 100·(exp(.) - 1).
 *                     null, wenn irgendein Wert <= 0 ist (ln nicht definiert; die Oberfläche sperrt und sagt es)
 *     cvNaeherung     {wert, lo, hi} | null: 100·TE_ln (Näherung; nur zum Vergleich/Fußnote; EMPFOHLEN ist `cv`, exakt für multiplikativen lognormalen Fehler, so rechnet Hopkins' Tabelle)
 *     teLn            TE der ln-Werte (null wie cv)
 *   }
 * TOLERANZ 1e-9 relativ (geschlossene Formeln; Quantile aus den eigenen Verteilungsfunktionen: Bisektion/Kettenbruch, 1e-9 reicht dafür). */

type Z = Record<string, any>;
const F = (ERW as unknown as { typicalerror: Z[] }).typicalerror;
const nah = (ist: number | null | undefined, soll: number, was: string, tol = 1e-9) => {
  expect(typeof ist, `${was}: Zahl erwartet`).toBe('number');
  expect(Math.abs((ist as number) - soll), `${was}: ist ${ist}, soll ${soll}`).toBeLessThanOrEqual(tol * Math.max(1, Math.abs(soll)));
};
const ki = (ist: Z | null | undefined, soll: Z, was: string) => {
  expect(ist, `${was} darf nicht null sein`).toBeTruthy();
  nah(ist!.wert, soll.wert, `${was}.wert`); nah(ist!.lo, soll.lo, `${was}.lo`); nah(ist!.hi, soll.hi, `${was}.hi`);
};
const paare = (f: Z): [number, number][] => (f.y1 as number[]).map((v, i) => [v, (f.y2 as number[])[i]!]);

describe('Typical Error gegen R (Formeln von Hopkins 2000, ANOVA-Gegenprobe)', () => {
  it('es gibt Sollwerte für fünf Fälle', () => expect(F.length).toBe(5));
  for (const f of F) {
    describe(f.name, () => {
      const r = () => typicalError(paare(f));
      it('n, df, SD der Differenzen', () => { expect(r().n).toBe(f.n); expect(r().df).toBe(f.df); nah(r().sdDiff, f.sd_diff, 'sdDiff'); });
      it('TE = SD(d)/√2 mit χ²-Intervall (df = n - 1)', () => ki(r().te, f.te, 'te'));
      it('Änderung des Mittelwerts (Messung 2 - Messung 1) mit t-Intervall', () => ki(r().aenderung, f.aenderung, 'aenderung'));
      if (f.cv_moeglich) {
        it('CV = 100·(exp(TE_ln) - 1) mit Intervall (empfohlen) und Näherung 100·TE_ln', () => {
          ki(r().cv, f.cv, 'cv'); ki(r().cvNaeherung, f.cv_naeherung, 'cvNaeherung'); nah(r().teLn, f.te_ln, 'teLn');
          expect(r().cv!.wert).toBeGreaterThan(r().cvNaeherung!.wert);          // exp(x) - 1 > x
        });
      } else {
        it('ein Wert <= 0: kein CV (null), TE und Änderung gehen trotzdem', () => {
          expect(r().cv).toBeNull(); expect(r().cvNaeherung).toBeNull(); expect(r().teLn).toBeNull();
          expect(Number.isFinite(r().te.wert)).toBe(true);
        });
      }
      it('stimmt mit Bland-Altman überein: gleiche SD der Differenzen, Bias mit umgekehrtem Vorzeichen', () => {
        const b = blandAltman(paare(f));
        nah(r().sdDiff, b.sd, 'sd gegen blandAltman', 1e-12); nah(r().aenderung.wert, -b.bias, 'Änderung = -Bias', 1e-12);
      });
    });
  }
  it('von Hand: Differenzen 2, -2, 4, -2 -> SD = 3, TE = 3/√2, Änderung 0,5', () => {
    const r = typicalError([[100, 102], [110, 108], [95, 99], [120, 118]]);
    nah(r.sdDiff, 3, 'sd', 1e-12); nah(r.te.wert, 3 / Math.SQRT2, 'te', 1e-12); nah(r.aenderung.wert, 0.5, 'aenderung', 1e-12); expect(r.df).toBe(3);
  });
  it('CV: bei kleinem Fehler praktisch gleich der Näherung, bei großem klar größer (Fall e: 21,8 gegen 19,7)', () => {
    const a = typicalError(paare(F[0]!)); expect(a.cv!.wert - a.cvNaeherung!.wert).toBeLessThan(0.1);
    const e = typicalError(paare(F[4]!)); expect(e.cv!.wert - e.cvNaeherung!.wert).toBeGreaterThan(1.5);
  });
  it('TE ist nicht die within-subject-SD nach Bland (sw enthält die Mittelwertänderung) und nicht der SEM: gleiches Ergebnis nur ohne Änderung', () => {
    const a = F[0]!; const r = typicalError(paare(a));
    expect(a.sw_bland).toBeGreaterThan(r.te.wert);                               // Änderung 0,43 s: sw größer als TE
    nah(r.te.wert, Math.sqrt((a.sw_bland ** 2 * 2 * a.n - a.n * r.aenderung.wert ** 2) / (2 * (a.n - 1))), 'te aus sw und Änderung', 1e-10);
  });
  it('wirft bei weniger als 3 Paaren und bei gleichen Differenzen', () => {
    expect(() => typicalError([[1, 2], [2, 3]])).toThrow();
    expect(() => typicalError([[1, 2], [2, 3], [3, 4], [5, 6]])).toThrow();       // alle Differenzen = 1
  });
});
