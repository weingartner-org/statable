/* Welle 6, Kachel L1 „Verteilungen berechnen“ (Fachblatt docs/fachblaetter/WELLE6-VERSTEHEN.md, „Entscheidungen Opus“): Sollwerte aus R (scripts/welle6-erwartet.R →
 * testdaten/welle6-erwartet.json). Der Bauer darf Sollwerte und Toleranzen NICHT ändern.
 *
 * API von lib/verteilungen.ts (festgelegt vom Prüfer; reine Funktionen, kein DOM, kein Projektzustand):
 *   type Verteilung = { art: 'normal'; mu; sigma } | { art: 't'; df } | { art: 'chi2'; df } | { art: 'f'; d1; d2 } | { art: 'binom'; n; p } | { art: 'poisson'; lambda }
 *                   | { art: 'hyper'; N; K; n } | { art: 'eigen'; x: number[]; p: number[] }   (x in beliebiger Reihenfolge)
 *   links(v, x)        = P(X ≤ x)      linksStreng(v, x) = P(X < x)      rechts(v, x) = P(X ≥ x)      rechtsStreng(v, x) = P(X > x)     (obere Schwänze DIREKT, nie 1 − P)
 *   zwischen(v, a, b)  = P(a ≤ X ≤ b)  (a ≤ b)           dichte(v, x)  (diskret: Wahrscheinlichkeit, 0 bei nicht ganzzahligem x)
 *   quantil(v, p) → { x, erreicht }    R-Definition (diskret: kleinstes x mit P(X ≤ x) ≥ p, Vergleich mit relativer Toleranz 1e-12 für eigene Verteilungen); erreicht = P(X ≤ x), null wenn x unendlich;
 *                                      p = 0 / 1 liefert den Rand wie R (Normal ∓Infinity, χ²/F 0 bzw. Infinity, Binomial 0 bzw. n), p < 0 oder p > 1: x = NaN
 *   momente(v) → { mittel, varianz, sigma }   null = „existiert nicht“ (t: Mittel df ≤ 1, Varianz df ≤ 2 [dort wäre sie unendlich]; F: Mittel d2 ≤ 2, Varianz d2 ≤ 4)
 *   pruefeVerteilung(v) → string | null        null = in Ordnung, sonst Fehlertext (Grenzen: Binomial n ≤ 1 000 000, Poisson λ ≤ 100 000, hypergeometrisch N ≤ 10 000 000; Parameter im erlaubten Bereich)
 *   zuZ(x, mu, sigma) = (x − mu)/sigma;  vonZ(z, mu, sigma) = mu + z·sigma
 *   eigeneKennzahlen(x, p) → { summe, summeOk, mittel, varianz, sigma }      summeOk = |Σp − 1| ≤ 1e-9; NICHT still normieren
 *   pruefeEigene(x, p) → string | null          Fehler: verschiedene Längen, weniger als 2 Zeilen, doppelter Wert, p < 0 oder p > 1, keine Zahl
 *   liesZahl(text) → number                     "1/6", "0,25", "0.25", " 1 / 4 ", "-1/4", "1,5/3"; NaN bei Unsinn, Nenner 0, leer, "1/2/3"
 *   normalnaeherung(n, p, a, b) → { exakt, ohneKorrektur, mitKorrektur, mu, sigma, laplace }     P(a ≤ X ≤ b), laplace = (σ > 3) [streng: bei σ = 3 genau nicht]
 *   sigmaTabelle(n, p) → [{ name, k, kExakt|null, naeherung, von, bis, exakt }] (6 Zeilen: 1σ 2σ 3σ 1,64σ 1,96σ 2,58σ); naeherung = Φ(k) − Φ(−k) mit dem SCHULwert k; kExakt = exaktes Quantil (nur bei 1,64/1,96/2,58);
 *      von = ceil(μ − kσ − 1e-9) (mindestens 0), bis = floor(μ + kσ + 1e-9) (höchstens n); exakt = P(von ≤ X ≤ bis) der Binomialverteilung.
 *
 * TOLERANZEN (Fachblatt „Genauigkeitsziel“, vom Prüfer geschärft): Wahrscheinlichkeiten und Dichten relativ 1e-9 gegen R, wenn der Sollwert ≥ 1e-12 ist; darunter relativ 1e-6
 * (NICHT „absolut“: ein absoluter Vergleich würde den Fehler „0 statt 1e-300“ durchlassen, den F12 gerade finden soll). Ist der Sollwert 0, muss |ist| ≤ 1e-300 sein.
 * Quantile stetiger Verteilungen relativ 1e-8, diskreter Verteilungen EXAKT gleich. Rechenzeit: jeder Fall darf bis 2 s brauchen (Binomial n = 100 000).
 *
 * Der Block „Vorhandene Funktionen gegen R (F12)“ prüft die heute benutzten Funktionen (lib/verteilung.ts, lib/power.ts, lib/diagrammdaten.ts). Er DARF heute rot sein, wo sie
 * fehlerhaft sind (siehe Bericht des Prüfers); der Bauer behebt das so, dass alle bisherigen Tests grün bleiben. */
