/**
 * Daten-Assistent „Verschieben und glätten“ (Später S-F2, Teil C.1; Fachblatt SPAETER-F2-ERGAENZUNGEN Abschnitt C.1 und „Entscheidungen Opus (19.10.)“ 7).
 * Reine JavaScript-Rechnung (kein R, kein PSPP): Vorwert, Folgewert, Veränderung, Veränderung in Prozent, gleitender Mittelwert (zentriert und zurückliegend) -
 * je Person im Langformat, Reihenfolge nach der Zeitspalte. Das Ergebnis steht an der Eingabezeile (die Zeilen der Daten bleiben, wie sie sind).
 * Definitionen wie SPSS CREATE (LAG, LEAD, DIFF, MA, PMA); Abweichungen sind benannt: doppelte Zeitpunkte sind gesperrt, der zurückliegende Mittelwert zählt standardmäßig den aktuellen Wert mit.
 * Sollwerte: scripts/spaeter-f2-erwartet.R (Abschnitt zeitreihen.verschieben); Tests: zeitreihenhelfer.test.ts.
 */
import { L, Lp } from './sitzung.svelte';
import { zitat } from '../i18n/profil';

export type HelferArt = 'vorwert' | 'folgewert' | 'veraenderung' | 'prozent' | 'mittel-zentriert' | 'mittel-zurueck';
export type HelferHinweis = 'zeitluecken' | 'prozent-null';
export interface HelferEin {
  id: (string | number | null)[] | null; zeit: (number | null)[]; x: (number | null)[]; art: HelferArt;
  k?: number; spanne?: number; abstand?: 'reihenfolge' | 'zeit'; schritt?: number; mitAktuell?: boolean;
}
export interface HelferOk { ok: true; werte: (number | null)[]; personen: number; personenMitLuecke: number; hinweise: HelferHinweis[]; erstesFehlt: number }
export type HelferFehler = { ok: false; code: 'doppelt' | 'k' | 'spanne' | 'schritt' | 'art' | 'laenge'; zeilen?: number[] };
export type HelferErgebnis = HelferOk | HelferFehler;

const ARTEN: HelferArt[] = ['vorwert', 'folgewert', 'veraenderung', 'prozent', 'mittel-zentriert', 'mittel-zurueck'];
const zahl = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
/** Gleiche Zeit? Kleine Rundungsfehler bei Dezimalzahlen zählen nicht. */
const gleichZeit = (a: number, b: number) => Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b));

