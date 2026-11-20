/**
 * Risikomaße aus der Kreuztabelle 2 × 2 (Welle 7, M2): Wahl der Rollen, Sätze, APA-Zeile, Tabellen. Zahlen: risiko.ts (JavaScript, gegen R geprüft).
 *
 * Die Person wählt, welche Spalte die Gruppe (Behandlung, Exposition) ist, welche Gruppe verglichen wird und welche Antwort das Ereignis ist; Statable schlägt vor
 * (positivVorschlag, wie bei der Testgüte), nimmt aber nie still an. „Ist das Ereignis erwünscht?“ ist eine Pflichtwahl ohne Vorgabe - ohne sie gibt es kein NNTB/NNTH.
 * Schreibweise der NNT nach Altman (1998): „NNTH 20 bis ∞ bis NNTB 4“ (von der unteren Grenze der Risikodifferenz aus), nie ein Intervall mit negativen Zahlen.
 * Keine Haldane-Korrektur: bei einer Nullzelle sind RR und OR „nicht schätzbar“, die Risikodifferenz mit Newcombe-Intervall geht immer.
 * Fall-Kontroll-Studie (Wahl unter „Weitere Wege“): nur das Odds Ratio. Sätze nicht kausal. ⚠ Satzvorlagen von der Fachperson abzunehmen.
 */
import type { TableItem } from '../engine/types';
import { L } from './sitzung.svelte';
import { ki, proz, zitat as anfuehrung } from '../i18n/profil';
import { komma, ohneNull, kurz, type Kreuz, type Saetze } from './ergebnis';
import { tabelle, fx, fo, type Z } from './mwsaetze';
import { positivVorschlag } from './diagnostik';
import { risikomasse, type Risikomasse, type Nnt } from './risiko';

const T = L;
const q = (t: string) => anfuehrung(kurz(t));

/** Die Wahl der Rollen. `gruppe`: welche Spalte der Tabelle die Gruppe ist ('zeilen' = die Gruppen-Spalte der Frage, 'spalten' = die gezählte Spalte);
 *  `gruppePos`: welcher ihrer zwei Werte die Gruppe ist, deren Risiko verglichen wird (Zeile 1 der Vierfeldertafel, die andere Gruppe ist die Vergleichsgruppe);
 *  `ereignisPos`: welcher Wert der anderen Spalte das Ereignis ist; `erwuenscht`: ist das Ereignis erwünscht (`null` = noch nicht gewählt, Pflicht). */
export interface RisikoWahl { gruppe: 'zeilen' | 'spalten'; gruppePos: 0 | 1; ereignisPos: 0 | 1; erwuenscht: boolean | null }

/** Namen, an denen Statable die Vergleichsgruppe (Referenz) erkennt: Placebo, Kontrolle, Control, „ohne“, „keine“, Standard, usual care. */
const VERGLEICH = /^(placebo|kontroll\w*|control\w*|ohne\b|kein\w*|standard\w*|usual care|treatment as usual|tau\b)/i;
/** Welche von zwei Gruppen ist die Gruppe, deren Risiko verglichen wird? Die andere ist die Vergleichsgruppe: eine mit einem Namen wie Placebo oder Kontrolle, sonst die erste Stufe. Änderbar. */
export function gruppeVorschlag(werte: string[]): 0 | 1 {
  const i = werte.findIndex(w => VERGLEICH.test(w.trim()));
  return (i === 0 ? 1 : i === 1 ? 0 : 1) as 0 | 1;
}
/** Der Vorschlag, wenn `gruppe` die Gruppen nennt: Vergleichsgruppe nach Namen (sonst die erste Stufe), Ereignis wie positivVorschlag. „Erwünscht?“ bleibt offen. */
export function risikoVorschlag(e: Kreuz, gruppe: 'zeilen' | 'spalten'): RisikoWahl {
  const z = e.zaehlung!, g = gruppe === 'zeilen' ? z.zeilen : z.spalten, v = gruppe === 'zeilen' ? z.spalten : z.zeilen;
  return { gruppe, gruppePos: gruppeVorschlag(g), ereignisPos: positivVorschlag(v) as 0 | 1, erwuenscht: null };
}
export function risikoStandard(e: Kreuz): RisikoWahl | null {
  const z = e.zaehlung; if (!z || z.tab.length !== 2 || z.spalten.length !== 2) return null;
  return risikoVorschlag(e, 'zeilen');
}

