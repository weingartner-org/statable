import { describe, expect, it } from 'vitest';
import { qca, type QcaErgebnis, type QcaEingabe, type QcaFehler } from './qca';

/* Sollwerte: Rscript am Mac (R 4.6.1, QCA): data(LF) (18 Länder, fuzzy), truthTable(LF, outcome = "SURV", conditions = "DEV,URB,LIT,IND,STB", incl.cut = 0.8, n.cut = 1) und minimize(include = "" bzw. "?", details = TRUE). */
const LF = [[0.81, 0.12, 0.99, 0.73, 0.43, 0.05], [0.99, 0.89, 0.98, 1, 0.98, 0.95], [0.58, 0.98, 0.98, 0.9, 0.91, 0.89], [0.16, 0.07, 0.98, 0.01, 0.91, 0.12], [0.58, 0.03, 0.99, 0.08, 0.58, 0.77], [0.98, 0.03, 0.99, 0.81, 0.95, 0.95], [0.89, 0.79, 0.99, 0.96, 0.31, 0.05], [0.04, 0.09, 0.13, 0.36, 0.43, 0.06], [0.07, 0.16, 0.88, 0.07, 0.13, 0.42], [0.72, 0.05, 0.98, 0.01, 0.95, 0.92], [0.34, 0.1, 0.41, 0.47, 0.58, 0.05], [0.98, 1, 0.99, 0.94, 0.99, 0.95], [0.02, 0.17, 0.59, 0, 0, 0.12], [0.01, 0.02, 0.01, 0.11, 0.01, 0.05], [0.01, 0.03, 0.17, 0, 0.84, 0.21], [0.03, 0.3, 0.09, 0.21, 0.2, 0.06], [0.95, 0.13, 0.99, 0.67, 0.91, 0.95], [0.98, 0.99, 0.99, 1, 0.98, 0.95]];
const ein = (o: Partial<QcaEingabe> = {}): QcaEingabe => ({ namen: ['DEV', 'URB', 'LIT', 'IND', 'STB'], x: LF.map(r => r.slice(0, 5)), y: LF.map(r => r[5]!), inclGrenze: 0.8, nMin: 1, priGrenze: 0, sparsam: false, ...o });
const g = (r: QcaErgebnis | QcaFehler): QcaErgebnis => { if ('fehler' in r) throw new Error(r.fehler); return r; };
const nah = (a: number, b: number, tol = 1e-3) => expect(Math.abs(a - b), `${a} gegen ${b}`).toBeLessThan(tol);

describe('QCA gegen R QCA (Daten LF, fuzzy)', () => {
  it('Wahrheitstafel: Zeilen 1, 22, 32 (Konsistenz, PRI, n, Ergebnis)', () => {
    const r = g(qca(ein())), z = (i: number) => r.zeilen[i - 1]!;
    expect(z(1)).toMatchObject({ out: '0', n: 3 }); nah(z(1).incl!, 0.215976331360947, 1e-9); nah(z(1).pri!, 0, 1e-9);
    expect(z(22)).toMatchObject({ out: '1', n: 2 }); nah(z(22).incl!, 0.804270462633452, 1e-9); nah(z(22).pri!, 0.719387755102041, 1e-9);
    expect(z(32)).toMatchObject({ out: '1', n: 4 }); nah(z(32).incl!, 0.904205607476635, 1e-9); nah(z(32).pri!, 0.885793871866295, 1e-9);
    expect(z(24)).toMatchObject({ out: '0', n: 2 }); expect(z(3)).toMatchObject({ out: '?', n: 0 });
    expect(r.zeilen.filter(q => q.out === '1').length).toBe(2);
  });
  it('komplexe Lösung: zwei Terme mit Konsistenz, PRI, Überdeckung (roh und eindeutig)', () => {
    const r = g(qca(ein())); expect(r.loesungen.length).toBe(1);
    const l = r.loesungen[0]!; expect(l.terme.map(t => t.text)).toEqual(['DEV*URB*LIT*IND*STB', 'DEV*~URB*LIT*~IND*STB']);
    nah(l.terme[0]!.incl, 0.904); nah(l.terme[0]!.pri, 0.886); nah(l.terme[0]!.covS, 0.454); nah(l.terme[0]!.covU, 0.393);
    nah(l.terme[1]!.incl, 0.804); nah(l.terme[1]!.pri, 0.719); nah(l.terme[1]!.covS, 0.265); nah(l.terme[1]!.covU, 0.204);
    nah(l.incl, 0.870); nah(l.pri, 0.843); nah(l.covS, 0.658);
  });
  it('sparsame Lösung (logische Reste einbezogen): DEV*~IND + URB*STB', () => {
    const l = g(qca(ein({ sparsam: true }))).loesungen[0]!; expect(l.terme.map(t => t.text)).toEqual(['DEV*~IND', 'URB*STB']);
    nah(l.terme[0]!.incl, 0.815); nah(l.terme[0]!.covS, 0.284); nah(l.terme[0]!.covU, 0.194); nah(l.terme[1]!.incl, 0.874); nah(l.terme[1]!.covS, 0.520); nah(l.terme[1]!.covU, 0.430);
    nah(l.incl, 0.850); nah(l.pri, 0.819); nah(l.covS, 0.714);
  });
  it('Konsistenzgrenze 0,9: nur eine Zeile bleibt', () => {
    const r = g(qca(ein({ inclGrenze: 0.9 }))), l = r.loesungen[0]!; expect(l.terme.map(t => t.text)).toEqual(['DEV*URB*LIT*IND*STB']); nah(l.covS, 0.454);
  });
  it('Notwendigkeit: Konsistenz, Relevanz und Überdeckung wie pof("DEV+~URB+~LIT+STB <= SURV")', () => {
    const n = g(qca(ein())).notwendig, f = (j: number, neg: boolean) => n.find(q => q.bedingung === j && q.negiert === neg)!;
    nah(f(0, false).incl, 0.830985915, 1e-8); nah(f(0, false).ron, 0.81135531, 1e-7); nah(f(0, false).cov, 0.77461707, 1e-7);
    nah(f(1, true).incl, 0.568075117, 1e-8); nah(f(1, true).ron, 0.45212766, 1e-7); nah(f(1, true).cov, 0.40165975, 1e-7);
    nah(f(2, true).incl, 0.096244131, 1e-8); nah(f(2, true).ron, 0.76426077, 1e-7); nah(f(4, false).incl, 0.920187793, 1e-8); nah(f(4, false).cov, 0.70694319, 1e-7); expect(n.length).toBe(10);
  });
  it('Fehler', () => {
    expect(qca(ein({ x: LF.slice(0, 3).map(r => r.slice(0, 5)), y: LF.slice(0, 3).map(r => r[5]!) }))).toEqual({ fehler: 'zu-wenig-faelle' });
    expect(qca(ein({ inclGrenze: 1.01 }))).toEqual({ fehler: 'keine-einsen' });
    expect(qca(ein({ namen: ['DEV'], x: LF.map(r => [r[0]!]) }))).toEqual({ fehler: 'zu-wenig-bedingungen' });
    expect(qca(ein({ y: LF.map(() => 0.5) }))).toEqual({ fehler: 'keine-streuung' });
  });
});

