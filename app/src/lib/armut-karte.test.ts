import { describe, expect, it } from 'vitest';
import { s } from './sitzung.svelte';
import type { Blatt } from './sitzung.svelte';
import { VERFAHREN, type Ctx } from './verfahren';
import { gewichtStatus } from './gewichte';
import { gewichtStellenIds } from './gewichtkarten';
import { berichtTabellen, saetzeZu, gerechneteN } from './berichtsatz';
import { eigeneTabellen, rechenZusatz, rechenText } from './eigenercode';
import { werteVon } from './blatttitel';
import { ASSISTENTEN } from './datenassistenten';
import { armutDaten, armutPunkte, armutLesen, armutAufruf, armutRCode, armutGewaehlt, saetzeArmut, tabellenArmut, ARMUT_ANTEILE, ARMUT_KLEIN, type ArmutE } from './armut';
import { sitz, reihe } from './kptesthilfe';

/* Abschnitt 3 (Armut und Ungleichheit): die Karte, Sperren aus den Daten, Fallgewicht, Bericht und Export. Die Zahlen aus R stehen in engine/armut.webr.test.ts. */
s.einst.sprache = 'de'; s.einst.anrede = 'du';
const karte = VERFAHREN.find(v => v.id === 'armut')!;

describe('Armut: Karte', () => {
  it('vier Lücken: Einkommen und Gewicht Pflicht, Klumpen und Schicht wahlweise mit „ohne“; der Satz hat eine Lücke weniger als Teile', () => {
    expect(karte.luecken.map(l => [l.schluessel, l.wahl, l.mindestens])).toEqual([['l1', 'eins', undefined], ['l2', 'eins', undefined], ['l3', 'eins', 0], ['l4', 'eins', 0]]);
    expect(karte.luecken[2]!.ohne).toMatch(/einzeln gezogen/); expect(karte.satz.length).toBe(karte.luecken.length + 1); expect(karte.beispiel).toMatch(/^z\. B\./);
  });
  it('der R-Text vor dem Rechnen: svydesign und Formel, Spaltennamen maskiert, kein PSPP-Befehl', () => {
    const boese = "a`b'); system('x'); ('";
    const t = karte.syntax({ l1: [boese], l2: ['w'], l3: ['k'], l4: ['s'] }, {} as Ctx);
    expect(t).toContain('svydesign(ids = ~k, strata = ~s, weights = ~w, data = daten, nest = TRUE)'); expect(t).toContain('svymean(~arm'); expect(t).toContain('<');
    expect(t.includes("\\'") || t.includes('\\`')).toBe(true); expect(t).not.toMatch(/^(FREQUENCIES|DESCRIPTIVES|COMPUTE)\b/m);
    expect(armutRCode('e', 'w', null, null)).toContain('ids = ~1, weights = ~w'); expect(armutRCode('e', 'w', null, 's')).toContain('strata = ~s');
    expect(karte.syntax({ l1: [], l2: [], l3: [], l4: [] }, {} as Ctx)).toBe('');
  });
  it('die vier Plätze eines gespeicherten Blatts (Einkommen, Gewicht, Klumpen, Schicht; leer = \'\')', () => {
    const b = (l3: string[]) => ({ art: 'armut', l1: l3[0] ?? null, l2: l3[1] ?? null, l3 }) as unknown as Blatt;
    expect(werteVon(b(['e', 'w', '', '']))).toEqual({ l1: ['e'], l2: ['w'], l3: [], l4: [] });
    expect(werteVon(b(['e', 'w', 'k', '']))).toEqual({ l1: ['e'], l2: ['w'], l3: ['k'], l4: [] });
    expect(werteVon(b(['e', 'w', '', 's']))).toEqual({ l1: ['e'], l2: ['w'], l3: [], l4: ['s'] });
  });
  it('der Assistent „Indexzahlen“ steht in der Liste der Daten-Assistenten', () => { expect(ASSISTENTEN.map(a => a.id)).toContain('index'); });
});

