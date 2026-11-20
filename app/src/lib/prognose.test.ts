import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { s } from './sitzung.svelte';
import ERW from './testdaten/prognose-erwartet.json';
import {
  prognoseLesen, prognoseSperre, prognoseAutoErlaubt, horizontMax, horizontStandard, pruefzeitraumLaenge, prognoseWahlBereinigen, prognoseWahlGrund, prognoseStandardWahl, prognoseAufruf,
  prognoseLeitplanken, pruefzeitraumLuecke, prognoseModellName, prognoseModellText, parameterName, prognoseHauptsatz, prognoseApa, prognoseRCode, prognoseCodeSatz, glaettungGrund, logMoeglich, arimaSaisonMoeglich,
  type PrognoseAntwort, type PrognoseE, type PrognoseWahl, type LeitEin, type LeitCode, type PrognoseReihe
} from './prognose';
import { PROGNOSE_LABELS, prognoseTabellen } from './prognoseblatt';
import { isoVon, zeitreiheErgebnis, zeitreiheAuswertung, saetzeZeitreihe, tabellenZeitreihe, prognoseZeiten, prognoseBehalten, prognoseLogVorschlag, type ZeitreiheE } from './zeitreiheblatt';
import ABR from './testdaten/zeitreihen-abrunden-erwartet.json';
import {
  differenzenSaetze, differenzenLesen, differenzenAufruf, differenzenTabellen, periodogrammSperre, periodogrammLesen, periodogrammAufruf, periodogrammHauptsatz, periodogrammWarnungen, periodogrammTabellen, periodogrammCodeSatz, DIFFERENZEN_LABELS, PERIODOGRAMM_LABELS,
  type DifferenzenE
} from './zeitreihenabrunden';
import { leseCsv, planeSpalten, liesZeitpunkt, textAlsDatum } from './einlesen';

/* Prognose der Zeitreihen (Fachblatt docs/fachblaetter/PROGNOSE-ARIMA.md): alles, was ohne R prüfbar ist - Lesen der R-Antwort, Sperren, Regeln für Horizont und Prüfzeitraum,
 * Leitplanken je Zeile der Tabelle in Abschnitt 4, Monatsangaben (Abschnitt 5), Sätze und Tabellen, alte Projektdateien. Die Rechnung selbst steht in engine/prognose.webr.test.ts. */
s.einst.sprache = 'de'; s.einst.anrede = 'du';
const J = ERW as unknown as Record<string, { y: number[]; m: number; h: number; mittel: number[]; u80: number[]; o80: number[]; u95: number[]; o95: number[]; b: number[]; bn: string[]; aicc: number; se: number[] }>;
const AIR = J.air_log!;
const sp = (name: string, art: 'zahl' | 'datum') => ({ name, bezeichnung: name, art, niveau: 'metrisch' as const, format: art === 'datum' ? 'EDATE10' : 'F8.2', fehlend: [], fehlendText: '', werteLabels: {} });
const reihe = (y: (number | null)[], raster: PrognoseReihe['raster'] = 'monatlich', periode = 12): PrognoseReihe => ({ raster, periode, y });
const serie = (n: number) => Array.from({ length: n }, (_, i) => 100 + Math.sin(i / 3) * 10 + i);

/** Die Antwort von R, wie `rZuJson` sie liefert: Listen als Objekt, Vektoren als Arrays (auch Länge 1), benannte Vektoren als Objekt mit einzelnen Zahlen, NA als null. */
const roh = (extra: Record<string, unknown> = {}): Record<string, unknown> => ({
  art: ['arima'], p: [0], d: [1], q: [1], P: [0], D: [1], Q: [1], periode: [12], konst: [false], drift: [false], log: [true],
  namen: ['ma1', 'sma1'], b: AIR.b, se: AIR.se, sigma2: [0.001], loglik: [248.7], aic: [-491.4], aicc: [AIR.aicc], bic: [-483.2], nobs: [131], tauglich: [true],
  mittel: AIR.mittel, u80: AIR.u80, o80: AIR.o80, u95: AIR.u95, o95: AIR.o95, angepasst: AIR.mittel, rmse: [10.5], mae: [8.1], mape: [3.2],
  ljung: { q: 26.45, h: 24, p: 0.233, fitdf: 2 }, acf_res: [0.1, -0.05, 0.02], pruef: { rmse: 18.59, mae: 13.26, rmse_naiv: 50.71, mae_naiv: 47.83 }, pr: [12],
  wahl: { d: [1], D: [1], kpss: [0.537], staerke: [0.951], geprueft: [30], lp: [0, 2, 1], lq: [1, 1, 1], lP: [0, 0, 1], lQ: [1, 1, 1], lk: [false, false, false], la: [-483.21, -481.79, -481.5] },
  ...extra
});
const antwort = (extra: Record<string, unknown> = {}): PrognoseAntwort => { const l = prognoseLesen(roh(extra)); if (!l.ok) throw new Error('Lesen: ' + l.code); return l.antwort; };
const standardWahl = (o: Partial<PrognoseWahl> = {}): PrognoseWahl => ({ art: 'auto', h: 12, log: true, p: 0, d: 1, q: 1, P: 0, D: 1, Q: 1, konst: false, glaettung: 'einfach', ...o });
const pe = (o: Partial<PrognoseWahl> = {}, extra: Record<string, unknown> = {}): PrognoseE => ({ wahl: standardWahl(o), pr: 12, antwort: antwort(extra) });

describe('R-Antwort lesen', () => {
  it('ARIMA: alle Felder, Vektoren der Länge 1 wie benannte Einzelzahlen, NA als null', () => {
    const a = antwort();
    expect(a.art).toBe('arima'); expect([a.p, a.d, a.q, a.P, a.D, a.Q, a.periode]).toEqual([0, 1, 1, 0, 1, 1, 12]);
    expect(a.log).toBe(true); expect(a.konst).toBe(false); expect(a.drift).toBe(false); expect(a.namen).toEqual(['ma1', 'sma1']); expect(a.b.length).toBe(2);
    expect(a.mittel.length).toBe(12); expect(a.u95[0]).toBeLessThan(a.mittel[0]!); expect(a.aicc).toBeCloseTo(-483.21, 2); expect(a.tauglich).toBe(true);
    expect(a.ljung).toEqual({ q: 26.45, h: 24, p: 0.233, fitdf: 2 });
    expect(a.pruef).toEqual({ rmse: 18.59, mae: 13.26, rmseNaiv: 50.71, maeNaiv: 47.83, pr: 12 });
    expect(a.wahl!.liste.length).toBe(3); expect(a.wahl!.liste[1]).toEqual({ p: 2, q: 1, P: 0, Q: 1, konst: false, aicc: -481.79 }); expect(a.wahl!.staerke).toBeCloseTo(0.951, 3);
    const b = antwort({ mape: [null], ljung: { q: null, h: 24, p: null, fitdf: 2 }, pruef: [], pr: [0], wahl: { type: 'null' }, tauglich: [false] });
    expect(b.mape).toBeNull(); expect(b.ljung).toBeNull(); expect(b.pruef).toBeNull(); expect(b.wahl).toBeNull(); expect(b.tauglich).toBe(false);
  });
  it('Automatik ohne Saison: Saisonstärke −1 heißt „nicht bestimmt“', () => {
    expect(antwort({ wahl: { d: [1], D: [0], kpss: [0.2], staerke: [-1], geprueft: [12], lp: [1], lq: [1], lP: [0], lQ: [0], lk: [true], la: [100] } }).wahl!.staerke).toBeNull();
  });
  it('Glättung: α, β, γ, NA wo es sie nicht gibt', () => {
    const l = prognoseLesen({ art: ['glaettung'], glaettung: ['mult'], periode: [12], alpha: [0.2756], beta: [0.0327], gamma: [0.8707], mittel: [447.06, 420], u80: [1, 2], o80: [3, 4], u95: [0, 1], o95: [4, 5], rmse: [11], mae: [9], mape: [null], ljung: { q: 30, h: 24, p: 0.2, fitdf: 0 }, acf_res: [0.1], pruef: [], pr: [0] });
    if (!l.ok) throw new Error('Lesen'); expect(l.antwort.glaettung).toBe('mult'); expect([l.antwort.alpha, l.antwort.beta, l.antwort.gamma]).toEqual([0.2756, 0.0327, 0.8707]); expect(l.antwort.mape).toBeNull();
    const e = prognoseLesen({ art: ['glaettung'], glaettung: ['einfach'], periode: [1], alpha: [0.2466], beta: [null], gamma: [null], mittel: [805] });
    if (!e.ok) throw new Error('Lesen'); expect(e.antwort.beta).toBeNull(); expect(e.antwort.gamma).toBeNull(); expect(e.antwort.tauglich).toBe(true);
  });
  it('Fehlerkennwörter der R-Funktion werden zu Codes mit Satz; Unbekanntes und Kaputtes wird „r-fehler“ - nie ein Wurf', () => {
    for (const c of ['log-nicht-positiv', 'mult-nicht-positiv', 'zu-kurz-saison', 'kein-modell', 'nicht-konvergiert', 'r-fehler'] as const) {
      const l = prognoseLesen({ fehler: [c] }); expect(l.ok).toBe(false); if (!l.ok) { expect(l.code).toBe(c); expect(prognoseCodeSatz(c).length).toBeGreaterThan(15); }
    }
    for (const x of [{ fehler: 'subscript out of bounds' }, { fehler: ['non-stationary AR part'] }, null, undefined, 5, 'x', [], {}, { art: ['sonst'] }, { art: ['arima'], mittel: [] }, { art: ['arima'], mittel: [1, null] }, { type: 'null' }]) {
      const l = prognoseLesen(x); expect(l.ok, JSON.stringify(x)).toBe(false); if (!l.ok) expect(l.code).toBe('r-fehler');
    }
  });
});

