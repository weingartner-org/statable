/**
 * Spaltensätze für Sequenzanalysen (Stufe F3B1): Die Spalten der Deutungskarte stehen als **Daten** hier, nicht fest im Arbeitsplatz.
 * Der Arbeitsplatz zeigt Überschrift, Kurzbeschreibung und Leitfragen aus dieser Liste. Bitte von Johannes (12.11.,
 * docs/BAUPLAN-AUSBAU-WELTWEIT-2026-11-12.md, Abschnitt 0, Punkt 2): Später (Paket A, Stufe A4) kommen weitere Sätze dazu
 * (andere Sequenzverfahren, eigene Sätze im Projekt), ohne dass der Arbeitsplatz umgebaut wird.
 *
 * Jede Spalte des Satzes „feinstruktur“ ist über ihre `feld`-Angabe an ein festes Feld von `Sinneinheit` gebunden (Datenmodell
 * docs/feinstruktur/ARCHITEKTUR-DATENMODELL-FEINSTRUKTUR.md, Abschnitt 1 - unverändert). Seit A4: frei definierte Spalten (`feld: 'weitere'`)
 * legen ihre Einträge in `Sinneinheit.weitere[kennung]`; eingebaut sind dazu „IPA“ und „Eine freie Spalte“, eigene Sätze stehen im Projekt
 * (`QualProjekt.spaltensaetze`). Zugriff immer über `eintraegeAn` / `mitEintraegenAn`, nie über `einheit[feld]`.
 *
 * Texte: `{ de, en }` als Daten; weitere Sprachen kommen als weitere Schlüssel dazu (Übersetzung in A6). Die Leitfragen sind eigene
 * Formulierungen nach docs/feinstruktur/FACHBLATT-FEINSTRUKTUR.md, Abschnitt 3 - kein Wortlaut aus Buch oder Kursmaterial.
 */
import type { Sprache } from '../i18n/laufzeit';

/** Ein Text in mehreren Sprachen; `de` und `en` sind Pflicht. */
export type SpaltenText = { de: string; en: string } & Partial<Record<string, string>>;

/**
 * Die Felder einer Sinneinheit, an die eine Spalte gebunden sein kann. `weitere` (A4): frei definierte Spalte, Einträge in
 * `Sinneinheit.weitere[spalte.kennung]` (Architekturblatt Ausbau, Abschnitt 1 „Spaltensätze“).
 */
export type SpaltenFeld = 'paraphrase' | 'intentionen' | 'lesarten' | 'rollen' | 'anschluss' | 'weitere';
/** Die festen Felder (alles außer `weitere`). */
export type FestesFeld = Exclude<SpaltenFeld, 'weitere'>;
export const FESTE_FELDER: readonly FestesFeld[] = ['paraphrase', 'intentionen', 'lesarten', 'rollen', 'anschluss'];

export interface Spalte {
  /** stabile Kennung (nie übersetzt, nie umbenannt) */
  kennung: string;
  /** Feld der Sinneinheit, in dem die Einträge liegen */
  feld: SpaltenFeld;
  name: SpaltenText;
  /** ein Satz: worum es in der Spalte geht */
  worum: SpaltenText;
  /** Leitfragen, ausklappbar; je Sprache gleich viele */
  leitfragen: SpaltenText[];
  /** Einträge sind Lesarten mit Prüfkriterium (Spalte „Latente Bedeutungen“) */
  mitPruefung?: boolean;
  /** Hilfe für das Eingabefeld eines neuen Eintrags */
  eintragName: SpaltenText;
}

export interface Spaltensatz {
  kennung: string;
  name: SpaltenText;
  /** englische Bezeichnung des Verfahrens, wie sie in Berichten steht */
  verfahren: SpaltenText;
  spalten: Spalte[];
  /** im Projekt angelegt (A4), nicht eingebaut; steht in `QualProjekt.spaltensaetze` */
  eigen?: true;
}

