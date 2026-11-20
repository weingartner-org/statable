/**
 * Bildtexte für Diagramme (Barrierefreiheit, Welle 4): aus den echten Zahlen gerechnet, ohne KI, nach den Schablonen von docs/BOOKACCESS-DIAGRAMME-AUSZUG.md
 * (Aufbau, Reihenfolge, Wortwahl; KEINE BookAccess-Zeichen: kein { } --- ^ |, Johannes 06.11.). Die Struktur tragen echte Elemente (figure, Liste, Tabelle), siehe bausteine/BildBeschreibung.svelte.
 *
 *   const t = bildtext('histogramm', { name: 'Alter', grenzen, anzahl, n });
 *   <svg role="img" aria-label={t.kurz}> … </svg>  <BildBeschreibung {...t} />
 *
 * Muster (Verlauf, Richtung des Zusammenhangs, Lage der Q-Q-Enden, Nulllinie im Forest-Plot) stehen nur nach einer festen, getesteten Regel im Text; sonst fehlen sie.
 */
import { L, Lp } from '../sitzung.svelte';
import { sauber } from './zahlen';
import { sprechbar } from '../sprechtext';
import { MAX_LISTE, MAX_ZEILEN } from './hilfen';
import { histogramm } from './histogramm';
import { saeulen } from './saeulen';
import { kreis } from './kreis';
import { linie } from './linie';
import { streu } from './streu';
import { boxplot } from './boxplot';
import { mittelwerte } from './mittelwerte';
import { qq } from './qq';
import { kaplan } from './kaplan';
import { forest } from './forest';
import { scree } from './scree';
import { pfad } from './pfad';
import { streumatrix } from './streumatrix';
import { karte } from './karte';
import { baum } from './baum';
import { verteilung } from './verteilung';
import { heatmap } from './heatmap';
import { sonstiges } from './sonstiges';
import type { Art, ArtDaten, BildText } from './typen';

export type { Art, ArtDaten, BildText, Achse } from './typen';
export type * from './typen';
export { MAX_LISTE, MAX_ZEILEN } from './hilfen';

const SCHABLONEN: { [A in Art]: (d: ArtDaten[A]) => BildText } = { histogramm, saeulen, kreis, linie, streu, boxplot, mittelwerte, qq, kaplan, forest, scree, pfad, streumatrix, karte, baum, verteilung, heatmap, sonstiges };

/** Die Texte zu einem Diagramm. Mehr als `MAX_LISTE` Listenpunkte: die Liste entfällt, der Text verweist auf die Tabelle. Mehr als `MAX_ZEILEN` Tabellenzeilen: gekürzt, der Text sagt es. */
export function bildtext<A extends Art>(art: A, daten: ArtDaten[A]): BildText {
  const t = (SCHABLONEN[art] as (d: ArtDaten[A]) => BildText)(daten);
  let beschreibung = t.beschreibung, liste = t.liste, zeilen = t.tabelle.zeilen;
  if (liste.length > MAX_LISTE) { liste = []; beschreibung = [...beschreibung, L('Die Einzelangaben stehen in der Tabelle.', 'The individual values are in the table.')]; }
  if (zeilen.length > MAX_ZEILEN) {
    const alle = zeilen.length;
    zeilen = zeilen.slice(0, MAX_ZEILEN);
    beschreibung = [...beschreibung, Lp(alle, `Die Tabelle zeigt die ersten ${MAX_ZEILEN} von ${alle} Zeile.`, `Die Tabelle zeigt die ersten ${MAX_ZEILEN} von ${alle} Zeilen.`, `The table shows the first ${MAX_ZEILEN} of ${alle} row.`, `The table shows the first ${MAX_ZEILEN} of ${alle} rows.`)];
  }
  // Letzte Sicherung: Zeichen mit Bedeutung in BookAccess kommen in keinem Text vor, auch nicht aus Namen in den Daten.
  const s = (x: string) => sprechbar(sauber(x));
  return {
    kurz: s(t.kurz), beschreibung: beschreibung.map(s), liste: liste.map(s),
    tabelle: { ...t.tabelle, titel: s(t.tabelle.titel), kopf: t.tabelle.kopf.map(s), zeilen: zeilen.map(r => r.map(c => (typeof c === 'string' ? s(c) : c))) }
  };
}
