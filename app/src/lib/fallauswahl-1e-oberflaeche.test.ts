import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { s } from './sitzung.svelte';
import { fallauswahl } from './fallauswahl';
import { begruendung, festeRegelnSatz, hinweisSaetze, kennzahlText, kopfSatz, regelTitel, regelWahl, rechenwertSpalte, tabelleAuswahl } from './fallauswahlsaetze';
import { codeSpaltenHinweis, gezieltSatz, leseCodeSpalten, markiereCodeSpalten, nullSatz, nutztCodeSpalte } from './codespalten';
import { leseProjektdatei, projektAlsDatei } from './projektdatei';
import { alsHaeufigkeit, alsVorkommen, liesQda } from './qdaimport';
import { leseTabellenkalkulation } from './einlesen';
import type { Projekt } from './ablage';
import type { Spalte } from './verzeichnis';

/* Paket 1E (Bauer): Sätze der Oberfläche zu „einflussreich“ und „divers“ und das Kennzeichen für Code-Spalten. Rechenwerte prüft fallauswahl-1e.test.ts (Prüfer). */
beforeEach(() => { s.einst.sprache = 'de'; s.einst.anrede = 'du'; });

const y = [3.1, 4, 5.2, 5.9, 7.1, 8.3, 20, 9.8, 11.2, 12.1, 12.8, 14.3], x = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], g = [0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0];
const A = [1, 2, 1, 1, 2, 1, 1, 2], B = [1, 1, 2, 1, 1, 1, 2, 1];

describe('einflussreich: Sätze', () => {
  it('Daumenregeln sind ausdrücklich Daumenregeln mit Quelle, nie eine feste Grenze', () => {
    const a = fallauswahl('einflussreich', [y, x, g], { k: 3 }), t = hinweisSaetze(a);
    const vier = t.find(z => z.includes('4/n'))!, eins = t.find(z => z.includes('über 1'))!;
    expect(vier).toContain('Daumenregel'); expect(vier).toContain('Bollen & Jackman 1990'); expect(vier).toContain('keine feste Grenze');
    expect(eins).toContain('Daumenregel'); expect(eins).toContain('Cook & Weisberg 1982');
  });
  it('Hebelwert 1: eigener Hinweis mit der Zeile', () => {
    const a = fallauswahl('einflussreich', [y, x, g], { k: 3 });
    const h = hinweisSaetze(a).find(z => z.includes('Hebelwert 1'))!;
    expect(h).toContain('Zeile 7'); expect(h).toContain('nicht bestimmt');
  });
  it('Kennzahl: Cook-Distanz mit 3 Stellen, Kopf der Spalte und Begründung nennen den Fachbegriff', () => {
    const a = fallauswahl('einflussreich', [y, x, g], { k: 3 });
    expect(rechenwertSpalte('einflussreich')).toBe('Cook-Distanz D'); expect(kennzahlText(a, a.vorschlaege[0]!)).toBe('0,303');
    expect(begruendung(a, a.vorschlaege[0]!)).toContain('Cook-Distanz D = 0,303'); expect(kopfSatz(a, ['Y', 'X', 'G'])).toContain('Cook-Distanz');
  });
  it('Auswahltext nennt Beschreibung und Fachbegriff', () => {
    expect(regelWahl('einflussreich')).toBe('Fälle mit großem Einfluss auf das Modell (einflussreiche Fälle, Cook-Distanz)');
    expect(regelTitel('einflussreich')).toContain('Cook-Distanz');
  });
});

