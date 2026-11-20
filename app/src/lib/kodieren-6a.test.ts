/**
 * Prüftests Stufe 6a (Prototyp Kodier-Arbeitsplatz): Sollwerte aus docs/erheben/FACHBLATT-STUFE-6A.md, Abschnitt „Sollwerte“ (Opus, von Hand gezählt).
 * Der Bauer ändert diese Datei nicht.
 */
import { describe, expect, it } from 'vitest';
import { absaetze, auswahlZuCp, belege, codesAn, cpZuAuswahl, einheitAn, entferneKodierung, kodiere, saetze } from './kodieren';
import { neuesQualProjekt, type QualProjekt } from './qualprojekt';

const T = 'Ja. Gut 😀 so!\r\nNein.';
const U = 'Erste Zeile ohne Punkt\n\n  \nZweite. Dritte';
const kurz = (e: { start: number; ende: number; text: string; nr: number }[]) => e.map(x => [x.start, x.ende, x.text, x.nr]);

describe('Einheiten (Sätze, Absätze) in Codepoints', () => {
  it('Sätze in T', () => {
    expect(kurz(saetze(T, 'de'))).toEqual([[0, 3, 'Ja.', 1], [4, 13, 'Gut 😀 so!', 2], [15, 20, 'Nein.', 3]]);
  });
  it('Absätze in T', () => {
    expect(kurz(absaetze(T))).toEqual([[0, 13, 'Ja. Gut 😀 so!', 1], [15, 20, 'Nein.', 2]]);
  });
  it('Sätze in U: Leerzeilen und Zeilen nur aus Leerzeichen sind kein Satz', () => {
    expect(kurz(saetze(U, 'de'))).toEqual([[0, 22, 'Erste Zeile ohne Punkt', 1], [27, 34, 'Zweite.', 2], [35, 41, 'Dritte', 3]]);
  });
  it('Absätze in U', () => {
    expect(kurz(absaetze(U))).toEqual([[0, 22, 'Erste Zeile ohne Punkt', 1], [27, 41, 'Zweite. Dritte', 2]]);
  });
  it('Satz an einer Stelle: enthält, sonst der nächste, am Ende der letzte', () => {
    const s = saetze(T, 'de');
    expect(einheitAn(s, 10)?.nr).toBe(2);
    expect(einheitAn(s, 0)?.nr).toBe(1);
    expect(einheitAn(s, 14)?.nr).toBe(3);
    expect(einheitAn(s, 3)?.nr).toBe(2);
    expect(einheitAn(s, 20)?.nr).toBe(3);
    expect(einheitAn([], 0)).toBeUndefined();
  });
  it('kein Satz geht über einen Zeilenumbruch', () => {
    const v = 'Eins zwei\ndrei vier.';
    expect(kurz(saetze(v, 'de'))).toEqual([[0, 9, 'Eins zwei', 1], [10, 20, 'drei vier.', 2]]);
  });
  it('leerer Text', () => {
    expect(saetze('', 'de')).toEqual([]);
    expect(absaetze('   \n ')).toEqual([]);
  });
});

describe('Auswahl UTF-16 <-> Codepoints', () => {
  it('freie Auswahl über das Emoji', () => {
    expect(auswahlZuCp(T, 4, 10)).toEqual({ start: 4, ende: 9 });
    expect(cpZuAuswahl(T, 4, 9)).toEqual({ start: 4, ende: 10 });
  });
  it('Satz 3 und Absatz 2 in UTF-16', () => {
    expect(cpZuAuswahl(T, 15, 20)).toEqual({ start: 16, ende: 21 });
    expect(cpZuAuswahl(T, 0, 13)).toEqual({ start: 0, ende: 14 });
  });
});

