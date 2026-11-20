/**
 * Welle 6, Kachel L4 „Lernlabor“: die Rechenkerne (reine Funktionen, ohne Oberfläche). Fachblatt docs/fachblaetter/WELLE6-VERSTEHEN.md (L4 a-f, „Entscheidungen Opus“);
 * Prüfung: lernlabor.test.ts (Eigenschaften mit festem Startwert), lernlabor-gold.test.ts (fester Lauf, Regression).
 *
 * Alle Zufallszahlen kommen aus zufall(startwert) (lib/zufall.ts, mulberry32, 32 Bit); nie Math.random. Teilströme (Bootstrap, „Weitere 100“ …) werden aus (Startwert, laufende Nummer)
 * GEMISCHT (teilstrom), nicht „+1“ (F11). Die Zufallszahlen sind NICHT die von R oder SPSS: gleiche Verteilung, andere Zahlen.
 * Obergrenzen (Fachblatt „Grenzen“): Stichprobenumfang 1-500, Wiederholungen B ≤ 100 000, Bootstrap-Reihe ≤ 200 Werte, Randomisierung je Gruppe ≤ 100 Werte, Vollauszählung ≤ 20 000 Aufteilungen.
 *
 * Lange Simulationen gibt es als „Lauf“ (Stücke): schritt(maxMs) rechnet höchstens so lange, die Oberfläche bleibt bedienbar. Das Ergebnis hängt NICHT von der Stückelung ab
 * (derselbe Erzeuger läuft einfach weiter) - der Einzelaufruf (z. B. stichprobenverteilung) ist ein Lauf bis zum Ende.
 *
 * Exakte Verteilungen (Binomial, hypergeometrisch, Poisson, t) und das Wilson-Intervall kommen aus lib/verteilungen.ts, lib/verteilung.ts und lib/kennzahlen.ts (keine eigenen Kopien).
 */
import { zufall } from './zufall';
import { pretty, quantil7, sortiert } from './diagrammdaten';
import { dichte } from './verteilungen';
import { dpoisRaw, tQuantil, tSchwaenze } from './verteilung';
import { wilsonIntervall, zZumNiveau } from './kennzahlen';

/* ====================================================================================================================== Teilströme und Ziehungen */

/** Mischfunktion (Finalizer von MurmurHash3): jedes Bit wirkt auf alle. */
function misch32(h: number): number {
  h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16;
  return h >>> 0;
}
/** Neuer Startwert (ganze Zahl 0 … 2³²−1) aus (Startwert, laufende Nummer), gemischt - teilstrom(1, 1) ≠ teilstrom(2, 0). */
export function teilstrom(startwert: number, nummer: number): number {
  const a = misch32(((startwert >>> 0) ^ 0x9e3779b9) | 0), b = misch32(((nummer >>> 0) + 0x7f4a7c15) | 0);
  return misch32(((a ^ b) + Math.imul((nummer >>> 0) + 1, 0x85ebca6b)) | 0);
}
/** Der Erzeuger für Teilstrom `nummer` eines Startwerts. */
export const strom = (startwert: number, nummer = 0) => zufall(teilstrom(startwert, nummer));

type Rng = () => number;

export const ziehGleich = (rng: Rng, a: number, b: number) => a + (b - a) * rng();
export const ziehExponential = (rng: Rng, rate: number) => -Math.log(1 - rng()) / rate;
/** Box-Muller (ein Wert je Aufruf, zwei Zufallszahlen; ohne versteckten Zustand). */
export function ziehNormal(rng: Rng, mu: number, sigma: number): number {
  const u1 = 1 - rng(), u2 = rng();
  return mu + sigma * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}
export const ziehWuerfel = (rng: Rng) => 1 + Math.floor(rng() * 6);

/* ---------- exakte Verteilungen (aus lib/verteilungen.ts) ---------- */
/** P(X = k) der Binomialverteilung B(n; p). */
export const dbinom = (k: number, n: number, p: number) => dichte({ art: 'binom', n, p }, k);
/** P(X = k) der hypergeometrischen Verteilung (N Elemente, K Treffer, n gezogen ohne Zurücklegen). */
export const dhyper = (k: number, N: number, K: number, n: number) => dichte({ art: 'hyper', N, K, n }, k);
/** Dichte der Normalverteilung. */
export const normalDichte = (x: number, mu: number, sigma: number) => dichte({ art: 'normal', mu, sigma }, x);
/** P(|T| > |t|) bei df Freiheitsgraden (zweiseitig, direkt ohne „1 − P“). */
export const tZweiseitig = (t: number, df: number) => (t === 0 ? 1 : Math.min(1, 2 * tSchwaenze(-Math.abs(t), df).unten));
/** Mittelwert ± t · s/√n (zweiseitig, Niveau z. B. 0,95). */
export function tIntervall(m: number, s: number, n: number, niveau: number): { lo: number; hi: number } {
  const h = tQuantil(1 - (1 - niveau) / 2, n - 1) * s / Math.sqrt(n);
  return { lo: m - h, hi: m + h };
}
/** Die Näherungsformel der Schule p̂ ± z·√(p̂(1−p̂)/n) (Wald). NUR als Vergleich in der Überdeckung (Opus F5); nicht auf [0; 1] beschnitten. */
export function wald(x: number, n: number, niveau: number): { lo: number; hi: number } {
  const z = zZumNiveau(niveau), ph = x / n, h = z * Math.sqrt((ph * (1 - ph)) / n);
  return { lo: ph - h, hi: ph + h };
}

