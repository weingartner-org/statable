/**
 * Sätze, APA-Zeilen und Tabellen zur zweifaktoriellen Varianzanalyse (G3) und zur Kovarianzanalyse (G6); Zahlen: anova2.ts.
 * Die Tabellen sind echte Tabellen (TableItem), die Blatt, Bericht, Word, PDF und Excel wie die PSPP-Tabellen zeigen; sie werden bei jedem Aufruf neu gebaut und folgen so der Sprache.
 * Reihenfolge nach dem Fachblatt (docs/fachblaetter/WELLE2-PSYCHOLOGIE.md): bei der Varianzanalyse zuerst die Wechselwirkung, danach die Haupteffekte;
 * einfache Effekte nur bei p(Wechselwirkung) < ,05; bei der Kovarianzanalyse die Gruppen bei gleichem Wert der Kovariate, der Satz zu ungleichen Steigungen wörtlich aus dem Fachblatt.
 * ⚠ Satzvorlagen, die Schwelle „kleine Zelle“ (n < 10) und die Faustregel für ηp² (Cohen: ,01 / ,06 / ,14) von der Fachperson abzunehmen.
 */
import type { TableItem } from '../engine/types';
import { L } from './sitzung.svelte';
import { ki, iv, zitat as anfuehrung } from '../i18n/profil';
import { komma, ohneNull, pWert, kurz, st, eta2Wort, unter05, type Saetze } from './ergebnis';
import { tabelle, fx, fxg, fo, fp, fd, type Z } from './mwsaetze';
import type { Anova2, Ancova, AncovaMehr, Effekt2 } from './anova2';
import { spaltenName } from './medmodsaetze';

const T = L;
/** Das Ergebnis der zweifaktoriellen Varianzanalyse mit den Spalten, aus denen es entstand (für die Sätze). */
export type Anova2E = Anova2 & { yCol: string; aCol: string; bCol: string };
/** Das Ergebnis der Kovarianzanalyse mit den Spalten, aus denen es entstand. */
export type AncovaE = Ancova & { y: string; g: string; x: string };

const q = (t: string) => anfuehrung(kurz(t));
const fText = (ef: Effekt2, dfe: number) => `F(${komma(ef.df, 0)}, ${komma(dfe, 0)}) = ${komma(ef.f)}, p ${pWert(ef.p)}`;
const etaText = (ef: Effekt2) => `ηp² = ${ohneNull(ef.etaP)}, ${ki(ohneNull(ef.etaPLo), ohneNull(ef.etaPHi))}`;
const kiText = (lo: number, hi: number, s: number) => iv(komma(lo, s), komma(hi, s));

/* ------------------------------------------------------------ G3 */

