import { describe, expect, it, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { s, type Blatt } from './sitzung.svelte';
import { metaDaten, metaEinfuegen, metaLesen, metaPruefung, metaRCode, metaTicks, parseZahl, rueck, type Meta, type MetaEingabe, type MetaEntwurf } from './metaanalyse';
import { saetzeMeta, tabellenMeta, metaApa, groessenWort, i2Wort, piIntHout } from './metasaetze';
import { berichtTabellen, excelTabellen, berichtSatz, gerechneteN, stichprobenText } from './berichtsatz';
import { rechenZusatz } from './eigenercode';
import { VERFAHREN } from './verfahren';
import { rFehlerText } from './rverfahren.svelte';

/* Zahlen: R am Mac (R 4.6.1, metafor 5.2-1), scripts/metaanalyse-erwartet.R. Die Referenz ruft metafor direkt auf (rma, confint, predict, regtest), ohne engine/statable.R.
 * Daten: metadat::dat.bcg (13 Studien, log-Risikoverhältnis, escalc "RR"), dat.normand1999 (9 Studien, Hedges g, escalc "SMD"), dat.molloy2014 (16 Studien, r und n, escalc "ZCOR").
 * Die Rohantworten von sp_meta() liegen in testdaten/meta-r.json (so, wie sie aus webR ankommen: jeder Wert ein Vektor). */
const roh = JSON.parse(readFileSync(join(import.meta.dirname, 'testdaten/meta-r.json'), 'utf8')) as Record<string, Record<string, unknown>>;
const REF = {
  bcg: { k: 13, est: -0.7145323483651, se: 0.1797815317804, ci_lb: -1.06689767574, ci_ub: -0.3621670209901, stat: -3.974447994125, p: 7.054267348521e-05, pi_lb: -1.866692346607, pi_ub: 0.4376276498769, tau2: 0.3132433259809, tau2_lo: 0.1196953128166, tau2_hi: 1.111486262215, tau: 0.5596814504528, i2: 92.221386074966, i2_lo: 81.917722721505, i2_hi: 97.678089605069, h2: 12.855760803112, q: 152.233008082373, q_p: 1.996764590846e-26, egger_stat: -1.401282002289, egger_p: 0.188706995082, egger_df: 11 },
  bcg_kh: { se: 0.1807917455191, ci_lb: -1.108443723, ci_ub: -0.3206209737302, stat: -3.952239889678, p: 0.001920015085134, pi_lb: -1.996016967022, pi_ub: 0.5669522702921, ddf: 12 },
  normand: { k: 9, est: -0.5371082585668, se: 0.3086614915982, ci_lb: -1.142073665514, ci_ub: 0.06785714838005, stat: -1.740120725089, p: 0.08183782180716, pi_lb: -2.382094344814, pi_ub: 1.307877827681, tau2: 0.7908429210485, tau2_lo: 0.3253884021724, tau2_hi: 3.108403351203, i2: 95.49493711312, q: 123.729274359725, q_p: 5.622513232024e-23, egger_stat: -0.4994886045247, egger_p: 0.6327493824499, egger_df: 7 },
  molloy: { k: 16, est: 0.1499179884249, se: 0.03156103310824, ci_lb: 0.08805950021786, ci_ub: 0.2117764766319, stat: 4.750097625472, p: 2.033184696749e-06, pi_lb: -0.03711847469311, pi_ub: 0.3369544515429, tau2: 0.008110503698384, i2: 61.732401200736, i2_lo: 25.279896072621, i2_hi: 88.25452539628, q: 38.159515423616, q_p: 0.0008545849759734, egger_stat: 1.34503442705, egger_p: 0.1999987233297, egger_df: 14, r: 0.1488048389995, r_lb: 0.08783258561873, r_ub: 0.2086662540116 }
};
const BCG_4 = [[4, 119, 11, 128], [6, 300, 29, 274], [3, 228, 11, 209], [62, 13536, 248, 12619], [33, 5036, 47, 5761], [180, 1361, 372, 1079], [8, 2537, 10, 619], [505, 87886, 499, 87892], [29, 7470, 45, 7232], [17, 1699, 65, 1600], [186, 50448, 141, 27197], [5, 2493, 3, 2338], [27, 16886, 29, 17825]];
const nah = (ist: number, soll: number, tol = 1e-9) => expect(Math.abs(ist - soll) / Math.max(Math.abs(soll), 1e-9), `${ist} gegen ${soll}`).toBeLessThan(tol);

const ein = (art: 'es' | 'smd' | 'r', n: number, extra: Partial<MetaEingabe> = {}): MetaEingabe => ({ art, massName: '', verhaeltnis: false, kh: false, namen: Array.from({ length: n }, (_, i) => `S${i + 1}`), zeilen: [], ...extra });
const bcg = (kh = false) => metaLesen(roh[kh ? 'bcg_kh' : 'bcg']!, ein('es', 13, { verhaeltnis: true, massName: 'RR', kh }));
const normand = () => metaLesen(roh.normand!, ein('smd', 9));
const molloy = () => metaLesen(roh.molloy!, ein('r', 16));
beforeEach(() => { s.einst.sprache = 'de'; s.einst.zahl = 'komma'; });

describe('Zahlen gegen R (metafor)', () => {
  it('BCG: log-Risikoverhältnis, REML - Effekt, Heterogenität, Prädiktionsintervall, Egger', () => {
    const m = bcg(), r = REF.bcg;
    expect(m.k).toBe(13);
    for (const [a, b] of [['est', 'est'], ['se', 'se'], ['lo', 'ci_lb'], ['hi', 'ci_ub'], ['stat', 'stat'], ['p', 'p'], ['pLo', 'pi_lb'], ['pHi', 'pi_ub'], ['tau2', 'tau2'], ['tau2Lo', 'tau2_lo'], ['tau2Hi', 'tau2_hi'], ['tau', 'tau'], ['i2', 'i2'], ['i2Lo', 'i2_lo'], ['i2Hi', 'i2_hi'], ['h2', 'h2'], ['q', 'q'], ['qP', 'q_p'], ['eggerStat', 'egger_stat'], ['eggerP', 'egger_p'], ['eggerDf', 'egger_df']] as const)
      nah(m[a] as number, r[b], 1e-9);
    expect(m.qDf).toBe(12);
    expect(m.statDf).toBeNull();
    expect(m.studien.length).toBe(13);
    expect(m.studien.reduce((a, x) => a + x.gewicht, 0)).toBeCloseTo(100, 6);
    // zurückgerechnet: exp(-0,7145) = 0,489 (Risikoverhältnis)
    nah(rueck(m)(m.est), Math.exp(REF.bcg.est), 1e-12);
  });
  it('BCG mit Knapp-Hartung: t-Test mit k − 1 Freiheitsgraden, breitere Intervalle', () => {
    const m = bcg(true), r = REF.bcg_kh;
    nah(m.se, r.se); nah(m.lo, r.ci_lb); nah(m.hi, r.ci_ub); nah(m.stat, r.stat); nah(m.p, r.p); nah(m.pLo, r.pi_lb); nah(m.pHi, r.pi_ub);
    expect(m.statDf).toBe(r.ddf);
    expect(m.hi - m.lo).toBeGreaterThan(bcg().hi - bcg().lo);
  });
  it('Normand 1999: Hedges g aus M, SD, n (escalc SMD)', () => {
    const m = normand(), r = REF.normand;
    for (const [a, b] of [['est', 'est'], ['se', 'se'], ['lo', 'ci_lb'], ['hi', 'ci_ub'], ['stat', 'stat'], ['p', 'p'], ['pLo', 'pi_lb'], ['pHi', 'pi_ub'], ['tau2', 'tau2'], ['tau2Lo', 'tau2_lo'], ['tau2Hi', 'tau2_hi'], ['i2', 'i2'], ['q', 'q'], ['qP', 'q_p'], ['eggerStat', 'egger_stat'], ['eggerP', 'egger_p']] as const)
      nah(m[a] as number, r[b], 1e-9);
    expect(m.k).toBe(9); expect(m.eggerDf).toBe(7);
  });
  it('Molloy 2014: Korrelationen über Fisher z, zurück nach r', () => {
    const m = molloy(), r = REF.molloy, f = rueck(m);
    nah(m.est, r.est); nah(m.stat, r.stat); nah(m.p, r.p, 1e-8); nah(m.tau2, r.tau2); nah(m.i2Lo, r.i2_lo); nah(m.i2Hi, r.i2_hi); nah(m.eggerP, r.egger_p);
    nah(f(m.est), r.r); nah(f(m.lo), r.r_lb); nah(f(m.hi), r.r_ub);
    nah(f(m.pLo), Math.tanh(r.pi_lb)); nah(f(m.pHi), Math.tanh(r.pi_ub));
  });
});

describe('Eingabe prüfen und lesen', () => {
  const entw = (extra: Partial<MetaEntwurf> = {}): MetaEntwurf => ({ art: 'es', modus: 'se', massName: '', verhaeltnis: false, kh: false, zeilen: [], ...extra });
  it('Zahlen mit Komma, Punkt und Minuszeichen', () => {
    expect(parseZahl('0,25')).toBe(0.25); expect(parseZahl(' −1.5 ')).toBe(-1.5); expect(parseZahl('1e-3')).toBe(0.001);
    expect(parseZahl('')).toBeNull(); expect(parseZahl('abc')).toBeNull(); expect(parseZahl('1,2,3')).toBeNull();
  });
  it('leere Zeilen zählen nicht; unvollständige und unmögliche Zeilen werden gemeldet, nicht still gerechnet', () => {
    const p = metaPruefung(entw({ zeilen: [{ name: 'A', w: ['0,5', '0,2'] }, { name: '', w: ['', ''] }, { name: 'B', w: ['0,3', '0'] }, { name: 'C', w: ['0,4', ''] }, { name: 'D', w: ['0,1', '0,1'] }] }), (de) => de);
    expect(p.eingabe!.namen).toEqual(['A', 'D']);
    const h = p.punkte.find(x => x.text.includes('nicht gerechnet'))!;
    expect(h.text).toContain('2 Zeilen'); expect(h.klein).toContain('B: SE muss größer als 0 sein'); expect(h.klein).toContain('C: nicht alle Zahlen');
    expect(p.punkte.some(x => x.art === 'hinweis' && x.text === '2 Studien')).toBe(true);   // unter 5 Studien: Hinweis
  });
  it('unter zwei Studien: Sperre und keine Eingabe', () => {
    const p = metaPruefung(entw({ zeilen: [{ name: 'A', w: ['0,5', '0,2'] }] }), (de) => de);
    expect(p.eingabe).toBeNull(); expect(p.punkte[0]!.art).toBe('sperre');
  });
  it('Intervall statt SE: SE = (obere − untere) / (2 · 1,96)', () => {
    const p = metaPruefung(entw({ modus: 'ki', zeilen: [{ name: 'A', w: ['0,5', '0,1', '0,9'] }, { name: 'B', w: ['0,2', '-0,2', '0,6'] }, { name: 'C', w: ['1', '0,1', '0,9'] }] }), (de) => de);
    expect(p.eingabe!.zeilen.length).toBe(2);
    nah(p.eingabe!.zeilen[0]![1]!, 0.8 / 3.92, 1e-12);
    expect(p.punkte.find(x => x.text.includes('nicht gerechnet'))!.klein).toContain('C: Effekt liegt außerhalb');
  });
  it('zwei Gruppen und Korrelation: Plausibilität (SD > 0, n ≥ 2 bzw. r in (−1, 1), n ≥ 4)', () => {
    const g = metaPruefung(entw({ art: 'smd', zeilen: [{ name: 'A', w: ['5', '1', '10', '4', '1', '10'] }, { name: 'B', w: ['5', '0', '10', '4', '1', '10'] }, { name: 'C', w: ['5', '1', '1', '4', '1', '10'] }, { name: 'D', w: ['6', '2', '12', '4', '2', '11'] }] }), (de) => de);
    expect(g.eingabe!.namen).toEqual(['A', 'D']);
    const r = metaPruefung(entw({ art: 'r', zeilen: [{ name: 'A', w: ['0,3', '50'] }, { name: 'B', w: ['1', '50'] }, { name: 'C', w: ['0,2', '3'] }, { name: 'D', w: ['-0,1', '80'] }] }), (de) => de);
    expect(r.eingabe!.namen).toEqual(['A', 'D']);
  });
  it('Daten für R: Spaltennamen je Art', () => {
    expect(metaDaten(ein('es', 1, { zeilen: [[0.1, 0.2]] })).map(x => x.name)).toEqual(['yi', 'sei']);
    expect(metaDaten(ein('smd', 1, { zeilen: [[1, 2, 3, 4, 5, 6]] })).map(x => x.name)).toEqual(['m1i', 'sd1i', 'n1i', 'm2i', 'sd2i', 'n2i']);
    expect(metaDaten(ein('r', 1, { zeilen: [[0.1, 20]] })).map(x => x.name)).toEqual(['ri', 'ni']);
  });
  it('Einfügen aus der Tabellenkalkulation: Tabulator oder Semikolon, Kopfzeile, Dezimalkomma, Zeilen ohne Namen', () => {
    expect(metaEinfuegen('Studie\tr\tn\nA\t0,3\t50\nB\t0,25\t80\n', 2)).toEqual([{ name: 'A', w: ['0,3', '50'] }, { name: 'B', w: ['0,25', '80'] }]);
    expect(metaEinfuegen('A;0.3;50\r\nB;0.2;70', 2)).toEqual([{ name: 'A', w: ['0.3', '50'] }, { name: 'B', w: ['0.2', '70'] }]);
    expect(metaEinfuegen('0,3\t50\n0,2\t70', 2)).toEqual([{ name: '', w: ['0,3', '50'] }, { name: '', w: ['0,2', '70'] }]);
  });
});

describe('Achsenmarken und R-Aufruf', () => {
  it('Marken auf der Rechenskala, beschriftet in der Anzeige-Skala', () => {
    const verh = metaTicks(Math.log(0.2), Math.log(5), ein('es', 2, { verhaeltnis: true }));
    expect(verh.map(t => t.text)).toEqual(['0.2', '0.5', '1', '2', '5']);
    nah(verh.find(t => t.text === '1')!.pos + 1, 1);
    const r = metaTicks(Math.atanh(-0.1), Math.atanh(0.5), ein('r', 2));
    expect(r.map(t => t.text)).toEqual(['0.0', '0.2', '0.4']);
    const g = metaTicks(-1.3, 0.4, ein('smd', 2));
    expect(g.map(t => t.text)).toContain('0.0'); expect(g.every(t => t.pos >= -1.3 - 1e-9 && t.pos <= 0.4 + 1e-9)).toBe(true);
  });
  it('R-Aufruf zum Nachrechnen für jede Art', () => {
    expect(metaRCode(ein('es', 2, { zeilen: [[0.1, 0.2], [0.3, 0.1]] }), (de) => de)).toContain('rma(yi, vi, data = d, method = "REML")');
    expect(metaRCode(ein('smd', 1, { kh: true, zeilen: [[1, 2, 3, 4, 5, 6]] }), (de) => de)).toContain('escalc(measure = "SMD"');
    expect(metaRCode(ein('smd', 1, { kh: true, zeilen: [[1, 2, 3, 4, 5, 6]] }), (de) => de)).toContain('test = "knha"');
    expect(metaRCode(ein('r', 1, { zeilen: [[0.1, 20]] }), (de) => de)).toContain('escalc(measure = "ZCOR"');
  });
});

describe('Sätze, APA, Tabellen', () => {
  it('Maß ohne eigenen Namen: „liegt der gepoolte Effekt bei 0,49“, nicht „bei Verhältnis = 0,49“ (B8)', () => {
    const t = saetzeMeta(metaLesen(roh.bcg!, ein('es', 13, { verhaeltnis: true, massName: '' })));
    expect(t.haupt).toContain('liegt der gepoolte Effekt bei 0,49, 95 %-KI [0,34; 0,70]');
    expect(t.haupt).not.toMatch(/bei (Verhältnis|Effekt) =/);
    expect(t.apa).toContain('Verhältnis = 0,49');   // die Zeile für die Arbeit behält die Bezeichnung
  });
  it('BCG (Verhältnis): Hauptsatz, Prädiktionsintervall, Heterogenität, Hinweise', () => {
    const t = saetzeMeta(bcg());
    expect(t.haupt).toContain('Über 13 Studien hinweg liegt der gepoolte Effekt bei RR = 0,49, 95 %-KI [0,34; 0,70]');
    expect(t.haupt).toContain('Er weicht erkennbar von 1 ab (z-Test, p < ,001)');
    expect(t.zusatz).toContain('Q(12) = 152,23, p < ,001; I² = 92\u00a0% (hoch, Intervall 82 bis 98\u00a0%); τ² = 0,31 (τ = 0,56, 95 %-KI für τ² [0,12; 1,11])');
    expect(t.haupt).toContain('ist der wahre Effekt im Bereich [0,15; 1,55] zu erwarten (95 %-Prädiktionsintervall)');   // F9: im Hauptsatz
    expect(t.haupt).toContain('bei 1 oder in der Gegenrichtung liegen, obwohl der gepoolte Effekt von 1 abweicht'); expect(t.haupt).not.toContain('null');   // B8: Verhältnismaß -> 1, nicht null
    expect(t.zusatz).toContain('Egger-Test): keine erkennbare Asymmetrie, t(11) = −1,40, p = ,189');
    expect(t.vorsicht).toContain('unterscheiden sich stark'); expect(t.vorsicht).not.toContain('Sterne');
    expect(t.apa).toBe('Meta-Analyse (Random-Effects-Modell, REML): RR = 0,49, 95 %-KI [0,34; 0,70], z = −3,97, p < ,001; Q(12) = 152,23, p < ,001; I² = 92\u00a0%; τ² = 0,31 (k = 13)');
    expect(t.marken.map(x => x.erklaer)).toEqual(['meta-effekt', 'i-quadrat', 'tau-quadrat', 'i-quadrat', 'praediktionsintervall', 'funnel-plot', 'forest-plot']);
  });
  it('Normand (g): Größenwort, nicht signifikant', () => {
    const t = saetzeMeta(normand());
    expect(t.haupt).toContain('g = −0,54, 95 %-KI [−1,14; 0,07]');
    expect(t.haupt).toContain('Er weicht nicht erkennbar von null ab (z-Test, p = ,082)');
    expect(t.haupt).not.toContain('Größe');
  });
  it('Molloy (r): Anzeige als r ohne führende Null, Größenwort klein', () => {
    const m = molloy(), t = saetzeMeta(m);
    expect(t.haupt).toContain('r = ,15, 95 %-KI [,09; ,21]');
    expect(t.haupt).toContain('Größe: klein');
    expect(groessenWort(m)).toBe('klein');
    expect(t.haupt).toContain('im Bereich [−,04; ,32] zu erwarten (95 %-Prädiktionsintervall)');
    expect(metaApa(m)).toContain('r = ,15, 95 %-KI [,09; ,21], z = 4,75, p < ,001; Q(15) = 38,16');
  });
  it('Knapp-Hartung: t-Test in Hauptsatz und APA, Hinweis', () => {
    const m = bcg(true), t = saetzeMeta(m);
    expect(t.haupt).toContain('t-Test, p = ,002'); expect(t.apa).toContain('t(12) = −3,95'); expect(t.vorsicht).toContain('Knapp und Hartung');
  });
  it('Englisch: Sätze und Tabellenköpfe', () => {
    s.einst.sprache = 'en'; s.einst.zahl = 'sprache';
    const t = saetzeMeta(molloy());
    expect(t.haupt).toContain('Across 16 studies the pooled effect is r = .15, 95% CI [.09, .21]');
    expect(t.haupt).toContain('(95% prediction interval)'); expect(t.apa).toMatch(/^Meta-analysis \(random-effects model, REML\): r = \.15/);
    expect(tabellenMeta(molloy())[0]!.label).toBe('Pooled Effect');
  });
  it('wenige Studien: Hinweise zu τ² und Egger', () => {
    const m: Meta = { ...bcg(), k: 4 };
    const t = saetzeMeta(m);
    expect(t.vorsicht).toContain('nur 4 Studien'); expect(t.vorsicht).toContain('weniger als 10 Studien');
    expect(t.marken.find(x => x.erklaer === 'forest-plot')!.hinweis).toBe(true);
  });
  it('Wörter zu I² nach Higgins', () => { expect([10, 30, 60, 90].map(i2Wort)).toEqual(['gering', 'mäßig', 'erheblich', 'hoch']); });
  it('Tabellen: gepoolter Effekt (zurückgerechnet), Prädiktionsintervall, Heterogenität, Studien, Egger', () => {
    const ts = tabellenMeta(bcg());
    expect(ts.map(x => x.label)).toEqual(['Pooled Effect', 'Prediction Interval', 'Heterogeneity', 'Studies', 'Egger Test']);
    const eff = ts[0]!.cells.map(c => c.t);
    expect(eff).toContain('0.49');
    expect(ts[3]!.cells.filter(c => c.t === 'S1').length).toBe(1);
  });
});

describe('Blatt, Bericht, Excel', () => {
  const blatt = (e: Meta): Blatt => ({ id: 'm', titel: 'Meta-Analyse', art: 'meta', l1: null, l2: null, l3: [], syntax: '', items: [], ergebnis: { typ: 'meta', e }, imBericht: true, notiz: '', zeit: 0 });
  it('Bericht nimmt die eigenen Tabellen, Excel auch; Rechenzusatz nennt R; Stichprobe sind Studien', () => {
    const b = blatt(molloy());
    expect(berichtTabellen(b).length).toBe(5);
    expect(excelTabellen(b).length).toBe(5);
    expect(rechenZusatz([b])).toContain('metafor');
    expect(berichtSatz(b)).toContain('Meta-Analyse');
    expect(gerechneteN(b)).toBeNull();
    expect(stichprobenText([b], 0, false).text).toBe('Die Meta-Analyse fasst 16 Studien zusammen; die Daten sind Studienergebnisse, keine einzelnen Personen.');
  });
  it('Frageart „Studien zusammenfassen“ in VERFAHREN, ohne Spaltenwahl', () => {
    const v = VERFAHREN.find(x => x.id === 'meta')!;
    expect(v.titel).toBe('Studien zusammenfassen (Meta-Analyse)');
    expect(v.luecken).toEqual([]);
    expect(v.titelBlatt({ l1: [], l2: [], l3: [], l4: [] }, () => undefined)).toBe('Meta-Analyse');
  });
  it('R-Fehler: zu wenige Studien', () => { expect(rFehlerText('fewer than two usable studies')).toContain('weniger als zwei Studien'); });
});

/* Dritte Abnahme (08.10.2026), Befunde M1, M2, M6, M7, M12 */
describe('Abnahme 3: Meta-Analyse', () => {
  // R: pit = Schätzung ± qt(0,975, k − 2) · sqrt(τ² + SE²) (scripts/metaanalyse-erwartet.R, Felder pit_lb/pit_ub); metafor 5.2 kennt diese Variante nicht.
  const PIT = { bcg: [-2.008376050691, 0.5793113539603], bcg_kh: [-2.009057784486, 0.5799930877555], normand: [-2.763015916975, 1.688799399842], molloy: [-0.05475583181618, 0.3545918086659] };
  it('M1: Prädiktionsintervall nach IntHout (t, k − 2) gegen R; Standard bleibt predict() wie metafor/JASP', () => {
    for (const [name, m] of [['bcg', bcg()], ['bcg_kh', bcg(true)], ['normand', normand()], ['molloy', molloy()]] as const) {
      nah(m.pitLo, PIT[name][0]!, 1e-9); nah(m.pitHi, PIT[name][1]!, 1e-9);
    }
    // Der Standard ist das z-Intervall von predict(); IntHout ist breiter (BCG: exp → [0,13; 1,78] statt [0,15; 1,55]).
    const m = bcg(), f = rueck(m);
    expect(f(m.pLo)).toBeCloseTo(0.1546, 3); expect(f(m.pHi)).toBeCloseTo(1.549, 3);
    expect(f(m.pitLo)).toBeCloseTo(0.1343, 3); expect(f(m.pitHi)).toBeCloseTo(1.7849, 3);
    expect(m.pitHi - m.pitLo).toBeGreaterThan(m.pHi - m.pLo);
    expect(piIntHout(m)).toBe('[0,13; 1,78]');
    expect(saetzeMeta(m).haupt).toContain('im Bereich [0,15; 1,55] zu erwarten');
    expect(tabellenMeta(m).find(t => t.label === 'Prediction Interval')!.footnotes[0]!.t).toMatch(/metafor::predict.*Normalverteilung.*IntHout/);
    expect(tabellenMeta(bcg(true)).find(t => t.label === 'Prediction Interval')!.footnotes[0]!.t).toContain('Knapp-Hartung');
  });
  it('M1: bei zwei Studien ist die Variante nach IntHout nicht definiert', () => {
    const m = { ...bcg(), pitLo: NaN, pitHi: NaN };
    expect(piIntHout(m)).toBeNull();
  });
  it('M2: bei Verhältnismaß entfällt „log“ im Namen, mit Hinweis', () => {
    const zeilen = [{ name: 'A', w: ['0,5', '0,2'] }, { name: 'B', w: ['0,3', '0,1'] }];
    const p = metaPruefung({ art: 'es', modus: 'se', massName: 'log OR', verhaeltnis: true, kh: false, zeilen }, (de) => de);
    expect(p.eingabe!.massName).toBe('OR');
    expect(p.punkte.some(x => x.text.includes('„OR“, nicht „log OR“'))).toBe(true);
    expect(metaPruefung({ art: 'es', modus: 'se', massName: 'ln(HR)', verhaeltnis: true, kh: false, zeilen }, (de) => de).eingabe!.massName).toBe('HR');
    // ohne Schalter bleibt der Name, wie er ist
    expect(metaPruefung({ art: 'es', modus: 'se', massName: 'log OR', verhaeltnis: false, kh: false, zeilen }, (de) => de).eingabe!.massName).toBe('log OR');
    expect(metaPruefung({ art: 'es', modus: 'se', massName: 'Logik-Score', verhaeltnis: true, kh: false, zeilen }, (de) => de).eingabe!.massName).toBe('Logik-Score');
  });
  it('M6: Bericht - Satz und „Statistik:“ getrennt, keine Klammer in Klammer, nichts doppelt', async () => {
    const blatt = (e: Meta): Blatt => ({ id: 'm', titel: 'Meta-Analyse', art: 'meta', l1: null, l2: null, l3: [], syntax: '', items: [], ergebnis: { typ: 'meta', e }, imBericht: true, notiz: '', zeit: 0 });
    const satz = berichtSatz(blatt(bcg()));
    expect(satz).toMatch(/\. Statistik: Meta-Analyse \(Random-Effects-Modell, REML\): RR = 0,49/);
    expect(satz).not.toMatch(/\([^()]*\([^()]*\([^()]*\)/);                 // höchstens eine Klammer in einer Klammer, nie zwei
    expect(satz.match(/z = −3,97/g)!.length).toBe(1);
    expect(satz.endsWith('(k = 13).')).toBe(true);
  });
  it('M7: τ² unter ,01 mit drei Stellen; p des Q-Tests in eigener p-Spalte; Intervalle englisch mit Komma', () => {
    const m = molloy();     // τ² = 0,0081
    expect(saetzeMeta(m).zusatz).toContain('τ² = 0,008 (τ = 0,09');
    expect(metaApa(m)).toContain('τ² = 0,008');
    const het = tabellenMeta(bcg()).find(t => t.label === 'Heterogeneity')!;
    expect(het.cells.filter(c => c.r === 0).map(c => c.t)).toContain('p');
    expect(het.cells.some(c => c.t.startsWith('p (Q'))).toBe(false);
    s.einst.sprache = 'en'; s.einst.zahl = 'sprache';
    expect(saetzeMeta(bcg()).marken.find(x => x.erklaer === 'praediktionsintervall')!.text).toBe('Prediction interval [0.15, 1.55]');
  });
  it('M12: Größenwort nennt die Schwelle', () => {
    expect(saetzeMeta(normand()).haupt).not.toContain('Cohen');           // g nicht bedeutsam: kein Größenwort
    const t = saetzeMeta(molloy()).haupt;
    expect(t).toContain('Größe: klein (Cohen: ,1 bis unter ,3)');
  });
});

/* Abschlusstest F9 (10.10.2026): Knapp-Hartung ist Standard (IntHout, Ioannidis & Borm 2014; Cochrane Handbook 6.4, Kap. 10.10.4),
 * das Prädiktionsintervall steht im Hauptsatz. Referenz: scripts/metaanalyse-erwartet.R, rma(test = "knha") und predict() (t mit k − 1). */
describe('Abschlusstest F9: Knapp-Hartung als Standard, Prädiktionsintervall im Hauptsatz', () => {
  const KH = {
    normand_kh: { se: 0.3092856338686, ci_lb: -1.250322209227, ci_ub: 0.1761056920934, stat: -1.736609139741, p: 0.1206645321281, pi_lb: -2.708307007957, pi_ub: 1.634090490823, ddf: 8 },
    molloy_kh: { se: 0.03276999613399, ci_lb: 0.0800703950571, ci_ub: 0.2197655817927, stat: 4.574855236843, p: 0.0003647331344574, pi_lb: -0.05434980260007, pi_ub: 0.3541857794498, ddf: 15 }
  };
  it('Zahlen mit Knapp-Hartung gegen R (alle drei Datensätze)', () => {
    for (const [name, art, k] of [['normand_kh', 'smd', 9], ['molloy_kh', 'r', 16]] as const) {
      const m = metaLesen(roh[name]!, ein(art, k, { kh: true })), r = KH[name];
      nah(m.se, r.se); nah(m.lo, r.ci_lb); nah(m.hi, r.ci_ub); nah(m.stat, r.stat); nah(m.p, r.p, 1e-8); nah(m.pLo, r.pi_lb); nah(m.pHi, r.pi_ub);
      expect(m.statDf).toBe(r.ddf);
    }
  });
  it('Voreinstellung: neue Meta-Analyse und Beispiel rechnen mit Knapp-Hartung', async () => {
    const { entwurf, metaBeispiel } = await import('./metaentwurf.svelte');
    expect(entwurf.kh).toBe(true);
    entwurf.kh = false; metaBeispiel();
    expect(entwurf.kh).toBe(true);
  });
  it('Hauptsatz nennt das Prädiktionsintervall (BCG mit Knapp-Hartung: exp(−1,996) = 0,14 bis exp(0,567) = 1,76)', () => {
    const t = saetzeMeta(bcg(true));
    expect(t.haupt).toContain('Er weicht erkennbar von 1 ab (t-Test, p = ,002)');
    expect(t.haupt).toContain('In einer neuen, vergleichbaren Studie ist der wahre Effekt im Bereich [0,14; 1,76] zu erwarten (95 %-Prädiktionsintervall)');
    expect(t.haupt).toContain('er kann dort auch bei 1 oder in der Gegenrichtung liegen');
    expect(t.zusatz).not.toContain('Prädiktionsintervall');
    expect(t.vorsicht).toContain('Anpassung nach Knapp und Hartung');
  });
  it('ohne Knapp-Hartung: Hinweis, dass die Intervalle bei wenigen Studien zu schmal sein können', () => {
    const t = saetzeMeta(bcg(false));
    expect(t.vorsicht).toContain('Ohne die Anpassung nach Knapp und Hartung (z-Test)');
  });
  it('Englisch', () => {
    s.einst.sprache = 'en'; s.einst.zahl = 'sprache';
    const t = saetzeMeta(metaLesen(roh.molloy_kh!, ein('r', 16, { kh: true })));
    expect(t.haupt).toContain('In a new, comparable study the true effect is expected in the range [−.05, .34] (95% prediction interval); it may also lie at zero');
  });
});
