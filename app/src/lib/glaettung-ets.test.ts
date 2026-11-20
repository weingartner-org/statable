import { describe, expect, it } from 'vitest';
import { s } from './sitzung.svelte';
import ERW from './testdaten/glaettung-erwartet.json';
import {
  prognoseLesen, prognoseWahlBereinigen, prognoseWahlGrund, prognoseAufruf, prognoseLeitplanken, prognoseModellText, prognoseHauptsatz, prognoseRCode, glaettungGrund, glaettungName, parameterNameGlaettung,
  etsKandidaten, etsName, etsSatz, etsAufruf, hatBand, ETS_MODELLE, GLAETTUNGEN, HW_GLAETTUNGEN,
  type PrognoseAntwort, type PrognoseE, type PrognoseWahl
} from './prognose';
import { prognoseTabellen, PROGNOSE_LABELS } from './prognoseblatt';

/* Glättung (ETS) in der Prognose (Fachblatt docs/fachblaetter/GLAETTUNG-SERIEN.md, Abschnitte 1 bis 3): alles, was ohne R prüfbar ist - Kandidatenliste und ihre Reihenfolge, Sperren, der Aufruf an R, das Lesen der Antwort,
 * kein Intervall bei Fehlerart M, die Warnung am Rand (φ, α), Sätze und Tabellen. Die Rechnung selbst steht in engine/glaettung.webr.test.ts. */
s.einst.sprache = 'de'; s.einst.anrede = 'du';
const J = ERW as unknown as { gedaempft: { name: string; y: number[]; alpha: number; beta: number; phi: number; loglik: number; aicc: number; mittel: number[]; u95: number[]; o95: number[] }[]; automatik: { name: string; y: number[]; m: number; kandidaten: string[]; aicc: number[] }[] };
const reihe = (y: (number | null)[], raster: 'monatlich' | 'jaehrlich' = 'monatlich', periode = 12) => ({ raster, periode, y });
const wahl = (o: Partial<PrognoseWahl> = {}): PrognoseWahl => ({ art: 'ets-auto', h: 12, log: false, p: 0, d: 0, q: 0, P: 0, D: 0, Q: 0, konst: false, glaettung: 'einfach', ...o });

/** Die Antwort von R für ein ETS-Modell, wie `rZuJson` sie liefert. */
const roh = (extra: Record<string, unknown> = {}): Record<string, unknown> => ({
  art: ['glaettung'], glaettung: ['ets'], ets: ['AAdN'], periode: [1], alpha: [0.9645], beta: [0.2962], gamma: [null], phi: [0.8738], loglik: [-418.26], aicc: [849.11], aic: [846.2], start: [1],
  mittel: [262.8, 263, 263.1], u80: [261, 260, 259], o80: [264.6, 265.9, 267], u95: [260.2, 258.8, 257.4], o95: [265.5, 267.2, 268.8], intervall: [true],
  angepasst: [1, 2, 3], rmse: [1.3], mae: [1], mape: [0.4], ljung: { q: 8, h: 10, p: 0.63, fitdf: 0 }, acf_res: [0.1, 0.0], pruef: { rmse: 3.1, mae: 2.8, rmse_naiv: 0.6, mae_naiv: 0.5 }, pr: [5], ...extra
});
const antwort = (extra: Record<string, unknown> = {}): PrognoseAntwort => { const l = prognoseLesen(roh(extra)); if (!l.ok) throw new Error('Lesen: ' + l.code); return l.antwort; };
const ohneBand = { u80: [], o80: [], u95: [], o95: [], intervall: [false] };
const pe = (w: PrognoseWahl, extra: Record<string, unknown> = {}): PrognoseE => ({ wahl: w, pr: 5, antwort: antwort(extra) });
const laut = (w: PrognoseWahl, a: PrognoseAntwort, o: { T?: number; periode?: number; alle?: boolean } = {}) => prognoseLeitplanken({ wahl: w, antwort: a, T: o.T ?? 150, periode: o.periode ?? 1, alleWerteUeber0: o.alle ?? true });

