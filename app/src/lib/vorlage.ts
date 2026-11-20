/**
 * Vorlage (Abschnitt 6, Teil B): die Schritte und Auswertungen eines Projekts - ohne Daten - als Datei `.statable-vorlage`, und die Prüfung vor dem Anwenden auf eine neue Datei.
 * Reine Logik ohne Oberfläche und ohne Engine (die Läufe selbst: lib/vorlage.svelte.ts).
 *
 * Wie die Schritte gespeichert werden: als strukturierte Angaben (`Wiederhol` in lib/protokoll.ts), nicht als freie Syntax. PSPP-Schritte tragen eine Liste einzeiliger Befehle, die
 * `pruefeSyntax` bei jedem Speichern und bei jedem Lesen streng prüft (erlaubte Befehle, Zeichenketten nach den PSPP-Regeln, keine Dateibezüge). Alles andere (Sortieren, Spalte entfernen,
 * Lesart) sind kleine Angaben, die über dieselben Funktionen laufen wie von Hand. Eine Vorlagendatei ist fremde Eingabe: Namen gehen durch `psppNameOk`, Texte erreichen R nie.
 */
import type { Blatt } from './sitzung.svelte';
import type { MehrfachSet } from './mehrfach';
import type { Skala } from './skalen';
import { leseRegeln, type Regel } from './plausibel';
import { gilt, leseWiederhol, pruefeSyntax, type NichtGrund, type ProtokollEintrag, type SpaltenArt, type Art, type Wiederhol, istPruefsumme } from './protokoll';
import { psppNameOk } from './befehlstext';
import { gewichtAus, namenPruefen } from './projektdatei';
import { werteVon } from './blatttitel';
import { istSetName } from './mehrfach';

export const VORLAGE_FORMAT = 'statable-vorlage';
export const VORLAGE_VERSION = 1;
export const VORLAGE_ENDUNG = '.statable-vorlage';
export const VORLAGE_MAX_BYTES = 20 * 1024 * 1024;

export interface VorlageSchritt { nr: number; art: Art; spalten: string[]; wiederhol?: Wiederhol; nicht?: NichtGrund; werte?: boolean; liest?: Record<string, SpaltenArt>; erzeugt?: string[] }
/** Eine Auswertung ohne Ergebnis: nur, womit sie gerechnet wird und wie sie eingestellt ist, dazu die Notiz der Person. */
export type VorlageBlatt = Partial<Omit<Blatt, 'items' | 'ergebnis' | 'syntax' | 'stand' | 'gewicht' | 'kat' | 'faelle' | 'gesperrt' | 'fehler' | 'id'>> & { titel: string; art: string };
export interface Vorlage {
  format: typeof VORLAGE_FORMAT; version: number; name: string; zeit: number;
  /** Die Spalten der Datei, mit der die Vorlage gemacht wurde (Name, Art) - nur Namen, keine Werte. */
  ursprung: { name: string; art: SpaltenArt }[];
  /** Die Spalten, die die Schritte und Auswertungen aus der Datei brauchen. */
  eingang: Record<string, SpaltenArt>;
  schritte: VorlageSchritt[];
  blaetter: VorlageBlatt[];
  sets: MehrfachSet[]; skalen: Skala[];
  /** Plausibilitätsregeln des Projekts (Abschnitt 4): Regeln über Spaltennamen, keine Werte aus den Daten außer denen, die die Person als erlaubte Werte eingegeben hat; fehlt in älteren Vorlagen */
  plausi?: Regel[];
  /** Beim Speichern ausgelassen: Auswertungen, die Texte oder Ergebnisse der Daten tragen. */
  ausgelassen: number;
  /** Das Protokoll des Projekts begann erst mit dieser Fassung: frühere Änderungen kennt die Vorlage nicht. */
  luecke: boolean;
}

/** Arten von Auswertungen, die Texte oder Eingaben aus den Daten tragen und darum nicht in eine Vorlage kommen. */
const BLATT_NICHT = new Set(['befehle', 'meta', 'kategorien', 'faelle', 'tabelle', 'amtlich']);

const plain = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x);
const kopieJson = <T>(x: T, maxLaenge = 100_000): T | undefined => { try { const t = JSON.stringify(x); return t.length <= maxLaenge ? JSON.parse(t) as T : undefined; } catch { return undefined; } };

