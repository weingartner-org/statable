import type { OutputItem, TableItem } from './types';
import { raster } from '../lib/tabelle';
import { kleinste, groesste } from '../lib/menge';
import { tSchwaenze } from '../lib/verteilung';

/** Kleine Korrekturen an der PSPP-Ausgabe, damit sie aussieht wie in SPSS.
 *  1. PSPP 2.1.1 schreibt bei CROSSTABS /CELLS=EXPECTED in die Randzellen Anteile statt erwarteter Anzahlen
 *  (Gesamt-Spalte ,12 statt 24, Gesamt-Zeile ,19 statt 37). Erwartete Randsumme = beobachtete Randsumme - so zeigt es SPSS.
 *  Gefunden im Test 07.10. mit den Kursdaten (Geschlecht × Beschäftigung). */
export function korrigiereAusgabe(items: OutputItem[], syntax = ''): OutputItem[] {
  // PSPP 2.1.3 schreibt für nicht Berechenbares (SD bei n = 1, Schiefe bei n = 2) den Fehlwert SYSMIS (n = −1,797e308, Text „.“), 2.1.1 schrieb dort „NaN“.
  // Zuerst wie die NaN-Zellen unten behandeln: „.“ ohne Zahl - sonst rechnet eine Korrektur mit −1,797e308 als echter Zahl (n = 1 im Quartilsabstand).
  for (const it of items) if (it.type === 'table') for (const c of it.cells) if (!c.h && c.n !== undefined && c.n <= -1e300) { c.t = '.'; delete c.n; }
  for (const it of items) if (it.type === 'table' && it.cells.some(c => c.x && c.t === 'Expected')) randErwartet(it);
  for (const it of items) if (it.type === 'table' && /^Coefficients/.test(it.label)) betaKonstante(it);
  konstanteP(items);
  for (const it of items) if (it.type === 'table' && /^Descriptive Statistics/.test(it.label)) { minMaxAlsZahl(it); gueltigListenweise(it); }
  for (const it of items) if (it.type === 'table' && it.cells.some(c => c.x && c.t === 'Interquartile Range')) quartilsabstandKlein(it);
  // PSPP schreibt für nicht Berechenbares teils „NaN“ oder „+Infinit“ (Erkunden mit 1 oder 2 Personen), sonst „.“ - überall „.“ wie SPSS.
  for (const it of items) if (it.type === 'table') for (const c of it.cells) if (!c.h && /^\s*[+-]?(NaN|Infinit\w*)\s*$/i.test(c.t)) { c.t = '.'; delete c.n; }
  fisherSelbst(items);
  const faktor = onewayFaktoren(syntax);
  for (const it of items) if (it.type === 'table' && /^Multiple Comparisons/.test(it.label)) familieAlsSpalte(it, faktor);
  return items;
}

/** PSPP schreibt bei der Konstanten unter Beta „,00“. SPSS lässt die Zelle leer - es gibt dort kein Beta. */
function betaKonstante(t: TableItem) {
  const spalte = t.cells.find(c => c.h && c.x && c.t === 'Beta')?.c;
  const zeile = t.cells.find(c => c.x && c.t === '(Constant)')?.r;
  const z = spalte !== undefined && zeile !== undefined ? t.cells.find(c => c.r === zeile && c.c === spalte) : undefined;
  if (z) { z.t = ''; delete z.n; }
}

/** PSPP 2.1.1 REGRESSION rechnet das Sig. der KONSTANTEN mit N − 1 statt N − k − 1 Freiheitsgraden (t, B, SE und alles zu den Prädiktoren stimmen).
 *  Beispiel (15.10., Prüfer): t = 3,949 bei 27 Freiheitsgraden gibt p = ,000506, PSPP schreibt ,000482 (28 Freiheitsgrade). Statable rechnet das p der Konstanten aus t und den
 *  Freiheitsgraden der Residuen (Tabelle ANOVA, Zeile Residual) selbst - Sollwert R `summary(lm(...))`. Befund F8 in docs/PSPP-BEFUNDE.md. */
