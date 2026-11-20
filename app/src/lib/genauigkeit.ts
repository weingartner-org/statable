/**
 * Paket M4 „Genauigkeit gewichteter Ergebnisse“ (Fachblatt docs/fachblaetter/MIKRODATEN-2026-10-24.md, Abschnitt M4): die Schnittstelle zu `sp_umfrage_total`, den Replikationsgewichten und
 * `sp_umfrage_kalibrieren` in engine/statable-umfrage.R (Teil 3) und die Kennzeichnung für Veröffentlichungen. Rein, ohne R: den Aufruf von R macht der Aufrufer
 * (lib/umfragerechnen.ts, später die Karte „Tabelle für die Veröffentlichung“ und der Assistent „Kalibrieren“). Keine Oberfläche hier.
 *
 * Sicherheit (CLAUDE.md, Abschnitt Sicherheit): Namen und Texte aus der Datei kommen NIE in den R-Code. Die Spalten gehen mit eigenen Namen an R (w, e, a1, m1, k1 ..., rw1 ... rwN), im Aufruf
 * stehen nur Wörter aus festen Listen (rWahl), eigene Namen (rQ/rIds) und Zahlen (rZahl).
 */
import { L } from './sitzung.svelte';
import { komma } from './ergebnis';
import type { RSpalte } from '../engine/webr';
import { werteVon, type Quelle } from './gewichtbeschreibend';
import { umfrageLesen, umfrageFehlerSatz, umfrageGrenze, type UmfrageErgebnis } from './umfrage';
import { rIds, rQ, rWahl, rZahl } from '../engine/rsicher';
import type { Entwurf } from './gewichte';
import { entwurfPlan, entwurfRTeil } from './umfrageentwurf';

/** Mehr Kategorien als dies rechnet die Hochrechnung je Spalte nicht (dieselbe Zahl wie in lib/umfragedaten.ts). */
export const GENAUIGKEIT_MAX_KATEGORIEN = 30;
const zeilenMitGewicht = (w: number[]) => w.flatMap((g, i) => (g > 0 ? [i] : []));
const zahlOderNull = (v: string | number | null | undefined) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

/* ------------------------------------------------------------------------------------------------------------------------------- Replikationsgewichte */
export const REP_TYPEN = ['bootstrap', 'JK1', 'BRR', 'Fay'] as const;
export type RepTyp = (typeof REP_TYPEN)[number];
/** Dieselben Grenzen wie in R (UM_REP_MAX, UM_REP_ZAHLEN_MAX). */
export const REP_MAX_SPALTEN = 1000, REP_MAX_ZAHLEN = 1e7;
/** Eigener Anfang der Spaltennamen in R (rw1 ... rwN); der Anfang der Datei bleibt in der Datei. */
const REP_ANFANG_R = 'rw';

/** Was die Person einstellt. `anfang`: gemeinsamer Anfang der Spaltennamen in der Datei (z. B. „w_rep“); `fay`: nur für „Fay“ (0 bis unter 1); `scale`/`rscales`: nur wenn die Quelle sie nennt (sonst gilt die
 *  Voreinstellung von survey: bootstrap 1/(R - 1), JK1 (R - 1)/R, BRR 1/R, Fay 1/(R (1 - rho)²)). Die Schätzung läuft immer mit mse = TRUE. */
export interface RepEinstellung { anfang: string; typ: RepTyp; fay?: number | null; scale?: number | null; rscales?: number[] | null }

