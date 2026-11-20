/**
 * Granger-Test zu zwei Zeitreihen (Fachblatt docs/fachblaetter/MASSNAHME.md, Abschnitt 2): Ergänzung zur Kreuzkorrelation, auf Knopfdruck. Gerechnet wird in R (engine/statable-prognose.R: `sp_granger`,
 * `lm` und `anova`, nur stats), immer in beiden Richtungen. Hier stehen die Wahl von k, die Sperren, der Aufruf, das Lesen der Antwort, die Sätze, Warnungen, Tabellen und der R-Text zum Ansehen.
 * Gespeichert wird die Antwort am Ergebnis des Blatts (`ZeitreiheE.granger`). Keine Automatik nach kleinstem p: k wählt die Person, die Vorgabe ist m bei Saison, sonst 3.
 * SICHERHEIT: Der Aufruf enthält nur feste Wörter und Zahlen (rGanz); die Reihen gehen als Spalten `x` und `y` der Tabelle `d` hinein, nie als Text im Code.
 */
import type { TableItem } from '../engine/types';
import { L, Lp } from './sitzung.svelte';
import { komma, pWert } from './ergebnis';
import { dfKlammer, zitat, pfeil } from '../i18n/profil';
import { tabelle, fx, type Z } from './mwsaetze';
import { rGanz, rFange, rAnzeigeName, rAnzeigeZahl } from '../engine/rsicher';
import type { RAufruf } from './kategreg';
import { KPSS_GRENZE } from './zeitreihenabrunden';

export const GRANGER_MIN = 30;
/** Die Beschriftungen (label) der Tabellen, damit das Blatt sie in ihrem Abschnitt zeigt. */
export const GRANGER_LABELS: readonly string[] = ['Granger-Test', 'Granger-KPSS'];

/* ---------------------------------------------------------------- Wahl von k und Sperren */
/** Höchstes k: ⌊n/4⌋, mindestens 1. */
export const grangerKMax = (n: number): number => Math.max(1, Math.floor(n / 4));
/** Vorgabe: die Periode bei Saison (m ≥ 2), sonst 3; nie über dem Höchsten. */
export const grangerKStandard = (n: number, m: number): number => Math.min(grangerKMax(n), m >= 2 ? m : 3);
export type GrangerSperre = 'laenge' | 'luecken' | 'zu-kurz' | 'konstant';
export type GrangerFehlerCode = GrangerSperre | 'k-ungueltig' | 'nicht-eindeutig' | 'r-fehler';
const gut = (v: number | null | undefined): v is number => typeof v === 'number' && Number.isFinite(v);

/** Warum kein Granger-Test gerechnet wird (oder null): unterschiedliche Länge, Lücken, unter 30 Werte, eine konstante Reihe. Nichts wird aufgefüllt. */
export function grangerSperre(x: (number | null)[], y: (number | null)[]): GrangerSperre | null {
  if (x.length !== y.length) return 'laenge';
  if (x.some(v => !gut(v)) || y.some(v => !gut(v))) return 'luecken';
  if (y.length < GRANGER_MIN) return 'zu-kurz';
  if (x.every(v => v === x[0]) || y.every(v => v === y[0])) return 'konstant';
  return null;
}
/** Ist k eine ganze Zahl von 1 bis ⌊n/4⌋? */
export const grangerKGueltig = (k: number, n: number): boolean => Number.isInteger(k) && k >= 1 && k <= grangerKMax(n);

