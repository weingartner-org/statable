/**
 * Die Fragearten des Blattes: Lücken, passende Spalten, Befehl, Prüfliste.
 * ⚠ Die Zuordnung Frage → Verfahren (Testwahl) ist von einer Statistik-Fachperson abzunehmen.
 */
import type { Spalte } from './verzeichnis';
import { lesbar } from './verzeichnis';
import { L, Lp } from './sitzung.svelte';
import { zitat } from '../i18n/profil';
import { zitWert, pk } from './befehlstext';
import { rAnzeigeName as rn, rAnzeigeText as rs } from '../engine/rsicher';   // R-Text zum Ansehen: Namen aus den Daten maskiert (engine/rsicher.ts)
import type { Korrelationsart } from './rangkorrelation';
import { logistikWerte, kursKlassisch, type KorrelationsGrund } from './ergebnis';
import { mediationBefehl } from './mediation';
import { istSetName } from './mehrfach';
import { stufenGrund, WENIGE_STUFEN } from './stufen';
import { anova2Befehl } from './anova2';
import { mcnemarBefehl, cochranBefehl } from './janeinbefehl';
import { regTerme, regressionBefehl, regLogistikTeile, regAlsFaktor, type RegFaktor, type RegTerm } from './regfaktor';
import { zielArt, type ZielArt } from './kategwahl';
import { diskrRCode, diskrFachwort, diskrWarum, DISKR_MERKMALE_MAX } from './diskriminanz';   // Kurs-Paket (Fachblatt KURSPAKET)
import { logRCode, logFachwort, logWarum, logStandardWahl, logTerme, LOG_FAKTOREN_MAX } from './loglinear';
import { manovaRCode, manovaFachwort, manovaWarum, MANOVA_ZIELE_MAX } from './manova';
import { armutRCode, armutFachwort, armutWarum } from './armut';   // Abschnitt 3: Armut und Ungleichheit

export type Wahl = 'eins' | 'mehrere';
/** Textfelder (titel, beispiel, satz, frage) sind Getter: sie lesen die Sprache bei jedem Zugriff neu. */
export interface Luecke { schluessel: 'l1' | 'l2' | 'l3' | 'l4'; frage: string; wahl: Wahl; passt: (sp: Spalte, ctx: Ctx) => boolean; satz: (sp: Spalte) => string; mindestens?: number; /** Knopf „Ohne … weiter“ bei optionalen Lücken (mindestens: 0) */ ohne?: string; /** Optionale Lücke, die nicht von selbst aufgeht: Sie steht auf „keine“, bis jemand sie anklickt (mindestens: 0). */ still?: boolean; /** Warum keine Spalte passt, wenn keine passt (Prüfung B5) */ keine?: (spalten: Spalte[], ctx: Ctx) => string;
  /** Beschriftung vor der Lücke, wenn sie nicht im Satz selbst steht („Zweite Gruppierung“, „Kontrollvariable“). */ davor?: string;
  /** In der kompakten Frage eines fertigen Blatts nur zeigen, wenn etwas gewählt ist (statt „keine“). */ stumm?: boolean;
  /** Steht nicht im Satz, sondern eingeklappt unter „Weitere Wege“. */ weg?: boolean;
  /** Bei Mehrfachwahl: höchstens so viele Spalten (Fälle vergleichen: 4 Zahlen-/Gruppenspalten, 3 Textspalten). */ hoechstens?: number }
export interface Ctx { /** Ist die Spalte Ja/Nein (genau zwei Werte, 0/1 oder beschriftet; janein.ts)? Dann rechnen „Hat sich etwas verändert?“ McNemar und „Verändert sich etwas über mehrere Zeitpunkte?“ Cochran-Q (G5). */ binaer?: (name: string) => boolean; verschieden: (name: string) => number; gueltig: (name: string) => number; istZahl: (name: string) => boolean; ordinal?: (name: string) => boolean; nominal?: (name: string) => boolean; bezeichnung?: (name: string) => string; /** Binäre logistische Regression: Ereignis und Vergleichswert der Zielspalte (mit der Wahl „Ereignis umkehren“) oder `null`, wenn die Spalte nicht genau zwei Werte hat. */ logistik?: (ziel: string) => LogistikKodierung | null; /** Art der Zielspalte der Regression (kategwahl.ts: zwei Werte, nominal, geordneter Text, Zahl) oder `null`, wenn die Spalte kein Ziel sein kann. */ zielArt?: (name: string) => ZielArt | null; /** Gruppen-Spalte als Prädiktor der Regression (Hilfsspalten, regfaktor.ts) oder `null`, wenn sie als Zahl eingeht. */ faktor?: (name: string) => RegFaktor | null; /** Faktorenanalyse (Abschlusstest F3): Methode und Zahl der Faktoren (null = Kaiser-Kriterium). Fehlt = Standard (Hauptkomponenten, Varimax, Kaiser). */ fa?: FaWahl }
/** Faktorenanalyse: 'pc' = Hauptkomponenten + Varimax (Standard, wie SPSS), 'paf' = Hauptachsen + Promax (korrelierte Merkmale). */
/** `grenze`: Ladungen mit kleinerem Betrag werden in der Tabelle ausgeblendet (null = alle zeigen, wie SPSS). Gerechnet wird immer ohne Ausblenden; Sätze und Zuordnung nutzen fest ,30. */
export interface FaWahl { methode: 'pc' | 'paf'; zahl: number | null; grenze: number | null }
/** Die Wahl der Faktorenanalyse aus einem gespeicherten Ergebnis (alte Projekte: Standard). */
export function faAusErgebnis(ergebnis: unknown): FaWahl | undefined {
  const e = (ergebnis as { typ?: string; e?: { methode?: 'pc' | 'paf'; zahlGewaehlt?: number | null; grenze?: number | null } } | null);
  return e?.typ === 'faktor' ? { methode: e.e?.methode ?? 'pc', zahl: e.e?.zahlGewaehlt ?? null, grenze: e.e?.grenze === undefined ? 0.3 : e.e.grenze } : undefined;
}
/** Der R-Text zum Ansehen (wird nie ausgeführt): Namen der Merkmale nur als maskierte Zeichenketten (rs). */
function clusterRCode(merkmale: string[]): string {
  return `${L('# Statable rechnet die Clusteranalyse mit R (Basispaket stats). Die Zahl der Gruppen k wählt die Person im Ergebnis.', '# Statable calculates the cluster analysis with R (base package stats). The person chooses the number of groups k in the result.')}\nZ <- scale(daten[, c(${merkmale.map(rs).join(', ')})])\nhc <- hclust(dist(Z), method = "ward.D2")\ncutree(hc, k = 3)\nset.seed(20261008)\nkmeans(Z, centers = 3, nstart = 25, iter.max = 100)`;
}
export interface Verfahren {
  id: string; icon: string; titel: string; beispiel: string; /** Kurzer Zusatz auf der Karte, wo zwei Karten sich sonst ähneln. */ zusatz?: string; fachwort: (w: Werte, ctx: Ctx) => string;
  satz: string[]; luecken: Luecke[]; syntax: (w: Werte, ctx: Ctx) => string; warum: (w: Werte, ctx: Ctx) => string;
  /** `c`: nur die Faktorenanalyse braucht ihn (Methode, Abschlusstest F3). */
  titelBlatt: (w: Werte, sp: (n: string) => Spalte | undefined, c?: Pick<Ctx, 'fa'> & { /** Später S-D: gewähltes PROCESS-Modell der Mediation (7, 14, 6; sonst einfach) */ prozess?: number }) => string;
}
export interface Werte { l1: string[]; l2: string[]; l3: string[]; l4: string[] }

const zahl = (sp: Spalte) => sp.art === 'zahl' && sp.niveau !== 'nominal' || (sp.art === 'zahl' && !Object.keys(sp.werteLabels).length);
const gruppen = (sp: Spalte, c: Ctx) => { const n = c.verschieden(sp.name); return n >= 2 && n <= 12; };
export const kennung = (sp: Spalte) => /^(nr|id|lfdn|lfd_?nr|nummer|fall|case)$/i.test(sp.name);
/** Spalten, die Fälle benennen (Kennung, Pseudonym, Probandencode): beim Fallvergleich sind sie die Kennung, nicht Zahl, Gruppe oder Aussage. */
const fallName = (sp: Spalte) => kennung(sp) || /(^|[_-])(id|nr|nummer|kennung|kennnummer|pseudonym|proband|probandencode|vp|code)([_-]|$)/i.test(sp.name);
/** Sind alle diese Spalten Ja/Nein (und es gibt welche)? G5: McNemar bei zwei, Cochran-Q bei drei und mehr. */
export const alleJaNein = (l: string[], c: Ctx) => l.length > 0 && l.every(n => !!n && !!c.binaer?.(n));
const art = (sp: Spalte) => lesbar(sp, true);
const v = (l: string[]) => l.join(' ');
/** Gruppen-Spalte mit drei und mehr Stufen (regfaktor.ts): kein Prädiktor für Mediation und Moderation - dort gehen X, M und W als eine Zahl ein (Abschlusstest F1). */
const gruppen3 = (sp: Spalte, c: Ctx) => { const n = c.verschieden(sp.name); return n >= 3 && regAlsFaktor(sp, n); };
/** Satz für „Warum dieses Verfahren?“, wenn Gruppen-Spalten als Prädiktoren eingehen. */
function faktorWarum(t: RegTerm[]): string {
  const f = t.flatMap(x => (x.faktor ? [x.faktor] : []));
  if (!f.length) return '';
  const k = f[0]!;
  return f.length === 1
    ? Lp(k.hilfs.length, ` ${zitat(k.bezeichnung)} ist eine Gruppen-Spalte: Sie geht nicht als Zahl ein, sondern als Vergleich mit der ersten Gruppe ${zitat(k.stufen[0]!.name)} (Dummy-Kodierung).`, ` ${zitat(k.bezeichnung)} ist eine Gruppen-Spalte: Sie geht nicht als Zahl ein, sondern als ${k.hilfs.length} Vergleiche mit der ersten Gruppe ${zitat(k.stufen[0]!.name)} (Dummy-Kodierung).`,
      ` ${zitat(k.bezeichnung)} is a group column: it does not enter as a number but as a comparison with the first group ${zitat(k.stufen[0]!.name)} (dummy coding).`, ` ${zitat(k.bezeichnung)} is a group column: it does not enter as a number but as ${k.hilfs.length} comparisons with the first group ${zitat(k.stufen[0]!.name)} (dummy coding).`)
    : L(` Gruppen-Spalten (${f.map(x => zitat(x.bezeichnung)).join(', ')}) gehen nicht als Zahl ein, sondern als Vergleiche mit ihrer ersten Gruppe (Dummy-Kodierung).`, ` Group columns (${f.map(x => zitat(x.bezeichnung)).join(', ')}) do not enter as numbers but as comparisons with their first group (dummy coding).`);
}

export { WENIGE_STUFEN } from './stufen';
/** Welche Korrelationsart Statable vorschlägt: Spearman, wenn eine der beiden Spalten ordinal ist oder höchstens 7 verschiedene Werte hat; sonst Pearson.
 *  Dieselbe Regel (stufen.ts) entscheidet beim Gruppenvergleich über den Rangtest-Vorschlag (Abschlusstest F5). */
export function empfohleneKorrelation(a: string, b: string, c: Ctx): { methode: Korrelationsart; grund: KorrelationsGrund } {
  const g = stufenGrund([a, b], c);
  return g ? { methode: 'spearman', grund: g } : { methode: 'pearson', grund: { art: 'metrisch', spalten: [a, b].map(n => c.bezeichnung?.(n) ?? n) } };
}
/** Vorschlag für die Korrelationsmatrix: eine Art für alle Paare - Spearman, sobald eine Spalte ordinal ist oder höchstens 7 verschiedene Werte hat; sonst Pearson. */
export function empfohleneKorrelationListe(spalten: string[], c: Ctx): { methode: 'pearson' | 'spearman'; grund: KorrelationsGrund } {
  const g = stufenGrund(spalten, c);
  return g ? { methode: 'spearman', grund: g } : { methode: 'pearson', grund: { art: 'metrisch', spalten: spalten.map(n => c.bezeichnung?.(n) ?? n) } };
}
/** Die herausgerechneten Spalten mit ihrer Bezeichnung, wo es eine gibt (Partialkorrelation). */
const nenneL3 = (w: Werte, c: Ctx) => w.l3.map(n => c.bezeichnung?.(n) ?? n).join(', ');
const nenne = (l: string[]) => l.map(zitat).join(` ${L('und', 'and')} `);
/** Die Spalten mit ihrer Bezeichnung, wo es eine gibt, in Anführungszeichen (für „Warum dieses Verfahren?“). */
const nenneNamen = (l: string[], c: Ctx) => l.map(n => zitat(c.bezeichnung?.(n) ?? n)).join(` ${L('und', 'and')} `);
/** Der Grund in einem Satz, z. B. „weil „Semester“ nur 4 verschiedene Werte hat“. */
export function korrelationsGrundText(g: KorrelationsGrund | undefined, m: Korrelationsart): string {
  if (!g) return '';
  const n = nenne(g.spalten), mehr = g.spalten.length > 1;
  if (m === 'pearson' && g.art !== 'metrisch') return L(`Statable hatte ${g.art === 'ordinal' ? L('wegen des Niveaus', 'the level of measurement') : L('wegen der wenigen Werte', 'the few distinct values')} von ${n} eine Rangkorrelation vorgeschlagen.`, `Statable had suggested a rank correlation because of ${g.art === 'ordinal' ? L('wegen des Niveaus', 'the level of measurement') : L('wegen der wenigen Werte', 'the few distinct values')} of ${n}.`);
  if (g.art === 'ordinal') return mehr ? L(`Statable schlägt Spearman vor, weil ${n} ordinal sind.`, `Statable suggests Spearman because ${n} are ordinal.`) : L(`Statable schlägt Spearman vor, weil ${n} ordinal ist.`, `Statable suggests Spearman because ${n} is ordinal.`);
  if (g.art === 'stufen') return mehr ? L(`Statable schlägt Spearman vor, weil ${n} nur ${g.stufen} oder weniger verschiedene Werte haben.`, `Statable suggests Spearman because ${n} have only ${g.stufen} or fewer distinct values.`) : L(`Statable schlägt Spearman vor, weil ${n} nur ${g.stufen} oder weniger verschiedene Werte hat.`, `Statable suggests Spearman because ${n} has only ${g.stufen} or fewer distinct values.`);
  return L('Statable schlägt Pearson vor, weil beide Spalten Zahlen mit vielen verschiedenen Werten sind.', 'Statable suggests Pearson because both columns are numbers with many distinct values.');
}
/** Wie korrelationsGrundText, für die Korrelationsmatrix: bei Pearson „alle Spalten“ statt „beide“. */
export function matrixGrundText(g: KorrelationsGrund | undefined, m: Korrelationsart): string {
  if (g?.art === 'metrisch' && m === 'pearson') return L('Statable schlägt Pearson vor, weil alle Spalten Zahlen mit vielen verschiedenen Werten sind.', 'Statable suggests Pearson because all columns are numbers with many distinct values.');
  if (g?.art === 'metrisch' && m === 'spearman') return L('Statable hatte Pearson vorgeschlagen, weil alle Spalten Zahlen mit vielen verschiedenen Werten sind.', 'Statable had suggested Pearson because all columns are numbers with many distinct values.');
  return korrelationsGrundText(g, m);
}
/** Welche Art der Übereinstimmung gerechnet wird: Cohens Kappa bei genau zwei Spalten mit Kategorien (Text, nominal oder Zahlen mit höchstens 7 verschiedenen Werten),
 *  Fleiss' Kappa und Krippendorffs Alpha ('inter', Fachblatt G2) bei drei und mehr Spalten mit Kategorien, ICC bei Zahlenspalten.
 *  `wunsch` (Auswahl im Blatt bei Zahlenspalten) gilt nur, wenn es passt. ⚠ Zuordnung und Schwelle von der Fachperson abzunehmen. */
export type UebArt = 'kappa' | 'icc' | 'inter' | 'unklar';
export function uebereinstimmungsArt(spalten: string[], c: Ctx, wunsch?: 'kappa' | 'icc'): { art: UebArt; kategorial: boolean } {
  const zahlen = spalten.every(n => c.istZahl(n));
  const kategorie = (n: string) => !c.istZahl(n) || !!c.nominal?.(n) || c.verschieden(n) <= WENIGE_STUFEN;
  const alleKat = spalten.every(kategorie), beideKat = spalten.length === 2 && alleKat, mehrKat = spalten.length >= 3 && alleKat;
  const art: UebArt = wunsch === 'kappa' && spalten.length === 2 ? 'kappa' : wunsch === 'kappa' && spalten.length >= 3 && zahlen ? 'inter' : wunsch === 'icc' && zahlen ? 'icc' : beideKat ? 'kappa' : mehrKat ? 'inter' : zahlen ? 'icc' : spalten.length === 2 ? 'kappa' : 'unklar';
  return { art, kategorial: beideKat || mehrKat };
}
/** Mehr verschiedene Werte je Spalte als hier: Kappa zählt, wie oft beide GENAU gleich urteilen - bei Punktwerten fast nie (κ nahe 0), und die Kreuztabelle wird riesig
 *  (700 × 700 Werte brauchten 47 s, Abschlusstest B13). Das Blatt warnt dann vor dem Rechnen. */
