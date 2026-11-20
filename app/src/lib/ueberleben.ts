/**
 * Kaplan-Meier (Zeit bis zum Ereignis): Produkt-Limit-Schätzer, Greenwood-Standardfehler, 95 %-Intervall wie R survfit (conf.type = "log"),
 * Median mit Intervall wie print(survfit) (survival:::survmean), Log-Rank-Test wie survdiff(rho = 0). Eigener Code, geprüft gegen R (scripts/kaplanmeier-erwartet.R).
 * ⚠ Die Fachentscheidungen (Intervallart, Mediandefinition, Log-Rank als Standardtest, Schwellen für die Hinweise) von der Fachperson abzunehmen.
 */
import { chiQuadratP } from './verteilung';
import { quantilNormal } from './einzelfall';
import { kleinste, groesste } from './menge';
import type { CoxErgebnis } from './cox';
import type { SterbetafelAnzeige } from './sterbetafel';
import type { CoxZeitErgebnis } from './coxzeit';
import type { AftErgebnis, FrailtyErgebnis } from './aft';

/** Eine Beobachtung: Gruppe (Index), Zeit, Ereignis (1) oder zensiert (0). */
export interface Beob { g: number; t: number; e: 0 | 1 }
/** Ein Zeitpunkt der Kurve (jede Zeit, zu der ein Ereignis oder eine Zensierung vorkommt). */
export interface Punkt { t: number; nRisiko: number; ereignisse: number; zensiert: number; s: number; se: number; lo: number; hi: number }
export interface MedianKi { wert: number; lo: number; hi: number }
export interface Gruppe { name: string; n: number; ereignisse: number; zensiert: number; punkte: Punkt[]; median: MedianKi; maxZeit: number }
export interface LogRank { chi2: number; df: number; p: number; beobachtet: number[]; erwartet: number[] }
export interface Paar { a: number; b: number; chi2: number; p: number; pHolm: number }
export interface Kaplan {
  zeit: string; ereignis: string; gruppe: string;
  /** Die zwei Werte der Ereignisspalte (Anzeigetexte) und welcher davon das Ereignis ist (Index 0 oder 1). */
  werte: [string, string]; ereignisIndex: 0 | 1; vorschlagGrund: string;
  /** Welcher Wert vorgeschlagen war (unabhängig von der Wahl); fehlt in älteren gespeicherten Ergebnissen. */
  vorschlagIndex?: 0 | 1;
  zeilen: number; ausgelassen: number; n: number;
  gruppen: Gruppe[]; gesamt: Gruppe;
  logrank: LogRank | null; paarweise: Paar[]; kreuzen: boolean;
  /** Zeitpunkte für die Tabellen und die Achse (gleichmäßig, bei 0 beginnend). */
  ticks: number[];
  band: boolean;
  /** Die Rohdaten (Gruppenindex, Zeit, Index des Statuswerts), damit das Ereignis umgeschaltet werden kann. */
  roh: [number, number, 0 | 1][];
  /** Die Ereignisspalte hat nur einen Wert, und alle erlebten das Ereignis (keine Zensur). `werte[0]` ist dann nur ein Platzhalter; umschalten geht nicht. */
  einWert?: boolean;
  /** Cox-Regression (Welle 7, M1), wenn unter „Weitere Wege“ Prädiktoren gewählt wurden; R rechnet sie (survival::coxph). Fehlt sonst und in alten Projektdateien. */
  cox?: CoxErgebnis;
  /** Später S-F, Teil 1: Sterbetafel (wie SPSS SURVIVAL) unter „Weitere Wege“; JS rechnet. Fehlt sonst und in alten Projektdateien. */
  sterbe?: SterbetafelAnzeige;
  /** Später S-F, Teil 2: Cox-Regression mit zeitabhängiger Größe (Tabelle in Intervall-Form); R rechnet. Fehlt sonst und in alten Projektdateien. */
  coxZeit?: CoxZeitErgebnis;
  /** Später S-F2: AFT-Modell (Zeitverhältnis, survreg) neben der Cox-Regression; R rechnet. Fehlt sonst und in alten Projektdateien. */
  aft?: AftErgebnis;
  /** Später S-F2: Cox-Regression mit Kennung (cluster() oder Gamma-Frailty); R rechnet. Fehlt sonst und in alten Projektdateien. */
  frailty?: FrailtyErgebnis;
}

