/**
 * Das Ergebnis der Zeitreihen-Karte am Blatt (Später, Welle S-E, L7): was gespeichert wird (die Reihe und die Wahlen der Person), die Auswertung daraus (alles in JavaScript, bei jedem Aufruf neu),
 * die Sätze und Tabellen für Blatt, Bericht und Export. Rechnen: zeitreihe.ts; Sätze zu Sperren und Hinweisen: zeitreihesaetze.ts.
 * Gespeichert wird nur die Reihe (Position und Wert) und die Wahl; Trend, Autokorrelation und Zerlegung rechnen sich daraus neu - so stimmen Blatt, Bericht und Export immer überein.
 */
import { fehlendMenge } from './fehlend';
import type { TableItem } from '../engine/types';
import { s, L, Lp } from './sitzung.svelte';
import { ki, zitat } from '../i18n/profil';
import { komma, ohneNull, pWert, type Saetze } from './ergebnis';
import { tabelle, fx, type Z } from './mwsaetze';
import {
  reiheAufbauen, gleitenderMittelwert, zeitTrend, zeitAcf, zeitPacf, acfGrenze, acfLagMax, ljungBoxH, ljungBox, durbinWatson, trendKiEff, zerlegung, zerlegungsArt, zeitreiheKann,
  type Raster, type ReiheErg, type ReiheCode, type ZeitTrend, type Kann, type Zerlegung
} from './zeitreihe';
import { zeitCcf, ccfKann, ccfAutokorrHinweis, ccfSaetze, ccfCodeSatz, type CcfErgebnis, type CcfCode } from './zeitreiheccf';
import { prognoseHauptsatz, prognoseApa, prognoseLeitplanken, prognoseLjungSatz, prognoseStellen, logMoeglich, pruefzeitraumLuecke, type PrognoseE } from './prognose';
import { differenzenSaetze, differenzenTabellen, periodogrammHauptsatz, periodogrammWarnungen, periodogrammTabellen, type DifferenzenE, type PeriodogrammE } from './zeitreihenabrunden';
import { prognoseTabellen } from './prognoseblatt';
import { massnahmeHauptsatz, massnahmeLjungSatz, massnahmeLeitplanken, massnahmeApa, massnahmeTabellen, type MassnahmeE } from './massnahme';
import { ausreisserHauptsatz, ausreisserLeitplanken, ausreisserApa, ausreisserTabellen, type AusreisserE } from './ausreisserzeit';
import { grangerSaetze, grangerWarnungen, grangerTabellen, type GrangerE } from './granger';
import { neuHauptsatz, neuLjungSatz, neuWarnungen, neuApa, neuTabellen, type NeuE } from './modellneu';
import { mehrereHauptsatz, mehrereWarnungen, mehrereTabellen, type MehrereE } from './mehrere';
import {
  zeitreiheCodeSatz, zeitreiheAutokorrSatz, zeitreiheZerlegungSatz, zeitreiheGerechnet, zeitreiheFussSatz, zeitreiheScheintrendSatz, rasterWort, positionName, type ZeitCode
} from './zeitreihesaetze';

const T = L;
/** Zahl bis 1 für Tabellenzellen: ohne führende Null, Dezimalzeichen nach Sprachprofil (wie r, p und R² im Satz). */
const ono = (v: number, d: number): Z => (Number.isFinite(v) ? { t: ohneNull(v, d), n: v } : '-');

/** Was am Blatt gespeichert wird. */
export interface ZeitreiheE {
  /** Spalte mit dem Wert und mit dem Zeitpunkt ('' = Reihenfolge der Zeilen) */
  wert: string; datum: string;
  /** Zeilen der Tabelle */
  zeilen: number;
  /** das gerechnete Raster und das, was Statable erkannt hat; `rasterGewaehlt`: die Person hat es geändert */
  raster: Raster; rasterAuto: Raster; rasterGewaehlt: boolean; periode: number;
  /** die Reihe: Position (t) und Wert (y, null = Lücke) */
  t: number[]; y: (number | null)[];
  n: number; luecken: number; anteilLuecken: number; ausgeschlossen: number; rueckwaerts: boolean; erster: string; letzter: string;
  /** Wahlen im Ergebnis: Fenster des gleitenden Mittelwerts (0 = aus), Art der Zerlegung (null = Vorschlag), Korrelogramm der Reihe oder der Residuen */
  fenster: number; art: 'additiv' | 'multiplikativ' | null; acfQuelle: 'residuen' | 'reihe';
  /** Später S-F2 (C.2): die zweite Reihe für die Kreuzkorrelation (Spalte und Werte auf dem Raster der ersten); fehlt sonst und in alten Projektdateien */
  zweite?: string; y2?: (number | null)[];
  /** Prognose (Fachblatt PROGNOSE-ARIMA): die Wahl und die Antwort von R; fehlt ohne Klick und in alten Projektdateien */
  prognose?: PrognoseE;
  /** Differenzen prüfen (Fachblatt ZEITREIHEN-ABRUNDEN, Abschnitt 2) und Periodogramm (Abschnitt 3): die Antwort von R; fehlt ohne Klick und in alten Projektdateien */
  differenzen?: DifferenzenE; periodogramm?: PeriodogrammE;
  /** „Hat die Maßnahme gewirkt?“ (Fachblatt MASSNAHME, Abschnitt 1) und Granger-Test (Abschnitt 2): Wahl und Antwort von R; fehlt ohne Klick und in alten Projektdateien */
  massnahme?: MassnahmeE; granger?: GrangerE;
  /** Modell auf neue Daten (Fachblatt GLAETTUNG-SERIEN, Abschnitt 5) und mehrere Reihen auf einmal (Abschnitt 4): die Antworten von R samt Wahl; fehlt ohne Klick und in alten Projektdateien */
  neu?: NeuE; mehrere?: MehrereE;
  /** „Auffällige Werte suchen“ (Sollwerte scripts/ausreisser-zeitreihe-erwartet.R): Wahl und Antwort von R; fehlt ohne Klick und in alten Projektdateien */
  ausreisser?: AusreisserE;
}
export interface ZeitOpt { raster?: Raster | null; periode?: number | null }
export const fensterStandard = (periode: number): number => (periode > 1 && periode <= 24 ? periode : 3);

