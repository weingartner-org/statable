import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import * as RT from './rangtests';
import { mannWhitney, wilcoxon } from './rangtests';

/* Fachblatt G9/G10 (docs/fachblaetter/G9-G10-RANGTESTS-BINDUNGEN.md): Rangtests mit Bindungen und Nullen EXAKT, Hodges-Lehmann mit erreichtem Niveau.
 * Sollwerte: R 4.6.1 wilcox.test(conf.int = TRUE); zweite Quelle coin (nur im Skript, p_coin). Skript: scripts/rangtests-bindungen-erwartet.R,
 * Daten: testdaten/rangtests-bindungen-erwartet.json.
 *
 * ENTSCHIEDEN (Opus 15.10., Fachblatt aktualisiert):
 *  - Gepaart: Nullen werden VOR dem Ranken entfernt (Wilcoxon-Verfahren wie SPSS). Sollwert = R wilcox.test(d[d != 0], conf.int = TRUE), d = nachher - vorher; zweite Quelle
 *    coin wilcoxsign_test(zero.method = "Wilcoxon"). Exakt, wenn die Paare ohne Nullen < 50. R selbst rankt Nullen mit (Pratt) - das gilt NICHT. Auch Schätzer und KI (hl)
 *    kommen aus den Differenzen ohne Nullen (heute zählt hodgesLehmannEins die Nullen mit -> der Bauer muss sie dort entfernen).
 *    Folge für den Anker: gepaart mit 3 Nullen hat HL 1,5 und R-KI [1; Inf] (-> kein Intervall, s. Punkt 3); p = 0,125 bleibt. Die Pratt-Werte [0; 2] / 0,9921875 gelten nicht mehr.
 *  - Rangsumme: exakt, wenn JEDE Gruppe < 50 (wie R); 25 gegen 25 und 49 gegen 49 exakt, 49 gegen 50 Näherung.
 *  - Zweiseitig: R-Regel min(1, 2 * min(P(S <= s), P(S >= s))). coin (|T - E|) weicht bei schiefer bedingter Verteilung ab; das Skript bestätigt per stopifnot (1e-10),
 *    dass R = min(1, 2 * min(coin-Schwänze)) und dass die coin-Schwänze Rs einseitigen p entsprechen.
 *
 * WAS DER BAUER ANLEGEN / ÄNDERN MUSS (diese Tests sind absichtlich rot, bis das getan ist):
 *  1. MannWhitney und Wilcoxon: zwei NEUE Felder `pGroesser` und `pKleiner` (einseitige p-Werte).
 *       pGroesser = H1 „Gruppe A liegt höher“ bzw. „nachher liegt höher als vorher“, pKleiner = die Gegenrichtung. `p` bleibt zweiseitig (R-Regel, nie über 1).
 *  2. `exakt` (bestehendes Feld) wird true auch bei Bindungen und (gepaart) Nullen: Rangsumme je Gruppe < 50; gepaart Paare ohne Nullen < 50.
 *       `p` ist dann die exakte BEDINGTE Verteilung (Mittelränge verdoppelt, ganzzahlige DP). Bei exakt = false: Normalnäherung mit Bindungskorrektur und OHNE
 *       Stetigkeitskorrektur, wie heute (Sollwert R exact = FALSE, correct = FALSE) - daran ändert G9 nichts.
 *  3. `hl` (bestehend): `exakt` und `niveau` (erreichtes Niveau, 0..1) auch bei Bindungen und Nullen belegen; Grenzen aus der bedingten Verteilung (R: .wilcox_test_two_cint_exact /
 *       .wilcox_test_one_cint_exact mit Mittelrängen). Bei exakt = false: KI aus der Näherung ohne Stetigkeitskorrektur (R correct = FALSE, 2e-4).
 *       KEIN Intervall, wenn es nicht sinnvoll ist: ist eine R-Grenze unendlich ODER das erreichte Niveau >= 0,9995, dann `hl.unten = null`, `hl.oben = null` und NEUES Feld
 *       `hl.ohneKi = true` (zu wenige Werte, 95 % nicht erreichbar); der Schätzer bleibt. Sonst `hl.ohneKi` false oder fehlend und Grenzen wie R. (Die R-Rohwerte im JSON bleiben.)
 *  4. Rangsumme „alle Werte gleich“: heute `null` (sigma = 0). Erwartet: Ergebnis mit p = 1, exakt = true, hl = { schaetzer 0, unten null, oben null, ohneKi true } - kein Absturz.
 *  5. Gepaart, alle Differenzen 0: `wilcoxon` bleibt null („kein Test möglich“). R rechnet hier formal p = 1 - bewusst NICHT übernehmen.
 *  6. Kommazahlen (Fachblatt Nachtrag 15.10.): Werte, Differenzen und Walsh-Mittel IMMER auf 12 gültige Stellen runden, bevor gerankt, auf Bindung oder auf 0 geprüft wird -
 *       in Mann-Whitney (Ränge, U), Wilcoxon (Differenzen, Nullen, Ränge) und beiden Hodges-Lehmann-Funktionen. Sollwert der Fälle mit `faktor` im JSON ist R auf den ganzzahlig
 *       skalierten Werten (p, Statistik, Niveau aus dem skalierten Lauf; Schätzer und Grenzen zurückskaliert). R auf den Rohwerten (`r_unskaliert`) weicht bei
 *       gp_komma_49_paare und gp_komma_8_paare_1_null ab (Gleitkomma-Rauschen macht aus Bindungen Nicht-Bindungen) - das Skript prüft das per stopifnot.
 *  7. Wilcoxon: NEUES Feld `nTest` = Zahl der Paare im Test (ohne Nullen) = n - nNull; die Tabelle zeigt „n im Test“ neben `n`. Der Test prüft `nTest === n - nNull`.
 *  8. Weniger als 2 Paare mit Unterschied: `wilcoxon(...)` liefert null (wie heute). Den Grund liefert eine NEUE exportierte Funktion
 *       `wilcoxonGrund(paare: [number, number][]): 'einPaar' | 'keinUnterschied' | null` (genau 1 bzw. 0 Paare mit Differenz != 0; sonst null = Test möglich). Auf Rundung 12 Stellen wie in 6.
 *  Gepaart, alle Differenzen gleich und != 0 (gp_alle_gleiche_veraenderung_n6, alle +1): Test wird gerechnet, exakt, p = 0,03125 (R).
 *  Vorhanden und hier genutzt: `nNull`, `n`, `uA`, `vPlus`, `hl.schaetzer/unten/oben`. */

