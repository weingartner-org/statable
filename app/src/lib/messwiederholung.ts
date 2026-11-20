/**
 * Varianzanalyse mit Messwiederholung: einfaktoriell innerhalb (eine Gruppe von Personen, k Zeitpunkte) und gemischt
 * (zusätzlich eine Gruppenspalte, g Gruppen × k Zeitpunkte). PSPP 2.1.1 kann das nicht (GLM kennt kein WSFACTOR,
 * MANOVA ist „not yet implemented“) - deshalb eigener Code auf den Rohdaten, nur vollständige Fälle.
 *
 * Geprüft gegen R: `afex::aov_ez` (Quadratsummen Typ III, Mauchly, Greenhouse-Geisser, Huynh-Feldt, partielles und
 * generalisiertes η²), `emmeans::pairs(adjust = "bonferroni")`, `stats::mauchly.test`
 * (scripts/messwiederholung-erwartet.R, Tests: messwiederholung.test.ts).
 *
 * ⚠ Von der Fachperson abzunehmen:
 *  - Quadratsummen Typ III (wie afex, SPSS, jamovi): bei ungleich großen Gruppen testet der Zeiteffekt die ungewichteten
 *    Mittel der Gruppen. Bei gleich großen Gruppen sind alle Typen gleich.
 *  - Berichtet wird standardmäßig die Greenhouse-Geisser-Korrektur, unabhängig vom Mauchly-Test (afex-Standard; der
 *    Mauchly-Test ist bei kleinen Stichproben schwach, bei großen übersensibel). Huynh-Feldt und „keine Korrektur“ sind im Blatt wählbar.
 *  - Huynh-Feldt-ε nach Lecoutre (1991), wie R `car`/`afex`: ((N−g+1)·p·ε − 2) / (p·(N−g − p·ε)), höchstens 1.
 *  - KI für partielles η²: nichtzentrales F wie `effectsize::eta_squared` (zweiseitig), mit den unkorrigierten Freiheitsgraden,
 *    damit der Punktwert im Intervall liegt. KI für generalisiertes η²: dieselben Grenzen von λ, umgerechnet über
 *    SS_Effekt/SS_Fehler = λ/df₂ und die beobachteten übrigen Fehlerquadratsummen - eine Näherung, die R nicht anbietet.
 *  - Paarweise Vergleiche: gepaarte t-Tests (bei Gruppen mit der gepoolten Streuung der Differenzen, Mittel der Gruppenmittel
 *    wie emmeans), p und KI nach Bonferroni angepasst.
 */
import { betai, tQuantil } from './verteilung';
import { chi2Verteilung } from './power';
import { eta2Bereich } from './effektki';
import { L, mitFlag } from './sitzung.svelte';
import { polyGewichte, vorlage, ganzzahlig } from './kontraste';
import { holm } from './rangtests';

export type MwKorrektur = 'gg' | 'hf' | 'keine';

export interface MwSphaerizitaet {
  /** Mauchlys W; NaN, wenn die Kovarianzmatrix nicht regulär ist (zu wenige Personen). */
  w: number; chi2: number; df: number; p: number;
  /** Greenhouse-Geisser-ε und Huynh-Feldt-ε (1 = Sphärizität erfüllt; untere Grenze 1/(k−1)). */
  gg: number; hf: number;
}
export interface MwEffekt {
  quelle: 'zeit' | 'gruppe' | 'wechsel';
  ss: number; df: number; ssFehler: number; dfFehler: number; msFehler: number; f: number;
  /** p ohne Korrektur und mit Greenhouse-Geisser bzw. Huynh-Feldt (Freiheitsgrade mal ε) */
  p: number; pGG: number; pHF: number;
  etaP: number; etaPLo: number; etaPHi: number;
  etaG: number; etaGLo: number; etaGHi: number;
}
export interface MwZelle { n: number; m: number; sd: number; kiLo: number; kiHi: number }
export interface MwPaar {
  /** Indizes der Zeitpunkte: Differenz = späterer (j) minus früherer (i) */
  i: number; j: number; diff: number; se: number; df: number; t: number;
  p: number; pAnp: number; kiLo: number; kiHi: number; dz: number;
}
export interface Messwiederholung {
  art: 'messwiederholung';
  /** Spalten der Zeitpunkte in der Reihenfolge der Auswahl */
  zeitpunkte: string[];
  gruppenSpalte?: string;
  /** Namen der Gruppen (leer bei einfaktoriell) und Personenzahl je Gruppe */
  gruppen: { name: string; n: number }[];
  /** Personen mit allen Angaben und alle Zeilen der Daten */
  n: number; gesamt: number;
  /** Mittelwerte je Zeitpunkt über alle Personen (einfaktoriell) bzw. Mittel der Gruppenmittel (gemischt) */
  randmittel: number[];
  /** [Gruppe][Zeitpunkt] */
  zellen: MwZelle[][];
  sphaer: MwSphaerizitaet;
  korrektur: MwKorrektur;
  zeit: MwEffekt; gruppe?: MwEffekt; wechsel?: MwEffekt;
  /** Quadratsumme und Freiheitsgrade „Personen innerhalb der Gruppen“ */
  ssPersonen: number; dfPersonen: number;
  paare: MwPaar[];
}

