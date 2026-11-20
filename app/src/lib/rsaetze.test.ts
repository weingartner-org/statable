import { describe, expect, it } from 'vitest';
import { s } from './sitzung.svelte';
import { cfaPruefung, fitUrteil, rFehlerText, zuordnungAusFaktoren, rSpaltenVon, type CfaErg, type OmegaErg } from './rverfahren.svelte';
import { saetzeCfa, mitOmega, mitCfa, tabellenCfa, tabellenOmega, cfaApa, omegaZeile } from './rsaetze';
import { berichtTabellen, excelTabellen, berichtSatz } from './berichtsatz';
import { rechenZusatz } from './eigenercode';
import type { Blatt } from './sitzung.svelte';
import { saetzeSkala, saetzeFaktoren, type Skala, type Faktoren } from './ergebnis';

/* Zahlen: Holzinger & Swineford, 3 Faktoren, lavaan::cfa (Mac, R 4.6.1, lavaan 0.7.2) - siehe scripts/cfa-omega-erwartet.R */
const cfa: CfaErg = {
  faktoren: [{ name: 'Visuell', fragen: ['x1', 'x2', 'x3'] }, { name: 'Text', fragen: ['x4', 'x5', 'x6'] }, { name: 'Tempo', fragen: ['x7', 'x8', 'x9'] }], schaetzer: 'ML', fiml: false, n: 301, nAlle: 301,
  fit: { chisq: 85.3055, df: 24, p: 8.5e-9, cfi: 0.9306, tli: 0.8958, rmsea: 0.0921, rmseaLo: 0.0714, rmseaHi: 0.1137, srmr: 0.0652 },
  ladungen: [0.772, 0.424, 0.581, 0.852, 0.855, 0.838, 0.57, 0.723, 0.665].map((std, i) => ({ faktor: Math.floor(i / 3), frage: `x${i + 1}`, std, se: 0.05, p: 0, lo: std - 0.1, hi: std + 0.1 })),
  kor: [{ a: 0, b: 1, r: 0.459, se: 0.064, p: 0 }, { a: 0, b: 2, r: 0.471, se: 0.073, p: 0 }, { a: 1, b: 2, r: 0.283, se: 0.069, p: 0 }], heywood: false, warnungen: []
};
const omega: OmegaErg = { omega: 0.738, lo: 0.695, hi: 0.781, art: 'delta', ziehungen: 0, n: 301, nAlle: 301, k: 9, heywood: false, fiml: false };

describe('Einordnung der Fit-Werte (Hu & Bentler 1999)', () => {
  it('gut, akzeptabel, nicht ausreichend', () => {
    expect(fitUrteil({ ...cfa.fit, cfi: 0.97, tli: 0.96, rmsea: 0.04, srmr: 0.04 })).toBe('gut');
    expect(fitUrteil({ ...cfa.fit, cfi: 0.92, tli: 0.91, rmsea: 0.07, srmr: 0.06 })).toBe('akzeptabel');
    expect(fitUrteil(cfa.fit)).toBe('unzureichend');   // TLI < ,90, RMSEA > ,08
  });
});

describe('Sätze zur CFA', () => {
  it('nennt Passung, nennt Faustregel, APA-Zeile mit 90-%-KI', () => {
    s.einst.sprache = 'de';
    const st = saetzeCfa(cfa);
    expect(st.haupt).toContain('nicht ausreichend');
    expect(st.vorsicht).toContain('Faustregeln');
    expect(st.apa).toBe('CFA: χ²(24) = 85,31, p < ,001, CFI = ,93, TLI = ,90, RMSEA = ,09, 90 %-KI [,07; ,11], SRMR = ,07 (n = 301)');
    expect(st.zusatz).toContain('Faktorkorrelationen');
    expect(st.marken.map(m => m.erklaer)).toEqual(expect.arrayContaining(['fit-indizes']));
    s.einst.sprache = 'en';
    expect(cfaApa(cfa)).toContain('90% CI [.07, .11]');
    s.einst.sprache = 'de';
  });
  it('baut die Tabellen: Passung, Ladungen, Faktorkorrelationen', () => {
    const t = tabellenCfa(cfa, q => q.toUpperCase());
    expect(t.map(x => x.label)).toEqual(['CFA Fit', 'CFA Loadings', 'CFA Factor Correlations']);
    expect(t[1]!.rows).toBe(10);
    expect(t[1]!.cells.some(c => c.t === 'X1')).toBe(true);
  });
  it('hängt CFA und Omega an die Sätze der Faktorenanalyse und der Skala', () => {
    const f: Faktoren = { art: 'faktor', faktoren: [{ nr: 1, fragen: [{ name: 'x1', ladung: 0.8 }] }], erklaert: 0.5, doppelt: [], ohne: [], n: 301, fragen: 9 };
    const st = mitCfa(saetzeFaktoren(f), cfa);
    expect(st.apa).toContain('Hauptkomponentenanalyse');
    expect(st.apa).toContain('CFA: χ²(24)');
    const sk: Skala = { art: 'skala', alpha: 0.76, fragen: [], n: 301 };
    const so = mitOmega(saetzeSkala(sk), omega);
    expect(so.apa).toContain("McDonalds ω = ,74, 95 %-KI [,69; ,78]");
    expect(so.zusatz).toContain('Omega');
    expect(omegaZeile(omega)).toBe('ω = ,74, 95 %-KI [,69; ,78]');
    expect(tabellenOmega({ ...omega, omegaH: 0.45, nf: 3 })[0]!.rows).toBe(3);
    expect(mitOmega(saetzeSkala(sk), undefined)).toEqual(saetzeSkala(sk));
  });
});

