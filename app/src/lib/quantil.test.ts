import { describe, expect, it } from 'vitest';
import ERW from './testdaten/spaeter-e-erwartet.json';
import { s } from './sitzung.svelte';
import { tVerteilungOben, tQuantil } from './verteilung';
import { katDaten } from './kategreg';
import type { Spalte } from './verzeichnis';
import type { Wert } from './eingabe';
import {
  QR_B, QR_NID_AB_N, QR_NIVEAU, QR_STARTWERT, quantilMethode, quantilIntervall, quantilNidIntervall, quantilKiWahl, quantilTauPruefung, quantilTauGueltig, quantilPruefung, quantilCodeSatz,
  quantilWarnCodes, quantilKreuzenFaelle, quantilKreuzpunkte, quantilKreuzenRaster, quantilFehlerSatz, quantilGerechnet, quantilAufruf, type QuantilCode
} from './quantil';
import { zusatzModelle } from './kategwahl';

/* ===== Später, Welle S-E, Teil Q1: Quantilregression (Fachblatt docs/fachblaetter/SPAETER-E-VORHERSAGE-ZEITREIHEN-CLUSTER.md, „Entscheidungen Opus (18.10.)“ gehen vor) =====
 * ROTE TESTS des Sollwert-Prüfers. Der Bauer A darf diese Datei und die JSON nicht ändern. Er baut `lib/quantil.ts` (reine Funktionen, hier getestet) und die R-Funktion `sp_quantil`
 * (engine/statable-vorhersage-e.R; ihre Zahlen werden in engine/spaeter-e.webr.test.ts gegen dieselbe JSON geprüft). Sollwerte: scripts/spaeter-e-erwartet.R (R 4.6.1, quantreg 6.1;
 * zweite Quellen: lpSolve-Programm, Brute-Force über alle Paare, eigene Bootstrap-Schleife, nid von Hand - alle im Skript mit stopifnot).
 * Opus-Entscheidungen, die hier gelten: Bootstrap-Perzentil (xy-Paare, B = 2000, fester Startwert 20261008) bis einschließlich n = 1000, darüber `nid`; Niveau 95 % von Statable gesetzt;
 * KEIN R¹; Bild und Tabelle nehmen dieselben Intervalle; Fallgewicht gesperrt (gewichte-spaeter-e.test.ts).
 *
 * SCHNITTSTELLE lib/quantil.ts
 *   QR_B = 2000 · QR_NID_AB_N = 1000 (darüber nid) · QR_NIVEAU = 0.95 · QR_STARTWERT = 20261008
 *   quantilMethode(n): 'bootstrap' | 'nid'                                          n <= 1000 → Bootstrap
 *   quantilIntervall(spalte: number[], b0: number, niveau = QR_NIVEAU)               Bootstrap-Spalte (B Werte eines Koeffizienten) → { B, se, unten, oben }; se = Standardabweichung (n − 1),
 *                                                                                   Grenzen = Perzentil-Intervall wie boot::norm.inter (lib/bootstrap.ts intervall(…, 'perzentil', niveau)); kein p
 *   quantilNidIntervall(b, se, df, niveau = QR_NIVEAU)                              → { t, p, unten, oben } mit t(df): unten/oben = b ∓ qt(1 − (1 − niveau)/2, df)·se, p zweiseitig
 *   quantilKiWahl(n, wunsch: 'standard' | 'rang' | 'nid' | 'bootstrap', ereignis?: { rangFehler?: boolean; nidWarnung?: boolean }) → { ki: 'bootstrap' | 'nid' | 'rang'; codes: QuantilCode[] }
 *        standard → quantilMethode(n); 'rang' → Rang-Umkehr, bei rangFehler Rückfall auf quantilMethode(n) mit Code 'rueckfall-rang'; 'nid' bei n <= 1000 → Bootstrap mit Code 'nid-nur-gross';
 *        bei ki 'nid' und nidWarnung: bleibt 'nid', Code 'nid-warnung'
 *   quantilTauPruefung(n, p, tau): 'ok' | 'hinweis' | 'sperre'                      n·min(tau, 1 − tau) < p → sperre; < 10 → hinweis
 *   quantilTauGueltig(taus: number[]): { ok: boolean; grund?: 'leer' | 'bereich' | 'zu-viele' | 'stellen' | 'doppelt' }     0 < tau < 1, höchstens 9, höchstens 3 Dezimalstellen, keine doppelten
 *   quantilPruefung(e: { n; p /* Koeffizienten inkl. Konstante *\/; verschiedeneZiel; nurKonstante?; gewicht?; kleinsteGruppe?; taus?: number[] }) → { sperre: boolean; codes: QuantilCode[] }, Codes in dieser Reihenfolge:
 *        sperren: 'gewicht', 'nur-konstante', 'ziel-konstant' (verschiedeneZiel < 2), 'zwei-werte' (genau 2), 'zu-wenig-faelle' (n < 20 oder n < 5·p), 'tau-sperre'
 *        hinweise: 'wenig-faelle' (n < 50; nicht zusammen mit zu-wenig-faelle), 'wenige-werte' (3 bis 14 verschiedene), 'kleine-gruppe' (kleinsteGruppe < 5), 'tau-hinweis'
 *        ('tau-sperre' und 'tau-hinweis' nie zusammen: gibt es eine gesperrte τ, steht nur 'tau-sperre'; sonst 'tau-hinweis', wenn eine τ den Hinweis von quantilTauPruefung bekommt; ohne taus: keiner von beiden)
 *   quantilCodeSatz(code: QuantilCode, e?: object): string                          nicht leer, Zahlen ohne NaN/undefined, de und en verschieden
 *   quantilWarnCodes(warnungen: string[]): QuantilCode[]                            R-Meldung „Solution may be nonunique“ → 'nicht-eindeutig', „n non-positive fis“ → 'nid-warnung'; anderes wird ignoriert
 *   quantilKreuzenFaelle(taus: number[], koef: number[][], x: number[][], tol = 1e-9): { anzahl: number; zeilen: number[] }       koef[j] = Koeffizienten zu taus[j] (Konstante zuerst),
 *        x = SPALTEN der Entwurfsmatrix inkl. Spalte aus Einsen; kreuzen = ein höheres Quantil liegt unter einem niedrigeren (relativ tol); zeilen 0-basiert
 *   quantilKreuzpunkte(taus, koef): number[]                                        eine Vorhersagegröße (koef[j] = [a, b]): Stellen x, an denen benachbarte Geraden sich schneiden, aufsteigend
 *   quantilKreuzenRaster(taus, koef, von, bis, schritte = 21): number               Zahl der Rasterpunkte mit Kreuzung
 *   quantilFehlerSatz(meldung: string): string                                      „Singular design matrix“ → Satz „zwei Vorhersagegrößen enthalten dasselbe“; sonst Satz mit der Meldung
 *   quantilGerechnet({ n, ki, B, startwert }): string                               Zeile „Gerechnet“ (quantreg, Barrodale-Roberts, Bootstrap/nid, B, Startwert, n)
 *   quantilAufruf(dt: KatDaten, o: { tau: number[]; ki: 'boot' | 'nid' | 'rang'; B: number; startwert: number }): { code: string; args: Record<string, string | string[]> }
 *        dt aus katDaten('zaehlreg', ziel, praed, zeilen, spalten) (Ziel als Zahl `y`, Vorhersagegrößen p01 …); der Code ruft sp_quantil mit rIds/rZahl/rGanz/rWahl, Text nur über args
 *   kategwahl.ts: zusatzModelle(spalte, verschieden, werte): ('quantil' | 'penal')[]   Zahl-Ziel (zielArt 'zahl'): beide; zwei Werte, Text, nominal: []   (modelleFuer bleibt unverändert; ModellArt bekommt 'quantil' und 'penal')
 */