/** Spalten mit gemeinsamem Anfang, danach nur Ziffern („w_rep1“ ... „w_rep250“), nach der Zahl geordnet (nicht nach dem Alphabet: rep2 vor rep10). */
export function repSpalten(namen: string[], anfang: string): string[] {
  if (!anfang) return [];
  return namen.filter(n => n.startsWith(anfang) && /^[0-9]+$/.test(n.slice(anfang.length))).sort((a, b) => Number(a.slice(anfang.length)) - Number(b.slice(anfang.length)));
}
/** Vorschläge für den Anfang: Namen, die auf Ziffern enden, gruppiert nach dem Teil davor; nur Gruppen mit mindestens `min` Spalten (Voreinstellung 5), die größte zuerst. */
export function repAnfaenge(namen: string[], min = 5): { anfang: string; anzahl: number }[] {
  const g = new Map<string, number>();
  for (const n of namen) { const m = /^(.*?)([0-9]+)$/.exec(n); if (m && m[1]) g.set(m[1], (g.get(m[1]) ?? 0) + 1); }
  return [...g].filter(([, k]) => k >= min).map(([anfang, anzahl]) => ({ anfang, anzahl })).sort((a, b) => b.anzahl - a.anzahl || a.anfang.localeCompare(b.anfang));
}
export type RepProblem = 'rep-typ' | 'rep-fehlt' | 'rep-zu-gross' | 'rep-fay' | 'rep-scale';
/** Prüfung vor dem Aufruf (dieselben Regeln wie in R). `spalten`: Zahl der gefundenen Spalten, `zeilen`: Zeilen mit Gewicht. `null` = in Ordnung. */
export function repPruefen(e: RepEinstellung, spalten: number, zeilen: number): RepProblem | null {
  if (!REP_TYPEN.includes(e.typ)) return 'rep-typ';
  if (spalten < 2) return 'rep-fehlt';
  if (spalten > REP_MAX_SPALTEN || spalten * zeilen > REP_MAX_ZAHLEN) return 'rep-zu-gross';
  if (e.typ === 'Fay' && !(typeof e.fay === 'number' && Number.isFinite(e.fay) && e.fay >= 0 && e.fay < 1)) return 'rep-fay';
  const pos = (x: unknown) => typeof x === 'number' && Number.isFinite(x) && x > 0;
  if ((e.scale !== null && e.scale !== undefined && !pos(e.scale)) || (e.rscales && (e.rscales.length !== spalten || !e.rscales.every(pos)))) return 'rep-scale';
  return null;
}
/** Die Spalten für R und das fünfte (bzw. sechste, siebte) Argument der Aufrufe `sp_umfrage_*`: `rTeil` = `list(anfang = 'rw', typ = …, fay = …, scale = …, rscales = …)`. */
export interface RepPlan { spalten: RSpalte[]; rTeil: string; /** die Spalten der Datei, in der Reihenfolge von rw1 ... */ namen: string[]; typ: RepTyp; anzahl: number }
/** Replikationsgewichte aus den Daten: dieselben Zeilen wie die Gewichtsspalte (Gewicht über 0). Gibt das Problem als Code zurück, wenn schon hier klar ist, dass R es ablehnen würde. */
export function planRep(q: Quelle, e: RepEinstellung): RepPlan | { problem: RepProblem; spalten: number } {
  const namen = repSpalten(q.spalten.map(x => x.name), e.anfang), idx = zeilenMitGewicht(q.w);
  const problem = repPruefen(e, namen.length, idx.length);
  if (problem) return { problem, spalten: namen.length };
  const spalten: RSpalte[] = namen.map((n, k) => { const v = werteVon(q, n); return { name: `${REP_ANFANG_R}${k + 1}`, art: 'zahl', werte: idx.map(i => zahlOderNull(v[i])) } as RSpalte; });
  const rTeilFay = e.typ === 'Fay' ? rZahl(e.fay) : 'NULL';
  const rTeilScale = e.scale === null || e.scale === undefined ? 'NULL' : rZahl(e.scale);
  const rTeilRscales = e.rscales ? `c(${e.rscales.map(rZahl).join(', ')})` : 'NULL';
  return { spalten, namen, typ: e.typ, anzahl: namen.length, rTeil: `list(anfang = ${rQ(REP_ANFANG_R)}, typ = ${rWahl(e.typ, REP_TYPEN)}, fay = ${rTeilFay}, scale = ${rTeilScale}, rscales = ${rTeilRscales})` };
}
export const istRepPlan = (x: RepPlan | { problem: RepProblem }): x is RepPlan => !('problem' in x);

/* ------------------------------------------------------------------------------------------------------------------------------- Hochrechnung */
export interface TotalPlan {
  spalten: RSpalte[]; /** Zeilen mit Gewicht über 0 (so viele gehen an R) */ zeilen: number; zellen: 0; aufruf: string;
  art: 'kategorien' | 'summe'; spalte: string;
  /** Kategorien in der Reihenfolge der Codes 1, 2, … (nur bei 'kategorien') */ werte: (string | number)[]; /** die Codes, für die R rechnet (höchstens 30) */ codes: number[]; abgeschnitten: boolean;
  rep?: RepPlan;
}
export type TotalEingabe = { art: 'kategorien'; spalte: string; /** Reihenfolge der Kategorien; ohne Angabe die vorkommenden Werte, sortiert */ werte?: (string | number)[] } | { art: 'summe'; spalte: string };
export interface TotalOptionen { /** Teilpopulation: je Zeile von `q` wahr oder falsch (Spalte e in R) */ auswahl?: boolean[]; rep?: RepPlan; /** Stichprobenplan der Person (lib/umfrageentwurf.ts), ohne Wirkung mit Replikationsgewichten */ entwurf?: Entwurf }
const sortiere = (v: (string | number)[]) => [...v].sort((a, b) => (typeof a === 'number' && typeof b === 'number' ? a - b : String(a).localeCompare(String(b), 'de')));

