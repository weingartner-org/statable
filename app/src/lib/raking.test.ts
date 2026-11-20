import { describe, expect, it } from 'vitest';
import ERW from './testdaten/spaeter-f2-erwartet.json';
import { s } from './sitzung.svelte';
import { rake, rakingSaetze, rakingFehlerSatz, rakingSeSatz } from './raking';

/* ===== Später, Welle S-F2, Teil B: Raking im Gewichte-Dialog (Fachblatt SPAETER-F2-ERGAENZUNGEN Abschnitt B und „Entscheidungen Opus (19.10.)“ 6 gehen vor) =====
 * ROTE TESTS des Sollwert-Prüfers. Der Bauer A darf diese Datei und die JSON nicht ändern. FESTGELEGT (Opus 6): Raking rechnet in JS (reine Funktionen in lib/raking.ts, kein R); relative Schranke 1e-10, höchstens 1000 Durchgänge,
 * ALLE Ränder werden nach dem Lauf gegen die Ziele geprüft (survey::rake tut das nicht), Randfälle stoppen mit Satz; Gewichte auf Summe = n (Mittel 1) skaliert; Ausgangsgewicht aus einer Spalte erlaubt; kein Beschneiden.
 * Sollwerte: scripts/spaeter-f2-erwartet.R → testdaten/spaeter-f2-erwartet.json, Abschnitt `raking` und `daten.raking`; Quellen: survey::rake, mipfp::Ipfp, anesrake (alle drei gleich auf 1e-7 bis 1e-8) und eine Handrechnung.
 * Toleranz Gewichte: 1e-7 relativ; Durchgänge EXAKT (gleiche Abbruchregel: nach einem vollen Durchgang höchstens 1e-10 · Summe der Ziele Abweichung einer Randsumme).
 *
 * SCHNITTSTELLE lib/raking.ts
 *   rake(e: { faktoren: (string | number | null)[][]; raender: Record<string, number>[]; ausgang?: (number | null)[]; tol?: number; maxit?: number }): RakingErgebnis
 *      faktoren[k][i] = Kategorie von Fall i im Merkmal k (null = fehlend); raender[k] = Kategorie → ANTEIL ODER ZAHL (jeder Rand wird durch SEINE eigene Summe geteilt, danach mal Zielsumme);
 *      ausgang = Ausgangsgewicht je Fall (Voreinstellung 1; null/≤ 0 → Fall ohne Gewicht); Zielsumme = Summe der Ausgangsgewichte der Fälle mit gültigen Angaben in ALLEN Merkmalen (und gültigem Ausgangsgewicht);
 *      tol (1e-10, relativ zur Zielsumme), maxit (1000). Ein Durchgang = alle Merkmale nacheinander: w ← w · Ziel(Kategorie)/aktuelle Summe(Kategorie). Nach jedem vollen Durchgang wird die größte
 *      Abweichung einer Randsumme vom Ziel gemessen; ≤ tol·Zielsumme → fertig. Danach auf Summe = Zahl der gewichteten Fälle (Mittel 1) skaliert.
 *      RakingErgebnis = { ok: true; gewichte: (number | null)[]; durchgaenge: number; maxAbweichung: number (relativ zur Zielsumme, am Ende); nGewichtet: number; ohneGewicht: number[] (Zeilenindizes, 0-basiert);
 *                         summe: number; kish: number; designeffekt: number; kleinstes: number; groesstes: number; verhaeltnis: number; hinweise: ('raender-summen' | 'verhaeltnis-gross')[] }
 *                    | { ok: false; code: 'merkmale' | 'rand-fehlt' | 'kategorie-ohne-stichprobe' | 'kategorie-ohne-rand' | 'rand-null' | 'nicht-erreicht' | 'zu-wenig'; merkmal?: number; kategorie?: string; maxAbweichung?: number; durchgaenge?: number }
 *      Reihenfolge der Prüfungen: merkmale, rand-fehlt, zu-wenig, kategorie-ohne-stichprobe, kategorie-ohne-rand, rand-null, (Lauf), nicht-erreicht.
 *      Fehlercodes: 0 oder mehr als 5 Merkmale oder raender mit anderer Länge 'merkmale'; ein Rand ohne Einträge oder mit negativer/nicht endlicher Zahl 'rand-fehlt'; Kategorie im Rand, aber ohne Fall in der Stichprobe 'kategorie-ohne-stichprobe'
 *      (kategorie, merkmal); Kategorie in der Stichprobe, aber nicht im Rand 'kategorie-ohne-rand'; Rand 0 für eine Kategorie mit Fällen 'rand-null'; Prüfung nach dem Lauf nicht bestanden 'nicht-erreicht' (maxAbweichung relativ, durchgaenge);
 *      weniger als 2 Fälle mit gültigen Angaben 'zu-wenig'. Die Funktion wirft nie, es gibt nie NaN. Hinweis 'raender-summen': die Summen der Ränder (so wie eingetippt) weichen um mehr als 1 % voneinander ab (Rundung bis 1 % ist erlaubt);
 *      'verhaeltnis-gross': größtes/kleinstes Gewicht > 5.
 *   rakingSaetze(e: RakingErgebnisOk, merkmale: string[]): string[]     ganze Sätze: Raking an die Ränder der genannten Merkmale, Zahl der Durchgänge, effektive Stichprobengröße nach Kish („199,8 von 200 Fällen“), ein Satz zur Skalierung
 *        (Summe der Gewichte = Zahl der Fälle, Mittel 1: ändert Mittel, Anteile und Kish nicht), bei ohneGewicht ein Satz mit der Zahl der Fälle ohne Gewicht, bei Hinweisen je ein Satz
 *   rakingFehlerSatz(f: RakingFehler, merkmale: string[]): string       Satz zu jedem Fehlercode; 'nicht-erreicht': „Die Randverteilungen sind miteinander nicht vereinbar …“ mit der Abweichung in Personen/Anteil
 *   rakingSeSatz(): string                                              Hinweis: Standardfehler nach Raking mit den Gewichten als feste Gewichte sind etwas zu groß (vorsichtig)
 *   Alle Sätze: deutsch (du) und englisch über L(de, en); keine Seitenzahlen, keine „[prüfen]“. */
