/**
 * Klassifikationen zuordnen (Abschnitt 3): Codes wie ÖNACE oder ISCO bekommen den Titel oder den Code einer gewählten Ebene.
 * Quelle: Klassifikationsdatenbank von Statistik Austria (CC BY 4.0), nur die Struktur (Ebene, Code, Titel) auf Deutsch und Englisch.
 * Die Dateien liegen unter `klass/<id>.json` und werden erst beim Gebrauch geladen (nie im Kern). Erzeugt von `scripts/klass-holen.mjs`.
 *
 * Grundsätze:
 *  - Keine Näherungssuche. Ein Code, der nicht gefunden wird, bleibt leer und wird gezählt, mit den ersten Beispielen.
 *  - Schreibweisen werden nur nach einer klaren Regel angeglichen (Leerzeichen, Punkt und Bindestrich bei ÖNACE; Groß- und Kleinschreibung) und das wird im Satz gesagt.
 *  - Die Datei ist fremde Eingabe: Format, Größe und Typen werden geprüft; Titel sind Daten und kommen nur als Text in die Anzeige.
 */
import { L, Lp, d } from './sitzung.svelte';

export type KlassId = 'oenace2008' | 'oenace2025' | 'isco08' | 'nuts2021' | 'nuts2024';
/** `anbieter`: woher die Datei stammt (bestimmt Quellenangabe und Lizenz). `ebenenVersatz`: Nummer der obersten Ebene in der Quelle (NUTS beginnt bei 0: Ebene 1 der Datei ist NUTS-Ebene 0). */
export interface KlassInfo { id: KlassId; name: string; schreibweise: 'oenace' | 'isco' | 'nuts'; anbieter: 'statistik-austria' | 'eurostat'; ebenenVersatz: number }
export const KLASSIFIKATIONEN: KlassInfo[] = [
  { id: 'oenace2008', name: 'ÖNACE 2008', schreibweise: 'oenace', anbieter: 'statistik-austria', ebenenVersatz: 0 },
  { id: 'oenace2025', name: 'ÖNACE 2025', schreibweise: 'oenace', anbieter: 'statistik-austria', ebenenVersatz: 0 },
  { id: 'isco08', name: 'ISCO-08', schreibweise: 'isco', anbieter: 'statistik-austria', ebenenVersatz: 0 },
  { id: 'nuts2021', name: 'NUTS 2021', schreibweise: 'nuts', anbieter: 'eurostat', ebenenVersatz: 1 },
  { id: 'nuts2024', name: 'NUTS 2024', schreibweise: 'nuts', anbieter: 'eurostat', ebenenVersatz: 1 }
];
/** Die Nummer einer Ebene, wie die Quelle sie zählt (bei NUTS: 0 bis 3). */
export const ebenenNummer = (info: KlassInfo, ebene: number): number => ebene - info.ebenenVersatz;
export const KLASS_MAX_BYTES = 5 * 1024 * 1024, KLASS_MAX_EINTRAEGE = 20_000;
/** Wortlaut an der Quelle (gelesen am 31.10.2026 in den Metadaten der drei Datensätze bei data.statistik.gv.at). Für NUTS steht der Wortlaut in der Datei selbst (Eurostat, gelesen am 01.11.2026). */
export const KLASS_LIZENZ = 'Creative Commons Namensnennung 4.0 International (CC BY 4.0)';
export const KLASS_NAMENSNENNUNG = 'Datenquelle: Statistik Austria - data.statistik.gv.at';

export interface KlassEintrag { ebene: number; edv: string; code: string; de: string; en: string }
export interface Klassifikation {
  id: KlassId; name: string; ebenen: number; eintraege: KlassEintrag[];
  quelle: { adresse: string; sha256: string; abgerufen: string }; lizenz: string; namensnennung: string;
}
export type KlassLesen = { ok: true; klass: Klassifikation } | { ok: false; grund: 'unlesbar' | 'fremd' | 'zu-gross' | 'form' };

