// Beispielprojekt "Semesterplanung (erfunden)" (Paket 5F-a): public/beispiel/qdpx/beispiel-de.qdpx und beispiel-en.qdpx müssen sich mit leseQdpx sauber lesen lassen.
// Die Zahlen stammen aus dem unabhängigen Python-Leser scripts/qdpx-erwartet.py (nicht aus TypeScript); erzeugt von scripts/beispiel-qdpx/erzeugen.py.
// Hinweis: qdpx.ts wird von Paket 5A gebaut; bis es da ist, schlägt dieser Test beim Import fehl.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { DOMParser as XmlDomParser } from '@xmldom/xmldom';
import { cpLaenge } from './qualprojekt';
import { leseQdpx } from './qdpx';

(globalThis as unknown as { DOMParser: unknown }).DOMParser = XmlDomParser;

const ORDNER = new URL('../../public/beispiel/qdpx/', import.meta.url);
const bytes = (n: string) => new Uint8Array(readFileSync(new URL(n, ORDNER)));

const FEHLERARTEN = ['positionen-unsicher', 'positionen-ungeprueft', 'segment-ausserhalb', 'segment-leer', 'guid-unbekannt', 'quelle-fehlt', 'kodierende-unbekannt'];

describe.each([
  ['de', 'beispiel-de.qdpx', ['Kodiererin A', 'Kodierer B']],
  ['en', 'beispiel-en.qdpx', ['Coder A', 'Coder B']],
] as const)('Beispielprojekt %s', (sprache, datei, personen) => {
  const erg = leseQdpx(bytes(datei), sprache);

  it('keine Meldung über unsichere oder fehlende Positionen', () => {
    expect(erg.meldungen.filter(m => FEHLERARTEN.includes(m.art))).toEqual([]);
  });
  it('Zählung wie vom Python-Leser', () => {
    expect(erg.zaehlung).toEqual({ dokumente: 3, codes: 9, segmente: 53, kodierungen: 54, kodierende: 2, memos: 1, faelle: 3, variablen: 3, mengen: 0 });
  });
  it('beide Kodierende sind da, je 27 Kodierungen', () => {
    expect(erg.projekt.kodierende.map(k => k.name).sort()).toEqual([...personen].sort());
    for (const k of erg.projekt.kodierende) expect(erg.projekt.kodierungen.filter(x => x.kodierende === k.id)).toHaveLength(27);
  });
  it('alle Segmente liegen im Text (Codepoints, Ende exklusiv), auch hinter dem Emoji', () => {
    const dok = new Map(erg.projekt.dokumente.map(d => [d.id, d]));
    for (const s of erg.projekt.segmente) {
      const d = dok.get(s.dokument)!;
      expect(s.start).toBeGreaterThanOrEqual(0);
      expect(s.start).toBeLessThan(s.ende);
      expect(s.ende).toBeLessThanOrEqual(cpLaenge(d.text));
    }
    expect(erg.projekt.dokumente.some(d => d.text.length !== cpLaenge(d.text))).toBe(true); // genau das Dokument mit dem Emoji
  });
  it('Codebuch: Belastung ist nicht kodierbar und hat drei Untercodes', () => {
    const b = erg.projekt.codes.find(c => c.elternId === undefined && c.kodierbar === false);
    expect(b).toBeDefined();
    expect(erg.projekt.codes.filter(c => c.elternId === b!.id)).toHaveLength(3);
  });
  it('drei Fälle mit drei Variablen', () => {
    expect(erg.projekt.faelle).toHaveLength(3);
    for (const f of erg.projekt.faelle) expect(Object.keys(f.werte)).toHaveLength(3);
  });
});
