import { beforeAll, describe, expect, it } from 'vitest';
import { nodeEngine } from './testengine';
import { leseVerzeichnis } from './verzeichnis';
import { skala } from './ergebnis';
import { freierName, gueltigerName, skalenwertBefehl, umpolBefehl } from './skalabau';

/* Vier Fragen 1-5, die vierte umgekehrt gestellt; 9 = keine Angabe. Wie FG22 FG44 FG63 FG76 im Kurs (lernenimstudium.sav). */
const DATEN = `DATA LIST LIST /a b c d.
BEGIN DATA
1 1 2 5
2 2 2 4
3 3 4 3
4 4 4 2
5 5 5 1
2 1 2 4
4 5 4 9
3 2 3 3
5 4 5 2
1 2 1 5
END DATA.
VALUE LABELS a b c d 1 'sehr selten' 2 'selten' 3 'manchmal' 4 'oft' 5 'sehr oft'.
VARIABLE LABELS d 'Frage d umgekehrt'.
MISSING VALUES d (9).
FORMATS a b c d (F1.0).
VARIABLE LEVEL a b c d (ORDINAL).
EXECUTE.`;

let e: Awaited<ReturnType<typeof nodeEngine>>;
const verzeichnis = () => leseVerzeichnis(e.run('DISPLAY DICTIONARY.'));
const alpha = (v: string) => skala(e.run(`RELIABILITY /VARIABLES=${v} /SCALE('S') ALL /MODEL=ALPHA /SUMMARY=TOTAL.`));
beforeAll(async () => { e = await nodeEngine(); e.run(DATEN); });

describe('Frage umpolen', () => {
  it('neue Spalte dR = (min + max) - Wert, gespiegelte Wertelabels, keine Angabe bleibt leer', () => {
    const vorher = alpha('a b c d');
    expect(vorher.fragen[3]!.trennschaerfe).toBeLessThan(0);
    const sp = verzeichnis().find(x => x.name === 'd')!;
    const u = umpolBefehl(sp, [5, 4, 3, 2, 1, 4, 9, 3, 2, 5], verzeichnis().map(x => x.name));
    expect(u.neu).toBe('dR');
    expect([u.min, u.max]).toEqual([1, 5]);
    e.run(u.syntax);
    const dR = verzeichnis().find(x => x.name === 'dR')!;
    expect(dR.werteLabels).toMatchObject({ '1': 'sehr oft', '5': 'sehr selten', '3': 'manchmal' });
    expect(dR.bezeichnung).toBe('Frage d umgekehrt (umgepolt)');
    const n = e.run('DESCRIPTIVES dR /STATISTICS=MIN MAX.');
    expect(JSON.stringify(n)).toContain('"n":9');   // die 9 (keine Angabe) wird nicht zu -3
    const nachher = alpha('a b c dR');
    expect(nachher.fragen[3]!.trennschaerfe).toBeGreaterThan(0);
    expect(nachher.alpha).toBeGreaterThan(vorher.alpha + 0.3);
  });
  it('Spanne aus den Wertelabels, auch wenn nicht alle Antworten vorkommen', () => {
    const sp = { ...verzeichnis().find(x => x.name === 'd')!, name: 'd' };
    expect([umpolBefehl(sp, [2, 3, 4], []).min, umpolBefehl(sp, [2, 3, 4], []).max]).toEqual([1, 5]);
    expect([umpolBefehl({ ...sp, werteLabels: {} }, [2, 3, 4, 9], []).min, umpolBefehl({ ...sp, werteLabels: {} }, [2, 3, 4, 9], []).max]).toEqual([2, 4]);
  });
  it('bestätigte Spanne geht vor (C1: niemand kreuzt die 5 an, Skala trotzdem 1-5)', () => {
    const sp = { ...verzeichnis().find(x => x.name === 'd')!, werteLabels: {} };
    const u = umpolBefehl(sp, [1, 2, 3, 4], [], { min: 1, max: 5 });
    expect(u.syntax).toContain('= 6 - d.');
  });
  it('Name ist schon vergeben: dR2', () => {
    expect(freierName('dR', ['a', 'DR'])).toBe('dR2');
  });
});

describe('Skalenwert als neue Spalte', () => {
  it('Mittelwert der Fragen wie im Kurs: COMPUTE … = MEAN(…)', () => {
    const syntax = skalenwertBefehl(['a', 'b', 'c', 'dR'], 'ABLENK', 'Skalenwert aus a, b, c, dR');
    expect(syntax).toMatch(/^COMPUTE ABLENK = MEAN\(a, b, c, dR\)\./);
    e.run(syntax);
    const sp = verzeichnis().find(x => x.name === 'ABLENK')!;
    expect(sp.bezeichnung).toBe('Skalenwert aus a, b, c, dR');
    expect(sp.niveau).toBe('metrisch');
    const t = e.run('LIST ABLENK.');
    expect(JSON.stringify(t)).toContain('"n":1.25');   // erste Person: (1 + 1 + 2 + 1) / 4
  });
  it('Namen prüfen', () => {
    expect(gueltigerName('ZEITMAN')).toBe(true);
    expect(gueltigerName('2fach')).toBe(false);
    expect(gueltigerName('mit Leerzeichen')).toBe(false);
    expect(gueltigerName('ALL')).toBe(false);
    expect(gueltigerName('ende.')).toBe(false);
  });
});

describe('Skalenwert mit Mindestzahl', () => {
  it('Skalenwert mit Mindestzahl (C3): MEAN.n lässt Personen mit zu wenigen Antworten leer', () => {
    expect(skalenwertBefehl(['a', 'b', 'c'], 'sw', 'x', 2)).toContain('MEAN.2(a, b, c)');
    expect(skalenwertBefehl(['a', 'b', 'c'], 'sw', 'x')).toContain('= MEAN(a, b, c)');
    e.run('DATA LIST FREE /p q r.\nBEGIN DATA.\n1 2 3 4 . . 5 5 .\nEND DATA.');
    e.run(skalenwertBefehl(['p', 'q', 'r'], 'sw', 'x', 2));
    expect(JSON.stringify(e.run('DESCRIPTIVES sw /STATISTICS=MEAN.'))).toContain('"n":2');
  });
});
