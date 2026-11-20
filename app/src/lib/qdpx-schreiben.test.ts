// Tests für app/src/lib/qdpx-schreiben.ts (REFI-QDA-Projektdatei .qdpx schreiben, Ausbau A1) und die Ergänzungen im Leser (Rule:/Anchor examples:, Memo-Präfixe).
// Rundweg: Projekt -> schreibeQdpx -> leseQdpx -> gleiche Teile (ids unterscheiden sich, verglichen wird über Namen, Pfade, Texte und Positionen).
// XSD-Prüfung nur mit REFI_XSD_DIR (Project.xsd liegt nicht im Git): scripts/qdpx-pruefen.py.
import { describe, expect, it } from 'vitest';
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { strFromU8, unzipSync } from 'fflate';
import { DOMParser as XmlDomParser } from '@xmldom/xmldom';
import { cpLaenge, cpTeil, positionsKarte, utf16ZuCp, qualFassung, type Code, type Dokument, type Memo, type QualProjekt } from './qualprojekt';
import { fuehreZusammen, leseQdpx } from './qdpx';
import { schreibeQdpx } from './qdpx-schreiben';

(globalThis as unknown as { DOMParser: unknown }).DOMParser = XmlDomParser;

/* ------------------------------------------------------------------ Vergleichssicht */
function ansicht(q: QualProjekt) {
  const dok = new Map(q.dokumente.map(d => [d.id, d]));
  const seg = new Map(q.segmente.map(s => [s.id, s]));
  const codeNach = new Map(q.codes.map(c => [c.id, c]));
  const pfad = (c: Code): string => (c.elternId !== undefined ? pfad(codeNach.get(c.elternId)!) + '/' : '') + c.name;
  const person = new Map(q.kodierende.map(k => [k.id, k.name]));
  const varName = new Map(q.variablen.map(v => [v.id, v.name]));
  const fallName = new Map(q.faelle.map(f => [f.id, f.name]));
  const sortiere = <T>(l: T[]): T[] => [...l].sort((a, b) => (JSON.stringify(a) < JSON.stringify(b) ? -1 : 1));
  return {
    dokumente: sortiere(q.dokumente.map(d => ({ name: d.name, text: d.text, fall: d.fall !== undefined ? fallName.get(d.fall) ?? null : null }))),
    codes: q.codes.map(c => ({ pfad: pfad(c), kodierbar: c.kodierbar, farbe: c.farbe ?? null, definition: c.definition ?? null, regel: c.regel ?? null, anker: (c.anker ?? []).map(a => a.text), platz: c.reihenfolge })),
    segmente: sortiere(q.segmente.map(s => ({ dokument: dok.get(s.dokument)!.name, start: s.start, ende: s.ende, text: cpTeil(dok.get(s.dokument)!.text, s.start, s.ende) }))),
    kodierungen: sortiere(q.kodierungen.map(k => {
      const s = seg.get(k.segment)!;
      return { dokument: dok.get(s.dokument)!.name, start: s.start, ende: s.ende, code: pfad(codeNach.get(k.code)!), person: person.get(k.kodierende) ?? null };
    })),
    memos: sortiere(q.memos.map(m => ({
      titel: m.titel ?? null, text: m.text, art: m.art && m.art !== 'memo' ? m.art : null,
      bezug: sortiere(m.bezug.map(b => b.art === 'projekt' ? { art: b.art }
        : { art: b.art, ziel: b.art === 'dokument' ? dok.get(b.id!)?.name : b.art === 'code' ? pfad(codeNach.get(b.id!)!) : b.art === 'segment' ? { d: dok.get(seg.get(b.id!)!.dokument)!.name, s: seg.get(b.id!)!.start } : fallName.get(b.id!) })),
    }))),
    faelle: sortiere(q.faelle.map(f => ({ name: f.name, werte: Object.fromEntries(Object.entries(f.werte).map(([k, v]) => [varName.get(k) ?? '?', v]).sort()) }))),
    variablen: q.variablen.map(v => ({ name: v.name, typ: v.typ })),
    mengen: sortiere((q.mengen ?? []).map(m => ({ name: m.name, art: m.art, mitglieder: m.mitglieder.map(i => (m.art === 'dokumente' ? dok.get(i)?.name : pfad(codeNach.get(i)!))).sort() }))),
    personen: q.kodierende.map(k => k.name).sort(),
    // Themen (A3): Name, zentrales Konzept, Codes; verworfene gehen nicht ins Format
    themen: sortiere((q.themen ?? []).filter(x => x.stand !== 'verworfen').map(x => ({ name: x.name, konzept: x.konzept ?? null, codes: x.codes.map(i => pfad(codeNach.get(i)!)).sort() }))),
  };
}
const rundweg = (q: QualProjekt, sp: 'de' | 'en' = 'de') => leseQdpx(schreibeQdpx(q, sp), sp);
const entpackt = (b: Uint8Array): Record<string, string> => Object.fromEntries(Object.entries(unzipSync(b)).map(([n, d]) => [n, strFromU8(d)]));

