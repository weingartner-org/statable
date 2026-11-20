/**
 * „Auffällige Werte suchen“ in der Karte Zeitreihen (scripts/ausreisser-zeitreihe-erwartet.R): ein einfaches, ehrlich benanntes Residuen-Verfahren mit Basis-R (engine/statable-prognose.R: `sp_ausreisser`, nur stats).
 * 1. Das Muster der Reihe abziehen: mit Saison (Periode 2 bis 24, mindestens drei Perioden) die robuste STL-Zerlegung (Rest = remainder), sonst das ARIMA-Modell der Automatik (Residuen).
 * 2. Den Rest robust standardisieren: z = (Rest - Median) / mad (mad = 1,4826 · Median der Abweichungen vom Median). 3. Auffällig ist |z| > Schwelle (3, 3,5 oder 4).
 * Das ist KEINE Erkennung nach Chen und Liu (AO, LS, TC) und nicht das Paket tsoutliers. Ein auffälliger Wert ist kein Fehler, nur ein Wert, der nicht zum Muster passt.
 * Gespeichert wird die Wahl samt Antwort (`AusreisserE`) am Ergebnis des Blatts, damit Bericht und Export ohne R stimmen.
 * SICHERHEIT: Der Aufruf enthält nur Zahlen (rGanz, rZahl, rBool); die Reihe geht als Spalte `y` der Tabelle `d` hinein, nie als Text im Code. Der Spaltenname erscheint nur im R-Text zum Ansehen (rAnzeigeName).
 */
import type { TableItem } from '../engine/types';
import { L, Lp, d } from './sitzung.svelte';
import { komma } from './ergebnis';
import { tabelle, fx, type Z } from './mwsaetze';
import { rGanz, rBool, rZahl, rFange, rAnzeigeName, rAnzeigeZahl } from '../engine/rsicher';
import type { RAufruf } from './kategreg';
import { prognoseSperre, prognoseCodeSatz, prognoseModellName, prognoseAutoErlaubt, hatLuecken, type PrognoseReihe, type PrognoseSperre, type PrognoseCode } from './prognose';

export const AUSREISSER_SCHWELLEN: readonly number[] = [3, 3.5, 4];
/** Probe mit reinem Rauschen ohne Ausreißer (scripts/ausreisser-zeitreihe-erwartet.R, set.seed(1)): mittlere Zahl der Werte über der Schwelle. STL: 400 Reihen mit 120 Werten, ARIMA: 150 Reihen mit 100 Werten.
 *  Bei normalverteilten Resten wären es nur 0,32 / 0,056 / 0,008 (n = 120): die Reste der robusten Zerlegung haben schwerere Ränder, darum sagt der Hinweis nicht „Zufall ist selten“. */
export const AUSREISSER_PROBE: Record<'stl' | 'arima', Record<number, number>> = { stl: { 3: 2.54, 3.5: 1.47, 4: 0.72 }, arima: { 3: 0.49, 3.5: 0.11, 4: 0.02 } };

/** Die Schwelle als Text: 3, 3,5 oder 4 (Dezimalzeichen nach Sprachprofil). */
export const schwelleText = (x: number): string => komma(x, Number.isInteger(x) ? 0 : 1);

export interface AusreisserWahl { schwelle: number; log: boolean }
export type AusreisserSperre = PrognoseSperre | 'luecken' | 'auto-zu-lang';
export type AusreisserFehlerCode = 'luecken-nur-selbst' | 'log-nicht-positiv' | 'alle-gleich' | 'streuung-null' | 'kein-modell' | 'nicht-konvergiert' | 'r-fehler';
export type AusreisserCode = AusreisserSperre | AusreisserFehlerCode;

/** Warum keine Rechnung möglich ist (oder null): die Sperren der Prognose (zu viele Lücken, ungleiche Abstände, unter 20 Werte, alle gleich), dazu jede Lücke und, ohne Saison, mehr als 600 Werte (die Automatik). */
export function ausreisserSperre(r: PrognoseReihe): AusreisserSperre | null {
  const s = prognoseSperre(r);
  if (s) return s;
  if (hatLuecken(r)) return 'luecken';
  if (!(r.periode >= 2 && r.periode <= 24 && r.y.length >= 3 * r.periode) && !prognoseAutoErlaubt(r.y.length)) return 'auto-zu-lang';
  return null;
}
/** Die Wahl in die erlaubten Grenzen: Schwelle nur 3, 3,5 oder 4 (sonst 3,5), Log nur bei Werten über 0. */
export function ausreisserWahlBereinigen(w: AusreisserWahl, logOk: boolean): AusreisserWahl {
  return { schwelle: AUSREISSER_SCHWELLEN.includes(w.schwelle) ? w.schwelle : 3.5, log: w.log === true && logOk };
}