export function saetzeAnova2(e: Anova2E, name: (n: string) => string = spaltenName): Saetze {
  const A = q(name(e.aCol)), B = q(name(e.bCol)), Y = q(name(e.yCol)), dfe = e.fehler.df;
  const sig = e.wechselwirkungBedeutsam;
  const haupt = sig
    ? T(`Der Unterschied zwischen den Gruppen von ${A} hängt von ${B} ab: Die Wechselwirkung ist signifikant (${fText(e.ab, dfe)}, ηp² = ${ohneNull(e.ab.etaP)}).`,
      `The difference between the groups of ${A} depends on ${B}: the interaction is significant (${fText(e.ab, dfe)}, ηp² = ${ohneNull(e.ab.etaP)}).`)
    : T(`Eine Wechselwirkung von ${A} und ${B} belegen die Daten nicht (${fText(e.ab, dfe)}, ηp² = ${ohneNull(e.ab.etaP)}). Die Haupteffekte lassen sich zunächst je für sich lesen.`,
      `The data do not show an interaction of ${A} and ${B} (${fText(e.ab, dfe)}, ηp² = ${ohneNull(e.ab.etaP)}). The main effects can first be read separately.`);

  const sortiert = [...e.zellen].sort((x, y) => y.mittel - x.mittel), hoch = sortiert[0]!, tief = sortiert.at(-1)!;
  const s1 = Math.max(st(hoch.mittel, 1), st(tief.mittel, 1));
  const zelle = (z: { a: string; b: string }) => `${q(z.a)} / ${q(z.b)}`;
  const extrem = komma(hoch.mittel, s1) === komma(tief.mittel, s1)
    ? T(`Alle Zellen haben bei ${Y} im Schnitt fast denselben Wert (${komma(hoch.mittel, s1)}).`, `All cells have almost the same mean on ${Y} (${komma(hoch.mittel, s1)}).`)
    : T(`Den höchsten Mittelwert bei ${Y} hat die Zelle ${zelle(hoch)} (M = ${komma(hoch.mittel, s1)}), den niedrigsten die Zelle ${zelle(tief)} (M = ${komma(tief.mittel, s1)}).`,
      `The highest mean on ${Y} is in the cell ${zelle(hoch)} (M = ${komma(hoch.mittel, s1)}), the lowest in the cell ${zelle(tief)} (M = ${komma(tief.mittel, s1)}).`);

  const haupteffekt = (nm: string, ef: Effekt2) => ef.p < 0.05
    ? T(`${nm}: Die Mittelwerte unterscheiden sich (${fText(ef, dfe)}, ${etaText(ef)}; ${eta2Wort(ef.etaP)}, nach üblicher Faustregel)`,
      `${nm}: the means differ (${fText(ef, dfe)}, ${etaText(ef)}; ${eta2Wort(ef.etaP)}, by a common rule of thumb)`)
    : T(`${nm}: Einen Unterschied der Mittelwerte belegen die Daten nicht (${fText(ef, dfe)}, ${etaText(ef)})`,
      `${nm}: the data do not show a difference between the means (${fText(ef, dfe)}, ${etaText(ef)})`);
  const haupteffekte = sig
    ? T(`Haupteffekte nur mit Vorsicht deuten, wenn die Wechselwirkung bedeutsam ist. ${haupteffekt(A, e.a)}. ${haupteffekt(B, e.b)}.`,
      `Interpret main effects only with caution when the interaction is significant. ${haupteffekt(A, e.a)}. ${haupteffekt(B, e.b)}.`)
    : T(`Haupteffekt von ${haupteffekt(A, e.a)}. Haupteffekt von ${haupteffekt(B, e.b)}.`, `Main effect of ${haupteffekt(A, e.a)}. Main effect of ${haupteffekt(B, e.b)}.`);

  const einf = e.einfachAJeB;
  const einfachText = sig
    ? T(`Einfache Effekte von ${A} je Stufe von ${B} (Holm-Korrektur über die ${einf.length} Stufen): ${einf.map(x => `${q(x.stufe)}: ${x.pHolm < 0.05 ? L('signifikant', 'significant') : L('nicht signifikant', 'not significant')} (F(${komma(x.df1, 0)}, ${komma(x.df2, 0)}) = ${komma(x.f)}, p (Holm) ${pWert(x.pHolm)})`).join('; ')}.`,
      `Simple effects of ${A} at each level of ${B} (Holm adjustment over the ${einf.length} levels): ${einf.map(x => `${q(x.stufe)}: ${x.pHolm < 0.05 ? L('signifikant', 'significant') : L('nicht signifikant', 'not significant')} (F(${komma(x.df1, 0)}, ${komma(x.df2, 0)}) = ${komma(x.f)}, p (Holm) ${pWert(x.pHolm)})`).join('; ')}.`)
    : '';
  // Field-Stufe 2: Effektstärke ω² (ungekürzt kann sie unter 0 liegen; Statable zeigt dann 0) und Vergleiche der Randmittel eines Faktors mit drei und mehr Stufen
  const om = (v: number | undefined) => ohneNull(Math.max(0, v ?? 0), 3);
  const omegaText = e.ab.omega2 === undefined ? ''
    : T(`Effektstärke Omega-Quadrat (ω², korrigiert um die Überschätzung): ${A} ${om(e.a.omega2)}, ${B} ${om(e.b.omega2)}, Wechselwirkung ${om(e.ab.omega2)}; partielles ω²: ${om(e.a.omega2P)}, ${om(e.b.omega2P)} und ${om(e.ab.omega2P)}.`,
      `Effect size omega squared (ω², corrected for overestimation): ${A} ${om(e.a.omega2)}, ${B} ${om(e.b.omega2)}, interaction ${om(e.ab.omega2)}; partial ω²: ${om(e.a.omega2P)}, ${om(e.b.omega2P)} and ${om(e.ab.omega2P)}.`);
  const randSatz = (r: Anova2['randA'], nm: string, anderer: string) => {
    if (!r) return '';
    const deutlich = r.paare.filter(x => x.pTukey < 0.05);
    const liste = deutlich.map(x => `${q(r.stufen[x.i]!.name)} - ${q(r.stufen[x.j]!.name)}: ${komma(x.diff, s1)} (p ${pWert(x.pTukey)})`).join('; ');
    const kern = deutlich.length === 0
      ? T(`Geschätzte Randmittel von ${nm}, gemittelt über ${anderer}: Nach dem Tukey-Test (${r.paare.length} Paare) ist kein Paar von Stufen deutlich verschieden.`, `Estimated marginal means of ${nm}, averaged over ${anderer}: after the Tukey test (${r.paare.length} pairs) no pair of levels differs clearly.`)
      : T(`Geschätzte Randmittel von ${nm}, gemittelt über ${anderer}: Nach dem Tukey-Test (${r.paare.length} Paare) unterscheiden sich deutlich: ${liste}.`, `Estimated marginal means of ${nm}, averaged over ${anderer}: after the Tukey test (${r.paare.length} pairs) these differ clearly: ${liste}.`);
    return kern;
  };
  const randHinweis = !e.randA && !e.randB ? ''
    : sig ? T('Randmittel mitteln über die Stufen des anderen Faktors und verdecken dabei, dass der Unterschied je Stufe verschieden ausfällt: Bei bedeutsamer Wechselwirkung besser die einfachen Effekte lesen.', 'Marginal means average over the levels of the other factor and thereby hide that the difference varies from level to level: with a significant interaction, read the simple effects instead.')
    : T('Randmittel sind nur zu deuten, wenn die Wechselwirkung klein ist; hier ist sie nicht bedeutsam.', 'Marginal means should only be interpreted when the interaction is small; here it is not significant.');
  const zusatz = [extrem, haupteffekte, einfachText, omegaText, randSatz(e.randA, A, B), randSatz(e.randB, B, A), randHinweis].filter(Boolean).join('\n');

  const ns = e.zellen.map(z => z.n), nMin = Math.min(...ns), nMax = Math.max(...ns);
  const levene = e.levene && e.levene.p < 0.05
    ? T(` Der Levene-Test spricht gegen gleich große Streuung in den Zellen (p ${pWert(e.levene.p)}); das Ergebnis ist dann weniger verlässlich, besonders bei ungleich großen Zellen.`,
      ` Levene's test indicates unequal spread in the cells (p ${pWert(e.levene.p)}); the result is then less reliable, especially with unequal cell sizes.`)
    : '';
  const vorsicht = T('Ob die Gruppenzugehörigkeit der Grund ist, zeigen diese Daten nicht.', 'These data do not show whether group membership is the reason.')
    + (nMin !== nMax ? T(` Die Zellen sind unterschiedlich groß (n = ${nMin} bis ${nMax}); die Quadratsummen vom Typ III prüfen jeden Effekt an den ungewichteten Mittelwerten der Zellen.`, ` The cells differ in size (n = ${nMin} to ${nMax}); the Type III sums of squares test each effect on the unweighted means of the cells.`) : '')
    + (nMin < 10 ? T(` Die kleinste Zelle hat nur ${nMin} Personen; das Ergebnis ist dann unsicherer.`, ` The smallest cell has only ${nMin} people; the result is then less certain.`) : '')
    + levene;

  const apa = [`${name(e.aCol)} × ${name(e.bCol)}: ${fText(e.ab, dfe)}, ${etaText(e.ab)}`, `${name(e.aCol)}: ${fText(e.a, dfe)}, ${etaText(e.a)}`, `${name(e.bCol)}: ${fText(e.b, dfe)}, ${etaText(e.b)}`].join('; ');
  return {
    haupt, zusatz, vorsicht, apa,
    marken: [
      { text: `${T('Wechselwirkung', 'Interaction')}: p ${pWert(e.ab.p)}${unter05(sig)}`, erklaer: 'p-wert' },
      { text: `${T('Wechselwirkung', 'Interaction')}: ηp² = ${ohneNull(e.ab.etaP)} (${eta2Wort(e.ab.etaP)})`, erklaer: 'eta-quadrat' },
      { text: T(`Plausibler Bereich für ηp²: ${ohneNull(e.ab.etaPLo)} bis ${ohneNull(e.ab.etaPHi)}`, `Plausible range for ηp²: ${ohneNull(e.ab.etaPLo)} to ${ohneNull(e.ab.etaPHi)}`), erklaer: 'konfidenzintervall' },
      { text: `${T('Haupteffekt', 'Main effect')} ${name(e.aCol)}: ηp² = ${ohneNull(e.a.etaP)}, p ${pWert(e.a.p)}`, erklaer: 'eta-quadrat' },
      { text: `${T('Haupteffekt', 'Main effect')} ${name(e.bCol)}: ηp² = ${ohneNull(e.b.etaP)}, p ${pWert(e.b.p)}`, erklaer: 'eta-quadrat' },
      ...(sig ? [{ text: T('Einfache Effekte mit Holm-Korrektur', 'Simple effects with Holm adjustment'), erklaer: 'paarvergleich' }] : []),
      ...(nMin < 10 ? [{ text: T(`Kleine Zelle (n = ${nMin})`, `Small cell (n = ${nMin})`), erklaer: 'stichprobe', hinweis: true }] : []),
      ...(e.levene && e.levene.p < 0.05 ? [{ text: T(`Streuung ungleich (Levene p ${pWert(e.levene.p)})`, `Unequal spread (Levene p ${pWert(e.levene.p)})`), erklaer: 'streuung', hinweis: true }] : [])
    ]
  };
}

