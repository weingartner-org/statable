/**
 * Struktur einer Ergebnistabelle für Screenreader (Welle 3, Barrierefreiheit) als reine Funktion - die Oberfläche (bausteine/Ausgabe.svelte)
 * zeichnet nur noch, was hier steht; der Test (lib/tabelle-struktur.test.ts) prüft sie ohne Browser.
 *
 * Grundsatz: Das Programm legt fest, welche Zellen Zeilenüberschriften sind (`TabelleDe.kopfSpalten`, bei PSPP `headCols[0]`). Nie eine Vermutung:
 *   - kopfSpalten = 0: keine Zeilenüberschriften, alle Datenzellen sind `td`, auch die erste Spalte.
 *   - kopfSpalten > 0: die Zellen, die in diesen Spalten beginnen, sind `th scope="row"`. Eine Gruppenzelle über mehrere Zeilen hat `rowspan`
 *     (statt wiederholter leerer Zellen); `scope="row"` gilt dann für alle Zeilen, die sie überspannt.
 *   - Mehrstufige Köpfe (mehrere Kopfzeilen, verbundene Zellen, mehrere Kopfspalten): jede `th` hat eine `id`, jede Datenzelle `headers`.
 *   - Leere Kopfzellen (Ecke) sind `td`, nicht `th`: eine leere Überschrift hilft niemandem.
 *   - Fußnoten: die Zelle verweist mit `aria-describedby` auf den Fußnotentext unter der Tabelle; die Marke steht hochgestellt daneben.
 *   - Kurze Spaltenköpfe (Einstellung): `kurz` liefert die Kurzform, die Zuordnung steht als Liste `abkuerzungen`.
 */
import type { TabelleDe } from './export';

type Z = TabelleDe['zeilen'][number][number];
export interface StrukturZelle {
  z: Z;
  art: 'th' | 'td';
  /** Was in der Zelle steht (bei Kurzköpfen die Kurzform) */
  text: string;
  scope?: 'col' | 'row';
  id?: string; headers?: string; describedby?: string;
  colspan?: number; rowspan?: number;
  /** Fußnotenmarken zum Hochstellen, z. B. „a“ oder „a,b“ */
  marken?: string;
}
export interface Struktur {
  kopf: StrukturZelle[][];
  koerper: StrukturZelle[][];
  fuss: { id: string; text: string }[];
  /** Hat die Tabelle mehr als einen einfachen Kopf? Dann tragen alle Datenzellen `headers`. */
  mehrstufig: boolean;
  abkuerzungen: { kurz: string; lang: string }[];
}
export interface StrukturOptionen {
  /** Vorsatz für alle ids (eindeutig je Tabelle auf der Seite) */
  praefix?: string;
  /** Kurzform eines Kopftexts oder null */
  kurz?: (text: string) => string | null;
}

const marke = (t: string): string | null => /^\(?([^\s.)]{1,3})[.)]\s/.exec(t.trim())?.[1] ?? null;

