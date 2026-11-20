/* Wächter für „Selbst rechnen“: Jede Lösung wird hier aus den Rohdaten NEU gerechnet (anderer Weg als in rechenaufgaben.ts), die Toleranz muss das auf
 * die gezeigten Stellen gerundete Ergebnis annehmen, jeder Fehlweg muss vom Soll verschieden sein, und jeder Schritt hat Tipp, Warum-Text und Rechenweg in Deutsch und Englisch. */
import { describe, it, expect } from 'vitest';
import { AUFGABEN, aufgabeNach, DATEN_MODELL, DATEN_FREI, DATEN_SIGNAL, DATEN_GRUPPEN, DATEN_RESTE, DATEN_ACHSE, DATEN_ANLEGEN, DATEN_EINFLUSS, DATEN_BEITRAG, DATEN_UEBER, DATEN_FISHER, DATEN_VIF, DATEN_GRENZEN, type Zahl } from './rechenaufgaben';
import { EINHEITEN, PFADE } from './lernplan';
import { pruefe } from './rechnen';
import { sollVV } from './rechenaufgaben-vv.soll';
import { sollSF } from './rechenaufgaben-sf.soll';
import { sollNutzen, sollFehlt } from './rechenaufgaben-nutzen.soll';
import { sollNB } from './rechenaufgaben-nutzen-b.soll';
import { sollPsych, sollFehltPsych } from './rechenaufgaben-psych.soll';

/** Zweiter Weg: kleinste Quadrate mit der Normalgleichung für y = b0 + b1·x (Zwei-Größen-Fall, ausgeschrieben). */
const ols = (x: number[], y: number[]) => {
  const n = x.length, sx = x.reduce((a, b) => a + b, 0), sy = y.reduce((a, b) => a + b, 0);
  const sxx = x.reduce((a, b) => a + b * b, 0), sxy = x.reduce((a, b, i) => a + b * y[i]!, 0);
  const b1 = (n * sxy - sx * sy) / (n * sxx - sx * sx);
  return { b0: (sy - b1 * sx) / n, b1 };
};
/** Zweiter Weg für die Quadratsumme: Summe der Quadrate minus n mal Mittelwert zum Quadrat. */
const qs = (x: number[]) => { const n = x.length, m = x.reduce((a, b) => a + b, 0) / n; return x.reduce((a, b) => a + b * b, 0) - n * m * m; };
/** Wie im Projekt bei Dezimalkomma: Komma statt Punkt. */
const z: Zahl = (x, st) => x.toFixed(st ?? (Number.isInteger(x) ? 0 : 2)).replace('.', ',');

