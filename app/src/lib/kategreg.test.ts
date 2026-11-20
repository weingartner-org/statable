import { describe, expect, it } from 'vitest';
import {
  katRCode, katDaten, ordAufruf, multAufruf, zaehlAufruf, ordLesen, multLesen, zaehlLesen, katFehlerText,
  zaehlZielPruefung, zeitPruefung, zielStufenPruefung, zaehlVorschlag, ordinalVorschlag, trennungVerdacht, type KatKoef
} from './kategreg';
import type { Spalte } from './verzeichnis';
import type { Wert } from './eingabe';

/* Reine Funktionen von Welle 3 (Rechnung): Daten für R, Aufrufe, Lesen der R-Antwort, Sperren, Hinweise, Vorschläge.
 * Die Zahlen der Rechnung selbst prüft engine/welle3.webr.test.ts gegen R; das Zusammenspiel TS → R → TS engine/kategreg.webr.test.ts. */
const sp = (name: string, o: Partial<Spalte> = {}): Spalte => ({ name, bezeichnung: name, art: 'zahl', niveau: 'metrisch', format: '', fehlend: [], fehlendText: '', werteLabels: {}, ...o });

describe('Zielspalte der Zähldaten-Regression', () => {
  it('ganze Zahlen ab 0 gehen durch', () => { expect(zaehlZielPruefung([0, 1, 2, 7], 'fehltage')).toBeNull(); });
  it('negative Werte: Sperre', () => {
    const b = zaehlZielPruefung([0, 1, -2], 'fehltage')!;
    expect(b.art).toBe('sperre'); expect(b.code).toBe('zaehl-negativ'); expect(b.text).toContain('fehltage'); expect(b.text).toContain('negative Werte');
  });
  it('Werte mit Nachkommastellen: Sperre', () => {
    const b = zaehlZielPruefung([0, 1, 2.5], 'dauer')!;
    expect(b.art).toBe('sperre'); expect(b.code).toBe('zaehl-nicht-ganz');
  });
  it('negativ geht vor nicht ganz', () => { expect(zaehlZielPruefung([-1.5, 2], 'x')!.code).toBe('zaehl-negativ'); });
});

describe('Beobachtungszeit (Offset)', () => {
  it('Werte über 0 gehen durch', () => { expect(zeitPruefung([0.5, 1, 12], 'zeit')).toBeNull(); });
  it('0 oder darunter: Sperre', () => {
    expect(zeitPruefung([1, 0, 3], 'zeit')!.code).toBe('zeit-nicht-positiv');
    expect(zeitPruefung([1, -2], 'zeit')!.art).toBe('sperre');
  });
  it('Spalte fehlt (null) oder ohne gültige Werte: Sperre', () => {
    expect(zeitPruefung(null, 'zeit')!.code).toBe('zeit-fehlt');
    expect(zeitPruefung([], 'zeit')!.code).toBe('zeit-fehlt');
    expect(zeitPruefung([], 'zeit')!.text).toContain('zeit');
  });
});

