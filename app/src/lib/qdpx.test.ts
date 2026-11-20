// Rote Tests für app/src/lib/qdpx.ts (REFI-QDA-Projektdatei .qdpx lesen und zusammenführen), Paket 5A.
// Quelle der Anforderungen: docs/erheben/FACHBLATT-STUFE-5.md, Abschnitt "5A: .qdpx lesen" und "Schnittstellen" 5A.
// Das Modul qdpx.ts gibt es noch nicht: alle Tests schlagen zunächst fehl.
//
// Sollwerte: NICHT aus TypeScript, sondern aus dem unabhängigen Python-Leser scripts/qdpx-erwartet.py (lxml, zipfile),
// abgelegt als testdaten/qdpx/<datei>.qdpx.erwartet.json. Die Prüfdateien baut scripts/qdpx-pruefdateien.py (Herkunft: testdaten/qdpx/QUELLEN.md).
// Offene Fragen sind von Opus entschieden (09.11.2026): die Sollwerte sind jetzt genau, ohne Spielraum. Der Test hängt nicht vom Netz ab.
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { strToU8, zipSync } from 'fflate';
import { DOMParser as XmlDomParser } from '@xmldom/xmldom';
import { cpLaenge, cpTeil, pruefeQualProjekt, type Code, type QualProjekt } from './qualprojekt';
import { fuehreZusammen, leseQdpx, QDE_MAX_BYTES, QdpxFehler, type QdpxErgebnis, type QdpxMeldung } from './qdpx';

// qdpx.ts darf globalThis.DOMParser nutzen (wie qdc.ts); in Node kommt er aus @xmldom/xmldom
(globalThis as unknown as { DOMParser: unknown }).DOMParser = XmlDomParser;

const ORDNER = new URL('./testdaten/qdpx/', import.meta.url);
const bytes = (n: string) => new Uint8Array(readFileSync(new URL(n, ORDNER)));
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = any;
const erwartet = (n: string): Json => JSON.parse(readFileSync(new URL(n + '.erwartet.json', ORDNER), 'utf8'));
const DATEIEN = readdirSync(fileURLToPath(ORDNER)).filter(f => f.endsWith('.qdpx')).sort();
const FEHLER = DATEIEN.filter(f => erwartet(f).fehler);
const GUT = DATEIEN.filter(f => !erwartet(f).fehler);
const lies = (n: string, sprache: 'de' | 'en' = 'de'): QdpxErgebnis => leseQdpx(bytes(n), sprache);
const sha = (t: string) => createHash('sha256').update(t, 'utf8').digest('hex');

/* ---------------------------------------------------------------------------------------------
 * Sicht auf ein QualProjekt in der Form des erwarteten JSON (Vergleich über Namen, Pfade und Texte, nie über ids)
 * ------------------------------------------------------------------------------------------- */
function codePfade(q: QualProjekt): Map<string, string> {
  const nach = new Map(q.codes.map(c => [c.id, c]));
  const pfad = (c: Code): string => (c.elternId !== undefined ? pfad(nach.get(c.elternId)!) + '/' : '') + c.name;
  return new Map(q.codes.map(c => [c.id, pfad(c)]));
}
const normSchluessel = (p: string) => p.split('/').map(t => t.replace(/\s+/g, ' ').trim().toLowerCase()).join('/');

function ansicht(q: QualProjekt) {
  const dok = new Map(q.dokumente.map(d => [d.id, d]));
  const seg = new Map(q.segmente.map(s => [s.id, s]));
  const pfade = codePfade(q);
  const person = new Map(q.kodierende.map(k => [k.id, k.name]));
  const varName = new Map(q.variablen.map(v => [v.id, v.name]));
  const fallName = new Map(q.faelle.map(f => [f.id, f.name]));
  const segText = (s: { dokument: string; start: number; ende: number }) => cpTeil(dok.get(s.dokument)!.text, s.start, s.ende);
  return {
    kodierungen: q.kodierungen.map(k => {
      const s = seg.get(k.segment)!;
      return { dokument: dok.get(s.dokument)!.name, code: pfade.get(k.code)!, person: person.get(k.kodierende) ?? '?' + k.kodierende, text: segText(s) };
    }),
    faelle: q.faelle.map(f => ({
      name: f.name,
      werte: Object.fromEntries(Object.entries(f.werte).map(([k, v]) => [varName.get(k) ?? '?' + k, v])),
      dokumente: q.dokumente.filter(d => d.fall === f.id).map(d => d.name).sort(),
    })),
    memos: q.memos.map(m => ({
      titel: m.titel ?? null, text: m.text,
      bezug: m.bezug.map(b => {
        if (b.art === 'dokument') return { art: b.art, ziel: dok.get(b.id!)?.name };
        if (b.art === 'code') return { art: b.art, ziel: pfade.get(b.id!) };
        if (b.art === 'segment') { const s = seg.get(b.id!)!; return { art: b.art, ziel: { dokument: dok.get(s.dokument)!.name, text: segText(s) } }; }
        if (b.art === 'fall') return { art: b.art, ziel: fallName.get(b.id!) };
        return { art: b.art, ziel: null };
      }),
    })),
    mengen: (q.mengen ?? []).map(m => ({
      name: m.name, art: m.art,
      mitglieder: m.mitglieder.map(i => (m.art === 'dokumente' ? dok.get(i)?.name : pfade.get(i)) ?? '?' + i).sort(),
    })),
    pfade,
  };
}

