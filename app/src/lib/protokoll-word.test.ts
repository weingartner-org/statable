import { describe, expect, it } from 'vitest';
import { unzipSync, strFromU8 } from 'fflate';
import { pruefeDocx } from '../../../scripts/docx-pruefen.mjs';
import { neuesQualProjekt } from './qualprojekt';
import type { Protokoll, QualProjekt } from './qualprojekt';
import { INTERVIEW_FELDER, neuesProtokoll } from './protokolle';
import { protokollWord } from './protokoll-word';

/* Sollwerte F2A: SCHNITTSTELLEN-F2.md 1.3. Muster der Prüfung: transkript-word-fl.test.ts (Datei entpacken, word/document.xml lesen). */

const xml = (b: Uint8Array): string => strFromU8(unzipSync(b)['word/document.xml']!);
const sichtbar = (d: string): string => [...d.matchAll(/<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g)].map((m) => m[1]!.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'")).join('');
const tabellen = (d: string): string[] => [...d.matchAll(/<w:tbl>[\s\S]*?<\/w:tbl>/g)].map((m) => m[0]);
const zeilen = (t: string): string[] => [...t.matchAll(/<w:tr\b[\s\S]*?<\/w:tr>/g)].map((m) => m[0]);

const KLARNAME = 'Anna Beispiel';
function projekt(): QualProjekt {
  const q = neuesQualProjekt('Wort');
  q.kodierende.push({ id: 'k1', name: 'Ich' });
  q.faelle.push({ id: 'f3', name: 'B3', werte: { Name: KLARNAME } });
  q.dokumente.push({ id: 'd1', name: `Interview ${KLARNAME}`, art: 'text', text: 'x', erstellt: 1, geaendert: 1, fall: 'f3' });
  return q;
}
function interview(): Protokoll {
  const p = neuesProtokoll('interview', 1);
  p.fall = 'f3'; p.dokument = 'd1';
  p.kopf = { datum: '2027-03-12', uhrzeit: '14:30', ort: 'Café', dauerMin: 45, kontaktweg: 'Mail' };
  p.felder = Object.fromEntries(INTERVIEW_FELDER.map((k) => [k, `Text zu ${k}.`]));
  return p;
}
function gedaechtnis(): Protokoll {
  const p = neuesProtokoll('gedaechtnis', 1);
  p.fall = 'f3';
  p.kopf = { datum: '2027-03-12', ort: 'Flur' };
  p.schritte = {
    s1: { text: 'Rohfassung Schritt eins', beginn: 1000 },
    s2: { text: 'Folge der Situationen Schritt zwei', notizen: 'Jottings' },
    s3: { abschnitte: [
      { beobachtung: 'Er stand auf und ging zur Tür.', ueberlegung: 'Vielleicht wollte er gehen.' },
      { beobachtung: 'Sie öffnete das Fenster.', ueberlegung: 'Es war wohl warm.' }
    ] }
  };
  return p;
}

describe('Word: Interviewprotokoll', () => {
  it('entsteht, Titel mit Art und Fall-Kennung, ein Titel-Absatz', async () => {
    const d = xml(await protokollWord(interview(), projekt(), 'de'));
    expect(d).toContain('w:val="Title"');
    const titel = sichtbar(d.slice(d.indexOf('w:val="Title"')));
    expect(titel.slice(0, 80)).toContain('Interviewprotokoll');
    expect(titel.slice(0, 80)).toContain('B3');
  });
  it('jedes der sieben Felder als Überschrift Ebene 2 mit dem Text darunter, in fester Reihenfolge', async () => {
    const d = xml(await protokollWord(interview(), projekt(), 'de'));
    expect((d.match(/w:val="Heading2"/g) ?? []).length).toBeGreaterThanOrEqual(7);
    const s = sichtbar(d);
    const orte = INTERVIEW_FELDER.map((k) => s.indexOf(`Text zu ${k}.`));
    expect(orte.every((o) => o >= 0)).toBe(true);
    expect([...orte].sort((a, b) => a - b)).toEqual(orte);
  });
  it('Kopf als Tabelle mit Kopfzeile (w:tblHeader), Angaben stehen darin', async () => {
    const d = xml(await protokollWord(interview(), projekt(), 'de'));
    const t = tabellen(d);
    expect(t.length).toBeGreaterThanOrEqual(1);
    expect(t[0]).toContain('w:tblHeader');
    const kopf = sichtbar(t[0]!);
    for (const w of ['Café', '14:30', '45', 'Mail', '12.03.2027']) expect(kopf).toContain(w);
  });
  it('kein Klarname: nur Fall.name steht im Dokument', async () => {
    const d = xml(await protokollWord(interview(), projekt(), 'de'));
    const s = sichtbar(d);
    expect(s).toContain('B3');
    expect(s).not.toContain(KLARNAME);
    expect(s).not.toContain('Anna');
  });
  it('ohne Fall: entsteht trotzdem, ohne Fall-Kennung und ohne Fehler', async () => {
    const p = interview(); delete p.fall; delete p.dokument;
    const b = await protokollWord(p, projekt(), 'de');
    expect(pruefeDocx(b)).toEqual([]);
    expect(sichtbar(xml(b))).not.toContain('B3');
  });
  it('docx-pruefen ohne Befund (de und en); englische Fassung nennt die Art und die Kennung', async () => {
    for (const sp of ['de', 'en'] as const) {
      const b = await protokollWord(interview(), projekt(), sp);
      expect(pruefeDocx(b)).toEqual([]);
    }
    const en = sichtbar(xml(await protokollWord(interview(), projekt(), 'en')));
    expect(en).toMatch(/interview/i);
    expect(en).toContain('B3');
    expect(en).not.toContain('Interviewprotokoll');
  });
  it('Sprache der Datei: lang im Dokument (de/en)', async () => {
    const z = unzipSync(await protokollWord(interview(), projekt(), 'en'));
    const alle = Object.values(z).map((b) => strFromU8(b)).join('');
    expect(alle).toMatch(/w:lang\b[^>]*w:val="en/);
  });
});

describe('Word: Gedächtnisprotokoll', () => {
  it('drei Schritte als Überschriften, Texte in der Reihenfolge Schritt 1, 2, 3', async () => {
    const d = xml(await protokollWord(gedaechtnis(), projekt(), 'de'));
    expect(sichtbar(d.slice(d.indexOf('w:val="Title"'))).slice(0, 80)).toContain('Gedächtnisprotokoll');
    expect((d.match(/w:val="Heading[12]"/g) ?? []).length).toBeGreaterThanOrEqual(3);
    const s = sichtbar(d);
    const a = s.indexOf('Rohfassung Schritt eins'), b = s.indexOf('Folge der Situationen Schritt zwei'), c = s.indexOf('Er stand auf und ging zur Tür.');
    expect(a).toBeGreaterThan(-1);
    expect(b).toBeGreaterThan(a);
    expect(c).toBeGreaterThan(b);
    expect(s).toContain('Jottings');
  });
  it('Schritt 3 als Tabelle „Beobachtung | Überlegung“ mit Kopfzeile und je Abschnitt einer Zeile', async () => {
    const d = xml(await protokollWord(gedaechtnis(), projekt(), 'de'));
    const t = tabellen(d).filter((x) => sichtbar(x).includes('Er stand auf und ging zur Tür.'));
    expect(t).toHaveLength(1);
    expect(t[0]).toContain('w:tblHeader');
    const z = zeilen(t[0]!);
    expect(z.length).toBe(3);                                   // Kopfzeile + 2 Abschnitte
    const kopf = sichtbar(z[0]!);
    expect(kopf).toContain('Beobachtung');
    expect(kopf).toContain('Überlegung');
    expect(kopf.indexOf('Beobachtung')).toBeLessThan(kopf.indexOf('Überlegung'));
    expect(z[0]).toContain('w:tblHeader');
    expect(sichtbar(z[1]!)).toContain('Vielleicht wollte er gehen.');
    expect(sichtbar(z[2]!)).toContain('Sie öffnete das Fenster.');
  });
  it('mindestens zwei Tabellen mit Kopfzeile (Kopf und Schritt 3)', async () => {
    const d = xml(await protokollWord(gedaechtnis(), projekt(), 'de'));
    expect(tabellen(d).filter((t) => t.includes('w:tblHeader')).length).toBeGreaterThanOrEqual(2);
  });
  it('kein Klarname, docx-pruefen ohne Befund (de und en)', async () => {
    const p = gedaechtnis();
    const q = projekt();
    for (const sp of ['de', 'en'] as const) {
      const b = await protokollWord(p, q, sp);
      expect(pruefeDocx(b)).toEqual([]);
      expect(sichtbar(xml(b))).not.toContain(KLARNAME);
    }
  });
  it('fehlen Schritt 2 oder 3, entsteht die Datei trotzdem', async () => {
    const p = gedaechtnis(); delete p.schritte!.s3; delete p.schritte!.s2;
    const b = await protokollWord(p, projekt(), 'de');
    expect(pruefeDocx(b)).toEqual([]);
    expect(sichtbar(xml(b))).toContain('Rohfassung Schritt eins');
  });
});

describe('Word: Beobachtungsprotokoll', () => {
  it('entsteht mit den Feldern beobachtung und ueberlegung', async () => {
    const p = neuesProtokoll('beobachtung', 1);
    p.fall = 'f3';
    p.felder = { beobachtung: 'Er stand auf.', ueberlegung: 'Er wollte gehen.' };
    const b = await protokollWord(p, projekt(), 'de');
    expect(pruefeDocx(b)).toEqual([]);
    const s = sichtbar(xml(b));
    expect(s).toContain('Er stand auf.');
    expect(s).toContain('Er wollte gehen.');
    expect(s.indexOf('Er stand auf.')).toBeLessThan(s.indexOf('Er wollte gehen.'));
  });
});
