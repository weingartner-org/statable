/**
 * Zustand der Seite „Interviews“ (Stufe 4, Paket 4D): die Interview-Leitfäden.
 * Wo sie liegen: bei offenem Projekt in `s.leitfaeden` (Autospeichern über `setzeLeitfaeden`, mit dem Projekt in der .statable-Datei),
 * ohne Projekt als Entwurf in diesem Modul (nur für diese Sitzung; „Ins Projekt übernehmen“ legt ihn in ein geöffnetes Projekt).
 * Die Übernahme der Blöcke als Hauptkategorien geht an `uebernimmHauptkategorien`; das QualProjekt gibt es noch nicht, darum steht die Liste vorerst hier
 * (wird beim Zusammenführen mit dem QualProjekt verbunden).
 */
import { s, L, melde, setzeLeitfaeden, setzePlanung, setzeQual, setzeFragebogen, setzeFragebogenEingaben, setzeKonsens, setzeEnthaeltZitate } from './sitzung.svelte';
import { neuerLeitfaden, type Leitfaden, type LeitfadenSprache } from './leitfaden';
import { neuesQualProjekt, type Code, type Dokument, type Memo, type Protokoll, type QualProjekt, type Sequenzanalyse } from './qualprojekt';
import { aendereProtokoll, entferneProtokoll, fuegeProtokollHinzu } from './protokolle';
import type { TranskriptErgebnis } from './transkript-lesen';
import type { KonsensEntwurf } from './konsens-zustand';
import { fuehreZusammen, type QdpxErgebnis, type QdpxMeldung, type Zusammenfuehrung } from './qdpx';
import { aendereCodes, benenneDokumentUm, ersetzeDokument, entferneCodeMitKodierungen, entferneDokument, fuegeQualZusammen, hauptkategorienAlsCodes, uebernimmTranskript } from './interviews-qual';
import { halteVerweise } from './themen';
import { halteMixed } from './mixed';
import type { Spaltensatz } from './feinstruktur-spalten';

export type Schritt = 1 | 2 | 3 | 4;

export const iv = $state<{
  /** Entwurf ohne Projekt */
  entwurf: Leitfaden[];
  aktiv: string | null;
  schritt: Schritt;
  /** Rückfrage vor dem Entfernen (Muster wie „Fragebogen planen“) */
  rueckfrage: { titel: string; text: string; ja: string; tun: () => void } | null;
  /** Hauptkategorien aus den Blöcken (vorläufig, bis es das QualProjekt gibt) */
  hauptkategorien: string[];
  /** Qualitatives Projekt ohne offenes Projekt (nur diese Sitzung); „Ins Projekt übernehmen“ legt es in ein geöffnetes Projekt. */
  qualEntwurf: QualProjekt | undefined;
  /** Das Transkript, das gerade geöffnet ist */
  offen: string | null;
  /** Aufnahme, die der Abspieler des soeben geöffneten Transkripts laden soll (Beispielinterview) */
  aufnahmeWartet: File | null;
  /** Offene Entscheidungen beim Konsens ohne Projekt (nur diese Sitzung) */
  konsens: KonsensEntwurf | undefined;
  /** Die Feinstrukturanalyse, die gerade im Arbeitsplatz offen ist (id), oder `'neu:<dokumentId>'` beim Wählen des Ausschnitts */
  feinstruktur: string | null;
}>({ entwurf: [], aktiv: null, schritt: 1, rueckfrage: null, hauptkategorien: [], qualEntwurf: undefined, offen: null, aufnahmeWartet: null, konsens: undefined, feinstruktur: null });

