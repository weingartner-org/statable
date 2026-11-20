import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { neuesQualProjekt, pruefeQualProjekt, qualFassung } from './qualprojekt';
import type { Einwilligung, Protokoll, QualProjekt } from './qualprojekt';

/* Sollwerte F2: SCHNITTSTELLEN-F2.md Abschnitt 0 und ARCHITEKTUR-DATENMODELL-FEINSTRUKTUR.md Abschnitte 5 und 6. */

const rund = (p: unknown): QualProjekt => pruefeQualProjekt(JSON.parse(JSON.stringify(p)));

function basis(): QualProjekt {
  const q = neuesQualProjekt('F2');
  q.kodierende.push({ id: 'k1', name: 'Ich' });
  q.faelle.push({ id: 'f1', name: 'B1', werte: {} }, { id: 'f3', name: 'B3', werte: { Alter: 30 } });
  q.dokumente.push({ id: 'd1', name: 'Interview B1', art: 'text', text: 'B1: Hallo', erstellt: 1, geaendert: 1, fall: 'f1' });
  return q;
}
const protokoll = (extra: Partial<Protokoll> = {}): Protokoll => ({
  id: 'p1', art: 'interview', fall: 'f1', dokument: 'd1',
  kopf: { datum: '2027-03-12', uhrzeit: '14:30', ort: 'Café', dauerMin: 45, kontaktweg: 'Mail' },
  felder: { zustandekommen: 'über eine Freundin', raum: 'Café, laut', thesen: 'Rollenbild' },
  schwierigeStellen: [{ zeitMs: 61000, text: 'Pause' }, { position: 5, text: 'Stocken' }],
  erstellt: 1, geaendert: 2, kodierende: 'k1', ...extra
});
const gedaechtnis = (): Protokoll => ({
  id: 'p2', art: 'gedaechtnis', kopf: { datum: '2027-03-13' }, felder: {},
  schritte: { s1: { text: 'roh', beginn: 1000 }, s2: { text: 'Folge', notizen: 'Jottings' }, s3: { abschnitte: [{ beobachtung: 'Er stand auf.', ueberlegung: 'Wollte er gehen?' }] } },
  erstellt: 3, geaendert: 4
});
const einwilligung = (extra: Partial<Einwilligung> = {}): Einwilligung => ({
  id: 'e1', fall: 'f3', fassung: 'Info-Blatt 2027-03, Fassung 1', form: 'schriftlich',
  punkte: [
    { punkt: 'teilnahme', stand: 'erteilt', datum: '2027-03-01' },
    { punkt: 'aufnahme', stand: 'widerrufen', datum: '2027-03-12', notiz: 'am Telefon' },
    { punkt: 'transkript', stand: 'erteilt' },
    { punkt: 'zitate', stand: 'abgelehnt', datum: '2027-03-01' },
    { punkt: 'archivierung', stand: 'offen' },
    { punkt: 'weitergabe', stand: 'offen' }
  ],
  widerrufe: [{ datum: '2027-03-12', punkte: ['aufnahme'], notiz: 'am Telefon' }],
  wiedervorlage: [{ datum: '2027-06-01', anlass: 'vor der Veröffentlichung noch einmal fragen' }, { datum: '2027-02-01', anlass: 'alt', erledigt: '2027-02-02' }],
  loeschen: [{ was: 'aufnahme', bis: '2027-04-01' }, { was: 'kontaktdaten', bis: '2027-09-01', erledigt: '2027-09-02' }],
  zugriffskreis: 'nur ich und die Betreuerin',
  erstellt: 5, geaendert: 6, ...extra
});
function voll(): QualProjekt {
  const q = basis();
  q.protokolle = [protokoll(), gedaechtnis()];
  q.einwilligungen = [einwilligung()];
  q.memos.push({ id: 'm1', text: 'Was geschah', art: 'feldnotiz-empirisch', bezug: [{ art: 'protokoll', id: 'p1' }], erstellt: 7 });
  q.dokumente[0]!.transkript = { sprecher: [{ id: 's1', name: 'B1', rolle: 'befragt', fall: 'f1' }], abschnitte: [{ start: 0, ende: 9, sprecher: 's1' }], regeln: 'froschauer-lueger' };
  q.version = 2;
  return q;
}

