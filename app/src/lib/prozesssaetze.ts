/**
 * Sätze, APA-Zeile und Tabellen zur bedingten und seriellen Mediation (Zahlen: lib/prozess.ts; Fachblatt S-D Abschnitt 1.9).
 * Ganze Sätze je Fall (übersetzbar), nie ein Wort per Bedingung getauscht. Die Sätze TRENNEN den Index der moderierten Mediation (der Test) von den bedingten Effekten (Beschreibung):
 * Schließt das Intervall des Index null ein, behauptet kein Satz eine Moderation. Kein p-Wert für indirekte Effekte, Index und Kontraste - nur das Intervall.
 * ⚠ Satzvorlagen und Schwellen von der Fachperson abzunehmen.
 */
import type { TableItem } from '../engine/types';
import { L as T, Lp, d } from './sitzung.svelte';
import { iv, ki } from '../i18n/profil';
import { komma, kurz, ohneNull, pWert, type Saetze } from './ergebnis';
import { bootstrapGerechnet, bootstrapHinweise, type BootAngaben } from './bootstrapsaetze';
import { tabelle, fx, fp, fd, type Z } from './mwsaetze';
import { spaltenName } from './medmodsaetze';
import type { EffektIntervall, Prozess, ProzessRechnung } from './prozess';

export type Bez = { x: string; m: string; y: string; w?: string; m2?: string };
type Teile = { haupt: string[]; zusatz: string[]; vorsicht: string[] };

const e3 = (v: number) => komma(v, 3);
const ivl = (i: EffektIntervall) => (i.lo === null || i.hi === null ? '-' : iv(e3(i.lo), e3(i.hi)));
const ivKurz = (i: EffektIntervall) => (i.lo === null || i.hi === null ? '-' : `${e3(i.wert)} ${ivl(i)}`);
const schliesstNullAus = (i: EffektIntervall) => i.lo !== null && i.hi !== null && (i.lo > 0 || i.hi < 0);
const kl = (n: number) => n < 50;

