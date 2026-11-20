// Rote Tests für app/src/lib/qdc.ts (REFI-QDA-Codebuch .qdc schreiben und lesen), Paket 4E.
// Quelle der Anforderungen: docs/erheben/FACHBLATT-STUFE-4.md, Abschnitt 4E.
// Das Modul qdc.ts (und qualprojekt.ts) gibt es noch nicht: alle Tests schlagen zunächst fehl.
import { describe, expect, it } from 'vitest';
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Code } from './qualprojekt';
import { DOMParser as XmlDomParser } from '@xmldom/xmldom';
import { schreibeQdc, leseQdc, QdcFehler } from './qdc';

// qdc.ts nutzt nur globalThis.DOMParser (Entscheid 4E-9); in Node kommt er aus @xmldom/xmldom
(globalThis as unknown as { DOMParser: unknown }).DOMParser = XmlDomParser;

const NS = 'urn:QDA-XML:codebook:1.0';
const G = (n: number) => `a1b2c3d4-0000-4000-8000-${String(n).padStart(12, '0')}`;
const c = (o: Partial<Code> & { id: string; name: string; reihenfolge: number }): Code => ({ kodierbar: true, ...o }) as Code;

/** Der Text eines Code-Elements samt Kindern: sucht das Element mit dem Namen und läuft bis zum passenden Ende. */
function block(xml: string, name: string): string {
  const start = xml.indexOf(`name="${name}"`);
  if (start < 0) throw new Error('Code nicht gefunden: ' + name);
  const von = xml.lastIndexOf('<Code', start);
  const re = /<(\/?)Code\b[^>]*?(\/?)>/g; re.lastIndex = von;
  let tiefe = 0, m: RegExpExecArray | null;
  while ((m = re.exec(xml))) {
    if (m[1]) tiefe--; else if (!m[2]) tiefe++;
    if (tiefe === 0) return xml.slice(von, re.lastIndex);
  }
  throw new Error('Element nicht geschlossen: ' + name);
}
const oeffnung = (xml: string, name: string) => block(xml, name).match(/^<Code\b[^>]*>/)![0];
const lies = (n: string) => readFileSync(new URL(`./testdaten/qdc/${n}`, import.meta.url), 'utf8');

/** Fehlercode, mit dem leseQdc die Eingabe ablehnt (QdcFehler.code); null, wenn nicht geworfen wird. */
function fehlercode(text: string): string | null {
  try { leseQdc(text, 'de'); return null; } catch (e) { if (e instanceof QdcFehler) return e.code; throw e; }
}

const REICH: Code[] = [
  c({ id: G(1), name: 'Zeitplanung', reihenfolge: 0, kodierbar: false, farbe: '#1F77B4', definition: 'Aussagen darüber, wie die Person ihre Zeit einteilt.', anker: [{ text: 'Ich schreibe mir jeden Sonntag auf, was ansteht.' }, { text: 'Ohne Kalender ginge nichts.' }], regel: 'Nur, wenn die Planung im Vordergrund steht.' }),
  c({ id: G(2), name: 'Wochenplan', elternId: G(1), reihenfolge: 1, definition: 'Planung auf Wochenebene.' }),
  c({ id: G(3), name: 'Tagesplan', elternId: G(1), reihenfolge: 0, farbe: '#ff7f0e', anker: [{ text: 'Morgens mache ich eine Liste.' }] }),
  c({ id: G(4), name: 'Belastung', reihenfolge: 1, regel: 'Auch indirekte Hinweise.' }),
  c({ id: G(5), name: 'Prüfungsphase', elternId: G(3), reihenfolge: 0 }),
];

