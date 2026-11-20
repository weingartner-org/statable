/**
 * Umfragegewicht: nur BESCHREIBEND gewichtet (Fachblatt S-A, 1.2 und „Entscheidungen Opus“). Statable kennt den Stichprobenplan (Schichten, Klumpen) nicht;
 * ein Test, ein Intervall oder ein Standardfehler mit diesen Gewichten wäre darum falsch. Gezeigt werden gewichtete Mittelwerte, Standardabweichungen (nur als Beschreibung),
 * Quartile, Häufigkeiten, Prozente und die Korrelation r - ohne p, KI und Standardfehler. Gerechnet wird in JavaScript (lib/gewichte.ts), nicht in PSPP:
 * PSPP würde die Gewichte wie Häufigkeiten behandeln (Quartile, SD und Tests hingen dann von der Größe der Gewichte ab).
 * Das Ergebnis `e` enthält nur Zahlen und Namen; Tabellen und Sätze entstehen bei jedem Aufruf neu und folgen so der Sprache.
 */
import { istFehlend, fehlendMenge, type FehlendBereich } from './fehlend';
import type { TableItem } from '../engine/types';
import { L, Lp } from './sitzung.svelte';
import { beschreibe, kish, wAnteile, wKorrelation, wKreuz, type Beschreibung, type GewichtAbdruck, type GewichteteKreuztabelle } from './gewichte';
import { fd, fo, fx, tabelle, type Z } from './mwsaetze';
import { komma, ohneNull, type Saetze } from './ergebnis';
import { zitat } from '../i18n/profil';
import { getrimmtesMittel } from './robust';
import { tabelleVielfaltAusSummen } from './diversitaetsaetze';
import { spalteNach } from './sitzung.svelte';
import type { DesignE } from './umfragedaten';
import { designTabellen, designSaetze } from './umfragetabellen-verteilung';   // zyklisch: nur beim Aufruf benutzt
import { saetzeDesignB, tabellenDesignB, type DesignB } from './umfrage-gr';

export type GewichteteKarte = 'verteilung' | 'kreuz' | 'gruppen' | 'zusammenhang' | 'vorhersage';
export interface GewichtetE {
  karte: GewichteteKarte;
  gewicht: GewichtAbdruck;
  /** Effektive Stichprobengröße nach Kish (nur ein Hinweis). */
  kish: number;
  /** Verteilung: Zahlenspalten mit Kennzahlen; `getrimmt`: 5 %-getrimmtes Mittel mit Gewichten (Welle S-B, beschreibend; fehlt in alten Projekten) */ zahlen: { spalte: string; b: Beschreibung; getrimmt?: number }[];
  /** Verteilung: Kategorien mit gewichteten Häufigkeiten */ kategorien: { spalte: string; werte: (string | number)[]; summe: number[]; prozent: number[] }[];
  /** Kreuztabelle: Zeilen = Gruppen (l2), Spalten = Gezähltes (l1) */ kreuz?: { zeile: string; spalte: string; k: GewichteteKreuztabelle; n: number };
  /** Gruppenvergleich: nur die Mittelwerte je Gruppe */ gruppen?: { y: string; g: string; je: { wert: string | number; b: Beschreibung }[]; gesamt: Beschreibung };
  /** Zusammenhang: nur r */ zusammenhang?: { x: string; y: string; r: number; n: number };
  /** Später S-D2 (Bauer A2): Umfragegewicht mit „Personen einzeln gezogen: Ja“ - die Zahlen von R (survey): Mittelwert und Anteil mit Intervall, Rao-Scott-Test. Fehlt = nur beschreibend (wie vor S-D2). */
  design?: DesignE;
  /** Später S-D2 (Umfragegewicht mit „Personen einzeln gezogen: Ja“): Gruppenvergleich und Regression mit designbasierten Standardfehlern (survey); ersetzt dann Tabellen und Sätze (lib/umfrage-gr.ts) */ designB?: DesignB;
}
export interface Quelle {
  spalten: { name: string; art: string; fehlend: number[]; fehlendBereich?: FehlendBereich; niveau?: string; werteLabels?: Record<string, string> }[];
  zeilen: (string | number | null)[][];
  /** Gewichte je Zeile, bereinigt (0 = zählt nicht), wie `pruefeGewicht` sie liefert */ w: number[];
}

