/**
 * Zufall zuteilen (Später, Welle S-F, L6): einfache Zufallsstichprobe aus einer Liste, Zuteilungsliste mit Blöcken und Schichten, vollständige Zuteilung mit festen Gruppengrößen.
 * Fachblatt docs/fachblaetter/SPAETER-F-UEBERLEBEN-MEDIZIN.md, Abschnitt 5 und „Entscheidungen Opus (18.10.)“ 6. Reine Funktionen in JS (kein R, kein PSPP, keine Spaltennamen).
 *
 * LEHRMITTEL, keine echte Studienrandomisierung: Der Startwert ist sichtbar, wer ihn und das Verfahren kennt, kann die ganze Liste im Voraus berechnen (keine Verdeckung der Zuteilung).
 * Jede exportierte Datei beginnt darum mit der Kopfzeile „Lehrmittel - nicht für echte Studien (keine Verdeckung)“.
 *
 * Erzeuger: mulberry32 (lib/zufall.ts) mit gemischten Teilströmen `strom(startwert, nummer)` (lib/lernlabor.ts). Ohne Schichten Strom 0, mit Schichten die Position der Schicht (ab 1): jede Schicht hat
 * ihren eigenen Strom, die Liste einer Schicht ändert sich nicht, wenn eine andere größer wird. Ändert sich der Erzeuger, ändern sich alle Listen.
 */
import { strom } from './lernlabor';
import { zuteilungLehrmittelSatz, zuteilungGerechnet } from './zuteilungsaetze';
import { dezimal } from '../i18n/profil';
import { L } from './sitzung.svelte';

/** Voreinstellung des Startwerts (wie überall in Statable). */
export const STARTWERT_ZUTEILUNG = 20261008;
export const ZUTEILUNG_MAX_N = 100000;
export const STICHPROBE_MAX_N = 1000000;
export const MAX_ZEILENLAENGE = 200;
export const MAX_SCHICHTEN = 8;
export const MIN_GRUPPEN = 2;
export const MAX_GRUPPEN = 6;

const gueltigerStartwert = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= 4294967295;
const ganzAb = (v: unknown, min: number, max: number): v is number => typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max;

/* ------------------------------------------------------------------ einfache Zufallsstichprobe */
export type StichprobeErgebnis = { ok: true; gezogen: number[]; sortiert: number[] } | { ok: false; code: 'n' | 'k' | 'startwert' };

/** k aus n (1 … n) ohne Zurücklegen, Fisher-Yates vorwärts: für i = 1 bis k: j = i + ⌊u · (n − i + 1)⌋, tausche a[i] und a[j]. Ergebnis in Ziehungsreihenfolge und sortiert. Nur die getauschten Plätze werden gespeichert,
 *  eine Million Zeilen kosten darum nichts. */
export function stichprobeZiehen(n: number, k: number, startwert: number, nr = 0): StichprobeErgebnis {
  if (!ganzAb(n, 1, STICHPROBE_MAX_N)) return { ok: false, code: 'n' };
  if (!ganzAb(k, 1, n)) return { ok: false, code: 'k' };
  if (!gueltigerStartwert(startwert)) return { ok: false, code: 'startwert' };
  const u = strom(startwert, nr), a = new Map<number, number>(), wert = (i: number) => a.get(i) ?? i, gezogen: number[] = [];
  for (let i = 1; i <= k; i++) {
    const j = i + Math.floor(u() * (n - i + 1)), vi = wert(i), vj = wert(j);
    a.set(i, vj); a.set(j, vi);
    gezogen.push(vj);
  }
  return { ok: true, gezogen, sortiert: [...gezogen].sort((p, q) => p - q) };
}

/* ------------------------------------------------------------------ Mischen, Blöcke */
/** Fisher-Yates absteigend: für i = m bis 2: j = 1 + ⌊u · i⌋ (1-basiert); tausche v[i] und v[j]. */
function mischen<T>(v: T[], u: () => number): T[] {
  for (let i = v.length; i >= 2; i--) {
    const j = Math.floor(u() * i);
    const t = v[i - 1]!; v[i - 1] = v[j]!; v[j] = t;
  }
  return v;
}

