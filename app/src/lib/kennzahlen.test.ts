/* Welle 6, Kachel L2 „Aus Kennzahlen rechnen“ (Fachblatt docs/fachblaetter/WELLE6-VERSTEHEN.md, „Entscheidungen Opus“): Sollwerte aus R (scripts/welle6-erwartet.R, Abschnitt L2).
 * Der Bauer darf Sollwerte und Toleranzen NICHT ändern. Die Tests sind rot, bis lib/kennzahlen.ts existiert.
 *
 * API von lib/kennzahlen.ts (festgelegt vom Prüfer; reine Funktionen):
 *   type Seite = 'zwei' | 'links' | 'rechts'                      (links: H1 p < p0 bzw. μ < μ0; rechts: größer)
 *   wilsonIntervall(x, n, niveau) → { lo, hi }                    Wilson-Score OHNE Stetigkeitskorrektur (= prop.test(correct = FALSE)$conf.int); x darf nicht ganzzahlig sein (dann Formel mit reellem x);
 *                                                                 bei x = 0 ist lo GENAU 0, bei x = n ist hi GENAU 1 (wie R; keine Rundungsreste)
 *   scoreTest(x, n, p0, seite) → { z, p }                         z = (p̂ − p0)/√(p0(1−p0)/n); p = 2Φ(−|z|) bzw. Φ(z) (links) bzw. 1 − Φ(z) (rechts), obere Seite direkt (kein 1 − P bei kleinem p)
 *   anteilAusKennzahlen({ x, n, p0, niveau, seite }) → { phat, lo, hi, z, p, naeherungGrob }     KI immer zweiseitig; naeherungGrob = (n·p0·(1−p0) ≤ 9)
 *   eingabeAnteil(phat, n) → { x, ganzzahlig }                    x = p̂·n; liegt das Ergebnis innerhalb 1e-9 (relativ) an einer ganzen Zahl, wird auf sie gerundet und ganzzahlig = true, sonst bleibt x ungerundet und ganzzahlig = false
 *   mittelwertAusKennzahlen({ m, s, n, mu0, niveau, seite }) → { se, t, df, p, lo, hi, d }       se = s/√n; df = n−1; KI m ± t(1−α/2; df)·se zweiseitig; d = (m − μ0)/s (Cohens d für eine Stichprobe)
 *   pruefeAnteil({ x, n, p0, niveau }) / pruefeMittelwert({ m, s, n, niveau }) → string | null   null = in Ordnung. Gesperrt: x < 0 oder x > n, n < 1, p0 ≤ 0 oder ≥ 1, niveau ≤ 0 oder ≥ 1;
 *                                                                 Mittelwert: n < 2, n nicht ganzzahlig, s ≤ 0 (s = 0 sperrt der Prüfer ausdrücklich: t und d wären nicht definiert; das Fachblatt nennt nur s < 0).
 *   umfangAnteil(niveau, d, p = 0.5) → n         ⌈z²·p(1−p)/d²⌉  (z = qnorm(1 − (1−niveau)/2), d = HALBbreite „± d“; p = 0,5 ist der ungünstigste Fall und Standard; immer AUFrunden)
 *   umfangMittelwert(niveau, d, sigma) → n       ⌈(z·σ/d)²⌉
 *   umfangAnteilLaenge(niveau, laenge, p = 0.5) → n    Länge L des ganzen Intervalls, d = L/2
 * TOLERANZEN: Intervallgrenzen, z, t, p, SE, d relativ 1e-9 (Fachblatt Genauigkeitsziel); Stichprobenumfänge exakt (ganze Zahlen). Die Fälle, bei denen z²p(1−p)/d² weniger als 1e-6 von einer
 * ganzen Zahl entfernt ist, fehlen im Gitter absichtlich (Gleitkommastreit, nicht Fachfrage). */
import { describe, expect, it } from 'vitest';
import { anteilAusKennzahlen, eingabeAnteil, mittelwertAusKennzahlen, pruefeAnteil, pruefeMittelwert, scoreTest, umfangAnteil, umfangAnteilLaenge, umfangMittelwert, wilsonIntervall } from './kennzahlen';
import erwartet from './testdaten/welle6-erwartet.json';

