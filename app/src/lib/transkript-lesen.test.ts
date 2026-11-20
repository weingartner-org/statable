import { readFileSync, readdirSync } from 'node:fs';
import { DOMParser } from '@xmldom/xmldom';
import { describe, expect, it } from 'vitest';
import { leseTranskript, transkriptDokument, vorschlagZuordnung } from './transkript-lesen';
import type { SprecherZuordnung, TranskriptRoh } from './transkript-lesen';

/* Fachblatt Stufe 4, Paket 4A (docs/erheben/FACHBLATT-STUFE-4.md, "4A: Transkripte einlesen").
 * Sollwerte vom Prüfer: testdaten/transkripte/<datei>.erwartet.json (Form { quelle, beitraege, meldungsArten }), Herkunft der Dateien in testdaten/transkripte/QUELLEN.md.
 * Der Bauer darf Sollwerte und diese Datei nicht ändern. Die Tests sind absichtlich ROT, bis `lib/transkript-lesen.ts` und `lib/qualprojekt.ts` gebaut sind.
 *
 * Entscheide von Opus (Fachblatt 4A unten) gelten: Beitrag.text immer ohne Kennung und Rand-Zeitmarke; Meldungsarten 'bom', 'zeichensatz', 'leer', 'zeit-rueckwaerts', 'zu-gross', 'ueberlappung', 'zeitmarken-gemischt' (verglichen wird die Menge).
 *  - `quelle: null` in der Erwartung = nicht geprüft. Fehlt `meldungsArten`, wird es nicht geprüft.
 *  - HTML/XML: Der Leser nutzt `globalThis.DOMParser` (hier aus @xmldom/xmldom gesetzt) oder einen eigenen Text-Herauszieher ohne DOM.
 */

(globalThis as { DOMParser?: unknown }).DOMParser = DOMParser;   // im Browser vorhanden; in Node aus @xmldom/xmldom (Fachblatt 4A, Entscheid 4E-9)

const ORDNER = new URL('./testdaten/transkripte/', import.meta.url);
const bytesVon = (name: string): Uint8Array => new Uint8Array(readFileSync(new URL(name, ORDNER)));
const textVon = (name: string): string => readFileSync(new URL(name, ORDNER), 'utf8').replace(/^\uFEFF/, '');

interface Erwartet { quelle: TranskriptRoh['quelle'] | null; beitraege: { sprecher?: string; zeitMs?: number; bisMs?: number; text: string }[]; meldungsArten?: string[] }
const erwartet = (name: string): Erwartet => JSON.parse(readFileSync(new URL(name + '.erwartet.json', ORDNER), 'utf8'));
const arten = (roh: TranskriptRoh): string[] => [...new Set(roh.meldungen.map(m => m.art))].sort();
const glatt = (roh: TranskriptRoh) => roh.beitraege.map(b => ({ sprecher: b.sprecher, zeitMs: b.zeitMs, bisMs: b.bisMs, text: b.text }));
const cp = (s: string): number => Array.from(s).length;

const T1 = 'Guten Morgen, wollen wir die Semesterplanung besprechen?';
const T2 = 'Ich habe die Termine für Oktober schon vorbereitet.';
const T3 = 'Gern, aber ich brauche noch die Raumliste.';
const T4 = 'Außerdem muss der Übungstermin am Freitag verschoben werden.';
const T5 = 'Das klingt gut, ich schreibe es auf.';
const T6 = 'Danke, dann schicke ich die Liste bis Mittwoch.';

