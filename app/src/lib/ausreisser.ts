/**
 * Ausreißertests als HINWEIS (Später, Welle S-D, T2; Fachblatt docs/fachblaetter/SPAETER-D-PSYCHOLOGIE-MIXED-RECHNER.md, Abschnitt 6 und „Entscheidungen Opus“ 6): Grubbs (ein Wert), generalisierter ESD nach Rosner (bis zu k Werte), Dixon r10 (n = 3 bis 10).
 * Reine Funktionen ohne Oberfläche und ohne PSPP. Es gibt KEINE Funktion zum Entfernen oder Löschen von Fällen: Ein Test sagt, ob ein Wert unter der Annahme einer Normalverteilung ungewöhnlich ist, nie, dass er falsch ist.
 * Wer Fälle ausschließen will, nutzt den Daten-Assistenten „Auswahl“ (Filter, umkehrbar). Zeilennummern sind 1-basiert wie in der übergebenen Liste, Lücken (null) zählen mit, werden aber nicht geprüft.
 * Quellen: Grubbs (1950), Annals of Mathematical Statistics 21(1), 27-58; Grubbs (1969), Technometrics 11(1), 1-21; Rosner (1983), Technometrics 25(2), 165-172; Dixon (1950/1951); Rorabacher (1991), Analytical Chemistry 63(2), 139-146;
 * NIST/SEMATECH e-Handbook of Statistical Methods, Abschnitt 1.3.5.17.
 *
 * Festlegungen (Opus 17.10.): Grubbs ab n ≥ 7, ESD ab n ≥ 25 mit k ≤ min(10; 0,2·n), Dixon r10 für n = 3 bis 10 mit der EXAKT berechneten Tabelle (zweidimensionale Integration, mit 2 Mio. Simulationen je n bestätigt;
 * sie weicht in der dritten Stelle von der abgeschriebenen Tabelle bei Rorabacher ab). Kritische Werte von Grubbs und ESD folgen aus der t-Verteilung, ohne Tabelle. Tietjen-Moore und der modifizierte z-Wert werden nicht gebaut.
 */
import { L, Lp, d } from './sitzung.svelte';
import { zahlDe } from './format';
import { ohneNull, pWert } from './ergebnis';
import { tQuantil, tVerteilungOben } from './verteilung';
import { shapiroWilk } from './normalitaet';

export type Seite = 'beide' | 'oben' | 'unten';
export type AusreisserHinweisArt = 'wenige-stufen' | 'nicht-normal';
export const GRUBBS_MIN_N = 7, ESD_MIN_N = 25, DIXON_MIN_N = 3, DIXON_MAX_N = 10, ESD_K_MAX = 10, ESD_K_ANTEIL = 0.2, WENIGE_STUFEN = 15;

/** Der feste Satz (deutsche Fassung für Tests und Vergleiche; angezeigt wird `ausreisserSatz()` in der Sprache und Anrede der Seite). */
export const AUSREISSER_SATZ = 'Der Fall bleibt in den Daten. Prüfe zuerst, ob ein Eingabe- oder Messfehler vorliegt oder ob der Wert zu einer anderen Gruppe gehört.';
export const ausreisserSatz = (): string => d(
  'Der Fall bleibt in den Daten. Prüfe zuerst, ob ein Eingabe- oder Messfehler vorliegt oder ob der Wert zu einer anderen Gruppe gehört.',
  'Der Fall bleibt in den Daten. Prüfen Sie zuerst, ob ein Eingabe- oder Messfehler vorliegt oder ob der Wert zu einer anderen Gruppe gehört.',
  'The case stays in the data. First check whether there is an input or measurement error or whether the value belongs to another group.');

/** Rundung auf 9 Stellen: Werte, die sich erst danach unterscheiden, gelten als gleich (Gleitkomma-Rauschen). */
const rund = (v: number): number => Number(v.toFixed(9));
const endlich = (v: number | null | undefined): v is number => typeof v === 'number' && Number.isFinite(v);
const mittelVon = (x: number[]) => x.reduce((a, b) => a + b, 0) / x.length;
const sdVon = (x: number[], m = mittelVon(x)) => (x.length > 1 ? Math.sqrt(x.reduce((a, b) => a + (b - m) ** 2, 0) / (x.length - 1)) : 0);
interface Punkt { zeile: number; wert: number }
const punkte = (x: (number | null)[]): Punkt[] => x.flatMap((v, i) => (endlich(v) ? [{ zeile: i + 1, wert: v }] : []));

