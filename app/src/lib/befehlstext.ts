/**
 * Text aus Dateien (Beschriftungen, Wertebeschriftungen, Texte von Antworten) darf nie einen PSPP-Befehl einschleusen (Später S-C, Fachprüfung).
 * `zit` macht daraus eine Zeichenkette in Apostrophen, die garantiert in EINER Zeile bleibt: Zeilenumbrüche, Tabulatoren und andere Steuerzeichen werden zu einem Leerzeichen,
 * Apostrophe werden verdoppelt, die Länge ist begrenzt (zuerst kürzen, dann verdoppeln, damit kein Paar zerrissen wird).
 */
const STEUER = new RegExp('[\\u0000-\\u001f\\u007f-\\u009f\\u2028\\u2029]+', 'g');
export function zit(t: string, max = 250): string {
  const sauber = String(t ?? '').replace(STEUER, ' ').replace(/\s+/g, ' ').trim();
  return `'${Array.from(sauber).slice(0, max).join('').replace(/'/g, "''")}'`;
}

/**
 * Ein Wert aus den Daten (Textwert, Gruppenname) als Zeichenkette für einen PSPP-Befehl, ohne dass sich der Inhalt ändert - auch wenn er Zeilenumbrüche oder andere Steuerzeichen enthält.
 * Ein Zeilenumbruch mitten in '…' beendet die Zeichenkette (PSPP meldet "Unterminated string constant"), die nächste Zeile beginnt dann einen neuen Befehl: ein Wert aus einer
 * fremden .sav-Datei könnte so eigene Befehle einschleusen (nachgestellt in befehlstext.test.ts). Darum werden Steuerzeichen als Hex-Zeichenkette X'0A' angehängt
 * ('ab' + X'0A' + 'cd'; PSPP setzt das schon beim Lesen zusammen - in RECODE, VALUE LABELS, SELECT IF und überall, wo eine Zeichenkette steht).
 * Apostrophe werden verdoppelt. Für Beschriftungen, die gekürzt und einzeilig sein dürfen, gilt weiter `zit`.
 */
const STEUER_EINZELN = new RegExp('[\\u0000-\\u001f\\u007f-\\u009f\\u2028\\u2029]', 'u');
export function zitWert(t: string | number): string {
  const text = String(t ?? '').replace(/\u0000/g, ' ');
  const teile: string[] = [];
  let lauf = '';
  const schliesse = () => { if (lauf) { teile.push(`'${lauf.replace(/'/g, "''")}'`); lauf = ''; } };
  for (const z of text) {
    if (STEUER_EINZELN.test(z)) { schliesse(); teile.push(`X'${[...new TextEncoder().encode(z)].map(b => b.toString(16).toUpperCase().padStart(2, '0')).join('')}'`); }
    else lauf += z;
  }
  schliesse();
  return teile.length ? teile.join(' + ') : "''";
}

/**
 * Kann das ein Variablenname in PSPP sein? Buchstabe (auch Umlaute und andere Schriften), @, # oder $ zuerst, danach Buchstaben, Ziffern, Punkt, Unterstrich, @, #, $.
 * Spaltennamen kommen aus PSPP selbst (.sav) oder aus `psppName` (CSV, Excel) und erfüllen das immer. Namen, die aus einer fremden Projektdatei (.statable) kommen, werden
 * hiermit geprüft, bevor sie in Befehle gelangen können (leseProjektdatei).
 */
const NAME_OK = /^[\p{L}@#$][\p{L}\p{N}._@#$]{0,63}$/u;
export const psppNameOk = (n: unknown): n is string => typeof n === 'string' && NAME_OK.test(n);

/**
 * Text für eine PSPP-KOMMENTARZEILE (`* …` oder `COMMENT …`), in die etwas aus Dateien kommt (Beschriftungen, Dateinamen, Namen von Sets).
 * Ein Kommentar endet an einem Punkt am Zeilenende; ein Zeilenumbruch (auch U+0085, U+2028, U+2029) im Text beendet ihn also und die nächste Zeile wäre ein neuer Befehl
 * (nachgestellt: Beschriftung „Studium.⏎COMPUTE y = y + 1000.⏎* “ führte COMPUTE aus). Darum: Steuerzeichen und Zeilenumbrüche aller Art sowie Bidi-Zeichen werden zu einem Leerzeichen,
 * Leerraum wird zusammengezogen, die Länge ist begrenzt. Den Punkt am Ende setzt nur Statable selbst. JEDE Kommentarzeile mit Einsetzung läuft hierüber (Wächter: rsicher.test.ts).
 */
const KOMM_STEUER = new RegExp('[\\u0000-\\u001f\\u007f-\\u009f\\u2028\\u2029\\u200b-\\u200f\\u202a-\\u202e\\u2060-\\u2069\\u061c\\ufeff]+', 'gu');
export function pk(t: unknown, max = 300): string {
  const s = String(t ?? '').replace(KOMM_STEUER, ' ').replace(/\s+/g, ' ').trim();
  const z = Array.from(s);
  return z.length > max ? z.slice(0, max).join('') + '…' : s;
}