/* ---------------------------------------------------------------- Aufruf an R */
/** Der Aufruf an `sp_ausreisser`; die Reihe steht als Spalte `y` in der Tabelle `d`. `w` ist schon bereinigt. Fehler kommen als `list(fehler = …)` zurück. */
export function ausreisserAufruf(w: AusreisserWahl, m: number): RAufruf {
  if (!AUSREISSER_SCHWELLEN.includes(w.schwelle)) throw new Error('Unzulässige Schwelle');
  return { code: rFange(`sp_ausreisser(d$y, ${rGanz(m)}, ${rBool(w.log)}, ${rZahl(w.schwelle)})`), args: {} };
}

/* ---------------------------------------------------------------- Antwort */
export interface AusreisserAntwort {
  modell: 'stl' | 'arima'; n: number;
  /** erster geprüfter Platz (1 = erster); davor entfallen d Werte der Differenzen */
  von: number;
  p: number; d: number; q: number; konst: boolean; periode: number; log: boolean; schwelle: number;
  median: number; skala: number;
  /** Rest und z für die Plätze von … n (auf der gerechneten Skala, bei Log also logarithmiert) */
  rest: number[]; z: number[];
  /** erwarteter Wert (Muster) auf der Skala der Reihe, für alle n Plätze */
  erwartet: number[];
  /** Plätze (1 = erster) mit |z| > Schwelle */
  auff: number[];
}
export interface AusreisserE { wahl: AusreisserWahl; antwort: AusreisserAntwort }

const arr = <T>(x: unknown): T[] => (x == null ? [] : Array.isArray(x) ? (x as T[]) : [x as T]);
const num = (x: unknown): number | null => { const v = arr<unknown>(x)[0]; return typeof v === 'number' && Number.isFinite(v) ? v : null; };
const nums = (x: unknown): number[] => arr<unknown>(x).map(v => (typeof v === 'number' ? v : NaN));
const istObjekt = (o: unknown): o is Record<string, unknown> => !!o && typeof o === 'object' && !Array.isArray(o) && !(Object.keys(o as object).length === 1 && 'type' in (o as object));
const FEHLER: readonly string[] = ['luecken-nur-selbst', 'log-nicht-positiv', 'alle-gleich', 'streuung-null', 'kein-modell', 'nicht-konvergiert', 'r-fehler'];

/** Die Antwort von `sp_ausreisser` lesen. Wirft nie. */
export function ausreisserLesen(roh: unknown): { ok: true; antwort: AusreisserAntwort } | { ok: false; code: AusreisserFehlerCode } {
  if (!istObjekt(roh)) return { ok: false, code: 'r-fehler' };
  if (roh.fehler !== undefined) { const f = String(arr<unknown>(roh.fehler)[0] ?? ''); return { ok: false, code: (FEHLER.includes(f) ? f : 'r-fehler') as AusreisserFehlerCode }; }
  const modell = String(arr<unknown>(roh.modell)[0] ?? ''), n = num(roh.n), von = num(roh.von), rest = nums(roh.rest), z = nums(roh.z), erwartet = nums(roh.erwartet), auff = nums(roh.auff);
  const skala = num(roh.skala), median = num(roh.median), schwelle = num(roh.schwelle);
  if ((modell !== 'stl' && modell !== 'arima') || n === null || von === null || skala === null || median === null || schwelle === null || skala <= 0) return { ok: false, code: 'r-fehler' };
  if (rest.length !== n - von + 1 || z.length !== rest.length || erwartet.length !== n || [...rest, ...z, ...erwartet].some(v => !Number.isFinite(v))) return { ok: false, code: 'r-fehler' };
  if (auff.some(v => !Number.isInteger(v) || v < von || v > n)) return { ok: false, code: 'r-fehler' };
  return { ok: true, antwort: {
    modell, n, von, p: num(roh.p) ?? 0, d: num(roh.d) ?? 0, q: num(roh.q) ?? 0, konst: arr<unknown>(roh.konst)[0] === true, periode: num(roh.periode) ?? 1, log: arr<unknown>(roh.log)[0] === true, schwelle,
    median, skala, rest, z, erwartet, auff
  } };
}

