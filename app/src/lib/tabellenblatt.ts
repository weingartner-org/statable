/**
 * Das Blatt „Tabelle zusammenstellen“ (Später, Welle S-C, Teil 1): rechnen aus der Wahl, Blatt anlegen, Sätze und Tabellen für Bericht und Export.
 * Das Blatt speichert nur die WAHL der Person (`ergebnis = { typ: 'tabelle', wahl }`), nie die Zahlen: die Tabelle ist reines JavaScript und wird aus den Daten
 * jedes Mal neu gerechnet, darum ist sie nie veraltet und steht im Bericht, in Word und in Excel immer auf dem heutigen Stand.
 * Gerechnet wird mit dem Fallgewicht des Projekts (Stellen `tabelle:zusammenstellen`, `tabelle:mehrfach`; Umfragegewicht nur beschreibend). Keine Tests, keine Buchstaben.
 */
import type { TableItem } from '../engine/types';
import { L, Lp, s, spalteNach, type Blatt } from './sitzung.svelte';
import { lesbar } from './verzeichnis';
import { aktivesGewicht, gewichtLage } from './fallgewicht.svelte';
import { GewichtFehler, schwersterStatus, type GewichtAbdruck } from './gewichte';
import { rechneTabelle, tabellenStellen, TabellenFehler, GRUPPEN_MAX, type TabellenErgebnis, type TabellenSpec } from './tabellenmodell';
import { tabellenSaetze } from './tabellensaetze';
import { tabelleAlsItem } from './tabellenitem';
import { wahlAus, wahlZuSpec, type TabellenWahl } from './tabellenwahl';
import type { Saetze } from './ergebnis';
import { zitat } from '../i18n/profil';

export type Berechnet =
  | { art: 'ok'; spec: TabellenSpec; e: TabellenErgebnis; item: TableItem; fuss: string[]; hilfe: string[]; fehlt: string[]; ohneStufen: string[] }
  | { art: 'leer'; grund: 'gruppe' | 'fragen'; fehlt: string[]; ohneStufen: string[] }
  | { art: 'fehler'; text: string; fehlt: string[] };

/** Titel der Tabelle: „Fragen nach Geschlecht“. */
export function tabellenTitel(w: TabellenWahl): string {
  const g = lesbar(spalteNach(w.gruppe), true) || w.gruppe;
  return L(`Fragen nach ${g}`, `Questions by ${g}`);
}

/** Ein Wort, warum nicht gerechnet wird, wenn das Fallgewicht des Projekts gerade nicht geht (Pflichtfrage offen oder Spalte unbrauchbar). */
function gewichtProblem(): string | null {
  const l = gewichtLage();
  if (l.art === 'frage') return L('Das Fallgewicht ist noch nicht festgelegt: Erst die Art des Gewichts wählen (Kopfzeile), dann rechnet die Tabelle.', 'The case weight is not set yet: first choose the kind of weight (header), then the table is calculated.');
  if (l.art === 'fehler') return L('Die Spalte des Fallgewichts ist unbrauchbar geworden (zum Beispiel negative Werte oder Kommazahlen als Häufigkeitsgewicht). Das Fallgewicht in der Kopfzeile prüfen.', 'The column of the case weight has become unusable (for example negative values or decimals as a frequency weight). Check the case weight in the header.');
  return null;
}