s.einst.sprache = 'de'; s.einst.anrede = 'du';
type Z = Record<string, any>;
const J = ERW as unknown as Z;
const F = J.quantil.faelle as Record<string, Z>;
const KJ = J.quantil_js as Z;
const n = (t: string) => t.replace(/[  ]/g, ' ');
const nah = (ist: number, soll: number, tol: number, was: string) => expect(Math.abs(ist - soll) / Math.max(Math.abs(soll), 1e-12), `${was} (ist ${ist}, soll ${soll})`).toBeLessThanOrEqual(tol);
const arr = (x: any): any[] => (Array.isArray(x) ? x : x == null ? [] : [x]);

describe('Festwerte (Opus 1)', () => {
  it('B, Grenze, Niveau, Startwert', () => { expect(QR_B).toBe(2000); expect(QR_NID_AB_N).toBe(1000); expect(QR_NIVEAU).toBe(0.95); expect(QR_STARTWERT).toBe(20261008); expect(J.startwert).toBe(20261008); });
  it('Methode nach n: bis einschließlich 1000 Bootstrap, darüber nid', () => {
    for (const k of [20, 147, 235, 999, 1000]) expect(quantilMethode(k), String(k)).toBe('bootstrap');
    for (const k of [1001, 2000, 100000]) expect(quantilMethode(k), String(k)).toBe('nid');
    expect(KJ.methode.grenze_n).toBe(1000); expect(F.gross_nid!.soll.n).toBe(2000); expect(quantilMethode(F.gross_nid!.soll.n)).toBe('nid'); expect(quantilMethode(F.engel_boot_tau5!.soll.n)).toBe('bootstrap');
  });
});

