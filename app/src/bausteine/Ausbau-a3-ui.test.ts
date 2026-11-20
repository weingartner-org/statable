/** Stufe A3, Teil 2 (auf dem Server gerendert): Einzelfall (Hinweis, kein Text verdeckter Fälle), Randnotizen (drei Felder in einem fieldset),
 *  Codebaum (Phase im zugänglichen Namen), Memos (Art-Auswahl nur mit Tagebuch/GT), Zwei Stellen (zwei Überschriften). */
import { describe, expect, it } from 'vitest';
import { render } from 'svelte/server';
import { s } from '../lib/sitzung.svelte';
import { kodiere, legeCodeAn, legeMemoAn } from '../lib/kodieren';
import { neuesQualProjekt, type QualProjekt } from '../lib/qualprojekt';
import { fallFertig, starteEinzelfall } from '../lib/einzelfall-modus';
import CodeBaum from './CodeBaum.svelte';
import Memos from './Memos.svelte';
import Einzelfall from './Einzelfall.svelte';
import Randnotizen from './Randnotizen.svelte';
import ZweiStellen from './ZweiStellen.svelte';

s.einst.sprache = 'de'; s.einst.anrede = 'du';
const html = (c: unknown, props: Record<string, unknown>) => (render(c as never, { props }).body as string).replace(/ ?svelte-\w+/g, '');

function basis(): QualProjekt {
  const q = neuesQualProjekt('A3');
  q.kodierende.push({ id: 'k1', name: 'Ich' });
  q.ich = 'k1';
  q.faelle.push({ id: 'f1', name: 'Amira', werte: {} }, { id: 'f2', name: 'Ben', werte: {} }, { id: 'f3', name: 'Cem', werte: {} });
  q.dokumente.push(
    { id: 'd1', name: 'Interview Amira', art: 'text', text: 'Ich frage meine Tutorin. GEHEIM-AMIRA', erstellt: 1, geaendert: 1, fall: 'f1' },
    { id: 'd2', name: 'Interview Ben', art: 'text', text: 'Ich schäme mich zu fragen. GEHEIM-BEN', erstellt: 1, geaendert: 1, fall: 'f2' },
  );
  return q;
}

describe('Einzelfall', () => {
  it('aus: Satz, Auswahl mit allen offenen Fällen, Knopf', () => {
    const h = html(Einzelfall, { ganz: basis(), angebot: true });
    expect(h).toContain('Einzelfall-Modus aus.');
    expect(h).toContain('Mit welchem Fall beginnen Sie?');
    expect(h).toContain('Einzelfall-Modus starten');
    for (const n of ['Amira', 'Ben', 'Cem']) expect(h).toContain(n);
  });
  it('an: Hinweis mit Fall und Zahl, Knopf „fertig“, kein Text aus Dokumenten', () => {
    let q = starteEinzelfall(basis(), 'f1');
    q = fallFertig(q); q = starteEinzelfall(q, 'f2');
    const h = html(Einzelfall, { ganz: q, angebot: false });
    expect(h).toContain('Einzelfall-Modus: Sie sehen nur Fall ‚Ben‘.');
    expect(h).toContain('1 Fall fertig.');
    expect(h).toContain('Fall als fertig markieren');
    expect(h).toContain('Einzelfall-Modus verlassen');
    expect(h).toContain('Wieder öffnen: Amira');
    expect(h).not.toMatch(/GEHEIM|Tutorin|schäme/);
  });
  it('nach „fertig“: Auswahl „Nächster Fall“ ohne fertige Fälle', () => {
    const q = fallFertig(starteEinzelfall(basis(), 'f1'));
    const h = html(Einzelfall, { ganz: q, angebot: false });
    expect(h).toContain('Nächster Fall'); expect(h).toContain('Weiter mit diesem Fall');
    expect(h).toMatch(/<option[^>]*>Ben<\/option>/); expect(h).not.toMatch(/<option[^>]*>Amira<\/option>/);
  });
  it('alle fertig: Satz zu Gruppen-Erfahrungsthemen', () => {
    let q = fallFertig(starteEinzelfall(basis(), 'f1'));
    for (const f of ['f2', 'f3']) q = fallFertig(starteEinzelfall(q, f));
    const h = html(Einzelfall, { ganz: q, angebot: false });
    expect(h).toContain('Alle Fälle sind fertig. Für Gruppen-Erfahrungsthemen den Einzelfall-Modus verlassen.');
    expect(h).not.toContain('Nächster Fall');
  });
});

