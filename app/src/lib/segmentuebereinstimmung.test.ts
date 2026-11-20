import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { pruefeQualProjekt, type QualProjekt } from './qualprojekt';
import { segmentUebereinstimmung, ueberlappung, type Einheit } from './segmentuebereinstimmung';

/* Stufe 5, Paket 5B, Segmentebene (docs/erheben/FACHBLATT-STUFE-5.md, "Übereinstimmung auf Segmentebene" und Schnittstellen).
 * Sollwerte: scripts/qualauswertung-erwartet.R, Projekte testdaten/qualauswertung/*.json. Absichtlich ROT, bis lib/segmentuebereinstimmung.ts gebaut ist.
 * Reihenfolge (Opus-Entscheid): `liste` und die Einheiten innerhalb einer Abweichung nach Dokument-Reihenfolge, start, ende, Person a vor b, Code-Reihenfolge wie in `codes`; wird genau verglichen. */

const ordner = new URL('./testdaten/', import.meta.url);
const lies = (p: string) => JSON.parse(readFileSync(new URL(p, ordner), 'utf8'));
const projekte: Record<string, QualProjekt> = {
  segmente: pruefeQualProjekt(lies('qualauswertung/segmente.json')),
  matrix: pruefeQualProjekt(lies('qualauswertung/matrix.json')),
  doppelt: pruefeQualProjekt(lies('qualauswertung/doppelt.json')),
};
const nah = (a: number | null | undefined, b: number | null, tol = 1e-9) => {
  if (b === null) { expect(a ?? null).toBeNull(); return; }
  expect(a, 'Wert fehlt').toBeTypeOf('number');
  expect(Math.abs(a! - b) / Math.max(1, Math.abs(b))).toBeLessThan(tol);
};
interface EEinheit { person: 'a' | 'b'; segment: string; code: string; dokument: string; start: number; ende: number; passt: boolean }
interface EFall {
  name: string; projekt: string; a: string; b: string; codes: string[]; dokumente?: string[] | null; schwelle: number;
  erwartet: {
    einheiten: number; uebereinstimmend: number; nurA: number; nurB: number; prozent: number | null; kappaBP: number | null; k: number;
    jeCode: { code: string; einheiten: number; uebereinstimmend: number; nurA: number; nurB: number; prozent: number | null }[];
    liste: EEinheit[]; abweichungen: { id: string; art: 'grenzen' | 'anderer-code' | 'nur-eine'; dokument: string; einheiten: EEinheit[] }[];
  };
}
const E = lies('qualauswertung-erwartet.json') as { ueberlappung: { s: { start: number; ende: number }; t: { start: number; ende: number }; erwartet: number }[]; segment: EFall[] };
const optionen = (f: EFall) => ({ a: f.a, b: f.b, codes: f.codes, schwelle: f.schwelle, ...(f.dokumente ? { dokumente: f.dokumente } : {}) });
const schluessel = (e: Einheit | EEinheit) => `${e.dokument}|${String(e.start).padStart(6, '0')}|${String(e.ende).padStart(6, '0')}|${e.person}|${e.code}|${e.segment}`;
const sortiert = <T extends Einheit | EEinheit>(l: T[]) => [...l].sort((x, y) => schluessel(x).localeCompare(schluessel(y)));
const nurDaten = (e: Einheit | EEinheit) => ({ person: e.person, segment: e.segment, code: e.code, dokument: e.dokument, start: e.start, ende: e.ende, passt: e.passt });
const fall = (teil: string) => E.segment.find(f => f.name.startsWith(teil))!;

