/**
 * Feinstruktur, Stufe F3c: Gruppenarbeit ohne Server.
 * Grundlagen: docs/feinstruktur/FACHBLATT-FEINSTRUKTUR.md (8 Gruppenarbeit, 10 Grenzen), ARCHITEKTUR-DATENMODELL-FEINSTRUKTUR.md (2.5 Gruppen).
 *
 * - Weitergeben: eine Austauschdatei `{ format: 'statable-sequenzanalyse', version: 1, analyse }` ohne Dokument (nur `ausschnitt.text`),
 *   Grenzen gesperrt. Passwort wie die Projektdatei (age, scrypt) - die Seite fragt, diese Datei rechnet nur.
 * - Einlesen: geprüft mit demselben Leser wie die Projektdatei; neue Kennung, `herkunft.art = 'eingelesen'`.
 * - Zusammenführen: nur bei gleichem `ausschnitt.text` und gleichen Grenzen; neue Analyse mit `herkunft.art = 'zusammengefuehrt'`,
 *   Einträge tragen `gruppe`, Lesarten behalten ihren Verlauf. **Keine Übereinstimmungszahl.**
 * - Gleiche Einträge legt der Mensch von Hand zusammen; die Herkunft (Gruppennamen) bleibt im Feld `gruppe` sichtbar.
 * Statable deutet nichts und schlägt nichts vor.
 */
import type { Eintrag, Lesart, Sequenzanalyse, Sinneinheit, Zwischenfazit, Zwischenreflexion } from './qualprojekt';
import { leseSequenzanalyse } from './qualprojekt';
import { EINGEBAUT, eintraegeAn, mitEintraegenAn, ortSchluessel, type SpaltenOrt, type Spaltensatz } from './feinstruktur-spalten';
import { leseSpaltensatz } from './qualprojekt';
import { standVon } from './feinstruktur-pruefen';
import { einheitSichtbar } from './feinstruktur-analyse';
import { istVerschluesselt, verschluesseleProjekt, entschluesseleProjekt } from './projektpasswort';

const neueId = (): string => globalThis.crypto.randomUUID();
type Sp = 'de' | 'en';

export const AUSTAUSCH_FORMAT = 'statable-sequenzanalyse';
/** Fassung 1: Feinstruktur; Fassung 2 (A4): anderer Spaltensatz oder Einträge in frei definierten Spalten, eigener Satz liegt bei. */
export const AUSTAUSCH_VERSION = 2;
/** Fassung, die eine Analyse braucht: 1, solange eine ältere Statable-Fassung sie ohne Verlust lesen kann. */
export const austauschFassung = (sa: Sequenzanalyse): 1 | 2 =>
  (sa.spaltensatz ?? 'feinstruktur') !== 'feinstruktur' || sa.verfahren !== 'feinstruktur' || sa.einheiten.some(e => e.weitere !== undefined) ? 2 : 1;
export const AUSTAUSCH_ENDUNG = '.statable-feinstruktur';

/* ---------------- Weitergeben ---------------- */

/**
 * Die Analyse, wie sie weitergegeben wird: ohne Dokument-Bezug, Grenzen gesperrt (beide Gruppen deuten dieselben Einheiten),
 * Phase Deuten (Einteilen ist mit gesperrten Grenzen vorbei). Gruppenname wahlweise.
 */
export function zumWeitergeben(sa: Sequenzanalyse, jetzt: number, gruppe?: string): Sequenzanalyse {
  const { dokument: _d, ...ohne } = sa;
  const r: Sequenzanalyse = { ...ohne, grenzenGesperrt: true, phase: 'deuten', geaendert: jetzt };
  if (gruppe?.trim()) r.gruppe = { ...(sa.gruppe ?? {}), name: gruppe.trim() };
  return r;
}

/**
 * Text der Austauschdatei (JSON). Ein eigener Spaltensatz (A4) liegt als `spaltensatz` bei, damit die andere Gruppe dieselben Spalten sieht;
 * eingebaute Sätze stehen im Code und brauchen das nicht.
 */
