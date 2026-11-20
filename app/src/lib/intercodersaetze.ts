/**
 * Intercoder-Übereinstimmung (Fachblatt G2): Ergebnis fürs Blatt, Sätze, APA-Zeile und Tabellen.
 * Gerechnet wird in intercoder.ts (gegen R irrCAC geprüft). Hier: Skala aus dem Messniveau, Einordnung, Texte.
 * ⚠ Satzvorlagen von der Fachperson abzunehmen; die Einordnung von α folgt Krippendorff (2004), die von κ Landis & Koch (1977, „Konvention“).
 */
import type { TableItem } from '../engine/types';
import { L, Lp } from './sitzung.svelte';
import { ki, proz } from '../i18n/profil';
import { komma, ohneNull, type Saetze } from './ergebnis';
import { kappaWort } from './uebereinstimmung';
import { intercoder, type IntercoderErgebnis, type Koef, type Skala, type Wert } from './intercoder';
import { fd, fo, fx, tabelle, type Z } from './mwsaetze';

const T = L;

/** Das gespeicherte Ergebnis: Rechenergebnis plus die Spalten und die seltenste Kategorie (für den Satz zum Kappa-Paradox). */
export interface Inter extends IntercoderErgebnis {
  art: 'inter';
  spalten: string[];
  /** Zeilen der Daten */
  gesamt: number;
  /** Seltenste Kategorie unter den Kodierungen der Einheiten mit mindestens zwei Kodierungen (Wert, nicht Anzeigename) */
  seltene: string | number | null;
}

/** Skala für Alpha aus dem Messniveau der Spalten: nominal → nominal, ordinal → ordinal, metrisch → Intervall; gemischt: das niedrigste; Text immer nominal. */
export function alphaSkala(spalten: { text: boolean; niveau: 'nominal' | 'ordinal' | 'metrisch' | undefined }[]): Skala {
  const rang = (s: { text: boolean; niveau: 'nominal' | 'ordinal' | 'metrisch' | undefined }) => (s.text || s.niveau === 'nominal' ? 0 : s.niveau === 'ordinal' ? 1 : 2);
  const r = Math.min(...spalten.map(rang), 2);
  return r === 0 ? 'nominal' : r === 1 ? 'ordinal' : 'interval';
}

/** Einheiten (Zeilen) mit mindestens zwei, mit genau einer Kodierung und die Zahl der Kategorien unter den Einheiten mit mindestens zwei (für die Prüfliste vor dem Rechnen). */
export function zaehleEinheiten(daten: Wert[][]): { mind2: number; eine: number; kategorien: number } {
  let mind2 = 0, eine = 0; const kat = new Set<string | number>();
  const n = daten[0]?.length ?? 0;
  for (let i = 0; i < n; i++) {
    const z = daten.map(s => s[i]).filter((v): v is string | number => v !== null && v !== undefined && v !== '');
    if (z.length >= 2) { mind2++; for (const v of z) kat.add(v); } else if (z.length === 1) eine++;
  }
  return { mind2, eine, kategorien: kat.size };
}

export function interRechnen(spalten: string[], daten: Wert[][], skala: Skala): Inter {
  const e = intercoder(daten, skala);
  const zaehl = new Map<string | number, number>();
  const n = daten[0]?.length ?? 0;
  for (let i = 0; i < n; i++) {
    const z = daten.map(s => s[i]).filter((v): v is string | number => v !== null && v !== undefined && v !== '');
    if (z.length >= 2) for (const v of z) zaehl.set(v, (zaehl.get(v) ?? 0) + 1);
  }
  let seltene: string | number | null = null, min = Infinity;
  for (const [k, c] of [...zaehl].sort(([a], [b]) => (typeof a === 'number' && typeof b === 'number' ? a - b : String(a).localeCompare(String(b), 'de')))) if (c < min) { min = c; seltene = k; }
  return { ...e, art: 'inter', spalten, gesamt: n, seltene };
}

