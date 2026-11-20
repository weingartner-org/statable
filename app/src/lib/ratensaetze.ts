/**
 * Sätze zum Raten-Rechner (Später S-F, M4; Fachblatt 3.4). Ganze Sätze je Fall (keine Endungs-Weichen), Zahlen über das Sprachprofil (komma, pWert), Anrede über d().
 * Die Sätze „Rate ≠ Risiko“ und „Poisson-Streuung“ stehen IMMER dabei. ⚠ Satzvorlagen von der Fachperson abzunehmen.
 */
import { L, Lp, d } from './sitzung.svelte';
import { ganzZahl, dez } from '../i18n/profil';
import { komma, pWert } from './ergebnis';
import { PERSONENZEIT_FAKTOREN, type RatenErgebnis, type RatenGruppe, type RatenVergleich, type Zeiteinheit } from './raten';

/** Eine Rate oder Differenz mit etwa drei gültigen Stellen. */
export function ratenZahl(v: number): string {
  if (!Number.isFinite(v)) return '-';
  if (v === 0) return '0';
  const a = Math.abs(v);
  return komma(v, a >= 100 ? 0 : a >= 1 ? 1 : a >= 0.1 ? 2 : 3);
}
/** Ein Verhältnis mit zwei Nachkommastellen, 0 als „0“. */
export const verhaeltnisZahl = (v: number): string => (v === 0 ? '0' : komma(v, 2));
/** Personenjahre oder der Maßstab: ganze Zahlen vierstellig ohne Trenner, sonst mit Tausendertrennung; Dezimalzahlen mit zwei bis einer Stelle. */
export function jahreZahl(v: number): string {
  if (!Number.isFinite(v)) return '-';
  if (Number.isInteger(v)) return v < 10000 ? String(v) : ganzZahl(v);
  return komma(v, v >= 100 ? 1 : 2);
}
const niveauText = (niveau: number) => dez(String(Math.round(niveau * 1000) / 10));

/** Ein Satz je Gruppe: Ereignisse, Personenjahre, Rate mit exaktem Intervall. */
function gruppenSatz(g: RatenGruppe, je: number, niveau: number): string {
  const N = niveauText(niveau), n = g.name, x = g.ereignisse, T = jahreZahl(g.personenjahre), eins = g.personenjahre === 1, J = jahreZahl(je);
  const r = ratenZahl(g.rate), lo = ratenZahl(g.unten), hi = ratenZahl(g.oben);
  if (x === 0) {
    return Lp(g.personenjahre, `In der Gruppe ${n} trat in ${T} Personenjahr kein Ereignis auf: 0 je ${J} Personenjahre (exaktes ${N}-%-Intervall 0 bis ${hi}).`, `In der Gruppe ${n} trat in ${T} Personenjahren kein Ereignis auf: 0 je ${J} Personenjahre (exaktes ${N}-%-Intervall 0 bis ${hi}).`,
      `In group ${n} no event occurred in ${T} person-year: 0 per ${J} person-years (exact ${N}% interval 0 to ${hi}).`, `In group ${n} no event occurred in ${T} person-years: 0 per ${J} person-years (exact ${N}% interval 0 to ${hi}).`);
  }
  if (eins) {
    return Lp(x, `In der Gruppe ${n} trat ${x} Ereignis in ${T} Personenjahr auf: ${r} je ${J} Personenjahre (exaktes ${N}-%-Intervall ${lo} bis ${hi}).`, `In der Gruppe ${n} traten ${x} Ereignisse in ${T} Personenjahr auf: ${r} je ${J} Personenjahre (exaktes ${N}-%-Intervall ${lo} bis ${hi}).`,
      `In group ${n} ${x} event occurred in ${T} person-year: ${r} per ${J} person-years (exact ${N}% interval ${lo} to ${hi}).`, `In group ${n} ${x} events occurred in ${T} person-year: ${r} per ${J} person-years (exact ${N}% interval ${lo} to ${hi}).`);
  }
  return Lp(x, `In der Gruppe ${n} trat ${x} Ereignis in ${T} Personenjahren auf: ${r} je ${J} Personenjahre (exaktes ${N}-%-Intervall ${lo} bis ${hi}).`, `In der Gruppe ${n} traten ${x} Ereignisse in ${T} Personenjahren auf: ${r} je ${J} Personenjahre (exaktes ${N}-%-Intervall ${lo} bis ${hi}).`,
    `In group ${n} ${x} event occurred in ${T} person-years: ${r} per ${J} person-years (exact ${N}% interval ${lo} to ${hi}).`, `In group ${n} ${x} events occurred in ${T} person-years: ${r} per ${J} person-years (exact ${N}% interval ${lo} to ${hi}).`);
}