/** Hochrechnung (svytotal): Anzahl je Kategorie einer Spalte oder Summe einer Zahlenspalte. */
export function planTotal(q: Quelle, e: TotalEingabe, o: TotalOptionen = {}): TotalPlan {
  const idx = zeilenMitGewicht(q.w), v = werteVon(q, e.spalte);
  const spalten: RSpalte[] = [{ name: 'w', art: 'zahl', werte: idx.map(i => q.w[i]!) }];
  let werte: (string | number)[] = [], codes: number[] = [], abgeschnitten = false, rY = 'm1';
  if (e.art === 'summe') spalten.push({ name: 'm1', art: 'zahl', werte: idx.map(i => zahlOderNull(v[i])) });
  else {
    rY = 'a1'; werte = e.werte ?? sortiere([...new Set(idx.flatMap(i => (v[i] === null || v[i] === undefined ? [] : [v[i]!])))]);
    const code = new Map(werte.map((x, i) => [x, i + 1] as const));
    spalten.push({ name: 'a1', art: 'zahl', werte: idx.map(i => { const x = v[i]; return x === null || x === undefined ? null : code.get(x) ?? null; }) });
    const n = new Map<number, number>(); for (const i of idx) { const c = v[i] === null || v[i] === undefined ? undefined : code.get(v[i]!); if (c) n.set(c, (n.get(c) ?? 0) + 1); }
    codes = [...n].sort((a, b) => b[1] - a[1] || a[0] - b[0]).slice(0, GENAUIGKEIT_MAX_KATEGORIEN).map(x => x[0]).sort((a, b) => a - b); abgeschnitten = n.size > GENAUIGKEIT_MAX_KATEGORIEN;
  }
  if (o.auswahl) spalten.push({ name: 'e', art: 'zahl', werte: idx.map(i => (o.auswahl![i] ? 1 : 0)) });
  if (o.rep) spalten.push(...o.rep.spalten);
  const ent = o.rep ? null : entwurfPlan(q, o.entwurf, idx);
  if (ent) spalten.push(...ent.spalten);
  const rTeilAuswahl = o.auswahl ? rQ('e') : 'NULL';
  const rTeilArt = rWahl(e.art, ['kategorien', 'summe'] as const);
  const rTeilCodes = e.art === 'kategorien' ? `c(${codes.map(rZahl).join(', ')})` : 'NULL';
  const rTeilRep = (o.rep ? `, ${o.rep.rTeil}` : '') + entwurfRTeil(ent);
  return { spalten, zeilen: idx.length, zellen: 0, art: e.art, spalte: e.spalte, werte, codes, abgeschnitten, rep: o.rep,
    aufruf: `sp_umfrage_total(d, ${rQ(rY)}, ${rQ('w')}, ${rTeilAuswahl}, ${rTeilArt}, ${rTeilCodes}${rTeilRep})` };
}
/** Die Antwort von R, gelesen. Ein Fehler von R selbst (Text) kommt als `{ fehler }`; ein Fehler der Rechnung (Code) steht im Ergebnis (`fehlerCode`). */
export function totalLesen(_plan: TotalPlan, antwort: unknown): { ok: UmfrageErgebnis } | { fehler: string } {
  const e = umfrageLesen('total', antwort);
  return e.fehler ? { fehler: String(e.fehler) } : { ok: e };
}

/* ------------------------------------------------------------------------------------------------------------------------------- Werte für die Veröffentlichung */
/** Ein Wert mit allem, was die Kennzeichnung braucht. `n`: ungewichtete Fälle, die zu DIESEM Wert beitragen (Zelle, Kategorie); `nBasis`: ungewichtete Fälle der Frage. */
export interface GenauigkeitsWert {
  schluessel: string; schaetzer: number | null; se: number | null; cv: number | null; kiU: number | null; kiO: number | null; n: number | null; nBasis: number | null;
  /** Anteil 0 oder 1, kein Intervall */ grenze?: boolean; /** M2 (Geheimhaltung) hat die Zelle gesperrt */ geheim?: boolean;
}
const zahl = (x: unknown): number | null => (typeof x === 'number' && Number.isFinite(x) ? x : null);
const wertZeile = (schluessel: string, o: UmfrageErgebnis | undefined, schaetzerFeld: string, n: number | null, nBasis: number | null): GenauigkeitsWert =>
  ({ schluessel, schaetzer: zahl(o?.[schaetzerFeld]), se: zahl(o?.se), cv: zahl(o?.cv), kiU: zahl(o?.kiU), kiO: zahl(o?.kiO), n, nBasis, grenze: o?.grenze === true });
