/**
 * Eurostat-Daten öffnen (Fachblatt SAISON-EUROSTAT, Abschnitt 2). Nur auf Klick, nur diese eine Adresse, keine Daten der Nutzenden gehen mit.
 * Hier steht alles ohne Oberfläche: die Adresse (Muster und `encodeURIComponent`), der Abruf (Grenzen, Zeitüberschreitung, keine Cookies, keine Weiterleitung),
 * das Lesen von JSON-stat 2.0 in die lange Form und die Sätze.
 *
 * Die Antwort ist fremde Eingabe: Größen und Typen werden geprüft, das Produkt von `size` gegen die Grenze, Schlüssel wie `__proto__` sind nur Daten
 * (kein Zugriff über `obj[schluessel]` auf geerbte Werte). Texte aus der Antwort sind Daten, nie Code. Ein fehlender Wert bleibt leer (null), ein vorhandener Wert 0 bleibt 0.
 */
import { L, Lp, d } from './sitzung.svelte';
import { liesZeitpunkt } from './einlesen';
import {
  EUROSTAT_BASIS, EUROSTAT_ORIGIN, EUROSTAT_MAX_ADRESSE, EUROSTAT_NAME as NAME, EUROSTAT_STEUER as STEUER, eurostatAdresseOk, eurostatIstObjekt as istObjekt, eurostatEigen as eigen, eurostatSauber as sauber, type EurostatQuelle
} from './eurostatquelle';
export { EUROSTAT_BASIS, EUROSTAT_ORIGIN, EUROSTAT_MAX_ADRESSE, eurostatAdresseOk, eurostatQuelleLesen, type EurostatQuelle } from './eurostatquelle';

/** Grenzen: Antwort bis 20 MB, höchstens 1 Mio. Zeilen, Zeitüberschreitung 60 s. */
export const EUROSTAT_MAX_BYTES = 20 * 1024 * 1024, EUROSTAT_MAX_ZEILEN = 1_000_000, EUROSTAT_ZEITLIMIT_MS = 60_000;
/** Höchstzahl der Filter und der Werte je Filter (damit keine absurd lange Abfrage entsteht); die Länge der Adresse ist in eurostatquelle.ts begrenzt. */
export const EUROSTAT_MAX_FILTER = 20, EUROSTAT_MAX_WERTE = 200;

/** Zeitangabe wie bei Eurostat: 2020, 2020-01, 2020-Q1, 2020-S1, 2020-W05, 2020-01-31. */
const ZEIT = /^\d{4}(-(\d{2}|Q[1-4]|S[12]|W\d{2}|\d{2}-\d{2}))?$/;


export type EurostatEingabeFehler = 'code' | 'dimension' | 'wert' | 'zeit' | 'zahl' | 'doppelt' | 'zeile';
export type EurostatNetzFehler = 'netz' | 'zeitlimit' | 'abgebrochen' | 'umleitung' | 'nicht-gefunden' | 'abfrage' | 'dienst' | 'zu-gross' | 'adresse';
export type EurostatLeseFehler = 'kein-json' | 'form' | 'zu-viele-zeilen' | 'leer';
export type EurostatFehler = EurostatEingabeFehler | EurostatNetzFehler | EurostatLeseFehler;

export interface EurostatFilter { dimension: string; werte: string[] }
export interface EurostatAbfrage { code: string; filter: EurostatFilter[]; seit?: string; bis?: string; sprache?: string }

/** Die Sprache der Antwort (`lang`): EN, DE oder FR je nach Sprache der App, sonst EN. */
export const eurostatSprache = (sprache: string): 'DE' | 'EN' | 'FR' => (sprache === 'de' ? 'DE' : sprache === 'fr' ? 'FR' : 'EN');