/** Krippendorff (2004): ≥ ,800 verlässlich; ,667 bis ,800 nur vorläufige Schlüsse; darunter nicht verlässlich. Die Stufe hängt am angezeigten Wert (drei Stellen). */
export function alphaStufe(a: number): 'verlaesslich' | 'vorlaeufig' | 'nicht' {
  const x = Math.round(a * 1000) / 1000;
  return x >= 0.8 ? 'verlaesslich' : x >= 0.667 ? 'vorlaeufig' : 'nicht';
}
const alphaWort = (a: number) => { const s = alphaStufe(a); return s === 'verlaesslich' ? T('verlässlich', 'reliable') : s === 'vorlaeufig' ? T('nur für vorläufige Schlüsse', 'only for tentative conclusions') : T('nicht verlässlich', 'not reliable'); };
const alphaSatzTeil = (a: number) => { const s = alphaStufe(a); return s === 'verlaesslich' ? T('ist verlässlich (Grenze ,800)', 'is reliable (threshold .800)') : s === 'vorlaeufig' ? T('erlaubt nur vorläufige Schlüsse (zwischen ,667 und ,800)', 'allows only tentative conclusions (between .667 and .800)') : T('reicht nicht für verlässliche Schlüsse (Grenze ,667)', 'is not enough for reliable conclusions (threshold .667)'); };
export const skalaName = (s: Skala) => (s === 'nominal' ? T('nominal', 'nominal') : s === 'ordinal' ? T('ordinal', 'ordinal') : T('Intervallskala', 'interval scale'));

const prozent = (v: number) => proz(komma(v * 100, 0));
const kiText = (k: Koef, st = 2) => (k.unten !== null && k.oben !== null ? `, ${ki(ohneNull(k.unten, st), ohneNull(k.oben, st))}` : '');

/** Satz zu Krippendorffs Alpha (für beide Anzeigen). */
function alphaSatz(e: Inter): string {
  const a = e.alpha;
  if (a.wert === null) return '';
  return T(`Krippendorffs α = ${ohneNull(a.wert, 3)} (${skalaName(e.skalaGenutzt)}) ${alphaSatzTeil(a.wert)}.`, `Krippendorff's α = ${ohneNull(a.wert, 3)} (${skalaName(e.skalaGenutzt)}) ${alphaSatzTeil(a.wert)}.`);
}
/** Satz zum Kappa-Paradox (nur wenn `e.paradox`). `kat` macht aus dem Wert den Anzeigenamen der Kategorie. */
function paradoxSatz(e: Inter, kat: (w: string | number) => string): string {
  if (!e.paradox || e.prozent.wert === null) return '';
  const selten = e.seltene !== null ? T(` Das liegt an der seltenen Kategorie „${kat(e.seltene)}“.`, ` This is due to the rare category "${kat(e.seltene)}".`) : '';
  const bp = e.bp.wert !== null ? T(` Brennan-Prediger (κ = ${ohneNull(e.bp.wert)}) hängt nicht von der Häufigkeit der Kategorien ab.`, ` Brennan-Prediger (κ = ${ohneNull(e.bp.wert)}) does not depend on how often the categories occur.`) : '';
  return T(`Von den Paaren von Kodierungen je Einheit stimmen ${prozent(e.prozent.wert)} überein, κ ist trotzdem niedrig.${selten}${bp}`, `Of the pairs of codings per unit, ${prozent(e.prozent.wert)} agree, yet κ is low.${selten}${bp}`);
}
/** Satz, wenn κ und α bei ordinaler oder metrischer Skala weit auseinanderliegen (|α − κ| ≥ ,20), und der Hinweis, wo die Skala steht. */
function skalaSaetze(e: Inter): string {
  const k = e.hauptwert === 'cohen' ? e.cohen : e.fleiss?.wert ?? null, a = e.alpha.wert;
  if (a === null) return '';
  const weit = e.skalaGenutzt !== 'nominal' && k !== null && Math.abs(a - k) >= 0.2
    ? T('κ zählt nur genau gleiche Stufen, α (ordinal/metrisch) berücksichtigt auch, wie weit die Stufen auseinanderliegen. ', 'κ counts only exactly equal levels, α (ordinal/metric) also takes into account how far apart the levels are. ') : '';
  return ' ' + weit + T('Die Skala folgt dem Messniveau der Spalten (änderbar unter „Spalten beschreiben“).', 'The scale follows the level of measurement of the columns (can be changed under "Describe columns").');
}
const apaAlpha = (e: Inter) => (e.alpha.wert === null ? '' : `α (${skalaName(e.skalaGenutzt)}) = ${ohneNull(e.alpha.wert, 3)}${kiText(e.alpha, 3)}`);
const alphaMarke = (e: Inter) => ({ text: T(`Krippendorffs α = ${ohneNull(e.alpha.wert!, 3)} (${skalaName(e.skalaGenutzt)}): ${alphaWort(e.alpha.wert!)}`, `Krippendorff's α = ${ohneNull(e.alpha.wert!, 3)} (${skalaName(e.skalaGenutzt)}): ${alphaWort(e.alpha.wert!)}`), erklaer: 'krippendorff-alpha', hinweis: alphaStufe(e.alpha.wert!) === 'nicht' });
const einzelnSatz = (e: Inter) => (e.nNurEine > 0
  ? ' ' + Lp(e.nNurEine,
    `${e.nNurEine} Einheit hat nur eine Kodierung: Krippendorffs α übergeht sie; Prozent, Fleiss' κ und Brennan-Prediger zählen sie bei der Zufallsübereinstimmung mit.`,
    `${e.nNurEine} Einheiten haben nur eine Kodierung: Krippendorffs α übergeht sie; Prozent, Fleiss' κ und Brennan-Prediger zählen sie bei der Zufallsübereinstimmung mit.`,
    `${e.nNurEine} unit has only one coding: Krippendorff's α leaves it out; percent agreement, Fleiss' κ and Brennan-Prediger count it in the chance agreement.`,
    `${e.nNurEine} units have only one coding: Krippendorff's α leaves them out; percent agreement, Fleiss' κ and Brennan-Prediger count them in the chance agreement.`)
  : '');

