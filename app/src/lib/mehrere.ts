/**
 * „Mehrere Reihen auf einmal“ in der Karte Zeitreihen (Fachblatt docs/fachblaetter/GLAETTUNG-SERIEN.md, Abschnitt 4): zwei bis 20 Zahlenspalten mit derselben Datumsspalte und denselben Einstellungen.
 * Gerechnet wird nacheinander die ARIMA-Automatik der Einzelprognose (dieselbe Funktion `sp_prognose_arima`, keine neue Rechnung, keine neuen Sollwerte) mit Prüfzeitraum. Scheitert eine Reihe, steht in ihrer Zeile der Grund;
 * die anderen laufen weiter. Die Rechnung selbst (R) und der Aufbau der Reihe aus den Daten werden hereingereicht (`rechner`, `bauer`), damit hier alles ohne R prüfbar bleibt.
 * Gespeichert wird alles am Ergebnis des Blatts (`ZeitreiheE.mehrere`), damit Bericht und Export ohne R stimmen. SICHERHEIT: Hier wird kein R-Text gebaut; der Aufruf entsteht in lib/prognose.ts (nur Wörter und Zahlen), die Reihen gehen als Spalten hinein.
 */
import type { TableItem } from '../engine/types';
import { L, Lp, d } from './sitzung.svelte';
import { pWert } from './ergebnis';
import { zitat } from '../i18n/profil';
import { tabelle, fx, type Z } from './mwsaetze';
import type { Raster, ReiheCode } from './zeitreihe';
import { prognoseSperre, prognoseCodeSatz, prognoseWahlBereinigen, prognoseWahlGrund, pruefzeitraumLaenge, logMoeglich, prognoseStellen, prognoseModellText, type PrognoseWahl, type PrognoseAntwort, type PrognoseCode } from './prognose';
import { zeitreiheCodeSatz } from './zeitreihesaetze';

export const MEHRERE_MIN = 2, MEHRERE_MAX = 20;
/** Die Beschriftungen (label) der Tabellen, damit das Blatt sie in ihrem Abschnitt zeigt. */
export const MEHRERE_LABELS: readonly string[] = ['Mehrere-Reihen', 'Mehrere-Reihen-Prognosen'];

/** Die gemeinsamen Einstellungen: welche Spalten, Horizont (je Reihe höchstens der Höchste dieser Reihe) und Log-Skala (nur, wenn alle Werte der Reihe über 0 liegen; sonst steht in der Zeile der Grund). */
export interface MehrereWahl { spalten: string[]; h: number; log: boolean }
/** Von der Reihe wird nur gespeichert, was für Zeitpunkte, Stellen und „Als eigene Auswertung übernehmen“ nötig ist. */
export interface MehrereReihe { raster: Raster; periode: number; erster: string; t: number[]; y: (number | null)[] }
export type MehrereGrund = { art: 'reihe'; code: ReiheCode; ausgeschlossen?: number; n?: number } | { art: 'prognose'; code: PrognoseCode } | { art: 'text'; text: string };
export type MehrereZeile =
  | { spalte: string; ok: true; wahl: PrognoseWahl; pr: number; antwort: PrognoseAntwort; reihe: MehrereReihe }
  | { spalte: string; ok: false; grund: MehrereGrund };
/** `raster` und `periode`: was beim Aufbau der Reihen vorgegeben wurde (null = erkannt), damit eine übernommene Reihe genauso aufgebaut wird. */
export interface MehrereE { wahl: MehrereWahl; datum: string; raster: Raster | null; periode: number | null; zeilen: MehrereZeile[] }

export type MehrereSperre = 'zu-wenige' | 'zu-viele';
/** Zwei bis 20 Spalten. */
export function mehrereSperre(anzahl: number): MehrereSperre | null {
  return anzahl < MEHRERE_MIN ? 'zu-wenige' : anzahl > MEHRERE_MAX ? 'zu-viele' : null;
}
export function mehrereCodeSatz(c: MehrereSperre): string {
  return c === 'zu-wenige' ? d('Für mehrere Reihen wählst du mindestens zwei Zahlenspalten.', 'Für mehrere Reihen wählen Sie mindestens zwei Zahlenspalten.', 'For several series you choose at least two number columns.') : L('Mehrere Reihen auf einmal gehen bis 20 Spalten.', 'Several series at once work with up to 20 columns.');
}
export function mehrereGrundSatz(g: MehrereGrund): string {
  if (g.art === 'text') return g.text;
  if (g.art === 'prognose') return prognoseCodeSatz(g.code);
  return zeitreiheCodeSatz(g.code, { ausgeschlossen: g.ausgeschlossen ?? 0, n: g.n ?? 0 });
}

/* ---------------------------------------------------------------- Rechnen */
export interface BauEin { raster: Raster; periode: number; erster: string; t: number[]; y: (number | null)[] }
export type Bauer = (spalte: string) => { ok: true; e: BauEin } | { ok: false; code: ReiheCode; ausgeschlossen?: number };
export type Rechner = (y: (number | null)[], m: number, wahl: PrognoseWahl, pr: number) => Promise<PrognoseAntwort>;
export interface MehrereLauf { fortschritt?: (fertig: number, gesamt: number) => void; abbruch?: () => boolean }
const mitText = (x: unknown): string => (x as Error)?.message ?? String(x);

