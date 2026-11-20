import { describe, expect, it } from 'vitest';
import { neuesQualProjekt } from './qualprojekt';
import type { Memo, Protokoll, QualProjekt } from './qualprojekt';
import {
  INTERVIEW_FELDER, aendereProtokoll, beginneSchritt1, entferneProtokoll, fuegeProtokollHinzu, neueFeldnotiz, neuesProtokoll, wirktWieStichworte, wortzahl
} from './protokolle';

/* Sollwerte F2A: SCHNITTSTELLEN-F2.md 1.2. Festlegungen ohne Vorgabe im Blatt: SOLLWERTE-F2.md. */

const projekt = (): QualProjekt => neuesQualProjekt('Test');

describe('neuesProtokoll', () => {
  it('Interviewprotokoll: leere Felder, leerer Kopf, keine Schritte', () => {
    const p = neuesProtokoll('interview', 1000);
    expect(p.art).toBe('interview');
    expect(p.felder).toEqual({});
    expect(p.kopf).toEqual({});
    expect(p.schritte).toBeUndefined();
    expect(p.erstellt).toBe(1000);
    expect(p.geaendert).toBe(1000);
    expect(typeof p.id).toBe('string');
    expect(p.id.length).toBeGreaterThan(5);
  });
  it('Beobachtungsprotokoll: wie Interview, ohne Schritte', () => {
    const p = neuesProtokoll('beobachtung', 5);
    expect(p.art).toBe('beobachtung');
    expect(p.felder).toEqual({});
    expect(p.schritte).toBeUndefined();
  });
  it('Gedächtnisprotokoll: schritte ist ein leeres Objekt', () => {
    const p = neuesProtokoll('gedaechtnis', 7);
    expect(p.art).toBe('gedaechtnis');
    expect(p.schritte).toEqual({});
    expect(p.felder).toEqual({});
  });
  it('jeder Aufruf gibt eine neue Kennung; ohne Zeit steht die jetzige Zeit', () => {
    const vor = Date.now();
    const a = neuesProtokoll('interview'); const b = neuesProtokoll('interview');
    expect(a.id).not.toBe(b.id);
    expect(a.erstellt).toBeGreaterThanOrEqual(vor);
    expect(a.geaendert).toBe(a.erstellt);
  });
  it('INTERVIEW_FELDER: die sieben Schlüssel in fester Reihenfolge', () => {
    expect([...INTERVIEW_FELDER]).toEqual(['zustandekommen', 'raum', 'atmosphaere', 'verlauf', 'wirkung', 'vorNach', 'thesen']);
  });
});

