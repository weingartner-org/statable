import { describe, expect, it, afterEach } from 'vitest';
import { s } from './sitzung.svelte';
import ERW from './testdaten/ausreisser-zeitreihe-erwartet.json';
import {
  ausreisserSperre, ausreisserWahlBereinigen, ausreisserAufruf, ausreisserLesen, ausreisserCodeSatz, ausreisserHilfeSatz, ausreisserHauptsatz, ausreisserApa, ausreisserLeitplanken, ausreisserTabellen, ausreisserRCode,
  auffaelligeWerte, AUSREISSER_LABELS, AUSREISSER_PROBE, AUSREISSER_SCHWELLEN, type AusreisserE, type AusreisserCode
} from './ausreisserzeit';
import { zeitreiheErgebnis, saetzeZeitreihe, tabellenZeitreihe, prognoseBehalten, ausreisserSaetze, platzLabel, type ZeitreiheE } from './zeitreiheblatt';
import type { PrognoseReihe } from './prognose';

/* „Auffällige Werte suchen“ (scripts/ausreisser-zeitreihe-erwartet.R): alles, was ohne R prüfbar ist - Sperren, Wahl, der Aufruf (nur Zahlen), Lesen der R-Antwort, Sätze, Hinweise, Tabellen, R-Text,
 * alte Projektdateien. Die Rechnung selbst steht in engine/ausreisserzeit.webr.test.ts. Die Zahlen der Antworten kommen nur als Eingabe für Lesen und Sätze aus den Sollwerten
 * (lib/testdaten/ausreisser-zeitreihe-erwartet.json, geschrieben von scripts/ausreisser-zeitreihe-erwartet.R); sie stammen nie aus dem Code der App. */
s.einst.sprache = 'de'; s.einst.anrede = 'du';
afterEach(() => { s.einst.sprache = 'de'; s.einst.anrede = 'du'; });

