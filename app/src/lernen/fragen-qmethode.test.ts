/**
 * B3 Teil 3c (15.11.2026): Die Zahlen der Einheit `q-methode-sichtweisen` (Artikel `q-methode`, Fragen `eh-qm-…`) stammen aus scripts/ueben-erwartet-qmethode.R (Basis-R, R 4.6.1).
 * Dieser Wächter rechnet sie mit lib/qmethode.ts nach (die Bibliothek ist gegen qmethod geprüft: lib/qmethode.test.ts) und prüft, dass Pfad, Einheit, Thema und Fragen zusammenpassen.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { FRAGEN_QMETHODE } from './fragen-qmethode';
import { einheitNach, pfadNach, themaDerFrage } from './lernplan';
import { qRechne, type QErgebnis } from '../lib/qmethode';

const DATEN = [
  [2, 0, 3, 3, -2, 0, -3, -2], [2, 3, 0, 2, -3, -1, -1, -3], [1, 1, 1, 1, 1, 1, 0, -1], [3, 1, 2, 2, 2, 3, 3, 1],
  [1, 2, 2, 1, 3, 1, 1, 2], [-2, 2, 0, -1, 0, -3, 1, -1], [-1, -1, -1, -2, 2, 2, 2, 3], [0, 0, -1, 0, 0, -1, -1, 0],
  [-1, -1, -2, 0, -2, -1, 0, 0], [-2, -2, -2, -2, -1, 0, -1, 1], [0, -3, -1, -1, -1, -2, -2, -2], [-3, -2, -3, -3, -1, -2, -2, -1],
  [-1, -1, 1, -1, 1, 2, 2, 2],
];
const SORTS = DATEN[0]!.map((_, p) => DATEN.map(r => r[p]!));
const erw = JSON.parse(readFileSync(new URL('../lib/testdaten/ueben-erwartet-qmethode.json', import.meta.url), 'utf8')) as Record<string, number>;
const near = (x: number, y: number, t = 1e-4) => expect(Math.abs(x - y)).toBeLessThan(t);

describe('B3 Teil 3c: Lehre Q-Methode', () => {
  it('Einheit im Pfad, sechs Fragen, Thema erheben', () => {
    expect(pfadNach('erheben')!.einheiten).toContain('q-methode-sichtweisen');
    const e = einheitNach('q-methode-sichtweisen')!;
    expect(e.fragen).toEqual(FRAGEN_QMETHODE.map(f => f.id));
    expect(e.fragen.length).toBe(6);
    for (const f of FRAGEN_QMETHODE) expect(themaDerFrage(f.id)).toBe('erheben');
  });
  it('Zahlen der Fragen stimmen mit der Bibliothek und den R-Sollwerten überein', () => {
    const q = qRechne(SORTS, 2) as QErgebnis;
    near(q.korrelation[0]![1]!, erw.korrelationP1P2, 1e-9);
    near(q.eigenwerte[0]!, erw.eigenwert1, 1e-8); near(q.eigenwerte[1]!, erw.eigenwert2, 1e-8); near(q.eigenwerte[2]!, erw.eigenwert3, 1e-8);
    near(1.96 / Math.sqrt(13), erw.schwelle, 1e-9);
    near(q.ladungen[3]![0]!, erw.ladungP4F1); near(q.ladungen[5]![0]!, erw.ladungP6F1); near(q.ladungen[5]![1]!, erw.ladungP6F2); near(q.ladungen[7]![1]!, erw.ladungP8F2);
    expect(q.markiert.filter(r => r[0]).length).toBe(erw.personenF1);
    expect(q.markiert.filter(r => r[1]).length).toBe(erw.personenF2);
    expect(q.markiert[5]).toEqual([false, true]);
    near(q.z[0]![0]!, erw.z1A1, 2e-4); near(q.z[0]![1]!, erw.z2A1, 2e-4); near(q.z[3]![0]!, erw.z1A4, 2e-4); near(q.z[3]![1]!, erw.z2A4, 2e-4);
  });
});