/* ---------------------------------------------------------------- aus den Daten der Sitzung */
/** Ein Datum aus der Tabelle als ISO-Text: In den Daten steht es als TT.MM.JJJJ (so schreibt die Engine es, siehe sitzung.svelte.ts) oder, aus Dateien, als JJJJ-MM-TT; eine Uhrzeit bleibt hinten stehen. Alles andere ist kein Datum (null). */
export function isoVon(t: string): string | null {
  const s = t.trim();
  const p2 = (x: string) => x.padStart(2, '0');
  // Monatsangabe „1949-01“ oder „1949/01“ (Erster des Monats); nur Monate 01 bis 12, sonst kein Datum
  const mo = /^(\d{4})[-/](0[1-9]|1[0-2])$/.exec(s);
  if (mo) return `${mo[1]}-${mo[2]}-01`;
  let m = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(\s.*|T.*)?$/.exec(s);
  if (m) return `${m[1]}-${p2(m[2]!)}-${p2(m[3]!)}${m[4] ?? ''}`;
  m = /^(\d{1,2})\.(\d{1,2})\.(\d{4})(\s.*)?$/.exec(s);
  return m ? `${m[3]}-${p2(m[2]!)}-${p2(m[1]!)}${m[4] ?? ''}` : null;
}
/** Die Spalten der Sitzung als Datum (Text) und Zahl; Lücken und „keine Angabe“-Werte sind null. `datum` '' = Reihenfolge der Zeilen. */
export function zeitreiheEingabe(wert: string, datum: string): { datum: (string | null)[] | null; wert: (number | null)[] } {
  const iw = s.spalten.findIndex(x => x.name === wert), id = datum ? s.spalten.findIndex(x => x.name === datum) : -1, fw = fehlendMenge(s.spalten[iw]);
  const w = s.zeilen.map(z => { const v = z[iw]; return typeof v === 'number' && Number.isFinite(v) && !fw.includes(v) ? v : null; });
  const dt = id >= 0 ? s.zeilen.map(z => { const v = z[id]; return typeof v === 'string' && v.trim() ? isoVon(v) : null; }) : null;
  return { datum: dt, wert: w };
}
/** Baut die Reihe aus den Daten der Sitzung; mit `opt.raster` ein anderes Raster als erkannt (passt es nicht, ist die Antwort `raster-passt-nicht`). */
export function zeitreiheAufbauen(wert: string, datum: string, opt: ZeitOpt = {}): { ok: true; reihe: Extract<ReiheErg, { ok: true }>; rasterAuto: Raster } | { ok: false; code: ReiheCode; ausgeschlossen?: number } {
  const ein = zeitreiheEingabe(wert, datum), periode = opt.periode ?? undefined;
  const auto = reiheAufbauen(ein.datum, ein.wert, { periode });
  if (!auto.ok) return auto;
  if (!opt.raster || opt.raster === auto.raster) return { ok: true, reihe: auto, rasterAuto: auto.raster };
  const r = reiheAufbauen(ein.datum, ein.wert, { raster: opt.raster, periode });
  return r.ok ? { ok: true, reihe: r, rasterAuto: auto.raster } : r;
}
/** Das Ergebnis zum Speichern. */
export function zeitreiheErgebnis(wert: string, datum: string, opt: ZeitOpt & Partial<Pick<ZeitreiheE, 'fenster' | 'art' | 'acfQuelle'>> & { zweite?: string } = {}): { ok: true; e: ZeitreiheE } | { ok: false; code: ReiheCode; ausgeschlossen?: number } {
  const a = zeitreiheAufbauen(wert, datum, opt);
  if (!a.ok) return a;
  const r = a.reihe;
  // zweite Reihe: auf dasselbe Raster gebracht wie die erste (gleiche Zeilen, gleiche Zeitpunkte); gelingt das nicht, bleibt sie leer und die Prüfung meldet es
  let zw: Pick<ZeitreiheE, 'zweite' | 'y2'> = {};
  if (opt.zweite) {
    const b = zeitreiheAufbauen(opt.zweite, datum, { raster: r.raster, periode: r.raster === 'zeilen' ? r.periode : undefined });
    zw = { zweite: opt.zweite, y2: b.ok && b.reihe.y.length === r.y.length ? b.reihe.y : [] };
  }
  return { ok: true, e: {
    ...zw,
    wert, datum, zeilen: s.zeilen.length, raster: r.raster, rasterAuto: a.rasterAuto, rasterGewaehlt: !!opt.raster && opt.raster !== a.rasterAuto, periode: r.periode, t: r.t, y: r.y,
    n: r.n, luecken: r.luecken, anteilLuecken: r.anteilLuecken, ausgeschlossen: r.ausgeschlossen, rueckwaerts: r.rueckwaerts, erster: r.erster, letzter: r.letzter,
    fenster: opt.fenster ?? fensterStandard(r.periode), art: opt.art ?? null, acfQuelle: opt.acfQuelle ?? 'residuen'
  } };
}

/* ---------------------------------------------------------------- Auswertung */
export interface ZerlegungAnzeige extends Zerlegung { art: 'additiv' | 'multiplikativ'; vorschlag: { r: number; art: 'additiv' | 'multiplikativ' }; restAnteil: number | null }
/** Die Kreuzkorrelation (Später S-F2): ob sie rechnet (sonst der Grund), das Ergebnis, die Autokorrelationen r₁ der beiden Reihen und ob der Hinweis „Eigenabhängigkeit“ gilt. */
export interface KreuzAuswertung { kann: { ok: true } | { ok: false; code: CcfCode }; ccf: CcfErgebnis | null; r1: [number, number]; hinweis: boolean }
export interface ZeitreiheAuswertung {
  kreuz: KreuzAuswertung | null;
  kann: Kann; raster: Raster; periode: number; T: number; n: number; minWert: number; maxWert: number; alleGleich: boolean;
  gleitend: (number | null)[] | null;
  trend: ZeitTrend | null; linie: (number | null)[] | null; jeJahr: number | null;
  acfReihe: number[] | null; acfResid: number[] | null; lagMax: number;
  /** partielle Autokorrelation aus der ACF (gleiche Zahl Verzögerungen); null, wenn die vorhandenen Paare nicht zusammenpassen (Betrag ab 1 oder nicht endlich) */
  pacfReihe: number[] | null; pacfResid: number[] | null; grenze: number | null;
  r1: number | null; ljung: { q: number; h: number; p: number } | null; dw: number | null;
  /** das Intervall mit effektiver Fallzahl; `effGezeigt`: Autokorrelation liegt vor, das Intervall gehört neben das gewöhnliche */
  eff: { nEff: number; seB: number; kiB: [number, number] } | null; effGezeigt: boolean;
  zer: ZerlegungAnzeige | null;
}
const JE_JAHR: Partial<Record<Raster, number>> = { monatlich: 12, vierteljaehrlich: 4 };

