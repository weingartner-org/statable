/**
 * „Hat die Maßnahme gewirkt?“ - unterbrochene Zeitreihe in der Karte Zeitreihen (Fachblatt docs/fachblaetter/MASSNAHME.md, Abschnitt 1): Wahl, Sperren, Aufruf an R (engine/statable-prognose.R: `sp_massnahme`,
 * `sp_massnahme_vorschlag`, nur stats), Lesen der Antwort, Sätze, Warnungen, Tabellen und der R-Text zum Ansehen.
 * Gespeichert wird die Wahl samt Antwort (`MassnahmeE`) am Ergebnis des Blatts, damit Bericht und Export ohne R stimmen.
 * SICHERHEIT: Der Aufruf enthält nur feste Wörter und Zahlen (rGanz, rBool, rWahl); die Reihe geht als Spalte `y` der Tabelle `d` hinein, nie als Text im Code.
 * Der Satz sagt „ging ... einher“, nie „bewirkte“: Das Modell misst eine Veränderung zu einem Zeitpunkt, keine Ursache.
 */
import type { TableItem } from '../engine/types';
import { L, Lp, d } from './sitzung.svelte';
import { komma, pWert } from './ergebnis';
import { ki, proz } from '../i18n/profil';
import { tabelle, fx, type Z } from './mwsaetze';
import { rGanz, rBool, rWahl, rFange, rAnzeigeName, rAnzeigeZahl } from '../engine/rsicher';
import type { RAufruf } from './kategreg';
import {
  prognoseSperre, prognoseWahlBereinigen, prognoseWahlGrund, prognoseCodeSatz, prognoseModellName, parameterName, PROG_BOX_JENKINS,
  type PrognoseReihe, type PrognoseWahl, type PrognoseSperre, type PrognoseCode, type PrognoseLjung
} from './prognose';

export type MassnahmeArt = 'stufe' | 'beides' | 'impuls';
export const MASSNAHME_ARTEN: readonly MassnahmeArt[] = ['stufe', 'beides', 'impuls'];

/** Was die Person wählt. `t0`: Platz in der Reihe (1 = erster), ab dem die Maßnahme gilt. */
export interface MassnahmeWahl {
  t0: number; art: MassnahmeArt; log: boolean;
  p: number; d: number; q: number; P: number; D: number; Q: number; konst: boolean;
  /** Horizont der Prognose */
  h: number;
}

/* ---------------------------------------------------------------- Sperren und Regeln */
export type MassnahmeSperre = PrognoseSperre | 'rand' | 'zu-wenig-davor' | 'zu-wenig-danach';
export type MassnahmeWahlCode = 'kein-zeitpunkt' | 'log-nicht-positiv' | 'saison-nicht-moeglich';
export type MassnahmeFehlerCode = 'rand' | 'log-nicht-positiv' | 'nicht-konvergiert' | 'luecken-nur-selbst' | 'kein-modell' | 'vorschlag-konstant' | 'vorschlag-zu-kurz' | 'r-fehler';
export type MassnahmeCode = MassnahmeSperre | MassnahmeWahlCode | MassnahmeFehlerCode;

/** Wie viele vorhandene Werte vor und ab der Maßnahme mindestens da sein müssen: bei m = 1 acht, bei einer Saison zwei Perioden weniger einen Wert.
 *  Das Fachblatt nennt zwei Perioden; der Sollwert Seatbelts (Februar 1983 bis Dezember 1984) hat ab dem Zeitpunkt nur 23 Plätze, darum liegt die Grenze eine Stelle tiefer. */
export const massnahmeMinSeite = (m: number): number => (m > 1 ? 2 * m - 1 : 8);

const vorhanden = (y: (number | null)[]): number => y.filter(v => v !== null).length;
/** Warum keine Rechnung möglich ist (oder null). Zuerst die Sperren der Prognose (zu viele Lücken, ungleiche Abstände, zu kurz, alle gleich), dann die des Zeitpunkts (am Rand ist die Stufe konstant; vor und nach je genug Werte). Ohne Zeitpunkt (null) gibt es hier keine Sperre. */
export function massnahmeSperre(r: PrognoseReihe, t0: number | null): MassnahmeSperre | null {
  const s = prognoseSperre(r);
  if (s) return s;
  if (t0 === null) return null;
  const T = r.y.length;
  if (!Number.isInteger(t0) || t0 < 2 || t0 > T) return 'rand';
  const mn = massnahmeMinSeite(r.periode);
  if (vorhanden(r.y.slice(0, t0 - 1)) < mn) return 'zu-wenig-davor';
  if (vorhanden(r.y.slice(t0 - 1)) < mn) return 'zu-wenig-danach';
  return null;
}

const alsPrognoseWahl = (w: Pick<MassnahmeWahl, 'log' | 'p' | 'd' | 'q' | 'P' | 'D' | 'Q' | 'konst' | 'h'>): PrognoseWahl =>
  ({ art: 'arima', h: w.h, log: w.log, p: w.p, d: w.d, q: w.q, P: w.P, D: w.D, Q: w.Q, konst: w.konst, glaettung: 'einfach' });
