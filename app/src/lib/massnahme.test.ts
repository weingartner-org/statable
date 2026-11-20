import { describe, expect, it, afterEach } from 'vitest';
import { s } from './sitzung.svelte';
import { zitat } from '../i18n/profil';
import ERW from './testdaten/massnahme-erwartet.json';
import {
  massnahmeSperre, massnahmeMinSeite, massnahmeWahlBereinigen, massnahmeWahlGrund, massnahmeAufruf, vorschlagAufruf, massnahmeLesen, vorschlagLesen, vorschlagUebernehmen, vorschlagSatz, vorschlagName,
  massnahmeHauptsatz, massnahmeLjungSatz, massnahmeApa, massnahmeLeitplanken, massnahmeCodeSatz, massnahmeTabellen, massnahmeRCode, massnahmeModellText, massnahmeHilfeSatz, prozentVeraenderung, MASSNAHME_LABELS,
  type MassnahmeE, type MassnahmeWahl, type MassnahmeAntwort, type MassnahmeCode, type VorschlagAntwort
} from './massnahme';
import { zeitreiheErgebnis, saetzeZeitreihe, tabellenZeitreihe, prognoseBehalten, massnahmeSaetze, platzLabel, type ZeitreiheE } from './zeitreiheblatt';
import type { PrognoseReihe } from './prognose';

/* „Hat die Maßnahme gewirkt?“ (Fachblatt docs/fachblaetter/MASSNAHME.md): alles, was ohne R prüfbar ist - Sperren, Wahl, der Aufruf (nur Wörter und Zahlen), Lesen der R-Antwort, Sätze („ging … einher“),
 * Warnungen (ljung, nicht-tauglich), Tabellen, R-Text, alte Projektdateien. Die Rechnung selbst steht in engine/massnahme.webr.test.ts. Die Zahlen der Antworten kommen aus den Sollwerten
 * (lib/testdaten/massnahme-erwartet.json) nur als Eingabe für Lesen und Sätze. */
s.einst.sprache = 'de'; s.einst.anrede = 'du';
afterEach(() => { s.einst.sprache = 'de'; s.einst.anrede = 'du'; });

type Wirkung = { name: string; y: number[]; m: number; log: boolean; order: number[]; seasonal: number[]; t0: number; stufe: boolean; impuls: boolean; namen: string[]; b: number[]; se: number[]; z: number[]; p: number[]; kiu: number[]; kio: number[];
  sigma2: number; aicc: number; mittel: number[]; u95: number[]; o95: number[]; ljung: { q: number; h: number; fitdf: number; p: number }; nobs: number };
