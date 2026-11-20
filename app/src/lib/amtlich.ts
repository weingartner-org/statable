/**
 * M5a „Tabelle für die Veröffentlichung“ (Fachblatt docs/fachblaetter/MIKRODATEN-2026-10-24.md, Abschnitt M5a): Zeilenmerkmal, optional Spaltenmerkmal, Inhalt Hochrechnung, Anteil oder
 * Mittelwert/Summe, Geheimhaltung (lib/geheimhaltung.ts) auf den UNGEWICHTETEN Fallzahlen, Kennzeichnung (lib/genauigkeit.ts), Zeichenerklärung, Fußnoten, Quelle.
 * Rein, ohne Oberfläche und ohne den Aufruf von R (den macht lib/amtlichrechnen.ts). Gerechnet wird in drei Stufen:
 *   1. `amtlichGrund`: aus den Daten die Stufen, die ungewichteten Fallzahlen und die gewichteten Summen (JavaScript).
 *   2. Schätzwerte mit SE: entweder `amtlichJs` (ohne R: ungewichtet, Häufigkeitsgewicht oder Umfragegewicht ohne Stichprobenplan - ohne SE) oder R (survey) über `amtlichPlan`
 *      und `amtlichLesen` - Hochrechnung (sp_umfrage_total), Anteil (sp_umfrage_anteil), Mittelwert (sp_umfrage_mittel) auf Teilpopulationen, mit Linearisierung (einzeln gezogen)
 *      oder mit Replikationsgewichten. Die Zahlen kommen aus R, es wird nichts neu gerechnet.
 *   3. `amtlichBaue`: Geheimhaltung, Kennzeichnung, Texte, Prüfprotokoll und `amtlichItem` (die veröffentlichbare Fassung als TableItem).
 * Die Fallzahlen gesperrter Zellen und das Prüfprotokoll gehören NIE in die Tabelle, den Bericht und die Exporte: `amtlichItem` kennt nur `text` und `cvText` der Zellen.
 * Sicherheit (CLAUDE.md): Namen und Texte aus der Datei kommen nie in den R-Code; die Spalten gehen mit eigenen Namen (w, a1, b1, g1, q1..., e1..., rw1...) an R.
 */
import type { TableItem, Cell } from '../engine/types';
import type { RSpalte } from '../engine/webr';
import { rIds, rQ, rWahl, rZahl } from '../engine/rsicher';
import { L, Lp } from './sitzung.svelte';
import { dezimal, zitat } from '../i18n/profil';
import { komma } from './ergebnis';
import { werteVon, type Quelle } from './gewichtbeschreibend';
import { nutztDesign, entwurfWorte, type GewichtAbdruck } from './gewichte';
import { geheimhalten, rundeTabelle, mitRaendern, GEHEIM_MIN_N, GEHEIM_DOMINANZ_K, GEHEIM_PROZENT_P, type GeheimErgebnis, type RundenErgebnis } from './geheimhaltung';
import { STANDARD_GRENZEN, kennzeichne, zeichenErklaerung, grenzenSatz, REP_TYPEN, type Grenzen, type Kennzeichen, type RepPlan, type RepTyp } from './genauigkeit';
import type { UmfrageArt, UmfrageErgebnis } from './umfrage';
import { entwurfRTeil, type EntwurfPlan } from './umfrageentwurf';

/* ------------------------------------------------------------------------------------------------------------------------------------ Wahl */
export type AmtlichInhalt = 'anzahl' | 'zeile' | 'spalte' | 'gesamt' | 'mittel' | 'summe';
export const AMTLICH_INHALTE: AmtlichInhalt[] = ['anzahl', 'zeile', 'spalte', 'gesamt', 'mittel', 'summe'];
export type GeheimWeg = 'aus' | 'sperren' | 'runden';
export interface AmtlichRep { an: boolean; anfang: string; typ: RepTyp; fay: number | null; scale: number | null }
export interface AmtlichWahl {
  /** Zeilenmerkmal (Spalte der Daten) */ zeile: string;
  /** Spaltenmerkmal; leer = keine Spalten, nur „Insgesamt“ */ spalte: string;
  inhalt: AmtlichInhalt;
  /** Zahlenspalte für Mittelwert und Summe */ wert: string;
  geheim: GeheimWeg; minN: number; dominanz: boolean; dominanzK: number; prozentRegel: boolean; prozentP: number; rundenBasis: 3 | 5 | 10;
  grenzen: Grenzen; cvZeigen: boolean;
  rep: AmtlichRep;
  quelle: string; fussnote: string;
}
export const leereAmtlichWahl = (): AmtlichWahl => ({
  zeile: '', spalte: '', inhalt: 'anzahl', wert: '', geheim: 'aus', minN: GEHEIM_MIN_N, dominanz: false, dominanzK: GEHEIM_DOMINANZ_K, prozentRegel: false, prozentP: GEHEIM_PROZENT_P, rundenBasis: 3,
  grenzen: { ...STANDARD_GRENZEN }, cvZeigen: false, rep: { an: false, anfang: '', typ: 'bootstrap', fay: null, scale: null }, quelle: '', fussnote: ''
});
const zahlOr = (x: unknown, vorgabe: number) => (typeof x === 'number' && Number.isFinite(x) ? x : vorgabe);
const zahlOderNull = (x: unknown): number | null => (typeof x === 'number' && Number.isFinite(x) ? x : null);
/** Eine Wahl aus Gespeichertem (alte oder halbe Angaben) zu einer vollständigen, gültigen Wahl. */
export function amtlichWahlAus(x?: Partial<AmtlichWahl> | null): AmtlichWahl {
  const v = leereAmtlichWahl(), a = x ?? {};
  const w: AmtlichWahl = {
    ...v, ...a,
    inhalt: AMTLICH_INHALTE.includes(a.inhalt as AmtlichInhalt) ? (a.inhalt as AmtlichInhalt) : v.inhalt,
    geheim: a.geheim === 'sperren' || a.geheim === 'runden' ? a.geheim : 'aus',
    minN: Math.max(1, Math.round(zahlOr(a.minN, v.minN))), dominanzK: zahlOr(a.dominanzK, v.dominanzK), prozentP: zahlOr(a.prozentP, v.prozentP),
    rundenBasis: a.rundenBasis === 5 || a.rundenBasis === 10 ? a.rundenBasis : 3,
    dominanz: a.dominanz === true, prozentRegel: a.prozentRegel === true, cvZeigen: a.cvZeigen === true,
    grenzen: { nMinX: Math.max(0, Math.round(zahlOr(a.grenzen?.nMinX, STANDARD_GRENZEN.nMinX))), nMinKlammer: Math.max(0, Math.round(zahlOr(a.grenzen?.nMinKlammer, STANDARD_GRENZEN.nMinKlammer))), cvKlammer: Math.max(0, zahlOr(a.grenzen?.cvKlammer, STANDARD_GRENZEN.cvKlammer)) },
    rep: { ...v.rep, ...(a.rep ?? {}), typ: REP_TYPEN.includes((a.rep?.typ ?? 'bootstrap') as RepTyp) ? (a.rep?.typ ?? 'bootstrap') : 'bootstrap', fay: zahlOderNull(a.rep?.fay), scale: zahlOderNull(a.rep?.scale), an: a.rep?.an === true, anfang: String(a.rep?.anfang ?? '') },
    quelle: String(a.quelle ?? ''), fussnote: String(a.fussnote ?? ''), zeile: String(a.zeile ?? ''), spalte: String(a.spalte ?? ''), wert: String(a.wert ?? '')
  };
  if (w.grenzen.nMinX > w.grenzen.nMinKlammer) w.grenzen.nMinKlammer = w.grenzen.nMinX;
  if (!w.spalte && (w.inhalt === 'zeile' || w.inhalt === 'spalte')) w.inhalt = 'gesamt';   // ohne Spalten gibt es nur den Anteil am Gesamt
  if (w.geheim === 'runden' && w.inhalt !== 'anzahl' && w.inhalt !== 'summe') w.geheim = 'sperren';   // Runden gibt es nur für Zahlen von Personen oder Summen
  return w;
}
export const brauchtWert = (w: Pick<AmtlichWahl, 'inhalt'>) => w.inhalt === 'mittel' || w.inhalt === 'summe';
/** Ist die Wahl so weit vollständig, dass eine Tabelle entstehen kann? */
export const amtlichVollstaendig = (w: AmtlichWahl) => !!w.zeile && w.zeile !== w.spalte && (!brauchtWert(w) || (!!w.wert && w.wert !== w.zeile && w.wert !== w.spalte));

