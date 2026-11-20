/**
 * Zeilen der aktiven Daten direkt aus einer `.sav` lesen (Versuch Geschwindigkeit, 31.10.2026).
 *
 * Warum: Die Engine schreibt die Daten als CSV (`SAVE TRANSLATE`) in 7,8 s je 1 Mio. Zeilen × 10 Spalten, als `.sav` in 0,6 s. Dieser Leser macht aus der `.sav`
 * dieselben Zeilen, die der CSV-Weg liefert (`leseAktiveDaten` in sitzung.svelte.ts): Zahlen als Zahl, fehlend als null, Text ohne Rand-Leerzeichen,
 * Datum als „TT.MM.JJJJ“.
 *
 * Er liest nur, was er sicher gleich wie der CSV-Weg wiedergibt. Alles andere (Datumsformate wie MONTH oder WKDAY, Texte über 255 Byte, eine andere Kodierung als UTF-8,
 * zlib-Kompression, Spaltennamen, die nicht zum Verzeichnis passen, Datumswerte mit Bruchteilen von Sekunden) gibt `null` zurück - dann nimmt der Aufrufer den CSV-Weg.
 */
import type { Spalte } from './verzeichnis';

export type SavWert = string | number | null;

const SYSMIS = -Number.MAX_VALUE;
/** Sekunden zwischen dem 14.10.1582 (Nullpunkt von SPSS) und dem 1.1.1970 */
const SPSS_ZU_UNIX = 12219379200;   // 141428 Tage
/** Formatnummern der `.sav` (Typ im Druckformat) */
const FA = 1, F_DATE = 20, F_TIME = 21, F_DATETIME = 22, F_ADATE = 23, F_EDATE = 38, F_SDATE = 39, F_YMDHMS = 41;
const DATUM = [F_DATE, F_TIME, F_DATETIME, F_ADATE, F_EDATE, F_SDATE, F_YMDHMS];

const zwei = (n: number) => String(n).padStart(2, '0');

/** Sekunden seit 1582 → Datum „TT.MM.JJJJ“ (mit Uhrzeit bei DATETIME und YMDHMS) oder Uhrzeit; `null`, wenn der Wert nicht sicher darstellbar ist. */
function datumsText(sek: number, art: number): string | null {
  if (!Number.isInteger(sek)) return null;   // Bruchteile von Sekunden druckt die Engine nach dem Format: lieber nicht raten
  if (art === F_TIME) return sek >= 0 && sek < 86400 * 100 ? `${zwei(Math.floor(sek / 3600))}:${zwei(Math.floor(sek / 60) % 60)}:${zwei(sek % 60)}` : null;
  const d = new Date((sek - SPSS_ZU_UNIX) * 1000);
  const j = d.getUTCFullYear();
  if (!(j >= 1000 && j <= 9999)) return null;
  const tag = `${zwei(d.getUTCDate())}.${zwei(d.getUTCMonth() + 1)}.${j}`;
  return art === F_DATETIME || art === F_YMDHMS ? `${tag} ${zwei(d.getUTCHours())}:${zwei(d.getUTCMinutes())}:${zwei(d.getUTCSeconds())}` : tag;
}

interface Var { breite: number; slots: number; druck: number; name: string }
const BLANKS = new Uint8Array(8).fill(0x20);

/** Liest die `.sav` und gibt die Zeilen zurück, oder `null`, wenn sie sich nicht sicher wie der CSV-Weg lesen lässt. */
export function leseSavZeilen(bytes: Uint8Array, spalten: Pick<Spalte, 'name' | 'art'>[]): SavWert[][] | null {
  try { return lese(bytes, spalten); } catch { return null; }
}

