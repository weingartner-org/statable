/**
 * „So geht es in Excel und auf dem TI-84“ (S-K K2, 23.10.2026): zu einem Ergebnis die Schritte, mit denen sich dieselbe Zahl in Excel und auf dem Taschenrechner TI-84 Plus (CE) ergibt,
 * mit den eingesetzten Werten aus der Rechnung und der Zahl, die dabei herauskommen soll. Reine Texte, keine Rechnung: alle Zahlen stammen aus dem Ergebnis.
 * Excel: englische Funktionsnamen und Komma als Trenner; bei deutscher Oberfläche die deutschen Namen und Semikolon. TI-84: Menüs wie am Gerät (STAT ▸ TESTS ▸ …).
 * ⚠ Von der Fachperson (Andreas, Statistik-Lehre mit Excel und TI-84) gegenzulesen: Menünamen und Reihenfolge am Gerät, Funktionsnamen, Hinweise.
 */
import { L } from './sitzung.svelte';
import { s } from './sitzung.svelte';
import { komma, ohneNull, pWert, type ZweiGruppen, type Anova, type PraePost, type Zusammenhang, type Kreuz, type Vorhersage, type Verteilung } from './ergebnis';

export interface Anleitung { titel: string; excel: string[]; ti: string[]; spss: string[]; r: string[]; jamovi: string[]; stata: string[]; soll: string[]; hinweis?: string }
type Teil = Omit<Anleitung, 'spss' | 'r' | 'jamovi' | 'stata'>;
export type AnleitungQuelle = ZweiGruppen | Anova | PraePost | Zusammenhang | Kreuz | Vorhersage | Verteilung;

const deutsch = () => s.einst.sprache === 'de';
/** Excel-Funktion mit Argumenten: englischer Name und Komma, bei Deutsch deutscher Name und Semikolon. */
export const xl = (en: string, de: string, ...arg: string[]) => `=${deutsch() ? de : en}(${arg.join(deutsch() ? '; ' : ', ')})`;
const z = (v: number, st = 2) => komma(v, st);

export function anleitung(e: AnleitungQuelle, name: (n: string) => string = n => n): Anleitung | null {
  const a = anleitungOhneSpss(e, name);
  return a ? { ...a, spss: spssZeilen(e), r: rZeilen(e), jamovi: jamoviZeilen(e), stata: stataZeilen(e) } : null;
}

function anleitungOhneSpss(e: AnleitungQuelle, name: (n: string) => string): Teil | null {
  switch (e.art) {
    case 'zwei-gruppen': return tTest(e, name);
    case 'anova': return varianzanalyse(e, name);
    case 'prae-post': return gepaart(e);
    case 'zusammenhang': return e.methode && e.methode !== 'pearson' || e.kontroll?.length ? null : korrelation(e);
    case 'kreuz': return e.zaehlung ? chiQuadrat(e) : null;
    case 'vorhersage': return regression(e);
    case 'verteilung': return kennzahlen(e);
    default: return null;
  }
}

