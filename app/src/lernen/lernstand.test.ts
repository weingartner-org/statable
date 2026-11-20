import { describe, it, expect } from 'vitest';
import { P } from '../i18n/laufzeit';
import type { Einheit } from './lernplan';
import {
  leererStand, abschnitte, abschnittsFarben, einheitsFarben, besuche, machFertig, richtigBeantwortet, fragenStand, zaehleFarben,
  ersterOffener, ringStuecke, leseStand, schrittGeoeffnet, hatErgebnis, neuFertigeBeispiele, type Stand
} from './lernstand';

const einheit = (id: string, extra: Partial<Einheit> = {}): Einheit => ({
  id, alltag: P('a', 'a'), fach: P('f', 'f'), bereich: 'daten', hilfe: ['x'], beispiele: [{ id: 'b', schritt: 1 }], probieren: ['effekt'], fragen: ['q1', 'q2'], ...extra
});
const E = einheit('e1');   // Abschnitte: Erklärung, Beispiel, Regler, Fragen
const S = { erkl: 'erklaerung', bsp: 'beispiel:b:1', reg: 'regler:effekt' };

describe('Abschnitte einer Einheit', () => {
  it('nur was vorhanden ist, in fester Reihenfolge', () => {
    expect(abschnitte(E).map(a => a.schluessel)).toEqual(['erklaerung', 'beispiel:b:1', 'regler:effekt', 'fragen']);
    expect(abschnitte(einheit('e2', { beispiele: [], probieren: [], fragen: [] })).map(a => a.art)).toEqual(['erklaerung']);
    expect(abschnitte(einheit('e3', { hilfe: [], fragen: [] })).map(a => a.art)).toEqual(['beispiel', 'regler']);
  });
});

describe('Farbregel der Abschnitte', () => {
  it('am Anfang alles grau', () => {
    expect(abschnittsFarben(leererStand(), E)).toEqual(['grau', 'grau', 'grau', 'grau']);
  });
  it('der aktuelle, nicht durchgemachte Abschnitt bleibt grau', () => {
    expect(abschnittsFarben(besuche(leererStand(), E, 0), E)).toEqual(['grau', 'grau', 'grau', 'grau']);
  });
  it('durchgemacht ist grün', () => {
    const st = machFertig(besuche(leererStand(), E, 0), E, S.erkl);
    expect(abschnittsFarben(st, E)[0]).toBe('gruen');
  });
  it('übersprungen (spätere erreicht, nicht durchgemacht) ist rot, auch bei einem Sprung', () => {
    const st = besuche(leererStand(), E, 2);
    expect(abschnittsFarben(st, E)).toEqual(['rot', 'rot', 'grau', 'grau']);
  });
  it('weiter ohne Abschließen macht den Abschnitt beim Weitergehen rot', () => {
    let st = besuche(leererStand(), E, 0);
    expect(abschnittsFarben(st, E)[0]).toBe('grau');
    st = besuche(st, E, 1);
    expect(abschnittsFarben(st, E)[0]).toBe('rot');
  });
  it('Nachholen macht Rot grün', () => {
    let st = besuche(leererStand(), E, 3);
    expect(abschnittsFarben(st, E)[1]).toBe('rot');
    st = machFertig(st, E, S.bsp);
    expect(abschnittsFarben(st, E)).toEqual(['rot', 'gruen', 'rot', 'grau']);
  });
  it('zurückspringen senkt den erreichten Abschnitt nicht', () => {
    let st = besuche(leererStand(), E, 2);
    st = besuche(st, E, 0);
    expect(st.erreicht['e1']).toBe(2);
    expect(abschnittsFarben(st, E)[0]).toBe('rot');
  });
  it('Fragen sind grün erst, wenn jede Frage einmal richtig war', () => {
    let st = leererStand();
    st = richtigBeantwortet(st, 'q1');
    expect(fragenStand(st, E)).toEqual({ richtig: 1, gesamt: 2 });
    expect(abschnittsFarben(st, E)[3]).toBe('grau');
    st = richtigBeantwortet(richtigBeantwortet(st, 'q2'), 'q2');
    expect(fragenStand(st, E)).toEqual({ richtig: 2, gesamt: 2 });
    expect(abschnittsFarben(st, E)[3]).toBe('gruen');
    expect(st.richtig).toEqual(['q1', 'q2']);
  });
  it('Fragen einer anderen Einheit zählen nicht', () => {
    expect(fragenStand(richtigBeantwortet(leererStand(), 'fremd'), E).richtig).toBe(0);
  });
  it('Zählung für die Textzeile', () => {
    const st = machFertig(besuche(leererStand(), E, 2), E, S.reg);
    expect(zaehleFarben(abschnittsFarben(st, E))).toEqual({ gruen: 1, rot: 2, grau: 1 });
  });
  it('erster offener Abschnitt', () => {
    expect(ersterOffener(leererStand(), E)).toBe(0);
    expect(ersterOffener(machFertig(leererStand(), E, S.erkl), E)).toBe(1);
  });
});

