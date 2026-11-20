/**
 * „Die Rechnung zum Mitlesen“ (S-K K3, 23.10.2026): zu einem Ergebnis die Rechenschritte mit Formel und eingesetzten Zahlen, wie im Statistikkurs an der Tafel.
 * Reine Texte aus dem Ergebnis; die Formeln sind Mathematik und werden nicht übersetzt, nur die Namen der Schritte.
 */
import { L } from './sitzung.svelte';
import { komma, pWert, type ZweiGruppen, type Anova, type PraePost, type Zusammenhang, type Kreuz, type Vorhersage, type Verteilung } from './ergebnis';

export interface Schritt { name: string; formel: string; eingesetzt: string }
export interface Rechnung { titel: string; schritte: Schritt[] }
type Q = ZweiGruppen | Anova | PraePost | Zusammenhang | Kreuz | Vorhersage | Verteilung;
const z = (v: number, st = 3) => komma(v, st);

export function rechnung(e: Q): Rechnung | null {
  switch (e.art) {
    case 'zwei-gruppen': return tTest(e);
    case 'anova': return varianzanalyse(e);
    case 'prae-post': return gepaart(e);
    case 'zusammenhang': return (e.methode && e.methode !== 'pearson') || e.kontroll?.length ? null : korrelation(e);
    case 'kreuz': return e.zaehlung ? chiQuadrat(e) : null;
    default: return null;
  }
}

function tTest(e: ZweiGruppen): Rechnung {
  const { a, b } = e, dfK = a.n + b.n - 2, sp = e.spGepoolt, seK = sp * Math.sqrt(1 / a.n + 1 / b.n);
  const va = a.sd ** 2 / a.n, vb = b.sd ** 2 / b.n;
  return {
    titel: L('t-Test für zwei unabhängige Gruppen', 't test for two independent groups'),
    schritte: [
      { name: L('Unterschied der Mittelwerte', 'Difference of the means'), formel: 'x̄₁ − x̄₂', eingesetzt: `${z(a.m)} − ${z(b.m)} = ${z(e.diff)}` },
      { name: L('Gemeinsame Standardabweichung (klassisch)', 'Common standard deviation (classical)'), formel: 's_p = √(((n₁ − 1)·s₁² + (n₂ − 1)·s₂²) / (n₁ + n₂ − 2))', eingesetzt: `√((${a.n - 1}·${z(a.sd ** 2)} + ${b.n - 1}·${z(b.sd ** 2)}) / ${dfK}) = ${z(sp)}` },
      { name: L('Standardfehler (klassisch)', 'Standard error (classical)'), formel: 'SE = s_p · √(1/n₁ + 1/n₂)', eingesetzt: `${z(sp)} · √(1/${a.n} + 1/${b.n}) = ${z(seK, 4)}` },
      { name: L('t-Wert (klassisch)', 't value (classical)'), formel: 't = (x̄₁ − x̄₂) / SE', eingesetzt: `${z(e.diff)} / ${z(seK, 4)} = ${z(e.tKlassisch)}` },
      { name: L('Freiheitsgrade und p-Wert (klassisch)', 'Degrees of freedom and p value (classical)'), formel: 'df = n₁ + n₂ − 2;  p = 2 · P(T > |t|)', eingesetzt: `df = ${dfK};  p ${pWert(e.pKlassisch)}` },
      { name: L('Standardfehler nach Welch', 'Standard error after Welch'), formel: 'SE_W = √(s₁²/n₁ + s₂²/n₂)', eingesetzt: `√(${z(a.sd ** 2)}/${a.n} + ${z(b.sd ** 2)}/${b.n}) = ${z(Math.sqrt(va + vb), 4)}` },
      { name: L('Freiheitsgrade nach Welch-Satterthwaite', 'Degrees of freedom after Welch-Satterthwaite'), formel: 'df_W = (s₁²/n₁ + s₂²/n₂)² / ((s₁²/n₁)²/(n₁ − 1) + (s₂²/n₂)²/(n₂ − 1))', eingesetzt: `df = ${z(e.df, 2)}` },
      { name: L('t-Wert und p-Wert nach Welch', 't value and p value after Welch'), formel: 't_W = (x̄₁ − x̄₂) / SE_W', eingesetzt: `t = ${z(e.t)};  p ${pWert(e.p)}` }
    ]
  };
}

