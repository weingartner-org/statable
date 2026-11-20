/**
 * Qualitative Auswertung (Stufe 5, Paket 5B): Fall-Code-Matrix, Code-Überschneidungen, Segmentlängen, Übereinstimmung auf Dokumentebene.
 * Reiner Rechenkern ohne Oberfläche und ohne Texte für Menschen. Alles wird aus dem Modell abgeleitet, die Eingabe wird nie verändert.
 * Regeln: docs/erheben/FACHBLATT-STUFE-5.md, Abschnitt "5B: Rechnen". Positionen sind Codepoints (Ende exklusiv).
 */
import { cpTeil, positionsKarte, type PositionsKarte, type QualProjekt } from './qualprojekt';
import { intercoder, type IntercoderErgebnis } from './intercoder';

export type Personen = string[] | 'alle';

export interface MatrixOptionen { art: '01' | 'anzahl' | 'stufe'; zeilen: 'faelle' | 'dokumente'; kodierende: Personen; codes: string[]; stufen?: Record<string, number> }
export interface Matrix { zeilen: { id: string; name: string }[]; spalten: { code: string; name: string }[]; werte: (number | null)[][]; uneindeutig: string[] }
export interface Laenge { mittel: number; median: number; min: number; max: number }

/** Eine Kodierung einer Person an einem Segment, mit den Angaben des Segments. */
export interface Kodiereinheit { person: string; segment: string; code: string; dokument: string; start: number; ende: number }

/**
 * Alle Einheiten (Person x Segment x Code) der gewählten Personen und Codes, optional nur in den gewählten Dokumenten.
 * Doppelte Kodierungen derselben Person (gleiches Segment, gleicher Code) zählen einmal. Reihenfolge: wie in `q.kodierungen`.
 */
export function kodiereinheiten(q: QualProjekt, kodierende: Personen, codes: readonly string[], dokumente?: readonly string[]): Kodiereinheit[] {
  const pers = kodierende === 'alle' ? new Set(q.kodierende.map(k => k.id)) : new Set(kodierende);
  const cs = new Set(codes), ds = dokumente ? new Set(dokumente) : null;
  const seg = new Map(q.segmente.map(s => [s.id, s]));
  const gesehen = new Set<string>(), r: Kodiereinheit[] = [];
  for (const k of q.kodierungen) {
    if (!pers.has(k.kodierende) || !cs.has(k.code)) continue;
    const s = seg.get(k.segment); if (!s) continue;
    if (ds && !ds.has(s.dokument)) continue;
    const key = `${k.kodierende}\u0000${k.segment}\u0000${k.code}`;
    if (gesehen.has(key)) continue;
    gesehen.add(key);
    r.push({ person: k.kodierende, segment: s.id, code: k.code, dokument: s.dokument, start: s.start, ende: s.ende });
  }
  return r;
}

export function fallCodeMatrix(q: QualProjekt, o: MatrixOptionen): Matrix {
  const codeName = new Map(q.codes.map(c => [c.id, c.name]));
  const spaltenCodes = o.art === 'stufe' ? o.codes.slice(0, 1) : o.codes;
  const spalten = spaltenCodes.map(c => ({ code: c, name: codeName.get(c) ?? c }));
  const zeilen: { id: string; name: string; docs: string[] }[] = [];
  if (o.zeilen === 'faelle') {
    for (const f of q.faelle) zeilen.push({ id: f.id, name: f.name, docs: q.dokumente.filter(d => d.fall === f.id).map(d => d.id) });
    for (const d of q.dokumente) if (d.fall === undefined) zeilen.push({ id: `dok:${d.id}`, name: d.name, docs: [d.id] });
  } else {
    for (const d of q.dokumente) zeilen.push({ id: d.id, name: d.name, docs: [d.id] });
  }
  const stufen = o.stufen ?? {};
  const werte: (number | null)[][] = [], uneindeutig: string[] = [];
  const einstufung = o.art === 'stufe' ? kodiereinheiten(q, o.kodierende, Object.keys(stufen)) : [];
  const alleEinheiten = o.art === 'stufe' ? [] : kodiereinheiten(q, o.kodierende, o.codes);
  for (const z of zeilen) {
    const ds = new Set(z.docs);
    if (o.art === 'stufe') {
      const v = new Set<number>();
      for (const e of einstufung) if (ds.has(e.dokument)) v.add(stufen[e.code]!);
      if (v.size > 1) uneindeutig.push(z.id);
      werte.push([v.size === 1 ? [...v][0]! : null]);
    } else {
      const n = new Map<string, number>();
      for (const e of alleEinheiten) if (ds.has(e.dokument)) n.set(e.code, (n.get(e.code) ?? 0) + 1);
      werte.push(spaltenCodes.map(c => (o.art === '01' ? ((n.get(c) ?? 0) > 0 ? 1 : 0) : (n.get(c) ?? 0))));
    }
  }
  return { zeilen: zeilen.map(({ id, name }) => ({ id, name })), spalten, werte, uneindeutig };
}

/**
 * Tabelle Code x Code: Zahl der Segment-Paare (je Person, im selben Dokument, mit mindestens einem gemeinsamen Zeichen oder dasselbe Segment),
 * die den Zeilencode und den Spaltencode tragen; Diagonale = Zahl der Einheiten (Segment, Person, Code).
 */
