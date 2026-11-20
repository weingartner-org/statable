import { describe, expect, it } from 'vitest';
import ERW from './testdaten/spaeter-f-erwartet.json';
import { s } from './sitzung.svelte';
import { rateExakt, smrRechnen, ratenRechnen, PERSONENZEIT_FAKTOREN } from './raten';
import { ratenSaetze, ratenRisikoSatz, ratenUeberdispersionSatz } from './ratensaetze';

/* ===== Später, Welle S-F, Teil 3: Raten (M4) - Rechner „Aus Kennzahlen rechnen“ im Reiter „Verstehen“ (Fachblatt SPAETER-F Abschnitt 3 und „Entscheidungen Opus (18.10.)“ 4 gehen vor) =====
 * ROTE TESTS des Sollwert-Prüfers. Der Bauer B darf diese Datei und die JSON nicht ändern. Sollwerte: scripts/spaeter-f-erwartet.R (Abschnitt raten), jeder Wert auf zwei Wegen:
 * stats::poisson.test, Garwood über qchisq, Wurzelsuche über ppois (tol 1e-14), Ratenverhältnis über binom.test-Umrechnung und Poisson-Regression mit Offset; gedruckt (ISwR / ?poisson.test):
 * 137 beobachtete Lungenkrebstote bei 24,19893 erwarteten: 5,661407 [4,753125; 6,692709].
 * FESTGELEGT (Opus 4): NUR der Rechner (keine Option in der Karte kaplanmeier, also kein Gewichts-Schlüssel); Rate je Gruppe mit EXAKTEM Poisson-Intervall nach Garwood, Ratenverhältnis EXAKT bedingt (wie poisson.test),
 * Ratendifferenz mit Wald-Intervall; Einheit der Zeit wählbar, Maßstab „je 1000 Personenjahre“; ein fester Satz warnt vor Überdispersion und verweist auf die Zähldaten-Regression; kein Rogan-Gladen.
 * Rechnung in JS (kein R, kein PSPP); Chi-Quadrat-Quantile aus lib/verteilung.ts. Das Verhältnis der Gruppe i gegen die Vergleichsgruppe ist (x_i/T_i)/(x_v/T_v).
 *
 * SCHNITTSTELLE lib/raten.ts
 *   PERSONENZEIT_FAKTOREN = { tage: 365.25, wochen: 52.1775, monate: 12, jahre: 1 }       Zeiteinheiten je Personenjahr (Personenjahre = Zeit / Faktor)
 *   rateExakt(x: number, personenjahre: number, niveau = 0.95): { rate: number; unten: number; oben: number }
 *      Garwood: unten = χ²(α/2; 2x)/(2T) (0 bei x = 0), oben = χ²(1 - α/2; 2x + 2)/(2T); alle Werte je Personenjahr (nicht skaliert). Sehr große x (2e6) bleiben genau (1e-8).
 *   smrRechnen(beobachtet: number, erwartet: number, niveau = 0.95): { verhaeltnis; unten; oben; p }       Vergleich mit einer Erwartung: poisson.test(beobachtet, erwartet); p zweiseitig
 *   ratenRechnen(e: { gruppen: { name: string; ereignisse: number; zeit: number }[]; einheit: 'tage' | 'wochen' | 'monate' | 'jahre'; je?: number (Voreinstellung 1000); vergleich?: number (Index, Voreinstellung 0); niveau?: number (0,95) }):
 *        { ok: true; je: number; einheit: string; gruppen: { name; ereignisse; personenjahre; rate; unten; oben }[]; vergleiche: Vergleich[]; hinweise: string[] } | { ok: false; code: 'gruppen' | 'zeit' | 'ereignisse' | 'einheit' | 'vergleich' | 'je'; gruppe?: number }
 *      gruppen: rate, unten, oben JE `je` PERSONENJAHRE (Garwood). vergleiche: eines für jede Gruppe außer der Vergleichsgruppe, in der Reihenfolge der Gruppen:
 *        Vergleich = { gruppe: number; gegen: number; rr: number | null; unten: number | null; oben: number | null; p: number | null; diff: number; diffUnten: number; diffOben: number; hinweis?: 'nenner-null' }
 *        rr/unten/oben = exaktes bedingtes Verhältnis (unskaliert); p zweiseitig exakt (poisson.test); diff = Rate_i - Rate_vergleich JE `je` Personenjahre, mit Wald-Intervall ± z·√(x_i/T_i² + x_v/T_v²) (z = Normalquantil 0,975, skaliert mit je).
 *        Ist x der Vergleichsgruppe 0: rr, unten, oben = null, hinweis 'nenner-null' (das Verhältnis ist nicht definiert), p bleibt die exakte Zahl, diff bleibt berechnet. Ist x der Gruppe 0: rr = 0, unten = 0, oben = die exakte Obergrenze.
 *      hinweise (Codes): 'mehrere-vergleiche' bei mehr als zwei Gruppen (kein Ausgleich für mehrere Tests); sonst leer. Fehler: 0 oder mehr als 12 Gruppen 'gruppen'; Zeit <= 0 oder nicht endlich 'zeit' (gruppe = Index);
 *        Ereignisse nicht ganzzahlig, negativ oder nicht endlich 'ereignisse' (gruppe); unbekannte Einheit 'einheit'; Vergleichsgruppe außerhalb 'vergleich'; je <= 0 'je'. Die Funktionen werfen nie, es gibt nie NaN.
 * SCHNITTSTELLE lib/ratensaetze.ts (deutsch, du; Zahlenformat über das Profil, p ohne Null)
 *   ratenSaetze(e: RatenErgebnis): string[]       ganze Sätze: je Gruppe „In der Gruppe A traten 11 Ereignisse in 800 Personenjahren auf: 13,8 je 1000 Personenjahre (exaktes 95-%-Intervall 6,9 bis 24,6).“;
 *        je Vergleich „Das Ratenverhältnis (A gegen B) betrug 1,97 (exaktes 95-%-Intervall 0,86 bis 4,28; p = ,080). Die Differenz betrug 6,8 je 1000 Personenjahre (Näherung: −1,9 bis 15,4).“ (bei nenner-null ein Satz,
 *        dass das Verhältnis nicht definiert ist); am Ende IMMER ratenRisikoSatz() und ratenUeberdispersionSatz()
 *   ratenRisikoSatz(): string                    eine Rate ist ein Ereignis je Personenzeit, kein Risiko (nicht der Anteil, der das Ereignis hatte)
 *   ratenUeberdispersionSatz(): string           die Rechnung setzt Poisson-Streuung voraus; ist die Streuung größer, ist das Intervall zu schmal; verweist auf die Zähl-Regression (negativ-binomial) */
