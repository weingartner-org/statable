/**
 * Rangtests als vollwertige Ergebnisse: Mann-Whitney-U (zwei Gruppen), Kruskal-Wallis mit Dunn-Paarvergleichen (drei und mehr Gruppen)
 * und Wilcoxon (zwei Messungen derselben Personen). Reine Rechnung aus den Rohwerten; Sätze und Tabellen stehen in rangsaetze.ts.
 *
 * Warum eigener Code und nicht nur PSPP `NPAR TESTS`: PSPP liefert U, z, p (bzw. H, df, p) und damit dieselben Zahlen (Test gegen die Engine in rangtests.test.ts),
 * aber keine Mediane, keine Effektstärken und keine Paarvergleiche - und Blatt, Bericht, Word und Excel brauchen dieselben Zahlen aus einer Hand.
 * Gerechnet wird wie PSPP und wie R (`wilcox.test(exact = FALSE, correct = FALSE)`, `kruskal.test`): Normalnäherung bzw. χ², mit Bindungskorrektur,
 * ohne Stetigkeitskorrektur. Vergleichswerte: scripts/rangtests-erwartet.R (inkl. Kontrolle gegen das R-Paket dunn.test), Tests: rangtests.test.ts.
 * Ausnahme wie in R und SPSS („Exakte Signifikanz“): Mann-Whitney (je Gruppe < 50) und Wilcoxon (weniger als 50 Differenzen ohne Nullen) zeigen den EXAKTEN p-Wert (exakteTests.ts), auch bei Bindungen:
 * dann die bedingte Verteilung der Mittelränge (Fachblatt G9, R 4.6 rechnet so). `p` ist der exakte Wert, `pNaeherung` bleibt daneben, `exakt` sagt, welcher gezeigt wird; `pGroesser` / `pKleiner`
 * sind die einseitigen Werte. Wilcoxon: Paare mit Differenz 0 entfallen vor dem Ranken (SPSS und Lehrbuch; R 4.6 rankt sie mit, Pratt - darum können Werte von R abweichen), auch beim Hodges-Lehmann-KI.
 * Das Hodges-Lehmann-KI folgt demselben Test (R: exaktes KI mit erreichtem Niveau). Einziger Unterschied zu R im genäherten Fall: R rechnet in der Voreinstellung mit Stetigkeitskorrektur, Statable (wie SPSS/PSPP) ohne.
 *
 * Vorschlagsregel (Abschlusstest F5): |Schiefe| > 1, Ausreißer oder gestufte Messgröße - nicht mehr die Gruppengröße. Die Wahl der Effektstärken (r = |z| / √N; Rang-biseriale
 *   Korrelation; ε² = H / (n − 1)), bei Wilcoxon N = Zahl aller Paare mit beiden Werten (auch die mit Differenz 0), und Dunn mit Holm als Paarvergleich.
 */
import { chiQuadratP, normal } from './verteilung';
import { pk } from './befehlstext';
import { kleinste, groesste } from './menge';
import { ausreisserWerte } from './datencheck';
import type { StufenGrund } from './stufen';
import type { Friedman } from './friedman';
import type { WeitereErgebnis } from './rangweitereblatt';
import { EXAKT_UNTER, type HlIndex, hlIndexEins, hlIndexZwei, pAeusserste, pMannWhitneyExakt, pWilcoxonExakt, verdoppelt, verteilungRangsumme, verteilungVorzeichen } from './exakteTests';

/** Ab dieser Schiefe (Betrag) schlägt Statable den Rangtest vor - dieselbe Schwelle wie bei der Verteilung (SCHIEFE_SCHWELLE in ergebnis.ts). */
export const RANG_SCHIEFE = 1;

/** Mittlere Ränge (Bindungen bekommen den Mittelwert) und die Summe Σ(t³ − t) über alle Gruppen gleicher Werte. */
export function rangDaten(werte: number[]): { rang: number[]; bindung: number } {
  const ix = werte.map((_, i) => i).sort((a, b) => werte[a]! - werte[b]!);
  const rang = new Array<number>(werte.length); let bindung = 0;
  for (let i = 0; i < ix.length;) {
    let j = i; while (j + 1 < ix.length && werte[ix[j + 1]!] === werte[ix[i]!]) j++;
    const t = j - i + 1, mitte = (i + j) / 2 + 1;
    for (let k = i; k <= j; k++) rang[ix[k]!] = mitte;
    bindung += t * t * t - t; i = j + 1;
  }
  return { rang, bindung };
}

