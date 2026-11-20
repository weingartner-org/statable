/**
 * Prüftests Stufe 6b, Sollwerte aus docs/erheben/FACHBLATT-STUFE-6B.md (Opus). Der Bauer ändert diese Datei nicht.
 * Abschnitte 1.2 bis 1.9 der Logik (`lib/kodieren.ts`). Vor dem Bau rot: das Modul fehlt noch.
 */
import { describe, expect, it } from 'vitest';
import {
  ABKUERZUNGEN, baumReihenfolge, belegeGefiltert, codeNameFrei, codePfad, entferneCode, entferneKodierung, entferneMemo,
  kodierbareCodes, legeCodeAn, legeMemoAn, liesWert, saetze, schnellleiste, stellenAusSaetzen, verschiebeCode, type BelegFilter,
} from './kodieren';
import { neuesQualProjekt, type Code, type Memo, type QualProjekt, type Variable } from './qualprojekt';

/* ---- 1.2 Satzgrenzen mit Abkürzungen ---- */

describe('1.2 Satzgrenzen mit Abkürzungen', () => {
  const kurz = (e: { start: number; ende: number; text: string }[]) => e.map(x => [x.start, x.ende, x.text]);

  it('Liste: de enthält „z. B.“, en enthält „e.g.“, de enthält nicht „usw.“', () => {
    expect(ABKUERZUNGEN.de).toContain('z. B.');
    expect(ABKUERZUNGEN.en).toContain('e.g.');
    expect(ABKUERZUNGEN.de).not.toContain('usw.');
  });

  it('Wir haben z. B. Zeit. Dr. Meier kommt. (de)', () => {
    expect(kurz(saetze('Wir haben z. B. Zeit. Dr. Meier kommt.', 'de'))).toEqual([
      [0, 21, 'Wir haben z. B. Zeit.'],
      [22, 38, 'Dr. Meier kommt.'],
    ]);
  });

  it('See e.g. the plan. Mr. Smith agreed. (en)', () => {
    expect(kurz(saetze('See e.g. the plan. Mr. Smith agreed.', 'en'))).toEqual([
      [0, 18, 'See e.g. the plan.'],
      [19, 36, 'Mr. Smith agreed.'],
    ]);
  });

  it('Das war ca.\\nDanach Ruhe. (de): Zeilenumbruch trennt immer', () => {
    expect(kurz(saetze('Das war ca.\nDanach Ruhe.', 'de'))).toEqual([
      [0, 11, 'Das war ca.'],
      [12, 24, 'Danach Ruhe.'],
    ]);
  });
});

/* ---- 1.3 Stellen aus gewählten Sätzen ---- */

describe('1.3 Stellen aus gewählten Sätzen', () => {
  const V = 'Eins. Zwei. Drei. Vier. Fünf.';

  it.each([
    ['{2, 3, 5}', [2, 3, 5], [{ start: 6, ende: 17 }, { start: 24, ende: 29 }]],
    ['{4, 2}', [4, 2], [{ start: 6, ende: 11 }, { start: 18, ende: 23 }]],
    ['{1, 2, 3, 4, 5}', [1, 2, 3, 4, 5], [{ start: 0, ende: 29 }]],
    ['{}', [] as number[], []],
    ['{2, 9}', [2, 9], [{ start: 6, ende: 11 }]],
  ])('nrn %s', (_label, nrn, erwartet) => {
    expect(stellenAusSaetzen(saetze(V, 'de'), new Set(nrn))).toEqual(erwartet);
  });
});

/* ---- 1.4 Code-Pfad und kodierbare Codes ---- */

describe('1.4 Code-Pfad und kodierbare Codes', () => {
  const codes: Code[] = [
    { id: 'bel', name: 'Belastung', kodierbar: true, reihenfolge: 0 },
    { id: 'hoch', name: 'hoch', elternId: 'bel', kodierbar: true, reihenfolge: 0 },
    { id: 'nk', name: 'Oberthema', kodierbar: false, reihenfolge: 2 },
    { id: 'x', name: 'Waise', elternId: 'gibtsnicht', kodierbar: true, reihenfolge: 1 },
  ];

  it('codePfad: Vorfahren mit „: “ verbunden', () => {
    expect(codePfad(codes, 'hoch')).toBe('Belastung: hoch');
    expect(codePfad(codes, 'bel')).toBe('Belastung');
  });

  it('unbekannte elternId: gilt als Wurzel, codePfad liefert nur den Namen', () => {
    expect(codePfad(codes, 'x')).toBe('Waise');
  });

  it('baumReihenfolge: Ebenen ab 1, auch der Code mit unbekannter elternId', () => {
    const r = baumReihenfolge(codes);
    expect(r.find(e => e.code.id === 'bel')?.ebene).toBe(1);
    expect(r.find(e => e.code.id === 'hoch')?.ebene).toBe(2);
    expect(r.find(e => e.code.id === 'x')?.ebene).toBe(1);
  });

  it('kodierbareCodes lässt kodierbar:false weg', () => {
    expect(kodierbareCodes(codes).map(c => c.id).sort()).toEqual(['bel', 'hoch', 'x']);
  });
});