export const KAPPA_STUFEN_MAX = 15;
/** Größte Zahl verschiedener Werte einer der beiden Spalten, wenn sie über KAPPA_STUFEN_MAX liegt und Kappa gerechnet würde; sonst 0. */
export function kappaZuVieleStufen(spalten: string[], c: Ctx, wunsch?: 'kappa' | 'icc'): number {
  const art = uebereinstimmungsArt(spalten, c, wunsch).art;
  if (art !== 'kappa' && art !== 'inter') return 0;
  const m = Math.max(...spalten.map(n => c.verschieden(n)));
  return m > KAPPA_STUFEN_MAX ? m : 0;
}
export const uebereinstimmungWarum = (art: UebArt) => art === 'inter'
  ? L("Drei oder mehr Kodierende ordnen dieselben Einheiten (zum Beispiel Textstellen oder Antworten) Kategorien zu. Fleiss' Kappa zählt, wie oft sie übereinstimmen, und zieht ab, was allein durch Zufall zu erwarten wäre. Krippendorffs Alpha rechnet auch dann, wenn nicht jede Person jede Einheit kodiert hat. Beide zeigen, wie verlässlich die Kodierung ist.",
      "Three or more coders assign the same units (for example text passages or answers) to categories. Fleiss' kappa counts how often they agree and subtracts what would be expected by chance alone. Krippendorff's alpha also works when not every coder has coded every unit. Both show how reliable the coding is.")
  : art === 'kappa'
  ? L('Zwei Beurteilende ordnen dieselben Fälle Kategorien zu (zum Beispiel Noten oder Gruppen). Cohens Kappa zählt, wie oft beide dasselbe urteilen, und zieht ab, was allein durch Zufall zu erwarten wäre. Sind die Kategorien geordnet (Noten), kann Kappa gewichtet werden: Eine Abweichung um eine Stufe zählt dann weniger als eine um mehrere.',
      'Two raters assign the same cases to categories (for example grades or groups). Cohen\'s kappa counts how often both give the same rating and subtracts what would be expected by chance alone. If the categories are ordered (grades), kappa can be weighted: a difference of one level then counts less than a difference of several.')
  : L('Zwei oder mehr Beurteilende vergeben für dieselben Fälle Zahlen (zum Beispiel Punkte). Der Intraklassen-Korrelationskoeffizient (ICC) zeigt, welcher Anteil der Unterschiede in allen Urteilen auf echte Unterschiede zwischen den Fällen zurückgeht - und nicht auf die Beurteilenden oder auf Messfehler. Er stammt aus einer Varianzanalyse mit den Fällen und den Beurteilenden als Faktoren.',
      'Two or more raters give numbers (for example points) for the same cases. The intraclass correlation coefficient (ICC) shows what proportion of the variance in all ratings reflects true differences between the cases rather than differences between raters or measurement error. It comes from an analysis of variance with cases and raters as factors.');
const korrWarum = (m: Korrelationsart) => m === 'spearman'
  ? L('Beide Spalten enthalten Zahlen, aber mindestens eine ist gestuft oder nur der Reihenfolge nach zu verstehen. Die Rangkorrelation nach Spearman vergleicht die Rangplätze und setzt keine gleichen Abstände zwischen den Stufen voraus. Sie zeigt, ob höhere Werte in der einen mit höheren (oder niedrigeren) in der anderen einhergehen.',
      'Both columns hold numbers, but at least one has few levels or is ordinal. Spearman\'s rank correlation compares rank positions and does not assume equal distances between the levels. It shows whether higher values in one go together with higher (or lower) values in the other.')
  : m === 'kendall'
  ? L('Kendalls τb vergleicht für jedes Paar von Personen, ob beide Spalten in dieselbe Richtung gehen. Es ist bei vielen gleichen Werten (Bindungen) und kleinen Gruppen oft die zuverlässigere Rangkorrelation.',
      "Kendall's tau-b compares, for each pair of people, whether both columns go in the same direction. With many tied values and small samples it is often the more dependable rank correlation.")
  : L('Beide Spalten enthalten Zahlen. Die Korrelation zeigt, ob höhere Werte in der einen mit höheren (oder niedrigeren) Werten in der anderen einhergehen.',
      'Both columns hold numbers. The correlation shows whether higher values in one go together with higher (or lower) values in the other.');
export { korrWarum };

/** Statt eines PSPP-Befehls: der Hinweis, dass Statable die Mehrfachantworten selbst rechnet (MULT RESPONSE kennt PSPP 2.1.1 nicht). */
const mehrfachHinweisBefehl = (namen: string[]) => `* ${pk(L(`Mehrfachantworten (${namen.join(', ')}): Statable rechnet selbst; PSPP 2.1.3 kennt MULT RESPONSE nicht.`, `Multiple responses (${namen.join(', ')}): Statable computes this itself; PSPP 2.1.3 does not support MULT RESPONSE.`))}\n* ${L('Wie in SPSS MRSETS + MULT RESPONSE: Häufigkeiten, Prozent der Antworten, Prozent der Fälle.', 'As in SPSS MRSETS + MULT RESPONSE: frequencies, percent of responses, percent of cases.')}`;

/** Kaplan-Meier (und Cox): der Text zum Ansehen. Alles aus den Daten steht in Kommentarzeilen und läuft durch pk(); die R-Namen sind mit rn maskiert. */
function kaplanSyntax(w: Werte): string {
  const [z, e, g] = [w.l1[0]!, w.l2[0]!, w.l3[0]];
  const kopf = g ? L(`Zeit: ${z}; Ereignis: ${e}; Gruppen: ${g}.`, `Time: ${z}; event: ${e}; groups: ${g}.`) : L(`Zeit: ${z}; Ereignis: ${e}.`, `Time: ${z}; event: ${e}.`);
  const aufruf = `${L('Der gleiche Aufruf in R:', 'The same call in R:')} library(survival); survfit(Surv(${rn(z)}, ${rn(e)}) ~ ${g ? rn(g) : '1'}, conf.type = "log")${g ? `; survdiff(Surv(${rn(z)}, ${rn(e)}) ~ ${rn(g)})` : ''}`;
  const cox = `${L('Cox-Regression (R, Paket survival, Bindungen nach Efron):', 'Cox regression (R, package survival, ties by Efron):')} coxph(Surv(${rn(z)}, ${rn(e)}) ~ ${w.l4.map(rn).join(' + ')}, ties = "efron"); cox.zph(…, terms = TRUE)`;
  return [L('* Kaplan-Meier: Statable rechnet selbst (PSPP hat dafür kein Verfahren).', '* Kaplan-Meier: Statable computes this itself (PSPP has no procedure for this).'), `* ${pk(kopf)}`, `* ${pk(aufruf, 800)}`, ...(w.l4.length ? [`* ${pk(cox, 800)}`] : [])].join('\n');
}

