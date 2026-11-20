/**
 * Stufe A1: Fassung 3 für `kiNutzung` und `typen` (Pflichttests Architekturblatt Ausbau, Abschnitt 4), Änderungsprotokoll des Codebuchs
 * (Abschnitt 3) und Pseudonymisieren der neuen Freitext-Felder (Abschnitt 2).
 */
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { neuesQualProjekt, pruefeQualProjekt, qualFassung, BEKANNTE_FELDER } from './qualprojekt';
import type { QualProjekt } from './qualprojekt';
import { aendereCode, entferneCode, legeCodeAn, verschiebeCode } from './kodieren';
import { aendereCodes } from './interviews-qual';
import { codeProtokoll, codeUnterschiede, mitCodeProtokoll, protokolliere, TEXT_MAX, ZUSAMMENFASSEN_MS } from './codebuch-protokoll';
import { ersetze, findeTreffer } from './pseudonym';

const rund = (p: unknown): QualProjekt => pruefeQualProjekt(JSON.parse(JSON.stringify(p)));
const sortiert = (x: unknown): unknown => {
  if (Array.isArray(x)) return x.map(sortiert);
  if (x && typeof x === 'object') return Object.fromEntries(Object.keys(x).sort().map(k => [k, sortiert((x as Record<string, unknown>)[k])]));
  return x;
};

function basis(): QualProjekt {
  const q = neuesQualProjekt('A1');
  q.kodierende.push({ id: 'k1', name: 'Ich' });
  q.ich = 'k1';
  q.faelle.push({ id: 'f1', name: 'P1', werte: {} }, { id: 'f2', name: 'P2', werte: {} });
  q.variablen.push({ id: 'v1', name: 'Tutorium', typ: 'ja/nein' });
  q.codes.push({ id: 'c1', name: 'Hilfe suchen', kodierbar: true, reihenfolge: 0 });
  q.dokumente.push({ id: 'd1', name: 'Interview P1', art: 'text', text: 'Anna Berger fragt ihre Tutorin.', erstellt: 1, geaendert: 1, fall: 'f1' });
  return q;
}

describe('Fassung 3 (Pflichttests 1-4)', () => {
  const alt = fileURLToPath(new URL('../../../docs/erheben/stufe6c/testprojekt-6c.json', import.meta.url));
  it.skipIf(!existsSync(alt))('1. altes Projekt Fassung 1: lesen und schreiben ergibt dasselbe JSON und dieselbe Fassung', () => {
    const j = JSON.parse(readFileSync(alt, 'utf8'));
    const r = pruefeQualProjekt(j);
    expect(r.version).toBe(1);
    expect(sortiert(JSON.parse(JSON.stringify({ ...r, version: qualFassung(r) })))).toEqual(sortiert(j));
  });
  it('1. Projekt Fassung 2 bleibt 2', () => {
    const q = basis();
    q.memos.push({ id: 'm1', text: 'Notiz', art: 'feldnotiz-methodisch', bezug: [{ art: 'projekt' }], erstellt: 2 });
    const r = rund({ ...q, version: 2 });
    expect(r.version).toBe(2);
    expect(rund(r)).toEqual(r);
  });
  it('2. Projekt mit nur `arbeitsweise` bleibt Fassung 1, die Angabe bleibt erhalten', () => {
    const r = rund({ ...basis(), arbeitsweise: 'ta-reflexiv' });
    expect(r.version).toBe(1);
    // seit A3 ein bekanntes Feld (vorher in `_unbekannt`)
    expect(r.arbeitsweise).toBe('ta-reflexiv');
    expect(r._unbekannt).toBeUndefined();
  });
  it('3. kiNutzung hebt auf 3, verlustfrei hin und zurück', () => {
    const q = basis();
    q.kiNutzung = { genutzt: true, zwecke: ['transkription', 'uebersetzung'], text: 'Whisper (aTrain), danach selbst geprüft', geaendert: 9, kodierende: 'k1' };
    expect(qualFassung(q)).toBe(3);
    const r = rund(q);
    expect(r.version).toBe(3);
    expect(r.kiNutzung).toEqual(q.kiNutzung);
    expect(rund(r)).toEqual(r);
  });
  it('3. „nicht genutzt“ ist eine Angabe und hebt auch auf 3; ohne Feld bleibt 1', () => {
    const q = basis();
    expect(qualFassung(q)).toBe(1);
    q.kiNutzung = { genutzt: false, zwecke: [], geaendert: 9 };
    expect(rund(q).version).toBe(3);
    expect(rund(q).kiNutzung).toEqual({ genutzt: false, zwecke: [], geaendert: 9 });
  });
  it('3. typen heben auf 3, verlustfrei; leere Liste nicht', () => {
    const q = basis();
    q.typen = [];
    expect(qualFassung(q)).toBe(1);
    q.typen = [{ id: 't1', name: 'Die Selbstständigen', beschreibung: 'fragen spät', faelle: ['f1'], merkmale: ['c1', 'v1'] }];
    const r = rund(q);
    expect(r.version).toBe(3);
    expect(r.typen).toEqual(q.typen);
    expect(rund(r)).toEqual(r);
  });
  it('4. Fassung 4 wird laut abgelehnt', () => {
    expect(() => pruefeQualProjekt({ ...basis(), version: 4 })).toThrow(/Fassung/);
  });
  it('BEKANNTE_FELDER kennt kiNutzung und typen', () => {
    expect(BEKANNTE_FELDER).toContain('kiNutzung');
    expect(BEKANNTE_FELDER).toContain('typen');
  });
  it('lehnt falsche Angaben ab (unbekannter Zweck, doppelte Typ-ids); tote Verweise im Typ fallen weg', () => {
    expect(() => rund({ ...basis(), kiNutzung: { genutzt: true, zwecke: ['deutung'], geaendert: 1 } })).toThrow(/Zweck/);
    expect(rund({ ...basis(), typen: [{ id: 't', name: 'x', faelle: ['f9', 'f1', 'f1'], merkmale: ['c9', 'v1'] }] }).typen).toEqual([{ id: 't', name: 'x', faelle: ['f1'], merkmale: ['v1'] }]);
    expect(() => rund({ ...basis(), typen: [{ id: 't', name: 'x', faelle: [], merkmale: [] }, { id: 't', name: 'y', faelle: [], merkmale: [] }] })).toThrow();
  });
});

