import { describe, expect, it } from 'vitest';
import type { Antwortliste, Frage, FragebogenPlan, Lok, Seite } from './fragebogenplan';
import { abgleich, eingabePlan, einfachDatensatz, entscheide, gezeigteFelder, protokollText, type Durchgang } from './doppeleingabe';
import { datensatzTabelle } from './doppeleingabe-daten';
import { baueProtokollWord } from './doppeleingabe-word';
import { naechsteNummer } from './eingabemaske.svelte';
import { leseProjektdateiMitMeldungen, projektAlsDatei } from './projektdatei';
import { pruefeDocx } from '../../../scripts/docx-pruefen.mjs';

/* Paket 2F, Bauer: eigene Tests zu dem, was die Prüfer-Tests nicht abdecken (nur einfach übernehmen, Datensatz-Spalten, Word, Projektdatei, eine Eingabeseite). */
const zw = (t: string): Lok => ({ de: t, en: t + ' (en)' });
const liste: Antwortliste = { id: 'l', name: 'l', geordnet: true, optionen: [1, 2, 3].map(i => ({ id: `l:${i}`, wert: i, text: zw(`S${i}`) })) };
const frage = (id: string, extra: Partial<Frage> = {}): Frage => ({ art: 'frage', id, name: id, typ: 'einfach', text: zw(id), liste: 'l', kodebuch: { niveau: 'ordinal' }, ...extra });
const seite = (id: string, elemente: Seite['elemente'], extra: Partial<Seite> = {}): Seite => ({ art: 'seite', id, name: id, elemente, ...extra });
const plan = (seiten: Seite[]): FragebogenPlan => ({
  format: 'statable-fragebogen', version: 1, id: 'p-1', revision: 1, titel: zw('Test'), sprachen: ['de', 'en'],
  einstellungen: { fortschritt: true, zurueck: true, pretest: false, fehlendFilter: 'code' }, antwortlisten: [liste], skalen: [], elemente: seiten, geaendert: 1 });
const p = plan([seite('s1', [frage('q1'), frage('q2', { wennGezeigt: { frage: 'q1', ist: '=', wert: 1 } }), frage('m', { typ: 'mehrfach' }), frage('z', { typ: 'zahl', liste: undefined, zahl: { ganz: true }, kodebuch: { niveau: 'skala' } })])]);

describe('nur einfach erfasst übernehmen', () => {
  const A: Durchgang = { b1: { q1: 2, z: 5 }, b2: { q1: 1, q2: 3, z: 7 } };
  const B: Durchgang = { b1: { q1: 2, z: 5 }, b3: { q1: 3, z: 9 } };
  it('ohne Wahl bleiben Bögen nur in A oder B draußen; mit Wahl kommen sie hinein und das Protokoll nennt ihre Zahl', () => {
    const ab = abgleich(p, A, B);
    expect(ab.nurA).toEqual(['b2']); expect(ab.nurB).toEqual(['b3']);
    const ohne = entscheide(p, A, B, ab, []);
    expect(Object.keys(ohne.datensatz)).toEqual(['b1']);
    expect(ohne.protokoll.nurEinfach).toBeUndefined();
    const mit = entscheide(p, A, B, ab, [], ['b2', 'b3']);
    expect(Object.keys(mit.datensatz)).toEqual(['b1', 'b2', 'b3']);
    expect(mit.datensatz.b2).toEqual({ q1: 1, q2: 3, z: 7 });
    expect(mit.datensatz.b3).toEqual({ q1: 3, q2: -7, z: 9 });
    expect(mit.protokoll).toMatchObject({ boegen: 1, nurA: 1, nurB: 1, nurEinfach: 2 });
  });
  it('das Protokoll nennt die Zahl der einfach übernommenen Bögen (de und en); Unbekanntes wird nicht übernommen', () => {
    const ab = abgleich(p, A, B);
    const r = entscheide(p, A, B, ab, [], ['b2', 'b3', 'b1', 'gibtsnicht']);
    expect(r.protokoll.nurEinfach).toBe(2);
    expect(protokollText(r.protokoll, 'de')).toContain('Davon wurden 2 Bögen ausdrücklich als einfach erfasst');
    expect(protokollText(r.protokoll, 'en')).toContain('2 of these were explicitly included');
  });
  it('einfachDatensatz füllt Filter-Codes auf', () => {
    expect(einfachDatensatz(p, { x: { q1: 2, z: 1 } })).toEqual({ x: { q1: 2, q2: -7, z: 1 } });
  });
});

