/**
 * Bezirke und Gemeinden Österreichs für die Karte. Quelle: Bundesamt für Eich- und Vermessungswesen (BEV), Verwaltungsgrenzen (VGD), CC BY 4.0.
 * Die Dateien liegen unter `karten/at/` (erzeugt von `scripts/at-grenzen-holen.mjs`) und werden erst auf Wunsch von diesem Server geladen, nie im Kern.
 * Die Zuordnung läuft über dieselbe Logik wie bei jeder anderen Karte (`karteZuordnen`): genau gleicher Text der gewählten Eigenschaft und des Codes in den Daten.
 * Das Verzeichnis (index.json) und die Dateien sind fremde Eingabe im Sinn der Prüfung: Größe und SHA-256 werden verglichen, das GeoJSON wird mit `geoLesen` geprüft.
 */
import { L } from './sitzung.svelte';
import { geoLesen, type GeoDaten } from './karte';
import { kartenHolen, type KartenErgebnis, type KartenOpt } from './kartenladen';

export type AtStufe = 'bezirke' | 'gemeinden';
export const AT_STUFEN: AtStufe[] = ['bezirke', 'gemeinden'];
export interface AtEintrag { datei: string; name: string; gebiete: number; bytes: number; gz: number; sha256: string; eigenschaften: string[] }
export interface AtIndex {
  quelle: { anbieter: string; datensatz: string; stichtag: string; adresse: string; sha256: string; abgerufen: string };
  lizenz: string; lizenzAdresse: string; namensnennung: string; bearbeitung: string;
  bezirke: AtEintrag; gemeinden: AtEintrag;
}

const istObjekt = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x);
const txt = (x: unknown, max = 300): string => (typeof x === 'string' ? x.slice(0, max) : '');
const zahl = (x: unknown): number => (typeof x === 'number' && Number.isInteger(x) && x > 0 ? x : 0);

