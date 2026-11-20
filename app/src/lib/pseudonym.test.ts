/**
 * Rote Tests für Paket 5D (Pseudonymisieren), geschrieben vom Prüfer nach Fachblatt Stufe 5, Abschnitt 5D.
 * Alle Sollwerte stehen in lib/testdaten/pseudonym/*.json (Trefferlisten von Hand, Positionen aus scripts/pseudonym-erwartet.py).
 * Nie die Sollwerte aus dem Code der App ableiten.
 */
import { describe, it, expect } from 'vitest';
import { findeInText, findeTreffer, ersetze, verschiebe, zuordnungAlsCsv, VORAUSWAHL, type Treffer, type TrefferArt, type Zuordnung } from './pseudonym';
import { cpTeil, pruefeQualProjekt, type QualProjekt } from './qualprojekt';
import TR_DE from './testdaten/pseudonym/treffer-de.json';
import TR_EN from './testdaten/pseudonym/treffer-en.json';
import PROJ from './testdaten/pseudonym/projekte.json';

interface Zeile {
  satz: string;
  namen: { text: string; art: 'person' | 'ort' | 'organisation' | 'sonstiges' }[];
  regeln: ('email' | 'telefon' | 'datum' | 'plz' | 'adresse' | 'url' | 'iban')[];
  erwartet: { text: string; art: string }[];
  warum?: string;
}

const zeilen = (a: unknown): Zeile[] => a as Zeile[];

describe('findeInText: Trefferliste Deutsch', () => {
  const z = zeilen(TR_DE);
  it('hat mindestens 40 Sätze', () => expect(z.length).toBeGreaterThanOrEqual(40));
  z.forEach((r, i) => {
    it(`de ${i + 1}: ${r.satz}${r.warum ? '  (' + r.warum + ')' : ''}`, () => {
      const f = findeInText(r.satz, { namen: r.namen, regeln: r.regeln });
      expect(f.map(x => ({ text: x.text, art: x.art }))).toEqual(r.erwartet);
      // Positionen: Codepoints, Ende exklusiv, aufsteigend
      for (const x of f) expect(cpTeil(r.satz, x.start, x.ende)).toBe(x.text);
      for (let k = 1; k < f.length; k++) expect(f[k]!.start).toBeGreaterThanOrEqual(f[k - 1]!.ende);
    });
  });
});

describe('findeInText: Trefferliste Englisch', () => {
  const z = zeilen(TR_EN);
  it('hat mindestens 40 Sätze', () => expect(z.length).toBeGreaterThanOrEqual(40));
  z.forEach((r, i) => {
    it(`en ${i + 1}: ${r.satz}${r.warum ? '  (' + r.warum + ')' : ''}`, () => {
      const f = findeInText(r.satz, { namen: r.namen, regeln: r.regeln });
      expect(f.map(x => ({ text: x.text, art: x.art }))).toEqual(r.erwartet);
      for (const x of f) expect(cpTeil(r.satz, x.start, x.ende)).toBe(x.text);
    });
  });
});

describe('findeInText: Positionen in Codepoints', () => {
  it('Emoji vor dem Treffer zählt je als ein Zeichen', () => {
    const f = findeInText('😀😀 Anna', { namen: [{ text: 'Anna', art: 'person' }], regeln: [] });
    expect(f).toHaveLength(1);
    expect([f[0]!.start, f[0]!.ende]).toEqual([3, 7]);
  });
  it('Ergebnis ist nach start sortiert', () => {
    const f = findeInText('Lukas kennt Anna.', { namen: [{ text: 'Anna', art: 'person' }, { text: 'Lukas', art: 'person' }], regeln: [] });
    expect(f.map(x => x.text)).toEqual(['Lukas', 'Anna']);
  });
});

describe('VORAUSWAHL', () => {
  it('an für Namen, E-Mail, Telefon, IBAN, Internetadresse; aus für Datum, PLZ, Adresse', () => {
    const an: TrefferArt[] = ['person', 'ort', 'organisation', 'sonstiges', 'email', 'telefon', 'iban', 'url'];
    const aus: TrefferArt[] = ['datum', 'plz', 'adresse'];
    for (const a of an) expect(VORAUSWAHL[a], a).toBe(true);
    for (const a of aus) expect(VORAUSWAHL[a], a).toBe(false);
  });
});