function konstanteP(items: OutputItem[]) {
  items.forEach((it, i) => {
    if (it.type !== 'table' || !/^Coefficients/.test(it.label)) return;
    const an = items.slice(0, i).reverse().find((x): x is TableItem => x.type === 'table' && /^ANOVA/.test(x.label));
    if (!an) return;
    const a = raster(an), zeile = a.t.findIndex(z => z[0] === 'Residual'), spaltenDf = a.t.slice(0, Math.max(1, an.headRows[0])).flatMap(z => z).findIndex(c => c === 'df') % an.cols;
    const df = zeile < 0 || spaltenDf < 0 ? undefined : a.n[zeile]?.[spaltenDf];
    const kopf = (text: string) => it.cells.find(c => c.h && c.t === text)?.c;
    const kT = kopf('t'), kS = kopf('Sig.'), zk = it.cells.find(c => c.x && c.t === '(Constant)')?.r;
    if (df === undefined || !(df > 0) || kT === undefined || kS === undefined || zk === undefined) return;
    const tz = it.cells.find(c => c.r === zk && c.c === kT), sz = it.cells.find(c => c.r === zk && c.c === kS);
    if (!tz || tz.n === undefined || !sz || sz.n === undefined) return;
    const p = Math.min(1, 2 * tSchwaenze(Math.abs(tz.n), df).oben);
    sz.n = p; sz.t = p < 0.0005 ? '.000' : p.toFixed(3).replace(/^0/, '');
  });
}

/** PSPP schreibt bei DESCRIPTIVES unter Minimum/Maximum das Wertelabel („sehr selten“, „sehr oft“), wenn es eins gibt.
 *  SPSS zeigt die Zahl. Gefunden im Test 07.10. (Verteilung einer Skala). */
function minMaxAlsZahl(t: TableItem) {
  const spalten = t.cells.filter(c => c.h && c.x && /^(Minimum|Maximum)$/.test(c.t)).map(c => c.c);
  for (const z of t.cells) if (!z.h && spalten.includes(z.c) && z.n !== undefined && Number(z.t.replace(',', '.')) !== z.n)
    z.t = Number.isInteger(z.n) ? String(z.n) : z.n.toFixed(2);
}

/** EXAMINE: Quartilsabstand bei 1 oder 2 Personen leer, wie SPSS 32 (gemessen 29.10.2026, `pruefdaten/spss-2026-10-29`): Mit HAVERAGE liegen die
 *  Positionen (n + 1) · 0,25 und (n + 1) · 0,75 bei n = 2 außerhalb der Daten, SPSS zeigt „.“. PSPP 2.1.1 gab 1,95 und 2,50, PSPP 2.1.3 gibt Max − Min
 *  (wie R Typ 6) und bei n = 1 0,00. Vorher setzte Statable bei n = 2 Max − Min, weil das irrtümlich auch für SPSS angenommen war (Prüfrunde 07.10., Befund C3).
 *  n steht nicht in der Tabelle: aus SD und Standardfehler des Mittelwerts, n = (SD / SE)²; bei n = 1 fehlt die SD. Haben alle denselben Wert (SD 0), bleibt 0. */
