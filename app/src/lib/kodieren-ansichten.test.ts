/**
 * Prüftests Stufe 6c (Paket 6c1), Sollwerte aus docs/erheben/FACHBLATT-STUFE-6C.md, Abschnitte 1 und 2 (Opus).
 * Prüfprojekt: docs/erheben/stufe6c/testprojekt-6c.json (erfunden), R-Sollwerte: scripts/kodieren-6c-erwartet.R.
 * Der Bauer ändert diese Datei nicht. Vor dem Bau rot: `lib/kodieren-ansichten.ts` fehlt noch.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { aehnlicheStellen, codeAbstaende, dokumentUebersicht, fallKategorieMatrix, setzeZusammenfassung } from './kodieren-ansichten';
import { ordneZu } from './kodieren';
import { mds, type MdsErgebnis } from './mds';
import { pruefeQualProjekt, type QualProjekt } from './qualprojekt';

const PFAD = fileURLToPath(new URL('../../../docs/erheben/stufe6c/testprojekt-6c.json', import.meta.url));
const q: QualProjekt = pruefeQualProjekt(JSON.parse(readFileSync(PFAD, 'utf8')));
const nah = (a: number, b: number, tol: number) => expect(Math.abs(a - b), `${a} statt ${b}`).toBeLessThan(tol);

/* ---- 1.1 / 2.1 Dokument-Übersicht ---- */

describe('2.1 Dokument-Übersicht', () => {
  const ids = (z: { codes: { id: string }[] }) => z.codes.map(c => c.id);

  it('d1, alle: zwei Absätze, s10 zählt in beiden (Absatzgrenze)', () => {
    const r = dokumentUebersicht(q, 'd1', { kodierende: 'alle' });
    expect(r).toHaveLength(2);
    expect([r[0]!.absatz, r[0]!.start, r[0]!.ende]).toEqual([1, 0, 58]);
    expect(ids(r[0]!)).toEqual(['c1', 'c3']);
    expect(r[0]!.stellen).toBe(2);
    expect([r[1]!.absatz, r[1]!.start, r[1]!.ende]).toEqual([2, 59, 129]);
    expect(ids(r[1]!)).toEqual(['c1', 'c2', 'c3', 'c4']);
    expect(r[1]!.stellen).toBe(3);
  });

  it('Codes tragen den Namen', () => {
    const r = dokumentUebersicht(q, 'd1', { kodierende: 'alle' });
    expect(r[1]!.codes).toEqual([{ id: 'c1', name: 'Lernen' }, { id: 'c2', name: 'Angst' }, { id: 'c3', name: 'Weg' }, { id: 'c4', name: 'Familie' }]);
  });

  it('d3, nur p1: Code c3, zwei Stellen', () => {
    const r = dokumentUebersicht(q, 'd3', { kodierende: ['p1'] });
    expect(r).toHaveLength(1);
    expect([r[0]!.absatz, r[0]!.start, r[0]!.ende]).toEqual([1, 0, 62]);
    expect(ids(r[0]!)).toEqual(['c3']);
    expect(r[0]!.stellen).toBe(2);
  });

  it('d3, nur p2: Code c1, eine Stelle', () => {
    const r = dokumentUebersicht(q, 'd3', { kodierende: ['p2'] });
    expect(r).toHaveLength(1);
    expect(ids(r[0]!)).toEqual(['c1']);
    expect(r[0]!.stellen).toBe(1);
  });

  it('d4, nur p1: Zeile ist da, ohne Codes (Absätze ohne Code bleiben)', () => {
    const r = dokumentUebersicht(q, 'd4', { kodierende: ['p1'] });
    expect(r).toHaveLength(1);
    expect(r[0]).toEqual({ absatz: 1, start: 0, ende: 41, codes: [], stellen: 0 });
  });

  it('unbekanntes Dokument: leere Liste', () => {
    expect(dokumentUebersicht(q, 'dx', { kodierende: 'alle' })).toEqual([]);
  });

  it('verändert das Projekt nicht', () => {
    const vorher = JSON.stringify(q);
    dokumentUebersicht(q, 'd1', { kodierende: 'alle' });
    expect(JSON.stringify(q)).toBe(vorher);
  });
});

/* ---- 1.2 / 2.2 Fall-Kategorie-Matrix ---- */

