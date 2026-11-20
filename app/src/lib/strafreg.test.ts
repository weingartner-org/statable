import { describe, expect, it } from 'vitest';
import ERW from './testdaten/spaeter-e-erwartet.json';
import { s } from './sitzung.svelte';
import { zufall } from './zufall';
import { katDaten } from './kategreg';
import type { Spalte } from './verzeichnis';
import type { Wert } from './eingabe';
import {
  STRAF_STARTWERT, STRAF_WDH, STRAF_N_MIN, strafK, strafFaltungen, lambdaWahl, cvMittel, strafStabilitaet, pfadAuswahl, standardisierteKoef, strafPruefung, strafCodeSatz,
  strafKeinPSatz, strafGerechnet, strafAufruf, type StrafCode
} from './strafreg';

/* ===== Später, Welle S-E, Teil Q2: Ridge, Lasso und Elastic Net (glmnet; Fachblatt SPAETER-E, „Entscheidungen Opus (18.10.)“ 5 gehen vor) =====
 * ROTE TESTS des Sollwert-Prüfers. Der Bauer A darf diese Datei und die JSON nicht ändern. Er baut `lib/strafreg.ts` (reine Funktionen, hier getestet) und die R-Funktion `sp_glmnet`
 * (engine/statable-vorhersage-e.R; ihre Zahlen stehen in engine/spaeter-e.webr.test.ts). Sollwerte: scripts/spaeter-e-erwartet.R (R 4.6.1, glmnet 5.1, thresh = 1e-14;
 * zweite Quellen: eigener Koordinatenabstieg, geschlossenes Ridge, KKT-Bedingungen, eigene Kreuzvalidierung, eigene lambda-Folge).
 * Opus: lambda.1se als Voreinstellung (lambda.min wählbar), 5 × 10-fache Kreuzvalidierung mit Faltungen aus JS (fester Startwert 20261008), Maß = mittlerer quadrierter Fehler,
 * Gruppen über die Vergleichsgruppe wie überall (mit Hinweis), KEIN p und KEIN KI nach der Auswahl, auch kein Knopf „gewöhnlich nachrechnen“, Fallgewicht gesperrt. Stopp-Regel: läuft glmnet
 * in webR nicht, wird Q2 nicht in JS nachgebaut.
 *
 * SCHNITTSTELLE lib/strafreg.ts
 *   STRAF_STARTWERT = 20261008 · STRAF_WDH = 5 (Wiederholungen der Kreuzvalidierung) · STRAF_N_MIN = 25
 *   strafK(n): 10 | 5 | null                              n >= 50 → 10 Faltungen, 25 <= n < 50 → 5, n < 25 → null (gesperrt)
 *   strafFaltungen(n, K, startwert, r): number[]          Faltungsnummer 1 … K je Zeile für Wiederholung r (0-basiert). Festgelegt: rng = zufall(startwert + r) (lib/zufall.ts);
 *                                                         perm = [0, …, n − 1]; for i = n − 1 … 1: j = floor(rng()·(i + 1)); tausche perm[i], perm[j]; Zeile perm[pos] bekommt Faltung (pos mod K) + 1
 *   lambdaWahl(lambda, cvm, cvsd, regel: 'se1' | 'min'): { lambda, index, lambdaMin, lambda1se, indexMin, index1se }       genau wie cv.glmnet (getOptcv.glmnet): lambda.min = größtes lambda mit
 *                                                         kleinstem cvm; lambda.1se = größtes lambda mit cvm <= (cvm + cvsd) an der Stelle von lambda.min; index 0-basiert
 *   cvMittel(kurven: { cvm: number[]; cvsd: number[] }[]): { cvm: number[]; cvsd: number[] }       Mittel über die Wiederholungen (beide Kurven)
 *   strafStabilitaet(mengen: string[][]): { haeufigste: number; von: number; verschiedene: number }   Mengen gewählter Größen je Wiederholung (Reihenfolge egal)
 *   pfadAuswahl(stdKoef: number[], max = 20): number[]    Indizes (0-basiert) der max Größen mit größtem |b·s_x|, absteigend, bei Gleichstand der kleinere Index zuerst; Rest grau
 *   standardisierteKoef(b: number[], sx: number[]): number[]       b·s_x (vergleichbar zwischen Größen)
 *   strafPruefung(e: { n; p /* Vorhersagegrößen bzw. Hilfsspalten *\/; gewicht?; konstante?; ausgeschlossen?; wenigWerte?; ohneStandardisierung? }) → { sperre: boolean; codes: StrafCode[] }, Codes in dieser Reihenfolge:
 *        sperren: 'gewicht', 'zu-wenig-faelle' (n < 25), 'zu-wenige-groessen' (p < 3), 'zu-viele-hilfsspalten' (p > 500)
 *        hinweise: 'wenig-faelle' (25 <= n < 50: 5 Faltungen), 'mehr-groessen-als-faelle' (p > n), 'viele-hilfsspalten' (p > 200), 'konstant' (konstante >= 1), 'viele-fehlend' (ausgeschlossen > 20 % von n + ausgeschlossen),
 *                  'wenige-werte' (wenigWerte >= 1), 'ohne-standardisierung'
 *   strafCodeSatz(code, e?): string                       nicht leer, de und en verschieden, nie NaN/undefined
 *   strafKeinPSatz(): string                              der immer gezeigte Satz „keine p-Werte und Konfidenzintervalle nach der Auswahl“ (Auswahl und Schätzung aus denselben Daten)
 *   strafGerechnet({ alpha, regel, K, R, startwert, n }): string       Zeile „Gerechnet“ (glmnet 5.1, Lasso/Ridge/Elastic Net, standardisiert, Kreuzvalidierung, Ein-Standardfehler-Regel, Startwert, n)
 *   strafAufruf(dt: KatDaten, o: { alpha; foldids: number[][]; regel: 'se1' | 'min'; standardisieren: boolean }): { code: string; args: Record<string, string | string[]> }
 *        dt aus katDaten('zaehlreg', …); der Code ruft sp_glmnet; die Faltungen gehen als Ganzzahl-Vektoren in args (Text), nie in den Code
 */
