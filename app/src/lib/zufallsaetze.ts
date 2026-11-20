/**
 * Sätze, APA-Zeilen und Tabellen zu „Ohne Normalverteilung - mit Zufallsverfahren“ (Später, Welle S-B, Teil 6, L5; Rechnung: lib/zufallslauf.ts, lib/permutation.ts, lib/bootstrap.ts).
 * Immer genannt: Verfahren, Zahl der Ziehungen B, Startwert, Art des Intervalls. Bei kleinen Stichproben (n < 30) nennt der Hesterberg-Satz das t-Intervall derselben Zahl.
 * ⚠ Satzvorlagen von der Fachperson abzunehmen.
 */
import type { TableItem } from '../engine/types';
import { L } from './sitzung.svelte';
import { iv, zitat } from '../i18n/profil';
import { komma, ohneNull, pWert, kurz } from './ergebnis';
import { fd, fo, fx, tabelle, type Z } from './mwsaetze';
import { bootstrapHinweise } from './bootstrapsaetze';
import type { ZufallErgebnis, ZufallIv, ZufallPerm } from './zufallslauf';

const T = L;
const q = (t: string) => zitat(kurz(t));
const zahl = (v: number | null, st = 2) => (v === null || !Number.isFinite(v) ? '-' : komma(v, st));
/** Das Intervall als Text mit Klammern; `null`, wenn es nicht berechenbar ist. */
const ivNum = (i: ZufallIv | null, st = 2, ohneNullen = false): string | null => (!i || i.lo === null || i.hi === null ? null : iv(ohneNullen ? ohneNull(i.lo, st) : komma(i.lo, st), ohneNullen ? ohneNull(i.hi, st) : komma(i.hi, st)));
const gz = (n: number) => String(n);

/** Die Zeile „Gerechnet: …“ - Verfahren, Art des Intervalls, B und Startwert, so dass jemand die Rechnung wiederholen kann. Je Fall ein ganzer Satz. */
export function zufallGerechnet(z: ZufallErgebnis): string {
  const bca = z.art === 'bca', med = z.statistik === 'median', B = z.B, S = z.startwert;
  if (z.karte === 'gruppen') return med
    ? (bca ? T(`Permutationstest (Differenz der Mediane) und Bootstrap (BCa-Intervall, je Gruppe getrennt gezogen), B = ${B}, Startwert ${S}`, `permutation test (difference of medians) and bootstrap (BCa interval, drawn separately within each group), B = ${B}, seed ${S}`)
      : T(`Permutationstest (Differenz der Mediane) und Bootstrap (Perzentil-Intervall, je Gruppe getrennt gezogen), B = ${B}, Startwert ${S}`, `permutation test (difference of medians) and bootstrap (percentile interval, drawn separately within each group), B = ${B}, seed ${S}`))
    : (bca ? T(`Permutationstest (Welch-t) und Bootstrap (BCa-Intervall, je Gruppe getrennt gezogen), B = ${B}, Startwert ${S}`, `permutation test (Welch t) and bootstrap (BCa interval, drawn separately within each group), B = ${B}, seed ${S}`)
      : T(`Permutationstest (Welch-t) und Bootstrap (Perzentil-Intervall, je Gruppe getrennt gezogen), B = ${B}, Startwert ${S}`, `permutation test (Welch t) and bootstrap (percentile interval, drawn separately within each group), B = ${B}, seed ${S}`));
  if (z.karte === 'zusammenhang') return bca
    ? T(`Permutationstest für r und Bootstrap (BCa-Intervall, Paare gezogen), B = ${B}, Startwert ${S}`, `permutation test for r and bootstrap (BCa interval, pairs drawn), B = ${B}, seed ${S}`)
    : T(`Permutationstest für r und Bootstrap (Perzentil-Intervall, Paare gezogen), B = ${B}, Startwert ${S}`, `permutation test for r and bootstrap (percentile interval, pairs drawn), B = ${B}, seed ${S}`);
  if (z.karte === 'vorhersage') return bca
    ? T(`Fall-Bootstrap der Koeffizienten (BCa-Intervall), B = ${B}, Startwert ${S}`, `case bootstrap of the coefficients (BCa interval), B = ${B}, seed ${S}`)
    : T(`Fall-Bootstrap der Koeffizienten (Perzentil-Intervall), B = ${B}, Startwert ${S}`, `case bootstrap of the coefficients (percentile interval), B = ${B}, seed ${S}`);
  return med
    ? (bca ? T(`Bootstrap des Medians (BCa-Intervall), B = ${B}, Startwert ${S}`, `bootstrap of the median (BCa interval), B = ${B}, seed ${S}`) : T(`Bootstrap des Medians (Perzentil-Intervall), B = ${B}, Startwert ${S}`, `bootstrap of the median (percentile interval), B = ${B}, seed ${S}`))
    : (bca ? T(`Bootstrap des Mittelwerts (BCa-Intervall), B = ${B}, Startwert ${S}`, `bootstrap of the mean (BCa interval), B = ${B}, seed ${S}`) : T(`Bootstrap des Mittelwerts (Perzentil-Intervall), B = ${B}, Startwert ${S}`, `bootstrap of the mean (percentile interval), B = ${B}, seed ${S}`));
}