/** Wie die Schätzwerte entstehen: ohne R (`js`), mit R und Stichprobenplan „einzeln gezogen“ (`design`) oder mit R und Replikationsgewichten (`rep`). */
export type AmtlichWeg = 'js' | 'design' | 'rep';
export function amtlichWeg(w: AmtlichWahl, gw: GewichtAbdruck | undefined): AmtlichWeg {
  if (!gw || gw.art !== 'umfrage') return 'js';
  if (w.rep.an) return 'rep';
  return nutztDesign(gw) ? 'design' : 'js';
}

/* ------------------------------------------------------------------------------------------------------------------------------------ Grund */
export const AMTLICH_MAX_STUFEN = 30;
/** Zellen mit eigener Rechnung in R (Mittelwert, Summe): Zeilen × Spalten der Tabelle mit Rändern. */
export const AMTLICH_MAX_ZELLEN = 150;
/** Zeilen × Spalten, die an R gehen (Speicher im Browser). */
export const AMTLICH_MAX_ZAHLEN = 6e6;
export type AmtlichFehler = 'leer' | 'zu-viele-zeilen' | 'zu-viele-spalten' | 'zu-viele-zellen' | 'zu-gross';
export interface AmtlichGrund {
  hatSpalte: boolean; haeufig: boolean;
  zeilen: (string | number)[]; spalten: (string | number)[];
  /** je Zeile der Quelle: Platz der Stufe (1, 2, …) oder null, wenn die Zeile nicht zählt (kein Gewicht, Wert fehlt) */ ca: (number | null)[]; cb: (number | null)[];
  /** die Werte der Zahlenspalte (nur Mittelwert und Summe) */ y: (number | null)[];
  /** Ungewichtete Fälle je Zelle (Zeilen × Spalten, ohne Ränder); mit Häufigkeitsgewicht die Summe der Gewichte */ n: number[][];
  /** Summe der Gewichte und der Gewichte mal Wert je Zelle (ohne Ränder) */ sw: number[][]; sy: number[][];
  /** Beiträge je Zelle für Dominanz- und p-%-Regel (nur wenn gewählt) */ beitraege?: number[][][];
  /** Zeilen der Quelle, die Gewicht haben (so viele gehen an R) */ idx: number[];
  w: number[];
}
const sortiere = (v: (string | number)[]) => [...v].sort((a, b) => (typeof a === 'number' && typeof b === 'number' ? a - b : String(a).localeCompare(String(b), 'de')));

