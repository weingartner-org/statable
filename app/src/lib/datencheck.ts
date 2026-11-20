/**
 * Daten-Check: findet, was Ergebnisse verderben kann, und schlägt etwas vor. Reine Funktionen, keine Oberfläche.
 * Vier Prüfungen: unterschiedliche Schreibweisen, Platzhalterwerte (99 …), leere Felder, sehr auffällige Werte.
 * Ausreißer-Regel: außerhalb Q1 − 2,2·IQR bis Q3 + 2,2·IQR (Hoaglin & Iglewicz 1987) UND deutlich vom nächsten
 * übrigen Wert getrennt (Abstand > IQR/2, mindestens 1); nur bei mindestens 15 verschiedenen Werten - sonst meldet eine
 * schiefe, gestufte Verteilung (Alter, Skalen 1-5) Fehlalarme. Tippfehler wie 99 fängt dort die Platzhalter-Prüfung.
 * Fachlich noch zu prüfen.
 */
import { istFehlend, type FehlendBereich } from './fehlend';
import { aktuelleSprache } from './sitzung.svelte';
import { ort } from '../i18n/profil';

export interface SpalteDaten { name: string; bezeichnung: string; art: 'zahl' | 'text' | 'datum'; werte: (string | number | null)[]; fehlend: number[]; fehlendBereich?: FehlendBereich }

export type Fund =
  | { art: 'schreibweise'; spalte: string; zuordnung: Record<string, string>; vorher: Record<string, number>; nachher: Record<string, number>; zeilen: number[] }
  | { art: 'platzhalter'; spalte: string; wert: number; anzahl: number; zeilen: number[]; mittelVorher: number; mittelNachher: number }
  | { art: 'leer'; spalte: string; anzahl: number; zeilen: number[] }
  | { art: 'ausreisser'; spalte: string; wert: number; zeile: number; spanne: [number, number] };

export const fundSchluessel = (f: Fund): string =>
  f.art === 'ausreisser' ? `${f.art}:${f.spalte}:${f.zeile}` : f.art === 'platzhalter' ? `${f.art}:${f.spalte}:${f.wert}` : `${f.art}:${f.spalte}`;

// ä/ae, ö/oe, ü/ue, ß/ss gelten als gleich: „maennlich“ ist „männlich“ (Tastatur ohne Umlaute).
// Sprache: Deutsch und Englisch genau so wie vor den Sprachen (Tests). Jede andere Sprache zusätzlich: Akzente ab (NFD), damit „é“ und „e“, „ά“ und „α“ gleich gelten, und Kleinschreibung nach dem Gebietsschema der Sprache.
const norm = (s: string) => {
  const sp = aktuelleSprache();
  const t = (sp === 'de' || sp === 'en' ? s.toLocaleLowerCase('de') : s.toLocaleLowerCase(ort())).normalize('NFC').replace(/[\s.\-_]+/g, '').replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss');
  return sp === 'de' || sp === 'en' ? t : t.normalize('NFD').replace(/\p{M}+/gu, '').replace(/ł/g, 'l').replace(/đ/g, 'd').replace(/ø/g, 'o').replace(/ı/g, 'i');
};

/** Seltene Schreibweisen, die zu einer häufigen passen (gleich ohne Groß/Klein/Punkt, oder Abkürzung davon). */
export function schreibweisen(s: SpalteDaten): Fund | null {
  if (s.art !== 'text') return null;
  const zaehl = new Map<string, number>();
  s.werte.forEach(v => { if (typeof v === 'string' && v !== '') zaehl.set(v, (zaehl.get(v) ?? 0) + 1); });
  if (zaehl.size < 2 || zaehl.size > 40) return null;
  const n = [...zaehl.values()].reduce((a, b) => a + b, 0);
  const haeufig = [...zaehl].filter(([, c]) => c >= Math.max(3, n * 0.05)).sort((a, b) => b[1] - a[1]);
  const zuordnung: Record<string, string> = {};
  for (const [v, c] of zaehl) {
    if (haeufig.some(([h]) => h === v) && c >= Math.max(3, n * 0.05)) continue;
    const nv = norm(v);
    if (!nv) continue;
    const passend = haeufig.filter(([h]) => h !== v && (norm(h) === nv || (norm(h).startsWith(nv) && nv.length >= 1)));
    if (passend.length === 1) zuordnung[v] = passend[0]![0];
  }
  if (!Object.keys(zuordnung).length) return null;
  const nachher: Record<string, number> = {};
  for (const [v, c] of zaehl) { const z = zuordnung[v] ?? v; nachher[z] = (nachher[z] ?? 0) + c; }
  const zeilen = s.werte.flatMap((v, i) => (typeof v === 'string' && v in zuordnung ? [i] : []));
  return { art: 'schreibweise', spalte: s.name, zuordnung, vorher: Object.fromEntries(zaehl), nachher, zeilen };
}

export function quartile(sortiert: number[]): { q1: number; md: number; q3: number } {
  const q = (p: number) => { const i = (sortiert.length - 1) * p, u = Math.floor(i); return sortiert[u]! + (sortiert[Math.ceil(i)]! - sortiert[u]!) * (i - u); };
  return { q1: q(0.25), md: q(0.5), q3: q(0.75) };
}
const zahlen = (s: SpalteDaten, ohne: number[] = []) => s.werte.filter((v): v is number => typeof v === 'number' && !istFehlend(s, v) && !ohne.includes(v));
const mittel = (a: number[]) => a.reduce((x, y) => x + y, 0) / (a.length || 1);