describe('2.2 Fall-Kategorie-Matrix', () => {
  const CODES = ['c1', 'c5', 'c3', 'c4', 'c6'];
  const segs = (m: ReturnType<typeof fallKategorieMatrix>, z: number, s: number) => m.zellen[z]![s]!.belege.map(b => b.segment);

  it('Zeilen: Fälle in Projektreihenfolge (auch ohne Dokument), dann Dokument ohne Fall', () => {
    const m = fallKategorieMatrix(q, { codes: CODES, kodierende: 'alle', mitUntercodes: true });
    expect(m.zeilen).toEqual([{ id: 'f1', name: 'Anna' }, { id: 'f2', name: 'Ben' }, { id: 'f3', name: 'Cem' }, { id: 'dok:d4', name: 'Notiz ohne Fall' }]);
  });

  it('Spalten in der Reihenfolge von o.codes, nicht umsortiert', () => {
    const m = fallKategorieMatrix(q, { codes: CODES, kodierende: 'alle', mitUntercodes: true });
    expect(m.spalten).toEqual([{ code: 'c1', name: 'Lernen' }, { code: 'c5', name: 'Gefühle' }, { code: 'c3', name: 'Weg' }, { code: 'c4', name: 'Familie' }, { code: 'c6', name: 'Geld' }]);
    const u = fallKategorieMatrix(q, { codes: ['c6', 'c1'], kodierende: 'alle', mitUntercodes: true });
    expect(u.spalten.map(s => s.code)).toEqual(['c6', 'c1']);
    expect(u.zellen[0]).toHaveLength(2);
  });

  it('Zellen alle Personen, mit Untercodes (Tabelle aus 2.2), Reihenfolge Dokument, start, ende', () => {
    const m = fallKategorieMatrix(q, { codes: CODES, kodierende: 'alle', mitUntercodes: true });
    expect(m.zellen).toHaveLength(4);
    for (const z of m.zellen) expect(z).toHaveLength(5);
    // Anna
    expect(segs(m, 0, 0)).toEqual(['s1', 's3', 's8']);
    expect(segs(m, 0, 1)).toEqual(['s2']);
    expect(segs(m, 0, 2)).toEqual(['s10', 's7', 's8']);
    expect(segs(m, 0, 3)).toEqual(['s3']);
    expect(segs(m, 0, 4)).toEqual([]);
    // Ben
    expect(segs(m, 1, 0)).toEqual(['s4']);
    expect(segs(m, 1, 1)).toEqual(['s6']);
    expect(segs(m, 1, 2)).toEqual([]);
    expect(segs(m, 1, 3)).toEqual(['s5']);
    expect(segs(m, 1, 4)).toEqual([]);
    // Cem: nichts
    for (let s = 0; s < 5; s++) expect(segs(m, 2, s)).toEqual([]);
    // dok:d4
    expect(segs(m, 3, 0)).toEqual([]);
    expect(segs(m, 3, 1)).toEqual([]);
    expect(segs(m, 3, 2)).toEqual([]);
    expect(segs(m, 3, 3)).toEqual(['s9']);
    expect(segs(m, 3, 4)).toEqual([]);
  });

  it('Beleg: dokument, start, ende, text', () => {
    const m = fallKategorieMatrix(q, { codes: CODES, kodierende: 'alle', mitUntercodes: true });
    expect(m.zellen[0]![2]!.belege[0]).toEqual({ segment: 's10', dokument: 'd1', start: 33, ende: 74, text: 'Der Bus ist morgens laut.\nVor der Prüfung' });
    expect(m.zellen[0]![0]!.belege[0]).toEqual({ segment: 's1', dokument: 'd1', start: 0, ende: 32, text: 'Ich lerne abends am Küchentisch.' });
    expect(m.zellen[3]![3]!.belege[0]).toEqual({ segment: 's9', dokument: 'd4', start: 0, ende: 41, text: 'Meine Eltern fragen oft nach der Prüfung.' });
  });

  it('nur p1: Anna/c1 = s1, s3; dok:d4/c4 leer; sonst gleich', () => {
    const m = fallKategorieMatrix(q, { codes: CODES, kodierende: ['p1'], mitUntercodes: true });
    expect(segs(m, 0, 0)).toEqual(['s1', 's3']);
    expect(segs(m, 3, 3)).toEqual([]);
    expect(segs(m, 0, 1)).toEqual(['s2']);
    expect(segs(m, 0, 2)).toEqual(['s10', 's7', 's8']);
    expect(segs(m, 0, 3)).toEqual(['s3']);
    expect(segs(m, 1, 0)).toEqual(['s4']);
    expect(segs(m, 1, 1)).toEqual(['s6']);
    expect(segs(m, 1, 3)).toEqual(['s5']);
  });

  it('ohne Untercodes: Anna/c5 und Ben/c5 leer', () => {
    const m = fallKategorieMatrix(q, { codes: CODES, kodierende: 'alle', mitUntercodes: false });
    expect(segs(m, 0, 1)).toEqual([]);
    expect(segs(m, 1, 1)).toEqual([]);
    expect(segs(m, 0, 0)).toEqual(['s1', 's3', 's8']);
  });

  it('Untercode direkt als Spalte: Anna/c2 = s2, auch ohne Untercodes', () => {
    const m = fallKategorieMatrix(q, { codes: ['c2'], kodierende: 'alle', mitUntercodes: false });
    expect(segs(m, 0, 0)).toEqual(['s2']);
    expect(segs(m, 1, 0)).toEqual(['s6']);
  });

  it('Falle: Segment mit Ober- und Untercode erscheint einmal', () => {
    const q2: QualProjekt = { ...q, kodierungen: [...q.kodierungen, { id: 'kx', segment: 's2', code: 'c5', kodierende: 'p1', erstellt: 99 }] };
    const m = fallKategorieMatrix(q2, { codes: ['c5'], kodierende: 'alle', mitUntercodes: true });
    expect(segs(m, 0, 0)).toEqual(['s2']);
  });

  it('Falle: doppelte Kodierung (zwei Personen, gleicher Code) zählt ein Segment einmal', () => {
    const q2: QualProjekt = { ...q, kodierungen: [...q.kodierungen, { id: 'ky', segment: 's1', code: 'c1', kodierende: 'p2', erstellt: 99 }] };
    const m = fallKategorieMatrix(q2, { codes: ['c1'], kodierende: 'alle', mitUntercodes: true });
    expect(segs(m, 0, 0)).toEqual(['s1', 's3', 's8']);
  });

  it('ohne Zusammenfassung fehlt das Feld in jeder Zelle', () => {
    const m = fallKategorieMatrix(q, { codes: CODES, kodierende: 'alle', mitUntercodes: true });
    for (const z of m.zellen) for (const c of z) expect('zusammenfassung' in c).toBe(false);
  });

  it('Zusammenfassung erscheint in genau ihrer Zelle (Zeile und Code gleich), auch ohne Belege', () => {
    let p = setzeZusammenfassung(q, 'f1', 'c1', 'Lernt abends.');
    p = setzeZusammenfassung(p, 'f3', 'c6', 'Nichts da.');
    const m = fallKategorieMatrix(p, { codes: CODES, kodierende: 'alle', mitUntercodes: true });
    expect(m.zellen[0]![0]!.zusammenfassung).toBe('Lernt abends.');
    expect(m.zellen[2]![4]!.zusammenfassung).toBe('Nichts da.');
    expect(m.zellen[2]![4]!.belege).toEqual([]);
    expect('zusammenfassung' in m.zellen[1]![0]!).toBe(false);
    expect('zusammenfassung' in m.zellen[0]![1]!).toBe(false);
  });

  it('Zuordnen eines Dokuments: Zeile dok:d4 entfällt, die dok:-Zusammenfassung bleibt gespeichert', () => {
    const p = setzeZusammenfassung(q, 'dok:d4', 'c4', 'Eltern fragen nach.');
    const z = ordneZu(p, 'd4', 'f2');
    expect(z.zusammenfassungen).toEqual(p.zusammenfassungen);
    const m = fallKategorieMatrix(z, { codes: CODES, kodierende: 'alle', mitUntercodes: true });
    expect(m.zeilen.map(r => r.id)).toEqual(['f1', 'f2', 'f3']);
    expect(segs(m, 1, 3)).toEqual(['s5', 's9']);
    expect('zusammenfassung' in m.zellen[1]![3]!).toBe(false);
  });
});

