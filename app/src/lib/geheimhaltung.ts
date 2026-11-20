/**
 * Geheimhaltung in Tabellen (Paket M2, Fachblatt docs/fachblaetter/MIKRODATEN-2026-10-24.md, Abschnitt M2). Reines TS, keine Oberfläche.
 *
 * Eingabe: Zeilen × Spalten mit UNGEWICHTETEN Fallzahlen, optional Wert und Beiträge je Zelle. Ränder (Zeilen-, Spaltensummen, Gesamt) rechnet das Modul selbst
 * und behandelt sie als Zellen: die Tabelle ist dann (R + 1) × (C + 1).
 * Primär: n < minN (Voreinstellung 3), optional Dominanzregel (n, k) und p-%-Regel. Sekundär: Hyperwürfel-Verfahren (Rechteck mit den kleinsten Kosten, deterministisch).
 * Nachweis: `schutzIntervall` rechnet je gesperrter Zelle das kleinste und größte mögliche Intervall (lineare Optimierung, eigenes Simplex; Sollwerte aus R lpSolve).
 * Alternative zum Sperren: `rundeTabelle` (konventionell auf Basis b, Ränder getrennt gerundet).
 */
import { L, Lp } from './sitzung.svelte';
import { zahlDe } from './format';

export type GeheimGrund = 'minN' | 'dominanz' | 'prozent' | 'sekundaer';
export type GeheimStatus = 'frei' | 'primaer' | 'sekundaer';

export interface GeheimEingabe {
  /** ungewichtete Fallzahlen, Zeilen × Spalten (ohne Ränder) */
  n: number[][];
  /** Wert je Zelle (Hochrechnung, Summe …), ohne Ränder; fehlt er, gilt die Summe der Beiträge, sonst die Fallzahl */
  wert?: number[][];
  /** Beiträge der Einheiten je Zelle (für Dominanz- und p-%-Regel) */
  beitraege?: number[][][];
}
export interface GeheimOptionen {
  /** Zellen mit 0 < n < minN sind primär gesperrt (3) */
  minN?: number;
  /** Dominanzregel: die `n` größten Beiträge machen mehr als `k` % des Zellwerts aus (aus; wenn an: n = 1, k = 85) */
  dominanz?: { n?: number; k?: number } | null;
  /** p-%-Regel: (Wert − x1 − x2) < p/100 · x1 (aus; wenn an: p = 10) */
  prozent?: number | null;
  /** Schutzgrad in % des Zellwerts für den Nachweis (0 = nur „nicht eindeutig“) */
  schutzgrad?: number;
  /** Untergrenze 1 für gesperrte Zellen im Nachweis (ein Angreifer weiß: gesperrt heißt n ≥ 1, denn leere Zellen werden als „-“ gezeigt).
   *  Standard: an, wenn auf Fallzahlen gerechnet wird; bei `wert` bleibt die Untergrenze 0. */
  untergrenzeEins?: boolean;
}
export interface SchutzZelle {
  zeile: number; spalte: number; wert: number; min: number; max: number; breite: number; primaer: boolean; sicher: boolean;
}
export interface GeheimErgebnis {
  zeilen: number; spalten: number;
  /** Tabelle mit Rändern: (R + 1) × (C + 1) */
  n: number[][];
  wert?: number[][];
  status: GeheimStatus[][];
  grund: (GeheimGrund | null)[][];
  gesperrt: boolean[][];
  /** Zahl der primär gesperrten Zellen / der zusätzlich gesperrten Zellen */
  primaer: number; sekundaer: number; gesamt: number;
  /** Zellen, für die kein Rechteck mit Fallzahl > 0 möglich war (Zeile, Spalte); dann ist der Schutz nicht erreicht */
  ungeschuetzt: [number, number][];
  /** Intervalle der gesperrten Zellen (primäre markiert); sie beruhen auf `wert`, sonst auf `n` */
  intervalle: SchutzZelle[];
  /** Alle primär gesperrten Zellen geschützt und keine Zeile/Spalte mit genau einer Sperrung */
  geschuetzt: boolean;
  protokoll: string[];
}

export const GEHEIM_MIN_N = 3;
export const GEHEIM_DOMINANZ_K = 85;
export const GEHEIM_PROZENT_P = 10;
const EPS = 1e-9;

