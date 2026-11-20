import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Dokument } from './qualprojekt';
import { redeanteile, zaehleWoerter } from './redeanteile';

/* Fachblatt Stufe 4B, Abschnitt "Redeanteile". ROT, bis lib/redeanteile.ts und lib/qualprojekt.ts gebaut sind.
 * Sollwerte: R 4.6.1, scripts/redeanteile-erwartet.R (stringr::str_count) -> scripts/redeanteile-erwartet.txt / .json;
 * zweite Quelle für das kleine Grenzfall-Transkript: Handzählung des Prüfers (Wörter je Beitrag 7, 13, 6, 3, 11, 1) - stimmt mit R überein.
 * Daten: testdaten/redeanteile/mittel.json (30 Beiträge, 2 Personen, alle mit Zeit) und grenzfall.json.
 *
 * API (lib/redeanteile.ts):
 *   zaehleWoerter(text: string): number
 *     Entfernt zuerst Zeitmarken (#hh:mm:ss-d#, [hh:mm:ss], (hh:mm:ss)), dann Klammer-Anmerkungen ( ... ) und eckige [ ... ] vollständig (verschachtelt von innen nach außen),
 *     zählt dann Treffer von /[\p{L}\p{N}]+(?:['’\-][\p{L}\p{N}]+)* (Schalter gu). Die Kennung "Name: " ist NICHT Sache dieser Funktion (der Aufrufer zieht sie ab).
 *   type Zuordnung = Record<string, { name: string; rolle?: string }>   // Schlüssel = transkript.sprecher[].id; gleicher name = dieselbe Person
 *   redeanteile(dok: Dokument, zuordnung?: Zuordnung): { person: string; rolle?: string; beitraege: number; woerter: number; anteilWoerter: number; sprechzeitMs: number | null; anteilZeit: number | null }[]
 *     Ohne Zuordnung: person = Name des Sprechers. Reihenfolge = erstes Auftreten. Anteile in Prozent mit EINER Nachkommastelle (gerundet).
 *     Sprechzeit nur, wenn ALLE Beiträge zeitMs haben, sonst sprechzeitMs und anteilZeit null (für alle Personen). Dauer = bisMs - zeitMs; fehlt bisMs: Beginn des nächsten - zeitMs;
 *     letzter Beitrag ohne bisMs zählt nicht. anteilZeit = Sprechzeit / Summe aller Sprechzeiten.
 *   Der Inhalt eines Beitrags ist der Text des Abschnitts OHNE "Name: " am Anfang, wobei Name = transkript.sprecher[].name des Sprechers.
 */

interface Roh {
  text: string;
  sprecher: { id: string; name: string }[];
  abschnitte: { start: number; ende: number; sprecher?: string; zeitMs?: number; bisMs?: number }[];
  zuordnung?: Record<string, { name: string; rolle?: string }>;
}
function lade(name: string): Roh {
  return JSON.parse(readFileSync(new URL(`./testdaten/redeanteile/${name}.json`, import.meta.url), 'utf8')) as Roh;
}
function alsDokument(r: Roh): Dokument {
  return {
    id: 'd', name: 'Test', art: 'audio', text: r.text, erstellt: 0, geaendert: 0,
    transkript: { sprecher: r.sprecher, abschnitte: r.abschnitte },
  } as Dokument;
}

describe('zaehleWoerter (Regeln des Fachblatts)', () => {
  it('leer und nur Zeichen ohne Buchstaben/Ziffern', () => {
    expect(zaehleWoerter('')).toBe(0);
    expect(zaehleWoerter('   ')).toBe(0);
    expect(zaehleWoerter('😀 ... !!! – —')).toBe(0);
  });
  it('einfache Sätze, Umlaute und Unicode-Buchstaben', () => {
    expect(zaehleWoerter('Das ist ein Satz.')).toBe(4);
    expect(zaehleWoerter('Straße Čapek Ärger')).toBe(3);
  });
  it('Bindestrich- und Apostrophwörter zählen als eins: E-Mail, geht\'s, geht’s, E-Mail-Adresse', () => {
    expect(zaehleWoerter('E-Mail')).toBe(1);
    expect(zaehleWoerter('E-Mail-Adresse')).toBe(1);
    expect(zaehleWoerter("geht's")).toBe(1);
    expect(zaehleWoerter('geht’s')).toBe(1);
  });
  it('Dezimalzahl 3,5 sind zwei Wörter, ganze Zahl eins', () => {
    expect(zaehleWoerter('3,5')).toBe(2);
    expect(zaehleWoerter('12')).toBe(1);
  });
  it('Bindestrich am Ende oder Gedankenstrich verbindet nicht', () => {
    expect(zaehleWoerter('Fahr-')).toBe(1);
    expect(zaehleWoerter('Zug – Zug')).toBe(2);
  });
  it('ähm ist ein Wort', () => {
    expect(zaehleWoerter('ähm')).toBe(1);
  });
  it('Klammer-Anmerkungen und eckige Klammern zählen nicht: (lacht), (unv.), (...), [Lärm]', () => {
    expect(zaehleWoerter('(lacht) Ja')).toBe(1);
    expect(zaehleWoerter('Ich (unv.) war (...) da')).toBe(3);
    expect(zaehleWoerter('[Lärm] Ja [Husten im Raum] nein')).toBe(2);
  });
  it('verschachtelt: "(a (b) c) d" ist ein Wort', () => {
    expect(zaehleWoerter('(a (b) c) d')).toBe(1);
  });
  it('Zeitmarken zählen nicht, in allen Formen', () => {
    expect(zaehleWoerter('ja #00:01:02-3#')).toBe(1);
    expect(zaehleWoerter('[00:01:02] ja')).toBe(1);
    expect(zaehleWoerter('(00:01:02) ja')).toBe(1);
    expect(zaehleWoerter('Ich war (unv. #00:01:02-3#) damals dabei')).toBe(4);
  });
});

