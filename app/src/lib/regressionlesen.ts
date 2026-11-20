/**
 * Mehrere REGRESSION-Läufe aus einer PSPP-Ausgabe lesen (Mediation, Moderation).
 * PSPP 2.1.1 liefert je Lauf: Model Summary, ANOVA, Coefficients. (Die Tabelle von /STATISTICS=BCOV ist in 2.1.1 unbrauchbar: sie zeigt nur die ersten drei Zeilen und Spalten der Matrix
 * einschließlich Konstante, aber mit den Namen der Prädiktoren beschriftet - die Kovarianzen der B rechnet Statable deshalb selbst, siehe moderation.ts.)
 */
import type { OutputItem, TableItem } from '../engine/types';
import { raster, spalte } from './tabelle';

export interface RegTerm { name: string; b: number; se: number; beta: number; t: number; p: number; lo: number; hi: number }
export interface RegModell {
  ziel: string; r2: number; r2korr: number; f: number; df1: number; df2: number; p: number; n: number;
  konstante: RegTerm; terme: RegTerm[];
}

const zahl = (v: number | undefined): number => { if (v === undefined || Number.isNaN(v)) throw new Error('Zahl fehlt in der PSPP-Ausgabe'); return v; };

export function regressionsModelle(items: OutputItem[]): RegModell[] {
  const tabellen = items.filter((i): i is TableItem => i.type === 'table');
  const ergebnis: RegModell[] = [];
  for (let i = 0; i < tabellen.length; i++) {
    const t = tabellen[i]!;
    if (!/^Model Summary/.test(t.label)) continue;
    const ms = raster(t), an = raster(tabellen[i + 1]!), ko = raster(tabellen[i + 2]!);
    if (!/^ANOVA/.test(tabellen[i + 1]?.label ?? '') || !/^Coefficients/.test(tabellen[i + 2]?.label ?? '')) throw new Error('Regressions-Tabellen fehlen');
    const z0 = ms.tabelle.headRows[0];
    const reg = an.t.findIndex(z => z[0] === 'Regression'), res = an.t.findIndex(z => z[0] === 'Residual');
    const c = { df: spalte(an, /^df$/), f: spalte(an, /^F$/), p: spalte(an, /^Sig\.$/) };
    const k = { b: spalte(ko, /^B$/), se: spalte(ko, /^Std\. Error$/), beta: spalte(ko, /^Beta$/), t: spalte(ko, /^t$/), p: spalte(ko, /^Sig\.$/), lo: spalte(ko, /^Lower Bound$/), hi: spalte(ko, /^Upper Bound$/) };
    const alle: RegTerm[] = [];
    for (let r = ko.tabelle.headRows[0]; r < ko.t.length; r++) {
      if (ko.n[r]![k.b] === undefined) continue;
      alle.push({ name: ko.t[r]![0] ?? '', b: zahl(ko.n[r]![k.b]), se: zahl(ko.n[r]![k.se]), beta: ko.n[r]![k.beta] ?? NaN, t: zahl(ko.n[r]![k.t]), p: zahl(ko.n[r]![k.p]), lo: zahl(ko.n[r]![k.lo]), hi: zahl(ko.n[r]![k.hi]) });
    }
    const konst = alle.find(x => x.name === '(Constant)');
    if (!konst) throw new Error('Konstante fehlt');
    const terme = alle.filter(x => x !== konst);
    const df1 = zahl(an.n[reg]![c.df]), df2 = zahl(an.n[res]![c.df]);
    const m: RegModell = {
      ziel: /\((.*)\)\s*$/.exec(t.label)?.[1] ?? '', r2: zahl(ms.n[z0]![spalte(ms, /^R Square$/)]), r2korr: zahl(ms.n[z0]![spalte(ms, /^Adjusted R Square$/)]),
      f: zahl(an.n[reg]![c.f]), df1, df2, p: zahl(an.n[reg]![c.p]), n: df1 + df2 + 1, konstante: konst, terme
    };
    ergebnis.push(m);
  }
  return ergebnis;
}
