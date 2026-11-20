import { describe, expect, it } from 'vitest';
import { s } from './sitzung.svelte';
import PROG from './testdaten/prognose-erwartet.json';
import { prognoseLesen, type PrognoseAntwort, type PrognoseWahl } from './prognose';
import {
  MEHRERE_MIN, MEHRERE_MAX, MEHRERE_LABELS, mehrereSperre, mehrereCodeSatz, mehrereGrundSatz, mehrereRechnen, mehrereFlags, mehrereHauptsatz, mehrereWarnungen, mehrereTabellen,
  type Bauer, type BauEin, type MehrereE, type MehrereZeile, type Rechner
} from './mehrere';
import { saetzeZeitreihe, tabellenZeitreihe, prognoseBehalten, zeitreiheErgebnis, type ZeitreiheE } from './zeitreiheblatt';

/* „Mehrere Reihen auf einmal“ (Fachblatt docs/fachblaetter/GLAETTUNG-SERIEN.md, Abschnitt 4): Sperren (2 bis 20), jede Reihe für sich (eine scheitert, die anderen laufen), Fortschritt, Abbruch, die auffälligen
 * Reihen, Warnungen (immer sichtbar), Tabellen und die lange Form. R und der Aufbau der Reihe werden hereingereicht; hier läuft nichts in R. Die echte Rechnung gegen die Sollwerte steht in engine/glaettung.webr.test.ts. */
s.einst.sprache = 'de'; s.einst.anrede = 'du';
const P = PROG as unknown as Record<string, { y: number[]; m: number; mittel: number[]; u80: number[]; o80: number[]; u95: number[]; o95: number[]; b: number[]; bn: string[]; aicc: number; ordnung: number[]; konst: boolean }>;
const LD = P.ld!;

const roh = (extra: Record<string, unknown> = {}): Record<string, unknown> => ({
  art: ['arima'], p: [0], d: [1], q: [1], P: [0], D: [1], Q: [1], periode: [12], konst: [false], drift: [false], log: [false], namen: ['ma1', 'sma1'], b: [-0.43, -0.55], se: [0.12, 0.18], sigma2: [1e4], aic: [850], aicc: [857.3], bic: [860], nobs: [60], tauglich: [true],
  mittel: P.deaths!.mittel, u80: P.deaths!.u80, o80: P.deaths!.o80, u95: P.deaths!.u95, o95: P.deaths!.o95, angepasst: P.deaths!.mittel, rmse: [250], mae: [200], mape: [2.5],
  ljung: { q: 20, h: 24, p: 0.4, fitdf: 2 }, acf_res: [0.1], pruef: { rmse: 200, mae: 150, rmse_naiv: 400, mae_naiv: 300 }, pr: [12], ...extra
});
const antwort = (extra: Record<string, unknown> = {}): PrognoseAntwort => { const l = prognoseLesen(roh(extra)); if (!l.ok) throw new Error('Lesen: ' + l.code); return l.antwort; };
const reihe = (y: (number | null)[], o: Partial<BauEin> = {}): BauEin => ({ raster: 'monatlich', periode: 12, erster: '1974-01-01', t: y.map((_, i) => i + 1), y, ...o });
const DATEN: Record<string, (number | null)[]> = { a: LD.y, b: P.deaths!.y, nullwert: [...LD.y.slice(0, 30), 0, ...LD.y.slice(31)], kurz: LD.y.slice(0, 12), luecken: [...LD.y.slice(0, 10), ...Array(20).fill(null), ...LD.y.slice(30)], gleich: LD.y.map(() => 5) };
const bauer: Bauer = sp => (sp === 'kaputt' ? { ok: false, code: 'zu-kurz' } : { ok: true, e: reihe(DATEN[sp]!) });
/** Ein Rechner, der Aufrufe zählt und nach Wunsch einzelne Spalten scheitern lässt. */
function rechner(wirf: (y: (number | null)[]) => string | null = () => null) {
  const aufrufe: { n: number; wahl: PrognoseWahl; pr: number }[] = [];
  const f: Rechner = async (y, _m, wahl, pr) => { aufrufe.push({ n: y.length, wahl, pr }); const e = wirf(y); if (e) throw new Error(e); return antwort(); };
  return { f, aufrufe };
}
const wahl = (spalten: string[], o: Partial<{ h: number; log: boolean }> = {}) => ({ spalten, h: 12, log: false, ...o });