/** Zweiseitiger p-Wert der t-Verteilung (genau auch für sehr kleine Werte). */
export const pT = (t: number, df: number) => betai(df / 2, 0.5, df / (df + t * t));
/** Obere Fläche der F-Verteilung (genau auch für sehr kleine Werte). */
export const pF = (f: number, d1: number, d2: number) => (f <= 0 ? 1 : betai(d2 / 2, d1 / 2, d2 / (d2 + d1 * f)));

export const summe = (a: number[]) => a.reduce((x, y) => x + y, 0);
export const mittel = (a: number[]) => summe(a) / a.length;

/** Determinante einer kleinen Matrix (Gauß mit Spaltenpivot). */
function det(m: number[][]): number {
  const n = m.length, a = m.map(r => [...r]);
  let d = 1;
  for (let c = 0; c < n; c++) {
    let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(a[r]![c]!) > Math.abs(a[p]![c]!)) p = r;
    if (Math.abs(a[p]![c]!) < 1e-300) return 0;
    if (p !== c) { [a[p], a[c]] = [a[c]!, a[p]!]; d = -d; }
    d *= a[c]![c]!;
    for (let r = c + 1; r < n; r++) { const f = a[r]![c]! / a[c]![c]!; for (let k = c; k < n; k++) a[r]![k]! -= f * a[c]![k]!; }
  }
  return d;
}

/** Orthonormale Kontraste der Zeitpunkte (Helmert, normiert): (k−1) Zeilen, k Spalten. */
export function helmertKontraste(k: number): number[][] {
  return Array.from({ length: k - 1 }, (_, i) => { const n = Math.sqrt((i + 1) * (i + 2)); return Array.from({ length: k }, (_, j) => (j <= i ? 1 / n : j === i + 1 ? -(i + 1) / n : 0)); });
}

const vergleich = (a: string | number, b: string | number) => (typeof a === 'number' && typeof b === 'number' ? a - b : String(a).localeCompare(String(b), 'de'));

/** Mauchly-Test und ε aus der gepoolten Quadratsummen-Kreuzproduktmatrix (SSD) der Kontraste; df = Personen − Gruppen. */
export function sphaerizitaet(ssd: number[][], dfe: number, k: number): MwSphaerizitaet {
  const p = k - 1, spur = ssd.reduce((a, r, i) => a + r[i]!, 0);
  const spur2 = ssd.reduce((a, r) => a + r.reduce((b, v) => b + v * v, 0), 0);
  const gg = Math.min(1, Math.max(1 / p, (spur * spur) / (p * spur2)));
  const hf = Math.min(1, Math.max(gg, ((dfe + 1) * p * gg - 2) / (p * (dfe - p * gg))));
  if (p < 2) return { w: 1, chi2: 0, df: 0, p: 1, gg: 1, hf: 1 };   // k = 2: nur ein Kontrast, Sphärizität gilt immer
  const d = det(ssd), logW = Math.log(d) - p * Math.log(spur / p);
  if (!(d > 0) || !Number.isFinite(logW) || dfe < p) return { w: NaN, chi2: NaN, df: p * (p + 1) / 2 - 1, p: NaN, gg, hf };
  // wie R `mauchly.test`: Korrektur der χ²-Näherung (Anderson 1984); „3 · k“ steht dort mit der Zahl der Zeitpunkte
  const rho = 1 - (2 * p * p + p + 2) / (6 * p * dfe);
  const w2 = ((p + 2) * (p - 1) * (p - 2) * (2 * p ** 3 + 6 * p * p + 3 * k + 2)) / (288 * (dfe * p * rho) ** 2);
  const chi2 = -dfe * rho * logW, df = p * (p + 1) / 2 - 1;
  const p1 = 1 - chi2Verteilung(chi2, df), p2 = 1 - chi2Verteilung(chi2, df + 4);
  return { w: Math.exp(logW), chi2, df, p: Math.min(1, Math.max(0, p1 + w2 * (p2 - p1))), gg, hf };
}

