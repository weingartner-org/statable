import { beforeAll, describe, expect, it } from 'vitest';
import de from './glossar/de.json';
import en from './glossar/en.json';
import erst from '../lib/messages.de.json';
import { artikelListe } from './artikel';
import { glossarEintrag, ladeGlossar } from './glossar';
import { suche } from './suche';

/** Wächter für das große Glossar: Form und Verweise. Die Fachaussagen prüft der Durchgang in docs/fachblaetter/GLOSSAR.md. */
type E = { titel: string; kurz: string; beispiel?: string; vorsicht?: string; sw?: string[]; siehe?: string[] };
const dd = de as Record<string, E>, ee = en as Record<string, E>;
const woerter = (t: string) => t.trim().split(/\s+/).length;
/** Noch offen (Johannes 05.11.2026: neue Texte nur Deutsch und Englisch, die übrigen Sprachen fallen auf Englisch zurück; `glossarEintrag` mischt ohnehin Englisch darunter).
 *  Diese Einträge (Field-Stufe 1) dürfen in den 13 weiteren Sprachen fehlen; Eintrag streichen, sobald übersetzt. */
const NUR_DE_EN = new Set<string>(['refi-qda', 'segment', 'ueberlappung', 'quantitizing', 'pseudonymisierung', 'indirekter-identifikator', 'zuordnungsliste', 'konsens', 'kodieren', 'code-qualitativ', 'kategorie-qualitativ', 'codebaum', 'memo-qualitativ', 'fallvariable', 'fall-kategorie-matrix', 'framework-analyse', 'fallzusammenfassung', 'code-landkarte', 'tf-idf', 'dokument-uebersicht', 'spearman-brown-formel', 'guttman-split-half', 'retest-korrelation', 'thema-qualitativ', 'themenanalyse-reflexiv', 'reflexives-tagebuch', 'kodierphase', 'theoretisches-memo', 'framework-matrix', 'interpretative-phaenomenologische-analyse', 'einzelfall-modus', 'randnotiz', 'feinstrukturanalyse', 'sinneinheit', 'lesart', 'zwischenfazit', 'spaltensatz', 'sequenzanalyse-qualitativ', 'folgetext-verdecken', 'interviewprotokoll', 'gedaechtnisprotokoll', 'feldnotizen', 'einwilligung-prozess', 'aenderungsprotokoll-codebuch', 'ki-offenlegung', 'arbeitsweise-verfahren', 'methodenanhang', 'berichtshilfe', 'coreq', 'srqr', 'meta-inferenz', 'passung-mixed', 'design-steckbrief', 'simple-matching-koeffizient', 'instrumentenentwicklung', 'mmat', 'gramms', 'selbstpruefung-mixed', 'q-sort', 'begriffskarte', 'wortliste', 'kwic', 'zweistufige-kleinste-quadrate', 'partialkorrelationsnetz']);

describe('Großes Glossar', () => {
  beforeAll(async () => { await ladeGlossar('de'); });
  it('Deutsch und Englisch haben dieselben Einträge, keiner doppelt mit `erklaer` oder einem Artikel', () => {
    expect(Object.keys(dd).sort()).toEqual(Object.keys(ee).sort());
    const artikel = new Set(artikelListe('en').filter(a => !(a.id in ee)).map(a => a.id));
    for (const id of Object.keys(dd)) {
      expect(id in erst.erklaer, `${id} steht schon in erklaer`).toBe(false);
      expect(artikel.has(id), `${id} ist schon ein Artikel`).toBe(false);
      expect(id).toMatch(/^[a-z0-9][a-z0-9-]*$/);
    }
  });
  it('Form: kurz höchstens 50 Wörter, keine langen Striche, Felder nicht leer', () => {
    for (const [sp, q] of [['de', dd], ['en', ee]] as const) for (const [id, e] of Object.entries(q)) {
      expect(e.titel?.trim(), `${sp} ${id}`).toBeTruthy();
      expect(woerter(e.kurz), `${sp} ${id}.kurz`).toBeLessThanOrEqual(50);
      for (const f of [e.titel, e.kurz, e.beispiel, e.vorsicht]) if (f !== undefined) { expect(f.trim(), `${sp} ${id}`).toBeTruthy(); expect(f, `${sp} ${id}`).not.toMatch(/[–—]/); }
    }
  });
  it('Deutsch spricht niemanden an', () => {
    for (const [id, e] of Object.entries(dd)) for (const f of [e.kurz, e.beispiel, e.vorsicht]) if (f) expect(f, id).not.toMatch(/\b(du|dein\w*|Ihnen)\b/);
  });
  it('Jeder Verweis führt zu einem Eintrag oder Artikel', () => {
    const alle = new Set(artikelListe('en').map(a => a.id));
    for (const [id, e] of Object.entries(ee)) for (const z of e.siehe ?? []) expect(alle.has(z), `${id} → ${z}`).toBe(true);
  });
  it('Alle 13 weiteren Sprachen haben jeden Eintrag', () => {
    const dateien = import.meta.glob<Record<string, E>>('./glossar/*.json', { eager: true, import: 'default' });
    expect(Object.keys(dateien)).toHaveLength(15);
    for (const [f, q] of Object.entries(dateien)) {
      const erwartet = Object.keys(ee).filter(id => !NUR_DE_EN.has(id)).sort();
      expect(Object.keys(q).filter(id => !NUR_DE_EN.has(id)).sort(), f).toEqual(erwartet);
      for (const [id, e] of Object.entries(q)) { expect(e.titel?.trim(), `${f} ${id}`).toBeTruthy(); expect(e.kurz?.trim(), `${f} ${id}`).toBeTruthy(); }
    }
  });
  it('Die Ausnahmeliste „noch offen“ nennt nur echte Einträge', () => { for (const id of NUR_DE_EN) expect(id in ee, id).toBe(true); });
  it('Findet Fachbegriffe, auch über Zeichen und andere Namen', () => {
    const treffer = (q: string) => suche(artikelListe('de'), q, 'de').slice(0, 5).map(t => t.artikel.id);
    expect(glossarEintrag('varianz', 'de')?.titel).toContain('Varianz');
    expect(treffer('Varianz')).toContain('varianz');
    expect(treffer('chi')).toContain('zeichen-chi');
    expect(treffer('t-Verteilung')).toContain('t-verteilung');
  });
});