describe('Zielstufen: Hinweise', () => {
  const st = (...a: number[]) => a.map((anzahl, i) => ({ text: `S${i + 1}`, anzahl }));
  it('drei gut besetzte Stufen: kein Hinweis', () => { expect(zielStufenPruefung('ordreg', st(30, 40, 20))).toEqual([]); });
  it('zwei Stufen: Sperre mit dem Satz zur logistischen Regression, R rechnet nicht', () => {
    const b = zielStufenPruefung('ordreg', st(30, 40));
    expect(b.map(x => x.code)).toEqual(['zwei-stufen']); expect(b[0]!.art).toBe('sperre'); expect(b[0]!.ohneRechnung).toBe(true); expect(b[0]!.text).toContain('logistische Regression');
  });
  it('eine Stufe mit Fällen: Sperre; Stufen ohne Fälle zählen nicht', () => {
    expect(zielStufenPruefung('multreg', st(30, 0, 0))[0]!.art).toBe('sperre');
    expect(zielStufenPruefung('ordreg', st(30, 0, 25, 40)).map(x => x.code)).toEqual([]);   // 3 Stufen mit Fällen, die leere zählt nicht
  });
  it('Stufe unter 5 Fällen: Hinweis mit Namen (Einzahl und Mehrzahl)', () => {
    const e1 = zielStufenPruefung('ordreg', st(30, 4, 40));
    expect(e1.map(x => x.code)).toEqual(['stufe-wenig']); expect(e1[0]!.text).toContain('der Stufe „S2“ (4)');
    const e2 = zielStufenPruefung('ordreg', st(3, 4, 40));
    expect(e2[0]!.text).toContain('den Stufen „S1“ (3) und „S2“ (4)');
  });
  it('genau 5 Fälle sind genug', () => { expect(zielStufenPruefung('ordreg', st(5, 5, 5))).toEqual([]); });
  it('ordinal: mehr als 10 Stufen: Hinweis auf die lineare Regression', () => {
    const e = zielStufenPruefung('ordreg', st(...Array(11).fill(20)));
    expect(e.map(x => x.code)).toEqual(['viele-stufen']);
    expect(zielStufenPruefung('multreg', st(...Array(11).fill(20)))).toEqual([]);
  });
  it('multinomial: unter 10 Fällen je Koeffizient in der kleinsten Kategorie: Faustregel-Hinweis', () => {
    const e = zielStufenPruefung('multreg', st(80, 60, 25), 3);
    expect(e.map(x => x.code)).toEqual(['faelle-je-koeffizient']); expect(e[0]!.text).toContain('„S3“'); expect(e[0]!.text).toContain('Faustregel');
    expect(zielStufenPruefung('multreg', st(80, 60, 30), 3)).toEqual([]);
    expect(zielStufenPruefung('multreg', st(80, 60, 25))).toEqual([]);   // ohne Angabe der Koeffizienten keine Prüfung
  });
});

describe('Vorschlag „sieht nach Zählwerten aus“', () => {
  const rechtsschief = [0, 0, 0, 1, 1, 2, 2, 3, 4, 5, 8, 12, 20];
  it('Nullen und rechtsschief: ja', () => {
    const v = zaehlVorschlag(rechtsschief)!;
    expect(v.schief).toBeGreaterThan(1); expect(v.vieleNullen).toBe(true); expect(v.nullen).toBeCloseTo(3 / 13, 10);
  });
  it('Nullen ab 10 %, aber nicht schief: ja', () => {
    const v = zaehlVorschlag([0, 1, 2, 3, 4, 5, 4, 3, 2, 1, 0, 3, 3, 4, 2])!;
    expect(v.vieleNullen).toBe(true); expect(v.schief).toBeNull();
  });
  it('rechtsschief mit wenigen Nullen (unter 10 %): ja, wegen der Schiefe', () => {
    const w = [0, ...Array(19).fill(0).map((_, i) => 1 + (i % 3)), 40];
    const v = zaehlVorschlag(w)!;
    expect(v.vieleNullen).toBe(false); expect(v.schief).toBeGreaterThan(1);
  });
  it('keine Null: nein', () => { expect(zaehlVorschlag([1, 2, 3, 4, 9, 30, 2, 1])).toBeNull(); });
  it('eine Null, kaum Nullen und nicht schief: nein', () => { expect(zaehlVorschlag([0, 4, 5, 6, 5, 4, 6, 5, 4, 6, 5, 4, 5, 6, 5, 4, 6, 5, 4, 5, 6])).toBeNull(); });
  it('nicht ganzzahlig oder negativ: nein', () => {
    expect(zaehlVorschlag([0, 1.5, 2, 0])).toBeNull(); expect(zaehlVorschlag([0, -1, 2, 0])).toBeNull();
  });
  it('0/1-Spalte ist keine Zählung (logistische Regression): nein', () => { expect(zaehlVorschlag([0, 1, 0, 0, 1, 0, 1, 0, 0, 0])).toBeNull(); });
  it('zu wenige Werte: nein', () => { expect(zaehlVorschlag([0, 5])).toBeNull(); });
  it('nicht bei Niveau „ordinal“ oder „nominal“ (Stufen, keine Zählung)', () => {
    expect(zaehlVorschlag(rechtsschief, 'ordinal')).toBeNull(); expect(zaehlVorschlag(rechtsschief, 'nominal')).toBeNull(); expect(zaehlVorschlag(rechtsschief, 'metrisch')).not.toBeNull();
  });
});

