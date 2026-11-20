/**
 * Fälle vergleichen (Mixed Methods) nach Schoonenboom: die „Case Comparison Table“.
 * Eine Zeile je Fall, Zahlen- und Gruppenspalten, Textspalten (Zitate). Aus den Wertkombinationen der Zahlenspalten entstehen Gruppen,
 * die man verschieben, umbenennen und deuten kann; je Gruppe stehen n, M, SD, Median, Min-Max bzw. Häufigkeiten. Es gibt keine Tests: Die Tabelle beschreibt
 * die vorliegenden Fälle und prüft nichts. Alles hier ist reine Logik (kein PSPP); die Zahlen sind gegen R geprüft (scripts/welle4-erwartet.R, testdaten/welle4-erwartet.json).
 * Quellen: Schoonenboom & Johnson (2021), in: Routledge Reviewer's Guide to Mixed Methods Analysis; Schoonenboom (2023), FQS 24(1);
 * Guetterman, Fetters & Creswell (2015), Annals of Family Medicine 13(6), zu Joint Displays.
 * Festlegungen (Fachblatt docs/fachblaetter/WELLE4-FAELLE-OFFENE-ANTWORTEN.md, Prüfer in faelle.test.ts):
 *  - Teilung einer Zahlenspalte „bis einschließlich“ der Schwelle (Median oder eigener Wert) / „über“ der Schwelle; Bindungen am Median werden gemeldet.
 *  - Fälle mit fehlendem Wert in einer Gruppierungsspalte bilden eigene Gruppen „ohne Angabe bei …“ (nie still weglassen).
 *  - Eine Spalte mit weniger als zwei verschiedenen Werten wird nicht geteilt (kein Namensteil), ihre Kennwerte gibt es trotzdem.
 *  - SD mit n − 1, bei n < 2 null (nicht 0).
 * ⚠ Teilung „bis Median / über Median“ und die Höchstzahlen der Spalten von der Fachperson abzunehmen.
 */
import { istFehlend, type FehlendBereich } from './fehlend';
import { L } from './sitzung.svelte';
import { zahlDe } from './format';
import { aufzaehlung } from '../i18n/profil';

export type Wert = string | number | null;
/** Höchstens so viele Zahlen-/Gruppenspalten und Textspalten (mehr wird die Tabelle unlesbar). */
export const MAX_ZAHLEN = 4;
export const MAX_TEXTE = 3;
/** Ab so vielen Fällen ein Hinweis (die Tabelle bleibt bedienbar), ab so vielen eine Sperre (zu schwer für die Seite). */
export const FAELLE_HINWEIS = 500;
export const FAELLE_GRENZE = 3000;

export type QArt = 'zahl' | 'gruppe';
/** Eine Zahlen- oder Gruppenspalte: `labels` sind die Wertebeschriftungen (Zahl als Text → Beschriftung). */
export interface QSpalte { name: string; bezeichnung: string; art: QArt; labels: Record<string, string> }
export interface TSpalte { name: string; bezeichnung: string }
/** Ein Fall: `schluessel` bleibt beim Neurechnen gleich (Kennung, sonst Zeilennummer), `q`/`t` die Werte in der Reihenfolge der Spalten. */
export interface Fall { schluessel: string; kennung: string; zeile: number; q: Wert[]; t: string[] }

/** Wie eine Zahlenspalte geteilt wird, wenn nicht am Median: an einer eigenen Schwelle. Gespeichert wird nur, was vom Median abweicht. */
export interface Teilung { modus: 'median' | 'eigen'; wert?: number }
/** Eine markierte Stelle im Text einer Zelle (Zeichen von … bis, ohne bis); `text` hält den Wortlaut, damit sich die Stelle nach neuen Daten wiederfinden lässt. */
export interface Zitat { von: number; bis: number; text: string }

/** Passung (Fetters, Curry & Creswell 2013: confirmation, expansion, discordance): wie sich Zahlen und Aussagen einer Gruppe zueinander verhalten. Das entscheidet der Mensch; Statable zählt nur. */
export type Passung = 'offen' | 'bestaetigung' | 'erweiterung' | 'widerspruch';
export const PASSUNGEN: readonly Passung[] = ['offen', 'bestaetigung', 'erweiterung', 'widerspruch'];
export const istPassung = (x: unknown): x is Passung => typeof x === 'string' && (PASSUNGEN as readonly string[]).includes(x);