/** Die Adresse der Abfrage. Der Code und die Namen der Filter müssen dem Muster entsprechen, jeder Wert läuft durch `encodeURIComponent`. */
export function eurostatAdresse(a: EurostatAbfrage): { ok: true; adresse: string } | { ok: false; fehler: EurostatEingabeFehler } {
  if (typeof a.code !== 'string' || !NAME.test(a.code)) return { ok: false, fehler: 'code' };
  if (a.filter.length > EUROSTAT_MAX_FILTER) return { ok: false, fehler: 'zahl' };
  const teile = ['format=JSON', `lang=${eurostatSprache(a.sprache ?? 'en')}`];
  const gesehen = new Set<string>();
  for (const f of a.filter) {
    if (typeof f.dimension !== 'string' || !NAME.test(f.dimension)) return { ok: false, fehler: 'dimension' };
    const schluessel = f.dimension.toLowerCase();
    if (gesehen.has(schluessel) || schluessel === 'format' || schluessel === 'lang' || schluessel === 'sincetimeperiod' || schluessel === 'untiltimeperiod') return { ok: false, fehler: 'doppelt' };
    gesehen.add(schluessel);
    if (!f.werte.length || f.werte.length > EUROSTAT_MAX_WERTE) return { ok: false, fehler: 'wert' };
    for (const w of f.werte) {
      if (typeof w !== 'string' || !w.length || w.length > 60 || STEUER.test(w) || w !== w.trim()) return { ok: false, fehler: 'wert' };
      teile.push(`${encodeURIComponent(f.dimension)}=${encodeURIComponent(w)}`);
    }
  }
  for (const [schluessel, w] of [['sinceTimePeriod', a.seit], ['untilTimePeriod', a.bis]] as const) {
    if (w === undefined || w === '') continue;
    if (typeof w !== 'string' || !ZEIT.test(w)) return { ok: false, fehler: 'zeit' };
    teile.push(`${schluessel}=${encodeURIComponent(w)}`);
  }
  const adresse = `${EUROSTAT_BASIS}${encodeURIComponent(a.code)}?${teile.join('&')}`;
  if (adresse.length > EUROSTAT_MAX_ADRESSE || !eurostatAdresseOk(adresse)) return { ok: false, fehler: 'zahl' };
  return { ok: true, adresse };
}

/** Filter eingeben wie bei Eurostat: je Zeile `Dimension = Wert, Wert`. Leere Zeilen zählen nicht. */
export function eurostatFilterLesen(text: string): { ok: true; filter: EurostatFilter[] } | { ok: false; fehler: EurostatEingabeFehler } {
  const filter: EurostatFilter[] = [];
  for (const roh of String(text).split(/\r?\n/)) {
    const z = roh.trim();
    if (!z) continue;
    const i = z.indexOf('=');
    if (i < 1) return { ok: false, fehler: 'zeile' };
    const dimension = z.slice(0, i).trim();
    const werte = z.slice(i + 1).split(',').map(w => w.trim()).filter(w => w.length);
    if (!werte.length) return { ok: false, fehler: 'wert' };
    filter.push({ dimension, werte });
  }
  return { ok: true, filter };
}

/* ================================================================ Abruf */
export interface AbrufOpt { fetchFn?: typeof fetch; signal?: AbortSignal; zeitlimitMs?: number }
export type AbrufErgebnis = { ok: true; bytes: Uint8Array; text: string } | { ok: false; fehler: EurostatNetzFehler };

/**
 * Ein Abruf. Gesendet wird nur diese Adresse: keine Cookies (`credentials: 'omit'`), kein Referrer, kein Inhalt, keine Weiterleitung (`redirect: 'error'`).
 * Die Antwort wird beim Lesen auf 20 MB begrenzt; nach 60 s oder auf Abbrechen wird der Abruf beendet. Wirft nie.
 */
