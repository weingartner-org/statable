/** Feinstruktur F2A: Baustein Protokolle (auf dem Server gerendert): Knöpfe, Liste, Schalter, Feldnotiz-Gruppe, keine eigene Live-Region. */
import { describe, expect, it } from 'vitest';
import { render } from 'svelte/server';
import { s } from '../lib/sitzung.svelte';
import { iv } from '../lib/interviews.svelte';
import { neuesQualProjekt } from '../lib/qualprojekt';
import { fuegeProtokollHinzu, neuesProtokoll, neueFeldnotiz } from '../lib/protokolle';
import Protokolle from './Protokolle.svelte';

s.einst.sprache = 'de'; s.einst.anrede = 'du';
const html = (): string => (render(Protokolle as never, { props: {} }).body as string).replace(/ ?svelte-\w+/g, '');

describe('Protokolle (Baustein)', () => {
  it('leer: drei Knöpfe zum Anlegen, Schalter, Feldnotiz mit Radiogruppe', () => {
    iv.qualEntwurf = undefined;
    const h = html();
    for (const t of ['Neues Interviewprotokoll', 'Neues Gedächtnisprotokoll', 'Neues Beobachtungsprotokoll', 'Noch kein Protokoll', 'Feldnotiz speichern']) expect(h).toContain(t);
    expect(h).toContain('Beobachtet oder gedeutet?');
    expect((h.match(/type="radio"/g) ?? []).length).toBe(3);
    expect(h).toContain('<fieldset');
    expect(h).not.toContain('aria-live');
    expect(h).not.toContain('role="alert"');
  });
  it('mit Protokoll und Feldnotiz: Liste mit Öffnen, Word, Entfernen; Notiz erscheint mit Art', () => {
    let q = neuesQualProjekt('T');
    q = { ...q, faelle: [{ id: 'f1', name: 'B3', werte: {} }] };
    const p = neuesProtokoll('interview', 1); p.fall = 'f1'; p.kopf = { datum: '2027-03-12' };
    q = fuegeProtokollHinzu(q, p);
    q = { ...q, memos: [neueFeldnotiz('feldnotiz-methodisch', 'Nächstes Mal früher fragen')] };
    iv.qualEntwurf = q;
    const h = html();
    expect(h).toContain('Interviewprotokoll - B3 - 12.03.2027');
    for (const t of ['Öffnen', 'Word', 'Entfernen', 'methodisch', 'Nächstes Mal früher fragen']) expect(h).toContain(t);
    expect(h).toMatch(/aria-label="Öffnen: Interviewprotokoll - B3 - 12\.03\.2027"/);
  });
});