/** Alles, was sich aus der gespeicherten Reihe rechnen lässt. Wirft nie. */
export function zeitreiheAuswertung(e: ZeitreiheE): ZeitreiheAuswertung {
  const werte = e.y.filter((v): v is number => v !== null), n = werte.length, Tn = e.y.length;
  const minWert = n ? Math.min(...werte) : 0, maxWert = n ? Math.max(...werte) : 0, alleGleich = n > 0 && minWert === maxWert;
  const kann = zeitreiheKann({ raster: e.raster, periode: e.periode, n, T: Tn, luecken: e.luecken, anteilLuecken: e.anteilLuecken, minWert, alleGleich });
  const aus: ZeitreiheAuswertung = { kann, raster: e.raster, periode: e.periode, T: Tn, n, minWert, maxWert, alleGleich, gleitend: null, trend: null, linie: null, jeJahr: null,
    acfReihe: null, acfResid: null, pacfReihe: null, pacfResid: null, lagMax: 0, grenze: null, r1: null, ljung: null, dw: null, eff: null, effGezeigt: false, zer: null, kreuz: null };
  if (e.zweite && e.y2) {
    const kann = ccfKann(e.y, e.y2);
    const r1 = (y: (number | null)[]): number => zeitAcf(y, 1)[0] ?? 0;
    const ccf = kann.ok ? zeitCcf(e.y, e.y2, acfLagMax(Tn, e.periode)) : null;
    const r1s: [number, number] = kann.ok || kann.code !== 'laenge' ? [r1(e.y), r1(e.y2.length === e.y.length ? e.y2 : e.y)] : [0, 0];
    aus.kreuz = { kann, ccf, r1: r1s, hinweis: kann.ok && ccfAutokorrHinweis(r1s[0], r1s[1]) };
  }
  if (e.fenster >= 1 && n >= 2) aus.gleitend = gleitenderMittelwert(e.y, e.fenster);
  if (kann.trend) {
    const tr = zeitTrend(e.y, e.t);
    aus.trend = tr; aus.linie = e.t.map((t, i) => (e.y[i] === null && e.raster === 'ungleich' ? null : tr.a + tr.b * t));
    aus.jeJahr = JE_JAHR[e.raster] !== undefined ? JE_JAHR[e.raster]! * tr.b : null;
    if (kann.acf) {
      const h = ljungBoxH(Tn, e.periode), lag = Math.max(acfLagMax(Tn, e.periode), kann.ljungBox ? Math.min(h, Tn - 1) : 0);
      aus.lagMax = acfLagMax(Tn, e.periode); aus.grenze = acfGrenze(n);
      aus.acfResid = zeitAcf(tr.resid, lag); aus.acfReihe = zeitAcf(e.y, lag);
      aus.pacfReihe = zeitPacf(aus.acfReihe.slice(0, aus.lagMax)); aus.pacfResid = zeitPacf(aus.acfResid.slice(0, aus.lagMax));
      aus.r1 = aus.acfResid[0] ?? null;
      if (kann.ljungBox && h <= aus.acfResid.length) aus.ljung = ljungBox(aus.acfResid.slice(0, h), Tn);
      if (kann.durbinWatson) aus.dw = durbinWatson(tr.resid.filter((v): v is number => v !== null));
      if (aus.r1 !== null && aus.r1 > 0) {
        aus.eff = trendKiEff(tr, aus.r1, n);
        aus.effGezeigt = aus.ljung ? aus.ljung.p < 0.05 : aus.r1 > 0.1;
      }
    }
  }
  if (kann.zerlegung && n === Tn) {
    const y = e.y as number[], vor = zerlegungsArt(y, e.periode);
    const art: 'additiv' | 'multiplikativ' = e.art === 'multiplikativ' && kann.multiplikativ ? 'multiplikativ' : e.art === 'additiv' ? 'additiv' : kann.multiplikativ ? vor.art : 'additiv';
    try {
      const z = zerlegung(y, e.periode, art);
      let ssRest = 0, ssGes = 0;
      const m = y.reduce((a, b) => a + b, 0) / y.length;
      z.rest.forEach((r, i) => { if (r !== null) { ssRest += art === 'additiv' ? r * r : 0; ssGes += (y[i]! - m) ** 2; } });
      aus.zer = { ...z, art, vorschlag: vor, restAnteil: art === 'additiv' && ssGes > 0 ? ssRest / ssGes : null };
    } catch { aus.zer = null; }
  }
  return aus;
}

/* ---------------------------------------------------------------- Wörter */
export const einheitWort = (r: Raster): string =>
  r === 'monatlich' ? T('je Monat', 'per month') : r === 'vierteljaehrlich' ? T('je Quartal', 'per quarter') : r === 'jaehrlich' ? T('je Jahr', 'per year') : r === 'woechentlich' ? T('je Woche', 'per week')
    : r === 'zeilen' ? T('je Zeile', 'per row') : T('je Tag', 'per day');
const MONAT_ZEILE = (i: number) => positionName(i, 12, '2000-01-01');
/** „Januar 2015“, „Quartal 1 2015“, „2015“ oder das Datum selbst. */
export function zeitLabel(iso: string, raster: Raster): string {
  const r = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!r) return iso;
  const j = Number(r[1]), m = Number(r[2]);
  if (raster === 'monatlich') return `${MONAT_ZEILE(m - 1)} ${j}`;
  if (raster === 'vierteljaehrlich') { const q = Math.floor((m - 1) / 3) + 1; return T(`Quartal ${q} ${j}`, `quarter ${q} ${j}`); }
  if (raster === 'jaehrlich') return String(j);
  return `${r[1]}-${r[2]}-${r[3]}`;
}
/** Beim Neurechnen des Blatts (gleiche Spalten) bleiben Prognose, Differenzenprüfung und Periodogramm, wenn die Reihe dieselbe ist; sonst fallen sie weg (sie gehören zur alten Reihe). */
export function prognoseBehalten(alt: ZeitreiheE | undefined, neu: ZeitreiheE): ZeitreiheE {
  if (!alt || (!alt.prognose && !alt.differenzen && !alt.periodogramm && !alt.massnahme && !alt.granger && !alt.neu && !alt.mehrere && !alt.ausreisser) || alt.raster !== neu.raster || alt.periode !== neu.periode || alt.y.length !== neu.y.length || alt.y.some((v, i) => v !== neu.y[i])) return neu;
  return { ...neu, ...(alt.prognose ? { prognose: alt.prognose } : {}), ...(alt.differenzen ? { differenzen: alt.differenzen } : {}), ...(alt.periodogramm ? { periodogramm: alt.periodogramm } : {}), ...(alt.massnahme ? { massnahme: alt.massnahme } : {}), ...(alt.neu ? { neu: alt.neu } : {}), ...(alt.mehrere ? { mehrere: alt.mehrere } : {}), ...(alt.ausreisser ? { ausreisser: alt.ausreisser } : {}),
    ...(alt.granger && alt.zweite === neu.zweite && alt.y2 && neu.y2 && alt.y2.length === neu.y2.length && alt.y2.every((v, i) => v === neu.y2![i]) ? { granger: alt.granger } : {}) };
}
/** Die Beschriftung des Platzes i (0 = erster) der Reihe: Datum im Raster der Reihe, ohne Datum die Nummer. */
export function platzLabel(e: Pick<ZeitreiheE, 'raster' | 'erster' | 't'>, i: number): string {
  const t = e.t[i] ?? i + 1;
  return e.raster === 'zeilen' ? String(t) : zeitLabel(positionIso(e, t), e.raster === 'ungleich' || e.raster === 'woechentlich' || e.raster === 'taeglich' ? 'taeglich' : e.raster);
}
/** Die Reihe, wie die Prognose sie braucht. */
export const prognoseReihe = (e: Pick<ZeitreiheE, 'raster' | 'periode' | 'y'>) => ({ raster: e.raster, periode: e.periode, y: e.y });
/** Voreinstellung der Log-Skala: an, wenn die Zerlegung multiplikativ vorschlägt (und alle Werte über 0 liegen). */
export const prognoseLogVorschlag = (a: ZeitreiheAuswertung): boolean => a.zer?.vorschlag.art === 'multiplikativ';
/** Die Beschriftungen der Prognosezeitpunkte: h Plätze nach dem letzten Wert, im Raster der Reihe. */
export function prognoseZeiten(e: Pick<ZeitreiheE, 'raster' | 'erster' | 't' | 'y'>, h: number): string[] {
  const t0 = e.t[e.t.length - 1] ?? e.y.length, r = e.raster === 'ungleich' || e.raster === 'woechentlich' || e.raster === 'taeglich' ? 'taeglich' : e.raster;
  return Array.from({ length: h }, (_, i) => (e.raster === 'zeilen' ? String(t0 + i + 1) : zeitLabel(positionIso(e, t0 + i + 1), r)));
}
/** Die Teile der Prognose für Sätze und Bericht: Hauptsatz, Ljung-Box-Satz, Prüfliste (Leitplanken) und die APA-Zeile; null ohne Prognose. */
export function prognoseSaetze(e: ZeitreiheE, name: string): { haupt: string; ljung: string; leitplanken: string[]; apa: string } | null {
  const p = e.prognose;
  if (!p) return null;
  const zeiten = prognoseZeiten(e, p.antwort.mittel.length), stellen = prognoseStellen(e.y);
  return {
    haupt: prognoseHauptsatz(p, { name: zitat(name), zeiten, stellen, automatik: p.wahl.art === 'auto' }),
    ljung: p.antwort.ljung ? prognoseLjungSatz(p.antwort.ljung) : '',
    leitplanken: prognoseLeitplanken({ wahl: p.wahl, antwort: p.antwort, T: e.y.length, periode: e.periode, alleWerteUeber0: logMoeglich(prognoseReihe(e)), luecken: e.luecken, pruefLuecke: p.pr > 0 && pruefzeitraumLuecke(e.y, e.periode, p.pr) }).map(l => l.satz),
    apa: prognoseApa(p)
  };
}
/** Die Zahl mit so vielen Stellen, dass kleine Steigungen nicht zu 0,00 werden. */
const zahlSt = (v: number): string => { const a = Math.abs(v); return komma(v, a >= 10 ? 1 : a >= 0.1 ? 2 : a >= 0.01 ? 3 : 4); };
const intervall = (k: [number, number]) => ki(zahlSt(k[0]), zahlSt(k[1]));