/**
 * Berechnet die Varianzanalyse. `daten`: eine Zeile je Person, eine Spalte je Zeitpunkt (nur vollständige Fälle);
 * `gruppen`: optional die Gruppe jeder Person (2 oder mehr Gruppen mit je mindestens 2 Personen).
 */
export function messwiederholung(daten: number[][], zeitpunkte: string[], gruppen?: (string | number)[], gruppenSpalte?: string, gesamt = daten.length): Messwiederholung {
  const N = daten.length, k = zeitpunkte.length;
  if (k < 2) throw new Error(L('Mindestens zwei Zeitpunkte nötig', 'At least two time points are needed'));
  const namen = gruppen ? [...new Set(gruppen)].sort(vergleich) : [''];
  const g = namen.length;
  const zu = gruppen ? gruppen.map(x => namen.indexOf(x)) : daten.map(() => 0);
  const idx = namen.map((_, q) => zu.flatMap((z, i) => (z === q ? [i] : [])));
  const ng = idx.map(l => l.length);
  if (ng.some(n => n < 2)) throw new Error(L('Jede Gruppe braucht mindestens 2 Personen', 'Each group needs at least 2 people'));
  const dfS = N - g, dfT = k - 1, dfE = dfS * dfT;
  if (dfS < 2) throw new Error(L('Zu wenige Personen', 'Too few people'));

  const alleM = mittel(daten.flat());
  const zeilenM = daten.map(r => mittel(r));
  const zelleM = idx.map(l => Array.from({ length: k }, (_, j) => mittel(l.map(i => daten[i]![j]!))));
  const gruppeM = idx.map(l => mittel(l.map(i => zeilenM[i]!)));

  // Quadratsummen
  const ssPers = k * summe(daten.map((_, i) => (zeilenM[i]! - gruppeM[zu[i]!]!) ** 2));
  let ssE = 0;
  for (let i = 0; i < N; i++) for (let j = 0; j < k; j++) ssE += (daten[i]![j]! - zeilenM[i]! - zelleM[zu[i]!]![j]! + gruppeM[zu[i]!]!) ** 2;
  // Zeiteffekt Typ III: ungewichtetes Mittel der Gruppenmittel je Zeitpunkt, Gewicht = harmonisches Mittel der Gruppengrößen mal Gruppenzahl
  const randM = Array.from({ length: k }, (_, j) => mittel(zelleM.map(z => z[j]!)));
  const nHarm = g / summe(ng.map(n => 1 / n));
  const randGM = mittel(randM);
  const ssT = g * nHarm * summe(randM.map(m => (m - randGM) ** 2));
  const ssG = k * summe(ng.map((n, q) => n * (gruppeM[q]! - alleM) ** 2));
  // Wechselwirkung: Quadratsumme zwischen den Gruppen an den Kontrastwerten der Zeit
  const ssGT = g > 1 ? summe(ng.map((n, q) => n * summe(Array.from({ length: k }, (_, j) => (zelleM[q]![j]! - gruppeM[q]! - mittel(daten.map(r => r[j]!)) + alleM) ** 2)))) : 0;
  if (!(ssE > 1e-12 * Math.max(1, ssT + ssPers))) throw new Error(L('Keine Streuung der Veränderung', 'No variation in the change'));

  // gepoolte SSD der Kontraste innerhalb der Gruppen
  const C = helmertKontraste(k);
  const y = daten.map(r => C.map(c => summe(c.map((v, j) => v * r[j]!))));
  const ssd = C.map((_, a) => C.map((__, b) => summe(idx.flatMap((l) => { const ma = mittel(l.map(i => y[i]![a]!)), mb = mittel(l.map(i => y[i]![b]!)); return l.map(i => (y[i]![a]! - ma) * (y[i]![b]! - mb)); }))));
  const sph = sphaerizitaet(ssd, dfS, k);

  const msE = ssE / dfE, msPers = ssPers / dfS;
  const effekt = (quelle: MwEffekt['quelle'], ss: number, df: number, ssF: number, dfF: number, eps: { gg: number; hf: number }): MwEffekt => {
    const f = ss / df / (ssF / dfF), [lo, hi] = eta2Bereich(f, df, dfF);
    const rest = ssPers + ssE;   // alle Fehlerquadratsummen (nichts ist „gemessen“ im Sinne von Olejnik & Algina: wie afex-Standard)
    const etaG = ss / (ss + rest);
    const gKi = (r: number) => r / (r + rest / ssF);
    const rLo = (lo / (1 - lo)) , rHi = (hi / (1 - hi));
    return {
      quelle, ss, df, ssFehler: ssF, dfFehler: dfF, msFehler: ssF / dfF, f,
      p: pF(f, df, dfF), pGG: pF(f, df * eps.gg, dfF * eps.gg), pHF: pF(f, df * eps.hf, dfF * eps.hf),
      etaP: ss / (ss + ssF), etaPLo: lo, etaPHi: hi,
      etaG, etaGLo: Number.isFinite(rLo) ? gKi(rLo) : 0, etaGHi: Number.isFinite(rHi) ? gKi(rHi) : 1
    };
  };
  const eins = { gg: 1, hf: 1 }, eps = { gg: sph.gg, hf: sph.hf };
  const zeit = effekt('zeit', ssT, dfT, ssE, dfE, eps);
  const gruppeE = g > 1 ? effekt('gruppe', ssG, g - 1, ssPers, dfS, eins) : undefined;
  const wechsel = g > 1 ? effekt('wechsel', ssGT, (g - 1) * dfT, ssE, dfE, eps) : undefined;

  // Beschreibung je Gruppe und Zeitpunkt (KI mit t(n−1))
  const zellen = idx.map(l => Array.from({ length: k }, (_, j) => {
    const v = l.map(i => daten[i]![j]!), m = mittel(v), sd = Math.sqrt(summe(v.map(x => (x - m) ** 2)) / (v.length - 1)), h = tQuantil(0.975, v.length - 1) * sd / Math.sqrt(v.length);
    return { n: v.length, m, sd, kiLo: m - h, kiHi: m + h };
  }));

  // Paarweise Vergleiche (Bonferroni)
  const paare: MwPaar[] = [], anz = (k * (k - 1)) / 2;
  for (let i = 0; i < k; i++) for (let j = i + 1; j < k; j++) {
    const d = daten.map(r => r[j]! - r[i]!);
    const gm = idx.map(l => mittel(l.map(x => d[x]!)));
    const sp2 = summe(idx.map((l, q) => summe(l.map(x => (d[x]! - gm[q]!) ** 2)))) / dfS;
    const diff = mittel(gm), se = Math.sqrt((sp2 / (g * g)) * summe(ng.map(n => 1 / n))), t = se > 0 ? diff / se : diff === 0 ? 0 : Math.sign(diff) * Infinity;
    const p = Number.isFinite(t) ? pT(t, dfS) : 0, h = tQuantil(1 - 0.05 / (2 * anz), dfS) * se;
    paare.push({ i, j, diff, se, df: dfS, t, p, pAnp: Math.min(1, p * anz), kiLo: diff - h, kiHi: diff + h, dz: sp2 > 0 ? diff / Math.sqrt(sp2) : NaN });
  }

  return {
    art: 'messwiederholung', zeitpunkte, gruppenSpalte, gruppen: namen.map((n, q) => ({ name: String(n), n: ng[q]! })),
    n: N, gesamt, randmittel: randM, zellen, sphaer: sph, korrektur: 'gg', zeit, gruppe: gruppeE, wechsel,
    ssPersonen: ssPers, dfPersonen: dfS, paare
  };
}

