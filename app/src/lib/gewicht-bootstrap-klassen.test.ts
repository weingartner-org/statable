import { describe, expect, it } from 'vitest';
import { erweitern, gewichtStatus, sperrSatz } from './gewichte';
import { gewichtStellen } from './gewichtkarten';
import { Ziehung } from './bootstrap';
import { klassenGrenzen, klassenVorschau, klassenWerte, type KlassenOpt } from './klassieren';
import { bausteine } from './bausteine';
import type { Spalte } from './verzeichnis';
import { s } from './sitzung.svelte';

/* Eigene Tests nach dem Zusammenführen (Fallgewichte × Bootstrap-Grundlage × Klassieren). */
s.einst.sprache = 'de'; s.einst.anrede = 'du';
const sp = (name: string): Spalte => ({ name, bezeichnung: '', art: 'zahl', niveau: 'metrisch', format: 'F8.2', fehlend: [], fehlendText: '', werteLabels: {} });
const x = [2, 5, 3, 8, 4, 7, 6, 1, 9, 10, 12, 11], w = [3, 1, 2, 0, 4, 2, 1, 5, 2, 1, 3, 2];
const daten = { spalten: [sp('x'), sp('w')], zeilen: x.map((v, i) => [v, w[i]!]) };
const expandiert = { spalten: [sp('x')], zeilen: erweitern(x.map(v => [v]), w) };

describe('Bootstrap und Fallgewicht: gesperrt laut Sperrtabelle', () => {
  it('Mediation mit Bootstrap ist mit Häufigkeits- und Umfragegewicht gesperrt, mit Satz', () => {
    for (const art of ['haeufigkeit', 'umfrage'] as const) {
      expect(gewichtStatus('mediation:bootstrap', art)).toBe('sperren');
      expect(gewichtStellen({ verfahren: 'mediation', art }).some(st => st.status === 'sperren')).toBe(true);
      expect(sperrSatz('mediation:bootstrap', { spalte: 'w', art }, 'Die Mediation (mit Bootstrap)')).toMatch(/Mediation/);
    }
  });
  it('wäre ein Häufigkeitsgewicht erlaubt: Ziehen aus der erweiterten Menge ergibt das gewichtete Mittel als Schätzer', () => {
    const idx = erweitern(x.map((_, i) => i), w), mittel = (ix: Int32Array) => { let t = 0; for (const i of ix) t += x[idx[i]!]!; return t / ix.length; };
    const z = new Ziehung(idx.length, mittel, { B: 200 }); z.weiter(200);
    const gm = x.reduce((a, v, i) => a + v * w[i]!, 0) / w.reduce((a, b) => a + b, 0);
    expect(Math.abs(z.t0 - gm)).toBeLessThan(1e-12); expect(z.t.length).toBe(200);
  });
});

describe('Klassieren mit Fallgewicht', () => {
  const o = (r: Partial<KlassenOpt>): KlassenOpt => ({ spalte: 'x', ziel: 'xk', art: 'quantil', k: 4, gewicht: { spalte: 'w', art: 'haeufigkeit' }, ...r });
  it('Häufigkeitsgewicht: Vorschau zählt gewichtet und gleicht der ungewichteten Vorschau der erweiterten Datei (Grenzen und Anzahlen)', () => {
    const g = klassenVorschau(daten, o({})), e = klassenVorschau(expandiert, { ...o({}), gewicht: undefined });
    expect(g.gewichtet).toBe(true); expect(e.gewichtet).toBe(false);
    expect(g.klassen.map(c => c.anzahl)).toEqual(e.klassen.map(c => c.anzahl)); expect(g.klassen.map(c => c.bis)).toEqual(e.klassen.map(c => c.bis));
    expect(g.aufGrenze).toBe(e.aufGrenze); expect(g.gueltig).toBe(26);
  });
  it('Gewichtete Quantile: Gewicht 0 zählt nicht, auch nicht für Minimum und Maximum', () => {
    const d2 = { spalten: daten.spalten, zeilen: [...daten.zeilen, [100, 0]] };
    expect(klassenGrenzen([...x, 100], { art: 'gleichbreit', k: 3, gewichte: [...w, 0] }).breaks.at(-1)).toBe(12);
    expect(klassenVorschau(d2, o({})).klassen.map(c => c.anzahl)).toEqual(klassenVorschau(daten, o({})).klassen.map(c => c.anzahl));
    expect(klassenWerte(d2, o({})).at(-1)).toBe(4);   // klassiert, zählt aber nichts
  });
  it('ohne Gewicht andere Grenzen als mit: das Gewicht geht wirklich ein', () => {
    expect(klassenGrenzen(x, { art: 'quantil', k: 4 }).breaks).not.toEqual(klassenGrenzen(x, { art: 'quantil', k: 4, gewichte: w, gewichtArt: 'haeufigkeit' }).breaks);
  });
  it('Baustein „In Gruppen teilen“: mit Fallgewicht gewichteter Median, gleich dem Median der erweiterten Datei', () => {
    const spalten = [sp('x'), sp('w'), sp('z'), sp('v')], zeilen = x.map((v, i) => [v, w[i]!, i * 3 % 7, i * 5 % 11]);
    const b = (g?: { spalte: string; art: 'haeufigkeit' | 'umfrage' }) => bausteine(spalten, zeilen, g).flatMap(gr => gr.bausteine).find(t => t.id === 'recode')!;
    const mit = b({ spalte: 'w', art: 'haeufigkeit' }), ohne = b();
    expect(mit.syntax).not.toBe(ohne.syntax); expect(mit.syntax).toMatch(/RECODE/);
  });
});

describe('Befunde der Fachprüfung S-A', () => {
  it('Karten, die das Fallgewicht nicht verwenden, tragen keinen Abdruck „gewichtet mit“ (Einzelfall, Fälle, Meta, Offene Antworten)', async () => {
    const { verwendetGewicht } = await import('./gewichtkarten');
    for (const art of ['haeufigkeit', 'umfrage'] as const) {
      for (const v of ['einzelfall', 'faelle', 'meta', 'kategorien']) expect(verwendetGewicht(v, art), v).toBe(false);
      for (const v of ['verteilung', 'gruppen', 'zusammenhang', 'faktor', 'mediation']) expect(verwendetGewicht(v, art), v).toBe(true);
    }
  });
  it('Sätze zum Fallgewicht: keine mehrdeutigen „Sie“ (Anrede oder Pronomen)', async () => {
    const { gewichtHinweise } = await import('./fallgewicht.svelte');
    const { pruefeGewicht } = await import('./gewichte');
    const r = pruefeGewicht([1, 2, null, 0, 3], 'haeufigkeit'), t = gewichtHinweise(r, { spalte: 'w', art: 'haeufigkeit' }).join(' ');
    expect(t).toMatch(/Diese Zeile zählt nicht mit/); expect(t).not.toMatch(/\bSie\b/);
    const r2 = pruefeGewicht([1000, 2000, 1500], 'haeufigkeit');
    expect(gewichtHinweise(r2, { spalte: 'w', art: 'haeufigkeit' }).join(' ')).not.toMatch(/\bSie täten\b/);
  });
});
