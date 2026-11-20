/**
 * Paarvergleiche nach einer Varianzanalyse (Post-hoc) und die Welch-Varianzanalyse - reine Rechnung aus n, Mittelwert und
 * Standardabweichung je Gruppe (plus MSE und Freiheitsgraden der klassischen Analyse bei Tukey und Bonferroni).
 *
 * Warum nicht PSPP `/POSTHOC`: PSPP 2.1.1 kennt zwar TUKEY und GH, aber die Zahlen stehen dann nur als Text-Tabelle in der Ausgabe;
 * aus den Kennzahlen gerechnet lässt sich die Wahl (Tukey / Games-Howell / Bonferroni) am Blatt sofort wechseln, ohne neu zu rechnen, und
 * Bericht, Word und Excel bekommen dieselben Zahlen. Die Welch-Varianzanalyse kann PSPP gar nicht.
 *
 * Vergleichswerte aus R: scripts/posthoc-erwartet.R (TukeyHSD, Games-Howell nach rstatix-Formel, oneway.test, pairwise.t.test), Tests: posthoc.test.ts.
 * Die Verteilung der studentisierten Spannweite (`ptukey`, `qtukey`) ist eine Übertragung von R nmath (Copenhaver & Holland 1988; Lund & Lund 1983).
 *
 * Standard (Abschlusstest F2, 10.10.): Games-Howell, ohne Vortest - Tukey und Bonferroni sind am Blatt wählbar. Der Levene-Test entscheidet nichts mehr:
 * Eine Wahl nach einem Vortest auf gleiche Streuung hebt die Fehlerrate bei ungleich großen Gruppen über α (Zimmerman 2004; nachgerechnet im
 * Abschlusstest: 8-9 % statt 5 %), Games-Howell hält sie auch bei gleicher Streuung (Delacre, Leys, Mora & Lakens 2019; Field 2018, Kap. 12).
 * ⚠ von der Fachperson abzunehmen: die Aussage, dass Paarvergleiche nur gezeigt werden, wenn der Gesamttest bei α = ,05 deutlich ist.
 */
import { betai, lnGamma, normal } from './verteilung';
import { dunnettKrit, dunnettLambda, dunnettP } from './dunnett';

/** Tukey, Games-Howell, Bonferroni (bis 10.10.); Field-Stufe 2 (05.11.2026): dazu Scheffé, Holm und Dunnett (alle gegen eine Kontrollgruppe). */
export type PhArt = 'tukey' | 'gh' | 'bonferroni' | 'scheffe' | 'holm' | 'dunnett';
export const PH_ARTEN: PhArt[] = ['tukey', 'gh', 'bonferroni', 'holm', 'scheffe', 'dunnett'];
export interface PhGruppe { name: string; n: number; m: number; sd: number }
/** Ein Paar: Differenz = Mittelwert von `j` minus Mittelwert von `i` (i < j, in der Reihenfolge der Gruppen; wie R). */
export interface PhPaar { i: number; j: number; diff: number; se: number; df: number; kiLo: number; kiHi: number; p: number }

/* ---------------------------------------------------------------- Studentisierte Spannweite (nach R nmath) */
const XLEG = [0.981560634246719250690549090149, 0.904117256370474856678465866119, 0.769902674194304687036893833213, 0.587317954286617447296702418941, 0.367831498998180193752691536644, 0.125233408511468915472441369464];
const ALEG = [0.047175336386511827194615961485, 0.106939325995318430960254718194, 0.160078328543346226334652529543, 0.203167426723065921749064455810, 0.233492536538354808760849898925, 0.249147045813402785000562436043];
const M_1_SQRT_2PI = 0.398942280401432677939946059934;