function permSatz(p: ZufallPerm): string {
  const exakt = p.modus === 'exakt';
  return exakt
    ? T(`Permutationstest mit ${gz(p.gesamt)} Aufteilungen, exakter p-Wert ${pWert(p.p)}`, `permutation test with ${gz(p.gesamt)} assignments, exact p value ${pWert(p.p)}`)
    : T(`Permutationstest, ${gz(p.gesamt)} Zufallsaufteilungen, p ${pWert(p.p)}`, `permutation test, ${gz(p.gesamt)} random assignments, p ${pWert(p.p)}`);
}
function permSatzKorr(p: ZufallPerm): string {
  return p.modus === 'exakt'
    ? T(`Permutationstest mit ${gz(p.gesamt)} Anordnungen, exakter p-Wert ${pWert(p.p)}`, `permutation test with ${gz(p.gesamt)} arrangements, exact p value ${pWert(p.p)}`)
    : T(`Permutationstest, ${gz(p.gesamt)} Zufallsanordnungen, p ${pWert(p.p)}`, `permutation test, ${gz(p.gesamt)} random arrangements, p ${pWert(p.p)}`);
}
const welchHinweis = (p: ZufallPerm) => (p.welchErsatz ? ' ' + T('Mit weniger als zwei Werten in einer Gruppe ist das Welch-t nicht definiert; Statable nimmt die Differenz der Mittelwerte.', 'With fewer than two values in a group the Welch t is not defined; Statable uses the difference of the means.') : '');

export interface ZufallSaetze { haupt: string; zusatz: string; vorsicht: string; apa: string; hinweise: string[] }

/** Die Hinweise unter einem Intervall: Rand, BCa nicht berechenbar, viele gleiche Ziehungen, ungültige Ziehungen, kleine Stichprobe mit Zahl des t-Intervalls. */
function hinweiseZu(i: ZufallIv, z: ZufallErgebnis, n: number, t: { lo: number; hi: number } | null): string[] {
  const aus = bootstrapHinweise({ art: i.art, wunsch: i.wunsch, ziehungen: z.B, startwert: z.startwert, n, ungueltig: i.ungueltig, warnungen: i.warnungen, ...(t ? { tIntervall: t } : {}) });
  if (i.bcaVerweigert) aus.unshift(T('Bei weniger als 5 Personen lässt sich BCa nicht berechnen (der Jackknife entartet). Es steht das Perzentil-Intervall da.', 'With fewer than 5 people BCa cannot be calculated (the jackknife degenerates). The percentile interval is shown instead.'));
  return aus;
}

