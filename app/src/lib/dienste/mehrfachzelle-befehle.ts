/**
 * PSPP-Befehle für „Mehrfachauswahl in einer Zelle“ und „doppelte Antworten“ (Paket 1B). Text aus Dateien (Optionen, Fragetext, Rest-Text) gelangt NUR über `zit` in die Befehle,
 * Spaltennamen kommen aus `psppName`/`freierName` (nur A-Z, a-z, 0-9, _), alles andere sind Zahlen. Die Original-Spalte bleibt; es entstehen nur neue Spalten.
 */
import { zit } from '../befehlstext';
import { psppName } from '../einlesen';
import { freierName } from '../skalabau';
import { fallBedingungen } from './casenum';

export interface MehrfachZelleBefehle { befehle: string[]; /** Namen der neuen 0/1-Spalten, in Reihenfolge der Optionen */ neu: string[]; /** Name der Textspalte für „Anderes“ oder null */ andersSpalte: string | null; nAnders: number }

/**
 * `werte[zeile][option]` 0/1 und `anders[zeile]` (Text oder null) wie aus `endergebnis`; `vorhanden`: Namen, die schon in den Daten stehen.
 * Je Option eine 0/1-Spalte `<spalte>_<kurzname>` mit Beschriftung „<frage>: <option>“; Rest-Texte in `<spalte>_anders` (Text, nur wo es einen Rest gibt).
 */
export function mehrfachZelleBefehle(o: { spalte: string; frage: string; optionen: string[]; werte: number[][]; anders: (string | null)[]; vorhanden: string[]; nein: string; ja: string; anderes: string }): MehrfachZelleBefehle {
  const hatAnders = o.anders.some(x => x !== null);
  const vergeben = new Set<string>(), neu: string[] = [], cmds: string[] = [];
  const belegt = () => [...o.vorhanden, ...neu, ...(hatAnders ? [`${o.spalte}_anders`] : [])];
  o.optionen.forEach((opt, k) => {
    const kurz = psppName(opt, vergeben, k + 1).slice(0, 30);
    const ziel = freierName(`${o.spalte}_${kurz}`.slice(0, 60), belegt());
    neu.push(ziel);
    const zeilen = o.werte.flatMap((w, zi) => (w[k] === 1 ? [zi] : []));
    cmds.push(`COMPUTE ${ziel} = 0.`, ...fallBedingungen(zeilen).map(c => `IF (${c}) ${ziel} = 1.`),
      `VARIABLE LABELS ${ziel} ${zit(`${o.frage}: ${opt}`, 250)}.`, `VALUE LABELS ${ziel} 0 ${zit(o.nein)} 1 ${zit(o.ja)}.`, `FORMATS ${ziel} (F1.0).`, `VARIABLE LEVEL ${ziel} (NOMINAL).`);
  });
  let andersSpalte: string | null = null, nAnders = 0;
  if (hatAnders) {
    const ziel = freierName(`${o.spalte}_anders`.slice(0, 60), [...o.vorhanden, ...neu]);
    andersSpalte = ziel;
    const je = new Map<string, number[]>();
    o.anders.forEach((t, zi) => { if (t !== null) { nAnders++; (je.get(t) ?? je.set(t, []).get(t)!).push(zi); } });
    let breite = 1; for (const t of je.keys()) breite = Math.max(breite, Math.min(255, Array.from(t).length));
    cmds.push(`STRING ${ziel} (A${breite}).`);
    for (const [t, zeilen] of je) for (const c of fallBedingungen(zeilen)) cmds.push(`IF (${c}) ${ziel} = ${zit(t, 255)}.`);
    cmds.push(`VARIABLE LABELS ${ziel} ${zit(`${o.frage}: ${o.anderes}`, 250)}.`, `FORMATS ${ziel} (A${breite}).`, `VARIABLE LEVEL ${ziel} (NOMINAL).`);
  }
  cmds.push('EXECUTE.');
  return { befehle: cmds, neu, andersSpalte, nAnders };
}

/** Eine 0/1-Kennzeichenspalte für die Zeilen `zeilen` (0-basiert), alle anderen 0 (doppelte Antworten, nichts wird gelöscht). */
export function kennzeichenBefehle(ziel: string, zeilen: number[], label: string, nein: string, ja: string): string[] {
  return [`COMPUTE ${ziel} = 0.`, ...fallBedingungen(zeilen).map(c => `IF (${c}) ${ziel} = 1.`), `VARIABLE LABELS ${ziel} ${zit(label)}.`, `VALUE LABELS ${ziel} 0 ${zit(nein)} 1 ${zit(ja)}.`, `FORMATS ${ziel} (F1.0).`, `VARIABLE LEVEL ${ziel} (NOMINAL).`, 'EXECUTE.'];
}

/** Welche Zeilen einer Gruppe doppelter Antworten gekennzeichnet werden: alle außer der behaltenen (voreingestellt die erste). */
export function zuKennzeichnen(gruppen: number[][], doppelt: Record<number, boolean>, behalte: Record<number, number>): number[] {
  const aus: number[] = [];
  gruppen.forEach((g, gi) => {
    if (doppelt[gi] === false) return;
    const b = behalte[gi] !== undefined && g.includes(behalte[gi]!) ? behalte[gi]! : g[0]!;
    for (const r of g) if (r !== b) aus.push(r);
  });
  return aus;
}
