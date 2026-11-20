import { beforeAll, describe, expect, it } from 'vitest';
import erwartet from './testdaten/spaeter-b-erwartet.json';
import { nodeEngine } from './testengine';
import { kiAusAse, masseBefehl, masseHinweisText, masseVorschlag, pAusT, rechneMasse, type Mass, type MasseErgebnis } from './zusammenhangsmasse';
import { s } from './sitzung.svelte';

/* ===== Welle S-B, Teil 1: Kreuztabelle-Maße (Fachblatt docs/fachblaetter/SPAETER-B-OPTIONEN.md, Abschnitt 1 und „Entscheidungen Opus“, „Belege IBM“) =====
 * Sollwerte: scripts/spaeter-b-erwartet.R → testdaten/spaeter-b-erwartet.json (Abschnitt kreuz). Der Bauer ändert Test und JSON nicht.
 * Erste Quelle: die IBM-Formeln (SPSS Algorithms, CROSSTABS) in R. Zweite Quellen: PSPP-Engine (dieser Test lässt sie live laufen), Delta-Methode, DescTools, gedruckte IBM-Beispiele (Rauchen, Partei).
 * Das Modul `lib/zusammenhangsmasse.ts` (reine Funktionen, keine Oberfläche) hat diese API - sie ist hier festgelegt:
 *
 *   masseBefehl(zeile: string, spalte: string): string
 *       'CROSSTABS /TABLES=zeile BY spalte /STATISTICS=CHISQ GAMMA D BTAU CTAU LAMBDA UC.' - alle sieben Schlüssel (Schlüsselwörter), die Engine rechnet sie (kein Fehler).
 *   rechneMasse(items: OutputItem[], tab: number[][], namen: { zeile: string; spalte: string }): MasseErgebnis
 *       items = die Ausgabe von PSPP zu masseBefehl (Tabellen „Chi-Square Tests“, „Symmetric Measures“, „Directional Measures“); tab = die Zellhäufigkeiten wie angezeigt (Zeilen × Spalten, gewichtet = Summen der Gewichte,
 *       leere Zeilen/Spalten dürfen drin sein); namen = die Variablennamen, wie PSPP sie in „x Dependent“ schreibt. Die Richtung wird NUR über diese Namen zugeordnet, nie über die Reihenfolge.
 *       MasseErgebnis = { fehler: null | 'zu-wenig'; n: number /* Σ tab *\/; q: number /* min(besetzte Zeilen, besetzte Spalten) *\/; masse: Mass[]; testOrdinal: { t: number; p: number } | null; hinweise: MasseHinweis[] }
 *       fehler 'zu-wenig' (q ≤ 1): masse = [], testOrdinal = null, items werden nicht gelesen (PSPP gibt dort NaN/leere Tabellen) - nie NaN im Ergebnis.
 *       Mass = { art: 'gamma' | 'tauB' | 'tauC' | 'somersD' | 'lambda' | 'uc'; richtung: 'symmetrisch' | 'zeile' | 'spalte' | null; wert: number; ase1: number | null; kiLo: number | null; kiHi: number | null;
 *                t: number | null; p: number | null; pQuelle: 'T' | 'G2'; keineStreuung: boolean }
 *       Es gibt genau 12 Einträge: gamma, tauB, tauC (richtung null); somersD, lambda, uc je mit 'symmetrisch', 'zeile', 'spalte'. 'zeile' = die ZEILENvariable ist die abhängige („z Dependent“).
 *       ase1 = „Asymp. Std. Error“ von PSPP (beobachtete Stärke; beim symmetrischen Somers' d gibt PSPP keinen: null, Entscheidung Opus: KEIN KI);
 *       kiLo/kiHi = wert ∓ 1,959964 · ase1, begrenzt auf [-1; 1] (gamma, tauB, tauC, somersD) bzw. [0; 1] (lambda, uc); null, wenn ase1 null ist oder (Lambda mit wert 0: PSPP ASE 0 und NaN);
 *       t = „Approx. T“ von PSPP (ASE0; bei den ordinalen Maßen derselbe für alle sechs); beim symmetrischen UC gibt PSPP keines: null; bei Lambda mit wert 0: null;
 *       p = 2 · Φ(−|t|) (ordinal und lambda); beim UC aus dem Likelihood-Quotienten-Test (G², df = (r−1)(c−1), Zeile „Likelihood Ratio“ von PSPP), pQuelle 'G2' (Entscheidung Opus, IBM belegt); Lambda mit wert 0: null;
 *       keineStreuung = ase1 ≈ 0 (< 1e-12) bei einem Wert, der kein Lambda mit wert 0 ist (perfekter Zusammenhang: KI [1; 1], ehrlich mit Hinweis).
 *       testOrdinal = { t, p } der EINEN Zeile „Test (ordinale Maße)“ (Entscheidung Opus: ein T für alle).
 *       MasseHinweis = 'kleines-n' (N < 30 oder mehr als 20 % der Zellen mit erwarteter Häufigkeit < 5) | 'keine-streuung' (irgendein Mass mit keineStreuung) |
 *                      'lambda-null' (irgendein Lambda mit wert 0 UND p des Pearson-χ² < ,05: der automatische Satz, Entscheidung Opus)
 *   kiAusAse(wert, ase1, art): { lo: number; hi: number } | null      Intervall wie oben (begrenzt); null bei ase1 null oder nicht endlich
 *   pAusT(t: number): number                                      2 · Φ(−|t|)
 *   masseHinweisText(code: MasseHinweis | 'zu-wenig'): string     ganze Sätze (de; später L/Lp)
 *   masseVorschlag(opt: { zeile: SpaltenArt; spalte: SpaltenArt; zeilen: number; spalten: number; abhaengig?: 'zeile' | 'spalte' | null; textcodesAlphabetisch?: boolean }): { vorgeschlagen: MassArt[]; zuschaltbar: MassArt[]; hinweis: null | 'rang-gruppen' | 'korrelation' | 'ordinal-reihenfolge' }
 *       SpaltenArt = 'nominal' | 'ordinal' | 'zahl'; MassArt = Mass['art']. Fachblatt 1.2: Wahl vorbelegt, Person kann ändern; ordinale Maße nur bei ordinalen (oder beschrifteten) Stufen.
 */

