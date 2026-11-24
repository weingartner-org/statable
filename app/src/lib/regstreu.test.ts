import { describe, it, expect } from 'vitest';
import { s } from './sitzung.svelte';
import { regressionZuLauf } from './regstreu';

const sp = (name: string) => ({ name, art: 'zahl', fehlend: [], werteLabels: {} }) as never;
function daten() {
  s.projekt = { name: 't' } as never;
  s.spalten = [sp('Ablenkbarkeit'), sp('Zeitmanagement'), sp('Dritte')];
  s.zeilen = [[1, 5, 0], [2, 4, 0], [3, 3, 0], [null, 2, 0]] as never;
}
describe('regressionZuLauf', () => {
  it('ein x, y nicht in /VARIABLES: Punkte ohne Lücken', () => {
    daten();
    const r = regressionZuLauf('DESCRIPTIVES\n/VARIABLES= Ablenkbarkeit Zeitmanagement.\nREGRESSION\n/VARIABLES= Zeitmanagement\n/DEPENDENT= Ablenkbarkeit\n/METHOD=ENTER\n/STATISTICS=COEFF.');
    expect(r).toEqual([{ x: 'Zeitmanagement', y: 'Ablenkbarkeit', punkte: [[5, 1], [4, 2], [3, 3]] }]);
  });
  it('y in /VARIABLES zählt nicht als x; zwei x: kein Bild', () => {
    daten();
    expect(regressionZuLauf('REGRESSION /VARIABLES=Zeitmanagement Ablenkbarkeit /DEPENDENT=Ablenkbarkeit /METHOD=ENTER.')).toHaveLength(1);
    expect(regressionZuLauf('REGRESSION /VARIABLES=Zeitmanagement Dritte /DEPENDENT=Ablenkbarkeit /METHOD=ENTER.')).toHaveLength(0);
  });
});