describe('Sperren (Satz statt Knopf)', () => {
  it('mehr als 10 % Lücken, ungleiche Abstände, unter 20 Werte, alle gleich - in dieser Reihenfolge; bis 10 % Lücken frei', () => {
    expect(prognoseSperre(reihe(serie(60)))).toBeNull();
    expect(prognoseSperre(reihe(serie(20)))).toBeNull();
    expect(prognoseSperre(reihe(serie(19)))).toBe('zu-kurz');
    expect(prognoseSperre(reihe([...serie(30).slice(0, 10), null, ...serie(30).slice(11)]))).toBeNull();   // 1 Lücke: nur „selbst wählen“ (prognoseWahlGrund), keine Sperre
    expect(prognoseSperre(reihe(serie(30).map((v, i) => (i < 3 ? null : v))))).toBeNull();   // genau 10 %
    expect(prognoseSperre(reihe(serie(30).map((v, i) => (i < 4 ? null : v))))).toBe('zu-viele-luecken');   // 13 %
    expect(prognoseSperre(reihe(serie(22).map((v, i) => (i < 2 ? null : v))))).toBeNull();   // 20 vorhandene Werte
    expect(prognoseSperre(reihe(serie(21).map((v, i) => (i < 2 ? null : v))))).toBe('zu-kurz');   // nur 19 vorhandene Werte
    expect(prognoseSperre(reihe(serie(40), 'ungleich', 1))).toBe('ungleich');
    expect(prognoseSperre(reihe(Array(30).fill(7)))).toBe('alle-gleich');
    expect(prognoseSperre(reihe([...serie(10), null, null, null], 'ungleich'))).toBe('zu-viele-luecken');   // zu viele Lücken zuerst
    expect(prognoseSperre(reihe(serie(10), 'ungleich'))).toBe('ungleich');   // ungleich vor zu kurz
    expect(prognoseSperre(reihe(Array(10).fill(7)))).toBe('zu-kurz');   // zu kurz vor alle gleich
    for (const c of ['zu-viele-luecken', 'luecken-nur-selbst', 'ungleich', 'zu-kurz', 'alle-gleich'] as const) expect(prognoseCodeSatz(c)).toMatch(/\.$/);
  });
  it('Automatik bis 600 Werte, darüber nur „selbst wählen“ und Glättung (mit Satz)', () => {
    expect(prognoseAutoErlaubt(600)).toBe(true); expect(prognoseAutoErlaubt(601)).toBe(false);
    const r = reihe(serie(601), 'taeglich', 7);
    expect(prognoseWahlGrund(prognoseWahlBereinigen(prognoseStandardWahl(r, false), r), r)).toBeNull();   // Vorgabe weicht über 600 auf „ARIMA selbst wählen“ aus
    expect(prognoseStandardWahl(r, false).art).toBe('arima');
    expect(prognoseWahlGrund({ ...standardWahl(), art: 'auto' }, r)).toBe('auto-zu-lang'); expect(prognoseCodeSatz('auto-zu-lang')).toMatch(/600/);
    expect(prognoseWahlGrund({ ...standardWahl(), art: 'glaettung' }, r)).toBeNull();
  });
  it('Log nur bei Werten über 0; multiplikative Glättung ebenso; Saison der Glättung ab Periode 2 und T ≥ 2 m + 1', () => {
    const mitNull = reihe([0, ...serie(40)]);
    expect(logMoeglich(reihe(serie(30)))).toBe(true); expect(logMoeglich(mitNull)).toBe(false);
    expect(prognoseWahlGrund(standardWahl({ art: 'arima', log: true }), mitNull)).toBe('log-nicht-positiv');
    expect(prognoseWahlBereinigen(standardWahl({ art: 'arima', log: true }), mitNull).log).toBe(false);
    expect(glaettungGrund('mult', mitNull)).toBe('mult-nicht-positiv'); expect(glaettungGrund('add', mitNull)).toBeNull();
    expect(glaettungGrund('add', reihe(serie(24)))).toBe('saison-nicht-moeglich'); expect(glaettungGrund('add', reihe(serie(25)))).toBeNull();
    expect(glaettungGrund('add', reihe(serie(40), 'jaehrlich', 1))).toBe('saison-nicht-moeglich');
    expect(glaettungGrund('einfach', reihe(serie(25)))).toBeNull(); expect(glaettungGrund('holt', mitNull)).toBeNull();
  });
});

describe('Horizont und Prüfzeitraum', () => {
  it('Horizont: Vorgabe eine Periode bzw. 5, höchstens min(2 m, ⌊T/4⌋) bei Saison, sonst ⌊T/4⌋, mindestens 1', () => {
    expect([horizontStandard(144, 12), horizontMax(144, 12)]).toEqual([12, 24]);
    expect([horizontStandard(100, 1), horizontMax(100, 1)]).toEqual([5, 25]);
    expect([horizontStandard(20, 1), horizontMax(20, 1)]).toEqual([5, 5]);
    expect([horizontStandard(24, 12), horizontMax(24, 12)]).toEqual([6, 6]);   // ⌊24/4⌋ = 6 < 12
    expect(horizontMax(60, 12)).toBe(15); expect(horizontStandard(60, 12)).toBe(12);
    expect(horizontMax(3, 1)).toBe(1); expect(horizontMax(8, 4)).toBe(2); expect(horizontStandard(8, 4)).toBe(2);
    expect(horizontMax(200, 52)).toBe(50); expect(horizontMax(1000, 7)).toBe(14);
  });
  it('Prüfzeitraum: m > 1 und T ≥ 4 m: m; m = 1: min(5, ⌊T/5⌋); sonst 0', () => {
    expect(pruefzeitraumLaenge(144, 12)).toBe(12); expect(pruefzeitraumLaenge(48, 12)).toBe(12); expect(pruefzeitraumLaenge(47, 12)).toBe(0);
    expect(pruefzeitraumLaenge(100, 1)).toBe(5); expect(pruefzeitraumLaenge(20, 1)).toBe(4); expect(pruefzeitraumLaenge(22, 1)).toBe(4); expect(pruefzeitraumLaenge(25, 1)).toBe(5);
    expect(pruefzeitraumLaenge(30, 7)).toBe(7); expect(pruefzeitraumLaenge(27, 7)).toBe(0);
  });
  it('Wahl bereinigen: Grenzen der Ordnung, Saisonteil nur bei 2 ≤ m ≤ 24, Konstante nur bei d + D ≤ 1, Horizont 1 bis zum Höchsten', () => {
    const r12 = reihe(serie(144)), r1 = reihe(serie(144), 'jaehrlich', 1), r52 = reihe(serie(300), 'woechentlich', 52);
    const w = prognoseWahlBereinigen(standardWahl({ art: 'arima', p: 9, d: 5, q: -3, P: 7, D: 3, Q: 6, konst: true, h: 99 }), r12);
    expect([w.p, w.d, w.q, w.P, w.D, w.Q, w.h, w.konst]).toEqual([5, 2, 0, 5, 1, 5, 24, false]);
    const k = prognoseWahlBereinigen(standardWahl({ art: 'arima', d: 1, D: 0, konst: true }), r12); expect(k.konst).toBe(true);
    expect(prognoseWahlBereinigen(standardWahl({ art: 'arima', d: 1, D: 1, konst: true }), r12).konst).toBe(false);
    const o = prognoseWahlBereinigen(standardWahl({ art: 'arima', P: 2, D: 1, Q: 2, h: 0 }), r1); expect([o.P, o.D, o.Q, o.h]).toEqual([0, 0, 0, 1]);
    expect(prognoseWahlBereinigen(standardWahl({ art: 'arima', P: 1 }), r52).P).toBe(0); expect(arimaSaisonMoeglich(24)).toBe(true); expect(arimaSaisonMoeglich(25)).toBe(false); expect(arimaSaisonMoeglich(1)).toBe(false);
    expect(prognoseWahlBereinigen(standardWahl({ art: 'arima', p: NaN, h: NaN }), r12).p).toBe(0);
    expect(prognoseWahlGrund(standardWahl({ art: 'arima', P: 1 }), r52)).toBe('saison-nicht-moeglich');
    expect(prognoseWahlBereinigen(standardWahl({ art: 'glaettung', log: true }), r12).log).toBe(false);
  });
  it('Standardwahl: Log an, wenn die Zerlegung multiplikativ vorschlägt (und alle Werte über 0 liegen)', () => {
    const r = reihe(AIR.y);
    expect(prognoseStandardWahl(r, true)).toMatchObject({ art: 'auto', h: 12, log: true }); expect(prognoseStandardWahl(r, false).log).toBe(false);
    expect(prognoseStandardWahl(reihe([0, ...serie(40)]), true).log).toBe(false);
  });
});

