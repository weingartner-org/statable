/** Datum als Text in CSV (Fragebogen-Tools) und CSV-Export der Daten. */
import { describe, expect, it } from 'vitest';
import { leseCsv, planeSpalten, textAlsDatum, zurEngine } from './einlesen';
import { datenAlsCsv } from './export';
import { s } from './sitzung.svelte';
import { baueSpalte } from './eingabe';

describe('Datum als Text', () => {
  it('erkennt JJJJ-MM-TT, mit Uhrzeit und TT.MM.JJJJ - und lehnt Unmögliches ab', () => {
    expect(textAlsDatum('2026-01-31')?.getDate()).toBe(31);
    expect(textAlsDatum('2026-01-31 14:05:09')?.getMonth()).toBe(0);
    expect(textAlsDatum('31.1.2026')?.getFullYear()).toBe(2026);
    expect(textAlsDatum('2026-02-30')).toBeNull();
    expect(textAlsDatum('2008')).toBeNull();
    expect(textAlsDatum('abc')).toBeNull();
  });
  it('eine CSV-Spalte mit Daten wird eine Datumsspalte; die Engine bekommt TT.MM.JJJJ', () => {
    const t = leseCsv('id,datum\n1,2026-01-05\n2,2026-02-17\n3,\n');
    expect(planeSpalten(t).map(p => p.art)).toEqual(['zahl', 'datum']);
    const e = zurEngine(t);
    expect(new TextDecoder().decode(e.csv)).toBe('id,datum\n1,05.01.2026\n2,17.02.2026\n3,\n');
    expect(e.syntax).toContain('datum EDATE10');
  });
  it('gemischte Spalte bleibt Text', () => {
    expect(planeSpalten(leseCsv('x\n2026-01-05\nirgendwann\n')).map(p => p.art)).toEqual(['text']);
  });
});

describe('Daten als CSV (Dezimalpunkt)', () => {
  const sp = (name: string, art: 'zahl' | 'text' | 'datum', werte: Record<string, string> = {}) => ({ ...baueSpalte({ bezeichnung: name, art }, []), name, werteLabels: werte });
  s.projekt = { name: 'T' } as never;
  s.spalten = [sp('geschl', 'zahl', { '1': 'weiblich', '2': 'männlich' }), sp('name', 'text'), sp('tag', 'datum'), sp('x', 'zahl')];
  s.zeilen = [[1, 'Anna, "die" Erste', '05.01.2026', 2.5], [2, null, null, null]];
  s.einst.zahl = 'punkt';
  it('mit Codes: Zahlen bleiben, Datum JJJJ-MM-TT, Komma und Anführungszeichen geschützt', () => {
    expect(datenAlsCsv(false)).toBe('geschl,name,tag,x\r\n1,"Anna, ""die"" Erste",2026-01-05,2.5\r\n2,,,\r\n');
  });
  it('mit Beschriftungen: Codes werden zu Wörtern', () => {
    expect(datenAlsCsv(true).split('\r\n')[1]).toBe('weiblich,"Anna, ""die"" Erste",2026-01-05,2.5');
    expect(datenAlsCsv(true).split('\r\n')[2]).toBe('männlich,,,');
  });
});

describe('Sicherheit: CSV-Export neutralisiert Formeln (Excel)', () => {
  const sp = (name: string, art: 'zahl' | 'text' | 'datum', labels: Record<string, string> = {}) => ({ ...baueSpalte({ bezeichnung: name, art }, []), name, werteLabels: labels });
  it('Text, Beschriftungen und Namen, die mit = + - @ Tab oder CR beginnen, bekommen ein Apostroph; Zahlen (auch negative) bleiben', () => {
    s.projekt = { name: 'T' } as never;
    s.einst.zahl = 'punkt';
    s.spalten = [sp('@kopf', 'text'), sp('x', 'zahl'), sp('g', 'zahl', { '1': '=HYPERLINK("http://x","a")', '2': '-2+3' })];
    s.zeilen = [['=1+1', -3.5, 1], ['+cmd|x', 2, 2], ['\t=x', 0, 3], ['normal', 1, 1], ['a=b', 1, 1]];
    const t = datenAlsCsv(true).split('\r\n');
    expect(t[0]).toBe("'@kopf,x,g");
    expect(t[1]).toBe(`'=1+1,-3.5,"'=HYPERLINK(""http://x"",""a"")"`);
    expect(t[2]).toBe("'+cmd|x,2,'-2+3");
    expect(t[3]).toBe("'\t=x,0,3");
    expect(t[4]).toBe('normal,1,"\'=HYPERLINK(""http://x"",""a"")"');
    expect(t[5]).toBe('a=b,1,"\'=HYPERLINK(""http://x"",""a"")"');
  });
});

describe('Abschlusstest D13: CSV-Export passt zum Dezimalzeichen', () => {
  const sp = (name: string, art: 'zahl' | 'text' | 'datum') => ({ ...baueSpalte({ bezeichnung: name, art }, []), name });
  const vorbereiten = (zahl: 'komma' | 'punkt') => {
    s.projekt = { name: 'T' } as never;
    s.spalten = [sp('x', 'zahl'), sp('name', 'text')];
    s.zeilen = [[2.5, 'Anna; "die" Erste'], [null, 'Ben']];
    s.einst.zahl = zahl;
  };
  it('Dezimalkomma: Semikolon als Trenner und Komma in den Zahlen (deutsches Excel)', () => {
    vorbereiten('komma');
    expect(datenAlsCsv(false)).toBe('x;name\r\n2,5;"Anna; ""die"" Erste"\r\n;Ben\r\n');
  });
  it('Dezimalpunkt: Komma als Trenner und Punkt', () => {
    vorbereiten('punkt');
    expect(datenAlsCsv(false)).toBe('x,name\r\n2.5,"Anna; ""die"" Erste"\r\n,Ben\r\n');
  });
  it('ohne Wahl gilt das Sprachprofil (Deutsch: Komma)', () => {
    vorbereiten('komma'); s.einst.zahl = 'sprache' as never;
    expect(datenAlsCsv(false).split('\r\n')[0]).toBe('x;name');
  });
});
