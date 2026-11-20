import { describe, expect, it } from 'vitest';
import { jaNeinWerte, gemeinsamJaNein, alsNull1, mcnemarErgebnis, cochranErgebnis } from './janein';
import { saetzeMcNemar, tabellenMcNemar, saetzeCochran, tabellenCochran, orientiert, jaNeinSatz } from './jaNeinSaetze';
import { inSprache } from './sitzung.svelte';
import { friedman } from './friedman';
import { saetzeFriedman, tabellenFriedman } from './friedmansaetze';

/* Eigene Prüfungen zu G5 (die Sollwerte-Tests des Prüfers stehen in friedman-mcnemar-cochran*.test.ts): Festlegung „ja“, Sätze, APA-Zeilen, Tabellen, JSON-Rundlauf. */
const ohneLabels = { art: 'zahl' as const, werteLabels: {} };
const name = (n: string) => n;
/** Leerzeichen vor dem Prozentzeichen ist ein geschütztes: für den Vergleich ein gewöhnliches. */
const nl = (t: string) => t.replace(/[\u00a0\u202f]/g, ' ');

describe('Ja/Nein-Festlegung', () => {
  it('0 und 1: 1 ist „ja“, unabhängig von der Zeilenreihenfolge', () => {
    for (const w of [[0, 1, 1, 0], [1, 0, 0, 1]]) { const k = jaNeinWerte(ohneLabels, w)!; expect([k.ja, k.nein, k.regel]).toEqual(['1', '0', 'groesser']); }
  });
  it('1 = ja, 2 = nein mit Beschriftung: das Wort zählt, nicht die Größe', () => {
    const sp = { art: 'zahl' as const, werteLabels: { '1': 'ja', '2': 'nein' } };
    const k = jaNeinWerte(sp, [2, 1, 2])!;
    expect([k.ja, k.jaName, k.neinName, k.regel]).toEqual(['1', 'ja', 'nein', 'beschriftung']);
  });
  it('Text: „ja“/„nein“ nach dem Wort, sonst die alphabetisch zweite Antwort', () => {
    expect(jaNeinWerte({ art: 'text', werteLabels: {} }, ['nein', 'ja', 'ja'])!.ja).toBe('ja');
    const k = jaNeinWerte({ art: 'text', werteLabels: {} }, ['rot', 'blau'])!; expect([k.ja, k.regel]).toEqual(['rot', 'alphabet']);
  });
  it('zwei Zahlen ohne Beschriftung (3 und 8) sind ein Messwert, kein Ja/Nein; drei Werte auch nicht', () => {
    expect(jaNeinWerte(ohneLabels, [3, 8, 3])).toBeNull(); expect(jaNeinWerte(ohneLabels, [0, 1, 2])).toBeNull(); expect(jaNeinWerte({ art: 'datum', werteLabels: {} }, ['a', 'b'])).toBeNull();
  });
  it('umkehren vertauscht ja und nein; gemeinsam nur bei denselben zwei Werten', () => {
    const a = jaNeinWerte(ohneLabels, [0, 1], true)!; expect([a.ja, a.nein, a.umgekehrt]).toEqual(['0', '1', true]);
    expect(gemeinsamJaNein([jaNeinWerte(ohneLabels, [0, 1]), jaNeinWerte(ohneLabels, [1, 0])])).not.toBeNull();
    expect(gemeinsamJaNein([jaNeinWerte(ohneLabels, [0, 1]), jaNeinWerte({ art: 'text', werteLabels: {} }, ['ja', 'nein'])])).toBeNull();
    expect(alsNull1(1, jaNeinWerte(ohneLabels, [0, 1])!, true)).toBe(1);
  });
});

/** Fall d_b12_c4 des Prüfers: 50 Personen, b = 12 (ja → nein), c = 4 (nein → ja), a = 18, d = 16. */
const d12 = () => { const v: number[] = [], n: number[] = []; const add = (k: number, x: number, y: number) => { for (let i = 0; i < k; i++) { v.push(x); n.push(y); } }; add(18, 1, 1); add(12, 1, 0); add(4, 0, 1); add(16, 0, 0); return [v, n] as const; };
const jn = jaNeinWerte({ art: 'zahl', werteLabels: { '0': 'nein', '1': 'ja' } }, [0, 1])!;

