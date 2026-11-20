import { describe, expect, it } from 'vitest';
import { s } from './sitzung.svelte';
import { sitz, reihe } from './kptesthilfe';
import {
  diskrDaten, diskrCodes, diskrPunkte, diskrCodeSatz, diskrAufruf, diskrLesen, diskrWarnungen, diskrGrundquote, saetzeDiskr, tabellenDiskr, diskrRCode, DISKR_SPERREN,
  type DiskrE
} from './diskriminanz';

/* Diskriminanzanalyse (Fachblatt KURSPAKET, Abschnitt 1): Sperren, Warnsätze, Einlesen der Antwort, Aufruf ohne Namen aus der Datei. Die Rechnung selbst prüft engine/kurspaket.webr.test.ts gegen die Sollwerte. */
s.einst.sprache = 'de'; s.einst.anrede = 'du';

/** 30 Fälle in drei Gruppen zu je 10, zwei Zahlenspalten mit verschiedenen Mustern (kein Zufall). */
const daten = (o: { g?: (string | null)[]; x1?: (number | null)[]; x2?: (number | null)[]; x3?: (number | null)[] } = {}) => {
  const g = o.g ?? Array.from({ length: 30 }, (_, i) => ['a', 'b', 'c'][Math.floor(i / 10)]!);
  const cols: Record<string, (number | string | null)[]> = { g, x1: o.x1 ?? reihe(30, 0, 1, 7), x2: o.x2 ?? reihe(30, 5, 2, 4).map((v, i) => v + (i % 3)) };
  if (o.x3) cols.x3 = o.x3;
  return sitz(cols, ['g']);
};
const dt = (o: Parameters<typeof daten>[0] = {}, merkmale = ['x1', 'x2']) => { const q = daten(o); return diskrDaten('g', merkmale, q.zeilen, q.spalten); };

