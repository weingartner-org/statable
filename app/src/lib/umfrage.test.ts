import { describe, expect, it } from 'vitest';
import ERW from './testdaten/spaeter-d2-erwartet.json';
import { s } from './sitzung.svelte';
import { komma, ohneNull, pWert } from './ergebnis';
import { wMittel } from './gewichte';
import type { Gewicht } from './gewichte';
import {
  UMFRAGE_MAX_ZEILEN, UMFRAGE_MAX_ZELLEN, umfrageGrenze, umfrageDf, ki, gewichtKennzahlen, umfrageHinweise, umfrageLesen, umfrageFehlerSatz, anteilGrenzeSatz,
  umfrageSatz, umfrageFuss, umfrageMethode, pruefePunktschaetzer, hinweisSatz
} from './umfrage';

/* ===== Später, Welle S-D2: Umfragegewichte mit survey (Fachblatt docs/fachblaetter/SPAETER-D2-UMFRAGEGEWICHTE.md, Abschnitt „Entscheidungen Opus (17.10.)“ geht vor) =====
 * ROTE TESTS des Sollwert-Prüfers. Der Bauer darf diese Datei und die JSON nicht ändern; er baut `lib/umfrage.ts` (reine Hilfen, hier getestet) und die R-Funktionen in
 * `engine/statable-umfrage.R` (die Zahlen selbst; geprüft gegen die JSON in `engine/umfrage.webr.test.ts`, sobald survey in webR läuft).
 * Sollwerte: scripts/spaeter-d2-erwartet.R → testdaten/spaeter-d2-erwartet.json (R 4.6.1, survey 4.5; zweite Quelle Handrechnung aus Fachblatt Anhang A, dritte sandwich::vcovCL).
 *
 * ---------- VERTRAG DER R-FUNKTIONEN (Ort: engine/statable-umfrage.R; jede wirft nie, Fehler = Felder `fehler_code` + Zahlen) ----------
 *   Eingabe immer: d = data.frame (Spalten wie RMotor.daten; Codes als Zahl), w = NAME der Gewichtsspalte, auswahl = NAME einer 0/1-Spalte oder NULL (Teilpopulation), niveau fest 0,95.
 *   Zeilen mit Gewicht <= 0 oder NA löscht die Funktion vor `svydesign`; das Design wird EINMAL je Aufruf gebaut (svydesign(ids = ~1, weights = ~.w)); jede Frage rechnet auf
 *   subset(des, ok), ok = gültig in allen Variablen der Frage UND in der Auswahl (Zeilen bleiben im Design: Varianz n/(n-1) mit n = alle Zeilen, df aus den Fällen der Teilpopulation).
 *   Antwort = Liste wie `soll` in den Fällen der JSON (faelle[i].soll); Skalare dürfen als Vektor der Länge 1 ankommen (rZuJson), NULL als {type:'null'} oder null.
 *   sp_umfrage_mittel(d, ys, w, auswahl = NULL, mu0 = NULL)                 → { ergebnisse: [{name, n, df, mittel, se, konstant, ki_u, ki_o, deff_survey, test: {mu0, diff, t, df, p} | null, gewicht, [fehler_code, n]}] }
 *   sp_umfrage_anteil(d, y, w, auswahl = NULL, kategorien = NULL)           → { n, df, kategorien: [{wert, treffer, p, se, df, grenze, wenige_faelle, logit: {u, o} | null, beta: {u, o} | null}], gewicht }
 *   sp_umfrage_kreuz(d, a, b, w, auswahl = NULL)                            → { n, k, df, x2, delta_mittel, f, ndf, ddf, p_f, chi2_rs1, df_chi2, p_chi2, zellen: {zeilen, spalten, n_zellen, leer, duenn_anteil}, gewicht }
 *   sp_umfrage_gruppen(d, y, g, gruppen, w, auswahl = NULL)                 → { n, k, gruppen: [{code, n, mittel, se, df, ki_u, ki_o}], test: {art: 't', gruppe1, gruppe2, diff, se, t, df, p, ki_u, ki_o} | {art: 'wald-f', f, ndf, ddf, p}, gewicht }
 *   sp_umfrage_regression(d, y, praed, logistik, w, auswahl = NULL)         → { n, df, koef: [{name, b, se, t, p, ki_u, ki_o, [or, or_u, or_o]}], gesamt: {f, ndf, ddf, p}, [r2_gewichtet | ereignisse], npar, gewicht, warnungen }
 *   Alle Zahlen und Texte der Antwort sind UNBENANNTE Vektoren (as.numeric/unname), sonst macht rZuJson Objekte daraus.
 *   gewicht = { n, kish_neff, deff_w, w_min, w_max } AUF DEN FÄLLEN DER FRAGE (nicht auf allen Zeilen). Namen der Koeffizienten: "(Intercept)" und die Spaltennamen der Prädiktoren.
 *   Fehler: { fehler_code, ... } mit den Codes aus `UmfrageFehlerCode` unten und den Feldern, die die Fälle der JSON zeigen (n, gruppe, n_gruppe, spalte, zeilenstufen, spaltenstufen).
 *   ENTSCHEIDUNGEN (gelten für Soll, Abweichung von survey steht in `survey_roh`): t-Quantile mit df = Fälle der Teilpopulation − Zahl der Parameter, bei Mittelwert UND Einstichproben-Test n − 1 (survey: z bzw. n − 2);
 *   Differenz = Gruppe 1 − Gruppe 2 (survey: zweite − erste); Anteil: Logit-Intervall (svyciprop method = "logit") und Korn-Graubard (method = "beta"), nie Wald; Rao-Scott F zweiter Ordnung (svychisq "F") und χ² erster
 *   Ordnung = F · k; ab 3 Gruppen nur Wald-F (regTermTest), gewichtetes R² = 1 − Σw·e²/Σw(y − ȳ_w)² (beschreibend); logistisch quasibinomial; Trennung (Warnung „converge“ / „numerically 0 or 1“ im Lauf mit Voreinstellung) → fehler_code
 *   'trennung'; Rangmangel (QR der gewichteten Designmatrix) → 'rangmangel' mit `spalte`; logistisches Soll = vollständig konvergierte Fassung (survey bricht bei der Konvergenzschwelle ab): Toleranz 1e-5.
 *   TOLERANZEN der webR-Prüfung (relativ): Mittel, Anteil, Kreuz, Gruppen, lineare Regression 1e-9; logistisch 1e-5; p-Werte auf der log-Skala |ln(ist/soll)| < 1e-4.
 *
 * ---------- SCHNITTSTELLE lib/umfrage.ts (reine Funktionen, hier getestet; die Zahlen kommen aus webR) ----------
 *   UMFRAGE_MAX_ZEILEN = 200000, UMFRAGE_MAX_ZELLEN = 400;  umfrageGrenze(zeilen, zellen?) → 'zu-viele-zeilen' | 'zu-viele-zellen' | null
 *   umfrageDf.{mittel, einstichprobe, zweiGruppen, gruppenWald, regression, raoScott}(n, …)                         Freiheitsgrade (Entscheidung Opus 5)
 *   ki(schaetzer, se, df, niveau = 0,95) → { u, o }                                                              t-Intervall (lib/verteilung.ts tQuantil), nie z
 *   gewichtKennzahlen(w, ok?) → { n, kishNeff, designeffektW, wMin, wMax, verhaeltnis }                           Kish je Frage (nur Fälle mit ok und w > 0)
 *   umfrageHinweise(art, e) → Codes (siehe UmfrageHinweis), e = Ergebnis von umfrageLesen; Fehler-Ergebnisse geben []
 *   umfrageLesen(art, antwort) → camelCase-Ergebnis (ki_u → kiU, kish_neff → kishNeff, fehler_code → fehlerCode …), Skalare aus Vektoren der Länge 1, null aus {type:'null'}/null; Felder `warnungen` bleiben Listen
 *   umfrageFehlerSatz(e) / anteilGrenzeSatz(p) / hinweisSatz(code, e?) → ganze Sätze (L/Lp, übersetzbar)
 *   umfrageSatz(art, e, ctx) → { haupt, detail, fuss, hinweise: string[] }   ctx = { gewicht: Gewicht, name, index?, gruppenNamen?, methode? }
 *   umfrageFuss(g, gew) / umfrageMethode(g) → Fußzeile bzw. Methodensatz (0.6 des Fachblatts, mit der Antwort „einzeln gezogen“ nach Entscheidung Opus 1)
 *   pruefePunktschaetzer(js, r, tol = 1e-8) → null | { index, js, r }                                             Selbstprüfung: Statable rechnet Mittel/Anteil/Koeffizienten zweimal (JS/PSPP und R), Abbruch bei Abweichung
 */
