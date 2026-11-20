import { describe, expect, it } from 'vitest';
import { artikelListe } from '../hilfe/artikel';
import { VERFAHREN } from './verfahren';
import { fallVon, verweise, verweiseGruppe, alleZiele, type Fall, type Gruppe } from './naechster-schritt';
import { s } from './sitzung.svelte';

/** Fachblatt Stufe 5, 5.2: „Weiter mit …“ unter dem Ergebnis (früher „Als Nächstes“), höchstens zwei Verweise, Fachbegriff in Klammern, je Verweis eine Gruppe. */
const FAELLE: Fall[] = ['zwei', 'drei', 'vorher-nachher', 'messwiederholung', 'zusammenhang', 'linear', 'faktor', 'kreuz'];
const DU = /(?<![\wäöüÄÖÜß])(?:du|dir|dich|dein\w*|hast|bist|kannst|musst|Sie|Ihr\w*)(?![\wäöüÄÖÜß])/;

describe('Als Nächstes: Zuordnung', () => {
  it('jede Kennung existiert (Hilfe-Artikel in Deutsch und Englisch, Karten)', () => {
    const de = new Set(artikelListe('de').map(a => a.id)), en = new Set(artikelListe('en').map(a => a.id));
    for (const z of alleZiele()) {
      if ('hilfe' in z) { expect(de.has(z.hilfe), z.hilfe).toBe(true); expect(en.has(z.hilfe), z.hilfe).toBe(true); }
      else expect(VERFAHREN.some(v => v.id === z.karte), z.karte).toBe(true);
    }
  });
  it('höchstens zwei Verweise je Fall, mindestens einer', () => {
    for (const f of FAELLE) { const n = verweise(f).length; expect(n, f).toBeGreaterThanOrEqual(1); expect(n, f).toBeLessThanOrEqual(2); }
  });
  it('die Tabelle des Fachblatts: Anzahl je Fall und Ziele', () => {
    expect(FAELLE.map(f => verweise(f).length)).toEqual([2, 2, 2, 1, 1, 2, 1, 2]);
    expect(verweise('faktor')[0]!.ziel).toEqual({ karte: 'skala' });
    expect(verweise('drei').map(v => v.ziel)).toEqual([{ hilfe: 'frage-posthoc' }, { hilfe: 'vv-kontraste' }]);
  });
  it('jeder Text ist Alltagsfrage mit Fachbegriff in Klammern, ohne Anrede, in beiden Sprachen', () => {
    for (const sp of ['de', 'en'] as const) {
      s.einst.sprache = sp;
      for (const f of FAELLE) for (const v of verweise(f)) {
        expect(v.text, `${sp} ${f}`).toMatch(/\([^()]+\)$/);
        expect(v.text, `${sp} ${f}`).not.toMatch(DU);
      }
    }
    s.einst.sprache = 'de';
  });
  it('Fälle aus dem Ergebnis; andere Verfahren bekommen keine Zeile', () => {
    expect(fallVon('zwei-gruppen')).toBe('zwei'); expect(fallVon('anova')).toBe('drei'); expect(fallVon('prae-post')).toBe('vorher-nachher');
    expect(fallVon('messwiederholung')).toBe('messwiederholung'); expect(fallVon('zusammenhang')).toBe('zusammenhang');
    expect(fallVon('vorhersage')).toBe('linear'); expect(fallVon('faktor')).toBe('faktor'); expect(fallVon('kreuz')).toBe('kreuz');
    for (const t of ['logistik', 'skala', 'cluster', 'korrmatrix', 'anova2', undefined, null, '']) expect(verweise(fallVon(t as string)), String(t)).toEqual([]);
  });
  it('Regression mit nur einer Einflussgröße: kein Verweis auf Kollinearität', () => {
    const ziele = (m: boolean) => verweise('linear', m).map(v => 'hilfe' in v.ziel ? v.ziel.hilfe : '');
    expect(ziele(true)).toContain('kollinearitaet');
    expect(ziele(false)).not.toContain('kollinearitaet');
    expect(ziele(false)).toContain('rp-einfluss');
  });
  it('jeder Verweis gehört in genau eine Gruppe; Partialkorrelation und Reliabilität sind „Nächste Frage“, der Rest „Genauer hinsehen“', () => {
    const gruppen: Gruppe[] = ['genauer', 'anders', 'naechste'];
    for (const f of FAELLE) {
      const alle = verweise(f);
      for (const v of alle) expect(gruppen, `${f}: ${v.text}`).toContain(v.gruppe);
      expect(gruppen.flatMap(g => verweiseGruppe(f, g)).length, f).toBe(alle.length);
    }
    expect(verweiseGruppe('zusammenhang', 'naechste').length).toBe(1);
    expect(verweiseGruppe('faktor', 'naechste').length).toBe(1);
    for (const f of FAELLE.filter(x => x !== 'zusammenhang' && x !== 'faktor')) expect(verweiseGruppe(f, 'genauer').length, f).toBe(verweise(f).length);
    for (const f of FAELLE) expect(verweiseGruppe(f, 'anders'), f).toEqual([]);
  });
});
