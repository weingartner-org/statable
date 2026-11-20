import { describe, expect, it, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { s } from './sitzung.svelte';
import type { Spalte } from './verzeichnis';
import { mebDaten, mebLesen, mebRCode, erkenneKreuzung, MEB_MIN_GRUPPEN, type MebPraed } from './mehrebenen';
import { saetzeMehrebenen, tabellenMehrebenen } from './mehrebenensaetze';

/* Gekreuzte Zufallseffekte (Personen x Reize): Sollwerte aus docs/nutzen/SOLL-GEKREUZT-2026-11-10.json (R lme4 + SPSS 32), nie selbst gerechnet.
 * Kleine Datei: docs/nutzen/SOLL-GEKREUZT-KLEIN.csv (8 Personen x 6 Reize). */
const SOLL = JSON.parse(readFileSync(join(import.meta.dirname, '../../../docs/nutzen/SOLL-GEKREUZT-2026-11-10.json'), 'utf8')).klein;
const sp = (name: string, extra: Partial<Spalte> = {}): Spalte => ({ name, bezeichnung: '', art: 'zahl', niveau: 'metrisch', format: 'F8.2', fehlend: [], fehlendText: '', werteLabels: {}, ...extra });
const nah = (ist: number, soll: number, tol = 1e-6) => expect(Math.abs(ist - soll) / Math.max(Math.abs(soll), 1e-9)).toBeLessThan(tol);
const spalten = [sp('y'), sp('person', { art: 'text', niveau: 'nominal' }), sp('reiz', { art: 'text', niveau: 'nominal' }), sp('x')];

beforeEach(() => { s.einst.sprache = 'de'; s.spalten = spalten; });

describe('Daten für R mit zweiter Gruppierung', () => {
  const zeilen: (string | number | null)[][] = [[1, 'p1', 'r1', 5], [2, 'p1', 'r2', 6], [3, 'p2', 'r1', 7], [4, 'p2', 'r2', 8], [null, 'p3', 'r1', 1], [6, 'p3', '', 2], [7, 'p3', 'r2', null], [8, 'p3', 'r2', 9]];
  it('g2 steht als Text-Spalte hinter den Prädiktoren', () => {
    const d = mebDaten('y', 'person', ['x'], zeilen, spalten, { gruppe2: 'reiz' });
    expect(d.spalten.map(c => c.name)).toEqual(['y', 'g', 'p01', 'g2']);
    expect(d.spalten[3]!.art).toBe('text');
    expect(d.spalten[3]!.werte).toEqual(['r1', 'r2', 'r1', 'r2', 'r1', null, 'r2', 'r2']);
    expect(d.praed.map(p => p.name)).toEqual(['x']);
  });
  it('ohne zweite Gruppierung bleibt alles wie bisher (keine Spalte g2)', () => {
    expect(mebDaten('y', 'person', ['x'], zeilen, spalten).spalten.map(c => c.name)).toEqual(['y', 'g', 'p01']);
  });
  it('Zentrieren nimmt nur Fälle, in denen auch g2 vorliegt', () => {
    const d = mebDaten('y', 'person', ['x'], zeilen, spalten, { gruppe2: 'reiz', zentrieren: 'gesamt' });
    const x = d.spalten[2]!.werte as (number | null)[];
    // vollständig: Zeilen 0-3 und 7 (x = 5, 6, 7, 8, 9): Mittel 7
    expect(x[0]).toBe(-2); expect(x[7]).toBe(2);
  });
});

describe('gekreuzt oder geschachtelt erkennen', () => {
  const g = (...w: (string | null)[]) => w;
  it('jede Stufe von g2 kommt bei mehreren Stufen von g1 vor: gekreuzt', () => {
    expect(erkenneKreuzung(g('a', 'a', 'b', 'b'), g('r1', 'r2', 'r1', 'r2'))).toBe('gekreuzt');
  });
  it('jede Stufe von g2 kommt nur innerhalb einer Stufe von g1 vor: geschachtelt', () => {
    expect(erkenneKreuzung(g('a', 'a', 'b', 'b'), g('k1', 'k2', 'k3', 'k4'))).toBe('geschachtelt');
  });
  it('beide Richtungen: Klassen (g1) in Schulen (g2) ist auch geschachtelt', () => {
    expect(erkenneKreuzung(g('k1', 'k2', 'k3', 'k4'), g('a', 'a', 'b', 'b'))).toBe('geschachtelt');
    expect(erkenneKreuzung(g('k1', 'k1', 'k2', 'k3'), g('a', 'b', 'a', 'b'))).toBe('gekreuzt');
  });
  it('eine einzige Stufe quer über Gruppen genügt für „gekreuzt“; Lücken zählen nicht', () => {
    expect(erkenneKreuzung(g('a', 'a', 'b', 'b', null), g('k1', 'k2', 'k3', 'k1', 'k9'))).toBe('gekreuzt');
    expect(erkenneKreuzung(g('a', 'a', null), g('k1', 'k2', 'k1'))).toBe('geschachtelt');
  });
  it('mebDaten meldet die Art mit', () => {
    const zeilen: (string | number | null)[][] = [[1, 'p1', 'r1', 5], [2, 'p1', 'r2', 6], [3, 'p2', 'r1', 7], [4, 'p2', 'r2', 8]];
    expect(mebDaten('y', 'person', [], zeilen, spalten, { gruppe2: 'reiz' }).kreuzung).toBe('gekreuzt');
    const z2: (string | number | null)[][] = [[1, 'p1', 'r1', 5], [2, 'p1', 'r2', 6], [3, 'p2', 'r3', 7], [4, 'p2', 'r4', 8]];
    expect(mebDaten('y', 'person', [], z2, spalten, { gruppe2: 'reiz' }).kreuzung).toBe('geschachtelt');
    expect(mebDaten('y', 'person', [], zeilen, spalten).kreuzung).toBeUndefined();
  });
  it('die Gruppenzahl-Grenze gilt auch für g2 (gleiche Konstante)', () => { expect(MEB_MIN_GRUPPEN).toBe(5); });
});

/** So kommt die Antwort von sp_mehrebenen() mit zweiter Gruppierung aus R an (jeder Wert ein Vektor); Zahlen aus der Soll-Datei. */
const rAntwort = () => {
  const m = SOLL.modell, n0 = SOLL.nullmodell, v = (x: number) => [x];
  return {
    n: v(48), n_alle: v(48), ng: v(8), gn_min: v(6), gn_med: v(6), gn_max: v(6), gn_mittel: v(6), y_mittel: v(50), y_sd: v(3),
    ng2: v(6), gn2_min: v(8), gn2_max: v(8),
    null_tau: v(n0.zufall.person.var), null_tau2: v(n0.zufall.reiz.var), null_sigma: v(n0.sigma2), null_icc: v(n0.ICC.person), null_icc2: v(n0.ICC.reiz),
    null_const: v(n0.konstante.B), null_const_se: v(n0.konstante.SE), null_const_df: v(n0.konstante.df), deff: [null], null_singular: [false], binaer: [false],
    fest_name: ['(Intercept)', 'p01'], fest_term: [0, 1], fest_b: [m.feste['(Intercept)'].B, m.feste.x.B], fest_se: [m.feste['(Intercept)'].SE, m.feste.x.SE], fest_df: [m.feste['(Intercept)'].df, m.feste.x.df],
    fest_t: [m.feste['(Intercept)'].t, m.feste.x.t], fest_p: [m.feste['(Intercept)'].p, m.feste.x.p], fest_lo: [0, 0], fest_hi: [0, 0],
    tau: v(m.zufall.person.var), tau2: v(m.zufall.reiz.var), sigma: v(m.sigma2),
    icc_voll: v(m.zufall.person.var / (m.zufall.person.var + m.zufall.reiz.var + m.sigma2)), icc_voll2: v(m.zufall.reiz.var / (m.zufall.person.var + m.zufall.reiz.var + m.sigma2)),
    r2_m: v(m.R2.R2_marginal), r2_c: v(m.R2.R2_konditional),
    gruppe: ['p1', 'p2'], gruppe_n: [6, 6], gruppe_mittel: [50, 51], gruppe_abw: [0.1, -0.1], gruppe_se: [0.5, 0.5],
    singular: [false], konv: [false], meldungen: [], mit_praed: [true], aufgeklaert_1: [0.1], aufgeklaert_2: [0.1], aufgeklaert_3: [(n0.zufall.reiz.var - m.zufall.reiz.var) / n0.zufall.reiz.var],
    an_term: ['p01'], an_f: [m.typ3_F.x.F], an_df1: [1], an_df2: [m.typ3_F.x.df2], an_p: [m.typ3_F.x.p]
  } as Record<string, unknown>;
};
const praed: MebPraed[] = [{ name: 'x', art: 'zahl', stufen: [] }];
const kopf = { y: 'y', gruppe: 'person', gruppe2: 'reiz', gekreuzt: true, praed, steigung: '', zentriert: false };

describe('erklärte Varianz der zweiten Gruppierung', () => {
  it('aufgeklaert3 wird gelesen, im Satz und in der Tabelle genannt (Anteil aus den Soll-Varianzen)', () => {
    const e = mebLesen(rAntwort(), kopf);
    nah(e.aufgeklaert3!, (SOLL.nullmodell.zufall.reiz.var - SOLL.modell.zufall.reiz.var) / SOLL.nullmodell.zufall.reiz.var);
    const sa = saetzeMehrebenen(e, n => n);
    expect(sa.zusatz).toContain('zwischen den Stufen von „reiz“ steigt');   // kleine Datei: die Varianz der Reize steigt im Modell
    // echte Datei (Soll gekreuzt_andere): sinkt, rund 52 %
    const G = JSON.parse(readFileSync(join(import.meta.dirname, '../../../docs/nutzen/SOLL-GEKREUZT-2026-11-10.json'), 'utf8')).gekreuzt_andere;
    const r = rAntwort(); r.aufgeklaert_3 = [(G.nullmodell.zufall.reiz.var - G.modell.zufall.reiz.var) / G.nullmodell.zufall.reiz.var];
    expect(saetzeMehrebenen(mebLesen(r, kopf), n => n).zusatz).toMatch(/sinkt die Varianz innerhalb um 10\s%, die Varianz zwischen den Stufen von „person“ um 10\s% und die zwischen den Stufen von „reiz“ um 52\s%/);
    expect(JSON.stringify(tabellenMehrebenen(e, n => n))).toContain('Erklärte Varianz zwischen den Stufen von reiz');
    const ohne = rAntwort(); delete ohne.aufgeklaert_3;
    expect(mebLesen(ohne, kopf).aufgeklaert3).toBeUndefined();
  });
});

describe('R-Antwort mit zweiter Gruppierung lesen', () => {
  it('Varianzen beider Gruppierungen, Anteile und Feld gekreuzt', () => {
    const e = mebLesen(rAntwort(), kopf);
    expect(e.gruppe2).toBe('reiz'); expect(e.gekreuzt).toBe(true); expect(e.ng2).toBe(6);
    nah(e.nullTau, SOLL.nullmodell.zufall.person.var); nah(e.nullTau2!, SOLL.nullmodell.zufall.reiz.var); nah(e.nullSigma, SOLL.nullmodell.sigma2);
    nah(e.nullIcc, SOLL.nullmodell.ICC.person); nah(e.nullIcc2!, SOLL.nullmodell.ICC.reiz);
    nah(e.tau, SOLL.modell.zufall.person.var); nah(e.tau2!, SOLL.modell.zufall.reiz.var); nah(e.sigma, SOLL.modell.sigma2);
    nah(e.fest[1]!.b, SOLL.modell.feste.x.B); nah(e.fest[1]!.se, SOLL.modell.feste.x.SE); nah(e.fest[1]!.df, SOLL.modell.feste.x.df);
    nah(e.r2m, SOLL.modell.R2.R2_marginal); nah(e.r2c, SOLL.modell.R2.R2_konditional);
  });
  it('ältere Ergebnisse ohne die Felder lesen sich weiter ohne zweite Gruppierung', () => {
    const r = rAntwort(); for (const k of ['ng2', 'null_tau2', 'tau2', 'null_icc2', 'icc_voll2', 'gn2_min', 'gn2_max']) delete r[k];
    const e = mebLesen(r, { y: 'y', gruppe: 'person', praed, steigung: '', zentriert: false });
    expect(e.gruppe2).toBeUndefined(); expect(e.nullTau2).toBeUndefined(); expect(e.tau2).toBeUndefined();
  });
});

describe('R-Aufruf zum Ansehen und Sätze mit zweiter Gruppierung', () => {
  it('Formel mit (1 | g1) + (1 | g2) für Nullmodell und Modell', () => {
    const e = mebLesen(rAntwort(), kopf);
    const c = mebRCode(e, (de) => de);
    expect(c).toContain('m0 <- lmer(y ~ 1 + (1 | person) + (1 | reiz), data = daten, REML = TRUE)');
    expect(c).toContain('m1 <- lmer(y ~ x + (1 | person) + (1 | reiz), data = daten, REML = TRUE)');
  });
  it('ohne zweite Gruppierung unverändert', () => {
    const e = mebLesen(rAntwort(), { y: 'y', gruppe: 'person', praed, steigung: '', zentriert: false });
    expect(mebRCode(e, (de) => de)).toContain('m1 <- lmer(y ~ x + (1 | person), data = daten, REML = TRUE)');
  });
  it('Satz nennt gekreuzte Zufallseffekte; Tabelle der Zufallseffekte hat die Zeile der zweiten Gruppierung', () => {
    const e = mebLesen(rAntwort(), kopf);
    const text = JSON.stringify(saetzeMehrebenen(e, n => n));
    expect(text).toContain('gekreuzte Zufallseffekte');
    expect(text).toContain('reiz');
    const tab = JSON.stringify(tabellenMehrebenen(e, n => n));
    expect(tab).toContain('reiz');
    expect(tab).toContain('person');
  });
});
