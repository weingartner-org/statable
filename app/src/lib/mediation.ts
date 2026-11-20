/**
 * Mediation X → M → Y (wie PROCESS-Modell 4 von Hayes), ohne Kovariaten.
 * Pfade a (X→M), b (M→Y bei festem X), c′ (direkt) und c (gesamt) kommen aus drei PSPP-REGRESSION-Läufen (B, SE, t, p, 95-%-KI).
 * Der indirekte Effekt a·b hat ein Bootstrap-Intervall: 5000 Ziehungen mit Zurücklegen aus den vollständigen Fällen (wie PROCESS), fester Startwert (gleiche Daten ⇒ gleiches Intervall),
 * eigener Code mit geschlossener OLS-Formel (nicht 5000-mal PSPP). Die Ziehungen und beide Intervallarten kommen aus der gemeinsamen Grundlage lib/bootstrap.ts
 * (Quantile und BCa wie das R-Paket boot): Voreinstellung Perzentil (Hayes & Scharkow 2013, Hayes 2022), BCa wählbar unter „Weitere Wege“.
 * Standardisierter indirekter Effekt (completely standardized) = a·b·SD(X)/SD(Y).
 * Geprüft gegen R (lm, lavaan): scripts/mediation-erwartet.R, Tests: mediation.test.ts, bootstrap.test.ts.
 * ⚠ Von der Fachperson abzunehmen: Anteil a·b/c nur bei gleichem Vorzeichen und 0 ≤ Anteil ≤ 1 angezeigt.
 */
import type { OutputItem } from '../engine/types';
import { regressionsModelle, type RegTerm } from './regressionlesen';
import { Ziehung, intervall, hesterberg, type BootArt, type BootWarnung } from './bootstrap';
import { L as T } from './sitzung.svelte';



export const ZIEHUNGEN = 5000;
export const STARTWERT = 20261008;

export interface MedPfad { b: number; se: number; beta: number; t: number; p: number; lo: number; hi: number }
export interface Mediation {
  art: 'mediation'; x: string; m: string; y: string; n: number; gesamt: number;
  a: MedPfad; b: MedPfad; direkt: MedPfad; total: MedPfad;
  r2M: number; r2Y: number; dfM: number; dfY: number;
  ab: number; abLo: number; abHi: number; abSe: number;
  abStd: number; abStdLo: number; abStdHi: number;
  /** Anteil a·b / c; NaN, wenn nicht sinnvoll (c ≈ 0, anderes Vorzeichen oder Anteil außerhalb 0 bis 1) */
  anteil: number;
  ziehungen: number; startwert: number; gueltig: number;
  /** Art des Intervalls, das in abLo/abHi steht (BCa fällt auf Perzentil zurück, wenn es sich nicht berechnen lässt); fehlt in alten Projekten = Perzentil */
  intervallArt?: BootArt;
  /** die gewählte Art (kann BCa sein, auch wenn Perzentil rechnete) */
  intervallWunsch?: BootArt;
  /** Warnungen der Grundlage (Rand, z0 unendlich, viele gleiche Ziehungen); ungültige Ziehungen sind gezählt */
  bootWarnungen?: BootWarnung[]; ungueltig?: number; kleinN?: boolean;
}

const pfad = (t: RegTerm): MedPfad => ({ b: t.b, se: t.se, beta: t.beta, t: t.t, p: t.p, lo: t.lo, hi: t.hi });

/** Der Befehl: drei Regressionen mit denselben Fällen (TEMPORARY + SELECT IF: nur Personen mit allen drei Angaben; die Daten bleiben unverändert). */
export function mediationBefehl(x: string, m: string, y: string): string {
  const voll = `TEMPORARY.\nSELECT IF (NOT MISSING(${x}) AND NOT MISSING(${m}) AND NOT MISSING(${y})).\n`;
  return `* ${T('Pfad a: M aus X', 'Path a: M from X')}\n${voll}REGRESSION /VARIABLES=${x} ${m} /STATISTICS=COEFF R ANOVA CI(95) /DEPENDENT=${m} /METHOD=ENTER.\n* ${T('Pfade b und c′: Y aus X und M', 'Paths b and c′: Y from X and M')}\n${voll}REGRESSION /VARIABLES=${x} ${m} ${y} /STATISTICS=COEFF R ANOVA CI(95) /DEPENDENT=${y} /METHOD=ENTER.\n* ${T('Gesamteffekt c: Y aus X', 'Total effect c: Y from X')}\n${voll}REGRESSION /VARIABLES=${x} ${y} /STATISTICS=COEFF R ANOVA CI(95) /DEPENDENT=${y} /METHOD=ENTER.`;
}

