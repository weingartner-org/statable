/**
 * Was am Projekt hängt, ohne Teil der Daten oder eines Blatts zu sein: die Plausibilitätsregeln (Abschnitt 4) und die Karte (Abschnitt 1 und 2).
 * Alles hier ist verschachtelt: gespeichert wird nur eine Kopie (`$state.snapshot`), und gelesen wird nur mit Prüfung (Projektdatei und Ablage sind fremde Eingabe).
 */
import { leseRegeln, type Regel } from './plausibel';
import type { KlassenArt, KarteQuelle } from './karte';

export const KARTE_SPEICHER_MAX = 5 * 1024 * 1024;

export interface KarteStand {
  quelle: KarteQuelle;
  /** Die Grenzen als GeoJSON-Text, nur wenn sie klein genug sind (höchstens 5 MB); sonst `null` und die Datei muss neu geöffnet werden. Bei Welt und Land immer `null`: sie liegen auf dem eigenen Server und werden beim Öffnen wieder geholt. */
  geo: string | null;
  gebietSpalte: string; wertSpalte: string; eigenschaft: string; beschriftung: string;
  klassenArt: KlassenArt; klassen: number;
}
export interface Zusatz { plausi?: Regel[]; karte?: KarteStand }

const istObjekt = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x);
const text = (x: unknown, max = 300) => (typeof x === 'string' ? x.slice(0, max) : '');

export function karteStandLesen(x: unknown): KarteStand | undefined {
  if (!istObjekt(x)) return undefined;
  const q = x.quelle;
  if (!istObjekt(q) || (q.art !== 'gisco' && q.art !== 'datei' && q.art !== 'welt' && q.art !== 'land' && q.art !== 'at')) return undefined;
  const iso3 = typeof q.iso3 === 'string' && /^[A-Z]{3}$/.test(q.iso3) ? q.iso3 : '';
  const stufe = q.stufe === 'bezirke' || q.stufe === 'gemeinden' ? q.stufe : null;
  if (q.art === 'at' && !stufe) return undefined;
  if (q.art === 'land' && !iso3) return undefined;   // ohne Land lässt sich die Karte nicht wieder laden
  const quelle: KarteQuelle = { art: q.art, name: text(q.name, 200), ...(q.art === 'land' ? { iso3 } : {}), ...(q.art === 'at' && stufe ? { stufe } : {}), ...(typeof q.ebene === 'number' && Number.isInteger(q.ebene) && q.ebene >= 0 && q.ebene <= 3 ? { ebene: q.ebene } : {}), ...(typeof q.land === 'string' && /^[A-Z]{2}$/.test(q.land) ? { land: q.land } : {}) };
  const geo = (quelle.art === 'welt' || quelle.art === 'land' || quelle.art === 'at') ? null : typeof x.geo === 'string' && x.geo.length <= KARTE_SPEICHER_MAX ? x.geo : null;
  const k = typeof x.klassen === 'number' && Number.isInteger(x.klassen) ? Math.min(7, Math.max(3, x.klassen)) : 5;
  return { quelle, geo, gebietSpalte: text(x.gebietSpalte, 200), wertSpalte: text(x.wertSpalte, 200), eigenschaft: text(x.eigenschaft, 200), beschriftung: text(x.beschriftung, 200), klassenArt: x.klassenArt === 'gleich' ? 'gleich' : 'quantil', klassen: k };
}

/** Liest das Feld `zusatz` aus Ablage oder Projektdatei: was nicht passt, fällt weg. Wirft nie. */
export function leseZusatz(x: unknown): Zusatz {
  if (!istObjekt(x)) return {};
  const aus: Zusatz = {};
  const regeln = leseRegeln(x.plausi);
  if (regeln.length) aus.plausi = regeln;
  const karte = karteStandLesen(x.karte);
  if (karte) aus.karte = karte;
  return aus;
}
