/**
 * Ansichten des Kodier-Arbeitsplatzes (Stufe 6c, Paket 6c1): reine Funktionen, alles wird aus dem Projekt abgeleitet.
 * Regeln: docs/erheben/FACHBLATT-STUFE-6C.md, Abschnitt 1. Positionen sind Codepoints, Ende exklusiv.
 * Das Projekt wird nie verändert; setzeZusammenfassung gibt ein neues Projekt zurück.
 */
import { absaetze, baumReihenfolge, nachfahren, saetze } from './kodieren';
import { kodiereinheiten, type Personen } from './qualauswertung';
import { cpTeil, positionsKarte, type PositionsKarte, type QualProjekt } from './qualprojekt';

const ueberlappt = (a: number, b: number, c: number, d: number): boolean => a < d && c < b;

/* ---- 1.1 Dokument-Übersicht ---- */

export interface UebersichtZeile { absatz: number; start: number; ende: number; codes: { id: string; name: string }[]; stellen: number }

export function dokumentUebersicht(q: QualProjekt, dokId: string, o: { kodierende: Personen }): UebersichtZeile[] {
  const dok = q.dokumente.find(d => d.id === dokId);
  if (!dok) return [];
  const reihe = baumReihenfolge(q.codes).map(e => e.code);
  const einheiten = kodiereinheiten(q, o.kodierende, reihe.map(c => c.id), [dokId]);
  return absaetze(dok.text).map(a => {
    const codeIds = new Set<string>(), segIds = new Set<string>();
    for (const e of einheiten) {
      if (!ueberlappt(a.start, a.ende, e.start, e.ende)) continue;
      codeIds.add(e.code); segIds.add(e.segment);
    }
    return { absatz: a.nr, start: a.start, ende: a.ende, codes: reihe.filter(c => codeIds.has(c.id)).map(c => ({ id: c.id, name: c.name })), stellen: segIds.size };
  });
}

/* ---- 1.2 Fall-Kategorie-Matrix ---- */

export interface FkBeleg { segment: string; dokument: string; start: number; ende: number; text: string }
/** Spalte der Matrix: ein Code, oder (`art: 'thema'`, Framework-Analyse) ein Thema; dann ist `code` die Thema-id. */
export interface FkSpalte { code: string; name: string; art?: 'thema' }
export interface FkMatrix { zeilen: { id: string; name: string }[]; spalten: FkSpalte[]; zellen: { belege: FkBeleg[]; zusammenfassung?: string }[][] }

/**
 * `themen` (Thema-ids) macht die Themen zu Spalten (Framework-Analyse): Belege einer Zelle sind die Stellen des Falls, die mit einem Code
 * des Themas kodiert sind; die von der Person ausdrücklich gewählten Belege des Themas stehen zuerst. Statable wählt nie Belege aus.
 */
export function fallKategorieMatrix(q: QualProjekt, o: { codes: string[]; kodierende: Personen; mitUntercodes: boolean; themen?: string[] }): FkMatrix {
  if (o.themen) return fallThemaMatrix(q, o.themen, o.kodierende);
  const codeName = new Map(q.codes.map(c => [c.id, c.name]));
  const zeilen: { id: string; name: string; docs: string[] }[] = [];
  for (const f of q.faelle) zeilen.push({ id: f.id, name: f.name, docs: q.dokumente.filter(d => d.fall === f.id).map(d => d.id) });
  for (const d of q.dokumente) if (d.fall === undefined) zeilen.push({ id: `dok:${d.id}`, name: d.name, docs: [d.id] });
  const spalten = o.codes.map(c => ({ code: c, name: codeName.get(c) ?? c }));
  const dokPos = new Map(q.dokumente.map((d, i) => [d.id, i]));
  const dokText = new Map(q.dokumente.map(d => [d.id, d.text]));
  const karten = new Map<string, PositionsKarte>();
  const text = (dok: string, a: number, b: number): string => {
    const t = dokText.get(dok) ?? '';
    let k = karten.get(dok); if (!k) { k = positionsKarte(t); karten.set(dok, k); }
    return cpTeil(t, a, b, k);
  };
  const zus = new Map<string, string>();
  for (const z of q.zusammenfassungen ?? []) if (z.art !== 'thema') zus.set(`${z.zeile}\u0000${z.code}`, z.text);
  // je Spalte: Menge der Codes (der Code selbst, bei Bedarf alle Nachfahren)
  const spaltenCodes = o.codes.map(c => { const s = new Set([c]); if (o.mitUntercodes) for (const n of nachfahren(q.codes, c)) s.add(n); return s; });
  const alle = [...new Set(spaltenCodes.flatMap(s => [...s]))];
  const einheiten = kodiereinheiten(q, o.kodierende, alle);
  const zellen = zeilen.map(z => {
    const ds = new Set(z.docs);
    return spalten.map((sp, i) => {
      const seen = new Set<string>(), belege: FkBeleg[] = [];
      for (const e of einheiten) {
        if (!ds.has(e.dokument) || !spaltenCodes[i]!.has(e.code) || seen.has(e.segment)) continue;
        seen.add(e.segment);
        belege.push({ segment: e.segment, dokument: e.dokument, start: e.start, ende: e.ende, text: text(e.dokument, e.start, e.ende) });
      }
      belege.sort((a, b) => (dokPos.get(a.dokument)! - dokPos.get(b.dokument)!) || a.start - b.start || a.ende - b.ende);
      const t = zus.get(`${z.id}\u0000${sp.code}`);
      return t !== undefined ? { belege, zusammenfassung: t } : { belege };
    });
  });
  return { zeilen: zeilen.map(({ id, name }) => ({ id, name })), spalten, zellen };
}