/** Die Vierfeldertafel [[a, b], [c, d]] aus der Zähltabelle und der Wahl: Zeile 1 = gewählte Gruppe, Spalte 1 = Ereignis. */
export function risikoTafel(tab: number[][], w: RisikoWahl): number[][] {
  const g = w.gruppePos, v = w.ereignisPos;
  return w.gruppe === 'zeilen'
    ? [[tab[g]![v]!, tab[g]![1 - v]!], [tab[1 - g]![v]!, tab[1 - g]![1 - v]!]]
    : [[tab[v]![g]!, tab[1 - v]![g]!], [tab[v]![1 - g]!, tab[1 - v]![1 - g]!]];
}

export interface RisikoAnzeige {
  m: Risikomasse; w: RisikoWahl | null; fall: boolean;
  /** Name der Gruppen-Spalte und Name der Ereignis-Spalte der Rollenwahl */
  gruppeName: string; ereignisName: string;
  /** Anzeigetexte: Gruppe 1, Vergleichsgruppe, Ereignis, die andere Antwort (kein Ereignis) */
  gruppe1: string; gruppe2: string; ereignis: string; keinEreignis: string;
}

/** Die Risikomaße einer 2 × 2-Kreuztabelle; `null`, wenn die Tabelle nicht 2 × 2 ist, keine Wahl getroffen wurde (Kohorte) oder die Tafel nicht rechenbar ist. Bei der Fall-Kontroll-Studie braucht es keine Wahl: das Odds Ratio ist symmetrisch. */
export function risikoVon(e: Kreuz): RisikoAnzeige | null {
  const z = e.zaehlung; if (!z || z.tab.length !== 2 || z.spalten.length !== 2) return null;
  const fall = e.studie === 'fallKontrolle';
  const w = e.risiko ?? null;
  if (!fall && !w) return null;
  // Fall-Kontroll: keine Rollenwahl, das Odds Ratio folgt der Tabelle (Chance für die erste Spalte in der ersten gegen die zweite Zeile)
  const wahl: RisikoWahl = fall ? { gruppe: 'zeilen', gruppePos: 0, ereignisPos: 0, erwuenscht: null } : w!;
  try {
    const tafel = risikoTafel(z.tab, wahl);
    const m = risikomasse(tafel, { design: fall ? 'fallKontrolle' : 'kohorte', ereignisGut: wahl.erwuenscht === true });
    const zl = wahl.gruppe === 'zeilen';
    return { m, w, fall, gruppeName: zl ? e.gruppen : e.gezaehlt, ereignisName: zl ? e.gezaehlt : e.gruppen,
      gruppe1: (zl ? z.zeilen : z.spalten)[wahl.gruppePos]!, gruppe2: (zl ? z.zeilen : z.spalten)[1 - wahl.gruppePos]!, ereignis: (zl ? z.spalten : z.zeilen)[wahl.ereignisPos]!, keinEreignis: (zl ? z.spalten : z.zeilen)[1 - wahl.ereignisPos]! };
  } catch { return null; }
}

const pr = (v: number) => proz(komma(v * 100, 1));
const prKi = (a: { lo: number; hi: number }) => ki(pr(a.lo), pr(a.hi));
const rd3 = (v: number) => (Math.abs(v) < 0.0005 ? ohneNull(Math.abs(v), 3) : ohneNull(v, 3));
const zahlKi = (a: { lo: number; hi: number }) => ki(komma(a.lo), komma(a.hi));
/** NNT-Zahl überall mit einer Stelle (Altman: 6,7; 5,0); ∞ für die offene Seite. */
const nz = (v: number) => (v === Infinity ? '∞' : komma(v, 1));

