/* Welle 6, Kachel L3 „Anteilstest verstehen“ (Fachblatt docs/fachblaetter/WELLE6-VERSTEHEN.md, „Entscheidungen Opus“, v. a. F4): Sollwerte aus R (scripts/welle6-erwartet.R, Abschnitt L3).
 * Der Bauer darf Sollwerte und Toleranzen NICHT ändern. Rot, bis lib/anteilstest.ts existiert.
 *
 * API von lib/anteilstest.ts (festgelegt vom Prüfer; reine Funktionen; die Binomialverteilung darf aus lib/verteilungen.ts kommen):
 *   type Seite = 'links' | 'rechts' | 'zwei'          (links: H1 p < p0; rechts: H1 p > p0; zwei: H1 p ≠ p0)
 *   ablehnungsbereich(n, p0, alpha, seite) → { links: number | null, rechts: number | null, tatsaechlichAlpha: number, leer: boolean }
 *        K = {0, …, links} ∪ {rechts, …, n}; null = dieser Teil ist leer. SCHULKONVENTION: rechts g = kleinstes g mit P(X ≥ g) ≤ α, links k = größtes k mit P(X ≤ k) ≤ α, zweiseitig α/2 JE SEITE;
 *        „≤ α“ mit relativer Toleranz 1e-7 (P ≤ α·(1 + 1e-7), wie R bei Gleichheit, z. B. P = 0,05 genau). tatsaechlichAlpha = P(X ∈ K | p0) (0 bei leerem K). Brute Force im Test, nicht qbinom-Trick.
 *   pWert(n, p0, x, seite) → number                    einseitig P(X ≤ x) bzw. P(X ≥ x); zweiseitig NACH VERDOPPLUNG min(1, 2·min(P(X ≤ x), P(X ≥ x))) (Entscheidung Opus F4; zweite Quelle exactci „central“)
 *   fehlerZweiterArt(n, p0, alpha, seite, p1) → { beta, teststaerke }       beta = P(X ∉ K | p1), teststaerke = P(X ∈ K | p1), BEIDE direkt summiert (nicht 1 − andere Zahl)
 *   prognoseintervall(n, p0, alpha) → { a, b, relA, relB, wahrscheinlichkeit, sigmaVon, sigmaBis }     zweiseitig = KOMPLEMENT von K: [links+1, rechts−1]; relA = a/n, relB = b/n;
 *        wahrscheinlichkeit = P(a ≤ X ≤ b) ≥ 1 − α; sigmaVon/Bis = μ ∓ z(1−α/2)·σ (Vergleichswert, nicht gerundet)
 *   anteilstest({ n, p0, alpha, seite, x?, p1? }) → { bereich, pWert?, ablehnen?, beta?, teststaerke?, prognose? }
 *        bereich = ablehnungsbereich(…); pWert und ablehnen nur mit x (ablehnen = x ∈ K); beta/teststaerke nur mit p1; prognose nur bei seite 'zwei'.
 * TOLERANZEN: Wahrscheinlichkeiten relativ 1e-9 wenn Sollwert ≥ 1e-12, darunter relativ 1e-6; Sollwert < 1e-290 → |ist| ≤ 1e-280. Grenzen k, g, a, b exakt (ganze Zahlen).
 * Entscheidung F4 (Opus): Mit der Verdopplung gilt x ∈ K ⟺ p ≤ α - Entscheidung und p-Wert widersprechen sich nie; der Test prüft das für das ganze Gitter. binom.test (Summe kleinerer
 * Wahrscheinlichkeiten) steht nur zur Information im JSON und wird NICHT verlangt. */
import { describe, expect, it } from 'vitest';
import { ablehnungsbereich, anteilstest, fehlerZweiterArt, pWert, prognoseintervall } from './anteilstest';
import erwartet from './testdaten/welle6-erwartet.json';