function projekt(): QualProjekt {
  const q = neuesQualProjekt('Probe');
  q.kodierende = [{ id: 'k1', name: 'Ich (Prototyp)' }];
  q.dokumente = [
    { id: 'd1', name: 'Interview 1', art: 'text', text: T, erstellt: 0, geaendert: 0 },
    { id: 'd2', name: 'Interview 2', art: 'text', text: U, erstellt: 0, geaendert: 0 },
  ];
  q.codes = [
    { id: 'c1', name: 'Belastung', kodierbar: true, reihenfolge: 0 },
    { id: 'c2', name: 'Zeitdruck', kodierbar: true, reihenfolge: 1 },
  ];
  return q;
}

describe('Kodieren, Codes an einer Stelle, Belege', () => {
  it('kodiere legt Segment und Kodierung an und verändert das alte Objekt nicht', () => {
    const q0 = projekt();
    const q1 = kodiere(q0, 'd1', 4, 13, 'c1', 'k1');
    expect(q0.segmente).toHaveLength(0);
    expect(q0.kodierungen).toHaveLength(0);
    expect(q1.segmente).toHaveLength(1);
    expect(q1.segmente[0]).toMatchObject({ dokument: 'd1', start: 4, ende: 13 });
    expect(q1.kodierungen).toHaveLength(1);
    expect(q1.kodierungen[0]).toMatchObject({ segment: q1.segmente[0]!.id, code: 'c1', kodierende: 'k1' });
  });
  it('gleiche Stelle und gleicher Code: nicht doppelt; anderer Code: dasselbe Segment', () => {
    let q = kodiere(projekt(), 'd1', 4, 13, 'c1', 'k1');
    q = kodiere(q, 'd1', 4, 13, 'c1', 'k1');
    expect(q.kodierungen).toHaveLength(1);
    q = kodiere(q, 'd1', 4, 13, 'c2', 'k1');
    expect(q.kodierungen).toHaveLength(2);
    expect(q.segmente).toHaveLength(1);
  });
  it('codesAn: Überlappung und Schreibmarke', () => {
    let q = kodiere(projekt(), 'd1', 4, 13, 'c1', 'k1');
    q = kodiere(q, 'd1', 0, 3, 'c2', 'k1');
    expect(codesAn(q, 'd1', 10, 10).map(c => c.name)).toEqual(['Belastung']);
    expect(codesAn(q, 'd1', 2, 5).map(c => c.name).sort()).toEqual(['Belastung', 'Zeitdruck']);
    expect(codesAn(q, 'd1', 15, 20)).toEqual([]);
    expect(codesAn(q, 'd2', 4, 13)).toEqual([]);
    expect(codesAn(q, 'd1', 13, 13)).toEqual([]);
  });
  it('belege: Reihenfolge nach Dokument, dann Anfang; Text und Absatz', () => {
    let q = kodiere(projekt(), 'd2', 27, 34, 'c1', 'k1');
    q = kodiere(q, 'd1', 15, 20, 'c1', 'k1');
    q = kodiere(q, 'd1', 4, 13, 'c1', 'k1');
    const b = belege(q, 'c1');
    expect(b.map(x => [x.dokument, x.start, x.ende, x.text, x.absatz])).toEqual([
      ['d1', 4, 13, 'Gut 😀 so!', 1],
      ['d1', 15, 20, 'Nein.', 2],
      ['d2', 27, 34, 'Zweite.', 2],
    ]);
    expect(belege(q, 'c2')).toEqual([]);
  });
  it('entferneKodierung: Segment fällt weg, wenn keine Kodierung mehr daran hängt', () => {
    let q = kodiere(projekt(), 'd1', 4, 13, 'c1', 'k1');
    q = kodiere(q, 'd1', 4, 13, 'c2', 'k1');
    const k1 = q.kodierungen.find(k => k.code === 'c1')!.id;
    const q2 = entferneKodierung(q, k1);
    expect(q.kodierungen).toHaveLength(2);
    expect(q2.kodierungen).toHaveLength(1);
    expect(q2.segmente).toHaveLength(1);
    const q3 = entferneKodierung(q2, q2.kodierungen[0]!.id);
    expect(q3.kodierungen).toHaveLength(0);
    expect(q3.segmente).toHaveLength(0);
  });
});