export async function eurostatAbrufen(adresse: string, opt: AbrufOpt = {}): Promise<AbrufErgebnis> {
  if (!eurostatAdresseOk(adresse)) return { ok: false, fehler: 'adresse' };
  if (opt.signal?.aborted) return { ok: false, fehler: 'abgebrochen' };
  const f = opt.fetchFn ?? (typeof fetch === 'function' ? fetch.bind(globalThis) : null);
  if (!f) return { ok: false, fehler: 'netz' };
  const ac = new AbortController();
  let zeit = false;
  const uhr = setTimeout(() => { zeit = true; ac.abort(); }, opt.zeitlimitMs ?? EUROSTAT_ZEITLIMIT_MS);
  const vonAussen = () => ac.abort();
  if (opt.signal) { if (opt.signal.aborted) ac.abort(); else opt.signal.addEventListener('abort', vonAussen, { once: true }); }
  const ende = (fehler: EurostatNetzFehler): AbrufErgebnis => ({ ok: false, fehler: zeit ? 'zeitlimit' : opt.signal?.aborted ? 'abgebrochen' : fehler });
  try {
    const res = await f(adresse, { method: 'GET', credentials: 'omit', redirect: 'error', referrerPolicy: 'no-referrer', cache: 'no-store', headers: { Accept: 'application/json' }, signal: ac.signal });
    if (res.redirected || (res.url && !eurostatAdresseOk(res.url))) { void res.body?.cancel().catch(() => {}); return { ok: false, fehler: 'umleitung' }; }
    if (!res.ok) {
      void res.body?.cancel().catch(() => {});
      return { ok: false, fehler: res.status === 404 ? 'nicht-gefunden' : res.status >= 400 && res.status < 500 && res.status !== 429 ? 'abfrage' : 'dienst' };
    }
    const laenge = Number(res.headers.get('content-length'));
    if (Number.isFinite(laenge) && laenge > EUROSTAT_MAX_BYTES) { void res.body?.cancel().catch(() => {}); return { ok: false, fehler: 'zu-gross' }; }
    const teile: Uint8Array[] = [];
    let summe = 0;
    if (res.body) {
      const leser = res.body.getReader();
      for (;;) {
        const { done, value } = await leser.read();
        if (done) break;
        summe += value.byteLength;
        if (summe > EUROSTAT_MAX_BYTES) { void leser.cancel().catch(() => {}); return { ok: false, fehler: 'zu-gross' }; }
        teile.push(value);
      }
    } else {
      const roh = new Uint8Array(await res.arrayBuffer());
      if (roh.byteLength > EUROSTAT_MAX_BYTES) return { ok: false, fehler: 'zu-gross' };
      teile.push(roh); summe = roh.byteLength;
    }
    const bytes = new Uint8Array(summe);
    let pos = 0;
    for (const t of teile) { bytes.set(t, pos); pos += t.byteLength; }
    return { ok: true, bytes, text: new TextDecoder('utf-8').decode(bytes) };
  } catch {
    return ende('netz');
  } finally {
    clearTimeout(uhr);
    opt.signal?.removeEventListener('abort', vonAussen);
  }
}

/* ================================================================ JSON-stat 2.0 lesen */
export interface EurostatDimension { id: string; label: string; /** Codes nach Position (nicht nach der Reihenfolge im Objekt) */ codes: string[]; /** Beschriftung je Position ('' = keine) */ labels: string[] }
export interface EurostatZeile { codes: string[]; wert: number | null; status: string }
export interface EurostatDaten {
  label: string; updated: string; dimensionen: EurostatDimension[]; zeilen: EurostatZeile[];
  /** Zeilen ohne Wert und Zeilen mit vorläufigem Wert (Status mit „p“) */
  leer: number; vorlaeufig: number;
}

const POSITION = /^(0|[1-9]\d{0,6})$/;