export const SPALTENSATZ_FEINSTRUKTUR: Spaltensatz = {
  kennung: 'feinstruktur',
  name: { de: 'Feinstrukturanalyse (Froschauer und Lueger)', en: 'Fine structure analysis (Froschauer and Lueger)' },
  verfahren: { de: 'Feinstrukturanalyse nach Froschauer und Lueger', en: 'sequential (line-by-line) hermeneutic interpretation (Froschauer and Lueger)' },
  spalten: [
    {
      kennung: 'paraphrase', feld: 'paraphrase',
      name: { de: 'Paraphrase', en: 'Paraphrase' },
      worum: { de: 'Was offen dasteht, mit eigenen Worten wiedergegeben (manifester Inhalt).', en: 'What is openly said, put in your own words (manifest content).' },
      leitfragen: [
        { de: 'Was wird hier gesagt, ganz einfach wiedergegeben?', en: 'What is being said here, put very simply?' },
        { de: 'Was steht wirklich da, ohne Deutung?', en: 'What is actually there, without interpretation?' },
      ],
      eintragName: { de: 'Paraphrase', en: 'Paraphrase' },
    },
    {
      kennung: 'intentionen', feld: 'intentionen',
      name: { de: 'Intentionen (subjektiver Sinn)', en: 'Intentions (subjective meaning)' },
      worum: { de: 'Was die Person mit der Äußerung tun will, welche Funktion sie hat.', en: 'What the person wants to do with the statement, what function it has.' },
      leitfragen: [
        { de: 'Was will die Person zeigen, erreichen oder vermeiden?', en: 'What does the person want to show, achieve or avoid?' },
        { de: 'Wie möchte sie gesehen werden?', en: 'How does she or he want to be seen?' },
        { de: 'Gut als Satz: „Die befragte Person möchte …“', en: 'Works well as a sentence: “The interviewee wants to …”' },
      ],
      eintragName: { de: 'Intention', en: 'Intention' },
    },
    {
      kennung: 'latent', feld: 'lesarten', mitPruefung: true,
      name: { de: 'Latente Bedeutungen (objektiver Sinn)', en: 'Latent meanings (objective meaning)' },
      worum: { de: 'Was in der Äußerung steckt, unabhängig von der Absicht. Hier gibt es immer mehrere Lesarten.', en: 'What lies in the statement, regardless of intention. There are always several readings here.' },
      leitfragen: [
        { de: 'Welche Regeln, Erwartungen und Selbstverständlichkeiten setzt diese Formulierung voraus?', en: 'Which rules, expectations and things taken for granted does this wording assume?' },
        { de: 'In welchen anderen Zusammenhängen würde man genau so sprechen?', en: 'In which other settings would someone speak in exactly this way?' },
        { de: 'Was sagt das über die soziale Welt, in der das sinnvoll ist?', en: 'What does this say about the social world in which it makes sense?' },
      ],
      eintragName: { de: 'Lesart', en: 'Reading' },
    },
    {
      kennung: 'rollen', feld: 'rollen',
      name: { de: 'Rollenverteilung', en: 'Distribution of roles' },
      worum: { de: 'Wer vorkommt, wer handelt, wer sich abgrenzt, auch die interviewende Person.', en: 'Who appears, who acts, who sets themselves apart, including the interviewer.' },
      leitfragen: [
        { de: 'Wer kommt vor, genannt oder mitgedacht?', en: 'Who appears, named or implied?' },
        { de: 'Wer ist aktiv, wer passiv?', en: 'Who is active, who is passive?' },
        { de: 'Wo grenzt sich die Person ab?', en: 'Where does the person set themselves apart?' },
        { de: 'Wie wird die interviewende Person angesprochen?', en: 'How is the interviewer addressed?' },
      ],
      eintragName: { de: 'Rolle', en: 'Role' },
    },
    {
      kennung: 'anschluss', feld: 'anschluss',
      name: { de: 'Anschlussoptionen und Prüfung', en: 'Possible continuations and testing' },
      worum: { de: 'Was nach dieser Einheit kommen könnte, und was später vorkommen müsste oder nicht dürfte.', en: 'What could follow this unit, and what would have to appear later or must not appear.' },
      leitfragen: [
        { de: 'Wie könnte der Satz weitergehen?', en: 'How could the sentence go on?' },
        { de: 'Wenn eine Lesart stimmt: Was müsste dann noch kommen?', en: 'If a reading holds: what would then still have to come?' },
        { de: 'Was dürfte dann nicht kommen?', en: 'What must then not come?' },
      ],
      eintragName: { de: 'Anschlussoption', en: 'Possible continuation' },
    },
  ],
};

