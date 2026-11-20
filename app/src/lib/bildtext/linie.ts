/** Liniendiagramm und Zeitreihe (Schablone 5.5). Muster nur nach fester Regel (`verlaufsart`: streng steigend, streng fallend, gleich); sonst nennt der Text nur Anfang, Ende, Höchst- und Tiefstwert. */
import { L, Lp } from '../sitzung.svelte';
import { z, sauber, indexMax, indexMin, verlaufsart } from './zahlen';
import { achsenSatz, kategorieAchse, titelOder, keineDaten, spanne, nStellen } from './hilfen';
import type { BildText, LinieDaten } from './typen';

const xz = (v: string | number | undefined) => (typeof v === 'number' ? z(v) : sauber(v ?? ''));

export function linie(d: LinieDaten): BildText {
  const yName = sauber(d.yAchse.name), xName = sauber(d.xAchse.name);
  const titel = titelOder(d.titel, L(`${yName} über ${xName}`, `${yName} over ${xName}`));
  const k = d.x.length, m = d.reihen.length;
  if (k === 0 || m === 0) return keineDaten(titel, L(`Liniendiagramm: ${yName}, keine Daten.`, `Line chart: ${yName}, no data.`));
  const reihen = d.reihen.map((r, i) => ({ name: sauber(r.name ?? '') || (m > 1 ? L(`Linie ${i + 1}`, `Line ${i + 1}`) : ''), werte: r.werte }));
  const alle = reihen.flatMap(r => r.werte.filter((v): v is number => v !== null && Number.isFinite(v)));
  const bereich = spanne(alle);
  const numX = d.x.every(v => typeof v === 'number') ? spanne(d.x as number[]) : undefined;
  const xErst = xz(d.x[0]), xLetzt = xz(d.x[k - 1]);
  const info = (w: (number | null)[]) => {
    const gueltig = w.map((v, i) => [v, i] as const).filter((p): p is readonly [number, number] => p[0] !== null && Number.isFinite(p[0]));
    if (!gueltig.length) return null;
    const vals = w.map(v => (v === null ? NaN : v));
    const hi = indexMax(vals), lo = indexMin(vals);
    return { erst: gueltig[0]![0], letzt: gueltig.at(-1)![0], hi, lo, vlauf: gueltig.length === w.length ? verlaufsart(gueltig.map(p => p[0])) : null };
  };
  let kurz: string;
  if (m === 1) {
    const i = info(reihen[0]!.werte);
    kurz = !i ? L(`Liniendiagramm: ${yName} über ${xName}, ${nStellen(k)} ohne Werte.`, `Line chart: ${yName} over ${xName}, ${nStellen(k)} without values.`)
      : L(`Liniendiagramm: ${yName} von ${xErst} bis ${xLetzt}; erster Wert ${z(i.erst)}, letzter Wert ${z(i.letzt)}, Höchstwert ${z(reihen[0]!.werte[i.hi])} (${xz(d.x[i.hi])}), Tiefstwert ${z(reihen[0]!.werte[i.lo])} (${xz(d.x[i.lo])}).`,
          `Line chart: ${yName} from ${xErst} to ${xLetzt}; first value ${z(i.erst)}, last value ${z(i.letzt)}, highest ${z(reihen[0]!.werte[i.hi])} (${xz(d.x[i.hi])}), lowest ${z(reihen[0]!.werte[i.lo])} (${xz(d.x[i.lo])}).`);
  } else {
    const nm = reihen.map(r => r.name).join(', ');
    kurz = L(`Liniendiagramm mit ${m} Linien (${nm}): ${yName} über ${xName}, von ${xErst} bis ${xLetzt}.`, `Line chart with ${m} lines (${nm}): ${yName} over ${xName}, from ${xErst} to ${xLetzt}.`);
  }
  const hl = d.hilfslinien ?? [];
  const beschreibung = [
    L(`Liniendiagramm: ${yName} über ${xName}.`, `Line chart: ${yName} over ${xName}.`),
    numX ? achsenSatz(true, d.xAchse, numX) : kategorieAchse(true, d.xAchse.name, k),
    achsenSatz(false, d.yAchse, bereich),
    Lp(k, `Jede Linie hat ${k} Punkt.`, `Jede Linie hat ${k} Punkte.`, `Each line has ${k} point.`, `Each line has ${k} points.`),
    ...hl.map(h => L(`Waagrechte Hilfslinie ${sauber(h.name)} bei ${z(h.y)}.`, `Horizontal reference line ${sauber(h.name)} at ${z(h.y)}.`))
  ];
  const liste = reihen.map(r => {
    const i = info(r.werte);
    if (!i) return L(`${r.name || yName}: keine Werte.`, `${r.name || yName}: no values.`);
    const w = r.werte;
    const kern = L(`erster Wert ${z(i.erst)}, letzter Wert ${z(i.letzt)}, Höchstwert ${z(w[i.hi])} (${xz(d.x[i.hi])}), Tiefstwert ${z(w[i.lo])} (${xz(d.x[i.lo])})`, `first value ${z(i.erst)}, last value ${z(i.letzt)}, highest ${z(w[i.hi])} (${xz(d.x[i.hi])}), lowest ${z(w[i.lo])} (${xz(d.x[i.lo])})`);
    const muster = i.vlauf === 'steigend' ? L('jeder Wert größer als der vorige', 'every value larger than the one before')
      : i.vlauf === 'fallend' ? L('jeder Wert kleiner als der vorige', 'every value smaller than the one before')
      : i.vlauf === 'gleich' ? L('alle Werte gleich', 'all values equal') : '';
    const vorn = r.name ? `${r.name}: ` : '';
    return muster ? `${vorn}${kern}; ${muster}.` : `${vorn}${kern}.`;
  });
  const kopf = [xName, ...reihen.map((r, i) => r.name || yName || String(i + 1))];
  const zeilen = d.x.map((x, i) => [xz(x), ...reihen.map(r => (r.werte[i] === null || r.werte[i] === undefined ? '' : z(r.werte[i])))]);
  return { kurz, beschreibung: beschreibung.filter(Boolean), liste, tabelle: { titel, kopf, zeilen, zeilenKopf: true } };
}
