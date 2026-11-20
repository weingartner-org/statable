/**
 * Daten-Check: Titel, Satz und Knöpfe eines Fundes - gemeinsam für die Seitenleiste der Datenansicht und das Diagramm-Fenster (29.10.2026: ein Platzhalter wie 99
 * verzerrt jedes Bild; das Fenster zeigt den Fund zu den gewählten Spalten mit denselben Knöpfen). Vorher standen diese Funktionen in seiten/Daten.svelte.
 */
import { s, L, Lp, aendere, melde, sichern } from './sitzung.svelte';
import { fundSchluessel, type Fund } from './datencheck';
import { fehlendMitWert, fehlendSyntax } from './fehlend';
import { zitWert } from './befehlstext';
import { lesbar } from './verzeichnis';
import { zahlDe } from './format';
import { zitat } from '../i18n/profil';

export function fundTitel(f: Fund): string {
  const sp = lesbar(s.spalten.find(x => x.name === f.spalte), true);
  if (f.art === 'schreibweise') return L(`${sp} ist unterschiedlich geschrieben`, `${sp} is spelled in different ways`);
  if (f.art === 'platzhalter') {
    const w = zitat(String(f.wert));
    return f.anzahl === 1 ? L(`Einmal ${w} bei ${sp}`, `Once: ${w} in ${sp}`) : f.anzahl === 2 ? L(`Zweimal ${w} bei ${sp}`, `Twice: ${w} in ${sp}`) : L(`${f.anzahl}-mal ${w} bei ${sp}`, `${f.anzahl} times: ${w} in ${sp}`);
  }
  if (f.art === 'leer') return Lp(f.anzahl, `Ein leeres Feld bei ${sp}`, `${f.anzahl} leere Felder bei ${sp}`, `${f.anzahl} blank cell in ${sp}`, `${f.anzahl} blank cells in ${sp}`);
  return f.wert < f.spanne[0] ? L(`Ein sehr niedriger Wert bei ${sp}`, `A very low value in ${sp}`) : L(`Ein sehr hoher Wert bei ${sp}`, `A very high value in ${sp}`);
}
/** Nummer einer Zeile, wie sie die Person sieht: die Kennung (nr, id …), sonst die Zeilennummer. */
export const fundZeileNr = (zeile: number) => { const i = s.spalten.findIndex(x => /^(nr|id|lfdn|nummer)$/i.test(x.name)); return i >= 0 ? s.zeilen[zeile]?.[i] ?? zeile + 1 : zeile + 1; };

/** Der erklärende Satz zu einem Fund (ohne „leer“: dort steht die Liste der Zeilen in der Seitenleiste). */
export function fundSatz(f: Fund): string {
  if (f.art === 'schreibweise') return `${Object.entries(f.zuordnung).map(([a, b]) => L(`„${a}“ meint wohl „${b}“`, `"${a}" probably means "${b}"`)).join(', ')}. ${L('Für Statable wären das sonst eigene Gruppen.', 'Otherwise Statable would treat them as separate groups.')}`;
  if (f.art === 'platzhalter') return L(`${f.wert} passt nicht zu den übrigen Werten. In Fragebögen steht ${f.wert} oft für „keine Angabe“.`, `${f.wert} doesn't match the other values. In questionnaires, ${f.wert} often stands for "no answer".`);
  if (f.art === 'ausreisser') return L(`Zeile ${fundZeileNr(f.zeile)}: ${zahlDe(f.wert)}. Die übrigen Werte liegen zwischen ${zahlDe(f.spanne[0])} und ${zahlDe(f.spanne[1])}. Das kann ein Tippfehler sein - oder eine echte Antwort.`, `Row ${fundZeileNr(f.zeile)}: ${zahlDe(f.wert)}. The other values are between ${zahlDe(f.spanne[0])} and ${zahlDe(f.spanne[1])}. That could be a typo - or a real answer.`);
  return '';
}

export async function erledigeFund(f: Fund) {
  const k = fundSchluessel(f);
  if (f.art === 'schreibweise') {
    const paare = Object.entries(f.zuordnung).map(([a, b]) => `(${zitWert(a)}=${zitWert(b)})`).join(' ');
    await aendere(L(`Schreibweisen bei ${f.spalte} zusammengefasst`, `Spellings in ${f.spalte} merged`), `RECODE ${f.spalte} ${paare}.\nEXECUTE.`, undefined, { art: 'datencheck', ausDaten: true });
  } else if (f.art === 'platzhalter') {
    const sp = s.spalten.find(x => x.name === f.spalte)!;
    const codes = fehlendMitWert(sp, Number(f.wert));
    if (!codes) { melde(L('Alle Plätze für „keine Angabe“ sind schon belegt (drei Einzelwerte, oder ein Bereich und ein Einzelwert).', 'All slots for "no answer" are taken (three single values, or one range and one single value).')); return; }
    await aendere(L(`${f.wert} bei ${f.spalte} als „keine Angabe“`, `${f.wert} in ${f.spalte} set as "no answer"`), `MISSING VALUES ${f.spalte} (${fehlendSyntax(codes)}).`, undefined, { art: 'datencheck' });
  }
  s.entscheid[k] = 'erledigt'; sichern();
  melde(f.art === 'schreibweise' ? L('Zusammengefasst.', 'Merged.') : f.art === 'platzhalter' ? L(`${f.wert} gilt jetzt als „keine Angabe“. Die Zahl bleibt sichtbar.`, `${f.wert} now counts as "no answer". The number stays visible.`) : L('Verstanden.', 'Got it.'), f.art === 'schreibweise' || f.art === 'platzhalter');
}
export function lasseFund(f: Fund) { s.entscheid[fundSchluessel(f)] = 'gelassen'; sichern(); melde(L('So gelassen.', 'Left as is.')); }