/**
 * IPA (A4): Randnotizen Zeile für Zeile in drei Schichten (Smith, Flowers und Larkin 2022; Fachblatt Arbeitsweisen, Abschnitt 5, Punkt 4).
 * Eine **zweite, freiwillige** Art; der Normalweg der IPA in Statable ist der Kodier-Arbeitsplatz. Leitfragen in eigener Formulierung.
 */
export const SPALTENSATZ_IPA: Spaltensatz = {
  kennung: 'ipa',
  name: { de: 'IPA: Randnotizen in drei Schichten (Smith, Flowers und Larkin)', en: 'IPA: exploratory notes in three layers (Smith, Flowers and Larkin)' },
  verfahren: { de: 'Interpretative Phänomenologische Analyse (IPA), Randnotizen Zeile für Zeile in drei Schichten (Smith, Flowers und Larkin 2022)', en: 'interpretative phenomenological analysis (IPA), line-by-line exploratory notes in three layers (Smith, Flowers and Larkin 2022)' },
  spalten: [
    {
      kennung: 'ipa-beschreibend', feld: 'weitere',
      name: { de: 'Beschreibend', en: 'Descriptive' },
      worum: { de: 'Was die Person sagt: Dinge, Ereignisse, Erfahrungen, die ihr wichtig sind.', en: 'What the person says: things, events and experiences that matter to them.' },
      leitfragen: [
        { de: 'Was beschreibt die Person hier?', en: 'What does the person describe here?' },
        { de: 'Was ist ihr dabei wichtig?', en: 'What matters to them in it?' },
      ],
      eintragName: { de: 'Beschreibende Notiz', en: 'Descriptive note' },
    },
    {
      kennung: 'ipa-sprachlich', feld: 'weitere',
      name: { de: 'Sprachlich', en: 'Linguistic' },
      worum: { de: 'Wie die Person es sagt: Bilder, Wiederholungen, Pausen, Pronomen, Brüche.', en: 'How the person says it: images, repetitions, pauses, pronouns, breaks.' },
      leitfragen: [
        { de: 'Welche Bilder, Vergleiche oder Wiederholungen kommen vor?', en: 'Which images, comparisons or repetitions appear?' },
        { de: 'Wechselt die Person zwischen „ich“, „man“ und „wir“?', en: 'Does the person switch between “I”, “you” and “we”?' },
        { de: 'Wo stockt die Rede, wo wird sie schnell?', en: 'Where does the speech falter, where does it speed up?' },
      ],
      eintragName: { de: 'Sprachliche Notiz', en: 'Linguistic note' },
    },
    {
      kennung: 'ipa-begrifflich', feld: 'weitere',
      name: { de: 'Begrifflich', en: 'Conceptual' },
      worum: { de: 'Fragende und deutende Notizen: Was könnte das für die Person bedeuten?', en: 'Questioning and interpretative notes: what might this mean for the person?' },
      leitfragen: [
        { de: 'Was könnte diese Erfahrung für die Person bedeuten?', en: 'What might this experience mean for the person?' },
        { de: 'Welche Frage stellt sich mir beim Lesen?', en: 'Which question comes up for me while reading?' },
        { de: 'Was bringe ich selbst an Vorannahmen mit?', en: 'Which assumptions do I bring myself?' },
      ],
      eintragName: { de: 'Begriffliche Notiz', en: 'Conceptual note' },
    },
  ],
};