/** Die Wahl in die erlaubten Grenzen (wie bei der Prognose: p, q, P, Q 0 bis 5, d 0 bis 2, D 0 bis 1, Saison nur bei 2 ≤ m ≤ 24, Horizont, Log nur bei Werten über 0); die Konstante nur bei d + D = 0. */
export function massnahmeWahlBereinigen(w: MassnahmeWahl, r: PrognoseReihe): MassnahmeWahl {
  const o = prognoseWahlBereinigen(alsPrognoseWahl(w), r);
  return { t0: Math.round(w.t0), art: MASSNAHME_ARTEN.includes(w.art) ? w.art : 'stufe', log: o.log, p: o.p, d: o.d, q: o.q, P: o.P, D: o.D, Q: o.Q, konst: o.konst && o.d + o.D === 0, h: o.h };
}
/** Warum die Wahl nicht gerechnet wird (oder null): Log braucht Werte über 0, Saison nur bei Periode 2 bis 24. */
export function massnahmeWahlGrund(w: MassnahmeWahl, r: PrognoseReihe): MassnahmeWahlCode | null {
  const g = prognoseWahlGrund(alsPrognoseWahl(w), r);
  return g === 'log-nicht-positiv' || g === 'saison-nicht-moeglich' ? g : null;
}

/* ---------------------------------------------------------------- Aufruf an R */
/** Der Aufruf an `sp_massnahme`; die Reihe steht als Spalte `y` in der Tabelle `d`. `w` ist schon bereinigt. Fehler kommen als `list(fehler = …)` zurück. */
export function massnahmeAufruf(w: MassnahmeWahl, m: number): RAufruf {
  return { code: rFange(`sp_massnahme(d$y, ${rGanz(m)}, ${rGanz(w.t0)}, ${rWahl(w.art, MASSNAHME_ARTEN)}, ${rBool(w.log)}, ${rGanz(w.p)}, ${rGanz(w.d)}, ${rGanz(w.q)}, ${rGanz(w.P)}, ${rGanz(w.D)}, ${rGanz(w.Q)}, ${rBool(w.konst)}, ${rGanz(w.h)})`), args: {} };
}
/** Der Aufruf an `sp_massnahme_vorschlag`: Modellvorschlag nur aus den Werten vor der Maßnahme. */
export function vorschlagAufruf(m: number, t0: number, log: boolean): RAufruf {
  return { code: rFange(`sp_massnahme_vorschlag(d$y, ${rGanz(m)}, ${rGanz(t0)}, ${rBool(log)})`), args: {} };
}

/* ---------------------------------------------------------------- Antwort */
export interface MassnahmeAntwort {
  art: MassnahmeArt; t0: number; p: number; d: number; q: number; P: number; D: number; Q: number; periode: number; konst: boolean; log: boolean;
  namen: string[]; b: number[]; se: number[]; z: number[]; pw: number[]; kiu: number[]; kio: number[];
  sigma2: number | null; loglik: number | null; aic: number | null; aicc: number | null; nobs: number; tauglich: boolean;
  mittel: number[]; u95: number[]; o95: number[]; ljung: PrognoseLjung | null;
}
/** Das, was am Blatt gespeichert wird. */
export interface MassnahmeE { wahl: MassnahmeWahl; antwort: MassnahmeAntwort }
export interface VorschlagKandidat { p: number; q: number; P: number; Q: number; konst: boolean; aicc: number }
export interface VorschlagAntwort { n: number; d: number; D: number; kpss: number; staerke: number | null; saison: boolean; geprueft: number; liste: VorschlagKandidat[] }

const arr = <T>(x: unknown): T[] => (x == null ? [] : Array.isArray(x) ? (x as T[]) : [x as T]);
const num = (x: unknown): number | null => { const v = arr<unknown>(x)[0]; return typeof v === 'number' && Number.isFinite(v) ? v : null; };
const zahl0 = (x: unknown, ersatz = 0): number => num(x) ?? ersatz;
const nums = (x: unknown): number[] => arr<unknown>(x).map(v => (typeof v === 'number' ? v : NaN));
const text = (x: unknown): string => String(arr<unknown>(x)[0] ?? '');
const bool = (x: unknown): boolean => arr<unknown>(x)[0] === true;
const istObjekt = (o: unknown): o is Record<string, unknown> => !!o && typeof o === 'object' && !Array.isArray(o) && !(Object.keys(o as object).length === 1 && 'type' in (o as object));
const FEHLER: readonly string[] = ['rand', 'log-nicht-positiv', 'nicht-konvergiert', 'luecken-nur-selbst', 'kein-modell', 'r-fehler'];
const fehlerCode = (f: string): MassnahmeFehlerCode => (FEHLER.includes(f) ? f : f === 'alle-gleich' ? 'vorschlag-konstant' : f === 'zu-kurz' ? 'vorschlag-zu-kurz' : 'r-fehler') as MassnahmeFehlerCode;