/** Freiheitsgrade und p-Wert eines Effekts unter der gewählten Korrektur (die Gruppe selbst wird nie korrigiert). */
export function korrigiert(e: Messwiederholung, ef: MwEffekt, kor: MwKorrektur = e.korrektur): { df1: number; df2: number; p: number; eps: number } {
  if (ef.quelle === 'gruppe' || kor === 'keine') return { df1: ef.df, df2: ef.dfFehler, p: ef.p, eps: 1 };
  const eps = kor === 'gg' ? e.sphaer.gg : e.sphaer.hf;
  return { df1: ef.df * eps, df2: ef.dfFehler * eps, p: kor === 'gg' ? ef.pGG : ef.pHF, eps };
}

/** `en`: weggelassen = gewählte Sprache; true/false erzwingt Englisch/Deutsch. */
export const korrekturName = (k: MwKorrektur, en?: boolean) => (k === 'gg' ? 'Greenhouse-Geisser' : k === 'hf' ? 'Huynh-Feldt' : en === undefined ? L('keine Korrektur', 'no correction') : mitFlag(en, () => L('keine Korrektur', 'no correction')));

/** Mindestzahl der Personen, damit Statable rechnet: mehr Personen (nach Abzug der Gruppen) als Zeitpunkte, sonst ist die Kovarianzmatrix nicht regulär. */
export const mindestPersonen = (k: number, g: number) => Math.max(4, k + g);