/* ------------------------------------------------------------------ (a) Rundweg mit dem Beispielprojekt */
describe.each(['beispiel-de.qdpx', 'beispiel-en.qdpx'])('Rundweg mit public/beispiel/qdpx/%s', (datei) => {
  const sp = datei.includes('-de') ? 'de' : 'en';
  const roh = new Uint8Array(readFileSync(new URL(`../../public/beispiel/qdpx/${datei}`, import.meta.url)));
  const erst = leseQdpx(roh, sp);
  const zweit = rundweg(erst.projekt, sp);

  it('gleiche Zahlen (Dokumente, Codes, Segmente, Kodierungen, Kodierende, Memos, Fälle, Variablen, Mengen)', () => {
    expect(zweit.zaehlung).toEqual(erst.zaehlung);
  });
  it('keine Meldungen beim Lesen der geschriebenen Datei', () => {
    expect(zweit.meldungen.map(m => m.satz)).toEqual([]);
  });
  it('Dokumente, Codes (Baum, Definition), Segmente mit Positionen, Kodierungen mit Code und Person, Memos mit Bezug, Fälle mit Werten, Mengen sind gleich', () => {
    expect(ansicht(zweit.projekt)).toEqual(ansicht(erst.projekt));
  });
  it('geschrieben ist es ein ZIP mit project.qde und sources/ für jedes Dokument und jedes Memo', () => {
    const z = entpackt(schreibeQdpx(erst.projekt, sp));
    expect(Object.keys(z)).toContain('project.qde');
    expect(Object.keys(z).filter(n => n.startsWith('sources/')).length).toBe(erst.projekt.dokumente.length + erst.projekt.memos.length);
    expect(z['project.qde']).toContain('xmlns="urn:QDA-XML:project:1.0"');
  });
});

/* ------------------------------------------------------------------ (b) Ausbau-Beispiel: fünf Interviews, Muster-Codebuch, faelle.csv */
const BEISPIELE = new URL('../../../docs/ausbau/beispiele/', import.meta.url);
const text = (n: string) => readFileSync(new URL(n, BEISPIELE), 'utf8');