/* ---------- Ziehungen diskreter Verteilungen: Umkehrung der Verteilungsfunktion, von der Modalstelle nach außen (exakt, ohne Rundungsfehler der Summe) ---------- */
/** Ordnet die Werte m, m−1, m+1, m−2 … an und legt ihre Wahrscheinlichkeiten hintereinander in [0; 1) - jede Reihenfolge ergibt dieselbe Verteilung. */
function umkehrVonModus(u: number, modus: number, lo: number, hi: number, pModus: number, auf: (k: number, pk: number) => number, ab: (k: number, pk: number) => number): number {
  let rest = u - pModus; if (rest < 0) return modus;
  let kl = modus, kh = modus, pl = pModus, ph = pModus;
  for (;;) {
    const l = kl > lo && pl >= 1e-300, h = kh < hi && ph >= 1e-300;
    if (!l && !h) return modus;   // nur Rundungsrest
    if (l) { pl = ab(kl, pl); kl--; rest -= pl; if (rest < 0) return kl; }
    if (h) { ph = auf(kh, ph); kh++; rest -= ph; if (rest < 0) return kh; }
  }
}
export function ziehBinomial(rng: Rng, n: number, p: number): number {
  if (n <= 0 || p <= 0) return 0; if (p >= 1) return n;
  const modus = Math.min(n, Math.floor((n + 1) * p)), q = 1 - p;
  return umkehrVonModus(rng(), modus, 0, n, dbinom(modus, n, p), (k, pk) => (pk * (n - k) * p) / ((k + 1) * q), (k, pk) => (pk * k * q) / ((n - k + 1) * p));
}
export function ziehPoisson(rng: Rng, lambda: number): number {
  if (lambda <= 0) return 0;
  const modus = Math.floor(lambda), pModus = dpoisRaw(modus, lambda);
  return umkehrVonModus(rng(), modus, 0, Infinity, pModus, (k, pk) => (pk * lambda) / (k + 1), (k, pk) => (pk * k) / lambda);
}
export function ziehHyper(rng: Rng, N: number, K: number, n: number): number {
  const lo = Math.max(0, n - (N - K)), hi = Math.min(n, K);
  if (lo >= hi) return lo;
  const modus = Math.min(hi, Math.max(lo, Math.floor(((n + 1) * (K + 1)) / (N + 2))));
  return umkehrVonModus(rng(), modus, lo, hi, dhyper(modus, N, K, n),
    (k, pk) => (pk * (K - k) * (n - k)) / ((k + 1) * (N - K - n + k + 1)), (k, pk) => (pk * k * (N - K - n + k)) / ((K - k + 1) * (n - k + 1)));
}

/* ====================================================================================================================== Läufe in Stücken */

/** Eine Rechnung in Stücken: schritt(maxMs) rechnet höchstens so lange (mindestens eine Einheit), ergebnis() erst nach fertig(). */
export interface Lauf<T> { fertig(): boolean; anteil(): number; schritt(maxMs?: number): void; ergebnis(): T }
const jetzt = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

function lauf<T>(gesamt: number, einheit: (i: number) => void, ergebnis: () => T): Lauf<T> {
  let i = 0;
  return {
    fertig: () => i >= gesamt,
    anteil: () => (gesamt === 0 ? 1 : i / gesamt),
    schritt(maxMs = Infinity) {
      const t0 = maxMs === Infinity ? 0 : jetzt();
      while (i < gesamt) { einheit(i++); if (maxMs !== Infinity && (i & 15) === 0 && jetzt() - t0 >= maxMs) break; }
    },
    ergebnis: () => { if (i < gesamt) throw new Error('Lauf nicht fertig'); return ergebnis(); }
  };
}
/** Bis zum Ende rechnen. */
export function fertigRechnen<T>(l: Lauf<T>): T { l.schritt(Infinity); return l.ergebnis(); }
/**
 * Für die Oberfläche: rechnet in Stücken von höchstens `stueckMs` Millisekunden und gibt dazwischen die Hand zurück (Eingaben, Lade-Animation bleiben lebendig).
 * `weiter()` false → abgebrochen (dann Rückgabe undefined). `fortschritt` bekommt den Anteil 0…1.
 */
export async function laufeInStuecken<T>(l: Lauf<T>, weiter: () => boolean = () => true, fortschritt?: (anteil: number) => void, stueckMs = 24): Promise<T | undefined> {
  while (!l.fertig()) {
    if (!weiter()) return undefined;
    l.schritt(stueckMs);
    fortschritt?.(l.anteil());
    await new Promise<void>(r => setTimeout(r, 0));
  }
  return weiter() ? l.ergebnis() : undefined;
}