describe('divers: Sätze', () => {
  it('Auswahltext, Kopf der Spalte und Kennzahl (Fallzahl der Zelle)', () => {
    expect(regelWahl('divers')).toBe('Fälle, die zusammen alle Ausprägungen zeigen (diverse Fälle, diverse case selection)');
    const a = fallauswahl('divers', [A, B]);
    expect(rechenwertSpalte('divers')).toBe('Fallzahl der Zelle'); expect(kennzahlText(a, a.vorschlaege[0]!)).toBe('3');
    expect(begruendung(a, a.vorschlaege[0]!)).toContain('3 Fälle in dieser Kombination, 2 weitere');
    expect(begruendung(a, { ...a.vorschlaege[0]!, wert: 1, weitere: 0 })).toBe('1 Fall in dieser Kombination.');
  });
  it('leere Kombination als eigener Satz, mit Wertelabels wenn vorhanden', () => {
    const a = fallauswahl('divers', [A, B]);
    expect(hinweisSaetze(a).find(z => z.startsWith('Diese Kombinationen kommen nicht vor'))).toBe('Diese Kombinationen kommen nicht vor: 2 / 2.');
    const namen: Record<number, Record<number, string>> = { 0: { 1: 'weiblich', 2: 'männlich' }, 1: { 1: 'Abitur', 2: 'Realschule' } };
    expect(hinweisSaetze(a, (sp, c) => namen[sp]![c]!)).toContain('Diese Kombinationen kommen nicht vor: männlich / Realschule.');
  });
  it('ohne leere Kombination kein solcher Satz; mehr Zellen als k: Satz mit Zahlen', () => {
    expect(hinweisSaetze(fallauswahl('divers', [A])).some(z => z.includes('kommen nicht vor'))).toBe(false);
    expect(hinweisSaetze(fallauswahl('divers', [A, B], { k: 2 }))).toContain('Es gibt 3 Kombinationen; gezeigt werden die 2 häufigsten.');
  });
  it('Tabelle für Excel und Word: Spalte Kombination, Fallzahl ganz, Satz zu festen Regeln', () => {
    const a = fallauswahl('divers', [A, B]);
    const t = tabelleAuswahl(a, a.vorschlaege.map(v => ({ v, kennung: `Zeile ${v.zeile}`, weitere: [], kombi: `${A[v.zeile - 1]} / ${B[v.zeile - 1]}` })));
    const text = JSON.stringify(t);
    expect(text).toContain('Kombination'); expect(text).toContain('Fallzahl der Zelle'); expect(text).toContain('Das ist ein Vorschlag nach festen Regeln');
  });
  it('der Satz unter beiden Regeln: Vorschlag nach festen Regeln, die Person entscheidet', () => {
    expect(festeRegelnSatz()).toBe('Das ist ein Vorschlag nach festen Regeln. Ob die Fälle für deine Frage passen, entscheidest du.');
    s.einst.anrede = 'sie'; expect(festeRegelnSatz()).toBe('Das ist ein Vorschlag nach festen Regeln. Ob die Fälle für Ihre Frage passen, entscheiden Sie.');
  });
});

const sp = (name: string, rest: Partial<Spalte> = {}): Spalte => ({ name, bezeichnung: name, art: 'zahl', niveau: 'metrisch', format: 'F8.0', fehlend: [], fehlendText: '', werteLabels: {}, ...rest });