export const ausreisserAngebot = (n: number): { grubbs: boolean; esd: boolean; dixon: boolean } => ({ grubbs: n >= GRUBBS_MIN_N, esd: n >= ESD_MIN_N, dixon: n >= DIXON_MIN_N && n <= DIXON_MAX_N });

/* ------------------------------------------------------------ Grubbs */
/** Kritischer Wert G = ((n − 1)/√n)·√(t²/(n − 2 + t²)) mit t = t(1 − α/(2n); n − 2) zweiseitig, t(1 − α/n; n − 2) einseitig. */
export function grubbsKritisch(n: number, alpha = 0.05, seite: Seite = 'beide'): number {
  const t = tQuantil(1 - (seite === 'beide' ? alpha / (2 * n) : alpha / n), n - 2);
  return ((n - 1) / Math.sqrt(n)) * Math.sqrt((t * t) / (n - 2 + t * t));
}
/** p-Wert: t = √(n(n − 2)G²/((n − 1)² − nG²)), p = 2n·P(T(n − 2) > t) (einseitig ohne die 2), auf höchstens 1 begrenzt; am größtmöglichen G ((n − 1)/√n) ist p = 0. */
export function grubbsP(g: number, n: number, seite: Seite = 'beide'): number {
  const nenner = (n - 1) ** 2 - n * g * g;
  if (!(nenner > 0)) return 0;
  const t = Math.sqrt((n * (n - 2) * g * g) / nenner);
  return Math.min(1, (seite === 'beide' ? 2 : 1) * n * tVerteilungOben(t, n - 2));
}
/** Hinweise zur Anwendung: wenige verschiedene Werte (Likert), Normalverteilung fraglich (Shapiro-Wilk der Werte ohne die gemeldeten, ohne Fund aller Werte). */
function hinweiseVon(alle: number[], ohneGemeldete: number[]): AusreisserHinweisArt[] {
  const h: AusreisserHinweisArt[] = [];
  const verschieden = new Set(alle.map(rund)).size;
  if (verschieden < WENIGE_STUFEN && verschieden <= alle.length / 2) h.push('wenige-stufen');   // wenige Stufen UND viele Gleichstände: ein kleines n allein genügt nicht
  const sw = shapiroWilk(ohneGemeldete);
  if (sw && sw.p < 0.05) h.push('nicht-normal');
  return h;
}
type Fehler = null | 'n-zu-klein' | 'alle-gleich' | 'keine-werte';
export interface Ohne { n: number; mittel: number; sd: number }
export interface GrubbsErgebnis {
  n: number; ausgeschlossen: number; mittel: number; sd: number; g: number; kritisch: number; p: number; zeile: number; wert: number; gleichstand: number[]; gefunden: boolean;
  alpha: number; seite: Seite; ohne: Ohne; hinweise: AusreisserHinweisArt[]; fehler: Fehler;
}
export function grubbs(x: (number | null)[], o: { alpha?: number; seite?: Seite } = {}): GrubbsErgebnis {
  const alpha = o.alpha ?? 0.05, seite = o.seite ?? 'beide', pt = punkte(x), n = pt.length;
  const leer: GrubbsErgebnis = { n, ausgeschlossen: x.length - n, mittel: 0, sd: 0, g: 0, kritisch: 0, p: 1, zeile: 0, wert: 0, gleichstand: [], gefunden: false, alpha, seite, ohne: { n: 0, mittel: 0, sd: 0 }, hinweise: [], fehler: null };
  if (!n) return { ...leer, fehler: 'keine-werte' };
  if (n < GRUBBS_MIN_N) return { ...leer, fehler: 'n-zu-klein' };
  const w = pt.map(p => p.wert), m = mittelVon(w), sd = sdVon(w, m);
  if (!(sd > 0)) return { ...leer, mittel: m, fehler: 'alle-gleich' };
  const abstand = (v: number) => (seite === 'beide' ? Math.abs(v - m) : seite === 'oben' ? v - m : m - v);
  const groesster = Math.max(...pt.map(p => rund(abstand(p.wert)))), treffer = pt.filter(p => rund(abstand(p.wert)) === groesster);
  const t0 = treffer[0]!, g = abstand(t0.wert) / sd, kritisch = grubbsKritisch(n, alpha, seite), gefunden = g > kritisch;
  const rest = pt.filter(p => p.zeile !== t0.zeile).map(p => p.wert), mr = mittelVon(rest);
  return { ...leer, mittel: m, sd, g, kritisch, p: grubbsP(g, n, seite), zeile: t0.zeile, wert: t0.wert, gleichstand: treffer.map(p => p.zeile), gefunden, ohne: { n: rest.length, mittel: mr, sd: sdVon(rest, mr) }, hinweise: hinweiseVon(w, gefunden ? rest : w) };
}

