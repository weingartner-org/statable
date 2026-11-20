import { describe, expect, it } from 'vitest';
import { s } from './sitzung.svelte';
import ERW from './testdaten/glaettung-erwartet.json';
import { prognoseLesen, type PrognoseAntwort, type PrognoseE, type PrognoseWahl } from './prognose';
import {
  neuModell, neuSperre, neuMindestLaenge, neuHorizont, neuCodeSatz, neuHilfeSatz, neuAufruf, neuLesen, neuHauptsatz, neuWarnungen, neuApa, neuTabellen, neuRCode, NEU_LABELS,
  type NeuE, type NeuModell, type NeuCode
} from './modellneu';
import { saetzeZeitreihe, tabellenZeitreihe, prognoseBehalten, zeitreiheErgebnis, type ZeitreiheE } from './zeitreiheblatt';

/* „Dieses Modell auf andere Daten anwenden“ (Fachblatt docs/fachblaetter/GLAETTUNG-SERIEN.md, Abschnitt 5): Sperren, Aufruf (Koeffizienten als Zahlen, nie Text), Antwort lesen, Warnungen (immer sichtbar),
 * Tabellen, R-Text (stats::arima hat kein model =) und alte Projektdateien. Die Rechnung selbst steht in engine/glaettung.webr.test.ts. */
s.einst.sprache = 'de'; s.einst.anrede = 'du';
const N = (ERW as unknown as { neue_daten: { y_alt: number[]; y_neu: number[]; b: number[]; namen: string[]; mittel: number[]; se: number[]; loglik: number; sigma2: number } }).neue_daten;
const modell = (o: Partial<NeuModell> = {}): NeuModell => ({ p: 0, d: 1, q: 1, P: 0, D: 1, Q: 1, konst: false, drift: false, log: true, periode: 12, namen: N.namen, b: N.b, ...o });
const w: PrognoseWahl = { art: 'arima', h: 12, log: true, p: 0, d: 1, q: 1, P: 0, D: 1, Q: 1, konst: false, glaettung: 'einfach' };
const hoch = N.mittel;   // Prognose in Originalwerten
const roh = (extra: Record<string, unknown> = {}): Record<string, unknown> => ({
  art: ['arima'], neu: [true], p: [0], d: [1], q: [1], P: [0], D: [1], Q: [1], periode: [12], konst: [false], drift: [false], log: [true], namen: N.namen, b: N.b, se: [], sigma2: [N.sigma2], loglik: [N.loglik], nobs: [131],
  mittel: hoch, u80: hoch.map(v => v * 0.9), o80: hoch.map(v => v * 1.1), u95: hoch.map(v => v * 0.85), o95: hoch.map(v => v * 1.15), angepasst: hoch, rmse: [12.3], mae: [9.1], mape: [3.4],
  ljung: { q: 26.45, h: 24, p: 0.233, fitdf: 0 }, acf_res: [0.1, -0.05], pruef: [], pr: [0], ...extra
});
const antwort = (extra: Record<string, unknown> = {}): PrognoseAntwort => { const l = neuLesen(roh(extra)); if (!l.ok) throw new Error('Lesen: ' + l.code); return l.antwort; };
const reihe = (y: (number | null)[], luecken = 0) => ({ spalte: 'neu', raster: 'monatlich' as const, periode: 12, erster: '1949-01-01', t: y.map((_, i) => i + 1), y, luecken });
const neu = (extra: Record<string, unknown> = {}, y: (number | null)[] = N.y_neu): NeuE => ({ von: 'alt', modell: modell(), reihe: reihe(y, y.filter(v => v === null).length), h: 12, antwort: antwort(extra) });

