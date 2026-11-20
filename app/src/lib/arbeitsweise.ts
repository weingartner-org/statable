/**
 * Schalter „Meine Arbeitsweise“ (Stufe A3, Fachblatt Arbeitsweisen Abschnitt 7).
 *
 * Der Schalter setzt **nur Voreinstellungen**: Reihenfolge, Startansicht, was eingeklappt ist und was sichtbar ist. Er sperrt nichts, rechnet
 * nichts anders und ändert keinen Export. Alles bleibt über Strg+K erreichbar (Hash `#kodieren/<teil>`, siehe `KODIEREN_TEILE`). Ein Wechsel
 * löscht nichts. Kennungen sind fest (`ARBEITSWEISEN` in `qualprojekt.ts`) und werden nie übersetzt.
 */
import type { Arbeitsweise, QualProjekt } from './qualprojekt';

/** Teile des Kodier-Arbeitsplatzes, die eine Arbeitsweise sichtbar macht. Alle sind bei jeder Wahl über Strg+K zu öffnen. */
export type KodierTeil = 'themen' | 'tagebuch' | 'gt-memos' | 'phase' | 'vergleich' | 'einzelfall' | 'randnotizen' | 'gruppenthemen';
export const KODIEREN_TEILE: readonly KodierTeil[] = ['themen', 'tagebuch', 'gt-memos', 'phase', 'vergleich', 'einzelfall', 'randnotizen', 'gruppenthemen'];

/** Bereiche des Arbeitsplatzes unter Dokument und Code-Leiste, deren Reihenfolge eine Arbeitsweise ändern darf. */
export type KodierBereich = 'baum' | 'themen' | 'belege' | 'memos' | 'vergleich' | 'randnotizen' | 'auswerten' | 'nachv' | 'faelle';

export interface Voreinstellung {
  /** Startansicht im Bereich „Auswerten“ (nur beim Wechsel der Arbeitsweise und beim ersten Öffnen gesetzt) */
  startAuswerten?: 'uebersicht' | 'fk';
  /** sichtbare Teile ohne Strg+K */
  sichtbar: readonly KodierTeil[];
  /** Reihenfolge der Bereiche (nur sichtbare werden gezeigt) */
  reihenfolge: readonly KodierBereich[];
  /** Bereich „Nachvollziehbarkeit“ aufgeklappt (Codebuch: Änderungsprotokoll des Leitfadens vorne) */
  nachvOffen?: boolean;
  /** Übereinstimmung (Seite „Interviews“) eingeklappt mit Satz und Quelle */
  uebereinstimmungEingeklappt?: boolean;
  /** Einzelfall-Modus beim Wechsel anbieten (IPA) */
  einzelfallAnbieten?: boolean;
  /** führt in den Sequenz-Arbeitsplatz auf der Seite „Interviews“ */
  zumSequenzArbeitsplatz?: boolean;
}

const STANDARD: readonly KodierBereich[] = ['baum', 'belege', 'memos', 'auswerten', 'nachv', 'faelle'];

export const VOREINSTELLUNGEN: Record<Arbeitsweise, Voreinstellung> = {
  allgemein: { sichtbar: [], reihenfolge: STANDARD },
  'ta-reflexiv': { sichtbar: ['themen', 'tagebuch'], reihenfolge: ['baum', 'themen', 'belege', 'memos', 'auswerten', 'nachv', 'faelle'], uebereinstimmungEingeklappt: true },
  codebuch: { sichtbar: [], reihenfolge: STANDARD, nachvOffen: true },
  framework: { startAuswerten: 'fk', sichtbar: ['themen'], reihenfolge: ['baum', 'themen', 'auswerten', 'belege', 'memos', 'nachv', 'faelle'] },
  'grounded-theory': { sichtbar: ['gt-memos', 'phase', 'vergleich'], reihenfolge: ['memos', 'baum', 'vergleich', 'belege', 'auswerten', 'nachv', 'faelle'] },
  ipa: { sichtbar: ['einzelfall', 'randnotizen', 'themen', 'gruppenthemen'], reihenfolge: ['randnotizen', 'themen', 'baum', 'memos', 'belege', 'auswerten', 'nachv', 'faelle'], einzelfallAnbieten: true },
  sequenzanalyse: { sichtbar: [], reihenfolge: STANDARD, zumSequenzArbeitsplatz: true },
};

