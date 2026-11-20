import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

/* ===== Paket 3D (Prüfer, ROTE TESTS vor dem Bau): Einmal-Codes erzeugen und normalisieren =====
 * Grundlage: docs/erheben/FACHBLATT-STUFE-3.md (Abschnitt 3D). Neue Datei: lib/einmalcodes.ts
 *
 * ---------------------------------- Festlegungen für den Bauer (vom Prüfer) ----------------------------------
 *  export const CODE_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'   (Crockford-Base32: 32 Zeichen, ohne I, L, O, U)
 *  erzeugeCodes(n: number, laenge = 8): string[]
 *      laenge = Zahl der Zeichen OHNE Bindestriche; Gruppen zu je 4 Zeichen, getrennt durch „-“ („ABCD-EFGH“; laenge 6 → „ABCD-EF“, laenge 4 → „ABCD“).
 *      Eindeutig innerhalb der Liste (bei Doppelung wird neu gezogen). n = 0 → []. Erlaubt: laenge 4 bis 32.
 *      Wirft RangeError bei: n nicht ganze Zahl oder < 0; laenge keine ganze Zahl oder ausserhalb 4..32; n > 32^laenge (mehr Codes, als es gibt) - SOFORT, ohne zu rechnen.
 *  Zufall: NUR `globalThis.crypto.getRandomValues` (bei JEDEM Aufruf neu von globalThis gelesen, nicht beim Laden des Moduls), nie Math.random.
 *      Jedes Zufallsbyte b liefert das Zeichen CODE_ALPHABET[b % 32] (256 ist durch 32 teilbar: kein Modulo-Fehler, kein Verwerfen nötig).
 *      Die Bytes werden der Reihe nach verbraucht (Zeichen für Zeichen, Code für Code).
 *  normalisiereCode(eingabe: string): string
 *      Grossbuchstaben, alle Leerzeichen/Tabs und Bindestriche entfernen, nach Crockford O → 0 und I, L → 1; danach wieder in 4er-Gruppen mit „-“ gesetzt (kanonische Form).
 *      Andere Zeichen (auch U oder Satzzeichen) bleiben unverändert (der Vergleich mit der Liste scheitert dann von selbst). Leere Eingabe → ''.
 *  Alle Codes aus erzeugeCodes sind schon kanonisch: normalisiereCode(c) === c.
 */
interface Mod {
  CODE_ALPHABET?: string;
  erzeugeCodes?: (n: number, laenge?: number) => string[];
  normalisiereCode?: (eingabe: string) => string;
}
let mod: Mod | null = null;
beforeAll(async () => { const pfad = './einmalcodes'; mod = (await import(/* @vite-ignore */ pfad).catch(() => null)) as Mod | null; });
function fn<K extends 'erzeugeCodes' | 'normalisiereCode'>(n: K): NonNullable<Mod[K]> {
  const f = mod?.[n];
  if (!f) throw new Error(`lib/einmalcodes.ts: ${n} fehlt (rot bis zum Bau)`);
  return f as NonNullable<Mod[K]>;
}
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

describe('Alphabet', () => {
  it('exportiert genau das Crockford-Alphabet ohne I, L, O, U', () => {
    expect(mod?.CODE_ALPHABET).toBe(ALPHABET);
    expect(ALPHABET.length).toBe(32);
    expect(new Set(ALPHABET).size).toBe(32);
    for (const c of 'ILOU') expect(ALPHABET).not.toContain(c);
  });
  it('kein erzeugter Code enthält I, L, O, U oder Kleinbuchstaben', () => {
    const codes = fn('erzeugeCodes')(2000);
    for (const c of codes) expect(c).toMatch(/^[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}$/);
  });
  it('alle 32 Zeichen kommen vor, ungefähr gleich oft (80.000 Zeichen, je Zeichen um 2.500 ± 300)', () => {
    const zaehl = new Map<string, number>();
    for (const c of fn('erzeugeCodes')(10000)) for (const z of c.replace('-', '')) zaehl.set(z, (zaehl.get(z) ?? 0) + 1);
    expect(zaehl.size).toBe(32);
    for (const z of ALPHABET) { expect(zaehl.get(z)!).toBeGreaterThan(2200); expect(zaehl.get(z)!).toBeLessThan(2800); }
  });
});