/** Rechnet die Reihen nacheinander. Jede Reihe: Sperren der Einzelprognose (Lücken über 10 %, ungleiche Abstände, unter 20 Werte, alle gleich, Log mit Wert ≤ 0), dann `rechner` mit der ARIMA-Automatik und dem Prüfzeitraum.
 *  Ein Fehler in einer Reihe ist ein Satz in ihrer Zeile; die anderen laufen weiter. `abbruch` wird vor jeder Reihe gefragt; die schon fertigen Zeilen bleiben. */
export async function mehrereRechnen(wahl: MehrereWahl, bauer: Bauer, rechner: Rechner, lauf: MehrereLauf = {}): Promise<{ zeilen: MehrereZeile[]; abgebrochen: boolean }> {
  const zeilen: MehrereZeile[] = [], gesamt = wahl.spalten.length;
  lauf.fortschritt?.(0, gesamt);
  for (let i = 0; i < gesamt; i++) {
    if (lauf.abbruch?.()) return { zeilen, abgebrochen: true };
    const spalte = wahl.spalten[i]!;
    zeilen.push(await eineReihe(spalte, wahl, bauer, rechner));
    lauf.fortschritt?.(i + 1, gesamt);
  }
  return { zeilen, abgebrochen: false };
}
async function eineReihe(spalte: string, wahl: MehrereWahl, bauer: Bauer, rechner: Rechner): Promise<MehrereZeile> {
  const fail = (grund: MehrereGrund): MehrereZeile => ({ spalte, ok: false, grund });
  const b = bauer(spalte);
  if (!b.ok) return fail({ art: 'reihe', code: b.code, ausgeschlossen: b.ausgeschlossen });
  const e = b.e, reihe = { raster: e.raster, periode: e.periode, y: e.y };
  const sperre = prognoseSperre(reihe);
  if (sperre) return fail({ art: 'prognose', code: sperre });
  if (wahl.log && !logMoeglich(reihe)) return fail({ art: 'prognose', code: 'log-nicht-positiv' });
  const w = prognoseWahlBereinigen({ art: 'auto', h: wahl.h, log: wahl.log, p: 0, d: 1, q: 1, P: 0, D: 0, Q: 0, konst: false, glaettung: 'einfach' }, reihe);
  const grund = prognoseWahlGrund(w, reihe);
  if (grund) return fail({ art: 'prognose', code: grund });
  const pr = pruefzeitraumLaenge(e.y.length, e.periode);
  try {
    const antwort = await rechner(e.y, e.periode, w, pr);
    return { spalte, ok: true, wahl: w, pr, antwort, reihe: { raster: e.raster, periode: e.periode, erster: e.erster, t: e.t, y: e.y } };
  } catch (x) { return fail({ art: 'text', text: mitText(x) }); }
}

/* ---------------------------------------------------------------- Auffällige Reihen */
export type MehrereFlag = 'ljung' | 'pruef';
/** Auffällig: Ljung-Box (p < ,05: die Residuen hängen noch zusammen) oder im Prüfzeitraum nicht besser als die einfache Regel. */
export function mehrereFlags(z: MehrereZeile): MehrereFlag[] {
  if (!z.ok) return [];
  const aus: MehrereFlag[] = [];
  if (z.antwort.ljung && z.antwort.ljung.p < 0.05) aus.push('ljung');
  if (z.antwort.pruef && z.antwort.pruef.rmse >= z.antwort.pruef.rmseNaiv) aus.push('pruef');
  return aus;
}
const flagText = (f: MehrereFlag): string => (f === 'ljung'
  ? L('Ljung-Box: Die Residuen hängen noch zusammen', 'Ljung-Box: the residuals are still related')
  : L('Im Prüfzeitraum nicht besser als die einfache Regel', 'In the test period not better than the simple rule'));

