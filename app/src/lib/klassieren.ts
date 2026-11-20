/**
 * Klassieren (Daten-Assistent „Umkodieren“ → „Klassen bilden“ und Baustein „In Gruppen teilen“): eine Zahlenspalte in geordnete Klassen teilen.
 * Reine Funktionen auf `Daten`; sie bilden EINEN Pfad zur RECODE-Syntax (wie umkodierBefehl in datenassistent.ts) und die Vorschau dazu.
 *
 * Arten: gleich breite Klassen (Breite = (größter − kleinster Wert) / k; die Außengrenzen sind genau Minimum und Maximum, anders als R `cut(x, k)`, das sie um 0,1 % verschiebt),
 * Klassen mit etwa gleich vielen Fällen (Quantile Typ 6 wie PSPP/SPSS und die Verteilungskarte - nicht Typ 7) und eigene Grenzen.
 * Grenzwert: Voreinstellung rechts geschlossen („bis b“, der Wert auf der Grenze gehört zur UNTEREN Klasse; die erste Klasse schließt den kleinsten Wert ein);
 * umschaltbar auf links geschlossen („von … bis unter …“; die letzte Klasse schließt den größten Wert ein). Die Regel steht in jeder Beschriftung.
 * Fehlende und benutzerdefiniert fehlende Werte bleiben leer. Grenzvergleich mit Toleranz 1e-12 (0,1 + 0,2 gehört zu „bis 0,3“).
 * Gewichte: Zeilen mit Gewicht 0 zählen nicht; Häufigkeitsgewicht = Quantile wie auf der erweiterten Datei; Umfragegewicht = HAVERAGE mit auf Σw = Zeilen normierten Gewichten.
 * Quellen: Fachblatt docs/fachblaetter/SPAETER-A-GRUNDLAGEN.md Abschnitt 3; MacCallum, Zhang, Preacher & Rucker (2002), Psychological Methods 7(1), 19-40 (Informationsverlust).
 * Geprüft gegen R (cut, quantile type 6) und die echte PSPP-Engine: klassieren.test.ts.
 */
import type { Wert } from './eingabe';
import { zitWert } from './befehlstext';
import type { Daten } from './umformen';
import { AssistentFehler, istFehlend } from './datenassistent';
import { gueltigerName } from './skalabau';
import { dez } from '../i18n/profil';
import { L } from './sitzung.svelte';

export type KlassenArt = 'gleichbreit' | 'quantil' | 'eigene';
export const KLASSEN_MAX = 12;
export const K_QUANTIL = 4;
export const K_GLEICHBREIT = 5;
const TOL = 1e-12;

export interface KlassenOpt {
  spalte: string; ziel: string; art: KlassenArt;
  /** Zahl der Klassen (gleich breit 5, Quantil 4; 1 … 12) */
  k?: number;
  /** eigene Grenzen, streng aufsteigend */
  grenzen?: number[];
  /** eigene Grenzen: offene Ränder („bis a“ … „über z“); Standard ja */
  offen?: boolean;
  /** 'unten' (Standard): Grenzwert gehört zur unteren Klasse = rechts geschlossen; 'oben' = links geschlossen */
  grenzeZu?: 'unten' | 'oben';
  /** Spalte mit dem Fallgewicht und seine Art */
  gewicht?: { spalte: string; art: 'haeufigkeit' | 'umfrage' };
  ueberschreiben?: boolean;
}

const tol = (b: number) => TOL * Math.max(1, Math.abs(b));

/* ---------- Quantile (Typ 6, gewichtet = HAVERAGE) ---------- */
/**
 * Quantil bei p mit Gewichten (PSPP HAVERAGE, SPSS „gewichteter Durchschnitt“): tp = (W + 1) p, dann zwischen dem Wert, dessen kumuliertes Gewicht tp noch nicht übersteigt, und dem nächsten.
 * Ohne Gewichte (alle 1) ist das R `quantile(type = 6)`; bei ganzzahligen Gewichten gleich dem Quantil der erweiterten Datei.
 */