/** Die Sätze in drei Gruppen: was das Ergebnis sagt (haupt), wie gerechnet wurde (zusatz), wo Vorsicht gilt (vorsicht). */
function teile(erg: ProzessRechnung & { gesamt?: number }, bez: Bez): Teile {
  const X = kurz(bez.x), M = kurz(bez.m), Y = kurz(bez.y), W = kurz(bez.w ?? ''), M2 = kurz(bez.m2 ?? '');
  const haupt: string[] = [], zusatz: string[] = [], vorsicht: string[] = [];
  const I = erg.intervalle, B = erg.B, n = erg.n;
  const boot: BootAngaben = { art: I[0]?.art ?? erg.art, wunsch: erg.art, ziehungen: B, startwert: erg.startwert, n, ungueltig: erg.ungueltig, warnungen: [...new Set(I.flatMap(i => i.warnungen))] };

  if (erg.modell === 6) {
    const [i1, i2, i3, su, c1, c2, c3, di, ge] = I as [EffektIntervall, EffektIntervall, EffektIntervall, EffektIntervall, EffektIntervall, EffektIntervall, EffektIntervall, EffektIntervall, EffektIntervall];
    const aus = (i: EffektIntervall) => (schliesstNullAus(i) ? T('das Intervall schließt null aus', 'the interval excludes zero') : T('das Intervall schließt null ein', 'the interval includes zero'));
    haupt.push(T(`Der indirekte Effekt von ${X} auf ${Y} über beide Mediatoren hintereinander (${M}, dann ${M2}) betrug ${e3(i3.wert)}, 95-%-Bootstrap-Intervall ${ivl(i3)}; ${aus(i3)}.`,
      `The indirect effect of ${X} on ${Y} through both mediators in sequence (${M}, then ${M2}) was ${e3(i3.wert)}, 95% bootstrap interval ${ivl(i3)}; ${aus(i3)}.`));
    haupt.push(T(`Über ${M} allein betrug der indirekte Effekt ${e3(i1.wert)} ${ivl(i1)} (${aus(i1)}), über ${M2} allein ${e3(i2.wert)} ${ivl(i2)} (${aus(i2)}). Die Summe der indirekten Effekte war ${e3(su.wert)} ${ivl(su)} (${aus(su)}).`,
      `Through ${M} alone the indirect effect was ${e3(i1.wert)} ${ivl(i1)} (${aus(i1)}), through ${M2} alone ${e3(i2.wert)} ${ivl(i2)} (${aus(i2)}). The sum of the indirect effects was ${e3(su.wert)} ${ivl(su)} (${aus(su)}).`));
    const alleNull = [c1, c2, c3].every(c => !schliesstNullAus(c));
    haupt.push(alleNull
      ? T(`Die Unterschiede zwischen den einzelnen Wegen sind nicht gesichert (Kontraste: ${ivl(c1)}, ${ivl(c2)}, ${ivl(c3)}; alle drei Intervalle schließen null ein).`,
        `The differences between the single paths are not established (contrasts: ${ivl(c1)}, ${ivl(c2)}, ${ivl(c3)}; all three intervals include zero).`)
      : T(`Kontraste zwischen den Wegen (in der Einheit von ${Y}): ${M} gegen ${M2} ${ivKurz(c1)}, ${M} gegen beide ${ivKurz(c2)}, ${M2} gegen beide ${ivKurz(c3)}. Ein Kontrast, dessen Intervall null ausschließt, zeigt einen Unterschied zwischen den beiden Wegen.`,
        `Contrasts between the paths (in the unit of ${Y}): ${M} versus ${M2} ${ivKurz(c1)}, ${M} versus both ${ivKurz(c2)}, ${M2} versus both ${ivKurz(c3)}. A contrast whose interval excludes zero shows a difference between the two paths.`));
    haupt.push(T(`Der direkte Effekt von ${X} auf ${Y} betrug ${e3(di.wert)} ${ivl(di)}, der Gesamteffekt ${e3(ge.wert)} ${ivl(ge)}.`, `The direct effect of ${X} on ${Y} was ${e3(di.wert)} ${ivl(di)}, the total effect ${e3(ge.wert)} ${ivl(ge)}.`));
    zusatz.push(T(`Gerechnet wurde PROCESS-Modell 6 nach Hayes: ${X} wirkt über ${M} und ${M2} hintereinander auf ${Y}. Die Reihenfolge der beiden Mediatoren ist eine Annahme aus der Theorie; die Daten prüfen sie nicht (die umgekehrte Reihenfolge passt gleich gut). Kontraste vergleichen Wege in der Einheit von ${Y}; ein größerer Weg ist nicht deshalb wichtiger. Es gibt keine Korrektur über die drei Kontraste; sie sind Beschreibung.`,
      `The calculation is PROCESS model 6 by Hayes: ${X} acts on ${Y} through ${M} and ${M2} in sequence. The order of the two mediators is an assumption from theory; the data do not test it (the reverse order fits equally well). Contrasts compare paths in the unit of ${Y}; a larger path is not therefore more important. There is no correction across the three contrasts; they are description.`));
  } else {
    const idx = I[0]!, bed = I.slice(1), ws = erg.wWerte ?? [], sig = schliesstNullAus(idx), imod = erg.modell === 7;
    if (sig) haupt.push(Lp(B, `Der indirekte Effekt von ${X} auf ${Y} über ${M} hängt von ${W} ab (Index der moderierten Mediation = ${e3(idx.wert)}, 95-%-Bootstrap-Intervall ${ivl(idx)}, ${B} Ziehung).`, `Der indirekte Effekt von ${X} auf ${Y} über ${M} hängt von ${W} ab (Index der moderierten Mediation = ${e3(idx.wert)}, 95-%-Bootstrap-Intervall ${ivl(idx)}, ${B} Ziehungen).`,
      `The indirect effect of ${X} on ${Y} through ${M} depends on ${W} (index of moderated mediation = ${e3(idx.wert)}, 95% bootstrap interval ${ivl(idx)}, ${B} draw).`, `The indirect effect of ${X} on ${Y} through ${M} depends on ${W} (index of moderated mediation = ${e3(idx.wert)}, 95% bootstrap interval ${ivl(idx)}, ${B} draws).`));
    else haupt.push(T(`Der Index der moderierten Mediation beträgt ${e3(idx.wert)}, 95-%-Bootstrap-Intervall ${ivl(idx)}; das Intervall schließt null ein. Die Daten sichern nicht, dass sich der indirekte Effekt von ${X} auf ${Y} über ${M} mit ${W} ändert. Dass einzelne bedingte Effekte von null verschieden sind, zeigt das nicht.`,
      `The index of moderated mediation is ${e3(idx.wert)}, 95% bootstrap interval ${ivl(idx)}; the interval includes zero. The data do not establish that the indirect effect of ${X} on ${Y} through ${M} changes with ${W}. That single conditional effects differ from zero does not show this.`));
    const w = (j: number) => komma(ws[j]!, 2);
    if (ws.length === 3 && erg.regel === 'perzentil') haupt.push(T(`Beim 16. Perzentil von ${W} (${w(0)}) war der indirekte Effekt ${ivKurz(bed[0]!)}, beim 50. Perzentil (${w(1)}) ${ivKurz(bed[1]!)} und beim 84. Perzentil (${w(2)}) ${ivKurz(bed[2]!)}.`,
      `At the 16th percentile of ${W} (${w(0)}) the indirect effect was ${ivKurz(bed[0]!)}, at the 50th percentile (${w(1)}) ${ivKurz(bed[1]!)} and at the 84th percentile (${w(2)}) ${ivKurz(bed[2]!)}.`));
    else if (ws.length === 3 && erg.regel === 'sd') haupt.push(T(`Beim Mittelwert von ${W} minus einer Standardabweichung (${w(0)}) war der indirekte Effekt ${ivKurz(bed[0]!)}, beim Mittelwert (${w(1)}) ${ivKurz(bed[1]!)} und beim Mittelwert plus einer Standardabweichung (${w(2)}) ${ivKurz(bed[2]!)}.`,
      `At the mean of ${W} minus one standard deviation (${w(0)}) the indirect effect was ${ivKurz(bed[0]!)}, at the mean (${w(1)}) ${ivKurz(bed[1]!)} and at the mean plus one standard deviation (${w(2)}) ${ivKurz(bed[2]!)}.`));
    else if (ws.length) haupt.push(ws.map((_, j) => T(`Bei ${W} = ${w(j)} war der indirekte Effekt ${ivKurz(bed[j]!)}.`, `At ${W} = ${w(j)} the indirect effect was ${ivKurz(bed[j]!)}.`)).join(' '));
    if (erg.regel === 'zwei' && ws.length === 2) haupt.push(T(`Der Index ist die Differenz der beiden bedingten Effekte bei ${W} = ${w(0)} und ${W} = ${w(1)}.`, `The index is the difference between the two conditional effects at ${W} = ${w(0)} and ${W} = ${w(1)}.`));
    haupt.push(T(`Der direkte Effekt von ${X} auf ${Y} betrug ${e3(erg.schaetzung.direkt)}.`, `The direct effect of ${X} on ${Y} was ${e3(erg.schaetzung.direkt)}.`));
    zusatz.push(imod
      ? T(`Gerechnet wurde PROCESS-Modell 7 nach Hayes: ${W} wirkt auf den Weg von ${X} auf ${M}. Beide Faktoren des Produkts wurden am Mittelwert zentriert (${W}: ${komma(erg.schaetzung.mittelW ?? NaN, 2)}); der Koeffizient von ${X} in der Gleichung für ${M} gilt deshalb bei ${W} = Mittelwert. Die bedingten Effekte und der Index ändern sich durch die Zentrierung nicht. Es wurde ohne weitere Einflussgrößen gerechnet.`,
        `The calculation is PROCESS model 7 by Hayes: ${W} acts on the path from ${X} to ${M}. Both factors of the product were centered at the mean (${W}: ${komma(erg.schaetzung.mittelW ?? NaN, 2)}); the coefficient of ${X} in the equation for ${M} therefore holds at ${W} = mean. The conditional effects and the index do not change with centering. No further covariates were included.`)
      : T(`Gerechnet wurde PROCESS-Modell 14 nach Hayes: ${W} wirkt auf den Weg von ${M} auf ${Y}. Beide Faktoren des Produkts wurden am Mittelwert zentriert (${W}: ${komma(erg.schaetzung.mittelW ?? NaN, 2)}); der Koeffizient von ${M} in der Gleichung für ${Y} gilt deshalb bei ${W} = Mittelwert. Die bedingten Effekte und der Index ändern sich durch die Zentrierung nicht. Es wurde ohne weitere Einflussgrößen gerechnet.`,
        `The calculation is PROCESS model 14 by Hayes: ${W} acts on the path from ${M} to ${Y}. Both factors of the product were centered at the mean (${W}: ${komma(erg.schaetzung.mittelW ?? NaN, 2)}); the coefficient of ${M} in the equation for ${Y} therefore holds at ${W} = mean. The conditional effects and the index do not change with centering. No further covariates were included.`));
    if (ws.length) {
      if (erg.regel === 'perzentil') zusatz.push(T(`Die Werte von ${W} sind das 16., 50. und 84. Perzentil nach Typ 6 (wie in SPSS und PSPP); sie wurden einmal aus den Originaldaten bestimmt und in allen Ziehungen festgehalten.`,
        `The values of ${W} are the 16th, 50th and 84th percentile by type 6 (as in SPSS and PSPP); they were determined once from the original data and held fixed in all draws.`));
      else if (erg.regel === 'sd') zusatz.push(T(`Die Werte von ${W} sind der Mittelwert sowie die Werte eine Standardabweichung darunter und darüber; sie wurden einmal aus den Originaldaten bestimmt und in allen Ziehungen festgehalten.`,
        `The values of ${W} are the mean and one standard deviation below and above it; they were determined once from the original data and held fixed in all draws.`));
      else if (erg.regel === 'zwei') zusatz.push(T(`${W} hat nur zwei Werte; die bedingten Effekte gelten bei diesen beiden Werten.`, `${W} has only two values; the conditional effects hold at these two values.`));
      else zusatz.push(T(`Die Werte von ${W} wurden frei gewählt; sie wurden in allen Ziehungen festgehalten.`, `The values of ${W} were chosen freely; they were held fixed in all draws.`));
      ws.forEach((v, j) => {
        if (erg.wBeobachtet && !erg.wBeobachtet[j] && erg.regel === 'perzentil') vorsicht.push(T(`Der Wert ${w(j)} von ${W} kommt in den Daten nicht vor (er liegt zwischen zwei beobachteten Werten).`, `The value ${w(j)} of ${W} does not occur in the data (it lies between two observed values).`));
        if (erg.wAusserhalb?.[j]) vorsicht.push(T(`Der Wert ${w(j)} von ${W} liegt außerhalb der beobachteten Werte (Hochrechnung).`, `The value ${w(j)} of ${W} lies outside the observed values (extrapolation).`));
        void v;
      });
      if (erg.regel === 'perzentil' && ws.length === 2) vorsicht.push(T(`Zwei der drei Perzentile von ${W} fallen zusammen; es gibt nur zwei verschiedene Werte.`, `Two of the three percentiles of ${W} coincide; there are only two distinct values.`));
      if (ws.length === 1) vorsicht.push(d(`Alle drei Perzentile von ${W} sind gleich; ein bedingter Effekt lässt sich nur bei diesem einen Wert angeben. Wähle Mittelwert und Standardabweichung oder eigene Werte.`, `Alle drei Perzentile von ${W} sind gleich; ein bedingter Effekt lässt sich nur bei diesem einen Wert angeben. Wählen Sie Mittelwert und Standardabweichung oder eigene Werte.`, `All three percentiles of ${W} are equal; a conditional effect can be given at this single value only. Choose mean and standard deviation or your own values.`));
    }
    if (kl(n)) vorsicht.push(T(`Bei ${n} Personen lassen sich Wechselwirkungen nur schwer entdecken.`, `With ${n} people interactions are hard to detect.`));
  }
  zusatz.push(bootstrapGerechnet(boot));
  vorsicht.unshift(erg.modell === 6
    ? T(`Querschnittsdaten zeigen einen statistischen Zusammenhang, der über ${M} und ${M2} läuft; ob ${X} ${Y} verursacht, sagt die Rechnung nicht.`, `Cross-sectional data show a statistical association that runs through ${M} and ${M2}; the calculation does not say whether ${X} causes ${Y}.`)
    : T(`Querschnittsdaten zeigen einen statistischen Zusammenhang, der über ${M} läuft; ob ${X} ${Y} verursacht, sagt die Rechnung nicht.`, `Cross-sectional data show a statistical association that runs through ${M}; the calculation does not say whether ${X} causes ${Y}.`));
  const g = erg.gesamt;
  if (g !== undefined && g > n) vorsicht.push(T(`Es gehen nur die ${n} Personen mit allen Angaben ein (${g - n} ausgelassen).`, `Only the ${n} people with all answers are included (${g - n} left out).`));
  vorsicht.push(...bootstrapHinweise(boot));
  return { haupt, zusatz, vorsicht };
}

