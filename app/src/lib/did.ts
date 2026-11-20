/**
 * Differenz-in-Differenzen (B2 Teil 2c, 14.11.2026). Reine Rechnung, kein R.
 *   Modell (zwei Gruppen, zwei Zeiten):  y = b0 + b1·Behandelt + b2·Nachher + b3·(Behandelt·Nachher) + übrige Merkmale + Fehler.
 *   b3 ist die Differenz-in-Differenzen: (Änderung der Behandelten) − (Änderung der Vergleichsgruppe). Ohne übrige Merkmale ist b3 genau diese Differenz der vier Gruppenmittel.
 *   Standardfehler klassisch (s²·(X'X)⁻¹, s² = RSS/(n − k)) und robust HC1 (n/(n − k)); p über t(n − k).
 *   Nicht gerechnet (bewusst): Test auf gleichlaufende Trends - mit nur zwei Zeitpunkten nicht möglich; steht als Hinweis in Block und Hilfe.
 * Sollwerte: scripts/did-erwartet.R (lm mit Wechselwirkung, sandwich::vcovHC HC1, zweiter Weg über die vier Mittel), did.test.ts.
 */
import { tSchwaenze } from './verteilung';
import { invers } from './robustse';

export interface DidKoef { name: string; b: number; se: number; seRobust: number; t: number; p: number; tR: number; pR: number }
export interface DidMittel { m00: number; m01: number; m10: number; m11: number; n00: number; n01: number; n10: number; n11: number }
export interface DidErgebnis { n: number; k: number; koef: DidKoef[]; sigma: number; r2: number; mittel: DidMittel; didMittel: number }
export type DidFehler = { fehler: 'zu-wenig-faelle' | 'keine-null-eins' | 'leere-gruppe' | 'singulaer' };

const mal = (a: number[][], b: number[][]) => a.map(r => b[0]!.map((_, c) => r.reduce((s, v, j) => s + v * b[j]![c]!, 0)));
const trans = (a: number[][]) => a[0]!.map((_, c) => a.map(r => r[c]!));

/** `beh`: 1 = behandelte Gruppe, `nach`: 1 = nach der Maßnahme (beide nur 0 oder 1); `exo`: Zeilen der übrigen Merkmale (je Zeile [] erlaubt). */
export function didRechnen(y: number[], beh: number[], nach: number[], exo: number[][], exoNamen: string[], behName = 'Behandelt', nachName = 'Nachher'): DidErgebnis | DidFehler {
  const n = y.length, w = exo[0]?.length ?? 0, k = 4 + w;
  if (beh.some(v => v !== 0 && v !== 1) || nach.some(v => v !== 0 && v !== 1)) return { fehler: 'keine-null-eins' };
  const zahl = { n00: 0, n01: 0, n10: 0, n11: 0 }, summe = { m00: 0, m01: 0, m10: 0, m11: 0 };
  y.forEach((v, i) => { const g = `${beh[i]}${nach[i]}` as '00'; zahl[`n${g}`]++; summe[`m${g}`] += v; });
  if (Object.values(zahl).some(v => v === 0)) return { fehler: 'leere-gruppe' };
  if (n < k + 2) return { fehler: 'zu-wenig-faelle' };
  const mittel: DidMittel = { ...zahl, m00: summe.m00 / zahl.n00, m01: summe.m01 / zahl.n01, m10: summe.m10 / zahl.n10, m11: summe.m11 / zahl.n11 };
  const X = y.map((_, i) => [1, beh[i]!, nach[i]!, beh[i]! * nach[i]!, ...exo[i]!]);
  const inv = invers(mal(trans(X), X)); if (!inv) return { fehler: 'singulaer' };
  const xty = trans(X).map(r => r.reduce((s, v, i) => s + v * y[i]!, 0));
  const b = inv.map(r => r.reduce((s, v, j) => s + v * xty[j]!, 0));
  const e = y.map((v, i) => v - X[i]!.reduce((s, x, j) => s + x * b[j]!, 0));
  const rss = e.reduce((s, v) => s + v * v, 0), df = n - k, s2 = rss / df;
  const fl = Array.from({ length: k }, () => new Array<number>(k).fill(0));
  X.forEach((r, i) => { for (let a = 0; a < k; a++) for (let c = 0; c < k; c++) fl[a]![c]! += r[a]! * r[c]! * e[i]! * e[i]!; });
  const VR = mal(mal(inv, fl), inv).map(r => r.map(v => (v * n) / df));
  const namen = ['(Konstante)', behName, nachName, `${behName} × ${nachName}`, ...exoNamen];
  const koef: DidKoef[] = b.map((bi, i) => {
    const se = Math.sqrt(s2 * inv[i]![i]!), sr = Math.sqrt(VR[i]![i]!), t = bi / se, tr = bi / sr;
    return { name: namen[i]!, b: bi, se, seRobust: sr, t, p: 2 * tSchwaenze(Math.abs(t), df).oben, tR: tr, pR: 2 * tSchwaenze(Math.abs(tr), df).oben };
  });
  const mean = y.reduce((s, v) => s + v, 0) / n, tss = y.reduce((s, v) => s + (v - mean) ** 2, 0);
  return { n, k, koef, sigma: Math.sqrt(s2), r2: 1 - rss / tss, mittel, didMittel: (mittel.m11 - mittel.m10) - (mittel.m01 - mittel.m00) };
}