/* ---------------------------------------------------------------------------------------------------------------------------- Ränder */

/** Tabelle mit Zeilensummen, Spaltensummen und Gesamtsumme. */
export function mitRaendern(m: number[][]): number[][] {
  const R = m.length, C = R ? m[0]!.length : 0;
  const aus = Array.from({ length: R + 1 }, () => new Array<number>(C + 1).fill(0));
  for (let i = 0; i < R; i++) for (let j = 0; j < C; j++) {
    const v = m[i]![j]!;
    aus[i]![j] = v; aus[i]![C] = aus[i]![C]! + v; aus[R]![j] = aus[R]![j]! + v; aus[R]![C] = aus[R]![C]! + v;
  }
  return aus;
}

function beitraegeMitRaendern(b: number[][][]): number[][][] {
  const R = b.length, C = R ? b[0]!.length : 0;
  const aus: number[][][] = Array.from({ length: R + 1 }, () => Array.from({ length: C + 1 }, () => [] as number[]));
  for (let i = 0; i < R; i++) for (let j = 0; j < C; j++) for (const x of b[i]![j]!) { aus[i]![j]!.push(x); aus[i]![C]!.push(x); aus[R]![j]!.push(x); aus[R]![C]!.push(x); }
  return aus;
}

/* ---------------------------------------------------------------------------------------------------------------------------- Primär */

function primaerGrund(n: number, wert: number | undefined, beitr: number[] | undefined, o: Required<Pick<GeheimOptionen, 'minN'>> & GeheimOptionen): GeheimGrund | null {
  if (!(n > 0)) return null;
  if (n < o.minN) return 'minN';
  if (beitr && beitr.length) {
    const sortiert = [...beitr].sort((a, b) => b - a);
    const w = wert ?? sortiert.reduce((a, v) => a + v, 0);
    if (w > 0) {
      if (o.dominanz) {
        const dn = Math.max(1, Math.floor(o.dominanz.n ?? 1)), k = o.dominanz.k ?? GEHEIM_DOMINANZ_K;
        const oben = sortiert.slice(0, dn).reduce((a, v) => a + v, 0);
        if (oben > (k / 100) * w + EPS * w) return 'dominanz';
      }
      if (o.prozent !== null && o.prozent !== undefined) {
        const x1 = sortiert[0]!, x2 = sortiert[1] ?? 0;
        if (w - x1 - x2 < (o.prozent / 100) * x1 - EPS * w) return 'prozent';
      }
    }
  }
  return null;
}

/* ---------------------------------------------------------------------------------------------------------------------------- Sekundär */

/**
 * Hyperwürfel-Verfahren für 2D mit Rändern. `g` wird verändert. Rückgabe: Zellen, die nicht geschützt werden konnten.
 * Zellen ohne Fälle (n = 0) werden nie gesperrt und kommen deshalb nicht als Ecke eines Rechtecks in Frage.
 */
function hyperwuerfel(n: number[][], g: boolean[][]): [number, number][] {
  const R = n.length, C = n[0]!.length;
  const aufgegeben = new Set<number>();
  for (;;) {
    const zs = new Array<number>(R).fill(0), ss = new Array<number>(C).fill(0);
    for (let i = 0; i < R; i++) for (let j = 0; j < C; j++) if (g[i]![j]) { zs[i]!++; ss[j]!++; }
    let wr = -1, wc = -1;
    for (let i = 0; i < R && wr < 0; i++) for (let j = 0; j < C; j++) if (g[i]![j] && !aufgegeben.has(i * C + j) && (zs[i] === 1 || ss[j] === 1)) { wr = i; wc = j; break; }
    if (wr < 0) break;
    const kosten = (i: number, j: number): number => (g[i]![j] ? 0 : n[i]![j]! > 0 ? n[i]![j]! : Infinity);
    let best = Infinity, br = -1, bc = -1;
    for (let r2 = 0; r2 < R; r2++) {
      if (r2 === wr) continue;
      for (let c2 = 0; c2 < C; c2++) {
        if (c2 === wc) continue;
        const k = kosten(wr, c2) + kosten(r2, wc) + kosten(r2, c2);
        if (k < best) { best = k; br = r2; bc = c2; }
      }
    }
    if (br < 0 || !Number.isFinite(best)) { aufgegeben.add(wr * C + wc); continue; }
    g[wr]![bc] = true; g[br]![wc] = true; g[br]![bc] = true;
  }
  // wer übrig blieb: Zellen, die noch allein in Zeile oder Spalte stehen
  const aus: [number, number][] = [];
  const zs = new Array<number>(R).fill(0), ss = new Array<number>(C).fill(0);
  for (let i = 0; i < R; i++) for (let j = 0; j < C; j++) if (g[i]![j]) { zs[i]!++; ss[j]!++; }
  for (let i = 0; i < R; i++) for (let j = 0; j < C; j++) if (g[i]![j] && (zs[i] === 1 || ss[j] === 1)) aus.push([i, j]);
  return aus;
}

