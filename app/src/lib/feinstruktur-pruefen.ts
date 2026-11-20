/**
 * Feinstruktur-Arbeitsplatz, Stufe F3B2: Lesarten prüfen, Füllwörter, Zwischenreflexion, Zwischenfazit, Übersicht, Formhinweise.
 * Reine Funktionen auf `Sequenzanalyse` (lib/qualprojekt.ts), ohne DOM.
 * Grundlagen: docs/feinstruktur/FACHBLATT-FEINSTRUKTUR.md (4 Füllwörter, 6 Lesarten prüfen, 7 Zwischenreflexion und Zwischenfazit),
 * ARCHITEKTUR-DATENMODELL-FEINSTRUKTUR.md (2.4 Lesarten mit Verlauf).
 * Statable deutet nichts: kein Stand, keine Übernahme, kein Fazit ohne Knopfdruck des Menschen; keine Zählung oder Rangfolge von Lesarten.
 */
import type { Eintrag, Lesart, LesartStandArt, Sequenzanalyse, Sinneinheit, Zwischenfazit, Zwischenreflexion } from './qualprojekt';
import { woerter } from './feinstruktur';
import { alleGedeutet, einheitSichtbar } from './feinstruktur-analyse';
import { eintraegeAn, mitEintraegenAn, satzFuer, spaltenText, type Spaltensatz } from './feinstruktur-spalten';

const neueId = (): string => globalThis.crypto.randomUUID();
type Sp = 'de' | 'en';

/* ---------------- Lesarten prüfen ---------------- */

/** Aktueller Stand = letzter Eintrag im Verlauf; leerer Verlauf = offen (Architekturblatt 2.4). */
export const standVon = (l: Lesart): LesartStandArt => l.verlauf.at(-1)?.stand ?? 'offen';

export interface LesartPosten { einheit: number; lesart: Lesart; stand: LesartStandArt; /** Index der Einheit der letzten Entscheidung */ bei?: number }

/** Bis zu welcher Einheit (einschließlich) etwas sichtbar sein darf: Deuten ohne alles gedeutet = aktuelle Einheit, sonst alle. */
export const sichtbarBis = (sa: Sequenzanalyse): number =>
  sa.phase === 'deuten' && !alleGedeutet(sa) && !sa.vorauslesenErlaubt ? sa.aktuelleEinheit : sa.einheiten.length - 1;

function posten(sa: Sequenzanalyse, vor: number): LesartPosten[] {
  const idx = new Map(sa.einheiten.map((e, k) => [e.id, k]));
  const r: LesartPosten[] = [];
  sa.einheiten.forEach((e, k) => {
    if (k >= vor) return;
    for (const l of e.lesarten) {
      const letzt = l.verlauf.at(-1);
      r.push({ einheit: k, lesart: l, stand: standVon(l), ...(letzt ? { bei: idx.get(letzt.beiEinheit) } : {}) });
    }
  });
  return r;
}

/**
 * Die Lesarten früherer Einheiten (vor `idx`), die an Einheit `idx` zu prüfen sind: Stand offen oder „hält“ („hält“ ist vorläufig, Fachblatt 6).
 * Reihenfolge = Reihenfolge im Text, keine Rangfolge.
 */
export const zuPruefen = (sa: Sequenzanalyse, idx: number): LesartPosten[] => posten(sa, idx).filter(p => p.stand !== 'verworfen');
/** Verworfene Lesarten früherer Einheiten (vor `idx`); bleiben immer sichtbar (Fachblatt 6). */
export const verworfene = (sa: Sequenzanalyse, idx: number): LesartPosten[] => posten(sa, idx).filter(p => p.stand === 'verworfen');

/**
 * Der Mensch setzt den Stand einer Lesart an Einheit `beiIdx`. Immer ein **neuer** Verlaufs-Eintrag (die Folge der Entscheidungen bleibt);
 * nichts wird gelöscht. Nur an einer späteren Einheit als der, zu der die Lesart gehört.
 */
