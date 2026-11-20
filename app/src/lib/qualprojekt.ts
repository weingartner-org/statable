/**
 * Das qualitative Projekt (Interviews, Transkripte, Codes): Typen nach `docs/erheben/ARCHITEKTUR-QUALITATIVES-PROJEKT.md`, Abschnitt 1,
 * mit der Ergänzung aus `docs/erheben/FACHBLATT-STUFE-4.md` (medium mit groesse und sha256, transkript.regeln).
 * Positionen (start/ende) zählen in Unicode-Codepoints ab 0, Ende exklusiv. Der Text eines Dokuments wird nie still verändert.
 * Funktionen (neues Projekt, Prüfen beim Lesen, textBearbeitbar) ergänzt Paket 4A.
 */

import { EINGEBAUT, HOECHSTENS_SPALTEN, type Spalte, type SpaltenText, type Spaltensatz } from './feinstruktur-spalten';

export interface Kodierende { id: string; name: string }

export type SprecherRolle = 'interview' | 'befragt' | 'andere';

export interface TranskriptSprecher { id: string; name: string; rolle?: SprecherRolle; fall?: string }
export interface TranskriptAbschnitt { start: number; ende: number; sprecher?: string; zeitMs?: number; bisMs?: number }

export interface Dokument {
  id: string; name: string;
  art: 'text' | 'pdftext' | 'audio' | 'video';
  /** Klartext, unverändert (bei audio/video: das Transkript) */
  text: string;
  sprache?: string;
  /** Herkunft der eingelesenen Datei */
  datei?: { name: string; sha256: string };
  /** Aufnahme: nur Angaben, die Datei selbst liegt nicht im Projekt (Fachblatt 4) */
  medium?: { datei: string; typ: string; groesse: number; sha256: string };
  transkript?: {
    sprecher: TranskriptSprecher[];
    abschnitte: TranskriptAbschnitt[];
    regeln?: 'einfach' | 'erweitert' | 'froschauer-lueger';
    /** Quelle des Transkripts (aTrain, noScribe …) */
    quelle?: string;
  };
  /** id des Falls, zu dem das Dokument gehört */
  fall?: string;
  erstellt: number; geaendert: number; kodierende?: string;
}

export interface Code {
  id: string; name: string;
  elternId?: string;
  /** '#rrggbb'; nie die einzige Information */
  farbe?: string;
  kodierbar: boolean;
  definition?: string;
  anker?: { segment?: string; text: string }[];
  regel?: string;
  reihenfolge: number;
  /** Kodierphase der Grounded Theory (Stufe A3); gesetzt von der Person, nie berechnet. Änderungen ins Protokoll (`code.phase`). */
  phase?: KodierPhase;
}

export interface Segment { id: string; dokument: string; start: number; ende: number; erstellt: number; kodierende?: string }
export interface Kodierung { id: string; segment: string; code: string; kodierende: string; erstellt: number; stufe?: number }
/** Memo-Arten der Stufe A3 (Architekturblatt Ausbau 1): reflexives Tagebuch, Memos der Grounded Theory, Randnotizen der IPA, Vergleich zweier Stellen. Heben die Fassung auf 3. */
export const MEMO_ARTEN_A3 = ['tagebuch', 'gt-code', 'gt-theoretisch', 'gt-methodisch', 'gt-auswahl', 'saettigung', 'ipa-beschreibend', 'ipa-sprachlich', 'ipa-begrifflich', 'vergleich'] as const;
export type MemoArtA3 = typeof MEMO_ARTEN_A3[number];
export type MemoArt = 'memo' | 'feldnotiz-empirisch' | 'feldnotiz-methodisch' | 'feldnotiz-theoretisch' | MemoArtA3;
export const MEMO_ARTEN: readonly MemoArt[] = ['memo', 'feldnotiz-empirisch', 'feldnotiz-methodisch', 'feldnotiz-theoretisch', ...MEMO_ARTEN_A3];
export const istMemoArtA3 = (a: MemoArt | undefined): a is MemoArtA3 => a !== undefined && (MEMO_ARTEN_A3 as readonly string[]).includes(a);
export type MemoBezugArt = 'projekt' | 'dokument' | 'code' | 'segment' | 'fall' | 'protokoll' | 'sequenzanalyse' | 'thema';
export const MEMO_BEZUG_ARTEN: readonly MemoBezugArt[] = ['projekt', 'dokument', 'code', 'segment', 'fall', 'protokoll', 'sequenzanalyse', 'thema'];
export interface Memo {
  id: string; titel?: string; text: string;
  bezug: { art: MemoBezugArt; id?: string }[];
  /** Feldnotizen nach Strauss und Corbin (Stufe F2A); fehlt = 'memo' */
  art?: MemoArt;
  erstellt: number; kodierende?: string;
}
export interface Fall { id: string; name: string; werte: Record<string, string | number | boolean | null> }
export interface Variable { id: string; name: string; typ: 'text' | 'ja/nein' | 'ganzzahl' | 'zahl' | 'datum' | 'datumzeit'; beschreibung?: string }
export interface Menge { id: string; name: string; art: 'dokumente' | 'codes'; mitglieder: string[] }
export interface Aenderung { zeit: number; kodierende?: string; was: string; vorher?: unknown; nachher?: unknown }

/* ---- Protokolle (Stufe F2A) und Einwilligung (F2B): Architekturblatt Feinstruktur, Abschnitt 1. Datumsfelder als Text JJJJ-MM-TT. ---- */
export type ProtokollArt = 'interview' | 'gedaechtnis' | 'beobachtung';
export interface Protokoll {
  id: string;
  art: ProtokollArt;
  fall?: string; dokument?: string;
  kopf: { datum?: string; uhrzeit?: string; ort?: string; dauerMin?: number; kontaktweg?: string };
  /** Schlüssel je Vorlage (interview: zustandekommen, raum, atmosphaere, verlauf, wirkung, vorNach, thesen; beobachtung: beobachtung, ueberlegung); unbekannte bleiben erhalten */
  felder: Record<string, string>;
  /** schwierige Stellen mit Sprung ins Transkript */
  schwierigeStellen?: { zeitMs?: number; position?: number; text: string }[];
  /** nur art 'gedaechtnis' */
  schritte?: {
    s1?: { text: string; beginn: number };
    s2?: { text: string; notizen?: string };
    s3?: { abschnitte: { beobachtung: string; ueberlegung: string }[] };
  };
  erstellt: number; geaendert: number; kodierende?: string;
}
export type EinwilligungsPunkt = 'teilnahme' | 'aufnahme' | 'transkript' | 'zitate' | 'archivierung' | 'weitergabe';
export const EINWILLIGUNGS_PUNKTE: readonly EinwilligungsPunkt[] = ['teilnahme', 'aufnahme', 'transkript', 'zitate', 'archivierung', 'weitergabe'];
export type EinwilligungsStand = 'erteilt' | 'abgelehnt' | 'offen' | 'widerrufen';
export const EINWILLIGUNGS_STAENDE: readonly EinwilligungsStand[] = ['erteilt', 'abgelehnt', 'offen', 'widerrufen'];
export interface Einwilligung {
  id: string;
  /** Fall.id; Pflicht */
  fall: string;
  /** Name oder Datum der Vorlage, die unterschrieben wurde */
  fassung: string;
  form: 'schriftlich' | 'muendlich-aufnahme' | 'digital' | 'andere';
  punkte: { punkt: EinwilligungsPunkt; stand: EinwilligungsStand; datum?: string; notiz?: string }[];
  widerrufe?: { datum: string; punkte: EinwilligungsPunkt[]; notiz?: string }[];
  wiedervorlage?: { datum: string; anlass: string; erledigt?: string }[];
  loeschen?: { was: 'aufnahme' | 'kontaktdaten' | 'andere'; bis: string; erledigt?: string }[];
  zugriffskreis?: string;
  erstellt: number; geaendert: number;
}

/* ---- Feinstruktur (Stufe F3): Architekturblatt Feinstruktur, Abschnitt 1. Grenzen relativ zu ausschnitt.text, Codepoints, Ende exklusiv. ---- */
export interface Eintrag { id: string; text: string; gruppe?: string; person?: string }
export type LesartStandArt = 'offen' | 'haelt' | 'verworfen';
export interface LesartStand { stand: LesartStandArt; beiEinheit: string; begruendung: string; zeit: number }
export interface Lesart extends Eintrag {
  /** was später vorkommen müsste oder nicht dürfte */
  pruefung: string;
  /** Folge der Entscheidungen; letzter Eintrag = aktueller Stand; leer = offen */
  verlauf: LesartStand[];
}
export interface Sinneinheit {
  id: string;
  /** Codepoints relativ zu ausschnitt.text, Ende exklusiv; lückenlos */
  von: number; bis: number;
  paraphrase: Eintrag[];
  intentionen: Eintrag[];
  /** Spalte „Latente Bedeutungen“ */
  lesarten: Lesart[];
  rollen: Eintrag[];
  anschluss: Eintrag[];
  /** Einträge in frei definierten Spalten (A4, Spalten mit `feld: 'weitere'`); Schlüssel = Spalten-Kennung; nie leere Listen */
  weitere?: Record<string, Eintrag[]>;
  uebernommenVon?: string;
  /** vom Menschen gesetzt („Einheit fertig“), nie von Statable */
  gedeutet: boolean;
}
export interface Zwischenreflexion { id: string; nachEinheit: string; begriffe: string; bisher: string; pruefen: string; zeit: number }
export interface Zwischenfazit {
  muster: { id: string; text: string; belege: { einheit: string; zitat: string }[] }[];
  bezugForschungsfrage: string;
  text?: string;
  geaendert: number;
}
export interface Sequenzanalyse {
  id: string;
  name: string;
  /** 'sequenz' (A4) = anderer Spaltensatz als Feinstruktur; folgt immer dem Spaltensatz (`verfahrenZu`) */
  verfahren: 'feinstruktur' | 'sequenz';
  /** Kennung des Spaltensatzes (lib/feinstruktur-spalten.ts, eingebaut oder `QualProjekt.spaltensaetze`); fehlt = 'feinstruktur' */
  spaltensatz?: string;
  /** Dokument-id; fehlt, wenn die Analyse ohne Transkript weitergegeben wurde */
  dokument?: string;
  ausschnitt: { start: number; ende: number; text: string; kontext?: string };
  forschungsfrage: string;
  gruppe?: { name: string; mitglieder?: string[] };
  grenzenGesperrt: boolean;
  vorauslesenErlaubt: boolean;
  reflexionAlle?: number;
  /** Phase der Ansicht (F3B1): 'einteilen' zeigt den ganzen Ausschnitt, 'deuten' nur bis zur aktuellen Einheit; fehlt = 'einteilen' */
  phase?: 'einteilen' | 'deuten';
  /** Index der Einheit, die gerade gedeutet wird (0-basiert) */
  aktuelleEinheit: number;
  einheiten: Sinneinheit[];
  reflexionen: Zwischenreflexion[];
  fazit?: Zwischenfazit;
  schluesselentscheidungen?: string;
  herkunft?: { art: 'neu' | 'zusammengefuehrt' | 'eingelesen'; quellen?: string[]; zeit: number };
  erstellt: number; geaendert: number; kodierende?: string;
}