import { describe, expect, it } from 'vitest';
import type * as VT from './verteilungen';
import { betai, lnGamma, normal, tQuantil, tVerteilung } from './verteilung';
import { chi2Quantil, chi2Verteilung, fQuantil, fVerteilung, gammaP } from './power';
import { qnorm } from './diagrammdaten';
import erwartet from './testdaten/welle6-erwartet.json';

const mods = import.meta.glob('./verteilungen.ts');
let geladen: typeof VT | undefined;
async function V(): Promise<typeof VT> {
  if (geladen) return geladen;
  const f = mods['./verteilungen.ts'];
  if (!f) throw new Error('lib/verteilungen.ts fehlt (Welle 6, L1)');
  geladen = (await f()) as typeof VT;
  return geladen;
}

type Zahl = number | string | null;
const num = (v: Zahl | undefined): number => (v === 'Inf' ? Infinity : v === '-Inf' ? -Infinity : (v as number));
/** Wahrscheinlichkeit/Dichte: relativ 1e-9 ab Sollwert 1e-12, darunter relativ 1e-6; Sollwert 0 → |ist| ≤ 1e-300. */
function nah(ist: number, soll: Zahl | undefined, was: string, rel = 1e-9) {
  const s = num(soll);
  if (s === undefined || s === null) return;
  expect(Number.isNaN(ist), `${was}: Ergebnis ist NaN`).toBe(false);
  if (s === 0) { expect(Math.abs(ist), `${was}: soll 0, ist ${ist}`).toBeLessThanOrEqual(1e-300); return; }
  if (!Number.isFinite(s)) { expect(ist, was).toBe(s); return; }
  const tol = Math.abs(s) >= 1e-12 ? rel : 1e-6;
  expect(Math.abs(ist - s), `${was}: ist ${ist}, soll (R) ${s}, relativ ${Math.abs(ist - s) / Math.abs(s)}`).toBeLessThanOrEqual(tol * Math.abs(s));
}
const nahQ = (ist: number, soll: Zahl, was: string) => {
  const s = num(soll);
  if (s === 0) { expect(Math.abs(ist), was).toBeLessThanOrEqual(1e-300); return; }
  if (!Number.isFinite(s)) { expect(ist, was).toBe(s); return; }
  expect(Math.abs(ist - s), `${was}: ist ${ist}, soll (R) ${s}`).toBeLessThanOrEqual(1e-8 * Math.abs(s));
};
/** Die p-Werte der Quantile stehen im JSON mit 15 Stellen (1e-300 als 9,99999999999999e-301): auf 12 Stellen runden. */
const rund = (p: number) => Number(p.toPrecision(12));

