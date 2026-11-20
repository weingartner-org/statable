/**
 * Bauteile der Psychologie-Fragen `psy2-` (Stufe 6.3 „nutzen“, 09.11.2026): Antwort und Sollwert-Hilfen aus der JSON-Datei des Prüfers,
 * damit jede Zahl im Text und in der Tabelle aus `lib/testdaten/ueben-erwartet-psych.json` (R, scripts/ueben-erwartet-psych.R) kommt und nie von Hand steht.
 * Wie in fragen-beispiele-echt.ts: `Z(<beispiel>).d/e/…` holen den Wert, runden und setzen das Dezimalzeichen (deutsch Komma, englisch Punkt).
 */
import { P } from '../i18n/laufzeit';
import type { Antwort, Tabelle } from './fragen';
import ERW from '../lib/testdaten/ueben-erwartet-psych.json';

export const a = (text: Antwort['text'], warum: Antwort['warum'], richtig?: true): Antwort => ({ text, warum, ...(richtig ? { richtig } : {}) });
export const THEMA = 'psychologie2';

/** Sollwerte je Beispiel (Schlüssel = Beispiel-Id). */
export const PSY_JSON = (ERW as unknown as { aufgaben: Record<string, Record<string, number>> }).aufgaben;

export const wert = (b: string, k: string): number => {
  const v = PSY_JSON[b]?.[k];
  if (v === undefined) throw new Error(`ueben-erwartet-psych.json: kein Wert „${b}.${k}“`);
  return v;
};
const pText = (v: number): string => (v < 0.001 ? '< 0.001' : `= ${v.toFixed(v >= 0.1 ? 2 : 3)}`);

/**
 * Zahlen eines Beispiels. Texte: `d` deutsch (Komma), `e` englisch (Punkt), `da`/`ea` Betrag, `td`/`te` Wert mal 100 (Prozent), `pd`/`pe` p-Wert („< 0,001“ oder „= 0,023“; „p“ steht davor im Text).
 * Tabellenzellen: `c` (Punkt, die Tabelle setzt das Dezimalzeichen) und `cp` für p-Werte.
 */
export const Z = (b: string) => {
  const f = (k: string, s: number, mal = 1, betrag = false): string => { const v = wert(b, k) * mal; return (betrag ? Math.abs(v) : v).toFixed(s); };
  return {
    d: (k: string, s = 2): string => f(k, s).replace('.', ','),
    e: (k: string, s = 2): string => f(k, s),
    da: (k: string, s = 2): string => f(k, s, 1, true).replace('.', ','),
    ea: (k: string, s = 2): string => f(k, s, 1, true),
    td: (k: string, s = 2): string => f(k, s, 100).replace('.', ','),
    te: (k: string, s = 2): string => f(k, s, 100),
    pd: (k: string): string => pText(wert(b, k)).replace('.', ','),
    pe: (k: string): string => pText(wert(b, k)),
    c: (k: string, s = 2): string | number => (s === 0 ? Number(wert(b, k).toFixed(0)) : wert(b, k).toFixed(s)),
    cp: (k: string): string => { const v = wert(b, k); return v < 0.001 ? '<0.001' : v.toFixed(3); }
  };
};

export const tabelle = (titel: Tabelle['titel'], kopf: Tabelle['kopf'], zeilen: Tabelle['zeilen'], quelle: Tabelle['quelle']): Tabelle => ({ titel, kopf, zeilen, quelle });
export const QU = (de: string, en: string) => P(`Zahlen: Beispiel „${de}“ in Statable, mit R nachgerechnet (Sollwerte der Prüfung).`, `Figures: example "${en}" in Statable, recomputed with R (reference values of the check).`);
