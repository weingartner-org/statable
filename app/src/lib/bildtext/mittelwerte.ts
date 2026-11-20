/** Mittelwerte mit Fehlerbalken (Schablone 5.8). */
import { L, Lp } from '../sitzung.svelte';
import { z, sauber, indexMax, vonBis } from './zahlen';
import { achsenSatz, kategorieAchse, mitEinheit, titelOder, keineDaten, spanne, nGruppen } from './hilfen';
import type { BildText, MittelwerteDaten } from './typen';

export function mittelwerte(d: MittelwerteDaten): BildText {
  const name = sauber(d.name), wert = mitEinheit(d.name, d.einheit), gn = sauber(d.gruppenName ?? '');
  const titel = titelOder(d.titel, gn ? L(`Mittelwerte von ${name} nach ${gn}`, `Means of ${name} by ${gn}`) : L(`Mittelwerte von ${name}`, `Means of ${name}`));
  const g = d.gruppen.map(x => ({ ...x, name: sauber(x.name) })), k = g.length;
  if (k === 0) return keineDaten(titel, L(`Mittelwertdiagramm von ${name}: keine Gruppen.`, `Mean plot of ${name}: no groups.`));
  const fehler = d.fehler === 'ki95' ? L('95-%-Konfidenzintervall', '95% confidence interval') : d.fehler === 'sd' ? L('eine Standardabweichung nach oben und unten', 'one standard deviation above and below')
    : d.fehler === 'se' ? L('Standardfehler des Mittelwerts', 'standard error of the mean') : '';
  const top = indexMax(g.map(x => x.mittel));
  const von = gn ? L(`Mittelwertdiagramm: ${name} nach ${gn}, ${nGruppen(k)}`, `Mean plot: ${name} by ${gn}, ${nGruppen(k)}`) : L(`Mittelwertdiagramm: ${name}, ${nGruppen(k)}`, `Mean plot: ${name}, ${nGruppen(k)}`);
  const kurz = fehler ? L(`${von}; Fehlerbalken zeigen ${fehler}; höchster Mittelwert ${g[top]!.name} mit ${z(g[top]!.mittel)}.`, `${von}; error bars show ${fehler}; highest mean ${g[top]!.name} with ${z(g[top]!.mittel)}.`)
    : L(`${von}; höchster Mittelwert ${g[top]!.name} mit ${z(g[top]!.mittel)}.`, `${von}; highest mean ${g[top]!.name} with ${z(g[top]!.mittel)}.`);
  const grenzen = g.flatMap(x => [x.mittel, ...(x.unten != null ? [x.unten] : []), ...(x.oben != null ? [x.oben] : [])]);
  const beschreibung = [
    gn ? L(`Mittelwertdiagramm mit Fehlerbalken: ${name} nach ${gn}.`, `Mean plot with error bars: ${name} by ${gn}.`) : L(`Mittelwertdiagramm mit Fehlerbalken: ${name}.`, `Mean plot with error bars: ${name}.`),
    kategorieAchse(true, d.gruppenName, k),
    achsenSatz(false, d.yAchse ?? { name: L(`Mittelwert von ${wert}`, `Mean of ${wert}`) }, spanne(grenzen)),
    Lp(k, `Das Diagramm zeigt ${k} Mittelwert.`, `Das Diagramm zeigt ${k} Mittelwerte.`, `The chart shows ${k} mean.`, `The chart shows ${k} means.`),
    fehler ? L(`Fehlerbalken: ${fehler}.`, `Error bars: ${fehler}.`) : ''
  ].filter(Boolean);
  const liste = g.map(x => (x.unten != null && x.oben != null
    ? L(`${x.name}: Mittelwert ${z(x.mittel)}, Fehlerbalken ${vonBis(z(x.unten), z(x.oben))}.`, `${x.name}: mean ${z(x.mittel)}, error bar ${vonBis(z(x.unten), z(x.oben))}.`)
    : L(`${x.name}: Mittelwert ${z(x.mittel)}.`, `${x.name}: mean ${z(x.mittel)}.`)));
  const mitFehler = g.some(x => x.unten != null && x.oben != null);
  const kopf = [gn || L('Gruppe', 'Group'), 'n', L('Mittelwert', 'Mean'), ...(mitFehler ? [L('untere Grenze', 'lower limit'), L('obere Grenze', 'upper limit')] : [])];
  const zeilen = g.map(x => [x.name, x.n ?? '', z(x.mittel), ...(mitFehler ? [x.unten != null ? z(x.unten) : '', x.oben != null ? z(x.oben) : ''] : [])]);
  return { kurz, beschreibung, liste, tabelle: { titel, kopf, zeilen, zeilenKopf: true } };
}