describe('Aufruf an R', () => {
  it('nur feste Wörter und Zahlen; die Reihe steht als d$y, nie als Zahlenreihe im Code', () => {
    const a = prognoseAufruf(standardWahl({ art: 'arima', p: 1, d: 1, q: 2, P: 0, D: 1, Q: 1, konst: false, log: true }), 12, 12);
    expect(a.code).toBe("tryCatch(sp_prognose_arima(d$y, 12L, 12L, TRUE, FALSE, 1L, 1L, 2L, 0L, 1L, 1L, FALSE, 12L), error = function(e) list(fehler = conditionMessage(e)))");
    expect(a.args).toEqual({});
    const g = prognoseAufruf(standardWahl({ art: 'glaettung', glaettung: 'mult', h: 6 }), 12, 12);
    expect(g.code).toBe("tryCatch(sp_prognose_glaettung(d$y, 12L, 6L, 'mult', 12L), error = function(e) list(fehler = conditionMessage(e)))");
    const au = prognoseAufruf(standardWahl({ art: 'auto', p: 3, d: 2 }), 1, 0);
    expect(au.code).toContain('TRUE, TRUE, 0L, 0L, 0L, 0L, 0L, 0L, TRUE, 0L)');   // Automatik: die Ordnung der Person zählt nicht
  });
  it('Zahlen, die keine ganzen Zahlen sind, und unbekannte Glättungen werfen, statt als Text in den Code zu gelangen', () => {
    expect(() => prognoseAufruf(standardWahl({ h: 1.5 }), 12, 0)).toThrow();
    expect(() => prognoseAufruf(standardWahl({ h: NaN }), 12, 0)).toThrow();
    expect(() => prognoseAufruf(standardWahl({ art: 'arima', p: '1); system("x")' as unknown as number }), 12, 0)).toThrow();
    expect(() => prognoseAufruf(standardWahl({ art: 'arima', log: 'TRUE' as unknown as boolean }), 12, 0)).toThrow();
    expect(() => prognoseAufruf(standardWahl({ art: 'glaettung', glaettung: "einfach'); x; ('" as never }), 12, 0)).toThrow();
    expect(() => prognoseAufruf(standardWahl(), 12.5, 0)).toThrow();
  });
});

