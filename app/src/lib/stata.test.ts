import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { leseStata, StataFehler, istStata } from './stata';

// Festes Netz: die Dateien in testdaten/ hat scripts/stata-testdaten.R mit R erzeugt (haven 13/14/15, foreign 10/12);
// stata-erwartet.json sind die Werte aus haven::read_dta derselben Dateien (".a" = erweitertes Fehlendes).
const dir = new URL('./testdaten/', import.meta.url);
const datei = (n: string) => new Uint8Array(readFileSync(new URL(n, dir)));
interface Erw { name: string; label: string | null; werte: (number | string | null)[]; labels?: Record<string, string> | null }
const erwartet: Record<string, Erw[]> = JSON.parse(readFileSync(new URL('stata-erwartet.json', dir), 'utf8'));

/** Werte der Datei so schreiben, wie haven sie liefert (erweiterte Fehlende als ".a"). */
function wieHaven(f: string) {
  const d = leseStata(datei(f));
  return d.spalten.map((s, k) => ({ s, werte: d.zeilen.map(z => z[k] ?? null) }));
}

describe.each(['stata-v13.dta', 'stata-v14.dta', 'stata-v15.dta', 'stata-v10.dta', 'stata-v12.dta'])('%s gegen haven::read_dta', f => {
  const e = erwartet[f]!;
  const ist = wieHaven(f);
  it('gleiche Spalten, Namen und Bezeichnungen', () => {
    expect(ist.map(x => x.s.name)).toEqual(e.map(x => x.name));
    e.forEach((x, k) => { if (x.label) expect(ist[k]!.s.bezeichnung).toBe(x.label); });
  });
  it('gleiche Werte (Fehlende als fehlend, .a/.b als benutzerdefiniert fehlend)', () => {
    e.forEach((x, k) => {
      const s = ist[k]!.s;
      x.werte.forEach((w, i) => {
        const v = ist[k]!.werte[i];
        if (w === null) expect(v, `${x.name}[${i}]`).toBeNull();
        else if (typeof w === 'string' && /^\.[a-z]$/.test(w)) {
          // erweitertes Fehlendes → Sondercode, der als „fehlend" festgelegt ist und die Beschriftung des Codes trägt
          expect(typeof v).toBe('number'); expect(s.fehlend).toContain(v);
          expect(s.werteLabels[String(v)]).toBe(x.labels?.[w] ?? w);
        } else if (x.name === 'datum' && s.art === 'datum') {
          const [t, m, j] = (v as string).split('.'); expect(`${j}-${m}-${t}`).toBe(w);
        } else if (typeof w === 'number') expect(v as number).toBeCloseTo(w, 6);
        else expect(v, `${x.name}[${i}]`).toBe(w === '' ? null : w);
      });
    });
  });
  it('Wertelabels wie haven', () => {
    e.forEach((x, k) => {
      for (const [w, l] of Object.entries(x.labels ?? {})) if (!w.startsWith('.')) expect(ist[k]!.s.werteLabels[String(Number(w))], `${x.name} ${w}`).toBe(l);
    });
  });
});

