/** Veraltete Blätter (Abnahme 4, B1): Ein Blatt trägt den Stand der Daten, mit denen es gerechnet wurde (`stand`, siehe live.ts).
 *  Weicht der heutige Stand der benutzten Spalten ab, ist das Blatt veraltet. Reine Logik, ohne Oberfläche - Bericht, Export und Blatt benutzen dieselbe Prüfung. */
import type { Blatt } from './sitzung.svelte';
import { spaltenStand } from './live';
import { werteVon } from './blatttitel';
import { istSetName } from './mehrfach';
import type { Werte } from './verfahren';
import { entwurfWirksam, type Entwurf } from './gewichte';

export interface DatenStand { spalten: { name: string; art?: string; fehlend?: number[] }[]; zeilen: (string | number | null)[][]; sets: { name: string; spalten: string[] }[];
  /** Das Fallgewicht des Projekts: Wechsel von Spalte, Art, der Antwort „einzeln gezogen: Ja“ (S-D2; Nein und unbeantwortet rechnen gleich) oder Werten macht alle Blätter veraltet (Fachblatt S-A, 1.4, Falle 6); fehlt = ungewichtet. */ gewicht?: { spalte: string; art: string; klumpenfrei?: boolean; /** Abschnitt 6 (Teil A): der angegebene Stichprobenplan - Wechsel macht die Blätter veraltet */ entwurf?: Entwurf } }

/** Die Spalten, die ein Blatt wirklich benutzt (Mehrfachantworten-Sets werden zu ihren Spalten). */
export const datenNamenVon = (w: Werte, sets: DatenStand['sets']): string[] =>
  [...w.l1, ...w.l2, ...w.l3, ...w.l4].flatMap(n => (istSetName(n) ? sets.find(x => '$' + x.name === n)?.spalten ?? [] : [n]));
export const standVon = (w: Werte, d: DatenStand): string =>
  spaltenStand(datenNamenVon(w, d.sets), d.spalten, d.zeilen) + (d.gewicht ? `|w:${d.gewicht.art}${d.gewicht.art === 'umfrage' && d.gewicht.klumpenfrei === true ? ':klumpenfrei' : ''}:${spaltenStand([d.gewicht.spalte], d.spalten, d.zeilen)}${planStand(d)}` : '');
/** Der Stichprobenplan im Stand: die Wahl selbst und der Stand seiner Spalten (leer ohne Plan, dann bleibt der Stand wie vor Abschnitt 6). */
function planStand(d: DatenStand): string {
  const e = d.gewicht?.art === 'umfrage' ? entwurfWirksam(d.gewicht.entwurf) : null;
  if (!e) return '';
  const namen = (['klumpen', 'klumpen2', 'schicht', 'fpc', 'fpc2'] as const).flatMap(k => (e[k] ? [e[k]!] : []));
  return `|plan:${JSON.stringify(e)}:${spaltenStand(namen, d.spalten, d.zeilen)}`;
}

/** Hat sich der Datenstand seit der Rechnung geändert? Blätter ohne Stand (ältere Arbeit, Befehls-Blätter) und Meta-Analysen (Eingabe in der Blatt-Tabelle) gelten nie als veraltet. */
export function istVeraltet(b: Blatt, d: DatenStand): boolean {
  if (!b.stand || b.art === 'meta' || b.art === 'tabelle' || b.art === 'amtlich') return false;   // Tabelle zusammenstellen (S-C): rechnet sich aus den Daten immer neu, ist nie veraltet; „amtlich“ (M5a) prüft den Stand selbst und gibt bei altem Stand nichts aus
  return standVon(werteVon(b), d) !== b.stand;
}
export const veralteteVon = (blaetter: Blatt[], d: DatenStand): Blatt[] => blaetter.filter(b => istVeraltet(b, d));


/** Spalten, die ein Blatt braucht und die es in den Daten nicht mehr gibt (Spalte entfernt, D12). Dann stehen im Blatt nur noch alte Zahlen: es wird als solches gezeigt und gehört nicht in den Bericht. */
export function fehlendeSpalten(b: Blatt, d: DatenStand): string[] {
  if (b.art === 'meta' || b.art === 'befehle') return [];
  const da = new Set(d.spalten.map(x => x.name));
  const w = werteVon(b);
  const fehlt = [...w.l1, ...w.l2, ...w.l3, ...w.l4].flatMap(n => {
    if (!istSetName(n)) return da.has(n) ? [] : [n];
    const set = d.sets.find(x => '$' + x.name === n);
    return set ? set.spalten.filter(x => !da.has(x)) : [n];
  });
  return [...new Set(fehlt)];
}

/** Gesperrte Frage (Prüfliste meldet eine Sperre): Soll das frühere Ergebnis des offenen Blatts jetzt verschwinden? (Fachprüfung Pakete A, B, C: alte Zahlen zu einer Frage, die sich nicht mehr rechnen lässt, dürfen nicht stehen bleiben.)
 *  Nur bei einer echten Sperre der aktuellen Auswahl - nie in einem vorübergehenden Zustand:
 *  - Daten werden gerade geladen (`datenLaedt`): Spalten und Zeilen sind noch nicht da, die Prüfliste meldet dann „Zu wenige Daten“.
 *  - Spalten des Blatts fehlen (`fehlt`): das ist der eigene Fall „Spalte entfernt“ (D12), das Ergebnis bleibt als alte Zahlen sichtbar.
 *  - Der Editor gehört noch zum vorigen Blatt (`editorDa` falsch).
 *  - Das Blatt wird nur geöffnet: Auswahl und Daten sind unverändert (`geaendert` und `veraltet` beide falsch) - dann ändert sich nichts. */
export function ergebnisFaelltWeg(z: { gesperrt?: boolean; editorDa: boolean; sperre: boolean; fehlt: number; datenLaedt: boolean; geaendert: boolean; veraltet: boolean }): boolean {
  if (z.gesperrt || !z.editorDa || !z.sperre || z.fehlt > 0 || z.datenLaedt) return false;
  return z.geaendert || z.veraltet;
}
