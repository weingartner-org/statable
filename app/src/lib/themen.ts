/**
 * Themen (Stufe A3, Architekturblatt Ausbau 1 und 2, Fachblatt Arbeitsweisen 1 und 5).
 *
 * Ein Thema ist ein Muster mit gemeinsamer Bedeutung über viele Stellen und Fälle. Die Person bildet, benennt, verwirft und legt Themen
 * zusammen; **Statable schlägt nie ein Thema vor** (auch nicht aus Häufigkeiten). Jede Änderung schreibt einen Schritt in `thema.verlauf`
 * (nie gekürzt) und einen Verweis-Eintrag `thema.<schritt>` ins Projekt-Protokoll. Verworfene Themen bleiben mit Verlauf sichtbar.
 * Zusammenlegen geschieht nur auf Wunsch der Person, nie still (auch nicht beim Zusammenführen zweier Projekte).
 *
 * Alle Funktionen sind rein: Sie geben ein neues Projekt zurück und ändern die Eingabe nicht. Fehler als `Error` mit fester Kennung
 * (`name-leer`, `name-vergeben`, `eine-ebene`, `unbekannt`), damit die Oberfläche einen passenden Satz sagen kann.
 */
import type { Aenderung, Code, QualProjekt, Thema, ThemaSchritt, ThemaStand } from './qualprojekt';

const neueId = (): string => globalThis.crypto.randomUUID();
/** Höchstlänge kurzer Texte im Verlauf (Namen) */
const KURZ = 200;
const kurz = (t: string): string => { const x = t.replace(/\s+/g, ' ').trim(); return x.length > KURZ ? `${x.slice(0, KURZ - 1)}…` : x; };
const norm = (t: string): string => t.trim().toLocaleLowerCase();

export const themen = (q: Pick<QualProjekt, 'themen'>): Thema[] => q.themen ?? [];

/** Themen in der Reihenfolge der Liste: oberste Ebene nach `reihenfolge`, darunter je die Unterthemen. */
export function themenReihenfolge(q: Pick<QualProjekt, 'themen'>): { thema: Thema; ebene: 0 | 1 }[] {
  const alle = themen(q);
  const nach = (a: Thema, b: Thema) => a.reihenfolge - b.reihenfolge || a.erstellt - b.erstellt;
  const oben = alle.filter(t => t.elternId === undefined).sort(nach);
  const aus: { thema: Thema; ebene: 0 | 1 }[] = [];
  for (const t of oben) {
    aus.push({ thema: t, ebene: 0 });
    for (const u of alle.filter(x => x.elternId === t.id).sort(nach)) aus.push({ thema: u, ebene: 1 });
  }
  return aus;
}

/** Ist der Name im gleichen Bereich (gleicher Fall bzw. fallübergreifend) frei? Verworfene zählen mit: Dafür gibt es „wieder aufnehmen“. */
export function themaNameFrei(q: Pick<QualProjekt, 'themen'>, name: string, fall?: string, ausser?: string): boolean {
  const n = norm(name);
  return !themen(q).some(t => t.id !== ausser && (t.fall ?? '') === (fall ?? '') && norm(t.name) === n);
}

function schritt(was: ThemaSchritt['was'], jetzt: number, wer: string | undefined, x: { vorher?: string; nachher?: string; notiz?: string } = {}): ThemaSchritt {
  const s: ThemaSchritt = { zeit: jetzt, was };
  if (wer !== undefined) s.kodierende = wer;
  if (x.vorher !== undefined) s.vorher = x.vorher;
  if (x.nachher !== undefined) s.nachher = x.nachher;
  if (x.notiz?.trim()) s.notiz = x.notiz.trim();
  return s;
}

/** Verweis im Projekt-Protokoll (Architekturblatt Ausbau 3: „thema.* nur als Verweis“, die Einzelheiten stehen im Verlauf). */
function verweis(q: QualProjekt, t: Thema, was: ThemaSchritt['was'], jetzt: number): Aenderung[] {
  const a: Aenderung = { zeit: jetzt, was: `thema.${was}`, nachher: { thema: t.id, text: kurz(t.name) } };
  if (q.ich !== undefined) a.kodierende = q.ich;
  return [...q.protokoll, a];
}