export const werteVon = (q: Quelle, n: string): (string | number | null)[] => {
  const i = q.spalten.findIndex(x => x.name === n), fe = fehlendMenge(q.spalten[i]);
  return q.zeilen.map(z => { const v = i < 0 ? null : z[i]; return v === null || v === undefined || v === '' || (typeof v === 'number' && fe.includes(v)) ? null : v; });
};
const nurZahlen = (v: (string | number | null)[]) => v.map(x => (typeof x === 'number' ? x : null));
/** Die Zeilen, in denen alle Spalten eine Zahl haben und das Gewicht zählt. */
function vollZahlen(spalten: (string | number | null)[][], w: number[]): { w: number[]; werte: number[][] } {
  const idx = w.map((g, i) => (g > 0 && spalten.every(s => typeof s[i] === 'number') ? i : -1)).filter(i => i >= 0);
  return { w: idx.map(i => w[i]!), werte: spalten.map(s => idx.map(i => s[i] as number)) };
}

/** Ein Ergebnis ohne beschreibende Zahlen: die Hülle für `designB` (Später S-D2), wenn survey rechnet. */
export const gewichtetLeer = (karte: GewichteteKarte, g: GewichtAbdruck, w: number[]): GewichtetE => ({ karte, gewicht: g, kish: kish(w), zahlen: [], kategorien: [] });

/** Rechnet die beschreibenden Zahlen der Karte. */
export function gewichtetBeschreiben(karte: GewichteteKarte, wahl: { l1: string[]; l2: string[] }, q: Quelle, g: GewichtAbdruck): GewichtetE {
  const e: GewichtetE = { karte, gewicht: g, kish: kish(q.w), zahlen: [], kategorien: [] };
  if (karte === 'verteilung') {
    for (const n of wahl.l1) {
      const sp = q.spalten.find(x => x.name === n); if (!sp) continue;
      const v = werteVon(q, n), verschieden = new Set(v.filter(x => x !== null)).size;
      const metrisch = sp.art === 'zahl' && sp.niveau !== 'nominal' && verschieden >= 3;
      if (metrisch) { const voll = vollZahlen([nurZahlen(v)], q.w); if (voll.w.length >= 2) { const tm = getrimmtesMittel(voll.werte[0]!, voll.w); e.zahlen.push({ spalte: n, b: beschreibe(voll.werte[0]!, voll.w, 'umfrage'), ...(tm !== null ? { getrimmt: tm } : {}) }); } }
      if (!(metrisch && verschieden > 12)) { const a = wAnteile(v.map(x => (x === null ? null : x)) as (string | number | null)[], q.w); if (a.werte.length) e.kategorien.push({ spalte: n, werte: a.werte, summe: a.summe, prozent: a.prozent }); }
    }
  } else if (karte === 'kreuz') {
    const [zeile, spalte] = [wahl.l2[0]!, wahl.l1[0]!];
    const k = wKreuz(werteVon(q, zeile) as (string | number | null)[], werteVon(q, spalte) as (string | number | null)[], q.w);
    e.kreuz = { zeile, spalte, k, n: q.w.filter(x => x > 0).length };
  } else if (karte === 'gruppen') {
    const [y, gr] = [wahl.l1[0]!, wahl.l2[0]!], yv = nurZahlen(werteVon(q, y)), gv = werteVon(q, gr);
    const werte = [...new Set(gv.filter((x): x is string | number => x !== null))].sort((a, b) => (typeof a === 'number' && typeof b === 'number' ? a - b : String(a).localeCompare(String(b), 'de')));
    const je = werte.flatMap(wert => {
      const idx = yv.map((v, i) => (v !== null && gv[i] === wert && q.w[i]! > 0 ? i : -1)).filter(i => i >= 0);
      return idx.length ? [{ wert, b: beschreibe(idx.map(i => yv[i]!), idx.map(i => q.w[i]!), 'umfrage') }] : [];
    });
    const alle = vollZahlen([yv], q.w);
    e.gruppen = { y, g: gr, je, gesamt: beschreibe(alle.werte[0]!, alle.w, 'umfrage') };
  } else if (karte === 'zusammenhang') {
    const [x, y] = [wahl.l1[0]!, wahl.l2[0]!], voll = vollZahlen([nurZahlen(werteVon(q, x)), nurZahlen(werteVon(q, y))], q.w);
    e.zusammenhang = { x, y, r: wKorrelation(voll.werte[0]!, voll.werte[1]!, voll.w), n: voll.w.length };
  }
  return e;
}