describe('qualFassung', () => {
  it('neues Projekt: 1', () => expect(qualFassung(basis())).toBe(1));
  it('leere Listen: 1', () => {
    const q = basis(); q.protokolle = []; q.einwilligungen = [];
    expect(qualFassung(q)).toBe(1);
  });
  it('Protokoll: 2', () => { const q = basis(); q.protokolle = [protokoll()]; expect(qualFassung(q)).toBe(2); });
  it('Einwilligung: 2', () => { const q = basis(); q.einwilligungen = [einwilligung()]; expect(qualFassung(q)).toBe(2); });
  it.each(['feldnotiz-empirisch', 'feldnotiz-methodisch', 'feldnotiz-theoretisch'] as const)('Memo-Art %s: 2', (art) => {
    const q = basis(); q.memos.push({ id: 'm', text: 'x', bezug: [], erstellt: 1, art }); expect(qualFassung(q)).toBe(2);
  });
  it('Memo-Art „memo“ oder ohne Art: 1', () => {
    const q = basis(); q.memos.push({ id: 'm', text: 'x', bezug: [], erstellt: 1, art: 'memo' }, { id: 'n', text: 'y', bezug: [], erstellt: 1 });
    expect(qualFassung(q)).toBe(1);
  });
  it('Transkript nach Froschauer und Lueger: 2; Regeln einfach oder erweitert: 1', () => {
    const q = basis();
    q.dokumente[0]!.transkript = { sprecher: [], abschnitte: [], regeln: 'froschauer-lueger' };
    expect(qualFassung(q)).toBe(2);
    q.dokumente[0]!.transkript.regeln = 'einfach'; expect(qualFassung(q)).toBe(1);
    q.dokumente[0]!.transkript.regeln = 'erweitert'; expect(qualFassung(q)).toBe(1);
  });
});

