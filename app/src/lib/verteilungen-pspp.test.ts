/* Welle 6, L1: ZWEITE Quelle. PSPP 2.1.1 (die echte Engine in Node) rechnet CDF-, PDF- und IDF-Funktionen in COMPUTE gegen dieselben Sollwerte wie R (welle6-erwartet.json).
 * Dieser Test hängt NICHT von lib/verteilungen.ts ab und ist darum schon heute grün (er prüft die Sollwerte, nicht den Bauer).
 *
 * Was PSPP 2.1.1 kennt (gemessen): CDF.NORMAL, CDF.T, CDF.CHISQ, CDF.F, CDF.BINOM, CDF.POISSON, CDF.HYPER (Reihenfolge q, N, K, n), PDF.xxx zu allen sieben, IDF.NORMAL, IDF.T, IDF.CHISQ, IDF.F.
 *   Es gibt KEIN IDF für Binomial, Poisson und hypergeometrisch (diskrete Quantile haben hier nur R als Quelle) und KEIN SDF.xxx (obere Schwänze: kein direkter Weg).
 * Folge für diesen Test:
 *   - P(X ≤ x) wird für alle Gitterpunkte mit Sollwert ≥ 1e-300 verglichen, P(X ≥ x) bei Normal und t über die Symmetrie (CDF am gespiegelten Punkt), bei den übrigen über 1 − CDF mit
 *     ABSOLUTER Toleranz 1e-11 (1e-10 bei n = 100 000; die Subtraktion löscht aus; das ist PSPPs Grenze, nicht die des Bauers).
 *   - Dichten (PDF.*) und stetige Quantile (IDF.*) wie bei R.
 * TOLERANZEN: relativ 1e-9 (gemessen: PSPP hält das überall außer an den im Test benannten Ausnahmen). */
import { beforeAll, describe, expect, it } from 'vitest';
import { nodeEngine } from './testengine';
import erwartet from './testdaten/welle6-erwartet.json';

type Zahl = number | string | null;
const num = (v: Zahl | undefined): number => (v === 'Inf' ? Infinity : v === '-Inf' ? -Infinity : (v as number));
interface Pkt { x: number; links: number; rechts: number; dichte?: number | null; linksStreng?: number; rechtsStreng?: number }
interface Fall { art: string; params: Record<string, number>; punkte: Pkt[]; quantile: { p: number; x: Zahl; erreicht?: number | null }[] }
const L1 = (erwartet as unknown as { l1: { stetig: Fall[]; diskret: Fall[] } }).l1;
const name = (f: Fall) => `${f.art}(${Object.entries(f.params).map(([k, v]) => `${k}=${v}`).join(', ')})`;
const rund = (p: number) => Number(p.toPrecision(12));

let e: Awaited<ReturnType<typeof nodeEngine>>;
beforeAll(async () => { e = await nodeEngine(); });

/** Eine Zeile je Punkt: Spalten x a b c; `ausdruck` rechnet daraus v. Gibt die Zahlen von v (volle Genauigkeit der Tabelle) zurück. */
function rechne(zeilen: number[][], ausdruck: string): number[] {
  if (!zeilen.length) return [];
  const daten = zeilen.map(z => z.map(v => String(v)).join(' ')).join('\n');
  const it = e.run(`NEW FILE.\nDATA LIST FREE /x (F40.0) a (F40.0) b (F40.0) c (F40.0).\nBEGIN DATA\n${daten}\nEND DATA.\nCOMPUTE v = ${ausdruck}.\nLIST v.\n`);
  const fehler = it.find(i => i.type === 'message' && (i as { severity?: string }).severity === 'error');
  if (fehler) throw new Error(`PSPP: ${(fehler as { text: string }).text.split('\n')[0]}  [${ausdruck}]`);
  const t = it.find(i => i.type === 'table') as { cells: { r: number; c: number; n?: number; t: string }[] };
  const w = t.cells.filter(c => c.r >= 1).sort((p, q) => p.r - q.r).map(c => (c.n ?? NaN));
  expect(w.length, `Zeilenzahl für ${ausdruck}`).toBe(zeilen.length);
  return w;
}
/** Relativ `tol`, wenn Sollwert ≥ 1e-12; darunter relativ `lockerKlein`. Sollwert 0 → |ist| ≤ 1e-300. */
function nah(ist: number, soll: number, was: string, tol = 1e-9, lockerKlein = 1e-6) {
  if (soll === 0) { expect(Math.abs(ist), `${was}: soll 0, ist ${ist}`).toBeLessThanOrEqual(1e-300); return; }
  const t = Math.abs(soll) >= 1e-12 ? tol : lockerKlein;
  expect(Math.abs(ist - soll), `${was}: PSPP ${ist}, R ${soll}, relativ ${Math.abs(ist - soll) / Math.abs(soll)}`).toBeLessThanOrEqual(t * Math.abs(soll));
}

