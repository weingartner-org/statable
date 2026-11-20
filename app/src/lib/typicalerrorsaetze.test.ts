import { describe, expect, it } from 'vitest';
import { s } from './sitzung.svelte';
import { typicalError } from './typicalerror';
import { mitTypicalError, saetzeTypicalError, tabellenTypicalError } from './typicalerrorsaetze';
import ERW from './testdaten/welle7-erwartet.json';

/* Welle 7, M8: Sätze und Tabelle zum Typical Error; Zahlen prüft typicalerror.test.ts gegen R. Hier: die Richtung der Änderung (zweite minus erste), beide Beschriftungen, CV nur bei Werten > 0, Abgrenzung. */
type Z = Record<string, any>;
const F = (ERW as unknown as { typicalerror: Z[] }).typicalerror;
const paare = (f: Z): [number, number][] => (f.y1 as number[]).map((v, i) => [v, (f.y2 as number[])[i]!]);
const mitSprache = <T,>(sp: 'de' | 'en', f: () => T): T => { const alt = s.einst.sprache; s.einst.sprache = sp; try { return f(); } finally { s.einst.sprache = alt; } };
const basis = { haupt: 'H', zusatz: 'Z', vorsicht: 'V', apa: 'A', marken: [] as { text: string; erklaer: string }[] };

describe('Typical Error: Sätze', () => {
  const te = typicalError(paare(F[0]!)), t = saetzeTypicalError(te, 'Sprint 1', 'Sprint 2');
  it('TE mit Intervall, Änderung ausdrücklich „zweite minus erste Messung“ und der Hinweis auf Bland-Altman', () => {
    expect(t.text).toContain('Die Differenzen zwischen den beiden Messungen streuen mit SD = 0,68; der Messfehler einer einzelnen Messung (Typical Error, TE = SD/√2) beträgt TE = 0,48, 95 %-KI [0,36; 0,70]'); expect(t.text).not.toMatch(/streuen um/); expect(t.text).toContain('Änderung des Mittelwerts (zweite minus erste Messung): 0,43');
    expect(t.text).toContain('Bland-Altman rechnet erste minus zweite Messung'); expect(t.text).toMatch(/Variationskoeffizient beträgt 3,7[\s\u00a0]% \(95 %-KI \[2,8[\s\u00a0]%; 5,4[\s\u00a0]%\]\)/);
    expect(t.apa).toMatch(/Änderung \(zweite minus erste Messung\) = 0,43/); expect(t.apa).toMatch(/CV = 3,7[\s\u00a0]%/); expect(t.marke.erklaer).toBe('typical-error');
  });
  it('Abgrenzung zum SEM und zum RCI; Test-Retest', () => {
    expect(t.vorsicht).toMatch(/Standardmessfehler \(SEM\)/); expect(t.vorsicht).toMatch(/Reliable Change Index/); expect(t.text).toMatch(/derselben Personen ohne Eingriff/);
    expect(saetzeTypicalError(typicalError(paare(F[0]!).slice(0, 10)), 'a', 'b').vorsicht).toMatch(/Bei 10 Fällen/);
  });
  it('Wert ≤ 0: kein CV, der Satz sagt es', () => {
    const f = F.find(x => !x.cv_moeglich)!, k = saetzeTypicalError(typicalError(paare(f)), 'a', 'b');
    expect(k.text).toContain('Der Variationskoeffizient ist nicht berechenbar'); expect(k.apa).not.toMatch(/CV/);
  });
  it('englisch', () => {
    const en = mitSprache('en', () => saetzeTypicalError(te, 'Sprint 1', 'Sprint 2'));
    expect(en.text).toContain('change (second minus first measurement)'.replace('change', 'Change of the mean')); expect(en.apa).toContain('CV = 3.7%, 95% CI [2.8%, 5.4%]'); expect(en.text).toContain('(95% CI [2.8%, 5.4%])');
  });
  it('nur im Bericht, wenn gewählt', () => {
    expect(mitTypicalError(basis, te, undefined, 'a', 'b')).toBe(basis); expect(mitTypicalError(basis, te, false, 'a', 'b')).toBe(basis);
    const m = mitTypicalError(basis, te, true, 'a', 'b'); expect(m.apa).toMatch(/^A; Typical Error: TE = 0,48/); expect(m.marken.length).toBe(1);
  });
  it('Tabelle: beide Richtungen in der Fußnote, CV-Zeile', () => {
    const tab = tabellenTypicalError(te, n => n, 'Sprint 1', 'Sprint 2')[0]!;
    expect(tab.cells.map(c => c.t)).toEqual(expect.arrayContaining(['Typical Error (TE)', 'Variationskoeffizient (CV, %)', 'SD der Differenzen']));
    expect(tab.footnotes[0]!.t).toMatch(/Bland-Altman rechnet erste minus zweite Messung/); expect(tabellenTypicalError(undefined, n => n, 'a', 'b')).toEqual([]);
  });
});