function tTest(e: ZweiGruppen, name: (n: string) => string): Teil {
  const A = 'A', B = 'B';
  return {
    titel: L('Zwei unabhängige Gruppen vergleichen (t-Test)', 'Comparing two independent groups (t test)'),
    excel: [
      L(`Die Werte der Gruppe „${e.a.name}“ stehen in einer Spalte, die der Gruppe „${e.b.name}“ in einer zweiten (Bereiche ${A} und ${B}).`, `The values of group "${e.a.name}" are in one column, those of group "${e.b.name}" in a second one (ranges ${A} and ${B}).`),
      L(`p-Wert des klassischen t-Tests (gleiche Streuung): ${xl('T.TEST', 'T.TEST', A, B, '2', '2')}`, `p value of the classical t test (equal spread): ${xl('T.TEST', 'T.TEST', A, B, '2', '2')}`),
      L(`p-Wert des t-Tests nach Welch: ${xl('T.TEST', 'T.TEST', A, B, '2', '3')}`, `p value of Welch's t test: ${xl('T.TEST', 'T.TEST', A, B, '2', '3')}`),
      L(`Mittelwert: ${xl('AVERAGE', 'MITTELWERT', A)}, Standardabweichung: ${xl('STDEV.S', 'STABW.S', A)}, Anzahl: ${xl('COUNT', 'ANZAHL', A)} (ebenso für ${B}).`, `Mean: ${xl('AVERAGE', 'MITTELWERT', A)}, standard deviation: ${xl('STDEV.S', 'STABW.S', A)}, count: ${xl('COUNT', 'ANZAHL', A)} (the same for ${B}).`),
      L('Mit Tabelle: Daten ▸ Datenanalyse ▸ „t-Test: Zwei Stichproben unter der Annahme gleicher Varianzen“ (oder „… ungleicher Varianzen“ für Welch).', 'With a table: Data ▸ Data Analysis ▸ "t-Test: Two-Sample Assuming Equal Variances" (or "… Unequal Variances" for Welch).')
    ],
    ti: [
      L(`Die Werte in die Listen L1 und L2 eingeben (STAT ▸ 1:Edit), oder gleich mit den Kennzahlen rechnen.`, `Enter the values into lists L1 and L2 (STAT ▸ 1:Edit), or calculate directly with the summary values.`),
      L('STAT ▸ TESTS ▸ 4:2-SampTTest …', 'STAT ▸ TESTS ▸ 4:2-SampTTest …'),
      L(`Inpt: Stats, mit x̄1 = ${z(e.a.m, 3)}, Sx1 = ${z(e.a.sd, 3)}, n1 = ${e.a.n}, x̄2 = ${z(e.b.m, 3)}, Sx2 = ${z(e.b.sd, 3)}, n2 = ${e.b.n} (bei „Inpt: Data“ List1 = L1, List2 = L2, Freq = 1).`, `Inpt: Stats, with x̄1 = ${z(e.a.m, 3)}, Sx1 = ${z(e.a.sd, 3)}, n1 = ${e.a.n}, x̄2 = ${z(e.b.m, 3)}, Sx2 = ${z(e.b.sd, 3)}, n2 = ${e.b.n} (with "Inpt: Data" List1 = L1, List2 = L2, Freq = 1).`),
      L('μ1: ≠μ2 (zweiseitig); Pooled: Yes für den klassischen Test, Pooled: No für Welch; dann Calculate.', 'μ1: ≠μ2 (two-sided); Pooled: Yes for the classical test, Pooled: No for Welch; then Calculate.')
    ],
    soll: [
      L(`Klassisch (Pooled: Yes): t = ${z(e.tKlassisch)}, df = ${z(e.dfKlassisch, 0)}, p ${pWert(e.pKlassisch)}.`, `Classical (Pooled: Yes): t = ${z(e.tKlassisch)}, df = ${z(e.dfKlassisch, 0)}, p ${pWert(e.pKlassisch)}.`),
      L(`Welch (Pooled: No): t = ${z(e.t)}, df = ${z(e.df)}, p ${pWert(e.p)}.`, `Welch (Pooled: No): t = ${z(e.t)}, df = ${z(e.df)}, p ${pWert(e.p)}.`)
    ],
    hinweis: L(`Die Bezeichnungen der Gruppen sind „${e.a.name}“ und „${e.b.name}“ (${name(e.gruppenSpalte)}); das Vorzeichen von t hängt davon ab, welche Gruppe zuerst steht.`, `The groups are "${e.a.name}" and "${e.b.name}" (${name(e.gruppenSpalte)}); the sign of t depends on which group comes first.`)
  };
}