describe('McNemar: Sätze und Tabellen', () => {
  const [v, n] = d12(), e = mcnemarErgebnis('v', 'n', v, n, jn, 50);
  it('Anteile, Verlauf, p exakt, Odds Ratio in Richtung der häufigeren Veränderung', () => {
    expect([e.anteilVorher, e.anteilNachher]).toEqual([0.6, 0.44]);
    const s = saetzeMcNemar(e, name);
    expect(nl(s.haupt)).toBe('Von „v“ zu „n“ sank der Anteil „ja“ von 60 % auf 44 %.');
    expect(nl(s.apa)).toMatch(/^exakter McNemar-Test, p = ,077, OR = 3,00 \(Wechsel zu „nein“ : Wechsel zu „ja“\), 95 %-KI \[0,91; 12,76\]$/);
    expect(s.zusatz).toContain('Wechsel von „nein“ zu „ja“: 4, von „ja“ zu „nein“: 12');
    expect(s.zusatz).toContain('Wechsel zu „nein“ waren 3,00-mal so häufig wie Wechsel zu „ja“');
    expect(s.zusatz).toContain('belegen eine Veränderung darum nicht');
  });
  it('Gegenrichtung: Kehrwert der Odds Ratio und ihres Intervalls', () => {
    const g = mcnemarErgebnis('v', 'n', n, v, jn, 50), o = orientiert(g);
    expect(o.zuJa).toBe(true); expect(o.or).toBeCloseTo(3, 9); expect(o.lo).toBeCloseTo(0.909231980884916, 9); expect(o.hi).toBeCloseTo(12.7623444654793, 9);
    expect(nl(saetzeMcNemar(g, name).haupt)).toContain('stieg der Anteil „ja“ von 44 % auf 60 %');
    expect(nl(saetzeMcNemar(g, name).apa)).toMatch(/^exakter McNemar-Test, p = ,077, OR = 3,00 \(Wechsel zu „ja“ : Wechsel zu „nein“\), 95 %-KI \[0,91; 12,76\]$/);   // die APA-Zeile nennt die Richtung des OR
    expect(inSprache('en', () => saetzeMcNemar(g, name).apa)).toContain('OR = 3.00 (changes to "ja" : changes to "nein")');
  });
  it('b = 3, c = 0: Odds Ratio unendlich, auch nach dem JSON-Rundlauf (Unendlich wird null)', () => {
    const x = mcnemarErgebnis('v', 'n', [1, 1, 1, 0, 0], [0, 0, 0, 0, 0], jn, 5), r = JSON.parse(JSON.stringify(x));
    for (const e2 of [x, r]) { const s = saetzeMcNemar(e2, name); expect(s.apa).toContain('OR = ∞'); expect(s.apa).toContain('0,41; ∞]'); expect(s.zusatz).toContain('nur Wechsel zu „nein“'); }
  });
  it('keine Wechsel: kein Test, nur der Satz, keine APA-Zeile', () => {
    const x = mcnemarErgebnis('v', 'n', [1, 0, 1], [1, 0, 1], jn, 3), s = saetzeMcNemar(x, name);
    expect(s.apa).toBe(''); expect(s.haupt).toBe('Keine Person hat die Antwort geändert: Alle 3 Personen antworteten bei „v“ und „n“ gleich. Damit lässt sich kein Test rechnen.');
    expect(tabellenMcNemar(x, name).length).toBe(1);
  });
  it('b = c = 7: p = 1 wird als „> ,999“ berichtet, Anteil bleibt gleich', () => {
    const v2: number[] = [], n2: number[] = []; for (let i = 0; i < 7; i++) { v2.push(1, 0); n2.push(0, 1); }
    const s = saetzeMcNemar(mcnemarErgebnis('v', 'n', v2, n2, jn, 14), name);
    expect(nl(s.haupt)).toContain('blieb der Anteil „ja“ bei 50 %'); expect(s.apa).toContain('p > ,999'); expect(s.zusatz).toContain('Beide Richtungen sind gleich häufig');
  });
  it('Tabellen: Kreuztabelle und Test mit exakter Fußnote', () => {
    const t = tabellenMcNemar(e, name); expect(t.map(x => x.label)).toEqual(['McNemar Crosstabulation', 'McNemar Test']);
    expect(t[1]!.footnotes.some(f => /mcnemar\.test/.test(f.t))).toBe(true);
  });
});