describe('Vorschlag „ordinale Regression“ und Trennungsverdacht', () => {
  it('ordinal mit 3 bis 10 Stufen', () => {
    const o = sp('z', { niveau: 'ordinal' });
    expect([2, 3, 5, 10, 11].map(k => ordinalVorschlag(o, k))).toEqual([false, true, true, true, false]);
    expect(ordinalVorschlag(sp('z', { niveau: 'metrisch' }), 5)).toBe(false);
    expect(ordinalVorschlag(sp('z', { niveau: 'nominal' }), 5)).toBe(false);
  });
  const k = (pIdx: number, effekt: number, se: number): KatKoef => ({ pIdx, stufe: '', b: Math.log(effekt), se, z: 0, p: 1, effekt, kiU: 0, kiO: 0 });
  it('riesige Effekte oder Standardfehler zeigen den Prädiktor an (Konstante nie)', () => {
    expect(trennungVerdacht([k(0, 1.2, 0.3), k(1, 5e5, 40), k(-1, 1e9, 1e4), k(2, 1e-5, 30)])).toEqual([1, 2]);
    expect(trennungVerdacht([k(0, 1.2, 0.3), k(1, 0.9, 0.1)])).toEqual([]);
    expect(trennungVerdacht([k(3, 2, NaN)])).toEqual([3]);
  });
});

describe('Daten für R', () => {
  // Zufriedenheit als Zahl mit Wertelabels (1 = niedrig … 3 = hoch), Wohnort als Text, Alter, Fehltage, Beobachtungszeit; zwei Lücken
  const spalten: Spalte[] = [
    sp('zuf', { niveau: 'ordinal', werteLabels: { '1': 'niedrig', '2': 'mittel', '3': 'hoch', '4': 'sehr hoch' }, fehlend: [9] }),
    sp('ort', { art: 'text', niveau: 'nominal', fehlendText: 'k.A.' }),
    sp('alter'), sp('tage'), sp('zeit')
  ];
  const zeilen: Wert[][] = [
    [3, 'Stadt', 30, 2, 1.5], [1, 'Land', 50, 0, 2], [2, 'Stadt', 41, 5, 0.5], [9, 'Land', 22, 1, 1], [1, 'k.A.', 35, 0, 3], [2, 'Vorort', 28, 3, 4], [3, null, 60, 9, 2]
  ];
  it('ordinal: Ziel als Text, Stufen in der Ordnung von Statable (nach Code, auch „sehr hoch“ ohne Fälle), nie alphabetisch', () => {
    const dt = katDaten('ordreg', 'zuf', ['alter', 'ort'], zeilen, spalten);
    expect(dt.stufen).toEqual(['niedrig', 'mittel', 'hoch', 'sehr hoch']);
    const y = dt.spalten[0]!;
    expect([y.name, y.art]).toEqual(['y', 'text']);
    expect(y.werte).toEqual(['hoch', 'niedrig', 'mittel', null, 'niedrig', 'mittel', 'hoch']);   // 9 = „keine Angabe“
  });
  it('Prädiktoren: Zahl bleibt Zahl, Text wird Faktor mit der alphabetisch ersten Stufe als Vergleich; Namen p01, p02', () => {
    const dt = katDaten('ordreg', 'zuf', ['alter', 'ort'], zeilen, spalten);
    expect(dt.spalten.map(s => `${s.name}:${s.art}`)).toEqual(['y:text', 'p01:zahl', 'p02:faktor']);
    expect(dt.praed).toEqual([{ name: 'alter', art: 'zahl', stufen: [] }, { name: 'ort', art: 'faktor', stufen: ['Land', 'Stadt', 'Vorort'] }]);
    const ort = dt.spalten[2]!;
    expect(ort.werte).toEqual([2, 1, 2, 1, null, 3, null]);   // „k.A.“ und Lücke fehlen
    expect(ort.labels).toEqual([{ wert: 1, label: 'Land' }, { wert: 2, label: 'Stadt' }, { wert: 3, label: 'Vorort' }]);
  });
  it('Zähldaten: Ziel als Zahl, Beobachtungszeit als Spalte „zeit“', () => {
    const dt = katDaten('zaehlreg', 'tage', ['alter'], zeilen, spalten, { zeit: 'zeit' });
    expect(dt.spalten.map(s => `${s.name}:${s.art}`)).toEqual(['y:zahl', 'p01:zahl', 'zeit:zahl']);
    expect(dt.spalten[0]!.werte).toEqual([2, 0, 5, 1, 0, 3, 9]); expect(dt.spalten[2]!.werte).toEqual([1.5, 2, 0.5, 1, 3, 4, 2]); expect(dt.zeit).toBe('zeit'); expect(dt.stufen).toEqual([]);
    expect(katDaten('zaehlreg', 'tage', ['alter'], zeilen, spalten).spalten.map(s => s.name)).toEqual(['y', 'p01']);
  });
  it('Gruppen-Prädiktor aus Zahlen mit Wertelabels: Codes in Statable-Reihenfolge, erste Stufe = kleinster Code', () => {
    const sps = [sp('y'), sp('g', { niveau: 'nominal', werteLabels: { '1': 'Bus', '2': 'Rad', '3': 'Zug' } })];
    const dt = katDaten('zaehlreg', 'y', ['g'], [[1, 3], [2, 1], [3, 2], [4, 3]], sps);
    expect(dt.praed[0]!.stufen).toEqual(['Bus', 'Rad', 'Zug']); expect(dt.spalten[1]!.werte).toEqual([3, 1, 2, 3]);
  });
});