export function amtlichGrund(wahl: AmtlichWahl, q: Quelle, haeufig: boolean): AmtlichGrund | { fehler: AmtlichFehler } {
  const hatSpalte = !!wahl.spalte, mitY = brauchtWert(wahl);
  const va = werteVon(q, wahl.zeile), vb = hatSpalte ? werteVon(q, wahl.spalte) : null, vy = mitY ? werteVon(q, wahl.wert) : null;
  // Die Stufen kommen aus allen Fällen mit Gewicht und Angabe in Zeilen- und Spaltenmerkmal; gezählt und gemittelt wird, wo auch die Zahl da ist (so zeigt eine Stufe ohne Zahl „-“ statt zu fehlen).
  const stufeOk = (i: number) => q.w[i]! > 0 && va[i] !== null && va[i] !== undefined && (!vb || (vb[i] !== null && vb[i] !== undefined));
  const gueltig = (i: number) => stufeOk(i) && (!vy || typeof vy[i] === 'number');
  const za = new Set<string | number>(), sb = new Set<string | number>();
  const idx: number[] = [];
  for (let i = 0; i < q.w.length; i++) { if (q.w[i]! > 0) idx.push(i); if (stufeOk(i)) { za.add(va[i]!); if (vb) sb.add(vb[i]!); } }
  if (!za.size) return { fehler: 'leer' };
  if (za.size > AMTLICH_MAX_STUFEN) return { fehler: 'zu-viele-zeilen' };
  if (sb.size > AMTLICH_MAX_STUFEN) return { fehler: 'zu-viele-spalten' };
  const zeilen = sortiere([...za]), spalten = vb ? sortiere([...sb]) : [''];
  const R = zeilen.length, C = spalten.length;
  const pa = new Map(zeilen.map((x, i) => [x, i + 1] as const)), pb = new Map(spalten.map((x, i) => [x, i + 1] as const));
  const ca: (number | null)[] = [], cb: (number | null)[] = [], y: (number | null)[] = [];
  const mk = () => Array.from({ length: R }, () => new Array<number>(C).fill(0));
  const n = mk(), sw = mk(), sy = mk();
  const beitraege = wahl.geheim === 'sperren' && (wahl.dominanz || wahl.prozentRegel) ? Array.from({ length: R }, () => Array.from({ length: C }, () => [] as number[])) : undefined;
  for (let i = 0; i < q.w.length; i++) {
    const ok = stufeOk(i);
    ca.push(ok ? pa.get(va[i]!)! : null); cb.push(ok ? (vb ? pb.get(vb[i]!)! : 1) : null); y.push(vy && typeof vy[i] === 'number' ? (vy[i] as number) : null);
    if (!gueltig(i)) continue;
    const r = ca[i]! - 1, c = cb[i]! - 1, w = q.w[i]!, yy = typeof y[i] === 'number' ? y[i]! : 0;
    n[r]![c]! += haeufig ? w : 1; sw[r]![c]! += w; sy[r]![c]! += w * yy;
    if (beitraege) beitraege[r]![c]!.push(mitY ? Math.abs(w * yy) : w);
  }
  return { hatSpalte, haeufig, zeilen, spalten, ca, cb, y, n, sw, sy, beitraege, idx, w: q.w };
}

/* ------------------------------------------------------------------------------------------------------------------------------------ Rohwerte */
/** Ein Schätzwert mit allem, was R liefert. `null` = nicht berechenbar. Anteile stehen als Anteil 0 bis 1, Mittelwert und Anzahl in ihrer Einheit. */
export interface ZelleRoh { schaetzer: number | null; se: number | null; cv: number | null; kiU: number | null; kiO: number | null }
export type RohMatrix = ZelleRoh[][];
const leereZelle = (): ZelleRoh => ({ schaetzer: null, se: null, cv: null, kiU: null, kiO: null });
export const leereRoh = (R: number, C: number): RohMatrix => Array.from({ length: R + 1 }, () => Array.from({ length: C + 1 }, leereZelle));

/** Ohne R: gewichtete Summen aus dem Grund. Keine Standardfehler (der Stichprobenplan ist nicht bekannt oder es gibt kein Gewicht). */
export function amtlichJs(wahl: AmtlichWahl, g: AmtlichGrund): RohMatrix {
  const R = g.zeilen.length, C = g.spalten.length, roh = leereRoh(R, C);
  const sw = mitRaendern(g.sw), sy = mitRaendern(g.sy);
  for (let i = 0; i <= R; i++) for (let j = 0; j <= C; j++) {
    const cell = roh[i]![j]!, w = sw[i]![j]!, y = sy[i]![j]!;
    let v: number | null;
    switch (wahl.inhalt) {
      case 'anzahl': v = w; break;
      case 'summe': v = y; break;
      case 'mittel': v = w > 0 ? y / w : null; break;
      case 'zeile': v = sw[i]![C]! > 0 ? w / sw[i]![C]! : null; break;
      case 'spalte': v = sw[R]![j]! > 0 ? w / sw[R]![j]! : null; break;
      default: v = sw[R]![C]! > 0 ? w / sw[R]![C]! : null;
    }
    cell.schaetzer = v;
  }
  return roh;
}

/* ------------------------------------------------------------------------------------------------------------------------------------ R-Plan */
export interface AmtlichAuftrag { art: UmfrageArt; aufruf: string; lies: (e: UmfrageErgebnis, roh: RohMatrix) => void }
export interface AmtlichPlan { spalten: RSpalte[]; auftraege: AmtlichAuftrag[]; /** Zeilen, die an R gehen */ zeilen: number; zellen: number; rep?: RepPlan }
const zahlen = (x: unknown) => zahlOderNull(x);
const setzeWert = (roh: RohMatrix, i: number, j: number, e: UmfrageErgebnis | null | undefined, schaetzerFeld: string, kiU?: unknown, kiO?: unknown) => {
  const z = roh[i]![j]!;
  z.schaetzer = zahlen(e?.[schaetzerFeld]); z.se = zahlen(e?.se); z.cv = zahlen(e?.cv); z.kiU = zahlen(kiU ?? e?.kiU); z.kiO = zahlen(kiO ?? e?.kiO);
};
const hundert = (roh: RohMatrix, i: number, j: number) => { const z = roh[i]![j]!; z.schaetzer = 1; z.se = 0; z.cv = null; z.kiU = null; z.kiO = null; };
const codes = (k: number) => `c(${Array.from({ length: k }, (_, i) => rZahl(i + 1)).join(', ')})`;
const bereich = (k: number) => Array.from({ length: k }, (_, i) => i);