describe('Dateien mit erwartetem Ergebnis (Zerlegung)', () => {
  const alle = readdirSync(ORDNER).filter(f => f.endsWith('.erwartet.json') && !f.includes('.einzeln.')).map(f => f.replace(/\.erwartet\.json$/, ''));

  it('der Ordner enthält mindestens 28 Dateien mit Sollwert', () => { expect(alle.length).toBeGreaterThanOrEqual(28); });

  it.each(alle)('%s: Beiträge, Sprecher, Zeiten, Texte', async (name) => {
    const e = erwartet(name);
    const roh = await leseTranskript(name, bytesVon(name));
    expect(glatt(roh)).toEqual(e.beitraege);
  });

  it.each(alle)('%s: Quelle erkannt', async (name) => {
    const e = erwartet(name);
    if (e.quelle === null) return;
    const roh = await leseTranskript(name, bytesVon(name));
    expect(roh.quelle).toBe(e.quelle);
  });

  it.each(alle.filter(n => erwartet(n).meldungsArten !== undefined))('%s: Meldungen (nur die Arten)', async (name) => {
    const roh = await leseTranskript(name, bytesVon(name));
    expect(arten(roh)).toEqual([...(erwartet(name).meldungsArten as string[])].sort());
  });

  it('jede Meldung hat einen nichtleeren Satz', async () => {
    const roh = await leseTranskript('zeichensatz-windows1252.txt', bytesVon('zeichensatz-windows1252.txt'));
    expect(roh.meldungen.length).toBeGreaterThan(0);
    for (const m of roh.meldungen) { expect(m.art.length).toBeGreaterThan(0); expect(m.satz.trim().length).toBeGreaterThan(5); }
  });
});

describe('Option "Untertitel zu Absätzen zusammenfassen" aus', () => {
  const faelle = ['atrain-transcription.srt', 'vtt-ohne-sprecher.vtt'];
  it.each(faelle)('%s: jeder Cue bleibt ein Beitrag', async (name) => {
    const e = JSON.parse(readFileSync(new URL(name + '.einzeln.erwartet.json', ORDNER), 'utf8')) as Erwartet;
    const roh = await leseTranskript(name, bytesVon(name), { zusammenfassen: false });
    expect(glatt(roh)).toEqual(e.beitraege);
  });
});

