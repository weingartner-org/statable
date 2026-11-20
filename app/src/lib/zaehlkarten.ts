/**
 * Regelkarten für Zählwerte (S-I, 23.10.2026): p (Anteil fehlerhafter Stücke, Stichprobengröße darf wechseln), np (Zahl fehlerhafter Stücke, feste Größe), c (Zahl der Fehler, feste Fläche), u (Fehler je Einheit, Fläche darf wechseln).
 *   p: p̄ = Σd/Σn, Grenzen p̄ ± 3·√(p̄(1 − p̄)/nᵢ), auf [0, 1] beschnitten;  np: n·p̄ ± 3·√(n·p̄(1 − p̄));  c: c̄ ± 3·√c̄;  u: ū = Σd/Σn, Grenzen ū ± 3·√(ū/nᵢ), unten mindestens 0.
 *   Signale: ein Punkt außerhalb der Grenzen; bei festen Grenzen zusätzlich neun Punkte in Folge auf einer Seite der Mittellinie.
 * Sollwerte: R `qcc` (type p, np, c, u), siehe zaehlkarten.test.ts.
 * ⚠ Von der Fachperson abzunehmen: die Hinweise zur Mindestgröße (n·p̄ ≥ 5, c̄ ≥ 5) und die Behandlung von Punkten auf der Grenze.
 */
export type ZaehlArt = 'p' | 'np' | 'c' | 'u';
export interface Zaehlkarte {
  art: ZaehlArt; n: number;
  /** Werte, die gezeichnet werden: Anteile (p), Zahlen (np, c) oder Fehler je Einheit (u) */
  punkte: number[]; mitte: number; ucl: number[]; lcl: number[];
  aus: number[]; serie: number[];
  /** kleinste erwartete Zahl (n·p̄ bzw. c̄): unter 5 ist die Normalnäherung der Grenzen grob */
  erwartet: number;
}
export type ZaehlFehler = { fehler: 'zu-wenig' | 'zaehlwerte' | 'groessen' | 'mehr-als-groesse' | 'keine-streuung' };

export function zaehlkarte(art: ZaehlArt, d: number[], groessen: number[] = []): Zaehlkarte | ZaehlFehler {
  const m = d.length;
  if (m < 5) return { fehler: 'zu-wenig' };
  if (d.some(v => !(v >= 0) || !Number.isInteger(v))) return { fehler: 'zaehlwerte' };
  const n = art === 'c' ? d.map(() => 1) : groessen;
  if (n.length !== m || n.some(v => !(v > 0))) return { fehler: 'groessen' };
  if ((art === 'p' || art === 'np') && d.some((v, i) => v > n[i]!)) return { fehler: 'mehr-als-groesse' };
  const sd = d.reduce((a, b) => a + b, 0), sn = n.reduce((a, b) => a + b, 0);
  if (!(sd > 0) || (art !== 'c' && art !== 'u' && sd >= sn)) return { fehler: 'keine-streuung' };
  let punkte: number[], mitte: number, ucl: number[], lcl: number[], erwartet: number;
  if (art === 'p') {
    const pb = sd / sn; mitte = pb; punkte = d.map((v, i) => v / n[i]!);
    ucl = n.map(x => Math.min(1, pb + 3 * Math.sqrt((pb * (1 - pb)) / x))); lcl = n.map(x => Math.max(0, pb - 3 * Math.sqrt((pb * (1 - pb)) / x))); erwartet = Math.min(...n) * pb;
  } else if (art === 'np') {
    const nn = n[0]!, pb = sd / sn; mitte = nn * pb; punkte = d; const w = 3 * Math.sqrt(nn * pb * (1 - pb));
    ucl = d.map(() => Math.min(nn, mitte + w)); lcl = d.map(() => Math.max(0, mitte - w)); erwartet = mitte;
  } else if (art === 'c') {
    const cb = sd / m; mitte = cb; punkte = d; const w = 3 * Math.sqrt(cb); ucl = d.map(() => cb + w); lcl = d.map(() => Math.max(0, cb - w)); erwartet = cb;
  } else {
    const ub = sd / sn; mitte = ub; punkte = d.map((v, i) => v / n[i]!); ucl = n.map(x => ub + 3 * Math.sqrt(ub / x)); lcl = n.map(x => Math.max(0, ub - 3 * Math.sqrt(ub / x))); erwartet = Math.min(...n) * ub;
  }
  const aus = punkte.map((v, i) => (v > ucl[i]! || v < lcl[i]! ? i : -1)).filter(i => i >= 0);
  const fest = n.every(x => x === n[0]);
  const serie: number[] = [];
  if (fest) { let lauf = 0, seite = 0; punkte.forEach((v, i) => { const s = Math.sign(v - mitte); if (s !== 0 && s === seite) lauf++; else { lauf = s === 0 ? 0 : 1; seite = s; } if (lauf >= 9) serie.push(i); }); }
  return { art, n: m, punkte, mitte, ucl, lcl, aus, serie, erwartet };
}
