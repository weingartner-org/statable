/**
 * Armut und Ungleichheit (Fachblatt Abschnitt 3, Teil 2): „Wie ungleich ist das Einkommen verteilt?“
 * Gewichteter Median, Armutsschwelle (Anteil des Medians), Armutsquote (Anteil UNTER der Schwelle, `<`), S80/S20 und Gini, dazu die Standardfehler mit dem R-Paket survey.
 * Daten für R, Sperren und Hinweise, Lesen der Antwort von `sp_armut` (engine/statable-armut.R), Sätze, Tabellen und der R-Text zum Ansehen.
 * Der Entwurf (einzeln gezogen, Klumpen, Schichten) ist Pflichtangabe der Karte und steht in jedem Ergebnis. Der Standardfehler der Quote rechnet mit fester Schwelle; das steht im Satz.
 * Statable rechnet keine Äquivalenzskala: das Einkommen muss schon so vorliegen, wie es verglichen werden soll.
 * SICHERHEIT: Der Aufruf enthält nur feste Wörter, Wahrheitswerte und Zahlen; Einkommen, Gewicht, Klumpen und Schicht gehen nur als Daten mit festen Namen (e, w, k, s) nach R.
 */
import type { TableItem } from '../engine/types';
import type { RSpalte } from '../engine/webr';
import type { Spalte } from './verzeichnis';
import type { Wert } from './eingabe';
import { L, Lp, d } from './sitzung.svelte';
import { zitat, proz, ganzZahl } from '../i18n/profil';
import { komma, type Saetze } from './ergebnis';
import { tabelle, fx, type Z } from './mwsaetze';
import { spaltenName } from './medmodsaetze';
import { rFange, rBool, rAnzeigeName as rn, rAnzeigeZahl } from '../engine/rsicher';
import type { RAufruf } from './kategreg';
import { gueltigFuer } from './kategreg';
import { kpZahlen, kpIndex, kpObjekt, kpArr, kpZahl, kpZahlOderNull, kpText, type KpPunkt } from './kpdaten';

export const R_PAKETE_ARMUT = ['survey'];
/** Die wählbaren Anteile des Medians für die Schwelle; Vorgabe 60 %. */
export const ARMUT_ANTEILE: readonly number[] = [0.4, 0.5, 0.6, 0.7];
export const ARMUT_ANTEIL_STANDARD = 0.6;
/** Unter so vielen Fällen schwanken Quote und Gini stark (Fachblatt). */
export const ARMUT_KLEIN = 200;
/** Mehr Zeilen rechnet Statable im Browser nicht (wie bei den Umfragegewichten). */
export const ARMUT_ZEILEN_MAX = 200000;

