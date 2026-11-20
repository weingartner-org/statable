import { describe, expect, it } from 'vitest';
import ERW from './testdaten/spaeter-e-erwartet.json';
import ABR from './testdaten/zeitreihen-abrunden-erwartet.json';
import { s } from './sitzung.svelte';
import {
  rasterErkennen, reiheAufbauen, gleitenderMittelwert, zeitTrend, zeitAcf, zeitPacf, acfGrenze, acfLagMax, ljungBoxH, ljungBox, durbinWatson, trendKiEff, zerlegung, zerlegungsArt, zeitreiheKann,
  zeitreiheCodeSatz, zeitreiheAutokorrSatz, zeitreiheZerlegungSatz, zeitreiheGerechnet, type ZeitCode
} from './zeitreihe';

/* ===== Später, Welle S-E, Teil L7: Zeitreihen einfach (neue Karte „zeitreihen“; Fachblatt SPAETER-E Abschnitt 3 und „Entscheidungen Opus (18.10.)“ 6 gehen vor) =====
 * ROTE TESTS des Sollwert-Prüfers. Der Bauer B darf diese Datei und die JSON nicht ändern. FESTGELEGT: Zeitreihen rechnen komplett in JS (`lib/zeitreihe.ts`, reine Funktionen); R bekommt nichts.
 * Sollwerte: scripts/spaeter-e-erwartet.R (R 4.6.1: stats acf, lm, filter, decompose, Box.test, lmtest::dwtest; zweite Quelle: Handformeln, Abweichung < 1e-9 im Skript geprüft).
 * Was es gibt (Opus 6): Verlaufsbild, gleitender Mittelwert, linearer Trend mit KI über die EFFEKTIVE Fallzahl, ACF mit Grenzen, klassische Zerlegung nur ohne Lücken und bei mindestens zwei
 * vollen Perioden. Was es NICHT gibt: Prognose, Auffüllen von Lücken. Bis 10 % Lücken für die ACF zulässig.
 *
 * SCHNITTSTELLE lib/zeitreihe.ts
 *   type Raster = 'monatlich' | 'vierteljaehrlich' | 'jaehrlich' | 'woechentlich' | 'taeglich' | 'ungleich' | 'zeilen'
 *   rasterErkennen(datum: string[]): { raster: Raster; periode: number }      aus den sortierten, verschiedenen Zeitpunkten (ISO JJJJ-MM-TT, mit Uhrzeit möglich): alle Abstände ganze Vielfache von
 *        1 Monat mit gleichem Tag → monatlich (12); Abstände von 3 Monaten → vierteljaehrlich (4); 12 Monate → jaehrlich (1); mindestens 90 % der Abstände genau 1 Tag (der Rest ganze Tage = Lücken) →
 *        taeglich (7); mindestens 90 % genau 7 Tage und alle Abstände Vielfache von 7 → woechentlich (52, Näherung); sonst ungleich (1). Börsentage (Montag bis Freitag: 80 % Abstand 1, 20 % Abstand 3) sind ungleich
 *   reiheAufbauen(datum: (string | null)[] | null, wert: (number | null)[], opt?: { raster?: Raster; periode?: number }):
 *        { ok: true; raster; periode; t: number[]; y: (number | null)[]; n; luecken; anteilLuecken; ausgeschlossen; rueckwaerts: boolean; erster: string; letzter: string }
 *      | { ok: false; code: 'zu-kurz' | 'doppelt' | 'zu-viele-ungueltig' | 'uhrzeit' | 'periode' | 'raster-passt-nicht'; ausgeschlossen?: number }
 *        datum null = „Reihenfolge der Zeilen“ (raster 'zeilen', t = 1 … n, periode aus opt, 1 ≤ periode ≤ n/2, sonst code 'periode'). Mit Datum: ungültige/leere/vor 15.10.1582 Daten sind ausgeschlossen (gezählt);
 *        mehr als 5 % ungültig → 'zu-viele-ungueltig'; aufsteigend sortieren (rueckwaerts = die Eingabe war absteigend); gleicher Zeitpunkt zweimal → 'doppelt'; verschiedene Uhrzeiten → 'uhrzeit'
 *        (alle gleiche Uhrzeit: Datum zählt); weniger als 10 gültige Werte → 'zu-kurz'. Reihenfolge der Prüfungen: ungültig, uhrzeit, doppelt, zu-kurz. Raster gleich: t = 1 … T Position auf dem Raster (monatlich: 12·Jahr + Monat, relativ zum ersten), y = Wert oder null
 *        (Lücke); ungleich: t = Tage seit dem ersten Datum, y ohne Lücken; opt.raster erzwingt ein Raster, passt es nicht zu den Daten → 'raster-passt-nicht'.
 *        n = Zahl der Werte, luecken = fehlende Rasterplätze, anteilLuecken = luecken / T
 *   gleitenderMittelwert(y, k): (number | null)[]       zentriert; k ungerade: Mittel von k Werten, k gerade: 2 × k-Mittel (Randgewichte ½, wie decompose); Ränder und Fenster mit Lücke: null; k = 1: y
 *   zeitTrend(y: (number | null)[], t?: number[]): { n; a; b; seA; seB; df; kiB: [number, number]; r2; resid: (number | null)[] }       y = a + b·t, t = Position (Standard 1 … Länge, bei Lücken die WAHRE Position), 95-%-KI aus t(n − 2)
 *   zeitAcf(x: (number | null)[], lagMax: number): number[]        r_1 … r_lagMax wie stats::acf (Mittel ohne Lücken; bei Lücken Summe der Paare / (Paare + Lag), „na.pass“)
 *   acfGrenze(n): number = 1,96/√n · acfLagMax(n, periode) = max(min(⌊n/4⌋, 36), periode > 1 ? 2·periode : 0, 5), höchstens n − 1
 *   ljungBoxH(n, periode) = ohne Saison min(10, ⌊n/5⌋), mit Saison min(2·periode, ⌊n/5⌋), mindestens 1 · ljungBox(r: number[], n): { q; h; p }   (r = r_1 … r_h, χ² mit h Freiheitsgraden)
 *   durbinWatson(e: number[]): number                              kein p
 *   trendKiEff(trend, r1, n): { nEff; seB; kiB: [number, number] }   nEff = min(n, n(1 − r1)/(1 + r1)); seB·√(n/nEff); t(nEff − 2) (auch nicht ganzzahlig); r1 <= 0: keine Korrektur (nEff = n)
 *   zerlegung(y: number[], periode, art: 'additiv' | 'multiplikativ'): { figur: number[]; trend: (number | null)[]; rest: (number | null)[] }     wie decompose; wirft bei Lücken, periode < 2, weniger als 2 Perioden
 *   zerlegungsArt(y, periode): { r: number; art: 'additiv' | 'multiplikativ' }      r = Korrelation (Jahresmittel, Jahresspannweite) über volle Perioden; multiplikativ nur wenn alle Werte > 0 und r > 0,5
 *   zeitreiheKann(e: { raster; periode; n; T; luecken; anteilLuecken; minWert; alleGleich? }): { trend; acf; ljungBox; durbinWatson; zerlegung; multiplikativ: boolean; hinweise: ZeitCode[]; gruende: { [funktion]: ZeitCode } }
 *   zeitreiheCodeSatz(code: ZeitCode, ctx?: object): string · zeitreiheAutokorrSatz({ r1; q; h; p; nEff; n }): string · zeitreiheZerlegungSatz({ figur; periode; erstesDatum; art }): string
 *   zeitreiheGerechnet({ raster; periode; n; T; luecken; art?; h? }): string
 */