export function austauschText(sa: Sequenzanalyse, jetzt: number, gruppe?: string, eigene: readonly Spaltensatz[] = []): string {
  const o: Record<string, unknown> = { format: AUSTAUSCH_FORMAT, version: austauschFassung(sa), analyse: zumWeitergeben(sa, jetzt, gruppe) };
  const satz = eigene.find(x => x.kennung === sa.spaltensatz);
  if (satz) o.spaltensatz = satz;
  return JSON.stringify(o, null, 1);
}

/** Bytes der Austauschdatei; mit Passwort verschlüsselt wie die Projektdatei (age, scrypt). */
export async function austauschBytes(sa: Sequenzanalyse, jetzt: number, o: { gruppe?: string; passwort?: string; eigene?: readonly Spaltensatz[] } = {}): Promise<Uint8Array> {
  const roh = new TextEncoder().encode(austauschText(sa, jetzt, o.gruppe, o.eigene));
  return o.passwort ? await verschluesseleProjekt(roh, o.passwort) : roh;
}

/* ---------------- Einlesen ---------------- */

export class AustauschFehler extends Error {
  constructor(public grund: 'kein-json' | 'format' | 'version' | 'mit-dokument' | 'form', public pfad?: string) { super(grund); this.name = 'AustauschFehler'; }
}

/** Satz zu einem Lesefehler, ohne Fachjargon. */
export function austauschFehlerSatz(f: AustauschFehler, sp: Sp): string {
  const de = sp === 'de';
  switch (f.grund) {
    case 'kein-json': case 'format': return de ? 'Diese Datei ist keine weitergegebene Feinstrukturanalyse aus Statable.' : 'This file is not a fine structure analysis passed on from Statable.';
    case 'version': return de ? 'Diese Datei stammt aus einer neueren Fassung von Statable. Laden Sie die Seite neu (Strg+F5).' : 'This file comes from a newer version of Statable. Reload the page (Ctrl+F5).';
    case 'mit-dokument': return de ? 'Diese Datei enthält einen Verweis auf ein Dokument. Weitergegebene Analysen enthalten nur den Ausschnitt.' : 'This file refers to a document. Analyses passed on contain only the excerpt.';
    default: return de ? `Die Datei ist beschädigt (Stelle: ${f.pfad ?? '?'}).` : `The file is damaged (at: ${f.pfad ?? '?'}).`;
  }
}

/** Ist die Datei mit Passwort verschlüsselt? Dann zuerst `entschluessele` (die Seite fragt nach dem Passwort). */
export const austauschVerschluesselt = (bytes: Uint8Array): boolean => istVerschluesselt(bytes);
export const entschluessele = (bytes: Uint8Array, passwort: string): Promise<Uint8Array> => entschluesseleProjekt(bytes, passwort);

/**
 * Liest eine (unverschlüsselte) Austauschdatei. Prüft Format, Fassung und Form (derselbe Leser wie die Projektdatei; ein Dokument-Bezug ist
 * nicht erlaubt). Ergebnis: neue Kennung, `herkunft.art = 'eingelesen'` mit der alten Kennung als Quelle, Grenzen gesperrt.
 */
export function leseAustausch(bytes: Uint8Array | string, jetzt: number): Sequenzanalyse { return leseAustauschMitSatz(bytes, jetzt).analyse; }