describe('R-Aufrufe', () => {
  const spalten: Spalte[] = [sp('ziel', { art: 'text', niveau: 'ordinal' }), sp('x'), sp('g', { art: 'text', niveau: 'nominal' }), sp('zeit')];
  const zeilen: Wert[][] = [['nie', 1, 'a', 1], ["O'Brien", 2, 'b', 2], ['mäßig', 3, 'a', 3], ['oft \\ ja', 4, 'b', 4]];
  it('ordinal: Stufen nur als gebundenes Argument (Anführungszeichen und Umlaute heil), im Code nur Bezeichner', () => {
    const dt = katDaten('ordreg', 'ziel', ['x', 'g'], zeilen, spalten);
    const a = ordAufruf(dt);
    expect(a.code).toContain("sp_ordreg(d, 'y', c('p01', 'p02'), c('p02'), .sp_arg$stufen)");
    expect(a.args.stufen).toContain("O'Brien"); expect(a.args.stufen).toContain('mäßig'); expect(a.args.stufen).toContain('oft \\ ja');
    expect(a.code).not.toContain("O'Brien"); expect(a.code).not.toContain('mäßig');
    expect(a.code.startsWith('tryCatch(')).toBe(true); expect(a.code).toContain('error = function(e) list(fehler = conditionMessage(e))');
  });
  it('multinomial: Vergleichskategorie als gebundenes Argument', () => {
    const dt = katDaten('multreg', 'ziel', ['x'], zeilen, spalten);
    const a = multAufruf(dt, "O'Brien");
    expect(a.code).toContain("c('p01'), character(0), .sp_arg$referenz, .sp_arg$stufen)");
    expect(a.args.referenz).toBe("O'Brien"); expect(a.code).not.toContain("O'Brien");
  });
  it('Zähldaten: Modell und Beobachtungszeit (oder NULL)', () => {
    const mit = katDaten('zaehlreg', 'x', ['g'], zeilen, spalten, { zeit: 'zeit' }), ohne = katDaten('zaehlreg', 'x', ['g'], zeilen, spalten);
    expect(zaehlAufruf(mit, 'negbin').code).toContain("sp_zaehlreg(d, 'y', c('p01'), c('p01'), 'negbin', 'zeit')");
    expect(zaehlAufruf(ohne).code).toContain("'auto', NULL)");
  });
});

