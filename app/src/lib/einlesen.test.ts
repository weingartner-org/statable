import { describe, expect, it } from 'vitest';
import { beforeAll } from 'vitest';
import { alsZahl, dekodiere, istBinaer, leseCsv, leseDatei, leseTabellenkalkulation, liesFallzahl, planeSpalten, zurEngine } from './einlesen';
import { nodeEngine } from './testengine';
import * as XLSX from 'xlsx';

describe('Zahlen mit Punkt einlesen (Prüfrunde 07.10.)', () => {
  // mtcars: „2.875“ wurde als Tausender gelesen (2875), „2.62“ als 2,62 - die Spalte war unbrauchbar, r = −,06 statt −,87.
  it('eine Spalte mit Dezimalpunkt bleibt Dezimalpunkt, auch bei drei Nachkommastellen', () => {
    const t = leseCsv('mpg,wt\n21,2.62\n21,2.875\n22.8,2.32\n');
    expect(new TextDecoder().decode(zurEngine(t).csv)).toBe('mpg,wt\n21,2.62\n21,2.875\n22.8,2.32\n');
  });
  it('deutsche Tausender bleiben Tausender, wenn die Spalte Komma-Dezimalen hat', () => {
    const t = leseCsv('a;b\n1.234,5;1\n2,5;2\n');
    expect(new TextDecoder().decode(zurEngine(t).csv)).toBe('a,b\n1234.5,1\n2.5,2\n');
  });
  it('nur „1.234“ in der Spalte: Tausender wie bisher (deutsche Datei)', () => {
    expect(new TextDecoder().decode(zurEngine(leseCsv('a;b\n1.234;1\n12.500;2\n')).csv)).toBe('a,b\n1234,1\n12500,2\n');
    expect(planeSpalten(leseCsv('a;b\n1.234;1\n')).map(p => p.art)).toEqual(['zahl', 'zahl']);
  });
});

const text = (b: Uint8Array) => new TextDecoder().decode(b);
let motor: Awaited<ReturnType<typeof nodeEngine>>;
beforeAll(async () => { motor = await nodeEngine(); });
/** Liest die Tabelle mit der echten Engine und gibt die Fallzahl zurück. */
const fallzahl = (t: ReturnType<typeof leseCsv>) => {
  motor.run('NEW FILE.');
  const { syntax, csv } = zurEngine(t);
  return liesFallzahl(motor.run(syntax + '\nSHOW N.', { '/import.csv': csv }));
};

