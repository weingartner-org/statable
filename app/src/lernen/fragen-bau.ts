/**
 * Hilfen für die Fragedateien von „Üben“ (fragen-<thema>.ts): Zahlen und Tabellen kommen ausschließlich aus
 * app/src/lib/testdaten/ueben-erwartet.json (gerechnet von scripts/ueben-erwartet.R in R, Fachblatt UEBEN-MC.md).
 * Keine Zahl von Hand: `zd('schluessel', stellen)` setzt sie deutsch (Komma), `ze(...)` englisch (Punkt) in den festen Text.
 * Der Test fragen.test.ts vergleicht Tabellen und jede Dezimalzahl im Text mit der JSON-Datei.
 */
import type { Paar } from '../i18n/laufzeit';
import type { Tabelle, Diagramm } from './fragen';
import ERW from '../lib/testdaten/ueben-erwartet.json';

const ALLE = ERW as unknown as Record<string, (string | number)[][]>;
export const W = (ERW as unknown as { werte: Record<string, number> }).werte;

const wert = (k: string): number => { const v = W[k]; if (v === undefined) throw new Error(`ueben-erwartet.json: kein Wert „${k}“`); return v; };
/** Zahl aus der Erwartungsdatei, deutsch (Komma) und englisch (Punkt); `stellen` = Nachkommastellen. */
export const zd = (k: string, stellen = 2): string => wert(k).toFixed(stellen).replace('.', ',');
export const ze = (k: string, stellen = 2): string => wert(k).toFixed(stellen);
/** Betrag (ohne Vorzeichen), etwa um „Betrag der Ladung“ zu nennen. */
export const za = (k: string, stellen = 2): string => Math.abs(wert(k)).toFixed(stellen).replace('.', ',');
export const zae = (k: string, stellen = 2): string => Math.abs(wert(k)).toFixed(stellen);
/** Prozent als ganze Zahl (aus einem Anteil 0,55 wird 55); `zpr` ist der Rest bis 100. */
export const zp = (k: string): string => String(Math.round(wert(k) * 100));
export const zpr = (k: string): string => String(100 - Math.round(wert(k) * 100));
/** Ganze Zahl (Fallzahl, Anzahl). */
export const zn = (k: string): string => { const v = wert(k); if (!Number.isInteger(v)) throw new Error(`${k} ist keine ganze Zahl`); return String(v); };

/** Tabelle: Zeilen stammen aus der Erwartungsdatei (Schlüssel = Frage-id oder `<Fall>.<Nr>`). */
export const tab = (schluessel: string, kopf: Paar[], quelle: Paar, titel?: Paar): Tabelle => {
  const zeilen = ALLE[schluessel];
  if (!zeilen) throw new Error(`ueben-erwartet.json: keine Tabelle „${schluessel}“`);
  return { ...(titel ? { titel } : {}), kopf, zeilen, quelle };
};

/**
 * Streudiagramm: Punkte aus der Erwartungsdatei (Schlüssel = Frage-id oder `<Fall>.<Nr>`; Zeilen `[x, y]` oder `[x, y, Gruppe]`).
 * `geraden`: Schlüssel in `werte` für Achsenabschnitt `a` und Steigung `b` (y = a + b·x), optional für eine Gruppe.
 */
export const diag = (
  schluessel: string,
  o: { x: Paar; y: Paar; kurz: Paar; quelle: Paar; titel?: Paar; gruppen?: Paar[]; geraden?: { a: string; b: string; gruppe?: number }[] }
): Diagramm => {
  const zeilen = ALLE[schluessel];
  if (!zeilen) throw new Error(`ueben-erwartet.json: kein Diagramm „${schluessel}“`);
  const n = o.gruppen?.length ?? 0;
  if (n > 4) throw new Error(`Diagramm „${schluessel}“: höchstens 4 Gruppen`);
  const punkte = zeilen.map((z, i) => {
    if (z.length !== (n ? 3 : 2) || !z.every(v => typeof v === 'number')) throw new Error(`Diagramm „${schluessel}“, Zeile ${i + 1}: ${n ? '[x, y, Gruppe]' : '[x, y]'} aus Zahlen erwartet`);
    if (n && !(Number.isInteger(z[2]) && z[2]! >= 0 && z[2]! < n)) throw new Error(`Diagramm „${schluessel}“, Zeile ${i + 1}: Gruppe ${z[2]} gibt es nicht`);
    return z as number[];
  });
  return {
    art: 'streu', ...(o.titel ? { titel: o.titel } : {}), x: o.x, y: o.y, ...(o.gruppen ? { gruppen: o.gruppen } : {}), punkte,
    ...(o.geraden ? { geraden: o.geraden.map(g => ({ a: wert(g.a), b: wert(g.b), ...(g.gruppe !== undefined ? { gruppe: g.gruppe } : {}) })) } : {}),
    kurz: o.kurz, quelle: o.quelle
  };
};