describe('Einzelheiten', () => {
  it('Stata 13 (117) und 14/15 (118) lesen Umlaute richtig, auch in Latin-1 (117)', () => {
    for (const f of ['stata-v13.dta', 'stata-v14.dta', 'stata-v15.dta']) {
      const d = leseStata(datei(f));
      const name = d.spalten.findIndex(s => s.name === 'name');
      expect(d.zeilen.map(z => z[name]).slice(0, 6)).toEqual(['Jörg', 'Zoë', 'Müller', 'Åsa', 'Straße', 'Ünal']);
    }
  });
  it('strL (über 2045 Zeichen) wird vollständig gelesen', () => {
    const d = leseStata(datei('stata-v14.dta'));
    const k = d.spalten.findIndex(s => s.name === 'bemerkung');
    expect((d.zeilen[0]![k] as string).length).toBe(3400);
    expect(d.zeilen[1]![k]).toBe('kurz');
    expect(d.zeilen[11]![k]).toBeNull();
  });
  it('Messniveau: Wertelabels → nominal, lückenlose Reihe ab vier Stufen → ordinal, sonst metrisch', () => {
    const d = leseStata(datei('stata-v14.dta'));
    const n = (x: string) => d.spalten.find(s => s.name === x)!.niveau;
    expect([n('geschlecht'), n('zufrieden'), n('alter'), n('name')]).toEqual(['nominal', 'ordinal', 'metrisch', 'nominal']);
  });
  it('Datum wird zu TT.MM.JJJJ mit Datumsformat', () => {
    const d = leseStata(datei('stata-v13.dta'));
    const k = d.spalten.findIndex(s => s.name === 'datum');
    expect(d.spalten[k]!.art).toBe('datum');
    expect(d.zeilen[0]![k]).toBe('15.01.2026');
    expect(d.zeilen[4]![k]).toBeNull();
  });
  it('ein Wert und eine Beschriftung pro Spalte stimmen (Zufriedenheit)', () => {
    const d = leseStata(datei('stata-v13.dta'));
    const s = d.spalten.find(x => x.name === 'zufrieden')!;
    expect(s.werteLabels['5']).toBe('sehr zufrieden');
    expect(s.fehlend.length).toBe(2);
    expect(Object.values(s.werteLabels)).toContain('weiß nicht');
  });
  it('erkennt Stata an den Bytes, nicht an der Endung', () => {
    expect(istStata(datei('stata-v13.dta'))).toBe(true);
    expect(istStata(datei('stata-v10.dta'))).toBe(true);
    expect(istStata(new TextEncoder().encode('a,b\n1,2\n'))).toBe(false);
  });
});

describe('Fehler', () => {
  it('neuere Fassung (Format 122) → „version"', () => {
    const b = new TextEncoder().encode('<stata_dta><header><release>122</release><byteorder>LSF</byteorder>');
    expect(() => leseStata(b)).toThrowError(StataFehler);
    try { leseStata(b); } catch (e) { expect((e as StataFehler).grund).toBe('version'); expect((e as StataFehler).version).toBe(122); }
  });
  it('sehr alte Fassung (Format 113) → „version"', () => {
    const b = new Uint8Array(200); b[0] = 113; b[1] = 2; b[2] = 1;
    try { leseStata(b); expect.unreachable(); } catch (e) { expect((e as StataFehler).grund).toBe('version'); }
  });
  it('abgeschnittene Datei → „kaputt", kein Absturz', () => {
    const b = datei('stata-v14.dta');
    for (const n of [5, 40, 300, 2000, b.length - 100]) {
      try { leseStata(b.slice(0, n)); } catch (e) { expect(e).toBeInstanceOf(StataFehler); expect((e as StataFehler).grund).toBe('kaputt'); }
    }
    const a = datei('stata-v10.dta');
    expect(() => leseStata(a.slice(0, 500))).toThrowError(StataFehler);
  });
});

/* ---------- selbst gebaute Dateien: Byte-Reihenfolge, Typen, erweiterte Fehlende, Datum, Latin-1 ---------- */
class Schreiber {
  teile: number[] = [];
  constructor(public le: boolean) {}
  rohbytes(b: ArrayLike<number>) { for (let i = 0; i < b.length; i++) this.teile.push(b[i]!); return this; }
  zahl(n: number, bytes: 1 | 2 | 4 | 8, art: 'int' | 'float' = 'int') {
    const v = new DataView(new ArrayBuffer(8));
    if (art === 'float') { if (bytes === 4) v.setFloat32(0, n, this.le); else v.setFloat64(0, n, this.le); }
    else if (bytes === 1) v.setInt8(0, n); else if (bytes === 2) v.setUint16(0, n & 0xffff, this.le); else if (bytes === 4) v.setUint32(0, n >>> 0, this.le); else v.setBigUint64(0, BigInt(n), this.le);
    return this.rohbytes(new Uint8Array(v.buffer, 0, bytes));
  }
  text(t: string, feld: number, latin1 = true) {
    const b = latin1 ? Uint8Array.from([...t].map(c => c.charCodeAt(0))) : new TextEncoder().encode(t);
    const o = new Uint8Array(feld); o.set(b); return this.rohbytes(o);
  }
  ascii(t: string) { return this.rohbytes([...t].map(c => c.charCodeAt(0))); }
  get bytes() { return Uint8Array.from(this.teile); }
}
const D1023 = 2 ** 1023, F127 = 2 ** 127;
const labelTabelle = (w: Schreiber, nameLen: number, name: string, paare: [number, string][], txtCode: boolean) => {
  const txt = new Schreiber(w.le);
  const offs: number[] = []; let o = 0;
  for (const [, t] of paare) { offs.push(o); txt.text(t, t.length + 1, txtCode); o += t.length + 1; }
  const innen = new Schreiber(w.le);
  innen.zahl(paare.length, 4).zahl(txt.teile.length, 4);
  offs.forEach(x => innen.zahl(x, 4)); paare.forEach(([v]) => innen.zahl(v, 4)); innen.rohbytes(txt.teile);
  w.zahl(innen.teile.length, 4).text(name, nameLen).rohbytes([0, 0, 0]).rohbytes(innen.teile);
};