/* ------------------------------------------------------------ Daten für R und Sperren */
export interface ArmutDaten {
  spalten: RSpalte[]; einkommen: string; gewicht: string; klumpen: string | null; schicht: string | null;
  /** Zeilen, die in die Rechnung gehen */ n: number;
  /** Zeilen ohne Einkommen, Gewicht, Klumpen oder Schicht, wo eine gewählt ist */ ausgelassen: number;
  /** Zeilen mit Gewicht 0 (gehen nicht ein, werden gezählt) */ gewichtNull: number;
  /** Zeilen mit negativem Gewicht (sperren) */ gewichtNegativ: number;
  /** Einkommen genau 0 und Einkommen unter 0 */ nullen: number; negativ: number;
  klumpenN: number; schichtN: number;
  /** Schichten mit nur einem Klumpen (bei Klumpen und Schicht) bzw. mit nur einem Fall (nur Schicht) */ duenneSchichten: number;
  gleicheSpalten: boolean;
}
const schluessel = (v: string | number): string => String(v);
export function armutDaten(einkommen: string, gewicht: string, klumpen: string | null, schicht: string | null, zeilen: Wert[][], spalten: Spalte[]): ArmutDaten {
  const ie = kpIndex(spalten, einkommen), iw = kpIndex(spalten, gewicht);
  if (ie < 0 || iw < 0) throw new Error('Spalte fehlt');
  const ik = klumpen ? kpIndex(spalten, klumpen) : -1, is = schicht ? kpIndex(spalten, schicht) : -1;
  if ((klumpen && ik < 0) || (schicht && is < 0)) throw new Error('Spalte fehlt');
  const ev = kpZahlen(spalten[ie]!, ie, zeilen), wv = kpZahlen(spalten[iw]!, iw, zeilen);
  const gk = ik >= 0 ? gueltigFuer(spalten[ik]!) : null, gs = is >= 0 ? gueltigFuer(spalten[is]!) : null;
  const e: number[] = [], w: number[] = [], k: (string | null)[] = [], s: (string | null)[] = [];
  let ausgelassen = 0, gewichtNull = 0, gewichtNegativ = 0;
  zeilen.forEach((z, r) => {
    const kv = gk && gk(z[ik]) ? schluessel(z[ik] as string | number) : null, sv = gs && gs(z[is]) ? schluessel(z[is] as string | number) : null;
    if (ev[r] === null || wv[r] === null || (gk && kv === null) || (gs && sv === null)) { ausgelassen++; return; }
    if (wv[r]! === 0) { gewichtNull++; return; }
    if (wv[r]! < 0) gewichtNegativ++;
    e.push(ev[r]!); w.push(wv[r]!); k.push(kv); s.push(sv);
  });
  const klumpenN = gk ? new Set(k).size : 0, schichtN = gs ? new Set(s).size : 0;
  let duenne = 0;
  if (gs) {
    const je = new Map<string, Set<string>>();
    s.forEach((sv, i) => { const m = je.get(sv!) ?? new Set<string>(); m.add(gk ? k[i]! : String(i)); je.set(sv!, m); });   // ohne Klumpen zählt jede Zeile als eigener Klumpen
    duenne = [...je.values()].filter(m => m.size < 2).length;
  }
  const spaltenR: RSpalte[] = [{ name: 'e', art: 'zahl', werte: e }, { name: 'w', art: 'zahl', werte: w }];
  if (gk) spaltenR.push({ name: 'k', art: 'text', werte: k });
  if (gs) spaltenR.push({ name: 's', art: 'text', werte: s });
  const benutzt = [einkommen, gewicht, ...(klumpen ? [klumpen] : []), ...(schicht ? [schicht] : [])];
  return { spalten: spaltenR, einkommen, gewicht, klumpen, schicht, n: e.length, ausgelassen, gewichtNull, gewichtNegativ, nullen: e.filter(v => v === 0).length, negativ: e.filter(v => v < 0).length,
    klumpenN, schichtN, duenneSchichten: duenne, gleicheSpalten: new Set(benutzt).size < benutzt.length };
}