s.einst.sprache = 'de'; s.einst.anrede = 'du';
const E = (erwartet as any).kreuz, F = E.faelle;
const nah = (ist: number, soll: number, tol = 1e-8, was = '') => expect(Math.abs(ist - soll), `${was} ${ist} gegen ${soll}`).toBeLessThanOrEqual(tol * Math.max(1, Math.abs(soll)));
const nahRel = (ist: number, soll: number, tol = 1e-4, was = '') => expect(Math.abs(ist - soll), `${was} ${ist} gegen ${soll}`).toBeLessThanOrEqual(tol * Math.abs(soll) + 1e-300);
const gleichOderNull = (ist: number | null, soll: number | null, fn: (a: number, b: number) => void) => { if (soll === null) expect(ist).toBeNull(); else { expect(ist).not.toBeNull(); fn(ist!, soll); } };
const finde = (e: MasseErgebnis, art: Mass['art'], richtung: Mass['richtung']) => { const m = e.masse.find(x => x.art === art && x.richtung === richtung); expect(m, `${art}/${richtung} fehlt`).toBeTruthy(); return m!; };
const SCHLUESSEL: Record<string, [Mass['art'], Mass['richtung']]> = {
  tauB: ['tauB', null], tauC: ['tauC', null], gamma: ['gamma', null],
  somersD_symmetrisch: ['somersD', 'symmetrisch'], somersD_zeile: ['somersD', 'zeile'], somersD_spalte: ['somersD', 'spalte'],
  lambda_symmetrisch: ['lambda', 'symmetrisch'], lambda_zeile: ['lambda', 'zeile'], lambda_spalte: ['lambda', 'spalte'],
  uc_symmetrisch: ['uc', 'symmetrisch'], uc_zeile: ['uc', 'zeile'], uc_spalte: ['uc', 'spalte']
};