export interface ZuteilungEingabe {
  /** Zahl der Plätze (ohne Schichten) */ n?: number;
  schichten?: { name: string; n: number }[];
  gruppen: string[];
  /** Verhältnis der Gruppen (ganze Zahlen ≥ 1), gleich lang wie gruppen */ verhaeltnis: number[];
  /** erlaubte Blockgrößen (jede ein Vielfaches der Summe des Verhältnisses) */ blockgroessen: number[];
  startwert: number;
  /** der letzte Block bleibt ganz (die Liste wird länger als n) */ aufrunden?: boolean;
  /** nur für den verdeckten Modus: eigener Zufallsstrom je Schicht (Nummer wie bei `strom`), statt des Erzeugers aus dem Startwert */ erzeuger?: (nummer: number) => () => number;
}
export interface ZuteilungZeile { nr: number; schicht: string | null; gruppe: string; block: number }
export interface ZuteilungErgebnis {
  ok: true;
  liste: ZuteilungZeile[];
  bloecke: { schicht: string | null; groessen: number[] }[];
  kontrolle: { schicht: string | null; jeGruppe: number[]; bloecke: number; maxAbweichung: number }[];
  /** die Eingabe, wie sie gerechnet wurde (für Kopfzeilen des Exports) */
  eingabe: { gruppen: string[]; verhaeltnis: number[]; blockgroessen: number[]; startwert: number; aufrunden: boolean; schichten: boolean };
}
export interface ZuteilungFehler { ok: false; code: 'n' | 'gruppen' | 'verhaeltnis' | 'blockgroesse' | 'schichten' | 'startwert' }

const gruppenOk = (g: unknown): g is string[] => Array.isArray(g) && g.length >= MIN_GRUPPEN && g.length <= MAX_GRUPPEN && g.every(x => typeof x === 'string' && x.trim() !== '') && new Set(g).size === g.length;

/** Blockrandomisierung (mit Schichten: je Schicht eine eigene Liste mit eigenem Strom). */
export function zuteilen(e: ZuteilungEingabe): ZuteilungErgebnis | ZuteilungFehler {
  const mitSchichten = e.schichten !== undefined;
  if (mitSchichten) {
    const sch = e.schichten!;
    if (!Array.isArray(sch) || sch.length < 1 || sch.length > MAX_SCHICHTEN) return { ok: false, code: 'schichten' };
    if (sch.some(x => !x || typeof x.name !== 'string' || x.name.trim() === '' || !ganzAb(x.n, 1, ZUTEILUNG_MAX_N)) || new Set(sch.map(x => x.name)).size !== sch.length) return { ok: false, code: 'schichten' };
  } else if (!ganzAb(e.n, 1, ZUTEILUNG_MAX_N)) return { ok: false, code: 'n' };
  if (!gruppenOk(e.gruppen)) return { ok: false, code: 'gruppen' };
  if (!Array.isArray(e.verhaeltnis) || e.verhaeltnis.length !== e.gruppen.length || e.verhaeltnis.some(v => !ganzAb(v, 1, 1000))) return { ok: false, code: 'verhaeltnis' };
  const summe = e.verhaeltnis.reduce((a, b) => a + b, 0);
  if (!Array.isArray(e.blockgroessen) || e.blockgroessen.length < 1 || e.blockgroessen.some(g => !ganzAb(g, 1, 1000000) || g % summe !== 0)) return { ok: false, code: 'blockgroesse' };
  if (!gueltigerStartwert(e.startwert)) return { ok: false, code: 'startwert' };

  const aufrunden = e.aufrunden === true, gruppen = e.gruppen, G = gruppen.length;
  const liste: ZuteilungZeile[] = [], bloecke: ZuteilungErgebnis['bloecke'] = [], kontrolle: ZuteilungErgebnis['kontrolle'] = [];
  const teile = mitSchichten ? e.schichten!.map((x, i) => ({ name: x.name as string | null, n: x.n, nummer: i + 1 })) : [{ name: null as string | null, n: e.n!, nummer: 0 }];
  for (const t of teile) {
    const u = e.erzeuger ? e.erzeuger(t.nummer) : strom(e.startwert, t.nummer), folge: { g: number; block: number }[] = [], groessen: number[] = [];
    while (folge.length < t.n) {
      const groesse = e.blockgroessen[Math.floor(u() * e.blockgroessen.length)]!, block: number[] = [];
      for (let g = 0; g < G; g++) for (let k = (groesse / summe) * e.verhaeltnis[g]!; k > 0; k--) block.push(g);
      mischen(block, u);
      groessen.push(groesse);
      for (const g of block) folge.push({ g, block: groessen.length });
    }
    const gekuerzt = aufrunden ? folge : folge.slice(0, t.n), jeGruppe = new Array<number>(G).fill(0);
    let max = 0;
    gekuerzt.forEach((z, i) => {
      jeGruppe[z.g]!++;
      max = Math.max(max, Math.max(...jeGruppe) - Math.min(...jeGruppe));
      liste.push({ nr: i + 1, schicht: t.name, gruppe: gruppen[z.g]!, block: z.block });
    });
    bloecke.push({ schicht: t.name, groessen });
    kontrolle.push({ schicht: t.name, jeGruppe, bloecke: groessen.length, maxAbweichung: max });
  }
  return { ok: true, liste, bloecke, kontrolle, eingabe: { gruppen: [...gruppen], verhaeltnis: [...e.verhaeltnis], blockgroessen: [...e.blockgroessen], startwert: e.startwert, aufrunden, schichten: mitSchichten } };
}