/* ---- 1.5 Schnellleiste ---- */

describe('1.5 Schnellleiste', () => {
  const codes: Code[] = [
    { id: 'a', name: 'A', kodierbar: true, reihenfolge: 0 },
    { id: 'b', name: 'B', kodierbar: true, reihenfolge: 1 },
    { id: 'c', name: 'C', kodierbar: true, reihenfolge: 2 },
    { id: 'd', name: 'D', kodierbar: true, reihenfolge: 3 },
    { id: 'e', name: 'E', kodierbar: false, reihenfolge: 4 },
  ];

  it('fest, dann zuletzt (neueste zuerst), dann Rest; nicht kodierbar und unbekannt fallen weg', () => {
    expect(schnellleiste(codes, ['c'], ['b', 'e', 'c', 'a', 'x'])).toEqual(['c', 'b', 'a', 'd']);
  });

  it('höchstens 9 Plätze bei 12 kodierbaren Codes', () => {
    const viele: Code[] = Array.from({ length: 12 }, (_, i) => ({ id: `k${i + 1}`, name: `Code ${i + 1}`, kodierbar: true, reihenfolge: i }));
    const r = schnellleiste(viele, [], []);
    expect(r).toHaveLength(9);
    expect(new Set(r).size).toBe(9);
  });
});

/* ---- 1.6 Codebaum ---- */

/** Baum A(a) { B(b) { C(c) } }, D(d); Dokument d1; Segmente s1, s2; Kodierungen k1 (b, s1), k2 (c, s1), k3 (b, s2). */
function baumProjekt(): QualProjekt {
  const q = neuesQualProjekt('Baum');
  q.kodierende = [{ id: 'p', name: 'Person' }];
  q.dokumente = [{ id: 'd1', name: 'Text', art: 'text', text: 'abcdefghij', erstellt: 0, geaendert: 0 }];
  q.codes = [
    { id: 'a', name: 'A', kodierbar: true, reihenfolge: 0 },
    { id: 'b', name: 'B', elternId: 'a', kodierbar: true, reihenfolge: 0 },
    { id: 'c', name: 'C', elternId: 'b', kodierbar: true, reihenfolge: 0 },
    { id: 'd', name: 'D', kodierbar: true, reihenfolge: 1 },
  ];
  q.segmente = [
    { id: 's1', dokument: 'd1', start: 0, ende: 3, erstellt: 0 },
    { id: 's2', dokument: 'd1', start: 4, ende: 6, erstellt: 0 },
  ];
  q.kodierungen = [
    { id: 'k1', segment: 's1', code: 'b', kodierende: 'p', erstellt: 0 },
    { id: 'k2', segment: 's1', code: 'c', kodierende: 'p', erstellt: 0 },
    { id: 'k3', segment: 's2', code: 'b', kodierende: 'p', erstellt: 0 },
  ];
  return q;
}