function alteDatei(le: boolean) {
  const w = new Schreiber(le);
  w.rohbytes([114, le ? 2 : 1, 1, 0]).zahl(6, 2).zahl(3, 4).text('', 81).text('', 18);
  w.rohbytes([251, 252, 253, 254, 255, 5]);                       // byte int long float double str5
  ['b', 'i', 'l', 'f', 'd', 's'].forEach(n => w.text(n, 33));
  w.rohbytes(new Uint8Array(14));                                   // Sortierliste (K+1)*2
  ['%8.0g', '%8.0g', '%12.0g', '%9.0g', '%td', '%9s'].forEach(f => w.text(f, 49));
  ['wl', '', '', '', '', ''].forEach(n => w.text(n, 33));
  ['Stufe', 'kleine Zahl', '', '', 'Tag der Messung', 'Café'].forEach(n => w.text(n, 81));
  w.rohbytes([0, 0, 0, 0, 0]);                                      // keine Merkmale
  const zeilen: [number, number, number, number, number, string][] = [
    [5, 300, 100000, 1.5, 0, 'Caf\xe9'],
    [101, 32741, 2147483621, F127, 22000, ''],
    [102, 32742, 2147483623, F127 * (1 + 2 / 4096), D1023 * (1 + 3 / 4096), 'abc']];
  for (const z of zeilen) { w.zahl(z[0], 1).zahl(z[1], 2).zahl(z[2], 4).zahl(z[3], 4, 'float').zahl(z[4], 8, 'float').text(z[5], 5); }
  labelTabelle(w, 33, 'wl', [[5, 'fünf'], [2147483622, 'weiß nicht']], true);
  return w.bytes;
}

describe('selbst gebaute Dateien (114, beide Byte-Reihenfolgen)', () => {
  for (const le of [true, false]) {
    it(le ? 'little endian' : 'big endian', () => {
      const d = leseStata(alteDatei(le));
      expect(d.version).toBe(114);
      expect(d.spalten.map(s => s.name)).toEqual(['b', 'i', 'l', 'f', 'd', 's']);
      expect(d.spalten[0]!.bezeichnung).toBe('Stufe');
      expect(d.spalten[5]!.bezeichnung).toBe('Café');
      // Latin-1 (0xE9) wird zu é
      expect(d.zeilen.map(z => z[5])).toEqual(['Café', null, 'abc']);
      expect(d.zeilen[0]!.slice(0, 4)).toEqual([5, 300, 100000, 1.5]);
      // ".": fehlt einfach; ".a", ".c", ".b": benutzerdefiniert fehlend mit Beschriftung
      expect(d.zeilen[1]!.slice(0, 4)).toEqual([null, null, null, null]);
      const sp = d.spalten;
      expect(sp[0]!.fehlend.length).toBe(1);
      expect(d.zeilen[2]![0]).toBe(sp[0]!.fehlend[0]);
      expect(sp[0]!.werteLabels[String(sp[0]!.fehlend[0])]).toBe('weiß nicht'); // Beschriftung der Tabelle für ".a"
      expect(sp[0]!.werteLabels['5']).toBe('fünf');
      expect(sp[1]!.fehlend.length).toBe(1); expect(sp[2]!.fehlend.length).toBe(1); expect(sp[3]!.fehlend.length).toBe(1);
      expect(sp[2]!.werteLabels[String(sp[2]!.fehlend[0])]).toBe('.b');
      expect(sp[3]!.werteLabels[String(sp[3]!.fehlend[0])]).toBe('.b');
      // double %td: 0 = 01.01.1960, 22000 = 26.03.2020
      expect(sp[4]!.art).toBe('datum');
      expect(d.zeilen.map(z => z[4])).toEqual(['01.01.1960', '26.03.2020', null]);
    });
  }
});