/** Ändert ein Thema und schreibt Schritt und Protokoll. */
function aendere(q: QualProjekt, id: string, was: ThemaSchritt['was'], f: (t: Thema) => Thema, x: { vorher?: string; nachher?: string; notiz?: string } = {}, jetzt = Date.now()): QualProjekt {
  const alt = themen(q).find(t => t.id === id);
  if (!alt) throw new Error('unbekannt');
  const neu = f({ ...alt });
  neu.geaendert = jetzt;
  neu.verlauf = [...alt.verlauf, schritt(was, jetzt, q.ich, x)];
  const r: QualProjekt = { ...q, themen: themen(q).map(t => (t.id === id ? neu : t)) };
  r.protokoll = verweis(r, neu, was, jetzt);
  return r;
}

export interface NeuesThema { konzept?: string; fall?: string; elternId?: string; codes?: string[]; aus?: string[]; stand?: ThemaStand }

/** Legt ein Thema an (Stand „Kandidat“, wenn nichts anderes gesagt ist: Braun und Clarke sprechen von „candidate themes“). */
export function legeThemaAn(q: QualProjekt, name: string, o: NeuesThema = {}, jetzt = Date.now()): { q: QualProjekt; id: string } {
  const n = name.trim();
  if (!n) throw new Error('name-leer');
  if (!themaNameFrei(q, n, o.fall)) throw new Error('name-vergeben');
  if (o.elternId !== undefined) {
    const e = themen(q).find(t => t.id === o.elternId);
    if (!e) throw new Error('unbekannt');
    if (e.elternId !== undefined) throw new Error('eine-ebene');
  }
  const codeIds = new Set(q.codes.map(c => c.id));
  const t: Thema = {
    id: neueId(), name: n, codes: [...new Set((o.codes ?? []).filter(c => codeIds.has(c)))], stand: o.stand ?? 'kandidat',
    verlauf: [schritt('angelegt', jetzt, q.ich, { nachher: kurz(n) })],
    reihenfolge: Math.max(-1, ...themen(q).filter(x => x.elternId === o.elternId).map(x => x.reihenfolge)) + 1,
    erstellt: jetzt, geaendert: jetzt,
  };
  if (o.konzept?.trim()) t.konzept = o.konzept.trim();
  if (o.fall !== undefined && q.faelle.some(f => f.id === o.fall)) t.fall = o.fall;
  if (o.elternId !== undefined) t.elternId = o.elternId;
  if (o.aus?.length) { const ids = new Set(themen(q).map(x => x.id)); t.aus = [...new Set(o.aus.filter(a => ids.has(a)))]; }
  if (q.ich !== undefined) t.kodierende = q.ich;
  const r: QualProjekt = { ...q, themen: [...themen(q), t] };
  r.protokoll = verweis(r, t, 'angelegt', jetzt);
  return { q: r, id: t.id };
}

export function benenneThemaUm(q: QualProjekt, id: string, name: string, notiz?: string, jetzt = Date.now()): QualProjekt {
  const t = themen(q).find(x => x.id === id);
  if (!t) throw new Error('unbekannt');
  const n = name.trim();
  if (!n) throw new Error('name-leer');
  if (n === t.name) return q;
  if (!themaNameFrei(q, n, t.fall, id)) throw new Error('name-vergeben');
  return aendere(q, id, 'umbenannt', x => ({ ...x, name: n }), { vorher: kurz(t.name), nachher: kurz(n), ...(notiz !== undefined ? { notiz } : {}) }, jetzt);
}

