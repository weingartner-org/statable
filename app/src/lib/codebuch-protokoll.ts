/**
 * Änderungsprotokoll des Codebuchs (Stufe A1, Architekturblatt Ausbau, Abschnitt 3).
 *
 * Jede Änderung an Codes schreibt einen Eintrag in `QualProjekt.protokoll` mit einer festen `was`-Kennung. Die Einträge entstehen aus dem
 * Vergleich „Codes vorher - Codes nachher“ (`mitCodeProtokoll`), damit jeder Weg, der Codes ändert (Kodier-Arbeitsplatz, Kodierleitfaden),
 * dieselben Einträge schreibt. `vorher`/`nachher` enthalten nur die Code-id und kurze Texte der Person (Name, Definition, Regel, gekürzt),
 * **nie Text aus Dokumenten**: Bei Ankerbeispielen steht nur die Zahl. Gleiche Änderungen am selben Feld desselben Codes innerhalb von
 * 60 Sekunden werden zu einem Eintrag zusammengefasst (Tippen in der Definition).
 */
import type { Aenderung, Code, QualProjekt } from './qualprojekt';

export const CODE_AENDERUNGEN = [
  'code.neu', 'code.umbenannt', 'code.definition', 'code.regel', 'code.anker', 'code.verschoben',
  'code.zusammengelegt', 'code.geteilt', 'code.geloescht', 'code.phase', 'code.kodierbar',
] as const;
export type CodeAenderungArt = typeof CODE_AENDERUNGEN[number];

/** Wert in `vorher`/`nachher` eines Codebuch-Eintrags */
export interface CodeWert { code: string; text?: string; anzahl?: number }

export const ZUSAMMENFASSEN_MS = 60_000;
/** Höchstlänge für Texte der Person im Protokoll (Definition, Regel) */
export const TEXT_MAX = 200;

const kurz = (s: string | undefined): string | undefined => {
  if (s === undefined) return undefined;
  const t = s.replace(/\s+/g, ' ').trim();
  return t.length > TEXT_MAX ? `${t.slice(0, TEXT_MAX - 1)}…` : t;
};

const wert = (code: string, x: Omit<CodeWert, 'code'> = {}): CodeWert => {
  const w: CodeWert = { code };
  if (x.text !== undefined) w.text = x.text;
  if (x.anzahl !== undefined) w.anzahl = x.anzahl;
  return w;
};

const ankerGleich = (a: Code['anker'], b: Code['anker']): boolean => {
  const x = a ?? [], y = b ?? [];
  return x.length === y.length && x.every((e, i) => e.text === y[i]!.text);
};

/** Die Änderungen zwischen zwei Code-Listen, in fester Reihenfolge (neu, geändert je Feld, gelöscht). */
export function codeUnterschiede(alt: readonly Code[], neu: readonly Code[]): { was: CodeAenderungArt; vorher?: CodeWert; nachher?: CodeWert }[] {
  const aus: { was: CodeAenderungArt; vorher?: CodeWert; nachher?: CodeWert }[] = [];
  const altMap = new Map(alt.map(c => [c.id, c]));
  const neuIds = new Set(neu.map(c => c.id));
  const name = (codes: readonly Code[], id: string | undefined): string | undefined => (id === undefined ? undefined : codes.find(c => c.id === id)?.name);
  for (const c of neu) {
    const a = altMap.get(c.id);
    if (!a) { aus.push({ was: 'code.neu', nachher: wert(c.id, { text: c.name }) }); continue; }
    if (a.name !== c.name) aus.push({ was: 'code.umbenannt', vorher: wert(c.id, { text: a.name }), nachher: wert(c.id, { text: c.name }) });
    if ((a.definition ?? '') !== (c.definition ?? '')) aus.push({ was: 'code.definition', vorher: wert(c.id, { text: kurz(a.definition) ?? '' }), nachher: wert(c.id, { text: kurz(c.definition) ?? '' }) });
    if ((a.regel ?? '') !== (c.regel ?? '')) aus.push({ was: 'code.regel', vorher: wert(c.id, { text: kurz(a.regel) ?? '' }), nachher: wert(c.id, { text: kurz(c.regel) ?? '' }) });
    if (!ankerGleich(a.anker, c.anker)) aus.push({ was: 'code.anker', vorher: wert(c.id, { anzahl: a.anker?.length ?? 0 }), nachher: wert(c.id, { anzahl: c.anker?.length ?? 0 }) });
    if (a.elternId !== c.elternId) aus.push({ was: 'code.verschoben', vorher: wert(c.id, { text: name(alt, a.elternId) ?? '' }), nachher: wert(c.id, { text: name(neu, c.elternId) ?? '' }) });
    if (a.phase !== c.phase) aus.push({ was: 'code.phase', vorher: wert(c.id, { text: a.phase ?? '' }), nachher: wert(c.id, { text: c.phase ?? '' }) });
    if (a.kodierbar !== c.kodierbar) aus.push({ was: 'code.kodierbar', vorher: wert(c.id, { text: String(a.kodierbar) }), nachher: wert(c.id, { text: String(c.kodierbar) }) });
  }
  for (const a of alt) if (!neuIds.has(a.id)) aus.push({ was: 'code.geloescht', vorher: wert(a.id, { text: a.name }) });
  return aus;
}

