import { describe, expect, it } from 'vitest';
import { s } from './sitzung.svelte';
import { gewichtetBeschreiben, type Quelle } from './gewichtbeschreibend';
import type { GewichtAbdruck } from './gewichte';
import { planVerteilung, planKreuz } from './umfragedaten';
import {
  repSpalten, repAnfaenge, repPruefen, planRep, istRepPlan, planTotal, totalLesen, werteAusTotal, werteAusMittel, werteAusAnteil, werteAusKreuz,
  STANDARD_GRENZEN, grenzenPruefen, kennzeichne, zeigeMitKennzeichen, zeichenErklaerung, grenzenSatz, sindStandardGrenzen,
  kalibrierenPruefen, planKalibrieren, kalibrierenLesen, genauigkeitFehlerSatz, kalibrierenHinweisSatz, R_PAKETE_KALIBRIEREN, type RepPlan, type KalPlan
} from './genauigkeit';

/* Paket M4, reiner Teil: Aufträge an R, Antworten lesen, Kennzeichnung, Sätze. R selbst läuft in engine/genauigkeit.webr.test.ts gegen survey. */
s.einst.sprache = 'de'; s.einst.anrede = 'du';
type Z = Record<string, any>;
const N = 12;
const quelle = (spalten: Record<string, (number | null)[]>, w: number[]): Quelle => {
  const namen = Object.keys(spalten);
  return { spalten: namen.map(name => ({ name, art: 'zahl', fehlend: [], werteLabels: {} })) as Quelle['spalten'], zeilen: Array.from({ length: w.length }, (_, i) => namen.map(n => spalten[n]![i] ?? null)), w };
};
const wBasis = Array.from({ length: N }, (_, i) => 1 + (i % 3));
const rep = (anz: number, anfang = 'w_rep') => Object.fromEntries(Array.from({ length: anz }, (_, k) => [`${anfang}${k + 1}`, wBasis.map(x => x * (1 + k / 10))]));
/** So kommt es aus webR (rZuJson): Skalare als Vektor der Länge 1, NULL als {type:'null'}. */
const alsWebR = (x: any, schluessel = ''): any => (x === null ? { type: 'null' } : Array.isArray(x) ? x.map(v => alsWebR(v, schluessel)) : x && typeof x === 'object' ? Object.fromEntries(Object.entries(x).map(([k, v]) => [k, alsWebR(v, k)])) : schluessel === 'warnungen' ? x : [x]);