describe('Erkennung und Besonderheiten der Programme', () => {
  it('aTrain: Sprecherzeile ohne Doppelpunkt, Überschrift "Transcription for …" ist kein Beitrag', async () => {
    const roh = await leseTranskript('atrain-transcription.txt', bytesVon('atrain-transcription.txt'));
    expect(roh.beitraege.map(b => b.sprecher)).toEqual(['SPEAKER_00', 'SPEAKER_01', 'SPEAKER_00', 'SPEAKER_01']);
    expect(roh.beitraege.every(b => !b.text.includes('Transcription for') && !b.text.includes('SPEAKER_'))).toBe(true);
  });

  it('aTrain-Zeitmarken [hh:mm:ss] - stehen nicht im Text, die Zeit gilt für den Beginn des Beitrags (nur Sekunden, kein Ende)', async () => {
    const roh = await leseTranskript('atrain-transcription_timestamps.txt', bytesVon('atrain-transcription_timestamps.txt'));
    expect(roh.beitraege.map(b => b.zeitMs)).toEqual([0, 7000, 14000, 18000]);
    expect(roh.beitraege.every(b => b.bisMs === undefined && !/\[\d\d:\d\d:\d\d\]/.test(b.text))).toBe(true);
  });

  it('noScribe-HTML: Titel- und Infoabsatz am Anfang sind keine Beiträge', async () => {
    const roh = await leseTranskript('noscribe-transkript.html', bytesVon('noscribe-transkript.html'));
    expect(roh.beitraege).toHaveLength(3);
    expect(roh.beitraege.every(b => !b.text.includes('Transcribed with noScribe') && !b.text.includes('Audio file'))).toBe(true);
  });

  it('noScribe-HTML mit <script> und onerror: Skript wird nicht ausgeführt, sein Inhalt steht nicht im Text', async () => {
    delete (globalThis as Record<string, unknown>).__pwned;
    const roh = await leseTranskript('noscribe-mit-skript.html', bytesVon('noscribe-mit-skript.html'));
    expect((globalThis as Record<string, unknown>).__pwned).toBeUndefined();
    expect(roh.beitraege.map(b => b.sprecher)).toEqual(['S00', 'S01', 'S00']);
    const alles = roh.beitraege.map(b => b.text).join('\n');
    expect(alles).not.toMatch(/__pwned|<script|onerror|document\.title|<img/);
    expect(roh.beitraege[0]!.text.replace(/\s+/g, ' ')).toBe(`${T1} ${T2}`);
  });

  it('Teams-Kennungen der Cues (GUID/n-0) sind kein Text', async () => {
    const roh = await leseTranskript('teams-nachgebaut.vtt', bytesVon('teams-nachgebaut.vtt'));
    expect(roh.beitraege.every(b => !/-0$|[0-9a-f]{8}-[0-9a-f]{4}/.test(b.text))).toBe(true);
  });

  it('Zoom: "Name: Text" in der Cue-Zeile, der Name ist die Kennung und fehlt im Text', async () => {
    const roh = await leseTranskript('zoom-nachgebaut.vtt', bytesVon('zoom-nachgebaut.vtt'));
    expect(roh.beitraege.map(b => b.sprecher)).toEqual(['Erika Muster', 'Max Beispiel', 'Erika Muster', 'Max Beispiel']);
    expect(roh.beitraege.every(b => !b.text.includes('Muster:') && !b.text.includes('Beispiel:'))).toBe(true);
  });

  it('f4: Zeitmarke am Absatzende gehört zum Ende dieses Beitrags und zum Beginn des nächsten, der erste beginnt bei 0', async () => {
    const roh = await leseTranskript('f4-transkript.txt', bytesVon('f4-transkript.txt'));
    expect(roh.beitraege.map(b => [b.zeitMs, b.bisMs])).toEqual([[0, 3200], [3200, 7100], [7100, 14200], [14200, 18400]]);
    expect(roh.beitraege.every(b => !b.text.includes('#'))).toBe(true);
  });

  it('f4 aus Word (.docx): gleiche Zerlegung wie aus .txt', async () => {
    const aus = glatt(await leseTranskript('f4-transkript-nachgebaut.docx', bytesVon('f4-transkript-nachgebaut.docx')));
    const txt = glatt(await leseTranskript('f4-transkript.txt', bytesVon('f4-transkript.txt')));
    expect(aus).toEqual(txt);
  });

  it('"Fazit:" nur einmal und Uhrzeiten wie 10:30 am Zeilenanfang: kein Sprecher, keine Zeit, Text bleibt vollständig', async () => {
    const roh = await leseTranskript('text-fazit-einmal.txt', bytesVon('text-fazit-einmal.txt'));
    expect(roh.beitraege.every(b => b.sprecher === undefined && b.zeitMs === undefined)).toBe(true);
    const alles = roh.beitraege.map(b => b.text).join('\n');
    expect(alles).toContain('Fazit: Die Planung steht.');
    expect(alles).toContain('10:30 Beginn der Übung im Raum 2.');
    expect(alles).toContain('10:45 Pause.');
    expect(vorschlagZuordnung(roh).personen).toEqual([]);
  });

  it('reiner Text ohne Sprecher und Zeit (Sprachmemo): keine Sprecher, keine Zeiten', async () => {
    const roh = await leseTranskript('text-sprachmemo.txt', bytesVon('text-sprachmemo.txt'));
    expect(roh.quelle).toBe('text');
    expect(roh.beitraege.length).toBeGreaterThan(0);
    expect(roh.beitraege.every(b => b.sprecher === undefined && b.zeitMs === undefined)).toBe(true);
  });

  it('Datei über 20 MB: Meldung "zu-gross", nichts gelesen', async () => {
    const gross = new Uint8Array(25 * 1024 * 1024).fill(97);
    const roh = await leseTranskript('riesig.txt', gross);
    expect(roh.beitraege).toEqual([]);
    expect(arten(roh)).toContain('zu-gross');
  });

  it('Zeichensatz: UTF-16, UTF-8 mit BOM und Windows-1252 liefern dieselben Umlaute', async () => {
    for (const n of ['zeichensatz-utf8-bom.txt', 'zeichensatz-utf16le-bom.txt', 'zeichensatz-windows1252.txt', 'zeichensatz-utf8-crlf.txt']) {
      const roh = await leseTranskript(n, bytesVon(n));
      expect(roh.beitraege[0]!.text, n).toContain('für Oktober');
      expect(roh.beitraege[2]!.text, n).toContain('Außerdem muss der Übungstermin');
    }
  });
});