s.einst.sprache = 'de'; s.einst.anrede = 'du';
type Z = Record<string, any>;
const R = (ERW as unknown as Z).raten as Z;
const nah = (ist: any, soll: number, tol: number, was: string) => {
  expect(typeof ist, `${was}: Zahl erwartet, ist ${JSON.stringify(ist)}`).toBe('number'); expect(Number.isNaN(ist), `${was}: NaN`).toBe(false);
  expect(Math.abs(ist - soll), `${was} (ist ${ist}, soll ${soll})`).toBeLessThanOrEqual(tol * Math.max(Math.abs(soll), 1e-300));
};
const pNah = (ist: any, soll: number, was: string) => { expect(typeof ist, `${was}: Zahl erwartet`).toBe('number'); expect(Math.abs(Math.log(ist / soll)), `${was} (ist ${ist}, soll ${soll})`).toBeLessThan(1e-6); };
const keinNaN = (x: unknown, pfad = ''): void => {
  if (typeof x === 'number') expect(Number.isNaN(x), `NaN bei ${pfad}`).toBe(false);
  else if (Array.isArray(x)) x.forEach((v, i) => keinNaN(v, `${pfad}[${i}]`));
  else if (x && typeof x === 'object') for (const [k, v] of Object.entries(x)) keinNaN(v, `${pfad}.${k}`);
};
const ok = (e: any) => { expect(e.ok, `Fehler: ${JSON.stringify(e)}`).toBe(true); return e; };
const Z975 = 1.959963984540054;