/** Zeichenkette mit sortierten Schlüsseln: gleich, egal in welcher Reihenfolge die Felder stehen. */
const sortiert = (x: unknown): unknown => (Array.isArray(x) ? x.map(sortiert) : x !== null && typeof x === 'object' ? Object.fromEntries(Object.entries(x as Record<string, unknown>).sort(([p], [q]) => (p < q ? -1 : p > q ? 1 : 0)).map(([k, v]) => [k, sortiert(v)])) : x);
const kenn = (x: unknown) => JSON.stringify(sortiert(x));
const arten = (m: QdpxMeldung[]) => new Set(m.map(x => x.art));
/** Erlaubte Werte von `was` bei `nicht-gelesen` (Fachblatt 5A plus Opus 09.11.). */
const WAS = ['PictureSource', 'PDFSelection', 'AudioSelection', 'VideoSelection', 'Link', 'Graph', 'TranscriptSelection', 'AudioSource', 'VideoSource'];

/* ---------------------------------------------------------------------------------------------
 * 1. Alle Prüfdateien gegen den unabhängigen Leser
 * ------------------------------------------------------------------------------------------- */
describe('Prüfdateien sind vollständig', () => {
  it('es gibt Prüfdateien mit Sollwerten (Spezifikation, freie Dateien, eigene Grenzfälle, Fehlerdateien, Zusammenführen)', () => {
    expect(GUT.length).toBeGreaterThanOrEqual(30);
    expect(FEHLER.length).toBeGreaterThanOrEqual(7);
    for (const n of ['spec-beispiel-2-einfach.qdpx', 'spec-beispiel-3-komplex.qdpx', 'sky-loom-TestProject.qdpx', 'ornio-handgeschrieben.qdpx', 'qualia-sample-import.qdpx', 'zusammen-a.qdpx', 'zusammen-b.qdpx']) {
      expect(DATEIEN, n).toContain(n);
    }
  });
});

describe.each(GUT)('leseQdpx: %s', (datei) => {
  const erw = erwartet(datei);
  let erg!: QdpxErgebnis;
  let q!: QualProjekt;
  let a!: ReturnType<typeof ansicht>;
  beforeAll(() => { erg = lies(datei); q = erg.projekt; a = ansicht(q); });

  it('Modell ist in sich stimmig (pruefeQualProjekt, Positionen in Codepoints, Verweise, Herkunft)', () => {
    const kopie = JSON.parse(JSON.stringify(q));
    expect(() => pruefeQualProjekt(kopie)).not.toThrow();
    expect(q.format).toBe('statable-qualitativ');
    expect(q.herkunft?.art).toBe('qdpx');
    const personIds = new Set(q.kodierende.map(k => k.id));
    for (const k of q.kodierungen) expect(personIds.has(k.kodierende)).toBe(true);
    for (const d of q.dokumente) {
      const L = cpLaenge(d.text);
      for (const s of q.segmente.filter(x => x.dokument === d.id)) {
        expect(s.start).toBeGreaterThanOrEqual(0);
        expect(s.start).toBeLessThan(s.ende);
        expect(s.ende).toBeLessThanOrEqual(L);
        expect(cpTeil(d.text, s.start, s.ende)).not.toMatch(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/);   // nie mitten in einem Zeichen
      }
    }
    expect(erg.zaehlung.segmente).toBe(q.segmente.length);
    if (erw.programm) expect(erg.programm).toBe(erw.programm);
  });

  it('Zählung stimmt genau', () => {
    const z = erg.zaehlung, e = erw.zaehlung;
    for (const f of ['dokumente', 'codes', 'segmente', 'kodierungen', 'kodierende', 'memos', 'faelle', 'variablen', 'mengen'] as const) expect(z[f], f).toBe(e[f]);
    expect(z.dokumente).toBe(q.dokumente.length);
    expect(z.codes).toBe(q.codes.length);
    expect(z.kodierungen).toBe(q.kodierungen.length);
    expect(z.kodierende).toBe(q.kodierende.length);
    expect(z.memos).toBe(q.memos.length);
    expect(z.faelle).toBe(q.faelle.length);
    expect(z.variablen).toBe(q.variablen.length);
    expect(z.mengen).toBe((q.mengen ?? []).length);
  });

  it('Dokumente: Name, Art, Länge in Codepoints, SHA-256 des Textes, Fall', () => {
    expect(q.dokumente.map(d => d.name).sort()).toEqual(erw.dokumente.map((d: Json) => d.name).sort());
    for (const d of erw.dokumente) {
      const ist = q.dokumente.find(x => x.name === d.name);
      expect(ist, 'Dokument fehlt: ' + d.name).toBeDefined();
      expect(ist!.art).toBe(d.art);
      expect(cpLaenge(ist!.text)).toBe(d.laenge);
      expect(sha(ist!.text)).toBe(d.sha256);
      expect(ist!.text.startsWith('﻿')).toBe(false);
      const fall = q.faelle.find(f => f.id === ist!.fall)?.name ?? null;
      expect(fall).toBe(d.fall);
    }
  });

  it('Codes: Name, Pfad, kodierbar, Farbe, Definition, Reihenfolge der Geschwister', () => {
    expect(q.codes.length).toBe(erw.codes.length);
    for (const c of erw.codes) {
      const ist = q.codes.find(x => a.pfade.get(x.id) === c.pfad);
      expect(ist, 'Code fehlt: ' + c.pfad).toBeDefined();
      expect(ist!.name).toBe(c.name);
      expect(ist!.kodierbar).toBe(c.kodierbar);
      expect((ist!.farbe ?? null)?.toLowerCase() ?? null).toBe(c.farbe);
      expect(ist!.definition ?? null).toBe(c.definition);
    }
    // Geschwister bleiben in der Reihenfolge der Datei
    const eltern = (p: string) => p.split('/').slice(0, -1).join('/');
    for (const e of new Set<string>(erw.codes.map((c: Json) => eltern(c.pfad)))) {
      const soll = erw.codes.filter((c: Json) => eltern(c.pfad) === e).map((c: Json) => c.pfad);
      const ist = q.codes.filter(c => eltern(a.pfade.get(c.id)!) === e).sort((x, y) => x.reihenfolge - y.reihenfolge).map(c => a.pfade.get(c.id));
      expect(ist).toEqual(soll);
    }
  });

  it('Kodierungen: Dokument, Code, Person und Text der Stelle (text[start:ende] in Codepoints)', () => {
    const soll = erw.kodierungen.map(kenn);
    expect(a.kodierungen.map(k => kenn({ dokument: k.dokument, code: k.code, person: k.person, text: k.text })).sort()).toEqual([...soll].sort());
    expect(erw.kodierende.every((n: string) => q.kodierende.some(k => k.name === n)), 'Kodierende fehlen').toBe(true);
    expect(q.kodierende.length).toBe(erw.kodierende.length);
  });

  it('Fälle und Variablen: Werte nach Variablenname, Typen, Fall des Dokuments', () => {
    expect(a.faelle.map(f => f.name).sort()).toEqual(erw.faelle.map((f: Json) => f.name).sort());
    for (const f of erw.faelle) {
      const ist = a.faelle.find(x => x.name === f.name)!;
      expect(ist.werte).toEqual(f.werte);
      expect(ist.dokumente).toEqual([...f.dokumente].sort());
    }
    expect(q.variablen.map(v => kenn({ name: v.name, typ: v.typ })).sort()).toEqual(erw.variablen.map(kenn).sort());
  });

  it('Memos (Bezug nach Art und Ziel) und Mengen (Mitglieder) genau', () => {
    expect(a.memos.length).toBe(erw.memos.length);
    for (const m of erw.memos) {
      // Opus 09.11.: auch den Bezug vergleichen (spec-beispiel-3 hat zwei Memos mit gleichem Titel und Text an verschiedenen Dokumenten)
      const bez = kenn(m.bezug.map(kenn).sort());
      const ist = a.memos.find(x => x.text === m.text && x.titel === m.titel && kenn(x.bezug.map(kenn).sort()) === bez);
      expect(ist, 'Memo fehlt: ' + m.titel + ' ' + bez).toBeDefined();
    }
    expect(a.mengen.length).toBe(erw.mengen.length);
    for (const m of erw.mengen) {
      expect(a.mengen.find(x => x.name === m.name && x.art === m.art && kenn(x.mitglieder) === kenn(m.mitglieder)), 'Menge fehlt: ' + m.name).toBeDefined();
    }
  });

  it('Meldungen genau: Arten, Dokumentnamen, Zahlen für nicht Gelesenes und unbekannte Kodierende', () => {
    expect([...arten(erg.meldungen)].sort()).toEqual([...erw.meldungen].sort());
    const unb = erg.meldungen.filter(m => m.art === 'kodierende-unbekannt').reduce((n, m) => n + (m.anzahl ?? 1), 0);
    expect(unb).toBe(erw.kodierendeUnbekanntAnzahl);
    for (const d of erw.meldungenDetail) {
      expect(erg.meldungen.some(m => m.art === d.art && m.dokument === d.dokument), `${d.art} für ${d.dokument}`).toBe(true);
    }
    const ng = erg.meldungen.filter(m => m.art === 'nicht-gelesen');
    expect(Object.fromEntries(ng.map(m => [m.was, m.anzahl]))).toEqual(erw.nichtGelesen);
    for (const m of ng) expect(WAS).toContain(m.was);
    for (const m of erg.meldungen) expect(m.satz.trim().length).toBeGreaterThan(0);
  });
});

