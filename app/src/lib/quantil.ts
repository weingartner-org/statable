/**
 * Später S-E, Q1: Quantilregression („Median statt Mittelwert vorhersagen“) als Option unter „Weitere Wege“ der Frage „Lässt sich etwas vorhersagen?“.
 * Reine Funktionen (Prüfungen, Intervalle, Kreuzen der Geraden, Sätze zu den Hinweisen, R-Aufruf, R-Antwort lesen). Rechnen: engine/statable-vorhersage-e.R (`sp_quantil`, R-Paket quantreg 6.1),
 * Aufruf in rverfahren.svelte.ts, Sätze und Tabellen des Ergebnisses: quantilsaetze.ts.
 * Fachblatt: docs/fachblaetter/SPAETER-E-VORHERSAGE-ZEITREIHEN-CLUSTER.md, Abschnitt 1 und „Entscheidungen Opus (18.10.)“ (Bootstrap-Perzentil bis n = 1000, darüber nid; Niveau 95 % von Statable gesetzt;
 * kein R¹; Bild und Tabelle nehmen dieselben Intervalle; Fallgewicht gesperrt). Tests: quantil.test.ts (Sollwerte aus R), engine/spaeter-e.webr.test.ts (webR gegen R am Mac).
 */
import type { KatDaten, KatPraed, RAufruf } from './kategreg';
import { L, d } from './sitzung.svelte';
import { komma, ohneNull } from './ergebnis';
import { intervall, BOOT_STARTWERT } from './bootstrap';
import { tQuantil, tVerteilungOben } from './verteilung';
import { rFange, rIds, rWahl, rZahl, rGanz } from '../engine/rsicher';

/** R-Pakete der Quantilregression (quantreg samt SparseM, MatrixModels; 2,3 MB). */
export const R_PAKETE_QUANTIL = ['quantreg'];

export const QR_B = 2000;
export const QR_NID_AB_N = 1000;
export const QR_NIVEAU = 0.95;
export const QR_STARTWERT = BOOT_STARTWERT;
/** Mehr τ nebeneinander als das gibt es nicht. */
export const QR_TAU_MAX = 9;
/** Voreinstellung der Auswahl: der Median. */
export const QR_TAU_STANDARD = [0.5];
/** Die Auswahl zum Anklicken. */
export const QR_TAU_ANGEBOT = [0.05, 0.1, 0.25, 0.5, 0.75, 0.9, 0.95];

export type QuantilKi = 'bootstrap' | 'nid' | 'rang';
export type QuantilKiWunsch = 'standard' | 'rang' | 'nid' | 'bootstrap';
export type QuantilCode =
  | 'gewicht' | 'nur-konstante' | 'ziel-konstant' | 'zwei-werte' | 'zu-wenig-faelle' | 'tau-sperre'
  | 'wenig-faelle' | 'wenige-werte' | 'kleine-gruppe' | 'tau-hinweis'
  | 'nicht-eindeutig' | 'nid-warnung' | 'rueckfall-rang' | 'nid-nur-gross' | 'kreuzen';

/* ------------------------------------------------------------ Wahl der Methode */

/** Bis einschließlich 1000 Fälle der Fall-Bootstrap (Perzentil), darüber die nid-Näherung. */
export const quantilMethode = (n: number): 'bootstrap' | 'nid' => (n > QR_NID_AB_N ? 'nid' : 'bootstrap');

/** Ein Wunsch und was daraus wird; die Rückfälle sind Codes, die das Blatt in Sätze verwandelt. */
export function quantilKiWahl(n: number, wunsch: QuantilKiWunsch, ereignis: { rangFehler?: boolean; nidWarnung?: boolean } = {}): { ki: QuantilKi; codes: QuantilCode[] } {
  const standard = quantilMethode(n), codes: QuantilCode[] = [];
  let ki: QuantilKi;
  if (wunsch === 'rang') {
    if (ereignis.rangFehler) { ki = standard; codes.push('rueckfall-rang'); } else ki = 'rang';
  } else if (wunsch === 'nid') {
    if (standard === 'bootstrap') { ki = 'bootstrap'; codes.push('nid-nur-gross'); } else ki = 'nid';
  } else if (wunsch === 'bootstrap') ki = 'bootstrap';
  else ki = standard;
  if (ki === 'nid' && ereignis.nidWarnung) codes.push('nid-warnung');
  return { ki, codes };
}
/** Der Name für R. */
export const quantilKiR = (ki: QuantilKi): 'boot' | 'nid' | 'rang' => (ki === 'bootstrap' ? 'boot' : ki);