describe('Replikationsspalten über gemeinsamen Anfang', () => {
  it('nur Anfang + Ziffern, nach der Zahl geordnet (rep2 vor rep10), andere Namen bleiben draußen', () => {
    const namen = ['id', 'w_rep10', 'w_rep2', 'w_rep1', 'w_rep', 'w_rep_x', 'w_rep3a', 'W_rep4', 'w_rep20'];
    expect(repSpalten(namen, 'w_rep')).toEqual(['w_rep1', 'w_rep2', 'w_rep10', 'w_rep20']);
    expect(repSpalten(namen, '')).toEqual([]); expect(repSpalten(namen, 'xx')).toEqual([]);
  });
  it('Vorschläge für den Anfang: Gruppen mit mindestens 5 Spalten, die größte zuerst', () => {
    const namen = [...Array.from({ length: 6 }, (_, i) => `rw${i + 1}`), ...Array.from({ length: 5 }, (_, i) => `b${i + 1}`), 'x1', 'x2', 'alter'];
    expect(repAnfaenge(namen)).toEqual([{ anfang: 'rw', anzahl: 6 }, { anfang: 'b', anzahl: 5 }]);
    expect(repAnfaenge(namen, 2).map(x => x.anfang)).toEqual(['rw', 'b', 'x']);
  });
  it('Vorprüfung wie in R: Art, Zahl der Spalten, Größe, rho bei Fay, scale/rscales', () => {
    const e = { anfang: 'w', typ: 'bootstrap' as const };
    expect(repPruefen(e, 50, 100)).toBeNull(); expect(repPruefen(e, 1, 100)).toBe('rep-fehlt'); expect(repPruefen({ ...e, typ: 'x' as never }, 50, 100)).toBe('rep-typ');
    expect(repPruefen(e, 1000, 20000)).toBe('rep-zu-gross'); expect(repPruefen(e, 1001, 5)).toBe('rep-zu-gross');
    expect(repPruefen({ ...e, typ: 'Fay' }, 8, 16)).toBe('rep-fay'); expect(repPruefen({ ...e, typ: 'Fay', fay: 1 }, 8, 16)).toBe('rep-fay'); expect(repPruefen({ ...e, typ: 'Fay', fay: 0.3 }, 8, 16)).toBeNull(); expect(repPruefen({ ...e, typ: 'Fay', fay: 0 }, 8, 16)).toBeNull();
    expect(repPruefen({ ...e, scale: 0 }, 50, 100)).toBe('rep-scale'); expect(repPruefen({ ...e, scale: 0.02 }, 50, 100)).toBeNull(); expect(repPruefen({ ...e, rscales: [1, 1] }, 50, 100)).toBe('rep-scale'); expect(repPruefen({ ...e, rscales: Array(50).fill(1) }, 50, 100)).toBeNull();
  });
  it('Plan: eigene Namen rw1 ... rwN, nur Zeilen mit Gewicht über 0, Aufrufteil nur aus Festem und Zahlen', () => {
    const w = [...wBasis]; w[3] = 0;
    const q = quelle({ y: Array.from({ length: N }, (_, i) => i), ...rep(10) }, w);
    const p = planRep(q, { anfang: 'w_rep', typ: 'bootstrap' }); expect(istRepPlan(p)).toBe(true); const r = p as RepPlan;
    expect(r.anzahl).toBe(10); expect(r.spalten.map(x => x.name)).toEqual(Array.from({ length: 10 }, (_, k) => `rw${k + 1}`)); expect(r.spalten[0]!.werte.length).toBe(N - 1);
    expect(r.spalten[1]!.werte[0]).toBeCloseTo(wBasis[0]! * 1.1, 12); expect(r.namen[9]).toBe('w_rep10');
    expect(r.rTeil).toBe(`list(anfang = 'rw', typ = 'bootstrap', fay = NULL, scale = NULL, rscales = NULL)`);
    const f = planRep(q, { anfang: 'w_rep', typ: 'Fay', fay: 0.3, scale: 0.05, rscales: Array(10).fill(1) }) as RepPlan;
    expect(f.rTeil).toBe(`list(anfang = 'rw', typ = 'Fay', fay = 0.3, scale = 0.05, rscales = c(1, 1, 1, 1, 1, 1, 1, 1, 1, 1))`);
    expect(planRep(q, { anfang: 'nix', typ: 'JK1' })).toEqual({ problem: 'rep-fehlt', spalten: 0 });
    expect(planRep(q, { anfang: 'w_rep', typ: 'Fay' })).toEqual({ problem: 'rep-fay', spalten: 10 });
  });
  it('kein Text aus der Datei im Aufruf: Spaltennamen mit Anführungszeichen bleiben in der Datei', () => {
    const boese = "w_rep'); stop('x'); ('";
    const q = quelle({ y: Array.from({ length: N }, (_, i) => i), [`${boese}1`]: wBasis, [`${boese}2`]: wBasis }, wBasis);
    const p = planRep(q, { anfang: boese, typ: 'bootstrap' }) as RepPlan;
    expect(p.namen).toEqual([`${boese}1`, `${boese}2`]); expect(p.rTeil).not.toContain('stop'); expect(p.spalten.map(x => x.name)).toEqual(['rw1', 'rw2']);
    const t = planTotal(q, { art: 'summe', spalte: 'y' }, { rep: p }); expect(t.aufruf).not.toContain('stop'); expect(t.spalten.every(x => /^[a-z]+[0-9]*$/.test(x.name))).toBe(true);
  });
});