type Z = number | 'Inf' | '-Inf';
interface Blk { statistic?: number; p?: number; method?: string; estimate?: number; conf_int?: Z[]; conf_level?: number; fehler?: string; p_zweiseitig?: number; p_groesser?: number; p_kleiner?: number }
interface Fall {
  name: string; art: 'mw' | 'gepaart'; alternative: 'two.sided' | 'greater' | 'less'; exakt_erwartet: boolean;
  x?: number[]; y?: number[]; vorher?: number[]; nachher?: number[]; n?: number; n_nullen?: number; n_ohne_nullen?: number; kein_test?: boolean; grund?: 'einPaar' | 'keinUnterschied'; faktor?: number;
  r: Blk; r_naeherung: Blk; p_zweiseitig: number; p_groesser: number; p_kleiner: number; p_coin?: number; p_coin_einseitig_groesser?: number; p_coin_einseitig_kleiner?: number;
}
const J = JSON.parse(readFileSync(new URL('./testdaten/rangtests-bindungen-erwartet.json', import.meta.url), 'utf8')) as { faelle: Fall[] };
const zahl = (v: Z): number => v === 'Inf' ? Infinity : v === '-Inf' ? -Infinity : v;
const nah = (a: number | undefined, b: number, tol = 1e-9) => {
  if (!Number.isFinite(b)) { expect(a).toBe(b); return; }
  expect(a).toBeTypeOf('number'); expect(Math.abs(a! - b) / Math.max(1, Math.abs(b))).toBeLessThan(tol);
};
const exaktR = (b: Blk) => !!b.method && b.method.includes('exact');
const fall = (n: string) => J.faelle.find(f => f.name === n)!;

/** Sollwert: exakt erwartet -> Rs Voreinstellung (gepaart: auf den Differenzen ohne Nullen), sonst Rs Näherung ohne Stetigkeitskorrektur. */
const sollBlock = (f: Fall): Blk => f.exakt_erwartet ? f.r : f.r_naeherung;
interface Hl { schaetzer: number; unten: number | null; oben: number | null; exakt?: boolean; niveau?: number; ohneKi?: boolean }
interface Erg { p: number; exakt: boolean; hl: Hl | null; pGroesser?: number; pKleiner?: number }

