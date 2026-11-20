import { describe, expect, it } from 'vitest';
import { s } from './sitzung.svelte';
import { VERFAHREN, type Ctx } from './verfahren';
import { gewichtStatus } from './gewichte';
import { gewichtStellenIds } from './gewichtkarten';
import { kursModelle, modellGilt, zielArt, kopiereModell, leereModell } from './kategwahl';
import { berichtTabellen, saetzeZu, gerechneteN } from './berichtsatz';
import { eigeneTabellen, rechenZusatz, rechenText, istKategReg } from './eigenercode';
import { tabellenDiskr, type DiskrE } from './diskriminanz';
import { tabellenProbit, type ProbitE } from './probit';
import type { Blatt } from './sitzung.svelte';
import type { Spalte } from './verzeichnis';

/* Kurs-Paket (Fachblatt KURSPAKET): die drei Karten, die Wahl bei der Regression, Fallgewicht, Bericht und Export. */
s.einst.sprache = 'de'; s.einst.anrede = 'du';
const karte = (id: string) => VERFAHREN.find(v => v.id === id)!;
const spalte = (o: Partial<Spalte> = {}): Pick<Spalte, 'art' | 'niveau' | 'werteLabels'> => ({ art: 'zahl', niveau: 'metrisch', werteLabels: {}, ...o });

describe('Kurs-Paket: Karten', () => {
  it('die drei Karten gibt es; jede hat Lücken für die Spalten, einen Satz und einen R-Text (kein PSPP-Befehl)', () => {
    for (const id of ['diskriminanz', 'loglinear', 'manova']) {
      const v = karte(id); expect(v, id).toBeTruthy();
      expect(v.satz.length, `${id}: Satzteile`).toBe(v.luecken.filter(l => !l.weg).length + 1);
      expect(v.titel.length).toBeGreaterThan(20); expect(v.beispiel).toMatch(/^z\. B\./);
    }
    expect(karte('diskriminanz').luecken.map(l => [l.schluessel, l.wahl, l.mindestens])).toEqual([['l1', 'eins', undefined], ['l2', 'mehrere', 2]]);
    expect(karte('loglinear').luecken.map(l => [l.schluessel, l.wahl, l.mindestens, l.hoechstens])).toEqual([['l1', 'mehrere', 2, 5], ['l2', 'eins', 0, undefined]]);
    expect(karte('manova').luecken.map(l => [l.schluessel, l.wahl, l.mindestens])).toEqual([['l1', 'mehrere', 2], ['l2', 'eins', undefined]]);
  });
  it('der R-Text vor dem Rechnen maskiert gefährliche Namen und nennt nie ein PSPP-Kommando', () => {
    const c = {} as Ctx, boese = "a`b'); system('x'); ('";
    const t = [karte('diskriminanz').syntax({ l1: ['g'], l2: [boese, 'x2'], l3: [], l4: [] }, c), karte('loglinear').syntax({ l1: [boese, 'b'], l2: [], l3: [], l4: [] }, c), karte('manova').syntax({ l1: [boese, 'y2'], l2: ['g'], l3: [], l4: [] }, c)];
    for (const r of t) { expect(r).not.toMatch(/^(FREQUENCIES|CROSSTABS|T-TEST|ONEWAY|REGRESSION|GLM|LOGISTIC|DISCRIMINANT|MANOVA|LOGLINEAR|COMPUTE)\b/m); expect(r.includes("\\'") || r.includes('\\`'), 'Apostroph bzw. Backtick aus dem Namen ist maskiert').toBe(true); }
    expect(t[0]).toContain('lda(X, g)'); expect(t[1]).toContain('family = poisson'); expect(t[2]).toContain('manova(Y ~ g)');
  });
  it('ohne gewählte Spalten ist der R-Text leer (kein Absturz)', () => {
    const c = {} as Ctx; for (const id of ['diskriminanz', 'loglinear', 'manova']) expect(karte(id).syntax({ l1: [], l2: [], l3: [], l4: [] }, c)).toBe('');
  });
});

describe('Kurs-Paket: Modellwahl bei der Regression', () => {
  it('Probit nur bei einem Ziel mit zwei Werten; gewichtete Regression nur bei einem Zahl-Ziel', () => {
    expect(kursModelle(spalte(), 2)).toEqual(['probit']); expect(zielArt(spalte(), 2)).toBe('binaer');
    expect(kursModelle(spalte(), 40)).toEqual(['wls', 'nls']); expect(kursModelle(spalte({ art: 'text', niveau: 'nominal' }), 3)).toEqual([]);
    expect(kursModelle(spalte({ niveau: 'nominal', werteLabels: { '1': 'a', '2': 'b', '3': 'c' } }), 3)).toEqual([]);
  });
  it('die Wahl gilt nur, wenn sie zum Ziel passt; sonst der Standard', () => {
    expect(modellGilt({ ...leereModell(), art: 'probit' }, ['linear', 'probit'])).toBe('probit'); expect(modellGilt({ ...leereModell(), art: 'probit' }, ['linear'])).toBe('linear');
    expect(kopiereModell({ art: 'wls', zaehl: 'auto', zeit: 'gew', referenz: '' })).toEqual({ art: 'wls', zaehl: 'auto', zeit: 'gew', referenz: '' });
  });
});