function ausbauProjekt(): QualProjekt {
  const dokumente: Dokument[] = [1, 2, 3, 4, 5].map(i => ({
    id: `dok-0${i}`, name: `interview-0${i}.txt`, art: 'text', text: text(`interview-0${i}.txt`).replace(/\r\n/g, '\n'), erstellt: 1_700_000_000_000 + i, geaendert: 1_700_000_000_000 + i,
  }));
  const dokVon = (n: number) => dokumente[n - 1]!;
  // Fälle aus faelle.csv: Name = Pseudonym, alle Spalten außer case_id/pseudonym/interview_file als Text-Variablen
  const zeilen = text('faelle.csv').replace(/\r?\n$/, '').split(/\r?\n/).map(z => z.split(','));
  const kopf = zeilen[0]!;
  const spalten = kopf.filter(k => !['case_id', 'pseudonym', 'interview_file'].includes(k));
  const variablen = spalten.map((k, i) => ({ id: `var-${i}`, name: k, typ: 'text' as const }));
  const faelle = zeilen.slice(1).map((z, i) => ({
    id: `fall-${i + 1}`, name: z[kopf.indexOf('pseudonym')]!,
    werte: Object.fromEntries(variablen.map(v => [v.id, z[kopf.indexOf(v.name)]!])),
  }));
  zeilen.slice(1).forEach((z, i) => { dokVon(i + 1).fall = `fall-${i + 1}`; void z; });
  const code = (id: string, name: string, platz: number, extra: Partial<Code> = {}): Code => ({ id, name, kodierbar: true, reihenfolge: platz, ...extra });
  const codes: Code[] = [
    code('cA', 'A Barriers', 0, { kodierbar: false, farbe: '#aa3300' }),
    code('cA1', 'A1 Embarrassment and fear of judgement', 0, { elternId: 'cA', farbe: '#cc5522', definition: 'The person says they feel shame, fear of looking incapable or of being judged when asking.', regel: 'Words like embarrassed, ashamed, afraid to look stupid.\nNot plain lack of time (see A3).', anker: [{ text: 'I felt embarrassed to ask, plain and simple.' }] }),
    code('cA2', 'A2 Self-image of independence', 1, { elternId: 'cA', definition: 'The person holds a rule that capable people manage alone.', anker: [{ text: 'Strong people manage on their own.' }] }),
    code('cA3', 'A3 Practical barriers', 2, { elternId: 'cA', definition: 'Time, work, place or schedule stop the person from asking.' }),
    code('cB', 'B Sources of help', 1, { kodierbar: false }),
    code('cB1', 'B1 Peers', 0, { elternId: 'cB', definition: 'Help from other students.' }),
    code('cB2', 'B2 Tutors and lecturers', 1, { elternId: 'cB' }),
    code('cC3', 'C3 Reciprocity', 2, { definition: 'Asking is made easy because help goes both ways.', regel: 'Taking turns, giving as well as taking.' }),
    code('cC4', 'C4 Turning point', 3),
    code('cD1', 'D1 Help and identity', 4, { definition: 'Needing help is linked to who the person is or wants to be.' }),
  ];
  // Kodierungen an echten Textstellen: (Interview, Zitat, Code)
  const stellen: [number, string, string, string][] = [
    [1, 'I felt embarrassed to ask, plain and simple.', 'cA1', 'k1'],
    [1, 'Strong people manage on their own.', 'cA2', 'k1'],
    [1, 'Office hours are on Tuesday afternoon, when I am at the placement.', 'cA3', 'k1'],
    [1, 'being the person who needs help feels like, like losing something about who I am', 'cD1', 'k1'],
    [1, 'being the person who needs help feels like, like losing something about who I am', 'cA1', 'k2'],
    [2, 'With other students it is a trade.', 'cB1', 'k1'],
    [2, 'Asking is easy if it goes both ways.', 'cC3', 'k2'],
    [3, 'It was like she handed me a key.', 'cB2', 'k1'],
    [4, 'Honestly, I almost cried, from relief, not from shame.', 'cC4', 'k2'],
  ];
  const segmente: QualProjekt['segmente'] = [], kodierungen: QualProjekt['kodierungen'] = [];
  stellen.forEach(([n, zitat, c, k], i) => {
    const d = dokVon(n); const karte = positionsKarte(d.text);
    const u = d.text.indexOf(zitat);
    if (u < 0) throw new Error('Zitat nicht gefunden: ' + zitat);
    const start = utf16ZuCp(karte, u), ende = utf16ZuCp(karte, u + zitat.length);
    const sid = `seg-${i}`;
    segmente.push({ id: sid, dokument: d.id, start, ende, erstellt: 1_700_000_001_000, kodierende: k });
    kodierungen.push({ id: `kod-${i}`, segment: sid, code: c, kodierende: k, erstellt: 1_700_000_001_000 });
  });
  const memos: Memo[] = [
    { id: 'm1', titel: 'Erster Eindruck', text: 'Scham taucht in drei von fünf Interviews auf.\nAber: Ben spricht kaum davon.', bezug: [{ art: 'projekt' }], erstellt: 1_700_000_002_000 },
    { id: 'm2', titel: 'Was heißt „Regel“ hier?', text: 'Abgrenzung zu A1 klären.', bezug: [{ art: 'code', id: 'cA2' }], erstellt: 1_700_000_002_000 },
    { id: 'm3', text: 'Stelle wirkt wie ein Schlüsselsatz.', bezug: [{ art: 'segment', id: 'seg-1' }, { art: 'dokument', id: 'dok-01' }], erstellt: 1_700_000_002_000 },
    { id: 'm4', titel: 'Vor dem Gespräch', text: 'Amira wirkte nervös.', bezug: [{ art: 'fall', id: 'fall-1' }], art: 'feldnotiz-empirisch', erstellt: 1_700_000_002_000 },
    { id: 'm5', titel: 'Methode', text: 'Zeitstempel behalten.', bezug: [{ art: 'projekt' }], art: 'feldnotiz-methodisch', erstellt: 1_700_000_002_000 },
  ];
  return {
    format: 'statable-qualitativ', version: 1, id: 'p-ausbau', name: 'Asking for help in the first year',
    kodierende: [{ id: 'k1', name: 'Kodiererin A' }, { id: 'k2', name: 'Kodierer B' }],
    dokumente, codes, segmente, kodierungen, memos, faelle, variablen,
    mengen: [
      { id: 'mg1', name: 'Part-time', art: 'dokumente', mitglieder: ['dok-01', 'dok-04'] },
    ],
    // seit A3 ein echtes Thema (vorher eine Menge mit dem Namen „Theme: …“)
    themen: [{ id: 'th1', name: 'Asking puts who I am at stake', konzept: 'Needing help threatens the self-image.', codes: ['cA1', 'cA2', 'cD1'], stand: 'aktiv', verlauf: [{ zeit: 1_700_000_003_000, was: 'angelegt' }], reihenfolge: 0, erstellt: 1_700_000_003_000, geaendert: 1_700_000_003_000 }],
    protokoll: [], herkunft: { art: 'neu', zeit: 1_700_000_000_000 },
  };
}