/* ------------------------------------------------------------ Generalisierter ESD (Rosner) */
export interface EsdSchritt { i: number; zeile: number; wert: number; r: number; lambda: number }
export interface EsdErgebnis {
  n: number; ausgeschlossen: number; k: number; schritte: EsdSchritt[]; anzahl: number; gemeldet: number[]; mittel: number; sd: number; alpha: number;
  ohne: Ohne; hinweise: AusreisserHinweisArt[]; fehler: Fehler;
}
/** Kritischer Wert λᵢ des Schritts i bei n Werten: λᵢ = (n − i)·t/√((n − i − 1 + t²)(n − i + 1)), t = t(1 − α/(2(n − i + 1)); n − i − 1). λ₁ ist das zweiseitige Kriterium von Grubbs. */
export function esdLambda(n: number, i: number, alpha = 0.05): number {
  const t = tQuantil(1 - alpha / (2 * (n - i + 1)), n - i - 1);
  return ((n - i) * t) / Math.sqrt((n - i - 1 + t * t) * (n - i + 1));
}
export function esd(x: (number | null)[], o: { k?: number; alpha?: number } = {}): EsdErgebnis {
  const alpha = o.alpha ?? 0.05, pt = punkte(x), n = pt.length, kMax = Math.max(1, Math.min(ESD_K_MAX, Math.floor(ESD_K_ANTEIL * n)));
  const k = Math.max(1, Math.min(o.k ?? ESD_K_MAX, kMax));
  const leer: EsdErgebnis = { n, ausgeschlossen: x.length - n, k, schritte: [], anzahl: 0, gemeldet: [], mittel: 0, sd: 0, alpha, ohne: { n: 0, mittel: 0, sd: 0 }, hinweise: [], fehler: null };
  if (!n) return { ...leer, fehler: 'keine-werte' };
  if (n < ESD_MIN_N) return { ...leer, fehler: 'n-zu-klein' };
  const w0 = pt.map(p => p.wert), m0 = mittelVon(w0), sd0 = sdVon(w0, m0);
  if (!(sd0 > 0)) return { ...leer, mittel: m0, fehler: 'alle-gleich' };
  let rest = [...pt];
  const schritte: EsdSchritt[] = [];
  for (let i = 1; i <= k; i++) {
    const w = rest.map(p => p.wert), m = mittelVon(w), sd = sdVon(w, m);
    if (!(sd > 0)) break;
    const ab = rest.map(p => rund(Math.abs(p.wert - m))), mx = Math.max(...ab), j = ab.indexOf(mx), p = rest[j]!;
    schritte.push({ i, zeile: p.zeile, wert: p.wert, r: Math.abs(p.wert - m) / sd, lambda: esdLambda(n, i, alpha) });
    rest = rest.filter((_, q) => q !== j);
  }
  const gefunden = schritte.filter(s => s.r > s.lambda).map(s => s.i), anzahl = gefunden.length ? Math.max(...gefunden) : 0;
  const gemeldet = schritte.slice(0, anzahl).map(s => s.zeile), melde = new Set(gemeldet);
  const ohne = pt.filter(p => !melde.has(p.zeile)).map(p => p.wert), mo = mittelVon(ohne);
  return { ...leer, k, schritte, anzahl, gemeldet, mittel: m0, sd: sd0, ohne: { n: ohne.length, mittel: mo, sd: sdVon(ohne, mo) }, hinweise: hinweiseVon(w0, ohne) };
}