/** Wie `leseAustausch`, dazu der beigelegte eigene Spaltensatz (A4), wenn es einen gibt. Übernehmen mit `nimmSpaltensatzAuf`. */
export function leseAustauschMitSatz(bytes: Uint8Array | string, jetzt: number): { analyse: Sequenzanalyse; spaltensatz?: Spaltensatz } {
  let j: unknown;
  try { j = JSON.parse(typeof bytes === 'string' ? bytes : new TextDecoder('utf-8', { fatal: true }).decode(bytes)); } catch { throw new AustauschFehler('kein-json'); }
  if (!j || typeof j !== 'object' || (j as Record<string, unknown>).format !== AUSTAUSCH_FORMAT) throw new AustauschFehler('format');
  const o = j as Record<string, unknown>;
  if (o.version !== 1 && o.version !== AUSTAUSCH_VERSION) throw new AustauschFehler(typeof o.version === 'number' && o.version > AUSTAUSCH_VERSION ? 'version' : 'format');
  const a = o.analyse as Record<string, unknown> | undefined;
  if (a && typeof a === 'object' && a.dokument !== undefined) throw new AustauschFehler('mit-dokument');
  let sa: Sequenzanalyse;
  try { sa = leseSequenzanalyse(a, 'analyse', new Set()); } catch (e) {
    const m = /QualProjekt: ([^:]+):/.exec(e instanceof Error ? e.message : '');
    throw new AustauschFehler('form', m?.[1]);
  }
  let spaltensatz: Spaltensatz | undefined;
  if (o.spaltensatz !== undefined) {
    try { spaltensatz = leseSpaltensatz(o.spaltensatz, 'spaltensatz'); } catch (e) {
      const m = /QualProjekt: ([^:]+):/.exec(e instanceof Error ? e.message : '');
      throw new AustauschFehler('form', m?.[1]);
    }
    if (spaltensatz.kennung !== sa.spaltensatz) throw new AustauschFehler('form', 'spaltensatz.kennung');
  }
  const analyse: Sequenzanalyse = { ...sa, id: neueId(), grenzenGesperrt: true, herkunft: { art: 'eingelesen', quellen: [sa.id], zeit: jetzt }, geaendert: jetzt };
  return spaltensatz ? { analyse, spaltensatz } : { analyse };
}

/**
 * Nimmt einen beigelegten eigenen Spaltensatz in die Liste des Projekts auf. Gibt es ihn schon (gleiche Kennung), kommen nur Spalten dazu,
 * die fehlen (nichts wird überschrieben, Namen der eigenen Fassung bleiben). Eingebaute Kennungen werden nie aufgenommen.
 */
export function nimmSpaltensatzAuf(eigene: readonly Spaltensatz[], satz: Spaltensatz): Spaltensatz[] {
  if (EINGEBAUT.has(satz.kennung)) return [...eigene];
  const da = eigene.find(x => x.kennung === satz.kennung);
  if (!da) return [...eigene, satz];
  const kennt = new Set(da.spalten.map(x => x.kennung));
  const lesartDa = da.spalten.some(x => x.feld === 'lesarten');
  const dazu = satz.spalten.filter(x => !kennt.has(x.kennung) && !(x.feld === 'lesarten' && lesartDa));
  return dazu.length ? eigene.map(x => (x === da ? { ...da, spalten: [...da.spalten, ...dazu] } : x)) : [...eigene];
}

/* ---------------- Vergleich der Grenzen ---------------- */

export type GrenzVergleich =
  | { gleich: true }
  | { gleich: false; grund: 'spaltensatz' | 'text' | 'anzahl' | 'grenze'; einheit?: number };

/** Gleicher Ausschnitt (Wortlaut) und gleiche Einteilung? Bei Abweichung: welche Sinneinheit (1-basiert) zuerst abweicht. */
export function vergleicheGrenzen(a: Sequenzanalyse, b: Sequenzanalyse): GrenzVergleich {
  if ((a.spaltensatz ?? 'feinstruktur') !== (b.spaltensatz ?? 'feinstruktur')) return { gleich: false, grund: 'spaltensatz' };
  if (a.ausschnitt.text !== b.ausschnitt.text) return { gleich: false, grund: 'text' };
  const n = Math.min(a.einheiten.length, b.einheiten.length);
  for (let k = 0; k < n; k++) {
    if (a.einheiten[k]!.bis !== b.einheiten[k]!.bis) return { gleich: false, grund: 'grenze', einheit: k + 1 };
  }
  if (a.einheiten.length !== b.einheiten.length) return { gleich: false, grund: 'anzahl' };
  return { gleich: true };
}