describe('schreibeQdc: Aufbau der Datei', () => {
  it('Wurzel CodeBook mit Namensraum und origin="Statable"', () => {
    const x = schreibeQdc(REICH, 'de');
    expect(x).toMatch(/^<\?xml version="1\.0" encoding="utf-8"\?>/);
    expect(x).toMatch(new RegExp(`<CodeBook[^>]*xmlns="${NS}"`));
    expect(x).toMatch(/<CodeBook[^>]*origin="Statable"/);
    expect(x).toContain('<Codes>');
    expect(x.trim().endsWith('</CodeBook>')).toBe(true);
  });

  it('Baum verschachtelt nach elternId, Geschwister nach reihenfolge', () => {
    const x = schreibeQdc(REICH, 'de');
    const z = block(x, 'Zeitplanung');
    // Kinder von Zeitplanung: Tagesplan (0) vor Wochenplan (1); Prüfungsphase steckt in Tagesplan
    expect(z.indexOf('name="Tagesplan"')).toBeGreaterThan(0);
    expect(z.indexOf('name="Tagesplan"')).toBeLessThan(z.indexOf('name="Wochenplan"'));
    expect(block(x, 'Tagesplan')).toContain('name="Prüfungsphase"');
    expect(block(x, 'Wochenplan')).not.toContain('Prüfungsphase');
    // Wurzeln: Zeitplanung (0) vor Belastung (1); Belastung liegt nicht in Zeitplanung
    expect(x.indexOf('name="Zeitplanung"')).toBeLessThan(x.indexOf('name="Belastung"'));
    expect(z).not.toContain('name="Belastung"');
  });

  it('isCodable true/false aus kodierbar', () => {
    const x = schreibeQdc(REICH, 'de');
    expect(oeffnung(x, 'Zeitplanung')).toContain('isCodable="false"');
    expect(oeffnung(x, 'Wochenplan')).toContain('isCodable="true"');
  });

  it('color nur, wenn gesetzt', () => {
    const x = schreibeQdc(REICH, 'de');
    expect(oeffnung(x, 'Zeitplanung')).toMatch(/color="#1[Ff]77[Bb]4"/);
    expect(oeffnung(x, 'Wochenplan')).not.toContain('color=');
    expect(oeffnung(x, 'Belastung')).not.toContain('color=');
  });

  it('Description = Definition, Leerzeile, Ankerbeispiele je Zeile, Leerzeile, Kodierregel (de)', () => {
    const x = schreibeQdc(REICH, 'de');
    const beschr = (n: string) => block(x, n).match(/<Description>([\s\S]*?)<\/Description>/)?.[1];
    expect(beschr('Zeitplanung')!.replace(/\r\n/g, '\n')).toBe(
      'Aussagen darüber, wie die Person ihre Zeit einteilt.\n\nAnkerbeispiel: Ich schreibe mir jeden Sonntag auf, was ansteht.\nAnkerbeispiel: Ohne Kalender ginge nichts.\n\nKodierregel: Nur, wenn die Planung im Vordergrund steht.');
    expect(beschr('Wochenplan')).toBe('Planung auf Wochenebene.');
  });

  it('Description: englische Etiketten bei sprache "en"', () => {
    const x = schreibeQdc(REICH, 'en');
    expect(x).toContain('Anchor example: Ohne Kalender ginge nichts.');
    expect(x).toContain('Coding rule: Nur, wenn die Planung im Vordergrund steht.');
    expect(x).not.toContain('Ankerbeispiel:');
    expect(x).not.toContain('Kodierregel:');
  });

  it('ohne Inhalt kein Description-Element', () => {
    const x = schreibeQdc(REICH, 'de');
    expect(block(x, 'Prüfungsphase')).not.toContain('Description');
    expect(x).not.toMatch(/<Description>\s*<\/Description>|<Description\/>/);
  });

  it('GUIDs klein, ohne Klammern', () => {
    const x = schreibeQdc([c({ id: '{A1B2C3D4-0000-4000-8000-0000000000AB}', name: 'X', reihenfolge: 0 })], 'de');
    expect(x).toContain('guid="a1b2c3d4-0000-4000-8000-0000000000ab"');
    expect(x).not.toMatch(/guid="[^"]*[{}A-F][^"]*"/);
  });

  it('maskiert & < > " in Name und Beschreibung', () => {
    const x = schreibeQdc([c({ id: G(1), name: 'A & B <c> "d"', reihenfolge: 0, definition: 'x < y && y > z, "so"' })], 'de');
    expect(x).toContain('name="A &amp; B &lt;c&gt; &quot;d&quot;"');
    expect(x).toContain('x &lt; y &amp;&amp; y &gt; z');
    expect(x).not.toMatch(/name="[^"]*[<>][^"]*"/);
  });

  it('entfernt Steuerzeichen, behält Tab und Zeilenumbruch in der Beschreibung', () => {
    const x = schreibeQdc([c({ id: G(1), name: 'Na\u0001me\u0008', reihenfolge: 0, definition: 'a\u0000b\u001fc\td\ne\u007f' })], 'de');
    // eslint-disable-next-line no-control-regex
    expect(x).not.toMatch(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/);
    expect(x).toContain('name="Name"');
    expect(x).toContain('abc\td\ne');
  });

  it('leere Codeliste: wirft (leere Codes sind laut XSD ungültig)', () => {
    expect(() => schreibeQdc([], 'de')).toThrow();
  });
});

