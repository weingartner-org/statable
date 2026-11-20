import { describe, expect, it } from 'vitest';
import { nlsDaten, nlsCodes, nlsPunkte, nlsLesen, nlsAufruf, nlsWert, nlsKurve, NLS_FORMELN, NLS_PARAMETER, istNlsArt } from './nls';
import { kopiereModell, leereModell, modellGilt, kursModelle, type ModellWahl } from './kategwahl';
import { kopiereZusatz, leereZusatz } from './aequirci';
import type { Spalte } from './verzeichnis';
import type { Wert } from './eingabe';
import ERW from './testdaten/abschluss-erwartet.json';

/* Abschnitt 5 ohne R: Daten, Sperren, Lesen der Antwort, Aufruf (nur feste Wörter), die feste Auswahl der Formeln und das Speichern der Wahl (alte Projekte ohne Formel laden weiter). Die Zahlen gegen die Sollwerte: engine/nls.webr.test.ts. */
const sp = (name: string, o: Partial<Spalte> = {}): Spalte => ({ name, bezeichnung: name, art: 'zahl', niveau: 'metrisch', format: '', fehlend: [], fehlendText: '', werteLabels: {}, ...o });
const tab = (zeilen: Wert[][]) => ({ spalten: [sp('y'), sp('x')], zeilen });
const E = ERW as unknown as { nls: { art: string; x: number[]; y: number[]; b: number[] }[] };

describe('Daten und Sperren', () => {
  it('Lücken fallen heraus und werden gezählt', () => {
    const t = tab([[1, 1], [null, 2], [3, null], [4, 4], [5, 5]]);
    const dt = nlsDaten('y', ['x'], 'potenz', t.zeilen, t.spalten);
    expect(dt.n).toBe(3); expect(dt.ausgelassen).toBe(2); expect(dt.spalten.map(s => s.name)).toEqual(['y', 'p01']);
  });
  it('die Voraussetzungen der Startwerte: x > 0 und y > 0 je nach Formel', () => {
    const t = tab([[1, 0], [2, 1], [3, 2], [4, 3], [5, 4]]);   // x hat eine 0
    expect(nlsCodes(nlsDaten('y', ['x'], 'michaelis', t.zeilen, t.spalten))).toContain('nicht-positiv-x');
    expect(nlsCodes(nlsDaten('y', ['x'], 'potenz', t.zeilen, t.spalten))).toContain('nicht-positiv-x');
    expect(nlsCodes(nlsDaten('y', ['x'], 'exponentiell', t.zeilen, t.spalten))).not.toContain('nicht-positiv-x');
    const u = tab([[0, 1], [2, 2], [3, 3], [4, 4], [5, 5]]);   // y hat eine 0
    for (const a of ['michaelis', 'exponentiell', 'logistisch', 'potenz'] as const) expect(nlsCodes(nlsDaten('y', ['x'], a, u.zeilen, u.spalten)), a).toContain('nicht-positiv-y');
  });
  it('keine freie Formel: ohne Wahl gesperrt; genau eine Zahl als Vorhersage; Text geht nicht', () => {
    const t = tab([[1, 1], [2, 2], [3, 3], [4, 4], [5, 5]]);
    expect(nlsCodes(nlsDaten('y', ['x'], '', t.zeilen, t.spalten))).toEqual(['formel-fehlt']);
    expect(nlsCodes(nlsDaten('y', [], 'potenz', t.zeilen, t.spalten))).toContain('keine-praed');
    expect(nlsCodes(nlsDaten('y', ['x', 'y'], 'potenz', t.zeilen, t.spalten))).toContain('mehrere-praed');
    const tx = { spalten: [sp('y'), sp('x', { art: 'text', niveau: 'nominal' })], zeilen: [[1, 'a'], [2, 'b'], [3, 'c'], [4, 'd']] as Wert[][] };
    expect(nlsCodes(nlsDaten('y', ['x'], 'potenz', tx.zeilen, tx.spalten))).toContain('keine-zahl');
    expect(istNlsArt('y ~ a * x')).toBe(false); expect(NLS_FORMELN).toEqual(['michaelis', 'exponentiell', 'logistisch', 'potenz']);
  });
  it('zu wenige Fälle oder zu wenige verschiedene x-Werte', () => {
    const t = tab([[1, 1], [2, 1], [3, 1], [4, 1], [5, 2]]);
    expect(nlsCodes(nlsDaten('y', ['x'], 'potenz', t.zeilen, t.spalten))).toContain('zu-wenig-faelle');   // 2 verschiedene x, 2 Parameter
    const u = tab([[1, 1], [2, 2], [3, 3]]);
    expect(nlsCodes(nlsDaten('y', ['x'], 'logistisch', u.zeilen, u.spalten))).toContain('zu-wenig-faelle');   // 3 Fälle, 3 Parameter
  });
  it('Der Aufruf enthält nur feste Wörter und Bezeichner; eine Formel außerhalb der Auswahl wirft', () => {
    const t = tab([[1, 1], [2, 2], [3, 3], [4, 4]]);
    for (const a of NLS_FORMELN) expect(nlsAufruf(nlsDaten('y', ['x'], a, t.zeilen, t.spalten)).code).toBe(`tryCatch(sp_nls(d, '${a}', 'p01', 'y'), error = function(e) list(fehler = conditionMessage(e)))`);
    expect(() => nlsAufruf(nlsDaten('y', ['x'], "potenz'); system('x" as never, t.zeilen, t.spalten))).toThrow();
  });
  it('die Prüfliste ist ohne Sperre, wenn alles passt', () => {
    const t = tab([[1, 1], [2, 2], [3, 3], [4, 4]]);
    expect(nlsPunkte(nlsDaten('y', ['x'], 'exponentiell', t.zeilen, t.spalten)).map(p => p.art)).toEqual(['ok']);
  });
});