/** Vollständige Zuteilung mit festen Gruppengrößen: n_g Kennzeichen je Gruppe, gemischt. */
export function vollstaendigZuteilen(e: { groessen: number[]; gruppen: string[]; startwert: number; nr?: number }): { ok: true; liste: { nr: number; gruppe: string }[] } | { ok: false; code: 'groessen' | 'gruppen' | 'startwert' } {
  if (!gruppenOk(e.gruppen) || !Array.isArray(e.groessen) || e.groessen.length !== e.gruppen.length) return { ok: false, code: 'gruppen' };
  if (e.groessen.some(g => !ganzAb(g, 1, ZUTEILUNG_MAX_N)) || e.groessen.reduce((a, b) => a + b, 0) > ZUTEILUNG_MAX_N) return { ok: false, code: 'groessen' };
  if (!gueltigerStartwert(e.startwert)) return { ok: false, code: 'startwert' };
  const v: string[] = [];
  e.gruppen.forEach((g, i) => { for (let k = 0; k < e.groessen[i]!; k++) v.push(g); });
  mischen(v, strom(e.startwert, e.nr ?? 0));
  return { ok: true, liste: v.map((gruppe, i) => ({ nr: i + 1, gruppe })) };
}

/* ------------------------------------------------------------------ eingefügte Liste */
/** Eine Kennung je Zeile (getrimmt). Leere Zeilen werden übersprungen und gezählt; doppelte Kennungen werden NICHT entfernt (sonst bekäme eine Person doppelte Chance), sondern gemeldet. */
export function kennungenLesen(text: string): { kennungen: string[]; leer: number; doppelt: string[] } {
  const kennungen: string[] = [];
  let leer = 0;
  const zeilen = text.split(/\r\n|\n|\r/);
  if (zeilen.length > 0 && zeilen[zeilen.length - 1] === '') zeilen.pop();            // der Zeilenumbruch am Ende ist keine leere Zeile
  for (const z of zeilen) { const t = z.trim(); if (t === '') leer++; else kennungen.push(t); }
  const gesehen = new Set<string>(), doppelt: string[] = [], gemeldet = new Set<string>();
  for (const k of kennungen) { if (gesehen.has(k)) { if (!gemeldet.has(k)) { gemeldet.add(k); doppelt.push(k); } } else gesehen.add(k); }
  return { kennungen, leer, doppelt };
}

export type AuswahlAusListe = { ok: true; gezogen: string[]; sortiert: string[]; leer: number; doppelt: string[]; /** Zahl der Kennungen in der Liste */ n: number } | { ok: false; code: 'liste-leer' | 'k' | 'startwert' | 'zu-viele-zeilen' | 'zeile-zu-lang' };

/** k Kennungen aus einer eingefügten Liste: Auswahl über die Positionen (stichprobeZiehen). `sortiert` ist die Auswahl in der Reihenfolge der Liste. */
export function stichprobeAusListe(text: string, k: number, startwert: number): AuswahlAusListe {
  const { kennungen, leer, doppelt } = kennungenLesen(text);
  if (kennungen.some(x => x.length > MAX_ZEILENLAENGE)) return { ok: false, code: 'zeile-zu-lang' };
  if (kennungen.length > STICHPROBE_MAX_N) return { ok: false, code: 'zu-viele-zeilen' };
  if (kennungen.length === 0) return { ok: false, code: 'liste-leer' };
  const r = stichprobeZiehen(kennungen.length, k, startwert);
  if (!r.ok) return { ok: false, code: r.code === 'startwert' ? 'startwert' : 'k' };
  return { ok: true, gezogen: r.gezogen.map(i => kennungen[i - 1]!), sortiert: r.sortiert.map(i => kennungen[i - 1]!), leer, doppelt, n: kennungen.length };
}