describe('Hin- und Rückweg (schreiben, dann lesen)', () => {
  const sortiert = (cs: Code[]) => {
    // Vergleichbare Form: je Code die Felder, Geschwister nach reihenfolge geordnet (Zahlen selbst dürfen sich ändern)
    const rang = new Map<string, number>();
    const gruppen = new Map<string, Code[]>();
    for (const k of cs) { const e = k.elternId ?? ''; (gruppen.get(e) ?? gruppen.set(e, []).get(e)!).push(k); }
    for (const g of gruppen.values()) g.sort((a, b) => a.reihenfolge - b.reihenfolge).forEach((k, i) => rang.set(k.id, i));
    return cs.map(k => ({ id: k.id, name: k.name, elternId: k.elternId, farbe: k.farbe?.toLowerCase(), kodierbar: k.kodierbar, definition: k.definition || undefined, anker: (k.anker ?? []).map(a => a.text), regel: k.regel || undefined, platz: rang.get(k.id) })).sort((a, b) => a.id.localeCompare(b.id));
  };
  for (const sprache of ['de', 'en'] as const) {
    it(`alle Felder bleiben erhalten (${sprache})`, () => {
      const r = leseQdc(schreibeQdc(REICH, sprache), sprache);
      expect(r.meldungen).toEqual([]);
      expect(sortiert(r.codes)).toEqual(sortiert(REICH));
    });
  }
  it('Sonderzeichen überstehen den Hin- und Rückweg', () => {
    const k = [c({ id: G(9), name: 'A & B <c> "d" \'e\'', reihenfolge: 0, definition: 'x < y & z > "w"\nzweite Zeile', regel: 'a & b' })];
    const r = leseQdc(schreibeQdc(k, 'de'), 'de');
    expect(r.codes[0]!.name).toBe(k[0]!.name);
    expect(r.codes[0]!.definition).toBe(k[0]!.definition);
    expect(r.codes[0]!.regel).toBe('a & b');
  });
});

