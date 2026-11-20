/**
 * Reine Logik für die Seite „Interviews“ (Paket 4C-1): ein eingelesenes Transkript ins qualitative Projekt übernehmen,
 * Dokumente entfernen oder umbenennen, Hauptkategorien aus dem Leitfaden anlegen, Codes entfernen, Zeile der Transkript-Tabelle.
 * Alle Funktionen geben ein neues `QualProjekt` zurück; das übergebene wird nie verändert. Kein Zugriff auf den Speicher (das macht `interviews.svelte.ts`).
 */
import { mitCodeProtokoll } from './codebuch-protokoll';
import { neuesQualProjekt, type Code, type Dokument, type QualProjekt } from './qualprojekt';
import type { TranskriptErgebnis } from './transkript-lesen';
import { entferne, neuerCode, unterkategorien } from './kodierleitfaden';
import { pruefeTranskript } from './transkript-pruefen';

const norm = (n: string): string => n.trim().toLocaleLowerCase('de');

/**
 * Nimmt Dokument, Fälle und Variablen eines gelesenen Transkripts ins Projekt auf. Gibt es noch kein `QualProjekt`, wird es angelegt
 * (Name = Projektname, `herkunft` = Transkript). Eine Variable mit gleichem Namen wird nicht doppelt angelegt.
 */
export function uebernimmTranskript(q: QualProjekt | undefined, erg: TranskriptErgebnis, projektName: string, programm: string, dateiName: string): QualProjekt {
  const basis = q ?? { ...neuesQualProjekt(projektName), herkunft: { art: 'transkript' as const, programm, datei: dateiName, zeit: Date.now() } };
  const neueVariablen = erg.variablen.filter(v => !basis.variablen.some(x => norm(x.name) === norm(v.name)));
  return { ...basis, dokumente: [...basis.dokumente, erg.dokument], faelle: [...basis.faelle, ...erg.faelle], variablen: [...basis.variablen, ...neueVariablen] };
}

/** Benennt ein Dokument um (leerer Name: nichts ändert sich). `geaendert` wird gesetzt, der Text bleibt. */
export function benenneDokumentUm(q: QualProjekt, id: string, name: string): QualProjekt {
  const n = name.trim();
  if (!n) return q;
  return { ...q, dokumente: q.dokumente.map(d => (d.id === id ? { ...d, name: n, geaendert: Date.now() } : d)) };
}

/**
 * Entfernt ein Dokument samt seinen Segmenten und deren Kodierungen. Ein Fall, der nur zu diesem Dokument gehörte (Dokument-Fall oder Sprecher-Fälle),
 * fällt mit weg; Fälle, auf die noch ein anderes Dokument zeigt, bleiben.
 */
export function entferneDokument(q: QualProjekt, id: string): QualProjekt {
  const dok = q.dokumente.find(d => d.id === id);
  if (!dok) return q;
  const rest = q.dokumente.filter(d => d.id !== id);
  const kandidaten = new Set<string>();
  if (dok.fall) kandidaten.add(dok.fall);
  for (const s of dok.transkript?.sprecher ?? []) if (s.fall) kandidaten.add(s.fall);
  const benutzt = new Set<string>();
  for (const d of rest) { if (d.fall) benutzt.add(d.fall); for (const s of d.transkript?.sprecher ?? []) if (s.fall) benutzt.add(s.fall); }
  const faelleWeg = new Set([...kandidaten].filter(f => !benutzt.has(f)));
  const segWeg = new Set(q.segmente.filter(s => s.dokument === id).map(s => s.id));
  return {
    ...q,
    dokumente: rest,
    faelle: q.faelle.filter(f => !faelleWeg.has(f.id)),
    segmente: q.segmente.filter(s => !segWeg.has(s.id)),
    kodierungen: q.kodierungen.filter(k => !segWeg.has(k.segment)),
    memos: q.memos.map(m => ({ ...m, bezug: m.bezug.filter(b => !((b.art === 'dokument' && b.id === id) || (b.art === 'fall' && b.id && faelleWeg.has(b.id)) || (b.art === 'segment' && b.id && segWeg.has(b.id)))) })),
  };
}

/** Entfernt einen Code (Unterkategorien rücken hoch) und alle Kodierungen, die auf ihn zeigen. */
export function entferneCodeMitKodierungen(q: QualProjekt, id: string): QualProjekt {
  return aendereCodes(q, entferne(q.codes, id));
}

/**
 * Ersetzt die Codes. Kodierungen, deren Code nicht mehr da ist, fallen weg (verwaiste Kodierungen), Segmente bleiben.
 * Gibt es noch kein `QualProjekt`, wird eines angelegt.
 */
export function aendereCodes(q: QualProjekt | undefined, codes: Code[], projektName = ''): QualProjekt {
  const basis = q ?? neuesQualProjekt(projektName);
  const da = new Set(codes.map(c => c.id));
  const kodierungen = basis.kodierungen.some(k => !da.has(k.code)) ? basis.kodierungen.filter(k => da.has(k.code)) : basis.kodierungen;
  return mitCodeProtokoll(basis, { ...basis, codes, kodierungen });
}

