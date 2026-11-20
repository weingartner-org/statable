import { beforeAll, describe, expect, it } from 'vitest';
import { nodeEngine } from './testengine';

/** Prüfung C2 (08.10.): „In Gruppen teilen“ schob fehlende Werte mit ELSE in Gruppe 2 und „Keine Angabe“ (-9) in Gruppe 1. */
let e: Awaited<ReturnType<typeof nodeEngine>>;
beforeAll(async () => { e = await nodeEngine(); e.run(`DATA LIST FREE /x.\nBEGIN DATA.\n1 2 3 4 5 6 . -9\nEND DATA.\nMISSING VALUES x (-9).`); });
const zaehle = (syntax: string) => e.run(syntax);

describe('In Gruppen teilen', () => {
  it('fehlende und „Keine Angabe“ bleiben fehlend', () => {
    zaehle('RECODE x (MISSING=SYSMIS) (LOWEST THRU 3.5=1) (ELSE=2) INTO g.\nEXECUTE.');
    const v = e.run('DESCRIPTIVES g /STATISTICS=MEAN.');
    expect(JSON.stringify(v)).toContain('"n":6');
  });
  it('ohne MISSING=SYSMIS war es falsch (Beleg)', () => {
    e.run('RECODE x (LOWEST THRU 3.5=1) (ELSE=2) INTO h.\nEXECUTE.');
    expect(JSON.stringify(e.run('DESCRIPTIVES h /STATISTICS=MEAN.'))).toContain('"n":8');
  });
});