s.einst.sprache = 'de'; s.einst.anrede = 'du';
type Z = Record<string, any>;
const J = ERW as unknown as Z;
const G = J.strafreg.faelle as Record<string, Z>;
const SJS = J.strafreg_js as Z;
const arr = (x: any): any[] => (Array.isArray(x) ? x : x == null ? [] : [x]);

describe('Festwerte', () => {
  it('Startwert, Wiederholungen, kleinstes n', () => { expect(STRAF_STARTWERT).toBe(20261008); expect(STRAF_WDH).toBe(5); expect(STRAF_N_MIN).toBe(25); });
  it('Zahl der Faltungen nach n (Fachblatt 2.2)', () => {
    expect(strafK(117)).toBe(10); expect(strafK(100)).toBe(10); expect(strafK(50)).toBe(10); expect(strafK(49)).toBe(5); expect(strafK(30)).toBe(5); expect(strafK(25)).toBe(5);
    expect(strafK(24)).toBeNull(); expect(strafK(0)).toBeNull(); expect(strafK(NaN)).toBeNull();
  });
});

describe('Faltungen aus JS: reproduzierbar, ausgewogen, je Wiederholung anders', () => {
  const eigen = (n: number, K: number, start: number, r: number) => {
    const rng = zufall(start + r), perm = Array.from({ length: n }, (_, i) => i);
    for (let i = n - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [perm[i], perm[j]] = [perm[j]!, perm[i]!]; }
    const f = new Array<number>(n); perm.forEach((z, pos) => { f[z] = (pos % K) + 1; }); return f;
  };
  it('genau das festgelegte Verfahren (Fisher-Yates mit zufall(startwert + r))', () => {
    for (const [n, K] of [[117, 10], [100, 10], [30, 5], [25, 5], [1000, 10]] as const) for (const r of [0, 1, 4]) expect(strafFaltungen(n, K, 20261008, r), `${n} ${K} ${r}`).toEqual(eigen(n, K, 20261008, r));
  });
  it('jede Faltung 1 … K kommt vor, Größen unterscheiden sich um höchstens 1, jede Zeile hat genau eine', () => {
    for (const [n, K] of [[117, 10], [30, 5], [50, 10], [101, 10]] as const) {
      const f = strafFaltungen(n, K, 20261008, 0), z = Array.from({ length: K }, (_, k) => f.filter(x => x === k + 1).length);
      expect(f.length).toBe(n); expect(f.every(x => Number.isInteger(x) && x >= 1 && x <= K)).toBe(true); expect(Math.max(...z) - Math.min(...z)).toBeLessThanOrEqual(1); expect(z.reduce((a, b) => a + b, 0)).toBe(n);
    }
  });
  it('gleicher Startwert und gleiche Wiederholung ⇒ gleiche Faltung; andere Wiederholung oder anderer Startwert ⇒ andere', () => {
    expect(strafFaltungen(117, 10, 20261008, 2)).toEqual(strafFaltungen(117, 10, 20261008, 2));
    expect(strafFaltungen(117, 10, 20261008, 0)).not.toEqual(strafFaltungen(117, 10, 20261008, 1));
    expect(strafFaltungen(117, 10, 20261008, 0)).not.toEqual(strafFaltungen(117, 10, 20261009, 0));
    const alle = Array.from({ length: 5 }, (_, r) => JSON.stringify(strafFaltungen(117, 10, 20261008, r))); expect(new Set(alle).size).toBe(5);
  });
  it('Rand: K > n und n = 0 werfen nicht, geben aber nie eine Faltung außerhalb 1 … K', () => { expect(strafFaltungen(0, 5, 1, 0)).toEqual([]); const f = strafFaltungen(3, 5, 1, 0); expect(f.length).toBe(3); expect(f.every(x => x >= 1 && x <= 5)).toBe(true); });
});