function quantilGewichtet(werte: number[], gewichte: number[] | undefined, p: number): number {
  const paare = werte.map((v, i) => [v, gewichte ? gewichte[i]! : 1] as const).filter(x => x[1] > 0).sort((a, b) => a[0] - b[0]);
  if (!paare.length) return NaN;
  let W = 0; for (const x of paare) W += x[1];
  const tp = (W + 1) * p;
  let c = 0, k = -1, ck = 0;   // k: letzter Wert mit kumuliertem Gewicht <= tp
  for (let i = 0; i < paare.length; i++) { c += paare[i]![1]; if (c <= tp + 1e-12 * Math.max(1, W)) { k = i; ck = c; } else break; }
  if (k < 0) return paare[0]![0];
  if (k >= paare.length - 1) return paare.at(-1)![0];
  // Bruchteil wie in PSPP (percentile.c, HAVERAGE): hat der nächste Wert ein Gewicht von mindestens 1, zählt der Abstand in ganzen Fällen (g >= 1 heißt: schon der nächste Wert);
  // ist sein Gewicht kleiner als 1 (Umfragegewichte), zählt der Anteil an diesem Gewicht.
  const wNext = paare[k + 1]![1], rest = tp - ck, g = wNext >= 1 ? rest : rest / wNext;
  return g >= 1 ? paare[k + 1]![0] : (1 - g) * paare[k]![0] + g * paare[k + 1]![0];
}

/** R `quantile(x, p, type = 6)`: die Regel der Verteilungskarte (PSPP FREQUENCIES /PERCENTILES), nicht Typ 7. */
export const quantilTyp6 = (werte: number[], p: number): number => quantilGewichtet(werte, undefined, p);

/* ---------- Grenzen ---------- */
export interface KlassenGrenzen { breaks: number[]; k: number; zusammengefallen: boolean; offen: boolean }

/** Eindeutige Grenzen in aufsteigender Reihenfolge (gleiche Werte innerhalb der Toleranz zählen einmal). */
function eindeutig(b: number[]): number[] {
  const aus: number[] = [];
  for (const v of b) if (!aus.length || v - aus.at(-1)! > tol(v)) aus.push(v);
  return aus;
}

/**
 * Grenzen aus den gültigen Zahlen. gleichbreit/quantil: `breaks` von Minimum bis Maximum (eindeutig); k ist die tatsächliche Zahl der Klassen, kleiner als verlangt,
 * wenn Grenzen zusammenfallen (`zusammengefallen`). eigene: die Grenzen selbst; mit offenen Rändern k = Grenzen + 1, sonst Grenzen − 1.
 * Fehler (AssistentFehler): 'k', 'grenzen', 'konstant', 'keine-werte'.
 */
export function klassenGrenzen(werte: number[], o: { art: KlassenArt; k?: number; grenzen?: number[]; offen?: boolean; gewichte?: number[]; gewichtArt?: 'haeufigkeit' | 'umfrage' }): KlassenGrenzen {
  if (o.art === 'eigene') {
    const g = o.grenzen ?? [], offen = o.offen ?? true;
    if (!g.length || g.some(v => !Number.isFinite(v)) || g.some((v, i) => i > 0 && !(v > g[i - 1]!)) || (!offen && g.length < 2)) throw new AssistentFehler('grenzen');
    return { breaks: [...g], k: offen ? g.length + 1 : g.length - 1, zusammengefallen: false, offen };
  }
  const k = o.k ?? (o.art === 'quantil' ? K_QUANTIL : K_GLEICHBREIT);
  if (!Number.isInteger(k) || k < 1 || k > KLASSEN_MAX) throw new AssistentFehler('k');
  let w = o.gewichte;
  if (w && o.gewichtArt === 'umfrage') {   // normiert auf Σw = Zahl der Zeilen mit Gewicht (der Maßstab des Gewichts ändert die Grenzen nicht)
    const pos = w.filter(x => x > 0).length, S = w.reduce((a, x) => a + (x > 0 ? x : 0), 0);
    w = w.map(x => (x > 0 ? x * pos / S : 0));
  }
  const zaehlt = werte.map((v, i) => i).filter(i => Number.isFinite(werte[i]!) && (!w || w[i]! > 0));
  if (!zaehlt.length) throw new AssistentFehler('keine-werte');
  const x = zaehlt.map(i => werte[i]!), gw = w ? zaehlt.map(i => w![i]!) : undefined;
  let mn = x[0]!, mx = x[0]!; for (const v of x) { if (v < mn) mn = v; if (v > mx) mx = v; }
  if (!(mx > mn)) throw new AssistentFehler('konstant');
  const innen = Array.from({ length: k - 1 }, (_, j) => o.art === 'gleichbreit' ? mn + (mx - mn) * (j + 1) / k : quantilGewichtet(x, gw, (j + 1) / k));
  const breaks = eindeutig([mn, ...innen, mx]);
  return { breaks, k: breaks.length - 1, zusammengefallen: breaks.length - 1 < k, offen: true };
}