/** Liest die Antwort (Text oder schon gelesenes JSON) in die lange Form. Wirft nie. */
export function eurostatLesen(roh: string | unknown): { ok: true; daten: EurostatDaten } | { ok: false; fehler: EurostatLeseFehler | 'abfrage' } {
  let j: unknown = roh;
  if (typeof roh === 'string') { try { j = JSON.parse(roh); } catch { return { ok: false, fehler: 'kein-json' }; } }
  if (!istObjekt(j)) return { ok: false, fehler: 'form' };
  // Bei zu großer Antwort oder einem Fehler liefert Eurostat einen Hinweis statt der Daten: der Text daraus wird nicht angezeigt, es gibt einen eigenen Satz.
  if (eigen(j, 'error') !== undefined && eigen(j, 'value') === undefined) return { ok: false, fehler: 'abfrage' };
  if (eigen(j, 'version') !== '2.0' || eigen(j, 'class') !== 'dataset') return { ok: false, fehler: 'form' };
  const id = eigen(j, 'id'), size = eigen(j, 'size'), dim = eigen(j, 'dimension');
  if (!Array.isArray(id) || !Array.isArray(size) || !istObjekt(dim) || id.length < 1 || id.length > 30 || id.length !== size.length) return { ok: false, fehler: 'form' };
  const ids: string[] = [];
  for (const x of id) { if (typeof x !== 'string' || !NAME.test(x) || ids.includes(x)) return { ok: false, fehler: 'form' }; ids.push(x); }
  const groessen: number[] = [];
  let produkt = 1;
  for (const x of size) {
    if (typeof x !== 'number' || !Number.isInteger(x) || x < 1) return { ok: false, fehler: 'form' };
    produkt *= x;
    if (produkt > EUROSTAT_MAX_ZEILEN) return { ok: false, fehler: 'zu-viele-zeilen' };
    groessen.push(x);
  }
  const dimensionen: EurostatDimension[] = [];
  for (let d = 0; d < ids.length; d++) {
    const dd = eigen(dim, ids[d]!);
    if (!istObjekt(dd)) return { ok: false, fehler: 'form' };
    const kat = eigen(dd, 'category');
    if (!istObjekt(kat)) return { ok: false, fehler: 'form' };
    const n = groessen[d]!, codes: (string | undefined)[] = new Array(n).fill(undefined);
    const index = eigen(kat, 'index'), labelRoh = eigen(kat, 'label');
    const label = istObjekt(labelRoh) ? labelRoh : null;
    if (Array.isArray(index)) {
      if (index.length !== n) return { ok: false, fehler: 'form' };
      index.forEach((c, i) => { if (typeof c === 'string') codes[i] = c; });
    } else if (istObjekt(index)) {
      // Die Position steht im Wert, nicht in der Reihenfolge der Schlüssel im Objekt.
      const eintraege = Object.entries(index);
      if (eintraege.length !== n) return { ok: false, fehler: 'form' };
      for (const [c, p] of eintraege) {
        if (typeof p !== 'number' || !Number.isInteger(p) || p < 0 || p >= n || codes[p] !== undefined) return { ok: false, fehler: 'form' };
        codes[p] = c;
      }
    } else if (index === undefined && n === 1 && label && Object.keys(label).length === 1) {
      codes[0] = Object.keys(label)[0];   // JSON-stat: bei genau einer Kategorie darf der Index fehlen
    } else return { ok: false, fehler: 'form' };
    const fertig: string[] = [];
    for (const c of codes) { if (typeof c !== 'string' || !c.length || c.length > 100 || STEUER.test(c)) return { ok: false, fehler: 'form' }; fertig.push(c); }
    if (new Set(fertig).size !== n) return { ok: false, fehler: 'form' };
    dimensionen.push({ id: ids[d]!, label: sauber(eigen(dd, 'label'), 200), codes: fertig, labels: fertig.map(c => (label ? sauber(eigen(label, c), 300) : '')) });
  }
  const werte = new Map<number, number | null>(), status = new Map<number, string>();
  const rohWert = eigen(j, 'value'), rohStatus = eigen(j, 'status');
  const eintrag = (karte: Map<number, number | null> | Map<number, string>, p: number, v: unknown, art: 'wert' | 'status'): boolean => {
    if (p < 0 || p >= produkt) return false;
    if (art === 'wert') {
      if (v === null) return true;               // fehlender Wert bleibt leer
      if (typeof v !== 'number' || !Number.isFinite(v)) return false;
      (karte as Map<number, number | null>).set(p, v);
    } else {
      if (v === null || v === undefined) return true;
      if (typeof v !== 'string' || v.length > 20 || STEUER.test(v)) return false;
      (karte as Map<number, string>).set(p, v);
    }
    return true;
  };
  if (Array.isArray(rohWert)) { if (rohWert.length > produkt) return { ok: false, fehler: 'form' }; for (let p = 0; p < rohWert.length; p++) if (!eintrag(werte, p, rohWert[p], 'wert')) return { ok: false, fehler: 'form' }; }
  else if (istObjekt(rohWert)) { for (const [k, v] of Object.entries(rohWert)) if (!POSITION.test(k) || !eintrag(werte, Number(k), v, 'wert')) return { ok: false, fehler: 'form' }; }
  else if (rohWert !== undefined) return { ok: false, fehler: 'form' };
  if (typeof rohStatus === 'string') { if (rohStatus.length > 20 || STEUER.test(rohStatus)) return { ok: false, fehler: 'form' }; if (rohStatus) for (let p = 0; p < produkt; p++) status.set(p, rohStatus); }
  else if (Array.isArray(rohStatus)) { if (rohStatus.length > produkt) return { ok: false, fehler: 'form' }; for (let p = 0; p < rohStatus.length; p++) if (!eintrag(status, p, rohStatus[p], 'status')) return { ok: false, fehler: 'form' }; }
  else if (istObjekt(rohStatus)) { for (const [k, v] of Object.entries(rohStatus)) if (!POSITION.test(k) || !eintrag(status, Number(k), v, 'status')) return { ok: false, fehler: 'form' }; }
  else if (rohStatus !== undefined) return { ok: false, fehler: 'form' };
  if (produkt < 1) return { ok: false, fehler: 'leer' };
  // Lange Form in laufender Position: die letzte Dimension läuft am schnellsten.
  const zeilen: EurostatZeile[] = [];
  let leer = 0, vorlaeufig = 0;
  for (let p = 0; p < produkt; p++) {
    const codes = new Array<string>(ids.length);
    let rest = p;
    for (let d = ids.length - 1; d >= 0; d--) { const g = groessen[d]!; codes[d] = dimensionen[d]!.codes[rest % g]!; rest = Math.floor(rest / g); }
    const wert = werte.has(p) ? werte.get(p)! : null, st = status.get(p) ?? '';
    if (wert === null) leer++;
    if (st.includes('p')) vorlaeufig++;
    zeilen.push({ codes, wert, status: st });
  }
  return { ok: true, daten: { label: sauber(eigen(j, 'label'), 300), updated: sauber(eigen(j, 'updated'), 40), dimensionen, zeilen, leer, vorlaeufig } };
}