function pruefe(f: Fall, e: Erg) {
  const b = sollBlock(f), exakt = f.exakt_erwartet;
  expect(e.exakt, 'exakt-Kennzeichnung').toBe(exakt);
  // p der Richtung des Falls
  nah(f.alternative === 'two.sided' ? e.p : f.alternative === 'greater' ? e.pGroesser : e.pKleiner, b.p!);
  // alle drei Richtungen gegen Rs drei Aufrufe (nur beim exakten Fall; der Näherungsfall ist zweiseitig getestet)
  if (exakt) { nah(e.p, f.p_zweiseitig); nah(e.pGroesser, f.p_groesser); nah(e.pKleiner, f.p_kleiner); }
  // Hodges-Lehmann
  expect(e.hl).not.toBeNull();
  const h = e.hl!;
  nah(h.schaetzer, b.estimate!, exakt ? 1e-9 : 0.5);   // genähert sucht R die Nullstelle mit uniroot: Schätzer um bis zu eine Stufe neben dem Median
  if (f.alternative === 'two.sided') {
    const ci = b.conf_int!.map(zahl), tolG = exakt ? 1e-9 : 2e-4;
    const ohneKi = ci.some(c => !Number.isFinite(c)) || b.conf_level! >= 0.9995;
    if (ohneKi) { expect(h.ohneKi, 'hl.ohneKi').toBe(true); expect(h.unten).toBeNull(); expect(h.oben).toBeNull(); return; }
    expect(h.ohneKi ?? false, 'hl.ohneKi').toBe(false);
    expect(Math.abs(h.unten! - ci[0]!)).toBeLessThan(tolG); expect(Math.abs(h.oben! - ci[1]!)).toBeLessThan(tolG);
    if (exakt) { expect(h.exakt, 'hl.exakt').toBe(true); nah(h.niveau, b.conf_level!); }
  }
}

describe('Anker aus dem Fachblatt (R 4.6.1)', () => {
  it('Rangsumme x = 3,4,4,5,6 gegen y = 1,2,2,3,4: exakt, p = 0,05556, HL 2, KI [0; 4], Niveau 0,984127', () => {
    const m = mannWhitney('y', 'g', { name: 'A', werte: [3, 4, 4, 5, 6] }, { name: 'B', werte: [1, 2, 2, 3, 4] })!;
    expect(m.exakt).toBe(true);
    expect(Math.abs(m.p - 0.05556)).toBeLessThan(5e-6); nah(m.p, 1 / 18);
    expect(m.hl!.schaetzer).toBe(2); expect([m.hl!.unten, m.hl!.oben]).toEqual([0, 4]);
    expect(Math.abs(m.hl!.niveau! - 0.984127)).toBeLessThan(5e-7); expect(m.hl!.exakt).toBe(true);
  });
  it('gepaart mit 3 Nullen (Nullen entfernt): 7 Paare, exakt, p = 0,125, HL 1,5, kein KI (Grenze unendlich)', () => {
    const w = wilcoxon('a', 'b', [[4, 5], [3, 3], [2, 4], [4, 4], [1, 2], [3, 5], [3, 3]])!;
    expect([w.n, w.nNull]).toEqual([7, 3]);
    expect(w.exakt).toBe(true); nah(w.p, 0.125);
    expect(w.hl!.schaetzer).toBe(1.5); expect(w.hl).toMatchObject({ unten: null, oben: null, ohneKi: true });
  });
});

describe('Rangsumme (Mann-Whitney) mit Bindungen gegen R', () => {
  for (const f of J.faelle.filter(f => f.art === 'mw' && f.name !== 'mw_alle_gleich')) it(`${f.name} [${f.alternative}, ${f.exakt_erwartet ? 'exakt' : 'Näherung'}${f.faktor ? `, Kommazahlen x${f.faktor}` : ''}]`, () => {
    const m = mannWhitney('y', 'g', { name: 'A', werte: f.x! }, { name: 'B', werte: f.y! });
    expect(m).not.toBeNull();
    nah(m!.uA, f.r.statistic!);   // W aus R = U der ersten Gruppe
    pruefe(f, m as unknown as Erg);
  });
  it('mw_alle_gleich: p = 1, exakt, kein Absturz (Fachblatt), HL 0, kein KI (Niveau 1)', () => {
    const f = fall('mw_alle_gleich'), m = mannWhitney('y', 'g', { name: 'A', werte: f.x! }, { name: 'B', werte: f.y! }) as unknown as Erg | null;
    expect(m).not.toBeNull();
    expect(m!.exakt).toBe(true); nah(m!.p, 1); nah(m!.pGroesser, f.p_groesser); nah(m!.pKleiner, f.p_kleiner);
    expect(m!.hl).toMatchObject({ schaetzer: 0, unten: null, oben: null, ohneKi: true });
  });
});

