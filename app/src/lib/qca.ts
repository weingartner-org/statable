/**
 * Qualitative Vergleichsanalyse (QCA, Ragin), crisp-set und fuzzy-set, in JS (S-H, 22.10.2026). Reine Rechnung.
 *   Wahrheitstafel: je Zeile (Kombination der Bedingungen) die Mitgliedschaft jedes Falls = Minimum der Mitgliedschaften (Verneinung 1 − x); ein Fall gehört zur Zeile, wenn seine Mitgliedschaft über 0,5 liegt (n).
 *   Konsistenz (incl) = Σ min(X, Y) / Σ X, PRI = (Σ min(X, Y) − Σ min(X, Y, 1 − Y)) / (Σ X − Σ min(X, Y, 1 − Y)), Überdeckung (covS) = Σ min(X, Y) / Σ Y; Summen über alle Fälle.
 *   Ergebnis der Zeile: 1 bei n ≥ n_min und incl ≥ Grenze (und PRI ≥ PRI-Grenze), 0 bei geringerer Konsistenz, „?“ ohne Fälle oder mit zu wenigen (logischer Rest).
 *   Minimierung: Quine-McCluskey; „komplex“ ohne logische Reste, „sparsam“ mit allen „?“-Zeilen als frei verfügbar; Petrick: alle Lösungen mit der kleinsten Zahl an Primimplikanten.
 *   Notwendigkeit je Bedingung (und ihre Verneinung): Konsistenz Σ min(X, Y) / Σ Y, Überdeckung Σ min(X, Y) / Σ X, Relevanz RoN = Σ (1 − X) / Σ (1 − min(X, Y)) (Schneider und Wagemann).
 *   Eindeutige Überdeckung (covU) eines Terms = covS der Lösung − covS der Lösung ohne den Term.
 * Sollwerte: R `QCA` (truthTable, minimize mit include = "" und "?"), Daten LF (Ragin und Fiss, 18 Länder), siehe qca.test.ts.
 * ⚠ Von der Fachperson abzunehmen: Standardwerte (Konsistenz 0,8, n_min 1), Behandlung widersprüchlicher Zeilen, Zwischenlösung mit Richtungserwartungen ist NICHT gebaut, Kalibrierung der Daten nicht eingebaut.
 */
export interface QcaEingabe {
  namen: string[];
  /** Fälle × Bedingungen, Mitgliedschaften zwischen 0 und 1 */
  x: number[][];
  y: number[];
  inclGrenze: number; nMin: number; priGrenze: number;
  sparsam: boolean;
}
export interface QcaZeile { muster: number[]; out: '1' | '0' | '?'; n: number; incl: number | null; pri: number | null }
export interface QcaTerm { literale: (0 | 1 | null)[]; text: string; incl: number; pri: number; covS: number; covU: number }
export interface QcaLoesung { terme: QcaTerm[]; incl: number; pri: number; covS: number }
export interface QcaNotwendig { bedingung: number; negiert: boolean; incl: number; cov: number; ron: number }
export interface QcaErgebnis { zeilen: QcaZeile[]; loesungen: QcaLoesung[]; anzahlEinsen: number; notwendig: QcaNotwendig[] }
export type QcaFehler = { fehler: 'zu-wenig-faelle' | 'zu-viele-bedingungen' | 'zu-wenig-bedingungen' | 'werte' | 'keine-einsen' | 'keine-streuung' };

const summe = (a: number[]) => a.reduce((s, v) => s + v, 0);
/** Konsistenz, PRI, Überdeckung einer Mitgliedschaft X gegenüber dem Ergebnis Y. */
function masse(X: number[], Y: number[]) {
  const sx = summe(X), sy = summe(Y), xy = summe(X.map((v, i) => Math.min(v, Y[i]!))), xyn = summe(X.map((v, i) => Math.min(v, Y[i]!, 1 - Y[i]!)));
  return { incl: sx > 0 ? xy / sx : NaN, pri: sx - xyn > 0 ? (xy - xyn) / (sx - xyn) : NaN, cov: sy > 0 ? xy / sy : NaN };
}
const literal = (v: number, l: 0 | 1 | null) => (l === null ? 1 : l === 1 ? v : 1 - v);
const termMitgl = (x: number[][], l: (0 | 1 | null)[]) => x.map(z => Math.min(...l.map((q, j) => literal(z[j]!, q)), 1));