s.einst.sprache = 'de'; s.einst.anrede = 'du';
type Z = Record<string, any>;
const J = ERW as unknown as Z;
const D = J.daten as Z, ZR = J.zeitreihe as Z;
const arr = (x: any): any[] => (Array.isArray(x) ? x : x == null ? [] : [x]);
const nm = (t: string) => t.replace(/[  ]/g, ' ');
const nah = (ist: number, soll: number, tol: number, was: string) => expect(Math.abs(ist - soll) / Math.max(Math.abs(soll), 1e-12), `${was} (ist ${ist}, soll ${soll})`).toBeLessThanOrEqual(tol);
/** Reihen vergleichen; null (Lücke, Rand) muss an denselben Stellen stehen. */
function vgl(ist: (number | null)[], soll: (number | null)[], tol: number, was: string) {
  expect(ist.length, `${was}: Länge`).toBe(soll.length);
  soll.forEach((v, i) => { if (v === null) expect(ist[i], `${was}[${i}] soll null`).toBeNull(); else { expect(ist[i], `${was}[${i}]`).not.toBeNull(); nah(ist[i]!, v, tol, `${was}[${i}]`); } });
}
const pad = (x: number) => String(x).padStart(2, '0');
const monate = (j: number, m: number, anzahl: number, schritt = 1, tag = 1) => Array.from({ length: anzahl }, (_, i) => { const mm = (m - 1) + i * schritt; return `${j + Math.floor(mm / 12)}-${pad((mm % 12) + 1)}-${pad(tag)}`; });
const tage = (start: string, anzahl: number, schritt = 1, uhr = '') => Array.from({ length: anzahl }, (_, i) => { const d = new Date(Date.UTC(+start.slice(0, 4), +start.slice(5, 7) - 1, +start.slice(8, 10) + i * schritt)); return d.toISOString().slice(0, 10) + uhr; });
const AP = { datum: D.airpassengers.datum as string[], wert: D.airpassengers.wert as number[] }, ZRI = { datum: D.zeitreihe.datum as string[], wert: D.zeitreihe.wert as number[] }, LU = { datum: D.zeitreihe_luecken.datum as string[], wert: D.zeitreihe_luecken.wert as number[] };

describe('Raster erkennen (Fachblatt 3.3 Nr. 2)', () => {
  it('monatlich: Monatserste, ein anderer gleicher Tag, mit gleicher Uhrzeit', () => {
    expect(rasterErkennen(monate(2020, 1, 24))).toEqual({ raster: 'monatlich', periode: 12 }); expect(rasterErkennen(monate(2020, 1, 24, 1, 15))).toEqual({ raster: 'monatlich', periode: 12 });
    expect(rasterErkennen(AP.datum)).toEqual({ raster: 'monatlich', periode: 12 }); expect(rasterErkennen(LU.datum)).toEqual({ raster: 'monatlich', periode: 12 });
  });
  it('vierteljährlich (4), jährlich (1)', () => { expect(rasterErkennen(monate(2015, 1, 16, 3))).toEqual({ raster: 'vierteljaehrlich', periode: 4 }); expect(rasterErkennen(monate(2000, 1, 20, 12))).toEqual({ raster: 'jaehrlich', periode: 1 }); });
  it('wöchentlich (Periode 52 als Näherung), täglich (7)', () => { expect(rasterErkennen(tage('2024-01-01', 60, 7))).toEqual({ raster: 'woechentlich', periode: 52 }); expect(rasterErkennen(tage('2024-01-01', 60, 1))).toEqual({ raster: 'taeglich', periode: 7 }); });
  it('täglich mit Lücken: 2 fehlende Tage von 62 bleiben täglich, 90 %-Grenze', () => {
    const t = tage('2024-01-01', 62, 1).filter((_, i) => i !== 20 && i !== 41); expect(rasterErkennen(t)).toEqual({ raster: 'taeglich', periode: 7 });
    const r = reiheAufbauen(t, t.map((_, i) => i)); expect(r.ok && [r.raster, r.y.length, r.luecken]).toEqual(['taeglich', 62, 2]);
    const w = tage('2024-01-01', 60, 7).filter((_, i) => i !== 10); expect(rasterErkennen(w)).toEqual({ raster: 'woechentlich', periode: 52 });
  });
  it('ungleiche Abstände: Börsentage ohne Wochenende', () => {
    const b: string[] = []; for (let i = 0; b.length < 40; i++) { const d = new Date(Date.UTC(2024, 0, 1 + i)); if (d.getUTCDay() % 6 !== 0) b.push(d.toISOString().slice(0, 10)); }
    expect(rasterErkennen(b)).toEqual({ raster: 'ungleich', periode: 1 }); expect(rasterErkennen([...monate(2020, 1, 5), '2020-06-17', '2020-07-01']).raster).toBe('ungleich');
  });
  it('Rand: ein Zeitpunkt oder leer wirft nicht', () => { expect(() => rasterErkennen([])).not.toThrow(); expect(() => rasterErkennen(['2020-01-01'])).not.toThrow(); });
});

