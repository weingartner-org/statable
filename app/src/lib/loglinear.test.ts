import { describe, expect, it } from 'vitest';
import { s } from './sitzung.svelte';
import { sitz } from './kptesthilfe';
import {
  logHuelle, logTerme, logAngebot, logModelleFuerR, logStandardWahl, logWahlBereinigen, logEnthalten, logDaten, logCodes, logCodeSatz, logPunkte, logAufruf, logLesen, logVergleiche,
  logWarnungen, saetzeLog, tabellenLog, logRCode, logModellName, LOG_SPERREN, LOG_ZELLEN_MAX, type LogE, type LogWahl
} from './loglinear';

/* Loglineare Modelle (Fachblatt KURSPAKET, Abschnitt 2): hierarchische Modelle, Zählen mit leeren Zellen, Sperren, Warnsätze, Einlesen der Antwort. Die Rechnung prüft engine/kurspaket.webr.test.ts gegen die Sollwerte. */
s.einst.sprache = 'de'; s.einst.anrede = 'du';

describe('Loglinear: Terme sind hierarchisch', () => {
  it('eine Wechselwirkung bringt ihre Haupteffekte und niedrigeren Wechselwirkungen mit; alle Haupteffekte sind immer dabei', () => {
    expect(logHuelle([[0, 1, 2]], 3)).toEqual([[0], [1], [2], [0, 1], [0, 2], [1, 2], [0, 1, 2]]);
    expect(logHuelle([[1, 2]], 3)).toEqual([[0], [1], [2], [1, 2]]);
    expect(logHuelle([], 2)).toEqual([[0], [1]]);
  });
  it('die Arten: Unabhängigkeit, alle Zweifach, gesättigt, einzelne Wechselwirkungen', () => {
    expect(logTerme({ art: 'unabh', eigen: [] }, 3)).toEqual([[0], [1], [2]]);
    expect(logTerme({ art: 'zwei', eigen: [] }, 3)).toEqual([[0], [1], [2], [0, 1], [0, 2], [1, 2]]);
    expect(logTerme({ art: 'voll', eigen: [] }, 3).length).toBe(7);
    expect(logTerme({ art: 'eigen', eigen: [[0, 1]] }, 3)).toEqual([[0], [1], [2], [0, 1]]);
    expect(logTerme({ art: 'eigen', eigen: [] }, 3)).toEqual([[0], [1], [2]]);
  });
  it('das Angebot zum Ankreuzen: Paare, bei drei und mehr Faktoren auch Dreier; keine Vierer', () => {
    expect(logAngebot(2)).toEqual([[0, 1]]); expect(logAngebot(3).length).toBe(4); expect(logAngebot(4).length).toBe(6 + 4);
    expect(logAngebot(5).every(t => t.length <= 3)).toBe(true);
  });
  it('die Standardwahl: Unabhängigkeit bei zwei Faktoren, sonst alle Zweifach; eine Wahl wird bereinigt (nur Angebotenes, ohne Doppelte, sortiert)', () => {
    expect(logStandardWahl(2).art).toBe('unabh'); expect(logStandardWahl(4).art).toBe('zwei');
    expect(logWahlBereinigen({ art: 'eigen', eigen: [[1, 0], [0, 1], [9, 10], [2]] }, 3)).toEqual({ art: 'eigen', eigen: [[0, 1]] });
    expect(logWahlBereinigen({ art: 'kaputt' as 'zwei' }, 3).art).toBe('zwei'); expect(logWahlBereinigen(undefined, 2).art).toBe('unabh');
  });
  it('R rechnet das gewählte Modell zuerst, dann Unabhängigkeit und alle Zweifach, ohne Doppelte', () => {
    expect(logModelleFuerR({ art: 'zwei', eigen: [] }, 3).map(m => m.art)).toEqual(['zwei', 'unabh']);
    expect(logModelleFuerR({ art: 'eigen', eigen: [[0, 1]] }, 3).map(m => m.art)).toEqual(['eigen', 'unabh', 'zwei']);
    expect(logModelleFuerR({ art: 'voll', eigen: [] }, 2).map(m => m.art)).toEqual(['voll', 'unabh']);   // bei zwei Faktoren ist „alle Zweifach“ schon das gesättigte Modell
  });
  it('enthalten: das einfachere Modell steckt im gewählten', () => {
    expect(logEnthalten(logTerme({ art: 'unabh', eigen: [] }, 3), logTerme({ art: 'zwei', eigen: [] }, 3))).toBe(true);
    expect(logEnthalten(logTerme({ art: 'zwei', eigen: [] }, 3), logTerme({ art: 'unabh', eigen: [] }, 3))).toBe(false);
  });
});