describe('verschiebe (Einzelfälle von Hand gerechnet)', () => {
  // Ersatz [10,14) wird zu Länge 10: Verschiebung +6
  const e1 = [{ start: 10, ende: 14, laenge: 10 }];
  it('vor dem Ersatz: unverändert', () => {
    expect(verschiebe(5, e1, 'start')).toBe(5);
    expect(verschiebe(5, e1, 'ende')).toBe(5);
  });
  it('Start genau am Anfang des Ersatzes bleibt', () => expect(verschiebe(10, e1, 'start')).toBe(10));
  it('Ende genau am Anfang des Ersatzes bleibt', () => expect(verschiebe(10, e1, 'ende')).toBe(10));
  it('innerhalb: Start auf den Anfang, Ende ans Ende des Ersatzes', () => {
    expect(verschiebe(12, e1, 'start')).toBe(10);
    expect(verschiebe(12, e1, 'ende')).toBe(20);
  });
  it('genau am Ende des Ersatzes: Start rückt mit, Ende auch', () => {
    expect(verschiebe(14, e1, 'start')).toBe(20);
    expect(verschiebe(14, e1, 'ende')).toBe(20);
  });
  it('hinter dem Ersatz: um +6 verschoben', () => expect(verschiebe(20, e1, 'start')).toBe(26));
  // zwei Ersatzstellen: [10,14)->10 (+6) und [20,26)->11 (+5)
  const e2 = [{ start: 10, ende: 14, laenge: 10 }, { start: 20, ende: 26, laenge: 11 }];
  it('zwei Ersatzstellen: innerhalb der zweiten, plus Verschiebung der ersten', () => {
    expect(verschiebe(22, e2, 'start')).toBe(26);   // 20 + 6
    expect(verschiebe(22, e2, 'ende')).toBe(37);    // 20 + 11 + 6
  });
  it('zwei Ersatzstellen: hinter beiden um +11', () => {
    expect(verschiebe(26, e2, 'start')).toBe(37);
    expect(verschiebe(40, e2, 'ende')).toBe(51);
  });
  it('zwischen den Ersatzstellen: nur die erste wirkt', () => expect(verschiebe(16, e2, 'start')).toBe(22));
  it('kürzerer Ersatz verschiebt nach links', () => {
    const e = [{ start: 0, ende: 12, laenge: 6 }];
    expect(verschiebe(12, e, 'start')).toBe(6);
    expect(verschiebe(6, e, 'start')).toBe(0);
    expect(verschiebe(6, e, 'ende')).toBe(6);
    expect(verschiebe(30, e, 'ende')).toBe(24);
  });
  it('ohne Ersatz bleibt jede Position', () => expect(verschiebe(7, [], 'start')).toBe(7));
});

/* ---------------------------------------------------------------------------------------------- */
/* findeTreffer */

const FT = PROJ.findeTreffer;
const qF = (): QualProjekt => pruefeQualProjekt(structuredClone(FT.projekt));
const kurz = (t: Treffer[]) => t.map(x => ({ dokument: x.dokument, start: x.start, ende: x.ende, text: x.text, art: x.art, ersatz: x.ersatz, an: x.an }));
const o = (sprecherAlsPersonen: boolean) => ({ namen: FT.namen as { text: string; art: 'ort' }[], regeln: FT.regeln as ('email' | 'datum')[], sprecherAlsPersonen });

