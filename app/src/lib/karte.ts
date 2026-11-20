/**
 * Karte: Flächenkarte aus Grenzen der ganzen Welt oder eines Landes (vom eigenen Server, Natural Earth und geoBoundaries), aus GeoJSON, die die Person öffnet, oder aus Grenzen, die sie von Eurostat (GISCO) laden lässt.
 * Grenzen von Eurostat werden nicht mitgeliefert (Lizenz der Daten: nur nicht-kommerziell, nicht übertragbar, Pflichtvermerk). Rechnet in JavaScript, das Bild entsteht ohne Bibliothek.
 *
 * Grundsätze:
 *  - GeoJSON ist fremde Eingabe: Typen, Größen und Koordinaten werden geprüft. Texte daraus (Namen, Eigenschaften) sind Daten und kommen nur als Textknoten in die Anzeige, nie als HTML und nie in Attribute von Pfaden.
 *  - Die Zuordnung läuft über eine wählbare Eigenschaft. Nicht zugeordnete Codes werden in beide Richtungen gezählt und genannt. Ein Gebiet ohne Wert ist „kein Wert“, nie 0.
 *  - Neben der Karte steht immer eine echte Tabelle mit denselben Werten.
 *  - Die Projektion ist Equal Earth (flächentreu), gedreht um die Mitte der Daten (Weltkarte: Mitte 0). Das steht im Fuß des Bildes.
 */
import { L, Lp, d } from './sitzung.svelte';
import { dez } from '../i18n/profil';
import { alleLaengen, mitteBerechnen, ringKarte, type KartenEintrag } from './weltkarte';
import type { KartenFehler } from './kartenladen';

export const KARTE_MAX_BYTES = 20 * 1024 * 1024, KARTE_MAX_OBJEKTE = 20_000, KARTE_MAX_PUNKTE = 3_000_000, KARTE_MAX_EIGENSCHAFTEN = 60, KARTE_MAX_TEXT = 200, KARTE_MAX_TABELLE = 2000;
export const GISCO_MAX_BYTES = 5 * 1024 * 1024, GISCO_ZEITLIMIT_MS = 60_000;
export const GISCO_ORIGIN = 'https://gisco-services.ec.europa.eu';
const GISCO_PFAD = '/distribution/v2/nuts/geojson/';
export const GISCO_LAENDER = /^[A-Z]{2}$/;

/* ------------------------------------------------------------------------------------------------------------------------------- Pflichtvermerk und Bedingungen */
/** Pflichtvermerk der Daten von Eurostat/GISCO: in Bild und Export, in der Sprache der App (Deutsch und Englisch im Wortlaut der Seite von Eurostat). */
export const karteVermerk = (): string => L('© EuroGeographics bezüglich der Verwaltungsgrenzen', '© EuroGeographics for the administrative boundaries');
export const giscoBedingungSatz = (): string => d(
  'Die Grenzen kommen von Eurostat (GISCO) und gehören EuroGeographics. Sie dürfen nur nicht-kommerziell verwendet werden, die Quelle muss genannt werden, und das Recht ist nicht übertragbar. Darum liefert Statable sie nicht mit, sondern lädt sie nur auf deinen Klick.',
  'Die Grenzen kommen von Eurostat (GISCO) und gehören EuroGeographics. Sie dürfen nur nicht-kommerziell verwendet werden, die Quelle muss genannt werden, und das Recht ist nicht übertragbar. Darum liefert Statable sie nicht mit, sondern lädt sie nur auf Ihren Klick.',
  'The boundaries come from Eurostat (GISCO) and belong to EuroGeographics. They may only be used non-commercially, the source must be named, and the right is not transferable. This is why Statable does not ship them but loads them only when you click.');
export const giscoBestaetigungText = (): string => L('Die Grenzen werden nur nicht-kommerziell verwendet, und die Quelle wird genannt.', 'The boundaries are used only non-commercially, and the source is named.');
export const giscoDatenschutzSatz = (): string =>
  L('Beim Klick auf „Grenzen von Eurostat laden“ geht eine Anfrage an die Europäische Kommission (gisco-services.ec.europa.eu). Deren Server sieht dabei die IP-Adresse und die Adresse der Datei. Sonst geht nichts dorthin; Daten aus Statable werden nicht gesendet.',
    'Clicking "Load boundaries from Eurostat" sends a request to the European Commission (gisco-services.ec.europa.eu). Its server sees the IP address and the address of the file. Nothing else goes there; no data from Statable is sent.');
export const giscoSpeicherSatz = (): string => d('Die Grenzen werden nur an dieser Karte in deinem Projekt gespeichert, nicht auf einem Server.', 'Die Grenzen werden nur an dieser Karte in Ihrem Projekt gespeichert, nicht auf einem Server.', 'The boundaries are stored only with this map in your project, not on a server.');

/* ------------------------------------------------------------------------------------------------------------------------------- GeoJSON lesen */
export type GeoFehler = 'unlesbar' | 'form' | 'typ' | 'zu-gross' | 'zu-viele' | 'koordinaten' | 'leer';
/** Ein Gebiet: Eigenschaften (nur Text, Zahl, Wahrheitswert; als Text) und Flächen. Eine Fläche ist eine Liste von Ringen; ein Ring liegt als [Länge, Breite, Länge, Breite …]. */
export interface Gebiet { eig: Map<string, string>; flaechen: Float64Array[][] }
export interface GeoDaten {
  gebiete: Gebiet[]; eigenschaften: string[];
  /** Objekte ohne Fläche (kein Polygon oder MultiPolygon, oder keine Geometrie): nicht gezeichnet */
  ohneFlaeche: number;
  punkte: number;
}
const istObjekt = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x);
const eigen = (o: Record<string, unknown>, k: string): unknown => (Object.prototype.hasOwnProperty.call(o, k) ? o[k] : undefined);
const STEUER = new RegExp('[' + String.fromCharCode(0) + '-' + String.fromCharCode(31) + String.fromCharCode(127) + '-' + String.fromCharCode(159) + String.fromCharCode(0x200b) + '-' + String.fromCharCode(0x200f) + String.fromCharCode(0x2028) + '-' + String.fromCharCode(0x202e) + String.fromCharCode(0x2066) + '-' + String.fromCharCode(0x2069) + ']', 'g');   // Steuerzeichen, Zeilentrenner und Umschalter der Schreibrichtung
const sauber = (t: string) => t.replace(STEUER, ' ').trim().slice(0, KARTE_MAX_TEXT);

