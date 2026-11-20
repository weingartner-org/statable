import type { Cell } from '../engine/types';

/** Kopfzellen, unter denen Wahrscheinlichkeiten (p-Werte) stehen. */
const P_HEADER = /^((asymp|exact|approx|monte carlo)\.?\s+)?(sig\.?|p|signifikanz)\b/i;

export function isPValueHeader(text: string): boolean {
  return P_HEADER.test(text.trim());
}

/** Wie Zahlen der Engine geschrieben werden sollen: Dezimalzeichen und Zeichen zwischen Zahl und „%“ (beides aus dem Sprachprofil, i18n/profil.ts). Vorgabe: Deutsch. */
export interface ZahlSchrift { dezimal: ',' | '.'; proz: string; /** Tausendertrenner großer ausgeschriebener Zahlen (aus dem Sprachprofil, i18n/profil.ts `tausender`); Vorgabe „.“ */ gruppe?: string }
const DEUTSCH: ZahlSchrift = { dezimal: ',', proz: '\u00a0', gruppe: '.' };

/**
 * Wandelt den von PSPP gelieferten englischen Zahlentext in die Schreibweise der Sprache (DGPs/APA):
 * Dezimalkomma: p-Werte ohne führende Null, "< ,001" (mit festem Leerzeichen) statt ".000", Prozent nach dem Sprachprofil ("95 %").
 * Mit Dezimalpunkt (Englisch, oder „Zahlen: Punkt“) bleibt der Text der Engine, nur ".000" wird "< .001".
 * `header` ist der Text der zugehörigen Spaltenüberschrift (leer, wenn unbekannt).
 */
export function localizeCell(cell: Pick<Cell, 't' | 'n' | 'g'>, header = '', schrift: ZahlSchrift = DEUTSCH): string {
  const { t, n } = cell;
  if (n === undefined) return t;                         // Text bleibt unverändert
  const punkt = schrift.dezimal === '.';
  // „< .001“ aus den Statable-Tabellen (fp) auch in Zeilen, deren Kopf kein „p“ ist (Schlüssel-Wert-Tabellen: Zeile „p“, Spalte „Wert“)
  if (isPValueHeader(header) || (/^<\s?\.001$/.test(t.trim()) && n >= 0 && n < 0.001)) {
    if (n >= 0 && n < 0.001) return `<\u00a0${schrift.dezimal}001`;   // wie im Satz (pWert): jedes p unter ,001, auch ,0005 bis ,001 (PSPP rundet auf „.001“) - Abschlusstest B4/B5
    return punkt ? t : t.replace(/^(-?)0?\./, '$1,').replace('.', ',');
  }
  if (cell.g && Math.abs(n) >= 1000 && Number.isFinite(n)) return ausExponent(n, schrift.dezimal, schrift.gruppe ?? (schrift.dezimal === ',' ? '.' : ','));   // Statable-Tabellen (fxg): Quadratsummen mit Tausendertrenner, nicht über t (dessen Punkt wäre sonst Dezimalpunkt)
  if (/\dE[+-]?\d/i.test(t)) return ausExponent(n, schrift.dezimal, schrift.gruppe ?? (schrift.dezimal === ',' ? '.' : ','));   // PSPP schreibt sehr kleine/große Zahlen als „7.20E-015“ (B5)
  const mitProz = t.replace(/%$/, schrift.proz + '%');
  return punkt ? mitProz : mitProz.replace(/(\d)\.(\d)/g, '$1,$2').replace(/^(-?)\.(\d)/, '$1,$2');
}

/**
 * Zahl aus PSPPs Exponentenschreibweise („7.20E-015“, „9.0E+010“) lesbar: Rauschen um 0 (unter 1e-9) als 0,00; sonst mit zwei geltenden Stellen ausgeschrieben („4.58E-005“ → 0,000046).
 * Große Zahlen (ab 1) stehen ausgeschrieben mit Tausendertrenner („9.0E+010“ → „90.341.824.425,07“); die Engine liefert den Wert mit voller Genauigkeit (`n`), nur ihr Text ist auf zwei Stellen gerundet.
 * Nachkommastellen: zwei, bei sehr großen Zahlen weniger, so dass höchstens 15 gültige Stellen (die Genauigkeit eines double) stehen - keine erfundenen Ziffern.
 */
