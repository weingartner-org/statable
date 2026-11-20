/** Boxplot (Schablone 5.7): Median, Quartile, Fühler und Ausreißer je Gruppe. `unten`/`oben` sind die Fühlerenden (wie `BoxStat` aus lib/diagrammdaten.ts). */
import { L, Lp } from '../sitzung.svelte';
import { z, sauber, indexMax } from './zahlen';
import { achsenSatz, mitEinheit, titelOder, keineDaten, spanne, nAusreisser } from './hilfen';
import type { BildText, BoxplotDaten } from './typen';

const AUSREISSER_NENNEN = 5;

export function boxplot(d: BoxplotDaten): BildText {
  const name = sauber(d.name), wert = mitEinheit(d.name, d.einheit), gn = sauber(d.gruppenName ?? '');
  const titel = titelOder(d.titel, gn ? L(`Kennwerte von ${name} nach ${gn}`, `Summary values of ${name} by ${gn}`) : L(`Kennwerte von ${name}`, `Summary values of ${name}`));
  const g = d.gruppen.map((x, i) => {
    const aus = (x.ausreisser ?? []).filter(Number.isFinite);
    return { ...x, name: sauber(x.name ?? '') || (d.gruppen.length > 1 ? L(`Gruppe ${i + 1}`, `Group ${i + 1}`) : ''), aus, min: Math.min(x.unten, ...aus), max: Math.max(x.oben, ...aus) };
  });
  const m = g.length;
  if (m === 0) return keineDaten(titel, L(`Boxplot von ${name}: keine Daten.`, `Box plot of ${name}: no data.`));
  const bereich = spanne(g.flatMap(x => [x.min, x.max]));
  let kurz: string;
  if (m === 1) {
    const x = g[0]!;
    kurz = x.aus.length ? L(`Boxplot von ${name}: Median ${z(x.median)}, mittlere Hälfte von ${z(x.q1)} bis ${z(x.q3)}, ${nAusreisser(x.aus.length)}.`, `Box plot of ${name}: median ${z(x.median)}, middle half from ${z(x.q1)} to ${z(x.q3)}, ${nAusreisser(x.aus.length)}.`)
      : L(`Boxplot von ${name}: Median ${z(x.median)}, mittlere Hälfte von ${z(x.q1)} bis ${z(x.q3)}, keine Ausreißer.`, `Box plot of ${name}: median ${z(x.median)}, middle half from ${z(x.q1)} to ${z(x.q3)}, no outliers.`);
  } else {
    const top = indexMax(g.map(x => x.median)), anz = g.reduce((a, x) => a + x.aus.length, 0);
    const von = gn ? L(`Boxplot von ${name} nach ${gn}`, `Box plot of ${name} by ${gn}`) : L(`Boxplot von ${name}`, `Box plot of ${name}`);
    kurz = L(`${von}, ${m} Gruppen; höchster Median in ${g[top]!.name} mit ${z(g[top]!.median)}, insgesamt ${nAusreisser(anz)}.`, `${von}, ${m} groups; highest median in ${g[top]!.name} with ${z(g[top]!.median)}, ${nAusreisser(anz)} in total.`);
  }
  const beschreibung = [
    gn ? L(`Boxplot von ${name} nach ${gn}.`, `Box plot of ${name} by ${gn}.`) : L(`Boxplot von ${name}.`, `Box plot of ${name}.`),
    achsenSatz(false, d.achse ?? { name: wert }, bereich),
    Lp(m, `Das Diagramm zeigt ${m} Kasten.`, `Das Diagramm zeigt ${m} Kästen.`, `The chart shows ${m} box.`, `The chart shows ${m} boxes.`),
    L('Der Kasten reicht vom ersten bis zum dritten Quartil, der Strich darin ist der Median; die Fühler reichen bis zum kleinsten und größten Wert, der noch nicht als Ausreißer gilt.', 'The box spans the first to the third quartile, the line inside is the median; the whiskers reach the smallest and largest value that is not counted as an outlier.')
  ];
  const liste = g.map(x => {
    const vorn = x.name ? `${x.name}: ` : '';
    const kern = L(`Median ${z(x.median)}, erstes Quartil ${z(x.q1)}, drittes Quartil ${z(x.q3)}, Fühler von ${z(x.unten)} bis ${z(x.oben)}`, `median ${z(x.median)}, first quartile ${z(x.q1)}, third quartile ${z(x.q3)}, whiskers from ${z(x.unten)} to ${z(x.oben)}`);
    const aus = !x.aus.length ? L('keine Ausreißer', 'no outliers')
      : x.aus.length <= AUSREISSER_NENNEN ? L(`Ausreißer: ${[...x.aus].sort((a, b) => a - b).map(v => z(v)).join('; ')}`, `outliers: ${[...x.aus].sort((a, b) => a - b).map(v => z(v)).join('; ')}`)
      : nAusreisser(x.aus.length);
    return `${vorn}${kern}; ${aus}.`;
  });
  const kopf = [gn || L('Gruppe', 'Group'), 'n', L('Minimum', 'Minimum'), L('1. Quartil', '1st quartile'), L('Median', 'Median'), L('3. Quartil', '3rd quartile'), L('Maximum', 'Maximum'), L('Ausreißer', 'Outliers')];
  const zeilen = g.map(x => [x.name || name, x.n ?? '', z(x.min), z(x.q1), z(x.median), z(x.q3), z(x.max), x.aus.length]);
  return { kurz, beschreibung, liste, tabelle: { titel, kopf, zeilen, zeilenKopf: true } };
}
