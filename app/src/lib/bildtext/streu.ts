/** Streudiagramm mit optionaler Regressionsgerade, einfach oder mit Gruppen (Schablone 5.6). Muster: Richtung nach dem Vorzeichen von r, nur ab 3 Punkten und |r| ab 0,1; sonst „kein erkennbarer linearer Zusammenhang“. */
import { L, Lp } from '../sitzung.svelte';
import { z, paar, sauber, pearson } from './zahlen';
import { achsenSatz, MAX_LISTE, titelOder, keineDaten, spanne } from './hilfen';
import type { BildText, Gerade, StreuDaten } from './typen';

/** Schwelle für die Richtung des Zusammenhangs (Betrag von r). */
export const R_SCHWELLE = 0.1;

export function zusammenhang(r: number | null): 'positiv' | 'negativ' | 'keiner' | null {
  if (r === null) return null;
  return Math.abs(r) < R_SCHWELLE ? 'keiner' : r > 0 ? 'positiv' : 'negativ';
}
function geradenSatz(g: Gerade, x: string, y: string, bereich: [number, number] | undefined): string {
  const a = z(g.a), b = z(Math.abs(g.b)), neg = g.b < 0;
  const gl = neg ? L(`${y} = ${a} minus ${b} mal ${x}`, `${y} = ${a} minus ${b} times ${x}`) : L(`${y} = ${a} plus ${b} mal ${x}`, `${y} = ${a} plus ${b} times ${x}`);
  const r2 = g.r2 !== undefined ? L(`, Bestimmtheitsmaß ${z(g.r2, 3)}`, `, coefficient of determination ${z(g.r2, 3)}`) : '';
  const lauf = bereich ? (g.b === 0 ? L(', waagrecht', ', horizontal') : neg ? L(', fallend', ', falling') : L(', steigend', ', rising')) : '';
  return L(`Regressionsgerade: ${gl}${lauf}${r2}.`, `Regression line: ${gl}${lauf}${r2}.`);
}
const zusText = (w: ReturnType<typeof zusammenhang>, r: number | null) => (w === null || r === null ? '' : w === 'keiner'
  ? L(`kein erkennbarer linearer Zusammenhang, Korrelation ${z(r, 2)}`, `no recognizable linear relationship, correlation ${z(r, 2)}`)
  : w === 'positiv' ? L(`positiver Zusammenhang, Korrelation ${z(r, 2)}`, `positive relationship, correlation ${z(r, 2)}`) : L(`negativer Zusammenhang, Korrelation ${z(r, 2)}`, `negative relationship, correlation ${z(r, 2)}`));

export function streu(d: StreuDaten): BildText {
  const x = sauber(d.xAchse.name), y = sauber(d.yAchse.name);
  const titel = titelOder(d.titel, L(`${y} gegen ${x}`, `${y} against ${x}`));
  const gruppen = (d.gruppen ?? [{ name: '', punkte: d.punkte ?? [], gerade: d.gerade }]).map(g => ({ name: sauber(g.name), punkte: g.punkte.filter(p => Number.isFinite(p[0]) && Number.isFinite(p[1])), gerade: g.gerade }));
  const alle = gruppen.flatMap(g => g.punkte), n = alle.length;
  if (n === 0) return keineDaten(titel, L(`Streudiagramm: ${y} gegen ${x}, keine Punkte.`, `Scatter plot: ${y} against ${x}, no points.`));
  const bx = spanne(alle.map(p => p[0])), by = spanne(alle.map(p => p[1]));
  const einfach = gruppen.length === 1;
  const r = pearson(alle), zus = zusText(zusammenhang(r), r);
  const kurz = einfach
    ? (zus ? L(`Streudiagramm: ${y} gegen ${x}, n = ${n}; ${zus}.`, `Scatter plot: ${y} against ${x}, n = ${n}; ${zus}.`) : L(`Streudiagramm: ${y} gegen ${x}, n = ${n}.`, `Scatter plot: ${y} against ${x}, n = ${n}.`))
    : L(`Streudiagramm: ${y} gegen ${x}, n = ${n} in ${gruppen.length} Gruppen (${gruppen.map(g => g.name).join(', ')}).`, `Scatter plot: ${y} against ${x}, n = ${n} in ${gruppen.length} groups (${gruppen.map(g => g.name).join(', ')}).`);
  const beschreibung: string[] = [
    L(`Streudiagramm: ${y} gegen ${x}.`, `Scatter plot: ${y} against ${x}.`),
    achsenSatz(true, d.xAchse, bx), achsenSatz(false, d.yAchse, by),
    Lp(n, `Es ist ${n} Punkt eingezeichnet.`, `Es sind ${n} Punkte eingezeichnet.`, `${n} point is drawn.`, `${n} points are drawn.`)
  ];
  const sortiert = [...alle].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (einfach) {
    if (n <= MAX_LISTE) beschreibung.push(L(`Wertepaare, nach ${x} sortiert: ${sortiert.map(p => paar(z(p[0]), z(p[1]))).join('; ')}.`, `Value pairs, sorted by ${x}: ${sortiert.map(p => paar(z(p[0]), z(p[1]))).join('; ')}.`));
    if (zus) beschreibung.push(L(`Zusammenhang: ${zus}.`, `Relationship: ${zus}.`));
    const g0 = gruppen[0]!.gerade;
    if (g0) beschreibung.push(geradenSatz(g0, x, y, bx));
  }
  const liste = einfach ? [] : gruppen.map(g => {
    const rg = pearson(g.punkte), zg = zusText(zusammenhang(rg), rg);
    const teile = [Lp(g.punkte.length, `${g.punkte.length} Punkt`, `${g.punkte.length} Punkte`, `${g.punkte.length} point`, `${g.punkte.length} points`), zg, g.gerade ? geradenSatz(g.gerade, x, y, spanne(g.punkte.map(p => p[0]))).replace(/\.$/, '') : ''].filter(Boolean);
    return `${g.name}: ${teile.join('; ')}.`;
  });
  const tabelle = einfach
    ? { titel, kopf: [x, y], zeilen: sortiert.map(p => [z(p[0]), z(p[1])]), zeilenKopf: false }
    : { titel, kopf: [L('Gruppe', 'Group'), x, y], zeilen: gruppen.flatMap(g => g.punkte.map(p => [g.name, z(p[0]), z(p[1])])), zeilenKopf: true };
  return { kurz, beschreibung: beschreibung.filter(Boolean), liste, tabelle };
}
