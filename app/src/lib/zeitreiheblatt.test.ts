import { describe, expect, it } from 'vitest';
import ERW from './testdaten/spaeter-e-erwartet.json';
import { s } from './sitzung.svelte';
import { isoVon, positionIso, zeitTeilstriche, zeitreiheErgebnis, zeitreiheAuswertung, saetzeZeitreihe, tabellenZeitreihe, zeitreiheVorpruefung } from './zeitreiheblatt';
import { clusterSpaltenBefehl, clusterVorpruefung, clusterVorschlagVon } from './clusterblatt';
import { clusterSilhouetteSatz, kleineGruppe, clusterCodeSatz } from './cluster';

/* Eigene Prüfungen des Bauers B für die Ergebnis-Schicht (Blatt, Sätze, Tabellen, Befehl); die Sollwerte der Rechnung stehen in zeitreihe.test.ts und cluster.test.ts. */
s.einst.sprache = 'de'; s.einst.anrede = 'du';
const D = (ERW as unknown as { daten: Record<string, Record<string, (number | string)[]>> }).daten;
const sp = (name: string, art: 'zahl' | 'datum') => ({ name, bezeichnung: name, art, niveau: 'metrisch' as const, format: art === 'datum' ? 'EDATE10' : 'F8.2', fehlend: [], fehlendText: '', werteLabels: {} });
const laden = (datum: string[], wert: number[]) => { s.spalten = [sp('datum', 'datum'), sp('wert', 'zahl')] as never; s.zeilen = datum.map((d, i) => [d.replace(/^(\d{4})-(\d{2})-(\d{2})$/, '$3.$2.$1'), wert[i]!]) as never; };

describe('Datum aus der Tabelle', () => {
  it('TT.MM.JJJJ und JJJJ-MM-TT werden zu ISO, anderes ist kein Datum', () => {
    expect(isoVon('01.02.2015')).toBe('2015-02-01'); expect(isoVon('1.2.2015')).toBe('2015-02-01'); expect(isoVon('2015-02-01')).toBe('2015-02-01'); expect(isoVon('2015-02-01 08:30:00')).toBe('2015-02-01 08:30:00');
    expect(isoVon('02/01/2015')).toBeNull(); expect(isoVon('morgen')).toBeNull(); expect(isoVon('')).toBeNull();
  });
  it('Position → Datum und Teilstriche', () => {
    const e = { erster: '2015-01-01', raster: 'monatlich' as const, t: Array.from({ length: 120 }, (_, i) => i + 1) };
    expect(positionIso(e, 1)).toBe('2015-01-01'); expect(positionIso(e, 14)).toBe('2016-02-01'); expect(positionIso({ erster: '2020-01-31', raster: 'monatlich' }, 2)).toBe('2020-02-29');
    expect(positionIso({ erster: '2020-01-01', raster: 'woechentlich' }, 3)).toBe('2020-01-15'); expect(positionIso({ erster: '2020-01-01', raster: 'ungleich' }, 10)).toBe('2020-01-11');
    const k = zeitTeilstriche(e, 8); expect(k.length).toBeLessThanOrEqual(8); expect(k[0]).toEqual({ t: 1, label: '2015' });
  });
});

describe('Ergebnis aus den Daten der Sitzung (zeitreihe.csv)', () => {
  laden(D.zeitreihe!.datum as string[], D.zeitreihe!.wert as number[]);
  const r = zeitreiheErgebnis('wert', 'datum');
  it('Raster monatlich, 120 Plätze, keine Lücken', () => { expect(r.ok).toBe(true); if (r.ok) expect([r.e.raster, r.e.periode, r.e.n, r.e.luecken]).toEqual(['monatlich', 12, 120, 0]); });
  it('Auswertung: Trend, Ljung-Box, Intervall mit effektiver Fallzahl, Zerlegung additiv', () => {
    if (!r.ok) throw new Error('kein Ergebnis'); const a = zeitreiheAuswertung(r.e), z = ERW.zeitreihe.zeitreihe;
    expect(Math.abs(a.trend!.b - z.trend.b)).toBeLessThan(1e-9); expect(Math.abs(a.ljung!.q - z.ljung_saison.q)).toBeLessThan(1e-6); expect(a.effGezeigt).toBe(true); expect(Math.abs(a.eff!.nEff - z.neff.n_eff)).toBeLessThan(1e-9); expect(a.zer!.art).toBe('additiv');
  });
  it('Sätze und Tabellen: ganze Sätze, Prognose nur auf Klick, englisch anders', () => {
    if (!r.ok) throw new Error('kein Ergebnis'); const de = saetzeZeitreihe(r.e, n => n); expect(de.haupt).toMatch(/im Mittel um 0,25 je Monat/); expect(de.vorsicht).toMatch(/nur auf Klick/); expect(de.vorsicht).not.toMatch(/keine Prognose/); expect(de.apa).toMatch(/Ljung-Box/);
    s.einst.sprache = 'en'; try { expect(saetzeZeitreihe(r.e, n => n).haupt).not.toBe(de.haupt); } finally { s.einst.sprache = 'de'; }
    const t = tabellenZeitreihe(r.e); expect(t.length).toBe(4); expect(t.map(x => x.label)).toContain('Saisonfigur');
  });
  it('Vorprüfung: Lücken und Länge', () => {
    const v = zeitreiheVorpruefung('wert', 'datum'); expect(v.ok && v.hinweise).toEqual([]);
    laden(D.zeitreihe_luecken!.datum as string[], D.zeitreihe_luecken!.wert as number[]); const l = zeitreiheVorpruefung('wert', 'datum'); expect(l.ok && l.hinweise.some(h => /fehlen 3 von 120/.test(h))).toBe(true);
    laden((D.zeitreihe!.datum as string[]).slice(0, 5), (D.zeitreihe!.wert as number[]).slice(0, 5)); expect(zeitreiheVorpruefung('wert', 'datum').ok).toBe(false);
  });
});