/** Der Auftrag an R für die ganze Tabelle: eine Anfrage je Zeile oder Spalte (Anzahl, Anteile) bzw. eine für alle Zellen (Mittelwert) oder je Zelle (Summe). */
export function amtlichPlan(wahl: AmtlichWahl, g: AmtlichGrund, rep?: RepPlan, entwurf?: EntwurfPlan | null): AmtlichPlan | { fehler: AmtlichFehler } {
  const R = g.zeilen.length, C = g.spalten.length, idx = g.idx, repTeil = (rep ? `, ${rep.rTeil}` : '') + (rep ? '' : entwurfRTeil(entwurf));   // der Stichprobenplan der Person gilt nur ohne Replikationsgewichte
  const spalten: RSpalte[] = [{ name: 'w', art: 'zahl', werte: idx.map(i => g.w[i]!) }];
  const auftraege: AmtlichAuftrag[] = [];
  let eZahl = 0;
  const eSpalte = (f: (i: number) => boolean): string => { const name = `e${++eZahl}`; spalten.push({ name, art: 'zahl', werte: idx.map(i => (f(i) ? 1 : 0)) }); return name; };
  const alle = (i: number) => g.ca[i] !== null && g.cb[i] !== null;
  const mitY = brauchtWert(wahl);
  const eckig = (R + 1) * (g.hatSpalte ? C + 1 : 1);
  if (mitY && eckig > AMTLICH_MAX_ZELLEN) return { fehler: 'zu-viele-zellen' };
  const spaltenAnzahl = mitY ? eckig : R + C + 5;
  if ((spaltenAnzahl + (rep ? rep.anzahl : 0)) * idx.length > AMTLICH_MAX_ZAHLEN) return { fehler: 'zu-gross' };
  if (!mitY) spalten.push({ name: 'a1', art: 'zahl', werte: idx.map(i => g.ca[i] ?? null) }, { name: 'b1', art: 'zahl', werte: idx.map(i => g.cb[i] ?? null) });
  if (wahl.inhalt === 'anzahl' || wahl.inhalt === 'zeile') {
    // eine Anfrage je Zeile i (Teilpopulation: Zeile i) und eine für alle Fälle (Randzeile); gezählt wird nach der Spalte (b1)
    for (let i = 0; i <= R; i++) {
      const e = eSpalte(k => alle(k) && (i === R || g.ca[k] === i + 1));
      if (wahl.inhalt === 'anzahl') {
        auftraege.push({ art: 'total', aufruf: `sp_umfrage_total(d, ${rQ('b1')}, ${rQ('w')}, ${rQ(e)}, ${rWahl('kategorien', ['kategorien', 'summe'] as const)}, ${codes(C)}${repTeil})`,
          lies: (r, roh) => { if (r.fehlerCode) return meldeFehler(roh, r); for (const k of (r.kategorien ?? []) as UmfrageErgebnis[]) setzeWert(roh, i, Number(k.wert) - 1, k, 'total'); setzeWert(roh, i, C, r.gesamt, 'total'); } });
      } else {
        auftraege.push({ art: 'anteil', aufruf: `sp_umfrage_anteil(d, ${rQ('b1')}, ${rQ('w')}, ${rQ(e)}, ${codes(C)}${repTeil})`,
          lies: (r, roh) => { if (r.fehlerCode) return meldeFehler(roh, r); for (const k of (r.kategorien ?? []) as UmfrageErgebnis[]) setzeWert(roh, i, Number(k.wert) - 1, k, 'p', k.logit?.u, k.logit?.o); hundert(roh, i, C); } });
      }
    }
  } else if (wahl.inhalt === 'spalte') {
    for (let j = 0; j <= C; j++) {
      const e = eSpalte(k => alle(k) && (j === C || g.cb[k] === j + 1));
      auftraege.push({ art: 'anteil', aufruf: `sp_umfrage_anteil(d, ${rQ('a1')}, ${rQ('w')}, ${rQ(e)}, ${codes(R)}${repTeil})`,
        lies: (r, roh) => { if (r.fehlerCode) return meldeFehler(roh, r); for (const k of (r.kategorien ?? []) as UmfrageErgebnis[]) setzeWert(roh, Number(k.wert) - 1, j, k, 'p', k.logit?.u, k.logit?.o); hundert(roh, R, j); } });
    }
  } else if (wahl.inhalt === 'gesamt') {
    // Zellen: ein Code je Zelle (g1), Ränder: die Zeilen- und die Spaltenstufe für sich, alles auf allen gültigen Fällen
    spalten.push({ name: 'g1', art: 'zahl', werte: idx.map(i => (g.ca[i] !== null && g.cb[i] !== null ? (g.ca[i]! - 1) * C + g.cb[i]! : null)) });
    const e = eSpalte(alle);
    const lesePaare = (art: 'a' | 'b') => (r: UmfrageErgebnis, roh: RohMatrix) => { if (r.fehlerCode) return meldeFehler(roh, r); for (const k of (r.kategorien ?? []) as UmfrageErgebnis[]) { const p = Number(k.wert) - 1; if (art === 'a') setzeWert(roh, p, C, k, 'p', k.logit?.u, k.logit?.o); else setzeWert(roh, R, p, k, 'p', k.logit?.u, k.logit?.o); } };
    auftraege.push({ art: 'anteil', aufruf: `sp_umfrage_anteil(d, ${rQ('g1')}, ${rQ('w')}, ${rQ(e)}, ${codes(R * C)}${repTeil})`,
      lies: (r, roh) => { if (r.fehlerCode) return meldeFehler(roh, r); for (const k of (r.kategorien ?? []) as UmfrageErgebnis[]) { const p = Number(k.wert) - 1; setzeWert(roh, Math.floor(p / C), p % C, k, 'p', k.logit?.u, k.logit?.o); } hundert(roh, R, C); } });
    auftraege.push({ art: 'anteil', aufruf: `sp_umfrage_anteil(d, ${rQ('a1')}, ${rQ('w')}, ${rQ(e)}, ${codes(R)}${repTeil})`, lies: lesePaare('a') });
    if (g.hatSpalte) auftraege.push({ art: 'anteil', aufruf: `sp_umfrage_anteil(d, ${rQ('b1')}, ${rQ('w')}, ${rQ(e)}, ${codes(C)}${repTeil})`, lies: lesePaare('b') });
    else auftraege.push({ art: 'anteil', aufruf: `sp_umfrage_anteil(d, ${rQ('b1')}, ${rQ('w')}, ${rQ(e)}, ${codes(1)}${repTeil})`, lies: (r, roh) => { if (r.fehlerCode) return meldeFehler(roh, r); hundert(roh, R, 0); } });
  } else {
    // Mittelwert und Summe: je Zelle (und Rand) eine Spalte q<k> mit dem Wert in den Fällen der Zelle und sonst fehlend; so ist die Teilpopulation genau die Zelle
    const zellenListe: [number, number][] = [];
    for (let i = 0; i <= R; i++) for (let j = 0; j <= (g.hatSpalte ? C : C - 1); j++) zellenListe.push([i, j]);
    const namen: string[] = [];
    zellenListe.forEach(([i, j], k) => {
      const name = `q${k + 1}`; namen.push(name);
      spalten.push({ name, art: 'zahl', werte: idx.map(r => { const y = g.y[r]; return y !== null && y !== undefined && g.ca[r] !== null && g.cb[r] !== null && (i === R || g.ca[r] === i + 1) && (j === C || g.cb[r] === j + 1) ? y : null; }) });
    });
    const kopiere = (roh: RohMatrix) => { if (!g.hatSpalte) for (let i = 0; i <= R; i++) roh[i]![C] = { ...roh[i]![0]! }; };
    if (wahl.inhalt === 'mittel') {
      auftraege.push({ art: 'mittel', aufruf: `sp_umfrage_mittel(d, ${rIds(namen)}, ${rQ('w')}, NULL, NULL${repTeil})`,
        lies: (r, roh) => { if (r.fehlerCode) return meldeFehler(roh, r); ((r.ergebnisse ?? []) as UmfrageErgebnis[]).forEach((x, k) => { const [i, j] = zellenListe[k]!; if (!x.fehlerCode) setzeWert(roh, i, j, x, 'mittel'); }); kopiere(roh); } });
    } else {
      zellenListe.forEach(([i, j], k) => auftraege.push({ art: 'total', aufruf: `sp_umfrage_total(d, ${rQ(namen[k])}, ${rQ('w')}, NULL, ${rWahl('summe', ['kategorien', 'summe'] as const)}, NULL${repTeil})`,
        lies: (r, roh) => { if (r.fehlerCode) return meldeFehler(roh, r); setzeWert(roh, i, j, r.summe, 'total'); if (k === zellenListe.length - 1) kopiere(roh); } }));
    }
  }
  if (rep) spalten.push(...rep.spalten); else if (entwurf) spalten.push(...entwurf.spalten);
  return { spalten, auftraege, zeilen: idx.length, zellen: 0, rep };
}
/** Fehler der Rechnung, die für die ganze Tabelle gelten (nicht „zu wenig Fälle in dieser Zeile“): sie werden zur Ausnahme mit dem Code. */
export class AmtlichRFehler extends Error { constructor(public e: UmfrageErgebnis) { super(String(e.fehlerCode)); } }
const NUR_ZELLE = ['zu-wenig', 'konstant', 'eine-kategorie'];
function meldeFehler(_roh: RohMatrix, e: UmfrageErgebnis): void { if (!NUR_ZELLE.includes(String(e.fehlerCode))) throw new AmtlichRFehler(e); }

