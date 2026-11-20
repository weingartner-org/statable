/**
 * Sätze, APA-Zeile und Tabellen zur hierarchischen Regression (G4); Zahlen: hierreg.ts.
 * Die Tabellen sind echte Tabellen (TableItem) und werden bei jedem Aufruf neu gebaut (folgen so der Sprache).
 * Satzvorlage nach dem Fachblatt (docs/fachblaetter/WELLE2-PSYCHOLOGIE.md): „Block 2 erklärt über Block 1 hinaus weitere 23 % der Varianz, ΔR² = ,23, F(2, 95) = 16,06, p < ,001.“ (Zahlen aus R, scripts/hilfe-beispiele-welle2.R)
 * Ohne bedeutsamen Zuwachs: „Block 2 erklärt über Block 1 hinaus keinen bedeutsamen Anteil, ΔR² = …“ (Grenze p < ,05, wie überall in Statable).
 * ⚠ Satzvorlagen von der Fachperson abzunehmen.
 */
import type { TableItem } from '../engine/types';
import { L, Lp } from './sitzung.svelte';
import { aufzaehlung, proz, zitat as anfuehrung } from '../i18n/profil';
import { komma, ohneNull, pWert, kurz, st, unter05, type Saetze } from './ergebnis';
import { tabelle, fx, fo, fp, fd } from './mwsaetze';
import type { Hierreg, HierBlock, HierKoef } from './hierreg';
import { spaltenName } from './medmodsaetze';

const T = L;
const q = (t: string) => anfuehrung(kurz(t));
const prozent = (v: number) => (v > 0 && v < 0.005 ? T(`weniger als ${proz(komma(1, 0))}`, `less than ${proz(komma(1, 0))}`) : proz(komma(v * 100, 0)));
/** F(df1, df2) = …, p … */
const fText = (b: HierBlock) => `F(${komma(b.df1, 0)}, ${komma(b.df2, 0)}) = ${komma(b.f)}, p ${pWert(b.p)}`;
/** „Block 1“, „die Blöcke 1 und 2“ (alles davor, über das ein Block hinaus erklärt). */
const davor = (nr: number) => (nr === 2 ? T('Block 1', 'block 1') : nr === 3 ? T('die Blöcke 1 und 2', 'blocks 1 and 2') : T(`die Blöcke 1 bis ${nr - 1}`, `blocks 1 to ${nr - 1}`));

/** Der Satz zu einem Block (Block 1 gegen das Nullmodell, spätere über die vorigen hinaus). */
export function blockSatz(b: HierBlock): string {
  const rechenbar = Number.isFinite(b.f);
  const sig = rechenbar && b.p < 0.05;
  if (!rechenbar) return T(`Block ${b.nr}: Die F-Änderung lässt sich nicht rechnen (zu wenige Fälle für diese Zahl von Prädiktoren).`, `Block ${b.nr}: the F change cannot be calculated (too few cases for this number of predictors).`);
  if (b.nr === 1) {
    return sig
      ? T(`Block 1 erklärt ${prozent(b.r2)} der Varianz, R² = ${ohneNull(b.r2)}, ${fText(b)}.`, `Block 1 explains ${prozent(b.r2)} of the variance, R² = ${ohneNull(b.r2)}, ${fText(b)}.`)
      : T(`Block 1 erklärt keinen bedeutsamen Anteil der Varianz, R² = ${ohneNull(b.r2)}, ${fText(b)}.`, `Block 1 does not explain a significant share of the variance, R² = ${ohneNull(b.r2)}, ${fText(b)}.`);
  }
  return sig
    ? T(`Block ${b.nr} erklärt über ${davor(b.nr)} hinaus weitere ${prozent(b.dr2)} der Varianz, ΔR² = ${ohneNull(b.dr2)}, ${fText(b)}.`,
      `Block ${b.nr} explains a further ${prozent(b.dr2)} of the variance beyond ${davor(b.nr)}, ΔR² = ${ohneNull(b.dr2)}, ${fText(b)}.`)
    : T(`Block ${b.nr} erklärt über ${davor(b.nr)} hinaus keinen bedeutsamen Anteil, ΔR² = ${ohneNull(b.dr2)}, ${fText(b)}.`,
      `Block ${b.nr} does not explain a significant share beyond ${davor(b.nr)}, ΔR² = ${ohneNull(b.dr2)}, ${fText(b)}.`);
}

