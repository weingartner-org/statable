/**
 * Reine Logik des Bausteins „Selbst rechnen“ (ohne Oberfläche): Zahl aus einer Eingabe lesen, Antwort prüfen, Stand einer Rechenaufgabe fortschreiben.
 * Die Aufgaben selbst stehen in `rechenaufgaben.ts`, die Anzeige in `bausteine/RechenAufgabe.svelte`. Ergebnisse zählen nur im Browser-Lernstand (`lib/lernzustand.svelte.ts`).
 *
 * Regel für „durchgemacht“: Jeder Schritt muss einmal richtig eingegeben sein. Den Rechenweg anzusehen allein zählt nie;
 * wer ihn vorher angesehen hat, gibt das Ergebnis danach trotzdem selbst ein und zählt als „mit Rechenweg“.
 */

/**
 * Liest eine Zahl, wie Menschen sie tippen: Komma oder Punkt als Dezimalzeichen, Leerzeichen und Minuszeichen (− oder -) sind erlaubt.
 * Steht beides darin, gilt das letzte Zeichen als Dezimalzeichen und das andere als Tausendertrenner („1.234,5“ und „1,234.5“).
 * Ein einzelnes Trennzeichen ist immer ein Dezimalzeichen („1,234“ ist 1,234). Alles andere (Text, mehrere Dezimalzeichen) ist keine Zahl.
 */
export function leseZahl(roh: string): number | null {
  let t = roh.replace(/[\s   ']/g, '').replace(/[−‒–]/g, '-');
  if (!t || /[^0-9.,+-]/.test(t)) return null;
  const vz = /^[+-]/.exec(t)?.[0] === '-' ? -1 : 1;
  t = t.replace(/^[+-]/, '');
  if (!/^[0-9.,]+$/.test(t) || !/\d/.test(t)) return null;
  const komma = t.split(',').length - 1, punkt = t.split('.').length - 1;
  let ganz: string, rest = '';
  if (komma && punkt) {
    const dez = t.lastIndexOf(',') > t.lastIndexOf('.') ? ',' : '.', tau = dez === ',' ? '.' : ',';
    if (t.split(dez).length > 2) return null;
    const [a, b = ''] = t.split(dez);
    if (!a || !b || !a.split(tau).every((g, i) => (i === 0 ? /^\d{1,3}$/.test(g) : /^\d{3}$/.test(g)))) return null;
    ganz = a.split(tau).join(''); rest = b;
  } else if (komma > 1 || punkt > 1) return null;
  else if (komma || punkt) {
    const [a = '', b = ''] = t.split(komma ? ',' : '.');
    if (!/^\d*$/.test(a) || !/^\d*$/.test(b) || (!a && !b)) return null;
    ganz = a || '0'; rest = b;
  } else ganz = t;
  if (!/^\d+$/.test(ganz) || (rest && !/^\d+$/.test(rest))) return null;
  const x = Number(rest ? `${ganz}.${rest}` : ganz);
  return Number.isFinite(x) ? vz * x : null;
}

/** Was an einem Schritt zu prüfen ist: das Soll, die erlaubte Abweichung und bekannte Fehlwege (Zahl, die man bei einem typischen Fehler erhält). */
export interface Pruefbar { soll: number; toleranz: number; fehler?: readonly { wert: number }[] }

export type Urteil =
  | { art: 'leer' }
  | { art: 'keineZahl' }
  | { art: 'richtig'; wert: number }
  /** `fehler`: Platz des erkannten Fehlwegs in `Pruefbar.fehler`; fehlt er, ist es ein Fehler ohne bekanntes Muster. */
  | { art: 'falsch'; wert: number; fehler?: number };

const nah = (a: number, b: number, tol: number) => Math.abs(a - b) <= tol + 1e-12;

/** Prüft eine Eingabe gegen das Soll. Ein Fehlweg wird nur erkannt, wenn die Eingabe nicht zugleich das Soll trifft. */
export function pruefe(eingabe: string, s: Pruefbar): Urteil {
  if (!eingabe.trim()) return { art: 'leer' };
  const x = leseZahl(eingabe);
  if (x === null) return { art: 'keineZahl' };
  if (nah(x, s.soll, s.toleranz)) return { art: 'richtig', wert: x };
  const i = s.fehler?.findIndex(f => nah(x, f.wert, s.toleranz)) ?? -1;
  return i >= 0 ? { art: 'falsch', wert: x, fehler: i } : { art: 'falsch', wert: x };
}

export interface SchrittStand {
  eingabe: string;
  /** Mindestens einmal richtig eingegeben. */
  richtig: boolean;
  versuche: number;
  /** Der Rechenweg wurde angesehen (bevor oder nachdem das Ergebnis stimmte). */
  wegGesehen: boolean;
  /** Der Rechenweg war schon offen, als das Ergebnis richtig eingegeben wurde. */
  mitWeg: boolean;
  urteil?: Urteil;
}
export interface RechenStand { schritte: SchrittStand[] }

export const leererSchritt = (): SchrittStand => ({ eingabe: '', richtig: false, versuche: 0, wegGesehen: false, mitWeg: false });
export const leererRechenStand = (n: number): RechenStand => ({ schritte: Array.from({ length: n }, leererSchritt) });

const ersetze = (st: RechenStand, i: number, f: (s: SchrittStand) => SchrittStand): RechenStand => ({ schritte: st.schritte.map((s, k) => (k === i ? f(s) : s)) });

/** Die Eingabe im Feld ändert sich: das letzte Urteil gilt nicht mehr, ein richtiger Schritt bleibt richtig. */
export const tippe = (st: RechenStand, i: number, eingabe: string): RechenStand => ersetze(st, i, s => ({ ...s, eingabe, urteil: undefined }));

/** „Prüfen“: eine leere Eingabe oder Nicht-Zahl zählt nicht als Versuch. */
export function pruefeSchritt(st: RechenStand, i: number, s: Pruefbar): { stand: RechenStand; urteil: Urteil } {
  const alt = st.schritte[i];
  if (!alt) return { stand: st, urteil: { art: 'leer' } };
  const urteil = pruefe(alt.eingabe, s);
  const zaehlt = urteil.art === 'richtig' || urteil.art === 'falsch';
  return {
    urteil,
    stand: ersetze(st, i, x => ({ ...x, urteil, versuche: x.versuche + (zaehlt ? 1 : 0), richtig: x.richtig || urteil.art === 'richtig', mitWeg: x.mitWeg || (urteil.art === 'richtig' && x.wegGesehen) }))
  };
}

/** „Rechenweg zeigen“: der Weg ist offen; zählt noch nicht als Lösung. */
export const zeigeWeg = (st: RechenStand, i: number): RechenStand => ersetze(st, i, s => (s.wegGesehen ? s : { ...s, wegGesehen: true }));

/** Alle Schritte richtig eingegeben: die Aufgabe ist durchgemacht. */
export const aufgabeFertig = (st: RechenStand): boolean => st.schritte.length > 0 && st.schritte.every(s => s.richtig);
/** Erster Schritt, der noch nicht stimmt (für den Fokus), sonst -1. */
export const ersterOffenerSchritt = (st: RechenStand): number => st.schritte.findIndex(s => !s.richtig);
/** Zahl der richtigen Schritte. */
export const richtigeSchritte = (st: RechenStand): number => st.schritte.filter(s => s.richtig).length;
/** Wurde die Aufgabe nur mit Hilfe des Rechenwegs gelöst (mindestens ein Schritt)? */
export const mitRechenweg = (st: RechenStand): boolean => st.schritte.some(s => s.mitWeg);