/* ------------------------------------------------------------ Dixon r10 */
/**
 * Kritische Werte des zweiseitigen Dixon-Verhältnisses r10 bei n = 3 bis 10 und α = 0,10 / 0,05 / 0,01: EXAKT durch zweidimensionale Integration über Minimum und Maximum der Normalverteilung berechnet
 * und mit 2 Mio. Simulationen je n bestätigt (4 Stellen; Fehler höchstens 6e-5). Sie weichen an wenigen Stellen um bis zu 0,005 von der abgeschriebenen Tafel bei Rorabacher (1991) ab
 * (n = 4, 99 %: ,921 gegen ,926; n = 6, 95 %: ,628 gegen ,625) - hier gilt die exakte. Quelle der Zahlen: scripts/spaeter-d-erwartet.R.
 */
const DIXON: Record<number, [number, number, number]> = {
  3: [0.9413, 0.9702, 0.994], 4: [0.7655, 0.8298, 0.9207], 5: [0.6424, 0.7102, 0.8232], 6: [0.5624, 0.6275, 0.7427],
  7: [0.5073, 0.569, 0.6811], 8: [0.4671, 0.5256, 0.6336], 9: [0.4363, 0.4922, 0.5963], 10: [0.4118, 0.4656, 0.5661]
};
export function dixonKritisch(n: number, alpha: number): number {
  const z = DIXON[n];
  if (!z) return NaN;
  const i = [0.1, 0.05, 0.01].findIndex(a => Math.abs(a - alpha) < 1e-9);
  return i < 0 ? NaN : z[i]!;
}
export interface DixonErgebnis {
  n: number; ausgeschlossen: number; rHoch: number; rTief: number; r: number; seite: 'hoch' | 'tief'; zeile: number; wert: number; kritisch: number; gefunden: boolean; alpha: number;
  fehler: null | 'n-ausserhalb' | 'alle-gleich' | 'keine-werte';
}
export function dixon(x: (number | null)[], o: { alpha?: number } = {}): DixonErgebnis {
  const alpha = o.alpha ?? 0.05, pt = punkte(x), n = pt.length;
  const leer: DixonErgebnis = { n, ausgeschlossen: x.length - n, rHoch: 0, rTief: 0, r: 0, seite: 'hoch', zeile: 0, wert: 0, kritisch: 0, gefunden: false, alpha, fehler: null };
  if (!n) return { ...leer, fehler: 'keine-werte' };
  if (n < DIXON_MIN_N || n > DIXON_MAX_N) return { ...leer, fehler: 'n-ausserhalb' };
  const s = [...pt].sort((a, b) => a.wert - b.wert || a.zeile - b.zeile), R = s[n - 1]!.wert - s[0]!.wert;
  if (!(R > 0)) return { ...leer, fehler: 'alle-gleich' };
  const rHoch = (s[n - 1]!.wert - s[n - 2]!.wert) / R, rTief = (s[1]!.wert - s[0]!.wert) / R, hoch = rHoch >= rTief, kritisch = dixonKritisch(n, alpha), r = Math.max(rHoch, rTief);
  const p = hoch ? s[n - 1]! : s[0]!;
  return { ...leer, rHoch, rTief, r, seite: hoch ? 'hoch' : 'tief', zeile: p.zeile, wert: p.wert, kritisch, gefunden: r > kritisch };
}

