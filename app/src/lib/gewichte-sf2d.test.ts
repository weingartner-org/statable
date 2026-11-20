import { describe, expect, it } from 'vitest';
import { gewichtIds, gewichtStatus } from './gewichte';
import { ASSISTENTEN } from './datenassistenten';

/* S-F2 D: die zwei neuen Daten-Assistenten sind Zeilen- und Beschriftungsarbeit: das Fallgewicht verändert ihr Ergebnis nicht (Muster assistent:aggregieren). */
describe('Fallgewicht: neue Assistenten von S-F2 D', () => {
  for (const id of ['eigenschaften', 'vergleichen']) it(`assistent:${id}: unberührt bei beiden Arten`, () => {
    expect(ASSISTENTEN.map(a => a.id)).toContain(id);
    expect(gewichtIds()).toContain(`assistent:${id}`);
    for (const art of ['haeufigkeit', 'umfrage'] as const) expect(gewichtStatus(`assistent:${id}`, art)).toBe('unberuehrt');
  });
});