export type GeoErgebnis = { ok: true; daten: GeoDaten } | { ok: false; fehler: GeoFehler };

function ringLesen(r: unknown, zaehler: { n: number }): Float64Array | null {
  if (!Array.isArray(r) || r.length < 4) return null;
  zaehler.n += r.length;
  if (zaehler.n > KARTE_MAX_PUNKTE) return null;
  const aus = new Float64Array(r.length * 2);
  for (let i = 0; i < r.length; i++) {
    const p = r[i];
    if (!Array.isArray(p) || p.length < 2 || typeof p[0] !== 'number' || typeof p[1] !== 'number' || !Number.isFinite(p[0]) || !Number.isFinite(p[1]) || Math.abs(p[0]) > 180 || Math.abs(p[1]) > 90) return null;
    aus[2 * i] = p[0]; aus[2 * i + 1] = p[1];
  }
  return aus;
}

/** Liest GeoJSON (Text oder schon gelesenes JSON): FeatureCollection oder ein einzelnes Feature mit Polygon oder MultiPolygon. Wirft nie. */
export function geoLesen(roh: string | unknown): GeoErgebnis {
  let j: unknown = roh;
  if (typeof roh === 'string') {
    if (roh.length > KARTE_MAX_BYTES) return { ok: false, fehler: 'zu-gross' };
    try { j = JSON.parse(roh); } catch { return { ok: false, fehler: 'unlesbar' }; }
  }
  if (!istObjekt(j)) return { ok: false, fehler: 'form' };
  let objekte: unknown[];
  const typ = eigen(j, 'type');
  if (typ === 'FeatureCollection') { const f = eigen(j, 'features'); if (!Array.isArray(f)) return { ok: false, fehler: 'form' }; objekte = f; }
  else if (typ === 'Feature') objekte = [j];
  else return { ok: false, fehler: 'typ' };
  if (objekte.length > KARTE_MAX_OBJEKTE) return { ok: false, fehler: 'zu-viele' };
  const gebiete: Gebiet[] = [], schluessel = new Set<string>();
  let ohneFlaeche = 0;
  const zaehler = { n: 0 };
  for (const o of objekte) {
    if (!istObjekt(o) || eigen(o, 'type') !== 'Feature') return { ok: false, fehler: 'form' };
    const g = eigen(o, 'geometry');
    const p = eigen(o, 'properties');
    if (p !== null && p !== undefined && !istObjekt(p)) return { ok: false, fehler: 'form' };
    let flaechen: Float64Array[][] | null = null;
    if (g === null || g === undefined) { ohneFlaeche++; continue; }
    if (!istObjekt(g)) return { ok: false, fehler: 'form' };
    const gt = eigen(g, 'type'), c = eigen(g, 'coordinates');
    if (gt === 'Polygon' || gt === 'MultiPolygon') {
      if (!Array.isArray(c)) return { ok: false, fehler: 'form' };
      const polys: unknown[] = gt === 'Polygon' ? [c] : c;
      flaechen = [];
      for (const poly of polys) {
        if (!Array.isArray(poly) || poly.length < 1) return { ok: false, fehler: 'form' };
        const ringe: Float64Array[] = [];
        for (const r of poly) { const ring = ringLesen(r, zaehler); if (!ring) return { ok: false, fehler: zaehler.n > KARTE_MAX_PUNKTE ? 'zu-gross' : 'koordinaten' }; ringe.push(ring); }
        flaechen.push(ringe);
      }
    } else if (typeof gt === 'string') { ohneFlaeche++; continue; }
    else return { ok: false, fehler: 'form' };
    const eig = new Map<string, string>();
    if (p) {
      let n = 0;
      for (const [k, v] of Object.entries(p)) {
        if (n++ >= KARTE_MAX_EIGENSCHAFTEN) break;
        if (typeof v === 'string') eig.set(sauber(k), sauber(v));
        else if (typeof v === 'number' && Number.isFinite(v)) eig.set(sauber(k), String(v));
        else if (typeof v === 'boolean') eig.set(sauber(k), v ? 'true' : 'false');
        schluessel.add(sauber(k));
      }
    }
    gebiete.push({ eig, flaechen });
  }
  if (!gebiete.length) return { ok: false, fehler: objekte.length ? 'typ' : 'leer' };
  return { ok: true, daten: { gebiete, eigenschaften: [...schluessel].filter(k => gebiete.some(g => g.eig.has(k))), ohneFlaeche, punkte: zaehler.n } };
}

/** Von den Grenzen Europas nur ein Land: nach `NUTS_ID` (beginnt mit dem Länderkürzel) oder `CNTR_CODE`. Wirft nie; ein anderes Format kommt unverändert zurück. */
export function geoLandFiltern(roh: unknown, land: string): unknown {
  if (!GISCO_LAENDER.test(land) || !istObjekt(roh) || eigen(roh, 'type') !== 'FeatureCollection' || !Array.isArray(eigen(roh, 'features'))) return roh;
  const f = (eigen(roh, 'features') as unknown[]).filter(o => {
    if (!istObjekt(o)) return false;
    const p = eigen(o, 'properties');
    if (!istObjekt(p)) return false;
    const c = eigen(p, 'CNTR_CODE'), id = eigen(p, 'NUTS_ID');
    return c === land || (typeof id === 'string' && id.startsWith(land));
  });
  return { type: 'FeatureCollection', features: f };
}

