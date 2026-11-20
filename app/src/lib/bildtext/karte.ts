/** Karte: die Tabelle der Gebiete ist die Alternative zum Bild. */
import { L, Lp } from '../sitzung.svelte';
import { z, sauber, indexMax, indexMin } from './zahlen';
import { titelOder, keineDaten, inGebieten } from './hilfen';
import type { BildText, KarteDaten } from './typen';

export function karte(d: KarteDaten): BildText {
  const wert = sauber(d.wertName ?? ''), titel = titelOder(d.titel, wert ? L(`${wert} nach Gebiet`, `${wert} by area`) : L('Gebiete der Karte', 'Areas of the map'));
  const g = d.gebiete.map(x => ({ ...x, name: sauber(x.name), w: x.wert ?? null }));
  const k = g.length;
  if (k === 0) return keineDaten(titel, L('Karte: keine Gebiete.', 'Map: no areas.'));
  const mit = g.filter(x => x.w !== null && Number.isFinite(x.w)).length, ohne = k - mit;
  const hi = indexMax(g.map(x => x.w)), lo = indexMin(g.map(x => x.w));
  const kurz = hi < 0 ? L(`Karte mit ${inGebieten(k)}${wert ? `: ${wert}` : ''}, ohne Werte.`, `Map with ${inGebieten(k)}${wert ? `: ${wert}` : ''}, without values.`)
    : mit === 1 ? L(`Karte mit ${inGebieten(k)}${wert ? `: ${wert}` : ''}; nur ${g[hi]!.name} hat einen Wert (${z(g[hi]!.w)}).`, `Map with ${inGebieten(k)}${wert ? `: ${wert}` : ''}; only ${g[hi]!.name} has a value (${z(g[hi]!.w)}).`)
    : wert ? L(`Karte: ${wert} in ${inGebieten(k)}; höchster Wert in ${g[hi]!.name} (${z(g[hi]!.w)}), niedrigster in ${g[lo]!.name} (${z(g[lo]!.w)}).`, `Map: ${wert} in ${inGebieten(k)}; highest value in ${g[hi]!.name} (${z(g[hi]!.w)}), lowest in ${g[lo]!.name} (${z(g[lo]!.w)}).`)
    : L(`Karte mit ${inGebieten(k)}; höchster Wert in ${g[hi]!.name} (${z(g[hi]!.w)}), niedrigster in ${g[lo]!.name} (${z(g[lo]!.w)}).`, `Map with ${inGebieten(k)}; highest value in ${g[hi]!.name} (${z(g[hi]!.w)}), lowest in ${g[lo]!.name} (${z(g[lo]!.w)}).`);
  const beschreibung = [
    wert ? L(`Karte: ${wert} nach Gebiet, die Werte sind als Farben dargestellt.`, `Map: ${wert} by area, the values are shown as colors.`) : L('Karte der Gebiete, die Werte sind als Farben dargestellt.', 'Map of the areas, the values are shown as colors.'),
    Lp(k, `Die Karte zeigt ${k} Gebiet.`, `Die Karte zeigt ${k} Gebiete.`, `The map shows ${k} area.`, `The map shows ${k} areas.`),
    ...(ohne > 0 ? [Lp(ohne, `${ohne} Gebiet hat keinen Wert.`, `${ohne} Gebiete haben keinen Wert.`, `${ohne} area has no value.`, `${ohne} areas have no value.`)] : []),
    ...(d.legende && d.legende.length ? [L(`Legende: ${d.legende.map(sauber).join('; ')}.`, `Legend: ${d.legende.map(sauber).join('; ')}.`)] : []),
    ...(d.vermerk ? [sauber(d.vermerk)] : [])
  ];
  const liste = g.map(x => (x.w === null || !Number.isFinite(x.w) ? L(`${x.name}: kein Wert.`, `${x.name}: no value.`) : `${x.name}: ${z(x.w)}${x.klasse ? ` (${sauber(x.klasse)})` : ''}.`));
  const mitKlasse = g.some(x => x.klasse);
  const zeilen = g.map(x => [x.name, x.w === null || !Number.isFinite(x.w) ? L('kein Wert', 'no value') : z(x.w), ...(mitKlasse ? [sauber(x.klasse ?? '')] : [])]);
  return { kurz, beschreibung, liste, tabelle: { titel, kopf: [L('Gebiet', 'Area'), wert || L('Wert', 'Value'), ...(mitKlasse ? [L('Klasse', 'Class')] : [])], zeilen, zeilenKopf: true } };
}