describe('fuegeProtokollHinzu / aendereProtokoll / entferneProtokoll', () => {
  it('Hinzufügen: neues Objekt, Original bleibt, Eintrag im Projekt-Protokoll', () => {
    const q = projekt();
    const p = neuesProtokoll('interview', 10);
    const r = fuegeProtokollHinzu(q, p, 'k1');
    expect(r).not.toBe(q);
    expect(q.protokolle ?? []).toEqual([]);
    expect(q.protokoll).toHaveLength(0);
    expect(r.protokolle).toHaveLength(1);
    expect(r.protokolle![0]!.id).toBe(p.id);
    expect(r.protokoll).toHaveLength(1);
    expect(r.protokoll[0]!.was).toContain('Protokoll angelegt');
    expect(r.protokoll[0]!.kodierende).toBe('k1');
    expect(typeof r.protokoll[0]!.zeit).toBe('number');
  });
  it('Hinzufügen zweimal: Liste wächst, Reihenfolge bleibt', () => {
    const a = neuesProtokoll('interview', 1); const b = neuesProtokoll('gedaechtnis', 2);
    const r = fuegeProtokollHinzu(fuegeProtokollHinzu(projekt(), a), b);
    expect(r.protokolle!.map((x) => x.id)).toEqual([a.id, b.id]);
    expect(r.protokoll).toHaveLength(2);
  });
  it('Ändern: ersetzt nach Kennung, setzt geaendert, schreibt keinen Eintrag ins Protokoll', () => {
    const p = neuesProtokoll('interview', 1);
    const q = fuegeProtokollHinzu(projekt(), p);
    const neu: Protokoll = { ...p, felder: { raum: 'Café' }, geaendert: 1 };
    const r = aendereProtokoll(q, neu);
    expect(r).not.toBe(q);
    expect(q.protokolle![0]!.felder).toEqual({});           // Original unberührt
    expect(r.protokolle![0]!.felder).toEqual({ raum: 'Café' });
    expect(r.protokolle![0]!.geaendert).toBeGreaterThan(1);
    expect(r.protokoll).toHaveLength(q.protokoll.length);   // kein Eintrag je Tastendruck
  });
  it('Ändern: andere Protokolle bleiben, unbekannte Schlüssel in felder bleiben erhalten', () => {
    const a = neuesProtokoll('interview', 1); const b = neuesProtokoll('interview', 1);
    let q = fuegeProtokollHinzu(fuegeProtokollHinzu(projekt(), a), b);
    q = aendereProtokoll(q, { ...a, felder: { zustandekommen: 'x', zukunft: 'bleibt' } });
    const r = aendereProtokoll(q, { ...q.protokolle![0]!, felder: { ...q.protokolle![0]!.felder, raum: 'y' } });
    expect(r.protokolle![0]!.felder).toEqual({ zustandekommen: 'x', zukunft: 'bleibt', raum: 'y' });
    expect(r.protokolle![1]).toEqual(b);
  });
  it('Ändern mit unbekannter Kennung: Projekt bleibt inhaltlich gleich (kein Fehler, kein Eintrag)', () => {
    const q = fuegeProtokollHinzu(projekt(), neuesProtokoll('interview', 1));
    const r = aendereProtokoll(q, { ...neuesProtokoll('interview', 1), id: 'gibtsnicht' });
    expect(r).toEqual(q);
  });
  it('Entfernen: weg aus der Liste, Original bleibt, Eintrag im Protokoll', () => {
    const a = neuesProtokoll('interview', 1); const b = neuesProtokoll('beobachtung', 1);
    const q = fuegeProtokollHinzu(fuegeProtokollHinzu(projekt(), a), b);
    const r = entferneProtokoll(q, a.id, 'k2');
    expect(r).not.toBe(q);
    expect(q.protokolle).toHaveLength(2);
    expect(r.protokolle!.map((x) => x.id)).toEqual([b.id]);
    expect(r.protokoll).toHaveLength(q.protokoll.length + 1);
    const e = r.protokoll[r.protokoll.length - 1]!;
    expect(e.was).toMatch(/entfernt|gelöscht/);
    expect(e.kodierende).toBe('k2');
  });
  it('Entfernen mit unbekannter Kennung ändert nichts', () => {
    const q = fuegeProtokollHinzu(projekt(), neuesProtokoll('interview', 1));
    expect(entferneProtokoll(q, 'gibtsnicht')).toEqual(q);
  });
});

describe('Gedächtnisprotokoll: drei Schritte', () => {
  it('beginneSchritt1 setzt den Beginn und einen leeren Text', () => {
    const p = neuesProtokoll('gedaechtnis', 1);
    const r = beginneSchritt1(p, 1000);
    expect(r).not.toBe(p);
    expect(p.schritte).toEqual({});
    expect(r.schritte!.s1).toEqual({ text: '', beginn: 1000 });
  });
  it('beginneSchritt1 setzt den Beginn nur einmal (zweiter Aufruf ändert nichts)', () => {
    const p = beginneSchritt1(neuesProtokoll('gedaechtnis', 1), 1000);
    const mitText: Protokoll = { ...p, schritte: { ...p.schritte, s1: { ...p.schritte!.s1!, text: 'alles was mir einfällt' } } };
    const r = beginneSchritt1(mitText, 2000);
    expect(r.schritte!.s1).toEqual({ text: 'alles was mir einfällt', beginn: 1000 });
  });
  it('Schritt 2 und Schritt 3 lassen Schritt 1 stehen; Schritt 3 hat Abschnitte mit beobachtung und ueberlegung', () => {
    const p0 = beginneSchritt1(neuesProtokoll('gedaechtnis', 1), 1000);
    let q = fuegeProtokollHinzu(projekt(), p0);
    const s1 = { text: 'Rohfassung', beginn: 1000 };
    q = aendereProtokoll(q, { ...p0, schritte: { s1 } });
    const s2 = { text: 'Folge der Situationen', notizen: 'Jottings' };
    q = aendereProtokoll(q, { ...q.protokolle![0]!, schritte: { ...q.protokolle![0]!.schritte, s2 } });
    const s3 = { abschnitte: [{ beobachtung: 'Er stand auf.', ueberlegung: 'Vielleicht wollte er gehen.' }] };
    q = aendereProtokoll(q, { ...q.protokolle![0]!, schritte: { ...q.protokolle![0]!.schritte, s3 } });
    expect(q.protokolle![0]!.schritte).toEqual({ s1, s2, s3 });
  });
});