const istObjekt = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x);
const eigen = (o: Record<string, unknown>, k: string): unknown => (Object.prototype.hasOwnProperty.call(o, k) ? o[k] : undefined);
const kurz = (x: unknown, max: number) => (typeof x === 'string' ? x.slice(0, max) : '');

/** Liest den Text einer Klassifikationsdatei. Wirft nie. */
export function klassLesen(text: string, erwartet?: KlassId): KlassLesen {
  if (typeof text !== 'string') return { ok: false, grund: 'unlesbar' };
  if (text.length > KLASS_MAX_BYTES) return { ok: false, grund: 'zu-gross' };
  let j: unknown;
  try { j = JSON.parse(text); } catch { return { ok: false, grund: 'unlesbar' }; }
  if (!istObjekt(j) || eigen(j, 'format') !== 'statable-klassifikation' || eigen(j, 'version') !== 1) return { ok: false, grund: 'fremd' };
  const id = eigen(j, 'id');
  if (!KLASSIFIKATIONEN.some(k => k.id === id) || (erwartet && id !== erwartet)) return { ok: false, grund: 'fremd' };
  const e = eigen(j, 'e');
  if (!Array.isArray(e) || e.length === 0) return { ok: false, grund: 'form' };
  if (e.length > KLASS_MAX_EINTRAEGE) return { ok: false, grund: 'zu-gross' };
  const eintraege: KlassEintrag[] = [];
  let ebenen = 0;
  for (const r of e) {
    if (!Array.isArray(r) || r.length < 5 || !Number.isInteger(r[0]) || r[0] < 1 || r[0] > 9 || typeof r[1] !== 'string' || typeof r[2] !== 'string' || typeof r[3] !== 'string' || typeof r[4] !== 'string' || !r[1]) return { ok: false, grund: 'form' };
    ebenen = Math.max(ebenen, r[0]);
    eintraege.push({ ebene: r[0], edv: r[1].slice(0, 32), code: r[2].slice(0, 32), de: r[3].slice(0, 2000), en: r[4].slice(0, 2000) });
  }
  const q = eigen(j, 'quelle');
  return { ok: true, klass: {
    id: id as KlassId, name: KLASSIFIKATIONEN.find(k => k.id === id)!.name, ebenen, eintraege,
    quelle: istObjekt(q) ? { adresse: kurz(eigen(q, 'adresse'), 300), sha256: kurz(eigen(q, 'sha256'), 64), abgerufen: kurz(eigen(q, 'abgerufen'), 10) } : { adresse: '', sha256: '', abgerufen: '' },
    lizenz: kurz(eigen(j, 'lizenz'), 200), namensnennung: kurz(eigen(j, 'namensnennung'), 200)
  } };
}

/* ------------------------------------------------------------------------------------------------------------------------------- Laden (bei Bedarf) */
const geladen = new Map<KlassId, Promise<Klassifikation>>();
/** Lädt eine Klassifikation mit dem übergebenen Abruf (die Oberfläche übergibt `klassHolen` aus klassladen.ts). Wirft mit einem Satz für die Person, wenn es nicht klappt. */
export function klassLaden(id: KlassId, holen: (adresse: string) => Promise<string>): Promise<Klassifikation> {
  let p = geladen.get(id);
  if (!p) {
    p = (async () => {
      let text: string;
      try { text = await holen(`klass/${id}.json`); } catch { throw new Error(klassFehlerSatz('netz')); }
      const r = klassLesen(text, id);
      if (!r.ok) throw new Error(klassFehlerSatz(r.grund));
      return r.klass;
    })();
    p.catch(() => geladen.delete(id));
    geladen.set(id, p);
  }
  return p;
}
export const klassCacheLeeren = () => geladen.clear();
/* ------------------------------------------------------------------------------------------------------------------------------- Zuordnen */
/** Die Schreibweise eines Codes für den Vergleich. NUTS: nur Leerzeichen fallen weg, Großbuchstaben. ÖNACE: Leerzeichen, Punkt und Bindestrich fallen weg, Großbuchstaben. ISCO: nur Leerzeichen fallen weg. */
export function normalisiere(roh: string, art: KlassInfo['schreibweise']): string {
  const t = roh.normalize('NFKC').trim().toUpperCase();
  if (art === 'nuts') return t.replace(/\s/g, '');
  return art === 'oenace' ? t.replace(/[\s.\-‐-―]/g, '') : t.replace(/\s/g, '');
}