export function setzeStand(sa: Sequenzanalyse, lesartId: string, stand: LesartStandArt, begruendung: string, beiIdx: number, jetzt: number): Sequenzanalyse {
  const bei = sa.einheiten[beiIdx];
  if (!bei) throw new Error('Sinneinheit nicht gefunden');
  const k = sa.einheiten.findIndex(e => e.lesarten.some(l => l.id === lesartId));
  if (k < 0) throw new Error('Lesart nicht gefunden');
  if (beiIdx <= k) throw new Error('Den Stand setzen Sie an einer späteren Sinneinheit.');
  return {
    ...sa, geaendert: jetzt,
    einheiten: sa.einheiten.map((e, j) => (j !== k ? e : {
      ...e, lesarten: e.lesarten.map(l => (l.id !== lesartId ? l : { ...l, verlauf: [...l.verlauf, { stand, beiEinheit: bei.id, begruendung, zeit: jetzt }] })),
    })),
  };
}

/** Wörter für Stände (Anzeige). */
export const standWort = (st: LesartStandArt, sp: Sp): string =>
  st === 'haelt' ? (sp === 'de' ? 'hält' : 'holds') : st === 'verworfen' ? (sp === 'de' ? 'verworfen' : 'rejected') : (sp === 'de' ? 'offen' : 'open');

/* ---------------- Füllwörter ---------------- */

/** Kern eines Füllworts: Kleinschreibung, ohne Satzzeichen und Leerraum (Fachblatt 4). */
export const fuellwortKern = (text: string): string => text.toLocaleLowerCase('de').replace(/[\p{P}\p{S}\s]+/gu, '');

/**
 * Angebot „Deutung von Sinneinheit k übernehmen“: Einheit `idx` hat genau ein Wort, eine frühere **gedeutete** Einheit mit genau einem Wort
 * hat denselben Kern. Ergibt den Index der frühesten solchen Einheit, sonst undefined. Kein Angebot, wenn schon übernommen wurde.
 */
export function fuellwortAngebot(sa: Sequenzanalyse, idx: number): number | undefined {
  const e = sa.einheiten[idx];
  if (!e || e.uebernommenVon) return undefined;
  const text = (k: number) => Array.from(sa.ausschnitt.text).slice(sa.einheiten[k]!.von, sa.einheiten[k]!.bis).join('');
  const w = woerter(text(idx));
  if (w.length !== 1) return undefined;
  const kern = fuellwortKern(text(idx));
  if (!kern) return undefined;
  for (let k = 0; k < idx; k++) {
    if (!sa.einheiten[k]!.gedeutet) continue;
    const t = text(k);
    if (woerter(t).length === 1 && fuellwortKern(t) === kern) return k;
  }
  return undefined;
}

const kopie = (e: Eintrag): Eintrag => ({ ...e, id: neueId() });

/**
 * Nur auf Knopfdruck: kopiert die Einträge der Einheit `vonIdx` mit neuen Kennungen in die Einheit `idx` (an vorhandene Einträge angehängt)
 * und setzt `uebernommenVon`. Übernommene Lesarten beginnen offen (leerer Verlauf); geprüft wird an der neuen Stelle neu.
 */
export function uebernimmDeutung(sa: Sequenzanalyse, idx: number, vonIdx: number, jetzt: number): Sequenzanalyse {
  const q = sa.einheiten[vonIdx], z = sa.einheiten[idx];
  if (!q || !z || vonIdx >= idx) throw new Error('Sinneinheit nicht gefunden');
  let neu: Sinneinheit = {
    ...z, uebernommenVon: q.id,
    paraphrase: [...z.paraphrase, ...q.paraphrase.map(kopie)], intentionen: [...z.intentionen, ...q.intentionen.map(kopie)],
    lesarten: [...z.lesarten, ...q.lesarten.map(l => ({ ...l, id: neueId(), verlauf: [] }))],
    rollen: [...z.rollen, ...q.rollen.map(kopie)], anschluss: [...z.anschluss, ...q.anschluss.map(kopie)],
  };
  // frei definierte Spalten (A4)
  for (const [k, l] of Object.entries(q.weitere ?? {})) { const o = { feld: 'weitere' as const, kennung: k }; neu = mitEintraegenAn(neu, o, [...eintraegeAn(neu, o), ...l.map(kopie)]); }
  return { ...sa, einheiten: sa.einheiten.map((e, j) => (j === idx ? neu : e)), geaendert: jetzt };
}