/* ---------- Zuordnung ---------- */
/** Klasse 1 … k zu einem Wert aus den inneren Grenzen; null, wenn er außerhalb der festen Außengrenzen liegt (nur eigene Grenzen ohne offene Ränder). */
function klasseVon(v: number, innen: number[], rechts: boolean, fest: [number, number] | null): number | null {
  if (fest && (v < fest[0] - tol(fest[0]) || v > fest[1] + tol(fest[1]))) return null;
  let n = 0;
  for (const b of innen) if (rechts ? v > b + tol(b) : v >= b - tol(b)) n++;
  return n + 1;
}

const zahlWert = (d: Daten, name: string) => {
  const i = d.spalten.findIndex(s => s.name.toUpperCase() === name.toUpperCase());
  if (i < 0 || d.spalten[i]!.art !== 'zahl') throw new AssistentFehler('spalte', name);
  return i;
};
const FEHLENDE = (d: Daten, i: number, v: Wert) => typeof v !== 'number' || !Number.isFinite(v) || istFehlend(d.spalten[i]!, v);

/** Alles, was Zuordnung, Vorschau und Befehl gemeinsam brauchen. */
function plan(d: Daten, o: KlassenOpt) {
  const i = zahlWert(d, o.spalte);
  const gi = o.gewicht ? d.spalten.findIndex(s => s.name.toUpperCase() === o.gewicht!.spalte.toUpperCase()) : -1;
  if (o.gewicht && gi < 0) throw new AssistentFehler('spalte', o.gewicht.spalte);
  const zeilenWerte: (number | null)[] = d.zeilen.map(z => { const v = z[i] ?? null; return FEHLENDE(d, i, v) ? null : (v as number); });
  const gew: number[] | undefined = gi >= 0 ? d.zeilen.map(z => { const g = z[gi]; return typeof g === 'number' && Number.isFinite(g) && g > 0 ? g : 0; }) : undefined;
  const rows = zeilenWerte.map((v, r) => r).filter(r => zeilenWerte[r] !== null);
  const g = klassenGrenzen(rows.map(r => zeilenWerte[r]!), { art: o.art, k: o.k, grenzen: o.grenzen, offen: o.offen, gewichte: gew ? rows.map(r => gew[r]!) : undefined, gewichtArt: o.gewicht?.art });
  const rechts = (o.grenzeZu ?? 'unten') === 'unten', b = g.breaks;
  // eigene Grenzen mit offenen Rändern: alle Grenzen sind innere, die Ränder bleiben offen; sonst sind Minimum und Maximum (bzw. die erste und letzte eigene Grenze) die Außengrenzen
  const eigeneOffen = o.art === 'eigene' && g.offen, fest = o.art === 'eigene' && !g.offen;
  const innen = eigeneOffen ? b : b.slice(1, -1);
  const aussen: [number | null, number | null] = eigeneOffen ? [null, null] : [b[0]!, b.at(-1)!];
  return { i, zeilenWerte, gew, g, rechts, innen, aussen, fest: fest ? ([b[0]!, b.at(-1)!] as [number, number]) : null, geschlossenBeschriftet: fest };
}

function zielPruefen(d: Daten, o: KlassenOpt) {
  if (!gueltigerName(o.ziel)) throw new AssistentFehler('name', o.ziel);
  if (d.spalten.some(s => s.name.toUpperCase() === o.ziel.toUpperCase()) && !o.ueberschreiben) throw new AssistentFehler('ueberschreiben', o.ziel);
}

/** Klasse 1 … k je Zeile, null = leer (fehlend). Gewicht 0 ist nicht leer: die Zeile ist klassiert, zählt aber nichts. */
export function klassenWerte(d: Daten, o: KlassenOpt): (number | null)[] {
  const p = plan(d, o);
  return p.zeilenWerte.map(v => (v === null ? null : klasseVon(v, p.innen, p.rechts, p.fest)));
}

/* ---------- Beschriftung ---------- */
/** Zahl für Beschriftungen: ohne Rechenrauschen, höchstens `stellen` Stellen (sonst die kürzeste Darstellung), Dezimalzeichen der Sprache, nie erfundene Zahlen. */
function zahlText(v: number, stellen?: number): string {
  const r = stellen === undefined ? Number(v.toPrecision(10)) : Number(v.toFixed(stellen));
  const t = String(Math.abs(r) < 1e-6 && r !== 0 ? r.toFixed(10) : r).replace('-', '−');
  return dez(t);
}