export interface KlassIndex { nachSchluessel: Map<string, number>; ebene: number[]; vorfahren: (number | null)[][]; mehrdeutig: number }
/** Der Suchindex: EDV-Code und aufbereiteter Code, bei ÖNACE zusätzlich der Code ohne Abschnittsbuchstaben (01.11). Ein Schlüssel, der zu zwei Einträgen führt, wird nicht benutzt. */
export function klassIndex(k: Klassifikation): KlassIndex {
  const art = KLASSIFIKATIONEN.find(x => x.id === k.id)!.schreibweise;
  const karte = new Map<string, number>(), schlecht = new Set<string>();
  const setze = (s: string, i: number) => { if (!s) return; const alt = karte.get(s); if (alt === undefined) karte.set(s, i); else if (alt !== i) schlecht.add(s); };
  const stapel: number[] = [];     // je Ebene (ab 1) der letzte Eintrag
  const vorfahren: (number | null)[][] = [];
  k.eintraege.forEach((e, i) => {
    stapel.length = e.ebene;       // tiefere Ebenen verfallen
    stapel[e.ebene - 1] = i;
    vorfahren.push(Array.from({ length: e.ebene }, (_, l) => (l === e.ebene - 1 ? i : (stapel[l] ?? null))));
    const a = normalisiere(e.edv, art), b = normalisiere(e.code, art);
    setze(a, i); setze(b, i);
    if (art === 'oenace') { const o = /^[A-Z](\d.*)$/.exec(a); if (o) setze(o[1]!, i); }
  });
  for (const s of schlecht) karte.delete(s);
  return { nachSchluessel: karte, ebene: k.eintraege.map(e => e.ebene), vorfahren, mehrdeutig: schlecht.size };
}

export type CodeWert = string | number | null | undefined;
export interface ZuordnenOpt { /** gewünschte Ebene (1 = gröbste); 0 = die Ebene des Codes selbst */ ebene: number; ziel: 'titel' | 'code'; sprache: 'de' | 'en'; /** Die Spalte ist eine Zahlenspalte: führende Nullen können beim Einlesen verloren gegangen sein */ zahlenSpalte?: boolean }
export interface ZuordnenErgebnis {
  werte: (string | null)[];
  gefunden: number;
  /** Eingabe war leer */
  leer: number;
  /** Code nicht in der Klassifikation */
  nichtGefunden: number;
  /** Code gefunden, liegt aber gröber als die gewählte Ebene (es gibt dort keinen Vorfahren) */
  zuGrob: number;
  /** Zahl der gefundenen Codes, die nur durch das Angleichen der Schreibweise gefunden wurden */
  angeglichen: number;
  beispiele: string[];
  /** Zahlen mit Nachkommastellen (zum Beispiel 1,11 statt 01.11): nicht zugeordnet */
  nichtGanz: number;
  /** Klassifikationseinträge, die mindestens ein Code getroffen hat */
  getroffen: number;
}

export const KLASS_BEISPIELE = 5;
const anzeigeCode = (t: string) => (t.length > 40 ? t.slice(0, 40) + '…' : t);