/** Werte der Hochrechnung: Schlüssel `k:<Code>` je Kategorie und `gesamt`, bzw. `summe`. */
export function werteAusTotal(e: UmfrageErgebnis): GenauigkeitsWert[] {
  if (!e || e.fehlerCode) return [];
  const nb = zahl(e.n);
  if (e.art === 'summe') return e.summe ? [wertZeile('summe', e.summe, 'total', zahl(e.summe.nUngew), nb)] : [];
  const k = ((e.kategorien ?? []) as UmfrageErgebnis[]).map(x => wertZeile(`k:${x.wert}`, x, 'total', zahl(x.nUngew), nb));
  return e.gesamt ? [...k, wertZeile('gesamt', e.gesamt, 'total', zahl(e.gesamt.nUngew), nb)] : k;
}
/** Werte des Mittelwerts: Schlüssel = Name der Spalte in R (m1, m2 …). */
export function werteAusMittel(e: UmfrageErgebnis): GenauigkeitsWert[] {
  return ((e?.ergebnisse ?? []) as UmfrageErgebnis[]).filter(r => !r.fehlerCode).map(r => wertZeile(String(r.name), r, 'mittel', zahl(r.nUngew ?? r.n), zahl(r.n)));
}
/** Werte des Anteils: Schlüssel `k:<Code>`; `n` = Treffer der Kategorie, `nBasis` = alle Fälle der Frage; `ki`: Intervall, das gezeigt wird. */
export function werteAusAnteil(e: UmfrageErgebnis, ki: 'logit' | 'beta' = 'logit'): GenauigkeitsWert[] {
  if (!e || e.fehlerCode) return [];
  return ((e.kategorien ?? []) as UmfrageErgebnis[]).map(k => {
    const w = wertZeile(`k:${k.wert}`, k, 'p', zahl(k.treffer), zahl(e.nUngew ?? e.n));
    const i = k[ki] as { u?: number; o?: number } | null | undefined; w.kiU = zahl(i?.u); w.kiO = zahl(i?.o); return w;
  });
}
/** Werte der Kreuztabelle (Zellanteile, gewichtet, an der Gesamtheit): Schlüssel `z:<Zeile>:<Spalte>` mit 1, 2, … Ohne SE (sehr große Tabelle) bleiben SE und CV leer. */
export function werteAusKreuz(e: UmfrageErgebnis): GenauigkeitsWert[] {
  if (!e || e.fehlerCode || !Array.isArray(e.anteile)) return [];
  const Z = Number(e.zellen?.zeilen ?? 0), arr = (x: unknown) => (Array.isArray(x) ? (x as unknown[]) : []);
  const p = arr(e.anteile), se = arr(e.seZellen), cv = arr(e.cvZellen), n = arr(e.faelleZellen);
  return p.map((v, i) => ({
    schluessel: `z:${(i % Z) + 1}:${Math.floor(i / Z) + 1}`, schaetzer: zahl(v), se: zahl(se[i]), cv: zahl(cv[i]), kiU: null, kiO: null, n: zahl(n[i]), nBasis: zahl(e.nUngew ?? e.n)
  }));
}