export function grangerCodeSatz(c: GrangerFehlerCode): string {
  switch (c) {
    case 'laenge': return L('Die beiden Reihen müssen gleich lang sein und dieselben Zeitpunkte haben.', 'The two series must be equally long and have the same points in time.');
    case 'luecken': return L('In einer der beiden Reihen fehlen Werte. Der Granger-Test braucht Reihen ohne Lücken; Statable füllt nichts auf.', 'Values are missing in one of the two series. The Granger test needs series without gaps; Statable fills in nothing.');
    case 'zu-kurz': return L('Für den Granger-Test brauchen die Reihen mindestens 30 Werte.', 'The Granger test needs at least 30 values in the series.');
    case 'konstant': return L('Eine der beiden Reihen hat nur einen Wert (alle Werte gleich); dafür gibt es keinen Test.', 'One of the two series has only one value (all values equal); there is no test for it.');
    case 'k-ungueltig': return L('Hier gilt eine ganze Zahl von 1 bis zu einem Viertel der Reihe.', 'A whole number from 1 up to a quarter of the series applies here.');
    case 'nicht-eindeutig': return L('Die Verzögerungen der beiden Reihen lassen sich nicht auseinanderhalten (sie sind voneinander abhängig); mit diesem k geht der Test nicht.', 'The lags of the two series cannot be told apart (they depend on each other); the test does not work with this k.');
    case 'r-fehler': return L('R meldete beim Granger-Test einen Fehler.', 'R reported an error during the Granger test.');
  }
}
export const grangerHilfeSatz = (): string => L('Der Test fragt, ob frühere Werte der einen Reihe helfen, die andere vorherzusagen, über deren eigene Vergangenheit hinaus. Er rechnet immer in beide Richtungen und erst nach Klick auf den Knopf.', 'The test asks whether earlier values of one series help to predict the other, beyond that series\' own past. It always calculates in both directions and only after the button is clicked.');

/* ---------------------------------------------------------------- Aufruf an R */
/** Der Aufruf an `sp_granger`; die Reihen stehen als Spalten `x` und `y` in der Tabelle `d`. */
export const grangerAufruf = (k: number): RAufruf => ({ code: rFange(`sp_granger(d$x, d$y, ${rGanz(k)})`), args: {} });

/* ---------------------------------------------------------------- Antwort */
export interface GrangerRichtung { F: number; df1: number; df2: number; p: number }
/** `xy`: frühere Werte von x helfen, y vorherzusagen; `yx` umgekehrt. */
export interface GrangerAntwort { k: number; n: number; xy: GrangerRichtung; yx: GrangerRichtung; kpssX: number; kpssY: number }
/** Das, was am Blatt gespeichert wird. */
export interface GrangerE { antwort: GrangerAntwort }

const arr = <T>(x: unknown): T[] => (x == null ? [] : Array.isArray(x) ? (x as T[]) : [x as T]);
const num = (x: unknown): number | null => { const v = arr<unknown>(x)[0]; return typeof v === 'number' && Number.isFinite(v) ? v : null; };
const istObjekt = (o: unknown): o is Record<string, unknown> => !!o && typeof o === 'object' && !Array.isArray(o) && !(Object.keys(o as object).length === 1 && 'type' in (o as object));
const FEHLER: readonly string[] = ['laenge', 'luecken', 'zu-kurz', 'konstant', 'k-ungueltig', 'nicht-eindeutig', 'r-fehler'];
function richtung(o: unknown): GrangerRichtung | null {
  if (!istObjekt(o)) return null;
  const F = num(o.F), df1 = num(o.df1), df2 = num(o.df2), p = num(o.p);
  return F === null || df1 === null || df2 === null || p === null ? null : { F, df1, df2, p };
}
/** Die Antwort von R lesen. Wirft nie. */
export function grangerLesen(roh: unknown): { ok: true; antwort: GrangerAntwort } | { ok: false; code: GrangerFehlerCode } {
  if (!istObjekt(roh)) return { ok: false, code: 'r-fehler' };
  if (roh.fehler !== undefined) { const f = String(arr<unknown>(roh.fehler)[0]); return { ok: false, code: (FEHLER.includes(f) ? f : 'r-fehler') as GrangerFehlerCode }; }
  const k = num(roh.k), n = num(roh.n), xy = richtung(roh.xy), yx = richtung(roh.yx), kx = num(roh.kpss_x), ky = num(roh.kpss_y);
  if (k === null || n === null || !xy || !yx || kx === null || ky === null) return { ok: false, code: 'r-fehler' };
  return { ok: true, antwort: { k, n, xy, yx, kpssX: kx, kpssY: ky } };
}

