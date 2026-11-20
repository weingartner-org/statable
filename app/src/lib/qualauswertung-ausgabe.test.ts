/**
 * Paket 5E1: Fall-Code-Matrix als Datensatz, Abweichungen für die Oberfläche, Konsens mit Vergleich, Protokoll (Daten und Word mit `docx-pruefen`).
 * Die Rechenkerne selbst prüfen `qualauswertung.test.ts`, `segmentuebereinstimmung.test.ts`, `konsens.test.ts`; hier geht es um die Ausgabe darauf.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { pruefeQualProjekt, type QualProjekt } from './qualprojekt';
import { fallCodeMatrix, type MatrixOptionen } from './qualauswertung';
import { segmentUebereinstimmung } from './segmentuebereinstimmung';
import { ART_TEXT, abweichungenAnzeige, kodierbareCodes, konsensMitVergleich, konsensName, konsensProtokollDaten, legendeText, matrixDatensatz, regelCodes, standardStufen, stufenCodes, wahlMoeglichkeiten, ZITAT_MAX, FEHLEND_NICHT_EINGESTUFT, FEHLEND_UNEINDEUTIG } from './qualauswertung-ausgabe';
import { konsensProtokollWord } from './konsensexport';
import { pruefeDocx } from '../../../scripts/docx-pruefen.mjs';
import { unzipSync, strFromU8 } from 'fflate';
import { nutztCodeSpalte } from './codespalten';

const lies = (n: string): QualProjekt => pruefeQualProjekt(JSON.parse(readFileSync(new URL(`./testdaten/qualauswertung/${n}.json`, import.meta.url), 'utf8')));
const matrixQ = lies('matrix');
const segQ = lies('segmente');
const ALLE: MatrixOptionen['kodierende'] = 'alle';

describe('Fall-Code-Matrix als Datensatz', () => {
  it('0/1: Spalte Fall, Fallvariablen, je Code eine Spalte mit Beschriftung, Wertelabels und Messniveau nominal', () => {
    const o: MatrixOptionen = { art: '01', zeilen: 'faelle', kodierende: ALLE, codes: ['c-zeit', 'c-geld'] };
    const m = fallCodeMatrix(matrixQ, o);
    const d = matrixDatensatz(matrixQ, m, o, 'de');
    expect(d.spalten.map(s => s.name)).toEqual(['Fall', 'Studienfach', 'Semester', 'Zeitdruck', 'Geld']);
    expect(d.spalten[3]).toMatchObject({ art: 'zahl', niveau: 'nominal', bezeichnung: 'Zeitdruck', werteLabels: { '0': 'nicht kodiert', '1': 'kodiert' } });
    expect(d.spalten[1]).toMatchObject({ art: 'text' });
    expect(d.spalten[2]).toMatchObject({ art: 'zahl', niveau: 'metrisch' });
    expect(d.zeilen).toHaveLength(m.zeilen.length);
    expect(d.zeilen[0]!.slice(0, 3)).toEqual(['Anna', 'Soziologie', 3]);
    expect(d.zeilen.map(z => z.length)).toEqual(m.zeilen.map(() => 5));
    expect(d.enthaeltZitate).toBe(false);
    // jede Zelle ist Text, Zahl oder leer: nie Befehlstext
    for (const z of d.zeilen) for (const w of z) expect(w === null || typeof w === 'string' || typeof w === 'number').toBe(true);
  });

  it('Anzahl ist metrisch, Einstufung ordinal mit 98/99 als fehlend und Wertelabels der Untercodes', () => {
    const oa: MatrixOptionen = { art: 'anzahl', zeilen: 'dokumente', kodierende: ['p-a'], codes: ['c-zeit'] };
    const da = matrixDatensatz(matrixQ, fallCodeMatrix(matrixQ, oa), oa, 'en');
    expect(da.spalten.map(s => s.name)).toEqual(['Document', 'Case', 'Zeitdruck']);
    expect(da.spalten[2]).toMatchObject({ niveau: 'metrisch', format: 'F8.0' });
    const ob: MatrixOptionen = { art: 'stufe', zeilen: 'faelle', kodierende: ALLE, codes: ['c-bel'], stufen: { 'c-bel-n': 1, 'c-bel-m': 2, 'c-bel-h': 3 } };
    const mb = fallCodeMatrix(matrixQ, ob);
    const db = matrixDatensatz(matrixQ, mb, ob, 'de');
    const sp = db.spalten[db.spalten.length - 1]!;
    expect(sp).toMatchObject({ niveau: 'ordinal', fehlend: [FEHLEND_NICHT_EINGESTUFT, FEHLEND_UNEINDEUTIG] });
    expect(sp.werteLabels).toMatchObject({ '1': 'niedrig', '2': 'mittel', '3': 'hoch', '98': 'nicht eingestuft', '99': 'uneindeutig' });
    const wert = db.zeilen.map(z => z[z.length - 1]);
    // wo die Matrix kein Ergebnis hat, steht 98 (kein Untercode) oder 99 (uneindeutig); sonst die Stufe
    mb.werte.forEach((w, i) => { const v = w[0]; expect(wert[i]).toBe(v !== null ? v : mb.uneindeutig.includes(mb.zeilen[i]!.id) ? 99 : 98); });
  });

  it('Zitate nur auf Wahl: je Code eine Textspalte, Segmenttexte in Textreihenfolge, getrennt durch „ | “', () => {
    const o: MatrixOptionen = { art: '01', zeilen: 'faelle', kodierende: ALLE, codes: ['c-zeit'] };
    const m = fallCodeMatrix(matrixQ, o);
    const ohne = matrixDatensatz(matrixQ, m, o, 'de', false);
    expect(ohne.spalten.some(s => /zitate/.test(s.name))).toBe(false);
    const mit = matrixDatensatz(matrixQ, m, o, 'de', true);
    expect(mit.enthaeltZitate).toBe(true);
    const i = mit.spalten.findIndex(s => s.name === 'Zeitdruck_zitate');
    expect(i).toBeGreaterThan(0);
    expect(mit.spalten[i]).toMatchObject({ art: 'text' });
    const kodierteFaelle = m.zeilen.filter((_, z) => m.werte[z]![0] === 1).length;
    expect(mit.zeilen.filter(z => typeof z[i] === 'string' && (z[i] as string) !== '').length).toBe(kodierteFaelle);
    // jede Zitat-Zelle besteht aus Teilen, die im Dokumenttext vorkommen
    const alleTexte = matrixQ.dokumente.map(d => d.text).join('\n');
    for (const z of mit.zeilen) if (typeof z[i] === 'string') for (const teil of (z[i] as string).split(' | ')) expect(alleTexte.replace(/\s+/g, ' ')).toContain(teil);
  });

  it('Zitate länger als 2.000 Zeichen werden mit „…“ gekürzt und gemeldet', () => {
    const q = structuredClone(matrixQ);
    const d = q.dokumente[0]!;
    d.text = 'x'.repeat(ZITAT_MAX + 500);
    q.segmente = [{ id: 's-gross', dokument: d.id, start: 0, ende: d.text.length, erstellt: 1 }];
    q.kodierungen = [{ id: 'k-gross', segment: 's-gross', code: 'c-zeit', kodierende: 'p-a', erstellt: 1 }];
    const o: MatrixOptionen = { art: '01', zeilen: 'dokumente', kodierende: ALLE, codes: ['c-zeit'] };
    const r = matrixDatensatz(q, fallCodeMatrix(q, o), o, 'de', true);
    const i = r.spalten.findIndex(s => s.name === 'Zeitdruck_zitate');
    const zelle = r.zeilen[0]![i] as string;
    expect([...zelle]).toHaveLength(ZITAT_MAX);
    expect(zelle.endsWith('…')).toBe(true);
    expect(r.meldungen.join(' ')).toMatch(/2000|2\.000/);
  });

  it('Spaltennamen aus Codes mit Sonderzeichen und Doppelten werden gültige, eindeutige Namen', () => {
    const q = structuredClone(matrixQ);
    q.codes = q.codes.map(c => (c.id === 'c-geld' ? { ...c, name: "Geld & 'Sorgen'; (viel)" } : c.id === 'c-zeit' ? { ...c, name: 'Fall' } : c));
    const o: MatrixOptionen = { art: '01', zeilen: 'faelle', kodierende: ALLE, codes: ['c-zeit', 'c-geld'] };
    const d = matrixDatensatz(q, fallCodeMatrix(q, o), o, 'de');
    const namen = d.spalten.map(s => s.name);
    expect(new Set(namen.map(n => n.toLowerCase())).size).toBe(namen.length);
    for (const n of namen) expect(n).toMatch(/^[A-Za-z][A-Za-z0-9_]*$/);
  });
});

describe('Code-Spalten mit Herkunft', () => {
  it('alle Code-Spalten (0/1, Anzahl, Einstufung) tragen herkunft codes, Fall, Fallvariablen und Zitate nicht', () => {
    const os: MatrixOptionen[] = [
      { art: '01', zeilen: 'faelle', kodierende: ALLE, codes: ['c-zeit', 'c-geld'] },
      { art: 'anzahl', zeilen: 'faelle', kodierende: ALLE, codes: ['c-zeit', 'c-geld'] },
      { art: 'stufe', zeilen: 'faelle', kodierende: ALLE, codes: ['c-bel'], stufen: { 'c-bel-n': 1, 'c-bel-m': 2, 'c-bel-h': 3 } },
    ];
    for (const o of os) {
      const d = matrixDatensatz(matrixQ, fallCodeMatrix(matrixQ, o), o, 'de', o.art !== 'stufe');
      const codes = d.spalten.filter(s => s.herkunft === 'codes').map(s => s.name);
      expect(codes).toHaveLength(o.art === 'stufe' ? 1 : 2);
      for (const s of d.spalten.filter(x => ['Fall', 'Studienfach', 'Semester'].includes(x.name) || /_zitate$/.test(x.name))) expect(s.herkunft).toBeUndefined();
      expect(nutztCodeSpalte(d.spalten, [codes[0]!])).toBe(true);
      expect(nutztCodeSpalte(d.spalten, ['Semester'])).toBe(false);
    }
  });
});

describe('Hilfen für die Auswahl', () => {
  it('kodierbare Codes in Baumreihenfolge, Stufen-Codes mit Untercodes, Standardstufen 1, 2, 3', () => {
    expect(kodierbareCodes(matrixQ).map(c => c.id)).toEqual(expect.arrayContaining(['c-zeit', 'c-bel-n']));
    expect(kodierbareCodes(matrixQ).find(c => c.id === 'c-bel')).toBeUndefined();   // nicht kodierbar
    const s = stufenCodes(matrixQ);
    expect(s).toHaveLength(1);
    expect(s[0]!.unter.map(u => u.name)).toEqual(['niedrig', 'mittel', 'hoch']);
    expect(standardStufen(s[0]!.unter)).toEqual({ 'c-bel-n': 1, 'c-bel-m': 2, 'c-bel-h': 3 });
  });
});

describe('Abweichungen für die Oberfläche', () => {
  const e = segmentUebereinstimmung(segQ, { a: 'p-a', b: 'p-b', codes: ['c1', 'c2', 'c3', 'c4'], schwelle: 0.9 });
  const namen = { a: 'Kodiererin A', b: 'Kodierer B' };
  const anz = abweichungenAnzeige(segQ, e.abweichungen, namen, 'de');

  it('Legende „Abweichung n von N: Art“, Nummern lückenlos, Text der Stelle aus dem Dokument', () => {
    expect(anz).toHaveLength(e.abweichungen.length);
    expect(anz.length).toBeGreaterThan(3);
    expect(anz[0]!.legende).toBe(`Abweichung 1 von ${anz.length}: ${ART_TEXT[anz[0]!.art].de}`);
    expect(legendeText(3, 17, 'anderer-code', 'de')).toBe('Abweichung 3 von 17: gleiche Stelle, anderer Code');
    expect(legendeText(3, 17, 'anderer-code', 'en')).toBe('Deviation 3 of 17: same passage, different code');
    anz.forEach((x, i) => expect(x.nr).toBe(i + 1));
    for (const x of anz) for (const s of x.stellen) { expect(s.text.length).toBeGreaterThan(0); expect(['Kodiererin A', 'Kodierer B']).toContain(s.name); }
  });
  it('Emoji im Text bleiben ganz (Codepoints)', () => {
    const mitEmoji = anz.filter(x => x.dokument === 'Mit Emoji');
    for (const x of mitEmoji) for (const s of x.stellen) expect(s.text).not.toMatch(/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/);
  });
  it('Wahlmöglichkeiten mit verständlichen Namen; „nur eine Person“ bietet übernehmen oder nicht übernehmen', () => {
    const art2 = wahlMoeglichkeiten('anderer-code', [{ person: 'a' }, { person: 'b' }], namen, 'de');
    expect(art2.map(x => x.wert)).toEqual(['a', 'b', 'beide', 'keiner']);
    expect(art2[0]!.text).toBe('Kodierung von Kodiererin A übernehmen');
    expect(wahlMoeglichkeiten('grenzen', [{ person: 'a' }, { person: 'b' }], namen, 'de')[1]!.text).toBe('Grenzen von Kodierer B übernehmen');
    const nur = wahlMoeglichkeiten('nur-eine', [{ person: 'b' }], namen, 'en');
    expect(nur.map(x => x.wert)).toEqual(['beide', 'keiner']);
    expect(nur[0]!.text).toBe('Take over the coding by Kodierer B');
  });
  it('Codes für die Kodierregel: die Codes der Stellen ohne Doppelte', () => {
    for (const x of anz) { const c = regelCodes(x); expect(new Set(c.map(y => y.id)).size).toBe(c.length); expect(c.length).toBeGreaterThan(0); }
  });
});

describe('Konsens mit Vergleich und Protokoll', () => {
  const codes = ['c1', 'c2', 'c3', 'c4'];
  const schwelle = 0.9;
  const abw = segmentUebereinstimmung(segQ, { a: 'p-a', b: 'p-b', codes, schwelle }).abweichungen;
  const entwurf = {
    a: 'p-a', b: 'p-b', codes, schwelle, position: 0,
    entscheidungen: [
      { abweichung: abw[0]!.id, wahl: 'a' as const, begruendung: 'Die Definition passt zu A.', regel: { code: abw[0]!.einheiten[0]!.code, text: 'Nur ganze Sätze kodieren.' } },
      { abweichung: abw[1]!.id, wahl: 'keiner' as const, begruendung: 'Zu unklar' },
      { abweichung: abw[2]!.id, wahl: 'beide' as const, begruendung: '' },   // ohne Begründung: zählt nicht
    ],
  };
  const jetzt = Date.UTC(2026, 10, 9, 12);
  const r = konsensMitVergleich(segQ, entwurf, konsensName(segQ, 'p-a', 'p-b'), jetzt);

  it('legt eine neue Person an, A und B bleiben unverändert, nur begründete Entscheidungen zählen', () => {
    expect(r.name).toBe('Konsens Kodiererin A/Kodierer B');
    expect(r.projekt.kodierende.map(k => k.name)).toContain(r.name);
    expect(r.projekt.kodierungen.filter(k => k.kodierende === 'p-a')).toEqual(segQ.kodierungen.filter(k => k.kodierende === 'p-a'));
    expect(r.offen).toContain(abw[2]!.id);
    expect(r.offen).not.toContain(abw[0]!.id);
    expect(r.projekt.codes.find(c => c.id === abw[0]!.einheiten[0]!.code)!.regel).toContain('2026-11-09: Nur ganze Sätze kodieren.');
  });
  it('vorher A gegen B, nachher A und B gegen Konsens (Konsens deckt A bei „a“)', () => {
    expect(r.vorher.einheiten).toBeGreaterThan(0);
    expect(r.nachherA.einheiten).toBeGreaterThan(0);
    expect(r.nachherB.einheiten).toBeGreaterThan(0);
    expect(r.nachherA.prozent!).toBeGreaterThan(r.vorher.prozent! - 1e-9);
  });
  it('doppelter Name der Konsens-Person bekommt eine Nummer', () => {
    expect(konsensName(r.projekt, 'p-a', 'p-b')).toBe('Konsens Kodiererin A/Kodierer B (2)');
    expect(konsensName(segQ, 'p-a', 'p-b', '  Einigung 1 ')).toBe('Einigung 1');
  });
  it('Protokolldaten: nur entschiedene Abweichungen, mit Entscheidung, Begründung und Regel', () => {
    const d = konsensProtokollDaten(segQ, entwurf, r, 'de', jetzt);
    expect(d.abweichungen.map(a => a.nr)).toEqual([1, 2]);
    expect(d.abweichungen[0]!.entscheidung).toMatch(/Kodierung von Kodiererin A|Grenzen von Kodiererin A/);
    expect(d.abweichungen[0]!.regel?.text).toBe('Nur ganze Sätze kodieren.');
    expect(d.offen).toBe(r.offen.length);
    expect(d.datum).toBe('2026-11-09');
  });
  for (const sprache of ['de', 'en'] as const) {
    it(`Word-Protokoll (${sprache}): docx-pruefen ohne Befund, Titel, Überschriften, Tabellen mit Kopfzeile, Text nur als Text`, async () => {
      const d = konsensProtokollDaten(segQ, { ...entwurf, entscheidungen: [...entwurf.entscheidungen.slice(0, 2), { ...entwurf.entscheidungen[0]!, abweichung: abw[3]!.id, begruendung: '<b>fett</b> & "Anführung" \u0001 neu\nzeile' }] }, r, sprache, jetzt);
      const bytes = await konsensProtokollWord(d);
      expect(bytes.length).toBeGreaterThan(2000);
      expect(pruefeDocx(bytes)).toEqual([]);
      const xml = strFromU8(unzipSync(bytes)['word/document.xml']!);
      expect(xml).toContain(sprache === 'de' ? 'Konsens beim Kodieren' : 'Consensus in coding');
      expect(xml).toContain('&lt;b&gt;fett&lt;/b&gt;');   // nie als Markup
      expect(xml).not.toContain('\u0001');
      expect((xml.match(/<w:tblHeader/g) ?? []).length).toBeGreaterThanOrEqual(4);
    });
  }
});