describe('Diskriminanz: Daten und Sperren', () => {
  it('ohne Probleme: keine Sperre, nur der Hinweis „weniger als 20 Fälle je Spalte“ (30 Fälle, 2 Spalten)', () => {
    const c = diskrCodes(dt());
    expect(c.filter(x => DISKR_SPERREN.has(x))).toEqual([]);
    expect(c).toContain('faelle-je-merkmal');
  });
  it('Fälle mit einer Lücke fallen weg, die Zahl wird genannt (Gruppe und Zahl zählen)', () => {
    const x1 = reihe(30, 0, 1, 7) as (number | null)[], g = Array.from({ length: 30 }, (_, i) => ['a', 'b', 'c'][Math.floor(i / 10)]!) as (string | null)[];
    x1[5] = null; g[12] = null;
    const d = dt({ x1, g });
    expect(d.n).toBe(28); expect(d.ausgelassen).toBe(2);
    const p = diskrPunkte(d);
    expect(p[0]!.art).toBe('ok'); expect(p[0]!.text).toContain('28'); expect(p[0]!.klein).toContain('2');
  });
  it('eine Gruppe mit einem Fall: Sperre mit Satz und Gruppenname', () => {
    const g = Array.from({ length: 30 }, (_, i) => (i === 0 ? 'einzeln' : i < 15 ? 'a' : 'b'));
    const d = dt({ g });
    expect(diskrCodes(d)).toContain('gruppe-ein-fall');
    const p = diskrPunkte(d).find(x => x.art === 'sperre')!;
    expect(p.text).toContain('„einzeln“'); expect(p.text).toContain('einen Fall');
  });
  it('eine Gruppe mit weniger Fällen als Zahlenspalten plus 1: Sperre (3 Spalten, Gruppe mit 3 Fällen)', () => {
    const g = Array.from({ length: 33 }, (_, i) => (i < 3 ? 'klein' : i < 18 ? 'a' : 'b'));
    const q = sitz({ g, x1: reihe(33, 0, 1, 7), x2: reihe(33, 1, 2, 5), x3: reihe(33, 2, 3, 4).map((v, i) => v + (i % 3) * 2) }, ['g']);
    const d = diskrDaten('g', ['x1', 'x2', 'x3'], q.zeilen, q.spalten);
    expect(diskrCodes(d)).toContain('gruppe-klein');
    expect(diskrCodeSatz('gruppe-klein', { p: 3, gruppe: 'klein', gruppeN: 3 }).text).toMatch(/3 Fälle.*mindestens 4/);
  });
  it('eine Spalte ohne Streuung: Sperre; eine Spalte aus anderen berechenbar (Summe): Sperre „kollinear“', () => {
    expect(diskrCodes(dt({ x2: new Array(30).fill(4) }))).toContain('konstant');
    const x1 = reihe(30, 0, 1, 7), x2 = reihe(30, 5, 2, 4).map((v, i) => v + (i % 3));
    const q = daten({ x1, x2, x3: x1.map((v, i) => v + x2[i]!) });
    const d = diskrDaten('g', ['x1', 'x2', 'x3'], q.zeilen, q.spalten);
    expect(d.vollerRang).toBe(false); expect(diskrCodes(d)).toContain('kollinear');
  });
  it('eine Spalte, die nur innerhalb der Gruppen konstant ist (die Gruppe selbst): Sperre „kollinear“', () => {
    const g = Array.from({ length: 30 }, (_, i) => ['a', 'b', 'c'][Math.floor(i / 10)]!);
    const x2 = g.map(v => ({ a: 1, b: 2, c: 3 })[v as 'a']!);   // in jeder Gruppe konstant, zwischen den Gruppen verschieden
    expect(diskrCodes(dt({ x2 }))).toContain('kollinear');
  });
  it('weniger als zwei Zahlenspalten und weniger als zwei Gruppen', () => {
    expect(diskrCodes(dt({}, ['x1']))).toContain('merkmale-wenig');
    expect(diskrCodes(dt({ g: new Array(30).fill('a') }))).toContain('gruppen-wenig');
  });
  it('jede Sperre hat einen Satz mit dem Grund, nie die R-Meldung', () => {
    for (const c of DISKR_SPERREN) { const t = diskrCodeSatz(c, { n: 5, p: 2, namen: ['x'], gruppe: 'g', gruppeN: 1 }).text; expect(t.length, c).toBeGreaterThan(20); expect(t).not.toMatch(/MASS|lda\(|Error|rank =/); }
  });
});

describe('Diskriminanz: Aufruf', () => {
  it('der Code enthält nur feste Wörter und Statables Namen; Gruppen gehen als Argument, nie in den Code', () => {
    const boese = `x1'); system('echo pwned'); ('`;
    const q = sitz({ g: ['a', 'b', 'a', 'b'].map(v => v + `'); system('x`), [boese]: [1, 2, 3, 4], x2: [2, 1, 4, 3] }, ['g']);
    const d = diskrDaten('g', [boese, 'x2'], q.zeilen, q.spalten);
    const a = diskrAufruf(d);
    expect(a.code).toBe("tryCatch(sp_diskr(d, 'g', c('p01', 'p02'), .sp_arg$stufen), error = function(e) list(fehler = conditionMessage(e)))");
    expect(a.code).not.toContain('system'); expect(a.args.stufen).toEqual(d.stufen);
    expect(d.stufen.some(t => t.includes('system'))).toBe(true);
  });
  it('R-Text zum Ansehen: lda ohne prior für Funktionen, prior nur bei der Einteilung; Namen aus den Daten sind maskiert', () => {
    const r = diskrRCode('Gruppe `x`', ['a b', 'c'], 'groesse');
    expect(r).toContain('f <- lda(X, g)\n'); expect(r).toContain('lda(X, g, prior = pr, CV = TRUE)'); expect(r).toContain('predict(f, X, prior = pr)');
    expect(r).toContain('as.numeric(table(g)) / length(g)'); expect(r).toContain("c('a b', 'c')"); expect(r).toContain('daten$`Gruppe \\`x\\``');
    expect(diskrRCode('g', ['a', 'b'], 'gleich')).toContain('rep(1 / nlevels(g), nlevels(g))');
  });
});

const einteilung = (t: number) => ({ tabelle: [[8, 1, 1], [1, 7, 2], [0, 2, 8]], tabelle_loo: [[7, 2, 1], [1, 6, 3], [1, 2, 7]], treffer: [t], treffer_loo: [t - 0.1] });
const roh = (over: Record<string, unknown> = {}): Record<string, unknown> => ({
  n: [30], n_alle: [32], ausgelassen: [2], p: [2], k: [3], gruppen: ['a', 'b', 'c'], gruppen_n: [10, 10, 10], eigen: [2.5, 0.5], anteil: [0.8333, 0.1667], kanon: [0.85, 0.58],
  wilks: [0.2, 0.67], chi: [40, 10], df: [4, 1], pw: [1e-7, 0.01], standard: [[0.7, -0.4], [0.3, 0.9]], zentroide: [[1, 0], [0, 1], [-1, -1]], gleich: einteilung(0.8), groesse: einteilung(0.75), ...over
});
const lesen = (o: Record<string, unknown> = {}): DiskrE => { const r = diskrLesen(roh(o), dt()); if (!r.ok) throw new Error(r.code); return r.e; };

describe('Diskriminanz: Antwort lesen', () => {
  it('liest Eigenwerte, Wilks, Koeffizienten, Zentroide und beide Einteilungen; die Wahl beginnt bei „gleich“', () => {
    const e = lesen();
    expect(e.eigen).toEqual([2.5, 0.5]); expect(e.k).toBe(3); expect(e.p).toBe(2); expect(e.prior).toBe('gleich');
    expect(e.standard.length).toBe(2); expect(e.zentroide.length).toBe(3); expect(e.einteilung.groesse.treffer).toBe(0.75); expect(e.gruppen.map(g => g.n)).toEqual([10, 10, 10]);
  });
  it('eine Funktion (zwei Gruppen): Zahlen der Länge 1 werden gelesen', () => {
    const e = lesen({ k: [2], gruppen: ['a', 'b'], gruppen_n: [15, 15], eigen: [3.4], anteil: [1], kanon: [0.88], wilks: [0.22], chi: [100], df: [2], pw: [1e-20], standard: [[0.5, 0.4]], zentroide: [[1.8], [-1.8]] });
    expect(e.eigen.length).toBe(1); expect(e.standard[0]!.length).toBe(2);
  });
  it('Fehler und kaputte Antworten werden zu Codes, nie zu einem Absturz', () => {
    expect(diskrLesen({ fehler: ['kollinear'] }, dt())).toEqual({ ok: false, code: 'kollinear' });
    expect(diskrLesen({ fehler: ['zu-wenig'] }, dt())).toEqual({ ok: false, code: 'zu-wenig-faelle' });
    expect(diskrLesen({ fehler: ['irgendwas'] }, dt())).toEqual({ ok: false, code: 'r-fehler' });
    expect(diskrLesen(null, dt())).toEqual({ ok: false, code: 'r-fehler' });
    expect(diskrLesen(roh({ eigen: [] }), dt())).toEqual({ ok: false, code: 'r-fehler' });
    expect(diskrLesen(roh({ standard: [[1, 2]] }), dt())).toEqual({ ok: false, code: 'r-fehler' });
    expect(diskrLesen(roh({ gleich: {} }), dt())).toEqual({ ok: false, code: 'r-fehler' });
  });
});

describe('Diskriminanz: Sätze, Warnungen, Tabellen', () => {
  it('die Hinweise zur Deutung stehen immer: gelernte Quote zu gut, Leave-one-out maßgeblich, Voraussetzungen ohne Test, willkürliches Vorzeichen', () => {
    const w = diskrWarnungen(lesen()).join(' ');
    expect(w).toContain('zu gut'); expect(w).toContain('Leave-one-out'); expect(w).toContain('Kovarianzen'); expect(w).toContain('nicht mit einem Test'); expect(w).toContain('Vorzeichen'); expect(w).toContain('willkürlich');
    expect(w).toContain('2 Zeilen mit einer Lücke');
  });
  it('Hinweis „instabil“ nur unter 20 Fällen je Spalte', () => {
    expect(diskrWarnungen(lesen()).join(' ')).toContain('instabil');
    expect(diskrWarnungen(lesen({ n: [40], p: [2] })).join(' ')).not.toContain('instabil');
  });
  it('der Hauptsatz nennt die Leave-one-out-Quote neben der Quote ohne Rechnung (größte Gruppe), die gelernte Quote steht im Zusatz, das „zu gut“ nur einmal in den Hinweisen', () => {
    const e = lesen(), st = saetzeDiskr(e, x => x);
    expect(diskrGrundquote(e)).toBeCloseTo(1 / 3, 10);
    expect(st.haupt).toContain('Leave-one-out'); expect(st.haupt).toMatch(/70,0\s?%/); expect(st.haupt).toMatch(/33,3\s?%/);
    expect(st.zusatz).toContain('Gelernt'); expect(st.zusatz).not.toContain('zu gut'); expect(st.vorsicht).toContain('zu gut'); expect(st.zusatz).toContain('gleich'); expect(st.vorsicht).toContain('Vorzeichen'); expect(st.apa).toContain('Λ');
  });
  it('die Wahl „nach Gruppengröße“ ändert Quote und Satz, nicht die Funktionen', () => {
    const a = lesen(), b = { ...a, prior: 'groesse' as const };
    expect(saetzeDiskr(b, x => x).haupt).not.toBe(saetzeDiskr(a, x => x).haupt); expect(saetzeDiskr(b, x => x).zusatz).toContain('Größe');
    expect(tabellenDiskr(a)[2]!.cells.map(c => c.t)).toEqual(tabellenDiskr(b)[2]!.cells.map(c => c.t));
  });
  it('sieben Tabellen; die Einteilung zählt je Zeile die Fälle der Gruppe, Leave-one-out steht daneben', () => {
    const t = tabellenDiskr(lesen(), x => x);
    expect(t.map(x => x.label)).toEqual(['Diskriminanz Eigenwerte', 'Diskriminanz Wilks', 'Diskriminanz Koeffizienten', 'Diskriminanz Zentroide', 'Diskriminanz Einteilung', 'Diskriminanz Leave-one-out', 'Diskriminanz Trefferquote']);
    const ein = t[4]!; expect(ein.cells.filter(c => c.r === 1).map(c => c.t)).toEqual(['a', '8', '1', '1', '10', '80.0']);
    expect(t[6]!.cells.filter(c => c.c === 0).map(c => c.t)).toEqual([expect.stringContaining('Quote'), expect.stringContaining('Gelernt'), expect.stringContaining('Leave-one-out'), expect.stringContaining('Ohne Rechnung')]);
  });
  it('englisch: dieselben Sätze in Englisch', () => {
    s.einst.sprache = 'en';
    try { const st = saetzeDiskr(lesen(), x => x); expect(st.haupt).toContain('leave-one-out'); expect(st.vorsicht).toContain('arbitrary'); expect(tabellenDiskr(lesen())[0]!.title!.t).toBe('Eigenvalues of the functions'); }
    finally { s.einst.sprache = 'de'; }
  });
});
