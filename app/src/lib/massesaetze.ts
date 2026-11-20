/**
 * Sätze, APA-Zeile und Tabelle zur „Stärke des Zusammenhangs“ in der Kreuztabelle (Später, Welle S-B, M5). Zahlen: zusammenhangsmasse.ts (PSPP-Tabellen gelesen, KI und p ergänzt).
 * Regeln (Fachblatt Abschnitt 1, Entscheidungen Opus): ein T und p für alle ordinalen Maße (eine Zeile „Test (ordinale Maße)“); UC mit p aus dem Likelihood-Quotienten-Test;
 * symmetrisches Somers' d ohne Intervall; Lambda = 0 ohne Intervall und Test, dazu der Satz „… das heißt nicht, dass es keinen Zusammenhang gibt“; nie NaN. Sätze nicht kausal.
 * ⚠ Satzvorlagen von der Fachperson abzunehmen.
 */
import type { TableItem } from '../engine/types';
import { L } from './sitzung.svelte';
import { ki, proz, zitat as anfuehrung } from '../i18n/profil';
import { komma, ohneNull, pWert, kurz, unter05, type Kreuz, type Saetze } from './ergebnis';
import { tabelle, fo, fp, fx, type Z } from './mwsaetze';
import { oddsRatio2x2 } from './effektki';
import { masseHinweisText, ORDINAL, type Mass, type MassArt, type MasseErgebnis } from './zusammenhangsmasse';

const T = L;
/** Was am Kreuz-Ergebnis hängt: das gerechnete Ergebnis und welche Maße die Person gewählt hat. */
export interface MasseDaten { ergebnis: MasseErgebnis; arten: MassArt[] }

const ANZEIGE: Record<MassArt, () => string> = {
  tauB: () => 'Kendalls τb', tauC: () => 'Kendalls τc', gamma: () => 'Gamma (γ)', somersD: () => 'Somers\' d', lambda: () => 'Lambda (λ)', uc: () => T('Unsicherheitskoeffizient (UC)', 'Uncertainty coefficient (UC)')
};
const KURZ: Record<MassArt, string> = { tauB: 'τb', tauC: 'τc', gamma: 'γ', somersD: 'd', lambda: 'λ', uc: 'UC' };
/** Reihenfolge der Maße in Tabelle und Satz: erst das, was die Person vorn sieht (ordinal: Tau-b, Tau-c, d, Gamma). */
const REIHE: MassArt[] = ['tauB', 'tauC', 'somersD', 'gamma', 'lambda', 'uc'];

/** Die gewählten Maße (in fester Reihenfolge), wenn das Ergebnis welche hat und die Berechnung gelang. */
export function gewaehlteMasse(e: Kreuz): Mass[] {
  const d = e.masse; if (!d || d.ergebnis.fehler) return [];
  return REIHE.filter(a => d.arten.includes(a)).flatMap(a => d.ergebnis.masse.filter(m => m.art === a));
}
const wertT = (m: Mass) => ohneNull(m.wert, 2);
const kiT = (m: Mass) => (m.kiLo !== null && m.kiHi !== null ? `, ${ki(ohneNull(m.kiLo, 2), ohneNull(m.kiHi, 2))}` : '');
const q = (t: string) => anfuehrung(kurz(t));
const prozentAnteil = (v: number) => proz(komma(v * 100, 0));

/** Die Hinweise, die für die gewählten Maße gelten (PSPP rechnet immer alle; ein perfekter Zusammenhang beim nicht gewählten Maß geht niemanden etwas an). */
function hinweiseFuer(e: Kreuz, ms: Mass[]): ('kleines-n' | 'keine-streuung' | 'lambda-null')[] {
  const h = e.masse?.ergebnis.hinweise ?? [];
  return h.filter(x => x === 'kleines-n' || (x === 'keine-streuung' && ms.some(m => m.keineStreuung)) || (x === 'lambda-null' && ms.some(m => m.art === 'lambda' && m.wert === 0)));
}
/** Der Satz zum Lambda = 0: mit V, dem p des χ²-Tests und beim 2 × 2 dem Odds Ratio. */
function lambdaNullSatz(e: Kreuz): string {
  const z = e.zaehlung, or = z && z.tab.length === 2 && z.spalten.length === 2 ? oddsRatio2x2(z.tab) : null;
  const orT = or ? `, OR = ${komma(or.or)}` : '';
  return `${masseHinweisText('lambda-null').replace(/\.$/, '')} ${T(`(V = ${ohneNull(e.v)}, χ²-Test p ${pWert(e.p)}${orT}).`, `(V = ${ohneNull(e.v)}, χ² test p ${pWert(e.p)}${orT}).`)}`;
}

