/**
 * Mantel-Haenszel mit Schichtvariable (Später, Welle S-B, M3): Fachblatt docs/fachblaetter/SPAETER-B-OPTIONEN.md, Abschnitt 2 mit „Entscheidungen Opus“ und „Belege IBM“.
 * PSPP kann nichts davon (nur „Linear-by-Linear Association“, Schichten einzeln): Statable rechnet in JavaScript aus den Zellzahlen je Schicht.
 *
 *  - CMH-Test (Mantel & Haenszel 1959): χ² = (|Δ| − c)² / ΣV, Δ = Σ(a − E), V mit n²(n − 1). Stetigkeitskorrektur c = 0,5 als Voreinstellung (umschaltbar), nach R-Regel nur bei |Δ| ≥ 0,5
 *    (SPSS zieht die 0,5 immer ab; Entscheidung Opus: R-Regel, weil sonst χ² bei 0 < |Δ| < 0,5 größer würde als ohne Korrektur).
 *  - Gemeinsames Odds Ratio OR_MH = Σ(ad/n) / Σ(bc/n), KI nach Robins, Breslow & Greenland (1986); keine Haldane-Korrektur (Nullzellen bleiben definiert, nur Σbc = 0 oder Σad = 0 nicht).
 *  - Homogenität: Breslow-Day mit dem MH-Schätzer, dazu Tarone (1985). Keine Woolf-Homogenität, kein exakter bedingter Test.
 *  - Verallgemeinerter CMH (Landis, Heyman & Koch 1978) für I×J×K: df = (I − 1)(J − 1).
 * Keine Oberfläche; `mhHinweisText` liefert ganze Sätze.
 */
import { chiQuadratP } from './verteilung';
import { L, d } from './sitzung.svelte';

/** Zeile 1 = Gruppe 1, Spalte 1 = Ereignis; OR = a·d/(b·c). */
export type Schicht = number[][];
export const MH_MAX_SCHICHTEN = 20;
const Z = 1.959963984540054;

export type MhHinweis = 'schicht-ein-fall' | 'duenne-schichten' | 'bd-warnung' | 'eine-schicht' | 'keine-varianz' | 'kein-or';
export interface MhOr { or: number; lo: number; hi: number }
export interface MhErgebnis {
  fehler: null | 'keine-schicht' | 'zu-viele-schichten';
  k: number; n: number;
  schichten: { n: number; or: number | null; lo: number | null; hi: number | null }[];
  unbereinigt: MhOr | null;
  delta: number; varianz: number;
  cmh: { chi2: number | null; p: number | null; df: 1; korrigiert: boolean };
  orMH: (MhOr & { seLn: number }) | null;
  breslowDay: { chi2: number; df: number; p: number | null; schichten: number } | null;
  tarone: { chi2: number; df: number; p: number | null; schichten: number } | null;
  schichtenMitEinemFall: number[];
  hinweise: MhHinweis[];
}

const zellen = (t: Schicht): [number, number, number, number] => [t[0]?.[0] ?? 0, t[0]?.[1] ?? 0, t[1]?.[0] ?? 0, t[1]?.[1] ?? 0];
/** OR mit Woolf-Intervall; `null`, sobald eine Zelle 0 ist (keine Haldane-Korrektur). */
function woolf(a: number, b: number, c: number, d: number): MhOr | null {
  if (a <= 0 || b <= 0 || c <= 0 || d <= 0) return null;
  const l = Math.log((a * d) / (b * c)), se = Math.sqrt(1 / a + 1 / b + 1 / c + 1 / d);
  return { or: Math.exp(l), lo: Math.exp(l - Z * se), hi: Math.exp(l + Z * se) };
}
const leer = (fehler: MhErgebnis['fehler'], k: number): MhErgebnis => ({
  fehler, k, n: 0, schichten: [], unbereinigt: null, delta: 0, varianz: 0, cmh: { chi2: null, p: null, df: 1, korrigiert: false }, orMH: null, breslowDay: null, tarone: null, schichtenMitEinemFall: [], hinweise: []
});