/* ---- Austausch und Nachvollziehbarkeit (Stufe A1): Architekturblatt Ausbau, Abschnitt 1. ---- */
export type KiZweck = 'transkription' | 'uebersetzung' | 'anderes';
export const KI_ZWECKE: readonly KiZweck[] = ['transkription', 'uebersetzung', 'anderes'];
/** Angabe der Person zur KI-Nutzung. Fehlt das Feld, ist noch nichts angegeben (nicht dasselbe wie „nicht genutzt“). Statable füllt nie selbst aus. */
export interface KiNutzung { genutzt: boolean; zwecke: KiZweck[]; text?: string; geaendert: number; kodierende?: string }
/** Ein Typ der typenbildenden Inhaltsanalyse: von der Person gebildet und benannt, nie von Statable. */
export interface Typ {
  id: string; name: string; beschreibung?: string;
  /** Fall-ids */
  faelle: string[];
  /** Code- oder Variablen-ids, nach denen die Person gruppiert hat */
  merkmale: string[];
}

/* ---- Arbeitsweisen, Themen, Kodierphasen, Einzelfall (Stufe A3): Architekturblatt Ausbau, Abschnitt 1; Fachblatt Arbeitsweisen 7. ---- */
/** Feste Kennungen, nie übersetzen oder umbenennen. Fehlt = 'allgemein'. Hebt die Fassung nie (nur Voreinstellung). */
export const ARBEITSWEISEN = ['allgemein', 'ta-reflexiv', 'codebuch', 'framework', 'grounded-theory', 'ipa', 'sequenzanalyse'] as const;
export type Arbeitsweise = typeof ARBEITSWEISEN[number];
export const KODIER_PHASEN = ['offen', 'fokussiert', 'axial', 'theoretisch'] as const;
export type KodierPhase = typeof KODIER_PHASEN[number];
export const THEMA_STAENDE = ['kandidat', 'aktiv', 'verworfen'] as const;
export type ThemaStand = typeof THEMA_STAENDE[number];
export const THEMA_SCHRITTE = ['angelegt', 'umbenannt', 'konzept', 'beschreibung', 'codes', 'belege', 'zusammengelegt', 'geteilt', 'verworfen', 'wieder-aufgenommen', 'stand', 'eltern', 'fall'] as const;
export interface ThemaSchritt {
  zeit: number; kodierende?: string;
  was: typeof THEMA_SCHRITTE[number];
  /** kurze Texte (alter/neuer Name, Namen beim Zusammenlegen); nie Text aus Dokumenten */
  vorher?: string; nachher?: string;
  /** warum (freiwillig, von der Person) */
  notiz?: string;
}
/** Ein Thema (theme): von der Person gebildet, nie von Statable vorgeschlagen. */
export interface Thema {
  id: string;
  name: string;
  /** zentrales Konzept (central organising concept), ein bis zwei Sätze der Person */
  konzept?: string;
  beschreibung?: string;
  /** verknüpfte Code-ids; ein Code darf in mehreren Themen sein */
  codes: string[];
  /** von der Person ausdrücklich gewählte Belege (Segment-ids) */
  belege?: string[];
  /** Unterthema von; nur eine Ebene */
  elternId?: string;
  /** gesetzt = persönliches Erfahrungsthema (IPA, PET) dieses Falls */
  fall?: string;
  /** Gruppenthema (IPA, GET): ids der persönlichen Themen, aus denen es kommt */
  aus?: string[];
  stand: ThemaStand;
  /** nie kürzen; verworfene Themen bleiben mit Verlauf */
  verlauf: ThemaSchritt[];
  reihenfolge: number;
  erstellt: number; geaendert: number; kodierende?: string;
}
/** Einzelfall-Modus (IPA): `aktuell` = Fall-id, `fertig` in der Reihenfolge des Abschlusses */
export interface Einzelfall { an: boolean; aktuell?: string; fertig: string[] }

/* ---- Mixed Methods (Stufe A2): Architekturblatt Ausbau, Abschnitt 6. Alles freiwillig, alles von der Person; Statable zählt und rechnet nur. ---- */
/**
 * Verknüpfung der qualitativen Fälle mit dem Datensatz: Wert der Fallvariable `variable` (Variablen-id) = Wert der Spalte `spalte` (Spaltenname
 * im Datensatz des Statable-Projekts). Verglichen wird als Text ohne Leerzeichen am Rand (lib/mixed.ts, `verknuepfe`). Der Datensatz selbst
 * steht nicht im qualitativen Projekt.
 */
export interface Verknuepfung { variable: string; spalte: string; geaendert: number; kodierende?: string }
/** Passung (Fetters, Curry & Creswell 2013): dieselben Kennungen wie in „Fälle vergleichen“ (`lib/faelle.ts`). Entscheidet die Person. */
export const JD_PASSUNGEN = ['offen', 'bestaetigung', 'erweiterung', 'widerspruch'] as const;
export type JdPassung = typeof JD_PASSUNGEN[number];
/** Arten: Themen oder Codes nach Gruppen, Zahlen nach qualitativen Gruppen (Typologietabelle), Seite an Seite. */
export const JD_ARTEN = ['qual-nach-gruppen', 'zahlen-nach-qual', 'seite-an-seite'] as const;
export type JdArt = typeof JD_ARTEN[number];
/** Woher die Gruppen kommen: Fallvariable, Typen (A1), Spalte des verknüpften Datensatzes, oder „mit / ohne“ einem Code oder Thema. */
export type JdGruppierung = { quelle: 'variable'; id: string } | { quelle: 'typen' } | { quelle: 'spalte'; name: string } | { quelle: 'code'; id: string } | { quelle: 'thema'; id: string };
/** Eine qualitative Zeile: ein Code (mit seinen Untercodes) oder ein Thema. Schlüssel in Belegen, Passung, Meta-Inferenz: `code:<id>` / `thema:<id>`. */
export interface JdZeile { art: 'code' | 'thema'; id: string }
/** Von der Person gewählte Belegstelle einer Zelle (nie automatisch „typisch“). `gruppe` = Gruppen-Schlüssel, bei „Seite an Seite“ `alle`. */
export interface JdBeleg { zeile: string; gruppe: string; segment: string }
export interface JointDisplay {
  id: string; name: string; art: JdArt;
  gruppierung?: JdGruppierung;
  /** qualitative Zeilen (bei `zahlen-nach-qual` leer) */
  zeilen: JdZeile[];
  /** Spalten des Datensatzes (bei `zahlen-nach-qual` die Kennwert-Spalten); Namen, nicht geprüft (der Datensatz kann sich ändern) */
  spalten: string[];
  /** „Seite an Seite“: Ergebnis aus den Zahlen je Zeile, von der Person geschrieben oder aus Statable übernommen und dann frei änderbar */
  zahlen?: Record<string, string>;
  belege: JdBeleg[];
  /** je Zeile (bei `zahlen-nach-qual` je Gruppe); fehlt = offen */
  passung: Record<string, JdPassung>;
  metaInferenz: Record<string, string>;
  erstellt: number; geaendert: number; kodierende?: string;
}
/** Design-Steckbrief (Schoonenboom & Johnson 2017; Morse 1991 für die Schreibweise; Greene, Caracelli & Graham 1989 für die Zwecke; Fetters, Curry & Creswell 2013 für die Integration). */
export const MM_REIHENFOLGEN = ['gleichzeitig', 'qual-zuerst', 'quan-zuerst', 'mehrphasig'] as const;
export const MM_GEWICHTE = ['gleich', 'qual', 'quan'] as const;
export const MM_ZWECKE = ['triangulation', 'ergaenzung', 'entwicklung', 'initiation', 'erweiterung'] as const;
export const MM_INTEGRATION = ['verbinden', 'aufbauen', 'zusammenfuehren', 'einbetten'] as const;
export interface MmDesign {
  reihenfolge?: typeof MM_REIHENFOLGEN[number];
  gewicht?: typeof MM_GEWICHTE[number];
  zwecke: (typeof MM_ZWECKE[number])[];
  integration: (typeof MM_INTEGRATION[number])[];
  /** eigene Beschreibung (bei mehrphasigen Designs Pflicht für einen Namen; Statable vergibt dann keinen) */
  beschreibung?: string;
  geaendert: number; kodierende?: string;
}
/** Selbstprüfung (MMAT 2018 Teil 5 mit Vorfragen; GRAMMS): eigene Kurzfassung der Punkte im Code (`lib/mm-selbstpruefung.ts`), keine Gesamtnote. */
export const PRUEF_LISTEN = ['mmat', 'gramms'] as const;
export const PRUEF_STAENDE = ['ja', 'nein', 'unklar', 'nicht-zutreffend'] as const;
export type PruefStand = typeof PRUEF_STAENDE[number];
export interface SelbstPunkt { kennung: string; stand: PruefStand; fundstelle?: string; notiz?: string; geaendert: number }
export interface Selbstpruefung { liste: typeof PRUEF_LISTEN[number]; punkte: SelbstPunkt[] }
/**
 * Berichtshilfe (Stufe A5): COREQ (32 Punkte) und SRQR (21 Punkte) in eigener Kurzfassung (`lib/berichtshilfe.ts`, Fachblatt Berichtshilfe).
 * Gespeichert wird nur, was die Person gesetzt hat; Hinweise aus dem Projekt rechnet Statable beim Öffnen und speichert sie nie. Keine Gesamtnote.
 */
export const BERICHT_LISTEN = ['coreq', 'srqr'] as const;
export type BerichtListe = typeof BERICHT_LISTEN[number];
export const BERICHT_STAENDE = ['erfuellt', 'offen', 'nicht-zutreffend'] as const;
export type BerichtPunktStand = typeof BERICHT_STAENDE[number];
export interface BerichtPunkt { kennung: string; stand: BerichtPunktStand; fundstelle?: string; notiz?: string; geaendert: number }
export interface Berichtshilfe { liste: BerichtListe; punkte: BerichtPunkt[] }
/** feste Kennungen: coreq-01 … coreq-32, srqr-01 … srqr-21 */
export const BERICHT_KENNUNG: Record<BerichtListe, RegExp> = { coreq: /^coreq-(0[1-9]|[12][0-9]|3[0-2])$/, srqr: /^srqr-(0[1-9]|1[0-9]|2[01])$/ };
/** Ein Item-Entwurf der Instrumentenentwicklung: von der Person formuliert, Herkunft = Code oder Thema, wahlweise eine gewählte Belegstelle. */
export interface ItemEntwurf {
  id: string; text: string;
  /** fehlt, wenn Code oder Thema gelöscht wurde */
  herkunft?: { art: 'code' | 'thema'; id: string };
  beleg?: string;
  umgepolt?: boolean;
  /** Spalte im Datensatz nach der Erhebung (für Trennschärfe und Alpha ohne Item) */
  spalte?: string;
  /** in diesen Fragebogen-Plan übernommen (Plan-id, Item-id im Block) */
  plan?: { plan: string; item: string };
  erstellt: number; geaendert: number; kodierende?: string;
}