/* ---------------------------------------------------------------- Zeilen der Tabelle */
export interface AuffaelligerWert { platz: number; wert: number; erwartet: number; rest: number; z: number }
/** Die auffälligen Werte, der auffälligste zuerst. `rest` ist der Wert minus das Erwartete; bei Log-Skala die Abweichung in Prozent. */
export function auffaelligeWerte(a: AusreisserAntwort, y: (number | null)[]): AuffaelligerWert[] {
  return a.auff.map(pl => {
    const wert = y[pl - 1] ?? NaN, erw = a.erwartet[pl - 1]!;
    return { platz: pl, wert, erwartet: erw, rest: a.log ? (wert / erw - 1) * 100 : wert - erw, z: a.z[pl - a.von]! };
  }).sort((x, y2) => Math.abs(y2.z) - Math.abs(x.z) || x.platz - y2.platz);
}

/* ---------------------------------------------------------------- Namen, Sätze */
export function ausreisserVerfahrenText(a: Pick<AusreisserAntwort, 'modell' | 'p' | 'd' | 'q' | 'konst' | 'periode' | 'log'>): string {
  const skala = a.log ? L(', Log-Skala', ', log scale') : '';
  if (a.modell === 'stl') return L(`STL-Zerlegung (robust) mit Periode ${a.periode}${skala}`, `STL decomposition (robust) with period ${a.periode}${skala}`);
  const kon = a.konst ? (a.d === 1 ? L(' mit Drift', ' with drift') : L(' mit Mittelwert', ' with mean')) : '';
  return L(`${prognoseModellName({ p: a.p, d: a.d, q: a.q, P: 0, D: 0, Q: 0, periode: 1 })}${kon} aus der Automatik${skala}`, `${prognoseModellName({ p: a.p, d: a.d, q: a.q, P: 0, D: 0, Q: 0, periode: 1 })}${kon} from the automatic selection${skala}`);
}

export function ausreisserCodeSatz(c: AusreisserCode): string {
  switch (c) {
    case 'luecken':
    case 'luecken-nur-selbst': return L('In der Reihe fehlen Werte. Das Verfahren braucht eine Reihe ohne Lücken (STL und die ARIMA-Automatik vertragen keine Lücken); Statable füllt nichts auf.', 'Values are missing in the series. The method needs a series without gaps (STL and the automatic ARIMA selection cannot handle gaps); Statable fills in nothing.');
    case 'auto-zu-lang': return L('Ohne Saison rechnet das Verfahren über die ARIMA-Automatik, und die geht bis 600 Werte. Diese Reihe ist länger.', 'Without a season the method uses the automatic ARIMA selection, which goes up to 600 values. This series is longer.');
    case 'streuung-null': return L('Die Reste streuen praktisch nicht: Das Muster erklärt die Reihe fast vollständig, ein z-Wert lässt sich nicht bilden.', 'The remainders hardly vary: the pattern explains the series almost completely, so no z value can be formed.');
    case 'alle-gleich': return prognoseCodeSatz('alle-gleich');
    case 'log-nicht-positiv': return prognoseCodeSatz('log-nicht-positiv');
    case 'kein-modell': return prognoseCodeSatz('kein-modell');
    case 'nicht-konvergiert': return L('Das Muster der Reihe ließ sich nicht schätzen (die Rechnung konvergiert nicht).', 'The pattern of the series could not be estimated (the calculation does not converge).');
    case 'r-fehler': return L('R meldete bei der Suche nach auffälligen Werten einen Fehler.', 'R reported an error during the search for conspicuous values.');
    default: return prognoseCodeSatz(c as PrognoseCode);
  }
}
export const ausreisserHilfeSatz = (): string => d(
  'Das Verfahren zieht das Muster der Reihe ab (Trend und Saison) und prüft, welche Werte vom Rest stark abweichen. Es wird erst gerechnet, wenn du auf den Knopf klickst.',
  'Das Verfahren zieht das Muster der Reihe ab (Trend und Saison) und prüft, welche Werte vom Rest stark abweichen. Es wird erst gerechnet, wenn Sie auf den Knopf klicken.',
  'The method removes the pattern of the series (trend and season) and checks which values deviate strongly from the remainder. Nothing is calculated until you click the button.');

