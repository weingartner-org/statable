import { describe, expect, it, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { s } from './sitzung.svelte';
import { metaDaten, metaLesen, metaPruefung, metaRCode, type MetaEingabe, type MetaEntwurf } from './metaanalyse';
import { saetzeMeta, tabellenMeta, metaApa } from './metasaetze';

/* Meta-Regression (S-H, 22.10.). Zahlen: Rscript am Mac (R 4.6.1, metafor 5.2-1), metafor direkt aufgerufen: rma(yi, vi, mods = ~ ablat, data = escalc(dat.bcg), method = "REML"),
 * mit und ohne test = "knha". Die Rohantworten sp_meta()$reg kommen so aus webR (jeder Wert ein Vektor); dieselben Zahlen prüft engine/metaanalyse.webr.test.ts gegen die echte webR-Rechnung. */
const roh = JSON.parse(readFileSync(join(import.meta.dirname, 'testdaten/meta-r.json'), 'utf8')) as Record<string, Record<string, unknown>>;
const REG_Z = { b: [0.251464294374, -0.029101660928], se: [0.249103666389, 0.00719555475708], stat: [1.0095, -4.0444], p: [0.312746171947, 5.24585597431e-05], ci_lb: [-0.236769920165, -0.0432046891007], ci_ub: [0.739698508914, -0.0149986327554], df: [NaN], qm: [16.35712557], qm_df: [1], qm_p: [5.245855974e-05], qe: [30.73309001], qe_df: [11], qe_p: [0.001214290987], tau2: [0.07635469471], i2: [68.39313051], r2: [75.62447836], k: [13] };
const REG_KH = { ...REG_Z, se: [0.283930037419, 0.00820154179601], stat: [0.8857, -3.5483], p: [0.394751838059, 0.00456554558896], ci_lb: [-0.373461504489, -0.0471531327109], ci_ub: [0.876390093238, -0.0110501891451], df: [11], qm: [12.59054553], qm_p: [0.004565545589] };
const einBcg = (kh: boolean): MetaEingabe => ({ art: 'es', massName: 'RR', verhaeltnis: true, kh, namen: Array.from({ length: 13 }, (_, i) => `S${i + 1}`), zeilen: Array.from({ length: 13 }, () => [0, 0.1]), mods: [{ name: 'Breitengrad', werte: [44, 55, 42, 52, 13, 44, 19, 13, 27, 42, 18, 33, 33] }] });
const meta = (kh: boolean) => metaLesen({ ...roh[kh ? 'bcg_kh' : 'bcg']!, reg: kh ? REG_KH : REG_Z }, einBcg(kh));
beforeEach(() => { s.einst.sprache = 'de'; s.einst.zahl = 'komma'; });

describe('Meta-Regression: Lesen der R-Antwort', () => {
  it('Koeffizienten, Tests und R² kommen unverändert an; das Grundmodell bleibt daneben', () => {
    const m = meta(false), g = m.reg!;
    expect(g.namen).toEqual(['(Intercept)', 'Breitengrad']);
    expect(g.b[1]).toBeCloseTo(-0.029101660928, 10); expect(g.se[1]).toBeCloseTo(0.00719555475708, 10);
    expect(g.qm).toBeCloseTo(16.35712557, 8); expect(g.qmDf).toBe(1); expect(g.qeDf).toBe(11); expect(g.r2).toBeCloseTo(75.62447836, 8); expect(g.df).toBeNull();
    expect(m.est).toBeCloseTo(-0.7145323483651, 10);
  });
  it('mit Knapp-Hartung: Freiheitsgrade der t- und F-Tests', () => { expect(meta(true).reg!.df).toBe(11); });
  it('ohne Moderatoren keine Meta-Regression', () => {
    const m = metaLesen(roh.bcg!, { ...einBcg(false), mods: undefined }); expect(m.reg).toBeUndefined();
  });
});

describe('Meta-Regression: Sätze und Tabellen', () => {
  it('der Satz nennt Moderator, Test, R², Koeffizient und den Faktor je Einheit', () => {
    const t = saetzeMeta(meta(false)).zusatz;
    expect(t).toContain('Meta-Regression mit dem Moderator „Breitengrad“ (13 Studien)');
    expect(t).toContain('Q_M(1) = 16,36, p < ,001'); expect(t).toMatch(/erklären 76\s%/); expect(t).toContain('B = −0,029'); expect(t).toContain('Faktor 0,971');
    expect(t).toContain('Restheterogenität: Q(11) = 30,73'); expect(t).toContain('Log-Skala');
  });
  it('mit Knapp-Hartung steht ein F-Test mit zwei Freiheitsgraden', () => {
    const t = saetzeMeta(meta(true)).zusatz;
    expect(t).toContain('F(1, 11) = 12,59'); expect(t).toContain('t(11)');
  });
  it('Vorsicht: Faustregel bei wenig Studien und Zusammenhang statt Ursache', () => {
    const wenig = metaLesen({ ...roh.bcg!, reg: { ...REG_Z, k: [6] } }, einBcg(false));
    const v = saetzeMeta(wenig).vorsicht;
    expect(v).toContain('mindestens 10 Studien je Moderator'); expect(v).toContain('keine Ursache');
    expect(saetzeMeta(meta(false)).vorsicht).not.toContain('mindestens 10 Studien je Moderator');   // 13 Studien, ein Moderator: genug
  });
  it('APA-Zeile und zwei zusätzliche Tabellen', () => {
    expect(metaApa(meta(false))).toMatch(/Meta-Regression: Q_M\(1\) = 16,36, p < ,001, R² = 76\s%/);
    const namen = tabellenMeta(meta(false)).map(t => t.label);
    expect(namen).toContain('Meta-Regression'); expect(namen).toContain('Meta-Regression Tests');
    expect(tabellenMeta(metaLesen(roh.bcg!, { ...einBcg(false), mods: undefined })).map(t => t.label)).not.toContain('Meta-Regression');
  });
});

describe('Meta-Regression: Eingabe prüfen und an R geben', () => {
  const en = (modNamen: string[], werte: string[][]): MetaEntwurf => ({ art: 'es', modus: 'se', massName: '', verhaeltnis: false, kh: true, modNamen, zeilen: werte.map((w, i) => ({ name: `S${i + 1}`, w: [w[0]!, w[1]!], m: w.slice(2) })) });
  const T = (de: string, _en: string) => de;
  it('Zeilen mit fehlendem Moderator werden ausgelassen und genannt', () => {
    const r = metaPruefung(en(['Jahr'], [['0,1', '0,2', '1990'], ['0,3', '0,2', ''], ['0,2', '0,1', '2000']]), T);
    expect(r.eingabe!.namen).toEqual(['S1', 'S3']); expect(r.eingabe!.mods![0]!.werte).toEqual([1990, 2000]);
    expect(r.punkte.some(p => p.text.includes('1 Zeile wird nicht gerechnet'))).toBe(true);
  });
  it('ein Moderator ohne Unterschied sperrt; zu wenige Studien sperren; weniger als 10 je Moderator warnt', () => {
    expect(metaPruefung(en(['Jahr'], [['0,1', '0,2', '1990'], ['0,3', '0,2', '1990'], ['0,2', '0,1', '1990']]), T).punkte.some(p => p.art === 'sperre' && p.text.includes('denselben Wert'))).toBe(true);
    expect(metaPruefung(en(['A', 'B'], [['0,1', '0,2', '1', '2'], ['0,3', '0,2', '2', '1'], ['0,2', '0,1', '3', '5']]), T).punkte.some(p => p.art === 'sperre' && p.text.includes('nicht 2 Moderatoren'))).toBe(true);
    const w = metaPruefung(en(['Jahr'], Array.from({ length: 6 }, (_, i) => ['0,1', '0,2', String(1990 + i)])), T);
    expect(w.punkte.some(p => p.art === 'hinweis' && p.text.includes('Meta-Regression'))).toBe(true);
  });
  it('R bekommt die Moderatoren als Spalten mod1, mod2 …; der Aufruf zum Nachrechnen enthält mods = ~ …', () => {
    const e = einBcg(true);
    expect(metaDaten(e).map(x => x.name)).toEqual(['yi', 'sei', 'mod1']);
    const code = metaRCode(e, T); expect(code).toContain('d$mod1 <- c(44, 55'); expect(code).toContain('mods = ~ mod1'); expect(code).toContain('test = "knha"'); expect(code).toContain("# 'Breitengrad'");
  });
  it('ohne Moderatoren ändert sich nichts: keine Spalte mod, kein mods im R-Aufruf', () => {
    const e = { ...einBcg(false), mods: undefined };
    expect(metaDaten(e).map(x => x.name)).toEqual(['yi', 'sei']); expect(metaRCode(e, T)).not.toContain('mods');
  });
});