describe('Cochran-Q und Friedman: Sätze und APA-Zeilen', () => {
  it('Cochran: Spanne der Anteile, Q, Paarvergleiche', () => {
    const daten = [[1, 0, 0], [1, 1, 0], [1, 1, 1], [0, 1, 1], [1, 1, 1], [1, 0, 0], [1, 1, 1], [0, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 0], [1, 1, 0]];
    const e = cochranErgebnis(['t1', 't2', 't3'], daten, jn, 12), s = saetzeCochran(e, name);
    expect(s.apa).toMatch(/^Q\(2\) = [\d,]+, p [=<] /); expect(nl(s.haupt)).toMatch(/^Der Anteil „ja“ lag je nach Zeitpunkt zwischen \d+ % \(„t\d“\) und \d+ % \(„t\d“\)\.$/);
    expect(tabellenCochran(e, name).length).toBeGreaterThanOrEqual(2);
    const r = JSON.parse(JSON.stringify(e)); expect(saetzeCochran(r, name).apa).toBe(s.apa);
  });
  it('Cochran ist unter ja/nein-Vertauschung unverändert (Q und p), die Anteile kehren sich um', () => {
    const daten = [[1, 0, 0], [1, 1, 0], [1, 1, 1], [0, 1, 1], [1, 1, 1], [1, 0, 0], [0, 0, 1]];
    const k2 = { ...jn, ja: '0', nein: '1', jaName: 'nein', neinName: 'ja', umgekehrt: true };
    const a = cochranErgebnis(['a', 'b', 'c'], daten, jn, 7), b = cochranErgebnis(['a', 'b', 'c'], daten.map(z => z.map(x => 1 - x)), k2, 7);
    expect(b.q).toBeCloseTo(a.q, 12); expect(b.p).toBeCloseTo(a.p, 12);
  });
  it('Friedman: APA-Zeile „χ²(3) = …, p = …, Kendalls W = …“', () => {
    const daten = [[3, 5, 6, 8], [2, 4, 5, 7], [4, 4, 7, 9], [1, 3, 5, 6], [3, 6, 6, 8], [2, 5, 4, 7], [3, 4, 6, 9], [2, 3, 5, 7]];
    const e = friedman(daten, ['t1', 't2', 't3', 't4']), s = saetzeFriedman(e, name);
    expect(s.apa).toMatch(/^χ²\(3\) = [\d,]+, p [=<] [,\d]+, Kendalls W = [,\d]+/);
    expect(s.haupt).toMatch(/^Im Rangvergleich lagen die Werte bei „t4“ am höchsten \(mittlerer Rang [\d,]+, Median [\d,]+\), bei „t1“ am niedrigsten/);
    expect(tabellenFriedman(e, name).map(x => x.label)).toEqual(['Ranks', 'Friedman Test', 'Wilcoxon Pairwise']);
    expect(`${s.haupt} ${s.zusatz}`).not.toContain('deutlich');   // Paarvergleiche: „signifikant“, nicht „deutlich“ (Fachprüfung Paket C)
    expect(s.zusatz).toMatch(/unterscheiden sich signifikant:|kein einzelnes Paar von Zeitpunkten signifikant verschieden|Paaren signifikant \(Tabelle\)/);
    const r = JSON.parse(JSON.stringify(e)); expect(saetzeFriedman(r, name).apa).toBe(s.apa);
  });
  it('Friedman ohne jeden Unterschied: nur ein Satz', () => {
    const e = friedman([[2, 2, 2], [3, 3, 3], [1, 1, 1]], ['a', 'b', 'c']), s = saetzeFriedman(e, name);
    expect(s.apa).toBe(''); expect(s.haupt).toBe('Alle Personen haben zu allen Zeitpunkten denselben Wert. Damit lässt sich kein Test rechnen.');
    expect(JSON.parse(JSON.stringify(e)).kein).toBe(true);
  });
  it('Satz zur Festlegung nennt die Regel', () => { expect(jaNeinSatz(jn)).toBe('Als „ja“ zählt „ja“, als „nein“ „nein“ (nach der Beschriftung).'); });
});
