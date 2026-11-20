/**
 * Mantel-Haenszel mit Schichtvariable in der Kreuztabelle (Später, Welle S-B, M3): Wahl der Rollen, Sätze, APA-Zeile, Tabellen, Daten für das Forest-Bild.
 * Zahlen: mantelhaenszel.ts (JavaScript). Die Rollenwahl gilt wie bei den Risikomaßen aus Welle 7: welche Spalte nennt die Gruppen, welche Gruppe steht oben, welche Antwort ist das Ereignis -
 * ändert sich die Wahl, wird aus dem Odds Ratio sein Kehrwert (Test und Breslow-Day bleiben gleich). Bei Tabellen größer als 2 × 2 gibt es nur den verallgemeinerten CMH-Test.
 * Keine Haldane-Korrektur, kein exakter bedingter Test, keine Woolf-Homogenität (Entscheidungen Opus). Sätze nicht kausal. ⚠ Satzvorlagen von der Fachperson abzunehmen.
 */
import type { TableItem } from '../engine/types';
import { L, d } from './sitzung.svelte';
import { ki, dfKlammer, zitat as anfuehrung } from '../i18n/profil';
import { komma, pWert, kurz, type Kreuz, type Saetze } from './ergebnis';
import { tabelle, fx, fo, fp, fd, type Z } from './mwsaetze';
import { mantelHaenszel, verallgemeinerterCmh, mhHinweisText, MH_MAX_SCHICHTEN, type MhErgebnis, type MhHinweis } from './mantelhaenszel';
import { risikoTafel, type RisikoWahl } from './risikosaetze';

const T = L;
const q = (t: string) => anfuehrung(kurz(t));

/** Rollen für das gemeinsame Odds Ratio (wie `RisikoWahl`, ohne „erwünscht“: das braucht nur die NNT). */
export interface SchichtWahl { gruppe: 'zeilen' | 'spalten'; gruppePos: 0 | 1; ereignisPos: 0 | 1 }
/** Was am Kreuz-Ergebnis hängt: die Zählungen je Schicht (Zeilen × Spalten wie `zaehlung`), die Wahl der Korrektur und die Rollen. */
export interface SchichtDaten {
  /** Bezeichnung der Schichtspalte */ spalte: string;
  stufen: { name: string; tab: number[][] }[];
  /** Stetigkeitskorrektur des CMH-Tests (Voreinstellung: ja) */ korrektur: boolean;
  wahl?: SchichtWahl;
}
export { MH_MAX_SCHICHTEN };

/** Die Zählungen je Schicht aus Zeilen (Zeile, Spalte, Schicht, Gewicht), geordnet nach `zeilen`, `spalten` und `stufen` (Namen wie in der PSPP-Tabelle). Zeilen mit unbekanntem Namen zählen nicht. */
export function zaehleSchichten(zeilen: { z: string; s: string; k: string; w: number }[], zNamen: string[], sNamen: string[], stufen: string[]): SchichtDaten['stufen'] {
  const zi = new Map(zNamen.map((n, i) => [n, i])), si = new Map(sNamen.map((n, i) => [n, i])), ki2 = new Map(stufen.map((n, i) => [n, i]));
  const aus = stufen.map(name => ({ name, tab: zNamen.map(() => sNamen.map(() => 0)) }));
  for (const r of zeilen) {
    const a = zi.get(r.z), b = si.get(r.s), c = ki2.get(r.k);
    if (a === undefined || b === undefined || c === undefined || !(r.w > 0)) continue;
    aus[c]!.tab[a]![b]! += r.w;
  }
  return aus;
}

export interface SchichtAnzeige {
  d: SchichtDaten; zwei: boolean; wahl: SchichtWahl | null;
  /** 2 × 2 × K: die Tafeln [[a, b], [c, d]] je Schicht in der Rollenwahl */ tafeln: number[][][];
  mh: MhErgebnis | null;
  /** größer als 2 × 2: der verallgemeinerte CMH-Test */ allgemein: { chi2: number; df: number; p: number } | null;
  /** Namen: Schicht-Spalte, Gruppen-Spalte, Ereignis-Spalte, Gruppe 1, Gruppe 2, Ereignis, kein Ereignis */
  schichtName: string; gruppeName: string; ereignisName: string; gruppe1: string; gruppe2: string; ereignis: string; keinEreignis: string;
}