describe('Abschlusstest D1/D5: Zeilenumbruch in einer Zelle', () => {
  it('D1: Zelle mit Umbruch bleibt EIN Fall (echte Engine)', () => {
    const t = leseCsv('id;kommentar;punkte\r\n1;"er sagte:\r\nsehr gut";5\r\n2;ok;6\r\n3;"a\nb\nc";7\r\n');
    expect(t.zeilen.length).toBe(3);
    expect(fallzahl(t)).toBe(3);
    expect(text(zurEngine(t).csv)).toContain('er sagte: sehr gut');
  });
  it('D1: Umbruch in Excel-Zelle (Alt+Enter) ebenso', async () => {
    const blatt = XLSX.utils.aoa_to_sheet([['id', 'kommentar'], [1, 'zwei\nZeilen'], [2, 'eine']]);
    const mappe = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(mappe, blatt, 'Daten');
    const t = await leseTabellenkalkulation(XLSX.write(mappe, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer, 'x.xlsx');
    expect(fallzahl(t)).toBe(2);
  });
  it('D1: Sicherung - die Fallzahl der Engine weicht ab, wenn ein Umbruch durchrutscht', () => {
    motor.run('NEW FILE.');
    const csv = new TextEncoder().encode('a,b\n1,"x\ny"\n2,z\n');
    const n = liesFallzahl(motor.run("GET DATA /TYPE=TXT /FILE='/k.csv' /ENCODING='UTF-8' /ARRANGEMENT=DELIMITED /DELCASE=LINE /FIRSTCASE=2 /DELIMITERS=',' /QUALIFIER='\"' /VARIABLES=a F8.0 b A5.\nEXECUTE.\nSHOW N.", { '/k.csv': csv }));
    expect(n).toBe(3);   // 2 Zeilen in der Tabelle, 3 Fälle in der Engine: oeffneTabelle meldet das als Fehler
  });
  it('D5: Überschrift mit Umbruch - Syntax bleibt gültig (Engine)', () => {
    const t = leseCsv('id;"Frage 1\n(Skala 1-5)"\n1;3\n2;4\n');
    expect(t.kopf[1]).toBe('Frage 1 (Skala 1-5)');
    motor.run('NEW FILE.');
    const { syntax, csv } = zurEngine(t);
    const r = motor.run(syntax, { '/import.csv': csv });
    expect(r.some(i => i.type === 'message' && i.severity === 'error')).toBe(false);
  });
  it('D5: Excel-Überschrift mit Umbruch', async () => {
    const blatt = XLSX.utils.aoa_to_sheet([['id', 'Frage 1\n(Skala)'], [1, 3]]);
    const mappe = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(mappe, blatt, 'Daten');
    const t = await leseTabellenkalkulation(XLSX.write(mappe, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer, 'x.xlsx');
    expect(t.kopf[1]).toBe('Frage 1 (Skala)');
  });
});

describe('Abschlusstest D6/D7/D8/D17: Dateiformen', () => {
  it('D6: UTF-16 LE und BE mit BOM', () => {
    const le = new Uint8Array([0xff, 0xfe, ...[...'a;b\nÄ;1\n'].flatMap(c => [c.charCodeAt(0) & 255, c.charCodeAt(0) >> 8])]);
    const be = new Uint8Array([0xfe, 0xff, ...[...'a;b\nÄ;1\n'].flatMap(c => [c.charCodeAt(0) >> 8, c.charCodeAt(0) & 255])]);
    expect(dekodiere(le)).toBe('a;b\nÄ;1\n');
    expect(dekodiere(be)).toBe('a;b\nÄ;1\n');
  });
  it('D6: UTF-16-Datei lässt sich als Tabelle öffnen', async () => {
    const roh = 'x\ty\n1\t2\n';
    const b = new Uint8Array([0xff, 0xfe, ...[...roh].flatMap(c => [c.charCodeAt(0), 0])]);
    const e = await leseDatei(new File([b], 'u.csv'));
    expect(e.art === 'tabelle' && e.tabelle.kopf).toEqual(['x', 'y']);
  });
  it('D6 Rest: UTF-16 ohne BOM (LE und BE) wird erkannt und gelesen, Binärdateien bleiben abgewiesen', async () => {
    const roh = 'gruppe;wert;name\nA;60,3;Jörg\nB;50,1;Ärger\n';
    const le = new Uint8Array([...roh].flatMap(c => [c.charCodeAt(0) & 255, c.charCodeAt(0) >> 8]));
    const be = new Uint8Array([...roh].flatMap(c => [c.charCodeAt(0) >> 8, c.charCodeAt(0) & 255]));
    expect(dekodiere(le)).toBe(roh); expect(dekodiere(be)).toBe(roh);
    expect(istBinaer(le)).toBe(false); expect(istBinaer(be)).toBe(false);
    for (const [b, n] of [[le, 'le.csv'], [be, 'be.csv']] as const) {
      const e = await leseDatei(new File([b], n));
      expect(e.art === 'tabelle' && e.tabelle.kopf).toEqual(['gruppe', 'wert', 'name']);
      expect(e.art === 'tabelle' && e.tabelle.zeilen[1]).toEqual(['B', '50,1', 'Ärger']);
    }
    // eine Nullbyte-Folge, die kein Text ist (Binärdatei mit Nullen an beiden Stellen), und UTF-8 mit einzelnem Nullbyte bleiben „unlesbar“
    const bin = new Uint8Array(400).map((_, i) => (i % 3 === 0 ? 0 : (i * 7) % 251));
    expect(istBinaer(bin)).toBe(true);
    await expect(leseDatei(new File([bin], 'x.csv'))).rejects.toMatchObject({ grund: 'unlesbar' });
    await expect(leseDatei(new File([new TextEncoder().encode('a;b\n1;2\u0000\n3;4\n')], 'n.csv'))).rejects.toMatchObject({ grund: 'unlesbar' });
  });
  it('D7: nur CR als Zeilenende', () => {
    const t = leseCsv('name;punkte\rAnna;5\rBen;6\r');
    expect(t.kopf).toEqual(['name', 'punkte']);
    expect(t.zeilen).toEqual([['Anna', '5'], ['Ben', '6']]);
  });
  it('D8: senkrechter Strich als Trennzeichen', () => {
    const t = leseCsv('gruppe|wert|name\nA|60.34|Jörg\nB|50.1|Eva\n');
    expect(t.kopf).toEqual(['gruppe', 'wert', 'name']);
    expect(t.zeilen[0]).toEqual(['A', '60.34', 'Jörg']);
  });
  it('D8: ein senkrechter Strich im Text einer Zelle ändert nichts', () => {
    expect(leseCsv('a;b\n"x|y";2\n').kopf).toEqual(['a', 'b']);
  });
  it('D17: Binärdatei als .csv gilt als nicht lesbar', async () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d, 0x49, 0x48, 0x44, 0x52, 0, 0, 1, 0]);
    await expect(leseDatei(new File([png], 'bild.csv'))).rejects.toMatchObject({ grund: 'unlesbar' });
  });
  it('D17: normale Datei mit DOS-Dateiende-Zeichen am Schluss bleibt lesbar', async () => {
    const b = new Uint8Array([...new TextEncoder().encode('a;b\n1;2\n'), 0x1a]);
    const e = await leseDatei(new File([b], 'alt.csv'));
    expect(e.art).toBe('tabelle');
  });
});

