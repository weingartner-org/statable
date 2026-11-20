/**
 * Paket 4D (Leitfaden-Assistent): Tests gegen die Sollwerte des Prüfers.
 * Sollwerte: testdaten/leitfaden-hinweise.json (nicht vom Bauer ändern).
 * Strittige Fälle sind nach den Entscheiden von Opus (Fachblatt, "Entscheide nach den Prüfer-Tests", 4D) eingearbeitet.
 * Das Modul ./leitfaden gibt es noch nicht - die Tests sind absichtlich rot.
 */
import { describe, it, expect } from 'vitest';
import hinweise from './testdaten/leitfaden-hinweise.json';
import {
  hinweiseZuFrage,
  neuerLeitfaden,
  sammleFragen,
  bloeckeAlsCodes,
  leseLeitfaeden,
  type HinweisArt,
} from './leitfaden';

interface Fall {
  text: string;
  sprache: 'de' | 'en';
  erwartet: HinweisArt[];
  notiz: string;
}
const faelle = hinweise as Fall[];
const REIHENFOLGE: HinweisArt[] = ['geschlossen', 'suggestiv', 'doppelt', 'alternativ', 'warum', 'fakt', 'lang'];

describe('Sollwert-Datei', () => {
  it('hat mindestens 40 Fragen in beiden Sprachen', () => {
    expect(faelle.length).toBeGreaterThanOrEqual(40);
    expect(faelle.filter((f) => f.sprache === 'de').length).toBeGreaterThanOrEqual(25);
    expect(faelle.filter((f) => f.sprache === 'en').length).toBeGreaterThanOrEqual(15);
  });
  it('Erwartungen stehen in der Reihenfolge der Tabelle', () => {
    for (const f of faelle) {
      const idx = f.erwartet.map((e) => REIHENFOLGE.indexOf(e));
      expect(idx.every((i) => i >= 0)).toBe(true);
      expect([...idx].sort((a, b) => a - b)).toEqual(idx);
    }
  });
});

describe('hinweiseZuFrage', () => {
  for (const f of faelle) {
    const name = `[${f.sprache}] ${JSON.stringify(f.text)} -> ${f.erwartet.join(', ') || 'kein Hinweis'}`;
    it(name, () => expect(hinweiseZuFrage(f.text, f.sprache)).toEqual(f.erwartet));
  }
  it('leerer Text gibt keinen Hinweis', () => {
    expect(hinweiseZuFrage('', 'de')).toEqual([]);
    expect(hinweiseZuFrage('   ', 'en')).toEqual([]);
  });
});

describe('neuerLeitfaden', () => {
  it('legt einen leeren Leitfaden an', () => {
    const lf = neuerLeitfaden('Studienzeit', 'de');
    expect(lf.titel).toBe('Studienzeit');
    expect(lf.sprache).toBe('de');
    expect(lf.gesammelt).toEqual([]);
    expect(lf.bloecke).toEqual([]);
    expect(typeof lf.id).toBe('string');
    expect(lf.id.length).toBeGreaterThan(0);
    expect(typeof lf.erstellt).toBe('number');
  });
});

describe('sammleFragen', () => {
  const lf = neuerLeitfaden('T', 'de');
  it('eine Frage je nicht-leerer Zeile, getrimmt, Status offen', () => {
    const r = sammleFragen(lf, '  Wie alt sind Sie?  \n\n   \nErzählen Sie mal.\n');
    expect(r.gesammelt.map((g) => g.text)).toEqual(['Wie alt sind Sie?', 'Erzählen Sie mal.']);
    expect(r.gesammelt.every((g) => g.status === 'offen')).toBe(true);
  });
  it('Windows-Zeilenenden', () => {
    const r = sammleFragen(lf, 'Eins?\r\nZwei?\r\n\r\nDrei?');
    expect(r.gesammelt.map((g) => g.text)).toEqual(['Eins?', 'Zwei?', 'Drei?']);
  });
  it('leere Eingabe ändert nichts und verändert das Original nicht', () => {
    expect(sammleFragen(lf, '').gesammelt).toEqual([]);
    expect(sammleFragen(lf, ' \n \r\n').gesammelt).toEqual([]);
    sammleFragen(lf, 'Etwas?');
    expect(lf.gesammelt).toEqual([]);
  });
  it('hängt an vorhandene an und vergibt eindeutige Kennungen', () => {
    const a = sammleFragen(lf, 'A?\nB?');
    const b = sammleFragen(a, 'C?');
    expect(b.gesammelt.map((g) => g.text)).toEqual(['A?', 'B?', 'C?']);
    expect(new Set(b.gesammelt.map((g) => g.id)).size).toBe(3);
  });
});