function quartilsabstandKlein(t: TableItem) {
  const kopf = (text: string) => t.cells.find(c => c.h && c.x && c.t === text)?.c;
  const kS = kopf('Statistic'), kE = kopf('Std. Error');
  if (kS === undefined || kE === undefined) return;
  const zeilen = (text: string) => [...new Set(t.cells.filter(c => c.x && c.t === text).map(c => c.r))].sort((a, b) => a - b);
  const wert = (r: number | undefined, c: number) => (r === undefined ? undefined : t.cells.find(x => x.r === r && x.c === c)?.n);
  const mittel = zeilen('Mean'), danach = (text: string, ab: number) => zeilen(text).find(r => r > ab);
  for (const r of zeilen('Interquartile Range')) {
    const m = mittel.filter(x => x < r).at(-1); if (m === undefined) continue;
    const z = t.cells.find(x => x.r === r && x.c === kS); if (!z) continue;
    const sd = wert(danach('Std. Deviation', m), kS), se = wert(m, kE);
    const min = wert(danach('Minimum', m), kS), max = wert(danach('Maximum', m), kS);
    if (sd === undefined || !Number.isFinite(sd)) { z.t = ''; delete z.n; continue; }        // n = 1
    const n = sd === 0 ? 0 : se !== undefined && se > 0 ? Math.round((sd / se) ** 2) : NaN;
    if (n === 2) { z.t = ''; delete z.n; }
    else if (sd === 0 && min !== undefined && max !== undefined) { z.n = max - min; z.t = z.n.toFixed(2); }
  }
}

/** DESCRIPTIVES ohne /MISSING=LISTWISE: PSPP schreibt unter „Valid N (listwise)“ die Zahl aller Fälle, die Zeile
 *  „Missing N (listwise)“ darunter stimmt. SPSS zeigt die Fälle ohne jede Lücke = alle − fehlend. Mit LISTWISE rechnet PSPP richtig;
 *  darum nur, wenn der Wert größer ist als das kleinste n einer Spalte (das kann nicht sein). Prüfrunde 07.10., Befund C5. */
function gueltigListenweise(t: TableItem) {
  const kN = t.cells.find(c => c.h && c.x && c.t === 'N')?.c;
  const zeile = (text: string) => t.cells.find(c => c.x && c.t === text)?.r;
  const rG = zeile('Valid N (listwise)'), rF = zeile('Missing N (listwise)');
  if (kN === undefined || rG === undefined || rF === undefined) return;
  const g = t.cells.find(c => c.r === rG && c.c === kN), f = t.cells.find(c => c.r === rF && c.c === kN)?.n;
  const ns = t.cells.filter(c => c.c === kN && c.r >= t.headRows[0] && c.r !== rG && c.r !== rF && c.n !== undefined).map(c => c.n!);
  if (!g || g.n === undefined || f === undefined || !ns.length || g.n <= Math.min(kleinste(ns))) return;
  g.n -= f; g.t = String(g.n);
}

/** ONEWAY: abhängige Spalte → Gruppenspalte, aus der Syntax („ONEWAY x y BY g“ → x: g, y: g). */
function onewayFaktoren(syntax: string): Map<string, string> {
  const m = new Map<string, string>();
  for (const [, abh, g] of syntax.matchAll(/^\s*ONEWAY\s+(?:\/?VARIABLES\s*=\s*)?([\w.\s]+?)\s+BY\s+([\w.]+)/gim))
    for (const v of abh!.split(/\s+/)) m.set(v.toLowerCase(), g!);
  return m;
}

/** Bonferroni (ONEWAY /POSTHOC): PSPP schreibt in den Kopf „(I) Family“ und „(J) Family“, die deutsche Anzeige daraus „(I) Familie“.
 *  SPSS nennt dort die Gruppenspalte. Sie steht nicht in der Tabelle (der Titel nennt die abhängige Spalte), darum aus der Syntax.
 *  Prüfrunde 07.10., Befund D4. */
function familieAlsSpalte(t: TableItem, faktor: Map<string, string>) {
  const abh = /\(([^()]+)\)\s*$/.exec(t.title?.t ?? t.label)?.[1]?.trim().toLowerCase();
  const g = abh ? faktor.get(abh) : undefined;
  if (!g) return;
  for (const c of t.cells) if (c.h && /^\((I|J)\) Family$/.test(c.t)) { c.t = c.t.replace('Family', g); c.x = false; }
}

