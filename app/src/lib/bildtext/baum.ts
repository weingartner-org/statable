/** Baum (Entscheidungsbaum, Wahrscheinlichkeitsbaum): Knoten in fester Reihenfolge (Wurzel, dann jeweils erst der ganze erste Ast), mit Ebene und Ast. */
import { L } from '../sitzung.svelte';
import { sauber } from './zahlen';
import { titelOder, nKnoten, nEndknoten, nEbenen } from './hilfen';
import type { BaumDaten, BaumKnoten, BildText } from './typen';

interface Eintrag { nr: number; ebene: number; ast: string; text: string; blatt: boolean }

export function baumFlach(w: BaumKnoten): Eintrag[] {
  const aus: Eintrag[] = [];
  const geh = (k: BaumKnoten, ebene: number) => {
    aus.push({ nr: aus.length + 1, ebene, ast: sauber(k.ast ?? ''), text: sauber(k.text), blatt: !k.kinder?.length });
    for (const c of k.kinder ?? []) geh(c, ebene + 1);
  };
  geh(w, 1);
  return aus;
}

export function baum(d: BaumDaten): BildText {
  const titel = titelOder(d.titel, L('Knoten des Baums', 'Nodes of the tree'));
  const e = baumFlach(d.wurzel), k = e.length, blaetter = e.filter(x => x.blatt).length, tiefe = Math.max(...e.map(x => x.ebene));
  const wurzel = e[0]!.text;
  const kurz = L(`Baumdiagramm mit ${nKnoten(k)}, ${nEndknoten(blaetter)} und ${nEbenen(tiefe)}; Wurzel: ${wurzel}.`, `Tree diagram with ${nKnoten(k)}, ${nEndknoten(blaetter)} and ${nEbenen(tiefe)}; root: ${wurzel}.`);
  const beschreibung = [
    L('Baumdiagramm: Die Wurzel steht oben (oder links) und verzweigt sich in Äste.', 'Tree diagram: the root is at the top (or left) and branches into limbs.'),
    L(`Der Baum hat ${nKnoten(k)} auf ${nEbenen(tiefe)}, davon ${nEndknoten(blaetter)} (ohne weitere Verzweigung).`, `The tree has ${nKnoten(k)} on ${nEbenen(tiefe)}, ${nEndknoten(blaetter)} of them (no further branching).`),
    L('Die Liste nennt jeden Knoten in der Reihenfolge: erst die Wurzel, dann jeweils ein ganzer Ast nach dem anderen.', 'The list names every node in this order: first the root, then one whole limb after the other.')
  ];
  const liste = e.map(x => (x.ebene === 1 ? L(`Wurzel: ${x.text}.`, `Root: ${x.text}.`)
    : x.ast ? (x.blatt ? L(`Ebene ${x.ebene}, Ast ${x.ast}, Endknoten: ${x.text}.`, `Level ${x.ebene}, limb ${x.ast}, end node: ${x.text}.`) : L(`Ebene ${x.ebene}, Ast ${x.ast}: ${x.text}.`, `Level ${x.ebene}, limb ${x.ast}: ${x.text}.`))
    : (x.blatt ? L(`Ebene ${x.ebene}, Endknoten: ${x.text}.`, `Level ${x.ebene}, end node: ${x.text}.`) : L(`Ebene ${x.ebene}: ${x.text}.`, `Level ${x.ebene}: ${x.text}.`))));
  const zeilen = e.map(x => [x.nr, x.ebene, x.ast, x.text, x.blatt ? L('ja', 'yes') : L('nein', 'no')]);
  return { kurz, beschreibung, liste, tabelle: { titel, kopf: [L('Nr.', 'No.'), L('Ebene', 'Level'), L('Ast', 'Limb'), L('Knoten', 'Node'), L('Endknoten', 'End node')], zeilen, zeilenKopf: true } };
}