function ausExponent(n: number, dezimal: ',' | '.', gruppe: string): string {
  const a = Math.abs(n);
  if (!Number.isFinite(n)) return String(n);
  if (a < 1) {
    const z = a < 1e-9 ? '0.00' : n.toFixed(Math.min(12, Math.max(2, 1 - Math.floor(Math.log10(a)))));
    return dezimal === ',' ? z.replace('.', ',') : z;
  }
  const stellen = Math.max(0, Math.min(2, 15 - (Math.floor(Math.log10(a)) + 1)));
  const [ganz, nach] = a.toFixed(stellen).split('.');
  const vorn = (ganz ?? '').replace(/\B(?=(\d{3})+$)/g, gruppe);
  return `${n < 0 ? '-' : ''}${vorn}${nach ? dezimal + nach : ''}`;
}

export type Dict = Readonly<Record<string, string>>;

/**
 * Übersetzt einen Text aus PSPPs Wörterbuch; "Titel (variable)" behält den Klammerzusatz.
 * `ergaenzung`: was im Wörterbuch fehlt (Vorgabe: die deutschen Ergänzungen unten; andere Sprachen tragen es in ihr Wörterbuch ein oder übergeben `{}`).
 */
export function translate(text: string, dict: Dict | null, ergaenzung: Dict = ERGAENZUNG_DE): string {
  if (!dict || !text) return text;
  const direct = ergaenzung[text] ?? dict[text];
  if (direct !== undefined) return direct;
  // "Model Summary (Konzentration (Punkte))": die letzte, auch verschachtelte Klammer abtrennen.
  if (text.endsWith(')')) {
    let tiefe = 0, i = text.length - 1;
    for (; i >= 0; i--) { if (text[i] === ')') tiefe++; else if (text[i] === '(' && --tiefe === 0) break; }
    const basis = text.slice(0, i).trimEnd(), klammer = text.slice(i);
    if (i > 0) {
      const de = dict[basis] ?? ergaenzung[basis] ?? dict[`${basis} (%s)`]?.replace(/\s*\(%s\)$/, '');
      if (de !== undefined) return `${de} ${klammer}`;
    }
  }
  return ausVorlage(text, dict) ?? text;
}

/**
 * Einträge des Wörterbuchs mit Platzhaltern („Pair %zu“, „%g%% Confidence Interval for Mean“) als Vorlage:
 * „Pair 1“ → „Paar 1“, „95% Confidence Interval for Mean“ → „95% Konfidenzintervall für Mittelwert“.
 */
const VORLAGEN = new WeakMap<Dict, { re: RegExp; de: string }[]>();
function ausVorlage(text: string, dict: Dict): string | undefined {
  let liste = VORLAGEN.get(dict);
  if (!liste) {
    liste = [];
    for (const [en, de] of Object.entries(dict)) {
      if (!/%[a-z]/.test(en) || en.length > 80 || en.replace(/%[a-z]|%%|[^A-Za-z]/g, '').length < 4) continue;
      const re = new RegExp('^' + en.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/%%/g, '\u0001').replace(/%(?:zu|ld|d|g|s)/g, '(.+?)').replace(/\u0001/g, '%') + '$');
      liste.push({ re, de });
    }
    VORLAGEN.set(dict, liste);
  }
  for (const { re, de } of liste) {
    const m = re.exec(text);
    if (!m) continue;
    let i = 1;
    return de.replace(/%%/g, '\u0001').replace(/%(?:zu|ld|d|g|s)/g, () => m[i++] ?? '').replace(/\u0001/g, '%');
  }
  return undefined;
}

/** Was im deutschen PSPP-Wörterbuch fehlt (gefunden beim Prüfen der Regression am 07.10.). Andere Sprachen führen so etwas in ihrem eigenen Wörterbuch (output/<code>-dict.json). */
export const ERGAENZUNG_DE: Dict = {
  'Coefficients': 'Koeffizienten',
  '95% Confidence Interval for B': '95 %-Konfidenzintervall für B',
  '95% CI for Exp(B)': '95 %-KI für Exp(B)',
  'Residual': 'Residuen',
  "Cramer's V": 'Cramérs V'
};