export function tabellenAnova2(e: Anova2E, name: (n: string) => string = spaltenName): TableItem[] {
  const A = name(e.aCol), B = name(e.bCol), Y = name(e.yCol), dfe = e.fehler.df;
  const kz = [T('95 %-KI untere Grenze', '95% CI lower'), T('95 %-KI obere Grenze', '95% CI upper')];
  const zeile = (nm: string, ef: Effekt2): Z[] => [nm, fxg(ef.ss), fd(ef.df), fxg(ef.ss / ef.df), fx(ef.f), fp(ef.p), fo(ef.etaP), fo(ef.etaPLo), fo(ef.etaPHi)];
  const typ3 = tabelle('Tests of Between-Subjects Effects', T('Zweifaktorielle Varianzanalyse (Quadratsummen Typ III)', 'Two-way analysis of variance (Type III sums of squares)'),
    [T('Quelle', 'Source'), T('Quadratsumme', 'Sum of squares'), 'df', T('Mittleres Quadrat', 'Mean square'), 'F', 'p', 'ηp²', T('ηp² 95 %-KI untere Grenze', 'ηp² 95% CI lower'), T('ηp² 95 %-KI obere Grenze', 'ηp² 95% CI upper')],
    [zeile(`${A} × ${B}`, e.ab), zeile(A, e.a), zeile(B, e.b), [T('Fehler', 'Error'), fxg(e.fehler.ss), fd(e.fehler.df), fxg(e.fehler.ms), '', '', '', '', '']],
    [T(`Abhängige Größe: ${Y}; ${e.n} Personen. Quadratsummen vom Typ III mit Effektkodierung (wie SPSS). ηp² = SS / (SS + SS Fehler), Intervall zweiseitig über das nichtzentrale F. PSPP-Auswertung (GLM).`,
      `Dependent variable: ${Y}; ${e.n} people. Type III sums of squares with effect coding (as in SPSS). ηp² = SS / (SS + SS error), two-sided interval from the noncentral F. PSPP analysis (GLM).`)]);
  const zellen = tabelle('Cell Means', T('Zellmittelwerte', 'Cell means'),
    [A, B, 'n', 'M', 'SD', 'SE', ...kz],
    e.zellen.map(z => [z.a, z.b, fd(z.n), fx(z.mittel), fx(z.sd), fx(z.se), fx(z.lo), fx(z.hi)]),
    [T(`SD: Streuung in der Zelle. SE und Intervall nutzen den gemeinsamen Fehlerterm des Gesamtmodells (SE = √(MS Fehler / n), t mit ${dfe} Freiheitsgraden).`,
      `SD: spread within the cell. SE and interval use the pooled error term of the whole model (SE = √(MS error / n), t with ${dfe} degrees of freedom).`)]);
  const einfach = (titel: string, kopf: string, liste: Anova2['einfachAJeB']) => tabelle('Simple Effects', titel,
    [kopf, 'df1', 'df2', 'F', 'p', T('p (Holm)', 'p (Holm)')],
    liste.map(x => [x.stufe, fd(x.df1), fd(x.df2), fx(x.f), fp(x.p), fp(x.pHolm)]),
    [T(`Test, dass alle Zellmittel dieser Zeile gleich sind, mit dem gemeinsamen Fehlerterm (${dfe} Freiheitsgrade). Holm-Korrektur über die ${liste.length} Stufen.`, `Test that all cell means in this row are equal, with the pooled error term (${dfe} degrees of freedom). Holm adjustment over the ${liste.length} levels.`)]);
  const omega = e.ab.omega2 === undefined ? [] : [tabelle('Effect Sizes', T('Effektstärke Omega-Quadrat (ω²) je Effekt', 'Effect size omega squared (ω²) per effect'),
    [T('Quelle', 'Source'), 'ω²', T('partielles ω²', 'partial ω²')],
    [[`${A} × ${B}`, fo(Math.max(0, e.ab.omega2)), fo(Math.max(0, e.ab.omega2P!))], [A, fo(Math.max(0, e.a.omega2!)), fo(Math.max(0, e.a.omega2P!))], [B, fo(Math.max(0, e.b.omega2!)), fo(Math.max(0, e.b.omega2P!))]],
    [T('ω² = (SS − df · MS Fehler) / (SS gesamt + MS Fehler); partielles ω² = (SS − df · MS Fehler) / (SS + (N − df) · MS Fehler). Korrigiert um die Überschätzung durch η²; negative Werte stehen als 0. Bei ungleich großen Zellen ist SS gesamt die Summe der Typ-III-Zeilen, ω² dann nur ungefähr.',
      'ω² = (SS − df · MS error) / (SS total + MS error); partial ω² = (SS − df · MS error) / (SS + (N − df) · MS error). Corrected for the overestimation of η²; negative values are shown as 0. With unequal cell sizes SS total is the sum of the Type III rows, so ω² is only approximate.')])];
  const rand = (r: Anova2['randA'], nm: string) => !r ? [] : [
    tabelle('Estimated Marginal Means', T(`Geschätzte Randmittel von ${nm}`, `Estimated marginal means of ${nm}`), [nm, 'M', 'SE', ...kz],
      r.stufen.map(x => [x.name, fx(x.mittel), fx(x.se), fx(x.lo), fx(x.hi)]),
      [T(`Ungewichteter Mittelwert der Zellmittel über den anderen Faktor (wie emmeans); SE und Intervall mit dem Fehlerterm des Gesamtmodells (t mit ${dfe} Freiheitsgraden). Nur zu deuten, wenn die Wechselwirkung klein ist.`, `Unweighted mean of the cell means over the other factor (as in emmeans); SE and interval use the error term of the whole model (t with ${dfe} degrees of freedom). Interpret only when the interaction is small.`)]),
    tabelle('Pairwise Comparisons', T(`Paarvergleiche der Randmittel von ${nm}`, `Pairwise comparisons of the marginal means of ${nm}`), [T('Paar', 'Pair'), T('Differenz', 'Difference'), 'SE', 'df', 't', T('p (Tukey)', 'p (Tukey)'), T('p (Bonferroni)', 'p (Bonferroni)')],
      r.paare.map(x => [`${r.stufen[x.i]!.name} - ${r.stufen[x.j]!.name}`, fx(x.diff), fx(x.se), fd(x.df), fx(x.t), fp(x.pTukey), fp(x.pBonferroni)]),
      [T(`Differenz = erste minus zweite Stufe (wie emmeans). Beide Anpassungen gelten für alle ${r.paare.length} Paare und nutzen die gemeinsame Fehlervarianz des Gesamtmodells. Die Randmittel mitteln über die Stufen des anderen Faktors: Bei bedeutsamer Wechselwirkung besser die einfachen Effekte lesen.`,
        `Difference = first minus second level (as in emmeans). Both adjustments hold for all ${r.paare.length} pairs and use the pooled error variance of the whole model. The marginal means average over the levels of the other factor: with a significant interaction, read the simple effects instead.`)])];
  return [typ3, ...omega, zellen, ...rand(e.randA, A), ...rand(e.randB, B), ...(e.wechselwirkungBedeutsam ? [
    einfach(T(`Einfache Effekte von ${A} je Stufe von ${B}`, `Simple effects of ${A} at each level of ${B}`), B, e.einfachAJeB),
    einfach(T(`Einfache Effekte von ${B} je Stufe von ${A}`, `Simple effects of ${B} at each level of ${A}`), A, e.einfachBJeA)] : [])];
}