export interface FaelleZustand {
  teilung: Record<string, Teilung>;
  /** Selbst angelegte Gruppen (Kennung 'n:1', 'n:2' …) in der Reihenfolge des Anlegens. */
  eigene: string[];
  /** Eigene Namen (auch für vorgeschlagene Gruppen); leer = Name von Statable. */
  namen: Record<string, string>;
  notizen: Record<string, string>;
  /** Passung je Gruppe; fehlt eine Gruppe, gilt „offen“. Fehlt das Feld ganz (ältere Blätter), ebenso. */
  passung?: Record<string, Passung>;
  /** Meta-Inferenz je Gruppe (Was lerne ich aus Zahlen und Aussagen zusammen?); fehlt = leer. */
  metaInferenz?: Record<string, string>;
  /** Verschobene Fälle: Fall → Gruppe. Fehlt ein Fall, gilt die vorgeschlagene Gruppe. */
  zuordnung: Record<string, string>;
  /** Markierte Zitate: `${Fall}\u001f${Textspalte}` → Stellen. */
  zitate: Record<string, Zitat[]>;
}
export interface Faelle {
  /** Name der Kennungsspalte, '' = keine (dann zählt die Zeilennummer). */
  kennung: string;
  /** Bezeichnung der Kennungsspalte für die Anzeige (fehlt sie, der Name). */
  kennungName?: string;
  q: QSpalte[]; t: TSpalte[]; faelle: Fall[];
  /** Zeilen der Daten und davon ausgelassene (ganz ohne Angabe in allen gewählten Spalten). */
  zeilen: number; ausgelassen: number;
  zustand: FaelleZustand;
}

export const leererZustand = (): FaelleZustand => ({ teilung: {}, eigene: [], namen: {}, notizen: {}, zuordnung: {}, zitate: {} });
const TRENN = '\u001f';
export const zitatSchluessel = (fall: string, spalte: string) => `${fall}${TRENN}${spalte}`;

/* ---------- Aufbau aus den Daten ---------- */
export interface RohSpalte { name: string; bezeichnung: string; art: 'zahl' | 'text' | 'datum'; fehlend: number[]; fehlendBereich?: FehlendBereich; werteLabels: Record<string, string>; niveau?: string }

/**
 * Zahl oder Gruppe? Text, genau zwei verschiedene Werte und beschriftete nominale Zahlen sind Gruppen; sonst eine Zahl.
 * Eine Zahlenspalte mit 0 oder 1 verschiedenem Wert bleibt eine Zahl (keine Teilung, aber Kennwerte).
 */
export function qArt(sp: Pick<RohSpalte, 'art' | 'niveau' | 'werteLabels'>, verschieden: number): QArt {
  if (sp.art !== 'zahl' || verschieden === 2) return 'gruppe';
  return sp.niveau === 'nominal' && Object.keys(sp.werteLabels).length > 0 ? 'gruppe' : 'zahl';
}

const leer = (v: Wert | undefined): boolean => v === null || v === undefined || v === '';

/**
 * Die Fälle aus den Zeilen der Daten. `wahl`: Kennung (oder ''), Zahlen-/Gruppenspalten, Textspalten. Zeilen ohne jede Angabe in diesen Spalten fallen weg (und werden gezählt).
 * Der Schlüssel eines Falls ist die Kennung, wenn alle Kennungen da und verschieden sind, sonst die Zeilennummer.
 */
export function baueFaelle(spalten: RohSpalte[], zeilen: Wert[][], wahl: { kennung: string; q: string[]; t: string[] }, bisher?: FaelleZustand): Faelle {
  const index = (n: string) => spalten.findIndex(x => x.name === n);
  const qn = wahl.q.filter(n => index(n) >= 0), tn = wahl.t.filter(n => index(n) >= 0);
  const qs = qn.map(n => spalten[index(n)]!), ts = tn.map(n => spalten[index(n)]!);
  const iq = qn.map(index), it = tn.map(index), ik = wahl.kennung && index(wahl.kennung) >= 0 ? index(wahl.kennung) : -1;
  const gut = (v: Wert | undefined, s: RohSpalte): Wert => (leer(v) ? null : typeof v === 'number' ? (istFehlend(s, v) ? null : v) : String(v).trim() === '' ? null : String(v).trim());
  const roh = zeilen.map((z, i) => ({
    i,
    q: iq.map((k, j) => gut(z[k], qs[j]!)),
    t: it.map((k, j) => { const v = gut(z[k], ts[j]!); return v === null ? '' : String(v); }),
    k: ik >= 0 ? gut(z[ik], spalten[ik]!) : null
  }));
  const mit = roh.filter(r => r.q.some(v => v !== null) || r.t.some(v => v !== ''));
  const kennungen = mit.map(r => (r.k === null ? '' : String(r.k)));
  const eindeutig = ik >= 0 && kennungen.every(k => k !== '') && new Set(kennungen).size === kennungen.length;
  const faelle: Fall[] = mit.map((r, j) => ({ schluessel: eindeutig ? `k:${kennungen[j]}` : `z:${r.i + 1}`, kennung: kennungen[j] || String(r.i + 1), zeile: r.i + 1, q: r.q, t: r.t }));
  const q: QSpalte[] = qs.map((s, j) => {
    const werte = new Set(faelle.map(f => f.q[j]).filter((v): v is string | number => v !== null));
    return { name: s.name, bezeichnung: s.bezeichnung || s.name, art: qArt(s, werte.size), labels: { ...s.werteLabels } };
  });
  const e: Faelle = { kennung: ik >= 0 ? wahl.kennung : '', kennungName: ik >= 0 ? spalten[ik]!.bezeichnung || spalten[ik]!.name : undefined, q, t: ts.map(s => ({ name: s.name, bezeichnung: s.bezeichnung || s.name })), faelle, zeilen: zeilen.length, ausgelassen: roh.length - mit.length, zustand: leererZustand() };
  if (bisher) e.zustand = uebernimm(e, bisher);
  return e;
}