export function saetzeZufall(z: ZufallErgebnis, name: (n: string) => string = x => x): ZufallSaetze {
  /** „95 %-Bootstrap-KI [lo; hi], Perzentil/BCa, B Ziehungen, Startwert“ - je Art und je „berechenbar oder nicht“ ein ganzer Satzteil. */
  const bootKurz = (i: ZufallIv | null, ohneNullen = false): string => {
    const ivt = ivNum(i, 2, ohneNullen), bca = (i?.art ?? z.art) === 'bca', B = z.B, S = z.startwert;
    return ivt === null
      ? (bca ? T(`95 %-Bootstrap-KI nicht berechenbar, BCa, ${B} Ziehungen, Startwert ${S}`, `95% bootstrap CI not calculable, BCa, ${B} draws, seed ${S}`) : T(`95 %-Bootstrap-KI nicht berechenbar, Perzentil, ${B} Ziehungen, Startwert ${S}`, `95% bootstrap CI not calculable, percentile, ${B} draws, seed ${S}`))
      : (bca ? T(`95 %-Bootstrap-KI ${ivt}, BCa, ${B} Ziehungen, Startwert ${S}`, `95% bootstrap CI ${ivt}, BCa, ${B} draws, seed ${S}`) : T(`95 %-Bootstrap-KI ${ivt}, Perzentil, ${B} Ziehungen, Startwert ${S}`, `95% bootstrap CI ${ivt}, percentile, ${B} draws, seed ${S}`));
  };
  /** Kurzform für die APA-Zeile: „95 %-Perzentil-Bootstrap-KI [lo; hi] (B Ziehungen, N = n, Startwert)“ bzw. mit BCa. */
  const bootApa = (i: ZufallIv | null, n: number, ohneNullen: boolean): string => {
    const ivt = ivNum(i, 2, ohneNullen) ?? T('nicht berechenbar', 'not calculable'), bca = (i?.art ?? z.art) === 'bca', B = z.B, S = z.startwert;
    return bca ? T(`95 %-BCa-Bootstrap-KI ${ivt} (${B} Ziehungen, N = ${n}, Startwert ${S})`, `95% BCa bootstrap CI ${ivt} (${B} draws, N = ${n}, seed ${S})`)
      : T(`95 %-Perzentil-Bootstrap-KI ${ivt} (${B} Ziehungen, N = ${n}, Startwert ${S})`, `95% percentile bootstrap CI ${ivt} (${B} draws, N = ${n}, seed ${S})`);
  };
  if (z.gruppen) {
    const g = z.gruppen, [a, b] = g.namen.map(x => q(x)) as [string, string], md = z.statistik === 'median';
    const hat = g.perm, sd = g.schaetzer, abs = zahl(Math.abs(sd)), diff = zahl(sd);
    const rest = hat ? permSatz(hat) + '; ' : '', boot = bootKurz(g.boot);
    const haupt = sd === 0
      ? (md ? T(`Die Gruppen ${a} und ${b} liegen im Median gleich hoch (Differenz ${a} − ${b} = ${diff}; ${rest}${boot}, je Gruppe getrennt gezogen).`, `The groups ${a} and ${b} are equally high in the median (difference ${a} − ${b} = ${diff}; ${rest}${boot}, drawn separately within each group).`)
        : T(`Die Gruppen ${a} und ${b} liegen im Mittel gleich hoch (Differenz ${a} − ${b} = ${diff}; ${rest}${boot}, je Gruppe getrennt gezogen).`, `The groups ${a} and ${b} are equally high in the mean (difference ${a} − ${b} = ${diff}; ${rest}${boot}, drawn separately within each group).`))
      : sd > 0
        ? (md ? T(`Die Gruppe ${a} liegt im Median um ${abs} höher als die Gruppe ${b} (Differenz ${a} − ${b} = ${diff}; ${rest}${boot}, je Gruppe getrennt gezogen).`, `The group ${a} is ${abs} higher than the group ${b} in the median (difference ${a} − ${b} = ${diff}; ${rest}${boot}, drawn separately within each group).`)
          : T(`Die Gruppe ${a} liegt im Mittel um ${abs} höher als die Gruppe ${b} (Differenz ${a} − ${b} = ${diff}; ${rest}${boot}, je Gruppe getrennt gezogen).`, `The group ${a} is ${abs} higher than the group ${b} in the mean (difference ${a} − ${b} = ${diff}; ${rest}${boot}, drawn separately within each group).`))
        : (md ? T(`Die Gruppe ${a} liegt im Median um ${abs} niedriger als die Gruppe ${b} (Differenz ${a} − ${b} = ${diff}; ${rest}${boot}, je Gruppe getrennt gezogen).`, `The group ${a} is ${abs} lower than the group ${b} in the median (difference ${a} − ${b} = ${diff}; ${rest}${boot}, drawn separately within each group).`)
          : T(`Die Gruppe ${a} liegt im Mittel um ${abs} niedriger als die Gruppe ${b} (Differenz ${a} − ${b} = ${diff}; ${rest}${boot}, je Gruppe getrennt gezogen).`, `The group ${a} is ${abs} lower than the group ${b} in the mean (difference ${a} − ${b} = ${diff}; ${rest}${boot}, drawn separately within each group).`));
    const zusatz = [
      hat ? T('Der Permutationstest mischt die Gruppenzuordnung der Personen immer wieder neu und zählt, wie oft der Zufall allein einen mindestens so großen Unterschied ergibt. Er prüft, ob die Gruppenzuordnung eine Rolle spielt - nicht nur die Mittelwerte.', 'The permutation test shuffles the group assignment of the people again and again and counts how often chance alone gives a difference at least this large. It tests whether the group assignment matters - not only the means.') + (md ? '' : ' ' + T('Als Prüfgröße dient das Welch-t, damit der Test auch bei ungleicher Streuung und ungleich großen Gruppen das Niveau hält.', 'The test statistic is Welch t so that the test keeps its level even with unequal spread and unequal group sizes.')) + welchHinweis(hat) : '',
      T(`Das Bootstrap-Intervall zieht in jeder Gruppe getrennt neue Stichproben: die Gruppengrößen bleiben in jeder Ziehung gleich (${g.n[0]} und ${g.n[1]}).`, `The bootstrap interval draws new samples separately within each group: the group sizes stay the same in every draw (${g.n[0]} and ${g.n[1]}).`),
      md ? T('Bei diesen Daten springt der Median in Stufen; das Intervall ist grob.', 'With these data the median jumps in steps; the interval is coarse.') : ''
    ].filter(Boolean).join(' ');
    const hinweise = hinweiseZu(g.boot, z, Math.min(...g.n), g.welch);
    return {
      haupt, zusatz, hinweise,
      vorsicht: T('Der einfache Permutationstest setzt voraus, dass die Gruppen unter der Nullhypothese gleich verteilt sind. Er bleibt kein Test auf gleiche Mittelwerte, auch wenn er das Welch-t verwendet. Bei Zufallsaufteilungen ändert sich p mit dem Startwert leicht; „Neu ziehen“ zeigt es.', 'The plain permutation test assumes that the groups are identically distributed under the null hypothesis. It does not become a test of equal means, even with Welch t. With random assignments p changes slightly with the seed; "Draw again" shows it.'),
      apa: (md ? T(`Differenz ${a} − ${b} = ${diff} im Median`, `Difference ${a} − ${b} = ${diff} in the median`) : T(`Differenz ${a} − ${b} = ${diff} im Mittel`, `Difference ${a} − ${b} = ${diff} in the mean`)) + (hat ? ` (${permSatz(hat)})` : '') + '; ' + boot
    };
  }
  if (z.zusammenhang) {
    const c = z.zusammenhang, xs = q(name(c.x)), ys = q(name(c.y));
    if (c.r === null) return { haupt: T('Eine der beiden Spalten hat keine Streuung; die Korrelation ist nicht definiert und es gibt nichts zu ziehen.', 'One of the two columns has no spread; the correlation is not defined and there is nothing to draw.'), zusatz: '', vorsicht: '', apa: '', hinweise: [] };
    const bk = bootKurz(c.boot, true);
    const haupt = c.perm
      ? T(`Der Zusammenhang zwischen ${xs} und ${ys} beträgt r = ${ohneNull(c.r)} (${permSatzKorr(c.perm)}; ${bk}).`, `The relationship between ${xs} and ${ys} is r = ${ohneNull(c.r)} (${permSatzKorr(c.perm)}; ${bk}).`)
      : T(`Der Zusammenhang zwischen ${xs} und ${ys} beträgt r = ${ohneNull(c.r)} (${bk}).`, `The relationship between ${xs} and ${ys} is r = ${ohneNull(c.r)} (${bk}).`);
    const fi = c.fisher ? T(` Das übliche Intervall über die Fisher-z-Umrechnung wäre ${iv(ohneNull(c.fisher.lo), ohneNull(c.fisher.hi))}; es setzt eine gemeinsame Normalverteilung voraus.`, ` The usual interval via the Fisher z transformation would be ${iv(ohneNull(c.fisher.lo), ohneNull(c.fisher.hi))}; it assumes a joint normal distribution.`) : '';
    const zusatz = T('Der Permutationstest ordnet die Werte der einen Spalte immer wieder neu den Werten der anderen zu und zählt, wie oft der Zufall allein ein mindestens so großes r ergibt. Das Bootstrap-Intervall zieht ganze Paare (Fälle) neu.', 'The permutation test assigns the values of one column to the values of the other again and again and counts how often chance alone gives an r at least this large. The bootstrap interval draws whole pairs (cases) anew.') + fi;
    return {
      haupt, zusatz, hinweise: c.boot ? hinweiseZu(c.boot, z, c.n, null) : [],
      vorsicht: T('Der Permutationstest prüft „kein Zusammenhang“ für die Rangordnung der Werte, nicht für die Stärke einer geraden Linie allein. Das BCa-Intervall zeigt die Schiefe der Verteilung von r; bei kleinem n sind beide Intervalle unsicher.', 'The permutation test checks "no relationship" for the ordering of the values, not for the strength of a straight line alone. The BCa interval shows the skewness of the distribution of r; with small n both intervals are uncertain.'),
      apa: `r = ${ohneNull(c.r)}` + (c.perm ? ', ' + permSatzKorr(c.perm) : '') + '; ' + bootApa(c.boot, c.n, true)
    };
  }
  if (z.vorhersage) {
    const v = z.vorhersage, k = v.koeff[0]!;
    const breiter = v.koeff.some(c => c.klassisch && c.boot.lo !== null && c.boot.hi !== null && (c.boot.hi - c.boot.lo) > (c.klassisch.hi - c.klassisch.lo) * 1.1);
    const haupt = v.koeff.length === 1
      ? T(`Bei ${q(k.name)} beträgt der Koeffizient b = ${zahl(k.b)} (${bootKurz(k.boot)}, Fall-Bootstrap).`, `For ${q(k.name)} the coefficient is b = ${zahl(k.b)} (${bootKurz(k.boot)}, case bootstrap).`)
      : z.art === 'bca'
        ? T(`Der Fall-Bootstrap (${z.B} Ziehungen, Startwert ${z.startwert}) gibt für jeden der ${v.koeff.length} Koeffizienten ein 95 %-Intervall (BCa); es steht in der Tabelle.`, `The case bootstrap (${z.B} draws, seed ${z.startwert}) gives a 95% interval (BCa) for each of the ${v.koeff.length} coefficients; it is in the table.`)
        : T(`Der Fall-Bootstrap (${z.B} Ziehungen, Startwert ${z.startwert}) gibt für jeden der ${v.koeff.length} Koeffizienten ein 95 %-Intervall (Perzentil); es steht in der Tabelle.`, `The case bootstrap (${z.B} draws, seed ${z.startwert}) gives a 95% interval (percentile) for each of the ${v.koeff.length} coefficients; it is in the table.`);
    const zusatz = T('Der Fall-Bootstrap zieht ganze Zeilen (Person mit allen Angaben) neu und rechnet das Modell jedes Mal neu; er braucht weder normalverteilte Reste noch gleiche Streuung. Daneben steht das klassische t-Intervall des Modells.', 'The case bootstrap draws whole rows (a person with all answers) anew and recalculates the model each time; it needs neither normally distributed residuals nor equal spread. The classical t interval of the model is shown next to it.')
      + (breiter ? ' ' + T('Bei mindestens einem Koeffizienten ist das Bootstrap-Intervall deutlich breiter als das klassische: Die Streuung der Reste ist vermutlich nicht überall gleich; dem Bootstrap ist hier eher zu trauen.', 'For at least one coefficient the bootstrap interval is clearly wider than the classical one: the spread of the residuals is probably not the same everywhere; the bootstrap is the more trustworthy here.') : '');
    const hinweise = [...new Set(v.koeff.flatMap(c => hinweiseZu(c.boot, z, v.n, c.klassisch && v.koeff.length === 1 ? { lo: c.klassisch.lo, hi: c.klassisch.hi } : null)))];
    return {
      haupt, zusatz, hinweise,
      vorsicht: T('Ziehungen, in denen das Modell nicht berechenbar ist (zum Beispiel eine seltene Gruppe fehlt ganz), zählen nicht mit; ihre Zahl steht im Hinweis. Das Bootstrap-Intervall zeigt keinen Permutationstest; Einzeltests der Koeffizienten per Permutation gibt es in Statable nicht.', 'Draws in which the model cannot be calculated (for example a rare group is missing completely) do not count; their number is given in the note. The bootstrap interval is not a permutation test; Statable has no permutation tests of single coefficients.'),
      apa: (k.boot.art === 'bca'
        ? T(`b = ${zahl(k.b)}, 95 %-BCa-KI ${ivNum(k.boot) ?? '-'} (Fall-Bootstrap, ${z.B} Ziehungen, Startwert ${z.startwert})`, `b = ${zahl(k.b)}, 95% BCa CI ${ivNum(k.boot) ?? '-'} (case bootstrap, ${z.B} draws, seed ${z.startwert})`)
        : T(`b = ${zahl(k.b)}, 95 %-Perzentil-KI ${ivNum(k.boot) ?? '-'} (Fall-Bootstrap, ${z.B} Ziehungen, Startwert ${z.startwert})`, `b = ${zahl(k.b)}, 95% percentile CI ${ivNum(k.boot) ?? '-'} (case bootstrap, ${z.B} draws, seed ${z.startwert})`))
        + (v.koeff.length > 1 ? '; ' + T('weitere Koeffizienten in der Tabelle', 'further coefficients in the table') : '')
    };
  }
  const v = z.verteilung!, s0 = v.spalten[0]!, md = z.statistik === 'median', bk0 = bootKurz(s0.boot), sch = zahl(s0.schaetzer), nsp = v.spalten.length;
  const haupt = nsp === 1
    ? (md ? T(`Der Median von ${q(s0.name)} beträgt ${sch} (${bk0}).`, `The median of ${q(s0.name)} is ${sch} (${bk0}).`) : T(`Der Mittelwert von ${q(s0.name)} beträgt ${sch} (${bk0}).`, `The mean of ${q(s0.name)} is ${sch} (${bk0}).`))
    : md
      ? (z.art === 'bca' ? T(`Der Bootstrap (${z.B} Ziehungen, Startwert ${z.startwert}) gibt für den Median jeder der ${nsp} Spalten ein 95 %-Intervall (BCa); es steht in der Tabelle.`, `The bootstrap (${z.B} draws, seed ${z.startwert}) gives a 95% interval (BCa) for the median of each of the ${nsp} columns; it is in the table.`)
        : T(`Der Bootstrap (${z.B} Ziehungen, Startwert ${z.startwert}) gibt für den Median jeder der ${nsp} Spalten ein 95 %-Intervall (Perzentil); es steht in der Tabelle.`, `The bootstrap (${z.B} draws, seed ${z.startwert}) gives a 95% interval (percentile) for the median of each of the ${nsp} columns; it is in the table.`))
      : (z.art === 'bca' ? T(`Der Bootstrap (${z.B} Ziehungen, Startwert ${z.startwert}) gibt für den Mittelwert jeder der ${nsp} Spalten ein 95 %-Intervall (BCa); es steht in der Tabelle.`, `The bootstrap (${z.B} draws, seed ${z.startwert}) gives a 95% interval (BCa) for the mean of each of the ${nsp} columns; it is in the table.`)
        : T(`Der Bootstrap (${z.B} Ziehungen, Startwert ${z.startwert}) gibt für den Mittelwert jeder der ${nsp} Spalten ein 95 %-Intervall (Perzentil); es steht in der Tabelle.`, `The bootstrap (${z.B} draws, seed ${z.startwert}) gives a 95% interval (percentile) for the mean of each of the ${nsp} columns; it is in the table.`));
  const hinweise = [...new Set(v.spalten.flatMap(c => hinweiseZu(c.boot, z, c.n, c.t)))];
  return {
    haupt, hinweise,
    zusatz: T('Der Bootstrap zieht aus den vorhandenen Fällen immer wieder neue Stichproben (mit Zurücklegen) und nimmt aus der Verteilung der Kennzahl ein Intervall; er braucht keine Normalverteilung.', 'The bootstrap repeatedly draws new samples from the existing cases (with replacement) and takes an interval from the distribution of the statistic; it needs no normal distribution.')
      + (md ? ' ' + T('Bei diesen Daten springt der Median in Stufen; das Intervall ist grob.', 'With these data the median jumps in steps; the interval is coarse.') : '') + (!md && s0.t ? ' ' + T(`Daneben steht das t-Intervall des Mittelwerts ${iv(komma(s0.t.lo), komma(s0.t.hi))}.`, `The t interval of the mean ${iv(komma(s0.t.lo), komma(s0.t.hi))} is shown next to it.`) : ''),
    vorsicht: T('Die Ziehungen ändern sich mit dem Startwert ein wenig; die Grenzen sind darum nur bis auf diesen Zufallsfehler genau. „Neu ziehen“ zeigt ihn.', 'The draws change a little with the seed; the limits are therefore only accurate up to this random error. "Draw again" shows it.'),
    apa: (md ? 'Mdn' : 'M') + ' = ' + sch + ', ' + bootApa(s0.boot, s0.n, false)
  };
}