describe('Das Modell aus der Prognose', () => {
  it('ein geschätztes ARIMA-Modell: Ordnung, Konstante, Log und die festen Koeffizienten', () => {
    const l = prognoseLesen({ ...roh(), neu: undefined, aicc: [-483.2], aic: [-491], bic: [-483], tauglich: [true] });
    if (!l.ok) throw new Error('Lesen');
    const p: PrognoseE = { wahl: w, pr: 0, antwort: l.antwort };
    expect(neuModell(p)).toEqual(modell());
  });
  it('kein Modell aus einer Glättung, aus einer schon angewandten Antwort und bei fehlenden Koeffizienten', () => {
    expect(neuModell({ wahl: w, pr: 0, antwort: { ...antwort(), neu: false, art: 'glaettung' } })).toBeNull();
    expect(neuModell({ wahl: w, pr: 0, antwort: antwort() })).toBeNull();   // neu: true
    expect(neuModell({ wahl: w, pr: 0, antwort: { ...antwort(), neu: false, b: [NaN, 1] } })).toBeNull();
    expect(neuModell({ wahl: w, pr: 0, antwort: { ...antwort(), neu: false, namen: ['ma1'] } })).toBeNull();
  });
});

describe('Sperren', () => {
  const ok = Array.from({ length: 144 }, (_, i) => 100 + i);
  const r = (y: (number | null)[], o: Partial<{ raster: 'monatlich' | 'ungleich'; periode: number }> = {}) => ({ raster: 'monatlich' as const, periode: 12, y, ...o });
  it('eine passende Reihe geht', () => { expect(neuSperre(modell(), r(ok))).toBeNull(); });
  it('zu kurz für die Ordnung: T ≤ d + m D + p + m P + 1 (hier 14)', () => {
    expect(neuMindestLaenge(modell())).toBe(14);
    expect(neuSperre(modell(), r(ok.slice(0, 14)))).toBe('zu-kurz'); expect(neuSperre(modell(), r(ok.slice(0, 15)))).toBeNull();
    expect(neuMindestLaenge(modell({ P: 1, D: 0, Q: 0, d: 0, p: 2, periode: 4 }))).toBe(0 + 0 + 2 + 4 + 1);
    expect(neuMindestLaenge(modell({ P: 0, D: 0, Q: 0, d: 2, p: 3, periode: 12 }))).toBe(2 + 3 + 1);   // ohne Saisonteil zählt die Periode nicht
  });
  it('Log-Skala und Werte ≤ 0; ohne Log sind 0 und negative Werte erlaubt', () => {
    expect(neuSperre(modell(), r([...ok.slice(0, 50), 0, ...ok.slice(51)]))).toBe('log-nicht-positiv');
    expect(neuSperre(modell({ log: false }), r([...ok.slice(0, 50), 0, ...ok.slice(51)]))).toBeNull();
  });
  it('Lücken: bis 10 % wie bei „selbst wählen“, darüber nichts; ungleiche Abstände; alle Werte gleich', () => {
    expect(neuSperre(modell(), r([...ok.slice(0, 20), null, null, ...ok.slice(22)]))).toBeNull();
    expect(neuSperre(modell(), r(ok.map((v, i) => (i % 5 === 0 ? null : v))))).toBe('zu-viele-luecken');
    expect(neuSperre(modell(), r(ok, { raster: 'ungleich' }))).toBe('ungleich');
    expect(neuSperre(modell(), r(ok.map(() => 7)))).toBe('alle-gleich');
  });
  it('mit Saisonteil muss die Periode der neuen Reihe die des Modells sein; ohne Saisonteil nicht', () => {
    expect(neuSperre(modell(), r(ok, { periode: 4 }))).toBe('periode');
    expect(neuSperre(modell({ P: 0, D: 0, Q: 0, d: 1, q: 1 }), r(ok, { periode: 4 }))).toBeNull();
  });
  it('Horizont: wie bei der Prognose, nie über dem Höchsten der neuen Reihe', () => {
    expect(neuHorizont(12, 144, 12)).toBe(12); expect(neuHorizont(12, 30, 12)).toBe(7); expect(neuHorizont(0, 144, 12)).toBe(1);
  });
  it('zu jedem Code ein Satz; der Satz zur Periode nennt beide Perioden', () => {
    const codes: NeuCode[] = ['zu-viele-luecken', 'ungleich', 'alle-gleich', 'zu-kurz', 'periode', 'log-nicht-positiv', 'modell-passt-nicht', 'kein-modell', 'r-fehler'];
    for (const c of codes) expect(neuCodeSatz(c, { modell: 12, neu: 4 }).length, c).toBeGreaterThan(10);
    expect(neuCodeSatz('periode', { modell: 12, neu: 4 })).toBe('Das Modell hat einen Saisonteil mit der Periode 12, die neuen Daten haben die Periode 4. Dann passt das Modell nicht.');
    expect(neuHilfeSatz()).toContain('Nichts wird neu geschätzt');
  });
});

