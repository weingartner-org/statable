/**
 * Prototyp Kodier-Arbeitsplatz (Stufe 6a): reine Logik. Sätze und Absätze, Auswahl-Umrechnung, Kodieren, Belege.
 * Positionen sind Codepoints ab 0, Ende exklusiv (Architekturblatt). Alle Funktionen, die das Projekt ändern, geben ein NEUES Objekt zurück.
 * Sollwerte: docs/erheben/FACHBLATT-STUFE-6A.md.
 */
import { mitCodeProtokoll } from './codebuch-protokoll';
import { cpTeil, cpZuUtf16, positionsKarte, utf16ZuCp, type Code, type Memo, type MemoArt, type QualProjekt, type Variable } from './qualprojekt';

export interface Einheit { start: number; ende: number; text: string; nr: number }

interface Stueck { u0: number; u1: number }

/** Zerlegt `text` (UTF-16-Spanne `[a, b)`) an Zeilenumbrüchen. */
function zeilen(text: string): Stueck[] {
  const aus: Stueck[] = [];
  let a = 0;
  const re = /\r\n|\r|\n/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) { aus.push({ u0: a, u1: m.index }); a = m.index + m[0].length; }
  aus.push({ u0: a, u1: text.length });
  return aus;
}

const leer = (c: string): boolean => /\s/.test(c);

function kuerze(text: string, s: Stueck): Stueck | null {
  let { u0, u1 } = s;
  while (u0 < u1 && leer(text[u0]!)) u0++;
  while (u1 > u0 && leer(text[u1 - 1]!)) u1--;
  return u1 > u0 ? { u0, u1 } : null;
}

function inEinheiten(text: string, stuecke: Stueck[]): Einheit[] {
  const karte = positionsKarte(text);
  return stuecke.map((s, i) => ({ start: utf16ZuCp(karte, s.u0), ende: utf16ZuCp(karte, s.u1), text: text.slice(s.u0, s.u1), nr: i + 1 }));
}