describe('neueFeldnotiz', () => {
  it.each(['feldnotiz-empirisch', 'feldnotiz-methodisch', 'feldnotiz-theoretisch'] as const)('%s: Memo mit Art und Text', (art) => {
    const m: Memo = neueFeldnotiz(art, 'Eine Notiz');
    expect(m.art).toBe(art);
    expect(m.text).toBe('Eine Notiz');
    expect(typeof m.id).toBe('string');
    expect(m.id.length).toBeGreaterThan(5);
    expect(typeof m.erstellt).toBe('number');
    expect(m.bezug).toEqual([]);
  });
  it('Bezug wird übernommen', () => {
    const m = neueFeldnotiz('feldnotiz-empirisch', 'x', [{ art: 'protokoll', id: 'p1' }]);
    expect(m.bezug).toEqual([{ art: 'protokoll', id: 'p1' }]);
  });
  it('jede Notiz bekommt eine eigene Kennung', () => {
    expect(neueFeldnotiz('feldnotiz-empirisch', 'a').id).not.toBe(neueFeldnotiz('feldnotiz-empirisch', 'a').id);
  });
});

describe('wortzahl', () => {
  it.each([['', 0], ['   ', 0], ['Das ist ein Test', 4], ['a  b\nc', 3], ['Wort', 1], ['ein e-mail Text', 3]] as [string, number][])('„%s“ hat %i Wörter', (t, n) => {
    expect(wortzahl(t)).toBe(n);
  });
});

describe('wirktWieStichworte (nur Hilfe, kein Zwang)', () => {
  it('Stichpunktliste mit Strich, Punkt und Stern: ja', () => {
    expect(wirktWieStichworte('- Raum klein\n- Kaffee\n- Stille')).toBe(true);
    expect(wirktWieStichworte('• Raum klein\n• Kaffee\n• Stille')).toBe(true);
    expect(wirktWieStichworte('* Raum klein\n* Kaffee\n* Stille')).toBe(true);
  });
  it('leere Zeilen dazwischen zählen nicht mit', () => {
    expect(wirktWieStichworte('- eins\n\n- zwei\n\n- drei')).toBe(true);
  });
  it('kurze Zeilen ohne Satzzeichen am Ende (weniger als vier Wörter), auch ohne Aufzählungszeichen: ja', () => {
    expect(wirktWieStichworte('Raum klein\nKaffee kalt\nSehr leise')).toBe(true);
  });
  it('Fließtext: nein', () => {
    expect(wirktWieStichworte('Das Gespräch begann um drei Uhr in einem kleinen Café. Die Stimmung war entspannt und wir sprachen lange über den Alltag der Befragten.')).toBe(false);
  });
  it('drei lange Zeilen mit vollständigen Sätzen: nein', () => {
    expect(wirktWieStichworte('Das Gespräch begann um drei Uhr im Café.\nDie Stimmung war von Anfang an recht entspannt.\nDanach sprachen wir noch lange über den Weg zur Arbeit.')).toBe(false);
  });
  it('zwei Zeilen reichen nicht (weniger als drei nicht leere Zeilen): nein', () => {
    expect(wirktWieStichworte('- eins\n- zwei')).toBe(false);
  });
  it('leerer Text: nein', () => {
    expect(wirktWieStichworte('')).toBe(false);
  });
});
