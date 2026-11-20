import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tabelleDe, ohneDoppeltes } from './export';
import { tabelleHtmlStruktur, type Struktur } from './tabellenstruktur';
import { kurzform, KURZFORMEN } from './kurzkoepfe';
import { s } from './sitzung.svelte';
import type { Cell, TableItem } from '../engine/types';

/**
 * Welle 3 (Barrierefreiheit): Struktur der Ergebnistabellen aus echten PSPP-Ausgaben (docs/entwurf-opus/daten/pspp-ausgabe.json: Tabellen mit
 * einfachen und mehrstufigen Köpfen, Zeilenspannen, Kreuztabelle, t-Test). Geprüft ohne Browser über die reine Funktion `tabelleHtmlStruktur`.
 */
const lade = (): TableItem[] => {
  const t = readFileSync(new URL('../../../docs/entwurf-opus/daten/pspp-ausgabe.json', import.meta.url), 'utf8');
  let j: unknown; try { j = JSON.parse(t); } catch { j = t.trim().split('\n').map(l => JSON.parse(l)); }
  return ((Array.isArray(j) ? j : [j]) as { type: string }[]).filter(i => i.type === 'table') as TableItem[];
};
const TABELLEN = lade();
const bauen = (it: TableItem, kurz = false) => {
  s.einst.sprache = 'en';
  const tb = tabelleDe(it, null);
  return { tb, st: tabelleHtmlStruktur(tb, { praefix: 'x', kurz: kurz ? (x) => kurzform(x, 'en') : undefined }) };
};
const alle = (st: Struktur) => [...st.kopf.flat(), ...st.koerper.flat()];

describe('Tabellenstruktur aus echten PSPP-Ausgaben', () => {
  it('es gibt echte Beispiele mit und ohne Zeilenköpfe, mit Spannen', () => {
    expect(TABELLEN.length).toBeGreaterThanOrEqual(15);
    expect(TABELLEN.some(t => t.headCols[0] === 0)).toBe(true);
    expect(TABELLEN.some(t => t.headCols[0] > 1)).toBe(true);
    expect(TABELLEN.some(t => t.headRows[0] > 1)).toBe(true);
  });

  for (const tab of TABELLEN) {
    const name = `${tab.label} (headRows ${tab.headRows[0]}, headCols ${tab.headCols[0]})`;
    describe(name, () => {
      const { tb, st } = bauen(tab);
      const roh = ohneDoppeltes(tab);
      it('kopfSpalten kommt aus headCols', () => { expect(tb.kopfSpalten).toBe(roh.headCols[0]); });
      it('Zahl der th scope=row = Zeilenköpfe laut headCols; bei 0 keine', () => {
        const erwartet = roh.cells.filter(c => c.r >= roh.headRows[0] && c.c < roh.headCols[0] && c.t.trim() !== '').length;
        const th = st.koerper.flat().filter(c => c.art === 'th' && c.scope === 'row');
        expect(th.length).toBe(erwartet);
        if (roh.headCols[0] === 0) expect(st.koerper.flat().every(c => c.art === 'td')).toBe(true);
      });
      it('keine leere Überschrift (th), ids eindeutig', () => {
        const th = alle(st).filter(c => c.art === 'th');
        expect(th.every(c => c.text.trim() !== '')).toBe(true);
        const ids = th.map(c => c.id);
        expect(new Set(ids).size).toBe(ids.length);
      });
      it('in jeder Körperzeile stehen th nur ganz links, danach nur td', () => {
        for (const row of st.koerper) { const a = row.map(c => c.art).join(''); expect(a, a).toMatch(/^(th|td)?(th)*(td)*$/); }
      });
      if (tb.kopfZeilen > 1 || tb.kopfSpalten > 1 || tab.cells.some(c => c.cs > 1 && c.r < tab.headRows[0])) {
        it('mehrstufig: jede Datenzelle hat headers, alle Verweise lösen auf vorhandene ids auf', () => {
          expect(st.mehrstufig).toBe(true);
          const ids = new Set(alle(st).filter(c => c.id).map(c => c.id));
          const daten = st.koerper.flat().filter(c => c.art === 'td' && c.text.trim() !== '');
          for (const c of daten) { expect(c.headers, c.text).toBeTruthy(); for (const h of c.headers!.split(' ')) expect(ids.has(h), h).toBe(true); }
        });
      } else {
        it('einstufig: kein headers nötig', () => { expect(st.mehrstufig).toBe(false); expect(alle(st).every(c => !c.headers)).toBe(true); });
      }
    });
  }

  it('Gruppenzelle über mehrere Zeilen: rowspan, keine wiederholte leere Zelle (Group Statistics)', () => {
    const { st } = bauen(TABELLEN.find(t => t.label === 'Group Statistics')!);
    const [z1, z2] = st.koerper;
    expect(z1![0]).toMatchObject({ art: 'th', scope: 'row', rowspan: 2 });
    expect(z1![0]!.text).toBe('Konzentration (Punkte)');
    expect(z2![0]).toMatchObject({ art: 'th', scope: 'row', text: 'ja' });   // zweite Zeile beginnt mit ihrem eigenen Zeilenkopf, nicht mit einer leeren Zelle
  });

  it('t-Test (3 Kopfzeilen): Datenzelle nennt Spalte, Gruppenüberschrift, Zeilengruppe und Zeile', () => {
    const { st } = bauen(TABELLEN.find(t => t.label === 'Independent Samples Test')!);
    const text = (id: string) => alle(st).find(c => c.id === id)!.text;
    const z = st.koerper[0]!.find(c => c.text === '2.98')!;
    const genannt = z.headers!.split(' ').map(text);
    expect(genannt).toEqual(expect.arrayContaining(['T-Test for Equality of Means', 't', 'Konzentration (Punkte)', 'Equal variances assumed']));
    const lev = st.koerper[0]!.find(c => c.text === '.964')!.headers!.split(' ').map(text);
    expect(lev).toEqual(expect.arrayContaining(["Levene's Test for Equality of Variances", 'Sig.']));
    expect(lev).not.toContain('T-Test for Equality of Means');
  });

  it('Kreuztabelle: die doppelte Frage-Spalte fällt weg (kopfSpalten 2), „Total“ ist Zeilenkopf', () => {
    const { tb, st } = bauen(TABELLEN.find(t => t.label.includes('×'))!);
    expect(tb.kopfSpalten).toBe(2);
    expect(st.koerper[3]![0]).toMatchObject({ art: 'th', scope: 'row', text: 'Total' });
  });
});