/** Ganze Sätze (Fachblatt 1.9), nacheinander: was das Ergebnis sagt, wie gerechnet wurde, wo Vorsicht gilt. */
export function prozessSaetze(erg: ProzessRechnung & { gesamt?: number }, bez: Bez): string[] {
  const t = teile(erg, bez);
  return [...t.haupt, ...t.zusatz, ...t.vorsicht];
}

/* ------------------------------------------------------------ Blatt: Sätze, Marken, Tabellen */

const wortModell = (m: ProzessRechnung['modell']) => (m === 7 ? T('Bedingte Mediation (Modell 7)', 'Conditional mediation (model 7)') : m === 14 ? T('Bedingte Mediation (Modell 14)', 'Conditional mediation (model 14)') : T('Serielle Mediation (Modell 6)', 'Serial mediation (model 6)'));

export function saetzeProzess(e: Prozess, name: (n: string) => string = spaltenName): Saetze {
  const bez: Bez = { x: name(e.spalten.x), m: name(e.spalten.m), y: name(e.spalten.y), w: e.spalten.w ? name(e.spalten.w) : undefined, m2: e.spalten.m2 ? name(e.spalten.m2) : undefined };
  const t = teile(e, bez), I = e.intervalle, n = e.n;
  const apa = e.modell === 6
    ? T(`Indirekt über beide: ${ivKurz(I[2]!)}; über M1: ${ivKurz(I[0]!)}; über M2: ${ivKurz(I[1]!)}; Summe: ${ivKurz(I[3]!)}; c′ = ${e3(I[7]!.wert)}`, `Indirect through both: ${ivKurz(I[2]!)}; through M1: ${ivKurz(I[0]!)}; through M2: ${ivKurz(I[1]!)}; sum: ${ivKurz(I[3]!)}; c′ = ${e3(I[7]!.wert)}`)
    : T(`Index der moderierten Mediation = ${e3(I[0]!.wert)}, ${ki(e3(I[0]!.lo ?? NaN), e3(I[0]!.hi ?? NaN))}; bedingte indirekte Effekte: ${I.slice(1).map((i, j) => `W = ${komma(e.wWerte![j]!, 2)}: ${e3(i.wert)} ${ivl(i)}`).join('; ')}`,
      `Index of moderated mediation = ${e3(I[0]!.wert)}, ${ki(e3(I[0]!.lo ?? NaN), e3(I[0]!.hi ?? NaN))}; conditional indirect effects: ${I.slice(1).map((i, j) => `W = ${komma(e.wWerte![j]!, 2)}: ${e3(i.wert)} ${ivl(i)}`).join('; ')}`);
  const marken: Saetze['marken'] = e.modell === 6
    ? [{ text: T(`Über beide Mediatoren: ${e3(I[2]!.wert)}`, `Through both mediators: ${e3(I[2]!.wert)}`), erklaer: 'mediation' }, { text: T(`Summe: ${e3(I[3]!.wert)}`, `Sum: ${e3(I[3]!.wert)}`), erklaer: 'mediation' }]
    : [{ text: T(`Index = ${e3(I[0]!.wert)}`, `Index = ${e3(I[0]!.wert)}`), erklaer: 'mediation' },
      { text: `${ki(e3(I[0]!.lo ?? NaN), e3(I[0]!.hi ?? NaN))} ${schliesstNullAus(I[0]!) ? T('schließt 0 aus', 'excludes 0') : T('schließt 0 ein', 'includes 0')}`, erklaer: 'bootstrap', hinweis: !schliesstNullAus(I[0]!) }];
  marken.push({ text: T(`${n} Personen`, `${n} people`), erklaer: 'stichprobe', hinweis: kl(n) });
  return { haupt: t.haupt.join(' '), zusatz: t.zusatz.join(' '), vorsicht: t.vorsicht.join(' '), apa, marken };
}