describe('eingabePlan: ein Bogen = eine Seite, Seiten-Bedingung wandert zu den Elementen', () => {
  const q = plan([seite('s1', [frage('q1')]), seite('s2', [frage('q2')], { wennGezeigt: { frage: 'q1', ist: '=', wert: 1 } })]);
  it('alle Elemente auf einer Seite; die Filter der Seite wirken weiter', () => {
    const e = eingabePlan(q, zw('Bogen'));
    expect(e.elemente).toHaveLength(1);
    expect(e.elemente[0]!.elemente.map(x => x.id)).toEqual(['q1', 'q2']);
    expect(gezeigteFelder(e, { q1: 2 })).toEqual(['q1']);
    expect(gezeigteFelder(e, { q1: 1 })).toEqual(['q1', 'q2']);
    expect(q.elemente).toHaveLength(2);   // der Plan bleibt unverändert
  });
});

describe('datensatzTabelle: Spalten und Zeilen aus dem Kodebuch des Plans', () => {
  it('Spalten wie variablenAusPlan, Mehrfach als 0/1, Filter-Code -7 als fehlend erklärt, Bogen-Nummer zuerst', () => {
    const t = datensatzTabelle(p, { b1: { q1: 2, q2: -7, m: [1, 3], z: 5 }, b2: { q1: 1, q2: 3, m: [2], z: 7 } }, 'de');
    expect(t.spalten.map(s => s.name)).toEqual(['bogen', 'q1', 'q2', 'm_1', 'm_2', 'm_3', 'z']);
    expect(t.zeilen).toEqual([['b1', 2, -7, 1, 0, 1, 5], ['b2', 1, 3, 0, 1, 0, 7]]);
    const q2 = t.spalten.find(s => s.name === 'q2')!;
    expect(q2.fehlend).toContain(-7);
    expect(q2.werteLabels['-7']).toBeTruthy();
    expect(q2.werteLabels['1']).toBe('S1');
    expect(t.spalten.find(s => s.name === 'q1')!.fehlend).toEqual([]);
  });
});

describe('naechsteNummer', () => {
  it('zählt Ziffern am Ende hoch (mit führenden Nullen), sonst leer', () => {
    expect(naechsteNummer('12')).toBe('13'); expect(naechsteNummer('b009')).toBe('b010'); expect(naechsteNummer('x')).toBe(''); expect(naechsteNummer(' 7 ')).toBe('8');
  });
});

describe('Protokoll als Word', () => {
  it('docx-pruefen ohne Befund, enthält Zahlen, Satzvorschlag und die Quelle', async () => {
    const D = await import('docx');
    const prot = { boegen: 4, nurA: 1, nurB: 0, felder: 32, abweichungen: 3, jeFeld: { q1: 2, z: 1 }, je1000: 93.75, nachA: 1, nachB: 1, neu: 1 };
    for (const sp of ['de', 'en'] as const) {
      const bytes = new Uint8Array(await D.Packer.toArrayBuffer(baueProtokollWord(D, p, prot, sp, '08.11.2026')));
      expect(pruefeDocx(bytes)).toEqual([]);
      const { unzipSync, strFromU8 } = await import('fflate');
      const doc = strFromU8(unzipSync(bytes)['word/document.xml']!);
      expect(doc).toContain(sp === 'de' ? '93,8' : '93.8');
      expect(doc).toContain('Paulsen');
      expect(doc).toContain(sp === 'de' ? 'doppelt und unabhängig eingegeben' : 'entered twice and independently');
    }
  });
});

describe('Projektdatei: Durchgänge im ZIP', () => {
  it('schreibt fragebogen/<plan-id>/eingabe-A.json und liest sie zurück; fremde Pläne und __proto__ fallen weg', () => {
    const projekt = { name: 'x', quelle: 'y', sav: new Uint8Array([1, 2, 3]), blaetter: [], entscheid: {}, zeit: 1, fragebogen: [p],
      eingaben: { 'p-1': { A: { b1: { q1: 2, m: [1, 2], t: 'Hallo' } }, B: { b1: { q1: 3 } } }, 'fremd': { A: { b1: { q1: 1 } } } } };
    const bytes = projektAlsDatei(projekt as never);
    const r = leseProjektdateiMitMeldungen(bytes).projekt;
    expect(r.eingaben).toEqual({ 'p-1': { A: { b1: { q1: 2, m: [1, 2], t: 'Hallo' } }, B: { b1: { q1: 3 } } } });
  });
  it('ohne Eingaben bleibt die Datei wie bisher (kein Eintrag, keine Meldung)', () => {
    const r = leseProjektdateiMitMeldungen(projektAlsDatei({ name: 'x', quelle: 'y', sav: new Uint8Array([1]), blaetter: [], entscheid: {}, zeit: 1, fragebogen: [p] } as never));
    expect(r.projekt.eingaben).toBeUndefined();
    expect(r.meldungen).toEqual([]);
  });
});