describe('Farbregel der Einheiten im Pfad', () => {
  const A = einheit('a', { beispiele: [], probieren: [], fragen: [] });
  const B = einheit('b', { beispiele: [], probieren: [], fragen: [] });
  const C = einheit('c', { beispiele: [], probieren: [], fragen: [] });
  const liste = [A, B, C];
  it('nichts besucht: alles grau', () => {
    expect(einheitsFarben(leererStand(), liste)).toEqual(['grau', 'grau', 'grau']);
  });
  it('alle Abschnitte grün: grün', () => {
    const st = machFertig(besuche(leererStand(), A, 0), A, 'erklaerung');
    expect(einheitsFarben(st, liste)).toEqual(['gruen', 'grau', 'grau']);
  });
  it('begonnen, nichts übersprungen: grau', () => {
    expect(einheitsFarben(besuche(leererStand(), A, 0), liste)).toEqual(['grau', 'grau', 'grau']);
  });
  it('eine spätere Einheit besucht: nie geöffnete davor bleiben grau', () => {
    expect(einheitsFarben(besuche(leererStand(), C, 0), liste)).toEqual(['grau', 'grau', 'grau']);
  });
  it('übersprungene Abschnitte machen die Einheit rot, Nachholen grün', () => {
    const Z = einheit('z', { beispiele: [], probieren: ['effekt'], fragen: [] });
    let st = besuche(leererStand(), Z, 1);
    expect(einheitsFarben(st, [Z, A])).toEqual(['rot', 'grau']);
    st = machFertig(machFertig(st, Z, 'erklaerung'), Z, 'regler:effekt');
    expect(einheitsFarben(st, [Z, A])).toEqual(['gruen', 'grau']);
  });
  it('eine Einheit ohne Abschnitte wird nie grün', () => {
    const leer = einheit('l', { hilfe: [], beispiele: [], probieren: [], fragen: [] });
    expect(einheitsFarben(leererStand(), [leer])).toEqual(['grau']);
  });
});

describe('Beispiel: geöffnet und danach ein Ergebnis', () => {
  const g = { zeit: 1000, projekt: 'p1', art: 'gruppen' };
  const blatt = (art: string, zeit: number, extra = {}) => ({ art, zeit, ergebnis: {}, ...extra });
  it('Ergebnis der richtigen Art nach dem Öffnen im selben Projekt', () => {
    expect(hatErgebnis([blatt('gruppen', 1500)], g, 'p1')).toBe(true);
  });
  it('vorher angelegt, andere Art, anderes Projekt, gesperrt oder ohne Ergebnis zählt nicht', () => {
    expect(hatErgebnis([blatt('gruppen', 900)], g, 'p1')).toBe(false);
    expect(hatErgebnis([blatt('zusammenhang', 1500)], g, 'p1')).toBe(false);
    expect(hatErgebnis([blatt('gruppen', 1500)], g, 'p2')).toBe(false);
    expect(hatErgebnis([blatt('gruppen', 1500, { gesperrt: true })], g, 'p1')).toBe(false);
    expect(hatErgebnis([{ art: 'gruppen', zeit: 1500, ergebnis: null }], g, 'p1')).toBe(false);
  });
  it('neu fertige Beispiele werden gefunden, fertige nicht noch einmal', () => {
    let st: Stand = schrittGeoeffnet(leererStand(), 'e1', S.bsp, g);
    expect(neuFertigeBeispiele(st, [E], [], 'p1')).toEqual([]);
    expect(neuFertigeBeispiele(st, [E], [blatt('gruppen', 2000)], 'p1').map(x => x.schluessel)).toEqual([S.bsp]);
    st = machFertig(st, E, S.bsp);
    expect(neuFertigeBeispiele(st, [E], [blatt('gruppen', 2000)], 'p1')).toEqual([]);
  });
});

describe('Lesen des gespeicherten Stands', () => {
  it('leer und kaputt gelten als Anfang', () => {
    expect(leseStand(null)).toEqual(leererStand());
    expect(leseStand('{kaputt')).toEqual(leererStand());
    expect(leseStand('42')).toEqual(leererStand());
  });
  it('einen gespeicherten Stand lesen, Unpassendes verwerfen', () => {
    let st = machFertig(besuche(leererStand(), E, 1), E, S.erkl);
    st = richtigBeantwortet(schrittGeoeffnet(st, 'e1', S.bsp, { zeit: 5, projekt: 'p', art: 'gruppen' }), 'q1');
    expect(leseStand(JSON.stringify(st))).toEqual(st);
    expect(leseStand(JSON.stringify({ fertig: { a: 'kein-array' }, erreicht: { a: -1, b: 'x', c: 2 }, richtig: [1] })).erreicht).toEqual({ c: 2 });
  });
});

describe('Fortschrittsring', () => {
  it('ein Stück je Abschnitt, am Anfang leer', () => {
    expect(ringStuecke(leererStand(), E)).toEqual([0, 1, 2, 3].map(() => ({ farbe: 'grau', anteil: 0 })));
  });
  it('Fragen füllen ihr Stück anteilig, Übersprungenes bleibt leer und rot', () => {
    let st = besuche(leererStand(), E, 3);
    st = machFertig(st, E, S.erkl);
    st = richtigBeantwortet(st, 'q1');
    expect(ringStuecke(st, E)).toEqual([{ farbe: 'gruen', anteil: 1 }, { farbe: 'rot', anteil: 0 }, { farbe: 'rot', anteil: 0 }, { farbe: 'grau', anteil: 0.5 }]);
  });
  it('voll erst, wenn alles gemacht ist', () => {
    let st = machFertig(machFertig(machFertig(leererStand(), E, S.erkl), E, S.bsp), E, S.reg);
    st = richtigBeantwortet(st, 'q1');
    expect(ringStuecke(st, E).every(s => s.anteil === 1)).toBe(false);
    st = richtigBeantwortet(st, 'q2');
    expect(ringStuecke(st, E).every(s => s.anteil === 1)).toBe(true);
  });
});
