/**
 * Treffer der Befehlspalette (Strg+K), reine Logik ohne Oberfläche (Barrierefreiheit Welle 2, Auftrag B).
 * Die Oberfläche (`bausteine/Befehlspalette.svelte`) sammelt die rohen Angaben (Texte schon in der Sprache der Person),
 * baut daraus mit den Bauern unten die Einträge und fragt mit `rangiere` nach Treffern.
 *
 * Suchregeln: Groß/klein, Umlaute (ä=ae=a, ß=ss) und Akzente egal; jedes Suchwort muss irgendwo passen (UND);
 * Wortanfang schlägt Teilwort; Titel (Alltagsfrage) zählt mehr als Fachbegriff, dieser mehr als ein Stichwort.
 * Jeder Eintrag mit Fachbegriff zeigt ihn immer neben der Alltagsfrage (`anzeige`): Fachbegriff nie nur versteckt.
 */
import { glatt } from '../hilfe/suche';

export type Quelle = 'auswertung' | 'seite' | 'hilfe' | 'einstellung' | 'export' | 'begriff' | 'kuerzel' | 'abschnitt' | 'lerneinheit' | 'beispiel' | 'rechner';

/** Was bei Eingabe geschieht: reine Daten, die Oberfläche führt sie aus. */
export type Aktion =
  | { art: 'hash'; hash: string }
  | { art: 'karte'; id: string; /** Qualitätskarte: Kachel „Qualität und Prozess“ mit dieser Id anklicken (öffnet die Karte und springt zum Block). */ qualitaet?: string }
  | { art: 'hilfe'; id: string }
  | { art: 'begriff'; id: string }
  | { art: 'abschnitt'; nr: number }
  | { art: 'thema'; wert: string }
  | { art: 'groesse'; schritt: 1 | -1 }
  | { art: 'sprache'; wert: string }
  | { art: 'export'; nr: number }
  | { art: 'kuerzel'; id: string }
  | { art: 'lesemodus' }
  /** Einstellung ohne Sofort-Wirkung (Kursmodus, Übungsmodus): zur Seite „Einstellungen“ und den Schalter mit dieser Element-Id fokussieren. */
  | { art: 'einstellungsfeld'; feld: string }
  /** Stufe 9: eine Gruppe des Kopf-Menüs „Ansicht“ öffnen (Ereignis `statable:ansicht`, Fokus in die Gruppe). */
  | { art: 'ansicht'; gruppe: 'sprache' | 'farben' | 'groesse' };

export interface Eintrag {
  id: string;
  quelle: Quelle;
  /** Alltagsfrage oder Name. */
  titel: string;
  /** Fachbegriff oder Erklärung, steht in Klammern neben dem Titel. */
  zusatz?: string;
  stichwoerter?: string[];
  /** Kleiner Zusatz rechts, z. B. die Tastenkombination. */
  hinweis?: string;
  aktion: Aktion;
  /** Die Quelle hat den Eintrag schon selbst gefunden (z. B. Volltextsuche der Hilfe): dann zählt er mindestens so. */
  fest?: number;
}
export interface Treffer extends Eintrag { punkte: number }

/** Reihenfolge bei gleicher Punktzahl und bei der leeren Eingabe. */
export const QUELLEN_REIHE: Quelle[] = ['abschnitt', 'seite', 'auswertung', 'einstellung', 'lerneinheit', 'beispiel', 'rechner', 'export', 'hilfe', 'begriff', 'kuerzel'];

/** Anzeige: „Titel (Fachbegriff)“. */
export const anzeige = (e: Pick<Eintrag, 'titel' | 'zusatz'>): string => (e.zusatz ? `${e.titel} (${e.zusatz})` : e.titel);

const WORT = /[\p{L}\p{N}]+/gu;
export const woerterVon = (s: string): string[] => glatt(s).match(WORT) ?? [];

/** Aufschlag für Auswertungen bei einem Treffer: ein Hilfe-Artikel, dessen Titel das Fachwort enthält, soll die Karte nicht überholen. */
const AUSWERTUNG_VORRANG = 3;
/** Aufschlag für ein Werkzeug, dessen Name die ganze Eingabe enthält (vor dem gleichnamigen Fachbegriff) */
const WERKZEUG_VORRANG = 1;
const GEWICHT = { titel: 3, zusatz: 2.5, stich: 2 } as const;