export interface ArbeitsweiseText { name: [string, string]; aenderung: [string, string]; quelle: string }

/** Namen (Fachbegriff immer dabei) und der Satz „Was ändert sich?“ je Wahl, de und en. */
export const ARBEITSWEISE_TEXT: Record<Arbeitsweise, ArbeitsweiseText> = {
  allgemein: {
    name: ['Allgemein (Kodieren)', 'General (coding)'],
    aenderung: ['Der Arbeitsplatz zeigt alles wie bisher. Themen, Memo-Arten und Kodierphasen finden Sie über Strg+K.', 'The workplace shows everything as before. Themes, memo types and coding phases are available via Ctrl+K.'],
    quelle: '',
  },
  'ta-reflexiv': {
    name: ['Muster über Fälle bilden (reflexive thematische Analyse nach Braun und Clarke)', 'Building patterns across cases (reflexive thematic analysis, Braun and Clarke)'],
    aenderung: ['Die Themen-Liste steht neben dem Codebaum, das reflexive Tagebuch ist mit einem Knopf erreichbar. Die Übereinstimmung zwischen Kodierenden ist eingeklappt, weil sie hier kein Gütemaß ist.', 'The theme list sits next to the code tree, and the reflexive journal is one button away. Intercoder agreement is collapsed, because it is not a quality measure here.'],
    quelle: 'Braun & Clarke (2006, 2019, 2021, 2022)',
  },
  codebuch: {
    name: ['Mit festem Kategoriensystem arbeiten (qualitative Inhaltsanalyse nach Kuckartz, Mayring, Schreier)', 'Working with a fixed category system (qualitative content analysis, codebook approaches)'],
    aenderung: ['Der Kodierleitfaden steht vorne, die Übereinstimmung ist sichtbar, und das Änderungsprotokoll des Leitfadens ist aufgeklappt.', 'The coding guide comes first, agreement is visible, and the change log of the guide is open.'],
    quelle: 'Kuckartz & Rädiker (2022); Mayring (2022); Schreier (2012)',
  },
  framework: {
    name: ['Fälle in einer Tabelle vergleichen (Framework-Methode nach Gale u. a.)', 'Comparing cases in a table (Framework Method, Gale et al.)'],
    aenderung: ['Im Bereich „Auswerten“ öffnet die Fall-Kategorie-Matrix zuerst. Als Spalten können Sie Themen statt Codes wählen.', 'In the "Analyse" area the case-by-category matrix opens first. You can choose themes instead of codes as columns.'],
    quelle: 'Gale et al. (2013); Ritchie & Spencer (1994)',
  },
  'grounded-theory': {
    name: ['Aus Daten eine Theorie entwickeln (Grounded Theory nach Charmaz, Corbin und Strauss)', 'Developing theory from data (grounded theory, Charmaz; Corbin and Strauss)'],
    aenderung: ['Memos stehen vorne, mit den Memo-Arten der Grounded Theory. Am Code können Sie die Kodierphase setzen, und Sie können zwei Stellen nebeneinander vergleichen.', 'Memos come first, with the memo types of grounded theory. You can set the coding phase on a code, and compare two passages side by side.'],
    quelle: 'Charmaz (2014); Corbin & Strauss (2015); Glaser & Strauss (1967)',
  },
  ipa: {
    name: ['Eine Person nach der anderen verstehen (Interpretative Phänomenologische Analyse, IPA)', 'Understanding one person at a time (interpretative phenomenological analysis, IPA)'],
    aenderung: ['Sie arbeiten im Einzelfall-Modus: Nur ein Fall ist zu sehen, bis Sie ihn als fertig markieren. Randnotizen in drei Schichten stehen vorne, dazu persönliche und Gruppen-Themen.', 'You work in single-case mode: only one case is shown until you mark it as done. Exploratory notes in three layers come first, together with personal and group themes.'],
    quelle: 'Smith, Flowers & Larkin (2022)',
  },
  sequenzanalyse: {
    name: ['Zeile für Zeile deuten (Feinstruktur und Sequenzanalyse nach Froschauer und Lueger)', 'Interpreting line by line (sequential hermeneutic interpretation, Froschauer and Lueger)'],
    aenderung: ['Diese Arbeitsweise hat einen eigenen Arbeitsplatz auf der Seite „Interviews“ (Bereich Feinstrukturanalyse). Der Kodier-Arbeitsplatz bleibt wie bisher.', 'This approach has its own workplace on the "Interviews" page (fine structure analysis area). The coding workplace stays as before.'],
    quelle: 'Froschauer & Lueger (2020)',
  },
};