/**
 * Nachsperren: Reicht das Rechteck nicht (die Zellwerte sind ≥ 0, das kann ein Intervall trotzdem auf einen Punkt oder zu eng zusammenziehen),
 * kommt für die erste ungeschützte primäre Zelle das billigste weitere Rechteck dazu; danach wieder das Hyperwürfel-Verfahren. `g` und `ungeschuetzt` werden verändert.
 */
function nachsperren(n: number[][], tab: number[][], g: boolean[][], primaer: boolean[][], grad: number, ungeschuetzt: [number, number][], untergrenze: number): void {
  const R = n.length, C = n[0]!.length, aufgegeben = new Set<number>();
  for (let runde = 0; runde < 500; runde++) {
    const iv = schutzIntervall(tab, g, primaer, grad, untergrenze);
    const schlecht = iv.find(z => z.primaer && !z.sicher && !aufgegeben.has(z.zeile * C + z.spalte));
    if (!schlecht) return;
    const r = schlecht.zeile, c = schlecht.spalte;
    const kosten = (i: number, j: number): number => (g[i]![j] ? 0 : n[i]![j]! > 0 ? n[i]![j]! : Infinity);
    let best = Infinity, br = -1, bc = -1;
    for (let r2 = 0; r2 < R; r2++) {
      if (r2 === r) continue;
      for (let c2 = 0; c2 < C; c2++) {
        if (c2 === c) continue;
        const k = kosten(r, c2) + kosten(r2, c) + kosten(r2, c2);
        if (k > 0 && k < best) { best = k; br = r2; bc = c2; }
      }
    }
    if (br < 0) { aufgegeben.add(r * C + c); if (!ungeschuetzt.some(([i, j]) => i === r && j === c)) ungeschuetzt.push([r, c]); continue; }
    g[r]![bc] = true; g[br]![c] = true; g[br]![bc] = true;
    ungeschuetzt.splice(0, ungeschuetzt.length, ...hyperwuerfel(n, g));
  }
}

/* ---------------------------------------------------------------------------------------------------------------------------- Nachweis (Simplex) */

/**
 * Kleinstes und größtes x_p unter A x = b, x ≥ 0 (Zwei-Phasen-Simplex, Regel von Bland, dichtes Tableau; reicht für Tabellen bis 30 × 30).
 * Rückgabe null, wenn nichts zulässig ist.
 */