export function zeitreiheHelfer(e: HelferEin): HelferErgebnis {
  const n = e.x.length;
  if (e.zeit.length !== n || (e.id !== null && e.id.length !== n)) return { ok: false, code: 'laenge' };
  if (!ARTEN.includes(e.art)) return { ok: false, code: 'art' };
  const k = e.k ?? 1, spanne = e.spanne ?? 3, abstand = e.abstand ?? 'reihenfolge', schritt = e.schritt ?? 1, mitAktuell = e.mitAktuell ?? true;
  if ((e.art === 'vorwert' || e.art === 'folgewert') && !(Number.isInteger(k) && k >= 1)) return { ok: false, code: 'k' };
  if ((e.art === 'mittel-zentriert' || e.art === 'mittel-zurueck') && !(Number.isInteger(spanne) && spanne >= 2)) return { ok: false, code: 'spanne' };
  if (abstand === 'zeit' && !(zahl(schritt) && schritt > 0)) return { ok: false, code: 'schritt' };

  // Zeilen je Person (Schlüssel als Text, damit 1 und „1“ nicht verwechselt werden)
  const personen = new Map<string, number[]>();
  for (let i = 0; i < n; i++) {
    const t = e.zeit[i];
    if (!zahl(t)) continue;
    let schl = '';
    if (e.id !== null) { const p = e.id[i]; if (p === null || p === undefined || p === '') continue; schl = (typeof p === 'number' ? 'n' : 't') + String(p); }
    const liste = personen.get(schl); if (liste) liste.push(i); else personen.set(schl, [i]);
  }
  // sortieren und doppelte Zeitpunkte suchen
  const doppelt = new Set<number>();
  for (const zeilen of personen.values()) {
    zeilen.sort((a, b) => e.zeit[a]! - e.zeit[b]! || a - b);
    for (let j = 1; j < zeilen.length; j++) if (gleichZeit(e.zeit[zeilen[j]!]!, e.zeit[zeilen[j - 1]!]!)) { doppelt.add(zeilen[j]!); doppelt.add(zeilen[j - 1]!); }
  }
  if (doppelt.size) return { ok: false, code: 'doppelt', zeilen: [...doppelt].sort((a, b) => a - b) };

  const werte: (number | null)[] = Array(n).fill(null);
  let mitLuecke = 0, prozentNull = false;
  const wert = (i: number): number | null => (zahl(e.x[i]) ? (e.x[i] as number) : null);
  for (const zeilen of personen.values()) {
    const m = zeilen.length, t = zeilen.map(i => e.zeit[i]!), v = zeilen.map(wert);
    for (let j = 1; j < m; j++) if (t[j]! - t[j - 1]! > schritt * (1 + 1e-9) + 1e-9) { mitLuecke++; break; }
    /** Index der Messung bei Zeit z (binäre Suche mit Toleranz), sonst -1. */
    const beiZeit = (z: number): number => { let lo = 0, hi = m - 1; while (lo <= hi) { const mid = (lo + hi) >> 1; if (gleichZeit(t[mid]!, z)) return mid; if (t[mid]! < z) lo = mid + 1; else hi = mid - 1; } return -1; };
    /** Index der Messung k Schritte davor (rueck = true) bzw. danach, nach Reihenfolge oder nach Zeit. */
    const nachbar = (j: number, kk: number, rueck: boolean): number => {
      if (abstand === 'zeit') return beiZeit(rueck ? t[j]! - kk * schritt : t[j]! + kk * schritt);
      const q = rueck ? j - kk : j + kk; return q >= 0 && q < m ? q : -1;
    };
    for (let j = 0; j < m; j++) {
      let r: number | null = null;
      switch (e.art) {
        case 'vorwert': { const q = nachbar(j, k, true); r = q >= 0 ? v[q]! : null; break; }
        case 'folgewert': { const q = nachbar(j, k, false); r = q >= 0 ? v[q]! : null; break; }
        case 'veraenderung': case 'prozent': {
          const q = nachbar(j, 1, true), a = v[j]!, b = q >= 0 ? v[q]! : null;
          if (a === null || b === null) r = null;
          else if (e.art === 'veraenderung') r = a - b;
          else if (b === 0) { r = null; prozentNull = true; } else r = (100 * (a - b)) / Math.abs(b);
          break;
        }
        case 'mittel-zentriert': {
          const h = Math.floor(spanne / 2);
          if (j - h >= 0 && j + h < m) {
            let sum = 0, ok = true;
            for (let q = j - h; q <= j + h; q++) {
              const w = v[q]!; if (w === null) { ok = false; break; }
              sum += spanne % 2 === 0 && (q === j - h || q === j + h) ? 0.5 * w : w;
            }
            if (ok) r = sum / spanne;
          }
          break;
        }
        case 'mittel-zurueck': {
          const von = mitAktuell ? j - spanne + 1 : j - spanne, bis = mitAktuell ? j : j - 1;
          if (von >= 0) {
            let sum = 0, ok = true;
            for (let q = von; q <= bis; q++) { const w = v[q]!; if (w === null) { ok = false; break; } sum += w; }
            if (ok) r = sum / spanne;
          }
          break;
        }
      }
      werte[zeilen[j]!] = r;
    }
  }
  const hinweise: HelferHinweis[] = [];
  // Der Hinweis gilt dort, wo „davor“ und „danach“ die Messung in der Reihenfolge meinen (nicht bei „nur bei Abstand“)
  if (mitLuecke > 0 && abstand === 'reihenfolge' && (e.art === 'vorwert' || e.art === 'folgewert' || e.art === 'veraenderung' || e.art === 'prozent')) hinweise.push('zeitluecken');
  if (prozentNull) hinweise.push('prozent-null');
  return { ok: true, werte, personen: personen.size, personenMitLuecke: mitLuecke, hinweise, erstesFehlt: personen.size };
}

/* ---------------------------------------------------------------- Sätze */
const personenT = (n: number) => Lp(n, `${n} Person`, `${n} Personen`, `${n} person`, `${n} people`);