describe('Bootstrap-Perzentil-Intervall aus der Matrix (Engel, τ = ,5, B = 2000, Startwert 20261008)', () => {
  const soll = J.quantil.intervall_engel as Z, spalten = soll.spalten ?? F.engel_boot_tau5!.soll.ergebnisse[0].boot.spalten;
  for (const [j, name] of ['Konstante', 'Einkommen (Steigung)'].entries()) it(`${name}: SE und Perzentil-Grenzen gleich boot::norm.inter in R`, () => {
    const o = quantilIntervall(spalten[j] as number[], soll.b[j], 0.95);
    expect(o.B).toBe(2000); nah(o.se, soll.se[j], 1e-9, 'SE'); nah(o.unten, soll.unten[j], 1e-9, 'unten'); nah(o.oben, soll.oben[j], 1e-9, 'oben');
    expect(o.unten).toBeLessThan(soll.b[j]); expect(o.oben).toBeGreaterThan(soll.b[j]);
    expect((o as Z).p, 'beim Bootstrap kein p-Wert (Opus 1)').toBeUndefined();
  });
  it('die Matrix hat 2000 Zeilen und zwei Spalten; Steigung etwa [0,470; 0,608] (Fachblatt 0,473; 0,613 mit anderem Startwert)', () => {
    expect(spalten.length).toBe(2); expect(spalten[0].length).toBe(2000);
    const o = quantilIntervall(spalten[1], soll.b[1]); expect(o.unten).toBeGreaterThan(0.45); expect(o.unten).toBeLessThan(0.5); expect(o.oben).toBeGreaterThan(0.59); expect(o.oben).toBeLessThan(0.63);
  });
  it('anderes Niveau: 90 % ist schmaler als 95 %', () => {
    const a = quantilIntervall(spalten[1], soll.b[1], 0.9), b = quantilIntervall(spalten[1], soll.b[1], 0.95); expect(b.oben - b.unten).toBeGreaterThan(a.oben - a.unten);
  });
  it('Rand: eine Spalte aus lauter gleichen Werten gibt SE 0 und ein Intervall ohne NaN', () => {
    const o = quantilIntervall(Array(500).fill(1.5), 1.5); expect(o.se).toBe(0); expect(o.unten).toBe(1.5); expect(o.oben).toBe(1.5);
  });
  it('Rand: zu kurze oder leere Spalte wirft nicht, gibt aber nie NaN zurück', () => {
    for (const sp of [[], [1], [1, 2]]) { const o = quantilIntervall(sp as number[], 1); for (const v of [o.se, o.unten, o.oben]) expect(Number.isNaN(v), JSON.stringify(sp)).toBe(false); }
  });
});