describe('lambda-Wahl wie cv.glmnet (Sollwerte: alle Fälle aus R)', () => {
  for (const [name, f] of Object.entries(G)) it(`${name}: lambda.min, lambda.1se und das gewählte lambda`, () => {
    const o = f.soll as Z, lam = arr(o.lambda), cvm = arr(o.cvm), cvsd = arr(o.cvsd);
    const w = lambdaWahl(lam, cvm, cvsd, o.regel);
    expect(w.lambdaMin).toBe(o.lambda_min); expect(w.lambda1se).toBe(o.lambda_1se); expect(w.lambda).toBe(o.lambda_gewaehlt); expect(lam[w.index]).toBe(o.lambda_gewaehlt);
    expect(lam[w.indexMin]).toBe(o.lambda_min); expect(lam[w.index1se]).toBe(o.lambda_1se);
    expect(w.lambda1se).toBeGreaterThanOrEqual(w.lambdaMin);
    expect(cvm[w.index1se]).toBe(o.cvm_1se); expect(cvm[w.indexMin]).toBe(o.cvm_min);
    const anders = lambdaWahl(lam, cvm, cvsd, o.regel === 'min' ? 'se1' : 'min'); expect(anders.lambda).toBe(o.regel === 'min' ? o.lambda_1se : o.lambda_min);
  });
  it('Gleichstand im kleinsten Fehler: das größte lambda gewinnt (wie getOptcv.glmnet)', () => {
    const lam = [1, 0.5, 0.25, 0.125], cvm = [3, 2, 2, 2.5], sd = [0.1, 0.1, 0.1, 0.1];
    const w = lambdaWahl(lam, cvm, sd, 'min'); expect(w.lambda).toBe(0.5); expect(w.index).toBe(1);
    expect(lambdaWahl(lam, cvm, sd, 'se1').lambda).toBe(0.5);
  });
  it('Ein-Standardfehler-Regel: das größte lambda im Schwankungsbereich', () => {
    const lam = [8, 4, 2, 1], cvm = [5, 3.2, 3, 3.4], sd = [0.5, 0.5, 0.5, 0.5];
    expect(lambdaWahl(lam, cvm, sd, 'min').lambda).toBe(2); expect(lambdaWahl(lam, cvm, sd, 'se1').lambda).toBe(4);     // 3,2 <= 3 + 0,5
  });
  it('Rand: ein einziges lambda; Reihenfolge und Längen unverändert', () => { const w = lambdaWahl([1], [2], [0.1], 'se1'); expect(w.lambda).toBe(1); expect(w.index).toBe(0); });
});