export function codeUeberschneidungen(q: QualProjekt, o: { kodierende: Personen; codes: string[] }): number[][] {
  const n = o.codes.length, ix = new Map(o.codes.map((c, i) => [c, i]));
  const m = Array.from({ length: n }, () => new Array<number>(n).fill(0));
  const einheiten = kodiereinheiten(q, o.kodierende, o.codes);
  for (const e of einheiten) m[ix.get(e.code)!]![ix.get(e.code)!]!++;
  const jePerson = new Map<string, Map<string, { dokument: string; start: number; ende: number; codes: Set<number> }>>();
  for (const e of einheiten) {
    let p = jePerson.get(e.person); if (!p) jePerson.set(e.person, p = new Map());
    let s = p.get(e.segment); if (!s) p.set(e.segment, s = { dokument: e.dokument, start: e.start, ende: e.ende, codes: new Set() });
    s.codes.add(ix.get(e.code)!);
  }
  const zaehle = (k: Set<number>, l: Set<number>) => {
    const zellen = new Set<number>();
    for (const i of k) for (const j of l) if (i !== j) { zellen.add(i * n + j); zellen.add(j * n + i); }
    for (const z of zellen) m[Math.floor(z / n)]![z % n]!++;
  };
  for (const p of jePerson.values()) {
    const jeDok = new Map<string, { start: number; ende: number; codes: Set<number> }[]>();
    for (const s of p.values()) { let l = jeDok.get(s.dokument); if (!l) jeDok.set(s.dokument, l = []); l.push(s); }
    for (const l of jeDok.values()) {
      l.sort((a, b) => a.start - b.start || a.ende - b.ende);
      for (let k = 0; k < l.length; k++) {
        zaehle(l[k]!.codes, l[k]!.codes);
        for (let j = k + 1; j < l.length; j++) {
          if (l[j]!.start >= l[k]!.ende) break;
          if (l[k]!.start < l[j]!.ende && l[j]!.start < l[k]!.ende) zaehle(l[k]!.codes, l[j]!.codes);
        }
      }
    }
  }
  return m;
}

function stat(v: number[]): Laenge | null {
  if (!v.length) return null;
  const s = [...v].sort((a, b) => a - b), h = s.length >> 1;
  return { mittel: s.reduce((t, x) => t + x, 0) / s.length, median: s.length % 2 ? s[h]! : (s[h - 1]! + s[h]!) / 2, min: s[0]!, max: s[s.length - 1]! };
}

/** Je Code: Zahl der Segmente (Einheiten), Länge in Zeichen (Codepoints) und in Wörtern (Trennung an Leerraum, wie `redeanteile.ts`). */
export function segmentlaengen(q: QualProjekt, o: { kodierende: Personen; codes: string[] }): { code: string; n: number; zeichen: Laenge | null; woerter: Laenge | null }[] {
  const einheiten = kodiereinheiten(q, o.kodierende, o.codes);
  const dok = new Map(q.dokumente.map(d => [d.id, d])), karten = new Map<string, PositionsKarte>();
  return o.codes.map(c => {
    const zeichen: number[] = [], woerter: number[] = [];
    for (const e of einheiten) {
      if (e.code !== c) continue;
      const d = dok.get(e.dokument); if (!d) continue;
      let k = karten.get(d.id); if (!k) karten.set(d.id, k = positionsKarte(d.text));
      const t = cpTeil(d.text, e.start, e.ende, k);
      zeichen.push(e.ende - e.start);
      woerter.push((t.match(/\S+/g) ?? []).length);
    }
    return { code: c, n: zeichen.length, zeichen: stat(zeichen), woerter: stat(woerter) };
  });
}

/** Einheit = Dokument x Code, Wert je Person 1 (Code im Dokument mindestens einmal vergeben) oder 0. Cohen, Brennan-Prediger, Alpha, AC1 aus `intercoder`. */
export function dokumentUebereinstimmung(q: QualProjekt, o: { a: string; b: string; codes: string[]; dokumente?: string[] }):
  { ergebnis: IntercoderErgebnis; jeCode: { code: string; beide: number; nurA: number; nurB: number; keiner: number }[] } {
  const dokumente = o.dokumente ?? q.dokumente.map(d => d.id);
  const ea = kodiereinheiten(q, [o.a], o.codes, dokumente), eb = kodiereinheiten(q, [o.b], o.codes, dokumente);
  const hat = (l: Kodiereinheit[]) => new Set(l.map(e => `${e.dokument}\u0000${e.code}`));
  const ha = hat(ea), hb = hat(eb);
  const sa: number[] = [], sb: number[] = [];
  const jeCode = o.codes.map(c => {
    const r = { code: c, beide: 0, nurA: 0, nurB: 0, keiner: 0 };
    for (const d of dokumente) {
      const x = ha.has(`${d}\u0000${c}`) ? 1 : 0, y = hb.has(`${d}\u0000${c}`) ? 1 : 0;
      sa.push(x); sb.push(y);
      if (x && y) r.beide++; else if (x) r.nurA++; else if (y) r.nurB++; else r.keiner++;
    }
    return r;
  });
  return { ergebnis: intercoder([sa, sb], 'nominal'), jeCode };
}
