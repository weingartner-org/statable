/**
 * Karte der ganzen Welt: Projektion (Equal Earth, flächentreu), Mitte über die größte Lücke der Längengrade, Zuordnung von Staaten über Kürzel und Namen.
 * Reine Rechnung ohne Abruf und ohne Oberfläche. Zuordnung der Staaten: genau gleich nach Trimmen, Groß/Klein und Unicode-Normalform NFC. Keine Näherungssuche; Akzente zählen.
 */
import type { Gebiet, Zuordnung } from './karte';

/* ------------------------------------------------------------------------------------------------------------------------------- Projektion */
const A1 = 1.340264, A2 = -0.081106, A3 = 0.000893, A4 = 0.003796, M = Math.sqrt(3) / 2;
const RAD = Math.PI / 180;

/** Equal Earth (Šavrič, Patterson, Jenny 2018): Länge und Breite in Grad, Ergebnis x, y (y nach oben), mittlerer Meridian 0. */
export function equalEarth(lon: number, lat: number): [number, number] {
  const l = Math.asin(M * Math.sin(lat * RAD)), l2 = l * l, l6 = l2 * l2 * l2;
  return [(lon * RAD * Math.cos(l)) / (M * (A1 + 3 * A2 * l2 + l6 * (7 * A3 + 9 * A4 * l2))), l * (A1 + A2 * l2 + l6 * (A3 + A4 * l2))];
}

/** Dreht eine Länge um den Mittelmeridian `lam0` in den Bereich von -180 bis 180. Bei lam0 = 0 bleibt jede Länge, wie sie ist (also auch +180 und -180). */
export function drehen(lon: number, lam0: number): number {
  let l = lon - lam0;
  if (l > 180) l -= 360; else if (l < -180) l += 360;
  return l;
}

/** Die Länge auf [-180, 180) bringen (180 wird -180). */
const norm360 = (x: number): number => ((((x + 180) % 360) + 360) % 360) - 180;

/**
 * Mitte der Karte: die größte leere Lücke der Längengrade suchen (mit Umlauf über ±180); gedreht wird um deren Gegenseite.
 * So hängen Fidschi und Russland zusammen. Ohne Punkte: 0.
 */
export function mitteBerechnen(laengen: ArrayLike<number>): number {
  if (!laengen.length) return 0;
  const n = new Float64Array(laengen.length);
  for (let i = 0; i < n.length; i++) n[i] = norm360(laengen[i]!);
  n.sort();
  const s: number[] = [];
  for (let i = 0; i < n.length; i++) if (i === 0 || n[i] !== n[i - 1]) s.push(n[i]!);
  let besteLuecke = s[0]! + 360 - s[s.length - 1]!, a = s[s.length - 1]!;
  for (let i = 0; i + 1 < s.length; i++) { const g = s[i + 1]! - s[i]!; if (g > besteLuecke) { besteLuecke = g; a = s[i]!; } }
  const m = a + besteLuecke / 2;
  return norm360(m + 180);
}
/** Alle Längen der Gebiete (für `mitteBerechnen`). */
export function alleLaengen(gebiete: readonly Gebiet[]): Float64Array {
  let n = 0;
  for (const g of gebiete) for (const f of g.flaechen) for (const r of f) n += r.length / 2;
  const aus = new Float64Array(n);
  let k = 0;
  for (const g of gebiete) for (const f of g.flaechen) for (const r of f) for (let i = 0; i < r.length; i += 2) aus[k++] = r[i]!;
  return aus;
}

/**
 * Ein Ring in Kartenkoordinaten, nach dem Drehen um `lam0`. Springt die gedrehte Länge zwischen zwei Punkten um mehr als 180 Grad, läuft der Ring über die Naht
 * (Datumsgrenze) und wird fortgesetzt statt quer über das Bild gezogen. Ausnahme: ein Sprung zwischen zwei Punkten am Pol (der Pol ist in Equal Earth eine Linie).
 */
export function ringKarte(r: Float64Array, lam0: number, ein: (x: number, y: number) => void): void {
  let versatz = 0, vorher = NaN, vorherBreite = NaN;
  for (let i = 0; i < r.length; i += 2) {
    const breite = r[i + 1]!;
    let l = drehen(r[i]!, lam0) + versatz;
    if (Number.isFinite(vorher) && Math.abs(l - vorher) > 180 && !(Math.abs(breite) >= 89.99 && Math.abs(vorherBreite) >= 89.99)) {
      const v = l - vorher > 0 ? -360 : 360;
      versatz += v; l += v;
    }
    vorher = l; vorherBreite = breite;
    const [x, y] = equalEarth(l, breite);
    ein(x, y);
  }
}

/* ------------------------------------------------------------------------------------------------------------------------------- Namen und Schlüssel der Staaten */
const gleich = (t: string): string => t.normalize('NFC').trim().toLowerCase();
export const staatenSchluessel = gleich;

