import { describe, expect, it } from 'vitest';
import { cpLaenge, cpTeil, cpZuUtf16, neuesQualProjekt, positionsKarte, pruefeQualProjekt, textBearbeitbar, utf16ZuCp } from './qualprojekt';
import type { Dokument, QualProjekt } from './qualprojekt';

const dok = (id: string, text = 'Hallo'): Dokument => ({ id, name: id, art: 'text', text, erstellt: 1, geaendert: 1 });

describe('Positionen (Codepoints und UTF-16)', () => {
  it('Text ohne Sonderfälle: Karte leer, Umrechnung gleich', () => {
    const t = 'Guten Morgen, schöne Grüße!';
    const k = positionsKarte(t);
    expect(k.astral).toEqual([]);
    expect(k.laenge).toBe(t.length);
    expect(cpZuUtf16(k, 7)).toBe(7);
    expect(utf16ZuCp(k, 7)).toBe(7);
  });

  it('Emoji zählen als ein Zeichen und rechnen hin und zurück', () => {
    const t = 'a😀b👍c';           // UTF-16: 7, Codepoints: 5
    const k = positionsKarte(t);
    expect(k.laenge).toBe(5);
    expect(k.astral).toEqual([1, 3]);
    expect([0, 1, 2, 3, 4, 5].map(c => cpZuUtf16(k, c))).toEqual([0, 1, 3, 4, 6, 7]);
    for (let c = 0; c <= 5; c++) expect(utf16ZuCp(k, cpZuUtf16(k, c))).toBe(c);
    expect(cpTeil(t, 1, 4)).toBe('😀b👍');
    expect(cpLaenge(t)).toBe(5);
  });

  it('kombinierende Akzente zählen einzeln (e + Akut = zwei Codepoints)', () => {
    const t = 'éx';
    expect(cpLaenge(t)).toBe(3);
    expect(positionsKarte(t).astral).toEqual([]);
    expect(cpTeil(t, 0, 2)).toBe('é');
  });

  it('\\r\\n zählt als zwei Codepoints', () => {
    const t = 'A\r\nB';
    expect(cpLaenge(t)).toBe(4);
    expect(cpTeil(t, 1, 3)).toBe('\r\n');
    expect(cpTeil(t, 3, 4)).toBe('B');
  });

  it('alleinstehende Surrogate werden nicht als Paar gezählt', () => {
    const t = 'a\uD83Db';
    expect(cpLaenge(t)).toBe(3);
    expect(positionsKarte(t).astral).toEqual([]);
  });
});

describe('neuesQualProjekt, textBearbeitbar', () => {
  it('leeres Projekt besteht die eigene Prüfung', () => {
    const p = neuesQualProjekt('Meine Interviews');
    expect(p.name).toBe('Meine Interviews');
    expect(p.herkunft?.art).toBe('neu');
    expect(pruefeQualProjekt(JSON.parse(JSON.stringify(p)))).toEqual(p);
  });
  it('Text ist bearbeitbar, solange es keine Segmente zum Dokument gibt', () => {
    const p = neuesQualProjekt('x');
    p.dokumente.push(dok('d1'), dok('d2'));
    expect(textBearbeitbar(p.dokumente[0]!, p)).toBe(true);
    p.segmente.push({ id: 's1', dokument: 'd1', start: 0, ende: 2, erstellt: 1 });
    expect(textBearbeitbar(p.dokumente[0]!, p)).toBe(false);
    expect(textBearbeitbar(p.dokumente[1]!, p)).toBe(true);
  });
});