type Seite = 'links' | 'rechts' | 'zwei';
interface Fall {
  n: number; p0: number; alpha: number; seite: Seite; links: number | null; rechts: number | null; alpha_tats: number; leer: boolean; nK: number;
  p1: { p1: number; beta: number; power: number }[];
  prognose?: { a: number; b: number; relA: number; relB: number; qbinom_a: number; qbinom_b: number; gleichheit: boolean; p_im_intervall: number; sigma_von: number; sigma_bis: number };
}
const L3 = (erwartet as unknown as { l3: { faelle: Fall[]; pwerte: { n: number; p0: number; seite: Seite; p: number[]; binomtest_zur_information: number[] | null }[]; gleichheit: any[]; f4: any } }).l3;
const GEDRUCKT = (erwartet as unknown as { gedruckt: any[] }).gedruckt;
const LEQ = (p: number, alpha: number) => p <= alpha * (1 + 1e-7);

function nah(ist: number, soll: number, was: string, rel = 1e-9) {
  expect(Number.isNaN(ist), `${was}: NaN`).toBe(false);
  if (soll < 1e-290) { expect(Math.abs(ist), `${was}: soll ~0, ist ${ist}`).toBeLessThanOrEqual(1e-280); return; }
  const t = Math.abs(soll) >= 1e-12 ? rel : 1e-6;
  expect(Math.abs(ist - soll), `${was}: ist ${ist}, soll (R) ${soll}, relativ ${Math.abs(ist - soll) / Math.abs(soll)}`).toBeLessThanOrEqual(t * Math.abs(soll));
}
const nm = (f: Fall) => `n=${f.n} p0=${f.p0} α=${f.alpha} ${f.seite}`;

describe(`L3 Ablehnungsbereich K und tatsächliches α (Schulkonvention) - Gitter ${L3.faelle.length} Fälle`, () => {
  it('K (links k, rechts g), leer, tatsächliches α wie die Brute-Force-Schleife in R', () => {
    for (const f of L3.faelle) {
      const a = ablehnungsbereich(f.n, f.p0, f.alpha, f.seite);
      expect(a.links, `${nm(f)}: größtes k mit P(X ≤ k) ≤ α${f.seite === 'zwei' ? '/2' : ''}`).toBe(f.links);
      expect(a.rechts, `${nm(f)}: kleinstes g mit P(X ≥ g) ≤ α${f.seite === 'zwei' ? '/2' : ''}`).toBe(f.rechts);
      expect(a.leer, `${nm(f)}: leer`).toBe(f.leer);
      if (f.alpha_tats === 0) expect(a.tatsaechlichAlpha, `${nm(f)}: tatsächliches α bei leerem K`).toBe(0); else nah(a.tatsaechlichAlpha, f.alpha_tats, `${nm(f)} tatsächliches α`);
      expect(a.tatsaechlichAlpha, `${nm(f)}: tatsächliches α ≤ gewähltes α`).toBeLessThanOrEqual(f.alpha * (1 + 1e-7));
    }
  });
  it('das Gitter enthält leere K („Bei diesem n kann H0 nie abgelehnt werden“): mindestens 30 Fälle, darunter n = 5 mit α = 1 %', () => {
    const leer = L3.faelle.filter(f => f.leer);
    expect(leer.length).toBeGreaterThanOrEqual(30);
    const a = ablehnungsbereich(5, 0.5, 0.01, 'rechts');
    expect(a.leer).toBe(true); expect(a.rechts).toBeNull(); expect(a.links).toBeNull(); expect(a.tatsaechlichAlpha).toBe(0);
  });
  it('Gleichheit P = α (Toleranz 1e-7): n = 1, p0 = 0,05, α = 0,05 rechts → K = {1}; n = 2, p0 = 0,5, α = 0,25 → links {0}, rechts {2}; n = 4, α = 1/16 → links {0}', () => {
    for (const g of L3.gleichheit) {
      const a = ablehnungsbereich(g.n, g.p0, g.alpha, g.seite);
      expect([a.links, a.rechts], `n=${g.n} p0=${g.p0} α=${g.alpha} ${g.seite}`).toEqual([g.links_k, g.rechts_g]);
      nah(a.tatsaechlichAlpha, g.alpha_tats, `n=${g.n} α-tats`);
    }
  });
  it('Rechenproben des Fachblatts (n = 100, p0 = 0,5, α = 5 %): rechts g = 59 (α 0,04431); links k = 41; zweiseitig K = {0..39} ∪ {61..100} (α 0,0352)', () => {
    const r = ablehnungsbereich(100, 0.5, 0.05, 'rechts'), l = ablehnungsbereich(100, 0.5, 0.05, 'links'), z = ablehnungsbereich(100, 0.5, 0.05, 'zwei');
    expect([r.links, r.rechts]).toEqual([null, 59]); expect(Math.round(r.tatsaechlichAlpha * 1e5) / 1e5).toBe(0.04431);
    expect([l.links, l.rechts]).toEqual([41, null]);
    expect([z.links, z.rechts]).toEqual([39, 61]); expect(Math.round(z.tatsaechlichAlpha * 1e4) / 1e4).toBe(0.0352);
  });
});

