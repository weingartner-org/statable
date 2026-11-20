/**
 * Winsorisieren als Datenschritt (Field-Stufe 3b, 05.11.2026): eine Zahlenspalte wird in eine NEUE Spalte kopiert, die Werte unter der unteren und über der oberen Grenze
 * werden auf die Grenze gesetzt. Das Original bleibt unverändert, nichts wird gelöscht. Grenzen sind Perzentile der gültigen Werte (R `quantile`, type 7; Standard 20 % und 80 %,
 * wie der Sollwert robust.winsor). Fehlende Werte (leer und „keine Angabe“-Codes) bleiben in der neuen Spalte leer.
 * Reine Funktionen auf `Daten`; die Oberfläche führt den Befehl über `wendeAn` aus (ein Rückgängig-Schritt, Protokolleintrag „Berechnen“).
 * Rechnung der Grenzen: winsorisiere() in getrimmt.ts, geprüft gegen R in getrimmt.test.ts; hier der Befehl, geprüft gegen die echte Engine in winsorbefehl.test.ts.
 */
import { AssistentFehler, istFehlend } from './datenassistent';
import { zit } from './befehlstext';
import { gueltigerName } from './skalabau';
import { winsorisiere } from './getrimmt';
import { L } from './sitzung.svelte';
import type { Daten } from './umformen';

export interface WinsorOpt { spalte: string; ziel: string; unten: number; oben: number; ueberschreiben?: boolean }
export interface WinsorErgebnis { syntax: string; ziel: string; bezeichnung: string; format: string; lo: number; hi: number; neu: (number | null)[]; nGueltig: number; nUnten: number; nOben: number }

const lit = (n: number) => { const t = String(n); return /e/i.test(t) ? n.toFixed(20).replace(/0+$/, '').replace(/\.$/, '') : t; };
const rund = (v: number) => Number(v.toPrecision(6));
const finde = (d: Daten, n: string) => d.spalten.findIndex(s => s.name.toUpperCase() === n.toUpperCase());

/** Standardgrenzen in Prozent. */
export const WINSOR_UNTEN = 20, WINSOR_OBEN = 80;

/** Bezeichnung der neuen Spalte, zum Beispiel „Winsorisiert (20 % bis 80 %, Grenzen 4,482 und 5,624): weight“. */
export const winsorBezeichnung = (spalte: string, unten: number, oben: number, lo: number, hi: number) =>
  L(`Winsorisiert (${unten} % bis ${oben} %, Grenzen ${rund(lo)} und ${rund(hi)}): ${spalte}`, `Winsorized (${unten}% to ${oben}%, limits ${rund(lo)} and ${rund(hi)}): ${spalte}`);

export function winsorBefehl(d: Daten, o: WinsorOpt): WinsorErgebnis {
  const i = finde(d, o.spalte);
  if (i < 0 || d.spalten[i]!.art !== 'zahl') throw new AssistentFehler('spalte', o.spalte);
  if (!gueltigerName(o.ziel)) throw new AssistentFehler('name', o.ziel);
  if (finde(d, o.ziel) >= 0 && !o.ueberschreiben) throw new AssistentFehler('ueberschreiben', o.ziel);
  const sp = d.spalten[i]!;
  const werte = d.zeilen.map(z => { const v = z[i] ?? null; return typeof v === 'number' && !istFehlend(sp, v) ? v : null; });
  const r = winsorisiere(werte, o.unten / 100, o.oben / 100);
  if (!r) throw new AssistentFehler('bereich', [o.unten, o.oben]);
  const nGueltig = werte.filter(v => v !== null).length;
  const nUnten = werte.filter(v => v !== null && v < r.lo).length, nOben = werte.filter(v => v !== null && v > r.hi).length;
  const bezeichnung = winsorBezeichnung(sp.name, o.unten, o.oben, r.lo, r.hi);
  const m = /^F(\d+)\.(\d+)$/i.exec(sp.format), nach = m ? Math.min(8, Number(m[2]) + 2) : 3, format = `F${Math.max(8, (m ? Number(m[1]) : 8) + 2)}.${nach}`;
  const syntax = [
    `IF (NOT MISSING(${sp.name})) ${o.ziel} = MAX(${lit(r.lo)}, MIN(${lit(r.hi)}, ${sp.name})).`,
    `VARIABLE LABELS ${o.ziel} ${zit(bezeichnung.slice(0, 250))}.`,
    `FORMATS ${o.ziel} (${format}).`,
    `VARIABLE LEVEL ${o.ziel} (SCALE).`,
    'EXECUTE.'
  ].join('\n');
  return { syntax, ziel: o.ziel, bezeichnung, format, lo: r.lo, hi: r.hi, neu: r.neu as (number | null)[], nGueltig, nUnten, nOben };
}

/** Der Warnsatz: nicht löschen, immer berichten. */
export const winsorWarnung = () => L(
  'Winsorisieren verändert Werte: Die Ausreißer werden auf die Grenzen gesetzt, nicht gelöscht. Es muss im Bericht stehen (Perzentile, Grenzwerte, Zahl der geänderten Werte). Es mildert den Einfluss extremer Werte, behebt aber keinen Messfehler. Die Original-Spalte bleibt erhalten.',
  'Winsorizing changes values: outliers are set to the limits, not deleted. It must be reported (percentiles, limit values, number of changed values). It reduces the influence of extreme values but does not repair a measurement error. The original column is kept.');