export interface QualProjekt {
  /** Fassung 2 und 3 nur, wenn neue Teile da sind (`qualFassung`, Architekturblatt Feinstruktur 5, Architekturblatt Ausbau 4) */
  format: 'statable-qualitativ'; version: 1 | 2 | 3;
  id: string;
  name: string;
  kodierende: Kodierende[];
  ich?: string;
  dokumente: Dokument[];
  codes: Code[];
  segmente: Segment[];
  kodierungen: Kodierung[];
  memos: Memo[];
  faelle: Fall[];
  variablen: Variable[];
  mengen?: Menge[];
  protokoll: Aenderung[];
  /** Merkzettel des Kodier-Arbeitsplatzes (Stufe 6b): Schnellleiste und zuletzt geöffnetes Dokument */
  arbeitsplatz?: { fest: string[]; zuletzt: string[]; offenesDokument?: string };
  /** Eigene Zusammenfassungen je Zelle der Fall-Kategorie-Matrix (Stufe 6c); `zeile` ist eine Fall-id oder `dok:<id>` */
  zusammenfassungen?: { zeile: string; code: string; text: string; geaendert: number; kodierende?: string; art?: 'code' | 'thema' }[];
  herkunft?: { art: 'neu' | 'qdpx' | 'transkript'; programm?: string; datei?: string; zeit: number };
  /** Interview-, Gedächtnis- und Beobachtungsprotokolle (Stufe F2A) */
  protokolle?: Protokoll[];
  /** Einwilligungen je Fall (Stufe F2B) */
  einwilligungen?: Einwilligung[];
  /** Feinstrukturanalysen (Stufe F3) und andere Sequenzanalysen (A4) */
  sequenzanalysen?: Sequenzanalyse[];
  /** Eigene Spaltensätze (Stufe A4); die eingebauten stehen im Code */
  spaltensaetze?: Spaltensatz[];
  /** KI-Nutzung offenlegen (Stufe A1) */
  kiNutzung?: KiNutzung;
  /** Typen der typenbildenden Inhaltsanalyse (Stufe A1) */
  typen?: Typ[];
  /** Arbeitsweise (Stufe A3): nur Voreinstellung, hebt die Fassung nicht; fehlt = 'allgemein' */
  arbeitsweise?: Arbeitsweise;
  /** Themen (Stufe A3) */
  themen?: Thema[];
  /** Einzelfall-Modus der IPA (Stufe A3) */
  einzelfall?: Einzelfall;
  /** Verknüpfung mit dem Datensatz über eine Fallvariable (Stufe A2) */
  verknuepfung?: Verknuepfung;
  /** Joint Displays (Stufe A2) */
  jointDisplays?: JointDisplay[];
  /** Design-Steckbrief (Stufe A2) */
  mmDesign?: MmDesign;
  /** Selbstprüfung MMAT und GRAMMS (Stufe A2) */
  selbstpruefung?: Selbstpruefung[];
  /** Instrumentenentwicklung: Item-Entwürfe aus Codes und Themen (Stufe A2) */
  instrument?: ItemEntwurf[];
  /** Berichtshilfe COREQ und SRQR (Stufe A5): nur von der Person gesetzte Punkte */
  berichtshilfe?: Berichtshilfe[];
  /** Felder der obersten Ebene aus einer neueren Fassung von Statable: werden nicht gelesen, aber beim Speichern wieder an ihren Platz geschrieben (Architekturblatt Feinstruktur, Abschnitt 5). */
  _unbekannt?: Record<string, unknown>;
}

/** Die Felder der obersten Ebene, die `pruefeQualProjekt` kennt. Alles andere bleibt in `_unbekannt` erhalten. */
export const BEKANNTE_FELDER: readonly string[] = ['format', 'version', 'id', 'name', 'kodierende', 'ich', 'dokumente', 'codes', 'segmente', 'kodierungen', 'memos', 'faelle', 'variablen', 'mengen', 'protokoll', 'arbeitsplatz', 'zusammenfassungen', 'herkunft', 'protokolle', 'einwilligungen', 'sequenzanalysen', 'spaltensaetze', 'kiNutzung', 'typen', 'arbeitsweise', 'themen', 'einzelfall', 'verknuepfung', 'jointDisplays', 'mmDesign', 'selbstpruefung', 'instrument', 'berichtshilfe', '_unbekannt'];

/**
 * Fassung, die beim Speichern geschrieben wird (Architekturblatt Feinstruktur 5.1): 2, sobald Protokolle, Einwilligungen, ein Transkript nach
 * Froschauer und Lueger oder eine Feldnotiz da sind; sonst 1, damit ältere Statable-Fassungen das Projekt weiter öffnen. Ältere Fassungen lehnen 2 laut ab, statt still Daten zu verlieren.
 */
export function qualFassung(q: Pick<QualProjekt, 'protokolle' | 'einwilligungen' | 'dokumente' | 'memos' | 'sequenzanalysen' | 'kiNutzung' | 'typen'> & Partial<Pick<QualProjekt, 'themen' | 'codes' | 'zusammenfassungen' | 'einzelfall' | 'verknuepfung' | 'jointDisplays' | 'mmDesign' | 'selbstpruefung' | 'instrument' | 'spaltensaetze' | 'berichtshilfe'>>): 1 | 2 | 3 {
  // Fassung 3 (Architekturblatt Ausbau 4): nur für Felder, die schon gebaut sind; `arbeitsweise` hebt die Fassung nie
  if (q.kiNutzung !== undefined || q.typen?.length) return 3;
  if (q.berichtshilfe?.length) return 3;
  if (q.verknuepfung !== undefined || q.jointDisplays?.length || q.mmDesign !== undefined || q.selbstpruefung?.length || q.instrument?.length) return 3;
  if (q.themen?.length || q.einzelfall !== undefined) return 3;
  if (q.memos.some(m => istMemoArtA3(m.art) || m.bezug.some(b => b.art === 'thema'))) return 3;
  if (q.codes?.some(c => c.phase !== undefined)) return 3;
  if (q.zusammenfassungen?.some(z => z.art !== undefined)) return 3;
  // A4: eigene Spaltensätze, ein anderer Spaltensatz oder Einträge in frei definierten Spalten
  if (q.spaltensaetze?.length) return 3;
  if (q.sequenzanalysen?.some(sa => sa.verfahren !== 'feinstruktur' || (sa.spaltensatz !== undefined && sa.spaltensatz !== 'feinstruktur') || sa.einheiten.some(e => e.weitere !== undefined))) return 3;
  if (q.protokolle?.length || q.einwilligungen?.length || q.sequenzanalysen?.length) return 2;
  if (q.dokumente.some(d => d.transkript?.regeln === 'froschauer-lueger')) return 2;
  if (q.memos.some(m => m.art !== undefined && m.art !== 'memo')) return 2;
  return 1;
}

/* ---------------------------------------------------------------------------------------------
 * Funktionen (Paket 4A). Die Typen oben bleiben unverändert.
 * ------------------------------------------------------------------------------------------- */

const neueId = (): string => globalThis.crypto.randomUUID();

/** Ein leeres qualitatives Projekt. */
export function neuesQualProjekt(name: string): QualProjekt {
  return {
    format: 'statable-qualitativ', version: 1, id: neueId(), name,
    kodierende: [], dokumente: [], codes: [], segmente: [], kodierungen: [], memos: [], faelle: [], variablen: [], protokoll: [],
    herkunft: { art: 'neu', zeit: Date.now() },
  };
}

/**
 * Ein Transkript darf geändert werden, solange es keine Segmente zu diesem Dokument gibt
 * (Fachblatt Stufe 4, "Ändern des Textes"). Sobald Segmente da sind, ist der Text gesperrt.
 */
export function textBearbeitbar(dok: Pick<Dokument, 'id'>, projekt: Pick<QualProjekt, 'segmente'>): boolean {
  return !projekt.segmente.some(s => s.dokument === dok.id);
}

/* ---- Positionen: Codepoints <-> UTF-16 (Architekturblatt, Abschnitt 2) ---- */

/** Merkt sich nur die Stellen mit Zeichen außerhalb der Grundebene (Surrogatpaare). Für Texte ohne solche Zeichen ist `astral` leer. */
export interface PositionsKarte {
  /** Codepoint-Index jedes Zeichens außerhalb der Grundebene, aufsteigend */
  astral: number[];
  /** Länge in Codepoints */
  laenge: number;
}

export function positionsKarte(text: string): PositionsKarte {
  const astral: number[] = [];
  let cp = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    if (c >= 0xD800 && c <= 0xDBFF && i + 1 < text.length) {
      const d = text.charCodeAt(i + 1);
      if (d >= 0xDC00 && d <= 0xDFFF) { astral.push(cp); i++; }
    }
    cp++;
  }
  return { astral, laenge: cp };
}

/** UTF-16-Index -> Codepoint-Index (O(log n)). Ein Index mitten in einem Surrogatpaar zählt hinter das Zeichen. */
export function utf16ZuCp(karte: PositionsKarte, u16: number): number {
  const a = karte.astral;
  let lo = 0, hi = a.length;
  // das k-te Astralzeichen (ab 0) belegt die UTF-16-Stellen a[k]+k und a[k]+k+1; es liegt ganz vor u16, wenn a[k]+k+2 <= u16
  while (lo < hi) { const m = (lo + hi) >> 1; if ((a[m] ?? 0) + m + 2 <= u16) lo = m + 1; else hi = m; }
  return u16 - lo;
}

/** Codepoint-Index -> UTF-16-Index (O(log n)). */
export function cpZuUtf16(karte: PositionsKarte, cp: number): number {
  const a = karte.astral;
  let lo = 0, hi = a.length;
  while (lo < hi) { const m = (lo + hi) >> 1; if ((a[m] ?? 0) < cp) lo = m + 1; else hi = m; }
  return cp + lo;
}

/** Länge eines Textes in Codepoints. */
export const cpLaenge = (text: string): number => positionsKarte(text).laenge;

/** `text[start, ende)` in Codepoints. */
export function cpTeil(text: string, start: number, ende: number, karte: PositionsKarte = positionsKarte(text)): string {
  return text.slice(cpZuUtf16(karte, start), cpZuUtf16(karte, ende));
}

/* ---- Prüfen beim Lesen (Projektdatei) ---- */

class Form extends Error { constructor(pfad: string, was: string) { super(`QualProjekt: ${pfad}: ${was}`); this.name = 'QualProjektFormFehler'; } }

type Obj = Record<string, unknown>;
const istObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);

