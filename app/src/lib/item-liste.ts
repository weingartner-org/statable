/**
 * Zählt ein Text drei oder mehr Fragen mit Kennung und Wortlaut auf (A1 „…“, A2 „…“ und A5 „…“ / 1 „…“ 2 „…“), wird daraus eine Liste:
 * Johannes 13.11.2026: in der Auswertung sind die Fragen gelistet, in „Fragen“ standen sie noch als Fließtext. Gilt für alle Sprachen
 * (Anführungszeichen „“ "" “” «» ‚‘ und ein kurzes Bindewort zwischen zwei Einträgen: und, and, et, y, sowie …).
 */
export type TextTeil = { art: 'text'; t: string } | { art: 'liste'; eintraege: string[] };

const ZITAT = String.raw`(?:„[^“”"]{1,200}[“”"]|"[^"]{1,200}"|“[^”]{1,200}”|«[^»]{1,200}»|‚[^‘’]{1,200}[‘’])`;
const EINTRAG = String.raw`(?:\p{Lu}{1,3}\d{1,2}|\d{1,2})\s?${ZITAT}`;
/** Zwischen zwei Einträgen: Komma und/oder ein kurzes Bindewort, oder nur ein Leerzeichen. */
const TRENNER = String.raw`(?:\s*,?\s*(?:\p{L}{1,5}\s+)?)`;
const LAUF = new RegExp(`${EINTRAG}(?:${TRENNER}${EINTRAG})+`, 'gu');
const EIN = new RegExp(EINTRAG, 'gu');

/** Text in Absätze und Listen teilen; ohne Aufzählung von mindestens `mind` Fragen bleibt er ein Teil. */
export function teileItems(text: string, mind = 3): TextTeil[] {
  const teile: TextTeil[] = [];
  let pos = 0;
  for (const m of text.matchAll(LAUF)) {
    const eintraege = m[0].match(EIN) ?? [];
    if (eintraege.length < mind) continue;
    teile.push({ art: 'text', t: text.slice(pos, m.index) }, { art: 'liste', eintraege: eintraege.map(e => e.trim()) });
    pos = m.index! + m[0].length;
  }
  teile.push({ art: 'text', t: text.slice(pos) });
  // Satzzeichen, die nur die Aufzählung abschlossen, fallen weg; leere Teile auch.
  return teile
    .map((x, i): TextTeil => (x.art === 'text' ? { art: 'text', t: (i > 0 ? x.t.replace(/^\s*[.,;:]?\s*/u, '') : x.t).trim() } : x))
    .filter(x => x.art === 'liste' || x.t.length > 0);
}