const pruefeGanz = (v: number, lo: number, hi: number, was: string) => {
  if (!Number.isInteger(v) || v < lo || v > hi) throw new Error(`${was} muss eine ganze Zahl von ${lo} bis ${hi} sein`);
};

/* ====================================================================================================================== a) Stichprobenverteilung / Zentraler Grenzwertsatz */

export type Population =
  | { art: 'normal'; mu: number; sigma: number }
  | { art: 'gleich'; a: number; b: number }
  | { art: 'exponential'; rate: number }
  | { art: 'zweigipflig'; mu1: number; mu2: number; sigma: number }
  | { art: 'wuerfel' }
  | { art: 'anteil'; p: number };

export const N_MAX = 500, B_MAX = 100000;

/** Mittelwert und Standardabweichung der Grundgesamtheit (Nenner N). */
export function populationKennzahlen(pop: Population): { mittel: number; sd: number } {
  switch (pop.art) {
    case 'normal': return { mittel: pop.mu, sd: pop.sigma };
    case 'gleich': return { mittel: (pop.a + pop.b) / 2, sd: (pop.b - pop.a) / Math.sqrt(12) };
    case 'exponential': return { mittel: 1 / pop.rate, sd: 1 / pop.rate };
    case 'zweigipflig': return { mittel: (pop.mu1 + pop.mu2) / 2, sd: Math.sqrt(pop.sigma ** 2 + ((pop.mu1 - pop.mu2) / 2) ** 2) };
    case 'wuerfel': return { mittel: 3.5, sd: Math.sqrt(35 / 12) };
    case 'anteil': return { mittel: pop.p, sd: Math.sqrt(pop.p * (1 - pop.p)) };
  }
}
/** Prüft die Kenngrößen einer Grundgesamtheit; liefert null (in Ordnung) oder den Fehler als Text. */
export function pruefePopulation(pop: Population): string | null {
  const ok = (...v: number[]) => v.every(Number.isFinite);
  switch (pop.art) {
    case 'normal': return ok(pop.mu, pop.sigma) && pop.sigma > 0 ? null : 'sigma';
    case 'gleich': return ok(pop.a, pop.b) && pop.b > pop.a ? null : 'ab';
    case 'exponential': return ok(pop.rate) && pop.rate > 0 ? null : 'rate';
    case 'zweigipflig': return ok(pop.mu1, pop.mu2, pop.sigma) && pop.sigma > 0 ? null : 'sigma';
    case 'wuerfel': return null;
    case 'anteil': return ok(pop.p) && pop.p >= 0 && pop.p <= 1 ? null : 'p';
  }
}
function ziehePop(rng: Rng, pop: Population): number {
  switch (pop.art) {
    case 'normal': return ziehNormal(rng, pop.mu, pop.sigma);
    case 'gleich': return ziehGleich(rng, pop.a, pop.b);
    case 'exponential': return ziehExponential(rng, pop.rate);
    case 'zweigipflig': return ziehNormal(rng, rng() < 0.5 ? pop.mu1 : pop.mu2, pop.sigma);
    case 'wuerfel': return ziehWuerfel(rng);
    case 'anteil': return rng() < pop.p ? 1 : 0;
  }
}

const mw = (v: ArrayLike<number>) => { let s = 0; for (let i = 0; i < v.length; i++) s += v[i]!; return s / v.length; };
const sdn1 = (v: ArrayLike<number>) => { if (v.length < 2) return NaN; const m = mw(v); let s = 0; for (let i = 0; i < v.length; i++) s += (v[i]! - m) ** 2; return Math.sqrt(s / (v.length - 1)); };

export interface Stichprobenverteilung { werte: number[]; mittelDerWerte: number; empirischerSE: number; theoretischerSE: number; theoretischerMittel: number; n: number; B: number; startwert: number }
export function stichprobenverteilungLauf(o: { pop: Population; n: number; B: number; startwert: number }): Lauf<Stichprobenverteilung> {
  const { pop, n, B, startwert } = o;
  pruefeGanz(n, 1, N_MAX, 'Der Stichprobenumfang'); pruefeGanz(B, 1, B_MAX, 'Die Zahl der Stichproben');
  const fehler = pruefePopulation(pop); if (fehler) throw new Error(`Grundgesamtheit ungültig (${fehler})`);
  const rng = strom(startwert, 0), werte = new Array<number>(B);
  return lauf(B, b => {
    if (pop.art === 'anteil') { werte[b] = ziehBinomial(rng, n, pop.p) / n; return; }   // Anteil in n Bernoulli-Versuchen = Binomial / n (gleiche Verteilung)
    let s = 0; for (let i = 0; i < n; i++) s += ziehePop(rng, pop);
    werte[b] = s / n;
  }, () => {
    const k = populationKennzahlen(pop);
    return { werte, mittelDerWerte: mw(werte), empirischerSE: sdn1(werte), theoretischerSE: k.sd / Math.sqrt(n), theoretischerMittel: k.mittel, n, B, startwert };
  });
}
/** B Stichproben vom Umfang n; je Stichprobe der Mittelwert (bei 'anteil' der Anteil). */
export const stichprobenverteilung = (o: { pop: Population; n: number; B: number; startwert: number }) => fertigRechnen(stichprobenverteilungLauf(o));