describe('Mittel über die Wiederholungen', () => {
  it('cvm und cvsd werden je lambda gemittelt', () => {
    const o = cvMittel([{ cvm: [1, 2, 3], cvsd: [0.1, 0.2, 0.3] }, { cvm: [3, 2, 1], cvsd: [0.3, 0.2, 0.1] }]);
    expect(o.cvm).toEqual([2, 2, 2]); o.cvsd.forEach(v => expect(v).toBeCloseTo(0.2, 12)); expect(o.cvm.length).toBe(3);
  });
  it('eine Wiederholung bleibt unverändert; Rand: leere Liste wirft nicht', () => { expect(cvMittel([{ cvm: [1, 2], cvsd: [3, 4] }])).toEqual({ cvm: [1, 2], cvsd: [3, 4] }); expect(() => cvMittel([])).not.toThrow(); });
});

describe('Auswahl-Stabilität (Opus 5: Anteil der Wiederholungen, in denen die Auswahl gleich blieb)', () => {
  it('Sollwert: vorhersage_glm, Lasso 1se, fünf Wiederholungen mit festen Faltungen', () => {
    const wd = (G.vg_lasso_wdh5!.soll.wiederholungen as Z[]).map(w => arr(w.gewaehlt) as string[]);
    const o = strafStabilitaet(wd); expect(o).toEqual({ haeufigste: SJS.stabilitaet_wdh5.haeufigste, von: 5, verschiedene: SJS.stabilitaet_wdh5.verschiedene }); expect(o.haeufigste).toBe(4);
  });
  it('Reihenfolge innerhalb der Menge ist egal; alle gleich; alle verschieden; leere Mengen', () => {
    expect(strafStabilitaet([['a', 'b'], ['b', 'a'], ['a', 'b']])).toEqual({ haeufigste: 3, von: 3, verschiedene: 1 });
    expect(strafStabilitaet([['a'], ['b'], ['c']])).toEqual({ haeufigste: 1, von: 3, verschiedene: 3 });
    expect(strafStabilitaet([[], [], ['a']])).toEqual({ haeufigste: 2, von: 3, verschiedene: 2 }); expect(strafStabilitaet([])).toEqual({ haeufigste: 0, von: 0, verschiedene: 0 });
  });
});

describe('Standardisierte Koeffizienten und Pfadbild (Fachblatt 2.6)', () => {
  it('b·s_x gegen R (Lasso 1se, vorhersage_glm: X1 1,09981, X2 0,01899, grB 0,38466, grC −0,20812 im Fachblatt)', () => {
    const o = G.vg_lasso!.soll as Z, b = arr(o.koef), sx = arr(o.sx), st = standardisierteKoef(b, sx), soll = arr(o.std_koef);
    st.forEach((v, i) => expect(Math.abs(v - soll[i]), `Koeffizient ${i}`).toBeLessThan(1e-12));
    const nm = arr(o.namen) as string[]; const e = (x: string) => st[nm.indexOf(x)]!;
    expect(e('X1')).toBeCloseTo(1.09981, 3); expect(e('X2')).toBeCloseTo(0.01899, 3); expect(e('grB')).toBeCloseTo(0.38466, 3); expect(e('grC')).toBeCloseTo(-0.20812, 3);
  });
  it('mehr als 20 Größen: die 20 mit dem größten Betrag (p > n, 40 Spalten)', () => {
    const o = G.pn_lasso!.soll as Z, st = arr(o.std_koef) as number[], a = pfadAuswahl(st, 20);
    expect(a.length).toBe(20); expect(a.map(i => i + 1)).toEqual(arr(SJS.pfad_pn.auswahl20));
    for (let i = 1; i < a.length; i++) expect(Math.abs(st[a[i]!]!)).toBeLessThanOrEqual(Math.abs(st[a[i - 1]!]!));
    for (let i = 0; i < st.length; i++) if (!a.includes(i)) expect(Math.abs(st[i]!)).toBeLessThanOrEqual(Math.abs(st[a[19]!]!));
    expect(arr(o.nzero).length).toBeLessThanOrEqual(100);
  });
  it('höchstens so viele wie vorhanden; Gleichstand: kleinerer Index zuerst; Rand: leer', () => {
    expect(pfadAuswahl([0.5, -2, 2, 0.1], 20)).toEqual([1, 2, 0, 3]); expect(pfadAuswahl([0.5, -2, 2, 0.1], 2)).toEqual([1, 2]); expect(pfadAuswahl([], 20)).toEqual([]);
  });
});