function varianzanalyse(e: Anova, name: (n: string) => string): Teil {
  const k = e.gruppen.length;
  return {
    titel: L('Mehr als zwei Gruppen vergleichen (einfaktorielle Varianzanalyse)', 'Comparing more than two groups (one-way analysis of variance)'),
    excel: [
      L(`Je Gruppe eine Spalte nebeneinander (${k} Spalten), die Köpfe sind die Gruppennamen.`, `One column per group next to each other (${k} columns), the headers are the group names.`),
      L('Daten ▸ Datenanalyse ▸ „Anova: Einfaktorielle Varianzanalyse“, Eingabebereich mit den Köpfen, „Beschriftungen in erster Zeile“ ankreuzen. Die Ausgabe zeigt F, den p-Wert („P-Wert“) und F krit.', 'Data ▸ Data Analysis ▸ "Anova: Single Factor", input range with the headers, tick "Labels in first row". The output shows F, the p value ("P-value") and F crit.'),
      L(`p-Wert aus F von Hand: ${xl('F.DIST.RT', 'F.VERT.RE', z(e.f, 4), String(e.dfZwischen), String(e.dfInnerhalb))}`, `p value from F by hand: ${xl('F.DIST.RT', 'F.VERT.RE', z(e.f, 4), String(e.dfZwischen), String(e.dfInnerhalb))}`)
    ],
    ti: [
      L(`Die Werte jeder Gruppe in je eine Liste eingeben (L1 … L${Math.min(k, 6)}; STAT ▸ 1:Edit).`, `Enter the values of each group into a list of its own (L1 … L${Math.min(k, 6)}; STAT ▸ 1:Edit).`),
      L(`STAT ▸ TESTS ▸ H:ANOVA( (TI-83 Plus: F:ANOVA() und die Listen nennen, zum Beispiel ANOVA(L1,L2${k > 2 ? ',L3' : ''}), dann ENTER.`, `STAT ▸ TESTS ▸ H:ANOVA( (TI-83 Plus: F:ANOVA() and name the lists, for example ANOVA(L1,L2${k > 2 ? ',L3' : ''}), then ENTER.`),
      L('Der TI-84 rechnet die klassische Varianzanalyse (gleiche Streuung); er zeigt F, p, die Freiheitsgrade und die Quadratsummen.', 'The TI-84 calculates the classical analysis of variance (equal spread); it shows F, p, the degrees of freedom and the sums of squares.')
    ],
    soll: [L(`Klassisch: F(${z(e.dfZwischen, 0)}, ${z(e.dfInnerhalb, 0)}) = ${z(e.f)}, p ${pWert(e.p)}; Quadratsummen zwischen ${z(e.ssZwischen)} und innerhalb ${z(e.ssInnerhalb)}.`, `Classical: F(${z(e.dfZwischen, 0)}, ${z(e.dfInnerhalb, 0)}) = ${z(e.f)}, p ${pWert(e.p)}; sums of squares between ${z(e.ssZwischen)} and within ${z(e.ssInnerhalb)}.`)],
    hinweis: L(`Gruppen: ${e.gruppen.map(g => `${g.name} (n = ${g.n}, x̄ = ${z(g.m)})`).join('; ')} - Spalte ${name(e.gruppenSpalte)}.`, `Groups: ${e.gruppen.map(g => `${g.name} (n = ${g.n}, x̄ = ${z(g.m)})`).join('; ')} - column ${name(e.gruppenSpalte)}.`)
  };
}

function gepaart(e: PraePost): Teil {
  return {
    titel: L('Zwei Messungen derselben Personen (gepaarter t-Test)', 'Two measurements of the same people (paired t test)'),
    excel: [
      L('Vorher und nachher stehen in zwei Spalten, jede Zeile ist eine Person (Bereiche A und B).', 'Before and after are in two columns, every row is one person (ranges A and B).'),
      L(`p-Wert: ${xl('T.TEST', 'T.TEST', 'A', 'B', '2', '1')}`, `p value: ${xl('T.TEST', 'T.TEST', 'A', 'B', '2', '1')}`),
      L('Mit Tabelle: Daten ▸ Datenanalyse ▸ „t-Test bei gepaarten Stichproben“ (t-Test: Paired Two Sample for Means).', 'With a table: Data ▸ Data Analysis ▸ "t-Test: Paired Two Sample for Means".')
    ],
    ti: [
      L('Vorher in L1, nachher in L2; die Unterschiede als L3 = L1 − L2 (Kopf von L3 anwählen und L1 − L2 eingeben).', 'Before in L1, after in L2; the differences as L3 = L1 − L2 (select the header of L3 and enter L1 − L2).'),
      L(`STAT ▸ TESTS ▸ 2:T-Test …, Inpt: Data, μ0 = 0, List: L3, Freq: 1, μ: ≠μ0 (zweiseitig), Calculate. Mit Kennzahlen: Inpt: Stats, x̄ = ${z(-e.diff, 3)}, Sx = ${z(e.sdDiff, 3)}, n = ${e.n}.`, `STAT ▸ TESTS ▸ 2:T-Test …, Inpt: Data, μ0 = 0, List: L3, Freq: 1, μ: ≠μ0 (two-sided), Calculate. With summary values: Inpt: Stats, x̄ = ${z(-e.diff, 3)}, Sx = ${z(e.sdDiff, 3)}, n = ${e.n}.`)
    ],
    soll: [L(`t(${e.df}) = ${z(-e.t)}, p ${pWert(e.p)}; Mittel der Unterschiede vorher − nachher ${z(-e.diff, 3)}.`, `t(${e.df}) = ${z(-e.t)}, p ${pWert(e.p)}; mean of the differences before − after ${z(-e.diff, 3)}.`)],
    hinweis: L('Hier wird wie in den meisten Lehrbüchern, in Excel, SPSS, R und auf dem TI-84 „vorher − nachher“ gerechnet. Der Satz oben sagt, wie viel höher oder niedriger der Wert nachher liegt; darum haben t und der Unterschied hier das umgekehrte Vorzeichen.', 'Here, as in most textbooks, in Excel, SPSS, R and on the TI-84, "before − after" is calculated. The sentence above says how much higher or lower the value is afterwards; that is why t and the difference have the opposite sign here.')
  };
}