function fallThemaMatrix(q: QualProjekt, themaIds: string[], kodierende: Personen): FkMatrix {
  const zeilen: { id: string; name: string; docs: string[] }[] = [];
  for (const f of q.faelle) zeilen.push({ id: f.id, name: f.name, docs: q.dokumente.filter(d => d.fall === f.id).map(d => d.id) });
  for (const d of q.dokumente) if (d.fall === undefined) zeilen.push({ id: `dok:${d.id}`, name: d.name, docs: [d.id] });
  const alle = q.themen ?? [];
  const sp = themaIds.map(i => alle.find(t => t.id === i)).filter((t): t is NonNullable<typeof t> => t !== undefined);
  const spalten: FkSpalte[] = sp.map(t => ({ code: t.id, name: t.name, art: 'thema' }));
  const dokPos = new Map(q.dokumente.map((d, i) => [d.id, i]));
  const dokText = new Map(q.dokumente.map(d => [d.id, d.text]));
  const segs = new Map(q.segmente.map(s => [s.id, s]));
  const karten = new Map<string, PositionsKarte>();
  const text = (dok: string, a: number, b: number): string => {
    const t = dokText.get(dok) ?? '';
    let k = karten.get(dok); if (!k) { k = positionsKarte(t); karten.set(dok, k); }
    return cpTeil(t, a, b, k);
  };
  const zus = new Map<string, string>();
  for (const z of q.zusammenfassungen ?? []) if (z.art === 'thema') zus.set(`${z.zeile}\u0000${z.code}`, z.text);
  const einheiten = kodiereinheiten(q, kodierende, [...new Set(sp.flatMap(t => t.codes))]);
  const zellen = zeilen.map(z => {
    const ds = new Set(z.docs);
    return sp.map(t => {
      const cs = new Set(t.codes);
      const seen = new Set<string>(), gewaehlt: FkBeleg[] = [], rest: FkBeleg[] = [];
      const hin = (segment: string, dokument: string, start: number, ende: number, ziel: FkBeleg[]) => {
        if (seen.has(segment)) return; seen.add(segment);
        ziel.push({ segment, dokument, start, ende, text: text(dokument, start, ende) });
      };
      for (const id of t.belege ?? []) { const s = segs.get(id); if (s && ds.has(s.dokument)) hin(s.id, s.dokument, s.start, s.ende, gewaehlt); }
      for (const e of einheiten) if (ds.has(e.dokument) && cs.has(e.code)) hin(e.segment, e.dokument, e.start, e.ende, rest);
      const ord = (a: FkBeleg, b: FkBeleg) => (dokPos.get(a.dokument)! - dokPos.get(b.dokument)!) || a.start - b.start || a.ende - b.ende;
      gewaehlt.sort(ord); rest.sort(ord);
      const belege = [...gewaehlt, ...rest];
      const tx = zus.get(`${z.id}\u0000${t.id}`);
      return tx !== undefined ? { belege, zusammenfassung: tx } : { belege };
    });
  });
  return { zeilen: zeilen.map(({ id, name }) => ({ id, name })), spalten, zellen };
}