/** Die NNT mit Intervall in der Schreibweise nach Altman: „NNTB 8 (NNTB 6 bis 20)“ bzw. „NNTB 10 (NNTH 20 bis ∞ bis NNTB 4)“. */
export function nntText(n: Nnt): { wert: string; intervall: string } {
  const iv = n.intervall;
  const intervall = iv.typ === 'durchUnendlich' ? `NNTH ${nz(iv.nnth)} ${T('bis', 'to')} ∞ ${T('bis', 'to')} NNTB ${nz(iv.nntb)}`
    : iv.typ === 'nntb' ? `NNTB ${nz(iv.von)} ${T('bis', 'to')} ${nz(iv.bis)}` : `NNTH ${nz(iv.von)} ${T('bis', 'to')} ${nz(iv.bis)}`;
  return { wert: n.wert === null || n.art === null ? '-' : `${n.art} ${nz(n.wert)}`, intervall };
}

/** Sätze zu den Risikomaßen; wird an die Sätze der Kreuztabelle gehängt. Jede Richtung ist ein eigener, fester Satz. */
function risikoSaetze(a: RisikoAnzeige): { zusatz: string; vorsicht: string; apa: string; marken: Saetze['marken'] } {
  const { m } = a, g1 = q(a.gruppe1), g2 = q(a.gruppe2), ev = q(a.ereignis);
  const or = m.or, orT = or ? T(`Odds Ratio = ${komma(or.wert)}, ${zahlKi(or)}`, `Odds ratio = ${komma(or.wert)}, ${zahlKi(or)}`) : '';
  const orApa = or ? `OR = ${komma(or.wert)}, ${zahlKi(or)}` : '';
  if (a.fall) {
    const zusatz = or
      ? T(`Gelesen als Fall-Kontroll-Studie: Hier ist nur das Odds Ratio zulässig (${orT}): die Chance (Odds) für ${ev} statt ${q(a.keinEreignis)} in ${g1} im Vergleich zu ${g2}. Risiken, Risikodifferenz, relatives Risiko und NNT entfallen, weil sie vom Anteil der Fälle in der Stichprobe abhängen, den die Untersuchung selbst festlegt.`,
        `Read as a case-control study: only the odds ratio is permissible here (${orT}): the odds of ${ev} rather than ${q(a.keinEreignis)} in ${g1} compared with ${g2}. Risks, risk difference, relative risk and NNT do not apply because they depend on the share of cases in the sample, which the study itself sets.`)
      : T('Gelesen als Fall-Kontroll-Studie: Hier ist nur das Odds Ratio zulässig. Es ist nicht schätzbar (Nullzelle).', 'Read as a case-control study: only the odds ratio is permissible here. It is not estimable (zero cell).');
    return { zusatz, vorsicht: '', apa: orApa || T('OR nicht schätzbar (Nullzelle)', 'OR not estimable (zero cell)'),
      marken: or ? [{ text: `Odds Ratio = ${komma(or.wert)}`, erklaer: 'odds-ratio' }] : [{ text: T('Odds Ratio nicht schätzbar (Nullzelle)', 'Odds ratio not estimable (zero cell)'), erklaer: 'odds-ratio', hinweis: true }] };
  }
  const r1 = m.r1!, r2 = m.r2!, rd = m.rd!, rr = m.rr, nnt = m.nnt;
  const kopf = T(`Gelesen als Vergleich zweier Gruppen (Gruppe: ${q(a.gruppeName)}, verglichen werden ${g1} und ${g2}; Ereignis: ${q(a.ereignisName)} = ${ev}):`,
    `Read as a comparison of two groups (group: ${q(a.gruppeName)}, comparing ${g1} and ${g2}; event: ${q(a.ereignisName)} = ${ev}):`);
  const risiken = T(`In der Gruppe ${g1} trat ${ev} bei ${pr(r1.wert)} auf (${r1.zaehler} von ${r1.nenner}; ${prKi(r1)}), in der Gruppe ${g2} bei ${pr(r2.wert)} (${r2.zaehler} von ${r2.nenner}; ${prKi(r2)}).`,
    `In the group ${g1}, ${ev} occurred in ${pr(r1.wert)} (${r1.zaehler} of ${r1.nenner}; ${prKi(r1)}), in the group ${g2} in ${pr(r2.wert)} (${r2.zaehler} of ${r2.nenner}; ${prKi(r2)}).`);
  const rdPp = komma(Math.abs(rd.wert) * 100, 1);
  const diff = Math.abs(rd.wert) < 0.0005
    ? T(`Der Unterschied der Risiken (Risikodifferenz) ist praktisch null (RD = ${rd3(rd.wert)}, ${ki(rd3(rd.lo), rd3(rd.hi))}, Intervall nach Newcombe).`, `The difference of the risks (risk difference) is practically zero (RD = ${rd3(rd.wert)}, ${ki(rd3(rd.lo), rd3(rd.hi))}, Newcombe interval).`)
    : rd.wert > 0
      ? T(`Der Unterschied der Risiken (Risikodifferenz) beträgt ${rdPp} Prozentpunkte mehr in ${g1} (RD = ${rd3(rd.wert)}, ${ki(rd3(rd.lo), rd3(rd.hi))}, Intervall nach Newcombe).`, `The difference of the risks (risk difference) is ${rdPp} percentage points more in ${g1} (RD = ${rd3(rd.wert)}, ${ki(rd3(rd.lo), rd3(rd.hi))}, Newcombe interval).`)
      : T(`Der Unterschied der Risiken (Risikodifferenz) beträgt ${rdPp} Prozentpunkte weniger in ${g1} (RD = ${rd3(rd.wert)}, ${ki(rd3(rd.lo), rd3(rd.hi))}, Intervall nach Newcombe).`, `The difference of the risks (risk difference) is ${rdPp} percentage points less in ${g1} (RD = ${rd3(rd.wert)}, ${ki(rd3(rd.lo), rd3(rd.hi))}, Newcombe interval).`);
  const relativ = rr
    ? T(`Das Risiko in ${g1} beträgt das ${komma(rr.wert)}-Fache des Risikos in ${g2} (relatives Risiko RR = ${komma(rr.wert)}, ${zahlKi(rr)}).`, `The risk in ${g1} is ${komma(rr.wert)} times the risk in ${g2} (relative risk RR = ${komma(rr.wert)}, ${zahlKi(rr)}).`)
    : T('Das relative Risiko ist nicht schätzbar (Nullzelle): Statable korrigiert nicht still.', 'The relative risk is not estimable (zero cell): Statable does not correct silently.');
  const odds = or
    ? T(`Das Odds Ratio ist ${komma(or.wert)} (${zahlKi(or)}); es ist kein Risikoverhältnis und weicht bei häufigen Ereignissen vom relativen Risiko ab.`, `The odds ratio is ${komma(or.wert)} (${zahlKi(or)}); it is not a risk ratio and differs from the relative risk when events are common.`)
    : T('Das Odds Ratio ist nicht schätzbar (Nullzelle).', 'The odds ratio is not estimable (zero cell).');
  let nntSatz = '';
  if (!a.w || a.w.erwuenscht === null) nntSatz = T('Für die NNT fehlt die Angabe, ob das Ereignis erwünscht ist.', 'For the NNT, the answer is missing whether the event is desirable.');
  else if (nnt && nnt.wert !== null && nnt.art !== null) {
    const t = nntText(nnt), iv = nnt.intervall;
    const erkl = iv.typ === 'durchUnendlich' ? ' ' + T('Das Intervall reicht durch unendlich, weil die Risikodifferenz auch 0 sein kann.', 'The interval runs through infinity because the risk difference can also be 0.') : '';
    if (nnt.art === 'NNTB') nntSatz = a.w.erwuenscht
      ? T(`Rechnerisch entspricht das einer NNT (${t.wert}; 95 %-KI ${t.intervall}): Bei etwa ${komma(Math.round(nnt.wert), 0)} Personen in ${g1} statt in ${g2} tritt ${ev} ein Mal mehr auf (erwünscht, NNTB).${erkl}`, `In numbers this is an NNT (${t.wert}; 95% CI ${t.intervall}): among about ${komma(Math.round(nnt.wert), 0)} people in ${g1} rather than in ${g2}, ${ev} occurs once more (desirable, NNTB).${erkl}`)
      : T(`Rechnerisch entspricht das einer NNT (${t.wert}; 95 %-KI ${t.intervall}): Bei etwa ${komma(Math.round(nnt.wert), 0)} Personen in ${g1} statt in ${g2} tritt ${ev} ein Mal weniger auf (unerwünscht, NNTB).${erkl}`, `In numbers this is an NNT (${t.wert}; 95% CI ${t.intervall}): among about ${komma(Math.round(nnt.wert), 0)} people in ${g1} rather than in ${g2}, ${ev} occurs once less (undesirable, NNTB).${erkl}`);
    else nntSatz = a.w.erwuenscht
      ? T(`Rechnerisch entspricht das einer NNT (${t.wert}; 95 %-KI ${t.intervall}): Bei etwa ${komma(Math.round(nnt.wert), 0)} Personen in ${g1} statt in ${g2} tritt ${ev} ein Mal weniger auf (erwünscht, NNTH).${erkl}`, `In numbers this is an NNT (${t.wert}; 95% CI ${t.intervall}): among about ${komma(Math.round(nnt.wert), 0)} people in ${g1} rather than in ${g2}, ${ev} occurs once less (desirable, NNTH).${erkl}`)
      : T(`Rechnerisch entspricht das einer NNT (${t.wert}; 95 %-KI ${t.intervall}): Bei etwa ${komma(Math.round(nnt.wert), 0)} Personen in ${g1} statt in ${g2} tritt ${ev} ein Mal mehr auf (unerwünscht, NNTH).${erkl}`, `In numbers this is an NNT (${t.wert}; 95% CI ${t.intervall}): among about ${komma(Math.round(nnt.wert), 0)} people in ${g1} rather than in ${g2}, ${ev} occurs once more (undesirable, NNTH).${erkl}`);
  } else if (nnt) nntSatz = T(`Die Risiken unterscheiden sich nicht (RD = 0): Es gibt keine NNT (${nntText(nnt).intervall}).`, `The risks do not differ (RD = 0): there is no NNT (${nntText(nnt).intervall}).`);
  const nullz = m.nullzelle ? T('Eine Zelle der Tabelle ist leer (Nullzelle).', 'A cell of the table is empty (zero cell).') : '';
  const zusatz = [kopf, risiken, diff, relativ, odds, nntSatz, nullz].filter(Boolean).join(' ');
  const vorsicht = T('Das relative Risiko und die NNT gelten für Kohorten und Experimente; bei einer Fall-Kontroll-Studie ist nur das Odds Ratio zulässig. Die Zahlen beschreiben den Unterschied, belegen aber keine Ursache.', 'The relative risk and the NNT apply to cohorts and experiments; in a case-control study only the odds ratio is permissible. The numbers describe the difference but do not show a cause.');
  const apa = [`${T('Risiko', 'risk')} (${kurz(a.gruppe1, 20)}) = ${ohneNull(r1.wert, 3)}`, `${T('Risiko', 'risk')} (${kurz(a.gruppe2, 20)}) = ${ohneNull(r2.wert, 3)}`,
    `RD = ${rd3(rd.wert)}, ${ki(rd3(rd.lo), rd3(rd.hi))}`, rr ? `RR = ${komma(rr.wert)}, ${zahlKi(rr)}` : T('RR nicht schätzbar (Nullzelle)', 'RR not estimable (zero cell)'), orApa || T('OR nicht schätzbar (Nullzelle)', 'OR not estimable (zero cell)'),
    ...(nnt && nnt.wert !== null && a.w?.erwuenscht !== null && a.w ? [`${nntText(nnt).wert} (${nntText(nnt).intervall})`] : [])].join('; ');
  const marken: Saetze['marken'] = [
    { text: `RD = ${rd3(rd.wert)}`, erklaer: 'risikodifferenz' },
    ...(or ? [{ text: `Odds Ratio = ${komma(or.wert)}`, erklaer: 'odds-ratio' }] : []),
    ...(rr ? [{ text: `RR = ${komma(rr.wert)}`, erklaer: 'relatives-risiko' }] : [{ text: T('RR nicht schätzbar (Nullzelle)', 'RR not estimable (zero cell)'), erklaer: 'relatives-risiko', hinweis: true }]),
    ...(nnt && nnt.wert !== null && a.w?.erwuenscht !== null && a.w ? [{ text: nntText(nnt).wert, erklaer: 'nnt' }] : [])
  ];
  return { zusatz, vorsicht, apa, marken };
}