export type ArmutCode = 'gleiche-spalten' | 'zu-wenig-faelle' | 'zu-viele-zeilen' | 'gewicht-negativ' | 'ein-klumpen' | 'duenne-schichten' | 'negativ' | 'nullen' | 'klein' | 'einzel-psu' | 'r-fehler';
export const ARMUT_SPERREN: ReadonlySet<ArmutCode> = new Set<ArmutCode>(['gleiche-spalten', 'zu-wenig-faelle', 'zu-viele-zeilen', 'gewicht-negativ', 'ein-klumpen', 'duenne-schichten', 'einzel-psu', 'r-fehler']);
export function armutCodes(dt: ArmutDaten): ArmutCode[] {
  const aus: ArmutCode[] = [];
  if (dt.gleicheSpalten) aus.push('gleiche-spalten');
  if (dt.n < 2) aus.push('zu-wenig-faelle');
  if (dt.n > ARMUT_ZEILEN_MAX) aus.push('zu-viele-zeilen');
  if (dt.gewichtNegativ > 0) aus.push('gewicht-negativ');
  if (dt.klumpen && !dt.schicht && dt.klumpenN < 2) aus.push('ein-klumpen');
  if (dt.schicht && dt.duenneSchichten > 0) aus.push('duenne-schichten');
  if (dt.negativ > 0) aus.push('negativ');
  if (dt.nullen > 0) aus.push('nullen');
  if (dt.n >= 2 && dt.n < ARMUT_KLEIN) aus.push('klein');
  return aus;
}
export interface ArmutSatzKontext { n?: number; nullen?: number; negativ?: number; duenn?: number; schicht?: boolean; klumpen?: boolean }
export function armutCodeSatz(c: ArmutCode, x: ArmutSatzKontext = {}): { text: string; klein?: string } {
  switch (c) {
    case 'gleiche-spalten': return { text: L('Einkommen, Gewicht, Klumpen und Schicht müssen vier verschiedene Spalten sein.', 'Income, weight, cluster and stratum must be four different columns.') };
    case 'zu-wenig-faelle': return { text: L('Es bleiben weniger als zwei Fälle mit Einkommen und Gewicht.', 'Fewer than two cases with income and weight remain.') };
    case 'zu-viele-zeilen': return { text: L(`Mehr als ${ganzZahl(ARMUT_ZEILEN_MAX)} Zeilen rechnet Statable im Browser nicht.`, `Statable does not calculate more than ${ganzZahl(ARMUT_ZEILEN_MAX)} rows in the browser.`) };
    case 'gewicht-negativ': return { text: L('Das Gewicht ist bei mindestens einer Zeile negativ. Ein Gewicht darf nicht negativ sein.', 'The weight is negative in at least one row. A weight must not be negative.'),
      klein: d('Prüfe die Gewichtsspalte.', 'Prüfen Sie die Gewichtsspalte.', 'Check the weight column.') };
    case 'ein-klumpen': return { text: L('Es gibt nur einen Klumpen. Mit einem Klumpen lässt sich der Standardfehler nicht schätzen.', 'There is only one cluster. With one cluster the standard error cannot be estimated.') };
    case 'duenne-schichten': return x.klumpen
      ? { text: Lp(x.duenn ?? 0, `${x.duenn ?? 0} Schicht hat nur einen Klumpen. Dann lässt sich der Standardfehler nicht schätzen.`, `${x.duenn ?? 0} Schichten haben nur einen Klumpen. Dann lässt sich der Standardfehler nicht schätzen.`, `${x.duenn ?? 0} stratum has only one cluster. The standard error cannot then be estimated.`, `${x.duenn ?? 0} strata have only one cluster. The standard error cannot then be estimated.`),
        klein: d('Fasse Schichten mit einem Klumpen mit einer anderen zusammen oder wähle einen anderen Entwurf.', 'Fassen Sie Schichten mit einem Klumpen mit einer anderen zusammen oder wählen Sie einen anderen Entwurf.', 'Merge strata with one cluster into another one or choose a different design.') }
      : { text: Lp(x.duenn ?? 0, `${x.duenn ?? 0} Schicht hat nur einen Fall. Dann lässt sich der Standardfehler nicht schätzen.`, `${x.duenn ?? 0} Schichten haben nur einen Fall. Dann lässt sich der Standardfehler nicht schätzen.`, `${x.duenn ?? 0} stratum has only one case. The standard error cannot then be estimated.`, `${x.duenn ?? 0} strata have only one case. The standard error cannot then be estimated.`) };
    case 'negativ': return { text: Lp(x.negativ ?? 0,
      `${x.negativ ?? 0} Einkommen ist negativ. Es wird nicht gelöscht und geht in Median und Quote ein. Gini und S80/S20 sind mit negativen Einkommen nicht definiert und werden nicht berechnet.`,
      `${x.negativ ?? 0} Einkommen sind negativ. Sie werden nicht gelöscht und gehen in Median und Quote ein. Gini und S80/S20 sind mit negativen Einkommen nicht definiert und werden nicht berechnet.`,
      `${x.negativ ?? 0} income is negative. It is not deleted and enters the median and the rate. The Gini coefficient and S80/S20 are not defined with negative incomes and are not calculated.`,
      `${x.negativ ?? 0} incomes are negative. They are not deleted and enter the median and the rate. The Gini coefficient and S80/S20 are not defined with negative incomes and are not calculated.`) };
    case 'nullen': return { text: Lp(x.nullen ?? 0,
      `${x.nullen ?? 0} Einkommen ist 0. Es wird nicht gelöscht und geht in Median, Quote und Gini ein.`,
      `${x.nullen ?? 0} Einkommen sind 0. Sie werden nicht gelöscht und gehen in Median, Quote und Gini ein.`,
      `${x.nullen ?? 0} income is 0. It is not deleted and enters the median, the rate and the Gini coefficient.`,
      `${x.nullen ?? 0} incomes are 0. They are not deleted and enter the median, the rate and the Gini coefficient.`) };
    case 'klein': return { text: L(`Mit ${x.n ?? 0} Fällen schwanken Quote und Gini stark.`, `With ${x.n ?? 0} cases the rate and the Gini coefficient vary a lot.`) };
    case 'einzel-psu': return { text: L('Eine Schicht hat nur einen Klumpen. Dann lässt sich der Standardfehler nicht schätzen, und Statable ersetzt das nicht durch eine Annahme.', 'A stratum has only one cluster. The standard error cannot then be estimated, and Statable does not replace this with an assumption.') };
    case 'r-fehler': return { text: L('R meldete bei der Rechnung einen Fehler.', 'R reported an error in the calculation.') };
  }
}
export function armutPunkte(dt: ArmutDaten): KpPunkt[] {
  const ctx: ArmutSatzKontext = { n: dt.n, nullen: dt.nullen, negativ: dt.negativ, duenn: dt.duenneSchichten, klumpen: !!dt.klumpen, schicht: !!dt.schicht };
  const nul = dt.gewichtNull;
  const kopf: KpPunkt = { art: 'ok', text: Lp(dt.n, `${dt.n} Fall mit Einkommen und Gewicht`, `${dt.n} Fälle mit Einkommen und Gewicht`, `${dt.n} case with income and weight`, `${dt.n} cases with income and weight`),
    ...(dt.ausgelassen + nul > 0 ? { klein: [
      dt.ausgelassen > 0 ? Lp(dt.ausgelassen, `${dt.ausgelassen} Zeile mit einer Lücke wird ausgelassen.`, `${dt.ausgelassen} Zeilen mit einer Lücke werden ausgelassen.`, `${dt.ausgelassen} row with a gap is left out.`, `${dt.ausgelassen} rows with a gap are left out.`) : '',
      nul > 0 ? Lp(nul, `${nul} Zeile mit Gewicht 0 geht nicht ein.`, `${nul} Zeilen mit Gewicht 0 gehen nicht ein.`, `${nul} row with weight 0 is not included.`, `${nul} rows with weight 0 are not included.`) : ''].filter(Boolean).join(' ') } : {}) };
  return [kopf, ...armutCodes(dt).map((c): KpPunkt => { const s = armutCodeSatz(c, ctx); return { art: ARMUT_SPERREN.has(c) ? 'sperre' : 'hinweis', text: s.text, ...(s.klein ? { klein: s.klein } : {}) }; })];
}

