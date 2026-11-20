import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { type HodgesLehmann, holm, kruskalWallis, mannWhitney, median, rangDaten, rangVorschlag, schiefe, sprichtFuerRang, wilcoxon } from './rangtests';
import { nodeEngine } from './testengine';
import { s, type Blatt } from './sitzung.svelte';
import { saetzeRang, tabellenRang, rangVorschlagText } from './rangsaetze';
import { berichtSatz, berichtTabellen, excelTabellen, saetzeZu, rangVon } from './berichtsatz';
import { rangBefehl } from './rangtests';
import { finde } from './tabelle';
import { fp } from './mwsaetze';

/* Vergleichswerte aus R (Skript: scripts/rangtests-erwartet.R): wilcox.test(exact = FALSE, correct = FALSE) - das ist `pNaeherung`; bei kleinen Gruppen ohne Bindungen zeigt `p` den exakten Wert (exakteTests.test.ts), kruskal.test, Dunn nach Formel in Basis-R,
 * kontrolliert gegen das Paket dunn.test; Effektstärken gegen das Paket effectsize. Die Rohwerte stehen in der JSON-Datei. */
interface Hl { hl: number; hlR: number; hlUnten: number; hlOben: number; hlExakt: { methode: string; schaetzer: number; unten: number; oben: number } }
interface Mw extends Hl { name: string; x: number[]; y: number[]; n1: number; n2: number; U1: number; U2: number; z: number; p: number; r: number; rb: number; med1: number; med2: number }
interface Wx extends Hl { name: string; vorher: number[]; nachher: number[]; N: number; nNull: number; vp: number; vm: number; z: number; p: number; r: number; rb: number; med1: number; med2: number; medDiff: number }
interface Kw { name: string; gruppen: string[]; n: number[]; y: number[][]; N: number; H: number; df: number; p: number; eps2: number; meanRank: number[]; med: number[]; dunn: { i: number; j: number; z: number; p: number; pHolm: number }[] }
const R = JSON.parse(readFileSync(new URL('./testdaten/rangtests-erwartet.json', import.meta.url), 'utf8')) as { mw: Mw[]; wilcoxon: Wx[]; kw: Kw[] };
const nah = (a: number, b: number, tol = 1e-9) => expect(Math.abs(a - b) / Math.max(1, Math.abs(b))).toBeLessThan(tol);

describe('Hilfen', () => {
  it('p in Tabellen: unter ,001 immer „< .001“, auch zwischen ,0005 und ,001 (B4, wie pWert im Satz)', () => {
    expect((fp(0.000507) as { t: string }).t).toBe('< .001'); expect((fp(0.00099) as { t: string }).t).toBe('< .001');
    expect((fp(0.001) as { t: string }).t).toBe('.001'); expect((fp(0.0432) as { t: string }).t).toBe('.043');
  });
  it('Ränge mit Bindungen und Σ(t³ − t)', () => { expect(rangDaten([10, 20, 20, 5])).toEqual({ rang: [2, 3.5, 3.5, 1], bindung: 6 }); });
  it('Median', () => { expect(median([3, 1, 2])).toBe(2); expect(median([4, 1, 3, 2])).toBe(2.5); });
  it('Schiefe wie SPSS (G1)', () => { nah(schiefe([1, 2, 3, 4, 20]), 2.1250505876, 1e-9); expect(Number.isNaN(schiefe([1, 2]))).toBe(true); });
  it('Holm wie R p.adjust', () => { expect(holm([0.01, 0.04, 0.03, 0.2]).map(v => +v.toFixed(6))).toEqual([0.04, 0.09, 0.09, 0.2]); });
});

/* Hodges-Lehmann: Schätzer = Median der Differenzen (genau); KI = Rs wilcox.test(conf.int = TRUE, exact = FALSE, correct = FALSE), das die Grenze mit
 * uniroot (tol 1e-4) sucht - Statable nimmt die Sprungstelle selbst, darum Vergleich auf 2e-4. Rs Schätzer im genäherten Fall (Nullstelle von z) liegt nahe am Median. */