/** Spaltenkopf der Grenzen des Bootstrap-Intervalls: je Art und Grenze ein ganzer Text. */
const kiGrenze = (z: ZufallErgebnis, unten: boolean) => (z.art === 'bca'
  ? (unten ? T('Bootstrap-KI (BCa) unten', 'Bootstrap CI (BCa) lower') : T('Bootstrap-KI (BCa) oben', 'Bootstrap CI (BCa) upper'))
  : (unten ? T('Bootstrap-KI (Perzentil) unten', 'Bootstrap CI (percentile) lower') : T('Bootstrap-KI (Perzentil) oben', 'Bootstrap CI (percentile) upper')));
const ivZeile = (i: ZufallIv | null, st = 2): Z[] => [i && i.lo !== null ? fx(i.lo, st) : '-', i && i.hi !== null ? fx(i.hi, st) : '-'];

/** Tabellen zum Zufallsverfahren: Bericht, Word, Excel und das Blatt. */
export function tabellenZufall(z: ZufallErgebnis, name: (n: string) => string = x => x): TableItem[] {
  const gerechnet = T('Gerechnet:', 'Calculated:') + ' ' + zufallGerechnet(z) + '. ' + T('Gleiche Daten und gleicher Startwert ergeben dieselben Zahlen; der Zufall von Statable ist nicht der von R, die Ergebnisse stimmen im Rahmen des Zufallsfehlers überein.', 'The same data and the same seed give the same numbers; the random numbers of Statable are not those of R, the results agree within the random error.');
  const aus: TableItem[] = [];
  if (z.gruppen) {
    const g = z.gruppen, md = z.statistik === 'median';
    if (g.perm) {
      const p = g.perm;
      aus.push(tabelle('Permutation Test', T('Permutationstest', 'Permutation test'), [T('Prüfgröße', 'Test statistic'), T('Beobachtet', 'Observed'), p.modus === 'exakt' ? T('Aufteilungen', 'Assignments') : T('Zufallsaufteilungen', 'Random assignments'), T('davon mindestens so extrem', 'at least as extreme'), 'p'],
        [[md ? T('Differenz der Mediane', 'Difference of medians') : 'Welch-t', fx(p.t0, 3), fd(p.gesamt), fd(p.b), fp0(p.p)]],
        [p.modus === 'exakt' ? T('Alle Aufteilungen geprüft: p = Anzahl / Gesamt (die beobachtete Aufteilung ist dabei).', 'All assignments checked: p = count / total (the observed assignment is included).') : T('Zufällige Aufteilungen: p = (Anzahl + 1) / (B + 1), nie 0 (Phipson & Smyth 2010). Zweiseitig: |T*| ≥ |T₀|.', 'Random assignments: p = (count + 1) / (B + 1), never 0 (Phipson & Smyth 2010). Two-sided: |T*| ≥ |T₀|.'), gerechnet]));
    }
    const zeilen: Z[][] = [[kiKopfName(z), fx(g.schaetzer, 2), ...ivZeile(g.boot), g.boot.art === 'bca' ? 'BCa' : T('Perzentil', 'percentile')]];
    if (g.welch) zeilen.push([T('Welch-t-Intervall (zum Vergleich)', 'Welch t interval (for comparison)'), fx(g.schaetzer, 2), fx(g.welch.lo), fx(g.welch.hi), 't']);
    aus.push(tabelle('Bootstrap Groups', T('Bootstrap-Intervall der Differenz', 'Bootstrap interval of the difference'), [T('Intervall', 'Interval'), md ? T('Differenz der Mediane', 'Difference of medians') : T('Differenz der Mittelwerte', 'Difference of means'), T('untere Grenze', 'lower limit'), T('obere Grenze', 'upper limit'), T('Art', 'Type')], zeilen,
      [T(`Gruppen: ${g.namen[0]} und ${g.namen[1]}; n = ${g.n[0]} und ${g.n[1]}; in jeder Ziehung werden die Fälle je Gruppe getrennt gezogen. Differenz = ${g.namen[0]} − ${g.namen[1]}.`, `Groups: ${g.namen[0]} and ${g.namen[1]}; n = ${g.n[0]} and ${g.n[1]}; in every draw the cases are drawn separately within each group. Difference = ${g.namen[0]} − ${g.namen[1]}.`), gerechnet]));
  } else if (z.zusammenhang && z.zusammenhang.r !== null) {
    const c = z.zusammenhang, r = c.r!;
    if (c.perm) aus.push(tabelle('Permutation Test', T('Permutationstest für r', 'Permutation test for r'), ['r', c.perm.modus === 'exakt' ? T('Anordnungen', 'Arrangements') : T('Zufallsanordnungen', 'Random arrangements'), T('davon mindestens so extrem', 'at least as extreme'), 'p'],
      [[fo(r, 3), fd(c.perm.gesamt), fd(c.perm.b), fp0(c.perm.p)]], [T('Die y-Werte werden gegen die x-Werte permutiert; zweiseitig |r*| ≥ |r|. Exakt bis n = 8, darüber Zufallsanordnungen mit p = (Anzahl + 1) / (B + 1).', 'The y values are permuted against the x values; two-sided |r*| ≥ |r|. Exact up to n = 8, above that random arrangements with p = (count + 1) / (B + 1).'), gerechnet]));
    const zeilen: Z[][] = [[kiKopfName(z), fo(r, 3), ...ivZeile(c.boot, 3).map(x => (typeof x === 'string' ? x : { ...x, t: x.t.replace(/^(-?)0\./, '$1.') })), c.boot?.art === 'bca' ? 'BCa' : T('Perzentil', 'percentile')]];
    if (c.fisher) zeilen.push([T('Fisher-z-Intervall (zum Vergleich)', 'Fisher z interval (for comparison)'), fo(r, 3), fo(c.fisher.lo, 3), fo(c.fisher.hi, 3), 'Fisher z']);
    aus.push(tabelle('Bootstrap Correlation', T('Bootstrap-Intervall für r', 'Bootstrap interval for r'), [T('Intervall', 'Interval'), 'r', T('untere Grenze', 'lower limit'), T('obere Grenze', 'upper limit'), T('Art', 'Type')], zeilen,
      [T(`N = ${c.n}. Es werden ganze Paare (Fälle) neu gezogen. Das Fisher-z-Intervall setzt eine gemeinsame Normalverteilung voraus.`, `N = ${c.n}. Whole pairs (cases) are drawn anew. The Fisher z interval assumes a joint normal distribution.`) + (c.pT !== null ? ' ' + T(`p des t-Tests zum Vergleich: ${pWert(c.pT)}.`, `p of the t test for comparison: ${pWert(c.pT)}.`) : ''), gerechnet]));
  } else if (z.vorhersage) {
    const v = z.vorhersage;
    aus.push(tabelle('Bootstrap Coefficients', T('Bootstrap-Intervalle der Koeffizienten', 'Bootstrap intervals of the coefficients'), [T('Vorhersagegröße', 'Predictor'), 'b', kiGrenze(z, true), kiGrenze(z, false), T('t-Intervall unten', 't interval lower'), T('t-Intervall oben', 't interval upper')],
      v.koeff.map(c => [c.name, fx(c.b, 3), ...ivZeile(c.boot, 3), c.klassisch ? fx(c.klassisch.lo, 3) : '-', c.klassisch ? fx(c.klassisch.hi, 3) : '-']),
      [T(`Fall-Bootstrap: Es werden ganze Zeilen neu gezogen (n = ${v.n}); ungültige Ziehungen (Modell nicht berechenbar) zählen nicht. Das t-Intervall ist das klassische des Modells.`, `Case bootstrap: whole rows are drawn anew (n = ${v.n}); invalid draws (model not calculable) do not count. The t interval is the classical one of the model.`), gerechnet]));
  } else if (z.verteilung) {
    const md = z.statistik === 'median';
    aus.push(tabelle('Bootstrap Location', md ? T('Bootstrap-Intervall des Medians', 'Bootstrap interval of the median') : T('Bootstrap-Intervall des Mittelwerts', 'Bootstrap interval of the mean'), [T('Spalte', 'Column'), 'N', md ? 'Mdn' : 'M', kiGrenze(z, true), kiGrenze(z, false), md ? '' : T('t-Intervall unten', 't interval lower'), md ? '' : T('t-Intervall oben', 't interval upper')].filter(x => x !== ''),
      z.verteilung.spalten.map(c => [c.name, fd(c.n), fx(c.schaetzer, 2), ...ivZeile(c.boot), ...(md ? [] : [c.t ? fx(c.t.lo) : '-', c.t ? fx(c.t.hi) : '-'])]),
      [gerechnet]));
  }
  return aus;
}
const kiKopfName = (z: ZufallErgebnis) => (z.art === 'bca' ? T('Bootstrap-Intervall (BCa)', 'Bootstrap interval (BCa)') : T('Bootstrap-Intervall (Perzentil)', 'Bootstrap interval (percentile)'));
/** p wie die übrigen p-Werte: Schreibweise und Dezimalzeichen aus dem Sprachprofil (`pWert`, i18n/profil.ts), ohne das Gleichheitszeichen. */
const fp0 = (p: number): Z => ({ t: pWert(p).replace(/^= /, ''), n: p });