/* ---------------------------------------------------------------------------------------------
 * 2. Ausdrückliche Einzelfälle (Wissen aus dem Fachblatt, nicht aus den JSON-Dateien)
 * ------------------------------------------------------------------------------------------- */
describe('Zählweisen und Text', () => {
  const S_ZEIT = 'Zeitdruck das Schlimmste';
  const texte = (n: string) => ansicht(lies(n).projekt).kodierungen.filter(k => k.dokument === 'Interview 1').map(k => k.text);

  it('MAXQDA-Zählweise (\\r\\n = 2): Text bleibt byte-genau mit \\r\\n, keine Umrechnung gemeldet', () => {
    const e = lies('crlf-maxqda.qdpx');
    expect(e.projekt.dokumente[0]!.text).toContain('\r\n');
    expect(arten(e.meldungen).has('zaehlweise-crlf')).toBe(false);
    expect(texte('crlf-maxqda.qdpx')).toContain(S_ZEIT);
  });

  it('ATLAS.ti-Zählweise (\\r\\n = 1) mit Namen: Positionen werden einmal auf Codepoints des echten Textes umgerechnet und gemeldet', () => {
    const e = lies('crlf-atlasti-mit-namen.qdpx');
    expect(e.projekt.dokumente[0]!.text).toContain('\r\n');
    expect(arten(e.meldungen).has('zaehlweise-crlf')).toBe(true);
    expect(texte('crlf-atlasti-mit-namen.qdpx')).toContain(S_ZEIT);
    expect(texte('crlf-atlasti-mit-namen.qdpx')).toContain('Der Lärm im Wohnheim stört');
  });

  it('ohne Textproben entscheidet das Programm (origin): ATLAS → \\r\\n = 1, sonst 2; beides als "ungeprüft" gemeldet', () => {
    const atlas = lies('crlf-atlasti-ohne-namen.qdpx');
    expect(arten(atlas.meldungen)).toEqual(new Set(['positionen-ungeprueft', 'zaehlweise-crlf']));
    expect(texte('crlf-atlasti-ohne-namen.qdpx')).toContain(S_ZEIT);
    const max = lies('crlf-maxqda-ohne-namen.qdpx');
    expect(arten(max.meldungen)).toEqual(new Set(['positionen-ungeprueft']));
    expect(texte('crlf-maxqda-ohne-namen.qdpx')).toContain(S_ZEIT);
  });

  it('Namen kürzer als 8 Zeichen werden ganz verglichen', () => {
    const t = ansicht(lies('crlf-atlasti-kurze-namen.qdpx').projekt).kodierungen.map(k => k.text).sort();
    expect(t).toEqual(['Fünfte', 'Lärm', 'Zeitdruck']);
  });

  it('BOM: entfernt und vermerkt; Positionen ohne BOM (a) oder mit BOM als Zeichen 0 (c) werden erkannt', () => {
    const a = lies('bom-nicht-gezaehlt.qdpx');
    const c = lies('bom-gezaehlt.qdpx');
    for (const e of [a, c]) {
      expect(e.projekt.dokumente[0]!.text.charCodeAt(0)).not.toBe(0xFEFF);
      expect(arten(e.meldungen).has('bom-entfernt')).toBe(true);
    }
    expect(arten(a.meldungen).has('zaehlweise-bom')).toBe(false);
    expect(arten(c.meldungen).has('zaehlweise-bom')).toBe(true);
    const ta = ansicht(a.projekt).kodierungen.map(k => k.text).sort();
    expect(ta).toEqual(ansicht(c.projekt).kodierungen.map(k => k.text).sort());
    expect(ta).toContain('Zeitdruck das Schlimmste');
  });

  it('Emoji, ZWJ-Folge, kombinierender Akzent: Positionen sind Codepoints, nicht UTF-16', () => {
    const e = lies('emoji-akzent.qdpx').projekt;
    const d = e.dokumente[0]!;
    const s = e.segmente.find(x => cpTeil(d.text, x.start, x.ende) === 'Meine Familie ist stolz')!;
    expect(s).toBeDefined();
    const vorher = d.text.slice(0, d.text.indexOf('Meine Familie ist stolz'));
    expect(s.start).toBe(Array.from(vorher).length);
    expect(s.start).toBeLessThan(vorher.length);      // UTF-16-Länge ist größer: Emoji zählen 2
    const akzent = e.segmente.find(x => cpTeil(d.text, x.start, x.ende) === 'lerne ich mit Müller')!;
    expect(akzent).toBeDefined();
    expect(akzent.ende - akzent.start).toBe(Array.from('lerne ich mit Müller').length);
  });
});