export const VERFAHREN: Verfahren[] = [
  {
    id: 'gruppen', icon: 'gruppen',
    get titel() { return L('Unterscheiden sich Gruppen?', 'Do groups differ?'); },
    get zusatz() { return L('t-Test für zwei unabhängige Stichproben, Varianzanalyse', 't test for two independent samples, analysis of variance'); },
    get beispiel() { return L('z. B. Konzentrieren sich Personen mit und ohne Handy im Bett unterschiedlich gut?', "e.g. Do people who use their phone in bed concentrate differently from people who don't?"); },
    get satz() { return [L('Ich möchte wissen, ob sich ', 'I want to know whether '), L(' unterscheidet, je nachdem, welche Gruppe bei ', ' differs depending on the group given for '), L(' angegeben ist.', '.'), '.', '.']; },
    luecken: [
      { schluessel: 'l1', get frage() { return L('Was wurde gemessen?', 'What was measured?'); }, wahl: 'eins', passt: (sp) => zahl(sp) && !kennung(sp), satz: sp => art(sp) },
      { schluessel: 'l2', get frage() { return L('Welche Gruppen?', 'Which groups?'); }, wahl: 'eins', passt: (sp, c) => gruppen(sp, c) && !kennung(sp), satz: sp => art(sp) },
      // G3 (Fachblatt Welle 2, Paket A): zweiter Gruppenfaktor - die eine neue sichtbare Wahl; optional, geht nicht von selbst auf (die einfache Frage bleibt der Normalfall).
      { schluessel: 'l3', get frage() { return L('Zweite Gruppierung (optional): noch eine Spalte, die Gruppen nennt', 'Second grouping (optional): another column that names groups'); },
        get davor() { return L('Zweite Gruppierung', 'Second grouping'); }, get ohne() { return L('Ohne zweite Gruppierung weiter', 'Continue without a second grouping'); },
        wahl: 'eins', passt: (sp, c) => gruppen(sp, c) && !kennung(sp), satz: sp => art(sp), mindestens: 0, still: true, stumm: true },
      // G6: Kontrollvariable (Kovariate) - eingeklappt unter „Weitere Wege“, damit die Karte nur eine neue sichtbare Wahl hat.
      { schluessel: 'l4', get frage() { return L('Kontrollvariablen kommen hinzu (optional): Zahlen, die die Gruppen nicht beeinflussen, zum Beispiel das Vorwissen vor der Maßnahme; bis zu vier', 'Control variables (optional): numbers that the groups do not influence, for example prior knowledge before the intervention; up to four'); },
        get davor() { return L('Kontrollvariablen', 'Control variables'); }, get ohne() { return L('Ohne Kontrollvariable weiter', 'Continue without a control variable'); },
        wahl: 'mehrere', hoechstens: 4, passt: (sp, c) => zahl(sp) && !kennung(sp) && c.verschieden(sp.name) > 2, satz: sp => art(sp), mindestens: 0, still: true, stumm: true, weg: true }
    ],
    fachwort: (w, c) => (w.l3.length ? L('zweifaktorielle Varianzanalyse (Typ III)', 'two-way analysis of variance (Type III)') : w.l4.length ? L('Kovarianzanalyse (ANCOVA, Typ III)', 'analysis of covariance (ANCOVA, Type III)')
      : c.verschieden(w.l2[0]!) === 2 ? L('t-Test nach Welch', "Welch's t test") : L('einfaktorielle Varianzanalyse nach Welch', "Welch's one-way analysis of variance")),
    warum: (w, c) => w.l3.length
      ? L(`Eine Zahl wird nach zwei Gruppierungen verglichen (${nenneNamen(w.l2, c)} und ${nenneNamen(w.l3, c)}), jede Person gehört zu genau einer Gruppe je Gruppierung. Die zweifaktorielle Varianzanalyse prüft beide Gruppierungen und ihre Wechselwirkung: ob die Wirkung der einen Gruppierung von der anderen abhängt. Statable rechnet mit Quadratsummen vom Typ III (wie SPSS) und deutet die Wechselwirkung zuerst; die Zellen müssen alle besetzt sein. Ist die Wechselwirkung signifikant, kommen einfache Effekte mit Holm-Korrektur dazu.`,
          `A number is compared across two groupings (${nenneNamen(w.l2, c)} and ${nenneNamen(w.l3, c)}), and each person belongs to exactly one group in each grouping. The two-way analysis of variance tests both groupings and their interaction: whether the effect of one grouping depends on the other. Statable uses Type III sums of squares (as in SPSS) and interprets the interaction first; every cell must be filled. If the interaction is significant, simple effects with Holm adjustment are added.`)
      : w.l4.length
      ? L(`Eine Zahl wird zwischen den Gruppen von ${nenneNamen(w.l2, c)} verglichen, und zwar bei gleichem Wert von ${nenneNamen(w.l4, c)}. Die Kovarianzanalyse zeigt, ob die Gruppen sich unterscheiden, wenn der Einfluss dieser Kontrollvariable herausgerechnet ist; die Mittelwerte werden dafür auf deren Mittelwert angeglichen (adjustierte Mittelwerte). Voraussetzung: Die Kontrollvariable wurde vor der Maßnahme erhoben, die Gruppen beeinflussen sie nicht, und sie wirkt in allen Gruppen gleich stark (Test der Steigungen). PSPP hat bei GLM keine Kovariate; Statable rechnet vier Regressionen mit denselben Personen.`,
          `A number is compared between the groups of ${nenneNamen(w.l2, c)} at the same value of ${nenneNamen(w.l4, c)}. The analysis of covariance shows whether the groups differ when the influence of this control variable is removed; for that the means are adjusted to its mean (adjusted means). Requirements: the control variable was measured before the intervention, the groups do not influence it, and it acts equally strongly in all groups (test of the slopes). PSPP has no covariate in GLM; Statable runs four regressions with the same people.`)
      : c.verschieden(w.l2[0]!) === 2
      ? kursKlassisch()
        ? L('Eine Zahl wird zwischen zwei Gruppen verglichen, jede Person gehört zu genau einer Gruppe. Gerechnet wird der klassische t-Test, der gleich starke Streuung in beiden Gruppen annimmt (Kursmodus); die Form nach Welch steht in den Tabellen daneben.',
          'One number is compared between two groups, and each person belongs to exactly one group. The classical t test is calculated, which assumes equal spread in both groups (course mode); the Welch version is shown next to it in the tables.')
        : L('Eine Zahl wird zwischen zwei Gruppen verglichen, jede Person gehört zu genau einer Gruppe. Die Form nach Welch braucht nicht, dass beide Gruppen gleich stark streuen.',
          "One number is compared between two groups, and each person belongs to exactly one group. Welch's version does not require both groups to vary equally.")
      : kursKlassisch()
        ? L(`Eine Zahl wird zwischen ${c.verschieden(w.l2[0]!)} Gruppen verglichen. Die klassische Varianzanalyse (Kursmodus) prüft, ob sich mindestens zwei Gruppen unterscheiden; sie nimmt gleich starke Streuung in allen Gruppen an. Paarvergleiche nach Tukey zeigen danach, welche Gruppen sich unterscheiden.`,
          `One number is compared between ${c.verschieden(w.l2[0]!)} groups. The classical analysis of variance (course mode) tests whether at least two groups differ; it assumes equal spread in all groups. Tukey pairwise comparisons then show which groups differ.`)
        : L(`Eine Zahl wird zwischen ${c.verschieden(w.l2[0]!)} Gruppen verglichen. Die Varianzanalyse nach Welch prüft, ob sich mindestens zwei Gruppen unterscheiden; sie braucht nicht, dass alle Gruppen gleich stark streuen. Die klassische Varianzanalyse steht daneben. Paarvergleiche nach Games-Howell zeigen danach, welche Gruppen sich unterscheiden - ebenfalls ohne diese Annahme.`,
          `One number is compared between ${c.verschieden(w.l2[0]!)} groups. Welch's analysis of variance tests whether at least two groups differ; it does not require all groups to vary equally. The classical analysis of variance is shown next to it. Games-Howell pairwise comparisons then show which groups differ - also without that assumption.`),
    // ⚠ von der Fachperson abzunehmen: Bei drei und mehr Gruppen rechnet Statable Welch-Varianzanalyse und Paarvergleiche selbst (posthoc.ts, gegen R geprüft; PSPP kennt die Welch-Analyse nicht);
    // Hauptergebnis immer Welch, Standard-Paarvergleich Games-Howell, Levene nur beschreibend (Abschlusstest F2); Tukey und Bonferroni wählbar am Blatt (blatt.ph).
    // Zusätzlich die Wahl „Ohne Normalverteilung (Rangtest)“ am Blatt (blatt.rang): Mann-Whitney bei zwei, Kruskal-Wallis mit Dunn bei drei und mehr Gruppen; vorgeschlagen bei n < 20 je Gruppe oder |Schiefe| > 1 (rangtests.ts).
    // Die Syntax bleibt bewusst ohne /POSTHOC: Die Zahlen entstehen aus den Kennzahlen je Gruppe und lassen sich am Blatt sofort umschalten.
    // G3: Mit zweiter Gruppierung läuft GLM (Zahlen als Faktoren); Text-Gruppen kodiert das Blatt vorher (anova2Lauf). G6: Mit Kontrollvariable laufen vier Regressionen (anova2.ts); sie brauchen die Stufen der Gruppe, die erst das Blatt kennt.
    syntax: (w, c) => w.l3.length ? anova2Befehl(w.l1[0]!, w.l2[0]!, w.l3[0]!)
      : w.l4.length > 1 ? `* ${L('Kovarianzanalyse mit mehreren Kontrollvariablen: Statable rechnet selbst (Kleinste Quadrate mit Gruppen-Hilfsspalten, Quadratsummen Typ III); PSPP hat dafür kein Verfahren.', 'Analysis of covariance with several control variables: Statable computes this itself (least squares with group helper columns, Type III sums of squares); PSPP has no procedure for this.')}`
      : w.l4.length ? `* ${L('Kovarianzanalyse: vier Regressionen mit denselben Personen; das Blatt baut sie aus den Stufen der Gruppe.', 'Analysis of covariance: four regressions with the same people; the page builds them from the levels of the group.')}`
      : c.verschieden(w.l2[0]!) === 2 ? `T-TEST GROUPS=${w.l2[0]}(${'%G1%'} ${'%G2%'})\n  /VARIABLES=${w.l1[0]}.` : `ONEWAY ${w.l1[0]} BY ${w.l2[0]}\n  /STATISTICS=DESCRIPTIVES HOMOGENEITY.`,
    titelBlatt: (w, sp) => `${lesbar(sp(w.l2[0]!), true)}${w.l3[0] ? ` × ${lesbar(sp(w.l3[0]), true)}` : ''} ${L('und', 'and')} ${lesbar(sp(w.l1[0]!), true)}${w.l4[0] ? ` (${w.l4.map(n => lesbar(sp(n), true)).join(', ')} ${L('kontrolliert', 'controlled for')})` : ''}`
  },
  {
    id: 'praepost', icon: 'prepost',
    get titel() { return L('Hat sich etwas verändert?', 'Has something changed?'); },
    get zusatz() { return L('zwei Messungen, gepaarter t-Test, McNemar', 'two measurements, paired t test, McNemar'); },
    get beispiel() { return L('z. B. Wie unterscheidet sich der Wissenstest vor und nach dem Kurs - bei denselben Personen?', 'e.g. How does the knowledge test differ before and after the course - for the same people?'); },
    get satz() { return [L('Ich möchte wissen, ob sich die Werte von ', 'I want to know whether the values changed from '), L(' zu ', ' to '), L(' verändert haben.', '.')]; },
    luecken: [
      // G5: Ja/Nein-Spalten (zwei Werte) sind auch erlaubt: sind beide Messungen Ja/Nein, rechnet Statable McNemar statt des t-Tests.
      { schluessel: 'l1', get frage() { return L('Die erste Messung (vorher)', 'The first measurement (before)'); }, wahl: 'eins', passt: (sp, c) => (zahl(sp) || !!c.binaer?.(sp.name)) && !kennung(sp), satz: sp => art(sp) },
      { schluessel: 'l2', get frage() { return L('Die zweite Messung (nachher)', 'The second measurement (after)'); }, wahl: 'eins', passt: (sp, c) => (zahl(sp) || !!c.binaer?.(sp.name)) && !kennung(sp), satz: sp => art(sp) }
    ],
    fachwort: (w, c) => (alleJaNein([w.l1[0]!, w.l2[0]!], c) ? L('McNemar-Test (exakt)', 'McNemar test (exact)') : L('t-Test für gepaarte Stichproben (abhängige Messungen)', 'paired-samples t test (dependent measurements)')),
    warum: (w, c) => alleJaNein([w.l1[0]!, w.l2[0]!], c)
      ? L('Zwei Ja/Nein-Spalten stammen von denselben Personen (vorher und nachher). Der McNemar-Test prüft nur die Personen, die ihre Antwort geändert haben, und fragt, ob die Wechsel in die eine Richtung häufiger sind als in die andere. Statable rechnet ihn exakt (Binomialtest), auch bei wenigen Wechseln. Das Odds Ratio setzt die beiden Wechselrichtungen ins Verhältnis.',
        'Two yes/no columns come from the same people (before and after). The McNemar test only looks at the people who changed their answer and asks whether changes in one direction are more frequent than in the other. Statable calculates it exactly (binomial test), even with few changes. The odds ratio relates the two directions of change.')
      : L('Zwei Zahlen-Spalten stammen von denselben Personen (vorher und nachher). Der Test für gepaarte Stichproben vergleicht je Person die beiden Werte und prüft, ob die Unterschiede im Schnitt von null abweichen. Die Effektstärke dz setzt die mittlere Veränderung in Beziehung zu ihrer Streuung.',
      'Two number columns come from the same people (before and after). The paired-samples test compares the two values for each person and tests whether the differences are on average different from zero. The effect size dz relates the mean change to its spread.'),
    // ⚠ von der Fachperson abzunehmen: Testwahl (gepaarter t-Test; Wilcoxon als Wahl „Ohne Normalverteilung“, vorgeschlagen bei n < 20 oder deutlicher Schiefe, siehe rangtests.ts) und Effektstärken d_z / d_av.
    syntax: (w, c) => (alleJaNein([w.l1[0]!, w.l2[0]!], c) ? mcnemarBefehl(w.l1[0]!, w.l2[0]!) : `T-TEST PAIRS=${w.l1[0]} WITH ${w.l2[0]} (PAIRED).`),
    titelBlatt: (w, sp) => `${lesbar(sp(w.l1[0]!), true)} ${L('zu', 'to')} ${lesbar(sp(w.l2[0]!), true)}`
  },
  {
    id: 'zusammenhang', icon: 'zusammen',
    get titel() { return L('Hängen zwei Dinge zusammen?', 'Are two things related?'); },
    get zusatz() { return L('Korrelation', 'correlation'); },
    get beispiel() { return L('z. B. Hängt mehr Schlaf mit besserer Konzentration zusammen?', 'e.g. Is more sleep related to better concentration?'); },
    get satz() { return [L('Ich möchte wissen, ob ', 'I want to know whether '), L(' mit ', ' is related to '), L(' zusammenhängt. Herausrechnen: ', '. Controlling for: '), L('.', '.')]; },
    luecken: [
      { schluessel: 'l1', get frage() { return L('Das eine …', 'The one …'); }, wahl: 'eins', passt: sp => zahl(sp) && !kennung(sp), satz: sp => art(sp) },
      { schluessel: 'l2', get frage() { return L('… und das andere', '… and the other'); }, wahl: 'eins', passt: sp => zahl(sp) && !kennung(sp), satz: sp => art(sp) },
      // Partialkorrelation: optional, geht nicht von selbst auf (die einfache Korrelation ist der Normalfall).
      { schluessel: 'l3', get frage() { return L('Soll etwas herausgerechnet werden? (optional: Zahlenspalten, die beide beeinflussen könnten, zum Beispiel das Alter)', 'Should anything be controlled for? (optional: number columns that could influence both, for example age)'); }, get ohne() { return L('Ohne Herausrechnen weiter', 'Continue without controlling'); }, wahl: 'mehrere', passt: sp => zahl(sp) && !kennung(sp), satz: sp => art(sp), mindestens: 0, still: true }
    ],
    fachwort: (w, c) => { const m = empfohleneKorrelation(w.l1[0]!, w.l2[0]!, c).methode; if (w.l3.length) return m === 'spearman' ? L('Partielle Rangkorrelation nach Spearman', "Spearman's partial rank correlation") : L('Partialkorrelation nach Pearson', 'Pearson partial correlation'); return m === 'spearman' ? L('Rangkorrelation nach Spearman', "Spearman's rank correlation") : L('Korrelation nach Pearson', 'Pearson correlation'); },
    warum: (w, c) => korrWarum(empfohleneKorrelation(w.l1[0]!, w.l2[0]!, c).methode) + (w.l3.length ? ' ' + L(`Zusätzlich wird der lineare Einfluss von ${nenneL3(w, c)} aus beiden Spalten herausgerechnet (Partialkorrelation): Gefragt ist, wie stark der Zusammenhang bei gleicher Ausprägung von ${nenneL3(w, c)} ist. Statable rechnet das selbst, denn PSPP hat dafür kein Verfahren.`, `In addition, the linear influence of ${nenneL3(w, c)} is removed from both columns (partial correlation): the question is how strong the relationship is at the same level of ${nenneL3(w, c)}. Statable calculates this itself because PSPP has no procedure for it.`) : ''),
    // PSPP 2.1.1 hat kein NONPAR CORR („not yet implemented“): PSPP liefert die Pearson-Tabelle, Spearman und Kendall rechnet Statable aus denselben Daten.
    syntax: w => `${w.l3.length ? L(`* Partialkorrelation (herausgerechnet: ${pk(w.l3.join(', '))}): Statable rechnet selbst (PSPP kennt PARTIAL CORR nicht); die einfache Korrelation rechnet PSPP.`, `* Partial correlation (controlling for: ${pk(w.l3.join(', '))}): Statable computes this itself (PSPP has no PARTIAL CORR); PSPP calculates the simple correlation.`) + '\n' : ''}${L('* Pearson rechnet PSPP; Spearman und Kendall rechnet Statable selbst (PSPP kennt NONPAR CORR nicht).', '* PSPP calculates Pearson; Statable calculates Spearman and Kendall itself (PSPP has no NONPAR CORR).')}\nCORRELATIONS /VARIABLES=${w.l1[0]} ${w.l2[0]}\n  /PRINT=TWOTAIL.`,
    titelBlatt: (w, sp) => `${lesbar(sp(w.l1[0]!), true)} ${L('und', 'and')} ${lesbar(sp(w.l2[0]!), true)}${w.l3.length ? ` (${w.l3.map(n => lesbar(sp(n), true)).join(', ')} ${L('herausgerechnet', 'controlled for')})` : ''}`
  },
  {
    // Eigene Karte statt einer Option in „Hängen zwei Dinge zusammen?“: Dort steht ein Satz mit genau zwei Lücken (das eine, das andere, herausrechnen) -
    // eine Liste von Spalten passt nicht hinein, und die Matrix hat andere Ergebnisse (viele Paare, Holm). Zwei Karten nebeneinander sind klarer.
    id: 'korrmatrix', icon: 'zusammen',
    get titel() { return L('Wie hängen mehrere Zahlen zusammen?', 'How are several numbers related?'); },
    get zusatz() { return L('Korrelationsmatrix: alle Paare auf einmal', 'correlation matrix: all pairs at once'); },
    get beispiel() { return L('z. B. Wie hängen Lernzeit, Motivation, Schlaf und Note untereinander zusammen?', 'e.g. How are study time, motivation, sleep and grade related to each other?'); },
    get satz() { return [L('Ich möchte wissen, wie ', 'I want to know how '), L(' untereinander zusammenhängen.', ' are related to each other.')]; },
    luecken: [
      { schluessel: 'l1', get frage() { return L('Welche Zahlenspalten? (mindestens drei; für genau zwei gibt es „Hängen zwei Dinge zusammen?“)', 'Which number columns? (at least three; for exactly two there is "Are two things related?")'); }, wahl: 'mehrere', passt: sp => zahl(sp) && !kennung(sp), satz: sp => sp.name, mindestens: 3 }
    ],
    // ⚠ von der Fachperson abzunehmen: eine Art für die ganze Matrix (Vorschlag wie bei der Einzelkorrelation), Lücken paarweise, Holm nur auf Wunsch; eigener Code (korrmatrix.ts).
    fachwort: (w, c) => (empfohleneKorrelationListe(w.l1, c).methode === 'spearman' ? L('Korrelationsmatrix (Rangkorrelation nach Spearman)', "correlation matrix (Spearman's rank correlation)") : L('Korrelationsmatrix (Korrelation nach Pearson)', 'correlation matrix (Pearson correlation)')),
    warum: (w, c) => L(`Es geht um ${w.l1.length} Zahlenspalten und darum, wie jede mit jeder zusammenhängt. Die Korrelationsmatrix zeigt alle ${w.l1.length * (w.l1.length - 1) / 2} Paare auf einmal, mit n und p je Paar. ${empfohleneKorrelationListe(w.l1, c).methode === 'spearman' ? L('Weil mindestens eine Spalte gestuft oder nur der Reihenfolge nach zu verstehen ist, rechnet Statable für alle Paare die Rangkorrelation nach Spearman.', "Because at least one column has few levels or only an order, Statable calculates Spearman's rank correlation for all pairs.") : L('Alle Spalten sind Zahlen mit vielen verschiedenen Werten: Statable rechnet die Korrelation nach Pearson.', 'All columns are numbers with many distinct values: Statable calculates the Pearson correlation.')} Wer viele Paare prüft, findet leicht zufällig einen „deutlichen“ Zusammenhang; dafür gibt es die Holm-Korrektur.`,
      `This is about ${w.l1.length} number columns and how each is related to each other one. The correlation matrix shows all ${w.l1.length * (w.l1.length - 1) / 2} pairs at once, with n and p per pair. ${empfohleneKorrelationListe(w.l1, c).methode === 'spearman' ? L('Weil mindestens eine Spalte gestuft oder nur der Reihenfolge nach zu verstehen ist, rechnet Statable für alle Paare die Rangkorrelation nach Spearman.', "Because at least one column has few levels or only an order, Statable calculates Spearman's rank correlation for all pairs.") : L('Alle Spalten sind Zahlen mit vielen verschiedenen Werten: Statable rechnet die Korrelation nach Pearson.', 'All columns are numbers with many distinct values: Statable calculates the Pearson correlation.')} Testing many pairs easily turns up a "clear" relationship by chance; the Holm correction deals with that.`),
    syntax: w => `${L('* Korrelationsmatrix: Statable rechnet Pearson und Spearman selbst (Lücken paarweise); PSPP liefert hier die Pearson-Werte zum Vergleich (PSPP kennt NONPAR CORR nicht).', '* Correlation matrix: Statable calculates Pearson and Spearman itself (missing values pairwise); PSPP gives the Pearson values here for comparison (PSPP has no NONPAR CORR).')}\nCORRELATIONS /VARIABLES=${v(w.l1)}\n  /PRINT=TWOTAIL\n  /MISSING=PAIRWISE.`,
    titelBlatt: (w, sp) => `${L('Zusammenhänge', 'Relationships')}: ${w.l1.slice(0, 4).map(n => lesbar(sp(n), true)).join(', ')}${w.l1.length > 4 ? ' …' : ''}`
  },
  {
    id: 'uebereinstimmung', icon: 'uebereinstimmung',
    get titel() { return L('Stimmen Beurteilungen überein?', 'Do ratings agree?'); },
    get zusatz() { return L('Kappa, Krippendorff-Alpha, ICC, Bland-Altman', 'kappa, Krippendorff\'s alpha, ICC, Bland-Altman'); },
    get beispiel() { return L('z. B. Vergeben zwei Lehrkräfte bei denselben Aufsätzen dieselben Noten?', 'e.g. Do two teachers give the same grades to the same essays?'); },
    get satz() { return [L('Ich möchte wissen, wie gut die Beurteilungen in ', 'I want to know how well the ratings in '), L(' übereinstimmen.', ' agree.')]; },
    luecken: [{ schluessel: 'l1', get frage() { return L('Welche Spalten enthalten die Beurteilungen oder Kodierungen? (eine Spalte je Beurteilende, mindestens zwei)', 'Which columns hold the ratings or codings? (one column per rater, at least two)'); }, wahl: 'mehrere', passt: (sp, c) => !kennung(sp) && (sp.art === 'zahl' || (sp.art === 'text' && gruppen(sp, c))), satz: sp => sp.name, mindestens: 2 }],
    // ⚠ von der Fachperson abzunehmen: zwei Spalten mit Kategorien => Cohens Kappa (PSPP CROSSTABS), Zahlenspalten => ICC (eigener Code; PSPP 2.1.1 hat kein ICC).
    // Die Auswahl im Blatt bei zwei Zahlenspalten kommt als w.l3[0] ('kappa' | 'icc') an.
    fachwort: (w, c) => { const art = uebereinstimmungsArt(w.l1, c, w.l3[0] as 'kappa' | 'icc' | undefined).art; return art === 'kappa' ? L('Cohens Kappa', "Cohen's kappa") : art === 'inter' ? L("Fleiss' Kappa, Krippendorffs Alpha", "Fleiss' kappa, Krippendorff's alpha") : L('Intraklassen-Korrelation (ICC)', 'intraclass correlation (ICC)'); },
    warum: (w, c) => uebereinstimmungWarum(uebereinstimmungsArt(w.l1, c, w.l3[0] as 'kappa' | 'icc' | undefined).art),
    syntax: (w, c) => uebereinstimmungsArt(w.l1, c, w.l3[0] as 'kappa' | 'icc' | undefined).art === 'kappa'
      ? `CROSSTABS /TABLES=${w.l1[0]} BY ${w.l1[1]}\n  /STATISTICS=KAPPA\n  /CELLS=COUNT.`
      : uebereinstimmungsArt(w.l1, c, w.l3[0] as 'kappa' | 'icc' | undefined).art === 'inter'
      ? `${L("* Fleiss' Kappa, Krippendorffs Alpha, Brennan-Prediger und die prozentuale Übereinstimmung rechnet Statable selbst (PSPP 2.1.3 hat sie nicht); Zahlen gegen R irrCAC geprüft. PSPP liefert die Häufigkeiten je Kodierende.", "* Statable calculates Fleiss' kappa, Krippendorff's alpha, Brennan-Prediger and percent agreement itself (PSPP 2.1.3 does not have them); numbers checked against R irrCAC. PSPP gives the frequencies per coder.")}\nFREQUENCIES VARIABLES=${v(w.l1)}.`
      : `${L('* Den ICC rechnet Statable selbst (PSPP 2.1.3 hat kein ICC); PSPP liefert die Kennzahlen je Beurteilende.', '* Statable calculates the ICC itself (PSPP 2.1.3 has no ICC); PSPP gives the descriptives per rater.')}\nDESCRIPTIVES /VARIABLES=${v(w.l1)}\n  /STATISTICS=MEAN STDDEV MIN MAX.`,
    titelBlatt: (w, sp) => `${L('Übereinstimmung', 'Agreement')}: ${w.l1.slice(0, 3).map(n => lesbar(sp(n), true)).join(', ')}${w.l1.length > 3 ? ' …' : ''}`
  },
  {
    id: 'messwiederholung', icon: 'uhr',
    get titel() { return L('Verändert sich etwas über mehrere Zeitpunkte?', 'Does something change over several time points?'); },
    get zusatz() { return L('drei oder mehr Messungen, Varianzanalyse, Friedman, Cochran-Q', 'three or more measurements, repeated-measures ANOVA, Friedman, Cochran\'s Q'); },
    get beispiel() { return L('z. B. Wie entwickelt sich der Lesetest bei denselben Kindern zu drei Zeitpunkten?', 'e.g. How does a reading test develop for the same children at three time points?'); },
    get satz() { return [L('Ich möchte wissen, ob sich die Werte über ', 'I want to know whether the values change over '), L(' verändern - Gruppen: ', ' - groups: '), L('.', '.')]; },
    luecken: [
      { schluessel: 'l1', get frage() { return L('Welche Zeitpunkte? (Spalten in der richtigen Reihenfolge, mindestens drei)', 'Which time points? (columns in the right order, at least three)'); }, wahl: 'mehrere', passt: (sp, c) => !kennung(sp) && ((zahl(sp) && c.verschieden(sp.name) > 2) || !!c.binaer?.(sp.name)), satz: sp => sp.name, mindestens: 3 },
      { schluessel: 'l2', get frage() { return L('Gruppen? (optional, 2 bis 4 Gruppen)', 'Groups? (optional, 2 to 4 groups)'); }, get ohne() { return L('Ohne Gruppen weiter', 'Continue without groups'); }, wahl: 'eins', passt: (sp, c) => { const n = c.verschieden(sp.name); return n >= 2 && n <= 4 && !kennung(sp); }, satz: sp => art(sp), mindestens: 0 }
    ],
    // ⚠ von der Fachperson abzunehmen: Varianzanalyse mit Messwiederholung (einfaktoriell innerhalb bzw. gemischt 2-4 Gruppen × k Zeitpunkte), eigener Code, Greenhouse-Geisser als Standard.
    fachwort: (w, c) => alleJaNein(w.l1, c) ? L('Cochran-Q-Test mit Paarvergleichen (McNemar, Holm)', "Cochran's Q test with pairwise comparisons (McNemar, Holm)") : (w.l2.length ? L('Varianzanalyse mit Messwiederholung (gemischtes Design)', 'repeated-measures analysis of variance (mixed design)') : L('Varianzanalyse mit Messwiederholung (einfaktoriell)', 'repeated-measures analysis of variance (one-way)')),
    warum: (w, c) => alleJaNein(w.l1, c)
      ? L(`Dieselben Personen wurden zu ${w.l1.length} Zeitpunkten mit Ja oder Nein beantwortet. Cochran-Q prüft, ob sich der Anteil „ja“ über die Zeitpunkte verändert; es zählen nur Personen mit Angaben zu allen Zeitpunkten. Zeigt sich ein Unterschied, vergleicht Statable die Paare von Zeitpunkten mit dem exakten McNemar-Test und passt die p-Werte nach Holm an.`,
        `The same people answered yes or no at ${w.l1.length} time points. Cochran's Q tests whether the share of "yes" changes over the time points; only people with answers at all time points count. If a difference shows, Statable compares the pairs of time points with the exact McNemar test and adjusts the p values by Holm.`)
      : L(`Dieselben Personen wurden zu ${w.l1.length} Zeitpunkten gemessen - die Werte sind also nicht unabhängig. Die Varianzanalyse mit Messwiederholung trennt die Unterschiede zwischen den Personen von denen über die Zeit und prüft, ob sich die Mittelwerte über die Zeit verändern.${w.l2.length ? L(' Mit einer Gruppenspalte zeigt sie zusätzlich, ob die Gruppen sich insgesamt unterscheiden und ob sie sich über die Zeit verschieden entwickeln (Wechselwirkung).', ' With a grouping column it also shows whether the groups differ overall and whether they develop differently over time (interaction).') : ''} Voraussetzung ist Sphärizität (gleich große Varianzen aller Zeitpunkt-Differenzen); der Mauchly-Test prüft sie, die Greenhouse-Geisser-Korrektur gleicht Abweichungen aus. Paarweise Vergleiche zeigen, welche Zeitpunkte sich unterscheiden.`,
      `The same people were measured at ${w.l1.length} time points - so the values are not independent. Repeated-measures analysis of variance separates the differences between people from those over time and tests whether the means change over time.${w.l2.length ? L(' Mit einer Gruppenspalte zeigt sie zusätzlich, ob die Gruppen sich insgesamt unterscheiden und ob sie sich über die Zeit verschieden entwickeln (Wechselwirkung).', ' With a grouping column it also shows whether the groups differ overall and whether they develop differently over time (interaction).') : ''} It assumes sphericity (equal variances of all differences between time points); Mauchly's test checks it and the Greenhouse-Geisser correction compensates for departures. Pairwise comparisons show which time points differ.`),
    syntax: (w, c) => alleJaNein(w.l1, c) ? cochranBefehl(w.l1) : `${L('* Statable rechnet dieses Verfahren selbst (PSPP 2.1.3 kann keine Varianzanalyse mit Messwiederholung); Zahlen gegen R afex::aov_ez geprüft.', '* Statable calculates this method itself (PSPP 2.1.3 cannot do repeated-measures analysis of variance); numbers checked against R afex::aov_ez.')}\n* ${L('Zeitpunkte', 'Time points')}: ${pk(w.l1.join(', '))}${w.l2.length ? `\n* ${L('Gruppen', 'Groups')}: ${pk(w.l2[0])}` : ''}`,
    titelBlatt: (w, sp) => `${L('Verlauf', 'Change over time')}: ${w.l1.slice(0, 3).map(n => lesbar(sp(n), true)).join(', ')}${w.l1.length > 3 ? ' …' : ''}${w.l2.length ? ` ${L('nach', 'by')} ${lesbar(sp(w.l2[0]!), true)}` : ''}`
  },
  {
    id: 'vorhersage', icon: 'vorhersage',
    get titel() { return L('Lässt sich etwas vorhersagen?', 'Can something be predicted?'); },
    get zusatz() { return L('Regression', 'regression'); },
    get beispiel() { return L('z. B. Wie gut sagen Wohnfläche und Stockwerk den Mietpreis voraus?', 'e.g. How well do floor area and floor level predict the rent?'); },
    get satz() { return [L('Ich möchte wissen, wie gut sich ', 'I want to know how well '), L(' aus ', ' can be predicted from '), L(' vorhersagen lässt.', '.')]; },
    luecken: [
      // Genau zwei Werte (ja/nein, 0/1 …) sind als Ziel erlaubt: dann rechnet Statable eine binäre logistische Regression.
      // Welle 3: Text oder beschriftete Gruppen mit 3 bis 12 Stufen sind auch Ziele (multinomiale Regression, bei geordnetem Text ordinal); Zahlen bleiben linear, das Modell ändert „Weitere Wege“ (kategwahl.ts).
      { schluessel: 'l1', get frage() { return L('Was soll vorhergesagt werden?', 'What should be predicted?'); }, wahl: 'eins', passt: (sp, c) => zielArt(sp, c.verschieden(sp.name)) !== null && !kennung(sp), satz: sp => art(sp) },
      // Gruppen-Spalten (Text, nominal, beschriftet; 2-12 Stufen) gehen als 0/1-Hilfsspalten ein (regfaktor.ts, Abschlusstest F1); Text mit mehr Stufen passt nicht.
      { schluessel: 'l2', get frage() { return L('Woraus? (eine oder mehrere)', 'Predicted from what? (one or more)'); }, wahl: 'mehrere', passt: (sp, c) => (sp.art === 'zahl' || (sp.art === 'text' && c.verschieden(sp.name) >= 2 && c.verschieden(sp.name) <= 12)) && !kennung(sp), satz: sp => art(sp), mindestens: 1 }
    ],
    // ⚠ von der Fachperson abzunehmen: Ziel mit genau zwei Werten => binäre logistische Regression (PSPP: LOGISTIC REGRESSION, 95-%-KI der Odds Ratios nach Wald).
    fachwort: (w, c) => (c.verschieden(w.l1[0]!) === 2 ? L('binäre logistische Regression', 'binary logistic regression') : c.zielArt?.(w.l1[0]!) === 'nominal' ? L('multinomiale logistische Regression', 'multinomial logistic regression') : c.zielArt?.(w.l1[0]!) === 'ordnung' ? L('ordinale Regression (Proportional-Odds-Modell)', 'ordinal regression (proportional-odds model)') : w.l2.length > 1 ? L('multiple lineare Regression', 'multiple linear regression') : L('einfache lineare Regression', 'simple linear regression')),
    warum: (w, c) => (c.zielArt?.(w.l1[0]!) === 'nominal'
      ? L('Das, was vorhergesagt werden soll, besteht aus Kategorien ohne Reihenfolge (zum Beispiel Verkehrsmittel). Die multinomiale logistische Regression vergleicht jede Kategorie mit einer Vergleichskategorie und zeigt, wie sich die Chance für sie ändert, wenn eine Vorhersagegröße steigt. Eine lineare Regression würde den Kategorien Zahlen mit gleichen Abständen unterstellen, die es nicht gibt.',
          'What is to be predicted consists of categories without an order (for example means of transport). Multinomial logistic regression compares each category with a reference category and shows how its odds change when a predictor rises. A linear regression would assume numbers with equal distances for the categories, which do not exist.')
      : c.zielArt?.(w.l1[0]!) === 'ordnung'
      ? L('Das, was vorhergesagt werden soll, besteht aus geordneten Stufen (zum Beispiel „nie“ bis „immer“). Die ordinale Regression nutzt die Reihenfolge, ohne gleiche Abstände zwischen den Stufen anzunehmen, und zeigt, wie sich die Chance für eine höhere Stufe ändert, wenn eine Vorhersagegröße steigt.',
          'What is to be predicted consists of ordered levels (for example "never" to "always"). Ordinal regression uses the order without assuming equal distances between the levels and shows how the odds of a higher level change when a predictor rises.')
      : c.verschieden(w.l1[0]!) === 2
      ? L('Das, was vorhergesagt werden soll, hat genau zwei Werte (zum Beispiel ja und nein). Die logistische Regression sagt vorher, wie sich die Chance (Odds) für einen der beiden Werte ändert, wenn eine Vorhersagegröße steigt - und wie gut das Modell zusammen die beiden Gruppen trennt. Eine gewöhnliche lineare Regression würde bei zwei Werten unmögliche Vorhersagen unter 0 und über 1 liefern.',
          'What is to be predicted has exactly two values (for example yes and no). Logistic regression predicts how the odds of one of the two values change when a predictor rises - and how well the model together separates the two groups. An ordinary linear regression would give impossible predictions below 0 and above 1 with two values.')
      : (w.l2.length > 1
      ? L('Mehrere Zahlen sagen gemeinsam eine Zahl vorher. Die Regression zeigt, wie viel jede einzelne beiträgt, wenn die anderen berücksichtigt sind.',
          'Several numbers together predict one number. The regression shows how much each one contributes when the others are taken into account.')
      : L('Eine Zahl sagt eine andere vorher. Die Regression legt die Gerade, die am besten durch die Punktwolke passt.',
          'One number predicts another. The regression fits the line that passes best through the cloud of points.')) + faktorWarum(regTerme(w.l2, c.faktor))),
    // Nominales oder geordnetes Text-Ziel: R rechnet (Aufruf: kategreg.ts `katRCode`, das Blatt setzt ihn selbst ein), kein PSPP-Befehl.
    syntax: (w, c) => c.zielArt?.(w.l1[0]!) === 'nominal' || c.zielArt?.(w.l1[0]!) === 'ordnung' ? '' : c.verschieden(w.l1[0]!) === 2 ? logistikBefehl(w.l2, c.logistik!(w.l1[0]!)!, regTerme(w.l2, c.faktor)) : regressionBefehl(w.l1[0]!, regTerme(w.l2, c.faktor)),
    titelBlatt: (w, sp) => `${L('Vorhersage', 'Prediction')}: ${lesbar(sp(w.l1[0]!), true)}`
  },
  {
    id: 'mediation', icon: 'mediation',
    get titel() { return L('Läuft ein Einfluss über einen Zwischenschritt?', 'Does an influence run through an intermediate step?'); },
    get zusatz() { return L('Mediationsanalyse', 'mediation analysis'); },
    get beispiel() { return L('z. B. Wirkt soziale Unterstützung über die Selbstwirksamkeit auf das Wohlbefinden?', 'e.g. Does social support affect well-being through self-efficacy?'); },
    get satz() { return [L('Ich möchte wissen, ob der Einfluss von ', 'I want to know whether the influence of '), L(' auf ', ' on '), L(' über ', ' runs through '), L(' läuft.', '.')]; },
    luecken: [
      { schluessel: 'l1', get frage() { return L('Was soll wirken? (Ausgangsgröße X)', 'What should have the effect? (starting variable X)'); }, wahl: 'eins', passt: (sp, c) => (zahl(sp) || (sp.art === 'zahl' && c.verschieden(sp.name) === 2)) && !kennung(sp) && !gruppen3(sp, c), satz: sp => art(sp) },
      { schluessel: 'l2', get frage() { return L('Worauf? (Zielgröße Y, eine Zahl)', 'On what? (outcome Y, a number)'); }, wahl: 'eins', passt: sp => zahl(sp) && !kennung(sp), satz: sp => art(sp) },
      { schluessel: 'l3', get frage() { return L('Über welchen Zwischenschritt? (Mediator M, eine Zahl)', 'Through which intermediate step? (mediator M, a number)'); }, wahl: 'eins', passt: (sp, c) => zahl(sp) && !kennung(sp) && !gruppen3(sp, c), satz: sp => art(sp) },
      // Später S-D, G14: die vierte Größe der bedingten und seriellen Mediation (PROCESS 7, 14, 6) unter „Weitere Wege“: der Moderator W oder der zweite Zwischenschritt M2
      { schluessel: 'l4', get frage() { return L('Welche vierte Größe gehört dazu? (optional: der Moderator W oder ein zweiter Zwischenschritt M2, eine Zahl oder zwei Werte)', 'Which fourth variable belongs here? (optional: the moderator W or a second intermediate step M2, a number or two values)'); },
        get davor() { return L('Bedingte oder serielle Mediation, vierte Größe', 'Conditional or serial mediation, fourth variable'); }, get ohne() { return L('Ohne vierte Größe weiter (einfache Mediation)', 'Continue without a fourth variable (simple mediation)'); },
        wahl: 'eins', passt: (sp, c) => (zahl(sp) || (sp.art === 'zahl' && c.verschieden(sp.name) === 2)) && !kennung(sp) && !gruppen3(sp, c), satz: sp => art(sp), mindestens: 0, still: true, stumm: true, weg: true }
    ],
    // ⚠ von der Fachperson abzunehmen: einfache Mediation (PROCESS-Modell 4) ohne Kovariaten; indirekter Effekt mit Perzentil-Bootstrap (5000 Ziehungen, fester Startwert).
    fachwort: () => L('Mediationsanalyse (indirekter Effekt, Bootstrap)', 'mediation analysis (indirect effect, bootstrap)'),
    warum: w => L(`Die Frage ist, ob ${w.l1[0]} auf ${w.l2[0]} nicht nur direkt wirkt, sondern auch über ${w.l3[0]}. Dazu rechnet Statable drei Regressionen: ${w.l1[0]} → ${w.l3[0]} (Pfad a), ${w.l3[0]} → ${w.l2[0]} bei gleichem ${w.l1[0]} (Pfad b) und den direkten Pfad c′. Der indirekte Effekt a·b hat keine einfache Verteilung; sein Konfidenzintervall entsteht deshalb durch Bootstrap (5000 neue Stichproben aus den Daten). Schließt es 0 nicht ein, spricht das statistisch für einen indirekten Effekt.`,
      `The question is whether ${w.l1[0]} affects ${w.l2[0]} not only directly but also through ${w.l3[0]}. Statable runs three regressions: ${w.l1[0]} → ${w.l3[0]} (path a), ${w.l3[0]} → ${w.l2[0]} holding ${w.l1[0]} constant (path b), and the direct path c′. The indirect effect a·b has no simple distribution; its confidence interval is therefore obtained by bootstrap (5000 new samples drawn from the data). If it does not include 0, this is statistical evidence for an indirect effect.`),
    syntax: w => `${L('* Pfade a, b, c′ und c rechnet PSPP (drei Regressionen mit denselben Fällen); den indirekten Effekt a·b mit Bootstrap-Intervall rechnet Statable selbst.', '* PSPP calculates paths a, b, c′ and c (three regressions with the same cases); Statable calculates the indirect effect a·b with its bootstrap interval itself.')}\n${mediationBefehl(w.l1[0]!, w.l3[0]!, w.l2[0]!)}`,
    titelBlatt: (w, sp, c) => (w.l4[0] && c?.prozess === 6
      ? `${L('Serielle Mediation', 'Serial mediation')}: ${lesbar(sp(w.l1[0]!), true)} → ${lesbar(sp(w.l3[0]!), true)} → ${lesbar(sp(w.l4[0]), true)} → ${lesbar(sp(w.l2[0]!), true)}`
      : w.l4[0] && (c?.prozess === 7 || c?.prozess === 14)
      ? `${L('Bedingte Mediation', 'Conditional mediation')}: ${lesbar(sp(w.l1[0]!), true)} → ${lesbar(sp(w.l3[0]!), true)} → ${lesbar(sp(w.l2[0]!), true)} (${lesbar(sp(w.l4[0]), true)})`
      : `${L('Mediation', 'Mediation')}: ${lesbar(sp(w.l1[0]!), true)} → ${lesbar(sp(w.l3[0]!), true)} → ${lesbar(sp(w.l2[0]!), true)}`)
  },
  {
    id: 'moderation', icon: 'moderation',
    get titel() { return L('Hängt ein Zusammenhang von etwas Drittem ab?', 'Does a relationship depend on something else?'); },
    get zusatz() { return L('Moderationsanalyse', 'moderation analysis'); },
    get beispiel() { return L('z. B. Wirkt Unterstützung bei hoher Belastung anders auf die Leistung als bei niedriger?', 'e.g. Does support affect performance differently under high than under low strain?'); },
    get satz() { return [L('Ich möchte wissen, ob der Zusammenhang von ', 'I want to know whether the relationship between '), L(' mit ', ' and '), L(' davon abhängt, wie hoch ', ' depends on '), L(' ist.', '.')]; },
    luecken: [
      { schluessel: 'l1', get frage() { return L('Welche Größe soll wirken? (X)', 'Which variable should have the effect? (X)'); }, wahl: 'eins', passt: (sp, c) => (zahl(sp) || (sp.art === 'zahl' && c.verschieden(sp.name) === 2)) && !kennung(sp) && !gruppen3(sp, c), satz: sp => art(sp) },
      { schluessel: 'l2', get frage() { return L('Worauf? (Zielgröße Y, eine Zahl)', 'On what? (outcome Y, a number)'); }, wahl: 'eins', passt: sp => zahl(sp) && !kennung(sp), satz: sp => art(sp) },
      { schluessel: 'l3', get frage() { return L('Wovon könnte der Zusammenhang abhängen? (Moderator W, eine Zahl oder zwei Werte)', 'What might the relationship depend on? (moderator W, a number or two values)'); }, wahl: 'eins', passt: (sp, c) => (zahl(sp) || (sp.art === 'zahl' && c.verschieden(sp.name) === 2)) && !kennung(sp) && !gruppen3(sp, c), satz: sp => art(sp) }
    ],
    // ⚠ von der Fachperson abzunehmen: einfache Moderation (PROCESS-Modell 1) ohne Kovariaten, Zentrierung am Mittelwert, einfache Steigungen bei M ± 1 SD, Johnson-Neyman.
    fachwort: () => L('Moderationsanalyse (Regression mit Wechselwirkung, einfache Steigungen)', 'moderation analysis (regression with interaction, simple slopes)'),
    warum: w => L(`Die Frage ist, ob die Wirkung von ${w.l1[0]} auf ${w.l2[0]} je nach Höhe von ${w.l3[0]} verschieden stark ist. Statable zentriert ${w.l1[0]} und ${w.l3[0]} am Mittelwert, bildet ihr Produkt und rechnet eine Regression mit diesem Wechselwirkungsterm. Ist er signifikant, zeigen die einfachen Steigungen, wie stark ${w.l1[0]} wirkt, wenn ${w.l3[0]} niedrig (Mittelwert minus 1 Standardabweichung), mittel oder hoch (plus 1 Standardabweichung) ist.`,
      `The question is whether the effect of ${w.l1[0]} on ${w.l2[0]} differs in strength depending on the level of ${w.l3[0]}. Statable centers ${w.l1[0]} and ${w.l3[0]} at the mean, forms their product and runs a regression with this interaction term. If it is significant, the simple slopes show how strongly ${w.l1[0]} acts when ${w.l3[0]} is low (mean minus 1 standard deviation), medium or high (plus 1 standard deviation).`),
    syntax: () => `${L('* Die zentrierten Hilfsspalten und das Produkt entstehen nur für diese Rechnung (TEMPORARY). Einfache Steigungen und Johnson-Neyman rechnet Statable selbst aus den Regressionskoeffizienten.', '* The centered helper columns and the product exist only for this calculation (TEMPORARY). Statable calculates simple slopes and Johnson-Neyman itself from the regression coefficients.')}\n* ${L('Zum Zentrieren nimmt Statable die Mittelwerte aus den Personen, bei denen alle drei Angaben vorliegen.', 'For centering, Statable uses the means from the people with complete data on all three variables.')}`,
    titelBlatt: (w, sp) => `${L('Moderation', 'Moderation')}: ${lesbar(sp(w.l1[0]!), true)} × ${lesbar(sp(w.l3[0]!), true)} → ${lesbar(sp(w.l2[0]!), true)}`
  },
  {
    id: 'mehrebenen', icon: 'ebenen',
    get titel() { return L('Sind meine Daten in Gruppen verschachtelt?', 'Are my data nested in groups?'); },
    get zusatz() { return L('Mehrebenenmodell, gemischtes Modell', 'multilevel model, mixed model'); },
    get beispiel() { return L('z. B. Wie stark unterscheiden sich Klassen im Lesetest - und welche Merkmale der Kinder erklären die Unterschiede, wenn die Klasse berücksichtigt wird?', 'e.g. How much do classes differ in a reading test - and which characteristics of the children explain the differences once class membership is taken into account?'); },
    get satz() { return [L('Ich möchte wissen, wie sich die Unterschiede in ', 'I want to know how the differences in '), L(' auf die Gruppen aus ', ' are distributed across the groups in '), L(' verteilen - erklärt durch ', ' - explained by '), L('.', '.')]; },
    luecken: [
      { schluessel: 'l1', get frage() { return L('Was wurde gemessen? (eine Zahl)', 'What was measured? (a number)'); }, wahl: 'eins', passt: sp => zahl(sp) && !kennung(sp), satz: sp => art(sp) },
      { schluessel: 'l2', get frage() { return L('Welche Spalte nennt die Gruppe? (zum Beispiel Klasse, Seminar oder bei Wiederholungen die Person)', 'Which column names the group? (for example class, seminar or, for repeated measurements, the person)'); }, wahl: 'eins', passt: (sp, c) => (sp.art === 'zahl' || sp.art === 'text') && c.verschieden(sp.name) >= 2, satz: sp => art(sp) },
      { schluessel: 'l3', get frage() { return L('Was könnte die Unterschiede erklären? (optional, Merkmale der Personen)', 'What could explain the differences? (optional, characteristics of the people)'); }, get ohne() { return L('Ohne Erklärung weiter (nur Anteil der Gruppen)', 'Continue without predictors (group share only)'); }, wahl: 'mehrere', passt: (sp, c) => !kennung(sp) && (zahl(sp) || (sp.art !== 'datum' && c.verschieden(sp.name) >= 2 && c.verschieden(sp.name) <= 12)), satz: sp => art(sp), mindestens: 0 },
      // Zweite Gruppierung (gekreuzte Zufallseffekte, 10.11.2026): eingeklappt unter „Weitere Wege“, damit die Karte nur eine neue sichtbare Wahl hat.
      { schluessel: 'l4', get frage() { return L('Ist auch eine zweite Gruppierung eine Stichprobe? (gekreuzte Zufallseffekte, freiwillig): Wenn auch die Reize, Aufgaben oder Bewerter eine Stichprobe sind - jede Person sieht viele Reize, jeder Reiz wird von vielen Personen gesehen', 'Is a second grouping also a sample? (crossed random effects, optional): when the stimuli, tasks or raters are a sample too - every person sees many stimuli, every stimulus is seen by many people'); },
        get davor() { return L('Zweite Gruppierung (gekreuzt, freiwillig)', 'Second grouping (crossed, optional)'); }, get ohne() { return L('Ohne zweite Gruppierung weiter', 'Continue without a second grouping'); },
        wahl: 'eins', passt: (sp, c) => (sp.art === 'zahl' || sp.art === 'text') && c.verschieden(sp.name) >= 2, satz: sp => art(sp), mindestens: 0, still: true, stumm: true, weg: true }
    ],
    // ⚠ von der Fachperson abzunehmen: lineares gemischtes Modell mit zufälligem Achsenabschnitt (lme4::lmer, REML), feste Effekte mit Satterthwaite-Freiheitsgraden (lmerTest),
    // Nullmodell mit ICC, R² nach Nakagawa/Schielzeth; zufällige Steigung nur auf Wunsch. Rechnet R (webR), nicht PSPP.
    fachwort: (w, c) => (w.l1[0] && c.verschieden(w.l1[0]) === 2 ? L('Mehrebenenmodell für Ja/Nein (verallgemeinertes gemischtes Modell, Logit)', 'multilevel model for yes/no (generalized mixed model, logit)') : L('Mehrebenenmodell (lineares gemischtes Modell, REML)', 'multilevel model (linear mixed model, REML)')),
    warum: w => L(`Die Personen gehören zu Gruppen (${w.l2[0] ?? L('zum Beispiel Klassen', 'for example classes')}). Personen derselben Gruppe sind einander oft ähnlicher als Personen verschiedener Gruppen - ihre Werte sind dann nicht unabhängig, und gewöhnliche Tests werden zu optimistisch. Das Mehrebenenmodell berücksichtigt das: Es zeigt zuerst, wie viel der Unterschiede auf die Gruppen entfällt (ICC), und prüft dann, was die Unterschiede erklärt, ohne die Gruppierung zu übergehen.`,
      `The people belong to groups (${w.l2[0] ?? L('zum Beispiel Klassen', 'for example classes')}). People in the same group are often more alike than people in different groups - their values are then not independent, and ordinary tests become too optimistic. The multilevel model takes this into account: it first shows how much of the differences lies with the groups (ICC) and then tests what explains the differences without ignoring the grouping.`),
    syntax: w => `${L('# Statable rechnet dieses Verfahren mit R (lme4, lmerTest). Der gleiche Aufruf in R:', '# Statable calculates this method with R (lme4, lmerTest). The same call in R:')}\nlibrary(lmerTest)\nm0 <- lmer(${rn(w.l1[0]!)} ~ 1 + (1 | ${rn(w.l2[0]!)})${w.l4[0] ? ` + (1 | ${rn(w.l4[0])})` : ''}, data = daten, REML = TRUE)   # ${L('Nullmodell: ICC', 'null model: ICC')}${w.l3.length ? `\nm1 <- lmer(${rn(w.l1[0]!)} ~ ${w.l3.map(rn).join(' + ')} + (1 | ${rn(w.l2[0]!)})${w.l4[0] ? ` + (1 | ${rn(w.l4[0])})` : ''}, data = daten, REML = TRUE)\nsummary(m1)   # ${L('feste Effekte mit Satterthwaite-Freiheitsgraden', 'fixed effects with Satterthwaite degrees of freedom')}` : '\nsummary(m0)'}`,
    titelBlatt: (w, sp) => `${L('Mehrebenenmodell', 'Multilevel model')}: ${lesbar(sp(w.l1[0]!), true)} ${L('nach', 'by')} ${lesbar(sp(w.l2[0]!), true)}${w.l4[0] ? ` ${L('und', 'and')} ${lesbar(sp(w.l4[0]), true)}` : ''}`
  },
  {
    id: 'meta', icon: 'studien',
    get titel() { return L('Studien zusammenfassen (Meta-Analyse)', 'Combine studies (meta-analysis)'); },
    get zusatz() { return L('Meta-Analyse, Forest-Plot: Ergebnisse mehrerer Studien, keine Personendaten', 'meta-analysis, forest plot: results of several studies, no individual data'); },
    get beispiel() { return L('z. B. Wie groß ist die Wirkung einer Leseförderung, wenn zehn Studien jeweils einen eigenen Effekt gefunden haben?', 'e.g. How large is the effect of a reading intervention when ten studies each found their own effect?'); },
    get satz() { return [L('Ich möchte die Ergebnisse mehrerer Studien zu einem Gesamtergebnis zusammenfassen.', 'I want to combine the results of several studies into one overall result.')]; },
    // Die Daten sind hier Studien, nicht Personen: Die Eingabetabelle (Zeile = Studie) steht im Blatt (MetaEingabe.svelte), nicht in den Daten des Projekts.
    luecken: [],
    // ⚠ von der Fachperson abzunehmen: Random-Effects-Modell mit REML (metafor::rma, wie JASP „Classical Meta-Analysis“ und jamovi MAJOR), Prädiktionsintervall, Egger-Test klassisch (regtest, model = "lm").
    // Rechnet R (webR), nicht PSPP.
    fachwort: () => L('Meta-Analyse (Random-Effects-Modell, REML)', 'meta-analysis (random-effects model, REML)'),
    warum: () => L('Jede Studie liefert einen eigenen Effekt, und die Studien sind unterschiedlich genau. Die Meta-Analyse fasst sie zu einem gemeinsamen Wert zusammen und gewichtet genaue Studien stärker. Weil die wahren Effekte von Studie zu Studie verschieden sein können (andere Stichprobe, anderes Verfahren), rechnet Statable ein Random-Effects-Modell: Es schätzt neben dem Durchschnitt auch, wie stark die Studien untereinander streuen (Heterogenität, I², τ²).',
      'Each study delivers its own effect, and the studies differ in precision. The meta-analysis combines them into one value and gives more weight to precise studies. Because the true effects can differ from study to study (other sample, other procedure), Statable fits a random-effects model: besides the average it estimates how much the studies vary among themselves (heterogeneity, I², τ²).'),
    syntax: () => `${L('# Statable rechnet dieses Verfahren mit R (metafor). Der Aufruf steht nach dem Rechnen unter „Für Fachleute“.', '# Statable calculates this method with R (metafor). The call is shown under "For specialists" after calculating.')}\nlibrary(metafor)\nres <- rma(yi, vi, data = d, method = "REML")`,
    titelBlatt: () => L('Meta-Analyse', 'Meta-analysis')
  },
  {
    id: 'kaplanmeier', icon: 'ueberleben',
    get titel() { return L('Wie lange dauert es bis zu einem Ereignis?', 'How long does it take until an event?'); },
    get zusatz() { return L('Überlebenszeit (Kaplan-Meier, Log-Rank-Test): Zeit und Ja/Nein, Gruppen optional', 'survival time (Kaplan-Meier, log-rank test): time and yes/no, groups optional'); },
    get beispiel() { return L('z. B. Nach wie vielen Semestern kommt es zum Studienabbruch - und unterscheiden sich Studiengänge darin? Oder: Wie lange dauert es, bis Kinder ein Lernziel erreichen?', 'e.g. After how many semesters do students drop out of their studies - and do degree programs differ? Or: how long does it take until children reach a learning goal?'); },
    // Das Leerzeichen vor jeder Lücke ist geschützt (U+00A0): Der Umbruch trennt nie „Zeit:“ von der Auswahl (Abnahme 3, K4f).
    get satz() { return [L('Ich möchte wissen, wie lange es bis zum Ereignis dauert - Zeit:\u00a0', 'I want to know how long it takes until the event - time:\u00a0'), L('; Ereignis (ja/nein):\u00a0', '; event (yes/no):\u00a0'), L('; Gruppen:\u00a0', '; groups:\u00a0'), L('.', '.')]; },
    luecken: [
      { schluessel: 'l1', get frage() { return L('Wie lange wurde beobachtet? (die Zeit bis zum Ereignis oder bis zum Ende der Beobachtung, eine Zahl)', 'How long was each person observed? (time to the event or to the end of observation, a number)'); }, wahl: 'eins', passt: (sp, c) => zahl(sp) && !kennung(sp) && c.verschieden(sp.name) > 2, satz: sp => art(sp) },
      { schluessel: 'l2', get frage() { return L('Welche Spalte sagt, ob das Ereignis eingetreten ist? (zum Beispiel 0 = zensiert, 1 = Ereignis; haben alle das Ereignis erlebt, genügt ein Wert)', 'Which column says whether the event occurred? (for example 0 = censored, 1 = event; if everyone experienced the event, one value is enough)'); }, wahl: 'eins', passt: (sp, c) => { const n = c.verschieden(sp.name); return n >= 1 && n <= 2 && !kennung(sp); }, satz: sp => art(sp),
        // Eine Spalte mit nur einem Wert ist erlaubt (Prüfung B5): Die Prüfliste sagt, welcher Wert es ist und ob gerechnet werden kann (alle mit Ereignis: ja; alle zensiert: nein).
        keine: () => L('Gesucht ist eine Spalte mit zwei Werten, zum Beispiel 0 = zensiert (Beobachtung endete ohne Ereignis) und 1 = Ereignis. Haben alle das Ereignis erlebt, genügt eine Spalte mit nur diesem einen Wert. Alle Spalten hier haben mehr als zwei verschiedene Werte.', 'Looking for a column with two values, for example 0 = censored (observation ended without the event) and 1 = event. If everyone experienced the event, a column with just that one value is enough. All columns here have more than two distinct values.') },
      { schluessel: 'l3', get frage() { return L('Gruppen vergleichen? (optional: die Spalte, die die Gruppen nennt)', 'Compare groups? (optional: the column that names the groups)'); }, get ohne() { return L('Ohne Gruppen weiter (eine Kurve)', 'Continue without groups (one curve)'); }, wahl: 'eins', passt: (sp, c) => { const n = c.verschieden(sp.name); return n >= 2 && n <= 8 && !kennung(sp); }, satz: sp => art(sp), mindestens: 0 },
      // Welle 7, M1: Cox-Regression unter „Weitere Wege“ - die Spalten, die das Risiko erklären sollen (Zahl oder Gruppen mit 2 bis 12 Stufen); R (survival) rechnet. Die Gruppen-Spalte darf auch hier stehen.
      { schluessel: 'l4', get frage() { return L('Welche Angaben sollen das Risiko erklären? (optional: eine oder mehrere Spalten für die Cox-Regression)', 'Which characteristics should explain the risk? (optional: one or more columns for the Cox regression)'); },
        get davor() { return L('Cox-Regression, Spalten', 'Cox regression, columns'); }, get ohne() { return L('Ohne Cox-Regression weiter', 'Continue without a Cox regression'); },
        wahl: 'mehrere', passt: (sp, c) => (sp.art === 'zahl' || (sp.art === 'text' && c.verschieden(sp.name) >= 2 && c.verschieden(sp.name) <= 12)) && !kennung(sp), satz: sp => art(sp), mindestens: 0, still: true, stumm: true, weg: true }
    ],
    // ⚠ von der Fachperson abzunehmen: Kaplan-Meier (Produkt-Limit) mit Greenwood-Standardfehler und 95 %-Intervall auf der Log-Skala (wie R survfit, conf.type = "log"),
    // Median wie print(survfit) (survival:::survmean), Log-Rank-Test (Mantel-Cox) wie survdiff(rho = 0), paarweise mit Holm. Eigener Code, geprüft gegen R survival; PSPP hat dafür kein Verfahren.
    fachwort: w => (w.l4.length ? L('Kaplan-Meier-Schätzer, Log-Rank-Test, Cox-Regression (Efron für gleiche Zeiten)', 'Kaplan-Meier estimator, log-rank test, Cox regression (Efron for tied times)') : L('Kaplan-Meier-Schätzer, Log-Rank-Test', 'Kaplan-Meier estimator, log-rank test')),
    warum: w => L(`Die Frage ist nicht nur, ob das Ereignis eintritt, sondern wie lange es dauert. Wer bei Ende der Beobachtung das Ereignis noch nicht erlebt hat, ist zensiert: Man weiß nur, dass es bis dahin nicht eingetreten ist. Würde man diese Personen weglassen oder als Ereignis zählen, wäre das Ergebnis verzerrt. Der Kaplan-Meier-Schätzer nutzt alle Personen und schätzt für jeden Zeitpunkt den Anteil, bei dem das Ereignis noch nicht eingetreten ist (Überlebensfunktion).${w.l3[0] ? L(` Der Log-Rank-Test prüft, ob sich die Kurven der Gruppen unterscheiden.`, ` The log-rank test checks whether the curves of the groups differ.`) : ''}`,
      `The question is not only whether the event occurs but how long it takes. Anyone who has not experienced the event when observation ends is censored: all we know is that it had not occurred by then. Leaving these people out or counting them as events would bias the result. The Kaplan-Meier estimator uses everybody and estimates, for each point in time, the proportion for whom the event has not yet occurred (survival function).${w.l3[0] ? L(` Der Log-Rank-Test prüft, ob sich die Kurven der Gruppen unterscheiden.`, ` The log-rank test checks whether the curves of the groups differ.`) : ''}`),
    syntax: kaplanSyntax,
    titelBlatt: (w, sp) => `${L('Zeit bis zum Ereignis', 'Time to event')} (${lesbar(sp(w.l1[0]!), true)})${w.l3[0] ? ` ${L('nach', 'by')} ${lesbar(sp(w.l3[0]), true)}` : ''}`
  },
  {
    id: 'kategorien', icon: 'mehrfach',
    get titel() { return L('Offene Antworten ordnen', 'Order open answers'); },
    get zusatz() { return L('Freitexte kategorisieren: kurze Antworten in Kategorien einteilen und zählen', 'categorizing free text: sort short answers into categories and count them'); },
    get beispiel() { return L('z. B. Was hat im Seminar gefehlt? Kurze Antworten in Kategorien wie Praxisbezug, Rückmeldung oder Zeit einteilen und zählen, wie viele Personen jede Kategorie nennen.', 'e.g. What was missing in the seminar? Sort short answers into categories such as practice, feedback or time and count how many people mention each category.'); },
    // Das Leerzeichen vor der Lücke ist geschützt (U+00A0): Der Umbruch trennt nie „Spalte“ von der Auswahl.
    get satz() { return [L('Ich möchte die offenen Antworten der Spalte ', 'I want to sort the open answers of the column '), L(' in Kategorien ordnen.', ' into categories.')]; },
    luecken: [
      { schluessel: 'l1', get frage() { return L('Welche Spalte enthält die offenen Antworten? (Text, eine Antwort je Zeile)', 'Which column contains the open answers? (text, one answer per row)'); }, wahl: 'eins', passt: (sp, c) => sp.art === 'text' && !kennung(sp) && c.gueltig(sp.name) >= 1, satz: sp => art(sp),
        keine: () => L('Gesucht ist eine Textspalte mit den Antworten. In diesen Daten gibt es keine Spalte mit Text.', 'Looking for a text column with the answers. These data have no column with text.') }
    ],
    // Statable ordnet nichts selbst zu (keine KI, Datenschutz, Nachvollziehbarkeit): Die Person legt Kategorien fest und ordnet zu; Statable zählt und schreibt Ergebnisspalten.
    // Das Ergebnis beschreibt die vorliegenden Antworten - kein Test. Gedacht für kurze Freitexte im Fragebogen, nicht für Interviews (Kuckartz & Rädiker 2022; Mayring 2022).
    fachwort: () => L('Kategorisieren offener Antworten (Häufigkeiten, Zweitkodierung)', 'categorizing open answers (frequencies, second coding)'),
    warum: () => L('Offene Antworten sind Text. Zum Zählen und Vergleichen müssen sie erst in Kategorien eingeteilt werden. Die Kategorien legt die auswertende Person fest, sie ordnet auch jede Antwort zu; Statable zählt und schreibt auf Wunsch Spalten in die Daten (Statable ordnet nichts selbst zu). Das passt für kurze Antworten im Fragebogen. Interviews und lange Texte gehören in ein Programm für qualitative Daten.',
      'Open answers are text. To count and compare them they must first be sorted into categories. The person analysing the data defines the categories and assigns each answer; Statable counts and, on request, writes columns into the data (Statable assigns nothing itself). This suits short answers in a questionnaire. Interviews and long texts belong in a program for qualitative data.'),
    syntax: w => `* ${L('Offene Antworten ordnen: Statable ordnet nichts selbst zu. Spalte', 'Ordering open answers: Statable does not assign anything itself. Column')}: ${pk(w.l1[0])}.`,
    titelBlatt: (w, sp) => `${L('Offene Antworten ordnen', 'Ordering open answers')}: ${lesbar(sp(w.l1[0]!), true)}`
  },
  {
    id: 'einzelfall', icon: 'einzelfall',
    get titel() { return L('Wirkt eine Förderung bei einer Person?', 'Does an intervention work for one person?'); },
    get zusatz() { return L('Einzelfallanalyse, Phase A und B', 'single-case analysis, phase A and B'); },
    get beispiel() { return L('z. B. Wie viele Wörter liest ein Kind mit Förderbedarf pro Minute vor und nach Beginn der Leseförderung?', 'e.g. How many words per minute does a child with special educational needs read before and after the reading intervention begins?'); },
    get satz() { return [L('Ich möchte wissen, ob sich ', 'I want to know whether '), L(' durch die Förderung verändert - Phase (A/B): ', ' changes with the intervention - phase (A/B): '), L('; Messzeitpunkt: ', '; measurement occasion: '), L('; mehrere Personen: ', '; several people: '), L('.', '.')]; },
    luecken: [
      { schluessel: 'l1', get frage() { return L('Was wurde wiederholt gemessen? (der Messwert, eine Zahl)', 'What was measured repeatedly? (the measure, a number)'); }, wahl: 'eins', passt: (sp, c) => zahl(sp) && !kennung(sp) && c.verschieden(sp.name) > 2, satz: sp => art(sp) },
      { schluessel: 'l2', get frage() { return L('Welche Spalte sagt, ob die Messung zur Ausgangslage (A) oder zur Förderung (B) gehört? (genau zwei Werte)', 'Which column says whether the measurement belongs to baseline (A) or intervention (B)? (exactly two values)'); }, wahl: 'eins', passt: (sp, c) => c.verschieden(sp.name) === 2 && !kennung(sp), satz: sp => art(sp) },
      { schluessel: 'l3', get frage() { return L('Messzeitpunkt? (optional: Zahl oder Datum; ohne Angabe gilt die Reihenfolge der Zeilen)', 'Measurement occasion? (optional: number or date; without it, the order of the rows applies)'); }, get ohne() { return L('Ohne Messzeitpunkt weiter (Zeilenfolge gilt)', 'Continue without it (row order applies)'); }, wahl: 'eins', passt: (sp, c) => (zahl(sp) || sp.art === 'datum') && !kennung(sp) && c.verschieden(sp.name) > 2, satz: sp => art(sp), mindestens: 0 },
      { schluessel: 'l4', get frage() { return L('Mehrere Personen oder Fälle? (optional: die Spalte, die sie unterscheidet)', 'Several people or cases? (optional: the column that tells them apart)'); }, get ohne() { return L('Ohne mehrere Personen weiter (ein Fall)', 'Continue without it (one case)'); }, wahl: 'eins', passt: (sp, c) => { const n = c.verschieden(sp.name); return n >= 2 && n <= 30; }, satz: sp => art(sp), mindestens: 0 }
    ],
    // ⚠ von der Fachperson abzunehmen: Einzelfallanalyse A-B-Design mit NAP (Hauptwert), PND, Tau-U und baseline-korrigiertem Tau; eigener Code, geprüft gegen R scan.
    fachwort: () => L('Einzelfallanalyse (A-B-Design: NAP, Tau-U, baseline-korrigiertes Tau)', 'single-case analysis (A-B design: NAP, Tau-U, baseline-corrected Tau)'),
    warum: w => L(`Die Frage ist, ob ${w.l1[0]} in der Förderphase (B) anders liegt als in der Ausgangslage (A). Bei einer einzigen Person (oder wenigen) gelten Gruppentests nicht: Die Messungen folgen aufeinander und hängen zusammen. Statable vergleicht darum alle Paare aus je einer Messung in A und in B (NAP, Nonoverlap of All Pairs) und zeigt Tau-U, das baseline-korrigierte Tau und den Anteil nicht überlappender Daten (PND). Ein Trend schon in der Ausgangslage wird gemeldet und von Tau-U bzw. dem baseline-korrigierten Tau berücksichtigt.${w.l4[0] ? L(` Jeder Wert von ${w.l4[0]} gilt als eigener Fall; zusätzlich gibt es Mittel über die Fälle.`, ` Every value of ${w.l4[0]} counts as a case of its own; means across the cases are added.`) : ''}`,
      `The question is whether ${w.l1[0]} lies differently in the intervention phase (B) than at baseline (A). With a single person (or a few), group tests do not apply: the measurements follow each other and are related. Statable therefore compares all pairs of one measurement in A and one in B (NAP, nonoverlap of all pairs) and shows Tau-U, baseline-corrected Tau and the percentage of non-overlapping data (PND). A trend already during baseline is reported and taken into account by Tau-U and baseline-corrected Tau.${w.l4[0] ? L(` Jeder Wert von ${w.l4[0]} gilt als eigener Fall; zusätzlich gibt es Mittel über die Fälle.`, ` Every value of ${w.l4[0]} counts as a case of its own; means across the cases are added.`) : ''}`),
    syntax: w => `${L('* Einzelfallanalyse: Statable rechnet selbst (PSPP hat dafür kein Verfahren).', '* Single-case analysis: Statable computes this itself (PSPP has no procedure for this).')}\n* ${pk(L(`Messwert: ${w.l1[0]}; Phase: ${w.l2[0]}${w.l3[0] ? L(`; Messzeitpunkt: ${w.l3[0]}`, `; occasion: ${w.l3[0]}`) : ''}${w.l4[0] ? L(`; Fall: ${w.l4[0]}`, `; case: ${w.l4[0]}`) : ''}.`, `Measure: ${w.l1[0]}; phase: ${w.l2[0]}${w.l3[0] ? L(`; Messzeitpunkt: ${w.l3[0]}`, `; occasion: ${w.l3[0]}`) : ''}${w.l4[0] ? L(`; Fall: ${w.l4[0]}`, `; case: ${w.l4[0]}`) : ''}.`))}`,
    titelBlatt: (w, sp) => `${L('Einzelfall', 'Single case')}: ${lesbar(sp(w.l1[0]!), true)}`
  },
  {
    // Welle 4, G1 (Fachblatt WELLE4-FAELLE-OFFENE-ANTWORTEN.md): Fälle vergleichen nach Schoonenboom - beschreibend, ohne Test; Statable rechnet selbst (lib/faelle.ts), PSPP läuft nicht.
    id: 'faelle', icon: 'faelle',
    get titel() { return L('Wie passen Zahlen und Aussagen zusammen?', 'How do numbers and statements fit together?'); },
    get zusatz() { return L('Fälle vergleichen, Mixed Methods', 'comparing cases, mixed methods'); },
    get beispiel() { return L('z. B. Wie hängen Praktikumsnote und Selbstwirksamkeit mit dem zusammen, was Studierende im Interview über ihr Praktikum sagen?', 'e.g. How do the practicum grade and self-efficacy relate to what student teachers say about their practicum in interviews?'); },
    get satz() { return [L('Ich möchte die Fälle vergleichen. Zahlen und Gruppen: ', 'I want to compare the cases. Numbers and groups: '), L('; Aussagen: ', '; statements: '), '.', '.']; },
    luecken: [
      { schluessel: 'l1', get frage() { return L('Welche Zahlen oder Gruppen sollen die Fälle ordnen? (1 bis 4 Spalten)', 'Which numbers or groups should organize the cases? (1 to 4 columns)'); }, wahl: 'mehrere', passt: (sp, c) => sp.art !== 'datum' && !fallName(sp) && (sp.art === 'zahl' || (c.verschieden(sp.name) >= 1 && c.verschieden(sp.name) <= 12)), satz: sp => art(sp), mindestens: 1, hoechstens: 4 },
      { schluessel: 'l2', get frage() { return L('Welche Aussagen sollen daneben stehen? (1 bis 3 Textspalten, zum Beispiel Interviewzitate oder offene Antworten)', 'Which statements should be shown next to them? (1 to 3 text columns, for example interview quotes or open answers)'); }, wahl: 'mehrere', passt: sp => sp.art === 'text' && !fallName(sp), satz: sp => art(sp), mindestens: 1, hoechstens: 3,
        keine: () => L('Statable braucht für die Aussagen eine Spalte mit Text, zum Beispiel Zitate aus Interviews. Aus MAXQDA lassen sich Dokumentvariablen und Segmente als Excel-Tabelle exportieren und hier öffnen.', 'For the statements Statable needs a column with text, for example quotes from interviews. In MAXQDA, document variables and segments can be exported as an Excel table and opened here.') },
      // Optional und eingeklappt: Mit Kennung bleiben Zuordnungen, Notizen und Markierungen erhalten, auch wenn sich die Zeilen ändern.
      { schluessel: 'l3', get frage() { return L('Kennung (optional): eine Spalte, deren Werte jeden Fall eindeutig benennen', 'Case ID (optional): a column whose values name each case uniquely'); },
        get davor() { return L('Kennung', 'Case ID'); }, get ohne() { return L('Ohne Kennung weiter', 'Continue without a case ID'); },
        wahl: 'eins', passt: (sp, c) => sp.art !== 'datum' && c.verschieden(sp.name) > 1 && c.verschieden(sp.name) === c.gueltig(sp.name) && (sp.art === 'text' || fallName(sp)), satz: sp => art(sp), mindestens: 0, still: true, stumm: true, weg: true }
    ],
    // ⚠ von der Fachperson abzunehmen: Case Comparison Table nach Schoonenboom & Johnson (2021); Teilung am Median als Startpunkt, kein Befund.
    fachwort: () => L('Fallvergleich (Case Comparison Table, Mixed Methods; beschreibend, ohne Test)', 'case comparison (case comparison table, mixed methods; descriptive, no test)'),
    warum: () => L('Die Frage ist, wie Zahlen und Aussagen zu denselben Fällen zusammenpassen. Statable stellt jeden Fall in eine Zeile: die Zahlen und Gruppen und daneben die Texte. Aus den Zahlen entsteht ein erster Vorschlag für Gruppen (Zahlenspalten werden am Median geteilt, Gruppenspalten nach ihren Stufen). Die Texte zu lesen, Fälle umzusortieren und die Gruppen zu deuten bleibt Aufgabe der Forschenden. Es gibt keinen Test und kein p: Die Tabelle beschreibt diese Fälle und lässt sich nicht auf andere Personen übertragen (Schoonenboom & Johnson, 2021; Schoonenboom, 2023).',
      'The question is how numbers and statements fit together for the same cases. Statable puts each case in one row: the numbers and groups with the texts next to them. The numbers give a first suggestion for groups (number columns are split at the median, group columns by their levels). Reading the texts, re-sorting cases and interpreting the groups remains the researchers\' task. There is no test and no p: the table describes these cases and cannot be generalized to other people (Schoonenboom & Johnson, 2021; Schoonenboom, 2023).'),
    syntax: w => `${L('* Fälle vergleichen: Statable beschreibt die Fälle selbst (PSPP hat dafür kein Verfahren; es gibt keinen Test).', '* Comparing cases: Statable describes the cases itself (PSPP has no procedure for this; there is no test).')}\n* ${pk(L(`Zahlen und Gruppen: ${w.l1.join(', ')}; Aussagen: ${w.l2.join(', ')}.`, `Numbers and groups: ${w.l1.join(', ')}; statements: ${w.l2.join(', ')}.`))}`,
    titelBlatt: (w, sp) => `${L('Fälle vergleichen', 'Comparing cases')}: ${w.l1.slice(0, 2).map(n => lesbar(sp(n), true)).join(', ')}${w.l1.length > 2 ? ' …' : ''}`
  },
  {
    // Später S-E (Bauer B), Fachblatt SPAETER-E Abschnitt 3: Zeitreihen einfach - Verlauf, gleitender Mittelwert, linearer Trend mit Intervall über die effektive Fallzahl, Autokorrelation, klassische Zerlegung. Prognose (ARIMA, Automatik, Glättung) ist ein eigener Abschnitt am Blatt (lib/prognose.ts, rechnet R auf Klick). Statable rechnet den Rest selbst (lib/zeitreihe.ts), PSPP läuft nicht.
    id: 'zeitreihen', icon: 'zeitreihe',
    get titel() { return L('Wie entwickelt sich ein Wert über die Zeit?', 'How does a value develop over time?'); },
    get zusatz() { return L('Zeitreihe: Verlauf, Trend, Autokorrelation, Saison, Prognose (ARIMA)', 'time series: course, trend, autocorrelation, season, forecast (ARIMA)'); },
    get beispiel() { return L('z. B. Wie haben sich die Anmeldungen zu einem Kurs über zehn Jahre entwickelt - und gibt es ein Muster über das Jahr?', 'e.g. How have enrolments in a course developed over ten years - and is there a pattern across the year?'); },
    // Das Leerzeichen vor jeder Lücke ist geschützt (U+00A0): Der Umbruch trennt nie ein Wort von der Auswahl.
    get satz() { return [L('Ich möchte wissen, wie sich ', 'I want to know how '), L(' über die Zeit entwickelt - Zeitpunkt: ', ' develops over time - point in time: '), L('.', '.')]; },
    luecken: [
      { schluessel: 'l1', get frage() { return L('Welcher Wert wurde über die Zeit gemessen? (eine Zahl, eine Zeile je Zeitpunkt)', 'Which value was measured over time? (a number, one row per point in time)'); }, wahl: 'eins', passt: sp => zahl(sp) && !kennung(sp), satz: sp => art(sp),
        keine: () => L('Gesucht ist eine Spalte mit Zahlen, zum Beispiel Anmeldungen je Monat. In diesen Daten gibt es keine.', 'Looking for a column with numbers, for example enrolments per month. These data have none.') },
      { schluessel: 'l2', get frage() { return L('Welche Spalte nennt den Zeitpunkt? (ein Datum, zum Beispiel 2024-03-01; ohne Angabe gilt die Reihenfolge der Zeilen)', 'Which column names the point in time? (a date, for example 2024-03-01; without it the order of the rows applies)'); },
        get ohne() { return L('Ohne Zeitpunkt weiter (Reihenfolge der Zeilen gilt)', 'Continue without it (the order of the rows applies)'); }, wahl: 'eins', passt: sp => sp.art === 'datum', satz: sp => art(sp), mindestens: 0 },
      // Später S-F2 (C.2): zweite Reihe unter „Weitere Wege“ - zeigt die Kreuzkorrelation (R rechnet nicht, JavaScript)
      { schluessel: 'l3', get frage() { return L('Läuft eine zweite Reihe voraus oder hinterher? (optional: eine zweite Zahlenspalte für die Kreuzkorrelation, auf denselben Zeilen)', 'Does a second series lead or follow? (optional: a second number column for the cross-correlation, on the same rows)'); },
        get davor() { return L('Kreuzkorrelation, zweite Reihe', 'Cross-correlation, second series'); }, get ohne() { return L('Ohne Kreuzkorrelation weiter', 'Continue without a cross-correlation'); },
        wahl: 'eins', passt: sp => zahl(sp) && !kennung(sp), satz: sp => art(sp), mindestens: 0, still: true, stumm: true, weg: true }
    ],
    // ⚠ von der Fachperson abzunehmen: gleitender Mittelwert (2 × k bei geradem Fenster), linearer Trend mit 95-%-Intervall (t, n − 2) und, bei Autokorrelation, mit effektiver Fallzahl (Santer et al. 2000), ACF wie stats::acf,
    // Ljung-Box, Durbin-Watson (ohne p), klassische Zerlegung wie stats::decompose. Eigener Code (lib/zeitreihe.ts), geprüft gegen R. Kein Auffüllen von Lücken; die Prognose rechnet R auf Klick (Fachblatt PROGNOSE-ARIMA).
    fachwort: () => L('Zeitreihe (linearer Trend, Autokorrelation, klassische Zerlegung)', 'time series (linear trend, autocorrelation, classical decomposition)'),
    warum: w => L(`Die Frage ist, wie sich ${w.l1[0]} im Lauf der Zeit verhält. Bei einer Zeitreihe hängen aufeinanderfolgende Werte oft voneinander ab; gewöhnliche Tests gehen davon aus, dass sie unabhängig sind. Statable zeigt darum den Verlauf, einen gleitenden Mittelwert und einen linearen Trend. Zeigt die Autokorrelation (Ljung-Box-Test) eine Abhängigkeit, rechnet es das Intervall des Trends zusätzlich mit einer kleineren effektiven Fallzahl. Bei genügend Länge trennt eine klassische Zerlegung Trend, Saison und Rest. Eine Prognose rechnet Statable nur auf Klick, im Abschnitt „Wie könnte es weitergehen?“.`,
      `The question is how ${w.l1[0]} behaves over time. In a time series successive values often depend on each other; ordinary tests assume that they are independent. Statable therefore shows the course, a moving average and a linear trend. If the autocorrelation (Ljung-Box test) shows a dependence, it also calculates the interval of the trend with a smaller effective sample size. With enough length, a classical decomposition separates trend, season and remainder. Statable calculates a forecast only on request, in the section "What might happen next?".`),
    syntax: w => `${L('* Zeitreihe: Statable rechnet selbst (PSPP hat dafür nur wenige Befehle).', '* Time series: Statable calculates this itself (PSPP has only a few commands for it).')}\n* ${pk(L(`Wert: ${w.l1[0]}; Zeitpunkt: ${w.l2[0] ?? L('Reihenfolge der Zeilen', 'row order')}.`, `Value: ${w.l1[0]}; point in time: ${w.l2[0] ?? L('Reihenfolge der Zeilen', 'row order')}.`))}`,
    titelBlatt: (w, sp) => `${L('Zeitreihe', 'Time series')}: ${lesbar(sp(w.l1[0]!), true)}`
  },
  {
    // Später S-E (Bauer B), Fachblatt SPAETER-E Abschnitt 4: Clusteranalyse Ward und k-Means - R rechnet (stats), keine p-Werte zu Gruppenunterschieden, Zugehörigkeit nur auf Wunsch als neue Spalte.
    id: 'cluster', icon: 'cluster',
    get titel() { return L('Welche Gruppen stecken in den Daten?', 'Which groups are in the data?'); },
    get zusatz() { return L('Clusteranalyse: Ward, k-Means, Silhouette', 'cluster analysis: Ward, k-means, silhouette'); },
    get beispiel() { return L('z. B. Lassen sich Studierende nach Motivation, Angst und Lernzeit in Gruppen einteilen, die sich ähneln?', 'e.g. Can students be divided into groups that are alike by motivation, anxiety and study time?'); },
    get satz() { return [L('Ich möchte Gruppen finden, die sich ähneln - Merkmale: ', 'I want to find groups that are alike - features: '), L('.', '.')]; },
    luecken: [
      { schluessel: 'l1', get frage() { return L('Welche Merkmale sollen die Gruppen bilden? (mindestens zwei Zahlenspalten, höchstens 30)', 'Which features should form the groups? (at least two number columns, at most 30)'); }, wahl: 'mehrere', passt: sp => zahl(sp) && !kennung(sp), satz: sp => sp.name, mindestens: 2, hoechstens: 30,
        keine: () => L('Gesucht sind Spalten mit Zahlen. Für Text oder Kategorien braucht es ein anderes Abstandsmaß (Gower), das Statable noch nicht rechnet.', 'Looking for columns with numbers. Text or categories need another distance measure (Gower), which Statable does not calculate yet.') }
    ],
    // ⚠ von der Fachperson abzunehmen: Ward-Verfahren (hclust ward.D2, euklidisch) auf z-standardisierten Werten und k-Means (Hartigan-Wong, 25 Starts, fester Startwert) rechnen in R (stats); Silhouette, Streuung, ARI, Profile und η² (nur beschreibend) in lib/cluster.ts.
    // Keine p-Werte zu Clusterunterschieden: Die Gruppen wurden so gewählt, dass sich die Merkmale unterscheiden.
    fachwort: () => L('Clusteranalyse (Ward-Verfahren oder k-Means, z-standardisiert)', 'cluster analysis (Ward\'s method or k-means, z-standardized)'),
    warum: () => L('Die Frage ist, ob sich Fälle nach mehreren Zahlen in Gruppen einteilen lassen, die sich ähneln. Statable rechnet auf z-standardisierten Werten, damit Merkmale mit großen Zahlen nicht allein bestimmen. Das Ward-Verfahren legt Fälle schrittweise zusammen und zeigt das als Dendrogramm; k-Means sucht zu einer festen Zahl von Gruppen die Einteilung mit der kleinsten Streuung innerhalb der Gruppen. Ellbogen und Silhouette helfen bei der Wahl der Gruppenzahl, die Entscheidung bleibt bei der Person. Cluster finden immer Gruppen, auch in Zufallsdaten; darum gibt es keine Tests zwischen den Gruppen.',
      'The question is whether cases can be divided into groups that are alike on several numbers. Statable calculates on z-standardized values so that features with large numbers do not decide alone. Ward\'s method joins cases step by step and shows this as a dendrogram; k-means looks, for a fixed number of groups, for the division with the smallest spread within the groups. The elbow and the silhouette help to choose the number of groups; the decision stays with the person. Clusters always find groups, even in random data; so there are no tests between the groups.'),
    syntax: w => clusterRCode(w.l1),
    titelBlatt: (w, sp) => `${L('Gruppen', 'Groups')}: ${w.l1.slice(0, 3).map(n => lesbar(sp(n), true)).join(', ')}${w.l1.length > 3 ? ' …' : ''}`
  },
  {
    // Kurs-Paket (Fachblatt KURSPAKET, Abschnitt 1): Diskriminanzanalyse - R rechnet (MASS::lda), Funktionen ohne prior, Leave-one-out neben der gelernten Trefferquote.
    id: 'diskriminanz', icon: 'vorhersage',
    get titel() { return L('Lässt sich die Gruppe eines Falls aus Zahlen erkennen?', 'Can the group of a case be recognized from numbers?'); },
    get zusatz() { return L('Diskriminanzanalyse: Funktionen, Wilks, Einteilung, Leave-one-out', 'discriminant analysis: functions, Wilks, classification, leave-one-out'); },
    get beispiel() { return L('z. B. Lassen sich Studierende, die das Studium abbrechen, an Motivation, Vorwissen und Lernzeit erkennen?', 'e.g. Can students who drop out be recognized by motivation, prior knowledge and study time?'); },
    get satz() { return [L('Ich möchte wissen, ob sich die Gruppe bei ', 'I want to know whether the group in '), L(' aus diesen Zahlen erkennen lässt: ', ' can be recognized from these numbers: '), L('.', '.')]; },
    luecken: [
      { schluessel: 'l1', get frage() { return L('Welche Gruppe soll erkannt werden? (eine Spalte mit 2 bis 12 Gruppen)', 'Which group should be recognized? (a column with 2 to 12 groups)'); }, wahl: 'eins', passt: (sp, c) => gruppen(sp, c) && !kennung(sp), satz: sp => art(sp),
        keine: () => L('Gesucht ist eine Spalte, die Gruppen nennt (2 bis 12 verschiedene Werte). In diesen Daten gibt es keine.', 'Looking for a column that names groups (2 to 12 different values). These data have none.') },
      { schluessel: 'l2', get frage() { return L(`Aus welchen Zahlen? (mindestens zwei Zahlenspalten, höchstens ${DISKR_MERKMALE_MAX})`, `From which numbers? (at least two number columns, at most ${DISKR_MERKMALE_MAX})`); }, wahl: 'mehrere', passt: sp => zahl(sp) && !kennung(sp), satz: sp => sp.name, mindestens: 2, hoechstens: DISKR_MERKMALE_MAX,
        keine: () => L('Gesucht sind Spalten mit Zahlen. In diesen Daten gibt es keine.', 'Looking for columns with numbers. These data have none.') }
    ],
    // ⚠ von der Fachperson abzunehmen: MASS::lda ohne prior (Funktionen, Eigenwerte und Wilks hängen nicht an den Vorwahrscheinlichkeiten, wie SPSS); Einteilung mit gleicher Vorwahrscheinlichkeit oder nach Gruppengröße, Leave-one-out mit CV = TRUE.
    fachwort: () => diskrFachwort(),
    warum: () => diskrWarum(),
    syntax: w => (w.l1[0] ? diskrRCode(w.l1[0], w.l2) : ''),
    titelBlatt: (w, sp) => `${L('Diskriminanz', 'Discriminant analysis')}: ${lesbar(sp(w.l1[0]!), true)}`
  },
  {
    // Kurs-Paket (Fachblatt KURSPAKET, Abschnitt 2): loglineare Modelle - R rechnet (glm, poisson), auch leere Zellen gezählt, Modell von Hand (hierarchisch).
    id: 'loglinear', icon: 'kreuz',
    get titel() { return L('Wie hängen mehrere Kategorien zusammen?', 'How are several categories related?'); },
    get zusatz() { return L('Loglineare Modelle: G², X², Wechselwirkungen', 'log-linear models: G², X², interactions'); },
    get beispiel() { return L('z. B. Hängen Schulform, Geschlecht und Abschluss zusammen - und welche Paare davon?', 'e.g. Are school type, gender and qualification related - and which pairs of them?'); },
    get satz() { return [L('Ich möchte wissen, wie ', 'I want to know how '), L(' zusammenhängen - Häufigkeit je Zelle: ', ' are related - frequency per cell: '), L('.', '.')]; },
    luecken: [
      { schluessel: 'l1', get frage() { return L(`Welche Kategorien? (zwei bis ${LOG_FAKTOREN_MAX} Spalten, die Gruppen nennen)`, `Which categories? (two to ${LOG_FAKTOREN_MAX} columns that name groups)`); }, wahl: 'mehrere', passt: (sp, c) => gruppen(sp, c) && !kennung(sp), satz: sp => art(sp), mindestens: 2, hoechstens: LOG_FAKTOREN_MAX,
        keine: () => L('Gesucht sind Spalten, die Gruppen oder Kategorien nennen (2 bis 12 verschiedene Werte). In diesen Daten gibt es keine.', 'Looking for columns that name groups or categories (2 to 12 different values). These data have none.') },
      { schluessel: 'l2', get frage() { return L('Steht die Häufigkeit je Zelle in einer Spalte? (optional: eine Spalte mit ganzen Zahlen; ohne Angabe zählt jede Zeile als ein Fall)', 'Is the frequency per cell in a column? (optional: a column with whole numbers; without it every row counts as one case)'); },
        get ohne() { return L('Ohne Häufigkeitsspalte weiter (jede Zeile ist ein Fall)', 'Continue without a frequency column (every row is a case)'); }, wahl: 'eins', passt: sp => zahl(sp) && !kennung(sp), satz: sp => art(sp), mindestens: 0 }
    ],
    // ⚠ von der Fachperson abzunehmen: glm(Freq ~ Terme, poisson) auf der vollen Tabelle (auch leere Zellen), G² = Devianz, X² nach Pearson; Modellwahl von Hand, hierarchisch; ein großes p heißt hier: das Modell widerspricht den Daten nicht.
    fachwort: () => logFachwort(),
    warum: () => logWarum(),
    syntax: w => (w.l1.length >= 2 ? logRCode(w.l1, w.l2[0] ?? null, logTerme(logStandardWahl(w.l1.length), w.l1.length)) : ''),
    titelBlatt: (w, sp) => `${L('Kategorien', 'Categories')}: ${w.l1.slice(0, 3).map(n => lesbar(sp(n), true)).join(', ')}${w.l1.length > 3 ? ' …' : ''}`
  },
  {
    // Kurs-Paket (Fachblatt KURSPAKET, Abschnitt 3): MANOVA - R rechnet (manova), Hauptzeile Pillai, einzelne Tests nicht gegen mehrfaches Testen abgesichert.
    id: 'manova', icon: 'gruppen',
    get titel() { return L('Unterscheiden sich Gruppen in mehreren Zahlen zugleich?', 'Do groups differ on several numbers at once?'); },
    get zusatz() { return L('MANOVA: Pillai, Wilks, Hotelling-Lawley, Roy', 'MANOVA: Pillai, Wilks, Hotelling-Lawley, Roy'); },
    get beispiel() { return L('z. B. Unterscheiden sich Lehrmethoden zugleich in Wissenstest, Motivation und Zufriedenheit?', 'e.g. Do teaching methods differ at the same time in knowledge test, motivation and satisfaction?'); },
    get satz() { return [L('Ich möchte wissen, ob sich ', 'I want to know whether '), L(' zusammen unterscheiden, je nachdem, welche Gruppe bei ', ' differ together, depending on the group given for '), L(' angegeben ist.', ' .')]; },
    luecken: [
      { schluessel: 'l1', get frage() { return L(`Was wurde gemessen? (mindestens zwei Zahlenspalten, höchstens ${MANOVA_ZIELE_MAX})`, `What was measured? (at least two number columns, at most ${MANOVA_ZIELE_MAX})`); }, wahl: 'mehrere', passt: sp => zahl(sp) && !kennung(sp), satz: sp => sp.name, mindestens: 2, hoechstens: MANOVA_ZIELE_MAX,
        keine: () => L('Gesucht sind Spalten mit Zahlen. In diesen Daten gibt es keine.', 'Looking for columns with numbers. These data have none.') },
      { schluessel: 'l2', get frage() { return L('Welche Gruppen?', 'Which groups?'); }, wahl: 'eins', passt: (sp, c) => gruppen(sp, c) && !kennung(sp), satz: sp => art(sp) }
    ],
    // ⚠ von der Fachperson abzunehmen: stats::manova mit den vier Prüfgrößen; Hauptzeile Pillai (am wenigsten empfindlich gegen verletzte Voraussetzungen); Roys p ist zu klein; einzelne Zielgrößen ohne Schutz vor mehrfachem Testen.
    fachwort: () => manovaFachwort(),
    warum: () => manovaWarum(),
    syntax: w => (w.l2[0] ? manovaRCode(w.l2[0], w.l1) : ''),
    titelBlatt: (w, sp) => `${L('MANOVA', 'MANOVA')}: ${lesbar(sp(w.l2[0]!), true)} ${L('und', 'and')} ${w.l1.slice(0, 3).map(n => lesbar(sp(n), true)).join(', ')}${w.l1.length > 3 ? ' …' : ''}`
  },
  {
    // Abschnitt 3 (Armut und Ungleichheit): R rechnet mit survey - gewichteter Median, Schwelle, Quote mit fester Schwelle, S80/S20, Gini mit Linearisierung. Entwurf (einzeln gezogen, Klumpen, Schichten) ist Pflichtangabe.
    id: 'armut', icon: 'verteilung',
    get titel() { return L('Wie ungleich ist das Einkommen verteilt?', 'How unequally is income distributed?'); },
    get zusatz() { return L('Armutsquote, S80/S20, Gini-Koeffizient', 'poverty rate, S80/S20, Gini coefficient'); },
    get beispiel() { return L('z. B. Wie viele Haushalte liegen unter der Armutsschwelle, und wie weit liegen oberes und unteres Fünftel auseinander?', 'e.g. How many households are below the poverty threshold, and how far apart are the top and the bottom fifth?'); },
    get satz() { return [L('Ich möchte wissen, wie ungleich das Einkommen ', 'I want to know how unequally the income '), L(' verteilt ist - gewichtet mit ', ' is distributed - weighted by '), L('; Klumpen: ', '; clusters: '), L('; Schichten: ', '; strata: '), L('.', '.')]; },
    luecken: [
      { schluessel: 'l1', get frage() { return L('Welche Spalte enthält das Einkommen? (es muss schon so vorliegen, wie es verglichen werden soll, zum Beispiel je Person äquivalenzgewichtet)', 'Which column contains the income? (it must already be in the form in which it is to be compared, for example equivalised per person)'); }, wahl: 'eins', passt: sp => zahl(sp) && !kennung(sp), satz: sp => art(sp),
        keine: () => L('Gesucht ist eine Spalte mit Zahlen. In diesen Daten gibt es keine.', 'Looking for a column with numbers. These data have none.') },
      { schluessel: 'l2', get frage() { return L('Welche Spalte enthält das Gewicht? (Pflicht: wie viele Personen ein Fall vertritt)', 'Which column contains the weight? (required: how many people a case represents)'); }, wahl: 'eins', passt: sp => zahl(sp) && !kennung(sp), satz: sp => art(sp),
        keine: () => L('Gesucht ist eine Spalte mit Zahlen. In diesen Daten gibt es keine.', 'Looking for a column with numbers. These data have none.') },
      { schluessel: 'l3', get frage() { return L('Wurde in Klumpen gezogen, zum Beispiel in Haushalten, Schulen oder Orten? (optional: die Spalte, die den Klumpen nennt)', 'Was the sample drawn in clusters, for example households, schools or places? (optional: the column that names the cluster)'); },
        get ohne() { return L('Ohne Klumpen weiter (die Personen wurden einzeln gezogen)', 'Continue without clusters (the people were drawn individually)'); }, wahl: 'eins', passt: sp => sp.art !== 'datum', satz: sp => art(sp), mindestens: 0 },
      { schluessel: 'l4', get frage() { return L('Wurde nach Schichten gezogen, zum Beispiel nach Regionen? (optional: die Spalte, die die Schicht nennt)', 'Was the sample stratified, for example by region? (optional: the column that names the stratum)'); },
        get ohne() { return L('Ohne Schichten weiter', 'Continue without strata'); }, wahl: 'eins', passt: sp => sp.art !== 'datum', satz: sp => art(sp), mindestens: 0 }
    ],
    // ⚠ Median, Schwelle, Quote, S80/S20 und Gini nach der Regel der amtlichen Armutsstatistik; Standardfehler mit survey (Gini durch Linearisierung, Quote mit fester Schwelle).
    fachwort: () => armutFachwort(),
    warum: () => armutWarum(),
    syntax: w => (w.l1[0] && w.l2[0] ? armutRCode(w.l1[0], w.l2[0], w.l3[0] ?? null, w.l4[0] ?? null) : ''),
    titelBlatt: (w, sp) => `${L('Einkommen', 'Income')}: ${lesbar(sp(w.l1[0]!), true)}`
  },
  {
    id: 'verteilung', icon: 'verteilung',
    get titel() { return L('Wie verteilt sich etwas?', 'How is something distributed?'); },
    get zusatz() { return L('Häufigkeiten, Kennwerte, Histogramm', 'frequencies, summary statistics, histogram'); },
    get beispiel() { return L('z. B. Wie lange schlafen die Befragten?', 'e.g. How long do the respondents sleep?'); },
    get satz() { return [L('Ich möchte sehen, wie sich ', 'I want to see the distribution of '), L(' verteilt.', '.')]; },
    luecken: [{ schluessel: 'l1', get frage() { return L('Welche Spalten? (Mehrfachantworten-Sets stehen mit dabei)', 'Which columns? (multiple response sets are included)'); }, wahl: 'mehrere', passt: sp => !kennung(sp), satz: sp => art(sp), mindestens: 1 }],
    fachwort: w => (w.l1.some(istSetName) ? L('beschreibende Statistik, Mehrfachantworten (Häufigkeiten)', 'descriptive statistics, multiple responses (frequencies)') : L('beschreibende Statistik', 'descriptive statistics')),
    warum: w => L('Zahlen werden mit Mittelwert, Streuung, Median, Quartilen, Schiefe, kleinstem und größtem Wert beschrieben (bei schiefen Daten steht der Median im Vordergrund); Zahlen mit wenigen Stufen (z. B. Zustimmung von 1 bis 5) zeigen zusätzlich Häufigkeiten; Gruppen ihre Häufigkeiten.',
      'Numbers are described by their mean, spread, median, quartiles, skewness, smallest and largest value (for skewed data the median comes first); numbers with few levels (e.g. agreement from 1 to 5) also show frequencies; groups show how often each occurs.')
      + (w.l1.some(istSetName) ? L(' Ein Mehrfachantworten-Set (mehrere Spalten „angekreuzt oder nicht“) zählt je Option, wie viele Personen sie genannt haben - in Prozent der Fälle und der Antworten.', ' A multiple response set (several "checked or not" columns) counts, for each option, how many people named it - in percent of cases and of responses.') : ''),
    syntax: (w, c) => {
      const echt = w.l1.filter(n => !istSetName(n)), sets = w.l1.filter(istSetName);
      // Zahlen mit mehr als 12 Werten: Kennzahlen ohne Tabelle. Gestufte Zahlen (Likert, 3 bis 12 Werte, nicht als nominal vermerkt): Häufigkeiten UND Kennzahlen (Prüfung A8).
      // Quartile wie SPSS (gewichtetes Mittel, ALGORITHM=COMPATIBLE = Typ 6 in R). ⚠ Schwellen 12 und 3 von der Fachperson abzunehmen.
      const z = echt.filter(n => c.istZahl(n) && c.verschieden(n) > 12);
      const st = echt.filter(n => !z.includes(n) && c.istZahl(n) && !c.nominal?.(n) && c.verschieden(n) >= 3), g = echt.filter(n => !z.includes(n) && !st.includes(n));
      const kenn = '\n  /STATISTICS=MEAN STDDEV MIN MAX MEDIAN SKEWNESS KURTOSIS\n  /PERCENTILES=25 50 75\n  /ALGORITHM=COMPATIBLE.';
      const teile = [z.length ? `FREQUENCIES /VARIABLES=${v(z)}\n  /FORMAT=NOTABLE${kenn}` : '', st.length ? `FREQUENCIES /VARIABLES=${v(st)}${kenn}` : '', g.length ? `FREQUENCIES /VARIABLES=${v(g)}\n  /STATISTICS=NONE.` : ''].filter(Boolean);
      if (sets.length) teile.push(mehrfachHinweisBefehl(sets.map(n => c.bezeichnung?.(n) ?? n)));
      return teile.join('\n');
    },
    titelBlatt: (w, sp) => `${L('Verteilung', 'Distribution')}: ${w.l1.map(n => lesbar(sp(n), true)).slice(0, 2).join(', ')}${w.l1.length > 2 ? ' …' : ''}`
  },
  {
    id: 'kreuz', icon: 'kreuz',
    get titel() { return L('Kommt etwas in Gruppen unterschiedlich oft vor?', 'Does something occur at different rates in different groups?'); },
    get zusatz() { return L('Kreuztabelle, Chi-Quadrat', 'crosstab, chi-square'); },
    get beispiel() { return L('z. B. Nutzen Frauen und Männer das Handy im Bett gleich oft?', 'e.g. Do women and men use their phone in bed equally often?'); },
    get satz() { return [L('Ich möchte wissen, ob ', 'I want to know whether '), L(' bei den Gruppen von ', ' occurs at different rates across the groups of '), L(' unterschiedlich oft vorkommt.', '.')]; },
    luecken: [
      { schluessel: 'l1', get frage() { return L('Was wird gezählt? (auch ein Mehrfachantworten-Set)', 'What is counted? (also a multiple response set)'); }, wahl: 'eins', passt: (sp, c) => istSetName(sp.name) || (gruppen(sp, c) && !kennung(sp)), satz: sp => art(sp) },
      { schluessel: 'l2', get frage() { return L('Welche Gruppen?', 'Which groups?'); }, wahl: 'eins', passt: (sp, c) => !istSetName(sp.name) && gruppen(sp, c) && !kennung(sp), satz: sp => art(sp) }
    ],
    fachwort: w => (istSetName(w.l1[0] ?? '') ? L('Kreuztabelle mit Mehrfachantworten (Spalten-Prozente, ohne Test)', 'crosstabulation with multiple responses (column percentages, no test)') : L('Kreuztabelle mit Chi-Quadrat-Test', 'crosstabulation with chi-square test')),
    warum: w => (istSetName(w.l1[0] ?? '')
      ? L('Jede Person konnte mehrere Optionen ankreuzen. Die Tabelle zeigt für jede Gruppe, wie viel Prozent der Fälle die Option genannt haben (Spalten-Prozente). Weil die Ankreuzungen einer Person zusammenhängen, passt der gewöhnliche Chi-Quadrat-Test nicht; Statable beschreibt die Unterschiede in Prozentpunkten.',
          'Each person could check several options. For each group the table shows what percentage of cases named the option (column percentages). Because the checks of one person are not independent, the ordinary chi-square test does not apply; Statable describes the differences in percentage points.')
      : L('Beide Spalten teilen in Gruppen ein. Der Test vergleicht die gezählten Anzahlen mit denen, die ohne Zusammenhang zu erwarten wären.',
          'Both columns divide people into groups. The test compares the observed counts with the counts you would expect without any relationship.')),
    syntax: w => istSetName(w.l1[0] ?? '') ? mehrfachHinweisBefehl([w.l1[0]!, w.l2[0]!]) : `CROSSTABS /TABLES=${w.l2[0]} BY ${w.l1[0]}\n  /STATISTICS=CHISQ\n  /CELLS=COUNT ROW EXPECTED.`,
    titelBlatt: (w, sp) => `${lesbar(sp(w.l1[0]!), true)} ${L('nach', 'by')} ${lesbar(sp(w.l2[0]!), true)}`
  },
  {
    id: 'faktor', icon: 'faktor',
    get titel() { return L('Messen meine Fragen dasselbe?', 'Do my questions measure the same thing?'); },
    get zusatz() { return L('Faktorenanalyse (Hauptkomponenten)', 'factor analysis (principal components)'); },
    get beispiel() { return L('z. B. Bilden die Fragen zum Leben in der Stadt Gruppen?', 'e.g. Do the questions about city life form groups?'); },
    get satz() { return [L('Ich möchte wissen, welche der Fragen ', 'I want to know which of the questions '), L(' zusammengehören.', ' belong together.')]; },
    luecken: [{ schluessel: 'l1', get frage() { return L('Welche Fragen? (mindestens drei)', 'Which questions? (at least three)'); }, wahl: 'mehrere', passt: sp => sp.art === 'zahl' && !kennung(sp), satz: sp => sp.name, mindestens: 3 }],
    fachwort: (_w, c) => (c?.fa?.methode === 'paf' ? L('Hauptachsen-Faktorenanalyse (Promax-Rotation)', 'principal axis factor analysis (promax rotation)') : L('Hauptkomponentenanalyse (Varimax-Rotation), wie die Faktorenanalyse in SPSS voreingestellt', 'principal component analysis (varimax rotation), the default of factor analysis in SPSS')),
    warum: (_w, c) => (c?.fa?.methode === 'paf'
      ? L('Fragen, die dasselbe messen, hängen eng zusammen. Die Hauptachsen-Faktorenanalyse sucht die gemeinsamen Merkmale hinter den Fragen; die Promax-Rotation erlaubt, dass diese Merkmale zusammenhängen - in der Bildungsforschung der Normalfall.',
        'Questions that measure the same thing are closely related. Principal axis factoring looks for the common traits behind the questions; promax rotation allows these traits to be correlated - the usual case in educational research.')
      : L('Fragen, die dasselbe messen, hängen eng zusammen. Die Faktorenanalyse sucht solche Gruppen von Fragen. Voreinstellung wie in SPSS: Hauptkomponenten, Eigenwert über 1, Varimax-Rotation.',
        'Questions that measure the same thing are closely related. The analysis looks for such groups of questions. Default as in SPSS: principal components, eigenvalue above 1, varimax rotation.'))
      + (c?.fa?.zahl ? Lp(c.fa.zahl, ` Die Zahl ist auf ${c.fa.zahl} festgelegt.`, ` Die Zahl ist auf ${c.fa.zahl} festgelegt.`, ` The number is fixed at ${c.fa.zahl}.`, ` The number is fixed at ${c.fa.zahl}.`) : ''),
    // F3 (Abschlusstest): Faktorzahl wählbar (/CRITERIA=FACTORS(k)), Hauptachsen + Promax als zweite Methode. PROMAX(4): κ = 4 wie SPSS und psych::Promax -
    // PSPP 2.1.1 nähme ohne Angabe 5 (factor.c). Bei PAF mit /PRINT=EXTRACTION: nur so stehen Kommunalitäten und Extraktionssummen in der Ausgabe.
    syntax: (w, c) => {
      const kr = c?.fa?.zahl ? `FACTORS(${c.fa.zahl})` : 'MINEIGEN(1)';
      return c?.fa?.methode === 'paf'
        ? `FACTOR\n  /VARIABLES=${v(w.l1)}\n  /PRINT=UNIVARIATE INITIAL EXTRACTION KMO ROTATION\n  /FORMAT=SORT\n  /CRITERIA=${kr} ITERATE(25)\n  /EXTRACTION=PAF\n  /ROTATION=PROMAX(4).`
        : `FACTOR\n  /VARIABLES=${v(w.l1)}\n  /PRINT=UNIVARIATE INITIAL KMO ROTATION\n  /FORMAT=SORT\n  /CRITERIA=${kr} ITERATE(25)\n  /EXTRACTION=PC\n  /ROTATION=VARIMAX.`;
    },
    titelBlatt: (w, _sp, c) => (c?.fa?.methode === 'paf' ? L(`Hauptachsen-Faktorenanalyse (${w.l1.length} Fragen)`, `Principal axis factor analysis (${w.l1.length} questions)`) : L(`Hauptkomponentenanalyse (${w.l1.length} Fragen)`, `Principal component analysis (${w.l1.length} questions)`))
  },
  {
    id: 'skala', icon: 'skala',
    get titel() { return L('Wie zuverlässig misst meine Skala?', 'How reliably does my scale measure?'); },
    get zusatz() { return L('Cronbachs Alpha, Skalenwert', "Cronbach's alpha, scale score"); },
    get beispiel() { return L('z. B. Ergeben vier Fragen zur Konzentration eine verlässliche Skala?', 'e.g. Do four questions about concentration form a reliable scale?'); },
    get satz() { return [L('Ich möchte wissen, ob die Fragen ', 'I want to know whether the questions '), L(' zusammen verlässlich messen.', ' measure reliably together.')]; },
    luecken: [{ schluessel: 'l1', get frage() { return L('Welche Fragen gehören zur Skala? (mindestens zwei)', 'Which questions belong to the scale? (at least two)'); }, wahl: 'mehrere', passt: sp => sp.art === 'zahl' && !kennung(sp), satz: sp => sp.name, mindestens: 2 }],
    fachwort: () => L('Reliabilitätsanalyse (Cronbachs Alpha)', "reliability analysis (Cronbach's alpha)"),
    warum: () => L('Cronbachs Alpha zeigt, wie einheitlich die Fragen einer Skala beantwortet werden. Die Tabelle darunter zeigt, was ohne jede einzelne Frage wäre.',
      "Cronbach's alpha shows how consistently the questions of a scale are answered. The table below shows what would happen without each single question."),
    syntax: w => `RELIABILITY\n  /VARIABLES=${v(w.l1)}\n  /SCALE('${L('Skala', 'Scale')}') ALL\n  /MODEL=ALPHA\n  /SUMMARY=TOTAL.`,
    titelBlatt: (w, sp) => { const marken = ['(umgepolt)', '(reversed)', L('(umgepolt)', '(reversed)')], u = w.l1.some(n => marken.some(m => (sp(n)?.bezeichnung ?? '').includes(m))); return L(`Skala (${w.l1.length} Fragen${u ? L(', umgepolt', ', reversed') : ''})`, `Scale (${w.l1.length} questions${u ? L(', umgepolt', ', reversed') : ''})`); }
  }
];