/* ---------- Histogramm für die Anzeige ---------- */
export interface Histogramm { kanten: number[]; zaehler: number[]; dichte: number[]; diskret: boolean; schritt: number }
/**
 * Klassen für das Histogramm. Mit `gitter` (Abstand der möglichen Werte, z. B. 1/n beim Anteil) steht je möglichem Wert eine Säule (wenn es höchstens 80 sind);
 * sonst schöne Klassengrenzen wie R pretty(). `dichte` = Anteil / Klassenbreite (Fläche 1), damit die Kurve darüber passt.
 */
export function histogramm(werte: number[], gitter?: number): Histogramm {
  const n = werte.length;
  if (n === 0) return { kanten: [0, 1], zaehler: [0], dichte: [0], diskret: false, schritt: 1 };
  let lo = Infinity, hi = -Infinity; for (const v of werte) { if (v < lo) lo = v; if (v > hi) hi = v; }
  if (gitter && gitter > 0) {
    const j0 = Math.round(lo / gitter), j1 = Math.round(hi / gitter);
    if (j1 - j0 + 1 <= 80) {
      const zaehler = new Array<number>(j1 - j0 + 1).fill(0);
      for (const v of werte) zaehler[Math.round(v / gitter) - j0]!++;
      return { kanten: Array.from({ length: j1 - j0 + 2 }, (_, i) => (j0 + i - 0.5) * gitter), zaehler, dichte: zaehler.map(c => c / n / gitter), diskret: true, schritt: gitter };
    }
  }
  if (!(hi > lo)) { const w = Math.abs(lo) > 0 ? Math.abs(lo) * 0.1 : 0.5; return { kanten: [lo - w, lo + w], zaehler: [n], dichte: [n / n / (2 * w)], diskret: false, schritt: 2 * w }; }
  const klassen = Math.min(40, Math.max(10, Math.ceil(Math.log2(n)) + 1));
  const kanten = pretty(lo, hi, klassen, 1), zaehler = new Array<number>(kanten.length - 1).fill(0);
  for (const v of werte) {
    let a = 0, b = kanten.length - 1;                     // erste Kante ≥ v (rechts abgeschlossen: (k_i; k_i+1], die erste Klasse auch links)
    while (a < b) { const m = (a + b) >> 1; if (kanten[m]! < v) a = m + 1; else b = m; }
    zaehler[Math.max(0, Math.min(zaehler.length - 1, a - 1))]!++;
  }
  return { kanten, zaehler, dichte: zaehler.map((c, i) => c / n / (kanten[i + 1]! - kanten[i]!)), diskret: false, schritt: kanten[1]! - kanten[0]! };
}

/* ====================================================================================================================== b) Bootstrap */

/** Quantil-TYP 7 (R-Standard) bei (1−niveau)/2 und 1−(1−niveau)/2 (F17, Perzentil-Intervall). */
export function perzentilIntervall(werte: number[], niveau: number): [number, number] {
  const s = sortiert(werte), a = (1 - niveau) / 2;
  return [quantil7(s, a), quantil7(s, 1 - a)];
}

export const BOOTSTRAP_MAX = 200, GRUPPE_MAX = 100;
export interface BootstrapErgebnis { werte: number[]; mittel: number; se: number; lo: number; hi: number; tLo: number; tHi: number; hinweisKlein: boolean; sd: number; n: number; B: number; niveau: number; startwert: number }
export function bootstrapLauf(o: { daten: number[]; B: number; niveau: number; startwert: number }): Lauf<BootstrapErgebnis> {
  const { daten, B, niveau, startwert } = o, n = daten.length;
  if (n < 2 || n > BOOTSTRAP_MAX) throw new Error(`Die Reihe braucht 2 bis ${BOOTSTRAP_MAX} Werte`);
  if (!daten.every(Number.isFinite)) throw new Error('Die Reihe enthält etwas, das keine Zahl ist');
  pruefeGanz(B, 1, B_MAX, 'Die Zahl der Ziehungen');
  if (!(niveau > 0 && niveau < 1)) throw new Error('Das Niveau liegt zwischen 0 und 1');
  const rng = strom(startwert, 0), werte = new Array<number>(B);
  return lauf(B, b => {
    let s = 0; for (let i = 0; i < n; i++) s += daten[Math.floor(rng() * n)]!;
    werte[b] = s / n;
  }, () => {
    const mittel = mw(daten), sd = sdn1(daten), [lo, hi] = perzentilIntervall(werte, niveau), t = tIntervall(mittel, sd, n, niveau);
    return { werte, mittel, se: sdn1(werte), lo, hi, tLo: t.lo, tHi: t.hi, hinweisKlein: n < 10, sd, n, B, niveau, startwert };
  });
}
/** Bootstrap des Mittelwerts: B-mal n Werte mit Zurücklegen ziehen. */
export const bootstrap = (o: { daten: number[]; B: number; niveau: number; startwert: number }) => fertigRechnen(bootstrapLauf(o));

/* ====================================================================================================================== c) Randomisierungstest */

