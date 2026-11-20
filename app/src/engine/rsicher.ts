/**
 * Sicherheit der R-Seite (webR): Wie Text und Zahlen in R-Code kommen dürfen.
 *
 * Fremde Dateien (.sav, .csv, .xlsx, .statable) können Spaltennamen, Wertelabels und Textwerte mit Anführungszeichen, Backticks, Zeilenumbrüchen,
 * `system(`, `)`, `;`, `#` oder Backslash enthalten. Darum gilt für alles, was an webR geht (RMotor.rechne, RMotor.daten, evalR*):
 *
 *  1. DATEN und TEXT (Spaltenwerte, Wertelabels, Gruppennamen, Referenzkategorie, Zielstufen, Ereigniswert …) gehen NIE als Text in den Code,
 *     sondern als gebundenes R-Objekt: `RMotor.daten` (Spalten) bzw. `RMotor.rechne(code, { argument: … })` (Text und Textlisten, im Code `rArg('argument')`).
 *  2. BEZEICHNER im Code (Spalten der R-Tabelle `d`, Namen der Prädiktoren) sind immer feste, eigene Namen (`y`, `p01`, `v3`, `zeit` …), die Statable selbst erzeugt,
 *     und laufen trotzdem durch `rId` - eine strenge Weißliste, die wirft, statt zu maskieren. Der Name der Person kommt nie in den Code, nur in die Anzeige (JS).
 *  3. ZAHLEN im Code nur über `rZahl` / `rGanz` (endlich), Ja/Nein über `rBool`, feste Auswahlwörter über `rWahl` (Liste der erlaubten Werte).
 *  4. Der R-Text, den die Person zum Nachrechnen SIEHT („Befehl ansehen“, Bericht), wird nie ausgeführt, aber vielleicht in RStudio eingefügt: darum
 *     dort `rAnzeigeName` / `rAnzeigeText` / `rAnzeigeZahl`, die Namen und Texte so verpacken, dass nichts aus dem Anführungsstrich ausbrechen kann.
 *  5. Der Wächter `rsicher.test.ts` prüft den Quelltext: in den R-Dateien darf in einem Code-Text nur etwas über diese Funktionen eingesetzt werden.
 *  6. Zweite Sperre in R selbst: `sp_id()` in engine/statable.R lehnt jeden Namen ab, der nicht dieselbe Weißliste erfüllt.
 */

/** Wörter, die R als Syntax liest - als Spaltenname nicht zugelassen. */
const RESERVIERT = new Set(['if', 'else', 'repeat', 'while', 'function', 'for', 'next', 'break', 'TRUE', 'FALSE', 'NULL', 'Inf', 'NaN', 'NA', 'NA_integer_', 'NA_real_', 'NA_character_', 'NA_complex_', 'in']);
const ID = /^[A-Za-z][A-Za-z0-9_.]*$/;

/** Ein Bezeichner für den Code: nur /^[A-Za-z][A-Za-z0-9_.]*$/ (höchstens 64 Zeichen, kein R-Schlüsselwort). Alles andere wirft - es wird nie maskiert. */
export function rId(x: unknown): string {
  if (typeof x !== 'string' || x.length > 64 || !ID.test(x) || RESERVIERT.has(x)) throw new Error('Unsicherer R-Bezeichner abgelehnt');
  return x;
}
/** Der Bezeichner als R-Zeichenkette: 'p01'. */
export const rQ = (x: unknown): string => `'${rId(x)}'`;
/** Mehrere Bezeichner als R-Vektor: c('p01', 'p02') bzw. character(0). */
export const rIds = (x: unknown[]): string => (x.length ? `c(${x.map(rQ).join(', ')})` : 'character(0)');

/** Eine benannte Liste von Bezeichner-Vektoren: list(F1 = c('v1', 'v2'), F2 = c('v3', 'v4')). Schlüssel und Einträge sind Bezeichner. */
export const rListeIds = (eintraege: [string, string[]][]): string => `list(${eintraege.map(([k, v]) => `${rId(k)} = ${rIds(v)}`).join(', ')})`;