let e: Awaited<ReturnType<typeof nodeEngine>>;
beforeAll(async () => { e = await nodeEngine(); });
type Item = { type: string; severity?: string; text?: string };
const csvAusZeilen = (z: number[][]) => new TextEncoder().encode(z.map(r => r.join(',')).join('\n') + '\n');
const zellenZuZeilen = (zellen: number[][]) => { const z: number[][] = []; zellen.forEach((r, i) => r.forEach((n, j) => { if (n > 0) z.push([i + 1, j + 1, n]); })); return z; };
const GEWICHTSWARNUNG = /weight value that was user-missing, system-missing, zero, or negative/;
const erwartetSumme = (z: number[][]) => z.reduce((a, r) => a + r.reduce((x, y) => x + y, 0), 0);
/** Läuft die Maße-Syntax: Variablen `zeile` (Zeile) und `spalte` (Spalte), gewichtet mit w; die Datenzeilen sind (Zeilencode, Spaltencode, Gewicht). */
function lauf(zeilen: number[][], zeile = 'z', spalte = 's') {
  const out = e.run(`DATA LIST FILE='/d.csv' LIST (',') /${zeile} ${spalte} w (F8.0).\nWEIGHT BY w.\n${masseBefehl(zeile, spalte)}`, { '/d.csv': csvAusZeilen(zeilen) }) as unknown as Item[];
  const probleme = out.filter(i => i.type === 'message' && !GEWICHTSWARNUNG.test(i.text ?? '')).map(i => `${i.severity}: ${i.text}`);
  expect(probleme, 'PSPP meldet Probleme').toEqual([]);
  return out as never;
}
const zeilenVon = (name: string): number[][] => name === 'haeufigkeitsgewicht' ? F[name].gewicht.zeilen : zellenZuZeilen(F[name].zellen);

describe('Befehl', () => {
  it('alle sieben Schlüsselwörter, Tabelle Zeile BY Spalte', () => {
    const b = masseBefehl('Note', 'Fach');
    expect(b).toMatch(/^CROSSTABS\b/); expect(b).toContain('/TABLES=Note BY Fach');
    for (const k of ['CHISQ', 'GAMMA', 'D', 'BTAU', 'CTAU', 'LAMBDA', 'UC']) expect(b, k).toMatch(new RegExp(`/STATISTICS=[^/]*\\b${k}\\b`));
    expect(b.trim().endsWith('.')).toBe(true);
  });
});

describe('Alle Maße aus der echten PSPP-Engine = Sollwerte (IBM-Formeln in R; Pflichtfälle 1.9)', () => {
  const namen = Object.keys(F).filter(n => !F[n].fehler);
  it('die Pflichtfälle sind da (3×3, 2×2, 3×4, perfekt, Lambda 0, leere Spalte, vertauscht, Gewicht, N = 20, 5×5, Agresti, IBM-Beispiele)', () => {
    for (const n of ['drei_mal_drei', 'zwei_mal_zwei', 'drei_mal_vier', 'perfekt', 'lambda_null', 'eine_zeile', 'leere_spalte', 'drei_mal_drei_vertauscht', 'haeufigkeitsgewicht', 'n_zwanzig', 'likert_fuenf', 'agresti_zufriedenheit', 'ibm_rauchen', 'ibm_partei'])
      expect(F[n], n).toBeTruthy();
  });
  for (const n of namen) it(`${n}: Wert, ASE1, KI, T, p, Richtung und Hinweise`, () => {
    const f = F[n], out = lauf(zeilenVon(n));   // „vertauscht“ ist die transponierte Tabelle (Zeilen = frühere Spalten)
    const erg = rechneMasse(out, f.zellen, { zeile: 'z', spalte: 's' });
    expect(erg.fehler).toBeNull(); expect(erg.masse).toHaveLength(12); expect(erg.n).toBe(f.n); expect(erg.q).toBe(f.q);
    for (const [k, [art, richtung]] of Object.entries(SCHLUESSEL)) {
      const soll = f.masse[k], ist = finde(erg, art, richtung);
      expect(ist.richtung, k).toBe(soll.richtung ?? null);
      nah(ist.wert, soll.wert, 1e-8, `${n} ${k} Wert`);
      gleichOderNull(ist.ase1, soll.ase1, (a, b) => nah(a, b, 1e-6, `${n} ${k} ASE1`));
      gleichOderNull(ist.kiLo, soll.kiLo, (a, b) => nah(a, b, 1e-6, `${n} ${k} KI unten`)); gleichOderNull(ist.kiHi, soll.kiHi, (a, b) => nah(a, b, 1e-6, `${n} ${k} KI oben`));
      gleichOderNull(ist.t, soll.t, (a, b) => nah(a, b, 1e-6, `${n} ${k} T`));
      gleichOderNull(ist.p, soll.p, (a, b) => nahRel(a, b, 1e-4, `${n} ${k} p`));
      expect(ist.pQuelle, k).toBe(soll.p_quelle); expect(ist.keineStreuung, `${n} ${k} keineStreuung`).toBe(soll.keine_streuung);
      for (const v of [ist.wert, ist.ase1, ist.kiLo, ist.kiHi, ist.t, ist.p]) if (v !== null) expect(Number.isNaN(v), `${n} ${k} NaN`).toBe(false);
    }
    expect(erg.testOrdinal).not.toBeNull(); nah(erg.testOrdinal!.t, f.test_ordinal.t, 1e-6); nahRel(erg.testOrdinal!.p, f.test_ordinal.p, 1e-4);
    expect(erg.hinweise.includes('kleines-n'), `${n} kleines-n`).toBe(f.hinweis_kleines_n);
    expect(erg.hinweise.includes('lambda-null'), `${n} lambda-null`).toBe(f.lambda_null_satz);
    expect(erg.hinweise.includes('keine-streuung'), `${n} keine-streuung`).toBe(Object.values(f.masse).some((m: any) => m.keine_streuung));
  });
});

