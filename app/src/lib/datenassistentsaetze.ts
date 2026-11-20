/**
 * Sätze der Daten-Assistenten (Welle 5): Fehler, Sperren, Hinweise und die Sätze zu fehlenden Werten.
 * Alles als ganze Sätze mit festen Texten (L/Lp/d) - kein Wort wird per Bedingung eingesetzt, damit jede Sprache den Satz selbst bauen kann.
 */
import type { Wert } from './eingabe';
import { L, Lp } from './sitzung.svelte';
import { AssistentFehler, type Sperre, type Zeilenfunktion, type textVarianten, type zuordnenPruefen, type anhaengenPruefen } from './datenassistent';
import type { Spalte } from './verzeichnis';
import { zahlDe } from './format';

/** Ein Wert für die Anzeige in Vorschau-Tabellen: Zahl im Sprachformat mit Wertelabel, leer als „-“. */
export function anzeigeWert(sp: Spalte | undefined, v: Wert): string {
  if (v === null || v === '') return '-';
  if (typeof v === 'number') { const l = sp?.werteLabels[String(v)]; return l ? `${zahlDe(v)} ${l}` : zahlDe(v); }
  return v;
}

/** Spalte für eine Auswahlliste: Name, bei einer Bezeichnung dahinter. */
export const spaltenOption = (c: Spalte) => (c.bezeichnung ? `${c.name} - ${c.bezeichnung}` : c.name);

/** „7, 12, 15 und 3 weitere“ - höchstens `max` Werte, der Rest als Zahl. */
export function listeText(werte: Wert[], max = 5): string {
  const roh = werte.map(w => (w === null || w === '' ? '-' : String(w)));
  if (roh.length <= max) return roh.join(', ');
  const rest = roh.length - max;
  return `${roh.slice(0, max).join(', ')} ${L(`und ${rest} weitere`, `and ${rest} more`)}`;
}

/** Ein Fehler des Rechenkerns als Satz. Die Sperren beim Zusammenführen haben eigene Sätze (`sperreSatz`). */
export function fehlerSatz(f: unknown): string {
  if (!(f instanceof AssistentFehler)) return L('Das ging nicht. Es ist alles wie vorher.', "That didn't work. Everything is as it was before.");
  const n = typeof f.details === 'string' ? f.details : '';
  switch (f.code) {
    case 'ueberschreiben': return L(`Die Spalte „${n}“ gibt es schon. Statable überschreibt keine Spalte, ohne dass es ausdrücklich gewählt wird.`, `The column "${n}" already exists. Statable never overwrites a column unless you explicitly choose to.`);
    case 'name': return L(`„${n}“ ist kein gültiger Spaltenname. Erlaubt sind Buchstaben, Ziffern und _ ; vorn steht ein Buchstabe.`, `"${n}" is not a valid column name. Letters, digits and _ are allowed; it starts with a letter.`);
    case 'spalte': return L(`Die Spalte „${n}“ gibt es nicht oder sie passt hier nicht (verlangt sind Zahlen).`, `The column "${n}" does not exist or does not fit here (numbers are required).`);
    case 'regeln': return L('Es fehlt noch mindestens eine Regel.', 'At least one rule is still missing.');
    case 'gemischt': return L('Die neuen Werte sind teils Zahlen, teils Text. Eine Spalte kann nur eines von beiden enthalten.', 'The new values are partly numbers, partly text. A column can hold only one of the two.');
    case 'ausdruck': return L('Die Formel ist leer.', 'The formula is empty.');
    case 'kennwertText': return L(`Von einer Textspalte (${n}) lässt sich kein Mittelwert und keine Summe bilden.`, `A text column (${n}) has no mean or sum.`);
    case 'datei': return L('Es fehlt der Name der Datei für das Ergebnis.', 'The name of the file for the result is missing.');
    case 'dateiart': return L(`„${n}“ ist keine Datentabelle. Möglich sind SPSS (.sav), Stata (.dta), CSV und Excel.`, `"${n}" is not a data table. SPSS (.sav), Stata (.dta), CSV and Excel are possible.`);
    case 'lesen': return L(`„${n}“ ließ sich nicht als Datentabelle lesen.`, `"${n}" could not be read as a data table.`);
    // Später S-C (Zählen, Rang, Datum, Sortieren)
    case 'leer': return L('Es ist noch keine Spalte gewählt.', 'No column has been chosen yet.');
    case 'bereich': return L('Der Bereich ist verkehrt herum: die untere Grenze muss kleiner sein als die obere.', 'The range is the wrong way round: the lower limit must be smaller than the upper one.');
    case 'datum': return L(`„${n}“ ist kein Datum, das es gibt.`, `"${n}" is not a date that exists.`);
    case 'sperre': return L('So lässt sich das nicht zusammenführen.', 'That cannot be merged like this.');
    default: return L('Das ging nicht. Es ist alles wie vorher.', "That didn't work. Everything is as it was before.");
  }
}