function randErwartet(t: TableItem) {
  const zelle = (r: number, c: number) => t.cells.find(x => x.r === r && x.c === c);
  const zeilenMit = (text: string) => [...new Set(t.cells.filter(c => c.x && c.t === text).map(c => c.r))].sort((a, b) => a - b);
  const erwartet = zeilenMit('Expected'), anzahl = zeilenMit('Count');
  if (!erwartet.length || erwartet.length !== anzahl.length) return;
  const daten = t.headCols[0] + t.headCols[1], gesamt = t.cols - 1;
  erwartet.forEach((re, i) => {
    const ra = anzahl[i]!, letzte = i === erwartet.length - 1;
    for (let c = daten; c < t.cols; c++) {
      if (c !== gesamt && !letzte) continue;
      const soll = zelle(ra, c), ist = zelle(re, c);
      if (soll?.n !== undefined && ist) { ist.n = soll.n; ist.t = soll.n.toFixed(2); }
    }
  });
}

/** Exakter Test nach Fisher, zweiseitig, wie R `fisher.test`: Summe aller Tafeln mit gleichen Rändern, die nicht wahrscheinlicher sind als die beobachtete. */
export function fisherZweiseitig(a: number, b: number, c: number, d: number): number {
  const n = a + b + c + d, r1 = a + b, k1 = a + c;
  const lf: number[] = [0]; for (let i = 1; i <= n; i++) lf[i] = lf[i - 1]! + Math.log(i);
  const lp = (x: number) => lf[r1]! + lf[n - r1]! + lf[k1]! + lf[n - k1]! - lf[n]! - lf[x]! - lf[r1 - x]! - lf[k1 - x]! - lf[n - r1 - k1 + x]!;
  const beob = lp(a); let p = 0;
  for (let x = Math.max(0, k1 + r1 - n); x <= Math.min(r1, k1); x++) { const l = lp(x); if (l <= beob + 1e-7) p += Math.exp(l); }
  return Math.min(1, p);
}

/** PSPP 2.1.1 rechnet den zweiseitigen exakten Test nach Fisher bei kleinen 2 × 2-Tafeln falsch ((2, 1 / 1, 8): ,159 statt ,127 wie R).
 *  Statable rechnet ihn aus den Anzahlen der Kreuztabelle selbst und schreibt ihn in die Tabelle „Chi-Square Tests“. Prüfung A2, 08.10. */
function fisherSelbst(items: OutputItem[]) {
  items.forEach((it, i) => {
    if (it.type !== 'table' || it.label !== 'Chi-Square Tests') return;
    const cs = raster(it), zeile = cs.t.findIndex(z => z[0] === "Fisher's Exact Test");
    const sp = cs.t.slice(0, Math.max(1, it.headRows[0])).flatMap(z => z).indexOf('Exact Sig. (2-tailed)') % it.cols;
    if (zeile < 0 || sp < 0) return;
    const kt = items.slice(0, i).reverse().find((x): x is TableItem => x.type === 'table' && / × /.test(x.label) && x.cells.some(c => c.x && c.t === 'Count'));
    if (!kt) return;
    const r = raster(kt), kopf = kt.headRows[0], art = kt.headCols[0] - 1, daten = kt.headCols[0] + kt.headCols[1], gesamt = kt.cols - 1;
    const anz = r.n.filter((_, z) => z >= kopf && r.t[z]![0] !== 'Total' && r.t[z]![art] === 'Count').map(z => z.slice(daten, gesamt).map(v => v ?? 0));
    if (anz.length !== 2 || anz[0]!.length !== 2) return;
    const p = fisherZweiseitig(anz[0]![0]!, anz[0]![1]!, anz[1]![0]!, anz[1]![1]!);
    const zelle = it.cells.find(c => c.r === zeile && c.c === sp);
    if (zelle) { zelle.n = p; zelle.t = p.toFixed(3).replace(/^0/, ''); }
  });
}