/* ------------------------------------------------------------------------------------------------------------------------------- Speichern */
export interface SpeicherHinweise {
  /** Schritte, die sich nicht wiederholen lassen (sie stehen in der Vorlage als „nicht wiederholbar“). */
  nichtWiederholbar: { nr: number; art: Art; nicht: NichtGrund }[];
  /** Schritte mit Text-Werten, die die Person als Regel eingegeben hat. */
  mitWerten: number;
  ausgelassen: number;
  luecke: boolean;
  schritte: number; blaetter: number;
}

export function baueVorlage(eintraege: readonly ProtokollEintrag[], daten: { spalten: readonly { name: string; art: SpaltenArt }[] }, blaetter: readonly Blatt[], sets: readonly MehrfachSet[], skalen: readonly Skala[], name: string, luecke: boolean, zeit: number, plausi: readonly Regel[] = []): { vorlage: Vorlage; hinweise: SpeicherHinweise } {
  const aktiv = eintraege.filter(gilt);
  const schritte: VorlageSchritt[] = aktiv.map((e, i) => ({
    nr: i + 1, art: e.art, spalten: e.spalten.slice(0, 500),
    ...(e.nicht ? { nicht: e.nicht } : e.wiederhol ? { wiederhol: e.wiederhol } : { nicht: 'art' as NichtGrund }),
    ...(e.werte ? { werte: true } : {}), ...(e.liest ? { liest: e.liest } : {}), ...(e.erzeugt ? { erzeugt: e.erzeugt } : {})
  }));
  // Ursprung: die Spalten vor dem ersten Schritt = was der erste Schritt sah; ohne Schritte die jetzigen. Genauer: jetzige Spalten ohne die, die Schritte erzeugt haben, plus die, die sie entfernt haben.
  const erzeugtAlle = new Set(schritte.flatMap(s => s.erzeugt ?? []).map(x => x.toLowerCase()));
  const ursprungArt = new Map<string, SpaltenArt>();
  for (const s of schritte) for (const [k, a] of Object.entries(s.liest ?? {})) if (!ursprungArt.has(k.toLowerCase())) ursprungArt.set(k.toLowerCase(), a);
  const ursprung: { name: string; art: SpaltenArt }[] = [];
  const gesehen = new Set<string>();
  for (const sp of daten.spalten) if (!erzeugtAlle.has(sp.name.toLowerCase())) { ursprung.push({ name: sp.name, art: ursprungArt.get(sp.name.toLowerCase()) ?? sp.art }); gesehen.add(sp.name.toLowerCase()); }
  for (const s of schritte) for (const [k, a] of Object.entries(s.liest ?? {})) if (!gesehen.has(k.toLowerCase()) && !erzeugtAlle.has(k.toLowerCase())) { ursprung.push({ name: k, art: a }); gesehen.add(k.toLowerCase()); }

  // Eingang: Spalten, die ein Schritt liest, bevor ein früherer Schritt sie erzeugt hat
  const eingang: Record<string, SpaltenArt> = {};
  const erzeugtBisher = new Set<string>();
  for (const s of schritte) {
    for (const [k, a] of Object.entries(s.liest ?? {})) if (!erzeugtBisher.has(k.toLowerCase()) && !Object.keys(eingang).some(x => x.toLowerCase() === k.toLowerCase())) eingang[k] = a;
    for (const k of s.erzeugt ?? []) erzeugtBisher.add(k.toLowerCase());
  }
  // Die Auswertungen brauchen ebenfalls Spalten aus der Datei
  const artJetzt = new Map(daten.spalten.map(sp => [sp.name.toLowerCase(), sp.art]));
  let ausgelassen = 0;
  const bl: VorlageBlatt[] = [];
  for (const b of blaetter) {
    if (BLATT_NICHT.has(b.art) || b.kat || b.faelle) { ausgelassen++; continue; }
    const v = blattFuerVorlage(b); if (!v) { ausgelassen++; continue; }
    bl.push(v);
    const w = werteVon(b);
    for (const n of [...w.l1, ...w.l2, ...w.l3, ...w.l4]) {
      const spalten = istSetName(n) ? (sets.find(x => '$' + x.name === n)?.spalten ?? []) : [n];
      for (const sp of spalten) {
        if (!sp || erzeugtBisher.has(sp.toLowerCase()) || Object.keys(eingang).some(x => x.toLowerCase() === sp.toLowerCase())) continue;
        const a = artJetzt.get(sp.toLowerCase()); if (a && psppNameOk(sp)) eingang[sp] = ursprungArt.get(sp.toLowerCase()) ?? a;
      }
    }
  }
  const vorlage: Vorlage = {
    format: VORLAGE_FORMAT, version: VORLAGE_VERSION, name: name.slice(0, 120), zeit, ursprung: ursprung.slice(0, 5000), eingang, schritte, blaetter: bl,
    sets: sets.filter(x => x && Array.isArray(x.spalten)).map(x => kopieJson(x)).filter((x): x is MehrfachSet => !!x),
    skalen: skalen.map(x => kopieJson(x)).filter((x): x is Skala => !!x), ausgelassen, luecke,
    ...(plausi.length ? { plausi: leseRegeln(JSON.parse(JSON.stringify(plausi))) } : {})
  };
  const hinweise: SpeicherHinweise = {
    nichtWiederholbar: schritte.flatMap(s => (s.nicht ? [{ nr: s.nr, art: s.art, nicht: s.nicht }] : [])),
    mitWerten: schritte.filter(s => s.werte).length, ausgelassen, luecke, schritte: schritte.length, blaetter: bl.length
  };
  return { vorlage, hinweise };
}