describe('Gedruckte Beispiele (IBM SPSS Exact Tests, Kap. 14 und 15): drei Stellen, wie im Handbuch', () => {
  it('Rauchen 3×3, N = 96: Tau-b ,215 (ASE ,091), Tau-c ,194 (,082), Gamma ,345 (,140), Somers d ,214 / ,196 / ,236; T = 2,372; p = ,018', () => {
    const f = F.ibm_rauchen, erg = rechneMasse(lauf(zellenZuZeilen(f.zellen)), f.zellen, { zeile: 'z', spalte: 's' });
    const r3 = (x: number | null) => Math.round(x! * 1000) / 1000;
    const g: [Mass['art'], Mass['richtung'], number[]][] = [['tauB', null, [.215, .091]], ['tauC', null, [.194, .082]], ['gamma', null, [.345, .140]], ['somersD', 'symmetrisch', [.214, .091]], ['somersD', 'zeile', [.196, .083]], ['somersD', 'spalte', [.236, .100]]];
    // IBM druckt den ASE des symmetrischen d (,091); Statable zeigt dort kein KI (ase1 null) - der Wert steht im JSON als ase1_ibm
    for (const [art, richtung, [w, a]] of g) { const m = finde(erg, art, richtung); expect(r3(m.wert), `${art}/${richtung} Wert`).toBe(w); if (m.ase1 !== null) expect(r3(m.ase1), `${art}/${richtung} ASE`).toBe(a); expect(r3(m.t), 'T').toBe(2.372); expect(r3(m.p), 'p').toBe(.018); }
    expect(finde(erg, 'somersD', 'symmetrisch').ase1).toBeNull();
    expect(r3(erg.testOrdinal!.t)).toBe(2.372);
  });
  it('Partei 3×2, N = 500: UC symmetrisch ,012 (ASE ,009), „Partei abhängig“ ,007 (,005), „Verbündeter abhängig“ ,048 (,034); T = 1,346; p aus dem Likelihood-Quotienten = ,033', () => {
    const f = F.ibm_partei, erg = rechneMasse(lauf(zellenZuZeilen(f.zellen)), f.zellen, { zeile: 'z', spalte: 's' });   // z = Partei (Zeile), s = Verbündeter (Spalte)
    const r3 = (x: number | null) => Math.round(x! * 1000) / 1000;
    const sym = finde(erg, 'uc', 'symmetrisch'), zeile = finde(erg, 'uc', 'zeile'), spalte = finde(erg, 'uc', 'spalte');
    expect([r3(sym.wert), r3(sym.ase1), r3(zeile.wert), r3(zeile.ase1), r3(spalte.wert), r3(spalte.ase1)]).toEqual([.012, .009, .007, .005, .048, .034]);
    expect(r3(zeile.t)).toBe(1.346); expect(r3(spalte.t)).toBe(1.346);
    for (const m of [sym, zeile, spalte]) { expect(m.pQuelle).toBe('G2'); expect(r3(m.p)).toBe(.033); }
    // p aus T wäre ein anderes (,18): das ist NICHT das SPSS-p des UC
    expect(Math.abs(pAusT(zeile.t!) - zeile.p!)).toBeGreaterThan(0.1);
  });
  it('Agresti (Zufriedenheit nach Einkommen, 4×4, N = 96): Gamma ,221 mit ASE ,117 (gedruckt, aus dem Gedächtnis des Fachblatts; Wert und ASE auf 3 Stellen)', () => {
    const f = F.agresti_zufriedenheit, erg = rechneMasse(lauf(zellenZuZeilen(f.zellen)), f.zellen, { zeile: 'z', spalte: 's' }), g = finde(erg, 'gamma', null);
    nah(g.wert, 0.221, 2.5e-3); nah(g.ase1!, 0.117, 2.5e-3);
  });
});