/** Voreinstellung der Rollen: dieselbe Richtung wie das Odds Ratio der Kreuztabelle darüber (Zeile 1 gegen Zeile 2, erste Antwort als Ereignis); hat die Person unter den Risikomaßen
 *  Rollen gewählt, gelten diese. So steht über und unter derselben Tabelle dasselbe OR (nicht sein Kehrwert). */
export function schichtWahlFuer(e: Kreuz, gruppe: 'zeilen' | 'spalten'): SchichtWahl {
  const r = e.risiko;
  if (r && r.gruppe === gruppe) return { gruppe: r.gruppe, gruppePos: r.gruppePos, ereignisPos: r.ereignisPos };
  return { gruppe, gruppePos: 0, ereignisPos: 0 };
}
export const schichtWahlStandard = (e: Kreuz): SchichtWahl => schichtWahlFuer(e, 'zeilen');
/** Die Rechnung zum Ergebnis; `null`, wenn keine Schicht gewählt ist oder die Zählungen fehlen. */
export function schichtVon(e: Kreuz): SchichtAnzeige | null {
  const d = e.schicht, z = e.zaehlung; if (!d || !z || !d.stufen.length) return null;
  const zwei = z.tab.length === 2 && z.spalten.length === 2;
  const base = { d, zwei, schichtName: d.spalte };
  if (!zwei) {
    const allgemein = verallgemeinerterCmh(d.stufen.map(s => s.tab));
    return { ...base, wahl: null, tafeln: [], mh: null, allgemein, gruppeName: e.gruppen, ereignisName: e.gezaehlt, gruppe1: '', gruppe2: '', ereignis: '', keinEreignis: '' };
  }
  const wahl = d.wahl ?? schichtWahlStandard(e), rw: RisikoWahl = { ...wahl, erwuenscht: null };
  const tafeln = d.stufen.map(s => risikoTafel(s.tab, rw));
  const mh = mantelHaenszel(tafeln, { korrektur: d.korrektur });
  const zl = wahl.gruppe === 'zeilen';
  return { ...base, wahl, tafeln, mh, allgemein: null, gruppeName: zl ? e.gruppen : e.gezaehlt, ereignisName: zl ? e.gezaehlt : e.gruppen,
    gruppe1: (zl ? z.zeilen : z.spalten)[wahl.gruppePos]!, gruppe2: (zl ? z.zeilen : z.spalten)[1 - wahl.gruppePos]!, ereignis: (zl ? z.spalten : z.zeilen)[wahl.ereignisPos]!, keinEreignis: (zl ? z.spalten : z.zeilen)[1 - wahl.ereignisPos]! };
}

const orT = (v: number) => komma(v, 2);
const orKi = (lo: number, hi: number) => ki(komma(lo, 2), komma(hi, 2));
const chiT = (x: number | null) => (x === null ? '-' : komma(x, 2));

/** Welche Schichten (Namen) haben nur einen Fall. */
const einFallNamen = (a: SchichtAnzeige) => (a.mh?.schichtenMitEinemFall ?? []).map(i => a.d.stufen[i]?.name ?? String(i + 1));
function hinweisTexte(a: SchichtAnzeige): string[] {
  if (!a.mh) return [];
  return a.mh.hinweise.map(h => (h === 'schicht-ein-fall' ? mhHinweisText(h, einFallNamen(a)) : mhHinweisText(h)));
}

