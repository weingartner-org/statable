/**
 * Schrift von rechts nach links (RTL: Arabisch, Persisch, Prüfsprache xr) - Hilfen für gemischte Sätze.
 * Zahlen, Formeln und Namen aus einer anderen Schrift dürfen in einem arabischen Satz nicht auseinanderfallen
 * („t(97) = 2,31; p = ,024“ ließe sich sonst von rechts nach links lesen). Lösung: Unicode-Isolierung.
 * U+2068 (FSI) beginnt, U+2069 (PDI) beendet einen Abschnitt, der für die Anordnung des umgebenden Satzes wie ein einzelnes Zeichen gilt;
 * seine Richtung bestimmt sich nach dem ersten starken Zeichen (nur Ziffern und Zeichen: links nach rechts).
 * Ohne Abhängigkeiten, auch von laufzeit.ts und kursiv.ts nutzbar. In Sprachen von links nach rechts wird nirgends etwas verändert.
 */
export const FSI = '⁨';
export const PDI = '⁩';

/** Einen Wert isolieren (leer bleibt leer). */
export const isoliere = (t: string): string => (t === '' ? t : `${FSI}${t}${PDI}`);

/** Zahl in einer Formel: „2,31“, „,024“, „−0,5“, „1e-5“ oder ein Platzhalter {0} (Vorlage vor dem Einsetzen). */
const ZAHL = String.raw`[−+-]?(?:\d+(?:[.,]\d+)?|[.,]\d+|\{\d+\})(?:\s?%)?`;
/** Statistik-Zeichen vor „=“ (wie lib/kursiv.ts, dazu griechische). */
const SYMBOL = String.raw`(?:SD|SE|Mdn|df\d?|rs|rrb|dz|prs|pr|ηp²|η²|χ²|M|t|p|d|r|n|N|F|R²|R2|B|b|z|U|W|H|V|g|α|β|κ|ω|ρ|τb|OR|LR|AUC|BF₁₀|BF10|ICC|V|Q|G)`;
const KLAMMER = String.raw`(?:\s*\([^()]{1,40}\))?`;
/** Eine Angabe wie „t(97) = 2,31“, „p < ,001“, „d = 0,57“, „F(2, 57) = 3,1“. */
const ANGABE = String.raw`(?<![\p{L}\d])${SYMBOL}${KLAMMER}\s*[=<>≤≥]\s*${ZAHL}`;
/** Ein Intervall: „95 %-KI [0,19; 0,95]“ / „95% CI [0.19, 0.95]“ oder nur „[0,19; 0,95]“. */
const INTERVALL = String.raw`(?:\d+(?:[.,]\d+)?\s?%[-\s]?(?:KI|CI)\s*)?\[\s*${ZAHL}\s*[;,]\s*${ZAHL}\s*\]`;
const FORMEL = new RegExp(`${ANGABE}(?:\\s*${INTERVALL})?|${INTERVALL}`, 'gu');

/**
 * Jede Formel-Angabe eines Textes für sich isolieren („t(97) = 2,31, p = ,024“ → zwei Abschnitte).
 * Gilt für Vorlagen (mit {0}) und für fertige Texte. Nur in Sprachen von rechts nach links aufrufen.
 */
export const isoliereFormeln = (t: string): string => t.replace(FORMEL, m => isoliere(m));

/** Isolierzeichen wieder entfernen (z. B. für Vergleiche und Prüfungen; zum Kopieren in RTL-Dokumente bleiben sie dran). */
export const ohneIsolierung = (t: string): string => t.replace(/[⁨⁩]/g, '');