/** Die Schätzzelle ã der Breslow-Day-Rechnung: Lösung von ã(n − n1 − m1 + ã) / ((n1 − ã)(m1 − ã)) = OR im zulässigen Bereich; `null`, wenn es keine gibt. */
function schaetzzelle(n: number, n1: number, m1: number, or: number): number | null {
  const lo = Math.max(0, n1 + m1 - n), hi = Math.min(n1, m1);
  if (!(hi > lo)) return null;
  let x: number;
  if (Math.abs(or - 1) < 1e-12) x = (n1 * m1) / n;
  else {
    const qa = 1 - or, qb = n - n1 - m1 + or * (n1 + m1), qc = -or * n1 * m1, disk = qb * qb - 4 * qa * qc;
    if (disk < 0) return null;
    const w = Math.sqrt(disk), kand = [(-qb + w) / (2 * qa), (-qb - w) / (2 * qa)].filter(v => v >= lo - 1e-9 && v <= hi + 1e-9);
    if (!kand.length) return null;
    x = kand[0]!;
  }
  return x;
}

/** Mantel-Haenszel über 2×2-Tabellen je Schicht. `opt.korrektur` (Voreinstellung wahr): Stetigkeitskorrektur des CMH-Tests nach R-Regel. */
export function mantelHaenszel(schichten: Schicht[], opt: { korrektur?: boolean } = {}): MhErgebnis {
  const k = schichten.length;
  if (k === 0) return leer('keine-schicht', 0);
  if (k > MH_MAX_SCHICHTEN) return leer('zu-viele-schichten', k);
  const korrektur = opt.korrektur !== false;
  const z = schichten.map(zellen), ns = z.map(([a, b, c, d]) => a + b + c + d);
  const gesamt = ns.reduce((a, b) => a + b, 0);
  const proSchicht = z.map(([a, b, c, d]) => { const w = woolf(a, b, c, d); return { n: a + b + c + d, or: w ? w.or : null, lo: w ? w.lo : null, hi: w ? w.hi : null }; });
  const summe: [number, number, number, number] = [0, 0, 0, 0];
  for (const t of z) for (let i = 0; i < 4; i++) summe[i]! += t[i]!;
  const unbereinigt = woolf(...summe);

  // Δ und ΣV (Schichten mit n < 2 tragen nichts bei, ebenso Schichten mit leerem Rand: E und V sind dann 0)
  let delta = 0, varianz = 0, R = 0, S = 0;
  z.forEach(([a, b, c, d], i) => {
    const n = ns[i]!;
    if (n < 1) return;
    R += (a * d) / n; S += (b * c) / n;
    if (n < 2) return;
    const n1 = a + b, n2 = c + d, m1 = a + c, m2 = b + d;
    delta += a - (n1 * m1) / n;
    varianz += (n1 * n2 * m1 * m2) / (n * n * (n - 1));
  });
  let cmh: MhErgebnis['cmh'];
  if (!(varianz > 0)) cmh = { chi2: null, p: null, df: 1, korrigiert: false };
  else {
    const c = korrektur && Math.abs(delta) >= 0.5 ? 0.5 : 0, chi2 = (Math.abs(delta) - c) ** 2 / varianz;
    cmh = { chi2, p: chiQuadratP(chi2, 1), df: 1, korrigiert: c === 0.5 };
  }

  // gemeinsames OR
  let orMH: MhErgebnis['orMH'] = null;
  if (R > 0 && S > 0) {
    let sPR = 0, sPSQR = 0, sQS = 0;
    z.forEach(([a, b, c, d], i) => {
      const n = ns[i]!; if (n < 1) return;
      const P = (a + d) / n, Q = (b + c) / n, r = (a * d) / n, s = (b * c) / n;
      sPR += P * r; sPSQR += P * s + Q * r; sQS += Q * s;
    });
    const varLn = sPR / (2 * R * R) + sPSQR / (2 * R * S) + sQS / (2 * S * S), seLn = Math.sqrt(varLn), or = R / S;
    orMH = { or, lo: Math.exp(Math.log(or) - Z * seLn), hi: Math.exp(Math.log(or) + Z * seLn), seLn };
  }

  // Breslow-Day und Tarone mit dem MH-OR
  let breslowDay: MhErgebnis['breslowDay'] = null, tarone: MhErgebnis['tarone'] = null;
  if (orMH) {
    let bd = 0, anzahl = 0, sumDiff = 0, sumVar = 0;
    z.forEach(([a, b, c, d], i) => {
      const n = ns[i]!, n1 = a + b, n2 = c + d, m1 = a + c, m2 = b + d;
      if (n1 <= 0 || n2 <= 0 || m1 <= 0 || m2 <= 0) return;
      const at = schaetzzelle(n, n1, m1, orMH.or); if (at === null) return;
      const zb = n1 - at, zc = m1 - at, zd = n - n1 - m1 + at;
      if (!(at > 0 && zb > 0 && zc > 0 && zd > 0)) return;
      const v = 1 / (1 / at + 1 / zb + 1 / zc + 1 / zd);
      bd += (a - at) ** 2 / v; sumDiff += a - at; sumVar += v; anzahl++;
    });
    if (anzahl >= 2) {
      const df = anzahl - 1, tar = bd - (sumDiff * sumDiff) / sumVar;
      breslowDay = { chi2: bd, df, p: chiQuadratP(bd, df), schichten: anzahl };
      tarone = { chi2: tar, df, p: chiQuadratP(tar, df), schichten: anzahl };
    }
  }

  const einFall = ns.map((n, i) => (n === 1 ? i : -1)).filter(i => i >= 0);
  const hinweise: MhHinweis[] = [];
  if (einFall.length) hinweise.push('schicht-ein-fall');
  if (ns.filter(n => n < 10).length / k >= 0.2) hinweise.push('duenne-schichten');
  if (tarone && tarone.p !== null && tarone.p < 0.05) hinweise.push('bd-warnung');
  if (k === 1) hinweise.push('eine-schicht');
  if (!(varianz > 0)) hinweise.push('keine-varianz');
  if (!orMH) hinweise.push('kein-or');
  return { fehler: null, k, n: gesamt, schichten: proSchicht, unbereinigt, delta, varianz, cmh, orMH, breslowDay, tarone, schichtenMitEinemFall: einFall, hinweise };
}