/**
 * Den Zustand (Gruppen, Zuordnung, Notizen, Markierungen) in neu gerechnete Daten mitnehmen. Zuordnungen und Markierungen von Fällen, die es nicht mehr gibt, fallen weg;
 * Markierungen suchen ihren Wortlaut neu. Namen, Notizen, eigene Gruppen und Schwellen bleiben stehen (sie wirken nur, solange sie zu den Spalten passen) -
 * so geht beim kurzen Abwählen einer Spalte nichts verloren.
 */
export function uebernimm(neu: Faelle, alt: FaelleZustand): FaelleZustand {
  const z = leererZustand();
  const fall = new Map(neu.faelle.map(f => [f.schluessel, f]));
  for (const [n, t] of Object.entries(alt.teilung)) z.teilung[n] = { ...t };
  z.eigene = [...alt.eigene];
  z.namen = { ...alt.namen }; z.notizen = { ...alt.notizen };
  const pa = Object.entries(alt.passung ?? {}).filter(([, v]) => istPassung(v) && v !== 'offen'), mi = Object.entries(alt.metaInferenz ?? {}).filter(([, v]) => typeof v === 'string' && v.trim() !== '');
  if (pa.length) z.passung = Object.fromEntries(pa) as Record<string, Passung>;
  if (mi.length) z.metaInferenz = Object.fromEntries(mi);
  for (const [f, g] of Object.entries(alt.zuordnung)) if (fall.has(f)) z.zuordnung[f] = g;
  for (const [k, liste] of Object.entries(alt.zitate)) {
    const [f, sp] = k.split(TRENN) as [string, string], ti = neu.t.findIndex(x => x.name === sp), fa = fall.get(f);
    if (!fa) continue;
    if (ti < 0) { z.zitate[k] = liste.map(r => ({ ...r })); continue; }   // Textspalte gerade nicht gewählt: Markierungen aufheben
    const text = fa.t[ti]!, behalten: Zitat[] = [];
    for (const r of liste) {
      if (text.slice(r.von, r.bis) === r.text) { behalten.push({ ...r }); continue; }
      const at = r.text ? text.indexOf(r.text) : -1;
      if (at >= 0) behalten.push({ von: at, bis: at + r.text.length, text: r.text });
    }
    if (behalten.length) z.zitate[k] = vereine(behalten, text);
  }
  return z;
}

/* ---------- Teilung der Zahlenspalten ---------- */
export const median = (w: number[]): number => { const s = [...w].sort((a, b) => a - b), m = s.length >> 1; return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2; };
/** Zahl für die Anzeige: auf zwei Stellen gerundet, ohne Endnullen, mit dem Dezimalzeichen der Sprache. */
/** Auf zwei Stellen runden, an exakten Grenzen wie R und PSPP (2,975 → 2,98): vorher auf 12 gültige Stellen stabilisieren, dann über die Dezimalschreibweise runden (2,975 · 100 ist als Zahl 297,4999…). */
export function runde2(v: number): number {
  const s = String(Number(v.toPrecision(12)));
  if (s.includes('e')) return Math.round(v * 100) / 100;
  const r = Number(Math.round(Math.abs(Number(`${s}e2`))) + 'e-2');   // Halbe weg von null (wie sprintf in R)
  return v < 0 ? -r : r;
}
const zt = (v: number) => zahlDe(runde2(v));