/** Warum das Zusammenführen über eine Kennung gesperrt ist - ein Satz je Grund, mit dem Ausweg. */
export function sperreSatz(s: Sperre): string {
  switch (s.art) {
    case 'typ': return L('Die Kennung ist in einer Datei eine Zahl und in der anderen Text. So lassen sich die Dateien nicht verbinden; die Kennung muss in beiden dieselbe Art sein.', 'The ID is a number in one file and text in the other. The files cannot be linked like this; the ID must be the same kind in both.');
    case 'doppelt': {
      const liste = listeText(s.kennungen);
      return s.seite === 'a'
        ? L(`In der ersten Datei kommen Kennungen mehrfach vor (${liste}). Bei „eine Zeile je Kennung in beiden Dateien“ darf jede nur einmal stehen. Gehören mehrere Personen zu einer Klasse, ist „viele zu einer“ die richtige Wahl.`, `Some IDs occur more than once in the first file (${liste}). With "one row per ID in both files" each may appear only once. If several people belong to one class, "many to one" is the right choice.`)
        : L(`In der zweiten Datei kommen Kennungen mehrfach vor (${liste}). PSPP würde still nur die erste Zeile nehmen. Die zweite Datei braucht je Kennung genau eine Zeile.`, `Some IDs occur more than once in the second file (${liste}). PSPP would silently use only the first row. The second file needs exactly one row per ID.`);
    }
    case 'namen': {
      const namen = s.konflikte.map(k => k.name).join(', ');
      return Lp(s.konflikte.length, `Die Spalte ${namen} gibt es in beiden Dateien. PSPP ließe die aus der zweiten Datei still weg; sie braucht einen neuen Namen.`, `Die Spalten ${namen} gibt es in beiden Dateien. PSPP ließe die aus der zweiten Datei still weg; sie brauchen neue Namen.`, `The column ${namen} exists in both files. PSPP would silently drop the one from the second file; it needs a new name.`, `The columns ${namen} exist in both files. PSPP would silently drop those from the second file; they need new names.`);
    }
  }
}

/** Die Schreibweise-Warnung: Kennungen, die nach dem Angleichen einen Partner hätten. Statable gleicht nicht selbst an. */
export function schreibweiseSatz(zusaetzlich: number): string {
  return Lp(zusaetzlich,
    'Eine Kennung der ersten Datei hätte einen Partner, wenn Groß- und Kleinschreibung, Leerzeichen und führende Nullen angeglichen wären. Statable gleicht nicht selbst an; das geht am besten in den Dateien vor dem Zusammenführen.',
    `${zusaetzlich} Kennungen der ersten Datei hätten einen Partner, wenn Groß- und Kleinschreibung, Leerzeichen und führende Nullen angeglichen wären. Statable gleicht nicht selbst an; das geht am besten in den Dateien vor dem Zusammenführen.`,
    'One ID in the first file would have a partner if upper/lower case, spaces and leading zeros were made the same. Statable does not do this itself; it is best done in the files before merging.',
    `${zusaetzlich} IDs in the first file would have a partner if upper/lower case, spaces and leading zeros were made the same. Statable does not do this itself; it is best done in the files before merging.`);
}