interface Pkt { x: number; links: number; rechts: number; dichte?: number | null; linksStreng?: number; rechtsStreng?: number }
interface QPkt { p: number; x: Zahl; erreicht?: number | null }
interface Fall { art: string; params: Record<string, number>; punkte: Pkt[]; zwischen: { a: number; b: number; p: number }[]; quantile: QPkt[]; momente: { mittel: number | null; varianz: number | null; sigma: number | null } }
const L1 = (erwartet as unknown as { l1: { stetig: Fall[]; diskret: Fall[]; eigen: any[]; eigen_quantil_gleich: any[]; eigen_summe: any[]; bruch: any[]; naeherung: any[]; ungueltig: any[]; gueltig: any[] } }).l1;
const name = (f: Fall) => `${f.art}(${Object.entries(f.params).map(([k, v]) => `${k}=${v}`).join(', ')})`;
const verteilung = (f: Fall): VT.Verteilung => ({ art: f.art, ...f.params }) as VT.Verteilung;
const stetig = (f: Fall) => f.art === 'normal' || f.art === 't' || f.art === 'chi2' || f.art === 'f';

/* =================================================================================================================================================================
 *  A. Neues Modul gegen R
 * ================================================================================================================================================================= */
describe('L1 stetige Verteilungen gegen R: links, rechts (direkt), Dichte, zwischen, Quantil, Momente', () => {
  for (const f of L1.stetig) {
    it(name(f), async () => {
      const m = await V(), v = verteilung(f);
      for (const p of f.punkte) {
        const w = `${name(f)} x=${p.x}`;
        nah(m.links(v, p.x), p.links, `${w} P(X≤x)`);
        nah(m.linksStreng(v, p.x), p.links, `${w} P(X<x) = P(X≤x) bei stetig`);
        nah(m.rechts(v, p.x), p.rechts, `${w} P(X≥x) direkt`);
        nah(m.rechtsStreng(v, p.x), p.rechts, `${w} P(X>x) = P(X≥x) bei stetig`);
        if (p.dichte !== null && p.dichte !== undefined) nah(m.dichte(v, p.x), p.dichte, `${w} Dichte`);
      }
      for (const z of f.zwischen) nah(m.zwischen(v, z.a, z.b), z.p, `${name(f)} P(${z.a} ≤ X ≤ ${z.b})`);
      for (const q of f.quantile) {
        if (q.p === 0 || q.p === 1) { nahQ(m.quantil(v, q.p).x, q.x as Zahl, `${name(f)} Quantil p=${q.p}`); continue; }
        const r = m.quantil(v, rund(q.p));
        nahQ(r.x, q.x as Zahl, `${name(f)} Quantil p=${q.p}`);
        nah(r.erreicht as number, rund(q.p), `${name(f)} erreichte Wahrscheinlichkeit p=${q.p}`, 1e-8);
      }
      expect(Number.isNaN(m.quantil(v, -0.1).x), 'p < 0 → NaN').toBe(true);
      expect(Number.isNaN(m.quantil(v, 1.5).x), 'p > 1 → NaN').toBe(true);
      const mo = m.momente(v);
      expect(mo.mittel === null, `${name(f)} Mittel existiert nicht`).toBe(f.momente.mittel === null);
      expect(mo.varianz === null, `${name(f)} Varianz existiert nicht`).toBe(f.momente.varianz === null);
      if (f.momente.mittel !== null) nah(mo.mittel as number, f.momente.mittel, `${name(f)} μ`, 1e-12);
      if (f.momente.varianz !== null) { nah(mo.varianz as number, f.momente.varianz, `${name(f)} σ²`, 1e-12); nah(mo.sigma as number, f.momente.sigma, `${name(f)} σ`, 1e-12); } else expect(mo.sigma).toBeNull();
    }, 20000);
  }
});