describe('Abschlusstest D11: Zeilen mit anderer Feldzahl', () => {
  it('nennt die Zeilen (Nummer wie in der Datentabelle) mit ihrer Feldzahl', () => {
    const t = leseCsv('name;punkte;klasse\nAnna;10;a\nBen;20;a;extra\nCem;30\nMüller; Hans;50;b\n');
    expect(t.abweichend).toEqual([{ zeile: 2, felder: 4 }, { zeile: 3, felder: 2 }, { zeile: 4, felder: 4 }]);
    expect(t.kopf.length).toBe(3);
  });
  it('passende Zeilen: kein Befund', () => {
    expect(leseCsv('a;b\n1;2\n3;4\n').abweichend).toBeUndefined();
  });
});

describe('Abschlusstest D2: 1.333 ist eine Dezimalzahl, wenn es nur so passt', () => {
  const csvVon = (inhalt: string) => text(zurEngine(leseCsv(inhalt)).csv);
  it('Semikolon-Datei, alle Werte d.ddd: als Dezimalzahl gelesen, mit Hinweis', () => {
    const t = leseCsv('id;skala\n1;1.333\n2;2.667\n3;3.000\n4;4.333\n5;2.333\n');
    expect(text(zurEngine(t).csv)).toBe('id,skala\n1,1.333\n2,2.667\n3,3\n4,4.333\n5,2.333\n');
    const p = planeSpalten(t)[1]!;
    expect(p.dezimalen).toBe(3);
    expect(p.lesart?.beispiele).toEqual(['1.333', '2.667', '3.000']);
  });
  it('mit einer „3“ dazwischen (kleiner als 10): ebenso', () => {
    expect(csvVon('id;skala\n1;1.333\n2;3\n3;2.667\n')).toBe('id,skala\n1,1.333\n2,3\n3,2.667\n');
  });
  it('Komma-getrennte Datei: Punkt ist Dezimalpunkt, kein Hinweis', () => {
    const t = leseCsv('id,skala\n1,1.333\n2,2.667\n3,12.500\n');
    expect(text(zurEngine(t).csv)).toBe('id,skala\n1,1.333\n2,2.667\n3,12.5\n');
    expect(planeSpalten(t)[1]!.lesart).toBeUndefined();
  });
  it('Einkommen mit mehrstelligen Werten bleibt Tausender', () => {
    const t = leseCsv('id;einkommen\n1;12.500\n2;2.000\n3;45.000\n');
    expect(text(zurEngine(t).csv)).toBe('id,einkommen\n1,12500\n2,2000\n3,45000\n');
    expect(planeSpalten(t)[1]!.lesart).toBeUndefined();
  });
  it('Umschalten auf Tausender', () => {
    const t = leseCsv('id;skala\n1;1.333\n2;2.667\n');
    expect(text(zurEngine(t, planeSpalten(t, ['skala'])).csv)).toBe('id,skala\n1,1333\n2,2667\n');
    expect(planeSpalten(t, ['skala'])[1]!.lesart).toBeUndefined();
  });
});