/* ------------------------------------------------------------ Intervalle */

const sd = (x: number[]): number => {
  if (x.length < 2) return 0;
  const m = x.reduce((a, b) => a + b, 0) / x.length;
  return Math.sqrt(x.reduce((a, b) => a + (b - m) * (b - m), 0) / (x.length - 1));
};
/** Bootstrap-Perzentil-Intervall eines Koeffizienten aus seinen Ziehungen (Regel wie `boot::norm.inter`); SE = Standardabweichung (n − 1). Kein p-Wert. Nie NaN: ohne gültige Ziehungen bleibt der Schätzer selbst. */
export function quantilIntervall(spalte: number[], b0: number, niveau = QR_NIVEAU): { B: number; se: number; unten: number; oben: number } {
  const gueltig = spalte.filter(Number.isFinite), iv = intervall(gueltig, b0, 'perzentil', niveau);
  return { B: gueltig.length, se: sd(gueltig), unten: iv.lo ?? b0, oben: iv.hi ?? b0 };
}
/** nid-Näherung (Hendricks und Koenker 1992): t-Wert, zweiseitiges p und t-Intervall. Nie NaN. */
export function quantilNidIntervall(b: number, se: number, df: number, niveau = QR_NIVEAU): { t: number; p: number; unten: number; oben: number } {
  if (!(se > 0)) return { t: b === 0 ? 0 : b > 0 ? Infinity : -Infinity, p: b === 0 ? 1 : 0, unten: b, oben: b };
  const t = b / se;
  if (!(df >= 1)) return { t, p: 1, unten: -Infinity, oben: Infinity };
  const tq = tQuantil(1 - (1 - niveau) / 2, df);
  return { t, p: Math.min(1, 2 * tVerteilungOben(Math.abs(t), df)), unten: b - tq * se, oben: b + tq * se };
}

/* ------------------------------------------------------------ Prüfungen vor dem Rechnen */

/** Gibt es an diesem τ genug Fälle am Rand? n·min(τ, 1 − τ) < p → Sperre (die Gerade wäre durch die äußersten Punkte bestimmt), unter 10 → Hinweis. */
export function quantilTauPruefung(n: number, p: number, tau: number): 'ok' | 'hinweis' | 'sperre' {
  if (!(tau > 0 && tau < 1)) return 'sperre';
  const rand = n * Math.min(tau, 1 - tau);
  if (!(rand >= p)) return 'sperre';
  return rand < 10 ? 'hinweis' : 'ok';
}
/** Die Auswahl der τ: mindestens eines, 0 < τ < 1, höchstens neun, höchstens drei Dezimalstellen, keine doppelten. */
export function quantilTauGueltig(taus: number[]): { ok: boolean; grund?: 'leer' | 'bereich' | 'zu-viele' | 'stellen' | 'doppelt' } {
  if (!taus.length) return { ok: false, grund: 'leer' };
  if (taus.some(t => !(t > 0 && t < 1))) return { ok: false, grund: 'bereich' };
  if (taus.length > QR_TAU_MAX) return { ok: false, grund: 'zu-viele' };
  if (taus.some(t => Math.abs(t * 1000 - Math.round(t * 1000)) > 1e-9)) return { ok: false, grund: 'stellen' };
  if (new Set(taus.map(t => Math.round(t * 1000))).size !== taus.length) return { ok: false, grund: 'doppelt' };
  return { ok: true };
}
export const quantilTauGrundText = (g: 'leer' | 'bereich' | 'zu-viele' | 'stellen' | 'doppelt'): string => g === 'leer' ? d('Wähle mindestens ein τ.', 'Wählen Sie mindestens ein τ.', 'Choose at least one τ.')
  : g === 'bereich' ? L('τ muss zwischen 0 und 1 liegen (zum Beispiel 0,5 für den Median).', 'τ must lie between 0 and 1 (for example 0.5 for the median).')
    : g === 'zu-viele' ? L(`Höchstens ${QR_TAU_MAX} Werte für τ nebeneinander.`, `At most ${QR_TAU_MAX} values of τ side by side.`)
      : g === 'stellen' ? L('τ mit höchstens drei Dezimalstellen.', 'τ with at most three decimal places.') : L('Jedes τ nur einmal.', 'Each τ only once.');