/** Eine Tabelle 2 × 2 × 2 als Zeilen: A, B, C, dazu die Häufigkeit; die Zelle (y, y, y) fehlt (leere Zelle). */
const tab = (mitLeer = true) => {
  const a: string[] = [], b: string[] = [], c: string[] = [], n: number[] = [];
  for (const x of ['ja', 'nein']) for (const y of ['ja', 'nein']) for (const z of ['ja', 'nein']) { a.push(x); b.push(y); c.push(z); n.push(mitLeer && x === 'ja' && y === 'ja' && z === 'ja' ? 0 : 5 + a.length); }
  return sitz({ a, b, c, n }, ['a', 'b', 'c']);
};

describe('Loglinear: Zählen mit leeren Zellen', () => {
  it('die volle Tabelle zählt alle Zellen, auch die leeren (2 × 2 × 2 = 8, eine mit Häufigkeit 0)', () => {
    const q = tab(), d = logDaten(['a', 'b', 'c'], 'n', q.zeilen, q.spalten);
    expect(d.zellen).toBe(8); expect(d.leer).toBe(1); expect(d.stufen).toEqual([2, 2, 2]); expect(d.n).toBe(7 + 8 + 9 + 10 + 11 + 12 + 13);   // die Summe der Häufigkeiten, ohne die leere Zelle
  });
  it('ohne Häufigkeitsspalte zählt jede Zeile als ein Fall; eine fehlende Kombination ist eine leere Zelle', () => {
    const q = tab(), ohne = q.zeilen.filter(z => !(z[0] === 'nein' && z[1] === 'nein' && z[2] === 'nein'));
    const d = logDaten(['a', 'b', 'c'], null, ohne, q.spalten);
    expect(d.zeilen).toBe(7); expect(d.n).toBe(7); expect(d.zellen).toBe(8); expect(d.leer).toBe(1);
  });
  it('Zeilen mit einer Lücke fallen weg; eine Stufe, die nur in solchen Zeilen vorkommt, zählt nicht', () => {
    const q = sitz({ a: ['x', 'y', 'z', 'x'], b: ['u', 'v', 'u', null] }, ['a', 'b']);
    const d = logDaten(['a', 'b'], null, q.zeilen, q.spalten);
    expect(d.zeilen).toBe(3); expect(d.ausgelassen).toBe(1); expect(d.stufen).toEqual([3, 2]); expect(d.zellen).toBe(6); expect(d.leer).toBe(3);
  });
  it('die leeren Zellen werden in der Prüfliste genannt, mit dem Satz, dass sie mitgezählt werden', () => {
    const q = tab(), p = logPunkte(logDaten(['a', 'b', 'c'], 'n', q.zeilen, q.spalten));
    expect(p[0]!.art).toBe('ok'); const h = p.find(x => x.text.includes('leer'))!;
    expect(h.art).toBe('hinweis'); expect(h.text).toContain('1 von 8'); expect(h.klein).toContain('mitgezählt');
  });
});