describe('L3 p-Wert: einseitig exakt, zweiseitig nach Verdopplung (Entscheidung F4)', () => {
  it('alle x von 0 bis n für das ganze Gitter (n × p0 × Seite), gegen R und gegen exactci „central“', () => {
    for (const g of L3.pwerte) for (let x = 0; x <= g.n; x++) nah(pWert(g.n, g.p0, x, g.seite), g.p[x]!, `n=${g.n} p0=${g.p0} ${g.seite} x=${x}`);
  }, 60000);
  it('Beispiel F4: n = 40, p0 = 0,4, x = 7: Verdopplung 0,004107 (nicht der binom.test-Wert 0,003275); gleich exactci „central“', () => {
    const p = pWert(40, 0.4, 7, 'zwei');
    expect(Math.round(p * 1e6) / 1e6).toBe(0.004107); nah(p, L3.f4.p_exactci_central, 'exactci central'); expect(Math.abs(p - L3.f4.p_binomtest)).toBeGreaterThan(5e-4);
  });
  it('bei p0 = 0,5 sind Verdopplung und binom.test gleich (Fachblatt); der Deckel bei 1 gilt (x in der Mitte)', () => {
    for (const g of L3.pwerte.filter(h => h.p0 === 0.5 && h.seite === 'zwei' && h.binomtest_zur_information)) for (let x = 0; x <= g.n; x++) nah(g.p[x]!, g.binomtest_zur_information![x]!, `Information n=${g.n} x=${x}`);
    expect(pWert(10, 0.5, 5, 'zwei')).toBe(1); expect(pWert(11, 0.5, 5, 'zwei')).toBeLessThanOrEqual(1);
  });
  it('Entscheidung und p-Wert widersprechen sich nie: x ∈ K ⟺ p ≤ α (Toleranz 1e-7) für das ganze Gitter, mit den Funktionen des Moduls', () => {
    for (const f of L3.faelle) {
      const a = ablehnungsbereich(f.n, f.p0, f.alpha, f.seite), halb = (k: number) => (a.links !== null && k <= a.links) || (a.rechts !== null && k >= a.rechts);
      for (let x = 0; x <= f.n; x++) expect(halb(x), `${nm(f)} x=${x}: p=${pWert(f.n, f.p0, x, f.seite)}`).toBe(LEQ(pWert(f.n, f.p0, x, f.seite), f.alpha));
    }
  }, 120000);
});