/** Der Name eines Staats in einer Sprache nach Intl (leer, wenn Intl ihn nicht kennt). */
export function regionName(iso2: string, sprache: string): string {
  if (!/^[A-Z]{2}$/.test(iso2)) return '';
  try {
    const n = new Intl.DisplayNames([sprache], { type: 'region' }).of(iso2);
    return n && n !== iso2 ? n : '';
  } catch { return ''; }
}
/** Die Anzeige eines Staats in der Sprache der App: Intl, sonst der Name aus Natural Earth in dieser Sprache, sonst der englische Name. */
export function staatAnzeige(g: Gebiet, sprache: string): string {
  return regionName(g.eig.get('iso2') ?? '', sprache) || g.eig.get('name_' + sprache.slice(0, 2)) || g.eig.get('name') || g.eig.get('iso3') || '';
}
/** Alle Schreibweisen, mit denen ein Staat getroffen wird: Kürzel, Name aus Natural Earth, Namen nach Intl in den Sprachen. */
export function staatSchluessel(g: Gebiet, sprachen: readonly string[]): string[] {
  const roh = [g.eig.get('iso2'), g.eig.get('iso3'), g.eig.get('name'), g.eig.get('kurz'), g.eig.get('name_de'), g.eig.get('name_en')];
  for (const sp of sprachen) roh.push(regionName(g.eig.get('iso2') ?? '', sp));
  return [...new Set(roh.filter((x): x is string => !!x && x.trim() !== '').map(gleich))];
}

export interface StaatenZuordnung extends Zuordnung {
  /** Namen in den Daten, die zu mehr als einem Staat passen: werden nicht zugeordnet */
  codesMehrdeutig: number;
  mehrdeutigBeispiele: string[];
}

/**
 * Ordnet Werte den Staaten zu. Die Spalte der Daten darf Kürzel (zwei oder drei Buchstaben) oder Namen enthalten (in der Sprache der App oder englisch).
 * Passt ein Name zu zwei Staaten, bleibt er unzugeordnet und wird gezählt. Gleiche Einträge in mehreren Zeilen, oder zwei verschiedene Schreibweisen desselben Staats, sind nicht eindeutig: kein Wert.
 */
export function staatenZuordnen(gebiete: readonly Gebiet[], codes: readonly (string | number | null)[], werte: readonly (number | null)[], sprachen: readonly string[], beispiele = 5): StaatenZuordnung {
  const nachSchluessel = new Map<string, number[]>();
  gebiete.forEach((g, i) => { for (const k of staatSchluessel(g, sprachen)) { const l = nachSchluessel.get(k); if (l) l.push(i); else nachSchluessel.set(k, [i]); } });
  const nachCode = new Map<string, { zeilen: number[]; anzeige: string }>();
  let zeilenOhneCode = 0;
  codes.forEach((c, i) => {
    const t = c === null || c === undefined ? '' : String(c).trim();
    if (t === '') { zeilenOhneCode++; return; }
    const k = gleich(t), l = nachCode.get(k);
    if (l) l.zeilen.push(i); else nachCode.set(k, { zeilen: [i], anzeige: t });
  });
  let codesMehrfach = 0, codesMehrdeutig = 0, codesOhneGebiet = 0;
  const codesBeispiele: string[] = [], mehrdeutigBeispiele: string[] = [];
  const kurz = (t: string) => (t.length > 40 ? t.slice(0, 40) + '…' : t);
  const treffer: { zeilen: number[]; code: string }[][] = gebiete.map(() => []);
  for (const [k, e] of nachCode) {
    if (e.zeilen.length > 1) codesMehrfach++;
    const g = nachSchluessel.get(k);
    if (!g) { codesOhneGebiet++; if (codesBeispiele.length < beispiele) codesBeispiele.push(kurz(e.anzeige)); continue; }
    if (g.length > 1) { codesMehrdeutig++; if (mehrdeutigBeispiele.length < beispiele) mehrdeutigBeispiele.push(kurz(e.anzeige)); continue; }
    treffer[g[0]!]!.push({ zeilen: e.zeilen, code: k });
  }
  const aus: (number | null)[] = [], zeile: number[] = [], status: Zuordnung['status'] = [], gebieteBeispiele: string[] = [];
  let gebieteOhneDaten = 0, gebieteKeinWert = 0, zugeordnet = 0;
  gebiete.forEach((g, i) => {
    const t = treffer[i]!;
    if (!t.length) { aus.push(null); zeile.push(-1); status.push('ohne-daten'); gebieteOhneDaten++; if (gebieteBeispiele.length < beispiele) gebieteBeispiele.push(g.eig.get('name') ?? g.eig.get('iso3') ?? ''); return; }
    if (t.length > 1 || t[0]!.zeilen.length > 1) {
      if (t.length > 1 && t.every(x => x.zeilen.length === 1)) codesMehrfach++;   // zwei Schreibweisen desselben Staats, zum Beispiel „Kenya“ und „KE“: Der Satz muss das nennen
      aus.push(null); zeile.push(-1); status.push('mehrfach'); return;
    }
    const z = t[0]!.zeilen[0]!, v = werte[z] ?? null;
    zeile.push(z);
    if (v === null || !Number.isFinite(v)) { aus.push(null); status.push('kein-wert'); gebieteKeinWert++; } else { aus.push(v); status.push('wert'); zugeordnet++; }
  });
  return { werte: aus, zeile, status, gebieteOhneDaten, codesOhneGebiet, codesBeispiele, gebieteBeispiele, zeilenOhneCode, codesMehrfach, gebieteKeinWert, zugeordnet, codesMehrdeutig, mehrdeutigBeispiele };
}