describe('Loglinear: Sperren', () => {
  const code = (faktoren: string[], haeuf: string | null, cols: Record<string, (number | string | null)[]>, text: string[]) => { const q = sitz(cols, text); return logCodes(logDaten(faktoren, haeuf, q.zeilen, q.spalten)); };
  it('eine Häufigkeit mit Nachkommastellen oder negativ sperrt', () => {
    expect(code(['a', 'b'], 'n', { a: ['x', 'y', 'x', 'y'], b: ['u', 'u', 'v', 'v'], n: [1, 2, 3.5, 4] }, ['a', 'b'])).toContain('haeuf-nicht-ganz');
    expect(code(['a', 'b'], 'n', { a: ['x', 'y', 'x', 'y'], b: ['u', 'u', 'v', 'v'], n: [1, 2, -3, 4] }, ['a', 'b'])).toContain('haeuf-negativ');
  });
  it('weniger als zwei oder mehr als fünf Kategorie-Spalten, die Häufigkeit zugleich als Kategorie, keine Fälle', () => {
    expect(code(['a'], null, { a: ['x', 'y'] }, ['a'])).toContain('faktoren-wenig');
    const sechs = Object.fromEntries(['a', 'b', 'c', 'd', 'e', 'f'].map(n => [n, ['x', 'y', 'x', 'y']]));
    expect(code(Object.keys(sechs), null, sechs, Object.keys(sechs))).toContain('faktoren-viele');
    expect(code(['a', 'n'], 'n', { a: ['x', 'y'], n: [1, 2] }, ['a'])).toContain('haeuf-doppelt');
    expect(code(['a', 'b'], null, { a: [null, null], b: ['u', 'v'] }, ['a', 'b'])).toContain('zu-wenig-faelle');
  });
  it(`über ${LOG_ZELLEN_MAX} Zellen sperrt: 5 Faktoren mit je 12 Stufen sind 248 832 Zellen`, () => {
    const stufen = Array.from({ length: 12 }, (_, i) => `s${i}`), cols = Object.fromEntries(['a', 'b', 'c', 'd', 'e'].map(n => [n, stufen]));
    const q = sitz(cols, Object.keys(cols)), d = logDaten(Object.keys(cols), null, q.zeilen, q.spalten);
    expect(d.zellen).toBe(12 ** 5); expect(logCodes(d)).toContain('zellen-viele'); expect(logCodeSatz('zellen-viele', { zellen: d.zellen }).text).toContain('248');
  });
  it('jede Sperre hat einen Satz; es kommt nie die R-Meldung', () => {
    for (const c of LOG_SPERREN) { const t = logCodeSatz(c, { zellen: 99999, leer: 2, n: 5 }).text; expect(t.length, c).toBeGreaterThan(20); expect(t).not.toMatch(/glm|xtabs|Error/); }
  });
});

const modell = (art: LogWahl['art'], terme: number[][], g2: number, df: number, p: number | null, o: Record<string, number | boolean> = {}) =>
  ({ art, terme, g2, df, p, x2: g2 + 0.5, pX2: p, aic: 100, erwartetMin: 2.5, kleiner5: 0.1, konvergiert: true, ...o });
const e3 = (o: Partial<LogE> = {}): LogE => ({
  faktoren: ['a', 'b', 'c'], haeuf: 'n', stufen: [2, 2, 2], n: 100, ausgelassen: 0, zellen: 8, leer: 0, wahl: { art: 'zwei', eigen: [] },
  modelle: [modell('zwei', logTerme({ art: 'zwei', eigen: [] }, 3), 6.7, 1, 0.66), modell('unabh', logTerme({ art: 'unabh', eigen: [] }, 3), 160.1, 4, 1e-30)], ...o
});

