/** Histogramm (Schablone 5.1, ohne Muster: Gipfel und Schiefe werden nicht behauptet). */
import { L, Lp } from '../sitzung.svelte';
import { z, prozent, vonBis, klasse, sauber, indexMax } from './zahlen';
import { achsenSatz, titelOder, keineDaten, nKlassen, nWerte } from './hilfen';
import type { BildText, HistogrammDaten } from './typen';

export function histogramm(d: HistogrammDaten): BildText {
  const name = sauber(d.name), art = d.art ?? 'anzahl';
  const k = Math.min(d.anzahl.length, Math.max(0, d.grenzen.length - 1));
  const titel = titelOder(d.titel, L(`Klassen des Histogramms von ${name}`, `Classes of the histogram of ${name}`));
  const n = d.n ?? d.anzahl.slice(0, k).reduce((a, b) => a + b, 0);
  if (k === 0 || n === 0) return keineDaten(titel, L(`Histogramm (Verteilung) von ${name}: keine Werte.`, `Histogram (distribution) of ${name}: no values.`));
  const g = d.grenzen, a = d.anzahl.slice(0, k);
  const breite = (i: number) => g[i + 1]! - g[i]!;
  const hoehe = (i: number) => (art === 'prozent' ? (a[i]! / n) * 100 : art === 'dichte' ? (breite(i) > 0 ? a[i]! / (n * breite(i)) : 0) : a[i]!);
  const hz = (i: number) => (art === 'prozent' ? prozent(hoehe(i)) : art === 'dichte' ? z(Math.round(hoehe(i) * 1e4) / 1e4) : z(hoehe(i)));
  const top = indexMax(a);
  const topKlasse = klasse(z(g[top]!), z(g[top + 1]!), top === k - 1);
  const kurz = L(
    `Histogramm (Verteilung) von ${name}, n = ${n}, ${nKlassen(k)} von ${z(g[0]!)} bis ${z(g[k]!)}; die höchste Klasse reicht ${topKlasse} mit ${nWerte(a[top]!)}.`,
    `Histogram (distribution) of ${name}, n = ${n}, ${nKlassen(k)} from ${z(g[0]!)} to ${z(g[k]!)}; the highest class spans ${topKlasse} with ${nWerte(a[top]!)}.`);
  const yName = art === 'prozent' ? L('Prozent der Werte', 'percent of the values') : art === 'dichte' ? L('Dichte', 'density') : L('Anzahl der Werte', 'number of values');
  const yMax = Math.max(...Array.from({ length: k }, (_, i) => hoehe(i)));
  const beschreibung = [
    L(`Histogramm (Verteilung) von ${name}.`, `Histogram (distribution) of ${name}.`),
    achsenSatz(true, d.xAchse ?? { name }, [g[0]!, g[k]!]),
    achsenSatz(false, d.yAchse ?? { name: yName }, [0, yMax]),
    Lp(k, `Das Histogramm besteht aus ${k} Rechteck.`, `Das Histogramm besteht aus ${k} Rechtecken.`, `The histogram consists of ${k} bar.`, `The histogram consists of ${k} bars.`),
    ...(d.mittel !== undefined || d.median !== undefined ? [d.mittel !== undefined && d.median !== undefined
      ? L(`Mittelwert ${z(d.mittel)}, Median ${z(d.median)}.`, `Mean ${z(d.mittel)}, median ${z(d.median)}.`)
      : d.mittel !== undefined ? L(`Mittelwert ${z(d.mittel)}.`, `Mean ${z(d.mittel)}.`) : L(`Median ${z(d.median)}.`, `Median ${z(d.median)}.`)] : [])
  ].filter(Boolean);
  const liste = a.map((c, i) => {
    const kl = klasse(z(g[i]!), z(g[i + 1]!), i === k - 1), h = hz(i), nr = i + 1;
    return art === 'anzahl' ? L(`Rechteck ${nr}: ${kl}, Höhe ${h}.`, `Bar ${nr}: ${kl}, height ${h}.`) : L(`Rechteck ${nr}: ${kl}, Höhe ${h} (${c} Werte).`, `Bar ${nr}: ${kl}, height ${h} (${c} values).`);
  });
  const zeilen = a.map((c, i) => [vonBis(z(g[i]!), z(g[i + 1]!)), c, prozent((c / n) * 100)]);
  return { kurz, beschreibung, liste, tabelle: { titel, kopf: [L('Klasse', 'Class'), L('Anzahl', 'Count'), L('Prozent', 'Percent')], zeilen, zeilenKopf: true } };
}