type Seite = 'zwei' | 'links' | 'rechts';
const L2 = (erwartet as unknown as { l2: Record<string, any[]> }).l2;
const GEDRUCKT = (erwartet as unknown as { gedruckt: any[] }).gedruckt;
/** relativ `rel` (Standard 1e-9); Sollwert 0 → absolut 1e-12. */
const nah = (ist: number, soll: number, was: string, rel = 1e-9) => {
  expect(Number.isNaN(ist), `${was}: NaN`).toBe(false);
  if (soll === 0) { expect(Math.abs(ist), `${was}: soll 0, ist ${ist}`).toBeLessThanOrEqual(1e-12); return; }
  expect(Math.abs(ist - soll), `${was}: ist ${ist}, R ${soll}, relativ ${Math.abs(ist - soll) / Math.abs(soll)}`).toBeLessThanOrEqual(rel * Math.abs(soll));
};

describe('L2 Wilson-Intervall gegen R prop.test(correct = FALSE)', () => {
  it(`alle ${L2.wilson!.length} Fälle (x/n ∈ {0/10, 1/10, 5/10, 10/10, 7/40, 52/100, 3/1000, 997/1000} × Niveau {90, 95, 99 %})`, () => {
    for (const w of L2.wilson!) {
      const r = wilsonIntervall(w.x, w.n, w.niveau), t = `${w.x}/${w.n} Niveau ${w.niveau}`;
      if (w.lo === 0) expect(r.lo, `${t}: untere Grenze genau 0`).toBe(0); else nah(r.lo, w.lo, `${t} lo`);
      if (w.hi === 1) expect(r.hi, `${t}: obere Grenze genau 1`).toBe(1); else nah(r.hi, w.hi, `${t} hi`);
    }
  });
  it('Wilson ist nie breiter als Wald bei p̂ = 0,5 (Fachblatt: im Test nachrechnen); Breiten wie R', () => {
    for (const w of L2.wilson_vs_wald!) {
      const r = wilsonIntervall(w.n / 2, w.n, w.niveau);
      nah(r.hi - r.lo, w.breite_wilson, `n=${w.n} Niveau ${w.niveau} Breite`, 1e-9);
      expect(r.hi - r.lo, `n=${w.n}: Wilson < Wald`).toBeLessThan(w.breite_wald);
    }
  });
  it('nicht ganzzahliges x (aus p̂ und n) rechnet mit der reellen Formel und bleibt im Bereich [0; 1]', () => {
    const r = wilsonIntervall(3.333, 10, 0.95);
    expect(r.lo).toBeGreaterThan(0.1); expect(r.hi).toBeLessThan(0.7); expect(r.lo).toBeLessThan(0.3333);
    // Zwischen den Nachbarn x = 3 und x = 4
    const a = wilsonIntervall(3, 10, 0.95), b = wilsonIntervall(4, 10, 0.95);
    expect(r.lo).toBeGreaterThan(a.lo); expect(r.lo).toBeLessThan(b.lo); expect(r.hi).toBeGreaterThan(a.hi); expect(r.hi).toBeLessThan(b.hi);
  });
  it('Sollwerte kommen NICHT aus der Voreinstellung von prop.test (mit Stetigkeitskorrektur): 7/40 liefert 0,0875 bis 0,3195, nicht 0,0789 bis 0,3336', () => {
    const r = wilsonIntervall(7, 40, 0.95);
    expect(Math.abs(r.lo - 0.0789)).toBeGreaterThan(5e-3); expect(Math.abs(r.hi - 0.3336)).toBeGreaterThan(1e-2);
  });
});