/* ---------------------------------------------------------------- Sätze */
/** Alle Sperren und Hinweise, die zu dieser Reihe gehören, als Sätze (für Blatt, Bericht und Prüfliste). */
export function zeitreiheHinweisSaetze(e: ZeitreiheE, a: ZeitreiheAuswertung): string[] {
  const ctx = { luecken: e.luecken, n: a.n, T: a.T, periode: e.periode, ausgeschlossen: e.ausgeschlossen };
  const codes = new Set<ZeitCode>(a.kann.hinweise);
  const gruende = a.kann.gruende;
  for (const c of [gruende.trend, gruende.acf, gruende.zerlegung, gruende.multiplikativ]) if (c) codes.add(c);
  if (e.ausgeschlossen > 0) codes.delete('zu-viele-ungueltig');
  if (a.trend && !a.kann.acf) codes.add('intervall-ohne-acf');   // das Intervall zeigt Statable weiter, warnt aber: ohne r₁ gibt es keine effektive Fallzahl
  const reihenfolge: ZeitCode[] = ['alle-gleich', 'zu-kurz', 'kurz', 'ungleich', 'luecken', 'zu-viele-luecken', 'intervall-ohne-acf', 'acf-luecken', 'keine-saison', 'woche', 'zu-kurz-fuer-zerlegung', 'wenige-perioden', 'nicht-positiv'];
  return reihenfolge.filter(c => codes.has(c)).map(c => zeitreiheCodeSatz(c, ctx));
}

