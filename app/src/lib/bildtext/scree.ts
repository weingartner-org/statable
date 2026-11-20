/** Scree-Plot der Eigenwerte (Schablone 5.12). Kein „Knick“: dafür gibt es keine feste Regel. Genannt wird, wie viele Eigenwerte über 1 liegen (Kaiser-Kriterium). */
import { L, Lp } from '../sitzung.svelte';
import { z, prozent, verlaufsart } from './zahlen';
import { achsenSatz, titelOder, keineDaten, nKomponenten, nEigenwerte } from './hilfen';
import type { BildText, ScreeDaten } from './typen';

export function scree(d: ScreeDaten): BildText {
  const titel = titelOder(d.titel, L('Eigenwerte der Komponenten', 'Eigenvalues of the components'));
  const e = d.eigen.filter(Number.isFinite), k = e.length;
  if (k === 0) return keineDaten(titel, L('Scree-Plot (Eigenwerte): keine Werte.', 'Scree plot (eigenvalues): no values.'));
  const ueber = e.filter(v => v > 1).length, gesamt = d.gesamt ?? e.reduce((a, b) => a + b, 0);
  const kurz = L(`Scree-Plot (Eigenwerte): ${nKomponenten(k)}, ${nEigenwerte(ueber)} über 1; erster Eigenwert ${z(e[0], 2)}.`, `Scree plot (eigenvalues): ${nKomponenten(k)}, ${nEigenwerte(ueber)} above 1; first eigenvalue ${z(e[0], 2)}.`);
  const v = verlaufsart(e);
  const beschreibung = [
    L('Scree-Plot (Eigenwerte der Komponenten).', 'Scree plot (eigenvalues of the components).'),
    achsenSatz(true, { name: L('Komponente (Faktor)', 'Component (factor)'), von: 1, bis: k, schritt: 1 }),
    achsenSatz(false, { name: L('Eigenwert', 'Eigenvalue'), von: 0, bis: Math.ceil(Math.max(...e)) }),
    Lp(k, `${k} Punkt, durch eine Linie verbunden.`, `${k} Punkte, durch eine Linie verbunden.`, `${k} point, joined by a line.`, `${k} points, joined by a line.`),
    ...(v === 'fallend' ? [L('Jeder Eigenwert ist kleiner als der vorige.', 'Each eigenvalue is smaller than the one before.')] : []),
    L('Waagrechte Hilfslinie bei Eigenwert 1 (Kaiser-Kriterium).', 'Horizontal reference line at eigenvalue 1 (Kaiser criterion).'),
    ...(d.extrahiert !== undefined ? [Lp(d.extrahiert, `${d.extrahiert} Faktor wird herausgezogen (gefüllter Punkt).`, `${d.extrahiert} Faktoren werden herausgezogen (gefüllte Punkte).`, `${d.extrahiert} factor is extracted (filled dot).`, `${d.extrahiert} factors are extracted (filled dots).`)] : [])
  ];
  const liste = e.map((w, i) => L(`Komponente ${i + 1}: Eigenwert ${z(w, 2)}.`, `Component ${i + 1}: eigenvalue ${z(w, 2)}.`));
  let kum = 0;
  const zeilen = e.map((w, i) => { kum += w; return [i + 1, z(w, 2), prozent(gesamt > 0 ? (w / gesamt) * 100 : 0), prozent(gesamt > 0 ? (kum / gesamt) * 100 : 0)]; });
  return { kurz, beschreibung, liste, tabelle: { titel, kopf: [L('Komponente', 'Component'), L('Eigenwert', 'Eigenvalue'), L('erklärte Varianz in Prozent', 'explained variance in percent'), L('kumuliert in Prozent', 'cumulative in percent')], zeilen, zeilenKopf: true } };
}