describe('Fußnoten', () => {
  const zelle = (r: number, c: number, t: string, o: Partial<Cell> = {}): Cell => ({ r, c, rs: 1, cs: 1, h: false, a: 'l', t, ...o });
  const mit: TableItem = {
    type: 'table', label: 'T', layer: [], title: null, rows: 2, cols: 2, headRows: [1, 0], headCols: [1, 0], caption: null,
    cells: [zelle(0, 0, '', { h: true }), zelle(0, 1, 'Sig.', { h: true }), zelle(1, 0, 'Test', { h: true }), zelle(1, 1, '.03', { n: 0.03, a: 'r', fn: ['a'] })],
    footnotes: [zelle(0, 0, 'a. Nicht korrigiert.'), zelle(0, 0, 'b. Nicht verwendet.')]
  } as unknown as TableItem;
  it('Zelle mit Marke verweist per aria-describedby auf den Fußnotentext; Marke hochgestellt', () => {
    s.einst.sprache = 'en';
    const st = tabelleHtmlStruktur(tabelleDe(mit, null), { praefix: 'q' });
    const z = st.koerper[0]!.find(c => c.art === 'td')!;
    expect(z.marken).toBe('a');
    expect(z.describedby).toBe('q-fn0');
    expect(st.fuss.map(f => f.id)).toEqual(['q-fn0', 'q-fn1']);
    expect(st.fuss[0]!.text).toMatch(/^a\. /);
    expect(st.koerper[0]![0]!.describedby).toBeUndefined();
  });
  it('Marke ohne passenden Fußnotentext: Marke sichtbar, kein kaputter Verweis', () => {
    const o = { ...mit, footnotes: [] } as TableItem;
    const z = tabelleHtmlStruktur(tabelleDe(o, null)).koerper[0]!.find(c => c.art === 'td')!;
    expect(z.marken).toBe('a'); expect(z.describedby).toBeUndefined();
  });
});