function korrelation(e: Zusammenhang): Teil {
  const df = e.n - 2, t = e.r * Math.sqrt(df / (1 - e.r ** 2));
  return {
    titel: L('Zusammenhang zweier Zahlen (Korrelation nach Pearson)', 'Relation of two numbers (Pearson correlation)'),
    excel: [
      L('Beide Zahlen stehen in zwei Spalten, jede Zeile ist eine Person (Bereiche A und B).', 'Both numbers are in two columns, every row is one person (ranges A and B).'),
      L(`r: ${xl('CORREL', 'KORREL', 'A', 'B')}, r²: ${xl('RSQ', 'BESTIMMTHEITSMASS', 'A', 'B')}`, `r: ${xl('CORREL', 'KORREL', 'A', 'B')}, r²: ${xl('RSQ', 'BESTIMMTHEITSMASS', 'A', 'B')}`),
      L(`p-Wert von Hand (r in Zelle R, Zahl der Personen n): ${xl('T.DIST.2T', 'T.VERT.2S', 'ABS(R*SQRT((n-2)/(1-R^2)))', 'n-2')}`, `p value by hand (r in cell R, number of people n): ${xl('T.DIST.2T', 'T.VERT.2S', 'ABS(R*SQRT((n-2)/(1-R^2)))', 'n-2')}`)
    ],
    ti: [
      L('Die erste Zahl in L1, die zweite in L2. Einmalig 2nd ▸ CATALOG ▸ DiagnosticOn ▸ ENTER, damit r angezeigt wird.', 'The first number in L1, the second in L2. Once: 2nd ▸ CATALOG ▸ DiagnosticOn ▸ ENTER so that r is shown.'),
      L('STAT ▸ TESTS ▸ F:LinRegTTest (TI-83 Plus: E:LinRegTTest) …, Xlist: L1, Ylist: L2, Freq: 1, β & ρ: ≠0, Calculate.', 'STAT ▸ TESTS ▸ F:LinRegTTest (TI-83 Plus: E:LinRegTTest) …, Xlist: L1, Ylist: L2, Freq: 1, β & ρ: ≠0, Calculate.')
    ],
    soll: [L(`r = ${ohneNull(e.r)}, t(${df}) = ${z(t)}, p ${pWert(e.p)}, n = ${e.n}.`, `r = ${ohneNull(e.r)}, t(${df}) = ${z(t)}, p ${pWert(e.p)}, n = ${e.n}.`)]
  };
}