describe('Rate mit exaktem Intervall (Garwood): gleich poisson.test, Chi-Quadrat-Form und Wurzelsuche (Skript, 1e-9)', () => {
  it('kleine Fälle: x = 0 bei T = 100 → [0; 0,03688879] (= −ln(0,025)/T); x = 1 bei T = 10; x = 7 bei T = 3,5', () => {
    for (const k of R.klein as Z[]) { const e = rateExakt(k.frage.ereignisse, k.frage.personenjahre); nah(e.rate, k.soll.rate, 1e-12, 'Rate'); nah(e.unten, k.soll.unten, 1e-9, 'unten'); nah(e.oben, k.soll.oben, 1e-9, 'oben'); }
    expect(rateExakt(0, 100).unten).toBe(0); nah(rateExakt(0, 100).oben, -Math.log(0.025) / 100, 1e-12, 'x = 0: Obergrenze −ln(α/2)/T'); nah(rateExakt(0, 100).oben, 0.03688879, 1e-6, 'x = 0 gedruckt (Fachblatt)');
  });
  it('sehr großes x (2 Millionen Ereignisse): die Chi-Quadrat-Quantile bleiben genau (1e-8), Intervall um die Rate 20', () => {
    const g = R.gross; const e = rateExakt(g.frage.ereignisse, g.frage.personenjahre); nah(e.rate, 20, 1e-14, 'Rate'); nah(e.unten, g.soll.unten, 1e-8, 'unten'); nah(e.oben, g.soll.oben, 1e-8, 'oben'); expect(e.unten).toBeLessThan(20); expect(e.oben).toBeGreaterThan(20);
  });
  it('anderes Niveau (90 %) ist enger als 95 %; Rand: x = 0 und Niveau 0,99 → obere Grenze −ln(0,005)/T', () => {
    const a = rateExakt(11, 800), b = rateExakt(11, 800, 0.9); expect(b.unten).toBeGreaterThan(a.unten); expect(b.oben).toBeLessThan(a.oben); nah(rateExakt(0, 50, 0.99).oben, -Math.log(0.005) / 50, 1e-12, '99 %');
  });
});

describe('Vergleich mit einer Erwartung (SMR, gedruckt in ?poisson.test: walisische Nickelarbeiter)', () => {
  it('137 beobachtet, 24,19893 erwartet: 5,661407 [4,753125; 6,692709], p = 2,8e-56', () => {
    const r = smrRechnen(R.smr.frage.beobachtet, R.smr.frage.erwartet); nah(r.verhaeltnis, 5.661407, 1e-6, 'Verhältnis (gedruckt)'); nah(r.unten, 4.753125, 1e-6, 'unten (gedruckt)'); nah(r.oben, 6.692709, 1e-6, 'oben (gedruckt)');
    nah(r.verhaeltnis, R.smr.soll.verhaeltnis, 1e-12, 'Verhältnis'); nah(r.unten, R.smr.soll.unten, 1e-9, 'unten'); nah(r.oben, R.smr.soll.oben, 1e-9, 'oben'); pNah(r.p, R.smr.soll.p, 'p');
  });
  it('Rand: 0 beobachtet gibt Verhältnis 0 mit Obergrenze; Erwartung <= 0 gibt keine Zahl-Unsinn (Fehler statt NaN)', () => {
    const r = smrRechnen(0, 5); expect(r.verhaeltnis).toBe(0); expect(r.unten).toBe(0); expect(r.oben).toBeGreaterThan(0); keinNaN(r);
    const f = smrRechnen(3, 0) as Z; keinNaN(f); expect(f.ok === false || f.verhaeltnis === null || f.verhaeltnis === undefined || Number.isFinite(f.verhaeltnis)).toBe(true);
  });
});

