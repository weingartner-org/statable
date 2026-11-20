/**
 * Feinstruktur-Arbeitsplatz (Stufe F3B1): reine Funktionen auf `Sequenzanalyse` (lib/qualprojekt.ts), ohne DOM.
 * Grundlagen: docs/feinstruktur/ARCHITEKTUR-DATENMODELL-FEINSTRUKTUR.md (2.1-2.3), ARCHITEKTUR-FEINSTRUKTUR-ARBEITSPLATZ.md, FACHBLATT-FEINSTRUKTUR.md (2-5).
 * Statable deutet nichts: keine Vorschläge für Grenzen oder Deutungen; `gedeutet` setzt nur der Mensch („Einheit fertig“).
 * Alle Positionen in Codepoints; Grenzen der Einheiten relativ zu `ausschnitt.text`.
 */
import { cpLaenge, cpTeil, type Dokument, type Eintrag, type Lesart, type Sequenzanalyse, type Sinneinheit } from './qualprojekt';
import { einheitenAus, grenzenAus, laenge, sichtbarerText, woerter, type Analyse } from './feinstruktur';
import { KENNUNG, MARKE_ANFANG, zaehleBefragt } from './zaehler-befragt';
import { eintraegeAn, mitEintraegenAn, orteMitEintraegen, ortSchluessel, satzFuer, spaltenText, type SpaltenOrt, type Spaltensatz } from './feinstruktur-spalten';

const neueId = (): string => globalThis.crypto.randomUUID();
type Sp = 'de' | 'en';

/** Formhinweise ab hier (Fachblatt Feinstruktur, Abschnitt 4). */
export const GRENZE_ZEILEN = 11;
export const GRENZE_WOERTER = 150;
/** Zeichen je Zeile beim Zählen der Zeilen: Festlegung von Statable, etwa eine Zeile im Word des Transkripts (A4 hoch, 11 pt, Zeilennummern). */
export const ZEICHEN_JE_ZEILE = 80;

export const leereEinheit = (von: number, bis: number): Sinneinheit => ({ id: neueId(), von, bis, paraphrase: [], intentionen: [], lesarten: [], rollen: [], anschluss: [], gedeutet: false });
const hatEintraege = (e: Sinneinheit): boolean => orteMitEintraegen(e).length > 0;

/** Hängt alle Einträge von `q` an `z` an (feste Felder und `weitere`); Grundlage für Grenzen ändern und Pseudonymisieren. */
export function haengeEintraegeAn(z: Sinneinheit, q: Sinneinheit): Sinneinheit {
  let r: Sinneinheit = { ...z, paraphrase: [...z.paraphrase, ...q.paraphrase], intentionen: [...z.intentionen, ...q.intentionen], lesarten: [...z.lesarten, ...q.lesarten], rollen: [...z.rollen, ...q.rollen], anschluss: [...z.anschluss, ...q.anschluss] };
  for (const [k, l] of Object.entries(q.weitere ?? {})) { const o = { feld: 'weitere' as const, kennung: k }; r = mitEintraegenAn(r, o, [...eintraegeAn(r, o), ...l]); }
  return r;
}

/** Verfahren zu einem Spaltensatz (Architekturblatt Ausbau 1): 'feinstruktur' nur beim Satz der Feinstruktur. */
export const verfahrenZu = (kennung?: string): Sequenzanalyse['verfahren'] => ((kennung ?? 'feinstruktur') === 'feinstruktur' ? 'feinstruktur' : 'sequenz');

/* ---------------- Ausschnitt wählen ---------------- */

/**
 * Ausschnitt aus den Beiträgen `von` bis `bis` (Indizes in `transkript.abschnitte`, beide einschließlich). Zeitmarke und Sprecherkennung am
 * Anfang des ersten Beitrags („[00:00:10] B1:“) gehören nicht dazu (gedeutet wird nur, was gesagt wurde; gleiche Regel wie der Zähler aus F1),
 * Leerraum am Anfang und Ende auch nicht.
 */