/* ------------------------------------------------------------------------------------------------------------------
 * Kontraste für den Messwiederholungsfaktor mit eigenem Fehlerterm (Field-Stufe 3, 05.11.2026)
 * Je Person wird der Kontrastwert Σ c_j · x_j gebildet; geprüft wird er mit einem t-Test gegen 0. Damit steht der Fehlerterm des Kontrasts allein
 * auf den Streuungen dieses Kontrasts und nicht auf dem gemeinsamen Fehler des ganzen Faktors (der verlangt Sphärizität). Wie `t.test(Kontrastwerte)` in R;
 * mit Gruppen: ungewichtetes Mittel der Gruppenmittel der Kontrastwerte, gepoolte Streuung innerhalb der Gruppen, df = Personen − Gruppen (wie die Paarvergleiche oben).
 * Sollwerte: docs/fachblaetter/sollwerte/field-stufe3.json (mw_kontrast), Test messwiederholung-kontraste.test.ts.
 * ------------------------------------------------------------------------------------------------------------------ */
export interface MwKontrast { gewichte: number[]; schaetzung: number; se: number; df: number; t: number; p: number; pHolm: number; lo: number; hi: number }
export type MwKontrastArt = 'linear' | 'quadratisch' | 'trend' | 'helmert' | 'wiederholt' | 'eigen';

/** Gewichte (je Kontrast eine Zeile) für k Stufen. Trend: alle Grade 1 bis k−1 bei gleichen Abständen (ganzzahlig wie emmeans „poly“); linear/quadratisch: nur Grad 1 bzw. 2 (ab k = 3). */
export function mwGewichte(art: Exclude<MwKontrastArt, 'eigen'>, k: number): number[][] {
  if (k < 2) return [];
  if (art === 'helmert') return vorlage('helmert', k);
  if (art === 'wiederholt') return vorlage('wiederholt', k);
  if (k < 3) return [];
  const poly = polyGewichte(Array.from({ length: k }, (_, i) => i + 1)).map(ganzzahlig);
  return art === 'linear' ? [poly[0]!] : art === 'quadratisch' ? [poly[1]!] : poly;
}

/** Kontraste für die Spalten von `werte` (eine Zeile je Person, eine Spalte je Stufe). `null`, wenn eine Zeile nicht rechenbar ist (falsche Länge, Summe ≠ 0, nur Nullen). */
export function mwKontraste(werte: number[][], zeilen: number[][], gruppen?: (string | number)[]): MwKontrast[] | null {
  const N = werte.length, k = werte[0]?.length ?? 0;
  if (N < 3 || k < 2) return null;
  const namen = gruppen ? [...new Set(gruppen)] : [''];
  const zu = gruppen ? gruppen.map(x => namen.indexOf(x)) : werte.map(() => 0), g = namen.length;
  const idx = namen.map((_, q) => zu.flatMap((z, i) => (z === q ? [i] : [])));
  if (idx.some(l => l.length < 2)) return null;
  const dfS = N - g;
  const roh = zeilen.map(c => {
    if (c.length !== k || c.every(x => x === 0) || Math.abs(summe(c)) > 1e-9 * Math.max(1, ...c.map(Math.abs))) return null;
    const sc = werte.map(r => summe(c.map((w, j) => w * r[j]!)));
    const gm = idx.map(l => mittel(l.map(i => sc[i]!)));
    const sp2 = summe(idx.map((l, q) => summe(l.map(i => (sc[i]! - gm[q]!) ** 2)))) / dfS;
    const schaetzung = mittel(gm), se = Math.sqrt((sp2 / (g * g)) * summe(idx.map(l => 1 / l.length)));
    if (!(se > 0)) return null;
    const t = schaetzung / se, h = tQuantil(0.975, dfS) * se;
    return { gewichte: c, schaetzung, se, df: dfS, t, p: pT(t, dfS), pHolm: NaN, lo: schaetzung - h, hi: schaetzung + h } as MwKontrast;
  });
  if (roh.some(r => r === null)) return null;
  const ok = roh as MwKontrast[], ph = holm(ok.map(r => r.p));
  return ok.map((r, i) => ({ ...r, pHolm: ph[i]! }));
}
