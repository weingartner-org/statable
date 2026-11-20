import { describe, expect, it } from 'vitest';
import ERW from './testdaten/spaeter-f2-erwartet.json';
import { s } from './sitzung.svelte';
import { zeitCcf, ccfKann, ccfAutokorrHinweis, ccfSaetze, ccfAchsenText, ccfHilfeText } from './zeitreihe';

/* ===== Später, Welle S-F2, Teil C.2: Kreuzkorrelation in der Zeitreihen-Karte (Fachblatt SPAETER-F2-ERGAENZUNGEN Abschnitt C.2 und „Entscheidungen Opus (19.10.)“ 8 gehen vor) =====
 * ROTE TESTS des Sollwert-Prüfers. Der Bauer B darf diese Datei und die JSON nicht ändern. Reine JS-Funktionen in lib/zeitreihe.ts (neben zeitAcf); die Karte `zeitreihen` bekommt unter „Weitere Wege“ die Lücke l3 „Zweite Reihe“.
 * Sollwerte: scripts/spaeter-f2-erwartet.R → testdaten/spaeter-f2-erwartet.json, Abschnitt `zeitreihen.kreuzkorrelation` (datasets::mdeaths und fdeaths; stats::ccf; eigene Formel gleich ccf auf 2e-16; Handbeispiel von Hand; Lücken wie R na.pass).
 *
 * RICHTUNG (Opus 8, gilt allem vor): Statable definiert r(k) = Korrelation der ERSTEN Reihe zur Zeit t mit der ZWEITEN Reihe zur Zeit t + k, also r(k) = cor(x[t], y[t + k]). Positives k heißt: die erste Reihe liegt vorn
 * (die zweite folgt k Schritte später). R (`stats::ccf(x, y)`) liefert bei k die Korrelation cor(x[t + k], y[t]): UMGEKEHRTES Vorzeichen. Es gilt r_Statable(k) = r_R(−k); die Sollwerte in der JSON sind in R-Richtung (Feld `r_R_Vorzeichen`,
 * Lags −24 … 24), zusätzlich `r_statable_vorzeichen_spss` (= rev(r_R); der Name stammt aus dem Entwurf: der Wert ist die Statable-Richtung; die App sagt NICHT „wie SPSS“, solange kein SPSS-Ausdruck vorliegt).
 * Formel (wie ccf, Nenner n): c(k) = (1/n)·Σ_{t=1}^{n−k}(x_t − x̄)(y_{t+k} − ȳ) für k ≥ 0, c(−k) = (1/n)·Σ_{t}(x_{t+k} − x̄)(y_t − ȳ); r(k) = c(k)/(s_x·s_y), s mit Nenner n. Grenzen ±1,96/√n.
 * Lücken (wie R mit na.action = na.pass): Mittel und Varianz ohne die Lücken (Varianz durch die Zahl gültiger Werte), c(k) = Σ(Paare ohne Lücke)/(Zahl dieser Paare + |k|).
 *
 * SCHNITTSTELLE lib/zeitreihe.ts (neu)
 *   zeitCcf(x: (number | null)[], y: (number | null)[], lagMax: number): { n: number; lags: number[]; r: (number | null)[]; grenze: number; luecken: number; paare: number[] }
 *        lags = −lagMax … lagMax aufsteigend, r gleich lang (Statable-Richtung); grenze = qnorm(,975)/√n (n = Länge der Reihen, wie ccf); luecken = Zahl der Plätze mit fehlendem Wert in x oder y; paare[i] = Zahl der Paare ohne Lücke bei Lag i;
 *        r null, wenn kein Paar da ist. lagMax ganz, 1 ≤ lagMax ≤ n − 1 (sonst auf n − 1 begrenzt).
 *   ccfKann(x: (number | null)[], y: (number | null)[]): { ok: true } | { ok: false; code: 'laenge' | 'zu-kurz' | 'luecken' | 'konstant' }
 *        'laenge': verschieden lang; 'zu-kurz': weniger als 10 Plätze; 'luecken': mehr als 10 % Lücken in einer der beiden; 'konstant': eine Reihe hat nur einen Wert (Varianz 0). Reihenfolge der Prüfungen: laenge, zu-kurz, konstant, luecken.
 *   ccfAutokorrHinweis(r1x: number, r1y: number): boolean        wahr, wenn |r₁| > 0,5 in mindestens einer Reihe (genau 0,5: falsch); Angebot dazu: „Veränderungen statt Werte“ (Assistent C.1)
 *   ccfSaetze(e: ReturnType<typeof zeitCcf>, o: { namen: [string, string]; r1: [number, number] }): string[]        ganze Sätze (de/en): größter Betrag und sein Lag in Worten, bei starker Eigenabhängigkeit der Hinweissatz mit den r₁-Werten
 *   ccfAchsenText(namen: [string, string]): string                 „← ‹zweite› liegt vorn | ‹erste› liegt vorn →“ mit den Spaltennamen
 *   ccfHilfeText(): string                                         Hilfetext: nennt `ccf` in R und das umgekehrte Vorzeichen; sagt NICHT „wie SPSS“ */