/* ------------------------------------------------------------------------------------------------------------------------------------ Tabelle */
export interface AmtlichZelle { text: string; cvText: string; kennzeichen: Kennzeichen; gesperrt: boolean; /** nur bei einer ausgewiesenen Zahl ohne Klammer: der Zahlenwert (für Excel) */ n?: number; cvN?: number }
export interface Protokoll {
  saetze: string[];
  /** Zellen mit Sperre: Ort, Art, Grund, Fallzahl und Intervall */
  sperren: { zeile: string; spalte: string; art: 'primaer' | 'sekundaer'; grund: string; n: number; intervall: string | null }[];
  fallzahlen: number[][];
}
export interface AmtlichTabelle {
  hatSpalte: boolean; cvSpalte: boolean; mitGenauigkeit: boolean;
  zeilenName: string[]; spaltenName: string[];
  zellen: AmtlichZelle[][];
  einheit: string; wertKopf: string;
  zeichen: { zeichen: string; text: string }[];
  /** Fußnoten, die immer stehen (Gewicht, Fehlerrechnung, Geheimhaltung) */ fuss: string[];
  /** Hinweise für die Seite (nicht in der Ausgabe) */ hilfe: string[];
  geheim: GeheimErgebnis | null; rund: RundenErgebnis | null;
  protokoll: Protokoll;
  /** wie viele Zellen sind „x“ durch Geheimhaltung */ anzahlGeheim: number;
  /** wie viele Zellen sind „x“ nur durch die Kennzeichnung (zu wenige Fälle, nicht gesperrt) */ anzahlKlein: number;
  grenzen: Grenzen;
}
export interface AmtlichKontext {
  gw: GewichtAbdruck | undefined; weg: AmtlichWeg;
  /** Namen für die Anzeige (Spalten der Daten) */ nameZeile: string; nameSpalte: string; nameWert: string; nameGewicht: string;
  /** Anzeige der Stufen: Wertebeschriftung */ stufe: (spalte: string, wert: string | number) => string;
  nRep?: number; scaleRep?: number | null; typRep?: RepTyp;
}
const repTypName = (t: RepTyp) => (t === 'bootstrap' ? 'Bootstrap' : t === 'JK1' ? 'Jackknife (JK1)' : t === 'BRR' ? 'BRR' : 'Fay');

/** Zahl mit Tausendertrenner und Dezimalzeichen der Sprache. Der Tausendertrenner ist in jeder Sprache das geschützte Leerzeichen (wie in der amtlichen Statistik): so bleibt der Text für die Ausgabe eindeutig (kein Punkt, der als Dezimalpunkt gelesen wird), und Excel liest die Zahl. */
export function zahlText(x: number, stellen: number): string {
  const t = Math.abs(x).toFixed(stellen), [ganz, nach] = t.split('.');
  const vorn = (ganz ?? '').replace(/\B(?=(\d{3})+$)/g, '\u00a0');
  return `${x < 0 && Number(t) !== 0 ? '−' : ''}${vorn}${nach ? dezimal() + nach : ''}`;
}
const stellenFuer = (inhalt: AmtlichInhalt, _x: number) => (inhalt === 'anzahl' || inhalt === 'summe' ? 0 : 1);