/** Die Felder einer Auswertung, die in die Vorlage dürfen: Einstellungen und die Notiz, nie Ergebnisse, Befehlstext, Fallgewicht-Abdruck oder Texte aus Daten. */
function blattFuerVorlage(b: Blatt): VorlageBlatt | null {
  const o: Record<string, unknown> = { titel: String(b.titel ?? '').slice(0, 200), art: b.art, l1: b.l1 ?? null, l2: b.l2 ?? null, imBericht: b.imBericht === true, notiz: String(b.notiz ?? '').slice(0, 20_000), zeit: b.zeit };
  if (b.l3) o.l3 = b.l3;
  for (const k of ['kursZiel', 'dg', 'dv', 'gestalt', 'pivot', 'zus', 'weg', 'mv', 'rangOpt'] as const) { const v = (b as unknown as Record<string, unknown>)[k]; if (v !== undefined) { const c = kopieJson(v); if (c !== undefined) o[k] = c; } }
  for (const k of ['ph', 'rangArt'] as const) { const v = b[k]; if (typeof v === 'string') o[k] = v; }
  for (const k of ['rang', 'roc'] as const) if (b[k] === true) o[k] = true;
  return o as unknown as VorlageBlatt;
}

/** Aus einer Auswertung der Vorlage ein Blatt ohne Ergebnis; „veraltet“ (Stand `vorlage`), damit es beim Öffnen oder mit „Alle rechnen“ neu gerechnet wird. */
export function blattAusVorlage(v: VorlageBlatt, id: string, jetzt: number): Blatt {
  const b: Record<string, unknown> = { ...v, id, syntax: '', items: [], ergebnis: null, stand: 'vorlage', zeit: jetzt };
  return b as unknown as Blatt;
}