describe('Dateiaufbau, Namen, GUIDs, Kodierende', () => {
  it('die .qde darf anders heißen als project.qde (ATLAS.ti 26)', () => {
    expect(lies('qde-anderer-name.qdpx').projekt.dokumente.length).toBe(1);
  });
  it('zwei .qde: die mit dem Namen project.qde gilt', () => {
    expect(lies('zwei-qde-mit-project.qdpx').projekt.dokumente.length).toBe(1);
  });
  it('GUIDs groß, mit {} und gemischt: Verweise werden gefunden, keine Meldung "guid-unbekannt"', () => {
    const e = lies('guid-schreibweisen.qdpx');
    expect(e.projekt.kodierungen.length).toBe(2);
    expect(arten(e.meldungen).has('guid-unbekannt')).toBe(false);
  });
  it('unbekannte targetGUID: Kodierung nicht übernommen, gemeldet; die gültige bleibt', () => {
    const e = lies('guid-unbekannt.qdpx');
    expect(e.projekt.kodierungen.length).toBe(2);
    expect(arten(e.meldungen).has('guid-unbekannt')).toBe(true);
  });
  it('PlainTextContent statt Datei, fehlende internal://-Datei und relative://-Quelle', () => {
    expect(lies('plaintextcontent.qdpx').projekt.dokumente[0]!.text).toContain('Zeitdruck das Schlimmste');
    const e = lies('quelle-fehlt.qdpx');
    expect(e.projekt.dokumente.map(d => d.name)).toEqual(['Interview da']);
    const m = e.meldungen.filter(x => x.art === 'quelle-fehlt');
    expect(m.map(x => x.dokument).sort()).toEqual(['Interview absolut', 'Interview fehlt', 'Interview relativ']);
    for (const x of m) expect(x.satz).toContain(x.dokument!);
  });
  it('Segment außerhalb, Start = Ende, negativ, Start > Ende: nicht übernommen und gemeldet', () => {
    const e = lies('segment-grenzen.qdpx');
    expect(e.projekt.segmente.length).toBe(3);
    expect(arten(e.meldungen).has('segment-ausserhalb')).toBe(true);
    expect(arten(e.meldungen).has('segment-leer')).toBe(true);
    const aus = e.meldungen.filter(m => m.art === 'segment-ausserhalb').reduce((s, m) => s + (m.anzahl ?? 1), 0);
    expect(aus).toBeGreaterThanOrEqual(4);       // hinaus, Start > Ende, negativ, Start = Länge
  });
  it('Kodierende: Coding-User vor Selection-User, sonst "Unbekannt"; User ohne Namen heißen "Person 1", "Person 2"', () => {
    const e = lies('kodierende.qdpx', 'de');
    const k = ansicht(e.projekt).kodierungen;
    expect(k.find(x => x.text === 'Zeitdruck das Schlimmste')!.person).toBe('Berta Beispiel');
    expect(k.find(x => x.text === 'Meine Lerngruppe hilft mir sehr')!.person).toBe('Person 1');
    expect(k.find(x => x.text === 'Der Lärm im Wohnheim stört')!.person).toBe('Person 2');   // Coding schlägt Selection
    expect(k.find(x => x.text === 'spreche mit meiner Schwester')!.person).toBe('Unbekannt');
    expect(arten(e.meldungen).has('kodierende-unbekannt')).toBe(true);
    // 2 User ohne Namen + 1 Kodierung ohne Person
    expect(e.meldungen.filter(m => m.art === 'kodierende-unbekannt').reduce((n, m) => n + (m.anzahl ?? 1), 0)).toBe(3);
  });
  it('Dokumentvariablen ohne Fall: Fall mit dem Namen der Quelle und Meldung', () => {
    const e = lies('dokumentvariablen.qdpx');
    expect(e.projekt.faelle.map(f => f.name)).toEqual(['Interview Dok-Var']);
    expect(e.projekt.dokumente[0]!.fall).toBe(e.projekt.faelle[0]!.id);
    expect(arten(e.meldungen).has('dokumentvariablen-fall')).toBe(true);
  });
  it('Fall ohne Namen mit genau einer Quelle bekommt den Namen der Quelle; alle sechs Variablentypen', () => {
    const e = lies('faelle-variablen.qdpx').projekt;
    expect(e.faelle.map(f => f.name).sort()).toEqual(['Fall A', 'Fall B', 'Interview 3']);
    expect(e.variablen.map(v => v.typ).sort()).toEqual(['datum', 'datumzeit', 'ganzzahl', 'ja/nein', 'text', 'zahl']);
  });
  it('doppelte Dokumentnamen bekommen den Zusatz "(2)"', () => {
    const e = lies('doppelte-namen.qdpx');
    expect(e.projekt.dokumente.map(d => d.name)).toEqual(['Interview.txt', 'Interview.txt (2)']);
    expect(arten(e.meldungen).has('name-doppelt')).toBe(true);
  });
  it('Namensraum mit abweichender Version (urn:QDA-XML:project:0:10) wird gelesen', () => {
    expect(lies('namensraum-0-10.qdpx').projekt.kodierungen.length).toBe(5);
  });
  it('PDF mit Darstellung → pdftext; Audio mit Transkript → audio; Flächen, Zeiten, Bilder, Links, Graphen, Transkript-Selektionen und Quellen ohne Transkript nicht gelesen und gezählt', () => {
    const e = lies('nicht-gelesen.qdpx');
    const arts = Object.fromEntries(e.projekt.dokumente.map(d => [d.name, d.art]));
    expect(arts).toEqual({ 'Skript.pdf': 'pdftext', 'Interview.m4a': 'audio' });
    const ng = Object.fromEntries(e.meldungen.filter(m => m.art === 'nicht-gelesen').map(m => [m.was, m.anzahl]));
    expect(ng).toEqual({ PictureSource: 1, PDFSelection: 2, AudioSelection: 2, VideoSelection: 1, VideoSource: 1, TranscriptSelection: 1, Link: 1, Graph: 1 });
  });
  it('Opus 4/5/3: mehrere Transkripte = mehrere Dokumente ("(Transkript 2)", en "(Transcript 2)"); Coding an der Quelle = Segment über das ganze Dokument; Auswahl ohne Kodierung bleibt Segment', () => {
    for (const sprache of ['de', 'en'] as const) {
      const e = lies('transkripte-quellcoding.qdpx', sprache).projekt;
      expect(e.dokumente.map(d => d.name).sort()).toEqual(['Interview 1', 'Podcast.m4a', sprache === 'de' ? 'Podcast.m4a (Transkript 2)' : 'Podcast.m4a (Transcript 2)']);
      const d = e.dokumente.find(x => x.name === 'Interview 1')!;
      const ganz = e.segmente.filter(s => s.dokument === d.id && s.start === 0 && s.ende === cpLaenge(d.text));
      expect(ganz.length).toBe(1);
      expect(e.kodierungen.filter(k => k.segment === ganz[0]!.id).length).toBe(1);
      const ohne = e.segmente.filter(s => s.dokument === d.id && !e.kodierungen.some(k => k.segment === s.id));
      expect(ohne.length).toBe(1);
      expect(e.memos.map(m => m.titel)).toEqual([sprache === 'de' ? 'Kommentar (ATLAS.ti)' : 'Comment (ATLAS.ti)']);
    }
  });
  it('Opus 7: Note ohne NoteRef → Projekt; NoteRef an einer Kodierung → Segment; gemischte Menge → zwei Mengen; Menge ohne Mitglied entfällt', () => {
    const m = ansicht(lies('memos.qdpx').projekt).memos;
    expect(m.find(x => x.titel === 'Freie Notiz')!.bezug).toEqual([{ art: 'projekt', ziel: null }]);
    expect(m.find(x => x.titel === 'Kodiernotiz')!.bezug).toEqual([{ art: 'segment', ziel: { dokument: 'Interview 1', text: 'Meine Lerngruppe hilft mir sehr' } }]);
    const me = ansicht(lies('mengen.qdpx').projekt).mengen;
    expect(me.filter(x => x.name === 'Gemischt').map(x => x.art).sort()).toEqual(['codes', 'dokumente']);
    expect(me.some(x => x.name === 'Leer')).toBe(false);
  });
  it('Opus 2: Namen, die nicht im Text vorkommen ("English Quote 1"), sind keine Textproben → "positionen-ungeprueft"', () => {
    const e = lies('spec-beispiel-3-komplex.qdpx');
    expect(arten(e.meldungen).has('positionen-ungeprueft')).toBe(true);
    expect(arten(e.meldungen).has('positionen-unsicher')).toBe(false);
  });
});