/** Die Überschrift über dem Zahlenwert: „Anzahl“, „Anteil in %“, „Mittelwert“, „Summe“. */
export function amtlichWertKopf(inhalt: AmtlichInhalt, _gewichtet: boolean): string {
  switch (inhalt) {
    case 'anzahl': return L('Anzahl', 'Count');
    case 'summe': return L('Summe', 'Sum');
    case 'mittel': return L('Mittelwert', 'Mean');
    default: return L('Anteil in %', 'Share in %');
  }
}
export function amtlichTitel(w: AmtlichWahl, k: Pick<AmtlichKontext, 'nameZeile' | 'nameSpalte' | 'nameWert'>, gewichtet: boolean): string {
  const nach = w.spalte ? L(`${k.nameZeile} nach ${k.nameSpalte}`, `${k.nameZeile} by ${k.nameSpalte}`) : k.nameZeile;
  switch (w.inhalt) {
    case 'anzahl': return `${nach}: ${gewichtet ? L('Anzahl, hochgerechnet', 'estimated count') : L('Anzahl', 'count')}`;
    case 'zeile': return `${nach}: ${L('Anteil in %, Zeile = 100 %', 'share in %, row = 100%')}`;
    case 'spalte': return `${nach}: ${L('Anteil in %, Spalte = 100 %', 'share in %, column = 100%')}`;
    case 'gesamt': return `${nach}: ${L('Anteil in % am Gesamt', 'share in % of the total')}`;
    case 'mittel': return `${L(`Mittelwert von ${k.nameWert}`, `Mean of ${k.nameWert}`)}, ${nach}`;
    default: return `${L(`Summe von ${k.nameWert}`, `Sum of ${k.nameWert}`)}, ${nach}`;
  }
}