describe('L2 Score-Test für einen Anteil gegen R prop.test(p = p0, correct = FALSE)', () => {
  it(`alle ${L2.score!.length} Fälle (x/n × p0 ∈ {0,5; 0,4; 0,1}) × 3 Seiten: z und p; Hinweis „Näherung grob“ genau bei n·p0·(1−p0) ≤ 9`, () => {
    for (const s of L2.score!) {
      const t = `${s.x}/${s.n} p0=${s.p0}`;
      const zw = scoreTest(s.x, s.n, s.p0, 'zwei'), li = scoreTest(s.x, s.n, s.p0, 'links'), re = scoreTest(s.x, s.n, s.p0, 'rechts');
      nah(zw.z, s.z, `${t} z`);
      nah(zw.p, s.p_zwei, `${t} p zweiseitig`); nah(li.p, s.p_links, `${t} p links`); nah(re.p, s.p_rechts, `${t} p rechts`);
      const a = anteilAusKennzahlen({ x: s.x, n: s.n, p0: s.p0, niveau: 0.95, seite: 'zwei' });
      expect(a.naeherungGrob, `${t}: n·p0·(1−p0) = ${s.np0q0}`).toBe(s.naeherung_grob);
      nah(a.p, s.p_zwei, `${t} anteilAusKennzahlen.p`); nah(a.z, s.z, `${t} anteilAusKennzahlen.z`); nah(a.phat, s.x / s.n, `${t} p̂`, 1e-15);
    }
  });
  it('anteilAusKennzahlen liefert Wilson-KI (zweiseitig, unabhängig von der Seite des Tests) und den Test in einem Aufruf', () => {
    for (const w of L2.wilson!.filter(x => x.n === 40 || x.n === 100)) for (const seite of ['zwei', 'links', 'rechts'] as Seite[]) {
      const a = anteilAusKennzahlen({ x: w.x, n: w.n, p0: 0.4, niveau: w.niveau, seite });
      nah(a.lo, w.lo, `${w.x}/${w.n} lo ${seite}`); nah(a.hi, w.hi, `${w.x}/${w.n} hi ${seite}`);
    }
  });
  it('Randgrenze der Faustregel: n·p0·(1−p0) = 9 genau (n = 36, p0 = 0,5) → Hinweis ja; 9,6 → nein; 7,5 → ja', () => {
    expect(anteilAusKennzahlen({ x: 10, n: 36, p0: 0.5, niveau: 0.95, seite: 'zwei' }).naeherungGrob).toBe(true);
    expect(anteilAusKennzahlen({ x: 10, n: 40, p0: 0.4, niveau: 0.95, seite: 'zwei' }).naeherungGrob).toBe(false);
    expect(anteilAusKennzahlen({ x: 10, n: 30, p0: 0.5, niveau: 0.95, seite: 'zwei' }).naeherungGrob).toBe(true);
  });
  it('Fachblatt-Beispiel F6: 7 von 40 gegen p0 = 0,4 gibt p = 0,003676 (Score-Näherung, nicht der exakte 0,003275 aus Kachel 3)', () => {
    const a = anteilAusKennzahlen({ x: 7, n: 40, p0: 0.4, niveau: 0.95, seite: 'zwei' });
    expect(Math.round(a.p * 1e6) / 1e6).toBe(0.003676);
  });
});

describe('L2 p̂ statt Anzahl: x = p̂·n nur bei ganzer Zahl stillschweigend, sonst Hinweis', () => {
  for (const e of L2.phat!) {
    it(`p̂ = ${e.phat}, n = ${e.n}`, () => {
      const r = eingabeAnteil(e.phat, e.n);
      expect(r.ganzzahlig).toBe(e.ganzzahlig);
      if (e.ganzzahlig) expect(r.x, 'auf die ganze Zahl gerundet (0,07·100 ist in Gleitkomma 7,000000000000001)').toBe(e.x);
      else nah(r.x, e.x, 'ungerundet', 1e-12);
    });
  }
});

describe('L2 Mittelwert aus Kennzahlen gegen R t.test (Daten mit genau gegebenem Mittel und SD)', () => {
  it(`alle ${L2.mittel!.length} Fälle ((m, s, μ0) × n ∈ {2, 5, 30, 500} × Niveau × 3 Seiten): SE, t, df, p, KI, Cohens d`, () => {
    for (const m of L2.mittel!) {
      const t = `m=${m.m} s=${m.s} n=${m.n} μ0=${m.mu0} Niveau ${m.niveau} ${m.seite}`;
      const r = mittelwertAusKennzahlen({ m: m.m, s: m.s, n: m.n, mu0: m.mu0, niveau: m.niveau, seite: m.seite as Seite });
      nah(r.se, m.se, `${t} SE`); nah(r.t, m.t, `${t} t`); expect(r.df, `${t} df`).toBe(m.df); nah(r.p, m.p, `${t} p`);
      nah(r.lo, m.lo, `${t} KI unten`); nah(r.hi, m.hi, `${t} KI oben`); nah(r.d, m.d, `${t} d`);
    }
  });
});