export interface QuantilPruefEingabe { n: number; p: number; verschiedeneZiel: number; nurKonstante?: boolean; gewicht?: boolean; kleinsteGruppe?: number; taus?: number[] }
/** Sperren und Hinweise vor dem Rechnen; die Codes stehen in der Reihenfolge: erst Sperren, dann Hinweise. `p`: Zahl der Koeffizienten mit Konstante. */
export function quantilPruefung(e: QuantilPruefEingabe): { sperre: boolean; codes: QuantilCode[] } {
  const c: QuantilCode[] = [];
  if (e.gewicht) c.push('gewicht');
  if (e.nurKonstante) c.push('nur-konstante');
  if (e.verschiedeneZiel < 2) c.push('ziel-konstant'); else if (e.verschiedeneZiel === 2) c.push('zwei-werte');
  const zuWenig = e.n < 20 || e.n < 5 * e.p;
  if (zuWenig) c.push('zu-wenig-faelle');
  const stufen = (e.taus ?? []).map(t => quantilTauPruefung(e.n, e.p, t));
  const tauSperre = stufen.includes('sperre');
  if (tauSperre) c.push('tau-sperre');
  const sperre = c.length > 0 || !(e.n >= 1);
  if (!zuWenig && e.n < 50) c.push('wenig-faelle');
  if (e.verschiedeneZiel >= 3 && e.verschiedeneZiel <= 14) c.push('wenige-werte');
  if (e.kleinsteGruppe !== undefined && e.kleinsteGruppe < 5) c.push('kleine-gruppe');
  if (!tauSperre && stufen.includes('hinweis')) c.push('tau-hinweis');
  return { sperre, codes: c };
}

/* ------------------------------------------------------------ Sätze zu den Codes */