/** Die Änderung als ganzer Satz, je Richtung und Zeiteinheit (kein eingesetztes Wort); b = Betrag, iv = Intervall. */
const AENDERUNG: Record<'monatlich' | 'vierteljaehrlich' | 'jaehrlich' | 'woechentlich' | 'taeglich' | 'zeilen', { auf: (w: string, b: string, iv: string) => string; ab: (w: string, b: string, iv: string) => string }> = {
  monatlich: { auf: (w, b, iv) => L(`Die Werte von ${w} stiegen im Mittel um ${b} je Monat, ${iv}.`, `The values of ${w} rose on average by ${b} per month, ${iv}.`), ab: (w, b, iv) => L(`Die Werte von ${w} sanken im Mittel um ${b} je Monat, ${iv}.`, `The values of ${w} fell on average by ${b} per month, ${iv}.`) },
  vierteljaehrlich: { auf: (w, b, iv) => L(`Die Werte von ${w} stiegen im Mittel um ${b} je Quartal, ${iv}.`, `The values of ${w} rose on average by ${b} per quarter, ${iv}.`), ab: (w, b, iv) => L(`Die Werte von ${w} sanken im Mittel um ${b} je Quartal, ${iv}.`, `The values of ${w} fell on average by ${b} per quarter, ${iv}.`) },
  jaehrlich: { auf: (w, b, iv) => L(`Die Werte von ${w} stiegen im Mittel um ${b} je Jahr, ${iv}.`, `The values of ${w} rose on average by ${b} per year, ${iv}.`), ab: (w, b, iv) => L(`Die Werte von ${w} sanken im Mittel um ${b} je Jahr, ${iv}.`, `The values of ${w} fell on average by ${b} per year, ${iv}.`) },
  woechentlich: { auf: (w, b, iv) => L(`Die Werte von ${w} stiegen im Mittel um ${b} je Woche, ${iv}.`, `The values of ${w} rose on average by ${b} per week, ${iv}.`), ab: (w, b, iv) => L(`Die Werte von ${w} sanken im Mittel um ${b} je Woche, ${iv}.`, `The values of ${w} fell on average by ${b} per week, ${iv}.`) },
  taeglich: { auf: (w, b, iv) => L(`Die Werte von ${w} stiegen im Mittel um ${b} je Tag, ${iv}.`, `The values of ${w} rose on average by ${b} per day, ${iv}.`), ab: (w, b, iv) => L(`Die Werte von ${w} sanken im Mittel um ${b} je Tag, ${iv}.`, `The values of ${w} fell on average by ${b} per day, ${iv}.`) },
  zeilen: { auf: (w, b, iv) => L(`Die Werte von ${w} stiegen im Mittel um ${b} je Zeile, ${iv}.`, `The values of ${w} rose on average by ${b} per row, ${iv}.`), ab: (w, b, iv) => L(`Die Werte von ${w} sanken im Mittel um ${b} je Zeile, ${iv}.`, `The values of ${w} fell on average by ${b} per row, ${iv}.`) }
};
/** Der Satz zum Trend (Haupt-Ergebnis): die Änderung, dann (wo es einen Zeitraum gibt) der Zeitraum, dann die Änderung je Jahr. */
function trendSatz(e: ZeitreiheE, a: ZeitreiheAuswertung, name: string): string {
  const tr = a.trend!, w = zitat(name), von = zeitLabel(e.erster, e.raster), bis = zeitLabel(e.letzter, e.raster);
  const k = a.effGezeigt && a.eff ? a.eff.kiB : tr.kiB, iv = intervall(k), b = zahlSt(Math.abs(tr.b));
  const satz = AENDERUNG[e.raster === 'ungleich' ? 'taeglich' : e.raster][tr.b >= 0 ? 'auf' : 'ab'];
  const zeitraum = e.raster === 'ungleich' || e.raster === 'zeilen' ? '' : ` ${L(`Der beobachtete Zeitraum reicht von ${von} bis ${bis}.`, `The observed period runs from ${von} to ${bis}.`)}`;
  const jahr = a.jeJahr !== null ? ` ${L(`Das sind ${zahlSt(Math.abs(a.jeJahr))} je Jahr.`, `That is ${zahlSt(Math.abs(a.jeJahr))} per year.`)}` : '';
  const schliesst0 = k[0] <= 0 && k[1] >= 0 ? ` ${L('Das Intervall schließt 0 ein: Ein Trend ist damit nicht belegt.', 'The interval includes 0: a trend is thus not shown.')}` : '';
  const mit = a.effGezeigt && a.eff && a.eff.nEff < a.n
    ? ` ${L(`Das Intervall berücksichtigt die Autokorrelation (effektive Fallzahl ${komma(a.eff.nEff, 1)} statt ${komma(a.n, 0)}); das gewöhnliche Intervall wäre ${intervall(tr.kiB)}.`, `The interval takes the autocorrelation into account (effective sample size ${komma(a.eff.nEff, 1)} instead of ${komma(a.n, 0)}); the ordinary interval would be ${intervall(tr.kiB)}.`)}`
    : '';
  return satz(w, b, iv) + zeitraum + jahr + mit + schliesst0;
}
/** Sätze zur Kreuzkorrelation (leer ohne zweite Reihe): Ergebnis oder Grund, warum sie nicht gerechnet wird. */
export function kreuzSaetze(e: ZeitreiheE, a: ZeitreiheAuswertung, name: (n: string) => string = x => x): string[] {
  const k = a.kreuz;
  if (!k || !e.zweite) return [];
  if (!k.kann.ok) return [ccfCodeSatz(k.kann.code)];
  return k.ccf ? ccfSaetze(k.ccf, { namen: [name(e.wert), name(e.zweite)], r1: k.r1 }) : [];
}
/** Sätze zur Differenzenprüfung für Bericht und Blatt (leer ohne Klick): ein Satz zum Ergebnis, die Warnungen unter „Vorsicht“. */
function differenzenSaetzeBlatt(e: ZeitreiheE): { zusatz: string[]; vorsicht: string[] } {
  const p = e.differenzen;
  if (!p) return { zusatz: [], vorsicht: [] };
  const k = p.antwort.kpss[p.d] ?? null;
  const kopf = k !== null ? L(`Differenzen geprüft (d = ${p.d}, D = ${p.D}): KPSS ${komma(k, 3)}.`, `Differences checked (d = ${p.d}, D = ${p.D}): KPSS ${komma(k, 3)}.`) : L(`Differenzen geprüft (d = ${p.d}, D = ${p.D}).`, `Differences checked (d = ${p.d}, D = ${p.D}).`);
  return { zusatz: [kopf], vorsicht: differenzenSaetze(p).map(x => x.satz) };
}
function periodogrammSaetzeBlatt(e: ZeitreiheE): { zusatz: string[]; vorsicht: string[] } {
  const p = e.periodogramm;
  return p ? { zusatz: [periodogrammHauptsatz(p)], vorsicht: periodogrammWarnungen().map(x => x.satz) } : { zusatz: [], vorsicht: [] };
}
/** Sätze zu „Hat die Maßnahme gewirkt?“ für Blatt und Bericht (leer ohne Klick): der Hauptsatz, der Ljung-Box-Satz und die Warnungen (immer sichtbar). */
export function massnahmeSaetze(e: ZeitreiheE, name: string): { haupt: string; ljung: string; warnungen: string[]; apa: string } | null {
  const m = e.massnahme;
  if (!m) return null;
  return {
    haupt: massnahmeHauptsatz(m, { name: zitat(name), zeit: platzLabel(e, m.wahl.t0 - 1) }), ljung: m.antwort.ljung ? massnahmeLjungSatz(m.antwort.ljung) : '',
    warnungen: massnahmeLeitplanken(m, { T: e.y.length, luecken: e.luecken }).map(l => l.satz), apa: massnahmeApa(m)
  };
}
/** Sätze zu „Auffällige Werte suchen“ für Blatt und Bericht (leer ohne Klick): der Hauptsatz, die Hinweise (immer sichtbar) und die Kurzzeile. */
export function ausreisserSaetze(e: ZeitreiheE): { haupt: string; hinweise: string[]; apa: string } | null {
  const x = e.ausreisser;
  if (!x) return null;
  return { haupt: ausreisserHauptsatz(x, e.y, { zeit: i => platzLabel(e, i - 1), stellen: prognoseStellen(e.y) }), hinweise: ausreisserLeitplanken(x).map(l => l.satz), apa: ausreisserApa(x) };
}
/** Sätze zu „Modell auf andere Daten“ für Blatt und Bericht (leer ohne Klick): Hauptsatz, Ljung-Box-Satz, Warnungen (immer sichtbar) und APA-Zeile. */
export function neuSaetze(e: ZeitreiheE, name: (n: string) => string): { haupt: string; ljung: string; warnungen: string[]; apa: string } | null {
  const n = e.neu;
  if (!n) return null;
  return {
    haupt: neuHauptsatz(n, { name: zitat(name(n.reihe.spalte)), zeiten: prognoseZeiten(n.reihe, n.antwort.mittel.length), stellen: prognoseStellen(n.reihe.y) }), ljung: n.antwort.ljung ? neuLjungSatz(n.antwort.ljung) : '',
    warnungen: neuWarnungen(n, n.reihe.y.length).map(w => w.satz), apa: neuApa(n)
  };
}
function mehrereSaetzeBlatt(e: ZeitreiheE, name: (n: string) => string): { zusatz: string[]; vorsicht: string[] } {
  const m = e.mehrere;
  return m ? { zusatz: [mehrereHauptsatz(m)], vorsicht: mehrereWarnungen(m, name).map(w => w.satz) } : { zusatz: [], vorsicht: [] };
}
function grangerSaetzeBlatt(e: ZeitreiheE, name: (n: string) => string): { zusatz: string[]; vorsicht: string[] } {
  const g = e.granger;
  if (!g || !e.zweite) return { zusatz: [], vorsicht: [] };
  const n = { x: name(e.wert), y: name(e.zweite) };
  return { zusatz: grangerSaetze(g, n), vorsicht: grangerWarnungen(g, n).map(x => x.satz) };
}
export function saetzeZeitreihe(e: ZeitreiheE, name: (n: string) => string = x => x): Saetze {
  const a = zeitreiheAuswertung(e), w = name(e.wert);
  const hinweise = zeitreiheHinweisSaetze(e, a);
  const kreuz = kreuzSaetze(e, a, name);
  const pg = prognoseSaetze(e, w);
  const dz = differenzenSaetzeBlatt(e), pd = periodogrammSaetzeBlatt(e), ms = massnahmeSaetze(e, w), gr = grangerSaetzeBlatt(e, name), nd = neuSaetze(e, name), mr = mehrereSaetzeBlatt(e, name), au = ausreisserSaetze(e);
  if (!a.trend) {
    const grund = a.kann.gruende.trend ? zeitreiheCodeSatz(a.kann.gruende.trend, { n: a.n, T: a.T, luecken: e.luecken }) : '';
    return { haupt: grund, zusatz: [...kreuz, ...gr.zusatz, ...pd.zusatz, ...dz.zusatz, ...(pg ? [pg.haupt, pg.ljung] : []), ...(ms ? [ms.haupt, ms.ljung] : []), ...(nd ? [nd.haupt, nd.ljung] : []), ...mr.zusatz, ...(au ? [au.haupt] : [])].filter(Boolean).join(' '), vorsicht: [...hinweise.filter(x => x !== grund), ...gr.vorsicht, ...pd.vorsicht, ...dz.vorsicht, ...(pg?.leitplanken ?? []), ...(ms?.warnungen ?? []), ...(nd?.warnungen ?? []), ...mr.vorsicht, ...(au?.hinweise ?? [])].join(' '), apa: [pg?.apa, ms?.apa, nd?.apa, au?.apa].filter(Boolean).join('; '), marken: [] };
  }
  const haupt = trendSatz(e, a, w);
  const teile: string[] = [];
  if (a.ljung && a.r1 !== null) teile.push(zeitreiheAutokorrSatz({ r1: a.r1, q: a.ljung.q, h: a.ljung.h, p: a.ljung.p, nEff: a.eff?.nEff ?? a.n, n: a.n }));
  else if (a.r1 !== null) teile.push(L(`Die Autokorrelation der Residuen (Lag 1) beträgt r₁ = ${ohneNull(a.r1, 2)}; wegen der Lücken gibt es dazu keinen Test.`, `The autocorrelation of the residuals (lag 1) is r₁ = ${ohneNull(a.r1, 2)}; because of the gaps there is no test for it.`));
  if (a.zer) teile.push(zeitreiheZerlegungSatz({ figur: a.zer.figur, periode: e.periode, erstesDatum: e.erster, art: a.zer.art }));
  teile.push(...kreuz, ...gr.zusatz, ...pd.zusatz, ...dz.zusatz);
  if (pg) teile.push(pg.haupt, ...(pg.ljung ? [pg.ljung] : []));
  if (ms) teile.push(ms.haupt, ...(ms.ljung ? [ms.ljung] : []));
  if (nd) teile.push(nd.haupt, ...(nd.ljung ? [nd.ljung] : []));
  teile.push(...mr.zusatz);
  if (au) teile.push(au.haupt);
  const warn = a.effGezeigt && a.ljung ? [zeitreiheScheintrendSatz()] : [];
  const vorsicht = [...hinweise, ...warn, zeitreiheFussSatz(), ...gr.vorsicht, ...pd.vorsicht, ...dz.vorsicht, ...(pg?.leitplanken ?? []), ...(ms?.warnungen ?? []), ...(nd?.warnungen ?? []), ...mr.vorsicht, ...(au?.hinweise ?? [])].join(' ');
  const tr = a.trend;
  const ap = a.effGezeigt && a.eff ? a.eff.kiB : tr.kiB;
  const apa = `b = ${zahlSt(tr.b)} ${einheitWort(e.raster)}, ${intervall(ap)}${a.effGezeigt && a.eff ? ` (${L('effektive Fallzahl', 'effective sample size')} ${komma(a.eff.nEff, 1)})` : ''}, R² = ${ohneNull(tr.r2, 2)}, n = ${a.n}${a.ljung ? `, Ljung-Box Q(${a.ljung.h}) = ${komma(a.ljung.q, 1)}, p ${pWert(a.ljung.p)}` : ''}`;
  return { haupt, zusatz: teile.join(' '), vorsicht, apa: [apa, pg?.apa, ms?.apa, nd?.apa, au?.apa].filter(Boolean).join('; '), marken: [] };
}