/** Zentrales Konzept (central organising concept). Leerer Text entfernt das Feld. Tippen innerhalb von 60 s gibt einen Schritt. */
export function setzeKonzept(q: QualProjekt, id: string, text: string, jetzt = Date.now()): QualProjekt {
  return setzeText(q, id, 'konzept', text, jetzt);
}
export function setzeThemaBeschreibung(q: QualProjekt, id: string, text: string, jetzt = Date.now()): QualProjekt {
  return setzeText(q, id, 'beschreibung', text, jetzt);
}
function setzeText(q: QualProjekt, id: string, feld: 'konzept' | 'beschreibung', text: string, jetzt: number): QualProjekt {
  const t = themen(q).find(x => x.id === id);
  if (!t) throw new Error('unbekannt');
  const neu = text.trim();
  if ((t[feld] ?? '') === neu) return q;
  const letzter = t.verlauf[t.verlauf.length - 1];
  // Tippen zusammenfassen: gleicher Schritt, gleiche Person, höchstens 60 s → letzten Schritt ersetzen statt anhängen
  if (letzter && letzter.was === feld && letzter.kodierende === q.ich && jetzt - letzter.zeit <= 60_000 && jetzt >= letzter.zeit) {
    const x: Thema = { ...t, geaendert: jetzt, verlauf: [...t.verlauf.slice(0, -1), { ...letzter, zeit: jetzt }] };
    if (neu) x[feld] = neu; else delete x[feld];
    return { ...q, themen: themen(q).map(y => (y.id === id ? x : y)) };
  }
  return aendere(q, id, feld, x => { const y = { ...x }; if (neu) y[feld] = neu; else delete y[feld]; return y; }, {}, jetzt);
}

/** Ordnet einen Code dem Thema zu (`an`) oder nimmt ihn heraus. */
export function ordneCodeZu(q: QualProjekt, id: string, codeId: string, an: boolean, jetzt = Date.now()): QualProjekt {
  const t = themen(q).find(x => x.id === id);
  const c = q.codes.find(x => x.id === codeId);
  if (!t || !c) throw new Error('unbekannt');
  if (an === t.codes.includes(codeId)) return q;
  return aendere(q, id, 'codes', x => ({ ...x, codes: an ? [...x.codes, codeId] : x.codes.filter(y => y !== codeId) }), an ? { nachher: kurz(c.name) } : { vorher: kurz(c.name) }, jetzt);
}

/** Wählt eine Stelle (Segment) ausdrücklich als Beleg des Themas, oder nimmt sie heraus. Nie automatisch. */
export function ordneBelegZu(q: QualProjekt, id: string, segId: string, an: boolean, jetzt = Date.now()): QualProjekt {
  const t = themen(q).find(x => x.id === id);
  if (!t || !q.segmente.some(s => s.id === segId)) throw new Error('unbekannt');
  const da = (t.belege ?? []).includes(segId);
  if (an === da) return q;
  return aendere(q, id, 'belege', x => {
    const b = an ? [...(x.belege ?? []), segId] : (x.belege ?? []).filter(y => y !== segId);
    const y = { ...x };
    if (b.length) y.belege = b; else delete y.belege;
    return y;
  }, {}, jetzt);
}

/** Setzt den Stand. Verwerfen und Wiederaufnehmen haben eigene Schritte; die Notiz (warum) ist freiwillig. */
export function setzeThemaStand(q: QualProjekt, id: string, stand: ThemaStand, notiz?: string, jetzt = Date.now()): QualProjekt {
  const t = themen(q).find(x => x.id === id);
  if (!t) throw new Error('unbekannt');
  if (t.stand === stand) return q;
  const was: ThemaSchritt['was'] = stand === 'verworfen' ? 'verworfen' : t.stand === 'verworfen' ? 'wieder-aufgenommen' : 'stand';
  return aendere(q, id, was, x => ({ ...x, stand }), { vorher: t.stand, nachher: stand, ...(notiz !== undefined ? { notiz } : {}) }, jetzt);
}

/**
 * Legt Themen zusammen: `zielId` bleibt und bekommt alle Codes und Belege der anderen (ohne Doppelte); die anderen bekommen den Stand
 * „verworfen“ mit dem Schritt „zusammengelegt“ und dem Namen des Ziels. Ihre Unterthemen hängen danach am Ziel. Nichts wird gelöscht.
 */