describe('Kurze Spaltenköpfe', () => {
  it('Kurzform in th, Liste der Abkürzungen nur für die vorkommenden', () => {
    const { st } = bauen(TABELLEN.find(t => t.label === 'Group Statistics')!, true);
    const koepfe = st.kopf[0]!.filter(c => c.art === 'th').map(c => c.text);
    expect(koepfe).toEqual(['Group', 'N', 'M', 'SD', 'SE']);
    expect(st.abkuerzungen).toEqual([{ kurz: 'M', lang: 'Mean' }, { kurz: 'SD', lang: 'Std. Deviation' }, { kurz: 'SE', lang: 'S.E. Mean' }]);
  });
  it('ohne Schalter bleibt der Kopf lang und es gibt keine Liste', () => {
    const { st } = bauen(TABELLEN.find(t => t.label === 'Group Statistics')!);
    expect(st.kopf[0]!.filter(c => c.art === 'th').map(c => c.text)).toContain('Std. Deviation');
    expect(st.abkuerzungen).toEqual([]);
  });
  it('kurzform: de und en vorhanden, jede Kurzform kürzer als der lange Kopf, unbekannte Sprache null', () => {
    expect(kurzform('Std. Abweichung', 'de')).toBe('SD');
    expect(kurzform('Std. Deviation', 'en')).toBe('SD');
    expect(kurzform('Écart type', 'fr')).toBe('ET');
    expect(kurzform('Std. Deviation', 'fr')).toBeNull();
    expect(kurzform('Irgendwas', 'de')).toBeNull();
    for (const tab of Object.values(KURZFORMEN)) for (const [lang, kurz] of Object.entries(tab)) expect(kurz.length, lang).toBeLessThan(lang.length);
  });
  it('die deutschen und englischen Schlüssel sind echte PSPP-Köpfe (Wörterbuch de)', () => {
    const de = JSON.parse(readFileSync(new URL('../output/de-dict.json', import.meta.url), 'utf8')) as Record<string, string>;
    const werte = new Set(Object.values(de));
    for (const k of Object.keys(KURZFORMEN.de!)) expect(werte.has(k), k).toBe(true);
    for (const k of Object.keys(KURZFORMEN.en!)) expect(k in de, k).toBe(true);
  });
});

/** Wächter: Wer eine Tabelle (`type: 'table'`) baut, sagt ausdrücklich `headCols`. Sonst bliebe die Frage „Zeilenüberschriften?“ offen. */
export const tabellenOhneHeadCols = (quelle: string): number[] => {
  const fehler: number[] = [];
  for (const m of quelle.matchAll(/type:\s*'table'/g)) if (!/headCols\s*:/.test(quelle.slice(m.index!, m.index! + 700))) fehler.push(quelle.slice(0, m.index).split('\n').length);
  return fehler;
};
const quellen = (dir: string): string[] => readdirSync(dir).flatMap(n => { const p = join(dir, n); return statSync(p).isDirectory() ? quellen(p) : /\.(ts|svelte)$/.test(n) && !/\.test\.ts$/.test(n) ? [p] : []; });
describe('Wächter: headCols überall ausdrücklich', () => {
  it('Erkennung: ein Aufbau ohne headCols fällt auf, mit headCols nicht', () => {
    expect(tabellenOhneHeadCols("x = { type: 'table', label: 'a', headRows: [1, 0], cells }")).toEqual([1]);
    expect(tabellenOhneHeadCols("x = { type: 'table', label: 'a', headRows: [1, 0], headCols: [1, 0], cells }")).toEqual([]);
  });
  it('kein Ort im Programm baut eine Tabelle ohne headCols', () => {
    const wurzel = fileURLToPath(new URL('..', import.meta.url));
    const schlecht: string[] = [];
    for (const p of quellen(wurzel)) {
      if (/engine[\\/]types\.ts$/.test(p)) continue;
      const f = tabellenOhneHeadCols(readFileSync(p, 'utf8'));
      if (f.length) schlecht.push(`${relative(wurzel, p)}:${f.join(',')}`);
    }
    expect(schlecht).toEqual([]);
  });
});