/* ------------------------------------------------------------ Sätze */
const z2 = (v: number) => zahlDe(v, 2);
const nenne = (zeilen: number[]) => zeilen.join(', ');
/** „M = 206,43, SD = 15,85“ - auch in den Sätzen der Tabellen. */
export const mSd = (m: number, sd: number): string => `M = ${z2(m)}, SD = ${z2(sd)}`;
/** Der Hinweis, wenn eine Annahme wackelt: nur Normalverteilung oder wenige Stufen (je ein ganzer Satz). */
export function hinweisSatz(h: AusreisserHinweisArt): string {
  return h === 'nicht-normal'
    ? L('Die Annahme der Normalverteilung ist fraglich (Shapiro-Wilk der Werte ohne die gemeldeten Fälle: p < ,05). Der Test meldet dann zu viel.', 'The assumption of a normal distribution is questionable (Shapiro-Wilk of the values without the reported cases: p < .05). The test then reports too much.')
    : L('Die Spalte hat weniger als 15 verschiedene Werte, und viele Werte kommen mehrfach vor. Der Test passt nicht zu wenigen Stufen (zum Beispiel einer Skala von 1 bis 5).', 'The column has fewer than 15 different values, and many values occur more than once. The test does not fit a few levels (for example a scale from 1 to 5).');
}
export function fehlerSatz(f: NonNullable<Fehler> | 'n-ausserhalb', test: 'grubbs' | 'esd' | 'dixon', n: number): string {
  if (f === 'keine-werte') return L('Es gibt keine Werte, die sich prüfen ließen.', 'There are no values that could be tested.');
  if (f === 'alle-gleich') return L('Alle Werte sind gleich. Dafür gibt es keinen Test.', 'All values are equal. There is no test for that.');
  if (test === 'grubbs') return L(`Der Grubbs-Test braucht mindestens ${GRUBBS_MIN_N} Werte (hier ${n}): Bei weniger meldet er zu viel.`, `The Grubbs test needs at least ${GRUBBS_MIN_N} values (here ${n}): with fewer it reports too much.`);
  if (test === 'esd') return L(`Der ESD-Test braucht mindestens ${ESD_MIN_N} Werte (hier ${n}): Bei weniger hält er sein Niveau nicht. Darunter bleibt der Grubbs-Test.`, `The ESD test needs at least ${ESD_MIN_N} values (here ${n}): with fewer it does not keep its level. Below that the Grubbs test remains.`);
  return L(`Der Dixon-Test gilt für ${DIXON_MIN_N} bis ${DIXON_MAX_N} Werte (hier ${n}).`, `The Dixon test applies to ${DIXON_MIN_N} to ${DIXON_MAX_N} values (here ${n}).`);
}
/** Fehlende Werte: ihre Zahl steht im Satz (leer, wenn es keine gibt). */
export function lueckenSatz(ausgeschlossen: number, n: number): string {
  return ausgeschlossen > 0 ? Lp(ausgeschlossen, `${ausgeschlossen} Zeile ohne Wert wurde nicht geprüft (n = ${n}).`, `${ausgeschlossen} Zeilen ohne Wert wurden nicht geprüft (n = ${n}).`, `${ausgeschlossen} row without a value was not tested (n = ${n}).`, `${ausgeschlossen} rows without a value were not tested (n = ${n}).`) : '';
}
function ohneSatz(o: Ohne, m: number, sd: number, gemeldet = true): string {
  return gemeldet
    ? L(`Mit allen Werten ist ${mSd(m, sd)}, ohne diese Werte ${mSd(o.mittel, o.sd)} (n = ${o.n}).`, `With all values ${mSd(m, sd)}; without these values ${mSd(o.mittel, o.sd)} (n = ${o.n}).`)
    : L(`Mit allen Werten ist ${mSd(m, sd)}, ohne den auffälligsten Wert ${mSd(o.mittel, o.sd)} (n = ${o.n}).`, `With all values ${mSd(m, sd)}; without the most conspicuous value ${mSd(o.mittel, o.sd)} (n = ${o.n}).`);
}
export function satzGrubbs(e: GrubbsErgebnis): string {
  if (e.fehler) return fehlerSatz(e.fehler, 'grubbs', e.n);
  const a = ohneNullAlpha(e.alpha), w = zahlDe(e.wert), p = pWert(e.p);
  const kern = e.gefunden
    ? L(`Grubbs-Test (Niveau ${a}): Der Wert ${w} in Zeile ${e.zeile} ist ungewöhnlich (G = ${z2(e.g)}, kritischer Wert ${z2(e.kritisch)}, p ${p}).`, `Grubbs test (level ${a}): the value ${w} in row ${e.zeile} is unusual (G = ${z2(e.g)}, critical value ${z2(e.kritisch)}, p ${p}).`)
    : L(`Grubbs-Test (Niveau ${a}): Der auffälligste Wert ist ${w} in Zeile ${e.zeile}. Das ist kein Hinweis auf einen Ausreißer (G = ${z2(e.g)}, kritischer Wert ${z2(e.kritisch)}, p ${p}).`, `Grubbs test (level ${a}): the most conspicuous value is ${w} in row ${e.zeile}. This is no sign of an outlier (G = ${z2(e.g)}, critical value ${z2(e.kritisch)}, p ${p}).`);
  const gleich = e.gleichstand.length > 1 ? ' ' + L(`Mehrere Zeilen haben denselben Abstand zum Mittelwert (Zeilen ${nenne(e.gleichstand)}).`, `Several rows have the same distance from the mean (rows ${nenne(e.gleichstand)}).`) : '';
  return `${kern}${gleich} ${ohneSatz(e.ohne, e.mittel, e.sd, e.gefunden)} ${lueckenTeil(e)}${ausreisserSatz()}`;
}
export function satzEsd(e: EsdErgebnis): string {
  if (e.fehler) return fehlerSatz(e.fehler, 'esd', e.n);
  const a = ohneNullAlpha(e.alpha);
  const kern = e.anzahl > 0
    ? Lp(e.anzahl, `Generalisierter ESD-Test (Rosner, Niveau ${a}, höchstens ${e.k} Werte): 1 Wert ist ungewöhnlich, Zeile ${nenne(e.gemeldet)} (Wert ${e.schritte.slice(0, e.anzahl).map(s => zahlDe(s.wert)).join('; ')}).`,
        `Generalisierter ESD-Test (Rosner, Niveau ${a}, höchstens ${e.k} Werte): ${e.anzahl} Werte sind ungewöhnlich, Zeilen ${nenne(e.gemeldet)} (Werte ${e.schritte.slice(0, e.anzahl).map(s => zahlDe(s.wert)).join('; ')}).`,
        `Generalized ESD test (Rosner, level ${a}, at most ${e.k} values): 1 value is unusual, row ${nenne(e.gemeldet)} (value ${e.schritte.slice(0, e.anzahl).map(s => zahlDe(s.wert)).join('; ')}).`,
        `Generalized ESD test (Rosner, level ${a}, at most ${e.k} values): ${e.anzahl} values are unusual, rows ${nenne(e.gemeldet)} (values ${e.schritte.slice(0, e.anzahl).map(s => zahlDe(s.wert)).join('; ')}).`)
    : L(`Generalisierter ESD-Test (Rosner, Niveau ${a}, höchstens ${e.k} Werte): Kein Wert ist ungewöhnlich. Der auffälligste Wert steht in Zeile ${e.schritte[0]?.zeile ?? 0}.`, `Generalized ESD test (Rosner, level ${a}, at most ${e.k} values): no value is unusual. The most conspicuous value is in row ${e.schritte[0]?.zeile ?? 0}.`);
  return `${kern} ${e.anzahl > 0 ? ohneSatz(e.ohne, e.mittel, e.sd) + ' ' : ''}${lueckenTeil(e)}${ausreisserSatz()}`;
}
export function satzDixon(e: DixonErgebnis): string {
  if (e.fehler) return fehlerSatz(e.fehler, 'dixon', e.n);
  const a = ohneNullAlpha(e.alpha), w = zahlDe(e.wert);
  const kern = e.gefunden
    ? L(`Dixon-Test r10 (Niveau ${a}): Der Wert ${w} in Zeile ${e.zeile} ist ungewöhnlich (Q = ${ohneNull(e.r, 3)}, kritischer Wert ${ohneNull(e.kritisch, 3)}).`, `Dixon test r10 (level ${a}): the value ${w} in row ${e.zeile} is unusual (Q = ${ohneNull(e.r, 3)}, critical value ${ohneNull(e.kritisch, 3)}).`)
    : L(`Dixon-Test r10 (Niveau ${a}): Der auffälligste Wert ist ${w} in Zeile ${e.zeile}. Das ist kein Hinweis auf einen Ausreißer (Q = ${ohneNull(e.r, 3)}, kritischer Wert ${ohneNull(e.kritisch, 3)}).`, `Dixon test r10 (level ${a}): the most conspicuous value is ${w} in row ${e.zeile}. This is no sign of an outlier (Q = ${ohneNull(e.r, 3)}, critical value ${ohneNull(e.kritisch, 3)}).`);
  return `${kern} ${lueckenTeil(e)}${ausreisserSatz()}`;
}
const lueckenTeil = (e: { ausgeschlossen: number; n: number }): string => { const s = lueckenSatz(e.ausgeschlossen, e.n); return s ? `${s} ` : ''; };
/** α ohne führende Null („,05“), wie p. */
function ohneNullAlpha(a: number): string { const t = zahlDe(a, 2); return t.replace(/^0(?=[.,])/, ''); }