describe('Auftrag: Hochrechnung', () => {
  const y = Array.from({ length: N }, (_, i) => i + 1), g = Array.from({ length: N }, (_, i) => (i % 3 === 0 ? 10 : i % 3 === 1 ? 20 : 30));
  it('Summe einer Zahl: m1, w; Kategorien: a1 mit Codes 1, 2, … in der Reihenfolge der Werte, höchstens 30', () => {
    const q = quelle({ y, g }, wBasis);
    const a = planTotal(q, { art: 'summe', spalte: 'y' });
    expect(a.aufruf).toBe(`sp_umfrage_total(d, 'm1', 'w', NULL, 'summe', NULL)`); expect(a.spalten.map(x => x.name)).toEqual(['w', 'm1']); expect(a.zeilen).toBe(N);
    const b = planTotal(q, { art: 'kategorien', spalte: 'g' });
    expect(b.werte).toEqual([10, 20, 30]); expect(b.codes).toEqual([1, 2, 3]); expect(b.aufruf).toBe(`sp_umfrage_total(d, 'a1', 'w', NULL, 'kategorien', c(1, 2, 3))`);
    expect(b.spalten[1]!.werte).toEqual(g.map(x => x / 10)); expect(b.abgeschnitten).toBe(false);
    const c = planTotal(q, { art: 'kategorien', spalte: 'g', werte: [30, 20, 10] }); expect(c.spalten[1]!.werte.slice(0, 3)).toEqual([3, 2, 1]);
    const viele = quelle({ v: Array.from({ length: 40 }, (_, i) => i) }, Array(40).fill(1)), d = planTotal(viele, { art: 'kategorien', spalte: 'v' });
    expect(d.codes.length).toBe(30); expect(d.abgeschnitten).toBe(true);
  });
  it('Auswahl (Teilpopulation) als Spalte e, Replikationsgewichte hinten; Zeilen ohne Gewicht fallen weg', () => {
    const w = [...wBasis]; w[0] = 0;
    const q = quelle({ y, ...rep(4) }, w), auswahl = y.map(v => v > 5), r = planRep(q, { anfang: 'w_rep', typ: 'JK1' }) as RepPlan;
    const p = planTotal(q, { art: 'summe', spalte: 'y' }, { auswahl, rep: r });
    expect(p.spalten.map(x => x.name)).toEqual(['w', 'm1', 'e', 'rw1', 'rw2', 'rw3', 'rw4']); expect(p.zeilen).toBe(N - 1); expect(p.spalten[2]!.werte).toEqual(auswahl.slice(1).map(x => (x ? 1 : 0)));
    expect(p.aufruf).toBe(`sp_umfrage_total(d, 'm1', 'w', 'e', 'summe', NULL, list(anfang = 'rw', typ = 'JK1', fay = NULL, scale = NULL, rscales = NULL))`);
  });
  it('Antwort lesen: Fehler von R (Text) → fehler; Fehler der Rechnung → fehlerCode; sonst das Ergebnis', () => {
    const p = planTotal(quelle({ y }, wBasis), { art: 'summe', spalte: 'y' });
    expect(totalLesen(p, { fehler: ['kaputt'] })).toEqual({ fehler: 'kaputt' });
    const f = totalLesen(p, alsWebR({ fehler_code: 'rep-fehlt', n: 0 })) as { ok: Z }; expect(f.ok.fehlerCode).toBe('rep-fehlt'); expect(f.ok.n).toBe(0);
  });
});

