/**
 * Wie groß darf eine Tabelle sein? (Abschlusstest A1)
 * Der Browser-Tab hat höchstens etwa 4 GB Arbeitsspeicher für JavaScript. Die Tabelle liegt mehrfach darin (gelesener Text, Zeilen,
 * Kopie für die Engine, Prüfung im Daten-Check) - ab etwa 400.000 Zeilen × 47 Spalten stürzte der Tab ohne Meldung ab und die Arbeit war weg.
 * Darum wird die Größe VOR dem Einlesen aus der Dateigröße geschätzt (CSV: Zeilen aus der Länge der ersten Zeilen; SPSS: Kopfsatz der Datei)
 * und NACH dem Einlesen genau gezählt. Maß ist die Zahl der Zellen (Zeilen × Spalten). Die Grenzen stehen mit ihrer Messung in
 * `abschlusstest-2026-10-09/A-belastung/` (Übergabe 2026-10-10).
 */
import { L, d } from './sitzung.svelte';
import { ort } from '../i18n/profil';

/**
 * Gemessen (Chrome, 47 Spalten, Bau nach dem Umbau A2; Tabelle im Bericht):
 *   200.000 Zeilen (9,4 Mio. Zellen)  öffnen 12 s, Heap 0,5 GB, Gruppenvergleich 1,5 s;
 *   1.000.000 Zeilen (47 Mio.)        öffnen 73 s, Heap 1,7 GB, Gruppenvergleich 10 s, Regression 16 s (Heap bis 2,2 GB);
 *   2.000.000 Zeilen (94 Mio.)        öffnen 141 s, Heap 3,3 GB - dicht an der Grenze des Tabs (etwa 4 GB), der nächste Schritt riskiert den Absturz.
 * Vorher (ohne den Umbau) stürzte der Tab schon bei 400.000 Zeilen (19 Mio. Zellen) ab.
 * Grenze = die Hälfte des Gemessenen, das noch läuft: höchstens 50 Mio. Zellen und 1 Mio. Zeilen. Ab 10 Mio. Zellen (etwa 200.000 Zeilen bei 47 Spalten)
 * dauert das Öffnen länger als eine halbe Minute - dort kommt der Hinweis.
 */
export const ZELLEN = { warnen: 10_000_000, stopp: 50_000_000 } as const;
/** Mehr Zeilen auch bei wenigen Spalten nicht: die Tabelle wäre höher als der Browser ein Element zeichnen kann (etwa 33 Mio. Pixel). */
export const ZEILEN_MAX = 1_000_000;

export interface Groesse { zeilen: number; spalten: number; zellen: number; /** aus der Dateigröße geschätzt (nicht gezählt) */ geschaetzt: boolean }
export const groesse = (zeilen: number, spalten: number, geschaetzt = false): Groesse => ({ zeilen, spalten, zellen: zeilen * spalten, geschaetzt });
export type Urteil = 'ok' | 'langsam' | 'zugross';
/** Eine Schätzung aus der Dateigröße darf um bis zu 15 % danebenliegen (die ersten Zeilen sind nicht immer typisch): erst darüber wird vor dem Lesen abgelehnt, die genaue Zählung danach entscheidet endgültig. */
const SPIELRAUM = 1.15;
export const urteil = (g: Groesse): Urteil => {
  const f = g.geschaetzt ? SPIELRAUM : 1;
  return g.zellen > ZELLEN.stopp * f || g.zeilen > ZEILEN_MAX * f ? 'zugross' : g.zellen > ZELLEN.warnen ? 'langsam' : 'ok';
};
/** Wie viele Zeilen bei dieser Spaltenzahl höchstens gehen. */
export const maxZeilen = (spalten: number) => Math.min(ZEILEN_MAX, Math.floor(ZELLEN.stopp / Math.max(1, spalten)));

/** Schätzt Zeilen und Spalten einer Textdatei aus ihrem Anfang (die ersten Bytes) und der ganzen Dateigröße. `null`, wenn der Anfang dafür zu kurz ist. */
export function schaetzeText(anfang: string, dateiBytes: number): Groesse | null {
  const zeilen = anfang.split(/\r\n|\n|\r/);
  zeilen.pop();   // die letzte ist meist abgeschnitten
  if (zeilen.length < 3) return null;
  const kopf = zeilen[0]!;
  const spalten = Math.max(...[';', '\t', ',', '|'].map(t => { let n = 1, q = false; for (const c of kopf) { if (c === '"') q = !q; else if (!q && c === t) n++; } return n; }));
  const daten = zeilen.slice(1, 201), proZeile = daten.reduce((a, z) => a + z.length + 1, 0) / daten.length + 0.5;   // + Zeilenende (\n oder \r\n)
  return groesse(Math.max(0, Math.round((dateiBytes - kopf.length) / proZeile)), spalten, true);
}