describe('Rundweg mit dem Ausbau-Beispiel (fünf Interviews, Muster-Codebuch, Fälle aus faelle.csv)', () => {
  const q = ausbauProjekt();
  const bytes = schreibeQdpx(q, 'en');
  const zweit = leseQdpx(bytes, 'en');

  it('ohne Meldungen, gleiche Zahlen', () => {
    expect(zweit.meldungen.map(m => m.satz)).toEqual([]);
    expect(zweit.zaehlung).toEqual({ dokumente: 5, codes: 10, segmente: 9, kodierungen: 9, kodierende: 2, memos: 5, faelle: 5, variablen: 5, mengen: 1 });
    expect(zweit.projekt.themen?.map(x => x.name)).toEqual(['Asking puts who I am at stake']);
  });
  it('alles gleich, auch Regel, Ankerbeispiele, Memo-Art und Fall-Memo (hängt an den Dokumenten des Falls)', () => {
    const a = ansicht(q), b = ansicht(zweit.projekt);
    // einzige erwartete Abweichung: das Memo am Fall hängt im Format am Dokument des Falls (REFI-QDA kennt keine NoteRef am Fall)
    const fallMemoA = a.memos.find(m => m.titel === 'Vor dem Gespräch')!;
    expect(fallMemoA.bezug).toEqual([{ art: 'fall', ziel: 'Amira' }]);
    const fallMemoB = b.memos.find(m => m.titel === 'Vor dem Gespräch')!;
    expect(fallMemoB.bezug).toEqual([{ art: 'dokument', ziel: 'interview-01.txt' }]);
    expect(fallMemoB.art).toBe('feldnotiz-empirisch');
    a.memos = a.memos.filter(m => m.titel !== 'Vor dem Gespräch'); b.memos = b.memos.filter(m => m.titel !== 'Vor dem Gespräch');
    expect(b).toEqual(a);
  });
  it('Code mit Regel und Ankerbeispiel: Beschreibung hat die festen Absätze, Rückweg trennt sie', () => {
    const xml = entpackt(bytes)['project.qde']!;
    expect(xml).toContain('Rule: Words like embarrassed');
    expect(xml).toContain('Anchor examples:\nI felt embarrassed to ask, plain and simple.');
    const k = zweit.projekt.codes.find(c => c.name.startsWith('A1'))!;
    expect(k.definition).toBe('The person says they feel shame, fear of looking incapable or of being judged when asking.');
    expect(k.regel).toBe('Words like embarrassed, ashamed, afraid to look stupid.\nNot plain lack of time (see A3).'.replace('ashamed, afraid to look stupid', 'ashamed, afraid to look stupid'));
    expect(k.anker).toEqual([{ text: 'I felt embarrassed to ask, plain and simple.' }]);
  });
  it('Memo-Präfix steht im Namen der Note und kommt als Art zurück; deutsche Präfixe ebenso', () => {
    expect(entpackt(bytes)['project.qde']).toContain('name="[Field note: empirical] Vor dem Gespräch"');
    const de = leseQdpx(schreibeQdpx(q, 'de'), 'de').projekt.memos.find(m => m.titel === 'Methode')!;
    expect(de.art).toBe('feldnotiz-methodisch');
    expect(entpackt(schreibeQdpx(q, 'de'))['project.qde']).toContain('name="[Feldnotiz methodisch] Methode"');
  });
  it('die Fassung nach dem Lesen folgt der Regel (mit Thema = 3, ohne Thema Feldnotiz = 2)', () => {
    expect(zweit.projekt.version).toBe(qualFassung(zweit.projekt));
    expect(zweit.projekt.version).toBe(3);
    const ohne = leseQdpx(schreibeQdpx({ ...q, themen: [] }, 'en'), 'en').projekt;
    expect(ohne.version).toBe(2);
  });
  it('der Text des Dokuments steht unverändert in sources/ (auch ohne Positionen zu verschieben)', () => {
    const z = entpackt(bytes);
    const texte = Object.entries(z).filter(([n]) => n.startsWith('sources/')).map(([, t]) => t);
    for (const d of q.dokumente) expect(texte).toContain(d.text);
  });
  it('das Schreiben ändert das Projekt nicht und ist stabil (gleiche Eingabe, gleiche Bytes)', () => {
    const vorher = JSON.stringify(q);
    const a = schreibeQdpx(q, 'en'), b = schreibeQdpx(q, 'en');
    expect(JSON.stringify(q)).toBe(vorher);
    expect(Buffer.from(a).equals(Buffer.from(b))).toBe(true);
  });
});