describe('Replikationsgewichte in den vorhandenen Aufträgen (Verteilung, Kreuztabelle): nur angehängt, sonst unverändert', () => {
  const y = Array.from({ length: N }, (_, i) => i + 1), g = Array.from({ length: N }, (_, i) => i % 2), h = Array.from({ length: N }, (_, i) => i % 3);
  const q = quelle({ y, g, h, ...rep(4) }, wBasis);
  const abdruck: GewichtAbdruck = { spalte: 'w', art: 'umfrage', klumpenfrei: true, summe: wBasis.reduce((a, b) => a + b, 0), zeilen: N, rechenweg: 'survey', surveyVersion: '4.5' };
  const r = planRep(q, { anfang: 'w_rep', typ: 'bootstrap' }) as RepPlan, teil = r.rTeil;
  it('Verteilung: ohne rep wie bisher, mit rep Spalten rw1 ... und das Argument am Ende jedes Aufrufs', () => {
    const e = gewichtetBeschreiben('verteilung', { l1: ['y', 'g'], l2: [] }, q, abdruck);
    const ohne = planVerteilung(e, q, null), mit = planVerteilung(e, q, null, r);
    expect(ohne.auftraege[0]!.aufruf).toBe(`sp_umfrage_mittel(d, c('m1'), 'w', NULL, NULL)`); expect(ohne.auftraege[1]!.aufruf).toMatch(/^sp_umfrage_anteil\(d, 'a1', 'w', NULL, c\([0-9, ]+\)\)$/);
    expect(mit.auftraege.map(a => a.aufruf)).toEqual(ohne.auftraege.map(a => a.aufruf.replace(/\)$/, `, ${teil})`)));
    expect(mit.spalten.map(x => x.name)).toEqual([...ohne.spalten.map(x => x.name), 'rw1', 'rw2', 'rw3', 'rw4']);
  });
  it('Kreuztabelle: dasselbe', () => {
    const e = gewichtetBeschreiben('kreuz', { l1: ['g', 'h'], l2: [] }, q, abdruck);
    expect(e.kreuz).toBeDefined();
    expect(planKreuz(e, q).aufruf).toBe(`sp_umfrage_kreuz(d, 'z', 's', 'w', NULL)`); expect(planKreuz(e, q, r).aufruf).toBe(`sp_umfrage_kreuz(d, 'z', 's', 'w', NULL, ${teil})`);
    expect(planKreuz(e, q, r).spalten.map(x => x.name)).toEqual(['w', 'z', 's', 'rw1', 'rw2', 'rw3', 'rw4']);
  });
});

describe('Werte aus den Antworten von R (so wie webR sie liefert)', () => {
  const total = alsWebR({ art: 'kategorien', n: 50, n_ungew: 50, df: 49, kategorien: [{ wert: 1, total: 100, se: 20, ki_u: 60, ki_o: 140, cv: 0.2, n_ungew: 12, grenze: false }, { wert: 2, total: 0, se: 0, ki_u: 0, ki_o: 0, cv: null, n_ungew: 0, grenze: true }], gesamt: { total: 500, se: 10, ki_u: 480, ki_o: 520, cv: 0.02, n_ungew: 50, grenze: false } });
  it('Hochrechnung: je Kategorie und gesamt, n = Treffer, nBasis = Fälle der Frage, CV null bleibt null', () => {
    const w = werteAusTotal(JSON.parse(JSON.stringify({ ...(totalLesen({} as never, total) as { ok: Z }).ok })));
    expect(w.map(x => x.schluessel)).toEqual(['k:1', 'k:2', 'gesamt']);
    expect(w[0]).toMatchObject({ schaetzer: 100, se: 20, cv: 0.2, kiU: 60, kiO: 140, n: 12, nBasis: 50, grenze: false });
    expect(w[1]).toMatchObject({ schaetzer: 0, cv: null, n: 0, grenze: true }); expect(w[2]).toMatchObject({ schaetzer: 500, n: 50 });
    const sm = (totalLesen({} as never, alsWebR({ art: 'summe', n: 40, df: 39, summe: { total: 9, se: 1, ki_u: 7, ki_o: 11, cv: 0.11, n_ungew: 40, grenze: false } })) as { ok: Z }).ok;
    expect(werteAusTotal(sm)).toEqual([expect.objectContaining({ schluessel: 'summe', schaetzer: 9, n: 40, nBasis: 40 })]); expect(werteAusTotal({ fehlerCode: 'zu-wenig' })).toEqual([]);
  });
  it('Mittel, Anteil (Intervall wählbar), Kreuztabelle (Zeilen schnell: z:Zeile:Spalte)', async () => {
    const { umfrageLesen } = await import('./umfrage');
    const m = werteAusMittel(umfrageLesen('mittel', alsWebR({ ergebnisse: [{ name: 'm1', n: 30, n_ungew: 30, mittel: 5, se: 1, cv: 0.2, ki_u: 3, ki_o: 7 }, { name: 'm2', fehler_code: 'zu-wenig', n: 1 }] })));
    expect(m).toHaveLength(1); expect(m[0]).toMatchObject({ schluessel: 'm1', schaetzer: 5, cv: 0.2, n: 30, nBasis: 30 });
    const a = umfrageLesen('anteil', alsWebR({ n: 80, n_ungew: 80, df: 79, kategorien: [{ wert: 1, treffer: 20, p: 0.25, se: 0.05, cv: 0.2, grenze: false, logit: { u: 0.16, o: 0.36 }, beta: { u: 0.15, o: 0.37 } }] }));
    expect(werteAusAnteil(a)[0]).toMatchObject({ schluessel: 'k:1', schaetzer: 0.25, n: 20, nBasis: 80, kiU: 0.16, kiO: 0.36 }); expect(werteAusAnteil(a, 'beta')[0]).toMatchObject({ kiU: 0.15, kiO: 0.37 });
    const k = werteAusKreuz(umfrageLesen('kreuz', alsWebR({ n: 100, n_ungew: 100, zellen: { zeilen: 2, spalten: 3 }, anteile: [0.1, 0.2, 0.3, 0.1, 0.2, 0.1], se_zellen: [0.01, 0.02, 0.03, 0.01, 0.02, 0.01], cv_zellen: [0.1, 0.1, 0.1, 0.1, 0.1, 0.1], faelle_zellen: [10, 20, 30, 10, 20, 10] })));
    expect(k.map(x => x.schluessel)).toEqual(['z:1:1', 'z:2:1', 'z:1:2', 'z:2:2', 'z:1:3', 'z:2:3']); expect(k[2]).toMatchObject({ schaetzer: 0.3, se: 0.03, cv: 0.1, n: 30, nBasis: 100 });
    const ohne = werteAusKreuz(umfrageLesen('kreuz', alsWebR({ n: 5, zellen: { zeilen: 1, spalten: 2 }, anteile: [0.5, 0.5], se_zellen: null, cv_zellen: null, faelle_zellen: [3, 2] })));
    expect(ohne[0]).toMatchObject({ se: null, cv: null, n: 3 });
  });
});