describe('R-Antwort lesen', () => {
  const praed = [{ name: 'alter', art: 'zahl' as const, stufen: [] }, { name: 'ort', art: 'faktor' as const, stufen: ['Land', 'Stadt', 'Vorort'] }];
  const kopf = { ziel: 'zuf', praed };
  const wk = (name: string, b: number, extra: object = {}) => ({ name: [name], b: [b], se: [0.1], z: [b / 0.1], p: [0.01], or: [Math.exp(b)], ki_u: [Math.exp(b - 0.2)], ki_o: [Math.exp(b + 0.2)], ...extra });
  it('ordinal: Koeffizienten werden Prädiktor und Stufe zugeordnet, Brant gelesen', () => {
    const o = ordLesen({
      n: [100], ausgelassen: [3], stufen: ['niedrig', 'mittel', 'hoch'], stufen_n: [30, 40, 30],
      koef: [wk('p01', 0.05), wk('p02Stadt', 0.7), wk('p02Vorort', -0.2)], schwellen: [{ name: ['niedrig|mittel'], theta: [-0.5], se: [0.2] }],
      lr_praed: [{ name: ['p01'], chi2: [9.1], df: [1], p: [0.003] }, { name: ['p02'], chi2: [12], df: [2], p: [0.002] }],
      modelltest: { chi2: [20], df: [3], p: [0.0001] }, loglik: [-100], loglik0: [-110], nagelkerke: [0.21], coxsnell: [0.17],
      brant: { gesamt: { chi2: [4], df: [3], p: [0.26] }, praed: [{ name: ['p01'], chi2: [1], df: [1], p: [0.3] }, { name: ['p02'], chi2: [3], df: [2], p: [0.2] }] }, brant_pruefbar: [true], warnungen: []
    }, kopf);
    expect(o.art).toBe('ordreg'); expect([o.n, o.ausgelassen]).toEqual([100, 3]); expect(o.stufen).toEqual(['niedrig', 'mittel', 'hoch']);
    expect(o.koef.map(k => [k.pIdx, k.stufe])).toEqual([[0, ''], [1, 'Stadt'], [1, 'Vorort']]);
    expect(o.koef[1]!.effekt).toBeCloseTo(Math.exp(0.7), 10);
    expect(o.lr.map(l => [l.pIdx, l.df])).toEqual([[0, 1], [1, 2]]);
    expect(o.schwellen).toEqual([{ name: 'niedrig|mittel', theta: -0.5, se: 0.2 }]);
    expect(o.brant!.gesamt.df).toBe(3); expect(o.brant!.praed.map(z => z.pIdx)).toEqual([0, 1]);
    expect([o.nagelkerke, o.coxSnell]).toEqual([0.21, 0.17]);
  });
  it('ordinal: Brant nicht prüfbar → brant null mit Text', () => {
    const o = ordLesen({ n: [10], ausgelassen: [0], stufen: ['a', 'b', 'c'], koef: [wk('p01', 1)], schwellen: [], lr_praed: [], modelltest: { chi2: [1], df: [1], p: [1] }, loglik: [-1], loglik0: [-2], nagelkerke: [0], coxsnell: [0], brant_fehler: ['a binary split did not converge'], brant_pruefbar: [false] }, kopf);
    expect(o.brant).toBeNull(); expect(o.brantFehler).toBe('a binary split did not converge');
  });
  it('multinomial: Kategorie je Koeffizient, Konvergenz, unsichere LR-Tests', () => {
    const m = multLesen({
      n: [200], ausgelassen: [0], referenz: ['Bus'], kategorien: ['Rad', 'Zug'], stufen_n: [90, 60, 50], konvergiert: [false], n_parameter: [8],
      koef: [wk('(Intercept)', 1, { kategorie: ['Rad'] }), wk('p01', 0.1, { kategorie: ['Rad'] }), wk('p01', 0.3, { kategorie: ['Zug'] })],
      lr_praed: [{ name: ['p01'], chi2: [0], df: [2], p: [1], unsicher: [true] }], modelltest: { chi2: [5], df: [4], p: [0.2], unsicher: [false] }, loglik: [-1], loglik0: [-2], nagelkerke: [0.1], coxsnell: [0.08], warnungen: []
    }, kopf);
    expect(m.referenz).toBe('Bus'); expect(m.kategorien).toEqual(['Rad', 'Zug']); expect(m.konvergiert).toBe(false);
    expect(m.koef.map(k => [k.kategorie, k.pIdx])).toEqual([['Rad', -1], ['Rad', 0], ['Zug', 0]]);
    expect(m.lr[0]!.unsicher).toBe(true); expect(m.modelltest.unsicher).toBe(false);
  });
  it('Zähldaten: negativ-binomial mit θ; Poisson ohne θ; Offset und Nullen', () => {
    const basis = { n: [146], ausgelassen: [0], koef: [wk('p01', -0.1, { irr: [Math.exp(-0.1)] })], lr_praed: [], modelltest: { chi2: [5], df: [1], p: [0.02] }, loglik: [-1], loglik0: [-2], pearson_df: [13.2], nullen: { beobachtet: [0.06], erwartet: [0.01] }, nullen_hinweis: [false], mittelwert: [16], varianz: [250], konvergiert: [true], warnungen: [] };
    const nb = zaehlLesen({ ...basis, modell: ['negbin'], grund: ['ueberdispersion'], theta: [1.27], theta_se: [0.16], theta_am_rand: [false], lr_ueber: { chi2: [1192], p: [0] }, offset: [null] }, kopf);
    expect(nb.modell).toBe('negbin'); expect(nb.theta).toBe(1.27); expect(nb.thetaSe).toBe(0.16); expect(nb.lrUeber).toEqual({ chi2: 1192, p: 0 }); expect(nb.offset).toBeNull(); expect(nb.koef[0]!.effekt).toBeCloseTo(Math.exp(-0.1), 10);
    const po = zaehlLesen({ ...basis, modell: ['poisson'], grund: ['theta_am_rand'], theta: [null], theta_se: [null], theta_am_rand: [true], lr_ueber: { chi2: [0], p: [1] }, offset: ['zeit'] }, kopf);
    expect(po.modell).toBe('poisson'); expect(po.theta).toBeNull(); expect(po.thetaAmRand).toBe(true); expect(po.offset).toBe('zeit'); expect(po.grund).toBe('theta_am_rand'); expect(po.nullen).toEqual({ beobachtet: 0.06, erwartet: 0.01 });
    const ohneNb = zaehlLesen({ ...basis, modell: ['poisson'], grund: ['negbin_fehlt'], theta: [null], theta_se: [null], theta_am_rand: [null], lr_ueber: { chi2: [null], p: [null] }, offset: [null] }, kopf);
    expect(ohneNb.lrUeber).toBeNull();
  });
});