describe('Rate und Vergleich je Gruppe: Fredericia gegen die übrigen drei Städte (ISwR, ?poisson.test), lung nach Geschlecht, drei Gruppen', () => {
  const je = 1000;
  const pruefe = (name: string, f: Z) => {
    const e = ok(ratenRechnen(f.frage)); const soll = f.soll as Z; expect(e.gruppen.length).toBe(soll.gruppen.length);
    soll.gruppen.forEach((g: Z, i: number) => { const x = e.gruppen[i]; nah(x.personenjahre, g.personenjahre, 1e-12, `${name} Gruppe ${i} Personenjahre`); nah(x.rate, g.rate * je, 1e-9, `${name} Gruppe ${i} Rate`); nah(x.unten, g.unten * je, 1e-9, `${name} Gruppe ${i} unten`); nah(x.oben, g.oben * je, 1e-9, `${name} Gruppe ${i} oben`); expect(x.ereignisse).toBe(g.ereignisse); expect(x.name).toBe(f.frage.gruppen[i].name); });
    expect(e.vergleiche.length).toBe(soll.vergleiche.length);
    soll.vergleiche.forEach((v: Z, i: number) => { const x = e.vergleiche[i]; expect([x.gruppe, x.gegen]).toEqual([v.gruppe, v.gegen]); nah(x.rr, v.rr, 1e-9, `${name} RR`); nah(x.unten, v.unten, 1e-9, `${name} RR unten`); nah(x.oben, v.oben, 1e-9, `${name} RR oben`); pNah(x.p, v.p, `${name} p`);
      nah(x.diff, v.diff * je, 1e-9, `${name} Differenz`); nah(x.diffUnten, v.diffUnten * je, 1e-9, `${name} Differenz unten`); nah(x.diffOben, v.diffOben * je, 1e-9, `${name} Differenz oben`); if (x.rr > 0) expect(x.unten).toBeLessThan(x.rr); expect(x.oben).toBeGreaterThan(x.rr); });
    keinNaN(e, name); return e;
  };
  it('Fredericia (11 in 800 Personenjahren) gegen übrige (21 in 3011): je 1000 13,75 [6,86; 24,60]; RR 1,971488 exakt [0,858426; 4,277266], p = ,07967; Differenz 6,78 [−1,88; 15,43]', () => {
    const e = pruefe('Fredericia', R.fredericia); const g = e.gruppen[0]; nah(g.rate, 13.75, 1e-9, 'Rate gedruckt'); nah(g.unten, 6.864, 1e-3, 'unten gedruckt'); nah(g.oben, 24.603, 1e-3, 'oben gedruckt');
    const v = e.vergleiche[0]; nah(v.rr, 1.971488, 1e-6, 'RR gedruckt'); nah(v.unten, 0.858426, 1e-6, 'RR unten gedruckt'); nah(v.oben, 4.277266, 1e-6, 'RR oben gedruckt'); nah(v.p, 0.07966863, 1e-6, 'p gedruckt'); nah(v.diff, 6.776, 5e-4, 'Differenz gedruckt');
    expect(e.hinweise).toEqual([]);
  });
  it('lung aus Zeit in TAGEN und Ereignis: Männer 112 Ereignisse, Frauen 53; Frauen gegen Männer RR 0,606289 [0,428773; 0,847886], p = ,00276; die Einheit „tage“ rechnet durch 365,25', () => {
    const e = pruefe('lung', R.lung); const v = e.vergleiche[0]; expect([v.gruppe, v.gegen]).toEqual([1, 0]); nah(v.rr, 0.606289, 2e-3, 'RR gedruckt'); nah(v.unten, 0.428773, 2e-3, 'unten gedruckt'); nah(v.oben, 0.847886, 2e-3, 'oben gedruckt');
    nah(e.gruppen[0].rate, 1046.615, 1e-6, 'Männer je 1000 Personenjahre'); nah(e.gruppen[1].rate, 634.551, 1e-6, 'Frauen je 1000 Personenjahre');
  });
  it('drei Gruppen: jede Gruppe gegen die erste (Vergleichsgruppe), exakt; der Hinweis „mehrere-vergleiche“ (kein Ausgleich für mehrere Tests)', () => { const e = pruefe('drei', R.drei); expect(e.vergleiche.map((v: Z) => [v.gruppe, v.gegen])).toEqual([[1, 0], [2, 0]]); expect(e.hinweise).toContain('mehrere-vergleiche'); });
  it('Vergleichsgruppe wählbar: die letzte Gruppe als Vergleich gibt Vergleiche 0-2 und 1-2', () => {
    const e = ok(ratenRechnen({ ...R.drei.frage, vergleich: 2 })); expect(e.vergleiche.map((v: Z) => [v.gruppe, v.gegen])).toEqual([[0, 2], [1, 2]]);
    const sol = R.drei.soll.gruppen; nah(e.vergleiche[0].rr, (sol[0].ereignisse / sol[0].personenjahre) / (sol[2].ereignisse / sol[2].personenjahre), 1e-12, 'RR 0 gegen 2');
  });
  it('Tauschen der Gruppen kehrt das Verhältnis um: 1/RR, Grenzen 1/oben und 1/unten, gleiches p (Clopper-Pearson ist symmetrisch)', () => {
    const a = ok(ratenRechnen(R.fredericia.frage)).vergleiche[0], b = ok(ratenRechnen({ ...R.fredericia.frage, vergleich: 0 })).vergleiche[0];
    expect([b.gruppe, b.gegen]).toEqual([1, 0]); nah(b.rr, 1 / a.rr, 1e-12, 'RR'); nah(b.unten, 1 / a.oben, 1e-9, 'unten'); nah(b.oben, 1 / a.unten, 1e-9, 'oben'); nah(b.p, a.p, 1e-9, 'p'); nah(b.diff, -a.diff, 1e-12, 'Differenz');
  });
  it('ohne Ereignis in der Gruppe (x = 0): Rate 0, Intervall [0; Obergrenze], Verhältnis 0 mit Intervall von 0 bis zur exakten Obergrenze, p aus poisson.test', () => {
    const e = pruefe('x1 = 0', R.x1_null); expect(e.gruppen[0].rate).toBe(0); expect(e.gruppen[0].unten).toBe(0); expect(e.vergleiche[0].rr).toBe(0); expect(e.vergleiche[0].unten).toBe(0);
  });
  it('ohne Ereignis in der Vergleichsgruppe (x = 0): das Verhältnis ist nicht definiert (rr, unten, oben = null, Hinweis „nenner-null“), p bleibt die exakte Zahl, die Differenz ist berechnet', () => {
    const f = R.x2_null; const e = ok(ratenRechnen(f.frage)); const v = e.vergleiche[0];
    expect([v.rr, v.unten, v.oben, v.hinweis]).toEqual([null, null, null, 'nenner-null']); pNah(v.p, f.soll.pExaktX2Null, 'p'); keinNaN(e);
    const x1 = 8, T1 = 60, x2 = 0, T2 = 50, se = Math.sqrt(x1 / T1 ** 2 + x2 / T2 ** 2); nah(v.diff, ((x1 / T1) - (x2 / T2)) * 1000, 1e-12, 'Differenz'); nah(v.diffUnten, ((x1 / T1) - (x2 / T2) - Z975 * se) * 1000, 1e-9, 'Differenz unten');
  });
  it('eine einzige Gruppe: nur die Rate, keine Vergleiche, keine Hinweise', () => { const e = ok(ratenRechnen({ gruppen: [{ name: 'A', ereignisse: 11, zeit: 800 }], einheit: 'jahre' })); expect(e.vergleiche).toEqual([]); expect(e.hinweise).toEqual([]); expect(e.je).toBe(1000); });
});