describe('Cluster: Befehl für die neue Spalte', () => {
  it('Beschriftungen mit Zeilenumbruch und Apostroph schleusen nichts ein; Zeilen ohne Zugehörigkeit bleiben leer', () => {
    const b = clusterSpaltenBefehl('Cluster', [1, null, 2, 1], { '1': "Gruppe 1\nCOMPUTE x = 1.", '2': "O'Brien" }, 'Cluster (Ward)\nEXECUTE.');
    expect(b.split('\n').filter(z => /^COMPUTE x/.test(z))).toEqual([]); expect(b).toMatch(/IF \(ANY\(\$CASENUM,1,4\)\) Cluster = 1\./); expect(b).toMatch(/IF \(ANY\(\$CASENUM,3\)\) Cluster = 2\./); expect(b).toContain("O''Brien");
    expect(() => clusterSpaltenBefehl('Cluster; DELETE', [1], {}, 'x')).toThrow();
  });
  it('Vorprüfung: Fallgewicht und konstantes Merkmal', () => {
    s.spalten = [sp('a', 'zahl'), sp('b', 'zahl'), sp('c', 'zahl')] as never; s.zeilen = Array.from({ length: 40 }, (_, i) => [i % 7, (i * 3) % 11, 5]) as never;
    const v = clusterVorpruefung(['a', 'b', 'c'], 'ward', 2, false); expect(v.codes).toContain('konstant'); expect(v.daten.gerechnet).toEqual(['a', 'b']);
    expect(clusterVorpruefung(['a', 'c'], 'ward', 2, false).codes).toContain('zu-wenig-merkmale');
  });
});

describe('Kleine Gruppe (Ausreißer) und Lücken über 10 %', () => {
  it('eine Einzelgruppe ist keine „starke Struktur“ und zählt nicht für den Vorschlag von k', () => {
    expect(kleineGruppe([103, 1], 104)).toBe(true); expect(kleineGruppe([60, 44], 104)).toBe(false); expect(kleineGruppe([95, 5], 100)).toBe(false); expect(kleineGruppe([96, 4], 100)).toBe(true);
    const s1 = clusterSilhouetteSatz(0.95, 2, true); expect(s1).toMatch(/so kleinen Gruppe/); expect(s1).not.toMatch(/starke Gruppenstruktur/); expect(clusterSilhouetteSatz(0.95, 2)).toMatch(/starke/);
    const ks = [{ k: 2, groesse: [103, 1], silhouette: 0.95 }, { k: 3, groesse: [60, 30, 14], silhouette: 0.4 }] as never;
    expect(clusterVorschlagVon(ks, 104)).toBe(3); expect(clusterCodeSatz('kleine-gruppe').length).toBeGreaterThan(20);
  });
  it('über 10 % Lücken: Warnung statt stiller Intervall', () => {
    const d = D.zeitreihe!.datum as string[], w = (D.zeitreihe!.wert as number[]).map((v, i) => (i % 5 === 1 ? null : v));
    s.spalten = [sp('datum', 'datum'), sp('wert', 'zahl')] as never; s.zeilen = d.map((x, i) => [x.replace(/^(\d{4})-(\d{2})-(\d{2})$/, '$3.$2.$1'), w[i]]) as never;
    const r = zeitreiheErgebnis('wert', 'datum'); if (!r.ok) throw new Error('kein Ergebnis');
    expect(saetzeZeitreihe(r.e).vorsicht).toMatch(/Autokorrelation ließ sich hier nicht prüfen/);
  });
});
