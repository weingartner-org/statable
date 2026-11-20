/**
 * Fragebogen planen, Paket 2C: die Logik des Editors als REINE Funktionen. Jede Funktion bekommt einen Plan und gibt einen NEUEN Plan zurück (der alte bleibt
 * unverändert; er ist der Schritt für „Rückgängig“). Keine Oberfläche, kein Zustand.
 *
 * Grundsatz: Text aus dem Plan (Fragetexte, Namen, Dateinamen) ist nur Daten. Er gelangt hier nie in einen Befehl oder in HTML; die Sätze für die Anzeige
 * entstehen als Text und werden von der Oberfläche als Textknoten gesetzt.
 *
 * Elemente werden über ihre `id` angesprochen. Bedingungen verweisen auf die `id` einer Frage (nicht auf den Namen), darum bleibt eine Bedingung beim Umbenennen heil.
 */
import {
  namensVorschlag, planPruefen, variablenAusPlan,
  type Antwortliste, type Bedingung, type Block, type Element, type Frage, type FragebogenPlan, type Lok, type Option, type PlanBefund, type PlanVariable, type Seite
} from './fragebogenplan';
import { L } from './sitzung.svelte';

export type Neu = 'seite' | 'frage' | 'block' | 'hinweis';
export type Fehlend = NonNullable<Option['fehlend']>;

/** Die Voreinstellung der Fehlendcodes (Architekturblatt: -8 weiß nicht, -9 keine Angabe, -7 trifft nicht zu). */
export const FEHLEND_CODE: Record<Fehlend, number> = { weissNicht: -8, keineAngabe: -9, trifftNichtZu: -7 };
export const FEHLEND_ARTEN: Fehlend[] = ['weissNicht', 'keineAngabe', 'trifftNichtZu'];
export const FEHLEND_TEXT: Record<Fehlend, Lok> = {
  weissNicht: { de: 'weiß nicht', en: "don't know" },
  keineAngabe: { de: 'keine Angabe', en: 'no answer' },
  trifftNichtZu: { de: 'trifft nicht zu', en: 'does not apply' }
};
export const FRAGE_TYPEN: Frage['typ'][] = ['einfach', 'mehrfach', 'zahl', 'text', 'datum', 'regler', 'rangfolge', 'einwilligung'];
export const LISTEN_TYPEN: Frage['typ'][] = ['einfach', 'mehrfach', 'rangfolge', 'regler'];