export const median = (w: number[]): number => {
  if (!w.length) return NaN;
  const a = [...w].sort((x, y) => x - y), m = a.length >> 1;
  return a.length % 2 ? a[m]! : (a[m - 1]! + a[m]!) / 2;
};

/** Schiefe wie SPSS/PSPP (G1, mit Korrektur für kleine Stichproben); NaN unter 3 Werten oder ohne Streuung. */
export function schiefe(w: number[]): number {
  const n = w.length; if (n < 3) return NaN;
  const m = w.reduce((a, b) => a + b, 0) / n; let s2 = 0, s3 = 0;
  for (const v of w) { const d = v - m; s2 += d * d; s3 += d * d * d; }
  if (s2 === 0) return NaN;
  const sd = Math.sqrt(s2 / (n - 1));
  return n / ((n - 1) * (n - 2)) * s3 / (sd * sd * sd);
}

/** p zweiseitig aus z (Normalnäherung). */
export const pZweiseitig = (z: number): number => Math.min(1, 2 * normal(-Math.abs(z)));

/** Holm-Anpassung (wie R p.adjust(method = "holm")): aufsteigend sortiert mit (m − Rang + 1), nie fallend, höchstens 1. */
export function holm(p: number[]): number[] {
  const m = p.length, ix = p.map((_, i) => i).sort((a, b) => p[a]! - p[b]!), aus = new Array<number>(m);
  let vor = 0;
  ix.forEach((i, k) => { vor = Math.max(vor, Math.min(1, (m - k) * p[i]!)); aus[i] = vor; });
  return aus;
}

/** Warum ein Rangtest passt (Abschlusstest F5): deutliche Schiefe (größter Betrag über 1, in einer Gruppe bzw. bei den Veränderungen), sehr auffällige
 *  Einzelwerte (Regel des Daten-Checks, datencheck.ts: außerhalb 2,2 · IQR und deutlich getrennt) oder eine gestufte Messgröße (ordinal oder höchstens 7 Werte,
 *  dieselbe Regel wie bei der Korrelation, stufen.ts). Die Gruppengröße allein ist kein Grund mehr: Bei symmetrischen Daten ohne Ausreißer hält der Test nach
 *  Welch auch bei kleinen Gruppen (Rasch, Kubinger & Moder 2011; Fagerland 2012), der Rangtest prüft eine andere Hypothese.
 *  `klein` steht nur noch in alten Projektdateien und zählt nicht. */
export interface RangVorschlag { schief: number | null; ausreisser?: number | null; stufen?: StufenGrund | null; /** alt, ohne Bedeutung */ klein?: number | null }
export function rangVorschlag(gruppen: number[][], stufen: StufenGrund | null = null): RangVorschlag {
  const sk = gruppen.map(schiefe).filter(Number.isFinite);
  const schiefMax = sk.length ? groesste(sk.map(Math.abs)) : NaN;
  // Ausreißer über alle Werte zusammen - wie der Daten-Check, der dieselben Werte in der Prüfliste nennt (je Gruppe greift die Regel unter 15 verschiedenen Werten nicht)
  const aus = ausreisserWerte(gruppen.flat()).length;
  return { schief: Number.isFinite(schiefMax) && schiefMax > RANG_SCHIEFE ? schiefMax : null, ausreisser: aus || null, stufen };
}
export const sprichtFuerRang = (v: RangVorschlag) => v.schief !== null || !!v.ausreisser || !!v.stufen;

export interface RangGruppe { name: string; n: number; median: number; mittlererRang: number; rangsumme: number }

/* ---------------------------------------------------------------- Hodges-Lehmann */
/** Schätzer mit 95-%-KI. Mann-Whitney: Median aller Differenzen a − b (Lageverschiebung); Wilcoxon: Median aller Walsh-Mittel (dᵢ + dⱼ) / 2, i ≤ j (Pseudo-Median) der Differenzen OHNE die Nullen.
 *  Exakt (Mann-Whitney: jede Gruppe unter 50; Wilcoxon: weniger als 50 Differenzen ohne Nullen), auch bei Bindungen: die Grenzen kommen wie in R (`wilcox.test(conf.int = TRUE)`,
 *  `.wilcox_test_two_cint_exact` / `…_one_…`) aus der bedingten Verteilung der Mittelränge, das erreichte Niveau steht in `niveau` (mindestens ,95, bei kleinen Werten meist darüber).
 *  Darüber kehrt das KI die Normalnäherung mit Bindungskorrektur um (ohne Stetigkeitskorrektur): es enthält genau die Verschiebungen, die der Test bei ,05 nicht verwirft; die Grenze ist
 *  die Stelle, an der z die Schranke ±1,96 überspringt (R sucht sie mit `uniroot`, Genauigkeit 1e-4). Der Schätzer ist der Median der Differenzen (wie R im exakten Fall).
 *  Kein Intervall (`unten` = `oben` = null, `ohneKi`): eine Grenze ist unendlich (zu wenige Werte) oder das erreichte Niveau liegt bei ≥ 99,95 %. Der Schätzer bleibt.
 *  `null` über GRENZE_HL Differenzen (Speicher). Prüfwerte: scripts/rangtests-erwartet.R, scripts/rangtests-bindungen-erwartet.R. */
