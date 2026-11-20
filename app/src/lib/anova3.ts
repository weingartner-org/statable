/**
 * Dreifaktorielle Varianzanalyse A × B × C für unabhängige Gruppen (Field-Stufe 3, 05.11.2026): sieben Effekte (A, B, C, A×B, A×C, B×C, A×B×C), Quadratsummen Typ III
 * (wie R `car::Anova(lm, type = 3)` mit Summenkodierung `contr.sum`, SPSS und jamovi). Reine Rechnung auf den Rohdaten, ohne PSPP.
 *
 * Rechenweg im Zellmittelmodell: Der Effekt ist die Hypothese L·μ = 0 über die Zellmittel μ; L ist das Kronecker-Produkt je Faktor aus (Stufe j gegen letzte Stufe), wenn der
 * Faktor im Effekt steht, sonst aus dem ungewichteten Mittel über alle Stufen. Quadratsumme SS = (L·m)'(L·D·L')⁻¹(L·m) mit D = diag(1/n) - bei ungleich großen Zellen
 * genau Typ III, bei gleich großen Zellen sind alle Typen gleich. Dafür muss jede Zelle mindestens einen Fall haben (sonst Hinweis, keine Rechnung); der Fehlerterm
 * braucht mindestens eine Zelle mit zwei Fällen. Fehlerquadratsumme = Streuung innerhalb der Zellen, df = N − Zahl der Zellen.
 * Partielles η² = SS / (SS + SS_Fehler), KI über das nichtzentrale F (effektki.ts).
 * Sollwerte: docs/fachblaetter/sollwerte/field-stufe3.json (drei_faktoren, npk), Test anova3.test.ts.
 * ⚠ Von der Fachperson abzunehmen: Typ III bei ungleich großen Zellen (testet die ungewichteten Mittel der Zellen).
 */
import { eta2Bereich } from './effektki';
import { invers } from './robustse';
import { pF } from './messwiederholung';
import { tQuantil } from './verteilung';
import type { Zelle2 } from './anova2';

export type Quelle3 = 'a' | 'b' | 'c' | 'ab' | 'ac' | 'bc' | 'abc';
export const QUELLEN3: Quelle3[] = ['a', 'b', 'c', 'ab', 'ac', 'bc', 'abc'];

export interface Effekt3 { quelle: Quelle3; ss: number; df: number; f: number; p: number; etaP: number; etaPLo: number; etaPHi: number }
export interface Anova3Daten { a: string[]; b: string[]; c: string[]; y: number[]; aStufen: string[]; bStufen: string[]; cStufen: string[] }
export interface Zelle3 extends Zelle2 { c: string }
export interface Anova3 {
  art: 'anova3'; n: number;
  aStufen: string[]; bStufen: string[]; cStufen: string[];
  effekte: Effekt3[]; fehler: { ss: number; df: number; ms: number };
  zellen: Zelle3[];
  /** Ist die Dreifach-Wechselwirkung bedeutsam (p < 0,05)? Dann sind die Zweifach-Effekte je Stufe des dritten Faktors zu lesen. */
  dreifachBedeutsam: boolean;
}
export type Anova3Fehler = { fehler: 'leere-zelle'; zelle: string[] } | { fehler: 'zu-wenig-faelle' } | { fehler: 'keine-streuung' } | { fehler: 'stufen' };

const summe = (v: number[]) => v.reduce((x, y) => x + y, 0);

/** Zeilen von L für einen Effekt: je Faktor entweder (Stufe j − letzte Stufe) oder das Mittel über die Stufen; Kronecker-Produkt in der Reihenfolge der Zellen (a, b, c). */
function hypothese(stufen: number[], im: boolean[]): number[][] {
  let zeilen: number[][] = [[1]];
  stufen.forEach((k, f) => {
    const teil: number[][] = im[f]
      ? Array.from({ length: k - 1 }, (_, j) => Array.from({ length: k }, (__, q) => (q === j ? 1 : q === k - 1 ? -1 : 0)))
      : [Array.from({ length: k }, () => 1 / k)];
    zeilen = zeilen.flatMap(z => teil.map(t => z.flatMap(x => t.map(y => x * y))));
  });
  return zeilen;
}