describe('Aufruf an R: Koeffizienten als Zahlen, die Reihe als Spalte', () => {
  it('alle Zahlen über rZahl/rGanz/rBool, nichts anderes; ohne Koeffizienten numeric(0)', () => {
    const c = neuAufruf(modell(), 12, 12).code;
    expect(c).toContain('sp_prognose_neu(d$y, 12L, 12L, TRUE, 0L, 1L, 1L, 0L, 1L, 1L, FALSE, c(-0.342360477806, -0.5405322001092))');
    expect(neuAufruf(modell({ b: [], namen: [], p: 0, q: 0, d: 1, P: 0, D: 0, Q: 0 }), 1, 3).code).toContain('numeric(0)');
  });
  it('keine endliche Zahl, kein Aufruf: Text und NaN in den Koeffizienten, eine Kommazahl als Ordnung', () => {
    expect(() => neuAufruf(modell({ b: ['1); system(\'x\')' as unknown as number, 2] }), 12, 12)).toThrow();
    expect(() => neuAufruf(modell({ b: [NaN, 1] }), 12, 12)).toThrow(); expect(() => neuAufruf(modell({ b: [Infinity, 1] }), 12, 12)).toThrow();
    expect(() => neuAufruf(modell({ p: 1.5 }), 12, 12)).toThrow(); expect(() => neuAufruf(modell(), 12, '5' as unknown as number)).toThrow();
  });
});

describe('Antwort lesen', () => {
  it('Prognose, σ², log-Likelihood, Ljung-Box; kein AICc, keine Standardfehler, kein Prüfzeitraum', () => {
    const a = antwort();
    expect(a.neu).toBe(true); expect(a.aicc).toBeNull(); expect(a.se).toEqual([]); expect(a.pruef).toBeNull(); expect(a.sigma2).toBeCloseTo(N.sigma2, 9); expect(a.loglik).toBeCloseTo(N.loglik, 6);
    expect(a.ljung).toEqual({ q: 26.45, h: 24, p: 0.233, fitdf: 0 }); expect(a.mittel.length).toBe(12);
  });
  it('Fehlerkennwörter von R werden zu Codes, unbekannte zu r-fehler; Müll wirft nie', () => {
    for (const c of ['zu-viele-luecken', 'ungleich', 'alle-gleich', 'zu-kurz', 'log-nicht-positiv', 'modell-passt-nicht', 'kein-modell']) expect(neuLesen({ fehler: [c] })).toEqual({ ok: false, code: c });
    expect(neuLesen({ fehler: ['Fehler in arima'] })).toEqual({ ok: false, code: 'r-fehler' });
    expect(neuLesen(null)).toEqual({ ok: false, code: 'r-fehler' }); expect(neuLesen('x')).toEqual({ ok: false, code: 'r-fehler' }); expect(neuLesen({ art: ['arima'] })).toEqual({ ok: false, code: 'r-fehler' });
  });
});