describe('redeanteile - mittleres Transkript (R: scripts/redeanteile-erwartet.txt, Abschnitt mittel)', () => {
  const dok = alsDokument(lade('mittel'));
  const erg = redeanteile(dok);
  it('zwei Personen in der Reihenfolge des ersten Auftretens', () => {
    expect(erg.map((e) => e.person)).toEqual(['Interviewerin', 'Befragte']);
  });
  it('Beiträge und Wörter', () => {
    expect(erg.map((e) => e.beitraege)).toEqual([15, 15]);
    expect(erg.map((e) => e.woerter)).toEqual([88, 215]);
  });
  it('Anteil Wörter in Prozent, eine Nachkommastelle', () => {
    expect(erg.map((e) => e.anteilWoerter)).toEqual([29.0, 71.0]);
  });
  it('Sprechzeit und Anteil Zeit', () => {
    expect(erg.map((e) => e.sprechzeitMs)).toEqual([47500, 161500]);
    expect(erg.map((e) => e.anteilZeit)).toEqual([22.7, 77.3]);
  });
  it('ohne Zuordnung keine Rolle', () => {
    expect(erg[0]!.rolle).toBeUndefined();
  });
  it('Summe der Anteile ist 100 (Rundung höchstens 0,1)', () => {
    expect(Math.abs(erg[0]!.anteilWoerter + erg[1]!.anteilWoerter - 100)).toBeLessThanOrEqual(0.1);
  });
});

describe('redeanteile - Grenzfall-Transkript (R und Handzählung)', () => {
  const roh = lade('grenzfall');
  const dok = alsDokument(roh);

  it('mit Zuordnung: zwei Kennungen derselben Person zählen als eine, Rolle kommt aus der Zuordnung', () => {
    const erg = redeanteile(dok, roh.zuordnung);
    expect(erg.map((e) => e.person)).toEqual(['Interviewerin', 'Befragte A']);
    expect(erg.map((e) => e.rolle)).toEqual(['interview', 'befragt']);
    expect(erg.map((e) => e.beitraege)).toEqual([3, 3]);
    expect(erg.map((e) => e.woerter)).toEqual([11, 30]);
    expect(erg.map((e) => e.anteilWoerter)).toEqual([26.8, 73.2]);
  });
  it('Sprechzeit: fehlendes bisMs bis zum Beginn des nächsten, letzter Beitrag ohne Ende zählt nicht', () => {
    const erg = redeanteile(dok, roh.zuordnung);
    expect(erg.map((e) => e.sprechzeitMs)).toEqual([9000, 31000]);
    expect(erg.map((e) => e.anteilZeit)).toEqual([22.5, 77.5]);
  });
  it('ohne Zuordnung: drei Personen mit den Namen der Sprecher', () => {
    const erg = redeanteile(dok);
    expect(erg.map((e) => e.person)).toEqual(['Interviewerin', 'Befragte A', 'Befragte A (zweite Kennung)']);
    expect(erg.map((e) => e.woerter)).toEqual([11, 24, 6]);
    expect(erg.map((e) => e.beitraege)).toEqual([3, 2, 1]);
  });
  it('Kennung "Name: " wird nicht mitgezählt, auch wenn der Name eine Klammer enthält', () => {
    const erg = redeanteile(dok);
    expect(erg[2]!.woerter).toBe(6); // "Befragte A (zweite Kennung): Ich war ... ja." -> 6 Wörter im Inhalt
  });
  it('Text mit Emoji: Positionen sind Codepoints, nicht UTF-16 (Abschnitt 2 enthält 😀)', () => {
    const erg = redeanteile(dok, roh.zuordnung);
    expect(erg[1]!.woerter).toBe(30);
  });
});

describe('redeanteile - Sprechzeit entfällt', () => {
  it('kein Beitrag hat eine Zeit: sprechzeitMs und anteilZeit null, Wörter bleiben', () => {
    const roh = lade('mittel');
    roh.abschnitte = roh.abschnitte.map(({ zeitMs: _z, bisMs: _b, ...rest }) => rest);
    const erg = redeanteile(alsDokument(roh));
    expect(erg.map((e) => e.sprechzeitMs)).toEqual([null, null]);
    expect(erg.map((e) => e.anteilZeit)).toEqual([null, null]);
    expect(erg.map((e) => e.woerter)).toEqual([88, 215]);
  });
  it('ein einziger Beitrag ohne zeitMs: für alle Personen null', () => {
    const roh = lade('mittel');
    delete roh.abschnitte[5]!.zeitMs;
    const erg = redeanteile(alsDokument(roh));
    expect(erg.map((e) => e.sprechzeitMs)).toEqual([null, null]);
    expect(erg.map((e) => e.anteilZeit)).toEqual([null, null]);
  });
});
