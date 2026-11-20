/**
 * B3 Teil 4b: Daten und R-Skript für den Concept-Mapping-Block (Oberfläche bausteine/ConceptBlock.svelte, Kern lib/conceptmap.ts).
 * Zeilen = Personen (je Zeile das Sortieren einer Person), Spalten = Aussagen (Zahl = Nummer des Stapels). Personen mit einer Lücke entfallen.
 * Spaltennamen kommen im R-Skript nur über rAnzeigeText, Bezeichner nur über rId.
 */
import { istFehlend } from './fehlend';
import { L } from './sitzung.svelte';
import { datenCsv, kom, rDateiBasis, type RSkript, type RSpalte } from './rskript';
import { rAnzeigeText, rGanz } from '../engine/rsicher';

export const CM_MIN_SPALTEN = 6;
export const CM_MAX_SPALTEN = 80;
export const CM_MIN_PERSONEN = 2;

export type CmDatenFehler = { fehler: 'zu-wenig-spalten' | 'zu-viele-spalten' | 'zu-wenig-personen' };

const leer = (sp: RSpalte, v: unknown) => v === null || v === undefined || v === '' || typeof v !== 'number' || !Number.isFinite(v) || istFehlend(sp, v);

/** Sortierungen je Person; Personen mit einer Lücke werden gezählt und weggelassen. */
export function cmDaten(spalten: RSpalte[], zeilen: (string | number | null)[][], namen: string[]): { sorts: number[][]; weg: number } | CmDatenFehler {
  const sp = namen.map(n => spalten.find(c => c.name === n)).filter((c): c is RSpalte => !!c);
  if (sp.length < CM_MIN_SPALTEN) return { fehler: 'zu-wenig-spalten' };
  if (sp.length > CM_MAX_SPALTEN) return { fehler: 'zu-viele-spalten' };
  const ix = sp.map(c => spalten.indexOf(c));
  const sorts: number[][] = []; let weg = 0;
  for (const z of zeilen) {
    const r = sp.map((c, k) => z[ix[k]!]);
    if (r.some((v, k) => leer(sp[k]!, v))) weg++; else sorts.push(r as number[]);
  }
  if (sorts.length < CM_MIN_PERSONEN) return { fehler: 'zu-wenig-personen' };
  return { sorts, weg };
}

/** R-Skript in Basis-R: wie lib/conceptmap.ts (Zusammenlegen zählen, Abstand, cmdscale, hclust ward.D2, cutree; Gruppennummern nach Größe). */
export function baueCmSkript(o: { spalten: RSpalte[]; zeilen: (string | number | null)[][]; benutzt: string[]; gruppen: number; titel: string; datum: string }): RSkript {
  const sp = o.benutzt.map(n => o.spalten.find(c => c.name === n)!).filter(Boolean);
  const csv = datenCsv({ spalten: sp, zeilen: o.zeilen, blattSpalten: [], titel: o.titel, datum: o.datum }, sp);
  const basis = rDateiBasis(o.titel), csvName = `${basis}-daten.csv`, rName = `${basis}.R`;
  const q = rAnzeigeText;
  const namen = sp.map(c => q(c.name)).join(', ');
  const r = [
    `# ${kom(o.titel)}`,
    `# ${L(`Erstellt mit Statable (statable.eu) am ${kom(o.datum)}`, `Created with Statable (statable.eu) on ${kom(o.datum)}`)}`,
    `# ${L('Concept Mapping: Ähnlichkeit = wie viele Personen zwei Aussagen auf denselben Stapel legten, Karte mit klassischer MDS (cmdscale), Gruppen mit Ward (ward.D2). Basis-R, ohne Paket. Die Gruppen benennen Sie selbst.', 'Concept mapping: similarity = how many people put two statements on the same pile, map by classical MDS (cmdscale), groups by Ward (ward.D2). Base R, no package. You name the groups yourself.')}`,
    `# ${L('Starten: Ordner entpacken, in R mit setwd() in den Ordner wechseln (in RStudio: Session > Set Working Directory > To Source File Location), dann source() mit dem Namen dieser Datei.', 'How to start it: unzip the folder, change to it with setwd() in R (in RStudio: Session > Set Working Directory > To Source File Location), then source() this file.')}`,
    '',
    `daten <- read.csv(${q(csvName)}, fileEncoding = "UTF-8", check.names = FALSE, na.strings = "")`,
    `daten <- daten[, c(${namen}), drop = FALSE]`,
    `sorts <- as.matrix(daten[stats::complete.cases(daten), , drop = FALSE])  # ${L('je Zeile das Sortieren einer Person', 'one person\'s sorting per row')}`,
    `k <- ${rGanz(o.gruppen)}  # ${L('Zahl der Gruppen (Ihre Entscheidung)', 'number of groups (your decision)')}`,
    '',
    'p <- nrow(sorts); n <- ncol(sorts)',
    'zus <- matrix(0, n, n)',
    'for (i in seq_len(p)) zus <- zus + outer(sorts[i, ], sorts[i, ], "==")',
    'abstand <- 1 - zus / p; diag(abstand) <- 0',
    'karte <- cmdscale(as.dist(abstand), k = 2)',
    'gruppe <- cutree(hclust(dist(karte), "ward.D2"), k)',
    `# ${L('Gruppen nach Größe absteigend nummerieren (wie Statable)', 'number the groups by size, largest first (as Statable does)')}`,
    'erste <- tapply(seq_len(n), gruppe, min)',
    'ordnung <- order(-as.integer(table(gruppe)), erste)',
    'gruppe <- match(gruppe, ordnung)',
    'print(round(karte, 4)); print(gruppe); print(table(gruppe))',
    ''
  ].join('\n');
  return { r, csv, rName, csvName };
}