function wprob(w: number, rr: number, cc: number): number {
  const nleg = 12, ihalf = 6, C1 = -30, C2 = -50, C3 = 60, bb = 8, wlar = 3, wincr1 = 2, wincr2 = 3;
  const qsqz = w * 0.5;
  if (qsqz >= bb) return 1;
  let prW = 2 * normal(qsqz) - 1;
  prW = prW >= Math.exp(C2 / cc) ? Math.pow(prW, cc) : 0;
  const wincr = w > wlar ? wincr1 : wincr2;
  let blb = qsqz; const binc = (bb - qsqz) / wincr; let bub = blb + binc, einsum = 0;
  const cc1 = cc - 1;
  for (let wi = 1; wi <= wincr; wi++) {
    let elsum = 0; const a = 0.5 * (bub + blb), b = 0.5 * (bub - blb);
    for (let jj = 1; jj <= nleg; jj++) {
      let j: number, xx: number;
      if (ihalf < jj) { j = nleg - jj + 1; xx = XLEG[j - 1]!; } else { j = jj; xx = -XLEG[j - 1]!; }
      const ac = a + b * xx, qexpo = ac * ac;
      if (qexpo > C3) break;
      const pplus = 2 * normal(ac), pminus = 2 * normal(ac - w);
      let rinsum = pplus * 0.5 - pminus * 0.5;
      if (rinsum >= Math.exp(C1 / cc1)) { rinsum = ALEG[j - 1]! * Math.exp(-(0.5 * qexpo)) * Math.pow(rinsum, cc1); elsum += rinsum; }
    }
    elsum *= 2 * b * cc * M_1_SQRT_2PI;
    einsum += elsum; blb = bub; bub += binc;
  }
  prW += einsum;
  if (prW <= Math.exp(C1 / rr)) return 0;
  prW = Math.pow(prW, rr);
  return prW >= 1 ? 1 : prW;
}

const XLEGQ = [0.989400934991649932596154173450, 0.944575023073232576077988415535, 0.865631202387831743880467897712, 0.755404408355003033895101194847, 0.617876244402643748446671764049, 0.458016777657227386342419442984, 0.281603550779258913230460501460, 0.950125098376374401853193354250e-1];
const ALEGQ = [0.271524594117540948517805724560e-1, 0.622535239386478928628438369944e-1, 0.951585116824927848099251076022e-1, 0.124628971255533872052476282192, 0.149595988816576732081501730547, 0.169156519395002538189312079030, 0.182603415044923588866763667969, 0.189450610455068496285396723208];

/** P(Q ≤ q) der studentisierten Spannweite für `cc` Gruppen und `df` Freiheitsgrade (R: ptukey(q, cc, df); `rr` = 1). */
export function ptukey(q: number, cc: number, df: number, rr = 1): number {
  const nlegq = 16, ihalfq = 8, eps1 = -30, eps2 = 1e-14, dlarg = 25000;
  if (Number.isNaN(q) || Number.isNaN(cc) || Number.isNaN(df)) return NaN;
  if (q <= 0) return 0;
  if (df < 2 || rr < 1 || cc < 2) return NaN;
  if (!Number.isFinite(q)) return 1;
  if (df > dlarg) return wprob(q, rr, cc);
  const f2 = df * 0.5;
  let f2lf = f2 * Math.log(df) - df * Math.LN2 - lnGamma(f2);
  const f21 = f2 - 1, ff4 = df * 0.25;
  const ulen = df <= 100 ? 1 : df <= 800 ? 0.5 : df <= 5000 ? 0.25 : 0.125;
  f2lf += Math.log(ulen);
  let ans = 0;
  for (let i = 1; i <= 50; i++) {
    let otsum = 0; const twa1 = (2 * i - 1) * ulen;
    for (let jj = 1; jj <= nlegq; jj++) {
      let j: number, t1: number;
      if (ihalfq < jj) { j = jj - ihalfq - 1; t1 = f2lf + f21 * Math.log(twa1 + XLEGQ[j]! * ulen) - (XLEGQ[j]! * ulen + twa1) * ff4; }
      else { j = jj - 1; t1 = f2lf + f21 * Math.log(twa1 - XLEGQ[j]! * ulen) + (XLEGQ[j]! * ulen - twa1) * ff4; }
      if (t1 >= eps1) {
        const qsqz = ihalfq < jj ? q * Math.sqrt((XLEGQ[j]! * ulen + twa1) * 0.5) : q * Math.sqrt((-(XLEGQ[j]! * ulen) + twa1) * 0.5);
        otsum += wprob(qsqz, rr, cc) * ALEGQ[j]! * Math.exp(t1);
      }
    }
    if (i * ulen >= 1 && otsum <= eps2) break;
    ans += otsum;
  }
  return ans > 1 ? 1 : ans;
}