/* ------------------------------------------------------------------------------------------------------------------------------- Kennzeichnung */
/** Grenzen der Kennzeichnung (Fachblatt M4): ungewichtetes n unter `nMinX` → „x“ (nicht ausweisen); n unter `nMinKlammer` oder CV über `cvKlammer` → „( )“ (geringe Zuverlässigkeit). */
export interface Grenzen { nMinX: number; nMinKlammer: number; cvKlammer: number }
/** Die Standardwerte sind ein BEISPIEL (Fachblatt); welche Grenzen gelten, legt die Organisation fest. */
export const STANDARD_GRENZEN: Readonly<Grenzen> = Object.freeze({ nMinX: 10, nMinKlammer: 30, cvKlammer: 0.2 });
export type Kennzeichen = '' | 'x' | 'klammer' | '-' | '.';
export type GrenzenProblem = 'n-min-x' | 'n-min-klammer' | 'cv-klammer' | 'reihenfolge';
/** Grenzen aus Eingaben: fehlende Felder bekommen den Standard; Probleme (keine Zahl, negativ, nMinX über nMinKlammer) werden mitgeliefert, die Grenzen selbst dann nicht verändert. */
export function grenzenPruefen(e: Partial<Grenzen> | null | undefined): { grenzen: Grenzen; probleme: GrenzenProblem[] } {
  const g: Grenzen = { ...STANDARD_GRENZEN, ...(e ?? {}) }, probleme: GrenzenProblem[] = [];
  const ok = (x: unknown, ganz: boolean) => typeof x === 'number' && Number.isFinite(x) && x >= 0 && (!ganz || Number.isInteger(x));
  if (!ok(g.nMinX, true)) probleme.push('n-min-x');
  if (!ok(g.nMinKlammer, true)) probleme.push('n-min-klammer');
  if (!ok(g.cvKlammer, false)) probleme.push('cv-klammer');
  if (!probleme.length && g.nMinX > g.nMinKlammer) probleme.push('reihenfolge');
  return { grenzen: g, probleme };
}
export const sindStandardGrenzen = (g: Grenzen) => g.nMinX === STANDARD_GRENZEN.nMinX && g.nMinKlammer === STANDARD_GRENZEN.nMinKlammer && g.cvKlammer === STANDARD_GRENZEN.cvKlammer;
/** Reihenfolge der Regeln: gesperrt (M2) → „x“; kein Wert → „.“; kein Fall → „-“; n < nMinX → „x“; CV > cvKlammer oder n < nMinKlammer → „( )“; sonst nichts. Ein CV, der nicht berechenbar ist (Schätzwert 0), zählt nicht. */
export function kennzeichne(w: Pick<GenauigkeitsWert, 'schaetzer' | 'cv' | 'n'> & { geheim?: boolean }, g: Grenzen = STANDARD_GRENZEN): Kennzeichen {
  if (w.geheim) return 'x';
  if (w.schaetzer === null || w.schaetzer === undefined || !Number.isFinite(w.schaetzer) || w.n === null || w.n === undefined || !Number.isFinite(w.n)) return '.';
  if (w.n <= 0) return '-';
  if (w.n < g.nMinX) return 'x';
  if (w.n < g.nMinKlammer || (typeof w.cv === 'number' && Number.isFinite(w.cv) && w.cv > g.cvKlammer)) return 'klammer';
  return '';
}
/** Das, was in die Zelle kommt: „x“, „-“, „.“ ohne Zahl; „(12,3)“ in Klammern; sonst die Zahl. `text`: die schon formatierte Zahl. */
export const zeigeMitKennzeichen = (text: string, k: Kennzeichen): string => (k === '' ? text : k === 'klammer' ? `(${text})` : k);
/** Die Zeichenerklärung (Fachblatt M5): nur die Zeichen, die in der Tabelle vorkommen, wenn `vorkommen` gegeben ist; sonst alle vier. Reihenfolge: - x ( ) . */
export function zeichenErklaerung(g: Grenzen = STANDARD_GRENZEN, vorkommen?: Kennzeichen[]): { zeichen: string; text: string }[] {
  const alle: { k: Kennzeichen; zeichen: string; text: string }[] = [
    { k: '-', zeichen: '-', text: L('nichts vorhanden', 'nothing to report') },
    { k: 'x', zeichen: 'x', text: L(`nicht ausgewiesen (weniger als ${g.nMinX} Fälle oder gesperrt)`, `not shown (fewer than ${g.nMinX} cases or suppressed)`) },
    { k: 'klammer', zeichen: '( )', text: L(`geringe Zuverlässigkeit (weniger als ${g.nMinKlammer} Fälle oder Variationskoeffizient über ${komma(g.cvKlammer * 100, 0)} %)`, `low reliability (fewer than ${g.nMinKlammer} cases or coefficient of variation above ${komma(g.cvKlammer * 100, 0)} %)`) },
    { k: '.', zeichen: '.', text: L('nicht verfügbar', 'not available') }
  ];
  return alle.filter(a => !vorkommen || vorkommen.includes(a.k)).map(({ zeichen, text }) => ({ zeichen, text }));
}
/** Der Satz zu den Grenzen: nennt sie und sagt, ob es das Beispiel ist (die Oberfläche zeigt ihn neben den Einstellungen). */
export function grenzenSatz(g: Grenzen = STANDARD_GRENZEN): string {
  const werte = L(`Nicht ausgewiesen unter ${g.nMinX} Fällen. In Klammern unter ${g.nMinKlammer} Fällen oder bei einem Variationskoeffizienten über ${komma(g.cvKlammer, 2)}.`,
    `Not shown below ${g.nMinX} cases. In brackets below ${g.nMinKlammer} cases or with a coefficient of variation above ${komma(g.cvKlammer, 2)}.`);
  return sindStandardGrenzen(g)
    ? `${werte} ${L('Das sind Beispielgrenzen. Welche Grenzen gelten, legt die Organisation fest.', 'These are example limits. The organisation decides which limits apply.')}`
    : `${werte} ${L('Das sind eigene Grenzen.', 'These are custom limits.')}`;
}

