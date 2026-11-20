/**
 * Nach der Reliabilität: eine Frage umpolen und den Skalenwert bilden - wie im Kurs (RECODE/COMPUTE), als Befehle,
 * damit es über aendere() läuft und sich rückgängig machen lässt.
 */
import { istFehlend } from './fehlend';
import type { Spalte } from './verzeichnis';
import { kleinste, groesste } from './menge';
import { L as T } from './sitzung.svelte';
import { zit } from './befehlstext';



const NIVEAU = { nominal: 'NOMINAL', ordinal: 'ORDINAL', metrisch: 'SCALE' } as const;
const RESERVIERT = new Set(['ALL', 'AND', 'BY', 'EQ', 'GE', 'GT', 'LE', 'LT', 'NE', 'NOT', 'OR', 'TO', 'WITH']);

/** Spaltenname, wie PSPP ihn annimmt: Buchstabe vorn, danach Buchstaben, Ziffern, _ . @ # $, kein Punkt am Ende. */
export const gueltigerName = (n: string) => /^[\p{L}@#$][\p{L}\p{N}_.@#$]*$/u.test(n) && !n.endsWith('.') && n.length <= 64 && !RESERVIERT.has(n.toUpperCase());

/** `wunsch`, sonst `wunsch2`, `wunsch3` … - PSPP unterscheidet Groß und Klein bei Namen nicht. */
export function freierName(wunsch: string, vorhandene: string[]) {
  const belegt = new Set(vorhandene.map(n => n.toUpperCase()));
  if (!belegt.has(wunsch.toUpperCase())) return wunsch;
  for (let i = 2; ; i++) if (!belegt.has(`${wunsch}${i}`.toUpperCase())) return `${wunsch}${i}`;
}

/**
 * Umpolen: neue Spalte <name>R mit (min + max) - Wert. Die Spanne kommt aus den Wertelabels (1 „sehr selten“ … 5 „sehr oft“),
 * sonst aus den vorkommenden Werten - der Aufrufer gibt dafür die Werte ALLER Fragen der Skala mit (Prüfung C1, 08.10.: kreuzt bei einer Frage
 * niemand die 5 an, wäre die Spanne sonst 1-4 und die Frage falsch umgepolt). `fest` (von der Person bestätigt) geht vor.
 * „Keine Angabe“ bleibt leer: COMPUTE rechnet mit fehlenden Werten nicht.
 */
export function umpolSpanne(sp: Spalte, werte: (number | string | null)[]) {
  const gueltig = (w: number) => Number.isFinite(w) && !istFehlend(sp, w);
  const ausLabels = Object.keys(sp.werteLabels).map(Number).filter(gueltig);
  const spanne = ausLabels.length >= 2 ? ausLabels : werte.filter((w): w is number => typeof w === 'number' && gueltig(w));
  return { min: Math.min(kleinste(spanne)), max: Math.max(groesste(spanne)) };
}
export function umpolBefehl(sp: Spalte, werte: (number | string | null)[], vorhandene: string[], fest?: { min: number; max: number }) {
  const gueltig = (w: number) => Number.isFinite(w) && !istFehlend(sp, w);
  const { min, max } = fest ?? umpolSpanne(sp, werte);
  const neu = freierName(`${sp.name}R`, vorhandene);
  const labels = Object.entries(sp.werteLabels).filter(([w]) => gueltig(Number(w))).map(([w, l]) => [min + max - Number(w), l] as const).sort((a, b) => a[0] - b[0]);
  const syntax = [
    `COMPUTE ${neu} = ${min + max} - ${sp.name}.`,
    `VARIABLE LABELS ${neu} ${zit(`${(sp.bezeichnung || sp.name).slice(0, 230)} ${T('(umgepolt)', '(reversed)')}`)}.`,
    ...(labels.length ? [`VALUE LABELS ${neu} ${labels.map(([w, l]) => `${w} ${zit(l.slice(0, 120))}`).join(' ')}.`] : []),
    ...(sp.format ? [`FORMATS ${neu} (${sp.format}).`] : []),
    `VARIABLE LEVEL ${neu} (${NIVEAU[sp.niveau]}).`,
    'EXECUTE.'
  ].join('\n');
  return { neu, min, max, syntax };
}

/** Skalenwert = Mittelwert der Fragen, wie im Kurs: COMPUTE NAME = MEAN(Frage1, Frage2, …). */
/** `mindestens` > 1: MEAN.n - wer weniger Fragen beantwortet hat, bekommt keinen Wert (Prüfung C3). 1 = wie im Kurs. */
export function skalenwertBefehl(fragen: string[], name: string, bezeichnung: string, mindestens = 1) {
  const n = Math.max(1, Math.min(fragen.length, Math.round(mindestens)));
  return [
    `COMPUTE ${name} = MEAN${n > 1 ? `.${n}` : ''}(${fragen.join(', ')}).`,
    `VARIABLE LABELS ${name} ${zit(bezeichnung.slice(0, 250))}.`,
    `FORMATS ${name} (F8.2).`,
    `VARIABLE LEVEL ${name} (SCALE).`,
    'EXECUTE.'
  ].join('\n');
}