describe('L1 diskrete Verteilungen gegen R: vier Wahrscheinlichkeiten, Wahrscheinlichkeitsfunktion, zwischen, Quantil (exakt), Momente', () => {
  for (const f of L1.diskret) {
    it(name(f), async () => {
      const m = await V(), v = verteilung(f);
      for (const p of f.punkte) {
        const w = `${name(f)} x=${p.x}`;
        nah(m.links(v, p.x), p.links, `${w} P(X≤x)`);
        nah(m.linksStreng(v, p.x), p.linksStreng!, `${w} P(X<x)`);
        nah(m.rechts(v, p.x), p.rechts, `${w} P(X≥x) direkt`);
        nah(m.rechtsStreng(v, p.x), p.rechtsStreng!, `${w} P(X>x) direkt`);
        nah(m.dichte(v, p.x), p.dichte as number, `${w} P(X=x)`);
      }
      for (const z of f.zwischen) nah(m.zwischen(v, z.a, z.b), z.p, `${name(f)} P(${z.a} ≤ X ≤ ${z.b})`);
      for (const q of f.quantile) {
        const r = m.quantil(v, rund(q.p));
        expect(r.x, `${name(f)} Quantil p=${q.p}: kleinstes k mit P(X≤k) ≥ p (R: q-Funktion)`).toBe(num(q.x));
        if (q.erreicht !== null && q.erreicht !== undefined) nah(r.erreicht as number, q.erreicht, `${name(f)} erreichte Wahrscheinlichkeit p=${q.p}`);
      }
      const mo = m.momente(v);
      nah(mo.mittel as number, f.momente.mittel, `${name(f)} μ`, 1e-12); nah(mo.varianz as number, f.momente.varianz, `${name(f)} σ²`, 1e-12); nah(mo.sigma as number, f.momente.sigma, `${name(f)} σ`, 1e-12);
    }, 30000);
  }
});

describe('L1 Eigenschaften der Schnittstelle (Fachblatt F1, F2, F15)', () => {
  it('Quantil bei Gleichheit: quantil(links(k)) = k für das ganze Gitter (kein Verrutschen durch Rundung)', async () => {
    const m = await V();
    for (const f of L1.diskret) {
      const v = verteilung(f);
      for (const p of [0.025, 0.5, 0.975]) { const k = m.quantil(v, p).x; expect(m.quantil(v, m.links(v, k)).x, `${name(f)} k=${k}`).toBe(k); }
    }
  });
  it('Jede Wahrscheinlichkeit liegt in [0; 1] (auch 1 − winzig, nie 1,0000000000000002): links, linksStreng, rechts, rechtsStreng, zwischen im ganzen Gitter', async () => {
    const m = await V();
    for (const f of [...L1.stetig, ...L1.diskret]) {
      const v = verteilung(f);
      for (const p of f.punkte) for (const w of [m.links(v, p.x), m.linksStreng(v, p.x), m.rechts(v, p.x), m.rechtsStreng(v, p.x)]) { expect(w, `${name(f)} x=${p.x}`).toBeGreaterThanOrEqual(0); expect(w, `${name(f)} x=${p.x}`).toBeLessThanOrEqual(1); }
      for (const z of f.zwischen) { const w = m.zwischen(v, z.a, z.b); expect(w, `${name(f)} [${z.a}; ${z.b}]`).toBeGreaterThanOrEqual(0); expect(w).toBeLessThanOrEqual(1); }
    }
  }, 60000);
  it('diskret: P(X ≤ x) + P(X > x) = 1 und P(X < x) + P(X ≥ x) = 1 (absolut 1e-12), P(X ≤ x) − P(X < x) = P(X = x)', async () => {
    const m = await V();
    for (const f of L1.diskret) {
      const v = verteilung(f);
      for (const p of f.punkte) {
        expect(Math.abs(m.links(v, p.x) + m.rechtsStreng(v, p.x) - 1), `${name(f)} x=${p.x}`).toBeLessThan(1e-12);
        expect(Math.abs(m.linksStreng(v, p.x) + m.rechts(v, p.x) - 1), `${name(f)} x=${p.x}`).toBeLessThan(1e-12);
        expect(Math.abs(m.links(v, p.x) - m.linksStreng(v, p.x) - m.dichte(v, p.x)), `${name(f)} x=${p.x}`).toBeLessThan(1e-12);
      }
    }
  });
  it('diskret: P(X ≤ 3,5) = P(X ≤ 3) und P(X ≥ 3,5) = P(X ≥ 4), P(X = 3,5) = 0 (Eingabe 3,5 bei einer Zählvariablen)', async () => {
    const m = await V(), v: VT.Verteilung = { art: 'binom', n: 20, p: 0.3 };
    expect(m.links(v, 5.5)).toBe(m.links(v, 5)); expect(m.linksStreng(v, 5.5)).toBe(m.links(v, 5)); expect(m.rechts(v, 5.5)).toBe(m.rechts(v, 6)); expect(m.rechtsStreng(v, 5.5)).toBe(m.rechts(v, 6)); expect(m.dichte(v, 5.5)).toBe(0);
  });
  it('stetig: ≤ und < sind gleich, ≥ und > sind gleich', async () => {
    const m = await V(), v: VT.Verteilung = { art: 'normal', mu: 100, sigma: 15 };
    expect(m.links(v, 112)).toBe(m.linksStreng(v, 112)); expect(m.rechts(v, 112)).toBe(m.rechtsStreng(v, 112));
  });
  it('Binomial n = 100 000 mit p = 0,5: Rechenzeit unter 2 s für 20 Anfragen und Verteilungsfunktion ist ohne Verlust am Rand (P(X ≥ 51 000) < 1e-9 aber > 0)', async () => {
    const m = await V(), v: VT.Verteilung = { art: 'binom', n: 100000, p: 0.5 }, t0 = Date.now();
    for (let k = 49000; k < 49020; k++) m.links(v, k);
    const r = m.rechts(v, 51000);
    expect(r).toBeGreaterThan(0); expect(r).toBeLessThan(1e-9);
    expect(Date.now() - t0).toBeLessThan(2000);
  });
  it('Poisson: P(X ≥ 3000) bei λ = 1000 ist positiv (kein Ausschwänzen auf 0 oder 1 − P)', async () => {
    const m = await V(); const r = m.rechts({ art: 'poisson', lambda: 1000 }, 1300);
    expect(r).toBeGreaterThan(0); expect(r).toBeLessThan(1e-15);
  });
  it('Grenzen: ungültige Parameter liefern einen Text statt einer Zahl, gültige (auch am Rand) null', async () => {
    const m = await V();
    for (const u of L1.ungueltig) expect(m.pruefeVerteilung({ art: u.art, ...u.params } as VT.Verteilung), u.grund).toBeTypeOf('string');
    for (const g of L1.gueltig) expect(m.pruefeVerteilung({ art: g.art, ...g.params } as VT.Verteilung), JSON.stringify(g)).toBeNull();
  });
  it('Normal: z ↔ x', async () => {
    const m = await V();
    expect(m.zuZ(130, 100, 15)).toBeCloseTo(2, 12); expect(m.vonZ(-1.5, 100, 15)).toBeCloseTo(77.5, 12); expect(m.vonZ(m.zuZ(87.3, 100, 15), 100, 15)).toBeCloseTo(87.3, 12);
  });
});