describe('Vorprüfung und Fehlertexte', () => {
  it('erkennt nicht identifizierte Modelle', () => {
    const f = (n: number) => Array.from({ length: n }, (_, i) => `q${i}`);
    expect(cfaPruefung([{ name: 'A', fragen: f(1) }], 100)).toContain('nur eine Frage');
    expect(cfaPruefung([{ name: 'A', fragen: f(2) }, { name: 'B', fragen: f(2) }, { name: 'C', fragen: f(2) }, { name: 'D', fragen: f(2) }], 100)).toBeNull();   // df = 36 − 22 = 14
    expect(cfaPruefung([{ name: 'A', fragen: f(2) }], 100)).toContain('nicht identifiziert');   // df = 3 − 4 < 0
    expect(cfaPruefung([{ name: 'A', fragen: f(3) }, { name: 'B', fragen: f(3) }], 5)).toContain('Zu wenige');
    expect(cfaPruefung([{ name: 'A', fragen: f(3) }, { name: 'B', fragen: f(3) }], 200)).toBeNull();
  });
  it('übersetzt R-Meldungen', () => {
    expect(rFehlerText('lavaan->lav_data_full(): some variables have no values (only missings) or no variance')).toContain('denselben Wert');
    expect(rFehlerText('model did not converge')).toContain('keine Konvergenz');
    expect(rFehlerText('lavaan: model is not identified')).toContain('nicht identifiziert');
    expect(rFehlerText('sample covariance matrix is not positive definite')).toContain('nicht positiv definit');
    expect(rFehlerText('etwas Neues')).toContain('R konnte nicht rechnen');
  });
});

describe('Daten für R', () => {
  it('macht Lücken und „keine Angabe“-Werte zu NA', () => {
    const sp = [{ name: 'a', fehlend: [99] }, { name: 'b', fehlend: [] }] as never[];
    const sp2 = rSpaltenVon(['a', 'b'], [[1, 2], [99, 3], [null, 4]], sp);
    expect(sp2.map(x => x.name)).toEqual(['v1', 'v2']);
    expect(sp2[0]!.werte).toEqual([1, null, null]);
    expect(sp2[1]!.werte).toEqual([2, 3, 4]);
  });
  it('übernimmt die Gruppen der Faktorenanalyse (mindestens zwei Fragen, höchstens fünf)', () => {
    const v = zuordnungAusFaktoren([{ nr: 1, fragen: [{ name: 'A' }, { name: 'B' }] }, { nr: 2, fragen: [{ name: 'C' }] }], ['a', 'b', 'c'], n => ({ a: 'A', b: 'B', c: 'C' } as Record<string, string>)[n]!);
    expect(v).toEqual([{ name: 'Faktor 1', fragen: ['a', 'b'] }]);
  });
});

describe('Bericht, Word, PDF, Excel', () => {
  const blatt = (art: string, e: unknown): Blatt => ({ id: 'x', titel: 't', art, l1: null, l2: null, syntax: '', items: [], ergebnis: { typ: art, e }, imBericht: true, notiz: '', zeit: 0 });
  const sk: Skala = { art: 'skala', alpha: 0.76, fragen: [], n: 301, omega };
  const fa: Faktoren = { art: 'faktor', faktoren: [], erklaert: 0.5, doppelt: [], ohne: [], n: 301, fragen: 9, cfa };
  it('nimmt die R-Tabellen in Bericht und Excel auf und nennt R im Rechenzusatz', () => {
    expect(berichtTabellen(blatt('skala', sk)).map(t => t.label)).toEqual(['McDonald Omega']);
    expect(berichtTabellen(blatt('faktor', fa)).map(t => t.label)).toEqual(['CFA Fit', 'CFA Loadings', 'CFA Factor Correlations']);
    expect(excelTabellen(blatt('faktor', fa)).length).toBe(3);
    expect(rechenZusatz([blatt('skala', sk)])).toContain('R mit lavaan und psych');
    expect(rechenZusatz([blatt('skala', { ...sk, omega: undefined })])).not.toContain('lavaan');
  });
  it('Berichtssatz: APA-Zeile mit Omega bzw. CFA in der Klammer', () => {
    expect(berichtSatz(blatt('skala', sk))).toContain("McDonalds ω = ,74");
    expect(berichtSatz(blatt('faktor', fa))).toContain('CFA: χ²(24)');
  });
});