/* ---------- Das qualitative Projekt (Transkripte, Codes): im Projekt `s.qual`, ohne Projekt als Entwurf */
export const qualProjekt = (): QualProjekt | undefined => (s.projekt ? s.qual : iv.qualEntwurf);
const projektName = (): string => s.projekt?.name ?? L('Interviews', 'Interviews');
function qualAblegen(q: QualProjekt | undefined) {
  // Stufe A3: Themen und Einzelfall-Modus nach jeder Änderung sauber halten (gelöschte Codes, Segmente, Fälle); ohne Themen sofort zurück
  if (q) { const alt = qualProjekt(); q = halteMixed(halteVerweise(alt && alt.id === q.id ? alt : undefined, q)); }
  if (s.projekt) void setzeQual(q); else iv.qualEntwurf = q;
}
/** Ersetzt das qualitative Projekt als Ganzes (Konsens legt eine neue Person an, .qdpx ersetzt das Projekt). */
export function ersetzeQualProjekt(q: QualProjekt | undefined) { qualAblegen(q); }
/** Die offenen Entscheidungen beim Konsens: im Projekt `s.konsens`, ohne Projekt in diesem Modul. */
export const konsensEntwurf = (): KonsensEntwurf | undefined => (s.projekt ? s.konsens : iv.konsens);
export function setzeKonsensEntwurf(k: KonsensEntwurf | undefined) { if (s.projekt) void setzeKonsens(k); else iv.konsens = k; }
/** Aus der Fall-Code-Matrix wurden Zitate als Textspalten übernommen. */
export function merkeZitate() { void setzeEnthaeltZitate(true); }
export interface QdpxAufnahme { projekt: QualProjekt; meldungen: QdpxMeldung[]; zuordnung: Zusammenfuehrung['codeZuordnung']; modus: 'ersetzen' | 'hinzufuegen' }
/**
 * Übernimmt ein gelesenes REFI-QDA-Projekt: `ersetzen` setzt es an die Stelle des vorhandenen (offene Konsens-Entscheidungen fallen weg),
 * `hinzufuegen` führt es mit dem vorhandenen zusammen (`gleichePersonen`: Kennung in der Datei → Kennung im Projekt, nur nach Rückfrage).
 */
export function uebernimmQdpx(erg: QdpxErgebnis, modus: 'ersetzen' | 'hinzufuegen', sprache: 'de' | 'en', gleichePersonen: Record<string, string> = {}): QdpxAufnahme {
  const q = qualProjekt();
  if (modus === 'hinzufuegen' && q) {
    const z = fuehreZusammen(q, erg.projekt, sprache, gleichePersonen);
    qualAblegen(z.projekt);
    return { projekt: z.projekt, meldungen: [...erg.meldungen, ...z.meldungen], zuordnung: z.codeZuordnung, modus };
  }
  qualAblegen(erg.projekt);
  setzeKonsensEntwurf(undefined);
  return { projekt: erg.projekt, meldungen: erg.meldungen, zuordnung: [], modus: 'ersetzen' };
}
export const codesListe = (): Code[] => qualProjekt()?.codes ?? [];
/** Übernimmt ein gelesenes Transkript samt Fällen und Variablen. Legt das qualitative Projekt an, wenn es fehlt. */
export function nimmTranskriptAuf(erg: TranskriptErgebnis, programm: string, dateiName: string) {
  qualAblegen(uebernimmTranskript(qualProjekt(), erg, projektName(), programm, dateiName));
}
export function entferneTranskript(id: string) { const q = qualProjekt(); if (q) qualAblegen(entferneDokument(q, id)); if (iv.offen === id) iv.offen = null; }
export function benenneTranskriptUm(id: string, name: string) { const q = qualProjekt(); if (q) qualAblegen(benenneDokumentUm(q, id, name)); }
/** Ändert ein Dokument mit einer reinen Funktion (Transkript bearbeiten, Aufnahme vermerken, Regeln wählen). Gibt zurück, ob es das Dokument gibt. */
export function aendereDokument(id: string, f: (d: Dokument) => Dokument): boolean {
  const q = qualProjekt();
  if (!q || !q.dokumente.some(d => d.id === id)) return false;
  qualAblegen(ersetzeDokument(q, id, f));
  return true;
}
/** Ändert das qualitative Projekt als Ganzes (Einwilligung: Stände, Widerruf, Fristen); false, wenn es noch keins gibt. */
export function aendereQualProjekt(f: (q: QualProjekt) => QualProjekt): boolean { const q = qualProjekt(); if (!q) return false; qualAblegen(f(q)); return true; }
/** Der Kodierleitfaden ändert die Codes (der Baustein gibt die ganze Liste zurück). */
export function aendereKodierleitfaden(codes: Code[]) { qualAblegen(aendereCodes(qualProjekt(), codes, projektName())); }
export function entferneKodierleitfadenCode(id: string) { const q = qualProjekt(); if (q) qualAblegen(entferneCodeMitKodierungen(q, id)); }
/* ---------- Protokolle und Feldnotizen (Feinstruktur F2A): im qualitativen Projekt; ohne Projekt wird ein leeres angelegt */
const qualOderNeu = (): QualProjekt => qualProjekt() ?? neuesQualProjekt(projektName());
export function legeProtokollAn(p: Protokoll) { qualAblegen(fuegeProtokollHinzu(qualOderNeu(), p, qualProjekt()?.ich)); }
/** Speichert den Entwurf eines Protokolls (kein Eintrag im Projekt-Protokoll je Änderung). */
export function speichereProtokoll(p: Protokoll) { const q = qualProjekt(); if (q) qualAblegen(aendereProtokoll(q, p)); }
export function entferneProtokollAusProjekt(id: string) { const q = qualProjekt(); if (q) qualAblegen(entferneProtokoll(q, id, q.ich)); }
export function legeFeldnotizAn(m: Memo) { const q = qualOderNeu(); qualAblegen({ ...q, memos: [...q.memos, m] }); }
export function entferneFeldnotiz(id: string) { const q = qualProjekt(); if (q) qualAblegen({ ...q, memos: q.memos.filter(m => m.id !== id) }); }