/** Zeile „Gerechnet“ zum Blatt. */
export function zeitreiheGerechnetBlatt(e: ZeitreiheE): string {
  const a = zeitreiheAuswertung(e);
  return zeitreiheGerechnet({ raster: e.raster, periode: e.periode, n: a.n, T: a.T, luecken: e.luecken, art: a.zer?.art, h: a.ljung?.h });
}

/* ---------------------------------------------------------------- Tabellen */
export function tabellenZeitreihe(e: ZeitreiheE, name: (n: string) => string = x => x): TableItem[] {
  const a = zeitreiheAuswertung(e), w = name(e.wert), aus: TableItem[] = [];
  const rows0: Z[][] = [
    [T('Raster', 'Grid'), `${rasterWort(e.raster)}${e.rasterGewaehlt ? ` (${T('gewählt', 'chosen')})` : ''}`], [T('Periode', 'Period'), String(e.periode)],
    [T('Werte (n)', 'Values (n)'), String(a.n)], [T('Plätze auf dem Raster', 'Places on the grid'), String(a.T)], [T('Lücken', 'Gaps'), String(e.luecken)],
    [T('Anfang', 'Start'), zeitLabel(e.erster, e.raster)], [T('Ende', 'End'), zeitLabel(e.letzter, e.raster)]
  ];
  if (e.ausgeschlossen > 0) rows0.push([T('Zeilen ohne gültiges Datum', 'Rows without a valid date'), String(e.ausgeschlossen)]);
  aus.push(tabelle('Zeitreihe', T(`Zeitreihe ${zitat(w)}`, `Time series ${zitat(w)}`), [T('Kennzahl', 'Measure'), T('Wert', 'Value')], rows0,
    [zeitreiheGerechnetBlatt(e)]));
  if (a.trend) {
    const tr = a.trend, einheit = einheitWort(e.raster);
    const zeilen: Z[][] = [[T(`Steigung (${einheit})`, `Slope (${einheit})`), fx(tr.b, 4), fx(tr.seB, 4), fx(tr.kiB[0], 4), fx(tr.kiB[1], 4)]];
    if (a.effGezeigt && a.eff) zeilen.push([T('Steigung mit Rücksicht auf Autokorrelation', 'Slope taking autocorrelation into account'), fx(tr.b, 4), fx(a.eff.seB, 4), fx(a.eff.kiB[0], 4), fx(a.eff.kiB[1], 4)]);
    zeilen.push([T('Konstante', 'Constant'), fx(tr.a, 4), fx(tr.seA, 4), '-', '-']);
    if (a.jeJahr !== null) zeilen.push([T('Steigung je Jahr', 'Slope per year'), fx(a.jeJahr, 3), '-', fx(JE_JAHR[e.raster]! * (a.effGezeigt && a.eff ? a.eff.kiB[0] : tr.kiB[0]), 3), fx(JE_JAHR[e.raster]! * (a.effGezeigt && a.eff ? a.eff.kiB[1] : tr.kiB[1]), 3)]);
    zeilen.push(['R²', ono(tr.r2, 3), '-', '-', '-']);
    aus.push(tabelle('Trend', T(`Linearer Trend ${zitat(w)}`, `Linear trend ${zitat(w)}`), ['', T('Schätzung', 'Estimate'), T('Standardfehler', 'Standard error'), T('95-%-KI unten', '95% CI lower'), T('95-%-KI oben', '95% CI upper')], zeilen,
      [a.effGezeigt && a.eff ? T('Das zweite Intervall rechnet mit der effektiven Fallzahl n·(1 − r₁)/(1 + r₁) (Santer u. a., 2000).', 'The second interval uses the effective sample size n·(1 − r₁)/(1 + r₁) (Santer et al., 2000).') : T('Gewöhnliches Intervall aus der t-Verteilung (n − 2 Freiheitsgrade); es setzt unabhängige Werte voraus.', 'Ordinary interval from the t distribution (n − 2 degrees of freedom); it assumes independent values.')]));
  }
  if (a.r1 !== null) {
    const zeilen: Z[][] = [[T('Autokorrelation der Residuen, Lag 1 (r₁)', 'Autocorrelation of the residuals, lag 1 (r₁)'), { t: ohneNull(a.r1, 3), n: a.r1 }]];
    if (a.ljung) { zeilen.push([T(`Ljung-Box Q (${a.ljung.h} Verzögerungen)`, `Ljung-Box Q (${a.ljung.h} lags)`), fx(a.ljung.q, 2)], ['p', { t: pWert(a.ljung.p).replace(/^= /, ''), n: a.ljung.p }]); }
    if (a.dw !== null) zeilen.push([T('Durbin-Watson d (ohne p)', 'Durbin-Watson d (no p)'), fx(a.dw, 3)]);
    if (a.eff && a.effGezeigt) zeilen.push([T('Effektive Fallzahl', 'Effective sample size'), fx(a.eff.nEff, 1)]);
    aus.push(tabelle('Autokorrelation', T('Autokorrelation', 'Autocorrelation'), [T('Kennzahl', 'Measure'), T('Wert', 'Value')], zeilen,
      [T('Durbin-Watson nahe 2: keine Autokorrelation; nahe 0: starke positive. Die Entscheidung trägt der Ljung-Box-Test.', 'Durbin-Watson near 2: no autocorrelation; near 0: strong positive. The decision rests on the Ljung-Box test.')]));
  }
  if (a.zer) {
    const z = a.zer, zeilen: Z[][] = z.figur.map((v, i) => [positionName(i, e.periode, e.erster), z.art === 'additiv' ? fx(v, 3) : fx(v, 4)]);
    aus.push(tabelle('Saisonfigur', T(`Klassische Zerlegung (${z.art === 'additiv' ? L('additiv', 'additive') : L('multiplikativ', 'multiplicative')}): Saisonfigur`, `Classical decomposition (${z.art === 'additiv' ? L('additiv', 'additive') : L('multiplikativ', 'multiplicative')}): seasonal figure`),
      [T('Position', 'Position'), z.art === 'additiv' ? T('Abweichung', 'Deviation') : T('Faktor', 'Factor')], zeilen,
      [z.restAnteil !== null ? T(`Der Rest macht ${komma(z.restAnteil * 100, 1)} % der Gesamtstreuung aus.`, `The remainder makes up ${komma(z.restAnteil * 100, 1)}% of the total variation.`) : T('Die Ränder (je eine halbe Periode) haben keinen Trend und keinen Rest.', 'The margins (half a period each) have no trend and no remainder.')]));
  }
  if (a.kreuz?.ccf && e.zweite) {
    const c = a.kreuz.ccf, zname = name(e.zweite), zeilen: Z[][] = c.lags.map((lag, i) => [{ t: komma(lag, 0), n: lag }, c.r[i] === null ? '-' : { t: ohneNull(c.r[i]!, 3), n: c.r[i]! }, String(c.paare[i]), lag === 0 ? '' : lag > 0 ? T(`${zitat(w)} liegt vorn`, `${zitat(w)} leads`) : T(`${zitat(zname)} liegt vorn`, `${zitat(zname)} leads`)]);
    aus.push(tabelle('Kreuzkorrelation', T(`Kreuzkorrelation ${zitat(w)} und ${zitat(zname)}`, `Cross-correlation ${zitat(w)} and ${zitat(zname)}`), [T('Verzögerung k', 'Lag k'), 'r', T('Paare', 'Pairs'), T('Wer liegt vorn?', 'Who leads?')], zeilen,
      [T(`r(k) ist die Korrelation von ${zitat(w)} zur Zeit t mit ${zitat(zname)} zur Zeit t + k. Positives k: die erste Reihe liegt vorn. Grenzen ±${ohneNull(c.grenze, 3)} (1,96/√n, je Verzögerung einzeln).`, `r(k) is the correlation of ${zitat(w)} at time t with ${zitat(zname)} at time t + k. Positive k: the first series leads. Limits ±${ohneNull(c.grenze, 3)} (1.96/√n, per lag).`)]));
  }
  if (e.periodogramm) aus.push(...periodogrammTabellen(e.periodogramm, zitat(w)));
  if (e.granger && e.zweite) aus.push(...grangerTabellen(e.granger, { x: w, y: name(e.zweite) }));
  if (e.differenzen) aus.push(...differenzenTabellen(e.differenzen, zitat(w)));
  if (e.prognose) aus.push(...prognoseTabellen(e.prognose, { name: zitat(w), zeiten: prognoseZeiten(e, e.prognose.antwort.mittel.length), stellen: prognoseStellen(e.y) }));
  if (e.neu) aus.push(...neuTabellen(e.neu, { name: zitat(name(e.neu.reihe.spalte)), zeiten: prognoseZeiten(e.neu.reihe, e.neu.antwort.mittel.length), stellen: prognoseStellen(e.neu.reihe.y) }));
  if (e.mehrere) aus.push(...mehrereTabellen(e.mehrere, { name, zeiten: (r, h) => prognoseZeiten(r, h) }));
  if (e.massnahme) aus.push(...massnahmeTabellen(e.massnahme, { name: zitat(w), zeit: platzLabel(e, e.massnahme.wahl.t0 - 1), zeiten: prognoseZeiten(e, e.massnahme.antwort.mittel.length), stellen: prognoseStellen(e.y) }));
  if (e.ausreisser) aus.push(...ausreisserTabellen(e.ausreisser, { name: zitat(w), zeit: i => platzLabel(e, i - 1), y: e.y, stellen: prognoseStellen(e.y) }));
  return aus;
}
export const lpZeitpunkte = (n: number) => Lp(n, `${n} Zeitpunkt`, `${n} Zeitpunkte`, `${n} point in time`, `${n} points in time`);