/** `art: 'thema'`: `code` ist eine Thema-id; die Zusammenfassung wird getrennt von denen der Codes gespeichert (mit `art: 'thema'`). */
export function setzeZusammenfassung(q: QualProjekt, zeile: string, code: string, text: string, kodierende?: string, art: 'code' | 'thema' = 'code'): QualProjekt {
  const istThema = art === 'thema';
  if (istThema ? !(q.themen ?? []).some(t => t.id === code) : !q.codes.some(c => c.id === code)) return q;
  const gleich = (z: { zeile: string; code: string; art?: string }) => z.zeile === zeile && z.code === code && (z.art === 'thema') === istThema;
  const bekannt = q.faelle.some(f => f.id === zeile) || q.dokumente.some(d => `dok:${d.id}` === zeile && d.fall === undefined);
  if (!bekannt) return q;
  const t = text.trim();
  const alt = q.zusammenfassungen ?? [];
  if (t === '') return { ...q, zusammenfassungen: alt.filter(z => !gleich(z)) };
  const neu = { zeile, code, text: t, geaendert: Date.now(), ...(kodierende !== undefined ? { kodierende } : {}), ...(istThema ? { art: 'thema' as const } : {}) };
  const i = alt.findIndex(gleich);
  return { ...q, zusammenfassungen: i >= 0 ? alt.map((z, k) => (k === i ? neu : z)) : [...alt, neu] };
}

/* ---- 1.3 Code-Landkarte ---- */

/**
 * Abstände der Codes über Dokumente oder Fälle. Jaccard: 1 − (beide) / (mindestens einer); Simple Matching (A2): Anteil der Einheiten, in denen
 * genau einer der beiden vorkommt (bei 0/1-Merkmalen gleich dem Gower-Abstand). Einheiten bei Simple Matching: alle Dokumente bzw. alle Fälle
 * mit Dokument (auch ohne Kodierung), weil „beide fehlen“ dort mitzählt. Sollwerte: R dist(method = 'binary') und eigene Formel (scripts/ausbau-a2-erwartet.R).
 */
export function codeAbstaende(q: QualProjekt, o: { codes: string[]; kodierende: Personen; mass?: 'jaccard' | 'sm'; einheit?: 'dokumente' | 'faelle' }): { codes: string[]; D: number[][]; ohne: string[]; einheiten: number } {
  const einheiten = kodiereinheiten(q, o.kodierende, o.codes);
  const dokFall = new Map(q.dokumente.map(d => [d.id, d.fall]));
  const nachFall = o.einheit === 'faelle';
  const einheitVon = (dok: string): string | undefined => (nachFall ? dokFall.get(dok) : dok);
  const dokus = new Map<string, Set<string>>();
  for (const e of einheiten) { const u = einheitVon(e.dokument); if (u === undefined) continue; let s = dokus.get(e.code); if (!s) dokus.set(e.code, s = new Set()); s.add(u); }
  const alle = nachFall ? new Set(q.dokumente.map(d => d.fall).filter((f): f is string => !!f)) : new Set(q.dokumente.map(d => d.id));
  const N = alle.size;
  const codes = o.codes.filter(c => dokus.has(c)), ohne = o.codes.filter(c => !dokus.has(c));
  const D = codes.map((a, i) => codes.map((b, j) => {
    if (i === j) return 0;
    const A = dokus.get(a)!, B = dokus.get(b)!;
    let n = 0; for (const x of A) if (B.has(x)) n++;
    if (o.mass === 'sm') return N ? (A.size + B.size - 2 * n) / N : 0;
    return 1 - n / (A.size + B.size - n);
  }));
  return { codes, D, ohne, einheiten: N };
}