describe('Einheit der Zeit: Tage, Wochen, Monate, Jahre rechnen auf Personenjahre um; Statable rät die Einheit nie', () => {
  it('die Faktoren: Tage 365,25 · Wochen 52,1775 · Monate 12 · Jahre 1', () => { expect(PERSONENZEIT_FAKTOREN).toEqual({ tage: R.einheiten.jahre_je.tage, wochen: R.einheiten.jahre_je.wochen, monate: R.einheiten.jahre_je.monate, jahre: R.einheiten.jahre_je.jahre }); expect(PERSONENZEIT_FAKTOREN.tage).toBe(365.25); });
  it('dieselben 800 Personenjahre in vier Einheiten eingegeben (800 · Faktor): gleiche Rate, gleiches Intervall, gleiches Verhältnis', () => {
    const f = R.fredericia.frage; const basis = ok(ratenRechnen(f));
    for (const einheit of ['tage', 'wochen', 'monate', 'jahre'] as const) {
      const g = f.gruppen.map((x: Z) => ({ ...x, zeit: x.zeit * PERSONENZEIT_FAKTOREN[einheit] })); const e = ok(ratenRechnen({ ...f, gruppen: g, einheit }));
      nah(e.gruppen[0].rate, basis.gruppen[0].rate, 1e-12, `${einheit} Rate`); nah(e.gruppen[0].oben, basis.gruppen[0].oben, 1e-12, `${einheit} oben`); nah(e.vergleiche[0].rr, basis.vergleiche[0].rr, 1e-12, `${einheit} RR`); nah(e.gruppen[0].personenjahre, 800, 1e-12, `${einheit} Personenjahre`);
    }
  });
  it('anderer Maßstab: je 100 000 Personenjahre vervielfacht Raten, Grenzen und Differenz um 100, das Verhältnis bleibt', () => {
    const a = ok(ratenRechnen(R.fredericia.frage)), b = ok(ratenRechnen({ ...R.fredericia.frage, je: 100000 })); nah(b.gruppen[0].rate, a.gruppen[0].rate * 100, 1e-12, 'Rate'); nah(b.vergleiche[0].diff, a.vergleiche[0].diff * 100, 1e-12, 'Differenz'); nah(b.vergleiche[0].rr, a.vergleiche[0].rr, 1e-14, 'RR'); expect(b.je).toBe(100000);
  });
});