export interface TeilungInfo {
  modus: 'median' | 'eigen' | 'keine';
  verschieden: number; nGueltig: number; median: number | null; schwelle: number | null; schwelleText: string | null;
  nUnter: number; nGleich: number; nUeber: number; nBis: number;
  /** Mindestens zwei Fälle liegen genau auf der Schwelle: die Gruppen werden dann ungleich groß. */
  bindungenAmMedian: boolean;
  /** Die beiden Klassen mit Spaltenbezeichnung („Note bis 2,5“, „Note über 2,5“); bei 'keine' leer. */
  klassen: string[];
}
const qIndex = (e: Faelle, spalte: string) => e.q.findIndex(x => x.name === spalte);
const zahlen = (e: Faelle, qi: number): number[] => e.faelle.map(f => f.q[qi]).filter((v): v is number => typeof v === 'number');

/** Wie die Zahlenspalte geteilt wird und mit welchen Größen; `null` für Gruppenspalten (die haben keine Teilung). */
export function teilungInfo(e: Faelle, spalte: string): TeilungInfo | null {
  const qi = qIndex(e, spalte);
  if (qi < 0 || e.q[qi]!.art === 'gruppe') return null;
  const w = zahlen(e, qi), verschieden = new Set(w).size, med = w.length ? median(w) : null;
  const t = e.zustand.teilung[spalte];
  if (verschieden < 2) return { modus: 'keine', verschieden, nGueltig: w.length, median: med, schwelle: null, schwelleText: null, nUnter: 0, nGleich: 0, nUeber: 0, nBis: 0, bindungenAmMedian: false, klassen: [] };
  const eigen = t?.modus === 'eigen' && t.wert !== undefined && Number.isFinite(t.wert);
  const schwelle = eigen ? t!.wert! : med!;
  const nUnter = w.filter(v => v < schwelle).length, nGleich = w.filter(v => v === schwelle).length, nUeber = w.filter(v => v > schwelle).length;
  const bez = e.q[qi]!.bezeichnung, st = zt(schwelle);
  return {
    modus: eigen ? 'eigen' : 'median', verschieden, nGueltig: w.length, median: med, schwelle, schwelleText: st,
    nUnter, nGleich, nUeber, nBis: nUnter + nGleich, bindungenAmMedian: nGleich >= 2,
    klassen: [`${bez} ${L('bis', 'up to')} ${st}`, `${bez} ${L('über', 'above')} ${st}`]
  };
}
/** Die Teilung einer Zahlenspalte ändern: am Median (Voreinstellung) oder an einer eigenen Schwelle („bis einschließlich“). Gruppenspalten werden nicht geteilt. */
export function teile(e: Faelle, spalte: string, t: { modus: 'median' | 'eigen'; wert?: number }) {
  const qi = qIndex(e, spalte);
  if (qi < 0 || e.q[qi]!.art === 'gruppe') return;
  if (t.modus === 'eigen' && t.wert !== undefined && Number.isFinite(t.wert)) e.zustand.teilung[spalte] = { modus: 'eigen', wert: t.wert };
  else delete e.zustand.teilung[spalte];
}

/** Alle Werte einer Spalte, die vorkommen, in der Reihenfolge der Klassen (Zahlen aufsteigend, Text nach Alphabet). */
export function stufenVon(e: Faelle, qi: number): (string | number)[] {
  const w = [...new Set(e.faelle.map(f => f.q[qi]).filter((v): v is string | number => v !== null))];
  return w.sort((a, b) => (typeof a === 'number' && typeof b === 'number' ? a - b : String(a).localeCompare(String(b), 'de')));
}
export const stufenName = (e: Faelle, qi: number, v: string | number): string => e.q[qi]!.labels[String(v)] ?? (typeof v === 'number' ? zt(v) : v);

/* ---------- Gruppen ---------- */
export interface Gruppe {
  id: string; name: string; /** vorgeschlagen aus den Wertkombinationen (sonst selbst angelegt) */ vorschlag: boolean;
  /** Der Name von Statable (bei einer eigenen Gruppe „Neue Gruppe n“) - gilt, wenn kein eigener Name gesetzt ist. */
  grundname: string; notiz: string; eigenerName: boolean;
  /** Passung (Voreinstellung „offen“) und Meta-Inferenz dieser Gruppe */ passung: Passung; metaInferenz: string;
  /** Stellen in `Faelle.faelle` */ mitglieder: number[];
  /** Bezeichnungen der Gruppierungsspalten ohne Wert (nur bei „ohne Angabe bei …“), sonst leer. */ fehlendBei: string[];
}
const REGULAER = 'a:', OHNE = 'm:', EIGEN = 'n:';