describe('Sprecher vorschlagen (keine Namen raten)', () => {
  it('aTrain: SPEAKER_00/01 -> Person 1/2, Fälle standardmäßig "dokument"', async () => {
    const z = vorschlagZuordnung(await leseTranskript('atrain-transcription.json', bytesVon('atrain-transcription.json')));
    expect(z.faelle).toBe('dokument');
    expect(z.personen.map(p => [p.kennung, p.name])).toEqual([['SPEAKER_00', 'Person 1'], ['SPEAKER_01', 'Person 2']]);
  });
  it('noScribe: S00/S01 -> Person 1/2', async () => {
    const z = vorschlagZuordnung(await leseTranskript('noscribe-transkript.html', bytesVon('noscribe-transkript.html')));
    expect(z.personen.map(p => [p.kennung, p.name])).toEqual([['S00', 'Person 1'], ['S01', 'Person 2']]);
  });
  it('f4: I -> Interviewer/in (Rolle interview), B -> Befragte Person (Rolle befragt)', async () => {
    const z = vorschlagZuordnung(await leseTranskript('f4-transkript.txt', bytesVon('f4-transkript.txt')));
    expect(z.personen.map(p => [p.kennung, p.name, p.rolle])).toEqual([['I', 'Interviewer/in', 'interview'], ['B', 'Befragte Person', 'befragt']]);
  });
  it('Teams: Namen aus der Datei bleiben, Reihenfolge des ersten Auftretens', async () => {
    const z = vorschlagZuordnung(await leseTranskript('teams-nachgebaut.vtt', bytesVon('teams-nachgebaut.vtt')));
    expect(z.personen.map(p => [p.kennung, p.name])).toEqual([['Erika Muster', 'Erika Muster'], ['Max Beispiel', 'Max Beispiel']]);
    expect(z.personen.every(p => ['interview', 'befragt', 'andere'].includes(p.rolle))).toBe(true);
  });
  it('ohne Sprecher: keine Personen', async () => {
    const z = vorschlagZuordnung(await leseTranskript('vtt-ohne-sprecher.vtt', bytesVon('vtt-ohne-sprecher.vtt')));
    expect(z.personen).toEqual([]);
  });
});

