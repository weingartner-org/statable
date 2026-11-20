/** Fragen (Items) mit Namen und Text anzeigen: „Q4 · Ich kann mich schlecht konzentrieren“ - wie die SPSS-Anzeige „Namen und Beschriftungen“.
 *  Rein für die Anzeige: gerechnet und gelesen wird mit dem, was PSPP druckt; erst danach werden die Zeilenköpfe und die Namen im Ergebnis ergänzt. */
import type { OutputItem } from '../engine/types';

/** Name und Bezeichnung einer Frage; ohne Bezeichnung (oder wenn sie schon mit dem Namen beginnt) bleibt es, wie es ist. */
export const itemAnzeige = (name: string, bezeichnung: string | undefined): string => {
  const b = (bezeichnung ?? '').trim();
  return !b || b === name || b.toLowerCase().startsWith(name.toLowerCase()) ? (b || name) : `${name} · ${b}`;
};

/** Schlüssel → Anzeige für die gewählten Fragen: der Name, die volle Bezeichnung und die gekürzte Bezeichnung zeigen alle auf dieselbe Anzeige. */
export function itemKarte(spalten: { name: string; bezeichnung?: string; kurz: string }[]): Map<string, string> {
  const m = new Map<string, string>();
  for (const s of spalten) { const a = itemAnzeige(s.name, s.bezeichnung); for (const k of [s.name, s.bezeichnung ?? '', s.kurz]) if (k && a !== k) m.set(k, a); }
  return m;
}

/** Zeilenköpfe (erste Spalte) aller Tabellen, die genau eine Frage benennen, durch die Anzeige ersetzen. Ändert `items` an Ort und Stelle. */
export function itemZeilenkoepfe(items: OutputItem[], karte: Map<string, string>): OutputItem[] {
  if (!karte.size) return items;
  for (const i of items) if (i.type === 'table') for (const c of i.cells) if (c.c === 0 && c.r >= i.headRows[0] && karte.has(c.t)) c.t = karte.get(c.t)!;
  return items;
}

/** Namen in einem Ergebnis (Listen von Texten) ergänzen. */
export const itemNamen = (liste: string[], karte: Map<string, string>) => liste.map(t => karte.get(t) ?? t);