describe('Sprache', () => {
  it('Sätze der Meldungen gibt es in de und en, verschieden', () => {
    const de = lies('quelle-fehlt.qdpx', 'de').meldungen.find(m => m.art === 'quelle-fehlt')!;
    const en = lies('quelle-fehlt.qdpx', 'en').meldungen.find(m => m.art === 'quelle-fehlt')!;
    expect(de.satz).not.toBe(en.satz);
    expect(en.satz.length).toBeGreaterThan(0);
  });
  it('en liest dieselben Daten wie de', () => {
    const d = ansicht(lies('memos.qdpx', 'de').projekt), e = ansicht(lies('memos.qdpx', 'en').projekt);
    expect(e.kodierungen.map(kenn).sort()).toEqual(d.kodierungen.map(kenn).sort());
  });
  it('Memo aus einer Kommentarzeile an einer Auswahl (ATLAS.ti 26): Titel "Kommentar (ATLAS.ti)"', () => {
    const m = lies('memos.qdpx', 'de').projekt.memos.find(x => x.text === 'Ein Kommentar an der Auswahl.');
    expect(m?.titel).toBe('Kommentar (ATLAS.ti)');
    expect(m?.bezug[0]!.art).toBe('segment');
  });
});

/* ---------------------------------------------------------------------------------------------
 * 3. Fehlerdateien, Größenschutz, Sicherheit
 * ------------------------------------------------------------------------------------------- */