/* ---------------------------------------------------------------- Zeitachse und Band für die Bilder */
const tageIm = (j: number, m: number) => [31, (j % 4 === 0 && j % 100 !== 0) || j % 400 === 0 ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1]!;
const p2 = (x: number) => String(x).padStart(2, '0');
/** Das Datum (ISO) an der Position t der Reihe; ohne Datum die Nummer. */
export function positionIso(e: Pick<ZeitreiheE, 'erster' | 'raster'>, t: number): string {
  const r = /^(\d{4})-(\d{2})-(\d{2})/.exec(e.erster);
  if (!r || e.raster === 'zeilen') return String(t);
  const j = Number(r[1]), m = Number(r[2]), tag = Number(r[3]);
  const monate = (k: number) => { const z = 12 * j + (m - 1) + k, jj = Math.floor(z / 12), mm = (z % 12) + 1; return `${jj}-${p2(mm)}-${p2(Math.min(tag, tageIm(jj, mm)))}`; };
  const tage = (k: number) => new Date(Date.UTC(j, m - 1, tag + k)).toISOString().slice(0, 10);
  switch (e.raster) {
    case 'monatlich': return monate(t - 1);
    case 'vierteljaehrlich': return monate(3 * (t - 1));
    case 'jaehrlich': return monate(12 * (t - 1));
    case 'woechentlich': return tage(7 * (t - 1));
    case 'taeglich': return tage(t - 1);
    default: return tage(t);
  }
}
/** Teilstriche der Zeitachse: bei Monaten und Quartalen die Jahresanfänge, bei Jahren jedes k-te Jahr, sonst gleichmäßig verteilte Daten; ohne Datum Zahlen. Höchstens `max` Striche. */
export function zeitTeilstriche(e: Pick<ZeitreiheE, 'erster' | 'raster' | 't'>, max = 8): { t: number; label: string }[] {
  const t0 = e.t[0] ?? 1, t1 = e.t[e.t.length - 1] ?? 1;
  if (e.raster === 'zeilen') { const schritt = Math.max(1, Math.ceil((t1 - t0) / max)); const aus: { t: number; label: string }[] = []; for (let t = t0; t <= t1; t += schritt) aus.push({ t, label: String(t) }); return aus; }
  const jahr = (iso: string) => iso.slice(0, 4);
  if (e.raster === 'monatlich' || e.raster === 'vierteljaehrlich' || e.raster === 'jaehrlich') {
    const alle: { t: number; label: string; jan: boolean }[] = [];
    for (let t = t0; t <= t1; t++) { const iso = positionIso(e, t), jan = iso.slice(5, 7) === '01'; alle.push({ t, label: jan || e.raster === 'jaehrlich' ? jahr(iso) : `${iso.slice(5, 7)}/${jahr(iso)}`, jan }); }
    const jahre = alle.filter(x => x.jan || e.raster === 'jaehrlich');
    const roh = (l: typeof alle) => l.map(x => ({ t: x.t, label: x.label }));
    if (jahre.length >= 3) { const schritt = Math.ceil(jahre.length / max); return roh(jahre.filter((_, i) => i % schritt === 0)); }
    const schritt = Math.max(1, Math.ceil(alle.length / max)); return roh(alle.filter((_, i) => i % schritt === 0));
  }
  const n = Math.min(max, Math.max(2, t1 - t0 + 1)), aus: { t: number; label: string }[] = [];
  for (let i = 0; i < n; i++) { const t = Math.round(t0 + ((t1 - t0) * i) / (n - 1)); aus.push({ t, label: positionIso(e, t) }); }
  return aus;
}
/** Das 95-%-Band um die Trendgerade (Intervall für den Mittelwert an der Stelle t); `eff`: Varianz mit n/nEff vergrößert. Leer, wenn es nicht zu rechnen ist. */
export function trendBand(e: Pick<ZeitreiheE, 't' | 'y'>, a: ZeitreiheAuswertung, eff = false): { t: number; lo: number; hi: number }[] {
  const tr = a.trend;
  if (!tr || !(tr.df >= 1) || !Number.isFinite(tr.seA) || !Number.isFinite(tr.seB)) return [];
  const ts = e.t.filter((_, i) => e.y[i] !== null), tm = ts.reduce((x, y) => x + y, 0) / ts.length, n = tr.n;
  const s2 = n * (tr.seA ** 2 - tm * tm * tr.seB ** 2);
  if (!(s2 >= 0)) return [];
  const faktor = eff && a.eff ? n / a.eff.nEff : 1, df = eff && a.eff ? a.eff.nEff - 2 : tr.df;
  const tq = quantilT(df), von = e.t[0]!, bis = e.t[e.t.length - 1]!, schritte = 48;
  return Array.from({ length: schritte + 1 }, (_, i) => {
    const t = von + ((bis - von) * i) / schritte, mitte = tr.a + tr.b * t, br = tq * Math.sqrt(faktor * (s2 / n + (t - tm) ** 2 * tr.seB ** 2));
    return { t, lo: mitte - br, hi: mitte + br };
  });
}
import { tQuantil } from './verteilung';
const quantilT = (df: number) => tQuantil(0.975, Math.max(1, df));