/* ---------------- Zwischenreflexion ---------------- */

export const reflexionAlle = (sa: Sequenzanalyse): number => Math.max(1, sa.reflexionAlle ?? 4);

/** Einheiten (Index), nach denen eine Zwischenreflexion angeboten wird: jede `reflexionAlle`-te, nicht nach der letzten. */
export const reflexionsStellen = (sa: Sequenzanalyse): number[] =>
  sa.einheiten.map((_, k) => k).filter(k => (k + 1) % reflexionAlle(sa) === 0 && k < sa.einheiten.length - 1);

export const reflexionNach = (sa: Sequenzanalyse, k: number): Zwischenreflexion | undefined =>
  sa.reflexionen.find(r => r.nachEinheit === sa.einheiten[k]?.id);

/**
 * Angebot beim Deuten der Einheit `idx`: die letzte Reflexionsstelle vor `idx`, deren Einheit gedeutet ist (die Reflexion steht vor dem
 * Weiterdeuten; bestehende Reflexion = zum Ändern). Nie Pflicht.
 */
export function reflexionAngebot(sa: Sequenzanalyse, idx: number): number | undefined {
  const k = idx - 1;
  return k >= 0 && reflexionsStellen(sa).includes(k) && sa.einheiten[k]!.gedeutet ? k : undefined;
}

/** Speichert die Zwischenreflexion nach Einheit `k` (eine je Stelle; vorhandene wird geändert). */
export function speichereReflexion(sa: Sequenzanalyse, k: number, f: { begriffe: string; bisher: string; pruefen: string }, jetzt: number): Sequenzanalyse {
  const e = sa.einheiten[k]; if (!e) throw new Error('Sinneinheit nicht gefunden');
  const alt = sa.reflexionen.find(r => r.nachEinheit === e.id);
  const r: Zwischenreflexion = { id: alt?.id ?? neueId(), nachEinheit: e.id, ...f, zeit: jetzt };
  const reflexionen = alt ? sa.reflexionen.map(x => (x.id === alt.id ? r : x)) : [...sa.reflexionen, r];
  const pos = new Map(sa.einheiten.map((x, j) => [x.id, j]));
  reflexionen.sort((a, b) => (pos.get(a.nachEinheit) ?? 0) - (pos.get(b.nachEinheit) ?? 0));
  return { ...sa, reflexionen, geaendert: jetzt };
}

/* ---------------- Zwischenfazit ---------------- */

/** Der einzige Vorschlag: ein Satzanfang zur Vorläufigkeit, kein Inhalt (Fachblatt 7). */
export const satzanfang = (sp: Sp): string => (sp === 'de' ? 'Nach diesem Ausschnitt deutet sich an, dass ' : 'Based on this excerpt, it appears that ');

export const leeresFazit = (jetzt: number): Zwischenfazit => ({ muster: [], bezugForschungsfrage: '', geaendert: jetzt });

function mitFazit(sa: Sequenzanalyse, f: (z: Zwischenfazit) => Zwischenfazit, jetzt: number): Sequenzanalyse {
  if (!alleGedeutet(sa)) throw new Error('Das Zwischenfazit kommt, wenn alle Sinneinheiten gedeutet sind.');
  return { ...sa, fazit: { ...f(sa.fazit ?? leeresFazit(jetzt)), geaendert: jetzt }, geaendert: jetzt };
}
export const fuegeMusterHinzu = (sa: Sequenzanalyse, text: string, jetzt: number): { analyse: Sequenzanalyse; id: string } => {
  const id = neueId();
  return { analyse: mitFazit(sa, z => ({ ...z, muster: [...z.muster, { id, text, belege: [] }] }), jetzt), id };
};
export const aendereMuster = (sa: Sequenzanalyse, id: string, text: string, jetzt: number) =>
  mitFazit(sa, z => ({ ...z, muster: z.muster.map(m => (m.id === id ? { ...m, text } : m)) }), jetzt);
export const entferneMuster = (sa: Sequenzanalyse, id: string, jetzt: number) =>
  mitFazit(sa, z => ({ ...z, muster: z.muster.filter(m => m.id !== id) }), jetzt);
