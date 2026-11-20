/** Paket 6b2: Codebaum, Belege, Memos, Fälle und Variablen (auf dem Server gerendert): Rollen, IDs, Namen nach Fachblatt 3.4 bis 3.7. */
import { describe, expect, it } from 'vitest';
import { render } from 'svelte/server';
import { s } from '../lib/sitzung.svelte';
import { kodiere, legeCodeAn, legeFallAn, legeVariableAn, setzeWert, ordneZu, legeMemoAn } from '../lib/kodieren';
import { neuesQualProjekt, type QualProjekt } from '../lib/qualprojekt';
import CodeBaum from './CodeBaum.svelte';
import Belege from './Belege.svelte';
import Memos from './Memos.svelte';
import FaelleVariablen from './FaelleVariablen.svelte';

s.einst.sprache = 'de'; s.einst.anrede = 'du';
const html = (c: unknown, props: Record<string, unknown>) => (render(c as never, { props }).body as string).replace(/ ?svelte-\w+/g, '');

function projekt(): { q: QualProjekt; ids: Record<string, string> } {
  let q = neuesQualProjekt('T');
  q = { ...q, kodierende: [{ id: 'p', name: 'Ich' }], ich: 'p', dokumente: [{ id: 'd1', name: 'Interview 1', art: 'text', text: 'Eins. Zwei.', erstellt: 1, geaendert: 1 }] };
  const a = legeCodeAn(q, 'Erleben'); q = a.q;
  const b = legeCodeAn(q, 'Belastung', a.id); q = b.q;
  q = { ...q, codes: q.codes.map(c => (c.id === b.id ? { ...c, farbe: '#1f5fa8' } : c)) };
  q = kodiere(q, 'd1', 0, 5, b.id, 'p');
  const f = legeFallAn(q, 'Anna'); q = f.q;
  const v = legeVariableAn(q, 'Semester', 'ganzzahl'); q = v.q;
  q = setzeWert(q, f.id, v.id, 3);
  q = ordneZu(q, 'd1', f.id);
  const seg = q.segmente[0]!.id;
  q = legeMemoAn(q, { art: 'segment', id: seg }, 'Warum?', 'Frage', 'p').q;
  return { q, ids: { a: a.id, b: b.id, f: f.id, v: v.id } };
}

describe('Codebaum', () => {
  const { q, ids } = projekt();
  const h = html(CodeBaum, { q, schnell: [ids.b], aktiv: ids.a, ankerText: () => '' });
  it('tree mit treeitems, Ebene, Roving Tabindex, Werkzeugleiste', () => {
    expect(h).toContain('role="tree"');
    expect(h).toMatch(/role="treeitem"[^>]*aria-level="1"/);
    expect(h).toContain('aria-level="2"');
    expect(h).toContain('aria-expanded="true"');
    expect(h).toContain(`id="ko-b-${ids.a}"`);
    expect(h).toContain('role="toolbar"'); expect(h).toContain('id="ko-baum-werkzeuge"');
    for (const t of ['Neuer Code', 'Neuer Untercode', 'Nach oben', 'Nach unten', 'Eine Ebene höher', 'Eine Ebene tiefer', 'In die Schnellleiste', 'Löschen']) expect(h).toContain(t);
    expect((h.match(/tabindex="0"/g) ?? []).length).toBe(2);   // aktiver Eintrag und erster Knopf der Werkzeugleiste
  });
  it('Beschreibung: Stellen, Ziffer, Farbe als Wort', () => {
    expect(h).toContain('1 Stelle. Ziffer 1. Farbe: Blau.');
  });
  it('VO5: verschachtelt mit role="group", Name und Beschreibung am treeitem, Spans versteckt', () => {
    expect(h).toMatch(new RegExp(`id="ko-b-${ids.a}"[^>]*role="treeitem"[^>]*aria-label="Erleben\\. 0 Stellen\\."`));
    expect(h).toMatch(new RegExp(`id="ko-b-${ids.a}"[^>]*aria-level="1"[^>]*aria-setsize="1"[^>]*aria-posinset="1"[^>]*aria-expanded="true"`));
    expect(h).toMatch(new RegExp(`id="ko-b-${ids.b}"[^>]*aria-label="Belastung\\. 1 Stelle\\. Ziffer 1\\. Farbe: Blau\\."[^>]*aria-level="2"[^>]*aria-setsize="1"[^>]*aria-posinset="1"`));
    // Belastung liegt im role="group" innerhalb von Erleben
    const li = h.indexOf(`id="ko-b-${ids.a}"`), grp = h.indexOf('role="group"', li), kind = h.indexOf(`id="ko-b-${ids.b}"`);
    expect(li).toBeLessThan(grp); expect(grp).toBeLessThan(kind);
    expect(h).toMatch(/class="name" aria-hidden="true"/);
    expect(h).not.toContain('ko-b-d-');
  });
});

describe('Belege', () => {
  const { q, ids } = projekt();
  const h = html(Belege, { q, belCode: ids.b, nurWer: undefined, zeige: () => {}, memo: () => {} });
  it('Untercodes, Filter je Variable, Liste mit Namen, Knöpfe mit Bezug, Word', () => {
    expect(h).toContain('id="ko-bel-unter"'); expect(h).toContain('id="ko-bel-filter"');
    expect(h).toContain('Semester'); expect(h).toContain('<option value="3">3</option>');
    expect(h).toContain('id="ko-bel-liste"');
    expect(h).toContain('aria-label="Belege zu „Erleben: Belastung“, 1 Stelle"');
    expect(h).toContain('Interview 1 (Fall Anna), Absatz 1');
    for (const t of ['Im Text zeigen: Beleg 1', 'Code entfernen: Beleg 1', 'Memo: Beleg 1']) expect(h).toContain(t);
    expect(h).toContain('Belege als Word');
  });
});

describe('Memos', () => {
  const { q, ids } = projekt();
  const h = html(Memos, { q, dokId: 'd1', fallId: ids.f, codeId: ids.b, stellen: [{ start: 0, ende: 5 }], stelleName: 'Satz 1', zurueck: () => {} });
  it('Gruppen, Formular mit Wozu, Titel, Text', () => {
    expect(h).toContain('Zu dieser Stelle'); expect(h).toContain('Bearbeiten: Frage'); expect(h).toContain('Löschen: Frage');
    expect(h).toContain('id="ko-memo-liste"'); expect(h).toContain('id="ko-memo-text"'); expect(h).toContain('id="ko-memo-neu"');
    expect(h).toContain('Wozu?'); expect(h).toContain('<option value="stelle">Textstelle</option>'); expect(h).toContain('<option value="fall">Fall</option>');
  });
});

describe('Fälle und Variablen', () => {
  const { q } = projekt();
  const h = html(FaelleVariablen, { q, neuerFall: () => {} });
  it('Tabelle mit Kopfzeile, Feldname „Variable für Fall“, Wert', () => {
    expect(h).toContain('id="ko-faelle"'); expect(h).toMatch(/<th[^>]*scope="col"[^>]*>Fall</); expect(h).toContain('Semester');
    expect(h).toContain('aria-label="Semester für Anna"'); expect(h).toContain('value="3"');
    expect(h).toContain('Interview 1');
    expect(h).toContain('id="ko-fall-neu"'); expect(h).toContain('id="ko-var-neu"');
    expect(h).toContain('Ganze Zahl');
  });
});