/** Summen einer Ziehung (oder eines Jackknife-Schritts), aus denen a·b und der standardisierte Wert geschlossen folgen. */
type Summen = [n: number, sx: number, sm: number, sy: number, sxx: number, sxm: number, sxy: number, smm: number, smy: number, syy: number];
/** a·b und a·b·SD(X)/SD(Y) aus den Summen (zentrierte OLS-Formeln); NaN, wenn die Entwurfsmatrix singulär ist (ungültige Ziehung). */
function ausSummen([n, sx, sm, sy, sxx, sxm, sxy, smm, smy, syy]: Summen): [ab: number, abStd: number] {
  const cxx = sxx - sx * sx / n, cxm = sxm - sx * sm / n, cxy = sxy - sx * sy / n, cmm = smm - sm * sm / n, cmy = smy - sm * sy / n, cyy = syy - sy * sy / n;
  const det = cxx * cmm - cxm * cxm;
  if (!(cxx > 1e-12) || !(cyy > 1e-12) || !(det > 1e-12 * cxx * cmm)) return [NaN, NaN];
  const a = cxm / cxx, b = (cxx * cmy - cxm * cxy) / det, ab = a * b;
  return [ab, ab * Math.sqrt(cxx / cyy)];
}
type Daten3 = { x: number[]; m: number[]; y: number[] };
const summen = (d: Daten3, idx: Int32Array): Summen => {
  let sx = 0, sm = 0, sy = 0, sxx = 0, sxm = 0, sxy = 0, smm = 0, smy = 0, syy = 0;
  for (let i = 0; i < idx.length; i++) {
    const j = idx[i]!, xv = d.x[j]!, mv = d.m[j]!, yv = d.y[j]!;
    sx += xv; sm += mv; sy += yv; sxx += xv * xv; sxm += xv * mv; sxy += xv * yv; smm += mv * mv; smy += mv * yv; syy += yv * yv;
  }
  return [idx.length, sx, sm, sy, sxx, sxm, sxy, smm, smy, syy];
};

/** Ein Bootstrap-Lauf auf der gemeinsamen Grundlage: a·b je Ziehung in `ziehung.t`, der standardisierte Wert in `abStd` (dieselben Ziehungen). */
export function mediationZiehung(daten: Daten3, startwert = STARTWERT, B = ZIEHUNGEN): { ziehung: Ziehung; abStd: number[] } {
  const abStd: number[] = [];
  const ziehung = new Ziehung(daten.x.length, idx => { const [ab, st] = ausSummen(summen(daten, idx)); abStd.push(st); return ab; }, { startwert, B });
  abStd.length = 0;   // der Aufruf für den Schätzer t0 zählt nicht als Ziehung
  return { ziehung, abStd };
}

/** Jackknife-Werte L von a·b und vom standardisierten Wert, geschlossen aus Summen (Summen minus ein Fall, O(n)), gleich der allgemeinen `jackknife` aus bootstrap.ts. */
export function mediationJackknife(daten: Daten3): { t0: number; s0: number; L: number[]; LStd: number[] } {
  const n = daten.x.length, voll = summen(daten, Int32Array.from({ length: n }, (_, i) => i)), [t0, s0] = ausSummen(voll);
  const L: number[] = [], LStd: number[] = [];
  for (let i = 0; i < n; i++) {
    const xv = daten.x[i]!, mv = daten.m[i]!, yv = daten.y[i]!;
    const [ab, st] = ausSummen([n - 1, voll[1] - xv, voll[2] - mv, voll[3] - yv, voll[4] - xv * xv, voll[5] - xv * mv, voll[6] - xv * yv, voll[7] - mv * mv, voll[8] - mv * yv, voll[9] - yv * yv]);
    L.push((n - 1) * (t0 - ab)); LStd.push((n - 1) * (s0 - st));
  }
  return { t0, s0, L, LStd };
}

