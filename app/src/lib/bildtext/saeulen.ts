/** Säulen- und Balkendiagramm, einfach, gruppiert oder gestapelt (Schablonen 5.2 und 5.3). Die Reihenfolge der Kategorien bleibt wie im Bild. */
import { L, Lp } from '../sitzung.svelte';
import { z, sauber, indexMax, indexMin } from './zahlen';
import { achsenSatz, kategorieAchse, mitEinheit, titelOder, keineDaten, spanne, nKategorien } from './hilfen';
import type { BildText, SaeulenDaten } from './typen';

export function saeulen(d: SaeulenDaten): BildText {
  const balken = d.art === 'balken';
  const wert = mitEinheit(d.wertName, d.einheit), kat = sauber(d.kategorieName ?? '');
  const titel = titelOder(d.titel, kat ? L(`${wert} nach ${kat}`, `${wert} by ${kat}`) : wert);
  const k = d.kategorien.length, m = d.reihen.length;
  if (k === 0 || m === 0) return keineDaten(titel, balken ? L(`Balkendiagramm: ${wert}, keine Daten.`, `Bar chart: ${wert}, no data.`) : L(`Säulendiagramm: ${wert}, keine Daten.`, `Column chart: ${wert}, no data.`));
  const namen = d.kategorien.map(sauber);
  const reihen = d.reihen.map((r, i) => ({ name: sauber(r.name ?? ''), werte: r.werte, nr: i + 1 }));
  const einfach = m === 1;
  const alle = reihen.flatMap(r => r.werte.filter((v): v is number => v !== null && Number.isFinite(v)));
  const bereich = spanne(alle);
  const negativ = alle.some(v => v < 0);
  const eine = reihen[0]!.werte;
  const hoch = indexMax(eine), tief = indexMin(eine);
  const gruppenNamen = reihen.map((r, i) => r.name || L(`Reihe ${i + 1}`, `Series ${i + 1}`)).join(', ');
  let kurz: string;
  if (einfach) {
    const [kh, wh, kt, wt] = hoch < 0 ? ['', '', '', ''] : [namen[hoch]!, z(eine[hoch]), namen[tief]!, z(eine[tief])];
    kurz = hoch < 0 ? (balken ? L(`Balkendiagramm: ${wert}, ${k} Balken ohne Werte.`, `Bar chart: ${wert}, ${k} bars without values.`) : L(`Säulendiagramm: ${wert}, ${k} Säulen ohne Werte.`, `Column chart: ${wert}, ${k} columns without values.`))
      : k === 1 ? (balken ? L(`Balkendiagramm: ${wert}, ein Balken: ${kh} mit ${wh}.`, `Bar chart: ${wert}, one bar: ${kh} with ${wh}.`) : L(`Säulendiagramm: ${wert}, eine Säule: ${kh} mit ${wh}.`, `Column chart: ${wert}, one column: ${kh} with ${wh}.`))
      : balken ? (kat ? L(`Balkendiagramm: ${wert} nach ${kat}, ${k} Balken; höchster Wert ${kh} mit ${wh}, niedrigster ${kt} mit ${wt}.`, `Bar chart: ${wert} by ${kat}, ${k} bars; highest ${kh} with ${wh}, lowest ${kt} with ${wt}.`) : L(`Balkendiagramm: ${wert}, ${k} Balken; höchster Wert ${kh} mit ${wh}, niedrigster ${kt} mit ${wt}.`, `Bar chart: ${wert}, ${k} bars; highest ${kh} with ${wh}, lowest ${kt} with ${wt}.`))
      : (kat ? L(`Säulendiagramm: ${wert} nach ${kat}, ${k} Säulen; höchste Säule ${kh} mit ${wh}, niedrigste ${kt} mit ${wt}.`, `Column chart: ${wert} by ${kat}, ${k} columns; highest ${kh} with ${wh}, lowest ${kt} with ${wt}.`) : L(`Säulendiagramm: ${wert}, ${k} Säulen; höchste Säule ${kh} mit ${wh}, niedrigste ${kt} mit ${wt}.`, `Column chart: ${wert}, ${k} columns; highest ${kh} with ${wh}, lowest ${kt} with ${wt}.`));
  } else {
    const art = d.stapel ? (balken ? L('gestapeltes Balkendiagramm', 'stacked bar chart') : L('gestapeltes Säulendiagramm', 'stacked column chart')) : (balken ? L('gruppiertes Balkendiagramm', 'grouped bar chart') : L('gruppiertes Säulendiagramm', 'grouped column chart'));
    kurz = kat ? L(`${art}: ${wert} nach ${kat}, ${nKategorien(k)}, ${m} Reihen (${gruppenNamen}).`, `${art}: ${wert} by ${kat}, ${nKategorien(k)}, ${m} series (${gruppenNamen}).`)
      : L(`${art}: ${wert}, ${nKategorien(k)}, ${m} Reihen (${gruppenNamen}).`, `${art}: ${wert}, ${nKategorien(k)}, ${m} series (${gruppenNamen}).`);
  }
  const art1 = einfach ? (balken ? L('Balkendiagramm', 'Bar chart') : L('Säulendiagramm', 'Column chart')) : d.stapel ? (balken ? L('Gestapeltes Balkendiagramm', 'Stacked bar chart') : L('Gestapeltes Säulendiagramm', 'Stacked column chart')) : (balken ? L('Gruppiertes Balkendiagramm', 'Grouped bar chart') : L('Gruppiertes Säulendiagramm', 'Grouped column chart'));
  const beschreibung = [
    kat ? L(`${art1}: ${wert} nach ${kat}.`, `${art1}: ${wert} by ${kat}.`) : `${art1}: ${wert}.`,
    balken ? kategorieAchse(false, d.kategorieName, k) : kategorieAchse(true, d.kategorieName, k),
    balken ? achsenSatz(true, d.yAchse ?? { name: wert }, bereich ? [Math.min(0, bereich[0]), bereich[1]] : undefined) : achsenSatz(false, d.yAchse ?? { name: wert }, bereich ? [Math.min(0, bereich[0]), bereich[1]] : undefined),
    balken ? Lp(k, `Das Diagramm besteht aus ${k} Balken.`, `Das Diagramm besteht aus ${k} Balken.`, `The chart consists of ${k} bar.`, `The chart consists of ${k} bars.`) : Lp(k, `Das Diagramm besteht aus ${k} Säule.`, `Das Diagramm besteht aus ${k} Säulen.`, `The chart consists of ${k} column.`, `The chart consists of ${k} columns.`),
    ...(einfach ? [] : [L(`Reihen: ${gruppenNamen}.`, `Series: ${gruppenNamen}.`)]),
    ...(negativ ? [L('Es gibt negative Werte; diese liegen unter der Nulllinie.', 'There are negative values; they lie below the zero line.')] : [])
  ];
  const liste = namen.map((nm, i) => {
    const nr = i + 1;
    if (einfach) { const w = z(eine[i]); return balken ? L(`Balken ${nr}: ${nm}: ${w}.`, `Bar ${nr}: ${nm}: ${w}.`) : L(`Säule ${nr}: ${nm}, Höhe ${w}.`, `Column ${nr}: ${nm}, height ${w}.`); }
    const teile = reihen.map(r => `${r.name || nr}: ${z(r.werte[i])}`).join('; ');
    return balken ? L(`Balken ${nr}: ${nm}: ${teile}.`, `Bar ${nr}: ${nm}: ${teile}.`) : L(`Säule ${nr}: ${nm}: ${teile}.`, `Column ${nr}: ${nm}: ${teile}.`);
  });
  const kopf = [kat || L('Kategorie', 'Category'), ...(einfach ? [wert] : reihen.map((r, i) => r.name || L(`Reihe ${i + 1}`, `Series ${i + 1}`)))];
  const zeilen = namen.map((nm, i) => [nm, ...reihen.map(r => (r.werte[i] === null || r.werte[i] === undefined ? '' : z(r.werte[i])))]);
  return { kurz, beschreibung, liste, tabelle: { titel, kopf, zeilen, zeilenKopf: true } };
}