describe('L3 Fehler 2. Art und Teststärke (direkt summiert)', () => {
  it('β und 1 − β für p1 = p0 ± 0,1 / ± 0,2 im ganzen Gitter, auch wenn K leer ist (β = 1, Teststärke 0)', () => {
    for (const f of L3.faelle) for (const q of f.p1) {
      const r = fehlerZweiterArt(f.n, f.p0, f.alpha, f.seite, q.p1);
      nah(r.beta, q.beta, `${nm(f)} p1=${q.p1} β`); if (q.power === 0) expect(r.teststaerke, `${nm(f)} p1=${q.p1} Teststärke 0`).toBe(0); else nah(r.teststaerke, q.power, `${nm(f)} p1=${q.p1} Teststärke`);
    }
  }, 60000);
  it('Rechenprobe n = 100, p0 = 0,5, α = 5 %, rechtsseitig, p1 = 0,6: β = 0,3775, Teststärke 0,6225', () => {
    const r = fehlerZweiterArt(100, 0.5, 0.05, 'rechts', 0.6);
    expect(Math.round(r.beta * 1e4) / 1e4).toBe(0.3775); expect(Math.round(r.teststaerke * 1e4) / 1e4).toBe(0.6225);
  });
});

describe('L3 Prognoseintervall (zweiseitig = Komplement von K)', () => {
  it('a, b, a/n, b/n, P(a ≤ X ≤ b) ≥ 1 − α und μ ∓ z·σ für alle zweiseitigen Gitterfälle', () => {
    for (const f of L3.faelle.filter(x => x.seite === 'zwei' && !x.leer)) {
      const p = prognoseintervall(f.n, f.p0, f.alpha), s = f.prognose!;
      expect([p.a, p.b], `${nm(f)} [a; b]`).toEqual([s.a, s.b]);
      nah(p.relA, s.relA, `${nm(f)} a/n`, 1e-12); nah(p.relB, s.relB, `${nm(f)} b/n`, 1e-12);
      nah(p.wahrscheinlichkeit, s.p_im_intervall, `${nm(f)} P(a ≤ X ≤ b)`); expect(p.wahrscheinlichkeit).toBeGreaterThanOrEqual(1 - f.alpha - 1e-9);
      expect(Math.abs(p.sigmaVon - s.sigma_von), `${nm(f)} μ − zσ`).toBeLessThanOrEqual(1e-9 * Math.max(1, Math.abs(s.sigma_von))); expect(Math.abs(p.sigmaBis - s.sigma_bis), `${nm(f)} μ + zσ`).toBeLessThanOrEqual(1e-9 * Math.max(1, Math.abs(s.sigma_bis)));
    }
  });
  it('Prüfeigenschaft: Prognoseintervall = Komplement von K; im Gitter ohne Gleichheit ist es auch [qbinom(α/2); qbinom(1 − α/2)] (Fachblatt)', () => {
    for (const f of L3.faelle.filter(x => x.seite === 'zwei' && !x.leer)) {
      const a = ablehnungsbereich(f.n, f.p0, f.alpha, 'zwei'), p = prognoseintervall(f.n, f.p0, f.alpha);
      expect(p.a, nm(f)).toBe((a.links ?? -1) + 1); expect(p.b, nm(f)).toBe((a.rechts ?? f.n + 1) - 1);
      if (!f.prognose!.gleichheit) expect([p.a, p.b], `${nm(f)} gegen qbinom`).toEqual([f.prognose!.qbinom_a, f.prognose!.qbinom_b]);
    }
  });
  it('Rechenprobe n = 100, p0 = 0,5, α = 5 %: [40; 60] (relativ 0,40 bis 0,60); Sigma-Näherung 40,2 bis 59,8', () => {
    const p = prognoseintervall(100, 0.5, 0.05);
    expect([p.a, p.b, p.relA, p.relB]).toEqual([40, 60, 0.4, 0.6]); expect(Math.abs(p.sigmaVon - (50 - 1.959963984540054 * 5))).toBeLessThan(1e-9); expect(Math.abs(p.sigmaBis - (50 + 1.959963984540054 * 5))).toBeLessThan(1e-9);
  });
});