describe('Richtung nur über die Beschriftung (Falle 7): andere Namen, Variablen vertauscht', () => {
  const f = F.drei_mal_drei, transponiert = f.zellen[0].map((_: number, j: number) => f.zellen.map((r: number[]) => r[j]));
  it('mit den Namen Geschlecht (Zeile) und Fach (Spalte): „Geschlecht Dependent“ ist die Zeile und stimmt mit dem Soll überein', () => {
    const out = lauf(zellenZuZeilen(f.zellen), 'Geschlecht', 'Fach'), erg = rechneMasse(out, f.zellen, { zeile: 'Geschlecht', spalte: 'Fach' });
    for (const [k, [art, r]] of Object.entries(SCHLUESSEL)) nah(finde(erg, art, r).wert, f.masse[k].wert, 1e-8, k);
    // falsch zugeordnete Namen (zeile ↔ spalte) tauschen die gerichteten Maße: die Zuordnung hängt wirklich nur an den Namen
    const falsch = rechneMasse(out, f.zellen, { zeile: 'Fach', spalte: 'Geschlecht' });
    for (const art of ['somersD', 'lambda', 'uc'] as const) { nah(finde(falsch, art, 'zeile').wert, finde(erg, art, 'spalte').wert, 1e-12); nah(finde(falsch, art, 'spalte').wert, finde(erg, art, 'zeile').wert, 1e-12); }
    expect(Math.abs(finde(erg, 'lambda', 'zeile').wert - finde(erg, 'lambda', 'spalte').wert)).toBeGreaterThan(0.01);   // die beiden Richtungen sind verschieden (sonst prüft der Test nichts)
  });
  it('Variablen vertauscht (TABLES=Fach BY Geschlecht): die „Zeile“ ist jetzt Fach; die gerichteten Maße tauschen die Zahlen, Tau-b und Gamma bleiben', () => {
    const out1 = lauf(zellenZuZeilen(f.zellen), 'Geschlecht', 'Fach'), e1 = rechneMasse(out1, f.zellen, { zeile: 'Geschlecht', spalte: 'Fach' });
    const out2 = lauf(zellenZuZeilen(transponiert), 'Fach', 'Geschlecht'), e2 = rechneMasse(out2, transponiert, { zeile: 'Fach', spalte: 'Geschlecht' });
    for (const art of ['somersD', 'lambda', 'uc'] as const) {
      nah(finde(e1, art, 'zeile').wert, finde(e2, art, 'spalte').wert, 1e-12); nah(finde(e1, art, 'spalte').wert, finde(e2, art, 'zeile').wert, 1e-12); nah(finde(e1, art, 'symmetrisch').wert, finde(e2, art, 'symmetrisch').wert, 1e-12);
    }
    nah(finde(e1, 'tauB', null).wert, finde(e2, 'tauB', null).wert, 1e-12); nah(finde(e1, 'gamma', null).ase1!, finde(e2, 'gamma', null).ase1!, 1e-12);
    // und gegen das Soll der transponierten Tabelle aus R
    const v = F.drei_mal_drei_vertauscht; for (const [k, [art, r]] of Object.entries(SCHLUESSEL)) nah(finde(e2, art, r).wert, v.masse[k].wert, 1e-8, k);
  });
});