export function ausschnittAusBeitraegen(dok: Dokument, von: number, bis: number): { start: number; ende: number } {
  const ab = dok.transkript?.abschnitte ?? [];
  const a = ab[Math.min(von, bis)], b = ab[Math.max(von, bis)];
  if (!a || !b) throw new Error('Beitrag nicht gefunden');
  const z = Array.from(dok.text);
  let ende = b.ende;
  while (ende > a.start && /\s/u.test(z[ende - 1] ?? '')) ende--;
  const kopf = z.slice(a.start, ende).join('');
  let pos = 0;
  const m1 = MARKE_ANFANG.exec(kopf); if (m1) pos = m1[0].length;
  const km = KENNUNG.exec(kopf.slice(pos));
  if (km) { pos += km[0].length; const m2 = MARKE_ANFANG.exec(kopf.slice(pos).trimStart()); if (m2) pos += kopf.slice(pos).length - kopf.slice(pos).trimStart().length + m2[0].length; }
  const rest = kopf.slice(pos);
  pos += rest.length - rest.trimStart().length;
  const start = a.start + Array.from(kopf.slice(0, pos)).length;
  return start < ende ? { start, ende } : { start: a.start, ende };
}

/** Zeilen eines Textes beim Ausdruck: je Absatz aufgerundet nach `ZEICHEN_JE_ZEILE`. */
export function zeilenZahl(text: string): number {
  return text.split(/\r?\n/).reduce((n, absatz) => n + Math.max(1, Math.ceil(cpLaenge(absatz.trimEnd()) / ZEICHEN_JE_ZEILE)), 0);
}

const sprecherRolle = (dok: Dokument, id?: string) => dok.transkript?.sprecher.find(s => s.id === id)?.rolle;

/** Die Frage der interviewenden Person direkt vor dem Ausschnitt (nur zur Einordnung, wird nicht gedeutet). */
export function frageDavor(dok: Dokument, start: number): string | undefined {
  const ab = dok.transkript?.abschnitte ?? [];
  const vor = ab.filter(a => a.ende <= start).pop();
  if (!vor || sprecherRolle(dok, vor.sprecher) !== 'interview') return undefined;
  return cpTeil(dok.text, vor.start, vor.ende).trim() || undefined;
}

export interface AusschnittInfo { woerterBefragt: number; redezeitMs: number | null; zeilen: number; hinweise: string[] }

/** Zähler (nur die befragte Person, Zählregel aus F1) und Formhinweise für einen Ausschnitt. Hinweise, nie Sperren. */
export function ausschnittInfo(dok: Dokument, start: number, ende: number, sp: Sp, satzKennung = 'feinstruktur'): AusschnittInfo {
  const z = zaehleBefragt(dok, { start, ende });
  const zeilen = zeilenZahl(cpTeil(dok.text, start, ende));
  const hinweise: string[] = [];
  // Der Hinweis auf etwa 10 Zeilen gilt für die Feinstrukturanalyse (Fachblatt Feinstruktur 4); für andere Verfahren gibt Statable keine Regel aus
  if (satzKennung === 'feinstruktur' && (zeilen >= GRENZE_ZEILEN || z.woerter >= GRENZE_WOERTER)) hinweise.push(sp === 'de'
    ? `Der Ausschnitt hat etwa ${zeilen} Zeilen und ${z.woerter} Wörter der befragten Person. Für eine Feinstrukturanalyse genügt meist ein Ausschnitt von etwa 10 Zeilen.`
    : `The excerpt has about ${zeilen} lines and ${z.woerter} words of the interviewee. For a fine structure analysis an excerpt of about 10 lines is usually enough.`);
  const fragen = (dok.transkript?.abschnitte ?? []).filter(a => a.start < ende && a.ende > start && sprecherRolle(dok, a.sprecher) === 'interview');
  if (fragen.length) hinweise.push(sp === 'de'
    ? 'Im Ausschnitt steht eine Frage der interviewenden Person. Gedeutet werden nur die Antworten. Die Frage davor darf als Zusammenhang dastehen.'
    : 'The excerpt contains a question from the interviewer. Only the answers are interpreted. The question before may stand as context.');
  return { woerterBefragt: z.woerter, redezeitMs: z.redezeitMs, zeilen, hinweise };
}

/** Neue Analyse: eine einzige Sinneinheit über den ganzen Ausschnitt, Phase Einteilen. */
export function neueAnalyse(o: { dok?: Dokument; start: number; ende: number; text?: string; forschungsfrage: string; name: string; jetzt: number; kodierende?: string; spaltensatz?: string; folgetextVerdecken?: boolean }): Sequenzanalyse {
  const text = o.text ?? (o.dok ? cpTeil(o.dok.text, o.start, o.ende) : '');
  if (!cpLaenge(text)) throw new Error('Der Ausschnitt ist leer.');
  const sa: Sequenzanalyse = {
    id: neueId(), name: o.name, verfahren: verfahrenZu(o.spaltensatz), spaltensatz: o.spaltensatz ?? 'feinstruktur',
    ausschnitt: { start: o.start, ende: o.ende, text }, forschungsfrage: o.forschungsfrage,
    grenzenGesperrt: false, vorauslesenErlaubt: o.folgetextVerdecken === false, reflexionAlle: 4, phase: 'einteilen',
    aktuelleEinheit: 0, einheiten: [leereEinheit(0, cpLaenge(text))], reflexionen: [],
    herkunft: { art: 'neu', zeit: o.jetzt }, erstellt: o.jetzt, geaendert: o.jetzt,
  };
  if (o.dok) { sa.dokument = o.dok.id; const k = frageDavor(o.dok, o.start); if (k) sa.ausschnitt.kontext = k; }
  if (o.kodierende) sa.kodierende = o.kodierende;
  return sa;
}