/* ------------------------------------------------------------ Aufruf und Antwort */
export function armutAufruf(dt: ArmutDaten): RAufruf {
  // die Anteile des Medians (0,4 / 0,5 / 0,6 / 0,7) stehen fest als Vorgabe in sp_armut; der Test in engine/armut.webr.test.ts prüft, dass sie ARMUT_ANTEILE entsprechen
  return { code: rFange(`sp_armut(d, ${rBool(!!dt.klumpen)}, ${rBool(!!dt.schicht)})`), args: {} };
}
export interface ArmutQuote { anteil: number; schwelle: number; quote: number; se: number }
/** Das, was am Blatt gespeichert wird. Die Zahlen kommen aus R; Sätze und Tabellen entstehen bei jedem Aufruf neu (folgen der Sprache). */
export interface ArmutE {
  einkommen: string; gewicht: string; klumpen: string | null; schicht: string | null;
  n: number; ausgelassen: number; gewichtNull: number; summeW: number; nullen: number; negativ: number;
  median: number; q20: number; q80: number; quoten: ArmutQuote[];
  /** Gini: `null`, wenn ein Einkommen negativ ist; S80/S20 zusätzlich, wenn das untere Fünftel kein Einkommen hat */ s80s20: number | null; gini: number | null; giniSe: number | null;
  klumpenN: number; schichtN: number;
  /** gewählter Anteil des Medians für die Schwelle (Vorgabe 0,6) */ anteil: number;
}
export function armutLesen(roh: unknown, dt: ArmutDaten): { ok: true; e: ArmutE } | { ok: false; code: ArmutCode } {
  if (!kpObjekt(roh)) return { ok: false, code: 'r-fehler' };
  if (roh.fehler !== undefined) {
    const t = kpText(roh.fehler);
    return { ok: false, code: t === 'zu-wenig' ? 'zu-wenig-faelle' : t === 'negatives-gewicht' ? 'gewicht-negativ' : /only one PSU|lonely|single PSU/i.test(t) ? 'einzel-psu' : 'r-fehler' };
  }
  const quoten = kpArr<unknown>(roh.quoten).map((o): ArmutQuote | null => kpObjekt(o) ? { anteil: kpZahl(o.anteil), schwelle: kpZahl(o.schwelle), quote: kpZahl(o.quote), se: kpZahl(o.se) } : null);
  if (quoten.length !== ARMUT_ANTEILE.length || quoten.some(q => !q || ![q.anteil, q.schwelle, q.quote, q.se].every(Number.isFinite))) return { ok: false, code: 'r-fehler' };
  const e: ArmutE = {
    einkommen: dt.einkommen, gewicht: dt.gewicht, klumpen: dt.klumpen, schicht: dt.schicht,
    n: kpZahl(roh.n), ausgelassen: dt.ausgelassen, gewichtNull: dt.gewichtNull, summeW: kpZahl(roh.summe_w), nullen: kpZahl(roh.nullen), negativ: kpZahl(roh.negativ),
    median: kpZahl(roh.median), q20: kpZahl(roh.q20), q80: kpZahl(roh.q80), quoten: quoten as ArmutQuote[],
    s80s20: kpZahlOderNull(roh.s80s20), gini: kpZahlOderNull(roh.gini), giniSe: kpZahlOderNull(roh.gini_se),
    klumpenN: dt.klumpenN, schichtN: dt.schichtN, anteil: ARMUT_ANTEIL_STANDARD
  };
  if (![e.n, e.summeW, e.median, e.q20, e.q80].every(Number.isFinite) || (e.gini === null) !== (e.giniSe === null) || (e.gini === null && e.s80s20 !== null)) return { ok: false, code: 'r-fehler' };
  return { ok: true, e };
}
export const armutFehlerSatz = (c: ArmutCode, k: ArmutSatzKontext = {}): string => armutCodeSatz(c, k).text;
/** Die Zahlen zum gewählten Anteil (Vorgabe: 60 %). */
export const armutGewaehlt = (e: ArmutE): ArmutQuote => e.quoten.find(q => Math.abs(q.anteil - e.anteil) < 1e-9) ?? e.quoten.find(q => Math.abs(q.anteil - ARMUT_ANTEIL_STANDARD) < 1e-9) ?? e.quoten[0]!;