export function legeThemenZusammen(q: QualProjekt, zielId: string, andereIds: string[], notiz?: string, jetzt = Date.now()): QualProjekt {
  const alle = themen(q);
  const ziel = alle.find(t => t.id === zielId);
  const andere = [...new Set(andereIds)].filter(i => i !== zielId).map(i => alle.find(t => t.id === i));
  if (!ziel || !andere.length || andere.some(t => !t)) throw new Error('unbekannt');
  const weg = andere as Thema[];
  if (ziel.elternId !== undefined && alle.some(t => weg.some(w => t.elternId === w.id))) throw new Error('eine-ebene');
  const namen = weg.map(t => kurz(t.name)).join(' + ');
  let r = aendere(q, zielId, 'zusammengelegt', x => {
    const codes = [...new Set([...x.codes, ...weg.flatMap(t => t.codes)])];
    const belege = [...new Set([...(x.belege ?? []), ...weg.flatMap(t => t.belege ?? [])])];
    const y: Thema = { ...x, codes };
    if (belege.length) y.belege = belege;
    if (x.aus || weg.some(t => t.aus)) y.aus = [...new Set([...(x.aus ?? []), ...weg.flatMap(t => t.aus ?? [])])].filter(a => a !== x.id);
    return y;
  }, { vorher: namen, nachher: kurz(ziel.name), ...(notiz !== undefined ? { notiz } : {}) }, jetzt);
  for (const w of weg) {
    r = aendere(r, w.id, 'zusammengelegt', x => ({ ...x, stand: 'verworfen' }), { vorher: kurz(w.name), nachher: kurz(ziel.name), ...(notiz !== undefined ? { notiz } : {}) }, jetzt);
  }
  // Unterthemen der zusammengelegten Themen hängen jetzt am Ziel
  const wegIds = new Set(weg.map(t => t.id));
  r = { ...r, themen: themen(r).map(t => (t.elternId !== undefined && wegIds.has(t.elternId) ? { ...t, elternId: zielId } : t)) };
  return r;
}

/** Teilt ein Thema: ein neues Thema `name` bekommt `codes` (aus dem alten genommen). Beide bekommen den Schritt „geteilt“. */
export function teileThema(q: QualProjekt, id: string, name: string, codes: string[], notiz?: string, jetzt = Date.now()): { q: QualProjekt; id: string } {
  const t = themen(q).find(x => x.id === id);
  if (!t) throw new Error('unbekannt');
  const mit = codes.filter(c => t.codes.includes(c));
  const o: NeuesThema = { codes: mit, stand: t.stand === 'verworfen' ? 'kandidat' : t.stand };
  if (t.fall !== undefined) o.fall = t.fall;
  if (t.elternId !== undefined) o.elternId = t.elternId;
  const neu = legeThemaAn(q, name, o, jetzt);
  const n = themen(neu.q).find(x => x.id === neu.id)!;
  let r = aendere(neu.q, id, 'geteilt', x => ({ ...x, codes: x.codes.filter(c => !mit.includes(c)) }), { vorher: kurz(t.name), nachher: kurz(n.name), ...(notiz !== undefined ? { notiz } : {}) }, jetzt);
  r = aendere(r, neu.id, 'geteilt', x => x, { vorher: kurz(t.name), nachher: kurz(n.name), ...(notiz !== undefined ? { notiz } : {}) }, jetzt);
  return { q: r, id: neu.id };
}

/** Macht ein Thema zum Unterthema von `elternId` (nur eine Ebene) oder wieder zum Thema oberster Ebene (`undefined`). */
export function setzeThemaEltern(q: QualProjekt, id: string, elternId: string | undefined, jetzt = Date.now()): QualProjekt {
  const alle = themen(q);
  const t = alle.find(x => x.id === id);
  if (!t) throw new Error('unbekannt');
  if (t.elternId === elternId) return q;
  let name = '';
  if (elternId !== undefined) {
    const e = alle.find(x => x.id === elternId);
    if (!e || e.id === id) throw new Error('unbekannt');
    if (e.elternId !== undefined || alle.some(x => x.elternId === id)) throw new Error('eine-ebene');
    name = kurz(e.name);
  }
  const vorher = t.elternId !== undefined ? kurz(alle.find(x => x.id === t.elternId)?.name ?? '') : '';
  return aendere(q, id, 'eltern', x => {
    const y = { ...x, reihenfolge: Math.max(-1, ...alle.filter(z => z.elternId === elternId && z.id !== id).map(z => z.reihenfolge)) + 1 };
    if (elternId === undefined) delete y.elternId; else y.elternId = elternId;
    return y;
  }, { vorher, nachher: name }, jetzt);
}