/** Die Antwort von `sp_massnahme` lesen. Wirft nie. */
export function massnahmeLesen(roh: unknown): { ok: true; antwort: MassnahmeAntwort } | { ok: false; code: MassnahmeFehlerCode } {
  if (!istObjekt(roh)) return { ok: false, code: 'r-fehler' };
  if (roh.fehler !== undefined) return { ok: false, code: fehlerCode(text(roh.fehler)) };
  const art = text(roh.art) as MassnahmeArt, mittel = nums(roh.mittel), namen = arr<unknown>(roh.namen).map(String), b = nums(roh.b);
  if (!MASSNAHME_ARTEN.includes(art) || !mittel.length || mittel.some(v => !Number.isFinite(v)) || !b.length || b.length !== namen.length || b.some(v => !Number.isFinite(v))) return { ok: false, code: 'r-fehler' };
  const lj = istObjekt(roh.ljung) ? roh.ljung : null;
  const ljung = lj && num(lj.q) !== null && num(lj.p) !== null ? { q: zahl0(lj.q), h: zahl0(lj.h), p: zahl0(lj.p), fitdf: zahl0(lj.fitdf) } : null;
  return { ok: true, antwort: {
    art, t0: zahl0(roh.t0), p: zahl0(roh.p), d: zahl0(roh.d), q: zahl0(roh.q), P: zahl0(roh.P), D: zahl0(roh.D), Q: zahl0(roh.Q), periode: zahl0(roh.periode, 1), konst: bool(roh.konst), log: bool(roh.log),
    namen, b, se: nums(roh.se), z: nums(roh.z), pw: nums(roh.pw), kiu: nums(roh.kiu), kio: nums(roh.kio),
    sigma2: num(roh.sigma2), loglik: num(roh.loglik), aic: num(roh.aic), aicc: num(roh.aicc), nobs: zahl0(roh.nobs), tauglich: roh.tauglich === undefined || bool(roh.tauglich),
    mittel, u95: nums(roh.u95), o95: nums(roh.o95), ljung
  } };
}
/** Die Antwort von `sp_massnahme_vorschlag` lesen. Wirft nie. */
export function vorschlagLesen(roh: unknown): { ok: true; antwort: VorschlagAntwort } | { ok: false; code: MassnahmeFehlerCode } {
  if (!istObjekt(roh)) return { ok: false, code: 'r-fehler' };
  if (roh.fehler !== undefined) return { ok: false, code: fehlerCode(text(roh.fehler)) };
  const lp = nums(roh.lp), lq = nums(roh.lq), lP = nums(roh.lP), lQ = nums(roh.lQ), lk = arr<unknown>(roh.lk), la = nums(roh.la);
  if (!la.length || [...lp, ...lq, ...lP, ...lQ, ...la].some(v => !Number.isFinite(v)) || num(roh.d) === null || num(roh.D) === null) return { ok: false, code: 'r-fehler' };
  const st = num(roh.staerke);
  return { ok: true, antwort: {
    n: zahl0(roh.n), d: zahl0(roh.d), D: zahl0(roh.D), kpss: zahl0(roh.kpss), staerke: st !== null && st >= 0 ? st : null, saison: bool(roh.saison), geprueft: zahl0(roh.geprueft),
    liste: la.map((aicc, i) => ({ p: lp[i]!, q: lq[i]!, P: lP[i]!, Q: lQ[i]!, konst: lk[i] === true, aicc }))
  } };
}

/** Die Wahl, die der Vorschlag nahelegt, auf die Wahl der Person gelegt: nur die Ordnung. Die Konstante bleibt die eigene Entscheidung der Person (Fachblatt: nur wenn die Person sie wählt). */
export function vorschlagUebernehmen(w: MassnahmeWahl, v: VorschlagAntwort): MassnahmeWahl {
  const k = v.liste[0];
  if (!k) return w;
  return { ...w, p: k.p, d: v.d, q: k.q, P: k.P, D: v.D, Q: k.Q, konst: false };
}
export const vorschlagName = (v: VorschlagAntwort, m: number): string => { const k = v.liste[0]; return k ? prognoseModellName({ p: k.p, d: v.d, q: k.q, P: k.P, D: v.D, Q: k.Q, periode: m }) : ''; };

/* ---------------------------------------------------------------- Namen und Hilfen */
export const massnahmeModellText = (a: Pick<MassnahmeAntwort, 'p' | 'd' | 'q' | 'P' | 'D' | 'Q' | 'periode' | 'konst' | 'log'>): string =>
  `${prognoseModellName(a)}${a.konst ? L(' mit Mittelwert', ' with mean') : ''}${a.log ? L(', Log-Skala', ', log scale') : ''}`;
