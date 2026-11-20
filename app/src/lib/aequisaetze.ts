/**
 * Sätze und Tabellen zum Äquivalenztest (G15) und zum Reliable Change Index (G16); Zahlen: tost.ts, rci.ts, Wahl und Speicherform: aequirci.ts.
 * Die Tabellen sind echte Tabellen (TableItem) wie die PSPP-Tabellen (Blatt, Bericht, Word, PDF, Excel) und werden bei jedem Aufruf neu gebaut (Sprache).
 * Sätze nach dem Fachblatt (docs/fachblaetter/WELLE2-PSYCHOLOGIE.md, Paket D): „Ein Unterschied größer als ±… lässt sich ausschließen …“ bzw. „Gleichwertigkeit lässt sich nicht zeigen.“;
 * nie „kein Unterschied“ aus einem nicht signifikanten Test. RCI: kein Cut-off, die Quelle der Reliabilität steht im Ergebnis.
 * ⚠ Satzvorlagen von der Fachperson abzunehmen.
 */
import type { TableItem } from '../engine/types';
import { L } from './sitzung.svelte';
import { iv, zitat as anfuehrung } from '../i18n/profil';
import { komma, ohneNull, pWert, kurz } from './ergebnis';
import { tabelle, fx, fp, fd, type Z } from './mwsaetze';
import { RCI_GRENZE, einordnung } from './rci';
import { TOST_ALPHA } from './tost';
import type { TostAnzeige, RciAnzeige } from './aequirci';

const T = L;
const q = (t: string) => anfuehrung(kurz(t));
/** Eine Zahl mit so vielen Stellen wie nötig (höchstens vier gültige), z. B. Δ = 0,5 oder 0,125. */
function knapp(v: number): { text: string; stellen: number } {
  const r = Number(v.toPrecision(4)), s = String(r), stellen = s.includes('e') ? 6 : (s.split('.')[1] ?? '').length;
  return { text: komma(r, Math.min(6, stellen)), stellen: Math.min(6, stellen) };
}
const knappZ = (v: number): Z => { const { stellen } = knapp(v); return { t: v.toFixed(Math.min(6, stellen)), n: v }; };
/** Das t des weniger deutlichen der beiden einseitigen Tests (das, dessen p gilt), so gerichtet, dass positive Werte für Gleichwertigkeit sprechen (Fachblatt: „t(38,2) = 2,41“). */
const tGleich = (e: TostAnzeige['e']) => (e.pUnten >= e.pOben ? e.tUnten : -e.tOben);
const dfText = (df: number) => komma(df, Number.isInteger(df) ? 0 : 2);
const ki90 = (lo: string, hi: string) => `${L('90 %-KI', '90% CI')} ${iv(lo, hi)}`;

export interface AequiSaetze { haupt: string; zusatz: string; vorsicht: string; kurz: string }

/* ------------------------------------------------------------ G15 */