/** Wie ein τ geschrieben wird: ,25 / ,50 / ,125 (mindestens zwei Stellen). */
export function tauText(t: number): string {
  const r = Math.round(t * 1000) / 1000, stellen = Math.abs(r * 100 - Math.round(r * 100)) < 1e-9 ? 2 : 3;
  return ohneNull(r, stellen);
}
export interface QuantilCodeDaten { n?: number; p?: number; tau?: number; anzahl?: number; von?: number; raster?: number; ki?: QuantilKi }
const z0 = (x: number | undefined, f: (v: number) => string = v => String(v)) => (x === undefined || !Number.isFinite(x) ? '' : f(x));
/** Jeder Hinweis und jede Sperre als ganzer Satz. Zahlen, die der Satz nennt, kommen aus `e`. */
export function quantilCodeSatz(code: QuantilCode, e: QuantilCodeDaten = {}): string {
  const n = z0(e.n), p = z0(e.p), tau = e.tau !== undefined && Number.isFinite(e.tau) ? tauText(e.tau) : '', anzahl = z0(e.anzahl), von = z0(e.von);
  switch (code) {
    case 'gewicht': return d('Die Quantilregression rechnet nicht mit Fallgewichten, weil die Intervalle sonst falsch wären. Schalte das Fallgewicht aus oder wähle die lineare Regression.',
      'Die Quantilregression rechnet nicht mit Fallgewichten, weil die Intervalle sonst falsch wären. Schalten Sie das Fallgewicht aus oder wählen Sie die lineare Regression.',
      'Quantile regression does not work with case weights, because the intervals would be wrong. Switch the case weight off or choose linear regression.');
    case 'nur-konstante': return d('Wähle mindestens eine Vorhersagegröße. Den Median einer einzelnen Spalte zeigt die Verteilung; die Regression braucht etwas, woraus sie vorhersagt.',
      'Wählen Sie mindestens eine Vorhersagegröße. Den Median einer einzelnen Spalte zeigt die Verteilung; die Regression braucht etwas, woraus sie vorhersagt.',
      'Choose at least one predictor. The distribution shows the median of a single column; a regression needs something to predict from.');
    case 'ziel-konstant': return L('Das Ziel hat überall denselben Wert. Damit lässt sich nichts vorhersagen.', 'The target has the same value everywhere. There is nothing to predict.');
    case 'zwei-werte': return d('Das Ziel hat nur zwei Werte. Dafür gibt es die logistische Regression - rechne dort.', 'Das Ziel hat nur zwei Werte. Dafür gibt es die logistische Regression - rechnen Sie dort.',
      'The target has only two values. That is what logistic regression is for - calculate it there.');
    case 'zu-wenig-faelle': return n && p ? L(`Für eine Quantilregression sind ${n} Fälle bei ${p} Koeffizienten zu wenig: gebraucht werden mindestens 20 Fälle und fünf je Koeffizient.`, `${n} cases are too few for a quantile regression with ${p} coefficients: at least 20 cases and five per coefficient are needed.`)
      : L('Für eine Quantilregression sind das zu wenige Fälle: gebraucht werden mindestens 20 Fälle und fünf je Koeffizient.', 'That is too few cases for a quantile regression: at least 20 cases and five per coefficient are needed.');
    case 'tau-sperre': return tau ? d(`Für τ = ${tau} bestimmen zu wenige Fälle die Gerade: am Rand der Verteilung liegen weniger Fälle, als die Gerade Koeffizienten hat. Wähle ein τ näher an 0,5.`,
      `Für τ = ${tau} bestimmen zu wenige Fälle die Gerade: am Rand der Verteilung liegen weniger Fälle, als die Gerade Koeffizienten hat. Wählen Sie ein τ näher an 0,5.`,
      `For τ = ${tau} too few cases determine the line: fewer cases lie at the edge of the distribution than the line has coefficients. Choose a τ closer to 0.5.`)
      : d('Für dieses τ bestimmen zu wenige Fälle die Gerade: am Rand der Verteilung liegen weniger Fälle, als die Gerade Koeffizienten hat. Wähle ein τ näher an 0,5.',
        'Für dieses τ bestimmen zu wenige Fälle die Gerade: am Rand der Verteilung liegen weniger Fälle, als die Gerade Koeffizienten hat. Wählen Sie ein τ näher an 0,5.',
        'For this τ too few cases determine the line: fewer cases lie at the edge of the distribution than the line has coefficients. Choose a τ closer to 0.5.');
    case 'wenig-faelle': return n ? L(`Mit ${n} Fällen sind die Intervalle der Quantilregression unsicher.`, `With ${n} cases the intervals of the quantile regression are uncertain.`)
      : L('Mit weniger als 50 Fällen sind die Intervalle der Quantilregression unsicher.', 'With fewer than 50 cases the intervals of the quantile regression are uncertain.');
    case 'wenige-werte': return L('Das Ziel hat nur wenige verschiedene Werte (zum Beispiel eine Skala mit wenigen Stufen). Viele Quantile fallen dann zusammen, das Ergebnis ist nicht eindeutig.',
      'The target has only a few distinct values (for example a scale with few steps). Many quantiles then coincide and the result is not unique.');
    case 'kleine-gruppe': return L('Eine Gruppe hat weniger als 5 Fälle; die Schätzung für sie ist unsicher.', 'A group has fewer than 5 cases; the estimate for it is uncertain.');
    case 'tau-hinweis': return L('Bei einem τ nahe an 0 oder 1 bestimmen wenige Fälle die Gerade (weniger als 10 Fälle am Rand): die Intervalle sind dort unsicher.',
      'At a τ close to 0 or 1 few cases determine the line (fewer than 10 cases at the edge): the intervals are uncertain there.');
    case 'nicht-eindeutig': return L('Bei diesen Daten ist die Lösung für mindestens ein τ nicht eindeutig (mehrere Geraden haben denselben Verlust). Andere Programme können einen etwas anderen Wert nennen; die Aussage ändert sich dadurch nicht.',
      'With these data the solution for at least one τ is not unique (several lines have the same loss). Other programs may report a slightly different value; the statement does not change because of that.');
    case 'nid-warnung': return L('Bei der nid-Näherung hat R gemeldet, dass an einigen Fällen die geschätzte Dichte nicht positiv war („non-positive fis“) und ersetzt wurde. Die Standardfehler sind dann unsicher.',
      'With the nid approximation R reported that at some cases the estimated density was not positive ("non-positive fis") and was replaced. The standard errors are then uncertain.');
    case 'rueckfall-rang': return e.ki === 'nid'
      ? L('Die Rang-Umkehr ließ sich bei diesen Daten nicht berechnen. Statable nimmt stattdessen die nid-Näherung (bei so vielen Fällen wäre der Bootstrap zu langsam).', 'The rank inversion could not be calculated with these data. Statable uses the nid approximation instead (with so many cases the bootstrap would be too slow).')
      : L('Die Rang-Umkehr ließ sich bei diesen Daten nicht berechnen (zu wenige Fälle am Rand). Statable nimmt stattdessen den Bootstrap.', 'The rank inversion could not be calculated with these data (too few cases at the edge). Statable uses the bootstrap instead.');
    case 'nid-nur-gross': return L(`Die nid-Näherung gibt es erst ab ${QR_NID_AB_N + 1} Fällen (davor ist sie ungenau). Statable nimmt den Bootstrap.`, `The nid approximation is only offered from ${QR_NID_AB_N + 1} cases (before that it is inaccurate). Statable uses the bootstrap.`);
    case 'kreuzen': {
      if (e.anzahl !== undefined && e.anzahl > 0) return von ? L(`Bei ${anzahl} von ${von} Fällen liegt die Gerade für ein höheres Quantil unter der für ein niedrigeres (die Geraden kreuzen sich); das ist unmöglich. Die Schätzung ist dort unsicher, meist liegen die Fälle am Rand der Daten.`,
        `For ${anzahl} of ${von} cases the line for a higher quantile lies below the one for a lower quantile (the lines cross); that is impossible. The estimate is uncertain there, usually the cases lie at the edge of the data.`)
        : L(`Bei ${anzahl} Fällen liegt die Gerade für ein höheres Quantil unter der für ein niedrigeres (die Geraden kreuzen sich); das ist unmöglich. Die Schätzung ist dort unsicher, meist liegen die Fälle am Rand der Daten.`,
        `For ${anzahl} cases the line for a higher quantile lies below the one for a lower quantile (the lines cross); that is impossible. The estimate is uncertain there, usually the cases lie at the edge of the data.`);
      if (e.raster !== undefined && e.raster > 0) return L('Im Bereich der Daten kreuzen sich die Geraden verschiedener Quantile; das ist unmöglich. Die Schätzung ist dort unsicher.', 'Within the range of the data the lines of different quantiles cross; that is impossible. The estimate is uncertain there.');
      return L('Die Geraden verschiedener Quantile kreuzen sich; das ist unmöglich. Die Schätzung ist dort unsicher.', 'The lines of different quantiles cross; that is impossible. The estimate is uncertain there.');
    }
  }
}
/** R-Meldungen („Solution may be nonunique“, „non-positive fis“) als Codes; anderes wird ignoriert, jeder Code nur einmal. */
export function quantilWarnCodes(warnungen: string[]): QuantilCode[] {
  const c: QuantilCode[] = [];
  for (const w of warnungen) {
    if (/nonunique/i.test(w) && !c.includes('nicht-eindeutig')) c.push('nicht-eindeutig');
    if (/non-positive fis/i.test(w) && !c.includes('nid-warnung')) c.push('nid-warnung');
  }
  return c;
}
/** Fehler aus R als Satz. */
export function quantilFehlerSatz(meldung: string): string {
  if (/singular design matrix/i.test(meldung)) return d('Zwei Vorhersagegrößen enthalten dasselbe (eine ist aus der anderen berechenbar). Nimm eine heraus.', 'Zwei Vorhersagegrößen enthalten dasselbe (eine ist aus der anderen berechenbar). Nehmen Sie eine heraus.',
    'Two predictors contain the same thing (one can be calculated from the other). Leave one out.');
  if (/only one group left/i.test(meldung)) return L('Eine Gruppen-Spalte hat nach dem Weglassen der Lücken nur noch eine Gruppe. Damit lässt sich kein Unterschied zwischen Gruppen schätzen.', 'A group column has only one group left once gaps are left out. No difference between groups can be estimated.');
  if (/no predictors/i.test(meldung)) return d('Wähle mindestens eine Spalte, aus der vorhergesagt wird.', 'Wählen Sie mindestens eine Spalte, aus der vorhergesagt wird.', 'Choose at least one column to predict from.');
  const m = meldung.replace(/\s+/g, ' ').trim().slice(0, 160);
  return L(`Die Quantilregression konnte mit diesen Daten nicht rechnen${m ? ` (R: ${m})` : ''}.`, `The quantile regression could not calculate with these data${m ? ` (R: ${m})` : ''}.`);
}
/** Zeile „Gerechnet“. */
export function quantilGerechnet(o: { n: number; ki: QuantilKi; B: number; startwert: number }): string {
  const iv = o.ki === 'bootstrap'
    ? L(`Fall-Bootstrap, ${o.B} Ziehungen, Startwert ${o.startwert}, Perzentil-Intervall`, `case bootstrap, ${o.B} draws, seed ${o.startwert}, percentile interval`)
    : o.ki === 'nid' ? L('nid-Näherung (Hendricks und Koenker 1992), t-Verteilung', 'nid approximation (Hendricks and Koenker 1992), t distribution')
      : L('Rang-Umkehr (Koenker 1994), ungleiche Streuung', 'rank inversion (Koenker 1994), unequal spread');
  return L(`Quantilregression (R-Paket quantreg 6.1, Koenker), Simplex nach Barrodale-Roberts; Konfidenzintervall 95 %: ${iv}; n = ${o.n}`,
    `Quantile regression (R package quantreg 6.1, Koenker), simplex of Barrodale and Roberts; confidence interval 95%: ${iv}; n = ${o.n}`);
}