/* ------------------------------------------------------------ G6 */

/** Die Kontrollvariablen einer Kovarianzanalyse (eine oder mehrere) und ihre Tests der Steigungen, gleichförmig; `jeGruppe` ist nur mit `mehr` gefüllt. */
function kontrollen(e: AncovaE) {
  const mehrere = !!e.mehr && e.mehr.kovariaten.length > 1;
  const kv: { name: string; b: number; effekt: Effekt2; mittel: number }[] = mehrere ? e.mehr!.kovariaten : [{ name: e.x, b: e.b, effekt: e.kovariate, mittel: e.kovariateMittel }];
  // Bei einer Kontrollvariable kommen die Zahlen aus den PSPP-Regressionen; die eigene Rechnung liefert dann nur die Steigung je Gruppe.
  const st: AncovaMehr['steigungen'] = mehrere ? e.mehr!.steigungen : [{ name: e.x, ...e.steigung, jeGruppe: e.mehr?.steigungen[0]?.jeGruppe ?? [] }];
  return { kv, st };
}
const aufzaehlen = (a: string[]) => (a.length < 2 ? a.join('') : `${a.slice(0, -1).join(', ')} ${L('und', 'and')} ${a.at(-1)}`);

/** Die Sätze der Kovarianzanalyse (eine oder mehrere Kontrollvariablen). */
export function saetzeAncova(e: AncovaE, name: (n: string) => string = spaltenName): Saetze {
  const { kv, st: stg } = kontrollen(e), mehr = kv.length > 1;
  const G = q(name(e.g)), Y = q(name(e.y)), dfe = e.fehler.df, k = e.gruppen.length;
  const Xn = (n: string) => q(name(n)), X = mehr ? aufzaehlen(kv.map(c => Xn(c.name))) : Xn(kv[0]!.name);
  const sig = e.gruppe.p < 0.05;
  const hauptKern = sig
    ? T(`Bei gleichem Wert in ${X} unterscheiden sich die Gruppen (${G}) in ${Y} (${fText(e.gruppe, dfe)}, ηp² = ${ohneNull(e.gruppe.etaP)}).`,
      `Holding ${X} constant, the groups (${G}) differ on ${Y} (${fText(e.gruppe, dfe)}, ηp² = ${ohneNull(e.gruppe.etaP)}).`)
    : T(`Bei gleichem Wert in ${X} belegen die Daten keinen Unterschied zwischen den Gruppen (${G}) in ${Y} (${fText(e.gruppe, dfe)}, ηp² = ${ohneNull(e.gruppe.etaP)}).`,
      `Holding ${X} constant, the data do not show a difference between the groups (${G}) on ${Y} (${fText(e.gruppe, dfe)}, ηp² = ${ohneNull(e.gruppe.etaP)}).`);

  const s1 = Math.max(...e.gruppen.map(g => Math.max(st(g.mittelAdj, 1), st(g.se, 1))));
  const mitt = mehr ? kv.map(c => `${Xn(c.name)} = ${komma(c.mittel)}`).join(', ') : `${X} = ${komma(e.kovariateMittel)}`;
  const adjListe = e.gruppen.map(g => `${q(g.name)} ${komma(g.mittelAdj, s1)} ${kiText(g.lo, g.hi, s1)}`).join(' · ');
  const adj = mehr
    ? T(`Adjustierte Mittelwerte bei ${Y} für ${mitt} (Mittelwerte der ${e.n} Personen): ${adjListe}.`, `Adjusted means on ${Y} at ${mitt} (means of the ${e.n} people): ${adjListe}.`)
    : T(`Adjustierte Mittelwerte bei ${Y} für ${mitt} (Mittelwert der ${e.n} Personen): ${adjListe}.`, `Adjusted means on ${Y} at ${mitt} (mean of the ${e.n} people): ${adjListe}.`);
  const kovSatz = (c: typeof kv[number]) => {
    const Xc = Xn(c.name);
    return c.effekt.p < 0.05
      ? T(`Die Kovariate ${Xc} hängt mit ${Y} zusammen (b = ${komma(c.b, 2)}; ${fText(c.effekt, dfe)}, ${etaText(c.effekt)}).`, `The covariate ${Xc} is related to ${Y} (b = ${komma(c.b, 2)}; ${fText(c.effekt, dfe)}, ${etaText(c.effekt)}).`)
      : mehr
        ? T(`Die Kovariate ${Xc} erklärt neben der Gruppe und den anderen Kovariaten keinen erkennbaren Teil von ${Y} (b = ${komma(c.b, 2)}; ${fText(c.effekt, dfe)}, ${etaText(c.effekt)}).`, `Beside the group and the other covariates, the covariate ${Xc} does not explain a clear part of ${Y} (b = ${komma(c.b, 2)}; ${fText(c.effekt, dfe)}, ${etaText(c.effekt)}).`)
        : T(`Die Kovariate ${Xc} erklärt neben der Gruppe keinen erkennbaren Teil von ${Y} (b = ${komma(c.b, 2)}; ${fText(c.effekt, dfe)}, ${etaText(c.effekt)}).`, `Beside the group, the covariate ${Xc} does not explain a clear part of ${Y} (b = ${komma(c.b, 2)}; ${fText(c.effekt, dfe)}, ${etaText(c.effekt)}).`);
  };
  const kov = kv.map(kovSatz).join(' ');
  const deutlich = e.paare.filter(p => p.pHolm < 0.05);
  const paarText = (p: typeof e.paare[number]) => `${p.paar.split(' - ').map(q).join(' - ')}: ${komma(p.diff, s1)} (t(${komma(p.df, 0)}) = ${komma(p.t)}, p (Holm) ${pWert(p.pHolm)})`;
  const paare = !sig ? ''
    : k === 2 ? T(`Adjustierter Unterschied ${paarText(e.paare[0]!)}.`, `Adjusted difference ${paarText(e.paare[0]!)}.`)
    : deutlich.length === 0 ? T(`Paarvergleiche der adjustierten Mittelwerte (Holm, ${e.paare.length} Paare): kein einzelnes Paar ist signifikant verschieden.`, `Pairwise comparisons of the adjusted means (Holm, ${e.paare.length} pairs): no single pair differs significantly.`)
    : T(`Paarvergleiche der adjustierten Mittelwerte (Holm, ${e.paare.length} Paare), signifikant verschieden: ${deutlich.map(paarText).join('; ')}.`, `Pairwise comparisons of the adjusted means (Holm, ${e.paare.length} pairs), significantly different: ${deutlich.map(paarText).join('; ')}.`);
  // Steigung je Gruppe (nur wenn gerechnet) bei auffälligem Test: Dann gilt kein einzelner bereinigter Unterschied
  const auffaellig = stg.filter(x => x.bedeutsam);
  const jeGruppe = (x: typeof stg[number]) => x.jeGruppe.map(j => `${q(j.gruppe)} ${komma(j.b, 2)} ${kiText(j.lo, j.hi, 2)}`).join(' · ');
  const steigSatz = auffaellig.filter(x => x.jeGruppe.length).map(x => T(`Steigung von ${Xn(x.name)} in den Gruppen: ${jeGruppe(x)}.`, `Slope of ${Xn(x.name)} in the groups: ${jeGruppe(x)}.`)).join(' ');
  const zusatz = [adj, kov, paare, steigSatz].filter(Boolean).join('\n');

  const sF = (x: typeof stg[number]) => `F(${komma(x.df1, 0)}, ${komma(x.df2, 0)}) = ${komma(x.f)}, p ${pWert(x.p)}`;
  const sFText = mehr ? stg.map(x => `${Xn(x.name)}: ${sF(x)}`).join('; ') : sF(stg[0]!);
  // Fachprüfung Paket A (Punkt 2): Ungleiche Steigungen schränken die Aussage ein - die Einschränkung steht zuerst, vor dem Satz über die adjustierten Mittelwerte.
  // Field-Stufe 2: Mit der Steigung je Gruppe wird erklärt, warum dann kein einzelner bereinigter Unterschied gilt.
  const warn = !auffaellig.length ? ''
    : auffaellig.every(x => x.jeGruppe.length)
      ? T(`Die Kontrollvariable ${aufzaehlen(auffaellig.map(x => Xn(x.name)))} wirkt in den Gruppen unterschiedlich. Dann gibt es keinen einzelnen bereinigten Unterschied zwischen den Gruppen: Er hängt vom Wert der Kontrollvariable ab, und die adjustierten Mittelwerte gelten nur für deren Mittelwert.`,
        `The control variable ${aufzaehlen(auffaellig.map(x => Xn(x.name)))} acts differently in the groups. Then there is no single adjusted difference between the groups: it depends on the value of the control variable, and the adjusted means hold only at its mean.`)
      : T('Die Kovariate wirkt in den Gruppen unterschiedlich. Die adjustierten Mittelwerte sind dann nur bedingt deutbar.', 'The covariate acts differently in the groups. The adjusted means can then be interpreted only to a limited extent.');
  const haupt = warn ? `${warn} ${hauptKern}` : hauptKern;
  const steigung = mehr
    ? T(`Test auf gleiche Steigungen (Gruppe × Kovariate), je Kovariate: ${sFText}.`, `Test of equal slopes (group × covariate), per covariate: ${sFText}.`)
    : T(`Test auf gleiche Steigungen (Gruppe × Kovariate): ${sFText}.`, `Test of equal slopes (group × covariate): ${sFText}.`);
  const vorsicht = T('Ob die Gruppenzugehörigkeit der Grund ist, zeigen diese Daten nicht.', 'These data do not show whether group membership is the reason.')
    + ' ' + (mehr
      ? T('Die Kovariaten dürfen nicht von der Gruppe beeinflusst sein, zum Beispiel Vorwissen, das vor der Maßnahme erhoben wurde.', 'The covariates must not be influenced by the group, for example prior knowledge measured before the intervention.')
      : T('Die Kovariate darf nicht von der Gruppe beeinflusst sein, zum Beispiel Vorwissen, das vor der Maßnahme erhoben wurde.', 'The covariate must not be influenced by the group, for example prior knowledge measured before the intervention.'))
    + ' ' + steigung;

  const apa = `${name(e.g)}: ${fText(e.gruppe, dfe)}, ${etaText(e.gruppe)}; ${kv.map(c => `${name(c.name)}: ${fText(c.effekt, dfe)}, ${etaText(c.effekt)}`).join('; ')}; ${T('Steigungen', 'slopes')} (${T('Gruppe × Kovariate', 'group × covariate')}): ${sFText}`;
  return {
    haupt, zusatz, vorsicht, apa,
    marken: [
      { text: `${T('Gruppe', 'Group')}: p ${pWert(e.gruppe.p)}${unter05(sig)}`, erklaer: 'p-wert' },
      { text: `${T('Gruppe', 'Group')}: ηp² = ${ohneNull(e.gruppe.etaP)} (${eta2Wort(e.gruppe.etaP)})`, erklaer: 'eta-quadrat' },
      { text: T(`Plausibler Bereich für ηp²: ${ohneNull(e.gruppe.etaPLo)} bis ${ohneNull(e.gruppe.etaPHi)}`, `Plausible range for ηp²: ${ohneNull(e.gruppe.etaPLo)} to ${ohneNull(e.gruppe.etaPHi)}`), erklaer: 'konfidenzintervall' },
      ...kv.map(c => ({ text: `${mehr ? name(c.name) : T('Kovariate', 'Covariate')}: ηp² = ${ohneNull(c.effekt.etaP)}, p ${pWert(c.effekt.p)}`, erklaer: 'eta-quadrat' })),
      ...stg.map(x => ({ text: `${mehr ? `${T('Steigungen', 'Slopes')} ${name(x.name)}` : T('Steigungen', 'Slopes')}: p ${pWert(x.p)}${unter05(x.bedeutsam)}`, erklaer: 'moderation', hinweis: x.bedeutsam })),
      ...(sig && k > 2 ? [{ text: T('Paarvergleiche mit Holm-Korrektur', 'Pairwise comparisons with Holm adjustment'), erklaer: 'paarvergleich' }] : [])
    ]
  };
}