/** Was die Gruppenbildung von den Spalten wissen muss - einmal je Aufruf berechnet. */
interface Plan { gruppiert: boolean[]; schwelle: (number | null)[]; stufen: (string | number)[][]; klassen: string[][] }
function planVon(e: Faelle): Plan {
  const infos = e.q.map(sp => teilungInfo(e, sp.name));
  const gruppiert = e.q.map((sp, qi) => (sp.art === 'gruppe' ? stufenVon(e, qi).length >= 1 : infos[qi]!.modus !== 'keine'));
  const schwelle = e.q.map((_, qi) => infos[qi]?.schwelle ?? null);
  const stufen = e.q.map((sp, qi) => (sp.art === 'gruppe' ? stufenVon(e, qi) : []));
  const klassen = e.q.map((sp, qi) => (sp.art === 'gruppe' ? stufen[qi]!.map(v => `${sp.bezeichnung}: ${stufenName(e, qi, v)}`) : infos[qi]!.klassen));
  return { gruppiert, schwelle, stufen, klassen };
}
/** Klassennummer eines Falls in einer Spalte: 0 oder 1 bei geteilten Zahlen, die Stelle des Werts bei Gruppenspalten, 0 bei nicht geteilten Spalten; −1 ohne Angabe. */
function klasseVon(e: Faelle, p: Plan, qi: number, f: Fall): number {
  const v = f.q[qi];
  if (!p.gruppiert[qi]) return 0;
  if (v === null || v === undefined) return -1;
  if (e.q[qi]!.art === 'gruppe') return p.stufen[qi]!.indexOf(v);
  return (v as number) <= p.schwelle[qi]! ? 0 : 1;
}
/** Die vorgeschlagene Gruppe eines Falls (Kennung). */
function natuerlich(e: Faelle, p: Plan, f: Fall): string {
  const k = e.q.map((_, qi) => klasseVon(e, p, qi, f));
  const fehlt = k.flatMap((x, qi) => (x < 0 && p.gruppiert[qi] ? [qi] : []));
  return fehlt.length ? OHNE + fehlt.join(',') : REGULAER + k.join('|');
}
const nenne = (e: Faelle, qi: number[]) => aufzaehlung(qi.map(i => e.q[i]!.bezeichnung));
/** Name einer vorgeschlagenen Gruppe aus ihrer Kennung; null, wenn die Kennung zu den Spalten nicht mehr passt (Schwelle oder Spalten geändert). */
function autoName(e: Faelle, p: Plan, id: string): { name: string; fehlendBei: string[] } | null {
  if (id.startsWith(OHNE)) {
    const qi = id.slice(OHNE.length).split(',').map(Number);
    if (!qi.length || qi.some((x, j) => !Number.isInteger(x) || x < 0 || x >= e.q.length || !p.gruppiert[x] || (j > 0 && x <= qi[j - 1]!))) return null;
    return { name: `${L('ohne Angabe bei', 'no answer for')} ${nenne(e, qi)}`, fehlendBei: qi.map(i => e.q[i]!.bezeichnung) };
  }
  if (!id.startsWith(REGULAER)) return null;
  const k = id.slice(REGULAER.length).split('|').map(Number);
  if (k.length !== e.q.length || k.some((x, qi) => !Number.isInteger(x) || x < 0 || x >= (p.gruppiert[qi] ? p.klassen[qi]!.length : 1))) return null;
  const teile = k.flatMap((x, qi) => (p.gruppiert[qi] ? [p.klassen[qi]![x]!] : []));
  return { name: teile.length ? teile.join(' · ') : L('Alle Fälle', 'All cases'), fehlendBei: [] };
}
const eigenNummer = (id: string) => Number(id.slice(EIGEN.length));
const eigenName = (id: string) => `${L('Neue Gruppe', 'New group')} ${eigenNummer(id)}`;
/** Reihenfolge der vorgeschlagenen Gruppen: erst die regulären nach Klassennummern (erste Spalte zuerst), dann „ohne Angabe“ (erst eine fehlende Spalte, dann zwei …). */
const sortKey = (id: string): number[] => (id.startsWith(OHNE) ? (() => { const q = id.slice(OHNE.length).split(',').map(Number); return [1, q.length, ...q]; })() : [0, ...id.slice(REGULAER.length).split('|').map(Number)]);
const vergleiche = (a: number[], b: number[]) => { for (let i = 0; i < Math.max(a.length, b.length); i++) if ((a[i] ?? -1) !== (b[i] ?? -1)) return (a[i] ?? -1) - (b[i] ?? -1); return 0; };

/**
 * Die Gruppen: zuerst die vorgeschlagenen (aus den Wertkombinationen, in der Reihenfolge der Spalten; dann „ohne Angabe bei …“), dann die selbst angelegten.
 * Eine vorgeschlagene Gruppe ohne Fälle erscheint nur, wenn sie einen Namen oder eine Notiz trägt.
 */