s.einst.sprache = 'de'; s.einst.anrede = 'du';
type Z = Record<string, any>;
const J = ERW as unknown as Z, R = J.raking as Z, D = (J.daten as Z).raking as Z;
const nah = (ist: any, soll: number, tol: number, was: string) => {
  expect(typeof ist, `${was}: Zahl erwartet, ist ${JSON.stringify(ist)}`).toBe('number'); expect(Number.isNaN(ist), `${was}: NaN`).toBe(false);
  expect(Math.abs(ist - soll), `${was} (ist ${ist}, soll ${soll})`).toBeLessThanOrEqual(tol * Math.max(Math.abs(soll), 1e-300));
};
const safe = <T,>(f: () => T): T => { try { return f(); } catch { return undefined as T; } };   // fehlt die Funktion, bleiben die Tests einzeln rot
const ok = (e: any) => { expect(e.ok, `Fehler: ${JSON.stringify(e)}`).toBe(true); return e; };
const gl = (a: any[], b: number[], tol: number, was: string) => { expect(a.length, `${was}: Länge`).toBe(b.length); a.forEach((v, i) => nah(v, b[i]!, tol, `${was}[${i}]`)); };
const randSumme = (w: (number | null)[], f: (string | number | null)[]) => { const m: Record<string, number> = {}; w.forEach((v, i) => { if (v != null && f[i] != null) m[String(f[i])] = (m[String(f[i])] ?? 0) + v; }); return m; };