/**
 * Eine freie Spalte (A4): für Sequenzverfahren, für die Statable keine eigenen Spalten vorgibt (Objektive Hermeneutik, Dokumentarische
 * Methode, Gesprächsanalyse). Statable gibt für diese Verfahren keine Regeln aus (Fachblatt Arbeitsweisen, Abschnitt 6).
 */
export const SPALTENSATZ_FREI: Spaltensatz = {
  kennung: 'frei',
  name: { de: 'Eine freie Spalte (für andere Sequenzverfahren)', en: 'One free column (for other sequential methods)' },
  verfahren: { de: 'Sequenzanalyse, Sinneinheit für Sinneinheit', en: 'sequential analysis, unit by unit' },
  spalten: [
    {
      kennung: 'frei-deutung', feld: 'weitere',
      name: { de: 'Deutung', en: 'Interpretation' },
      worum: { de: 'Was Sie zu dieser Sinneinheit festhalten, nach den Regeln Ihres Verfahrens.', en: 'What you note about this unit, following the rules of your method.' },
      leitfragen: [
        { de: 'Was steht hier, und wie ist es gesagt?', en: 'What is here, and how is it said?' },
        { de: 'Welche Deutungen sind möglich, solange der Folgetext unbekannt ist?', en: 'Which interpretations are possible while the following text is unknown?' },
      ],
      eintragName: { de: 'Deutung', en: 'Interpretation' },
    },
  ],
};

/** Alle eingebauten Spaltensätze. Reihenfolge = Reihenfolge der Auswahl; der erste ist die Vorgabe. */
export const SPALTENSAETZE: readonly Spaltensatz[] = [SPALTENSATZ_FEINSTRUKTUR, SPALTENSATZ_IPA, SPALTENSATZ_FREI];
/** Kennungen der eingebauten Sätze; ein eigener Satz darf keine davon haben. */
export const EINGEBAUT: ReadonlySet<string> = new Set(SPALTENSAETZE.map(x => x.kennung));

/** Text in der Sprache der Oberfläche; fehlt sie, Englisch, sonst Deutsch. */
export function spaltenText(t: SpaltenText, sprache: Sprache | string): string {
  return t[sprache] ?? (sprache === 'de' ? t.de : t.en);
}

/**
 * Der Spaltensatz zu einer Kennung: eingebaut, sonst aus den eigenen Sätzen des Projekts; unbekannt → Feinstruktur (Vorgabe).
 * Für eine Analyse besser `satzFuer`: der zeigt bei unbekannter Kennung keine Einträge zu wenig.
 */
export const spaltensatz = (kennung?: string, eigene: readonly Spaltensatz[] = []): Spaltensatz =>
  SPALTENSAETZE.find(x => x.kennung === kennung) ?? eigene.find(x => x.kennung === kennung) ?? SPALTENSATZ_FEINSTRUKTUR;

/** Wo die Einträge einer Spalte liegen: festes Feld oder `weitere[kennung]`. Ein bloßes festes Feld genügt als Angabe. */
export type SpaltenOrt = FestesFeld | Pick<Spalte, 'feld' | 'kennung'>;

/** Die Form einer Sinneinheit, die für Spalten zählt (ohne Abhängigkeit von qualprojekt.ts). */
type EinheitMitSpalten = { [K in FestesFeld]: { id: string; text: string }[] } & { weitere?: Record<string, { id: string; text: string }[]> };

/** Kennzeichen eines Orts: das feste Feld oder `w:<kennung>`. Zum Vergleichen und als Schlüssel. */
export const ortSchluessel = (o: SpaltenOrt): string => typeof o === 'string' ? o : o.feld === 'weitere' ? `w:${o.kennung}` : o.feld;

