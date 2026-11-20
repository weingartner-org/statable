/**
 * „Eigenschaften aus anderer Datei übernehmen“ (S-F2 D5; SPSS: Dateneigenschaften kopieren).
 * Zuordnung nach Spaltenname (Groß/klein egal, wie in PSPP). Wählbar: Beschriftung, Wertelabels, Fehlend-Codes, Messniveau. Die Daten selbst bleiben unverändert.
 * Passt der Typ nicht (Text gegen Zahl, Datum gegen Zahl), werden Wertelabels und Fehlend-Codes dieser Spalte nicht übernommen (`typPasstNicht`).
 * Alle Texte aus der Quelle gehen nur durch `zit` / `zitWert` in den Befehl (lib/befehlstext.ts).
 */
import { zit, zitWert } from './befehlstext';
import { fehlendSyntax, hatFehlend, istFehlend } from './fehlend';
import { textCodes } from './eingabe';
import type { Daten } from './umformen';
import type { Spalte } from './verzeichnis';

export interface Uebernahme { bezeichnung: boolean; werteLabels: boolean; fehlend: boolean; niveau: boolean }
export interface Aenderung { art: keyof Uebernahme; vorher: string; nachher: string; /** Fehlend: so viele bisher gültige Werte würden fehlend */ neuFehlend?: number }
export interface SpaltenPlan { name: string; quelle: string; aenderungen: Aenderung[]; typPasstNicht: boolean }
export interface EigenschaftenPlan { spalten: SpaltenPlan[]; nurInQuelle: string[]; nurInDaten: string[]; syntax: string }

const NIVEAU = { metrisch: 'SCALE', ordinal: 'ORDINAL', nominal: 'NOMINAL' } as const;
const gleichname = (a: string, b: string) => a.toUpperCase() === b.toUpperCase();
const labelTexte = (w: Record<string, string>) => Object.entries(w).map(([k, l]) => `${k} = ${l}`).join('; ');

/** Die Wertelabels, die in die Zielspalte passen (Zahlen: nur Schlüssel, die Zahlen sind). */
function passendeLabels(q: Spalte): [string, string][] {
  return Object.entries(q.werteLabels).filter(([w]) => q.art !== 'zahl' || (w.trim() !== '' && Number.isFinite(Number(w)))).map(([w, l]) => [q.art === 'zahl' ? String(Number(w)) : w, l]);
}
/** Text-Codes für „keine Angabe“ (die leere Zelle gehört dazu, wenn sie in der Quelle fehlend war), nicht länger als die Zielspalte breit ist. */
function textFehlend(q: Spalte, z: Spalte): string[] {
  const breite = Number(/^A(\d+)$/.exec(z.format)?.[1] ?? 32767);
  return [...(q.leerGueltig ? [] : ['']), ...textCodes(q.fehlendText)].filter(c => new TextEncoder().encode(c).length <= breite).slice(0, 3);
}

export function eigenschaftenUebernehmen(daten: Daten, quelle: Daten, wahl: Uebernahme): EigenschaftenPlan {
  const spalten: SpaltenPlan[] = [], zeilen: string[] = [];
  const genutzt = new Set<number>();
  daten.spalten.forEach((z, zi) => {
    const qi = quelle.spalten.findIndex(q => gleichname(q.name, z.name));
    if (qi < 0) return;
    genutzt.add(qi);
    const q = quelle.spalten[qi]!;
    const typPasstNicht = q.art !== z.art;
    const aenderungen: Aenderung[] = [];
    if (wahl.bezeichnung && q.bezeichnung && q.bezeichnung !== z.bezeichnung) {
      aenderungen.push({ art: 'bezeichnung', vorher: z.bezeichnung, nachher: q.bezeichnung });
      zeilen.push(`VARIABLE LABELS ${z.name} ${zit(q.bezeichnung.slice(0, 250))}.`);
    }
    if (wahl.werteLabels && !typPasstNicht) {
      const paare = passendeLabels(q);
      if (paare.length && labelTexte(Object.fromEntries(paare)) !== labelTexte(z.werteLabels)) {
        aenderungen.push({ art: 'werteLabels', vorher: labelTexte(z.werteLabels), nachher: labelTexte(Object.fromEntries(paare)) });
        zeilen.push(`VALUE LABELS ${z.name}.`, `VALUE LABELS ${z.name} ${paare.map(([w, l]) => `${z.art === 'zahl' ? w : zitWert(w)} ${zit(l.slice(0, 120))}`).join(' ')}.`);
      }
    }
    if (wahl.fehlend && !typPasstNicht) {
      if (z.art === 'zahl' && hatFehlend(q)) {
        const neu = fehlendSyntax(q);
        if (neu !== fehlendSyntax(z)) {
          const i = zi, neuFehlend = daten.zeilen.filter(r => typeof r[i] === 'number' && !istFehlend(z, r[i]) && istFehlend(q, r[i])).length;
          aenderungen.push({ art: 'fehlend', vorher: z.fehlendText, nachher: q.fehlendText, neuFehlend });
          zeilen.push(`MISSING VALUES ${z.name} (${neu}).`);
        }
      } else if (z.art === 'text' && (textCodes(q.fehlendText).length || q.leerGueltig === false)) {
        const codes = textFehlend(q, z);
        if (codes.length && codes.map(c => zit(c)).join(', ') !== ['', ...textCodes(z.fehlendText)].map(c => zit(c)).join(', ')) {
          aenderungen.push({ art: 'fehlend', vorher: z.fehlendText, nachher: q.fehlendText });
          zeilen.push(`MISSING VALUES ${z.name} (${codes.map(c => zit(c)).join(', ')}).`);
        }
      }
    }
    if (wahl.niveau && q.niveau !== z.niveau && !(z.art === 'text' && q.niveau === 'metrisch')) {
      aenderungen.push({ art: 'niveau', vorher: z.niveau, nachher: q.niveau });
      zeilen.push(`VARIABLE LEVEL ${z.name} (${NIVEAU[q.niveau]}).`);
    }
    spalten.push({ name: z.name, quelle: q.name, aenderungen, typPasstNicht });
  });
  const nurInDaten = daten.spalten.filter(z => !quelle.spalten.some(q => gleichname(q.name, z.name))).map(z => z.name);
  const nurInQuelle = quelle.spalten.filter((_, i) => !genutzt.has(i)).map(q => q.name);
  return { spalten, nurInQuelle, nurInDaten, syntax: zeilen.length ? [...zeilen, 'EXECUTE.'].join('\n') : '' };
}