/** Wie gut passt das Suchwort auf das Wort? 1 = gleich, 0,85 = Wortanfang, 0,4 = Teilwort (ab drei Zeichen), sonst 0. */
function passt(q: string, w: string): number {
  if (w === q) return 1;
  if (w.startsWith(q)) return 0.85;
  if (q.length >= 3 && w.includes(q)) return 0.4;
  return 0;
}

/** Punkte eines Eintrags für die Suchwörter; 0 = passt nicht (ein Suchwort ohne Fundstelle). */
export function bewerte(e: Eintrag, suchwoerter: string[], ganz: string): number {
  const felder: [string[], number][] = [
    [woerterVon(e.titel), GEWICHT.titel],
    [woerterVon(e.zusatz ?? ''), GEWICHT.zusatz],
    [(e.stichwoerter ?? []).flatMap(woerterVon), GEWICHT.stich],
  ];
  let summe = 0;
  for (const q of suchwoerter) {
    let beste = 0;
    for (const [ws, g] of felder) for (const w of ws) beste = Math.max(beste, passt(q, w) * g);
    if (!beste) return e.fest ?? 0;
    summe += beste;
  }
  if (glatt(e.titel).startsWith(ganz)) summe += 2;
  else if (e.zusatz && glatt(e.zusatz).startsWith(ganz)) summe += 1.5;
  else if (suchwoerter.length > 1 && glatt(e.titel).includes(ganz)) summe += 1;   // mehrere Wörter in genau dieser Reihenfolge
  if (e.quelle === 'auswertung') summe += AUSWERTUNG_VORRANG;   // Auswertung (Alltagsfrage mit Fachbegriff) vor gleich gutem Hilfe-Artikel
  // U1 (13.11.): Ein Werkzeug (Seite oder Teil einer Seite), das die ganze Eingabe als Namen trägt, kommt vor die bloße Erklärung des Fachbegriffs
  // („Joint Display“: erst das Werkzeug im Kodier-Arbeitsplatz, dann der Fachbegriff in der Seitenleiste)
  else if (e.quelle === 'seite' && [e.titel, e.zusatz ?? '', ...(e.stichwoerter ?? [])].some(t => glatt(t).includes(ganz))) summe += WERKZEUG_VORRANG;
  return Math.max(summe, e.fest ?? 0);
}

/** Wie viele Vorschläge je Quelle bei leerer Eingabe (Quellen ohne Zahl zeigen sich erst beim Tippen). */
const VORSCHLAG: Partial<Record<Quelle, number>> = { abschnitt: 5, seite: 8, einstellung: 4 };

/**
 * Die Treffer zur Eingabe, beste zuerst; bei leerer Eingabe die Vorschläge.
 * Gleiche Punkte: Quelle nach `QUELLEN_REIHE`, dann die Reihenfolge der Eingabe.
 */
export function rangiere(frage: string, eintraege: readonly Eintrag[], max = 30): Treffer[] {
  const qs = woerterVon(frage);
  if (!qs.length) {
    const zaehler: Partial<Record<Quelle, number>> = {};
    const aus: Treffer[] = [];
    for (const e of eintraege) {
      const grenze = VORSCHLAG[e.quelle]; if (!grenze) continue;
      const n = zaehler[e.quelle] ?? 0; if (n >= grenze) continue;
      zaehler[e.quelle] = n + 1; aus.push({ ...e, punkte: 0 });
    }
    return aus.sort((a, b) => QUELLEN_REIHE.indexOf(a.quelle) - QUELLEN_REIHE.indexOf(b.quelle)).slice(0, max);
  }
  const ganz = glatt(frage).trim();
  const bew = eintraege.map((e, i) => ({ e, i, p: bewerte(e, qs, ganz) })).filter(x => x.p > 0);
  bew.sort((a, b) => b.p - a.p || QUELLEN_REIHE.indexOf(a.e.quelle) - QUELLEN_REIHE.indexOf(b.e.quelle) || a.i - b.i);
  return bew.slice(0, max).map(x => ({ ...x.e, punkte: x.p }));
}

