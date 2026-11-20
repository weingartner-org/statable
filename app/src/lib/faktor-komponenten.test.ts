import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { nodeEngine } from './testengine';

/* Befund F1 (SPSS-Vergleich 18.10.2026): PSPP 2.1.1 nahm bei der Hauptkomponentenanalyse die FALSCHEN Eigenvektoren
 * (GSL liefert sie unsortiert, factor.c sortierte in iterate_factor_matrix nicht). Behoben im Patch
 * patches/0003-faktorenanalyse-eigenvektoren-sortieren.diff. Die Sollwerte kommen aus R (eigen(cor(x)), Ladung = Vektor * Wurzel(Eigenwert)),
 * nicht aus PSPP: scripts/faktor-komponenten-erwartet.R. Mit der alten Engine schlagen stackloss und trees fehl (Messlatte: Gegenprobe im Patch). */
const soll = JSON.parse(readFileSync(new URL('../../../pruefdaten/faktor-komponenten.json', import.meta.url), 'utf8')) as Record<string, {
  namen: string[]; zeilen: number[][]; k: number; eigenwerte: number[]; betrag: number[][];
}>;
let e: Awaited<ReturnType<typeof nodeEngine>>;
beforeAll(async () => { e = await nodeEngine(); });

describe('Hauptkomponentenanalyse: Ladungen gleich R', () => {
  for (const [name, f] of Object.entries(soll)) {
    it(`${name}: alle Komponentenladungen (Betrag) und Eigenwerte stimmen`, () => {
      const daten = f.zeilen.map(z => z.join(' ')).join('\n');
      const items = e.run(`NEW FILE.\nDATA LIST FREE /${f.namen.join(' ')}.\nBEGIN DATA\n${daten}\nEND DATA.\n` +
        `FACTOR /VARIABLES=${f.namen.join(' ')} /CRITERIA=FACTORS(${f.k}) /EXTRACTION=PC /ROTATION=NOROTATE.`);
      const cm = items.find((i: any) => i.type === 'table' && i.label === 'Component Matrix') as any;
      expect(cm, 'Component Matrix fehlt').toBeTruthy();
      for (let j = 0; j < f.k; j++) for (let r = 0; r < f.namen.length; r++) {
        const zelle = cm.cells.find((c: any) => c.r === r + 2 && c.c === j + 1);
        expect(Math.abs(zelle.n), `${name}: Variable ${r + 1}, Komponente ${j + 1}`).toBeCloseTo(f.betrag[r]![j]!, 3);
      }
      const tv = items.find((i: any) => i.type === 'table' && i.label === 'Total Variance Explained') as any;
      const ev = (i: number) => tv.cells.find((c: any) => c.r === i + 2 && c.c === 1)?.n;
      for (let i = 0; i < f.k; i++) expect(ev(i)).toBeCloseTo(f.eigenwerte[i]!, 3);
    });
  }
});