describe('pruefeQualProjekt', () => {
  const voll = (): QualProjekt => {
    const p = neuesQualProjekt('Voll');
    p.kodierende.push({ id: 'k1', name: 'Ich' });
    p.faelle.push({ id: 'f1', name: 'Fall 1', werte: { Rolle: 'befragt' } });
    p.variablen.push({ id: 'v1', name: 'Rolle', typ: 'text' });
    const d = dok('d1', 'Anna: Hallo');
    d.fall = 'f1';
    d.transkript = { sprecher: [{ id: 'sp1', name: 'Anna', rolle: 'befragt', fall: 'f1' }], abschnitte: [{ start: 0, ende: 11, sprecher: 'sp1', zeitMs: 0, bisMs: 1000 }], quelle: 'vtt' };
    d.medium = { datei: 'a.wav', typ: 'audio/wav', groesse: 10, sha256: 'ab' };
    p.dokumente.push(d);
    p.codes.push({ id: 'c1', name: 'Code', kodierbar: true, reihenfolge: 0, farbe: '#aabbcc', anker: [{ text: 'Beispiel' }] });
    return p;
  };
  const roundtrip = (p: unknown) => pruefeQualProjekt(JSON.parse(JSON.stringify(p)));

  it('ein volles Projekt geht unverändert durch', () => {
    const p = voll();
    expect(roundtrip(p)).toEqual(p);
  });

  it('wirft bei falschem Format und falscher Form', () => {
    expect(() => pruefeQualProjekt(null)).toThrow();
    expect(() => pruefeQualProjekt([])).toThrow();
    expect(() => pruefeQualProjekt({ ...voll(), format: 'anders' })).toThrow();
    expect(() => pruefeQualProjekt({ ...voll(), version: 4 })).toThrow();
    expect(() => pruefeQualProjekt({ ...voll(), dokumente: 'x' })).toThrow();
    expect(() => pruefeQualProjekt({ ...voll(), name: 5 })).toThrow();
  });

  it('wirft bei falschen Feldern in Dokumenten, Abschnitten, Codes', () => {
    const f = (aendere: (p: QualProjekt) => void) => { const p = voll(); aendere(p); expect(() => roundtrip(p)).toThrow(); };
    f(p => { (p.dokumente[0]! as unknown as { art: string }).art = 'bild'; });
    f(p => { p.dokumente[0]!.transkript!.abschnitte[0]!.ende = 999; });
    f(p => { p.dokumente[0]!.transkript!.abschnitte[0]!.start = 5; p.dokumente[0]!.transkript!.abschnitte[0]!.ende = 2; });
    f(p => { p.dokumente[0]!.transkript!.abschnitte[0]!.sprecher = 'gibtsnicht'; });
    f(p => { p.dokumente[0]!.fall = 'gibtsnicht'; });
    f(p => { p.dokumente[0]!.medium!.groesse = -1; });
    f(p => { p.codes[0]!.farbe = 'rot'; });
    f(p => { p.codes[0]!.elternId = 'gibtsnicht'; });
    f(p => { p.dokumente.push(dok('d1')); });
    f(p => { (p.faelle[0]!.werte as Record<string, unknown>).X = { a: 1 }; });
    f(p => { p.segmente.push({ id: 's', dokument: 'nix', start: 0, ende: 1, erstellt: 1 }); });
    f(p => { p.kodierungen.push({ id: 'k', segment: 'nix', code: 'c1', kodierende: 'k1', erstellt: 1 }); });
  });

  it('Text fehlt (Projektdatei legt ihn getrennt ab): leerer Text, Abschnitte werden dann nicht an der Länge gemessen', () => {
    const p = JSON.parse(JSON.stringify(voll())) as { dokumente: Record<string, unknown>[] };
    delete p.dokumente[0]!.text;
    const r = pruefeQualProjekt(p);
    expect(r.dokumente[0]!.text).toBe('');
  });

  it('unbekannte Felder fallen weg, "__proto__" in Fallwerten bleibt nur ein Schlüssel', () => {
    const j = JSON.parse(JSON.stringify(voll())) as Record<string, unknown>;
    j.zukunft = { x: 1 };
    (j.faelle as { werte: Record<string, unknown> }[])[0]!.werte = JSON.parse('{"__proto__": 1, "a": "b"}');
    const r = pruefeQualProjekt(j);
    expect((r as unknown as Record<string, unknown>).zukunft).toBeUndefined();
    expect(Object.keys(r.faelle[0]!.werte).sort()).toEqual(['__proto__', 'a']);
    expect(({} as Record<string, unknown>).x).toBeUndefined();
    expect(Object.getPrototypeOf(r.faelle[0]!.werte)).toBe(Object.prototype);
  });

  it('Emoji im Dokument: Abschnitte werden in Codepoints gegen die Länge geprüft', () => {
    const p = voll();
    p.dokumente[0]!.text = 'Anna: 😀';        // 7 Codepoints, 8 UTF-16
    p.dokumente[0]!.transkript!.abschnitte[0]!.ende = 7;
    expect(() => roundtrip(p)).not.toThrow();
    p.dokumente[0]!.transkript!.abschnitte[0]!.ende = 8;
    expect(() => roundtrip(p)).toThrow();
  });
});