/* ------------------------------------------------------------------ Export */
/** Schützt vor CSV-Injektion: beginnt der Text mit =, +, - oder @ (auch Tabulator oder Wagenrücklauf), steht ein Apostroph davor; Anführungszeichen, Trennzeichen und Zeilenumbrüche werden gesichert. */
export function csvZelle(text: string): string {
  const t = /^[=+\-@\t\r]/.test(text) ? "'" + text : text;
  return /[";,\r\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
}
const csvZeile = (zellen: (string | number)[], trenner: string) => zellen.map(z => csvZelle(String(z))).join(trenner);
const trenner = () => (dezimal() === ',' ? ';' : ',');

/** Die Zuteilungsliste als CSV. Erste Zeile: die Kopfzeile „Lehrmittel …“; danach der Startwert und das Verfahren; dann die Liste. */
export function zuteilungCsv(e: ZuteilungErgebnis, opt: { startwert: number }): string {
  const t = trenner(), zeilen: string[] = [];
  zeilen.push(csvZelle(zuteilungLehrmittelSatz()), csvZeile([L('Startwert', 'Seed'), opt.startwert], t));
  const ein = e.eingabe;
  if (ein) zeilen.push(csvZeile([L('Verfahren', 'Method'), zuteilungGerechnet({ art: 'block', verhaeltnis: ein.verhaeltnis, blockgroessen: ein.blockgroessen, startwert: opt.startwert, strom: 0, schichten: ein.schichten })], t));
  zeilen.push(csvZeile(e.liste.some(z => z.schicht !== null) ? [L('Nr', 'No.'), L('Schicht', 'Stratum'), L('Gruppe', 'Group'), L('Block', 'Block')] : [L('Nr', 'No.'), L('Gruppe', 'Group'), L('Block', 'Block')], t));
  for (const z of e.liste) zeilen.push(csvZeile(z.schicht !== null ? [z.nr, z.schicht, z.gruppe, z.block] : [z.nr, z.gruppe, z.block], t));
  return zeilen.join('\r\n') + '\r\n';
}

/** Die Auswahl als CSV: Kopfzeile „Lehrmittel …“, Startwert, n und k, dann die Kennungen in Ziehungsreihenfolge. */
export function auswahlCsv(a: { gezogen: string[]; n: number; k: number }, opt: { startwert: number }): string {
  const t = trenner(), zeilen: string[] = [];
  zeilen.push(csvZelle(zuteilungLehrmittelSatz()), csvZeile([L('Startwert', 'Seed'), opt.startwert], t), csvZeile([L('Verfahren', 'Method'), zuteilungGerechnet({ art: 'stichprobe', n: a.n, k: a.k, startwert: opt.startwert })], t), csvZeile(['n', a.n], t), csvZeile(['k', a.k], t), csvZeile([L('Ziehung', 'Draw'), L('Kennung', 'ID')], t));
  a.gezogen.forEach((g, i) => zeilen.push(csvZeile([i + 1, g], t)));
  return zeilen.join('\r\n') + '\r\n';
}

/** Die vollständige Zuteilung (feste Gruppengrößen) als CSV: Kopfzeile „Lehrmittel …“, Startwert, Verfahren, dann die Liste. */
export function vollstaendigCsv(a: { liste: { nr: number; gruppe: string }[]; groessen: number[] }, opt: { startwert: number }): string {
  const t = trenner(), zeilen: string[] = [];
  zeilen.push(csvZelle(zuteilungLehrmittelSatz()), csvZeile([L('Startwert', 'Seed'), opt.startwert], t), csvZeile([L('Verfahren', 'Method'), zuteilungGerechnet({ art: 'vollstaendig', groessen: a.groessen, startwert: opt.startwert, strom: 0 })], t), csvZeile([L('Nr', 'No.'), L('Gruppe', 'Group')], t));
  for (const z of a.liste) zeilen.push(csvZeile([z.nr, z.gruppe], t));
  return zeilen.join('\r\n') + '\r\n';
}