export const KI_NIVEAU = 0.95;
const TOL = Math.sqrt(2.220446049250313e-16);

/** Kaplan-Meier einer Gruppe (Greenwood, Log-Intervall, höchstens 1). */
export function schaetze(name: string, b: { t: number; e: 0 | 1 }[], niveau = KI_NIVEAU): Gruppe {
  const z = quantilNormal(1 - (1 - niveau) / 2);
  const sortiert = [...b].sort((x, y) => x.t - y.t);
  const n = sortiert.length;
  const punkte: Punkt[] = [];
  let s = 1, gsum = 0, i = 0;
  while (i < n) {
    const t = sortiert[i]!.t;
    let d = 0, c = 0, j = i;
    while (j < n && sortiert[j]!.t === t) { if (sortiert[j]!.e) d++; else c++; j++; }
    const risiko = n - i;
    if (d > 0) { s *= 1 - d / risiko; gsum += risiko > d ? d / (risiko * (risiko - d)) : Infinity; }
    const seH = Math.sqrt(gsum);
    const dann = s > 0 && Number.isFinite(seH);
    punkte.push({ t, nRisiko: risiko, ereignisse: d, zensiert: c, s, se: dann ? s * seH : NaN, lo: dann ? s * Math.exp(-z * seH) : NaN, hi: dann ? Math.min(1, s * Math.exp(z * seH)) : NaN });
    i = j;
  }
  const ereignisse = sortiert.filter(x => x.e).length;
  return { name, n, ereignisse, zensiert: n - ereignisse, punkte, median: medianKi(punkte), maxZeit: n ? sortiert[n - 1]!.t : 0 };
}

/** Wie survival:::survmean (minmin), d. h. wie print(survfit) und summary(survfit)$table - die Zahlen, die man in R sieht:
 *  die erste Zeit, zu der die Kurve unter 0,5 liegt; liegt sie genau bei 0,5 und fällt später noch, die Mitte bis zur nächsten tieferen Stufe.
 *  (quantile.survfit weicht davon selten ab, z. B. aml gesamt obere Grenze 48 statt 45.) */
function minmin(zeiten: number[], kurve: number[]): number {
  const i0 = kurve.findIndex(v => Number.isFinite(v) && v < 0.5 + TOL);
  if (i0 < 0) return NaN;
  if (Math.abs(kurve[i0]! - 0.5) < TOL) {
    for (let i = i0 + 1; i < kurve.length; i++) if (Number.isFinite(kurve[i]!) && kurve[i]! < kurve[i0]!) return (zeiten[i0]! + zeiten[i]!) / 2;
  }
  return zeiten[i0]!;
}
/** Median der Überlebenszeit: Kurve, untere und obere Grenze fallen auf 0,5 (untere Kurve → untere Grenze). NaN = nicht erreicht. */
export function medianKi(punkte: Punkt[]): MedianKi {
  const zeiten = punkte.map(p => p.t);   // alle Zeiten der Kurve, auch Zensierungen (die letzte bestimmt das Ende wie xmax in R)
  const f = (feld: 's' | 'lo' | 'hi') => minmin(zeiten, punkte.map(p => p[feld]));
  return { wert: f('s'), lo: f('lo'), hi: f('hi') };
}