/* ------------------------------------------------------------------------------------------------------------------------------- Kalibrieren */
export interface KalMerkmal {
  /** Spalte der Datei */ spalte: string; /** die Stufen in der Reihenfolge der Sollsummen */ werte: (string | number)[]; /** Sollsumme je Stufe (Zahlen der Grundgesamtheit, keine Anteile) */ summen: number[];
}
export interface KalEingabe {
  merkmale: KalMerkmal[]; /** Gesamtzahl; ohne Angabe die Summe der Sollsummen des ersten Merkmals */ gesamt?: number | null;
  /** Grenzen für den Faktor neues / altes Gewicht (unten < 1 < oben); ohne Angabe keine Grenzen */ grenzen?: [number, number] | null;
}
/** 1 bis 3 Merkmale (mehr trägt die Rechnung nicht), je Merkmal höchstens 100 Stufen. */
export const KAL_MAX_MERKMALE = 3, KAL_MAX_STUFEN = 100;
export type KalProblem = 'merkmale' | 'rand-ungueltig' | 'raender-summen' | 'bounds-ungueltig' | 'zu-viele-zeilen';
export interface KalPlan {
  spalten: RSpalte[]; zeilen: number; zellen: 0; aufruf: string; merkmale: KalMerkmal[]; gesamt: number;
  /** Zeilen von `q`, die an R gehen (Gewicht über 0), in der Reihenfolge der Zeilen von R */ zeilenIndex: number[]; zeilenGesamt: number; grenzen: [number, number] | null;
}
/** Vorprüfung ohne R (dieselben Regeln wie in R). Liefert den ersten Fehler als `{ problem, merkmal? }`, sonst `null`. `zeilen`: Zeilen der Daten. */
export function kalibrierenPruefen(e: KalEingabe, zeilen: number): { problem: KalProblem; merkmal?: number; summe?: number; gesamt?: number } | null {
  if (umfrageGrenze(zeilen)) return { problem: 'zu-viele-zeilen' };
  if (e.merkmale.length < 1 || e.merkmale.length > KAL_MAX_MERKMALE) return { problem: 'merkmale' };
  const gut = (x: number) => typeof x === 'number' && Number.isFinite(x) && x >= 0;
  for (const [j, m] of e.merkmale.entries()) {
    if (m.summen.length < 2 || m.summen.length > KAL_MAX_STUFEN || m.summen.length !== m.werte.length || !m.summen.every(gut)) return { problem: 'rand-ungueltig', merkmal: j + 1 };
  }
  const N = e.gesamt ?? e.merkmale[0]!.summen.reduce((a, b) => a + b, 0);
  if (!(typeof N === 'number' && Number.isFinite(N) && N > 0)) return { problem: 'rand-ungueltig', merkmal: 0 };
  for (const [j, m] of e.merkmale.entries()) {
    const summe = m.summen.reduce((a, b) => a + b, 0);
    // Testrunde 24.10.: Summe und Gesamtzahl mitgeben, sonst nennt der Satz zweimal 0.
    if (Math.abs(summe - N) > 1e-6 * N) return { problem: 'raender-summen', merkmal: j + 1, summe, gesamt: N };
  }
  if (e.grenzen && !(e.grenzen.every(Number.isFinite) && e.grenzen[0] >= 0 && e.grenzen[0] < 1 && e.grenzen[1] > 1)) return { problem: 'bounds-ungueltig' };
  return null;
}
/** Auftrag „Kalibrieren“: Codes der Stufen 1, 2, … in k1 ... k3, Gewicht w. Gibt das Problem zurück, wenn schon hier klar ist, dass R es ablehnen würde. */
export function planKalibrieren(q: Quelle, e: KalEingabe): KalPlan | { problem: KalProblem; merkmal?: number; summe?: number; gesamt?: number } {
  const p = kalibrierenPruefen(e, q.zeilen.length); if (p) return p;
  const idx = zeilenMitGewicht(q.w), spalten: RSpalte[] = [{ name: 'w', art: 'zahl', werte: idx.map(i => q.w[i]!) }];
  e.merkmale.forEach((m, j) => {
    const v = werteVon(q, m.spalte), code = new Map(m.werte.map((x, i) => [x, i + 1] as const));
    spalten.push({ name: `k${j + 1}`, art: 'zahl', werte: idx.map(i => { const x = v[i]; return x === null || x === undefined ? null : code.get(x) ?? null; }) });
  });
  const N = e.gesamt ?? e.merkmale[0]!.summen.reduce((a, b) => a + b, 0);
  const rTeilRaender = e.merkmale.map(m => `c(${m.summen.map(rZahl).join(', ')})`).join(', ');
  const rTeilPop = `list(${rTeilRaender})`;
  const rTeilGesamt = e.gesamt === null || e.gesamt === undefined ? 'NULL' : rZahl(e.gesamt);
  const rTeilBounds = e.grenzen ? `c(${rZahl(e.grenzen[0])}, ${rZahl(e.grenzen[1])})` : 'NULL';
  return { spalten, zeilen: idx.length, zellen: 0, merkmale: e.merkmale, gesamt: N, zeilenIndex: idx, zeilenGesamt: q.zeilen.length, grenzen: e.grenzen ?? null,
    aufruf: `sp_umfrage_kalibrieren(d, ${rQ('w')}, ${rIds(e.merkmale.map((_, j) => `k${j + 1}`))}, ${rTeilPop}, ${rTeilGesamt}, ${rTeilBounds})` };
}
/** R-Pakete für den Assistenten „Kalibrieren“: survey, und MASS für das Kalibrieren mit Grenzen (survey::calibrate ruft es dann auf; fehlt es, meldet R `paket-fehlt`). */
export const R_PAKETE_KALIBRIEREN = ['survey', 'MASS'];
export type KalHinweis = 'negative-gewichte' | 'begrenzt-kalibrieren';
export interface KalErgebnisOk {
  ok: true; /** neues Gewicht je Zeile der Daten; `null` = die Zeile bekam keins (kein Gewicht, ungültiger Code) */ gewichte: (number | null)[];
  nGewichtet: number; /** Zeilen ohne neues Gewicht, 1-basiert wie in R */ ohneGewicht: number[]; summe: number; negativ: number; kleinstes: number; groesstes: number;
  /** Faktor neues / altes Gewicht, kleinster und größter */ gMin: number; gMax: number; kishNeff: number; kishNeffVorher: number; designeffekt: number; designeffektVorher: number;
  maxAbweichung: number; grenzen: [number, number] | null; hinweise: KalHinweis[]; warnungen: string[];
}
export interface KalFehler { ok: false; code: string; e: UmfrageErgebnis }
/** Die Antwort von `sp_umfrage_kalibrieren`. Ein Fehler von R selbst (Text) kommt als `{ fehler }`; ein Fehler der Rechnung als `{ ok: false, code }`. Die Gewichte stehen in der Länge der Daten. */
export function kalibrierenLesen(plan: KalPlan, antwort: unknown): KalErgebnisOk | KalFehler | { fehler: string } {
  const e = umfrageLesen('kalibrieren', antwort);
  if (e.fehler) return { fehler: String(e.fehler) };
  if (e.fehlerCode) return { ok: false, code: String(e.fehlerCode), e };
  const arr = (x: unknown) => (Array.isArray(x) ? x : x === null || x === undefined ? [] : [x]);
  const roh = arr(e.gewichte), gewichte: (number | null)[] = new Array(plan.zeilenGesamt).fill(null);
  plan.zeilenIndex.forEach((zeile, k) => { const g = roh[k]; gewichte[zeile] = typeof g === 'number' && Number.isFinite(g) ? g : null; });
  const ohne = [...arr(e.ohneGewicht).map(Number)];   // Zeilen von R (1-basiert) → Zeilen der Daten (1-basiert); Zeilen, die nie an R gingen, kommen dazu
  const anR = new Set(plan.zeilenIndex), ohneDaten = ohne.map(i => (plan.zeilenIndex[i - 1] ?? -1) + 1).filter(i => i > 0);
  for (let i = 0; i < plan.zeilenGesamt; i++) if (!anR.has(i)) ohneDaten.push(i + 1);
  const g = arr(e.grenzen);
  return {
    ok: true, gewichte, nGewichtet: Number(e.n), ohneGewicht: ohneDaten.sort((a, b) => a - b), summe: Number(e.summe), negativ: Number(e.negativ), kleinstes: Number(e.wMin), groesstes: Number(e.wMax),
    gMin: Number(e.gMin), gMax: Number(e.gMax), kishNeff: Number(e.kishNeff), kishNeffVorher: Number(e.kishNeffVorher), designeffekt: Number(e.deffW), designeffektVorher: Number(e.deffWVorher),
    maxAbweichung: Number(e.maxAbweichung), grenzen: g.length === 2 ? [Number(g[0]), Number(g[1])] : null, hinweise: arr(e.hinweise).map(String) as KalHinweis[], warnungen: arr(e.warnungen).map(String)
  };
}