function hlGleich(h: HodgesLehmann | null, f: Hl) {
  expect(h).not.toBeNull();
  nah(h!.schaetzer, f.hl, 1e-12);
  if (h!.exakt) {   // kleine Gruppen ohne Bindungen: exaktes KI wie Rs Voreinstellung (hlExakt)
    expect(Math.abs(h!.unten! - f.hlExakt.unten)).toBeLessThan(1e-9); expect(Math.abs(h!.oben! - f.hlExakt.oben)).toBeLessThan(1e-9); return;
  }
  expect(Math.abs(h!.unten! - f.hlUnten)).toBeLessThan(2e-4);
  expect(Math.abs(h!.oben! - f.hlOben)).toBeLessThan(2e-4);
  expect(Math.abs(h!.schaetzer - f.hlR)).toBeLessThan(0.02);
  expect(h!.unten!).toBeLessThanOrEqual(h!.schaetzer); expect(h!.oben!).toBeGreaterThanOrEqual(h!.schaetzer);
}
/* Seit G9 (Fachblatt) sind Bindungen und Nullen im exakten Bereich exakt, und die Nullen entfallen vor dem Ranken. Die Werte in rangtests-erwartet.json stammen aus R mit Nullen
 * (Pratt) beziehungsweise aus der Näherung; für diese Fälle stehen hier Rs Werte auf den Differenzen OHNE Nullen (R 4.6.1, wilcox.test(d[d != 0], conf.int = TRUE)),
 * zusammen mit exakt, p und V: Schlaf  p = 0,00390625, HL 1,4, KI [1,1; 2,95], Niveau 0,9589844 (R auf den mit 10 skalierten Werten; R auf den Rohwerten gibt wegen Gleitkomma-Rauschen 0,9648438); Prä-Post p = 0,0009765625, HL 2,5, KI [1,5; 3,5], Niveau 0,9665527. */
const OHNE_NULLEN: Record<string, { p: number; hl: number; unten: number; oben: number; niveau: number }> = {
  'Schlaf (sleep)': { p: 0.00390625, hl: 1.4, unten: 1.1, oben: 2.95, niveau: 0.9589844 },
  'Prä-Post 14 Personen': { p: 0.0009765625, hl: 2.5, unten: 1.5, oben: 3.5, niveau: 0.9665527 }
};

describe('Mann-Whitney gegen R', () => {
  for (const f of R.mw) it(f.name, () => {
    const m = mannWhitney('y', 'g', { name: 'A', werte: f.x }, { name: 'B', werte: f.y })!;
    expect([m.a.n, m.b.n]).toEqual([f.n1, f.n2]);
    nah(m.uA, f.U1); nah(m.uB, f.U2); nah(m.u, Math.min(f.U1, f.U2)); nah(m.z, f.z); nah(m.pNaeherung, f.p); nah(m.p, m.exakt ? m.p : f.p);   // R-Werte hier: Normalnäherung; die exakten p stehen in exakteTests.test.ts nah(m.r, f.r); nah(m.rrb, f.rb);
    nah(m.a.median, f.med1); nah(m.b.median, f.med2);
    nah(m.ueberlegen, (f.rb + 1) / 2);
    hlGleich(m.hl, f);
  });
});

describe('Wilcoxon gegen R', () => {
  for (const f of R.wilcoxon) it(f.name, () => {
    const w = wilcoxon('a', 'b', f.vorher.map((v, i) => [v, f.nachher[i]!]))!;
    expect([w.n, w.nNull]).toEqual([f.N, f.nNull]);
    nah(w.vPlus, f.vp); nah(w.vMinus, f.vm); nah(w.z, f.z); nah(w.pNaeherung, f.p); nah(w.p, w.exakt ? w.p : f.p); nah(w.r, f.r); nah(w.rrb, f.rb);
    nah(w.medianVorher, f.med1); nah(w.medianNachher, f.med2); nah(w.medianDiff, f.medDiff);
    const ohne = f.nNull > 0 ? OHNE_NULLEN[f.name] : undefined;
    if (f.nNull > 0) {   // Nullen entfallen: exakt gegen R auf d[d != 0]
      expect(ohne, `Sollwert ohne Nullen für „${f.name}“`).toBeDefined();
      expect(w.exakt).toBe(true); nah(w.p, ohne!.p, 1e-9);
      expect(w.hl!.exakt).toBe(true); nah(w.hl!.schaetzer, ohne!.hl, 1e-9); nah(w.hl!.unten!, ohne!.unten, 1e-9); nah(w.hl!.oben!, ohne!.oben, 1e-9); nah(w.hl!.niveau!, ohne!.niveau, 1e-6);
    } else hlGleich(w.hl, f);
  });
});