/** Überlebensfunktion, Intervall und Anzahl unter Risiko zu einem Zeitpunkt t (wie summary(survfit, times = t, extend = TRUE)). */
export function beiZeit(g: Gruppe, t: number): { s: number; se: number; lo: number; hi: number; nRisiko: number } {
  let letzter: Punkt | null = null;
  for (const p of g.punkte) { if (p.t <= t) letzter = p; else break; }
  const nRisiko = g.punkte.filter(p => p.t >= t).reduce((a, p) => a + p.ereignisse + p.zensiert, 0);
  return letzter ? { s: letzter.s, se: letzter.se, lo: letzter.lo, hi: letzter.hi, nRisiko } : { s: 1, se: 0, lo: 1, hi: 1, nRisiko };
}

/** Lineares Gleichungssystem A·x = b (Gauß mit Spaltenpivot); NaN, wenn singulär. */
function loese(A: number[][], b: number[]): number[] {
  const n = b.length, M = A.map((r, i) => [...r, b[i]!]);
  for (let c = 0; c < n; c++) {
    let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r]![c]!) > Math.abs(M[p]![c]!)) p = r;
    if (Math.abs(M[p]![c]!) < 1e-12) return b.map(() => NaN);
    [M[c], M[p]] = [M[p]!, M[c]!];
    for (let r = c + 1; r < n; r++) { const f = M[r]![c]! / M[c]![c]!; for (let k = c; k <= n; k++) M[r]![k]! -= f * M[c]![k]!; }
  }
  const x = new Array<number>(n).fill(0);
  for (let r = n - 1; r >= 0; r--) { let a = M[r]![n]!; for (let k = r + 1; k < n; k++) a -= M[r]![k]! * x[k]!; x[r] = a / M[r]![r]!; }
  return x;
}

/** Log-Rank-Test (Mantel-Cox, Gewicht 1) wie survdiff(rho = 0) für k ≥ 2 Gruppen. */
export function logrank(b: Beob[], k: number): LogRank {
  const zeiten = [...new Set(b.filter(x => x.e).map(x => x.t))].sort((x, y) => x - y);
  const beob = new Array<number>(k).fill(0), erw = new Array<number>(k).fill(0);
  const V = Array.from({ length: k }, () => new Array<number>(k).fill(0));
  for (const t of zeiten) {
    const n = new Array<number>(k).fill(0), d = new Array<number>(k).fill(0);
    for (const x of b) { if (x.t >= t) n[x.g]!++; if (x.t === t && x.e) d[x.g]!++; }
    const N = n.reduce((a, c) => a + c, 0), D = d.reduce((a, c) => a + c, 0);
    for (let i = 0; i < k; i++) { beob[i]! += d[i]!; erw[i]! += D * n[i]! / N; }
    if (N > 1) {
      const f = D * (N - D) / (N - 1) / N;   // Varianz: D (N−D)/(N−1) · n_i/N · (δ_ij − n_j/N)
      for (let i = 0; i < k; i++) for (let j = 0; j < k; j++) V[i]![j]! += f * n[i]! * ((i === j ? 1 : 0) - n[j]! / N);
    }
  }
  const m = k - 1;
  const diff = beob.slice(0, m).map((o, i) => o - erw[i]!);
  const x = loese(V.slice(0, m).map(r => r.slice(0, m)), diff);
  const chi2 = diff.reduce((a, v, i) => a + v * x[i]!, 0);
  return { chi2, df: m, p: Number.isFinite(chi2) ? chiQuadratP(chi2, m) : NaN, beobachtet: beob, erwartet: erw };
}

/** Holm-Korrektur. */
export function holm(p: number[]): number[] {
  const o = p.map((v, i) => [v, i] as const).sort((a, b) => a[0] - b[0]), out = new Array<number>(p.length);
  let m = 0;
  o.forEach(([v, i], r) => { m = Math.max(m, Math.min(1, (p.length - r) * v)); out[i] = m; });
  return out;
}