/** Aus dem Kopfsatz einer SPSS-Datei (.sav/.zsav): Fallzahl und Länge eines Falls in 8-Byte-Feldern (ungefähr die Spaltenzahl). `null`, wenn es keine ist. */
export function schaetzeSav(b: Uint8Array): Groesse | null {
  if (b.length < 84 || b[0] !== 0x24 || b[1] !== 0x46 || b[2] !== 0x4c || (b[3] !== 0x32 && b[3] !== 0x33)) return null;   // „$FL2“ / „$FL3“
  const v = new DataView(b.buffer, b.byteOffset, b.byteLength);
  const klein = v.getInt32(64, true) === 2 || v.getInt32(64, true) === 3;   // Aufbau-Kennung 2 oder 3: kleinste Zahl zuerst
  const faelle = v.getInt32(80, klein), laenge = v.getInt32(68, klein);
  return faelle >= 0 && laenge > 0 ? groesse(faelle, laenge, false) : null;
}

const zahl = (v: number) => v.toLocaleString(ort());
const rund = (v: number) => zahl(Math.floor(v / 1000) * 1000);
/** Tabellenkalkulationen (.xlsx, .ods): Zeilen und Spalten stehen erst nach dem Entpacken fest; vorher gilt die Dateigröße (Zahlen brauchen etwa 3,6 Byte je Zelle, gepackt). */
export const BYTES_JE_ZELLE = 3.6;
export const maxBytesTabelle = ZELLEN.stopp * BYTES_JE_ZELLE;
export const groesseAusBytes = (bytes: number): Groesse => ({ zeilen: 0, spalten: 0, zellen: Math.round(bytes / BYTES_JE_ZELLE), geschaetzt: true });

/** Meldung, wenn die Datei zu groß ist: wie groß, was Statable schafft, was man tun kann. `g.spalten === 0`: nur die Dateigröße ist bekannt. */
export function zuGrossText(name: string, g: Groesse, bytes = 0): { titel: string; text: string; tun: string } {
  const mb = zahl(Math.round(bytes / 1e6));
  const bei = rund(maxZeilen(g.spalten));
  return {
    titel: L('Diese Datei ist zu groß für Statable', 'This file is too large for Statable'),
    text: g.spalten === 0
      ? L(`„${name}“ ist ${mb} MB groß, das sind mehr als ${zahl(ZELLEN.stopp / 1e6)} Millionen Zellen. Das schafft Statable nicht; der Browser stürzt dabei ab.`, `"${name}" is ${mb} MB, which is more than ${zahl(ZELLEN.stopp / 1e6)} million cells. Statable cannot handle that; the browser crashes.`)
      : g.geschaetzt
        ? L(`„${name}“ hat etwa ${zahl(g.zeilen)} Zeilen und ${g.spalten} Spalten. Bei ${g.spalten} Spalten schafft Statable bis zu ${bei} Zeilen. Darüber kann der Browser abstürzen.`, `"${name}" has about ${zahl(g.zeilen)} rows and ${g.spalten} columns. With ${g.spalten} columns Statable handles up to ${bei} rows. Beyond that the browser may crash.`)
        : L(`„${name}“ hat ${zahl(g.zeilen)} Zeilen und ${g.spalten} Spalten. Bei ${g.spalten} Spalten schafft Statable bis zu ${bei} Zeilen. Darüber kann der Browser abstürzen.`, `"${name}" has ${zahl(g.zeilen)} rows and ${g.spalten} columns. With ${g.spalten} columns Statable handles up to ${bei} rows. Beyond that the browser may crash.`),
    tun: d('Verkleinere die Datei vorher: behalte nur die Spalten, die du brauchst, oder eine Zufallsauswahl der Zeilen. Bei so vielen Personen reicht eine Zufallsauswahl meist aus.',
      'Verkleinern Sie die Datei vorher: Behalten Sie nur die Spalten, die Sie brauchen, oder eine Zufallsauswahl der Zeilen. Bei so vielen Personen reicht eine Zufallsauswahl meist aus.',
      'Make the file smaller first: keep only the columns you need, or a random selection of the rows. With this many people a random selection is usually enough.')
  };
}
/** Hinweis nach dem Öffnen einer großen Tabelle (noch unter der Grenze). */
export const langsamText = (g: Groesse) => L(`Große Tabelle: ${zahl(g.zeilen)} Zeilen · ${g.spalten} Spalten. Jeder Schritt dauert jetzt einige Sekunden, das Öffnen eine Weile. Statable schafft bis zu ${rund(maxZeilen(g.spalten))} Zeilen bei dieser Spaltenzahl.`, `Large table: ${zahl(g.zeilen)} rows · ${g.spalten} columns. Each step now takes a few seconds, and opening takes a while. Statable handles up to ${rund(maxZeilen(g.spalten))} rows with this many columns.`);