/** Die Tabelle zum Öffnen: eine Spalte je Dimension mit dem Code, auf Wunsch dahinter die Beschriftung, dann `wert` und `status`. Ein fehlender Wert ist null. */
export interface EurostatTabelle { kopf: string[]; bezeichnungen: string[]; art: ('text' | 'zahl' | 'datum')[]; zeilen: (string | number | null)[][] }
export function eurostatTabelle(d: EurostatDaten, mitBeschriftung: boolean): EurostatTabelle {
  const kopf: string[] = [], bezeichnungen: string[] = [], art: ('text' | 'zahl' | 'datum')[] = [];
  const nachPosition = d.dimensionen.map(x => new Map(x.codes.map((c, i) => [c, x.labels[i] ?? ''])));
  d.dimensionen.forEach(x => {
    kopf.push(x.id); bezeichnungen.push(x.label); art.push('text');
    if (mitBeschriftung) { kopf.push(`${x.id}_text`); bezeichnungen.push(x.label ? `${x.label} (${L('Beschriftung', 'label')})` : L('Beschriftung', 'label')); art.push('text'); }
  });
  kopf.push('wert', 'status'); bezeichnungen.push(L('Wert', 'Value'), L('Status', 'Status')); art.push('zahl', 'text');
  const zeilen = d.zeilen.map(z => {
    const r: (string | number | null)[] = [];
    z.codes.forEach((c, i) => { r.push(c); if (mitBeschriftung) r.push(nachPosition[i]!.get(c) ?? ''); });
    r.push(z.wert, z.status);
    return r;
  });
  return { kopf, bezeichnungen, art, zeilen };
}

/* ================================================================ Zeitspalte als Datum */
/** Die Dimension mit der Zeit heißt bei Eurostat `time` (JSON-stat) oder `TIME_PERIOD`. */
const ZEIT_NAME = /^(time|time_period)$/i;
export type ZeitGrund = 'quartal' | 'halbjahr' | 'woche' | 'sonst';
export interface ZeitUmwandlung {
  /** die Tabelle zum Öffnen: bei Erfolg mit Datum in der Zeitspalte, sonst unverändert */
  tab: EurostatTabelle;
  /** Name der Zeitspalte; `null`, wenn es keine gibt */
  spalte: string | null;
  /** `datum`: umgewandelt; `text`: bleibt Text (mit Grund); `null`: keine Zeitspalte */
  ergebnis: 'datum' | 'text' | null;
  grund?: ZeitGrund;
  /** Ein paar Zeitangaben, die nicht als Datum gelesen werden konnten */
  beispiele: string[];
  /** Jahre standen als Jahreszahl da (ohne Monat): sie gelten als 1. Januar */
  jahre: boolean;
}
const zweistellig = (n: number) => String(n).padStart(2, '0');
/** Eine Zeitangabe von Eurostat als Datum `TT.MM.JJJJ` (so schreibt die Engine Daten). Monate (`2024-01`) und Tage (`2024-01-31`) lesen wie beim Einlesen einer CSV-Datei (`liesZeitpunkt`, Monat = 1. des Monats); ein Jahr (`2024`) ist der 1. Januar. Alles andere (Quartal, Halbjahr, Woche) ist kein Datum, das dieser Weg sauber liest. */
export function eurostatZeitDatum(code: string): { datum: string; jahr: boolean } | null {
  const t = code.trim();
  if (/^\d{4}$/.test(t)) { const y = Number(t); return y >= 1000 && y <= 3000 ? { datum: `01.01.${t}`, jahr: true } : null; }
  if (!/^\d{4}-\d{2}(-\d{2})?$/.test(t)) return null;
  const z = liesZeitpunkt(t);
  return z && z.sek === null ? { datum: `${zweistellig(z.d)}.${zweistellig(z.m)}.${String(z.y).padStart(4, '0')}`, jahr: false } : null;
}
/**
 * Macht aus der Zeitspalte ein Datum, wenn alle Zeitangaben so lesbar sind (Monate, Tage, Jahre). Sonst bleibt sie Text, mit Grund und Beispielen.
 * Die Zeitreihen-Auswertung bietet nur Datumsspalten als Zeitpunkt an. Quartale (`2024-Q1`), Halbjahre und Wochen liest der vorhandene Datumsweg nicht; sie werden nicht geraten.
 */