export interface AusreisserSatzEin { zeit: (platz: number) => string; stellen: number }
/** Der Hauptsatz: wie viele Werte bei welcher Schwelle auffällig sind und welcher am meisten. */
export function ausreisserHauptsatz(e: AusreisserE, y: (number | null)[], ein: AusreisserSatzEin): string {
  const a = e.antwort, k = a.auff.length, geprueft = a.rest.length, s = schwelleText(a.schwelle);
  if (k === 0) return L(`Bei der Schwelle |z| > ${s} ist kein Wert auffällig: Alle ${geprueft} geprüften Werte passen zum Muster.`, `With the threshold |z| > ${s} no value is conspicuous: all ${geprueft} checked values fit the pattern.`);
  const top = auffaelligeWerte(a, y)[0]!, z = komma(top.z, 1), wert = komma(top.wert, ein.stellen), zeit = ein.zeit(top.platz);
  return Lp(k, `Bei der Schwelle |z| > ${s} ist ${k} von ${geprueft} Werten auffällig. Der auffälligste: ${zeit} (${wert}, z = ${z}).`, `Bei der Schwelle |z| > ${s} sind ${k} von ${geprueft} Werten auffällig. Der auffälligste: ${zeit} (${wert}, z = ${z}).`,
    `With the threshold |z| > ${s}, ${k} of ${geprueft} values is conspicuous. The most conspicuous: ${zeit} (${wert}, z = ${z}).`, `With the threshold |z| > ${s}, ${k} of ${geprueft} values are conspicuous. The most conspicuous: ${zeit} (${wert}, z = ${z}).`);
}
export function ausreisserApa(e: AusreisserE): string {
  const a = e.antwort;
  return `${ausreisserVerfahrenText(a)}, |z| > ${schwelleText(a.schwelle)}: ${a.auff.length} / ${a.rest.length}`;
}

