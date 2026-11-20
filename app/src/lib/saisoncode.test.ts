// Saisonbereinigung nur als R-Code (Fachblatt SAISON-EUROSTAT, Abschnitt 1): Sperren, CSV, R-Text gegen erwartete Zeilen, gefährliche Namen.
// Der R-Text wird hier nur als Text verglichen. Dass das erzeugte Skript mit der erzeugten CSV in R wirklich läuft (AirPassengers: 122,713; 124,766; 125,073),
// wurde einmal von Hand mit Rscript geprüft; das steht im Bericht, nicht in der Suite (kein R in der Suite).
import { afterEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { s } from './sitzung.svelte';
import { saisonCsv, saisonDateien, saisonDateiname, saisonFrequenz, saisonHilfeSatz, saisonRCode, saisonSperre, saisonSperreSatz, saisonStart, saisonVerweisSatz, saisonWarnungen, type SaisonReihe } from './saisoncode';

const sprache = s.einst.sprache;
afterEach(() => { s.einst.sprache = sprache; });

const AP = readFileSync(new URL('./testdaten/airpassengers.csv', import.meta.url), 'utf8').trim().split(/\r?\n/).slice(1).map(z => z.split(','));
const reihe = (n: number, raster: SaisonReihe['raster'] = 'monatlich', erster = '1949-01-01', start = 1): SaisonReihe => ({ raster, erster, t: Array.from({ length: n }, (_, i) => start + i), y: Array.from({ length: n }, (_, i) => 100 + i) });
const ap: SaisonReihe = { raster: 'monatlich', erster: '1949-01-01', t: AP.map((_, i) => i + 1), y: AP.map(z => Number(z[1])) };

describe('Sperren: nur Monats- oder Quartalswerte, keine Lücken, mindestens 3 volle Jahre', () => {
  it('AirPassengers ist frei; Frequenz 12 und 4', () => { expect(saisonSperre(ap)).toBeNull(); expect(saisonFrequenz(ap)).toBe(12); expect(saisonFrequenz(reihe(12, 'vierteljaehrlich'))).toBe(4); });
  it('anderes Raster: jährlich, wöchentlich, täglich, ungleich, Zeilen', () => {
    for (const r of ['jaehrlich', 'woechentlich', 'taeglich', 'ungleich', 'zeilen'] as const) expect(saisonSperre(reihe(100, r)), r).toBe('raster');
  });
  it('Lücken: ein fehlender Wert, NaN, ein Sprung in den Positionen', () => {
    const l = reihe(48); l.y[10] = null; expect(saisonSperre(l)).toBe('luecken');
    const n = reihe(48); n.y[3] = Number.NaN; expect(saisonSperre(n)).toBe('luecken');
    const sprung = reihe(48); sprung.t[20] = 22; expect(saisonSperre(sprung)).toBe('luecken');
    expect(saisonDateien(l, 'x', 'seats')).toBeNull();
  });
  it('mindestens 3 volle Jahre: 36 Monate und 12 Quartale gehen, 35 und 11 nicht', () => {
    expect(saisonSperre(reihe(35))).toBe('zu-kurz'); expect(saisonSperre(reihe(36))).toBeNull();
    expect(saisonSperre(reihe(11, 'vierteljaehrlich'))).toBe('zu-kurz'); expect(saisonSperre(reihe(12, 'vierteljaehrlich'))).toBeNull();
    expect(saisonSperre(reihe(0))).toBe('zu-kurz');
  });
  it('die Reihenfolge der Gründe: Raster vor Lücken vor Länge', () => {
    const r = reihe(5, 'jaehrlich'); r.y[0] = null; expect(saisonSperre(r)).toBe('raster');
    const l = reihe(5); l.y[0] = null; expect(saisonSperre(l)).toBe('luecken');
  });
  it('jeder Grund hat einen Satz in Deutsch und Englisch', () => {
    s.einst.sprache = 'de';
    expect(saisonSperreSatz('raster')).toContain('Monats- oder Quartalswerte'); expect(saisonSperreSatz('luecken')).toContain('ohne Lücken');
    expect(saisonSperreSatz('zu-kurz', { raster: 'monatlich' })).toContain('36 Werte'); expect(saisonSperreSatz('zu-kurz', { raster: 'vierteljaehrlich' })).toContain('12 Werte');
    s.einst.sprache = 'en';
    expect(saisonSperreSatz('raster')).toContain('monthly or quarterly'); expect(saisonSperreSatz('luecken')).toContain('without gaps');
    expect(saisonSperreSatz('zu-kurz', { raster: 'monatlich' })).toContain('36 values');
  });
});

describe('Start und CSV', () => {
  it('Jahr und Periode des ersten Werts: Monat bei Monaten, Quartal bei Quartalen', () => {
    expect(saisonStart(ap)).toEqual({ jahr: 1949, periode: 1 });
    expect(saisonStart(reihe(40, 'monatlich', '2018-07-01'))).toEqual({ jahr: 2018, periode: 7 });
    expect(saisonStart(reihe(40, 'monatlich', '2018-07-01', 5))).toEqual({ jahr: 2018, periode: 11 });   // Position 5 = vier Monate nach dem ersten Datum
    expect(saisonStart(reihe(20, 'vierteljaehrlich', '2020-07-15'))).toEqual({ jahr: 2020, periode: 3 });
    expect(saisonStart(reihe(20, 'vierteljaehrlich', '2020-01-01'))).toEqual({ jahr: 2020, periode: 1 });
    expect(saisonStart(reihe(20, 'vierteljaehrlich', '2020-12-31'))).toEqual({ jahr: 2020, periode: 4 });
    expect(saisonStart(reihe(20, 'jaehrlich'))).toBeNull();
  });
  it('CSV: Kopf zeit,wert; Punkt als Dezimalzeichen; jede Zeile ein Zeitpunkt und ein Wert; AirPassengers wie in der Quelldatei', () => {
    const c = saisonCsv(ap).split('\n');
    expect(c[0]).toBe('zeit,wert'); expect(c.at(-1)).toBe(''); expect(c).toHaveLength(AP.length + 2);
    expect(c.slice(1, -1)).toEqual(AP.map(z => `${z[0]},${z[1]}`));
    const d = reihe(36); d.y = d.y.map((_, i) => i + 0.5); expect(saisonCsv(d).split('\n')[1]).toBe('1949-01-01,0.5'); expect(saisonCsv(d)).not.toContain(';');
    expect(saisonCsv(reihe(36, 'monatlich', '2020-11-01')).split('\n').slice(1, 4)).toEqual(['2020-11-01,100', '2020-12-01,101', '2021-01-01,102']);
  });
});

describe('R-Text: gegen die erwarteten Zeilen', () => {
  const zeilen = (t: string) => t.split('\n');
  it('AirPassengers mit SEATS (Vorgabe): genau diese Zeilen', () => {
    s.einst.sprache = 'de';
    const d = saisonDateien(ap, 'passagiere', 'seats')!;
    expect(d.csvName).toBe('passagiere.csv'); expect(d.bereinigtName).toBe('passagiere-bereinigt.csv'); expect(d.rName).toBe('passagiere-saisonbereinigung.R');
    expect(zeilen(d.r)).toEqual([
      '# Saisonbereinigung mit X-13 (R-Paket seasonal) - erzeugt von Statable, in Statable nicht ausgeführt',
      '# install.packages("seasonal")   # braucht auch x13binary, kommt mit',
      'library(seasonal)',
      "d <- read.csv('passagiere.csv')",
      'y <- ts(d$wert, start = c(1949, 1), frequency = 12)',
      'm <- seas(y)   # bei X-11: seas(y, x11 = "")',
      'summary(m)',
      'plot(m)',
      'bereinigt <- final(m)   # saisonbereinigte Reihe',
      "write.csv(data.frame(zeit = d$zeit, bereinigt = as.numeric(bereinigt)), 'passagiere-bereinigt.csv', row.names = FALSE)",
      ''
    ]);
  });
  it('X-11: seas(y, x11 = "")', () => {
    s.einst.sprache = 'en';
    const r = saisonDateien(ap, 'passagiere', 'x11')!.r;
    expect(zeilen(r)).toContain('m <- seas(y, x11 = "")   # for SEATS: seas(y)');
    expect(r).toContain('# Seasonal adjustment with X-13 (R package seasonal)'); expect(r).toContain('seasonally adjusted series');
  });
  it('Quartale: frequency = 4 und das Startquartal', () => {
    const q = saisonDateien(reihe(20, 'vierteljaehrlich', '2020-07-01'), 'umsatz', 'seats')!;
    expect(q.r).toContain('y <- ts(d$wert, start = c(2020, 3), frequency = 4)');
    expect(q.csv.split('\n')[1]).toBe('2020-07-01,100'); expect(q.csv.split('\n')[2]).toBe('2020-10-01,101');
  });
  it('der Text enthält nur diese Zeilen, in jeder Sprache und für beide Verfahren', () => {
    const fest = [/^# /, /^library\(seasonal\)$/, /^d <- read\.csv\('[A-Za-z0-9_-]+\.csv'\)$/, /^y <- ts\(d\$wert, start = c\(\d{4}, \d{1,2}\), frequency = (12|4)\)$/, /^m <- seas\(y(, x11 = "")?\)   # /, /^summary\(m\)$/, /^plot\(m\)$/, /^bereinigt <- final\(m\)   # /, /^write\.csv\(data\.frame\(zeit = d\$zeit, bereinigt = as\.numeric\(bereinigt\)\), '[A-Za-z0-9_-]+-bereinigt\.csv', row\.names = FALSE\)$/];
    for (const sp of ['de', 'en'] as const) for (const m of ['seats', 'x11'] as const) {
      s.einst.sprache = sp;
      for (const z of zeilen(saisonDateien(ap, 'x', m)!.r).filter(x => x !== '')) expect(fest.some(f => f.test(z)), `${sp} ${m}: ${z}`).toBe(true);
    }
  });
  it('das Skript wird in der App nie ausgeführt: saisoncode.ts und die Oberfläche kennen weder rechne noch evalR noch webR', () => {
    for (const p of ['./saisoncode.ts', '../bausteine/BlattSaison.svelte']) {
      const t = readFileSync(new URL(p, import.meta.url), 'utf8');
      expect(t, p).not.toMatch(/\b(rechne|evalR|evalRVoid|evalRString|RMotor|rverfahren|webr)\b/);
    }
  });
});

describe('Gefährliche Namen: nichts aus den Daten kommt roh in den R-Text', () => {
  const GEFAEHRLICH = ["x'); system('rm -rf /'); ('", 'a`; system("x"); `', 'a\nsystem("x")', '../../etc/passwd', 'C:\\Windows\\x', 'ä ö ü ß', '$(cmd)', '"; q()', '\u202e\u0000', '', '   ', "O'Brien", 'Passagiere (in Tsd.)', '.hidden', '--x'];
  it('der Dateiname besteht nur aus ASCII-Zeichen, Ziffern, Unterstrich und Bindestrich', () => {
    for (const n of GEFAEHRLICH) { const f = saisonDateiname(n); expect(f, JSON.stringify(n)).toMatch(/^[A-Za-z0-9][A-Za-z0-9_-]{0,39}$|^reihe$/); }
    expect(saisonDateiname('ä ö ü ß')).toBe('a_o_u_ss'); expect(saisonDateiname('')).toBe('reihe'); expect(saisonDateiname('Passagiere (in Tsd.)')).toBe('Passagiere_in_Tsd');
  });
  it('jede Zeile des R-Textes bleibt eine der festen Zeilen, auch bei gefährlichen Spaltennamen', () => {
    s.einst.sprache = 'de';
    const basis = saisonDateien(ap, 'x', 'seats')!.r;
    for (const n of GEFAEHRLICH) {
      const d = saisonDateien(ap, n, 'seats')!;
      const z = d.r.split('\n').filter(x => x !== '');
      expect(z, JSON.stringify(n)).toHaveLength(10);
      expect(d.r, JSON.stringify(n)).toBe(basis.replaceAll('x-bereinigt.csv', d.bereinigtName).replaceAll('x.csv', d.csvName));   // nur die beiden Dateinamen unterscheiden sich
      expect(d.csvName).not.toMatch(/[\\/:*?"<>|\s]/); expect(d.rName).not.toMatch(/[\\/:*?"<>|\s]/);
    }
  });
  it('auch wenn ein Dateiname trotzdem Zeichen enthielte: rAnzeigeText maskiert Apostroph, Backslash und Zeilenumbruch', () => {
    const t = saisonRCode({ csvName: "a');system('x\nb\\", bereinigtName: "c'.csv", modell: 'seats', jahr: 2000, periode: 1, frequenz: 12 });
    expect(t).toContain("read.csv('a\\');system(\\'x\\nb\\\\')"); expect(t).toContain("'c\\'.csv'"); expect(t.split('\n').filter(x => x !== '')).toHaveLength(10);
  });
  it('Jahr, Periode und Frequenz sind Zahlen: ein Text wird NA, nie Code', () => {
    const t = saisonRCode({ csvName: 'a.csv', bereinigtName: 'b.csv', modell: 'seats', jahr: '1); system("x")' as unknown as number, periode: Number.NaN, frequenz: 12 });
    expect(t).toContain('start = c(NA, NA)'); expect(t).not.toContain('system');
  });
});

describe('Warnungen und Sätze', () => {
  it('drei Warnungen, immer: Statable rechnet es nicht, Kalender, Modellwahl', () => {
    s.einst.sprache = 'de';
    const w = saisonWarnungen();
    expect(w.map(x => x.code)).toEqual(['nicht-gerechnet', 'kalender', 'modell']);
    expect(w[0]!.satz).toBe('Statable rechnet das nicht. Das Ergebnis entsteht in R auf dem eigenen Rechner, und Statable hat es nicht geprüft.');
    expect(w[1]!.satz).toContain('Österreichische Feiertage sind nicht enthalten'); expect(w[1]!.satz).toContain('ESS-Leitlinien'); expect(w[1]!.satz).toContain('xreg');
    expect(w[2]!.satz).toContain('summary(m)');
    s.einst.sprache = 'en';
    expect(saisonWarnungen()[1]!.satz).toContain('Austrian public holidays are not included');
  });
  it('die Hilfe sagt offen, dass nicht gerechnet wird; die klassische Zerlegung verweist hierher', () => {
    s.einst.sprache = 'de';
    expect(saisonHilfeSatz()).toContain('Statable rechnet keine Saisonbereinigung'); expect(saisonHilfeSatz()).toContain('keine Saisonbereinigung nach X-13');
    expect(saisonVerweisSatz()).toContain('keine Saisonbereinigung nach X-13');
  });
  it('die Hilfesätze und Warnungen nennen keine Datei, kein Fachblatt und keinen internen Namen', () => {
    for (const sp of ['de', 'en'] as const) { s.einst.sprache = sp; const t = [saisonHilfeSatz(), saisonVerweisSatz(), ...saisonWarnungen().map(x => x.satz)].join(' '); expect(t).not.toMatch(/\.md\b|Fachblatt|saisoncode|\.ts\b|\.svelte/); }
  });
});