export function bildeGruppen(e: Faelle): Gruppe[] {
  const p = planVon(e), z = e.zustand;
  const gueltig = (id: string) => (id.startsWith(EIGEN) ? z.eigene.includes(id) : autoName(e, p, id) !== null);
  const mitgl = new Map<string, number[]>();
  e.faelle.forEach((f, i) => {
    const ziel = z.zuordnung[f.schluessel];
    const id = ziel !== undefined && gueltig(ziel) ? ziel : natuerlich(e, p, f);
    (mitgl.get(id) ?? mitgl.set(id, []).get(id)!).push(i);
  });
  const beschriftet = (i: string) => !i.startsWith(EIGEN) && autoName(e, p, i) !== null && !!((z.notizen[i] ?? '').trim() || (z.namen[i] ?? '').trim() || (z.metaInferenz?.[i] ?? '').trim() || (z.passung?.[i] ?? 'offen') !== 'offen');
  const ids = new Set<string>([...mitgl.keys(), ...Object.keys(z.notizen).filter(beschriftet), ...Object.keys(z.namen).filter(beschriftet), ...Object.keys(z.passung ?? {}).filter(beschriftet), ...Object.keys(z.metaInferenz ?? {}).filter(beschriftet)]);
  const auto = [...ids].filter(i => !i.startsWith(EIGEN) && autoName(e, p, i) !== null).sort((a, b) => vergleiche(sortKey(a), sortKey(b)));
  const bau = (id: string, vorschlag: boolean): Gruppe => {
    const an = vorschlag ? autoName(e, p, id)! : null, grund = an ? an.name : eigenName(id), eigen = (z.namen[id] ?? '').trim();
    return { id, name: eigen || grund, grundname: grund, eigenerName: !!eigen, vorschlag, notiz: z.notizen[id] ?? '', passung: passungVon(z, id), metaInferenz: z.metaInferenz?.[id] ?? '', mitglieder: mitgl.get(id) ?? [], fehlendBei: an ? an.fehlendBei : [] };
  };
  return [...auto.map(i => bau(i, true)), ...z.eigene.map(i => bau(i, false))];
}
/** Die Gruppe jedes Falls (Schlüssel → Kennung der Gruppe). */
export function gruppeJeFall(e: Faelle, gruppen = bildeGruppen(e)): Map<string, string> {
  const m = new Map<string, string>();
  for (const g of gruppen) for (const i of g.mitglieder) m.set(e.faelle[i]!.schluessel, g.id);
  return m;
}

/* ---------- Kennwerte ---------- */
export interface KennZahl { art: 'zahl'; spalte: string; n: number; fehlend: number; mean: number | null; sd: number | null; median: number | null; min: number | null; max: number | null }
export interface KennGruppe { art: 'gruppe'; spalte: string; n: number; fehlend: number; stufen: { wert: string | number; name: string; n: number; prozent: number | null }[] }
export type Kenn = KennZahl | KennGruppe;
/**
 * Je gewählter Zahlen- oder Gruppenspalte (in Spaltenreihenfolge) über die angegebenen Fälle (Stellen in `Faelle.faelle`):
 * n, M, SD (mit n − 1, bei n < 2 null), Median, Min, Max für Zahlen; Häufigkeiten mit Prozent (Basis: Fälle mit Angabe, 0-100) für Gruppen. Fehlende Werte stehen in `fehlend`.
 */
export function kennwerte(e: Faelle, stellen: number[]): Kenn[] {
  return e.q.map((sp, qi): Kenn => {
    const werte = stellen.map(i => e.faelle[i]!.q[qi]!).filter(v => v !== null && v !== undefined) as (string | number)[], fehlend = stellen.length - werte.length;
    if (sp.art === 'gruppe') {
      return { art: 'gruppe', spalte: sp.name, n: werte.length, fehlend, stufen: stufenVon(e, qi).map(v => { const n = werte.filter(w => w === v).length; return { wert: v, name: stufenName(e, qi, v), n, prozent: werte.length ? (n / werte.length) * 100 : null }; }) };
    }
    const w = werte.filter((v): v is number => typeof v === 'number'), n = w.length;
    if (!n) return { art: 'zahl', spalte: sp.name, n: 0, fehlend: stellen.length, mean: null, sd: null, median: null, min: null, max: null };
    // Auf 12 gültige Stellen stabilisieren, wie sonst in Statable (friedman.ts, rci.ts): 2,975 darf nicht als 2,97 erscheinen (R und PSPP runden auf 2,98).
    const stabil = (x: number) => Number(x.toPrecision(12));
    const m = w.reduce((a, b) => a + b, 0) / n;
    return { art: 'zahl', spalte: sp.name, n, fehlend: stellen.length - n, mean: stabil(m), sd: n > 1 ? stabil(Math.sqrt(w.reduce((a, b) => a + (b - m) ** 2, 0) / (n - 1))) : null, median: stabil(median(w)), min: w.reduce((a, b) => Math.min(a, b), Infinity), max: w.reduce((a, b) => Math.max(a, b), -Infinity) };
  });
}