export function anova3(d: Anova3Daten): Anova3 | Anova3Fehler {
  const [ka, kb, kc] = [d.aStufen.length, d.bStufen.length, d.cStufen.length];
  if (ka < 2 || kb < 2 || kc < 2) return { fehler: 'stufen' };
  const z = ka * kb * kc, werte: number[][] = Array.from({ length: z }, () => []);
  d.y.forEach((y, i) => {
    const ia = d.aStufen.indexOf(d.a[i]!), ib = d.bStufen.indexOf(d.b[i]!), ic = d.cStufen.indexOf(d.c[i]!);
    if (ia >= 0 && ib >= 0 && ic >= 0 && Number.isFinite(y)) werte[(ia * kb + ib) * kc + ic]!.push(y);
  });
  const n = werte.map(w => w.length), N = summe(n);
  const leer = n.findIndex(x => x === 0);
  if (leer >= 0) return { fehler: 'leere-zelle', zelle: [d.aStufen[Math.floor(leer / (kb * kc))]!, d.bStufen[Math.floor(leer / kc) % kb]!, d.cStufen[leer % kc]!] };
  const m = werte.map(w => summe(w) / w.length);
  const sse = summe(werte.map((w, i) => summe(w.map(v => (v - m[i]!) ** 2)))), dfe = N - z;
  if (dfe < 1) return { fehler: 'zu-wenig-faelle' };
  if (!(sse > 0)) return { fehler: 'keine-streuung' };
  const mse = sse / dfe;
  const im: Record<Quelle3, boolean[]> = { a: [true, false, false], b: [false, true, false], c: [false, false, true], ab: [true, true, false], ac: [true, false, true], bc: [false, true, true], abc: [true, true, true] };
  const effekte: Effekt3[] = [];
  for (const q of QUELLEN3) {
    const Lm = hypothese([ka, kb, kc], im[q]), df = Lm.length;
    const lm = Lm.map(r => summe(r.map((v, j) => v * m[j]!)));
    const S = Lm.map(r1 => Lm.map(r2 => summe(r1.map((v, j) => (v * r2[j]!) / n[j]!))));
    const Si = invers(S);
    if (!Si) return { fehler: 'leere-zelle', zelle: [] };
    let ss = 0;
    for (let i = 0; i < df; i++) for (let j = 0; j < df; j++) ss += lm[i]! * Si[i]![j]! * lm[j]!;
    const f = ss / df / mse, [lo, hi] = eta2Bereich(f, df, dfe);
    effekte.push({ quelle: q, ss, df, f, p: pF(f, df, dfe), etaP: ss / (ss + sse), etaPLo: lo, etaPHi: hi });
  }
  const zellen: Zelle3[] = werte.map((w, i) => {
    const mw = m[i]!, sd = w.length > 1 ? Math.sqrt(summe(w.map(v => (v - mw) ** 2)) / (w.length - 1)) : NaN, se = sd / Math.sqrt(w.length);
    const h = w.length > 1 ? tQuantil(0.975, w.length - 1) * se : 0;
    return { a: d.aStufen[Math.floor(i / (kb * kc))]!, b: d.bStufen[Math.floor(i / kc) % kb]!, c: d.cStufen[i % kc]!, n: w.length, mittel: mw, sd, se, lo: mw - h, hi: mw + h };
  });
  const abc = effekte[6]!;
  return { art: 'anova3', n: N, aStufen: d.aStufen, bStufen: d.bStufen, cStufen: d.cStufen, effekte, fehler: { ss: sse, df: dfe, ms: mse }, zellen, dreifachBedeutsam: abc.p < 0.05 };
}

/** Die Zellen eines Faktor-C-Niveaus als Zellen der zweifaktoriellen Darstellung (für das Interaktionsdiagramm, ein Feld je Stufe von C). */
export const zellenJeC = (e: Anova3, c: string): Zelle2[] => e.zellen.filter(z => z.c === c).map(({ a, b, n, mittel, sd, se, lo, hi }) => ({ a, b, n, mittel, sd, se, lo, hi }));
