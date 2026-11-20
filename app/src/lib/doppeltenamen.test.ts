/** Prüfung G6: Zwei Spalten mit gleicher Überschrift heißen nicht überall gleich. */
import { describe, expect, it } from 'vitest';
import { leseCsv, planeSpalten } from './einlesen';

describe('Gleiche Spaltenüberschriften (G6)', () => {
  it('die spätere heißt „x (2)“, die erste bleibt; die Datei-Überschrift wird gemerkt', () => {
    const p = planeSpalten(leseCsv('x,y,x\n1,2,3\n4,5,6\n'));
    expect(p.map(x => x.name)).toEqual(['x', 'y', 'x_2']);
    expect(p.map(x => x.bezeichnung || x.name)).toEqual(['x', 'y', 'x (2)']);
    expect(p[2]!.umbenanntVon).toBe('x');
    expect(p[0]!.umbenanntVon).toBeUndefined();
  });
  it('Groß/Klein zählt als gleich; dritte heißt „(3)“; Überschrift mit Leerzeichen', () => {
    const p = planeSpalten(leseCsv('Note,note,Note\n1,2,3\n'));
    expect(p.map(x => x.bezeichnung || x.name)).toEqual(['Note', 'note (2)', 'Note (3)']);
    const q = planeSpalten(leseCsv('Lesetest vorher,Lesetest vorher\n1,2\n'));
    expect(q.map(x => x.bezeichnung || x.name)).toEqual(['Lesetest vorher', 'Lesetest vorher (2)']);
  });
  it('verschiedene Überschriften bleiben unberührt', () => {
    const p = planeSpalten(leseCsv('a,b,c\n1,2,3\n'));
    expect(p.every(x => !x.umbenanntVon)).toBe(true);
  });
});