describe('leseQdc: fremde Dateien (Testdaten unter testdaten/qdc, Herkunft in QUELLEN.md)', () => {
  it('Ornio (handgeschrieben): Baum, isCodable, Beschreibung, Farbe', () => {
    const r = leseQdc(lies('ornio-handgeschrieben.qdc'), 'en');
    const je = (n: string) => r.codes.find(k => k.name === n)!;
    expect(r.codes.map(k => k.name).sort()).toEqual(['Diet', 'Health', 'Topics', 'Wellbeing']);
    expect(je('Topics').elternId).toBeUndefined();
    expect(je('Topics').kodierbar).toBe(false);
    expect(je('Health').elternId).toBe(je('Topics').id);
    expect(je('Diet').elternId).toBe(je('Health').id);
    expect(je('Wellbeing').elternId).toBe(je('Topics').id);
    expect(je('Health').definition).toBe('Anything about physical or mental health');
    expect(je('Health').farbe?.toLowerCase()).toBe('#33cc33');
    expect(je('Topics').farbe).toBeUndefined();
    expect(je('Health').anker ?? []).toEqual([]);
  });
  it('ATLAS.ti 26: Groß-GUIDs werden klein, flache Codes ohne Farbe', () => {
    const r = leseQdc(lies('atlasti-26-zwei-codes.qdc'), 'en');
    expect(r.codes.map(k => k.name).sort()).toEqual(['hello', 'test']);
    expect(r.codes.map(k => k.id).sort()).toEqual(['0c41517e-5550-4cb1-aa28-f2ad129e9d7e', '3d55043a-ac91-4319-a336-5f821c3b0af0']);
    expect(r.codes.every(k => k.elternId === undefined && k.farbe === undefined && k.kodierbar)).toBe(true);
  });
  it('GUIDs in geschweiften Klammern und in Großbuchstaben werden vereinheitlicht', () => {
    const x = `<?xml version="1.0"?><CodeBook xmlns="${NS}"><Codes><Code guid="{ABCDEF01-0000-4000-8000-00000000000A}" name="K" isCodable="true"><Code guid="ABCDEF01-0000-4000-8000-00000000000B" name="L" isCodable="true"/></Code></Codes></CodeBook>`;
    const r = leseQdc(x, 'de');
    expect(r.codes.find(k => k.name === 'K')!.id).toBe('abcdef01-0000-4000-8000-00000000000a');
    expect(r.codes.find(k => k.name === 'L')!.elternId).toBe('abcdef01-0000-4000-8000-00000000000a');
  });
  it('Sets werden gemeldet und übersprungen (Codes bleiben)', () => {
    const x = `<?xml version="1.0"?><CodeBook xmlns="${NS}"><Codes><Code guid="${G(1)}" name="K" isCodable="true"/></Codes><Sets><Set guid="${G(7)}" name="Menge"><MemberCode guid="${G(1)}"/></Set></Sets></CodeBook>`;
    const r = leseQdc(x, 'de');
    expect(r.codes).toHaveLength(1);
    expect(r.meldungen.some(m => /sets?/i.test(m.art + ' ' + m.satz))).toBe(true);
    expect(r.meldungen.every(m => m.satz.length > 0)).toBe(true);
  });
});

describe('leseQdc: Ablehnen (wirft QdcFehler mit code)', () => {
  it('Datei mit <!DOCTYPE (auch mit Entity): code "doctype"', () => {
    const x = `<?xml version="1.0"?><!DOCTYPE CodeBook [<!ENTITY e "BOOM">]><CodeBook xmlns="${NS}"><Codes><Code guid="${G(1)}" name="&e;" isCodable="true"/></Codes></CodeBook>`;
    expect(fehlercode(x)).toBe('doctype');
  });
  it('Text über 5 MB: code "zugross"', () => {
    const kopf = `<?xml version="1.0"?><CodeBook xmlns="${NS}"><Codes><Code guid="${G(1)}" name="K" isCodable="true"><Description>`;
    expect(fehlercode(kopf + 'a'.repeat(5 * 1024 * 1024 + 1) + '</Description></Code></Codes></CodeBook>')).toBe('zugross');
  });
  it('kaputtes XML: code "kaputt"', () => {
    expect(fehlercode('<CodeBook xmlns="' + NS + '"><Codes>')).toBe('kaputt');
  });
  it('falsche Wurzel: code "wurzel"', () => {
    expect(fehlercode('<Project xmlns="urn:QDA-XML:project:1.0"/>')).toBe('wurzel');
  });
  it('leerer Text: code "leer"', () => {
    expect(fehlercode('')).toBe('leer');
    expect(fehlercode('   \n ')).toBe('leer');
  });
  it('QdcFehler ist ein Error mit lesbarer Meldung', () => {
    try { leseQdc('', 'de'); throw new Error('nicht geworfen'); } catch (e) { expect(e).toBeInstanceOf(QdcFehler); expect(e).toBeInstanceOf(Error); expect((e as Error).message.length).toBeGreaterThan(0); }
  });
});

