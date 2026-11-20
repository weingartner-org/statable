/**
 * Zustand des Kodier-Arbeitsplatzes (Stufe 6b, Fachblatt Abschnitt 2).
 * Das Projekt liegt in `qualProjekt()` (im Projekt oder als Entwurf der Sitzung); Änderungen gehen über `ersetzeQualProjekt()` (Autospeichern dort).
 * Hier: kodierende Person („Ich“), Rückgängig-Stapel (20 Schritte mit Beschreibung), Schnellleiste, „nur meine“, Text für Stellen.
 */
import { s, L, einstSpeichern } from './sitzung.svelte';
import { qualProjekt, ersetzeQualProjekt } from './interviews.svelte';
import { absaetze, einheitAn, schnellleiste, type Einheit } from './kodieren';
import type { QualProjekt } from './qualprojekt';

export interface Stelle { start: number; ende: number }
interface Schritt { q: QualProjekt; text: string }

const MAX_RUECK = 20;

class Kodierzustand {
  /** Projektstände vor den letzten Änderungen aus dem Arbeitsplatz (neuester zuletzt) */
  stapel = $state.raw<Schritt[]>([]);
  nurIch = $state(false);
  /** gewählte Ansicht im Bereich „Auswerten“ (Stufe 6c), nicht gespeichert */
  auswerten = $state<'uebersicht' | 'fk' | 'matrix' | 'landkarte' | 'aehnlich' | 'evaluativ' | 'typen' | 'mixed' | 'woerter'>('uebersicht');
  /** gewählter Teil in der Ansicht „Mixed Methods“ (Stufe A2), nicht gespeichert */
  mmTeil = $state<'verknuepfen' | 'displays' | 'design' | 'instrument' | 'pruefung'>('verknuepfen');
  projektId = '';
}
export const ko = new Kodierzustand();

export const sprache = (): 'de' | 'en' => (L('de', 'en') === 'en' ? 'en' : 'de');
export const kodierAnsicht = (): 'text' | 'saetze' => (s.einst.kodierAnsicht === 'saetze' ? 'saetze' : 'text');
export function setzeKodierAnsicht(a: 'text' | 'saetze') { s.einst.kodierAnsicht = a; einstSpeichern(); }
export const ansageBeimLesen = (): boolean => s.einst.kodierAnsageBeimLesen === true;
export function setzeAnsageBeimLesen(an: boolean) { s.einst.kodierAnsageBeimLesen = an; einstSpeichern(); }

export const kodierAehnliche = (): boolean => s.einst.kodierAehnliche !== false;
export function setzeKodierAehnliche(an: boolean) { s.einst.kodierAehnliche = an; einstSpeichern(); }

const neueId = (): string => globalThis.crypto.randomUUID();

/** Der Stapel gehört zu einem Projekt: wechselt es (anderes Projekt, Ersetzen durch .qdpx), beginnt er neu. */
const stapelFuer = (q: QualProjekt | undefined): Schritt[] => (q && ko.projektId === q.id ? ko.stapel : []);

export const projekt = (): QualProjekt | undefined => qualProjekt();

/** Die kodierende Person; legt sie an („Ich“ / „Me“), wenn es noch keine gibt. */
export function sicherIch(q: QualProjekt): QualProjekt {
  if (q.ich && q.kodierende.some(k => k.id === q.ich)) return q;
  const id = neueId();
  return { ...q, kodierende: [...q.kodierende, { id, name: L('Ich', 'Me') }], ich: id };
}

export const ichName = (q: QualProjekt | undefined): string => (q ? q.kodierende.find(k => k.id === q.ich)?.name ?? '' : '');

/**
 * Ändert das Projekt mit einer reinen Funktion und merkt den alten Stand für „Rückgängig“.
 * `text` beschreibt, wie der Schritt zurückgenommen klingt („Code ‚Belastung‘ bei Satz 3 wieder entfernt“).
 * Gibt zurück, ob sich etwas geändert hat. Wirft `f`, ändert sich nichts.
 */
export function aendere(text: string, f: (q: QualProjekt) => QualProjekt): boolean {
  const q = projekt();
  if (!q) return false;
  const neu = f(q);
  if (neu === q) return false;
  const alt = stapelFuer(q);
  ko.projektId = q.id;
  ko.stapel = [...alt, { q, text }].slice(-MAX_RUECK);
  ersetzeQualProjekt(neu);
  return true;
}