/* ---------------------------------------------------------------- Prüfliste vor dem Rechnen */
/** Was die Prüfliste der Karte meldet: bei einer Sperre ein Satz, sonst eine Kopfzeile, die Hinweise (Lücken, Länge, ungleiche Abstände …) und - bei einer Reihe, die sich nicht beschreiben lässt - eine Sperre. */
export function zeitreiheVorpruefung(wert: string, datum: string, zweite = ''): { ok: true; kopf: string; hinweise: string[]; sperre: string | null } | { ok: false; satz: string } {
  const a = zeitreiheAufbauen(wert, datum);
  if (!a.ok) return { ok: false, satz: zeitreiheCodeSatz(a.code, { ausgeschlossen: a.ausgeschlossen }) };
  const r = a.reihe, werte = r.y.filter((v): v is number => v !== null), minWert = Math.min(...werte), alleGleich = minWert === Math.max(...werte);
  const kann = zeitreiheKann({ raster: r.raster, periode: r.periode, n: r.n, T: r.y.length, luecken: r.luecken, anteilLuecken: r.anteilLuecken, minWert, alleGleich });
  const ctx = { luecken: r.luecken, n: r.n, T: r.y.length, periode: r.periode };
  const hinweise: string[] = [];
  const zeigen: ZeitCode[] = ['ungleich', 'luecken', 'zu-viele-luecken', 'kurz', 'wenige-perioden'];
  const codes = new Set<ZeitCode>([...kann.hinweise, ...Object.values(kann.gruende).filter((c): c is ZeitCode => !!c)]);
  for (const c of zeigen) if (codes.has(c)) hinweise.push(zeitreiheCodeSatz(c, ctx));
  if (r.ausgeschlossen > 0) hinweise.push(Lp(r.ausgeschlossen, `${r.ausgeschlossen} Zeile ohne gültiges Datum bleibt unberücksichtigt.`, `${r.ausgeschlossen} Zeilen ohne gültiges Datum bleiben unberücksichtigt.`, `${r.ausgeschlossen} row without a valid date is left out.`, `${r.ausgeschlossen} rows without a valid date are left out.`));
  if (r.rueckwaerts) hinweise.push(L('Die Zeilen standen mit dem neuesten Zeitpunkt zuerst; Statable hat nach der Zeit sortiert.', 'The rows had the latest point in time first; Statable sorted them by time.'));
  if (zweite) {   // Später S-F2: zweite Reihe für die Kreuzkorrelation - die Prüfung sperrt nicht die ganze Karte, nur die Kreuzkorrelation
    const z = zeitreiheErgebnis(wert, datum, { zweite });
    if (z.ok && z.e.y2) {
      const k = ccfKann(z.e.y, z.e.y2);
      if (!k.ok) hinweise.push(ccfCodeSatz(k.code));
      else if (z.e.y2.some(v => v === null) || z.e.y.some(v => v === null)) hinweise.push(L('In einer der beiden Reihen fehlen einzelne Werte; die Kreuzkorrelation ist dann eine Näherung (Paare mit Lücke zählen nicht).', 'Single values are missing in one of the two series; the cross-correlation is then an approximation (pairs with a gap do not count).'));
    }
  }
  const kopf = L(`Zeitreihe: ${r.n} Werte, Raster ${rasterWort(r.raster)}, Periode ${r.periode}`, `Time series: ${r.n} values, grid ${rasterWort(r.raster)}, period ${r.periode}`);
  return { ok: true, kopf, hinweise, sperre: kann.gruende.trend === 'alle-gleich' ? zeitreiheCodeSatz('alle-gleich') : null };
}