describe('Kandidaten der Automatik über die Glättung: Liste und Reihenfolge', () => {
  it('ohne Saison immer ANN, AAN, AAdN', () => {
    expect(etsKandidaten(1, 150, true)).toEqual(['ANN', 'AAN', 'AAdN']);
    expect(etsKandidaten(1, 20, false)).toEqual(['ANN', 'AAN', 'AAdN']);
  });
  it('mit Saison (2 ≤ m ≤ 24 und T ≥ 3 m) dazu ANA, AAA, AAdA; bei allen Werten über 0 außerdem MNM, MAM, MAdM, in dieser Reihenfolge', () => {
    expect(etsKandidaten(12, 144, true)).toEqual(['ANN', 'AAN', 'AAdN', 'ANA', 'AAA', 'AAdA', 'MNM', 'MAM', 'MAdM']);
    expect(etsKandidaten(12, 72, false)).toEqual(['ANN', 'AAN', 'AAdN', 'ANA', 'AAA', 'AAdA']);
    expect([...ETS_MODELLE]).toEqual(etsKandidaten(12, 144, true));
  });
  it('die Grenzen: T = 3 m geht, T = 3 m − 1 nicht; m = 24 geht, m = 25 nicht, m = 1 und m = 0 nicht', () => {
    expect(etsKandidaten(12, 36, true).length).toBe(9); expect(etsKandidaten(12, 35, true).length).toBe(3);
    expect(etsKandidaten(24, 72, true).length).toBe(9); expect(etsKandidaten(25, 200, true).length).toBe(3);
    expect(etsKandidaten(1, 500, true).length).toBe(3); expect(etsKandidaten(0, 500, true).length).toBe(3);
  });
  it('die Sollwerte der Automatik: die Wahl und die besten fünf gehören zur Kandidatenliste der Reihe', () => {
    for (const a of J.automatik) {
      const liste = etsKandidaten(a.m, a.y.length, a.y.every(v => v > 0));
      expect(a.kandidaten.length, a.name).toBe(liste.length);
      expect([...a.kandidaten].sort(), a.name).toEqual([...liste].sort());
    }
  });
});

describe('Sperren und Wahl', () => {
  it('„Automatisch über die Glättung“ und der gedämpfte Trend gehen nicht mit Lücken; sonst gehen sie', () => {
    const mitLuecke = reihe([...Array(30).fill(5), null, ...Array(30).fill(6)]);
    expect(prognoseWahlGrund(wahl({ art: 'ets-auto' }), mitLuecke)).toBe('luecken-nur-selbst');
    expect(prognoseWahlGrund(wahl({ art: 'glaettung', glaettung: 'gedaempft' }), mitLuecke)).toBe('luecken-nur-selbst');
    expect(glaettungGrund('gedaempft', mitLuecke)).toBe('luecken-nur-selbst');
    expect(prognoseWahlGrund(wahl({ art: 'ets-auto' }), reihe(Array.from({ length: 60 }, (_, i) => i + 1)))).toBeNull();
    expect(prognoseWahlGrund(wahl({ art: 'glaettung', glaettung: 'gedaempft' }), reihe(Array.from({ length: 60 }, (_, i) => i + 1)))).toBeNull();
  });
  it('die Log-Skala gibt es nur bei ARIMA: bei der Glättung wird sie ausgeschaltet', () => {
    const r = reihe(Array.from({ length: 60 }, (_, i) => i + 1));
    expect(prognoseWahlBereinigen(wahl({ art: 'ets-auto', log: true }), r).log).toBe(false);
    expect(prognoseWahlBereinigen(wahl({ art: 'glaettung', log: true }), r).log).toBe(false);
    expect(prognoseWahlBereinigen(wahl({ art: 'auto', log: true }), r).log).toBe(true);
    expect(prognoseWahlGrund(wahl({ art: 'ets-auto', log: true }), r)).toBeNull();
  });
  it('die alten Arten bleiben: vier HoltWinters-Arten, der gedämpfte Trend als fünfte; eine unbekannte Art wird einfach', () => {
    expect([...GLAETTUNGEN]).toEqual(['einfach', 'holt', 'add', 'mult', 'gedaempft']); expect([...HW_GLAETTUNGEN]).toEqual(['einfach', 'holt', 'add', 'mult']);
    const r = reihe(Array.from({ length: 60 }, (_, i) => i + 1));
    expect(prognoseWahlBereinigen(wahl({ art: 'glaettung', glaettung: 'gedaempft' }), r).glaettung).toBe('gedaempft');
    expect(prognoseWahlBereinigen(wahl({ art: 'glaettung', glaettung: 'quatsch' as 'einfach' }), r).glaettung).toBe('einfach');
  });
});