describe('L1 eigene diskrete Verteilung (Fachblatt: nicht still normieren, Bruch-Eingabe)', () => {
  for (const f of L1.eigen) {
    it(`${f.name}: E, Var, σ, Wahrscheinlichkeiten, Quantile`, async () => {
      const m = await V(), v: VT.Verteilung = { art: 'eigen', x: [...f.x].reverse(), p: [...f.p].reverse() };   // Reihenfolge der Eingabe ist egal
      const k = m.eigeneKennzahlen([...f.x].reverse(), [...f.p].reverse());
      nah(k.mittel, f.mittel, `${f.name} E(X)`, 1e-12); nah(k.varianz, f.varianz, `${f.name} Var(X)`, 1e-12); nah(k.sigma, f.sigma, `${f.name} σ`, 1e-12);
      expect(k.summeOk).toBe(true); expect(Math.abs(k.summe - 1)).toBeLessThan(1e-12);
      const mo = m.momente(v); nah(mo.mittel as number, f.mittel, `${f.name} momente.mittel`, 1e-12); nah(mo.varianz as number, f.varianz, `${f.name} momente.varianz`, 1e-12);
      for (const p of f.punkte) {
        const w = `${f.name} x=${p.x}`;
        nah(m.links(v, p.x), p.links, `${w} ≤`); nah(m.linksStreng(v, p.x), p.linksStreng, `${w} <`); nah(m.rechts(v, p.x), p.rechts, `${w} ≥`); nah(m.rechtsStreng(v, p.x), p.rechtsStreng, `${w} >`); nah(m.dichte(v, p.x), p.dichte, `${w} P(X=x)`);
      }
      for (const q of f.quantile) expect(m.quantil(v, q.p).x, `${f.name} Quantil ${q.p}`).toBe(q.x);
      expect(m.pruefeEigene(f.x, f.p)).toBeNull();
    });
  }
  it('Quantil genau auf einer Summenstelle (1/6, 3/6; 0,3; 0,6): bleibt auf dem Wert, rutscht nicht eins weiter', async () => {
    const m = await V();
    for (const g of L1.eigen_quantil_gleich) { const f = L1.eigen.find(e => e.name === g.fall)!; expect(m.quantil({ art: 'eigen', x: f.x, p: f.p }, g.p).x, `${g.fall} p=${g.p}`).toBe(g.x); }
  });
  it('Summe ungleich 1: summeOk = false, Zahlen bleiben die der Eingabe (nicht normiert); Toleranz 1e-9', async () => {
    const m = await V();
    for (const s of L1.eigen_summe) { const k = m.eigeneKennzahlen(s.x, s.p); expect(k.summeOk, JSON.stringify(s.p)).toBe(s.ok); expect(Math.abs(k.summe - s.summe)).toBeLessThan(1e-12); }
    const k = m.eigeneKennzahlen([1, 2, 3], [0.5, 0.3, 0.19]);
    expect(k.mittel).toBeCloseTo(0.5 * 1 + 0.3 * 2 + 0.19 * 3, 12);      // E(X) = Σ x·P(x) mit den EINGEGEBENEN Werten
  });
  it('Eingabefehler: doppelter Wert, eine Zeile, verschiedene Längen, negatives p, p > 1, keine Zahl', async () => {
    const m = await V();
    for (const [x, p] of [[[1, 1], [0.5, 0.5]], [[1], [1]], [[1, 2], [1]], [[1, 2], [-0.1, 1.1]], [[1, 2], [2, -1]], [[1, NaN], [0.5, 0.5]], [[1, 2], [NaN, 1]]] as [number[], number[]][])
      expect(m.pruefeEigene(x, p), JSON.stringify([x, p])).toBeTypeOf('string');
  });
  it('Bruch- und Komma-Eingabe', async () => {
    const m = await V();
    for (const b of L1.bruch) { const w = m.liesZahl(b.text); if (b.wert === null) expect(Number.isNaN(w), `„${b.text}“`).toBe(true); else expect(w, `„${b.text}“`).toBeCloseTo(b.wert, 14); }
  });
});