/* ------------------------------------------------------------ Kreuzende Quantile */

const kreuzt = (a: number, b: number, tol: number) => b < a - tol * Math.max(1, Math.abs(b));
/** Nach τ aufsteigend sortiert: [taus, Koeffizienten]. */
function nachTau(taus: number[], koef: number[][]): { t: number[]; k: number[][] } {
  const ix = taus.map((_, i) => i).sort((a, b) => taus[a]! - taus[b]!);
  return { t: ix.map(i => taus[i]!), k: ix.map(i => koef[i]!) };
}
/** An wie vielen beobachteten Fällen liegt ein höheres Quantil unter einem niedrigeren? `x` = Spalten der Entwurfsmatrix (mit Spalte aus Einsen), `koef[j]` gehört zu `taus[j]`. Zeilen 0-basiert. */
export function quantilKreuzenFaelle(taus: number[], koef: number[][], x: number[][], tol = 1e-9): { anzahl: number; zeilen: number[] } {
  const zeilen: number[] = [], n = x.length ? x[0]!.length : 0, { k } = nachTau(taus, koef);
  if (taus.length < 2 || k.some(b => b.length !== x.length)) return { anzahl: 0, zeilen };
  for (let i = 0; i < n; i++) {
    let vor = NaN, hit = false;
    for (let j = 0; j < k.length; j++) {
      let q = 0; for (let c = 0; c < x.length; c++) q += k[j]![c]! * x[c]![i]!;
      if (j > 0 && kreuzt(vor, q, tol)) { hit = true; break; }
      vor = q;
    }
    if (hit) zeilen.push(i);
  }
  return { anzahl: zeilen.length, zeilen };
}
/** Eine Vorhersagegröße (koef[j] = [a, b]): die Stellen x, an denen sich benachbarte Geraden schneiden, aufsteigend. */
export function quantilKreuzpunkte(taus: number[], koef: number[][]): number[] {
  const { k } = nachTau(taus, koef), aus: number[] = [];
  for (let j = 0; j + 1 < k.length; j++) {
    const den = k[j + 1]![1]! - k[j]![1]!, x = (k[j]![0]! - k[j + 1]![0]!) / den;
    if (Number.isFinite(x)) aus.push(x);
  }
  return aus.sort((a, b) => a - b);
}
/** Wie viele von `schritte` Rasterpunkten zwischen `von` und `bis` zeigen eine Kreuzung (eine Vorhersagegröße)? */
export function quantilKreuzenRaster(taus: number[], koef: number[][], von: number, bis: number, schritte = 21): number {
  if (!(Number.isFinite(von) && Number.isFinite(bis)) || schritte < 2) return 0;
  const xs = Array.from({ length: schritte }, (_, i) => von + (bis - von) * i / (schritte - 1));
  return quantilKreuzenFaelle(taus, koef, [xs.map(() => 1), xs]).anzahl;
}