/** Weicht der Ausschnitt vom Dokument ab (pseudonymisiert, verschoben)? Dann der Satz aus Architekturblatt 2.1, sonst undefined. Kein stilles Anpassen. */
export function abweichungSatz(sa: Sequenzanalyse, dok: Dokument | undefined, sp: Sp): string | undefined {
  if (!dok || cpTeil(dok.text, sa.ausschnitt.start, sa.ausschnitt.ende) === sa.ausschnitt.text) return undefined;
  return sp === 'de' ? 'Der Ausschnitt im Transkript hat sich geändert. Die Analyse nutzt weiter ihren eigenen Wortlaut.'
    : 'The excerpt in the transcript has changed. The analysis keeps using its own wording.';
}

/* ---------------- Einteilen ---------------- */

/** Ansicht für lib/feinstruktur.ts (Prototyp-Funktionen). */
export function alsAnalyse(sa: Sequenzanalyse): Analyse {
  return { text: sa.ausschnitt.text, einheiten: sa.einheiten, phase: sa.phase === 'deuten' ? 'deuten' : 'einteilen', aktuell: sa.aktuelleEinheit, vorauslesenErlaubt: sa.vorauslesenErlaubt };
}
/** Der Text, der gerade im DOM stehen darf (Architekturblatt 2.3). Phase Einteilen: alles; Deuten: bis zum Ende der aktuellen Einheit. */
export const sichtbar = (sa: Sequenzanalyse): string => sichtbarerText(alsAnalyse(sa));

export type GrenzErgebnis =
  | { art: 'geaendert'; analyse: Sequenzanalyse; gesetzt: boolean; vermerk?: string }
  | { art: 'rueckfrage'; gesetzt: boolean; einheiten: number[] }
  | { art: 'gesperrt' };

/**
 * Setzt oder löscht die Grenze `g` (relativ). Betrifft die Änderung eine Einheit, die schon gedeutet ist oder Einträge hat, braucht es eine
 * Rückfrage (`bestaetigt`). Dann gehen die Einträge an die neue Einheit mit dem meisten gemeinsamen Text; nichts wird gelöscht (Fachblatt 4).
 */