/** Gemessen (16.10.): PSPP 2.1.1 stimmt mit R an allen hier geprüften Punkten auf relativ 1e-9 überein, auch in den Rändern bis 1e-300 - ausgenommen die oben und im Test
 *  genannten Fehlwerte (t bei |x| > 1e100, IDF.T bei p = 1e-300, IDF.F bei p = 0,999999, CDF.HYPER außerhalb des Trägers). Darum überall 1e-9. */
const LOCKER = { klein: 1e-9, dichteStetig: 1e-9, binomGross: 1e-9 };

describe('PSPP 2.1.1 CDF/PDF/IDF gegen R: stetige Verteilungen', () => {
  const cdf: Record<string, string> = { normal: 'CDF.NORMAL(x, a, b)', t: 'CDF.T(x, a)', chi2: 'CDF.CHISQ(x, a)', f: 'CDF.F(x, a, b)' };
  const pdf: Record<string, string> = { normal: 'PDF.NORMAL(x, a, b)', t: 'PDF.T(x, a)', chi2: 'PDF.CHISQ(x, a)', f: 'PDF.F(x, a, b)' };
  const idf: Record<string, string> = { normal: 'IDF.NORMAL(x, a, b)', t: 'IDF.T(x, a)', chi2: 'IDF.CHISQ(x, a)', f: 'IDF.F(x, a, b)' };
  const par = (f: Fall): number[] => (f.art === 'normal' ? [f.params.mu!, f.params.sigma!] : f.art === 't' || f.art === 'chi2' ? [f.params.df!, 0] : [f.params.d1!, f.params.d2!]);
  for (const f of L1.stetig) {
    it(`${name(f)}: P(X ≤ x), Dichte, Quantile (und P(X ≥ x) über Symmetrie bei Normal und t)`, () => {
      const [a, b] = par(f);
      // PSPP-Grenzen (gemessen): bei |x| > 1e100 rechnet PSPP t(df=1) auf 0 (Unterlauf in der Beta-Funktion) - diese Randpunkte prüft nur R gegen das neue Modul.
      const pk = f.punkte.filter(p => !((f.art === 'chi2' || f.art === 'f') && p.x <= 0) && Math.abs(p.x) <= 1e100);
      const links = rechne(pk.map(p => [p.x, a!, b!, 0]), cdf[f.art]!);
      pk.forEach((p, i) => nah(links[i]!, p.links, `${name(f)} x=${p.x} P(X≤x)`, 1e-9, LOCKER.klein));
      const dp = pk.filter(p => p.dichte !== null && p.dichte !== undefined && p.dichte > 0);
      if (dp.length) { const d = rechne(dp.map(p => [p.x, a!, b!, 0]), pdf[f.art]!); dp.forEach((p, i) => nah(d[i]!, p.dichte as number, `${name(f)} x=${p.x} Dichte`, LOCKER.dichteStetig, LOCKER.klein)); }
      if (f.art === 'normal' || f.art === 't') {
        const sp = rechne(pk.map(p => [f.art === 'normal' ? 2 * a! - p.x : -p.x, a!, b!, 0]), cdf[f.art]!);
        pk.forEach((p, i) => nah(sp[i]!, p.rechts, `${name(f)} x=${p.x} P(X≥x) über Symmetrie`, 1e-9, LOCKER.klein));
      }
      // PSPP-Grenze (gemessen): IDF.T liefert bei p = 1e-300 -1.8e308 (Fehlwert), IDF.F bei p = 0,999999 nur 1,7e-5 relativ genau (Sollwert für F(1,1): tan²(πp/2), von R bestätigt).
      // Quantile deshalb nur für 0,001 ≤ p ≤ 0,999 gegen PSPP; die Ränder prüft R allein (Rückwärtsprobe im Skript).
      const qs = f.quantile.filter(q => q.p >= 0.001 && q.p <= 0.999 && Number.isFinite(num(q.x)) && num(q.x) !== 0);
      const ist = rechne(qs.map(q => [rund(q.p), a!, b!, 0]), idf[f.art]!);
      qs.forEach((q, i) => { const s = num(q.x); expect(Math.abs(ist[i]! - s), `${name(f)} Quantil p=${q.p}: PSPP ${ist[i]}, R ${s}`).toBeLessThanOrEqual(1e-8 * Math.abs(s)); });
    });
  }
});