describe('Kurs-Paket: Fallgewicht', () => {
  it('Diskriminanz, loglinear, MANOVA, Probit und gewichtete Regression sind mit Fallgewicht gesperrt, bei beiden Arten', () => {
    for (const id of ['diskriminanz:alle', 'loglinear:alle', 'manova:alle', 'vorhersage:probit', 'vorhersage:wls']) for (const art of ['haeufigkeit', 'umfrage'] as const) expect(gewichtStatus(id, art), `${id} ${art}`).toBe('sperren');
  });
  it('die Stellen der Karten', () => {
    for (const id of ['diskriminanz', 'loglinear', 'manova']) expect(gewichtStellenIds({ verfahren: id, art: 'haeufigkeit' })).toEqual([`${id}:alle`]);
    expect(gewichtStellenIds({ verfahren: 'vorhersage', art: 'haeufigkeit', probit: true, logistik: true })).toEqual(['vorhersage:probit']);
    expect(gewichtStellenIds({ verfahren: 'vorhersage', art: 'haeufigkeit', wls: true })).toEqual(['vorhersage:wls']);
    expect(gewichtStellenIds({ verfahren: 'vorhersage', art: 'haeufigkeit' })).toEqual(['vorhersage:linear']);
  });
});

describe('Kurs-Paket: Bericht und Export', () => {
  const leer = (art: string, typ: string, e: unknown): Blatt => ({ id: 'x', titel: 't', art, items: [], ergebnis: { typ, e }, imBericht: true, notiz: '', zeit: 0, syntax: '' } as unknown as Blatt);
  const diskr = { gruppe: 'g', merkmale: ['a', 'b'], n: 30, ausgelassen: 0, k: 2, p: 2, gruppen: [{ name: 'u', n: 15 }, { name: 'v', n: 15 }], eigen: [1.2], anteil: [1], kanon: [0.74], wilks: [0.45], chi: [20], df: [2], pw: [0.0001], standard: [[0.6, 0.5]], zentroide: [[1], [-1]],
    einteilung: { gleich: { tabelle: [[12, 3], [4, 11]], tabelleLoo: [[11, 4], [5, 10]], treffer: 0.77, trefferLoo: 0.7 }, groesse: { tabelle: [[12, 3], [4, 11]], tabelleLoo: [[11, 4], [5, 10]], treffer: 0.77, trefferLoo: 0.7 } }, prior: 'gleich' } as DiskrE;
  it('die Tabellen des Blatts kommen aus dem gespeicherten Ergebnis (Diskriminanz)', () => {
    const t = berichtTabellen(leer('diskriminanz', 'diskriminanz', diskr)); expect(t.map(x => x.label)).toEqual(tabellenDiskr(diskr).map(x => x.label)); expect(saetzeZu(leer('diskriminanz', 'diskriminanz', diskr))!.haupt).toContain('Leave-one-out');
    expect(gerechneteN(leer('diskriminanz', 'diskriminanz', diskr))).toEqual({ n: 30, art: 'personen' });
  });
  it('Probit und gewichtete Regression sind Blätter der Regression, aber mit eigenen Tabellen; Export und Kopfzeile nennen R statt PSPP', () => {
    const p = { ziel: 'y', praed: [{ name: 'x', art: 'zahl', stufen: [] }], ereignis: '1', vergleich: '0', n: 40, ausgelassen: 0, ereignisse: 18, koef: [{ pIdx: -1, stufe: '', b: -1, se: 0.5, z: -2, p: 0.04, kiU: -2, kiO: 0 }, { pIdx: 0, stufe: '', b: 0.4, se: 0.1, z: 4, p: 0.0001, kiU: 0.2, kiO: 0.6 }],
      aic: 50, devianz: 44, nullDevianz: 54, dfRes: 38, dfNull: 39, modelltest: { chi2: 10, df: 1, p: 0.001 }, konvergiert: true, fastTrennbar: false, warnung: false } as ProbitE;
    const b = leer('vorhersage', 'probit', p);
    expect(berichtTabellen(b).map(x => x.label)).toEqual(tabellenProbit(p).map(x => x.label)); expect(istKategReg(b)).toBe(true); expect(eigeneTabellen(b)).toBe(true);
    expect(rechenZusatz([b])).toContain('Probit-Regression mit R'); expect(rechenText([b])).not.toContain('PSPP'); expect(gerechneteN(b)).toEqual({ n: 40, art: 'personen' });
    expect(rechenZusatz([leer('diskriminanz', 'diskriminanz', diskr), leer('loglinear', 'loglinear', {}), leer('manova', 'manova', {})])).toMatch(/Diskriminanzanalyse mit R und MASS.*loglineare Modelle.*MANOVA/);
  });
});