describe('2.2 setzeZusammenfassung', () => {
  it('kürzt an den Rändern; Eintrag hat zeile, code, text, geaendert; Zelle zeigt den Text', () => {
    const vor = Date.now();
    const p = setzeZusammenfassung(q, 'f1', 'c1', '  Lernt abends, auch im Bus.  ');
    expect(p).not.toBe(q);
    expect(p.zusammenfassungen).toHaveLength(1);
    const e = p.zusammenfassungen![0]!;
    expect([e.zeile, e.code, e.text]).toEqual(['f1', 'c1', 'Lernt abends, auch im Bus.']);
    expect(e.geaendert).toBeGreaterThanOrEqual(vor);
    expect(e.geaendert).toBeLessThanOrEqual(Date.now());
    const m = fallKategorieMatrix(p, { codes: ['c1'], kodierende: 'alle', mitUntercodes: true });
    expect(m.zellen[0]![0]!.zusammenfassung).toBe('Lernt abends, auch im Bus.');
  });

  it('leer (auch nur Leerzeichen) löscht den Eintrag, Feld fehlt', () => {
    const p = setzeZusammenfassung(q, 'f1', 'c1', 'Lernt abends, auch im Bus.');
    for (const leer of ['', '   ']) {
      const r = setzeZusammenfassung(p, 'f1', 'c1', leer);
      expect((r.zusammenfassungen ?? []).some(z => z.zeile === 'f1' && z.code === 'c1')).toBe(false);
      const m = fallKategorieMatrix(r, { codes: ['c1'], kodierende: 'alle', mitUntercodes: true });
      expect('zusammenfassung' in m.zellen[0]![0]!).toBe(false);
    }
  });

  it('ersetzt den Eintrag derselben Zelle statt einen zweiten anzuhängen; andere Zellen bleiben', () => {
    let p = setzeZusammenfassung(q, 'f1', 'c1', 'eins');
    p = setzeZusammenfassung(p, 'f2', 'c1', 'zwei');
    p = setzeZusammenfassung(p, 'f1', 'c1', 'drei');
    expect(p.zusammenfassungen).toHaveLength(2);
    expect(p.zusammenfassungen!.find(z => z.zeile === 'f1' && z.code === 'c1')!.text).toBe('drei');
    expect(p.zusammenfassungen!.find(z => z.zeile === 'f2' && z.code === 'c1')!.text).toBe('zwei');
  });

  it('kodierende wird mitgespeichert', () => {
    const p = setzeZusammenfassung(q, 'f1', 'c1', 'x', 'p2');
    expect(p.zusammenfassungen![0]!.kodierende).toBe('p2');
  });

  it('verändert das übergebene Projekt nicht', () => {
    const vorher = JSON.stringify(q);
    setzeZusammenfassung(q, 'f1', 'c1', 'x');
    expect(JSON.stringify(q)).toBe(vorher);
  });

  it('unbekannter Fall, unbekannter Code, dok: eines Dokuments mit Fall: dasselbe Objekt', () => {
    expect(setzeZusammenfassung(q, 'f9', 'c1', 'x')).toBe(q);
    expect(setzeZusammenfassung(q, 'f1', 'c9', 'x')).toBe(q);
    expect(setzeZusammenfassung(q, 'dok:d1', 'c1', 'x')).toBe(q);
    expect(setzeZusammenfassung(q, 'dok:dx', 'c1', 'x')).toBe(q);
  });

  it('dok:d4 (Dokument ohne Fall) ist gültig', () => {
    const p = setzeZusammenfassung(q, 'dok:d4', 'c4', 'Eltern fragen nach.');
    expect(p).not.toBe(q);
    const m = fallKategorieMatrix(p, { codes: ['c4'], kodierende: 'alle', mitUntercodes: true });
    expect(m.zeilen[3]!.id).toBe('dok:d4');
    expect(m.zellen[3]![0]!.zusammenfassung).toBe('Eltern fragen nach.');
  });
});