describe('QCA crisp-set gegen R QCA (zwei Lösungen bei sparsamer Minimierung)', () => {
  const X = [[1,1,1,0],[0,1,1,0],[1,1,0,1],[0,0,1,0],[1,0,0,0],[1,1,1,0],[0,0,0,0],[0,1,0,1],[1,0,1,1],[1,1,1,1],[1,1,1,1],[1,1,0,1],[0,1,1,0],[1,1,1,1],[0,0,1,1],[0,1,0,1],[1,0,1,0],[0,1,1,1],[0,0,0,0],[1,0,0,0],[0,0,0,1],[1,1,1,0],[1,0,1,0],[1,1,1,1],[0,1,0,1],[1,0,0,1],[1,1,0,0],[1,1,0,1],[1,1,1,1],[1,1,1,1],[1,1,1,1],[1,1,0,0],[1,1,0,1],[1,1,1,1],[1,1,0,1],[0,1,0,0],[0,1,1,0],[1,0,1,1],[0,1,1,1],[1,1,1,0]];
  const Y = [1,0,1,0,0,1,0,0,0,1,1,1,1,1,0,0,1,0,0,0,0,1,1,1,0,0,1,1,1,0,1,1,1,1,1,0,1,0,0,1];
  const e = (sparsam: boolean) => g(qca({ namen: ['A', 'B', 'C', 'D'], x: X, y: Y, inclGrenze: 0.75, nMin: 2, priGrenze: 0, sparsam }));
  it('komplex: A*B + A*C*~D (Konsistenz 0,952, Überdeckung 0,909)', () => {
    const r = e(false); expect(r.loesungen.length).toBe(1); const l = r.loesungen[0]!;
    expect(l.terme.map(t => t.text)).toEqual(['A*B', 'A*C*~D']); nah(l.terme[0]!.incl, 0.947); nah(l.terme[0]!.covS, 0.818); nah(l.terme[0]!.covU, 0.636); nah(l.terme[1]!.incl, 1); nah(l.terme[1]!.covU, 0.091); nah(l.incl, 0.952); nah(l.covS, 0.909);
    expect(r.zeilen[13]).toMatchObject({ out: '1', n: 5 }); expect(r.zeilen[1]).toMatchObject({ out: '?', n: 1 }); nah(r.zeilen[6]!.incl!, 2 / 3, 1e-9);
  });
  it('sparsam: zwei gleichwertige Lösungen (Modellmehrdeutigkeit)', () => {
    const r = e(true); expect(r.loesungen.map(l => l.terme.map(t => t.text).join(' + '))).toEqual(['A*B + A*C*~D', 'A*B + ~B*C*~D']);
    nah(r.loesungen[1]!.incl, 0.909); nah(r.loesungen[1]!.terme[0]!.covU, 0.818); nah(r.loesungen[1]!.terme[1]!.covU, 0.091); nah(r.loesungen[1]!.terme[1]!.incl, 0.667);
  });
});