/* ---------- Feinstrukturanalysen (Sequenzanalysen, F3B1): im qualitativen Projekt; ohne Projekt wird ein leeres angelegt */
export const sequenzanalysen = (): Sequenzanalyse[] => qualProjekt()?.sequenzanalysen ?? [];
export function legeSequenzanalyseAn(sa: Sequenzanalyse) { const q = qualOderNeu(); qualAblegen({ ...q, sequenzanalysen: [...(q.sequenzanalysen ?? []), sa] }); }
export function aendereSequenzanalyse(id: string, f: (sa: Sequenzanalyse) => Sequenzanalyse, vermerk?: string) {
  const q = qualProjekt(); if (!q?.sequenzanalysen?.some(x => x.id === id)) return;
  const jetzt = Date.now();
  const protokoll = vermerk ? [...q.protokoll, { zeit: jetzt, kodierende: q.ich, was: vermerk }] : q.protokoll;
  qualAblegen({ ...q, protokoll, sequenzanalysen: q.sequenzanalysen.map(x => (x.id === id ? f(x) : x)) });
}
/* ---------- Eigene Spaltensätze (A4): im qualitativen Projekt; eingebaute stehen im Code (lib/feinstruktur-spalten.ts) */
export const eigeneSpaltensaetze = (): Spaltensatz[] => qualProjekt()?.spaltensaetze ?? [];
/** Ändert die eigenen Spaltensätze; eine leere Liste entfernt das Feld (dann fällt die Fassung zurück, wenn sonst nichts aus A4 da ist). */
export function aendereSpaltensaetze(f: (l: Spaltensatz[]) => Spaltensatz[]) {
  const q = qualOderNeu();
  const neu = f(q.spaltensaetze ?? []);
  const { spaltensaetze: _s, ...ohne } = q;
  qualAblegen(neu.length ? { ...ohne, spaltensaetze: neu } : ohne);
}
export function entferneSequenzanalyse(id: string) {
  const q = qualProjekt(); if (!q?.sequenzanalysen) return;
  qualAblegen({ ...q, sequenzanalysen: q.sequenzanalysen.filter(x => x.id !== id) });
  if (iv.feinstruktur === id) iv.feinstruktur = null;
}

export const leitfaeden = (): Leitfaden[] => (s.projekt ? s.leitfaeden : iv.entwurf);
export const aktuellerLeitfaden = (): Leitfaden | undefined => { const l = leitfaeden(); return l.find(x => x.id === iv.aktiv) ?? l[0]; };
export const entwurfWartet = (): boolean => !!s.projekt && (iv.entwurf.length > 0 || !!iv.qualEntwurf);

function ablegen(liste: Leitfaden[]) { if (s.projekt) void setzeLeitfaeden(liste); else iv.entwurf = liste; }

