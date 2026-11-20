/**
 * Excel-Datei der Tabelle „Tabelle zusammenstellen“ (Später, Welle S-C, Teil 1; Fachblatt 1.7): die Zahlen stehen als ZAHLEN in den Zellen - ungerundet, mit einem Anzeigeformat -,
 * nicht als Text „23 (45,1 %)“. Anzahl und Prozent stehen in getrennten Spalten. Kein Logo, keine Oberfläche: die Funktion ist rein und läuft auch in Tests.
 * Die Datei sagt auch, wie gerechnet wurde (Fuß). Das Anzeigeformat folgt dem Excel der Person (Dezimalzeichen); gerundet wird nur dort.
 */
import type * as ExcelJS from 'exceljs';
import { L } from './sitzung.svelte';
import type { TabellenErgebnis } from './tabellenmodell';
import { excelFuss } from './dokumentmarke';

const SCHRIFT = 'Arial';
const FARBE = { akzent: '17756A', tinte: '1D2530', tinte2: '4C5661', linie: 'DDD8CF' };
const argb = (h: string) => `FF${h}`;

/** Gibt es Zeilen mit Anzahl und Prozent (dann stehen sie je Spalte in zwei Spalten)? */
export const hatProzentZeilen = (e: TabellenErgebnis) => e.zeilen.some(z => z.art !== 'kennwert');

export async function tabelleAlsExcel(e: TabellenErgebnis, fuss: string[] = [], titel = ''): Promise<Uint8Array> {
  const ExcelJSMod = (await import('exceljs')).default as unknown as typeof ExcelJS;
  const wb = new ExcelJSMod.Workbook(); wb.creator = 'Statable'; wb.created = new Date();
  const ws = wb.addWorksheet(L('Tabelle', 'Table'), { pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 } });
  excelFuss(ws);
  const paar = hatProzentZeilen(e), breite = paar ? 2 : 1, nSp = e.spalten.length;
  let z = 1;
  if (titel) { const t = ws.getCell(z, 1); t.value = titel; t.font = { name: SCHRIFT, size: 12, bold: true, color: { argb: argb(FARBE.tinte) } }; z += 2; }
  const kopfStil = (c: ExcelJS.Cell, links = false) => {
    c.font = { name: SCHRIFT, size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: argb(FARBE.akzent) } };
    c.alignment = { horizontal: links ? 'left' : 'center', vertical: 'middle', wrapText: true };
  };
  // Kopf: Gruppe mit ihrer Fallzahl (die Zahl steht immer dabei), darunter bei Bedarf „n“ und „%“
  kopfStil(ws.getCell(z, 1), true);
  e.spalten.forEach((sp, j) => {
    const c0 = 2 + j * breite, text = `${sp.label} (n = ${sp.n})`;
    if (paar) ws.mergeCells(z, c0, z, c0 + 1);
    const c = ws.getCell(z, c0); c.value = text; kopfStil(c);
    if (paar) kopfStil(ws.getCell(z, c0 + 1));
  });
  if (paar) {
    z++;
    kopfStil(ws.getCell(z, 1), true);
    e.spalten.forEach((_, j) => { const c0 = 2 + j * breite; const a = ws.getCell(z, c0); a.value = L('n / Kennwert', 'n / statistic'); kopfStil(a); const b = ws.getCell(z, c0 + 1); b.value = '%'; kopfStil(b); });
  }
  z++;
  const zahl = (c: ExcelJS.Cell, v: number | null, fmt: string) => {
    if (v === null || !Number.isFinite(v)) { c.value = '-'; c.alignment = { horizontal: 'right' }; }
    else { c.value = v; c.numFmt = fmt; c.alignment = { horizontal: 'right' }; }
    c.font = { name: SCHRIFT, size: 10 };
  };
  let letzteBlock = 0;
  const bis = 1 + nSp * breite;
  e.zeilen.forEach((r, ri) => {
    if (r.block !== letzteBlock) {
      // Überschrift der Frage; davor schließt die Basis-Zeile den vorigen Block ab
      if (letzteBlock) z = basisZeile(ws, z, e, letzteBlock, breite, zahl);
      letzteBlock = r.block;
      ws.mergeCells(z, 1, z, bis);
      const h = ws.getCell(z, 1); h.value = e.bloecke[r.block - 1]?.titel ?? r.spalte; h.font = { name: SCHRIFT, size: 10, bold: true, color: { argb: argb(FARBE.tinte) } };
      h.border = { bottom: { style: 'thin', color: { argb: argb(FARBE.linie) } } };
      z++;
    }
    const lab = ws.getCell(z, 1); lab.value = r.label; lab.font = { name: SCHRIFT, size: 10 }; lab.alignment = { indent: 1 };
    r.zellen.forEach((x, j) => {
      const c0 = 2 + j * breite;
      if (r.art === 'kennwert') zahl(ws.getCell(z, c0), x.wert, r.schluessel === 'n' ? '0' : '0.00');
      else { zahl(ws.getCell(z, c0), x.n, '0'); if (paar) zahl(ws.getCell(z, c0 + 1), x.prozent, '0.0"%"'); }
    });
    z++;
    if (ri === e.zeilen.length - 1) z = basisZeile(ws, z, e, r.block, breite, zahl);
  });
  // Fuß: wie gerechnet wurde
  z++;
  for (const f of fuss) { ws.mergeCells(z, 1, z, Math.max(2, bis)); const c = ws.getCell(z, 1); c.value = f; c.font = { name: SCHRIFT, size: 9, color: { argb: argb(FARBE.tinte2) } }; c.alignment = { wrapText: true, vertical: 'top' }; ws.getRow(z).height = 14 * Math.max(1, Math.ceil(f.length / (40 + 14 * nSp))); z++; }
  ws.getColumn(1).width = 34;
  for (let j = 0; j < nSp * breite; j++) ws.getColumn(2 + j).width = 11;
  const buf = await wb.xlsx.writeBuffer();
  return new Uint8Array(buf as ArrayBuffer);
}

/** Die Zeile „Basis (n)“ unter einer Frage mit Anzahl und Prozent, wenn die Basis in allen Zeilen der Frage gleich ist (sonst zeigt jede Zelle ihre Basis nicht, die Antworten stehen als n). */
function basisZeile(ws: ExcelJS.Worksheet, z: number, e: TabellenErgebnis, block: number, breite: number, zahl: (c: ExcelJS.Cell, v: number | null, fmt: string) => void): number {
  const zl = e.zeilen.filter(r => r.block === block && r.art !== 'kennwert');
  if (!zl.length) return z;
  const gleich = e.spalten.every((_, j) => zl.every(r => r.zellen[j]!.basis === zl[0]!.zellen[j]!.basis));
  if (!gleich) return z;
  const lab = ws.getCell(z, 1); lab.value = L('Basis (n)', 'Base (n)'); lab.font = { name: SCHRIFT, size: 10, italic: true }; lab.alignment = { indent: 1 };
  e.spalten.forEach((_, j) => { const c = ws.getCell(z, 2 + j * breite); zahl(c, zl[0]!.zellen[j]!.basis, '0'); c.font = { name: SCHRIFT, size: 10, italic: true }; });
  return z + 1;
}
