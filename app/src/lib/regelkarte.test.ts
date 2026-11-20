import { describe, expect, it } from 'vitest';
import { regelkarte, regelkarteUG, c4, faehigWort, type Regel, type RegelFehler, type RegelUG } from './regelkarte';

/* Sollwerte: Rscript am Mac (R 4.6.1, qcc 3.0-1): qcc(x, type = "xbar.one") und process.capability(spec.limits = c(9.2, 10.8)); Pp und Ppk aus sd(x). */
const X = [10.2, 9.8, 10.1, 10.4, 9.9, 10.0, 10.3, 9.7, 10.5, 10.1, 9.9, 10.2, 10.0, 10.6, 9.8, 10.1, 10.2, 9.9, 10.3, 11.4, 10.0, 10.1, 9.9, 10.2, 10.0];
const ok = (r: Regel | RegelFehler): Regel => { if ('fehler' in r) throw new Error(r.fehler); return r; };
const nah = (a: number, b: number, tol = 1e-8) => expect(Math.abs(a - b) / Math.abs(b), `${a} gegen ${b}`).toBeLessThan(tol);

describe('Regelkarte für Einzelwerte gegen R qcc', () => {
  const r = ok(regelkarte(X, { ugw: 9.2, ogw: 10.8 }));
  it('Mittellinie, σ aus der gleitenden Spannweite und Grenzen', () => {
    nah(r.mittel, 10.144); nah(r.mrMittel, 0.425); nah(r.sigmaIn, 0.3767730496); nah(r.lcl, 9.013680851); nah(r.ucl, 11.27431915);
  });
  it('Signal: der Punkt 20 (Index 19) liegt über der oberen Grenze', () => { expect(r.aus).toEqual([19]); });
  it('Cp, Cpk, Pp, Ppk mit Grenzen 9,2 und 10,8', () => {
    nah(r.faehig!.cp!, 0.7077647); nah(r.faehig!.cpk, 0.5803671, 1e-6); nah(r.faehig!.pp!, 0.780497091); nah(r.faehig!.ppk, 0.6400076147); expect(r.faehig!.ausserhalb).toBe(1);
  });
  it('nur eine Grenze: Cpk einseitig, Cp fehlt', () => {
    const e = ok(regelkarte(X, { ogw: 10.8 })); expect(e.faehig!.cp).toBeNull(); nah(e.faehig!.cpk, (10.8 - 10.144) / (3 * 0.3767730496), 1e-8);
  });
  it('Wort zur Fähigkeit', () => { expect(faehigWort(1.5)).toBe('faehig'); expect(faehigWort(1.2)).toBe('bedingt'); expect(faehigWort(0.58)).toBe('nicht'); });
});

describe('Regelkarte: Regel 2 (neun in Folge) und Grenzen der Eingabe', () => {
  it('neun Werte in Folge über der Mittellinie lösen ein Signal aus', () => {
    const w = [10, 9, 10, 9, 10, 9, 10.4, 10.5, 10.4, 10.6, 10.4, 10.5, 10.4, 10.6, 10.5, 9, 11, 9, 11];
    const r = ok(regelkarte(w)); expect(r.serie.length).toBeGreaterThan(0); expect(r.serie[0]).toBeGreaterThanOrEqual(8);
  });
  it('Fehler: zu wenige Werte, keine Streuung, UGW ≥ OGW', () => {
    expect(regelkarte([1, 2, 3])).toEqual({ fehler: 'zu-wenig-werte' });
    expect(regelkarte([5, 5, 5, 5, 5, 5])).toEqual({ fehler: 'keine-streuung' });
    expect(regelkarte(X, { ugw: 11, ogw: 10 })).toEqual({ fehler: 'grenzen' });
  });
});

describe('Regelkarte für Untergruppen (X̄-R) gegen R qcc', () => {
  const Y = [10.2, 9.8, 10.1, 10.4, 9.9, 10.0, 10.3, 9.7, 10.5, 10.1, 9.9, 10.2, 10.0, 10.6, 9.8, 10.1, 10.2, 9.9, 10.3, 11.4, 10.0, 10.1, 9.9, 10.2, 10.0, 10.4, 10.1, 9.8, 10.3, 10.2];
  const g = (r: ReturnType<typeof regelkarteUG>): RegelUG => { if ('fehler' in r) throw new Error(r.fehler); return r; };
  it('k = 5: Mittellinie, σ, Grenzen der X̄- und der R-Karte, Cp', () => {
    const r = g(regelkarteUG(Y, 5, { ugw: 9.2, ogw: 10.8 }));
    nah(r.mittel, 10.1466666667); nah(r.sigmaIn, 0.329607337346); nah(r.lcl, 9.70445201935); nah(r.ucl, 10.588881314);
    nah(r.rMittel, 0.766666666667); nah(r.rUcl, 1.62109342935); expect(r.rLcl).toBe(0);
    nah(r.faehig!.cp!, 0.809043478261); nah(r.faehig!.cpk, 0.660718840580); nah(r.faehig!.pp!, 1.6 / (6 * 0.322419017722));
  });
  it('X̄-S (k = 5): σ = S̄/c₄, Grenzen der X̄- und der S-Karte, Standardabweichungen je Untergruppe (R qcc, std.dev = UWAVE-SD)', () => {
    const r = g(regelkarteUG(Y, 5, {}, 's'));
    nah(r.sigmaIn, 0.31766291526); nah(r.lcl, 9.7204771432); nah(r.ucl, 10.5728561901); nah(r.rMittel, 0.298598566947); nah(r.rUcl, 0.623771769928); expect(r.rLcl).toBe(0);
    nah(r.r[0]!, 0.23874673, 1e-7); nah(r.r[3]!, 0.58906706, 1e-7); nah(c4(5), 0.9399856, 1e-7);
  });
  it('k = 3: Grenzen', () => {
    const r = g(regelkarteUG(Y, 3)); nah(r.lcl, 9.56351902324); nah(r.ucl, 10.7298143101); nah(r.rUcl, 1.46729012817); nah(r.rMittel, 0.57);
  });
  it('Fehler: Größe außerhalb 2-10, zu wenige Untergruppen', () => {
    expect(regelkarteUG(Y, 1)).toEqual({ fehler: 'zu-wenig-werte' }); expect(regelkarteUG(Y, 11)).toEqual({ fehler: 'zu-wenig-werte' }); expect(regelkarteUG(Y.slice(0, 8), 3)).toEqual({ fehler: 'zu-wenig-werte' });
  });
});