describe('Loglinear: Antwort lesen', () => {
  const dt = () => { const q = tab(); return logDaten(['a', 'b', 'c'], 'n', q.zeilen, q.spalten); };
  const modellRoh = (g2: number, df: number, p: number | null) => ({ g2: [g2], df: [df], p: [p], x2: [g2 + 1], p_x2: [p], aic: [50], erwartet_min: [3], kleiner5: [0.125], konvergiert: [true] });
  it('liest die Modelle in der Reihenfolge des Aufrufs und nimmt p von R', () => {
    const w: LogWahl = { art: 'zwei', eigen: [] };
    const r = logLesen({ n: [100], n_alle: [8], ausgelassen: [0], zellen: [8], leer: [1], stufen: [2, 2, 2], modelle: [modellRoh(6.7, 1, 0.66), modellRoh(160, 4, 1e-30)] }, dt(), w);
    expect(r.ok).toBe(true);
    if (r.ok) { expect(r.e.modelle.map(m => m.art)).toEqual(['zwei', 'unabh']); expect(r.e.modelle[0]!.p).toBe(0.66); expect(r.e.leer).toBe(1); expect(r.e.n).toBe(100); }
  });
  it('das gesättigte Modell (df = 0) hat kein p', () => {
    const r = logLesen({ n: [10], zellen: [4], leer: [0], stufen: [2, 2], modelle: [modellRoh(0, 0, null), modellRoh(5, 1, 0.02)] }, logDaten(['a', 'b'], null, sitz({ a: ['x', 'y'], b: ['u', 'v'] }, ['a', 'b']).zeilen, sitz({ a: ['x', 'y'], b: ['u', 'v'] }, ['a', 'b']).spalten), { art: 'voll', eigen: [] });
    expect(r.ok && r.e.modelle[0]!.p).toBe(null);
  });
  it('Fehler und kaputte Antworten werden zu Codes', () => {
    const w: LogWahl = { art: 'zwei', eigen: [] };
    expect(logLesen({ fehler: ['too many cells'] }, dt(), w)).toEqual({ ok: false, code: 'zellen-viele' });
    expect(logLesen({ fehler: ['negative frequency'] }, dt(), w)).toEqual({ ok: false, code: 'haeuf-negativ' });
    expect(logLesen({ fehler: ['??'] }, dt(), w)).toEqual({ ok: false, code: 'r-fehler' });
    expect(logLesen({ modelle: [] }, dt(), w)).toEqual({ ok: false, code: 'r-fehler' });
    expect(logLesen(null, dt(), w)).toEqual({ ok: false, code: 'r-fehler' });
  });
  it('der Aufruf enthält nur Bezeichner und Zahlen: keine Namen aus der Datei', () => {
    const boese = `a'); system('x'); ('`, q = sitz({ [boese]: ['x', 'y', 'x', 'y'], b: ['u', 'u', 'v', 'v'] }, [boese, 'b']), d = logDaten([boese, 'b'], null, q.zeilen, q.spalten);
    const a = logAufruf(d, { art: 'unabh', eigen: [] });
    expect(a.code).toBe("tryCatch(sp_loglin(d, c('p01', 'p02'), NULL, list(list(c('p01'), c('p02')), list(c('p01'), c('p02'), c('p01', 'p02')))), error = function(e) list(fehler = conditionMessage(e)))");
    expect(logAufruf(logDaten(['a', 'b', 'c'], 'n', tab().zeilen, tab().spalten), { art: 'eigen', eigen: [[0, 1]] }).code).toContain("'h', list(list(c('p01'), c('p02'), c('p03'), c('p01', 'p02')), list(c('p01'), c('p02'), c('p03')), list(c('p01'), c('p02'), c('p03'), c('p01', 'p02'), c('p01', 'p03'), c('p02', 'p03')))");
  });
});