/** Ordnet die Codes zu. Ändert nichts an der Eingabe. */
export function klassZuordnen(k: Klassifikation, idx: KlassIndex, codes: readonly CodeWert[], opt: ZuordnenOpt): ZuordnenErgebnis {
  const art = KLASSIFIKATIONEN.find(x => x.id === k.id)!.schreibweise;
  const werte: (string | null)[] = new Array(codes.length).fill(null);
  const bsp: string[] = [], gesehen = new Set<string>();
  const getroffen = new Set<number>();
  let gefunden = 0, leer = 0, nichtGefunden = 0, zuGrob = 0, angeglichen = 0, nichtGanz = 0;
  const merke = (t: string) => { if (bsp.length < KLASS_BEISPIELE && !gesehen.has(t)) { gesehen.add(t); bsp.push(anzeigeCode(t)); } };
  codes.forEach((c, z) => {
    if (c === null || c === undefined || (typeof c === 'string' && c.trim() === '') || (typeof c === 'number' && Number.isNaN(c))) { leer++; return; }
    let text: string;
    if (typeof c === 'number') {
      if (!Number.isInteger(c)) { nichtGanz++; nichtGefunden++; merke(String(c).replace('.', ',')); return; }
      text = String(c);
    } else text = c;
    const i = idx.nachSchluessel.get(normalisiere(text, art));
    if (i === undefined) { nichtGefunden++; merke(text); return; }
    const e = k.eintraege[i]!;
    if (text.trim() !== e.edv && text.trim() !== e.code) angeglichen++;
    getroffen.add(i);
    const ziel = opt.ebene === 0 ? i : (idx.vorfahren[i]![opt.ebene - 1] ?? null);
    if (opt.ebene !== 0 && opt.ebene > e.ebene) { zuGrob++; return; }
    if (ziel === null) { zuGrob++; return; }
    const t = k.eintraege[ziel]!;
    werte[z] = opt.ziel === 'code' ? t.code : (opt.sprache === 'de' ? t.de : t.en) || t.de;
    gefunden++;
  });
  return { werte, gefunden, leer, nichtGefunden, zuGrob, angeglichen, beispiele: bsp, nichtGanz, getroffen: getroffen.size };
}

/** Wie viele Einträge hat die Klassifikation je Ebene (für die Auswahl der Ebene). */
export function eintraegeJeEbene(k: Klassifikation): number[] {
  const n = new Array<number>(k.ebenen).fill(0);
  for (const e of k.eintraege) n[e.ebene - 1]!++;
  return n;
}

/* ------------------------------------------------------------------------------------------------------------------------------- Sätze */
export function klassFehlerSatz(g: 'netz' | 'unlesbar' | 'fremd' | 'zu-gross' | 'form'): string {
  switch (g) {
    case 'netz': return d('Die Klassifikation ließ sich nicht laden. Prüfe die Verbindung und versuche es noch einmal.', 'Die Klassifikation ließ sich nicht laden. Prüfen Sie die Verbindung und versuchen Sie es noch einmal.', 'The classification could not be loaded. Check the connection and try again.');
    case 'unlesbar': return L('Die Datei der Klassifikation ist nicht lesbar.', 'The classification file is not readable.');
    case 'fremd': return L('Die Datei ist keine Klassifikation, die Statable kennt.', 'The file is not a classification Statable knows.');
    case 'zu-gross': return L('Die Datei der Klassifikation ist größer als erwartet und wird nicht gelesen.', 'The classification file is larger than expected and is not read.');
    case 'form': return L('Die Datei der Klassifikation hat nicht die erwartete Form.', 'The classification file does not have the expected form.');
  }
}

export const klassQuelleSatz = (k: Klassifikation): string => k.id.startsWith('nuts')
  ? L(`Quelle: Eurostat, ${k.name} (Codes und Namen der Gebietseinheiten), abgerufen am ${k.quelle.abgerufen}. Wiederverwendung gestattet mit Nennung der Quelle (Beschluss 2011/833/EU). ${k.namensnennung}.`, `Source: Eurostat, ${k.name} (codes and names of the territorial units), retrieved on ${k.quelle.abgerufen}. Re-use is authorised provided the source is acknowledged (Decision 2011/833/EU). ${k.namensnennung}.`)
  : L(`Quelle: Klassifikationsdatenbank von Statistik Austria, ${k.name}, abgerufen am ${k.quelle.abgerufen}. Lizenz: ${KLASS_LIZENZ}. ${KLASS_NAMENSNENNUNG}.`, `Source: classification database of Statistik Austria, ${k.name}, retrieved on ${k.quelle.abgerufen}. Licence: ${KLASS_LIZENZ} (Creative Commons Attribution 4.0 International). ${KLASS_NAMENSNENNUNG}.`);