/** Tiefe Kopie ohne Proxy (der Zustand der Sitzung ist reaktiv). */
const klon = <T>(x: T): T => JSON.parse(JSON.stringify(x));
let zwischen: { z: unknown; sp: unknown; key: string; r: Berechnet } | null = null;
/** Rechnet die Tabelle zur Wahl mit den heutigen Daten und dem heutigen Fallgewicht. Gleiche Eingaben auf demselben Datenstand rechnen nur einmal. */
export function berechneTabelle(wahl: TabellenWahl): Berechnet {
  const w = wahlAus(wahl), problem = gewichtProblem();
  if (problem) return { art: 'fehler', text: problem, fehlt: [] };
  const gw = aktivesGewicht(), sets = s.sets;
  const key = JSON.stringify([w, sets, gw ? [gw.spalte, gw.art] : null, s.einst.sprache, s.einst.anrede, s.einst.zahl, s.einst.nullVorKomma ?? false]);
  if (zwischen && zwischen.z === s.zeilen && zwischen.sp === s.spalten && zwischen.key === key) return zwischen.r;
  const r = baue(w, gw);
  zwischen = { z: s.zeilen, sp: s.spalten, key, r };
  return r;
}
function baue(w: TabellenWahl, gw: GewichtAbdruck | undefined): Berechnet {
  const u = wahlZuSpec(w, { spalten: s.spalten, sets: klon(s.sets), gewicht: gw ? { spalte: gw.spalte, art: gw.art } : undefined });
  if (!u.spec) return u.fehlt.length ? { art: 'fehler', text: fehltSatz(u.fehlt), fehlt: u.fehlt } : { art: 'leer', grund: w.gruppe ? 'fragen' : 'gruppe', fehlt: u.fehlt, ohneStufen: u.ohneStufen };
  try {
    const e = rechneTabelle({ spalten: s.spalten, zeilen: s.zeilen }, u.spec);
    const t = tabellenSaetze(e, u.spec);
    const item = tabelleAlsItem(e, { kombiniert: w.kombiniert, fuss: t.fuss, titel: tabellenTitel(w) });
    return { art: 'ok', spec: u.spec, e, item, fuss: t.fuss, hilfe: t.hilfe, fehlt: u.fehlt, ohneStufen: u.ohneStufen };
  } catch (f) {
    if (f instanceof TabellenFehler) return { art: 'fehler', text: L(`Die Gruppenspalte hat ${f.n} Gruppen. Mehr als ${GRUPPEN_MAX} lassen sich in einer Tabelle nicht lesen: Gruppen zusammenfassen (Umkodieren) oder eine andere Spalte wählen.`, `The group column has ${f.n} groups. More than ${GRUPPEN_MAX} cannot be read in one table: combine groups (recode) or choose another column.`), fehlt: u.fehlt };
    if (f instanceof GewichtFehler) return { art: 'fehler', text: L('Das Fallgewicht passt nicht zu dieser Tabelle. Das Fallgewicht in der Kopfzeile prüfen.', 'The case weight does not fit this table. Check the case weight in the header.'), fehlt: u.fehlt };
    return { art: 'fehler', text: L('Die Tabelle ließ sich mit diesen Daten nicht rechnen. Bitte die Auswahl prüfen.', 'The table could not be calculated with these data. Please check the selection.'), fehlt: u.fehlt };
  }
}
const fehltSatz = (n: string[]) => Lp(n.length, `Die Spalte ${n.map(zitat).join(', ')} gibt es nicht mehr.`, `Die Spalten ${n.map(zitat).join(', ')} gibt es nicht mehr.`, `The column ${n.map(zitat).join(', ')} no longer exists.`, `The columns ${n.map(zitat).join(', ')} no longer exist.`);

/** Welche Stellen der Sperrtabelle diese Tabelle berührt und wie schwer das Gewicht dort wiegt (für den Hinweis am Blatt). */
export function tabellenGewichtStatus(spec: TabellenSpec, art: 'haeufigkeit' | 'umfrage', klumpenfrei?: boolean) { return schwersterStatus(tabellenStellen(spec), art, klumpenfrei); }

export const wahlVon = (b: Blatt): TabellenWahl => wahlAus((b.ergebnis as { wahl?: Partial<TabellenWahl> } | null)?.wahl);
export const berechnetVon = (b: Blatt): Berechnet => berechneTabelle(wahlVon(b));

/** Alle Spalten, die das Blatt braucht (für „Spalte entfernt“ und die Stichprobenzeile): die Gruppe, die Fragen und bei einem Set die Set-Kennung. */
export const spaltenDerWahl = (w: TabellenWahl): string[] => [w.gruppe, ...w.auswahl.map(a => a.id)].filter(Boolean);

export function neuesTabellenBlatt(wahl: TabellenWahl, vorhandeneId?: string): Blatt {
  const w = wahlAus(klon(wahl)), gw = aktivesGewicht();
  const g = lesbar(spalteNach(w.gruppe), true) || w.gruppe;
  return {
    id: vorhandeneId ?? Math.random().toString(36).slice(2, 8), titel: L(`Tabelle: Fragen nach ${g}`, `Table: questions by ${g}`), art: 'tabelle', l1: w.gruppe, l2: null, l3: spaltenDerWahl(w),
    syntax: L('* Tabelle zusammengestellt: Statable rechnet Anzahl, Prozent, Mittelwert, Standardabweichung und Median selbst (kein PSPP-Befehl, keine Tests).', '* Assembled table: Statable calculates counts, percentages, mean, standard deviation and median itself (no PSPP command, no tests).'),
    items: [], ergebnis: { typ: 'tabelle', wahl: w }, imBericht: true, notiz: '', zeit: Date.now(), ...(gw ? { gewicht: { ...gw } } : {})
  };
}

/** Der Satz im Bericht: was die Tabelle zeigt. Die Zahlen selbst stehen in der Tabelle. */
export function saetzeTabelle(b: Blatt): Saetze | null {
  const r = berechnetVon(b);
  if (r.art !== 'ok') return null;
  const w = wahlVon(b), k = r.spec.bloecke.length, g = lesbar(spalteNach(w.gruppe), true) || w.gruppe;
  const haupt = Lp(k, `Die Tabelle zeigt 1 Frage nach ${g}; die Zahl der Fälle steht über jeder Spalte.`, `Die Tabelle zeigt ${k} Fragen nach ${g}; die Zahl der Fälle steht über jeder Spalte.`, `The table shows 1 question by ${g}; the number of cases is above each column.`, `The table shows ${k} questions by ${g}; the number of cases is above each column.`);
  return { haupt, zusatz: '', vorsicht: '', apa: '', marken: [] };
}
export const tabellenTabelle = (b: Blatt): TableItem[] => { const r = berechnetVon(b); return r.art === 'ok' ? [r.item] : []; };