describe('1.6 Codebaum', () => {
  it('entferneCode(q, "b"): C rückt zu A, nur k2 bleibt, s1 bleibt, s2 fällt weg', () => {
    const q = baumProjekt();
    const q2 = entferneCode(q, 'b');
    expect(q2.codes.find(c => c.id === 'c')?.elternId).toBe('a');
    expect(q2.codes.find(c => c.id === 'b')).toBeUndefined();
    expect(q2.kodierungen.map(k => k.id)).toEqual(['k2']);
    expect(q2.segmente.map(s => s.id)).toEqual(['s1']);
  });

  it('entferneCode verändert das Eingabeobjekt nicht', () => {
    const q = baumProjekt();
    const vorher = structuredClone(q);
    entferneCode(q, 'b');
    expect(q).toEqual(vorher);
  });

  it('verschiebeCode(q, "a", { elternId: "c" }) lehnt ab: gleiche codes wie vorher', () => {
    const q = baumProjekt();
    const q3 = verschiebeCode(q, 'a', { elternId: 'c' });
    expect(q3.codes).toEqual(q.codes);
  });

  it('legeCodeAn mit leerem Namen wirft Fehler „name-leer“', () => {
    expect(() => legeCodeAn(baumProjekt(), '')).toThrow(/name-leer/);
  });

  it('legeCodeAn mit vergebenem Namen (Groß/klein egal) wirft Fehler „name-vergeben“', () => {
    expect(() => legeCodeAn(baumProjekt(), 'a')).toThrow(/name-vergeben/);
  });

  it('legeCodeAn legt kodierbaren Code ans Ende der Geschwister', () => {
    const r = legeCodeAn(baumProjekt(), 'Neu');
    const neu = r.q.codes.find(c => c.id === r.id);
    expect(neu).toMatchObject({ name: 'Neu', kodierbar: true, reihenfolge: 2 });
  });

  it('codeNameFrei: ohne Groß/klein und getrimmt, nur unter denselben Eltern', () => {
    const q = baumProjekt();
    expect(codeNameFrei(q, ' A ')).toBe(false);          // A steht auf oberster Ebene
    expect(codeNameFrei(q, 'A', 'b')).toBe(true);        // unter B gibt es kein A
    expect(codeNameFrei(q, 'c', 'b')).toBe(false);       // C steht unter B
    expect(codeNameFrei(q, 'C', 'b', 'c')).toBe(true);   // ausser sich selbst
    expect(codeNameFrei(q, 'Neu')).toBe(true);
  });
});

/* ---- 1.7 Memos ---- */

describe('1.7 Memos', () => {
  /** Segment s1 mit Kodierung k1 und Memo m1 (Bezug Segment s1). */
  function memoProjekt(): QualProjekt {
    const q = neuesQualProjekt('Memo');
    q.kodierende = [{ id: 'p', name: 'Person' }];
    q.codes = [{ id: 'x', name: 'X', kodierbar: true, reihenfolge: 0 }];
    q.dokumente = [{ id: 'd1', name: 'Text', art: 'text', text: 'abcdefghij', erstellt: 0, geaendert: 0 }];
    q.segmente = [{ id: 's1', dokument: 'd1', start: 0, ende: 3, erstellt: 0 }];
    q.kodierungen = [{ id: 'k1', segment: 's1', code: 'x', kodierende: 'p', erstellt: 0 }];
    q.memos = [{ id: 'm1', text: 'Notiz', erstellt: 0, bezug: [{ art: 'segment', id: 's1' }] }];
    return q;
  }

  it('entferneKodierung lässt s1 stehen, entferneMemo danach nimmt s1 weg', () => {
    const q = memoProjekt();
    const q1 = entferneKodierung(q, 'k1');
    expect(q1.segmente.map(s => s.id)).toEqual(['s1']);
    const q2 = entferneMemo(q1, 'm1');
    expect(q2.segmente).toHaveLength(0);
  });

  it('legeMemoAn mit leerem Text legt kein Memo an', () => {
    const q = memoProjekt();
    const r = legeMemoAn(q, { art: 'projekt' }, '');
    expect(r.q.memos).toHaveLength(q.memos.length);
  });

  it('legeMemoAn mit Text legt ein Memo an', () => {
    const q = memoProjekt();
    const r = legeMemoAn(q, { art: 'projekt' }, 'Hallo');
    expect(r.q.memos).toHaveLength(q.memos.length + 1);
  });
});

/* ---- 1.8 Werte von Fallvariablen ---- */

type Erwartet = { wert: string | number | boolean | null } | 'fehler';

describe('1.8 liesWert', () => {
  const zeilen: [string, Variable['typ'], 'de' | 'en', Erwartet][] = [
    ['', 'text', 'de', { wert: null }],
    ['  ', 'ja/nein', 'de', { wert: null }],
    ['3', 'ganzzahl', 'de', { wert: 3 }],
    ['3.5', 'ganzzahl', 'de', 'fehler'],
    ['3,5', 'zahl', 'de', { wert: 3.5 }],
    ['3.5', 'zahl', 'en', { wert: 3.5 }],
    ['3,5', 'zahl', 'en', 'fehler'],
    ['ja', 'ja/nein', 'de', { wert: true }],
    ['Ja', 'ja/nein', 'de', { wert: true }],
    ['yes', 'ja/nein', 'de', { wert: true }],
    ['nein', 'ja/nein', 'de', { wert: false }],
    ['no', 'ja/nein', 'de', { wert: false }],
    ['vielleicht', 'ja/nein', 'de', 'fehler'],
    ['2026-11-09', 'datum', 'de', { wert: '2026-11-09' }],
    ['9.11.2026', 'datum', 'de', { wert: '2026-11-09' }],
    ['31.2.2026', 'datum', 'de', 'fehler'],
    ['Wien', 'text', 'de', { wert: 'Wien' }],
  ];

  it.each(zeilen)('liesWert(%j, %s, %s)', (eingabe, typ, sprache, erwartet) => {
    const r = liesWert(eingabe, typ, sprache);
    if (erwartet === 'fehler') {
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.grund.length).toBeGreaterThan(0);
    } else {
      expect(r).toEqual({ ok: true, wert: erwartet.wert });
    }
  });
});

