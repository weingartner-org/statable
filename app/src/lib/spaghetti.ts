/**
 * Linie je Person (Spaghetti-Diagramm) für Daten in langer Form: eine Zeile je Messung mit Person, Zeit und Wert.
 * Jede Person ist eine Linie; wer zu einer Gruppe gehört, bekommt deren Farbe, Strichart und Punktform. Dazu der Mittelwert je Zeitpunkt.
 * Gerechnet wird nur sortiert und gemittelt. Test: spaghetti.test.ts; das Bild: bausteine/Spaghettidiagramm.svelte.
 */
import { istFehlend } from './fehlend';
import type { Spalte } from './verzeichnis';
import { stufe } from './datendiagramm';
import { STREU_GRUPPEN_MAX } from './streugruppen';
import { stichprobenIndex } from './stichprobe';
import { zahlDe } from './format';
import { L, Lp } from './sitzung.svelte';

type Zeilen = (string | number | null)[][];
/** Höchstens so viele Linien werden gezeichnet (eine feste Auswahl); der Mittelwert und die Zahlen rechnen mit allen Personen. */
export const SPAGHETTI_MAX = 60;
/** Höchstens so viele verschiedene Zeitpunkte für die Mittelwert-Linie (bei mehr ist die Zeit eher stetig). */
export const SPAGHETTI_MITTEL_MAX = 15;
export interface Linie { id: string; gruppe: number; punkte: [number, number][]; steigung: number | null }
export interface Spaghetti { linien: Linie[]; personen: number; gruppen: string[]; mittel: [number, number][]; ausgelassen: number; gekuerzt: boolean; nurEinMal: number }

const gueltig = (sp: Spalte, v: unknown): v is string | number => v !== null && v !== undefined && v !== '' && !(typeof v === 'number' && (!Number.isFinite(v) || istFehlend(sp, v)));
const idx = (sp: Spalte, spalten: Spalte[]) => spalten.findIndex(x => x.name === sp.name);
const steig = (p: [number, number][]): number | null => {
  if (p.length < 2) return null;
  const n = p.length, mx = p.reduce((s, q) => s + q[0], 0) / n, my = p.reduce((s, q) => s + q[1], 0) / n, sxx = p.reduce((s, q) => s + (q[0] - mx) ** 2, 0);
  return sxx > 0 ? p.reduce((s, q) => s + (q[0] - mx) * (q[1] - my), 0) / sxx : null;
};

/** `null`, wenn eine Spalte fehlt, es mehr als STREU_GRUPPEN_MAX Gruppen gibt oder keine Zeile alle Angaben hat. */
export function spaghetti(zeit: Spalte, wert: Spalte, person: Spalte, gruppe: Spalte | null, zeilen: Zeilen, spalten: Spalte[]): Spaghetti | null {
  const ix = idx(zeit, spalten), iy = idx(wert, spalten), ip = idx(person, spalten), ig = gruppe ? idx(gruppe, spalten) : -1;
  if (ix < 0 || iy < 0 || ip < 0 || (gruppe && ig < 0)) return null;
  const je = new Map<string, { id: string; g: string | number; p: [number, number][] }>();
  let aus = 0;
  for (const z of zeilen) {
    const t = z[ix], y = z[iy], pe = z[ip], ge = gruppe ? z[ig] : 0;
    if (typeof t !== 'number' || typeof y !== 'number' || !gueltig(zeit, t) || !gueltig(wert, y) || !gueltig(person, pe) || (gruppe && !gueltig(gruppe, ge))) { aus++; continue; }
    const k = String(pe), e = je.get(k);
    if (e) e.p.push([t, y]); else je.set(k, { id: stufe(person, pe as string | number), g: ge as string | number, p: [[t, y]] });
  }
  if (!je.size) return null;
  const stufen = gruppe ? [...new Set([...je.values()].map(e => e.g))].sort((p, q) => (typeof p === 'number' && typeof q === 'number' ? p - q : String(p).localeCompare(String(q), undefined, { numeric: true }))) : [0];
  if (stufen.length > STREU_GRUPPEN_MAX) return null;
  const alle: Linie[] = [...je.values()].map(e => { const p = [...e.p].sort((a, b) => a[0] - b[0]); return { id: e.id, gruppe: stufen.indexOf(e.g), punkte: p, steigung: steig(p) }; });
  const nachZeit = new Map<number, number[]>();
  for (const l of alle) for (const [t, y] of l.punkte) nachZeit.set(t, [...(nachZeit.get(t) ?? []), y]);
  const mittel = nachZeit.size <= SPAGHETTI_MITTEL_MAX ? [...nachZeit.entries()].sort((a, b) => a[0] - b[0]).map(([t, v]) => [t, v.reduce((a, b) => a + b, 0) / v.length] as [number, number]) : [];
  const gekuerzt = alle.length > SPAGHETTI_MAX, linien = gekuerzt ? stichprobenIndex(alle.length, SPAGHETTI_MAX).map(i => alle[i]!) : alle;
  return { linien, personen: alle.length, gruppen: gruppe ? stufen.map(s => stufe(gruppe, s)) : [], mittel, ausgelassen: aus, gekuerzt, nurEinMal: alle.filter(l => l.punkte.length < 2).length };
}