function chiQuadrat(e: Kreuz): Teil {
  const tab = e.zaehlung!.tab, zeilen = tab.map(r => `[${r.join(', ')}]`).join(' ');
  return {
    titel: L('Gruppen und Antworten (Chi-Quadrat-Test)', 'Groups and answers (chi-square test)'),
    excel: [
      L(`Die gezählten Personen als Tabelle (Zeilen: ${e.gruppen}, Spalten: ${e.gezaehlt}): ${zeilen}.`, `The counted people as a table (rows: ${e.gruppen}, columns: ${e.gezaehlt}): ${zeilen}.`),
      L('Erwartete Anzahl je Zelle: Zeilensumme × Spaltensumme / Gesamtsumme, in eine zweite Tabelle derselben Form.', 'Expected count per cell: row total × column total / grand total, in a second table of the same shape.'),
      L(`p-Wert: ${xl('CHISQ.TEST', 'CHIQU.TEST', 'Beobachtet', 'Erwartet')}; χ² selbst: ${xl('CHISQ.INV.RT', 'CHIQU.INV.RE', 'p', String(e.df))}`, `p value: ${xl('CHISQ.TEST', 'CHIQU.TEST', 'Observed', 'Expected')}; χ² itself: ${xl('CHISQ.INV.RT', 'CHIQU.INV.RE', 'p', String(e.df))}`)
    ],
    ti: [
      L(`Die Tabelle als Matrix [A] eingeben (2nd ▸ x⁻¹ ▸ EDIT ▸ 1:[A], Größe ${tab.length} × ${tab[0]!.length}): ${zeilen}.`, `Enter the table as matrix [A] (2nd ▸ x⁻¹ ▸ EDIT ▸ 1:[A], size ${tab.length} × ${tab[0]!.length}): ${zeilen}.`),
      L('STAT ▸ TESTS ▸ C:χ²-Test …, Observed: [A], Expected: [B], Calculate. Die erwarteten Anzahlen legt das Gerät selbst in [B] ab.', 'STAT ▸ TESTS ▸ C:χ²-Test …, Observed: [A], Expected: [B], Calculate. The device puts the expected counts into [B] itself.')
    ],
    soll: [L(`χ²(${e.df}) = ${z(e.chi2)}, p ${pWert(e.p)}, n = ${e.n}.`, `χ²(${e.df}) = ${z(e.chi2)}, p ${pWert(e.p)}, n = ${e.n}.`)],
    hinweis: e.minErwartet < 5 ? L(`Die kleinste erwartete Anzahl ist ${z(e.minErwartet)} (unter 5): Der Test ist dann nur grob.`, `The smallest expected count is ${z(e.minErwartet)} (below 5): the test is then only rough.`) : undefined
  };
}

function regression(e: Vorhersage): Teil {
  const eins = e.praediktoren.length === 1 && !e.faktoren?.length, p = e.praediktoren[0]!;
  if (!eins) return {
    titel: L('Lineare Regression mit mehreren Vorhersagegrößen', 'Linear regression with several predictors'),
    excel: [
      L('Die Vorhersagegrößen stehen in nebeneinanderliegenden Spalten, das Ergebnis in einer eigenen Spalte.', 'The predictors are in adjacent columns, the outcome in a column of its own.'),
      L('Daten ▸ Datenanalyse ▸ „Regression“: Y-Eingabebereich = Ergebnis, X-Eingabebereich = alle Vorhersagegrößen, „Beschriftungen“ ankreuzen. Die Ausgabe zeigt R², F, p und je Vorhersagegröße B, Standardfehler, t, p und Intervall.', 'Data ▸ Data Analysis ▸ "Regression": Input Y range = outcome, Input X range = all predictors, tick "Labels". The output shows R², F, p and for each predictor B, standard error, t, p and interval.'),
      L(`Mit Funktion: ${xl('LINEST', 'RGP', 'Y', 'X', 'WAHR', 'WAHR')} (als Matrixformel; die Koeffizienten stehen in umgekehrter Reihenfolge).`, `With a function: ${xl('LINEST', 'RGP', 'Y', 'X', 'TRUE', 'TRUE')} (as an array formula; the coefficients come in reverse order).`)
    ],
    ti: [L('Der TI-84 rechnet in den Standardmenüs nur die Regression mit einer Vorhersagegröße (STAT ▸ CALC ▸ 8:LinReg(a+bx)). Für mehrere Vorhersagegrößen braucht es Excel oder ein anderes Programm.', 'The TI-84 only calculates regression with one predictor in its standard menus (STAT ▸ CALC ▸ 8:LinReg(a+bx)). For several predictors you need Excel or another program.')],
    soll: [L(`R² = ${z(e.r2, 3)}, F(${e.df1}, ${e.df2}) = ${z(e.f)}, p ${pWert(e.p)}; B: ${e.praediktoren.map(q => `${q.name} ${z(q.b, 3)}`).join('; ')}.`, `R² = ${z(e.r2, 3)}, F(${e.df1}, ${e.df2}) = ${z(e.f)}, p ${pWert(e.p)}; B: ${e.praediktoren.map(q => `${q.name} ${z(q.b, 3)}`).join('; ')}.`)]
  };
  return {
    titel: L('Lineare Regression mit einer Vorhersagegröße', 'Linear regression with one predictor'),
    excel: [
      L('Vorhersagegröße x und Ergebnis y stehen in zwei Spalten (Bereiche X und Y).', 'Predictor x and outcome y are in two columns (ranges X and Y).'),
      L(`Steigung B: ${xl('SLOPE', 'STEIGUNG', 'Y', 'X')}, Achsenabschnitt: ${xl('INTERCEPT', 'ACHSENABSCHNITT', 'Y', 'X')}, R²: ${xl('RSQ', 'BESTIMMTHEITSMASS', 'Y', 'X')}`, `Slope B: ${xl('SLOPE', 'STEIGUNG', 'Y', 'X')}, intercept: ${xl('INTERCEPT', 'ACHSENABSCHNITT', 'Y', 'X')}, R²: ${xl('RSQ', 'BESTIMMTHEITSMASS', 'Y', 'X')}`),
      L('Mit Tabelle (mit t, p und Intervall): Daten ▸ Datenanalyse ▸ „Regression“.', 'With a table (with t, p and interval): Data ▸ Data Analysis ▸ "Regression".')
    ],
    ti: [
      L('x in L1, y in L2. Einmalig 2nd ▸ CATALOG ▸ DiagnosticOn ▸ ENTER, damit r und r² erscheinen.', 'x in L1, y in L2. Once: 2nd ▸ CATALOG ▸ DiagnosticOn ▸ ENTER so that r and r² appear.'),
      L('STAT ▸ CALC ▸ 8:LinReg(a+bx) mit Xlist: L1, Ylist: L2, dann Calculate: zeigt a (Achsenabschnitt), b (Steigung), r², r. Mit STAT ▸ TESTS ▸ F:LinRegTTest (TI-83 Plus: E:LinRegTTest) kommen t und p dazu.', 'STAT ▸ CALC ▸ 8:LinReg(a+bx) with Xlist: L1, Ylist: L2, then Calculate: shows a (intercept), b (slope), r², r. With STAT ▸ TESTS ▸ F:LinRegTTest (TI-83 Plus: E:LinRegTTest) t and p are added.')
    ],
    soll: [L(`Steigung b = ${z(p.b, 3)}, r² = ${z(e.r2, 3)}${p.t !== undefined ? `, t = ${z(p.t)}` : ''}, p ${pWert(p.p)}.`, `Slope b = ${z(p.b, 3)}, r² = ${z(e.r2, 3)}${p.t !== undefined ? `, t = ${z(p.t)}` : ''}, p ${pWert(p.p)}.`)]
  };
}