function lpIntervalle(A: number[][], b: number[], nv: number, ziele: number[]): { min: number; max: number }[] | null {
  const m0 = A.length;
  const scale = Math.max(1, ...b.map(Math.abs));
  // Zeilen mit b < 0 umdrehen; b skalieren
  const rows = A.map((a, i) => { const s = b[i]! < 0 ? -1 : 1; return a.map(v => v * s); });
  const rhs = b.map(v => Math.abs(v) / scale);
  const na = m0, W = nv + na + 1;
  const T: Float64Array[] = rows.map((a, i) => { const t = new Float64Array(W); for (let j = 0; j < nv; j++) t[j] = a[j]!; t[nv + i] = 1; t[W - 1] = rhs[i]!; return t; });
  const basis = Array.from({ length: m0 }, (_, i) => nv + i);
  let live = m0;   // Zahl der Zeilen im Tableau (redundante werden entfernt)
  const pivot = (r: number, c: number) => {
    const pr = T[r]!, pv = pr[c]!;
    for (let j = 0; j < W; j++) pr[j] = pr[j]! / pv;
    for (let i = 0; i < live; i++) {
      if (i === r) continue;
      const t = T[i]!, f = t[c]!;
      if (f !== 0) for (let j = 0; j < W; j++) t[j] = t[j]! - f * pr[j]!;
    }
    basis[r] = c;
  };
  const lauf = (cost: Float64Array, spaltenBis: number): boolean => {
    // reduzierte Kosten d_j = c_j − Σ c_B · T[i][j]
    const dd = new Float64Array(W);
    for (let j = 0; j < W; j++) { let v = j < cost.length ? cost[j]! : 0; for (let i = 0; i < live; i++) v -= cost[basis[i]!]! * T[i]![j]!; dd[j] = v; }
    for (let it = 0; it < 50000; it++) {
      let c = -1;
      for (let j = 0; j < spaltenBis; j++) if (dd[j]! < -1e-10) { c = j; break; }
      if (c < 0) return true;
      let r = -1, bestRatio = Infinity;
      for (let i = 0; i < live; i++) {
        const a = T[i]![c]!;
        if (a > 1e-10) {
          const ratio = T[i]![W - 1]! / a;
          if (ratio < bestRatio - 1e-12 || (Math.abs(ratio - bestRatio) <= 1e-12 && basis[i]! < basis[r]!)) { bestRatio = ratio; r = i; }
        }
      }
      if (r < 0) return false;   // unbeschränkt
      pivot(r, c);
      const f = dd[c]!, pr = T[r]!;
      for (let j = 0; j < W; j++) dd[j] = dd[j]! - f * pr[j]!;
    }
    return false;
  };
  // Phase 1
  const c1 = new Float64Array(nv + na); for (let j = nv; j < nv + na; j++) c1[j] = 1;
  lauf(c1, nv + na);
  let infeas = 0; for (let i = 0; i < live; i++) if (basis[i]! >= nv) infeas += T[i]![W - 1]!;
  if (infeas > 1e-7) return null;
  // Künstliche aus der Basis holen; redundante Zeilen entfernen
  for (let i = 0; i < live; ) {
    if (basis[i]! >= nv) {
      let c = -1;
      for (let j = 0; j < nv; j++) if (Math.abs(T[i]![j]!) > 1e-9) { c = j; break; }
      if (c >= 0) { pivot(i, c); i++; } else { T.splice(i, 1); basis.splice(i, 1); live--; }
    } else i++;
  }
  const aus: { min: number; max: number }[] = [];
  const opt = (p: number, vorz: number): number => {
    const cost = new Float64Array(nv + na); cost[p] = vorz;
    // Kopie des zulässigen Tableaus
    const T0 = T.map(t => Float64Array.from(t)), b0 = basis.slice(), l0 = live;
    const ok = lauf(cost, nv);
    let v = 0; for (let i = 0; i < live; i++) v += cost[basis[i]!]! * T[i]![W - 1]!;
    for (let i = 0; i < l0; i++) T[i]!.set(T0[i]!);
    for (let i = 0; i < l0; i++) basis[i] = b0[i]!;
    live = l0;
    return ok ? v * scale : (vorz > 0 ? -Infinity : Infinity);
  };
  for (const p of ziele) aus.push({ min: opt(p, 1), max: -opt(p, -1) });
  return aus;
}

/**
 * Schutzintervall: für jede gesperrte Zelle das Intervall, in dem sich ihr Wert aus den sichtbaren Zellen und den Summen eingrenzen lässt.
 * `tabelle` ist die Tabelle MIT Rändern ((R + 1) × (C + 1), letzte Zeile und Spalte = Summen), `gesperrt` hat dieselbe Form.
 * Gleichungen: jede Zeile (ohne Randspalte) summiert sich zum Rand, jede Spalte (ohne Randzeile) ebenso; sichtbare Zellen sind fest, gesperrte ≥ 0.
 * `primaer` (gleiche Form, optional) markiert die primär gesperrten Zellen; `schutzgrad` in % des Zellwerts (0 = nur „Breite > 0“).
 * `untergrenze`: kleinster möglicher Wert einer gesperrten Zelle (0, oder 1 bei Fallzahlen).
 */