/* ------------------------------------------------------------------------------------------------------------------------------- Sätze */
export type GenauigkeitFehlerCode = RepProblem | 'paket-fehlt' | 'rep-ungueltig' | 'art-unbekannt' | KalProblem | 'kategorie-ohne-stichprobe' | 'nicht-erreicht' | 'kalibrieren-unmoeglich';
/** Namen für die Sätze zum Kalibrieren (sonst „Merkmal 2“): die Spalten der Eingabe. */
export interface KalNamen { merkmale?: string[]; werte?: (string | number)[][] }
/** Ein Fehler (`fehlerCode` aus R oder ein Problem aus der Vorprüfung) als Satz. Fremde Codes gehen an `umfrageFehlerSatz`. */
export function genauigkeitFehlerSatz(e: { fehlerCode?: string; [k: string]: unknown }, namen: KalNamen = {}): string {
  const z = (v: unknown) => komma(Number(v ?? 0), 0), m = Number(e.merkmal ?? 0), mn = m > 0 ? namen.merkmale?.[m - 1] ?? L(`Merkmal ${m}`, `variable ${m}`) : '';
  switch (e.fehlerCode as GenauigkeitFehlerCode) {
    case 'rep-typ': return L('Die Art der Replikationsgewichte ist unbekannt. Zur Wahl stehen Bootstrap, JK1, BRR und Fay.', 'The type of replicate weights is unknown. The choices are bootstrap, JK1, BRR and Fay.');
    case 'rep-fehlt': return L(`Es gibt zu wenige Spalten mit Replikationsgewichten (gefunden: ${z(e.n ?? e.spalten)}, nötig: mindestens 2). Der gemeinsame Anfang der Namen passt vielleicht nicht.`, `There are too few columns with replicate weights (found: ${z(e.n ?? e.spalten)}, at least 2 needed). The common start of the names may not match.`);
    case 'rep-zu-gross': return L(`Zu viele Replikationsgewichte für die Rechnung im Browser (${z(e.n)} Spalten, ${z(e.zeilen)} Zeilen).`, `Too many replicate weights for the calculation in the browser (${z(e.n)} columns, ${z(e.zeilen)} rows).`);
    case 'rep-ungueltig': return L('Die Replikationsgewichte haben fehlende oder negative Werte. Jeder Wert muss eine Zahl ab 0 sein.', 'The replicate weights have missing or negative values. Every value must be a number from 0.');
    case 'rep-fay': return L('Für die Art Fay braucht es den Wert rho: eine Zahl von 0 bis unter 1.', 'The Fay type needs the value rho: a number from 0 to below 1.');
    case 'rep-scale': return L('Der Faktor scale oder rscales ist ungültig. Er muss größer als 0 sein, rscales mit einem Wert je Spalte.', 'The factor scale or rscales is invalid. It must be above 0, rscales with one value per column.');
    case 'art-unbekannt': return L('Die Art der Hochrechnung ist unbekannt.', 'The kind of estimate is unknown.');
    case 'merkmale': return L(`Zum Kalibrieren braucht es 1 bis ${KAL_MAX_MERKMALE} Merkmale, jedes mit mindestens 2 besetzten Stufen.`, `Calibration needs 1 to ${KAL_MAX_MERKMALE} variables, each with at least 2 occupied levels.`);
    case 'rand-ungueltig': return m > 0
      ? L(`Die Sollsummen von ${mn} sind ungültig. Es braucht mindestens 2 Stufen mit Zahlen ab 0.`, `The target totals of ${mn} are invalid. At least 2 levels with numbers from 0 are needed.`)
      : L('Die Gesamtzahl ist ungültig. Sie muss größer als 0 sein.', 'The total is invalid. It must be above 0.');
    case 'raender-summen': return L(`Die Sollsummen von ${mn} ergeben ${komma(Number(e.summe ?? 0), 0)}, die Gesamtzahl ist ${komma(Number(e.gesamt ?? 0), 0)}. Alle Sollsummen müssen dieselbe Summe haben.`,
      `The target totals of ${mn} add up to ${komma(Number(e.summe ?? 0), 0)}, the total is ${komma(Number(e.gesamt ?? 0), 0)}. All target totals must have the same sum.`);
    case 'kategorie-ohne-stichprobe': { const k = Number(e.kategorie ?? 0), stufe = namen.werte?.[m - 1]?.[k - 1] ?? k;
      return L(`${mn}, Stufe ${stufe}: Die Sollsumme ist größer als 0, aber kein Fall mit Gewicht gehört dazu. So lässt sich nicht kalibrieren.`, `${mn}, level ${stufe}: the target total is above 0, but no case with a weight belongs to it. Calibration is not possible this way.`); }
    case 'bounds-ungueltig': return L('Die Grenzen sind ungültig. Die untere muss zwischen 0 und 1 liegen, die obere über 1.', 'The limits are invalid. The lower one must be between 0 and 1, the upper one above 1.');
    case 'nicht-erreicht': return L(`Die Sollsummen werden nicht erreicht (größte Abweichung ${komma(Number(e.maxAbweichung ?? 0) * 100, 4)} % der Gesamtzahl). Es werden keine Gewichte übernommen.`,
      `The target totals are not reached (largest deviation ${komma(Number(e.maxAbweichung ?? 0) * 100, 4)} % of the total). No weights are applied.`);
    case 'paket-fehlt': return L(`Das R-Paket ${String(e.paket ?? '')} fehlt. Das Kalibrieren mit Grenzen braucht es.`, `The R package ${String(e.paket ?? '')} is missing. Calibration with limits needs it.`);
    case 'kalibrieren-unmoeglich': return L('Mit diesen Daten und Grenzen lässt sich nicht kalibrieren. Weitere Grenzen oder andere Sollsummen können helfen.', 'Calibration is not possible with these data and limits. Wider limits or other target totals may help.');
    default: return umfrageFehlerSatz(e);
  }
}
/** Hinweise zum Kalibrieren als Sätze. */
export function kalibrierenHinweisSatz(code: KalHinweis, e: { negativ?: number } = {}): string {
  return code === 'negative-gewichte'
    ? L(`Nach dem Kalibrieren sind ${komma(e.negativ ?? 0, 0)} Gewichte negativ. Negative Gewichte sind für Auswertungen nicht brauchbar.`, `After calibration, ${komma(e.negativ ?? 0, 0)} weights are negative. Negative weights are not usable for analysis.`)
    : L('Vorschlag: begrenzt kalibrieren, zum Beispiel mit dem Faktor 0,5 bis 3.', 'Suggestion: calibrate with limits, for example with a factor of 0.5 to 3.');
}