describe('Sperren: zwei bis 20 Spalten', () => {
  it('unter zwei und über 20 geht nicht, dazwischen schon', () => {
    expect([MEHRERE_MIN, MEHRERE_MAX]).toEqual([2, 20]);
    expect(mehrereSperre(0)).toBe('zu-wenige'); expect(mehrereSperre(1)).toBe('zu-wenige'); expect(mehrereSperre(2)).toBeNull(); expect(mehrereSperre(20)).toBeNull(); expect(mehrereSperre(21)).toBe('zu-viele');
    expect(mehrereCodeSatz('zu-wenige')).toBe('Für mehrere Reihen wählst du mindestens zwei Zahlenspalten.'); expect(mehrereCodeSatz('zu-viele')).toBe('Mehrere Reihen auf einmal gehen bis 20 Spalten.');
    s.einst.anrede = 'sie'; expect(mehrereCodeSatz('zu-wenige')).toBe('Für mehrere Reihen wählen Sie mindestens zwei Zahlenspalten.'); s.einst.anrede = 'du';
  });
});

describe('Rechnen: jede Reihe für sich', () => {
  it('die Reihen laufen nacheinander in der gewählten Reihenfolge, mit der Automatik (ARIMA, auto) und dem Prüfzeitraum', async () => {
    const r = rechner();
    const l = await mehrereRechnen(wahl(['a', 'b']), bauer, r.f);
    expect(l.abgebrochen).toBe(false); expect(l.zeilen.map(z => z.spalte)).toEqual(['a', 'b']); expect(l.zeilen.every(z => z.ok)).toBe(true);
    expect(r.aufrufe.length).toBe(2); expect(r.aufrufe.map(x => x.n)).toEqual([LD.y.length, P.deaths!.y.length]);
    for (const x of r.aufrufe) { expect(x.wahl.art).toBe('auto'); expect(x.wahl.h).toBe(12); expect(x.wahl.log).toBe(false); expect(x.pr).toBe(12); }
  });
  it('eine Reihe scheitert einzeln: Log mit Wert 0, zu kurz, zu viele Lücken, alle gleich, nicht aufzubauen - die anderen laufen weiter', async () => {
    const r = rechner();
    const l = await mehrereRechnen(wahl(['a', 'nullwert', 'kurz', 'luecken', 'gleich', 'kaputt', 'b'], { log: true }), bauer, r.f);
    expect(l.zeilen.map(z => z.ok)).toEqual([true, false, false, false, false, false, true]);
    const g = (i: number) => { const z = l.zeilen[i]!; if (z.ok) throw new Error('sollte scheitern'); return z.grund; };
    expect(g(1)).toEqual({ art: 'prognose', code: 'log-nicht-positiv' }); expect(g(2)).toEqual({ art: 'prognose', code: 'zu-kurz' }); expect(g(3)).toEqual({ art: 'prognose', code: 'zu-viele-luecken' });
    expect(g(4)).toEqual({ art: 'prognose', code: 'alle-gleich' }); expect(g(5)).toMatchObject({ art: 'reihe', code: 'zu-kurz' });
    expect(r.aufrufe.length).toBe(2);   // nur die zwei, die laufen dürfen
    expect(mehrereGrundSatz(g(1))).toBe('Die Log-Skala braucht Werte über 0.'); expect(mehrereGrundSatz(g(2))).toBe('Für eine Prognose braucht die Reihe mindestens 20 Werte.');
    expect(mehrereGrundSatz(g(3))).toContain('mehr als 10 %'); expect(mehrereGrundSatz(g(5))).toContain('mindestens 10 Werte');
  });
  it('ein Fehler aus R steht als Satz in der Zeile (R scheitert an einer Reihe, die Sperren durchgelassen haben); die nächste Reihe läuft', async () => {
    const r = rechner(y => (y[0] === P.deaths!.y[0] ? 'Das gewählte Modell ließ sich nicht schätzen.' : null));
    const l = await mehrereRechnen(wahl(['b', 'a']), bauer, r.f);
    expect(l.zeilen.map(z => z.ok)).toEqual([false, true]);
    const z0 = l.zeilen[0]!; if (z0.ok) throw new Error('x'); expect(z0.grund).toEqual({ art: 'text', text: 'Das gewählte Modell ließ sich nicht schätzen.' }); expect(mehrereGrundSatz(z0.grund)).toBe('Das gewählte Modell ließ sich nicht schätzen.');
  });
  it('der Horizont wird je Reihe auf den Höchsten dieser Reihe gesetzt (72 Werte, Periode 12: höchstens 18)', async () => {
    const r = rechner();
    await mehrereRechnen(wahl(['a'], { h: 40 }), bauer, r.f);
    expect(r.aufrufe[0]!.wahl.h).toBe(18);
  });
  it('Fortschritt: vor der ersten und nach jeder Reihe, auch wenn eine scheitert', async () => {
    const schritte: string[] = [];
    await mehrereRechnen(wahl(['a', 'kurz', 'b']), bauer, rechner().f, { fortschritt: (f, g) => schritte.push(`${f} von ${g}`) });
    expect(schritte).toEqual(['0 von 3', '1 von 3', '2 von 3', '3 von 3']);
  });
  it('Abbruch: vor jeder Reihe gefragt; was fertig ist, bleibt', async () => {
    let n = 0;
    const r = rechner(), l = await mehrereRechnen(wahl(['a', 'b', 'a']), bauer, r.f, { abbruch: () => n++ >= 2 });
    expect(l.abgebrochen).toBe(true); expect(l.zeilen.length).toBe(2); expect(r.aufrufe.length).toBe(2);
  });
  it('Lücken bis 10 % in „automatisch“ gehen nicht (die Automatik braucht Reihen ohne Lücken): die Zeile sagt es, nichts wird aufgefüllt', async () => {
    const mitLuecke = [...LD.y.slice(0, 20), null, ...LD.y.slice(21)];
    const l = await mehrereRechnen(wahl(['x']), sp => (sp === 'x' ? { ok: true, e: reihe(mitLuecke) } : { ok: false, code: 'zu-kurz' }), rechner().f);
    const z = l.zeilen[0]!; if (z.ok) throw new Error('sollte gesperrt sein');
    expect(z.grund).toEqual({ art: 'prognose', code: 'luecken-nur-selbst' }); expect(mehrereGrundSatz(z.grund)).toContain('Statable füllt nichts auf');
  });
});