function qinv(p: number, c: number, v: number): number {
  const p0 = 0.322232421088, q0 = 0.993484626060e-01, p1 = -1, q1 = 0.588581570495, p2 = -0.342242088547, q2 = 0.531103462366;
  const p3 = -0.204231210125, q3 = 0.103537752850, p4 = -0.453642210148e-04, q4 = 0.38560700634e-02;
  const c1 = 0.8832, c2 = 0.2368, c3 = 1.214, c4 = 1.208, c5 = 1.4142, vmax = 120;
  const ps = 0.5 - 0.5 * p, yi = Math.sqrt(Math.log(1 / (ps * ps)));
  let t = yi + ((((yi * p4 + p3) * yi + p2) * yi + p1) * yi + p0) / ((((yi * q4 + q3) * yi + q2) * yi + q1) * yi + q0);
  if (v < vmax) t += (t * t * t + t) / v / 4;
  let q = c1 - c2 * t;
  if (v < vmax) q += -c3 / v + c4 * t / v;
  return t * (q * Math.log(c - 1) + c5);
}

/** Quantil der studentisierten Spannweite (R: qtukey(p, cc, df)); wie R mit Abbruch bei Schritt unter 0,0001 (daher dieselben Zahlen, nicht genauer). */
export function qtukey(p: number, cc: number, df: number, rr = 1): number {
  const eps = 0.0001, maxiter = 50;
  if (Number.isNaN(p) || Number.isNaN(cc) || Number.isNaN(df) || df < 2 || rr < 1 || cc < 2 || p < 0 || p > 1) return NaN;
  if (p === 0) return 0;
  if (p === 1) return Infinity;
  let x0 = qinv(p, cc, df), valx0 = ptukey(x0, cc, df, rr) - p;
  let x1 = valx0 > 0 ? Math.max(0, x0 - 1) : x0 + 1;
  let valx1 = ptukey(x1, cc, df, rr) - p, ans = 0;
  for (let iter = 1; iter < maxiter; iter++) {
    ans = x1 - (valx1 * (x1 - x0)) / (valx1 - valx0);
    valx0 = valx1; x0 = x1;
    if (ans < 0) { ans = 0; valx1 = -p; }
    valx1 = ptukey(ans, cc, df, rr) - p; x1 = ans;
    if (Math.abs(x1 - x0) < eps) return ans;
  }
  return ans;
}

/* ---------------------------------------------------------------- t-Verteilung (zweiseitig) */
/** Zweiseitiges p der t-Verteilung, auch für sehr kleine Werte genau. */
const pT2 = (t: number, df: number) => betai(df / 2, 0.5, df / (df + t * t));
/** Obere Grenze t mit P(|T| ≤ t) = 1 − a (zweiseitig), Bisektion auf dem genauen zweiseitigen p. */
function tKrit(a: number, df: number): number {
  let lo = 0, hi = 1; while (pT2(hi, df) > a && hi < 1e9) { lo = hi; hi *= 2; }
  for (let i = 0; i < 100; i++) { const m = (lo + hi) / 2; if (pT2(m, df) > a) lo = m; else hi = m; }
  return (lo + hi) / 2;
}