type Reihe = { name: string; y: number[]; m: number; log: boolean; schwelle: number; modell: 'stl' | 'arima'; von: number; p: number; d: number; q: number; konst: boolean; rest: number[]; z: number[]; erwartet: number[]; auff: number[]; skala: number; median: number };
const J = ERW as unknown as { reihen: Reihe[]; probe: { stl: Record<string, number>; arima: Record<string, number> }; eingefuegt: { saison: number[]; ar: number[] } };
const reihe = (n: string) => J.reihen.find(r => r.name === n)!;
const roh = (r: Reihe, extra: Record<string, unknown> = {}): Record<string, unknown> => ({
  modell: [r.modell], n: [r.y.length], von: [r.von], p: [r.p], d: [r.d], q: [r.q], konst: [r.konst], periode: [r.m > 1 ? r.m : 1], log: [r.log], schwelle: [r.schwelle], median: [r.median], skala: [r.skala], rest: r.rest, z: r.z, erwartet: r.erwartet, auff: r.auff, ...extra
});
const ae = (n: string, extra: Record<string, unknown> = {}): AusreisserE => {
  const r = reihe(n), l = ausreisserLesen(roh(r, extra));
  if (!l.ok) throw new Error('Lesen: ' + l.code);
  return { wahl: { schwelle: r.schwelle, log: r.log }, antwort: l.antwort };
};
const pr = (y: (number | null)[], raster: PrognoseReihe['raster'] = 'monatlich', periode = 12): PrognoseReihe => ({ raster, periode, y });
const serie = (n: number) => Array.from({ length: n }, (_, i) => 100 + Math.sin(i / 3) * 10 + i);
/** Kein Verweis auf Fachblatt, Dateien oder interne Namen im Text für Nutzer. */
const sauber = (t: string) => expect(t).not.toMatch(/Fachblatt|\.md\b|\.R\b|\.ts\b|sp_ausreisser|sp_prog|AUSREISSER|docs\//);

describe('Sperren und Wahl', () => {
  it('Reihenfolge: Sperren der Prognose, dann Lücken, dann (ohne Saison) mehr als 600 Werte; mit Saison keine Längengrenze', () => {
    expect(ausreisserSperre(pr(serie(100)))).toBeNull();
    expect(ausreisserSperre(pr(serie(10)))).toBe('zu-kurz');
    expect(ausreisserSperre(pr(serie(50).map(() => 5)))).toBe('alle-gleich');
    expect(ausreisserSperre(pr(serie(100), 'ungleich', 1))).toBe('ungleich');
    expect(ausreisserSperre(pr(serie(100).map((v, i) => (i === 7 ? null : v))))).toBe('luecken');
    expect(ausreisserSperre(pr(serie(100).map((v, i) => (i < 20 ? null : v))))).toBe('zu-viele-luecken');
    expect(ausreisserSperre(pr(serie(700), 'taeglich', 1))).toBe('auto-zu-lang');
    expect(ausreisserSperre(pr(serie(700), 'monatlich', 12))).toBeNull();
  });
  it('Wahl: Schwelle nur 3, 3,5 oder 4 (sonst 3,5); Log nur bei Werten über 0', () => {
    expect(AUSREISSER_SCHWELLEN).toEqual([3, 3.5, 4]);
    expect(ausreisserWahlBereinigen({ schwelle: 2, log: true }, true)).toEqual({ schwelle: 3.5, log: true });
    expect(ausreisserWahlBereinigen({ schwelle: 4, log: true }, false)).toEqual({ schwelle: 4, log: false });
    expect(ausreisserWahlBereinigen({ schwelle: NaN, log: false }, true).schwelle).toBe(3.5);
  });
});

describe('Aufruf an R: nur Zahlen, nie Text aus Dateien', () => {
  it('feste Form mit der Reihe als Spalte y; unzulässige Schwelle wirft', () => {
    const a = ausreisserAufruf({ schwelle: 3.5, log: true }, 12);
    expect(a.code).toBe('tryCatch(sp_ausreisser(d$y, 12L, TRUE, 3.5), error = function(e) list(fehler = conditionMessage(e)))');
    expect(a.args).toEqual({});
    expect(ausreisserAufruf({ schwelle: 3, log: false }, 1).code).toContain('sp_ausreisser(d$y, 1L, FALSE, 3)');
    expect(() => ausreisserAufruf({ schwelle: 2.5, log: false }, 12)).toThrow();
    expect(() => ausreisserAufruf({ schwelle: 3.5, log: false }, NaN)).toThrow();
    expect(() => ausreisserAufruf({ schwelle: '3.5); system("x")' as unknown as number, log: false }, 12)).toThrow();
  });
});

describe('R-Antwort lesen', () => {
  it('alle Felder; Vektoren der Länge 1; leere Liste der Fundstellen', () => {
    const e = ae('air_log'), a = e.antwort, r = reihe('air_log');
    expect(a.modell).toBe('stl'); expect(a.n).toBe(144); expect(a.von).toBe(1); expect(a.periode).toBe(12); expect(a.log).toBe(true); expect(a.schwelle).toBe(3.5);
    expect(a.rest.length).toBe(144); expect(a.z.length).toBe(144); expect(a.erwartet.length).toBe(144); expect(a.auff).toEqual(r.auff);
    const n = ae('nile'); expect(n.antwort.modell).toBe('arima'); expect(n.antwort.von).toBe(2); expect(n.antwort.rest.length).toBe(99); expect(n.antwort.auff).toEqual([]);
    const leer = ausreisserLesen(roh(reihe('nile'), { auff: [] })); expect(leer.ok).toBe(true);
  });
  it('Fehler als Code, kaputte Antworten als r-fehler, nie ein Wurf', () => {
    expect(ausreisserLesen({ fehler: ['luecken-nur-selbst'] })).toEqual({ ok: false, code: 'luecken-nur-selbst' });
    expect(ausreisserLesen({ fehler: ['streuung-null'] })).toEqual({ ok: false, code: 'streuung-null' });
    expect(ausreisserLesen({ fehler: ['irgendwas'] })).toEqual({ ok: false, code: 'r-fehler' });
    for (const k of [null, undefined, 5, 'x', [], { type: 'null' }, {}]) expect(ausreisserLesen(k)).toEqual({ ok: false, code: 'r-fehler' });
    const r = reihe('nile');
    expect(ausreisserLesen(roh(r, { skala: [0] })).ok).toBe(false);
    expect(ausreisserLesen(roh(r, { z: r.z.slice(1) })).ok).toBe(false);
    expect(ausreisserLesen(roh(r, { rest: [...r.rest.slice(1), null] })).ok).toBe(false);
    expect(ausreisserLesen(roh(r, { auff: [1000] })).ok).toBe(false);
    expect(ausreisserLesen(roh(r, { modell: ['loess'] })).ok).toBe(false);
  });
});

describe('Die Zeilen der Tabelle', () => {
  it('der auffälligste Wert zuerst; Rest = Wert − Erwartet (roh) bzw. Abweichung in % (Log)', () => {
    const r = reihe('eingefuegt_saison'), e = ae('eingefuegt_saison'), w = auffaelligeWerte(e.antwort, r.y);
    expect(w.map(x => x.platz)).toEqual(expect.arrayContaining(J.eingefuegt.saison));
    expect(w[0]!.platz).toBe(90); expect(w[1]!.platz).toBe(40);
    for (let i = 1; i < w.length; i++) expect(Math.abs(w[i - 1]!.z)).toBeGreaterThanOrEqual(Math.abs(w[i]!.z));
    for (const x of w) { expect(x.rest).toBeCloseTo(x.wert - x.erwartet, 9); expect(Math.abs(x.z)).toBeGreaterThan(3.5); }
    const l = reihe('air_log'), el = ae('air_log'), wl = auffaelligeWerte(el.antwort, l.y);
    for (const x of wl) expect(x.rest).toBeCloseTo((x.wert / x.erwartet - 1) * 100, 9);
  });
  it('Zwei Tabellen mit den festen Beschriftungen; ohne Fund nur die Tabelle zum Verfahren', () => {
    const r = reihe('eingefuegt_saison'), e = ae('eingefuegt_saison');
    const t = ausreisserTabellen(e, { name: 'w', zeit: i => `Z${i}`, y: r.y, stellen: 1 });
    expect(t.map(x => x.label)).toEqual([...AUSREISSER_LABELS]);
    const n = ausreisserTabellen(ae('nile'), { name: 'w', zeit: i => `Z${i}`, y: reihe('nile').y, stellen: 0 });
    expect(n.map(x => x.label)).toEqual(['Auffällige Werte-Verfahren']);
  });
});

describe('Sätze und Hinweise', () => {
  const ein = { zeit: (i: number) => `Z${i}`, stellen: 1 };
  it('Hauptsatz: Zahl der Funde mit Einzahl/Mehrzahl, der auffälligste Wert; kein Fund heißt „passen zum Muster“', () => {
    const t = ausreisserHauptsatz(ae('eingefuegt_saison'), reihe('eingefuegt_saison').y, ein);
    expect(t).toMatch(/^Bei der Schwelle \|z\| > 3,5 sind 6 von 120 Werten auffällig\. Der auffälligste: Z90 \(/);
    expect(ausreisserHauptsatz(ae('nile'), reihe('nile').y, { zeit: String, stellen: 0 })).toBe('Bei der Schwelle |z| > 3,5 ist kein Wert auffällig: Alle 99 geprüften Werte passen zum Muster.');
    const eins: AusreisserE = ae('nile'); const e1 = { ...eins, antwort: { ...eins.antwort, auff: [30] } };
    expect(ausreisserHauptsatz(e1, reihe('nile').y, { zeit: String, stellen: 0 })).toMatch(/ist 1 von 99 Werten auffällig/);
    s.einst.sprache = 'en';
    expect(ausreisserHauptsatz(e1, reihe('nile').y, { zeit: String, stellen: 0 })).toMatch(/1 of 99 values is conspicuous/);
    expect(ausreisserHauptsatz(ae('eingefuegt_saison'), reihe('eingefuegt_saison').y, ein)).toMatch(/6 of 120 values are conspicuous/);
  });
  it('Hinweise: kein Fehler, was man prüfen kann (Verweis auf „Hat die Maßnahme gewirkt?“), keine Chen-Liu-Erkennung, Schwelle als Verabredung; je Fall Maskierung, Rand, viele, Log', () => {
    const l = (n: string) => ausreisserLeitplanken(ae(n));
    const codes = (n: string) => l(n).map(x => x.code);
    expect(codes('eingefuegt_saison')).toEqual(['kein-fehler', 'pruefen', 'einfach', 'zufall', 'zusammenhang']);
    expect(codes('air_log')).toEqual(['kein-fehler', 'pruefen', 'einfach', 'zufall', 'zusammenhang', 'log']);
    expect(codes('eingefuegt_ar')).toEqual(['kein-fehler', 'pruefen', 'einfach', 'zufall', 'maskierung', 'zusammenhang', 'rand']);
    expect(codes('air_roh')).toContain('viele');   // 16 von 144 Werten sind mehr als jeder zehnte
    expect(codes('lynx')).not.toContain('viele');   // 9 von 114 sind weniger
    const alle = l('eingefuegt_ar').map(x => x.satz).join(' ');
    expect(alle).toContain('kein Fehler'); expect(alle).toContain('Hat die Maßnahme gewirkt?'); expect(alle).toContain('Chen und Liu'); expect(alle).toContain('tsoutliers'); expect(alle).toContain('Tippfehler');
    sauber(alle);
    expect(l('eingefuegt_saison').find(x => x.code === 'zufall')!.satz).toContain('1,5 Werte');
    s.einst.sprache = 'en';
    expect(ausreisserLeitplanken(ae('eingefuegt_saison')).map(x => x.satz).join(' ')).toContain('A conspicuous value is not an error');
  });
  it('Die Zufallsprobe der Hinweise gleicht dem Skript (gerundet)', () => {
    for (const art of ['stl', 'arima'] as const) for (const sw of AUSREISSER_SCHWELLEN) {
      const soll = J.probe[art][String(sw)]!, ist = AUSREISSER_PROBE[art][sw]!;
      expect(Math.abs(ist - soll), `${art} ${sw}`).toBeLessThanOrEqual(0.006);
    }
  });
  it('Codesätze: jeder Code hat einen Satz, im Englischen einen anderen; nichts Internes', () => {
    const codes: AusreisserCode[] = ['zu-viele-luecken', 'ungleich', 'zu-kurz', 'alle-gleich', 'luecken', 'auto-zu-lang', 'luecken-nur-selbst', 'log-nicht-positiv', 'streuung-null', 'kein-modell', 'nicht-konvergiert', 'r-fehler'];
    const de = codes.map(c => ausreisserCodeSatz(c)); s.einst.sprache = 'en'; const en = codes.map(c => ausreisserCodeSatz(c));
    de.forEach((t, i) => { expect(t.length, codes[i]).toBeGreaterThan(20); sauber(t); expect(en[i], codes[i]).not.toBe(t); });
    s.einst.sprache = 'de'; sauber(ausreisserHilfeSatz()); expect(ausreisserHilfeSatz()).toContain('du auf den Knopf klickst');
    s.einst.anrede = 'sie'; expect(ausreisserHilfeSatz()).toContain('Sie auf den Knopf klicken');
  });
  it('APA-Kurzzeile', () => { expect(ausreisserApa(ae('eingefuegt_saison'))).toBe('STL-Zerlegung (robust) mit Periode 12, |z| > 3,5: 6 / 120'); });
});

describe('R-Text zum Ansehen', () => {
  it('stl und arima; der Spaltenname läuft durch rAnzeigeName, nichts bricht aus', () => {
    const t1 = ausreisserRCode(ae('air_log'), 'passagiere');
    expect(t1).toContain('z <- ts(log(daten$passagiere), frequency = 12)'); expect(t1).toContain('stl(z, s.window = "periodic", robust = TRUE)'); expect(t1).toContain('which(abs(zw) > 3.5) + 0');
    const t2 = ausreisserRCode(ae('eingefuegt_ar'), 'x');
    expect(t2).toContain('arima(z, order = c(3, 1, 0)'); expect(t2).toContain('[-seq_len(1)]'); expect(t2).toContain('+ 1');
    const bose = ausreisserRCode(ae('nile'), 'a`; system("rm -rf /"); `b');
    expect(bose).toContain('daten$`a\\`; system("rm -rf /"); \\`b`');
  });
});

describe('im Blatt der Zeitreihe', () => {
  const monatsDaten = (n: number, j0 = 1949) => Array.from({ length: n }, (_, i) => `01.${String((i % 12) + 1).padStart(2, '0')}.${j0 + Math.floor(i / 12)}`);
  const sp = (name: string, art: 'zahl' | 'datum') => ({ name, bezeichnung: name, art, niveau: 'metrisch' as const, format: art === 'datum' ? 'EDATE10' : 'F8.2', fehlend: [], fehlendText: '', werteLabels: {} });
  const blatt = (): ZeitreiheE => {
    const r = reihe('air_log');
    s.spalten = [sp('datum', 'datum'), sp('passagiere', 'zahl')] as never; s.zeilen = monatsDaten(144).map((d, i) => [d, r.y[i]!]) as never;
    const g = zeitreiheErgebnis('passagiere', 'datum'); if (!g.ok) throw new Error('kein Ergebnis');
    return g.e;
  };
  it('erst nach dem Klick: Sätze, Hinweise und Tabellen; der Platz wird als Monat beschriftet', () => {
    const e = blatt(); expect(platzLabel(e, 1)).toBe('Februar 1949');
    expect(e.ausreisser).toBeUndefined(); expect(ausreisserSaetze(e)).toBeNull();
    expect(saetzeZeitreihe(e).zusatz).not.toMatch(/auffällig/); expect(tabellenZeitreihe(e).map(t => t.label)).not.toEqual(expect.arrayContaining([...AUSREISSER_LABELS]));
    const mit: ZeitreiheE = { ...e, ausreisser: ae('air_log') };
    const sz = ausreisserSaetze(mit)!;
    const r = reihe('air_log'), top = r.auff.reduce((b, p) => (Math.abs(r.z[p - 1]!) > Math.abs(r.z[b - 1]!) ? p : b), r.auff[0]!);
    expect(sz.haupt).toContain(`sind 6 von 144 Werten auffällig. Der auffälligste: ${platzLabel(e, top - 1)} (`);
    const gesamt = saetzeZeitreihe(mit, x => x);
    expect(gesamt.zusatz).toContain('von 144 Werten auffällig'); expect(gesamt.vorsicht).toContain('Ein auffälliger Wert ist kein Fehler'); expect(gesamt.apa).toContain('STL-Zerlegung (robust) mit Periode 12, Log-Skala, |z| > 3,5: 6 / 144');
    expect(tabellenZeitreihe(mit).map(t => t.label)).toEqual(expect.arrayContaining([...AUSREISSER_LABELS]));
  });
  it('beim Neurechnen des Blatts bleibt das Ergebnis, wenn die Reihe dieselbe ist, sonst fällt es weg', () => {
    const e: ZeitreiheE = { ...blatt(), ausreisser: ae('air_log') }, neu = blatt();
    expect(prognoseBehalten(e, neu).ausreisser).toBeDefined();
    expect(prognoseBehalten(e, { ...neu, y: neu.y.map((v, i) => (i === 5 ? 1 : v)) }).ausreisser).toBeUndefined();
  });
});