/* ---------------------------------------------------------------- Sätze und Warnungen */
export function mehrereHauptsatz(e: MehrereE): string {
  const gesamt = e.zeilen.length, ok = e.zeilen.filter(z => z.ok).length;
  return ok === gesamt
    ? L(`Alle ${gesamt} Reihen wurden mit der ARIMA-Automatik gerechnet, jede mit eigenem Modell und eigenem Prüfzeitraum.`, `All ${gesamt} series were calculated with the automatic ARIMA selection, each with its own model and its own test period.`)
    : L(`${ok} von ${gesamt} Reihen wurden mit der ARIMA-Automatik gerechnet; bei den übrigen steht der Grund in der Tabelle.`, `${ok} of ${gesamt} series were calculated with the automatic ARIMA selection; for the others the table gives the reason.`);
}
export type MehrereWarnCode = 'eigenes-modell' | 'auffaellig';
export interface MehrereWarnung { code: MehrereWarnCode; satz: string }
/** Warnungen, immer sichtbar: jede Reihe bekommt ein eigenes Modell ohne Blick darauf, Zufallsfunde bei vielen Reihen; dazu die auffälligen Reihen mit Namen. */
export function mehrereWarnungen(e: MehrereE, name: (n: string) => string = x => x): MehrereWarnung[] {
  const aus: MehrereWarnung[] = [{ code: 'eigenes-modell', satz: L('Jede Reihe bekommt ihr eigenes Modell, ohne dass jemand es ansieht. Bei vielen Reihen fallen einzelne Tests schon durch Zufall auf.', 'Every series gets its own model without anyone looking at it. With many series, single tests turn up by chance alone.') }];
  const auf = e.zeilen.filter(z => mehrereFlags(z).length > 0), namen = auf.map(z => zitat(name(z.spalte))).join(', '), n = auf.length;
  if (n > 0) aus.push({ code: 'auffaellig', satz: Lp(n, `Eine Reihe ist auffällig (Ljung-Box oder Prüfzeitraum): ${namen}. Sie sollte man einzeln ansehen.`, `${n} Reihen sind auffällig (Ljung-Box oder Prüfzeitraum): ${namen}. Sie sollte man einzeln ansehen.`,
    `One series is conspicuous (Ljung-Box or test period): ${namen}. It should be looked at on its own.`, `${n} series are conspicuous (Ljung-Box or test period): ${namen}. They should be looked at one by one.`) });
  return aus;
}

/* ---------------------------------------------------------------- Tabellen */
export interface MehrereTabEin { name: (n: string) => string; zeiten: (r: MehrereReihe, h: number) => string[] }
const zfx = (v: number | null | undefined, d: number): Z => (v === null || v === undefined || !Number.isFinite(v) ? '-' : fx(v, d));
export function mehrereTabellen(e: MehrereE, ein: MehrereTabEin): TableItem[] {
  const zeilen: Z[][] = e.zeilen.map(z => {
    const nm = ein.name(z.spalte);
    if (!z.ok) return [nm, '-', '-', '-', '-', '-', '-', '-', '-', mehrereGrundSatz(z.grund)];
    const a = z.antwort, st = prognoseStellen(z.reihe.y), k = a.mittel.length, fl = mehrereFlags(z);
    const lj: Z = a.ljung ? { t: pWert(a.ljung.p).replace(/^= /, ''), n: a.ljung.p } : '-';
    return [nm, prognoseModellText(a), zfx(a.aicc, 2), zfx(a.rmse, 2), zfx(a.pruef?.rmse, 2), zfx(a.pruef?.rmseNaiv, 2), lj, zfx(a.mittel[0], st), zfx(a.mittel[k - 1], st), fl.map(flagText).join('; ') || '-'];
  });
  const kopf = [L('Reihe', 'Series'), L('Modell', 'Model'), 'AICc', 'RMSE', L('RMSE im Prüfzeitraum', 'RMSE in the test period'), L('RMSE einfache Regel', 'RMSE simple rule'), 'Ljung-Box p', L('Erste Prognose', 'First forecast'), L('Letzte Prognose', 'Last forecast'), L('Hinweis', 'Note')];
  const uebersicht = tabelle('Mehrere-Reihen', L('Mehrere Reihen: ARIMA-Automatik je Reihe', 'Several series: automatic ARIMA selection for each series'), kopf, zeilen,
    [L('Jede Reihe wurde mit der ARIMA-Automatik gerechnet, mit eigenem Modell und eigenem Prüfzeitraum. RMSE im Prüfzeitraum: das Modell gegen die einfache Regel (letzter Wert, bei Saison der Wert eine Periode davor). RMSE, Ljung-Box und AICc gelten für die Anpassung der jeweiligen Reihe.',
      'Each series was calculated with the automatic ARIMA selection, with its own model and its own test period. RMSE in the test period: the model against the simple rule (last value, with a season the value one period earlier). RMSE, Ljung-Box and AICc refer to the fit of the respective series.')]);
  const lang: Z[][] = e.zeilen.flatMap(z => {
    if (!z.ok) return [];
    const a = z.antwort, st = prognoseStellen(z.reihe.y), zt = ein.zeiten(z.reihe, a.mittel.length);
    return a.mittel.map((v, i) => [ein.name(z.spalte), zt[i] ?? String(i + 1), zfx(v, st), zfx(a.u80[i], st), zfx(a.o80[i], st), zfx(a.u95[i], st), zfx(a.o95[i], st)]);
  });
  const prog = tabelle('Mehrere-Reihen-Prognosen', L('Mehrere Reihen: alle Prognosen in langer Form', 'Several series: all forecasts in long form'),
    [L('Reihe', 'Series'), L('Zeitpunkt', 'Point in time'), L('Prognose', 'Forecast'), L('80 % unten', '80% lower'), L('80 % oben', '80% upper'), L('95 % unten', '95% lower'), L('95 % oben', '95% upper')], lang,
    [L('Eine Zeile je Reihe und Zeitpunkt; geeignet zum Weiterverarbeiten. Die Grenzen sind Prognoseintervalle der Normalverteilung (stats::predict).', 'One row per series and point in time; suitable for further processing. The limits are prediction intervals of the normal distribution (stats::predict).')]);
  return lang.length ? [uebersicht, prog] : [uebersicht];
}