s.einst.sprache = 'de'; s.einst.anrede = 'du';
type Z = Record<string, any>;
const C = (ERW as unknown as Z).zeitreihen.kreuzkorrelation as Z;
const X = C.daten.x_werte as number[], Y = C.daten.y_werte as number[];
const nah = (ist: any, soll: number, tol: number, was: string) => { expect(typeof ist, `${was}: Zahl erwartet, ist ${JSON.stringify(ist)}`).toBe('number'); expect(Number.isNaN(ist), `${was}: NaN`).toBe(false); expect(Math.abs(ist - soll), `${was} (ist ${ist}, soll ${soll})`).toBeLessThanOrEqual(tol * Math.max(Math.abs(soll), 1e-3)); };
const gl = (a: (number | null)[], b: number[], tol: number, was: string) => { expect(a.length, `${was}: Länge`).toBe(b.length); a.forEach((v, i) => nah(v, b[i]!, tol, `${was}[${i}]`)); };
const safe = <T,>(f: () => T): T => { try { return f(); } catch { return undefined as T; } };   // fehlt die Funktion, bleiben die Tests einzeln rot (statt dass die Datei gar nicht geladen wird)
const mulberry = (a: number) => () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

describe('mdeaths und fdeaths (72 Monate): Statable-Richtung = umgekehrte R-Richtung', () => {
  const e = safe(() => zeitCcf(X, Y, 24))!;
  it('Grundwerte: n 72, Lags −24 … 24 aufsteigend, Grenze ,230984 (= 1,96/√72), keine Lücken, 49 Werte', () => {
    expect(e.n).toBe(72); expect(e.lags).toEqual(Array.from({ length: 49 }, (_, i) => i - 24)); expect(e.r).toHaveLength(49); nah(e.grenze, C.grenze, 1e-12, 'Grenze'); expect(e.luecken).toBe(0); expect(e.paare[24]).toBe(72); expect(e.paare[0]).toBe(48); expect(e.paare[48]).toBe(48);
  });
  it('r(k) = r_R(−k) auf 1e-12: das ganze Feld (Statable-Richtung) gleich `rev(ccf)` des Sollwerts; bei Lag 0 ,9762', () => {
    const rR = C.r_R_Vorzeichen as number[]; gl(e.r, rR.slice().reverse(), 1e-12, 'r'); gl(e.r, C.r_statable_vorzeichen_spss as number[], 1e-12, 'r (Feld rev)'); nah(e.r[24] as number, 0.9762413, 1e-6, 'Lag 0');
    for (const k of [-12, -6, -3, -2, -1, 1, 2, 3, 6, 12]) nah(e.r[24 + k] as number, rR[24 - k]!, 1e-12, `k = ${k}`);
  });
  it('Zahlenbeispiele der Fachblatt-Tabelle (R-Richtung k_R = −12 … 12 → ,7082 / −,6778 / ,0198 / ,4052 / ,7443 / ,9762 / ,7357 / ,3642 / −,0107 / −,6885 / ,7214): in Statable-Richtung bei −k', () => {
    const soll: Record<number, number> = { [-12]: 0.7082, [-6]: -0.6778, [-3]: 0.0198, [-2]: 0.4052, [-1]: 0.7443, 0: 0.9762, 1: 0.7357, 2: 0.3642, 3: -0.0107, 6: -0.6885, 12: 0.7214 };
    for (const [kR, v] of Object.entries(soll)) expect(Math.round((e.r[24 - Number(kR)] as number) * 1e4) / 1e4, `k_R ${kR}`).toBe(v);
  });
  it('kleineres lagMax liefert denselben Ausschnitt; zu großes wird auf n − 1 begrenzt', () => {
    const k = zeitCcf(X, Y, 6); expect(k.lags).toEqual([-6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6]); gl(k.r, e.r.slice(18, 31) as number[], 1e-15, 'Ausschnitt'); expect(zeitCcf(X, Y, 500).lags.length).toBe(2 * 71 + 1);
  });
  it('nach saisonaler Differenz (Lag 12, n 60): r(0) = ,900, Grenze ,2530', () => {
    const d = C.differenzen_lag12 as Z; const dx = X.slice(12).map((v, i) => v - X[i]!), dy = Y.slice(12).map((v, i) => v - Y[i]!); const z = zeitCcf(dx, dy, 6); expect(z.n).toBe(d.n); nah(z.grenze, d.grenze, 1e-9, 'Grenze'); gl(z.r, (d.r as number[]).slice().reverse(), 1e-12, 'r'); nah(z.r[6] as number, 0.9, 5e-3, 'r(0)');
  });
});

