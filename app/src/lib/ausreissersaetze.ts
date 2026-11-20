/**
 * Tabelle und Sätze der Ausreißertests (Später, Welle S-D, T2; Rechnen und die Sätze zu den einzelnen Tests: ausreisser.ts).
 * Die Tabelle nennt je Test das Niveau, die Statistik, den kritischen Wert, die gemeldeten Zeilen und M und SD mit und ohne diese Werte. Sie bietet nichts zum Entfernen an.
 */
import type { TableItem } from '../engine/types';
import { L } from './sitzung.svelte';
import { zahlDe } from './format';
import { pWert } from './ergebnis';
import { zitat } from '../i18n/profil';
import { tabelle, fo, fx, type Z } from './mwsaetze';
import { ausreisserSatz, mSd, type DixonErgebnis, type EsdErgebnis, type GrubbsErgebnis } from './ausreisser';

export interface AusreisserLauf { grubbs?: GrubbsErgebnis; esd?: EsdErgebnis; dixon?: DixonErgebnis }

const a2 = (a: number) => zahlDe(a, 2).replace(/^0(?=[.,])/, '');
const ohneFehler = <T extends { fehler: unknown }>(e: T | undefined): e is T => !!e && e.fehler === null;

export const mehrfachTestSatz = () => L('Wer mehrere Spalten nacheinander testet, bekommt öfter einen Fund, der nur Zufall ist (Mehrfachtests).', 'Anyone who tests several columns in a row will more often get a finding that is only chance (multiple tests).');
export const wiederholenSatz = () => L('Grubbs mehrfach hintereinander anzuwenden ist kein Test: Die Fehlerrate für die Zahl der gemeldeten Werte ist dann nicht kontrolliert. Für mehrere Verdächtige ist der generalisierte ESD-Test gebaut.', 'Applying Grubbs several times in a row is not a test: the error rate for the number of reported values is then not controlled. The generalized ESD test is made for several suspects.');
export const ungewoehnlichSatz = () => L('Ein ungewöhnlicher Wert kann der interessanteste sein: Der Test sagt nur, dass er bei einer Normalverteilung selten wäre.', 'An unusual value can be the most interesting one: the test only says that it would be rare with a normal distribution.');
export const regelGegenTestSatz = () => L('Der Daten-Check nutzt eine Regel (2,2 · IQR) und sucht Tippfehler. Ein Test fragt, ob ein Wert bei einer Normalverteilung ungewöhnlich wäre. Beide können Verschiedenes sagen.', 'The data check uses a rule (2.2 · IQR) and looks for typos. A test asks whether a value would be unusual with a normal distribution. The two can say different things.');
export const einseitigSatz = () => L('Einseitig testen ist nur zulässig, wenn die Richtung vor dem Blick auf die Daten feststand. Voreinstellung ist zweiseitig.', 'A one-sided test is only allowed if the direction was fixed before looking at the data. The default is two-sided.');
export const mehrereSatz = () => L('Bei mehreren Verdächtigen zeigt der generalisierte ESD-Test mehr als der Grubbs-Test, der sich von einem zweiten großen Wert täuschen lässt (Maskierung).', 'With several suspects the generalized ESD test shows more than the Grubbs test, which can be fooled by a second large value (masking).');
export const dixonGrenzeSatz = () => L('Der Dixon-Test gilt für einen Verdächtigen und höchstens 10 Werte; wiederholt angewendet ist er nicht zulässig.', 'The Dixon test applies to one suspect and at most 10 values; applied repeatedly it is not permitted.');

/** Die Tabelle der gerechneten Tests (ein Test, der nicht gerechnet werden konnte, steht nicht darin). */
export function tabelleAusreisser(spalte: string, l: AusreisserLauf): TableItem {
  const kopf = [L('Test', 'Test'), L('Niveau', 'Level'), 'n', L('Statistik', 'Statistic'), L('Kritischer Wert', 'Critical value'), 'p', L('Gemeldete Zeilen', 'Reported rows'), L('Werte', 'Values'), L('Alle Werte', 'All values'), L('Ohne diese Werte', 'Without these values')];
  const rows: Z[][] = [];
  if (ohneFehler(l.grubbs)) { const g = l.grubbs; rows.push([L('Grubbs', 'Grubbs'), a2(g.alpha), String(g.n), fx(g.g, 2), fx(g.kritisch, 2), pWert(g.p).replace(/^= /, ''), g.gefunden ? g.gleichstand.join(', ') : '-', g.gefunden ? zahlDe(g.wert) : '-', mSd(g.mittel, g.sd), g.gefunden ? mSd(g.ohne.mittel, g.ohne.sd) : '-']); }
  if (ohneFehler(l.esd)) { const e = l.esd; rows.push([L('Generalisierter ESD', 'Generalized ESD'), a2(e.alpha), String(e.n), e.schritte[0] ? fx(e.schritte[0].r, 2) : '-', e.schritte[0] ? fx(e.schritte[0].lambda, 2) : '-', '-', e.anzahl ? e.gemeldet.join(', ') : '-', e.anzahl ? e.schritte.slice(0, e.anzahl).map(s => zahlDe(s.wert)).join('; ') : '-', mSd(e.mittel, e.sd), e.anzahl ? mSd(e.ohne.mittel, e.ohne.sd) : '-']); }
  if (ohneFehler(l.dixon)) { const x = l.dixon; rows.push([L('Dixon r10', 'Dixon r10'), a2(x.alpha), String(x.n), fo(x.r, 3), fo(x.kritisch, 3), '-', x.gefunden ? String(x.zeile) : '-', x.gefunden ? zahlDe(x.wert) : '-', '-', '-']); }
  return tabelle('Ausreißertests', L(`Ausreißertests für ${zitat(spalte)}`, `Outlier tests for ${zitat(spalte)}`), kopf, rows, [
    L('Zeilen gelten wie in der Tabelle der Daten. Ein Fund heißt: Der Wert wäre bei einer Normalverteilung ungewöhnlich. Er heißt nicht: Der Wert ist falsch.', 'Rows are numbered as in the data table. A finding means: the value would be unusual with a normal distribution. It does not mean: the value is wrong.'),
    ausreisserSatz()]);
}