const soll = (id: string): Record<string, number> | undefined => {
  const neu = sollVV(id) ?? sollSF(id) ?? sollNutzen(id) ?? sollNB(id) ?? sollPsych(id);
  if (neu) return neu;
  // Stufe 4 „nutzen“ (Paket b): Die Sollwerte rechnet ein Prüfer in R (docs/nutzen/RECHENAUFGABEN-NUTZEN-B-AUFTRAG.md). Bis sie in
  // lib/testdaten/ueben-erwartet-nutzen-b.json stehen, ist das eine bekannte Lücke: Nachrechnung offen, alle übrigen Prüfungen laufen.
  if (id.startsWith('nb-') || id.startsWith('ps-')) return undefined;   // ps-: Psychologie (Stufe 6.3), Sollwerte in ueben-erwartet-psych-rechnen.json noch offen (docs/nutzen/RECHENAUFGABEN-PSYCH-AUFTRAG.md)
  if (id === 'modell-fehler') {
    const x = DATEN_MODELL.stunden, m = x.reduce((a, b) => a + b, 0) / x.length;
    return { mittel: m, abweichung: 2 - m, 'summe-abw': x.reduce((a, b) => a + (b - m), 0), quadratsumme: qs(x) };
  }
  if (id === 'freiheitsgrade') {
    const g = DATEN_FREI.gewichte;
    return { letzter: 20 * 4 - (g[0]! + g[1]! + g[2]!), frei: 4 - 1, qs: qs(g), varianz: qs(g) / 3 };
  }
  if (id === 'signal-rauschen') {
    const { a, b } = DATEN_SIGNAL, se = (n: number) => Math.sqrt(a.s * a.s / n + b.s * b.s / n);
    return { effekt: a.m - b.m, se: se(10), t: (a.m - b.m) / se(10), 't-mehr': (a.m - b.m) / se(40) };
  }
  if (id === 'gruppen-regression') {
    const { gruppe, punkte } = DATEN_GRUPPEN, f = ols(gruppe, punkte);
    return { b0: f.b0, b1: f.b1, vorher: f.b0 + f.b1, rest: punkte[5]! - (f.b0 + f.b1 * gruppe[5]!) };
  }
  if (id === 'annahmen-reste') {
    const { x, y } = DATEN_RESTE, f = ols(x, y), r = x.map((v, i) => y[i]! - (f.b0 + f.b1 * v));
    return { vorher: f.b0 + f.b1 * 2, rest2: r[1]!, rest5: r[4]!, positiv: r.filter(v => v > 1e-9).length };
  }
  if (id === 'achse-prozent') {
    const { a, b, start } = DATEN_ACHSE;
    return { echt: (b / a - 1) * 100, 'hoehe-a': a - start, 'hoehe-b': b - start, bild: ((b - start) / (a - start) - 1) * 100 };
  }
  if (id === 'lang-form') {
    const { personen, zeitpunkte, fehlend } = DATEN_ANLEGEN;
    return { 'zeilen-lang': personen * zeitpunkte, 'spalten-breit': 1 + zeitpunkte, 'spalten-lang': 3, 'mit-wert': personen * zeitpunkte - fehlend };
  }
  if (id === 'einfluss-faelle') {
    // zweiter Weg: Matrixform. Hebel = Diagonale von X (X'X)^-1 X', Rest aus der Normalgleichung, Cook über den standardisierten Rest
    const { x, y, rss } = DATEN_EINFLUSS, n = x.length;
    const f = ols(x, y), e = x.map((v, i) => y[i]! - f.b0 - f.b1 * v);
    const sxx = x.reduce((a, v) => a + v * v, 0), sx = x.reduce((a, v) => a + v, 0), det = n * sxx - sx * sx;
    const h = x.map(v => (sxx - 2 * sx * v + n * v * v) / det);   // [1 v] (X'X)^-1 [1 v]'
    const s2 = e.reduce((a, v) => a + v * v, 0) / (n - 2), rstd = e[6]! / Math.sqrt(s2 * (1 - h[6]!));
    const rstud = rstd * Math.sqrt((n - 3) / (n - 2 - rstd * rstd));   // Beziehung zwischen standardisiertem und studentisiertem Residuum
    expect(e.reduce((a, v) => a + v * v, 0)).toBeCloseTo(rss, 9);
    return { hebel: h[6]!, rest: e[6]!, student: rstud, cook: (rstd * rstd * h[6]!) / (2 * (1 - h[6]!)) };
  }
  if (id === 'beitrag-sr2') {
    // zweiter Weg: über die quadrierte Partialkorrelation t² : (t² + df), die sich auf die Streuung bezieht, die die andere Größe übrig lässt (1 − R² + sr²)
    const { n, k, r2, tA, tB } = DATEN_BEITRAG, df = n - k - 1, partial = (t: number) => t * t / (t * t + df);
    const sr = (t: number) => (partial(t) * (1 - r2)) / (1 - partial(t));   // aus partial r² = sr² : (1 − R² + sr²) nach sr² aufgelöst: anderer Weg als t²(1 − R²)/df
    return { df, 'sr-a': sr(tA), 'sr-b': sr(tB), gemeinsam: r2 - sr(tA) - sr(tB) };
  }
  if (id === 'ueberanpassung-r2') {
    // zweiter Weg: korrigiertes R² als 1 − (SS_Rest/(n−k−1)) / (SS_gesamt/(n−1)) mit SS_gesamt = 1 und SS_Rest = 1 − R²
    const { n, a, b } = DATEN_UEBER, adj = (m: { k: number; r2: number }) => 1 - ((1 - m.r2) / (n - m.k - 1)) / (1 / (n - 1));
    return { 'adj-a': adj(a), 'adj-b': adj(b), abzug: b.r2 - adj(b), 'je-groesse': n / b.k };
  }
  if (id === 'fisher-z-vergleich') {
    // zweiter Weg: Fisher-z über artanh mit der Reihe z = r + r³/3 + r⁵/5 + … (bricht nach 400 Gliedern ab), Z aus Varianzen 1/(n − 3)
    const { r1, n1, r2, n2 } = DATEN_FISHER, reihe = (r: number) => { let z = 0; for (let j = 0; j < 400; j++) z += r ** (2 * j + 1) / (2 * j + 1); return z; };
    const se = Math.sqrt(1 / (n1 - 3) + 1 / (n2 - 3));
    return { z1: reihe(r1), z2: reihe(r2), se, zwert: (reihe(r1) - reihe(r2)) / se };
  }
  if (id === 'vif-rechnen') {
    // zweiter Weg: VIF als Diagonale der inversen Korrelationsmatrix; bei zwei Größen mit r² gleich R² ist das 1/(1 − r²), hier über die Kehrwert-Rechnung ohne Toleranz
    const r = DATEN_VIF.r2, vif = (q: number) => (1 / (1 - q));
    const inv2 = (q: number) => { const rr = Math.sqrt(q); return [[1, rr], [rr, 1]].map((row, i) => row[i]! / (1 - rr * rr))[0]!; };   // inverse 2×2-Korrelationsmatrix, Diagonale
    expect(inv2(r[2]!)).toBeCloseTo(vif(r[2]!), 9);
    return { toleranz: 1 - r[1]!, 'vif-m': inv2(r[2]!), 'vif-s': inv2(r[3]!), 'faktor-se': Math.sqrt(inv2(r[2]!)) };
  }
  if (id === 'ausreisser-grenzen') {
    const { n, k, faelle } = DATEN_GRENZEN, gh = (2 * (k + 1)) / n, gc = 4 / n;
    return { 'grenze-hebel': gh, 'grenze-cook': gc, 'zahl-hebel': faelle.filter(f => f.h > gh).length, beide: faelle.filter(f => f.h > gh && f.c > gc).length };
  }
  throw new Error(`keine Nachrechnung für ${id}`);
};