export interface HodgesLehmann {
  schaetzer: number; unten: number | null; oben: number | null;
  /** Zu wenige Werte für ein sinnvolles 95-%-Intervall: es gibt keine Grenzen, nur den Schätzer. */
  ohneKi?: boolean;
  /** Exaktes KI: `niveau` = erreichtes Niveau (0 … 1, mindestens ,95). */
  exakt?: boolean; niveau?: number;
}
const Z975 = 1.959963984540054;
export const GRENZE_HL = 4_000_000;
const rund = (v: number) => Number(v.toPrecision(12));
const TOLER = 10 * Number.EPSILON;
/** Ab diesem erreichten Niveau gibt es kein sinnvolles Intervall (R-Grenzen praktisch unendlich). */
const NIVEAU_OHNE_KI = 0.9995;

function medianFeld(a: Float64Array): number { const m = a.length >> 1; return a.length % 2 ? a[m]! : (a[m - 1]! + a[m]!) / 2; }
function eindeutig(a: Float64Array): number[] { const c: number[] = []; for (const v of a) if (!c.length || v !== c[c.length - 1]) c.push(v); return c; }

/** Ergebnis mit der Regel „kein Intervall“ (unendliche Grenze oder Niveau ≥ 99,95 %). */
function hlErgebnis(schaetzer: number, unten: number, oben: number, exakt?: { niveau: number }): HodgesLehmann {
  const kein = !Number.isFinite(unten) || !Number.isFinite(oben) || (!!exakt && exakt.niveau >= NIVEAU_OHNE_KI);
  const ex = exakt ? { exakt: true, niveau: exakt.niveau } : {};
  return kein ? { schaetzer, unten: null, oben: null, ohneKi: true, ...ex } : { schaetzer, unten, oben, ...ex };
}

/** Grenze des KI wie R `root(zq)`: `z(d)` fällt mit d; gesucht ist die Differenz, an der z(d) − zq von > 0 auf < 0 springt. */
function wurzel(c: number[], z: (d: number) => number, zq: number): number {
  const m = c.length;
  if (!(z(c[0]!) - zq > 0)) return c[0]!;
  if (!(z(c[m - 1]!) - zq < 0)) return c[m - 1]!;
  const mitte = (k: number) => (k >= m ? c[m - 1]! + 1 : (c[k - 1]! + c[k]!) / 2);
  let lo = 1, hi = m;   // erstes k mit z(mitte(k)) < zq; die Grenze ist c[k − 1]
  while (lo < hi) { const k = (lo + hi) >> 1; if (z(mitte(k)) - zq < 0) hi = k; else lo = k + 1; }
  return c[lo - 1]!;
}
function hlAus(diffs: Float64Array, z: (d: number) => number, exakt?: HlIndex): HodgesLehmann | null {
  diffs.sort();
  const schaetzer = medianFeld(diffs);
  if (exakt) return exakt.unten === 0
    ? hlErgebnis(schaetzer, -Infinity, Infinity, { niveau: 1 })
    : hlErgebnis(schaetzer, diffs[exakt.unten - 1]!, diffs[exakt.oben - 1]!, { niveau: exakt.niveau });
  const c = eindeutig(diffs);
  if (c.length < 2) return { schaetzer, unten: null, oben: null, ohneKi: true };   // alle Differenzen gleich: keine Streuung, kein Intervall
  const unten = wurzel(c, z, Z975), oben = wurzel(c, z, -Z975);
  return Number.isFinite(unten) && Number.isFinite(oben) ? hlErgebnis(schaetzer, unten, oben) : null;
}

/** Eine Prüfstelle der exakten Suche: Mittelpunkt zweier benachbarter Differenzen (gleiche Mittelpunkte, also gleiche Differenzen, sind zusammengefasst: dort fallen Werte zusammen).
 *  `lo` = die Differenz am Anfang des Abschnitts, `hi` = die am Ende (R: `diffs[k]` bzw. `diffs[k + 1]`). */