describe('auffällige Reihen', () => {
  const ok = (extra: Record<string, unknown>, spalte = 'a'): MehrereZeile => ({ spalte, ok: true, wahl: { art: 'auto', h: 12, log: false, p: 0, d: 1, q: 1, P: 0, D: 1, Q: 1, konst: false, glaettung: 'einfach' }, pr: 12, antwort: antwort(extra), reihe: { raster: 'monatlich', periode: 12, erster: '1974-01-01', t: LD.y.map((_, i) => i + 1), y: LD.y } });
  it('Ljung-Box p < ,05 und Prüfzeitraum nicht besser als die einfache Regel; sonst unauffällig; gescheiterte Reihen nicht', () => {
    expect(mehrereFlags(ok({}))).toEqual([]);
    expect(mehrereFlags(ok({ ljung: { q: 60, h: 24, p: 0.001, fitdf: 2 } }))).toEqual(['ljung']);
    expect(mehrereFlags(ok({ pruef: { rmse: 400, mae: 300, rmse_naiv: 400, mae_naiv: 300 } }))).toEqual(['pruef']);
    expect(mehrereFlags(ok({ ljung: { q: 60, h: 24, p: 0.001, fitdf: 2 }, pruef: { rmse: 500, mae: 300, rmse_naiv: 400, mae_naiv: 300 } }))).toEqual(['ljung', 'pruef']);
    expect(mehrereFlags(ok({ pruef: [], pr: [0] }))).toEqual([]);   // kein Prüfzeitraum: nicht auffällig, aber auch nicht geprüft
    expect(mehrereFlags({ spalte: 'x', ok: false, grund: { art: 'text', text: 'x' } })).toEqual([]);
  });
  const e = (zeilen: MehrereZeile[]): MehrereE => ({ wahl: wahl(zeilen.map(z => z.spalte)), datum: '', raster: null, periode: null, zeilen });
  it('Warnungen stehen immer: eigenes Modell ohne Blick darauf, Zufall bei vielen Reihen; die auffälligen mit Namen, einmal oder mehrfach', () => {
    const w1 = mehrereWarnungen(e([ok({}, 'a'), ok({}, 'b')]));
    expect(w1.map(x => x.code)).toEqual(['eigenes-modell']);
    expect(w1[0]!.satz).toBe('Jede Reihe bekommt ihr eigenes Modell, ohne dass jemand es ansieht. Bei vielen Reihen fallen einzelne Tests schon durch Zufall auf.');
    const schlecht = { ljung: { q: 60, h: 24, p: 0.001, fitdf: 2 } };
    const w2 = mehrereWarnungen(e([ok(schlecht, 'a'), ok({}, 'b')]), n => `Spalte ${n}`);
    expect(w2.map(x => x.code)).toEqual(['eigenes-modell', 'auffaellig']); expect(w2[1]!.satz).toBe('Eine Reihe ist auffällig (Ljung-Box oder Prüfzeitraum): „Spalte a“. Sie sollte man einzeln ansehen.');
    const w3 = mehrereWarnungen(e([ok(schlecht, 'a'), ok(schlecht, 'b'), ok({}, 'c')]));
    expect(w3[1]!.satz).toBe('2 Reihen sind auffällig (Ljung-Box oder Prüfzeitraum): „a“, „b“. Sie sollte man einzeln ansehen.');
    const alle = w3.map(x => x.satz); expect(new Set(alle).size).toBe(alle.length);
  });
  it('Hauptsatz: alle gerechnet oder „x von y“', () => {
    expect(mehrereHauptsatz(e([ok({}, 'a'), ok({}, 'b')]))).toBe('Alle 2 Reihen wurden mit der ARIMA-Automatik gerechnet, jede mit eigenem Modell und eigenem Prüfzeitraum.');
    expect(mehrereHauptsatz(e([ok({}, 'a'), { spalte: 'b', ok: false, grund: { art: 'text', text: 'x' } }, ok({}, 'c')]))).toBe('2 von 3 Reihen wurden mit der ARIMA-Automatik gerechnet; bei den übrigen steht der Grund in der Tabelle.');
  });
});