const PLATZHALTER = [9, 99, 999, 9999, 99999, -1, -9, -99, -999, -9999];

/** Typische Platzhalter für "keine Angabe", die weit außerhalb der übrigen Werte liegen. */
export function platzhalter(s: SpalteDaten): Fund[] {
  if (s.art !== 'zahl') return [];
  const aus: Fund[] = [];
  // Ein Durchgang: welche der Platzhalter kommen überhaupt vor? Nur für die lohnt sich der Rest (Große Daten 31.10.: zehn Durchgänge über eine Million Zeilen waren die langsamste Stelle).
  const da = new Set<number>(); const fest = new Set(PLATZHALTER);
  for (const v of s.werte) if (typeof v === 'number' && fest.has(v)) da.add(v);
  for (const p of PLATZHALTER) {
    if (!da.has(p) || istFehlend(s, p)) continue;
    const zeilen = s.werte.flatMap((v, i) => (v === p ? [i] : []));
    if (!zeilen.length) continue;
    const rest = zahlen(s, [p]).sort((a, b) => a - b);
    if (rest.length < 5) continue;
    const { q1, q3 } = quartile(rest); const iqr = q3 - q1 || 1;
    const max = rest.at(-1)!, min = rest[0]!;
    const weitWeg = p > 0 ? p > q3 + 3 * iqr && p > max * 1.5 : p < q1 - 3 * iqr && p < min - Math.abs(min) * 0.5 - 1;
    if (!weitWeg) continue;
    aus.push({ art: 'platzhalter', spalte: s.name, wert: p, anzahl: zeilen.length, zeilen, mittelVorher: mittel(zahlen(s)), mittelNachher: mittel(rest) });
  }
  return aus;
}

export function leere(s: SpalteDaten): Fund | null {
  const zeilen: number[] = []; for (let i = 0; i < s.werte.length; i++) { const v = s.werte[i]; if (v === null || v === '') zeilen.push(i); }
  return zeilen.length && zeilen.length < s.werte.length ? { art: 'leer', spalte: s.name, anzahl: zeilen.length, zeilen } : null;
}

/** Die Ausreißer-Regel als reine Funktion über Zahlen (auch für den Rangtest-Vorschlag, rangtests.ts): Grenzen und Spanne der übrigen Werte,
 *  `null`, wenn die Regel nicht greift (unter 10 Werten, unter 15 verschiedenen Werten, keine Streuung). */
export function ausreisserGrenzen(werte: number[]): { lo: number; hi: number; spanne: [number, number]; getrennt: (v: number) => boolean } | null {
  const w = Float64Array.from(werte).sort();   // numerisch sortiert, ohne Vergleichsfunktion (viel schneller bei Millionen Zeilen)
  let verschieden = w.length ? 1 : 0; for (let i = 1; i < w.length && verschieden < 15; i++) if (w[i] !== w[i - 1]) verschieden++;
  if (w.length < 10 || verschieden < 15) return null;   // wenige Stufen (Alter, Noten, Skalen): Randwerte sind normal
  const { q1, q3 } = quartile(w as unknown as number[]); const iqr = q3 - q1;
  if (iqr <= 0) return null;
  const lo = q1 - 2.2 * iqr, hi = q3 + 2.2 * iqr;
  const innen = w.filter(v => v >= lo && v <= hi) as unknown as number[];
  const spanne: [number, number] = [innen[0]!, innen.at(-1)!];
  const abstand = Math.max(iqr / 2, 1);
  return { lo, hi, spanne, getrennt: (v: number) => (v < lo || v > hi) && (v < lo ? spanne[0] - v : v - spanne[1]) > abstand };
}
/** Sehr auffällige Einzelwerte nach derselben Regel (höchstens 3; mehr heißt schiefe Verteilung, kein Einzelfall). */
export function ausreisserWerte(werte: number[]): number[] {
  const g = ausreisserGrenzen(werte); if (!g) return [];
  const f = werte.filter(g.getrennt);
  return f.length > 3 ? [] : f;
}

/** Sehr auffällige Einzelwerte (höchstens 3 je Spalte), Platzhalter ausgenommen. */
export function ausreisser(s: SpalteDaten, platz: number[] = []): Fund[] {
  if (s.art !== 'zahl') return [];
  const g = ausreisserGrenzen(zahlen(s, platz)); if (!g) return [];
  const { spanne } = g;
  const funde: Fund[] = [];
  for (let i = 0; i < s.werte.length; i++) {
    const v = s.werte[i];
    if (typeof v === 'number' && g.getrennt(v) && !platz.includes(v) && !istFehlend(s, v)) { funde.push({ art: 'ausreisser' as const, spalte: s.name, wert: v, zeile: i, spanne }); if (funde.length > 3) return []; }
  }
  return funde;   // viele "Ausreißer" = schiefe Verteilung, kein Einzelfall
}

export function pruefe(spalten: Iterable<SpalteDaten>): Fund[] {
  const aus: Fund[] = [];
  for (const s of spalten) {
    if (/^(nr|id|lfdn|lfd_?nr|nummer|fall|case)$/i.test(s.name)) continue;
    const sw = schreibweisen(s); if (sw) aus.push(sw);
    const ph = platzhalter(s); aus.push(...ph);
    const le = leere(s); if (le) aus.push(le);
    aus.push(...ausreisser(s, ph.map(f => (f as { wert: number }).wert)));
  }
  const rang = { schreibweise: 0, platzhalter: 1, leer: 2, ausreisser: 3 } as const;
  return aus.sort((a, b) => rang[a.art] - rang[b.art]);
}