describe('Kennzeichnung (Standard = Beispiel; Grenzen einstellbar)', () => {
  const w = (n: number | null, cv: number | null, schaetzer: number | null = 5, geheim = false) => ({ n, cv, schaetzer, geheim });
  it('Standard: n < 10 → x; n < 30 oder CV > 0,20 → ( ); Grenzen selbst gehören zur besseren Seite', () => {
    expect(STANDARD_GRENZEN).toEqual({ nMinX: 10, nMinKlammer: 30, cvKlammer: 0.2 });
    expect(kennzeichne(w(9, 0.01))).toBe('x'); expect(kennzeichne(w(10, 0.01))).toBe('klammer'); expect(kennzeichne(w(29, 0.01))).toBe('klammer'); expect(kennzeichne(w(30, 0.01))).toBe('');
    expect(kennzeichne(w(500, 0.2))).toBe(''); expect(kennzeichne(w(500, 0.2000001))).toBe('klammer'); expect(kennzeichne(w(500, null))).toBe('');
    expect(kennzeichne(w(5, 0.9))).toBe('x');
  });
  it('gesperrt (M2) → x vor allem; kein Fall → -; kein Wert → .; Reihenfolge der Regeln', () => {
    expect(kennzeichne(w(500, 0.01, 5, true))).toBe('x'); expect(kennzeichne(w(0, null, 0))).toBe('-'); expect(kennzeichne(w(0, null, 0, true))).toBe('x');
    expect(kennzeichne(w(500, 0.01, null))).toBe('.'); expect(kennzeichne(w(null, 0.01))).toBe('.'); expect(kennzeichne(w(500, 0.01, Number.NaN))).toBe('.');
  });
  it('eigene Grenzen wirken; Eingaben werden geprüft', () => {
    const g = { nMinX: 5, nMinKlammer: 20, cvKlammer: 0.3 };
    expect(kennzeichne(w(7, 0.5), g)).toBe('klammer'); expect(kennzeichne(w(4, 0.01), g)).toBe('x'); expect(kennzeichne(w(25, 0.3), g)).toBe(''); expect(kennzeichne(w(25, 0.31), g)).toBe('klammer');
    expect(grenzenPruefen(undefined)).toEqual({ grenzen: STANDARD_GRENZEN, probleme: [] }); expect(grenzenPruefen({ nMinX: 3 }).grenzen).toEqual({ nMinX: 3, nMinKlammer: 30, cvKlammer: 0.2 });
    expect(grenzenPruefen({ nMinX: -1 }).probleme).toEqual(['n-min-x']); expect(grenzenPruefen({ nMinX: 2.5 }).probleme).toEqual(['n-min-x']); expect(grenzenPruefen({ nMinKlammer: Number.NaN }).probleme).toEqual(['n-min-klammer']);
    expect(grenzenPruefen({ cvKlammer: -0.1 }).probleme).toEqual(['cv-klammer']); expect(grenzenPruefen({ nMinX: 40 }).probleme).toEqual(['reihenfolge']);
    expect(sindStandardGrenzen(STANDARD_GRENZEN)).toBe(true); expect(sindStandardGrenzen(g)).toBe(false);
  });
  it('Zelle: x, -, . ohne Zahl, ( ) um die Zahl; Zeichenerklärung (nur vorkommende) und Satz zu den Grenzen', () => {
    expect(zeigeMitKennzeichen('12,3', '')).toBe('12,3'); expect(zeigeMitKennzeichen('12,3', 'klammer')).toBe('(12,3)'); expect(zeigeMitKennzeichen('12,3', 'x')).toBe('x'); expect(zeigeMitKennzeichen('0', '-')).toBe('-'); expect(zeigeMitKennzeichen('1', '.')).toBe('.');
    expect(zeichenErklaerung().map(x => x.zeichen)).toEqual(['-', 'x', '( )', '.']); expect(zeichenErklaerung(STANDARD_GRENZEN, ['klammer', 'x']).map(x => x.zeichen)).toEqual(['x', '( )']);
    expect(zeichenErklaerung()[1]!.text).toContain('weniger als 10 Fälle'); expect(zeichenErklaerung()[2]!.text).toContain('30 Fälle'); expect(zeichenErklaerung()[2]!.text).toContain('20 %');
    expect(grenzenSatz()).toContain('Beispielgrenzen'); expect(grenzenSatz()).toContain('Organisation'); expect(grenzenSatz({ nMinX: 5, nMinKlammer: 20, cvKlammer: 0.3 })).toContain('eigene Grenzen');
    s.einst.sprache = 'en'; try { expect(grenzenSatz()).toContain('example limits'); expect(zeichenErklaerung()[0]!.text).toBe('nothing to report'); } finally { s.einst.sprache = 'de'; }
  });
});