/** Ändert Dinge, die nicht rückgängig gemacht werden (Schnellleiste, offenes Dokument, Name). */
export function aendereOhneStapel(f: (q: QualProjekt) => QualProjekt) {
  const q = projekt();
  if (!q) return;
  const neu = f(q);
  if (neu !== q) ersetzeQualProjekt(neu);
}

export const kannRueckgaengig = (): boolean => stapelFuer(qualProjekt()).length > 0;

/** Nimmt den letzten Schritt zurück. Gibt dessen Beschreibung zurück (oder `null`, wenn es nichts zurückzunehmen gibt). */
export function rueckgaengig(): string | null {
  const jetzt = qualProjekt();
  const st = stapelFuer(jetzt);
  const letzt = st[st.length - 1];
  if (!letzt) return null;
  ko.stapel = st.slice(0, -1);
  // Merkzettel und Name nicht zurückdrehen: der Stand vor dem Schritt behält die heutige Schnellleiste
  const alt = jetzt ? { ...letzt.q, arbeitsplatz: jetzt.arbeitsplatz, kodierende: jetzt.kodierende, ich: jetzt.ich } : letzt.q;
  if (jetzt?.arbeitsplatz === undefined) delete (alt as { arbeitsplatz?: unknown }).arbeitsplatz;
  if (jetzt?.ich === undefined) delete (alt as { ich?: unknown }).ich;
  ersetzeQualProjekt(alt);
  return letzt.text;
}

/** Ändert den Namen der kodierenden Person (legt sie an, wenn nötig). Ein leerer Name ändert nichts. */
export function setzeIchName(name: string) {
  const n = name.trim();
  if (!n) return;
  aendereOhneStapel(q => {
    const m = sicherIch(q);
    return { ...m, kodierende: m.kodierende.map(k => (k.id === m.ich ? { ...k, name: n } : k)) };
  });
}

/* ---- Schnellleiste ---- */

export function schnellIds(q: QualProjekt): string[] {
  return schnellleiste(q.codes, q.arbeitsplatz?.fest ?? [], q.arbeitsplatz?.zuletzt ?? []);
}

/** Der Code wird der zuletzt benutzte (neueste zuerst, höchstens 9 gemerkt). */
export function mitZuletzt(q: QualProjekt, codeId: string): QualProjekt {
  const a = q.arbeitsplatz ?? { fest: [], zuletzt: [] };
  return { ...q, arbeitsplatz: { ...a, zuletzt: [codeId, ...a.zuletzt.filter(x => x !== codeId)].slice(0, 9) } };
}

export function setzeFest(codeId: string, an: boolean) {
  aendereOhneStapel(q => {
    const a = q.arbeitsplatz ?? { fest: [], zuletzt: [] };
    const fest = an ? [...a.fest.filter(x => x !== codeId), codeId] : a.fest.filter(x => x !== codeId);
    return { ...q, arbeitsplatz: { ...a, fest } };
  });
}

export function merkeOffenesDokument(id: string) {
  aendereOhneStapel(q => (q.arbeitsplatz?.offenesDokument === id ? q : { ...q, arbeitsplatz: { fest: [], zuletzt: [], ...q.arbeitsplatz, offenesDokument: id } }));
}

/* ---- Texte für Stellen ---- */

const kuerzen = (t: string, n: number): string => (t.length > n ? t.slice(0, n) + ' … ' : t);
export { kuerzen };

/** „Satz 3“, „Sätze 3 bis 4“, „Zeichen 5 bis 40“ oder „2 Stellen“. */
export function beschreibeStellen(stellen: Stelle[], saetze: Einheit[]): string {
  if (stellen.length === 0) return '';
  if (stellen.length > 1) return L(`${stellen.length} Stellen`, `${stellen.length} passages`);
  const st = stellen[0]!;
  const i = saetze.find(e => e.start === st.start), j = saetze.find(e => e.ende === st.ende);
  if (i && j && j.nr >= i.nr) return i.nr === j.nr ? L(`Satz ${i.nr}`, `Sentence ${i.nr}`) : L(`Sätze ${i.nr} bis ${j.nr}`, `Sentences ${i.nr} to ${j.nr}`);
  return L(`Zeichen ${st.start + 1} bis ${st.ende}`, `Characters ${st.start + 1} to ${st.ende}`);
}

/** Absatznummer einer Stelle (für Belege und die Zeile „Markiert“) */
export const absatzNr = (text: string, cp: number): number => einheitAn(absaetze(text), cp)?.nr ?? 1;