interface Stelle { mid: number; lo: number; hi: number }
function stellen(d: Float64Array): Stelle[] {
  const aus: Stelle[] = [];
  for (let k = 0; k + 1 < d.length; k++) {
    const mid = (d[k]! + d[k + 1]!) / 2, letzte = aus[aus.length - 1];
    if (letzte && letzte.mid === mid) letzte.hi = d[k + 1]!; else aus.push({ mid, lo: d[k]!, hi: d[k + 1]! });
  }
  return aus;
}
/** Exaktes KI bei Bindungen, Übertragung von R (`lower()` / `upper()` in `.wilcox_test_*_cint_exact`): `ptail(mu, unteres)` = Wahrscheinlichkeit des unteren bzw. oberen Schwanzes bei Verschiebung `mu`.
 *  R prüft die Stellen der Reihe nach; hier genügt eine Halbierung, weil der Schwanz mit mu monoton wächst bzw. fällt. `extremUnten` / `extremOben`: Schwanz bei Verschiebung weit unter / über allen Differenzen. */
function exakteGrenzen(d: Float64Array, ptail: (mu: number, unteres: boolean) => number, extremUnten: number, extremOben: number, alpha = 0.025): { unten: number; oben: number; niveau: number } {
  const S = stellen(d), a = alpha + TOLER, n = S.length;
  const gemerkt = new Map<string, number>();
  const p = (c: number, unteres: boolean) => { const k = `${c}${unteres ? 'u' : 'o'}`; let v = gemerkt.get(k); if (v === undefined) { v = ptail(S[c]!.mid, unteres); gemerkt.set(k, v); } return v; };
  let unten = -Infinity, piU = 0, oben = Infinity, piO = 0;
  if (!(extremUnten > a)) {   // untere Grenze: der obere Schwanz wächst mit der Stelle
    let lo = 0, hi = n; while (lo < hi) { const m = (lo + hi) >> 1; if (p(m, false) > a) hi = m; else lo = m + 1; }
    if (lo === n) { unten = d[d.length - 1]!; piU = n ? p(n - 1, false) : 0; } else { unten = S[lo]!.lo; piU = lo > 0 ? p(lo - 1, false) : 0; }
  }
  if (!(extremOben > a)) {   // obere Grenze: der untere Schwanz fällt mit der Stelle
    let lo = 0, hi = n; while (lo < hi) { const m = (lo + hi) >> 1; if (p(m, true) > a) lo = m + 1; else hi = m; }
    if (lo === 0) { oben = d[0]!; piO = n ? p(0, true) : 0; } else { oben = S[lo - 1]!.hi; piO = lo - 1 < n - 1 ? p(lo, true) : 0; }
  }
  return { unten, oben, niveau: 1 - (piU + piO) };
}

/** Lageverschiebung a − b (Mann-Whitney). */
export function hodgesLehmannZwei(a: number[], b: number[]): HodgesLehmann | null {
  const na = a.length, nb = b.length, N = na + nb;
  if (na < 1 || nb < 1 || na * nb > GRENZE_HL) return null;
  const diffs = new Float64Array(na * nb); let k = 0;
  for (const x of a) for (const y of b) diffs[k++] = rund(x - y);
  const yr = b.map(rund);
  const z = (d: number) => {
    const { rang, bindung } = rangDaten([...a.map(x => rund(x - d)), ...yr]);
    let ra = 0; for (let i = 0; i < na; i++) ra += rang[i]!;
    const sigma = Math.sqrt(na * nb / 12 * ((N + 1) - bindung / (N * (N - 1))));
    return (ra - na * (na + 1) / 2 - na * nb / 2) / sigma;
  };
  if (!(na < EXAKT_UNTER && nb < EXAKT_UNTER)) return hlAus(diffs, z);
  if (rangDaten([...a, ...b]).bindung === 0) return hlAus(diffs, z, hlIndexZwei(na, nb));
  // Bindungen: bedingte Verteilung der Mittelränge, Grenzen wie R. Werte und Differenzen auf 12 gültige Stellen gerundet, immer (Fachblatt, Nachtrag): R selbst ist bei Kommazahlen
  // durch Gleitkomma-Rauschen nicht verlässlich; Sollwert ist R auf ganzzahlig skalierten Werten.
  diffs.sort();
  const punkte = (mu: number) => verdoppelt(rangDaten([...a.map(x => rund(x - mu)), ...yr]).rang);
  const ptail = (mu: number, unteres: boolean) => {
    const p2 = punkte(mu); let w2 = 0; for (let i = 0; i < na; i++) w2 += p2[i]!;
    const v = verteilungRangsumme(p2, na);
    return unteres ? v.kl(w2) : v.gr(w2);
  };
  const g = exakteGrenzen(diffs, ptail, pAeusserste(punkte(diffs[0]! - 1), na, true), pAeusserste(punkte(diffs[diffs.length - 1]! + 1), na, false));
  return hlErgebnis(medianFeld(diffs), g.unten, g.oben, { niveau: g.niveau });
}