describe('Armut: Sperren und Hinweise aus den Daten', () => {
  const arten = (q: ReturnType<typeof sitz>, ...a: [string, string, string | null, string | null]) => armutPunkte(armutDaten(...a, q.zeilen, q.spalten)).map(p => p.art + ':' + p.text.slice(0, 12));
  it('Fälle ohne Wert fallen heraus (gezählt), Gewicht 0 geht nicht ein, negatives Gewicht sperrt, gleiche Spalte sperrt', () => {
    const q = sitz({ e: [10, null, 30, 40], w: [1, 1, 0, -1] });
    const dt = armutDaten('e', 'w', null, null, q.zeilen, q.spalten);
    expect([dt.n, dt.ausgelassen, dt.gewichtNull, dt.gewichtNegativ]).toEqual([2, 1, 1, 1]);
    expect(armutPunkte(dt).some(p => p.art === 'sperre' && /negativ/.test(p.text))).toBe(true);
    expect(armutPunkte(armutDaten('e', 'e', null, null, q.zeilen, q.spalten)).some(p => p.art === 'sperre' && /vier verschiedene/.test(p.text))).toBe(true);
  });
  it('negative Einkommen und Nullen werden nicht gelöscht, aber gemeldet; unter 200 Fällen steht der Hinweis', () => {
    const q = sitz({ e: [-5, 0, 10, 20, 30], w: [1, 1, 1, 1, 1] });
    const dt = armutDaten('e', 'w', null, null, q.zeilen, q.spalten);
    expect([dt.n, dt.negativ, dt.nullen]).toEqual([5, 1, 1]);
    const p = armutPunkte(dt);
    expect(p.filter(x => x.art === 'hinweis').length).toBe(3); expect(p.filter(x => x.art === 'sperre').length).toBe(0);
    expect(ARMUT_KLEIN).toBe(200);
  });
  it('ein Klumpen und Schichten mit einem Klumpen oder einem Fall sperren', () => {
    const ein = sitz({ e: [1, 2, 3], w: [1, 1, 1], k: ['a', 'a', 'a'] }, ['k']);
    expect(arten(ein, 'e', 'w', 'k', null).some(x => x.startsWith('sperre'))).toBe(true);
    const duenn = sitz({ e: [1, 2, 3, 4], w: [1, 1, 1, 1], k: ['a', 'b', 'c', 'c'], s: ['x', 'x', 'y', 'y'] }, ['k', 's']);
    expect(armutDaten('e', 'w', 'k', 's', duenn.zeilen, duenn.spalten).duenneSchichten).toBe(1);
    const gut = sitz({ e: reihe(8, 1, 1, 8), w: reihe(8, 1, 0, 1), k: ['a', 'b', 'c', 'd', 'a', 'b', 'c', 'd'], s: ['x', 'x', 'y', 'y', 'x', 'x', 'y', 'y'] }, ['k', 's']);
    expect(armutDaten('e', 'w', 'k', 's', gut.zeilen, gut.spalten).duenneSchichten).toBe(0);
    expect(armutDaten('e', 'w', 'k', 's', gut.zeilen, gut.spalten).spalten.map(c => c.name)).toEqual(['e', 'w', 'k', 's']);
  });
  it('der Aufruf an R enthält nur feste Wörter und Wahrheitswerte; die Anteile stehen als Vorgabe in R', () => {
    const q = sitz({ e: [1, 2, 3], w: [1, 1, 1], k: ['a', 'b', 'a'] }, ['k']);
    expect(armutAufruf(armutDaten('e', 'w', 'k', null, q.zeilen, q.spalten)).code).toBe('tryCatch(sp_armut(d, TRUE, FALSE), error = function(e) list(fehler = conditionMessage(e)))');
    expect(ARMUT_ANTEILE).toEqual([0.4, 0.5, 0.6, 0.7]);
  });
});