describe('Code-Spalten: Kennzeichen und Hinweis', () => {
  const spalten = [sp('alter'), sp('c_angst'), sp('c_arbeit')];
  it('der Codierungen-Import kennzeichnet seine Code-Spalten (herkunft = codes), die Dokumentspalte nicht', async () => {
    const b = readFileSync(new URL('./testdaten/qda/maxqda-code-matrix.xlsx', import.meta.url)), t = await leseTabellenkalkulation(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer, 'maxqda-code-matrix.xlsx');
    const e = liesQda(t, { summenWeglassen: true });
    for (const d of [alsHaeufigkeit(e)!, alsVorkommen(e)!]) {
      expect(d.spalten[0]!.herkunft).toBeUndefined();
      expect(d.spalten.slice(1).length).toBe(e.codes.length); expect(d.spalten.slice(1).every(c => c.herkunft === 'codes')).toBe(true);
    }
  });
  it('markiereCodeSpalten setzt das Kennzeichen nur an den gemerkten Namen (Groß/klein gleich) und ändert die Eingabe nicht', () => {
    const m = markiereCodeSpalten(spalten, ['C_ANGST', 'c_arbeit']);
    expect(m.map(c => c.herkunft)).toEqual([undefined, 'codes', 'codes']); expect(spalten.every(c => c.herkunft === undefined)).toBe(true);
    expect(markiereCodeSpalten(spalten, [])).toBe(spalten);
  });
  it('Hinweis erscheint nur, wenn die Auswertung eine Code-Spalte benutzt', () => {
    const m = markiereCodeSpalten(spalten, ['c_angst']);
    expect(nutztCodeSpalte(m, ['alter', 'c_angst'])).toBe(true); expect(nutztCodeSpalte(m, ['alter', 'c_arbeit'])).toBe(false);
    expect(codeSpaltenHinweis(m, ['alter', 'c_arbeit'], 12)).toBeNull(); expect(codeSpaltenHinweis(spalten, ['c_angst'], 12)).toBeNull();
    expect(codeSpaltenHinweis(m, ['alter', 'c_angst'], 120)).toEqual({ text: '0 heißt hier: nicht erwähnt. Das ist nicht dasselbe wie: trifft nicht zu.', klein: '' });
  });
  it('bei n < 30 kommt der Satz zur gezielten Auswahl dazu, bei n = 30 nicht', () => {
    const m = markiereCodeSpalten(spalten, ['c_angst']);
    expect(codeSpaltenHinweis(m, ['c_angst'], 29)).toEqual({ text: nullSatz(), klein: gezieltSatz() });
    expect(gezieltSatz()).toBe('Die Fälle wurden gezielt ausgewählt, nicht zufällig. p-Werte lassen sich dann nicht auf eine Grundgesamtheit übertragen.');
    expect(codeSpaltenHinweis(m, ['c_angst'], 30)!.klein).toBe('');
  });
  it('englische Fassung', () => { s.einst.sprache = 'en'; expect(nullSatz()).toBe('0 means here: not mentioned. That is not the same as: does not apply.'); });
});

describe('Code-Spalten in der Projektdatei', () => {
  const p = (extra: Partial<Projekt> = {}): Projekt => ({ name: 'Studie', quelle: 'codes.xlsx', sav: new Uint8Array([1, 2, 3]), blaetter: [], entscheid: {}, zeit: 1, ...extra });
  it('Rundreise mit Feld: die Namen bleiben erhalten', () => {
    expect(leseProjektdatei(projektAlsDatei(p({ codeSpalten: ['c_angst', 'c_arbeit'] }))).codeSpalten).toEqual(['c_angst', 'c_arbeit']);
  });
  it('Rundreise ohne Feld und alte Datei ohne Feld: keine Code-Spalte, das Feld fehlt', () => {
    const datei = projektAlsDatei(p()); expect(JSON.parse(new TextDecoder().decode(datei))).not.toHaveProperty('codeSpalten');
    expect(leseProjektdatei(datei).codeSpalten).toBeUndefined();
    const alt = JSON.parse(new TextDecoder().decode(projektAlsDatei(p({ codeSpalten: ['x'] })))); delete alt.codeSpalten;
    expect(leseProjektdatei(new TextEncoder().encode(JSON.stringify(alt))).codeSpalten).toBeUndefined();
  });
  it('kaputtes Feld in einer fremden Datei wird verworfen (nur Texte bleiben)', () => {
    const o = JSON.parse(new TextDecoder().decode(projektAlsDatei(p()))); o.codeSpalten = ['ok', 5, null, { a: 1 }, ''];
    expect(leseProjektdatei(new TextEncoder().encode(JSON.stringify(o))).codeSpalten).toEqual(['ok']);
    o.codeSpalten = 'c_angst'; expect(leseProjektdatei(new TextEncoder().encode(JSON.stringify(o))).codeSpalten).toBeUndefined();
    expect(leseCodeSpalten(undefined)).toEqual([]);
  });
});
