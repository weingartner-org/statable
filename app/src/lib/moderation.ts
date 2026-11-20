/**
 * Moderation X × W → Y (wie PROCESS-Modell 1 von Hayes).
 * X und W werden am Mittelwert zentriert, der Produktterm gebildet; die Regressionen rechnet PSPP (zwei Läufe: ohne und mit Wechselwirkung).
 * Die Hilfsspalten entstehen nur für die jeweilige Rechnung (TEMPORARY) - die Daten der Person bleiben unverändert.
 * Einfache Steigungen (simple slopes) von X bei W = M − 1 SD, M, M + 1 SD (bei einem Moderator mit zwei Werten: bei beiden Werten):
 *   Steigung = b_X + b_XW · (W − M);  Var = Var(b_X) + 2 (W − M) Cov(b_X, b_XW) + (W − M)² Var(b_XW),  t-Test mit n − 4 Freiheitsgraden.
 * Die Kovarianzen der B rechnet Statable selbst: σ̂²·(X′X)⁻¹ mit σ̂² = RSS/(n − 4) (PSPPs BCOV-Tabelle ist in 2.1.1 unbrauchbar, siehe regressionlesen.ts). Johnson-Neyman: Stellen, an denen |Steigung| / SE = t(.975; n − 4), als quadratische Gleichung;
 * angegeben wird nur, was im beobachteten Bereich von W liegt.
 * Geprüft gegen R (lm auf zentrierten Daten, Handrechnung): scripts/mediation-erwartet.R, Tests: moderation.test.ts.
 * ⚠ Von der Fachperson abzunehmen: Zentrierung am Mittelwert auch bei zwei Werten des Moderators, ±1 SD als Standardstellen, Satzvorlagen.
 */
import type { OutputItem } from '../engine/types';
import { regressionsModelle, type RegTerm } from './regressionlesen';
import { tQuantil, tVerteilung } from './verteilung';
import { kleinste, groesste } from './menge';
import { L as T } from './sitzung.svelte';



export interface Steigung { label: 'minus' | 'mittel' | 'plus' | 'wert'; w: number; b: number; se: number; t: number; p: number; lo: number; hi: number }
export interface JnBereich { von: number; bis: number; sig: boolean }
export interface Moderation {
  art: 'moderation'; x: string; w: string; y: string; n: number; gesamt: number;
  mx: number; mw: number; sdw: number; wMin: number; wMax: number; xMin: number; xMax: number; zwei: boolean;
  konstante: RegTerm; bx: RegTerm; bw: RegTerm; bxw: RegTerm;
  r2: number; r2Ohne: number; dr2: number; f2: number; fDr2: number; df2: number; pDr2: number;
  /** Kovarianzmatrix von (b_X, b_XW) */
  vxx: number; vxxw: number; vww: number;
  steigungen: Steigung[]; jn: JnBereich[];
}

export const mittelwert = (a: number[]) => a.reduce((s, v) => s + v, 0) / a.length;
export const streuung = (a: number[]) => { const m = mittelwert(a); return Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / (a.length - 1)); };

/** Namen der Hilfsspalten, die in den Daten nicht vorkommen. */
export function hilfsNamen(vergeben: string[]): { xz: string; wz: string; xw: string } {
  const bes = new Set(vergeben.map(n => n.toUpperCase()));
  let k = 0, namen: string[];
  do { const s = k ? String(k) : ''; namen = [`ZX_HILF${s}`, `ZW_HILF${s}`, `ZXW_HILF${s}`]; k++; } while (namen.some(n => bes.has(n)));
  return { xz: namen[0]!, wz: namen[1]!, xw: namen[2]! };
}