describe('Ränder: Fehler statt Absturz, nie NaN', () => {
  const g = (x: number, T: number) => ({ name: 'A', ereignisse: x, zeit: T });
  it('Zeit 0, negativ, nicht endlich: code „zeit“ mit Index der Gruppe', () => {
    for (const T of [0, -5, NaN, Infinity]) expect(ratenRechnen({ gruppen: [g(5, 10), g(3, T)], einheit: 'jahre' }), `T = ${T}`).toEqual({ ok: false, code: 'zeit', gruppe: 1 });
  });
  it('Ereignisse nicht ganzzahlig, negativ oder nicht endlich: code „ereignisse“; die Personenzeit darf eine Dezimalzahl sein', () => {
    for (const x of [2.5, -1, NaN]) expect(ratenRechnen({ gruppen: [g(x, 10), g(3, 10)], einheit: 'jahre' }), `x = ${x}`).toEqual({ ok: false, code: 'ereignisse', gruppe: 0 });
    ok(ratenRechnen({ gruppen: [g(2, 10.5), g(3, 10.25)], einheit: 'jahre' }));
  });
  it('keine Gruppe, mehr als 12 Gruppen, unbekannte Einheit, Vergleichsgruppe außerhalb, Maßstab <= 0', () => {
    expect((ratenRechnen({ gruppen: [], einheit: 'jahre' }) as Z).code).toBe('gruppen'); expect((ratenRechnen({ gruppen: Array.from({ length: 13 }, () => g(1, 1)), einheit: 'jahre' }) as Z).code).toBe('gruppen'); ok(ratenRechnen({ gruppen: Array.from({ length: 12 }, () => g(1, 1)), einheit: 'jahre' }));
    expect((ratenRechnen({ gruppen: [g(1, 1), g(2, 2)], einheit: 'stunden' as any }) as Z).code).toBe('einheit'); expect((ratenRechnen({ gruppen: [g(1, 1), g(2, 2)], einheit: 'jahre', vergleich: 2 }) as Z).code).toBe('vergleich');
    expect((ratenRechnen({ gruppen: [g(1, 1), g(2, 2)], einheit: 'jahre', vergleich: -1 }) as Z).code).toBe('vergleich'); expect((ratenRechnen({ gruppen: [g(1, 1), g(2, 2)], einheit: 'jahre', je: 0 }) as Z).code).toBe('je');
  });
  it('beide Gruppen ohne Ereignis: Raten 0, kein NaN, das Verhältnis ist nicht definiert', () => {
    const e = ok(ratenRechnen({ gruppen: [g(0, 10), g(0, 20)], einheit: 'jahre' })); keinNaN(e); expect(e.vergleiche[0].rr).toBeNull(); expect(e.vergleiche[0].hinweis).toBe('nenner-null');
  });
});