describe('Dokument aus strukturierter Quelle: text und abschnitte neu gebaut', () => {
  it('aTrain-JSON: "Name: Inhalt", Trenner Leerzeile, abschnitte über den ganzen Beitrag, Zeiten nur in abschnitte', async () => {
    const roh = await leseTranskript('atrain-transcription.json', bytesVon('atrain-transcription.json'));
    const { dokument } = transkriptDokument(roh, vorschlagZuordnung(roh), 'Semesterplanung');
    const b = [`Person 1: ${T1} ${T2}`, `Person 2: ${T3} ${T4}`, `Person 1: ${T5}`, `Person 2: ${T6}`];
    expect(dokument.text).toBe(b.join('\n\n'));
    expect(dokument.name).toBe('Semesterplanung');
    const ab = dokument.transkript!.abschnitte;
    expect(ab).toHaveLength(4);
    let pos = 0;
    ab.forEach((a, i) => { expect(a.start).toBe(pos); expect(a.ende).toBe(pos + cp(b[i]!)); pos = a.ende + 2; });
    expect(ab.map(a => [a.zeitMs, a.bisMs])).toEqual([[0, 6800], [7100, 14200], [14600, 18000], [18400, 21900]]);
    const name = (id?: string) => dokument.transkript!.sprecher.find(s => s.id === id)?.name;
    expect(ab.map(a => name(a.sprecher))).toEqual(['Person 1', 'Person 2', 'Person 1', 'Person 2']);
    expect(dokument.text).not.toMatch(/\d\d:\d\d:\d\d/);
  });

  it('gewählter Name ersetzt die Kennung im Text', async () => {
    const roh = await leseTranskript('teams-nachgebaut.vtt', bytesVon('teams-nachgebaut.vtt'));
    const z = vorschlagZuordnung(roh);
    z.personen[0]!.name = 'Frau K.';
    const { dokument } = transkriptDokument(roh, z, 'Teams');
    expect(dokument.text.startsWith(`Frau K.: ${T1} ${T2}\n\nMax Beispiel: ${T3} ${T4}`)).toBe(true);
    expect(dokument.text).not.toContain('Erika Muster');
  });

  it('ohne Sprecher: nur der Inhalt, keine Namen, Beiträge durch Leerzeile getrennt', async () => {
    const roh = await leseTranskript('vtt-ohne-sprecher.vtt', bytesVon('vtt-ohne-sprecher.vtt'));
    const { dokument } = transkriptDokument(roh, vorschlagZuordnung(roh), 'Memo');
    const e = erwartet('vtt-ohne-sprecher.vtt').beitraege;
    expect(dokument.text).toBe(e.map(x => x.text).join('\n\n'));
    expect(dokument.transkript!.abschnitte.every(a => a.sprecher === undefined)).toBe(true);
  });

  it('Emoji zählen als ein Zeichen (Codepoints), nicht als zwei (UTF-16)', () => {
    const roh: TranskriptRoh = { quelle: 'vtt', meldungen: [], beitraege: [{ sprecher: 'A', text: 'Super 😀 und 👍!' }, { sprecher: 'B', text: 'Ok' }] };
    const z: SprecherZuordnung = { faelle: 'dokument', personen: [{ kennung: 'A', name: 'Anna', rolle: 'befragt' }, { kennung: 'B', name: 'Ben', rolle: 'interview' }] };
    const { dokument } = transkriptDokument(roh, z, 'Emoji');
    expect(dokument.text).toBe('Anna: Super 😀 und 👍!\n\nBen: Ok');
    const ab = dokument.transkript!.abschnitte;
    expect([ab[0]!.start, ab[0]!.ende]).toEqual([0, 20]);     // UTF-16 wäre 22
    expect([ab[1]!.start, ab[1]!.ende]).toEqual([22, 29]);
  });
});

describe('Dokument aus f4 und reinem Text: Text bleibt wie in der Datei', () => {
  it('f4: text === Dateitext ohne BOM, abschnitte zeigen auf Kennung bis einschließlich Zeitmarke', async () => {
    const roh = await leseTranskript('f4-transkript.txt', bytesVon('f4-transkript.txt'));
    const rohText = textVon('f4-transkript.txt');
    const { dokument } = transkriptDokument(roh, vorschlagZuordnung(roh), 'Interview 1', rohText);
    expect(dokument.text).toBe(rohText);
    const ab = dokument.transkript!.abschnitte;
    expect(ab).toHaveLength(4);
    const ersterEnde = rohText.indexOf('#00:00:03-2#') + '#00:00:03-2#'.length;
    expect([ab[0]!.start, ab[0]!.ende]).toEqual([0, ersterEnde]);
    expect(ab[1]!.start).toBe(rohText.indexOf('B: Gern'));
    expect(ab[3]!.ende).toBe(rohText.indexOf('#00:00:18-4#') + '#00:00:18-4#'.length);
    expect(ab.map(a => [a.zeitMs, a.bisMs])).toEqual([[0, 3200], [3200, 7100], [7100, 14200], [14200, 18400]]);
    const name = (id?: string) => dokument.transkript!.sprecher.find(s => s.id === id)?.name;
    expect(ab.map(a => name(a.sprecher))).toEqual(['Interviewer/in', 'Befragte Person', 'Interviewer/in', 'Befragte Person']);   // Voreinstellung: Kennung bleibt im Text, Name steht im Sprecher
  });

  it('UTF-8 mit BOM: BOM gehört nicht zum Text, Positionen beginnen bei 0', async () => {
    const roh = await leseTranskript('zeichensatz-utf8-bom.txt', bytesVon('zeichensatz-utf8-bom.txt'));
    const { dokument } = transkriptDokument(roh, vorschlagZuordnung(roh), 'BOM', textVon('zeichensatz-utf8-bom.txt'));
    expect(dokument.text.charCodeAt(0)).not.toBe(0xFEFF);
    expect(dokument.text.startsWith('I: Ich habe')).toBe(true);
    expect(dokument.transkript!.abschnitte[0]!.start).toBe(0);
  });

  it('f4 mit Emoji: Positionen in Codepoints', async () => {
    const t = 'I: Super 😀 #00:00:02-0#\n\nB: Ja #00:00:04-0#\n';
    const roh = await leseTranskript('emoji.txt', new TextEncoder().encode(t));
    const { dokument } = transkriptDokument(roh, vorschlagZuordnung(roh), 'Emoji', t);
    const ab = dokument.transkript!.abschnitte;
    expect([ab[0]!.start, ab[0]!.ende]).toEqual([0, 23]);     // UTF-16 wäre 24
    expect(ab[1]!.start).toBe(25);
  });
});