export function eurostatZeitAlsDatum(tab: EurostatTabelle): ZeitUmwandlung {
  const i = tab.kopf.findIndex(k => ZEIT_NAME.test(k));
  if (i < 0 || tab.art[i] !== 'text') return { tab, spalte: null, ergebnis: null, beispiele: [], jahre: false };
  const verschieden = new Map<string, { datum: string; jahr: boolean } | null>();
  for (const z of tab.zeilen) { const c = z[i]; if (typeof c === 'string' && !verschieden.has(c)) verschieden.set(c, eurostatZeitDatum(c)); }
  if (!verschieden.size) return { tab, spalte: tab.kopf[i]!, ergebnis: 'text', grund: 'sonst', beispiele: [], jahre: false };
  const schlecht = [...verschieden.entries()].filter(([, v]) => v === null).map(([c]) => c);
  const spalte = tab.kopf[i]!;
  if (schlecht.length) {
    const g: ZeitGrund = schlecht.some(c => /^\d{4}-Q[1-4]$/.test(c)) ? 'quartal' : schlecht.some(c => /^\d{4}-S[12]$/.test(c)) ? 'halbjahr' : schlecht.some(c => /^\d{4}-W\d{2}$/.test(c)) ? 'woche' : 'sonst';
    return { tab, spalte, ergebnis: 'text', grund: g, beispiele: schlecht.slice(0, 3).map(c => (c.length > 20 ? c.slice(0, 20) + '…' : c)), jahre: false };
  }
  const art = tab.art.slice();
  art[i] = 'datum';
  const zeilen = tab.zeilen.map(z => { const c = z[i]; const v = typeof c === 'string' ? verschieden.get(c) : null; return v ? z.map((x, k) => (k === i ? v.datum : x)) : z; });
  return { tab: { ...tab, art, zeilen }, spalte, ergebnis: 'datum', beispiele: [], jahre: [...verschieden.values()].some(v => v?.jahr) };
}
/** Der Satz nach dem Öffnen zur Zeitspalte; leer, wenn es keine gibt. */
export function eurostatZeitSatz(u: ZeitUmwandlung): string {
  if (!u.spalte || !u.ergebnis) return '';
  if (u.ergebnis === 'datum') {
    return u.jahre
      ? L(`Die Zeitspalte ${u.spalte} ist ein Datum. Ein Jahr steht als 1. Januar, ein Monat als der 1. des Monats; der Wert gilt für den ganzen Zeitraum.`, `The time column ${u.spalte} is a date. A year is shown as 1 January, a month as the 1st of the month; the value applies to the whole period.`)
      : L(`Die Zeitspalte ${u.spalte} ist ein Datum. Ein Monat steht als der 1. des Monats; der Wert gilt für den ganzen Monat.`, `The time column ${u.spalte} is a date. A month is shown as the 1st of the month; the value applies to the whole month.`);
  }
  const bsp = u.beispiele.length ? ` (${u.beispiele.join(', ')})` : '';
  const warum = u.grund === 'quartal' ? L('Quartale wie 2024-Q1 liest Statable nicht als Datum', 'Statable does not read quarters such as 2024-Q1 as a date')
    : u.grund === 'halbjahr' ? L('Halbjahre wie 2024-S1 liest Statable nicht als Datum', 'Statable does not read half-years such as 2024-S1 as a date')
      : u.grund === 'woche' ? L('Wochen wie 2024-W05 liest Statable nicht als Datum', 'Statable does not read weeks such as 2024-W05 as a date')
        : L('Statable liest diese Zeitangaben nicht als Datum', 'Statable does not read these time periods as a date');
  return d(`Die Zeitspalte ${u.spalte} bleibt Text${bsp}: ${warum}. Die Zeitreihen-Auswertung braucht ein Datum. Wähle in Eurostat monatliche oder jährliche Daten, oder bilde mit „Datum und Zeit“ eine Datumsspalte.`,
    `Die Zeitspalte ${u.spalte} bleibt Text${bsp}: ${warum}. Die Zeitreihen-Auswertung braucht ein Datum. Wählen Sie bei Eurostat monatliche oder jährliche Daten, oder bilden Sie mit „Datum und Zeit“ eine Datumsspalte.`,
    `The time column ${u.spalte} stays text${bsp}: ${warum}. The time series analysis needs a date. Choose monthly or yearly data at Eurostat, or build a date column with "Date and time".`);
}