/** Ein Schritt der Clusteranalyse: verbunden werden die Gruppen a und b (Listen von Indizes in codes) beim Abstand hoehe. */
export interface Verbindung { a: number[]; b: number[]; hoehe: number }
/**
 * Hierarchische Clusteranalyse mit mittlerer Verknüpfung (average linkage, UPGMA; R hclust(method = 'average')). Bei gleichen Abständen gewinnt
 * das Paar, das in der Liste zuerst steht; die verbundene Gruppe steht an der Stelle der vorderen (wie R, darum dieselben Schritte und Höhen). Nur als Rechnung gedacht: Gruppen von Codes
 * zeigen gemeinsames Vorkommen, nicht, dass die Codes inhaltlich zusammengehören.
 */
export function mittlereVerknuepfung(D: number[][]): Verbindung[] {
  let gruppen = D.map((_, i) => [i]);
  const abst = (x: number[], y: number[]) => { let s = 0; for (const i of x) for (const j of y) s += D[i]![j]!; return s / (x.length * y.length); };
  const r: Verbindung[] = [];
  while (gruppen.length > 1) {
    let best = Infinity, bi = 0, bj = 1;
    for (let i = 0; i < gruppen.length; i++) for (let j = i + 1; j < gruppen.length; j++) { const d = abst(gruppen[i]!, gruppen[j]!); if (d < best - 1e-12) { best = d; bi = i; bj = j; } }
    const a = gruppen[bi]!, b = gruppen[bj]!;
    r.push({ a: [...a].sort((x, y) => x - y), b: [...b].sort((x, y) => x - y), hoehe: best });
    // wie R (hclust.f): die neue Gruppe nimmt den Platz der vorderen ein, die hintere fällt weg; so entscheiden Gleichstände gleich
    gruppen = gruppen.flatMap((g, k) => (k === bi ? [[...a, ...b]] : k === bj ? [] : [g]));
  }
  return r;
}

/* ---- 1.4 Ähnliche Stellen ---- */

export interface Aehnlich { dokument: string; start: number; ende: number; satz: number; wert: number }

const woerter = (t: string): string[] => t.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];

export function aehnlicheStellen(q: QualProjekt, aus: { dokument: string; start: number; ende: number }, o: { anzahl: number; sprache: 'de' | 'en' }): Aehnlich[] {
  const dok = q.dokumente.find(d => d.id === aus.dokument);
  if (!dok || aus.ende <= aus.start || o.anzahl <= 0) return [];
  const anfrageText = cpTeil(dok.text, aus.start, aus.ende);
  const einheiten: { dokument: string; start: number; ende: number; satz: number; zaehl: Map<string, number> }[] = [];
  const df = new Map<string, number>();
  for (const d of q.dokumente) {
    for (const s of saetze(d.text, d.sprache ?? o.sprache)) {
      const zaehl = new Map<string, number>();
      for (const w of woerter(s.text)) zaehl.set(w, (zaehl.get(w) ?? 0) + 1);
      for (const w of zaehl.keys()) df.set(w, (df.get(w) ?? 0) + 1);
      einheiten.push({ dokument: d.id, start: s.start, ende: s.ende, satz: s.nr, zaehl });
    }
  }
  const N = einheiten.length;
  const idf = (w: string): number => Math.log(N / df.get(w)!);
  const anfrage = new Map<string, number>();
  for (const w of woerter(anfrageText)) if (df.has(w)) anfrage.set(w, (anfrage.get(w) ?? 0) + idf(w));
  let na = 0; for (const v of anfrage.values()) na += v * v;
  if (na === 0) return [];
  const dokPos = new Map(q.dokumente.map((d, i) => [d.id, i]));
  const r: Aehnlich[] = [];
  for (const e of einheiten) {
    if (e.dokument === aus.dokument && ueberlappt(aus.start, aus.ende, e.start, e.ende)) continue;
    let punkt = 0, ne = 0;
    for (const [w, n] of e.zaehl) { const g = n * idf(w); ne += g * g; const a = anfrage.get(w); if (a !== undefined) punkt += a * g; }
    if (ne === 0 || punkt === 0) continue;
    const wert = punkt / Math.sqrt(na * ne);
    if (wert > 0) r.push({ dokument: e.dokument, start: e.start, ende: e.ende, satz: e.satz, wert });
  }
  r.sort((a, b) => (Math.abs(a.wert - b.wert) < 1e-12 ? (dokPos.get(a.dokument)! - dokPos.get(b.dokument)!) || a.start - b.start : b.wert - a.wert));
  return r.slice(0, o.anzahl);
}