describe('ueberlappung: gemeinsame Zeichen geteilt durch Zeichen der Vereinigung', () => {
  for (const p of E.ueberlappung) {
    it(`[${p.s.start}, ${p.s.ende}) gegen [${p.t.start}, ${p.t.ende}) = ${p.erwartet}`, () => {
      nah(ueberlappung(p.s, p.t), p.erwartet);
    });
  }
  it('symmetrisch: ueberlappung(s, t) = ueberlappung(t, s) für alle Paare aus einer Reihe von Bereichen', () => {
    const b = [[0, 10], [5, 15], [10, 20], [0, 100], [20, 40], [0, 90], [55, 60], [30, 31], [99, 100]].map(([start, ende]) => ({ start: start!, ende: ende! }));
    for (const s of b) for (const t of b) expect(ueberlappung(s, t), `${s.start}-${s.ende} / ${t.start}-${t.ende}`).toBe(ueberlappung(t, s));
  });
  it('Werte liegen zwischen 0 und 1; gleicher Bereich = 1; sich nur berührende Bereiche = 0 (Ende exklusiv)', () => {
    expect(ueberlappung({ start: 3, ende: 9 }, { start: 3, ende: 9 })).toBe(1);
    expect(ueberlappung({ start: 0, ende: 10 }, { start: 10, ende: 20 })).toBe(0);
    expect(ueberlappung({ start: 0, ende: 10 }, { start: 30, ende: 40 })).toBe(0);
  });
  it('Schwelle genau getroffen: 90 / 100 ist exakt 0,9 (kein Rundungsfehler) und 45 / 50 auch', () => {
    expect(ueberlappung({ start: 0, ende: 90 }, { start: 0, ende: 100 })).toBe(0.9);
    expect(ueberlappung({ start: 10, ende: 60 }, { start: 10, ende: 55 })).toBe(0.9);
    expect(ueberlappung({ start: 0, ende: 899 }, { start: 0, ende: 1000 })).toBeLessThan(0.9);
  });
});

describe('Segmentebene gegen R (Einheit = Segment x Code beider Personen)', () => {
  for (const f of E.segment) {
    it(f.name, () => {
      const q = projekte[f.projekt]!, vorher = JSON.stringify(q);
      const r = segmentUebereinstimmung(q, optionen(f)), e = f.erwartet;
      expect(JSON.stringify(q), 'Eingabe darf sich nicht ändern').toBe(vorher);
      expect(r.einheiten, 'Einheiten').toBe(e.einheiten);
      expect(r.uebereinstimmend, 'übereinstimmend').toBe(e.uebereinstimmend);
      expect(r.nurA, 'nur A').toBe(e.nurA); expect(r.nurB, 'nur B').toBe(e.nurB);
      expect(r.uebereinstimmend + r.nurA + r.nurB).toBe(r.einheiten);
      expect(r.k).toBe(e.k);
      nah(r.prozent, e.prozent); nah(r.kappaBP, e.kappaBP);
      expect(r.jeCode.map(x => x.code), 'je Code in der Reihenfolge der Auswahl').toEqual(f.codes);
      e.jeCode.forEach((x, i) => { const y = r.jeCode[i]!; expect(y, x.code).toMatchObject({ code: x.code, einheiten: x.einheiten, uebereinstimmend: x.uebereinstimmend, nurA: x.nurA, nurB: x.nurB }); nah(y.prozent, x.prozent); });
      // Liste aller Einheiten, Reihenfolge nach Opus: Dokument-Reihenfolge, start, ende, Person a vor b, Code-Reihenfolge wie in `codes`
      expect(r.liste.map(nurDaten)).toEqual(e.liste.map(nurDaten));
      // Abweichungen: Gruppen, Reihenfolge (Dokument, Start) und Einheiten nach Fachblatt
      expect(r.abweichungen.map(x => x.id), 'Ids und Reihenfolge der Abweichungen').toEqual(e.abweichungen.map(x => x.id));
      e.abweichungen.forEach((x, i) => {
        const y = r.abweichungen[i]!;
        expect(y.art, `Art von ${x.id}`).toBe(x.art); expect(y.dokument).toBe(x.dokument);
        expect(y.einheiten.map(nurDaten), `Einheiten von ${x.id}`).toEqual(x.einheiten.map(nurDaten));
        expect(y.einheiten.every(u => u.passt === false)).toBe(true);
      });
      // Jede Einheit ohne Übereinstimmung steht in genau einer Abweichung
      const inAbw = r.abweichungen.flatMap(x => x.einheiten);
      expect(inAbw.length).toBe(r.nurA + r.nurB);
      expect(sortiert(inAbw).map(schluessel)).toEqual(sortiert(r.liste.filter(u => !u.passt)).map(schluessel));
    });
  }
});

