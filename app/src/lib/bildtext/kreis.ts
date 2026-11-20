/** Kreisdiagramm (Schablone 5.4): Prozent sind die Hauptangabe; der Zentriwinkel entfällt. */
import { L, Lp } from '../sitzung.svelte';
import { z, prozent, sauber, indexMax } from './zahlen';
import { titelOder, keineDaten } from './hilfen';
import type { BildText, KreisDaten } from './typen';

export function kreis(d: KreisDaten): BildText {
  const name = sauber(d.name), titel = titelOder(d.titel, L(`Anteile von ${name}`, `Shares of ${name}`));
  const teile = d.teile.map(t => ({ name: sauber(t.name), wert: Number.isFinite(t.wert) && t.wert > 0 ? t.wert : 0 }));
  const k = teile.length, summe = teile.reduce((a, t) => a + t.wert, 0);
  if (k === 0 || summe === 0) return keineDaten(titel, L(`Kreisdiagramm: Anteile von ${name}, keine Werte.`, `Pie chart: shares of ${name}, no values.`));
  const p = (i: number) => (teile[i]!.wert / summe) * 100;
  const top = indexMax(teile.map(t => t.wert));
  const kurz = L(`Kreisdiagramm: Anteile von ${name}, ${k} Sektoren; größter Anteil ${teile[top]!.name} mit ${prozent(p(top))}.`, `Pie chart: shares of ${name}, ${k} sectors; largest share ${teile[top]!.name} with ${prozent(p(top))}.`);
  const beschreibung = [
    L(`Kreisdiagramm: Anteile von ${name}.`, `Pie chart: shares of ${name}.`),
    Lp(k, `Der Kreis besteht aus ${k} Sektor.`, `Der Kreis besteht aus ${k} Sektoren.`, `The circle consists of ${k} sector.`, `The circle consists of ${k} sectors.`)
  ];
  const liste = teile.map((t, i) => `${t.name}: ${prozent(p(i))}.`);
  const zeilen: (string | number)[][] = teile.map((t, i) => [t.name, z(t.wert), prozent(p(i))]);
  zeilen.push([L('Summe', 'Total'), z(summe), prozent(100)]);
  return { kurz, beschreibung, liste, tabelle: { titel, kopf: [name, L('Anzahl', 'Count'), L('Prozent', 'Percent')], zeilen, zeilenKopf: true } };
}
