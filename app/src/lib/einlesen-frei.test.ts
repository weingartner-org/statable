/**
 * Stufe 2 große Dateien: Bei einer großen Datei ohne Frage zum Lesen werden die Zellen als Text nach dem Einlesen freigegeben. Die Daten bleiben dieselben; kleine Dateien und Dateien mit Frage bleiben wie vorher.
 */
import 'fake-indexeddb/auto';
import { beforeAll, describe, expect, it } from 'vitest';
import { leseAktiveDaten, liesAlsZahl, motor, oeffneDatei, s, SAV_AB_ZEILEN, setzeTestMotor } from './sitzung.svelte';
import { erzeugeTestMotor } from './testmotor';
import { leseDatei } from './einlesen';

beforeAll(async () => { setzeTestMotor(await erzeugeTestMotor()); });

const n = SAV_AB_ZEILEN + 5;
const datei = (zeile: (i: number) => string, zeilen = n) => new File(['a,b,t\n' + Array.from({ length: zeilen }, (_, i) => zeile(i)).join('\n') + '\n'], 'd.csv');
const einfach = (i: number) => `${i},${i % 7 === 0 ? '' : i / 8},${'xyz'[i % 3]}`;

describe('Zellen freigeben nach dem Einlesen', () => {
  it('große Datei ohne Frage: Zeilen frei, die Daten sind vollständig und richtig', async () => {
    const f = datei(einfach), e = await leseDatei(f);
    if (e.art !== 'tabelle') throw new Error(e.art);
    await oeffneDatei(f, undefined, e);
    expect(e.tabelle.zeilen).toEqual([]);
    expect(s.zeilen).toHaveLength(n);
    const nochmal = await leseAktiveDaten(await motor(), n);
    expect(nochmal.zeilen).toHaveLength(n);
    for (const i of [0, 7, 1234, n - 1]) expect(s.zeilen[i]).toEqual([i, i % 7 === 0 ? null : i / 8, 'xyz'[i % 3]]);
    await expect(liesAlsZahl('a')).rejects.toThrow(/neu zu öffnen/);   // Neu lesen sagt ehrlich, dass es nicht geht, statt eine leere Tabelle zu lesen
  }, 120000);

  it('kleine Datei: Zeilen bleiben, Neu lesen geht wie bisher', async () => {
    const f = datei(einfach, 50), e = await leseDatei(f);
    if (e.art !== 'tabelle') throw new Error(e.art);
    await oeffneDatei(f, undefined, e);
    expect(e.tabelle.zeilen).toHaveLength(50);
    await expect(liesAlsZahl('a')).resolves.toBeUndefined();
    expect(s.zeilen).toHaveLength(50);
  }, 60000);

  it('große Datei mit Frage zum Lesen (Prozentzeichen): Zeilen bleiben für das Neu lesen', async () => {
    const f = datei(i => `${i},${(i % 90) + 1} %,x`), e = await leseDatei(f);
    if (e.art !== 'tabelle') throw new Error(e.art);
    await oeffneDatei(f, undefined, e);
    expect(s.lesehinweise.length).toBeGreaterThan(0);
    expect(e.tabelle.zeilen).toHaveLength(n);
  }, 120000);
});
