/**
 * Fragetypen-Bibliothek zum Ausfüllen (Paket 2B). Einstieg: reines TypeScript und DOM, ohne Oberflächen-Rahmenwerk und ohne Zustand der App.
 * Dieselbe Bibliothek läuft in Statable (Vorschau, Eingabemaske, Pretest) und später in der eigenständigen Fragebogen-Datei.
 *
 *   zeichneSeite(plan, seite, antworten, optionen)  → <section> mit der Seite
 *   liesAntworten(wurzel)                           → Antworten aus dem DOM
 *   pruefeSeite(plan, seite, antworten, sprache, modus) → Fehler { id, text }
 *   fokussiereSeitentitel(wurzel)                   → Fokus auf die Seitenüberschrift
 *   texte, t(sprache, schluessel, werte)            → Wörterbuch de/en
 *   STIL                                            → die CSS der Bibliothek (steckt auch schon in jeder Wurzel)
 */
export { zeichneSeite, liesAntworten, fokussiereSeitentitel, type Optionen } from './zeichnen';
export { pruefeSeite, type SeitenFehler, type Modus } from './pruefen';
export { texte, t, type Schluessel } from './texte';
export { STIL } from './stil';
