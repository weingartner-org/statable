/**
 * Gemeinsame Grundlage für Prüfer, Redeanteile, Ausgabe und Bearbeiten (Fachblatt Stufe 4, 4A/4B):
 * Wo stehen in einem Transkript die Kennung („Name: “), der Inhalt und die Rand-Zeitmarken eines Beitrags?
 * Alle Positionen zählen in Unicode-Codepoints ab 0, Ende exklusiv (wie `abschnitte`).
 */
import type { Dokument } from './qualprojekt';
import { leseZeit } from './zeitmarken';

/** Zeitmarken im Text: f4 `#hh:mm:ss-d#`, `[hh:mm:ss]`, `(hh:mm:ss)`. */
export const MARKE = /#\d{2,}:\d{2}:\d{2}-\d#|\[\d{2,}:\d{2}:\d{2}\]|\(\d{2,}:\d{2}:\d{2}\)/;
export const MARKE_ALLE = new RegExp(MARKE.source, 'g');
const MARKE_ANFANG = /^(?:#\d{2,}:\d{2}:\d{2}-\d#|\[\d{2,}:\d{2}:\d{2}\]|\(\d{2,}:\d{2}:\d{2}\)|\d{2,}:\d{2}:\d{2}(?=\s))[ \t]*/;
const MARKE_ENDE = /[ \t]*(?:#\d{2,}:\d{2}:\d{2}-\d#|\[\d{2,}:\d{2}:\d{2}\]|\(\d{2,}:\d{2}:\d{2}\))\s*$/;

export interface BeitragTeile {
  /** `Name: ` am Anfang (mit Leerzeichen danach); leer (start == ende), wenn der Beitrag keine Kennung im Text hat */
  kennung: { start: number; ende: number; art?: 'name' | 'id' };
  /** der Inhalt ohne Kennung und ohne Rand-Zeitmarken */
  inhalt: { start: number; ende: number };
}

/** Die Codepoints des Textes (einmal berechnen, wenn viele Beiträge gebraucht werden). */
export const codepoints = (text: string): string[] => Array.from(text);

export function beitragTeile(cps: string[], dok: Dokument, i: number): BeitragTeile {
  const a = dok.transkript?.abschnitte[i];
  if (!a) throw new Error('Diesen Beitrag gibt es nicht.');
  const s = cps.slice(a.start, a.ende).join('');
  let pos = 0;
  const m1 = MARKE_ANFANG.exec(s); if (m1) pos = m1[0].length;
  const sp = a.sprecher ? dok.transkript!.sprecher.find((x) => x.id === a.sprecher) : undefined;
  let kennung = { start: pos, ende: pos } as BeitragTeile['kennung'];
  if (a.sprecher) {
    const rest = s.slice(pos);
    for (const [art, kand] of [['name', sp?.name], ['id', a.sprecher]] as const) {
      if (kand && rest.startsWith(kand + ':')) {
        let e = pos + kand.length + 1;
        while (s[e] === ' ' || s[e] === '\t') e++;
        kennung = { start: pos, ende: e, art };
        break;
      }
    }
  }
  pos = kennung.ende;
  const m2 = MARKE_ANFANG.exec(s.slice(pos)); if (m2) pos += m2[0].length;
  let ende = s.length;
  const m3 = MARKE_ENDE.exec(s.slice(pos));
  if (m3) ende = pos + m3.index;
  // Zeichenpositionen in UTF-16 (s) → Codepoints
  const cp = (idx: number) => Array.from(s.slice(0, idx)).length;
  return {
    kennung: { start: a.start + cp(kennung.start), ende: a.start + cp(kennung.ende), art: kennung.art },
    inhalt: { start: a.start + cp(pos), ende: a.start + Math.max(cp(pos), cp(ende)) }
  };
}

/** Inhalt eines Abschnitts ohne `Name: ` und ohne Rand-Zeitmarke. */
export function inhaltVon(dok: Dokument, i: number): string {
  const cps = codepoints(dok.text);
  const t = beitragTeile(cps, dok, i);
  return cps.slice(t.inhalt.start, t.inhalt.ende).join('');
}

/** Alle Inhalte auf einmal (ein Durchlauf über den Text). */
export function alleInhalte(dok: Dokument): string[] {
  const cps = codepoints(dok.text);
  return (dok.transkript?.abschnitte ?? []).map((_, i) => { const t = beitragTeile(cps, dok, i); return cps.slice(t.inhalt.start, t.inhalt.ende).join(''); });
}

/** Die letzte Zeitmarke im Text eines Beitrags in Millisekunden (oder `undefined`). */
export function markeImText(s: string): number | undefined {
  const alle = s.match(MARKE_ALLE);
  if (!alle) return undefined;
  const z = leseZeit(alle[alle.length - 1]!);
  return z === null ? undefined : z;
}
export const hatMarke = (s: string): boolean => MARKE.test(s);
/** Länge in Codepoints. */
export const cpLen = (s: string): number => Array.from(s).length;