/* ------------------------------------------------------------------------------------------------------------------------------- Eurostat/GISCO laden */
/** Die feste Adresse (NUTS-Ebene 0 bis 3, Maßstab 1:60 Mio., Stand 2024). Keine andere Adresse wird abgerufen. */
export const giscoAdresse = (ebene: number): string | null => (Number.isInteger(ebene) && ebene >= 0 && ebene <= 3 ? `${GISCO_ORIGIN}${GISCO_PFAD}NUTS_RG_60M_2024_4326_LEVL_${ebene}.geojson` : null);
export const giscoAdresseOk = (a: string): boolean => /^https:\/\/gisco-services\.ec\.europa\.eu\/distribution\/v2\/nuts\/geojson\/NUTS_RG_60M_2024_4326_LEVL_[0-3]\.geojson$/.test(a);
export type GiscoFehler = 'netz' | 'zeitlimit' | 'abgebrochen' | 'umleitung' | 'nicht-gefunden' | 'dienst' | 'zu-gross' | 'adresse';
export interface GiscoOpt { fetchFn?: typeof fetch; signal?: AbortSignal; zeitlimitMs?: number }
export type GiscoErgebnis = { ok: true; text: string; bytes: number } | { ok: false; fehler: GiscoFehler };

/** Ein Abruf. Gesendet wird nur die feste Adresse: keine Cookies, kein Referrer, keine Weiterleitung; höchstens 5 MB; nach 60 s Abbruch. Wirft nie. */
export async function giscoAbrufen(adresse: string, opt: GiscoOpt = {}): Promise<GiscoErgebnis> {
  if (!giscoAdresseOk(adresse)) return { ok: false, fehler: 'adresse' };
  if (opt.signal?.aborted) return { ok: false, fehler: 'abgebrochen' };
  const f = opt.fetchFn ?? (typeof fetch === 'function' ? fetch.bind(globalThis) : null);
  if (!f) return { ok: false, fehler: 'netz' };
  const ac = new AbortController();
  let zeit = false;
  const uhr = setTimeout(() => { zeit = true; ac.abort(); }, opt.zeitlimitMs ?? GISCO_ZEITLIMIT_MS);
  const vonAussen = () => ac.abort();
  opt.signal?.addEventListener('abort', vonAussen, { once: true });
  const ende = (fehler: GiscoFehler): GiscoErgebnis => ({ ok: false, fehler: zeit ? 'zeitlimit' : opt.signal?.aborted ? 'abgebrochen' : fehler });
  try {
    const res = await f(adresse, { method: 'GET', credentials: 'omit', redirect: 'error', referrerPolicy: 'no-referrer', cache: 'no-store', headers: { Accept: 'application/geo+json, application/json' }, signal: ac.signal });
    if (res.redirected || (res.url && !giscoAdresseOk(res.url))) { void res.body?.cancel().catch(() => {}); return { ok: false, fehler: 'umleitung' }; }
    if (!res.ok) { void res.body?.cancel().catch(() => {}); return { ok: false, fehler: res.status === 404 ? 'nicht-gefunden' : 'dienst' }; }
    const laenge = Number(res.headers.get('content-length'));
    if (Number.isFinite(laenge) && laenge > GISCO_MAX_BYTES) { void res.body?.cancel().catch(() => {}); return { ok: false, fehler: 'zu-gross' }; }
    const teile: Uint8Array[] = [];
    let summe = 0;
    if (res.body) {
      const leser = res.body.getReader();
      for (;;) {
        const { done, value } = await leser.read();
        if (done) break;
        summe += value.byteLength;
        if (summe > GISCO_MAX_BYTES) { void leser.cancel().catch(() => {}); return { ok: false, fehler: 'zu-gross' }; }
        teile.push(value);
      }
    } else {
      const roh = new Uint8Array(await res.arrayBuffer());
      if (roh.byteLength > GISCO_MAX_BYTES) return { ok: false, fehler: 'zu-gross' };
      teile.push(roh); summe = roh.byteLength;
    }
    const bytes = new Uint8Array(summe);
    let pos = 0;
    for (const t of teile) { bytes.set(t, pos); pos += t.byteLength; }
    return { ok: true, text: new TextDecoder('utf-8').decode(bytes), bytes: summe };
  } catch { return ende('netz'); }
  finally { clearTimeout(uhr); opt.signal?.removeEventListener('abort', vonAussen); }
}

/** Abruf, Land filtern, lesen: alles, was „Grenzen von Eurostat laden“ tut (ohne Oberfläche). */
export async function giscoLaden(ebene: number, land: string, opt: GiscoOpt = {}): Promise<{ ok: true; daten: GeoDaten; text: string; bytes: number } | { ok: false; fehler: GiscoFehler | GeoFehler | 'land' }> {
  const a = giscoAdresse(ebene);
  if (!a) return { ok: false, fehler: 'adresse' };
  if (!GISCO_LAENDER.test(land)) return { ok: false, fehler: 'land' };
  const r = await giscoAbrufen(a, opt);
  if (!r.ok) return r;
  let j: unknown;
  try { j = JSON.parse(r.text); } catch { return { ok: false, fehler: 'unlesbar' }; }
  const g = geoLesen(geoLandFiltern(j, land));
  if (!g.ok) return g.fehler === 'leer' ? { ok: false, fehler: 'land' } : g;
  // Gespeichert wird nur das gefilterte Land, nicht die ganze Datei
  return { ok: true, daten: g.daten, text: JSON.stringify(geoLandFiltern(j, land)), bytes: r.bytes };
}

/* ------------------------------------------------------------------------------------------------------------------------------- Zuordnen */
export interface Zuordnung {
  /** je Gebiet: Wert, `null` = kein Wert (Code vorhanden, Wert fehlt) oder kein Code in den Daten */
  werte: (number | null)[];
  /** je Gebiet: Zeile in den Daten (ab 0) oder -1 */
  zeile: number[];
  status: ('wert' | 'kein-wert' | 'ohne-daten' | 'mehrfach')[];
  /** Gebiete, zu denen die Daten keinen Code haben */
  gebieteOhneDaten: number;
  /** Codes in den Daten, zu denen es kein Gebiet gibt (verschiedene Codes) */
  codesOhneGebiet: number;
  codesBeispiele: string[];
  gebieteBeispiele: string[];
  /** Zeilen ohne Code */
  zeilenOhneCode: number;
  /** Codes, die in mehr als einer Zeile vorkommen: bekommen keinen Wert */
  codesMehrfach: number;
  /** Namen in den Daten, die zu mehr als einem Staat passen (nur bei Staaten) */
  codesMehrdeutig?: number;
  mehrdeutigBeispiele?: string[];
  /** Gebiete mit Code und leerem Wert */
  gebieteKeinWert: number;
  zugeordnet: number;
}
export const BEISPIELE = 5;