/** Der Lauf ohne Oberfläche (Tests, Werkzeuge): `ab` und `abStd` ohne ungültige Ziehungen. */
export class Bootstrap {
  private readonly z: ReturnType<typeof mediationZiehung>;
  constructor(x: number[], m: number[], y: number[], startwert = STARTWERT, B = ZIEHUNGEN) { this.z = mediationZiehung({ x, m, y }, startwert, B); }
  weiter(anzahl: number) { this.z.ziehung.weiter(anzahl); }
  get ab() { return this.z.ziehung.t.filter(Number.isFinite); }
  get abStd() { return this.z.abStd.filter(Number.isFinite); }
  get ungueltig() { return this.z.ziehung.t.length - this.ab.length; }
}
const mittel = (a: number[]) => a.reduce((s, v) => s + v, 0) / a.length;
const sd = (a: number[]) => { const m = mittel(a); return Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / (a.length - 1)); };

/**
 * Pfade aus der PSPP-Ausgabe (drei Läufe von `mediationBefehl`), Bootstrap aus den Rohdaten der vollständigen Fälle.
 * `fortschritt(0..1)` wird nach jedem Häppchen gerufen; zwischen den Häppchen gibt die Funktion die Oberfläche frei.
 */
export async function mediation(items: OutputItem[], x: string, m: string, y: string, daten: { x: number[]; m: number[]; y: number[] }, gesamt: number,
  fortschritt?: (anteil: number) => void, ziehungen = ZIEHUNGEN, startwert = STARTWERT, art: BootArt = 'perzentil'): Promise<Mediation> {
  const ms = regressionsModelle(items);
  if (ms.length !== 3) throw new Error(T('Drei Regressionen erwartet', 'Three regressions expected'));
  const [mA, mB, mC] = ms as [typeof ms[0], typeof ms[0], typeof ms[0]];
  const { ziehung, abStd: stdT } = mediationZiehung(daten, startwert, ziehungen);
  const haeppchen = 250;
  for (let fertig = 0; fertig < ziehungen; fertig += haeppchen) {
    ziehung.weiter(Math.min(haeppchen, ziehungen - fertig));
    fortschritt?.(Math.min(1, (fertig + haeppchen) / ziehungen));
    if (fertig + haeppchen < ziehungen) await new Promise(r => setTimeout(r, 0));
  }
  const gueltigAb = ziehung.t.filter(Number.isFinite);
  if (gueltigAb.length < ziehungen * 0.5) throw new Error(T('Bootstrap nicht möglich', 'Bootstrap not possible'));
  const a = pfad(mA.terme[0]!), b = pfad(mB.terme[1]!), direkt = pfad(mB.terme[0]!), total = pfad(mC.terme[0]!);
  const ab = a.b * b.b, sdX = sd(daten.x), sdY = sd(daten.y);
  const anteilRoh = ab / total.b;
  // Beide Arten aus denselben Ziehungen; BCa braucht den Jackknife (geschlossen aus Summen). Lässt sich BCa nicht berechnen, steht das Perzentil-Intervall da und die Warnung sagt es.
  const jk = art === 'bca' ? mediationJackknife(daten) : null;
  const iv = (t: number[], t0: number, L?: number[]) => intervall(t, t0, art, 0.95, L);
  let ivAb = iv(ziehung.t, ziehung.t0, jk?.L), ivStd = iv(stdT, jk ? jk.s0 : ab * sdX / sdY, jk?.LStd);
  let effektiv: BootArt = art;
  if (art === 'bca' && (ivAb.lo === null || ivStd.lo === null)) {
    effektiv = 'perzentil';
    const warn = [...new Set([...ivAb.warnungen, ...ivStd.warnungen])];
    ivAb = { ...intervall(ziehung.t, ziehung.t0, 'perzentil', 0.95), warnungen: warn }; ivStd = intervall(stdT, ab * sdX / sdY, 'perzentil', 0.95);
  }
  const warnungen = [...new Set([...ivAb.warnungen, ...ivStd.warnungen])];
  return {
    art: 'mediation', x, m, y, n: mB.n, gesamt, a, b, direkt, total, r2M: mA.r2, r2Y: mB.r2, dfM: mA.df2, dfY: mB.df2,
    ab, abLo: ivAb.lo!, abHi: ivAb.hi!, abSe: sd(gueltigAb),
    abStd: ab * sdX / sdY, abStdLo: ivStd.lo!, abStdHi: ivStd.hi!,
    anteil: Number.isFinite(anteilRoh) && Math.abs(total.b) > 1e-9 && anteilRoh >= 0 && anteilRoh <= 1 ? anteilRoh : NaN,
    ziehungen, startwert, gueltig: gueltigAb.length,
    intervallArt: effektiv, intervallWunsch: art, bootWarnungen: warnungen, ungueltig: ziehung.t.length - gueltigAb.length, kleinN: hesterberg(mB.n)
  };
}