/** Der Satz zum Ratenverhältnis einer Gruppe gegen die Vergleichsgruppe und zur Differenz. */
function vergleichsSatz(v: RatenVergleich, e: RatenErgebnis): string {
  const a = e.gruppen[v.gruppe]!.name, b = e.gruppen[v.gegen]!.name, N = niveauText(e.niveau), J = jahreZahl(e.je);
  const diff = ratenZahl(v.diff), dlo = ratenZahl(v.diffUnten), dhi = ratenZahl(v.diffOben);
  if (v.rr === null) {
    const erst = L(`Das Ratenverhältnis (${a} gegen ${b}) ist nicht definiert, weil in der Gruppe ${b} kein Ereignis auftrat (die Rate im Nenner ist 0). Die Differenz betrug ${diff} je ${J} Personenjahre (Näherung: ${dlo} bis ${dhi}).`,
      `The rate ratio (${a} versus ${b}) is not defined because no event occurred in group ${b} (the rate in the denominator is 0). The difference was ${diff} per ${J} person-years (approximation: ${dlo} to ${dhi}).`);
    return v.p === null ? erst : `${erst} ${L(`Der exakte Test auf gleiche Raten ergab p ${pWert(v.p)}.`, `The exact test for equal rates gave p ${pWert(v.p)}.`)}`;
  }
  const rr = verhaeltnisZahl(v.rr), lo = verhaeltnisZahl(v.unten ?? 0), hi = verhaeltnisZahl(v.oben ?? 0), p = pWert(v.p ?? 1);
  return L(`Das Ratenverhältnis (${a} gegen ${b}) betrug ${rr} (exaktes ${N}-%-Intervall ${lo} bis ${hi}; p ${p}). Die Differenz betrug ${diff} je ${J} Personenjahre (Näherung: ${dlo} bis ${dhi}).`,
    `The rate ratio (${a} versus ${b}) was ${rr} (exact ${N}% interval ${lo} to ${hi}; p ${p}). The difference was ${diff} per ${J} person-years (approximation: ${dlo} to ${dhi}).`);
}

/** Eine Rate ist kein Risiko. */
export const ratenRisikoSatz = (): string =>
  L('Eine Rate ist ein Ereignis je Personenzeit, kein Risiko: Sie ist nicht der Anteil der Personen, die das Ereignis hatten.',
    'A rate is events per person-time, not a risk: it is not the proportion of people who had the event.');

/** Die Rechnung setzt Poisson-Streuung voraus. */
export const ratenUeberdispersionSatz = (): string =>
  d('Die Rechnung setzt Poisson-Streuung voraus: Streuen die Zählungen stärker, sind die Intervalle zu schmal. Bei Zähldaten je Zeile nimm die Zähl-Regression mit negativ-binomialer Verteilung (Vorhersage, Weitere Wege).',
    'Die Rechnung setzt Poisson-Streuung voraus: Streuen die Zählungen stärker, sind die Intervalle zu schmal. Bei Zähldaten je Zeile nehmen Sie die Zähl-Regression mit negativ-binomialer Verteilung (Vorhersage, Weitere Wege).',
    'The calculation assumes Poisson variation: if the counts vary more than that, the intervals are too narrow. For count data per row, use the count regression with a negative binomial distribution (Prediction, More options).');

/** Wie die eingegebene Zeit in Personenjahre umgerechnet wurde (nur wenn die Einheit nicht „Jahre“ ist). */
function einheitSatz(einheit: Zeiteinheit): string {
  const f = PERSONENZEIT_FAKTOREN[einheit], F = dez(String(f));
  switch (einheit) {
    case 'tage': return L(`Die Zeit wurde in Tagen eingegeben und mit ${F} Tagen je Jahr in Personenjahre umgerechnet.`, `The time was entered in days and converted to person-years with ${F} days per year.`);
    case 'wochen': return L(`Die Zeit wurde in Wochen eingegeben und mit ${F} Wochen je Jahr in Personenjahre umgerechnet.`, `The time was entered in weeks and converted to person-years with ${F} weeks per year.`);
    case 'monate': return L(`Die Zeit wurde in Monaten eingegeben und mit ${F} Monaten je Jahr in Personenjahre umgerechnet.`, `The time was entered in months and converted to person-years with ${F} months per year.`);
    default: return '';
  }
}

/** Sätze zum Ergebnis: je Gruppe einer, je Vergleich einer, Hinweise, am Ende immer „Rate ≠ Risiko“ und die Poisson-Warnung. */
export function ratenSaetze(e: RatenErgebnis): string[] {
  const aus: string[] = e.gruppen.map(g => gruppenSatz(g, e.je, e.niveau));
  for (const v of e.vergleiche) aus.push(vergleichsSatz(v, e));
  if (e.hinweise.includes('mehrere-vergleiche')) {
    aus.push(L('Mehrere Gruppen werden mit derselben Vergleichsgruppe verglichen; die p-Werte sind nicht für mehrere Vergleiche angepasst.',
      'Several groups are compared with the same reference group; the p values are not adjusted for multiple comparisons.'));
  }
  const ein = einheitSatz(e.einheit);
  if (ein) aus.push(ein);
  aus.push(ratenRisikoSatz(), ratenUeberdispersionSatz());
  return aus;
}

/** Meldung zu einem Fehler der Eingabe (Gruppe 1-basiert, wenn bekannt). */
export function ratenFehlerSatz(code: string, gruppe?: number): string {
  const nr = (gruppe ?? 0) + 1;
  switch (code) {
    case 'zeit': return L(`Die Personenzeit der Gruppe ${nr} muss eine Zahl größer als 0 sein.`, `The person-time of group ${nr} must be a number greater than 0.`);
    case 'ereignisse': return L(`Die Zahl der Ereignisse der Gruppe ${nr} muss eine ganze Zahl von 0 an sein.`, `The number of events in group ${nr} must be a whole number from 0 up.`);
    case 'gruppen': return L('Es werden eine bis zwölf Gruppen gebraucht.', 'One to twelve groups are needed.');
    case 'einheit': return L('Die Zeiteinheit ist unbekannt.', 'The time unit is unknown.');
    case 'vergleich': return L('Die Vergleichsgruppe gibt es nicht.', 'The reference group does not exist.');
    case 'je': return L('Der Maßstab muss eine Zahl größer als 0 sein.', 'The scale must be a number greater than 0.');
    default: return L('Das Niveau des Intervalls muss zwischen 0 und 1 liegen.', 'The level of the interval must be between 0 and 1.');
  }
}
