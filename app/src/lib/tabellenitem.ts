/**
 * Die Tabelle „Tabelle zusammenstellen“ als TableItem (Später, Welle S-C, Teil 1): so zeigt sie die Seite, so geht sie in den Bericht, nach Word (APA), in die Zwischenablage und in die PDF.
 * Ein Zahlenwert ist eine Zelle mit `n` (die Ausgabe rundet und setzt das Dezimalzeichen nach dem Sprachprofil); die Kombination „n (%)“ ist reiner Text.
 * Die Zahl der Fälle steht immer dabei: in der Kopfzeile jeder Spalte „A (n = 6)“ und, wo die Basis je Frage anders ist, in einer Zeile „Basis (n)“.
 */
import type { Cell, TableItem } from '../engine/types';
import { L } from './sitzung.svelte';
import { komma } from './ergebnis';
import { proz } from '../i18n/profil';
import type { TabellenErgebnis, TabellenZelle } from './tabellenmodell';

export interface ItemOptionen {
  /** „n (%)“ in einer Zelle (kompakt, Voreinstellung) statt n und % in zwei Spalten */
  kombiniert?: boolean;
  /** Anmerkung unter der Tabelle (Sätze aus lib/tabellensaetze.ts) */
  fuss?: string[];
  titel?: string;
}

/** Zahlformat nur über das Sprachprofil (`komma`, `proz` aus lib/ergebnis.ts und i18n/profil.ts). */
const ganz = (x: number) => (Math.abs(x - Math.round(x)) < 1e-9 ? String(Math.round(x)) : komma(x, 1));
const textZahl = (x: number | null) => (x === null || !Number.isFinite(x) ? '-' : ganz(x));

/** Hat die Frage in jeder Spalte in allen ihren Zeilen dieselbe Basis? (Dann genügt eine Zeile „Basis (n)“.) */
export function gemeinsameBasis(e: TabellenErgebnis, block: number): (number | null)[] | null {
  const zl = e.zeilen.filter(r => r.block === block && r.art !== 'kennwert');
  if (!zl.length) return null;
  return e.spalten.every((_, j) => zl.every(r => r.zellen[j]!.basis === zl[0]!.zellen[j]!.basis)) ? zl[0]!.zellen.map(z => z.basis) : null;
}

export function tabelleAlsItem(e: TabellenErgebnis, o: ItemOptionen = {}): TableItem {
  const kombiniert = o.kombiniert ?? true;
  const paar = !kombiniert && e.zeilen.some(z => z.art !== 'kennwert'), breite = paar ? 2 : 1;
  const cols = 1 + e.spalten.length * breite, kopfZeilen = paar ? 2 : 1;
  const cells: Cell[] = [];
  let r = 0;
  const kopf = (rr: number, c: number, cs: number, t: string, a: 'l' | 'c' = 'c'): Cell => ({ r: rr, c, rs: 1, cs, h: true, a, t });
  cells.push(kopf(0, 0, 1, '', 'l'));
  e.spalten.forEach((sp, j) => cells.push(kopf(0, 1 + j * breite, breite, `${sp.label} (n = ${ganz(sp.n)})`)));
  if (paar) { cells.push(kopf(1, 0, 1, '', 'l')); e.spalten.forEach((_, j) => { cells.push(kopf(1, 1 + j * breite, 1, 'n'), kopf(1, 2 + j * breite, 1, '%')); }); }
  r = kopfZeilen;
  const zahlZelle = (rr: number, c: number, t: string, n?: number): Cell => (n === undefined ? { r: rr, c, rs: 1, cs: 1, h: false, a: 'r', t } : { r: rr, c, rs: 1, cs: 1, h: false, a: 'r', t, n });
  let letzteBlock = 0;
  const basisAb = (block: number) => {
    const b = gemeinsameBasis(e, block);
    if (!b) return;
    cells.push({ r, c: 0, rs: 1, cs: 1, h: true, a: 'l', t: L('Basis (n)', 'Base (n)'), i: true });
    b.forEach((x, j) => cells.push(zahlZelle(r, 1 + j * breite, textZahl(x), x ?? undefined), ...(paar ? [zahlZelle(r, 2 + j * breite, '')] : [])));
    r++;
  };
  for (const zeile of e.zeilen) {
    if (zeile.block !== letzteBlock) {
      if (letzteBlock) basisAb(letzteBlock);
      letzteBlock = zeile.block;
      cells.push({ r, c: 0, rs: 1, cs: cols, h: true, a: 'l', t: e.bloecke[zeile.block - 1]?.titel ?? zeile.spalte, b: true });
      r++;
    }
    cells.push({ r, c: 0, rs: 1, cs: 1, h: true, a: 'l', t: zeile.label });
    zeile.zellen.forEach((x: TabellenZelle, j) => {
      const c0 = 1 + j * breite;
      if (zeile.art === 'kennwert') {
        const v = x.wert;
        cells.push(v === null || !Number.isFinite(v) ? zahlZelle(r, c0, '-') : zahlZelle(r, c0, zeile.schluessel === 'n' ? ganz(v) : komma(v, 2), v));
        if (paar) cells.push(zahlZelle(r, c0 + 1, ''));
      } else if (kombiniert) {
        cells.push(zahlZelle(r, c0, x.n === null ? '-' : x.prozent === null ? ganz(x.n) : `${ganz(x.n)} (${proz(komma(x.prozent, 1))})`));
      } else {
        cells.push(zahlZelle(r, c0, textZahl(x.n), x.n ?? undefined), x.prozent === null ? zahlZelle(r, c0 + 1, '-') : zahlZelle(r, c0 + 1, `${komma(x.prozent, 1)}%`, x.prozent));
      }
    });
    r++;
  }
  if (letzteBlock) basisAb(letzteBlock);
  const fn = (t: string): Cell => ({ r: 0, c: 0, rs: 1, cs: 1, h: false, a: 'l', t });
  return {
    type: 'table', label: 'Statable Tabelle', layer: [], title: { r: 0, c: 0, rs: 1, cs: 1, h: false, a: 'l', t: o.titel || L('Tabelle zusammengestellt', 'Assembled table') },
    rows: r, cols, headRows: [kopfZeilen, 0], headCols: [1, 0], cells, caption: null, footnotes: (o.fuss ?? []).map(fn)
  };
}