/** Bezeichnung eines Terms der Gleichungen (Pfadtabelle). */
function termName(e: Prozess, ziel: string, term: string, name: (n: string) => string): string {
  const X = name(e.spalten.x), M = name(e.spalten.m), Y = name(e.spalten.y), W = e.spalten.w ? name(e.spalten.w) : '', M2 = e.spalten.m2 ? name(e.spalten.m2) : '';
  switch (term) {
    case 'x': return e.modell === 7 && ziel === 'm' ? T(`${X} (bei ${W} = Mittelwert)`, `${X} (at ${W} = mean)`) : e.modell === 14 && ziel === 'y' ? T(`${X} (direkt, c′)`, `${X} (direct, c′)`) : ziel === 'y' ? T(`${X} (direkt, c′)`, `${X} (direct, c′)`) : X;
    case 'w': return e.modell === 7 ? T(`${W} (bei ${X} = Mittelwert)`, `${W} (at ${X} = mean)`) : T(`${W} (bei ${M} = Mittelwert)`, `${W} (at ${M} = mean)`);
    case 'xw': return `${X} × ${W}`;
    case 'm': return e.modell === 14 && ziel === 'y' ? T(`${M} (bei ${W} = Mittelwert)`, `${M} (at ${W} = mean)`) : M;
    case 'mw': return `${M} × ${W}`;
    case 'm2': return M2;
    default: return term;
  }
}
const zielName = (e: Prozess, ziel: string, name: (n: string) => string) => (ziel === 'm' ? name(e.spalten.m) : ziel === 'm2' ? name(e.spalten.m2 ?? '') : name(e.spalten.y));