describe('Leitplanken: jede Zeile der Tabelle in Abschnitt 4 des Fachblatts', () => {
  const ein = (o: Partial<LeitEin> & { a?: Record<string, unknown> } = {}): LeitEin => ({ wahl: standardWahl({ art: 'arima' }), antwort: antwort(o.a), T: 144, periode: 12, alleWerteUeber0: true, ...(({ a, ...rest }) => rest)(o) });
  const codes = (e: LeitEin): LeitCode[] => prognoseLeitplanken(e).map(l => l.code);
  const satz = (e: LeitEin, c: LeitCode) => prognoseLeitplanken(e).find(l => l.code === c)?.satz ?? '';

  it('immer: die Vergangenheit wird fortgeschrieben - steht an erster Stelle', () => {
    const l = prognoseLeitplanken(ein());
    expect(l[0]!.code).toBe('immer'); expect(l[0]!.satz).toBe('Eine Prognose schreibt die Vergangenheit fort. Sie gilt nur, wenn die Bedingungen gleich bleiben.');
  });
  it('Automatik, immer: ein Vorschlag nach AICc - bei „selbst wählen“ nicht', () => {
    expect(codes(ein({ wahl: standardWahl({ art: 'auto' }) }))).toContain('auto'); expect(codes(ein())).not.toContain('auto');
    expect(satz(ein({ wahl: standardWahl({ art: 'auto' }) }), 'auto')).toBe('Das Modell ist ein Vorschlag nach AICc. Der kleinste Wert heißt nicht, dass das Modell richtig ist.');
  });
  it('Ljung-Box p < ,05: Residuen hängen zusammen, Intervalle unzuverlässig; bei p ≥ ,05 oder ohne Test nicht', () => {
    const schlecht = ein({ a: { ljung: { q: 40, h: 24, p: 0.0213, fitdf: 2 } } });
    expect(codes(schlecht)).toContain('ljung'); expect(satz(schlecht, 'ljung')).toMatch(/Residuen hängen noch zusammen/); expect(satz(schlecht, 'ljung')).toMatch(/unzuverlässig/); expect(satz(schlecht, 'ljung')).toContain('= ,021');
    expect(codes(ein({ a: { ljung: { q: 26, h: 24, p: 0.05, fitdf: 2 } } }))).not.toContain('ljung');
    expect(codes(ein())).not.toContain('ljung'); expect(codes(ein({ a: { ljung: { q: null, h: 24, p: null, fitdf: 2 } } }))).not.toContain('ljung');
  });
  it('Prüfzeitraum: RMSE des Modells gleich oder größer als der der einfachen Regel → kein Gewinn; besser → kein Satz', () => {
    const schlechter = ein({ a: { pruef: { rmse: 60, mae: 50, rmse_naiv: 50.71, mae_naiv: 47.83 } } });
    expect(codes(schlechter)).toContain('pruef-nicht-besser'); expect(satz(schlechter, 'pruef-nicht-besser')).toMatch(/nicht besser als die einfache Regel/); expect(satz(schlechter, 'pruef-nicht-besser')).toMatch(/kein Gewinn/);
    expect(codes(ein({ a: { pruef: { rmse: 50.71, mae: 1, rmse_naiv: 50.71, mae_naiv: 1 } } }))).toContain('pruef-nicht-besser');   // gleich zählt als nicht besser
    expect(codes(ein())).not.toContain('pruef-nicht-besser');
  });
  it('kein Prüfzeitraum möglich: die Güte der Prognose ist nicht geprüft', () => {
    const o = ein({ a: { pruef: [], pr: [0] } });
    expect(codes(o)).toContain('kein-pruefzeitraum'); expect(satz(o, 'kein-pruefzeitraum')).toMatch(/nicht geprüft/); expect(codes(ein())).not.toContain('kein-pruefzeitraum');
  });
  it('Automatik: nächstes Modell ΔAICc < 2 → mehrere Modelle etwa gleich gut; ab 2 nicht; nur bei Automatik', () => {
    const nah = ein({ wahl: standardWahl({ art: 'auto' }), a: { wahl: { ...(roh().wahl as object), la: [-483.21, -482.0] } } });
    expect(codes(nah)).toContain('aehnlich'); expect(satz(nah, 'aehnlich')).toMatch(/etwa gleich gut/);
    const weit = (la: number[]) => ein({ wahl: standardWahl({ art: 'auto' }), a: { wahl: { ...(roh().wahl as object), la } } });
    expect(codes(weit([-483.21, -481.21]))).not.toContain('aehnlich');   // genau 2: nicht kleiner als 2
    expect(codes(weit([-483.21, -481.22]))).toContain('aehnlich'); expect(codes(weit([-483.21, -470]))).not.toContain('aehnlich');
    expect(codes(weit([-483.21]))).not.toContain('aehnlich');   // nur ein Modell: nichts zu vergleichen
    expect(codes(ein({ a: { wahl: { ...(roh().wahl as object), la: [-483.21, -483.0] } } }))).not.toContain('aehnlich');   // von Hand gewählt: nicht gemeldet
  });
  it('T < 50: für ARIMA unsichere Modellwahl (Box & Jenkins, ohne Seitenzahl); ab 50 und bei Glättung nicht', () => {
    const kurz = ein({ T: 49 }); expect(codes(kurz)).toContain('kurz'); expect(satz(kurz, 'kurz')).toMatch(/Box & Jenkins/); expect(satz(kurz, 'kurz')).not.toMatch(/Seite|S\. \d|p\. \d/);
    expect(codes(ein({ T: 50 }))).not.toContain('kurz');
    expect(codes(ein({ T: 30, antwort: antwort({ art: ['glaettung'], glaettung: ['einfach'], periode: [1] }), wahl: standardWahl({ art: 'glaettung' }) }))).not.toContain('kurz');
  });
  it('m > 24 oder weniger als 3 volle Perioden: die Automatik berücksichtigt keine Saison (nur bei Automatik)', () => {
    const auto = standardWahl({ art: 'auto' });
    expect(codes(ein({ wahl: auto, periode: 52, T: 300 }))).toContain('keine-saison');
    expect(codes(ein({ wahl: auto, periode: 12, T: 35 }))).toContain('keine-saison');
    expect(satz(ein({ wahl: auto, periode: 12, T: 35 }), 'keine-saison')).toMatch(/weniger als 3 volle Perioden/);
    expect(codes(ein({ wahl: auto, periode: 12, T: 36 }))).not.toContain('keine-saison');
    expect(codes(ein({ wahl: auto, periode: 1, T: 30 }))).not.toContain('keine-saison');
    expect(codes(ein({ periode: 52, T: 300 }))).not.toContain('keine-saison');   // von Hand gewählt: gilt die Wahl
  });
  it('tauglich = false (von Hand): nahe an der Grenze zur Instabilität, AICc-Vergleich nicht verwenden', () => {
    const o = ein({ a: { tauglich: [false] } }); expect(codes(o)).toContain('nicht-tauglich'); expect(satz(o, 'nicht-tauglich')).toMatch(/Instabilität/);
    expect(codes(ein())).not.toContain('nicht-tauglich'); expect(codes(ein({ wahl: standardWahl({ art: 'auto' }), a: { tauglich: [false] } }))).not.toContain('nicht-tauglich');
  });
  it('Log: die Prognose ist ein Median, kein Mittelwert - ohne Log nicht', () => {
    const o = ein(); expect(codes(o)).toContain('log'); expect(satz(o, 'log')).toMatch(/Median, kein Mittelwert/);
    expect(codes(ein({ a: { log: [false] } }))).not.toContain('log');
  });
  it('untere Grenze unter 0 bei nur positiven Werten; bei Werten ≤ 0 oder mit nicht-negativer Grenze nicht', () => {
    const neg = ein({ a: { log: [false], u95: [-3, 1, 2], u80: [1, 2, 3] } }); expect(codes(neg)).toContain('untergrenze'); expect(satz(neg, 'untergrenze')).toMatch(/Untergrenze 0/);
    expect(codes(ein({ a: { log: [false], u95: [3, 1, 2], u80: [-1, 2, 3] } }))).toContain('untergrenze');   // auch die 80-%-Grenze zählt
    expect(codes(ein({ alleWerteUeber0: false, a: { log: [false], u95: [-3, 1, 2] } }))).not.toContain('untergrenze');
    expect(codes(ein({ a: { log: [false], u95: [3, 1, 2], u80: [4, 5, 6] } }))).not.toContain('untergrenze');
  });
  it('Holt-Winters (Glättung): die Intervalle von HoltWinters sind eine Näherung', () => {
    const gl = ein({ wahl: standardWahl({ art: 'glaettung' }), antwort: antwort({ art: ['glaettung'], glaettung: ['mult'], log: [false] }) });
    expect(codes(gl)).toContain('holt-winters'); expect(satz(gl, 'holt-winters')).toMatch(/Näherung/); expect(codes(ein())).not.toContain('holt-winters');
  });
  it('Reihenfolge wie in der Tabelle; keine Doppelungen; alle Sätze auch auf Englisch anders', () => {
    const alle = ein({ wahl: standardWahl({ art: 'auto' }), T: 30, periode: 12, a: { ljung: { q: 99, h: 24, p: 0.001, fitdf: 2 }, pruef: { rmse: 60, mae: 50, rmse_naiv: 50, mae_naiv: 40 }, wahl: { ...(roh().wahl as object), la: [-483.21, -482.5] }, u95: [-1, 2, 3] } });
    const c = codes(alle); expect(c).toEqual(['immer', 'auto', 'ljung', 'pruef-nicht-besser', 'aehnlich', 'kurz', 'keine-saison', 'log', 'untergrenze']);
    expect(new Set(c).size).toBe(c.length);
    const de = prognoseLeitplanken(alle).map(l => l.satz);
    s.einst.sprache = 'en'; try { const en = prognoseLeitplanken(alle).map(l => l.satz); en.forEach((t, i) => { expect(t).not.toBe(de[i]); expect(t).not.toMatch(/Prognose|Residuen|Modell/); }); } finally { s.einst.sprache = 'de'; }
  });
});

describe('Namen, Hauptsatz, APA und R-Text', () => {
  it('Modellname wie ARIMA(0,1,1)(0,1,1)[12]; ohne Saisonteil nur die Ordnung; Parameter auf Deutsch und Englisch', () => {
    expect(prognoseModellName({ p: 0, d: 1, q: 1, P: 0, D: 1, Q: 1, periode: 12 })).toBe('ARIMA(0,1,1)(0,1,1)[12]');
    expect(prognoseModellName({ p: 1, d: 1, q: 1, P: 0, D: 0, Q: 0, periode: 1 })).toBe('ARIMA(1,1,1)');
    expect(prognoseModellText(antwort())).toBe('ARIMA(0,1,1)(0,1,1)[12], Log-Skala');
    expect(prognoseModellText(antwort({ log: [false], drift: [true], konst: [true], D: [0], Q: [0] }))).toBe('ARIMA(0,1,1) mit Drift');
    expect(parameterName('intercept')).toBe('Mittelwert'); expect(parameterName('drift')).toBe('Drift'); expect(parameterName('ma1')).toBe('MA 1 (ma1)'); expect(parameterName('sma1')).toBe('saisonales MA 1 (sma1)'); expect(parameterName('ar2')).toBe('AR 2 (ar2)'); expect(parameterName('sar1')).toBe('saisonales AR 1 (sar1)');
    s.einst.sprache = 'en'; try { expect(parameterName('intercept')).toBe('Mean'); expect(parameterName('sma1')).toBe('seasonal MA 1 (sma1)'); } finally { s.einst.sprache = 'de'; }
  });
  it('Hauptsatz nennt Modell, erste und letzte Prognose mit 95-%-Intervall; Automatik und Hand unterscheiden sich', () => {
    const zeiten = Array.from({ length: 12 }, (_, i) => `t${i + 1}`);
    const a = prognoseHauptsatz(pe({ art: 'auto' }), { name: '„Passagiere“', zeiten, stellen: 0, automatik: true });
    expect(a).toContain('Die Automatik wählte'); expect(a).toContain('ARIMA(0,1,1)(0,1,1)[12]'); expect(a).toMatch(/t1: 450 \(95-%-Prognoseintervall \[419; 484\]\)/); expect(a).toMatch(/t12: 477/); expect(a).toContain('12 Zeitpunkte'); expect(a).toMatch(/Zuerst t1: 450.*zuletzt t12: 477/);
    const h = prognoseHauptsatz(pe({ art: 'arima' }), { name: '„Passagiere“', zeiten, stellen: 0, automatik: false });
    expect(h).toContain('wurde das Modell'); expect(h).not.toContain('Automatik');
  });
  it('APA-Zeile: Modell, AICc, RMSE, Ljung-Box mit df, Prüfzeitraum', () => {
    const t = prognoseApa(pe());
    expect(t).toContain('ARIMA(0,1,1)(0,1,1)[12]'); expect(t).toContain('AICc = −483,21'); expect(t).toContain('Ljung-Box Q(24) = 26,45, df = 22, p = ,233'); expect(t).toMatch(/Prüfzeitraum \(12\): RMSE 18,59 gegen 50,71/);
  });
  it('R-Text zum Ansehen: arima mit predict; Drift mit xreg; Glättung mit HoltWinters; gefährlicher Spaltenname nur maskiert', () => {
    const c = prognoseRCode(pe(), 'passagiere', 144);
    expect(c).toContain('y <- ts(daten$passagiere, frequency = 12)'); expect(c).toContain('fit <- arima(log(y), order = c(0, 1, 1), seasonal = list(order = c(0, 1, 1), period = 12))'); expect(c).toContain('predict(fit, n.ahead = 12)'); expect(c).toContain('exp(p$pred)');
    const dr = prognoseRCode(pe({ art: 'arima', d: 1, D: 0 }, { log: [false], drift: [true], konst: [true], D: [0], Q: [0], periode: [1] }), 'x', 100);
    expect(dr).toContain('xreg = seq_along(y)'); expect(dr).toContain('newxreg = 100 + seq_len(12)'); expect(dr).not.toContain('seasonal'); expect(dr).not.toContain('include.mean');
    const mt = prognoseRCode(pe({ art: 'arima' }, { log: [false], d: [0], D: [0], Q: [0], konst: [true], periode: [1] }), 'x', 100); expect(mt).toContain('include.mean = TRUE');
    const gl = prognoseRCode(pe({ art: 'glaettung' }, { art: ['glaettung'], glaettung: ['add'], periode: [12] }), 'x', 100); expect(gl).toContain("HoltWinters(y, seasonal = 'additive')");
    expect(prognoseRCode(pe({ art: 'glaettung' }, { art: ['glaettung'], glaettung: ['einfach'], periode: [1] }), 'x', 100)).toContain('HoltWinters(y, beta = FALSE, gamma = FALSE)');
    const boes = prognoseRCode(pe(), 'x`\nassign(".pwned", TRUE)\n#', 144);
    expect(boes).not.toMatch(/^assign/m); expect(boes).toContain('daten$`x\\`\\nassign(".pwned", TRUE)\\n#`');
  });
});