/** Die Schreibweisen einer Textspalte, die sich nur in Groß/klein oder Randleerzeichen unterscheiden (Umkodieren). */
export function varianteSatz(gruppen: ReturnType<typeof textVarianten>): string {
  const beispiel = gruppen[0]!.varianten.map(v => `„${v.wert}“`).join(', ');
  return Lp(gruppen.length,
    `Eine Schreibweise kommt in mehreren Formen vor (${beispiel}). PSPP behandelt sie als verschiedene Werte; eine Regel für „ja“ trifft „Ja“ nicht.`,
    `${gruppen.length} Schreibweisen kommen in mehreren Formen vor, zum Beispiel ${beispiel}. PSPP behandelt sie als verschiedene Werte; eine Regel für „ja“ trifft „Ja“ nicht.`,
    `One spelling occurs in several forms (${beispiel}). PSPP treats them as different values; a rule for "yes" does not match "Yes".`,
    `${gruppen.length} spellings occur in several forms, for example ${beispiel}. PSPP treats them as different values; a rule for "yes" does not match "Yes".`);
}

/**
 * Leere Ergebnisse nach dem Rechnen: Fälle, die „Nur wenn …“ nicht erfüllen, Lücken (erwartbar) und Rechenfehler getrennt. Leer, wenn alles in Ordnung ist.
 * `bedingungNicht` und `bedingungOffen` kommen nur mit einer Bedingung vor.
 */
export function ergebnisSaetze(z: { leer: number; luecken: number; rechenfehler: number; bedingungNicht?: number; bedingungOffen?: number }): string[] {
  const aus: string[] = [];
  if (z.bedingungNicht) aus.push(Lp(z.bedingungNicht,
    `${z.bedingungNicht} Fall erfüllt die Bedingung nicht und bleibt leer.`, `${z.bedingungNicht} Fälle erfüllen die Bedingung nicht und bleiben leer.`,
    `${z.bedingungNicht} case does not meet the condition and stays empty.`, `${z.bedingungNicht} cases do not meet the condition and stay empty.`));
  if (z.bedingungOffen) aus.push(Lp(z.bedingungOffen,
    `Bei ${z.bedingungOffen} Fall lässt sich die Bedingung nicht prüfen, weil ein Wert fehlt; das Ergebnis bleibt leer.`, `Bei ${z.bedingungOffen} Fällen lässt sich die Bedingung nicht prüfen, weil ein Wert fehlt; das Ergebnis bleibt leer.`,
    `For ${z.bedingungOffen} case the condition cannot be checked because a value is missing; the result stays empty.`, `For ${z.bedingungOffen} cases the condition cannot be checked because a value is missing; the result stays empty.`));
  if (z.luecken) aus.push(Lp(z.luecken,
    `${z.luecken} Ergebnis ist leer, weil bei der Person ein Wert fehlt, den die Rechnung braucht.`, `${z.luecken} Ergebnisse sind leer, weil bei der Person ein Wert fehlt, den die Rechnung braucht.`,
    `${z.luecken} result is empty because a value the calculation needs is missing for that person.`, `${z.luecken} results are empty because a value the calculation needs is missing for that person.`));
  if (z.rechenfehler) aus.push(Lp(z.rechenfehler,
    `${z.rechenfehler} Ergebnis ist leer, obwohl alle Werte da sind: Die Rechnung geht dort nicht auf (Teilen durch 0, auch 0 geteilt durch 0; Logarithmus von 0 oder weniger; Wurzel aus einer negativen Zahl).`,
    `${z.rechenfehler} Ergebnisse sind leer, obwohl alle Werte da sind: Die Rechnung geht dort nicht auf (Teilen durch 0, auch 0 geteilt durch 0; Logarithmus von 0 oder weniger; Wurzel aus einer negativen Zahl).`,
    `${z.rechenfehler} result is empty although all values are present: the calculation fails there (division by 0, also 0 divided by 0; logarithm of 0 or less; root of a negative number).`,
    `${z.rechenfehler} results are empty although all values are present: the calculation fails there (division by 0, also 0 divided by 0; logarithm of 0 or less; root of a negative number).`));
  return aus;
}