export function tabelleHtmlStruktur(tb: TabelleDe, opt: StrukturOptionen = {}): Struktur {
  const p = opt.praefix ?? 't';
  const nKopf = tb.kopfZeilen, nSp = tb.kopfSpalten;
  // Gitter: wo beginnt jede Zelle, und welche Zelle deckt welchen Platz? (Platzhalter unter Zeilenspannen zählen nicht, die Ursprungszelle deckt sie.)
  type G = { z: Z; r: number; c: number; cs: number; rs: number };
  const zellen: G[][] = tb.zeilen.map((row, r) => { let k = 0; return row.map(z => { const g = { z, r, c: k, cs: Math.max(1, z.span), rs: Math.max(1, z.rs ?? 1) }; k += g.cs; return g; }); });
  const deckt = new Map<string, G>();
  for (const row of zellen) for (const g of row) if (!g.z.ueber) for (let r = g.r; r < g.r + g.rs; r++) for (let c = g.c; c < g.c + g.cs; c++) deckt.set(`${r}:${c}`, g);
  const leer = (g: G) => g.z.t.trim() === '';
  const istKopf = (g: G) => !g.z.ueber && !leer(g) && (g.r < nKopf || g.c < nSp);
  const idVon = (g: G) => `${p}-${g.r < nKopf ? 'k' : 'z'}${g.r}-${g.c}`;
  const mehrstufig = nKopf > 1 || nSp > 1 || zellen.some(row => row.some(g => !g.z.ueber && (g.r < nKopf || g.c < nSp) && !leer(g) && (g.cs > 1 || g.rs > 1)));

  // Fußnoten: Marke -> Nummer des Fußnotentexts (Beginn „a. Text“); eigene Tabellen haben Fußnoten ohne Marke, dort entfällt der Verweis.
  const fuss = tb.fuss.map((text, i) => ({ id: `${p}-fn${i}`, text }));
  const nachMarke = new Map<string, string>();
  tb.fuss.forEach((t, i) => { const m = marke(t); if (m && !nachMarke.has(m)) nachMarke.set(m, `${p}-fn${i}`); });

  const abk = new Map<string, string>();
  // Eindeutigkeit: Gäbe es für zwei verschiedene lange Köpfe dieser Tabelle dieselbe Kurzform, bleiben beide lang (sonst wäre die Abkürzungsliste falsch).
  const mehrdeutig = new Set<string>();
  if (opt.kurz) {
    const langZuKurz = new Map<string, Set<string>>();
    for (const row of zellen) for (const g of row) if (istKopf(g)) {
      const k = opt.kurz(g.z.t);
      if (k && k !== g.z.t) { const m = langZuKurz.get(k) ?? new Set<string>(); m.add(g.z.t); langZuKurz.set(k, m); }
    }
    for (const [k, m] of langZuKurz) if (m.size > 1) mehrdeutig.add(k);
  }
  const anzeige = (g: G, kopf: boolean): string => {
    if (!kopf || !opt.kurz) return g.z.t;
    const k = opt.kurz(g.z.t);
    if (k && k !== g.z.t && !mehrdeutig.has(k)) { if (!abk.has(k)) abk.set(k, g.z.t); return k; }
    return g.z.t;
  };
  const kopfIds = (c0: number, c1: number): string[] => {
    const ids: string[] = [];
    for (let r = 0; r < nKopf; r++) for (let c = c0; c < c1; c++) { const g = deckt.get(`${r}:${c}`); if (g && istKopf(g) && !ids.includes(idVon(g))) ids.push(idVon(g)); }
    return ids;
  };
  const zeilenIds = (r: number): string[] => {
    const ids: string[] = [];
    for (let c = 0; c < nSp; c++) { const g = deckt.get(`${r}:${c}`); if (g && istKopf(g) && !ids.includes(idVon(g))) ids.push(idVon(g)); }
    return ids;
  };
  const beschreibung = (z: Z): { marken?: string; describedby?: string } => {
    if (!z.fn?.length) return {};
    const ids = z.fn.map(m => nachMarke.get(m)).filter((x): x is string => !!x);
    return { marken: z.fn.join(','), ...(ids.length ? { describedby: ids.join(' ') } : {}) };
  };
  const spanne = (g: G) => ({ ...(g.cs > 1 ? { colspan: g.cs } : {}), ...(g.rs > 1 ? { rowspan: g.rs } : {}) });

  const baue = (row: G[], kopfZeile: boolean): StrukturZelle[] => row.filter(g => !g.z.ueber).map((g): StrukturZelle => {
    const beschr = beschreibung(g.z);
    if (istKopf(g)) {
      const th: StrukturZelle = { z: g.z, art: 'th', text: anzeige(g, true), scope: kopfZeile ? 'col' : 'row', id: idVon(g), ...spanne(g), ...beschr };
      return th;
    }
    // Datenzelle (oder leere Kopfzelle in der Ecke, die keine Überschrift ist)
    const td: StrukturZelle = { z: g.z, art: 'td', text: g.z.t, ...spanne(g), ...beschr };
    if (mehrstufig && !kopfZeile) {
      const h = [...kopfIds(g.c, g.c + g.cs), ...zeilenIds(g.r)].join(' ');
      if (h) td.headers = h;
    }
    return td;
  });
  return {
    kopf: zellen.slice(0, nKopf).map(row => baue(row, true)),
    koerper: zellen.slice(nKopf).map(row => baue(row, false)),
    fuss, mehrstufig,
    abkuerzungen: [...abk].map(([kurz, lang]) => ({ kurz, lang }))
  };
}
