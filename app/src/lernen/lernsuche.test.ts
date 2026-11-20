/* Suche über alle Lernbereiche (Johannes 31.10.). */
import { describe, expect, it } from 'vitest';
import { artikelListe } from '../hilfe/artikel';
import { VERSTEHEN_KACHELN, PROBIER_TEILE } from './probierziele';
import { KACHELN, LABOR_TEILE, lernIndex, lernSuche } from './lernsuche';

const ix = lernIndex(artikelListe('de'), 'de');
const hrefs = (f: string) => lernSuche(ix, f, 'de').map(t => t.href);

describe('Lernsuche', () => {
  it('findet die Faktorenanalyse in Üben und Hilfe, auch falsch geschrieben', () => {
    for (const f of ['Faktorenanalyse', 'faktoranalyse']) {
      expect(hrefs(f), f).toContain('#verstehen/ueben/faktor');
      expect(hrefs(f), f).toContain('#hilfe/faktorenanalyse');
    }
  });
  it('Einheiten stehen zuerst: Faktorenanalyse, t-Test, Median, logistische Regression finden je ihre Einheit an erster Stelle', () => {
    const erste = (f: string) => lernSuche(ix, f, 'de')[0];
    for (const [frage, einheit] of [['Faktorenanalyse', 'faktor-ladungen-lesen'], ['t-Test', 't-test-zwei-gruppen'], ['Median', 'lagemasse-streuung'], ['logistische Regression', 'logistische-regression-lesen']] as const) {
      expect(erste(frage)?.art, frage).toBe('einheit');
      expect(erste(frage)?.einheit, frage).toBe(einheit);
      expect(erste(frage)?.href, frage).toBe(`#lernen/${einheit}`);
    }
  });
  it('Einheit nennt Fachbegriff im Titel und Zahl der Fragen', () => {
    const t = lernSuche(ix, 'Faktorenanalyse', 'de')[0]!;
    expect(t.treffer.artikel.titel).toContain('(Faktorenanalyse');
    expect(t.n).toBe(8);
  });
  it('Beispiele werden über Titel und Verfahrensnamen gefunden', () => {
    expect(lernSuche(ix, 'Lesetraining', 'de').find(t => t.art === 'beispiel')?.treffer.artikel.titel).toContain('Lesetraining');
    expect(lernSuche(ix, 'Kaplan-Meier', 'de').some(t => t.art === 'beispiel')).toBe(true);
  });
  it('findet Baumdiagramm und Wahrscheinlichkeit im Lernlabor', () => {
    expect(hrefs('Baumdiagramm')[0]).toBe('#lernen/baumdiagramm');
    expect(hrefs('Baumdiagramm')).toContain('#verstehen/lernlabor/baum');
    expect(hrefs('Wahrscheinlichkeit')).toContain('#verstehen/lernlabor/zufall');
    expect(hrefs('Satz von Bayes')).toContain('#verstehen/lernlabor/vierfelder');
  });
  it('findet Kachel und Baustein von „Ausprobieren“', () => {
    expect(hrefs('Binomialverteilung')).toContain('#verstehen/verteilungen');
    expect(hrefs('Cronbachs Alpha')).toContain('#verstehen/probieren/alpha');
  });
  it('steht in fremden Sprachen ohne Rückfall da und liefert Treffer', () => {
    const en = lernIndex(artikelListe('en'), 'en');
    expect(lernSuche(en, 'factor analysis', 'en').map(t => t.href)).toContain('#verstehen/ueben/faktor');
  });
  it('Reihenfolge: erst Rechnen und Üben, dann höchstens acht Hilfe-Treffer', () => {
    const t = lernSuche(ix, 'Mittelwert', 'de');
    const erst = t.findIndex(x => x.art === 'hilfe');
    expect(t.slice(erst).every(x => x.art === 'hilfe')).toBe(true);
    expect(t.filter(x => x.art === 'hilfe').length).toBeLessThanOrEqual(8);
  });
  it('alle Ziele gibt es: Kacheln, Reiter, Bausteine, Hilfe-Artikel', () => {
    const ids = new Set(artikelListe('de').map(a => a.id));
    for (const k of KACHELN) { expect(VERSTEHEN_KACHELN as readonly string[]).toContain(k.id); expect(ids.has(k.hilfe), k.hilfe).toBe(true); }
    expect(LABOR_TEILE.length).toBe(9);
    for (const p of PROBIER_TEILE) expect(ix.ziele.has(`probieren:${p}`), p).toBe(true);
    expect(new Set(ix.eintraege.map(e => e.id)).size).toBe(ix.eintraege.length);
  });
});