s.einst.sprache = 'de'; s.einst.anrede = 'du';
type Z = Record<string, any>;
const J = ERW as unknown as Z;
const FAELLE = J.faelle as Z[];
const fall = (id: string): Z => FAELLE.find(f => f.id === id)!;
const gU = { spalte: 'pw', art: 'umfrage', klumpenfrei: true } as Gewicht;
const mitSprache = <T,>(sp: 'de' | 'en', f: () => T): T => { const alt = s.einst.sprache; s.einst.sprache = sp; try { return f(); } finally { s.einst.sprache = alt; } };
const rel = (ist: number, soll: number, tol: number, was: string) => expect(Math.abs(ist - soll) / Math.max(Math.abs(soll), 1e-300), `${was}: ist ${ist}, soll ${soll}`).toBeLessThanOrEqual(tol);
const camel = (k: string) => k.replace(/_([a-z0-9])/g, (_m, c: string) => c.toUpperCase());
const camelisiere = (x: any): any => (Array.isArray(x) ? x.map(camelisiere) : x && typeof x === 'object' ? Object.fromEntries(Object.entries(x).map(([k, v]) => [camel(k), camelisiere(v)])) : x);
/** So kommt es aus webR (rZuJson): Skalare als Vektor der Länge 1, NULL als {type:'null'}; Listen von Zeilen und Textlisten bleiben Listen. */
const alsWebR = (x: any, schluessel = ''): any => (x === null ? { type: 'null' } : Array.isArray(x) ? x.map(v => alsWebR(v, schluessel)) : x && typeof x === 'object' ? Object.fromEntries(Object.entries(x).map(([k, v]) => [k, alsWebR(v, k)])) : schluessel === 'warnungen' ? x : [x]);
const dfText = (v: number) => komma(v, Number.isInteger(v) ? 0 : 2);
const ARTEN = ['mittel', 'anteil', 'kreuz', 'gruppen', 'regression'] as const;
const OHNE_FEHLER = FAELLE.filter(f => !f.soll.fehler_code);
const MIT_FEHLER = FAELLE.filter(f => f.soll.fehler_code);

describe('Die Sollwerte-Datei ist vollständig', () => {
  it('R 4.6, survey 4.5; alle Pflichtfälle des Fachblatts (P1 bis P29) kommen vor', () => {
    expect(J.survey_version).toBe('4.5'); expect(String(J.r_version)).toMatch(/R version 4\.6/);
    const ids = FAELLE.map(f => f.id as string);
    for (const p of ['P1', 'P2', 'P4a', 'P4b', 'P5', 'P6', 'P7', 'P8', 'P9', 'P10', 'P11', 'P12', 'P13', 'P14', 'P15', 'P16', 'P17', 'P18', 'P19', 'P20', 'P21', 'P22', 'P23', 'P24', 'P25', 'P26', 'P27', 'P28']) expect(ids, p).toContain(p);
    expect(FAELLE.length).toBeGreaterThanOrEqual(40);
    for (const a of ARTEN) expect(FAELLE.some(f => f.art === a), a).toBe(true);
  });
  it('zu jedem Fall gehören Daten, Frage und Sollwert', () => {
    for (const f of FAELLE) { expect(J.daten[f.daten], f.id).toBeDefined(); expect(f.frage, f.id).toBeDefined(); expect(f.soll, f.id).toBeDefined(); expect(Array.isArray(f.hinweise), f.id).toBe(true); }
  });
});

describe('Grenzen (Entscheidung Opus 7: 200 000 Zeilen, 400 Zellen)', () => {
  it('Zeilengrenze: 200 000 geht, 200 001 nicht (P35)', () => {
    expect(UMFRAGE_MAX_ZEILEN).toBe(200000); expect(UMFRAGE_MAX_ZELLEN).toBe(400);
    expect(umfrageGrenze(200000)).toBeNull(); expect(umfrageGrenze(200001)).toBe('zu-viele-zeilen'); expect(umfrageGrenze(5)).toBeNull();
  });
  it('Zellgrenze: 400 Zellen gehen, 401 nicht; Zeilen zuerst geprüft', () => {
    expect(umfrageGrenze(100, 400)).toBeNull(); expect(umfrageGrenze(100, 401)).toBe('zu-viele-zellen'); expect(umfrageGrenze(300000, 9999)).toBe('zu-viele-zeilen');
  });
  it('die Grenzen stehen auch in der Sollwerte-Datei', () => { expect(J.grenzen.max_zeilen).toBe(UMFRAGE_MAX_ZEILEN); expect(J.grenzen.max_zellen).toBe(UMFRAGE_MAX_ZELLEN); });
  it('Satz mit Zahlen: „höchstens 200 000“ bzw. 400 (jeder Satz nennt Zahlen)', () => {
    expect(umfrageFehlerSatz({ fehlerCode: 'zu-viele-zeilen', n: 250000 })).toMatch(/250.?000/); expect(umfrageFehlerSatz({ fehlerCode: 'zu-viele-zeilen', n: 250000 })).toMatch(/200.?000/);
    expect(umfrageFehlerSatz({ fehlerCode: 'zu-viele-zellen', zellen: 450 })).toContain('400'); expect(umfrageFehlerSatz({ fehlerCode: 'zu-viele-zellen', zellen: 450 })).toContain('450');
  });
});