export function saetzeHierreg(e: Hierreg, name: (n: string) => string = spaltenName): Saetze {
  const letzter = e.bloecke.at(-1)!, ziel = q(name(e.ziel));
  const haupt = e.bloecke.map(blockSatz).join(' ');

  const welche = e.bloecke.map(b => `Block ${b.nr}: ${aufzaehlung(b.spalten.map(n => q(name(n))))}`).join(' · ');
  const gesamt = T(`Alle Blöcke zusammen erklären ${prozent(letzter.r2)} der Unterschiede bei ${ziel} (R² = ${ohneNull(letzter.r2)}, korrigiertes R² = ${ohneNull(letzter.r2korr)}).`,
    `All blocks together explain ${prozent(letzter.r2)} of the differences in ${ziel} (R² = ${ohneNull(letzter.r2)}, adjusted R² = ${ohneNull(letzter.r2korr)}).`);
  const sinkt = e.bloecke.slice(1).filter((b, i) => b.r2korr < e.bloecke[i]!.r2korr);
  const korr = sinkt.length
    ? T(`Das korrigierte R² sinkt bei ${aufzaehlung(sinkt.map(b => `Block ${b.nr}`))}: Der Zugewinn an R² ist dort kleiner, als allein durch die zusätzlichen Prädiktoren zu erwarten wäre.`,
      `The adjusted R² falls for ${aufzaehlung(sinkt.map(b => `block ${b.nr}`))}: the gain in R² is smaller there than the additional predictors alone would produce.`)
    : '';
  const luecken = e.luecken ?? 0;
  const faelle = T(`Alle Blöcke rechnen auf denselben ${e.n} Fällen.`, `All blocks are calculated on the same ${e.n} cases.`)
    + (luecken > 0
      ? Lp(luecken, ' Ein Fall fehlt wegen Lücken in späteren Blöcken und fehlt darum auch in Block 1.', ` ${luecken} Fälle fehlen wegen Lücken in späteren Blöcken und fehlen darum auch in Block 1.`,
        ' One case is missing because of gaps in later blocks and is therefore also left out of block 1.', ` ${luecken} cases are missing because of gaps in later blocks and are therefore also left out of block 1.`)
      : '');
  const eigen = e.koeffizienten.filter(k => k.p < 0.05);
  const koefText = (k: HierKoef) => `${q(k.name)} (B = ${komma(k.b, st(k.b, 2))}, p ${pWert(k.p)})`;
  const eigenListe = aufzaehlung(eigen.map(koefText));
  const letztes = eigen.length
    ? Lp(eigen.length,
      `Im Modell mit allen Blöcken trägt ${eigenListe} einzeln signifikant bei; bei den übrigen belegen die Daten keinen eigenen Beitrag.`,
      `Im Modell mit allen Blöcken tragen ${eigenListe} jeweils einzeln signifikant bei; bei den übrigen belegen die Daten keinen eigenen Beitrag.`,
      `In the model with all blocks, ${eigenListe} makes a significant contribution of its own; for the others the data do not show a contribution of their own.`,
      `In the model with all blocks, ${eigenListe} make a significant contribution of their own; for the others the data do not show a contribution of their own.`)
    : T('Im Modell mit allen Blöcken belegen die Daten für keinen Prädiktor einen eigenen Beitrag.', 'In the model with all blocks, the data show no contribution of its own for any predictor.');
  const zusatz = [welche, gesamt, korr, faelle, letztes].filter(Boolean).join('\n');

  const vorsicht = T('ΔR² beschreibt, um wie viel die erklärte Varianz wächst, nicht eine Ursache. Die Reihenfolge der Blöcke ist theoretisch zu begründen, nicht nach dem Ergebnis zu wählen; eine andere Reihenfolge ergibt andere ΔR².',
    'ΔR² describes by how much the explained variance grows, not a cause. The order of the blocks is to be justified by theory, not chosen after seeing the result; a different order gives different ΔR².');

  const apa = e.bloecke.map(b => b.nr === 1
    ? `Block 1: R² = ${ohneNull(b.r2)}, ${fText(b)}`
    : `Block ${b.nr}: ΔR² = ${ohneNull(b.dr2)}, ${fText(b)}`).join('; ');

  return {
    haupt, zusatz, vorsicht, apa,
    marken: [
      ...e.bloecke.map(b => ({ text: b.nr === 1 ? `Block 1: R² = ${ohneNull(b.r2)} · p ${pWert(b.p)}${Number.isFinite(b.p) ? unter05(b.p < 0.05) : ''}` : `Block ${b.nr}: ΔR² = ${ohneNull(b.dr2)} · p ${pWert(b.p)}${Number.isFinite(b.p) ? unter05(b.p < 0.05) : ''}`, erklaer: b.nr === 1 ? 'regression' : 'p-wert' })),
      { text: T(`Insgesamt: R² = ${ohneNull(letzter.r2)}`, `Overall: R² = ${ohneNull(letzter.r2)}`), erklaer: 'regression' },
      { text: T(`${e.n} Fälle in allen Blöcken`, `${e.n} cases in all blocks`), erklaer: 'stichprobe' },
      ...(e.luecken && e.luecken > 0 ? [{ text: Lp(e.luecken, '1 Fall durch Lücken in späteren Blöcken ausgeschlossen', `${e.luecken} Fälle durch Lücken in späteren Blöcken ausgeschlossen`, '1 case left out because of gaps in later blocks', `${e.luecken} cases left out because of gaps in later blocks`), erklaer: 'stichprobe', hinweis: true }] : [])
    ]
  };
}

