/**
 * „Wie vielfältig?“ unter der Häufigkeitstabelle (Später, Welle S-B, Teil 5): Zuordnung zur Spalte, Satz, APA-Zeile und Tabelle. Rechnung: lib/diversitaet.ts.
 * Sichtbar: IQV, Shannon H (ln) mit Gleichmäßigkeit J, effektive Kategorienzahl exp(H). „Weitere Zahlen“ (Gini-Simpson roh und unverzerrt, 1/Σp²) nur auf Wunsch.
 * k = die möglichen Kategorien, wenn Wertelabels sie festlegen, sonst die besetzten; Schalter „nur besetzte“. Der Satz nennt k immer. Kein Konfidenzintervall, kein Test.
 * ⚠ Satzvorlagen von der Fachperson abzunehmen.
 */
import { istFehlend } from './fehlend';
import type { TableItem } from '../engine/types';
import { L } from './sitzung.svelte';
import { s, spalteNach } from './sitzung.svelte';
import { lesbar } from './verzeichnis';
import { komma, ohneNull, type Haeufigkeit, type Saetze, type Verteilung } from './ergebnis';
import { fd, fo, fx, tabelle, type Z } from './mwsaetze';
import { moeglicheKategorien, vielfalt, vielfaltHinweisText, vielfaltKSatz, vielfaltKText, type Vielfalt } from './diversitaet';
import { istSetName } from './mehrfach';

export interface VielfaltAnzeige {
  h: Haeufigkeit; v: Vielfalt;
  /** Wie k zustande kommt: aus den Wertelabels (mögliche) oder aus den besetzten Kategorien */
  art: 'moeglich' | 'besetzt';
  /** Es gibt Wertelabels, die mehr Kategorien festlegen als besetzt sind (nur dann hat der Schalter „nur besetzte“ eine Wirkung) */
  schalterWirkt: boolean;
  nurBesetzte: boolean;
}

/** Die Spalte zu einer Häufigkeitstabelle (wie in diagrammquellen.mitNormalitaet: Name, Bezeichnung oder lesbarer Name). */
function spalteZu(h: Haeufigkeit, e: Verteilung) {
  void e;
  return s.spalten.find(sp => !istSetName(sp.name) && (sp.name === h.name || sp.bezeichnung === h.name || lesbar(sp, true) === h.name)) ?? spalteNach(h.name);
}
/** Zahl der Wertelabels ohne fehlende Werte (Schlüssel = Code). */
const zahlLabels = (sp: NonNullable<ReturnType<typeof spalteZu>>): number => Object.keys(sp.werteLabels).filter(k => !istFehlend(sp, Number(k))).length;

/** Vielfalt je Häufigkeitstabelle, für die sie sinnvoll ist (Kategorien, nicht eine metrische Zahlenspalte; mindestens eine besetzte Kategorie). */
export function vielfaltAnzeigen(e: Verteilung): VielfaltAnzeige[] {
  const aus: VielfaltAnzeige[] = [];
  for (const h of e.gruppen) {
    if (h.kategorie === false || !h.werte.length) continue;
    const sp = spalteZu(h, e), nurBesetzte = !!e.vielfalt?.nurBesetzte?.[h.name], besetzt = h.werte.filter(w => w.anzahl > 0).length;
    const labels = sp ? zahlLabels(sp) : 0;
    const k = moeglicheKategorien({ wertelabels: labels || null, besetzt, nurBesetzte });
    const v = vielfalt(h.werte.map(w => w.anzahl), { moeglich: k });
    aus.push({ h, v, art: !nurBesetzte && labels > 0 && labels >= besetzt ? 'moeglich' : 'besetzt', schalterWirkt: labels > besetzt, nurBesetzte });
  }
  return aus;
}