/** Hängt die Risikomaße an die Sätze der Kreuztabelle (Hinweis: ohne gewählte Rollen und ohne Fall-Kontroll-Wahl bleibt alles, wie es ist). */
export function mitRisiko(st: Saetze, e: Kreuz): Saetze {
  const a = risikoVon(e); if (!a) return st;
  const r = risikoSaetze(a);
  return { ...st, zusatz: `${st.zusatz} ${r.zusatz}`, vorsicht: r.vorsicht ? `${st.vorsicht} ${r.vorsicht}` : st.vorsicht, apa: `${st.apa}; ${r.apa}`, marken: [...st.marken, ...r.marken] };
}

/** Die Tabelle der Risikomaße (leer, solange keine Wahl getroffen ist und bei der Fall-Kontroll-Studie ohne Odds Ratio). */
export function tabellenRisiko(e: Kreuz): TableItem[] {
  const a = risikoVon(e); if (!a) return [];
  const { m } = a;
  const kopf = [T('Maß', 'Measure'), T('Wert', 'Value'), T('95 %-KI untere Grenze', '95% CI lower'), T('95 %-KI obere Grenze', '95% CI upper')];
  const zeile = (bez: string, w: { wert: number; lo: number; hi: number } | null, d = 2, ohne = false): Z[] => [bez, w ? (ohne ? fo(w.wert, d) : fx(w.wert, d)) : T('nicht schätzbar (Nullzelle)', 'not estimable (zero cell)'), w ? (ohne ? fo(w.lo, d) : fx(w.lo, d)) : '-', w ? (ohne ? fo(w.hi, d) : fx(w.hi, d)) : '-'];
  if (a.fall) return [tabelle('Risk Measures', T('Odds Ratio (Fall-Kontroll-Studie)', 'Odds ratio (case-control study)'), kopf, [zeile('Odds Ratio', m.or)],
    [T('Odds Ratio mit Woolf-Intervall (Wald auf ln OR). Bei einer Fall-Kontroll-Studie ist nur das Odds Ratio zulässig; bei einer leeren Zelle ist es nicht schätzbar - Statable korrigiert nicht still.', 'Odds ratio with Woolf interval (Wald on ln OR). In a case-control study only the odds ratio is permissible; with an empty cell it is not estimable - Statable does not correct silently.')])];
  const r1 = m.r1!, r2 = m.r2!, rd = m.rd!;
  const pz = (bez: string, x: { wert: number; lo: number; hi: number; zaehler: number; nenner: number }): Z[] => [`${bez} (${x.zaehler} / ${x.nenner})`, fo(x.wert, 3), fo(x.lo, 3), fo(x.hi, 3)];
  const zeilen: Z[][] = [pz(`${T('Risiko', 'Risk')}: ${a.gruppe1}`, r1), pz(`${T('Risiko', 'Risk')}: ${a.gruppe2}`, r2), zeile(T('Risikodifferenz (RD)', 'Risk difference (RD)'), rd, 3, true),
    zeile(T('Relatives Risiko (RR)', 'Relative risk (RR)'), m.rr), zeile('Odds Ratio (OR)', m.or)];
  const nnt = m.nnt, mitNnt = nnt && a.w && a.w.erwuenscht !== null;
  const fuss = [T(`Gruppe ${a.gruppe1} gegen ${a.gruppe2}; Ereignis: ${a.ereignis}. Risiken mit Wilson-Intervall, Risikodifferenz mit dem Intervall nach Newcombe (Methode 10), relatives Risiko mit dem Log-Intervall nach Katz, Odds Ratio nach Woolf. Bei einer Nullzelle sind RR und OR nicht schätzbar; Statable korrigiert nicht still.`,
    `Group ${a.gruppe1} against ${a.gruppe2}; event: ${a.ereignis}. Risks with Wilson interval, risk difference with the Newcombe interval (method 10), relative risk with the Katz log interval, odds ratio by Woolf. With a zero cell RR and OR are not estimable; Statable does not correct silently.`)];
  if (mitNnt) { const t = nntText(nnt!); fuss.push(T(`NNT nach Altman (1998): ${t.wert}, 95 %-KI ${t.intervall}. NNTB: Zahl der Personen für einen zusätzlichen Nutzen, NNTH: für einen zusätzlichen Schaden.`, `NNT after Altman (1998): ${t.wert}, 95% CI ${t.intervall}. NNTB: number of people for one additional benefit, NNTH: for one additional harm.`)); }
  return [tabelle('Risk Measures', T('Risikomaße', 'Risk measures'), kopf, zeilen, fuss)];
}