/**
 * Ordnet die Werte den Gebieten zu: über den Text der gewählten Eigenschaft und den Code in der Datenspalte (genau gleich nach Entfernen von Leerzeichen am Rand, mit Beachtung der Großschreibung).
 * Ein Code, der in den Daten mehrfach vorkommt, ist nicht eindeutig und bekommt keinen Wert. Fehlende Werte bleiben `null`, nie 0.
 */
export function karteZuordnen(gebiete: readonly Gebiet[], eigenschaft: string, codes: readonly (string | number | null)[], werte: readonly (number | null)[], anzeige: string = eigenschaft): Zuordnung {
  const nachCode = new Map<string, number[]>();
  let zeilenOhneCode = 0;
  codes.forEach((c, i) => {
    const t = c === null || c === undefined ? '' : String(c).trim();
    if (t === '') { zeilenOhneCode++; return; }
    const l = nachCode.get(t); if (l) l.push(i); else nachCode.set(t, [i]);
  });
  const codesMehrfach = [...nachCode.values()].filter(l => l.length > 1).length;
  const gebietsCodes = new Set<string>();
  const ausWerte: (number | null)[] = [], zeile: number[] = [], status: Zuordnung['status'] = [];
  const gebieteBeispiele: string[] = [];
  let gebieteOhneDaten = 0, gebieteKeinWert = 0, zugeordnet = 0;
  for (const g of gebiete) {
    const c = g.eig.get(eigenschaft)?.trim() ?? '';
    if (c !== '') gebietsCodes.add(c);
    const l = c === '' ? undefined : nachCode.get(c);
    if (!l) { ausWerte.push(null); zeile.push(-1); status.push('ohne-daten'); gebieteOhneDaten++; if (gebieteBeispiele.length < BEISPIELE) gebieteBeispiele.push(c || (g.eig.get(anzeige) ?? '')); continue; }
    if (l.length > 1) { ausWerte.push(null); zeile.push(-1); status.push('mehrfach'); continue; }
    const v = werte[l[0]!] ?? null;
    zeile.push(l[0]!);
    if (v === null || !Number.isFinite(v)) { ausWerte.push(null); status.push('kein-wert'); gebieteKeinWert++; } else { ausWerte.push(v); status.push('wert'); zugeordnet++; }
  }
  const codesBeispiele: string[] = [];
  let codesOhneGebiet = 0;
  for (const c of nachCode.keys()) if (!gebietsCodes.has(c)) { codesOhneGebiet++; if (codesBeispiele.length < BEISPIELE) codesBeispiele.push(c.length > 40 ? c.slice(0, 40) + '…' : c); }
  return { werte: ausWerte, zeile, status, gebieteOhneDaten, codesOhneGebiet, codesBeispiele, gebieteBeispiele, zeilenOhneCode, codesMehrfach, gebieteKeinWert, zugeordnet };
}

/** Welche Eigenschaft trifft die meisten Codes der Daten? Nur ein Vorschlag; die Person wählt. `null`, wenn keine einen Code trifft. */
export function eigenschaftVorschlag(gebiete: readonly Gebiet[], eigenschaften: readonly string[], codes: readonly (string | number | null)[]): string | null {
  const menge = new Set(codes.map(c => (c === null || c === undefined ? '' : String(c).trim())).filter(Boolean));
  let best: string | null = null, bestN = 0;
  for (const e of eigenschaften) {
    let n = 0;
    for (const g of gebiete) { const v = g.eig.get(e)?.trim(); if (v && menge.has(v)) n++; }
    if (n > bestN) { best = e; bestN = n; }
  }
  return best;
}

/* ------------------------------------------------------------------------------------------------------------------------------- Klassen und Farben */
export type KlassenArt = 'quantil' | 'gleich';
export const KLASSEN_MIN = 3, KLASSEN_MAX = 7, KLASSEN_STANDARD = 5;
export interface Klassen { grenzen: number[]; art: KlassenArt; gewuenscht: number; /** wirklich entstandene Klassen (bei vielen gleichen Werten weniger) */ anzahl: number }

/** Quantil nach Typ 7 (wie R-Standard). `sortiert` aufsteigend. */
function quantil(sortiert: readonly number[], p: number): number {
  const h = (sortiert.length - 1) * p, u = Math.floor(h), o = Math.ceil(h);
  return sortiert[u]! + (h - u) * (sortiert[o]! - sortiert[u]!);
}
/** Klassengrenzen für 3 bis 7 Klassen: Quantile oder gleich breit. Gleiche Grenzen fallen zusammen: Dann gibt es weniger Klassen als gewünscht. Ohne Werte: keine Klassen. */
export function klassenBilden(werte: readonly number[], art: KlassenArt, k: number): Klassen | null {
  const x = werte.filter(Number.isFinite).sort((a, b) => a - b);
  const wunsch = Math.min(KLASSEN_MAX, Math.max(KLASSEN_MIN, Math.round(k)));
  if (!x.length) return null;
  const roh: number[] = [];
  for (let i = 0; i <= wunsch; i++) roh.push(art === 'quantil' ? quantil(x, i / wunsch) : x[0]! + ((x.at(-1)! - x[0]!) * i) / wunsch);
  roh[0] = x[0]!; roh[wunsch] = x.at(-1)!;
  const grenzen = roh.filter((g, i) => i === 0 || g > roh[i - 1]!);
  if (grenzen.length < 2) return { grenzen: [x[0]!, x[0]!], art, gewuenscht: wunsch, anzahl: 1 };
  return { grenzen, art, gewuenscht: wunsch, anzahl: grenzen.length - 1 };
}
/** Die Klasse eines Werts (ab 0); die oberste Klasse schließt die obere Grenze ein. */
export function klasseVon(k: Klassen, v: number): number {
  if (k.anzahl === 1) return 0;
  for (let i = 0; i < k.anzahl; i++) if (v < k.grenzen[i + 1]! || i === k.anzahl - 1) return i;
  return k.anzahl - 1;
}
/** Einstufige Abstufung von hell nach dunkel, eines Tons; die Helligkeit nimmt gleichmäßig ab, darum ist sie auch in Graustufen zu unterscheiden. Feste Farben, damit der Export überall gleich aussieht. */
export function klassenFarbe(i: number, n: number): string {
  const t = n <= 1 ? 0.6 : i / (n - 1);
  const von = [232, 240, 247], bis = [8, 48, 107];
  const c = von.map((a, k) => Math.round(a + (bis[k]! - a) * (0.08 + 0.92 * t)));
  return '#' + c.map(v => v.toString(16).padStart(2, '0')).join('');
}
export const KEIN_WERT_FARBE = '#cfcfcf';