describe('Kruskal-Wallis und Dunn (Holm) gegen R', () => {
  for (const f of R.kw) it(f.name, () => {
    const k = kruskalWallis('y', 'g', f.gruppen.map((g, i) => ({ wert: g, name: g, werte: f.y[i]! })))!;
    expect(k.gruppen.map(g => g.n)).toEqual(f.n);
    nah(k.h, f.H); expect(k.df).toBe(f.df); nah(k.p, f.p, 1e-7); nah(k.eps2, f.eps2);
    k.gruppen.forEach((g, i) => { nah(g.mittlererRang, f.meanRank[i]!); nah(g.median, f.med[i]!); });
    expect(k.dunn.length).toBe(f.dunn.length);
    k.dunn.forEach((q, i) => { expect([q.i, q.j]).toEqual([f.dunn[i]!.i - 1, f.dunn[i]!.j - 1]); nah(q.z, f.dunn[i]!.z); nah(q.p, f.dunn[i]!.p, 1e-7); nah(q.pHolm, f.dunn[i]!.pHolm, 1e-7); });
  });
});

describe('Vorschlag (Abschlusstest F5: ohne „kleinste Gruppe < 20“)', () => {
  const gleich = (n: number, plus = 0) => Array.from({ length: n }, (_, i) => i + plus);
  it('kleine Gruppe allein ist kein Grund mehr', () => {
    const v = rangVorschlag([[1, 2, 3, 4, 5], gleich(30)]);
    expect(sprichtFuerRang(v)).toBe(false);
    expect(v).toEqual({ schief: null, ausreisser: null, stufen: null });
  });
  it('deutliche Schiefe', () => {
    const v = rangVorschlag([Array.from({ length: 30 }, (_, i) => (i < 27 ? 1 + (i % 9) : 40 + i)), gleich(30)]);
    expect(v.schief).toBeGreaterThan(1); expect(sprichtFuerRang(v)).toBe(true);
  });
  it('Ausreißer nach der Regel des Daten-Checks (2,2 · IQR, deutlich getrennt)', () => {
    const v = rangVorschlag([[...gleich(24), 95], gleich(25, 3)]);
    expect(v.ausreisser).toBe(1); expect(sprichtFuerRang(v)).toBe(true);
  });
  it('wenige Stufen (höchstens 7 verschiedene Werte) oder ordinal - dieselbe Regel wie bei der Korrelation', () => {
    const likert = (n: number) => Array.from({ length: n }, (_, i) => 1 + (i % 5));
    const v = rangVorschlag([likert(30), likert(28)], { art: 'stufen', spalten: ['Note'], stufen: 5 });
    expect(v.stufen).toEqual({ art: 'stufen', spalten: ['Note'], stufen: 5 }); expect(sprichtFuerRang(v)).toBe(true);
    expect(sprichtFuerRang(rangVorschlag([gleich(30), gleich(30, 2)], { art: 'ordinal', spalten: ['Rang'] }))).toBe(true);
  });
  it('nichts davon: kein Vorschlag', () => { expect(sprichtFuerRang(rangVorschlag([gleich(25), gleich(25, 3)]))).toBe(false); });
  it('alte Projektdatei { klein, schief }: „klein“ zählt nicht mehr', () => { expect(sprichtFuerRang({ klein: 8, schief: null } as never)).toBe(false); });
});

describe('Stufen-Regel (Abschlusstest F5): eine Regel für Korrelation und Rangtest', () => {
  it('stufenGrund: ordinal vor wenigen Stufen, sonst null', async () => {
    const { stufenGrund } = await import('./stufen');
    const c = { verschieden: (n: string) => ({ a: 30, b: 5, c: 8 } as Record<string, number>)[n]!, ordinal: (n: string) => n === 'o', bezeichnung: (n: string) => n.toUpperCase() };
    expect(stufenGrund(['a'], c)).toBeNull();
    expect(stufenGrund(['a', 'b'], c)).toEqual({ art: 'stufen', spalten: ['B'], stufen: 5 });
    expect(stufenGrund(['c'], c)).toBeNull();
    expect(stufenGrund(['o', 'b'], c)).toEqual({ art: 'ordinal', spalten: ['O'] });
  });
});

