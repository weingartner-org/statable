/**
 * Paket 4C-1: reine Logik der Seite „Interviews“ (Transkript ins Projekt, Dokument entfernen, Hauptkategorien, Codes entfernen)
 * und der Zustand ohne Projekt (`interviews.svelte.ts`).
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { s } from './sitzung.svelte';
import { behalteInterviews, aendereKodierleitfaden, codesListe, entferneKodierleitfadenCode, entferneTranskript, iv, nimmTranskriptAuf, qualProjekt, uebernimmHauptkategorien } from './interviews.svelte';
import { aendereCodes, benenneDokumentUm, entferneCodeMitKodierungen, entferneDokument, fuegeQualZusammen, hauptkategorienAlsCodes, transkriptZeile, uebernimmTranskript } from './interviews-qual';
import { leseTranskript, transkriptDokument, vorschlagZuordnung, type SprecherZuordnung } from './transkript-lesen';

const VTT = `WEBVTT

00:00:01.000 --> 00:00:04.000
<v Interviewerin>Wie planen Sie Ihr Semester?</v>

00:00:05.000 --> 00:00:12.500
<v Studentin>Ich plane mit einem Kalender.</v>
`;
const lies = async () => leseTranskript('Interview 1.vtt', new TextEncoder().encode(VTT));

describe('Transkript ins Projekt übernehmen', () => {
  it('legt das QualProjekt an, ein Dokument-Fall, Dokument mit Beiträgen und Dauer', async () => {
    const roh = await lies();
    const erg = transkriptDokument(roh, vorschlagZuordnung(roh), 'Interview 1', undefined, { name: 'Interview 1.vtt', sha256: 'abc' });
    const q = uebernimmTranskript(undefined, erg, 'Mein Projekt', roh.quelle, 'Interview 1.vtt');
    expect(q.name).toBe('Mein Projekt');
    expect(q.herkunft).toMatchObject({ art: 'transkript', programm: 'teams', datei: 'Interview 1.vtt' });
    expect(q.dokumente).toHaveLength(1);
    expect(q.dokumente[0]!.datei?.sha256).toBe('abc');
    expect(q.faelle.map(f => f.name)).toEqual(['Interview 1']);
    expect(q.dokumente[0]!.fall).toBe(q.faelle[0]!.id);
    const z = transkriptZeile(q.dokumente[0]!, 'de');
    expect(z).toMatchObject({ programm: 'teams', beitraege: 2, personen: 2, dauerMs: 12500 });
    expect(typeof z.hinweise).toBe('number');
  });
  it('jede befragte Person ein Fall: Fälle und Variable Rolle, die Variable nicht doppelt', async () => {
    const roh = await lies();
    const zu: SprecherZuordnung = vorschlagZuordnung(roh);
    zu.faelle = 'personen';
    zu.personen[0]!.rolle = 'interview'; zu.personen[1]!.rolle = 'befragt';
    const a = uebernimmTranskript(undefined, transkriptDokument(roh, zu, 'A'), 'P', 'teams', 'a.vtt');
    expect(a.faelle.map(f => f.name)).toEqual(['Studentin']);
    expect(a.variablen.map(v => v.name)).toEqual(['Rolle']);
    const b = uebernimmTranskript(a, transkriptDokument(roh, zu, 'B'), 'P', 'teams', 'b.vtt');
    expect(b.dokumente).toHaveLength(2);
    expect(b.faelle).toHaveLength(2);
    expect(b.variablen).toHaveLength(1);
    expect(a.dokumente).toHaveLength(1);   // das Übergebene bleibt unverändert
  });
  it('Entfernen: Dokument, sein Fall und Segmente mit Kodierungen weg; fremde Fälle bleiben', async () => {
    const roh = await lies();
    let q = uebernimmTranskript(undefined, transkriptDokument(roh, vorschlagZuordnung(roh), 'A'), 'P', 'teams', 'a.vtt');
    q = uebernimmTranskript(q, transkriptDokument(roh, vorschlagZuordnung(roh), 'B'), 'P', 'teams', 'b.vtt');
    const [a, b] = q.dokumente;
    q = { ...q, codes: [{ id: 'c1', name: 'Zeit', kodierbar: true, reihenfolge: 0 }],
      segmente: [{ id: 's1', dokument: a!.id, start: 0, ende: 3, erstellt: 1 }, { id: 's2', dokument: b!.id, start: 0, ende: 3, erstellt: 1 }],
      kodierungen: [{ id: 'k1', segment: 's1', code: 'c1', kodierende: 'x', erstellt: 1 }, { id: 'k2', segment: 's2', code: 'c1', kodierende: 'x', erstellt: 1 }] };
    const r = entferneDokument(q, a!.id);
    expect(r.dokumente.map(d => d.name)).toEqual(['B']);
    expect(r.faelle.map(f => f.id)).toEqual([b!.fall]);
    expect(r.segmente.map(x => x.id)).toEqual(['s2']);
    expect(r.kodierungen.map(x => x.id)).toEqual(['k2']);
    expect(entferneDokument(q, 'gibt-es-nicht')).toBe(q);
  });
  it('Umbenennen ändert nur den Namen; leerer Name nichts', async () => {
    const roh = await lies();
    const q = uebernimmTranskript(undefined, transkriptDokument(roh, vorschlagZuordnung(roh), 'A'), 'P', 'teams', 'a.vtt');
    const id = q.dokumente[0]!.id;
    expect(benenneDokumentUm(q, id, '  Neu ').dokumente[0]!.name).toBe('Neu');
    expect(benenneDokumentUm(q, id, '   ')).toBe(q);
    expect(benenneDokumentUm(q, id, 'Neu').dokumente[0]!.text).toBe(q.dokumente[0]!.text);
  });
});

describe('Hauptkategorien und Codes', () => {
  it('keine Doppelten (Groß-/Kleinschreibung, Leerraum), doppelte Namen in der Liste einmal, leere nicht', () => {
    const r1 = hauptkategorienAlsCodes(undefined, ['Stress', ' Zeit ', 'stress', '', 'Lernen'], 'P');
    expect(r1.neu).toEqual(['Stress', 'Zeit', 'Lernen']);
    expect(r1.qual.codes.map(c => [c.name, c.kodierbar, c.reihenfolge])).toEqual([['Stress', true, 0], ['Zeit', true, 1], ['Lernen', true, 2]]);
    const r2 = hauptkategorienAlsCodes(r1.qual, ['ZEIT', 'Neu'], 'P');
    expect(r2.neu).toEqual(['Neu']);
    expect(r2.uebersprungen).toEqual(['ZEIT']);
    expect(r2.qual.codes).toHaveLength(4);
  });
  it('Code entfernen: Unterkategorien rücken hoch, Kodierungen auf den Code fallen weg', () => {
    let q = hauptkategorienAlsCodes(undefined, ['A', 'B'], 'P').qual;
    const a = q.codes[0]!, b = q.codes[1]!;
    q = { ...q, codes: [...q.codes, { id: 'u1', name: 'A1', elternId: a.id, kodierbar: true, reihenfolge: 0 }],
      segmente: [{ id: 's1', dokument: 'd', start: 0, ende: 1, erstellt: 1 }],
      kodierungen: [{ id: 'k1', segment: 's1', code: a.id, kodierende: 'x', erstellt: 1 }, { id: 'k2', segment: 's1', code: b.id, kodierende: 'x', erstellt: 1 }] };
    const r = entferneCodeMitKodierungen(q, a.id);
    expect(r.codes.map(c => c.name).sort()).toEqual(['A1', 'B']);
    expect(r.codes.find(c => c.id === 'u1')!.elternId).toBeUndefined();
    expect(r.kodierungen.map(k => k.id)).toEqual(['k2']);
    expect(r.segmente).toHaveLength(1);
    expect(aendereCodes(q, q.codes).kodierungen).toBe(q.kodierungen);   // nichts verwaist: dieselbe Liste
  });
  it('Entwurf in ein vorhandenes Projekt einfügen: nichts überschrieben, gleiche Kategorien nicht doppelt', () => {
    const q = hauptkategorienAlsCodes(undefined, ['A'], 'P').qual;
    const e = hauptkategorienAlsCodes(undefined, ['a', 'B'], 'E').qual;
    const m = fuegeQualZusammen(q, e);
    expect(m.codes.map(c => c.name)).toEqual(['A', 'B']);
    expect(m.id).toBe(q.id);
  });
});

describe('Zustand ohne Projekt (Entwurf)', () => {
  beforeEach(() => { iv.qualEntwurf = undefined; iv.offen = null; iv.hauptkategorien = []; s.projekt = null; s.qual = undefined; });
  it('Transkript aufnehmen, Hauptkategorien, Kodierleitfaden, Entfernen schließt die Ansicht', async () => {
    expect(qualProjekt()).toBeUndefined();
    const roh = await lies();
    nimmTranskriptAuf(transkriptDokument(roh, vorschlagZuordnung(roh), 'A'), roh.quelle, 'A.vtt');
    const id = qualProjekt()!.dokumente[0]!.id;
    iv.offen = id;
    expect(uebernimmHauptkategorien(['Stress', 'stress', 'Zeit'])).toBe(2);
    expect(codesListe().map(c => c.name)).toEqual(['Stress', 'Zeit']);
    aendereKodierleitfaden([...codesListe(), { id: 'x', name: 'Neu', kodierbar: true, reihenfolge: 2 }]);
    expect(codesListe()).toHaveLength(3);
    entferneKodierleitfadenCode('x');
    expect(codesListe()).toHaveLength(2);
    entferneTranskript(id);
    expect(qualProjekt()!.dokumente).toHaveLength(0);
    expect(iv.offen).toBeNull();
  });
});

describe('behalteInterviews (neues Projekt für Redeanteile)', () => {
  it('legt Transkripte und Leitfäden nach dem Öffnen eines neuen Projekts wieder hinein', async () => {
    const roh = await lies();
    const erg = transkriptDokument(roh, vorschlagZuordnung(roh), 'Interview 1', undefined, { name: 'Interview 1.vtt', sha256: 'abc' });
    const q = uebernimmTranskript(undefined, erg, 'P', roh.quelle, 'Interview 1.vtt');
    const lf = [{ id: 'l1' }] as unknown as typeof s.leitfaeden;
    s.projekt = { name: 'alt' } as unknown as typeof s.projekt; s.qual = q; s.leitfaeden = lf;
    try {
      await behalteInterviews(async () => { s.qual = undefined; s.leitfaeden = []; });   // so tut oeffneNeueDaten: neues, leeres Projekt
      expect(s.qual).toBe(q);
      expect(s.leitfaeden).toBe(lf);
    } finally { s.projekt = undefined as unknown as typeof s.projekt; s.qual = undefined; s.leitfaeden = []; }
  });
});