/** Eine Reihe wie in der Sitzung: Spalten und Zeilen mit Datum TT.MM.JJJJ. */
const laden = (datum: string[], wert: number[]) => { s.spalten = [sp('datum', 'datum'), sp('wert', 'zahl')] as never; s.zeilen = datum.map((d, i) => [d, wert[i]!]) as never; };
const monatsDaten = (n: number, j0 = 1949) => Array.from({ length: n }, (_, i) => `01.${String((i % 12) + 1).padStart(2, '0')}.${j0 + Math.floor(i / 12)}`);

describe('Monatsangaben (Abschnitt 5)', () => {
  it('1949-01 und 1949/01 gelten als Datum (Erster des Monats); Gegenbeispiele nicht', () => {
    expect(isoVon('1949-01')).toBe('1949-01-01'); expect(isoVon('1949/01')).toBe('1949-01-01'); expect(isoVon(' 1949-12 ')).toBe('1949-12-01'); expect(isoVon('2000/09')).toBe('2000-09-01');
    for (const nein of ['2024-13', '1949-1x', '1949-00', '1949-1', '49-01', '1949-001', '1949-01-', '1949/', '-1949-01', '19490-01', '1949_01', '1949 01']) expect(isoVon(nein), nein).toBeNull();
    expect(isoVon('2015-02-01')).toBe('2015-02-01'); expect(isoVon('01.02.2015')).toBe('2015-02-01');   // die bisherigen Formen bleiben
    expect(liesZeitpunkt('1949-01')).toEqual({ y: 1949, m: 1, d: 1, sek: null }); expect(liesZeitpunkt('1949/12')).toEqual({ y: 1949, m: 12, d: 1, sek: null });
    for (const nein of ['2024-13', '1949-1x', '1949-00']) expect(liesZeitpunkt(nein), nein).toBeNull();
    expect(textAlsDatum('1949-02')!.getFullYear()).toBe(1949); expect(textAlsDatum('1949-02')!.getMonth()).toBe(1); expect(textAlsDatum('1949-02')!.getDate()).toBe(1);
  });
  it('Spaltenart beim Einlesen: Monatsspalte wird Datum; Zahlen- und Textspalten kippen nicht', () => {
    const t = (kopf: string[], zeilen: string[][]) => planeSpalten({ kopf, zeilen, trenner: ',' } as never);
    const art = (werte: string[]) => t(['x'], werte.map(w => [w]))[0]!.art;
    expect(art(['1949-01', '1949-02', '1949-03'])).toBe('datum'); expect(art(['1949/01', '1949/02'])).toBe('datum');
    expect(art(['2024-13', '2024-01'])).not.toBe('datum'); expect(art(['1949-1x', '1949-01'])).toBe('text'); expect(art(['1949-01', 'abc'])).toBe('text');
    expect(art(['1949', '1950', '1951'])).toBe('zahl'); expect(art(['12', '7', '3.5'])).toBe('zahl'); expect(art(['2024-13', '2024-14'])).not.toBe('datum');
    expect(art(['2015-02-01', '2015-03-01'])).toBe('datum'); expect(art(['01.02.2015', '2.3.2015'])).toBe('datum');
    expect(art(['a', 'b'])).toBe('text'); expect(art(['1949-01', '2024-13', '1950-02'])).not.toBe('datum');
  });
  it('pruefdaten/prognose/fluggaeste-monat.csv: Raster monatlich, 144 Werte, Periode 12 - aus dem Einlesen bis zur Reihe', () => {
    const csv = readFileSync(join(import.meta.dirname, '../../../pruefdaten/prognose/fluggaeste-monat.csv'), 'utf8');
    const tab = leseCsv(csv), plan = planeSpalten(tab);
    expect(plan.map(p => p.art)).toEqual(['datum', 'zahl']); expect(tab.zeilen.length).toBe(144);
    const tt = (v: unknown) => { const d = textAlsDatum(v as string)!; return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`; };   // so schreibt die Engine das Datum in die Tabelle
    s.spalten = [sp('monat', 'datum'), sp('passagiere', 'zahl')] as never; s.zeilen = tab.zeilen.map(z => [tt(z[0]), Number(z[1])]) as never;
    const r = zeitreiheErgebnis('passagiere', 'monat'); if (!r.ok) throw new Error('kein Ergebnis');
    expect([r.e.raster, r.e.y.length, r.e.periode, r.e.luecken, r.e.erster, r.e.letzter]).toEqual(['monatlich', 144, 12, 0, '1949-01-01', '1960-12-01']);
    // und wenn die Spalte als Text „1949-01“ in der Sitzung stünde (Datei ohne Umweg über die Engine)
    s.zeilen = tab.zeilen.map(z => [String(z[0]), Number(z[1])]) as never;
    const r2 = zeitreiheErgebnis('passagiere', 'monat'); if (!r2.ok) throw new Error('kein Ergebnis'); expect([r2.e.raster, r2.e.y.length, r2.e.periode]).toEqual(['monatlich', 144, 12]);
    expect(r2.e.y).toEqual(r.e.y);
  });
  it('2024-13 in der Datumsspalte: die Zeile zählt als ungültig und bleibt unberücksichtigt (kein stilles Umdeuten)', () => {
    const d = monatsDaten(60).map(x => x.replace(/^01\./, '01.'));
    s.spalten = [sp('datum', 'datum'), sp('wert', 'zahl')] as never; s.zeilen = d.map((x, i) => [i === 5 ? '2024-13' : x, serie(60)[i]]) as never;
    const r = zeitreiheErgebnis('wert', 'datum'); if (!r.ok) throw new Error('kein Ergebnis'); expect(r.e.ausgeschlossen).toBe(1);
  });
});

describe('Sätze, Tabellen und Zeitpunkte am Blatt', () => {
  const air = () => { laden(monatsDaten(144), J.air!.y); const r = zeitreiheErgebnis('wert', 'datum'); if (!r.ok) throw new Error('kein Ergebnis'); return r.e; };
  it('Zeitpunkte der Prognose: h Plätze nach dem letzten Wert, beschriftet im Raster', () => {
    const e = air();
    expect(prognoseZeiten(e, 3)).toEqual(['Jänner 1961', 'Februar 1961', 'März 1961']); expect(prognoseZeiten(e, 12)[11]).toBe('Dezember 1961');
    const e2 = { ...e, raster: 'vierteljaehrlich' as const, erster: '2000-01-01', t: [1, 2, 3, 4, 5], y: [1, 2, 3, 4, 5] }; expect(prognoseZeiten(e2, 2)).toEqual(['Quartal 2 2001', 'Quartal 3 2001']);
    const e3 = { ...e, raster: 'jaehrlich' as const, erster: '1871-01-01', t: [1, 2, 3], y: [1, 2, 3] }; expect(prognoseZeiten(e3, 2)).toEqual(['1874', '1875']);
    const e4 = { ...e, raster: 'zeilen' as const, t: [1, 2, 3], y: [1, 2, 3] }; expect(prognoseZeiten(e4, 2)).toEqual(['4', '5']);
    const e5 = { ...e, raster: 'taeglich' as const, erster: '2024-02-27', t: [1, 2, 3], y: [1, 2, 3] }; expect(prognoseZeiten(e5, 3)).toEqual(['2024-03-01', '2024-03-02', '2024-03-03']);   // 2024 ist ein Schaltjahr
  });
  it('alte Projektdatei ohne prognose: alles wie bisher, kein Feld, keine Tabelle, kein Satz zur Prognose', () => {
    const neu = air(), json = JSON.parse(JSON.stringify(neu)); delete json.prognose; const alt = json as ZeitreiheE;
    expect('prognose' in alt).toBe(false);
    const a = zeitreiheAuswertung(alt); expect(a.trend).not.toBeNull();
    const t = tabellenZeitreihe(alt); expect(t.map(x => x.label).filter(l => PROGNOSE_LABELS.includes(l))).toEqual([]); expect(t.length).toBe(4);
    const sa = saetzeZeitreihe(alt, n => n); expect(sa.zusatz).not.toMatch(/Automatik|Prognose/); expect(sa.vorsicht).not.toContain('Eine Prognose schreibt die Vergangenheit fort');
    expect(prognoseBehalten(undefined, alt)).toBe(alt);
  });
  it('mit Prognose: Sätze (Hauptsatz, Ljung-Box, Prüfliste, APA) und die fünf Tabellen für Bericht und Export', () => {
    const e = { ...air(), prognose: pe({ art: 'auto' }) };
    const sa = saetzeZeitreihe(e, n => n);
    expect(sa.zusatz).toContain('Die Automatik wählte'); expect(sa.zusatz).toContain('Jänner 1961: 450'); expect(sa.zusatz).toContain('Dezember 1961: 477'); expect(sa.zusatz).toContain('Ljung-Box für die Residuen: Q(24) = 26,45, df = 22, p = ,233');
    expect(sa.vorsicht).toContain('Eine Prognose schreibt die Vergangenheit fort'); expect(sa.vorsicht).toContain('Vorschlag nach AICc'); expect(sa.vorsicht).toContain('Median, kein Mittelwert');
    expect(sa.apa).toContain('AICc = −483,21');
    const t = tabellenZeitreihe(e), l = t.map(x => x.label);
    expect(l.filter(x => PROGNOSE_LABELS.includes(x))).toEqual(['Prognose', 'Prognosemodell', 'Prognose-Gütemaße', 'Prognose-Automatik', 'Prognose-Prüfzeitraum']);
    const pt = t.find(x => x.label === 'Prognose')!;
    expect(pt.rows).toBe(13); expect(pt.cols).toBe(6);
    const z = (r: number, c: number) => pt.cells.find(x => x.r === r && x.c === c)?.t;
    expect([z(0, 0), z(0, 1), z(0, 2), z(0, 3), z(0, 4), z(0, 5)]).toEqual(['Zeitpunkt', 'Prognose', '80 % unten', '80 % oben', '95 % unten', '95 % oben']);
    expect([z(1, 0), z(1, 1), z(1, 4), z(1, 5)]).toEqual(['Jänner 1961', '450', '419', '484']); expect(z(12, 0)).toBe('Dezember 1961');
    const mt = t.find(x => x.label === 'Prognosemodell')!;
    expect(mt.cells.filter(c => c.c === 0).map(c => c.t)).toEqual(['', 'MA 1 (ma1)', 'saisonales MA 1 (sma1)']);
    const aut = t.find(x => x.label === 'Prognose-Automatik')!; expect(aut.rows).toBe(4); expect(aut.cells.find(c => c.r === 2 && c.c === 0)!.t).toBe('ARIMA(2,1,1)(0,1,1)[12]'); expect(aut.cells.find(c => c.r === 2 && c.c === 2)!.t).toBe('1.42');
    expect(t.find(x => x.label === 'Prognose-Prüfzeitraum')!.rows).toBe(3);
  });
  it('Glättung: Tabelle mit α, β, γ ohne Standardfehler; keine Automatik-Tabelle', () => {
    const e = { ...air(), prognose: pe({ art: 'glaettung' }, { art: ['glaettung'], glaettung: ['mult'], log: [false], alpha: [0.2756], beta: [0.0327], gamma: [0.8707], wahl: { type: 'null' }, aicc: [null], aic: [null], bic: [null], sigma2: [null] }) };
    const t = tabellenZeitreihe(e), l = t.map(x => x.label);
    expect(l).not.toContain('Prognose-Automatik'); const m = t.find(x => x.label === 'Prognosemodell')!;
    expect(m.cells.filter(c => c.c === 0).map(c => c.t)).toEqual(['', 'α (Niveau)', 'β (Trend)', 'γ (Saison)']);
    const g = t.find(x => x.label === 'Prognose-Gütemaße')!; expect(g.cells.filter(c => c.c === 0).map(c => c.t)).not.toContain('AICc');
  });
  it('prognoseBehalten: gleiche Reihe behält die Prognose, andere Reihe oder anderes Raster verliert sie', () => {
    const e = { ...air(), prognose: pe() }, neu = air();
    expect(prognoseBehalten(e, neu).prognose).toBe(e.prognose);
    expect(prognoseBehalten(e, { ...neu, periode: 4 }).prognose).toBeUndefined();
    expect(prognoseBehalten(e, { ...neu, raster: 'vierteljaehrlich' }).prognose).toBeUndefined();
    expect(prognoseBehalten(e, { ...neu, y: [...neu.y.slice(0, 143), 1] }).prognose).toBeUndefined();
    expect(prognoseBehalten(e, { ...neu, y: neu.y.slice(1) }).prognose).toBeUndefined();
  });
  it('Neuaufbau (Raster oder Periode) gibt eine Reihe ohne Prognose; die Log-Voreinstellung folgt dem Vorschlag der Zerlegung', () => {
    const e = air(), r = zeitreiheErgebnis('wert', 'datum', { raster: 'monatlich' }); if (!r.ok) throw new Error('kein Ergebnis'); expect(r.e.prognose).toBeUndefined();
    expect(prognoseLogVorschlag(zeitreiheAuswertung(e))).toBe(true);   // AirPassengers: Schwankung wächst mit dem Niveau
    laden(monatsDaten(60), serie(60).map((v, i) => 100 + 10 * Math.sin((i % 12) / 12 * 6.28) + (i % 3)));
    const r2 = zeitreiheErgebnis('wert', 'datum'); if (!r2.ok) throw new Error('kein Ergebnis'); expect(prognoseLogVorschlag(zeitreiheAuswertung(r2.e))).toBe(false);
    expect(prognoseLogVorschlag(zeitreiheAuswertung({ ...r2.e, periode: 1 }))).toBe(false);
  });
  it('Tabellen der Prognose ohne Saison (Nil): Zeitpunkte sind Jahre, Zahlen auf ganze Stellen bei großer Streuung', () => {
    laden(Array.from({ length: 100 }, (_, i) => `01.01.${1871 + i}`), J.nile!.y);
    const r = zeitreiheErgebnis('wert', 'datum'); if (!r.ok) throw new Error('kein Ergebnis'); expect(r.e.raster).toBe('jaehrlich');
    const n = J.nile!, p: PrognoseE = { wahl: standardWahl({ art: 'arima', h: 5, log: false, p: 1, d: 1, q: 1, D: 0, Q: 0 }), pr: 5, antwort: antwort({ log: [false], p: [1], d: [1], q: [1], P: [0], D: [0], Q: [0], periode: [1], namen: n.bn, b: n.b, se: n.se, mittel: n.mittel.slice(0, 5), u80: n.u80.slice(0, 5), o80: n.o80.slice(0, 5), u95: n.u95.slice(0, 5), o95: n.o95.slice(0, 5), wahl: { type: 'null' } }) };
    const t = prognoseTabellen(p, { name: 'Abfluss', zeiten: prognoseZeiten(r.e, 5), stellen: 0 });
    const pt = t.find(x => x.label === 'Prognose')!; expect(pt.cells.find(c => c.r === 1 && c.c === 0)!.t).toBe('1971'); expect(pt.cells.find(c => c.r === 1 && c.c === 1)!.t).toBe('816'); expect(pt.cells.find(c => c.r === 5 && c.c === 0)!.t).toBe('1975');
  });
});

describe('Reihen mit Lücken (Fachblatt ZEITREIHEN-ABRUNDEN, Abschnitt 4)', () => {
  const mitLuecken = reihe(serie(40).map((v, i) => (i === 10 ? null : v)));
  it('Mit Lücken geht nur „ARIMA selbst wählen“: Automatik und Glättung bekommen den Code luecken-nur-selbst mit Grund; die Vorgabe ist arima', () => {
    expect(prognoseStandardWahl(mitLuecken, false).art).toBe('arima'); expect(prognoseStandardWahl(reihe(serie(40)), false).art).toBe('auto');
    expect(prognoseWahlGrund(standardWahl({ art: 'auto' }), mitLuecken)).toBe('luecken-nur-selbst');
    expect(prognoseWahlGrund(standardWahl({ art: 'glaettung', glaettung: 'einfach' }), mitLuecken)).toBe('luecken-nur-selbst');
    expect(glaettungGrund('einfach', mitLuecken)).toBe('luecken-nur-selbst');
    expect(prognoseWahlGrund(standardWahl({ art: 'arima', log: false }), mitLuecken)).toBeNull();
    expect(prognoseCodeSatz('luecken-nur-selbst')).toMatch(/KPSS, STL und HoltWinters/); expect(prognoseCodeSatz('zu-viele-luecken')).toMatch(/10 %/);
    const l = prognoseLesen({ fehler: ['luecken-nur-selbst'] }); expect(l.ok).toBe(false); if (!l.ok) expect(l.code).toBe('luecken-nur-selbst');
  });
  it('Log-Prüfung und Bereinigung ignorieren Lücken (nur vorhandene Werte zählen)', () => {
    expect(logMoeglich(mitLuecken)).toBe(true);
    expect(prognoseWahlBereinigen(standardWahl({ art: 'arima', log: true }), mitLuecken).log).toBe(true);
  });
  it('Die Lückenstellen des Sollwerts stehen als null; Aufruf: die Reihe bleibt Spalte y, im Code nur Zahlen', () => {
    const L4 = (ABR as unknown as { luecken: { y: (number | null)[]; m: number }[] }).luecken;
    expect(L4.map(x => x.y.filter(v => v === null).length)).toEqual([6, 5, 3, 3]);
    L4.forEach(x => expect(prognoseSperre(reihe(x.y, x.m === 12 ? 'monatlich' : 'jaehrlich', x.m))).toBeNull());
    expect(prognoseAufruf(standardWahl({ art: 'arima', p: 1, d: 1, q: 1, D: 0, Q: 0, log: false }), 1, 5).code).toContain('sp_prognose_arima(d$y, 1L, 12L, FALSE, FALSE, 1L, 1L, 1L');
  });
  it('Prüfzeitraum mit Lücken: Air mit Lücke 130 im Vergleichsjahr entfällt, Nil mit Lücken früher bleibt', () => {
    const L4 = (ABR as unknown as { luecken: { name: string; y: (number | null)[]; m: number }[] }).luecken;
    expect(pruefzeitraumLuecke(L4[1]!.y, 12, 12)).toBe(true);
    expect(pruefzeitraumLuecke(L4[2]!.y, 1, 5)).toBe(false);
    const ohne = serie(40) as (number | null)[];
    expect(pruefzeitraumLuecke(ohne, 1, 5)).toBe(false);
    expect(pruefzeitraumLuecke(ohne.map((v, i) => (i === 37 ? null : v)), 1, 5)).toBe(true);   // im Prüfzeitraum
    expect(pruefzeitraumLuecke(ohne.map((v, i) => (i === 34 ? null : v)), 1, 5)).toBe(true);   // der letzte Wert davor ist die Vergleichszahl
    expect(pruefzeitraumLuecke(ohne.map((v, i) => (i === 20 ? null : v)), 1, 5)).toBe(false);
    expect(pruefzeitraumLuecke(ohne, 4, 0)).toBe(false);
  });
  const ein = (o: Partial<LeitEin> = {}): LeitEin => ({ wahl: standardWahl({ art: 'arima' }), antwort: antwort(), T: 144, periode: 12, alleWerteUeber0: true, ...o });
  const codes = (e: LeitEin): LeitCode[] => prognoseLeitplanken(e).map(l => l.code);
  it('Leitplanke luecken: immer bei Lücken, mit k und T; Leitplanke pruef-luecke statt kein-pruefzeitraum', () => {
    expect(codes(ein())).not.toContain('luecken');
    const l = prognoseLeitplanken(ein({ luecken: 5 })).find(x => x.code === 'luecken')!.satz;
    expect(l).toMatch(/5 Lücken von 144 Zeitpunkten/); expect(l).toMatch(/füllt nichts auf/); expect(l).toMatch(/nicht zufällig/);
    expect(prognoseLeitplanken(ein({ luecken: 1 })).find(x => x.code === 'luecken')!.satz).toMatch(/1 Lücke von/);
    const ohnePruef = antwort({ pruef: [], pr: [0] });
    const a = codes(ein({ antwort: ohnePruef, luecken: 5, pruefLuecke: true }));
    expect(a).toContain('pruef-luecke'); expect(a).not.toContain('kein-pruefzeitraum');
    expect(prognoseLeitplanken(ein({ antwort: ohnePruef, pruefLuecke: true })).find(x => x.code === 'pruef-luecke')!.satz).toMatch(/Im Prüfzeitraum oder in den Vergleichswerten fehlen Werte; die Güte der Prognose ist nicht geprüft\./);
    expect(codes(ein({ antwort: ohnePruef }))).toContain('kein-pruefzeitraum');
    expect(codes(ein({ pruefLuecke: true }))).not.toContain('pruef-luecke');   // mit Prüfzeitraum keine Meldung
  });
  it('R-Text zum Ansehen: bei Lücken der Hinweis auf NA, sonst nicht', () => {
    const p = pe({ art: 'arima' });
    expect(prognoseRCode(p, 'y', 144, 3)).toMatch(/# y muss an den fehlenden Zeitpunkten NA enthalten/); expect(prognoseRCode(p, 'y', 144)).not.toMatch(/NA enthalten/);
  });
  it('Sollwerte aus R: Ljung-Box mit Lücken zählt nur vorhandene Residuen (Q(24), df 22, n 139)', () => {
    const lj = (ABR as unknown as { ljung_luecken: { q: number; h: number; fitdf: number; p: number; n: number } }).ljung_luecken;
    expect(lj.h - lj.fitdf).toBe(22); expect(lj.n).toBe(139); expect(lj.q).toBeCloseTo(22.208, 3);
  });
});

describe('Differenzen prüfen (Fachblatt ZEITREIHEN-ABRUNDEN, Abschnitt 2): Sätze nach den Sollwerten', () => {
  type P = { name: string; m: number; log: boolean; d: number; D: number; y: number[]; n: number; lags: number; grenze: number; acf: number[]; pacf: number[]; kpss: number; sd: number; r1: number };
  const P = (ABR as unknown as { pruefung: P[] }).pruefung;
  const hole = (name: string) => P.find(x => x.name === name)!;
  /** Eine DifferenzenE wie aus R: Zeile für d = 0, 1, 2 aus den Sollwerten (wo es sie gibt), sonst null. */
  const von = (name: string, staerke: number | null = null, luecken = false): DifferenzenE => {
    const x = hole(name), z = (f: 'kpss' | 'sd' | 'r1') => [0, 1, 2].map(d => { const q = P.find(w => w.name.startsWith(name.replace(/_\d\d$/, '_')) && w.d === d && w.D === x.D); return q ? q[f] : null; });
    return { d: x.d, D: x.D, log: x.log, periode: x.m, luecken, antwort: { kpss: z('kpss'), sd: z('sd'), r1: z('r1'), nZeile: [x.n, x.n, x.n], n: x.n, lags: x.lags, grenze: x.grenze, acf: x.acf, pacf: x.pacf, staerke } };
  };
  const codes = (p: DifferenzenE) => differenzenSaetze(p).map(s => s.code);
  it('Nil: d = 2 schlägt an (r1 unter -0,5 und höhere Streuung), d = 1 nicht', () => {
    expect(codes(von('nile_20'))).toEqual(['immer', 'r1', 'streuung']);
    expect(codes(von('nile_10'))).toEqual(['immer']);
    expect(differenzenSaetze(von('nile_20')).find(s => s.code === 'r1')!.satz).toMatch(/unter -0,5/);
  });
  it('log Air: d = 2 schlägt bei der Streuung an; d = 1, D = 1 nicht; d = 0 ist nicht stationär (KPSS 4,5409 gegen 0,463) und bei hoher Saisonstärke ruft die Automatik D = 1', () => {
    expect(codes(von('air_log_20'))).toEqual(['immer', 'streuung']);
    expect(codes(von('air_log_11', 0.95))).toEqual(['immer']);   // D = 1 schon gewählt: kein Saisonsatz
    const c = von('air_log_00', 0.951);
    expect(codes(c)).toEqual(['immer', 'kpss', 'saison']);
    expect(differenzenSaetze(c).find(s => s.code === 'kpss')!.satz).toContain('KPSS 4,541, Grenze 0,463');
    expect(differenzenSaetze(c).find(s => s.code === 'saison')!.satz).toMatch(/D = 1/);
    expect(codes(von('air_log_10', 0.5))).toEqual(['immer']);   // Saisonstärke unter 0,64
    expect(codes(von('lh_00'))).toEqual(['immer']);   // KPSS 0,3679 unter der Grenze
  });
  it('Lücken: der Satz sagt, dass KPSS und Saisonstärke nicht gerechnet werden; nie ein p-Wert für KPSS', () => {
    const p = { ...von('nile_10'), luecken: true, antwort: { ...von('nile_10').antwort, kpss: [null, null, null] } };
    expect(codes(p)).toEqual(['immer', 'luecken']);
    for (const s of differenzenSaetze(von('air_log_00', 0.951))) expect(s.satz).not.toMatch(/\bp\b|p-Wert/);
  });
  it('Tabellen und Aufruf: 3 Zeilen für d = 0, 1, 2; Korrelogramm-Tabelle; im Aufruf nur Zahlen und Wahrheitswerte', () => {
    const t = differenzenTabellen(von('air_log_11', 0.95), 'Passagiere');
    expect(t.map(x => x.label)).toEqual([...DIFFERENZEN_LABELS]);
    expect(t[0]!.cells.filter(c => c.c === 0 && c.r > 0).map(c => c.t)).toEqual(['0', '1', '2']);
    expect(t[1]!.cells.filter(c => c.c === 0 && c.r > 0).length).toBe(24);
    expect(differenzenAufruf(12, true, 1, 1).code).toBe("tryCatch(sp_prog_differenzen(d$y, 12L, TRUE, 1L, 1L), error = function(e) list(fehler = conditionMessage(e)))");
    expect(() => differenzenAufruf(12, 'TRUE' as unknown as boolean, 1, 1)).toThrow(); expect(() => differenzenAufruf(12, true, 1.5, 1)).toThrow();
  });
  it('Antwort von R lesen: NA als null, PACF verworfen bei Betrag ab 1; Kaputtes wird r-fehler', () => {
    const roh = { d: [0, 1, 2], kpss: [4.5, 0.02, null], sd: [1, 2, 3], r1: [0.9, 0.2, -0.3], n_zeile: [144, 143, 142], n: [143], lags: [24], grenze: [0.16], acf: [0.2, 0.1], pacf: [0.2, 0.1], staerke: [null] };
    const l = differenzenLesen(roh); expect(l.ok).toBe(true);
    if (l.ok) { expect(l.antwort.kpss).toEqual([4.5, 0.02, null]); expect(l.antwort.staerke).toBeNull(); expect(l.antwort.pacf).toEqual([0.2, 0.1]); }
    const l2 = differenzenLesen({ ...roh, pacf: [0.2, 1] }); expect(l2.ok && l2.antwort.pacf).toBeNull();
    for (const x of [null, 5, {}, { fehler: ['r-fehler'] }, { ...roh, acf: [NaN] }]) { const r = differenzenLesen(x); expect(r.ok, JSON.stringify(x)).toBe(false); }
    const lg = differenzenLesen({ fehler: ['log-nicht-positiv'] }); expect(!lg.ok && lg.code).toBe('log-nicht-positiv');
  });
});

describe('Periodogramm (Fachblatt ZEITREIHEN-ABRUNDEN, Abschnitt 3): Sperren, Sätze, Tabelle', () => {
  type Pg = { name: string; n: number; freq: number[]; spec: number[]; spitzen_periode: number[]; spitzen_anteil: number[] };
  const PG = (ABR as unknown as { periodogramm: Pg[] }).periodogramm;
  /** Die Antwort wie aus R (Spitzenindex aus den Sollfrequenzen: Periode = 1/Frequenz). */
  const roh = (x: Pg) => ({ n: [x.n], freq: x.freq, spec: x.spec, spitzen_periode: x.spitzen_periode, spitzen_anteil: x.spitzen_anteil, spitzen_index: x.spitzen_periode.map(p => x.freq.findIndex(f => Math.abs(1 / f - p) < 1e-9) + 1) });
  it('Sperren: Lücken, ungleiche Abstände, unter 20 Werte, alle gleich; sonst frei - nichts wird aufgefüllt', () => {
    expect(periodogrammSperre(reihe(serie(40)))).toBeNull(); expect(periodogrammSperre(reihe(serie(20)))).toBeNull();
    expect(periodogrammSperre(reihe(serie(19)))).toBe('zu-kurz');
    expect(periodogrammSperre(reihe(serie(40).map((v, i) => (i === 3 ? null : v))))).toBe('luecken');
    expect(periodogrammSperre(reihe(serie(40), 'ungleich', 1))).toBe('ungleich');
    expect(periodogrammSperre(reihe(Array(30).fill(2)))).toBe('alle-gleich');
    for (const c of ['luecken', 'ungleich', 'zu-kurz', 'alle-gleich', 'r-fehler'] as const) expect(periodogrammCodeSatz(c)).toMatch(/\.$/);
  });
  it('Lesen und Anzeige: Perioden und Anteile der vier Sollreihen, Hauptsatz, Tabelle, drei Warnungen', () => {
    const erste = ['12,0', '9,5', '17,1', '14,3'];
    PG.forEach((x, i) => {
      const l = periodogrammLesen(roh(x)); expect(l.ok, x.name).toBe(true); if (!l.ok) return;
      expect(l.antwort.spitzen.map(s => s.periode)).toEqual(x.spitzen_periode); expect(l.antwort.spitzen.length).toBe(3);
      const p = { antwort: l.antwort };
      expect(periodogrammHauptsatz(p), x.name).toContain(`Periode von ${erste[i]} Zeitpunkten`);
      const t = periodogrammTabellen(p, 'Reihe'); expect(t[0]!.label).toBe(PERIODOGRAMM_LABELS[0]);
      expect(t[0]!.cells.filter(c => c.c === 0 && c.r > 0).length).toBe(3);
    });
    const nil = periodogrammLesen(roh(PG[3]!)); if (nil.ok) expect(periodogrammHauptsatz({ antwort: nil.antwort })).toMatch(/6,3 %/);   // Nil: rund 6 %, kein Nachweis
    const w = periodogrammWarnungen(); expect(w.map(x => x.code)).toEqual(['nachweis', 'aufloesung', 'glaubhaft']);
    expect(w[0]!.satz).toMatch(/kein Nachweis/); expect(w[1]!.satz).toMatch(/17,1/); expect(w[2]!.satz).toMatch(/Korrelogramm/);
  });
  it('Aufruf und kaputte Antworten', () => {
    expect(periodogrammAufruf().code).toBe('tryCatch(sp_periodogramm(d$y), error = function(e) list(fehler = conditionMessage(e)))');
    for (const x of [null, 3, {}, { n: [3], freq: [], spec: [] }, { n: [3], freq: [0.1], spec: [NaN], spitzen_periode: [], spitzen_anteil: [], spitzen_index: [] }]) expect(periodogrammLesen(x).ok, JSON.stringify(x)).toBe(false);
    const f = periodogrammLesen({ fehler: ['luecken'] }); expect(!f.ok && f.code).toBe('luecken');
    const g = periodogrammLesen({ fehler: ['sonst'] }); expect(!g.ok && g.code).toBe('r-fehler');
    const k = periodogrammLesen({ n: [30], freq: [0.1, 0.2], spec: [1, 2], spitzen_periode: [], spitzen_anteil: [], spitzen_index: [] }); expect(k.ok && periodogrammHauptsatz({ antwort: k.antwort })).toMatch(/keine Spitze/);
  });
});