describe('L3 anteilstest() als Ganzes', () => {
  it('n = 100, p0 = 0,5, α = 5 %, rechts, x = 60, p1 = 0,6: ablehnen (60 ≥ 59), p = P(X ≥ 60), β 0,3775', () => {
    const r = anteilstest({ n: 100, p0: 0.5, alpha: 0.05, seite: 'rechts', x: 60, p1: 0.6 });
    expect(r.ablehnen).toBe(true); nah(r.pWert!, 0.02844396682049041, 'p = P(X ≥ 60)'); expect(Math.round(r.beta! * 1e4) / 1e4).toBe(0.3775); expect(r.prognose).toBeUndefined();
    expect(r.bereich.rechts).toBe(59);
  });
  it('ohne x kein p-Wert und keine Entscheidung; ohne p1 kein β; zweiseitig mit Prognose; Grenze der Entscheidung bei g = 59: x = 58 nicht ablehnen, x = 59 ablehnen', () => {
    const r = anteilstest({ n: 100, p0: 0.5, alpha: 0.05, seite: 'zwei' });
    expect(r.pWert).toBeUndefined(); expect(r.ablehnen).toBeUndefined(); expect(r.beta).toBeUndefined(); expect(r.prognose).toBeDefined();
    expect(anteilstest({ n: 100, p0: 0.5, alpha: 0.05, seite: 'rechts', x: 58 }).ablehnen).toBe(false); expect(anteilstest({ n: 100, p0: 0.5, alpha: 0.05, seite: 'rechts', x: 59 }).ablehnen).toBe(true);
  });
  it('zweiseitig mit n = 40, p0 = 0,4, x = 7 und α = 1 %: p = 0,004107 ≤ 0,01 und x ∈ K - kein Widerspruch (der binom.test-Wert 0,003275 spielt keine Rolle)', () => {
    const r = anteilstest({ n: 40, p0: 0.4, alpha: 0.01, seite: 'zwei', x: 7 });
    expect(Math.round(r.pWert! * 1e6) / 1e6).toBe(0.004107); expect(r.ablehnen).toBe(r.pWert! <= 0.01 * (1 + 1e-7));
  });
});

describe('L3 gedruckte Beispiele (Lehrerfortbildung Baden-Württemberg, selbst gelesen; Prüfstatus im JSON)', () => {
  it('Speicherchips n = 150, H0: p = 0,2, linksseitig, 5 %: K = {0, …, 21}, Irrtumswahrscheinlichkeit 3,7 %', () => {
    const b = GEDRUCKT.find(g => g.kachel === 'L3' && /Speicherchips/.test(g.name))!;
    const a = ablehnungsbereich(b.n, b.p0, b.alpha, 'links');
    expect(a.links).toBe(b.k); expect(Math.round(a.tatsaechlichAlpha * 1000) / 10).toBe(b.alpha_tats_prozent);
  });
  it('Würfel p0 = 1/6, p1 = 1/8, linksseitig 5 %: n = 50 → {0..3}, α 2,4 %, β 88,6 % · n = 100 → {0..10}, 4,3 %, 71,9 % · n = 1000 → {0..146}, 4,2 %, 2,2 %', () => {
    const b = GEDRUCKT.find(g => g.kachel === 'L3' && /Würfel/.test(g.name))!;
    for (const z of b.zeilen) {
      const a = ablehnungsbereich(z.n, 1 / 6, 0.05, 'links'), f = fehlerZweiterArt(z.n, 1 / 6, 0.05, 'links', 1 / 8);
      expect(a.links, `n=${z.n}`).toBe(z.k); expect(Math.round(a.tatsaechlichAlpha * 1000) / 10, `n=${z.n} α`).toBe(z.alpha_prozent); expect(Math.round(f.beta * 1000) / 10, `n=${z.n} β`).toBe(z.beta_prozent);
    }
  });
});