/* ---------------------------------------------------------------- Hinweise (immer sichtbar) */
export type AusreisserLeitCode = 'kein-fehler' | 'pruefen' | 'einfach' | 'zufall' | 'maskierung' | 'zusammenhang' | 'rand' | 'viele' | 'log';
export interface AusreisserLeitplanke { code: AusreisserLeitCode; satz: string }
/** Die Hinweise: ein auffälliger Wert ist kein Fehler; was man prüfen kann; kein Chen-Liu-Verfahren; die Schwelle als Verabredung; Grenzen des Verfahrens. */
export function ausreisserLeitplanken(e: AusreisserE): AusreisserLeitplanke[] {
  const a = e.antwort, aus: AusreisserLeitplanke[] = [], add = (code: AusreisserLeitCode, satz: string) => aus.push({ code, satz });
  add('kein-fehler', L('Ein auffälliger Wert ist kein Fehler. Er ist nur ein Wert, der nicht zum Muster der übrigen Reihe passt.', 'A conspicuous value is not an error. It is only a value that does not fit the pattern of the rest of the series.'));
  add('pruefen', d(
    'Was du prüfen kannst: Ist der Wert ein Tippfehler oder falsch erfasst? Gab es zu diesem Zeitpunkt ein besonderes Ereignis? Statable ändert und löscht nichts. Wirkt ein Ereignis ab einem Zeitpunkt, prüfst du es im Abschnitt „Hat die Maßnahme gewirkt?“ weiter unten.',
    'Was Sie prüfen können: Ist der Wert ein Tippfehler oder falsch erfasst? Gab es zu diesem Zeitpunkt ein besonderes Ereignis? Statable ändert und löscht nichts. Wirkt ein Ereignis ab einem Zeitpunkt, prüfen Sie es im Abschnitt „Hat die Maßnahme gewirkt?“ weiter unten.',
    'What you can check: is the value a typing error or recorded wrongly? Was there a special event at that point in time? Statable changes and deletes nothing. If an event acts from a point in time on, check it in the section "Did the measure work?" further down.'));
  add('einfach', L('Das ist ein einfaches Verfahren, keine Erkennung nach Chen und Liu und nicht das Paket tsoutliers. Es nennt nur auffällige Werte, nicht die Art der Störung (einmaliger Ausreißer, Niveauverschiebung, vorübergehende Änderung).', 'This is a simple method, not a detection after Chen and Liu and not the package tsoutliers. It only names conspicuous values, not the kind of disturbance (additive outlier, level shift, temporary change).'));
  const pr = AUSREISSER_PROBE[a.modell][a.schwelle], sw = schwelleText(a.schwelle);
  if (pr !== undefined) add('zufall', a.modell === 'stl'
    ? L(`Die Schwelle ${sw} ist eine Verabredung, kein Test. In einer Probe mit reinem Rauschen (400 Reihen zu je 120 Werten, ohne eingefügte Ausreißer) lagen bei dieser Schwelle im Mittel ${komma(pr, 1)} Werte darüber. Ein auffälliger Wert kann also auch Zufall sein.`, `The threshold ${sw} is a convention, not a test. In a trial with pure noise (400 series of 120 values each, without inserted outliers) the mean number of values above this threshold was ${komma(pr, 1)}. A conspicuous value can therefore also be chance.`)
    : L(`Die Schwelle ${sw} ist eine Verabredung, kein Test. In einer Probe mit reinem Rauschen (150 Reihen zu je 100 Werten, ohne eingefügte Ausreißer) lagen bei dieser Schwelle im Mittel ${komma(pr, 2)} Werte darüber. Ein auffälliger Wert kann also auch Zufall sein.`, `The threshold ${sw} is a convention, not a test. In a trial with pure noise (150 series of 100 values each, without inserted outliers) the mean number of values above this threshold was ${komma(pr, 2)}. A conspicuous value can therefore also be chance.`));
  if (a.modell === 'arima') add('maskierung', L('Ohne Saison zieht das Verfahren ein ARIMA-Modell ab, das nicht robust schätzt: Ein sehr starker Ausreißer kann das Modell verziehen und andere Werte verdecken. Bei Reihen mit Saison arbeitet die robuste STL-Zerlegung.', 'Without a season the method removes an ARIMA model, which is not estimated robustly: a very strong outlier can distort the model and hide other values. For series with a season the robust STL decomposition is used.'));
  add('zusammenhang', L('Jeder Rest wird einzeln beurteilt. Hängen benachbarte Reste zusammen, zählt das Verfahren eine Reihe auffälliger Werte nebeneinander nicht als eine Veränderung.', 'Each remainder is judged on its own. If neighbouring remainders are related, the method does not count a run of conspicuous values next to each other as one change.'));
  if (a.von > 1) add('rand', Lp(a.von - 1, `Der erste Wert wird nicht geprüft: Durch die Differenz des Modells hat er keinen Vorgänger.`, `Die ersten ${a.von - 1} Werte werden nicht geprüft: Durch die Differenzen des Modells haben sie keine Vorgänger.`, `The first value is not checked: because of the model's difference it has no predecessor.`, `The first ${a.von - 1} values are not checked: because of the model's differences they have no predecessors.`));
  if (a.auff.length * 10 > a.rest.length) add('viele', L('Mehr als jeder zehnte Wert ist auffällig. Dann passt das Muster vermutlich nicht gut zur Reihe, und die Liste sagt wenig über einzelne Werte.', 'More than one in ten values is conspicuous. Then the pattern probably does not fit the series well, and the list says little about single values.'));
  if (a.log) add('log', L('Die Rechnung läuft auf der Log-Skala: z misst relative Abweichungen; in der Tabelle steht die Abweichung in Prozent vom erwarteten Wert.', 'The calculation runs on the log scale: z measures relative deviations; the table shows the deviation in percent of the expected value.'));
  return aus;
}