/** Sätze zu einer Häufigkeitstabelle. */
export function saetzeVielfalt(a: VielfaltAnzeige): Saetze {
  const v = a.v, H = komma(v.shannon), ex = komma(v.effektiv, 1), k = vielfaltKText(v.moeglich, a.art);
  const marken = [{ text: L('Vielfalt (IQV, Shannon)', 'Diversity (IQV, Shannon)'), erklaer: 'streuung' }];
  if (v.iqv === null || v.pielou === null) {
    return { haupt: L('Es gibt nur eine mögliche Antwort; IQV und Gleichmäßigkeit J sind nicht definiert.', 'There is only one possible answer; the IQV and the evenness J are not defined.'), zusatz: '', vorsicht: '', apa: `Shannon-H = ${H}, N = ${v.n}`, marken };
  }
  const iqv = ohneNull(v.iqv), J = ohneNull(v.pielou), kSatz = vielfaltKSatz(v.moeglich, a.art);
  /** Je Stufe ein ganzer Satz (nicht das Wort „gleichmäßig“ einsetzen). */
  const haupt = (v.iqv >= 0.9
    ? L(`Die Antworten verteilen sich sehr gleichmäßig: IQV = ${iqv}, Shannon-H = ${H} mit Gleichmäßigkeit J = ${J}.`, `The answers are spread very evenly: IQV = ${iqv}, Shannon H = ${H} with evenness J = ${J}.`)
    : v.iqv >= 0.7
      ? L(`Die Antworten verteilen sich ziemlich gleichmäßig: IQV = ${iqv}, Shannon-H = ${H} mit Gleichmäßigkeit J = ${J}.`, `The answers are spread fairly evenly: IQV = ${iqv}, Shannon H = ${H} with evenness J = ${J}.`)
      : v.iqv >= 0.4
        ? L(`Die Antworten verteilen sich ungleichmäßig: IQV = ${iqv}, Shannon-H = ${H} mit Gleichmäßigkeit J = ${J}.`, `The answers are spread unevenly: IQV = ${iqv}, Shannon H = ${H} with evenness J = ${J}.`)
        : L(`Die Antworten verteilen sich sehr ungleichmäßig, auf wenige Antworten konzentriert: IQV = ${iqv}, Shannon-H = ${H} mit Gleichmäßigkeit J = ${J}.`, `The answers are spread very unevenly, concentrated on a few answers: IQV = ${iqv}, Shannon H = ${H} with evenness J = ${J}.`)) + ' ' + kSatz;
  const zusatz = L(`So vielfältig wie ${ex} gleich häufig gewählte Antworten (e hoch H). Der IQV liegt zwischen 0 (alle in einer Antwort) und 1 (gleichmäßig auf alle möglichen Antworten verteilt).`,
    `As diverse as ${ex} equally frequent answers (e to the power of H). The IQV lies between 0 (all in one answer) and 1 (spread evenly over all possible answers).`);
  const vorsicht = [...v.hinweise.map(vielfaltHinweisText), L('Vielfalt ist etwas anderes als Gleichmäßigkeit: Viele seltene Antworten erhöhen H, ohne die Verteilung gleichmäßiger zu machen. Die Reihenfolge der Kategorien spielt keine Rolle; für geordnete Antworten gibt es andere Streuungsmaße. Ein Test oder ein Konfidenzintervall gehört nicht dazu.', 'Diversity is something other than evenness: many rare answers raise H without making the distribution more even. The order of the categories does not matter; for ordered answers there are other measures of spread. A test or a confidence interval is not part of it.')].join(' ');
  return { haupt, zusatz, vorsicht, apa: L(`Shannon-H = ${H}, Gleichmäßigkeit J = ${J}; IQV = ${iqv}; N = ${v.n}`, `Shannon H = ${H}, evenness J = ${J}; IQV = ${iqv}; N = ${v.n}`) + ', ' + k, marken };
}