describe('findeTreffer', () => {
  it('Beispielprojekt ist ein gültiges QualProjekt', () => expect(() => qF()).not.toThrow());
  it('de: Sprechernamen als Personen, Nummerierung nach erstem Vorkommen, Vorauswahl, Rolle "Interviewerin" nicht', () => {
    const t = findeTreffer(qF(), o(true), 'de');
    expect(kurz(t)).toEqual(FT.erwartet.de);
    expect(t.some(x => x.text === 'Interviewerin')).toBe(false);
  });
  it('en: andere Ersatztexte', () => {
    expect(kurz(findeTreffer(qF(), o(true), 'en'))).toEqual(FT.erwartet.en);
  });
  it('ohne Sprechernamen als Personen: keine Person gefunden, Nummern beginnen von vorn', () => {
    expect(kurz(findeTreffer(qF(), o(false), 'de'))).toEqual(FT.erwartet.ohneSprecher);
  });
  it('jede Kennung kommt nur einmal vor', () => {
    const ids = findeTreffer(qF(), o(true), 'de').map(x => x.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it('Vorauswahl: an entspricht VORAUSWAHL der Art', () => {
    for (const x of findeTreffer(qF(), o(true), 'de')) expect(x.an, x.text).toBe(VORAUSWAHL[x.art]);
  });
  it('verändert das Projekt nicht', () => {
    const q = qF(); const vor = structuredClone(q);
    findeTreffer(q, o(true), 'de');
    expect(q).toEqual(vor);
  });
});

/* ---------------------------------------------------------------------------------------------- */
/* ersetze */

interface Fall {
  name: string; zeit: number; projekt: unknown; treffer: Treffer[];
  erwartet: {
    dokumente: Record<string, string>;
    segmente: Record<string, { start: number; ende: number; text: string }>;
    abschnitte: Record<string, { start: number; ende: number; sprecher?: string }[]>;
    sprecher: Record<string, Record<string, string>>;
    protokoll: Record<string, number>;
    zuordnung: Zuordnung[];
  };
}
const faelle = PROJ.ersetzen as unknown as Fall[];

describe('ersetze gegen projekte.json', () => {
  it('es gibt Fälle (Segment vor/hinter/über/innerhalb, Emoji, zwei Dokumente, abgewählt, kürzerer Ersatz)', () => expect(faelle.length).toBeGreaterThanOrEqual(5));
  for (const f of faelle) {
    describe(f.name, () => {
      const lauf = () => {
        const q = pruefeQualProjekt(structuredClone(f.projekt));
        // pruefeQualProjekt lässt den Text stehen, wenn er im Objekt ist
        return { q, vor: structuredClone(q), r: ersetze(q, structuredClone(f.treffer), f.zeit) };
      };
      it('Fixture ist ein gültiges QualProjekt', () => expect(() => pruefeQualProjekt(structuredClone(f.projekt))).not.toThrow());
      it('Text je Dokument', () => {
        const { r } = lauf();
        for (const d of r.projekt.dokumente) expect(d.text, d.id).toBe(f.erwartet.dokumente[d.id]);
      });
      it('Segment-Positionen und Segmenttext über cpTeil', () => {
        const { r } = lauf();
        for (const s of r.projekt.segmente) {
          const soll = f.erwartet.segmente[s.id]!;
          expect([s.start, s.ende], s.id).toEqual([soll.start, soll.ende]);
          const d = r.projekt.dokumente.find(x => x.id === s.dokument)!;
          expect(cpTeil(d.text, s.start, s.ende), s.id).toBe(soll.text);
        }
      });
      it('Abschnitte des Transkripts werden gleich verschoben', () => {
        const { r } = lauf();
        for (const d of r.projekt.dokumente) {
          const soll = f.erwartet.abschnitte[d.id];
          if (!soll) continue;
          expect(d.transkript!.abschnitte.map(a => ({ start: a.start, ende: a.ende, sprecher: a.sprecher })), d.id)
            .toEqual(soll.map(a => ({ start: a.start, ende: a.ende, sprecher: a.sprecher })));
        }
      });
      it('Sprechernamen: Personen ersetzt, Rollen wie Interviewerin bleiben', () => {
        const { r, vor } = lauf();
        for (const d of r.projekt.dokumente) {
          const dv = vor.dokumente.find(x => x.id === d.id)!;
          for (const s of d.transkript?.sprecher ?? []) {
            const alt = dv.transkript!.sprecher.find(x => x.id === s.id)!;
            expect(s.name, `${d.id}/${s.id}`).toBe(f.erwartet.sprecher[d.id]?.[s.id] ?? alt.name);
          }
        }
      });
      it('Zuordnung (Ersatz, Klartext, Art, Stellen) genau in der festgelegten Reihenfolge', () => {
        const { r } = lauf();
        expect(r.zuordnung).toEqual(f.erwartet.zuordnung);
      });
      it('protokoll: ein Eintrag "pseudonymisiert, n Stellen" je geändertem Dokument, sonst keiner', () => {
        const { r, vor } = lauf();
        const neu = r.projekt.protokoll.slice(vor.protokoll.length);
        const soll = Object.values(f.erwartet.protokoll);
        // ohne Textänderung kein Eintrag; sonst mindestens einer je geändertem Dokument (ein nur im Sprechernamen geändertes Dokument darf zusätzlich einen haben)
        if (soll.length === 0) expect(neu.length).toBe(0); else expect(neu.length).toBeGreaterThanOrEqual(soll.length);
        for (const n of soll) {
          expect(neu.some(a => /pseudonymisiert/.test(a.was) && new RegExp(`\\b${n}\\b`).test(a.was) && a.zeit === f.zeit), `n=${n}`).toBe(true);
        }
      });
      it('Kodierungen, Codes, Fälle und Memos bleiben gleich; Ergebnis ist ein gültiges Projekt', () => {
        const { r, vor } = lauf();
        expect(r.projekt.kodierungen).toEqual(vor.kodierungen);
        expect(r.projekt.codes).toEqual(vor.codes);
        expect(r.projekt.faelle).toEqual(vor.faelle);
        expect(r.projekt.memos).toEqual(vor.memos);
        expect(r.projekt.segmente.map(s => s.id)).toEqual(vor.segmente.map(s => s.id));
        expect(() => pruefeQualProjekt(structuredClone(r.projekt))).not.toThrow();
      });
      it('das übergebene Projekt wird nicht verändert (für Rückgängig)', () => {
        const q = pruefeQualProjekt(structuredClone(f.projekt));
        const vor = structuredClone(q);
        ersetze(q, structuredClone(f.treffer), f.zeit);
        expect(q).toEqual(vor);
      });
    });
  }

  it('Segmentgrenzen am Rand und innerhalb: Segment bleibt nie leer', () => {
    const f = faelle.find(x => x.name === 'segmentlagen')!;
    const q = pruefeQualProjekt(structuredClone(f.projekt));
    const r = ersetze(q, structuredClone(f.treffer), f.zeit);
    for (const s of r.projekt.segmente) expect(s.ende, s.id).toBeGreaterThan(s.start);
  });
  it('alle abgewählt: Projekt unverändert, keine Zuordnung, kein protokoll-Eintrag', () => {
    const f = faelle.find(x => x.name === 'alle_abgewaehlt')!;
    const q = pruefeQualProjekt(structuredClone(f.projekt));
    const r = ersetze(q, structuredClone(f.treffer), f.zeit);
    expect(r.projekt).toEqual(q);
    expect(r.zuordnung).toEqual([]);
  });
});

/* ---------------------------------------------------------------------------------------------- */
/* zuordnungAlsCsv */

const L = (z: Zuordnung[], sprache: 'de' | 'en') => zuordnungAlsCsv(z, sprache);
const zeile = (ersatz: string, klartext: string, art: TrefferArt, stellen: number): Zuordnung => ({ ersatz, klartext, art, stellen });

describe('zuordnungAlsCsv (Entscheid: Kopf, Beschriftungen, LF, Formel-Schutz, RFC 4180)', () => {
  const ZD: Zuordnung[] = [
    zeile('[Person 1]', 'Anna', 'person', 3),
    zeile('[Person 2]', 'Müller; Anna', 'person', 1),
    zeile('[Angabe 1]', 'Dr. "Tom" 😀', 'sonstiges', 1),
    zeile('[Telefon]', '+43 1 5812345', 'telefon', 1),
    zeile('[Adresse]', '=SUMME(1)', 'adresse', 1),
    zeile('[Internetadresse]', '@home', 'url', 1),
    zeile('[IBAN]', '-5', 'iban', 1),
    zeile('[PLZ]', '1010', 'plz', 2),
  ];
  it('de: Semikolon, Kopfzeile, Beschriftungen, Anführungszeichen, Formel-Schutz, LF, letzte Zeile mit LF', () => {
    expect(L(ZD, 'de')).toBe([
      'Ersatz;Klartext;Art;Stellen',
      '[Person 1];Anna;Person;3',
      '[Person 2];"Müller; Anna";Person;1',
      '[Angabe 1];"Dr. ""Tom"" 😀";Sonstiges;1',
      "[Telefon];'+43 1 5812345;Telefon;1",
      "[Adresse];'=SUMME(1);Adresse;1",
      "[Internetadresse];'@home;Internetadresse;1",
      "[IBAN];'-5;IBAN;1",
      '[PLZ];1010;PLZ;2',
      '',
    ].join('\n'));
  });
  const ZE: Zuordnung[] = [
    zeile('[Person 1]', 'Anna', 'person', 3),
    zeile('[Place 1]', 'Wien, Mitte', 'ort', 2),
    zeile('[Detail 1]', 'Dr. "Tom" 😀', 'sonstiges', 1),
    zeile('[Phone]', '+44 20 7946 0958', 'telefon', 1),
    zeile('[Web address]', 'www.statable.eu', 'url', 1),
  ];
  it('en: Komma, Kopfzeile, Beschriftungen, Anführungszeichen, Formel-Schutz, LF', () => {
    expect(L(ZE, 'en')).toBe([
      'Replacement,Original,Type,Count',
      '[Person 1],Anna,Person,3',
      '[Place 1],"Wien, Mitte",Place,2',
      '[Detail 1],"Dr. ""Tom"" 😀",Other,1',
      "[Phone],'+44 20 7946 0958,Phone,1",
      '[Web address],www.statable.eu,Web address,1',
      '',
    ].join('\n'));
  });
  it('Beschriftung der Art in der Sprache', () => {
    const de: Record<TrefferArt, string> = { person: 'Person', ort: 'Ort', organisation: 'Organisation', sonstiges: 'Sonstiges', email: 'E-Mail', telefon: 'Telefon', datum: 'Datum', plz: 'PLZ', adresse: 'Adresse', url: 'Internetadresse', iban: 'IBAN' };
    const en: Record<TrefferArt, string> = { person: 'Person', ort: 'Place', organisation: 'Organisation', sonstiges: 'Other', email: 'Email', telefon: 'Phone', datum: 'Date', plz: 'Postcode', adresse: 'Address', url: 'Web address', iban: 'IBAN' };
    for (const a of Object.keys(de) as TrefferArt[]) {
      expect(L([zeile('X', 'y', a, 1)], 'de').split('\n')[1], a).toBe(`X;y;${de[a]};1`);
      expect(L([zeile('X', 'y', a, 1)], 'en').split('\n')[1], a).toBe(`X,y,${en[a]},1`);
    }
  });
  it('Formel-Schutz: nur Felder, die mit = + - @ beginnen', () => {
    const z = L([zeile('X', '=a', 'person', 1), zeile('X', 'a=b', 'person', 1), zeile('X', '+1', 'person', 1), zeile('X', '@x', 'person', 1)], 'de').split('\n');
    expect(z.slice(1, 5)).toEqual(["X;'=a;Person;1", 'X;a=b;Person;1', "X;'+1;Person;1", "X;'@x;Person;1"]);
  });
  it('UTF-8 ohne BOM, Umlaute und Emoji bleiben, kein CR', () => {
    const csv = L(ZD, 'de');
    expect(csv.charCodeAt(0)).not.toBe(0xfeff);
    const b = new TextEncoder().encode(csv);
    expect([b[0], b[1], b[2]]).not.toEqual([0xef, 0xbb, 0xbf]);
    expect(csv).toContain('Müller');
    expect(csv).toContain('😀');
    expect(csv).not.toContain('\r');
  });
  it('leere Liste: nur die Kopfzeile mit LF', () => {
    expect(L([], 'de')).toBe('Ersatz;Klartext;Art;Stellen\n');
    expect(L([], 'en')).toBe('Replacement,Original,Type,Count\n');
  });
});