describe('Fälle aus Sprechern', () => {
  const roh: TranskriptRoh = { quelle: 'f4', meldungen: [], beitraege: [
    { sprecher: 'I', text: 'Wer will anfangen?' }, { sprecher: 'B1', text: 'Ich.' }, { sprecher: 'B2', text: 'Gern.' }, { sprecher: 'I', text: 'Danke.' }] };
  const personen = [
    { kennung: 'I', name: 'Interviewer/in', rolle: 'interview' as const },
    { kennung: 'B1', name: 'Person 1', rolle: 'befragt' as const },
    { kennung: 'B2', name: 'Person 2', rolle: 'befragt' as const }];

  it('"dokument": ein Fall mit dem Dokumentnamen, das Dokument hängt daran', () => {
    const { dokument, faelle } = transkriptDokument(roh, { faelle: 'dokument', personen }, 'Gruppe A');
    expect(faelle).toHaveLength(1);
    expect(faelle[0]!.name).toBe('Gruppe A');
    expect(dokument.fall).toBe(faelle[0]!.id);
  });

  it('"personen": je befragte Person ein Fall, Interviewer/in nie', () => {
    const { dokument, faelle } = transkriptDokument(roh, { faelle: 'personen', personen }, 'Gruppe A');
    expect(faelle.map(f => f.name)).toEqual(['Person 1', 'Person 2']);
    const sp = dokument.transkript!.sprecher;
    expect(sp).toHaveLength(3);
    const von = (n: string) => sp.find(s => s.name === n)!;
    expect(von('Interviewer/in').fall).toBeUndefined();
    expect(faelle.map(f => f.id)).toEqual([von('Person 1').fall, von('Person 2').fall]);
  });

  it('gleichWie: zwei Kennungen sind eine Person (ein Sprecher, ein Fall)', () => {
    const r: TranskriptRoh = { quelle: 'atrain', meldungen: [], beitraege: [
      { sprecher: 'SPEAKER_00', text: 'Eins.' }, { sprecher: 'SPEAKER_01', text: 'Frage?' }, { sprecher: 'SPEAKER_02', text: 'Zwei.' }] };
    const z: SprecherZuordnung = { faelle: 'personen', personen: [
      { kennung: 'SPEAKER_00', name: 'Person 1', rolle: 'befragt' },
      { kennung: 'SPEAKER_01', name: 'Interviewer/in', rolle: 'interview' },
      { kennung: 'SPEAKER_02', name: 'Person 1', rolle: 'befragt', gleichWie: 'SPEAKER_00' }] };
    const { dokument, faelle } = transkriptDokument(r, z, 'Doppelt');
    expect(dokument.transkript!.sprecher).toHaveLength(2);
    expect(dokument.text).toBe('Person 1: Eins.\n\nInterviewer/in: Frage?\n\nPerson 1: Zwei.');
    const ab = dokument.transkript!.abschnitte;
    expect(ab[0]!.sprecher).toBe(ab[2]!.sprecher);
    expect(ab[0]!.sprecher).not.toBe(ab[1]!.sprecher);
    expect(faelle).toHaveLength(1);
  });
});