export function schalteGrenze(sa: Sequenzanalyse, g: number, jetzt: number, bestaetigt = false): GrenzErgebnis {
  if (sa.grenzenGesperrt) return { art: 'gesperrt' };
  const alt = sa.einheiten;
  const grenzen = grenzenAus(alt);
  const gesetzt = !grenzen.includes(g);
  const betroffen = gesetzt ? [alt.findIndex(e => g > e.von && g < e.bis)] : [alt.findIndex(e => e.bis === g), alt.findIndex(e => e.von === g)];
  if (betroffen.some(i => i < 0)) return { art: 'gesperrt' };
  const heikel = betroffen.filter(i => alt[i]!.gedeutet || hatEintraege(alt[i]!));
  if (heikel.length && !bestaetigt) return { art: 'rueckfrage', gesetzt, einheiten: heikel };
  const neuG = einheitenAus(gesetzt ? [...grenzen, g] : grenzen.filter(x => x !== g), sa.ausschnitt.text);
  // Einheiten außerhalb der Änderung behalten Kennung und Einträge
  const neu: Sinneinheit[] = neuG.map(n => {
    const gleich = alt.find(e => e.von === n.von && e.bis === n.bis);
    return gleich ? { ...gleich } : { ...leereEinheit(n.von, n.bis) };
  });
  let vermerk: string | undefined;
  if (heikel.length) {
    for (const i of betroffen) {
      const e = alt[i]!;
      if (neu.some(n => n.id === e.id)) continue;
      const ueber = (n: Sinneinheit) => Math.max(0, Math.min(n.bis, e.bis) - Math.max(n.von, e.von));
      const ziel = neu.reduce((b, n) => (ueber(n) > ueber(b) ? n : b), neu[0]!);
      if (!hatEintraege(ziel) && !ziel.gedeutet && ziel.id !== e.id) { ziel.id = e.id; }
      const z = haengeEintraegeAn(ziel, e);
      z.gedeutet = ziel.gedeutet || e.gedeutet;
      neu[neu.indexOf(ziel)] = z;
    }
    vermerk = `Feinstrukturanalyse „${sa.name}“: Grenze nach dem Deuten ${gesetzt ? 'gesetzt' : 'gelöscht'}`;
  }
  // Verweise (Lesart-Verlauf, Reflexionen) auf weggefallene Einheiten zeigen auf die Einheit, in der deren Anfang jetzt liegt
  const ids = new Set(neu.map(n => n.id));
  const umleiten = (id: string): string => {
    if (ids.has(id)) return id;
    const e = alt.find(x => x.id === id);
    return (e && neu.find(n => e.von >= n.von && e.von < n.bis)?.id) ?? neu[0]!.id;
  };
  for (const n of neu) n.lesarten = n.lesarten.map(l => ({ ...l, verlauf: l.verlauf.map(v => ({ ...v, beiEinheit: umleiten(v.beiEinheit) })) }));
  const analyse: Sequenzanalyse = { ...sa, einheiten: neu, reflexionen: sa.reflexionen.map(r => ({ ...r, nachEinheit: umleiten(r.nachEinheit) })),
    aktuelleEinheit: Math.min(sa.aktuelleEinheit, neu.length - 1), geaendert: jetzt };
  return { art: 'geaendert', analyse, gesetzt, ...(vermerk ? { vermerk } : {}) };
}

/* ---------------- Deuten ---------------- */

/** Wechsel in Phase Deuten: aktuelle Einheit = erste noch nicht gedeutete (oder die letzte). */
export function beginneDeuten(sa: Sequenzanalyse, jetzt: number): Sequenzanalyse {
  const i = sa.einheiten.findIndex(e => !e.gedeutet);
  return { ...sa, phase: 'deuten', aktuelleEinheit: i < 0 ? sa.einheiten.length - 1 : i, geaendert: jetzt };
}
export const zumEinteilen = (sa: Sequenzanalyse, jetzt: number): Sequenzanalyse => ({ ...sa, phase: 'einteilen', geaendert: jetzt });

/** „Einheit fertig, weiter“: setzt `gedeutet` für die aktuelle Einheit und geht zur nächsten (bleibt bei der letzten). */
export function einheitFertig(sa: Sequenzanalyse, jetzt: number): Sequenzanalyse {
  const i = sa.aktuelleEinheit;
  const einheiten = sa.einheiten.map((e, j) => (j === i ? { ...e, gedeutet: true } : e));
  return { ...sa, einheiten, aktuelleEinheit: Math.min(i + 1, einheiten.length - 1), geaendert: jetzt };
}
export const alleGedeutet = (sa: Sequenzanalyse): boolean => sa.einheiten.every(e => e.gedeutet);
/** Zahl der Einheiten nach der aktuellen (für „Noch n Sinneinheiten“, ohne Wortzahl). */
export const nochEinheiten = (sa: Sequenzanalyse): number => sa.einheiten.length - sa.aktuelleEinheit - 1;

function aendereEinheit(sa: Sequenzanalyse, idx: number, f: (e: Sinneinheit) => Sinneinheit, jetzt: number): Sequenzanalyse {
  if (!sa.einheiten[idx]) throw new Error('Sinneinheit nicht gefunden');
  return { ...sa, einheiten: sa.einheiten.map((e, j) => (j === idx ? f(e) : e)), geaendert: jetzt };
}

const istLesartOrt = (o: SpaltenOrt): boolean => ortSchluessel(o) === 'lesarten';

/**
 * Neuer Eintrag in einer Spalte; bei `lesarten` mit Prüfkriterium (leer erlaubt) und leerem Verlauf (= offen).
 * Ort: festes Feld (`'paraphrase'`) oder die Spalte selbst (dann auch `weitere`, A4).
 */