function eintragLesen(x: unknown, stufe: AtStufe): AtEintrag | null {
  if (!istObjekt(x)) return null;
  const e: AtEintrag = {
    datei: txt(x.datei, 60), name: txt(x.name, 80), gebiete: zahl(x.gebiete), bytes: zahl(x.bytes), gz: zahl(x.gz), sha256: txt(x.sha256, 64),
    eigenschaften: Array.isArray(x.eigenschaften) ? x.eigenschaften.filter((p): p is string => typeof p === 'string').map(p => p.slice(0, 40)).slice(0, 10) : []
  };
  if (e.datei !== `karten/at/${stufe}.json` || !e.gebiete || !e.bytes || !/^[0-9a-f]{64}$/.test(e.sha256)) return null;
  return e;
}
/** Liest index.json von karten/at. `null`, wenn es nicht die erwartete Form hat. */
export function atIndexLesen(x: unknown): AtIndex | null {
  if (!istObjekt(x) || x.format !== 'statable-karten-at' || x.version !== 1 || !istObjekt(x.quelle)) return null;
  const bezirke = eintragLesen(x.bezirke, 'bezirke'), gemeinden = eintragLesen(x.gemeinden, 'gemeinden');
  if (!bezirke || !gemeinden || !/^https:\/\//.test(txt(x.lizenzAdresse))) return null;
  const q = x.quelle;
  return {
    quelle: { anbieter: txt(q.anbieter, 200), datensatz: txt(q.datensatz, 200), stichtag: txt(q.stichtag, 10), adresse: txt(q.adresse, 300), sha256: txt(q.sha256, 64), abgerufen: txt(q.abgerufen, 10) },
    lizenz: txt(x.lizenz, 120), lizenzAdresse: txt(x.lizenzAdresse), namensnennung: txt(x.namensnennung, 200), bearbeitung: txt(x.bearbeitung, 300), bezirke, gemeinden
  };
}

let indexMerker: Promise<KartenErgebnis<AtIndex>> | null = null;
async function atIndexHolen(opt: KartenOpt): Promise<KartenErgebnis<AtIndex>> {
  const r = await kartenHolen('karten/at/index.json', opt);
  if (!r.ok) return r;
  let j: unknown;
  try { j = JSON.parse(r.wert); } catch { return { ok: false, fehler: 'karten-form' }; }
  const i = atIndexLesen(j);
  return i ? { ok: true, wert: i } : { ok: false, fehler: 'karten-form' };
}
/** Das Verzeichnis (einmal geholt, dann gemerkt; ein Fehlschlag wird nicht gemerkt). */
export function atIndex(opt: KartenOpt = {}): Promise<KartenErgebnis<AtIndex>> {
  if (opt.fetchFn) return atIndexHolen(opt);
  if (!indexMerker) indexMerker = atIndexHolen(opt).then(r => { if (!r.ok) indexMerker = null; return r; });
  return indexMerker;
}

export interface AtGeladen { daten: GeoDaten; index: AtIndex; stufe: AtStufe }
/** Die Bezirke oder die Gemeinden laden und lesen. Wirft nie. */
export async function atLaden(stufe: AtStufe, opt: KartenOpt = {}): Promise<KartenErgebnis<AtGeladen>> {
  if (!AT_STUFEN.includes(stufe)) return { ok: false, fehler: 'karten-laden' };
  const i = await atIndex(opt);
  if (!i.ok) return i;
  const e = i.wert[stufe];
  const r = await kartenHolen(e.datei, opt, e);
  if (!r.ok) return r;
  const g = geoLesen(r.wert);
  if (!g.ok || g.daten.gebiete.length !== e.gebiete) return { ok: false, fehler: 'karten-form' };
  return { ok: true, wert: { daten: g.daten, index: i.wert, stufe } };
}

/* ------------------------------------------------------------------------------------------------------------------------------- Texte */
const datumDe = (iso: string): string => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso); return m ? `${m[3]}.${m[2]}.${m[1]}` : iso; };
/** Die Zeile „Grenzen: …“ im Bild: Quelle, Stichtag, Lizenz, mit Hinweis auf die Bearbeitung (CC BY verlangt, Änderungen zu nennen). */
export function atGrenzenText(i: AtIndex, stufe: AtStufe): string {
  const was = stufe === 'bezirke' ? L('Politische Bezirke', 'Political districts') : L('Gemeinden', 'Municipalities');
  return L(
    `Grenzen: ${was} Österreichs, Bundesamt für Eich- und Vermessungswesen (BEV), Verwaltungsgrenzen, Stichtag ${datumDe(i.quelle.stichtag)}, CC BY 4.0. Vereinfacht und zusammengefasst.`,
    `Boundaries: ${was} of Austria, Federal Office of Metrology and Surveying (BEV), administrative boundaries, as of ${datumDe(i.quelle.stichtag)}, CC BY 4.0. Simplified and merged.`);
}
/** Sätze zur Kennzahl: in welcher Form die Codes in den Daten stehen müssen. */
export function atKennzahlSaetze(stufe: AtStufe, i: AtIndex): string[] {
  const zahlen = i[stufe].gebiete;
  if (stufe === 'bezirke') return [
    L(`Jeder Bezirk hat eine dreistellige Bezirkskennzahl (zum Beispiel 101 für Eisenstadt (Stadt), 601 für Graz (Stadt)). Die Eigenschaft BKZ enthält sie so; BKZ_B enthält dieselbe Zahl mit vorangestelltem B (B101), wie in den offenen Daten von Statistik Austria. Die Karte hat ${zahlen} Bezirke (79 politische Bezirke und 15 Statutarstädte; Wien ist ein Bezirk).`,
      `Each district has a three-digit district code (for example 101 for Eisenstadt (Stadt), 617 for Graz-Umgebung). The property BKZ holds it like that; BKZ_B holds the same number with a leading B (B101), as in the open data of Statistik Austria. The map has ${zahlen} districts (79 political districts and 15 cities with their own statute; Vienna is one district).`),
    L('Ein Bezirk ist erst zugeordnet, wenn der Code in der Spalte genau so geschrieben ist. Eine Zahlenspalte (101) passt zu BKZ, nicht zu B101. Weiter gesucht wird nicht.', 'A district is assigned only when the code in the column is written exactly that way. A number column (101) fits BKZ, not B101. Nothing further is searched.')
  ];
  return [
    L(`Jede Gemeinde hat eine fünfstellige Gemeindekennzahl (zum Beispiel 10101 für Eisenstadt). Die ersten drei Stellen sind die Bezirkskennzahl. Die Eigenschaft GKZ enthält sie so; GKZ_G enthält dieselbe Zahl mit vorangestelltem G (G10101), wie in den offenen Daten von Statistik Austria. Die Karte hat ${zahlen} Gemeinden.`,
      `Each municipality has a five-digit municipality code (for example 10101 for Eisenstadt). The first three digits are the district code. The property GKZ holds it like that; GKZ_G holds the same number with a leading G (G10101), as in the open data of Statistik Austria. The map has ${zahlen} municipalities.`),
    L('Wien ist eine Gemeinde (90001). Die 23 Wiener Gemeindebezirke (zum Beispiel 90101) sind in den Grenzen nicht enthalten; solche Codes bleiben nicht zugeordnet und werden gezählt.', 'Vienna is one municipality (90001). The 23 districts of Vienna (for example 90101) are not part of the boundaries; such codes stay unassigned and are counted.'),
    L('Eine Gemeinde ist erst zugeordnet, wenn der Code in der Spalte genau so geschrieben ist. Beim Einlesen als Text bleibt „10101“ erhalten; Namen (NAME) passen nur, wenn sie in der Quelle genauso stehen, und können doppelt vorkommen.', 'A municipality is assigned only when the code in the column is written exactly that way. Read as text, "10101" is kept; names (NAME) fit only if they are written the same in the source, and can occur twice.')
  ];
}
export const atStandSatz = (): string => L('Gemeinden und Bezirke ändern sich (Zusammenlegungen). Die Grenzen gelten für den genannten Stichtag; Daten aus einem anderen Jahr können Codes enthalten, die es nicht mehr oder noch nicht gibt.', 'Municipalities and districts change (mergers). The boundaries are valid for the stated date; data from another year can contain codes that no longer or do not yet exist.');
