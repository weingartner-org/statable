/**
 * S-G0 (Andreas, 22.10.): Zwei Zahlenspalten nebeneinander (zwei Listen aus Excel) werden zu EINER Wertespalte und EINER Gruppenspalte untereinander,
 * damit „Unterscheiden sich Gruppen?“ sie wie gewohnt vergleicht (t-Test nach Welch, Rangtest, Bild, Bericht). Die Listen dürfen verschieden lang sein:
 * leere und „keine Angabe“-Felder fallen weg. Das bisherige Projekt bleibt unverändert; das Ergebnis öffnet als neues Projekt.
 */
import type { Spalte } from './verzeichnis';
import type { Wert } from './eingabe';
import type { Daten } from './umformen';
import { istFehlend } from './fehlend';
import { festerName } from './einlesen';
import { s as sitzung, L } from './sitzung.svelte';

export interface ListenErgebnis extends Daten { wertName: string; gruppeName: string; anzahl: number[] }
/** Die Grenze der Karte „Unterscheiden sich Gruppen?“: höchstens zwölf Gruppen. */
export const MAX_LISTEN = 12;

/** Zwei oder mehr Zahlenspalten (Listen) untereinander: eine Spalte `wert` (englisch `value`), eine Spalte `gruppe` (englisch `group`; jede Sprache in ihren Wörtern, Andreas 22.10.) (1 … n, Beschriftung = Spaltenname). */
export function stapleListen(d: Daten, namen: string[], deutsch: boolean = sitzung.einst.sprache === 'de'): ListenErgebnis {
  if (namen.length < 2 || namen.length > MAX_LISTEN || new Set(namen).size !== namen.length) throw new Error('spalten');
  const idx = namen.map(n => d.spalten.findIndex(x => x.name === n));
  if (idx.some(i => i < 0)) throw new Error('spalten');
  const sp = idx.map(i => d.spalten[i]!);
  if (sp.some(x => x.art !== 'zahl')) throw new Error('zahl');
  const beschr = (x: Spalte) => x.bezeichnung.trim() || x.name;
  const vergeben = new Set<string>();
  const wertName = festerName(deutsch ? 'wert' : L('wert', 'value'), vergeben, 1);
  const gruppeName = festerName(deutsch ? 'gruppe' : L('gruppe', 'group'), vergeben, 2);
  const zeilen: Wert[][] = [];
  const anzahl = namen.map(() => 0);
  idx.forEach((i, k) => {
    for (const z of d.zeilen) {
      const w = z[i] ?? null;
      if (typeof w !== 'number' || istFehlend(sp[k]!, w)) continue;
      zeilen.push([w, k + 1]); anzahl[k]!++;
    }
  });
  const wert: Spalte = { name: wertName, bezeichnung: '', art: 'zahl', niveau: 'metrisch', format: sp.every(x => x.format === sp[0]!.format) ? sp[0]!.format : 'F8.2', fehlend: [], fehlendText: '', werteLabels: {} };
  const gruppe: Spalte = { name: gruppeName, bezeichnung: '', art: 'zahl', niveau: 'nominal', format: 'F8.0', fehlend: [], fehlendText: '', werteLabels: Object.fromEntries(sp.map((x, k) => [String(k + 1), beschr(x)])) };
  return { spalten: [wert, gruppe], zeilen, wertName, gruppeName, anzahl };
}

export interface ZweiSpaltenErgebnis extends Daten { wertName: string; gruppeName: string; anzahl: [number, number] }
/** Zwei Listen (der Fall von Andreas); wie `stapleListen`. */
export function stapleZweiSpalten(d: Daten, a: string, b: string, deutsch?: boolean): ZweiSpaltenErgebnis {
  const r = stapleListen(d, [a, b], deutsch);
  return { ...r, anzahl: [r.anzahl[0]!, r.anzahl[1]!] };
}