function kennzahlen(e: Verteilung): Teil | null {
  const k = e.zahlen[0];
  if (!k) return null;
  return {
    titel: L(`Kennzahlen einer Spalte (${k.name})`, `Summary figures of a column (${k.name})`),
    excel: [
      L(`Die Werte stehen in einer Spalte (Bereich A). Mittelwert: ${xl('AVERAGE', 'MITTELWERT', 'A')}, Standardabweichung: ${xl('STDEV.S', 'STABW.S', 'A')}, Anzahl: ${xl('COUNT', 'ANZAHL', 'A')}`, `The values are in one column (range A). Mean: ${xl('AVERAGE', 'MITTELWERT', 'A')}, standard deviation: ${xl('STDEV.S', 'STABW.S', 'A')}, count: ${xl('COUNT', 'ANZAHL', 'A')}`),
      L(`Median: ${xl('MEDIAN', 'MEDIAN', 'A')}, Quartile: ${xl('QUARTILE.INC', 'QUARTIL.INKL', 'A', '1')} und ${xl('QUARTILE.INC', 'QUARTIL.INKL', 'A', '3')}, kleinster und größter Wert: ${xl('MIN', 'MIN', 'A')}, ${xl('MAX', 'MAX', 'A')}`, `Median: ${xl('MEDIAN', 'MEDIAN', 'A')}, quartiles: ${xl('QUARTILE.INC', 'QUARTIL.INKL', 'A', '1')} and ${xl('QUARTILE.INC', 'QUARTIL.INKL', 'A', '3')}, smallest and largest value: ${xl('MIN', 'MIN', 'A')}, ${xl('MAX', 'MAX', 'A')}`),
      L('Alles auf einmal: Daten ▸ Datenanalyse ▸ „Beschreibende Statistik“ mit „Zusammenfassung der Statistiken“.', 'All at once: Data ▸ Data Analysis ▸ "Descriptive Statistics" with "Summary statistics".')
    ],
    ti: [
      L('Die Werte in L1 eingeben (STAT ▸ 1:Edit).', 'Enter the values into L1 (STAT ▸ 1:Edit).'),
      L('STAT ▸ CALC ▸ 1:1-Var Stats, List: L1, Calculate: zeigt x̄, Sx (Stichprobe), σx (Gesamtheit), n, minX, Q1, Med, Q3, maxX.', 'STAT ▸ CALC ▸ 1:1-Var Stats, List: L1, Calculate: shows x̄, Sx (sample), σx (population), n, minX, Q1, Med, Q3, maxX.')
    ],
    soll: [L(`n = ${k.n}, x̄ = ${z(k.m)}, Sx = ${z(k.sd)}, minX = ${z(k.min)}, maxX = ${z(k.max)}${k.median !== undefined ? `, Med = ${z(k.median)}` : ''}.`, `n = ${k.n}, x̄ = ${z(k.m)}, Sx = ${z(k.sd)}, minX = ${z(k.min)}, maxX = ${z(k.max)}${k.median !== undefined ? `, Med = ${z(k.median)}` : ''}.`)],
    hinweis: L('Quartile berechnen Excel (QUARTIL.INKL) und der TI-84 leicht unterschiedlich; kleine Abweichungen sind nicht falsch.', 'Excel (QUARTILE.INC) and the TI-84 calculate quartiles slightly differently; small differences are not wrong.')
  };
}