describe('Ränder: nie NaN, Sätze', () => {
  it('weniger als zwei besetzte Zeilen oder Spalten (q ≤ 1): Fehler zu-wenig, keine Maße, PSPP-Ausgabe wird nicht gelesen', () => {
    const f = F.eine_zeile; expect(f.fehler).toBe('zu-wenig');
    for (const tab of [f.zellen, [[5], [7], [3]], [[4, 0], [0, 0]], [[0, 0], [0, 0]]]) { const r = rechneMasse([], tab, { zeile: 'z', spalte: 's' }); expect(r.fehler).toBe('zu-wenig'); expect(r.masse).toEqual([]); expect(r.testOrdinal).toBeNull(); expect(r.q).toBeLessThanOrEqual(1); }
    expect(masseHinweisText('zu-wenig')).toBe('Für ein Maß braucht es mindestens zwei Zeilen und zwei Spalten mit Fällen.');
  });
  it('PSPP-Befund eine Zeile: leere Tabellen und NaN - das ist genau der Fall, den Statable vorher abfängt', () => {
    const out = lauf(zellenZuZeilen(F.eine_zeile.zellen)) as unknown as { type: string; label?: string }[];
    expect(out.some(i => i.type === 'table' && i.label === 'Symmetric Measures')).toBe(true);   // PSPP druckt sie, aber ohne Zahlen
  });
  it('perfekter Zusammenhang (2×2: 20/0/0/15): Gamma = Tau-b = 1, ASE1 = 0, KI [1; 1], keineStreuung, Tau-c = ,9796; Hinweis keine-streuung', () => {
    const f = F.perfekt, erg = rechneMasse(lauf(zellenZuZeilen(f.zellen)), f.zellen, { zeile: 'z', spalte: 's' });
    for (const [art, r] of [['gamma', null], ['tauB', null]] as const) { const m = finde(erg, art, r); nah(m.wert, 1, 1e-12); nah(m.ase1!, 0, 1e-12); expect(m.kiLo).toBe(1); expect(m.kiHi).toBe(1); expect(m.keineStreuung).toBe(true); }
    nah(finde(erg, 'tauC', null).wert, 0.9795918367, 1e-9); expect(finde(erg, 'tauC', null).keineStreuung).toBe(false);
    expect(erg.hinweise).toContain('keine-streuung'); expect(masseHinweisText('keine-streuung')).toMatch(/Streuung/); expect(masseHinweisText('keine-streuung')).toMatch(/nicht aussagekräftig/);
  });
  it('Lambda = 0 (90/10, 60/40): „Spalte abhängig“ ist 0 ohne KI, ohne T und p (PSPP: ASE 0, T NaN); „Zeile abhängig“ ,30; automatischer Satz (V = ,35, p(χ²) < ,05)', () => {
    const f = F.lambda_null, erg = rechneMasse(lauf(zellenZuZeilen(f.zellen)), f.zellen, { zeile: 'z', spalte: 's' });
    const l0 = finde(erg, 'lambda', 'spalte'), l1 = finde(erg, 'lambda', 'zeile');
    expect(Math.abs(l0.wert)).toBe(0); expect(l0.kiLo).toBeNull(); expect(l0.kiHi).toBeNull(); expect(l0.t).toBeNull(); expect(l0.p).toBeNull(); expect(l0.keineStreuung).toBe(false);
    nah(l1.wert, 0.3, 1e-12); expect(l1.kiLo).not.toBeNull();
    expect(erg.hinweise).toContain('lambda-null'); nah(f.cramerV, 0.3464101615, 1e-9); nah(f.odds_ratio, 6, 1e-12);
    const t = masseHinweisText('lambda-null'); expect(t).toContain('häufigste'); expect(t).toContain('nicht, dass es keinen Zusammenhang gibt');
    // ohne Zusammenhang (p(χ²) ≥ ,05) kein Satz, auch wenn ein Lambda 0 ist
    const g = [[10, 10], [9, 11]], out = lauf(zellenZuZeilen(g)); expect(rechneMasse(out, g, { zeile: 'z', spalte: 's' }).hinweise).not.toContain('lambda-null');
  });
  it('leere mittlere Spalte (Nullen in der Tabelle): q zählt besetzte, alle Maße wie ohne die Spalte', () => {
    const a = F.leere_spalte, b = F.drei_mal_drei, ea = rechneMasse(lauf(zellenZuZeilen(a.zellen)), a.zellen, { zeile: 'z', spalte: 's' });
    expect(a.zellen[0]).toHaveLength(4); expect(ea.q).toBe(3); expect(ea.n).toBe(112);
    // dieselbe Tabelle ohne die leere Spalte: gleiche Zahlen bis auf die Tabelle selbst (3 × 3 mit den Zellen 20,10,5 / 10,15,10 / 5,12,25 ist eine andere Tabelle - hier gilt: Maße = Maße der reduzierten Tabelle)
    const reduziert = a.zellen.map((r: number[]) => r.filter((_, j) => j !== 1)), er = rechneMasse(lauf(zellenZuZeilen(reduziert)), reduziert, { zeile: 'z', spalte: 's' });
    for (const [art, r] of Object.values(SCHLUESSEL)) { nah(finde(ea, art, r).wert, finde(er, art, r).wert, 1e-12); gleichOderNull(finde(ea, art, r).ase1, finde(er, art, r).ase1, (x, y) => nah(x, y, 1e-12)); }
    void b;
  });
  it('N = 20: Hinweis kleines-n (Näherung für große Stichproben); N = 112 ohne', () => {
    expect(F.n_zwanzig.n).toBe(20); expect(F.n_zwanzig.hinweis_kleines_n).toBe(true); expect(F.drei_mal_drei.hinweis_kleines_n).toBe(false);
    expect(masseHinweisText('kleines-n')).toContain('Näherung für große Stichproben');
  });
  it('Häufigkeitsgewicht ≠ 1: Zeilen mit Gewichten 1 bis 6 = die erweiterte Tabelle; N = Σw', () => {
    const f = F.haeufigkeitsgewicht, w = (f.gewicht.zeilen as number[][]).reduce((a, r) => a + r[2]!, 0);
    expect(w).toBe(f.gewicht.summe); expect(erwartetSumme(f.zellen)).toBe(w);
    const erg = rechneMasse(lauf(f.gewicht.zeilen), f.zellen, { zeile: 'z', spalte: 's' }); expect(erg.n).toBe(w); expect(erg.fehler).toBeNull();
  });
  it('alle Sätze ohne NaN, ganze Sätze', () => { for (const c of ['zu-wenig', 'keine-streuung', 'kleines-n', 'lambda-null'] as const) { const t = masseHinweisText(c); expect(t).not.toMatch(/NaN|undefined/); expect(t.trim().endsWith('.')).toBe(true); } });
});