const WI = (ERW as unknown as { wirkung: Wirkung[] }).wirkung;
const wirk = (n: string) => WI.find(w => w.name === n)!;
const wahlVon = (w: Wirkung): MassnahmeWahl => ({ t0: w.t0, art: w.stufe && w.impuls ? 'beides' : w.impuls ? 'impuls' : 'stufe', log: w.log, p: w.order[0]!, d: w.order[1]!, q: w.order[2]!, P: w.seasonal[0]!, D: w.seasonal[1]!, Q: w.seasonal[2]!, konst: false, h: 12 });
/** Die Antwort von R, wie `rZuJson` sie liefert (Vektoren als Arrays, Listen als Objekt). */
const roh = (w: Wirkung, extra: Record<string, unknown> = {}): Record<string, unknown> => ({
  art: [w.stufe && w.impuls ? 'beides' : w.impuls ? 'impuls' : 'stufe'], t0: [w.t0], p: [w.order[0]], d: [w.order[1]], q: [w.order[2]], P: [w.seasonal[0]], D: [w.seasonal[1]], Q: [w.seasonal[2]], periode: [w.m], konst: [false], log: [w.log],
  namen: w.namen, b: w.b, se: w.se, z: w.z, pw: w.p, kiu: w.kiu, kio: w.kio, sigma2: [w.sigma2], loglik: [-1000], aic: [2300], aicc: [w.aicc], nobs: [w.nobs], tauglich: [true],
  mittel: w.mittel, u95: w.u95, o95: w.o95, ljung: { q: w.ljung.q, h: w.ljung.h, p: w.ljung.p, fitdf: w.ljung.fitdf }, ...extra
});
const antwort = (w: Wirkung, extra: Record<string, unknown> = {}): MassnahmeAntwort => { const l = massnahmeLesen(roh(w, extra)); if (!l.ok) throw new Error('Lesen: ' + l.code); return l.antwort; };
const me = (n: string, extra: Record<string, unknown> = {}): MassnahmeE => ({ wahl: wahlVon(wirk(n)), antwort: antwort(wirk(n), extra) });
const reihe = (y: (number | null)[], raster: PrognoseReihe['raster'] = 'monatlich', periode = 12): PrognoseReihe => ({ raster, periode, y });
const serie = (n: number) => Array.from({ length: n }, (_, i) => 100 + Math.sin(i / 3) * 10 + i);
/** Kein Verweis auf Fachblatt, Dateien oder interne Namen im Text für Nutzer. */
const sauber = (t: string) => expect(t).not.toMatch(/Fachblatt|\.md\b|\.R\b|\.ts\b|sp_massnahme|sp_granger|sp_prog|MASSNAHME|docs\//);

describe('Sperren und Regeln', () => {
  it('Reihenfolge: zuerst die Sperren der Prognose, dann Rand, dann zu wenige Werte davor oder danach; ohne Zeitpunkt keine Sperre', () => {
    const y = serie(100);
    expect(massnahmeSperre(reihe(y, 'monatlich', 1), null)).toBeNull();
    expect(massnahmeSperre(reihe(y.map((v, i) => (i % 5 === 0 ? null : v))), 50)).toBe('zu-viele-luecken');
    expect(massnahmeSperre(reihe(y, 'ungleich'), 50)).toBe('ungleich');
    expect(massnahmeSperre(reihe(serie(15)), 8)).toBe('zu-kurz');
    expect(massnahmeSperre(reihe(y.map(() => 3)), 50)).toBe('alle-gleich');
    for (const t0 of [1, 0, 101, 5.5]) expect(massnahmeSperre(reihe(y, 'monatlich', 1), t0), `t0 ${t0}`).toBe('rand');
    expect(massnahmeSperre(reihe(y, 'monatlich', 1), 50)).toBeNull();
  });
  it('m = 1: je mindestens 8 vorhandene Werte vor und ab dem Zeitpunkt', () => {
    const y = serie(100), r = reihe(y, 'monatlich', 1);
    expect(massnahmeMinSeite(1)).toBe(8);
    expect(massnahmeSperre(r, 9)).toBeNull(); expect(massnahmeSperre(r, 8)).toBe('zu-wenig-davor');
    expect(massnahmeSperre(r, 93)).toBeNull(); expect(massnahmeSperre(r, 94)).toBe('zu-wenig-danach');   // ab 93 sind es 8 Plätze
    // Lücken zählen nicht als Werte
    const mitLuecke = y.map((v, i) => (i === 3 ? null : v));
    expect(massnahmeSperre(reihe(mitLuecke, 'monatlich', 1), 9)).toBe('zu-wenig-davor');
  });
  it('Saison: knapp zwei Perioden (2 m − 1) vor und ab dem Zeitpunkt; der Fall Seatbelts (192 Plätze, Zeitpunkt 170, m = 12) wird gerechnet', () => {
    expect(massnahmeMinSeite(12)).toBe(23); expect(massnahmeMinSeite(4)).toBe(7);
    const sb = wirk('seatbelts_stufe');
    expect(massnahmeSperre(reihe(sb.y), sb.t0)).toBeNull();
    expect(massnahmeSperre(reihe(sb.y), 171)).toBe('zu-wenig-danach');
    expect(massnahmeSperre(reihe(sb.y), 23)).toBe('zu-wenig-davor'); expect(massnahmeSperre(reihe(sb.y), 24)).toBeNull();
    expect(massnahmeSperre(reihe(wirk('nile_stufe_1899').y, 'jaehrlich', 1), wirk('nile_stufe_1899').t0)).toBeNull();
  });
  it('Wahl bereinigen: Konstante nur bei d + D = 0, Art, Horizont, Saison nur bei Periode 2 bis 24, Log nur bei Werten über 0', () => {
    const r = reihe(serie(100), 'monatlich', 12), w: MassnahmeWahl = { t0: 50, art: 'stufe', log: true, p: 1, d: 0, q: 0, P: 0, D: 0, Q: 0, konst: true, h: 12 };
    expect(massnahmeWahlBereinigen(w, r).konst).toBe(true);
    expect(massnahmeWahlBereinigen({ ...w, d: 1 }, r).konst).toBe(false); expect(massnahmeWahlBereinigen({ ...w, D: 1 }, r).konst).toBe(false);
    expect(massnahmeWahlBereinigen({ ...w, art: 'quatsch' as never }, r).art).toBe('stufe');
    expect(massnahmeWahlBereinigen({ ...w, h: 500 }, r).h).toBe(24); expect(massnahmeWahlBereinigen({ ...w, h: 0 }, r).h).toBe(1);
    expect(massnahmeWahlBereinigen({ ...w, p: 9, d: 7, P: 9 }, r)).toMatchObject({ p: 5, d: 2, P: 5 });
    expect(massnahmeWahlBereinigen({ ...w, P: 1, D: 1, Q: 1 }, reihe(serie(100), 'monatlich', 30))).toMatchObject({ P: 0, D: 0, Q: 0 });
    expect(massnahmeWahlBereinigen(w, reihe(serie(100).map((v, i) => (i === 3 ? 0 : v)))).log).toBe(false);
  });
  it('Wahl-Gründe: Log mit Wert 0, Saison bei Periode über 24', () => {
    const w: MassnahmeWahl = { t0: 50, art: 'stufe', log: true, p: 0, d: 1, q: 1, P: 0, D: 0, Q: 0, konst: false, h: 5 };
    expect(massnahmeWahlGrund(w, reihe(serie(100)))).toBeNull();
    expect(massnahmeWahlGrund(w, reihe(serie(100).map((v, i) => (i === 3 ? 0 : v))))).toBe('log-nicht-positiv');
    expect(massnahmeWahlGrund({ ...w, log: false, D: 1 }, reihe(serie(100), 'taeglich', 30))).toBe('saison-nicht-moeglich');
  });
  it('jeder Code hat einen ganzen Satz ohne Verweis auf Fachblatt oder Dateien, deutsch und englisch', () => {
    const codes: MassnahmeCode[] = ['zu-viele-luecken', 'ungleich', 'zu-kurz', 'alle-gleich', 'rand', 'zu-wenig-davor', 'zu-wenig-danach', 'kein-zeitpunkt', 'log-nicht-positiv', 'saison-nicht-moeglich', 'nicht-konvergiert', 'luecken-nur-selbst', 'kein-modell', 'vorschlag-konstant', 'vorschlag-zu-kurz', 'r-fehler'];
    for (const c of codes) {
      const de = massnahmeCodeSatz(c); expect(de, c).toMatch(/\.$/); sauber(de);
      s.einst.sprache = 'en'; const en = massnahmeCodeSatz(c); s.einst.sprache = 'de';
      expect(en, c).not.toBe(de); expect(en, c).toMatch(/\.$/); expect(en, c).not.toMatch(/Zeitpunkt|Maßnahme|Werte|Reihe|Modell/);
    }
  });
  it('„kein Zeitpunkt“ spricht mit Du und mit Sie', () => {
    expect(massnahmeCodeSatz('kein-zeitpunkt')).toMatch(/Wähle/);
    s.einst.anrede = 'sie'; expect(massnahmeCodeSatz('kein-zeitpunkt')).toMatch(/Wählen Sie/);
  });
});

describe('Aufruf an R: nur Wörter und Zahlen', () => {
  it('sp_massnahme mit festen Wörtern, ganzen Zahlen und Ja/Nein; die Reihe steht nicht im Code', () => {
    const c = massnahmeAufruf({ t0: 170, art: 'beides', log: true, p: 1, d: 0, q: 0, P: 0, D: 1, Q: 1, konst: false, h: 12 }, 12).code;
    expect(c).toContain("sp_massnahme(d$y, 12L, 170L, 'beides', TRUE, 1L, 0L, 0L, 0L, 1L, 1L, FALSE, 12L)");
    expect(c).toMatch(/^tryCatch\(/);
    expect(vorschlagAufruf(12, 170, false).code).toContain('sp_massnahme_vorschlag(d$y, 12L, 170L, FALSE)');
  });
  it('gefährliche Werte (Text statt Zahl, fremdes Wort statt Art) werfen, nichts wird eingesetzt', () => {
    const w: MassnahmeWahl = { t0: 10, art: 'stufe', log: false, p: 0, d: 1, q: 1, P: 0, D: 0, Q: 0, konst: false, h: 5 };
    expect(() => massnahmeAufruf({ ...w, art: "stufe'); system('x" as never }, 1)).toThrow();
    expect(() => massnahmeAufruf({ ...w, t0: '1); system("x")' as never }, 1)).toThrow();
    expect(() => massnahmeAufruf({ ...w, log: 'TRUE' as never }, 1)).toThrow();
    expect(() => massnahmeAufruf({ ...w, p: 1.5 }, 1)).toThrow();
    expect(() => massnahmeAufruf(w, NaN)).toThrow();
    expect(() => vorschlagAufruf(1, Infinity, false)).toThrow();
  });
});

describe('R-Antwort lesen', () => {
  it('alle vier Fälle der Sollwerte: Parameter, Standardfehler, Prognose, Ljung-Box', () => {
    for (const w of WI) {
      const a = antwort(w);
      expect(a.namen).toEqual(w.namen); expect(a.b).toEqual(w.b); expect(a.se).toEqual(w.se); expect(a.pw).toEqual(w.p); expect(a.kiu).toEqual(w.kiu);
      expect(a.mittel.length).toBe(12); expect(a.u95[0]).toBeLessThan(a.mittel[0]!); expect(a.ljung).toEqual({ q: w.ljung.q, h: w.ljung.h, p: w.ljung.p, fitdf: w.ljung.fitdf });
      expect(a.log).toBe(w.log); expect(a.tauglich).toBe(true); expect(a.nobs).toBe(w.nobs);
    }
  });
  it('Fehler: Kennwörter der R-Funktion werden Codes, alles Unbekannte wird r-fehler, nichts wirft', () => {
    for (const c of ['rand', 'log-nicht-positiv', 'nicht-konvergiert']) expect(massnahmeLesen({ fehler: [c] })).toEqual({ ok: false, code: c });
    expect(massnahmeLesen({ fehler: ['Fehler in arima'] })).toEqual({ ok: false, code: 'r-fehler' });
    expect(vorschlagLesen({ fehler: ['alle-gleich'] })).toEqual({ ok: false, code: 'vorschlag-konstant' });
    expect(vorschlagLesen({ fehler: ['zu-kurz'] })).toEqual({ ok: false, code: 'vorschlag-zu-kurz' });
    expect(vorschlagLesen({ fehler: ['luecken-nur-selbst'] })).toEqual({ ok: false, code: 'luecken-nur-selbst' });
    for (const x of [null, undefined, 5, 'x', [], { type: 'null' }, {}, { art: ['stufe'] }]) { expect(massnahmeLesen(x).ok, String(x)).toBe(false); expect(vorschlagLesen(x).ok, String(x)).toBe(false); }
    expect(massnahmeLesen(roh(wirk('seatbelts_stufe'), { mittel: [1, null, 3] })).ok).toBe(false);
    expect(massnahmeLesen(roh(wirk('seatbelts_stufe'), { art: ['nebenher'] })).ok).toBe(false);
  });
  it('fehlende Standardfehler (NA) und fehlende Ljung-Box bleiben lesbar', () => {
    const a = antwort(wirk('seatbelts_stufe'), { se: [null, 0.07, 73.5], ljung: { q: null, h: 24, p: null, fitdf: 2 }, tauglich: [false] });
    expect(a.se[0]).toBeNaN(); expect(a.ljung).toBeNull(); expect(a.tauglich).toBe(false);
    expect(massnahmeLeitplanken({ wahl: wahlVon(wirk('seatbelts_stufe')), antwort: a }, { T: 192 }).map(l => l.code)).toEqual(expect.arrayContaining(['se-fehlt', 'nicht-tauglich']));
    expect(massnahmeHauptsatz({ wahl: wahlVon(wirk('seatbelts_stufe')), antwort: { ...a, se: a.se.map(() => NaN), kiu: a.kiu.map(() => NaN) } }, { name: 'x', zeit: 'z' })).toMatch(/einher\.$/);
  });
  it('Vorschlag lesen: Liste, d und D, Saisonstärke −1 heißt „nicht bestimmt“', () => {
    const l = vorschlagLesen({ n: [169], d: [0], D: [1], kpss: [0.3], staerke: [0.8], saison: [true], geprueft: [40], lp: [1, 2], lq: [0, 1], lP: [0, 0], lQ: [1, 1], lk: [false, true], la: [100.5, 101.2] });
    if (!l.ok) throw new Error('Lesen');
    expect(l.antwort.liste).toEqual([{ p: 1, q: 0, P: 0, Q: 1, konst: false, aicc: 100.5 }, { p: 2, q: 1, P: 0, Q: 1, konst: true, aicc: 101.2 }]); expect(l.antwort.staerke).toBe(0.8);
    const k = vorschlagLesen({ n: [28], d: [1], D: [0], kpss: [0.5], staerke: [-1], saison: [false], geprueft: [12], lp: [0], lq: [1], lP: [0], lQ: [0], lk: [false], la: [300] });
    if (!k.ok) throw new Error('Lesen'); expect(k.antwort.staerke).toBeNull(); expect(vorschlagName(k.antwort, 1)).toBe('ARIMA(0,1,1)');
  });
});

describe('Vorschlag übernehmen', () => {
  const v: VorschlagAntwort = { n: 28, d: 1, D: 0, kpss: 0.5, staerke: null, saison: false, geprueft: 12, liste: [{ p: 0, q: 1, P: 0, Q: 0, konst: true, aicc: 300 }] };
  it('setzt nur die Ordnung; die Konstante bleibt aus; ohne Vorschlag bleibt die Wahl', () => {
    const w: MassnahmeWahl = { t0: 29, art: 'beides', log: true, p: 3, d: 0, q: 3, P: 1, D: 1, Q: 1, konst: true, h: 7 };
    expect(vorschlagUebernehmen(w, v)).toEqual({ t0: 29, art: 'beides', log: true, p: 0, d: 1, q: 1, P: 0, D: 0, Q: 0, konst: false, h: 7 });
    expect(vorschlagUebernehmen(w, { ...v, liste: [] })).toEqual(w);
  });
  it('der Satz nennt Modell, Zahl der Werte davor und dass erst nach dem Übernehmen gerechnet wird; kein Verweis auf Fachblatt', () => {
    const t = vorschlagSatz(v, 1);
    expect(t).toContain('ARIMA(0,1,1)'); expect(t).toContain('28 Werten vor der Maßnahme'); expect(t).toMatch(/erst, wenn der Vorschlag übernommen ist/); expect(t).toMatch(/Konstante/); sauber(t);
    s.einst.sprache = 'en'; const en = vorschlagSatz(v, 1); expect(en).toContain('28 values before the measure'); expect(en).toMatch(/adopted/); expect(en).not.toMatch(/Maßnahme|Werten/);
  });
});

describe('Sätze: „ging … einher“, nie „bewirkte“', () => {
  const ein = { name: '‚Fahrer‘', zeit: 'Februar 1983' };
  it('Stufe (Seatbelts): Rückgang um 323,21 mit Intervall und p; kein „bewirkte“', () => {
    const t = massnahmeHauptsatz(me('seatbelts_stufe'), ein);
    expect(t).toBe('Mit der Maßnahme ab Februar 1983 ging bei ‚Fahrer‘ ein Rückgang des Niveaus um 323,21 einher (95 %-KI [−467,33; −179,09], p < ,001).');
    expect(t).not.toMatch(/bewirk|verursach|führte|Folge/i); sauber(t);
  });
  it('Stufe und Impuls: zwei Sätze, der zweite sagt „einmaliger Rückgang“; nur Impuls: ein Satz mit „einmaliger“', () => {
    const t = massnahmeHauptsatz(me('seatbelts_beides'), ein);
    expect(t).toContain('Rückgang des Niveaus um 317,90 einher'); expect(t).toContain('Zusätzlich ging im Zeitpunkt Februar 1983 selbst ein einmaliger Rückgang um 25,64 einher'); expect(t).toContain('p = ,836'); expect(t).not.toMatch(/bewirk/);
    const w = wirk('seatbelts_beides');
    const nurImpuls = massnahmeHauptsatz({ wahl: { ...wahlVon(w), art: 'impuls' }, antwort: { ...antwort(w), art: 'impuls', namen: ['ar1', 'sma1', 'impuls'], b: [0.6, -0.8, 40], se: [0.06, 0.07, 100], pw: [1e-20, 1e-20, 0.69], kiu: [0.4, -0.9, -150], kio: [0.7, -0.6, 230] } }, ein);
    expect(nurImpuls).toBe('Mit der Maßnahme im Zeitpunkt Februar 1983 ging bei ‚Fahrer‘ ein einmaliger Anstieg um 40,00 einher (95 %-KI [−150,00; 230,00], p = ,690).');
  });
  it('Log-Skala: in Prozent (−20,3 %), Intervall in Prozent; Anstieg bei positivem b', () => {
    const t = massnahmeHauptsatz(me('seatbelts_log'), ein);
    expect(t).toMatch(/Rückgang des Niveaus um 20,3\s%\seinher/); expect(t).toMatch(/KI \[−26,6; −13,4\]/);
    expect(prozentVeraenderung(-0.2268441167542)).toBeCloseTo(-20.3, 1);
    const w = wirk('seatbelts_log');
    expect(massnahmeHauptsatz({ wahl: wahlVon(w), antwort: { ...antwort(w), b: [0.58, -0.82, 0.1], kiu: [0, 0, 0.05], kio: [0, 0, 0.15] } }, ein)).toMatch(/Anstieg des Niveaus um 10,5\s%/);
  });
  it('Nil: Rückgang um 247,73; englisch: „was accompanied by“, kein deutscher Rest, nie „caused“', () => {
    s.einst.sprache = 'en';
    const t = massnahmeHauptsatz(me('nile_stufe_1899'), { name: '‘Flow’', zeit: '1899' });
    expect(t).toBe('The measure from 1899 on was accompanied by a fall in the level of ‘Flow’ by 247.73 (95% CI [−303.18, −192.28], p < .001).');
    expect(t).not.toMatch(/caus|effect of|led to|result/i);
  });
  it('Ljung-Box-Satz und APA-Zeile; Seatbelts: Q(24) = 78,06, df = 22', () => {
    const m = me('seatbelts_stufe');
    expect(massnahmeLjungSatz(m.antwort.ljung!)).toBe('Ljung-Box für die Residuen: Q(24) = 78,06, df = 22, p < ,001. Die Residuen hängen noch zusammen.');
    expect(massnahmeLjungSatz(me('nile_stufe_1899').antwort.ljung!)).toContain('keine deutliche Abhängigkeit');
    const apa = massnahmeApa(m);
    expect(apa).toContain('ARIMA(1,0,0)(0,1,1)[12]'); expect(apa).toContain('Stufe b = −323,21'); expect(apa).toContain('AICc = 2307,58'); expect(apa).toContain('Ljung-Box Q(24) = 78,06, df = 22, p < ,001');
    expect(massnahmeApa(me('seatbelts_log'))).toMatch(/Stufe: −20,3\s%\s95\s%-KI \[−26,6; −13,4\]/);
  });
  it('Modellname: mit Log-Skala und mit Mittelwert', () => {
    expect(massnahmeModellText(me('seatbelts_log').antwort)).toBe('ARIMA(1,0,0)(0,1,1)[12], Log-Skala');
    expect(massnahmeModellText({ ...me('nile_stufe_1899').antwort, d: 0, konst: true })).toBe('ARIMA(0,0,1) mit Mittelwert');
  });
  it('Hilfesatz ohne Verweis auf interne Namen', () => { sauber(massnahmeHilfeSatz()); });
});

describe('Warnungen', () => {
  const codes = (m: MassnahmeE, T = 192, luecken = 0) => massnahmeLeitplanken(m, { T, luecken }).map(l => l.code);
  it('die vier festen Warnungen stehen immer da, in dieser Reihenfolge, zuerst', () => {
    for (const n of ['seatbelts_stufe', 'nile_stufe_1899', 'seatbelts_log']) expect(codes(me(n)).slice(0, 4), n).toEqual(['ursache', 'vergleich', 'zeitpunkt', 'schrittweise']);
  });
  it('ljung schlägt bei Seatbelts an (p < ,001), nicht bei Nil (p = ,18); der Satz nennt zu kleine Standardfehler', () => {
    expect(codes(me('seatbelts_stufe'))).toContain('ljung'); expect(codes(me('nile_stufe_1899'), 100)).not.toContain('ljung');
    const l = massnahmeLeitplanken(me('seatbelts_stufe'), { T: 192 }).find(x => x.code === 'ljung')!;
    expect(l.satz).toContain('p < ,001'); expect(l.satz).toMatch(/Standardfehler sind zu klein/);
  });
  it('nicht-tauglich schlägt an, wenn das Modell am Rand liegt (Nil: ma1 −0,9999), sonst nicht', () => {
    expect(codes(me('nile_stufe_1899', { tauglich: [false] }), 100)).toContain('nicht-tauglich');
    expect(codes(me('seatbelts_stufe'))).not.toContain('nicht-tauglich');
    expect(massnahmeLeitplanken(me('nile_stufe_1899', { tauglich: [false] }), { T: 100 }).find(x => x.code === 'nicht-tauglich')!.satz).toMatch(/Instabilität/);
  });
  it('Lücken, kurze Reihe und Log-Skala melden sich nur, wenn sie zutreffen', () => {
    expect(codes(me('seatbelts_stufe'))).not.toEqual(expect.arrayContaining(['luecken', 'kurz', 'log']));
    expect(codes(me('seatbelts_log'), 40, 3)).toEqual(expect.arrayContaining(['luecken', 'kurz', 'log']));
    const l = massnahmeLeitplanken(me('seatbelts_stufe'), { T: 192, luecken: 1 }).find(x => x.code === 'luecken')!.satz; expect(l).toContain('1 Lücke von 192');
  });
  it('sachlich, ohne Beruhigung, ohne doppelte Sätze und ohne Verweis auf Fachblatt; englisch ohne deutschen Rest', () => {
    const alle = (m: MassnahmeE) => massnahmeLeitplanken(m, { T: 40, luecken: 2 }).map(x => x.satz);
    const de = alle(me('seatbelts_log', { tauglich: [false] }));
    expect(new Set(de).size).toBe(de.length);
    for (const t of de) { sauber(t); expect(t, t).not.toMatch(/keine Sorge|unbedenklich|beruhig/i); expect(t).toMatch(/[.]$/); }
    expect(de.join(' ')).toMatch(/Alles, was zur selben Zeit geschah, steckt mit im Effekt/); expect(de.join(' ')).toMatch(/Ohne Vergleichsgruppe bleibt das offen/);
    s.einst.sprache = 'en'; const en = alle(me('seatbelts_log', { tauglich: [false] }));
    en.forEach((t, i) => { expect(t).not.toBe(de[i]); expect(t).not.toMatch(/Maßnahme|Reihe|Modell|Werte|Zeitpunkt/); });
  });
});

describe('Tabellen und R-Text', () => {
  const ein = { name: '‚Fahrer‘', zeit: 'Februar 1983', zeiten: Array.from({ length: 12 }, (_, i) => `Monat ${i + 1}`), stellen: 0 };
  it('drei Tabellen mit den Beschriftungen für das Blatt; Parameter mit Stufe, p ohne führende Null', () => {
    const t = massnahmeTabellen(me('seatbelts_stufe'), ein);
    expect(t.map(x => x.label)).toEqual([...MASSNAHME_LABELS]);
    const effekt = t[0]!; const stufe = effekt.cells.filter(c => c.t.startsWith('Stufe'));
    expect(stufe.length).toBeGreaterThan(0); expect(effekt.cells.map(c => c.t)).toEqual(expect.arrayContaining(['-323.2112', '73.5321', '-4.40', '< ,001']));
    expect(effekt.title!.t).toContain('ARIMA(1,0,0)(0,1,1)[12]');
    expect(t[1]!.cells.map(c => c.t)).toEqual(expect.arrayContaining(['AICc', '2307.58', 'Ljung-Box Q(24)', '78.06', '22']));
    expect(t[2]!.cells.filter(c => c.t.startsWith('Monat')).length).toBe(12);
    for (const x of t) { x.footnotes.forEach(f => sauber(f.t)); sauber(x.title!.t); }
  });
  it('Log-Skala: zusätzlich „Veränderung in %“ mit Intervall; Fußnote zum Median', () => {
    const t = massnahmeTabellen(me('seatbelts_log'), ein);
    expect(t[0]!.cells.map(c => c.t)).toEqual(expect.arrayContaining(['Stufe: Veränderung in %', '-20.30', '-26.61', '-13.44'])); expect(t[2]!.footnotes.map(f => f.t).join(' ')).toMatch(/Median/);
  });
  it('R-Text: fit$call$xreg gesetzt, newxreg mit denselben Spaltennamen, Stufe bleibt 1 und Impuls 0; Log mit exp()', () => {
    const c = massnahmeRCode(me('seatbelts_beides'), 'fahrer');
    expect(c).toContain('X <- cbind(stufe = as.numeric(seq_len(n) >= 170), impuls = as.numeric(seq_len(n) == 170))');
    expect(c).toContain('fit$call$xreg <- X'); expect(c).toContain('Xn <- cbind(stufe = rep(1, 12), impuls = rep(0, 12))');
    expect(c).toContain('arima(z, order = c(1, 0, 0), seasonal = list(order = c(0, 1, 1), period = 12), xreg = X)'); expect(c).toContain('predict(fit, n.ahead = nrow(Xn), newxreg = Xn)');
    expect(c).not.toMatch(/forecast|lmtest|library/); sauber(c);
    const l = massnahmeRCode(me('seatbelts_log'), 'fahrer'); expect(l).toContain('log(daten$fahrer)'); expect(l).toContain('exp(p$pred)');
    const nur = massnahmeRCode({ wahl: wahlVon(wirk('nile_stufe_1899')), antwort: { ...antwort(wirk('nile_stufe_1899')), art: 'impuls' } }, 'fluss');
    expect(nur).toContain('X <- cbind(impuls = as.numeric(seq_len(n) == 29))'); expect(nur).toContain('Xn <- cbind(impuls = rep(0, 12))'); expect(nur).not.toContain('stufe');
  });
  it('R-Text: ein gefährlicher Spaltenname steht nie roh im Text', () => {
    const c = massnahmeRCode(me('seatbelts_stufe'), 'x`\nassign(".pwned", TRUE)\n#`');
    expect(c).not.toMatch(/^assign/m); expect(c).toContain('daten$`x\\`');
  });
});

describe('am Blatt: Sätze, Tabellen, alte Projektdateien', () => {
  const sp = (name: string, art: 'zahl' | 'datum') => ({ name, bezeichnung: name, art, niveau: 'metrisch' as const, format: art === 'datum' ? 'EDATE10' : 'F8.2', fehlend: [], fehlendText: '', werteLabels: {} });
  const monatsDaten = (n: number, j0 = 1969) => Array.from({ length: n }, (_, i) => `01.${String((i % 12) + 1).padStart(2, '0')}.${j0 + Math.floor(i / 12)}`);
  const blatt = (): ZeitreiheE => {
    const w = wirk('seatbelts_stufe');
    s.spalten = [sp('datum', 'datum'), sp('fahrer', 'zahl')] as never; s.zeilen = monatsDaten(192).map((d, i) => [d, w.y[i]!]) as never;
    const r = zeitreiheErgebnis('fahrer', 'datum'); if (!r.ok) throw new Error('kein Ergebnis');
    return r.e;
  };
  it('der Platz 170 ist Februar 1983 (Platz-Beschriftung); Sätze und Tabellen der Karte enthalten die Maßnahme erst nach dem Klick', () => {
    const e = blatt(); expect(platzLabel(e, 169)).toBe('Februar 1983');
    expect(e.massnahme).toBeUndefined(); expect(massnahmeSaetze(e, 'fahrer')).toBeNull();
    expect(saetzeZeitreihe(e).zusatz).not.toMatch(/Maßnahme/); expect(tabellenZeitreihe(e).map(t => t.label)).not.toEqual(expect.arrayContaining(MASSNAHME_LABELS as string[]));
    const mit: ZeitreiheE = { ...e, massnahme: me('seatbelts_stufe') };
    const sz = saetzeZeitreihe(mit, x => x);
    expect(sz.zusatz).toContain(`Mit der Maßnahme ab Februar 1983 ging bei ${zitat('fahrer')} ein Rückgang des Niveaus um 323,21 einher`); expect(sz.zusatz).toContain('Ljung-Box für die Residuen: Q(24) = 78,06');
    expect(sz.vorsicht).toContain('Ohne Vergleichsgruppe bleibt das offen'); expect(sz.vorsicht).toContain('Standardfehler sind zu klein'); expect(sz.apa).toContain('Stufe b = −323,21');
    expect(sz.zusatz).not.toMatch(/bewirk/); expect(tabellenZeitreihe(mit).map(t => t.label)).toEqual(expect.arrayContaining(MASSNAHME_LABELS as string[]));
  });
  it('beim Neurechnen des Blatts bleibt die Maßnahme, wenn die Reihe dieselbe ist, sonst fällt sie weg', () => {
    const e: ZeitreiheE = { ...blatt(), massnahme: me('seatbelts_stufe') }, neu = blatt();
    expect(prognoseBehalten(e, neu).massnahme).toBeDefined();
    expect(prognoseBehalten(e, { ...neu, y: neu.y.map((v, i) => (i === 5 ? 1 : v)) }).massnahme).toBeUndefined();
    expect(prognoseBehalten(undefined, neu)).toBe(neu);
  });
});