describe('Entscheide 4E (Fachblatt, Punkte 1-8)', () => {
  const lesen = (beschr: string, sprache: 'de' | 'en' = 'de') =>
    leseQdc(`<?xml version="1.0"?><CodeBook xmlns="${NS}"><Codes><Code guid="${G(1)}" name="K" isCodable="true"><Description>${beschr}</Description></Code></Codes></CodeBook>`, sprache).codes[0]!;
  const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

  it('1: Beschreibung ohne Etiketten ist ganz die Definition', () => {
    const k = lesen('Nur ein Text\n\nmit Leerzeile.');
    expect(k.definition).toBe('Nur ein Text\n\nmit Leerzeile.');
    expect(k.anker ?? []).toEqual([]);
    expect(k.regel).toBeUndefined();
  });
  it('1: Etikett mitten in einer Zeile zählt nicht; nach einer Leerzeile am Zeilenanfang schon', () => {
    expect(lesen('Er sagte: Ankerbeispiel: so nicht').definition).toBe('Er sagte: Ankerbeispiel: so nicht');
    const k = lesen('Eine Definition.\n\nAnkerbeispiel: Beispiel');
    expect(k.definition).toBe('Eine Definition.');
    expect(k.anker!.map(a => a.text)).toEqual(['Beispiel']);
  });
  it('2: ohne Definition beginnt Description direkt mit dem Etikett, ohne führende Leerzeile', () => {
    const x = schreibeQdc([c({ id: G(1), name: 'K', reihenfolge: 0, anker: [{ text: 'A' }], regel: 'R' })], 'de');
    const b = x.match(/<Description>([\s\S]*?)<\/Description>/)![1]!.replace(/\r\n/g, '\n');
    expect(b).toBe('Ankerbeispiel: A\n\nKodierregel: R');
    const nur = schreibeQdc([c({ id: G(1), name: 'K', reihenfolge: 0, regel: 'R' })], 'en');
    expect(nur.match(/<Description>([\s\S]*?)<\/Description>/)![1]).toBe('Coding rule: R');
    const r = leseQdc(x, 'de').codes[0]!;
    expect(r.definition || undefined).toBeUndefined();
    expect(r.anker!.map(a => a.text)).toEqual(['A']);
    expect(r.regel).toBe('R');
  });
  it('3: Id ohne GUID-Form beim Lesen: neue GUID, Meldung mit Anzahl, Baum bleibt heil', () => {
    const x = `<?xml version="1.0"?><CodeBook xmlns="${NS}"><Codes><Code guid="c001" name="A" isCodable="true"><Code guid="c21" name="B" isCodable="true"/></Code><Code guid="${G(5)}" name="C" isCodable="true"/></Codes></CodeBook>`;
    const r = leseQdc(x, 'de');
    expect(r.codes).toHaveLength(3);
    expect(r.codes.every(k => GUID.test(k.id))).toBe(true);
    const a = r.codes.find(k => k.name === 'A')!, b = r.codes.find(k => k.name === 'B')!;
    expect(b.elternId).toBe(a.id);
    expect(a.id).not.toBe(b.id);
    expect(r.codes.find(k => k.name === 'C')!.id).toBe(G(5));
    expect(r.meldungen.some(m => /\b2\b/.test(m.satz))).toBe(true);
  });
  it('3: Id ohne GUID-Form beim Schreiben: neue GUID nur in der Datei, Eltern-Bezug bleibt', () => {
    const x = schreibeQdc([c({ id: 'k1', name: 'Eltern', reihenfolge: 0 }), c({ id: 'k2', name: 'Kind', elternId: 'k1', reihenfolge: 0 })], 'de');
    expect(x).not.toMatch(/guid="k\d"/);
    expect(x).toMatch(/guid="[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}"/);
    expect(block(x, 'Eltern')).toContain('name="Kind"');
  });
  it('5: Zeilenumbruch im Ankerbeispiel wird zu einem Leerzeichen; segment wird nicht geschrieben', () => {
    const x = schreibeQdc([c({ id: G(1), name: 'K', reihenfolge: 0, anker: [{ text: 'erste\nzweite\r\ndritte', segment: 'seg-1' }] })], 'de');
    expect(x).toContain('Ankerbeispiel: erste zweite dritte');
    expect(x).not.toContain('seg-1');
    expect(leseQdc(x, 'de').codes[0]!.anker).toEqual([{ text: 'erste zweite dritte' }]);
  });
  it('6: beide Etiketten-Sprachen werden erkannt, egal in welcher Sprache gelesen wird', () => {
    for (const sprache of ['de', 'en'] as const) {
      for (const x of [schreibeQdc(REICH, 'en'), schreibeQdc(REICH, 'de')]) {
        const k = leseQdc(x, sprache).codes.find(q => q.name === 'Zeitplanung')!;
        expect(k.definition).toBe('Aussagen darüber, wie die Person ihre Zeit einteilt.');
        expect(k.anker!.map(a => a.text)).toEqual(['Ich schreibe mir jeden Sonntag auf, was ansteht.', 'Ohne Kalender ginge nichts.']);
        expect(k.regel).toBe('Nur, wenn die Planung im Vordergrund steht.');
      }
    }
  });
  it('7: reihenfolge nach dem Lesen je Geschwistergruppe 0, 1, 2 …', () => {
    const k = [c({ id: G(1), name: 'W1', reihenfolge: 10 }), c({ id: G(2), name: 'W2', reihenfolge: 3 }), c({ id: G(3), name: 'W3', reihenfolge: 7 }),
      c({ id: G(4), name: 'K1', elternId: G(2), reihenfolge: 5 }), c({ id: G(5), name: 'K2', elternId: G(2), reihenfolge: 9 })];
    const r = leseQdc(schreibeQdc(k, 'de'), 'de').codes;
    const platz = (n: string) => r.find(q => q.name === n)!.reihenfolge;
    expect([platz('W2'), platz('W3'), platz('W1')]).toEqual([0, 1, 2]);
    expect([platz('K1'), platz('K2')]).toEqual([0, 1]);
  });
  it('8: Farben beim Lesen: #rgb wird #rrggbb, alles klein', () => {
    const x = (f: string) => leseQdc(`<?xml version="1.0"?><CodeBook xmlns="${NS}"><Codes><Code guid="${G(1)}" name="K" isCodable="true" color="${f}"/></Codes></CodeBook>`, 'de').codes[0]!.farbe;
    expect(x('#fa0')).toBe('#ffaa00');
    expect(x('#ABCDEF')).toBe('#abcdef');
    expect(x('#F0A')).toBe('#ff00aa');
  });
});