/** Name eines Parameters in der Oberfläche: Stufe und Impuls, sonst wie bei der Prognose. */
export function massnahmeParameterName(n: string): string {
  if (n === 'stufe') return L('Stufe (ab dem Zeitpunkt)', 'Step (from the point in time)');
  if (n === 'impuls') return L('Impuls (nur im Zeitpunkt)', 'Pulse (only at the point in time)');
  return parameterName(n);
}
const index = (a: MassnahmeAntwort, n: 'stufe' | 'impuls'): number => a.namen.indexOf(n);
/** Prozentuale Veränderung exp(b) − 1 in Prozent. */
export const prozentVeraenderung = (b: number): number => (Math.exp(b) - 1) * 100;
const st2 = (v: number): number => (Math.abs(v) >= 1 ? 2 : Math.abs(v) >= 0.1 ? 3 : 4);

export function massnahmeCodeSatz(c: MassnahmeCode): string {
  switch (c) {
    case 'kein-zeitpunkt': return d('Wähle den Zeitpunkt, ab dem die Maßnahme gilt. Es gibt keine Vorgabe.', 'Wählen Sie den Zeitpunkt, ab dem die Maßnahme gilt. Es gibt keine Vorgabe.', 'Choose the point in time from which the measure applies. There is no default.');
    case 'rand': return L('Der Zeitpunkt liegt am Rand der Reihe: Davor oder danach gibt es keine Werte, die Stufe wäre überall gleich.', 'The point in time lies at the edge of the series: there are no values before or after it, so the step would be the same everywhere.');
    case 'zu-wenig-davor': return L('Vor der Maßnahme gibt es zu wenige Werte. Nötig sind bei Saison knapp zwei Perioden, sonst mindestens 8 Werte.', 'There are too few values before the measure. With a season, just under two periods are needed, otherwise at least 8 values.');
    case 'zu-wenig-danach': return L('Ab der Maßnahme gibt es zu wenige Werte. Nötig sind bei Saison knapp zwei Perioden, sonst mindestens 8 Werte.', 'There are too few values from the measure on. With a season, just under two periods are needed, otherwise at least 8 values.');
    case 'saison-nicht-moeglich': return prognoseCodeSatz('saison-nicht-moeglich');
    case 'log-nicht-positiv': return prognoseCodeSatz('log-nicht-positiv');
    case 'luecken-nur-selbst': return L('In der Reihe fehlen Werte. Der Modellvorschlag braucht eine Reihe ohne Lücken (KPSS und STL vertragen keine Lücken); das Modell lässt sich dann nur selbst wählen.', 'Values are missing in the series. The model suggestion needs a series without gaps (KPSS and STL cannot handle gaps); the model can then only be chosen by hand.');
    case 'vorschlag-konstant': return L('Vor der Maßnahme sind alle Werte gleich; daraus lässt sich kein Modell vorschlagen.', 'Before the measure all values are equal; no model can be suggested from them.');
    case 'vorschlag-zu-kurz': return L('Vor der Maßnahme gibt es zu wenige Werte für einen Modellvorschlag.', 'There are too few values before the measure for a model suggestion.');
    case 'nicht-konvergiert': return L('Das gewählte Modell ließ sich nicht schätzen (die Rechnung konvergiert nicht). Eine einfachere Ordnung wählen.', 'The chosen model could not be estimated (the calculation does not converge). Choose a simpler order.');
    case 'kein-modell': return L('Für die Zeit vor der Maßnahme fand der Vorschlag kein Modell, das sich rechnen lässt.', 'For the time before the measure the suggestion found no model that can be estimated.');
    case 'r-fehler': return L('R meldete bei der Rechnung zur Maßnahme einen Fehler.', 'R reported an error during the calculation for the measure.');
    default: return prognoseCodeSatz(c as PrognoseCode);
  }
}