describe('Hilfsfunktionen: Intervall, p aus T', () => {
  it('KI = Wert ∓ 1,959964 · ASE1, begrenzt', () => {
    const k = kiAusAse(0.5, 0.1, 'gamma')!; nah(k.lo, 0.5 - 1.959964 * 0.1, 1e-6); nah(k.hi, 0.5 + 1.959964 * 0.1, 1e-6);
    expect(kiAusAse(0.9, 0.2, 'gamma')!.hi).toBe(1); expect(kiAusAse(-0.9, 0.2, 'tauB')!.lo).toBe(-1); expect(kiAusAse(0.05, 0.1, 'lambda')!.lo).toBe(0); expect(kiAusAse(0.97, 0.1, 'uc')!.hi).toBe(1);
    expect(kiAusAse(0.5, null, 'gamma')).toBeNull(); expect(kiAusAse(0.5, NaN, 'gamma')).toBeNull();
  });
  it('p = 2 · Φ(−|T|)', () => { nah(pAusT(1.959964), 0.05, 1e-6); nah(pAusT(-1.959964), 0.05, 1e-6); nah(pAusT(0), 1, 1e-12); nahRel(pAusT(20.49390153191922), 2.440317115974191e-93, 1e-6); });
  it('Gamma, Tau-b, Tau-c und Somers d haben ein gemeinsames T; die Tabelle „Test (ordinale Maße)“ ist eine Zeile', () => {
    const f = F.drei_mal_vier, erg = rechneMasse(lauf(zellenZuZeilen(f.zellen)), f.zellen, { zeile: 'z', spalte: 's' });
    const ts = erg.masse.filter(m => ['gamma', 'tauB', 'tauC', 'somersD'].includes(m.art)).map(m => m.t!); for (const t of ts) nah(t, ts[0]!, 1e-8);
    nah(erg.testOrdinal!.t, ts[0]!, 1e-8);
    // Tau-c ≠ Tau-b in der rechteckigen Tabelle
    expect(Math.abs(finde(erg, 'tauC', null).wert - finde(erg, 'tauB', null).wert)).toBeGreaterThan(0.005);
  });
});