describe('nid für n > 1000 (2000 Zeilen aus Engel)', () => {
  const e = F.gross_nid!.soll.ergebnisse[0] as Z, df = e.nid.df;
  it('Freiheitsgrade n − p', () => { expect(df).toBe(1998); });
  for (const [j, name] of ['Konstante', 'Steigung'].entries()) it(`${name}: t, p und das t-Intervall`, () => {
    const o = quantilNidIntervall(e.b[j], e.nid.se[j], df, 0.95);
    nah(o.t, e.nid.t[j], 1e-9, 't'); const p = e.nid.p[j]; if (p < 1e-15) expect(o.p, 'R rechnet p als 2·(1 − pt), das unter 1e-16 zu 0 wird').toBeLessThan(1e-15); else nah(Math.log(o.p), Math.log(p), 1e-6, 'log p');
    const tq = tQuantil(0.975, df); nah(o.unten, e.b[j] - tq * e.nid.se[j], 1e-9, 'unten'); nah(o.oben, e.b[j] + tq * e.nid.se[j], 1e-9, 'oben');
    nah(2 * tVerteilungOben(Math.abs(o.t), df), o.p, 1e-9, 'p zweiseitig');
  });
  it('Rand: se = 0 oder df = 0 gibt nie NaN', () => { for (const [b, se, d] of [[1, 0, 10], [1, 1, 0], [0, 1, 1]] as const) { const o = quantilNidIntervall(b, se, d); for (const v of [o.t, o.p, o.unten, o.oben]) expect(Number.isNaN(v), `${b} ${se} ${d}`).toBe(false); } });
});

describe('Wahl der Intervall-Methode mit Rückfällen als Codes', () => {
  it('Standard folgt n', () => { expect(quantilKiWahl(147, 'standard')).toEqual({ ki: 'bootstrap', codes: [] }); expect(quantilKiWahl(2000, 'standard')).toEqual({ ki: 'nid', codes: [] }); });
  it('Rang-Umkehr: läuft, bei R-Fehler (n = 30, τ = ,9) Rückfall auf den Bootstrap mit Satz', () => {
    expect(quantilKiWahl(235, 'rang')).toEqual({ ki: 'rang', codes: [] });
    expect(quantilKiWahl(30, 'rang', { rangFehler: true })).toEqual({ ki: 'bootstrap', codes: ['rueckfall-rang'] });
    expect(quantilKiWahl(5000, 'rang', { rangFehler: true })).toEqual({ ki: 'nid', codes: ['rueckfall-rang'] });
  });
  it('nid wird bei kleinem n nicht angeboten (Bootstrap mit Hinweis); bei großem n bleibt nid auch mit der Warnung „non-positive fis“', () => {
    expect(quantilKiWahl(200, 'nid')).toEqual({ ki: 'bootstrap', codes: ['nid-nur-gross'] });
    expect(quantilKiWahl(2000, 'nid', { nidWarnung: true })).toEqual({ ki: 'nid', codes: ['nid-warnung'] });
    expect(quantilKiWahl(2000, 'standard', { nidWarnung: true })).toEqual({ ki: 'nid', codes: ['nid-warnung'] });
    expect(quantilKiWahl(200, 'standard', { nidWarnung: true })).toEqual({ ki: 'bootstrap', codes: [] });
  });
  it('„bootstrap“ gewünscht bei großem n bleibt Bootstrap (die Person darf warten)', () => { expect(quantilKiWahl(5000, 'bootstrap')).toEqual({ ki: 'bootstrap', codes: [] }); });
});