describe('L1 Normalnäherung der Binomialverteilung und Sigma-Regeln (Fachblatt F7, F8)', () => {
  for (const n of L1.naeherung) {
    it(`B(${n.n}; ${n.p}): exakt, ohne und mit Stetigkeitskorrektur; Laplace σ > 3 ${n.laplace ? 'ja' : 'nein'}; Sigma-Tabelle`, async () => {
      const m = await V();
      for (const f of n.faelle) {
        const r = m.normalnaeherung(n.n, n.p, f.a, f.b);
        nah(r.exakt, f.exakt, `exakt ${f.a}..${f.b}`, 1e-9); nah(r.ohneKorrektur, f.ohne, `ohne Korrektur ${f.a}..${f.b}`, 1e-9); nah(r.mitKorrektur, f.mit, `mit Korrektur ${f.a}..${f.b}`, 1e-9);
        nah(r.mu, n.mu, 'μ', 1e-12); nah(r.sigma, n.sigma, 'σ', 1e-12); expect(r.laplace, 'Laplace-Bedingung σ > 3 (streng)').toBe(n.laplace);
      }
      const t = m.sigmaTabelle(n.n, n.p);
      expect(t.map(z => z.name)).toEqual(n.sigmaTabelle.map((z: any) => z.name));
      t.forEach((z, i) => {
        const s = n.sigmaTabelle[i];
        nah(z.k, s.k, `${s.name} k`, 1e-12); nah(z.naeherung, s.naeherung, `${s.name} Näherung`, 1e-9);
        if (s.kExakt === null) expect(z.kExakt, `${s.name} kein exaktes k`).toBeNull(); else nah(z.kExakt as number, s.kExakt, `${s.name} exaktes k`, 1e-9);
        expect([z.von, z.bis], `${s.name}: ganzzahlige Randwerte`).toEqual([s.von, s.bis]); nah(z.exakt, s.exakt, `${s.name} exakte Binomialwahrscheinlichkeit`, 1e-9);
      });
    });
  }
  it('Schulwerte gegen exakte Quantile (F8): Φ(1,64) − Φ(−1,64) = 0,8990, 1,96 → 0,9500, 2,58 → 0,9901; exakt 1,6449 / 1,9600 / 2,5758', async () => {
    const m = await V(), t = m.sigmaTabelle(100, 0.5);
    expect(t.slice(3).map(z => Math.round(z.naeherung * 1e4) / 1e4)).toEqual([0.899, 0.95, 0.9901]);
    expect(t.slice(3).map(z => Math.round((z.kExakt as number) * 1e4) / 1e4)).toEqual([1.6449, 1.96, 2.5758]);
  });
});