export const klassNutsSpracheSatz = (): string => L('Die Namen stehen in der Landessprache, wie Eurostat sie führt (zum Beispiel „Ostösterreich“, „Île-de-France“). Bei bulgarischen und griechischen Namen steht in der englischen Fassung die lateinische Umschrift. Übersetzt wird nichts.', 'The names are in the national language, as Eurostat has them (for example "Ostösterreich", "Île-de-France"). For Bulgarian and Greek names the English version holds the Latin transliteration. Nothing is translated.');
export const klassSpracheSatz = (sprache: 'de' | 'en', appDe: boolean): string =>
  sprache === 'de' ? L('Die Titel stehen auf Deutsch, wie die Quelle sie führt.', 'The titles are in German, as the source has them.')
    : appDe ? L('Die Titel stehen auf Englisch, wie die Quelle sie führt.', 'The titles are in English, as the source has them.')
      : L('Die Titel stehen auf Englisch, wie die Quelle sie führt. Übersetzt in andere Sprachen wird nichts.', 'The titles are in English, as the source has them. Nothing is translated into other languages.');
export const klassSchreibweiseSatz = (art: KlassInfo['schreibweise']): string => art === 'nuts'
  ? L('Beim Vergleich zählen Groß- und Kleinschreibung und Leerzeichen im Code nicht (at11 und AT11 sind derselbe Code). Weiter gesucht wird nicht.', 'When comparing, upper and lower case and spaces in the code do not count (at11 and AT11 are the same code). Nothing further is searched.')
  : art === 'oenace'
  ? L('Beim Vergleich zählen Groß- und Kleinschreibung, Leerzeichen, Punkte und Bindestriche im Code nicht. So gelten „01.11“, „0111“ und „A 01.11“ als derselbe Code. Weiter gesucht wird nicht.', 'When comparing, upper and lower case, spaces, dots and hyphens in the code do not count. So "01.11", "0111" and "A 01.11" are the same code. Nothing further is searched.')
  : L('Beim Vergleich zählen Groß- und Kleinschreibung und Leerzeichen im Code nicht. Weiter gesucht wird nicht.', 'When comparing, upper and lower case and spaces in the code do not count. Nothing further is searched.');
export const klassOenaceWarnung = (): string => L('ÖNACE 2008 und ÖNACE 2025 sind nicht gleich. Von einer Fassung auf die andere zu wechseln ist kein Umbenennen: Manche Tätigkeiten wurden geteilt, zusammengelegt oder verschoben. Statable bietet keinen Umsteigeschlüssel.', 'ÖNACE 2008 and ÖNACE 2025 are not the same. Switching from one version to the other is not just a renaming: some activities were split, merged or moved. Statable offers no crosswalk.');
export const klassNutsWarnung = (): string => L('NUTS 2021 und NUTS 2024 sind nicht gleich: Einige Regionen wurden geteilt, zusammengelegt oder umbenannt (etwa in Deutschland, Lettland, Italien). Die Fassung muss zu den Daten passen. Statable bietet keinen Umsteigeschlüssel. Die Ebenen heißen wie in der Quelle: NUTS 0 sind die Länder, NUTS 1 bis 3 werden feiner. Dazu kommen die Statistischen Regionen von Ländern außerhalb der EU (zum Beispiel Schweiz, Norwegen, Türkei).', 'NUTS 2021 and NUTS 2024 are not the same: some regions were split, merged or renamed (for example in Germany, Latvia, Italy). The version must fit the data. Statable offers no crosswalk. The levels are named as in the source: NUTS 0 are the countries, NUTS 1 to 3 become finer. Statistical regions of countries outside the EU (for example Switzerland, Norway, Turkey) are included.');
export const klassNullenWarnung = (): string => L('Die Spalte ist eine Zahlenspalte. Beim Einlesen als Zahl gehen führende Nullen verloren (aus „0110“ wird 110, aus „01.11“ wird 1,11), und solche Codes werden nicht gefunden. Besser die Datei neu öffnen und die Spalte „als Text lesen“.', 'The column is a number column. When read as a number, leading zeros are lost ("0110" becomes 110, "01.11" becomes 1.11), and such codes are not found. It is better to open the file again and read the column "as text".');
export const klassNichtWiederholbarSatz = (): string => L('Dieser Schritt lässt sich in einer Vorlage nicht wiederholen. Die Zuordnung braucht die geladene Klassifikation.', 'This step cannot be repeated in a template. The assignment needs the loaded classification.');