/** Sätze, APA-Zeile und Marken zu den gewählten Maßen; `null`, wenn keine gewählt oder nicht rechenbar ist. */
export function masseSaetze(e: Kreuz): { zusatz: string; vorsicht: string; apa: string; marken: Saetze['marken'] } | null {
  const d = e.masse; if (!d) return null;
  if (d.ergebnis.fehler) return { zusatz: masseHinweisText('zu-wenig'), vorsicht: '', apa: '', marken: [] };
  const ms = gewaehlteMasse(e); if (!ms.length) return null;
  const A = q(e.gruppen), B = q(e.gezaehlt), erg = d.ergebnis, n = erg.n;
  const teile: string[] = [], apa: string[] = [], marken: Saetze['marken'] = [];
  const pOrd = erg.testOrdinal ? `p ${pWert(erg.testOrdinal.p)}` : '';
  let pGezeigt: boolean = false;
  const hauptOrd = ms.find(m => m.art === 'tauB') ?? ms.find(m => m.art === 'tauC') ?? ms.find(m => m.art === 'gamma') ?? ms.find(m => m.art === 'somersD' && m.richtung === 'symmetrisch');
  if (hauptOrd && erg.testOrdinal) {
    const sig = erg.testOrdinal.p < 0.05, pos = hauptOrd.wert > 0;
    teile.push(sig
      ? (pos ? T(`Je höher die Stufe von ${A}, desto höher meist die Stufe von ${B} (von niedrig nach hoch gelesen, wie in der Tabelle).`, `The higher the level of ${A}, the higher the level of ${B} tends to be (read from low to high, as in the table).`)
        : T(`Je höher die Stufe von ${A}, desto niedriger meist die Stufe von ${B} (von niedrig nach hoch gelesen, wie in der Tabelle).`, `The higher the level of ${A}, the lower the level of ${B} tends to be (read from low to high, as in the table).`))
      : T(`Die Daten zeigen keinen Zusammenhang in der Reihenfolge der Stufen von ${A} und ${B}. Das heißt nicht, dass es keinen gibt.`, `The data show no association in the order of the levels of ${A} and ${B}. That does not mean there is none.`));
  }
  for (const m of ms) {
    const sigP = (m.art === 'lambda' || m.art === 'uc') && m.p !== null ? `, p ${pWert(m.p)}` : '';
    if (ORDINAL.includes(m.art) && m.richtung !== 'zeile' && m.richtung !== 'spalte') {
      const mitP: string = !pGezeigt && pOrd ? `, ${pOrd}` : ''; pGezeigt = pGezeigt || !!mitP;
      const zeile = `${ANZEIGE[m.art]()} = ${wertT(m)}${kiT(m)}${mitP}`;
      apa.push(`${KURZ[m.art]}${m.richtung === 'symmetrisch' ? ' (sym.)' : ''} = ${wertT(m)}${kiT(m)}${mitP}`);
      if (m.art === 'gamma') teile.push(T(`${zeile}. Gamma ignoriert Paare mit gleichem Wert und fällt darum meist höher aus als τb.`, `${zeile}. Gamma ignores pairs with the same value and so usually comes out higher than τb.`));
      else if (m.art === 'tauC') teile.push(T(`${zeile}. τc ist für Tabellen mit ungleich vielen Zeilen und Spalten gebaut.`, `${zeile}. τc is built for tables with unequal numbers of rows and columns.`));
      else if (m.art === 'tauB') teile.push(T(`${zeile}. Bindungen sind eingerechnet; τb erreicht ±1 nur in quadratischen Tabellen.`, `${zeile}. Ties are included; τb reaches ±1 only in square tables.`));
      else teile.push(`${zeile}.`);
      marken.push({ text: `${ANZEIGE[m.art]()} = ${wertT(m)}`, erklaer: 'effektstaerke' });
    } else if (m.art === 'somersD') {
      const mitP: string = !pGezeigt && pOrd ? `, ${pOrd}` : ''; pGezeigt = pGezeigt || !!mitP;
      teile.push(m.richtung === 'zeile' ? T(`Somers' d (${A} abhängig) = ${wertT(m)}${kiT(m)}.`, `Somers' d (${A} dependent) = ${wertT(m)}${kiT(m)}.`) : T(`Somers' d (${B} abhängig) = ${wertT(m)}${kiT(m)}.`, `Somers' d (${B} dependent) = ${wertT(m)}${kiT(m)}.`));
      apa.push(`d (${m.richtung === 'zeile' ? A : B} ${T('abh.', 'dep.')}) = ${wertT(m)}${kiT(m)}${mitP}`);
      marken.push({ text: `Somers' d = ${wertT(m)}`, erklaer: 'effektstaerke' });
    } else if (m.art === 'lambda') {
      const ziel = m.richtung === 'zeile' ? A : B, bekannt = m.richtung === 'zeile' ? B : A;
      if (m.wert === 0 && m.kiLo === null) {
        teile.push(T(`λ (${ziel} abhängig) = ${wertT(m)}.`, `λ (${ziel} dependent) = ${wertT(m)}.`));
        apa.push(`λ (${ziel}) = ${wertT(m)}`);
      } else if (m.richtung === 'symmetrisch') {
        teile.push(T(`λ (symmetrisch) = ${wertT(m)}${kiT(m)}${sigP}.`, `λ (symmetric) = ${wertT(m)}${kiT(m)}${sigP}.`));
        apa.push(`λ (sym.) = ${wertT(m)}${kiT(m)}${sigP}`);
      } else {
        teile.push(T(`Kennt man ${bekannt}, verringern sich die Fehler beim Vorhersagen der häufigsten Antwort von ${ziel} um ${prozentAnteil(m.wert)} (λ = ${wertT(m)}${kiT(m)}${sigP}).`,
          `Knowing ${bekannt}, the errors in predicting the most frequent answer of ${ziel} fall by ${prozentAnteil(m.wert)} (λ = ${wertT(m)}${kiT(m)}${sigP}).`));
        apa.push(`λ (${ziel}) = ${wertT(m)}${kiT(m)}${sigP}`);
      }
      marken.push({ text: `λ ${m.richtung === 'symmetrisch' ? '' : `(${ziel}) `}= ${wertT(m)}`.replace('  ', ' '), erklaer: 'effektstaerke' });
    } else if (m.art === 'uc') {
      const ziel = m.richtung === 'zeile' ? A : B, bekannt = m.richtung === 'zeile' ? B : A;
      const zahlen = `UC = ${wertT(m)}${kiT(m)}${sigP}`;
      if (m.richtung === 'symmetrisch') { teile.push(T(`Unsicherheitskoeffizient (symmetrisch): ${zahlen}.`, `Uncertainty coefficient (symmetric): ${zahlen}.`)); apa.push(`UC (sym.) = ${wertT(m)}${kiT(m)}${sigP}`); }
      else { teile.push(T(`Kennt man ${bekannt}, verringert sich die Unsicherheit (Entropie) über ${ziel} um ${prozentAnteil(m.wert)} (${zahlen}).`, `Knowing ${bekannt}, the uncertainty (entropy) about ${ziel} falls by ${prozentAnteil(m.wert)} (${zahlen}).`)); apa.push(`UC (${ziel}) = ${wertT(m)}${kiT(m)}${sigP}`); }
      marken.push({ text: `UC ${m.richtung === 'symmetrisch' ? '' : `(${ziel}) `}= ${wertT(m)}`.replace('  ', ' '), erklaer: 'effektstaerke' });
    }
  }
  // Hinweise
  const hinweise = hinweiseFuer(e, ms).map(h => (h === 'lambda-null' ? lambdaNullSatz(e) : masseHinweisText(h)));
  if (pOrd && erg.testOrdinal) marken.push({ text: `p ${pWert(erg.testOrdinal.p)}${unter05(erg.testOrdinal.p < 0.05)}`, erklaer: 'p-wert' });
  return {
    zusatz: `${T('Stärke des Zusammenhangs:', 'Strength of the association:')} ${[...teile, ...hinweise].join(' ')}`,
    vorsicht: T('Die Maße beschreiben den Zusammenhang, sie belegen keine Ursache. Ordinale Maße hängen von der Reihenfolge der Stufen ab.', 'The measures describe the association; they do not show a cause. Ordinal measures depend on the order of the levels.'),
    apa: `${apa.join('; ')}; N = ${n}`,
    marken
  };
}

