/**
 * Sätze unter der Tabelle „Tabelle zusammenstellen“ (Später, Welle S-C, Teil 1): der Fuß (was die Zahlen bedeuten, was fehlt, was auffiel) und die Hilfe (wie man sie liest).
 * Jeder Satz steht ganz da, je Fall ein eigener (kein Wort wird eingesetzt, das übersetzt werden müsste); Zahlen und Namen setzen wir ein. Nie NaN.
 * ⚠ Satzvorlagen von der Statistik-Fachperson abzunehmen (Fachblatt 1.4 bis 1.7).
 */
import { L, Lp, d } from './sitzung.svelte';
import { komma } from './ergebnis';
import { proz, zitat } from '../i18n/profil';
import type { TabellenErgebnis, TabellenSpec } from './tabellenmodell';

const zahl = (x: number) => (Math.abs(x - Math.round(x)) < 1e-9 ? String(Math.round(x)) : komma(x, 1));
const prozent0 = (anteil: number) => proz(komma(100 * anteil, 0));

export function tabellenSaetze(e: TabellenErgebnis, spec: TabellenSpec): { fuss: string[]; hilfe: string[] } {
  const fuss: string[] = [], hilfe: string[] = [];
  const basis = spec.prozentBasis ?? 'spalte', alle = (spec.fehlend ?? 'gueltig') === 'alle';
  const hatKat = spec.bloecke.some(b => b.art === 'kategorial' || b.art === 'top'), hatMehr = spec.bloecke.some(b => b.art === 'mehrfach');
  const hatMw = spec.bloecke.some(b => b.art === 'metrisch' && (b.kennwerte ?? ['n', 'mw', 'sd', 'median']).includes('mw'));
  const hatTop = spec.bloecke.some(b => b.art === 'top');
  const art = spec.gewicht?.art;

  /* ---------------------------------------------------------------- Fuß: Basis der Prozente */
  if (hatKat) {
    if (basis === 'spalte') {
      fuss.push(alle
        ? L('Prozente innerhalb der Gruppe, bezogen auf alle Fälle der Gruppe; Fälle ohne Antwort stehen in der Zeile „keine Angabe“.', 'Percentages within the group, based on all cases of the group; cases without an answer are in the row "no answer".')
        : L('Prozente innerhalb der Gruppe, gültige Antworten.', 'Percentages within the group, valid answers.'));
    } else if (basis === 'zeile') {
      fuss.push(alle
        ? L('Prozente innerhalb jeder Zeile: Anteil der Gruppen an den Personen mit dieser Antwort, bezogen auf alle Fälle.', 'Percentages within each row: share of the groups among the people with this answer, based on all cases.')
        : L('Prozente innerhalb jeder Zeile: Anteil der Gruppen an den Personen mit dieser Antwort, gültige Antworten.', 'Percentages within each row: share of the groups among the people with this answer, valid answers.'));
      hilfe.push(d('Bei Zeilenprozenten zeigt die Tabelle, wie sich die Personen mit einer Antwort auf die Gruppen verteilen - nicht, wie die Gruppen antworten. Wie die Gruppen antworten, siehst du an den Spaltenprozenten.', 'Bei Zeilenprozenten zeigt die Tabelle, wie sich die Personen mit einer Antwort auf die Gruppen verteilen - nicht, wie die Gruppen antworten. Wie die Gruppen antworten, sehen Sie an den Spaltenprozenten.',
        'With row percentages the table shows how the people with an answer are spread over the groups - not how the groups answer. How the groups answer, you see in the column percentages.'));
    } else {
      fuss.push(alle
        ? L('Prozente aller Fälle der Tabelle, über alle Gruppen.', 'Percentages of all cases in the table, across all groups.')
        : L('Prozente aller gültigen Antworten der Tabelle, über alle Gruppen.', 'Percentages of all valid answers in the table, across all groups.'));
    }
  }
  if (hatMehr) {
    if ((spec.mehrfachBasis ?? 'faelle') === 'antworten') {
      fuss.push(L('Mehrfachantworten: Prozent der Antworten, die Summe je Gruppe ist 100 %.', 'Multiple responses: percent of responses, the sum per group is 100%.'));
      hilfe.push(d('Prozent der Antworten misst auch mit, wie viele Optionen eine Person nennt. Für den Vergleich der Gruppen ist Prozent der Fälle meist besser.', 'Prozent der Antworten misst auch mit, wie viele Optionen eine Person nennt. Für den Vergleich der Gruppen ist Prozent der Fälle meist besser.',
        'Percent of responses also reflects how many options a person names. For comparing groups, percent of cases is usually better.'));
    } else {
      fuss.push(L('Mehrfachantworten: Prozent der Fälle, die Summe je Gruppe kann über 100 % liegen.', 'Multiple responses: percent of cases, the sum per group can be above 100%.'));
      hilfe.push(L('Bei Prozent der Fälle kann die Summe über 100 % liegen, weil eine Person mehrere Optionen nennen kann.', 'With percent of cases the sum can be above 100% because a person can name several options.'));
    }
    if (basis !== 'spalte') hilfe.push(L('Mehrfachantworten werden immer innerhalb der Gruppe in Prozent gesetzt, auch wenn für die übrigen Fragen eine andere Basis gewählt ist.', 'Multiple responses are always shown as a percentage within the group, even if another base is chosen for the other questions.'));
  }

  /* ---------------------------------------------------------------- Fuß: Fälle ohne Gruppe, Gewicht */
  if (e.ohneGruppe > 0) {
    const n = zahl(e.ohneGruppe);
    fuss.push(Lp(e.ohneGruppe, `${n} Fall ohne Gruppenangabe ist nicht in der Tabelle.`, `${n} Fälle ohne Gruppenangabe sind nicht in der Tabelle.`, `${n} case without a group is not in the table.`, `${n} cases without a group are not in the table.`));
  }
  if (spec.gewicht && art === 'umfrage') {
    const summe = e.spalten.find(c => c.schluessel === 'gesamt')?.summeGewichte ?? e.spalten.reduce((a, c) => a + (c.summeGewichte ?? 0), 0);
    fuss.push(L(`Gewichtet mit dem Umfragegewicht ${spec.gewicht.spalte}: Prozente und Mittelwerte sind gewichtet, n sind die Befragten. Summe der Gewichte: ${komma(summe, 1)}.`, `Weighted by the survey weight ${spec.gewicht.spalte}: percentages and means are weighted, n is the number of respondents. Sum of the weights: ${komma(summe, 1)}.`));
    hilfe.push(L('SPSS-Tabellen (Custom Tables) können je nach Einstellung die Gewichte der einzelnen Fälle zuerst auf ganze Zahlen runden; Statable rundet nie.', 'SPSS tables (Custom Tables) can, depending on the setting, first round the weights of the individual cases to whole numbers; Statable never rounds.'));
  } else if (spec.gewicht && art === 'haeufigkeit') {
    fuss.push(L(`Gewichtet mit dem Fallgewicht ${spec.gewicht.spalte} (Häufigkeitsgewicht): n ist die Summe der Gewichte.`, `Weighted by the case weight ${spec.gewicht.spalte} (frequency weight): n is the sum of the weights.`));
    hilfe.push(L('SPSS-Tabellen (Custom Tables) können je nach Einstellung die Gewichte der einzelnen Fälle zuerst auf ganze Zahlen runden; Statable rundet nie.', 'SPSS tables (Custom Tables) can, depending on the setting, first round the weights of the individual cases to whole numbers; Statable never rounds.'));
  }

  /* ---------------------------------------------------------------- Fuß: was auffiel */
  const gruppe = (schluessel: string) => e.spalten.find(c => c.schluessel === schluessel)?.label ?? schluessel;
  for (const h of e.hinweise) {
    if (h.art === 'vieleGruppen') {
      fuss.push(L(`Die Tabelle hat ${h.n} Gruppen und wird breit; weniger Gruppen (zum Beispiel zusammengefasst) lesen sich leichter.`, `The table has ${h.n} groups and becomes wide; fewer groups (for example combined) are easier to read.`));
    } else if (h.art === 'kleineGruppe') {
      fuss.push(L(`Die Gruppe ${zitat(gruppe(h.gruppe))} ist eine kleine Gruppe (n = ${zahl(h.n)}): die Prozente sind unsicher.`, `The group ${zitat(gruppe(h.gruppe))} is a small group (n = ${zahl(h.n)}): the percentages are uncertain.`));
    } else {
      const frage = e.bloecke[h.block - 1]?.titel ?? '';
      fuss.push(L(`Bei ${zitat(frage)} gibt es in der Gruppe ${zitat(gruppe(h.gruppe))} viele Fälle ohne Antwort (${prozent0(h.anteil)}): die Zahlen gelten nur für die, die geantwortet haben.`, `For ${zitat(frage)} there are many cases without an answer in the group ${zitat(gruppe(h.gruppe))} (${prozent0(h.anteil)}): the figures apply only to those who answered.`));
    }
  }

  /* ---------------------------------------------------------------- Hilfe */
  if (hatMw) hilfe.push(L('Der Mittelwert setzt gleiche Abstände zwischen den Stufen voraus; die Prozentverteilung zeigt mehr.', 'The mean assumes equal distances between the levels; the percentage distribution shows more.'));
  if (hatTop) hilfe.push(d('Die Richtung der Top-Box hast du gewählt. Statable rät sie nie, denn bei manchen Skalen ist 1 die höchste Zustimmung.', 'Die Richtung der Top-Box haben Sie gewählt. Statable rät sie nie, denn bei manchen Skalen ist 1 die höchste Zustimmung.', 'You chose the direction of the top box. Statable never guesses it, because on some scales 1 is the highest agreement.'));
  hilfe.push(d('Die Tabelle beschreibt nur und enthält keine Signifikanztests. Für einen Vergleich öffnest du mit „Diese Frage genauer prüfen“ die passende Auswertung.', 'Die Tabelle beschreibt nur und enthält keine Signifikanztests. Für einen Vergleich öffnen Sie mit „Diese Frage genauer prüfen“ die passende Auswertung.',
    'The table only describes and contains no significance tests. For a comparison, open the matching analysis with "Check this question more closely".'));
  return { fuss, hilfe };
}