describe('Rechenaufgaben: Lösungen aus den Daten nachgerechnet', () => {
  it('es gibt die dreizehn Aufgaben der ersten Lernwege (dazu die der Stufe 3), jede Kennung einmal', () => {
    const ids = AUFGABEN.map(a => a.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual(expect.arrayContaining(['achse-prozent', 'annahmen-reste', 'ausreisser-grenzen', 'beitrag-sr2', 'einfluss-faelle', 'fisher-z-vergleich', 'freiheitsgrade', 'gruppen-regression', 'lang-form', 'modell-fehler', 'signal-rauschen', 'ueberanpassung-r2', 'vif-rechnen']));
    expect(aufgabeNach('modell-fehler')).toBeTruthy();
  });
  for (const a of AUFGABEN) {
    it(`${a.id}: Soll jedes Schritts stimmt mit der Nachrechnung`, () => {
      if (sollFehlt(a.id) || sollFehltPsych(a.id)) return;   // bekannte Lücke: R-Sollwert der Stufe 4 „nutzen“ steht noch aus (docs/nutzen/RECHENAUFGABEN-NUTZEN-AUFTRAG.md)
      const erw = soll(a.id);
      if (!erw) { expect(a.id.startsWith('nb-'), `${a.id}: Sollwerte fehlen`).toBe(true); return; }
      expect(a.schritte.map(s => s.id).sort(), a.id).toEqual(Object.keys(erw).sort());
      for (const s of a.schritte) expect(s.soll, `${a.id}/${s.id}`).toBeCloseTo(erw[s.id]!, 9);
    });
    it(`${a.id}: zwei bis vier Schritte, Tabelle mit 4 bis 16 Werten und Überschriften`, () => {
      expect(a.schritte.length).toBeGreaterThanOrEqual(2); expect(a.schritte.length).toBeLessThanOrEqual(4);
      expect(a.tabelle.kopf.length).toBeGreaterThan(1);
      const werte = a.tabelle.zeilen.flatMap(r => r.slice(1)).length;
      expect(werte, a.id).toBeGreaterThanOrEqual(4); expect(werte, a.id).toBeLessThanOrEqual(16);
      for (const r of a.tabelle.zeilen) expect(r.length, a.id).toBe(a.tabelle.kopf.length);
    });
    it(`${a.id}: Toleranz nimmt das gerundete Ergebnis an, Fehlwege weichen ab und werden erkannt`, () => {
      for (const s of a.schritte) {
        const gerundet = s.soll.toFixed(s.stellen);
        expect(pruefe(gerundet, s).art, `${a.id}/${s.id} gerundet ${gerundet}`).toBe('richtig');
        expect(pruefe(gerundet.replace('.', ','), s).art, `${a.id}/${s.id} mit Komma`).toBe('richtig');
        expect(pruefe(String(s.soll + 10 * Math.max(s.toleranz, 0.1)), s).art, `${a.id}/${s.id} weit daneben`).toBe('falsch');
        s.fehler.forEach((f, i) => {
          expect(Math.abs(f.wert - s.soll), `${a.id}/${s.id}: Fehlweg ${i} gleicht dem Soll`).toBeGreaterThan(s.toleranz);
          expect(pruefe(String(f.wert.toFixed(4)), s), `${a.id}/${s.id}: Fehlweg ${i}`).toMatchObject({ art: 'falsch', fehler: i });
        });
      }
    });
    it(`${a.id}: Texte in Deutsch und Englisch, Tipp, Warum, Rechenweg mit Zwischenschritten, kein langer Strich`, () => {
      const texte = [a.lage, a.merke, a.ausprobieren, a.tabelle.titel, ...a.tabelle.kopf];
      for (const s of a.schritte) {
        texte.push(s.frage, s.warum, s.tipp, ...s.fehler.map(f => f.tipp), ...s.weg(z));
        expect(s.weg(z).length, `${a.id}/${s.id}`).toBeGreaterThan(0);
        expect(s.warum.de.length, `${a.id}/${s.id}`).toBeGreaterThan(80);
      }
      for (const p of texte) {
        expect(p.de.trim().length).toBeGreaterThan(1); expect(p.en.trim().length).toBeGreaterThan(1);
        expect(p.de + p.en).not.toMatch(/[–—]/);
        expect(p.de).not.toMatch(/\d\.\d/);
        expect(p.k, `${p.en}: Sprachschlüssel fehlt`).toBeTruthy();
      }
    });
    it(`${a.id}: der Rechenweg nennt das Ergebnis`, () => {
      for (const s of a.schritte) {
        const weg = s.weg(z).map(p => p.de).join(' | '), soll = z(s.soll, s.soll % 1 === 0 ? 0 : s.stellen);
        expect(weg, `${a.id}/${s.id}`).toContain(soll);
      }
    });
  }
  it('jede Rechenaufgabe steht in genau einer Einheit des Lernplans (und jede Einheit nennt nur vorhandene)', () => {
    const ids = new Set(AUFGABEN.map(a => a.id));
    const benutzt = EINHEITEN.flatMap(e => e.rechnen ?? []);
    for (const r of benutzt) expect(ids.has(r), r).toBe(true);
    for (const id of ids) expect(benutzt.filter(r => r === id), id).toHaveLength(1);
    for (const e of EINHEITEN.filter(x => x.rechnen)) expect(e.rechnen!.length, e.id).toBeGreaterThan(0);
    expect(PFADE.length).toBeGreaterThan(0);
  });
});