describe('Abschlusstest D21: Schluss-Trennzeichen', () => {
  it('leere Zusatzspalten am Ende (id;punkte;;) fallen weg', () => {
    const t = leseCsv('id;punkte;;\n1;5;;\n2;6;;\n');
    expect(t.kopf).toEqual(['id', 'punkte']);
    expect(t.zeilen).toEqual([['1', '5'], ['2', '6']]);
    expect(t.abweichend).toBeUndefined();
  });
  it('steht in einer Zeile dahinter doch etwas, bleibt es sichtbar (D11)', () => {
    const t = leseCsv('id;punkte;;\n1;5;;\n2;6;;extra\n');
    expect(t.kopf).toEqual(['id', 'punkte', '', '']);
    expect(t.abweichend).toBeUndefined();   // gleiche Feldzahl wie die Kopfzeile
    expect(t.zeilen[1]![3]).toBe('extra');
  });
});

describe('Abschlusstest D10: Zahlen mit Beiwerk', () => {
  it('Minus U+2212, Klammer-Negative und der Apostroph als Tausendertrenner sind Zahlen', () => {
    expect(alsZahl('−5,5')).toBe(-5.5); expect(alsZahl('(9,78)')).toBe(-9.78); expect(alsZahl('( 11,03 )')).toBe(-11.03);
    expect(alsZahl("1'000.5")).toBe(1000.5); expect(alsZahl('1’000')).toBe(1000);
    expect(alsZahl('(abc)')).toBeNull(); expect(alsZahl('(-5)')).toBeNull(); expect(alsZahl('(1,5')).toBeNull(); expect(alsZahl("1'00")).toBeNull();
  });
  it('Klammer-Negative und U+2212 machen die Spalte zur Zahlenspalte (klammer_negativ.csv)', () => {
    const t = leseCsv('gruppe;saldo\nA;5,34\nB;(9,78)\nA;−2,5\nB;12\n');
    const plan = planeSpalten(t);
    expect(plan.map(p => p.art)).toEqual(['text', 'zahl']);
    expect(text(zurEngine(t).csv)).toBe('gruppe,saldo\nA,5.34\nB,-9.78\nA,-2.5\nB,12\n');
  });
  it('Prozent und Währung: bleibt Text mit Hinweis; „Als Zahl lesen“ lässt das Zeichen weg (45 % = 45, nicht 0,45)', () => {
    const t = leseCsv('gruppe;anteil;preis\nA;40%;12,50 €\nB;54 %;€ 8,00\nA;k. A.;$ 7.5\nB;56%;3');
    const aus = planeSpalten(t);
    expect(aus.map(p => p.art)).toEqual(['text', 'text', 'text']);
    expect(aus[1]!.beiwerk).toEqual({ beispiele: ['40%', '54 %', '56%'], zeichen: ['%'] });
    expect(aus[2]!.beiwerk?.zeichen).toEqual(['€', '$']);
    expect(aus[0]!.beiwerk).toBeUndefined();
    const an = planeSpalten(t, [], ['anteil', 'preis']);
    expect(an.map(p => p.art)).toEqual(['text', 'zahl', 'zahl']);
    expect(an[1]!.marker).toEqual({ 'k. A.': 1 });
    expect(text(zurEngine(t, an).csv)).toBe('gruppe,anteil,preis\nA,40,12.5\nB,54,8\nA,,7.5\nB,56,3\n');
  });
  it('Text mit einem Buchstaben-Rest bekommt keinen Hinweis (nur ganze Spalten aus Zahlen mit Beiwerk)', () => {
    expect(planeSpalten(leseCsv('a;b\n1;40%\n2;abc\n3;50%\n'))[1]!.beiwerk).toBeUndefined();
    expect(planeSpalten(leseCsv('a;b\n1;40\n2;50\n'))[1]!.beiwerk).toBeUndefined();
  });
});