export function tabellenHierreg(e: Hierreg, name: (n: string) => string = spaltenName): TableItem[] {
  const Y = name(e.ziel);
  const bloecke = tabelle('Hierarchical Regression', T('Hierarchische Regression: Blöcke', 'Hierarchical regression: blocks'),
    [T('Block', 'Block'), T('Prädiktoren', 'Predictors'), 'R²', T('korr. R²', 'adj. R²'), 'ΔR²', T('F-Änderung', 'F change'), 'df1', 'df2', 'p'],
    e.bloecke.map(b => [String(b.nr), b.spalten.map(name).join(', '), fo(b.r2), fo(b.r2korr), fo(b.dr2), fx(b.f), fd(b.df1), fd(b.df2), fp(b.p)]),
    [T(`Abhängige Größe: ${Y}; ${e.n} Fälle, in allen Blöcken dieselben. Block 1 wird gegen das Modell ohne Prädiktoren geprüft (ΔR² = R²). F-Änderung = (ΔR² / df1) / ((1 − R²) / df2) mit df1 = neue Koeffizienten und df2 = Rest-Freiheitsgrade des Modells bis zu diesem Block (wie SPSS „F Change“). Je Block ein PSPP-Lauf.`,
      `Dependent variable: ${Y}; ${e.n} cases, the same in all blocks. Block 1 is tested against the model without predictors (ΔR² = R²). F change = (ΔR² / df1) / ((1 − R²) / df2) with df1 = new coefficients and df2 = residual degrees of freedom of the model up to this block (as SPSS "F Change"). One PSPP run per block.`)]);
  const koef = tabelle('Hierarchical Regression Coefficients', (e.bloecke.length === 2 ? T('Koeffizienten des Modells mit beiden Blöcken', 'Coefficients of the model with both blocks')
      : e.bloecke.length === 3 ? T('Koeffizienten des Modells mit allen drei Blöcken', 'Coefficients of the model with all three blocks')
        : T(`Koeffizienten des Modells mit allen ${e.bloecke.length} Blöcken`, `Coefficients of the model with all ${e.bloecke.length} blocks`)),
    [T('Prädiktor', 'Predictor'), 'B', 'SE', 'β', 't', 'p'],
    [[T('Konstante', 'Constant'), fx(e.konstante.b), fx(e.konstante.se), '', fx(e.konstante.t), fp(e.konstante.p)],
      ...e.koeffizienten.map(k => [k.name, fx(k.b), fx(k.se), fo(k.beta), fx(k.t), fp(k.p)])],
    [T('B: unstandardisierter Koeffizient; β: standardisiert (PSPP „Beta“). Bei Gruppen-Spalten ist B der Unterschied zur Vergleichsgruppe.', 'B: unstandardised coefficient; β: standardised (PSPP "Beta"). For group columns B is the difference from the reference group.')]);
  return [bloecke, koef];
}