/** Warum das Zufallsverfahren nicht geht (für die Wahl im Blatt): Sätze mit du/Sie. */
export function zufallGrundText(grund: 'umfrage' | 'zu-gross' | 'wenig' | 'keine-zahlen' | 'rangkorr' | 'katmodell' | 'mehrere-gruppen' | 'hier'): string {
  switch (grund) {
    case 'zu-gross': return L('Die Summe der Gewichte ist größer als 100 000. Statable zieht dann nicht aus der erweiterten Menge und rechnet das Zufallsverfahren nicht.', 'The sum of the weights is greater than 100,000. Statable then does not draw from the expanded set and does not calculate the random procedure.');
    case 'wenig': return L('Mit diesen Daten lässt sich das Zufallsverfahren nicht rechnen (zu wenige Werte).', 'The random procedure cannot be calculated with these data (too few values).');
    case 'keine-zahlen': return L('Das Zufallsverfahren braucht Zahlenspalten.', 'The random procedure needs number columns.');
    case 'rangkorr': return L('Der Permutationstest und der Bootstrap gelten hier für die Korrelation nach Pearson. Für Spearman und Kendall gibt es sie nicht.', 'The permutation test and the bootstrap apply here to the Pearson correlation. They do not exist for Spearman and Kendall.');
    case 'katmodell': return L('Der Fall-Bootstrap gilt für die lineare Regression, nicht für die logistische, ordinale, multinomiale und Zähldaten-Regression.', 'The case bootstrap applies to linear regression, not to logistic, ordinal, multinomial and count regression.');
    case 'mehrere-gruppen': return L('Der Permutationstest und der Bootstrap vergleichen genau zwei Gruppen ohne zweite Gruppierung und ohne Kontrollvariable.', 'The permutation test and the bootstrap compare exactly two groups without a second grouping and without a control variable.');
    case 'hier': return L('Mit Blöcken (hierarchische Regression) rechnet Statable den Bootstrap nicht.', 'Statable does not calculate the bootstrap with blocks (hierarchical regression).');
    case 'umfrage': return L('Mit einem Umfragegewicht rechnet Statable das Zufallsverfahren nicht: Ohne den Stichprobenplan ist ein Permutationstest oder Bootstrap mit Gewichten nicht definiert.', 'Statable does not calculate the random procedure with a survey weight: without the sampling design a permutation test or bootstrap with weights is not defined.');
  }
}