/* ---------------------------------------------------------------- Satz zum Effekt */
export interface MassnahmeSatzEin { name: string; zeit: string }
/** Der Hauptsatz: „Mit der Maßnahme ab … ging bei … ein Rückgang … einher“ (Stufe), je nach Wahl mit Impuls. Nie „bewirkte“. Auf der Log-Skala in Prozent. */
export function massnahmeHauptsatz(m: MassnahmeE, ein: MassnahmeSatzEin): string {
  const a = m.antwort, w = ein.name, z = ein.zeit;
  const teil = (n: 'stufe' | 'impuls') => {
    const i = index(a, n);
    if (i < 0) return null;
    const b = a.b[i]!, runter = b < 0;
    const gut = Number.isFinite(a.se[i]) && Number.isFinite(a.kiu[i]) && Number.isFinite(a.kio[i]) && Number.isFinite(a.pw[i]);
    const betrag = a.log ? proz(komma(Math.abs(prozentVeraenderung(b)), 1)) : komma(Math.abs(b), st2(b));
    const dazu = !gut ? '' : a.log ? ` (${ki(komma(prozentVeraenderung(a.kiu[i]!), 1), komma(prozentVeraenderung(a.kio[i]!), 1))}, p ${pWert(a.pw[i]!)})` : ` (${ki(komma(a.kiu[i]!, st2(b)), komma(a.kio[i]!, st2(b)))}, p ${pWert(a.pw[i]!)})`;
    return { runter, betrag, dazu };
  };
  const s = teil('stufe'), im = teil('impuls');
  const aus: string[] = [];
  if (s) {
    aus.push(s.runter
      ? L(`Mit der Maßnahme ab ${z} ging bei ${w} ein Rückgang des Niveaus um ${s.betrag} einher${s.dazu}.`, `The measure from ${z} on was accompanied by a fall in the level of ${w} by ${s.betrag}${s.dazu}.`)
      : L(`Mit der Maßnahme ab ${z} ging bei ${w} ein Anstieg des Niveaus um ${s.betrag} einher${s.dazu}.`, `The measure from ${z} on was accompanied by a rise in the level of ${w} by ${s.betrag}${s.dazu}.`));
  }
  if (im && s) {
    aus.push(im.runter
      ? L(`Zusätzlich ging im Zeitpunkt ${z} selbst ein einmaliger Rückgang um ${im.betrag} einher${im.dazu}.`, `In addition, a one-time fall by ${im.betrag} at ${z} itself was accompanied${im.dazu}.`)
      : L(`Zusätzlich ging im Zeitpunkt ${z} selbst ein einmaliger Anstieg um ${im.betrag} einher${im.dazu}.`, `In addition, a one-time rise by ${im.betrag} at ${z} itself was accompanied${im.dazu}.`));
  } else if (im) {
    aus.push(im.runter
      ? L(`Mit der Maßnahme im Zeitpunkt ${z} ging bei ${w} ein einmaliger Rückgang um ${im.betrag} einher${im.dazu}.`, `The measure at ${z} was accompanied by a one-time fall in ${w} by ${im.betrag}${im.dazu}.`)
      : L(`Mit der Maßnahme im Zeitpunkt ${z} ging bei ${w} ein einmaliger Anstieg um ${im.betrag} einher${im.dazu}.`, `The measure at ${z} was accompanied by a one-time rise in ${w} by ${im.betrag}${im.dazu}.`));
  }
  return aus.join(' ');
}
/** Ljung-Box-Satz zu den Residuen. */
export function massnahmeLjungSatz(l: PrognoseLjung): string {
  const df = l.h - l.fitdf, q = `Q(${l.h}) = ${komma(l.q, 2)}, df = ${komma(df, 0)}, p ${pWert(l.p)}`;
  return l.p < 0.05
    ? L(`Ljung-Box für die Residuen: ${q}. Die Residuen hängen noch zusammen.`, `Ljung-Box for the residuals: ${q}. The residuals are still related.`)
    : L(`Ljung-Box für die Residuen: ${q}. Es zeigt sich keine deutliche Abhängigkeit der Residuen.`, `Ljung-Box for the residuals: ${q}. No clear dependence of the residuals shows.`);
}
export function massnahmeApa(m: MassnahmeE): string {
  const a = m.antwort, t: string[] = [massnahmeModellText(a)];
  for (const n of ['stufe', 'impuls'] as const) {
    const i = index(a, n);
    if (i < 0) continue;
    const gut = Number.isFinite(a.kiu[i]) && Number.isFinite(a.kio[i]);
    const wort = n === 'stufe' ? L('Stufe', 'step') : L('Impuls', 'pulse');
    t.push(a.log
      ? `${wort}: ${proz(komma(prozentVeraenderung(a.b[i]!), 1))}${gut ? ` ${ki(komma(prozentVeraenderung(a.kiu[i]!), 1), komma(prozentVeraenderung(a.kio[i]!), 1))}` : ''}, p ${pWert(a.pw[i] ?? NaN)}`
      : `${wort} b = ${komma(a.b[i]!, st2(a.b[i]!))}${gut ? ` ${ki(komma(a.kiu[i]!, st2(a.b[i]!)), komma(a.kio[i]!, st2(a.b[i]!)))}` : ''}, p ${pWert(a.pw[i] ?? NaN)}`);
  }
  if (a.aicc !== null) t.push(`AICc = ${komma(a.aicc, 2)}`);
  if (a.ljung) t.push(`Ljung-Box Q(${a.ljung.h}) = ${komma(a.ljung.q, 2)}, df = ${komma(a.ljung.h - a.ljung.fitdf, 0)}, p ${pWert(a.ljung.p)}`);
  return t.join(', ');
}