/** Matrix mal Vektor-Lösung: löst A x = b (Gauss mit Spaltenwahl); `null`, wenn A nicht umkehrbar ist. */
function loese(A: number[][], b: number[]): number[] | null {
  const m = A.length, M = A.map((z, i) => [...z, b[i]!]);
  for (let s = 0; s < m; s++) {
    let p = s; for (let i = s + 1; i < m; i++) if (Math.abs(M[i]![s]!) > Math.abs(M[p]![s]!)) p = i;
    if (Math.abs(M[p]![s]!) < 1e-12) return null;
    [M[s], M[p]] = [M[p]!, M[s]!];
    for (let i = s + 1; i < m; i++) { const f = M[i]![s]! / M[s]![s]!; for (let j = s; j <= m; j++) M[i]![j]! -= f * M[s]![j]!; }
  }
  const x = Array<number>(m).fill(0);
  for (let i = m - 1; i >= 0; i--) { let t = M[i]![m]!; for (let j = i + 1; j < m; j++) t -= M[i]![j]! * x[j]!; x[i] = t / M[i]![i]!; }
  return x;
}

/** Verallgemeinerter CMH-Test (allgemeiner Zusammenhang) für I×J×K nach Landis, Heyman & Koch (1978). Schichten mit n < 2 gehen nicht ein; Zeilen und Spalten ohne Fälle in allen Schichten entfallen.
 *  `null`, wenn nichts zu rechnen bleibt (weniger als zwei Zeilen oder Spalten) oder ΣV nicht umkehrbar ist. */