/* Gegenprobe mit der Engine: dieselben Zahlen wie PSPP NPAR TESTS (U, z, p / H, df, p / z, p). */
describe('gegen PSPP NPAR TESTS', () => {
  let e: Awaited<ReturnType<typeof nodeEngine>>;
  const f = R.wilcoxon[1]!, a = R.mw[0]!, k = R.kw[0]!;
  beforeAll(async () => { e = await nodeEngine(); });
  const zahlen = (r: ReturnType<typeof finde>) => r!.n.flat().filter((v): v is number => v !== undefined);
  it('Wilcoxon', () => {
    e.run('NEW FILE.\nDATA LIST LIST /prae post.\nBEGIN DATA\n' + f.vorher.map((v, i) => `${v} ${f.nachher[i]}`).join('\n') + '\nEND DATA.');
    const t = finde(e.run('NPAR TESTS /WILCOXON=prae WITH post (PAIRED).'), /^Test Statistics$/)!, z = zahlen(t);
    const w = wilcoxon('prae', 'post', f.vorher.map((v, i) => [v, f.nachher[i]!]))!;
    nah(Math.abs(z[0]!), Math.abs(w.z), 1e-9); nah(z[1]!, w.pNaeherung, 1e-9);   // PSPP rechnet die Normalnäherung (asymptotisch); p ist seit G9 exakt
  });
  it('Mann-Whitney', () => {
    const werte = [...a.x.map(v => [v, 1]), ...a.y.map(v => [v, 2])];
    e.run('NEW FILE.\nDATA LIST LIST /y g.\nBEGIN DATA\n' + werte.map(w => w.join(' ')).join('\n') + '\nEND DATA.');
    const z = zahlen(finde(e.run('NPAR TESTS /M-W=y BY g(1 2).'), /^Test Statistics$/));
    const m = mannWhitney('y', 'g', { name: 'A', werte: a.x }, { name: 'B', werte: a.y })!;
    nah(z[0]!, m.u, 1e-9); nah(Math.abs(z[2]!), Math.abs(m.z), 1e-9); nah(z[3]!, m.pNaeherung, 1e-9);   // PSPP: asymptotisches p
  });
  it('Kruskal-Wallis', () => {
    const werte = k.y.flatMap((g, i) => g.map(v => [v, i + 1]));
    e.run('NEW FILE.\nDATA LIST LIST /y g.\nBEGIN DATA\n' + werte.map(w => w.join(' ')).join('\n') + '\nEND DATA.');
    const z = zahlen(finde(e.run(`NPAR TESTS /K-W=y BY g(1 ${k.y.length}).`), /^Test Statistics$/));
    const r = kruskalWallis('y', 'g', k.gruppen.map((g, i) => ({ wert: g, name: g, werte: k.y[i]! })))!;
    nah(z[0]!, r.h, 1e-9); expect(z[1]).toBe(r.df); nah(z[2]!, r.p, 1e-6);
  });
});