function beschriftungen(innen: number[], aussen: [number, number] | null, rechts: boolean, stellen?: number): string[] {
  const z = (v: number) => zahlText(v, stellen);
  const k = innen.length + 1, aus: string[] = [];
  if (k === 1 && !aussen) return [L('alle Werte', 'all values')];
  for (let j = 0; j < k; j++) {
    const erste = j === 0, letzte = j === k - 1;
    if (!aussen) {
      const lo = erste ? null : innen[j - 1]!, hi = letzte ? null : innen[j]!;
      aus.push(rechts
        ? (lo === null ? L(`bis ${z(hi!)}`, `up to ${z(hi!)}`) : hi === null ? L(`über ${z(lo)}`, `over ${z(lo)}`) : L(`über ${z(lo)} bis ${z(hi)}`, `over ${z(lo)} to ${z(hi)}`))
        : (lo === null ? L(`unter ${z(hi!)}`, `under ${z(hi!)}`) : hi === null ? L(`${z(lo)} und mehr`, `${z(lo)} and above`) : L(`${z(lo)} bis unter ${z(hi)}`, `${z(lo)} to under ${z(hi)}`)));
    } else {
      const lo = erste ? aussen[0] : innen[j - 1]!, hi = letzte ? aussen[1] : innen[j]!;
      aus.push(rechts
        ? (erste ? L(`${z(lo)} bis ${z(hi)}`, `${z(lo)} to ${z(hi)}`) : L(`über ${z(lo)} bis ${z(hi)}`, `over ${z(lo)} to ${z(hi)}`))
        : (letzte ? L(`${z(lo)} bis ${z(hi)}`, `${z(lo)} to ${z(hi)}`) : L(`${z(lo)} bis unter ${z(hi)}`, `${z(lo)} to under ${z(hi)}`)));
    }
  }
  return aus;
}

/** Beschriftungen zu den inneren Grenzen, offene Ränder: „bis 18“, „über 18 bis 25“, „über 25“ bzw. „unter 18“, „18 bis unter 25“, „25 und mehr“. */
export function klassenBeschriftung(innereGrenzen: number[], grenzeZu: 'unten' | 'oben' = 'unten', stellen?: number): string[] {
  return beschriftungen(innereGrenzen, null, grenzeZu === 'unten', stellen);
}

/** Stellen nach dem Komma in den Daten (höchstens 4), für runde Beschriftungen: zwei mehr als die Daten haben. */
function datenStellen(werte: (number | null)[]): number {
  let m = 0;
  for (const v of werte) { if (v === null) continue; const t = String(v), k = t.indexOf('.'); if (k >= 0 && !/e/i.test(t)) m = Math.max(m, Math.min(4, t.length - k - 1)); }
  return Math.min(6, m + 2);
}

/** Beschriftungen mit gerundeten Grenzen; wären zwei gleich, mehr Stellen. */
function labelsFuer(p: ReturnType<typeof plan>): string[] {
  const aussen = p.geschlossenBeschriftet ? ([p.aussen[0]!, p.aussen[1]!] as [number, number]) : null;
  let st = datenStellen(p.zeilenWerte), l = beschriftungen(p.innen, aussen, p.rechts, st);
  while (new Set(l).size < l.length && st < 8) { st++; l = beschriftungen(p.innen, aussen, p.rechts, st); }
  return l;
}

/* ---------- Vorschau ---------- */
export interface KlasseZeile { nr: number; von: number | null; bis: number | null; vonEin: boolean; bisEin: boolean; beschriftung: string; anzahl: number; anteil: number }
export interface KlassenVorschau {
  klassen: KlasseZeile[]; aufGrenze: number; gewichtet: boolean; k: number; kGewuenscht: number; zusammengefallen: boolean; gueltig: number;
  hinweise: ('informationsverlust' | 'zusammengefallen')[];
}