describe('Reihe aufbauen: Sortieren, Lücken, Ausschluss, Sperren (Fachblatt 3.3)', () => {
  it('AirPassengers: monatlich, 144 Plätze, keine Lücken, t = 1 … 144', () => {
    const r = reiheAufbauen(AP.datum, AP.wert); expect(r.ok).toBe(true); if (!r.ok) return;
    expect([r.raster, r.periode, r.y.length, r.n, r.luecken, r.anteilLuecken, r.ausgeschlossen, r.rueckwaerts]).toEqual(['monatlich', 12, 144, 144, 0, 0, 0, false]);
    expect(r.t[0]).toBe(1); expect(r.t[143]).toBe(144); expect(r.y).toEqual(AP.wert); expect([r.erster, r.letzter]).toEqual(['1949-01-01', '1960-12-01']);
  });
  it('zeitreihe_luecken.csv: Monate 30, 31 und 70 fehlen → 120 Plätze, 3 Lücken (2,5 %) an der WAHREN Position', () => {
    const r = reiheAufbauen(LU.datum, LU.wert); expect(r.ok).toBe(true); if (!r.ok) return;
    expect([r.raster, r.y.length, r.n, r.luecken]).toEqual(['monatlich', 120, 117, 3]); nah(r.anteilLuecken, 0.025, 1e-12, 'Anteil');
    expect([29, 30, 69].map(i => r.y[i])).toEqual([null, null, null]); expect(r.y.filter(v => v === null).length).toBe(3); expect(r.t).toEqual(Array.from({ length: 120 }, (_, i) => i + 1));
    expect(r.y[28]).toBe(LU.wert[28]); expect(r.y[31]).toBe(LU.wert[29]);
  });
  it('rückwärts sortierte Eingabe: gleiches Ergebnis, Satz „rückwärts“ per Kennzeichen', () => {
    const r = reiheAufbauen([...AP.datum].reverse(), [...AP.wert].reverse()); expect(r.ok).toBe(true); if (!r.ok) return; expect(r.rueckwaerts).toBe(true); expect(r.y).toEqual(AP.wert);
    const g = reiheAufbauen(AP.datum.slice(0, 24), AP.wert.slice(0, 24)); expect(g.ok && g.rueckwaerts).toBe(false);
  });
  it('durcheinander gemischte Zeilen werden stabil sortiert', () => {
    const idx = [...Array(24).keys()].sort((a, b) => ((a * 7) % 24) - ((b * 7) % 24)); const r = reiheAufbauen(idx.map(i => AP.datum[i]!), idx.map(i => AP.wert[i]!)); expect(r.ok && r.y).toEqual(AP.wert.slice(0, 24));
  });
  it('doppelter Zeitpunkt: gesperrt', () => { const d = [...monate(2020, 1, 20)]; d[7] = d[6]!; expect(reiheAufbauen(d, Array.from({ length: 20 }, (_, i) => i))).toEqual({ ok: false, code: 'doppelt' }); });
  it('ungültige Daten: ausgeschlossen und gezählt; über 5 % gesperrt', () => {
    const d = monate(2000, 1, 100) as (string | null)[], w = Array.from({ length: 100 }, (_, i) => i + 1);
    d[3] = '2000-13-01'; d[10] = ''; d[20] = null; const r = reiheAufbauen(d, w); expect(r.ok).toBe(true); if (r.ok) { expect(r.ausgeschlossen).toBe(3); expect(r.n).toBe(97); expect(r.luecken).toBe(3); }
    d[30] = '1500-01-01'; d[40] = 'kein Datum'; d[50] = '2000-02-30'; expect(reiheAufbauen(d, w)).toEqual({ ok: false, code: 'zu-viele-ungueltig', ausgeschlossen: 6 });
  });
  it('Uhrzeit: gleiche Uhrzeit zählt als Datum, verschiedene Uhrzeiten (stündlich) nicht angeboten', () => {
    const r = reiheAufbauen(monate(2020, 1, 24).map(d => d + ' 08:00'), Array.from({ length: 24 }, (_, i) => i)); expect(r.ok && r.raster).toBe('monatlich');
    const st = Array.from({ length: 24 }, (_, i) => `2020-03-01 ${pad(i)}:00:00`); expect(reiheAufbauen(st, Array.from({ length: 24 }, (_, i) => i))).toEqual({ ok: false, code: 'uhrzeit' });
  });
  it('Länge: n = 9 gesperrt, n = 10 läuft', () => {
    expect(reiheAufbauen(monate(2020, 1, 9), Array.from({ length: 9 }, (_, i) => i))).toEqual({ ok: false, code: 'zu-kurz' }); expect(reiheAufbauen(monate(2020, 1, 10), Array.from({ length: 10 }, (_, i) => i)).ok).toBe(true);
  });
  it('Reihenfolge der Zeilen mit Periode 12: t = 1 … n', () => {
    const r = reiheAufbauen(null, AP.wert.slice(0, 48), { periode: 12 }); expect(r.ok).toBe(true); if (r.ok) { expect([r.raster, r.periode, r.y.length, r.luecken]).toEqual(['zeilen', 12, 48, 0]); expect(r.t[47]).toBe(48); }
    expect(reiheAufbauen(null, AP.wert.slice(0, 20), { periode: 11 })).toEqual({ ok: false, code: 'periode' }); expect(reiheAufbauen(null, AP.wert.slice(0, 20), { periode: 0 })).toEqual({ ok: false, code: 'periode' });
    expect(reiheAufbauen(null, AP.wert.slice(0, 20), { periode: 10 }).ok).toBe(true);
  });
  it('Zeilen mit leerem Wert werden zu Lücken (ein Datum ohne Wert)', () => {
    const w: (number | null)[] = AP.wert.slice(0, 30); w[10] = null; const r = reiheAufbauen(AP.datum.slice(0, 30), w); expect(r.ok).toBe(true); if (r.ok) { expect(r.y[10]).toBeNull(); expect(r.luecken).toBe(1); expect(r.n).toBe(29); }
  });
  it('ungleiche Abstände: Zeit in Tagen seit dem ersten Datum, keine Lücken', () => {
    const d = ['2024-01-01', '2024-01-02', '2024-01-05', '2024-01-06', '2024-01-12', '2024-01-13', '2024-01-14', '2024-01-20', '2024-01-22', '2024-01-30'], w = d.map((_, i) => i * 2);
    const r = reiheAufbauen(d, w); expect(r.ok).toBe(true); if (r.ok) { expect(r.raster).toBe('ungleich'); expect(r.t).toEqual([0, 1, 4, 5, 11, 12, 13, 19, 21, 29]); expect(r.luecken).toBe(0); expect(r.y).toEqual(w); }
  });
  it('Raster erzwingen: passt es nicht zu den Daten, Sperre', () => {
    expect(reiheAufbauen(AP.datum, AP.wert, { raster: 'monatlich' }).ok).toBe(true); expect(reiheAufbauen(AP.datum, AP.wert, { raster: 'vierteljaehrlich' })).toEqual({ ok: false, code: 'raster-passt-nicht' });
    const q = reiheAufbauen(monate(2015, 1, 16, 3), Array.from({ length: 16 }, (_, i) => i), { raster: 'vierteljaehrlich' }); expect(q.ok && q.periode).toBe(4);
  });
  it('Wochen und Tage: Periode 52 bzw. 7, t zählt die Plätze', () => {
    const w = reiheAufbauen(tage('2024-01-01', 60, 7), Array.from({ length: 60 }, (_, i) => i)); expect(w.ok && [w.raster, w.periode, w.t[59]]).toEqual(['woechentlich', 52, 60]);
    const t = reiheAufbauen(tage('2024-01-01', 30, 1), Array.from({ length: 30 }, (_, i) => i)); expect(t.ok && [t.raster, t.periode]).toEqual(['taeglich', 7]);
  });
});