/* ================================================================ Quelle für Daten, Protokoll und Bericht */
export const eurostatQuelle = (abfrage: EurostatAbfrage, adresse: string, daten: EurostatDaten, jetzt = new Date()): EurostatQuelle =>
  ({ datensatz: abfrage.code, abruf: jetzt.toISOString().slice(0, 10), aktualisiert: daten.updated, adresse });
/* ================================================================ Sätze */
export function eurostatFehlerSatz(f: EurostatFehler): string {
  switch (f) {
    case 'code': return L('Der Code des Datensatzes darf nur Buchstaben, Ziffern und Unterstriche enthalten (höchstens 40 Zeichen).', 'The dataset code may contain only letters, digits and underscores (at most 40 characters).');
    case 'dimension': return L('Der Name eines Filters darf nur Buchstaben, Ziffern und Unterstriche enthalten (höchstens 40 Zeichen).', 'The name of a filter may contain only letters, digits and underscores (at most 40 characters).');
    case 'wert': return L('Ein Filter braucht mindestens einen Wert; ein Wert darf nicht leer oder länger als 60 Zeichen sein und kein Steuerzeichen enthalten.', 'A filter needs at least one value; a value must not be empty or longer than 60 characters and must not contain a control character.');
    case 'zeit': return L('Die Zeitangabe passt nicht. Erlaubt sind zum Beispiel 2020, 2020-01 oder 2020-Q1.', 'The time period does not fit. Allowed are, for example, 2020, 2020-01 or 2020-Q1.');
    case 'zahl': return L('Die Abfrage ist zu lang: Es sind höchstens 20 Filter mit je höchstens 200 Werten möglich.', 'The query is too long: at most 20 filters with at most 200 values each are possible.');
    case 'doppelt': return L('Ein Filtername kommt doppelt vor oder ist für den Zeitraum und die Sprache reserviert.', 'A filter name appears twice or is reserved for the time range and the language.');
    case 'zeile': return L('Jede Zeile eines Filters braucht die Form Name = Wert, Wert.', 'Each filter line needs the form name = value, value.');
    case 'netz': return L('Die Verbindung zu Eurostat ist nicht zustande gekommen. Möglich sind keine Internetverbindung oder eine Sperre im Netz.', 'The connection to Eurostat could not be made. Possible causes are no internet connection or a block in the network.');
    case 'zeitlimit': return L('Eurostat hat nicht innerhalb von 60 Sekunden geantwortet. Der Abruf wurde beendet.', 'Eurostat did not answer within 60 seconds. The request was stopped.');
    case 'abgebrochen': return L('Der Abruf wurde abgebrochen.', 'The request was cancelled.');
    case 'umleitung': return L('Die Antwort sollte auf eine andere Adresse weiterleiten. Statable folgt dem nicht.', 'The answer was meant to redirect to another address. Statable does not follow it.');
    case 'nicht-gefunden': return L('Eurostat kennt diesen Datensatz nicht. Der Code ist falsch geschrieben oder der Datensatz ist nicht mehr da.', 'Eurostat does not know this dataset. The code is misspelled or the dataset is gone.');
    case 'abfrage': return L('Eurostat hat die Abfrage nicht angenommen. Mögliche Gründe: Die Antwort wäre zu groß, oder ein Filtername oder Filterwert passt nicht zum Datensatz. Mit mehr Filtern oder einem kürzeren Zeitraum noch einmal versuchen.', 'Eurostat did not accept the query. Possible reasons: the answer would be too large, or a filter name or value does not fit the dataset. Try again with more filters or a shorter time range.');
    case 'dienst': return L('Eurostat ist gerade nicht erreichbar oder überlastet. Später noch einmal versuchen.', 'Eurostat is not available or is overloaded at the moment. Try again later.');
    case 'zu-gross': return L('Die Antwort ist größer als 20 MB. Mit mehr Filtern oder einem kürzeren Zeitraum noch einmal versuchen.', 'The answer is larger than 20 MB. Try again with more filters or a shorter time range.');
    case 'adresse': return L('Diese Adresse ist nicht die feste Adresse von Eurostat. Es wurde nichts abgerufen.', 'This address is not the fixed Eurostat address. Nothing was requested.');
    case 'kein-json': return L('Die Antwort ist kein lesbares JSON.', 'The answer is not readable JSON.');
    case 'form': return L('Die Antwort hat nicht die Form, die Statable lesen kann (JSON-stat 2.0). Es wurde nichts übernommen.', 'The answer does not have the form Statable can read (JSON-stat 2.0). Nothing was taken over.');
    case 'zu-viele-zeilen': return L('Die Antwort hätte mehr als 1 Million Zeilen. Mit mehr Filtern oder einem kürzeren Zeitraum noch einmal versuchen.', 'The answer would have more than 1 million rows. Try again with more filters or a shorter time range.');
    case 'leer': return L('Die Antwort enthält keine Daten.', 'The answer contains no data.');
  }
}
/** Der Satz nach dem Laden: Zahl der Zeilen, der leeren und der vorläufigen Werte. */
export function eurostatGeladenSatz(d: EurostatDaten): string {
  const n = d.zeilen.length, l = d.leer, v = d.vorlaeufig;
  return Lp(n,
    `Geladen: ${n} Zeile, davon ${l} ohne Wert und ${v} mit vorläufigem Wert („p“). Fehlende Werte bleiben leer; Statable füllt nichts auf.`,
    `Geladen: ${n} Zeilen, davon ${l} ohne Wert und ${v} mit vorläufigem Wert („p“). Fehlende Werte bleiben leer; Statable füllt nichts auf.`,
    `Loaded: ${n} row, of which ${l} without a value and ${v} with a provisional value ("p"). Missing values stay empty; Statable fills nothing in.`,
    `Loaded: ${n} rows, of which ${l} without a value and ${v} with a provisional value ("p"). Missing values stay empty; Statable fills nothing in.`);
}
/** Der Hinweis beim Knopf, vor dem ersten Abruf: Was an wen geht. */
export const eurostatHinweisSatz = (): string =>
  L('Beim Klick auf „Von Eurostat laden“ geht eine Anfrage an die Europäische Kommission. Deren Server sieht dabei die IP-Adresse und die Abfrage. Sonst geht nichts dorthin; Daten aus Statable werden nicht gesendet.',
    'Clicking "Load from Eurostat" sends a request to the European Commission. Its server sees the IP address and the query. Nothing else goes there; no data from Statable is sent.');