/* ------------------------------------------------------------------------------------------------------------------------------- Projektion und Bild */
export interface Rahmen { breite: number; hoehe: number; pfade: string[][]; /** Mittelmeridian, um den gedreht wurde */ mitte: number }
/**
 * Projektion: Equal Earth (flächentreu), vorher um die Mitte der Daten gedreht (`mitte`; ohne Angabe: die Gegenseite der größten Lücke der Längengrade, so hängen Fidschi und Russland zusammen).
 * Dann in ein Rechteck der Breite `breite` (Höhe folgt dem Seitenverhältnis, höchstens `maxHoehe`). Ein Ring über die Datumsgrenze wird fortgesetzt, nicht quer über das Bild gezogen.
 * Punkte, die nach dem Runden auf eine Zehntel Einheit auf demselben Fleck liegen, werden zusammengefasst. Ergebnis: je Gebiet ein Pfadtext (nur Zahlen).
 */
export function projiziere(gebiete: readonly Gebiet[], breite = 560, maxHoehe = 520, rand = 8, mitte?: number): Rahmen {
  const lam0 = mitte ?? mitteBerechnen(alleLaengen(gebiete));
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const g of gebiete) for (const f of g.flaechen) for (const r of f) ringKarte(r, lam0, (x, y) => { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; });
  if (!Number.isFinite(x0)) return { breite, hoehe: 0, pfade: gebiete.map(() => []), mitte: lam0 };
  const bw = Math.max(x1 - x0, 1e-9), bh = Math.max(y1 - y0, 1e-9);
  const innen = breite - 2 * rand;
  let mass = innen / bw;
  if (bh * mass > maxHoehe - 2 * rand) mass = (maxHoehe - 2 * rand) / bh;
  const hoehe = bh * mass + 2 * rand, links = rand + (innen - bw * mass) / 2;
  const pfade = gebiete.map(g => g.flaechen.map(f => {
    let aus = '';
    for (const r of f) {
      let ring = '', letzteX = NaN, letzteY = NaN, n = 0;
      ringKarte(r, lam0, (x, y) => {
        const px = Math.round((links + (x - x0) * mass) * 10) / 10, py = Math.round((rand + (y1 - y) * mass) * 10) / 10;
        if (px === letzteX && py === letzteY) return;
        ring += (n === 0 ? 'M' : 'L') + px + ' ' + py; n++; letzteX = px; letzteY = py;
      });
      if (n >= 3) aus += ring + 'Z';   // ein Ring, der auf weniger als drei Punkte schrumpft, ist zu klein für diesen Maßstab
    }
    return aus;
  }));
  return { breite, hoehe, pfade, mitte: lam0 };
}

/** Woher die Grenzen kommen. `welt`, `land` und `at` liegen auf dem eigenen Server (nur Art und ISO3 werden am Projekt gespeichert, nicht die Umrisse). */
export interface KarteQuelle { art: 'gisco' | 'datei' | 'welt' | 'land' | 'at'; /** nur bei `at`: Bezirke oder Gemeinden Österreichs (BEV) */ stufe?: 'bezirke' | 'gemeinden'; /** Name der Datei, wie ihn die Person gewählt hat (nur Anzeige) oder der Datensatz */ name: string; ebene?: number; land?: string; iso3?: string }
export interface KarteModell {
  breite: number; hoehe: number;
  gebiete: { d: string; fuell: string; titel: string; /** kein Wert: wird zusätzlich schraffiert, damit es auch in Graustufen nicht mit einer Klasse zu verwechseln ist */ kein: boolean }[];
  legende: { farbe: string; text: string; kein?: boolean }[];
  fuss: string[];
  vermerk: string | null;
  beschreibung: string;
  titel: string;
}
export const keinWertText = (): string => L('kein Wert', 'no value');

/** Ein Zahlenbereich der Legende, mit höchstens 3 Nachkommastellen im Sprachformat. */
export function zahlText(v: number): string {
  const a = Math.abs(v);
  const t = a !== 0 && (a < 0.001 || a >= 1e9) ? v.toPrecision(3) : String(Math.round(v * 1000) / 1000);
  return dez(t);
}