/* ---------------------------------------------------------------- Warnungen */
export type MassnahmeLeitCode = 'ursache' | 'vergleich' | 'zeitpunkt' | 'schrittweise' | 'luecken' | 'kurz' | 'ljung' | 'nicht-tauglich' | 'se-fehlt' | 'log';
export interface MassnahmeLeitplanke { code: MassnahmeLeitCode; satz: string }
/** Die Warnungen des Fachblatts, immer sichtbar, sachlich, ohne zu beruhigen: die vier festen, dann die zur Rechnung (Lücken, Länge, Ljung-Box, Modell am Rand, fehlende Standardfehler, Log-Skala). */
export function massnahmeLeitplanken(m: MassnahmeE, ein: { T: number; luecken?: number }): MassnahmeLeitplanke[] {
  const a = m.antwort, aus: MassnahmeLeitplanke[] = [], add = (code: MassnahmeLeitCode, satz: string) => aus.push({ code, satz });
  add('ursache', L('Das Modell misst, ob die Reihe sich zum gewählten Zeitpunkt verändert. Ob die Maßnahme die Ursache ist, zeigt es nicht. Alles, was zur selben Zeit geschah, steckt mit im Effekt.', 'The model measures whether the series changes at the chosen point in time. It does not show whether the measure is the cause. Everything that happened at the same time is part of the effect.'));
  add('vergleich', L('Ohne Vergleichsgruppe bleibt das offen. Eine ähnliche Reihe ohne Maßnahme wäre ein stärkerer Beleg.', 'Without a comparison group this stays open. A similar series without the measure would be stronger evidence.'));
  add('zeitpunkt', L('Den Zeitpunkt vorher festlegen. Wer ihn in den Daten sucht und dann testet, bekommt zu kleine p-Werte.', 'Fix the point in time beforehand. Anyone who looks for it in the data and then tests it gets p values that are too small.'));
  add('schrittweise', L('Gilt die Maßnahme schrittweise, wirkt sie verzögert oder wurde sie erwartet, passt eine Stufe im genauen Zeitpunkt nicht.', 'If the measure applies step by step, takes effect with a delay or was expected, a step at the exact point in time does not fit.'));
  const k = ein.luecken ?? 0;
  if (k > 0) add('luecken', Lp(k, `Die Reihe hat ${k} Lücke von ${ein.T} Zeitpunkten. Das Modell rechnet über die Lücke hinweg und füllt nichts auf. Fehlen die Werte nicht zufällig, kann das Ergebnis verzerrt sein. Ljung-Box ist bei Lücken eine Näherung aus den vorhandenen Paaren.`, `Die Reihe hat ${k} Lücken von ${ein.T} Zeitpunkten. Das Modell rechnet über die Lücken hinweg und füllt nichts auf. Fehlen die Werte nicht zufällig, kann das Ergebnis verzerrt sein. Ljung-Box ist bei Lücken eine Näherung aus den vorhandenen Paaren.`,
    `The series has ${k} gap in ${ein.T} points in time. The model calculates across the gap and fills in nothing. If the values are not missing at random, the result can be biased. With gaps, Ljung-Box is an approximation from the available pairs.`, `The series has ${k} gaps in ${ein.T} points in time. The model calculates across the gaps and fills in nothing. If the values are not missing at random, the result can be biased. With gaps, Ljung-Box is an approximation from the available pairs.`));
  if (ein.T < PROG_BOX_JENKINS) add('kurz', L(`Für ARIMA sind 50 Werte eine übliche Untergrenze (Box & Jenkins); die Reihe hat ${ein.T}. Bei dieser Länge ist die Modellwahl unsicher.`, `For ARIMA, 50 values are a common lower limit (Box & Jenkins); the series has ${ein.T}. At this length the choice of model is uncertain.`));
  if (a.ljung && a.ljung.p < 0.05) add('ljung', L(`Die Residuen hängen noch zusammen (Ljung-Box, p ${pWert(a.ljung.p)}): Das Modell erfasst nicht das ganze Muster, die Standardfehler sind zu klein, und Intervall und p-Wert des Effekts sind zu optimistisch.`, `The residuals are still related (Ljung-Box, p ${pWert(a.ljung.p)}): the model does not capture the whole pattern, the standard errors are too small, and the interval and p value of the effect are too optimistic.`));
  if (!a.tauglich) add('nicht-tauglich', L('Das Modell liegt nahe an der Grenze zur Instabilität (ein Koeffizient am Rand, etwa MA 1 bei −1). Standardfehler und AICc sind nicht verlässlich; ein anderes Modell wählen.', 'The model is close to the limit of instability (a coefficient at the edge, such as MA 1 at −1). Standard errors and AICc are not reliable; choose another model.'));
  if (a.se.some(v => !Number.isFinite(v))) add('se-fehlt', L('Für einen Teil der Parameter ließ sich kein Standardfehler berechnen; Intervall und p-Wert fehlen dort. Ein einfacheres Modell wählen.', 'No standard error could be calculated for some of the parameters; the interval and p value are missing there. Choose a simpler model.'));
  if (a.log) add('log', L('Die Rechnung läuft auf der Log-Skala: Der Effekt gilt als Prozentwert vom Niveau, die Prognose ist ein Median, kein Mittelwert.', 'The calculation runs on the log scale: the effect is a percentage of the level, and the forecast is a median, not a mean.'));
  return aus;
}
/** Der Satz über dem Modellvorschlag: woraus er entstand, und dass er übernommen werden muss. */
export function vorschlagSatz(v: VorschlagAntwort, m: number): string {
  const k = v.liste[0], name = vorschlagName(v, m);
  const kn = k?.konst ? L(' Der Vorschlag enthält eine Konstante; sie wird nicht mitübernommen, die Konstante bleibt eine eigene Wahl.', ' The suggestion contains a constant; it is not adopted with it, the constant remains a choice of its own.') : '';
  return L(`Vorschlag aus den ${v.n} Werten vor der Maßnahme (nach AICc, ${v.geprueft} Modelle geprüft): ${name}. Die Werte ab der Maßnahme gingen nicht in die Wahl ein. Gerechnet wird erst, wenn der Vorschlag übernommen ist.${kn}`,
    `Suggestion from the ${v.n} values before the measure (by AICc, ${v.geprueft} models checked): ${name}. The values from the measure on did not enter the choice. Nothing is calculated until the suggestion has been adopted.${kn}`);
}
export const massnahmeHilfeSatz = (): string => L('Das Modell prüft, ob sich die Reihe zum gewählten Zeitpunkt in der Höhe verändert (Stufe) oder dort einmalig abweicht (Impuls). Es wird erst gerechnet, wenn auf den Knopf geklickt wird.', 'The model checks whether the series changes its level at the chosen point in time (step) or deviates once at that point (pulse). Nothing is calculated until the button is clicked.');