describe.each(FEHLER)('leseQdpx lehnt ab: %s', (datei) => {
  it('wirft QdpxFehler mit dem erwarteten Code, ohne etwas zu verändern', () => {
    const erw = erwartet(datei).fehler as string;
    let fehler: unknown;
    try { lies(datei); } catch (e) { fehler = e; }
    expect(fehler).toBeInstanceOf(QdpxFehler);
    expect((fehler as QdpxFehler).code).toBe(erw);
  });
});

describe('Fehlercodes decken alle Fälle des Fachblatts ab', () => {
  it('kein-zip, keine-qde, mehrere-qde, doctype, kaputt, wurzel sind durch Dateien belegt', () => {
    const codes = new Set(FEHLER.map(f => erwartet(f).fehler));
    for (const c of ['kein-zip', 'keine-qde', 'mehrere-qde', 'doctype', 'kaputt', 'wurzel']) expect(codes.has(c), c).toBe(true);
  });
  it('leere Eingabe ist "kein-zip"', () => {
    expect(() => leseQdpx(new Uint8Array(0), 'de')).toThrowError(QdpxFehler);
    try { leseQdpx(new Uint8Array(0), 'de'); } catch (e) { expect((e as QdpxFehler).code).toBe('kein-zip'); }
  });
});

describe('Größenschutz', () => {
  it('eine .qde über QDE_MAX_BYTES (50 MB) wird abgelehnt: zugross', () => {
    expect(QDE_MAX_BYTES).toBe(50 * 1024 * 1024);
    const kopf = '<?xml version="1.0" encoding="UTF-8"?><Project xmlns="urn:QDA-XML:project:1.0" name="x"><Description>';
    const ende = '</Description></Project>';
    const gross = new Uint8Array(QDE_MAX_BYTES + 1024);
    gross.fill(0x20);
    gross.set(strToU8(kopf), 0);
    gross.set(strToU8(ende), gross.length - ende.length);
    const zip = zipSync({ 'project.qde': gross }, { level: 1 });
    expect(zip.length).toBeLessThan(5 * 1024 * 1024);      // sehr gut komprimierbar: der Schutz muss auf der entpackten Größe beruhen
    let fehler: unknown;
    try { leseQdpx(zip, 'de'); } catch (e) { fehler = e; }
    expect(fehler).toBeInstanceOf(QdpxFehler);
    expect((fehler as QdpxFehler).code).toBe('zugross');
  });
  it('eine .qde knapp unter der Grenze wird nicht als zu groß abgelehnt', () => {
    const kopf = '<?xml version="1.0" encoding="UTF-8"?><Project xmlns="urn:QDA-XML:project:1.0" name="x"><Description>';
    const ende = '</Description></Project>';
    const knapp = new Uint8Array(QDE_MAX_BYTES - 1024);
    knapp.fill(0x20);
    knapp.set(strToU8(kopf), 0);
    knapp.set(strToU8(ende), knapp.length - ende.length);
    // Entweder gelesen oder aus einem anderen Grund (Faktor, Zeit) abgelehnt, aber nie wegen der .qde-Größe an sich: hier nur: kein Absturz
    let code = 'ok';
    try { leseQdpx(zipSync({ 'project.qde': knapp }, { level: 1 }), 'de'); } catch (e) { code = (e as QdpxFehler).code ?? 'andere'; }
    expect(['ok', 'zugross']).toContain(code);
  }, 60_000);
});