/** Sätze für drei und mehr Kodierende: Fleiss' κ als Hauptwert, Krippendorffs α dahinter. */
export function saetzeInter(e: Inter, kat: (w: string | number) => string = String): Saetze {
  const k = e.nKodierende, n = e.nEinheiten;
  if (e.allesGleich) return {
    haupt: T('Alle Kodierungen sind gleich. Die Kennwerte lassen sich nicht berechnen; die Übereinstimmung beträgt 100 %.', 'All codings are the same. The coefficients cannot be calculated; the agreement is 100%.'),
    zusatz: '', vorsicht: '', apa: '', marken: []
  };
  const f = e.fleiss!, fw = f.wert!;
  const haupt = T(`Die Übereinstimmung der ${k} Kodierenden ist ${kappaWort(fw)}, Fleiss' κ = ${ohneNull(fw)}${kiText(f)}. ${alphaSatz(e)}`,
    `The agreement of the ${k} coders is ${kappaWort(fw)}, Fleiss' κ = ${ohneNull(fw)}${kiText(f)}. ${alphaSatz(e)}`).trim();
  const pz = e.prozent.wert !== null && !e.paradox ? T(`Im Mittel stimmen die Kodierenden bei ${prozent(e.prozent.wert)} der Paare je Einheit überein`, `On average the coders agree in ${prozent(e.prozent.wert)} of the pairs per unit`) : '';
  const bp = e.bp.wert !== null && !e.paradox ? T(`; der Brennan-Prediger-Koeffizient (Zufallsübereinstimmung 1/${e.nKategorien}) beträgt ${ohneNull(e.bp.wert)}${kiText(e.bp)}`, `; the Brennan-Prediger coefficient (chance agreement 1/${e.nKategorien}) is ${ohneNull(e.bp.wert)}${kiText(e.bp)}`) : '';
  const paradox = paradoxSatz(e, kat);
  const zusatz = [
    paradox,
    pz ? `${pz}${bp}.` : '',
    T('Die Wortstufen für κ (Landis & Koch, 1977) sind eine Konvention, keine Grenze der Statistik. Für α nennt Krippendorff (2004): ab ,800 verlässlich, von ,667 bis ,800 nur vorläufige Schlüsse, darunter nicht verlässlich. α verträgt fehlende Kodierungen.',
      'The verbal labels for κ (Landis & Koch, 1977) are a convention, not a limit set by statistics. For α, Krippendorff (2004) gives: from .800 reliable, from .667 to .800 only tentative conclusions, below that not reliable. α copes with missing codings.') + einzelnSatz(e) + skalaSaetze(e)
  ].filter(Boolean).join(' ');
  const vorsicht = (n < 30 ? T(`Bei ${n} Einheiten sind die Intervalle breit. `, `With ${n} units the intervals are wide. `) : '')
    + (paradox ? '' : T('κ hängt davon ab, wie oft jede Kategorie vorkommt: Ist eine Kategorie sehr selten oder sehr häufig, kann κ trotz hoher Übereinstimmung niedrig ausfallen.', 'κ depends on how often each category occurs: if one category is very rare or very common, κ can be low despite high agreement.'));
  const apa = `Fleiss' κ = ${ohneNull(fw)}${kiText(f)}; ${apaAlpha(e)}; ${T(`${n} Einheiten, ${k} Kodierende`, `${n} units, ${k} coders`)}`;
  return {
    haupt, zusatz, vorsicht: vorsicht.trim(), apa,
    marken: [
      { text: `${T('Übereinstimmung', 'Level of agreement')}: ${kappaWort(fw)} · Fleiss' κ = ${ohneNull(fw)}`, erklaer: 'kappa' },
      ...(e.alpha.wert !== null ? [alphaMarke(e)] : []),
      ...(e.prozent.wert !== null ? [{ text: T(`${prozent(e.prozent.wert)} gleich kodiert`, `${prozent(e.prozent.wert)} coded the same`), erklaer: 'kappa' }] : []),
      ...(e.paradox ? [{ text: T('Kappa-Paradox: hohe Übereinstimmung, niedriges κ', 'Kappa paradox: high agreement, low κ'), erklaer: 'kappa', hinweis: true }] : []),
      ...(n < 30 ? [{ text: T(`Wenige Einheiten (n = ${n})`, `Few units (n = ${n})`), erklaer: 'stichprobe', hinweis: true }] : [])
    ]
  };
}