describe('Kalibrieren: Auftrag und Antwort', () => {
  const a = Array.from({ length: N }, (_, i) => 1 + (i % 3)), b = Array.from({ length: N }, (_, i) => 1 + (i % 2));
  const eingabe = { merkmale: [{ spalte: 'a', werte: [1, 2, 3], summen: [40, 30, 30] }, { spalte: 'b', werte: [1, 2], summen: [60, 40] }], gesamt: 100, grenzen: null };
  it('Vorprüfung: Merkmale, Ränder, Summen, Grenzen, Zeilen', () => {
    expect(kalibrierenPruefen(eingabe, N)).toBeNull(); expect(R_PAKETE_KALIBRIEREN).toEqual(['survey', 'MASS']);
    expect(kalibrierenPruefen({ ...eingabe, merkmale: [] }, N)).toEqual({ problem: 'merkmale' }); expect(kalibrierenPruefen({ ...eingabe, merkmale: [...eingabe.merkmale, ...eingabe.merkmale] }, N)).toEqual({ problem: 'merkmale' });
    expect(kalibrierenPruefen({ ...eingabe, merkmale: [{ spalte: 'a', werte: [1], summen: [100] }] }, N)).toEqual({ problem: 'rand-ungueltig', merkmal: 1 });
    expect(kalibrierenPruefen({ ...eingabe, merkmale: [{ spalte: 'a', werte: [1, 2], summen: [150, -50] }] }, N)).toEqual({ problem: 'rand-ungueltig', merkmal: 1 });
    expect(kalibrierenPruefen({ ...eingabe, gesamt: 0 }, N)).toEqual({ problem: 'rand-ungueltig', merkmal: 0 });
    expect(kalibrierenPruefen({ ...eingabe, gesamt: 120 }, N)).toEqual({ problem: 'raender-summen', merkmal: 1, summe: 100, gesamt: 120 });
    expect(kalibrierenPruefen({ ...eingabe, merkmale: [eingabe.merkmale[0]!, { spalte: 'b', werte: [1, 2], summen: [60, 50] }], gesamt: null }, N)).toEqual({ problem: 'raender-summen', merkmal: 2, summe: 110, gesamt: 100 });
    expect(kalibrierenPruefen({ ...eingabe, gesamt: null }, N)).toBeNull();
    expect(kalibrierenPruefen({ ...eingabe, grenzen: [1, 2] }, N)).toEqual({ problem: 'bounds-ungueltig' }); expect(kalibrierenPruefen({ ...eingabe, grenzen: [0.5, 1] }, N)).toEqual({ problem: 'bounds-ungueltig' }); expect(kalibrierenPruefen({ ...eingabe, grenzen: [0.5, 3] }, N)).toBeNull();
    expect(kalibrierenPruefen(eingabe, 200001)).toEqual({ problem: 'zu-viele-zeilen' });
  });
  it('Plan: k1, k2 mit Codes 1, 2, …; Sollsummen als Zahlen; Zeilen ohne Gewicht gehen nicht an R; Grenzen als c(unten, oben)', () => {
    const w = [...wBasis]; w[2] = 0; const q = quelle({ a, b }, w);
    const p = planKalibrieren(q, eingabe) as KalPlan;
    expect(p.spalten.map(x => x.name)).toEqual(['w', 'k1', 'k2']); expect(p.zeilen).toBe(N - 1); expect(p.zeilenIndex).toEqual([0, 1, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    expect(p.aufruf).toBe(`sp_umfrage_kalibrieren(d, 'w', c('k1', 'k2'), list(c(40, 30, 30), c(60, 40)), 100, NULL)`);
    const g = planKalibrieren(q, { ...eingabe, gesamt: null, grenzen: [0.5, 3] }) as KalPlan; expect(g.aufruf).toBe(`sp_umfrage_kalibrieren(d, 'w', c('k1', 'k2'), list(c(40, 30, 30), c(60, 40)), NULL, c(0.5, 3))`); expect(g.gesamt).toBe(100);
    expect(planKalibrieren(q, { ...eingabe, gesamt: 7 })).toEqual({ problem: 'raender-summen', merkmal: 1, summe: 100, gesamt: 7 });
  });
  it('Werte außerhalb der Stufen und fehlende Werte werden null (R: kein neues Gewicht); Namen aus der Datei kommen nie in den Aufruf', () => {
    const boese = "a'); stop('x'); ('", q = quelle({ [boese]: a.map((x, i) => (i === 0 ? 9 : x)), b }, wBasis);
    const p = planKalibrieren(q, { ...eingabe, merkmale: [{ ...eingabe.merkmale[0]!, spalte: boese }, eingabe.merkmale[1]!] }) as KalPlan;
    expect(p.spalten[1]!.werte[0]).toBeNull(); expect(p.spalten[1]!.werte[1]).toBe(2); expect(p.aufruf).not.toContain('stop'); expect(p.aufruf).not.toContain(boese);
  });
  it('Antwort lesen: Gewichte in der Länge der Daten, null für Zeilen ohne Gewicht, Zeilen ohne neues Gewicht 1-basiert; Fehler und Hinweise', () => {
    const w = [...wBasis]; w[2] = 0; const q = quelle({ a, b }, w), p = planKalibrieren(q, eingabe) as KalPlan;
    const neu = p.zeilenIndex.map((_, k) => 10 + k);
    const antwort = alsWebR({ n: 11, n_zeilen: N, gewichte: neu, ohne_gewicht: [3, 5], summe: 99.9, negativ: 1, w_min: -1, w_max: 20, g_min: -0.1, g_max: 3, kish_neff: 8, kish_neff_vorher: 9, deff_w: 1.4, deff_w_vorher: 1.2, max_abweichung: 1e-12, grenzen: null, warnungen: ['w1'], hinweise: ['negative-gewichte', 'begrenzt-kalibrieren'] });
    // R zählt in den an R gesendeten Zeilen (ohne die mit Gewicht 0): 3 und 5 dort = Zeilen 4 und 6 der Daten; die Zeile mit Gewicht 0 ist Zeile 3
    const l = kalibrierenLesen(p, antwort);
    if (!('ok' in l) || !l.ok) throw new Error('ok erwartet');
    expect(l.gewichte).toHaveLength(N); expect(l.gewichte[2]).toBeNull(); expect(l.gewichte[0]).toBe(10); expect(l.gewichte[3]).toBe(12); expect(l.gewichte[11]).toBe(20);
    expect(l.ohneGewicht).toEqual([3, 4, 6]); expect(l.negativ).toBe(1); expect(l.hinweise).toEqual(['negative-gewichte', 'begrenzt-kalibrieren']); expect(l.grenzen).toBeNull(); expect(l.warnungen).toEqual(['w1']);
    expect(l.kishNeff).toBe(8); expect(l.designeffekt).toBe(1.4); expect(l.gMin).toBe(-0.1);
    const f = kalibrierenLesen(p, alsWebR({ fehler_code: 'raender-summen', n: 0, merkmal: 2, summe: 90, gesamt: 100 })); expect(f).toMatchObject({ ok: false, code: 'raender-summen' });
    expect(kalibrierenLesen(p, { fehler: ['kaputt'] })).toEqual({ fehler: 'kaputt' });
    const eins = kalibrierenLesen(p, alsWebR({ ...JSON.parse(JSON.stringify({ n: 11, gewichte: neu, ohne_gewicht: [], summe: 1, negativ: 0, w_min: 1, w_max: 2, g_min: 1, g_max: 1, kish_neff: 1, kish_neff_vorher: 1, deff_w: 1, deff_w_vorher: 1, max_abweichung: 0 })), grenzen: [0.5, 3], hinweise: [] }));
    expect((eins as { grenzen: number[] }).grenzen).toEqual([0.5, 3]); expect((eins as { hinweise: string[] }).hinweise).toEqual([]);
  });
});

describe('Sätze: jeder Fehlercode hat deutschen und englischen Text; alte Codes gehen an umfrageFehlerSatz', () => {
  const codes = ['rep-typ', 'rep-fehlt', 'rep-zu-gross', 'rep-ungueltig', 'rep-fay', 'rep-scale', 'art-unbekannt', 'merkmale', 'rand-ungueltig', 'raender-summen', 'kategorie-ohne-stichprobe', 'bounds-ungueltig', 'nicht-erreicht', 'kalibrieren-unmoeglich', 'paket-fehlt'];
  it('nicht leer, ohne „undefined“ und „NaN“; Namen werden eingesetzt', () => {
    for (const sp of ['de', 'en'] as const) {
      s.einst.sprache = sp;
      try {
        for (const c of codes) { const t = genauigkeitFehlerSatz({ fehlerCode: c, n: 3, zeilen: 100, merkmal: 2, kategorie: 3, summe: 90, gesamt: 100, maxAbweichung: 0.01, paket: 'MASS' }); expect(t.length, c).toBeGreaterThan(15); expect(t, c).not.toMatch(/undefined|NaN/); }
        expect(genauigkeitFehlerSatz({ fehlerCode: 'raender-summen', merkmal: 2, summe: 90, gesamt: 100 }, { merkmale: ['Alter', 'Geschlecht'] })).toContain('Geschlecht');
        expect(genauigkeitFehlerSatz({ fehlerCode: 'kategorie-ohne-stichprobe', merkmal: 1, kategorie: 2 }, { merkmale: ['Alter'], werte: [['jung', 'alt']] })).toContain('alt');
        expect(genauigkeitFehlerSatz({ fehlerCode: 'zu-wenig', n: 1 })).toBe(genauigkeitFehlerSatz({ fehlerCode: 'zu-wenig', n: 1 }));
        expect(kalibrierenHinweisSatz('negative-gewichte', { negativ: 12 })).toContain('12'); expect(kalibrierenHinweisSatz('begrenzt-kalibrieren').length).toBeGreaterThan(15);
      } finally { s.einst.sprache = 'de'; }
    }
    expect(genauigkeitFehlerSatz({ fehlerCode: 'gewicht-negativ' })).toContain('negative Werte');
  });
});