describe('Sätze (deutsch, du): Rate ist kein Risiko, Poisson-Streuung', () => {
  const t = () => ratenSaetze(ok(ratenRechnen(R.fredericia.frage))).join(' ');
  it('Satz je Gruppe: 11 Ereignisse in 800 Personenjahren, 13,8 je 1000 Personenjahre, exaktes 95-%-Intervall 6,9 bis 24,6', () => {
    const x = t(); expect(x).toContain('11 Ereignisse'); expect(x).toContain('800 Personenjahren'); expect(x).toContain('13,8 je 1000 Personenjahre'); expect(x).toMatch(/exaktes 95-%-Intervall 6,9 bis 24,6/);
  });
  it('Satz zum Verhältnis und zur Differenz: 1,97 (exaktes 95-%-Intervall 0,86 bis 4,28; p = ,080), Differenz 6,8 (Näherung: −1,9 bis 15,4)', () => {
    const x = t(); expect(x).toMatch(/Ratenverhältnis/); expect(x).toContain('1,97'); expect(x).toMatch(/0,86 bis 4,28/); expect(x).toMatch(/p = ,080/); expect(x).toMatch(/Differenz/); expect(x).toContain('6,8 je 1000 Personenjahre'); expect(x).toMatch(/Näherung: [−-]1,9 bis 15,4/); expect(x).not.toMatch(/NaN|undefined|null/);
  });
  it('„Rate ≠ Risiko“ und die Warnung vor Überdispersion stehen IMMER dabei - auch bei einer Gruppe und bei nicht definiertem Verhältnis', () => {
    for (const e of [ok(ratenRechnen(R.fredericia.frage)), ok(ratenRechnen({ gruppen: [{ name: 'A', ereignisse: 3, zeit: 10 }], einheit: 'jahre' })), ok(ratenRechnen(R.x2_null.frage))]) {
      const x = ratenSaetze(e).join(' '); expect(x).toContain(ratenRisikoSatz()); expect(x).toContain(ratenUeberdispersionSatz());
    }
    expect(ratenRisikoSatz()).toMatch(/Risiko/); expect(ratenRisikoSatz()).toMatch(/Personenzeit/); expect(ratenUeberdispersionSatz()).toMatch(/Poisson/); expect(ratenUeberdispersionSatz()).toMatch(/Zähl/); expect(ratenUeberdispersionSatz()).toMatch(/Regression/);
  });
  it('nicht definiertes Verhältnis: ein Satz sagt es, ohne Zahl-Unsinn', () => {
    const x = ratenSaetze(ok(ratenRechnen(R.x2_null.frage))).join(' '); expect(x).toMatch(/nicht definiert/); expect(x).not.toMatch(/NaN|undefined|null|Infinity|∞/);
  });
});