/** Der Satz, warum nicht zusammengeführt wird (Fachblatt 8: „sagt warum“). */
export function vergleichSatz(v: GrenzVergleich, a: Sequenzanalyse, b: Sequenzanalyse, sp: Sp): string | undefined {
  if (v.gleich) return undefined;
  const de = sp === 'de';
  switch (v.grund) {
    case 'spaltensatz': return de ? 'Die beiden Analysen arbeiten mit verschiedenen Spalten. Statable führt sie nicht zusammen.' : 'The two analyses use different columns. Statable does not merge them.';
    case 'text': return de ? 'Der Ausschnitt ist nicht derselbe: Der Wortlaut weicht ab. Statable führt nur Analysen desselben Ausschnitts zusammen.' : 'The excerpt is not the same: the wording differs. Statable only merges analyses of the same excerpt.';
    case 'anzahl': return de ? `Die Einteilung weicht ab: ${a.einheiten.length} Sinneinheiten in „${a.name}“, ${b.einheiten.length} in „${b.name}“.` : `The division differs: ${a.einheiten.length} units in “${a.name}”, ${b.einheiten.length} in “${b.name}”.`;
    default: return de ? `Die Einteilung weicht ab: Sinneinheit ${v.einheit} endet an einer anderen Stelle. Statable führt nur bei gleichen Grenzen zusammen.` : `The division differs: unit ${v.einheit} ends at a different point. Statable only merges with the same boundaries.`;
  }
}

/** Beide Einteilungen nebeneinander (Wortlaut je Sinneinheit), wenn die Grenzen abweichen. Nur bei gleichem Ausschnitt sinnvoll. */
export const einteilung = (sa: Sequenzanalyse): string[] => sa.einheiten.map((_, k) => einheitSichtbar(sa, k));

/* ---------------- Zusammenführen ---------------- */


/** Gruppenname einer Analyse: Gruppe, sonst Name der Analyse. */
export const gruppenName = (sa: Sequenzanalyse): string => sa.gruppe?.name?.trim() || sa.name;

function verbinde(a: string, b: string, na: string, nb: string): string {
  const x = a.trim(), y = b.trim();
  if (!x) return y ? `${nb}: ${y}` : '';
  if (!y || x === y) return x === y ? x : `${na}: ${x}`;
  return `${na}: ${x}\n\n${nb}: ${y}`;
}

/**
 * Führt zwei Analysen desselben Ausschnitts zu einer **neuen** zusammen (Architekturblatt 2.5). Je Sinneinheit und Spalte stehen die
 * Einträge beider Gruppen untereinander, jeder mit `gruppe` (vorhandene Gruppenangabe bleibt). Lesarten behalten ihren Verlauf (Verweise auf
 * Sinneinheiten werden umgeschrieben). Zwischenreflexionen und Zwischenfazit beider Gruppen bleiben erhalten, mit Gruppennamen.
 * Wirft, wenn die Grenzen abweichen (`vergleicheGrenzen`). Keine Zahl, kein Vergleich, keine Rangfolge.
 */
