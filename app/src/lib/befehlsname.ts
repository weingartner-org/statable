/**
 * Sprechender Reiter-Name für einen Lauf auf der Seite „Befehle“ (Johannes 03.11.): „Befehl 2: Häufigkeiten Alter“.
 * Der Name kommt aus dem ersten auswertenden Befehl des Laufs und seinen Spalten; Befehle, die nur Daten ändern oder Einstellungen setzen, zählen nicht.
 */
type Lf = (de: string, en: string) => string;

const NAMEN: [RegExp, string, string][] = [
  [/^FREQUENCIES/, 'Häufigkeiten', 'Frequencies'], [/^DESCRIPTIVES/, 'Kennwerte', 'Descriptives'], [/^EXAMINE/, 'Erkunden', 'Explore'],
  [/^T-TEST/, 't-Test', 't test'], [/^ONEWAY/, 'Einfaktorielle Varianzanalyse', 'One-way ANOVA'], [/^(GLM|MANOVA|UNIANOVA)/, 'Varianzanalyse', 'ANOVA'],
  [/^CROSSTABS/, 'Kreuztabelle', 'Crosstabs'], [/^CORRELATIONS/, 'Korrelation', 'Correlations'], [/^NONPAR CORR/, 'Rangkorrelation', 'Rank correlation'],
  [/^REGRESSION/, 'Regression', 'Regression'], [/^LOGISTIC REGRESSION/, 'Logistische Regression', 'Logistic regression'], [/^NPAR TESTS/, 'Rangtests', 'Nonparametric tests'],
  [/^FACTOR/, 'Faktorenanalyse', 'Factor analysis'], [/^RELIABILITY/, 'Reliabilität', 'Reliability'], [/^QUICK CLUSTER/, 'Clusteranalyse', 'Cluster analysis'],
  [/^GRAPH/, 'Diagramm', 'Chart'], [/^MEANS/, 'Mittelwerte', 'Means'], [/^ROC/, 'ROC-Kurve', 'ROC curve'], [/^LIST/, 'Fälle auflisten', 'List cases'],
  [/^(SHOW|DISPLAY|CTABLES)/, 'Ausgabe', 'Output'],
];
const KEIN_ERGEBNIS = /^(COMPUTE|RECODE|MISSING VALUES|VALUE LABELS|VARIABLE LABELS|VARIABLE LEVEL|SELECT IF|SORT CASES|DELETE VARIABLES|RENAME VARIABLES|STRING|NUMERIC|AUTORECODE|GET|DATA LIST|BEGIN DATA|END DATA|NEW FILE|WEIGHT|SPLIT FILE|FILTER|AGGREGATE|ADD VALUE LABELS|FORMATS|COUNT|IF|DO IF|RANK|MATCH FILES|ADD FILES|SET|SAVE|EXECUTE|TITLE|SUBTITLE|\*|COMMENT)\b/;

/** Alle Befehle eines Laufs: Text bis zum Punkt am Ende. */
function befehlsteile(syntax: string): string[] {
  return syntax.replace(/\r/g, '').split(/\.\s*(?:\n|$)/).map(t => t.trim()).filter(Boolean);
}
const spaltenVon = (teil: string): string[] => {
  const k = teil.replace(/\s+/g, ' ');
  const alle = [...k.matchAll(/(?:\/|\s)(?:VARIABLES|TABLES|DEPENDENT|GROUPS)\s*=\s*([^/]*)/gi)].map(m => m[1]);
  const wahl = alle.length ? alle.join(' ') : /^[A-Z][A-Z -]*?\s+([^/]*)/.exec(k)?.[1] ?? '';
  return wahl.replace(/\([^)]*\)/g, ' ').split(/\s+/).filter(w => w && !/^(BY|WITH|TO|ALL|PAIRS?)$/i.test(w) && /^[\p{L}_@#$][\p{L}\p{N}_.@#$]*$/u.test(w));
};

/** Name ohne Nummer, zum Beispiel „Häufigkeiten Alter“; leer, wenn der Lauf nichts auswertet. */
export function befehlsInhalt(syntax: string, L: Lf): string {
  const teile = befehlsteile(syntax).filter(t => !KEIN_ERGEBNIS.test(t.toUpperCase()));
  const erst = teile[0];
  if (!erst) return '';
  const kopf = erst.toUpperCase().replace(/\s+/g, ' ');
  const hit = NAMEN.find(([re]) => re.test(kopf));
  const wort = hit ? L(hit[1], hit[2]) : kopf.split(' ')[0]!.charAt(0) + kopf.split(' ')[0]!.slice(1).toLowerCase();
  const sp = spaltenVon(erst), zeige = sp.slice(0, 3).join(', ') + (sp.length > 3 ? ' …' : '');
  const mehr = teile.length > 1 ? ` (+${teile.length - 1})` : '';
  return `${wort}${zeige ? ' ' + zeige : ''}${mehr}`;
}

/** Nächste Nummer: größte „Befehl N“ unter den vorhandenen Reiter-Titeln plus eins. */
export function naechsteNummer(titel: string[], L: Lf): number {
  const wort = L('Befehl', 'Command').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`^${wort} (\\d+)(?::|$)`);
  return Math.max(0, ...titel.map(t => Number(re.exec(t)?.[1] ?? 0))) + 1;
}

export function befehlsTitel(syntax: string, vorhandene: string[], L: Lf): string {
  const n = naechsteNummer(vorhandene, L), inhalt = befehlsInhalt(syntax, L);
  return `${L('Befehl', 'Command')} ${n}${inhalt ? ': ' + inhalt : ''}`;
}