describe('Aufruf an R: nur Wörter und Zahlen, die Reihe als Spalte', () => {
  it('Automatik über die Glättung, gedämpfter Trend und die übrigen Arten', () => {
    expect(prognoseAufruf(wahl({ art: 'ets-auto', h: 12 }), 12, 12).code).toContain('sp_prognose_ets_auto(d$y, 12L, 12L, 12L)');
    expect(prognoseAufruf(wahl({ art: 'glaettung', glaettung: 'gedaempft', h: 10 }), 1, 5).code).toContain("sp_prognose_ets(d$y, 1L, 10L, 'AAdN', 5L)");
    expect(prognoseAufruf(wahl({ art: 'glaettung', glaettung: 'holt', h: 10 }), 1, 5).code).toContain("sp_prognose_glaettung(d$y, 1L, 10L, 'holt', 5L)");
    expect(prognoseAufruf(wahl({ art: 'auto', h: 12 }), 12, 12).code).toContain('sp_prognose_arima(d$y');
  });
  it('ein Modell außerhalb der neun wird nie zu Code; Zahlen müssen endlich und ganz sein', () => {
    expect(() => etsAufruf('XYZ' as 'ANN', 1, 5, 0)).toThrow();
    expect(() => etsAufruf("ANN'); system('x" as 'ANN', 1, 5, 0)).toThrow();
    expect(() => etsAufruf('ANN', 1.5, 5, 0)).toThrow(); expect(() => etsAufruf('ANN', 1, NaN, 0)).toThrow();
    expect(etsAufruf('MAdM', 12, 12, 12).code).toContain("'MAdM'");
    expect(() => prognoseAufruf(wahl({ art: 'glaettung', glaettung: 'quatsch' as 'einfach' }), 1, 0)).toThrow();
  });
});

describe('Antwort lesen', () => {
  it('ETS mit Band: Code, φ, log-Likelihood, Band', () => {
    const a = antwort();
    expect(a.ets).toBe('AAdN'); expect(a.glaettung).toBeNull(); expect(a.phi).toBeCloseTo(0.8738, 4); expect(a.loglik).toBeCloseTo(-418.26, 2); expect(a.aicc).toBeCloseTo(849.11, 2);
    expect(hatBand(a)).toBe(true); expect(a.u95.length).toBe(3); expect(a.wahlEts).toBeNull(); expect(a.neu).toBe(false);
  });
  it('der gedämpfte Trend heißt „gedaempft“ in der Antwort und bleibt eine bekannte Glättungsart', () => {
    expect(antwort({ glaettung: ['gedaempft'] }).glaettung).toBe('gedaempft');
  });
  it('Fehlerart M: kein Band (leere Vektoren), die besten fünf der Automatik werden gelesen', () => {
    const a = antwort({ ets: ['MAM'], glaettung: ['ets'], ...ohneBand, wahl_ets: { modell: ['MAM', 'MAdM', 'MNM', 'AAA', 'AAdA'], aicc: [1401.4, 1412.5, 1415.7, 1477.5, 1487.6], geprueft: [9] } });
    expect(a.ets).toBe('MAM'); expect(hatBand(a)).toBe(false); expect(a.u80).toEqual([]); expect(a.o95).toEqual([]);
    expect(a.wahlEts).toEqual({ modelle: ['MAM', 'MAdM', 'MNM', 'AAA', 'AAdA'], aicc: [1401.4, 1412.5, 1415.7, 1477.5, 1487.6], geprueft: 9 });
  });
  it('ein unbekannter Modellcode wird nicht übernommen; eine einzelne Zahl statt Vektor geht auch', () => {
    expect(antwort({ ets: ['XYZ'] }).ets).toBeNull();
    expect(antwort({ wahl_ets: { modell: 'ANN', aicc: 1459.03, geprueft: 3 } }).wahlEts).toEqual({ modelle: ['ANN'], aicc: [1459.03], geprueft: 3 });
  });
  it('alte Projektdateien: eine Antwort ohne ETS-Felder bleibt, was sie war', () => {
    const a = antwort({ ets: undefined, phi: undefined, loglik: undefined, wahl_ets: undefined, glaettung: ['holt'], intervall: undefined });
    expect(a.ets).toBeNull(); expect(a.phi).toBeNull(); expect(a.glaettung).toBe('holt'); expect(prognoseModellText(a)).toBe(glaettungName('holt'));
    const alt = { ...a, ets: undefined, phi: undefined, loglik: undefined, wahlEts: undefined, neu: undefined } as unknown as PrognoseAntwort;   // wie aus einer Datei von früher
    expect(prognoseModellText(alt)).toBe(glaettungName('holt')); expect(hatBand(alt)).toBe(true);
    expect(laut(wahl({ art: 'glaettung', glaettung: 'holt' }), alt).map(l => l.code)).toContain('holt-winters');
  });
});