describe('Sätze und Warnungen', () => {
  const ein = { name: '„neu“', zeiten: Array.from({ length: 12 }, (_, i) => `M${i + 1}`), stellen: 0 };
  it('Hauptsatz: Modell, Quelle der Koeffizienten, ohne Neuschätzung; Prognose erste und letzte', () => {
    const t = neuHauptsatz(neu(), ein);
    expect(t).toContain('Das Modell ARIMA(0,1,1)(0,1,1)[12], Log-Skala, geschätzt an „alt“, wurde ohne Neuschätzung auf „neu“ angewandt.');
    expect(t).toContain('Streuung, Ljung-Box-Test und Prognose kommen von den neuen Daten.'); expect(t).toContain('Zuerst M1: 450'); expect(t).toContain('zuletzt M12:');
  });
  it('die zwei Warnungen stehen immer: nicht neu geschätzt, Veränderung nicht erkannt; Ljung-Box nur bei p < ,05', () => {
    const w1 = neuWarnungen(neu(), 144);
    expect(w1.map(x => x.code)).toEqual(['nicht-neu', 'veraenderung', 'log']);
    expect(w1[0]!.satz).toBe('Das Modell wurde nicht neu geschätzt. Das ist nur sinnvoll, wenn die neuen Daten dasselbe messen und sich das Muster nicht verändert hat.');
    expect(w1[1]!.satz).toBe('Eine Veränderung erkennt diese Rechnung nicht von selbst; der Ljung-Box-Test ist ein erster Hinweis.');
    const w2 = neuWarnungen(neu({ ljung: { q: 60, h: 24, p: 0.001, fitdf: 0 } }), 144);
    expect(w2.map(x => x.code)).toContain('ljung'); expect(w2.find(x => x.code === 'ljung')!.satz).toContain('Die Residuen hängen noch zusammen');
    const w3 = neuWarnungen(neu({ log: [false] }, [...N.y_neu.slice(0, 40), null, ...N.y_neu.slice(41)]), 144);
    expect(w3.map(x => x.code)).toEqual(['nicht-neu', 'veraenderung', 'luecken']);
    const w4 = neuWarnungen({ ...neu({ log: [false] }), modell: modell({ log: false }), antwort: { ...antwort({ log: [false] }) } }, 144);
    expect(w4.map(x => x.code)).toEqual(['nicht-neu', 'veraenderung']);
    const alle = w1.map(x => x.satz); expect(new Set(alle).size).toBe(alle.length);
  });
  it('die Sätze versprechen nichts: kein „bestätigt“, kein „gesichert“; ohne Beruhigung', () => {
    const t = [neuHauptsatz(neu(), ein), ...neuWarnungen(neu(), 144).map(x => x.satz)].join(' ');
    expect(t).not.toMatch(/bestätig|gesichert|sicher|verlässlich/i);
  });
  it('APA-Zeile: Modell, ohne Neuschätzung, σ², RMSE, Ljung-Box', () => {
    expect(neuApa(neu())).toMatch(/^ARIMA\(0,1,1\)\(0,1,1\)\[12\], Log-Skala \(ohne Neuschätzung\), σ² = 0,0014, RMSE = 12,30, Ljung-Box Q\(24\) = 26,45, df = 24, p = ,233$/);
  });
});