describe('PSPP 2.1.1 CDF/PDF gegen R: diskrete Verteilungen', () => {
  const cdf: Record<string, string> = { binom: 'CDF.BINOM(x, a, b)', poisson: 'CDF.POISSON(x, a)', hyper: 'CDF.HYPER(x, a, b, c)' };
  const pdf: Record<string, string> = { binom: 'PDF.BINOM(x, a, b)', poisson: 'PDF.POISSON(x, a)', hyper: 'PDF.HYPER(x, a, b, c)' };
  const par = (f: Fall): number[] => (f.art === 'binom' ? [f.params.n!, f.params.p!, 0] : f.art === 'poisson' ? [f.params.lambda!, 0, 0] : [f.params.N!, f.params.K!, f.params.n!]);
  for (const f of L1.diskret) {
    it(`${name(f)}: P(X ≤ k), P(X < k), P(X = k) und 1 − P (absolut 1e-11) an den ganzzahligen Gitterpunkten`, () => {
      const [a, b, c] = par(f);
      // PSPP liefert außerhalb des Trägers bei CDF.HYPER einen Fehlwert (-1,8e308) statt 1: diese Randpunkte prüft nur R.
      const trag = f.art === 'hyper' ? [Math.max(0, f.params.n! - (f.params.N! - f.params.K!)), Math.min(f.params.n!, f.params.K!)] : [0, Infinity];
      const pk = f.punkte.filter(p => Number.isInteger(p.x) && p.x >= trag[0]! && p.x <= trag[1]!);
      const tolGross = f.art === 'binom' && f.params.n! >= 100000 ? LOCKER.binomGross : 1e-9;
      const l = rechne(pk.map(p => [p.x, a!, b!, c!]), cdf[f.art]!);
      pk.forEach((p, i) => nah(l[i]!, p.links, `${name(f)} k=${p.x} P(X≤k)`, tolGross, LOCKER.klein));
      const s = pk.filter(p => p.x >= 1);
      if (s.length) { const ls = rechne(s.map(p => [p.x - 1, a!, b!, c!]), cdf[f.art]!); s.forEach((p, i) => nah(ls[i]!, p.linksStreng as number, `${name(f)} k=${p.x} P(X<k)`, tolGross, LOCKER.klein)); }
      const absTol = f.art === 'binom' && f.params.n! >= 100000 ? 1e-10 : 1e-11;      // 1 − CDF: Auslöschung, bei n = 100 000 summiert PSPP mit etwa 1e-12 Rest
      pk.forEach((p, i) => expect(Math.abs(1 - l[i]! - (p.rechtsStreng as number)), `${name(f)} k=${p.x}: 1 − CDF gegen P(X>k)`).toBeLessThanOrEqual(absTol));
      const dp = pk.filter(p => (p.dichte as number) > 0);
      if (dp.length) { const d = rechne(dp.map(p => [p.x, a!, b!, c!]), pdf[f.art]!); dp.forEach((p, i) => nah(d[i]!, p.dichte as number, `${name(f)} k=${p.x} P(X=k)`, tolGross, LOCKER.klein)); }
    });
  }
  it('Quantil als Gegenprobe über PSPP: q ist das kleinste k mit CDF(k) ≥ p (Binomial, Poisson, hypergeometrisch), 3 Gitter', () => {
    for (const f of L1.diskret.filter(x => (x.art === 'binom' && x.params.n! <= 1000) || x.art === 'poisson' || x.art === 'hyper')) {
      const [a, b, c] = par(f);
      for (const q of f.quantile) {
        const k = num(q.x);
        if (!Number.isFinite(k) || q.p <= 0 || q.p >= 1) continue;
        const p = rund(q.p);
        const [auf] = rechne([[k, a!, b!, c!]], cdf[f.art]!);
        expect(auf! >= p * (1 - 1e-12), `${name(f)} p=${q.p}: CDF(${k}) = ${auf} ≥ p`).toBe(true);
        if (k > 0) { const [unter] = rechne([[k - 1, a!, b!, c!]], cdf[f.art]!); expect(unter! < p * (1 + 1e-12), `${name(f)} p=${q.p}: CDF(${k - 1}) = ${unter} < p`).toBe(true); }
      }
    }
  });
});
