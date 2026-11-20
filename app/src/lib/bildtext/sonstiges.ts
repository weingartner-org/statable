/** Alles, wofür es keine eigene Schablone gibt (Dendrogramm, ROC, Periodogramm, Punktkarten …): Art, Titel, Achsen, die fertigen Sätze des Bausteins, Kennwerte und, wenn vorhanden, eine Tabelle. */
import { L } from '../sitzung.svelte';
import { sauber } from './zahlen';
import { achsenSatz, titelOder } from './hilfen';
import type { BildText, SonstigesDaten } from './typen';

export function sonstiges(d: SonstigesDaten): BildText {
  const art = sauber(d.artName ?? '') || L('Diagramm', 'Chart');
  const titel = titelOder(d.titel, art);
  const saetze = (d.saetze ?? []).map(sauber).filter(Boolean);
  const kurz = d.titel?.trim() && sauber(d.titel) !== art ? `${art}: ${sauber(d.titel)}.` : `${art}.`;
  const beschreibung = [
    `${art}${d.titel?.trim() ? `: ${sauber(d.titel)}` : ''}.`,
    ...(d.xAchse ? [achsenSatz(true, d.xAchse)] : []), ...(d.yAchse ? [achsenSatz(false, d.yAchse)] : []),
    ...saetze
  ].filter(Boolean);
  const liste = (d.kennwerte ?? []).map(k => `${sauber(k.name)}: ${sauber(k.wert)}.`);
  const tabelle = d.tabelle ?? { kopf: [], zeilen: [] };
  return { kurz, beschreibung, liste, tabelle: { titel, kopf: tabelle.kopf.map(sauber), zeilen: tabelle.zeilen.map(r => r.map(c => (typeof c === 'string' ? sauber(c) : c))), zeilenKopf: true } };
}