describe('Freiheitsgrade: t mit Fällen der Teilpopulation − Zahl der Parameter (Entscheidung Opus 5)', () => {
  for (const z of J.df as Z[]) it(`${z.art}: n = ${z.n}, ${z.parameter} Parameter → df ${z.df}`, () => {
    const f = { mittel: () => umfrageDf.mittel(z.n), einstichprobe: () => umfrageDf.einstichprobe(z.n), anteil: () => umfrageDf.mittel(z.n), zweigruppen: () => umfrageDf.zweiGruppen(z.n),
      gruppen3: () => umfrageDf.gruppenWald(z.n, 3), regression: () => umfrageDf.regression(z.n, z.parameter), raoscott: () => umfrageDf.raoScott(z.n) }[z.art as string]!;
    expect(f()).toBe(z.df);
  });
  it('Einstichproben-Test rechnet n − 1 (nicht n − 2 wie survey) - die Abweichung steht in der Sollwerte-Datei', () => {
    const t = fall('P2').soll.ergebnisse[0].test;
    expect(t.df).toBe(199); expect(umfrageDf.einstichprobe(200)).toBe(199);
    expect(fall('P2').survey_roh.api00.svyttest_df).toBe(198);   // survey_roh: was survey von sich aus liefert (Schlüssel der JSON bleiben snake_case)
  });
  it('die df der Fälle folgen aus n und Parametern', () => {
    for (const f of OHNE_FEHLER) {
      const s2 = f.soll;
      if (f.art === 'mittel') for (const e of s2.ergebnisse) { expect(e.df).toBe(umfrageDf.mittel(e.n)); if (e.test) expect(e.test.df).toBe(umfrageDf.einstichprobe(e.n)); }
      if (f.art === 'anteil') for (const k of s2.kategorien) expect(k.df).toBe(umfrageDf.mittel(s2.n));
      if (f.art === 'kreuz') expect(s2.df).toBe(umfrageDf.raoScott(s2.n));
      if (f.art === 'gruppen') { if (s2.test.art === 't') expect(s2.test.df).toBe(umfrageDf.zweiGruppen(s2.n)); else expect(s2.test.ddf).toBe(umfrageDf.gruppenWald(s2.n, s2.k)); for (const g of s2.gruppen) expect(g.df).toBe(umfrageDf.mittel(g.n)); }
      if (f.art === 'regression') { expect(s2.df).toBe(umfrageDf.regression(s2.n, s2.npar)); expect(s2.gesamt.ddf).toBe(s2.df); }
    }
  });
  it('Rand: zu wenige Fälle geben keine Zahl, die nach NaN riecht', () => {
    for (const v of [umfrageDf.mittel(1), umfrageDf.zweiGruppen(2), umfrageDf.regression(3, 3)]) expect(Number.isFinite(v)).toBe(true);
    expect(umfrageDf.mittel(1)).toBe(0); expect(umfrageDf.regression(2, 3)).toBeLessThan(1);
  });
});

describe('Intervall: t mit den Freiheitsgraden des Designs, nie z', () => {
  for (const k of J.ki_t as Z[]) it(`Schätzer ${k.est}, SE ${k.se}, df ${k.df}`, () => { const r = ki(k.est, k.se, k.df); rel(r.u, k.u, 1e-9, 'unten'); rel(r.o, k.o, 1e-9, 'oben'); });
  it('Mittel apistrat: t(199) [643,3853; 681,1894], nicht das z-Intervall [643,5003; 681,0745] (Befund 2a)', () => {
    const e = fall('P2').soll.ergebnisse[0], r = ki(e.mittel, e.se, e.df);
    rel(r.u, e.ki_u, 1e-9, 'u'); rel(r.o, e.ki_o, 1e-9, 'o'); expect(Math.abs(r.u - 643.5003)).toBeGreaterThan(0.1); expect(e.ki_u).toBeCloseTo(643.385314, 5);
    expect(fall('P2').survey_roh.api00.ki_z[0]).toBeCloseTo(643.5003, 3);
  });
  it('niveau 90 % ist schmaler als 95 %', () => { const a = ki(10, 2, 30), b = ki(10, 2, 30, 0.9); expect(b.o - b.u).toBeLessThan(a.o - a.u); });
  it('alle Intervalle der Fälle sind t-Intervalle der Fälle (Mittel, Gruppenmittel, Regression)', () => {
    for (const f of OHNE_FEHLER) {
      if (f.art === 'mittel') for (const e of f.soll.ergebnisse) { if (e.konstant) continue; const r = ki(e.mittel, e.se, e.df); rel(r.u, e.ki_u, 1e-9, f.id); rel(r.o, e.ki_o, 1e-9, f.id); }
      if (f.art === 'gruppen') for (const g of f.soll.gruppen) { const r = ki(g.mittel, g.se, g.df); rel(r.u, g.ki_u, 1e-9, f.id); rel(r.o, g.ki_o, 1e-9, f.id); }
      if (f.art === 'regression') for (const k of f.soll.koef) { const r = ki(k.b, k.se, f.soll.df); rel(r.u, k.ki_u, f.frage.logistik ? 1e-9 : 1e-9, f.id + ' ' + k.name); rel(r.o, k.ki_o, 1e-9, f.id + ' ' + k.name); }
      if (f.art === 'gruppen' && f.soll.test.art === 't') { const t = f.soll.test, r = ki(t.diff, t.se, t.df); rel(r.u, t.ki_u, 1e-9, f.id); rel(r.o, t.ki_o, 1e-9, f.id); }
    }
  });
  it('Odds-Ratio-Intervall = exp(b ± t·SE) (P27)', () => { for (const k of fall('P27').soll.koef) { const r = ki(k.b, k.se, 197); rel(Math.exp(r.u), k.or_u, 1e-9, k.name); rel(Math.exp(r.o), k.or_o, 1e-9, k.name); } });
  it('Rand: SE 0 gibt ein Intervall der Breite 0, nie NaN', () => { const r = ki(5, 0, 10); expect(r).toEqual({ u: 5, o: 5 }); });
});

describe('Kennzahlen der Gewichte: Kish und Designeffekt je Frage (Falle 5)', () => {
  for (const b of J.gewichte_kennzahlen as Z[]) it(`${b.id}`, () => {
    const g = gewichtKennzahlen(b.w, b.ok); expect(g.n).toBe(b.soll.n);
    rel(g.kishNeff, b.soll.kish_neff, 1e-12, 'Kish'); rel(g.designeffektW, b.soll.deff_w, 1e-12, 'deff_w'); rel(g.wMin, b.soll.w_min, 1e-12, 'min'); rel(g.wMax, b.soll.w_max, 1e-12, 'max'); rel(g.verhaeltnis, b.soll.w_max / b.soll.w_min, 1e-12, 'Verhältnis');
  });
  it('Teilgruppe: Kish auf den Fällen der Frage ist ein anderer Wert als auf allen Zeilen', () => {
    const w = J.daten.apistrat.spalten.pw as number[], sel = (J.daten.apistrat.spalten.sel_e as number[]).map(x => x === 1);
    expect(gewichtKennzahlen(w, sel).kishNeff).not.toBeCloseTo(gewichtKennzahlen(w).kishNeff, 3); expect(gewichtKennzahlen(w, sel).n).toBe(100);
    const e = fall('P9').soll.ergebnisse[0].gewicht; rel(gewichtKennzahlen(w, sel).kishNeff, e.kish_neff, 1e-12, 'P9');
  });
  it('Gewicht 0 und fehlende Gewichte zählen nicht (Zeilenregel)', () => {
    const w = J.daten.apistrat.spalten.pw0 as (number | null)[]; const g = gewichtKennzahlen(w as number[]); expect(g.n).toBe(190); expect(g.wMin).toBeGreaterThan(0);
    expect(gewichtKennzahlen([2, 0, null as any, NaN, 4]).n).toBe(2);
  });
  it('Skalierung ×0,01, ×10: Kish und Designeffekt gleich, wMin und wMax skalieren (P3)', () => {
    const w = J.daten.apistrat.spalten.pw as number[], g0 = gewichtKennzahlen(w);
    for (const fk of J.skalierung.faktoren as number[]) { const g = gewichtKennzahlen(w.map(x => x * fk)); rel(g.kishNeff, g0.kishNeff, 1e-12, 'Kish'); rel(g.designeffektW, g0.designeffektW, 1e-12, 'deff'); rel(g.wMax, g0.wMax * fk, 1e-12, 'max'); }
    rel(g0.kishNeff, J.skalierung.kish_neff, 1e-12, 'JSON'); rel(g0.designeffektW, J.skalierung.deff_w, 1e-12, 'JSON deff');
  });
  it('Fachblatt 1.3: 168,58 von 200, Designeffekt der Gewichte 1,19; 8 Zeilen: 6,609 und 1,210', () => {
    const e = fall('P2').soll.ergebnisse[0].gewicht; expect(e.kish_neff).toBeCloseTo(168.5813, 3); expect(e.deff_w).toBeCloseTo(1.186371, 5);
    const k = fall('P11').soll.ergebnisse[0].gewicht; expect(k.kish_neff).toBeCloseTo(6.6089385, 6); expect(k.deff_w).toBeCloseTo(1.2104818, 6);
  });
  it('Rand: alle Gewichte gleich → n_eff = n, Verhältnis 1; ein Fall → n_eff 1', () => {
    const g = gewichtKennzahlen([3, 3, 3, 3]); expect(g.kishNeff).toBeCloseTo(4, 12); expect(g.verhaeltnis).toBe(1); expect(gewichtKennzahlen([7]).kishNeff).toBeCloseTo(1, 12);
    const leer = gewichtKennzahlen([]); expect(leer.n).toBe(0); for (const v of Object.values(leer)) expect(Number.isNaN(v), 'kein NaN bei leerer Liste').toBe(false);
  });
});