/* ---------------------------------------------------------------- Sätze und Warnungen */
export interface GrangerNamen { x: string; y: string }
const FZ = (v: number) => komma(v, 2);
/** Je Richtung ein Satz: ob frühere Werte von `von` helfen, `nach` vorherzusagen. Bei p < ,05 „helfen“, sonst „kein deutlicher Beitrag“; nie „verursacht“. */
export function grangerRichtungSatz(r: GrangerRichtung, k: number, von: string, nach: string): string {
  const stat = `F${dfKlammer(komma(r.df1, 0), komma(r.df2, 0))} = ${FZ(r.F)}, p ${pWert(r.p)}, k = ${k}`;
  return r.p < 0.05
    ? L(`Frühere Werte von ${zitat(von)} helfen, ${zitat(nach)} vorherzusagen, über die Vergangenheit von ${zitat(nach)} hinaus (${stat}).`, `Earlier values of ${zitat(von)} help to predict ${zitat(nach)}, beyond the past of ${zitat(nach)} (${stat}).`)
    : L(`Für frühere Werte von ${zitat(von)} ergibt sich kein deutlicher Beitrag zur Vorhersage von ${zitat(nach)} (${stat}).`, `Earlier values of ${zitat(von)} show no clear contribution to predicting ${zitat(nach)} (${stat}).`);
}
export function grangerSaetze(g: GrangerE, n: GrangerNamen): string[] {
  const a = g.antwort;
  return [grangerRichtungSatz(a.xy, a.k, n.x, n.y), grangerRichtungSatz(a.yx, a.k, n.y, n.x)];
}
export type GrangerWarnCode = 'ursache' | 'stationaer' | 'k';
export interface GrangerWarnung { code: GrangerWarnCode; satz: string }
/** Die Warnungen des Fachblatts: Vorauslaufen ist keine Ursache (immer), Stationarität nach KPSS (Satz bei über 0,463), das Ergebnis hängt von k ab (immer). */
export function grangerWarnungen(g: GrangerE, n: GrangerNamen): GrangerWarnung[] {
  const a = g.antwort, aus: GrangerWarnung[] = [];
  aus.push({ code: 'ursache', satz: L('Vorauslaufen ist keine Ursache. Frühere Werte der einen Reihe helfen, die andere vorherzusagen; mehr heißt das nicht. Ein dritter Einfluss kann beide Reihen treiben.', 'Leading is not causing. Earlier values of one series help to predict the other; that is all it means. A third influence can drive both series.') });
  const nicht = [[n.x, a.kpssX], [n.y, a.kpssY]].filter(([, k]) => (k as number) > KPSS_GRENZE) as [string, number][];
  if (nicht.length) {
    const namen = nicht.map(([t]) => zitat(t)).join(` ${L('und', 'and')} `), werte = nicht.map(([, k]) => komma(k, 3)).join(' / ');
    aus.push({ code: 'stationaer', satz: Lp(nicht.length, `Nach KPSS wirkt die Reihe ${namen} nicht stationär (KPSS ${werte}, Grenze ${komma(KPSS_GRENZE, 3)}). Die Reihen sollten vorher differenziert werden, sonst sind die p-Werte unzuverlässig; Statable differenziert nicht von selbst.`,
      `Nach KPSS wirken die Reihen ${namen} nicht stationär (KPSS ${werte}, Grenze ${komma(KPSS_GRENZE, 3)}). Die Reihen sollten vorher differenziert werden, sonst sind die p-Werte unzuverlässig; Statable differenziert nicht von selbst.`,
      `According to KPSS the series ${namen} does not look stationary (KPSS ${werte}, limit ${komma(KPSS_GRENZE, 3)}). The series should be differenced beforehand, otherwise the p values are unreliable; Statable does not difference by itself.`,
      `According to KPSS the series ${namen} do not look stationary (KPSS ${werte}, limit ${komma(KPSS_GRENZE, 3)}). The series should be differenced beforehand, otherwise the p values are unreliable; Statable does not difference by itself.`) });
  }
  aus.push({ code: 'k', satz: L(`Das Ergebnis hängt von k ab: Es gilt für genau ${a.k} Verzögerungen. Mehrere k durchzuprobieren und das kleinste p zu nehmen ist falsch.`, `The result depends on k: it holds for exactly ${a.k} lags. Trying several k and taking the smallest p is wrong.`) });
  return aus;
}