/** Zwei Kodierende: Die Sätze zu Cohens Kappa bleiben, wie sie sind; Krippendorffs Alpha kommt dahinter (Satz, APA-Zeile, Marke). */
export function mitInter(st: Saetze, e: Inter | undefined, kat: (w: string | number) => string = String): Saetze {
  if (!e || e.alpha.wert === null) return st;
  const paradox = paradoxSatz(e, kat);
  return {
    ...st,
    zusatz: [st.zusatz, alphaSatz(e) + einzelnSatz(e) + skalaSaetze(e), paradox].filter(Boolean).join(' '),
    apa: `${st.apa}; ${apaAlpha(e)}`,
    marken: [...st.marken, alphaMarke(e)]
  };
}

/** Tabellen für Blatt, Bericht, Word, PDF und Excel. Bei zwei Kodierenden steht Cohens Kappa in der PSPP-Tabelle; hier nur Alpha. */
export function tabellenInter(e: Inter): TableItem[] {
  const n = (v: number | null): Z => fo(v ?? NaN);
  const zeile = (name: string, k: Koef, st: number, wort: string): Z[] => [name, st === 3 ? fo(k.wert ?? NaN, 3) : n(k.wert), st === 3 ? fo(k.unten ?? NaN, 3) : n(k.unten), st === 3 ? fo(k.oben ?? NaN, 3) : n(k.oben), wort];
  const zeilen: Z[][] = [];
  if (e.fleiss) zeilen.push(zeile("Fleiss' κ", e.fleiss, 2, e.fleiss.wert !== null ? `${kappaWort(e.fleiss.wert)} (${T('Konvention', 'convention')})` : '-'));
  zeilen.push(zeile(`${T("Krippendorffs α", "Krippendorff's α")} (${skalaName(e.skalaGenutzt)})`, e.alpha, 3, e.alpha.wert !== null ? alphaWort(e.alpha.wert) : '-'));
  const haupt = tabelle('Intercoder Agreement', e.fleiss ? T('Übereinstimmung der Kodierenden', 'Agreement of the coders') : T('Krippendorffs Alpha', "Krippendorff's alpha"),
    [T('Kennwert', 'Coefficient'), T('Wert', 'Value'), T('95 %-KI untere Grenze', '95% CI lower'), T('95 %-KI obere Grenze', '95% CI upper'), T('Einordnung', 'Classification')], zeilen,
    [e.fleiss
      ? T('κ: Einordnung nach Landis & Koch (1977), eine Konvention. α: ab ,800 verlässlich, von ,667 bis ,800 nur vorläufige Schlüsse, darunter nicht verlässlich (Krippendorff, 2004). KI: Standardfehler nach Gwet (2014), t-Verteilung, oben bei 1 gekappt.',
        'κ: classification after Landis & Koch (1977), a convention. α: from .800 reliable, .667 to .800 only tentative conclusions, below that not reliable (Krippendorff, 2004). CI: standard error after Gwet (2014), t distribution, capped at 1 at the top.')
      : T('α: ab ,800 verlässlich, von ,667 bis ,800 nur vorläufige Schlüsse, darunter nicht verlässlich (Krippendorff, 2004). KI: Standardfehler nach Gwet (2014), t-Verteilung, oben bei 1 gekappt. Cohens κ steht in der Tabelle der PSPP-Ausgabe.',
        'α: from .800 reliable, .667 to .800 only tentative conclusions, below that not reliable (Krippendorff, 2004). CI: standard error after Gwet (2014), t distribution, capped at 1 at the top. Cohen\'s κ is in the PSPP table.')]);
  const pr = e.prozent;
  const weitere = tabelle('Intercoder Further Coefficients', T('Weitere Kennwerte', 'Further coefficients'),
    [T('Kennwert', 'Coefficient'), T('Wert', 'Value'), T('95 %-KI untere Grenze', '95% CI lower'), T('95 %-KI obere Grenze', '95% CI upper')],
    [
      [T('Prozentuale Übereinstimmung (%)', 'Percent agreement (%)'), fx((pr.wert ?? NaN) * 100, 1), fx((pr.unten ?? NaN) * 100, 1), fx((pr.oben ?? NaN) * 100, 1)],
      [T('Brennan-Prediger-Koeffizient', 'Brennan-Prediger coefficient'), n(e.bp.wert), n(e.bp.unten), n(e.bp.oben)],
      [T('Einheiten (mit mindestens zwei Kodierungen)', 'Units (with at least two codings)'), fd(e.nEinheiten), '', ''],
      [T('Einheiten mit nur einer Kodierung', 'Units with only one coding'), fd(e.nNurEine), '', '']
    ],
    [e.fleiss
      ? T(`Brennan-Prediger: Zufallsübereinstimmung 1/q mit q = ${e.nKategorien} Kategorien (Brennan & Prediger, 1981). Prozent, Fleiss' κ und Brennan-Prediger folgen R irrCAC (Gwet, 2014); Krippendorffs α rechnet nur mit Einheiten mit mindestens zwei Kodierungen.`,
        `Brennan-Prediger: chance agreement 1/q with q = ${e.nKategorien} categories (Brennan & Prediger, 1981). Percent agreement, Fleiss' κ and Brennan-Prediger follow R irrCAC (Gwet, 2014); Krippendorff's α uses only units with at least two codings.`)
      : T(`Brennan-Prediger: Zufallsübereinstimmung 1/q mit q = ${e.nKategorien} Kategorien (Brennan & Prediger, 1981). Prozent und Brennan-Prediger folgen R irrCAC (Gwet, 2014); Krippendorffs α rechnet nur mit Einheiten mit mindestens zwei Kodierungen.`,
        `Brennan-Prediger: chance agreement 1/q with q = ${e.nKategorien} categories (Brennan & Prediger, 1981). Percent agreement and Brennan-Prediger follow R irrCAC (Gwet, 2014); Krippendorff's α uses only units with at least two codings.`)]);
  return [haupt, weitere];
}