/** Pseudo-Median der Differenzen (Wilcoxon, verbunden); `d` = die Differenzen nachher − vorher OHNE die Nullen (die entfallen vor dem Ranken, Fachblatt G9). */
export function hodgesLehmannEins(d0: number[]): HodgesLehmann | null {
  const d = d0.map(rund).filter(x => x !== 0), n = d.length, anzahl = n * (n + 1) / 2;
  if (n === 1) return hlErgebnis(d[0]!, -Infinity, Infinity, { niveau: 1 });   // eine einzige Veränderung: Schätzer, aber kein Intervall (wie R)
  if (n < 2 || anzahl > GRENZE_HL) return null;
  const w = new Float64Array(anzahl); let k = 0;
  for (let i = 0; i < n; i++) for (let j = i; j < n; j++) w[k++] = rund((d[i]! + d[j]!) / 2);
  const z = (mu: number) => {
    const xd = d.map(x => rund(x - mu)).filter(x => x !== 0), m = xd.length;
    if (!m) return NaN;
    const { rang, bindung } = rangDaten(xd.map(Math.abs));
    let vp = 0; xd.forEach((x, i) => { if (x > 0) vp += rang[i]!; });
    return (vp - m * (m + 1) / 4) / Math.sqrt(m * (m + 1) * (2 * m + 1) / 24 - bindung / 48);
  };
  if (!(n < EXAKT_UNTER)) return hlAus(w, z);
  if (rangDaten(d.map(x => Math.abs(rund(x)))).bindung === 0) return hlAus(w, z, hlIndexEins(n));
  // Bindungen: Vorzeichenbelegungen der festen Mittelränge, Grenzen wie R (der Schwanz „größer“ ist hier strikt: P(V > v)). Gerundet wie oben.
  w.sort();
  const ptail = (mu: number, unteres: boolean) => {
    const x = d.map(v => rund(v - mu)), { rang } = rangDaten(x.map(Math.abs)), p2 = verdoppelt(rang);
    let v2 = 0; x.forEach((xi, i) => { if (xi > 0) v2 += p2[i]!; });
    const v = verteilungVorzeichen(p2);
    return unteres ? v.kl(v2) : v.gr(v2 + 1);
  };
  const g = exakteGrenzen(w, ptail, 0, 2 ** -n);
  return hlErgebnis(medianFeld(w), g.unten, g.oben, { niveau: g.niveau });
}

/* ---------------------------------------------------------------- Mann-Whitney-U */
/** Zwei unabhängige Gruppen. `uA`/`uB` sind die U-Werte der beiden Gruppen (uA + uB = nA·nB), `u` der kleinere (wie PSPP und SPSS); `z` > 0 heißt: Gruppe A liegt höher.
 *  `r` = |z| / √N; `rrb` = 2·uA / (nA·nB) − 1 (Rang-biseriale Korrelation, > 0 heißt: Gruppe A liegt höher); `ueberlegen` = uA / (nA·nB) = Wahrscheinlichkeit, dass ein Wert aus A über einem aus B liegt (Gleichstand zählt halb). */