/** Eine endliche Zahl für den Code (R liest 1e-7, -3.5 und 12 so). */
export function rZahl(x: unknown): string {
  if (typeof x !== 'number' || !Number.isFinite(x)) throw new Error('Keine endliche Zahl für R');
  return String(x);
}
/** Eine ganze Zahl für den Code: 1000L. */
export function rGanz(x: unknown): string {
  if (typeof x !== 'number' || !Number.isSafeInteger(x)) throw new Error('Keine ganze Zahl für R');
  return `${x}L`;
}
/** TRUE oder FALSE; alles außer einem echten Boolean wirft. */
export function rBool(x: unknown): 'TRUE' | 'FALSE' {
  if (x === true) return 'TRUE';
  if (x === false) return 'FALSE';
  throw new Error('Kein Ja/Nein für R');
}
/** Ein Auswahlwort aus einer festen Liste (zum Beispiel 'efron' | 'breslow') als R-Zeichenkette. Alles andere wirft. */
export function rWahl<T extends string>(x: unknown, erlaubt: readonly T[]): string {
  if (typeof x !== 'string' || !(erlaubt as readonly string[]).includes(x)) throw new Error('Unzulässige Auswahl für R');
  return `'${rId(x)}'`;
}
/** Ein gebundenes Argument im Code (siehe `RMotor.rechne(code, args)`): `.sp_arg$name`. Der Name selbst ist ein Bezeichner. */
export const rArg = (name: string): string => `.sp_arg$${rId(name)}`;

/** Mehrere gebundene Argumente als R-Liste: list(.sp_arg$fa1, .sp_arg$fa2). Die Namen sind Bezeichner. */
export const rArgListe = (namen: string[]): string => `list(${namen.map(rArg).join(', ')})`;

/** Ein Aufruf, dessen Fehler als `list(fehler = …)` zurückkommen statt zu werfen. `aufruf` ist selbst ein geprüfter Code-Text (nur Wörter, rId-Bezeichner, Zahlen). */
export const rFange = (aufruf: string): string => `tryCatch(${aufruf}, error = function(e) list(fehler = conditionMessage(e)))`;
/** `rArg(name)` oder NULL (zum Beispiel Zielstufen, die es nur manchmal gibt). */
export const rArgOderNull = (da: boolean, name: string): string => (da ? rArg(name) : 'NULL');
/** `rQ(id)` oder NULL (zum Beispiel die Spalte der Beobachtungszeit). */
export const rQOderNull = (da: boolean, id: string): string => (da ? rQ(id) : 'NULL');
/** `rQ(id)`, bei leerem Text die leere R-Zeichenkette '' (zum Beispiel „keine zufällige Steigung“). */
export const rQOderLeer = (id: string): string => (id === '' ? "''" : rQ(id));

/* ------------------------------------------------------------ Anzeige (wird nie ausgeführt) */

const ANZEIGE_ID = /^(?:[A-Za-z]|\.[A-Za-z_])[A-Za-z0-9._]*$/;
function maskiere(t: string, ende: string): string {
  let o = '';
  for (const z of t) {
    const c = z.codePointAt(0)!;
    if (z === '\\') o += '\\\\';
    else if (z === ende) o += '\\' + ende;
    else if (z === '\n') o += '\\n';
    else if (z === '\r') o += '\\r';
    else if (z === '\t') o += '\\t';
    else if (c < 0x20 || c === 0x7f) o += '\\x' + c.toString(16).padStart(2, '0');
    else if ((c >= 0x80 && c <= 0x9f) || c === 0x2028 || c === 0x2029 || (c >= 0x200b && c <= 0x200f) || (c >= 0x202a && c <= 0x202e) || (c >= 0x2060 && c <= 0x2069) || c === 0x061c || c === 0xfeff) o += '\\u' + c.toString(16).padStart(4, '0');   // Zeilenumbrüche (U+0085, U+2028/2029) und Bidi-Zeichen sichtbar machen
    else o += z;
  }
  return o;
}
/** Für den angezeigten R-Text: ein Name wie in R lesbar. Ein gültiger Name bleibt, sonst Backticks, mit allem Gefährlichen maskiert. */
export function rAnzeigeName(n: string): string {
  const t = String(n);
  return ANZEIGE_ID.test(t) && !RESERVIERT.has(t) ? t : '`' + maskiere(t, '`') + '`';
}
/** Für den angezeigten R-Text: Text als 'Zeichenkette', mit Backslash, Apostroph und Steuerzeichen maskiert. */
export const rAnzeigeText = (t: string): string => "'" + maskiere(String(t), "'") + "'";
/** Für den angezeigten R-Text: eine Zahl; nicht endlich → NA. */
export const rAnzeigeZahl = (x: unknown): string => (typeof x === 'number' && Number.isFinite(x) ? String(x) : 'NA');

/** Eine Liste von Bezeichner-Vektoren: list(c('a', 'b'), c('c')). Einträge sind Bezeichner. */
export const rIdsListe = (x: string[][]): string => `list(${x.map(v => rIds(v)).join(', ')})`;
/** Eine Liste solcher Listen (zum Beispiel Modelle aus Termen): list(list(c('a'), c('a', 'b')), list(c('a'))). */
export const rIdsListen = (x: string[][][]): string => `list(${x.map(v => rIdsListe(v)).join(', ')})`;
