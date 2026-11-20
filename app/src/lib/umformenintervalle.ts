/**
 * Später S-F, Teil 2: der Assistent „Zeitpunkte je Person → Intervalle“ (Form A) auf der Seite Umstrukturieren - baut aus einer Tabelle mit EINER Zeile je Person (Ende, Ereignis, Zeitpunkt eines Wechsels)
 * die Tabelle in Intervall-Form für die Cox-Regression mit zeitabhängiger Größe: Kennung, Start, Stopp, Ereignis, die Größe (0 vor dem Wechsel, 1 ab dem Wechsel) und die festen Spalten der Person.
 * Die Regeln stehen in coxzeit.ts (`umformenWechsel`); hier nur die Spalten. PSPP kann das nicht (VARSTOCASES fehlt); die Oberfläche lädt das Ergebnis wie die anderen Umbauten.
 * Das Fallgewicht geht nicht in die neue Tabelle (Sperrschlüssel assistent:intervalle: unberührt).
 */
import { istFehlend } from './fehlend';
import type { Spalte } from './verzeichnis';
import type { Wert } from './eingabe';
import { psppName } from './einlesen';
import { L } from './sitzung.svelte';
import { umformenWechsel, type ZpRegel } from './coxzeit';
import type { Daten, Umgebaut } from './umformen';

export interface IntervalleOpt {
  /** Spalte mit der Kennung der Person; `null` = neue Spalte mit der Zeilennummer */
  kennung: string | null;
  ende: string; ereignis: string;
  /** der Wert der Ereignisspalte, der das Ereignis ist (so wie in den Daten); `null` = die Spalte ist 0/1 */
  ereignisWert: string | number | null;
  /** Spalte mit dem Zeitpunkt des Wechsels (leer = nie) */
  wechsel: string;
  /** Spalten der Person, die in jede Zeile mitlaufen */
  fest: string[];
  /** Name der neuen Spalte mit der zeitabhängigen Größe */
  wertName: string;
  regel: ZpRegel;
}

const zahlGueltig = (sp: Spalte, v: Wert | undefined): v is number => typeof v === 'number' && Number.isFinite(v) && !istFehlend(sp, v);

/** Die Werte der Ereignisspalte, wie sie vorkommen (ohne „keine Angabe“): für die Frage „Welcher Wert ist das Ereignis?“. */
export function ereignisWerte(d: Daten, name: string): (string | number)[] {
  const i = d.spalten.findIndex(x => x.name === name); if (i < 0) return [];
  const sp = d.spalten[i]!, aus = new Set<string | number>();
  for (const z of d.zeilen) { const v = z[i]; if (v === null || v === undefined || v === '') continue; if (typeof v === 'number' && istFehlend(sp, v)) continue; aus.add(v); }
  return [...aus].sort((a, b) => (typeof a === 'number' && typeof b === 'number' ? a - b : String(a).localeCompare(String(b), 'de')));
}
/** Ist die Spalte schon 0/1 (nur diese beiden Werte, oder nur einer von ihnen)? */
export const istNullEins = (werte: (string | number)[]) => werte.length > 0 && werte.every(v => v === 0 || v === 1);

/** Wirft `Error('spalten')` bei falscher Wahl und `Error('keine-personen')`, wenn keine Person übrig bleibt (die Seite zeigt dann ihren Satz). */
export function zeitpunkteZuIntervallen(d: Daten, o: IntervalleOpt): Umgebaut {
  const ix = (n: string) => d.spalten.findIndex(x => x.name === n);
  const ik = o.kennung === null ? -1 : ix(o.kennung), ie = ix(o.ende), ie2 = ix(o.ereignis), iw = ix(o.wechsel), fi = o.fest.map(ix);
  const alle = [ik, ie, ie2, iw, ...fi];
  if ((o.kennung !== null && ik < 0) || ie < 0 || ie2 < 0 || iw < 0 || fi.some(i => i < 0) || new Set(alle.filter(i => i >= 0)).size !== alle.filter(i => i >= 0).length) throw new Error('spalten');
  const sEnde = d.spalten[ie]!, sEreig = d.spalten[ie2]!, sWechsel = d.spalten[iw]!;
  const kennung = d.zeilen.map((z, r) => (ik < 0 ? r + 1 : (() => { const v = z[ik]; const sp = d.spalten[ik]!; return v === null || v === undefined || v === '' || (typeof v === 'number' && istFehlend(sp, v)) ? null : v; })()));
  const ende = d.zeilen.map(z => (zahlGueltig(sEnde, z[ie]) ? (z[ie] as number) : null));
  const ereignis = d.zeilen.map(z => {
    const v = z[ie2]; if (v === null || v === undefined || v === '' || (typeof v === 'number' && istFehlend(sEreig, v))) return null;
    return o.ereignisWert === null ? (v === 0 || v === 1 ? (v as number) : null) : v === o.ereignisWert ? 1 : 0;
  });
  const wechsel = d.zeilen.map(z => (zahlGueltig(sWechsel, z[iw]) ? (z[iw] as number) : null));
  const u = umformenWechsel({ kennung, ende, ereignis, wechsel }, { regel: o.regel });
  if (!u.ok) throw new Error(u.code);

  const vergeben = new Set<string>([...(ik >= 0 ? [d.spalten[ik]!.name] : []), ...fi.map(i => d.spalten[i]!.name)].map(n => n.toLowerCase()));
  const neu = (wunsch: string, vorschlag: string, rest: Partial<Spalte>): Spalte => {
    const w = wunsch.trim() || vorschlag, name = psppName(w, vergeben, vergeben.size + 1);
    return { name, bezeichnung: w === name ? '' : w, art: 'zahl', niveau: 'nominal', format: 'F8.0', fehlend: [], fehlendText: '', werteLabels: {}, ...rest };
  };
  const kSp = ik >= 0 ? d.spalten[ik]! : neu(L('person', 'person'), 'person', {});
  const stSp = neu('start', 'start', { niveau: 'metrisch', format: 'F8.2' }), spSp = neu('stopp', 'stopp', { niveau: 'metrisch', format: 'F8.2' }), evSp = neu('ereignis', 'ereignis', { format: 'F1.0' });
  const wSp = neu(o.wertName, 'wechsel', { format: 'F1.0', werteLabels: { '0': L('vor dem Wechsel', 'before the switch'), '1': L('ab dem Wechsel', 'from the switch on') } });
  const zeilen: Wert[][] = u.zeilen.map(r => {
    const quelle = d.zeilen[r.person - 1]!;
    return [ik >= 0 ? (quelle[ik] ?? null) : r.person, r.start, r.stopp, r.ereignis, r.wert, ...fi.map(i => quelle[i] ?? null)];
  });
  return {
    spalten: [kSp, stSp, spSp, evSp, wSp, ...fi.map(i => d.spalten[i]!)], zeilen,
    hinweise: [{ art: 'intervalle', hinweise: u.hinweise, ...(u.vorzug !== undefined ? { vorzug: u.vorzug } : {}) }, { art: 'unsterblich' }]
  };
}