describe('Randnotizen', () => {
  it('ohne Stelle: Satz zum Markieren', () => {
    const h = html(Randnotizen, { q: basis(), dokId: 'd1', stellen: [], stelleName: '', zeigeSegment: () => {} });
    expect(h).toContain('Keine Stelle markiert.'); expect(h).not.toContain('<fieldset');
  });
  it('mit Stelle: ein fieldset mit legend und drei beschrifteten Feldern', () => {
    const h = html(Randnotizen, { q: basis(), dokId: 'd1', stellen: [{ start: 0, ende: 24 }], stelleName: 'Satz 1', zeigeSegment: () => {} });
    expect((h.match(/<fieldset/g) ?? []).length).toBe(1);
    expect(h).toMatch(/<legend[^>]*>Randnotizen zu: „Ich frage meine Tutorin\.“<\/legend>/);
    for (const t of ['Beschreibend: Was wird gesagt?', 'Sprachlich: Wie wird es gesagt? (Bilder, Wiederholungen, Pausen)', 'Begrifflich: Was könnte es bedeuten? (fragend)']) expect(h).toContain(`>${t}</label>`);
    expect((h.match(/<textarea/g) ?? []).length).toBe(3);
    expect(h).toContain('Randnotizen speichern');
  });
  it('Liste: Schicht als Wort, nach Stelle gruppiert', () => {
    let q = basis();
    q.segmente.push({ id: 's1', dokument: 'd1', start: 0, ende: 24, erstellt: 1 });
    q = legeMemoAn(q, { art: 'segment', id: 's1' }, 'Sie fragt jemanden.', undefined, 'k1', 'ipa-beschreibend').q;
    q = legeMemoAn(q, { art: 'segment', id: 's1' }, 'Wortwahl „meine“.', undefined, 'k1', 'ipa-sprachlich').q;
    const h = html(Randnotizen, { q, dokId: 'd1', stellen: [], stelleName: '', zeigeSegment: () => {} });
    expect((h.match(/<h3/g) ?? []).length).toBe(1);
    expect(h).toContain('Schicht: Beschreibend'); expect(h).toContain('Schicht: Sprachlich');
    expect(h).toContain('Zeigen:');
  });
});

describe('Codebaum mit Phase', () => {
  const a = legeCodeAn(basis(), 'Zugehörigkeit');
  const q: QualProjekt = { ...a.q, codes: a.q.codes.map(c => ({ ...c, phase: 'fokussiert' as const })) };
  const q2 = kodiere(q, 'd1', 0, 5, a.id, 'k1');
  const h = html(CodeBaum, { q: q2, schnell: [], aktiv: a.id, ankerText: () => '' });
  it('Phase steht im zugänglichen Namen und sichtbar als Wort', () => {
    expect(h).toContain('aria-label="Zugehörigkeit, Phase fokussiert. 1 Stelle."');
    expect(h).toContain('Phase: fokussiert');
  });
  it('ohne Phase unverändert', () => {
    const k = html(CodeBaum, { q: kodiere(a.q, 'd1', 0, 5, a.id, 'k1'), schnell: [], aktiv: a.id, ankerText: () => '' });
    expect(k).toContain('aria-label="Zugehörigkeit. 1 Stelle."'); expect(k).not.toContain('Phase');
  });
});

describe('Memos: Art', () => {
  const props = { q: basis(), dokId: 'd1', fallId: 'f1', codeId: '', stellen: [], stelleName: '', zurueck: () => {} };
  it('ohne Tagebuch und GT: keine Art-Auswahl, kein Tagebuch-Knopf', () => {
    const h = html(Memos, props);
    expect(h).not.toContain('Art des Memos'); expect(h).not.toContain('Tagebuch-Eintrag schreiben');
  });
  it('mit Tagebuch: Auswahl mit zwei Arten und Knopf', () => {
    const h = html(Memos, { ...props, tagebuch: true });
    expect(h).toContain('Art des Memos'); expect(h).toContain('Reflexives Tagebuch (eigene Rolle, Vorannahmen, Entscheidungen)');
    expect(h).toContain('Tagebuch-Eintrag schreiben'); expect(h).not.toContain('Theoretische Auswahl');
  });
  it('mit GT: fünf Arten mit Fachbegriff', () => {
    const h = html(Memos, { ...props, gt: true });
    for (const t of ['Code-Memo', 'Theoretisches Memo', 'Methodenmemo', 'Theoretische Auswahl (theoretical sampling)', 'Sättigungs-Memo']) expect(h).toContain(t);
  });
  it('Filter nach Art erst bei mehr als einer Art', () => {
    let q = legeMemoAn(basis(), { art: 'projekt' }, 'a', undefined, 'k1').q;
    expect(html(Memos, { ...props, q })).not.toContain('Memos nach Art zeigen');
    q = legeMemoAn(q, { art: 'projekt' }, 'b', undefined, 'k1', 'tagebuch').q;
    const h = html(Memos, { ...props, q });
    expect(h).toContain('Memos nach Art zeigen'); expect(h).toContain('Art: Tagebuch');
  });
});

describe('Zwei Stellen', () => {
  it('zwei Überschriften Ebene 3, Knöpfe, Vergleichs-Memo', () => {
    const h = html(ZweiStellen, { q: basis(), dokId: 'd1', stellen: [], stelleName: '', zeigeSegment: () => {} });
    const ohne = h.replace(/<!--[^>]*-->/g, '');
    expect(ohne).toMatch(/Textstelle\s*1<\/h3>/); expect(ohne).toMatch(/Textstelle\s*2<\/h3>/);
    expect((h.match(/Markierte Stelle übernehmen/g) ?? []).length).toBe(2);
    expect(h).toContain('Vergleichs-Memo speichern');
    expect(h).not.toMatch(/ähnlich sind/);
  });
});