/* ------------------------------------------------------------ Sätze */
/** Ein Betrag: ab 1000 ganz mit Tausendertrenner der Sprache, darunter mit zwei Stellen. */
const betrag = (v: number): string => (Math.abs(v) >= 1000 ? ganzZahl(Math.round(v)) : komma(v, 2));
const prozent = (v: number) => proz(komma(v, 2));
const anteilProz = (a: number) => proz(komma(a * 100, 0));
/** Der Entwurf in einem Satzteil. */
export function armutEntwurf(e: Pick<ArmutE, 'klumpen' | 'schicht' | 'klumpenN' | 'schichtN'>, name: (n: string) => string = spaltenName): string {
  if (!e.klumpen && !e.schicht) return L('Die Personen wurden einzeln gezogen, ohne Klumpen und Schichten.', 'The people were drawn individually, without clusters and strata.');
  if (e.klumpen && e.schicht) return L(`Entwurf: ${e.klumpenN} Klumpen (${zitat(name(e.klumpen))}) in ${e.schichtN} Schichten (${zitat(name(e.schicht))}).`, `Design: ${e.klumpenN} clusters (${zitat(name(e.klumpen))}) in ${e.schichtN} strata (${zitat(name(e.schicht))}).`);
  if (e.klumpen) return L(`Entwurf: ${e.klumpenN} Klumpen (${zitat(name(e.klumpen))}), ohne Schichten.`, `Design: ${e.klumpenN} clusters (${zitat(name(e.klumpen))}), without strata.`);
  return L(`Entwurf: ${e.schichtN} Schichten (${zitat(name(e.schicht!))}), Personen einzeln gezogen, ohne Klumpen.`, `Design: ${e.schichtN} strata (${zitat(name(e.schicht!))}), people drawn individually, without clusters.`);
}
/** Die Hinweise zur Deutung; sie stehen immer sichtbar. */
export function armutWarnungen(e: ArmutE): string[] {
  const w: string[] = [
    L('Das Einkommen muss schon so vorliegen, wie es verglichen werden soll, zum Beispiel äquivalenzgewichtet je Person. Statable rechnet keine Äquivalenzskala.', 'The income must already be in the form in which it is to be compared, for example equivalised per person. Statable does not calculate an equivalence scale.'),
    L('Die Quote misst relative Armutsgefährdung. Sie sagt nichts über den Lebensstandard, und sie bleibt gleich, wenn alle Einkommen im selben Verhältnis steigen.', 'The rate measures relative at-risk-of-poverty. It says nothing about the standard of living, and it stays the same when all incomes rise in the same proportion.'),
    L('Der Standardfehler hängt am Entwurf der Stichprobe. In einer Beispielerhebung mit Schichten und Klumpen ist der Standardfehler des Gini 0,31; nimmt man an, die Personen seien einzeln gezogen worden, sind es nur 0,20. Ein falscher Entwurf gibt zu enge Intervalle.', 'The standard error depends on the sample design. In an example survey with strata and clusters the standard error of the Gini coefficient is 0.31; if one assumes that the people were drawn individually, it is only 0.20. A wrong design gives intervals that are too narrow.'),
    L('Standardfehler aus verschiedenen Verfahren sind nicht vergleichbar, zum Beispiel mit denen eines einfachen Bootstraps.', 'Standard errors from different methods are not comparable, for example with those of a simple bootstrap.')
  ];
  if (e.n < ARMUT_KLEIN) w.push(armutCodeSatz('klein', { n: e.n }).text);
  if (e.negativ > 0) w.push(armutCodeSatz('negativ', { negativ: e.negativ }).text);
  if (e.nullen > 0) w.push(armutCodeSatz('nullen', { nullen: e.nullen }).text);
  const weg = e.ausgelassen > 0 ? Lp(e.ausgelassen, `${e.ausgelassen} Zeile mit einer Lücke wurde ausgelassen`, `${e.ausgelassen} Zeilen mit einer Lücke wurden ausgelassen`, `${e.ausgelassen} row with a gap was left out`, `${e.ausgelassen} rows with a gap were left out`) : '';
  const nul = e.gewichtNull > 0 ? Lp(e.gewichtNull, `${e.gewichtNull} Zeile mit Gewicht 0 ging nicht ein`, `${e.gewichtNull} Zeilen mit Gewicht 0 gingen nicht ein`, `${e.gewichtNull} row with weight 0 was not included`, `${e.gewichtNull} rows with weight 0 were not included`) : '';
  if (weg || nul) w.push(`${[weg, nul].filter(Boolean).join('; ')}.`);
  return w;
}
export function saetzeArmut(e: ArmutE, name: (n: string) => string = spaltenName): Saetze {
  const q = armutGewaehlt(e), a = anteilProz(q.anteil);
  const haupt = L(`Die Armutsschwelle liegt bei ${betrag(q.schwelle)} (${a} des gewichteten Medians von ${betrag(e.median)}). ${prozent(q.quote)} der Fälle liegen darunter (Armutsquote, Standardfehler ${komma(q.se, 2)}). Der Standardfehler rechnet mit der festen Schwelle: Die Unsicherheit der Schwelle ist nicht darin enthalten.`,
    `The poverty threshold is ${betrag(q.schwelle)} (${a} of the weighted median of ${betrag(e.median)}). ${prozent(q.quote)} of the cases are below it (poverty rate, standard error ${komma(q.se, 2)}). The standard error uses the fixed threshold: the uncertainty of the threshold is not included.`);
  const gl = e.gini !== null && e.giniSe !== null
    ? L(`Der Gini-Koeffizient beträgt ${komma(e.gini, 2)} auf einer Skala von 0 bis 100 (Standardfehler ${komma(e.giniSe, 2)}).`, `The Gini coefficient is ${komma(e.gini, 2)} on a scale from 0 to 100 (standard error ${komma(e.giniSe, 2)}).`) : '';
  const s8 = e.s80s20 !== null
    ? L(`Das obere Fünftel hat ${komma(e.s80s20, 2)}-mal so viel Einkommen wie das untere Fünftel (S80/S20, ohne Standardfehler).`, `The top fifth has ${komma(e.s80s20, 2)} times as much income as the bottom fifth (S80/S20, without a standard error).`)
    : e.gini !== null ? L('S80/S20 ist nicht definiert, weil das untere Fünftel kein Einkommen hat.', 'S80/S20 is not defined because the bottom fifth has no income.') : '';
  const ungl = e.gini === null ? L('Gini-Koeffizient und S80/S20 werden nicht berechnet, weil Einkommen negativ sind.', 'The Gini coefficient and S80/S20 are not calculated because incomes are negative.') : `${s8} ${gl}`;
  const apa = e.gini !== null && e.giniSe !== null && e.s80s20 !== null
    ? L(`Quote = ${prozent(q.quote)} (SE = ${komma(q.se, 2)}, feste Schwelle), S80/S20 = ${komma(e.s80s20, 2)}, Gini = ${komma(e.gini, 2)} (SE = ${komma(e.giniSe, 2)}), n = ${e.n}`, `Rate = ${prozent(q.quote)} (SE = ${komma(q.se, 2)}, fixed threshold), S80/S20 = ${komma(e.s80s20, 2)}, Gini = ${komma(e.gini, 2)} (SE = ${komma(e.giniSe, 2)}), n = ${e.n}`)
    : L(`Quote = ${prozent(q.quote)} (SE = ${komma(q.se, 2)}, feste Schwelle), n = ${e.n}`, `Rate = ${prozent(q.quote)} (SE = ${komma(q.se, 2)}, fixed threshold), n = ${e.n}`);
  return { haupt, zusatz: `${ungl} ${armutEntwurf(e, name)}`, vorsicht: armutWarnungen(e).join(' '), apa, marken: [] };
}
export const armutGerechnet = (): string => L('Armut und Ungleichheit (survey: gewichteter Median, Quote mit fester Schwelle, S80/S20, Gini mit Linearisierung)', 'Poverty and inequality (survey: weighted median, rate with fixed threshold, S80/S20, Gini with linearization)');
export const armutFachwort = (): string => L('Armutsgefährdung und Ungleichheit (Quote, S80/S20, Gini)', 'at-risk-of-poverty and inequality (rate, S80/S20, Gini coefficient)');
export const armutWarum = (): string => d('Die Frage ist, wie ungleich das Einkommen verteilt ist und wie viele Menschen unter einer Schwelle liegen. Statable nimmt als Schwelle einen Anteil des gewichteten Medians (Vorgabe 60 %) und zählt, wie viele Fälle darunter liegen. Dazu kommen das Verhältnis der Einkommen des oberen zum unteren Fünftel (S80/S20) und der Gini-Koeffizient. Die Standardfehler rechnet Statable mit dem Entwurf der Stichprobe, den du angegeben hast.',
  'Die Frage ist, wie ungleich das Einkommen verteilt ist und wie viele Menschen unter einer Schwelle liegen. Statable nimmt als Schwelle einen Anteil des gewichteten Medians (Vorgabe 60 %) und zählt, wie viele Fälle darunter liegen. Dazu kommen das Verhältnis der Einkommen des oberen zum unteren Fünftel (S80/S20) und der Gini-Koeffizient. Die Standardfehler rechnet Statable mit dem Entwurf der Stichprobe, den Sie angegeben haben.',
  'The question is how unequally income is distributed and how many people are below a threshold. Statable takes a share of the weighted median as the threshold (default 60%) and counts how many cases are below it. In addition there are the ratio of the incomes of the top to the bottom fifth (S80/S20) and the Gini coefficient. Statable calculates the standard errors with the sample design you gave.');