export function schutzIntervall(tabelle: number[][], gesperrt: boolean[][], primaer?: boolean[][], schutzgrad = 0, untergrenze = 0): SchutzZelle[] {
  const R1 = tabelle.length, C1 = R1 ? tabelle[0]!.length : 0;
  const idx: number[][] = Array.from({ length: R1 }, () => new Array<number>(C1).fill(-1));
  const zellen: [number, number][] = [];
  for (let i = 0; i < R1; i++) for (let j = 0; j < C1; j++) if (gesperrt[i]![j]) { idx[i]![j] = zellen.length; zellen.push([i, j]); }
  const nv = zellen.length;
  if (!nv) return [];
  const A: number[][] = [], b: number[] = [];
  const gleichung = (zellenImSatz: [number, number][], randZelle: [number, number]) => {
    // Σ Zellen − Rand = 0
    const a = new Array<number>(nv).fill(0); let rest = 0;
    const dazu = (i: number, j: number, vorz: number) => { const k = idx[i]![j]!; if (k >= 0) a[k] = a[k]! + vorz; else rest += vorz * tabelle[i]![j]!; };
    for (const [i, j] of zellenImSatz) dazu(i, j, 1);
    dazu(randZelle[0], randZelle[1], -1);
    if (a.some(v => v !== 0)) { A.push(a); b.push(-rest); }
  };
  for (let i = 0; i < R1; i++) gleichung(Array.from({ length: C1 - 1 }, (_, j) => [i, j] as [number, number]), [i, C1 - 1]);
  for (let j = 0; j < C1; j++) gleichung(Array.from({ length: R1 - 1 }, (_, i) => [i, j] as [number, number]), [R1 - 1, j]);
  // gesperrte Zelle = untergrenze + y mit y ≥ 0
  if (untergrenze !== 0) A.forEach((a, i) => { b[i] = b[i]! - untergrenze * a.reduce((s2, v) => s2 + v, 0); });
  const erg0 = A.length ? lpIntervalle(A, b, nv, zellen.map((_, k) => k)) : null;
  const erg = erg0 && erg0.map(r => ({ min: r.min + untergrenze, max: r.max + untergrenze }));
  return zellen.map(([i, j], k) => {
    const wert = tabelle[i]![j]!;
    // ohne Gleichung (oder unzulässig): nichts schränkt ein
    const mn = erg ? erg[k]!.min : untergrenze, mx = erg ? erg[k]!.max : Infinity;
    const breite = mx - mn;
    const sicher = breite > 1e-7 * Math.max(1, Math.abs(wert)) && breite + 1e-9 >= (schutzgrad / 100) * Math.abs(wert);
    return { zeile: i, spalte: j, wert, min: mn, max: mx, breite, primaer: !!primaer?.[i]?.[j], sicher };
  });
}

/* ---------------------------------------------------------------------------------------------------------------------------- Runden */

export interface RundenErgebnis {
  /** gerundete Tabelle mit Rändern (jede Zelle, auch jeder Rand, für sich gerundet) */
  tabelle: number[][];
  basis: number;
  /** Mindestens eine gerundete Summe passt nicht zu den gerundeten Zellen */
  summenAbweichend: boolean;
  hinweis: string;
}
/** Konventionell auf Basis b runden (die Hälfte der Basis wird aufgerundet); Ränder getrennt gerundet. `m` ist die Tabelle OHNE Ränder. */
export function rundeTabelle(m: number[][], basis = 3): RundenErgebnis {
  const b = basis > 0 ? basis : 3;
  const r = (x: number) => Math.floor(x / b + 0.5 + 1e-12) * b;
  const voll = mitRaendern(m), R = m.length, C = R ? m[0]!.length : 0;
  const tab = voll.map(z => z.map(r));
  let abw = false;
  for (let i = 0; i < R && !abw; i++) { let s = 0; for (let j = 0; j < C; j++) s += tab[i]![j]!; if (Math.abs(s - tab[i]![C]!) > EPS) abw = true; }
  for (let j = 0; j < C && !abw; j++) { let s = 0; for (let i = 0; i < R; i++) s += tab[i]![j]!; if (Math.abs(s - tab[R]![j]!) > EPS) abw = true; }
  { let s = 0; for (let j = 0; j < C; j++) s += tab[R]![j]!; if (Math.abs(s - tab[R]![C]!) > EPS) abw = true; }
  return { tabelle: tab, basis: b, summenAbweichend: abw, hinweis: L(`Alle Zahlen sind auf ein Vielfaches von ${b} gerundet. Summen können abweichen.`, `All numbers are rounded to a multiple of ${b}. Totals may differ.`) };
}

