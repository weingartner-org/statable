/**
 * Regelkarte für Einzelwerte (I-MR) und Prozessfähigkeit (S-I, 22.10.2026). Reine Rechnung, Werte in der Reihenfolge der Zeilen.
 *   σ_innerhalb = MR̄ / d₂ mit d₂ = 1,128 (gleitende Spannweite aus zwei Werten);  Grenzen der I-Karte: x̄ ± 3·σ_innerhalb (= x̄ ± 2,66·MR̄);  obere Grenze der MR-Karte: D₄·MR̄ mit D₄ = 3,267.
 *   Signale: (1) ein Punkt außerhalb der Grenzen, (2) neun Punkte in Folge auf einer Seite der Mittellinie (Nelson 1984).
 *   Fähigkeit mit Grenzen UGW/OGW: Cp = (OGW − UGW)/(6σ_innerhalb), Cpk = min(OGW − x̄, x̄ − UGW)/(3σ_innerhalb); Pp und Ppk gleich mit der Gesamt-Standardabweichung s (n − 1).
 * Sollwerte: R `qcc` (type „xbar.one“, `process.capability`), siehe regelkarte.test.ts.
 * ⚠ Von der Fachperson abzunehmen: die Hinweise (Normalverteilung, Mindestzahl 20-25 Werte, Fähigkeit nur bei stabilem Prozess).
 */
import { lnGamma } from './verteilung';
export const D2 = 1.128, D4 = 3.267;
export interface Regel {
  n: number; mittel: number; mrMittel: number; sigmaIn: number; sigmaGes: number;
  ucl: number; lcl: number; mrUcl: number;
  /** gleitende Spannweiten (n − 1 Werte; Index i gehört zum Wert i + 1) */
  mr: number[];
  /** Positionen (0-basiert) der Signale: Regel 1 und Regel 2 */
  aus: number[]; serie: number[]; mrAus: number[];
  faehig?: Faehigkeit;
}
export interface Faehigkeit { ugw: number | null; ogw: number | null; cp: number | null; cpk: number; pp: number | null; ppk: number; ausserhalb: number }
export type RegelFehler = { fehler: 'zu-wenig-werte' | 'keine-streuung' | 'grenzen' };

export function regelkarte(werte: number[], grenzen: { ugw?: number | null; ogw?: number | null } = {}): Regel | RegelFehler {
  const x = werte.filter(Number.isFinite), n = x.length;
  if (n < 5) return { fehler: 'zu-wenig-werte' };
  const mittel = x.reduce((a, b) => a + b, 0) / n;
  const mr = x.slice(1).map((v, i) => Math.abs(v - x[i]!));
  const mrMittel = mr.reduce((a, b) => a + b, 0) / mr.length;
  const sigmaGes = Math.sqrt(x.reduce((a, v) => a + (v - mittel) ** 2, 0) / (n - 1));
  if (!(mrMittel > 0) || !(sigmaGes > 0)) return { fehler: 'keine-streuung' };
  const sigmaIn = mrMittel / D2, ucl = mittel + 3 * sigmaIn, lcl = mittel - 3 * sigmaIn, mrUcl = D4 * mrMittel;
  const aus = x.map((v, i) => (v > ucl || v < lcl ? i : -1)).filter(i => i >= 0);
  // Regel 2: neun in Folge auf derselben Seite (Punkte genau auf der Mittellinie unterbrechen die Folge); alle Punkte der Folge ab dem neunten melden
  const serie: number[] = []; let lauf = 0, seite = 0;
  x.forEach((v, i) => { const s = Math.sign(v - mittel); if (s !== 0 && s === seite) lauf++; else { lauf = s === 0 ? 0 : 1; seite = s; } if (lauf >= 9) serie.push(i); });
  const mrAus = mr.map((v, i) => (v > mrUcl ? i + 1 : -1)).filter(i => i >= 0);
  const r: Regel = { n, mittel, mrMittel, sigmaIn, sigmaGes, ucl, lcl, mrUcl, mr, aus, serie, mrAus };
  const u = grenzen.ugw ?? null, o = grenzen.ogw ?? null;
  if (u !== null || o !== null) {
    if (u !== null && o !== null && !(o > u)) return { fehler: 'grenzen' };
    const eins = (s: number) => [o !== null ? (o - mittel) / (3 * s) : Infinity, u !== null ? (mittel - u) / (3 * s) : Infinity];
    r.faehig = {
      ugw: u, ogw: o, cp: u !== null && o !== null ? (o - u) / (6 * sigmaIn) : null, cpk: Math.min(...eins(sigmaIn)),
      pp: u !== null && o !== null ? (o - u) / (6 * sigmaGes) : null, ppk: Math.min(...eins(sigmaGes)),
      ausserhalb: x.filter(v => (o !== null && v > o) || (u !== null && v < u)).length
    };
  }
  return r;
}
/** Wort zur Fähigkeit (Faustregel Cpk ≥ 1,33 fähig, 1,00 bis 1,33 bedingt, darunter nicht fähig). */
export const faehigWort = (cpk: number): 'faehig' | 'bedingt' | 'nicht' => (cpk >= 1.33 ? 'faehig' : cpk >= 1 ? 'bedingt' : 'nicht');