/** Was die binäre logistische Regression braucht: das Ereignis (interne 1) und der Vergleichswert (interne 0) der Zielspalte, so geschrieben wie in den Daten,
 *  dazu die Hilfsspalte, mit der PSPP rechnet, und die Anzeigenamen der beiden Werte (Wertebeschriftung, sonst der Wert selbst). */
export interface LogistikKodierung {
  ziel: string; hilfsname: string; bezeichnung: string; ereignis: string; referenz: string; text: boolean; ereignisName: string; referenzName: string; umgekehrt: boolean;
}
/** Ereignis nach der festen Regel (`logistikWerte`: Zahlen der größere Wert, Text die alphabetisch zweite Antwort), mit `umgekehrt` vertauscht.
 *  `vergeben`: alle Spaltennamen der Daten - die Hilfsspalte `<ziel>_EV` bekommt einen Namen, den es noch nicht gibt. `null`, wenn die Spalte nicht genau zwei Werte hat. */
export function logistikKodierung(sp: Spalte, werte: (string | number)[], umgekehrt: boolean, vergeben: string[]): LogistikKodierung | null {
  const text = sp.art !== 'zahl', fest = logistikWerte(werte, !text);
  if (!fest) return null;
  const belegt = new Set(vergeben.map(n => n.toUpperCase()));
  let k = 1, hilfsname: string;
  do { hilfsname = `${sp.name.slice(0, 58)}_EV${k > 1 ? k : ''}`; k++; } while (belegt.has(hilfsname.toUpperCase()));
  const [ereignis, referenz] = umgekehrt ? [fest.referenz, fest.ereignis] : [fest.ereignis, fest.referenz];
  const name = (w: string) => sp.werteLabels[w] ?? sp.werteLabels[String(Number(w))] ?? w;
  return { ziel: sp.name, hilfsname, bezeichnung: sp.bezeichnung || sp.name, ereignis, referenz, text, ereignisName: name(ereignis), referenzName: name(referenz), umgekehrt };
}
/** Logistische Regression mit Hilfsspalte: Ereignis = 1, Vergleichswert = 0, alles andere fehlend. Die Hilfsspalte entsteht nur für diese Rechnung (TEMPORARY) - die Daten bleiben unverändert.
 *  Wertebeschriftungen (die Anzeigenamen) und Bezeichnung der Hilfsspalte stehen in PSPPs Kodierungs- und Klassifikationstabelle. Gegen R `glm(factor(ziel, levels = c(Vergleich, Ereignis)) ~ x, binomial)` geprüft. */