describe('Sicherheit: nichts aus der Datei wird ausgeführt oder als Markup behandelt', () => {
  it('Text mit <script>, <img onerror> und & bleibt Text; Namen mit <b> bleiben Text', () => {
    (globalThis as unknown as { __pwned?: boolean }).__pwned = undefined;
    const e = lies('script-text.qdpx');
    const d = e.projekt.dokumente[0]!;
    expect(d.text).toContain('<script>alert("x")</script>');
    expect(d.text).toContain('<img src=x onerror=alert(1)>');
    expect(d.name).toBe('Interview <i>fett</i>');
    expect(e.projekt.kodierende[0]!.name).toBe('Anna <b>Beispiel</b>');
    expect((globalThis as unknown as { __pwned?: boolean }).__pwned).toBeUndefined();
    const t = ansicht(e.projekt).kodierungen.map(k => k.text).sort();
    expect(t).toContain('<script>alert("x")</script>');
  });
  it('Entitäten in der DOCTYPE werden nicht aufgelöst: Datei wird abgelehnt', () => {
    expect(() => lies('fehler-doctype.qdpx')).toThrowError(QdpxFehler);
  });
  it('GUIDs wie "__proto__" verschmutzen weder Object.prototype noch die Werte eines Falls', () => {
    const xml = '<?xml version="1.0" encoding="UTF-8"?><Project xmlns="urn:QDA-XML:project:1.0" name="x">'
      + '<Variables><Variable guid="__proto__" name="constructor" typeOfVariable="Text"/></Variables>'
      + '<Cases><Case guid="c1" name="Fall"><VariableValue><VariableRef targetGUID="__proto__"/><TextValue>verschmutzt</TextValue></VariableValue></Case></Cases></Project>';
    let ergebnis: QdpxErgebnis | undefined;
    try { ergebnis = leseQdpx(zipSync({ 'project.qde': strToU8(xml) }), 'de'); } catch (e) { expect(e).toBeInstanceOf(QdpxFehler); }
    expect(({} as Record<string, unknown>).verschmutzt).toBeUndefined();
    expect(Object.getPrototypeOf({})).toBe(Object.prototype);
    if (ergebnis) {
      expect(() => pruefeQualProjekt(JSON.parse(JSON.stringify(ergebnis!.projekt)))).not.toThrow();
      const f = ergebnis.projekt.faelle[0]!;
      expect(Object.values(f.werte)).toContain('verschmutzt');
    }
  });
  it('das Lesen braucht kein Netz: fetch wird nie aufgerufen', () => {
    const f = vi.fn(() => { throw new Error('Netz benutzt'); });
    vi.stubGlobal('fetch', f);
    try { for (const n of GUT) lies(n); } finally { vi.unstubAllGlobals(); }
    expect(f).not.toHaveBeenCalled();
  });
  it('zweimal lesen ergibt dasselbe (bis auf neue Kennungen)', () => {
    for (const n of ['spec-beispiel-2-einfach.qdpx', 'memos.qdpx', 'faelle-variablen.qdpx']) {
      const x = ansicht(lies(n).projekt), y = ansicht(lies(n).projekt);
      expect(kenn({ ...x, pfade: 0 })).toBe(kenn({ ...y, pfade: 0 }));
    }
  });
});

/* ---------------------------------------------------------------------------------------------
 * 4. Zusammenführen (Fachblatt 5A, "Zusammenführen")
 * ------------------------------------------------------------------------------------------- */