describe('Richtung am Fall y[t] = x[t − 2]: positives Lag heißt „die erste Reihe liegt vorn“ (Opus 8)', () => {
  const rnd = mulberry(20261023), n = 80; const x: number[] = []; let v = 0; for (let t = 0; t < n; t++) { v = 0.5 * v + (rnd() - 0.5) * 2; x.push(v); }
  const y = x.map((_, t) => (t < 2 ? 0.1 : x[t - 2]! + (rnd() - 0.5) * 0.1));
  it('das Maximum liegt bei k = +2 (y folgt x zwei Schritte später); R würde bei −2 liegen: r(k) = r_R(−k)', () => {
    const e = zeitCcf(x, y, 6); const r = e.r as number[]; const kMax = e.lags[r.indexOf(Math.max(...r))]!; expect(kMax).toBe(2); expect(r[e.lags.indexOf(2)]!).toBeGreaterThan(0.9); expect(C.richtung.lag_des_maximums_R).toBe(-2); expect(C.richtung.lag_des_maximums_SPSS_laut_Dokumentation).toBe(2);
  });
  it('vertauscht man die Reihen, wechselt das Vorzeichen des Lags: zeitCcf(y, x)(k) = zeitCcf(x, y)(−k)', () => {
    const a = zeitCcf(x, y, 5), b = zeitCcf(y, x, 5); gl(a.r, (b.r as number[]).slice().reverse(), 1e-12, 'vertauscht');
  });
  it('eine Reihe mit sich selbst: Lag 0 ist 1, symmetrisch', () => { const a = zeitCcf(x, x, 4); nah(a.r[4] as number, 1, 1e-12, 'Lag 0'); gl(a.r, (a.r as number[]).slice().reverse(), 1e-12, 'symmetrisch'); });
});