/* ------------------------------------------------------------ R-Aufruf */

/** Der Aufruf von `sp_quantil`: nur feste Wörter, eigene Namen (y, p01 …) und Zahlen; Text aus den Daten steht nie im Code (engine/rsicher.ts). */
export function quantilAufruf(dt: KatDaten, o: { tau: number[]; ki: 'boot' | 'nid' | 'rang'; B: number; startwert: number }): RAufruf {
  const praed = dt.praed.map((_, k) => `p${String(k + 1).padStart(2, '0')}`), faktoren = dt.praed.flatMap((p, k) => (p.art === 'faktor' ? [`p${String(k + 1).padStart(2, '0')}`] : []));
  if (!o.tau.length) throw new Error('Kein τ für R');
  const rTeilTau = `c(${o.tau.map(rZahl).join(', ')})`;
  return { code: rFange(`sp_quantil(d, 'y', ${rIds(praed)}, ${rIds(faktoren)}, ${rTeilTau}, ${rWahl(o.ki, ['boot', 'nid', 'rang'] as const)}, ${rGanz(o.B)}, ${rGanz(o.startwert)})`), args: {} };
}

/* ------------------------------------------------------------ Ergebnis */

export interface QuantilKoefInfo { name: string; /** Nummer der Vorhersagegröße (0-basiert), −1 = Konstante */ pIdx: number; /** bei Gruppen die Stufe gegen die erste */ stufe: string }
export interface QuantilTau {
  tau: number; b: number[]; verlust: number; warnungen: string[];
  /** Standardfehler: Bootstrap (Standardabweichung der Ziehungen) oder nid; leer bei der Rang-Umkehr */ se: number[];
  unten: number[]; oben: number[];
  /** nur nid: t und zweiseitiges p (der Bootstrap und die Rang-Umkehr geben keinen p-Wert) */ t?: number[]; p?: number[];
}
export interface QuantilOls { b: number[]; se: number[]; unten: number[]; oben: number[]; r2: number; df: number }
export interface QuantilKreuzen { faelle: number; raster: number; punkte: number[]; von: number; bis: number; /** Raster nur bei genau einer Zahl als Vorhersagegröße */ einZahl: boolean }
export interface QuantilErgebnis {
  art: 'quantil'; ziel: string; praed: KatPraed[]; n: number; ausgelassen: number; taus: number[]; koef: QuantilKoefInfo[];
  ki: QuantilKi; codes: QuantilCode[]; B: number; startwert: number; niveau: number;
  erg: QuantilTau[]; ols: QuantilOls; kreuzen: QuantilKreuzen; df: number;
}

