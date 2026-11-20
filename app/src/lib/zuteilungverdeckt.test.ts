import { describe, expect, it } from 'vitest';
import { fingerabdruck, kryptoSalz, listenText, protokollCsv, sha256Hex, verdecktErzeugen } from './zuteilungverdeckt';
import { zufall as mulberry32 } from './zufall';

const E = { gruppen: ['A', 'B'], verhaeltnis: [1, 1], blockgroessen: [4, 6], n: 20, aufrunden: false };
describe('verdeckte Zuteilung', () => {
  it('SHA-256 stimmt mit dem bekannten Prüfwert für "abc"', async () => {
    expect(await sha256Hex('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });
  it('Liste: richtige Länge, Blöcke gleichen die Gruppen aus', () => {
    const l = verdecktErzeugen(E, mulberry32(7));
    if ('ok' in l) throw new Error(l.code);
    const f = l.schichten[0]!.folge;
    expect(f.length).toBe(20);
    expect(Math.abs(f.filter(g => g === 'A').length - 10)).toBeLessThanOrEqual(2);
  });
  it('Schichten: je Schicht eine eigene Folge', () => {
    const l = verdecktErzeugen({ ...E, n: undefined, schichten: [{ name: 'Z1', n: 8 }, { name: 'Z2', n: 12 }] }, mulberry32(3));
    if ('ok' in l) throw new Error(l.code);
    expect(l.schichten.map(s => s.folge.length)).toEqual([8, 12]);
  });
  it('Fehler werden weitergegeben', () => { expect(verdecktErzeugen({ ...E, blockgroessen: [3] })).toEqual({ ok: false, code: 'blockgroesse' }); });
  it('Fingerabdruck: gleiches Salz und gleiche Liste geben dasselbe, anderes Salz etwas anderes', async () => {
    const l = verdecktErzeugen(E, mulberry32(1)); if ('ok' in l) throw new Error();
    const a = await fingerabdruck('aa', l), b = await fingerabdruck('aa', l), c = await fingerabdruck('ab', l);
    expect(a).toBe(b); expect(a).not.toBe(c); expect(a).toHaveLength(64);
    expect(kryptoSalz()).toMatch(/^[0-9a-f]{32}$/);
  });
  it('Protokoll: Zellen mit Formelzeichen werden entschärft, Liste nur bei Offenlegung', () => {
    const l = verdecktErzeugen(E, mulberry32(1)); if ('ok' in l) throw new Error();
    const zu = protokollCsv(['Kopf'], [{ nr: 1, schicht: null, kennung: '=1+1', gruppe: 'A', zeit: 'z' }], { schichten: false });
    expect(zu).toContain("'=1+1"); expect(zu).not.toContain('Liste');
    expect(protokollCsv(['Kopf'], [], { schichten: false }, { salz: 'ab', liste: l })).toContain(`Liste : ${l.schichten[0]!.folge.join(',')}`);
    expect(listenText(l).startsWith(': ')).toBe(true);
  });
});