function obj(v: unknown, p: string): Obj { if (!istObj(v)) throw new Form(p, 'Objekt erwartet'); return v; }
function arr(v: unknown, p: string): unknown[] { if (!Array.isArray(v)) throw new Form(p, 'Liste erwartet'); return v; }
function str(o: Obj, k: string, p: string, leerOk = false): string {
  const v = o[k]; if (typeof v !== 'string') throw new Form(`${p}.${k}`, 'Text erwartet');
  if (!leerOk && v === '') throw new Form(`${p}.${k}`, 'darf nicht leer sein');
  return v;
}
function optStr(o: Obj, k: string, p: string): string | undefined {
  const v = o[k]; if (v === undefined) return undefined;
  if (typeof v !== 'string') throw new Form(`${p}.${k}`, 'Text erwartet');
  return v;
}
function zahl(o: Obj, k: string, p: string): number {
  const v = o[k]; if (typeof v !== 'number' || !Number.isFinite(v)) throw new Form(`${p}.${k}`, 'Zahl erwartet');
  return v;
}
function ganz(o: Obj, k: string, p: string, min = 0): number {
  const v = zahl(o, k, p); if (!Number.isInteger(v) || v < min) throw new Form(`${p}.${k}`, `ganze Zahl ab ${min} erwartet`);
  return v;
}
function optGanz(o: Obj, k: string, p: string, min = 0): number | undefined {
  if (o[k] === undefined) return undefined;
  return ganz(o, k, p, min);
}
function bool(o: Obj, k: string, p: string): boolean {
  const v = o[k]; if (typeof v !== 'boolean') throw new Form(`${p}.${k}`, 'Ja/Nein erwartet');
  return v;
}
function eins<T extends string>(o: Obj, k: string, p: string, erlaubt: readonly T[]): T {
  const v = o[k];
  if (typeof v !== 'string' || !(erlaubt as readonly string[]).includes(v)) throw new Form(`${p}.${k}`, `einer von ${erlaubt.join(', ')} erwartet`);
  return v as T;
}
function optEins<T extends string>(o: Obj, k: string, p: string, erlaubt: readonly T[]): T | undefined {
  if (o[k] === undefined) return undefined;
  return eins(o, k, p, erlaubt);
}
function ohneDoppelte(ids: string[], p: string): Set<string> {
  const s = new Set<string>();
  for (const i of ids) { if (s.has(i)) throw new Form(p, `Kennung doppelt: ${i}`); s.add(i); }
  return s;
}

const DATUM = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
function datum(o: Obj, k: string, p: string): string {
  const v = str(o, k, p);
  const [j = 0, m = 1, t = 0] = v.split('-').map(Number);
  if (!DATUM.test(v) || new Date(Date.UTC(j, m - 1, t)).getUTCDate() !== t) throw new Form(`${p}.${k}`, 'Datum der Form JJJJ-MM-TT erwartet');
  return v;
}
function optDatum(o: Obj, k: string, p: string): string | undefined { return o[k] === undefined ? undefined : datum(o, k, p); }
function textListe(v: unknown, p: string): string[] { return arr(v, p).map((x, i) => { if (typeof x !== 'string') throw new Form(`${p}[${i}]`, 'Text erwartet'); return x; }); }

function leseProtokoll(v: unknown, p: string, fallIds: Set<string>, dokIds: Set<string>): Protokoll {
  const q = obj(v, p);
  const kp = `${p}.kopf`; const kq = obj(q.kopf, kp);
  const kopf: Protokoll['kopf'] = {};
  const d = optDatum(kq, 'datum', kp); if (d !== undefined) kopf.datum = d;
  const u = optStr(kq, 'uhrzeit', kp); if (u !== undefined) kopf.uhrzeit = u;
  const o2 = optStr(kq, 'ort', kp); if (o2 !== undefined) kopf.ort = o2;
  if (kq.dauerMin !== undefined) { const z = zahl(kq, 'dauerMin', kp); if (z < 0) throw new Form(`${kp}.dauerMin`, 'Zahl ab 0 erwartet'); kopf.dauerMin = z; }
  const kw = optStr(kq, 'kontaktweg', kp); if (kw !== undefined) kopf.kontaktweg = kw;
  const fq = obj(q.felder, `${p}.felder`); const felder: Record<string, string> = {};
  for (const [k, x] of Object.entries(fq)) {
    if (typeof x !== 'string') throw new Form(`${p}.felder.${k}`, 'Text erwartet');
    Object.defineProperty(felder, k, { value: x, enumerable: true, writable: true, configurable: true });
  }
  const r: Protokoll = { id: str(q, 'id', p), art: eins(q, 'art', p, ['interview', 'gedaechtnis', 'beobachtung'] as const), kopf, felder, erstellt: zahl(q, 'erstellt', p), geaendert: zahl(q, 'geaendert', p) };
  const f = optStr(q, 'fall', p); if (f !== undefined) { if (!fallIds.has(f)) throw new Form(`${p}.fall`, 'verweist auf einen unbekannten Fall'); r.fall = f; }
  const dk = optStr(q, 'dokument', p); if (dk !== undefined) { if (!dokIds.has(dk)) throw new Form(`${p}.dokument`, 'verweist auf ein unbekanntes Dokument'); r.dokument = dk; }
  const ko = optStr(q, 'kodierende', p); if (ko !== undefined) r.kodierende = ko;
  if (q.schwierigeStellen !== undefined) r.schwierigeStellen = arr(q.schwierigeStellen, `${p}.schwierigeStellen`).map((s, j) => {
    const sp = `${p}.schwierigeStellen[${j}]`; const x = obj(s, sp);
    const st: NonNullable<Protokoll['schwierigeStellen']>[number] = { text: str(x, 'text', sp, true) };
    const z = optGanz(x, 'zeitMs', sp); if (z !== undefined) st.zeitMs = z;
    const po = optGanz(x, 'position', sp); if (po !== undefined) st.position = po;
    return st;
  });
  if (q.schritte !== undefined) {
    const sp = `${p}.schritte`; const x = obj(q.schritte, sp); const sch: NonNullable<Protokoll['schritte']> = {};
    if (x.s1 !== undefined) { const y = obj(x.s1, `${sp}.s1`); sch.s1 = { text: str(y, 'text', `${sp}.s1`, true), beginn: zahl(y, 'beginn', `${sp}.s1`) }; }
    if (x.s2 !== undefined) { const y = obj(x.s2, `${sp}.s2`); sch.s2 = { text: str(y, 'text', `${sp}.s2`, true) }; const n = optStr(y, 'notizen', `${sp}.s2`); if (n !== undefined) sch.s2.notizen = n; }
    if (x.s3 !== undefined) {
      const y = obj(x.s3, `${sp}.s3`);
      sch.s3 = { abschnitte: arr(y.abschnitte, `${sp}.s3.abschnitte`).map((a, j) => { const ap = `${sp}.s3.abschnitte[${j}]`; const z = obj(a, ap); return { beobachtung: str(z, 'beobachtung', ap, true), ueberlegung: str(z, 'ueberlegung', ap, true) }; }) };
    }
    r.schritte = sch;
  }
  return r;
}

function leseEinwilligung(v: unknown, p: string, fallIds: Set<string>): Einwilligung {
  const q = obj(v, p);
  const fall = str(q, 'fall', p); if (!fallIds.has(fall)) throw new Form(`${p}.fall`, 'verweist auf einen unbekannten Fall');
  const punkte: Einwilligung['punkte'] = arr(q.punkte, `${p}.punkte`).map((x, j) => {
    const pp = `${p}.punkte[${j}]`; const y = obj(x, pp);
    const r: Einwilligung['punkte'][number] = { punkt: eins(y, 'punkt', pp, EINWILLIGUNGS_PUNKTE), stand: eins(y, 'stand', pp, EINWILLIGUNGS_STAENDE) };
    const d = optDatum(y, 'datum', pp); if (d !== undefined) r.datum = d;
    const n = optStr(y, 'notiz', pp); if (n !== undefined) r.notiz = n;
    return r;
  });
  ohneDoppelte(punkte.map(x => x.punkt), `${p}.punkte`);
  const r: Einwilligung = { id: str(q, 'id', p), fall, fassung: str(q, 'fassung', p, true), form: eins(q, 'form', p, ['schriftlich', 'muendlich-aufnahme', 'digital', 'andere'] as const), punkte, erstellt: zahl(q, 'erstellt', p), geaendert: zahl(q, 'geaendert', p) };
  if (q.widerrufe !== undefined) r.widerrufe = arr(q.widerrufe, `${p}.widerrufe`).map((x, j) => {
    const wp = `${p}.widerrufe[${j}]`; const y = obj(x, wp);
    const w: NonNullable<Einwilligung['widerrufe']>[number] = { datum: datum(y, 'datum', wp), punkte: textListe(y.punkte, `${wp}.punkte`).map((t, k) => { if (!(EINWILLIGUNGS_PUNKTE as readonly string[]).includes(t)) throw new Form(`${wp}.punkte[${k}]`, 'unbekannter Punkt'); return t as EinwilligungsPunkt; }) };
    const n = optStr(y, 'notiz', wp); if (n !== undefined) w.notiz = n;
    return w;
  });
  if (q.wiedervorlage !== undefined) r.wiedervorlage = arr(q.wiedervorlage, `${p}.wiedervorlage`).map((x, j) => {
    const wp = `${p}.wiedervorlage[${j}]`; const y = obj(x, wp);
    const w: NonNullable<Einwilligung['wiedervorlage']>[number] = { datum: datum(y, 'datum', wp), anlass: str(y, 'anlass', wp, true) };
    const e = optDatum(y, 'erledigt', wp); if (e !== undefined) w.erledigt = e;
    return w;
  });
  if (q.loeschen !== undefined) r.loeschen = arr(q.loeschen, `${p}.loeschen`).map((x, j) => {
    const lp = `${p}.loeschen[${j}]`; const y = obj(x, lp);
    const l: NonNullable<Einwilligung['loeschen']>[number] = { was: eins(y, 'was', lp, ['aufnahme', 'kontaktdaten', 'andere'] as const), bis: datum(y, 'bis', lp) };
    const e = optDatum(y, 'erledigt', lp); if (e !== undefined) l.erledigt = e;
    return l;
  });
  const z = optStr(q, 'zugriffskreis', p); if (z !== undefined) r.zugriffskreis = z;
  return r;
}

function leseEintrag(v: unknown, p: string): Eintrag {
  const q = obj(v, p);
  const e: Eintrag = { id: str(q, 'id', p), text: str(q, 'text', p, true) };
  const g = optStr(q, 'gruppe', p); if (g !== undefined) e.gruppe = g;
  const pe = optStr(q, 'person', p); if (pe !== undefined) e.person = pe;
  return e;
}