export function saetzeTost(t: TostAnzeige, label: (n: string) => string = n => n): AequiSaetze {
  const e = t.e, D = knapp(e.delta).text, sig = e.aequivalent;
  const test = `t(${dfText(e.df)}) = ${komma(tGleich(e))}, p ${pWert(e.pTost)}`;
  const was = q(label(t.abhaengig));
  const s1 = Math.max(knapp(Math.abs(e.differenz)).stellen, 1), lo = komma(e.ki90[0], s1), hi = komma(e.ki90[1], s1), diff = komma(e.differenz, s1);
  const urt = sig
    ? T(`Ein Unterschied größer als ±${D} lässt sich ausschließen, ${test} (TOST).`, `A difference larger than ±${D} can be ruled out, ${test} (TOST).`)
    : T(`Gleichwertigkeit lässt sich nicht zeigen, ${test} (TOST).`, `Equivalence cannot be shown, ${test} (TOST).`);
  const haupt = `${urt} ${T(`Differenz ${diff}, ${ki90(lo, hi)}.`, `Difference ${diff}, ${ki90(lo, hi)}.`)}`;
  const wer = t.gepaart
    ? T(`Verglichen werden ${q(label(t.nachher!))} und ${q(label(t.vorher!))} bei denselben Personen (Differenz = nachher minus vorher)`, `${q(label(t.nachher!))} and ${q(label(t.vorher!))} are compared for the same people (difference = after minus before)`)
    : T(`Verglichen werden die Gruppen ${q(t.a!)} und ${q(t.b!)} bei ${was} (Differenz = ${q(t.a!)} minus ${q(t.b!)}, Test nach Welch)`, `The groups ${q(t.a!)} and ${q(t.b!)} are compared on ${was} (difference = ${q(t.a!)} minus ${q(t.b!)}, Welch test)`);
  const beob = T(`${wer}: beobachtet ${diff}.`, `${wer}: observed ${diff}.`);
  const einseitigText = T(`untere Grenze t(${dfText(e.df)}) = ${komma(e.tUnten)}, p ${pWert(e.pUnten)}; obere Grenze t(${dfText(e.df)}) = ${komma(e.tOben)}, p ${pWert(e.pOben)}`,
    `lower bound t(${dfText(e.df)}) = ${komma(e.tUnten)}, p ${pWert(e.pUnten)}; upper bound t(${dfText(e.df)}) = ${komma(e.tOben)}, p ${pWert(e.pOben)}`);
  const urteil = sig
    ? T(`Das 90 %-Intervall liegt ganz innerhalb von −${D} bis +${D}. Beide einseitigen Tests sind signifikant (${einseitigText}).`,
      `The 90% interval lies entirely within −${D} to +${D}. Both one-sided tests are significant (${einseitigText}).`)
    : T(`Das 90 %-Intervall liegt nicht ganz innerhalb von −${D} bis +${D}. Ein Unterschied größer als ±${D} bleibt möglich; das spricht weder für noch gegen einen Unterschied. Mindestens ein einseitiger Test ist nicht signifikant (${einseitigText}).`,
      `The 90% interval does not lie entirely within −${D} to +${D}. A difference larger than ±${D} remains possible; this speaks neither for nor against a difference. At least one one-sided test is not significant (${einseitigText}).`);
  const dd = komma(e.deltaD), db = komma(e.dBeob);
  const dText = t.gepaart
    ? T(`Die Grenzen ±${D} entsprechen d = ±${dd} (Δ geteilt durch die Standardabweichung der Differenzen, dz); beobachtet dz = ${db}.`, `The bounds ±${D} correspond to d = ±${dd} (Δ divided by the standard deviation of the differences, dz); observed dz = ${db}.`)
    : T(`Die Grenzen ±${D} entsprechen d = ±${dd} (Δ geteilt durch die gemeinsame Standardabweichung beider Gruppen); beobachtet d = ${db}.`, `The bounds ±${D} correspond to d = ±${dd} (Δ divided by the pooled standard deviation of both groups); observed d = ${db}.`);
  const p0 = T(`Zum Vergleich der übliche t-Test gegen 0: t(${dfText(e.df)}) = ${komma(e.tNull)}, p ${pWert(e.pNull)}. Ein nicht signifikanter t-Test zeigt keine Gleichwertigkeit.`,
    `For comparison, the usual t test against 0: t(${dfText(e.df)}) = ${komma(e.tNull)}, p ${pWert(e.pNull)}. A non-significant t test does not show equivalence.`);
  const a = ohneNull(TOST_ALPHA);
  const vorsicht = T(`Die Grenzen ±${D} müssen vor der Auswertung begründet sein; nachträglich angepasste Grenzen machen den Test wertlos (Lakens, 2017). Das Intervall ist 90 % statt 95 %, weil zwei einseitige Tests mit je α = ${a} laufen.`,
    `The bounds ±${D} must be justified before the analysis; bounds adjusted afterwards make the test worthless (Lakens, 2017). The interval is 90% instead of 95% because two one-sided tests run, each with α = ${a}.`);
  return { haupt, zusatz: [beob, urteil, dText, p0].join('\n'), vorsicht, kurz: haupt };
}