describe('Beispiel apisrs (200 Schulen, Ausgangsgewicht 1): gleich survey::rake, mipfp und anesrake', () => {
  const B = R.apisrs as Z, d = D.apisrs as Z;
  const e = safe(() => ok(rake({ faktoren: [d.stype, d['sch.wide']], raender: [{ E: 4421, H: 755, M: 1018 }, { No: 1072, Yes: 5122 }] })))!;
  it('10 Durchgänge; Gewichte auf Summe n = 200 skaliert gleich dem Sollwert (1e-7); die ersten zehn gleich', () => {
    expect(e.durchgaenge).toBe(B.durchgaenge); nah(e.summe, 200, 1e-12, 'Summe = n'); expect(e.nGewichtet).toBe(200); expect(e.ohneGewicht).toEqual([]);
    gl(e.gewichte.slice(0, 10), (B.gewichte_erste_10 as number[]).map(v => v * 200 / B.summe_gewichte), 1e-7, 'erste 10'); expect(e.maxAbweichung).toBeLessThanOrEqual(1e-10);
  });
  it('Kish 199,8109 und Designeffekt n/Kish; kleinstes und größtes Gewicht (nach Skalierung); kein Hinweis', () => {
    nah(e.kish, B.kish, 1e-9, 'Kish'); nah(e.designeffekt, 200 / B.kish, 1e-9, 'Designeffekt'); nah(e.kleinstes, B.kleinstes * 200 / B.summe_gewichte, 1e-7, 'klein'); nah(e.groesstes, B.groesstes * 200 / B.summe_gewichte, 1e-7, 'groß'); nah(e.verhaeltnis, B.groesstes / B.kleinstes, 1e-7, 'Verhältnis'); expect(e.hinweise).toEqual([]);
  });
  it('die Ränder stimmen: gewichtete Anteile gleich den Anteilen der Bevölkerung (1e-9); mit Anteilen statt Zahlen gleiches Ergebnis (1e-9)', () => {
    const rs = randSumme(e.gewichte, d.stype); for (const [k, v] of Object.entries({ E: 4421, H: 755, M: 1018 })) nah(rs[k]! / 200, v / 6194, 1e-9, `Rand ${k}`);
    const e2 = ok(rake({ faktoren: [d.stype, d['sch.wide']], raender: [{ E: 4421 / 6194, H: 755 / 6194, M: 1018 / 6194 }, { No: 1072 / 6194, Yes: 5122 / 6194 }] })); gl(e2.gewichte, e.gewichte, 1e-9, 'Anteile statt Zahlen');
  });
  it('Gewichte je Zelle: ein Gewicht je Kombination (Raking gibt gleichen Fällen gleiche Gewichte) gleich dem Sollwert', () => {
    const z = B.gewicht_je_zelle as Z; (d.stype as string[]).forEach((st, i) => nah(e.gewichte[i], z[st][d['sch.wide'][i]] * 200 / B.summe_gewichte, 1e-7, `Fall ${i}`));
  });
  it('die Voreinstellung von survey::rake (maxit 10, epsilon 1) wäre um 0,00187 daneben: Statable rechnet enger (Abstand zum Sollwert unter 1e-7)', () => { expect(B.survey_voreinstellung.max_abweichung_gewichte_zu_eng).toBeGreaterThan(1e-3); });
  it('Mittel api00: geraked 657,79 (Sollwert), ungewichtet 656,59, Bevölkerung 664,71', () => {
    const w = e.gewichte as number[], y = d.api00 as number[]; const m = w.reduce((a, v, i) => a + v * y[i]!, 0) / w.reduce((a, v) => a + v, 0); nah(m, B.mittel_api00.raking, 1e-9, 'Mittel');
  });
});

describe('Beispiel apistrat (Ausgangsgewicht pw, Ränder sch.wide und awards) und Beispiel der survey-Hilfeseite (apiclus1)', () => {
  it('apistrat: 24 Durchgänge, Gewichte (skaliert auf n) gleich dem Sollwert, Kish 166,1968 (Ausgang 168,5813)', () => {
    const B = R.apistrat as Z, d = D.apistrat as Z; const e = ok(rake({ faktoren: [d['sch.wide'], d.awards], raender: [B.ziele['sch.wide'], B.ziele.awards], ausgang: d.pw }));
    expect(e.durchgaenge).toBe(B.durchgaenge); gl(e.gewichte.slice(0, 10), (B.gewichte_erste_10 as number[]).map(v => v * 200 / B.summe_gewichte), 1e-7, 'erste 10'); nah(e.kish, B.kish, 1e-9, 'Kish'); nah(e.kleinstes, B.kleinstes * 200 / B.summe_gewichte, 1e-7, 'klein'); nah(e.groesstes, B.groesstes * 200 / B.summe_gewichte, 1e-7, 'groß');
    const w = e.gewichte as number[], y = d.api00 as number[]; nah(w.reduce((a, v, i) => a + v * y[i]!, 0) / 200, B.mittel_api00.raking, 1e-9, 'Mittel');
  });
  it('Hilfeseite ?rake (apiclus1, 183 Schulen): 9 Durchgänge, Kish 174, Gewichte 29,9 bis 67,1 (vor der Skalierung), Hinweis „verhaeltnis-gross“ nicht (2,2)', () => {
    const B = R.apiclus1_hilfeseite as Z, d = D.apiclus1 as Z; const e = ok(rake({ faktoren: [d.stype, d['sch.wide']], raender: [B.ziele.stype, B.ziele['sch.wide']], ausgang: d.pw }));
    expect(e.durchgaenge).toBe(B.durchgaenge); gl(e.gewichte.slice(0, 10), (B.gewichte_erste_10 as number[]).map(v => v * 183 / B.summe_gewichte), 1e-7, 'erste 10'); nah(e.kish, B.kish, 1e-9, 'Kish'); nah(e.summe, 183, 1e-12, 'Σ = n'); expect(e.hinweise).toEqual([]);
    nah(e.verhaeltnis, B.groesstes / B.kleinstes, 1e-7, 'Verhältnis');
  });
});