describe('Tabellen und R-Text', () => {
  it('Prognosetabelle mit Band, Modelltabelle mit festen Koeffizienten, σ², log-Likelihood, Ljung-Box; Fußnote: kein Standardfehler, kein AICc', () => {
    const t = neuTabellen(neu(), { name: '„neu“', zeiten: Array.from({ length: 12 }, (_, i) => `M${i + 1}`), stellen: 0 });
    expect(t.map(x => x.label)).toEqual([...NEU_LABELS]);
    const prog = t[0]!, mod = t[1]!;
    expect(prog.rows).toBe(13); expect(prog.cols).toBe(6); expect(prog.title!.t).toBe('Prognose „neu“ mit dem Modell von „alt“');
    expect(mod.cells.filter(c => c.c === 0 && c.r > 0).map(c => c.t)).toEqual(['MA 1 (ma1)', 'saisonales MA 1 (sma1)', 'σ²', 'log-Likelihood', 'RMSE', 'MAE', 'Ljung-Box Q(24)', 'Freiheitsgrade', 'p']);
    expect(mod.footnotes[0]!.t).toContain('keine Standardfehler und keinen AICc'); expect(mod.cells.map(c => c.t)).not.toContain('AICc');
    expect(mod.cells.find(c => c.r === 1 && c.c === 1)!.t).toBe('-0.3424');
  });
  it('R-Text: arima mit festen Koeffizienten, transform.pars = FALSE, unname; es gibt kein „model =“ (stats::arima kennt das nicht)', () => {
    const r = neuRCode(neu());
    expect(r).toContain('fixed = unname(b), transform.pars = FALSE'); expect(r).toContain('b <- c(ma1 = -0.342360477806, sma1 = -0.5405322001092)'); expect(r).toContain('y <- ts(daten$neu, frequency = 12)');
    expect(r).toContain('order = c(0, 1, 1), seasonal = list(order = c(0, 1, 1), period = 12)'); expect(r).toContain('exp(p$pred)'); expect(r).not.toMatch(/\bmodel\s*=/);
    const d = neuRCode({ ...neu(), modell: modell({ P: 0, D: 0, Q: 0, p: 1, d: 1, q: 0, drift: true, konst: true, log: false, namen: ['ar1', 'drift'], b: [0.3, 0.2] }), antwort: antwort({ drift: [true], log: [false] }) });
    expect(d).toContain('xreg = seq_along(y)'); expect(d).toContain('newxreg = 144 + seq_len(12)'); expect(d).not.toContain('seasonal');
  });
  it('R-Text: ein Spaltenname mit Anführungszeichen und Zeilenumbruch bricht nicht aus', () => {
    const r = neuRCode({ ...neu(), reihe: { ...reihe(N.y_neu), spalte: 'a`);system("x");#\nb' } });
    expect(r.split('\n').filter(z => /^system|^\);/.test(z))).toEqual([]);
    expect(r).toContain('daten$`');   // Name in Rückstrichen
  });
});

describe('im Blatt: Sätze, Tabellen, alte Projektdateien', () => {
  const sp = (name: string) => ({ name, bezeichnung: name, art: 'zahl' as const, niveau: 'metrisch' as const, format: 'F8.2', fehlend: [], fehlendText: '', werteLabels: {} });
  function blatt(): ZeitreiheE {
    s.spalten = [sp('v')]; s.zeilen = N.y_alt.map(v => [v]);
    const r = zeitreiheErgebnis('v', '', { periode: 12 });
    if (!r.ok) throw new Error('Reihe');
    return r.e;
  }
  it('ohne Klick steht nichts im Blatt; mit der Anwendung kommen Hauptsatz, Warnungen und APA in die Sätze und zwei Tabellen in den Bericht', () => {
    const e = blatt(), vorher = saetzeZeitreihe(e);
    expect(vorher.vorsicht).not.toContain('nicht neu geschätzt'); expect(tabellenZeitreihe(e).map(t => t.label)).not.toContain('Neue-Daten-Modell');
    const mit: ZeitreiheE = { ...e, neu: neu() }, nach = saetzeZeitreihe(mit);
    expect(nach.zusatz).toContain('ohne Neuschätzung auf'); expect(nach.zusatz).toContain('Ljung-Box'); expect(nach.vorsicht).toContain('Das Modell wurde nicht neu geschätzt.'); expect(nach.apa).toContain('ohne Neuschätzung');
    expect(tabellenZeitreihe(mit).map(t => t.label)).toEqual(expect.arrayContaining([...NEU_LABELS]));
  });
  it('beim Neurechnen des Blatts mit derselben Reihe bleibt die Anwendung; bei einer anderen Reihe fällt sie weg', () => {
    const e = blatt(), mit: ZeitreiheE = { ...e, neu: neu() };
    expect(prognoseBehalten(mit, { ...e }).neu).toBeDefined();
    expect(prognoseBehalten(mit, { ...e, y: e.y.map((v, i) => (i === 3 ? 1 : v)) }).neu).toBeUndefined();
  });
  it('eine Projektdatei von früher (ohne „neu“) lädt und rechnet Sätze wie vorher', () => {
    const e = blatt();
    expect(e.neu).toBeUndefined(); expect(() => saetzeZeitreihe(e)).not.toThrow(); expect(() => tabellenZeitreihe(e)).not.toThrow();
  });
});