/** Der gut sichtbare Hinweis über dem Ergebnis (Opus 7): Lücken in der Zeit, „davor“ meint die Messung davor. */
export const lueckenSatz = (n: number): string => Lp(n,
  `Bei ${n} Person fehlen Zeitpunkte zwischen den Messungen; ‚davor‘ meint dort die Messung davor, nicht die Messung eine Zeiteinheit davor.`,
  `Bei ${n} Personen fehlen Zeitpunkte zwischen den Messungen; ‚davor‘ meint dort die Messung davor, nicht die Messung eine Zeiteinheit davor.`,
  `For ${n} person, time points are missing between measurements; "before" there means the measurement before, not the measurement one time unit before.`,
  `For ${n} people, time points are missing between measurements; "before" there means the measurement before, not the measurement one time unit before.`);

export const ersterWertSatz = (n: number, art: 'vorwert' | 'folgewert'): string => art === 'vorwert'
  ? Lp(n, `Für ${n} Person fehlt sie in der ersten Zeile, weil es keine frühere Messung gibt.`, `Für ${n} Personen fehlt sie in der ersten Zeile, weil es keine frühere Messung gibt.`,
    `For ${n} person it is empty in the first row, because there is no earlier measurement.`, `For ${n} people it is empty in the first row, because there is no earlier measurement.`)
  : Lp(n, `Für ${n} Person fehlt sie in der letzten Zeile, weil es keine spätere Messung gibt.`, `Für ${n} Personen fehlt sie in der letzten Zeile, weil es keine spätere Messung gibt.`,
    `For ${n} person it is empty in the last row, because there is no later measurement.`, `For ${n} people it is empty in the last row, because there is no later measurement.`);

/** Beschriftung der Wahl beim zurückliegenden Mittelwert: sagt in Worten, ob der aktuelle Wert dabei ist. */
export const mittelBeschriftung = (mitAktuell: boolean): string => mitAktuell
  ? L('die letzten Werte einschließlich des aktuellen Werts', 'the last values including the current value')
  : L('die Werte davor, ohne den aktuellen Wert (SPSS PMA)', 'the values before, without the current value (SPSS PMA)');

const ARTSATZ: Record<HelferArt, () => string> = {
  vorwert: () => L('den Wert, den die vorige Messung derselben Person hatte', 'the value that the previous measurement of the same person had'),
  folgewert: () => L('den Wert, den die nächste Messung derselben Person hat', 'the value that the next measurement of the same person has'),
  veraenderung: () => L('die Veränderung zur vorigen Messung derselben Person (Wert minus Wert davor)', 'the change from the previous measurement of the same person (value minus value before)'),
  prozent: () => L('die Veränderung zur vorigen Messung derselben Person in Prozent (bezogen auf den Betrag des Werts davor)', 'the change from the previous measurement of the same person in percent (relative to the absolute value before)'),
  'mittel-zentriert': () => L('den gleitenden Mittelwert um die Messung (zentriert)', 'the moving average around the measurement (centered)'),
  'mittel-zurueck': () => L('den gleitenden Mittelwert der zurückliegenden Messungen', 'the moving average of the preceding measurements')
};

/** Ganze Sätze für den Bericht: Name der neuen Spalte, was sie enthält, Zahl der leeren Zeilen, je Hinweis ein Satz. */
export function helferSaetze(e: HelferOk, art: HelferArt, o: { spalte: string }): string[] {
  const sp = zitat(o.spalte);
  const aus: string[] = [];
  aus.push(L(`Die neue Spalte ${sp} enthält zu jeder Messung ${ARTSATZ[art]()}.`, `The new column ${sp} contains, for every measurement, ${ARTSATZ[art]()}.`));
  if (art === 'vorwert' || art === 'folgewert') aus.push(ersterWertSatz(e.erstesFehlt, art));
  const leer = e.werte.filter(v => v === null).length;
  aus.push(Lp(leer, `In ${leer} Zeile ist die Spalte leer.`, `In ${leer} Zeilen ist die Spalte leer.`, `The column is empty in ${leer} row.`, `The column is empty in ${leer} rows.`));
  if (e.hinweise.includes('zeitluecken')) aus.push(lueckenSatz(e.personenMitLuecke));
  if (e.hinweise.includes('prozent-null')) aus.push(L('Wo der Wert davor 0 ist, lässt sich keine Veränderung in Prozent berechnen; dort bleibt die Zelle leer.', 'Where the value before is 0, a change in percent cannot be computed; the cell stays empty.'));
  aus.push(L('Das Fallgewicht geht in die neue Spalte nicht ein.', 'The case weight is not used in the new column.'));
  return aus;
}
