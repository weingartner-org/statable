import { describe, it, expect } from 'vitest';
import { ART, FASSUNG, MAX_DATEIEN, alsText, baueErgebnis, dateinameErgebnis, leseErgebnis, uebersicht } from './uebungsergebnis';

const FRAGEN = ['f-a', 'f-b', 'f-c'];
const tag = new Date(2026, 10, 14);
const datei = (antworten: Record<string, boolean>, name?: string, fragen = FRAGEN) => alsText(baueErgebnis('Mein Pfad', fragen, antworten, tag, name));

describe('Ergebnisdatei des Übungsblatts (V3 Teil 2)', () => {
  it('baut die Datei mit Art, Fassung, Datum und nur den Fragen des Blatts', () => {
    const e = baueErgebnis('Mein Pfad', FRAGEN, { 'f-a': true, 'f-c': false, 'fremd': true }, tag, '  Kim  ');
    expect(e).toEqual({ art: ART, fassung: FASSUNG, pfad: 'Mein Pfad', fragen: FRAGEN, antworten: { 'f-a': true, 'f-c': false }, name: 'Kim', datum: '2026-11-14' });
  });
  it('lässt einen leeren Namen weg und entfernt Steuerzeichen', () => {
    expect(baueErgebnis('P', FRAGEN, {}, tag, '   ').name).toBeUndefined();
    expect(baueErgebnis('P', FRAGEN, {}, tag, 'A\u0000B‮C').name).toBe('A B C');
    expect(baueErgebnis('P', FRAGEN, {}, tag, 'x'.repeat(200)).name).toHaveLength(80);
  });
  it('liest die eigene Datei unverändert zurück', () => {
    const t = datei({ 'f-a': true, 'f-b': false }, 'Kim');
    expect(alsText(leseErgebnis(t)!)).toBe(t);
  });
  it('lehnt fremde und kaputte Dateien ab', () => {
    const gut = JSON.parse(datei({ 'f-a': true }));
    const mit = (x: object) => JSON.stringify({ ...gut, ...x });
    expect(leseErgebnis('kein json')).toBeNull();
    expect(leseErgebnis('[]')).toBeNull();
    expect(leseErgebnis(mit({ art: 'etwas' }))).toBeNull();
    expect(leseErgebnis(mit({ fassung: 2 }))).toBeNull();
    expect(leseErgebnis(mit({ fragen: [] }))).toBeNull();
    expect(leseErgebnis(mit({ fragen: ['F A'] }))).toBeNull();
    expect(leseErgebnis(mit({ fragen: ['f-a', 'f-a'] }))).toBeNull();
    expect(leseErgebnis(mit({ fragen: Array.from({ length: 81 }, (_, i) => `f-${i}`) }))).toBeNull();
    expect(leseErgebnis(mit({ antworten: { 'f-x': true } }))).toBeNull();
    expect(leseErgebnis(mit({ antworten: { 'f-a': 'ja' } }))).toBeNull();
    expect(leseErgebnis(mit({ antworten: [] }))).toBeNull();
    expect(leseErgebnis(mit({ datum: '14.11.2026' }))).toBeNull();
    expect(leseErgebnis('x'.repeat(70000))).toBeNull();
  });
  it('bereinigt Pfadname und Name aus fremder Datei', () => {
    const gut = JSON.parse(datei({}));
    const e = leseErgebnis(JSON.stringify({ ...gut, pfad: '<b>X</b>', name: 'Ann\u0007e', mehr: 'weg' }))!;
    expect(e.pfad).toBe('b X /b');
    expect(e.name).toBe('Ann e');
    expect(Object.keys(e)).not.toContain('mehr');
  });
  it('Dateiname ohne verbotene Zeichen, Name nur wenn angegeben', () => {
    expect(dateinameErgebnis(baueErgebnis('A/B: C?', FRAGEN, {}, tag), 'Übungsergebnis')).toBe('Übungsergebnis - AB C.json');
    expect(dateinameErgebnis(baueErgebnis('P', FRAGEN, {}, tag, 'Kim "K"'), 'Practice result')).toBe('Practice result - P - Kim K.json');
  });
});

describe('Übersicht für Lehrende', () => {
  it('zählt je Frage richtig und beantwortet', () => {
    const u = uebersicht(FRAGEN, [
      datei({ 'f-a': true, 'f-b': false, 'f-c': true }, 'A'),
      datei({ 'f-a': true, 'f-b': true }, 'B'),
      datei({ 'f-a': false }, 'C')
    ]);
    expect(u.fragen).toEqual([
      { id: 'f-a', richtig: 2, beantwortet: 3 },
      { id: 'f-b', richtig: 1, beantwortet: 2 },
      { id: 'f-c', richtig: 1, beantwortet: 1 }
    ]);
    expect(u).toMatchObject({ gezaehlt: 3, unlesbar: 0, fremd: 0, doppelt: 0 });
  });
  it('zählt doppelte Dateien einmal, fremde und kaputte gar nicht', () => {
    const a = datei({ 'f-a': true }, 'A');
    const u = uebersicht(FRAGEN, [a, a, 'Unsinn', datei({ 'g-1': true }, 'X', ['g-1'])]);
    expect(u).toMatchObject({ gezaehlt: 1, doppelt: 1, unlesbar: 1, fremd: 1 });
    expect(u.fragen[0]).toEqual({ id: 'f-a', richtig: 1, beantwortet: 1 });
  });
  it('zählt Dateien eines geänderten Blatts mit, aber nur die gemeinsamen Fragen', () => {
    const u = uebersicht(['f-b', 'f-d'], [datei({ 'f-a': true, 'f-b': true })]);
    expect(u.gezaehlt).toBe(1);
    expect(u.fragen).toEqual([{ id: 'f-b', richtig: 1, beantwortet: 1 }, { id: 'f-d', richtig: 0, beantwortet: 0 }]);
  });
  it('enthält keine Namen und keine Gesamtwerte je Person', () => {
    const u = uebersicht(FRAGEN, [datei({ 'f-a': true }, 'Geheimname')]);
    expect(JSON.stringify(u)).not.toContain('Geheimname');
  });
  it('nimmt höchstens MAX_DATEIEN Dateien', () => {
    const viele = Array.from({ length: MAX_DATEIEN + 3 }, (_, i) => datei({ 'f-a': i % 2 === 0 }, `P${i}`));
    const u = uebersicht(FRAGEN, viele);
    expect(u.gezaehlt).toBe(MAX_DATEIEN);
    expect(u.unlesbar).toBe(3);
  });
});
