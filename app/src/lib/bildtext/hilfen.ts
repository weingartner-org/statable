/** Gemeinsame Bausteine der Schablonen (Welle 4): Achsensätze, Grenzen für Listen und Tabellen. */
import { L, Lp } from '../sitzung.svelte';
import { z, vonBis, sauber } from './zahlen';
import type { Achse, BildText } from './typen';

/** Mehr Elemente als das: die Liste steht nur in der Tabelle (BookAccess: große Mengen nicht aufzählen). */
export const MAX_LISTE = 20;
/** Tabellen werden bei so vielen Zeilen gekürzt (Seite bleibt bedienbar); der Text sagt es. */
export const MAX_ZEILEN = 500;

export const leer = (titel: string): BildText => ({ kurz: '', beschreibung: [], liste: [], tabelle: { titel, kopf: [], zeilen: [], zeilenKopf: true } });
/** Name mit Einheit: „Gewicht (kg)“. */
export const mitEinheit = (name: string, einheit?: string): string => sauber(einheit ? `${name} (${einheit})` : name);
export const titelOder = (titel: string | undefined, fallback: string): string => sauber(titel?.trim() ? titel.trim() : fallback);

/** Satz zur Achse: Beschriftung, Bereich von bis, Schrittweite. `von`/`bis` aus `fallback`, wenn die Achse sie nicht trägt. */
export function achsenSatz(waagrecht: boolean, a: Achse | undefined, fallback?: [number, number]): string {
  const name = a ? mitEinheit(a.name, a.einheit) : '';
  const von = a?.von ?? fallback?.[0], bis = a?.bis ?? fallback?.[1];
  const bereich = von !== undefined && bis !== undefined && Number.isFinite(von) && Number.isFinite(bis);
  if (!name && !bereich) return '';
  const b = bereich ? vonBis(z(von), z(bis)) : '';
  const s = a?.schritt !== undefined ? z(a.schritt) : '';
  if (waagrecht) {
    if (!bereich) return L(`Waagrechte Achse: ${name}.`, `Horizontal axis: ${name}.`);
    if (s) return name ? L(`Waagrechte Achse: ${name}, ${b}, Schrittweite ${s}.`, `Horizontal axis: ${name}, ${b}, step ${s}.`) : L(`Waagrechte Achse: ${b}, Schrittweite ${s}.`, `Horizontal axis: ${b}, step ${s}.`);
    return name ? L(`Waagrechte Achse: ${name}, ${b}.`, `Horizontal axis: ${name}, ${b}.`) : L(`Waagrechte Achse: ${b}.`, `Horizontal axis: ${b}.`);
  }
  if (!bereich) return L(`Senkrechte Achse: ${name}.`, `Vertical axis: ${name}.`);
  if (s) return name ? L(`Senkrechte Achse: ${name}, ${b}, Schrittweite ${s}.`, `Vertical axis: ${name}, ${b}, step ${s}.`) : L(`Senkrechte Achse: ${b}, Schrittweite ${s}.`, `Vertical axis: ${b}, step ${s}.`);
  return name ? L(`Senkrechte Achse: ${name}, ${b}.`, `Vertical axis: ${name}, ${b}.`) : L(`Senkrechte Achse: ${b}.`, `Vertical axis: ${b}.`);
}
/** Achse mit Kategorien (keine Zahlen). */
export function kategorieAchse(waagrecht: boolean, name: string | undefined, k: number): string {
  const n = sauber(name ?? '');
  const m = Lp(k, `${k} Kategorie`, `${k} Kategorien`, `${k} category`, `${k} categories`);
  if (waagrecht) return n ? L(`Waagrechte Achse: ${n}, ${m}.`, `Horizontal axis: ${n}, ${m}.`) : L(`Waagrechte Achse: ${m}.`, `Horizontal axis: ${m}.`);
  return n ? L(`Senkrechte Achse: ${n}, ${m}.`, `Vertical axis: ${n}, ${m}.`) : L(`Senkrechte Achse: ${m}.`, `Vertical axis: ${m}.`);
}
export const spanne = (w: number[]): [number, number] | undefined => { let lo = Infinity, hi = -Infinity; for (const x of w) if (Number.isFinite(x)) { if (x < lo) lo = x; if (x > hi) hi = x; } return lo <= hi ? [lo, hi] : undefined; };
export const keineDaten = (titel: string, kurz: string): BildText => ({ ...leer(titel), kurz, beschreibung: [kurz] });

/* Zahlwörter mit Einzahl und Mehrzahl (Lp), damit nie „1 Studien“ oder „1 Pfaden“ im Text steht. */
export const nKlassen = (n: number) => Lp(n, `${n} Klasse`, `${n} Klassen`, `${n} class`, `${n} classes`);
export const nWerte = (n: number) => Lp(n, `${n} Wert`, `${n} Werten`, `${n} value`, `${n} values`);
export const nKategorien = (n: number) => Lp(n, `${n} Kategorie`, `${n} Kategorien`, `${n} category`, `${n} categories`);
export const nAusreisser = (n: number) => Lp(n, `${n} Ausreißer`, `${n} Ausreißer`, `${n} outlier`, `${n} outliers`);
export const nGruppen = (n: number) => Lp(n, `${n} Gruppe`, `${n} Gruppen`, `${n} group`, `${n} groups`);
export const nStudien = (n: number) => Lp(n, `${n} Studie`, `${n} Studien`, `${n} study`, `${n} studies`);
export const nPersonen = (n: number) => Lp(n, `${n} Person`, `${n} Personen`, `${n} person`, `${n} people`);
export const nEreignisse = (n: number) => Lp(n, `${n} Ereignis`, `${n} Ereignisse`, `${n} event`, `${n} events`);
export const nFreiheitsgrade = (n: number) => Lp(n, `${n} Freiheitsgrad`, `${n} Freiheitsgrade`, `${n} degree of freedom`, `${n} degrees of freedom`);
export const nKomponenten = (n: number) => Lp(n, `${n} Komponente`, `${n} Komponenten`, `${n} component`, `${n} components`);
export const nEigenwerte = (n: number) => Lp(n, `${n} Eigenwert`, `${n} Eigenwerte`, `${n} eigenvalue`, `${n} eigenvalues`);
export const mitVariablen = (n: number) => Lp(n, `${n} Variable`, `${n} Variablen`, `${n} variable`, `${n} variables`);
export const mitPfaden = (n: number) => Lp(n, `${n} Pfad`, `${n} Pfaden`, `${n} path`, `${n} paths`);
export const inGebieten = (n: number) => Lp(n, `${n} Gebiet`, `${n} Gebieten`, `${n} area`, `${n} areas`);
export const nZeilen = (n: number) => Lp(n, `${n} Zeile`, `${n} Zeilen`, `${n} row`, `${n} rows`);
export const nSpalten = (n: number) => Lp(n, `${n} Spalte`, `${n} Spalten`, `${n} column`, `${n} columns`);
export const nKnoten = (n: number) => Lp(n, `${n} Knoten`, `${n} Knoten`, `${n} node`, `${n} nodes`);
export const nEndknoten = (n: number) => Lp(n, `${n} Endknoten`, `${n} Endknoten`, `${n} end node`, `${n} end nodes`);
export const nEbenen = (n: number) => Lp(n, `${n} Ebene`, `${n} Ebenen`, `${n} level`, `${n} levels`);
export const nStellen = (n: number) => Lp(n, `${n} Stelle`, `${n} Stellen`, `${n} point`, `${n} points`);