/** „Schöne“ Schritte für die Zeitachse: höchstens 8 Marken, bei 0 beginnend, bis über die größte Zeit. */
export function zeitMarken(maxZeit: number): number[] {
  if (!(maxZeit > 0)) return [0, 1];
  const roh = maxZeit / 6, mag = 10 ** Math.floor(Math.log10(roh));
  const schritt = [1, 2, 2.5, 5, 10].map(k => k * mag).find(k => k >= roh - 1e-12) ?? mag;
  const n = Math.ceil(maxZeit / schritt - 1e-9);
  return Array.from({ length: n + 1 }, (_, i) => Math.round(i * schritt * 1e9) / 1e9);
}

/** Schneiden sich zwei Kurven (die Differenz wechselt das Vorzeichen)? Dann passt der Log-Rank-Test schlecht (nicht proportionale Risiken). */
export function kurvenKreuzen(gr: Gruppe[]): boolean {
  const zeiten = [...new Set(gr.flatMap(g => g.punkte.filter(p => p.ereignisse > 0).map(p => p.t)))].sort((a, b) => a - b);
  for (let i = 0; i < gr.length; i++) for (let j = i + 1; j < gr.length; j++) {
    let vorz = 0;
    for (const t of zeiten) {
      if (t > Math.min(gr[i]!.maxZeit, gr[j]!.maxZeit)) break;
      const d = beiZeit(gr[i]!, t).s - beiZeit(gr[j]!, t).s;
      if (Math.abs(d) < 1e-9) continue;
      const v = Math.sign(d);
      if (vorz && v !== vorz) return true;
      vorz = v;
    }
  }
  return false;
}

/** Welcher der zwei Statuswerte ist das Ereignis? Aus den Bezeichnungen, sonst nach der Zahl (0/1 → 1; 1/2 → 2 wie in R survival), sonst der später sortierte.
 *  ⚠ von der Fachperson abzunehmen; Statable nennt die Wahl im Blatt und lässt sie umschalten. */
const KEIN = /\b(nicht|kein|keine|ohne|nein|no|none|zensier|censor|laufend|noch|weiter|fortgesetzt|aktiv|aktuell|aktive|bestehen|studiert|enrolled|ongoing)\w*/i;
const EREIGNIS = /(abbr|abgebrochen|ereignis|event|\bja\b|\byes\b|gestorben|tod|dead|died|dropout|drop-out|verlassen|erreicht|bestanden|erfolg|wechsel|exmatrik|ausgeschieden|eingetreten|gefunden|rückfall|rueckfall|relapse|failure|ausfall)/i;
export function schlageEreignis(werte: { schluessel: string | number; text: string }[]): { index: 0 | 1; grund: 'bezeichnung' | 'null-eins' | 'eins-zwei' | 'zahl' | 'reihenfolge' } {
  const [a, b] = werte as [typeof werte[0], typeof werte[0]];
  const ka = KEIN.test(a.text), kb = KEIN.test(b.text), ea = EREIGNIS.test(a.text), eb = EREIGNIS.test(b.text);
  if ((ea && !eb) || (kb && !ka && !eb)) return { index: 0, grund: 'bezeichnung' };
  if ((eb && !ea) || (ka && !kb && !ea)) return { index: 1, grund: 'bezeichnung' };
  const x = Number(a.schluessel), y = Number(b.schluessel);
  if (Number.isFinite(x) && Number.isFinite(y)) {
    const [lo, hi] = x < y ? [x, y] : [y, x];
    return { index: (x < y ? 1 : 0), grund: lo === 0 && hi === 1 ? 'null-eins' : lo === 1 && hi === 2 ? 'eins-zwei' : 'zahl' };
  }
  return { index: 1, grund: 'reihenfolge' };
}

/** Hat die Ereignisspalte nur einen Wert: Steht er für das Ereignis (alle erlebten es, keine Zensur - rechenbar wie R survfit) oder für zensiert
 *  (niemand erlebte es - keine Kurve)? Aus der Bezeichnung; sonst 0 = zensiert, jede andere Zahl = Ereignis (wie R Surv: nur 1 oder nur 2 heißt „alle gestorben“);
 *  Text ohne Hinweis zählt als Ereignis (`grund: 'text'` - das Blatt sagt dazu, dass es geraten ist). ⚠ von der Fachperson abzunehmen. */