export function verallgemeinerterCmh(schichten: number[][][]): { chi2: number; df: number; p: number } | null {
  const ok = schichten.filter(t => t.reduce((a, r) => a + r.reduce((x, y) => x + y, 0), 0) >= 2);
  if (!ok.length) return null;
  const I0 = Math.max(...ok.map(t => t.length)), J0 = Math.max(...ok.map(t => Math.max(...t.map(r => r.length))));
  const zeileSumme = Array(I0).fill(0), spalteSumme = Array(J0).fill(0);
  for (const t of ok) t.forEach((r, i) => r.forEach((v, j) => { zeileSumme[i] += v; spalteSumme[j] += v; }));
  const zi = zeileSumme.map((v, i) => (v > 0 ? i : -1)).filter(i => i >= 0), sj = spalteSumme.map((v, j) => (v > 0 ? j : -1)).filter(j => j >= 0);
  const I = zi.length, J = sj.length;
  if (I < 2 || J < 2) return null;
  const dim = (I - 1) * (J - 1);
  const delta = Array(dim).fill(0), V: number[][] = Array.from({ length: dim }, () => Array(dim).fill(0));
  for (const t of ok) {
    const x = zi.map(i => sj.map(j => t[i]?.[j] ?? 0)), r = x.map(z => z.reduce((a, b) => a + b, 0)), c = sj.map((_, j) => x.reduce((a, z) => a + z[j]!, 0)), n = r.reduce((a, b) => a + b, 0);
    if (n < 2) continue;
    // Spaltenweise: Index = j·(I − 1) + i, i < I − 1, j < J − 1
    for (let j = 0; j < J - 1; j++) for (let i = 0; i < I - 1; i++) delta[j * (I - 1) + i] += x[i]![j]! - (r[i]! * c[j]!) / n;
    const Ar = (i: number, i2: number) => (i === i2 ? n * r[i]! : 0) - r[i]! * r[i2]!, Ac = (j: number, j2: number) => (j === j2 ? n * c[j]! : 0) - c[j]! * c[j2]!;
    const f = 1 / (n * n * (n - 1));
    for (let j = 0; j < J - 1; j++) for (let i = 0; i < I - 1; i++) for (let j2 = 0; j2 < J - 1; j2++) for (let i2 = 0; i2 < I - 1; i2++) V[j * (I - 1) + i]![j2 * (I - 1) + i2]! += f * Ac(j, j2) * Ar(i, i2);
  }
  const x = loese(V, delta); if (!x) return null;
  const chi2 = delta.reduce((a, d, i) => a + d * x[i]!, 0);
  if (!Number.isFinite(chi2)) return null;
  return { chi2, df: dim, p: chiQuadratP(chi2, dim) };
}

/** Ganze Sätze zu den Hinweisen. `namen`: bei 'schicht-ein-fall' die Namen der betroffenen Schichten. */
export function mhHinweisText(code: MhHinweis, namen: string[] = []): string {
  switch (code) {
    case 'schicht-ein-fall': {
      const n = namen.map(x => `‹${x}›`).join(', ');
      return namen.length === 1
        ? L(`Schicht ${n} hat nur einen Fall und geht nicht ein.`, `Stratum ${n} has only one case and is not included.`)
        : L(`Die Schichten ${n || '‹?›'} haben nur einen Fall und gehen nicht ein.`, `The strata ${n || '‹?›'} have only one case each and are not included.`);
    }
    case 'duenne-schichten': return L('Mindestens jede fünfte Schicht hat weniger als 10 Fälle. Bei so dünnen Schichten ist der Breslow-Day-Test nicht verlässlich.', 'At least one stratum in five has fewer than 10 cases. With such thin strata the Breslow-Day test is not reliable.');
    case 'bd-warnung': return d('Die Odds Ratios der Schichten unterscheiden sich (Breslow-Day-Test mit Tarone-Korrektur, p unter ,05): Das gemeinsame Odds Ratio fasst sie nur grob zusammen. Schau dir die Schichten einzeln an.', 'Die Odds Ratios der Schichten unterscheiden sich (Breslow-Day-Test mit Tarone-Korrektur, p unter ,05): Das gemeinsame Odds Ratio fasst sie nur grob zusammen. Sehen Sie sich die Schichten einzeln an.', 'The odds ratios of the strata differ (Breslow-Day test with Tarone correction, p below .05): the common odds ratio summarizes them only roughly. Look at the strata one by one.');
    case 'eine-schicht': return L('Es gibt nur eine Schicht: Einen Vergleich der Schichten gibt es nicht.', 'There is only one stratum: there is no comparison of strata.');
    case 'keine-varianz': return L('In keiner Schicht gibt es genug Streuung (jede hat eine leere Zeile oder Spalte oder nur einen Fall): Der Test lässt sich nicht berechnen.', 'No stratum has enough variation (each has an empty row or column or only one case): the test cannot be calculated.');
    case 'kein-or': return L('Es ist kein gemeinsames Odds Ratio schätzbar (die Summe der Kreuzprodukte ad/n oder bc/n ist 0).', 'No common odds ratio can be estimated (the sum of the cross products ad/n or bc/n is 0).');
  }
}