const codeVon = (a: Aenderung): string | undefined => {
  const v = (a.nachher ?? a.vorher) as CodeWert | undefined;
  return v && typeof v === 'object' && typeof v.code === 'string' ? v.code : undefined;
};

/** Ist der Eintrag einer aus dem Codebuch-Protokoll? */
export function istCodeEintrag(a: Aenderung): boolean {
  return (CODE_AENDERUNGEN as readonly string[]).includes(a.was) || a.was.startsWith('thema.');
}

/**
 * Schreibt einen Eintrag ins Protokoll; fasst mit dem letzten Eintrag zusammen, wenn derselbe Code, dieselbe Kennung und dieselbe
 * kodierende Person innerhalb von 60 s geändert haben (der erste `vorher` bleibt, `nachher` und Zeit werden neu). Ändert die Eingabe nicht.
 */
export function protokolliere(protokoll: readonly Aenderung[], e: { was: CodeAenderungArt; vorher?: CodeWert; nachher?: CodeWert }, jetzt: number, kodierende?: string): Aenderung[] {
  const letzte = protokoll[protokoll.length - 1];
  const code = e.nachher?.code ?? e.vorher?.code;
  const zusammen = letzte && e.was !== 'code.neu' && e.was !== 'code.geloescht' && letzte.was === e.was && codeVon(letzte) === code
    && letzte.kodierende === kodierende && jetzt - letzte.zeit <= ZUSAMMENFASSEN_MS && jetzt >= letzte.zeit;
  if (zusammen) {
    const neu: Aenderung = { ...letzte, zeit: jetzt };
    if (e.nachher !== undefined) neu.nachher = e.nachher;
    return [...protokoll.slice(0, -1), neu];
  }
  const a: Aenderung = { zeit: jetzt, was: e.was };
  if (kodierende !== undefined) a.kodierende = kodierende;
  if (e.vorher !== undefined) a.vorher = e.vorher;
  if (e.nachher !== undefined) a.nachher = e.nachher;
  return [...protokoll, a];
}

/** Ergänzt im neuen Projekt die Protokoll-Einträge für alle Änderungen an Codes gegenüber dem alten. Ohne Änderung: dasselbe Objekt. */
export function mitCodeProtokoll(alt: Pick<QualProjekt, 'codes'>, neu: QualProjekt, jetzt: number = Date.now()): QualProjekt {
  if (alt.codes === neu.codes) return neu;
  const u = codeUnterschiede(alt.codes, neu.codes);
  if (!u.length) return neu;
  let protokoll: Aenderung[] = neu.protokoll;
  for (const e of u) protokoll = protokolliere(protokoll, e, jetzt, neu.ich);
  return { ...neu, protokoll };
}

/** Nur die Einträge des Codebuchs, neueste zuerst. */
export function codeProtokoll(q: Pick<QualProjekt, 'protokoll'>): Aenderung[] {
  return q.protokoll.filter(istCodeEintrag).slice().reverse();
}