/** Wie heißt der Effekt k in der Effekttabelle? */
function effektBez(e: Prozess, k: number, name: (n: string) => string): string {
  const X = name(e.spalten.x), M = name(e.spalten.m), Y = name(e.spalten.y), W = e.spalten.w ? name(e.spalten.w) : '', M2 = e.spalten.m2 ? name(e.spalten.m2) : '';
  const nm = e.intervalle[k]!.name;
  if (e.modell === 6) {
    switch (nm) {
      case 'ind1': return T(`Indirekt über ${M} (${X} → ${M} → ${Y})`, `Indirect through ${M} (${X} → ${M} → ${Y})`);
      case 'ind2': return T(`Indirekt über ${M2} (${X} → ${M2} → ${Y})`, `Indirect through ${M2} (${X} → ${M2} → ${Y})`);
      case 'ind3': return T(`Indirekt über beide hintereinander (${X} → ${M} → ${M2} → ${Y})`, `Indirect through both in sequence (${X} → ${M} → ${M2} → ${Y})`);
      case 'summe': return T('Summe der indirekten Effekte', 'Sum of the indirect effects');
      case 'c1': return T(`Kontrast: Weg über ${M} minus Weg über ${M2}`, `Contrast: path through ${M} minus path through ${M2}`);
      case 'c2': return T(`Kontrast: Weg über ${M} minus Weg über beide`, `Contrast: path through ${M} minus path through both`);
      case 'c3': return T(`Kontrast: Weg über ${M2} minus Weg über beide`, `Contrast: path through ${M2} minus path through both`);
      case 'direkt': return T(`Direkter Effekt c′ (${X} → ${Y})`, `Direct effect c′ (${X} → ${Y})`);
      default: return T(`Gesamteffekt c (${X} → ${Y})`, `Total effect c (${X} → ${Y})`);
    }
  }
  if (k === 0) return T('Index der moderierten Mediation', 'Index of moderated mediation');
  const w = komma(e.wWerte![k - 1]!, 2);
  if (e.regel === 'perzentil' && e.wWerte!.length === 3) return [T(`Bedingter indirekter Effekt bei ${W} = ${w} (16. Perzentil)`, `Conditional indirect effect at ${W} = ${w} (16th percentile)`), T(`Bedingter indirekter Effekt bei ${W} = ${w} (50. Perzentil)`, `Conditional indirect effect at ${W} = ${w} (50th percentile)`), T(`Bedingter indirekter Effekt bei ${W} = ${w} (84. Perzentil)`, `Conditional indirect effect at ${W} = ${w} (84th percentile)`)][k - 1]!;
  if (e.regel === 'sd' && e.wWerte!.length === 3) return [T(`Bedingter indirekter Effekt bei ${W} = ${w} (Mittelwert − 1 SD)`, `Conditional indirect effect at ${W} = ${w} (mean − 1 SD)`), T(`Bedingter indirekter Effekt bei ${W} = ${w} (Mittelwert)`, `Conditional indirect effect at ${W} = ${w} (mean)`), T(`Bedingter indirekter Effekt bei ${W} = ${w} (Mittelwert + 1 SD)`, `Conditional indirect effect at ${W} = ${w} (mean + 1 SD)`)][k - 1]!;
  return T(`Bedingter indirekter Effekt bei ${W} = ${w}`, `Conditional indirect effect at ${W} = ${w}`);
}