describe('Wilcoxon (gepaart) mit Bindungen und Nullen gegen R', () => {
  for (const f of J.faelle.filter(f => f.art === 'gepaart' && !f.kein_test)) it(`${f.name} [${f.alternative}, ${f.n_nullen} Nullen, ${f.exakt_erwartet ? 'exakt' : 'Näherung'}${f.faktor ? `, Kommazahlen x${f.faktor}` : ''}]`, () => {
    const w = wilcoxon('a', 'b', f.vorher!.map((v, i) => [v, f.nachher![i]!] as [number, number]));
    expect(w).not.toBeNull();
    expect([w!.n, w!.nNull]).toEqual([f.n, f.n_nullen]);
    expect((w as unknown as { nTest?: number }).nTest, 'nTest (neues Feld)').toBe(f.n_ohne_nullen);
    nah(w!.vPlus, sollBlock(f).statistic!);   // V = Summe der Ränge der positiven Differenzen, Nullen entfernt
    pruefe(f, w as unknown as Erg);
  });
  for (const f of J.faelle.filter(f => f.kein_test)) it(`${f.name}: kein Test (null), Grund ${f.grund}`, () => {
    const paare = f.vorher!.map((v, i) => [v, f.nachher![i]!] as [number, number]);
    expect(wilcoxon('a', 'b', paare)).toBeNull();
    const grund = (RT as unknown as { wilcoxonGrund?: (p: [number, number][]) => string | null }).wilcoxonGrund;
    expect(grund, 'wilcoxonGrund exportiert').toBeTypeOf('function');
    expect(grund!(paare)).toBe(f.grund);
  });
});

describe('Umschalten exakt / Näherung', () => {
  const m = (n: string) => { const f = fall(n); return mannWhitney('y', 'g', { name: 'A', werte: f.x! }, { name: 'B', werte: f.y! }) as unknown as Erg; };
  const w = (n: string) => { const f = fall(n); return wilcoxon('a', 'b', f.vorher!.map((v, i) => [v, f.nachher![i]!] as [number, number])) as unknown as Erg; };
  it('Rangsumme wie R: jede Gruppe < 50 exakt (24 + 25, 25 + 25, 49 + 49), 49 gegen 50 Näherung', () => {
    expect(m('mw_24_gegen_25_N49').exakt).toBe(true);
    expect(m('mw_25_gegen_25_N50').exakt).toBe(true);
    expect(m('mw_49_gegen_49').exakt).toBe(true);
    expect(m('mw_49_gegen_50').exakt).toBe(false);
  });
  it('gepaart: 49 Paare ohne Nullen exakt, 50 Näherung, 52 Paare mit 10 Nullen (42 ohne Nullen) exakt', () => {
    expect(w('gp_49_ohne_nullen').exakt).toBe(true);
    expect(w('gp_50_ohne_nullen').exakt).toBe(false);
    expect(w('gp_52_paare_10_nullen').exakt).toBe(true);
  });
});

describe('Zweite Quelle coin bestätigt R', () => {
  /* Das R-Skript prüft dasselbe mit stopifnot; hier steht es als Test der JSON-Daten (damit niemand die Sollwerte ändert, ohne die Bestätigung zu verlieren):
   * zweiseitiges R-p = min(1, 2 * min(coin-Schwänze)); die coin-Schwänze sind Rs einseitige p. coins eigenes zweiseitiges p (|T - E|) weicht bei schiefer Verteilung ab - mit Absicht. */
  const mitCoin = J.faelle.filter(f => typeof f.p_coin === 'number' && typeof f.p_coin_einseitig_groesser === 'number');
  it('mindestens 20 Fälle mit coin, darunter Bindungen und Nullen', () => { expect(mitCoin.length).toBeGreaterThanOrEqual(20); });
  it('R-p = min(1, 2 * min(coin-Schwänze)) und Schwänze = Rs einseitige p (1e-10)', () => {
    for (const f of mitCoin) {
      nah(Math.min(1, 2 * Math.min(f.p_coin_einseitig_groesser!, f.p_coin_einseitig_kleiner!)), f.r.p!, 1e-10);
      nah(f.p_coin_einseitig_groesser, f.p_groesser, 1e-10); nah(f.p_coin_einseitig_kleiner, f.p_kleiner, 1e-10);
    }
  });
  it('wo die bedingte Verteilung symmetrisch ist, stimmt auch coins zweiseitiges p', () => {
    for (const n of ['anker_rangsumme', 'mw_bindungen_stark', 'mw_likert_8_8', 'mw_25_gegen_25_N50', 'mw_49_gegen_49', 'anker_gepaart_3_nullen', 'gp_viele_nullen_9_von_16', 'gp_52_paare_10_nullen', 'gp_30_Paare_4_nullen_stark_gebunden'])
      nah(fall(n).p_coin, fall(n).r.p!);
  });
});