/** Geheimhaltung, Kennzeichnung, Texte und Prüfprotokoll. `roh`: die Schätzwerte mit Rändern (R+1 × C+1). */
export function amtlichBaue(w: AmtlichWahl, g: AmtlichGrund, roh: RohMatrix, k: AmtlichKontext): AmtlichTabelle {
  const R = g.zeilen.length, C = g.spalten.length;
  const gewichtet = !!k.gw;
  const mitGenauigkeit = k.weg !== 'js';
  const prozentInhalt = w.inhalt === 'zeile' || w.inhalt === 'spalte' || w.inhalt === 'gesamt';
  const nM = mitRaendern(g.n);
  // Wert für die Geheimhaltung: veröffentlichte Hochrechnung bei Anzahl und Summe, sonst bleibt es bei den Fallzahlen
  const jsRoh = amtlichJs(w, g);
  const wertAus = (i: number, j: number) => roh[i]![j]!.schaetzer ?? jsRoh[i]![j]!.schaetzer ?? 0;
  let geheim: GeheimErgebnis | null = null, rund: RundenErgebnis | null = null;
  if (w.geheim === 'sperren') {
    const wert = w.inhalt === 'anzahl' || w.inhalt === 'summe' ? Array.from({ length: R }, (_, i) => Array.from({ length: C }, (_, j) => wertAus(i, j))) : undefined;
    geheim = geheimhalten({ n: g.n, wert, beitraege: g.beitraege }, { minN: w.minN, dominanz: w.dominanz ? { n: 1, k: w.dominanzK } : null, prozent: w.prozentRegel ? w.prozentP : null });
  } else if (w.geheim === 'runden') {
    rund = rundeTabelle(Array.from({ length: R }, (_, i) => Array.from({ length: C }, (_, j) => wertAus(i, j))), w.rundenBasis);
  }
  const zeichenDa = new Set<Kennzeichen>();
  let anzahlGeheim = 0, anzahlKlein = 0;
  const cvSpalte = w.cvZeigen && mitGenauigkeit;
  const zellen: AmtlichZelle[][] = [];
  for (let i = 0; i <= R; i++) {
    const zeile: AmtlichZelle[] = [];
    for (let j = 0; j <= C; j++) {
      const z = roh[i]![j]!, n = nM[i]![j]!;
      const gesperrt = !!geheim?.gesperrt[i]?.[j];
      const ohneCv = prozentInhalt && ((w.inhalt === 'zeile' && j === C) || (w.inhalt === 'spalte' && i === R) || (i === R && j === C));
      const wertZ = rund ? rund.tabelle[i]![j]! : z.schaetzer;
      const kz = kennzeichne({ schaetzer: n <= 0 ? 0 : wertZ, cv: ohneCv ? null : z.cv, n, geheim: gesperrt }, w.grenzen);
      let text: string, cvText: string, zn: number | undefined, cvN: number | undefined;
      if (kz === '' || kz === 'klammer') {
        const v = prozentInhalt ? wertZ! * 100 : wertZ!, st = stellenFuer(w.inhalt, v);
        text = zahlText(v, st); if (kz === 'klammer') text = `(${text})`; else zn = Number(v.toFixed(st));
        if (z.cv !== null && !ohneCv) { cvText = zahlText(z.cv * 100, 1); cvN = Number((z.cv * 100).toFixed(1)); } else cvText = '-';
      } else { text = kz; cvText = kz; }
      if (kz === 'x' && gesperrt) anzahlGeheim++;
      else if (kz === 'x') anzahlKlein++;
      if (kz !== '') zeichenDa.add(kz);
      zeile.push({ text, cvText, kennzeichen: kz, gesperrt, ...(zn !== undefined ? { n: zn } : {}), ...(cvN !== undefined ? { cvN } : {}) });
    }
    zellen.push(zeile);
  }
  if (!cvSpalte) zellen.forEach(z => z.forEach(c => { c.cvText = ''; }));
  const zeichen = zeichenErklaerung(w.grenzen, [...zeichenDa]);
  // Fußnoten (Gewicht, Fehlerrechnung, Geheimhaltung)
  const fuss: string[] = [], hilfe: string[] = [];
  if (!k.gw) fuss.push(L('Ungewichtete Zahlen.', 'Unweighted numbers.'));
  else if (k.gw.art === 'haeufigkeit') fuss.push(L(`Jede Zeile zählt so oft, wie das Gewicht ${zitat(k.nameGewicht)} angibt.`, `Each row counts as often as the weight ${zitat(k.nameGewicht)} says.`));
  else if (w.inhalt === 'anzahl' || w.inhalt === 'summe') fuss.push(L(`Hochgerechnet mit dem Gewicht ${zitat(k.nameGewicht)}.`, `Estimated with the weight ${zitat(k.nameGewicht)}.`));
  else fuss.push(L(`Gewichtet mit dem Gewicht ${zitat(k.nameGewicht)}.`, `Weighted with the weight ${zitat(k.nameGewicht)}.`));
  if (k.weg === 'rep') {
    const sc = k.scaleRep !== null && k.scaleRep !== undefined ? komma(k.scaleRep, 4) : L('Voreinstellung von survey', 'default of survey');
    fuss.push(L(`Standardfehler und Variationskoeffizient mit ${k.nRep ?? ''} Replikationsgewichten (${repTypName(k.typRep ?? 'bootstrap')}, Faktor ${sc}), gerechnet mit R und dem Paket survey.`,
      `Standard errors and coefficient of variation with ${k.nRep ?? ''} replicate weights (${repTypName(k.typRep ?? 'bootstrap')}, factor ${sc}), calculated with R and the package survey.`));
  } else if (k.weg === 'design' && k.gw?.entwurf) fuss.push(L(`Standardfehler und Variationskoeffizient mit dem angegebenen Stichprobenplan (${entwurfWorte(k.gw.entwurf)}; Taylor-Linearisierung), gerechnet mit R und dem Paket survey.`, `Standard errors and coefficient of variation with the stated sampling design (${entwurfWorte(k.gw.entwurf)}; Taylor linearisation), calculated with R and the package survey.`));
  else if (k.weg === 'design') fuss.push(L('Standardfehler und Variationskoeffizient mit dem Stichprobenplan „einzeln gezogen“ (Taylor-Linearisierung), gerechnet mit R und dem Paket survey.', 'Standard errors and coefficient of variation with the sampling design "drawn individually" (Taylor linearisation), calculated with R and the package survey.'));
  else if (k.gw?.art === 'umfrage') hilfe.push(L('Ohne Angabe zur Genauigkeit: Der Stichprobenplan ist nicht bekannt. Replikationsgewichte unter „Weitere Wege“ wählen oder beim Fallgewicht „einzeln gezogen“ oder den Stichprobenplan angeben.', 'No precision given: the sampling design is not known. Choose replicate weights under "More options" or state "drawn individually" or the sampling design for the case weight.'));
  else if (k.gw?.art === 'haeufigkeit') hilfe.push(L('Ohne Angabe zur Genauigkeit: Ein Häufigkeitsgewicht gibt keine Standardfehler. Die Kennzeichnung gilt nur nach der Zahl der Fälle.', 'No precision given: a frequency weight gives no standard errors. The marking only follows the number of cases.'));
  else hilfe.push(L('Ohne Gewicht gibt es keine Standardfehler. Die Kennzeichnung gilt nur nach der Zahl der Fälle.', 'Without a weight there are no standard errors. The marking only follows the number of cases.'));
  if (geheim) fuss.push(geheim.gesamt > 0
    ? (w.dominanz
      ? L(`Zahlen mit weniger als ${w.minN} Fällen sind gesperrt (auch bei starker Dominanz einzelner Fälle); weitere Zellen sind gesperrt, damit sie sich nicht aus den Summen berechnen lassen.`, `Numbers with fewer than ${w.minN} cases are suppressed (also where single cases dominate); further cells are suppressed so that they cannot be calculated from the totals.`)
      : L(`Zahlen mit weniger als ${w.minN} Fällen sind gesperrt; weitere Zellen sind gesperrt, damit sie sich nicht aus den Summen berechnen lassen.`, `Numbers with fewer than ${w.minN} cases are suppressed; further cells are suppressed so that they cannot be calculated from the totals.`))
    : L(`Geprüft: Zahlen mit weniger als ${w.minN} Fällen wären gesperrt; es gibt keine.`, `Checked: numbers with fewer than ${w.minN} cases would be suppressed; there are none.`));
  if (rund) fuss.push(rund.hinweis);
  if (geheim && !geheim.geschuetzt) hilfe.push(L('Achtung: Nicht alle gesperrten Zahlen sind geschützt. Das Prüfprotokoll zeigt, welche. Eine größere Grenze oder weniger Stufen helfen.', 'Warning: not all suppressed numbers are protected. The check log shows which. A higher limit or fewer levels help.'));
  if (w.dominanz && !g.beitraege) hilfe.push(L('Die Dominanzregel braucht die Beiträge je Zelle.', 'The dominance rule needs the contributions per cell.'));
  hilfe.push(grenzenSatz(w.grenzen));
  // Prüfprotokoll: nie in die Ausgabe
  const protokoll: Protokoll = { saetze: [...(geheim?.protokoll ?? [])], sperren: [], fallzahlen: nM };
  if (geheim) {
    const name = (i: number, j: number) => ({ zeile: i < R ? k.stufe(w.zeile, g.zeilen[i]!) : L('Insgesamt', 'Total'), spalte: g.hatSpalte && j < C ? k.stufe(w.spalte, g.spalten[j]!) : L('Insgesamt', 'Total') });
    const iv = new Map(geheim.intervalle.map(x => [`${x.zeile},${x.spalte}`, x]));
    for (let i = 0; i <= R; i++) for (let j = 0; j <= C; j++) {
      if (!geheim.gesperrt[i]![j]) continue;
      const gr = geheim.grund[i]![j];
      const grundText = gr === 'minN' ? L(`weniger als ${w.minN} Fälle`, `fewer than ${w.minN} cases`) : gr === 'dominanz' ? L('Dominanz einzelner Fälle', 'dominance of single cases') : gr === 'prozent' ? L('p-%-Regel', 'p% rule') : L('zusätzlich gesperrt wegen der Summen', 'additionally suppressed because of the totals');
      const x = iv.get(`${i},${j}`);
      protokoll.sperren.push({ ...name(i, j), art: geheim.status[i]![j] === 'primaer' ? 'primaer' : 'sekundaer', grund: grundText, n: nM[i]![j]!, intervall: x ? `[${zahlText(x.min, 0)}; ${zahlText(x.max, 0)}]` : null });
    }
  }
  return {
    hatSpalte: g.hatSpalte, cvSpalte, mitGenauigkeit,
    zeilenName: g.zeilen.map(x => k.stufe(w.zeile, x)), spaltenName: g.hatSpalte ? g.spalten.map(x => k.stufe(w.spalte, x)) : [],
    zellen, einheit: amtlichTitel(w, k, gewichtet), wertKopf: amtlichWertKopf(w.inhalt, gewichtet), zeichen, fuss, hilfe, geheim, rund, protokoll, anzahlGeheim, anzahlKlein, grenzen: w.grenzen
  };
}

