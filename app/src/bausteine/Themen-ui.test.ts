/** Stufe A3: Themen (auf dem Server gerendert): Stand als Wort, verworfene sichtbar, Formhinweise, kein Vorschlagstext. */
import { describe, expect, it } from 'vitest';
import { render } from 'svelte/server';
import { s } from '../lib/sitzung.svelte';
import { legeThemaAn, ordneCodeZu, setzeThemaStand, setzeThemaEltern } from '../lib/themen';
import { legeCodeAn, kodiere, legeFallAn, ordneZu } from '../lib/kodieren';
import { neuesQualProjekt, type QualProjekt } from '../lib/qualprojekt';
import Themen from './Themen.svelte';

s.einst.sprache = 'de'; s.einst.anrede = 'du';
const html = (props: Record<string, unknown>) => (render(Themen as never, { props: props as never }).body as string).replace(/ ?svelte-\w+/g, '');

function projekt(): { q: QualProjekt; ids: Record<string, string> } {
  let q = neuesQualProjekt('T');
  q = { ...q, kodierende: [{ id: 'p', name: 'Ich' }], ich: 'p', dokumente: [{ id: 'd1', name: 'Interview 1', art: 'text', text: 'Eins. Zwei.', erstellt: 1, geaendert: 1 }] };
  const c = legeCodeAn(q, 'Belastung'); q = c.q;
  q = kodiere(q, 'd1', 0, 5, c.id, 'p');
  const f = legeFallAn(q, 'Anna'); q = f.q; q = ordneZu(q, 'd1', f.id);
  const a = legeThemaAn(q, 'Druck', { konzept: 'Leistung belastet' }); q = a.q;
  q = ordneCodeZu(q, a.id, c.id, true);
  const b = legeThemaAn(q, 'Leer'); q = b.q;
  const u = legeThemaAn(q, 'Unterpunkt'); q = u.q; q = setzeThemaEltern(q, u.id, a.id);
  const v = legeThemaAn(q, 'Altlast'); q = v.q; q = setzeThemaStand(q, v.id, 'verworfen', 'passt nicht');
  return { q, ids: { a: a.id, b: b.id, u: u.id, v: v.id, f: f.id, c: c.id } };
}

describe('Themen', () => {
  const { q, ids } = projekt();
  const h = html({ q, fall: ids.f, ipa: false, einzelfall: false, zeigeSegment: () => {} });
  it('Stand steht als Wort, nicht nur als Farbe', () => {
    expect(h).toMatch(/Stand<\/?[^>]*>?: Kandidat\.|Stand: Kandidat\./);
    expect(h).toMatch(/Stand: verworfen\./);
  });
  it('verworfene Themen bleiben sichtbar (aufklappbar, Zahl in der Zusammenfassung)', () => {
    expect(h).toContain('<details');
    expect(h).toContain('Verworfene Themen (1)');
    expect(h).toContain('Altlast');
  });
  it('Liste, verschachtelte Unterthemen, Zahlen und Formhinweise', () => {
    expect(h).toContain('<ul');
    expect(h).toContain('Unterthemen von Druck');
    expect(h).toContain('1 Code. 1 Stelle.');
    expect(h).toMatch(/In 1 von 1 Fällen\./);
    expect(h).toContain('Dieses Thema hat noch keine Codes.');
    expect(h).toContain('Dieses Thema hat noch kein zentrales Konzept.');
  });
  it('Formular Neues Thema mit Fachbegriff', () => {
    expect(h).toContain('Neues Thema');
    expect(h).toContain('zentrales Konzept, central organising concept');
  });
  it('kein Vorschlagstext, kein „Themen entstehen“', () => {
    expect(h).toContain('Statable schlägt keine vor');
    const ohneErlaubtes = h.replace('Statable schlägt keine vor', '');
    for (const w of ['vorgeschlagen', 'empfohlen', 'entstehen', 'typisch']) expect(ohneErlaubtes).not.toContain(w);
    expect(ohneErlaubtes).not.toMatch(/Vorschlag/);
  });
  it('IPA: zwei Gruppen; Einzelfall: nur persönliche, Satz zu Gruppenthemen', () => {
    const i = html({ q, fall: ids.f, ipa: true, einzelfall: false, zeigeSegment: () => {} });
    expect(i).toContain('Persönliche Erfahrungsthemen (PET) dieses Falls');
    expect(i).toContain('Gruppen-Erfahrungsthemen (GET)');
    const e = html({ q, fall: ids.f, ipa: true, einzelfall: true, zeigeSegment: () => {} });
    expect(e).not.toContain('Gruppen-Erfahrungsthemen (GET)');
    expect(e).toContain('nach dem Einzelfall-Modus');
  });
});