/** Stata 18/19 (Format 120, 121): Aufbau nach Doku dta_121 - wie 118/119, plus Typ 65525 (Alias, ohne Bytes in der Datenzeile). */
function neueDatei(version: 120 | 121, le: boolean, alias = true) {
  const w = new Schreiber(le);
  const K = alias ? 3 : 2, N = 2;
  const k4 = version === 121;
  w.ascii(`<stata_dta><header><release>${version}</release><byteorder>${le ? 'LSF' : 'MSF'}</byteorder><K>`).zahl(K, k4 ? 4 : 2).ascii('</K><N>').zahl(N, 8).ascii('</N><label>').zahl(0, 2)
    .ascii('</label><timestamp>').zahl(0, 1).ascii('</timestamp></header><map>');
  const karteStart = w.teile.length; w.rohbytes(new Uint8Array(14 * 8)); w.ascii('</map>');
  const karte: number[] = new Array(14).fill(0);
  const abschnitt = (i: number, tag: string, inhalt: (s: Schreiber) => void) => { karte[i] = w.teile.length; w.ascii(`<${tag}>`); inhalt(w); w.ascii(`</${tag}>`); };
  karte[0] = 0; karte[1] = karteStart - 5;
  abschnitt(2, 'variable_types', s => { s.zahl(65526, 2).zahl(alias ? 65525 : 5, 2); if (alias) s.zahl(5, 2); });
  const namen = alias ? ['x', 'verweis', 'ort'] : ['x', 'ort'];
  abschnitt(3, 'varnames', s => namen.forEach(n => s.text(n, 129, false)));
  abschnitt(4, 'sortlist', s => s.rohbytes(new Uint8Array((K + 1) * 2)));
  abschnitt(5, 'formats', s => namen.forEach(() => s.text('%9.0g', 57)));
  abschnitt(6, 'value_label_names', s => namen.forEach(() => s.text('', 129)));
  abschnitt(7, 'variable_labels', s => namen.forEach(n => s.text(n === 'ort' ? 'Wohnort (Größe)' : '', 321, false)));
  abschnitt(8, 'characteristics', () => {});
  abschnitt(9, 'data', s => { for (const [x, o] of [[1.5, 'Wien'], [D1023, 'Köln']] as const) { s.zahl(x, 8, 'float'); if (alias) { /* 0 Bytes */ } s.text(o, 5, false); } });
  abschnitt(10, 'strls', s => s.ascii(''));
  abschnitt(11, 'value_labels', () => {});
  karte[12] = w.teile.length; w.ascii('<stata_data_close>'); w.ascii('</stata_data_close>'); // Schluss
  w.ascii('</stata_dta>'); karte[13] = w.teile.length;
  const b = w.bytes; const dv = new DataView(b.buffer);
  karte.forEach((o, i) => dv.setBigUint64(karteStart + i * 8, BigInt(o), le));
  return b;
}

describe('Stata 18/19 (Format 120/121) nach Spezifikation gebaut', () => {
  for (const [v, le] of [[120, true], [121, true], [120, false]] as const) {
    it(`Format ${v}, ${le ? 'little' : 'big'} endian: Alias-Variable ausgelassen, mit Hinweis`, () => {
      const d = leseStata(neueDatei(v, le));
      expect(d.version).toBe(v);
      expect(d.spalten.map(s => s.name)).toEqual(['x', 'ort']);
      expect(d.spalten[1]!.bezeichnung).toBe('Wohnort (Größe)');
      expect(d.zeilen).toEqual([[1.5, 'Wien'], [null, 'Köln']]);
      expect(d.hinweise.join(' ')).toContain('verweis');
    });
  }
  it('Alias-Typ mit falscher Zeilenbreite wird als beschädigt erkannt, nicht als Zahlensalat', () => {
    const b = neueDatei(120, true);
    const i = String.fromCharCode(...b).indexOf('<data>') + 6;
    expect(() => leseStata(b.slice(0, i + 5))).toThrowError(StataFehler);
  });
});