/* ---------------------------------------------------------------- Tabellen */
export const AUSREISSER_LABELS: readonly string[] = ['Auffällige Werte', 'Auffällige Werte-Verfahren'];
export interface AusreisserTabEin { name: string; zeit: (platz: number) => string; y: (number | null)[]; stellen: number }
const zfx = (v: number, dz: number): Z => (Number.isFinite(v) ? fx(v, dz) : '-');
export function ausreisserTabellen(e: AusreisserE, ein: AusreisserTabEin): TableItem[] {
  const a = e.antwort, aus: TableItem[] = [], liste = auffaelligeWerte(a, ein.y);
  if (liste.length) {
    aus.push(tabelle('Auffällige Werte', L(`Auffällige Werte ${ein.name}`, `Conspicuous values ${ein.name}`),
      [L('Zeitpunkt', 'Point in time'), L('Wert', 'Value'), L('Erwartet', 'Expected'), a.log ? L('Abweichung in %', 'Deviation in %') : L('Rest', 'Remainder'), 'z'],
      liste.map(w => [ein.zeit(w.platz), zfx(w.wert, ein.stellen), zfx(w.erwartet, ein.stellen), zfx(w.rest, a.log ? 1 : ein.stellen), zfx(w.z, 2)]),
      [a.modell === 'stl'
        ? L(`Auffällig ist |z| > ${schwelleText(a.schwelle)}, der auffälligste Wert zuerst. Erwartet ist das Muster (Trend + Saison); Rest = Wert − Erwartet. z = (Rest − Median) / (1,4826 · MAD).`, `Conspicuous means |z| > ${schwelleText(a.schwelle)}, the most conspicuous value first. Expected is the pattern (trend + season); remainder = value − expected. z = (remainder − median) / (1.4826 · MAD).`)
        : L(`Auffällig ist |z| > ${schwelleText(a.schwelle)}, der auffälligste Wert zuerst. Erwartet ist der Wert des Modells; Rest = Wert − Erwartet. z = (Rest − Median) / (1,4826 · MAD).`, `Conspicuous means |z| > ${schwelleText(a.schwelle)}, the most conspicuous value first. Expected is the value of the model; remainder = value − expected. z = (remainder − median) / (1.4826 · MAD).`)]));
  }
  const g: Z[][] = [
    [L('Muster', 'Pattern'), ausreisserVerfahrenText(a)],
    [L('Geprüfte Werte', 'Checked values'), { t: komma(a.rest.length, 0), n: a.rest.length }],
    [L('Median der Reste', 'Median of the remainders'), zfx(a.median, 4)],
    [L('Streuung der Reste (1,4826 · MAD)', 'Spread of the remainders (1.4826 · MAD)'), zfx(a.skala, 4)],
    [L('Schwelle |z|', 'Threshold |z|'), zfx(a.schwelle, 1)],
    [L('Auffällige Werte', 'Conspicuous values'), { t: komma(a.auff.length, 0), n: a.auff.length }]
  ];
  aus.push(tabelle('Auffällige Werte-Verfahren', L('Auffällige Werte: Verfahren', 'Conspicuous values: method'), [L('Kennzahl', 'Measure'), L('Wert', 'Value')], g,
    [L('Einfaches Residuen-Verfahren, keine Erkennung nach Chen und Liu. MAD: Median der Abweichungen vom Median (R: stats::mad mit dem Faktor 1,4826).', 'Simple remainder method, not a detection after Chen and Liu. MAD: median absolute deviation from the median (R: stats::mad with the factor 1.4826).')]));
  return aus;
}

/* ---------------------------------------------------------------- R-Text zum Ansehen (wird nie ausgeführt) */
/** Der R-Aufruf zum Nachrechnen: `stl` oder `arima`, dann z = (Rest − Median) / mad. Spaltenname nur über rAnzeigeName, Zahlen über rAnzeigeZahl. */
export function ausreisserRCode(e: AusreisserE, spalte: string): string {
  const a = e.antwort, reihe = (a.log ? 'log(' : '(') + 'daten$' + rAnzeigeName(spalte) + ')';
  const kopf = [`# ${L('daten: die Tabelle in R', 'daten: your table in R')}`, `z <- ts(${reihe}, frequency = ${rAnzeigeZahl(a.periode)})`];
  if (a.modell === 'stl') kopf.push(`rest <- as.numeric(stl(z, s.window = "periodic", robust = TRUE)$time.series[, "remainder"])`);
  else {
    const drift = a.konst && a.d === 1, mittel = a.d === 0 ? `, include.mean = ${a.konst ? 'TRUE' : 'FALSE'}` : '', xreg = drift ? ', xreg = cbind(drift = seq_along(z))' : '';
    kopf.push(`fit <- arima(z, order = c(${rAnzeigeZahl(a.p)}, ${rAnzeigeZahl(a.d)}, ${rAnzeigeZahl(a.q)})${mittel}${xreg})`, `rest <- as.numeric(residuals(fit))${a.d > 0 ? `[-seq_len(${rAnzeigeZahl(a.d)})]` : ''}   # ${L('die ersten Reste der Differenzen entfallen', 'the first remainders of the differences are dropped')}`);
  }
  kopf.push(`zw <- (rest - median(rest)) / mad(rest)   # ${L('mad(): 1,4826 mal der Median der Abweichungen vom Median', 'mad(): 1.4826 times the median of the deviations from the median')}`, `which(abs(zw) > ${rAnzeigeZahl(a.schwelle)}) + ${rAnzeigeZahl(a.von - 1)}   # ${L('Plätze der auffälligen Werte', 'positions of the conspicuous values')}`);
  return kopf.join('\n');
}