export interface MannWhitney {
  art: 'mann-whitney'; abhaengig: string; gruppenSpalte: string;
  a: RangGruppe; b: RangGruppe; n: number; uA: number; uB: number; u: number; z: number; p: number; r: number; rrb: number; ueberlegen: number;
  /** `exakt`: p ist der exakte Wert (je Gruppe < 50, auch bei Bindungen: bedingte Verteilung der Mittelränge); sonst die Normalnäherung. `pNaeherung` ist die Normalnäherung immer (zum Vergleich).
   *  `p` ist zweiseitig (wie R: `min(1, 2·min(P(S ≤ s), P(S ≥ s)))`), `pGroesser` einseitig „Gruppe A liegt höher“, `pKleiner` die Gegenrichtung. */
  exakt: boolean; pNaeherung: number; pGroesser: number; pKleiner: number;
  /** Gibt es gleiche Werte (Bindungen)? Dann ist der exakte p-Wert die bedingte Verteilung. */
  bindungen: boolean;
  /** Hodges-Lehmann-Verschiebung a − b mit 95-%-KI (`null` bei sehr großen Gruppen). */
  hl: HodgesLehmann | null;
  vorschlag: RangVorschlag;
}
export function mannWhitney(abhaengig: string, gruppenSpalte: string, ga: { name: string; werte: number[] }, gb: { name: string; werte: number[] }, stufen: StufenGrund | null = null): MannWhitney | null {
  const na = ga.werte.length, nb = gb.werte.length, N = na + nb;
  if (na < 1 || nb < 1 || N < 3) return null;
  // Werte auf 12 gültige Stellen runden, bevor gerankt wird (Kommazahlen: 0,3 − 0,1 und 0,2 sind dieselbe Zahl)
  const wa = ga.werte.map(rund), wb = gb.werte.map(rund);
  const { rang, bindung } = rangDaten([...wa, ...wb]);
  const ra = rang.slice(0, na).reduce((x, y) => x + y, 0), rb = rang.slice(na).reduce((x, y) => x + y, 0);
  const uA = ra - na * (na + 1) / 2, uB = na * nb - uA;
  // Alle Werte gleich: sigma = 0, es gibt keinen Unterschied (z = 0, p = 1) - kein Absturz
  const sigma = Math.sqrt(na * nb / 12 * ((N + 1) - bindung / (N * (N - 1))));
  const z = sigma > 0 ? (uA - na * nb / 2) / sigma : 0, pN = pZweiseitig(z), exakt = na < EXAKT_UNTER && nb < EXAKT_UNTER;
  let p = pN, pGroesser = normal(-z), pKleiner = normal(z);
  if (exakt) {
    if (bindung === 0) { p = pMannWhitneyExakt(uA, na, nb); pGroesser = pMannWhitneyExakt(uA, na, nb, 'gross'); pKleiner = pMannWhitneyExakt(uA, na, nb, 'klein'); }
    else {   // bedingte Verteilung bei den beobachteten Bindungen
      const v = verteilungRangsumme(verdoppelt(rang), na), s2 = Math.round(2 * ra);
      pKleiner = v.kl(s2); pGroesser = v.gr(s2); p = Math.min(1, 2 * Math.min(pKleiner, pGroesser));
    }
  }
  return {
    art: 'mann-whitney', abhaengig, gruppenSpalte,
    a: { name: ga.name, n: na, median: median(ga.werte), mittlererRang: ra / na, rangsumme: ra },
    b: { name: gb.name, n: nb, median: median(gb.werte), mittlererRang: rb / nb, rangsumme: rb },
    n: N, uA, uB, u: Math.min(uA, uB), z, p, exakt, pNaeherung: pN, pGroesser, pKleiner, bindungen: bindung > 0, r: Math.abs(z) / Math.sqrt(N), rrb: 2 * uA / (na * nb) - 1, ueberlegen: uA / (na * nb),
    hl: hodgesLehmannZwei(wa, wb),
    vorschlag: rangVorschlag([ga.werte, gb.werte], stufen)
  };
}

/* ---------------------------------------------------------------- Kruskal-Wallis und Dunn */
/** Ein Paar im Dunn-Test: `z` = (mittlerer Rang von `j` − mittlerer Rang von `i`) / Standardfehler (i < j, in der Reihenfolge der Gruppen), `p` ohne, `pHolm` mit Anpassung. */
export interface DunnPaar { i: number; j: number; z: number; p: number; pHolm: number }
export interface KruskalWallis {
  art: 'kruskal-wallis'; abhaengig: string; gruppenSpalte: string;
  gruppen: RangGruppe[]; n: number; h: number; df: number; p: number; eps2: number; dunn: DunnPaar[];
  /** Die Rohnamen der Gruppen (Werte der Gruppenspalte), damit Sätze und Tabellen die Wertebeschriftung in der gewählten Sprache nehmen können. */
  werte: string[];
  vorschlag: RangVorschlag;
}
export function kruskalWallis(abhaengig: string, gruppenSpalte: string, gruppen: { wert: string; name: string; werte: number[] }[], stufen: StufenGrund | null = null): KruskalWallis | null {
  const g = gruppen.filter(x => x.werte.length >= 1), k = g.length, N = g.reduce((a, x) => a + x.werte.length, 0);
  if (k < 2 || N < 3) return null;
  const alle = g.flatMap(x => x.werte), { rang, bindung } = rangDaten(alle);
  const korr = 1 - bindung / (N * N * N - N);
  if (!(korr > 0)) return null;
  let pos = 0, summe = 0;
  const rg: RangGruppe[] = g.map(x => {
    const rs = rang.slice(pos, pos + x.werte.length).reduce((a, b) => a + b, 0); pos += x.werte.length; summe += rs * rs / x.werte.length;
    return { name: x.name, n: x.werte.length, median: median(x.werte), mittlererRang: rs / x.werte.length, rangsumme: rs };
  });
  const h = (12 / (N * (N + 1)) * summe - 3 * (N + 1)) / korr, df = k - 1;
  const s2 = N * (N + 1) / 12 - bindung / (12 * (N - 1)), paare: DunnPaar[] = [];
  for (let i = 0; i < k; i++) for (let j = i + 1; j < k; j++) {
    const z = (rg[j]!.mittlererRang - rg[i]!.mittlererRang) / Math.sqrt(s2 * (1 / rg[i]!.n + 1 / rg[j]!.n));
    paare.push({ i, j, z, p: pZweiseitig(z), pHolm: NaN });
  }
  const ph = holm(paare.map(q => q.p)); paare.forEach((q, i) => { q.pHolm = ph[i]!; });
  return {
    art: 'kruskal-wallis', abhaengig, gruppenSpalte, gruppen: rg, n: N, h, df, p: chiQuadratP(h, df), eps2: Math.min(1, Math.max(0, h / (N - 1))), dunn: paare,
    werte: g.map(x => x.wert), vorschlag: rangVorschlag(g.map(x => x.werte), stufen)
  };
}