/* ---------- Zitate ---------- */
/** Überlappende und aneinanderstoßende Stellen zusammenfassen, auf den Text begrenzen, nach Anfang ordnen. */
export function vereine(liste: Zitat[], text: string): Zitat[] {
  const s = liste.map(r => ({ von: Math.max(0, Math.min(r.von, text.length)), bis: Math.max(0, Math.min(r.bis, text.length)) })).filter(r => r.bis > r.von).sort((a, b) => a.von - b.von);
  const aus: { von: number; bis: number }[] = [];
  for (const r of s) { const l = aus.at(-1); if (l && r.von <= l.bis) l.bis = Math.max(l.bis, r.bis); else aus.push({ ...r }); }
  return aus.map(r => ({ ...r, text: text.slice(r.von, r.bis) }));
}
const textVon = (e: Faelle, fall: string, spalte: string): string => { const f = e.faelle.find(x => x.schluessel === fall), ti = e.t.findIndex(x => x.name === spalte); return f && ti >= 0 ? f.t[ti]! : ''; };
/** Eine Stelle im Text einer Zelle markieren (ganze Zelle: von 0 bis zur Länge). Leere Auswahl und Leerraum am Rand zählen nicht. */
export function markiere(e: Faelle, fall: string, spalte: string, von: number, bis: number) {
  const text = textVon(e, fall, spalte);
  let a = Math.min(von, bis), b = Math.max(von, bis);
  while (a < b && /\s/.test(text[a]!)) a++;
  while (b > a && /\s/.test(text[b - 1]!)) b--;
  if (b <= a) return;
  const k = zitatSchluessel(fall, spalte);
  e.zustand.zitate[k] = vereine([...(e.zustand.zitate[k] ?? []), { von: a, bis: b, text: '' }], text);
}
export function markiereGanz(e: Faelle, fall: string, spalte: string) { markiere(e, fall, spalte, 0, textVon(e, fall, spalte).length); }
export function entmarkiere(e: Faelle, fall: string, spalte: string, stelle: number) {
  const k = zitatSchluessel(fall, spalte), l = (e.zustand.zitate[k] ?? []).filter((_, i) => i !== stelle);
  if (l.length) e.zustand.zitate[k] = l; else delete e.zustand.zitate[k];
}
export const markierungen = (e: Faelle, fall: string, spalte: string): Zitat[] => e.zustand.zitate[zitatSchluessel(fall, spalte)] ?? [];
/** Die Zelle in Stücke teilen (markiert oder nicht) - für die Anzeige. `marke` ist die Nummer der Markierung, −1 für unmarkierten Text. */
export function zelleInStuecken(text: string, stellen: Zitat[]): { t: string; marke: number }[] {
  const aus: { t: string; marke: number }[] = [];
  let p = 0;
  stellen.forEach((r, i) => { if (r.von > p) aus.push({ t: text.slice(p, r.von), marke: -1 }); aus.push({ t: text.slice(r.von, r.bis), marke: i }); p = r.bis; });
  if (p < text.length || !aus.length) aus.push({ t: text.slice(p), marke: -1 });
  return aus;
}
export interface GruppenZitat { fall: string; kennung: string; spalte: string; bezeichnung: string; text: string }
/** Alle markierten Zitate einer Gruppe: Fälle in der Reihenfolge der Tabelle, Textspalten in der Reihenfolge der Auswahl, Stellen nach Anfang. */
export function zitateDerGruppe(e: Faelle, g: Gruppe): GruppenZitat[] {
  return g.mitglieder.flatMap(i => {
    const f = e.faelle[i]!;
    return e.t.flatMap(sp => markierungen(e, f.schluessel, sp.name).map(r => ({ fall: f.schluessel, kennung: f.kennung, spalte: sp.name, bezeichnung: sp.bezeichnung, text: r.text })));
  });
}