/** Einträge einer Sinneinheit an einem Ort (nie undefined). */
export function eintraegeAn<E extends EinheitMitSpalten>(e: E, o: SpaltenOrt): E[FestesFeld] {
  if (typeof o === 'string') return e[o];
  if (o.feld === 'weitere') return (e.weitere?.[o.kennung] ?? []) as E[FestesFeld];
  return e[o.feld];
}

/** Die Sinneinheit mit neuen Einträgen an einem Ort. Leere Listen in `weitere` fallen weg, ein leeres `weitere` auch. */
export function mitEintraegenAn<E extends EinheitMitSpalten>(e: E, o: SpaltenOrt, liste: E[FestesFeld]): E {
  if (typeof o === 'string') return { ...e, [o]: liste };
  if (o.feld !== 'weitere') return { ...e, [o.feld]: liste };
  const w: Record<string, { id: string; text: string }[]> = { ...(e.weitere ?? {}) };
  if (liste.length) w[o.kennung] = liste; else delete w[o.kennung];
  const { weitere: _w, ...ohne } = e;
  return (Object.keys(w).length ? { ...ohne, weitere: w } : ohne) as E;
}

/** Alle Orte, an denen eine Sinneinheit Einträge hat (feste Felder und `weitere`). */
export function orteMitEintraegen(e: EinheitMitSpalten): SpaltenOrt[] {
  const r: SpaltenOrt[] = FESTE_FELDER.filter(f => e[f].length);
  for (const [k, l] of Object.entries(e.weitere ?? {})) if (l.length) r.push({ feld: 'weitere', kennung: k });
  return r;
}

/**
 * Der Spaltensatz einer Analyse. Ist die Kennung unbekannt (eigener Satz fehlt, etwa nach dem Einlesen in ein anderes Projekt), entsteht ein
 * Ersatz aus den Feinstruktur-Spalten und je einer Spalte für jede Kennung in `weitere`, damit kein Eintrag unsichtbar wird.
 */
export function satzFuer(sa: { spaltensatz?: string; einheiten: EinheitMitSpalten[] }, eigene: readonly Spaltensatz[] = []): Spaltensatz {
  const k = sa.spaltensatz ?? 'feinstruktur';
  const s = SPALTENSAETZE.find(x => x.kennung === k) ?? eigene.find(x => x.kennung === k);
  if (s) {
    // eine Kennung in `weitere`, die der Satz nicht hat (Spalte fehlt): als Ersatzspalte anhängen, nichts verstecken
    const da = new Set(s.spalten.map(x => ortSchluessel(x)));
    const fehlt = [...new Set(sa.einheiten.flatMap(e => orteMitEintraegen(e).map(ortSchluessel)))].filter(x => !da.has(x));
    return fehlt.length ? { ...s, spalten: [...s.spalten, ...fehlt.map(ersatzSpalte)] } : s;
  }
  const weitere = [...new Set(sa.einheiten.flatMap(e => Object.keys(e.weitere ?? {})))];
  return {
    kennung: k, name: { de: 'Unbekannter Spaltensatz', en: 'Unknown column set' }, verfahren: { de: 'Sequenzanalyse', en: 'sequential analysis' },
    spalten: [...SPALTENSATZ_FEINSTRUKTUR.spalten, ...weitere.map(x => ersatzSpalte(`w:${x}`))],
  };
}

function ersatzSpalte(schluessel: string): Spalte {
  if (!schluessel.startsWith('w:')) {
    const f = SPALTENSATZ_FEINSTRUKTUR.spalten.find(x => x.feld === schluessel);
    if (f) return f;
  }
  const k = schluessel.slice(2);
  return { kennung: k, feld: 'weitere', name: { de: `Spalte ${k}`, en: `Column ${k}` }, worum: { de: '', en: '' }, leitfragen: [], eintragName: { de: 'Eintrag', en: 'Entry' } };
}

/* ---------------- Eigene Spaltensätze (A4) ---------------- */

