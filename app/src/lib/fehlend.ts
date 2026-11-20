/**
 * „Keine Angabe“-Codes einer Zahlenspalte (S-F2 B): wie in SPSS entweder bis zu drei Einzelwerte ODER ein Bereich (von - bis) plus höchstens ein Einzelwert.
 * EINE Stelle für alles, was fehlende Codes liest oder schreibt: `istFehlend` (Rechnungen in JS), `fehlendMenge` (für Schleifen), `fehlendSyntax` (PSPP `MISSING VALUES x (lo THRU hi, v)`),
 * `leseFehlendEingabe` (Eingabefeld, in fehlendeingabe.ts), `leseFehlendAnzeige` (so zeigt PSPP die Codes in DISPLAY DICTIONARY). Nirgends sonst `spalte.fehlend.includes(…)` (Wächter: fehlend.test.ts).
 */

/** Ein Bereich von bis (beides eingeschlossen); -Infinity / Infinity = nach unten / oben offen (PSPP: LOWEST / HIGHEST). */
export interface FehlendBereich { von: number; bis: number }
/** Alles, was zu den Codes einer Spalte gehört: die Einzelwerte und der Bereich. */
export interface FehlendQuelle { fehlend: number[]; fehlendBereich?: FehlendBereich | null }
/** Was Schleifen brauchen: „zählt der Wert als fehlend?“ Ein `number[]` erfüllt das auch (nur Einzelwerte). */
export interface Fehlmenge { includes(v: number): boolean }

const KEINE: Fehlmenge = { includes: () => false };

/** Ist der Wert ein Code für „keine Angabe“? Text, leere Zellen und undefined sind hier nie ein Code (die prüft der Aufrufer selbst). */
export function istFehlend(sp: FehlendQuelle | null | undefined, v: unknown): boolean {
  if (!sp || typeof v !== 'number') return false;
  if (sp.fehlend.includes(v)) return true;
  const b = sp.fehlendBereich;
  return !!b && v >= b.von && v <= b.bis;
}

/** Dasselbe als Objekt für Schleifen und Funktionen, die `fehlend.includes(v)` aufrufen; ohne Bereich ist es einfach die Liste. */
export function fehlendMenge(sp: FehlendQuelle | null | undefined): Fehlmenge {
  if (!sp) return KEINE;
  const b = sp.fehlendBereich;
  if (!b) return sp.fehlend;
  const einzel = sp.fehlend;
  return { includes: (v: number) => (v >= b.von && v <= b.bis) || einzel.includes(v) };
}

/** Schlüssel für Zwischenspeicher: ändert sich, sobald sich Einzelwerte oder Bereich ändern. */
export const fehlendSchluessel = (sp: FehlendQuelle | null | undefined): string =>
  !sp ? '' : `${sp.fehlend.join(',')}${sp.fehlendBereich ? `|${sp.fehlendBereich.von}..${sp.fehlendBereich.bis}` : ''}`;

/** Hat die Spalte irgendeinen Code (Einzelwert oder Bereich)? */
export const hatFehlend = (sp: FehlendQuelle | null | undefined): boolean => !!sp && (sp.fehlend.length > 0 || !!sp.fehlendBereich);

/** Gleiche Codes (Einzelwerte ohne Reihenfolge, gleicher Bereich)? */
export function gleichFehlend(a: FehlendQuelle, b: FehlendQuelle): boolean {
  const x = [...a.fehlend].sort((p, q) => p - q), y = [...b.fehlend].sort((p, q) => p - q);
  return x.length === y.length && x.every((v, i) => v === y[i]) && a.fehlendBereich?.von === b.fehlendBereich?.von && a.fehlendBereich?.bis === b.fehlendBereich?.bis;
}

/** Zahl für einen PSPP-Befehl: nur endliche Zahlen, nie in Exponentenschreibweise. */
function zahlSyntax(v: number): string {
  if (!Number.isFinite(v)) throw new Error('fehlend: Zahl erwartet');
  const t = String(v);
  return /e/i.test(t) ? v.toLocaleString('en-US', { useGrouping: false, maximumFractionDigits: 20 }) : t;
}
const grenzeSyntax = (v: number) => (v === -Infinity ? 'LOWEST' : v === Infinity ? 'HIGHEST' : zahlSyntax(v));

/**
 * Das Innere der Klammer von `MISSING VALUES name (…)`: der Bereich zuerst (`lo THRU hi`), dann der Einzelwert; ohne Bereich bis zu drei Einzelwerte.
 * Leer = keine Codes (`MISSING VALUES name ().` hebt auf).
 */
export function fehlendSyntax(sp: FehlendQuelle): string {
  const b = sp.fehlendBereich;
  if (b) return [`${grenzeSyntax(b.von)} THRU ${grenzeSyntax(b.bis)}`, ...sp.fehlend.slice(0, 1).map(zahlSyntax)].join(', ');
  return sp.fehlend.slice(0, 3).map(zahlSyntax).join(', ');
}

/** Die Codes aus dem Text der Anzeige von PSPP (DISPLAY DICTIONARY: `-9 THRU -1; 99`, `LOWEST THRU 0`, `1; 2; 3`). */
export function leseFehlendAnzeige(text: string): { fehlend: number[]; fehlendBereich?: FehlendBereich } {
  const einzel: number[] = [];
  let bereich: FehlendBereich | undefined;
  for (const roh of text.split(/[;,]\s*/)) {
    const t = roh.trim();
    if (!t) continue;
    const m = /^(\S+)\s+THRU\s+(\S+)$/i.exec(t);
    if (m) {
      const g = (x: string) => (/^(LO|LOWEST)$/i.test(x) ? -Infinity : /^(HI|HIGHEST)$/i.test(x) ? Infinity : Number(x));
      const von = g(m[1]!), bis = g(m[2]!);
      if (!Number.isNaN(von) && !Number.isNaN(bis)) bereich = { von, bis };
      continue;
    }
    const n = Number(t);
    if (Number.isFinite(n)) einzel.push(n);
  }
  return { fehlend: einzel, ...(bereich ? { fehlendBereich: bereich } : {}) };
}

/** Die Codes der Spalte plus ein weiterer Einzelwert (Platzhalter „99“ als keine Angabe setzen). Ist der Wert schon ein Code, bleibt alles; ist kein Platz mehr (drei Einzelwerte, oder Bereich und ein Einzelwert), kommt null. */
export function fehlendMitWert(sp: FehlendQuelle, wert: number): { fehlend: number[]; fehlendBereich?: FehlendBereich } | null {
  if (istFehlend(sp, wert)) return { fehlend: [...sp.fehlend], ...(sp.fehlendBereich ? { fehlendBereich: sp.fehlendBereich } : {}) };
  const platz = sp.fehlendBereich ? 1 : 3;
  if (sp.fehlend.length >= platz) return null;
  return { fehlend: [...sp.fehlend, wert], ...(sp.fehlendBereich ? { fehlendBereich: sp.fehlendBereich } : {}) };
}

/** Der Anzeigetext wie in DISPLAY DICTIONARY von PSPP (`-9 THRU -1; 99`, `1; 2; 3`) - für `Spalte.fehlendText`. */
export function fehlendAnzeige(sp: FehlendQuelle): string {
  const b = sp.fehlendBereich;
  return [...(b ? [`${b.von === -Infinity ? 'LOWEST' : b.von} THRU ${b.bis === Infinity ? 'HIGHEST' : b.bis}`] : []), ...sp.fehlend.map(String)].join('; ');
}