describe('Abschlusstest D9: Titelzeile über der Tabelle (Excel)', () => {
  const xlsx = async (aoa: unknown[][], verbunden?: { s: { r: number; c: number }; e: { r: number; c: number } }[]) => {
    const blatt = XLSX.utils.aoa_to_sheet(aoa); if (verbunden) blatt['!merges'] = verbunden;
    const mappe = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(mappe, blatt, 'Daten');
    return leseTabellenkalkulation(XLSX.write(mappe, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer, 'x.xlsx');
  };
  const tabelle = [['gruppe', 'wert', 'name', 'alter'], ['A', 60.5, 'Jörg', 20], ['B', 50.1, 'Eva', 21], ['A', 55, 'Ina', 22]];
  it('Titel in Zeile 1 (verbunden), Zeile 2 leer, Kopf in Zeile 3: Kopf ist Zeile 3, der Titel wird genannt', async () => {
    const t = await xlsx([['Meine Erhebung 2026', null, null, null], [], ...tabelle], [{ s: { r: 0, c: 0 }, e: { r: 0, c: 3 } }]);
    expect(t.kopf).toEqual(['gruppe', 'wert', 'name', 'alter']);
    expect(t.zeilen).toHaveLength(3);
    expect(t.titel).toEqual({ zeilen: [{ zeile: 1, text: 'Meine Erhebung 2026' }], kopfzeile: 3 });
  });
  it('Titel in Zeile 1, Kopf in Zeile 2; zwei Titelzeilen; Titel unter leeren Zeilen', async () => {
    expect((await xlsx([['Meine Erhebung 2026'], ...tabelle])).titel).toEqual({ zeilen: [{ zeile: 1, text: 'Meine Erhebung 2026' }], kopfzeile: 2 });
    const zwei = await xlsx([['Erhebung'], ['Stand Oktober'], [], ...tabelle]);
    expect(zwei.kopf[0]).toBe('gruppe'); expect(zwei.titel).toEqual({ zeilen: [{ zeile: 1, text: 'Erhebung' }, { zeile: 2, text: 'Stand Oktober' }], kopfzeile: 4 });
    const oben = await xlsx([[], [], ['Titel'], [], ...tabelle]);
    expect(oben.kopf).toEqual(['gruppe', 'wert', 'name', 'alter']); expect(oben.titel).toEqual({ zeilen: [{ zeile: 3, text: 'Titel' }], kopfzeile: 5 });
  });
  it('kein Titel: normale Tabelle, leere Zeilen oben, Tabelle mit nur einer Spalte, Kopf mit einzelner Lücke', async () => {
    expect((await xlsx(tabelle)).titel).toBeUndefined();
    const leer = await xlsx([[], [], ...tabelle]); expect(leer.kopf[0]).toBe('gruppe'); expect(leer.titel).toBeUndefined();
    const eine = await xlsx([['wert'], [1], [2], [3]]); expect(eine.kopf).toEqual(['wert']); expect(eine.titel).toBeUndefined();
    const luecke = await xlsx([['gruppe', null, 'name'], ['A', 1, 'x'], ['B', 2, 'y']]); expect(luecke.kopf[0]).toBe('gruppe'); expect(luecke.titel).toBeUndefined();
  });
});
