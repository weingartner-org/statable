/** Nur für Tests (M5a): der erfundene Beispieldatensatz pruefdaten/mikro/puf/puf-simuliert.csv als Daten der Sitzung und die Sollwerte aus survey (pruefdaten/mikro/amtlich-soll.R). */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { leseCsv } from './einlesen';
import { s } from './sitzung.svelte';
import type { Spalte } from './verzeichnis';

const WURZEL = join(import.meta.dirname, '../../../pruefdaten/mikro');
export const PUF = join(WURZEL, 'puf/puf-simuliert.csv');
export const SOLL_JSON = join(WURZEL, 'amtlich-soll.json');
export interface SollTabelle { zeilen: string[]; spalten: string[]; n: (number | null)[][]; est: (number | null)[][]; se: (number | null)[][]; cv: (number | null)[][] }
export const ladeSoll = (): Record<string, SollTabelle> => JSON.parse(readFileSync(SOLL_JSON, 'utf8')) as Record<string, SollTabelle>;

/** Die Daten in die Sitzung legen; Gewicht: Spalte `gewicht` als Umfragegewicht (einzeln gezogen nach `klumpenfrei`) oder keins. */
export function setzePuf(gewicht: 'keins' | 'umfrage' | 'haeufigkeit' = 'umfrage', klumpenfrei = false): void {
  const t = leseCsv(readFileSync(PUF, 'utf8'), 'puf');
  const spalten: Spalte[] = t.kopf.map((name, j) => {
    const text = t.zeilen.some(z => typeof z[j] === 'string' && z[j] !== '' && Number.isNaN(Number(z[j])));
    return { name, bezeichnung: '', art: text ? 'text' : 'zahl', niveau: text ? 'nominal' : 'metrisch', format: text ? 'A20' : 'F8.2', fehlend: [], fehlendText: '', werteLabels: {} };
  });
  s.spalten = spalten;
  s.zeilen = t.zeilen.map(z => z.map((v, j) => (v === '' || v === undefined || v === null || v instanceof Date ? null : spalten[j]!.art === 'zahl' ? Number(v) : String(v)))) as typeof s.zeilen;
  s.sets = [];
  s.einst.sprache = 'de'; s.einst.anrede = 'du';
  s.gewichtFrage = null;
  s.gewicht = gewicht === 'keins' ? undefined : gewicht === 'haeufigkeit' ? { spalte: 'gewicht', art: 'haeufigkeit' } : { spalte: 'gewicht', art: 'umfrage', klumpenfrei };
}