export const VOLLAUSZAEHLUNG_MAX = 20000;
/** Welch-t-Test (Formel) für zwei Reihen; bei Streuung 0 in beiden Gruppen NaN. */
export function welchTest(g1: number[], g2: number[]): { t: number; df: number; p: number } {
  const n1 = g1.length, n2 = g2.length;
  if (n1 < 2 || n2 < 2) return { t: NaN, df: NaN, p: NaN };
  const a = sdn1(g1) ** 2 / n1, b = sdn1(g2) ** 2 / n2, se2 = a + b;
  if (!(se2 > 0)) return { t: NaN, df: NaN, p: NaN };
  const t = (mw(g1) - mw(g2)) / Math.sqrt(se2), df = (se2 * se2) / ((a * a) / (n1 - 1) + (b * b) / (n2 - 1));
  return { t, df, p: tZweiseitig(t, df) };
}
/** |d| ≥ |beobachtet| mit relativer Toleranz 1e-9 (Gleitkomma-Reste bei gleichen Werten). */
const mindestens = (d: number, beob: number) => Math.abs(d) >= Math.abs(beob) * (1 - 1e-9);
function pruefeGruppen(g1: number[], g2: number[]) {
  for (const g of [g1, g2]) {
    if (g.length < 1 || g.length > GRUPPE_MAX) throw new Error(`Jede Gruppe braucht 1 bis ${GRUPPE_MAX} Werte`);
    if (!g.every(Number.isFinite)) throw new Error('Eine Gruppe enthält etwas, das keine Zahl ist');
  }
}
export interface RandomisierungErgebnis { beobachtet: number; p: number; werte: number[]; welch: { t: number; df: number; p: number }; anzahl: number; B: number; startwert: number }
export function randomisierungLauf(o: { g1: number[]; g2: number[]; B: number; startwert: number }): Lauf<RandomisierungErgebnis> {
  const { g1, g2, B, startwert } = o; pruefeGruppen(g1, g2); pruefeGanz(B, 1, B_MAX, 'Die Zahl der Mischungen');
  const n1 = g1.length, n2 = g2.length, n = n1 + n2, alle = [...g1, ...g2];
  let gesamt = 0; for (const v of alle) gesamt += v;
  const beobachtet = mw(g1) - mw(g2), rng = strom(startwert, 0), werte = new Array<number>(B), reihe = alle.slice();
  let anzahl = 0;
  return lauf(B, b => {
    for (let i = n - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); const t = reihe[i]!; reihe[i] = reihe[j]!; reihe[j] = t; }   // Fisher-Yates
    let s1 = 0; for (let i = 0; i < n1; i++) s1 += reihe[i]!;
    const d = s1 / n1 - (gesamt - s1) / n2; werte[b] = d;
    if (mindestens(d, beobachtet)) anzahl++;
  }, () => ({ beobachtet, p: (anzahl + 1) / (B + 1), werte, welch: welchTest(g1, g2), anzahl, B, startwert }));
}
/** Randomisierungstest: B-mal die Gruppenzuordnung mischen; p = (Anzahl ≥ beobachtet + 1)/(B + 1) (F16, Phipson & Smyth). */
export const randomisierung = (o: { g1: number[]; g2: number[]; B: number; startwert: number }) => fertigRechnen(randomisierungLauf(o));

/** Zahl der Aufteilungen C(n, k), aber nur genau bis `grenze`: darüber Infinity. */
export function aufteilungen(n: number, k: number, grenze = VOLLAUSZAEHLUNG_MAX): number {
  k = Math.min(k, n - k); let r = 1;
  for (let i = 1; i <= k; i++) { r = (r * (n - k + i)) / i; if (r > grenze) return Infinity; }
  return Math.round(r);
}
/** Vollauszählung aller C(n1+n2, n1) Aufteilungen (null, wenn es mehr als 20 000 sind); p = Anzahl/Gesamt, ohne „+1“. */
export function randomisierungExakt(g1: number[], g2: number[]): { p: number; anzahl: number; gesamt: number } | null {
  pruefeGruppen(g1, g2);
  const n1 = g1.length, n2 = g2.length, n = n1 + n2, alle = [...g1, ...g2], gesamt = aufteilungen(n, n1);
  if (!Number.isFinite(gesamt)) return null;
  let summe = 0; for (const v of alle) summe += v;
  const beob = mw(g1) - mw(g2); let anzahl = 0;
  const rek = (start: number, gewaehlt: number, s1: number) => {
    if (gewaehlt === n1) { if (mindestens(s1 / n1 - (summe - s1) / n2, beob)) anzahl++; return; }
    for (let i = start; i <= n - (n1 - gewaehlt); i++) rek(i + 1, gewaehlt + 1, s1 + alle[i]!);
  };
  rek(0, 0, 0);
  return { p: anzahl / gesamt, anzahl, gesamt };
}

/* ====================================================================================================================== d) Zufallsexperimente */

export const N_EXPERIMENT_MAX = 100000;
function pruefeN(N: number) { pruefeGanz(N, 1, N_EXPERIMENT_MAX, 'Die Zahl der Wiederholungen'); }