describe('Gleitender Mittelwert (Sollwerte aus R: Handrechnung = stats::filter)', () => {
  const faelle: [string, (number | null)[], string, number][] = [['airpassengers', AP.wert, 'k3', 3], ['airpassengers', AP.wert, 'k12', 12], ['zeitreihe', ZRI.wert, 'k5', 5], ['zeitreihe', ZRI.wert, 'k12', 12]];
  for (const [name, y, key, k] of faelle) it(`${name}, Fenster ${k}${k % 2 ? '' : ' (2 × ' + k + ')'}`, () => { const o = gleitenderMittelwert(y, k); vgl(o, arr(ZR[name].gleitend[key]), 1e-12, `${name} ${key}`); expect(o.filter(v => v === null).length).toBe(k % 2 ? k - 1 : k); });
  it('Fachblatt: AirPassengers 3er-Mittel Werte 2 bis 4: 120,6667 / 126,3333 / 127,3333; 2 × 12 Werte 7 bis 9', () => {
    const a = gleitenderMittelwert(AP.wert, 3), b = gleitenderMittelwert(AP.wert, 12); [120.6667, 126.3333, 127.3333].forEach((v, i) => nah(a[i + 1]!, v, 1e-6, `k3 ${i}`)); [126.7917, 127.25, 127.9583].forEach((v, i) => nah(b[i + 6]!, v, 1e-6, `k12 ${i}`));
  });
  it('mit Lücken (Monate 30, 31 und 70 fehlen): jedes Fenster mit Lücke gibt null (kein Auffüllen)', () => {
    const y = [...ZRI.wert].map((v, i) => ([29, 30, 69].includes(i) ? null : v)); const o = gleitenderMittelwert(y, 3); vgl(o, arr(ZR.luecken.gleitend.k3), 1e-12, 'Lücken k3');
    for (const i of [28, 29, 30, 31, 68, 69, 70]) expect(o[i], `Platz ${i}`).toBeNull(); for (const i of [27, 32, 67, 71]) expect(o[i], `Platz ${i}`).not.toBeNull();
  });
  it('Rand: k = 1 gibt die Reihe, k größer als n nur null, leere und kurze Reihe wirft nicht, 2 × 2 hat Randgewichte', () => {
    expect(gleitenderMittelwert([1, 2, 3], 1)).toEqual([1, 2, 3]); expect(gleitenderMittelwert([1, 2, 3], 5)).toEqual([null, null, null]); expect(gleitenderMittelwert([], 3)).toEqual([]);
    expect(gleitenderMittelwert([1, 2, 3, 4], 2)).toEqual([null, 2, 3, null]);   // Gewichte ¼ ½ ¼ wie filter(y, c(.5, 1, .5)/2)
  });
});

describe('Linearer Trend (95-%-KI aus t(n − 2); Sollwerte: lm, Normalgleichungen, PSPP REGRESSION gleich auf 8 Stellen)', () => {
  const fall = (name: string, y: (number | null)[]) => it(`${name}: a, b, SE, KI, R², Residuen`, () => {
    const o = zeitTrend(y), t = ZR[name].trend as Z; expect(o.n).toBe(t.n); expect(o.df).toBe(t.df);
    for (const [k, sk] of [['a', 'a'], ['b', 'b'], ['seA', 'se_a'], ['seB', 'se_b'], ['r2', 'r2']] as const) nah((o as Z)[k], t[sk], 1e-9, `${name} ${k}`);
    nah(o.kiB[0], t.ki_u, 1e-9, 'KI unten'); nah(o.kiB[1], t.ki_o, 1e-9, 'KI oben'); vgl(o.resid, arr(t.resid), 1e-8, `${name} Residuen`);
  });
  fall('airpassengers', AP.wert); fall('zeitreihe', ZRI.wert); fall('weiss', arr(ZR.weiss.y));
  it('Fachblatt AirPassengers: b = 2,657184 (SE 0,092332), KI [2,4747; 2,8397], Konstante 87,6528, R² = ,85364', () => {
    const o = zeitTrend(AP.wert); nah(o.b, 2.657184, 1e-6, 'b'); nah(o.seB, 0.092332, 1e-4, 'SE'); nah(o.kiB[0], 2.4747, 1e-4, 'u'); nah(o.kiB[1], 2.8397, 1e-4, 'o'); nah(o.a, 87.6528, 1e-6, 'a'); nah(o.r2, 0.85364, 1e-5, 'R²');
  });
  it('Lücken: Trend an der WAHREN Position (b = 0,249913), nicht zusammengeschoben (0,257762 ist falsch)', () => {
    const r = reiheAufbauen(LU.datum, LU.wert); expect(r.ok).toBe(true); if (!r.ok) return;
    const t = ZR.luecken.trend as Z, o = zeitTrend(r.y, r.t); nah(o.b, t.b, 1e-9, 'b wahr'); nah(o.seB, t.se_b, 1e-9, 'SE'); expect(o.n).toBe(117); expect(o.df).toBe(115);
    const zu = zeitTrend(LU.wert); nah(zu.b, ZR.luecken.zusammengeschoben_b, 1e-9, 'zusammengeschoben'); expect(Math.abs(zu.b - o.b)).toBeGreaterThan(0.005);
    expect(zeitTrend(r.y).b, 'ohne t: laufende Nummer der Zeilen mit Wert? nein - Lücken zählen als Plätze').toBe(o.b);
  });
  it('ungleiche Zeit: exakte Gerade y = 2 + 0,5·t', () => { const t = [0, 1, 4, 5, 11, 12, 13, 19, 21, 29]; const o = zeitTrend(t.map(x => 2 + 0.5 * x), t); nah(o.b, 0.5, 1e-12, 'b'); nah(o.a, 2, 1e-12, 'a'); expect(o.r2).toBeCloseTo(1, 12); });
  it('Rand: alle Werte gleich → b = 0 ohne NaN in den Zahlen, die bleiben müssen; zu wenige Werte wirft nicht', () => {
    const o = zeitTrend(Array(20).fill(5)); expect(o.b).toBeCloseTo(0, 12); expect(o.a).toBeCloseTo(5, 12); expect(Number.isNaN(o.b)).toBe(false); expect(() => zeitTrend([1, 2])).not.toThrow(); expect(() => zeitTrend([])).not.toThrow();
  });
});