describe('Tabellen und lange Form', () => {
  const ein = { name: (n: string) => `Spalte ${n}`, zeiten: (r: { t: number[] }, h: number) => Array.from({ length: h }, (_, i) => `Z${r.t.length + i + 1}`) };
  it('eine Zeile je Reihe: Modell, AICc, RMSE, Prüfzeitraum gegen einfache Regel, Ljung-Box-p, erste und letzte Prognose, Hinweis; die gescheiterte Reihe mit Grund', async () => {
    const l = await mehrereRechnen(wahl(['a', 'kurz']), bauer, rechner().f);
    const m: MehrereE = { wahl: wahl(['a', 'kurz']), datum: '', raster: null, periode: null, zeilen: l.zeilen };
    const t = mehrereTabellen(m, ein);
    expect(t.map(x => x.label)).toEqual([...MEHRERE_LABELS]);
    const u = t[0]!, kopf = u.cells.filter(c => c.r === 0).map(c => c.t);
    expect(kopf).toEqual(['Reihe', 'Modell', 'AICc', 'RMSE', 'RMSE im Prüfzeitraum', 'RMSE einfache Regel', 'Ljung-Box p', 'Erste Prognose', 'Letzte Prognose', 'Hinweis']);
    expect(u.rows).toBe(3);
    const z1 = u.cells.filter(c => c.r === 1).map(c => c.t), z2 = u.cells.filter(c => c.r === 2).map(c => c.t);
    expect(z1.slice(0, 7)).toEqual(['Spalte a', 'ARIMA(0,1,1)(0,1,1)[12]', '857.30', '250.00', '200.00', '400.00', ',400']); expect(z1[9]).toBe('-');
    expect(z2[0]).toBe('Spalte kurz'); expect(z2.slice(1, 9)).toEqual(Array(8).fill('-')); expect(z2[9]).toBe('Für eine Prognose braucht die Reihe mindestens 20 Werte.');
  });
  it('die lange Form: eine Zeile je Reihe und Zeitpunkt, nur gerechnete Reihen; ohne gerechnete Reihe keine zweite Tabelle', async () => {
    const l = await mehrereRechnen(wahl(['a', 'b', 'kurz']), bauer, rechner().f);
    const t = mehrereTabellen({ wahl: wahl(['a', 'b', 'kurz']), datum: '', raster: null, periode: null, zeilen: l.zeilen }, ein);
    const lang = t[1]!;
    expect(lang.cols).toBe(7); expect(lang.rows).toBe(1 + 2 * P.deaths!.mittel.length);
    expect(lang.cells.filter(c => c.r === 0).map(c => c.t)).toEqual(['Reihe', 'Zeitpunkt', 'Prognose', '80 % unten', '80 % oben', '95 % unten', '95 % oben']);
    expect(lang.cells.filter(c => c.r === 1).map(c => c.t).slice(0, 2)).toEqual(['Spalte a', `Z${LD.y.length + 1}`]);
    const nur = mehrereTabellen({ wahl: wahl(['kurz']), datum: '', raster: null, periode: null, zeilen: (await mehrereRechnen(wahl(['kurz']), bauer, rechner().f)).zeilen }, ein);
    expect(nur.map(x => x.label)).toEqual(['Mehrere-Reihen']);
  });
});