export function moderationBefehl(x: string, w: string, y: string, mx: number, mw: number, h: { xz: string; wz: string; xw: string }): string {
  const kopf = `TEMPORARY.\nSELECT IF (NOT MISSING(${x}) AND NOT MISSING(${w}) AND NOT MISSING(${y})).\nCOMPUTE ${h.xz} = ${x} - ${mx}.\nCOMPUTE ${h.wz} = ${w} - ${mw}.\nCOMPUTE ${h.xw} = ${h.xz} * ${h.wz}.\n`;
  return `* ${T('Hilfsspalten (am Mittelwert zentriert) gibt es nur für diese Rechnung (TEMPORARY); die Daten bleiben unverändert.', 'Helper columns (centered at the mean) exist only for this calculation (TEMPORARY); the data stay unchanged.')}\n* ${T('Modell ohne Wechselwirkung', 'Model without interaction')}\n${kopf}REGRESSION /VARIABLES=${h.xz} ${h.wz} ${y} /STATISTICS=COEFF R ANOVA CI(95) /DEPENDENT=${y} /METHOD=ENTER.\n* ${T('Modell mit Wechselwirkung (Produkt der zentrierten Spalten)', 'Model with interaction (product of the centered columns)')}\n${kopf}REGRESSION /VARIABLES=${h.xz} ${h.wz} ${h.xw} ${y} /STATISTICS=COEFF R ANOVA CI(95) /DEPENDENT=${y} /METHOD=ENTER.`;
}

export function steigungBei(e: Pick<Moderation, 'bx' | 'bxw' | 'vxx' | 'vxxw' | 'vww' | 'df2' | 'mw'>, w: number, label: Steigung['label'] = 'wert'): Steigung {
  const wc = w - e.mw, b = e.bx.b + e.bxw.b * wc, se = Math.sqrt(e.vxx + 2 * wc * e.vxxw + wc * wc * e.vww), t = b / se;
  const tk = tQuantil(0.975, e.df2);
  return { label, w, b, se, t, p: 2 * (1 - tVerteilung(Math.abs(t), e.df2)), lo: b - tk * se, hi: b + tk * se };
}

/** Johnson-Neyman: Bereiche des beobachteten W, in denen der Effekt von X signifikant ist bzw. nicht. */
export function johnsonNeyman(e: Pick<Moderation, 'bx' | 'bxw' | 'vxx' | 'vxxw' | 'vww' | 'df2' | 'mw' | 'wMin' | 'wMax'>): JnBereich[] {
  const t2 = tQuantil(0.975, e.df2) ** 2;
  const A = e.bxw.b ** 2 - t2 * e.vww, B = 2 * (e.bx.b * e.bxw.b - t2 * e.vxxw), C = e.bx.b ** 2 - t2 * e.vxx;
  let wurzeln: number[] = [];
  if (Math.abs(A) < 1e-14) { if (Math.abs(B) > 1e-14) wurzeln = [-C / B]; }
  else { const D = B * B - 4 * A * C; if (D >= 0) wurzeln = [(-B - Math.sqrt(D)) / (2 * A), (-B + Math.sqrt(D)) / (2 * A)]; }
  const lo = e.wMin - e.mw, hi = e.wMax - e.mw;
  const stellen = [lo, ...wurzeln.filter(r => r > lo && r < hi).sort((a, b) => a - b), hi];
  const sig = (wc: number) => Math.abs(e.bx.b + e.bxw.b * wc) ** 2 > t2 * (e.vxx + 2 * wc * e.vxxw + wc * wc * e.vww);
  const teile: JnBereich[] = [];
  for (let i = 0; i < stellen.length - 1; i++) {
    const s = sig((stellen[i]! + stellen[i + 1]!) / 2);
    if (teile.length && teile.at(-1)!.sig === s) teile.at(-1)!.bis = stellen[i + 1]! + e.mw;
    else teile.push({ von: stellen[i]! + e.mw, bis: stellen[i + 1]! + e.mw, sig: s });
  }
  return teile;
}