/* ------------------------------------------------------------------ (c) Einwilligungen und alles, was nicht ins Format geht */
describe('Was nicht ins Format geht, steht nirgends in der Datei', () => {
  it('Einwilligungen, Protokolle, Feinstrukturanalysen, Zusammenfassungen und Einstufungen tauchen in keiner Datei des ZIP auf', () => {
    const q = ausbauProjekt();
    const GEHEIM = ['Quellenstein-Geheim-7731', 'Notiz-Zugriff-4412', 'Protokoll-Ort-9981', 'Sequenz-Frage-3320', 'Zusammenfassung-Zelle-5509', 'Fassung-Vorlage-8812'];
    q.einwilligungen = [{
      id: 'e1', fall: 'fall-1', fassung: GEHEIM[5]!, form: 'schriftlich',
      punkte: [{ punkt: 'teilnahme', stand: 'erteilt', datum: '2026-01-01', notiz: GEHEIM[0]! }],
      zugriffskreis: GEHEIM[1]!, erstellt: 1, geaendert: 1,
    }];
    q.protokolle = [{ id: 'pr1', art: 'interview', fall: 'fall-1', kopf: { ort: GEHEIM[2]! }, felder: { zustandekommen: GEHEIM[2]! }, erstellt: 1, geaendert: 1 }];
    q.sequenzanalysen = [{
      id: 'sa1', name: 'Analyse', verfahren: 'feinstruktur', dokument: 'dok-01', ausschnitt: { start: 0, ende: 5, text: 'Thank' }, forschungsfrage: GEHEIM[3]!,
      grenzenGesperrt: true, vorauslesenErlaubt: false, aktuelleEinheit: 0, einheiten: [], reflexionen: [], erstellt: 1, geaendert: 1,
    }];
    q.zusammenfassungen = [{ zeile: 'fall-1', code: 'cA1', text: GEHEIM[4]!, geaendert: 1 }];
    q.arbeitsplatz = { fest: ['cA1'], zuletzt: [] };
    // Memo am Protokoll: der Text des Memos geht ins Format (am Projekt), das Protokoll selbst nicht
    q.memos.push({ id: 'm6', text: 'Memo zum Protokoll', bezug: [{ art: 'protokoll', id: 'pr1' }], erstellt: 1 });
    const z = entpackt(schreibeQdpx(q, 'de'));
    const alles = Object.entries(z).map(([n, t]) => n + '\n' + t).join('\n');
    for (const g of GEHEIM) expect(alles, g).not.toContain(g);
    expect(alles).not.toMatch(/einwilligung|protokolle|sequenz|zusammenfassung/i);
    const zurueck = leseQdpx(schreibeQdpx(q, 'de'), 'de').projekt;
    expect(zurueck.einwilligungen).toBeUndefined();
    expect(zurueck.protokolle).toBeUndefined();
    expect(zurueck.memos.find(m => m.text === 'Memo zum Protokoll')?.bezug).toEqual([{ art: 'projekt' }]);
  });
  it('Einstufungen (evaluative Kodierung) bleiben draußen, die Kodierung selbst ist da', () => {
    const q = ausbauProjekt();
    q.kodierungen[0]!.stufe = 3;
    const xml = entpackt(schreibeQdpx(q, 'de'))['project.qde']!;
    expect(xml).not.toContain('stufe');
    expect(leseQdpx(schreibeQdpx(q, 'de'), 'de').zaehlung.kodierungen).toBe(q.kodierungen.length);
  });
});