describe('Hinweise (Warnschwellen, Entscheidung Opus 6) gegen die Sollwerte', () => {
  for (const f of OHNE_FEHLER) it(`${f.id}: ${JSON.stringify(f.hinweise)}`, () => {
    const e = umfrageLesen(f.art, alsWebR(f.soll));
    expect([...umfrageHinweise(f.art, e)].sort()).toEqual([...f.hinweise].sort());
  });
  it('Fehler-Ergebnisse haben keine Hinweise', () => { for (const f of MIT_FEHLER) expect(umfrageHinweise(f.art, umfrageLesen(f.art, alsWebR(f.soll))), f.id).toEqual([]); });
  const m = (n: number, kishNeff: number, wMin: number, wMax: number) => ({ ergebnisse: [{ n, gewicht: { n, kishNeff, deffW: n / kishNeff, wMin, wMax } }] });
  it('ungleiche Gewichte: n_eff/n < 0,5 ODER größtes/kleinstes > 10 (Grenzen gehören nicht dazu)', () => {
    expect(umfrageHinweise('mittel', m(100, 50, 1, 10))).toEqual([]);
    expect(umfrageHinweise('mittel', m(100, 49.99, 1, 10))).toEqual(['ungleiche-gewichte']);
    expect(umfrageHinweise('mittel', m(100, 80, 1, 10.0001))).toEqual(['ungleiche-gewichte']);
    expect(umfrageHinweise('mittel', m(100, 80, 3, 29.999))).toEqual([]);
  });
  it('kleine Stichprobe: n < 30', () => {
    expect(umfrageHinweise('mittel', m(30, 30, 1, 1))).toEqual([]); expect(umfrageHinweise('mittel', m(29, 29, 1, 1))).toEqual(['kleine-stichprobe']);
  });
  it('kleine Gruppe: weniger als 10 Fälle in einer Gruppe', () => {
    const g = (a: number, b: number) => ({ n: 100, k: 2, gruppen: [{ n: a }, { n: b }], gewicht: { n: 100, kishNeff: 90, wMin: 1, wMax: 2 } });
    expect(umfrageHinweise('gruppen', g(10, 10))).toEqual([]); expect(umfrageHinweise('gruppen', g(10, 9))).toEqual(['kleine-gruppe']);
  });
  it('Anteil: weniger als 10 Fälle auf der kleineren Seite → Hinweis auf Korn-Graubard; 0 oder alle → kein Hinweis (Satz statt Intervall)', () => {
    const a = (treffer: number, n = 100) => ({ n, kategorien: [{ treffer, grenze: treffer === 0 || treffer === n }], gewicht: { n, kishNeff: n * 0.9, wMin: 1, wMax: 2 } });
    expect(umfrageHinweise('anteil', a(10))).toEqual([]); expect(umfrageHinweise('anteil', a(9))).toEqual(['wenige-faelle']); expect(umfrageHinweise('anteil', a(91))).toEqual(['wenige-faelle']);
    expect(umfrageHinweise('anteil', a(0))).toEqual([]); expect(umfrageHinweise('anteil', a(100))).toEqual([]);
  });
  it('Kreuztabelle: leere Zelle; mehr als 20 % dünne Zellen', () => {
    const k = (leer: number, duennAnteil: number) => ({ n: 100, zellen: { leer, duennAnteil }, gewicht: { n: 100, kishNeff: 90, wMin: 1, wMax: 2 } });
    expect(umfrageHinweise('kreuz', k(0, 0.2))).toEqual([]); expect(umfrageHinweise('kreuz', k(0, 0.2001))).toEqual(['duenne-tabelle']); expect(umfrageHinweise('kreuz', k(1, 0))).toEqual(['leere-zelle']);
  });
  it('Regression: weniger als 10 Fälle je Prädiktor; logistisch weniger als 10 Ereignisse je Prädiktor', () => {
    const r = (n: number, npar: number, ereignisse?: number) => ({ n, npar, ereignisse, gewicht: { n, kishNeff: n * 0.9, wMin: 1, wMax: 2 } });
    expect(umfrageHinweise('regression', r(40, 5))).toEqual([]); expect(umfrageHinweise('regression', r(39, 5))).toEqual(['wenige-pro-praediktor']);
    expect(umfrageHinweise('regression', r(100, 3, 20))).toEqual([]); expect(umfrageHinweise('regression', r(100, 3, 19))).toEqual(['wenige-ereignisse']); expect(umfrageHinweise('regression', r(100, 3, 81))).toEqual(['wenige-ereignisse']);
  });
  it('jeder Hinweis hat einen Satz mit Zahl oder Namen (nie leer, nie NaN)', () => {
    for (const code of ['ungleiche-gewichte', 'kleine-stichprobe', 'kleine-gruppe', 'wenige-faelle', 'leere-zelle', 'duenne-tabelle', 'wenige-pro-praediktor', 'wenige-ereignisse'] as const) {
      const t = hinweisSatz(code); expect(t.length, code).toBeGreaterThan(30); expect(t).not.toMatch(/NaN|undefined|null|\[object/);
    }
    const t = hinweisSatz('ungleiche-gewichte', { n: 100, gewicht: { n: 100, kishNeff: 40, wMin: 1, wMax: 31 } } as any);
    expect(t).toContain('31'); expect(t).toContain('40'); expect(t).toContain('100'); expect(t).toMatch(/n - 1|n − 1/); expect(t).toMatch(/zu schmal/);
    expect(hinweisSatz('wenige-faelle')).toContain('Korn-Graubard');
  });
  it('die Schwellen sind Faustregeln ohne Quelle - der Satz sagt es so (Entscheidung Opus 6)', () => {
    for (const code of ['ungleiche-gewichte', 'kleine-stichprobe', 'kleine-gruppe'] as const) expect(hinweisSatz(code), code).toMatch(/Faustregel/);
  });
  it('englisch: derselbe Hinweis auf Englisch, Zahlen mit Punkt', () => { mitSprache('en', () => { const t = hinweisSatz('kleine-stichprobe'); expect(t).toMatch(/rule of thumb/i); expect(t).not.toMatch(/Stichprobe/); }); });
});

describe('R-Antwort lesen (webR liefert Skalare als Vektoren der Länge 1)', () => {
  for (const f of FAELLE) it(`${f.id} (${f.art})`, () => {
    const e = umfrageLesen(f.art, alsWebR(f.soll)); expect(e).toEqual(camelisiere(f.soll));
  });
  it('Antwort ohne Verpackung (Zahlen direkt) wird genauso gelesen', () => { for (const id of ['P2', 'P12', 'P24']) expect(umfrageLesen(fall(id).art, fall(id).soll)).toEqual(camelisiere(fall(id).soll)); });
  it('NULL → null, keine Wörter wie „type“ im Ergebnis; warnungen bleibt eine Liste', () => {
    const e = umfrageLesen('regression', alsWebR(fall('P27').soll)) as Z; expect(e.warnungen).toEqual([]);
    const m = umfrageLesen('mittel', alsWebR(fall('P1').soll)) as Z; expect(m.ergebnisse[0].test).toBeNull(); expect(JSON.stringify(m)).not.toContain('"type"');
    const mit = umfrageLesen('regression', { ...alsWebR(fall('P27').soll), warnungen: ['eine Warnung'] }) as Z; expect(mit.warnungen).toEqual(['eine Warnung']);
  });
  it('Fehlerantwort behält Code und Zahlen', () => {
    const e = umfrageLesen('regression', alsWebR(fall('P26').soll)) as Z; expect(e.fehlerCode).toBe('rangmangel'); expect(e.spalte).toBe('ell2'); expect(e.n).toBe(200);
  });
});

describe('Fehlersätze: ganze Sätze mit Zahlen und Namen (Fachblatt Abschnitt 8)', () => {
  const satz = (id: string) => umfrageFehlerSatz(umfrageLesen(fall(id).art, alsWebR(fall(id).soll)) as Z);
  it('zu wenige Fälle', () => { const t = umfrageFehlerSatz({ fehlerCode: 'zu-wenig', n: 1 }); expect(t).toContain('1'); expect(t).toMatch(/mindestens 2/); });
  it('Gruppe mit zu wenigen Fällen (P22)', () => { const t = satz('P22'); expect(t).toContain('2'); expect(t).toMatch(/1 Fall|nur 1/); expect(t).toMatch(/mindestens 2/); });
  it('Gruppe ohne Fall (P22b)', () => { const t = satz('P22b'); expect(t).toContain('2'); expect(t).toMatch(/kein|ohne|0 Fäll/i); });
  it('konstantes y (P23): kein Vergleich möglich, ohne Zahl-Unsinn', () => { const t = satz('P23'); expect(t).toMatch(/derselbe|gleich|konstant/i); expect(t).not.toMatch(/NaN|t =/); });
  it('Zeile oder Spalte mit nur einer Stufe (P18): sagt welche und wie viele', () => { const t = satz('P18'); expect(t).toMatch(/eine|1/); expect(t).toMatch(/Stufe|Kategorie|Ausprägung/); });
  it('Rangmangel (P26) nennt die Spalte', () => { const t = satz('P26'); expect(t).toContain('ell2'); expect(t).toMatch(/nicht schätzbar|exakt abhängig/); });
  it('Trennung (P28): „nicht konvergiert“ und der Hinweis auf vollständige Trennung', () => { const t = satz('P28'); expect(t).toMatch(/konvergiert/); expect(t).toMatch(/trennt|Trennung/); expect(t).not.toMatch(/\d{3,}/); });
  it('nur eine Kategorie in der Zielgröße; zu viele Prädiktoren', () => {
    expect(umfrageFehlerSatz({ fehlerCode: 'eine-kategorie', n: 50 })).toMatch(/eine|1|nur/); expect(umfrageFehlerSatz({ fehlerCode: 'zu-viele-praediktoren', n: 100, praediktoren: 25 })).toContain('25');
  });
  it('Anteil 0 % oder 100 %: ein Satz statt eines Intervalls („nicht berechenbar“, Entscheidung Opus 2)', () => {
    for (const p of [0, 1]) { const t = anteilGrenzeSatz(p); expect(t).toMatch(p === 0 ? /(^|[^0-9,])0\s%/ : /100\s%/); expect(t).toMatch(/nicht berechenbar/); expect(t).not.toMatch(/\[/); }
    expect(anteilGrenzeSatz(0)).toMatch(/größer als 0|größer sein/);
  });
  it('alle Fehlerfälle: kein NaN, undefined, null', () => { for (const f of MIT_FEHLER) expect(satz(f.id), f.id).not.toMatch(/NaN|undefined|null|\[object/); });
  it('unbekannter Code → allgemeiner Satz, keine Ausnahme', () => { expect(() => umfrageFehlerSatz({ fehlerCode: 'gibt-es-nicht' } as any)).not.toThrow(); expect(umfrageFehlerSatz({ fehlerCode: 'gibt-es-nicht' } as any).length).toBeGreaterThan(10); });
  it('englische Fassung ist englisch', () => { mitSprache('en', () => { const t = satz('P26'); expect(t).toContain('ell2'); expect(t).not.toMatch(/Spalte|exakt/); }); });
});

describe('Sätze (APA) mit den Zahlen aus den Sollwerten', () => {
  const lies = (id: string) => umfrageLesen(fall(id).art, alsWebR(fall(id).soll)) as Z;
  const ctx = (name: string, extra: Z = {}) => ({ gewicht: gU, name, ...extra });
  it('Mittelwert (1.5): M, SE, 95-%-KI, n, effektive Stichprobengröße', () => {
    const e = lies('P2'), r = e.ergebnisse[0], t = umfrageSatz('mittel', e, ctx('API-Wert'));
    expect(t.haupt).toContain(`M = ${komma(r.mittel)}`); expect(t.haupt).toContain(`SE = ${komma(r.se)}`); expect(t.haupt).toContain(`[${komma(r.kiU)}; ${komma(r.kiO)}]`);
    expect(t.haupt).toContain('95-%-KI'); expect(t.haupt).toContain('n = 200'); expect(t.haupt).toContain(komma(r.gewicht.kishNeff, 1)); expect(t.haupt).toContain('API-Wert');
    expect(t.haupt).toContain('662,29'); expect(t.haupt).toContain('[643,39; 681,19]');
  });
  it('Test gegen einen Wert: t(199), p nach APA, Differenz', () => {
    const e = lies('P2'), r = e.ergebnisse[0], t = umfrageSatz('mittel', e, ctx('API-Wert'));
    expect(t.haupt).toContain(`t(199) = ${komma(r.test.t)}`); expect(t.haupt).toContain(`p ${pWert(r.test.p)}`); expect(t.haupt).toContain('650'); expect(t.haupt).not.toContain('t(198)');
  });
  it('Mittelwert ohne Test enthält kein t(…)', () => { expect(umfrageSatz('mittel', lies('P1'), ctx('API-Wert')).haupt).not.toMatch(/t\(\d+\)/); });
  it('Mittelwert, zweite Variable mit Lücken (index 1): n = 197', () => { const t = umfrageSatz('mittel', lies('P2b'), ctx('API-Wert mit Lücken', { index: 1 })); expect(t.haupt).toContain('n = 197'); });
  it('konstante Variable: „SE = 0“, kein Intervall in Klammern (Rand)', () => { const t = umfrageSatz('mittel', lies('P23m'), ctx('Konstante')); expect(t.haupt).toContain('SE = 0'); expect(t.haupt).not.toMatch(/\[\s*-?\d/); expect(t.haupt).toMatch(/kein Intervall/); });
  it('Anteil mit Logit-Intervall in Prozent (2.5) und mit Korn-Graubard', () => {
    const e = lies('P4a'), k = e.kategorien[1];
    const l = umfrageSatz('anteil', e, ctx('mindestens 700 Punkte', { index: 1, methode: 'logit' })), b = umfrageSatz('anteil', e, ctx('mindestens 700 Punkte', { index: 1, methode: 'beta' }));
    expect(l.haupt).toMatch(new RegExp(`${komma(100 * k.p, 1)}\\s%`)); expect(l.haupt).toContain(`[${komma(100 * k.logit.u, 1)}; ${komma(100 * k.logit.o, 1)}]`); expect(l.haupt).toMatch(/Logit/); expect(l.haupt).not.toMatch(/Korn/);
    expect(b.haupt).toContain(`[${komma(100 * k.beta.u, 1)}; ${komma(100 * k.beta.o, 1)}]`); expect(b.haupt).toMatch(/Korn-Graubard/); expect(l.haupt).toMatch(/40,4\s%/);
  });
  it('Anteil mit Wenige-Fälle-Hinweis nennt Korn-Graubard; Anteil 0 % / 100 % hat keine Zahl im Intervall (P6)', () => {
    expect(umfrageSatz('anteil', lies('P5'), ctx('x', { index: 1 })).hinweise.join(' ')).toContain('Korn-Graubard');
    const g = umfrageSatz('anteil', lies('P6'), ctx('x', { index: 1 })); expect(g.haupt).toMatch(/nicht berechenbar/); expect(g.haupt).not.toMatch(/\[/);
  });
  it('Kreuztabelle (3.5, 3.6): F zweiter Ordnung in der Kopfzeile, χ² erster Ordnung nur im Detail, nie die Pearson-Zahl', () => {
    const e = lies('P12'), t = umfrageSatz('kreuz', e, ctx('Schultyp und Auszeichnung'));
    expect(t.haupt).toContain(`F(${dfText(e.ndf)}; ${dfText(e.ddf)}) = ${komma(e.f)}`); expect(t.haupt).toContain('F(1,89; 376,71) = 13,68'); expect(t.haupt).toContain(`p ${pWert(e.pF)}`); expect(t.haupt).toContain('p < ,001'); expect(t.haupt).toContain('Rao-Scott');
    expect(t.detail).toMatch(/χ²/); expect(t.detail).toContain(komma(e.chi2Rs1)); expect(t.detail).toContain('27,37'); expect(t.detail).toContain(`df = ${komma(e.dfChi2, 0)}`); expect(t.detail).toContain(komma(e.deltaMittel));
    const alles = [t.haupt, t.detail, t.fuss].join(' ');
    expect(alles).not.toContain(komma(e.x2)); expect(alles).not.toContain(komma(fall('P12').survey_roh.pearson_hochgerechnet)); expect(alles).not.toMatch(/Cramér|Cramer/);
  });
  it('Kreuztabelle 2×2: Zähler-Freiheitsgrade 1 (P13), Hinweis auf leere Zelle (P15)', () => {
    const e = lies('P13'), t = umfrageSatz('kreuz', e, ctx('x')); expect(t.haupt).toContain(`F(1; ${dfText(e.ddf)})`); expect(t.haupt).toContain('46,03');
    expect(umfrageSatz('kreuz', lies('P15'), ctx('x')).hinweise.join(' ')).toMatch(/Zelle ist leer|leer/);
  });
  it('Zwei Gruppen (4.5): Differenz erste minus zweite, beide Namen in dieser Reihenfolge, t(198), p', () => {
    const e = lies('P19'), t = umfrageSatz('gruppen', e, ctx('API-Wert', { gruppenNamen: ['ohne Auszeichnung', 'mit Auszeichnung'] }));
    expect(t.haupt).toContain(`Differenz = ${komma(e.test.diff)}`); expect(e.test.diff).toBeLessThan(0); expect(t.haupt).toContain('Differenz = −44,69'); expect(t.haupt).toContain(`[${komma(e.test.kiU)}; ${komma(e.test.kiO)}]`);
    expect(t.haupt).toContain(`t(198) = ${komma(e.test.t)}`); expect(t.haupt).toContain(`p ${pWert(e.test.p)}`); expect(t.haupt.indexOf('ohne Auszeichnung')).toBeGreaterThanOrEqual(0); expect(t.haupt.indexOf('ohne Auszeichnung')).toBeLessThan(t.haupt.indexOf('mit Auszeichnung'));
    expect(t.haupt).not.toMatch(/Welch|Student|Levene/); expect(t.haupt).toMatch(/designbasiert/);
  });
  it('Richtung (P20): Gruppe 1 = Ja → positive Differenz, Vorzeichen gegen survey gedreht', () => {
    const e = lies('P20'), t = umfrageSatz('gruppen', e, ctx('API-Wert', { gruppenNamen: ['mit Auszeichnung', 'ohne Auszeichnung'] })); expect(t.haupt).toContain('Differenz = 44,69');
    expect(fall('P20').soll.test.diff).toBeCloseTo(-fall('P19').soll.test.diff, 10); expect(fall('P19').survey_roh.diff_zweite_minus_erste).toBeCloseTo(44.687494, 5);
  });
  it('Drei Gruppen (4.5): nur der Gesamttest (Wald-F), kein Post-hoc, kein Paarvergleich', () => {
    const e = lies('P21'), t = umfrageSatz('gruppen', e, ctx('API-Wert'));
    expect(t.haupt).toContain(`F(${dfText(e.test.ndf)}; ${dfText(e.test.ddf)}) = ${komma(e.test.f)}`); expect(t.haupt).toContain('F(2; 197) = 3,48'); expect(t.haupt).toContain(`p ${pWert(e.test.p)}`); expect(t.haupt).toMatch(/Wald/);
    expect(t.haupt).not.toMatch(/Tukey|Games|Holm|Bonferroni|Welch|ANOVA|Varianzanalyse/); expect(JSON.stringify(e)).not.toMatch(/paar|posthoc/i);
  });
  it('Lineare Regression (5.5): b, SE, KI, t(197), p, gewichtetes R² als beschreibend', () => {
    const e = lies('P24'), k = e.koef[2], t = umfrageSatz('regression', e, ctx('Anteil kostenloser Mahlzeiten', { index: 2 }));
    expect(t.haupt).toContain(`b = ${komma(k.b)}`); expect(t.haupt).toContain('b = −3,11'); expect(t.haupt).toContain(`SE = ${komma(k.se)}`); expect(t.haupt).toContain(`[${komma(k.kiU)}; ${komma(k.kiO)}]`);
    expect(t.haupt).toContain(`t(197) = ${komma(k.t)}`); expect(t.haupt).toContain('p < ,001'); expect(t.haupt).toContain(`R² = ${ohneNull(e.r2Gewichtet)}`); expect(t.haupt).toMatch(/beschreibend/); expect(t.haupt).not.toMatch(/korrigiert/i);
  });
  it('Logistische Regression (6.5): OR mit KI, t(197), designbasierte Standardfehler, nie ROC/AUC/Pseudo-R²', () => {
    const e = lies('P27'), k = e.koef[2], t = umfrageSatz('regression', e, ctx('Anteil kostenloser Mahlzeiten', { index: 2 }));
    expect(t.haupt).toMatch(new RegExp(`OR = 0?${ohneNull(k.or).replace(/^0/, '').replace('.', '[.,]')}`)); expect(t.haupt).toContain(`t(197) = ${komma(k.t)}`); expect(t.haupt).toContain(`p ${pWert(k.p)}`); expect(t.haupt).toMatch(/designbasiert/);
    expect([t.haupt, t.detail, t.fuss].join(' ')).not.toMatch(/ROC|AUC|Pseudo|Hosmer|Klassifikation/);
  });
  it('Logistische Regression nennt die Zahl der Ereignisse (Zeilen, nie hochgerechnet)', () => { const t = umfrageSatz('regression', lies('P27'), ctx('x', { index: 2 })); expect([t.haupt, t.detail, t.fuss].join(' ')).toContain('73'); });
  it('Alle Sätze aller Fälle: kein NaN, undefined, null, Infinity, kein „Welch“ und keine leere Klammer', () => {
    for (const f of OHNE_FEHLER) {
      const e = lies(f.id), n = f.art === 'mittel' ? e.ergebnisse.length : f.art === 'anteil' ? e.kategorien.length : f.art === 'regression' ? e.koef.length : 1;
      for (let i = 0; i < n; i++) {
        const t = umfrageSatz(f.art, e, { gewicht: gU, name: 'Variable', index: i, gruppenNamen: ['Gruppe A', 'Gruppe B'], methode: 'logit' });
        const alles = [t.haupt, t.detail, t.fuss, ...t.hinweise].join(' | '); expect(alles, `${f.id}[${i}]`).not.toMatch(/NaN|undefined|null|Infinity|\[\s*;|\(\s*\)|\[object/); expect(t.haupt.length, f.id).toBeGreaterThan(20);
      }
    }
  });
  it('Englisch: Punkt als Dezimalzeichen, „CI“, kein Deutsch', () => {
    mitSprache('en', () => {
      const e = lies('P2'), r = e.ergebnisse[0], t = umfrageSatz('mittel', e, ctx('API score'));
      expect(t.haupt).toContain(`M = ${komma(r.mittel)}`); expect(t.haupt).toContain('662.29'); expect(t.haupt).toMatch(/CI/); expect(t.haupt).not.toMatch(/Konfidenz|Stichprobe|Schulen/);
      expect(umfrageSatz('kreuz', lies('P12'), ctx('x')).haupt).toContain('F(1.89; 376.71) = 13.68');
    });
  });
});

describe('Fußzeile und Methodensatz (0.6) mit der Antwort „einzeln gezogen“ (Entscheidung Opus 1)', () => {
  const gew = (fall('P2').soll.ergebnisse[0] as Z).gewicht;
  it('Fußzeile: n, Kish, Spalte, „einzeln gezogen“, „ohne Schichten und Klumpen“', () => {
    const t = umfrageFuss(gU, { n: gew.n, kishNeff: gew.kish_neff });
    expect(t).toContain('n = 200'); expect(t).toContain(komma(gew.kish_neff, 1)); expect(t).toMatch(/Kish/); expect(t).toContain('pw'); expect(t).toMatch(/einzeln gezogen/); expect(t).toMatch(/ohne Schichten und Klumpen/);
  });
  it('Methodensatz: Taylor-Linearisierung, survey 4.5, Lumley (2004), Spalte, einzeln gezogen', () => {
    const t = umfrageMethode(gU); expect(t).toMatch(/Taylor/); expect(t).toContain('survey'); expect(t).toContain('4.5'); expect(t).toMatch(/Lumley/); expect(t).toContain('pw'); expect(t).toMatch(/einzeln gezogen/);
    expect(t).toMatch(/designbasiert/); expect(t).toMatch(/[Gg]ewichtet/);
  });
  it('englisch', () => { mitSprache('en', () => { expect(umfrageMethode(gU)).toMatch(/Taylor/); expect(umfrageMethode(gU)).toMatch(/survey weight|design-based/); expect(umfrageMethode(gU)).not.toMatch(/Schichten|gewichtet/); }); });
  it('Rand: n_eff gleich n (keine Streuung der Gewichte) → keine Warnung, sonst Zahl', () => { const t = umfrageFuss(gU, { n: 50, kishNeff: 50 }); expect(t).toContain('50'); expect(t).not.toMatch(/NaN/); });
});

describe('Selbstprüfung: Punktschätzer von Statable (JS/PSPP) gegen R (P36)', () => {
  it('gleich bis 1e-8 → null', () => { expect(pruefePunktschaetzer([662.2873632, 0.4043397], [662.2873632 + 1e-9, 0.4043397])).toBeNull(); });
  it('absichtlich verstellte Spalte → Abbruch mit Index', () => {
    const r = pruefePunktschaetzer([662.28, 100], [662.2873632, 100.5]); expect(r).not.toBeNull(); expect(r!.index).toBe(0);
    expect(pruefePunktschaetzer([1, 2, 3], [1, 2, 3.0001])!.index).toBe(2);
  });
  it('NaN auf einer Seite zählt als Abweichung; verschieden lange Listen auch', () => { expect(pruefePunktschaetzer([NaN], [1])).not.toBeNull(); expect(pruefePunktschaetzer([1, 2], [1])).not.toBeNull(); });
  it('die vorhandenen JS-Punktschätzer treffen die Sollwerte (Mittel, Anteil)', () => {
    const y = J.daten.apistrat.spalten.api00 as number[], w = J.daten.apistrat.spalten.pw as number[], h = J.daten.apistrat.spalten.hoch700 as number[];
    expect(pruefePunktschaetzer([wMittel(y, w), wMittel(h, w)], [fall('P2').soll.ergebnisse[0].mittel, fall('P4a').soll.kategorien[1].p])).toBeNull();
  });
});

describe('Skalen-Invarianz (P3): welche Fälle in webR mit Gewichten ×0,01, ×10 und auf Mittel 1 normiert gleich bleiben müssen', () => {
  it('die JSON nennt Mittel, Anteil, Kreuztabelle, t-Test, lineare und logistische Regression', () => {
    expect(J.skalierte_faelle).toEqual(['P2', 'P4b', 'P12', 'P19', 'P24', 'P27']); expect(J.skalierungs_faktoren).toEqual([0.01, 10]);
    expect(new Set((J.skalierte_faelle as string[]).map(i => fall(i).art))).toEqual(new Set(['mittel', 'anteil', 'kreuz', 'gruppen', 'regression']));
  });
});

describe('Eigenschaften der Sollwerte (unabhängig von survey)', () => {
  it('gleiche Gewichte: SE des Mittels = s/√n, SE des Anteils = √(p(1−p)/(n−1)) (P1)', () => {
    const y = J.daten.apistrat.spalten.api00 as number[], n = y.length, m = y.reduce((a, b) => a + b, 0) / n, sd = Math.sqrt(y.reduce((a, b) => a + (b - m) ** 2, 0) / (n - 1));
    rel(fall('P1').soll.ergebnisse[0].se, sd / Math.sqrt(n), 1e-10, 'SE'); rel(fall('P4c').soll.kategorien[0].se, Math.sqrt(0.365 * 0.635 / (n - 1)), 1e-10, 'SE Anteil');
  });
  it('gleiche Gewichte: Rao-Scott-F = Pearson-χ²·(n−1)/(n·k) (P14)', () => {
    const f = fall('P14').soll; rel(f.f, 24.7584173 * 199 / (200 * 2), 1e-6, 'F'); rel(f.ndf, 2, 1e-9, 'ndf'); rel(f.ddf, 2 * 199, 1e-9, 'ddf');
  });
  it('Rao-Scott: χ² erster Ordnung = F·k; bei 2×2 ist es F (P13); mittlerer Designeffekt = X²/χ²', () => {
    for (const f of FAELLE.filter(x => x.art === 'kreuz' && !x.soll.fehler_code)) { const k = f.soll; rel(k.chi2_rs1, k.f * k.k, 1e-10, f.id); rel(k.deltaMittel ?? k.delta_mittel, k.x2 / k.chi2_rs1, 1e-9, f.id); }
    rel(fall('P13').soll.chi2_rs1, fall('P13').soll.f, 1e-12, 'P13');
  });
  it('Fachblatt 3.3: F = 13,6839436 (1,89300703; 376,708398), χ²_RS = 27,3678872, df = 2', () => {
    const k = fall('P12').soll; expect(k.f).toBeCloseTo(13.6839436, 6); expect(k.ndf).toBeCloseTo(1.89300703, 6); expect(k.ddf).toBeCloseTo(376.708398, 4); expect(k.chi2_rs1).toBeCloseTo(27.3678872, 6); expect(k.df_chi2).toBe(2);
  });
  it('Teilpopulation: subset und Löschen geben verschiedene SE (P9: 12,4934 gegen 12,5249); Gewicht 0: gelöscht ≠ im Design (P8)', () => {
    expect(fall('P9').soll.ergebnisse[0].se).toBeCloseTo(12.4934335, 6); expect(fall('P9').survey_roh.se_geloescht).toBeCloseTo(12.5249, 3); expect(fall('P9').soll.ergebnisse[0].df).toBe(99);
    expect(fall('P8').soll.ergebnisse[0].n).toBe(190); expect(fall('P8').soll.ergebnisse[0].se).not.toBeCloseTo(fall('P8').survey_roh.se_mit_nullzeilen, 4);
    expect(fall('P16').soll.f).not.toBeCloseTo(fall('P16').survey_roh.geloescht_F, 4);
  });
  it('fehlende Werte (P7, P25): Fälle und Freiheitsgrade zählen nur die gültigen', () => { expect(fall('P7').soll.ergebnisse[0].n).toBe(197); expect(fall('P7').soll.ergebnisse[0].df).toBe(196); expect(fall('P25').soll.n).toBe(195); expect(fall('P25').soll.df).toBe(192); expect(fall('P16').soll.n).toBe(198); });
  it('Regression P24: Koeffizienten und Taylor-SE des Fachblatts 5.3; R² beschreibend; SE gleicher Gewichte = HC0·n/(n−1), nicht HC1 (P24c)', () => {
    const k = fall('P24').soll.koef; expect(k[0].b).toBeCloseTo(823.857926, 5); expect(k[1].se).toBeCloseTo(0.393179823, 8); expect(k[2].se).toBeCloseTo(0.283734393, 8); expect(fall('P24').soll.gesamt.f).toBeCloseTo(192.1414, 3);
    expect(fall('P24').soll.r2Gewichtet ?? fall('P24').soll.r2_gewichtet).toBeCloseTo(0.659113, 5);
    const c = fall('P24c'); expect(c.soll.koef[0].se).toBeCloseTo(10.3824536, 6); expect(Math.abs(c.soll.koef[0].se - c.survey_roh.se_hc1)).toBeGreaterThan(0.01); expect(Math.abs(c.soll.koef[0].se - c.survey_roh.se_lm)).toBeGreaterThan(0.05);
  });
  it('Logistik P27: Koeffizienten des Fachblatts 6.3, 73 Ereignisse, quasibinomial (keine Warnungen im Soll, binomial hätte gewarnt)', () => {
    const k = fall('P27').soll; expect(k.koef[1].b).toBeCloseTo(-0.0626132, 6); expect(k.koef[1].se).toBeCloseTo(0.0281145, 6); expect(k.koef[2].b).toBeCloseTo(-0.0581638, 6); expect(k.ereignisse).toBe(73); expect(k.warnungen).toEqual([]);
    expect(String(fall('P27').survey_roh.binomial_warnung)).toMatch(/non-integer|successes/);
  });
  it('Trennung (P28): survey liefert absurde Zahlen und nur eine Warnung, Soll ist der Fehlercode', () => { expect(fall('P28').soll.fehler_code).toBe('trennung'); expect(Math.abs(fall('P28').survey_roh.koef_survey[0])).toBeGreaterThan(1000); expect(String(fall('P28').survey_roh.warnungen[0])).toMatch(/converge|konvergiert/); });
  it('Anteil: Logit-Intervall liegt in [0, 1], Wald (survey_roh) nicht immer; bei einem Treffer Beta schmaler nach unten (P5)', () => {
    for (const f of FAELLE.filter(x => x.art === 'anteil' && !x.soll.fehler_code)) for (const k of f.soll.kategorien) if (!k.grenze) { expect(k.logit.u).toBeGreaterThan(0); expect(k.logit.o).toBeLessThan(1); expect(k.beta.u).toBeGreaterThanOrEqual(0); expect(k.beta.o).toBeLessThanOrEqual(1); }
    const k1 = fall('P5').soll.kategorien[1]; expect(k1.treffer).toBe(1); expect(k1.beta.u).toBeLessThan(k1.logit.u); expect(fall('P5').survey_roh['1'].wald[0]).toBeLessThan(0);
    const kl = fall('P4d').soll.kategorien[0]; expect(kl.p).toBeCloseTo(0.5714286, 6); expect(kl.beta.o - kl.beta.u).toBeGreaterThan(kl.logit.o - kl.logit.u);
  });
  it('Fachblatt 2.3: p, SE und Logit-Intervall der Kategorie ≥ 700 (apistrat)', () => { const k = fall('P4a').soll.kategorien[1]; expect(k.p).toBeCloseTo(0.4043397, 6); expect(k.se).toBeCloseTo(0.038306, 6); expect(k.logit.u).toBeCloseTo(0.3315802, 6); expect(k.logit.o).toBeCloseTo(0.4815624, 6); expect(k.beta.u).toBeCloseTo(0.3285678, 6); });
  it('Zwei Gruppen: Fachblatt 4.3 (|Differenz| 44,687494; SE 19,690762; t 2,269465; df 198; p ,0243178); designbasiert p ,024 gegen Welch ungewichtet ,0013', () => {
    const t = fall('P19').soll.test; expect(Math.abs(t.diff)).toBeCloseTo(44.687494, 5); expect(t.se).toBeCloseTo(19.690762, 5); expect(Math.abs(t.t)).toBeCloseTo(2.269465, 5); expect(t.p).toBeCloseTo(0.0243178, 6);
    expect(fall('P19').survey_roh.welch_ungewichtet.p).toBeLessThan(0.002);
  });
  it('8-Zeilen-Beispiel von Hand (P11): Mittel 4,6593407, SE 0,5258704, df 7', () => { const e = fall('P11').soll.ergebnisse[0]; expect(e.mittel).toBeCloseTo(4.6593407, 6); expect(e.se).toBeCloseTo(0.5258704, 6); expect(e.df).toBe(7); });
});