const arr = <T>(x: unknown): T[] => (x == null ? [] : Array.isArray(x) ? (x as T[]) : [x as T]);
const num = (x: unknown): number => { const v = arr<number | null>(x)[0]; return typeof v === 'number' && Number.isFinite(v) ? v : NaN; };
const nums = (x: unknown): number[] => arr<number | null>(x).map(v => (typeof v === 'number' ? v : NaN));
const hatFeld = (o: unknown): o is Record<string, unknown> => !!o && typeof o === 'object' && !Array.isArray(o) && !('type' in (o as object) && Object.keys(o as object).length === 1);

/** `p02B` → Vorhersagegröße 1 (0-basiert) und Stufe „B“; `(Intercept)` → −1. */
function koefInfo(name: string, praed: KatPraed[]): QuantilKoefInfo {
  const m = /^p(\d\d)(.*)$/s.exec(name);
  if (!m) return { name, pIdx: -1, stufe: '' };
  const pIdx = Number(m[1]) - 1;
  return { name, pIdx, stufe: praed[pIdx]?.art === 'faktor' ? m[2]! : '' };
}
/** Die Spalten der Entwurfsmatrix über die vollständigen Fälle (Konstante zuerst, wie `model.matrix` in R); Zeilen mit einer Lücke in Ziel oder Vorhersagegrößen entfallen. */
export function quantilDesign(dt: KatDaten, koef: QuantilKoefInfo[]): { x: number[][]; y: number[] } {
  const roh = dt.spalten, n = roh[0]?.werte.length ?? 0, voll: number[] = [];
  for (let i = 0; i < n; i++) if (roh.every(s => s.werte[i] !== null && s.werte[i] !== undefined)) voll.push(i);
  const y = voll.map(i => Number(roh[0]!.werte[i]));
  const x = koef.map(k => {
    if (k.pIdx < 0) return voll.map(() => 1);
    const sp = roh[1 + k.pIdx]!;
    if (sp.art !== 'faktor') return voll.map(i => Number(sp.werte[i]));
    const code = (sp.labels ?? []).find(l => l.label === k.stufe)?.wert;
    return voll.map(i => (Number(sp.werte[i]) === code ? 1 : 0));
  });
  return { x, y };
}

/**
 * Die R-Antwort von `sp_quantil` lesen. Das Perzentil-Intervall aus der Bootstrap-Matrix rechnet JavaScript (`quantilIntervall`), das nid-Intervall ebenfalls; die Matrix wird danach verworfen
 * (sie gehört nicht ins Projekt). Die Prüfung auf kreuzende Quantile rechnet JavaScript aus den Daten.
 */