describe('Handbeispiel (12 Personen, Geschlecht und Alter): Durchgang 1 von Hand, Endgewichte', () => {
  const B = R.handbeispiel as Z, d = B.daten as Z;
  it('Endgewichte gleich survey (1e-7) bei Anteilen als Rändern (50/50 und 40/60), Summe 12; Kish 11,57', () => {
    const e = ok(rake({ faktoren: [d.g, d.a], raender: [{ w: 50, m: 50 }, { jung: 40, alt: 60 }], tol: 1e-12 })); gl(e.gewichte, B.gewichte as number[], 1e-7, 'Endgewichte'); nah(e.kish, B.kish, 1e-9, 'Kish'); expect(e.durchgaenge).toBe(B.durchgaenge); nah(e.summe, 12, 1e-12, 'Σ');
  });
  it('ein einziger Durchgang (maxit 1, tol 1) gibt die Handrechnung: w ×6/7, m ×6/5, dann Alter (jung-Ziel 4,8)', () => {
    const e1 = ok(rake({ faktoren: [d.g, d.a], raender: [{ w: 50, m: 50 }, { jung: 40, alt: 60 }], maxit: 1, tol: 1 })); gl(e1.gewichte, B.durchgang1_von_hand as number[], 1e-9, 'Handrechnung'); expect(e1.durchgaenge).toBe(1);
  });
  it('Gewicht je Zelle gleich dem Sollwert (w/jung, w/alt, m/jung, m/alt)', () => {
    const e = ok(rake({ faktoren: [d.g, d.a], raender: [{ w: 50, m: 50 }, { jung: 40, alt: 60 }], tol: 1e-12 })); const z = B.zelle_gewichte as number[][]; // Zeilen m, w; Spalten alt, jung (R-Reihenfolge)
    (d.g as string[]).forEach((g, i) => nah(e.gewichte[i], z[g === 'm' ? 0 : 1]![d.a[i] === 'alt' ? 0 : 1]!, 1e-7, `Fall ${i}`));
  });
});