/* ---------- Bauer: je Quelle aus rohen Angaben Einträge machen ---------- */

/** Karten des Auswertungs-Katalogs (`lib/verfahren.ts`): Alltagsfrage als Titel, Fachbegriff als Zusatz, das Beispiel als Stichwort. */
export const auswertungen = (karten: readonly { id: string; titel: string; zusatz?: string; beispiel?: string }[]): Eintrag[] =>
  karten.map(k => ({ id: `auswertung-${k.id}`, quelle: 'auswertung', titel: k.titel, zusatz: k.zusatz, stichwoerter: k.beispiel ? [k.beispiel] : undefined, aktion: { art: 'karte', id: k.id } }));

/** Karten der Gruppe „Qualität und Prozess“ (`lib/qualitaet.ts`): wie die Auswertungen, aber mit Sprung zum Block. `wort` sind Stichwörter (auch Englisch). */
export const qualitaetEintraege = (karten: readonly { id: string; titel: string; zusatz: string; beispiel: string; karte: string; wort: string }[]): Eintrag[] =>
  karten.map(k => ({ id: `auswertung-qualitaet-${k.id}`, quelle: 'auswertung', titel: k.titel, zusatz: k.zusatz, stichwoerter: [k.beispiel, k.wort], aktion: { art: 'karte', id: k.karte, qualitaet: k.id } }));

/** Reiter und Seiten: `hash` ohne Raute. */
export const seiten = (liste: readonly { hash: string; titel: string; zusatz?: string; stichwoerter?: string[]; hinweis?: string }[]): Eintrag[] =>
  liste.map(x => ({ id: `seite-${x.hash}`, quelle: 'seite', titel: x.titel, zusatz: x.zusatz, stichwoerter: x.stichwoerter, hinweis: x.hinweis, aktion: { art: 'hash', hash: x.hash } }));

/** Hilfe-Artikel (nicht die Begriffe): `fest` setzt die Volltextsuche der Hilfe ein (`hilfe/suche.ts`), `treffer` sind deren Artikel-Ids. */
export const hilfeArtikel = (liste: readonly { id: string; titel: string; stichwoerter?: string[] }[], treffer: ReadonlySet<string> = new Set()): Eintrag[] =>
  liste.map(a => ({ id: `hilfe-${a.id}`, quelle: 'hilfe', titel: a.titel, stichwoerter: a.stichwoerter, aktion: { art: 'hilfe', id: a.id }, fest: treffer.has(a.id) ? 0.5 : undefined }));

/** Fachbegriffe (Glossar der Hilfe): Auswahl öffnet die Erklärung in der Seitenleiste. */
export const fachbegriffe = (liste: readonly { id: string; titel: string }[]): Eintrag[] =>
  liste.map(a => ({ id: `begriff-${a.id}`, quelle: 'begriff', titel: a.titel, aktion: { art: 'begriff', id: a.id } }));

/** Einstellungen, die die Palette sofort umschaltet; `aktion` kommt fertig mit. */
export const einstellungen = (liste: readonly { id: string; titel: string; zusatz?: string; stichwoerter?: string[]; aktion: Aktion }[]): Eintrag[] =>
  liste.map(x => ({ id: `einstellung-${x.id}`, quelle: 'einstellung', titel: x.titel, zusatz: x.zusatz, stichwoerter: x.stichwoerter, aktion: x.aktion }));

/** Stufe 9: Lerneinheiten (`lernen/lernplan.ts`): Alltagsfrage als Titel, Fachbegriff als Zusatz; Sprung `#lernen/<id>`. */
export const lerneinheiten = (liste: readonly { id: string; titel: string; zusatz?: string; stichwoerter?: string[] }[]): Eintrag[] =>
  liste.map(x => ({ id: `lerneinheit-${x.id}`, quelle: 'lerneinheit', titel: x.titel, zusatz: x.zusatz, stichwoerter: x.stichwoerter, aktion: { art: 'hash', hash: `lernen/${x.id}` } }));

