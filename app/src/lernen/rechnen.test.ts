import { describe, it, expect } from 'vitest';
import { leseZahl, pruefe, leererRechenStand, tippe, pruefeSchritt, zeigeWeg, aufgabeFertig, ersterOffenerSchritt, richtigeSchritte, mitRechenweg } from './rechnen';
import { abschnitte, abschnittsFarben, machFertig, besuche, leererStand } from './lernstand';
import type { Einheit } from './lernplan';
import { P } from '../i18n/laufzeit';

describe('Zahl lesen: Komma und Punkt', () => {
  it('Komma und Punkt sind Dezimalzeichen', () => {
    expect(leseZahl('2,5')).toBe(2.5); expect(leseZahl('2.5')).toBe(2.5); expect(leseZahl('  12 ')).toBe(12); expect(leseZahl('.5')).toBe(0.5); expect(leseZahl('5.')).toBe(5);
  });
  it('Vorzeichen, auch das Minuszeichen − und mit Leerzeichen', () => {
    expect(leseZahl('-4')).toBe(-4); expect(leseZahl('−4')).toBe(-4); expect(leseZahl('+4')).toBe(4); expect(leseZahl('- 4,5')).toBe(-4.5);
  });
  it('beides gemischt: das letzte Zeichen ist das Dezimalzeichen', () => {
    expect(leseZahl('1.234,5')).toBe(1234.5); expect(leseZahl('1,234.5')).toBe(1234.5); expect(leseZahl('1 234,5')).toBe(1234.5);
  });
  it('Unsinn ist keine Zahl', () => {
    for (const x of ['', ' ', 'abc', '2,5,5', '1.2.3', '--3', '3-', '1,2,3,4', ',', '.', '-', '1e3', '12 Stunden', '1.23,4,5', '12.34,567']) expect(leseZahl(x), x).toBeNull();
  });
});

describe('Prüfen mit Toleranz und Fehlwegen', () => {
  const s = { soll: 11.3333, toleranz: 0.005, fehler: [{ wert: 8.5 }] };
  it('auf die gezeigten Stellen gerundet gilt als richtig, ein Hundertstel daneben nicht', () => {
    expect(pruefe('11,33', s).art).toBe('richtig'); expect(pruefe('11.33', s).art).toBe('richtig'); expect(pruefe('11,3333', s).art).toBe('richtig');
    expect(pruefe('11,34', s).art).toBe('falsch'); expect(pruefe('11,3', s).art).toBe('falsch');
  });
  it('leer, keine Zahl, bekannter Fehlweg', () => {
    expect(pruefe('', s)).toEqual({ art: 'leer' }); expect(pruefe('zwölf', s)).toEqual({ art: 'keineZahl' });
    expect(pruefe('8,5', s)).toEqual({ art: 'falsch', wert: 8.5, fehler: 0 }); expect(pruefe('7', s)).toEqual({ art: 'falsch', wert: 7 });
  });
  it('trifft ein Fehlweg zugleich das Soll, gilt das Soll', () => {
    expect(pruefe('5', { soll: 5, toleranz: 0.01, fehler: [{ wert: 5 }] }).art).toBe('richtig');
  });
});

describe('Stand einer Aufgabe', () => {
  const s0 = { soll: 6, toleranz: 0.01 }, s1 = { soll: -4, toleranz: 0.01 };
  it('richtig nur durch eine richtige Eingabe, der Rechenweg allein zählt nicht', () => {
    let st = leererRechenStand(2);
    st = zeigeWeg(st, 0);
    expect(st.schritte[0]!.wegGesehen).toBe(true); expect(aufgabeFertig(st)).toBe(false); expect(richtigeSchritte(st)).toBe(0);
    st = tippe(st, 0, '6'); st = pruefeSchritt(st, 0, s0).stand;
    expect(st.schritte[0]).toMatchObject({ richtig: true, mitWeg: true, versuche: 1 });
    expect(ersterOffenerSchritt(st)).toBe(1); expect(aufgabeFertig(st)).toBe(false);
    st = tippe(st, 1, '−4'); st = pruefeSchritt(st, 1, s1).stand;
    expect(aufgabeFertig(st)).toBe(true); expect(mitRechenweg(st)).toBe(true); expect(ersterOffenerSchritt(st)).toBe(-1);
  });
  it('leer und Nicht-Zahl zählen nicht als Versuch, falsch schon; richtig bleibt richtig', () => {
    let st = leererRechenStand(1);
    st = pruefeSchritt(st, 0, s0).stand; expect(st.schritte[0]!.versuche).toBe(0);
    st = tippe(st, 0, 'x'); st = pruefeSchritt(st, 0, s0).stand; expect(st.schritte[0]!.versuche).toBe(0);
    st = tippe(st, 0, '5'); st = pruefeSchritt(st, 0, s0).stand; expect(st.schritte[0]).toMatchObject({ versuche: 1, richtig: false });
    st = tippe(st, 0, '6'); st = pruefeSchritt(st, 0, s0).stand; expect(st.schritte[0]).toMatchObject({ versuche: 2, richtig: true, mitWeg: false });
    st = tippe(st, 0, '7'); st = pruefeSchritt(st, 0, s0).stand; expect(st.schritte[0]!.richtig).toBe(true);
  });
  it('eine Aufgabe ohne Schritte ist nie fertig', () => { expect(aufgabeFertig(leererRechenStand(0))).toBe(false); });
});

describe('Abschnitt „Selbst rechnen“ im Lernstand', () => {
  const e: Einheit = { id: 'x', alltag: P('a', 'a'), fach: P('f', 'f'), bereich: 'daten', hilfe: ['h'], rechnen: ['r1', 'r2'], beispiele: [{ id: 'b', schritt: 0 }], probieren: ['effekt'], fragen: ['q'] };
  it('folgt auf die Erklärung, vor Beispiel, Regler und Fragen', () => {
    expect(abschnitte(e).map(a => a.schluessel)).toEqual(['erklaerung', 'rechnen:r1', 'rechnen:r2', 'beispiel:b:0', 'regler:effekt', 'fragen']);
    expect(abschnitte(e).filter(a => a.art === 'rechnen').map(a => a.ziel)).toEqual(['r1', 'r2']);
  });
  it('Einheiten ohne Rechenaufgabe behalten ihre Abschnitte', () => {
    expect(abschnitte({ ...e, rechnen: undefined }).map(a => a.art)).toEqual(['erklaerung', 'beispiel', 'regler', 'fragen']);
  });
  it('durchgemacht wie jeder Abschnitt: grün, übersprungen rot', () => {
    let st = besuche(leererStand(), e, 2);
    expect(abschnittsFarben(st, e).slice(0, 3)).toEqual(['rot', 'rot', 'grau']);
    st = machFertig(st, e, 'rechnen:r1');
    expect(abschnittsFarben(st, e)[1]).toBe('gruen');
  });
});