/* ------------------------------------------------------------------ (d) Sonderzeichen */
describe('Sonderzeichen überstehen den Rundweg mit richtigen Positionen', () => {
  const TEXT = 'Zeile 1 mit & und <b> "Anführung" \'Apostroph\'\r\nZeile 2: Äpfel, Öl, Übung, ß, € und 😀 Emoji 👩‍👩‍👧 hier.\nLetzte Zeile ]]> Ende';
  const projekt = (): QualProjekt => {
    const karte = positionsKarte(TEXT);
    const pos = (t: string) => { const u = TEXT.indexOf(t); return [utf16ZuCp(karte, u), utf16ZuCp(karte, u + t.length)] as const; };
    const [s1, e1] = pos('Äpfel, Öl'), [s2, e2] = pos('hier.\nLetzte');
    const [s3, e3] = pos('"Anführung"'), [s4, e4] = pos('Emoji');
    return {
      format: 'statable-qualitativ', version: 1, id: 'p', name: 'Test & <Name> "q" 😀',
      kodierende: [{ id: 'u1', name: 'Jürgen "JJ" <x> & Co 😀' }],
      dokumente: [{ id: 'd1', name: 'Dok & <1> "a" Ä 😀', art: 'text', text: TEXT, erstellt: 1, geaendert: 1, fall: 'f1' }],
      codes: [{ id: 'c1', name: 'Code & <A> "B" Ö 😀', kodierbar: true, reihenfolge: 0, farbe: '#aBc', definition: 'Def mit & < > " \' und 😀\n\nzweiter Absatz', regel: 'Regel & <x>', anker: [{ text: 'Anker "1" & 😀' }, { text: 'Anker 2' }] },
        { id: 'c2', name: 'Kind', kodierbar: true, reihenfolge: 0, elternId: 'c1' }],
      segmente: [{ id: 's1', dokument: 'd1', start: s1, ende: e1, erstellt: 1 }, { id: 's2', dokument: 'd1', start: s2, ende: e2, erstellt: 1 }, { id: 's3', dokument: 'd1', start: s3, ende: e3, erstellt: 1 }, { id: 's4', dokument: 'd1', start: s4, ende: e4, erstellt: 1 }],
      kodierungen: ['s1', 's2', 's3', 's4'].map((s, i) => ({ id: 'k' + i, segment: s, code: i % 2 ? 'c2' : 'c1', kodierende: 'u1', erstellt: 1 })),
      memos: [{ id: 'm1', titel: 'Memo & <t> "x" 😀', text: 'Text mit & < > " ]]> 😀\r\nzweite Zeile', bezug: [{ art: 'segment', id: 's1' }], erstellt: 1 }],
      faelle: [{ id: 'f1', name: 'Fall <1> & "x" 😀', werte: { v1: 'Wert & <y> "z" 😀', v2: 3, v3: 2.5, v4: true, v5: '2026-11-12', v6: '2026-11-12T10:30:00Z', v7: null } }],
      variablen: [{ id: 'v1', name: 'Var & <1>', typ: 'text' }, { id: 'v2', name: 'ganz', typ: 'ganzzahl' }, { id: 'v3', name: 'kommazahl', typ: 'zahl' },
        { id: 'v4', name: 'janein', typ: 'ja/nein' }, { id: 'v5', name: 'tag', typ: 'datum' }, { id: 'v6', name: 'zeit', typ: 'datumzeit' }, { id: 'v7', name: 'leer', typ: 'text' }],
      mengen: [{ id: 'g1', name: 'Menge & <1> 😀', art: 'codes', mitglieder: ['c1'] }],
      protokoll: [],
    };
  };

  it('Namen, Texte (mit \\r\\n und ]]>), Definition mit Absätzen, Regel, Anker, Farbe, Positionen und Werte bleiben gleich', () => {
    const q = projekt();
    const erg = rundweg(q);
    expect(erg.meldungen.map(m => m.satz)).toEqual([]);
    expect(erg.projekt.name).toBe(q.name);
    expect(erg.projekt.kodierende[0]!.name).toBe(q.kodierende[0]!.name);
    expect(erg.projekt.dokumente[0]!.text).toBe(TEXT);
    const a = ansicht(erg.projekt), b = ansicht(q);
    // Farbe wird zu #rrggbb normalisiert
    expect(a.codes[0]!.farbe).toBe('#aabbcc');
    a.codes[0]!.farbe = b.codes[0]!.farbe;
    // null-Werte werden nicht geschrieben (kein Wert = fehlt)
    for (const f of b.faelle) f.werte = Object.fromEntries(Object.entries(f.werte).filter(([, v]) => v !== null));
    expect(a).toEqual(b);
    // Positionen in Codepoints: der Text hinter dem Emoji stimmt
    const s = erg.projekt.segmente.map(x => cpTeil(erg.projekt.dokumente[0]!.text, x.start, x.ende)).sort();
    expect(s).toEqual(['"Anführung"', 'Emoji', 'hier.\nLetzte', 'Äpfel, Öl'].sort());
    const d = erg.projekt.dokumente[0]!;
    expect(cpLaenge(d.text)).toBeLessThan(d.text.length);
  });
  it('Werte der Fälle: Typen bleiben (Zahl, Ja/Nein, Datum, leer)', () => {
    const w = ansicht(rundweg(projekt()).projekt).faelle[0]!.werte as Record<string, unknown>;
    expect(w).toMatchObject({ ganz: 3, kommazahl: 2.5, janein: true, tag: '2026-11-12', zeit: '2026-11-12T10:30:00Z', 'Var & <1>': 'Wert & <y> "z" 😀' });
    expect('leer' in w).toBe(false);   // null wird nicht geschrieben
  });
  it('Texte mit unzulässigen XML-Zeichen und einzelnen Surrogaten zerstören die Datei nicht', () => {
    const q = projekt();
    q.codes[0]!.name = 'A\u0001B\ud800C';
    q.faelle[0]!.name = 'F\u0008x';
    const erg = rundweg(q);
    expect(erg.projekt.codes[0]!.name).toBe('ABC');
    expect(erg.projekt.faelle[0]!.name).toBe('Fx');
  });
  it('Dokument mit Zeilenumbruch \\r\\n: Positionen stimmen auch nach dem Segment (Zählweise wird erkannt)', () => {
    const erg = rundweg(projekt());
    const d = erg.projekt.dokumente[0]!;
    const zeile2 = erg.projekt.segmente.find(x => cpTeil(d.text, x.start, x.ende) === 'Äpfel, Öl')!;
    expect(cpTeil(d.text, zeile2.start, zeile2.ende)).toBe('Äpfel, Öl');
  });
  it('doppelte oder ungültige Kennungen werden stabil neu vergeben, Bezüge stimmen weiter', () => {
    const q = projekt();
    q.codes[1]!.id = '{A1B2C3D4-0000-4000-8000-0000000000AB}';
    for (const k of q.kodierungen) if (k.code === 'c2') k.code = q.codes[1]!.id;
    const erg = rundweg(q);
    const xml = entpackt(schreibeQdpx(q, 'de'))['project.qde']!;
    expect(xml).toContain('guid="a1b2c3d4-0000-4000-8000-0000000000ab"');
    expect(ansicht(erg.projekt).kodierungen.map(k => k.code).sort()).toEqual(ansicht(q).kodierungen.map(k => k.code).sort());
  });
});