// Gegenprobe gegen das echte Schema (XSD liegt nicht im Git): nur mit REFI_XSD_DIR
describe.skipIf(!process.env.REFI_XSD_DIR)('geschriebene Datei gegen Codebook.xsd (scripts/qdc-pruefen.py)', () => {
  const skript = fileURLToPath(new URL('../../../scripts/qdc-pruefen.py', import.meta.url));
  const pruefe = (xml: string) => {
    const d = mkdtempSync(join(tmpdir(), 'qdc-'));
    try {
      const f = join(d, 't.qdc');
      writeFileSync(f, xml, 'utf8');
      for (const exe of [['py'], ['python3'], ['python']]) {
        const r = spawnSync(exe[0]!, [skript, f], { encoding: 'utf8', env: process.env });
        if (r.error) continue;
        return { code: r.status, fehler: r.stderr };
      }
      throw new Error('Python nicht gefunden');
    } finally { rmSync(d, { recursive: true, force: true }); }
  };
  it('reicher Baum (de und en) ist gültig', () => {
    for (const s of ['de', 'en'] as const) { const r = pruefe(schreibeQdc(REICH, s)); expect(r.fehler).toBe(''); expect(r.code).toBe(0); }
  });
  it('Sonderzeichen, Klammer-GUID und Großbuchstaben-Farbe sind gültig', () => {
    const k = [c({ id: '{A1B2C3D4-0000-4000-8000-0000000000AB}', name: 'A & <B> "C"', reihenfolge: 0, farbe: '#ABCDEF', definition: 'x & y', anker: [{ text: 'a < b' }] })];
    const r = pruefe(schreibeQdc(k, 'de')); expect(r.fehler).toBe(''); expect(r.code).toBe(0);
  });
  it('das Prüfskript erkennt ein leeres <Codes/> als ungültig', () => {
    expect(pruefe(`<?xml version="1.0"?><CodeBook xmlns="${NS}"><Codes/></CodeBook>`).code).toBe(1);
  });
  it('die fremden Testdateien sind selbst gültig', () => {
    for (const n of ['ornio-handgeschrieben.qdc', 'atlasti-26-zwei-codes.qdc']) expect(pruefe(lies(n)).code).toBe(0);
  });
});