/** Der Satz zur Mindestzahl gültiger Werte bei Mittelwert, Summe, Minimum, Maximum, Standardabweichung. */
export function mindestSatz(fn: Zeilenfunktion, k: number, n: number): string {
  if (fn === 'SD') return L('Die Standardabweichung braucht mindestens zwei gültige Werte; bei weniger bleibt das Ergebnis leer.', 'The standard deviation needs at least two valid values; with fewer the result stays empty.');
  if (n <= 1) return L('Das Ergebnis rechnet mit allen vorhandenen Werten; fehlen bei einer Person alle, bleibt es leer.', 'The result uses all values that are present; if all are missing for a person, it stays empty.');
  const hoechstens = k - n;
  return Lp(hoechstens,
    `Fehlt bei einer Person mehr als ${hoechstens} Wert, bleibt ihr Ergebnis leer (mindestens ${n} von ${k} gültig).`,
    `Fehlen bei einer Person mehr als ${hoechstens} Werte, bleibt ihr Ergebnis leer (mindestens ${n} von ${k} gültig).`,
    `If a person is missing more than ${hoechstens} value, their result stays empty (at least ${n} of ${k} valid).`,
    `If a person is missing more than ${hoechstens} values, their result stays empty (at least ${n} of ${k} valid).`);
}

/** Hinweis zur Auswahlspalte: wie viele Fälle erfüllt, nicht erfüllt, nicht prüfbar. */
export function auswahlSatz(z: { erfuellt: number; nicht: number; leer: number }): string {
  return L(`Die Bedingung gilt für ${z.erfuellt} Fälle, für ${z.nicht} nicht und bei ${z.leer} lässt sie sich nicht prüfen, weil ein Wert fehlt.`, `The condition holds for ${z.erfuellt} cases, not for ${z.nicht}, and cannot be checked for ${z.leer} because a value is missing.`);
}

/** Rückfrage vor „Nur diese Fälle behalten“: Zahl der entfernten Fälle, auch der nicht prüfbaren. */
export function behaltenFrage(z: { entfernt: number; leer: number }): string {
  const grund = z.leer
    ? Lp(z.leer, ` Darunter ${z.leer} Fall, bei dem die Bedingung wegen eines fehlenden Werts nicht prüfbar ist: Er fällt ebenfalls weg.`, ` Darunter ${z.leer} Fälle, bei denen die Bedingung wegen fehlender Werte nicht prüfbar ist: Sie fallen ebenfalls weg.`, ` Among them ${z.leer} case where the condition cannot be checked because of a missing value: it is dropped as well.`, ` Among them ${z.leer} cases where the condition cannot be checked because of missing values: they are dropped as well.`)
    : '';
  return Lp(z.entfernt, `Dabei wird ${z.entfernt} Fall aus den Daten entfernt.${grund}`, `Dabei werden ${z.entfernt} Fälle aus den Daten entfernt.${grund}`, `This removes ${z.entfernt} case from the data.${grund}`, `This removes ${z.entfernt} cases from the data.${grund}`);
}