/* ------------------------------------------------------------------ Grenzfälle */
describe('Grenzfälle', () => {
  it('leeres Projekt ergibt eine lesbare Datei', () => {
    const q: QualProjekt = { format: 'statable-qualitativ', version: 1, id: 'p', name: 'leer', kodierende: [], dokumente: [], codes: [], segmente: [], kodierungen: [], memos: [], faelle: [], variablen: [], protokoll: [] };
    const erg = rundweg(q);
    expect(erg.zaehlung).toEqual({ dokumente: 0, codes: 0, segmente: 0, kodierungen: 0, kodierende: 0, memos: 0, faelle: 0, variablen: 0, mengen: 0 });
  });
  it('Code mit nur Ankerbeispielen oder nur Regel (ohne Definition)', () => {
    const q = ausbauProjekt();
    q.codes.push({ id: 'cx', name: 'X nur Anker', kodierbar: true, reihenfolge: 9, anker: [{ text: 'a' }, { text: 'b' }] }, { id: 'cy', name: 'Y nur Regel', kodierbar: true, reihenfolge: 10, regel: 'r' });
    const c = leseQdpx(schreibeQdpx(q, 'de'), 'de').projekt.codes;
    const x = c.find(k => k.name === 'X nur Anker')!, y = c.find(k => k.name === 'Y nur Regel')!;
    expect(x.definition).toBe(''); expect(x.anker).toEqual([{ text: 'a' }, { text: 'b' }]);
    expect(y.regel).toBe('r');
  });
  it('Segment mit Kodierung zu fehlendem Code und Segment außerhalb des Textes werden nicht geschrieben', () => {
    const q = ausbauProjekt();
    q.kodierungen.push({ id: 'kx', segment: 'seg-0', code: 'gibt-es-nicht', kodierende: 'k1', erstellt: 1 });
    q.segmente.push({ id: 'sx', dokument: 'dok-01', start: 10, ende: 999999, erstellt: 1 });
    const erg = rundweg(q);
    expect(erg.zaehlung.segmente).toBe(9);
    expect(erg.zaehlung.kodierungen).toBe(9);
  });
});

/* ------------------------------------------------------------------ (e) Prüfung gegen Project.xsd */
describe.skipIf(!process.env.REFI_XSD_DIR)('geschriebene Datei gegen Project.xsd (scripts/qdpx-pruefen.py)', () => {
  const skript = fileURLToPath(new URL('../../../scripts/qdpx-pruefen.py', import.meta.url));
  const pruefe = (bytes: Uint8Array) => {
    const d = mkdtempSync(join(tmpdir(), 'qdpx-'));
    try {
      const f = join(d, 't.qdpx');
      writeFileSync(f, bytes);
      for (const exe of ['py', 'python3', 'python']) {
        const r = spawnSync(exe, [skript, f], { encoding: 'utf8', env: process.env });
        if (r.error) continue;
        return { code: r.status, fehler: r.stderr };
      }
      throw new Error('Python nicht gefunden');
    } finally { rmSync(d, { recursive: true, force: true }); }
  };
  it('Ausbau-Beispiel (de und en) ist gültig', () => {
    for (const s of ['de', 'en'] as const) { const r = pruefe(schreibeQdpx(ausbauProjekt(), s)); expect(r.fehler).toBe(''); expect(r.code).toBe(0); }
  });
  it('A3: mit Arbeitsweise (Project/Description vor NoteRef), Thema ohne Konzept und ohne Codes, neuen Memo-Arten ist gültig', () => {
    const q = ausbauProjekt();
    q.arbeitsweise = 'grounded-theory';
    q.themen!.push({ id: 'th3', name: 'Leer & <x>', codes: [], stand: 'kandidat', verlauf: [], reihenfolge: 2, erstellt: 1, geaendert: 1 });
    q.memos.push({ id: 'm7', titel: 'Wer als Nächstes', text: 'Teilzeit-Studierende', art: 'gt-auswahl', bezug: [{ art: 'projekt' }], erstellt: 1_700_000_002_000 });
    for (const s of ['de', 'en'] as const) { const r = pruefe(schreibeQdpx(q, s)); expect(r.fehler).toBe(''); expect(r.code).toBe(0); }
  });
  it('Beispielprojekt Semesterplanung (de und en, nach Lesen und Schreiben) ist gültig', () => {
    for (const n of ['beispiel-de.qdpx', 'beispiel-en.qdpx']) {
      const roh = new Uint8Array(readFileSync(new URL(`../../public/beispiel/qdpx/${n}`, import.meta.url)));
      const r = pruefe(schreibeQdpx(leseQdpx(roh, 'de').projekt, 'de')); expect(r.fehler).toBe(''); expect(r.code).toBe(0);
    }
  });
  it('Sonderzeichen-Projekt und leeres Projekt sind gültig', () => {
    const q: QualProjekt = { format: 'statable-qualitativ', version: 1, id: 'p', name: 'leer', kodierende: [], dokumente: [], codes: [], segmente: [], kodierungen: [], memos: [], faelle: [], variablen: [], protokoll: [] };
    const r0 = pruefe(schreibeQdpx(q, 'de')); expect(r0.fehler).toBe(''); expect(r0.code).toBe(0);
    const q2 = ausbauProjekt();
    q2.name = 'A & <B> "C" 😀'; q2.codes[1]!.name = 'Ö & <x>';
    q2.einwilligungen = [{ id: 'e', fall: 'fall-1', fassung: 'x', form: 'digital', punkte: [], erstellt: 1, geaendert: 1 }];
    const r1 = pruefe(schreibeQdpx(q2, 'en')); expect(r1.fehler).toBe(''); expect(r1.code).toBe(0);
  });
  it('das Prüfskript erkennt eine ungültige Datei', () => {
    const z = unzipSync(schreibeQdpx(ausbauProjekt(), 'de'));
    expect(z['project.qde']).toBeTruthy();
    const kaputt = strFromU8(z['project.qde']!).replace('<Users>', '<Foo><Users>');
    const d = mkdtempSync(join(tmpdir(), 'qdpx-'));
    try {
      const f = join(d, 'k.qde'); writeFileSync(f, kaputt, 'utf8');
      for (const exe of ['py', 'python3', 'python']) {
        const r = spawnSync(exe, [skript, f], { encoding: 'utf8', env: process.env });
        if (r.error) continue;
        expect(r.status).not.toBe(0); return;
      }
    } finally { rmSync(d, { recursive: true, force: true }); }
  });
});