export function logistikBefehl(praediktoren: string[], k: LogistikKodierung, terme: RegTerm[] = regTerme(praediktoren)): string {
  const q = zitWert, wert = (x: string) => (k.text ? q(x) : String(Number(x)));
  // Gruppen-Spalten als Prädiktoren: Hilfsspalten im selben TEMPORARY-Block; Gesamttest je Gruppen-Spalte mit 3+ Stufen als zweiter Lauf (regfaktor.ts).
  const lauf = (vars: string[], vorher: string) => `TEMPORARY.\nRECODE ${k.ziel} (${wert(k.ereignis)}=1) (${wert(k.referenz)}=0) (ELSE=SYSMIS) INTO ${k.hilfsname}.\nVARIABLE LABELS ${k.hilfsname} ${q(k.bezeichnung)}.\nVALUE LABELS ${k.hilfsname} 1 ${q(k.ereignisName)} 0 ${q(k.referenzName)}.\n${vorher}LOGISTIC REGRESSION ${k.hilfsname} WITH ${v(vars)}\n  /PRINT=CI(95).`;
  return regLogistikTeile(terme, lauf);
}

/** ROC-Kurve für eine Zahl als Test und zwei Gruppen (z. B. Screening-Punkte gegen Diagnose): Fläche unter der Kurve (AUC) mit Standardfehler und 95 %-KI, Koordinaten der Kurve.
 *  `positiv` = der Wert der Gruppenspalte, der als „positiv“ (krank, auffällig) gilt; `hohe` = hohe Testwerte sprechen für „positiv“. Mit nodeEngine() gegen PSPP 2.1.1 geprüft (AUC .80 bei Handrechnung). ⚠ von der Fachperson abzunehmen. */
export function rocBefehl(test: string, gruppe: string, positiv: string | number, hohe = true): string {
  const q = typeof positiv === 'number' ? String(positiv) : zitWert(positiv);
  return `ROC ${test} BY ${gruppe} (${q})\n  /PLOT=CURVE(REFERENCE)\n  /PRINT=SE COORDINATES\n  /CRITERIA=CUTOFF(INCLUDE) TESTPOS(${hohe ? 'LARGE' : 'SMALL'}) DISTRIBUTION(FREE) CI(95)\n  /MISSING=EXCLUDE.`;
}