describe('Loglinear: Sätze und Tabellen', () => {
  it('Vergleich mit einfacheren Modellen: Differenz von G² und df, nur für Modelle, die im gewählten stecken', () => {
    const v = logVergleiche(e3());
    expect(v.length).toBe(1); expect(v[0]!.dG2).toBeCloseTo(153.4, 10); expect(v[0]!.dDf).toBe(3); expect(v[0]!.p!).toBeLessThan(1e-20);
    expect(logVergleiche(e3({ modelle: [e3().modelle[1]!, e3().modelle[0]!] }))).toEqual([]);   // das einfachere Modell ist das gewählte: nichts Einfacheres zum Vergleichen
  });
  it('großes p: „widerspricht den Daten nicht“ und der Satz, dass das nichts beweist - die Richtung ist umgekehrt', () => {
    const st = saetzeLog(e3(), x => x);
    expect(st.haupt).toContain('widerspricht den Daten nicht'); expect(st.haupt).not.toContain('beweist nicht'); expect(st.vorsicht).toContain('beweist nicht'); expect(st.vorsicht).toContain('umgekehrt');
    expect(st.zusatz).toContain('Gegen das einfachere Modell'); expect(st.zusatz).toContain('verbessern die Passung');
  });
  it('kleines p: „widerspricht den Daten“, dem Modell fehlt etwas', () => {
    const e = e3({ modelle: [modell('unabh', logTerme({ art: 'unabh', eigen: [] }, 3), 160.1, 4, 1e-30)], wahl: { art: 'unabh', eigen: [] } });
    expect(saetzeLog(e, x => x).haupt).toMatch(/widerspricht den Daten: .*p < ,001/); expect(saetzeLog(e, x => x).haupt).toContain('fehlt etwas');
  });
  it('gesättigtes Modell: df = 0, kein Test, ein Satz', () => {
    const e = e3({ wahl: { art: 'voll', eigen: [] }, modelle: [modell('voll', logTerme({ art: 'voll', eigen: [] }, 3), 0, 0, null), e3().modelle[0]!] });
    const st = saetzeLog(e, x => x);
    expect(st.haupt).toContain('Es gibt keinen Test'); expect(st.haupt).toContain('df = 0'); expect(logWarnungen(e).join(' ')).not.toContain('Ein großes p');
    expect(tabellenLog(e, x => x)[0]!.cells.some(c => c.t === 'df')).toBe(true);
  });
  it('erwartete Häufigkeiten: Anteil der Zellen unter 5 wird genannt; über 20 % oder ein Wert unter 1 macht p unzuverlässig', () => {
    expect(logWarnungen(e3()).join(' ')).toMatch(/unter 5 in 10,0\s?% der Zellen/); expect(logWarnungen(e3()).join(' ')).not.toContain('unzuverlässig');
    const viel = e3({ modelle: [modell('zwei', logTerme({ art: 'zwei', eigen: [] }, 3), 6.7, 1, 0.66, { kleiner5: 0.25 }), e3().modelle[1]!] });
    expect(logWarnungen(viel).join(' ')).toContain('ist p unzuverlässig');
    const klein = e3({ modelle: [modell('zwei', logTerme({ art: 'zwei', eigen: [] }, 3), 6.7, 1, 0.66, { erwartetMin: 0.4 }), e3().modelle[1]!] });
    expect(logWarnungen(klein).join(' ')).toContain('ist p unzuverlässig');
  });
  it('leere Zellen und ausgelassene Zeilen werden genannt', () => {
    const w = logWarnungen(e3({ leer: 3, ausgelassen: 2 })).join(' ');
    expect(w).toContain('3 von 8 Zellen sind leer'); expect(w).toContain('mitgezählt'); expect(w).toContain('2 Zeilen mit einer Lücke');
  });
  it('Tabellen: Passung (gewähltes Modell zuerst), Vergleich, Tabelle; Modellnamen nennen die Wechselwirkungen', () => {
    const e = e3({ wahl: { art: 'eigen', eigen: [[0, 1]] }, modelle: [modell('eigen', logTerme({ art: 'eigen', eigen: [[0, 1]] }, 3), 19.8, 2, 0.18), e3().modelle[1]!] });
    const t = tabellenLog(e, x => x);
    expect(t.map(x => x.label)).toEqual(['Loglinear Modelle', 'Loglinear Vergleich', 'Loglinear Tabelle']);
    expect(logModellName(e.modelle[0]!, e.faktoren, x => x)).toBe('Wechselwirkungen a × b'); expect(t[0]!.cells.find(c => c.r === 1 && c.c === 0)!.t).toContain('►');
  });
  it('R-Text zum Ansehen: Formel mit Wechselwirkungen, Namen maskiert', () => {
    const r = logRCode(['Haar', 'Au ge'], 'Freq', logTerme({ art: 'voll', eigen: [] }, 2));
    expect(r).toContain("xtabs(Freq ~ Haar + `Au ge`, data = daten)"); expect(r).toContain('Freq ~ Haar + `Au ge` + Haar:`Au ge`'); expect(r).toContain('family = poisson');
  });
  it('englisch', () => {
    s.einst.sprache = 'en';
    try { expect(saetzeLog(e3(), x => x).haupt).toContain('does not contradict the data'); } finally { s.einst.sprache = 'de'; }
  });
});