describe('L1 gedruckte Beispiele (Tafeln; Prüfstatus steht im JSON unter gedruckt)', () => {
  const g = (erwartet as unknown as { gedruckt: any[] }).gedruckt;
  it('Tafelwerk Binomial-Summenfunktion n = 20, p = 0,3: F(0) bis F(14) auf 4 Stellen', async () => {
    const m = await V(), b = g.find(x => x.kachel === 'L1' && /Binomial/.test(x.name))!;
    b.tafel.forEach((w: number, k: number) => expect(Math.round(m.links({ art: 'binom', n: 20, p: 0.3 }, k) * 1e4) / 1e4, `F(${k})`).toBe(w));
    expect(Math.round(m.links({ art: 'binom', n: 20, p: 0.3 }, 5) * 1e4) / 1e4).toBe(0.4164);
  });
  it('Standardnormal-Tabelle Φ(z) auf 4 Stellen und t-/χ²-/F-Quantile auf 3 Stellen', async () => {
    const m = await V(), n = g.find(x => x.kachel === 'L1' && /Standardnormal/.test(x.name))!, q = g.find(x => x.kachel === 'L1' && /Quantile/.test(x.name))!;
    n.z.forEach((z: number, i: number) => expect(Math.round(m.links({ art: 'normal', mu: 0, sigma: 1 }, z) * 1e4) / 1e4, `Φ(${z})`).toBe(n.phi[i]));
    for (const t of q.t) expect(Math.round(m.quantil({ art: 't', df: t.df }, t.p).x * 1e3) / 1e3, `t df=${t.df}`).toBe(t.q);
    for (const t of q.chi2) expect(Math.round(m.quantil({ art: 'chi2', df: t.df }, t.p).x * 1e3) / 1e3, `χ² df=${t.df}`).toBe(t.q);
    for (const t of q.f) expect(Math.round(m.quantil({ art: 'f', d1: t.d1, d2: t.d2 }, t.p).x * 1e3) / 1e3, 'F').toBe(t.q);
  });
  it('BW-Fortbildung, Mensa: n = 150, X ≥ 75 → 12,5 % bei p = 0,45 und 0,8 % bei p = 0,40', async () => {
    const m = await V(), b = g.find(x => x.kachel === 'L3' && /Mensa/.test(x.name))!;
    expect(Math.round(m.rechts({ art: 'binom', n: b.n, p: b.p_a }, b.x) * 1000) / 10).toBe(b.alpha_a_prozent);
    expect(Math.round(m.rechts({ art: 'binom', n: b.n, p: b.p_b }, b.x) * 1000) / 10).toBe(b.alpha_b_prozent);
  });
});