describe('Antwort lesen', () => {
  const dt = (() => { const t = tab([[1, 1], [2, 2], [3, 3], [4, 4]]); return nlsDaten('y', ['x'], 'potenz', t.zeilen, t.spalten); })();
  const roh = (o: object = {}) => ({ art: 'potenz', start: [1, 1], n: 4, ausgelassen: 0, koef: [{ name: 'a', b: 1, se: 0.1, t: 10, p: 0.001, wald_u: 0.5, wald_o: 1.5, profil_u: null, profil_o: null }, { name: 'b', b: 1, se: 0.1, t: 10, p: 0.001, wald_u: 0.5, wald_o: 1.5, profil_u: 0.6, profil_o: 1.4 }],
    rss: 1, sigma: 0.7, df: 2, aic: 5, profil: false, x: [1, 2, 3, 4], y: [1, 2, 3, 4], angepasst: [1, 2, 3, 4], rest: [0, 0, 0, 0], warnung: false, ...o });
  it('eine gute Antwort', () => { const l = nlsLesen(roh(), dt); expect(l.ok).toBe(true); if (l.ok) { expect(l.e.koef).toHaveLength(NLS_PARAMETER.potenz); expect(l.e.profil).toBe(false); expect(Number.isNaN(l.e.koef[0]!.profilU)).toBe(true); } });
  it('Scheitern ergibt einen Code, nie Zahlen', () => {
    expect(nlsLesen({ fehler: 'nicht-konvergiert' }, dt)).toEqual({ ok: false, code: 'nicht-konvergiert' });
    expect(nlsLesen({ fehler: 'too few cases' }, dt)).toEqual({ ok: false, code: 'zu-wenig-faelle' });
    expect(nlsLesen({ fehler: 'etwas anderes' }, dt)).toEqual({ ok: false, code: 'r-fehler' });
    expect(nlsLesen(null, dt)).toEqual({ ok: false, code: 'r-fehler' });
  });
  it('eine unvollständige Antwort (falsche Parameterzahl, keine Zahl) wird abgelehnt', () => {
    expect(nlsLesen(roh({ koef: [] }), dt).ok).toBe(false);
    expect(nlsLesen(roh({ angepasst: [1, 2] }), dt).ok).toBe(false);
    expect(nlsLesen(roh({ rest: [0, 0, 0, null] }), dt).ok).toBe(false);
  });
});

describe('Kurve', () => {
  it('die vier Formeln an den Stellen von Hand', () => {
    expect(nlsWert('michaelis', [2, 3], 3)).toBeCloseTo(1, 12);
    expect(nlsWert('exponentiell', [2, 0.5], 2)).toBeCloseTo(2 * Math.E, 12);
    expect(nlsWert('logistisch', [4, 2, 5], 5)).toBeCloseTo(2, 12);
    expect(nlsWert('potenz', [3, 2], 2)).toBeCloseTo(12, 12);
  });
  it('die Sollwerte-Parameter reproduzieren Puromycin: Kurve nur innerhalb der Daten', () => {
    const p = E.nls[0]!;
    const e = { art: 'michaelis' as const, x: p.x, koef: p.b.map(b => ({ b })) } as never;
    const k = nlsKurve(e, 50);
    expect(k).toHaveLength(51); expect(k[0]!.x).toBe(Math.min(...p.x)); expect(k.at(-1)!.x).toBe(Math.max(...p.x));
  });
});

describe('Speichern der Wahl', () => {
  it('kursModelle: Zahl-Ziel bietet gewichtet und nichtlinear; zwei Werte nur Probit', () => {
    expect(kursModelle(sp('y'), 40)).toEqual(['wls', 'nls']); expect(kursModelle(sp('y'), 2)).toEqual(['probit']);
    expect(modellGilt({ ...leereModell(), art: 'nls' }, ['linear', 'wls', 'nls'] as never)).toBe('nls');
    expect(modellGilt({ ...leereModell(), art: 'nls' }, [])).toBe('linear');
  });
  it('die Formel bleibt beim Kopieren und im JSON; alte Projekte ohne Formel bleiben, wie sie sind', () => {
    const m: ModellWahl = { ...leereModell(), art: 'nls', formel: 'logistisch' };
    expect(kopiereModell(m)).toEqual(m);
    const z = { ...leereZusatz(), modell: m };
    const hin = JSON.parse(JSON.stringify(kopiereZusatz(z)));
    expect(kopiereZusatz(hin).modell).toEqual(m);
    expect(kopiereModell({ art: 'wls', zaehl: 'auto', zeit: 'w', referenz: '' })).toEqual({ art: 'wls', zaehl: 'auto', zeit: 'w', referenz: '' });   // kein leeres Feld `formel`
    expect(kopiereModell(undefined)).toEqual(leereModell());
    expect('formel' in kopiereModell({ ...leereModell(), art: 'nls' })).toBe(false);
  });
});