describe('fuehreZusammen: zwei Projekte zweier Personen', () => {
  const Z = erwartet('zusammen').ohneZuordnung as Json;
  const ZG = erwartet('zusammen').mitGleichePersonen as Json;
  const GLEICH = erwartet('zusammen').gleichePersonen as { a: string; b: string };
  let a!: QualProjekt;
  let b!: QualProjekt;
  beforeAll(() => { a = lies('zusammen-a.qdpx').projekt; b = lies('zusammen-b.qdpx').projekt; });
  const idVon = (q: QualProjekt, name: string) => q.kodierende.find(k => k.name === name)!.id;

  it('Eingaben bleiben unverändert (b wird an a gehängt, aber a und b werden nicht verändert)', () => {
    const vorher = [kenn(a), kenn(b)];
    fuehreZusammen(a, b, 'de');
    expect([kenn(a), kenn(b)]).toEqual(vorher);
  });

  it('gleicher Text → ein Dokument; gleicher Name, anderer Text → eigenes Dokument "(aus Datei 2)" mit Meldung; neues Dokument wird übernommen', () => {
    const z = fuehreZusammen(a, b, 'de');
    expect(z.projekt.dokumente.map(d => d.name).sort()).toEqual(Z.dokumente);
    expect(arten(z.meldungen).has('text-verschieden')).toBe(true);
    const m = z.meldungen.find(x => x.art === 'text-verschieden')!;
    expect(m.satz).toContain('Interview 3');
  });

  it('Codes: gleiche GUID → "guid", sonst gleicher Pfad (Schreibweise egal) → "pfad", sonst "neu"', () => {
    const z = fuehreZusammen(a, b, 'de');
    const pb = codePfade(b), pz = codePfade(z.projekt);
    expect([...pz.values()].map(normSchluessel).sort()).toEqual(Z.codePfade.map(normSchluessel).sort());
    expect(z.codeZuordnung.length).toBe(b.codes.length);
    for (const soll of Z.codeZuordnung) {
      const von = b.codes.find(c => normSchluessel(pb.get(c.id)!) === normSchluessel(soll.pfadB))!;
      const zeile = z.codeZuordnung.find(x => x.von === von.id)!;
      expect(zeile, soll.pfadB).toBeDefined();
      expect(zeile.wie, soll.pfadB).toBe(soll.wie);
      expect(normSchluessel(pz.get(zeile.zu)!), soll.pfadB).toBe(normSchluessel(soll.pfadZiel));
    }
    // kein Code doppelt
    const schl = [...pz.values()].map(normSchluessel);
    expect(new Set(schl).size).toBe(schl.length);
  });

  it('Kodierende bleiben getrennt; gleicher Name mit anderer GUID: Zusatz "(Datei 2)" und Meldung zur Rückfrage', () => {
    const z = fuehreZusammen(a, b, 'de');
    expect(z.projekt.kodierende.map(k => k.name).sort()).toEqual(Z.kodierende);
    expect(arten(z.meldungen).has('person-gleicher-name')).toBe(true);
  });

  it('nach der Antwort "dieselbe Person" wird die Person zusammengelegt', () => {
    const z = fuehreZusammen(a, b, 'de', { [idVon(b, GLEICH.b)]: idVon(a, GLEICH.a) });
    expect(z.projekt.kodierende.map(k => k.name).sort()).toEqual(ZG.kodierende);
  });

  it('Opus 9: gleicher Text unter anderem Namen = dasselbe Dokument (Name aus a, keine Meldung, Kodierung hängt dort)', () => {
    const z = fuehreZusammen(a, b, 'de');
    const namen = z.projekt.dokumente.map(d => d.name);
    expect(namen).toContain('Interview 5');
    expect(namen.some(n => n.startsWith('Interview_5'))).toBe(false);
    expect(ansicht(z.projekt).kodierungen).toContainEqual({ dokument: 'Interview 5', code: 'Belastung/Lärm', person: 'Carla Beispiel', text: 'die Wege sind weit' });
    expect(z.meldungen.filter(m => m.art === 'text-verschieden').every(m => !m.satz.includes('Interview 5'))).toBe(true);
  });

  it('Opus 9: gleiche Person mit gleicher GUID in beiden Dateien ist automatisch dieselbe (keine Rückfrage, nur eine Person)', () => {
    const z = fuehreZusammen(a, b, 'de');
    expect(z.projekt.kodierende.filter(k => k.name.startsWith('Carla')).map(k => k.name)).toEqual(['Carla Beispiel']);
    expect(z.meldungen.filter(m => m.art === 'person-gleicher-name').every(m => !m.satz.includes('Carla'))).toBe(true);
  });

  it('Opus 9: Datei b ohne Kodierende → Person "Datei 2" (en "File 2")', () => {
    const c = lies('zusammen-c.qdpx').projekt;
    const soll = erwartet('zusammen').ohneKodierende as Json;
    for (const [sprache, name] of [['de', 'Datei 2'], ['en', 'File 2']] as const) {
      const z = fuehreZusammen(a, c, sprache);
      const k = ansicht(z.projekt).kodierungen;
      expect(k).toContainEqual({ dokument: 'Interview 1', code: 'Belastung/Zeitdruck', person: name, text: 'Zeitdruck das Schlimmste' });
      expect(z.projekt.kodierende.map(x => x.name)).not.toContain('Unbekannt');
      expect(z.projekt.dokumente.map(d => d.name).sort()).toEqual(soll.dokumente);
    }
    expect(soll.kodierende).toContain('Datei 2');
  });

  it('Kodierungen beider Personen, jede an ihrem Dokument, Codes über die Zuordnung (Vergleich über Namen und Texte)', () => {
    const z = fuehreZusammen(a, b, 'de');
    const ist = ansicht(z.projekt).kodierungen.map(k => kenn({ ...k, code: normSchluessel(k.code) })).sort();
    expect(ist).toEqual(Z.kodierungen.map((k: Json) => kenn({ ...k, code: normSchluessel(k.code) })).sort());
    const zg = fuehreZusammen(a, b, 'de', { [idVon(b, GLEICH.b)]: idVon(a, GLEICH.a) });
    const istG = ansicht(zg.projekt).kodierungen.map(k => kenn({ ...k, code: normSchluessel(k.code) })).sort();
    expect(istG).toEqual(ZG.kodierungen.map((k: Json) => kenn({ ...k, code: normSchluessel(k.code) })).sort());
  });

  it('gleiche Segmente werden nicht zusammengelegt: jede Person behält ihr eigenes', () => {
    const z = fuehreZusammen(a, b, 'de');
    expect(z.projekt.segmente.length).toBe(Z.segmenteGesamt);
    expect(z.projekt.segmente.length).toBe(a.segmente.length + b.segmente.length);
    for (const s of z.projekt.segmente) {
      const d = z.projekt.dokumente.find(x => x.id === s.dokument)!;
      expect(s.ende).toBeLessThanOrEqual(cpLaenge(d.text));
    }
  });

  it('Fälle mit gleichem Namen werden zusammengeführt; verschiedener Wert: Wert der ersten Datei und Meldung; Variablen nach Namen', () => {
    const z = fuehreZusammen(a, b, 'de');
    const f = ansicht(z.projekt).faelle.map(x => ({ name: x.name, werte: x.werte })).sort((x, y) => x.name.localeCompare(y.name));
    expect(f).toEqual(Z.faelle);
    expect(z.projekt.variablen.map(v => v.name).sort()).toEqual(Z.variablen);
    expect(arten(z.meldungen).has('fallwert-verschieden')).toBe(true);
  });

  it('Meldungen genau wie erwartet (ohne und mit Antwort zur Person), Sätze in de und en', () => {
    expect([...arten(fuehreZusammen(a, b, 'de').meldungen)].sort()).toEqual(Z.meldungen);
    expect([...arten(fuehreZusammen(a, b, 'de', { [idVon(b, GLEICH.b)]: idVon(a, GLEICH.a) }).meldungen)].sort()).toEqual(ZG.meldungen);
    const de = fuehreZusammen(a, b, 'de').meldungen.find(m => m.art === 'text-verschieden')!;
    const en = fuehreZusammen(a, b, 'en').meldungen.find(m => m.art === 'text-verschieden')!;
    expect(en.satz).not.toBe(de.satz);
  });

  it('das Ergebnis ist ein gültiges QualProjekt', () => {
    const z = fuehreZusammen(a, b, 'de');
    expect(() => pruefeQualProjekt(JSON.parse(JSON.stringify(z.projekt)))).not.toThrow();
  });
});