/* ---------------------------------------------------------------- Tabellen */
/** Die Beschriftungen (label) der Tabellen, damit das Blatt sie im Abschnitt „Hat die Maßnahme gewirkt?“ zeigt. */
export const MASSNAHME_LABELS: readonly string[] = ['Maßnahme-Effekt', 'Maßnahme-Güte', 'Maßnahme-Prognose'];
export interface MassnahmeTabEin { name: string; zeit: string; zeiten: string[]; stellen: number }
const zfx = (v: number | null | undefined, d: number): Z => (v === null || v === undefined || !Number.isFinite(v) ? '-' : fx(v, d));
export function massnahmeTabellen(m: MassnahmeE, ein: MassnahmeTabEin): TableItem[] {
  const a = m.antwort, aus: TableItem[] = [];
  const zeilen: Z[][] = a.namen.map((nm, i) => [massnahmeParameterName(nm), zfx(a.b[i], 4), zfx(a.se[i], 4), zfx(a.z[i], 2),
    Number.isFinite(a.pw[i]) ? { t: pWert(a.pw[i]!).replace(/^= /, ''), n: a.pw[i]! } : '-', zfx(a.kiu[i], 4), zfx(a.kio[i], 4)]);
  if (a.log) for (const n of ['stufe', 'impuls'] as const) {
    const i = index(a, n);
    if (i >= 0) zeilen.push([n === 'stufe' ? L('Stufe: Veränderung in %', 'Step: change in %') : L('Impuls: Veränderung in %', 'Pulse: change in %'), zfx(prozentVeraenderung(a.b[i]!), 2), '-', '-', '-',
      Number.isFinite(a.kiu[i]) ? zfx(prozentVeraenderung(a.kiu[i]!), 2) : '-', Number.isFinite(a.kio[i]) ? zfx(prozentVeraenderung(a.kio[i]!), 2) : '-']);
  }
  aus.push(tabelle('Maßnahme-Effekt', L(`Maßnahme ab ${ein.zeit}: ${massnahmeModellText(a)}`, `Measure from ${ein.zeit}: ${massnahmeModellText(a)}`),
    ['', L('Schätzung', 'Estimate'), L('Standardfehler', 'Standard error'), 'z', 'p', L('95-%-KI unten', '95% CI lower'), L('95-%-KI oben', '95% CI upper')], zeilen,
    [L(`Stufe: 0 vor ${ein.zeit}, 1 ab ${ein.zeit}. Impuls: 1 nur in ${ein.zeit}. z = Schätzung / Standardfehler; p aus der Normalverteilung; Intervall nach Wald. Die Standardfehler kommen aus der R-Funktion arima und weichen von SPSS um 5 bis 10 % ab.`,
      `Step: 0 before ${ein.zeit}, 1 from ${ein.zeit} on. Pulse: 1 only at ${ein.zeit}. z = estimate / standard error; p from the normal distribution; Wald interval. The standard errors come from the R function arima and differ from SPSS by 5 to 10%.`),
      L('Die MA-Koeffizienten stehen in der Schreibweise von R (Box und Jenkins); SPSS zeigt sie mit umgekehrtem Vorzeichen.', 'The MA coefficients use the notation of R (Box and Jenkins); SPSS shows them with the opposite sign.')]));
  const g: Z[][] = [];
  if (a.aicc !== null) g.push(['AICc', zfx(a.aicc, 2)]);
  if (a.aic !== null) g.push(['AIC', zfx(a.aic, 2)]);
  if (a.sigma2 !== null) g.push(['σ²', zfx(a.sigma2, 4)]);
  g.push([L('Beobachtungen im Modell', 'Observations in the model'), { t: komma(a.nobs, 0), n: a.nobs }]);
  if (a.ljung) g.push([`Ljung-Box Q(${a.ljung.h})`, zfx(a.ljung.q, 2)], [L('Freiheitsgrade', 'Degrees of freedom'), { t: komma(a.ljung.h - a.ljung.fitdf, 0), n: a.ljung.h - a.ljung.fitdf }], ['p', { t: pWert(a.ljung.p).replace(/^= /, ''), n: a.ljung.p }]);
  aus.push(tabelle('Maßnahme-Güte', L('Güte der Anpassung', 'Fit'), [L('Kennzahl', 'Measure'), L('Wert', 'Value')], g,
    [L('Freiheitsgrade der Ljung-Box-Prüfung = Verzögerungen − geschätzte ARMA-Parameter; Stufe und Impuls zählen nicht mit.', 'Degrees of freedom of the Ljung-Box test = lags − estimated ARMA parameters; step and pulse do not count.')]));
  const n = a.mittel.length;
  aus.push(tabelle('Maßnahme-Prognose', L(`Prognose ${ein.name} (die Stufe bleibt bestehen)`, `Forecast ${ein.name} (the step remains)`), [L('Zeitpunkt', 'Point in time'), L('Prognose', 'Forecast'), L('95 % unten', '95% lower'), L('95 % oben', '95% upper')],
    Array.from({ length: n }, (_, i) => [ein.zeiten[i] ?? String(i + 1), zfx(a.mittel[i], ein.stellen), zfx(a.u95[i], ein.stellen), zfx(a.o95[i], ein.stellen)]),
    [a.log ? L('Die Grenzen sind Prognoseintervalle der Normalverteilung auf der Log-Skala, zurückgerechnet; die Prognose ist ein Median.', 'The limits are prediction intervals of the normal distribution on the log scale, back-transformed; the forecast is a median.')
      : L('Die Grenzen sind Prognoseintervalle der Normalverteilung (stats::predict). Stufe bleibt 1, Impuls 0.', 'The limits are prediction intervals of the normal distribution (stats::predict). Step stays 1, pulse 0.')]));
  return aus;
}