describe('Namen und Sätze', () => {
  it('ETS(M,A,M) und ETS(A,Ad,N): Fehlerart, Trend, Saison', () => {
    expect(etsName('MAM')).toBe('ETS(M,A,M)'); expect(etsName('AAdN')).toBe('ETS(A,Ad,N)'); expect(etsName('ANN')).toBe('ETS(A,N,N)'); expect(etsName('MAdM')).toBe('ETS(M,Ad,M)');
  });
  it('zu jedem der neun Modelle ein ganzer Satz mit dem Namen; die M-Modelle sagen, dass die Fehler multiplikativ sind', () => {
    for (const c of ETS_MODELLE) {
      const t = etsSatz(c);
      expect(t, c).toContain(etsName(c)); expect(t.endsWith('.'), c).toBe(true);
      expect(/multiplikativ,? das heißt relativ/.test(t), c).toBe(c.startsWith('M'));
    }
    expect(etsSatz('XYZ')).toBe('');
  });
  it('Modellname im Hauptsatz: Automatik wählt ETS(M,A,M), dazu der erklärende Satz; ohne Band kein „Prognoseintervall“', () => {
    const p = pe(wahl(), { ets: ['MAM'], glaettung: ['ets'], ...ohneBand });
    expect(prognoseModellText(p.antwort)).toBe('ETS(M,A,M)');
    const t = prognoseHauptsatz(p, { name: '„x“', zeiten: ['Jan 2020', 'Feb 2020', 'Mär 2020'], stellen: 0, automatik: true });
    expect(t).toContain('Die Automatik wählte für „x“ nach dem kleinsten AICc das Modell ETS(M,A,M).'); expect(t).toContain('Fehler sind multiplikativ'); expect(t).not.toMatch(/Prognoseintervall/);
    expect(t).toContain('Jan 2020: 263'); expect(t).toContain('zuletzt Mär 2020: 263');
  });
  it('Hauptsatz mit Band nennt das Intervall; der gedämpfte Trend heißt ETS(A,Ad,N)', () => {
    const p = pe(wahl({ art: 'glaettung', glaettung: 'gedaempft' }));
    const t = prognoseHauptsatz(p, { name: '„x“', zeiten: ['1', '2', '3'], stellen: 1, automatik: false });
    expect(t).toContain('Für „x“ wurde das Modell ETS(A,Ad,N) gerechnet.'); expect(t).toContain('95-%-Prognoseintervall'); expect(t).toContain('ein Trend, der mit der Zeit abflacht');
  });
});

