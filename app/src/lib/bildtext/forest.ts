/** Forest-Plot (Schablone 5.11): je Studie ein Effekt mit Intervall; Gesamteffekt; Nulllinie. Muster: Das Intervall schneidet die Nulllinie, wenn unten <= Nullwert <= oben. */
import { L, Lp } from '../sitzung.svelte';
import { z, prozent, sauber, vonBis } from './zahlen';
import { achsenSatz, titelOder, keineDaten, spanne, nStudien } from './hilfen';
import type { BildText, ForestDaten } from './typen';

export const schneidetNull = (unten: number, oben: number, nullwert: number): boolean => unten <= nullwert && nullwert <= oben;

export function forest(d: ForestDaten): BildText {
  const mass = sauber(d.mass), titel = titelOder(d.titel, L(`Effekte der Studien (${mass})`, `Effects of the studies (${mass})`));
  const s = d.studien.map(x => ({ ...x, name: sauber(x.name) })), k = s.length;
  if (k === 0 && !d.gesamt) return keineDaten(titel, L(`Forest-Plot (Effekte der Studien): keine Studien.`, `Forest plot (effects of the studies): no studies.`));
  const nl = z(d.nullwert);
  const gs = d.gesamt ? (schneidetNull(d.gesamt.unten, d.gesamt.oben, d.nullwert) ? L('das Intervall enthält den Nullwert', 'the interval contains the null value') : L('das Intervall enthält den Nullwert nicht', 'the interval does not contain the null value')) : '';
  const kurz = d.gesamt
    ? L(`Forest-Plot (Effekte der Studien): ${mass} für ${nStudien(k)}; Gesamteffekt ${z(d.gesamt.eff, 2)}, 95-%-Intervall ${vonBis(z(d.gesamt.unten, 2), z(d.gesamt.oben, 2))}; ${gs}.`, `Forest plot (effects of the studies): ${mass} for ${nStudien(k)}; overall effect ${z(d.gesamt.eff, 2)}, 95% interval ${vonBis(z(d.gesamt.unten, 2), z(d.gesamt.oben, 2))}; ${gs}.`)
    : L(`Forest-Plot (Effekte der Studien): ${mass} für ${nStudien(k)}.`, `Forest plot (effects of the studies): ${mass} for ${nStudien(k)}.`);
  const alle = [...s.flatMap(x => [x.unten, x.eff, x.oben]), ...(d.gesamt ? [d.gesamt.unten, d.gesamt.oben] : []), ...(d.praed ? [d.praed.unten, d.praed.oben] : [])];
  const beschreibung = [
    L(`Forest-Plot (Effekte der Studien): ${mass}.`, `Forest plot (effects of the studies): ${mass}.`),
    achsenSatz(true, { name: mass }, spanne(alle)),
    L(`Senkrechte Linie bei ${nl}: kein Effekt (Nullwert).`, `Vertical line at ${nl}: no effect (null value).`),
    Lp(k, `Das Diagramm zeigt ${k} Studie mit je einem Punkt und seinem 95-%-Intervall.`, `Das Diagramm zeigt ${k} Studien mit je einem Punkt und seinem 95-%-Intervall.`, `The chart shows ${k} study with one point and its 95% interval.`, `The chart shows ${k} studies, each with one point and its 95% interval.`),
    ...(d.gesamt ? [L(`Gesamteffekt als Raute: ${z(d.gesamt.eff, 2)}, ${vonBis(z(d.gesamt.unten, 2), z(d.gesamt.oben, 2))}.`, `Overall effect as a diamond: ${z(d.gesamt.eff, 2)}, ${vonBis(z(d.gesamt.unten, 2), z(d.gesamt.oben, 2))}.`)] : []),
    ...(d.praed ? [L(`Prädiktionsintervall (Bereich, in dem der Effekt einer neuen Studie liegen dürfte): ${vonBis(z(d.praed.unten, 2), z(d.praed.oben, 2))}.`, `Prediction interval (range in which the effect of a new study is expected): ${vonBis(z(d.praed.unten, 2), z(d.praed.oben, 2))}.`)] : [])
  ];
  const liste = s.map(x => (x.gewicht !== undefined
    ? L(`${x.name}: ${z(x.eff, 2)}, ${vonBis(z(x.unten, 2), z(x.oben, 2))}, Gewicht ${prozent(x.gewicht)}.`, `${x.name}: ${z(x.eff, 2)}, ${vonBis(z(x.unten, 2), z(x.oben, 2))}, weight ${prozent(x.gewicht)}.`)
    : L(`${x.name}: ${z(x.eff, 2)}, ${vonBis(z(x.unten, 2), z(x.oben, 2))}.`, `${x.name}: ${z(x.eff, 2)}, ${vonBis(z(x.unten, 2), z(x.oben, 2))}.`)));
  const mitG = s.some(x => x.gewicht !== undefined);
  const kopf = [L('Studie', 'Study'), L('Effekt', 'Effect'), L('untere Grenze', 'lower limit'), L('obere Grenze', 'upper limit'), ...(mitG ? [L('Gewicht in Prozent', 'Weight in percent')] : [])];
  const zeilen: (string | number)[][] = s.map(x => [x.name, z(x.eff, 2), z(x.unten, 2), z(x.oben, 2), ...(mitG ? [x.gewicht !== undefined ? z(x.gewicht, 1) : ''] : [])]);
  if (d.gesamt) zeilen.push([L('Gesamt', 'Overall'), z(d.gesamt.eff, 2), z(d.gesamt.unten, 2), z(d.gesamt.oben, 2), ...(mitG ? [''] : [])]);
  return { kurz, beschreibung, liste, tabelle: { titel, kopf, zeilen, zeilenKopf: true } };
}