/* =================================================================================================================================================================
 *  B. VORHANDENE Funktionen gegen R (Fachblatt F12). Rot heute = Befund. Verglichen wird, was die Funktion verspricht (untere Verteilungsfunktion, Quantil).
 * ================================================================================================================================================================= */
describe('Vorhandene Funktionen gegen R (F12): untere Verteilungsfunktion', () => {
  const links: Record<string, (f: Fall, x: number) => number> = {
    normal: (f, x) => normal((x - f.params.mu!) / f.params.sigma!),
    t: (f, x) => tVerteilung(x, f.params.df!),
    chi2: (f, x) => chi2Verteilung(x, f.params.df!),
    f: (f, x) => fVerteilung(x, f.params.d1!, f.params.d2!)
  };
  for (const f of L1.stetig) {
    it(`${name(f)}: P(X ≤ x) an allen Gitterpunkten (Rand 1e-10, 1e-300) relativ 1e-9`, () => {
      for (const p of f.punkte) {
        if (f.art === 'chi2' || f.art === 'f') { if (p.x <= 0) continue; }
        nah(links[f.art]!(f, p.x), p.links, `${name(f)} x=${p.x} P(X≤x)`);
      }
    });
  }
  it('lnGamma gegen R lgamma (relativ 1e-12): Numerical-Recipes-Lanczos hat etwa 1e-10 absolut', () => {
    const soll: [number, number][] = [[0.5, 0.57236494292470008], [1, 0], [1.5, -0.12078223763524518], [2.5, 0.28468287047291918], [5, 3.1780538303479458], [10.5, 13.940625219403763], [50, 144.56574394634487], [100.5, 361.43554046777757], [1000.5, 5908.6741758486778], [100000, 1051287.7089736569]];
    for (const [x, s] of soll) { const i = lnGamma(x); if (s === 0) expect(Math.abs(i), `lnGamma(${x})`).toBeLessThan(1e-13); else expect(Math.abs(i - s) / Math.abs(s), `lnGamma(${x}) ist ${i}, R ${s}`).toBeLessThan(1e-12); }
  });
  it('betai gegen R pbeta (relativ 1e-9), auch ganz kleine Werte', () => {
    const soll: [number, number, number, number][] = [[2, 3, 0.4, 0.52479999999999993], [0.5, 0.5, 0.3, 0.36901011956554525], [5, 1.5, 0.9, 0.77617213431621557], [30, 0.5, 0.99, 0.43933436890525113], [3, 40, 1e-5, 1.1476642610348379e-11]];
    for (const [a, b, x, s] of soll) { const i = betai(a, b, x); expect(Math.abs(i - s) / s, `betai(${a}, ${b}, ${x}) ist ${i}, R ${s}`).toBeLessThan(1e-9); }
  });
  it('gammaP gegen R pgamma: kleine Argumente (a = 0,5; x = 1e-10)', () => { expect(Math.abs(gammaP(0.5, 1e-10) / 1.1283791670579e-05 - 1)).toBeLessThan(1e-9); });
});

describe('Vorhandene Funktionen gegen R (F12): Quantile', () => {
  const quant: Record<string, (f: Fall, p: number) => number> = {
    normal: (f, p) => f.params.mu! + f.params.sigma! * qnorm(p),
    t: (_f, p) => tQuantil(p, _f.params.df!),
    chi2: (f, p) => chi2Quantil(p, f.params.df!),
    f: (f, p) => fQuantil(p, f.params.d1!, f.params.d2!)
  };
  for (const f of L1.stetig) {
    it(`${name(f)}: Quantile p = 1e-300 … 0,999999 relativ 1e-8 (tQuantil sucht nur in [−1000; 1000])`, () => {
      for (const q of f.quantile) {
        if (q.p === 0 || q.p === 1) continue;
        const s = num(q.x); if (s === 0) continue;
        const ist = quant[f.art]!(f, rund(q.p));
        expect(Math.abs(ist - s), `${name(f)} p=${q.p}: ist ${ist}, soll (R) ${s}`).toBeLessThanOrEqual(1e-8 * Math.abs(s));
      }
    });
  }
});