describe('L2 Eingaben prüfen (sperren statt NaN)', () => {
  it('ungültige Eingaben liefern einen Text, gültige (auch x = 0, x = n, n = 2) null', () => {
    for (const u of L2.ungueltig!) {
      const r = u.was === 'anteil' ? pruefeAnteil({ x: u.x, n: u.n, p0: u.p0, niveau: u.niveau }) : pruefeMittelwert({ m: u.m, s: u.s, n: u.n, niveau: u.niveau });
      expect(r, JSON.stringify(u)).toBeTypeOf('string');
    }
    for (const g of L2.gueltig!) {
      const r = g.was === 'anteil' ? pruefeAnteil({ x: g.x, n: g.n, p0: g.p0, niveau: g.niveau }) : pruefeMittelwert({ m: g.m, s: g.s, n: g.n, niveau: g.niveau });
      expect(r, JSON.stringify(g)).toBeNull();
    }
  });
});

describe('L2 Stichprobenumfang für gewünschte Breite', () => {
  it(`Anteil und Mittelwert, Gitter (${L2.umfang!.length} Fälle), immer aufgerundet`, () => {
    for (const u of L2.umfang!) {
      if (u.art === 'anteil') expect(umfangAnteil(u.niveau, u.d, u.p), `Anteil Niveau ${u.niveau} d=${u.d} p=${u.p} (roh ${u.roh})`).toBe(u.n);
      else expect(umfangMittelwert(u.niveau, u.d, u.sigma), `Mittelwert Niveau ${u.niveau} d=${u.d} σ=${u.sigma} (roh ${u.roh})`).toBe(u.n);
    }
  });
  it('Rechenprobe aus dem Fachblatt: 95 %, p = 0,5 (Standard): d = 0,03 → 1068; 0,05 → 385; 0,02 → 2401; 0,01 → 9604', () => {
    for (const r of GEDRUCKT.find(g => g.kachel === 'L2' && /Umfrage/.test(g.name))!.rechenprobe) expect(umfangAnteil(r.niveau, r.d), `d=${r.d}`).toBe(r.n);
  });
  it('Länge des ganzen Intervalls statt Halbbreite: L = 0,06 ↔ d = 0,03', () => {
    for (const u of L2.umfang_laenge!) expect(umfangAnteilLaenge(u.niveau, u.laenge, u.p), `L=${u.laenge}`).toBe(u.n);
    expect(umfangAnteilLaenge(0.95, 0.06)).toBe(umfangAnteil(0.95, 0.03));
  });
  it('p = 0,5 ist der ungünstigste Fall: kein anderes p braucht mehr', () => {
    for (const p of [0.01, 0.1, 0.3, 0.45, 0.55, 0.9]) expect(umfangAnteil(0.95, 0.03, p)).toBeLessThanOrEqual(umfangAnteil(0.95, 0.03));
  });
});

describe('L2 gedruckte Beispiele (Prüfstatus im JSON unter gedruckt)', () => {
  it('Wilson 81/263 (95 %): 0,2553 bis 0,3662 (Newcombe 1998, Zahl nicht im Original gelesen - siehe JSON) und 7/40: 0,0875 bis 0,3195 (Fachblatt)', () => {
    for (const g of GEDRUCKT.filter(x => x.kachel === 'L2' && x.x !== undefined && x.n !== undefined && x.lo !== undefined)) {
      const r = wilsonIntervall(g.x, g.n, 0.95);
      expect(Math.round(r.lo * 1e4) / 1e4, `${g.x}/${g.n} unten`).toBe(g.lo); expect(Math.round(r.hi * 1e4) / 1e4, `${g.x}/${g.n} oben`).toBe(g.hi);
    }
  });
});