/** Satz für Methodenanhang und REFI-QDA („Approach: …“): englischer Name ohne Alltagsbeschreibung. */
export const ARBEITSWEISE_EN_KURZ: Record<Arbeitsweise, string> = {
  allgemein: 'General (coding)',
  'ta-reflexiv': 'Reflexive thematic analysis (Braun and Clarke)',
  codebuch: 'Qualitative content analysis and codebook approaches',
  framework: 'Framework Method (Gale et al.)',
  'grounded-theory': 'Grounded theory (Charmaz; Corbin and Strauss)',
  ipa: 'Interpretative phenomenological analysis (IPA)',
  sequenzanalyse: 'Sequential hermeneutic interpretation (Froschauer and Lueger)',
};

export const arbeitsweise = (q: Pick<QualProjekt, 'arbeitsweise'> | undefined): Arbeitsweise => q?.arbeitsweise ?? 'allgemein';
export const voreinstellung = (q: Pick<QualProjekt, 'arbeitsweise'> | undefined): Voreinstellung => VOREINSTELLUNGEN[arbeitsweise(q)];

/** Setzt die Arbeitsweise; 'allgemein' entfernt das Feld (altes Projekt bleibt Byte für Byte gleich). Ändert sonst nichts am Projekt. */
export function setzeArbeitsweise(q: QualProjekt, a: Arbeitsweise): QualProjekt {
  if (arbeitsweise(q) === a) return q;
  const r: QualProjekt = { ...q };
  if (a === 'allgemein') delete r.arbeitsweise; else r.arbeitsweise = a;
  return r;
}

/** Sichtbar ohne Strg+K? `geoeffnet` sind die Teile, die die Person über Strg+K oder das Menü geöffnet hat (nur in dieser Sitzung). */
export function teilSichtbar(q: Pick<QualProjekt, 'arbeitsweise' | 'themen'> | undefined, teil: KodierTeil, geoeffnet: ReadonlySet<KodierTeil>): boolean {
  if (geoeffnet.has(teil)) return true;
  if (voreinstellung(q).sichtbar.includes(teil)) return true;
  // Wer schon Themen hat, sieht sie auch bei 'allgemein' (Wechsel löscht nichts, und so verschwindet nichts aus dem Blick)
  return teil === 'themen' && !!q?.themen?.length;
}

/** Reihenfolge der sichtbaren Bereiche. */
export function bereiche(q: Pick<QualProjekt, 'arbeitsweise' | 'themen'> | undefined, geoeffnet: ReadonlySet<KodierTeil>): KodierBereich[] {
  const v = voreinstellung(q);
  const zeig = (b: KodierBereich): boolean =>
    b === 'themen' ? teilSichtbar(q, 'themen', geoeffnet) || teilSichtbar(q, 'gruppenthemen', geoeffnet)
      : b === 'vergleich' ? teilSichtbar(q, 'vergleich', geoeffnet)
        : b === 'randnotizen' ? teilSichtbar(q, 'randnotizen', geoeffnet)
          : true;
  const basis = v.reihenfolge.filter(zeig);
  // über Strg+K geöffnete Bereiche, die in der Reihenfolge dieser Arbeitsweise fehlen: nach den Memos einfügen
  for (const b of ['themen', 'vergleich', 'randnotizen'] as const) {
    if (!basis.includes(b) && zeig(b)) { const i = basis.indexOf('memos'); basis.splice(i < 0 ? basis.length : i + 1, 0, b); }
  }
  return basis;
}