export interface Muenzergebnis { treffer: number; relativ: number; verlauf: number[]; N: number; p: number; startwert: number }
/** N Münzwürfe mit Trefferwahrscheinlichkeit p; verlauf[i] = relative Häufigkeit der Treffer nach i + 1 Würfen. */
export function muenzwurf(o: { p: number; N: number; startwert: number }): Muenzergebnis {
  const { p, N, startwert } = o; pruefeN(N);
  if (!(p >= 0 && p <= 1)) throw new Error('p liegt zwischen 0 und 1');
  const rng = strom(startwert, 0), verlauf = new Array<number>(N); let treffer = 0;
  for (let i = 0; i < N; i++) { if (rng() < p) treffer++; verlauf[i] = treffer / (i + 1); }
  return { treffer, relativ: treffer / N, verlauf, N, p, startwert };
}

export interface Haeufigkeiten { haeufigkeit: number[]; verlauf?: number[]; N: number; startwert: number }
function pruefeWuerfelP(p: number[] | undefined): number[] {
  if (!p) return [1 / 6, 1 / 6, 1 / 6, 1 / 6, 1 / 6, 1 / 6];
  if (p.length !== 6 || !p.every(v => Number.isFinite(v) && v >= 0) || Math.abs(p.reduce((a, b) => a + b, 0) - 1) > 1e-9) throw new Error('Die sechs Wahrscheinlichkeiten müssen zusammen 1 ergeben');
  return p;
}
/** Wahrscheinlichkeiten der Augenzahl (Index 1…6) bzw. der Augensumme (Index 2…12) - Index 0 (und bei zwei Würfeln 1) bleibt 0. */
export function wuerfelVerteilung(wuerfel: 1 | 2, p?: number[]): number[] {
  const w = pruefeWuerfelP(p);
  if (wuerfel === 1) return [0, ...w];
  const r = new Array<number>(13).fill(0);
  for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) r[a + b]! += w[a - 1]! * w[b - 1]!;
  return r;
}
/**
 * N Würfe mit 1 oder 2 Würfeln (fair oder mit den Wahrscheinlichkeiten p für die Augenzahlen 1…6, bei zwei Würfeln für beide gleich). haeufigkeit[Augenzahl bzw. Summe].
 * Mit `beobachte` (eine Augenzahl bzw. Summe) kommt dazu der Verlauf ihrer relativen Häufigkeit.
 */
export function wuerfelwurf(o: { wuerfel: 1 | 2; p?: number[]; N: number; startwert: number; beobachte?: number }): Haeufigkeiten {
  const { wuerfel, N, startwert, beobachte } = o; pruefeN(N);
  const w = pruefeWuerfelP(o.p), kum: number[] = []; w.reduce((a, b, i) => (kum[i] = a + b), 0);
  const rng = strom(startwert, 0), haeufigkeit = new Array<number>(wuerfel === 1 ? 7 : 13).fill(0);
  const verlauf = beobachte === undefined ? undefined : new Array<number>(N); let treffer = 0;
  const wurf = () => { const u = rng(); let k = 0; while (k < 5 && u >= kum[k]!) k++; return k + 1; };
  for (let i = 0; i < N; i++) {
    const e = wuerfel === 1 ? wurf() : wurf() + wurf();
    haeufigkeit[e]!++;
    if (verlauf) { if (e === beobachte) treffer++; verlauf[i] = treffer / (i + 1); }
  }
  return { haeufigkeit, ...(verlauf ? { verlauf } : {}), N, startwert };
}

export interface UrneEingabe { rot: number; blau: number; ziehungen: number; mitZuruecklegen: boolean }
function pruefeUrne(u: UrneEingabe) {
  pruefeGanz(u.rot, 0, 100000, 'Die Zahl der roten Kugeln'); pruefeGanz(u.blau, 0, 100000, 'Die Zahl der blauen Kugeln'); pruefeGanz(u.ziehungen, 1, 1000, 'Die Zahl der Ziehungen');
  if (u.rot + u.blau < 1) throw new Error('Die Urne ist leer');
  if (!u.mitZuruecklegen && u.ziehungen > u.rot + u.blau) throw new Error('Ohne Zurücklegen kann man nicht mehr Kugeln ziehen, als in der Urne sind');
}
/** Wahrscheinlichkeit für k rote Kugeln unter den gezogenen (Index k = 0 … ziehungen): Binomial mit Zurücklegen, hypergeometrisch ohne. */
export function urneVerteilung(u: UrneEingabe): number[] {
  pruefeUrne(u); const N = u.rot + u.blau;
  return Array.from({ length: u.ziehungen + 1 }, (_, k) => (u.mitZuruecklegen ? dbinom(k, u.ziehungen, u.rot / N) : dhyper(k, N, u.rot, u.ziehungen)));
}
/** N-mal `ziehungen` Kugeln ziehen; haeufigkeit[k] = wie oft genau k rote dabei waren. Mit `beobachte` (ein k) kommt der Verlauf seiner relativen Häufigkeit dazu. */
export function urne(o: UrneEingabe & { N: number; startwert: number; beobachte?: number }): Haeufigkeiten {
  pruefeUrne(o); pruefeN(o.N);
  const { rot, blau, ziehungen, mitZuruecklegen, N, startwert, beobachte } = o, gesamt = rot + blau, p = rot / gesamt;
  const rng = strom(startwert, 0), haeufigkeit = new Array<number>(ziehungen + 1).fill(0);
  const verlauf = beobachte === undefined ? undefined : new Array<number>(N); let treffer = 0;
  for (let i = 0; i < N; i++) {
    const k = mitZuruecklegen ? ziehBinomial(rng, ziehungen, p) : ziehHyper(rng, gesamt, rot, ziehungen);
    haeufigkeit[k]!++;
    if (verlauf) { if (k === beobachte) treffer++; verlauf[i] = treffer / (i + 1); }
  }
  return { haeufigkeit, ...(verlauf ? { verlauf } : {}), N, startwert };
}