/* ---------------------------------------------------------------- Wilcoxon (gepaart) */
/** Zwei Messungen derselben Personen. Differenz = nachher − vorher; Paare mit Differenz 0 fallen weg (`nNull`, wie PSPP „Ties“). `z` > 0 heißt: nachher liegt höher.
 *  `n` = alle Paare mit beiden Werten (auch die mit Differenz 0), `r` = |z| / √n; `rrb` = (V+ − V−) / (V+ + V−) (Rang-biseriale Korrelation für Paare). */
export interface Wilcoxon {
  art: 'wilcoxon'; vorher: string; nachher: string; n: number; nNull: number; /** Paare im Test (ohne die ohne Unterschied) = n − nNull. */ nTest: number; nPlus: number; nMinus: number; vPlus: number; vMinus: number;
  medianVorher: number; medianNachher: number; medianDiff: number; z: number; p: number; r: number; rrb: number;
  /** Wie bei Mann-Whitney: exakt, wenn die Paare ohne Differenz 0 unter 50 sind (auch bei Bindungen: bedingte Verteilung der Mittelränge). `pGroesser`: „nachher liegt höher“, `pKleiner` die Gegenrichtung. */
  exakt: boolean; pNaeherung: number; pGroesser: number; pKleiner: number;
  /** Gibt es gleich große Veränderungen (Bindungen unter den Beträgen)? */
  bindungen: boolean;
  /** Pseudo-Median (Hodges-Lehmann) der Veränderung nachher − vorher mit 95-%-KI, aus den Differenzen ohne Nullen. */
  hl: HodgesLehmann | null;
  vorschlag: RangVorschlag;
}
/** Warum `wilcoxon` null liefert: genau ein Paar mit Unterschied (`einPaar`) oder keines (`keinUnterschied`); sonst `null` (der Test lässt sich rechnen oder es sind zu wenige Paare). Differenzen auf 12 Stellen gerundet. */
export function wilcoxonGrund(paare: [number, number][]): 'einPaar' | 'keinUnterschied' | null {
  const m = paare.filter(([a, b]) => Number((b - a).toPrecision(12)) !== 0).length;
  return paare.length >= 1 && m === 0 ? 'keinUnterschied' : m === 1 ? 'einPaar' : null;
}
export function wilcoxon(vorher: string, nachher: string, paare: [number, number][], stufen: StufenGrund | null = null): Wilcoxon | null {
  const n = paare.length;
  if (n < 2) return null;
  // Differenzen auf 12 geltende Stellen runden: 2,2 − 2,1 und 1,2 − 1,1 sind dieselbe Differenz, auch wenn die Gleitkommazahlen sie um 1e-16 trennen.
  const d = paare.map(([a, b]) => Number((b - a).toPrecision(12))), nz = d.filter(x => x !== 0), m = nz.length;
  if (m < 2) return null;   // weniger als 2 Paare mit Unterschied: kein Test (Grund: wilcoxonGrund)
  const { rang, bindung } = rangDaten(nz.map(Math.abs));
  let vp = 0, vm = 0, np = 0, nm = 0;
  nz.forEach((x, i) => { if (x > 0) { vp += rang[i]!; np++; } else { vm += rang[i]!; nm++; } });
  const sigma = Math.sqrt(m * (m + 1) * (2 * m + 1) / 24 - bindung / 48);
  if (!(sigma > 0)) return null;
  const z = (vp - m * (m + 1) / 4) / sigma, pN = pZweiseitig(z), exakt = m < EXAKT_UNTER;
  let p = pN, pGroesser = normal(-z), pKleiner = normal(z);
  if (exakt) {
    if (bindung === 0) { p = pWilcoxonExakt(vp, m); pGroesser = pWilcoxonExakt(vp, m, 'gross'); pKleiner = pWilcoxonExakt(vp, m, 'klein'); }
    else {   // bedingte Verteilung bei den beobachteten Bindungen
      const v = verteilungVorzeichen(verdoppelt(rang)), v2 = Math.round(2 * vp);
      pKleiner = v.kl(v2); pGroesser = v.gr(v2); p = Math.min(1, 2 * Math.min(pKleiner, pGroesser));
    }
  }
  return {
    art: 'wilcoxon', vorher, nachher, n, nNull: n - m, nTest: m, nPlus: np, nMinus: nm, vPlus: vp, vMinus: vm,
    medianVorher: median(paare.map(p => p[0])), medianNachher: median(paare.map(p => p[1])), medianDiff: median(d),
    z, p, exakt, pNaeherung: pN, pGroesser, pKleiner, bindungen: bindung > 0, r: Math.abs(z) / Math.sqrt(n), rrb: (vp - vm) / (vp + vm), hl: hodgesLehmannEins(nz),
    vorschlag: rangVorschlag([d], stufen)
  };
}