export function zusammenfuehren(a: Sequenzanalyse, b: Sequenzanalyse, jetzt: number, o: { name?: string; namen?: [string, string] } = {}): Sequenzanalyse {
  const v = vergleicheGrenzen(a, b);
  if (!v.gleich) throw new Error(vergleichSatz(v, a, b, 'de'));
  let [na, nb] = o.namen ?? [gruppenName(a), gruppenName(b)];
  if (na === nb) { na = `${na} (1)`; nb = `${nb} (2)`; }
  const neuIds = a.einheiten.map(() => neueId());
  const abb = new Map<string, string>();
  a.einheiten.forEach((e, k) => abb.set(e.id, neuIds[k]!));
  b.einheiten.forEach((e, k) => abb.set(e.id, neuIds[k]!));
  const mitGruppe = <T extends Eintrag>(e: T, g: string): T => ({ ...e, id: neueId(), gruppe: e.gruppe ?? g });
  const lesart = (l: Lesart, g: string): Lesart => ({ ...mitGruppe(l, g), verlauf: l.verlauf.map(w => ({ ...w, beiEinheit: abb.get(w.beiEinheit) ?? w.beiEinheit })) });
  const einheiten: Sinneinheit[] = a.einheiten.map((ea, k) => {
    const eb = b.einheiten[k]!;
    const e: Sinneinheit = {
      id: neuIds[k]!, von: ea.von, bis: ea.bis,
      paraphrase: [...ea.paraphrase.map(x => mitGruppe(x, na)), ...eb.paraphrase.map(x => mitGruppe(x, nb))],
      intentionen: [...ea.intentionen.map(x => mitGruppe(x, na)), ...eb.intentionen.map(x => mitGruppe(x, nb))],
      lesarten: [...ea.lesarten.map(x => lesart(x, na)), ...eb.lesarten.map(x => lesart(x, nb))],
      rollen: [...ea.rollen.map(x => mitGruppe(x, na)), ...eb.rollen.map(x => mitGruppe(x, nb))],
      anschluss: [...ea.anschluss.map(x => mitGruppe(x, na)), ...eb.anschluss.map(x => mitGruppe(x, nb))],
      gedeutet: ea.gedeutet && eb.gedeutet,
    };
    const u = ea.uebernommenVon ?? eb.uebernommenVon; if (u && abb.has(u)) e.uebernommenVon = abb.get(u);
    // frei definierte Spalten (A4): Kennungen beider Seiten, Einträge untereinander mit Gruppe
    const kennungen = [...new Set([...Object.keys(ea.weitere ?? {}), ...Object.keys(eb.weitere ?? {})])];
    let mitW = e;
    for (const k of kennungen) {
      const o = { feld: 'weitere' as const, kennung: k };
      mitW = mitEintraegenAn(mitW, o, [...eintraegeAn(ea, o).map(x => mitGruppe(x, na)), ...eintraegeAn(eb, o).map(x => mitGruppe(x, nb))]);
    }
    return mitW;
  });
  // Zwischenreflexionen: eine je Stelle (Datenmodell); stehen beide, kommen beide Texte mit Gruppennamen in eine.
  const reflexionen: Zwischenreflexion[] = [];
  neuIds.forEach(id => {
    const ra = a.reflexionen.find(r => abb.get(r.nachEinheit) === id), rb = b.reflexionen.find(r => abb.get(r.nachEinheit) === id);
    if (!ra && !rb) return;
    const leer = { begriffe: '', bisher: '', pruefen: '' };
    const x = ra ?? { ...leer }, y = rb ?? { ...leer };
    reflexionen.push({
      id: neueId(), nachEinheit: id, zeit: Math.max(ra?.zeit ?? 0, rb?.zeit ?? 0) || jetzt,
      begriffe: verbinde(x.begriffe, y.begriffe, na, nb), bisher: verbinde(x.bisher, y.bisher, na, nb), pruefen: verbinde(x.pruefen, y.pruefen, na, nb),
    });
  });
  let fazit: Zwischenfazit | undefined;
  if (a.fazit || b.fazit) {
    const m = (f: Zwischenfazit | undefined, g: string) => (f?.muster ?? []).map(x => ({ id: neueId(), text: `${g}: ${x.text}`, belege: x.belege.map(bl => ({ einheit: abb.get(bl.einheit) ?? bl.einheit, zitat: bl.zitat })) }));
    fazit = { muster: [...m(a.fazit, na), ...m(b.fazit, nb)], bezugForschungsfrage: verbinde(a.fazit?.bezugForschungsfrage ?? '', b.fazit?.bezugForschungsfrage ?? '', na, nb), geaendert: jetzt };
    const t = verbinde(a.fazit?.text ?? '', b.fazit?.text ?? '', na, nb); if (t) fazit.text = t;
  }
  const offen = einheiten.findIndex(e => !e.gedeutet);
  const r: Sequenzanalyse = {
    id: neueId(), name: o.name ?? `${na} + ${nb}`, verfahren: a.verfahren, spaltensatz: a.spaltensatz ?? 'feinstruktur',
    ausschnitt: { ...a.ausschnitt }, forschungsfrage: verbinde(a.forschungsfrage, b.forschungsfrage, na, nb),
    gruppe: { name: `${na} + ${nb}` }, grenzenGesperrt: true, vorauslesenErlaubt: a.vorauslesenErlaubt && b.vorauslesenErlaubt,
    reflexionAlle: a.reflexionAlle ?? 4, phase: 'deuten', aktuelleEinheit: offen < 0 ? einheiten.length - 1 : offen,
    einheiten, reflexionen, herkunft: { art: 'zusammengefuehrt', quellen: [a.id, b.id], zeit: jetzt }, erstellt: jetzt, geaendert: jetzt,
  };
  if (fazit) r.fazit = fazit;
  const se = verbinde(a.schluesselentscheidungen ?? '', b.schluesselentscheidungen ?? '', na, nb); if (se) r.schluesselentscheidungen = se;
  if (a.dokument && a.dokument === b.dokument) r.dokument = a.dokument;
  return r;
}