describe('Autokorrelation: ACF, Grenzen, Ljung-Box, Durbin-Watson', () => {
  it('Lag-Zahl und h (Fachblatt 3.4, 3.6)', () => {
    expect(acfLagMax(144, 12)).toBe(36); expect(acfLagMax(120, 12)).toBe(30); expect(acfLagMax(20, 1)).toBe(5); expect(acfLagMax(40, 1)).toBe(10); expect(acfLagMax(24, 12)).toBe(23); expect(acfLagMax(200, 1)).toBe(36);
    expect(ljungBoxH(144, 12)).toBe(24); expect(ljungBoxH(120, 12)).toBe(24); expect(ljungBoxH(50, 1)).toBe(10); expect(ljungBoxH(30, 1)).toBe(6); expect(ljungBoxH(24, 12)).toBe(4); expect(ljungBoxH(5, 1)).toBe(1);
  });
  it('Grenze ±1,96/√n', () => { nah(acfGrenze(144), 0.16333, 1e-4, 'AP'); nah(acfGrenze(120), 0.17892, 1e-4, 'zeitreihe'); nah(acfGrenze(144), ZR.airpassengers.grenze, 1e-12, 'JSON'); nah(acfGrenze(117), ZR.luecken.grenze, 1e-12, 'Lücken: Zahl der Werte'); });
  for (const [name, y] of [['airpassengers', AP.wert], ['zeitreihe', ZRI.wert]] as [string, number[]][]) it(`${name}: ACF der Reihe und der Residuen = stats::acf (1e-12)`, () => {
    const z = ZR[name] as Z, L = z.lag_max; expect(acfLagMax(y.length, 12)).toBe(L);
    vgl(zeitAcf(y, L), arr(z.acf_reihe), 1e-12, 'Reihe'); vgl(zeitAcf(arr(z.trend.resid), L), arr(z.acf_resid), 1e-12, 'Residuen');
    const eigen = zeitTrend(y); vgl(zeitAcf(eigen.resid, L), arr(z.acf_resid), 1e-8, 'Residuen aus eigenem Trend');
  });
  it('Fachblatt: AirPassengers ACF Lag 1 bis 6 ,94805 / ,87557 / ,80668 / ,75263 / ,71377 / ,68173; Residuen ,72819 / ,28833 / −,08818 / −,32837 / −,39346 / −,40630', () => {
    const a = zeitAcf(AP.wert, 6), r = zeitAcf(zeitTrend(AP.wert).resid, 6);
    [0.94805, 0.87557, 0.80668, 0.75263, 0.71377, 0.68173].forEach((v, i) => nah(a[i]!, v, 1e-4, `Reihe ${i + 1}`)); [0.72819, 0.28833, -0.08818, -0.32837, -0.39346, -0.4063].forEach((v, i) => nah(r[i]!, v, 1e-4, `Residuen ${i + 1}`));
  });
  it('Lücken (na.pass): Lag 1 bis 3 = ,91204 / ,82757 / ,73939 (vollständig ,90005 / ,81214 / ,72846)', () => {
    const r = reiheAufbauen(LU.datum, LU.wert); expect(r.ok).toBe(true); if (!r.ok) return; const a = zeitAcf(r.y, 12);
    vgl(a, arr(ZR.luecken.acf_reihe).slice(0, 12), 1e-12, 'Lücken-ACF'); [0.91204, 0.82757, 0.73939].forEach((v, i) => nah(a[i]!, v, 1e-4, `Lag ${i + 1}`)); nah(zeitAcf(ZRI.wert, 1)[0]!, 0.90005, 1e-4, 'vollständig');
  });
  it('Rand: Lag größer als n − 1 und konstante Reihe geben nie NaN', () => {
    expect(zeitAcf([1, 2, 3, 4], 10).every(v => !Number.isNaN(v))).toBe(true); expect(zeitAcf(Array(10).fill(2), 3).every(v => !Number.isNaN(v))).toBe(true); expect(zeitAcf([], 3)).toEqual([]);
  });
  it('Ljung-Box: h = 24 (mit Saison) und h = 10 (ohne) gegen Box.test; p aus χ²', () => {
    for (const name of ['airpassengers', 'zeitreihe']) {
      const z = ZR[name] as Z, n = z.n, r = arr(z.acf_resid) as number[]; const a = ljungBox(r.slice(0, ljungBoxH(n, 12)), n), b = ljungBox(r.slice(0, 10), n);
      expect([a.h, b.h]).toEqual([24, 10]); nah(a.q, z.ljung_saison.q, 1e-9, `${name} Q(24)`); nah(b.q, z.ljung_h10.q, 1e-9, `${name} Q(10)`); expect(a.p).toBeLessThan(0.001); expect(b.p).toBeLessThan(0.001);
    }
    nah(ljungBox(arr(ZR.airpassengers.acf_resid).slice(0, 24), 144).q, 659.3537, 1e-6, 'Fachblatt Q(24) = 659,3537'); nah(ljungBox(arr(ZR.airpassengers.acf_resid).slice(0, 10), 144).q, 204.6561, 1e-6, 'Fachblatt Q(10)');
  });
  it('Ljung-Box bei weißem Rauschen: p im mittleren Bereich, gleich R', () => {
    const z = ZR.weiss as Z, o = ljungBox(arr(z.acf_resid).slice(0, 10), z.n); nah(o.q, z.ljung_h10.q, 1e-9, 'Q'); nah(o.p, z.ljung_h10.p, 1e-7, 'p'); expect(o.p).toBeGreaterThan(0.1);
  });
  it('Durbin-Watson gegen lmtest::dwtest (kein p)', () => {
    nah(durbinWatson(arr(ZR.airpassengers.trend.resid)), ZR.airpassengers.dw, 1e-9, 'AP'); nah(durbinWatson(arr(ZR.airpassengers.trend.resid)), 0.53719, 1e-4, 'Fachblatt d = ,53719'); nah(durbinWatson(arr(ZR.zeitreihe.trend.resid)), ZR.zeitreihe.dw, 1e-9, 'zeitreihe');
    expect(typeof durbinWatson([1, -1, 1])).toBe('number'); nah(durbinWatson([1, -1, 1, -1]), 4 * 3 / 4, 1e-12, 'Handwert: Σ(Δe)² / Σe² = 12/4');
  });
});

