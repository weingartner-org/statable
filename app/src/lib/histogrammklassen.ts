/**
 * Histogramm mit frei gewählten Klassen: Breite und Anfang bestimmt die Person, nicht die Regel von R (`hist`). Klassen sind links geschlossen, rechts offen
 * (von 10 bis unter 20); die letzte Klasse schließt den größten Wert ein. Mit gleicher Achse und gleicher Höhe lassen sich Gruppen nebeneinander vergleichen.
 * Gerechnet wird nur gezählt (Test: histogrammklassen.test.ts).
 */
import { histogramm } from './diagrammdaten';
import { L, Lp } from './sitzung.svelte';
import { zahlDe } from './format';

export const KLASSEN_MAX = 60;
export interface Klassen { anfang: number; breite: number; grenzen: number[]; anzahl: number[]; n: number; /** Werte unter dem Anfang (werden nicht gezählt) */ darunter: number }

/** Zählt die Werte in Klassen ab `anfang` mit `breite`; so viele Klassen, bis der größte Wert drin ist. `null` bei ungültiger Wahl oder über KLASSEN_MAX Klassen. */
export function klassenMit(werte: number[], breite: number, anfang: number): Klassen | null {
  const x = werte.filter(Number.isFinite);
  if (!x.length || !(breite > 0) || !Number.isFinite(anfang)) return null;
  const hi = Math.max(...x), k = Math.max(1, Math.floor((hi - anfang) / breite + 1e-9) + 1);
  if (k > KLASSEN_MAX) return null;
  const anzahl = new Array<number>(k).fill(0);
  let darunter = 0;
  for (const v of x) { if (v < anfang) { darunter++; continue; } anzahl[Math.min(k - 1, Math.floor((v - anfang) / breite + 1e-9))]!++; }
  return { anfang, breite, grenzen: Array.from({ length: k + 1 }, (_, i) => Number((anfang + i * breite).toPrecision(12))), anzahl, n: x.length - darunter, darunter };
}
/** Vorschlag wie das gewöhnliche Histogramm (Regel von R): Breite und Anfang der Klassen für alle Werte zusammen. */
export function klassenVorschlag(alle: number[]): { breite: number; anfang: number } | null {
  const h = histogramm(alle);
  return h ? { breite: h.breite, anfang: h.grenzen[0]! } : null;
}
/** Anzahl der Gipfel (Klassen, die höher sind als beide Nachbarn; gleich hohe Nachbarn zählen als ein Gipfel). */
export function gipfel(anzahl: number[]): number {
  const a = anzahl.filter((v, i) => i === 0 || v !== anzahl[i - 1]), z = [0, ...a, 0];
  let g = 0;
  for (let i = 1; i < z.length - 1; i++) if (z[i]! > z[i - 1]! && z[i]! > z[i + 1]!) g++;
  return g;
}
/** Gleiche Achse für alle Gruppen: eine Klasseneinteilung für alle Werte, die höchste Säule bestimmt die Höhe. */
export function klassenJeGruppe(je: Record<string, number[]>, breite: number, anfang: number): { namen: string[]; klassen: Record<string, Klassen>; hoechste: number; grenzen: number[] } | null {
  const alle = Object.values(je).flat();
  const gesamt = klassenMit(alle, breite, anfang);
  if (!gesamt) return null;
  const namen = Object.keys(je), klassen: Record<string, Klassen> = {};
  for (const n of namen) {
    const k = klassenMit(je[n]!, breite, anfang);
    if (!k) return null;
    // auf dieselbe Zahl Klassen bringen
    while (k.anzahl.length < gesamt.anzahl.length) k.anzahl.push(0);
    k.grenzen = gesamt.grenzen;
    klassen[n] = k;
  }
  return { namen, klassen, hoechste: Math.max(...namen.flatMap(n => klassen[n]!.anzahl)), grenzen: gesamt.grenzen };
}
/** Hinweis, wie die Wahl der Klassen den Eindruck ändert - mit der Zahl der Gipfel bei der jetzigen Wahl. */
export function klassenHinweis(k: Klassen): string {
  const g = gipfel(k.anzahl), z = k.anzahl.length;
  const klassenSatz = Lp(z, `Mit Breite ${zahlDe(k.breite)} und Anfang ${zahlDe(k.anfang)} ist es ${z} Klasse.`, `Mit Breite ${zahlDe(k.breite)} und Anfang ${zahlDe(k.anfang)} sind es ${z} Klassen.`,
    `With width ${zahlDe(k.breite)} and start ${zahlDe(k.anfang)} there is ${z} class.`, `With width ${zahlDe(k.breite)} and start ${zahlDe(k.anfang)} there are ${z} classes.`);
  const gipfelSatz = Lp(g, `Davon zeigt sich ${g} Gipfel.`, `Davon zeigen sich ${g} Gipfel.`, `${g} peak shows up.`, `${g} peaks show up.`);
  const jetzt = `${klassenSatz} ${gipfelSatz}`;
  const rat = L('Schmale Klassen zeigen viele kleine Zacken, die oft nur Zufall sind. Breite Klassen glätten, bis echte Besonderheiten wie zwei Gipfel verschwinden. Auch ein anderer Anfang verschiebt die Balken und kann die Form ändern. Erst mehrere Wahlen ansehen, dann der Form trauen.',
    'Narrow classes show many small spikes that are often just chance. Wide classes smooth the picture until real features such as two peaks disappear. A different start also shifts the bars and can change the shape. Try several settings before you trust the shape.');
  return `${jetzt} ${rat}`;
}
export const klassenAusserhalb = (n: number) => (n > 0 ? Lp(n, `${n} Wert liegt unter dem Anfang und wird nicht gezählt.`, `${n} Werte liegen unter dem Anfang und werden nicht gezählt.`, `${n} value lies below the start and is not counted.`, `${n} values lie below the start and are not counted.`) : '');