/** Legt einen neuen, leeren Leitfaden an und macht ihn zum aktuellen. Die Sprache folgt der Oberfläche. */
export function legeLeitfadenAn(titel?: string, sprache?: LeitfadenSprache): Leitfaden {
  const sp: LeitfadenSprache = sprache ?? (L('de', 'en') === 'en' ? 'en' : 'de');
  const nr = leitfaeden().length + 1;
  const lf = neuerLeitfaden(titel?.trim() || L(`Leitfaden ${nr}`, `Guide ${nr}`), sp);
  ablegen([...leitfaeden(), lf]);
  iv.aktiv = lf.id; iv.schritt = 1;
  return lf;
}
/** Ändert den aktuellen oder den genannten Leitfaden mit einer reinen Funktion. */
export function aendere(f: (lf: Leitfaden) => Leitfaden, id?: string) {
  const ziel = id ?? aktuellerLeitfaden()?.id;
  if (!ziel) return;
  ablegen(leitfaeden().map(x => (x.id === ziel ? f(x) : x)));
}
export function waehleLeitfaden(id: string) { iv.aktiv = id; iv.schritt = 1; }
export function benenneLeitfadenUm(id: string, titel: string) { aendere(lf => ({ ...lf, titel: titel.trim() || lf.titel, geaendert: Date.now() }), id); }
export function entferneLeitfaden(id: string) {
  const rest = leitfaeden().filter(x => x.id !== id);
  ablegen(rest);
  if (iv.aktiv === id) iv.aktiv = rest[0]?.id ?? null;
}
/** Legt Leitfäden, die ohne Projekt entstanden sind, in das offene Projekt. */
export function entwurfInsProjekt(): number {
  if (!s.projekt || !iv.entwurf.length) return 0;
  const n = iv.entwurf.length;
  void setzeLeitfaeden([...s.leitfaeden, ...iv.entwurf]);
  iv.entwurf = [];
  return n;
}
/** Legt das qualitative Projekt, das ohne Projekt entstanden ist, in das offene Projekt (vorhandenes wird ergänzt). Gibt zurück, ob etwas lag. */
export function qualEntwurfInsProjekt(): boolean {
  if (!s.projekt || !iv.qualEntwurf) return false;
  const e = $state.snapshot(iv.qualEntwurf) as QualProjekt;
  void setzeQual(s.qual ? fuegeQualZusammen(s.qual, e) : e);
  iv.qualEntwurf = undefined;
  if (iv.konsens && !s.konsens) { void setzeKonsens(iv.konsens); }
  iv.konsens = undefined;
  return true;
}

/**
 * Führt `f` aus (z. B. `oeffneNeueDaten`, das ein NEUES Projekt anlegt) und hält dabei Transkripte, Leitfäden und Fragebogen-Pläne fest:
 * Gab es ein Projekt, werden sie danach in das neue Projekt gelegt; gab es keines, werden die Entwürfe in das neue Projekt übernommen.
 */
export async function behalteInterviews<T>(f: () => Promise<T>): Promise<T> {
  const hatte = !!s.projekt;
  const lf = s.leitfaeden, pl = s.planung, q = s.qual, kn = s.konsens, zit = s.enthaeltZitate, fb = s.fragebogen, bilder = s.fragebogenBilder, eing = s.fragebogenEingaben;
  const r = await f();
  if (hatte) {
    if (lf.length) await setzeLeitfaeden(lf);
    if (pl.length) await setzePlanung(pl);
    if (q) await setzeQual(q);
    if (kn) await setzeKonsens(kn);
    if (zit) await setzeEnthaeltZitate(true);
    if (fb.length) { await setzeFragebogen(fb, bilder); await setzeFragebogenEingaben(eing); }
  } else { entwurfInsProjekt(); qualEntwurfInsProjekt(); }
  return r;
}

/** Namen der schon vorhandenen Hauptkategorien (Code-Namen), gegen die doppelte Namen erkannt werden. */
export const vorhandeneHauptkategorien = (): string[] => codesListe().filter(c => !c.elternId).sort((a, b) => a.reihenfolge - b.reihenfolge).map(c => c.name);
/**
 * Übernimmt die Namen als Hauptkategorien (Codes im qualitativen Projekt, `kodierbar`, ohne Doppelte, Meldung).
 * Gibt die Zahl der neu angelegten Codes zurück.
 */
export function uebernimmHauptkategorien(namen: string[], uebersprungen: string[] = []): number {
  const r = hauptkategorienAlsCodes(qualProjekt(), namen, projektName());
  if (r.neu.length) qualAblegen(r.qual);
  iv.hauptkategorien = [...iv.hauptkategorien, ...r.neu];
  const n = r.neu.length;
  const schon = [...new Set([...uebersprungen, ...r.uebersprungen])];
  const satz = n === 0 ? L('Es wurde keine neue Hauptkategorie angelegt.', 'No new main category was created.') : n === 1 ? L('1 Hauptkategorie angelegt.', '1 main category created.') : L(`${n} Hauptkategorien angelegt.`, `${n} main categories created.`);
  const mehr = schon.length ? L(` Schon vorhanden und übersprungen: ${schon.join(', ')}.`, ` Already present and skipped: ${schon.join(', ')}.`) : '';
  melde(satz + mehr);
  return n;
}