export function fuegeEintragHinzu(sa: Sequenzanalyse, idx: number, ort: SpaltenOrt, text: string, jetzt: number, pruefung = ''): { analyse: Sequenzanalyse; id: string } {
  const id = neueId();
  const neu: Eintrag | Lesart = istLesartOrt(ort) ? ({ id, text, pruefung, verlauf: [] } satisfies Lesart) : ({ id, text } satisfies Eintrag);
  const analyse = aendereEinheit(sa, idx, e => mitEintraegenAn(e, ort, [...eintraegeAn(e, ort), neu]), jetzt);
  return { analyse, id };
}
export function aendereEintrag(sa: Sequenzanalyse, idx: number, ort: SpaltenOrt, id: string, aenderung: { text?: string; pruefung?: string }, jetzt: number): Sequenzanalyse {
  return aendereEinheit(sa, idx, e => mitEintraegenAn(e, ort, eintraegeAn(e, ort).map(x => (x.id === id ? { ...x, ...aenderung } : x))), jetzt);
}
export function entferneEintrag(sa: Sequenzanalyse, idx: number, ort: SpaltenOrt, id: string, jetzt: number): Sequenzanalyse {
  return aendereEinheit(sa, idx, e => mitEintraegenAn(e, ort, eintraegeAn(e, ort).filter(x => x.id !== id)), jetzt);
}

/* ---------------- Spaltensatz und Folgetext (A4) ---------------- */

/**
 * Spalten, in denen die Analyse Einträge hat, die der Satz `neu` nicht zeigt (Namen aus dem alten Satz). Leer = Wechsel geht.
 * Ein Wechsel löscht nie etwas; er wird nur verweigert, solange Einträge sonst unsichtbar würden.
 */
export function fehlendeSpalten(sa: Sequenzanalyse, neu: Spaltensatz, eigene: readonly Spaltensatz[], sprache: string): string[] {
  const da = new Set(neu.spalten.map(x => ortSchluessel(x)));
  const alt = satzFuer(sa, eigene);
  const fehlt = new Set(sa.einheiten.flatMap(e => orteMitEintraegen(e).map(ortSchluessel)).filter(x => !da.has(x)));
  return alt.spalten.filter(x => fehlt.has(ortSchluessel(x))).map(x => spaltenText(x.name, sprache));
}

export type SatzWechsel = { art: 'geaendert'; analyse: Sequenzanalyse } | { art: 'nicht-moeglich'; spalten: string[] };

/** Wechselt den Spaltensatz (setzt `verfahren` mit). Nicht möglich, solange Einträge in Spalten stehen, die der neue Satz nicht hat. */
export function setzeSpaltensatz(sa: Sequenzanalyse, neu: Spaltensatz, eigene: readonly Spaltensatz[], jetzt: number, sprache = 'de'): SatzWechsel {
  const f = fehlendeSpalten(sa, neu, eigene, sprache);
  if (f.length) return { art: 'nicht-moeglich', spalten: f };
  return { art: 'geaendert', analyse: { ...sa, spaltensatz: neu.kennung, verfahren: verfahrenZu(neu.kennung), geaendert: jetzt } };
}

/** „Folgetext verdecken“ (A4): an = nicht vorauslesen (Vorgabe). Das Feld im Datenmodell heißt umgekehrt `vorauslesenErlaubt`. */
export const folgetextVerdeckt = (sa: Pick<Sequenzanalyse, 'vorauslesenErlaubt'>): boolean => !sa.vorauslesenErlaubt;
export const setzeFolgetextVerdeckt = (sa: Sequenzanalyse, an: boolean, jetzt: number): Sequenzanalyse => ({ ...sa, vorauslesenErlaubt: !an, geaendert: jetzt });

/** Wörter einer Einheit (für den Formhinweis ab 9 Wörtern). */
export const einheitWoerter = (sa: Sequenzanalyse, idx: number): number => {
  const e = sa.einheiten[idx]; if (!e) return 0;
  return woerter(Array.from(sa.ausschnitt.text).slice(e.von, e.bis).join('')).length;
};
export const GRENZE_EINHEIT_WOERTER = 9;
export function einheitHinweis(sa: Sequenzanalyse, idx: number, sp: Sp): string | undefined {
  const n = einheitWoerter(sa, idx);
  if (n < GRENZE_EINHEIT_WOERTER) return undefined;
  return sp === 'de' ? `Diese Sinneinheit hat ${n} Wörter. Kleinere Einheiten machen die Deutung genauer.` : `This unit has ${n} words. Smaller units make the interpretation more precise.`;
}

/** Text der Einheit `idx`, nur wenn er sichtbar sein darf (sonst ''). */
export function einheitSichtbar(sa: Sequenzanalyse, idx: number): string {
  const e = sa.einheiten[idx]; if (!e) return '';
  const s = Array.from(sichtbar(sa));
  return s.length >= e.bis ? s.slice(e.von, e.bis).join('').trimEnd() : '';
}

export { laenge };