/** APA-Zeile des Äquivalenztests: Δ, beide einseitigen t mit df, p des TOST, Differenz mit 90-%-KI. */
export function apaTost(t: TostAnzeige, label: (n: string) => string = n => n): string {
  const e = t.e, s1 = Math.max(knapp(Math.abs(e.differenz)).stellen, 1);
  const df = dfText(e.df), eins = T(`untere Grenze t(${df}) = ${komma(e.tUnten)}, obere Grenze t(${df}) = ${komma(e.tOben)}`, `lower bound t(${df}) = ${komma(e.tUnten)}, upper bound t(${df}) = ${komma(e.tOben)}`);
  return `TOST: Δ = ±${knapp(e.delta).text}, ${eins}, p (TOST) ${pWert(e.pTost)}, ${T('Differenz', 'difference')} = ${komma(e.differenz, s1)}, ${ki90(komma(e.ki90[0], s1), komma(e.ki90[1], s1))}`;
}

export function tabellenTost(t: TostAnzeige, label: (n: string) => string = n => n): TableItem[] {
  const e = t.e, D = knapp(e.delta).text;
  const grenzen = tabelle('Equivalence Test (TOST)', T('Äquivalenztest (TOST)', 'Equivalence test (TOST)'),
    ['', T('Grenze', 'Bound'), 't', 'df', 'p'],
    [[T('Untere Grenze (H0: Differenz ≤ −Δ)', 'Lower bound (H0: difference ≤ −Δ)'), knappZ(-e.delta), fx(e.tUnten), fd(e.df), fp(e.pUnten)],
     [T('Obere Grenze (H0: Differenz ≥ +Δ)', 'Upper bound (H0: difference ≥ +Δ)'), knappZ(e.delta), fx(e.tOben), fd(e.df), fp(e.pOben)],
     [T('TOST (größeres der beiden p)', 'TOST (larger of the two p values)'), '', fx(tGleich(e)), fd(e.df), fp(e.pTost)]],
    [T('Das t der TOST-Zeile ist das t des weniger deutlichen Tests, so gerichtet, dass positive Werte für Gleichwertigkeit sprechen.', 'The t of the TOST row is the t of the less clear test, signed so that positive values speak for equivalence.'),
     e.aequivalent ? T(`Gleichwertigkeit gezeigt: Ein Unterschied größer als ±${D} lässt sich ausschließen (beide p < ${ohneNull(0.05)}).`, `Equivalence shown: a difference larger than ±${D} can be ruled out (both p < ${ohneNull(0.05)}).`)
      : T('Gleichwertigkeit nicht gezeigt: Mindestens ein einseitiger Test ist nicht signifikant.', 'Equivalence not shown: at least one one-sided test is not significant.')]);
  const diff = tabelle('Equivalence Difference', T('Differenz und Grenzen', 'Difference and bounds'),
    ['', T('Differenz', 'Difference'), 'SE', T('90 %-KI unten', '90% CI lower'), T('90 %-KI oben', '90% CI upper'), 'n1', 'n2', 'Δ', T('Δ als d', 'Δ as d'), T('d beobachtet', 'd observed')],
    [[t.gepaart ? `${label(t.nachher!)} − ${label(t.vorher!)}` : `${t.a} − ${t.b}`, fx(e.differenz, 3), fx(e.se, 3), fx(e.ki90[0], 3), fx(e.ki90[1], 3), fd(e.n1), fd(e.n2), knappZ(e.delta), fx(e.deltaD), fx(e.dBeob)]],
    [t.gepaart ? T('Gepaart: t-Test der Differenzen; d = dz (Differenz durch die Standardabweichung der Differenzen).', 'Paired: t test of the differences; d = dz (difference divided by the standard deviation of the differences).')
      : T('Zwei Gruppen: Test nach Welch; d mit der gemeinsamen Standardabweichung (ohne Hedges-Korrektur).', 'Two groups: Welch test; d with the pooled standard deviation (no Hedges correction).')]);
  return [grenzen, diff];
}