/* ====================================================================================================================== f) Überdeckung von Konfidenzintervallen */

export interface UeberdeckungsIntervall { lo: number; hi: number; ueberdeckt: boolean; schaetzer: number; treffer?: number; wald?: { lo: number; hi: number; ueberdeckt: boolean } }
export interface UeberdeckungErgebnis { intervalle: UeberdeckungsIntervall[]; anzahl: number; ueberdeckt: number; waldUeberdeckt?: number; wahr: number; niveau: number; startwert: number; nummer: number }
export type UeberdeckungEingabe =
  | { art: 'mittel'; mu: number; sigma: number; n: number; niveau: number; anzahl?: number; startwert: number; nummer?: number }
  | { art: 'anteil'; p: number; n: number; niveau: number; anzahl?: number; startwert: number; nummer?: number; mitWald?: boolean };

/**
 * `anzahl` (Standard 100) Stichproben, je ein Konfidenzintervall: 'mittel' = t-Intervall zu Normal(mu; sigma), 'anteil' = Wilson (Anteil p), auf Wunsch dazu die Schulformel (Wald, NUR als Vergleich).
 * `nummer` wählt den Teilstrom („Weitere 100“ = nummer 1, 2 …).
 */
export function ueberdeckung(o: UeberdeckungEingabe): UeberdeckungErgebnis {
  const anzahl = o.anzahl ?? 100, nummer = o.nummer ?? 0, { n, niveau, startwert } = o;
  pruefeGanz(anzahl, 1, B_MAX, 'Die Zahl der Intervalle'); pruefeGanz(n, o.art === 'mittel' ? 2 : 1, 100000, 'Der Stichprobenumfang');
  if (!(niveau > 0 && niveau < 1)) throw new Error('Das Niveau liegt zwischen 0 und 1');
  const rng = strom(startwert, nummer), intervalle: UeberdeckungsIntervall[] = new Array(anzahl);
  let ueberdeckt = 0, waldUeberdeckt = 0;
  if (o.art === 'mittel') {
    if (!(o.sigma > 0) || !Number.isFinite(o.mu)) throw new Error('sigma muss größer als 0 sein');
    const tq = tQuantil(1 - (1 - niveau) / 2, n - 1), wurzel = Math.sqrt(n);
    for (let k = 0; k < anzahl; k++) {
      const x = new Array<number>(n); for (let i = 0; i < n; i++) x[i] = ziehNormal(rng, o.mu, o.sigma);
      const m = mw(x), h = (tq * sdn1(x)) / wurzel, lo = m - h, hi = m + h, drin = lo <= o.mu && o.mu <= hi;
      if (drin) ueberdeckt++;
      intervalle[k] = { lo, hi, ueberdeckt: drin, schaetzer: m };
    }
    return { intervalle, anzahl, ueberdeckt, wahr: o.mu, niveau, startwert, nummer };
  }
  if (!(o.p >= 0 && o.p <= 1)) throw new Error('p liegt zwischen 0 und 1');
  for (let k = 0; k < anzahl; k++) {
    const x = ziehBinomial(rng, n, o.p), w = wilsonIntervall(x, n, niveau), drin = w.lo <= o.p && o.p <= w.hi;
    if (drin) ueberdeckt++;
    const iv: UeberdeckungsIntervall = { lo: w.lo, hi: w.hi, ueberdeckt: drin, schaetzer: x / n, treffer: x };
    if (o.mitWald) { const a = wald(x, n, niveau), wd = a.lo <= o.p && o.p <= a.hi; if (wd) waldUeberdeckt++; iv.wald = { lo: a.lo, hi: a.hi, ueberdeckt: wd }; }
    intervalle[k] = iv;
  }
  return { intervalle, anzahl, ueberdeckt, ...(o.mitWald ? { waldUeberdeckt } : {}), wahr: o.p, niveau, startwert, nummer };
}

/**
 * EXAKTE Überdeckungswahrscheinlichkeit eines Anteil-Intervalls bei wahrem p und Umfang n: Summe von P(X = x) über alle x, deren Intervall p enthält
 * (Wilson oder die Schulformel Wald). Bei sehr großem n nur um den Gipfel (np ± 12σ), der Rest ist kleiner als 1e-30.
 */