export function spaghettiText(d: Spaghetti, zeitText: string, wertText: string, personText: string) {
  const alleP = d.linien.flatMap(l => l.punkte), n = alleP.length;
  const saetze: string[] = [
    Lp(d.personen, `Liniendiagramm mit einer Linie je ${personText}: ${d.personen} Linie.`, `Liniendiagramm mit einer Linie je ${personText}: ${d.personen} Linien.`, `Line chart with one line per ${personText}: ${d.personen} line.`, `Line chart with one line per ${personText}: ${d.personen} lines.`),
    L(`Waagrechte Achse: ${zeitText}, von ${zahlDe(Math.min(...alleP.map(p => p[0])))} bis ${zahlDe(Math.max(...alleP.map(p => p[0])))}. Senkrechte Achse: ${wertText}, von ${zahlDe(Math.min(...alleP.map(p => p[1])))} bis ${zahlDe(Math.max(...alleP.map(p => p[1])))}.`,
      `Horizontal axis: ${zeitText}, from ${zahlDe(Math.min(...alleP.map(p => p[0])))} to ${zahlDe(Math.max(...alleP.map(p => p[0])))}. Vertical axis: ${wertText}, from ${zahlDe(Math.min(...alleP.map(p => p[1])))} to ${zahlDe(Math.max(...alleP.map(p => p[1])))}.`)
  ];
  if (d.gekuerzt) saetze.push(L(`Gezeichnet sind ${d.linien.length} von ${d.personen} Linien (eine feste Auswahl); der Mittelwert rechnet mit allen.`, `${d.linien.length} of ${d.personen} lines are drawn (a fixed selection); the mean uses all of them.`));
  if (d.mittel.length) saetze.push(L(`Mittelwert je Zeitpunkt (dicke Linie): ${d.mittel.map(m => `${zahlDe(m[0])}: ${zahlDe(m[1], 2)}`).join('; ')}.`, `Mean at each time point (thick line): ${d.mittel.map(m => `${zahlDe(m[0])}: ${zahlDe(m[1], 2)}`).join('; ')}.`));
  const steigend = d.linien.filter(l => (l.steigung ?? 0) > 0).length, mitSteig = d.linien.filter(l => l.steigung !== null).length;
  if (mitSteig) saetze.push(L(`Bei ${steigend} von ${mitSteig} ${personText}-Linien steigt der Wert über die Zeit (Gerade der kleinsten Quadrate je Linie).`, `For ${steigend} of ${mitSteig} lines the value rises over time (least-squares line for each).`));
  if (d.nurEinMal) saetze.push(Lp(d.nurEinMal, `${d.nurEinMal} Person hat nur eine Messung und erscheint als einzelner Punkt.`, `${d.nurEinMal} Personen haben nur eine Messung und erscheinen als einzelne Punkte.`, `${d.nurEinMal} person has only one measurement and appears as a single dot.`, `${d.nurEinMal} people have only one measurement and appear as single dots.`));
  if (d.ausgelassen) saetze.push(Lp(d.ausgelassen, `${d.ausgelassen} Zeile ohne alle Angaben bleibt weg.`, `${d.ausgelassen} Zeilen ohne alle Angaben bleiben weg.`, `${d.ausgelassen} row without all values is left out.`, `${d.ausgelassen} rows without all values are left out.`));
  const mitG = d.gruppen.length > 0;
  const kopf = [personText, ...(mitG ? [L('Gruppe', 'Group')] : []), L('Messungen', 'Measurements'), L('Erster Wert', 'First value'), L('Letzter Wert', 'Last value'), L('Steigung je Zeiteinheit', 'Slope per time unit')];
  const zeilen = d.linien.map(l => [l.id, ...(mitG ? [d.gruppen[l.gruppe]!] : []), String(l.punkte.length), zahlDe(l.punkte[0]![1], 2), zahlDe(l.punkte.at(-1)![1], 2), l.steigung === null ? '-' : zahlDe(l.steigung, 3)]);
  return { saetze, kopf, zeilen, n };
}