/** Liest eine Sequenzanalyse; prüft lückenlose Einheiten (Architekturblatt 2.2), `aktuelleEinheit` im Bereich, `beiEinheit` und Belege mit bekannter Einheit. */
export function leseSequenzanalyse(v: unknown, p: string, dokIds: Set<string>): Sequenzanalyse {
  const q = obj(v, p);
  const ap = `${p}.ausschnitt`; const ax = obj(q.ausschnitt, ap);
  const ausschnitt: Sequenzanalyse['ausschnitt'] = { start: ganz(ax, 'start', ap), ende: ganz(ax, 'ende', ap), text: str(ax, 'text', ap, true) };
  if (ausschnitt.ende < ausschnitt.start) throw new Form(ap, 'ende liegt vor start');
  const kx = optStr(ax, 'kontext', ap); if (kx !== undefined) ausschnitt.kontext = kx;
  const n = cpLaenge(ausschnitt.text);
  const einheiten: Sinneinheit[] = arr(q.einheiten, `${p}.einheiten`).map((x, j) => {
    const ep = `${p}.einheiten[${j}]`; const y = obj(x, ep);
    const liste = (k: string) => arr(y[k], `${ep}.${k}`).map((z, i) => leseEintrag(z, `${ep}.${k}[${i}]`));
    const e: Sinneinheit = {
      id: str(y, 'id', ep), von: ganz(y, 'von', ep), bis: ganz(y, 'bis', ep),
      paraphrase: liste('paraphrase'), intentionen: liste('intentionen'), rollen: liste('rollen'), anschluss: liste('anschluss'),
      lesarten: arr(y.lesarten, `${ep}.lesarten`).map((z, i) => {
        const lp = `${ep}.lesarten[${i}]`; const zq = obj(z, lp);
        const l: Lesart = { ...leseEintrag(z, lp), pruefung: str(zq, 'pruefung', lp, true), verlauf: arr(zq.verlauf, `${lp}.verlauf`).map((w, k) => {
          const wp = `${lp}.verlauf[${k}]`; const wq = obj(w, wp);
          return { stand: eins(wq, 'stand', wp, ['offen', 'haelt', 'verworfen'] as const), beiEinheit: str(wq, 'beiEinheit', wp), begruendung: str(wq, 'begruendung', wp, true), zeit: zahl(wq, 'zeit', wp) };
        }) };
        return l;
      }),
      gedeutet: bool(y, 'gedeutet', ep),
    };
    const u = optStr(y, 'uebernommenVon', ep); if (u !== undefined) e.uebernommenVon = u;
    if (y.weitere !== undefined) {
      const wp = `${ep}.weitere`; const w = obj(y.weitere, wp);
      const r: Record<string, Eintrag[]> = {};
      for (const k of Object.keys(w)) {
        if (!k) throw new Form(wp, 'leere Spalten-Kennung');
        const l = arr(w[k], `${wp}.${k}`).map((z, i) => leseEintrag(z, `${wp}.${k}[${i}]`));
        if (l.length) Object.defineProperty(r, k, { value: l, enumerable: true, writable: true, configurable: true });
      }
      if (Object.keys(r).length) e.weitere = r;
    }
    return e;
  });
  if (!einheiten.length) throw new Form(`${p}.einheiten`, 'mindestens eine Sinneinheit erwartet');
  einheiten.forEach((e, j) => {
    const ep = `${p}.einheiten[${j}]`;
    if (e.bis <= e.von) throw new Form(ep, 'bis muss nach von liegen');
    if (j === 0 && e.von !== 0) throw new Form(ep, 'die erste Sinneinheit muss bei 0 beginnen (Lücke am Anfang)');
    if (j > 0 && e.von !== einheiten[j - 1]!.bis) throw new Form(ep, e.von > einheiten[j - 1]!.bis ? 'Lücke zur vorigen Sinneinheit' : 'überlappt die vorige Sinneinheit');
    if (j === einheiten.length - 1 && e.bis !== n) throw new Form(ep, 'die letzte Sinneinheit muss am Ende des Ausschnitts enden');
  });
  const eIds = ohneDoppelte(einheiten.map(e => e.id), `${p}.einheiten`);
  einheiten.forEach((e, j) => e.lesarten.forEach((l, i) => l.verlauf.forEach((w, k) => {
    if (!eIds.has(w.beiEinheit)) throw new Form(`${p}.einheiten[${j}].lesarten[${i}].verlauf[${k}].beiEinheit`, 'verweist auf eine unbekannte Sinneinheit');
  })));
  const aktuelleEinheit = ganz(q, 'aktuelleEinheit', p);
  if (aktuelleEinheit >= einheiten.length) throw new Form(`${p}.aktuelleEinheit`, `liegt außerhalb der Sinneinheiten (0 bis ${einheiten.length - 1})`);
  const r: Sequenzanalyse = {
    id: str(q, 'id', p), name: str(q, 'name', p, true), verfahren: eins(q, 'verfahren', p, ['feinstruktur', 'sequenz'] as const), ausschnitt,
    forschungsfrage: str(q, 'forschungsfrage', p, true), grenzenGesperrt: bool(q, 'grenzenGesperrt', p), vorauslesenErlaubt: bool(q, 'vorauslesenErlaubt', p),
    aktuelleEinheit, einheiten,
    reflexionen: arr(q.reflexionen, `${p}.reflexionen`).map((x, j) => {
      const rp = `${p}.reflexionen[${j}]`; const y = obj(x, rp);
      const nach = str(y, 'nachEinheit', rp); if (!eIds.has(nach)) throw new Form(`${rp}.nachEinheit`, 'verweist auf eine unbekannte Sinneinheit');
      return { id: str(y, 'id', rp), nachEinheit: nach, begriffe: str(y, 'begriffe', rp, true), bisher: str(y, 'bisher', rp, true), pruefen: str(y, 'pruefen', rp, true), zeit: zahl(y, 'zeit', rp) };
    }),
    erstellt: zahl(q, 'erstellt', p), geaendert: zahl(q, 'geaendert', p),
  };
  const sp = optStr(q, 'spaltensatz', p); if (sp !== undefined) r.spaltensatz = sp;
  const dk = optStr(q, 'dokument', p); if (dk !== undefined) { if (!dokIds.has(dk)) throw new Form(`${p}.dokument`, 'verweist auf ein unbekanntes Dokument'); r.dokument = dk; }
  if (q.gruppe !== undefined) { const gp = `${p}.gruppe`; const g = obj(q.gruppe, gp); r.gruppe = { name: str(g, 'name', gp, true) }; if (g.mitglieder !== undefined) r.gruppe.mitglieder = textListe(g.mitglieder, `${gp}.mitglieder`); }
  const ra = optGanz(q, 'reflexionAlle', p, 1); if (ra !== undefined) r.reflexionAlle = ra;
  const ph = optEins(q, 'phase', p, ['einteilen', 'deuten'] as const); if (ph !== undefined) r.phase = ph;
  if (q.fazit !== undefined) {
    const fp = `${p}.fazit`; const f = obj(q.fazit, fp);
    r.fazit = {
      muster: arr(f.muster, `${fp}.muster`).map((x, j) => {
        const mp = `${fp}.muster[${j}]`; const y = obj(x, mp);
        return { id: str(y, 'id', mp), text: str(y, 'text', mp, true), belege: arr(y.belege, `${mp}.belege`).map((b, k) => {
          const bp = `${mp}.belege[${k}]`; const z = obj(b, bp); const ein = str(z, 'einheit', bp);
          if (!eIds.has(ein)) throw new Form(`${bp}.einheit`, 'verweist auf eine unbekannte Sinneinheit');
          return { einheit: ein, zitat: str(z, 'zitat', bp, true) };
        }) };
      }),
      bezugForschungsfrage: str(f, 'bezugForschungsfrage', fp, true), geaendert: zahl(f, 'geaendert', fp),
    };
    const t = optStr(f, 'text', fp); if (t !== undefined) r.fazit.text = t;
  }
  const se = optStr(q, 'schluesselentscheidungen', p); if (se !== undefined) r.schluesselentscheidungen = se;
  if (q.herkunft !== undefined) {
    const hp = `${p}.herkunft`; const h = obj(q.herkunft, hp);
    r.herkunft = { art: eins(h, 'art', hp, ['neu', 'zusammengefuehrt', 'eingelesen'] as const), zeit: zahl(h, 'zeit', hp) };
    if (h.quellen !== undefined) r.herkunft.quellen = textListe(h.quellen, `${hp}.quellen`);
  }
  const ko = optStr(q, 'kodierende', p); if (ko !== undefined) r.kodierende = ko;
  return r;
}

/** Liest die Themen (Stufe A3). Tote Verweise (gelöschte Codes, Segmente, Fälle, Themen) fallen still weg, damit Löschen ein Projekt nie unlesbar macht. */
/** Ein Text `{ de, en, … }` (Spaltensatz). */
function leseSpaltenText(v: unknown, p: string, leerOk = false): SpaltenText {
  const q = obj(v, p);
  const r: SpaltenText = { de: str(q, 'de', p, leerOk), en: str(q, 'en', p, leerOk) };
  for (const k of Object.keys(q)) if (k !== 'de' && k !== 'en') { const t = optStr(q, k, p); if (t !== undefined) Object.defineProperty(r, k, { value: t, enumerable: true, writable: true, configurable: true }); }
  return r;
}

/**
 * Ein eigener Spaltensatz (A4, Architekturblatt Ausbau 1). Spalten nur an `weitere` oder (höchstens eine) an `lesarten`; Kennung nicht wie ein
 * eingebauter Satz; Spalten-Kennungen verschieden; 1 bis `HOECHSTENS_SPALTEN` Spalten.
 */
export function leseSpaltensatz(v: unknown, p: string): Spaltensatz {
  const q = obj(v, p);
  const kennung = str(q, 'kennung', p);
  if (EINGEBAUT.has(kennung)) throw new Form(`${p}.kennung`, 'Kennung eines eingebauten Spaltensatzes');
  if (q.eigen !== true) throw new Form(`${p}.eigen`, 'nur eigene Spaltensätze stehen im Projekt');
  const spalten: Spalte[] = arr(q.spalten, `${p}.spalten`).map((x, j) => {
    const sp = `${p}.spalten[${j}]`; const y = obj(x, sp);
    const s: Spalte = {
      kennung: str(y, 'kennung', sp), feld: eins(y, 'feld', sp, ['weitere', 'lesarten'] as const),
      name: leseSpaltenText(y.name, `${sp}.name`), worum: leseSpaltenText(y.worum, `${sp}.worum`, true),
      leitfragen: arr(y.leitfragen, `${sp}.leitfragen`).map((z, k) => leseSpaltenText(z, `${sp}.leitfragen[${k}]`)),
      eintragName: leseSpaltenText(y.eintragName, `${sp}.eintragName`),
    };
    if (y.mitPruefung !== undefined) { if (bool(y, 'mitPruefung', sp)) s.mitPruefung = true; }
    if (s.mitPruefung && s.feld !== 'lesarten') throw new Form(`${sp}.mitPruefung`, 'Prüfkriterium nur bei Lesarten');
    return s;
  });
  if (!spalten.length || spalten.length > HOECHSTENS_SPALTEN) throw new Form(`${p}.spalten`, `1 bis ${HOECHSTENS_SPALTEN} Spalten erwartet`);
  ohneDoppelte(spalten.map(s => s.kennung), `${p}.spalten`);
  if (spalten.filter(s => s.feld === 'lesarten').length > 1) throw new Form(`${p}.spalten`, 'höchstens eine Spalte mit Lesarten');
  return { kennung, name: leseSpaltenText(q.name, `${p}.name`), verfahren: leseSpaltenText(q.verfahren, `${p}.verfahren`), spalten, eigen: true };
}

