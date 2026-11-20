/** Meldung 29.10.: Bei großen Zahlen (Einwohner bis 350.000) lief die Achsenzahl in den senkrechten Titel. Der linke Rand wächst jetzt mit der längsten Achsenzahl. Gerendert mit svelte/server (kein Browser nötig). */
import { describe, expect, it } from 'vitest';
import { render } from 'svelte/server';
import Qqdiagramm from '../bausteine/Qqdiagramm.svelte';
import Verteilungsdiagramm from '../bausteine/Verteilungsdiagramm.svelte';
import Streudiagramm from '../bausteine/Streudiagramm.svelte';
import { yMarkenZusatz } from './ytitel';

const PX = 13, ZEICHEN = 0.62;
/** Rechte Kante des senkrechten Titels: Grundlinie plus Unterlänge. */
const TITEL_RECHTS = (x: number) => x + 4;

/** Linke Kante der längsten Achsenzahl und Grundlinie des Titels, aus dem fertigen Bild gelesen. */
function lage(html: string) {
  const zahlen = [...html.matchAll(/<text x="([\d.]+)" y="[\d.-]+" text-anchor="end" class="klein">([^<]+)<\/text>/g)].map(m => Number(m[1]) - m[2]!.length * PX * ZEICHEN);
  const titel = Number(html.match(/<text transform="translate\(([\d.]+) /)?.[1]);
  return { links: Math.min(...zahlen), titel };
}

const gross = Array.from({ length: 200 }, (_, i) => 200 + i * i * 8.7);

describe('Achsenzahl trifft den senkrechten Titel nicht', () => {
  it('Q-Q-Diagramm mit Zahlen bis 350.000', () => {
    const { links, titel } = lage(render(Qqdiagramm, { props: { werte: gross, titel: 'Einwohnerinnen und Einwohner' } }).body);
    expect(links).toBeGreaterThan(TITEL_RECHTS(titel));
  });
  it('Histogramm mit Anzahlen über 10.000', () => {
    const viele = Array.from({ length: 60000 }, (_, i) => i % 3);
    const { links, titel } = lage(render(Verteilungsdiagramm, { props: { werte: viele, titel: 'Stufe' } }).body);
    expect(links).toBeGreaterThan(TITEL_RECHTS(titel));
  });
  it('Streudiagramm mit Zahlen bis 350.000', () => {
    const { links, titel } = lage(render(Streudiagramm, { props: { punkte: gross.map((v, i) => [i, v] as [number, number]), xText: 'Nummer', yText: 'Einwohner' } }).body);
    expect(links).toBeGreaterThan(TITEL_RECHTS(titel));
  });
  it('kleine Zahlen: der Rand bleibt, wie er war', () => {
    expect(yMarkenZusatz(['0', '25', '50', '100'])).toBe(0);
    expect(yMarkenZusatz(['−1,5', '0,5'])).toBe(0);
  });
  it('große Zahlen: der Rand wächst', () => {
    expect(yMarkenZusatz(['0', '350000'])).toBeGreaterThan(15);
  });
});