export interface KarteEingabe {
  gebiete: readonly Gebiet[]; rahmen: Rahmen; zuordnung: Zuordnung; klassen: Klassen | null;
  wertName: string; gebietName: string; beschriftung: string; quelle: KarteQuelle;
  /** Die Zeile „Grenzen: …“ für Welt und Land (aus dem Verzeichnis der Dateien, mit Quelle, Lizenz und Stand) */
  grenzenText?: string;
}
/** Das Bild als Daten: Pfade, Legende und Fuß. Alle Texte sind Daten und werden nur als Textknoten gesetzt. */
export function karteModell(e: KarteEingabe): KarteModell {
  const titel = L(`Karte: ${e.wertName}`, `Map: ${e.wertName}`);
  const gebiete = e.gebiete.map((g, i) => {
    const w = e.zuordnung.werte[i] ?? null;
    const name = g.eig.get(e.beschriftung) || g.eig.get(e.gebietName) || '';
    const fuell = w === null || !e.klassen ? KEIN_WERT_FARBE : klassenFarbe(klasseVon(e.klassen, w), e.klassen.anzahl);
    return { d: (e.rahmen.pfade[i] ?? []).join(''), fuell, kein: w === null || !e.klassen, titel: `${name}: ${w === null ? keinWertText() : zahlText(w)}` };
  });
  const legende: KarteModell['legende'] = [];
  if (e.klassen) for (let i = 0; i < e.klassen.anzahl; i++) legende.push({ farbe: klassenFarbe(i, e.klassen.anzahl), text: `${zahlText(e.klassen.grenzen[i]!)} - ${zahlText(e.klassen.grenzen[i + 1]!)}` });
  legende.push({ farbe: KEIN_WERT_FARBE, text: keinWertText(), kein: true });
  const fuss: string[] = [
    L('Flächentreue Darstellung (Equal Earth).', 'Equal-area projection (Equal Earth).'),
    e.klassen ? (e.klassen.art === 'quantil' ? L(`${e.klassen.anzahl} Klassen nach Quantilen`, `${e.klassen.anzahl} classes by quantiles`) : L(`${e.klassen.anzahl} gleich breite Klassen`, `${e.klassen.anzahl} classes of equal width`)) : ''
  ].filter(Boolean);
  const gisco = e.quelle.art === 'gisco';
  if (e.quelle.art === 'welt' || e.quelle.art === 'land' || e.quelle.art === 'at') { if (e.grenzenText) fuss.push(e.grenzenText); }
  else fuss.push(gisco ? L(`Grenzen: Eurostat (GISCO), NUTS-Ebene ${e.quelle.ebene ?? ''}, Stand 2024.`, `Boundaries: Eurostat (GISCO), NUTS level ${e.quelle.ebene ?? ''}, 2024.`) : L(`Grenzen: eigene Datei ${e.quelle.name}. Quelle und Nutzungsrechte der Grenzen nennt, wer die Karte weitergibt.`, `Boundaries: own file ${e.quelle.name}. Whoever shares the map names the source and rights of the boundaries.`));
  return {
    breite: e.rahmen.breite, hoehe: e.rahmen.hoehe, gebiete, legende, fuss, vermerk: gisco ? karteVermerk() : null, titel,
    beschreibung: L(`${titel}. ${e.zuordnung.zugeordnet} von ${e.gebiete.length} Gebieten haben einen Wert. Die Tabelle neben der Karte enthält alle Werte.`, `${titel}. ${e.zuordnung.zugeordnet} of ${e.gebiete.length} areas have a value. The table next to the map contains all values.`)
  };
}