/** p der F-Verteilung (oberer Rand). */
const pF = (f: number, df1: number, df2: number) => (f > 0 ? betai(df2 / 2, df1 / 2, df2 / (df2 + df1 * f)) : 1);
/** Kritischer F-Wert mit P(F ≥ f) = a (Bisektion). */
function fKrit(a: number, df1: number, df2: number): number {
  let lo = 0, hi = 1; while (pF(hi, df1, df2) > a && hi < 1e12) { lo = hi; hi *= 2; }
  for (let i = 0; i < 100; i++) { const m = (lo + hi) / 2; if (pF(m, df1, df2) > a) lo = m; else hi = m; }
  return (lo + hi) / 2;
}
/** Holm-Anpassung (absteigende Schritte, Höchstwert wie R p.adjust). */
export function holmAnpassen(p: number[]): number[] {
  const m = p.length, ix = p.map((_, i) => i).sort((a, b) => p[a]! - p[b]!), aus = new Array<number>(m);
  let vor = 0;
  ix.forEach((i, k) => { vor = Math.max(vor, Math.min(1, (m - k) * p[i]!)); aus[i] = vor; });
  return aus;
}

/* ---------------------------------------------------------------- Rechnungen */
/** Gruppen, mit denen gerechnet werden kann: mindestens 3, jede mit n ≥ 2 und endlicher Streuung. */
export function phMoeglich(g: PhGruppe[]): boolean {
  return g.length >= 3 && g.every(x => x.n >= 2 && Number.isFinite(x.m) && Number.isFinite(x.sd));
}
/** MSE (mittlere Quadratsumme innerhalb) und Freiheitsgrade der klassischen Analyse, aus den Kennzahlen. */
export function phInnerhalb(g: PhGruppe[]): { mse: number; df: number } {
  const df = g.reduce((a, x) => a + x.n, 0) - g.length;
  return { mse: g.reduce((a, x) => a + (x.n - 1) * x.sd * x.sd, 0) / df, df };
}

/** Alle Paare nach der gewählten Art; `null`, wenn mit diesen Gruppen nicht gerechnet werden kann. 95-%-Intervalle, p nach Anpassung für alle Paare.
 *  Dunnett: nur die Vergleiche gegen die Kontrollgruppe `kontrolle` (Index, Standard 0); `i` ist dann die Kontrollgruppe, `j` die verglichene Gruppe (Differenz = Gruppe minus Kontrolle).
 *  Scheffé und Holm: gemeinsame Streuung wie Tukey; Holm hat kein eigenes Intervall - es gilt das von Bonferroni (gleiche Sicherheit für alle Paare zugleich). */
