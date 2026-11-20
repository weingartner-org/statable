import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { leseSas, SasFehler, istSas7bdat, istXpt, type SasDaten } from './sas';

// Prüfdateien und Sollwerte: pandas (pandas/tests/io/sas/data, BSD-3), Ordner pruefdaten/sas/. Die .csv daneben sind die Sollwerte von pandas
// (Zuordnung wie in pandas test_sas7bdat.py / test_xport.py: test1-15 = test_sas7bdat_1.csv, test16 = test_sas7bdat_2.csv).
const dir = new URL('../../../pruefdaten/sas/', import.meta.url);
const bytes = (n: string) => new Uint8Array(readFileSync(new URL(n, dir)));
const csv = (n: string): string[][] => {
  const t = readFileSync(new URL(n, dir), 'utf8').replace(/^\uFEFF/, '');
  const aus: string[][] = []; let z: string[] = [], f = '', q = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i]!;
    if (q) { if (c === '"') { if (t[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
    else if (c === '"') q = true;
    else if (c === ',') { z.push(f); f = ''; }
    else if (c === '\n') { z.push(f); aus.push(z); z = []; f = ''; }
    else if (c !== '\r') f += c;
  }
  if (f || z.length) { z.push(f); aus.push(z); }
  return aus;
};
/** Tage seit 01.01.1960 → TT.MM.JJJJ (unabhängig vom Leser gerechnet). */
const tageZuDatum = (t: number) => { const d = new Date(Date.UTC(1960, 0, 1) + t * 86400000); return `${String(d.getUTCDate()).padStart(2, '0')}.${String(d.getUTCMonth() + 1).padStart(2, '0')}.${d.getUTCFullYear()}`; };
/** ISO „JJJJ-MM-TT[ hh:mm:ss[.ffff]]“ → „TT.MM.JJJJ[ hh:mm:ss]“ (Sekunden abgeschnitten, so zeigt SAS es). */
const isoZuText = (s: string) => { const m = /^(\d{4})-(\d\d)-(\d\d)(?: (\d\d:\d\d:\d\d))?/.exec(s)!; return `${m[3]}.${m[2]}.${m[1]}${m[4] ? ' ' + m[4] : ''}`; };
const nah = (a: number, b: number) => Math.abs(a - b) <= 1e-5 * Math.max(Math.abs(a), Math.abs(b)) + 1e-8;
const spalte = (d: SasDaten, k: number) => d.zeilen.map(z => z[k] ?? null);

/** Vergleicht eine gelesene Datei mit der Soll-CSV. `datum`: Spaltennummern, die in der CSV Tage seit 1960 sind. */
function gegenSoll(d: SasDaten, sollDatei: string, opt: { datum?: number[]; isoDatum?: number[]; text?: boolean } = {}) {
  const [kopf, ...zeilen] = csv(sollDatei);
  expect(d.spalten.length).toBe(kopf!.length);
  expect(d.zeilen.length).toBe(zeilen.length);
  kopf!.forEach((_, k) => {
    const s = d.spalten[k]!;
    const ist = spalte(d, k);
    zeilen.forEach((z, i) => {
      const w = z[k]!, v = ist[i]!, wo = `${kopf![k]}[${i}]`;
      if (opt.datum?.includes(k)) { expect(s.art, wo).toBe('datum'); expect(v, wo).toBe(w === '' ? null : tageZuDatum(Number(w))); }
      else if (opt.isoDatum?.includes(k)) { expect(s.art, wo).toBe('datum'); expect(v, wo).toBe(w === '' ? null : isoZuText(w)); }
      else if (s.art === 'datum' && s.format === 'TIME8.0') {   // Uhrzeit: pandas liefert Sekunden seit Mitternacht
        expect(v, wo).toBe(w === '' ? null : [Math.floor(Number(w) / 3600), Math.floor(Number(w) / 60) % 60, Math.floor(Number(w)) % 60].map(x => String(x).padStart(2, '0')).join(':'));
      }
      else if (s.art === 'zahl' && !opt.text) { if (w === '') expect(v, wo).toBeNull(); else { expect(typeof v, wo).toBe('number'); expect(nah(v as number, Number(w)), `${wo}: ${v} gegen ${w}`).toBe(true); } }
      else expect(v, wo).toBe(w === '' ? null : w);
    });
  });
}

describe('.sas7bdat gegen die Sollwerte von pandas', () => {
  // test1: unkomprimiert 32 Bit, test2: RLE, test3: RDC, 4-15: weitere Seitenarten, 32/64 Bit, little/big endian
  for (let n = 1; n <= 15; n++) {
    it(`test${n}.sas7bdat = test_sas7bdat_1.csv`, () => {
      const d = leseSas(bytes(`test${n}.sas7bdat`));
      gegenSoll(d, 'test_sas7bdat_1.csv', { datum: [3, 11] });
    });
  }
  it('test16.sas7bdat = test_sas7bdat_2.csv (UTF-8: chinesisch, koreanisch, russisch)', () => {
    gegenSoll(leseSas(bytes('test16.sas7bdat')), 'test_sas7bdat_2.csv', { datum: [3, 11] });
  });
  it('airline (Zahlen mit weniger als 8 Byte)', () => gegenSoll(leseSas(bytes('airline.sas7bdat')), 'airline.csv'));
  it('test_12659', () => gegenSoll(leseSas(bytes('test_12659.sas7bdat')), 'test_12659.csv'));
  it('productsales (Datum MONTH)', () => gegenSoll(leseSas(bytes('productsales.sas7bdat')), 'productsales.csv', { isoDatum: [9] }));
  it('many_columns (Spaltentexte an mehreren Stellen)', () => gegenSoll(leseSas(bytes('many_columns.sas7bdat')), 'many_columns.csv'));
  it('0x40controlbyte (RLE mit Steuerbyte 0x40; alles Text)', () => {
    const d = leseSas(bytes('0x40controlbyte.sas7bdat'));
    expect(d.spalten.every(s => s.art === 'text')).toBe(true);
    gegenSoll(d, '0x40controlbyte.csv');
  });
  it('datetime: Datum, Datum mit Uhrzeit, Taiwan-Datum; Zeitpunkte auf die Sekunde, höchstens 1 s Abweichung bei Bruchteilen', () => {
    const d = leseSas(bytes('datetime.sas7bdat'));
    const [, ...soll] = csv('datetime.csv');
    expect(d.zeilen.length).toBe(soll.length);
    expect(d.spalten.map(s => s.art)).toEqual(['datum', 'datum', 'datum', 'datum', 'datum']);
    const sek = (t: string) => { const m = /^(\d\d)\.(\d\d)\.(\d{4})(?: (\d\d):(\d\d):(\d\d))?$/.exec(t)!; return Date.UTC(+m[3]!, +m[2]! - 1, +m[1]!, +(m[4] ?? 0), +(m[5] ?? 0), +(m[6] ?? 0)) / 1000; };
    soll.forEach((z, i) => z.forEach((w, k) => {
      const v = d.zeilen[i]![k] as string;
      const s = Date.UTC(+w.slice(0, 4), +w.slice(5, 7) - 1, +w.slice(8, 10), +(w.slice(11, 13) || 0), +(w.slice(14, 16) || 0), +(w.slice(17, 19) || 0)) / 1000;
      expect(Math.abs(sek(v) - s), `Spalte ${k} Zeile ${i}: ${v} gegen ${w}`).toBeLessThanOrEqual(1);
    }));
  });
  it('max_sas_date: 31.12.9999 und der Schalttag-Sprung ab Jahr 4000', () => {
    const d = leseSas(bytes('max_sas_date.sas7bdat'));
    expect(d.zeilen.map(z => z[0])).toEqual(['max', 'normal']);
    expect(d.zeilen[0]![2]).toBe('31.12.9999 23:59:59');
    expect(d.zeilen[1]![2]).toBe('01.08.2019 23:59:59');
    expect(d.zeilen[0]![4]).toBe('31.12.9999');
    expect(d.zeilen[1]![4]).toBe('01.08.2019');
    expect(d.zeilen[0]![3]).toBe(2936547);   // Zahlenspalte ohne Datumsformat bleibt Zahl
  });
  it('dates_null: fehlendes Datum ist fehlend', () => {
    const d = leseSas(bytes('dates_null.sas7bdat'));
    expect(d.zeilen).toEqual([['31.12.9999', '31.12.9999 23:59:59'], [null, null]]);
  });
  it('cars: Zahlen mit 4 Byte bleiben ganz', () => {
    const d = leseSas(bytes('cars.sas7bdat'));
    d.spalten.forEach((s, k) => { if (s.name === 'CYL' || s.name === 'WGT') spalte(d, k).forEach(v => { if (v !== null) expect(Number.isInteger(v)).toBe(true); }); });
  });
  it('load_log: 9 von 2097 Zeilen sind gelöscht', () => expect(leseSas(bytes('load_log.sas7bdat')).zeilen.length).toBe(2088));
  it('test_meta2_page: 1000 Zeilen', () => expect(leseSas(bytes('test_meta2_page.sas7bdat')).zeilen.length).toBe(1000));
  it('zero_rows: Spalten da, keine Zeilen', () => {
    const d = leseSas(bytes('zero_rows.sas7bdat'));
    expect(d.zeilen.length).toBe(0);
    expect(d.spalten.map(s => s.name)).toEqual(['char_field', 'num_field']);
  });
  it('zero_variables: kein Absturz, keine Spalten', () => {
    const d = leseSas(bytes('zero_variables.sas7bdat'));
    expect(d.spalten.length).toBe(0);
  });
  it('corrupt.sas7bdat: sauberer Fehler', () => {
    expect(() => leseSas(bytes('corrupt.sas7bdat'))).toThrow(SasFehler);
  });
  it('zufällig beschädigte Dateien: nur SasFehler, nie ein anderer Fehler', () => {
    const o = bytes('test2.sas7bdat');
    let s = 12345;
    const zufall = () => (s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
    for (let r = 0; r < 60; r++) {
      const b = o.slice();
      for (let k = 0; k < 6; k++) b[Math.floor(zufall() * b.length)] = Math.floor(zufall() * 256);
      try { leseSas(b); } catch (f) { expect(f).toBeInstanceOf(SasFehler); }
    }
    expect(() => leseSas(o.slice(0, 100000))).toThrow(SasFehler);
    expect(() => leseSas(new Uint8Array(0))).toThrow(SasFehler);
  });
  it('Erkennung am Inhalt', () => {
    expect(istSas7bdat(bytes('test1.sas7bdat'))).toBe(true);
    expect(istXpt(bytes('test1.sas7bdat'))).toBe(false);
    expect(istXpt(bytes('SSHSV1_A.xpt'))).toBe(true);
    expect(istXpt(bytes('DEMO_PUF.cpt'))).toBe(false);
  });
  const bz = (n: string) => new Uint8Array(execFileSync('bzip2', ['-dc', fileURLToPath(new URL(n, dir))], { maxBuffer: 1 << 28 }));
  const hatBzip = existsSync('/usr/bin/bzip2');
  (hatBzip ? it : it.skip)('amd_page: Spaltenname von der AMD-Seite = neu gespeicherte Datei', () => {
    const a = leseSas(bz('amd_page.sas7bdat.bz2')), b = leseSas(bz('amd_page_resaved.sas7bdat.bz2'));
    expect(a.spalten[11]!.bezeichnung || a.spalten[11]!.name).toBe('TotalNoise');
    expect(a.spalten.map(s => s.name)).toEqual(b.spalten.map(s => s.name));
    expect(a.zeilen).toEqual(b.zeilen);
  });
  (hatBzip ? it : it.skip)('0x00controlbyte: Kopf nennt 1,96 Milliarden Zeilen und 0 Spalten - sauberer Fehler statt Speicherüberlauf', () => {
    expect(() => leseSas(bz('0x00controlbyte.sas7bdat.bz2'))).toThrow(SasFehler);
  });
});

describe('.xpt (Transport v5) gegen die Sollwerte von pandas', () => {
  it('SSHSV1_A.xpt', () => gegenSoll(leseSas(bytes('SSHSV1_A.xpt')), 'SSHSV1_A.csv'));
  it('paxraw_d_short.xpt (gekürzte Zahlen mit 5 Byte)', () => gegenSoll(leseSas(bytes('paxraw_d_short.xpt')), 'paxraw_d_short.csv'));
  it('CPORT-Datei (.cpt) ist unlesbar, nicht falsch gelesen', () => expect(() => leseSas(bytes('DEMO_PUF.cpt'))).toThrow(SasFehler));
});

describe('Spalten', () => {
  it('Namen sind PSPP-tauglich, Beschriftung und Format kommen mit', () => {
    const d = leseSas(bytes('productsales.sas7bdat'));
    expect(d.spalten.map(s => s.name)).toEqual(['ACTUAL', 'PREDICT', 'COUNTRY', 'REGION', 'DIVISION', 'PRODTYPE', 'PRODUCT', 'QUARTER', 'YEAR', 'MONTH']);
    expect(d.spalten[9]!.art).toBe('datum');
    expect(d.spalten[9]!.format).toBe('EDATE10');
    expect(d.spalten[2]!.art).toBe('text');
    expect(d.spalten[0]!.art).toBe('zahl');
  });
});