/** SPSS-Menüpfad (deutsche und englische Oberfläche) und der Hinweis auf die PSPP-Befehle, die Statable zeigt. */
function spssZeilen(e: AnleitungQuelle): string[] {
  const befehle = L('Die Befehle, die Statable dafür an die Rechenmaschine PSPP schickt (fast dieselbe Sprache wie SPSS-Syntax), stehen im Reiter „Befehle“.', 'The commands that Statable sends for this to the calculation engine PSPP (almost the same language as SPSS syntax) are in the tab "Commands".');
  switch (e.art) {
    case 'zwei-gruppen': return [L('Analysieren ▸ Mittelwerte vergleichen ▸ T-Test bei unabhängigen Stichproben …; Gruppenvariable wählen und „Gruppen definieren“.', 'Analyze ▸ Compare Means ▸ Independent-Samples T Test …; choose the grouping variable and "Define Groups".'), L('Die Tabelle zeigt zwei Zeilen: „Varianzen sind gleich“ (klassisch) und „Varianzen sind nicht gleich“ (Welch).', 'The table shows two rows: "Equal variances assumed" (classical) and "Equal variances not assumed" (Welch).'), befehle];
    case 'anova': return [L('Analysieren ▸ Mittelwerte vergleichen ▸ Einfaktorielle ANOVA …; unter „Optionen“ Welch ankreuzen, unter „Post hoc“ Tukey oder Games-Howell.', 'Analyze ▸ Compare Means ▸ One-Way ANOVA …; under "Options" tick Welch, under "Post Hoc" Tukey or Games-Howell.'), befehle];
    case 'prae-post': return [L('Analysieren ▸ Mittelwerte vergleichen ▸ T-Test bei gepaarten Stichproben …', 'Analyze ▸ Compare Means ▸ Paired-Samples T Test …'), befehle];
    case 'zusammenhang': return [L('Analysieren ▸ Korrelation ▸ Bivariat …; Pearson ankreuzen.', 'Analyze ▸ Correlate ▸ Bivariate …; tick Pearson.'), befehle];
    case 'kreuz': return [L('Analysieren ▸ Deskriptive Statistiken ▸ Kreuztabellen …; unter „Statistiken“ Chi-Quadrat ankreuzen.', 'Analyze ▸ Descriptive Statistics ▸ Crosstabs …; under "Statistics" tick Chi-square.'), befehle];
    case 'vorhersage': return [L('Analysieren ▸ Regression ▸ Linear …', 'Analyze ▸ Regression ▸ Linear …'), befehle];
    case 'verteilung': return [L('Analysieren ▸ Deskriptive Statistiken ▸ Häufigkeiten … (mit Median und Quartilen) oder ▸ Deskriptive Statistik …', 'Analyze ▸ Descriptive Statistics ▸ Frequencies … (with median and quartiles) or ▸ Descriptives …'), befehle];
    default: return [];
  }
}

/** Name einer Spalte in R-Code: einfache Namen bleiben, alle anderen in Rückstrichen (nur zum Anzeigen, nie ausgeführt). */
const rn = (n: string) => (/^[A-Za-z.][A-Za-z0-9._]*$/.test(n) ? n : `\`${n.replace(/`/g, '')}\``);

