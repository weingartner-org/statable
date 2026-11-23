/** Stufe A5, Berichtshilfe (auf dem Server gerendert, wie MmTeile-ui.test.ts): echte Tabelle, Stand als Optionsgruppe, keine Note, Hinweise mit Sprung. */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { render } from 'svelte/server';
import { s } from '../lib/sitzung.svelte';
import { pruefeQualProjekt, type QualProjekt } from '../lib/qualprojekt';
import { setzeBerichtPunkt } from '../lib/berichtshilfe';
import Berichtshilfe from './Berichtshilfe.svelte';

s.einst.sprache = 'de'; s.einst.anrede = 'sie';
const html = (props: Record<string, unknown>) => (render(Berichtshilfe as never, { props: props as never }).body as string).replace(/ ?svelte-\w+/g, '').replace(/<!--[^>]*-->/g, '').replace(/ class=""/g, '');
const hilfe = (): QualProjekt => pruefeQualProjekt(JSON.parse(readFileSync('public/beispiel/mixed/hilfe-projekt.json', 'utf8')));

describe('Berichtshilfe', () => {
  it('COREQ: Tabelle mit caption, sechs Spaltenköpfen, 32 Zeilen mit Zeilenkopf und Optionsgruppe je Punkt', () => {
    const h = html({ q: hilfe(), einzelAn: false });
    expect(h).toMatch(/<table[^>]*>\s*<caption>COREQ: Punkt, Stand, Fundstelle, Notiz und was Statable weiß<\/caption>/);
    expect((h.match(/<th scope="col">/g) ?? []).length).toBe(6);
    expect((h.match(/<th scope="row">/g) ?? []).length).toBe(32);
    // NVDA-Befund M1 (15.11.): Bereichszeilen als schlichte Zelle, nicht scope="colgroup" (NVDA hängte alle Bereichsnamen an jeden Spaltenkopf).
    expect((h.match(/<tr class="bereich"><td colspan="6">/g) ?? []).length).toBe(3);
    expect(h).not.toContain('scope="colgroup"');
    expect((h.match(/<fieldset class="stand">/g) ?? []).length).toBe(32);
    expect(h).toContain('<legend class="nur-sr">Stand zu Punkt 23: Bekamen Teilnehmende ihr Transkript zum Ansehen oder Berichtigen?</legend>');
    expect(h).toMatch(/<label class="nur-sr" for="ko-bh-f-coreq-01">Fundstelle zu Punkt 1<\/label>/);
    expect(h).toContain('0 von 32 Punkten bearbeitet, 32 noch offen.');
    expect(h).toContain('Eigene Kurzfassung nach Tong u. a. (2007)');
    expect(h).toContain('href="https://doi.org/10.1093/intqhc/mzm042"');
    expect(h).toMatch(/role="region"[^>]*tabindex="0"/);
  });
  it('keine Note: kein Prozent, keine Zahl „erfüllt“; kein Optionsfeld vorausgewählt', () => {
    const h = html({ q: hilfe(), einzelAn: false });
    expect(h).not.toMatch(/\d+ ?%|Punktzahl|von 32 erfüllt/);
    expect(h).not.toMatch(/<input[^>]*type="radio"[^>]*name="ko-bh-coreq-[^"]*"[^>]*checked/);
  });
  it('gesetzter Punkt: Optionsfeld an, Fundstelle im Feld, Zählung', () => {
    let q = setzeBerichtPunkt(hilfe(), 'coreq', 'coreq-12', { stand: 'erfuellt', fundstelle: 'S. 14' }, 1);
    q = setzeBerichtPunkt(q, 'coreq', 'coreq-23', { stand: 'offen' }, 1);
    const h = html({ q, einzelAn: false });
    expect(h).toMatch(/<input[^>]*name="ko-bh-coreq-coreq-12"[^>]*value="erfuellt"[^>]*checked/);
    expect(h).toMatch(/id="ko-bh-f-coreq-12"[^>]*value="S. 14"/);
    expect(h).toContain('2 von 32 Punkten bearbeitet, 31 noch offen.');
  });
  it('„Statable weiß“: Hinweise aus dem Projekt mit Sprung; leere Zellen ohne „unbekannt“', () => {
    const h = html({ q: hilfe(), einzelAn: false });
    expect(h).toContain('Im Projekt: 5 Fälle, 5 Dokumente.');
    expect(h).toContain('Fallvariablen: field, first_generation, study_mode, age_group, survey_id.');
    expect(h).toMatch(/<a href="#kodieren\/themen">Zu den Themen<\/a>/);
    expect(h).not.toMatch(/unbekannt/i);
  });
  it('Einzelfall-Modus: nur der Hinweis, keine Tabelle', () => {
    const h = html({ q: hilfe(), einzelAn: true });
    expect(h).toContain('Im Einzelfall-Modus ist sie verdeckt');
    expect(h).not.toContain('<table');
  });
  it('englisch', () => {
    s.einst.sprache = 'en';
    try {
      const h = html({ q: hilfe(), einzelAn: false });
      expect(h).toContain('What belongs in my methods section? (Reporting checklist COREQ, SRQR)');
      expect(h).toContain('0 of 32 items worked on, 32 still open.');
      expect(h).toContain('Met (reported)');
      expect(h).toContain('Own short version after Tong et al. (2007)');
    } finally { s.einst.sprache = 'de'; }
  });
});