/** Mann-Whitney, Kruskal-Wallis, Wilcoxon und (seit G5, drei und mehr Messungen) Friedman; seit Welle S-B zusätzlich die weiteren Rangtests
 *  (Vorzeichentest, Mediantest, Jonckheere-Terpstra, Kolmogorov-Smirnov; rangweitereblatt.ts). */
export type RangErgebnis = MannWhitney | KruskalWallis | Wilcoxon | Friedman | WeitereErgebnis;

/** Der PSPP-Befehl zum selben Test (für die Seite „Befehle“; Statable rechnet selbst, PSPP liefert dieselben U, z bzw. H und p). `syntax`: der Befehl des Blatts (T-TEST nennt die beiden Gruppenwerte). */
export function rangBefehl(r: RangErgebnis, syntax = ''): string {
  if (r.art === 'friedman') return `NPAR TESTS /FRIEDMAN=${r.zeitpunkte.join(' ')}.`;
  if (r.art === 'wilcoxon') return `NPAR TESTS /WILCOXON=${r.vorher} WITH ${r.nachher} (PAIRED).`;
  if (r.art === 'vorzeichen') return `NPAR TESTS /SIGN=${r.vorher} WITH ${r.nachher} (PAIRED).`;
  if (r.art === 'median') { const c = r.werte.map(Number); return c.every(Number.isFinite) ? `NPAR TESTS /MEDIAN=${r.abhaengig} BY ${r.gruppenSpalte}(${kleinste(c)} ${groesste(c)}).` : `* NPAR TESTS /MEDIAN braucht Zahlen als Gruppenwerte (Gruppenspalte ${pk(r.gruppenSpalte)}).`; }
  if (r.art === 'jt') return `* Jonckheere-Terpstra: PSPP (NPAR TESTS /JONCKHEERE-TERPSTRA) rechnet bei gleichen Werten falsch (zu kleine Prüfgröße); Statable rechnet selbst.`;
  if (r.art === 'ks') return `* Kolmogorov-Smirnov für zwei Stichproben kennt PSPP 2.1.3 nicht; Statable rechnet selbst.`;
  if (r.art === 'mann-whitney') {
    const m = /GROUPS=(\S+?)\(([^)]*)\)\s*\/VARIABLES=(\S+?)\./.exec(syntax);
    return `NPAR TESTS /M-W=${m ? m[3] : r.abhaengig} BY ${m ? m[1] : r.gruppenSpalte}(${m ? m[2] : '1 2'}).`;
  }
  const codes = r.werte.map(Number);
  return codes.every(Number.isFinite) ? `NPAR TESTS /K-W=${r.abhaengig} BY ${r.gruppenSpalte}(${kleinste(codes)} ${groesste(codes)}).` : `* NPAR TESTS /K-W braucht Zahlen als Gruppenwerte (Gruppenspalte ${pk(r.gruppenSpalte)}).`;
}