/** Eine Tabelle je Häufigkeitstabelle (Bericht, Word, Excel und das Blatt). `mehr`: auch Gini-Simpson und 1/Σp². */
export function tabellenVielfalt(e: Verteilung): TableItem[] {
  const mehr = !!e.vielfalt?.mehr;
  return vielfaltAnzeigen(e).map(a => {
    const v = a.v;
    const zeilen: Z[][] = [
      [L('Kategorien (besetzt / möglich)', 'Categories (occupied / possible)'), `${v.besetzt} / ${v.moeglich}`],
      [L('IQV (Index der qualitativen Variation, 0 bis 1)', 'IQV (index of qualitative variation, 0 to 1)'), v.iqv === null ? '-' : fo(v.iqv, 3)],
      [L('Shannon-H (natürlicher Logarithmus)', 'Shannon H (natural logarithm)'), fx(v.shannon, 3)],
      [L('Gleichmäßigkeit J (Pielou)', 'Evenness J (Pielou)'), v.pielou === null ? '-' : fo(v.pielou, 3)],
      [L('Effektive Kategorienzahl, e hoch H', 'Effective number of categories, e to the power of H'), fx(v.effektiv, 2)]
    ];
    if (mehr) zeilen.push(
      [L('Gini-Simpson (1 − Σp²)', 'Gini-Simpson (1 − Σp²)'), fo(v.giniSimpson, 3)],
      [L('Gini-Simpson, unverzerrt', 'Gini-Simpson, unbiased'), v.giniSimpsonUnverzerrt === null ? '-' : fo(v.giniSimpsonUnverzerrt, 3)],
      [L('Effektive Kategorienzahl, 1/Σp²', 'Effective number of categories, 1/Σp²'), fx(v.invSimpson, 2)]);
    return tabelle('Diversity', L(`Wie vielfältig? ${a.h.name}`, `How diverse? ${a.h.name}`), [L('Maß', 'Measure'), L('Wert', 'Value')], zeilen,
      [`N = ${komma(v.n, 0)}, ` + vielfaltKText(v.moeglich, a.art) + '. ' + L('J und IQV hängen von k ab; H, Gini-Simpson und die effektiven Zahlen nicht. Ein Test oder Konfidenzintervall gehört nicht dazu.', 'J and IQV depend on k; H, Gini-Simpson and the effective numbers do not. A test or confidence interval is not part of it.'),
        ...v.hinweise.map(vielfaltHinweisText)]);
  });
}

/** Die Vielfalt aus gewichteten Häufigkeiten (Umfragegewicht, nur beschreibend: gewichtete Anteile; die unverzerrte Form und jedes Intervall entfallen). `labels`: Zahl der Wertelabels (0 = keine). */
export function tabelleVielfaltAusSummen(titel: string, summen: number[], labels: number, umfrage: boolean, fuss: string[] = []): TableItem {
  const besetzt = summen.filter(x => x > 0).length, k = moeglicheKategorien({ wertelabels: labels || null, besetzt }), v = vielfalt(summen, { moeglich: k, umfrage });
  const art: 'moeglich' | 'besetzt' = labels > 0 && labels >= besetzt ? 'moeglich' : 'besetzt';
  return tabelle('Diversity', L(`Wie vielfältig? ${titel}`, `How diverse? ${titel}`), [L('Maß', 'Measure'), L('Wert', 'Value')], [
    [L('Kategorien (besetzt / möglich)', 'Categories (occupied / possible)'), `${v.besetzt} / ${v.moeglich}`],
    [L('IQV (Index der qualitativen Variation, 0 bis 1)', 'IQV (index of qualitative variation, 0 to 1)'), v.iqv === null ? '-' : fo(v.iqv, 3)],
    [L('Shannon-H (natürlicher Logarithmus)', 'Shannon H (natural logarithm)'), fx(v.shannon, 3)],
    [L('Gleichmäßigkeit J (Pielou)', 'Evenness J (Pielou)'), v.pielou === null ? '-' : fo(v.pielou, 3)],
    [L('Effektive Kategorienzahl, e hoch H', 'Effective number of categories, e to the power of H'), fx(v.effektiv, 2)]
  ], [vielfaltKText(v.moeglich, art) + '; ' + L('gewichtete Anteile, nur beschreibend (die unverzerrte Form von Gini-Simpson und jedes Intervall entfallen).', 'weighted proportions, descriptive only (the unbiased form of Gini-Simpson and any interval are omitted).'), ...fuss]);
}