/** Persönliches Erfahrungsthema (IPA): Fall setzen oder entfernen. */
export function setzeThemaFall(q: QualProjekt, id: string, fall: string | undefined, jetzt = Date.now()): QualProjekt {
  const t = themen(q).find(x => x.id === id);
  if (!t) throw new Error('unbekannt');
  if (t.fall === fall) return q;
  if (fall !== undefined && !q.faelle.some(f => f.id === fall)) throw new Error('unbekannt');
  if (!themaNameFrei(q, t.name, fall, id)) throw new Error('name-vergeben');
  const fn = (f: string | undefined) => (f ? kurz(q.faelle.find(x => x.id === f)?.name ?? '') : '');
  return aendere(q, id, 'fall', x => { const y = { ...x }; if (fall === undefined) delete y.fall; else y.fall = fall; return y; }, { vorher: fn(t.fall), nachher: fn(fall) }, jetzt);
}

/** Gruppenthema (IPA): die persönlichen Themen, aus denen es kommt. */
export function setzeThemaAus(q: QualProjekt, id: string, aus: string[], jetzt = Date.now()): QualProjekt {
  const alle = themen(q);
  const t = alle.find(x => x.id === id);
  if (!t) throw new Error('unbekannt');
  const ids = new Set(alle.map(x => x.id));
  const neu = [...new Set(aus.filter(a => ids.has(a) && a !== id))];
  const alt = t.aus ?? [];
  if (neu.length === alt.length && neu.every((a, i) => a === alt[i])) return q;
  return aendere(q, id, 'codes', x => { const y = { ...x }; if (neu.length) y.aus = neu; else delete y.aus; return y; }, { notiz: '' }, jetzt);
}

/** Verschiebt ein Thema unter seinen Geschwistern um eins nach oben (-1) oder unten (+1). Schreibt keinen Verlauf (nur Ordnung). */
export function verschiebeThema(q: QualProjekt, id: string, richtung: -1 | 1): QualProjekt {
  const alle = themen(q);
  const t = alle.find(x => x.id === id);
  if (!t) return q;
  const geschw = alle.filter(x => x.elternId === t.elternId).sort((a, b) => a.reihenfolge - b.reihenfolge || a.erstellt - b.erstellt);
  const i = geschw.findIndex(x => x.id === id), j = i + richtung;
  if (j < 0 || j >= geschw.length) return q;
  [geschw[i], geschw[j]] = [geschw[j]!, geschw[i]!];
  const pos = new Map(geschw.map((x, k) => [x.id, k]));
  return { ...q, themen: alle.map(x => (pos.has(x.id) ? { ...x, reihenfolge: pos.get(x.id)! } : x)) };
}

/* ---- Lesen und Zählen (Zählen ist erlaubt, Vorschlagen nicht) ---- */

/** Segmente, die mit einem Code des Themas kodiert sind (nur gezählt; welche ein Beleg ist, wählt die Person). */
export function themaSegmente(q: QualProjekt, t: Thema): string[] {
  const codes = new Set(t.codes);
  return [...new Set(q.kodierungen.filter(k => codes.has(k.code)).map(k => k.segment))];
}

/** Fälle mit mindestens einer Stelle des Themas (für „in 4 von 5 Fällen“, IPA). Dokumente ohne Fall zählen nicht. */
export function themaFaelle(q: QualProjekt, t: Thema): string[] {
  const segs = new Set(themaSegmente(q, t));
  const dokFall = new Map(q.dokumente.map(d => [d.id, d.fall]));
  const f = new Set<string>();
  for (const s of q.segmente) if (segs.has(s.id)) { const x = dokFall.get(s.dokument); if (x) f.add(x); }
  return q.faelle.filter(x => f.has(x.id)).map(x => x.id);
}

/** Formhinweise (Fachblatt: nur zur Form, nie zum Inhalt). Kennungen: `keine-codes`, `kein-konzept`. Verworfene bekommen keine. */
export function formhinweise(t: Thema): ('keine-codes' | 'kein-konzept')[] {
  if (t.stand === 'verworfen') return [];
  const h: ('keine-codes' | 'kein-konzept')[] = [];
  if (!t.codes.length && !(t.aus?.length)) h.push('keine-codes');
  if (!t.konzept) h.push('kein-konzept');
  return h;
}

