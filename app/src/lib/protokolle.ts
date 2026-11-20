/* Protokolle (Feinstruktur F2A): Interviewprotokoll, Gedächtnisprotokoll, Beobachtungsprotokoll, Feldnotizen.
 * Reine Funktionen: sie geben neue Projekte zurück und lassen das Original stehen. Schnittstelle: SCHNITTSTELLEN-F2.md 1.2. */
import type { Aenderung, Memo, Protokoll, QualProjekt } from './qualprojekt';

export const INTERVIEW_FELDER = ['zustandekommen', 'raum', 'atmosphaere', 'verlauf', 'wirkung', 'vorNach', 'thesen'] as const;

const neueId = (): string => globalThis.crypto.randomUUID();

export function neuesProtokoll(art: Protokoll['art'], jetzt: number = Date.now()): Protokoll {
  const p: Protokoll = { id: neueId(), art, kopf: {}, felder: {}, erstellt: jetzt, geaendert: jetzt };
  if (art === 'gedaechtnis') p.schritte = {};
  return p;
}

const eintrag = (was: string, wer?: string): Aenderung => {
  const a: Aenderung = { zeit: Date.now(), was };
  if (wer !== undefined) a.kodierende = wer;
  return a;
};

const artName: Record<Protokoll['art'], string> = { interview: 'Interviewprotokoll', gedaechtnis: 'Gedächtnisprotokoll', beobachtung: 'Beobachtungsprotokoll' };

export function fuegeProtokollHinzu(q: QualProjekt, p: Protokoll, wer?: string): QualProjekt {
  return { ...q, protokolle: [...(q.protokolle ?? []), p], protokoll: [...q.protokoll, eintrag(`Protokoll angelegt: ${artName[p.art]}`, wer)] };
}

/** Ersetzt nach Kennung und setzt `geaendert`. Kein Eintrag im Projekt-Protokoll (sonst einer je Tastendruck). */
export function aendereProtokoll(q: QualProjekt, p: Protokoll, _wer?: string): QualProjekt {
  const liste = q.protokolle ?? [];
  const alt = liste.find(x => x.id === p.id);
  if (!alt) return q;
  const neu: Protokoll = { ...p, geaendert: Math.max(Date.now(), alt.geaendert + 1, p.geaendert + 1) };
  return { ...q, protokolle: liste.map(x => (x.id === p.id ? neu : x)) };
}

export function entferneProtokoll(q: QualProjekt, id: string, wer?: string): QualProjekt {
  const liste = q.protokolle ?? [];
  const p = liste.find(x => x.id === id);
  if (!p) return q;
  return { ...q, protokolle: liste.filter(x => x.id !== id), protokoll: [...q.protokoll, eintrag(`Protokoll entfernt: ${artName[p.art]}`, wer)] };
}

/** Setzt Beginn und leeren Text von Schritt 1, aber nur, wenn Schritt 1 noch fehlt. */
export function beginneSchritt1(p: Protokoll, jetzt: number): Protokoll {
  if (p.schritte?.s1) return p;
  return { ...p, schritte: { ...p.schritte, s1: { text: '', beginn: jetzt } } };
}

export function neueFeldnotiz(art: 'feldnotiz-empirisch' | 'feldnotiz-methodisch' | 'feldnotiz-theoretisch', text: string, bezug: Memo['bezug'] = []): Memo {
  return { id: neueId(), text, bezug: [...bezug], art, erstellt: Date.now() };
}

export function wortzahl(text: string): number {
  const t = text.trim();
  return t ? t.split(/\s+/).length : 0;
}

/** Hilfe, kein Zwang: wirkt der Text wie eine Stichwortliste? (mindestens drei nicht leere Zeilen, Mehrheit Stichwort) */
export function wirktWieStichworte(text: string): boolean {
  const zeilen = text.split('\n').map(z => z.trim()).filter(z => z);
  if (zeilen.length < 3) return false;
  const stich = zeilen.filter(z => /^[-•*]/.test(z) || (wortzahl(z) < 4 && !/[.!?:;]$/.test(z))).length;
  return stich > zeilen.length / 2;
}