/* ---- 1.3 / 2.3 Code-Landkarte ---- */

describe('2.3 Code-Landkarte (R: scripts/kodieren-6c-erwartet.R)', () => {
  const ALLE = ['c1', 'c5', 'c2', 'c3', 'c4', 'c6'];

  it('alle Personen: Codes ohne Beleg fallen heraus, Jaccard-Abstände', () => {
    const r = codeAbstaende(q, { codes: ALLE, kodierende: 'alle' });
    expect(r.codes).toEqual(['c1', 'c2', 'c3', 'c4']);
    expect(r.ohne).toEqual(['c5', 'c6']);
    const E = [
      [0, 1 / 3, 1 / 3, 0.5],
      [1 / 3, 0, 2 / 3, 1 / 3],
      [1 / 3, 2 / 3, 0, 0.75],
      [0.5, 1 / 3, 0.75, 0],
    ];
    expect(r.D).toHaveLength(4);
    for (let i = 0; i < 4; i++) {
      expect(r.D[i]).toHaveLength(4);
      for (let j = 0; j < 4; j++) nah(r.D[i]![j]!, E[i]![j]!, 1e-12);
    }
  });

  it('Untercodes zählen nicht mit: c5 (Gefühle) hat keine eigene Kodierung und steht in ohne', () => {
    const r = codeAbstaende(q, { codes: ['c5'], kodierende: 'alle' });
    expect(r.codes).toEqual([]);
    expect(r.ohne).toEqual(['c5']);
    expect(r.D).toEqual([]);
  });

  it('mds(D, 2): Eigenwerte, GOF und Abstände der Punkte (Toleranz 1e-5)', () => {
    const r = codeAbstaende(q, { codes: ALLE, kodierende: 'alle' });
    const m = mds(r.D, 2);
    expect('koord' in m).toBe(true);
    const e = m as MdsErgebnis;
    const W = [0.339058, 0.059328, 0, -0.000816];
    expect(e.eigenwerte).toHaveLength(4);
    W.forEach((w, i) => nah(e.eigenwerte[i]!, w, 1e-5));
    nah(e.gof1, 0.997956, 1e-5);
    nah(e.gof2, 1, 1e-5);
    const abst = (i: number, j: number) => Math.hypot(e.koord[i]![0]! - e.koord[j]![0]!, e.koord[i]![1]! - e.koord[j]![1]!);
    nah(abst(0, 1), 0.335266, 1e-5); // c1-c2
    nah(abst(0, 2), 0.335021, 1e-5); // c1-c3
    nah(abst(0, 3), 0.500402, 1e-5); // c1-c4
    nah(abst(1, 2), 0.666671, 1e-5); // c2-c3
    nah(abst(1, 3), 0.333711, 1e-5); // c2-c4
    nah(abst(2, 3), 0.750122, 1e-5); // c3-c4
  });

  it('nur p2: c1 und c4, D = [[0, 1], [1, 0]]; weniger als 3 Codes: kein Bild', () => {
    const r = codeAbstaende(q, { codes: ALLE, kodierende: ['p2'] });
    expect(r.codes).toEqual(['c1', 'c4']);
    expect(r.ohne).toEqual(['c5', 'c2', 'c3', 'c6']);
    expect(r.D).toEqual([[0, 1], [1, 0]]);
    expect(mds(r.D, 2)).toEqual({ fehler: 'zu-wenig-punkte' });
  });

  it('D ist symmetrisch, Diagonale 0, Werte in [0, 1]', () => {
    const r = codeAbstaende(q, { codes: ALLE, kodierende: 'alle' });
    r.D.forEach((z, i) => z.forEach((v, j) => {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
      expect(v).toBe(r.D[j]![i]);
      if (i === j) expect(v).toBe(0);
    }));
  });

  it('Reihenfolge von o.codes bleibt erhalten', () => {
    const r = codeAbstaende(q, { codes: ['c4', 'c1', 'c3'], kodierende: 'alle' });
    expect(r.codes).toEqual(['c4', 'c1', 'c3']);
    nah(r.D[0]![1]!, 0.5, 1e-12);   // c4-c1
    nah(r.D[0]![2]!, 0.75, 1e-12);  // c4-c3
    nah(r.D[1]![2]!, 1 / 3, 1e-12); // c1-c3
  });

  it('Person ohne Kodierung: alles in ohne, leere Matrix', () => {
    const r = codeAbstaende(q, { codes: ALLE, kodierende: ['p9'] });
    expect(r).toMatchObject({ codes: [], D: [], ohne: ALLE });   // A2: dazu `einheiten` (Zahl der Einheiten für Simple Matching)
  });
});