describe('Handbeispiel (n 6) und Lücken (R na.pass)', () => {
  it('Handbeispiel x = 1, 2, 3, 4, 5, 9; y = 2, 1, 4, 3, 6, 5: Lags −3 … 3 in Statable-Richtung gleich rev(R): ,718 bei 0; Kovarianz bei 0 gleich 3,17', () => {
    const h = C.hand as Z; const e = zeitCcf(h.x, h.y, 3); gl(e.r, (h.r_R as number[]).slice().reverse(), 1e-12, 'Hand'); nah(e.r[3] as number, 0.718, 2e-3, 'Lag 0'); const mx = 24 / 6, my = 21 / 6; const kov = (h.x as number[]).reduce((a, v, i) => a + (v - mx) * (h.y[i] - my), 0) / 6; nah(kov, h.kovarianz_lag0, 1e-12, 'Kovarianz');
  });
  it('x mit Lücken (Plätze 5, 20, 40 fehlen): Summe der Paare/(Paare + |k|), Mittel und Varianz ohne Lücken: gleich R na.pass (Lags −6 … 6, 1e-12); luecken 3; Paare gezählt', () => {
    const L = C.luecken as Z; const xl = X.map((v, i) => ((L.x_mit_luecken_an_stellen as number[]).includes(i + 1) ? null : v)); const e = zeitCcf(xl, Y, 6); gl(e.r, (L.r as number[]).slice().reverse(), 1e-12, 'Lücken'); expect(e.luecken).toBe(3); expect(e.paare[6]).toBe(69);
    expect(Math.abs(e.r[6] as number)).toBeLessThanOrEqual(1.0001); expect(typeof ccfKann(xl, Y).ok).toBe('boolean');
  });
  it('kein Paar ohne Lücke: r null, nie NaN', () => { const a = [1, null, 3, null, 5, null, 7, null, 9, null, 11, null], b = [null, 2, null, 4, null, 6, null, 8, null, 10, null, 12]; const e = zeitCcf(a, b, 1); expect(e.r[1]).toBeNull(); for (const v of e.r) expect(v === null || !Number.isNaN(v)).toBe(true); });
});

describe('Prüfung vor dem Rechnen (ccfKann)', () => {
  const ok = Array.from({ length: 30 }, (_, i) => Math.sin(i / 3));
  it('gut: ok; verschieden lang: „laenge“; unter 10 Plätzen: „zu-kurz“; konstante Reihe: „konstant“ (Satz „alle Werte gleich“)', () => {
    expect(ccfKann(ok, ok)).toEqual({ ok: true }); expect((ccfKann(ok, ok.slice(1)) as Z).code).toBe('laenge'); expect((ccfKann(ok.slice(0, 9), ok.slice(0, 9)) as Z).code).toBe('zu-kurz'); expect((ccfKann(ok, ok.map(() => 3)) as Z).code).toBe('konstant');
  });
  it('Lücken: bis 10 % erlaubt (3 von 30), darüber gesperrt (4 von 30 = 13 %): „luecken“', () => {
    const a = ok.map((v, i) => (i < 3 ? null : v)); expect(ccfKann(a, ok)).toEqual({ ok: true }); const b = ok.map((v, i) => (i < 4 ? null : v)); expect((ccfKann(b, ok) as Z).code).toBe('luecken'); expect((ccfKann(ok, b) as Z).code).toBe('luecken');
  });
});