describe('Grenzfälle einzeln (Lesbarkeit; Zahlen stehen oben gegen R)', () => {
  const q = projekte.segmente!, alle = ['c1', 'c2', 'c3', 'c4'];
  const lauf = (schwelle: number, dokumente?: string[], codes = alle) => segmentUebereinstimmung(q, { a: 'p-a', b: 'p-b', codes, schwelle, ...(dokumente ? { dokumente } : {}) });
  it('Schwelle genau getroffen (Überlappung 0,9): bei Schwelle 0,9 übereinstimmend, bei 1,0 nicht; 0,899 bleibt bei 0,9 unter der Schwelle', () => {
    const e90 = lauf(0.9, ['d-schwelle']); expect(e90.uebereinstimmend).toBe(2); expect(e90.abweichungen).toEqual([]);
    const e100 = lauf(1.0, ['d-schwelle']); expect(e100.uebereinstimmend).toBe(0); expect(e100.abweichungen.map(x => x.art)).toEqual(['grenzen']);
    const knapp = lauf(0.9, ['d-knapp']); expect(knapp.uebereinstimmend).toBe(0); expect(knapp.abweichungen.map(x => x.id)).toEqual(['d-knapp:0:1000']);
    expect(lauf(0.6, ['d-knapp']).uebereinstimmend).toBe(2);
  });
  it('Ein Segment von A, zwei von B: bei 0,9 passt A mit dem ersten (45/50), das zweite Segment von B bleibt allein ("nur-eine")', () => {
    const r = lauf(0.9, ['d-eins-zwei']);
    expect(r.einheiten).toBe(3); expect(r.uebereinstimmend).toBe(2); expect(r.nurA).toBe(0); expect(r.nurB).toBe(1);
    expect(r.abweichungen.map(x => [x.id, x.art])).toEqual([['d-eins-zwei:55:60', 'nur-eine']]);
    // bei 1,0 gar nichts: eine Gruppe über das Zwischenglied A, alle drei Einheiten, Art "grenzen"
    const s = lauf(1.0, ['d-eins-zwei']);
    expect(s.uebereinstimmend).toBe(0); expect(s.abweichungen.map(x => [x.id, x.art, x.einheiten.length])).toEqual([['d-eins-zwei:10:60', 'grenzen', 3]]);
  });
  it('Verschachtelt: das große Paar passt, das innere Paar (anderer Code) bildet eine Gruppe "anderer-code"', () => {
    const r = lauf(0.9, ['d-nest']);
    expect(r.uebereinstimmend).toBe(2);
    expect(r.abweichungen.map(x => [x.id, x.art])).toEqual([['d-nest:20:40', 'anderer-code']]);
    expect(r.abweichungen[0]!.einheiten.map(u => [u.person, u.code])).toEqual([['a', 'c2'], ['b', 'c1']]);
  });
  it('Segment über das ganze Dokument gegen zwei Hälften: keine Übereinstimmung bei 0,6, eine Gruppe', () => {
    const r = lauf(0.6, ['d-ganz']); expect(r.uebereinstimmend).toBe(0); expect(r.abweichungen.map(x => [x.id, x.art])).toEqual([['d-ganz:0:60', 'grenzen']]);
  });
  it('Gruppen über Zwischenglieder: A1 - B - A2 berühren sich nur über B und bilden EINE Gruppe; danach zwei einsame Stellen', () => {
    const r = lauf(0.9, ['d-kette']);
    expect(r.abweichungen.map(x => [x.id, x.art, x.einheiten.length])).toEqual([['d-kette:0:50', 'anderer-code', 3], ['d-kette:60:70', 'nur-eine', 1], ['d-kette:100:110', 'nur-eine', 1]]);
  });
  it('Gleicher Code in der Gruppe hat Vorrang: A c1, B c2 und B c1 ergeben "grenzen", nicht "anderer-code"', () => {
    expect(lauf(0.9, ['d-gemischt']).abweichungen.map(x => [x.id, x.art])).toEqual([['d-gemischt:0:50', 'grenzen']]);
  });
  it('Emoji und Umlaute vor den Segmenten: Positionen sind Codepoints und bleiben unverändert in den Einheiten (A-Segment 49 bis 73)', () => {
    const r = lauf(0.9, ['d-emoji']);
    const a = r.liste.find(u => u.person === 'a' && u.code === 'c1')!;
    expect([a.start, a.ende]).toEqual([49, 73]);
    expect(r.uebereinstimmend).toBe(2);   // nur das c2-Paar (gleiche Stelle) passt; 16/24 für c1 nicht
    expect(lauf(0.6, ['d-emoji']).uebereinstimmend).toBe(4);   // bei 0,6 passt auch das c1-Paar (16/24 = 0,667)
  });
  it('\\r\\n im Text: A läuft über den Zeilenumbruch, Überlappung 10/29 -> keine Übereinstimmung, Gruppe "grenzen"', () => {
    const r = lauf(0.6, ['d-crlf']); expect(r.uebereinstimmend).toBe(0); expect(r.abweichungen.map(x => x.art)).toEqual(['grenzen']);
  });
  it('Eine Person ohne Segmente (C): alle Einheiten von A sind "nur A", Prozent 0, jede Abweichung ist "nur-eine"', () => {
    const r = segmentUebereinstimmung(q, { a: 'p-a', b: 'p-c', codes: alle, schwelle: 0.9 });
    expect(r.uebereinstimmend).toBe(0); expect(r.nurB).toBe(0); expect(r.nurA).toBe(r.einheiten); nah(r.prozent, 0);
    expect(r.abweichungen.every(x => x.art === 'nur-eine')).toBe(true);
  });
  it('Ein Code nur bei einer Person (c4): nur A, keine Übereinstimmung, Prozent 0 für diesen Code', () => {
    const c = lauf(0.9).jeCode.find(x => x.code === 'c4')!;
    expect(c).toMatchObject({ einheiten: 1, uebereinstimmend: 0, nurA: 1, nurB: 0 }); nah(c.prozent, 0);
  });
  it('Dokument ohne Segmente und Auswahl ohne Einheiten: prozent null, kappaBP null, keine Abweichungen', () => {
    const r = lauf(0.9, ['d-leer']); expect(r.einheiten).toBe(0); expect(r.prozent).toBeNull(); expect(r.kappaBP).toBeNull(); expect(r.abweichungen).toEqual([]);
  });
  it('kappaBP: (p - 1/k) / (1 - 1/k) mit k = Zahl der gewählten Codes; null bei k = 1', () => {
    const r = lauf(0.9, ['d-eins-zwei'], ['c1', 'c2']);   // p = 2/3, k = 2 -> 1/3
    nah(r.prozent, 2 / 3); nah(r.kappaBP, 1 / 3); expect(r.k).toBe(2);
    expect(lauf(0.9, ['d-eins-zwei'], ['c1']).kappaBP).toBeNull();
  });
  it('Doppelte Kodierung derselben Person (gleiches Segment, gleicher Code) zählt einmal; ein von beiden kodiertes Segment ist eine Einheit je Person', () => {
    const r = segmentUebereinstimmung(projekte.doppelt!, { a: 'p-a', b: 'p-b', codes: ['c1', 'c2'], schwelle: 1.0 });
    expect(r.einheiten).toBe(4); expect(r.uebereinstimmend).toBe(4);
    expect(r.liste.filter(u => u.person === 'a' && u.code === 'c1').length).toBe(1);
    expect(r.liste.filter(u => u.code === 'c2').map(u => u.segment)).toEqual([r.liste.find(u => u.code === 'c2')!.segment, r.liste.find(u => u.code === 'c2')!.segment]);
  });
});