describe('τ: Gültigkeit, Ränder (Fachblatt 1.5)', () => {
  it('Sperre n·min(τ, 1 − τ) < p, Hinweis unter 10', () => {
    expect(quantilTauPruefung(235, 2, 0.05)).toBe('ok');        // 11,75
    expect(quantilTauPruefung(235, 2, 0.01)).toBe('hinweis');   // 2,35
    expect(quantilTauPruefung(30, 2, 0.9)).toBe('hinweis');     // 3
    expect(quantilTauPruefung(30, 2, 0.95)).toBe('sperre');     // 1,5 < 2
    expect(quantilTauPruefung(100, 2, 0.05)).toBe('hinweis');   // 5
    expect(quantilTauPruefung(147, 5, 0.5)).toBe('ok');
    expect(quantilTauPruefung(147, 5, 0.1)).toBe('ok');         // 14,7
  });
  it('Rand: tau 0 und 1 und NaN sind nie „ok“', () => { for (const t of [0, 1, -1, 2, NaN]) expect(quantilTauPruefung(100, 2, t), String(t)).toBe('sperre'); });
  it('Liste: Voreinstellung ok, freie Eingabe mit Grenzen', () => {
    expect(quantilTauGueltig([0.25, 0.5, 0.75]).ok).toBe(true);
    expect(quantilTauGueltig([0.05, 0.1, 0.25, 0.5, 0.75, 0.9, 0.95]).ok).toBe(true);
    expect(quantilTauGueltig([])).toEqual({ ok: false, grund: 'leer' });
    expect(quantilTauGueltig([0, 0.5])).toEqual({ ok: false, grund: 'bereich' }); expect(quantilTauGueltig([0.5, 1])).toEqual({ ok: false, grund: 'bereich' });
    expect(quantilTauGueltig(Array.from({ length: 10 }, (_, i) => (i + 1) / 20))).toEqual({ ok: false, grund: 'zu-viele' });
    expect(quantilTauGueltig(Array.from({ length: 9 }, (_, i) => (i + 1) / 20)).ok).toBe(true);
    expect(quantilTauGueltig([0.1234])).toEqual({ ok: false, grund: 'stellen' }); expect(quantilTauGueltig([0.123]).ok).toBe(true);
    expect(quantilTauGueltig([0.5, 0.5])).toEqual({ ok: false, grund: 'doppelt' });
  });
});

describe('Prüfung der Eingabe: sperren und Hinweise (Fachblatt 1.7)', () => {
  const gut = { n: 147, p: 5, verschiedeneZiel: 140, taus: [0.5] };
  it('gute Eingabe: nichts', () => { expect(quantilPruefung(gut)).toEqual({ sperre: false, codes: [] }); });
  it('Fallgewicht gesperrt', () => { expect(quantilPruefung({ ...gut, gewicht: true })).toEqual({ sperre: true, codes: ['gewicht'] }); });
  it('nur Konstante (y ~ 1): nicht angeboten', () => { expect(quantilPruefung({ ...gut, p: 1, nurKonstante: true })).toEqual({ sperre: true, codes: ['nur-konstante'] }); });
  it('Ziel konstant / nur zwei Werte', () => {
    expect(quantilPruefung({ ...gut, verschiedeneZiel: 1 })).toEqual({ sperre: true, codes: ['ziel-konstant'] });
    expect(quantilPruefung({ ...gut, verschiedeneZiel: 2 })).toEqual({ sperre: true, codes: ['zwei-werte'] });
  });
  it('wenige Fälle: n < 20 oder n < 5·p gesperrt; n < 50 Hinweis', () => {
    expect(quantilPruefung({ ...gut, n: 19, p: 2 })).toEqual({ sperre: true, codes: ['zu-wenig-faelle', 'tau-hinweis'] });   // 19·0,5 = 9,5 < 10
    expect(quantilPruefung({ ...gut, n: 24, p: 5, verschiedeneZiel: 24 })).toEqual({ sperre: true, codes: ['zu-wenig-faelle'] });
    expect(quantilPruefung({ ...gut, n: 30, p: 2, verschiedeneZiel: 30 })).toEqual({ sperre: false, codes: ['wenig-faelle'] });
    expect(quantilPruefung({ ...gut, n: 50 })).toEqual({ sperre: false, codes: [] });
  });
  it('wenige verschiedene Werte im Ziel (Likert): Hinweis, kein Sperren', () => {
    expect(quantilPruefung({ ...gut, verschiedeneZiel: 5 })).toEqual({ sperre: false, codes: ['wenige-werte'] });
    expect(quantilPruefung({ ...gut, verschiedeneZiel: 14 })).toEqual({ sperre: false, codes: ['wenige-werte'] });
    expect(quantilPruefung({ ...gut, verschiedeneZiel: 15 })).toEqual({ sperre: false, codes: [] });
  });
  it('kleine Gruppe (unter 5 Fälle): Hinweis', () => { expect(quantilPruefung({ ...gut, kleinsteGruppe: 4 })).toEqual({ sperre: false, codes: ['kleine-gruppe'] }); expect(quantilPruefung({ ...gut, kleinsteGruppe: 5 }).codes).toEqual([]); });
  it('τ am Rand: Sperre (n = 30, τ = ,95), Hinweis (n = 100, τ = ,05)', () => {
    expect(quantilPruefung({ n: 30, p: 2, verschiedeneZiel: 30, taus: [0.5, 0.95] })).toEqual({ sperre: true, codes: ['tau-sperre', 'wenig-faelle'] });
    expect(quantilPruefung({ n: 100, p: 2, verschiedeneZiel: 100, taus: [0.05, 0.5] })).toEqual({ sperre: false, codes: ['tau-hinweis'] });
  });
  it('mehrere Gründe zusammen: Reihenfolge wie im Kopf (erst sperren, dann Hinweise)', () => {
    const o = quantilPruefung({ n: 18, p: 2, verschiedeneZiel: 4, gewicht: true, nurKonstante: false, taus: [0.5] }); expect(o.sperre).toBe(true); expect(o.codes).toEqual(['gewicht', 'zu-wenig-faelle', 'wenige-werte', 'tau-hinweis']);
  });
  it('Rand: n = 0, NaN oder fehlende taus liefern Sperre ohne Fehler', () => { expect(quantilPruefung({ n: 0, p: 1, verschiedeneZiel: 0 }).sperre).toBe(true); expect(() => quantilPruefung({ n: NaN, p: NaN, verschiedeneZiel: NaN })).not.toThrow(); });
});