/* ---------------------------------------------------------------------------------------------------------------------------- Hauptfunktion */

/** Geheimhaltung rechnen. Wirft nie bei sinnvollen Eingaben; leere Tabellen geben ein leeres Ergebnis. */
export function geheimhalten(e: GeheimEingabe, opt: GeheimOptionen = {}): GeheimErgebnis {
  const o = { ...opt, minN: opt.minN ?? GEHEIM_MIN_N };
  const R = e.n.length, C = R ? e.n[0]!.length : 0;
  const n = mitRaendern(e.n);
  const beitr = e.beitraege ? beitraegeMitRaendern(e.beitraege) : undefined;
  const wert = e.wert ? mitRaendern(e.wert) : undefined;
  const protokoll: string[] = [];
  const ohneBeitraege = !beitr && (o.dominanz || (o.prozent !== null && o.prozent !== undefined));
  const status: GeheimStatus[][] = n.map(z => z.map(() => 'frei' as GeheimStatus));
  const grund: (GeheimGrund | null)[][] = n.map(z => z.map(() => null));
  const g: boolean[][] = n.map(z => z.map(() => false));
  const zaehl = { minN: 0, dominanz: 0, prozent: 0 };
  for (let i = 0; i <= R; i++) for (let j = 0; j <= C; j++) {
    const gr = primaerGrund(n[i]![j]!, wert?.[i]?.[j], beitr?.[i]?.[j], o);
    if (gr && gr !== 'sekundaer') { status[i]![j] = 'primaer'; grund[i]![j] = gr; g[i]![j] = true; zaehl[gr]++; }
  }
  const primaerMaske = g.map(z => z.slice());
  const primaer = zaehl.minN + zaehl.dominanz + zaehl.prozent;
  const ungeschuetzt = R && C ? hyperwuerfel(n, g) : [];
  let sekundaer = 0;
  for (let i = 0; i <= R; i++) for (let j = 0; j <= C; j++) if (g[i]![j] && !primaerMaske[i]![j]) { status[i]![j] = 'sekundaer'; grund[i]![j] = 'sekundaer'; sekundaer++; }
  const basisTab = wert ?? n;
  const untergrenze = !wert && (opt.untergrenzeEins ?? true) ? 1 : 0;
  if (R && C) nachsperren(n, basisTab, g, primaerMaske, o.schutzgrad ?? 0, ungeschuetzt, untergrenze);
  const intervalle = schutzIntervall(basisTab, g, primaerMaske, o.schutzgrad ?? 0, untergrenze);
  const primaerGeschuetzt = intervalle.filter(z => z.primaer).every(z => z.sicher);
  const geschuetzt = ungeschuetzt.length === 0 && primaerGeschuetzt;

  // Protokoll
  if (!R || !C) protokoll.push(L('Die Tabelle ist leer.', 'The table is empty.'));
  else {
    if (primaer === 0) protokoll.push(L(`Keine Zelle ist zu klein: überall mindestens ${o.minN} Fälle oder gar keiner.`, `No cell is too small: every cell has at least ${o.minN} cases or none.`));
    else {
      const teile: string[] = [];
      if (zaehl.minN) teile.push(Lp(zaehl.minN, `${zaehl.minN} Zelle mit weniger als ${o.minN} Fällen`, `${zaehl.minN} Zellen mit weniger als ${o.minN} Fällen`, `${zaehl.minN} cell with fewer than ${o.minN} cases`, `${zaehl.minN} cells with fewer than ${o.minN} cases`));
      if (zaehl.dominanz) { const k = o.dominanz?.k ?? GEHEIM_DOMINANZ_K, dn = o.dominanz?.n ?? 1; teile.push(dn === 1
        ? Lp(zaehl.dominanz, `${zaehl.dominanz} Zelle, in der ein Beitrag mehr als ${zahlDe(k, 0)} % ausmacht`, `${zaehl.dominanz} Zellen, in denen ein Beitrag mehr als ${zahlDe(k, 0)} % ausmacht`, `${zaehl.dominanz} cell where one contribution makes up more than ${zahlDe(k, 0)}%`, `${zaehl.dominanz} cells where one contribution makes up more than ${zahlDe(k, 0)}%`)
        : Lp(zaehl.dominanz, `${zaehl.dominanz} Zelle, in der ${dn} Beiträge mehr als ${zahlDe(k, 0)} % ausmachen`, `${zaehl.dominanz} Zellen, in denen ${dn} Beiträge mehr als ${zahlDe(k, 0)} % ausmachen`, `${zaehl.dominanz} cell where ${dn} contributions make up more than ${zahlDe(k, 0)}%`, `${zaehl.dominanz} cells where ${dn} contributions make up more than ${zahlDe(k, 0)}%`)); }
      if (zaehl.prozent) teile.push(Lp(zaehl.prozent, `${zaehl.prozent} Zelle nach der p-%-Regel (p = ${zahlDe(o.prozent ?? GEHEIM_PROZENT_P, 0)})`, `${zaehl.prozent} Zellen nach der p-%-Regel (p = ${zahlDe(o.prozent ?? GEHEIM_PROZENT_P, 0)})`, `${zaehl.prozent} cell under the p% rule (p = ${zahlDe(o.prozent ?? GEHEIM_PROZENT_P, 0)})`, `${zaehl.prozent} cells under the p% rule (p = ${zahlDe(o.prozent ?? GEHEIM_PROZENT_P, 0)})`));
      protokoll.push(L(`Gesperrt, weil sie Einzelne verraten könnten: ${teile.join('; ')}.`, `Suppressed because they could reveal individuals: ${teile.join('; ')}.`));
    }
    if (sekundaer > 0) protokoll.push(Lp(sekundaer, `Zusätzlich gesperrt wurde ${sekundaer} Zelle, damit man gesperrte Zahlen nicht aus den Summen ausrechnen kann.`, `Zusätzlich gesperrt wurden ${sekundaer} Zellen, damit man gesperrte Zahlen nicht aus den Summen ausrechnen kann.`, `${sekundaer} further cell was suppressed so that suppressed numbers cannot be calculated from the totals.`, `${sekundaer} further cells were suppressed so that suppressed numbers cannot be calculated from the totals.`));
    if (ungeschuetzt.length) protokoll.push(L(`Nicht für alle gesperrten Zellen war eine zweite Sperrung möglich (leere Zellen werden nie gesperrt). ${Lp(ungeschuetzt.length, '1 Zelle bleibt', `${ungeschuetzt.length} Zellen bleiben`, '1 cell remains', `${ungeschuetzt.length} cells remain`)} ungeschützt.`, `A second suppression was not possible for every suppressed cell (empty cells are never suppressed). ${Lp(ungeschuetzt.length, '1 Zelle bleibt', `${ungeschuetzt.length} Zellen bleiben`, '1 cell remains', `${ungeschuetzt.length} cells remain`)} unprotected.`));
    if (intervalle.length) protokoll.push(geschuetzt
      ? L('Geprüft: Keine gesperrte Zahl lässt sich aus den sichtbaren Zahlen und den Summen genau ausrechnen.', 'Checked: no suppressed number can be calculated exactly from the visible numbers and the totals.')
      : L('Achtung: Mindestens eine gesperrte Zahl lässt sich aus den sichtbaren Zahlen und den Summen noch genau oder zu eng eingrenzen.', 'Warning: at least one suppressed number can still be calculated exactly, or narrowed too closely, from the visible numbers and the totals.'));
    if (ohneBeitraege) protokoll.push(L('Dominanz- und p-%-Regel brauchen die Beiträge je Zelle; ohne sie wurden nur die kleinen Fallzahlen geprüft.', 'The dominance and p% rules need the contributions per cell; without them only small case counts were checked.'));
  }
  return { zeilen: R, spalten: C, n, wert, status, grund, gesperrt: g, primaer, sekundaer, gesamt: primaer + sekundaer, ungeschuetzt, intervalle, geschuetzt, protokoll };
}