/* ---- 1.4 / 2.4 Ähnliche Stellen ---- */

describe('2.4 Ähnliche Stellen (R, Toleranz 1e-6)', () => {
  const O = { anzahl: 10, sprache: 'de' as const };
  const kurz = (r: { dokument: string; start: number; ende: number; satz: number }[]) => r.map(x => [x.dokument, x.start, x.ende, x.satz]);
  const pruefe = (r: ReturnType<typeof aehnlicheStellen>, soll: [string, number, number, number, number][]) => {
    expect(kurz(r)).toEqual(soll.map(s => s.slice(0, 4)));
    r.forEach((x, i) => nah(x.wert, soll[i]![4], 1e-6));
  };

  it('Ausgang s4 (d2 [0, 35)): Werte und Reihenfolge, Gleichstand d1 vor d3', () => {
    const r = aehnlicheStellen(q, { dokument: 'd2', start: 0, ende: 35 }, O);
    pruefe(r, [
      ['d1', 0, 32, 1, 0.082859],
      ['d3', 36, 62, 2, 0.082859],
      ['d1', 91, 129, 4, 0.070913],
      ['d1', 59, 90, 3, 0.049802],
      ['d1', 33, 58, 2, 0.015578],
      ['d2', 61, 96, 3, 0.013924],
      ['d4', 0, 41, 1, 0.012355],
      ['d3', 0, 35, 1, 0.011019],
    ]);
  });

  it('Ausgang s4: d2 Satz 2 (kein gemeinsames Wort) und die Ausgangsstelle selbst fehlen', () => {
    const r = aehnlicheStellen(q, { dokument: 'd2', start: 0, ende: 35 }, O);
    expect(r.some(x => x.dokument === 'd2' && x.start === 36)).toBe(false);
    expect(r.some(x => x.dokument === 'd2' && x.start === 0)).toBe(false);
    expect(r).toHaveLength(8);
  });

  it('Ausgang s2 (d1 [59, 90))', () => {
    const r = aehnlicheStellen(q, { dokument: 'd1', start: 59, ende: 90 }, O);
    pruefe(r, [
      ['d2', 61, 96, 3, 0.431919],
      ['d4', 0, 41, 1, 0.095133],
      ['d2', 0, 35, 1, 0.049802],
      ['d1', 0, 32, 1, 0.035425],
      ['d3', 36, 62, 2, 0.035425],
      ['d1', 91, 129, 4, 0.030318],
      ['d1', 33, 58, 2, 0.018299],
      ['d3', 0, 35, 1, 0.012943],
    ]);
  });

  it('Ausgang s2 mit anzahl 3: nur die ersten drei', () => {
    const r = aehnlicheStellen(q, { dokument: 'd1', start: 59, ende: 90 }, { anzahl: 3, sprache: 'de' });
    pruefe(r, [
      ['d2', 61, 96, 3, 0.431919],
      ['d4', 0, 41, 1, 0.095133],
      ['d2', 0, 35, 1, 0.049802],
    ]);
  });

  it('anzahl 0: leere Liste', () => {
    expect(aehnlicheStellen(q, { dokument: 'd1', start: 59, ende: 90 }, { anzahl: 0, sprache: 'de' })).toEqual([]);
  });

  it('leere Ausgangsstelle (start === ende): leere Liste', () => {
    expect(aehnlicheStellen(q, { dokument: 'd1', start: 59, ende: 59 }, O)).toEqual([]);
  });

  it('unbekanntes Dokument: leere Liste', () => {
    expect(aehnlicheStellen(q, { dokument: 'dx', start: 0, ende: 10 }, O)).toEqual([]);
  });

  it('Sätze, die die Ausgangsstelle überlappen, fallen weg (s10 über Absatzgrenze); keine Werte <= 0; absteigend sortiert', () => {
    const r = aehnlicheStellen(q, { dokument: 'd1', start: 33, ende: 74 }, O);
    expect(r.some(x => x.dokument === 'd1' && x.start === 33)).toBe(false);
    expect(r.some(x => x.dokument === 'd1' && x.start === 59)).toBe(false);
    expect(r.length).toBeGreaterThan(0);
    for (const x of r) expect(x.wert).toBeGreaterThan(0);
    for (let i = 1; i < r.length; i++) expect(r[i - 1]!.wert).toBeGreaterThanOrEqual(r[i]!.wert - 1e-12);
  });

  it('verändert das Projekt nicht', () => {
    const vorher = JSON.stringify(q);
    aehnlicheStellen(q, { dokument: 'd2', start: 0, ende: 35 }, O);
    expect(JSON.stringify(q)).toBe(vorher);
  });
});