describe('Prüfung der Eingabe (Fachblatt 2.5 und 2.13)', () => {
  const gut = { n: 117, p: 10 };
  it('gut: nichts', () => { expect(strafPruefung(gut)).toEqual({ sperre: false, codes: [] }); });
  it('n < 25 gesperrt; 25 ≤ n < 50 Hinweis (5 Faltungen)', () => {
    expect(strafPruefung({ n: 24, p: 10 })).toEqual({ sperre: true, codes: ['zu-wenig-faelle'] }); expect(strafPruefung({ n: 40, p: 10 })).toEqual({ sperre: false, codes: ['wenig-faelle'] }); expect(strafPruefung({ n: 50, p: 10 })).toEqual({ sperre: false, codes: [] });
  });
  it('weniger als 3 Spalten gesperrt', () => { expect(strafPruefung({ n: 117, p: 2 })).toEqual({ sperre: true, codes: ['zu-wenige-groessen'] }); expect(strafPruefung({ n: 117, p: 3 }).sperre).toBe(false); });
  it('p > n erlaubt, mit Hinweis (30 Fälle, 40 Spalten)', () => { expect(strafPruefung({ n: 30, p: 40 })).toEqual({ sperre: false, codes: ['wenig-faelle', 'mehr-groessen-als-faelle'] }); });
  it('Fallgewicht gesperrt', () => { expect(strafPruefung({ ...gut, gewicht: true })).toEqual({ sperre: true, codes: ['gewicht'] }); });
  it('konstante Spalte, fehlende Werte (> 20 %), wenige Werte, ohne Standardisierung: Hinweise', () => {
    expect(strafPruefung({ ...gut, konstante: 1 })).toEqual({ sperre: false, codes: ['konstant'] });
    expect(strafPruefung({ ...gut, ausgeschlossen: 20 })).toEqual({ sperre: false, codes: [] });         // 20 von 137 = 14,6 %
    expect(strafPruefung({ ...gut, ausgeschlossen: 40 })).toEqual({ sperre: false, codes: ['viele-fehlend'] });   // 40 von 157 = 25,5 %
    expect(strafPruefung({ ...gut, wenigWerte: 2 })).toEqual({ sperre: false, codes: ['wenige-werte'] });
    expect(strafPruefung({ ...gut, ohneStandardisierung: true })).toEqual({ sperre: false, codes: ['ohne-standardisierung'] });
  });
  it('viele Hilfsspalten: über 200 Hinweis, über 500 gesperrt', () => {
    expect(strafPruefung({ n: 1000, p: 200 }).codes).toEqual([]); expect(strafPruefung({ n: 1000, p: 201 })).toEqual({ sperre: false, codes: ['viele-hilfsspalten'] }); expect(strafPruefung({ n: 1000, p: 501 })).toEqual({ sperre: true, codes: ['zu-viele-hilfsspalten'] });
  });
  it('mehrere Gründe: sperren zuerst', () => { const o = strafPruefung({ n: 20, p: 2, gewicht: true }); expect(o.sperre).toBe(true); expect(o.codes).toEqual(['gewicht', 'zu-wenig-faelle', 'zu-wenige-groessen']); });
  it('Rand: NaN wirft nicht', () => { expect(() => strafPruefung({ n: NaN, p: NaN })).not.toThrow(); expect(strafPruefung({ n: 0, p: 0 }).sperre).toBe(true); });
});