describe('Vorschlag nach Messniveau (Fachblatt 1.2; Opus: ordinale Maße nur bei ordinalen oder beschrifteten Stufen)', () => {
  const v = masseVorschlag;
  it('ordinal × ordinal, quadratisch: Tau-b vorgeschlagen, Gamma und Somers d zuschaltbar', () => {
    const r = v({ zeile: 'ordinal', spalte: 'ordinal', zeilen: 3, spalten: 3 }); expect(r.vorgeschlagen).toEqual(['tauB']); expect(r.zuschaltbar).toEqual(expect.arrayContaining(['gamma', 'somersD'])); expect(r.hinweis).toBeNull();
  });
  it('ordinal × ordinal, rechteckig: Tau-c', () => { const r = v({ zeile: 'ordinal', spalte: 'ordinal', zeilen: 3, spalten: 4 }); expect(r.vorgeschlagen).toEqual(['tauC']); expect(r.zuschaltbar).toEqual(expect.arrayContaining(['somersD', 'gamma', 'tauB'])); });
  it('ordinal, eine Variable ist die abhängige: Somers d (gerichtet), Tau-b zuschaltbar', () => {
    for (const ab of ['zeile', 'spalte'] as const) { const r = v({ zeile: 'ordinal', spalte: 'ordinal', zeilen: 4, spalten: 4, abhaengig: ab }); expect(r.vorgeschlagen).toEqual(['somersD']); expect(r.zuschaltbar).toContain('tauB'); }
  });
  it('nominal × nominal: nichts vorgeschlagen (Cramérs V gibt es schon), UC und Lambda zuschaltbar - Lambda NIE vorgeschlagen', () => {
    const r = v({ zeile: 'nominal', spalte: 'nominal', zeilen: 3, spalten: 3 }); expect(r.vorgeschlagen).toEqual([]); expect(r.zuschaltbar).toEqual(expect.arrayContaining(['uc', 'lambda'])); expect(r.zuschaltbar).not.toContain('tauB');
    for (const a of ['ordinal', 'nominal'] as const) for (const b of ['ordinal', 'nominal', 'zahl'] as const) for (const [z, sp] of [[2, 3], [3, 3], [4, 5]]) expect(v({ zeile: a, spalte: b, zeilen: z!, spalten: sp! }).vorgeschlagen).not.toContain('lambda');
  });
  it('2×2: Gamma (= Yules Q) zuschaltbar, nichts vorgeschlagen (Phi, OR, Risiko gibt es schon)', () => { const r = v({ zeile: 'nominal', spalte: 'nominal', zeilen: 2, spalten: 2 }); expect(r.vorgeschlagen).toEqual([]); expect(r.zuschaltbar).toContain('gamma'); });
  it('ordinal × nominal mit 2 Gruppen: Hinweis auf den Rangtest, keine ordinalen Maße', () => { const r = v({ zeile: 'nominal', spalte: 'ordinal', zeilen: 2, spalten: 5 }); expect(r.hinweis).toBe('rang-gruppen'); expect(r.vorgeschlagen).toEqual([]); expect(r.zuschaltbar).not.toContain('tauB'); });
  it('Zahlen-Skala mit vielen Werten: Hinweis auf die Korrelation', () => { const r = v({ zeile: 'zahl', spalte: 'zahl', zeilen: 30, spalten: 25 }); expect(r.hinweis).toBe('korrelation'); expect(r.vorgeschlagen).toEqual([]); });
  it('nominale Spalten bekommen keine ordinalen Maße (Messniveau-Falle); Textcodes in Buchstabenfolge: Warnung', () => {
    const r = v({ zeile: 'nominal', spalte: 'nominal', zeilen: 3, spalten: 3 }); for (const m of ['tauB', 'tauC', 'gamma', 'somersD'] as const) { expect(r.vorgeschlagen).not.toContain(m); expect(r.zuschaltbar).not.toContain(m); }
    expect(v({ zeile: 'ordinal', spalte: 'ordinal', zeilen: 3, spalten: 3, textcodesAlphabetisch: true }).hinweis).toBe('ordinal-reihenfolge');
  });
});