export const eurostatNachtragSatz = (): string =>
  L('Eurostat kann Daten nachträglich ändern. Das Abrufdatum gehört zum Ergebnis und steht im Protokoll und im Bericht.', 'Eurostat can change data afterwards. The date of the request belongs to the result and is stated in the log and in the report.');
export const eurostatLizenzSatz = (): string =>
  L('Eurostat-Daten dürfen mit Quellenangabe weiterverwendet werden; es gelten die Regeln der Europäischen Kommission.', 'Eurostat data may be reused with a source reference; the rules of the European Commission apply.');
/** Die Quellenzeilen für Protokoll und Bericht. */
export function eurostatQuelleZeilen(q: EurostatQuelle): string[] {
  return [
    L(`Quelle: Eurostat, Datensatz ${q.datensatz}.`, `Source: Eurostat, dataset ${q.datensatz}.`),
    L(`Abgerufen am ${q.abruf}.`, `Requested on ${q.abruf}.`),
    q.aktualisiert ? L(`Stand der Daten laut Eurostat (updated): ${q.aktualisiert}.`, `Data as of (updated) according to Eurostat: ${q.aktualisiert}.`) : L('Eurostat hat keinen Stand der Daten (updated) angegeben.', 'Eurostat gave no data date (updated).'),
    L(`Abfrage: ${q.adresse}`, `Query: ${q.adresse}`)
  ];
}