function leseThemen(v: unknown, codeIds: Set<string>, segIds: Set<string>, fallIds: Set<string>): Thema[] {
  const roh = arr(v, 'projekt.themen').map((x, i) => {
    const p = `projekt.themen[${i}]`; const q = obj(x, p);
    const ids = (n: string, erlaubt: Set<string>): string[] => [...new Set(textListe(q[n], `${p}.${n}`).filter(y => erlaubt.has(y)))];
    const t: Thema = {
      id: str(q, 'id', p), name: str(q, 'name', p, true), codes: ids('codes', codeIds), stand: eins(q, 'stand', p, THEMA_STAENDE),
      verlauf: arr(q.verlauf, `${p}.verlauf`).map((s, j) => {
        const sp = `${p}.verlauf[${j}]`; const y = obj(s, sp);
        const w: ThemaSchritt = { zeit: zahl(y, 'zeit', sp), was: eins(y, 'was', sp, THEMA_SCHRITTE) };
        const k = optStr(y, 'kodierende', sp); if (k !== undefined) w.kodierende = k;
        const vo = optStr(y, 'vorher', sp); if (vo !== undefined) w.vorher = vo;
        const na = optStr(y, 'nachher', sp); if (na !== undefined) w.nachher = na;
        const no = optStr(y, 'notiz', sp); if (no !== undefined) w.notiz = no;
        return w;
      }),
      reihenfolge: zahl(q, 'reihenfolge', p), erstellt: zahl(q, 'erstellt', p), geaendert: zahl(q, 'geaendert', p),
    };
    const ko = optStr(q, 'konzept', p); if (ko !== undefined) t.konzept = ko;
    const be = optStr(q, 'beschreibung', p); if (be !== undefined) t.beschreibung = be;
    if (q.belege !== undefined) t.belege = ids('belege', segIds);
    const el = optStr(q, 'elternId', p); if (el !== undefined) t.elternId = el;
    const fa = optStr(q, 'fall', p); if (fa !== undefined && fallIds.has(fa)) t.fall = fa;
    if (q.aus !== undefined) t.aus = textListe(q.aus, `${p}.aus`);
    const kd = optStr(q, 'kodierende', p); if (kd !== undefined) t.kodierende = kd;
    return t;
  });
  const tIds = ohneDoppelte(roh.map(t => t.id), 'projekt.themen');
  const oben = new Set(roh.filter(t => t.elternId === undefined).map(t => t.id));
  for (const t of roh) {
    // nur eine Ebene: ein Unterthema hängt an einem Thema ohne Eltern; sonst fällt der Verweis weg
    if (t.elternId !== undefined && (!oben.has(t.elternId) || t.elternId === t.id)) delete t.elternId;
    if (t.aus) t.aus = [...new Set(t.aus.filter(a => tIds.has(a) && a !== t.id))];
  }
  return roh;
}

/** Eine Textabbildung (Schlüssel → Text) lesen; Nicht-Text-Werte sind ein Formfehler, `__proto__` bleibt nur ein Schlüssel. */
function textAbbildung(v: unknown, p: string): Record<string, string> {
  const o = obj(v, p), r: Record<string, string> = {};
  for (const [k, x] of Object.entries(o)) {
    if (typeof x !== 'string') throw new Form(`${p}.${k}`, 'Text erwartet');
    Object.defineProperty(r, k, { value: x, enumerable: true, writable: true, configurable: true });
  }
  return r;
}

/**
 * Mixed-Methods-Felder (Stufe A2). Tote Verweise (gelöschte Variablen, Codes, Themen, Segmente) fallen still weg, wie bei `typen` und `themen`:
 * Löschen macht ein Projekt nie unlesbar. Eine Verknüpfung mit gelöschter Variable fällt ganz weg (Person verknüpft neu).
 */
function leseMixed(o: Obj, r: QualProjekt, ids: { variablen: Set<string>; codes: Set<string>; themen: Set<string>; segmente: Set<string> }): void {
  if (o.verknuepfung !== undefined) {
    const p = 'projekt.verknuepfung'; const x = obj(o.verknuepfung, p);
    const v: Verknuepfung = { variable: str(x, 'variable', p), spalte: str(x, 'spalte', p), geaendert: zahl(x, 'geaendert', p) };
    const k = optStr(x, 'kodierende', p); if (k !== undefined) v.kodierende = k;
    if (ids.variablen.has(v.variable)) r.verknuepfung = v;
  }
  const qualDa = (art: string, id: string) => (art === 'code' ? ids.codes.has(id) : art === 'thema' ? ids.themen.has(id) : false);
  if (o.jointDisplays !== undefined) {
    r.jointDisplays = arr(o.jointDisplays, 'projekt.jointDisplays').map((v, i) => {
      const p = `projekt.jointDisplays[${i}]`; const x = obj(v, p);
      const zeilen: JdZeile[] = [];
      for (const [j, z] of arr(x.zeilen, `${p}.zeilen`).entries()) {
        const zp = `${p}.zeilen[${j}]`; const y = obj(z, zp);
        const e: JdZeile = { art: eins(y, 'art', zp, ['code', 'thema'] as const), id: str(y, 'id', zp) };
        if (qualDa(e.art, e.id) && !zeilen.some(w => w.art === e.art && w.id === e.id)) zeilen.push(e);
      }
      const passungRoh = x.passung === undefined ? {} : textAbbildung(x.passung, `${p}.passung`);
      const passung: Record<string, JdPassung> = {};
      for (const [k, w] of Object.entries(passungRoh)) if ((JD_PASSUNGEN as readonly string[]).includes(w)) Object.defineProperty(passung, k, { value: w, enumerable: true, writable: true, configurable: true });
      const jd: JointDisplay = {
        id: str(x, 'id', p), name: str(x, 'name', p, true), art: eins(x, 'art', p, JD_ARTEN), zeilen,
        spalten: [...new Set(textListe(x.spalten ?? [], `${p}.spalten`))],
        belege: arr(x.belege ?? [], `${p}.belege`).map((b, j) => {
          const bp = `${p}.belege[${j}]`; const y = obj(b, bp);
          return { zeile: str(y, 'zeile', bp), gruppe: str(y, 'gruppe', bp, true), segment: str(y, 'segment', bp) };
        }).filter(b => ids.segmente.has(b.segment)),
        passung, metaInferenz: x.metaInferenz === undefined ? {} : textAbbildung(x.metaInferenz, `${p}.metaInferenz`),
        erstellt: zahl(x, 'erstellt', p), geaendert: zahl(x, 'geaendert', p),
      };
      if (x.zahlen !== undefined) jd.zahlen = textAbbildung(x.zahlen, `${p}.zahlen`);
      const k = optStr(x, 'kodierende', p); if (k !== undefined) jd.kodierende = k;
      if (x.gruppierung !== undefined) {
        const gp = `${p}.gruppierung`; const g = obj(x.gruppierung, gp);
        const quelle = eins(g, 'quelle', gp, ['variable', 'typen', 'spalte', 'code', 'thema'] as const);
        if (quelle === 'typen') jd.gruppierung = { quelle };
        else if (quelle === 'spalte') jd.gruppierung = { quelle, name: str(g, 'name', gp) };
        else {
          const id = str(g, 'id', gp);
          if (quelle === 'variable' ? ids.variablen.has(id) : qualDa(quelle, id)) jd.gruppierung = { quelle, id } as JdGruppierung;
        }
      }
      return jd;
    });
    ohneDoppelte(r.jointDisplays.map(j => j.id), 'projekt.jointDisplays');
  }
  if (o.mmDesign !== undefined) {
    const p = 'projekt.mmDesign'; const x = obj(o.mmDesign, p);
    const liste = <T extends string>(n: string, erlaubt: readonly T[]): T[] => [...new Set(textListe(x[n] ?? [], `${p}.${n}`).filter((y): y is T => (erlaubt as readonly string[]).includes(y)))];
    const d: MmDesign = { zwecke: liste('zwecke', MM_ZWECKE), integration: liste('integration', MM_INTEGRATION), geaendert: zahl(x, 'geaendert', p) };
    const re = optEins(x, 'reihenfolge', p, MM_REIHENFOLGEN); if (re !== undefined) d.reihenfolge = re;
    const ge = optEins(x, 'gewicht', p, MM_GEWICHTE); if (ge !== undefined) d.gewicht = ge;
    const be = optStr(x, 'beschreibung', p); if (be !== undefined) d.beschreibung = be;
    const k = optStr(x, 'kodierende', p); if (k !== undefined) d.kodierende = k;
    r.mmDesign = d;
  }
  if (o.selbstpruefung !== undefined) {
    r.selbstpruefung = arr(o.selbstpruefung, 'projekt.selbstpruefung').map((v, i) => {
      const p = `projekt.selbstpruefung[${i}]`; const x = obj(v, p);
      const punkte: SelbstPunkt[] = arr(x.punkte, `${p}.punkte`).map((w, j) => {
        const pp = `${p}.punkte[${j}]`; const y = obj(w, pp);
        const s: SelbstPunkt = { kennung: str(y, 'kennung', pp), stand: eins(y, 'stand', pp, PRUEF_STAENDE), geaendert: zahl(y, 'geaendert', pp) };
        const f = optStr(y, 'fundstelle', pp); if (f !== undefined) s.fundstelle = f;
        const n = optStr(y, 'notiz', pp); if (n !== undefined) s.notiz = n;
        return s;
      });
      ohneDoppelte(punkte.map(x => x.kennung), `${p}.punkte`);
      return { liste: eins(x, 'liste', p, PRUEF_LISTEN), punkte };
    });
    ohneDoppelte(r.selbstpruefung.map(x => x.liste), 'projekt.selbstpruefung');
  }
  if (o.berichtshilfe !== undefined) {
    r.berichtshilfe = arr(o.berichtshilfe, 'projekt.berichtshilfe').map((v, i) => {
      const p = `projekt.berichtshilfe[${i}]`; const x = obj(v, p);
      const liste = eins(x, 'liste', p, BERICHT_LISTEN);
      const punkte: BerichtPunkt[] = arr(x.punkte, `${p}.punkte`).map((w, j) => {
        const pp = `${p}.punkte[${j}]`; const y = obj(w, pp);
        const kennung = str(y, 'kennung', pp);
        if (!BERICHT_KENNUNG[liste].test(kennung)) throw new Form(`${pp}.kennung`, `unbekannter Punkt der Liste ${liste}`);
        const s: BerichtPunkt = { kennung, stand: eins(y, 'stand', pp, BERICHT_STAENDE), geaendert: zahl(y, 'geaendert', pp) };
        const f = optStr(y, 'fundstelle', pp); if (f !== undefined) s.fundstelle = f;
        const n = optStr(y, 'notiz', pp); if (n !== undefined) s.notiz = n;
        return s;
      });
      ohneDoppelte(punkte.map(x => x.kennung), `${p}.punkte`);
      return { liste, punkte };
    });
    ohneDoppelte(r.berichtshilfe.map(x => x.liste), 'projekt.berichtshilfe');
  }
  if (o.instrument !== undefined) {
    r.instrument = arr(o.instrument, 'projekt.instrument').map((v, i) => {
      const p = `projekt.instrument[${i}]`; const x = obj(v, p);
      const it: ItemEntwurf = { id: str(x, 'id', p), text: str(x, 'text', p, true), erstellt: zahl(x, 'erstellt', p), geaendert: zahl(x, 'geaendert', p) };
      if (x.herkunft !== undefined) {
        const hp = `${p}.herkunft`; const h = obj(x.herkunft, hp);
        const art = eins(h, 'art', hp, ['code', 'thema'] as const), id = str(h, 'id', hp);
        if (qualDa(art, id)) it.herkunft = { art, id };
      }
      const b = optStr(x, 'beleg', p); if (b !== undefined && ids.segmente.has(b)) it.beleg = b;
      if (x.umgepolt !== undefined) it.umgepolt = bool(x, 'umgepolt', p);
      const sp = optStr(x, 'spalte', p); if (sp !== undefined) it.spalte = sp;
      if (x.plan !== undefined) { const pp = `${p}.plan`; const y = obj(x.plan, pp); it.plan = { plan: str(y, 'plan', pp), item: str(y, 'item', pp) }; }
      const k = optStr(x, 'kodierende', p); if (k !== undefined) it.kodierende = k;
      return it;
    });
    ohneDoppelte(r.instrument.map(x => x.id), 'projekt.instrument');
  }
}