/** n, auf das sich die Zahlen beziehen (Zeilen mit Gewicht): für „gerechnet mit“ und den Einleitungssatz des Berichts. */
export function gewichtetN(e: GewichtetE): number {
  if (e.designB) return (e.designB.r.n as number | undefined) ?? e.gewicht.zeilen;
  if (e.karte === 'zusammenhang') return e.zusammenhang!.n;
  if (e.karte === 'kreuz') return e.kreuz!.n;
  if (e.karte === 'gruppen') return e.gruppen!.gesamt.n;
  return e.zahlen[0]?.b.n ?? e.gewicht.zeilen;
}

/* ---------------------------------------------------------------------------------------------------------------------------------- Tabellen und Sätze */
type Name = (spalte: string) => string;
type Wert = (spalte: string, wert: string | number) => string;
const fuss = () => [L('Nur beschreibend: Statable zeigt mit einem Umfragegewicht keine Tests, Intervalle und Standardfehler, weil ihm der Stichprobenplan (Schichten, Klumpen) fehlt.', 'Descriptive only: with a survey weight Statable shows no tests, intervals or standard errors because it does not know the sampling design (strata, clusters).')];

export function tabellenGewichtet(e: GewichtetE, name: Name, wert: Wert): TableItem[] {
  if (e.designB) { const t = tabellenDesignB(e.designB, e.gewicht, name, wert); for (const x of t) x.gewicht = { ...e.gewicht }; return t; }   // S-D2: designbasiert statt beschreibend
  const aus: TableItem[] = [];
  const kennRow = (n: string, b: Beschreibung): Z[] => [n, fd(b.zeilen), fx(b.summe), fx(b.mittel), fx(b.sd), fx(b.min), fx(b.q25), fx(b.q50), fx(b.q75), fx(b.max)];
  const kennKopf = (erste: string) => [erste, 'n', L('Summe der Gewichte', 'Sum of the weights'), 'M', 'SD', 'Min', 'Q1', 'Median', 'Q3', 'Max'];
  const kennFuss = [...fuss(), L('M: gewichtetes Mittel. SD: nur als Beschreibung (der Nenner ist die Summe der Gewichte minus 1, darum hängt sie von der Größe der Gewichte ab). Quartile: Gewichte auf n normiert, Verfahren HAVERAGE wie in PSPP.', 'M: weighted mean. SD: description only (the denominator is the sum of the weights minus 1, so it depends on how large the weights are). Quartiles: weights scaled to n, HAVERAGE method as in PSPP.')];
  if (e.karte === 'verteilung') {
    if (e.zahlen.length) aus.push(tabelle('Weighted Descriptive Statistics', L('Kennzahlen mit Fallgewicht', 'Statistics with case weight'), kennKopf(L('Spalte', 'Column')), e.zahlen.map(z => kennRow(name(z.spalte), z.b)), kennFuss));
    const tm = e.zahlen.filter(z => z.getrimmt !== undefined);
    if (tm.length) aus.push(tabelle('Weighted Robust Location', L('Robuste Lagemaße mit Fallgewicht', 'Robust measures of location with case weight'), [L('Spalte', 'Column'), 'n', 'M', L('5 %-getrimmtes Mittel', '5% trimmed mean'), 'Median'],
      tm.map(z => [name(z.spalte), fd(z.b.zeilen), fx(z.b.mittel), fx(z.getrimmt!), fx(z.b.q50)]),
      [...fuss(), L('5 %-getrimmtes Mittel: Unten und oben bleiben je 5 % der Gewichtssumme unberücksichtigt, ein Randwert zählt anteilig (wie SPSS und PSPP), nur beschreibend.', '5% trimmed mean: the lowest and highest 5% of the sum of weights are left out, a boundary value counts in part (as SPSS and PSPP), descriptive only.')]));
    for (const k of e.kategorien) {
      aus.push(tabelle('Weighted Frequencies', name(k.spalte), [L('Wert', 'Value'), L('Gewichtete Häufigkeit', 'Weighted frequency'), L('Prozent', 'Percent')], k.werte.map((w, i) => [wert(k.spalte, w), fx(k.summe[i]!), fx(k.prozent[i]!, 1)]), fuss()));
      const sp = spalteNach(k.spalte), labels = sp ? Object.keys(sp.werteLabels).filter(x => !istFehlend(sp, Number(x))).length : 0;
      aus.push(tabelleVielfaltAusSummen(name(k.spalte), k.summe, labels, true, fuss()));
    }
  } else if (e.karte === 'kreuz') {
    const { zeile, spalte, k } = e.kreuz!, kopf = [name(zeile), ...k.spalten.map(s => wert(spalte, s)), L('Gesamt', 'Total')];
    const mitSumme = (m: number[][], summe: boolean): Z[][] => m.map((z, i) => [wert(zeile, k.zeilen[i]!), ...z.map(v => fx(v, summe ? 2 : 1)), ...(summe ? [fx(z.reduce((a, b) => a + b, 0))] : [fx(100, 1)])]);
    const spaltenSumme: Z[] = [L('Gesamt', 'Total'), ...k.spalten.map((_, j) => fx(k.summe.reduce((a, z) => a + z[j]!, 0))), fx(k.summe.flat().reduce((a, b) => a + b, 0))];
    aus.push(tabelle('Weighted Crosstabulation', `${name(e.kreuz!.spalte)} × ${name(zeile)}: ${L('gewichtete Zählung', 'weighted count')}`, kopf, [...mitSumme(k.summe, true), spaltenSumme], fuss()));
    aus.push(tabelle('Row Percentages', `${name(e.kreuz!.spalte)} × ${name(zeile)}: ${L('Prozent in der Zeile', 'percent within the row')}`, kopf, mitSumme(k.zeilenprozent, false)));
    aus.push(tabelle('Column Percentages', `${name(e.kreuz!.spalte)} × ${name(zeile)}: ${L('Prozent in der Spalte', 'percent within the column')}`, kopf, k.zeilen.map((z, i) => [wert(zeile, z), ...k.spaltenprozent[i]!.map(v => fx(v, 1))])));
  } else if (e.karte === 'gruppen') {
    const gr = e.gruppen!;
    aus.push(tabelle('Weighted Group Means', `${name(gr.y)} ${L('nach', 'by')} ${name(gr.g)}`, kennKopf(L('Gruppe', 'Group')), [...gr.je.map(j => kennRow(wert(gr.g, j.wert), j.b)), kennRow(L('Alle', 'All'), gr.gesamt)], kennFuss));
  } else {
    const z = e.zusammenhang!;
    aus.push(tabelle('Weighted Correlation', L('Korrelation mit Fallgewicht', 'Correlation with case weight'), [L('Paar', 'Pair'), 'n', 'r'], [[`${name(z.x)} / ${name(z.y)}`, fd(z.n), fo(z.r)]], [...fuss(), L('r: gewichtete Pearson-Korrelation, nur beschreibend (ohne p-Wert und Intervall).', 'r: weighted Pearson correlation, descriptive only (no p value and no interval).')]));
  }
  const fertig = e.design && (e.karte === 'verteilung' || e.karte === 'kreuz') ? designTabellen(e, aus, fuss()[0]!, name, wert) : aus;   // Später S-D2: mit Standardfehlern, Intervallen und Test
  for (const t of fertig) t.gewicht = { ...e.gewicht };   // Fußzeile „Gewichtet mit …“
  return fertig;
}