/** Textstelle: die Person wählt die Sinneinheit, Statable fügt Kennung und Zitat (Wortlaut der Einheit) ein. */
export const fuegeBelegHinzu = (sa: Sequenzanalyse, musterId: string, einheitIdx: number, jetzt: number) => {
  const e = sa.einheiten[einheitIdx]; if (!e) throw new Error('Sinneinheit nicht gefunden');
  const zitat = einheitSichtbar(sa, einheitIdx);
  return mitFazit(sa, z => ({ ...z, muster: z.muster.map(m => (m.id === musterId && !m.belege.some(b => b.einheit === e.id) ? { ...m, belege: [...m.belege, { einheit: e.id, zitat }] } : m)) }), jetzt);
};
export const entferneBeleg = (sa: Sequenzanalyse, musterId: string, einheitId: string, jetzt: number) =>
  mitFazit(sa, z => ({ ...z, muster: z.muster.map(m => (m.id === musterId ? { ...m, belege: m.belege.filter(b => b.einheit !== einheitId) } : m)) }), jetzt);
export const setzeFazitText = (sa: Sequenzanalyse, f: { bezugForschungsfrage?: string; text?: string }, jetzt: number) =>
  mitFazit(sa, z => ({ ...z, ...f }), jetzt);

/* ---------------- Übersicht ---------------- */

export interface UebersichtZeile { nr: number; einheit: Sinneinheit; text: string; spalten: { kennung: string; eintraege: (Eintrag | Lesart)[] }[] }

/** Zeilen der Übersicht: in Phase Deuten nur bis zur aktuellen Einheit (nicht vorauslesen), sonst alle. Spalten aus dem Spaltensatz. */
export function uebersicht(sa: Sequenzanalyse, eigene: readonly Spaltensatz[] = []): UebersichtZeile[] {
  const satz = satzFuer(sa, eigene);
  const bis = sichtbarBis(sa);
  return sa.einheiten.slice(0, bis + 1).map((e, k) => ({
    nr: k + 1, einheit: e, text: einheitSichtbar(sa, k),
    spalten: satz.spalten.map(s => ({ kennung: s.kennung, eintraege: eintraegeAn(e, s) as (Eintrag | Lesart)[] })),
  }));
}

/* ---------------- Formhinweise (nur Form, nie Inhalt) ---------------- */

/**
 * Formhinweise für die sichtbaren Einheiten: Spalte leer (nur bei gedeuteten Einheiten), Lesart ohne Prüfkriterium,
 * Zwischenreflexion fehlt (nur an Stellen, deren Einheit gedeutet ist), Zwischenfazit-Muster ohne Textstelle. Hinweise, nie Sperren.
 */
export function formhinweise(sa: Sequenzanalyse, sp: Sp, eigene: readonly Spaltensatz[] = []): string[] {
  const satz = satzFuer(sa, eigene);
  const bis = sichtbarBis(sa);
  const h: string[] = [];
  sa.einheiten.forEach((e, k) => {
    if (k > bis) return;
    if (e.gedeutet) for (const s of satz.spalten) {
      if (!eintraegeAn(e, s).length) h.push(sp === 'de' ? `Sinneinheit ${k + 1}: Die Spalte „${spaltenText(s.name, 'de')}“ ist leer.` : `Unit ${k + 1}: the column “${spaltenText(s.name, 'en')}” is empty.`);
    }
    e.lesarten.forEach((l, i) => {
      if (!l.pruefung.trim()) h.push(sp === 'de' ? `Sinneinheit ${k + 1}: Lesart ${i + 1} hat kein Prüfkriterium.` : `Unit ${k + 1}: reading ${i + 1} has no test criterion.`);
    });
  });
  for (const k of reflexionsStellen(sa)) {
    if (k > bis || !sa.einheiten[k]!.gedeutet || reflexionNach(sa, k)) continue;
    h.push(sp === 'de' ? `Nach Sinneinheit ${k + 1}: Zwischenreflexion fehlt.` : `After unit ${k + 1}: interim reflection missing.`);
  }
  sa.fazit?.muster.forEach((m, i) => {
    if (!m.belege.length) h.push(sp === 'de' ? `Zwischenfazit, Deutungsmuster ${i + 1}: keine Textstelle.` : `Interim conclusion, pattern ${i + 1}: no passage.`);
  });
  return h;
}