export function tabellenAncova(e: AncovaE, name: (n: string) => string = spaltenName): TableItem[] {
  const { kv, st: stg } = kontrollen(e), mehr = kv.length > 1;
  const G = name(e.g), Y = name(e.y), dfe = e.fehler.df, X = aufzaehlen(kv.map(c => name(c.name)));
  const kz = [T('95 %-KI untere Grenze', '95% CI lower'), T('95 %-KI obere Grenze', '95% CI upper')];
  const zeile = (nm: string, ef: Effekt2): Z[] => [nm, fxg(ef.ss), fd(ef.df), fxg(ef.ss / ef.df), fx(ef.f), fp(ef.p), fo(ef.etaP), fo(ef.etaPLo), fo(ef.etaPHi)];
  const bText = kv.map(c => `${name(c.name)}: b = ${komma(c.b, 2)}`).join(', ');
  const quelle = kv.length > 1 ? T('Eigene Rechnung (Kleinste Quadrate mit Gruppen-Hilfsspalten).', 'Own calculation (least squares with group helper columns).') : T('PSPP-Regressionen mit denselben Personen.', 'PSPP regressions with the same people.');
  const typ3 = tabelle('Tests of Between-Subjects Effects', T('Kovarianzanalyse (Quadratsummen Typ III)', 'Analysis of covariance (Type III sums of squares)'),
    [T('Quelle', 'Source'), T('Quadratsumme', 'Sum of squares'), 'df', T('Mittleres Quadrat', 'Mean square'), 'F', 'p', 'ηp²', T('ηp² 95 %-KI untere Grenze', 'ηp² 95% CI lower'), T('ηp² 95 %-KI obere Grenze', 'ηp² 95% CI upper')],
    [zeile(G, e.gruppe), ...kv.map(c => zeile(`${name(c.name)} (${T('Kovariate', 'covariate')})`, c.effekt)), [T('Fehler', 'Error'), fxg(e.fehler.ss), fd(e.fehler.df), fxg(e.fehler.ms), '', '', '', '', '']],
    [mehr
      ? T(`Abhängige Größe: ${Y}; ${e.n} Personen. Gemeinsame Steigungen von ${bText}; R² des Modells = ${ohneNull(e.r2)}. Jede Zeile ist der Zuwachs an erklärter Streuung durch diesen Term über alle anderen hinaus (Typ III). ${quelle}`,
        `Dependent variable: ${Y}; ${e.n} people. Common slopes of ${bText}; R² of the model = ${ohneNull(e.r2)}. Each row is the gain in explained variance due to this term beyond all the others (Type III). ${quelle}`)
      : T(`Abhängige Größe: ${Y}; ${e.n} Personen. Gemeinsame Steigung von ${X}: b = ${komma(e.b, 2)}; R² des Modells = ${ohneNull(e.r2)}. Jede Zeile ist der Zuwachs an erklärter Streuung durch diesen Term über alle anderen hinaus (Typ III). ${quelle}`,
        `Dependent variable: ${Y}; ${e.n} people. Common slope of ${X}: b = ${komma(e.b, 2)}; R² of the model = ${ohneNull(e.r2)}. Each row is the gain in explained variance due to this term beyond all the others (Type III). ${quelle}`)]);
  const mitteltext = mehr ? kv.map(c => `${name(c.name)} = ${komma(c.mittel)}`).join(', ') : `${X} = ${komma(e.kovariateMittel)}`;
  const mittel = tabelle('Estimated Marginal Means', T('Adjustierte Mittelwerte', 'Adjusted means'),
    [G, 'n', T('M (roh)', 'M (raw)'), T('M (adjustiert)', 'M (adjusted)'), 'SE', ...kz],
    e.gruppen.map(g => [g.name, fd(g.n), fx(g.mittelRoh), fx(g.mittelAdj), fx(g.se), fx(g.lo), fx(g.hi)]),
    [mehr
      ? T(`Adjustiert bei den Mittelwerten aller Kontrollvariablen (${mitteltext}): Vorhersage des Modells für eine Person der Gruppe mit diesen Werten. Intervall mit t und ${dfe} Freiheitsgraden.`,
        `Adjusted at the means of all control variables (${mitteltext}): the model's prediction for a person of the group with these values. Interval with t and ${dfe} degrees of freedom.`)
      : T(`Adjustiert beim Mittelwert der Kovariate (${mitteltext}): M (adjustiert) = M (roh) − b · (Mittelwert von ${X} in der Gruppe − ${komma(e.kovariateMittel)}). Intervall mit t und ${dfe} Freiheitsgraden.`,
        `Adjusted at the mean of the covariate (${mitteltext}): M (adjusted) = M (raw) − b · (mean of ${X} in the group − ${komma(e.kovariateMittel)}). Interval with t and ${dfe} degrees of freedom.`)]);
  const paare = tabelle('Pairwise Comparisons', T('Paarvergleiche der adjustierten Mittelwerte', 'Pairwise comparisons of the adjusted means'),
    [T('Paar', 'Pair'), T('Differenz', 'Difference'), 'SE', 'df', 't', T('p (Holm)', 'p (Holm)')],
    e.paare.map(p => [p.paar, fx(p.diff), fx(p.se), fd(p.df), fx(p.t), fp(p.pHolm)]),
    [e.paare.length === 1
      ? T('Differenz der adjustierten Mittelwerte (erste Gruppe minus zweite). Bei zwei Gruppen gibt es nur ein Paar; die Holm-Korrektur ändert den p-Wert nicht.', 'Difference of the adjusted means (first group minus second). With two groups there is only one pair; the Holm adjustment does not change the p value.')
      : T(`Differenz der adjustierten Mittelwerte (erste Gruppe minus zweite). Holm-Korrektur über alle ${e.paare.length} Paare.`, `Difference of the adjusted means (first group minus second). Holm adjustment over all ${e.paare.length} pairs.`)]);
  const steig = tabelle('Homogeneity of Slopes', T('Test auf gleiche Steigungen', 'Test of equal slopes'),
    ['', 'df1', 'df2', 'F', 'p'],
    stg.map(x => [`${G} × ${name(x.name)}`, fd(x.df1), fd(x.df2), fx(x.f), fp(x.p)]),
    [T('Vergleich des Modells mit gemeinsamer Steigung mit dem Modell, in dem jede Gruppe ihre eigene Steigung hat (bei mehreren Kontrollvariablen je Kontrollvariable, die übrigen bleiben gemeinsam). Wird nur berichtet; das Modell wird nicht automatisch gewechselt.', 'Comparison of the model with a common slope and the model in which every group has its own slope (with several control variables one at a time, the others stay common). Reported only; the model is not switched automatically.')]);
  // Steigung je Gruppe: nur wenn der Test auffällt (Field-Stufe 2)
  const je = stg.filter(x => x.bedeutsam && x.jeGruppe.length).map(x => tabelle('Slopes by Group', T(`Steigung von ${name(x.name)} je Gruppe`, `Slope of ${name(x.name)} by group`),
    [G, T('Steigung b', 'Slope b'), 'SE', ...kz],
    x.jeGruppe.map(j => [j.gruppe, fx(j.b), fx(j.se), fx(j.lo), fx(j.hi)]),
    [T('Steigung der Kontrollvariable in der jeweiligen Gruppe, im Modell mit eigener Steigung je Gruppe. Unterscheiden sich die Steigungen, gibt es keinen einzelnen bereinigten Unterschied zwischen den Gruppen: Er hängt vom Wert der Kontrollvariable ab.', 'Slope of the control variable within each group, in the model with its own slope per group. If the slopes differ, there is no single adjusted difference between the groups: it depends on the value of the control variable.')]));
  return [typ3, mittel, paare, steig, ...je];
}