/** Kovarianzen von (b_X, b_XW) im Modell Y ~ 1 + Xz + Wz + Xz·Wz (zentriert): σ̂²·(X′X)⁻¹. */
export function kovarianzen(d: { x: number[]; w: number[]; y: number[] }): { vxx: number; vxxw: number; vww: number } {
  const n = d.x.length, mx = mittelwert(d.x), mw = mittelwert(d.w);
  const Z = d.x.map((x, i) => [1, x - mx, d.w[i]! - mw, (x - mx) * (d.w[i]! - mw)]);
  const A = Array.from({ length: 4 }, (_, r) => Array.from({ length: 4 }, (_, c) => Z.reduce((s, z) => s + z[r]! * z[c]!, 0)));
  const Zy = [0, 1, 2, 3].map(r => Z.reduce((s, z, i) => s + z[r]! * d.y[i]!, 0));
  // Gauss-Jordan: Inverse von A
  const M = A.map((z, r) => [...z, ...[0, 1, 2, 3].map(c => (r === c ? 1 : 0))]);
  for (let c = 0; c < 4; c++) {
    let p = c; for (let r = c + 1; r < 4; r++) if (Math.abs(M[r]![c]!) > Math.abs(M[p]![c]!)) p = r;
    [M[c], M[p]] = [M[p]!, M[c]!];
    const piv = M[c]![c]!; for (let k = 0; k < 8; k++) M[c]![k]! /= piv;
    for (let r = 0; r < 4; r++) if (r !== c) { const f = M[r]![c]!; for (let k = 0; k < 8; k++) M[r]![k]! -= f * M[c]![k]!; }
  }
  const inv = M.map(z => z.slice(4));
  const beta = inv.map(z => z.reduce((s, v, k) => s + v * Zy[k]!, 0));
  const rss = Z.reduce((s, z, i) => s + (d.y[i]! - z.reduce((q, v, k) => q + v * beta[k]!, 0)) ** 2, 0), s2 = rss / (n - 4);
  return { vxx: s2 * inv[1]![1]!, vxxw: s2 * inv[1]![3]!, vww: s2 * inv[3]![3]! };
}

/** Aus der PSPP-Ausgabe (zwei Läufe von `moderationBefehl`) und den Rohdaten der vollständigen Fälle. */
export function moderation(items: OutputItem[], x: string, w: string, y: string, daten: { x: number[]; w: number[]; y: number[] }, gesamt: number): Moderation {
  const ms = regressionsModelle(items);
  if (ms.length !== 2) throw new Error(T('Zwei Regressionen erwartet', 'Two regressions expected'));
  const [ohne, voll] = ms as [typeof ms[0], typeof ms[0]];
  if (voll.terme.length !== 3) throw new Error(T('Drei Terme erwartet', 'Three terms expected'));
  const mx = mittelwert(daten.x), mw = mittelwert(daten.w), sdw = streuung(daten.w);
  const wWerte = [...new Set(daten.w)].sort((a, b) => a - b), zwei = wWerte.length === 2;
  const e: Moderation = {
    art: 'moderation', x, w, y, n: voll.n, gesamt, mx, mw, sdw, wMin: Math.min(kleinste(daten.w)), wMax: Math.max(groesste(daten.w)), xMin: Math.min(kleinste(daten.x)), xMax: Math.max(groesste(daten.x)), zwei,
    konstante: voll.konstante, bx: voll.terme[0]!, bw: voll.terme[1]!, bxw: voll.terme[2]!,
    r2: voll.r2, r2Ohne: ohne.r2, dr2: voll.r2 - ohne.r2, f2: (voll.r2 - ohne.r2) / (1 - voll.r2), fDr2: 0, df2: voll.df2, pDr2: voll.terme[2]!.p,
    ...kovarianzen(daten), steigungen: [], jn: []
  };
  e.fDr2 = e.dr2 / ((1 - e.r2) / e.df2);
  e.steigungen = zwei
    ? wWerte.map(v => steigungBei(e, v))
    : [steigungBei(e, mw - sdw, 'minus'), steigungBei(e, mw, 'mittel'), steigungBei(e, mw + sdw, 'plus')];
  e.jn = zwei || !(e.wMax > e.wMin) ? [] : johnsonNeyman(e);
  return e;
}