/** R-Befehle (Datentabelle `daten`, Spaltennamen wie in der Datei): sprachneutral, daher ohne Übersetzung. */
export function rZeilen(e: AnleitungQuelle): string[] {
  switch (e.art) {
    case 'zwei-gruppen': return [`t.test(${rn(e.abhaengig)} ~ ${rn(e.gruppenSpalte)}, data = daten, var.equal = TRUE)  # Student`, `t.test(${rn(e.abhaengig)} ~ ${rn(e.gruppenSpalte)}, data = daten)  # Welch`];
    case 'anova': { const f = `${rn(e.abhaengig)} ~ ${rn(e.gruppenSpalte)}`; return [`summary(aov(${f}, data = daten))`, `TukeyHSD(aov(${f}, data = daten))`, `oneway.test(${f}, data = daten)  # Welch`]; }
    case 'prae-post': return [`t.test(daten$${rn(e.vorher)}, daten$${rn(e.nachher)}, paired = TRUE)`];
    case 'zusammenhang': return e.methode && e.methode !== 'pearson' || e.kontroll?.length ? [] : [`cor.test(daten$${rn(e.x)}, daten$${rn(e.y)})`];
    case 'kreuz': return [`chisq.test(table(daten$${rn(e.gruppen)}, daten$${rn(e.gezaehlt)}))`];
    case 'vorhersage': { const terme = [...new Set(e.praediktoren.map(p => (p.faktor ? `factor(${rn(p.spalte ?? p.name)})` : rn(p.spalte ?? p.name))))]; return [`summary(lm(${rn(e.ziel)} ~ ${terme.join(' + ')}, data = daten))`, 'confint(modell)  # Intervalle, mit modell <- lm(...)']; }
    case 'verteilung': { const z = e.zahlen[0]; return z ? [`summary(daten$${rn(z.name)})`, `sd(daten$${rn(z.name)}, na.rm = TRUE)`] : []; }
    default: return [];
  }
}

/** jamovi-Menüs (englische Oberfläche): Eigennamen, daher ohne Übersetzung. */
export function jamoviZeilen(e: AnleitungQuelle): string[] {
  switch (e.art) {
    case 'zwei-gruppen': return ["Analyses ▸ T-Tests ▸ Independent Samples T-Test (Student's and Welch's)"];
    case 'anova': return ['Analyses ▸ ANOVA ▸ One-Way ANOVA (Fisher\'s or Welch\'s; Post-Hoc: Tukey or Games-Howell)'];
    case 'prae-post': return ['Analyses ▸ T-Tests ▸ Paired Samples T-Test'];
    case 'zusammenhang': return ['Analyses ▸ Regression ▸ Correlation Matrix (Pearson)'];
    case 'kreuz': return ['Analyses ▸ Frequencies ▸ Contingency Tables ▸ Independent Samples (χ²)'];
    case 'vorhersage': return ['Analyses ▸ Regression ▸ Linear Regression'];
    case 'verteilung': return ['Analyses ▸ Exploration ▸ Descriptives'];
    default: return [];
  }
}

/** Stata-Befehle (Datentabelle im Speicher, Spaltennamen wie in der Datei): sprachneutral. */
export function stataZeilen(e: AnleitungQuelle): string[] {
  const sn = (n: string) => n.replace(/[^A-Za-z0-9_]/g, '_');
  switch (e.art) {
    case 'zwei-gruppen': return [`ttest ${sn(e.abhaengig)}, by(${sn(e.gruppenSpalte)})`, `ttest ${sn(e.abhaengig)}, by(${sn(e.gruppenSpalte)}) unequal`];
    case 'anova': return [`oneway ${sn(e.abhaengig)} ${sn(e.gruppenSpalte)}, tabulate`, `anova ${sn(e.abhaengig)} ${sn(e.gruppenSpalte)}`];
    case 'prae-post': return [`ttest ${sn(e.vorher)} == ${sn(e.nachher)}`];
    case 'zusammenhang': return e.methode && e.methode !== 'pearson' || e.kontroll?.length ? [] : [`pwcorr ${sn(e.x)} ${sn(e.y)}, sig`];
    case 'kreuz': return [`tabulate ${sn(e.gruppen)} ${sn(e.gezaehlt)}, chi2 expected`];
    case 'vorhersage': return [`regress ${sn(e.ziel)} ${[...new Set(e.praediktoren.map(p => (p.faktor ? `i.${sn(p.spalte ?? p.name)}` : sn(p.spalte ?? p.name))))].join(' ')}`];
    case 'verteilung': { const z = e.zahlen[0]; return z ? [`summarize ${sn(z.name)}, detail`] : []; }
    default: return [];
  }
}