describe('Form und Länge', () => {
  it('Voreinstellung: „ABCD-EFGH“ (acht Zeichen in zwei Vierergruppen)', () => {
    const [c] = fn('erzeugeCodes')(1);
    expect(c).toMatch(/^[0-9A-Z]{4}-[0-9A-Z]{4}$/);
    expect(c.length).toBe(9);
  });
  it('laenge 4, 6, 12 und 32 (Gruppen zu 4, letzte Gruppe kürzer)', () => {
    const f = fn('erzeugeCodes');
    expect(f(5, 4).every(c => /^[0-9A-Z]{4}$/.test(c))).toBe(true);
    expect(f(5, 6).every(c => /^[0-9A-Z]{4}-[0-9A-Z]{2}$/.test(c))).toBe(true);
    expect(f(5, 12).every(c => /^[0-9A-Z]{4}-[0-9A-Z]{4}-[0-9A-Z]{4}$/.test(c))).toBe(true);
    expect(f(1, 32)[0].replace(/-/g, '').length).toBe(32);
    expect(f(1, 32)[0].split('-').length).toBe(8);
  });
  it('liefert genau n Codes, n = 0 ergibt eine leere Liste', () => {
    const f = fn('erzeugeCodes');
    expect(f(0)).toEqual([]);
    expect(f(1).length).toBe(1);
    expect(f(37).length).toBe(37);
  });
});

describe('Eindeutigkeit', () => {
  it('10.000 Codes ohne Dopplung', () => {
    const codes = fn('erzeugeCodes')(10000);
    expect(codes.length).toBe(10000);
    expect(new Set(codes).size).toBe(10000);
  });
  it('auch bei kleinem Raum (laenge 4 = 1.048.576 Möglichkeiten): 5.000 Codes ohne Dopplung', () => {
    const codes = fn('erzeugeCodes')(5000, 4);
    expect(new Set(codes).size).toBe(5000);
  });
  it('zwei Aufrufe liefern verschiedene Listen', () => {
    const f = fn('erzeugeCodes');
    expect(f(20)).not.toEqual(f(20));
  });
  it('bei Dopplung wird neu gezogen: Zufall liefert erst zweimal dieselben Bytes, dann andere → zwei verschiedene Codes', () => {
    let verbraucht = 0;
    vi.stubGlobal('crypto', { getRandomValues: <T extends ArrayBufferView>(a: T): T => {
      const u = a as unknown as Uint8Array;
      for (let i = 0; i < u.length; i++) u[i] = verbraucht++ < 16 ? 0 : 1;
      return a;
    } });
    const codes = fn('erzeugeCodes')(2);
    expect(codes[0]).toBe('0000-0000');
    expect(codes[1]).not.toBe(codes[0]);
    expect(new Set(codes).size).toBe(2);
  });
});

describe('Zufall aus crypto.getRandomValues', () => {
  it('Bytes der Reihe nach → Zeichen CODE_ALPHABET[b % 32]: 0..7 ergibt „0123-4567“', () => {
    let z = 0;
    const stub = vi.fn(<T extends ArrayBufferView>(a: T): T => { const u = a as unknown as Uint8Array; for (let i = 0; i < u.length; i++) u[i] = z++; return a; });
    vi.stubGlobal('crypto', { getRandomValues: stub });
    expect(fn('erzeugeCodes')(1)[0]).toBe('0123-4567');
    expect(stub).toHaveBeenCalled();
  });
  it('Bytes ≥ 32 werden mit % 32 abgebildet (255 → Z, 32 → 0, 63 → Z, 64 → 0)', () => {
    const bytes = [255, 32, 63, 64, 33, 100, 200, 250];
    let z = 0;
    vi.stubGlobal('crypto', { getRandomValues: <T extends ArrayBufferView>(a: T): T => { const u = a as unknown as Uint8Array; for (let i = 0; i < u.length; i++) u[i] = bytes[z++ % bytes.length]; return a; } });
    const erwartet = bytes.map(b => ALPHABET[b % 32]).join('');
    expect(fn('erzeugeCodes')(1)[0]).toBe(`${erwartet.slice(0, 4)}-${erwartet.slice(4)}`);
  });
  it('Math.random wird nie benutzt', () => {
    const spy = vi.spyOn(Math, 'random').mockImplementation(() => { throw new Error('Math.random verboten'); });
    expect(() => fn('erzeugeCodes')(100)).not.toThrow();
    expect(spy).not.toHaveBeenCalled();
  });
  it('ohne crypto.getRandomValues wird NICHT still auf etwas Schwächeres ausgewichen, sondern geworfen', () => {
    const f = fn('erzeugeCodes');
    expect(f(1).length).toBe(1);          // mit crypto geht es
    vi.stubGlobal('crypto', undefined);
    expect(() => f(1)).toThrow();
  });
});