describe('Warnungen', () => {
  const g = (n: string) => J.gedaempft.find(x => x.name === n)!;
  const mitParametern = (n: string): PrognoseAntwort => antwort({ alpha: [g(n).alpha], beta: [g(n).beta], phi: [g(n).phi] });
  it('φ an der Grenze 0,98 oder α nahe 1: austres und uspop schlagen an, BJsales nicht', () => {
    const w = wahl({ art: 'glaettung', glaettung: 'gedaempft' });
    expect(laut(w, mitParametern('bjsales')).map(l => l.code)).not.toContain('ets-rand');
    for (const n of ['austres', 'uspop']) expect(laut(w, mitParametern(n)).map(l => l.code), n).toContain('ets-rand');
  });
  it('ein Satz je Fall: φ allein, α allein, beide; φ an der unteren Grenze 0,8 auch', () => {
    const w = wahl({ art: 'glaettung', glaettung: 'gedaempft' });
    const sat = (x: Record<string, unknown>) => laut(w, antwort(x)).filter(l => l.code === 'ets-rand').map(l => l.satz);
    expect(sat({ phi: [0.98], alpha: [0.5] })).toEqual([expect.stringContaining('Die Dämpfung φ liegt mit ,98 an der Grenze des erlaubten Bereichs (,80 bis ,98)')]);
    expect(sat({ phi: [0.8], alpha: [0.5] })).toEqual([expect.stringContaining('Die Dämpfung φ liegt mit ,80 an der Grenze')]);
    expect(sat({ phi: [0.9], alpha: [0.9999] })).toEqual([expect.stringMatching(/^α liegt mit ,9999 nahe bei 1/)]);
    expect(sat({ phi: [0.98], alpha: [0.9999] })).toEqual([expect.stringContaining('Die Dämpfung φ (,98) und α (,9999)')]);
    expect(sat({ phi: [0.9], alpha: [0.5] })).toEqual([]);
  });
  it('kein Intervall bei Fehlerart M: Satz dazu, sonst nicht; HoltWinters-Satz nur bei HoltWinters', () => {
    const wm = wahl(), m = antwort({ ets: ['MAM'], ...ohneBand }), a = antwort();
    const cm = laut(wm, m, { periode: 12 }).map(l => l.code), ca = laut(wm, a).map(l => l.code);
    expect(cm).toContain('ets-kein-intervall'); expect(ca).not.toContain('ets-kein-intervall');
    expect(laut(wm, m, { periode: 12 }).find(l => l.code === 'ets-kein-intervall')!.satz).toBe('Für dieses Modell rechnet Statable kein Intervall. Wer eines braucht, nimmt ARIMA oder Holt-Winters.');
    expect(cm).not.toContain('holt-winters'); expect(cm).not.toContain('untergrenze'); expect(cm).not.toContain('aehnlich');
    const hw = antwort({ ets: undefined, glaettung: ['holt'] });
    expect(laut(wahl({ art: 'glaettung', glaettung: 'holt' }), hw).map(l => l.code)).toContain('holt-winters');
  });
  it('die Automatik ist ein Vorschlag: der Satz steht immer, einmal (keine doppelten Sätze), auch ohne Saison; in „Sie“ anders', () => {
    const l = laut(wahl(), antwort()).filter(x => x.code === 'ets-grenze');
    expect(l.length).toBe(1); expect(l[0]!.satz).toBe('Die Automatik ist ein Vorschlag. Der Optimierer kann bei Saison ein besseres Modell verpassen; vergleiche Modelle mit ähnlichem AICc.');
    s.einst.anrede = 'sie'; expect(laut(wahl(), antwort()).find(x => x.code === 'ets-grenze')!.satz).toContain('vergleichen Sie Modelle'); s.einst.anrede = 'du';
    expect(laut(wahl({ art: 'glaettung', glaettung: 'gedaempft' }), antwort()).map(x => x.code)).not.toContain('ets-grenze');
    const alle = laut(wahl(), antwort()).map(x => x.satz); expect(new Set(alle).size).toBe(alle.length);
  });
  it('ohne Saison berücksichtigt die Automatik keine Saison, wenn die Periode über 24 liegt oder die Reihe kürzer als drei Perioden ist', () => {
    expect(laut(wahl(), antwort(), { periode: 30, T: 300 }).map(l => l.code)).toContain('keine-saison');
    expect(laut(wahl(), antwort(), { periode: 12, T: 30 }).map(l => l.code)).toContain('keine-saison');
    expect(laut(wahl(), antwort(), { periode: 12, T: 144 }).map(l => l.code)).not.toContain('keine-saison');
  });
});

