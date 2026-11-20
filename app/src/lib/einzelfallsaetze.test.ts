import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { baueFaelle, einzelfallAus, einzelfallMit, type Zeile } from './einzelfall';
import { einzelfallHinweise, saetzeEinzelfall, tabellenEinzelfall } from './einzelfallsaetze';

const zeilen: Zeile[] = readFileSync(new URL('./testdaten/einzelfall.csv', import.meta.url), 'utf8').trim().split('\n').slice(1).map(z => z.split(';')).map(([fall, phase, zeit, wert]) => ({ fall: fall!, phase: phase!, zeit: Number(zeit), mess: Number(wert) }));
const au = baueFaelle(zeilen);
const kopf = { mess: 'wert', phase: 'phase', zeit: 'zeit', fall: 'fall', phasenA: 'Ausgangslage', phasenB: 'Förderung', zeilen: zeilen.length, ausgelassen: 0 };
const eins = (n: string) => einzelfallAus(au.faelle.filter(f => f.name === n), kopf, n === 'Peter' ? 'tief' : 'hoch');

describe('Sätze und Tabellen zur Einzelfallanalyse', () => {
  it('ein Fall: Hauptsatz mit Mittelwerten, NAP-Satz, APA-Zeile', () => {
    const e = eins('Karolina'), s = saetzeEinzelfall(e);
    expect(s.haupt).toContain('73,5'); expect(s.haupt).toContain('51,8');
    expect(s.zusatz).toContain('NAP = ,97'); expect(s.zusatz).toContain('stark'); expect(s.zusatz).toContain('PND = 87\u00a0%');
    expect(s.apa).toBe('NAP = ,97, 95 %-KI [,70; 1,00], p = ,003; Tau-U = ,93, p = ,002; Tau-BC = ,59, p = ,002; PND = 87\u00a0%');
    expect(s.marken.map(m => m.erklaer)).toEqual(expect.arrayContaining(['nap', 'pnd', 'tau-u', 'einzelfall']));
  });
  it('Trend in A: Tau-U minus Trend A wird berichtet, Hinweis erscheint', () => {
    const e = eins('Lena'), s = saetzeEinzelfall(e);
    expect(s.zusatz).toContain('minus Trend in A'); expect(s.zusatz).toContain('mit Abzug des Trends');
    expect(einzelfallHinweise(e).some(h => h.text.startsWith('Trend in Phase A'))).toBe(true);
  });
  it('Richtung falsch herum: Hinweis zum Umschalten', () => {
    const e = einzelfallMit(eins('Peter'), 'hoch');
    expect(saetzeEinzelfall(e).vorsicht).toContain('Richtung oben umschalten');
    expect(saetzeEinzelfall(eins('Peter')).vorsicht).not.toContain('Richtung oben umschalten');
  });
  it('mehrere Fälle: Mittel, Tabellen mit Fall-Spalte und Mittelzeile', () => {
    const e = einzelfallAus(au.faelle.filter(f => ['Johanna', 'Karolina', 'Anja'].includes(f.name)), kopf, 'hoch');
    const s = saetzeEinzelfall(e);
    expect(s.haupt).toContain('Bei 3 Fällen'); expect(s.apa).toContain('3 Fälle');
    const t = tabellenEinzelfall(e);
    expect(t.map(x => x.label)).toEqual(['Phase Statistics', 'NAP and PND', 'Tau', 'Baseline Trend']);
    expect(t[0]!.rows).toBe(1 + 6); expect(t[1]!.rows).toBe(1 + 3 + 1);
  });
  it('zu wenige Messpunkte: Hinweis', () => {
    const e = einzelfallAus([{ name: '', y: [3, 4, 9, 8], istB: [false, false, true, true] }], kopf, 'hoch');
    expect(einzelfallHinweise(e)[0]!.art).toBe('hinweis');
  });
  it('gegenläufige Fälle: kein Mittel, nur Spannweite, Hinweis auf die gemeinsame Richtung', () => {
    // Peter (Fehler sinken) mit „höher ist besser“ gerechnet läuft gegen die anderen Fälle
    const e = einzelfallAus(au.faelle, kopf, 'hoch');
    expect(e.gesamt!.gleich).toBe(false);
    const s = saetzeEinzelfall(e);
    expect(s.haupt).toContain('verschiedene Richtungen'); expect(s.haupt).toContain('Mittel über die Fälle wird deshalb nicht gebildet');
    expect(s.marken.some(m => /Mittleres NAP/.test(m.text))).toBe(false);
    expect(s.marken.some(m => /^NAP je Fall: /.test(m.text))).toBe(true);
    expect(s.apa).toContain('Richtung uneinheitlich');
    expect(einzelfallHinweise(e).some(h => /verschiedene Richtungen/.test(h.text))).toBe(true);
    const nap = tabellenEinzelfall(e).find(t => t.label === 'NAP and PND')!;
    expect(nap.cells.some(c => c.t === 'Mittel')).toBe(false);
  });
  it('alle Fälle in einer Richtung: Mittel mit Spannweite', () => {
    const e = einzelfallAus(au.faelle.filter(f => f.name !== 'Peter'), kopf, 'hoch');
    expect(e.gesamt!.gleich).toBe(true);
    const s = saetzeEinzelfall(e);
    expect(s.marken.find(m => /Mittleres NAP/.test(m.text))!.text).toContain(' (,97 bis 1,00)');
    expect(tabellenEinzelfall(e).find(t => t.label === 'NAP and PND')!.cells.some(c => c.t === 'Mittel')).toBe(true);
  });
  it('Tau-U (− Trend A) kann über 1 liegen: ein Satz erklärt es; scan::tau_u gibt 1,4', async () => {
    // R: tau_u(scdf(c(A = 9, 8, 7, 6, 5, B = 12, 13, 14, 15, 16)), method = "parker") -> „A vs. B - Trend A“ = 1.4 (S = 35, 25 Paare)
    const f = einzelfallAus([{ name: '', y: [9, 8, 7, 6, 5, 12, 13, 14, 15, 16], istB: [false, false, false, false, false, true, true, true, true, true] }], kopf, 'hoch').faelle[0]!;
    expect(f.tauUTrend.wert).toBeCloseTo(1.4, 12);
    const e = einzelfallAus([{ name: '', y: [9, 8, 7, 6, 5, 12, 13, 14, 15, 16], istB: [false, false, false, false, false, true, true, true, true, true] }], kopf, 'hoch');
    expect(saetzeEinzelfall(e).zusatz).toContain('über 1 liegen');
    expect(JSON.stringify(tabellenEinzelfall(e).find(t => t.label === 'Tau')!.footnotes)).toContain('über 1');
  });
});