describe('Symmetrie und Wahl der Personen', () => {
  it('A gegen B und B gegen A: gleiche Zahlen, gleiche Abweichungsgruppen (Personen a/b vertauscht)', () => {
    const q = projekte.segmente!, alle = ['c1', 'c2', 'c3', 'c4'];
    const ab = segmentUebereinstimmung(q, { a: 'p-a', b: 'p-b', codes: alle, schwelle: 0.9 }), ba = segmentUebereinstimmung(q, { a: 'p-b', b: 'p-a', codes: alle, schwelle: 0.9 });
    expect(ba.einheiten).toBe(ab.einheiten); expect(ba.uebereinstimmend).toBe(ab.uebereinstimmend); expect(ba.nurA).toBe(ab.nurB); expect(ba.nurB).toBe(ab.nurA);
    nah(ba.prozent, ab.prozent); nah(ba.kappaBP, ab.kappaBP);
    expect(ba.abweichungen.map(x => [x.id, x.art])).toEqual(ab.abweichungen.map(x => [x.id, x.art]));
  });
  it('Schwellen 0,5 bis 1: mit steigender Schwelle sinkt die Zahl der Übereinstimmungen nie', () => {
    const q = projekte.segmente!; let vorher = Infinity;
    for (const s of [0.5, 0.55, 0.6, 0.7, 0.8, 0.9, 0.95, 1.0]) {
      const n = segmentUebereinstimmung(q, { a: 'p-a', b: 'p-b', codes: ['c1', 'c2', 'c3', 'c4'], schwelle: s }).uebereinstimmend;
      expect(n).toBeLessThanOrEqual(vorher); vorher = n;
    }
  });
});