describe('Tabellen', () => {
  const zellen = (t: { cells: { r: number; c: number; t: string }[] }, r: number) => t.cells.filter(c => c.r === r).map(c => c.t);
  const nameVon = (p: PrognoseE) => prognoseTabellen(p, { name: 'x', zeiten: ['1', '2', '3'], stellen: 1 });
  it('mit Band: sechs Spalten; Modelltabelle mit α, β, φ und Hinweis auf keinen Standardfehler; AICc und log-Likelihood', () => {
    const t = nameVon(pe(wahl({ art: 'glaettung', glaettung: 'gedaempft' })));
    const prog = t.find(x => x.label === 'Prognose')!, modell = t.find(x => x.label === 'Prognosemodell')!, guete = t.find(x => x.label === 'Prognose-Gütemaße')!;
    expect(prog.cols).toBe(6); expect(modell.title!.t).toBe('Modell: ETS(A,Ad,N)');
    expect(modell.cells.filter(c => c.c === 0 && c.r > 0).map(c => c.t)).toEqual(['α (Niveau)', 'β (Trend)', 'φ (Dämpfung)']);
    expect(modell.footnotes.map(f => f.t).join(' ')).toContain('keinen Standardfehler');
    expect(guete.cells.map(c => c.t)).toContain('log-Likelihood'); expect(guete.cells.map(c => c.t)).toContain('AICc');
  });
  it('Fehlerart M: nur Zeitpunkt und Prognose, die Fußnote sagt „kein Intervall“; die Automatik-Tabelle zeigt ETS-Namen und ΔAICc', () => {
    const t = nameVon(pe(wahl(), { ets: ['MAM'], ...ohneBand, wahl_ets: { modell: ['MAM', 'MAdM'], aicc: [1401.4, 1412.5], geprueft: [9] } }));
    const prog = t.find(x => x.label === 'Prognose')!, auto = t.find(x => x.label === 'Prognose-Automatik')!;
    expect(prog.cols).toBe(2); expect(zellen(prog, 0)).toEqual(['Zeitpunkt', 'Prognose']); expect(prog.footnotes.map(f => f.t)).toEqual(['Für dieses Modell rechnet Statable kein Intervall.']);
    expect(auto.cells.filter(c => c.c === 0 && c.r > 0).map(c => c.t)).toEqual(['ETS(M,A,M)', 'ETS(M,Ad,M)']); expect(auto.cells.filter(c => c.c === 2 && c.r > 0).map(c => c.t)).toEqual(['0.00', '11.10']);
    expect(auto.footnotes[0]!.t).toBe('9 Modelle gerechnet, geordnet nach AICc.');
    expect(PROGNOSE_LABELS).toContain('Prognose-Automatik');
  });
});

describe('R-Text zum Ansehen', () => {
  it('ETS: gleichwertiger Aufruf mit Modellcode und Dämpfung; nichts davon wird ausgeführt', () => {
    expect(prognoseRCode(pe(wahl(), { ets: ['MAdM'], ...ohneBand, periode: [12] }), 'Fluggäste', 144)).toContain("ets(y, model = 'MAM', damped = TRUE)");
    const g = prognoseRCode(pe(wahl({ art: 'glaettung', glaettung: 'gedaempft' })), 'x', 150);
    expect(g).toContain("ets(y, model = 'AAN', damped = TRUE)"); expect(g).toContain('level = 95'); expect(g).toContain('Statable rechnet das ETS-Modell selbst');
    expect(prognoseRCode(pe(wahl(), { ets: ['ANA'], periode: [12] }), 'x', 150)).toContain("ets(y, model = 'ANA', damped = FALSE)");
    expect(g).not.toMatch(/library\s*\(/);
  });
  it('parameterNameGlaettung kennt φ', () => {
    expect(parameterNameGlaettung('phi')).toBe('φ (Dämpfung)');
  });
});