export function tabellenProzess(e: Prozess, name: (n: string) => string = spaltenName): TableItem[] {
  const sc = e.schaetzung, zeilen: Z[][] = [];
  const reihenfolge = (['m', 'm2', 'y'] as const).filter(z => sc.gleichungen[z]);
  reihenfolge.forEach((ziel, gi) => {
    const g = sc.gleichungen[ziel]!, reg = e.regressionen[gi]!;
    g.terme.forEach((term, j) => {
      const t = reg.terme[j]!;
      zeilen.push([j === 0 ? T(`Gleichung für ${zielName(e, ziel, name)}`, `Equation for ${zielName(e, ziel, name)}`) : '', termName(e, ziel, term, name), fx(t.b, 3), fx(t.se, 3), fx(t.t, 2), fp(t.p), fx(t.lo, 3), fx(t.hi, 3)]);
    });
  });
  const pfade = tabelle('Process Paths', T('Gleichungen der Mediation', 'Equations of the mediation'),
    [T('Gleichung', 'Equation'), T('Größe', 'Predictor'), 'B', 'SE', 't', 'p', T('95 %-KI untere Grenze', '95% CI lower'), T('95 %-KI obere Grenze', '95% CI upper')], zeilen,
    [T(`${reihenfolge.length} lineare Regressionen mit denselben ${e.n} Personen (PSPP).`, `${reihenfolge.length} linear regressions with the same ${e.n} people (PSPP).`),
      ...(e.modell === 6 ? [] : [T('Die beiden Faktoren eines Produkts sind am Mittelwert zentriert; ihre Einzelkoeffizienten gelten beim Mittelwert der anderen Größe.', 'The two factors of a product are centered at the mean; their single coefficients hold at the mean of the other variable.')]),
      T(`R²: ${reihenfolge.map(z => `${zielName(e, z, name)} = ${ohneNull(sc.gleichungen[z]!.r2)}`).join(', ')}.`, `R²: ${reihenfolge.map(z => `${zielName(e, z, name)} = ${ohneNull(sc.gleichungen[z]!.r2)}`).join(', ')}.`)]);
  const effekte: Z[][] = e.intervalle.map((i, k) => [effektBez(e, k, name), fx(i.wert, 3), fx(i.se, 3), i.lo === null ? '-' : fx(i.lo, 3), i.hi === null ? '-' : fx(i.hi, 3)]);
  if (e.modell === 6 && e.sd) {
    const f = e.sd.x / e.sd.y, X = name(e.spalten.x), Y = name(e.spalten.y), M = name(e.spalten.m), M2 = name(e.spalten.m2 ?? '');
    // Je Weg ein ganzer fester Text (das Adjektiv richtet sich nach dem Wort davor, nie nach einer eingesetzten Bezeichnung)
    const std = [
      T(`Indirekt über ${M} (${X} → ${M} → ${Y}), vollständig standardisiert`, `Indirect through ${M} (${X} → ${M} → ${Y}), completely standardized`),
      T(`Indirekt über ${M2} (${X} → ${M2} → ${Y}), vollständig standardisiert`, `Indirect through ${M2} (${X} → ${M2} → ${Y}), completely standardized`),
      T(`Indirekt über beide hintereinander (${X} → ${M} → ${M2} → ${Y}), vollständig standardisiert`, `Indirect through both in sequence (${X} → ${M} → ${M2} → ${Y}), completely standardized`)
    ];
    std.forEach((txt, k) => effekte.push([txt, fx(e.intervalle[k]!.wert * f, 3), '-', '-', '-']));
  }
  const hinweise = bootstrapGerechnet({ art: e.intervalle[0]?.art ?? e.art, wunsch: e.art, ziehungen: e.B, startwert: e.startwert, n: e.n });
  const eff = tabelle('Process Effects', e.modell === 6 ? T('Indirekte Effekte, Kontraste und Gesamteffekt (Bootstrap)', 'Indirect effects, contrasts and total effect (bootstrap)') : T('Index und bedingte indirekte Effekte (Bootstrap)', 'Index and conditional indirect effects (bootstrap)'),
    [T('Effekt', 'Effect'), T('Schätzung', 'Estimate'), T('Bootstrap-SE', 'Bootstrap SE'), T('95 %-KI untere Grenze', '95% CI lower'), T('95 %-KI obere Grenze', '95% CI upper')], effekte,
    [`${wortModell(e.modell)}. ${hinweise}${e.modell === 6 ? ' ' + T(`Die standardisierten Werte sind Schätzung · SD(${name(e.spalten.x)}) / SD(${name(e.spalten.y)}) ohne Intervall.`, `The standardized values are estimate · SD(${name(e.spalten.x)}) / SD(${name(e.spalten.y)}) without an interval.`) : ''} ${T('Für indirekte Effekte, den Index und die Kontraste gibt es kein p, nur das Intervall.', 'There is no p for indirect effects, the index and the contrasts, only the interval.')}`]);
  void pWert; void fd;
  return [pfade, eff];
}