describe('Fehlerfälle', () => {
  it('RangeError bei n < 0, nicht ganzer Zahl, NaN', () => {
    const f = fn('erzeugeCodes');
    expect(() => f(-1)).toThrow(RangeError);
    expect(() => f(2.5)).toThrow(RangeError);
    expect(() => f(NaN)).toThrow(RangeError);
  });
  it('RangeError bei laenge ausserhalb 4..32 oder nicht ganz', () => {
    const f = fn('erzeugeCodes');
    for (const l of [0, 3, 33, 6.5, NaN]) expect(() => f(1, l)).toThrow(RangeError);
  });
  it('RangeError sofort, wenn n grösser ist als der Raum (32^4 + 1 bei laenge 4)', () => {
    const t = Date.now();
    expect(() => fn('erzeugeCodes')(32 ** 4 + 1, 4)).toThrow(RangeError);
    expect(Date.now() - t).toBeLessThan(500);
  });
});

describe('normalisiereCode', () => {
  it('Kleinbuchstaben, Leerzeichen und Bindestriche: „abcd efgh“ → „ABCD-EFGH“', () => {
    const f = fn('normalisiereCode');
    expect(f('abcd efgh')).toBe('ABCD-EFGH');
    expect(f('  abcd-efgh  ')).toBe('ABCD-EFGH');
    expect(f('abcdefgh')).toBe('ABCD-EFGH');
    expect(f('a b c d\te f g h')).toBe('ABCD-EFGH');
  });
  it('Crockford: O → 0, I → 1, L → 1 (auch klein)', () => {
    const f = fn('normalisiereCode');
    expect(f('OOOO-OOOO')).toBe('0000-0000');
    expect(f('iiii-llll')).toBe('1111-1111');
    expect(f('o0Il-1ilo')).toBe('0011-1110');
  });
  it('Zeichen aus dem Alphabet bleiben, U und Satzzeichen bleiben unverändert (nur grossgeschrieben)', () => {
    const f = fn('normalisiereCode');
    expect(f('7K3M-QRTV')).toBe('7K3M-QRTV');
    expect(f('uuuu')).toBe('UUUU');
    expect(f('ab!d-efgh')).toBe('AB!D-EFGH');
  });
  it('kürzere und längere Eingaben werden in 4er-Gruppen gesetzt; leer bleibt leer', () => {
    const f = fn('normalisiereCode');
    expect(f('abcdef')).toBe('ABCD-EF');
    expect(f('abcd')).toBe('ABCD');
    expect(f('abcdefghijkl')).toBe('ABCD-EFGH-1JK1');   // I und L werden zu 1
    expect(f('')).toBe('');
    expect(f('  - ')).toBe('');
  });
  it('erzeugte Codes sind schon kanonisch; Abtippen mit Verwechslungen führt zum selben Code', () => {
    const codes = fn('erzeugeCodes')(500);
    const f = fn('normalisiereCode');
    for (const c of codes) expect(f(c)).toBe(c);
    for (const c of codes.slice(0, 50)) {
      const getippt = c.toLowerCase().replace(/0/g, 'o').replace(/1/g, 'l').replace('-', ' ');
      expect(f(getippt)).toBe(c);
    }
  });
});