/* ------------------------------------------------------------ G16 */

const prozText = (v: number) => `${komma(v * 100, 0)} %`;

/** Woher die Reliabilität stammt - steht im Ergebnis. */
export function rciQuelleText(r: RciAnzeige): string {
  return r.quelle === 'alpha'
    ? T(`Cronbachs Alpha = ${ohneNull(r.r)} aus den ${r.alphaItems} Items der Skala ${q(r.skala ?? '')} bei der ersten Messung (${r.alphaN} Personen mit allen Items); es ersetzt die Retest-Reliabilität`,
      `Cronbach's alpha = ${ohneNull(r.r)} from the ${r.alphaItems} items of the scale ${q(r.skala ?? '')} at the first measurement (${r.alphaN} people with all items); it replaces the retest reliability`)
    : T(`r = ${ohneNull(r.r)}, eingegeben (Retest-Reliabilität, etwa aus dem Testhandbuch)`, `r = ${ohneNull(r.r)}, entered (retest reliability, for example from the test manual)`);
}

export function saetzeRci(r: RciAnzeige, label: (n: string) => string = n => n): AequiSaetze {
  const a = r.anzahl, p = r.anteil, n = r.n;
  const haupt = T(`Reliable Change Index (Jacobson & Truax, 1991): ${a.verbessert} von ${n} Personen (${prozText(p.verbessert)}) verlässlich verbessert, ${a.verschlechtert} (${prozText(p.verschlechtert)}) verlässlich verschlechtert, ${a.unveraendert} (${prozText(p.unveraendert)}) ohne verlässliche Veränderung.`,
    `Reliable Change Index (Jacobson & Truax, 1991): ${a.verbessert} of ${n} people (${prozText(p.verbessert)}) reliably improved, ${a.verschlechtert} (${prozText(p.verschlechtert)}) reliably worsened, ${a.unveraendert} (${prozText(p.unveraendert)}) without reliable change.`);
  const richtung = r.hoheBesser ? T('Hohe Werte gelten als besser.', 'High values count as better.') : T('Hohe Werte gelten als schlechter.', 'High values count as worse.');
  const g = komma(RCI_GRENZE);
  const rechnung = T(`Verlässlich heißt: Die Veränderung ist größer, als der Messfehler erwarten lässt (|RCI| > ${g}). RCI = (nachher − vorher) / S_diff mit S_diff = √2 · SD₁ · √(1 − r) = ${komma(r.sDiff)}; SD₁ = ${komma(r.sdVorher)} ist die Standardabweichung der Werte ${q(label(r.vorher))} (vor der Veränderung), nicht die der Differenzen. ${richtung}`,
    `Reliable means: the change is larger than measurement error would lead us to expect (|RCI| > ${g}). RCI = (after − before) / S_diff with S_diff = √2 · SD₁ · √(1 − r) = ${komma(r.sDiff)}; SD₁ = ${komma(r.sdVorher)} is the standard deviation of ${q(label(r.vorher))} (before the change), not that of the differences. ${richtung}`);
  const quelle = T(`Reliabilität: ${rciQuelleText(r)}.`, `Reliability: ${rciQuelleText(r)}.`);
  const ersatz = r.quelle === 'alpha'
    ? T(' Cronbachs Alpha schätzt die innere Konsistenz, nicht die Stabilität über die Zeit, und fällt meist höher aus als die Retest-Reliabilität; Veränderungen gelten dann früher als verlässlich.',
      " Cronbach's alpha estimates internal consistency, not stability over time, and is usually higher than the retest reliability; changes then count as reliable sooner.")
    : '';
  const vorsicht = T('Der Index sagt nur, dass sich der Wert einer Person stärker verändert hat als der Messfehler erwarten lässt. Ob die Veränderung für die Person bedeutsam ist (klinische Signifikanz), zeigt er nicht; einen Cut-off rechnet Statable nicht.',
    "The index only says that a person's score changed more than measurement error would lead us to expect. It does not show whether the change is meaningful for the person (clinical significance); Statable does not calculate a cut-off.")
    + ersatz + (n < 20 ? T(` Es sind nur ${n} Personen; die Anteile sind dann sehr ungenau.`, ` There are only ${n} people; the proportions are then very imprecise.`) : '');
  return { haupt, zusatz: [quelle, rechnung].join('\n'), vorsicht, kurz: haupt };
}