describe('Hinweis bei Autokorrelation, Sätze, Achse und Hilfe (de und en)', () => {
  it('ccfAutokorrHinweis: ab |r₁| > ,5 in einer der beiden Reihen; mdeaths/fdeaths (,757 und ,730) wahr; ,5 genau falsch; negativ zählt', () => {
    expect(ccfAutokorrHinweis(C.r1_x, C.r1_y)).toBe(true); expect(ccfAutokorrHinweis(0.2, 0.1)).toBe(false); expect(ccfAutokorrHinweis(0.5, 0.5)).toBe(false); expect(ccfAutokorrHinweis(0.2, 0.51)).toBe(true); expect(ccfAutokorrHinweis(-0.6, 0.1)).toBe(true);
  });
  it('Falle Autokorrelation (gemessen, unabhängige AR(1)-Reihen φ ,8, n 100): 33 % der Stäbe draußen roh, 5 % nach ersten Differenzen und nach Vorweißen: Zahlen im Sollwert', () => {
    const f = C.falle_autokorrelation as Z; expect(f.anteil_stäbe_draussen_je_stab.roh).toBeGreaterThan(0.3); expect(f.anteil_stäbe_draussen_je_stab.erste_differenzen).toBeLessThan(0.06); expect(f.anteil_stäbe_draussen_je_stab.vorgeweisst_ar_aic).toBeLessThan(0.06); expect(f.anteil_stäbe_draussen_je_stab.weisses_rauschen_zum_vergleich).toBeLessThan(0.06);
  });
  const e = safe(() => zeitCcf(X, Y, 12))!; const o = { namen: ['Männer', 'Frauen'] as [string, string], r1: [C.r1_x, C.r1_y] as [number, number] };
  it('S-F2 Prüfung H1: Sätze deutsch bei starkem Ausschlag (Lag 0, r = ,98): „Am größten bei Verzögerung 0“, gleichzeitig; Eigenabhängigkeit r₁ = ,76 und ,73 mit „kann Zufall sein“; Angebot Veränderungen (M1: nie allgemein „bei 5 %“)', () => {
    const t = ccfSaetze(e, o).join(' '); for (const re of [/Am größten bei Verzögerung 0/, /r = ,98/, /gleichzeitig/, /r₁ = ,76 und ,73/, /kann Zufall sein/, /Veränderungen statt Werte/, /5 % statt 33 %/]) expect(t).toMatch(re);
    expect(t).not.toMatch(/SPSS|\[prüfen\]|S\. \d|im Takt|bei etwa 5 %/);
  });
  it('H1: Vorlauf-Satz nennt die Reihe mit Spaltennamen (y[t] = x[t − 3]); ohne Hinweis kein „Veränderungen statt Werte“', () => {
    const rnd = mulberry(7), x: number[] = []; let v = 0; for (let t = 0; t < 80; t++) { v = 0.3 * v + (rnd() - 0.5); x.push(v); } const y = x.map((_, t) => (t < 3 ? 0 : x[t - 3]! + (rnd() - 0.5) * 0.05)); const z = zeitCcf(x, y, 8);
    const t = ccfSaetze(z, { namen: ['Werbung', 'Umsatz'], r1: [0.3, 0.3] }).join(' '); expect(t).toMatch(/Am größten bei Verzögerung 3/); expect(t).toMatch(/dass ‚Werbung‘ etwa 3 Schritte vorn liegt/); expect(t).not.toMatch(/Veränderungen statt Werte|nicht erkennbar/);
  });
  it('H1: unabhängige Reihen (größter Stab innerhalb der Grenzen): „Kein Ausschlag liegt außerhalb der Zufallsgrenzen; ein Vorlauf einer Reihe ist nicht erkennbar.“ - kein Vorlauf-Satz', () => {
    let z = zeitCcf([], [], 1); for (let sd = 100; sd < 400; sd++) { const rnd = mulberry(sd), x = Array.from({ length: 60 }, () => rnd() - 0.5), y = Array.from({ length: 60 }, () => rnd() - 0.5); z = zeitCcf(x, y, 8); if (Math.max(...(z.r as number[]).map(Math.abs)) < z.grenze) break; }   // erste feste Startzahl mit Zufallsreihen, deren größter Stab innerhalb der Grenzen liegt
    expect(Math.max(...(z.r as number[]).map(Math.abs))).toBeLessThan(z.grenze);
    const t = ccfSaetze(z, { namen: ['x', 'y'], r1: [0.1, 0.0] }).join(' '); expect(t).toMatch(/Kein Ausschlag liegt außerhalb der Zufallsgrenzen; ein Vorlauf einer Reihe ist nicht erkennbar\./); expect(t).not.toMatch(/Am größten|vorn liegt/);
  });
  it('Sätze englisch', () => { s.einst.sprache = 'en'; try { const t = ccfSaetze(e, o).join(' '); for (const re of [/Largest at lag 0/, /r = \.98/, /simultaneous|at the same time/, /changes instead of values/i, /5% instead of 33%/]) expect(t).toMatch(re); } finally { s.einst.sprache = 'de'; } });
  it('Achsentext: „← Frauen liegt vorn | Männer liegt vorn →“ mit den Spaltennamen; Hilfetext nennt R (`ccf`) und das umgekehrte Vorzeichen, nie „wie SPSS“', () => {
    const a = ccfAchsenText(['Männer', 'Frauen']); expect(a).toContain('Männer'); expect(a).toContain('Frauen'); expect(a).toMatch(/liegt vorn/); expect(a.indexOf('Frauen')).toBeLessThan(a.indexOf('Männer'));
    const h = ccfHilfeText(); expect(h).toMatch(/ccf/); expect(h).toMatch(/umgekehrtem Vorzeichen/); expect(h).not.toMatch(/wie SPSS/); expect(h).not.toMatch(/\[prüfen\]|S\. \d/);
  });
});