function varianzanalyse(e: Anova): Rechnung {
  const gm = e.gruppen.reduce((s, g) => s + g.n * g.m, 0) / e.n;
  return {
    titel: L('Einfaktorielle Varianzanalyse', 'One-way analysis of variance'),
    schritte: [
      { name: L('Gesamtmittel', 'Grand mean'), formel: 'x̄ = Σ nᵢ·x̄ᵢ / N', eingesetzt: `${z(gm)} (N = ${e.n})` },
      { name: L('Quadratsumme zwischen den Gruppen', 'Sum of squares between the groups'), formel: 'SS_zw = Σ nᵢ · (x̄ᵢ − x̄)²', eingesetzt: e.gruppen.map(g => `${g.n}·(${z(g.m)} − ${z(gm)})²`).join(' + ') + ` = ${z(e.ssZwischen)}` },
      { name: L('Quadratsumme innerhalb der Gruppen', 'Sum of squares within the groups'), formel: 'SS_in = Σ (nᵢ − 1) · sᵢ²', eingesetzt: e.gruppen.map(g => `${g.n - 1}·${z(g.sd ** 2)}`).join(' + ') + ` = ${z(e.ssInnerhalb)}` },
      { name: L('Mittlere Quadrate', 'Mean squares'), formel: 'MS = SS / df;  df_zw = k − 1;  df_in = N − k', eingesetzt: `MS_zw = ${z(e.ssZwischen)} / ${e.dfZwischen} = ${z(e.ssZwischen / e.dfZwischen)};  MS_in = ${z(e.ssInnerhalb)} / ${e.dfInnerhalb} = ${z(e.ssInnerhalb / e.dfInnerhalb)}` },
      { name: L('F-Wert und p-Wert', 'F value and p value'), formel: 'F = MS_zw / MS_in;  p = P(F(df_zw, df_in) > F)', eingesetzt: `F(${e.dfZwischen}, ${e.dfInnerhalb}) = ${z(e.f)};  p ${pWert(e.p)}` },
      { name: L('Effektstärke', 'Effect size'), formel: 'η² = SS_zw / (SS_zw + SS_in)', eingesetzt: `${z(e.ssZwischen)} / ${z(e.ssZwischen + e.ssInnerhalb)} = ${z(e.ssZwischen / (e.ssZwischen + e.ssInnerhalb))}` }
    ]
  };
}

function gepaart(e: PraePost): Rechnung {
  const se = e.sdDiff / Math.sqrt(e.n);
  return {
    titel: L('Gepaarter t-Test', 'Paired t test'),
    schritte: [
      { name: L('Mittel der Unterschiede', 'Mean of the differences'), formel: 'd̄ = Mittel(vorher − nachher)', eingesetzt: `${z(-e.diff)} (${L('Standardabweichung', 'standard deviation')} s_d = ${z(e.sdDiff)}, n = ${e.n})` },
      { name: L('Standardfehler', 'Standard error'), formel: 'SE = s_d / √n', eingesetzt: `${z(e.sdDiff)} / √${e.n} = ${z(se, 4)}` },
      { name: L('t-Wert', 't value'), formel: 't = d̄ / SE', eingesetzt: `${z(-e.diff)} / ${z(se, 4)} = ${z(-e.t)}` },
      { name: L('Freiheitsgrade und p-Wert', 'Degrees of freedom and p value'), formel: 'df = n − 1;  p = 2 · P(T > |t|)', eingesetzt: `df = ${e.df};  p ${pWert(e.p)}` }
    ]
  };
}

function korrelation(e: Zusammenhang): Rechnung {
  const df = e.n - 2, t = e.r * Math.sqrt(df / (1 - e.r ** 2));
  return {
    titel: L('Korrelation nach Pearson', 'Pearson correlation'),
    schritte: [
      { name: L('Korrelationskoeffizient', 'Correlation coefficient'), formel: 'r = Σ(x − x̄)(y − ȳ) / √(Σ(x − x̄)² · Σ(y − ȳ)²)', eingesetzt: `r = ${z(e.r)} (n = ${e.n})` },
      { name: L('t-Wert für r', 't value for r'), formel: 't = r · √(n − 2) / √(1 − r²)', eingesetzt: `${z(e.r)} · √${df} / √(1 − ${z(e.r * e.r, 4)}) = ${z(t)}` },
      { name: L('Freiheitsgrade und p-Wert', 'Degrees of freedom and p value'), formel: 'df = n − 2;  p = 2 · P(T > |t|)', eingesetzt: `df = ${df};  p ${pWert(e.p)}` },
      { name: L('Bereich für r (Fisher-z)', 'Interval for r (Fisher z)'), formel: 'z = artanh(r);  z ± 1,96 / √(n − 3);  zurück mit tanh', eingesetzt: `[${z(e.kiLo)}; ${z(e.kiHi)}]` }
    ]
  };
}

function chiQuadrat(e: Kreuz): Rechnung {
  const tab = e.zaehlung!.tab, zs = tab.map(r => r.reduce((a, v) => a + v, 0)), ss = tab[0]!.map((_, j) => tab.reduce((a, r) => a + r[j]!, 0));
  return {
    titel: L('Chi-Quadrat-Test', 'Chi-square test'),
    schritte: [
      { name: L('Erwartete Anzahl je Zelle', 'Expected count per cell'), formel: 'E = Zeilensumme · Spaltensumme / N', eingesetzt: `${L('zum Beispiel', 'for example')} ${zs[0]} · ${ss[0]} / ${e.n} = ${z(zs[0]! * ss[0]! / e.n, 2)}` },
      { name: 'χ²', formel: 'χ² = Σ (O − E)² / E', eingesetzt: `χ² = ${z(e.chi2)}` },
      { name: L('Freiheitsgrade und p-Wert', 'Degrees of freedom and p value'), formel: 'df = (Zeilen − 1) · (Spalten − 1);  p = P(χ²(df) > χ²)', eingesetzt: `df = ${e.df};  p ${pWert(e.p)}` },
      { name: L('Effektstärke', 'Effect size'), formel: 'V = √(χ² / (N · min(Zeilen − 1, Spalten − 1)))', eingesetzt: `V = ${z(e.v)}` }
    ]
  };
}