describe('bloeckeAlsCodes', () => {
  const mitBloecken = () => {
    const lf = neuerLeitfaden('T', 'de');
    lf.bloecke = [
      { id: 'b1', titel: 'Zeitplanung', erzaehlaufforderung: '', aspekte: [], aufrechterhaltung: [], konkret: [], reihenfolge: 2 },
      { id: 'b2', titel: 'Stress', erzaehlaufforderung: '', aspekte: [], aufrechterhaltung: [], konkret: [], reihenfolge: 1 },
    ];
    return lf;
  };
  it('legt je Block einen Code an, in der Reihenfolge der Blöcke', () => {
    const r = bloeckeAlsCodes(mitBloecken(), []);
    expect(r.neu.map((n) => n.name)).toEqual(['Stress', 'Zeitplanung']);
    expect(r.uebersprungen).toEqual([]);
  });
  it('gleicher Name wird nicht doppelt angelegt und gemeldet', () => {
    const r = bloeckeAlsCodes(mitBloecken(), ['Stress']);
    expect(r.neu.map((n) => n.name)).toEqual(['Zeitplanung']);
    expect(r.uebersprungen).toEqual(['Stress']);
  });
  it('gleicher Blockname zweimal: nur einmal angelegt', () => {
    const lf = mitBloecken();
    lf.bloecke[1]!.titel = 'Zeitplanung';
    const r = bloeckeAlsCodes(lf, []);
    expect(r.neu.length).toBe(1);
    expect(r.uebersprungen).toEqual(['Zeitplanung']);
  });
  it('Leerzeichen am Rand zählen nicht', () => {
    const r = bloeckeAlsCodes(mitBloecken(), ['  Stress ']);
    expect(r.uebersprungen).toEqual(['Stress']);
  });
  it('Groß-/Kleinschreibung zählt nicht (Entscheid 8)', () => {
    const r = bloeckeAlsCodes(mitBloecken(), ['stress', 'ZEITPLANUNG']);
    expect(r.neu).toEqual([]);
    expect(r.uebersprungen.sort()).toEqual(['Stress', 'Zeitplanung']);
  });
  it('Blockname nur anders geschrieben wie ein zweiter Block: einmal angelegt', () => {
    const lf = mitBloecken();
    lf.bloecke[1]!.titel = 'ZEITPLANUNG';
    const r = bloeckeAlsCodes(lf, []);
    expect(r.neu.length).toBe(1);
  });
  it('Kleinschreibung nach de-Regeln (Ä/ä)', () => {
    const lf = mitBloecken();
    lf.bloecke[0]!.titel = 'Ärger';
    const r = bloeckeAlsCodes(lf, ['ärger']);
    expect(r.uebersprungen).toEqual(['Ärger']);
  });
  it('Leitfaden ohne Blöcke gibt nichts zurück', () => {
    expect(bloeckeAlsCodes(neuerLeitfaden('T', 'en'), ['x'])).toEqual({ neu: [], uebersprungen: [] });
  });
});

describe('leseLeitfaeden', () => {
  const gut = () => JSON.parse(JSON.stringify([neuerLeitfaden('A', 'de')]));
  it('liest gültige Leitfäden (Rundlauf)', () => {
    const lf = neuerLeitfaden('A', 'en');
    const r = leseLeitfaeden(JSON.parse(JSON.stringify([lf])));
    expect(r).toEqual([lf]);
  });
  it('leere Liste ist gültig', () => {
    expect(leseLeitfaeden([])).toEqual([]);
  });
  it.each([
    ['kein Feld-Array', {}],
    ['null', null],
    ['Text', 'abc'],
    ['Zahl', 5],
    ['Eintrag ist null', [null]],
    ['Eintrag ist Text', ['x']],
  ])('wirft bei %s', (_n, eingabe) => {
    expect(() => leseLeitfaeden(eingabe)).toThrow();
  });
  it.each([
    ['titel fehlt', (o: any) => delete o.titel],
    ['titel ist Zahl', (o: any) => (o.titel = 3)],
    ['sprache unbekannt', (o: any) => (o.sprache = 'fr')],
    ['id fehlt', (o: any) => delete o.id],
    ['gesammelt kein Array', (o: any) => (o.gesammelt = 'x')],
    ['gesammelt: falscher Status', (o: any) => (o.gesammelt = [{ id: '1', text: 'a', status: 'xyz' }])],
    ['gesammelt: text fehlt', (o: any) => (o.gesammelt = [{ id: '1', status: 'offen' }])],
    ['bloecke kein Array', (o: any) => (o.bloecke = {})],
    ['block: aspekte kein Array', (o: any) => (o.bloecke = [{ id: 'b', titel: 't', erzaehlaufforderung: '', aspekte: 'x', aufrechterhaltung: [], konkret: [], reihenfolge: 1 }])],
    ['block: aspekte enthält Zahl', (o: any) => (o.bloecke = [{ id: 'b', titel: 't', erzaehlaufforderung: '', aspekte: [1], aufrechterhaltung: [], konkret: [], reihenfolge: 1 }])],
    ['block: reihenfolge kein Zahl', (o: any) => (o.bloecke = [{ id: 'b', titel: 't', erzaehlaufforderung: '', aspekte: [], aufrechterhaltung: [], konkret: [], reihenfolge: 'a' }])],
    ['erstellt ist Text', (o: any) => (o.erstellt = 'gestern')],
    ['geaendert fehlt', (o: any) => delete o.geaendert],
  ])('wirft bei kaputtem Feld: %s', (_n, kaputt) => {
    const l = gut();
    kaputt(l[0]);
    expect(() => leseLeitfaeden(l)).toThrow();
  });
  it('wirft nicht bei fremden Zusatzfeldern', () => {
    const l = gut();
    l[0].zusatz = 1;
    expect(() => leseLeitfaeden(l)).not.toThrow();
  });
});