/** Stufe 9: Beispiele (`lib/beispiele.ts`), einzeln; Sprung `#beispiele/<id>`. Die Titel der Schritte (Verfahren) sind Stichwörter. */
export const beispieleEintraege = (liste: readonly { id: string; titel: string; zusatz?: string; stichwoerter?: string[] }[]): Eintrag[] =>
  liste.map(x => ({ id: `beispiel-${x.id}`, quelle: 'beispiel', titel: x.titel, zusatz: x.zusatz, stichwoerter: x.stichwoerter, aktion: { art: 'hash', hash: `beispiele/${x.id}` } }));

/** Stufe 9: Rechner und Regler (die Kacheln von `seiten/Verstehen.svelte`); Sprung `#verstehen/<id>`. */
export const rechner = (liste: readonly { id: string; titel: string; stichwoerter?: string[] }[]): Eintrag[] =>
  liste.map(x => ({ id: `rechner-${x.id}`, quelle: 'rechner', titel: x.titel, stichwoerter: x.stichwoerter, aktion: { art: 'hash', hash: `verstehen/${x.id}` } }));

/** Export-Menüs der Seite (`ExportMenue.svelte`): `nr` zählt die sichtbaren Menüs in Lesereihenfolge. */
export const exporte = (menues: readonly { name: string }[]): Eintrag[] =>
  menues.map((m, nr) => ({ id: `export-${nr}`, quelle: 'export', titel: m.name, stichwoerter: ['Export', 'speichern', 'save', 'Word', 'Excel', 'PDF'], aktion: { art: 'export', nr } }));

/** Die Datentabelle im Lesemodus (Seiten zu 50 Zeilen als echte Tabelle): Alltag als Titel, Fachbegriff „Lesemodus“ daneben (Rest-Block B7). */
export const lesemodusEintrag = (titel: string, zusatz: string): Eintrag =>
  ({ id: 'seite-lesemodus', quelle: 'seite', titel, zusatz, stichwoerter: ['Lesemodus', 'reading mode', 'Screenreader', 'screen reader', 'Braille', 'Datentabelle', 'Tabelle', 'Daten'], aktion: { art: 'lesemodus' } });

/** Die Fachwörter des Abschnitts, in Lesereihenfolge, jedes Wort einmal (gleiche Id und gleicher Text). */
export function abschnittBegriffe(knoepfe: readonly { id: string; text: string }[], stichwort: string[] = []): Eintrag[] {
  const gesehen = new Set<string>(), aus: Eintrag[] = [];
  knoepfe.forEach((k, nr) => {
    const t = k.text.trim(), schluessel = `${k.id}|${glatt(t)}`;
    if (!t || gesehen.has(schluessel)) return;
    gesehen.add(schluessel);
    aus.push({ id: `abschnitt-${nr}`, quelle: 'abschnitt', titel: t, stichwoerter: stichwort, aktion: { art: 'abschnitt', nr } });
  });
  return aus;
}

/* ---------- Kürzel: Schnittstelle zu `lib/kuerzel.ts` (Auftrag A) ---------- */

export interface KuerzelInfo { id: string; /** Name des Kürzels, z. B. „Wo bin ich“ */ text: string; /** Anzeige der Tasten, z. B. „Alt + W“ */ tasten: string; wirkung?: string; /** Führt das Kürzel aus, wenn es sich ohne Tastendruck auslösen lässt. */ ausfuehren?: () => void }
let kuerzelQuelle: () => readonly KuerzelInfo[] = () => [];
/** Wer die Liste der Kürzel hat (`kuerzel.ts`), meldet sich hier an. Bis dahin ist die Liste leer. */
export const setzeKuerzelQuelle = (f: (() => readonly KuerzelInfo[]) | null): void => { kuerzelQuelle = f ?? (() => []); };
export const holeKuerzel = (): readonly KuerzelInfo[] => kuerzelQuelle();
export const kuerzelEintraege = (liste: readonly KuerzelInfo[] = holeKuerzel()): Eintrag[] =>
  liste.map(k => ({ id: `kuerzel-${k.id}`, quelle: 'kuerzel', titel: k.text, zusatz: k.wirkung, stichwoerter: ['Kürzel', 'Tastenkombination', 'shortcut', 'keyboard'], hinweis: k.tasten, aktion: { art: 'kuerzel', id: k.id } }));