/* ---------------- Von Hand zusammenlegen ---------------- */

/**
 * Der Mensch legt gleiche Einträge einer Spalte zusammen (mindestens zwei). Der neue Eintrag steht an der Stelle des ersten, hat den Text,
 * den der Mensch wählt, und als `gruppe` alle beteiligten Gruppennamen („A + B“) - die Herkunft bleibt sichtbar.
 * Lesarten nur mit gleichem Stand; der Verlauf beider bleibt (nach Zeit geordnet), das Prüfkriterium wählt der Mensch.
 */
export function legeZusammen(sa: Sequenzanalyse, idx: number, feld: SpaltenOrt, ids: string[], text: string, jetzt: number, pruefung?: string): Sequenzanalyse {
  const e = sa.einheiten[idx]; if (!e) throw new Error('Sinneinheit nicht gefunden');
  const liste = eintraegeAn(e, feld) as Eintrag[];
  const gew = liste.filter(x => ids.includes(x.id));
  if (gew.length < 2 || gew.length !== new Set(ids).size) throw new Error('Wählen Sie mindestens zwei Einträge dieser Spalte.');
  const gruppen = [...new Set(gew.flatMap(x => (x.gruppe ?? '').split(' + ').map(s => s.trim()).filter(Boolean)))];
  const neu: Eintrag = { id: neueId(), text };
  if (gruppen.length) neu.gruppe = gruppen.join(' + ');
  const personen = [...new Set(gew.map(x => x.person).filter((p): p is string => !!p))];
  if (personen.length) neu.person = personen.join(', ');
  let ersatz: Eintrag | Lesart = neu;
  if (ortSchluessel(feld) === 'lesarten') {
    const ls = gew as Lesart[];
    if (new Set(ls.map(standVon)).size > 1) throw new Error('Diese Lesarten haben verschiedene Stände. Legen Sie nur Lesarten mit gleichem Stand zusammen.');
    ersatz = { ...neu, pruefung: pruefung ?? ls[0]!.pruefung, verlauf: ls.flatMap(l => l.verlauf).sort((x, y) => x.zeit - y.zeit) };
  }
  const erst = liste.findIndex(x => ids.includes(x.id));
  const neueListe = liste.flatMap((x, i) => (i === erst ? [ersatz] : ids.includes(x.id) ? [] : [x]));
  return { ...sa, einheiten: sa.einheiten.map((y, j) => (j === idx ? mitEintraegenAn(y, feld, neueListe) : y)), geaendert: jetzt };
}

/** Name der Person an einem Eintrag setzen oder löschen (Gruppenmodus, freiwillig). */
export function setzePerson(sa: Sequenzanalyse, idx: number, feld: SpaltenOrt, id: string, person: string, jetzt: number): Sequenzanalyse {
  const e = sa.einheiten[idx]; if (!e) throw new Error('Sinneinheit nicht gefunden');
  const p = person.trim();
  const liste = (eintraegeAn(e, feld) as Eintrag[]).map(x => {
    if (x.id !== id) return x;
    const { person: _p, ...ohne } = x;
    return p ? { ...ohne, person: p } : ohne;
  });
  return { ...sa, einheiten: sa.einheiten.map((y, j) => (j === idx ? mitEintraegenAn(y, feld, liste) : y)), geaendert: jetzt };
}

/** Schlüsselentscheidungen (Fachblatt 9): freier Text des Menschen. */
export const setzeSchluesselentscheidungen = (sa: Sequenzanalyse, text: string, jetzt: number): Sequenzanalyse => {
  const { schluesselentscheidungen: _s, ...ohne } = sa;
  return text.trim() ? { ...ohne, schluesselentscheidungen: text, geaendert: jetzt } : { ...ohne, geaendert: jetzt };
};