describe('Trend-Konfidenzintervall mit effektiver Fallzahl (Santer et al. 2000; Opus 6)', () => {
  for (const name of ['airpassengers', 'zeitreihe', 'weiss']) it(`${name}: nEff, SE und KI gegen die Handrechnung in R`, () => {
    const z = ZR[name] as Z, t = zeitTrend(name === 'weiss' ? arr(z.y) : name === 'airpassengers' ? AP.wert : ZRI.wert), r1 = z.neff.r1;
    nah(zeitAcf(t.resid, 1)[0]!, r1, 1e-8, 'r1'); const o = trendKiEff(t, r1, z.n);
    nah(o.nEff, z.neff.n_eff, 1e-9, 'nEff'); nah(o.seB, z.neff.se_b, 1e-9, 'SE'); nah(o.kiB[0], z.neff.ki_u, 1e-9, 'unten'); nah(o.kiB[1], z.neff.ki_o, 1e-9, 'oben');
  });
  it('Fachblatt: AirPassengers nEff = 22,648, KI [2,1725; 3,1419] statt [2,4747; 2,8397]; zeitreihe.csv nEff 22,658, KI [0,1867; 0,3125]', () => {
    const t = zeitTrend(AP.wert), o = trendKiEff(t, 0.72819, 144); nah(o.nEff, 22.648, 2e-4, 'nEff'); nah(o.kiB[0], 2.1725, 5e-4, 'u'); nah(o.kiB[1], 3.1419, 5e-4, 'o');
    expect(o.kiB[1] - o.kiB[0]).toBeGreaterThan(t.kiB[1] - t.kiB[0]);
  });
  it('r1 ≤ 0: keine Korrektur (nEff = n, KI wie gewöhnlich)', () => {
    const a = ZR.alternierend as Z, y = arr(a.y) as number[], t = zeitTrend(y); expect(a.r1).toBeLessThan(0); const o = trendKiEff(t, a.r1, a.n);
    expect(o.nEff).toBe(a.n); nah(o.kiB[0], t.kiB[0], 1e-12, 'unten'); nah(o.kiB[1], t.kiB[1], 1e-12, 'oben'); nah(o.seB, t.seB, 1e-12, 'SE'); nah(t.b, a.trend.b, 1e-9, 'b');
    const w = trendKiEff(zeitTrend(arr(ZR.weiss.y)), ZR.weiss.neff.r1, 60); expect(w.nEff).toBe(60);
  });
  it('Rand: r1 nahe 1 gibt endliche Grenzen (nEff mindestens 3)', () => { const t = zeitTrend(AP.wert), o = trendKiEff(t, 0.999, 144); expect(o.nEff).toBeGreaterThanOrEqual(3); for (const v of [o.nEff, o.seB, ...o.kiB]) expect(Number.isFinite(v)).toBe(true); });
});

describe('Klassische Zerlegung (wie stats::decompose; Handformel im Skript auf 1e-12)', () => {
  const fall = (name: string, y: number[], art: 'additiv' | 'multiplikativ') => it(`${name}: ${art}, Saisonfigur, Trend und Rest`, () => {
    const o = zerlegung(y, 12, art), s = ZR[name].zerlegung[art] as Z; vgl(o.figur, arr(s.figur), 1e-12, 'Figur'); vgl(o.trend, arr(s.trend), 1e-12, 'Trend'); vgl(o.rest, arr(s.rest), 1e-10, 'Rest');
    expect(o.trend.slice(0, 6).every(v => v === null)).toBe(true); expect(o.trend.slice(-6).every(v => v === null)).toBe(true); expect(o.trend.filter(v => v === null).length).toBe(12);
  });
  fall('airpassengers', AP.wert, 'multiplikativ'); fall('airpassengers', AP.wert, 'additiv'); fall('zeitreihe', ZRI.wert, 'additiv');
  it('Fachblatt: Saisonfaktoren multiplikativ 0,9102 / 0,8836 / 1,0074 …, additiv −24,7487 / −36,1881 / −2,2412 …; Trend Wert 7: 126,7917; Rest Werte 7 bis 9', () => {
    const m = zerlegung(AP.wert, 12, 'multiplikativ'), a = zerlegung(AP.wert, 12, 'additiv');
    [0.9102, 0.8836, 1.0074, 0.9759, 0.9814, 1.1128, 1.2266, 1.2199, 1.0605, 0.9218, 0.8012, 0.8988].forEach((v, i) => nah(m.figur[i]!, v, 1e-3, `mult ${i}`)); [-24.7487, -36.1881, -2.2412].forEach((v, i) => nah(a.figur[i]!, v, 1e-4, `add ${i}`));
    nah(m.trend[6]!, 126.7917, 1e-6, 'Trend 7'); [0.95166, 0.9534, 1.00222].forEach((v, i) => nah(m.rest[6 + i]!, v, 1e-4, `Rest ${7 + i}`)); nah(a.rest[6]!, -42.6225, 1e-5, 'additiv Rest 7');
    nah(m.figur.reduce((x, y) => x + y, 0) / 12, 1, 1e-12, 'Mittel der multiplikativen Figur = 1'); expect(Math.abs(a.figur.reduce((x, y) => x + y, 0))).toBeLessThan(1e-9);
  });
  it('Fachblatt zeitreihe.csv: Maximum März 6,2842, Minimum November −5,2074; Trend Wert 7: 50,4708; Rest Wert 7: 2,6213', () => {
    const o = zerlegung(ZRI.wert, 12, 'additiv'); nah(o.figur[2]!, 6.2842, 1e-4, 'März'); nah(o.figur[10]!, -5.2074, 1e-4, 'November'); nah(o.trend[6]!, 50.4708, 1e-5, 'Trend 7'); nah(o.rest[6]!, 2.6213, 1e-4, 'Rest 7');
  });
  it('ungerade Periode (7): Trend ist das einfache Mittel, Figur summiert zu 0', () => { const y = Array.from({ length: 28 }, (_, i) => 10 + i * 0.5 + [3, -1, 0, 2, -2, 1, -3][i % 7]!); const o = zerlegung(y, 7, 'additiv'); expect(o.trend.filter(v => v === null).length).toBe(6); expect(Math.abs(o.figur.reduce((a, b) => a + b, 0))).toBeLessThan(1e-12); });
  it('wirft bei Lücken, Periode unter 2 oder weniger als 2 vollen Perioden', () => {
    expect(() => zerlegung([...AP.wert.slice(0, 48)].map((v, i) => (i === 5 ? NaN : v)), 12, 'additiv')).toThrow(); expect(() => zerlegung([...AP.wert.slice(0, 48), null as any], 12, 'additiv')).toThrow();
    expect(() => zerlegung(AP.wert, 1, 'additiv')).toThrow(); expect(() => zerlegung(AP.wert.slice(0, 23), 12, 'additiv')).toThrow(); expect(() => zerlegung(AP.wert.slice(0, 24), 12, 'additiv')).not.toThrow();
  });
  it('multiplikativ mit Werten ≤ 0 wirft', () => { expect(() => zerlegung(AP.wert.slice(0, 48).map((v, i) => (i === 3 ? 0 : v)), 12, 'multiplikativ')).toThrow(); });
  it('Zerlegungsart: AirPassengers multiplikativ (r = ,991), zeitreihe.csv additiv (r = −,495), Werte ≤ 0 immer additiv', () => {
    const a = zerlegungsArt(AP.wert, 12), z = zerlegungsArt(ZRI.wert, 12); nah(a.r, ZR.airpassengers.zerlegungsart.r, 1e-9, 'r AP'); nah(z.r, ZR.zeitreihe.zerlegungsart.r, 1e-9, 'r zeitreihe'); expect([a.art, z.art]).toEqual(['multiplikativ', 'additiv']);
    nah(a.r, 0.991, 2e-3, 'Fachblatt .991'); nah(z.r, -0.495, 2e-3, 'Fachblatt -,495'); expect(zerlegungsArt(AP.wert.map((v, i) => (i === 3 ? -1 : v)), 12).art).toBe('additiv');
  });
});