/* ------------------------------------------------------------------------------------------------------------------------------------ Ausgabe (nur die veröffentlichbare Fassung) */
/** Die Tabelle als TableItem für Seite, Bericht, Word, PDF und Excel. Enthält nur Zellentexte und Fußnoten; Fallzahlen gesperrter Zellen und das Prüfprotokoll kommen nie hinein. */
export function amtlichItem(t: AmtlichTabelle, w: Pick<AmtlichWahl, 'quelle' | 'fussnote'>, titel: string, nameZeile: string, nameSpalte: string): TableItem {
  const R = t.zeilenName.length, C = t.hatSpalte ? t.spaltenName.length : 0;
  const spaltenKoepfe = t.hatSpalte ? [...t.spaltenName, L('Insgesamt', 'Total')] : [t.wertKopf];
  const breite = t.cvSpalte ? 2 : 1;
  const kopfZ = (t.hatSpalte ? 2 : 1) + (t.cvSpalte ? 1 : 0), cols = 1 + spaltenKoepfe.length * breite;
  const cells: Cell[] = [];
  const kopf = (r: number, c: number, cs: number, text: string, rs = 1, a: 'l' | 'c' = 'c'): Cell => ({ r, c, rs, cs, h: true, a, t: text });
  cells.push(kopf(0, 0, 1, nameZeile, kopfZ, 'l'));
  let r = 0;
  if (t.hatSpalte) { cells.push(kopf(0, 1, cols - 1, nameSpalte)); r = 1; }
  spaltenKoepfe.forEach((s, j) => cells.push(kopf(r, 1 + j * breite, breite, s)));
  if (t.cvSpalte) { r++; spaltenKoepfe.forEach((_, j) => cells.push(kopf(r, 1 + j * breite, 1, t.wertKopf), kopf(r, 2 + j * breite, 1, L('CV in %', 'CV in %').replace(/ /g, '\u00a0')))); }
  r = kopfZ;
  const zeilenNamen = [...t.zeilenName, L('Insgesamt', 'Total')];
  zeilenNamen.forEach((name, i) => {
    cells.push({ r, c: 0, rs: 1, cs: 1, h: true, a: 'l', t: name, ...(i === R ? { b: true } : {}) });
    const sp = t.hatSpalte ? t.zellen[i]! : [t.zellen[i]![0]!];
    sp.forEach((z, j) => {
      cells.push({ r, c: 1 + j * breite, rs: 1, cs: 1, h: false, a: 'r', t: z.text, ...(z.n !== undefined ? { n: z.n } : {}), ...(i === R || (t.hatSpalte && j === C) ? { b: true } : {}) });
      if (t.cvSpalte) cells.push({ r, c: 2 + j * breite, rs: 1, cs: 1, h: false, a: 'r', t: z.cvText, ...(z.cvN !== undefined ? { n: z.cvN } : {}) });
    });
    r++;
  });
  const fn = (text: string): Cell => ({ r: 0, c: 0, rs: 1, cs: 1, h: false, a: 'l', t: text });
  const fuss: string[] = [];
  if (t.zeichen.length) fuss.push(`${L('Zeichenerklärung', 'Key')}: ${t.zeichen.map(z => `${z.zeichen} ${z.text}`).join('; ')}.`);
  fuss.push(...t.fuss);
  if (w.fussnote.trim()) fuss.push(w.fussnote.trim());
  if (w.quelle.trim()) fuss.push(`${L('Quelle', 'Source')}: ${w.quelle.trim()}`);
  return {
    type: 'table', label: 'Statable Veröffentlichung', layer: [], title: { r: 0, c: 0, rs: 1, cs: 1, h: false, a: 'l', t: titel },
    rows: r, cols, headRows: [kopfZ, 0], headCols: [1, 0], cells, caption: null, footnotes: fuss.map(fn)
  };
}

/** Der Satz im Bericht: was die Tabelle zeigt (ohne Zahlen). */
export function amtlichSatz(t: AmtlichTabelle): string {
  const n = t.anzahlGeheim;
  const geheim = t.geheim && n > 0 ? ' ' + Lp(n, '1 Zelle ist aus Gründen der Geheimhaltung gesperrt (x).', `${n} Zellen sind aus Gründen der Geheimhaltung gesperrt (x).`, '1 cell is suppressed for confidentiality (x).', `${n} cells are suppressed for confidentiality (x).`) : '';
  // Testrunde 24.10.: die Tabelle zeigt auch „x“ für Zellen unter der Grenze der Kennzeichnung - sonst passt die Zahl im Satz nicht zu den „x“ der Tabelle.
  const k = t.anzahlKlein;
  const klein = k > 0 ? ' ' + Lp(k, '1 Zelle hat zu wenige Fälle und ist nicht ausgewiesen (x).', `${k} Zellen haben zu wenige Fälle und sind nicht ausgewiesen (x).`, '1 cell has too few cases and is not shown (x).', `${k} cells have too few cases and are not shown (x).`) : '';
  return `${t.einheit}.${geheim}${klein}`;
}