/** Eine Zeile der Tabelle neben der Karte: gleiche Werte wie die Karte. */
export interface TabellenZeile { name: string; code: string; wert: number | null; klasse: string; status: Zuordnung['status'][number] }
export function karteTabelle(gebiete: readonly Gebiet[], z: Zuordnung, klassen: Klassen | null, beschriftung: string, eigenschaft: string): TabellenZeile[] {
  return gebiete.map((g, i) => {
    const w = z.werte[i] ?? null;
    const k = w === null || !klassen ? null : klasseVon(klassen, w);
    return { name: g.eig.get(beschriftung) ?? '', code: g.eig.get(eigenschaft) ?? '', wert: w, klasse: k === null || !klassen ? keinWertText() : `${k + 1} (${zahlText(klassen.grenzen[k]!)} - ${zahlText(klassen.grenzen[k + 1]!)})`, status: z.status[i] ?? 'ohne-daten' };
  });
}
/** Die Tabelle als CSV, mit Strichpunkt. „Kein Wert“ ist ein leeres Feld, nie 0. Zellen, die als Formel gelesen würden, bekommen ein Apostroph. */
export function karteCsv(zeilen: readonly TabellenZeile[], vermerk: string | null): string {
  const z = (t: string | number | null) => { let s = t === null ? '' : String(t); if (/^[=+\-@\t\r]/.test(s) && !/^-?\d+([.,]\d+)?$/.test(s)) s = "'" + s; return /[";\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  const kopf = [L('Gebiet', 'Area'), L('Code', 'Code'), L('Wert', 'Value'), L('Klasse', 'Class')].map(z).join(';');
  const rumpf = zeilen.map(r => [z(r.name), z(r.code), z(r.wert === null ? null : String(r.wert).replace('.', ',')), z(r.klasse)].join(';'));
  return [kopf, ...rumpf, ...(vermerk ? ['', z(vermerk)] : [])].join('\n') + '\n';
}

/* ------------------------------------------------------------------------------------------------------------------------------- Sätze */
export function geoFehlerSatz(f: GeoFehler | GiscoFehler | KartenFehler | 'land'): string {
  switch (f) {
    case 'unlesbar': return L('Die Datei ist kein lesbares JSON.', 'The file is not readable JSON.');
    case 'form': return L('Die Datei hat nicht die Form von GeoJSON (Feature oder FeatureCollection mit Polygon oder MultiPolygon). Es wurde nichts übernommen.', 'The file does not have the form of GeoJSON (Feature or FeatureCollection with Polygon or MultiPolygon). Nothing was taken over.');
    case 'typ': return L('Die Datei enthält keine Flächen (Polygon oder MultiPolygon). Punkte und Linien zeichnet Statable nicht.', 'The file contains no areas (Polygon or MultiPolygon). Statable does not draw points or lines.');
    case 'zu-gross': return L('Die Datei ist zu groß (höchstens 20 MB und 3 Millionen Punkte).', 'The file is too large (at most 20 MB and 3 million points).');
    case 'zu-viele': return L('Die Datei enthält mehr als 20.000 Gebiete.', 'The file contains more than 20,000 areas.');
    case 'koordinaten': return L('Die Koordinaten sind nicht gültig. Erwartet werden endliche Zahlen für Länge (-180 bis 180) und Breite (-90 bis 90), also Längen- und Breitengrade (WGS 84).', 'The coordinates are not valid. Finite numbers for longitude (-180 to 180) and latitude (-90 to 90) are expected, that is degrees (WGS 84).');
    case 'leer': return L('Die Datei enthält kein Gebiet.', 'The file contains no area.');
    case 'netz': return L('Die Verbindung zu Eurostat ist nicht zustande gekommen. Möglich sind keine Internetverbindung oder eine Sperre im Netz.', 'The connection to Eurostat could not be made. Possible causes are no internet connection or a block in the network.');
    case 'zeitlimit': return L('Eurostat hat nicht innerhalb von 60 Sekunden geantwortet. Der Abruf wurde beendet.', 'Eurostat did not answer within 60 seconds. The request was stopped.');
    case 'abgebrochen': return L('Der Abruf wurde abgebrochen.', 'The request was cancelled.');
    case 'umleitung': return L('Die Antwort sollte auf eine andere Adresse weiterleiten. Statable folgt dem nicht.', 'The answer was meant to redirect to another address. Statable does not follow it.');
    case 'nicht-gefunden': return L('Eurostat kennt diese Datei nicht (mehr).', 'Eurostat does not know this file (any more).');
    case 'dienst': return L('Eurostat ist gerade nicht erreichbar oder überlastet. Später noch einmal versuchen.', 'Eurostat is not available or is overloaded at the moment. Try again later.');
    case 'adresse': return L('Diese Adresse ist nicht die feste Adresse von Eurostat. Es wurde nichts abgerufen.', 'This address is not the fixed Eurostat address. Nothing was requested.');
    case 'karten-laden': return L('Die Grenzen konnten nicht geladen werden. Bitte die Verbindung prüfen und noch einmal versuchen.', 'The boundaries could not be loaded. Check the connection and try again.');
    case 'karten-pruefsumme': return L('Die geladene Datei ist unvollständig oder verändert und wird nicht verwendet.', 'The loaded file is incomplete or altered and is not used.');
    case 'karten-form': return L('Die Grenzen haben nicht die erwartete Form. Es wurde nichts übernommen.', 'The boundaries do not have the expected form. Nothing was taken over.');
    case 'land': return L('Für dieses Länderkürzel gibt es in der Datei kein Gebiet. Erwartet werden zwei Großbuchstaben, zum Beispiel AT.', 'The file has no area for this country code. Two capital letters are expected, for example AT.');
  }
}
export const geoGeladenSatz = (n: number, ohneFlaeche: number): string => {
  const gelesen = Lp(n, `Gelesen: ${n} Gebiet.`, `Gelesen: ${n} Gebiete.`, `Read: ${n} area.`, `Read: ${n} areas.`);
  if (!ohneFlaeche) return gelesen;
  return `${gelesen} ${Lp(ohneFlaeche, `${ohneFlaeche} Objekt ohne Fläche wird nicht gezeichnet.`, `${ohneFlaeche} Objekte ohne Fläche werden nicht gezeichnet.`, `${ohneFlaeche} object without an area is not drawn.`, `${ohneFlaeche} objects without an area are not drawn.`)}`;
};

/** Die Zeile „Grenzen: …“ im Bild für Welt und Land: Quelle, bei geoBoundaries mit Herkunft und Lizenz, immer mit dem Stand. */
export function grenzenQuelleText(e: KartenEintrag): string {
  if (e.quelle === 'Natural Earth') return L(`Grenzen: Natural Earth (gemeinfrei), Version ${e.stand}.`, `Boundaries: Natural Earth (public domain), version ${e.stand}.`);
  const herkunft = e.quelleDetail ? `${e.quelleDetail}, ` : '';
  return L(`Grenzen: geoBoundaries (${herkunft}${e.lizenz}), Stand ${e.stand}.`, `Boundaries: geoBoundaries (${herkunft}${e.lizenz}), as of ${e.stand}.`);
}
/** Zwei Hinweise, die bei jeder Karte sichtbar sind (neben den vier Warnungen). */
export const karteGrenzenHinweise = (): string[] => [
  L('Grenzen und Namen dieser Karte sind keine politische Aussage. Umstrittene Gebiete sind so gezeichnet, wie die Quelle sie führt.', 'The boundaries and names on this map are not a political statement. Disputed areas are drawn as the source has them.'),
  L('Gliederungen ändern sich. Passen die Daten zu einer anderen Gliederung als die Karte, ist nicht zugeordnet, was nicht passt.', 'Divisions change. If the data fit a different division than the map, whatever does not fit is not assigned.')
];
export const landNamenSatz = (): string => L('Die Namen der Gebiete stehen so da, wie die Quelle sie führt.', 'The names of the areas are shown as the source gives them.');

/** Die vier Warnungen, die immer unter der Karte stehen. */
export const karteWarnungen = (): string[] => [
  L('Eine Karte zeigt Flächen, nicht Menschen: Große Gebiete wirken wichtiger, als sie sind.', 'A map shows areas, not people: large areas look more important than they are.'),
  L('Absolute Zahlen gehören nicht auf eine Flächenkarte. Raten oder Anteile verwenden. Ob die gewählte Spalte eine Summe ist, erkennt Statable nicht.', 'Absolute numbers do not belong on an area map. Use rates or shares. Statable cannot tell whether the chosen column is a total.'),
  L('Die Wahl der Klassen verändert das Bild. Eine andere Einteilung zeigt dieselben Zahlen anders.', 'The choice of classes changes the picture. A different division shows the same numbers differently.'),
  L('Kleine Gebiete mit wenigen Fällen: Der Wert schwankt stark, auch wenn die Karte ihn ruhig zeigt.', 'Small areas with few cases: the value fluctuates strongly, even if the map shows it calmly.')
];

/** Die Sätze zur Zuordnung: nicht zugeordnete Codes und Gebiete in beide Richtungen, ohne Wert, mehrfach. */
export function zuordnungSaetze(z: Zuordnung, gebiete: number, welt = false): string[] {
  const s: string[] = [];
  s.push(Lp(z.zugeordnet, `${z.zugeordnet} von ${gebiete} Gebieten haben einen Wert.`, `${z.zugeordnet} von ${gebiete} Gebieten haben einen Wert.`, `${z.zugeordnet} of ${gebiete} areas have a value.`, `${z.zugeordnet} of ${gebiete} areas have a value.`));
  if (z.codesOhneGebiet) s.push(Lp(z.codesOhneGebiet, `${z.codesOhneGebiet} Code aus den Daten passt zu keinem Gebiet der Karte (zum Beispiel ${z.codesBeispiele.join(', ')}). Sein Wert steht nicht auf der Karte.`, `${z.codesOhneGebiet} Codes aus den Daten passen zu keinem Gebiet der Karte (zum Beispiel ${z.codesBeispiele.join(', ')}). Ihre Werte stehen nicht auf der Karte.`, `${z.codesOhneGebiet} code from the data matches no area of the map (for example ${z.codesBeispiele.join(', ')}). Its value is not on the map.`, `${z.codesOhneGebiet} codes from the data match no area of the map (for example ${z.codesBeispiele.join(', ')}). Their values are not on the map.`));
  if (z.codesMehrdeutig) s.push(Lp(z.codesMehrdeutig, `${z.codesMehrdeutig} Name aus den Daten passt zu mehr als einem Staat (zum Beispiel ${(z.mehrdeutigBeispiele ?? []).join(', ')}). Er wird nicht zugeordnet.`, `${z.codesMehrdeutig} Namen aus den Daten passen zu mehr als einem Staat (zum Beispiel ${(z.mehrdeutigBeispiele ?? []).join(', ')}). Sie werden nicht zugeordnet.`, `${z.codesMehrdeutig} name from the data matches more than one country (for example ${(z.mehrdeutigBeispiele ?? []).join(', ')}). It is not assigned.`, `${z.codesMehrdeutig} names from the data match more than one country (for example ${(z.mehrdeutigBeispiele ?? []).join(', ')}). They are not assigned.`));
  if (z.gebieteOhneDaten && !welt) s.push(Lp(z.gebieteOhneDaten, `${z.gebieteOhneDaten} Gebiet der Karte hat keinen Code in den Daten (zum Beispiel ${z.gebieteBeispiele.join(', ')}). Es steht als „kein Wert“ da.`, `${z.gebieteOhneDaten} Gebiete der Karte haben keinen Code in den Daten (zum Beispiel ${z.gebieteBeispiele.join(', ')}). Sie stehen als „kein Wert“ da.`, `${z.gebieteOhneDaten} area of the map has no code in the data (for example ${z.gebieteBeispiele.join(', ')}). It is shown as "no value".`, `${z.gebieteOhneDaten} areas of the map have no code in the data (for example ${z.gebieteBeispiele.join(', ')}). They are shown as "no value".`));
  if (z.gebieteKeinWert) s.push(Lp(z.gebieteKeinWert, `${z.gebieteKeinWert} Gebiet hat einen Code, aber keinen Wert. Es steht als „kein Wert“ da, nicht als 0.`, `${z.gebieteKeinWert} Gebiete haben einen Code, aber keinen Wert. Sie stehen als „kein Wert“ da, nicht als 0.`, `${z.gebieteKeinWert} area has a code but no value. It is shown as "no value", not as 0.`, `${z.gebieteKeinWert} areas have a code but no value. They are shown as "no value", not as 0.`));
  if (z.codesMehrfach) s.push(Lp(z.codesMehrfach, `${z.codesMehrfach} Code kommt in den Daten mehrfach vor. Er ist nicht eindeutig und bekommt keinen Wert.`, `${z.codesMehrfach} Codes kommen in den Daten mehrfach vor. Sie sind nicht eindeutig und bekommen keinen Wert.`, `${z.codesMehrfach} code occurs more than once in the data. It is not unique and gets no value.`, `${z.codesMehrfach} codes occur more than once in the data. They are not unique and get no value.`));
  if (z.zeilenOhneCode) s.push(Lp(z.zeilenOhneCode, `${z.zeilenOhneCode} Zeile hat keinen Code und steht nicht auf der Karte.`, `${z.zeilenOhneCode} Zeilen haben keinen Code und stehen nicht auf der Karte.`, `${z.zeilenOhneCode} row has no code and is not on the map.`, `${z.zeilenOhneCode} rows have no code and are not on the map.`));
  return s;
}
export const klassenSatz = (k: Klassen): string => (k.anzahl < k.gewuenscht
  ? Lp(k.anzahl, `Gewünscht waren ${k.gewuenscht} Klassen; weil viele Werte gleich sind, entsteht nur ${k.anzahl} Klasse.`, `Gewünscht waren ${k.gewuenscht} Klassen; weil viele Werte gleich sind, entstehen nur ${k.anzahl} Klassen.`, `${k.gewuenscht} classes were wanted; because many values are equal, only ${k.anzahl} class results.`, `${k.gewuenscht} classes were wanted; because many values are equal, only ${k.anzahl} classes result.`) : '');
export const keineWerteSatz = (): string => L('Kein Gebiet hat einen Wert. Die Karte zeigt nur die Grenzen.', 'No area has a value. The map shows only the boundaries.');

/** Bricht einen Satz für das Bild an Wortgrenzen um (SVG-Text bricht nicht selbst um). Ein Wort, das länger als `max` ist, bleibt ganz. */
export function umbrechen(text: string, max = 78): string[] {
  const zeilen: string[] = [];
  let z = '';
  for (const w of text.split(/\s+/).filter(Boolean)) {
    if (z && (z + ' ' + w).length > max) { zeilen.push(z); z = w; } else z = z ? z + ' ' + w : w;
  }
  if (z) zeilen.push(z);
  return zeilen;
}