describe('Sätze (ganze Sätze je Fall, de und en)', () => {
  const alle: QuantilCode[] = ['gewicht', 'nur-konstante', 'ziel-konstant', 'zwei-werte', 'zu-wenig-faelle', 'tau-sperre', 'wenig-faelle', 'wenige-werte', 'kleine-gruppe', 'tau-hinweis', 'nicht-eindeutig', 'nid-warnung', 'rueckfall-rang', 'nid-nur-gross', 'kreuzen'];
  for (const c of alle) it(`${c}: nicht leer, ohne NaN/undefined, englisch anders`, () => {
    const de = quantilCodeSatz(c, { n: 30, p: 2, tau: 0.95, anzahl: 8, von: 150 }); s.einst.sprache = 'en';
    try { const en = quantilCodeSatz(c, { n: 30, p: 2, tau: 0.95, anzahl: 8, von: 150 }); expect(de.length).toBeGreaterThan(20); expect(en.length).toBeGreaterThan(20); expect(en).not.toBe(de); for (const t of [de, en]) expect(t).not.toMatch(/NaN|undefined|\[object/); } finally { s.einst.sprache = 'de'; }
  });
  it('Inhalt der wichtigsten Sätze', () => {
    expect(quantilCodeSatz('gewicht')).toMatch(/Quantilregression/); expect(quantilCodeSatz('gewicht')).toMatch(/Fallgewicht/);
    expect(quantilCodeSatz('nicht-eindeutig')).toMatch(/nicht eindeutig/); expect(quantilCodeSatz('rueckfall-rang')).toMatch(/Bootstrap/);
    expect(quantilCodeSatz('nid-warnung')).toMatch(/nid/); expect(quantilCodeSatz('wenige-werte')).toMatch(/Quantile/);
    expect(n(quantilCodeSatz('kreuzen', { anzahl: 8, von: 147 }))).toMatch(/8/); expect(quantilCodeSatz('nur-konstante')).toMatch(/Vorhersagegröße/);
  });
  it('Zeile „Gerechnet“ nennt Paket, Verfahren, B, Startwert und n', () => {
    const t = n(quantilGerechnet({ n: 147, ki: 'bootstrap', B: 2000, startwert: 20261008 })); for (const w of ['quantreg', 'Barrodale', 'Bootstrap', '2000', '20261008', 'n = 147', 'Perzentil']) expect(t, w).toContain(w);
    const t2 = n(quantilGerechnet({ n: 2000, ki: 'nid', B: 2000, startwert: 20261008 })); expect(t2).toContain('nid'); expect(t2).toContain('Hendricks'); expect(t2).not.toContain('Startwert');
    expect(t.replace(/n = 147/, '')).not.toMatch(/90 %|\biid\b/);   // 90 % und iid der Voreinstellung von summary.rq nie übernehmen
  });
});

describe('Warnungen aus R werden Codes', () => {
  it('Sollwerte aus R: τ = ,25 und ,75 in quant.csv (nid)', () => {
    const ws = (F.quant_nid!.soll.ergebnisse as Z[]).map(e => arr(e.warnungen) as string[]);
    expect(quantilWarnCodes(ws[0]!)).toContain('nid-warnung'); expect(quantilWarnCodes(ws[1]!)).toEqual([]); expect(quantilWarnCodes(ws[2]!)).toEqual(expect.arrayContaining(['nid-warnung', 'nicht-eindeutig']));
  });
  it('Median bei geradem n (Gruppe 0/1, je sechs Fälle): Konstante 4 statt 3,5, nicht eindeutig', () => {
    const e = F.gerade_nid!.soll.ergebnisse[0] as Z; expect(arr(e.b)).toEqual([4, 9]); expect(quantilWarnCodes(arr(e.warnungen))).toContain('nicht-eindeutig');
  });
  it('unbekannte Meldungen werden ignoriert, Mehrfaches nur einmal', () => { expect(quantilWarnCodes(['etwas anderes'])).toEqual([]); expect(quantilWarnCodes(['Solution may be nonunique', 'Solution may be nonunique']).filter(c => c === 'nicht-eindeutig').length).toBe(1); });
});

describe('Kreuzende Quantile (Fachblatt 1.10 Nr. 4)', () => {
  const K = KJ.kreuzen as Z, taus = K.tau as number[], koef = (K.koef as any[]).map(arr), x = (K.x as any[]).map(arr);
  it('quant.csv: 8 von 147 Fällen kreuzen - das Fachblatt nennt 9, einer davon ist ein Gleichstand mit Rundungsrauschen (−1,8e-15)', () => {
    const o = quantilKreuzenFaelle(taus, koef, x);
    expect(K.anzahl).toBe(8); expect(K.anzahl_ohne_toleranz).toBe(9); expect(o.anzahl).toBe(8); expect(o.zeilen.length).toBe(8);
    const gl = arr(K.zeilen_mit_gleichstand).map((z: number) => z - 1); expect(gl.length).toBe(1); for (const z of gl) expect(o.zeilen).not.toContain(z);
  });
  it('die Reihenfolge der τ in der Eingabe ändert nichts', () => {
    const idx = taus.map((_, i) => i).reverse(); expect(quantilKreuzenFaelle(idx.map(i => taus[i]!), idx.map(i => koef[i]!), x).anzahl).toBe(8);
  });
  it('Engel: die Geraden kreuzen erst unterhalb des beobachteten Bereichs', () => {
    const E = K.engel as Z, tt = E.tau as number[], kk = (E.koef as any[]).map(arr);
    const pkt = quantilKreuzpunkte(tt, kk); expect(pkt.length).toBe(6);
    for (const [i, v] of pkt.entries()) nah(v, arr(E.kreuzpunkte)[i], 1e-9, `Kreuzungspunkt ${i}`);
    expect(Math.max(...pkt)).toBeLessThan(E.von); nah(Math.max(...pkt), E.groesster_kreuzpunkt, 1e-9, 'größter');
    expect(quantilKreuzenRaster(tt, kk, E.von, E.bis, 21)).toBe(E.raster_anzahl); expect(E.raster_anzahl).toBe(0);
    expect(quantilKreuzenRaster(tt, kk, Math.max(...pkt) - 100, E.bis, 21), 'Raster bis unterhalb des Kreuzungspunktes: Kreuzungen sichtbar').toBeGreaterThan(0);
  });
  it('Rand: eine einzige τ oder keine Zeile gibt 0 ohne Fehler', () => {
    expect(quantilKreuzenFaelle([0.5], [[1, 2]], [[1, 1], [3, 4]]).anzahl).toBe(0); expect(quantilKreuzenFaelle(taus, koef, x.map(() => [])).anzahl).toBe(0); expect(quantilKreuzpunkte([0.5], [[1, 2]])).toEqual([]);
  });
});

describe('Fehler aus R als Satz', () => {
  it('Rangmangel (zwei gleiche Vorhersagegrößen)', () => {
    const m = J.quantil.fehler_rangmangel as string; expect(m).toMatch(/Singular design matrix/);
    const t = quantilFehlerSatz(m); expect(t).toMatch(/dasselbe/); expect(t.length).toBeGreaterThan(20);
  });
  it('unbekannte Meldung: ein Satz mit der Meldung, nie leer', () => { const t = quantilFehlerSatz('etwas ganz anderes'); expect(t).toContain('etwas ganz anderes'); expect(quantilFehlerSatz('')).not.toBe(''); });
});

describe('Modellwahl „Weitere Wege“ (lib/kategwahl.ts, zusatzModelle)', () => {
  const sp = (o: Partial<Spalte> = {}): Spalte => ({ name: 'y', bezeichnung: 'y', art: 'zahl', niveau: 'metrisch', format: '', fehlend: [], fehlendText: '', werteLabels: {}, ...o });
  it('Zahl-Ziel: Quantilregression und Strafregression', () => { expect(zusatzModelle(sp(), 40, [1.5, 2.5, 3.2])).toEqual(['quantil', 'penal']); expect(zusatzModelle(sp(), 5, [1, 2, 3, 4, 5])).toEqual(['quantil', 'penal']); });
  it('zwei Werte, Text, nominal beschriftet: nichts', () => {
    expect(zusatzModelle(sp(), 2, [0, 1])).toEqual([]); expect(zusatzModelle(sp({ art: 'text' }), 4)).toEqual([]);
    expect(zusatzModelle(sp({ niveau: 'nominal', werteLabels: { '1': 'a', '2': 'b', '3': 'c' } }), 3, [1, 2, 3])).toEqual([]); expect(zusatzModelle(sp({ art: 'datum' }), 30)).toEqual([]);
  });
});

describe('R-Aufruf: Sicherheit (Spaltennamen voller Anführungszeichen)', () => {
  const GEFAHR = [`x'); assign('.pwned', TRUE, globalenv()); ('`, `a\`; system("touch /tmp/pwned"); \`b`, `q"); stop("x"); ("`];
  const spalten: Spalte[] = [`z${GEFAHR[0]}`, `p${GEFAHR[1]}`, `g${GEFAHR[2]}`].map(name => ({ name, bezeichnung: name, art: 'zahl', niveau: 'metrisch', format: '', fehlend: [], fehlendText: '', werteLabels: {} }) as Spalte);
  const zeilen: Wert[][] = Array.from({ length: 30 }, (_, i) => [i * 1.5 + 1, i, i % 3]);
  it('der Code enthält nur feste Wörter, Bezeichner und Zahlen; Namen aus den Daten stehen nirgends darin', () => {
    const dt = katDaten('zaehlreg', spalten[0]!.name, [spalten[1]!.name, spalten[2]!.name], zeilen, spalten);
    const a = quantilAufruf(dt, { tau: [0.25, 0.5, 0.75], ki: 'boot', B: 2000, startwert: 20261008 });
    expect(a.code).toContain('sp_quantil('); expect(a.code).not.toMatch(/pwned|system|touch|stop\(|`|"/); expect(a.code).toMatch(/^tryCatch\(/);
    for (const v of Object.values(a.args)) expect(typeof v === 'string' || Array.isArray(v)).toBe(true);
    expect(() => quantilAufruf(dt, { tau: [NaN], ki: 'boot', B: 2000, startwert: 1 })).toThrow(); expect(() => quantilAufruf(dt, { tau: [0.5], ki: 'x' as any, B: 2000, startwert: 1 })).toThrow();
  });
});