/** Hängt die Stärke des Zusammenhangs an die Sätze der Kreuztabelle (ohne gewählte Maße bleibt alles, wie es ist). */
export function mitMasse(st: Saetze, e: Kreuz): Saetze {
  const m = masseSaetze(e); if (!m) return st;
  return { ...st, zusatz: `${st.zusatz} ${m.zusatz}`, vorsicht: m.vorsicht ? `${st.vorsicht} ${m.vorsicht}` : st.vorsicht, apa: m.apa ? `${st.apa}; ${m.apa}` : st.apa, marken: [...st.marken, ...m.marken] };
}

/** Die Tabelle der Maße: Maß · Wert · 95 %-KI · T · p, dazu eine Zeile „Test (ordinale Maße)“ (leer ohne gewählte Maße oder bei zu wenig besetzten Zeilen und Spalten). */
export function tabellenMasse(e: Kreuz): TableItem[] {
  const d = e.masse; if (!d) return [];
  if (d.ergebnis.fehler) return [tabelle('Association Measures', T('Stärke des Zusammenhangs', 'Strength of the association'), [T('Hinweis', 'Note')], [[masseHinweisText('zu-wenig')]])];
  const ms = gewaehlteMasse(e); if (!ms.length) return [];
  const A = kurz(e.gruppen, 24), B = kurz(e.gezaehlt, 24), erg = d.ergebnis;
  const kopf = [T('Maß', 'Measure'), T('Wert', 'Value'), T('95 %-KI untere Grenze', '95% CI lower'), T('95 %-KI obere Grenze', '95% CI upper'), 'T', 'p'];
  const ord = ms.some(m => ORDINAL.includes(m.art));
  const name = (m: Mass) => `${ANZEIGE[m.art]()}${m.richtung === null ? '' : m.richtung === 'symmetrisch' ? ` (${T('symmetrisch', 'symmetric')})` : ` (${m.richtung === 'zeile' ? A : B} ${T('abhängig', 'dependent')})`}`;
  const bruch = (v: number | null, f: (x: number) => Z): Z => (v === null ? '-' : f(v));
  const zeilen: Z[][] = ms.map(m => {
    const eigenerTest = !ORDINAL.includes(m.art);
    return [name(m), fo(m.wert, 3), bruch(m.kiLo, x => fo(x, 3)), bruch(m.kiHi, x => fo(x, 3)),
      eigenerTest && m.t !== null ? fx(m.t, 2) : '-', eigenerTest ? bruch(m.p, fp) : '-'];
  });
  if (ord && erg.testOrdinal) zeilen.push([T('Test (ordinale Maße)', 'Test (ordinal measures)'), '-', '-', '-', fx(erg.testOrdinal.t, 2), fp(erg.testOrdinal.p)]);
  const fuss: string[] = [
    T(`Tabelle: ${e.gruppen} (Zeilen) mal ${e.gezaehlt} (Spalten), N = ${erg.n}. Bei gerichteten Maßen steht in Klammern die abhängige Variable.`, `Table: ${e.gruppen} (rows) by ${e.gezaehlt} (columns), N = ${erg.n}. For directional measures the dependent variable is given in brackets.`),
    T('Das Intervall nutzt den Standardfehler bei der gefundenen Stärke (Wert ± 1,96 · ASE1, auf den möglichen Bereich begrenzt), der Test den Standardfehler unter „kein Zusammenhang“ (T = Wert/ASE0, p = 2 · Φ(−|T|)). Darum passen Intervall und p-Wert nicht immer genau zusammen.', 'The interval uses the standard error at the strength found (value ± 1.96 · ASE1, limited to the possible range); the test uses the standard error under "no association" (T = value/ASE0, p = 2 · Φ(−|T|)). So interval and p value do not always match exactly.')
  ];
  if (ord) fuss.push(T('Gamma, Tau-b, Tau-c und Somers\' d haben dasselbe T und damit dasselbe p; darum steht der Test nur einmal da. Die Karte Rangkorrelation rechnet das p von τb mit einer anderen, ebenfalls gültigen Varianz; bei starkem Zusammenhang und vielen Bindungen unterscheiden sich beide.', 'Gamma, tau-b, tau-c and Somers\' d share the same T and thus the same p, so the test appears only once. The rank correlation card calculates the p of τb with a different, equally valid variance; with strong association and many ties the two differ.'));
  if (ms.some(m => m.art === 'somersD' && m.richtung === 'symmetrisch')) fuss.push(T('Für das symmetrische Somers\' d gibt es kein Intervall (PSPP liefert keinen Standardfehler; die Näherung von SPSS weicht von der genauen Rechnung ab). Das gerichtete d hat ein Intervall.', 'There is no interval for the symmetric Somers\' d (PSPP gives no standard error; the approximation used by SPSS differs from the exact calculation). The directional d has an interval.'));
  if (ms.some(m => m.art === 'uc')) fuss.push(T('Das p des Unsicherheitskoeffizienten kommt aus dem Likelihood-Quotienten-Test (G²), wie in SPSS; das T daneben gilt nicht für dieses p.', 'The p of the uncertainty coefficient comes from the likelihood ratio test (G²), as in SPSS; the T next to it does not belong to this p.'));
  for (const h of hinweiseFuer(e, ms)) fuss.push(h === 'lambda-null' ? lambdaNullSatz(e) : masseHinweisText(h));
  return [tabelle('Association Measures', T('Stärke des Zusammenhangs', 'Strength of the association'), kopf, zeilen, fuss)];
}