/** APA-Zeile des RCI: Reliabilität und ihre Quelle, S_diff, Anteile. */
export function apaRci(r: RciAnzeige): string {
  const rel = r.quelle === 'alpha' ? T(`α = ${ohneNull(r.r)} (Cronbachs Alpha, Skala ${q(r.skala ?? '')})`, `α = ${ohneNull(r.r)} (Cronbach's alpha, scale ${q(r.skala ?? '')})`) : T(`r = ${ohneNull(r.r)} (Retest-Reliabilität, eingegeben)`, `r = ${ohneNull(r.r)} (retest reliability, entered)`);
  const a = r.anzahl, p = r.anteil;
  return `RCI: ${rel}, S_diff = ${komma(r.sDiff)}, ${T('verbessert', 'improved')} ${a.verbessert} (${prozText(p.verbessert)}), ${T('unverändert', 'unchanged')} ${a.unveraendert} (${prozText(p.unveraendert)}), ${T('verschlechtert', 'worsened')} ${a.verschlechtert} (${prozText(p.verschlechtert)})`;
}

export function tabellenRci(r: RciAnzeige, label: (n: string) => string = n => n): TableItem[] {
  const fuss = [T(`RCI = (nachher − vorher) / S_diff; S_diff = ${komma(r.sDiff, 3)}, SD₁ = ${komma(r.sdVorher, 3)}, Reliabilität: ${rciQuelleText(r)}. |RCI| > ${komma(RCI_GRENZE)} gilt als verlässliche Veränderung.`,
    `RCI = (after − before) / S_diff; S_diff = ${komma(r.sDiff, 3)}, SD₁ = ${komma(r.sdVorher, 3)}, reliability: ${rciQuelleText(r)}. |RCI| > ${komma(RCI_GRENZE)} counts as reliable change.`)];
  const wort = (e: 'verbessert' | 'unveraendert' | 'verschlechtert') => (e === 'verbessert' ? T('verbessert', 'improved') : e === 'verschlechtert' ? T('verschlechtert', 'worsened') : T('unverändert', 'unchanged'));
  const summe = tabelle('Reliable Change Index', T('Reliable Change Index: Anteile', 'Reliable Change Index: proportions'),
    ['', T('Anzahl', 'Number'), T('Anteil in %', 'Share in %')],
    (['verbessert', 'unveraendert', 'verschlechtert'] as const).map(e => [wort(e), fd(r.anzahl[e]), { t: (r.anteil[e] * 100).toFixed(1), n: r.anteil[e] * 100 }]),
    fuss);
  const gekappt = r.n > r.personen.length;
  const person = tabelle('Reliable Change Index Persons', T('Reliable Change Index: je Person', 'Reliable Change Index: by person'),
    [T('Person', 'Person'), label(r.vorher), label(r.nachher), T('Veränderung', 'Change'), 'RCI', T('Einordnung', 'Classification')],
    r.personen.map(p => [T(`Zeile ${p.zeile}`, `Row ${p.zeile}`), fx(p.vorher), fx(p.nachher), fx(p.nachher - p.vorher), fx(p.rci, 3), wort(einordnung(p.rci, r.hoheBesser))]),
    gekappt ? [T(`Die Tabelle zeigt die ersten ${r.personen.length} von ${r.n} Personen; die Anteile oben gelten für alle.`, `The table shows the first ${r.personen.length} of ${r.n} people; the proportions above apply to everyone.`)] : []);
  return [summe, person];
}