/**
 * Prüft ein aus JSON gelesenes Projekt Feld für Feld und gibt es in der Form `QualProjekt` zurück (neue Objekte, unbekannte Felder fallen weg).
 * Wirft bei falscher Form. Fehlt bei einem Dokument das Feld `text` (die Projektdatei legt den Text in `qualitativ/quellen/<id>.txt` ab),
 * wird er als leerer Text gesetzt; der Aufrufer füllt ihn danach.
 */
export function pruefeQualProjekt(json: unknown): QualProjekt {
  const o = obj(json, 'projekt');
  if (o.format !== 'statable-qualitativ') throw new Form('projekt.format', 'unbekanntes Format');
  if (o.version !== 1 && o.version !== 2 && o.version !== 3) throw new Form('projekt.version', 'unbekannte Fassung');

  const kodierende: Kodierende[] = arr(o.kodierende, 'kodierende').map((v, i) => {
    const p = `kodierende[${i}]`; const q = obj(v, p);
    return { id: str(q, 'id', p), name: str(q, 'name', p, true) };
  });
  ohneDoppelte(kodierende.map(k => k.id), 'kodierende');

  const faelle: Fall[] = arr(o.faelle, 'faelle').map((v, i) => {
    const p = `faelle[${i}]`; const q = obj(v, p); const w = obj(q.werte, `${p}.werte`);
    const werte: Fall['werte'] = {};
    for (const [k, x] of Object.entries(w)) {
      if (x !== null && typeof x !== 'string' && typeof x !== 'boolean' && !(typeof x === 'number' && Number.isFinite(x))) throw new Form(`${p}.werte.${k}`, 'Text, Zahl, Ja/Nein oder leer erwartet');
      Object.defineProperty(werte, k, { value: x, enumerable: true, writable: true, configurable: true });   // auch "__proto__" bleibt nur ein Schlüssel
    }
    return { id: str(q, 'id', p), name: str(q, 'name', p, true), werte };
  });
  const fallIds = ohneDoppelte(faelle.map(f => f.id), 'faelle');

  const variablen: Variable[] = arr(o.variablen, 'variablen').map((v, i) => {
    const p = `variablen[${i}]`; const q = obj(v, p);
    const r: Variable = { id: str(q, 'id', p), name: str(q, 'name', p), typ: eins(q, 'typ', p, ['text', 'ja/nein', 'ganzzahl', 'zahl', 'datum', 'datumzeit'] as const) };
    const b = optStr(q, 'beschreibung', p); if (b !== undefined) r.beschreibung = b;
    return r;
  });
  ohneDoppelte(variablen.map(f => f.id), 'variablen');

  const dokumente: Dokument[] = arr(o.dokumente, 'dokumente').map((v, i) => {
    const p = `dokumente[${i}]`; const q = obj(v, p);
    const d: Dokument = {
      id: str(q, 'id', p), name: str(q, 'name', p, true), art: eins(q, 'art', p, ['text', 'pdftext', 'audio', 'video'] as const),
      text: q.text === undefined ? '' : str(q, 'text', p, true),
      erstellt: zahl(q, 'erstellt', p), geaendert: zahl(q, 'geaendert', p),
    };
    const sprache = optStr(q, 'sprache', p); if (sprache !== undefined) d.sprache = sprache;
    const kod = optStr(q, 'kodierende', p); if (kod !== undefined) d.kodierende = kod;
    const fall = optStr(q, 'fall', p);
    if (fall !== undefined) { if (!fallIds.has(fall)) throw new Form(`${p}.fall`, 'verweist auf einen unbekannten Fall'); d.fall = fall; }
    if (q.datei !== undefined) {
      const x = obj(q.datei, `${p}.datei`);
      d.datei = { name: str(x, 'name', `${p}.datei`, true), sha256: str(x, 'sha256', `${p}.datei`, true) };
    }
    if (q.medium !== undefined) {
      const x = obj(q.medium, `${p}.medium`);
      d.medium = { datei: str(x, 'datei', `${p}.medium`, true), typ: str(x, 'typ', `${p}.medium`, true), groesse: ganz(x, 'groesse', `${p}.medium`), sha256: str(x, 'sha256', `${p}.medium`, true) };
    }
    if (q.transkript !== undefined) {
      const tp = `${p}.transkript`; const t = obj(q.transkript, tp);
      const sprecher: TranskriptSprecher[] = arr(t.sprecher, `${tp}.sprecher`).map((s, j) => {
        const sp = `${tp}.sprecher[${j}]`; const x = obj(s, sp);
        const r: TranskriptSprecher = { id: str(x, 'id', sp), name: str(x, 'name', sp, true) };
        const rolle = optEins(x, 'rolle', sp, ['interview', 'befragt', 'andere'] as const); if (rolle) r.rolle = rolle;
        const f = optStr(x, 'fall', sp);
        if (f !== undefined) { if (!fallIds.has(f)) throw new Form(`${sp}.fall`, 'verweist auf einen unbekannten Fall'); r.fall = f; }
        return r;
      });
      const sIds = ohneDoppelte(sprecher.map(s => s.id), `${tp}.sprecher`);
      const laenge = d.text === '' ? Infinity : cpLaenge(d.text);
      const abschnitte: TranskriptAbschnitt[] = arr(t.abschnitte, `${tp}.abschnitte`).map((s, j) => {
        const ap = `${tp}.abschnitte[${j}]`; const x = obj(s, ap);
        const a: TranskriptAbschnitt = { start: ganz(x, 'start', ap), ende: ganz(x, 'ende', ap) };
        if (a.ende < a.start) throw new Form(ap, 'ende liegt vor start');
        if (a.ende > laenge) throw new Form(ap, 'zeigt hinter das Ende des Textes');
        const sid = optStr(x, 'sprecher', ap);
        if (sid !== undefined) { if (!sIds.has(sid)) throw new Form(`${ap}.sprecher`, 'verweist auf einen unbekannten Sprecher'); a.sprecher = sid; }
        const z = optGanz(x, 'zeitMs', ap); if (z !== undefined) a.zeitMs = z;
        const b = optGanz(x, 'bisMs', ap); if (b !== undefined) a.bisMs = b;
        return a;
      });
      d.transkript = { sprecher, abschnitte };
      const regeln = optEins(t, 'regeln', tp, ['einfach', 'erweitert', 'froschauer-lueger'] as const); if (regeln) d.transkript.regeln = regeln;
      const quelle = optStr(t, 'quelle', tp); if (quelle !== undefined) d.transkript.quelle = quelle;
    }
    return d;
  });
  const dokIds = ohneDoppelte(dokumente.map(d => d.id), 'dokumente');

  const codes: Code[] = arr(o.codes, 'codes').map((v, i) => {
    const p = `codes[${i}]`; const q = obj(v, p);
    const c: Code = { id: str(q, 'id', p), name: str(q, 'name', p, true), kodierbar: bool(q, 'kodierbar', p), reihenfolge: zahl(q, 'reihenfolge', p) };
    const e = optStr(q, 'elternId', p); if (e !== undefined) c.elternId = e;
    const f = optStr(q, 'farbe', p);
    if (f !== undefined) { if (!/^#[0-9a-fA-F]{6}$/.test(f)) throw new Form(`${p}.farbe`, 'Farbe der Form #rrggbb erwartet'); c.farbe = f; }
    const de = optStr(q, 'definition', p); if (de !== undefined) c.definition = de;
    const ph = optEins(q, 'phase', p, KODIER_PHASEN); if (ph !== undefined) c.phase = ph;
    const re = optStr(q, 'regel', p); if (re !== undefined) c.regel = re;
    if (q.anker !== undefined) {
      c.anker = arr(q.anker, `${p}.anker`).map((a, j) => {
        const ap = `${p}.anker[${j}]`; const x = obj(a, ap);
        const r: { segment?: string; text: string } = { text: str(x, 'text', ap, true) };
        const sg = optStr(x, 'segment', ap); if (sg !== undefined) r.segment = sg;
        return r;
      });
    }
    return c;
  });
  const codeIds = ohneDoppelte(codes.map(c => c.id), 'codes');
  for (const c of codes) if (c.elternId !== undefined && !codeIds.has(c.elternId)) throw new Form(`codes.${c.id}.elternId`, 'verweist auf einen unbekannten Code');

  const segmente: Segment[] = arr(o.segmente, 'segmente').map((v, i) => {
    const p = `segmente[${i}]`; const q = obj(v, p);
    const s: Segment = { id: str(q, 'id', p), dokument: str(q, 'dokument', p), start: ganz(q, 'start', p), ende: ganz(q, 'ende', p), erstellt: zahl(q, 'erstellt', p) };
    if (s.ende < s.start) throw new Form(p, 'ende liegt vor start');
    if (!dokIds.has(s.dokument)) throw new Form(`${p}.dokument`, 'verweist auf ein unbekanntes Dokument');
    const k = optStr(q, 'kodierende', p); if (k !== undefined) s.kodierende = k;
    return s;
  });
  const segIds = ohneDoppelte(segmente.map(s => s.id), 'segmente');

  const kodierungen: Kodierung[] = arr(o.kodierungen, 'kodierungen').map((v, i) => {
    const p = `kodierungen[${i}]`; const q = obj(v, p);
    const k: Kodierung = { id: str(q, 'id', p), segment: str(q, 'segment', p), code: str(q, 'code', p), kodierende: str(q, 'kodierende', p, true), erstellt: zahl(q, 'erstellt', p) };
    if (!segIds.has(k.segment)) throw new Form(`${p}.segment`, 'verweist auf ein unbekanntes Segment');
    if (!codeIds.has(k.code)) throw new Form(`${p}.code`, 'verweist auf einen unbekannten Code');
    const st = optGanz(q, 'stufe', p); if (st !== undefined) k.stufe = st;
    return k;
  });

  const memos: Memo[] = arr(o.memos, 'memos').map((v, i) => {
    const p = `memos[${i}]`; const q = obj(v, p);
    const m: Memo = {
      id: str(q, 'id', p), text: str(q, 'text', p, true), erstellt: zahl(q, 'erstellt', p),
      bezug: arr(q.bezug, `${p}.bezug`).map((b, j) => {
        const bp = `${p}.bezug[${j}]`; const x = obj(b, bp);
        const r: Memo['bezug'][number] = { art: eins(x, 'art', bp, MEMO_BEZUG_ARTEN) };
        const id = optStr(x, 'id', bp); if (id !== undefined) r.id = id;
        return r;
      }),
    };
    const t = optStr(q, 'titel', p); if (t !== undefined) m.titel = t;
    const k = optStr(q, 'kodierende', p); if (k !== undefined) m.kodierende = k;
    const ma = optEins(q, 'art', p, MEMO_ARTEN); if (ma !== undefined) m.art = ma;
    return m;
  });

  let mengen: Menge[] | undefined;
  if (o.mengen !== undefined) {
    mengen = arr(o.mengen, 'mengen').map((v, i) => {
      const p = `mengen[${i}]`; const q = obj(v, p);
      return {
        id: str(q, 'id', p), name: str(q, 'name', p, true), art: eins(q, 'art', p, ['dokumente', 'codes'] as const),
        mitglieder: arr(q.mitglieder, `${p}.mitglieder`).map((m, j) => { if (typeof m !== 'string') throw new Form(`${p}.mitglieder[${j}]`, 'Text erwartet'); return m; }),
      };
    });
  }

  const protokoll: Aenderung[] = arr(o.protokoll, 'protokoll').map((v, i) => {
    const p = `protokoll[${i}]`; const q = obj(v, p);
    const a: Aenderung = { zeit: zahl(q, 'zeit', p), was: str(q, 'was', p, true) };
    const k = optStr(q, 'kodierende', p); if (k !== undefined) a.kodierende = k;
    if ('vorher' in q) a.vorher = q.vorher;
    if ('nachher' in q) a.nachher = q.nachher;
    return a;
  });

  const r: QualProjekt = { format: 'statable-qualitativ', version: 1, id: str(o, 'id', 'projekt'), name: str(o, 'name', 'projekt', true), kodierende, dokumente, codes, segmente, kodierungen, memos, faelle, variablen, protokoll };
  if (mengen) r.mengen = mengen;
  const ich = optStr(o, 'ich', 'projekt'); if (ich !== undefined) r.ich = ich;
  if (o.arbeitsplatz !== undefined) {
    const a = obj(o.arbeitsplatz, 'projekt.arbeitsplatz');
    const liste = (n: string): string[] => arr(a[n], `projekt.arbeitsplatz.${n}`).map((x, i) => { if (typeof x !== 'string') throw new Form(`projekt.arbeitsplatz.${n}[${i}]`, 'Text erwartet'); return x; });
    r.arbeitsplatz = { fest: liste('fest'), zuletzt: liste('zuletzt') };
    const od = optStr(a, 'offenesDokument', 'projekt.arbeitsplatz'); if (od !== undefined) r.arbeitsplatz.offenesDokument = od;
  }
  if (o.zusammenfassungen !== undefined) {
    r.zusammenfassungen = arr(o.zusammenfassungen, 'projekt.zusammenfassungen').map((v, i) => {
      const p = `projekt.zusammenfassungen[${i}]`; const q = obj(v, p);
      const z: NonNullable<QualProjekt['zusammenfassungen']>[number] = { zeile: str(q, 'zeile', p), code: str(q, 'code', p), text: str(q, 'text', p, true), geaendert: zahl(q, 'geaendert', p) };
      const k = optStr(q, 'kodierende', p); if (k !== undefined) z.kodierende = k;
      const za = optEins(q, 'art', p, ['code', 'thema'] as const); if (za !== undefined) z.art = za;
      return z;
    });
  }
  if (o.herkunft !== undefined) {
    const h = obj(o.herkunft, 'projekt.herkunft');
    r.herkunft = { art: eins(h, 'art', 'projekt.herkunft', ['neu', 'qdpx', 'transkript'] as const), zeit: zahl(h, 'zeit', 'projekt.herkunft') };
    const pr = optStr(h, 'programm', 'projekt.herkunft'); if (pr !== undefined) r.herkunft.programm = pr;
    const da = optStr(h, 'datei', 'projekt.herkunft'); if (da !== undefined) r.herkunft.datei = da;
  }
  if (o.protokolle !== undefined) r.protokolle = arr(o.protokolle, 'projekt.protokolle').map((v, i) => leseProtokoll(v, `projekt.protokolle[${i}]`, fallIds, dokIds));
  if (r.protokolle) ohneDoppelte(r.protokolle.map(x => x.id), 'projekt.protokolle');
  if (o.einwilligungen !== undefined) r.einwilligungen = arr(o.einwilligungen, 'projekt.einwilligungen').map((v, i) => leseEinwilligung(v, `projekt.einwilligungen[${i}]`, fallIds));
  if (r.einwilligungen) ohneDoppelte(r.einwilligungen.map(x => x.id), 'projekt.einwilligungen');
  if (o.sequenzanalysen !== undefined) r.sequenzanalysen = arr(o.sequenzanalysen, 'projekt.sequenzanalysen').map((v, i) => leseSequenzanalyse(v, `projekt.sequenzanalysen[${i}]`, dokIds));
  if (r.sequenzanalysen) ohneDoppelte(r.sequenzanalysen.map(x => x.id), 'projekt.sequenzanalysen');
  if (o.spaltensaetze !== undefined) {
    r.spaltensaetze = arr(o.spaltensaetze, 'projekt.spaltensaetze').map((v, i) => leseSpaltensatz(v, `projekt.spaltensaetze[${i}]`));
    ohneDoppelte(r.spaltensaetze.map(x => x.kennung), 'projekt.spaltensaetze');
    if (!r.spaltensaetze.length) delete r.spaltensaetze;
  }
  if (o.kiNutzung !== undefined) {
    const p = 'projekt.kiNutzung'; const x = obj(o.kiNutzung, p);
    const zwecke = arr(x.zwecke, `${p}.zwecke`).map((z, i) => { if (typeof z !== 'string' || !(KI_ZWECKE as readonly string[]).includes(z)) throw new Form(`${p}.zwecke[${i}]`, 'unbekannter Zweck'); return z as KiZweck; });
    r.kiNutzung = { genutzt: bool(x, 'genutzt', p), zwecke: [...new Set(zwecke)], geaendert: zahl(x, 'geaendert', p) };
    const t = optStr(x, 'text', p); if (t !== undefined) r.kiNutzung.text = t;
    const k = optStr(x, 'kodierende', p); if (k !== undefined) r.kiNutzung.kodierende = k;
  }
  if (o.typen !== undefined) {
    const merkmalIds = new Set<string>([...codeIds, ...variablen.map(v => v.id)]);
    r.typen = arr(o.typen, 'projekt.typen').map((v, i) => {
      const p = `projekt.typen[${i}]`; const x = obj(v, p);
      // Verweise auf gelöschte Fälle, Codes oder Variablen fallen still weg: Löschen soll ein Projekt nie unlesbar machen
      const liste = (n: string, erlaubt: Set<string>): string[] => [...new Set(arr(x[n], `${p}.${n}`).map((y, j) => {
        if (typeof y !== 'string') throw new Form(`${p}.${n}[${j}]`, 'Text erwartet');
        return y;
      }).filter(y => erlaubt.has(y)))];
      const t: Typ = { id: str(x, 'id', p), name: str(x, 'name', p, true), faelle: liste('faelle', fallIds), merkmale: liste('merkmale', merkmalIds) };
      const b = optStr(x, 'beschreibung', p); if (b !== undefined) t.beschreibung = b;
      return t;
    });
    ohneDoppelte(r.typen.map(t => t.id), 'projekt.typen');
  }
  // Arbeitsweise: eine unbekannte Kennung (neuere Fassung) gilt als 'allgemein', sie ist nur eine Voreinstellung
  if (typeof o.arbeitsweise === 'string' && (ARBEITSWEISEN as readonly string[]).includes(o.arbeitsweise)) r.arbeitsweise = o.arbeitsweise as Arbeitsweise;
  else if (o.arbeitsweise !== undefined && typeof o.arbeitsweise !== 'string') throw new Form('projekt.arbeitsweise', 'Text erwartet');
  if (o.themen !== undefined) r.themen = leseThemen(o.themen, codeIds, segIds, fallIds);
  if (o.einzelfall !== undefined) {
    const p = 'projekt.einzelfall'; const x = obj(o.einzelfall, p);
    // Verweise auf gelöschte Fälle fallen still weg (wie bei `typen`)
    const fertig = [...new Set(textListe(x.fertig, `${p}.fertig`).filter(f => fallIds.has(f)))];
    r.einzelfall = { an: bool(x, 'an', p), fertig };
    const ak = optStr(x, 'aktuell', p); if (ak !== undefined && fallIds.has(ak)) r.einzelfall.aktuell = ak;
  }
  leseMixed(o, r, { variablen: new Set(variablen.map(v => v.id)), codes: codeIds, themen: new Set((r.themen ?? []).map(t => t.id)), segmente: segIds });
  r.version = qualFassung(r);
  // Unbekannte Felder der obersten Ebene bleiben als undurchsichtige Daten erhalten (neuere Fassung, ältere Oberfläche)
  const fremd: Record<string, unknown> = {};
  let hatFremd = false;
  for (const k of Object.keys(o)) {
    if (BEKANNTE_FELDER.includes(k)) continue;
    Object.defineProperty(fremd, k, { value: o[k], enumerable: true, writable: true, configurable: true });
    hatFremd = true;
  }
  if (hatFremd) r._unbekannt = fremd;
  return r;
}