describe('im Blatt: Sätze, Tabellen, alte Projektdateien', () => {
  const sp = (name: string) => ({ name, bezeichnung: name, art: 'zahl' as const, niveau: 'metrisch' as const, format: 'F8.2', fehlend: [], fehlendText: '', werteLabels: {} });
  function blatt(): ZeitreiheE {
    s.spalten = [sp('v')]; s.zeilen = LD.y.map(v => [v]);
    const r = zeitreiheErgebnis('v', '', { periode: 12 });
    if (!r.ok) throw new Error('Reihe');
    return r.e;
  }
  it('mit dem Ergebnis stehen Hauptsatz und Warnungen in den Sätzen und beide Tabellen im Bericht; ohne nicht', async () => {
    const e = blatt();
    expect(saetzeZeitreihe(e).vorsicht).not.toContain('eigenes Modell'); expect(tabellenZeitreihe(e).map(t => t.label)).not.toContain('Mehrere-Reihen');
    const l = await mehrereRechnen(wahl(['a', 'b']), bauer, rechner().f);
    const mit: ZeitreiheE = { ...e, mehrere: { wahl: wahl(['a', 'b']), datum: '', raster: null, periode: null, zeilen: l.zeilen } };
    const sa = saetzeZeitreihe(mit);
    expect(sa.zusatz).toContain('Alle 2 Reihen wurden mit der ARIMA-Automatik gerechnet'); expect(sa.vorsicht).toContain('Jede Reihe bekommt ihr eigenes Modell');
    expect(tabellenZeitreihe(mit).map(t => t.label)).toEqual(expect.arrayContaining([...MEHRERE_LABELS]));
  });
  it('beim Neurechnen mit derselben Reihe bleibt das Ergebnis, bei einer anderen fällt es weg; eine Datei von früher lädt', () => {
    const e = blatt(), mit: ZeitreiheE = { ...e, mehrere: { wahl: wahl(['a', 'b']), datum: '', raster: null, periode: null, zeilen: [] } };
    expect(prognoseBehalten(mit, { ...e }).mehrere).toBeDefined(); expect(prognoseBehalten(mit, { ...e, y: e.y.map((v, i) => (i === 2 ? 1 : v)) }).mehrere).toBeUndefined();
    expect(e.mehrere).toBeUndefined(); expect(() => saetzeZeitreihe(e)).not.toThrow(); expect(() => tabellenZeitreihe(e)).not.toThrow();
  });
});