/** Zusammenfassung der doppelten Fälle. */
export function doppeltSatz(r: { wiederholungen: number; gruppen: number; nichtPruefbar: number }): string[] {
  const aus: string[] = [];
  aus.push(r.wiederholungen === 0
    ? L('Es gibt keine doppelten Fälle.', 'There are no duplicate cases.')
    : Lp(r.wiederholungen,
      `${r.wiederholungen} Fall wiederholt einen früheren Fall (${r.gruppen} Gruppe gleicher Fälle).`, `${r.wiederholungen} Fälle wiederholen einen früheren Fall (${r.gruppen} Gruppen gleicher Fälle).`,
      `${r.wiederholungen} case repeats an earlier case (${r.gruppen} group of identical cases).`, `${r.wiederholungen} cases repeat an earlier case (${r.gruppen} groups of identical cases).`));
  if (r.nichtPruefbar) aus.push(Lp(r.nichtPruefbar,
    `${r.nichtPruefbar} Fall lässt sich nicht prüfen, weil in den gewählten Spalten ein Wert fehlt.`, `${r.nichtPruefbar} Fälle lassen sich nicht prüfen, weil in den gewählten Spalten ein Wert fehlt.`,
    `${r.nichtPruefbar} case cannot be checked because a value is missing in the chosen columns.`, `${r.nichtPruefbar} cases cannot be checked because a value is missing in the chosen columns.`));
  return aus;
}

/** Was beim Zusammenführen über eine Kennung auffiel, als Sätze: Fälle ohne Kennung, ohne Partner (beidseitig), und was daraus im Ergebnis wird. */
export function zuordnenSaetze(p: ReturnType<typeof zuordnenPruefen>, beziehung: '1:1' | 'viele:1'): string[] {
  const aus: string[] = [];
  const kA = listeText(p.a.ohnePartner), kB = listeText(p.b.ohnePartner);
  if (p.a.ohneKennung) aus.push(Lp(p.a.ohneKennung,
    `${p.a.ohneKennung} Fall der ersten Datei hat keine Kennung und findet keinen Partner.`, `${p.a.ohneKennung} Fälle der ersten Datei haben keine Kennung und finden keinen Partner.`,
    `${p.a.ohneKennung} case in the first file has no ID and finds no partner.`, `${p.a.ohneKennung} cases in the first file have no ID and find no partner.`));
  if (p.a.faelleOhnePartner) aus.push(Lp(p.a.faelleOhnePartner,
    `${p.a.faelleOhnePartner} Fall der ersten Datei (Kennung: ${kA}) hat in der zweiten Datei keinen Partner; die neuen Spalten bleiben dort leer.`, `${p.a.faelleOhnePartner} Fälle der ersten Datei (Kennungen: ${kA}) haben in der zweiten Datei keinen Partner; die neuen Spalten bleiben dort leer.`,
    `${p.a.faelleOhnePartner} case in the first file (ID: ${kA}) has no partner in the second file; the new columns stay blank there.`, `${p.a.faelleOhnePartner} cases in the first file (IDs: ${kA}) have no partner in the second file; the new columns stay blank there.`));
  if (p.b.ohneKennung) aus.push(Lp(p.b.ohneKennung,
    `${p.b.ohneKennung} Fall der zweiten Datei hat keine Kennung und fehlt im Ergebnis.`, `${p.b.ohneKennung} Fälle der zweiten Datei haben keine Kennung und fehlen im Ergebnis.`,
    `${p.b.ohneKennung} case in the second file has no ID and is missing from the result.`, `${p.b.ohneKennung} cases in the second file have no ID and are missing from the result.`));
  if (p.b.faelleOhnePartner) {
    const n = p.b.faelleOhnePartner, k = p.b.ohnePartner.length;
    aus.push(beziehung === 'viele:1'
      ? Lp(k, `${n} Fall der zweiten Datei (Kennung: ${kB}) hat keinen Partner in der ersten Datei und fehlt im Ergebnis.`, `${n} Fälle der zweiten Datei (${k} Kennungen: ${kB}) haben keinen Partner in der ersten Datei und fehlen im Ergebnis.`,
        `${n} case in the second file (ID: ${kB}) has no partner in the first file and is missing from the result.`, `${n} cases in the second file (${k} IDs: ${kB}) have no partner in the first file and are missing from the result.`)
      : Lp(k, `${n} Fall der zweiten Datei (Kennung: ${kB}) hat keinen Partner in der ersten Datei; er kommt als eigene Zeile ans Ende, die Spalten der ersten Datei sind dort leer.`, `${n} Fälle der zweiten Datei (${k} Kennungen: ${kB}) haben keinen Partner in der ersten Datei; sie kommen als eigene Zeilen ans Ende, die Spalten der ersten Datei sind dort leer.`,
        `${n} case in the second file (ID: ${kB}) has no partner in the first file; it is added as its own row at the end, with the columns of the first file blank.`, `${n} cases in the second file (${k} IDs: ${kB}) have no partner in the first file; they are added as their own rows at the end, with the columns of the first file blank.`));
  }
  for (const h of p.hinweise) aus.push(schreibweiseSatz(h.zusaetzlich));
  return aus;
}