/**
 * Regelkarte für Untergruppen (X̄-R, S-I, 22.10.2026): Werte der Reihe nach in Untergruppen von k Werten (2 bis 10); ein unvollständiger Rest am Ende fällt weg.
 *   σ_innerhalb = R̄ / d₂(k);  X̄-Karte: x̄̄ ± 3·σ_innerhalb/√k;  R-Karte: D₃·R̄ und D₄·R̄ mit D₄ = 1 + 3·d₃/d₂, D₃ = max(0, 1 − 3·d₃/d₂) (wie R `qcc`).
 * Mit `streu = 's'` (X̄-S): σ_innerhalb = S̄/c₄(k), S-Karte B₃·S̄ und B₄·S̄ mit B₄ = 1 + 3√(1 − c₄²)/c₄ (wie R `qcc`, Standardabweichung der Untergruppen mit n − 1).
 * Fähigkeit wie bei Einzelwerten, mit σ_innerhalb aus R̄/d₂ und der Gesamt-Standardabweichung aller Werte für Pp/Ppk.
 */
// d₂ (Erwartung der Spannweite) und d₃ (ihre Standardabweichung) für Gruppengröße k, Werte aus R qcc
const D2K: Record<number, number> = { 2: 1.128, 3: 1.693, 4: 2.059, 5: 2.326, 6: 2.534, 7: 2.704, 8: 2.847, 9: 2.970, 10: 3.078 };
const D3K: Record<number, number> = { 2: 0.8525033, 3: 0.8883697, 4: 0.8798108, 5: 0.8640855, 6: 0.8480442, 7: 0.8332108, 8: 0.8198378, 9: 0.8078413, 10: 0.7970584 };
export interface RegelUG {
  k: number; gruppen: number; mittel: number; rMittel: number; sigmaIn: number; sigmaGes: number;
  xb: number[]; r: number[]; ucl: number; lcl: number; rUcl: number; rLcl: number;
  aus: number[]; serie: number[]; rAus: number[];
  faehig?: Faehigkeit;
}
/** c₄(k) = √(2/(k − 1)) · Γ(k/2) / Γ((k − 1)/2): Korrekturfaktor, damit der Mittelwert der Standardabweichungen von k Werten die Streuung erwartungstreu schätzt. */
export const c4 = (k: number) => Math.sqrt(2 / (k - 1)) * Math.exp(lnGamma(k / 2) - lnGamma((k - 1) / 2));
export function regelkarteUG(werte: number[], k: number, grenzen: { ugw?: number | null; ogw?: number | null } = {}, streu: 'r' | 's' = 'r'): RegelUG | RegelFehler {
  const x = werte.filter(Number.isFinite);
  if (!Number.isInteger(k) || k < 2 || k > 10) return { fehler: 'zu-wenig-werte' };
  const m = Math.floor(x.length / k);
  if (m < 3) return { fehler: 'zu-wenig-werte' };
  const alle = x.slice(0, m * k), gr = Array.from({ length: m }, (_, i) => alle.slice(i * k, (i + 1) * k));
  const xb = gr.map(g => g.reduce((a, b) => a + b, 0) / k);
  const sdv = (g: number[], m: number) => Math.sqrt(g.reduce((a, v) => a + (v - m) ** 2, 0) / (k - 1));
  const r = streu === 's' ? gr.map((g, i) => sdv(g, xb[i]!)) : gr.map(g => Math.max(...g) - Math.min(...g));
  const mittel = xb.reduce((a, b) => a + b, 0) / m, rMittel = r.reduce((a, b) => a + b, 0) / m;
  const gm = alle.reduce((a, b) => a + b, 0) / alle.length, sigmaGes = Math.sqrt(alle.reduce((a, v) => a + (v - gm) ** 2, 0) / (alle.length - 1));
  if (!(rMittel > 0) || !(sigmaGes > 0)) return { fehler: 'keine-streuung' };
  const d2 = D2K[k]!, d3 = D3K[k]!, sigmaIn = streu === 's' ? rMittel / c4(k) : rMittel / d2, w = (3 * sigmaIn) / Math.sqrt(k);
  const ucl = mittel + w, lcl = mittel - w, b = Math.sqrt(1 - c4(k) ** 2) / c4(k), rUcl = (streu === 's' ? 1 + 3 * b : 1 + (3 * d3) / d2) * rMittel, rLcl = Math.max(0, streu === 's' ? 1 - 3 * b : 1 - (3 * d3) / d2) * rMittel;
  const aus = xb.map((v, i) => (v > ucl || v < lcl ? i : -1)).filter(i => i >= 0);
  const serie: number[] = []; let lauf = 0, seite = 0;
  xb.forEach((v, i) => { const s = Math.sign(v - mittel); if (s !== 0 && s === seite) lauf++; else { lauf = s === 0 ? 0 : 1; seite = s; } if (lauf >= 9) serie.push(i); });
  const rAus = r.map((v, i) => (v > rUcl || v < rLcl ? i : -1)).filter(i => i >= 0);
  const res: RegelUG = { k, gruppen: m, mittel: gm, rMittel, sigmaIn, sigmaGes, xb, r, ucl, lcl, rUcl, rLcl, aus, serie, rAus };
  const u = grenzen.ugw ?? null, o = grenzen.ogw ?? null;
  if (u !== null || o !== null) {
    if (u !== null && o !== null && !(o > u)) return { fehler: 'grenzen' };
    const eins = (s: number) => [o !== null ? (o - gm) / (3 * s) : Infinity, u !== null ? (gm - u) / (3 * s) : Infinity];
    res.faehig = {
      ugw: u, ogw: o, cp: u !== null && o !== null ? (o - u) / (6 * sigmaIn) : null, cpk: Math.min(...eins(sigmaIn)),
      pp: u !== null && o !== null ? (o - u) / (6 * sigmaGes) : null, ppk: Math.min(...eins(sigmaGes)),
      ausserhalb: alle.filter(v => (o !== null && v > o) || (u !== null && v < u)).length
    };
  }
  return res;
}