/* Sätze, APA-Zeilen und Tabellen (Zahlen aus den R-Werten oben: Ozon Mai gegen August, Prä-Post mit 14 Personen, Ozon nach Monat). */
describe('Sätze und Tabellen', () => {
  const mwF = R.mw[0]!, wxF = R.wilcoxon[1]!, kwF = R.kw[0]!;
  const mw = mannWhitney('Ozon', 'Monat', { name: 'August', werte: mwF.y }, { name: 'Mai', werte: mwF.x })!;   // August zuerst: höhere Gruppe
  const wx = wilcoxon('prae', 'post', wxF.vorher.map((v, i) => [v, wxF.nachher[i]!]))!;
  const kw = kruskalWallis('Ozon', 'Monat', kwF.gruppen.map((g, i) => ({ wert: g, name: g, werte: kwF.y[i]! })))!;
  it('Mann-Whitney deutsch', () => {
    s.einst.sprache = 'de';
    const st = saetzeRang(mw, x => x);
    expect(st.haupt).toBe('Bei „Ozon“ lagen die Werte der Gruppe „August“ (Monat) im Rangvergleich höher als die der Gruppe „Mai“: Median 52 gegen 18.');
    expect(st.apa).toBe('U = 127,5, z = 3,85, p < ,001, r = ,53, rrb = ,62, HL = 32, 95,4 %-KI [15; 53]');   // exakt (G9): erreichtes Niveau 95,36 % weicht um mehr als 0,1 Punkte von 95 ab
    expect(st.zusatz).toContain('Der Unterschied ist groß (r = ,53');
    expect(st.zusatz).toContain('Der Median aller Differenzen zwischen je einer Person aus „August“ und einer aus „Mai“ beträgt 32 (Hodges-Lehmann-Schätzer, 95,4 %-KI [15; 53]). Mit diesen Fallzahlen lässt sich ein Niveau von genau 95 % nicht erreichen. Das Intervall hat ein Niveau von 95,4\u00a0%.');
    expect(st.zusatz).toContain('In 81\u00a0% aller Paare');
    expect(st.marken.map(m => m.text)).toEqual(['Unterschied: groß · r = ,53', 'p < ,001 (exakt) · unter ,05', 'Rang-biserial: ,62', 'Rangtest (ohne Normalverteilung)']);
  });
  it('Mann-Whitney englisch, nicht deutlich', () => {
    s.einst.sprache = 'en';
    const n = mannWhitney('len', 'supp', { name: 'OJ', werte: R.mw[1]!.x }, { name: 'VC', werte: R.mw[1]!.y })!;
    const st = saetzeRang(n, x => x);
    expect(st.apa).toBe('U = 324.5, z = 1.86, p = .064, r = .24, rrb = .28, HL = 4.00, 95% CI [−0.10, 8.50]');
    expect(st.zusatz).toContain('So the data do not show a difference');
    expect(st.marken.some(m => m.hinweis)).toBe(false);
    s.einst.sprache = 'de';
  });
  it('Mann-Whitney: Tabellen', () => {
    const t = tabellenRang(mw, x => x);
    expect(t.map(x => x.label)).toEqual(['Ranks', 'Mann-Whitney U Test', 'Hodges-Lehmann Estimate']);
    expect(t[1]!.cells.filter(c => c.n !== undefined).map(c => c.t)).toEqual(['127.5', '3.85', '< .001', '0.53', '0.62', '52']);
  });
  it('Wilcoxon', () => {
    s.einst.sprache = 'de';
    const st = saetzeRang(wx, x => (x === 'prae' ? 'Vorher' : 'Nachher'));
    expect(st.haupt).toBe('Bei „Nachher“ lag der Wert im Rangvergleich höher als bei „Vorher“: Median 15 gegen 12,5.');
    expect(st.zusatz).toContain('Bei 12 von 13 Personen mit einer Veränderung stieg der Wert, bei 1 sank er. 14 Paare, davon 1 ohne Unterschied; dieses geht nicht in den Test ein.');
    expect(st.zusatz).toContain('Der Pseudo-Median der Veränderung beträgt 2,50 (Hodges-Lehmann-Schätzer: Median der Mittelwerte aus je zwei Veränderungen, 96,7 %-KI [1,50; 3,50]). Mit diesen Fallzahlen lässt sich ein Niveau von genau 95 % nicht erreichen. Das Intervall hat ein Niveau von 96,7\u00a0%.');   // Nullen entfallen (G9)
    expect(st.apa).toBe('V = 89, z = 3,06, p < ,001, r = ,82, rrb = ,96, HL = 2,50, 96,7 %-KI [1,50; 3,50]');
    expect(st.marken.at(-1)!.text).toBe('Kleine Stichprobe (n = 14)');
    expect(tabellenRang(wx, x => x).map(x => x.label)).toEqual(['Ranks', 'Wilcoxon Signed Ranks Test', 'Hodges-Lehmann Estimate']);
  });
  it('Kruskal-Wallis mit Dunn (Holm)', () => {
    s.einst.sprache = 'de';
    const namen = kw.werte;
    const st = saetzeRang(kw, x => x, namen);
    expect(st.apa).toMatch(/^H\(4\) = 29,27, p < ,001, ε² = ,25; Dunn \(Holm\): /);
    expect(st.haupt).toMatch(/„Juli“ \(Monat\) im Rangvergleich am höchsten \(mittlerer Rang \d+,\d\d, Median 60\)/);
    expect(st.haupt).toMatch(/„Mai“ am niedrigsten \(mittlerer Rang \d+,\d\d, Median 18\)/);
    expect(st.zusatz).toContain('Dunn, Holm-angepasst für alle 10 Paare');
    const t = tabellenRang(kw, x => x, namen);
    expect(t.map(x => x.label)).toEqual(['Ranks', 'Kruskal-Wallis Test', 'Dunn Multiple Comparisons']);
    expect(t[2]!.rows).toBe(11);
  });
  it('Kruskal-Wallis nicht deutlich: keine Paarvergleiche', () => {
    const nein = kruskalWallis('y', 'g', [{ wert: 'a', name: 'a', werte: [1, 2, 3, 4, 5] }, { wert: 'b', name: 'b', werte: [2, 3, 4, 5, 6] }, { wert: 'c', name: 'c', werte: [1, 3, 4, 5, 7] }])!;
    expect(nein.p).toBeGreaterThan(0.05);
    expect(saetzeRang(nein, x => x, ['a', 'b', 'c']).apa).not.toContain('Dunn');
    expect(tabellenRang(nein, x => x, ['a', 'b', 'c']).map(x => x.label)).toEqual(['Ranks', 'Kruskal-Wallis Test']);
  });
  it('Vorschlagstext nennt den Grund, nicht „vorgeschlagen“ (F5)', () => {
    expect(rangVorschlagText({ schief: 1.5, ausreisser: null, stufen: null }, true)).toBe('Grund für einen Rangtest: Die Veränderungen sind deutlich schief verteilt (Schiefe = 1,50). Diese Wahl gehört vor das Rechnen (Prüfliste oben) - nicht erst nach dem Blick auf das Ergebnis.');
    expect(rangVorschlagText({ schief: null, ausreisser: 2, stufen: { art: 'stufen', spalten: ['Note'], stufen: 5 } })).toBe('Grund für einen Rangtest: 2 sehr auffällige Einzelwerte (Ausreißer) und „Note“ hat nur 5 verschiedene Werte. Diese Wahl gehört vor das Rechnen (Prüfliste oben) - nicht erst nach dem Blick auf das Ergebnis.');
    expect(rangVorschlagText({ schief: null, ausreisser: null, stufen: { art: 'ordinal', spalten: ['Rang'] } })).toContain('„Rang“ ist ordinal (nur die Reihenfolge der Werte zählt)');
    expect(rangVorschlagText({ schief: null, ausreisser: null, stufen: null })).toBe('Kein Grund für einen Rangtest: keine deutliche Schiefe, keine Ausreißer und mehr als 7 verschiedene Werte. Dann hält der Mittelwertvergleich auch bei kleinen Gruppen. Der Rangtest ist trotzdem möglich; er prüft eine etwas andere Frage (ob eine Gruppe tendenziell höhere Werte hat).');
    expect(rangVorschlagText({ klein: 8, schief: null } as never)).toContain('Kein Grund für einen Rangtest');
    expect(rangVorschlagText({ schief: null, ausreisser: null, stufen: null })).not.toMatch(/vorgeschlagen|20 Personen/);
  });
  it('Befehl für PSPP', () => {
    expect(rangBefehl(wx)).toBe('NPAR TESTS /WILCOXON=prae WITH post (PAIRED).');
    expect(rangBefehl(mw, "T-TEST GROUPS=monat(8 5)\n  /VARIABLES=ozon.")).toBe('NPAR TESTS /M-W=ozon BY monat(8 5).');
    expect(rangBefehl(kw)).toBe('* NPAR TESTS /K-W braucht Zahlen als Gruppenwerte (Gruppenspalte Monat).');
  });
  const blatt = (typ: string, rang: unknown, an: boolean): Blatt => ({ id: 'x', titel: 't', art: 'gruppen', l1: null, l2: null, syntax: '', items: [], ergebnis: { typ, e: {}, rang }, imBericht: true, notiz: '', zeit: 0, ...(an ? { rang: true } : {}) });
  it('Blatt: Rangtest nur, wenn gewählt und vorhanden (Bericht, Word, Excel)', () => {
    s.einst.sprache = 'de'; s.einst.bayes = false;
    expect(saetzeZu(blatt('zwei-gruppen', mw, true))!.apa).toContain('U = 127,5');
    expect(berichtSatz(blatt('zwei-gruppen', mw, true))).toMatch(/Statistik: U = 127,5/);
    expect(berichtTabellen(blatt('zwei-gruppen', mw, true)).map(x => x.label)).toEqual(['Ranks', 'Mann-Whitney U Test', 'Hodges-Lehmann Estimate']);
    expect((excelTabellen(blatt('zwei-gruppen', mw, true)) as { label: string }[]).map(x => x.label)).toEqual(['Ranks', 'Mann-Whitney U Test', 'Hodges-Lehmann Estimate']);
    // nicht gewählt oder noch nicht gerechnet (alte Projekte): kein Rangtest, es gilt der Mittelwertvergleich
    expect(rangVon(blatt('zwei-gruppen', mw, false))).toBeNull();
    expect(rangVon(blatt('zwei-gruppen', undefined, true))).toBeNull();
    expect(rangVon(blatt('anova', kw, true))).toBe(kw);
    expect(rangVon(blatt('zusammenhang', kw, true))).toBeNull();
  });
});