/* Entscheide F1-F11 (Opus, docs/erheben/FACHBLATT-STUFE-4.md, Abschnitt "4A", ganz unten). Die Zerlegung steht in den Sollwert-Dateien; hier die Eigenschaften, die man sonst übersieht. */
describe('Entscheide F1-F11', () => {
  it('F1: Marke am Absatzanfang -> zeitMs dieses Beitrags, bisMs = Beginn des nächsten, letzter Beitrag ohne Ende, keine Meldung', async () => {
    const roh = await leseTranskript('f4-zeitmarke-absatzanfang.txt', bytesVon('f4-zeitmarke-absatzanfang.txt'));
    expect(roh.beitraege.map(b => [b.zeitMs, b.bisMs])).toEqual([[0, 3200], [3200, 7100], [7100, 14200], [14200, undefined]]);
    expect(roh.meldungen).toEqual([]);
    expect(roh.beitraege.every(b => !b.text.includes('#') && b.sprecher !== undefined)).toBe(true);
  });
  it('F1: gemischt -> Absatzende-Regel und Meldung "zeitmarken-gemischt"', async () => {
    const roh = await leseTranskript('f4-zeitmarken-gemischt.txt', bytesVon('f4-zeitmarken-gemischt.txt'));
    expect(arten(roh)).toEqual(['zeitmarken-gemischt']);
    expect(roh.beitraege.map(b => b.bisMs)).toEqual([3200, 7100, 14200, 18400]);
  });
  it('F2: Marke mitten im Absatz bleibt im Text und ändert die Zeiten des Beitrags nicht, Absatz wird nicht geteilt', async () => {
    const roh = await leseTranskript('f4-zeitmarke-mitten.txt', bytesVon('f4-zeitmarke-mitten.txt'));
    expect(roh.beitraege).toHaveLength(4);
    expect(roh.beitraege[2]!.text).toContain('#00:00:09-0#');
    expect([roh.beitraege[2]!.zeitMs, roh.beitraege[2]!.bisMs]).toEqual([7100, 14200]);
  });
  it('F3: noScribe-VTT erkannt am NOTE-Block, Teams am <v>, Zoom am Muster, sonst vtt', async () => {
    const q = async (n: string) => (await leseTranskript(n, bytesVon(n))).quelle;
    expect(await q('noscribe-transkript.vtt')).toBe('noscribe');
    expect(await q('teams-nachgebaut.vtt')).toBe('teams');
    expect(await q('zoom-nachgebaut.vtt')).toBe('zoom');
    expect(await q('vtt-ohne-sprecher.vtt')).toBe('vtt');
  });
  it('F4: aTrain-TXT ohne Sprecher -> ein Beitrag je nichtleere Zeile, die Überschrift fehlt', async () => {
    const roh = await leseTranskript('atrain-transcription-ohne-sprecher.txt', bytesVon('atrain-transcription-ohne-sprecher.txt'));
    expect(roh.beitraege).toHaveLength(6);
    expect(roh.beitraege.some(b => b.text.includes('Transcription for'))).toBe(false);
  });
  // F12 (offen, Frage an Opus): In dieser echten noScribe-TXT kommt S01 nur EINMAL vor. Nach der Regel "mindestens zweimal" wäre S01 dann kein Sprecher. Erwartet wird hier: bekannte Muster (S00, S01 …, SPEAKER_00 …) zählen schon bei einem Vorkommen.
  it('F5: noScribe-TXT -> Kopfblock mit "noScribe" ist kein Beitrag, Zeit [hh:mm:ss] nur als Beginn', async () => {
    const roh = await leseTranskript('noscribe-transkript.txt', bytesVon('noscribe-transkript.txt'));
    expect(roh.beitraege.map(b => b.sprecher)).toEqual(['S00', 'S01', 'S00']);
    expect(roh.beitraege.some(b => /noScribe|Audio file|Language:|^Semesterplanung$/.test(b.text))).toBe(false);
  });
  it('F5: Text ohne Leerzeile -> ein Beitrag je Zeile', async () => {
    const roh = await leseTranskript('x.txt', new TextEncoder().encode(['Erste Zeile.', 'Zweite Zeile.', 'Dritte Zeile.', ''].join(String.fromCharCode(10))));
    expect(roh.beitraege.map(b => b.text)).toEqual(['Erste Zeile.', 'Zweite Zeile.', 'Dritte Zeile.']);
  });
  it('F6: Überlappung -> eigener Beitrag, die // fallen weg, Meldung "ueberlappung" mit Anzahl im Satz', async () => {
    const roh = await leseTranskript('noscribe-ueberlappung.html', bytesVon('noscribe-ueberlappung.html'));
    expect(roh.beitraege.some(b => b.text.includes('//') || (b.sprecher ?? '').includes('//'))).toBe(false);
    const m = roh.meldungen.filter(x => x.art === 'ueberlappung');
    expect(m).toHaveLength(1);
    expect(m[0]!.satz).toMatch(/\b1\b/);
  });
  it('F7: Beitrag.text enthält nie Kennung oder Rand-Zeitmarke', async () => {
    for (const n of ['f4-transkript.txt', 'f4-zeitmarke-absatzanfang.txt', 'atrain-transcription_timestamps.txt', 'noscribe-transkript.txt']) {
      const roh = await leseTranskript(n, bytesVon(n));
      for (const b of roh.beitraege) {
        expect(b.text, n).not.toMatch(/^(I|B|S0\d|SPEAKER_0\d):/);
        expect(b.text, n).not.toMatch(/^\s*(#\d\d:\d\d:\d\d-\d#|\[\d\d:\d\d:\d\d\])/);
        expect(b.text, n).not.toMatch(/(#\d\d:\d\d:\d\d-\d#|\[\d\d:\d\d:\d\d\])\s*$/);
      }
    }
  });
  it('F8: UTF-16 mit BOM meldet "bom" wie UTF-8 mit BOM', async () => {
    expect(arten(await leseTranskript('a.txt', bytesVon('zeichensatz-utf16le-bom.txt')))).toEqual(['bom']);
    expect(arten(await leseTranskript('a.txt', bytesVon('zeichensatz-utf8-bom.txt')))).toEqual(['bom']);
  });
  it('F9: f4 als Word hat quelle "docx"', async () => {
    expect((await leseTranskript('f4-transkript-nachgebaut.docx', bytesVon('f4-transkript-nachgebaut.docx'))).quelle).toBe('docx');
  });
  it('F10: leere Cues zählen nicht für die Pause (Pause wird zwischen nichtleeren Cues gemessen)', async () => {
    const roh = await leseTranskript('vtt-leerer-cue-pause.vtt', bytesVon('vtt-leerer-cue-pause.vtt'));
    expect(roh.beitraege.map(b => b.text)).toEqual(['Eins.', 'Zwei.']);
  });
  it('F11: Zeit rückwärts beim gleichen Sprecher -> nicht zusammengefasst, nichts umsortiert', async () => {
    const roh = await leseTranskript('vtt-rueckwaerts-gleicher-sprecher.vtt', bytesVon('vtt-rueckwaerts-gleicher-sprecher.vtt'));
    expect(roh.beitraege.map(b => b.zeitMs)).toEqual([10000, 5000]);
    expect(arten(roh)).toEqual(['zeit-rueckwaerts']);
  });
});