/** Die Sätze zum Ergebnis: gefunden, leer, nicht gefunden (mit Beispielen), zu grob, angeglichen. */
export function klassErgebnisSaetze(r: ZuordnenErgebnis, gesamt: number): string[] {
  const s: string[] = [];
  s.push(Lp(r.gefunden, `${r.gefunden} von ${gesamt} Zeilen haben einen Wert bekommen.`, `${r.gefunden} von ${gesamt} Zeilen haben einen Wert bekommen.`, `${r.gefunden} of ${gesamt} rows got a value.`, `${r.gefunden} of ${gesamt} rows got a value.`));
  if (r.nichtGefunden) s.push(Lp(r.nichtGefunden, `${r.nichtGefunden} Code wurde in der Klassifikation nicht gefunden und bleibt leer (zum Beispiel ${r.beispiele.join(', ')}).`, `${r.nichtGefunden} Codes wurden in der Klassifikation nicht gefunden und bleiben leer (zum Beispiel ${r.beispiele.join(', ')}).`, `${r.nichtGefunden} code was not found in the classification and stays empty (for example ${r.beispiele.join(', ')}).`, `${r.nichtGefunden} codes were not found in the classification and stay empty (for example ${r.beispiele.join(', ')}).`));
  if (r.leer) s.push(Lp(r.leer, `${r.leer} Zeile hat keinen Code und bleibt leer.`, `${r.leer} Zeilen haben keinen Code und bleiben leer.`, `${r.leer} row has no code and stays empty.`, `${r.leer} rows have no code and stay empty.`));
  if (r.zuGrob) s.push(Lp(r.zuGrob, `${r.zuGrob} Code liegt gröber als die gewählte Ebene. Dort gibt es keinen Wert, die Zelle bleibt leer.`, `${r.zuGrob} Codes liegen gröber als die gewählte Ebene. Dort gibt es keinen Wert, die Zellen bleiben leer.`, `${r.zuGrob} code is coarser than the chosen level. There is no value there, the cell stays empty.`, `${r.zuGrob} codes are coarser than the chosen level. There is no value there, the cells stay empty.`));
  if (r.nichtGanz) s.push(Lp(r.nichtGanz, `${r.nichtGanz} Zahl hat Nachkommastellen und wird nicht als Code gelesen.`, `${r.nichtGanz} Zahlen haben Nachkommastellen und werden nicht als Code gelesen.`, `${r.nichtGanz} number has decimals and is not read as a code.`, `${r.nichtGanz} numbers have decimals and are not read as a code.`));
  if (r.angeglichen) s.push(Lp(r.angeglichen, `Bei ${r.angeglichen} Zeile wurde die Schreibweise des Codes angeglichen.`, `Bei ${r.angeglichen} Zeilen wurde die Schreibweise des Codes angeglichen.`, `In ${r.angeglichen} row the spelling of the code was adjusted.`, `In ${r.angeglichen} rows the spelling of the code was adjusted.`));
  return s;
}
/** Und die andere Richtung: Einträge der Klassifikation, die in den Daten gar nicht vorkommen, werden nicht aufgelistet; die Zahl steht im Satz. */
export const klassTrefferSatz = (getroffen: number, eintraege: number): string =>
  Lp(getroffen, `In den Daten kommt ${getroffen} von ${eintraege} Einträgen der Klassifikation vor.`, `In den Daten kommen ${getroffen} von ${eintraege} Einträgen der Klassifikation vor.`, `${getroffen} of ${eintraege} entries of the classification occur in the data.`, `${getroffen} of ${eintraege} entries of the classification occur in the data.`);
