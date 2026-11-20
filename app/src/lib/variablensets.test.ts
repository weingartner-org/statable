import { describe, it, expect } from 'vitest';
import { nodeEngine } from './testengine';
import { mitVariablensets, leseVariablensets, variablensetText, leseVariablensetText } from './variablensets';

/** Von PSPP 2.1.1 geschrieben: FG01 (Bezeichnung, Wertelabels), FG14 (fehlend 99), FG27, langername_mit_text (langer Name); zwei Zeilen. */
const SAV = Uint8Array.from(atob('JEZMMkAoIykgU1BTUyBEQVRBIEZJTEUgR05VIHBzcHAgMi4xLjEgLSBpNjg2LXBjLWxpbnV4LW11c2wgICAgIAIAAAAEAAAAAQAAAAAAAAACAAAAAAAAAAAAWUAwOSBPY3QgMjYwODozNjoxMCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAAAAACAAAAAAAAAAEAAAAAAAAAAAMFAAADBQBGRzAxICAgIBUAAABJY2ggbWFjaGUgbWlyIE5vdGl6ZW4gICACAAAAAAAAAAAAAAABAAAAAAMFAAADBQBGRzE0ICAgIAAAAAAAwFhAAgAAAAAAAAAAAAAAAAAAAAADBQAAAwUARkcyNyAgICACAAAAAAAAAAAAAAAAAAAAAAMFAAADBQBMQU5HRVJOQQMAAAACAAAAAAAAAAAA8D8DbmllAAAAAAAAAAAAABRACHNlaHIgb2Z0AAAAAAAAAAQAAAABAAAAAQAAAAcAAAADAAAABAAAAAgAAAACAAAAAQAAAAEAAAD/////AQAAAAEAAAACAAAA6f0AAAcAAAAEAAAACAAAAAMAAAD////////v/////////+9//v//////7/8HAAAACwAAAAQAAAAMAAAAAQAAAAgAAAABAAAAAQAAAAgAAAABAAAAAQAAAAgAAAABAAAAAQAAAAgAAAABAAAABwAAAA0AAAABAAAAOgAAAEZHMDE9RkcwMQlGRzE0PUZHMTQJRkcyNz1GRzI3CUxBTkdFUk5BPWxhbmdlcm5hbWVfbWl0X3RleHQHAAAAEgAAAAEAAABWAAAARkcwMTokQFJvbGUoJzAnCikvRkcxNDokQFJvbGUoJzAnCikvRkcyNzokQFJvbGUoJzAnCikvbGFuZ2VybmFtZV9taXRfdGV4dDokQFJvbGUoJzAnCikHAAAAFAAAAAEAAAAFAAAAVVRGLTjnAwAAAAAAAGVmZ2hmZ2hp'), c => c.charCodeAt(0));
const ende999 = (b: Uint8Array) => { const dv = new DataView(b.buffer, b.byteOffset); for (let o = 176; o < b.length - 4; o += 4) if (dv.getInt32(o, true) === 999 && dv.getInt32(o + 4, true) === 0) return o; return -1; };

describe('SPSS-Variablensets', () => {
  it('Text: je Set eine Zeile „Name= Spalten“', () => {
    expect(variablensetText([{ name: 'Organisation', spalten: ['FG01', 'FG14'] }, { name: 'leer', spalten: [] }])).toBe('Organisation= FG01 FG14\n');
    expect(variablensetText([{ name: 'a=b\nc', spalten: ['x'] }])).toBe('a b c= x\n');
    expect(leseVariablensetText('Organisation= FG01 FG14\nohne Gleich\n Elaboration =FG02  FG15 \n')).toEqual([{ name: 'Organisation', spalten: ['FG01', 'FG14'] }, { name: 'Elaboration', spalten: ['FG02', 'FG15'] }]);
  });
  it('einfügen, wieder lesen, ersetzen und entfernen; der Datenteil bleibt gleich', () => {
    expect(leseVariablensets(SAV)).toEqual([]);
    const sets = [{ name: 'Organisation', spalten: ['FG01', 'FG14', 'FG27'] }, { name: 'Lange Namen ä', spalten: ['langername_mit_text'] }];
    const mit = mitVariablensets(SAV, sets);
    expect(leseVariablensets(mit)).toEqual(sets);
    const n = new TextEncoder().encode(variablensetText(sets)).length;
    expect(mit.length).toBe(SAV.length + 16 + n);
    expect(mit.subarray(ende999(mit))).toEqual(SAV.subarray(ende999(SAV)));
    const anders = mitVariablensets(mit, [{ name: 'X', spalten: ['FG01', 'FG14'] }]);
    expect(leseVariablensets(anders)).toEqual([{ name: 'X', spalten: ['FG01', 'FG14'] }]);
    expect(mitVariablensets(anders, [])).toEqual(SAV);
    expect(mitVariablensets(SAV, [])).toBe(SAV);
  });
  it('PSPP liest die Datei ohne Fehler und behält die Sets beim Speichern', async () => {
    const e = await nodeEngine();
    const sets = [{ name: 'Organisation', spalten: ['FG01', 'FG14', 'FG27'] }, { name: 'Langer Name', spalten: ['langername_mit_text', 'FG01'] }];
    const r = e.run("GET FILE='/v.sav'.\nDESCRIPTIVES FG01 langername_mit_text.\nSAVE OUTFILE='/w.sav'.", { '/v.sav': mitVariablensets(SAV, sets) });
    expect(r.filter(i => i.type === 'message' && i.severity !== 'note')).toEqual([]);
    expect(leseVariablensets(e.lies('/w.sav'))).toEqual(sets);
  });
  it('keine .sav: unverändert, nichts gelesen', () => {
    const kaputt = new TextEncoder().encode('kein SPSS'.repeat(30));
    expect(mitVariablensets(kaputt, [{ name: 'a', spalten: ['b'] }])).toBe(kaputt);
    expect(leseVariablensets(kaputt)).toEqual([]);
    expect(leseVariablensets(SAV.subarray(0, 300))).toEqual([]);
  });
});