export function paarvergleiche(g: PhGruppe[], art: PhArt, kontrolle = 0): PhPaar[] | null {
  if (!phMoeglich(g)) return null;
  const k = g.length, { mse, df: dfw } = phInnerhalb(g), paare: PhPaar[] = [], anzahl = (k * (k - 1)) / 2;
  if (art === 'dunnett') {
    if (!(kontrolle >= 0 && kontrolle < k)) return null;
    const rest = g.map((_, j) => j).filter(j => j !== kontrolle), c0 = g[kontrolle]!;
    const lambda = dunnettLambda(rest.map(j => g[j]!.n), c0.n), krit = dunnettKrit(lambda, dfw);
    return rest.map(j => {
      const b = g[j]!, diff = b.m - c0.m, se = Math.sqrt(mse * (1 / b.n + 1 / c0.n));
      const p = se === 0 ? (diff === 0 ? 1 : 0) : dunnettP(Math.abs(diff) / se, lambda, dfw);
      return { i: kontrolle, j, diff, se, df: dfw, kiLo: diff - krit * se, kiHi: diff + krit * se, p };
    });
  }
  const qk = art === 'tukey' ? qtukey(0.95, k, dfw) : NaN, tb = art === 'bonferroni' || art === 'holm' ? tKrit(0.05 / anzahl, dfw) : NaN;
  const sh = art === 'scheffe' ? Math.sqrt((k - 1) * fKrit(0.05, k - 1, dfw)) : NaN;
  for (let i = 0; i < k; i++) for (let j = i + 1; j < k; j++) {
    const a = g[i]!, b = g[j]!, diff = b.m - a.m;
    if (art === 'gh') {
      const vi = (a.sd * a.sd) / a.n, vj = (b.sd * b.sd) / b.n, se = Math.sqrt(vi + vj);
      const df = (vi + vj) ** 2 / ((vi * vi) / (a.n - 1) + (vj * vj) / (b.n - 1));
      const p = se === 0 ? (diff === 0 ? 1 : 0) : Math.max(0, 1 - ptukey((Math.abs(diff) * Math.SQRT2) / se, k, df));
      const h = qtukey(0.95, k, df) * se / Math.SQRT2;
      paare.push({ i, j, diff, se, df, kiLo: diff - h, kiHi: diff + h, p });
    } else {
      const se = Math.sqrt(mse * (1 / a.n + 1 / b.n));
      if (art === 'tukey') {
        const sq = Math.sqrt((mse / 2) * (1 / a.n + 1 / b.n));
        const p = sq === 0 ? (diff === 0 ? 1 : 0) : Math.max(0, 1 - ptukey(Math.abs(diff) / sq, k, dfw));
        paare.push({ i, j, diff, se, df: dfw, kiLo: diff - qk * sq, kiHi: diff + qk * sq, p });
      } else if (art === 'scheffe') {
        const p = se === 0 ? (diff === 0 ? 1 : 0) : pF((diff / se) ** 2 / (k - 1), k - 1, dfw);
        paare.push({ i, j, diff, se, df: dfw, kiLo: diff - sh * se, kiHi: diff + sh * se, p });
      } else {
        const roh = se === 0 ? (diff === 0 ? 1 : 0) : pT2(Math.abs(diff) / se, dfw);
        // Bonferroni: p mal Zahl der Paare; Holm: Anpassung unten über alle Paare gemeinsam
        paare.push({ i, j, diff, se, df: dfw, kiLo: diff - tb * se, kiHi: diff + tb * se, p: art === 'holm' ? roh : Math.min(1, roh * anzahl) });
      }
    }
  }
  if (art === 'holm') { const h = holmAnpassen(paare.map(x => x.p)); paare.forEach((x, n) => { x.p = h[n]!; }); }
  return paare;
}

export interface WelchAnova { f: number; df1: number; df2: number; p: number }
/** Welch-Varianzanalyse (Welch 1951; R: oneway.test(var.equal = FALSE)); `null`, wenn eine Gruppe keine Streuung hat oder zu klein ist. */
export function welchAnova(g: PhGruppe[]): WelchAnova | null {
  const k = g.length;
  if (k < 2 || g.some(x => x.n < 2 || !(x.sd > 0) || !Number.isFinite(x.m))) return null;
  const w = g.map(x => x.n / (x.sd * x.sd)), W = w.reduce((a, b) => a + b, 0);
  const mw = w.reduce((a, wi, i) => a + wi * g[i]!.m, 0) / W;
  const zaehler = w.reduce((a, wi, i) => a + wi * (g[i]!.m - mw) ** 2, 0) / (k - 1);
  const h = w.reduce((a, wi, i) => a + (1 - wi / W) ** 2 / (g[i]!.n - 1), 0);
  const nenner = 1 + ((2 * (k - 2)) / (k * k - 1)) * h;
  const f = zaehler / nenner, df1 = k - 1, df2 = (k * k - 1) / (3 * h);
  return { f, df1, df2, p: betai(df2 / 2, df1 / 2, df2 / (df2 + df1 * f)) };
}

/** Der Standard-Paarvergleich: Games-Howell (braucht keine gleich große Streuung), unabhängig vom Levene-Test. */
export const PH_STANDARD: PhArt = 'gh';
/** Levene p < ,05 - nur noch zur Beschreibung (Marke, Satz), nicht mehr als Weiche für Hauptergebnis oder Paarvergleich. */
export const streuungUngleich = (leveneP: number | undefined) => leveneP !== undefined && leveneP < 0.05;