/** Was beim Anhängen auffiel: Spalten, die nur in einer Datei stehen. */
export function anhaengenSaetze(p: ReturnType<typeof anhaengenPruefen>): string[] {
  const aus: string[] = [];
  if (p.nurA.length) aus.push(Lp(p.nurA.length, `Die Spalte ${p.nurA.join(', ')} steht nur in der ersten Datei; für die angehängten Fälle ist sie leer.`, `Die Spalten ${p.nurA.join(', ')} stehen nur in der ersten Datei; für die angehängten Fälle sind sie leer.`,
    `The column ${p.nurA.join(', ')} is only in the first file; it is blank for the appended cases.`, `The columns ${p.nurA.join(', ')} are only in the first file; they are blank for the appended cases.`));
  if (p.nurB.length) aus.push(Lp(p.nurB.length, `Die Spalte ${p.nurB.join(', ')} steht nur in der zweiten Datei; für die bisherigen Fälle ist sie leer.`, `Die Spalten ${p.nurB.join(', ')} stehen nur in der zweiten Datei; für die bisherigen Fälle sind sie leer.`,
    `The column ${p.nurB.join(', ')} is only in the second file; it is blank for the existing cases.`, `The columns ${p.nurB.join(', ')} are only in the second file; they are blank for the existing cases.`));
  for (const k of p.typkonflikte) aus.push(L(`Die Spalte „${k.name}“ ist in einer Datei eine Zahl und in der anderen Text. So lassen sich die Fälle nicht anhängen.`, `The column "${k.name}" is a number in one file and text in the other. The cases cannot be appended like this.`));
  return aus;
}

/**
 * Fälle ohne Gruppenangabe beim Aggregieren: PSPP bildet für „leer“ und für einen als „keine Angabe“ geführten Code (zum Beispiel 9) je eine eigene Gruppe.
 * Ein Satz je Art, mit dem Code.
 */
export function gruppenFehlendSaetze(f: { leer: number; keineAngabe: number; codes: Wert[] }): string[] {
  const aus: string[] = [];
  const codes = listeText(f.codes, 3);
  if (f.keineAngabe) aus.push(Lp(f.keineAngabe,
    `${f.keineAngabe} Fall mit „keine Angabe“ (${codes}) bildet eine eigene Gruppe.`, `${f.keineAngabe} Fälle mit „keine Angabe“ (${codes}) bilden eine eigene Gruppe.`,
    `${f.keineAngabe} case with "no answer" (${codes}) forms a group of its own.`, `${f.keineAngabe} cases with "no answer" (${codes}) form a group of their own.`));
  if (f.leer) aus.push(Lp(f.leer,
    `${f.leer} Fall ohne Gruppenangabe bildet eine eigene Gruppe.`, `${f.leer} Fälle ohne Gruppenangabe bilden eine eigene Gruppe.`,
    `${f.leer} case without a group value forms a group of its own.`, `${f.leer} cases without a group value form a group of their own.`));
  return aus;
}