/* ---- Verweise sauber halten (Architekturblatt Ausbau 2) ---- */

/**
 * Hält Themen und Einzelfall-Modus nach jeder Änderung am Projekt sauber: gelöschte Codes fallen aus den Themen (mit Schritt „Code ‚X‘
 * gelöscht“), gelöschte Segmente aus den Belegen; ein persönliches Thema, dessen Fall gelöscht wurde, verliert den Fall und wird verworfen
 * (mit Notiz); `einzelfall` verliert gelöschte Fälle; Zusammenfassungen zu gelöschten Themen fallen weg. Ohne Änderung: dasselbe Objekt.
 * `alt` (das Projekt vor der Änderung) liefert die Namen für den Verlauf; fehlt es, steht die Kennung im Verlauf.
 */
export function halteVerweise(alt: QualProjekt | undefined, neu: QualProjekt, jetzt = Date.now()): QualProjekt {
  if (!neu.themen?.length && !neu.einzelfall && !neu.zusammenfassungen?.some(z => z.art === 'thema')) return neu;
  const codeIds = new Set(neu.codes.map(c => c.id));
  const segIds = new Set(neu.segmente.map(s => s.id));
  const fallIds = new Set(neu.faelle.map(f => f.id));
  const codeName = (id: string): string => alt?.codes.find((c: Code) => c.id === id)?.name ?? id;
  const fallName = (id: string): string => alt?.faelle.find(f => f.id === id)?.name ?? id;
  let geaendert = false;
  let r = neu;
  if (neu.themen?.length) {
    const t2 = neu.themen.map(t => {
      const totCodes = t.codes.filter(c => !codeIds.has(c));
      const totBelege = (t.belege ?? []).filter(s => !segIds.has(s));
      const fallTot = t.fall !== undefined && !fallIds.has(t.fall);
      if (!totCodes.length && !totBelege.length && !fallTot) return t;
      geaendert = true;
      const x: Thema = { ...t, verlauf: [...t.verlauf], geaendert: jetzt };
      if (totCodes.length) {
        x.codes = t.codes.filter(c => codeIds.has(c));
        for (const c of totCodes) x.verlauf.push(schritt('codes', jetzt, neu.ich, { vorher: kurz(codeName(c)), notiz: `Code „${kurz(codeName(c))}“ gelöscht / code "${kurz(codeName(c))}" deleted` }));
      }
      if (totBelege.length) {
        const b = (t.belege ?? []).filter(s => segIds.has(s));
        if (b.length) x.belege = b; else delete x.belege;
      }
      if (fallTot) {
        const fn = kurz(fallName(t.fall!));
        delete x.fall;
        if (x.stand !== 'verworfen') { x.stand = 'verworfen'; x.verlauf.push(schritt('verworfen', jetzt, neu.ich, { vorher: t.stand, nachher: 'verworfen', notiz: `Fall „${fn}“ gelöscht / case "${fn}" deleted` })); }
        else x.verlauf.push(schritt('fall', jetzt, neu.ich, { vorher: fn, nachher: '', notiz: `Fall „${fn}“ gelöscht / case "${fn}" deleted` }));
      }
      return x;
    });
    if (geaendert) r = { ...r, themen: t2 };
  }
  if (neu.einzelfall) {
    const e = neu.einzelfall;
    const fertig = e.fertig.filter(f => fallIds.has(f));
    const aktTot = e.aktuell !== undefined && !fallIds.has(e.aktuell);
    if (fertig.length !== e.fertig.length || aktTot) {
      geaendert = true;
      const x = { ...e, fertig };
      if (aktTot) delete x.aktuell;
      r = { ...r, einzelfall: x };
    }
  }
  if (neu.zusammenfassungen?.some(z => z.art === 'thema')) {
    const tIds = new Set((r.themen ?? []).map(t => t.id));
    const z2 = neu.zusammenfassungen.filter(z => z.art !== 'thema' || tIds.has(z.code));
    if (z2.length !== neu.zusammenfassungen.length) { geaendert = true; r = { ...r, zusammenfassungen: z2 }; }
  }
  return geaendert ? r : neu;
}