/** Sätze, APA-Zeile und Marken zum Mantel-Haenszel-Test; `null` ohne Schichtwahl. */
export function schichtSaetze(e: Kreuz): { zusatz: string; vorsicht: string; apa: string; marken: Saetze['marken'] } | null {
  const a = schichtVon(e); if (!a) return null;
  const S = q(a.schichtName), A = q(e.gruppen), B = q(e.gezaehlt);
  if (!a.zwei) {
    const g = a.allgemein;
    if (!g) return { zusatz: T(`Aufgeteilt nach ${S} lässt sich der verallgemeinerte Mantel-Haenszel-Test nicht berechnen (zu wenige Fälle oder leere Zeilen und Spalten).`, `Split by ${S}, the generalized Mantel-Haenszel test cannot be calculated (too few cases or empty rows and columns).`), vorsicht: '', apa: '', marken: [] };
    const sig = g.p < 0.05, txt = `χ²${dfKlammer(String(g.df))} = ${komma(g.chi2)}, p ${pWert(g.p)}`;
    return {
      zusatz: sig
        ? T(`Nach Aufteilung nach ${S} besteht weiterhin ein Zusammenhang zwischen ${A} und ${B} (verallgemeinerter Mantel-Haenszel-Test ${txt}). Ein gemeinsames Odds Ratio gibt es nur bei Tabellen mit zwei mal zwei Feldern.`, `After splitting by ${S}, there is still an association between ${A} and ${B} (generalized Mantel-Haenszel test ${txt}). A common odds ratio exists only for tables with two by two cells.`)
        : T(`Nach Aufteilung nach ${S} zeigt sich kein belegter Zusammenhang zwischen ${A} und ${B} (verallgemeinerter Mantel-Haenszel-Test ${txt}). Das heißt nicht, dass es keinen gibt. Ein gemeinsames Odds Ratio gibt es nur bei Tabellen mit zwei mal zwei Feldern.`, `After splitting by ${S}, the data show no association between ${A} and ${B} (generalized Mantel-Haenszel test ${txt}). That does not mean there is none. A common odds ratio exists only for tables with two by two cells.`),
      vorsicht: '',   // „Ein Zusammenhang ist keine Ursache.“ steht schon bei den Sätzen der Kreuztabelle
      apa: T(`verallgemeinerter Mantel-Haenszel-Test ${txt}`, `generalized Mantel-Haenszel test ${txt}`),
      marken: [{ text: `CMH χ²${dfKlammer(String(g.df))} = ${komma(g.chi2)}`, erklaer: 'chi-quadrat' }, { text: `p ${pWert(g.p)}`, erklaer: 'p-wert' }]
    };
  }
  const mh = a.mh!;
  if (mh.fehler) return { zusatz: T('Mit dieser Schichtvariable lässt sich der Mantel-Haenszel-Test nicht berechnen.', 'The Mantel-Haenszel test cannot be calculated with this stratum variable.'), vorsicht: '', apa: '', marken: [] };
  const g1 = q(a.gruppe1), g2 = q(a.gruppe2), ev = q(a.ereignis), nev = q(a.keinEreignis);
  const korr = mh.cmh.korrigiert ? T('mit Stetigkeitskorrektur', 'with continuity correction') : '';
  const cmhTxt = mh.cmh.chi2 === null ? '' : `Mantel-Haenszel χ²(1) = ${komma(mh.cmh.chi2)}, p ${pWert(mh.cmh.p!)}`;
  const orTxt = mh.orMH ? T(`gemeinsames OR = ${orT(mh.orMH.or)}, ${orKi(mh.orMH.lo, mh.orMH.hi)}`, `common OR = ${orT(mh.orMH.or)}, ${orKi(mh.orMH.lo, mh.orMH.hi)}`) : '';
  const klammer = [cmhTxt, orTxt, korr].filter(Boolean).join('; ');
  const sig = mh.cmh.p !== null && mh.cmh.p < 0.05;
  const kopf = mh.cmh.chi2 === null
    ? T(`Nach Aufteilung nach ${S} lässt sich der Mantel-Haenszel-Test nicht berechnen.`, `Split by ${S}, the Mantel-Haenszel test cannot be calculated.`)
    : sig
      ? T(`Nach Aufteilung nach ${S} besteht weiterhin ein Zusammenhang zwischen ${A} und ${B} (${klammer}).`, `After splitting by ${S}, there is still an association between ${A} and ${B} (${klammer}).`)
      : T(`Nach Aufteilung nach ${S} zeigt sich kein belegter Zusammenhang zwischen ${A} und ${B} (${klammer}). Das heißt nicht, dass es keinen gibt.`, `After splitting by ${S}, the data show no association between ${A} and ${B} (${klammer}). That does not mean there is none.`);
  const richtung = mh.orMH ? T(`Das gemeinsame Odds Ratio ist die Chance für ${ev} statt ${nev} in der Gruppe ${g1} im Vergleich zur Gruppe ${g2}, über die Schichten zusammengefasst.`, `The common odds ratio is the odds of ${ev} rather than ${nev} in the group ${g1} compared with the group ${g2}, summarized across the strata.`) : '';
  const unb = mh.unbereinigt ? T(`Ohne Aufteilung (alle Schichten zusammengezählt) ergäbe sich ein Odds Ratio von ${orT(mh.unbereinigt.or)} (${orKi(mh.unbereinigt.lo, mh.unbereinigt.hi)}).`, `Without splitting (all strata added together) the odds ratio would be ${orT(mh.unbereinigt.or)} (${orKi(mh.unbereinigt.lo, mh.unbereinigt.hi)}).`) : '';
  const ta = mh.tarone, bd = mh.breslowDay;
  const homo = !ta || !bd || ta.p === null ? ''
    : ta.p < 0.05
      ? T(`Die Odds Ratios der Schichten unterscheiden sich allerdings (Breslow-Day-Test mit Tarone-Korrektur χ²${dfKlammer(String(ta.df))} = ${komma(ta.chi2)}, p ${pWert(ta.p)}); das gemeinsame OR fasst sie nur grob zusammen.`, `The odds ratios of the strata do differ, however (Breslow-Day test with Tarone correction χ²${dfKlammer(String(ta.df))} = ${komma(ta.chi2)}, p ${pWert(ta.p)}); the common OR summarizes them only roughly.`) + ' ' + d('Schau dir die Schichten im Bild einzeln an.', 'Sehen Sie sich die Schichten im Bild einzeln an.', 'Look at the strata one by one in the picture.')
      : T(`Der Breslow-Day-Test mit Tarone-Korrektur findet keinen Unterschied der Odds Ratios zwischen den Schichten (χ²${dfKlammer(String(ta.df))} = ${komma(ta.chi2)}, p ${pWert(ta.p)}). Bei wenigen Fällen je Schicht heißt das nicht, dass es keinen gibt.`, `The Breslow-Day test with Tarone correction finds no difference between the odds ratios of the strata (χ²${dfKlammer(String(ta.df))} = ${komma(ta.chi2)}, p ${pWert(ta.p)}). With few cases per stratum that does not mean there is none.`);
  const hin = hinweisTexte(a).filter(h => !(h === mhHinweisText('bd-warnung')));
  const apa = [cmhTxt, orTxt, ta && ta.p !== null ? T(`Breslow-Day-Test (Tarone) χ²${dfKlammer(String(ta.df))} = ${komma(ta.chi2)}, p ${pWert(ta.p)}`, `Breslow-Day test (Tarone) χ²${dfKlammer(String(ta.df))} = ${komma(ta.chi2)}, p ${pWert(ta.p)}`) : ''].filter(Boolean).join('; ');
  return {
    zusatz: [kopf, richtung, unb, homo, ...hin].filter(Boolean).join(' '),
    vorsicht: T('Das gemeinsame Odds Ratio ist nur eine Zusammenfassung; der Homogenitätstest ist bei wenigen Fällen je Schicht schwach.', 'The common odds ratio is only a summary; the homogeneity test is weak with few cases per stratum.'),
    apa,
    marken: [
      ...(mh.cmh.chi2 !== null ? [{ text: `CMH χ²(1) = ${komma(mh.cmh.chi2)}`, erklaer: 'chi-quadrat' }, { text: `p ${pWert(mh.cmh.p!)}`, erklaer: 'p-wert' }] : []),
      ...(mh.orMH ? [{ text: T(`gemeinsames OR = ${orT(mh.orMH.or)}`, `common OR = ${orT(mh.orMH.or)}`), erklaer: 'odds-ratio' }] : []),
      ...(mh.hinweise.includes('bd-warnung') ? [{ text: T('Odds Ratios der Schichten unterscheiden sich', 'Odds ratios of the strata differ'), erklaer: 'odds-ratio', hinweis: true }] : [])
    ]
  };
}