describe('Grenzfälle: was survey::rake tut, was Statable tut', () => {
  const G = R.grenzfaelle as Z, d = D.grenzfall as Z;
  const f = [d.g, d.a], pg = { w: 500, m: 490, d: 10 }, pa = { jung: 400, alt: 600 };
  it('Normalfall (n 50, Ränder 500/490/10 und 400/600): Ränder stimmen auf 1e-9', () => {
    const e = ok(rake({ faktoren: f, raender: [pg, pa] })); const rs = randSumme(e.gewichte, d.g); for (const [k, v] of Object.entries(pg)) nah(rs[k]! / 50, v / 1000, 1e-9, k); const ra = randSumme(e.gewichte, d.a); nah(ra.jung! / 50, 0.4, 1e-9, 'jung');
  });
  it('Kategorie im Rand ohne Fall in der Stichprobe: Stopp (survey: Fehler „Some strata absent from sample“)', () => {
    expect(String(G.kategorie_in_population_ohne_stichprobe.survey_fehler)).toMatch(/absent from sample/); const e = rake({ faktoren: f, raender: [{ ...pg, x: 10 }, pa] }) as Z; expect(e.ok).toBe(false); expect(e.code).toBe('kategorie-ohne-stichprobe'); expect(e.kategorie).toBe('x'); expect(e.merkmal).toBe(0);
  });
  it('Kategorie in der Stichprobe, nicht im Rand: Stopp (survey: „This Can\'t Happen“)', () => {
    const e = rake({ faktoren: f, raender: [{ w: 500, m: 500 }, pa] }) as Z; expect(e.ok).toBe(false); expect(e.code).toBe('kategorie-ohne-rand'); expect(e.kategorie).toBe('d');
  });
  it('Rand 0 für eine Kategorie mit Fällen: Stopp „rand-null“', () => { const e = rake({ faktoren: f, raender: [{ w: 500, m: 500, d: 0 }, pa] }) as Z; expect(e.ok).toBe(false); expect(e.code).toBe('rand-null'); expect(e.kategorie).toBe('d'); });
  it('fehlender Wert in einem Merkmal: die Zeile bekommt KEIN Gewicht (null), die übrigen werden gewichtet, Ränder stimmen für die übrigen (survey: Fehler „missing values“)', () => {
    const a = (d.a as (string | null)[]).slice(); a[2] = null; const e = ok(rake({ faktoren: [d.g, a], raender: [pg, pa] }));
    expect(e.gewichte[2]).toBeNull(); expect(e.ohneGewicht).toEqual([2]); expect(e.nGewichtet).toBe(49); nah(e.summe, 49, 1e-12, 'Σ = 49'); const ra = randSumme(e.gewichte, a); nah(ra.jung! / 49, 0.4, 1e-9, 'jung');
    expect(G.fehlender_wert.survey_fehler).toMatch(/missing/);
  });
  it('Randsummen verschieden (1000 gegen 1100): jeder Rand durch seine eigene Summe; Hinweis „raender-summen“; Ränder stimmen als Anteile (survey: still die Summe der letzten)', () => {
    const e = ok(rake({ faktoren: f, raender: [pg, { jung: 400, alt: 700 }] })); expect(e.hinweise).toContain('raender-summen'); const ra = randSumme(e.gewichte, d.a); nah(ra.jung! / 50, 400 / 1100, 1e-9, 'jung'); nah(ra.alt! / 50, 700 / 1100, 1e-9, 'alt'); const rg = randSumme(e.gewichte, d.g); nah(rg.d! / 50, 0.01, 1e-9, 'd');
    const e0 = ok(rake({ faktoren: f, raender: [pg, { jung: 400, alt: 600 }] })); expect(e0.hinweise).not.toContain('raender-summen'); const e1 = ok(rake({ faktoren: f, raender: [pg, { jung: 399, alt: 600 }] })); expect(e1.hinweise, 'Rundung unter 1 % ist erlaubt').not.toContain('raender-summen');
    expect(G.randsummen_ungleich.endsumme_gewichte).toBe(1100);
  });
  it('Anteile statt Zahlen: dasselbe Ergebnis (1e-9), die Ränder stimmen (survey mit der Voreinstellung bricht nach einem Durchgang ab: Rand 0,4866 statt 0,49)', () => {
    const e = ok(rake({ faktoren: f, raender: [pg, pa] })), p = ok(rake({ faktoren: f, raender: [{ w: 0.5, m: 0.49, d: 0.01 }, { jung: 0.4, alt: 0.6 }] })); gl(p.gewichte, e.gewichte, 1e-9, 'Anteile = Zahlen');
    const rs = randSumme(p.gewichte, d.g); nah(rs.m! / 50, 0.49, 1e-9, 'm'); nah(G.anteile_mit_voreinstellung.rand_g_ist.m, 0.486561582, 1e-6, 'survey-Voreinstellung (falsch)'); expect(Math.abs(G.anteile_mit_voreinstellung.rand_g_ist.m - 0.49)).toBeGreaterThan(1e-3);
  });
  it('unvereinbare Ränder (A nur mit x, B nur mit y; A 50 %, x 30 %): Stopp „nicht-erreicht“ mit großer Abweichung - survey meldet nichts (Rand A 30 statt 50)', () => {
    const u = D.unvereinbar as Z; expect(G.unvereinbare_raender.survey_meldet_nichts).toBe(true); expect(G.unvereinbare_raender.rand_g_ist.A).toBe(30); expect(G.unvereinbare_raender.ipf_konvergiert).toBe(false);
    const e = rake({ faktoren: [u.g, u.a], raender: [{ A: 50, B: 50 }, { x: 30, y: 70 }] }) as Z; expect(e.ok).toBe(false); expect(e.code).toBe('nicht-erreicht'); expect(e.maxAbweichung).toBeGreaterThan(0.1); expect(e.durchgaenge).toBe(1000);
  });
  it('Fehler der Eingabe: kein Merkmal, mehr als 5, Rand fehlt, Rand mit negativer Zahl, weniger als 2 gültige Fälle', () => {
    expect((rake({ faktoren: [], raender: [] }) as Z).code).toBe('merkmale'); expect((rake({ faktoren: [d.g], raender: [pg, pa] }) as Z).code).toBe('merkmale');
    expect((rake({ faktoren: Array(6).fill(d.g), raender: Array(6).fill(pg) }) as Z).code).toBe('merkmale'); expect((rake({ faktoren: f, raender: [pg, {}] }) as Z).code).toBe('rand-fehlt'); expect((rake({ faktoren: f, raender: [pg, { jung: -1, alt: 5 }] }) as Z).code).toBe('rand-fehlt');
    expect((rake({ faktoren: [['a', null, null], ['x', 'y', 'x']], raender: [{ a: 1 }, { x: 1, y: 1 }] }) as Z).code).toBe('zu-wenig');
  });
  it('ein Merkmal ist Poststratifizierung: ein Durchgang; Kategorien als Zahlen und Text gleich behandelt', () => {
    const e = ok(rake({ faktoren: [d.g], raender: [pg] })); expect(e.durchgaenge).toBe(1); const rs = randSumme(e.gewichte, d.g); nah(rs.w! / 50, 0.5, 1e-12, 'w'); const n = ok(rake({ faktoren: [[1, 1, 2, 2, 2]], raender: [{ 1: 1, 2: 1 }] }));
    nah(n.gewichte[0], 1.25, 1e-12, 'Kategorie 1'); nah(n.gewichte[2], 5 / 6, 1e-12, 'Kategorie 2');
  });
  it('Raking auf die Ränder der eigenen Stichprobe ändert nichts: alle Gewichte 1, ein Durchgang', () => {
    const a = D.apisrs as Z; const tab = (v: string[]) => { const m: Record<string, number> = {}; v.forEach(x => { m[x] = (m[x] ?? 0) + 1; }); return m; };
    const e = ok(rake({ faktoren: [a.stype, a['sch.wide']], raender: [tab(a.stype), tab(a['sch.wide'])] })); expect(e.durchgaenge).toBe(R.eigene_raender_aendern_nichts.durchgaenge); e.gewichte.forEach((w: number, i: number) => nah(w, 1, 1e-12, `Fall ${i}`));
  });
  it('Ausgangsgewicht: fehlendes oder nicht positives Ausgangsgewicht lässt den Fall ohne Gewicht; Summe bleibt n der Gewichteten; Skalierung ändert Mittel und Kish nicht', () => {
    const a = D.apisrs as Z, w0 = Array(200).fill(2) as (number | null)[]; w0[5] = null; w0[9] = 0; const e = ok(rake({ faktoren: [a.stype, a['sch.wide']], raender: [{ E: 4421, H: 755, M: 1018 }, { No: 1072, Yes: 5122 }], ausgang: w0 }));
    expect(e.ohneGewicht).toEqual([5, 9]); expect(e.gewichte[5]).toBeNull(); expect(e.nGewichtet).toBe(198); nah(e.summe, 198, 1e-12, 'Σ'); const sk = R.skalierung as Z; nah(sk.kish_N, sk.kish_n, 1e-9, 'Kish unabhängig von der Skala'); nah(sk.mittel_N, sk.mittel_n, 1e-9, 'Mittel unabhängig von der Skala');
  });
  it('fehlender Wert im Beispiel apisrs (5 von 200 ohne sch.wide): 195 gewichtet, 10 Durchgänge, Kish 195 (gleich viele Gewichte, Ränder auf den 195)', () => {
    const a = D.apisrs as Z, B = R.fehlender_wert as Z, sw = (a['sch.wide'] as (string | null)[]).slice(); for (const z of D.fehlender_wert_apisrs_zeilen_ohne_sch_wide as number[]) sw[z - 1] = null;
    const e = ok(rake({ faktoren: [a.stype, sw], raender: [{ E: 4421, H: 755, M: 1018 }, { No: 1072, Yes: 5122 }] })); expect(e.nGewichtet).toBe(B.n_gewichtet); expect(e.durchgaenge).toBe(B.durchgaenge); expect(e.ohneGewicht).toEqual((B.zeilen_ohne_gewicht as number[]).map(z => z - 1)); nah(e.summe, 195, 1e-12, 'Σ');
  });
});