const zahl = (v: number, d = 2) => komma(v, d);
export function saetzeGewichtet(e: GewichtetE, name: Name, wert: Wert): Saetze {
  if (e.designB) return saetzeDesignB(e.designB, e.gewicht, name, wert);   // S-D2: designbasiert statt beschreibend
  const roh = saetzeGewichtetBeschreibend(e, name, wert);
  return e.design && (e.karte === 'verteilung' || e.karte === 'kreuz') ? designSaetze(e, roh, name, wert) : roh;   // Später S-D2
}
function saetzeGewichtetBeschreibend(e: GewichtetE, name: Name, wert: Wert): Saetze {
  const w = e.gewicht.spalte;
  let haupt = '';
  if (e.karte === 'verteilung') {
    const z = e.zahlen[0], k = e.kategorien[0];
    haupt = z
      ? L(`Gewichtet mit ${w}: Der Mittelwert von ${name(z.spalte)} beträgt ${zahl(z.b.mittel)}, der Median ${zahl(z.b.q50)} (n = ${z.b.zeilen}).`, `Weighted by ${w}: the mean of ${name(z.spalte)} is ${zahl(z.b.mittel)}, the median ${zahl(z.b.q50)} (n = ${z.b.zeilen}).`)
      : k
        ? L(`Gewichtet mit ${w}: Bei ${name(k.spalte)} ist „${wert(k.spalte, k.werte[k.prozent.indexOf(Math.max(...k.prozent))]!)}“ mit ${zahl(Math.max(...k.prozent), 1)} % die häufigste Antwort.`, `Weighted by ${w}: for ${name(k.spalte)}, "${wert(k.spalte, k.werte[k.prozent.indexOf(Math.max(...k.prozent))]!)}" is the most frequent answer with ${zahl(Math.max(...k.prozent), 1)}%.`)
        : L(`Gewichtet mit ${w}: Für diese Spalten gibt es keine Zahlen zu zeigen.`, `Weighted by ${w}: there are no numbers to show for these columns.`);
  } else if (e.karte === 'kreuz') {
    const { zeile, spalte, k } = e.kreuz!;
    haupt = L(`Gewichtet mit ${w}: Die Kreuztabelle zeigt für jede Gruppe von ${name(zeile)}, welcher Anteil auf welche Antwort bei ${name(spalte)} entfällt (${k.zeilen.length} Gruppen, ${k.spalten.length} Antworten, n = ${e.kreuz!.n}).`, `Weighted by ${w}: for each group of ${name(zeile)} the crosstab shows which share falls on which answer of ${name(spalte)} (${k.zeilen.length} groups, ${k.spalten.length} answers, n = ${e.kreuz!.n}).`);
  } else if (e.karte === 'gruppen') {
    const gr = e.gruppen!;
    haupt = L(`Gewichtet mit ${w}: Mittelwerte von ${name(gr.y)} - ${gr.je.map(j => `${zitat(wert(gr.g, j.wert))}: ${zahl(j.b.mittel)}`).join(', ')} (n = ${gr.gesamt.zeilen}).`, `Weighted by ${w}: means of ${name(gr.y)} - ${gr.je.map(j => `${zitat(wert(gr.g, j.wert))}: ${zahl(j.b.mittel)}`).join(', ')} (n = ${gr.gesamt.zeilen}).`);
  } else {
    const z = e.zusammenhang!;
    haupt = L(`Gewichtet mit ${w}: Die Korrelation von ${name(z.x)} und ${name(z.y)} beträgt r = ${ohneNull(z.r)} (n = ${z.n}).`, `Weighted by ${w}: the correlation of ${name(z.x)} and ${name(z.y)} is r = ${ohneNull(z.r)} (n = ${z.n}).`);
  }
  return {
    haupt,
    zusatz: L('Mit einem Umfragegewicht zeigt Statable nur beschreibende Zahlen. Einen Test, ein Intervall oder einen Standardfehler gibt es nicht, denn dafür braucht es den Stichprobenplan (Schichten, Klumpen), den Statable nicht kennt.', 'With a survey weight Statable shows descriptive numbers only. There is no test, interval or standard error because those need the sampling design (strata, clusters), which Statable does not know.'),
    vorsicht: Lp(e.gewicht.zeilen, `Effektive Stichprobengröße etwa ${zahl(e.kish, 1)} statt ${e.gewicht.zeilen} Person (nach Kish).`, `Effektive Stichprobengröße etwa ${zahl(e.kish, 1)} statt ${e.gewicht.zeilen} Personen (nach Kish).`, `Effective sample size about ${zahl(e.kish, 1)} instead of ${e.gewicht.zeilen} person (after Kish).`, `Effective sample size about ${zahl(e.kish, 1)} instead of ${e.gewicht.zeilen} people (after Kish).`),
    apa: '',
    marken: [{ text: `n = ${gewichtetN(e)}`, erklaer: 'stichprobe' }]
  };
}