/** Hängt den Mantel-Haenszel-Test an die Sätze der Kreuztabelle (ohne Schichtwahl bleibt alles, wie es ist). */
export function mitSchicht(st: Saetze, e: Kreuz): Saetze {
  const m = schichtSaetze(e); if (!m) return st;
  return { ...st, zusatz: `${st.zusatz} ${m.zusatz}`, vorsicht: m.vorsicht ? `${st.vorsicht} ${m.vorsicht}` : st.vorsicht, apa: m.apa ? `${st.apa}; ${m.apa}` : st.apa, marken: [...st.marken, ...m.marken] };
}

/** Daten für das Forest-Bild: je Schicht das Odds Ratio mit Woolf-Intervall (ohne Wert bei einer Nullzelle), dazu das gemeinsame und das unbereinigte Odds Ratio. `null` ohne 2 × 2 × K. */
export function schichtForest(e: Kreuz): { reihen: { name: string; n: number; or: number | null; lo: number | null; hi: number | null }[]; gemeinsam: { or: number; lo: number; hi: number } | null; unbereinigt: { or: number; lo: number; hi: number } | null } | null {
  const a = schichtVon(e); if (!a?.mh || a.mh.fehler) return null;
  return { reihen: a.d.stufen.map((s, i) => ({ name: s.name, ...a.mh!.schichten[i]! })), gemeinsam: a.mh.orMH, unbereinigt: a.mh.unbereinigt };
}