function lese(bytes: Uint8Array, spalten: Pick<Spalte, 'name' | 'art'>[]): SavWert[][] | null {
  if (bytes.length < 176 || bytes[0] !== 0x24 || bytes[1] !== 0x46 || bytes[2] !== 0x4c || bytes[3] !== 0x32) return null;   // „$FL2“
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const layout = dv.getInt32(64, true);
  if (layout !== 2 && layout !== 3) return null;   // andere Byte-Reihenfolge: nicht von dieser Engine
  const fallSlots = dv.getInt32(68, true), kompression = dv.getInt32(72, true), fallzahl = dv.getInt32(80, true), bias = dv.getFloat64(84, true);
  if ((kompression !== 0 && kompression !== 1) || fallzahl < 0 || fallSlots < 1) return null;
  const txt = new TextDecoder('utf-8', { fatal: true });
  const latin = new TextDecoder('latin1');
  const vars: Var[] = [];
  let langeNamen: Map<string, string> | null = null;
  let p = 176;
  for (let fertig = false; !fertig;) {
    const typ = dv.getInt32(p, true); p += 4;
    if (typ === 2) {
      const vt = dv.getInt32(p, true), hatLabel = dv.getInt32(p + 4, true), nFehl = dv.getInt32(p + 8, true), druck = dv.getInt32(p + 12, true);
      const name = latin.decode(bytes.subarray(p + 20, p + 28)).trimEnd();
      p += 28;
      if (hatLabel) { const n = dv.getInt32(p, true); p += 4 + Math.ceil(n / 4) * 4; }
      p += Math.abs(nFehl) * 8;
      if (vt === -1) { const v = vars[vars.length - 1]; if (!v || v.breite < 1) return null; v.slots++; }
      else if (vt >= 0 && vt <= 255) vars.push({ breite: vt, slots: 1, druck, name });
      else return null;
    } else if (typ === 3) {
      const n = dv.getInt32(p, true); p += 4;
      for (let i = 0; i < n; i++) p += 8 + Math.ceil((1 + bytes[p + 8]!) / 8) * 8;
      if (dv.getInt32(p, true) !== 4) return null;
      p += 4; const m = dv.getInt32(p, true); p += 4 + m * 4;
    } else if (typ === 6) {
      p += 4 + dv.getInt32(p, true) * 80;
    } else if (typ === 7) {
      const sub = dv.getInt32(p, true), gr = dv.getInt32(p + 4, true), anz = dv.getInt32(p + 8, true); p += 12;
      const daten = bytes.subarray(p, p + gr * anz);
      if (sub === 13) { langeNamen = new Map(); for (const t of txt.decode(daten).split('\t')) { const i = t.indexOf('='); if (i > 0) langeNamen.set(t.slice(0, i).toUpperCase(), t.slice(i + 1)); } }
      else if (sub === 14) return null;   // sehr lange Texte (über 255 Byte)
      else if (sub === 20) { const k = latin.decode(daten).toUpperCase(); if (k !== 'UTF-8' && k !== 'UTF8') return null; }
      p += gr * anz;
    } else if (typ === 999) { p += 4; fertig = true; }
    else return null;
  }
  const nV = vars.length;
  if (nV !== spalten.length) return null;
  for (const v of vars) if (v.slots !== (v.breite > 0 ? Math.ceil(v.breite / 8) : 1)) return null;
  if (vars.reduce((a, v) => a + v.slots, 0) !== fallSlots) return null;
  const typen: number[] = [];   // je Spalte: 0 Zahl, 1 Text, 2 Datum
  const form: number[] = [];
  for (let i = 0; i < nV; i++) {
    const v = vars[i]!, sp = spalten[i]!;
    if ((langeNamen?.get(v.name.toUpperCase()) ?? v.name).toLowerCase() !== sp.name.toLowerCase()) return null;
    const ft = (v.druck >> 16) & 0xff;
    form.push(ft);
    if (sp.art === 'text') { if (v.breite === 0 || ft !== FA) return null; typen.push(1); }
    else if (sp.art === 'datum') { if (v.breite !== 0 || !DATUM.includes(ft) || (v.druck & 0xff) !== 0) return null; typen.push(2); }
    else { if (v.breite !== 0) return null; typen.push(0); }
  }

  // ---- Daten: Slot für Slot, ein Fall nach dem anderen ----
  const Z = fallSlots;
  const slotVar = new Int32Array(Z), slotLetzter = new Uint8Array(Z);
  for (let s = 0, i = 0; i < nV; i++) for (let k = 0; k < vars[i]!.slots; k++, s++) { slotVar[s] = i; slotLetzter[s] = k === vars[i]!.slots - 1 ? 1 : 0; }
  const zeilen: SavWert[][] = new Array(fallzahl);
  const teile: Uint8Array[][] = Array.from({ length: nV }, () => []);
  let fall = 0, slot = 0, zeile: SavWert[] = new Array(nV), ok = true;
  const weiter = () => { if (++slot === Z) { zeilen[fall++] = zeile; zeile = new Array(nV); slot = 0; } };
  const zahlSlot = (wert: number) => {
    const i = slotVar[slot]!;
    if (typen[i] === 1) { ok = false; return; }
    if (wert === SYSMIS) zeile[i] = null;
    else if (typen[i] === 2) { const t = datumsText(wert, form[i]!); if (t === null) { ok = false; return; } zeile[i] = t; }
    else zeile[i] = wert;
    weiter();
  };
  const textSlot = (b8: Uint8Array) => {
    const i = slotVar[slot]!;
    if (typen[i] !== 1) { ok = false; return; }
    const t = teile[i]!; t.push(b8);
    if (slotLetzter[slot]) {
      const b = vars[i]!.breite;
      let tx: string;
      if (t.length === 1) tx = txt.decode(t[0]!.subarray(0, b));
      else { const g = new Uint8Array(t.length * 8); t.forEach((x, k) => g.set(x, k * 8)); tx = txt.decode(g.subarray(0, b)); }
      t.length = 0;
      tx = tx.trim();   // wie der CSV-Weg: Rand-Leerzeichen weg, leer = fehlend
      zeile[i] = tx === '' ? null : tx;
    }
    weiter();
  };
  if (kompression === 0) {
    while (fall < fallzahl && ok) {
      if (p + 8 > bytes.length) return null;
      if (typen[slotVar[slot]!] === 1) textSlot(bytes.subarray(p, p + 8)); else zahlSlot(dv.getFloat64(p, true));
      p += 8;
    }
  } else {
    let cmd: Uint8Array = BLANKS, ci = 8;
    while (fall < fallzahl && ok) {
      if (ci === 8) { if (p + 8 > bytes.length) return null; cmd = bytes.subarray(p, p + 8); p += 8; ci = 0; }
      const c = cmd[ci++]!;
      if (c === 0) continue;
      if (c === 252) break;
      if (c === 253) { if (p + 8 > bytes.length) return null; if (typen[slotVar[slot]!] === 1) textSlot(bytes.subarray(p, p + 8)); else zahlSlot(dv.getFloat64(p, true)); p += 8; }
      else if (c === 254) { if (typen[slotVar[slot]!] !== 1) return null; textSlot(BLANKS); }
      else if (c === 255) zahlSlot(SYSMIS);
      else zahlSlot(c - bias);
    }
  }
  return ok && fall === fallzahl ? zeilen : null;
}