export function exakteUeberdeckung(p: number, n: number, niveau: number, art: 'wilson' | 'wald' = 'wilson'): number {
  const sd = Math.sqrt(n * p * (1 - p)), lo = Math.max(0, Math.floor(n * p - 12 * sd)), hi = Math.min(n, Math.ceil(n * p + 12 * sd));
  let s = 0;
  for (let x = n <= 20000 ? 0 : lo; x <= (n <= 20000 ? n : hi); x++) {
    const iv = art === 'wilson' ? wilsonIntervall(x, n, niveau) : wald(x, n, niveau);
    if (iv.lo <= p && p <= iv.hi) s += dbinom(x, n, p);
  }
  return Math.min(1, s);
}

/* ====================================================================================================================== e) Vierfeldertafel, Baum, Bayes */

/** Positiver und negativer Vorhersagewert aus Prävalenz π, Sensitivität Se, Spezifität Sp; pPositiv = P(positiv). */
export function bayes(praevalenz: number, se: number, sp: number): { ppv: number; npv: number; pPositiv: number } {
  const pPositiv = se * praevalenz + (1 - sp) * (1 - praevalenz), pNegativ = (1 - se) * praevalenz + sp * (1 - praevalenz);
  return { ppv: (se * praevalenz) / pPositiv, npv: (sp * (1 - praevalenz)) / pNegativ, pPositiv };
}
const nahGanz = (c: number) => Math.abs(c - Math.round(c)) <= 1e-9 * Math.max(1, Math.abs(c));
/** Gleitkomma-Rauschen (< 1e-9 relativ neben einer ganzen Zahl) wegnehmen - echte Nachkommastellen bleiben UNGERUNDET. */
const ohneRauschen = (c: number) => (nahGanz(c) ? Math.round(c) : c);
function zellen(praevalenz: number, se: number, sp: number, N: number) {
  return { rp: ohneRauschen(N * praevalenz * se), fp: ohneRauschen(N * (1 - praevalenz) * (1 - sp)), fn: ohneRauschen(N * praevalenz * (1 - se)), rn: ohneRauschen(N * (1 - praevalenz) * sp) };
}
/** Kleinste Zehnerpotenz aus 1000, 10 000, 100 000, 1 000 000, bei der alle vier Zellen ganze Zahlen sind (natürliche Häufigkeiten); sonst N = 1000 mit Dezimalstellen (ganzzahlig = false). */
export function bezugsgroesse(praevalenz: number, se: number, sp: number): { N: number; ganzzahlig: boolean } {
  for (const N of [1000, 10000, 100000, 1000000]) {
    const z = zellen(praevalenz, se, sp, N);
    if ([z.rp, z.fp, z.fn, z.rn].every(Number.isInteger)) return { N, ganzzahlig: true };
  }
  return { N: 1000, ganzzahlig: false };
}
export interface Vierfeldertafel {
  rp: number; fp: number; fn: number; rn: number; n: number; krank: number; gesund: number; positiv: number; negativ: number;
  praevalenz: number; se: number; sp: number; ppv: number; npv: number; N: number; ganzzahlig: boolean;
}
/** Vierfeldertafel entweder aus Prävalenz/Se/Sp (+ Bezugsgröße N) oder aus vier Häufigkeiten. Zellen werden NIE gerundet. */
export function vierfeldertafel(e: { modus: 'rate'; praevalenz: number; se: number; sp: number; N?: number } | { modus: 'haeufig'; rp: number; fp: number; fn: number; rn: number }): Vierfeldertafel {
  if (e.modus === 'haeufig') {
    const { rp, fp, fn, rn } = e, n = rp + fp + fn + rn, krank = rp + fn, gesund = fp + rn, positiv = rp + fp, negativ = fn + rn;
    return { rp, fp, fn, rn, n, krank, gesund, positiv, negativ, praevalenz: krank / n, se: rp / krank, sp: rn / gesund, ppv: rp / positiv, npv: rn / negativ, N: n, ganzzahlig: [rp, fp, fn, rn].every(Number.isInteger) };
  }
  const { praevalenz, se, sp } = e, b = e.N === undefined ? bezugsgroesse(praevalenz, se, sp) : { N: e.N, ganzzahlig: false }, N = b.N, z = zellen(praevalenz, se, sp, N), g = bayes(praevalenz, se, sp);
  return {
    ...z, n: N, krank: z.rp + z.fn, gesund: z.fp + z.rn, positiv: z.rp + z.fp, negativ: z.fn + z.rn, praevalenz, se, sp, ppv: g.ppv, npv: g.npv, N,
    ganzzahlig: e.N === undefined ? b.ganzzahlig : [z.rp, z.fp, z.fn, z.rn].every(Number.isInteger)
  };
}
/** Unabhängigkeit: P(A ∩ B) = P(A)·P(B)? „gleich“ nur innerhalb von 1e-9 (F18). Beide Zahlen werden gezeigt. */
export function unabhaengig(pA: number, pB: number, pAB: number): { gleich: boolean; produkt: number } {
  const produkt = pA * pB;
  return { gleich: Math.abs(pAB - produkt) <= 1e-9, produkt };
}