/** Abkürzungen, nach denen kein Satz endet (Fachblatt 6b, 1.2). Nicht dabei: usw., etc., S., no. (enden oft einen Satz). */
export const ABKUERZUNGEN: { de: string[]; en: string[] } = {
  de: ['z. B.', 'z.B.', 'd. h.', 'd.h.', 'u. a.', 'u.a.', 'bzw.', 'ca.', 'vgl.', 'ggf.', 'evtl.', 'inkl.', 'Dr.', 'Prof.', 'Hr.', 'Fr.', 'Nr.', 'Abb.', 'Tab.'],
  en: ['e.g.', 'i.e.', 'Mr.', 'Mrs.', 'Ms.', 'Dr.', 'Prof.', 'vs.', 'cf.', 'approx.', 'Fig.'],
};
const VOR_ABK = /[\s("'„“‚‘»«]/;

/** Hebt Satzgrenzen auf, deren letztes Nicht-Leerzeichen in einem Vorkommen einer Abkürzung liegt. */
function ohneAbkuerzungsgrenzen(text: string, teile: Stueck[], sprache: string): Stueck[] {
  if (teile.length < 2) return teile;
  const sp = sprache.toLowerCase();
  const liste = sp.startsWith('en') ? ABKUERZUNGEN.en : sp.startsWith('de') ? ABKUERZUNGEN.de : [...new Set([...ABKUERZUNGEN.de, ...ABKUERZUNGEN.en])];
  const maske = new Uint8Array(text.length);
  for (const a of liste) {
    let i = text.indexOf(a);
    while (i >= 0) {
      if (i === 0 || VOR_ABK.test(text[i - 1]!)) maske.fill(1, i, i + a.length);
      i = text.indexOf(a, i + 1);
    }
  }
  const aus: Stueck[] = [{ ...teile[0]! }];
  for (let k = 1; k < teile.length; k++) {
    const vor = aus[aus.length - 1]!;
    let p = vor.u1 - 1;
    while (p >= vor.u0 && leer(text[p]!)) p--;
    if (p >= vor.u0 && maske[p]) vor.u1 = teile[k]!.u1; else aus.push({ ...teile[k]! });
  }
  return aus;
}

/** Sätze nach Intl.Segmenter; kein Satz geht über einen Zeilenumbruch, Leerzeichen am Rand gehören nicht dazu. Nach bekannten Abkürzungen endet kein Satz. */
export function saetze(text: string, sprache: string): Einheit[] {
  if (!text) return [];
  let teile: Stueck[];
  try {
    const seg = new Intl.Segmenter(sprache, { granularity: 'sentence' });
    teile = ohneAbkuerzungsgrenzen(text, [...seg.segment(text)].map(x => ({ u0: x.index, u1: x.index + x.segment.length })), sprache);
  } catch { teile = [{ u0: 0, u1: text.length }]; }
  const aus: Stueck[] = [];
  for (const t of teile) {
    for (const z of zeilen(text.slice(t.u0, t.u1))) {
      const k = kuerze(text, { u0: t.u0 + z.u0, u1: t.u0 + z.u1 });
      if (k) aus.push(k);
    }
  }
  return inEinheiten(text, aus);
}

/** Absätze: Text zwischen Zeilenumbrüchen; leere Zeilen sind kein Absatz. */
export function absaetze(text: string): Einheit[] {
  const aus = zeilen(text).filter(z => text.slice(z.u0, z.u1).trim() !== '');
  return inEinheiten(text, aus);
}

/** Die Einheit, die `cp` enthält; sonst die nächste dahinter; am Ende die letzte. */
export function einheitAn(einheiten: Einheit[], cp: number): Einheit | undefined {
  return einheiten.find(e => e.start <= cp && cp < e.ende) ?? einheiten.find(e => e.start > cp) ?? einheiten[einheiten.length - 1];
}

export function auswahlZuCp(text: string, u16Start: number, u16Ende: number): { start: number; ende: number } {
  const k = positionsKarte(text);
  return { start: utf16ZuCp(k, u16Start), ende: utf16ZuCp(k, u16Ende) };
}

export function cpZuAuswahl(text: string, start: number, ende: number): { start: number; ende: number } {
  const k = positionsKarte(text);
  return { start: cpZuUtf16(k, start), ende: cpZuUtf16(k, ende) };
}

const neueId = (): string => globalThis.crypto.randomUUID();

/** Legt Segment und Kodierung an. Gleiche Stelle und gleicher Code: nichts Neues; gleiche Stelle, anderer Code: dasselbe Segment. */
export function kodiere(q: QualProjekt, dokId: string, start: number, ende: number, codeId: string, kodierende: string): QualProjekt {
  const vorhanden = q.segmente.find(s => s.dokument === dokId && s.start === start && s.ende === ende && (s.kodierende ?? kodierende) === kodierende);
  if (vorhanden && q.kodierungen.some(k => k.segment === vorhanden.id && k.code === codeId && k.kodierende === kodierende)) return q;
  const jetzt = Date.now();
  const seg = vorhanden ?? { id: neueId(), dokument: dokId, start, ende, erstellt: jetzt, kodierende };
  return {
    ...q,
    segmente: vorhanden ? q.segmente : [...q.segmente, seg],
    kodierungen: [...q.kodierungen, { id: neueId(), segment: seg.id, code: codeId, kodierende, erstellt: jetzt }],
  };
}

const segHatMemo = (q: QualProjekt, segId: string): boolean => q.memos.some(m => m.bezug.some(b => b.art === 'segment' && b.id === segId));

/** Entfernt eine Kodierung; ein Segment ohne Kodierung und ohne Memo fällt weg. */
export function entferneKodierung(q: QualProjekt, kodierungId: string): QualProjekt {
  const k = q.kodierungen.find(x => x.id === kodierungId);
  if (!k) return q;
  const rest = q.kodierungen.filter(x => x.id !== kodierungId);
  const segBleibt = rest.some(x => x.segment === k.segment) || segHatMemo(q, k.segment);
  return { ...q, kodierungen: rest, segmente: segBleibt ? q.segmente : q.segmente.filter(s => s.id !== k.segment) };
}

/** Codes aller Segmente, die `[start, ende)` überlappen (bei leerer Spanne: die den Punkt enthalten). */
export function codesAn(q: QualProjekt, dokId: string, start: number, ende: number): Code[] {
  const treffer = q.segmente.filter(s => s.dokument === dokId && (start === ende ? s.start <= start && start < s.ende : s.start < ende && s.ende > start));
  const ids = new Set(q.kodierungen.filter(k => treffer.some(s => s.id === k.segment)).map(k => k.code));
  return q.codes.filter(c => ids.has(c.id));
}

export interface Beleg { kodierung: string; dokument: string; start: number; ende: number; text: string; absatz: number }

/** Alle Stellen zu einem Code, nach Dokument-Reihenfolge, dann Anfang. */
export function belege(q: QualProjekt, codeId: string): Beleg[] {
  const aus: (Beleg & { d: number })[] = [];
  for (const k of q.kodierungen) {
    if (k.code !== codeId) continue;
    const s = q.segmente.find(x => x.id === k.segment);
    const d = s ? q.dokumente.findIndex(x => x.id === s.dokument) : -1;
    if (!s || d < 0) continue;
    const dok = q.dokumente[d]!;
    const ab = absaetze(dok.text).find(a => a.start <= s.start && s.start < a.ende + 1);
    aus.push({ kodierung: k.id, dokument: s.dokument, start: s.start, ende: s.ende, text: cpTeil(dok.text, s.start, s.ende), absatz: ab?.nr ?? 1, d });
  }
  aus.sort((a, b) => a.d - b.d || a.start - b.start);
  return aus.map(({ d: _d, ...b }) => b);
}

/* ---------------------------------------------------------------------------------------------
 * 6b, Abschnitt 1.3 bis 1.9
 * ------------------------------------------------------------------------------------------- */

/** 1.3 Stellen aus gewählten Sätzen: aneinandergrenzende Nummern werden eine Stelle. */
export function stellenAusSaetzen(einheiten: Einheit[], nrn: Iterable<number>): { start: number; ende: number }[] {
  const nr = [...new Set(nrn)].filter(n => einheiten.some(e => e.nr === n)).sort((a, b) => a - b);
  const aus: { start: number; ende: number }[] = [];
  let von = -1, letzt = -1;
  const zu = () => {
    if (von < 0) return;
    const a = einheiten.find(e => e.nr === von), b = einheiten.find(e => e.nr === letzt);
    if (a && b) aus.push({ start: a.start, ende: b.ende });
  };
  for (const n of nr) {
    if (von >= 0 && n === letzt + 1) letzt = n; else { zu(); von = letzt = n; }
  }
  zu();
  return aus;
}

/* ---- 1.4 Code-Pfad ---- */

/** Codes in Baumreihenfolge (Tiefe zuerst, je Ebene nach `reihenfolge`); ein Code mit unbekannter `elternId` gilt als Wurzel. */
export function baumReihenfolge(codes: Code[]): { code: Code; ebene: number }[] {
  const ids = new Set(codes.map(c => c.id));
  const kinder = new Map<string | undefined, Code[]>();
  for (const c of codes) {
    const e = c.elternId !== undefined && ids.has(c.elternId) && c.elternId !== c.id ? c.elternId : undefined;
    const l = kinder.get(e) ?? []; l.push(c); kinder.set(e, l);
  }
  for (const l of kinder.values()) l.sort((a, b) => a.reihenfolge - b.reihenfolge);
  const aus: { code: Code; ebene: number }[] = [];
  const gesehen = new Set<string>();
  const gehe = (e: string | undefined, ebene: number) => {
    for (const c of kinder.get(e) ?? []) {
      if (gesehen.has(c.id)) continue;
      gesehen.add(c.id); aus.push({ code: c, ebene }); gehe(c.id, ebene + 1);
    }
  };
  gehe(undefined, 1);
  for (const c of codes) if (!gesehen.has(c.id)) { gesehen.add(c.id); aus.push({ code: c, ebene: 1 }); gehe(c.id, 2); }   // Kreise: nie einen Code verlieren
  return aus;
}

export function kodierbareCodes(codes: Code[]): Code[] { return baumReihenfolge(codes).map(e => e.code).filter(c => c.kodierbar); }

export function codePfad(codes: Code[], id: string): string {
  const namen: string[] = [];
  let c = codes.find(x => x.id === id);
  let n = 0;
  while (c && n++ < 50) { namen.unshift(c.name); const e: string | undefined = c.elternId; c = e === undefined ? undefined : codes.find(x => x.id === e); }
  return namen.join(': ');
}

/* ---- 1.5 Schnellleiste ---- */

export function schnellleiste(codes: Code[], fest: string[], zuletzt: string[]): string[] {
  const alle = kodierbareCodes(codes);
  const ok = new Set(alle.map(c => c.id));
  const aus: string[] = [];
  const nimm = (id: string) => { if (ok.has(id) && !aus.includes(id)) aus.push(id); };
  fest.forEach(nimm); zuletzt.forEach(nimm);
  for (const c of alle) nimm(c.id);
  return aus.slice(0, 9);
}

/* ---- 1.6 Codebaum ---- */

const gleich = (a: string, b: string): boolean => a.trim().toLowerCase() === b.trim().toLowerCase();
const geschwister = (codes: Code[], eltern: string | undefined): Code[] => codes.filter(c => c.elternId === eltern).sort((a, b) => a.reihenfolge - b.reihenfolge);

export function codeNameFrei(q: QualProjekt, name: string, elternId?: string, ausser?: string): boolean {
  return !q.codes.some(c => c.id !== ausser && c.elternId === elternId && gleich(c.name, name));
}

export function legeCodeAn(q: QualProjekt, name: string, elternId?: string): { q: QualProjekt; id: string } {
  const n = name.trim();
  if (!n) throw new Error('name-leer');
  if (!codeNameFrei(q, n, elternId)) throw new Error('name-vergeben');
  const g = geschwister(q.codes, elternId);
  const code: Code = { id: neueId(), name: n, kodierbar: true, reihenfolge: g.length ? Math.max(...g.map(c => c.reihenfolge)) + 1 : 0 };
  if (elternId !== undefined) code.elternId = elternId;
  return { q: mitCodeProtokoll(q, { ...q, codes: [...q.codes, code] }), id: code.id };
}

export function aendereCode(q: QualProjekt, id: string, felder: { [K in 'name' | 'farbe' | 'definition' | 'regel' | 'kodierbar' | 'anker' | 'phase']?: Code[K] | undefined }): QualProjekt {
  if (!q.codes.some(c => c.id === id)) return q;
  return mitCodeProtokoll(q, {
    ...q, codes: q.codes.map(c => {
      if (c.id !== id) return c;
      const neu: Record<string, unknown> = { ...c };
      for (const [k, v] of Object.entries(felder)) { if (v === undefined) delete neu[k]; else neu[k] = v; }
      return neu as unknown as Code;
    }),
  });
}

const nummeriere = (codes: Code[], reihe: string[]): Code[] => codes.map(c => { const i = reihe.indexOf(c.id); return i < 0 ? c : { ...c, reihenfolge: i }; });

export function nachfahren(codes: Code[], id: string): Set<string> {
  const aus = new Set<string>();
  const stapel = [id];
  while (stapel.length) { const x = stapel.pop()!; for (const c of codes) if (c.elternId === x && !aus.has(c.id)) { aus.add(c.id); stapel.push(c.id); } }
  return aus;
}

const mitEltern = (c: Code, eltern: string | undefined): Code => { const x: Code = { ...c }; if (eltern === undefined) delete x.elternId; else x.elternId = eltern; return x; };

export function verschiebeCode(q: QualProjekt, id: string, ziel: { elternId?: string; vor?: string }): QualProjekt {
  const code = q.codes.find(c => c.id === id);
  if (!code) return q;
  const neu = ziel.elternId;
  if (neu !== undefined && (neu === id || nachfahren(q.codes, id).has(neu) || !q.codes.some(c => c.id === neu))) return q;
  const alt = code.elternId;
  let codes = q.codes.map(c => (c.id === id ? mitEltern(c, neu) : c));
  const reihe = geschwister(codes, neu).filter(c => c.id !== id).map(c => c.id);
  const pos = ziel.vor !== undefined ? reihe.indexOf(ziel.vor) : -1;
  if (pos >= 0) reihe.splice(pos, 0, id); else reihe.push(id);
  codes = nummeriere(codes, reihe);
  if (alt !== neu) codes = nummeriere(codes, geschwister(codes, alt).map(c => c.id));
  return mitCodeProtokoll(q, { ...q, codes });
}

/** Nimmt Bezüge einer Art mit `id` aus den Memos; ein Memo ohne Bezug behält den Bezug „Projekt“. */
function memosOhneBezug(memos: Memo[], art: Memo['bezug'][number]['art'], id: string): Memo[] {
  return memos.map(m => {
    if (!m.bezug.some(b => b.art === art && b.id === id)) return m;
    const rest = m.bezug.filter(b => !(b.art === art && b.id === id));
    return { ...m, bezug: rest.length ? rest : [{ art: 'projekt' as const }] };
  });
}

/** Entfernt Segmente aus `kandidaten`, an denen weder Kodierung noch Memo hängt. */
function ohneLeereSegmente(q: QualProjekt, kandidaten: Iterable<string>): QualProjekt {
  const weg = new Set<string>();
  for (const id of kandidaten) if (!q.kodierungen.some(k => k.segment === id) && !segHatMemo(q, id)) weg.add(id);
  return weg.size ? { ...q, segmente: q.segmente.filter(s => !weg.has(s.id)) } : q;
}

export function entferneCode(q: QualProjekt, id: string): QualProjekt {
  const code = q.codes.find(c => c.id === id);
  if (!code) return q;
  const eltern = code.elternId;
  const betroffen = new Set(q.kodierungen.filter(k => k.code === id).map(k => k.segment));
  const kinder = geschwister(q.codes, id).map(c => c.id);
  const reihe = geschwister(q.codes, eltern).flatMap(c => (c.id === id ? kinder : [c.id]));
  const codes = nummeriere(q.codes.filter(c => c.id !== id).map(c => (c.elternId === id ? mitEltern(c, eltern) : c)), reihe);
  const ap = q.arbeitsplatz;
  const neu: QualProjekt = {
    ...q, codes, kodierungen: q.kodierungen.filter(k => k.code !== id), memos: memosOhneBezug(q.memos, 'code', id),
    ...(q.zusammenfassungen ? { zusammenfassungen: q.zusammenfassungen.filter(z => z.code !== id) } : {}),
    ...(ap ? { arbeitsplatz: { ...ap, fest: ap.fest.filter(x => x !== id), zuletzt: ap.zuletzt.filter(x => x !== id) } } : {}),
  };
  return mitCodeProtokoll(q, ohneLeereSegmente(neu, betroffen));
}

/* ---- 1.7 Memos ---- */

export function segmentFuer(q: QualProjekt, dokId: string, start: number, ende: number, kodierende?: string): { q: QualProjekt; id: string } {
  const da = q.segmente.find(s => s.dokument === dokId && s.start === start && s.ende === ende && (s.kodierende ?? kodierende) === kodierende);
  if (da) return { q, id: da.id };
  const seg = { id: neueId(), dokument: dokId, start, ende, erstellt: Date.now(), ...(kodierende !== undefined ? { kodierende } : {}) };
  return { q: { ...q, segmente: [...q.segmente, seg] }, id: seg.id };
}

export function legeMemoAn(q: QualProjekt, bezug: Memo['bezug'][number], text: string, titel?: string, kodierende?: string, art?: MemoArt): { q: QualProjekt; id: string } {
  if (!text.trim()) return { q, id: '' };
  const m: Memo = { id: neueId(), text, bezug: [bezug], erstellt: Date.now() };
  if (art !== undefined && art !== 'memo') m.art = art;   // 'memo' = wie bisher: Feld nicht setzen
  if (titel?.trim()) m.titel = titel.trim();
  if (kodierende !== undefined) m.kodierende = kodierende;
  return { q: { ...q, memos: [...q.memos, m] }, id: m.id };
}

export function aendereMemo(q: QualProjekt, id: string, felder: { text?: string; titel?: string }): QualProjekt {
  if (!q.memos.some(m => m.id === id)) return q;
  return {
    ...q, memos: q.memos.map(m => {
      if (m.id !== id) return m;
      const x: Memo = { ...m };
      if (felder.text !== undefined) x.text = felder.text;
      if (felder.titel !== undefined) { if (felder.titel.trim()) x.titel = felder.titel.trim(); else delete x.titel; }
      return x;
    }),
  };
}

export function entferneMemo(q: QualProjekt, id: string): QualProjekt {
  const m = q.memos.find(x => x.id === id);
  if (!m) return q;
  const neu = { ...q, memos: q.memos.filter(x => x.id !== id) };
  return ohneLeereSegmente(neu, m.bezug.filter(b => b.art === 'segment' && b.id).map(b => b.id!));
}

export function memosZu(q: QualProjekt, art: Memo['bezug'][number]['art'], id?: string): Memo[] {
  return q.memos.filter(m => m.bezug.some(b => b.art === art && (art === 'projekt' || b.id === id)));
}

/* ---- 1.8 Fälle und Fallvariablen ---- */

export function legeFallAn(q: QualProjekt, name: string): { q: QualProjekt; id: string } {
  const f = { id: neueId(), name: name.trim(), werte: {} };
  return { q: { ...q, faelle: [...q.faelle, f] }, id: f.id };
}

const nameGleich = (a: string, b: string): boolean => a.trim().toLocaleLowerCase() === b.trim().toLocaleLowerCase();

/** Frei heißt: nicht leer und kein anderer Fall (außer `ausser`) trägt denselben Namen (ohne Rücksicht auf Groß/klein). */
export function fallNameFrei(q: QualProjekt, name: string, ausser?: string): boolean {
  const n = name.trim();
  return n !== '' && !q.faelle.some(f => f.id !== ausser && nameGleich(f.name, n));
}

export function benenneFallUm(q: QualProjekt, id: string, name: string): QualProjekt {
  if (!q.faelle.some(f => f.id === id) || !fallNameFrei(q, name, id)) return q;
  return { ...q, faelle: q.faelle.map(f => (f.id === id ? { ...f, name: name.trim() } : f)) };
}

export function variableNameFrei(q: QualProjekt, name: string, ausser?: string): boolean {
  const n = name.trim();
  return n !== '' && !q.variablen.some(v => v.id !== ausser && nameGleich(v.name, n));
}

export function benenneVariableUm(q: QualProjekt, id: string, name: string): QualProjekt {
  if (!q.variablen.some(v => v.id === id) || !variableNameFrei(q, name, id)) return q;
  return { ...q, variablen: q.variablen.map(v => (v.id === id ? { ...v, name: name.trim() } : v)) };
}

export function ordneZu(q: QualProjekt, dokId: string, fallId: string | undefined): QualProjekt {
  return { ...q, dokumente: q.dokumente.map(d => { if (d.id !== dokId) return d; const x = { ...d }; if (fallId === undefined) delete x.fall; else x.fall = fallId; return x; }) };
}

export function legeVariableAn(q: QualProjekt, name: string, typ: Variable['typ']): { q: QualProjekt; id: string } {
  const v: Variable = { id: neueId(), name: name.trim(), typ };
  return { q: { ...q, variablen: [...q.variablen, v] }, id: v.id };
}

const echtesDatum = (j: number, m: number, t: number): boolean => { const d = new Date(Date.UTC(j, m - 1, t)); return d.getUTCFullYear() === j && d.getUTCMonth() === m - 1 && d.getUTCDate() === t; };
const zwei = (n: number): string => String(n).padStart(2, '0');

export function liesWert(eingabe: string, typ: Variable['typ'], sprache: 'de' | 'en'): { ok: true; wert: string | number | boolean | null } | { ok: false; grund: string } {
  const e = eingabe.trim();
  const de = sprache === 'de';
  if (e === '') return { ok: true, wert: null };
  const fehl = (d: string, en: string) => ({ ok: false as const, grund: de ? d : en });
  switch (typ) {
    case 'text': return { ok: true, wert: e };
    case 'ganzzahl': return /^[+-]?\d+$/.test(e) ? { ok: true, wert: Number(e) } : fehl('Bitte eine ganze Zahl eingeben, zum Beispiel 3.', 'Please enter a whole number, for example 3.');
    case 'zahl': {
      const re = de ? /^[+-]?\d+(,\d+)?$/ : /^[+-]?\d+(\.\d+)?$/;
      return re.test(e) ? { ok: true, wert: Number(e.replace(',', '.')) } : fehl('Bitte eine Zahl eingeben, zum Beispiel 3,5.', 'Please enter a number, for example 3.5.');
    }
    case 'ja/nein': {
      const k = e.toLowerCase();
      if (['ja', 'yes', 'j', 'y', 'true', 'wahr'].includes(k)) return { ok: true, wert: true };
      if (['nein', 'no', 'n', 'false', 'falsch'].includes(k)) return { ok: true, wert: false };
      return fehl('Bitte „ja“ oder „nein“ eingeben.', 'Please enter "yes" or "no".');
    }
    case 'datum':
    case 'datumzeit': {
      const mist = fehl('Bitte ein gültiges Datum eingeben, zum Beispiel 2026-11-09.', 'Please enter a valid date, for example 2026-11-09.');
      const re = typ === 'datumzeit' ? /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?$/ : /^(\d{4})-(\d{2})-(\d{2})$/;
      let m = re.exec(e);
      let j: number, mo: number, t: number, rest = '';
      if (m) { j = +m[1]!; mo = +m[2]!; t = +m[3]!; if (m[4] !== undefined) rest = `T${m[4]}:${m[5]}`; }
      else if (de && (m = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(e))) { t = +m[1]!; mo = +m[2]!; j = +m[3]!; }
      else return mist;
      if (!echtesDatum(j, mo, t)) return mist;
      return { ok: true, wert: `${j}-${zwei(mo)}-${zwei(t)}${rest}` };
    }
  }
}

export function setzeWert(q: QualProjekt, fallId: string, variableId: string, wert: string | number | boolean | null): QualProjekt {
  if (!q.faelle.some(f => f.id === fallId)) return q;
  return { ...q, faelle: q.faelle.map(f => (f.id === fallId ? { ...f, werte: { ...f.werte, [variableId]: wert } } : f)) };
}

export function entferneFall(q: QualProjekt, id: string): QualProjekt {
  return {
    ...q, faelle: q.faelle.filter(f => f.id !== id),
    ...(q.zusammenfassungen ? { zusammenfassungen: q.zusammenfassungen.filter(z => z.zeile !== id) } : {}),
    dokumente: q.dokumente.map(d => {
      if (d.fall !== id) return d;
      const x = { ...d }; delete x.fall; return x;
    }),
    memos: memosOhneBezug(q.memos, 'fall', id),
  };
}

export function entferneVariable(q: QualProjekt, id: string): QualProjekt {
  return {
    ...q, variablen: q.variablen.filter(v => v.id !== id),
    faelle: q.faelle.map(f => { const w = { ...f.werte }; delete w[id]; return { ...f, werte: w }; }),
  };
}

/* ---- 1.9 Belege mit Filter ---- */

export interface BelegFilter { untercodes?: boolean; nurKodierende?: string; werte?: { variable: string; wert: string | number | boolean | null }[] }
export interface BelegMitCode extends Beleg { code: string }

export function belegeGefiltert(q: QualProjekt, codeId: string, filter: BelegFilter): BelegMitCode[] {
  const codes = new Set([codeId]);
  if (filter.untercodes) for (const id of nachfahren(q.codes, codeId)) codes.add(id);
  const aus: (BelegMitCode & { d: number })[] = [];
  const gesehen = new Set<string>();
  for (const k of q.kodierungen) {
    if (!codes.has(k.code) || gesehen.has(k.segment)) continue;
    if (filter.nurKodierende !== undefined && k.kodierende !== filter.nurKodierende) continue;
    const s = q.segmente.find(x => x.id === k.segment);
    const d = s ? q.dokumente.findIndex(x => x.id === s.dokument) : -1;
    if (!s || d < 0) continue;
    const dok = q.dokumente[d]!;
    if (filter.werte?.length) {
      const fall = dok.fall ? q.faelle.find(f => f.id === dok.fall) : undefined;
      if (!fall || !filter.werte.every(w => fall.werte[w.variable] === w.wert)) continue;
    }
    gesehen.add(k.segment);
    const ab = absaetze(dok.text).find(a => a.start <= s.start && s.start < a.ende + 1);
    aus.push({ kodierung: k.id, dokument: s.dokument, start: s.start, ende: s.ende, text: cpTeil(dok.text, s.start, s.ende), absatz: ab?.nr ?? 1, code: k.code, d });
  }
  aus.sort((a, b) => a.d - b.d || a.start - b.start);
  return aus.map(({ d: _d, ...b }) => b);
}

/* ---- Hilfen für den Arbeitsplatz (6b1) ---- */

/** Nummern der Sätze, die `[start, ende)` berühren (bei leerer Spanne: der Satz, der den Punkt enthält bzw. der nächste). */
export function beruehrteSaetze(einheiten: Einheit[], start: number, ende: number): number[] {
  if (!einheiten.length) return [];
  if (start >= ende) { const e = einheitAn(einheiten, start); return e ? [e.nr] : []; }
  return einheiten.filter(e => e.start < ende && e.ende > start).map(e => e.nr);
}

/**
 * Die Codes an einer Stelle als Beschriftungen: Pfad, bei fremden Kodierungen mit „(von Name)“ (`von` = Wort „von“/„by“).
 * `nurIch`: nur Kodierungen der Person `ich`. Jede Beschriftung einmal.
 */
export function codeBeschriftungen(q: QualProjekt, dokId: string, start: number, ende: number, ich: string | undefined, nurIch: boolean, von: string): string[] {
  const segs = new Set(q.segmente.filter(s => s.dokument === dokId && (start === ende ? s.start <= start && start < s.ende : s.start < ende && s.ende > start)).map(s => s.id));
  const aus: string[] = [];
  for (const id of baumReihenfolge(q.codes).map(e => e.code.id)) {
    for (const k of q.kodierungen) {
      if (k.code !== id || !segs.has(k.segment)) continue;
      const meine = ich !== undefined && k.kodierende === ich;
      if (nurIch && !meine) continue;
      const name = meine ? codePfad(q.codes, id) : `${codePfad(q.codes, id)} (${von} ${q.kodierende.find(p => p.id === k.kodierende)?.name ?? k.kodierende})`;
      if (!aus.includes(name)) aus.push(name);
    }
  }
  return aus;
}

/** Anzahl der Memos an Segmenten, die `[start, ende)` berühren. */
export function memosAnStelle(q: QualProjekt, dokId: string, start: number, ende: number): number {
  const segs = new Set(q.segmente.filter(s => s.dokument === dokId && (start === ende ? s.start <= start && start < s.ende : s.start < ende && s.ende > start)).map(s => s.id));
  return q.memos.filter(m => m.bezug.some(b => b.art === 'segment' && b.id !== undefined && segs.has(b.id))).length;
}