/**
 * Legt je Blocktitel eine Hauptkategorie an. Namen, die es schon als Hauptkategorie gibt (gleich nach Trimmen und Kleinschreibung), und
 * doppelte Namen in der Liste werden übersprungen. Leere Titel zählen nicht.
 */
export function hauptkategorienAlsCodes(q: QualProjekt | undefined, namen: string[], projektName = ''): { qual: QualProjekt; neu: string[]; uebersprungen: string[] } {
  const basis = q ?? neuesQualProjekt(projektName);
  let codes = basis.codes;
  const bekannt = new Set(codes.filter(c => !c.elternId).map(c => norm(c.name)));
  const neu: string[] = [], uebersprungen: string[] = [];
  for (const n of namen) {
    const k = norm(n);
    if (!k) continue;
    if (bekannt.has(k)) { if (!uebersprungen.some(u => norm(u) === k)) uebersprungen.push(n.trim()); continue; }
    bekannt.add(k);
    codes = neuerCode(codes, n).codes;
    neu.push(n.trim());
  }
  return { qual: aendereCodes(basis, codes), neu, uebersprungen };
}

export interface TranskriptZeile {
  id: string; name: string; programm: string; beitraege: number; personen: number;
  /** Dauer in ms (größte Zeitangabe), `undefined` ohne Zeiten */
  dauerMs?: number;
  hinweise: number;
}

/** Die Angaben für eine Zeile der Transkript-Tabelle. Hinweise nach den Regeln des Dokuments (Voreinstellung einfach). */
export function transkriptZeile(d: Dokument, sprache: 'de' | 'en'): TranskriptZeile {
  const t = d.transkript;
  let dauer: number | undefined;
  for (const a of t?.abschnitte ?? []) for (const z of [a.zeitMs, a.bisMs]) if (z !== undefined && (dauer === undefined || z > dauer)) dauer = z;
  return {
    id: d.id, name: d.name, programm: t?.quelle ?? '', beitraege: t?.abschnitte.length ?? 0, personen: t?.sprecher.length ?? 0,
    ...(dauer !== undefined ? { dauerMs: dauer } : {}),
    hinweise: t ? pruefeTranskript(d, t.regeln ?? 'einfach', sprache).length : 0,
  };
}

/** Anzeigename des Programms (Quelle des Transkripts). */
export const PROGRAMME: Record<string, string> = { atrain: 'aTrain', noscribe: 'noScribe', teams: 'Microsoft Teams', zoom: 'Zoom', vtt: 'WebVTT', srt: 'SRT', f4: 'f4transkript', docx: 'Word', text: 'Text' };
export const programmName = (q: string): string => PROGRAMME[q] ?? q;

/** Fügt ein Entwurfs-Projekt in ein vorhandenes ein: Dokumente, Fälle, Variablen (nach Namen) und Codes (nach Namen auf der Wurzel) werden ergänzt, nichts wird überschrieben. */
export function fuegeQualZusammen(q: QualProjekt, e: QualProjekt): QualProjekt {
  const ids = (l: { id: string }[]) => new Set(l.map(x => x.id));
  const dokIds = ids(q.dokumente), fallIds = ids(q.faelle);
  const neueDok = e.dokumente.filter(d => !dokIds.has(d.id));
  const neueFaelle = e.faelle.filter(f => !fallIds.has(f.id));
  const varNamen = new Set(q.variablen.map(v => norm(v.name)));
  const bekannt = new Set(q.codes.filter(c => !c.elternId).map(c => norm(c.name)));
  const codeIds = ids(q.codes);
  const wurzeln = e.codes.filter(c => !c.elternId && !bekannt.has(norm(c.name)) && !codeIds.has(c.id));
  const mehr: Code[] = [];
  const platz = q.codes.filter(c => !c.elternId).length;
  wurzeln.forEach((w, i) => { mehr.push({ ...w, reihenfolge: platz + i }); for (const u of unterkategorien(e.codes, w.id)) if (!codeIds.has(u.id)) mehr.push(u); });
  const codes = [...q.codes, ...mehr];
  return { ...q, dokumente: [...q.dokumente, ...neueDok], faelle: [...q.faelle, ...neueFaelle], variablen: [...q.variablen, ...e.variablen.filter(v => !varNamen.has(norm(v.name)))], codes };
}

/** Ersetzt ein Dokument durch das Ergebnis von `f` (gleiche Kennung). Gibt es das Dokument nicht, bleibt alles, wie es ist. */
export function ersetzeDokument(q: QualProjekt, id: string, f: (d: Dokument) => Dokument): QualProjekt {
  if (!q.dokumente.some(d => d.id === id)) return q;
  return { ...q, dokumente: q.dokumente.map(d => (d.id === id ? f(d) : d)) };
}