/** Die Tabellen: Zählungen und Odds Ratio je Schicht (mit gemeinsamem und unbereinigtem OR), die Tests (CMH, Breslow-Day, Tarone) bzw. der verallgemeinerte Test. */
export function tabellenSchicht(e: Kreuz): TableItem[] {
  const a = schichtVon(e); if (!a) return [];
  const titelSchicht = T(`Aufgeteilt nach ${a.schichtName}`, `Split by ${a.schichtName}`);
  if (!a.zwei) {
    const g = a.allgemein;
    return [tabelle('Generalized Cochran-Mantel-Haenszel', titelSchicht, [T('Test', 'Test'), 'χ²', 'df', 'p'],
      [[T('Verallgemeinerter Mantel-Haenszel-Test (allgemeiner Zusammenhang)', 'Generalized Mantel-Haenszel test (general association)'), g ? fx(g.chi2, 2) : '-', g ? fd(g.df) : '-', g ? fp(g.p) : '-']],
      [T('Nach Landis, Heyman und Koch (1978). Ein gemeinsames Odds Ratio gibt es nur bei Tabellen mit zwei mal zwei Feldern; Schichten mit nur einem Fall gehen nicht ein.', 'After Landis, Heyman and Koch (1978). A common odds ratio exists only for tables with two by two cells; strata with only one case are not included.')])];
  }
  const mh = a.mh!; if (mh.fehler) return [];
  const g1 = kurz(a.gruppe1, 20), g2 = kurz(a.gruppe2, 20), ev = kurz(a.ereignis, 20), nev = kurz(a.keinEreignis, 20);
  const kopf = [T('Schicht', 'Stratum'), `${g1} · ${ev}`, `${g1} · ${nev}`, `${g2} · ${ev}`, `${g2} · ${nev}`, 'n', 'OR', T('95 %-KI untere Grenze', '95% CI lower'), T('95 %-KI obere Grenze', '95% CI upper')];
  const nichtSchaetzbar = T('nicht schätzbar', 'not estimable');
  const orZ = (w: { or: number | null; lo: number | null; hi: number | null }): Z[] => (w.or === null ? [nichtSchaetzbar, '-', '-'] : [fx(w.or, 2), fx(w.lo!, 2), fx(w.hi!, 2)]);
  const zeilen: Z[][] = a.tafeln.map((t, i) => [a.d.stufen[i]!.name, fd(t[0]![0]!), fd(t[0]![1]!), fd(t[1]![0]!), fd(t[1]![1]!), fd(mh.schichten[i]!.n), ...orZ(mh.schichten[i]!)]);
  const summe = a.tafeln.reduce((s, t) => [s[0]! + t[0]![0]!, s[1]! + t[0]![1]!, s[2]! + t[1]![0]!, s[3]! + t[1]![1]!], [0, 0, 0, 0]);
  zeilen.push([T('Alle Schichten zusammengezählt (unbereinigt)', 'All strata added together (unadjusted)'), fd(summe[0]!), fd(summe[1]!), fd(summe[2]!), fd(summe[3]!), fd(mh.n), ...(mh.unbereinigt ? orZ(mh.unbereinigt) : [nichtSchaetzbar, '-', '-'])]);
  zeilen.push([T('Gemeinsames OR (Mantel-Haenszel, bereinigt)', 'Common OR (Mantel-Haenszel, adjusted)'), '-', '-', '-', '-', '-', ...(mh.orMH ? orZ(mh.orMH) : [nichtSchaetzbar, '-', '-'])]);
  const fuss = [
    T(`Zeilen: ${a.gruppeName} (Gruppe ${a.gruppe1} gegen ${a.gruppe2}); Ereignis: ${a.ereignisName} = ${a.ereignis}. Odds Ratio je Schicht mit Woolf-Intervall, das gemeinsame mit dem Intervall nach Robins, Breslow und Greenland (1986). Bei einer Nullzelle ist das Odds Ratio der Schicht nicht schätzbar; Statable korrigiert nicht still.`,
      `Rows: ${a.gruppeName} (group ${a.gruppe1} against ${a.gruppe2}); event: ${a.ereignisName} = ${a.ereignis}. Odds ratio per stratum with Woolf interval, the common one with the interval of Robins, Breslow and Greenland (1986). With a zero cell the odds ratio of the stratum is not estimable; Statable does not correct silently.`),
    ...hinweisTexte(a)
  ];
  const t1 = tabelle('Stratified Odds Ratios', titelSchicht, kopf, zeilen, fuss);
  const testZeilen: Z[][] = [];
  if (mh.cmh.chi2 !== null) testZeilen.push([mh.cmh.korrigiert ? T('Mantel-Haenszel (mit Stetigkeitskorrektur)', 'Mantel-Haenszel (with continuity correction)') : T('Mantel-Haenszel (ohne Stetigkeitskorrektur)', 'Mantel-Haenszel (without continuity correction)'), fx(mh.cmh.chi2, 2), fd(1), fp(mh.cmh.p!)]);
  else testZeilen.push([T('Mantel-Haenszel', 'Mantel-Haenszel'), '-', '-', '-']);
  if (mh.breslowDay) testZeilen.push([T('Breslow-Day (Homogenität der Odds Ratios)', 'Breslow-Day (homogeneity of the odds ratios)'), fx(mh.breslowDay.chi2, 2), fd(mh.breslowDay.df), mh.breslowDay.p === null ? '-' : fp(mh.breslowDay.p)]);
  if (mh.tarone) testZeilen.push([T('Breslow-Day mit Tarone-Korrektur', 'Breslow-Day with Tarone correction'), fx(mh.tarone.chi2, 2), fd(mh.tarone.df), mh.tarone.p === null ? '-' : fp(mh.tarone.p)]);
  const fuss2 = [T('Der Mantel-Haenszel-Test prüft, ob das gemeinsame Odds Ratio 1 ist (kein Zusammenhang nach Aufteilung). Die Stetigkeitskorrektur (0,5) zieht Statable nur ab, wenn die Abweichung mindestens 0,5 beträgt (wie R); SPSS zieht sie immer ab. Der Unterschied liegt unter 0,02 in χ².', 'The Mantel-Haenszel test checks whether the common odds ratio is 1 (no association after splitting). Statable subtracts the continuity correction (0.5) only if the deviation is at least 0.5 (as R does); SPSS always subtracts it. The difference is below 0.02 in χ².'),
    T('SPSS zeigt als „Mantel-Haenszel“ den Wert mit Stetigkeitskorrektur (wie hier voreingestellt) und daneben einen Wert „Cochran“. „Cochran“ ist eine eigene Formel (teilt je Schicht durch n statt durch n - 1) und nicht der Mantel-Haenszel-Wert ohne Korrektur; beide liegen nah beieinander.', 'As "Mantel-Haenszel", SPSS shows the value with continuity correction (the default here) and also a value "Cochran". "Cochran" is a separate formula (it divides by n instead of n - 1 in each stratum) and not the Mantel-Haenszel value without correction; the two are close.')];
  return [t1, tabelle('Mantel-Haenszel Tests', T('Mantel-Haenszel-Test und Homogenität', 'Mantel-Haenszel test and homogeneity'), [T('Test', 'Test'), 'χ²', 'df', 'p'], testZeilen, fuss2)];
}