/** Höchstzahl Spalten in einem eigenen Satz (Lesbarkeit der Karte und der Word-Tabelle im Querformat). */
export const HOECHSTENS_SPALTEN = 8;

const kurzId = (): string => globalThis.crypto.randomUUID().slice(0, 8);
const gleich = (t: string): SpaltenText => ({ de: t, en: t });

/** Eine eigene Spalte: Name und Leitfragen (eine je Zeile) von der Person, in allen Sprachen gleich. */
export function eigeneSpalte(name: string, leitfragen = '', lesarten = false): Spalte {
  const s: Spalte = {
    kennung: `s-${kurzId()}`, feld: lesarten ? 'lesarten' : 'weitere', name: gleich(name.trim()), worum: gleich(''),
    leitfragen: leitfragen.split(/\r?\n/).map(x => x.trim()).filter(Boolean).map(gleich), eintragName: gleich(name.trim()),
  };
  if (lesarten) s.mitPruefung = true;
  return s;
}

/** Ein neuer eigener Satz mit einer Spalte. `verfahren` ist der Name des Verfahrens, wie er im Bericht stehen soll. */
export function neuerEigenerSatz(name: string, verfahren: string, spalte: Spalte): Spaltensatz {
  return { kennung: `eigen-${kurzId()}`, name: gleich(name.trim()), verfahren: gleich(verfahren.trim() || name.trim()), spalten: [spalte], eigen: true };
}

/** Text einer eigenen Spalte ändern (Name, Leitfragen); Kennung und Ort bleiben. */
export function aendereEigeneSpalte(sp: Spalte, a: { name?: string; leitfragen?: string }): Spalte {
  const r = { ...sp };
  if (a.name !== undefined) { r.name = gleich(a.name); r.eintragName = gleich(a.name); }
  if (a.leitfragen !== undefined) r.leitfragen = a.leitfragen.split(/\r?\n/).map(x => x.trim()).filter(Boolean).map(gleich);
  return r;
}
/** Leitfragen einer Spalte als Text für ein Eingabefeld (eine je Zeile). */
export const leitfragenText = (sp: Spalte, sprache: string): string => sp.leitfragen.map(l => spaltenText(l, sprache)).join('\n');

/**
 * Prüft einen eigenen Satz. Ergebnis: Liste von Problemen (leer = in Ordnung). Regeln: Name, mindestens eine und höchstens
 * `HOECHSTENS_SPALTEN` Spalten, jede mit Name, Spaltennamen verschieden, höchstens eine Spalte mit Lesarten.
 */
export function pruefeEigenenSatz(s: Spaltensatz, sp: 'de' | 'en'): string[] {
  const de = sp === 'de';
  const r: string[] = [];
  if (!s.name.de.trim()) r.push(de ? 'Der Spaltensatz braucht einen Namen.' : 'The column set needs a name.');
  if (!s.spalten.length) r.push(de ? 'Der Spaltensatz braucht mindestens eine Spalte.' : 'The column set needs at least one column.');
  if (s.spalten.length > HOECHSTENS_SPALTEN) r.push(de ? `Höchstens ${HOECHSTENS_SPALTEN} Spalten.` : `At most ${HOECHSTENS_SPALTEN} columns.`);
  s.spalten.forEach((x, i) => { if (!x.name.de.trim()) r.push(de ? `Spalte ${i + 1} hat keinen Namen.` : `Column ${i + 1} has no name.`); });
  const namen = s.spalten.map(x => x.name.de.trim().toLocaleLowerCase()).filter(Boolean);
  if (new Set(namen).size !== namen.length) r.push(de ? 'Zwei Spalten haben denselben Namen.' : 'Two columns have the same name.');
  if (s.spalten.filter(x => x.feld === 'lesarten').length > 1) r.push(de ? 'Nur eine Spalte kann Lesarten mit Prüfkriterium enthalten.' : 'Only one column can hold readings with a test criterion.');
  return r;
}