/* ---------- Gruppen verändern (ändert den Zustand, nicht die Fälle) ---------- */
/** Einen Fall in eine andere Gruppe verschieben. Ist das seine vorgeschlagene Gruppe, wird die Verschiebung aufgehoben. */
export function verschiebe(e: Faelle, fall: string, ziel: string) {
  const f = e.faelle.find(x => x.schluessel === fall); if (!f) return;
  const p = planVon(e);
  if (ziel === natuerlich(e, p, f)) { delete e.zustand.zuordnung[fall]; return; }
  if (!(e.zustand.eigene.includes(ziel) || (!ziel.startsWith(EIGEN) && autoName(e, p, ziel) !== null))) return;
  e.zustand.zuordnung[fall] = ziel;
}
/** Eine neue, leere Gruppe anlegen; gibt ihre Kennung zurück. */
export function neueGruppe(e: Faelle, name = ''): string {
  const n = Math.max(0, ...e.zustand.eigene.map(eigenNummer)) + 1, id = `${EIGEN}${n}`;
  e.zustand.eigene.push(id);
  if (name.trim()) e.zustand.namen[id] = name.trim();
  return id;
}
/** Eine selbst angelegte Gruppe löschen: ihre Fälle gehen zurück in die vorgeschlagenen Gruppen. Vorgeschlagene Gruppen lassen sich nicht löschen. */
export function loescheGruppe(e: Faelle, id: string) {
  if (!e.zustand.eigene.includes(id)) return;
  e.zustand.eigene = e.zustand.eigene.filter(x => x !== id);
  delete e.zustand.namen[id]; delete e.zustand.notizen[id];
  for (const [f, g] of Object.entries(e.zustand.zuordnung)) if (g === id) delete e.zustand.zuordnung[f];
}
/** Umbenennen; ein leerer Name stellt den Vorschlag von Statable wieder her. */
export function benenne(e: Faelle, id: string, name: string) { if (name.trim()) e.zustand.namen[id] = name.trim(); else delete e.zustand.namen[id]; }
export function notiere(e: Faelle, id: string, text: string) { if (text.trim()) e.zustand.notizen[id] = text; else delete e.zustand.notizen[id]; }
/** Die Passung einer Gruppe (unbekannte Werte aus fremden Dateien zählen als „offen“). */
export const passungVon = (z: FaelleZustand, id: string): Passung => { const p = z.passung?.[id]; return istPassung(p) ? p : 'offen'; };
export function setzePassung(e: Faelle, id: string, p: Passung) { const m = (e.zustand.passung ??= {}); if (p === 'offen') delete m[id]; else m[id] = p; if (!Object.keys(m).length) delete e.zustand.passung; }
export function setzeMetaInferenz(e: Faelle, id: string, text: string) { const m = (e.zustand.metaInferenz ??= {}); if (text.trim()) m[id] = text; else delete m[id]; if (!Object.keys(m).length) delete e.zustand.metaInferenz; }
/** Zählung der Passung über die Gruppen mit Fällen: nur Zahlen, keine Bewertung. */
export function zaehlePassung(gruppen: Gruppe[]): Record<Passung, number> {
  const r: Record<Passung, number> = { bestaetigung: 0, erweiterung: 0, widerspruch: 0, offen: 0 };
  for (const g of gruppen) if (g.mitglieder.length > 0) r[g.passung]++;
  return r;
}
/** Zurück zum Vorschlag: alle Verschiebungen weg (Namen, Notizen und eigene Gruppen bleiben). */
export function verschiebungenAufheben(e: Faelle) { e.zustand.zuordnung = {}; }

/* ---------- Sortieren (nur Anzeige) ---------- */
export type SortSpalte = { art: 'kennung' } | { art: 'gruppe' } | { art: 'q'; i: number } | { art: 't'; i: number };
/** Die Fälle (Stellen) sortiert; Lücken stehen am Ende (auch abwärts), Zahlen zählen als Zahlen, Text nach Alphabet; gleiche Werte bleiben in der alten Reihenfolge. */
export function sortiere(e: Faelle, stellen: number[], nach: SortSpalte | null, abwaerts: boolean, gruppeVon: (i: number) => string): number[] {
  if (!nach) return stellen;
  const wert = (i: number): Wert => { const f = e.faelle[i]!; return nach.art === 'kennung' ? f.kennung : nach.art === 'gruppe' ? gruppeVon(i) : nach.art === 'q' ? f.q[nach.i]! : f.t[nach.i]! === '' ? null : f.t[nach.i]!; };
  const kennungZahl = nach.art === 'kennung' && e.faelle.every(f => /^\d+$/.test(f.kennung));
  const sig = (a: Wert, b: Wert) => (typeof a === 'number' && typeof b === 'number' ? a - b : String(a).localeCompare(String(b), 'de', { numeric: true }));
  return [...stellen].sort((a, b) => {
    const x = kennungZahl ? Number(wert(a)) : wert(a), y = kennungZahl ? Number(wert(b)) : wert(b);
    if (x === null || y === null) return x === y ? a - b : x === null ? 1 : -1;
    const c = sig(x, y);
    return (abwaerts ? -c : c) || a - b;
  });
}