describe('Änderungsprotokoll des Codebuchs', () => {
  it('jede Art Änderung im Kodier-Arbeitsplatz schreibt einen Eintrag mit fester Kennung', () => {
    let q = basis();
    const r = legeCodeAn(q, 'Peers'); q = r.q;
    q = aendereCode(q, r.id, { definition: 'Hilfe von Mitstudierenden' });
    q = aendereCode(q, r.id, { regel: 'nur ausdrücklich genannte Personen' });
    q = aendereCode(q, r.id, { anker: [{ text: 'Anna Berger fragt ihre Tutorin.' }] });
    q = aendereCode(q, r.id, { name: 'Mitstudierende' });
    q = aendereCode(q, r.id, { kodierbar: false });
    q = verschiebeCode(q, r.id, { elternId: 'c1' });
    q = entferneCode(q, r.id);
    const was = q.protokoll.map(a => a.was);
    expect(was).toEqual(['code.neu', 'code.definition', 'code.regel', 'code.anker', 'code.umbenannt', 'code.kodierbar', 'code.verschoben', 'code.geloescht']);
    expect(q.protokoll.every(a => a.kodierende === 'k1')).toBe(true);
    expect(q.protokoll[6]!.nachher).toEqual({ code: r.id, text: 'Hilfe suchen' });
  });
  it('nie Text aus Dokumenten: Ankerbeispiele nur als Zahl', () => {
    let q = basis();
    q = aendereCode(q, 'c1', { anker: [{ text: 'Anna Berger fragt ihre Tutorin.' }] });
    expect(JSON.stringify(q.protokoll)).not.toContain('Anna');
    expect(q.protokoll[0]).toMatchObject({ was: 'code.anker', vorher: { code: 'c1', anzahl: 0 }, nachher: { code: 'c1', anzahl: 1 } });
  });
  it('Tippen in der Definition: ein Eintrag je Feld und Code innerhalb von 60 s, erster `vorher` bleibt', () => {
    const q = basis();
    let p = protokolliere(q.protokoll, { was: 'code.definition', vorher: { code: 'c1', text: '' }, nachher: { code: 'c1', text: 'H' } }, 1000, 'k1');
    p = protokolliere(p, { was: 'code.definition', vorher: { code: 'c1', text: 'H' }, nachher: { code: 'c1', text: 'Hilfe' } }, 1000 + ZUSAMMENFASSEN_MS, 'k1');
    expect(p).toHaveLength(1);
    expect(p[0]).toEqual({ zeit: 1000 + ZUSAMMENFASSEN_MS, kodierende: 'k1', was: 'code.definition', vorher: { code: 'c1', text: '' }, nachher: { code: 'c1', text: 'Hilfe' } });
    p = protokolliere(p, { was: 'code.definition', vorher: { code: 'c1', text: 'Hilfe' }, nachher: { code: 'c1', text: 'Hilfe!' } }, 2001 + 2 * ZUSAMMENFASSEN_MS, 'k1');
    expect(p).toHaveLength(2);
    p = protokolliere(p, { was: 'code.regel', vorher: { code: 'c1', text: '' }, nachher: { code: 'c1', text: 'R' } }, 2002 + 2 * ZUSAMMENFASSEN_MS, 'k1');
    p = protokolliere(p, { was: 'code.regel', vorher: { code: 'c1', text: 'R' }, nachher: { code: 'c1', text: 'Rx' } }, 2003 + 2 * ZUSAMMENFASSEN_MS, 'k2');
    expect(p).toHaveLength(4);   // andere Person: eigener Eintrag
  });
  it('lange Texte werden gekürzt, Leerraum zusammengezogen', () => {
    const u = codeUnterschiede([{ id: 'c', name: 'a', kodierbar: true, reihenfolge: 0 }], [{ id: 'c', name: 'a', kodierbar: true, reihenfolge: 0, definition: 'x\n\n'.repeat(500) }]);
    const t = (u[0]!.nachher as { text: string }).text;
    expect(t.length).toBe(TEXT_MAX);
    expect(t).not.toMatch(/\n/);
  });
  it('nur Reihenfolge geändert: kein Eintrag; gleiche Codes: dasselbe Objekt', () => {
    const q = basis();
    expect(mitCodeProtokoll(q, { ...q, codes: q.codes.map(c => ({ ...c, reihenfolge: 5 })) }).protokoll).toHaveLength(0);
    expect(mitCodeProtokoll(q, q)).toBe(q);
  });
  it('Kodierleitfaden (aendereCodes) schreibt dieselben Einträge', () => {
    const q = basis();
    const r = aendereCodes(q, [{ ...q.codes[0]!, name: 'Hilfe holen' }, { id: 'c2', name: 'Neu', kodierbar: true, reihenfolge: 1 }]);
    expect(r.protokoll.map(a => a.was)).toEqual(['code.umbenannt', 'code.neu']);
  });
  it('codeProtokoll: nur Codebuch-Einträge, neueste zuerst; Einträge anderer Teile bleiben draußen', () => {
    let q = basis();
    q.protokoll.push({ zeit: 1, was: 'Dokument „x“: pseudonymisiert, 2 Stellen' });
    q = aendereCode(q, 'c1', { name: 'A' });
    q = legeCodeAn(q, 'B').q;
    expect(codeProtokoll(q).map(a => a.was)).toEqual(['code.neu', 'code.umbenannt']);
  });
  it('Protokoll bleibt beim Speichern erhalten und hebt die Fassung nicht', () => {
    const q = aendereCode(basis(), 'c1', { name: 'A' });
    const r = rund(q);
    expect(r.protokoll).toEqual(q.protokoll);
    expect(r.version).toBe(1);
  });
});

describe('Pseudonymisieren über die neuen Freitext-Felder', () => {
  it('ersetzt Namen in kiNutzung.text und in Typen, aber nicht in Wortteilen', () => {
    const q = basis();
    q.kiNutzung = { genutzt: true, zwecke: ['anderes'], text: 'Anna Berger hat mit Whisper transkribiert; Annabell nicht.', geaendert: 1 };
    q.typen = [{ id: 't1', name: 'Wie Anna Berger', beschreibung: 'ähnlich wie Anna Berger', faelle: ['f1'], merkmale: [] }];
    const t = findeTreffer(q, { namen: [{ text: 'Anna Berger', art: 'person' }], regeln: [], sprecherAlsPersonen: false }, 'de');
    const { projekt } = ersetze(q, t, 5);
    expect(projekt.kiNutzung!.text).not.toContain('Anna Berger');
    expect(projekt.kiNutzung!.text).toContain('Annabell');
    expect(projekt.typen![0]!.name).not.toContain('Anna');
    expect(projekt.typen![0]!.beschreibung).not.toContain('Anna');
    expect(projekt.dokumente[0]!.text).not.toContain('Anna');
    expect(q.kiNutzung.text).toContain('Anna Berger');   // Eingabe unverändert
  });
});