export function qca(e: QcaEingabe): QcaErgebnis | QcaFehler {
  const k = e.namen.length, n = e.y.length;
  if (k < 2) return { fehler: 'zu-wenig-bedingungen' };
  if (k > 8) return { fehler: 'zu-viele-bedingungen' };
  if (n < 4) return { fehler: 'zu-wenig-faelle' };
  if (e.x.some(z => z.some(v => !(v >= 0 && v <= 1))) || e.y.some(v => !(v >= 0 && v <= 1))) return { fehler: 'werte' };
  if (new Set(e.y).size < 2) return { fehler: 'keine-streuung' };
  const zeilen: QcaZeile[] = [];
  for (let r = 0; r < 2 ** k; r++) {
    const muster = Array.from({ length: k }, (_, j) => ((r >> (k - 1 - j)) & 1) as number);
    const X = termMitgl(e.x, muster as (0 | 1)[]), cnt = X.filter(v => v > 0.5).length;
    if (cnt === 0) { zeilen.push({ muster, out: '?', n: 0, incl: null, pri: null }); continue; }
    const m = masse(X, e.y);
    const ein = cnt >= e.nMin && m.incl >= e.inclGrenze - 1e-12 && (e.priGrenze <= 0 || m.pri >= e.priGrenze - 1e-12);
    zeilen.push({ muster, out: cnt < e.nMin ? '?' : ein ? '1' : '0', n: cnt, incl: m.incl, pri: m.pri });
  }
  const einsen = zeilen.filter(z => z.out === '1'), frei = e.sparsam ? zeilen.filter(z => z.out === '?') : [];
  if (!einsen.length) return { fehler: 'keine-einsen' };
  // Quine-McCluskey
  const kodiere = (m: number[]) => m.join('');
  let stufe = new Map<string, (0 | 1 | null)[]>([...einsen, ...frei].map(z => [kodiere(z.muster), z.muster as (0 | 1)[]]));
  const primes = new Map<string, (0 | 1 | null)[]>();
  while (stufe.size) {
    const naechste = new Map<string, (0 | 1 | null)[]>(), benutzt = new Set<string>(), eintraege = [...stufe.entries()];
    for (let a = 0; a < eintraege.length; a++) for (let b = a + 1; b < eintraege.length; b++) {
      const [ka, la] = eintraege[a]!, [kb, lb] = eintraege[b]!;
      let diff = -1, ok = true;
      for (let j = 0; j < k && ok; j++) if (la[j] !== lb[j]) { if (la[j] === null || lb[j] === null || diff >= 0) ok = false; else diff = j; }
      if (ok && diff >= 0) { const l = [...la]; l[diff] = null; naechste.set(l.map(v => (v === null ? '-' : v)).join(''), l); benutzt.add(ka); benutzt.add(kb); }
    }
    for (const [key, l] of eintraege) if (!benutzt.has(key)) primes.set(key.replace(/[01]/g, c => c), l.map(v => v));
    stufe = naechste;
  }
  const pis = [...primes.values()].map(l => l.map(v => (v === null ? '-' : v)).join('')).map(s => [...s].map(c => (c === '-' ? null : Number(c)) as 0 | 1 | null));
  const deckt = (p: (0 | 1 | null)[], m: number[]) => p.every((v, j) => v === null || v === m[j]);
  const deckung = pis.map(p => einsen.map((z, i) => (deckt(p, z.muster) ? i : -1)).filter(i => i >= 0)).map(a => new Set(a));
  const nuetzlich = pis.map((_, i) => i).filter(i => deckung[i]!.size > 0);
  // Petrick: Produkt der Summen (je 1-Zeile die Menge der Primimplikanten, die sie decken), mit Absorption
  let produkte: Set<number>[] = [new Set()];
  einsen.forEach((_, zi) => {
    const optionen = nuetzlich.filter(i => deckung[i]!.has(zi)), neu: Set<number>[] = [];
    for (const p of produkte) for (const o of optionen) { const q = new Set(p); q.add(o); neu.push(q); }
    const uniq = new Map(neu.map(s => [[...s].sort((a, b) => a - b).join(','), s]));
    const liste = [...uniq.values()].sort((a, b) => a.size - b.size);
    produkte = liste.filter((s, i) => !liste.slice(0, i).some(t => t.size < s.size && [...t].every(v => s.has(v))));
  });
  const minGroesse = Math.min(...produkte.map(p => p.size));
  const wahl = produkte.filter(p => p.size === minGroesse);
  const text = (l: (0 | 1 | null)[]) => l.map((v, j) => (v === null ? '' : v === 1 ? e.namen[j]! : `~${e.namen[j]!}`)).filter(Boolean).join('*');
  const loesungen: QcaLoesung[] = wahl.map(p => {
    // Reihenfolge der Terme wie in R QCA: nach dem Muster absteigend (1 vor 0 vor „nicht beteiligt“)
    const wert = (l: (0 | 1 | null)[]) => l.map(v => (v === null ? 0 : v === 1 ? 2 : 1)).join('');
    const idx = [...p].sort((a, b) => (wert(pis[b]!) > wert(pis[a]!) ? 1 : wert(pis[b]!) < wert(pis[a]!) ? -1 : 0)), Xs = idx.map(i => termMitgl(e.x, pis[i]!));
    const union = (liste: number[][]) => e.y.map((_, c) => Math.max(...liste.map(X => X[c]!)));
    const ges = masse(union(Xs), e.y);
    const terme = idx.map((i, a) => {
      const m = masse(Xs[a]!, e.y), ohne = Xs.filter((_, b) => b !== a);
      return { literale: pis[i]!, text: text(pis[i]!), incl: m.incl, pri: m.pri, covS: m.cov, covU: ohne.length ? ges.cov - masse(union(ohne), e.y).cov : m.cov };
    });
    return { terme, incl: ges.incl, pri: ges.pri, covS: ges.cov };
  }).sort((a, b) => { const sa = a.terme.map(t => t.text).join('+'), sb = b.terme.map(t => t.text).join('+'); return sa < sb ? -1 : sa > sb ? 1 : 0; });
  const notwendig = e.namen.flatMap((_, j) => [false, true].map(negiert => {
    const X = e.x.map(z => (negiert ? 1 - z[j]! : z[j]!)), xy = summe(X.map((v, i) => Math.min(v, e.y[i]!)));
    return { bedingung: j, negiert, incl: xy / summe(e.y), cov: xy / summe(X), ron: summe(X.map(v => 1 - v)) / summe(X.map((v, i) => 1 - Math.min(v, e.y[i]!))) };
  }));
  return { zeilen, loesungen, anzahlEinsen: einsen.length, notwendig };
}