/* ------------------------------------------------------------------ Hilfen */
const klon = <T>(x: T): T => structuredClone(x);
export function neueId(): string {
  const c = globalThis.crypto;
  if (c?.randomUUID) return c.randomUUID();
  const b = c.getRandomValues(new Uint8Array(16)); b[6] = (b[6]! & 0x0f) | 0x40; b[8] = (b[8]! & 0x3f) | 0x80;
  const h = [...b].map(x => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}
/** Ein leerer Text je Sprache des Plans. */
export const leerLok = (plan: FragebogenPlan, text = ''): Lok => Object.fromEntries(plan.sprachen.map(s => [s, text]));
/** Ein Text aus einem Paar de/en, für die Sprachen des Plans (andere Sprachen bleiben leer, damit `planPruefen` sie meldet). */
export const lokAusPaar = (plan: FragebogenPlan, de: string, en: string): Lok => Object.fromEntries(plan.sprachen.map(s => [s, s === 'de' ? de : s === 'en' ? en : '']));
/** Text in der Sprache; fehlt er, der erste vorhandene (eine leere Beschriftung wäre schlimmer als eine fremdsprachige). */
export const lokText = (l: Lok | undefined, sprache: string): string => (l ? (l[sprache] || Object.values(l).find(x => x) || '') : '');
const kuerze = (t: string, n = 60) => (t.length > n ? t.slice(0, n - 1) + '…' : t);

export const alleElemente = (plan: FragebogenPlan): Element[] => plan.elemente.flatMap(s => s.elemente);
export const alleFragen = (plan: FragebogenPlan): Frage[] => alleElemente(plan).filter((e): e is Frage => e.art === 'frage');

export interface Fund { seite: Seite; seiteIndex: number; element?: Element; index: number }
/** Findet eine Seite oder ein Element; `index` ist die Stelle in der Seite (bei einer Seite: in der Seitenliste). */
export function finde(plan: FragebogenPlan, id: string): Fund | null {
  for (let si = 0; si < plan.elemente.length; si++) {
    const s = plan.elemente[si]!;
    if (s.id === id) return { seite: s, seiteIndex: si, index: si };
    const i = s.elemente.findIndex(e => e.id === id);
    if (i >= 0) return { seite: s, seiteIndex: si, element: s.elemente[i]!, index: i };
  }
  return null;
}
export const elementVon = (plan: FragebogenPlan, id: string): Seite | Element | null => { const f = finde(plan, id); return f ? (f.element ?? f.seite) : null; };

/** Alle Namen, die schon belegt sind: Elementnamen, Seitennamen und abgeleitete Variablennamen (klein geschrieben). */
export function vergebeneNamen(plan: FragebogenPlan, ausser?: string): string[] {
  const n = new Set<string>();
  for (const s of plan.elemente) { if (s.id !== ausser) n.add(s.name.toLowerCase()); for (const e of s.elemente) { if (e.id !== ausser) n.add(e.name.toLowerCase()); } }
  const ohne = ausser ? klon(plan) : plan;
  if (ausser) for (const s of ohne.elemente) s.elemente = s.elemente.filter(e => e.id !== ausser);
  for (const v of variablenAusPlan(ohne, plan.sprachen[0])) n.add((v.name ?? '').toLowerCase());
  return [...n];
}

/* ------------------------------------------------------------------ Hinzufügen */
/** Eine neue Frage mit Vorgaben (Typ „einfach“, ohne Liste: die Person wählt oder legt sie an). */
function neueFrage(plan: FragebogenPlan, text?: Lok): Frage {
  return { art: 'frage', id: neueId(), name: namensVorschlag(lokText(text, plan.sprachen[0] ?? 'de') || 'frage', vergebeneNamen(plan)), typ: 'einfach', text: text ?? leerLok(plan), kodebuch: { niveau: 'nominal' } };
}
function neuerBlock(plan: FragebogenPlan): Block {
  const items = [1, 2, 3].map(i => ({ id: neueId(), name: `i${i}`, text: leerLok(plan) }));
  return { art: 'block', id: neueId(), name: namensVorschlag('block', vergebeneNamen(plan)), text: leerLok(plan), liste: '', items, kodebuch: { niveau: 'ordinal' } };
}
function neuerHinweis(plan: FragebogenPlan): Element {
  return { art: 'hinweis', id: neueId(), name: namensVorschlag('hinweis', vergebeneNamen(plan)), text: leerLok(plan) };
}
function neueSeite(plan: FragebogenPlan): Seite {
  // ohne Titel: ein leerer Titel wäre sofort ein Fehler (jede Sprache braucht einen Text); ohne Titel zeigt die Seite den Titel des Fragebogens
  return { art: 'seite', id: neueId(), name: namensVorschlag('seite', vergebeneNamen(plan)), elemente: [] };
}

/**
 * Fügt ein Element hinzu. Wo es hinkommt, richtet sich nach `auswahl` (die gewählte Seite oder das gewählte Element):
 * eine Seite kommt hinter die gewählte Seite, alles andere hinter das gewählte Element (bei gewählter Seite ans Ende der Seite).
 * Gibt es noch keine Seite, entsteht eine. Gibt den neuen Plan und die id des neuen Elements zurück.
 */
export function hinzufuegen(plan: FragebogenPlan, art: Neu, auswahl: string | null): { plan: FragebogenPlan; id: string } {
  const p = klon(plan);
  const f = auswahl ? finde(p, auswahl) : null;
  if (art === 'seite') {
    const s = neueSeite(p);
    p.elemente.splice(f ? f.seiteIndex + 1 : p.elemente.length, 0, s);
    return { plan: p, id: s.id };
  }
  let ziel = f ? p.elemente[f.seiteIndex]! : p.elemente.at(-1);
  if (!ziel) { ziel = neueSeite(p); p.elemente.push(ziel); }
  const el = art === 'frage' ? neueFrage(p) : art === 'block' ? neuerBlock(p) : neuerHinweis(p);
  ziel.elemente.splice(f?.element ? f.index + 1 : ziel.elemente.length, 0, el);
  return { plan: p, id: el.id };
}

/* ------------------------------------------------------------------ Verschieben */
/**
 * Verschiebt eine Seite oder ein Element um eine Stelle (`-1` hoch, `1` runter). Ein Element an der Kante einer Seite wechselt auf die vorige oder nächste Seite.
 * `ok` ist falsch, wenn es nicht weiter geht; dann ist `plan` derselbe wie vorher. `wohin` beschreibt die neue Stelle (1-basiert) für die Ansage.
 */
export function verschieben(plan: FragebogenPlan, id: string, richtung: -1 | 1): { plan: FragebogenPlan; ok: boolean; wohin?: { stelle: number; von: number; seite: number; seiten: number; seiteGewechselt: boolean } } {
  const f = finde(plan, id);
  if (!f) return { plan, ok: false };
  const p = klon(plan);
  if (!f.element) {
    const j = f.seiteIndex + richtung;
    if (j < 0 || j >= p.elemente.length) return { plan, ok: false };
    const [s] = p.elemente.splice(f.seiteIndex, 1);
    p.elemente.splice(j, 0, s!);
    return { plan: p, ok: true, wohin: { stelle: j + 1, von: p.elemente.length, seite: j + 1, seiten: p.elemente.length, seiteGewechselt: false } };
  }
  const s = p.elemente[f.seiteIndex]!;
  const j = f.index + richtung;
  if (j >= 0 && j < s.elemente.length) {
    const [e] = s.elemente.splice(f.index, 1);
    s.elemente.splice(j, 0, e!);
    return { plan: p, ok: true, wohin: { stelle: j + 1, von: s.elemente.length, seite: f.seiteIndex + 1, seiten: p.elemente.length, seiteGewechselt: false } };
  }
  const nachbar = p.elemente[f.seiteIndex + richtung];
  if (!nachbar) return { plan, ok: false };
  const [e] = s.elemente.splice(f.index, 1);
  if (richtung < 0) nachbar.elemente.push(e!); else nachbar.elemente.unshift(e!);
  return { plan: p, ok: true, wohin: { stelle: richtung < 0 ? nachbar.elemente.length : 1, von: nachbar.elemente.length, seite: f.seiteIndex + richtung + 1, seiten: p.elemente.length, seiteGewechselt: true } };
}

/* ------------------------------------------------------------------ Löschen */
const bedingungsIds = (b: Bedingung | undefined): string[] => {
  if (!b) return [];
  if ('und' in b) return b.und.flatMap(bedingungsIds);
  if ('oder' in b) return b.oder.flatMap(bedingungsIds);
  if ('nicht' in b) return bedingungsIds(b.nicht);
  return [b.frage];
};
/** Die ids von Seite oder Element samt allem darin (eine Seite: sie selbst und ihre Elemente). */
export function idsInnerhalb(plan: FragebogenPlan, id: string): string[] {
  const f = finde(plan, id);
  if (!f) return [];
  return f.element ? [f.element.id] : [f.seite.id, ...f.seite.elemente.map(e => e.id)];
}
/** Die Elemente (und Seiten), deren Bedingung auf `id` oder etwas darin verweist - ohne die Elemente, die selbst gelöscht werden. */
export function verweiseAuf(plan: FragebogenPlan, id: string): string[] {
  const ziele = new Set(idsInnerhalb(plan, id));
  const treffer: string[] = [];
  const pruefe = (x: Seite | Element) => {
    if (ziele.has(x.id)) return;
    const ids = [...bedingungsIds(x.wennGezeigt), ...(x.art === 'frage' ? bedingungsIds(x.gueltig?.regel) : [])];
    if (ids.some(i => ziele.has(i))) treffer.push(x.id);
  };
  for (const s of plan.elemente) { pruefe(s); s.elemente.forEach(pruefe); }
  return treffer;
}
/**
 * Löscht eine Seite (samt ihren Elementen) oder ein Element. `entfernt` zählt die gelöschten Elemente, `verwaist` die Bedingungen anderer Elemente,
 * die auf Gelöschtes verweisen (sie bleiben stehen und erscheinen bei den Befunden als Fehler: nichts wird still umgebaut). `nachher` ist die Stelle, die danach gewählt wird.
 */
export function loeschen(plan: FragebogenPlan, id: string): { plan: FragebogenPlan; entfernt: number; verwaist: number; nachher: string | null } {
  const f = finde(plan, id);
  if (!f) return { plan, entfernt: 0, verwaist: 0, nachher: null };
  const verwaist = verweiseAuf(plan, id).length;
  const p = klon(plan);
  if (!f.element) {
    const [s] = p.elemente.splice(f.seiteIndex, 1);
    const nach = p.elemente[Math.min(f.seiteIndex, p.elemente.length - 1)];
    return { plan: p, entfernt: 1 + (s?.elemente.length ?? 0), verwaist, nachher: nach?.id ?? null };
  }
  const s = p.elemente[f.seiteIndex]!;
  s.elemente.splice(f.index, 1);
  const nach = s.elemente[Math.min(f.index, s.elemente.length - 1)] ?? s;
  return { plan: p, entfernt: 1, verwaist, nachher: nach.id };
}

/* ------------------------------------------------------------------ Bearbeiten (allgemein) */
/** Ändert eine Kopie von Seite oder Element mit `fn`. Unbekannte id: derselbe Plan. */
export function aendere<T extends Seite | Element = Seite | Element>(plan: FragebogenPlan, id: string, fn: (x: T) => void): FragebogenPlan {
  const p = klon(plan);
  const x = elementVon(p, id) as T | null;
  if (!x) return plan;
  fn(x);
  return p;
}

const STANDARD_NAME = /^(frage|block|hinweis|seite)\d*$/;
/**
 * Setzt den Text in einer Sprache. Bei der ersten Sprache folgt der NAME dem Fragetext, solange er noch der Vorschlag ist
 * (also nicht von Hand geändert wurde); sonst bleibt er. Gilt für Fragen und Blöcke.
 */
export function setzeText(plan: FragebogenPlan, id: string, sprache: string, text: string): FragebogenPlan {
  const alt = elementVon(plan, id);
  if (!alt) return plan;
  const andere = vergebeneNamen(plan, id);
  const war = alt.art === 'seite' ? '' : lokText(alt.text, plan.sprachen[0] ?? 'de');
  const folgt = alt.art !== 'seite' && alt.art !== 'hinweis' && sprache === (plan.sprachen[0] ?? 'de')
    && (STANDARD_NAME.test(alt.name) || alt.name === namensVorschlag(war, andere));
  return aendere(plan, id, x => {
    if (x.art === 'seite') return;
    x.text = { ...x.text, [sprache]: text };
    if (folgt && text.trim()) x.name = namensVorschlag(text, andere);
  });
}
/** Ändert den Namen einer Frage, eines Blocks oder einer Seite. Das Ergebnis prüft `planPruefen` (gültig, eindeutig); hier wird nur gesetzt. */
export const setzeName = (plan: FragebogenPlan, id: string, name: string): FragebogenPlan => aendere(plan, id, x => { x.name = name.trim(); });
/** Der Namensvorschlag aus dem Text der ersten Sprache, frei gegenüber allen anderen Namen. */
export function vorschlagFuer(plan: FragebogenPlan, id: string): string {
  const x = elementVon(plan, id);
  const text = x && x.art !== 'seite' ? lokText(x.text, plan.sprachen[0] ?? 'de') : x ? lokText(x.titel, plan.sprachen[0] ?? 'de') : '';
  return namensVorschlag(text || (x?.art === 'block' ? 'block' : x?.art === 'seite' ? 'seite' : x?.art === 'hinweis' ? 'hinweis' : 'frage'), vergebeneNamen(plan, id));
}

/** Wechselt den Typ einer Frage und räumt auf, was zum neuen Typ nicht passt (Zahl-Grenzen, Text-Optionen, Liste), damit nichts Unpassendes im Plan stehen bleibt. */
export function setzeTyp(plan: FragebogenPlan, id: string, typ: Frage['typ']): FragebogenPlan {
  return aendere<Frage>(plan, id, f => {
    if (f.art !== 'frage') return;
    f.typ = typ;
    if (typ === 'zahl') { f.zahl = { ganz: false, ...f.zahl }; f.kodebuch.niveau = 'skala'; }
    else if (typ === 'regler') { f.zahl = { min: 1, max: 5, schritt: 1, ganz: true, ...f.zahl }; if (f.kodebuch.niveau === 'nominal') f.kodebuch.niveau = 'ordinal'; }
    else { delete f.zahl; }
    if (typ === 'text') f.text_ = { mehrzeilig: false, ...f.text_ }; else delete f.text_;
    if (!LISTEN_TYPEN.includes(typ)) { delete f.liste; delete f.anders; delete f.zufall; }
    if (typ === 'mehrfach' || typ === 'text' || typ === 'einwilligung' || typ === 'datum') f.kodebuch.niveau = typ === 'datum' ? 'skala' : 'nominal';
    if (typ === 'rangfolge') f.kodebuch.niveau = 'ordinal';
    if (typ === 'einwilligung' && !f.pflicht) f.pflicht = { an: true };
  });
}

/* ------------------------------------------------------------------ Items von Blöcken */
export function itemHinzu(plan: FragebogenPlan, blockId: string): { plan: FragebogenPlan; id: string } {
  const id = neueId();
  const neu = aendere<Block>(plan, blockId, b => {
    if (b.art !== 'block') return;
    const benutzt = new Set(b.items.map(i => i.name.toLowerCase()));
    let n = b.items.length + 1;
    while (benutzt.has(`i${n}`)) n++;
    b.items.push({ id, name: `i${n}`, text: leerLok(plan) });
  });
  return { plan: neu, id };
}
export function itemLoeschen(plan: FragebogenPlan, blockId: string, itemId: string): FragebogenPlan {
  return aendere<Block>(plan, blockId, b => { if (b.art === 'block') b.items = b.items.filter(i => i.id !== itemId); });
}
export function itemVerschieben(plan: FragebogenPlan, blockId: string, itemId: string, richtung: -1 | 1): { plan: FragebogenPlan; ok: boolean; stelle?: number; von?: number } {
  const b = elementVon(plan, blockId);
  if (!b || b.art !== 'block') return { plan, ok: false };
  const i = b.items.findIndex(x => x.id === itemId), j = i + richtung;
  if (i < 0 || j < 0 || j >= b.items.length) return { plan, ok: false };
  const neu = aendere<Block>(plan, blockId, x => { if (x.art === 'block') { const [it] = x.items.splice(i, 1); x.items.splice(j, 0, it!); } });
  return { plan: neu, ok: true, stelle: j + 1, von: b.items.length };
}

/* ------------------------------------------------------------------ Antwortlisten */
/** Wie oft eine Liste benutzt wird: Fragen und Blöcke, die auf sie zeigen. */
export function listeBenutzung(plan: FragebogenPlan, listeId: string): number {
  return alleElemente(plan).filter(e => (e.art === 'frage' || e.art === 'block') && e.liste === listeId).length;
}
/** Die Elemente, die eine Liste benutzen (für „benutzt von“). */
export const listeBenutzer = (plan: FragebogenPlan, listeId: string): (Frage | Block)[] => alleElemente(plan).filter((e): e is Frage | Block => (e.art === 'frage' || e.art === 'block') && e.liste === listeId);

const nameFrei = (belegt: string[], basis: string) => { let n = basis, k = 2; while (belegt.includes(n.toLowerCase())) n = `${basis}${k++}`; return n; };
/** Eine neue Antwortliste (leer oder mit Optionen). Der Name ist ein Name zum Wiedererkennen und muss unter den Listen eindeutig sein. */
export function neueListe(plan: FragebogenPlan, name = 'liste', optionen: Option[] = [], geordnet = false): { plan: FragebogenPlan; id: string } {
  const p = klon(plan);
  const id = neueId();
  p.antwortlisten.push({ id, name: nameFrei(p.antwortlisten.map(l => l.name.toLowerCase()), name), geordnet, optionen: klon(optionen) });
  return { plan: p, id };
}
/** Nur eine Liste, die niemand benutzt, kann gelöscht werden; sonst bleibt der Plan, wie er ist (`null`). */
export function listeLoeschen(plan: FragebogenPlan, listeId: string): FragebogenPlan | null {
  if (listeBenutzung(plan, listeId) > 0) return null;
  const p = klon(plan);
  p.antwortlisten = p.antwortlisten.filter(l => l.id !== listeId);
  return p;
}
/** Eine Liste ändern (Kopie der Liste, `fn` ändert sie). */
export function aendereListe(plan: FragebogenPlan, listeId: string, fn: (l: Antwortliste) => void): FragebogenPlan {
  const p = klon(plan);
  const l = p.antwortlisten.find(x => x.id === listeId);
  if (!l) return plan;
  fn(l);
  return p;
}
/** Der nächste freie Code der Antwortstufen: höchster nicht-negativer Code + 1 (1 bei einer leeren Liste). */
export const naechsterCode = (l: Antwortliste): number => Math.max(0, ...l.optionen.filter(o => !o.fehlend && o.wert >= 0).map(o => o.wert)) + 1;
function optionId(l: Antwortliste): string {
  let n = l.optionen.length + 1;
  while (l.optionen.some(o => o.id === `${l.id}:o${n}`)) n++;
  return `${l.id}:o${n}`;
}
/** Eine Option anfügen. Mit `fehlend` bekommt sie den Fehlendcode (-8/-9/-7) und den Standardtext; ohne den nächsten Stufencode. */
export function optionHinzu(plan: FragebogenPlan, listeId: string, fehlend?: Fehlend): { plan: FragebogenPlan; id: string } {
  let id = '';
  const neu = aendereListe(plan, listeId, l => {
    id = optionId(l);
    const o: Option = { id, wert: fehlend ? FEHLEND_CODE[fehlend] : naechsterCode(l), text: fehlend ? lokAusPaar(plan, FEHLEND_TEXT[fehlend].de!, FEHLEND_TEXT[fehlend].en!) : leerLok(plan) };
    if (fehlend) o.fehlend = fehlend;
    l.optionen.push(o);
  });
  return { plan: neu, id };
}
export function optionLoeschen(plan: FragebogenPlan, listeId: string, optId: string): FragebogenPlan {
  return aendereListe(plan, listeId, l => { l.optionen = l.optionen.filter(o => o.id !== optId); });
}
export function optionVerschieben(plan: FragebogenPlan, listeId: string, optId: string, richtung: -1 | 1): { plan: FragebogenPlan; ok: boolean; stelle?: number; von?: number } {
  const l = plan.antwortlisten.find(x => x.id === listeId);
  const i = l ? l.optionen.findIndex(o => o.id === optId) : -1, j = i + richtung;
  if (!l || i < 0 || j < 0 || j >= l.optionen.length) return { plan, ok: false };
  return { plan: aendereListe(plan, listeId, x => { const [o] = x.optionen.splice(i, 1); x.optionen.splice(j, 0, o!); }), ok: true, stelle: j + 1, von: l.optionen.length };
}
/**
 * Die Fehlend-Art einer Option setzen (oder entfernen mit `undefined`). Mit einer Art ohne eigenen Code bekommt die Option den Standardcode;
 * ohne Art mit negativem Code bekommt sie den nächsten Stufencode (eine echte Antwort darf nicht im Fehlendbereich liegen).
 */
export function setzeFehlend(plan: FragebogenPlan, listeId: string, optId: string, art: Fehlend | undefined): FragebogenPlan {
  return aendereListe(plan, listeId, l => {
    const o = l.optionen.find(x => x.id === optId);
    if (!o) return;
    if (art) { o.fehlend = art; if (o.wert >= 0) o.wert = FEHLEND_CODE[art]; }
    else { delete o.fehlend; if (o.wert < 0) o.wert = naechsterCode({ ...l, optionen: l.optionen.filter(x => x !== o) }); }
  });
}
/** Bei einer Frage: die Liste wählen (`undefined` = keine). Für einen Block ebenso. */
export const waehleListe = (plan: FragebogenPlan, id: string, listeId: string | undefined): FragebogenPlan =>
  aendere<Frage | Block>(plan, id, x => { if (x.art === 'frage') { if (listeId) x.liste = listeId; else delete x.liste; } else if (x.art === 'block') x.liste = listeId ?? ''; });
/** Macht aus der Liste einer Frage eine eigene Kopie (damit sie sich ändern lässt, ohne die anderen Fragen zu ändern). */
export function listeKopieren(plan: FragebogenPlan, id: string): { plan: FragebogenPlan; listeId: string } | null {
  const x = elementVon(plan, id);
  if (!x || (x.art !== 'frage' && x.art !== 'block')) return null;
  const l = plan.antwortlisten.find(y => y.id === x.liste);
  if (!l) return null;
  const { plan: mit, id: neu } = neueListe(plan, `${l.name}_kopie`, l.optionen.map(o => ({ ...klon(o), id: '' })), l.geordnet);
  const fertig = aendereListe(mit, neu, k => { k.optionen.forEach((o, i) => { o.id = `${k.id}:o${i + 1}`; }); });
  return { plan: waehleListe(fertig, id, neu), listeId: neu };
}

/* ------------------------------------------------------------------ Bedingungen als Auswahl und als Satz */
export type Vergleich = '=' | '≠' | '<' | '≤' | '>' | '≥' | 'gewaehlt' | 'nichtGewaehlt' | 'beantwortet' | 'unbeantwortet';
export interface BedingungsTeil { frage: string; op: Vergleich; wert: number }
export interface BedingungsForm { verknuepfung: 'und' | 'oder'; teile: BedingungsTeil[] }
const VERGLEICHE: Vergleich[] = ['=', '≠', '<', '≤', '>', '≥'];
export const istVergleichsOp = (op: Vergleich): op is '=' | '≠' | '<' | '≤' | '>' | '≥' => VERGLEICHE.includes(op);

/** Welche Operatoren zu einer Frage passen (nach Typ): Auswahl und Zahl vergleichen, Mehrfachauswahl prüft „angekreuzt“, jede Frage kann „beantwortet“ sein. */
export function operatorenFuer(f: Frage | undefined): Vergleich[] {
  if (!f) return ['beantwortet', 'unbeantwortet'];
  switch (f.typ) {
    case 'einfach': case 'regler': return ['=', '≠', '<', '≤', '>', '≥', 'beantwortet', 'unbeantwortet'];
    case 'zahl': return ['=', '≠', '<', '≤', '>', '≥', 'beantwortet', 'unbeantwortet'];
    case 'mehrfach': return ['gewaehlt', 'nichtGewaehlt', 'beantwortet', 'unbeantwortet'];
    case 'rangfolge': case 'text': case 'datum': case 'einwilligung': return ['beantwortet', 'unbeantwortet'];
  }
}
export const operatorHatWert = (op: Vergleich) => op !== 'beantwortet' && op !== 'unbeantwortet';

const teilVon = (b: Bedingung): BedingungsTeil | null => {
  if ('nicht' in b) { const i = b.nicht; return 'gewaehlt' in i ? { frage: i.frage, op: 'nichtGewaehlt', wert: i.gewaehlt } : null; }
  if (!('frage' in b)) return null;
  if ('ist' in b) return { frage: b.frage, op: b.ist, wert: b.wert };
  if ('gewaehlt' in b) return { frage: b.frage, op: 'gewaehlt', wert: b.gewaehlt };
  return { frage: b.frage, op: b.beantwortet ? 'beantwortet' : 'unbeantwortet', wert: 0 };
};
/** Eine Bedingung als Formular (Zeilen mit Frage, Operator, Wert). `null`: keine Bedingung. `'komplex'`: verschachtelter Baum (aus Import), der sich im Formular nicht abbilden lässt. */
export function formAusBedingung(b: Bedingung | undefined): BedingungsForm | 'komplex' | null {
  if (!b) return null;
  const einzel = teilVon(b);
  if (einzel) return { verknuepfung: 'und', teile: [einzel] };
  const liste = 'und' in b ? b.und : 'oder' in b ? b.oder : null;
  if (!liste) return 'komplex';
  const teile = liste.map(teilVon);
  if (!teile.length || teile.some(t => !t)) return 'komplex';
  return { verknuepfung: 'und' in b ? 'und' : 'oder', teile: teile as BedingungsTeil[] };
}
const blatt = (t: BedingungsTeil): Bedingung =>
  istVergleichsOp(t.op) ? { frage: t.frage, ist: t.op, wert: t.wert }
  : t.op === 'gewaehlt' ? { frage: t.frage, gewaehlt: t.wert }
  : t.op === 'nichtGewaehlt' ? { nicht: { frage: t.frage, gewaehlt: t.wert } }
  : { frage: t.frage, beantwortet: t.op === 'beantwortet' };
/** Das Formular zurück in einen Bedingungsbaum; ohne Zeilen `undefined` (keine Bedingung). */
export function bedingungAusForm(f: BedingungsForm | null): Bedingung | undefined {
  if (!f || !f.teile.length) return undefined;
  if (f.teile.length === 1) return blatt(f.teile[0]!);
  return f.verknuepfung === 'oder' ? { oder: f.teile.map(blatt) } : { und: f.teile.map(blatt) };
}

/** Die Fragen, auf die eine Bedingung von `id` (Element oder Seite) verweisen darf: nur Fragen, die in der Reihenfolge davor stehen. */
export function moeglicheFragen(plan: FragebogenPlan, id: string): Frage[] {
  const aus: Frage[] = [];
  for (const s of plan.elemente) {
    if (s.id === id) return aus;
    for (const e of s.elemente) { if (e.id === id) return aus; if (e.art === 'frage') aus.push(e); }
  }
  return aus;
}
/** Wie eine Frage in einem Satz heißt: Kurzlabel, sonst Fragetext (gekürzt), sonst Name. */
export const frageTitel = (f: Frage | Block, sprache: string): string => kuerze(lokText((f as Frage).kurz, sprache) || lokText(f.text, sprache) || f.name);

/** Der Wert (Code) einer Bedingung als lesbarer Text: bei Listen der Text der Option, sonst die Zahl. */
function wertText(plan: FragebogenPlan, f: Frage | undefined, wert: number, sprache: string): string {
  const l = plan.antwortlisten.find(x => x.id === f?.liste);
  const o = l?.optionen.find(x => x.wert === wert);
  if (o && (f?.typ === 'einfach' || f?.typ === 'mehrfach' || f?.typ === 'regler')) return lokText(o.text, sprache) || String(wert);
  return String(wert);
}
const qu = (t: string) => `‚${t}‘`;
/** Eine Bedingung als Satzteil: „‚Rauchen Sie?‘ = ‚Ja‘“. */
export function bedingungText(plan: FragebogenPlan, b: Bedingung, sprache: string): string {
  if ('und' in b) return b.und.map(x => bedingungText(plan, x, sprache)).join(L(' und ', ' and '));
  if ('oder' in b) return b.oder.map(x => bedingungText(plan, x, sprache)).join(L(' oder ', ' or '));
  if ('nicht' in b) {
    const i = b.nicht;
    if ('gewaehlt' in i) { const f = alleFragen(plan).find(x => x.id === i.frage); return L(`${qu(f ? frageTitel(f, sprache) : '?')} enthält nicht ${qu(wertText(plan, f, i.gewaehlt, sprache))}`, `${qu(f ? frageTitel(f, sprache) : '?')} does not include ${qu(wertText(plan, f, i.gewaehlt, sprache))}`); }
    return L(`nicht (${bedingungText(plan, i, sprache)})`, `not (${bedingungText(plan, i, sprache)})`);
  }
  const f = alleFragen(plan).find(x => x.id === b.frage);
  const name = f ? frageTitel(f, sprache) : L('(Frage fehlt)', '(question missing)');
  if ('ist' in b) return `${qu(name)} ${b.ist} ${qu(wertText(plan, f, b.wert, sprache))}`;
  if ('gewaehlt' in b) return L(`${qu(name)} enthält ${qu(wertText(plan, f, b.gewaehlt, sprache))}`, `${qu(name)} includes ${qu(wertText(plan, f, b.gewaehlt, sprache))}`);
  return b.beantwortet ? L(`${qu(name)} ist beantwortet`, `${qu(name)} is answered`) : L(`${qu(name)} ist nicht beantwortet`, `${qu(name)} is not answered`);
}
/** Der ganze Satz für die Anzeige: „Nur zeigen, wenn ‚Rauchen Sie?‘ = ‚Ja‘“; ohne Bedingung „Wird immer gezeigt“. */
export function bedingungSatz(plan: FragebogenPlan, b: Bedingung | undefined, sprache: string): string {
  return b ? L('Nur zeigen, wenn ', 'Only show if ') + bedingungText(plan, b, sprache) : L('Wird immer gezeigt.', 'Is always shown.');
}
/** Setzt die Bedingung eines Elements oder einer Seite (`undefined` entfernt sie). */
export const setzeBedingung = (plan: FragebogenPlan, id: string, b: Bedingung | undefined): FragebogenPlan =>
  aendere(plan, id, x => { if (b) x.wennGezeigt = klon(b); else delete x.wennGezeigt; });

/* ------------------------------------------------------------------ Kodebuch: Namen und Labels */
/** Kann der Name dieser Variable hier geändert werden? Nur Variablen, deren Name direkt von einem Element kommt (Frage, Block-Item); abgeleitete (Option, Anders, Kommentar) folgen dem Namen der Frage. */
export const nameAenderbar = (v: PlanVariable): boolean => !v.quelle.option && !v.quelle.teil;
export const labelAenderbar = (v: PlanVariable): boolean => !v.quelle.option && !v.quelle.teil;
/** Setzt den Namen der Variable `v` (bei einem Block-Item der Teil nach dem Blocknamen). */
export function benenneVariable(plan: FragebogenPlan, v: PlanVariable, name: string): FragebogenPlan {
  if (!nameAenderbar(v)) return plan;
  const n = name.trim();
  return aendere(plan, v.quelle.element, x => {
    if (x.art === 'block' && v.quelle.item) { const it = x.items.find(i => i.id === v.quelle.item); if (it) it.name = n.startsWith(`${x.name}_`) ? n.slice(x.name.length + 1) : n; }
    else if (x.art !== 'seite' && x.art !== 'hinweis') x.name = n;
  });
}
/** Setzt das Label (Kurzlabel) der Variable in einer Sprache. */
export function beschrifteVariable(plan: FragebogenPlan, v: PlanVariable, sprache: string, label: string): FragebogenPlan {
  if (!labelAenderbar(v)) return plan;
  return aendere(plan, v.quelle.element, x => {
    if (x.art === 'block' && v.quelle.item) { const it = x.items.find(i => i.id === v.quelle.item); if (it) it.kurz = { ...(it.kurz ?? {}), [sprache]: label }; }
    else if (x.art === 'frage') x.kurz = { ...(x.kurz ?? {}), [sprache]: label };
  });
}
/** Woher eine Variable im Kodebuch kommt, als Wort. */
export function herkunftText(v: PlanVariable): string {
  if (v.quelle.teil === 'anders') return L('Zusatzfeld „Anderes“', 'Extra field "Other"');
  if (v.quelle.teil === 'kommentar') return L('Pretest-Kommentar', 'Pretest comment');
  if (v.quelle.item) return L('Item im Block', 'Item in block');
  if (v.quelle.option) return L('Antwortoption', 'Answer option');
  return L('Frage', 'Question');
}

/* ------------------------------------------------------------------ Befunde */
export type BefundQuelle = 'plan' | 'editor';
export interface EditorBefund extends PlanBefund { quelle: BefundQuelle }
/**
 * Befunde des Editors: `planPruefen` (Regeln aus Paket 2A) und was der Editor selbst sieht (Frage ohne Antwortliste, Liste ohne Optionen).
 * Gleiche Form `{ art, regel, element, text }` wie jede andere Befundliste (zum Beispiel die Qualitätsprüfung aus 2D, die an anderer Stelle eingehängt wird).
 */
export function editorBefunde(plan: FragebogenPlan): EditorBefund[] {
  const aus: EditorBefund[] = planPruefen(plan).map(b => ({ ...b, quelle: 'plan' as const }));
  const listen = new Map(plan.antwortlisten.map(l => [l.id, l]));
  for (const l of plan.antwortlisten) {
    const codes = new Set<number>();
    for (const o of l.optionen) {
      if (codes.has(o.wert)) aus.push({ quelle: 'editor', art: 'fehler', regel: 'code-doppelt', element: o.id, text: L(`In der Antwortliste „${l.name}“ kommt der Code ${o.wert} mehr als einmal vor. Jede Antwort braucht einen eigenen Code.`, `In the answer list "${l.name}" the code ${o.wert} occurs more than once. Every answer needs its own code.`) });
      codes.add(o.wert);
    }
  }
  for (const e of alleElemente(plan)) {
    if (e.art === 'frage' && (e.typ === 'einfach' || e.typ === 'mehrfach' || e.typ === 'rangfolge')) {
      if (!e.liste || !listen.has(e.liste)) aus.push({ quelle: 'editor', art: 'fehler', regel: 'liste-fehlt', element: e.id, text: L(`Die Frage „${e.name}“ braucht eine Antwortliste.`, `The question "${e.name}" needs an answer list.`) });
      else if (!listen.get(e.liste)!.optionen.length) aus.push({ quelle: 'editor', art: 'fehler', regel: 'liste-leer', element: e.id, text: L(`Die Antwortliste der Frage „${e.name}“ hat noch keine Antworten.`, `The answer list of the question "${e.name}" has no answers yet.`) });
    }
    if (e.art === 'block' && (!e.liste || !listen.get(e.liste))) aus.push({ quelle: 'editor', art: 'fehler', regel: 'liste-fehlt', element: e.id, text: L(`Der Block „${e.name}“ braucht eine Antwortliste.`, `The block "${e.name}" needs an answer list.`) });
  }
  return aus;
}
/** Wohin ein Befund führt: das Element (oder die Seite) in der Gliederung; Optionen und Block-Items führen zum Element, das die Liste benutzt, oder zur Liste. */
export function befundZiel(plan: FragebogenPlan, element: string | undefined): { auswahl?: string; liste?: string } {
  if (!element) return {};
  if (finde(plan, element)) return { auswahl: element };
  for (const e of alleElemente(plan)) if (e.art === 'block' && e.items.some(i => i.id === element)) return { auswahl: e.id };
  for (const l of plan.antwortlisten) if (l.id === element || l.optionen.some(o => o.id === element)) return { liste: l.id };
  return {};
}

/* ------------------------------------------------------------------ Neuer Plan */
/** Ein leerer Plan mit Titel; Sprachen de und en. */
export function neuerPlan(titel: Lok = { de: 'Neuer Fragebogen', en: 'New questionnaire' }, sprachen: string[] = ['de', 'en']): FragebogenPlan {
  const t: Lok = Object.fromEntries(sprachen.map(s => [s, titel[s] ?? '']));
  const plan: FragebogenPlan = {
    format: 'statable-fragebogen', version: 1, id: neueId(), revision: 1, titel: t, sprachen: [...sprachen],
    einstellungen: { fortschritt: true, zurueck: true, pretest: false, fehlendFilter: 'code' },
    antwortlisten: [], skalen: [], elemente: [], herkunft: { art: 'neu', zeit: Date.now() }, geaendert: Date.now()
  };
  return plan;
}
/** Eine Sprache hinzufügen oder entfernen (die erste bleibt immer). Neue Sprachen starten mit leeren Texten, die `planPruefen` meldet. */
export function setzeSprachen(plan: FragebogenPlan, sprachen: string[]): FragebogenPlan {
  const neu = sprachen.length ? [...sprachen] : plan.sprachen;
  const p = klon(plan);
  p.sprachen = neu;
  const gleich = (l: Lok | undefined): Lok | undefined => (l ? Object.fromEntries(neu.map(s => [s, l[s] ?? ''])) : l);
  p.titel = gleich(p.titel)!;
  for (const s of p.elemente) {
    if (s.titel) s.titel = gleich(s.titel)!;
    for (const e of s.elemente) {
      e.text = gleich(e.text)!;
      if (e.art !== 'hinweis') { if (e.hilfe) e.hilfe = gleich(e.hilfe)!; }
      if (e.art === 'block') e.items.forEach(i => { i.text = gleich(i.text)!; });
    }
  }
  for (const l of p.antwortlisten) l.optionen.forEach(o => { o.text = gleich(o.text)!; });
  return p;
}