describe('R-Meldungen in Sätze', () => {
  it('die Kurztexte aus statable.R werden zu Sätzen, Fremdes bleibt null', () => {
    expect(katFehlerText('only two levels (two levels: this is a logistic regression)')).toContain('logistischen Regression');
    expect(katFehlerText('polr failed: attempt to find suitable starting values failed')).toBe('Die Schätzung gelingt mit diesen Daten nicht - vermutlich trennt ein Prädiktor die Stufen vollständig.');
    expect(katFehlerText('count outcome must not be negative')).toContain('negative Werte');
    expect(katFehlerText('observation time must be greater than 0')).toContain('größer als 0');
    expect(katFehlerText('one group only')).toBeNull();
    expect(katFehlerText('model did not converge')).toBeNull();
  });
});

describe('R-Aufruf zum Nachrechnen nennt die tatsächlichen Einstellungen', () => {
  const praed = [{ name: 'x', art: 'zahl' as const, stufen: [] }, { name: 'g', art: 'faktor' as const, stufen: ['A', 'B', 'C'] }];
  const id = (de: string) => de;
  it('ordinal: polr mit control (reltol, maxit, ndeps nach Zahl der Parameter), Brant selbst gerechnet', () => {
    const c = katRCode({ art: 'ordreg', ziel: 'y', praed, stufen: ['nie', 'oft', 'immer'] }, id);
    expect(c).toContain('control = list(reltol = 1e-14, maxit = 1000, ndeps = rep(1e-6, 5))');   // 3 Koeffizienten + 2 Schwellen
    expect(c).toContain("levels = c('nie', 'oft', 'immer'), ordered = TRUE"); expect(c).toContain('Brant-Test (1990) rechnet Statable selbst');
  });
  it('multinomial: maxit, reltol, trace; Vergleichskategorie', () => {
    const c = katRCode({ art: 'multreg', ziel: 'v', praed, stufen: ['Bus', 'Rad', 'Zug'], referenz: 'Rad' }, id);
    expect(c).toContain('maxit = 1000, reltol = 1e-12, trace = FALSE'); expect(c).toContain("ref = 'Rad'");
  });
  it('Zähldaten: θ über die Profil-Likelihood statt glm.nb, Offset in der Formel', () => {
    const c = katRCode({ art: 'zaehlreg', ziel: 'tage', praed, stufen: [], modell: 'negbin', zeit: 'wochen' }, id);
    expect(c).toContain('optimize(ll, log(c(1e-3, 1e4)), maximum = TRUE, tol = 1e-10)'); expect(c).toContain('offset(log(wochen))'); expect(c).not.toMatch(/\bglm\.nb\(/);
    expect(katRCode({ art: 'zaehlreg', ziel: 'tage', praed, stufen: [], modell: 'poisson' }, id)).toContain('family = poisson');
  });
});