describe('Was die Karte kann: Sperren und Hinweise je Reihe (Fachblatt 3.3, 3.5, Opus 6)', () => {
  const ap = { raster: 'monatlich' as const, periode: 12, n: 144, T: 144, luecken: 0, anteilLuecken: 0, minWert: 104 };
  const aus = (o: Z) => zeitreiheKann({ ...ap, ...o } as any);
  it('AirPassengers: alles', () => { const o = aus({}); expect([o.trend, o.acf, o.ljungBox, o.durbinWatson, o.zerlegung, o.multiplikativ]).toEqual([true, true, true, true, true, true]); expect(o.hinweise).toEqual([]); expect(o.gruende).toEqual({}); });
  it('3 Lücken (2,5 %): Trend und ACF ja (mit Hinweis), Ljung-Box, Durbin-Watson und Zerlegung gesperrt', () => {
    const o = aus({ n: 117, luecken: 3, anteilLuecken: 0.025 }); expect([o.trend, o.acf, o.ljungBox, o.durbinWatson, o.zerlegung]).toEqual([true, true, false, false, false]);
    expect(o.hinweise).toContain('acf-luecken'); expect(o.gruende).toMatchObject({ ljungBox: 'luecken', durbinWatson: 'luecken', zerlegung: 'luecken' });
  });
  it('Lücken genau 10 % ACF ja, darüber nein (Trend läuft immer)', () => {
    expect(aus({ n: 130, luecken: 14, anteilLuecken: 14 / 144 }).acf).toBe(true); const o = aus({ n: 126, luecken: 18, anteilLuecken: 18 / 144 }); expect([o.trend, o.acf]).toEqual([true, false]); expect(o.gruende.acf).toBe('zu-viele-luecken');
    expect(aus({ n: 130, luecken: 15, anteilLuecken: 0.1 }).acf).toBe(true); expect(aus({ n: 130, luecken: 15, anteilLuecken: 0.1001 }).acf).toBe(false);
  });
  it('ungleiche Abstände: nur Verlauf, Trend, gleitender Mittelwert', () => { const o = aus({ raster: 'ungleich', periode: 1, luecken: 0 }); expect([o.trend, o.acf, o.ljungBox, o.durbinWatson, o.zerlegung]).toEqual([true, false, false, false, false]); expect(o.gruende).toMatchObject({ acf: 'ungleich', zerlegung: 'ungleich' }); });
  it('wöchentlich: ACF ja, Zerlegung nein (Periode 52 ist eine Näherung)', () => { const o = aus({ raster: 'woechentlich', periode: 52, n: 300, T: 300 }); expect([o.acf, o.zerlegung]).toEqual([true, false]); expect(o.gruende.zerlegung).toBe('woche'); });
  it('jährlich: keine Saison', () => { const o = aus({ raster: 'jaehrlich', periode: 1, n: 40, T: 40 }); expect([o.trend, o.zerlegung]).toEqual([true, false]); expect(o.gruende.zerlegung).toBe('keine-saison'); });
  it('Zerlegung braucht zwei volle Perioden: n = 23 nein, n = 24 ja (mit Hinweis unter drei Perioden)', () => {
    const k = aus({ n: 23, T: 23 }); expect(k.zerlegung).toBe(false); expect(k.gruende.zerlegung).toBe('zu-kurz-fuer-zerlegung'); const l = aus({ n: 24, T: 24 }); expect(l.zerlegung).toBe(true); expect(l.hinweise).toContain('wenige-perioden');
    expect(aus({ n: 36, T: 36 }).hinweise).not.toContain('wenige-perioden');
  });
  it('Länge: n = 9 gesperrt, n = 15 Hinweis, n = 20 ohne', () => {
    expect(aus({ n: 9, T: 9, periode: 1, raster: 'jaehrlich' })).toMatchObject({ trend: false, gruende: { trend: 'zu-kurz' } }); expect(aus({ n: 15, T: 15, periode: 1, raster: 'jaehrlich' })).toMatchObject({ trend: true, hinweise: ['kurz'] });
    expect(aus({ n: 20, T: 20, periode: 1, raster: 'jaehrlich' }).hinweise).toEqual([]);
  });
  it('negative oder Nullwerte: multiplikativ nicht angeboten; alle Werte gleich: Trend gesperrt', () => {
    const o = aus({ minWert: 0 }); expect([o.zerlegung, o.multiplikativ]).toEqual([true, false]); expect(o.gruende.multiplikativ).toBe('nicht-positiv'); const g = aus({ alleGleich: true }); expect(g.trend).toBe(false); expect(g.gruende.trend).toBe('alle-gleich');
  });
});