/* ---- 1.9 Belege mit Filter ---- */

describe('1.9 belegeGefiltert', () => {
  /** Fälle F1 {g: w, sem: 3}, F2 {g: m, sem: 5}; d1 → F1, d2 → F2, d3 ohne Fall; Code Z mit Untercode Z1. */
  function filterProjekt(): QualProjekt {
    const q = neuesQualProjekt('Filter');
    q.kodierende = [{ id: 'p', name: 'Person' }];
    q.variablen = [
      { id: 'g', name: 'Geschlecht', typ: 'text' },
      { id: 'sem', name: 'Semester', typ: 'ganzzahl' },
    ];
    q.faelle = [
      { id: 'F1', name: 'F1', werte: { g: 'w', sem: 3 } },
      { id: 'F2', name: 'F2', werte: { g: 'm', sem: 5 } },
    ];
    const text = 'x'.repeat(50);
    q.dokumente = [
      { id: 'd1', name: 'd1', art: 'text', text, fall: 'F1', erstellt: 0, geaendert: 0 },
      { id: 'd2', name: 'd2', art: 'text', text, fall: 'F2', erstellt: 0, geaendert: 0 },
      { id: 'd3', name: 'd3', art: 'text', text, erstellt: 0, geaendert: 0 },
    ];
    q.codes = [
      { id: 'Z', name: 'Z', kodierbar: true, reihenfolge: 0 },
      { id: 'Z1', name: 'Z1', elternId: 'Z', kodierbar: true, reihenfolge: 0 },
    ];
    q.segmente = [
      { id: 's1', dokument: 'd1', start: 0, ende: 5, erstellt: 0 },
      { id: 's2', dokument: 'd2', start: 10, ende: 20, erstellt: 0 },
      { id: 's3', dokument: 'd3', start: 0, ende: 3, erstellt: 0 },
      { id: 's4', dokument: 'd2', start: 30, ende: 40, erstellt: 0 },
    ];
    q.kodierungen = [
      { id: 'kz1', segment: 's1', code: 'Z', kodierende: 'p', erstellt: 0 },   // Z auf d1 [0,5)
      { id: 'kz2', segment: 's2', code: 'Z', kodierende: 'p', erstellt: 0 },   // Z auf d2 [10,20)
      { id: 'kz3', segment: 's3', code: 'Z', kodierende: 'p', erstellt: 0 },   // Z auf d3 [0,3)
      { id: 'kz4', segment: 's4', code: 'Z1', kodierende: 'p', erstellt: 0 },  // Z1 auf d2 [30,40)
      { id: 'kz5', segment: 's1', code: 'Z1', kodierende: 'p', erstellt: 0 },  // Z1 auf d1 [0,5), dasselbe Segment wie kz1
    ];
    return q;
  }

  const zeilen: [string, BelegFilter, [string, number][]][] = [
    ['{}', {}, [['d1', 0], ['d2', 10], ['d3', 0]]],
    ['untercodes', { untercodes: true }, [['d1', 0], ['d2', 10], ['d2', 30], ['d3', 0]]],
    ['Geschlecht = w', { werte: [{ variable: 'g', wert: 'w' }] }, [['d1', 0]]],
    ['Geschlecht = m und Semester = 5, mit Untercodes', { werte: [{ variable: 'g', wert: 'm' }, { variable: 'sem', wert: 5 }], untercodes: true }, [['d2', 10], ['d2', 30]]],
    ['Semester = 4', { werte: [{ variable: 'sem', wert: 4 }] }, []],
    ['nur Kodierende q', { nurKodierende: 'q' }, []],
  ];

  it.each(zeilen)('Filter %s', (_label, filter, erwartet) => {
    const belege = belegeGefiltert(filterProjekt(), 'Z', filter);
    expect(belege.map(b => [b.dokument, b.start])).toEqual(erwartet);
  });
});