/** Zahl der Fälle je Klasse (gewichtet, wenn ein Fallgewicht gesetzt ist), Anteile, Fälle genau auf einer inneren Grenze und die Hinweise. */
export function klassenVorschau(d: Daten, o: KlassenOpt): KlassenVorschau {
  zielPruefen(d, o);
  const p = plan(d, o), k = p.g.k, { innen } = p;
  const anzahl = new Array<number>(k).fill(0), schnittGrenzen = p.fest ? p.g.breaks : innen;   // eigene Grenzen ohne offene Ränder: auch die erste und die letzte sind Grenzen der Zuordnung
  let aufGrenze = 0;
  p.zeilenWerte.forEach((v, r) => {
    if (v === null) return;
    const kl = klasseVon(v, innen, p.rechts, p.fest);
    if (kl === null) return;
    const g = p.gew ? p.gew[r]! : 1;
    anzahl[kl - 1]! += g;
    if (schnittGrenzen.some(b => Math.abs(v - b) <= tol(b))) aufGrenze += g;
  });
  const gueltig = anzahl.reduce((a, b) => a + b, 0), labels = labelsFuer(p);
  const klassen: KlasseZeile[] = anzahl.map((a, j) => {
    const lo = j === 0 ? p.aussen[0] : innen[j - 1]!, hi = j === k - 1 ? p.aussen[1] : innen[j]!;
    // Rechts geschlossen: (von, bis], die erste Klasse schließt ihren kleinsten Wert ein. Links geschlossen: [von, bis), die letzte Klasse schließt ihren größten Wert ein.
    return { nr: j + 1, von: lo, bis: hi, vonEin: lo !== null && (p.rechts ? j === 0 : true), bisEin: hi !== null && (p.rechts ? true : j === k - 1),
      beschriftung: labels[j]!, anzahl: a, anteil: gueltig ? a / gueltig : 0 };
  });
  const gewuenscht = o.art === 'eigene' ? k : (o.k ?? (o.art === 'quantil' ? K_QUANTIL : K_GLEICHBREIT));
  return { klassen, aufGrenze, gewichtet: !!p.gew, k, kGewuenscht: gewuenscht, zusammengefallen: p.g.zusammengefallen,
    gueltig, hinweise: p.g.zusammengefallen ? ['informationsverlust', 'zusammengefallen'] : ['informationsverlust'] };
}

/* ---------- Befehl ---------- */
/** Zahl für die Syntax (lange Dezimalschreibweise statt 1e-7). */
const lit = (n: number) => { const t = String(n); return /e/i.test(t) ? n.toFixed(20).replace(/0+$/, '').replace(/\.$/, '') : t; };
const zit = zitWert;   // lib/befehlstext.ts

/**
 * RECODE … INTO + FORMATS F8.0 + VALUE LABELS + VARIABLE LEVEL ORDINAL + EXECUTE. Fehlende und benutzerdefiniert fehlende Werte werden VOR den Wertregeln auf leer gesetzt,
 * die Quelle bleibt unverändert (außer bei „überschreiben“). Die Toleranz 1e-12 steckt in den Grenzen: PSPP vergleicht Gleitkommazahlen genau.
 */
export function klassenBefehl(d: Daten, o: KlassenOpt): { syntax: string; ziel: string; k: number; labels: Record<string, string> } {
  const p = plan(d, o);
  zielPruefen(d, o);
  const k = p.g.k, { innen } = p, labelListe = labelsFuer(p);
  const quelle = d.spalten[p.i]!.name, inPlace = o.ziel.toUpperCase() === quelle.toUpperCase();
  // Rechts geschlossen: die Klasse j reicht bis b_j + Toleranz; links geschlossen: sie beginnt bei b_j − Toleranz. Aufsteigende Regeln, die erste passende gilt.
  const schnitt = innen.map(b => (p.rechts ? b + tol(b) : b - tol(b)));
  const regeln: string[] = [];
  if (p.fest) {
    const [a, z] = p.fest;
    regeln.push(`(LOWEST THRU ${lit(a - tol(a))}=SYSMIS)`);
    for (let j = 0; j < k; j++) regeln.push(`(${j === 0 ? lit(a - tol(a)) : lit(schnitt[j - 1]!)} THRU ${j === k - 1 ? lit(z + tol(z)) : lit(schnitt[j]!)}=${j + 1})`);
    regeln.push('(ELSE=SYSMIS)');
  } else {
    for (let j = 0; j < k; j++) regeln.push(`(${j === 0 ? 'LOWEST' : lit(schnitt[j - 1]!)} THRU ${j === k - 1 ? 'HIGHEST' : lit(schnitt[j]!)}=${j + 1})`);
  }
  const labels: Record<string, string> = Object.fromEntries(labelListe.map((t, j) => [String(j + 1), t]));
  const zeilen = [
    `RECODE ${quelle} (MISSING=SYSMIS) ${regeln.join(' ')}${inPlace ? '' : ` INTO ${o.ziel}`}.`,
    `FORMATS ${o.ziel} (F8.0).`,
    `VALUE LABELS ${o.ziel} ${labelListe.map((t, j) => `${j + 1} ${zit(t)}`).join(' ')}.`,
    ...(inPlace ? [`MISSING VALUES ${o.ziel} ().`] : []),
    `VARIABLE LEVEL ${o.ziel} (ORDINAL).`,
    'EXECUTE.'
  ];
  return { syntax: zeilen.join('\n'), ziel: o.ziel, k, labels };
}
