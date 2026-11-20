/** Verteilung und Kurve (Dichte, Kennlinie, Verlauf einer stetigen Funktion): Achsen, höchster Wert (bei x), Marken und Flächen; die Tabelle zeigt höchstens 21 gleichmäßig gewählte Stellen. */
import { L, Lp } from '../sitzung.svelte';
import { z, sauber, vonBis } from './zahlen';
import { achsenSatz, titelOder, keineDaten, spanne } from './hilfen';
import type { BildText, VerteilungDaten } from './typen';

const TABELLE_STELLEN = 21;

export function verteilung(d: VerteilungDaten): BildText {
  const x = sauber(d.xAchse.name), y = sauber(d.yAchse.name);
  const titel = titelOder(d.titel, L(`${y} über ${x}`, `${y} over ${x}`));
  const kurven = d.kurven.map((c, i) => ({ name: sauber(c.name ?? '') || (d.kurven.length > 1 ? L(`Kurve ${i + 1}`, `Curve ${i + 1}`) : ''), p: c.punkte.filter(q => Number.isFinite(q[0]) && Number.isFinite(q[1])) })).filter(c => c.p.length > 0);
  const m = kurven.length;
  if (m === 0) return keineDaten(titel, L(`Kurvendiagramm: ${y} über ${x}, keine Daten.`, `Curve chart: ${y} over ${x}, no data.`));
  const gipfel = (p: [number, number][]) => p.reduce((b, q) => (q[1] > b[1] ? q : b), p[0]!);
  const sx = spanne(kurven.flatMap(c => c.p.map(q => q[0]))), sy = spanne(kurven.flatMap(c => c.p.map(q => q[1])));
  const g0 = gipfel(kurven[0]!.p);
  const kurz = m === 1
    ? L(`Kurvendiagramm: ${y} über ${x}, von ${z(sx![0])} bis ${z(sx![1])}; höchster Wert ${z(g0[1])} bei ${z(g0[0])}.`, `Curve chart: ${y} over ${x}, from ${z(sx![0])} to ${z(sx![1])}; highest value ${z(g0[1])} at ${z(g0[0])}.`)
    : L(`Kurvendiagramm mit ${m} Kurven (${kurven.map(c => c.name).join(', ')}): ${y} über ${x}, von ${z(sx![0])} bis ${z(sx![1])}.`, `Curve chart with ${m} curves (${kurven.map(c => c.name).join(', ')}): ${y} over ${x}, from ${z(sx![0])} to ${z(sx![1])}.`);
  const beschreibung = [
    L(`Kurvendiagramm: ${y} über ${x}.`, `Curve chart: ${y} over ${x}.`),
    achsenSatz(true, d.xAchse, sx), achsenSatz(false, d.yAchse, sy),
    Lp(m, `Das Diagramm zeigt ${m} Kurve.`, `Das Diagramm zeigt ${m} Kurven.`, `The chart shows ${m} curve.`, `The chart shows ${m} curves.`),
    ...(d.flaeche ?? []).map(f => L(`Markierte Fläche ${sauber(f.name)}: ${vonBis(z(f.von), z(f.bis))}.`, `Marked area ${sauber(f.name)}: ${vonBis(z(f.von), z(f.bis))}.`)),
    ...(d.marken ?? []).map(q => L(`Senkrechte Marke ${sauber(q.name)} bei ${z(q.x)}.`, `Vertical marker ${sauber(q.name)} at ${z(q.x)}.`))
  ].filter(Boolean);
  const liste = kurven.map(c => { const g = gipfel(c.p); return L(`${c.name ? `${c.name}: ` : ''}höchster Wert ${z(g[1])} bei ${z(g[0])}.`, `${c.name ? `${c.name}: ` : ''}highest value ${z(g[1])} at ${z(g[0])}.`); });
  const wahl = (p: [number, number][]) => { if (p.length <= TABELLE_STELLEN) return p; return Array.from({ length: TABELLE_STELLEN }, (_, i) => p[Math.round((i * (p.length - 1)) / (TABELLE_STELLEN - 1))]!); };
  const tabelle = m === 1
    ? { titel, kopf: [x, y], zeilen: wahl(kurven[0]!.p).map(q => [z(q[0]), z(q[1], 4)]), zeilenKopf: false }
    : { titel, kopf: [L('Kurve', 'Curve'), x, y], zeilen: kurven.flatMap(c => wahl(c.p).map(q => [c.name, z(q[0]), z(q[1], 4)])), zeilenKopf: true };
  const gekuerzt = kurven.some(c => c.p.length > TABELLE_STELLEN);
  return { kurz, beschreibung: gekuerzt ? [...beschreibung, Lp(TABELLE_STELLEN, `Die Tabelle zeigt ${TABELLE_STELLEN} Stelle der Kurve, gleichmäßig verteilt.`, `Die Tabelle zeigt ${TABELLE_STELLEN} Stellen der Kurve, gleichmäßig verteilt.`, `The table shows ${TABELLE_STELLEN} point of the curve, evenly spread.`, `The table shows ${TABELLE_STELLEN} points of the curve, evenly spread.`)] : beschreibung, liste, tabelle };
}