/* ---------------------------------------------------------------- Tabellen */
const zfx = (v: number, d: number): Z => fx(v, d);
export function grangerTabellen(g: GrangerE, n: GrangerNamen): TableItem[] {
  const a = g.antwort;
  const zeile = (r: GrangerRichtung, von: string, nach: string): Z[] => [`${zitat(von)} ${pfeil()} ${zitat(nach)}`, { t: komma(a.k, 0), n: a.k }, zfx(r.F, 3), { t: komma(r.df1, 0), n: r.df1 }, { t: komma(r.df2, 0), n: r.df2 }, { t: pWert(r.p).replace(/^= /, ''), n: r.p }];
  return [
    tabelle('Granger-Test', L('Granger-Test', 'Granger test'), [L('Richtung', 'Direction'), 'k', 'F', 'df1', 'df2', 'p'], [zeile(a.xy, n.x, n.y), zeile(a.yx, n.y, n.x)],
      [L(`Fälle t = k + 1 bis n (${a.n} Fälle). Unbeschränktes Modell: Wert aus den Verzögerungen 1 bis k beider Reihen; beschränktes Modell: nur aus den eigenen. F-Test der beiden. „A → B“ heißt: Helfen frühere Werte von A, B vorherzusagen?`,
        `Cases t = k + 1 to n (${a.n} cases). Unrestricted model: value from lags 1 to k of both series; restricted model: from its own only. F test of the two. "A → B" means: do earlier values of A help to predict B?`)]),
    tabelle('Granger-KPSS', L('Stationarität der Reihen (KPSS)', 'Stationarity of the series (KPSS)'), [L('Reihe', 'Series'), 'KPSS', L('Grenze', 'Limit')], [[zitat(n.x), zfx(a.kpssX, 3), zfx(KPSS_GRENZE, 3)], [zitat(n.y), zfx(a.kpssY, 3), zfx(KPSS_GRENZE, 3)]],
      [L('KPSS (Niveau) wird nur mit dem Wert 0,463 verglichen, es gibt dafür keinen p-Wert. Über der Grenze wirkt die Reihe nicht stationär.', 'KPSS (level) is only compared with the value 0.463; there is no p value for it. Above the limit the series does not look stationary.')])
  ];
}
/** Der Hauptsatz für Blatt und Bericht: beide Richtungen. */
export const grangerHauptsatz = (g: GrangerE, n: GrangerNamen): string => grangerSaetze(g, n).join(' ');

/* ---------------------------------------------------------------- R-Text zum Ansehen (wird nie ausgeführt) */
/** Der R-Text zum Nachrechnen: zwei `lm`, `anova`. Spaltennamen nur über rAnzeigeName, Zahlen über rAnzeigeZahl. */
export function grangerRCode(sx: string, sy: string, k: number): string {
  return [`# ${L('daten: die Tabelle in R', 'daten: your table in R')}`, `x <- daten$${rAnzeigeName(sx)}`, `y <- daten$${rAnzeigeName(sy)}`, `k <- ${rAnzeigeZahl(k)}`,
    'n <- length(y); idx <- (k + 1):n', 'Ly <- sapply(1:k, function(j) y[idx - j]); Lx <- sapply(1:k, function(j) x[idx - j])',
    `m1 <- lm(y[idx] ~ Ly + Lx); m0 <- lm(y[idx] ~ Ly)   # ${L('x → y; für y → x die Rollen tauschen', 'x → y; swap the roles for y → x')}`, 'anova(m0, m1)'].join('\n');
}