/* ------------------------------------------------------------ Tabellen */
export function tabellenArmut(e: ArmutE, name: (n: string) => string = spaltenName): TableItem[] {
  const q = armutGewaehlt(e), a = anteilProz(q.anteil);
  const zeilen: Z[][] = [
    [L('Fälle', 'Cases'), fx(e.n, 0), '-'],
    [L('Summe der Gewichte', 'Sum of the weights'), fx(e.summeW, 2), '-'],
    [L('Gewichteter Median', 'Weighted median'), fx(e.median, 2), '-'],
    [L(`Armutsschwelle (${a} des Medians)`, `Poverty threshold (${a} of the median)`), fx(q.schwelle, 2), '-'],
    [L('Armutsquote (%)', 'Poverty rate (%)'), fx(q.quote, 2), fx(q.se, 2)],
    ['S80/S20', e.s80s20 === null ? '-' : fx(e.s80s20, 2), '-'],
    [L('Gini-Koeffizient (0 bis 100)', 'Gini coefficient (0 to 100)'), e.gini === null ? '-' : fx(e.gini, 2), e.giniSe === null ? '-' : fx(e.giniSe, 2)]
  ];
  const fuss = [
    L('Der Standardfehler der Quote rechnet mit der festen Schwelle; die Unsicherheit der Schwelle ist nicht enthalten. Für S80/S20 gibt es keinen Standardfehler.', 'The standard error of the rate uses the fixed threshold; the uncertainty of the threshold is not included. There is no standard error for S80/S20.'),
    armutEntwurf(e, name)
  ];
  if (e.gini === null) fuss.push(armutCodeSatz('negativ', { negativ: e.negativ }).text);
  const t = tabelle('Armut Kennzahlen', L('Armut und Ungleichheit', 'Poverty and inequality'), [L('Kennzahl', 'Measure'), L('Wert', 'Value'), L('Standardfehler', 'Standard error')], zeilen, fuss);
  const v = tabelle('Armut Schwellen', L('Die Quote bei anderen Schwellen', 'The rate at other thresholds'), [L('Anteil des Medians', 'Share of the median'), L('Schwelle', 'Threshold'), L('Quote (%)', 'Rate (%)'), L('Standardfehler', 'Standard error')],
    e.quoten.map((x): Z[] => [anteilProz(x.anteil), fx(x.schwelle, 2), fx(x.quote, 2), fx(x.se, 2)]),
    [L('Jeweils mit fester Schwelle; die Unsicherheit der Schwelle ist nicht enthalten.', 'Each with the fixed threshold; the uncertainty of the threshold is not included.')]);
  return [t, v];
}
/** R-Text zum Ansehen (wird nie ausgeführt). */
export function armutRCode(einkommen: string, gewicht: string, klumpen: string | null, schicht: string | null, anteil: number = ARMUT_ANTEIL_STANDARD): string {
  const ids = klumpen && schicht ? `ids = ~${rn(klumpen)}, strata = ~${rn(schicht)}, weights = ~${rn(gewicht)}, data = daten, nest = TRUE`
    : klumpen ? `ids = ~${rn(klumpen)}, weights = ~${rn(gewicht)}, data = daten`
    : schicht ? `ids = ~1, strata = ~${rn(schicht)}, weights = ~${rn(gewicht)}, data = daten`
    : `ids = ~1, weights = ~${rn(gewicht)}, data = daten`;
  return [
    `# ${L('daten: die Tabelle in R (ohne Zeilen mit Lücken)', 'daten: your table in R (without rows with gaps)')}`,
    'library(survey)',
    `# ${L('Median: kleinster Wert mit kumuliertem Gewichtsanteil >= 0,5; bei genau 0,5 das Mittel der beiden Nachbarn', 'Median: smallest value with a cumulative weight share >= 0.5; at exactly 0.5 the mean of the two neighbours')}`,
    `schwelle <- ${rAnzeigeZahl(anteil)} * gewichteter_median(daten$${rn(einkommen)}, daten$${rn(gewicht)})`,
    `daten$arm <- 100 * (daten$${rn(einkommen)} < schwelle)   # ${L('unter der Schwelle, nicht gleich', 'below the threshold, not equal')}`,
    `entwurf <- svydesign(${ids})`,
    `SE(svymean(~arm, entwurf))   # ${L('Standardfehler der Quote, mit fester Schwelle', 'standard error of the rate, with the fixed threshold')}`,
    `# Gini = 2 * sum(w * y * C) / (N * T) - 1,  C = ${L('kumuliertes Gewicht', 'cumulative weight')} - w / 2 (${L('nach y sortiert', 'sorted by y')}),  N = sum(w),  T = sum(w * y)`,
    '# u_k = 2 / (N * T) * (y_k * C_k + sum(w_l * y_l, l > k)) - 2 * A / (N * T) * (1 / N + y_k / T),  A = sum(w * y * C)',
    `SE(svytotal(~u, entwurf))   # ${L('Standardfehler des Gini (u in Prozent)', 'standard error of the Gini coefficient (u in percent)')}`,
    `# S80/S20 = sum(w * y [y > ${L('80-%-Quantil', '80th percentile')}]) / sum(w * y [y <= ${L('20-%-Quantil', '20th percentile')}])`
  ].join('\n');
}