/** Welche der Spalten enthält am ehesten Staaten? (Anteil der Zeilen, die genau einen Staat treffen.) `null`, wenn keine einen trifft. */
export function staatenSpalteVorschlag(gebiete: readonly Gebiet[], spalten: readonly { name: string; werte: readonly (string | number | null)[] }[], sprachen: readonly string[]): string | null {
  const nachSchluessel = new Map<string, number>();
  for (const g of gebiete) for (const k of staatSchluessel(g, sprachen)) nachSchluessel.set(k, (nachSchluessel.get(k) ?? 0) + 1);
  let best: string | null = null, bestN = 0;
  for (const sp of spalten) {
    const mengen = new Set<string>();
    for (const v of sp.werte) { const t = v === null || v === undefined ? '' : gleich(String(v)); if (t && nachSchluessel.get(t) === 1) mengen.add(t); }
    if (mengen.size > bestN) { best = sp.name; bestN = mengen.size; }
  }
  return best;
}

/* ------------------------------------------------------------------------------------------------------------------------------- Verzeichnis der Dateien (index.json) */
export interface KartenEintrag {
  iso3: string; iso2?: string; name?: string;
  quelle: 'Natural Earth' | 'geoBoundaries'; quelleDetail: string; lizenz: string; lizenzAdresse: string; klasse: 'frei' | 'sa'; stand: string;
  gebiete: number; bytes: number; gz?: number; sha256: string;
}
export interface KartenIndex { welt: KartenEintrag; laender: Record<string, KartenEintrag> }
const istObjekt = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x);
const txt = (x: unknown, max = 300): string => (typeof x === 'string' ? x.slice(0, max) : '');
function eintragLesen(x: unknown): KartenEintrag | null {
  if (!istObjekt(x)) return null;
  const q = x.quelle;
  if (q !== 'Natural Earth' && q !== 'geoBoundaries') return null;
  const iso3 = txt(x.iso3, 8);
  if (!/^[A-Z]{3,5}$/.test(iso3)) return null;
  const gebiete = typeof x.gebiete === 'number' && Number.isInteger(x.gebiete) && x.gebiete > 0 ? x.gebiete : 0;
  const bytes = typeof x.bytes === 'number' && Number.isInteger(x.bytes) && x.bytes > 0 ? x.bytes : 0;
  const adresse = txt(x.lizenzAdresse, 300);
  if (!gebiete || !bytes || !/^https:\/\//.test(adresse)) return null;
  return { iso3, iso2: /^[A-Z]{2}$/.test(txt(x.iso2, 2)) ? txt(x.iso2, 2) : '', name: txt(x.name, 120), quelle: q, quelleDetail: txt(x.quelleDetail, 200), lizenz: txt(x.lizenz, 120), lizenzAdresse: adresse, klasse: x.klasse === 'sa' ? 'sa' : 'frei', stand: txt(x.stand, 120), gebiete, bytes, gz: typeof x.gz === 'number' ? x.gz : undefined, sha256: txt(x.sha256, 64) };
}
/** Liest index.json (fremde Eingabe im Sinn der Prüfung): was nicht passt, fällt weg. `null`, wenn der Eintrag für die Welt fehlt. */
export function indexLesen(x: unknown): KartenIndex | null {
  if (!istObjekt(x) || x.format !== 'statable-karten') return null;
  const welt = eintragLesen(x.welt);
  if (!welt || !istObjekt(x.laender)) return null;
  const laender: Record<string, KartenEintrag> = {};
  for (const [k, v] of Object.entries(x.laender)) { const e = eintragLesen(v); if (e && e.iso3 === k && /^[A-Z]{3}$/.test(k)) laender[k] = e; }
  return { welt, laender };
}
/** Die Zeile „Grenzen: …“ im Bild: Quelle, bei geoBoundaries mit Herkunft und Lizenz, immer mit dem Stand. */
export function grenzenQuelleText(e: KartenEintrag, deutsch: boolean): string {
  if (e.quelle === 'Natural Earth') return deutsch ? `Grenzen: Natural Earth (gemeinfrei), Stand ${e.stand}.` : `Boundaries: Natural Earth (public domain), as of ${e.stand}.`;
  const herkunft = e.quelleDetail ? `${e.quelleDetail}, ` : '';
  return deutsch ? `Grenzen: geoBoundaries (${herkunft}${e.lizenz}), Stand ${e.stand}.` : `Boundaries: geoBoundaries (${herkunft}${e.lizenz}), as of ${e.stand}.`;
}