export function einWertArt(w: { schluessel: string | number; text: string }): { art: 'ereignis' | 'zensiert'; grund: 'bezeichnung' | 'null' | 'zahl' | 'text' } {
  const k = KEIN.test(w.text), e = EREIGNIS.test(w.text);
  if (e && !k) return { art: 'ereignis', grund: 'bezeichnung' };
  if (k && !e) return { art: 'zensiert', grund: 'bezeichnung' };
  const x = Number(w.schluessel);
  if (typeof w.schluessel === 'number' || (w.schluessel !== '' && Number.isFinite(x))) return x === 0 ? { art: 'zensiert', grund: 'null' } : { art: 'ereignis', grund: 'zahl' };
  return { art: 'ereignis', grund: 'text' };
}

/** Alles aus den Rohdaten: Kurven je Gruppe, gesamt, Log-Rank, Paarvergleiche. */
export function kaplanAus(roh: [number, number, 0 | 1][], o: { zeit: string; ereignis: string; gruppe: string; gruppenNamen: string[]; werte: [string, string]; ereignisIndex: 0 | 1; vorschlagGrund?: string; vorschlagIndex?: 0 | 1; zeilen: number; ausgelassen: number; band?: boolean; einWert?: boolean }): Kaplan {
  const beob: Beob[] = roh.map(([g, t, w]) => ({ g, t, e: w === o.ereignisIndex ? 1 : 0 }));
  const k = o.gruppenNamen.length;
  const gruppen = o.gruppenNamen.map((nm, g) => schaetze(nm, beob.filter(x => x.g === g)));
  const gesamt = schaetze('', beob);
  const mitGruppen = k >= 2;
  const lr = mitGruppen ? logrank(beob, k) : null;
  const paarweise: Paar[] = [];
  if (k > 2) {
    for (let a = 0; a < k; a++) for (let b = a + 1; b < k; b++) {
      const sub = beob.filter(x => x.g === a || x.g === b).map(x => ({ ...x, g: x.g === a ? 0 : 1 }));
      const l = logrank(sub, 2);
      paarweise.push({ a, b, chi2: l.chi2, p: l.p, pHolm: NaN });
    }
    const adj = holm(paarweise.map(x => x.p));
    paarweise.forEach((x, i) => (x.pHolm = adj[i]!));
  }
  return {
    zeit: o.zeit, ereignis: o.ereignis, gruppe: o.gruppe, werte: o.werte, ereignisIndex: o.ereignisIndex, vorschlagGrund: o.vorschlagGrund ?? '', vorschlagIndex: o.vorschlagIndex,
    zeilen: o.zeilen, ausgelassen: o.ausgelassen, n: beob.length,
    gruppen, gesamt, logrank: lr, paarweise, kreuzen: mitGruppen ? kurvenKreuzen(gruppen) : false,
    ticks: zeitMarken(Math.max(groesste(beob.map(x => x.t)), 0)), band: o.band ?? !mitGruppen, roh,
    ...(o.einWert ? { einWert: true } : {})
  };
}
/** Dasselbe Ergebnis mit dem anderen Wert als Ereignis. */
export function kaplanMit(k: Kaplan, ereignisIndex: 0 | 1): Kaplan {
  return kaplanAus(k.roh, { zeit: k.zeit, ereignis: k.ereignis, gruppe: k.gruppe, gruppenNamen: k.gruppen.map(g => g.name), werte: k.werte, ereignisIndex, vorschlagGrund: k.vorschlagGrund, vorschlagIndex: k.vorschlagIndex, zeilen: k.zeilen, ausgelassen: k.ausgelassen, band: k.band, einWert: k.einWert });
}