/* ------------------------------------------------------------------ (f) Stufe A3: Themen und Arbeitsweise */
describe('Stufe A3: Themen als Set „Theme: …“, Arbeitsweise als „Approach: …“', () => {
  const q = ausbauProjekt();
  q.themen!.push({ id: 'th2', name: 'Verworfen', codes: ['cB1'], stand: 'verworfen', verlauf: [], reihenfolge: 1, erstellt: 1, geaendert: 1 });
  q.memos.push({ id: 'm6', titel: 'Ich', text: 'Eigene Rolle', art: 'tagebuch', bezug: [{ art: 'projekt' }], erstellt: 1_700_000_002_000 });
  q.codes = q.codes.map(c => (c.id === 'cC4' ? { ...c, phase: 'fokussiert' as const } : c));
  q.arbeitsweise = 'ta-reflexiv';
  const bytes = schreibeQdpx(q, 'en');
  const xml = entpackt(bytes)['project.qde']!;
  const zweit = leseQdpx(bytes, 'en');
  it('Set mit Name „Theme: …“, Beschreibung = zentrales Konzept, Codes als MemberCode; verworfene nicht', () => {
    const set = xml.slice(xml.indexOf('name="Theme: Asking puts who I am at stake"'));
    const ende = set.indexOf('</Set>');
    expect(ende).toBeGreaterThan(0);
    const innen = set.slice(0, ende);
    expect(innen.indexOf('<Description>Needing help threatens the self-image.</Description>')).toBeLessThan(innen.indexOf('<MemberCode'));
    expect(innen.split('<MemberCode').length - 1).toBe(3);
    expect(xml).not.toContain('Theme: Verworfen');
  });
  it('erste Zeile der Projektbeschreibung „Approach: …“ steht vor den NoteRefs am Projekt; Rückweg nur als Meldung, nie als Einstellung', () => {
    expect(xml).toContain('<Description>Approach: Reflexive thematic analysis (Braun and Clarke)</Description>');
    expect(xml.indexOf('<Description>Approach:')).toBeLessThan(xml.lastIndexOf('<NoteRef'));
    expect(zweit.projekt.arbeitsweise).toBeUndefined();
    expect(zweit.meldungen.map(m => m.art)).toEqual(['ansatz-genannt']);
    expect(zweit.meldungen[0]!.satz).toContain('Reflexive thematic analysis');
  });
  it('Thema kommt als Thema zurück (Stand aktiv, Verlauf „aus REFI-QDA eingelesen“), Tagebuch als Memo-Art, Phase nicht im Format', () => {
    const t = zweit.projekt.themen!;
    expect(t).toHaveLength(1);
    expect(t[0]).toMatchObject({ name: 'Asking puts who I am at stake', konzept: 'Needing help threatens the self-image.', stand: 'aktiv' });
    expect(t[0]!.codes.map(i => zweit.projekt.codes.find(c => c.id === i)!.name).sort()).toEqual(['A1 Embarrassment and fear of judgement', 'A2 Self-image of independence', 'D1 Help and identity']);
    expect(t[0]!.verlauf[0]!.notiz).toBe('read from REFI-QDA');
    expect(zweit.projekt.memos.find(m => m.titel === 'Ich')!.art).toBe('tagebuch');
    expect(zweit.projekt.codes.every(c => c.phase === undefined)).toBe(true);
  });
  it('Zusammenführen: gleiche Themen werden nie verschmolzen, sondern stehen nebeneinander mit Meldung', () => {
    const z = fuehreZusammen(zweit.projekt, zweit.projekt, 'de');
    expect(z.projekt.themen!.filter(x => x.name === 'Asking puts who I am at stake')).toHaveLength(2);
    expect(z.meldungen.some(m => m.art === 'thema-gleicher-name')).toBe(true);
    expect(z.projekt.themen![1]!.verlauf.at(-1)!.notiz).toContain('zusammengeführt aus');
  });
});