describe('pruefeQualProjekt: Fassung 2', () => {
  it('liest alle neuen Felder hin und zurück (JSON.stringify → parse → gleich)', () => {
    const q = voll();
    const r = rund(q);
    expect(r).toEqual(q);
    expect(r.version).toBe(2);
    expect(r.protokolle).toEqual(q.protokolle);
    expect(r.einwilligungen).toEqual(q.einwilligungen);
    expect(r.memos[0]!.art).toBe('feldnotiz-empirisch');
    expect(r.memos[0]!.bezug[0]).toEqual({ art: 'protokoll', id: 'p1' });
    expect(r.dokumente[0]!.transkript!.regeln).toBe('froschauer-lueger');
    // zweiter Durchgang bleibt gleich
    expect(rund(r)).toEqual(r);
  });
  it('liest auch eine Datei mit version 1, die schon neue Felder hat (wird trotzdem gelesen)', () => {
    const j = JSON.parse(JSON.stringify(voll())); j.version = 1;
    const r = pruefeQualProjekt(j);
    expect(r.protokolle).toHaveLength(2);
    expect(r.einwilligungen).toHaveLength(1);
  });
  it('lehnt Fassung 4 ab (unbekannte Fassung)', () => {
    expect(() => pruefeQualProjekt({ ...JSON.parse(JSON.stringify(voll())), version: 4 })).toThrow(/Fassung/);
  });
  it.each([
    ['Datum 12.03.2027 im Stand', (q: QualProjekt) => { q.einwilligungen![0]!.punkte[0]!.datum = '12.03.2027'; }, /einwilligungen\[0\]/],
    ['Datum 12.03.2027 im Widerruf', (q: QualProjekt) => { q.einwilligungen![0]!.widerrufe![0]!.datum = '12.03.2027'; }, /einwilligungen\[0\]/],
    ['Datum 12.03.2027 bei Löschen', (q: QualProjekt) => { q.einwilligungen![0]!.loeschen![0]!.bis = '12.03.2027'; }, /einwilligungen\[0\]/],
    ['Datum 12.03.2027 bei Wiedervorlage', (q: QualProjekt) => { q.einwilligungen![0]!.wiedervorlage![0]!.datum = '12.03.2027'; }, /einwilligungen\[0\]/],
    ['Datum im Kopf des Protokolls', (q: QualProjekt) => { q.protokolle![0]!.kopf.datum = '12.03.2027'; }, /protokolle\[0\]/],
    ['Einwilligung mit unbekanntem Fall', (q: QualProjekt) => { q.einwilligungen![0]!.fall = 'gibtsnicht'; }, /einwilligungen\[0\]/],
    ['Protokoll mit unbekanntem Dokument', (q: QualProjekt) => { q.protokolle![0]!.dokument = 'gibtsnicht'; }, /protokolle\[0\]/],
    ['Protokoll mit unbekanntem Fall', (q: QualProjekt) => { q.protokolle![0]!.fall = 'gibtsnicht'; }, /protokolle\[0\]/],
    ['Stand mit unbekanntem Wort', (q: QualProjekt) => { (q.einwilligungen![0]!.punkte[0] as { stand: string }).stand = 'vielleicht'; }, /einwilligungen\[0\]/],
    ['Punkt mit unbekanntem Namen', (q: QualProjekt) => { (q.einwilligungen![0]!.punkte[0] as { punkt: string }).punkt = 'verkauf'; }, /einwilligungen\[0\]/],
    ['Protokoll mit unbekannter Art', (q: QualProjekt) => { (q.protokolle![0]! as unknown as { art: string }).art = 'tagebuch'; }, /protokolle\[0\]/]
  ])('lehnt ab: %s (Fehler nennt den Pfad)', (_n, aendere, pfad) => {
    const q = voll(); aendere(q);
    expect(() => rund(q)).toThrow(pfad);
  });
  it('Datum im Format JJJJ-MM-TT wird angenommen; unmögliches Datum (2027-02-30) nicht', () => {
    const q = voll(); q.einwilligungen![0]!.punkte[0]!.datum = '2027-12-31';
    expect(() => rund(q)).not.toThrow();
    q.einwilligungen![0]!.punkte[0]!.datum = '2027-02-30';
    expect(() => rund(q)).toThrow();
  });
  it('behält unbekannte Schlüssel in protokolle[].felder', () => {
    const q = voll(); q.protokolle![0]!.felder = { zustandekommen: 'x', zukunft: 'bleibt', 'noch-ein-Schluessel': 'auch' };
    const r = rund(q);
    expect(r.protokolle![0]!.felder).toEqual({ zustandekommen: 'x', zukunft: 'bleibt', 'noch-ein-Schluessel': 'auch' });
  });
  it('ein Protokoll ohne Fall und ohne Dokument ist gültig', () => {
    const q = basis(); q.protokolle = [protokoll({ fall: undefined, dokument: undefined })];
    delete q.protokolle[0]!.fall; delete q.protokolle[0]!.dokument;
    expect(rund(q).protokolle![0]!.fall).toBeUndefined();
  });
  it('Fassung 2 schreibt nur dann 2, wenn neue Teile da sind: ohne neue Teile gibt das Lesen 1', () => {
    const q = basis();
    const j = JSON.parse(JSON.stringify(q)); j.version = 2;
    expect(pruefeQualProjekt(j).version).toBe(1);
  });
  it('Memo mit unbekannter Art wird abgelehnt', () => {
    const q = basis(); q.memos.push({ id: 'm', text: 'x', bezug: [], erstellt: 1, art: 'gibt-es-nicht' as never });
    expect(() => rund(q)).toThrow();
  });
});

describe('alte Testprojekte bleiben Fassung 1', () => {
  const pfad = fileURLToPath(new URL('../../../docs/erheben/stufe6c/testprojekt-6c.json', import.meta.url));
  it.skipIf(!existsSync(pfad))('testprojekt-6c.json: gelesen als Fassung 1, qualFassung 1, Hin- und Rückweg gleich', () => {
    const j = JSON.parse(readFileSync(pfad, 'utf8'));
    const r = pruefeQualProjekt(j);
    expect(r.version).toBe(1);
    expect(qualFassung(r)).toBe(1);
    expect(r.protokolle).toBeUndefined();
    expect(r.einwilligungen).toBeUndefined();
    expect(rund(r)).toEqual(r);
  });
  it('ein neues leeres Projekt ist Fassung 1', () => {
    const q = neuesQualProjekt('leer');
    expect(rund(q).version).toBe(1);
  });
});