export function quantilLesen(r: Record<string, unknown>, dt: KatDaten, o: { ki: QuantilKi; B: number; startwert: number; codes?: QuantilCode[] }): QuantilErgebnis {
  const namen = arr<string>(r.namen).map(String), koef = namen.map(nm => koefInfo(nm, dt.praed)), n = num(r.n);
  const erg: QuantilTau[] = arr<Record<string, unknown>>(r.ergebnisse).filter(hatFeld).map(e => {
    const b = nums(e.b), warn = arr<string>(e.warnungen).map(String);
    const t: QuantilTau = { tau: num(e.tau), b, verlust: num(e.verlust), warnungen: warn, se: [], unten: [], oben: [] };
    if (hatFeld(e.boot)) {
      const sp = arr<unknown>(e.boot.spalten).map(nums);
      sp.forEach((col, j) => { const iv = quantilIntervall(col, b[j] ?? NaN); t.se.push(iv.se); t.unten.push(iv.unten); t.oben.push(iv.oben); });
    } else if (hatFeld(e.nid)) {
      const se = nums(e.nid.se), df = num(e.nid.df); t.t = []; t.p = [];
      b.forEach((bj, j) => { const iv = quantilNidIntervall(bj, se[j] ?? NaN, df); t.se.push(se[j] ?? NaN); t.unten.push(iv.unten); t.oben.push(iv.oben); t.t!.push(iv.t); t.p!.push(iv.p); });
    } else if (hatFeld(e.rang)) { t.unten = nums(e.rang.unten).map(v => (v <= -OFFEN ? -Infinity : v)); t.oben = nums(e.rang.oben).map(v => (v >= OFFEN ? Infinity : v)); }   // quantreg schreibt eine offene Grenze als ±1,797693e+308
    return t;
  });
  const ow = (r.ols ?? {}) as Record<string, unknown>;
  const ols: QuantilOls = { b: nums(ow.b), se: nums(ow.se), unten: nums(ow.unten), oben: nums(ow.oben), r2: num(ow.r2), df: num(ow.df) };
  const taus = erg.map(e => e.tau), { x } = quantilDesign(dt, koef), bs = erg.map(e => e.b);
  const einZahl = dt.praed.length === 1 && dt.praed[0]!.art === 'zahl' && koef.length === 2;
  const sp = einZahl ? x[1]! : [], von = sp.length ? Math.min(...sp) : NaN, bis = sp.length ? Math.max(...sp) : NaN;
  const kreuzen: QuantilKreuzen = {
    faelle: quantilKreuzenFaelle(taus, bs, x).anzahl, raster: einZahl ? quantilKreuzenRaster(taus, bs, von, bis) : 0, punkte: einZahl && taus.length > 1 ? quantilKreuzpunkte(taus, bs) : [], von, bis, einZahl
  };
  const codes = new Set<QuantilCode>(o.codes ?? []);
  for (const e of erg) for (const c of quantilWarnCodes(e.warnungen)) if (c === 'nicht-eindeutig' || o.ki === 'nid') codes.add(c);
  if (kreuzen.faelle > 0 || kreuzen.raster > 0) codes.add('kreuzen');
  return { art: 'quantil', ziel: dt.ziel, praed: dt.praed, n, ausgelassen: num(r.ausgelassen), taus, koef, ki: o.ki, codes: [...codes], B: o.B, startwert: o.startwert, niveau: QR_NIVEAU, erg, ols, kreuzen, df: ols.df };
}
/** Hat die Rang-Umkehr bei einem τ nicht gerechnet (R-Meldung statt Grenzen)? Dann rechnet Statable mit der Standardmethode weiter. */
export const quantilRangFehler = (r: Record<string, unknown>): boolean => arr<Record<string, unknown>>(r.ergebnisse).some(e => hatFeld(e) && e.rang_fehler !== undefined);
/** Hat die nid-Näherung die Warnung „non-positive fis“ gegeben? */
export const quantilNidWarnung = (r: Record<string, unknown>): boolean => arr<Record<string, unknown>>(r.ergebnisse).some(e => hatFeld(e) && quantilWarnCodes(arr<string>(e.warnungen).map(String)).includes('nid-warnung'));

/** Ab diesem Betrag nennt quantreg eine Grenze „offen“ (±.Machine$double.xmax). */
const OFFEN = 1e300;
/** Untere und obere Grenze eines Intervalls: eine offene (±∞, nach dem Speichern als null/NaN) bleibt offen und wird nie als Rohzahl gezeigt. */
export const untenWert = (v: number | null | undefined): number => (typeof v === 'number' && Number.isFinite(v) && v > -OFFEN ? v : -Infinity);
export const obenWert = (v: number | null | undefined): number => (typeof v === 'number' && Number.isFinite(v) && v < OFFEN ? v : Infinity);
/** Die Grenze als Text für Satz und APA-Zeile: „−∞“ und „∞“ für offene Grenzen. */
export const grenzeText = (v: number, seite: 'unten' | 'oben'): string => { const w = seite === 'unten' ? untenWert(v) : obenWert(v); return Number.isFinite(w) ? kwert(w) : seite === 'unten' ? '−∞' : '∞'; };
/** Die Zahl für den Satz: Komma, Stellen nach Größe. */
export const kwert = (v: number): string => (Number.isFinite(v) ? komma(v, Math.abs(v) >= 100 ? 1 : Math.abs(v) >= 1 ? 2 : Math.abs(v) >= 0.1 ? 2 : 3) : '-');