export const vorlageAlsText = (v: Vorlage) => JSON.stringify(v);
export const vorlageDateiname = (name: string) => (name || 'Statable').replace(/[\\/:*?"<>|]+/g, '').replace(/\s+/g, ' ').trim().slice(0, 80) + VORLAGE_ENDUNG;

/* ------------------------------------------------------------------------------------------------------------------------------- Lesen (fremde Eingabe) */
export type VorlageLesen = { ok: true; vorlage: Vorlage } | { ok: false; grund: 'unlesbar' | 'neuer' | 'zu-gross' };
const art = (a: unknown): a is SpaltenArt => a === 'zahl' || a === 'text' || a === 'datum';
const str = (x: unknown, max: number) => (typeof x === 'string' ? x.slice(0, max) : '');
const gewichtLesen = (g: unknown) => gewichtAus(g);

/** Liest den Text einer Vorlagendatei. Was nicht passt, wird verworfen oder als „nicht wiederholbar“ gekennzeichnet; ein Absturz ist ausgeschlossen. */
export function leseVorlage(text: string): VorlageLesen {
  if (typeof text !== 'string') return { ok: false, grund: 'unlesbar' };
  if (text.length > VORLAGE_MAX_BYTES) return { ok: false, grund: 'zu-gross' };
  let o: unknown;
  try { o = JSON.parse(text); } catch { return { ok: false, grund: 'unlesbar' }; }
  if (!plain(o) || o.format !== VORLAGE_FORMAT) return { ok: false, grund: 'unlesbar' };
  if (typeof o.version !== 'number' || !Number.isFinite(o.version)) return { ok: false, grund: 'unlesbar' };
  if (o.version > VORLAGE_VERSION) return { ok: false, grund: 'neuer' };
  if (!Array.isArray(o.schritte) || !Array.isArray(o.blaetter) || !plain(o.eingang)) return { ok: false, grund: 'unlesbar' };
  if (o.schritte.length > 5000 || o.blaetter.length > 1000) return { ok: false, grund: 'zu-gross' };
  const NICHT: NichtGrund[] = ['zeilen', 'aus-daten', 'zweite-datei', 'befehl', 'fehler', 'neu', 'art', 'zu-lang'];
  const schritte: VorlageSchritt[] = [];
  for (const r of o.schritte as unknown[]) {
    if (!plain(r)) return { ok: false, grund: 'unlesbar' };
    const a = str(r.art, 30) as Art;
    const s: VorlageSchritt = { nr: schritte.length + 1, art: a || 'befehl', spalten: Array.isArray(r.spalten) ? r.spalten.filter((x): x is string => typeof x === 'string').map(x => x.slice(0, 200)).slice(0, 500) : [] };
    const w = leseWiederhol(r.wiederhol, psppNameOk, gewichtLesen);
    if (w && !r.nicht) s.wiederhol = w;
    else s.nicht = NICHT.includes(r.nicht as NichtGrund) ? (r.nicht as NichtGrund) : 'befehl';   // beschädigt oder nicht erlaubt: gesperrt, nie still ausgelassen
    if (r.werte === true) s.werte = true;
    if (plain(r.liest)) { const l: Record<string, SpaltenArt> = {}; for (const [k, v] of Object.entries(r.liest).slice(0, 2000)) if (art(v) && psppNameOk(k)) l[k] = v; s.liest = l; }
    if (Array.isArray(r.erzeugt)) s.erzeugt = r.erzeugt.filter(psppNameOk).slice(0, 2000);
    schritte.push(s);
  }
  const eingang: Record<string, SpaltenArt> = {};
  for (const [k, v] of Object.entries(o.eingang).slice(0, 5000)) { if (psppNameOk(k) && art(v)) eingang[k] = v; else return { ok: false, grund: 'unlesbar' }; }
  const ursprung = Array.isArray(o.ursprung) ? (o.ursprung as unknown[]).flatMap(x => (plain(x) && psppNameOk(x.name) && art(x.art) ? [{ name: x.name, art: x.art }] : [])).slice(0, 5000) : [];
  const blaetter: VorlageBlatt[] = [];
  for (const b of o.blaetter as unknown[]) {
    if (!plain(b) || typeof b.titel !== 'string' || typeof b.art !== 'string' || !/^[a-z0-9_-]{1,40}$/i.test(b.art) || BLATT_NICHT.has(b.art)) continue;
    const nb = namenPruefen({ l1: b.l1, l2: b.l2, l3: b.l3 } as { l1?: unknown; l2?: unknown; l3?: unknown }) as Record<string, unknown>;
    const v: Record<string, unknown> = { titel: b.titel.slice(0, 200), art: b.art, l1: nb.l1 ?? null, l2: nb.l2 ?? null, imBericht: b.imBericht === true, notiz: str(b.notiz, 20_000), zeit: typeof b.zeit === 'number' ? b.zeit : 0 };
    if (nb.l3 !== undefined) v.l3 = nb.l3;
    for (const k of ['kursZiel', 'dg', 'dv', 'gestalt', 'pivot', 'zus', 'weg', 'mv', 'rangOpt']) if (b[k] !== undefined && (plain(b[k]) || typeof b[k] === 'string')) { const c = kopieJson(b[k]); if (c !== undefined) v[k] = c; }
    for (const k of ['ph', 'rangArt']) if (typeof b[k] === 'string') v[k] = (b[k] as string).slice(0, 40);
    for (const k of ['rang', 'roc']) if (b[k] === true) v[k] = true;
    blaetter.push(v as unknown as VorlageBlatt);
  }
  const sets = Array.isArray(o.sets) ? (o.sets as unknown[]).flatMap(x => (plain(x) && typeof x.name === 'string' && Array.isArray(x.spalten) ? [{ ...kopieJson(x)!, spalten: (x.spalten as unknown[]).filter(psppNameOk) } as unknown as MehrfachSet] : [])) : [];
  const skalen = Array.isArray(o.skalen) ? (o.skalen as unknown[]).flatMap(x => (plain(x) && typeof x.name === 'string' && Array.isArray(x.fragen) && x.fragen.every(f => typeof f === 'string') ? [kopieJson(x) as unknown as Skala] : [])) : [];
  return {
    ok: true, vorlage: {
      format: VORLAGE_FORMAT, version: o.version, name: str(o.name, 120) || 'Vorlage', zeit: typeof o.zeit === 'number' ? o.zeit : 0, ursprung, eingang, schritte, blaetter, sets, skalen,
      ausgelassen: typeof o.ausgelassen === 'number' ? Math.max(0, Math.floor(o.ausgelassen)) : 0, luecke: o.luecke === true,
      ...(leseRegeln(o.plausi).length ? { plausi: leseRegeln(o.plausi) } : {})
    }
  };
}

/* ------------------------------------------------------------------------------------------------------------------------------- RECODE lesen */
export interface RecodeKlausel { einzel: (string | number)[]; bereiche: [number, number][]; missing: boolean; sysmis: boolean; sonst: boolean; kopie: boolean }
export interface RecodeLesung { vars: string[]; klauseln: RecodeKlausel[]; sonst: boolean; into: boolean }

/** Liest einen RECODE-Befehl (eine Zeile, mit Punkt). `null`, wenn er sich nicht sicher lesen lässt (Zeichenketten mit Hex oder Verkettung, Bereiche mit Zeichenketten …). */
export function leseRecode(befehl: string): RecodeLesung | null {
  const m = /^RECODE\s+([\s\S]*?)\.?$/i.exec(befehl.trim()); if (!m) return null;
  const t = m[1]!;
  const kopf = /^([^(]*)\(/.exec(t); if (!kopf) return null;
  const vars = kopf[1]!.trim().split(/\s+/).filter(Boolean);
  if (!vars.length || vars.some(v => /^(INTO|TO)$/i.test(v))) return null;
  let i = kopf[1]!.length;
  const klauseln: RecodeKlausel[] = [];
  let sonst = false;
  while (t[i] === '(') {
    // bis zur passenden Klammer, Zeichenketten überspringen
    let j = i + 1, tiefe = 1, links = '', gefunden = false;
    for (; j < t.length && tiefe > 0; j++) {
      const c = t[j]!;
      if (c === "'" || c === '"') { let k = j + 1; for (; k < t.length; k++) { if (t[k] === c) { if (t[k + 1] === c) { k++; continue; } break; } } if (!gefunden) links += t.slice(j, k + 1); j = k; continue; }
      if (c === '(') tiefe++;
      else if (c === ')') { tiefe--; if (!tiefe) break; }
      else if (c === '=' && tiefe === 1 && !gefunden) { gefunden = true; continue; }
      if (!gefunden) links += c;
    }
    if (!gefunden || tiefe !== 0) return null;
    const k: RecodeKlausel = { einzel: [], bereiche: [], missing: false, sysmis: false, sonst: false, kopie: false };
    const toks = links.match(/'(?:[^']|'')*'|"(?:[^"]|"")*"|[^\s,]+/g) ?? [];
    for (let q = 0; q < toks.length; q++) {
      const w = toks[q]!, W = w.toUpperCase();
      if (/^X['"]/i.test(w) || w === '+') return null;
      if (W === 'ELSE') { k.sonst = true; sonst = true; continue; }
      if (W === 'MISSING') { k.missing = true; continue; }
      if (W === 'SYSMIS') { k.sysmis = true; continue; }
      if (W === 'COPY') { k.kopie = true; continue; }
      const num = (x: string | undefined): number | null => { if (!x) return null; const X = x.toUpperCase(); if (X === 'LO' || X === 'LOWEST') return -Infinity; if (X === 'HI' || X === 'HIGHEST') return Infinity; return /^[+-]?(\d+\.?\d*|\.\d+)(E[+-]?\d+)?$/i.test(x) ? Number(x) : null; };
      if (toks[q + 1]?.toUpperCase() === 'THRU') {
        const lo = num(w), hi = num(toks[q + 2]); if (lo === null || hi === null) return null;
        k.bereiche.push([lo, hi]); q += 2; continue;
      }
      if (/^['"]/.test(w)) { const q0 = w[0]!; k.einzel.push(w.slice(1, -1).split(q0 + q0).join(q0)); continue; }
      const nn = num(w); if (nn === null) return null;
      k.einzel.push(nn);
    }
    klauseln.push(k);
    i = j + 1;
    while (/\s/.test(t[i] ?? '')) i++;
  }
  const rest = t.slice(i).trim();
  if (rest && !/^INTO\b/i.test(rest)) return null;
  return { vars, klauseln, sonst, into: /^INTO\b/i.test(rest) };
}

/** Passt der Wert zu einer der Klauseln? (Text ohne nachgestellte Leerzeichen, wie PSPP.) */
export function recodeKennt(l: RecodeLesung, wert: string | number): boolean {
  if (l.sonst) return true;
  const w = typeof wert === 'string' ? wert.replace(/\s+$/, '') : wert;
  return l.klauseln.some(k => k.einzel.some(e => (typeof e === 'string' ? e.replace(/\s+$/, '') : e) === w) || (typeof w === 'number' && k.bereiche.some(([lo, hi]) => w >= lo && w <= hi)));
}

/* ------------------------------------------------------------------------------------------------------------------------------- Prüfung vor dem Anwenden */
export type PruefArt = 'fehlt' | 'andere-art' | 'nicht-wiederholbar' | 'lesart' | 'neue-spalte' | 'neue-kategorie' | 'kategorie-fehlt' | 'zuordnung-kollision';
export interface PruefPunkt {
  stufe: 'sperre' | 'warnung' | 'hinweis'; art: PruefArt;
  spalte?: string; schritt?: number; schrittArt?: Art; nicht?: NichtGrund;
  /** Anzahl Zeilen (neue Kategorie) bzw. Kategorien (fehlt) bzw. Spalten (neue Spalte). */
  anzahl?: number;
  erwartet?: SpaltenArt; ist?: SpaltenArt;
  /** Nur für die Anzeige der Person (kommt aus ihren Daten, wird nie gespeichert): die ersten Werte. */
  beispiele?: (string | number)[];
}
export interface Pruefung { punkte: PruefPunkt[]; sperren: number; warnungen: number; hinweise: number; zeilenNeueKategorien: number; fehlend: { name: string; art: SpaltenArt }[]; neueSpalten: string[] }
export interface DatenSicht { spalten: readonly { name: string; art: SpaltenArt }[]; zeilen: readonly (readonly (string | number | null)[])[] }

/**
 * Die Prüfung vor jeder Änderung (Tabelle im Fachblatt). `zuordnung`: Name in der Vorlage → Name in den Daten (für fehlende Spalten).
 * `kopfzeilen`: die Kopfzeile der eingelesenen Tabelle (nur für Schritte der Art „Lesart“); `null` = die Datei ist keine Tabelle.
 */
export function pruefeVorlage(v: Vorlage, d: DatenSicht, zuordnung: Record<string, string> = {}, kopfzeilen: readonly string[] | null = null): Pruefung {
  const punkte: PruefPunkt[] = [];
  const idx = new Map(d.spalten.map((s, i) => [s.name.toLowerCase(), i]));
  const aufgeloest = (n: string) => zuordnung[n] ?? n;
  const fehlend: { name: string; art: SpaltenArt }[] = [];
  for (const s of v.schritte) if (s.nicht) punkte.push({ stufe: 'sperre', art: 'nicht-wiederholbar', schritt: s.nr, schrittArt: s.art, nicht: s.nicht });
  for (const s of v.schritte) {
    if (s.wiederhol?.typ === 'lesart' && !(kopfzeilen && kopfzeilen.includes(s.wiederhol.kopf))) punkte.push({ stufe: 'sperre', art: 'lesart', schritt: s.nr, schrittArt: s.art, spalte: s.wiederhol.kopf });
  }
  for (const [name, erwartet] of Object.entries(v.eingang)) {
    const i = idx.get(aufgeloest(name).toLowerCase());
    if (i === undefined) { punkte.push({ stufe: 'sperre', art: 'fehlt', spalte: name, erwartet }); fehlend.push({ name, art: erwartet }); continue; }
    const ist = d.spalten[i]!.art;
    if (ist !== erwartet) punkte.push({ stufe: 'sperre', art: 'andere-art', spalte: name, erwartet, ist });
  }
  // Zuordnung: zwei Spalten der Vorlage dürfen nicht dieselbe Spalte der Datei meinen, und ein Name der Vorlage darf nicht schon als andere Spalte da sein
  const ziele = new Set(Object.values(zuordnung).map(x => x.toLowerCase()));
  const benutzt = new Set<string>();
  for (const [von, nach] of Object.entries(zuordnung)) {
    if (benutzt.has(nach.toLowerCase()) || (idx.has(von.toLowerCase()) && von.toLowerCase() !== nach.toLowerCase())) punkte.push({ stufe: 'sperre', art: 'zuordnung-kollision', spalte: von });
    benutzt.add(nach.toLowerCase());
  }
  const bekannt = new Set([...v.ursprung.map(x => x.name.toLowerCase()), ...Object.keys(v.eingang).map(x => x.toLowerCase()), ...ziele]);
  const neue = d.spalten.filter(s => !bekannt.has(s.name.toLowerCase())).map(s => s.name);
  if (neue.length) punkte.push({ stufe: 'hinweis', art: 'neue-spalte', anzahl: neue.length });
  // Kategorien: nur für Spalten, die bis zum Schritt aus der Datei stammen und noch nicht verändert wurden
  const veraendert = new Set<string>();
  let zeilenNeu = 0;
  for (const s of v.schritte) {
    if (s.wiederhol?.typ === 'syntax' && !s.nicht) {
      for (const b of s.wiederhol.befehle) {
        if (!/^RECODE\b/i.test(b)) continue;
        const l = leseRecode(b); if (!l) continue;
        for (const name of l.vars) {
          const i = idx.get(aufgeloest(name).toLowerCase());
          if (i === undefined || veraendert.has(name.toLowerCase())) continue;
          const spalte = d.spalten[i]!;
          const zaehl = new Map<string | number, number>();
          for (const z of d.zeilen) { const w = z[i]; if (w === null || w === undefined || (typeof w === 'string' && w.trim() === '')) continue; zaehl.set(w, (zaehl.get(w) ?? 0) + 1); }
          const unbekannt = [...zaehl].filter(([w]) => !recodeKennt(l, w));
          const zeilen = unbekannt.reduce((a, [, n]) => a + n, 0);
          if (unbekannt.length) { zeilenNeu += zeilen; punkte.push({ stufe: 'warnung', art: 'neue-kategorie', spalte: name, schritt: s.nr, anzahl: zeilen, beispiele: unbekannt.slice(0, 5).map(([w]) => w) }); }
          // Kategorien, die der Schritt kennt und die in den Daten fehlen (nur Einzelwerte)
          const kenntEinzel = new Set(l.klauseln.flatMap(k => k.einzel).map(e => (typeof e === 'string' ? e.replace(/\s+$/, '') : e)));
          const da = new Set([...zaehl.keys()].map(w => (typeof w === 'string' ? w.replace(/\s+$/, '') : w)));
          const weg = [...kenntEinzel].filter(e => !da.has(e)).length;
          if (weg && spalte) punkte.push({ stufe: 'hinweis', art: 'kategorie-fehlt', spalte: name, schritt: s.nr, anzahl: weg });
        }
      }
    }
    for (const n of [...s.spalten, ...(s.erzeugt ?? [])]) veraendert.add(n.toLowerCase());
  }
  const zaehle = (st: PruefPunkt['stufe']) => punkte.filter(p => p.stufe === st).length;
  return { punkte, sperren: zaehle('sperre'), warnungen: zaehle('warnung'), hinweise: zaehle('hinweis'), zeilenNeueKategorien: zeilenNeu, fehlend, neueSpalten: neue };
}

export { istPruefsumme };