describe('Sätze', () => {
  const alle: ZeitCode[] = ['zu-kurz', 'kurz', 'doppelt', 'zu-viele-ungueltig', 'uhrzeit', 'periode', 'raster-passt-nicht', 'ungleich', 'luecken', 'zu-viele-luecken', 'acf-luecken', 'keine-saison', 'woche', 'zu-kurz-fuer-zerlegung', 'wenige-perioden', 'nicht-positiv', 'alle-gleich'];
  for (const c of alle) it(`${c}: ganzer Satz, englisch anders, ohne NaN`, () => {
    const ctx = { luecken: 3, n: 117, T: 120, periode: 12, ausgeschlossen: 6 }; const de = zeitreiheCodeSatz(c, ctx); s.einst.sprache = 'en';
    try { const en = zeitreiheCodeSatz(c, ctx); expect(de.length).toBeGreaterThan(20); expect(en).not.toBe(de); for (const t of [de, en]) expect(t).not.toMatch(/NaN|undefined|\[object/); } finally { s.einst.sprache = 'de'; }
  });
  it('Inhalt', () => {
    expect(nm(zeitreiheCodeSatz('luecken', { luecken: 3, T: 120, periode: 12 }))).toMatch(/3/); expect(zeitreiheCodeSatz('doppelt')).toMatch(/Zeitpunkt/); expect(zeitreiheCodeSatz('ungleich')).toMatch(/ungleich/);
    expect(zeitreiheCodeSatz('luecken', { luecken: 3, T: 120, periode: 12 })).toMatch(/Zerlegung/);
  });
  it('Autokorrelation mit Befund: Warnung, Ljung-Box, effektive Fallzahl (AirPassengers)', () => {
    const t = nm(zeitreiheAutokorrSatz({ r1: 0.72819, q: 659.3537, h: 24, p: 1e-120, nEff: 22.648, n: 144 })); expect(t).toMatch(/Ljung-Box/); expect(t).toMatch(/Q\(24\)/); expect(t).toMatch(/22,6/); expect(t).toMatch(/144/); expect(t).toMatch(/<\s*0?,001/);
  });
  it('Autokorrelation ohne Befund: „keine deutliche Autokorrelation“, keine effektive Fallzahl', () => {
    const z = ZR.weiss as Z, t = nm(zeitreiheAutokorrSatz({ r1: z.neff.r1, q: z.ljung_h10.q, h: 10, p: z.ljung_h10.p, nEff: z.neff.n_eff, n: z.n })); expect(t).toMatch(/keine deutliche Autokorrelation/); expect(t).toMatch(/Q\(10\)/); expect(t).not.toMatch(/effektiv/i);
  });
  it('Zerlegungssatz: höchster und niedrigster Monat aus der Figur (zeitreihe.csv: März +6,3, November −5,2)', () => {
    const f = zerlegung(ZRI.wert, 12, 'additiv').figur, t = nm(zeitreiheZerlegungSatz({ figur: f, periode: 12, erstesDatum: '2015-01-01', art: 'additiv' }));
    expect(t).toMatch(/März/); expect(t).toMatch(/November/); expect(t).toMatch(/6,3/); expect(t).toMatch(/5,2/); expect(t).toMatch(/additiv/);
    s.einst.sprache = 'en'; try { expect(zeitreiheZerlegungSatz({ figur: f, periode: 12, erstesDatum: '2015-01-01', art: 'additiv' })).toMatch(/March/); } finally { s.einst.sprache = 'de'; }
  });
  it('Zerlegungssatz: der Monat folgt dem ERSTEN Datum der Reihe (Start im Juli → Position 3 ist September)', () => {
    const f = [0, 0, 5, 0, 0, 0, 0, 0, 0, -3, 0, 0]; const t = zeitreiheZerlegungSatz({ figur: f, periode: 12, erstesDatum: '2015-07-01', art: 'additiv' }); expect(t).toMatch(/September/); expect(t).toMatch(/April/);
  });
  it('Zeile „Gerechnet“', () => {
    const t = nm(zeitreiheGerechnet({ raster: 'monatlich', periode: 12, n: 120, T: 120, luecken: 0, art: 'additiv', h: 24 })); for (const w of ['monatlich', 'Periode 12', '120', 'Ljung-Box', '24', 'additiv', 'Hyndman']) expect(t, w).toContain(w);
    const u = nm(zeitreiheGerechnet({ raster: 'monatlich', periode: 12, n: 117, T: 120, luecken: 3 })); expect(u).toContain('117'); expect(u).toContain('3');
  });
});

/* ===== Zeitreihen abrunden (Fachblatt docs/fachblaetter/ZEITREIHEN-ABRUNDEN.md, Abschnitt 1): PACF aus der ACF (Durbin-Levinson). Sollwerte: scripts/zeitreihen-abrunden-erwartet.R (stats::pacf, forecast::Pacf, Handformel). ===== */
describe('Partielle Autokorrelation (zeitPacf)', () => {
  const E = ABR as unknown as { pruefung: { name: string; acf: number[]; pacf: number[] }[]; korrelogramm_luecken: { acf: number[]; pacf: number[] } };
  it('aus der ACF der acht Sollfälle: gleich stats::pacf auf 1e-9', () => {
    expect(E.pruefung.length).toBe(8);
    for (const p of E.pruefung) {
      const z = zeitPacf(p.acf); expect(z, p.name).not.toBeNull();
      expect(z!.length).toBe(p.pacf.length);
      z!.forEach((v, i) => expect(Math.abs(v - p.pacf[i]!), `${p.name} Lag ${i + 1}`).toBeLessThan(1e-9));
    }
  });
  it('aus der Reihe selbst: zeitAcf, dann zeitPacf gleich dem Sollwert (log Air, d = 1, D = 1 bei Lag 1 gleich der ACF)', () => {
    const p = E.pruefung.find(x => x.name === 'air_log_11') as unknown as { acf: number[]; pacf: number[] };
    expect(zeitPacf(p.acf)![0]).toBeCloseTo(p.acf[0]!, 12);
  });
  it('mit Lücken: Sollwert der ACF aus den vorhandenen Paaren, 24 Verzögerungen', () => {
    const k = E.korrelogramm_luecken, z = zeitPacf(k.acf);
    expect(z).not.toBeNull(); expect(z!.length).toBe(24);
    z!.forEach((v, i) => expect(Math.abs(v - k.pacf[i]!), `Lag ${i + 1}`).toBeLessThan(1e-9));
  });
  it('ein Betrag ab 1 oder ein nicht endlicher Wert: keine PACF (null); leere Eingabe: leer', () => {
    expect(zeitPacf([0.5, 1.2])).toBeNull(); expect(zeitPacf([1])).toBeNull(); expect(zeitPacf([0.3, NaN])).toBeNull(); expect(zeitPacf([0.3, Infinity])).toBeNull();
    expect(zeitPacf([])).toEqual([]);
    // r1 = 0,9 und r2 = 0,2 passen nicht zusammen (|phi22| = 3,6 > 1): AR(1)-Werte wären r2 = 0,81
    expect(zeitPacf([0.9, 0.2])).toBeNull();
  });
  it('AR(1) mit phi = 0,6: r_k = 0,6^k gibt PACF 0,6 bei Lag 1 und 0 danach', () => {
    const z = zeitPacf([0.6, 0.36, 0.216, 0.1296])!;
    expect(z[0]).toBeCloseTo(0.6, 12); z.slice(1).forEach(v => expect(Math.abs(v)).toBeLessThan(1e-12));
  });
});