/* Nachtrag nach der Fachprüfung (G9/G10): Sonderfälle gepaart, Sätze, Tabelle. */
describe('Gepaart: Sonderfälle und Sätze (Fachprüfung)', () => {
  it('Meldungen: ein Paar / kein Paar mit Unterschied', async () => {
    const { wilcoxonGrundText } = await import('./ergebnis');
    s.einst.sprache = 'de';
    expect(wilcoxonGrundText('einPaar')).toBe('Nur ein Paar hat einen Unterschied. Damit lässt sich kein Test rechnen.');
    expect(wilcoxonGrundText('keinUnterschied')).toBe('Kein Paar hat einen Unterschied. Damit lässt sich nichts testen.');
  });
  it('Satz bei gleichem Median: eigener Satz statt „höher“; Tabelle mit „n im Test“', () => {
    s.einst.sprache = 'de';
    const w = wilcoxon('a', 'b', [[1, 2], [2, 3], [2, 3], [3, 3], [3, 3], [3, 3], [4, 4], [5, 5], [5, 5]])!;
    expect(w.medianNachher).toBe(w.medianVorher);
    const st = saetzeRang(w, x => x);
    expect(st.haupt).toBe('Bei „b“ lag der Median ebenso hoch wie bei „a“ (3), die Veränderungen gingen im Rangvergleich aber eher nach oben.');
    expect(st.zusatz).toContain('9 Paare, davon 6 ohne Unterschied; diese gehen nicht in den Test ein.');
    const t = JSON.stringify(tabellenRang(w, x => x));
    expect(t).toContain('n im Test'); expect(w.nTest).toBe(3);
  });
  it('Methodenzeile: „bedingte Verteilung“ nur bei gleichen Werten', () => {
    s.einst.sprache = 'de';
    const ohne = mannWhitney('y', 'g', { name: 'A', werte: [1.5, 2.5, 3.5, 4.5] }, { name: 'B', werte: [5.5, 6.5, 7.5, 8.5] })!;
    const mit = mannWhitney('y', 'g', { name: 'A', werte: [1, 2, 2, 4] }, { name: 'B', werte: [3, 6, 7, 8] })!;
    expect(JSON.stringify(tabellenRang(ohne, x => x))).not.toContain('bedingte Verteilung');
    expect(JSON.stringify(tabellenRang(mit, x => x))).toContain('bedingte Verteilung bei gleichen Werten');
  });
  it('alle Veränderungen gleich (nicht 0): Rangtest wird gerechnet, p = ,03125', () => {
    const w = wilcoxon('a', 'b', [[1, 2], [3, 4], [5, 6], [2, 3], [4, 5], [7, 8]])!;
    expect(w).not.toBeNull(); expect(w.exakt).toBe(true); nah(w.p, 0.03125);
  });
});