/* ---------------------------------------------------------------- R-Text zum Ansehen (wird nie ausgeführt) */
/** Der R-Aufruf zum Nachrechnen: `arima` mit `xreg`, `fit$call$xreg` und `predict` mit `newxreg`. Spaltenname nur über rAnzeigeName, Zahlen über rAnzeigeZahl. */
export function massnahmeRCode(m: MassnahmeE, spalte: string): string {
  const a = m.antwort, h = a.mittel.length, zeitPkt = a.t0;
  const saison = a.P + a.D + a.Q > 0, mit = a.art !== 'impuls', imp = a.art !== 'stufe';
  const reihe = a.log ? 'log(' + 'daten$' + rAnzeigeName(spalte) + ')' : 'daten$' + rAnzeigeName(spalte);
  const spaltenX = [mit ? `stufe = as.numeric(seq_len(n) >= ${rAnzeigeZahl(zeitPkt)})` : '', imp ? `impuls = as.numeric(seq_len(n) == ${rAnzeigeZahl(zeitPkt)})` : ''].filter(Boolean).join(', ');
  const spaltenN = [mit ? `stufe = rep(1, ${rAnzeigeZahl(h)})` : '', imp ? `impuls = rep(0, ${rAnzeigeZahl(h)})` : ''].filter(Boolean).join(', ');
  const ordnung = `order = c(${rAnzeigeZahl(a.p)}, ${rAnzeigeZahl(a.d)}, ${rAnzeigeZahl(a.q)})${saison ? `, seasonal = list(order = c(${rAnzeigeZahl(a.P)}, ${rAnzeigeZahl(a.D)}, ${rAnzeigeZahl(a.Q)}), period = ${rAnzeigeZahl(a.periode)})` : ''}`;
  const mittel = a.d + a.D === 0 ? `, include.mean = ${a.konst ? 'TRUE' : 'FALSE'}` : '';
  return [`# ${L('daten: die Tabelle in R', 'daten: your table in R')}`,
    `z <- ts(${reihe}, frequency = ${rAnzeigeZahl(a.periode)})`, 'n <- length(z)', `X <- cbind(${spaltenX})`,
    `fit <- arima(z, ${ordnung}, xreg = X${mittel})`, `fit$call$xreg <- X   # ${L('predict wertet den Aufruf neu aus: der Wert muss drinstehen', 'predict evaluates the call again: the value must be in it')}`,
    `Xn <- cbind(${spaltenN})   # ${L('dieselben Spaltennamen wie in X', 'the same column names as in X')}`, 'p <- predict(fit, n.ahead = nrow(Xn), newxreg = Xn)', a.log ? 'exp(p$pred)   # ' + L('Median', 'median') : 'p$pred'].join('\n');
}