describe('Standardfehler nach Raking (Hinweis) und Sätze (de und en)', () => {
  it('die Statable-Weise (geraketen Gewichte als feste Gewichte) gibt SE 9,37, das neu geraktete Replikatdesign 9,08, ohne Raking 9,40: etwas zu groß, nicht zu klein', () => {
    const se = R.standardfehler_nach_raking as Z; expect(se.se_feste_gewichte_statable_weg).toBeGreaterThan(se.se_replikate_neu_geraked_jk1); expect(se.se_feste_gewichte_statable_weg).toBeLessThan(se.se_ohne_raking); nah(se.mittel_api00, R.apisrs.mittel_api00.raking, 1e-9, 'Mittel');
    expect(rakingSeSatz()).toMatch(/etwas zu groß|vorsichtig/);
    // S-F2 Prüfung M2: nicht allgemein, sondern „meist“, mit dem belegten Beispiel
    expect(rakingSeSatz()).toBe('Statable nimmt die Gewichte als fest. Der Standardfehler ist dadurch meist etwas zu groß, also eher vorsichtig (Beispiel: 9,37 statt 9,08).');
  });
  const d = D.apisrs as Z; const e = safe(() => ok(rake({ faktoren: [d.stype, d['sch.wide']], raender: [{ E: 4421, H: 755, M: 1018 }, { No: 1072, Yes: 5122 }] })))!;
  it('Satz deutsch: Raking, Merkmale, 10 Durchgänge, effektive Stichprobengröße (Kish) 199,8 von 200, Skalierung auf Mittel 1', () => {
    const t = rakingSaetze(e, ['Schultyp', 'Schulprogramm']).join(' '); for (const re of [/Raking/, /Schultyp/, /Schulprogramm/, /10 Durchgänge/, /199,8 von 200/, /Kish/, /Mittel 1|Summe der Gewichte/]) expect(t).toMatch(re); expect(t).not.toMatch(/\[prüfen\]|S\. \d/);
  });
  it('Satz englisch', () => { s.einst.sprache = 'en'; try { const t = rakingSaetze(e, ['school type', 'schoolwide']).join(' '); for (const re of [/raking/i, /10 iterations/, /effective sample size/, /199\.8 of 200/]) expect(t).toMatch(re); } finally { s.einst.sprache = 'de'; } });
  it('Fälle ohne Gewicht und Hinweise bekommen je einen Satz; Fehlersätze nennen Kategorie und Merkmal; „nicht erreicht“: „nicht vereinbar“', () => {
    const a = (D.apisrs as Z)['sch.wide'].slice() as (string | null)[]; a[3] = null; const e2 = ok(rake({ faktoren: [d.stype, a], raender: [{ E: 4421, H: 755, M: 1018 }, { No: 1072, Yes: 5122 }] })); expect(rakingSaetze(e2, ['Schultyp', 'Schulprogramm']).join(' ')).toMatch(/1 Fall ohne Gewicht|1 Fall bekommt kein Gewicht|1 Fall/);
    expect(rakingFehlerSatz({ ok: false, code: 'kategorie-ohne-stichprobe', merkmal: 0, kategorie: 'x' }, ['Geschlecht'])).toMatch(/x/); expect(rakingFehlerSatz({ ok: false, code: 'kategorie-ohne-stichprobe', merkmal: 0, kategorie: 'x' }, ['Geschlecht'])).toMatch(/Geschlecht/);
    expect(rakingFehlerSatz({ ok: false, code: 'nicht-erreicht', maxAbweichung: 0.5, durchgaenge: 1000 }, ['Geschlecht'])).toMatch(/nicht vereinbar/); expect(rakingFehlerSatz({ ok: false, code: 'rand-null', merkmal: 0, kategorie: 'd' }, ['Geschlecht'])).toMatch(/0/);
    for (const code of ['merkmale', 'rand-fehlt', 'kategorie-ohne-rand', 'zu-wenig']) expect(rakingFehlerSatz({ ok: false, code } as any, ['Geschlecht']).length, code).toBeGreaterThan(10);
  });
});