describe('Armut: Antwort von R lesen', () => {
  const dt = armutDaten('e', 'w', null, null, sitz({ e: [1, 2, 3], w: [1, 1, 1] }).zeilen, sitz({ e: [1], w: [1] }).spalten);
  const q = (a: number) => ({ anteil: [a], schwelle: [a * 10], quote: [a * 20], se: [0.5] });
  const roh = (o = {}) => ({ n: [3], summe_w: [3], median: [10], q20: [5], q80: [15], quoten: ARMUT_ANTEILE.map(q), s80s20: [4], gini: [26], gini_se: [0.3], nullen: [0], negativ: [0], ...o });
  it('eine vollständige Antwort wird gelesen; die Schwelle gilt für den gewählten Anteil (Vorgabe 60 %)', () => {
    const r = armutLesen(roh(), dt); expect(r.ok).toBe(true);
    if (r.ok) { expect(armutGewaehlt(r.e).anteil).toBe(0.6); expect(armutGewaehlt({ ...r.e, anteil: 0.4 }).anteil).toBe(0.4); expect(r.e.gini).toBe(26); }
  });
  it('Gini und S80/S20 dürfen fehlen (negatives Einkommen); Gini ohne Standardfehler ist ein Fehler', () => {
    const r = armutLesen(roh({ s80s20: null, gini: null, gini_se: null }), dt); expect(r.ok).toBe(true); if (r.ok) expect([r.e.gini, r.e.s80s20, r.e.giniSe]).toEqual([null, null, null]);
    expect(armutLesen(roh({ gini_se: null }), dt)).toEqual({ ok: false, code: 'r-fehler' });
  });
  it('Fehler aus R werden zu Codes; eine Schicht mit einem Klumpen heißt so', () => {
    expect(armutLesen({ fehler: ['Stratum (3) has only one PSU at stage 1'] }, dt)).toEqual({ ok: false, code: 'einzel-psu' });
    expect(armutLesen({ fehler: ['zu-wenig'] }, dt)).toEqual({ ok: false, code: 'zu-wenig-faelle' });
    expect(armutLesen({ fehler: ['irgendwas'] }, dt)).toEqual({ ok: false, code: 'r-fehler' });
    expect(armutLesen(null, dt)).toEqual({ ok: false, code: 'r-fehler' });
  });
});

describe('Armut: Fallgewicht, Bericht und Export', () => {
  const e: ArmutE = { einkommen: 'e', gewicht: 'w', klumpen: 'k', schicht: 's', n: 150, ausgelassen: 0, gewichtNull: 0, summeW: 1e5, nullen: 0, negativ: 0, median: 18000, q20: 9000, q80: 30000,
    quoten: ARMUT_ANTEILE.map(a => ({ anteil: a, schwelle: a * 18000, quote: 10 + a * 10, se: 0.5 })), s80s20: 4, gini: 26, giniSe: 0.3, klumpenN: 20, schichtN: 5, anteil: 0.6 };
  const blatt = { id: 'x', titel: 't', art: 'armut', items: [], ergebnis: { typ: 'armut', e }, imBericht: true, notiz: '', zeit: 0, syntax: '' } as unknown as Blatt;
  it('mit Fallgewicht gesperrt (das Gewicht gehört zur Karte), bei beiden Arten', () => {
    for (const art of ['haeufigkeit', 'umfrage'] as const) expect(gewichtStatus('armut:alle', art)).toBe('sperren');
    expect(gewichtStellenIds({ verfahren: 'armut', art: 'haeufigkeit' })).toEqual(['armut:alle']);
  });
  it('Tabellen und Sätze kommen aus dem gespeicherten Ergebnis; Export und Kopfzeile nennen R statt PSPP', () => {
    expect(berichtTabellen(blatt).map(x => x.label)).toEqual(tabellenArmut(e).map(x => x.label));
    const sz = saetzeZu(blatt)!; expect(sz.haupt).toContain('festen Schwelle'); expect(sz.zusatz).toContain('Entwurf'); expect(sz.vorsicht).toContain('Äquivalenzskala');
    expect(gerechneteN(blatt)).toEqual({ n: 150, art: 'faelle' }); expect(eigeneTabellen(blatt)).toBe(true);
    expect(rechenZusatz([blatt])).toContain('Armut und Ungleichheit mit R und survey'); expect(rechenText([blatt])).not.toContain('PSPP');
  });
  it('eine andere Schwelle ändert nur die Quote, nicht Median, S80/S20 und Gini', () => {
    const a = saetzeArmut(e), b = saetzeArmut({ ...e, anteil: 0.5 });
    expect(a.haupt).not.toBe(b.haupt); expect(a.zusatz).toBe(b.zusatz); expect(a.haupt).toContain('60'); expect(b.haupt).toContain('50');
  });
  it('die Warnungen stehen immer da; „unter 200 Fällen“ nur bei wenigen Fällen', () => {
    const w = (n: number) => saetzeArmut({ ...e, n }).vorsicht;
    for (const n of [150, 5000]) { expect(w(n)).toContain('Äquivalenzskala'); expect(w(n)).toContain('relative Armutsgefährdung'); expect(w(n)).toContain('zu enge Intervalle'); expect(w(n)).toContain('nicht vergleichbar'); }
    expect(w(150)).toContain('schwanken'); expect(w(5000)).not.toContain('schwanken');
  });
});