describe('Sätze', () => {
  const alle: StrafCode[] = ['gewicht', 'zu-wenig-faelle', 'zu-wenige-groessen', 'zu-viele-hilfsspalten', 'wenig-faelle', 'mehr-groessen-als-faelle', 'viele-hilfsspalten', 'konstant', 'viele-fehlend', 'wenige-werte', 'ohne-standardisierung'];
  for (const c of alle) it(`${c}: nicht leer, englisch anders, ohne NaN`, () => {
    const de = strafCodeSatz(c, { n: 30, p: 40, konstante: 1, ausgeschlossen: 40 }); s.einst.sprache = 'en';
    try { const en = strafCodeSatz(c, { n: 30, p: 40, konstante: 1, ausgeschlossen: 40 }); expect(de.length).toBeGreaterThan(20); expect(en).not.toBe(de); for (const t of [de, en]) expect(t).not.toMatch(/NaN|undefined|\[object/); } finally { s.einst.sprache = 'de'; }
  });
  it('Inhalt', () => {
    expect(strafCodeSatz('gewicht')).toMatch(/Strafregression/); expect(strafCodeSatz('gewicht')).toMatch(/Fallgewicht/); expect(strafCodeSatz('mehr-groessen-als-faelle')).toMatch(/Vorhersage/);
    expect(strafCodeSatz('zu-wenige-groessen')).toMatch(/gewöhnliche Regression/);
  });
  it('kein p und kein Konfidenzintervall nach der Auswahl (Opus 5): der Satz steht und nennt den Grund', () => {
    const t = strafKeinPSatz(); expect(t).toMatch(/p-Werte/); expect(t).toMatch(/Konfidenzintervall/); expect(t).toMatch(/denselben Daten/);
    s.einst.sprache = 'en'; try { expect(strafKeinPSatz()).toMatch(/p values|p-values/); } finally { s.einst.sprache = 'de'; }
  });
  it('Zeile „Gerechnet“', () => {
    const t = strafGerechnet({ alpha: 1, regel: 'se1', K: 10, R: 5, startwert: 20261008, n: 117 }).replace(/[  ]/g, ' ');
    for (const w of ['glmnet', 'Lasso', 'Kreuzvalidierung', 'Ein-Standardfehler', '20261008', 'n = 117', '5 × 10']) expect(t, w).toContain(w);
    expect(strafGerechnet({ alpha: 0, regel: 'min', K: 5, R: 5, startwert: 1, n: 30 })).toContain('Ridge'); expect(strafGerechnet({ alpha: 0.5, regel: 'min', K: 5, R: 5, startwert: 1, n: 30 })).toContain('Elastic Net');
  });
});

describe('R-Aufruf: Sicherheit', () => {
  const GEFAHR = [`x'); assign('.pwned', TRUE, globalenv()); ('`, `a\`; system("touch /tmp/pwned"); \`b`, `q"); stop("x"); ("`, `n\nassign('.pwned', TRUE, globalenv())\n`];
  const spalten: Spalte[] = GEFAHR.map((g, i) => ({ name: `s${i}${g}`, bezeichnung: g, art: 'zahl', niveau: 'metrisch', format: '', fehlend: [], fehlendText: '', werteLabels: {} }) as Spalte);
  const zeilen: Wert[][] = Array.from({ length: 30 }, (_, i) => [i * 1.5 + 1, i, i % 3, (i * 7) % 5]);
  it('Code ohne Namen und Faltungen als Text-Argumente', () => {
    const dt = katDaten('zaehlreg', spalten[0]!.name, spalten.slice(1).map(c => c.name), zeilen, spalten);
    const a = strafAufruf(dt, { alpha: 1, foldids: [strafFaltungen(30, 5, 20261008, 0), strafFaltungen(30, 5, 20261008, 1)], regel: 'se1', standardisieren: true });
    expect(a.code).toContain('sp_glmnet('); expect(a.code).not.toMatch(/pwned|system|touch|stop\(|`|"/); expect(a.code).toMatch(/^tryCatch\(/);
    const faltungen = Object.values(a.args).flat(); expect(faltungen.length).toBeGreaterThanOrEqual(2); for (const v of Object.values(a.args)) expect(typeof v === 'string' || (Array.isArray(v) && v.every(x => typeof x === 'string'))).toBe(true);
    expect(() => strafAufruf(dt, { alpha: NaN, foldids: [[1]], regel: 'se1', standardisieren: true })).toThrow(); expect(() => strafAufruf(dt, { alpha: 1, foldids: [[1]], regel: 'x' as any, standardisieren: true })).toThrow();
  });
});
