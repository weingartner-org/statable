/**
 * B1 „Jede Auswertung als R-Skript“ (Teil 1, Fachblatt docs/ausbau/FACHBLATT-B1-R-SKRIPT.md, 14.11.2026).
 * Zu einem Ergebnis entstehen zwei Dateien: ein R-Skript und die Daten als CSV. Das Skript rechnet dasselbe in Basis-R (Paket stats); es wird in der App NIE ausgeführt.
 *
 * Teil 2d: dazu ordreg (MASS::polr), multreg (nnet::multinom) und zaehlreg (Poisson oder negativ-binomial über die Profil-Likelihood, wie Statable gewählt hat) - die Rechnungen, die Statable in webR macht.
 * Teil 2c: dazu messwiederholung mit Gruppenspalte (gemischt, Typ III von Hand) und faktor (Hauptkomponenten + Varimax, Hauptachsen + Promax(4) wie PSPP).
 * Teil 2b: dazu icc, messwiederholung (einfaktoriell, ohne Gruppenspalte, mit Friedman, wenn das Ergebnis `rang` hält) und die Testhalbierung an der Skala (`splitHalf`).
 * Teil 2a: dazu die Rangtests (Mann-Whitney, Kruskal-Wallis mit Dunn, Wilcoxon), wenn das Ergebnis sie hält.
 * Teil 2f: mit Häufigkeitsgewicht (ganze Zahlen, `RKontext.gewichtSpalte`) erweitert das Skript die Zeilen wie PSPP `WEIGHT BY` - für die Arten, die Statable mit Häufigkeitsgewicht rechnet (GEWICHT_ARTEN). Umfragegewicht (`gewicht: true`) bleibt ohne Skript.
 * Teil 1: zwei-gruppen, anova, prae-post, zusammenhang, kreuz, vorhersage, verteilung, logistik, skala, kappa. Alles andere (und jedes Blatt mit Fallgewicht) bietet `rSkriptMoeglich` nicht an.
 *
 * FESTE OBJEKTNAMEN im Skript (die Gegenprobe rskript-gegenprobe.test.ts liest sie):
 *   alle:          `daten` (aus der CSV, Gruppen-Spalten als factor), `ergebnis` (Hauptergebnis der Rechnung)
 *   zwei-gruppen:  `ergebnis` (t-Test mit gleicher Streuung), `ergebnis_welch`, `levene` (anova-Tabelle), `d_cohen`, `sd_gepoolt`
 *   anova:         `modell` (aov), `ergebnis` (summary), `ergebnis_welch` (oneway.test), `tukey`, `eta2`, `levene`
 *   prae-post:     `ergebnis` (t-Test gepaart, R rechnet vorher - nachher), `differenz` (nachher - vorher), `dz`
 *   zusammenhang:  `ergebnis` (cor.test) bzw. bei Herausrechnen `r_partiell`, `df_partiell`, `t_partiell`, `p_partiell`, `r_einfach`
 *   kreuz:         `tab` (table), `ergebnis` (chisq.test ohne Korrektur), `v_cramer`, bei 2 x 2 mit Fisher auch `fisher`
 *   vorhersage:    `modell` (lm), `ergebnis` (summary), `konfidenz` (confint), `beta` (standardisierte Koeffizienten)
 *   verteilung:    `kennzahlen` (Matrix je Zahlenspalte: n, mittelwert, sd, min, q1, median, q3, max; quantile type = 6), `haeufigkeiten` (Liste von table)
 *   logistik:      `modell` (glm binomial), `ergebnis` (summary), `odds_ratio`, `odds_ratio_ki` (Wald), `minus2ll`, `chi2_modell`, `df_modell`, `p_modell`, `cox_snell`, `nagelkerke`, `treffer`
 *   skala:         `items` (listenweise vollständige Fälle), `alpha`, `trennschaerfe`, `alpha_ohne`
 *   kappa:         `tab`, `kappa` (ungewichtet, linear oder quadratisch wie das Blatt), `uebereinstimmung`
 *   icc (Teil 2b): `messung` (Matrix, vollständige Fälle), `ms_faelle`, `ms_spalten`, `ms_rest`, `f_icc`, `p_icc`, `icc` (data.frame, Zeilen ICC(2,1) ICC(2,k) ICC(3,1) ICC(3,k); Spalten icc, ki_lo, ki_hi), bei zwei Spalten `r_tt`, `ba_mittel`, `ba_lo`, `ba_hi`
 *   messwiederholung (Teil 2b, einfaktoriell): `breit`, `ss_zeit`, `ss_fehler`, `df_zeit`, `df_fehler`, `f_zeit`, `p_zeit`, `p_gg`, `p_hf`, `eps_gg`, `eps_hf`, `mauchly` (htest), `eta2p`, `paare` (data.frame i, j, diff, t, p, p_bonf);
 *                    mit Friedman: `rang` (friedman.test), `kendall_w`, `rang_paare` (data.frame i, j, v_plus, p, p_holm)
 *   messwiederholung gemischt (Teil 2c): `breit`, `gruppe`, `ss_zeit`, `ss_gruppe`, `ss_wechsel`, `ss_fehler`, `ss_personen`, `f_zeit`, `f_gruppe`, `f_wechsel`, `p_zeit`, `p_gruppe`, `p_wechsel`, `p_zeit_gg`, `p_zeit_hf`, `p_wechsel_gg`, `p_wechsel_hf`, `eps_gg`, `eps_hf`, `mauchly`, `eta2p` (zeit, gruppe, wechsel), `paare` (data.frame i, j, diff, se, t, p, p_bonf)
 *   faktor (Teil 2c): `items`, `R`, `eigenwerte`, `kmo`, `bartlett_chi2`, `bartlett_df`, `bartlett_p`, `m`, `ladung` (unrotiert), `ladung_rotiert` (Varimax bzw. Mustermatrix, Vorzeichen überwiegend positiv), bei Hauptachsen `kommunalitaet`, `faktor_korrelation`
 *   ordreg/multreg/zaehlreg (Teil 2d): `d` (vollständige Fälle), `modell`, `ergebnis`, `koef` (data.frame b, se, z, p, or bzw. irr, ki_lo, ki_hi; multreg mit kategorie, name), `ll`, `ll0`, `modelltest` (chi2, df, p), `lr` (Matrix je Prädiktor: chi2, df, p);
 *                   ordreg/multreg dazu `cox_snell`, `nagelkerke`, ordreg `schwellen` (theta, se); zaehlreg `modell_poisson`, `pearson_df`, `lr_ueber`, `p_ueber`, bei negativ-binomial `theta`, `theta_se`
 *   skala mit Testhalbierung (Teil 2b): `haelfte1`, `haelfte2`, `r_haelften`, `sb_gleich`, `sb_ungleich`, `guttman`, `alpha_h1`, `alpha_h2`
 *   Rangtest (Teil 2a, wenn das Ergebnis `rang` hält; wie Statable: Werte auf 12 Stellen, Bindungskorrektur, exakt = bedingte Verteilung der Mittelränge):
 *     zwei-gruppen (Mann-Whitney): `rang` (wilcox.test, Näherung), `u_a`, `z_rang`, `p_rang` (exakt oder Näherung wie Statable), `hl` (Hodges-Lehmann a - b), `r_rang`
 *     anova (Kruskal-Wallis):      `rang` (kruskal.test), `eps2_rang`, `dunn` (data.frame i, j, z, p, p_holm)
 *     prae-post (Wilcoxon):        `rang` (wilcox.test, Näherung), `v_plus`, `z_rang`, `p_rang`, `hl` (Pseudo-Median nachher - vorher), `r_rang`
 *
 * SICHERHEIT (CLAUDE.md „Sicherheit“): Das Skript läuft auf dem Rechner der Person. Spaltennamen kommen nur als `daten[['…']]` mit `rAnzeigeText`, Labels und Werte nur über `rAnzeigeText` / `rAnzeigeZahl`,
 * Kommentare nur über `kom` (Steuerzeichen und Zeilenumbrüche werden Leerzeichen), Dateinamen nur ASCII. Im Rechencode stehen sonst feste Namen (`y`, `g`, `x1` …).
 * Die Daten in der CSV: nur die benutzten Spalten, Fehlend-Codes (auch Bereiche) als leere Zelle, Punkt als Dezimalzeichen, Komma als Trenner, UTF-8 ohne BOM.
 */
import { strToU8, zipSync } from 'fflate';
import { L } from './sitzung.svelte';
import { rAnzeigeText, rAnzeigeZahl } from '../engine/rsicher';
import { istFehlend } from './fehlend';
import type { Spalte } from './verzeichnis';
import type { ZweiGruppen, Anova, PraePost, Zusammenhang, Kreuz, Vorhersage, Verteilung, Logistik, Skala, Kappa, IccErgebnis, SplitHalf, Faktoren } from './ergebnis';
import type { Messwiederholung } from './messwiederholung';
import type { Friedman } from './friedman';
import type { MannWhitney, KruskalWallis, Wilcoxon } from './rangtests';
import type { KatBasis, OrdReg, MultReg, ZaehlReg } from './kategreg';

/** Das Blatt-Ergebnis, wie es `blatt.ergebnis` hält: `typ` und das Ergebnis `e`. */
export interface RErgebnis { typ: string; e?: unknown; [weiteres: string]: unknown }
export type RSpalte = Pick<Spalte, 'name' | 'bezeichnung' | 'art' | 'werteLabels' | 'fehlend'> & Partial<Pick<Spalte, 'fehlendBereich' | 'leerGueltig'>>;
export interface RKontext {
  /** Alle Spalten des Projekts (Name, Art, Wertebeschriftungen, Fehlend-Codes). */
  spalten: RSpalte[];
  /** Die Datenzeilen, Reihenfolge wie `spalten`. */
  zeilen: (string | number | null)[][];
  /** Nur diese Zeilen (Indizes) gehören dazu - ein Filter; fehlt = alle. */
  zeilenAuswahl?: number[];
  /** Die Spalten, die das Blatt gewählt hat, in der Reihenfolge der Auswahl (Rückfall, wenn das Ergebnis die Spaltennamen nicht hält). */
  blattSpalten: string[];
  titel: string;
  datum: string;
  /** Das Blatt wurde mit einem Fallgewicht gerechnet, das das Skript nicht nachbauen kann (Umfragegewicht, Gewicht geändert): dann gibt es kein Skript. */
  gewicht?: boolean;
  /** Teil 2f: das Blatt wurde mit diesem Häufigkeitsgewicht (Spaltenname, ganze Zahlen ab 0) gerechnet - das Skript erweitert die Zeilen. Nur wenn `gewicht` nicht gesetzt ist. */
  gewichtSpalte?: string;
}
export interface RSkript { r: string; csv: string; rName: string; csvName: string }

/** Teil 2f: die Gewicht-Felder des Kontexts aus dem Abdruck am Blatt (wie gerechnet wurde) und dem Gewicht, das jetzt gilt.
 *  Nur wenn beide dasselbe Häufigkeitsgewicht sind, baut das Skript es nach; jedes andere Fallgewicht (Umfragegewicht, nur eines von beiden, andere Spalte) sperrt. */
export function rGewichtFelder(amBlatt: { spalte: string; art: string } | null | undefined, aktiv: { spalte: string; art: string } | null | undefined): Pick<RKontext, 'gewicht' | 'gewichtSpalte'> {
  if (!amBlatt && !aktiv) return {};
  if (amBlatt?.art === 'haeufigkeit' && aktiv?.art === 'haeufigkeit' && amBlatt.spalte === aktiv.spalte) return { gewichtSpalte: amBlatt.spalte };
  return { gewicht: true };
}

const ARTEN = ['zwei-gruppen', 'anova', 'prae-post', 'zusammenhang', 'kreuz', 'vorhersage', 'verteilung', 'logistik', 'skala', 'kappa', 'icc', 'messwiederholung', 'faktor', 'ordreg', 'multreg', 'zaehlreg'] as const;

/* ------------------------------------------------------------------ kleine Helfer */

/** Text für einen Kommentar: Steuerzeichen, Zeilenumbrüche (auch U+0085, U+2028/9) und Bidi-Zeichen werden Leerzeichen, damit nichts eine neue Codezeile beginnt. */
export const kom = (t: unknown): string => String(t).replace(/[\u0000-\u001f\u007f-\u009f\u2028\u2029\u200b-\u200f\u202a-\u202e\u2060-\u2069\ufeff]+/g, ' ').trim();
/** Zahl für die Anzeige im Kommentar: R-Schreibweise mit Punkt, auf `d` Stellen. */
const zz = (v: number | undefined, d = 3): string => (typeof v === 'number' && Number.isFinite(v) ? String(Number(v.toFixed(d))) : 'NA');
const pp = (p: number | undefined): string => (typeof p !== 'number' || !Number.isFinite(p) ? 'p = NA' : p < 0.001 ? 'p < 0.001' : `p = ${zz(p, 3)}`);
const q = rAnzeigeText;
const lz = (zeilen: string[]): string[] => zeilen.map(z => `# ${kom(z)}`);

/** Dateiname: nur ASCII-Buchstaben, Ziffern, _ und -; sonst `statable`. */
export function rDateiBasis(titel: string): string {
  const n = String(titel).normalize('NFD').replace(/\p{M}/gu, '').replace(/ß/g, 'ss').replace(/[^A-Za-z0-9_-]+/g, '_').replace(/^[_-]+|[_-]+$/g, '').slice(0, 40);
  return n || 'statable';
}

const finde = (ctx: RKontext, name: unknown): RSpalte | undefined => {
  if (typeof name !== 'string') return undefined;
  return ctx.spalten.find(s => s.name === name) ?? ctx.spalten.find(s => s.bezeichnung === name);
};
const zeilenIndizes = (ctx: RKontext): number[] => ctx.zeilenAuswahl ?? ctx.zeilen.map((_, i) => i);
const idx = (ctx: RKontext, sp: RSpalte): number => ctx.spalten.indexOf(sp);

/** Die verschiedenen gültigen Werte einer Spalte (ohne Fehlend), Zahlen aufsteigend, Text nach dem deutschen Alphabet. */
function datenWerte(ctx: RKontext, sp: RSpalte): (string | number)[] {
  const i = idx(ctx, sp), menge = new Set<string | number>();
  for (const z of zeilenIndizes(ctx)) {
    const v = ctx.zeilen[z]?.[i];
    if (v === null || v === undefined || v === '' || istFehlend(sp, v)) continue;
    menge.add(v);
  }
  const alle = [...menge];
  return sp.art === 'zahl' ? alle.map(Number).filter(Number.isFinite).sort((a, b) => a - b) : alle.map(String).sort(new Intl.Collator('de').compare);
}
const labelZu = (sp: RSpalte, wert: string | number): string => sp.werteLabels[String(wert)] ?? sp.werteLabels[String(Number(wert))] ?? String(wert);

interface Stufe { wert: string | number; label: string }
/** Die Stufen in der Reihenfolge `namen` (so, wie Statable sie nennt): jeder Name ist eine Wertebeschriftung oder ein Wert der Daten (Zahlen auch als „1.00“ oder „8,10“). `null`, wenn einer nicht zu finden ist. */
function stufenAusNamen(ctx: RKontext, sp: RSpalte, namen: string[]): Stufe[] | null {
  const daten = datenWerte(ctx, sp), aus: Stufe[] = [];
  for (const n of namen) {
    const lab = Object.entries(sp.werteLabels).find(([, l]) => l === n);
    let wert: string | number | undefined;
    if (lab) wert = sp.art === 'zahl' ? Number(lab[0]) : lab[0];
    else if (sp.art === 'zahl') { const z = Number(String(n).replace(',', '.')); wert = Number.isFinite(z) && daten.includes(z) ? z : undefined; }
    else wert = daten.includes(n) ? n : undefined;
    if (wert === undefined || (typeof wert === 'number' && !Number.isFinite(wert))) return null;
    aus.push({ wert, label: n });
  }
  return new Set(aus.map(a => a.wert)).size === aus.length ? aus : null;
}
/** Stufen aus Rohwerten (so geschrieben wie in den Daten, Zahl als Text), Beschriftung aus den Wertebeschriftungen. */
const stufenAusWerten = (sp: RSpalte, werte: (string | number)[]): Stufe[] =>
  werte.map(w => { const wert = sp.art === 'zahl' ? Number(w) : String(w); return { wert, label: labelZu(sp, w) }; });

const wertR = (sp: RSpalte, w: string | number): string => (sp.art === 'zahl' ? rAnzeigeZahl(Number(w)) : q(String(w)));
const spR = (sp: RSpalte): string => `daten[[${q(sp.name)}]]`;
/** factor(...) mit den Stufen in dieser Reihenfolge; Beschriftungen nur, wenn sie von den Werten abweichen. */
function faktorR(sp: RSpalte, st: Stufe[]): string {
  const lv = `levels = c(${st.map(s => wertR(sp, s.wert)).join(', ')})`;
  const gleich = st.every(s => s.label === String(s.wert));
  return `factor(${spR(sp)}, ${lv}${gleich ? '' : `, labels = c(${st.map(s => q(s.label)).join(', ')})`})`;
}

/* ------------------------------------------------------------------ Plan: was ein Ergebnis braucht */

interface Plan {
  spalten: RSpalte[];                          // die benutzten Spalten, in dieser Reihenfolge, ohne Wiederholung
  faktoren: { sp: RSpalte; st: Stufe[] }[];    // Gruppen-Spalten, die als factor angelegt werden
  rechnung: string[];                          // Codezeilen
  statable: string[];                          // Kommentarzeilen mit den Zahlen von Statable
  gewicht?: RSpalte;                           // Teil 2f: Häufigkeitsgewicht - die Zeilen werden vor der Rechnung erweitert
}
const eindeutig = (l: RSpalte[]): RSpalte[] => [...new Set(l)];

/** Zwei Gruppen vergleichen (t-Test). */
function planZweiGruppen(e: ZweiGruppen, ctx: RKontext): Plan | null {
  const y = finde(ctx, e.abhaengig), g = finde(ctx, e.gruppenSpalte);
  if (!y || !g || y.art !== 'zahl') return null;
  const st = stufenAusNamen(ctx, g, [e.a.name, e.b.name]);
  if (!st) return null;
  return {
    spalten: [y, g], faktoren: [{ sp: g, st }],
    rechnung: [
      `y <- ${spR(y)}`, `g <- ${spR(g)}`,
      'ok <- !is.na(y) & !is.na(g)', 'y <- y[ok]', 'g <- g[ok]',
      `ergebnis <- t.test(y ~ g, var.equal = TRUE)   # ${L('klassisch (gleiche Streuung)', 'classical (equal variances)')}`,
      `ergebnis_welch <- t.test(y ~ g)   # Welch`,
      `levene <- anova(lm(abs(y - ave(y, g)) ~ g))   # ${L('Levene-Test wie SPSS (um den Gruppenmittelwert)', 'Levene test as in SPSS (around the group mean)')}`,
      'n_gruppen <- tapply(y, g, length)', 'mittel <- tapply(y, g, mean)', 'sd_gruppen <- tapply(y, g, sd)',
      `sd_gepoolt <- sqrt(sum((n_gruppen - 1) * sd_gruppen^2) / (sum(n_gruppen) - 2))`,
      `d_cohen <- unname((mittel[1] - mittel[2]) / sd_gepoolt)   # Cohens d`,
      'print(ergebnis)', 'print(ergebnis_welch)', 'print(levene)', 'print(c(d_cohen = d_cohen))'
    ],
    statable: lz([
      `${kom(e.a.name)}: n = ${e.a.n}, M = ${zz(e.a.m)}, SD = ${zz(e.a.sd)};  ${kom(e.b.name)}: n = ${e.b.n}, M = ${zz(e.b.m)}, SD = ${zz(e.b.sd)}`,
      `Welch: t(${zz(e.df, 2)}) = ${zz(e.t, 2)}, ${pp(e.p)}`,
      `${L('Klassisch', 'Classical')}: t(${zz(e.dfKlassisch, 0)}) = ${zz(e.tKlassisch, 2)}, ${pp(e.pKlassisch)}`,
      `Cohens d = ${zz(e.d, 2)}`
    ])
  };
}

/** Mehr als zwei Gruppen (einfaktorielle Varianzanalyse). */
function planAnova(e: Anova, ctx: RKontext): Plan | null {
  const y = finde(ctx, e.abhaengig), g = finde(ctx, e.gruppenSpalte);
  if (!y || !g || y.art !== 'zahl' || e.gruppen.length < 2) return null;
  const st = stufenAusNamen(ctx, g, e.gruppen.map(x => x.name));
  if (!st) return null;
  return {
    spalten: [y, g], faktoren: [{ sp: g, st }],
    rechnung: [
      `y <- ${spR(y)}`, `g <- ${spR(g)}`,
      'ok <- !is.na(y) & !is.na(g)', 'y <- y[ok]', 'g <- droplevels(g[ok])',
      'modell <- aov(y ~ g)', 'ergebnis <- summary(modell)',
      `ergebnis_welch <- oneway.test(y ~ g)   # Welch`,
      `tukey <- TukeyHSD(modell)   # ${L('Paarvergleiche nach Tukey', 'pairwise comparisons by Tukey')}`,
      'tabelle_aov <- ergebnis[[1]]', `eta2 <- tabelle_aov[['Sum Sq']][1] / sum(tabelle_aov[['Sum Sq']])   # η²`,
      `levene <- anova(lm(abs(y - ave(y, g)) ~ g))   # ${L('Levene-Test wie SPSS (um den Gruppenmittelwert)', 'Levene test as in SPSS (around the group mean)')}`,
      'print(ergebnis)', 'print(ergebnis_welch)', 'print(tukey)', 'print(c(eta2 = eta2))', 'print(levene)'
    ],
    statable: lz([
      ...e.gruppen.map(x => `${kom(x.name)}: n = ${x.n}, M = ${zz(x.m)}, SD = ${zz(x.sd)}`),
      `${L('Klassisch', 'Classical')}: F(${zz(e.dfZwischen, 0)}, ${zz(e.dfInnerhalb, 0)}) = ${zz(e.f, 2)}, ${pp(e.p)}`,
      `${L('Quadratsummen', 'Sums of squares')}: ${zz(e.ssZwischen, 3)} / ${zz(e.ssInnerhalb, 3)}`
    ])
  };
}

/** Vorher und nachher (gepaarter t-Test). */
function planPraePost(e: PraePost, ctx: RKontext): Plan | null {
  const v = finde(ctx, e.vorher), n = finde(ctx, e.nachher);
  if (!v || !n || v.art !== 'zahl' || n.art !== 'zahl') return null;
  return {
    spalten: [v, n], faktoren: [],
    rechnung: [
      `vorher <- ${spR(v)}`, `nachher <- ${spR(n)}`,
      'ok <- !is.na(vorher) & !is.na(nachher)', 'vorher <- vorher[ok]', 'nachher <- nachher[ok]',
      `ergebnis <- t.test(vorher, nachher, paired = TRUE)   # ${L('R rechnet vorher - nachher', 'R calculates before - after')}`,
      `differenz <- nachher - vorher   # ${L('Statable zeigt nachher - vorher', 'Statable shows after - before')}`,
      'dz <- mean(differenz) / sd(differenz)   # Cohens dz',
      'print(ergebnis)', 'print(c(dz = dz))'
    ],
    statable: lz([
      `n = ${e.n}; M ${L('vorher', 'before')} = ${zz(e.m1)}, M ${L('nachher', 'after')} = ${zz(e.m2)}`,
      `${L('Unterschied nachher - vorher', 'Difference after - before')} = ${zz(e.diff)}, t(${e.df}) = ${zz(e.t, 2)} (${L('R: Vorzeichen umgekehrt', 'R: sign reversed')}), ${pp(e.p)}`,
      `dz = ${zz(e.dz, 2)}`
    ])
  };
}

/** Zusammenhang zweier Zahlen: Pearson, Spearman, Kendall, auf Wunsch mit herausgerechneten Spalten. */
function planZusammenhang(e: Zusammenhang, ctx: RKontext): Plan | null {
  const x = finde(ctx, e.x), y = finde(ctx, e.y);
  if (!x || !y || x.art !== 'zahl' || y.art !== 'zahl') return null;
  const methode = e.methode ?? 'pearson', kontroll = (e.kontroll ?? []).map(k => finde(ctx, k));
  if (kontroll.some(k => !k || k.art !== 'zahl')) return null;
  if (kontroll.length && methode === 'kendall') return null;
  const kk = kontroll as RSpalte[];
  if (!kk.length) {
    const exakt = e.exakt === undefined || methode === 'pearson' ? '' : `, exact = ${e.exakt ? 'TRUE' : 'FALSE'}`;
    return {
      spalten: [x, y], faktoren: [],
      rechnung: [
        `x <- ${spR(x)}`, `y <- ${spR(y)}`, 'ok <- !is.na(x) & !is.na(y)', 'x <- x[ok]', 'y <- y[ok]',
        `ergebnis <- cor.test(x, y, method = ${q(methode)}${exakt})`, 'print(ergebnis)'
      ],
      statable: lz([`${methode === 'spearman' ? 'rs' : methode === 'kendall' ? 'tau-b' : 'r'} = ${zz(e.r, 3)}, n = ${e.n}, ${pp(e.p)}, 95 % ${L('Bereich', 'interval')} [${zz(e.kiLo, 3)}; ${zz(e.kiHi, 3)}]`])
    };
  }
  const k = kk.length;
  return {
    spalten: [x, y, ...kk], faktoren: [],
    rechnung: [
      `vars <- data.frame(x = ${spR(x)}, y = ${spR(y)}, ${kk.map((s, i) => `k${i + 1} = ${spR(s)}`).join(', ')})`,
      'vars <- vars[complete.cases(vars), ]',
      ...(methode === 'spearman' ? [`vars[] <- lapply(vars, rank)   # ${L('Rangkorrelation: erst in Ränge umwandeln', 'rank correlation: convert to ranks first')}`] : []),
      `rx <- resid(lm(x ~ ${kk.map((_, i) => `k${i + 1}`).join(' + ')}, data = vars))`,
      `ry <- resid(lm(y ~ ${kk.map((_, i) => `k${i + 1}`).join(' + ')}, data = vars))`,
      'r_partiell <- cor(rx, ry)',
      `df_partiell <- nrow(vars) - 2 - ${k}`,
      't_partiell <- r_partiell * sqrt(df_partiell / (1 - r_partiell^2))',
      'p_partiell <- 2 * pt(-abs(t_partiell), df_partiell)',
      'r_einfach <- cor(vars$x, vars$y)',
      'print(c(r_partiell = r_partiell, df = df_partiell, t = t_partiell, p = p_partiell, r_einfach = r_einfach))'
    ],
    statable: lz([
      ...kk.map((s, i) => `k${i + 1} = ${L('herausgerechnet', 'partialled out')}: ${kom(s.name)}`),
      `${methode === 'spearman' ? 'rs' : 'r'} (${L('partiell', 'partial')}) = ${zz(e.r, 3)}, df = ${e.df ?? e.n - 2 - k}, n = ${e.n}, ${pp(e.p)}`
    ])
  };
}

/** Zeilen und Spalten der Kreuztabelle: die Namen der Zählung, zurückgeführt auf die Werte der Spalten. */
function planKreuz(e: Kreuz, ctx: RKontext): Plan | null {
  const z = e.zaehlung;
  if (!z) return null;
  const [spalteW, zeileW] = [ctx.blattSpalten[0], ctx.blattSpalten[1]];
  const sZeile = finde(ctx, zeileW) ?? finde(ctx, e.gruppen), sSpalte = finde(ctx, spalteW) ?? finde(ctx, e.gezaehlt);
  if (!sZeile || !sSpalte || sZeile === sSpalte) return null;
  const stZ = stufenAusNamen(ctx, sZeile, z.zeilen), stS = stufenAusNamen(ctx, sSpalte, z.spalten);
  if (!stZ || !stS) return null;
  return {
    spalten: [sZeile, sSpalte], faktoren: [{ sp: sZeile, st: stZ }, { sp: sSpalte, st: stS }],
    rechnung: [
      `zeile <- ${spR(sZeile)}`, `spalte <- ${spR(sSpalte)}`,
      'tab <- table(zeile, spalte)   # ' + L('Zeilen: Gruppen, Spalten: Antworten', 'rows: groups, columns: answers'),
      'ergebnis <- chisq.test(tab, correct = FALSE)',
      'v_cramer <- sqrt(unname(ergebnis$statistic) / (sum(tab) * (min(dim(tab)) - 1)))   # Cramérs V',
      ...(e.fisherP !== undefined ? ['fisher <- fisher.test(tab)'] : []),
      'print(tab)', 'print(ergebnis)', 'print(c(v_cramer = v_cramer))', ...(e.fisherP !== undefined ? ['print(fisher)'] : [])
    ],
    statable: lz([
      `chi² (${e.df}) = ${zz(e.chi2, 2)}, ${pp(e.p)}, n = ${e.n}, Cramérs V = ${zz(e.v, 3)}`,
      ...(e.fisherP !== undefined ? [`Fisher: ${pp(e.fisherP)}`] : [])
    ])
  };
}

/** Die Prädiktoren einer Regression in der Reihenfolge der Wahl; Gruppen-Spalten mit ihren Stufen (Vergleichsgruppe zuerst). */
type Praed = { sp: RSpalte; st?: Stufe[] };
function praediktoren(ctx: RKontext, pr: { spalte?: string; faktor?: unknown }[], faktoren: { spalte: string; werte: string[] }[] | undefined, ziel: string): Praed[] | null {
  let namen: string[];
  if (pr.every(p => typeof p.spalte === 'string')) namen = [...new Set(pr.map(p => p.spalte!))];
  else namen = ctx.blattSpalten.filter(n => n !== ziel);   // alte Projektdatei: die Spalten des Blatts
  const aus: Praed[] = [];
  for (const n of namen) {
    const sp = finde(ctx, n);
    if (!sp) return null;
    const f = faktoren?.find(x => x.spalte === sp.name);
    if (f) aus.push({ sp, st: stufenAusWerten(sp, f.werte) });
    else if (sp.art === 'zahl') aus.push({ sp });
    else return null;
  }
  const mitFaktor = pr.some(p => p.faktor);
  if (mitFaktor && !aus.some(a => a.st)) return null;
  return aus.length ? aus : null;
}
const datenRahmen = (kopf: string, p: Praed[]): string[] => [
  'd <- data.frame(', `  y = ${kopf},`, ...p.map((a, i) => `  x${i + 1} = ${spR(a.sp)}${i < p.length - 1 ? ',' : ''}`), ')'
];
const zuordnung = (p: Praed[]): string[] => lz(p.map((a, i) => `x${i + 1} = ${kom(a.sp.name)}${a.st ? ` (${L('Gruppen, Vergleichsgruppe', 'groups, reference group')}: ${kom(a.st[0]!.label)})` : ''}`));

/** Lineare Regression. */
function planVorhersage(e: Vorhersage, ctx: RKontext): Plan | null {
  const y = finde(ctx, e.ziel);
  if (!y || y.art !== 'zahl') return null;
  const p = praediktoren(ctx, e.praediktoren, e.faktoren, y.name);
  if (!p) return null;
  return {
    spalten: [y, ...p.map(a => a.sp)], faktoren: p.filter(a => a.st).map(a => ({ sp: a.sp, st: a.st! })),
    rechnung: [
      ...datenRahmen(spR(y), p),
      `modell <- lm(y ~ ${p.map((_, i) => `x${i + 1}`).join(' + ')}, data = d)   # ${L('listenweise: nur vollständige Fälle', 'listwise: complete cases only')}`,
      'ergebnis <- summary(modell)', 'konfidenz <- confint(modell)',
      `y_z <- as.numeric(scale(model.response(model.frame(modell))))   # ${L('standardisierte Koeffizienten', 'standardised coefficients')}`,
      'X_z <- scale(model.matrix(modell)[, -1, drop = FALSE])',
      'beta <- coef(lm(y_z ~ X_z))[-1]',
      'print(ergebnis)', 'print(konfidenz)', 'print(beta)'
    ],
    statable: [
      ...zuordnung(p),
      ...lz([`R² = ${zz(e.r2, 3)}, R² ${L('korrigiert', 'adjusted')} = ${zz(e.r2korr, 3)}, F(${e.df1}, ${e.df2}) = ${zz(e.f, 2)}, ${pp(e.p)}`,
        ...e.praediktoren.map(a => `${kom(a.name)}: B = ${zz(a.b, 3)}, Beta = ${zz(a.beta, 3)}, ${pp(a.p)}`)])
    ]
  };
}

/** Binäre logistische Regression. */
function planLogistik(e: Logistik, ctx: RKontext): Plan | null {
  const y = finde(ctx, e.ziel);
  if (!y) return null;
  const st = stufenAusWerten(y, [e.referenz, e.ereignis]);
  const p = praediktoren(ctx, e.praediktoren, e.faktoren, y.name);
  if (!p || y.art !== 'zahl' && y.art !== 'text') return null;
  return {
    spalten: [y, ...p.map(a => a.sp)], faktoren: [{ sp: y, st }, ...p.filter(a => a.st).map(a => ({ sp: a.sp, st: a.st! }))],
    rechnung: [
      ...datenRahmen(spR(y), p),
      `modell <- glm(y ~ ${p.map((_, i) => `x${i + 1}`).join(' + ')}, family = binomial, data = d)   # ${L(`Ereignis: „${kom(st[1]!.label)}“, Vergleich: „${kom(st[0]!.label)}“`, `event: "${kom(st[1]!.label)}", reference: "${kom(st[0]!.label)}"`)}`,
      'ergebnis <- summary(modell)',
      'odds_ratio <- exp(coef(modell))', `odds_ratio_ki <- exp(confint.default(modell))   # Wald`,
      'minus2ll <- deviance(modell)', 'chi2_modell <- modell$null.deviance - modell$deviance', 'df_modell <- modell$df.null - modell$df.residual',
      'p_modell <- pchisq(chi2_modell, df_modell, lower.tail = FALSE)',
      'n_faelle <- length(modell$y)',
      'cox_snell <- 1 - exp((modell$deviance - modell$null.deviance) / n_faelle)',
      'nagelkerke <- cox_snell / (1 - exp(-modell$null.deviance / n_faelle))',
      'treffer <- mean((fitted(modell) > 0.5) == (modell$y == 1))',
      'print(ergebnis)', 'print(odds_ratio)', 'print(odds_ratio_ki)', 'print(c(chi2 = chi2_modell, df = df_modell, p = p_modell, nagelkerke = nagelkerke, treffer = treffer))'
    ],
    statable: [
      ...zuordnung(p),
      ...lz([`n = ${e.n}, -2LL = ${zz(e.minus2ll, 3)}, chi² (${e.df}) = ${zz(e.chi2, 3)}, ${pp(e.p)}, Nagelkerke R² = ${zz(e.nagelkerke, 3)}`,
        ...e.praediktoren.map(a => `${kom(a.name)}: B = ${zz(a.b, 3)}, OR = ${zz(a.or, 3)} [${zz(a.orLo, 3)}; ${zz(a.orHi, 3)}], ${pp(a.p)}`)])
    ]
  };
}

/** Verteilung: Kennzahlen der Zahlenspalten und Häufigkeiten. */
function planVerteilung(e: Verteilung, ctx: RKontext): Plan | null {
  if (e.mehrfach?.length) return null;
  const zahlen = e.zahlen.map(z => finde(ctx, z.name)), gruppen = e.gruppen.map(g => finde(ctx, g.name));
  if (zahlen.some(z => !z || z.art !== 'zahl') || gruppen.some(g => !g) || (!zahlen.length && !gruppen.length)) return null;
  const zs = zahlen as RSpalte[], gs = gruppen as RSpalte[];
  const rechnung: string[] = [];
  if (zs.length) rechnung.push(
    `kennzahl <- function(x) {`, `  x <- x[!is.na(x)]`, `  qu <- quantile(x, c(0.25, 0.5, 0.75), type = 6, names = FALSE)   # ${L('Quartile wie SPSS (type = 6)', 'quartiles as in SPSS (type = 6)')}`,
    `  c(n = length(x), mittelwert = mean(x), sd = sd(x), min = min(x), q1 = qu[1], median = qu[2], q3 = qu[3], max = max(x))`, `}`,
    `kennzahlen <- t(sapply(list(${zs.map(z => `${q(z.name)} = ${spR(z)}`).join(', ')}), kennzahl))`, 'print(kennzahlen)');
  if (gs.length) rechnung.push(
    `haeufigkeiten <- list(${gs.map(g => `${q(g.name)} = ${gruppenTabelle(ctx, g)}`).join(', ')})`, 'print(haeufigkeiten)');
  return {
    spalten: eindeutig([...zs, ...gs]), faktoren: [], rechnung,
    statable: lz([
      ...e.zahlen.map(z => `${kom(z.name)}: n = ${z.n}, M = ${zz(z.m)}, SD = ${zz(z.sd)}, min = ${zz(z.min)}, max = ${zz(z.max)}${z.median !== undefined ? `, ${L('Median', 'median')} = ${zz(z.median)}` : ''}`),
      ...e.gruppen.map(g => `${kom(g.name)}: ${g.werte.map(w => `${kom(w.name)} ${w.anzahl}`).join(', ')}`)
    ])
  };
}
/** table(...) einer Spalte: mit den Beschriftungen, in der Reihenfolge der Werte. */
function gruppenTabelle(ctx: RKontext, sp: RSpalte): string {
  const st = stufenAusWerten(sp, datenWerte(ctx, sp));
  return st.length ? `table(${faktorR(sp, st)})` : `table(${spR(sp)})`;
}

/** Cronbachs Alpha. */
function planSkala(e: Skala, ctx: RKontext): Plan | null {
  const namen = ctx.blattSpalten.length ? ctx.blattSpalten : e.fragen.map(f => f.name);
  const sp = namen.map(n => finde(ctx, n));
  if (sp.length < 2 || sp.some(s => !s || s.art !== 'zahl') || sp.length !== e.fragen.length) return null;
  const ss = sp as RSpalte[];
  const halbierung = e.splitHalf ? halbierungSkala(e.splitHalf, ss.length) : null;
  return {
    spalten: ss, faktoren: [],
    rechnung: [
      `items <- na.omit(daten[c(${ss.map(s => q(s.name)).join(', ')})])   # ${L('listenweise: nur vollständige Fälle, wie PSPP', 'listwise: complete cases only, as in PSPP')}`,
      'cronbach <- function(x) ncol(x) / (ncol(x) - 1) * (1 - sum(apply(x, 2, var)) / var(rowSums(x)))',
      'alpha <- cronbach(items)',
      `trennschaerfe <- sapply(seq_along(items), function(i) cor(items[[i]], rowSums(items[-i])))   # ${L('korrigierte Item-Skala-Korrelation', 'corrected item-total correlation')}`,
      `alpha_ohne <- if (ncol(items) > 2) sapply(seq_along(items), function(i) cronbach(items[-i])) else rep(NA_real_, ncol(items))   # ${L('Alpha ohne dieses Item', 'alpha without this item')}`,
      'print(c(alpha = alpha, n = nrow(items)))', 'print(data.frame(trennschaerfe, alpha_ohne, row.names = names(items)))',
      ...(halbierung ? halbierung.rechnung : [])
    ],
    statable: [
      ...lz([`Cronbachs Alpha = ${zz(e.alpha, 3)}, n = ${e.n}`, ...e.fragen.map(f => `${kom(f.name)}: ${L('Trennschärfe', 'item-total correlation')} = ${zz(f.trennschaerfe, 3)}, Alpha ${L('ohne Item', 'without item')} = ${zz(f.alphaOhne, 3)}`)]),
      ...(halbierung ? halbierung.statable : [])
    ]
  };
}

/** Testhalbierung (Teil 2b) hinter Cronbachs Alpha: erste `k1` Fragen gegen die übrigen, wie PSPP `/MODEL=SPLIT`. Braucht `items` und `cronbach` aus der Skala-Rechnung. */
function halbierungSkala(h: SplitHalf, k: number): { rechnung: string[]; statable: string[] } | null {
  if (!Number.isInteger(h.k1) || h.k1 < 1 || h.k1 >= k) return null;
  return {
    rechnung: [
      '', `# ${L('Testhalbierung (Split-Half): erste Hälfte = die ersten Fragen, wie PSPP /MODEL=SPLIT', 'Split-half reliability: first half = the first items, as in PSPP /MODEL=SPLIT')}`,
      `k1 <- ${rAnzeigeZahl(h.k1)}   # ceiling(k / 2)`,
      'haelfte1 <- rowSums(items[seq_len(k1)])', 'haelfte2 <- rowSums(items[-seq_len(k1)])',
      `r_haelften <- cor(haelfte1, haelfte2)   # ${L('Korrelation der Hälften', 'correlation between the halves')}`,
      `sb_gleich <- 2 * r_haelften / (1 + r_haelften)   # Spearman-Brown, ${L('gleiche Länge', 'equal length')}`,
      `anteil1 <- k1 / ncol(items); anteil2 <- 1 - anteil1   # ${L('Anteil der Fragen je Hälfte', 'share of items per half')}`,
      `sb_ungleich <- if (abs(r_haelften) < 1) (-r_haelften^2 + sqrt(r_haelften^4 + 4 * anteil1 * anteil2 * (1 - r_haelften^2) * r_haelften^2)) / (2 * anteil1 * anteil2 * (1 - r_haelften^2)) else NA_real_   # Spearman-Brown, ${L('ungleiche Länge (wie PSPP/SPSS)', 'unequal length (as in PSPP/SPSS)')}`,
      `guttman <- 2 * (1 - (var(haelfte1) + var(haelfte2)) / var(haelfte1 + haelfte2))   # Guttman Split-Half`,
      `alpha_h1 <- if (k1 > 1) cronbach(items[seq_len(k1)]) else NA_real_   # ${L('Alpha je Hälfte (bei nur einer Frage nicht berechenbar)', 'alpha per half (not defined for a single item)')}`,
      'alpha_h2 <- if (ncol(items) - k1 > 1) cronbach(items[-seq_len(k1)]) else NA_real_',
      'print(c(r_haelften = r_haelften, sb_gleich = sb_gleich, sb_ungleich = sb_ungleich, guttman = guttman, alpha_h1 = alpha_h1, alpha_h2 = alpha_h2))'
    ],
    statable: lz([`${L('Testhalbierung', 'Split-half')}: ${L('Hälften mit', 'halves with')} ${h.k1} / ${h.k2} ${L('Fragen', 'items')}, r = ${zz(h.r, 3)}, Spearman-Brown ${L('gleich', 'equal')} = ${zz(h.sbGleich, 3)}, ${L('ungleich', 'unequal')} = ${zz(h.sbUngleich, 3)}, Guttman = ${zz(h.guttman, 3)}, Alpha ${zz(h.alpha1, 3)} / ${zz(h.alpha2, 3)}`])
  };
}

/** Cohens Kappa. */
function planKappa(e: Kappa, ctx: RKontext): Plan | null {
  const a = finde(ctx, e.a) ?? finde(ctx, ctx.blattSpalten[0]), b = finde(ctx, e.b) ?? finde(ctx, ctx.blattSpalten[1]);
  if (!a || !b || a === b || a.art !== b.art || a.art === 'datum') return null;
  if (!e.kategorien?.length) return null;
  const lv = `c(${e.kategorien.map(k => wertR(a, k)).join(', ')})`;
  const gewicht = e.gewicht === 'linear' ? 'abs(i - j) / (k - 1)' : e.gewicht === 'quadratisch' ? '((i - j) / (k - 1))^2' : '';
  return {
    spalten: [a, b], faktoren: [],
    rechnung: [
      `a <- ${spR(a)}`, `b <- ${spR(b)}`, 'ok <- !is.na(a) & !is.na(b)',
      `kategorien <- ${lv}`,
      'tab <- table(factor(a[ok], levels = kategorien), factor(b[ok], levels = kategorien))',
      'n <- sum(tab)', 'k <- length(kategorien)',
      gewicht ? `gewicht <- 1 - outer(seq_len(k), seq_len(k), function(i, j) ${gewicht})   # ${e.gewicht === 'linear' ? L('lineare Gewichtung', 'linear weights') : L('quadratische Gewichtung', 'quadratic weights')}` : `gewicht <- diag(k)   # ${L('ungewichtet', 'unweighted')}`,
      'uebereinstimmung <- sum(gewicht * tab) / n',
      'erwartet <- sum(gewicht * outer(rowSums(tab), colSums(tab))) / n^2',
      'kappa <- (uebereinstimmung - erwartet) / (1 - erwartet)',
      'print(tab)', 'print(c(kappa = kappa, uebereinstimmung = uebereinstimmung))'
    ],
    statable: lz([`Kappa = ${zz(e.kappa, 3)}, ${L('Übereinstimmung', 'agreement')} = ${zz(e.uebereinstimmung, 3)}, n = ${e.n}`])
  };
}

/* ------------------------------------------------------------------ ICC und Messwiederholung (Teil 2b) */

/** Intraklassen-Korrelation (ICC) aus der Matrix Fälle x Beurteilende, wie `lib/uebereinstimmung.ts`; bei zwei Spalten dazu r_tt und Bland-Altman. */
function planIcc(e: IccErgebnis, ctx: RKontext): Plan | null {
  const sp = (e.spalten ?? []).map(n => finde(ctx, n));
  if (sp.length < 2 || sp.some(s => !s || s.art !== 'zahl')) return null;
  const ss = sp as RSpalte[];
  if (new Set(ss).size !== ss.length) return null;
  const zwei = ss.length === 2;
  const rechnung = [
    `messung <- as.matrix(na.omit(daten[c(${ss.map(s => q(s.name)).join(', ')})]))   # ${L('Fälle x Beurteilende, nur vollständige Fälle', 'cases x raters, complete cases only')}`,
    'n <- nrow(messung); k <- ncol(messung)',
    'gm <- mean(messung); zm <- rowMeans(messung); sm <- colMeans(messung)',
    `ss_z <- k * sum((zm - gm)^2); ss_b <- n * sum((sm - gm)^2); ss_e <- sum((messung - gm)^2) - ss_z - ss_b   # ${L('zweifache Varianzanalyse ohne Wiederholung', 'two-way analysis of variance without replication')}`,
    'ms_faelle <- ss_z / (n - 1); ms_spalten <- ss_b / (k - 1); ms_rest <- ss_e / ((n - 1) * (k - 1))',
    'f_icc <- ms_faelle / ms_rest; p_icc <- pf(f_icc, n - 1, (n - 1) * (k - 1), lower.tail = FALSE)',
    `mittel <- function(x) k * x / (1 + (k - 1) * x)   # ${L('Spearman-Brown: von einer Person auf den Mittelwert aller', 'Spearman-Brown: from one rater to the mean of all')}`,
    `# ICC(3,1) ${L('Konsistenz', 'consistency')}: ${L('Konfidenzgrenzen über F-Quantile', 'confidence limits from F quantiles')}`,
    'i31 <- (ms_faelle - ms_rest) / (ms_faelle + (k - 1) * ms_rest)',
    'f_lo <- f_icc / qf(0.975, n - 1, (n - 1) * (k - 1)); f_hi <- f_icc * qf(0.975, (n - 1) * (k - 1), n - 1)',
    'lo31 <- (f_lo - 1) / (f_lo + k - 1); hi31 <- (f_hi - 1) / (f_hi + k - 1)',
    `# ICC(2,1) ${L('absolute Übereinstimmung', 'absolute agreement')}: ${L('Konfidenzgrenzen nach Satterthwaite (McGraw und Wong)', 'confidence limits by Satterthwaite (McGraw and Wong)')}`,
    'i21 <- (ms_faelle - ms_rest) / (ms_faelle + (k - 1) * ms_rest + k * (ms_spalten - ms_rest) / n)',
    'f_j <- ms_spalten / ms_rest; a_s <- n * (1 + (k - 1) * i21) - k * i21',
    'v_s <- ((k - 1) * (n - 1) * (k * i21 * f_j + a_s)^2) / ((n - 1) * k^2 * i21^2 * f_j^2 + a_s^2)',
    'f_o <- qf(0.975, n - 1, v_s); f_u <- qf(0.975, v_s, n - 1); q_s <- k * ms_spalten + (k * n - k - n) * ms_rest',
    'lo21 <- n * (ms_faelle - f_o * ms_rest) / (f_o * q_s + n * ms_faelle); hi21 <- n * (f_u * ms_faelle - ms_rest) / (q_s + n * f_u * ms_faelle)',
    `icc <- data.frame(icc = c(i21, mittel(i21), i31, mittel(i31)), ki_lo = c(lo21, mittel(lo21), lo31, mittel(lo31)), ki_hi = c(hi21, mittel(hi21), hi31, mittel(hi31)), row.names = c('ICC(2,1)', 'ICC(2,k)', 'ICC(3,1)', 'ICC(3,k)'))`,
    'print(c(n = n, k = k, F = f_icc, p = p_icc)); print(icc)',
    ...(zwei ? [
      '', `# ${L('Zwei Spalten: Retest-Korrelation und Bland-Altman (erste minus zweite Spalte)', 'Two columns: test-retest correlation and Bland-Altman (first minus second column)')}`,
      'r_tt <- cor(messung[, 1], messung[, 2])',
      'differenz <- messung[, 1] - messung[, 2]; ba_mittel <- mean(differenz)',
      `ba_lo <- ba_mittel - qnorm(0.975) * sd(differenz); ba_hi <- ba_mittel + qnorm(0.975) * sd(differenz)   # ${L('Übereinstimmungsgrenzen: Mittel ± 1,96 SD', 'limits of agreement: mean ± 1.96 SD')}`,
      'print(c(r_tt = r_tt, ba_mittel = ba_mittel, ba_lo = ba_lo, ba_hi = ba_hi))'] : [])
  ];
  const ig = (m: { icc: number; kiLo: number; kiHi: number }) => `${zz(m.icc, 3)} [${zz(m.kiLo, 3)}; ${zz(m.kiHi, 3)}]`;
  return {
    spalten: ss, faktoren: [], rechnung,
    statable: lz([
      `n = ${e.icc.n}, k = ${e.icc.k}, F(${e.icc.df1}, ${e.icc.df2}) = ${zz(e.icc.f, 2)}, ${pp(e.icc.p)}`,
      `ICC(2,1) = ${ig(e.icc.absolut.einzel)};  ICC(2,k) = ${ig(e.icc.absolut.mittel)}`,
      `ICC(3,1) = ${ig(e.icc.konsistenz.einzel)};  ICC(3,k) = ${ig(e.icc.konsistenz.mittel)}`,
      ...(zwei && e.rtt !== undefined ? [`r_tt = ${zz(e.rtt, 3)}`] : []),
      ...(zwei && e.ba ? [`Bland-Altman: ${L('mittlere Differenz', 'mean difference')} = ${zz(e.ba.bias, 3)}, ${L('Grenzen', 'limits')} [${zz(e.ba.untere.wert, 3)}; ${zz(e.ba.obere.wert, 3)}]`] : [])
    ])
  };
}

/** Einfaktorielle Varianzanalyse mit Messwiederholung (ohne Gruppenspalte), wie `lib/messwiederholung.ts`. */
function planMesswiederholung(e: Messwiederholung, ctx: RKontext): Plan | null {
  if (e.gruppenSpalte) return planMessGemischt(e, ctx);
  const sp = (e.zeitpunkte ?? []).map(n => finde(ctx, n));
  if (sp.length < 2 || sp.some(s => !s || s.art !== 'zahl')) return null;
  const ss = sp as RSpalte[];
  if (new Set(ss).size !== ss.length) return null;
  const rechnung = [
    `breit <- as.matrix(na.omit(daten[c(${ss.map(s => q(s.name)).join(', ')})]))   # ${L('eine Spalte je Zeitpunkt, nur vollständige Fälle', 'one column per time point, complete cases only')}`,
    'n <- nrow(breit); k <- ncol(breit)',
    'gm <- mean(breit); zm <- rowMeans(breit); sm <- colMeans(breit)',
    `ss_zeit <- n * sum((sm - gm)^2); ss_personen <- k * sum((zm - gm)^2)   # ${L('Quadratsummen von Hand', 'sums of squares by hand')}`,
    'ss_fehler <- sum((sweep(sweep(breit, 1, zm), 2, sm) + gm)^2)',
    'df_zeit <- k - 1; df_fehler <- (n - 1) * (k - 1)',
    'f_zeit <- (ss_zeit / df_zeit) / (ss_fehler / df_fehler)',
    'p_zeit <- pf(f_zeit, df_zeit, df_fehler, lower.tail = FALSE)',
    `eta2p <- ss_zeit / (ss_zeit + ss_fehler)   # ${L('partielles η²', 'partial η²')}`,
    `# ${L('Sphärizität: Kontraste (Helmert, normiert), Greenhouse-Geisser und Huynh-Feldt (Lecoutre)', 'Sphericity: contrasts (Helmert, normalised), Greenhouse-Geisser and Huynh-Feldt (Lecoutre)')}`,
    'helmert <- t(sapply(seq_len(k - 1), function(i) c(rep(1, i), -i, rep(0, k - i - 1)) / sqrt(i * (i + 1))))',
    'ssd <- crossprod(scale(breit %*% t(helmert), scale = FALSE)); p_k <- k - 1',
    'eps_gg <- min(1, max(1 / p_k, sum(diag(ssd))^2 / (p_k * sum(ssd^2))))',
    'eps_hf <- min(1, max(eps_gg, (n * p_k * eps_gg - 2) / (p_k * (n - 1 - p_k * eps_gg))))',
    'p_gg <- pf(f_zeit, df_zeit * eps_gg, df_fehler * eps_gg, lower.tail = FALSE)',
    'p_hf <- pf(f_zeit, df_zeit * eps_hf, df_fehler * eps_hf, lower.tail = FALSE)',
    `mauchly <- if (k > 2) tryCatch(mauchly.test(lm(breit ~ 1), X = ~1), error = function(e) NULL) else NULL   # ${L('Mauchly-Test (bei zwei Zeitpunkten gibt es keinen)', 'Mauchly test (there is none for two time points)')}`,
    `# ${L('Paarvergleiche: gepaarte t-Tests, Bonferroni (Differenz = späterer minus früherer Zeitpunkt)', 'Pairwise comparisons: paired t tests, Bonferroni (difference = later minus earlier time point)')}`,
    'kombi <- combn(k, 2)',
    'tt <- lapply(seq_len(ncol(kombi)), function(m) t.test(breit[, kombi[2, m]], breit[, kombi[1, m]], paired = TRUE))',
    'paare <- data.frame(i = kombi[1, ], j = kombi[2, ], diff = sapply(tt, function(x) unname(x$estimate)), t = sapply(tt, function(x) unname(x$statistic)), p = sapply(tt, function(x) x$p.value))',
    'paare$p_bonf <- p.adjust(paare$p, "bonferroni")',
    'print(c(F = f_zeit, df1 = df_zeit, df2 = df_fehler, p = p_zeit, p_gg = p_gg, p_hf = p_hf, eps_gg = eps_gg, eps_hf = eps_hf, eta2p = eta2p))', 'print(mauchly)', 'print(paare)'
  ];
  const z = e.zeit;
  return {
    spalten: ss, faktoren: [], rechnung,
    statable: lz([
      `n = ${e.n}, k = ${e.zeitpunkte.length}: F(${zz(z.df, 0)}, ${zz(z.dfFehler, 0)}) = ${zz(z.f, 2)}, ${pp(z.p)}; Greenhouse-Geisser ${pp(z.pGG)}, Huynh-Feldt ${pp(z.pHF)}`,
      `ε GG = ${zz(e.sphaer.gg, 3)}, ε HF = ${zz(e.sphaer.hf, 3)}, Mauchly W = ${zz(e.sphaer.w, 3)} (${pp(e.sphaer.p)}), ${L('partielles', 'partial')} η² = ${zz(z.etaP, 3)}`,
      ...e.paare.map(a => `${kom(e.zeitpunkte[a.i] ?? '')} - ${kom(e.zeitpunkte[a.j] ?? '')}: ${L('Differenz', 'difference')} = ${zz(a.diff, 3)}, t(${a.df}) = ${zz(a.t, 2)}, ${pp(a.p)}, Bonferroni ${pp(a.pAnp)}`)
    ])
  };
}

/** Gemischte Varianzanalyse (Teil 2c): k Zeitpunkte × g Gruppen, Quadratsummen Typ III wie `lib/messwiederholung.ts` (und afex/SPSS).
 *  `aov` in R rechnet Typ I und gäbe bei ungleich großen Gruppen einen anderen Zeiteffekt - darum von Hand. */
function planMessGemischt(e: Messwiederholung, ctx: RKontext): Plan | null {
  const sp = (e.zeitpunkte ?? []).map(n => finde(ctx, n)), gs = finde(ctx, e.gruppenSpalte ?? '');
  if (sp.length < 2 || sp.some(s => !s || s.art !== 'zahl') || !gs || gs.art === 'datum') return null;
  const ss = sp as RSpalte[];
  if (new Set([...ss, gs]).size !== ss.length + 1 || !e.gruppe || !e.wechsel) return null;
  const rechnung = [
    `roh <- na.omit(daten[c(${[...ss, gs].map(s => q(s.name)).join(', ')})])   # ${L('Zeitpunkte und Gruppe, nur vollständige Fälle', 'time points and group, complete cases only')}`,
    `breit <- as.matrix(roh[c(${ss.map(s => q(s.name)).join(', ')})]); gruppe <- factor(roh[[${q(gs.name)}]])`,
    'n <- nrow(breit); k <- ncol(breit); g <- nlevels(gruppe); ng <- as.vector(table(gruppe)); gi <- as.integer(gruppe)',
    `gm <- mean(breit); zm <- rowMeans(breit); sm <- colMeans(breit)   # ${L('Mittel gesamt, je Person, je Zeitpunkt', 'grand mean, per person, per time point')}`,
    `zelle <- apply(breit, 2, function(s) tapply(s, gruppe, mean)); grm <- as.vector(tapply(zm, gruppe, mean))   # ${L('Mittel je Gruppe und Zeitpunkt, je Gruppe', 'means per group and time point, per group')}`,
    'ss_personen <- k * sum((zm - grm[gi])^2)',
    'ss_fehler <- sum((breit - zm - zelle[gi, , drop = FALSE] + grm[gi])^2)',
    `rand <- colMeans(zelle); n_harm <- g / sum(1 / ng)   # ${L('Typ III: ungewichtetes Mittel der Gruppenmittel, harmonisches Mittel der Gruppengrößen', 'Type III: unweighted mean of the group means, harmonic mean of the group sizes')}`,
    'ss_zeit <- g * n_harm * sum((rand - mean(rand))^2)',
    'ss_gruppe <- k * sum(ng * (grm - gm)^2)',
    'ss_wechsel <- sum(ng * rowSums((zelle - grm - matrix(sm, g, k, byrow = TRUE) + gm)^2))',
    'df_personen <- n - g; df_zeit <- k - 1; df_fehler <- df_personen * df_zeit; df_gruppe <- g - 1; df_wechsel <- df_gruppe * df_zeit',
    'f_zeit <- (ss_zeit / df_zeit) / (ss_fehler / df_fehler); f_wechsel <- (ss_wechsel / df_wechsel) / (ss_fehler / df_fehler)',
    'f_gruppe <- (ss_gruppe / df_gruppe) / (ss_personen / df_personen)',
    'p_zeit <- pf(f_zeit, df_zeit, df_fehler, lower.tail = FALSE); p_wechsel <- pf(f_wechsel, df_wechsel, df_fehler, lower.tail = FALSE)',
    'p_gruppe <- pf(f_gruppe, df_gruppe, df_personen, lower.tail = FALSE)',
    `eta2p <- c(zeit = ss_zeit / (ss_zeit + ss_fehler), gruppe = ss_gruppe / (ss_gruppe + ss_personen), wechsel = ss_wechsel / (ss_wechsel + ss_fehler))   # ${L('partielles η²', 'partial η²')}`,
    `# ${L('Sphärizität: Kontraste (Helmert, normiert), innerhalb der Gruppen zentriert', 'Sphericity: contrasts (Helmert, normalised), centred within groups')}`,
    'helmert <- t(sapply(seq_len(k - 1), function(i) c(rep(1, i), -i, rep(0, k - i - 1)) / sqrt(i * (i + 1))))',
    'y <- breit %*% t(helmert); ssd <- crossprod(y - apply(y, 2, function(s) ave(s, gruppe))); p_k <- k - 1',
    'eps_gg <- min(1, max(1 / p_k, sum(diag(ssd))^2 / (p_k * sum(ssd^2))))',
    'eps_hf <- min(1, max(eps_gg, ((df_personen + 1) * p_k * eps_gg - 2) / (p_k * (df_personen - p_k * eps_gg))))',
    'p_zeit_gg <- pf(f_zeit, df_zeit * eps_gg, df_fehler * eps_gg, lower.tail = FALSE); p_zeit_hf <- pf(f_zeit, df_zeit * eps_hf, df_fehler * eps_hf, lower.tail = FALSE)',
    'p_wechsel_gg <- pf(f_wechsel, df_wechsel * eps_gg, df_fehler * eps_gg, lower.tail = FALSE); p_wechsel_hf <- pf(f_wechsel, df_wechsel * eps_hf, df_fehler * eps_hf, lower.tail = FALSE)',
    `mauchly <- if (k > 2) tryCatch(mauchly.test(lm(breit ~ gruppe), X = ~1), error = function(e) NULL) else NULL   # ${L('Mauchly-Test (bei zwei Zeitpunkten gibt es keinen)', 'Mauchly test (there is none for two time points)')}`,
    `# ${L('Paarvergleiche: Mittel der Gruppenmittel der Differenzen, gepoolte Streuung, Bonferroni (Differenz = späterer minus früherer Zeitpunkt)', 'Pairwise comparisons: mean of the group means of the differences, pooled spread, Bonferroni (difference = later minus earlier time point)')}`,
    'kombi <- combn(k, 2)',
    'paare <- do.call(rbind, lapply(seq_len(ncol(kombi)), function(m) {',
    '  d <- breit[, kombi[2, m]] - breit[, kombi[1, m]]; gmd <- as.vector(tapply(d, gruppe, mean))',
    '  sp2 <- sum((d - gmd[gi])^2) / df_personen; diff <- mean(gmd); se <- sqrt(sp2 / g^2 * sum(1 / ng)); t <- diff / se',
    '  data.frame(i = kombi[1, m], j = kombi[2, m], diff = diff, se = se, t = t, p = 2 * pt(-abs(t), df_personen))',
    '}))',
    'paare$p_bonf <- pmin(1, paare$p * nrow(paare))',
    'print(rbind(zeit = c(ss_zeit, df_zeit, f_zeit, p_zeit, p_zeit_gg, p_zeit_hf), gruppe = c(ss_gruppe, df_gruppe, f_gruppe, p_gruppe, NA, NA), wechsel = c(ss_wechsel, df_wechsel, f_wechsel, p_wechsel, p_wechsel_gg, p_wechsel_hf)))',
    'print(c(eps_gg = eps_gg, eps_hf = eps_hf)); print(eta2p); print(mauchly); print(paare)'
  ];
  const zeile = (name: string, x: NonNullable<Messwiederholung['gruppe']>, korr: boolean) =>
    `${name}: F(${zz(x.df, 0)}, ${zz(x.dfFehler, 0)}) = ${zz(x.f, 2)}, ${pp(x.p)}${korr ? `; Greenhouse-Geisser ${pp(x.pGG)}, Huynh-Feldt ${pp(x.pHF)}` : ''}, ${L('partielles', 'partial')} η² = ${zz(x.etaP, 3)}`;
  return {
    spalten: [...ss, gs], faktoren: [], rechnung,
    statable: lz([
      `n = ${e.n}, ${L('Gruppen', 'groups')} = ${e.gruppen.length}, k = ${e.zeitpunkte.length}`,
      zeile(L('Zeit', 'Time'), e.zeit, true), zeile(L('Gruppe', 'Group'), e.gruppe, false), zeile(L('Zeit × Gruppe', 'Time × group'), e.wechsel, true),
      `ε GG = ${zz(e.sphaer.gg, 3)}, ε HF = ${zz(e.sphaer.hf, 3)}, Mauchly W = ${zz(e.sphaer.w, 3)} (${pp(e.sphaer.p)})`,
      ...e.paare.map(a => `${kom(e.zeitpunkte[a.i] ?? '')} - ${kom(e.zeitpunkte[a.j] ?? '')}: ${L('Differenz', 'difference')} = ${zz(a.diff, 3)}, t(${a.df}) = ${zz(a.t, 2)}, ${pp(a.p)}, Bonferroni ${pp(a.pAnp)}`)
    ])
  };
}

/** Faktorenanalyse (Teil 2c) wie PSPP FACTOR in Statable: Hauptkomponenten + Varimax oder Hauptachsen (25 Schritte) + Promax(4), nur Basis-R.
 *  Die Zahl der Faktoren ist die, die Statable gerechnet hat (Spalten der Ladungsmatrix). Vorzeichen eines Faktors sind beliebig. */
function planFaktor(e: Faktoren, ctx: RKontext): Plan | null {
  const namen = ctx.blattSpalten;
  const sp = namen.map(n => finde(ctx, n));
  const m = e.faktoren.length;
  if (sp.length < 3 || sp.some(s => !s || s.art !== 'zahl') || new Set(sp).size !== sp.length || m < 1 || m >= sp.length || e.ausgelassen?.length) return null;
  const ss = sp as RSpalte[], paf = e.methode === 'paf';
  const rechnung = [
    `items <- na.omit(daten[c(${ss.map(s => q(s.name)).join(', ')})])   # ${L('listenweise: nur vollständige Fälle, wie PSPP', 'listwise: complete cases only, as in PSPP')}`,
    'R <- cor(items); n <- nrow(items); p <- ncol(items)',
    `eigenwerte <- eigen(R, symmetric = TRUE)$values   # ${L('Anfängliche Eigenwerte (Kaiser-Kriterium: über 1)', 'initial eigenvalues (Kaiser criterion: above 1)')}`,
    `# ${L('KMO und Bartlett-Test auf Sphärizität', 'KMO and Bartlett test of sphericity')}`,
    'ri <- solve(R); partiell <- -ri / sqrt(outer(diag(ri), diag(ri))); aussen <- row(R) != col(R)',
    'kmo <- sum(R[aussen]^2) / (sum(R[aussen]^2) + sum(partiell[aussen]^2))',
    'bartlett_chi2 <- -(n - 1 - (2 * p + 5) / 6) * log(det(R)); bartlett_df <- p * (p - 1) / 2',
    'bartlett_p <- pchisq(bartlett_chi2, bartlett_df, lower.tail = FALSE)',
    `m <- ${rAnzeigeZahl(m)}   # ${L('Zahl der Faktoren wie in Statable', 'number of factors as in Statable')}`,
    ...(paf ? [
      `# ${L('Hauptachsen: Startwerte der Kommunalitäten = quadrierte multiple Korrelation, höchstens 25 Schritte (wie PSPP ITERATE(25))', 'Principal axis: starting communalities = squared multiple correlation, at most 25 steps (as in PSPP ITERATE(25))')}`,
      'kommunalitaet <- 1 - 1 / diag(ri)',
      'for (schritt in 1:25) {',
      '  Rr <- R; diag(Rr) <- kommunalitaet; ez <- eigen(Rr, symmetric = TRUE)',
      '  ladung <- ez$vectors[, 1:m, drop = FALSE] %*% diag(sqrt(pmax(ez$values[1:m], 0)), m)',
      '  neu <- rowSums(ladung^2); fertig <- max(abs(neu - kommunalitaet)) < 0.001; kommunalitaet <- neu',
      '  if (fertig) break',
      '}',
      `# ${L('Promax mit κ = 4 wie PSPP: Varimax (Kaiser-normiert), Ziel aus den normierten Ladungen hoch 4, Regression mit den Ladungen', 'Promax with κ = 4 as in PSPP: varimax (Kaiser normalised), target from the normalised loadings to the power of 4, regression on the loadings')}`,
      'if (m > 1) {',
      '  vari <- unclass(varimax(ladung, normalize = TRUE, eps = 1e-10)$loadings); normiert <- vari / sqrt(rowSums(ladung^2))',
      '  ziel <- normiert * abs(normiert)^3',
      '  U <- solve(crossprod(vari), crossprod(vari, ziel)); U <- U %*% diag(sqrt(diag(solve(crossprod(U)))), m)',
      `  ladung_rotiert <- vari %*% U   # ${L('Mustermatrix', 'pattern matrix')}`,
      `  faktor_korrelation <- solve(crossprod(U))   # ${L('Korrelationen der Faktoren', 'factor correlations')}`,
      '} else { ladung_rotiert <- ladung; faktor_korrelation <- matrix(1) }'
    ] : [
      `ez <- eigen(R, symmetric = TRUE); ladung <- ez$vectors[, 1:m, drop = FALSE] %*% diag(sqrt(ez$values[1:m]), m)   # ${L('Hauptkomponenten', 'principal components')}`,
      `ladung_rotiert <- if (m > 1) unclass(varimax(ladung, normalize = TRUE, eps = 1e-10)$loadings) else ladung   # ${L('Varimax mit Kaiser-Normierung', 'varimax with Kaiser normalisation')}`,
      `erklaert <- sum(ladung^2) / p   # ${L('Anteil der erklärten Varianz', 'share of explained variance')}`
    ]),
    'vorzeichen <- ifelse(colSums(ladung_rotiert) < 0, -1, 1)',
    ...(paf ? ['faktor_korrelation <- faktor_korrelation * outer(vorzeichen, vorzeichen)'] : []),
    `ladung_rotiert <- sweep(ladung_rotiert, 2, vorzeichen, "*")   # ${L('Vorzeichen je Faktor beliebig: hier überwiegend positiv', 'sign of each factor is arbitrary: here mostly positive')}`,
    'dimnames(ladung_rotiert) <- list(names(items), paste0("F", seq_len(m)))',
    'print(c(n = n, kmo = kmo, bartlett_chi2 = bartlett_chi2, bartlett_df = bartlett_df, bartlett_p = bartlett_p))', 'print(round(eigenwerte, 4))',
    `print(round(ladung_rotiert, 3))   # ${L('Statable zeigt Ladungen ab 0.30 und ordnet jede Frage dem Faktor mit der höchsten Ladung zu', 'Statable shows loadings from 0.30 and assigns each item to the factor with the highest loading')}`,
    ...(paf ? ['print(round(faktor_korrelation, 3))'] : [])
  ];
  return {
    spalten: ss, faktoren: [], rechnung,
    statable: lz([
      `n = ${e.n}, ${paf ? L('Hauptachsen + Promax', 'principal axis + promax') : L('Hauptkomponenten + Varimax', 'principal components + varimax')}, ${m} ${L('Faktoren', 'factors')}`,
      ...(e.kmo ? [`KMO = ${zz(e.kmo.kmo, 3)}, Bartlett χ²(${zz(e.kmo.df, 0)}) = ${zz(e.kmo.chi2, 2)}, ${pp(e.kmo.p)}`] : []),
      ...(e.eigen ? [`${L('Eigenwerte', 'eigenvalues')}: ${e.eigen.map(v => zz(v, 3)).join(', ')}`] : []),
      ...e.faktoren.map(f => `F${f.nr}: ${f.fragen.map(x => `${kom(x.name)} (${zz(x.ladung, 2)})`).join(', ')}`)
    ])
  };
}

/* ------------------------------------------------------------------ Rangtests (Teil 2a) */

/** R-Funktion: exakter zweiseitiger p-Wert aus der bedingten Verteilung (verdoppelte Mittelränge `r2`, ganze Zahlen).
 *  `m` = Größe der ersten Gruppe (Rangsumme, Mann-Whitney) oder NA (Summe der positiven Ränge, Wilcoxon). So rechnet auch Statable (auch bei Bindungen). */
const pBedingt = (): string[] => [
  `p_bedingt <- function(r2, m, s2) {   # ${L('exakter p-Wert, auch bei gleichen Werten (bedingte Verteilung der Ränge)', 'exact p value, also with tied values (conditional distribution of the ranks)')}`,
  '  S <- sum(r2)',
  '  if (is.na(m)) { z <- c(1, rep(0, S)); for (r in r2) z <- z + c(rep(0, r), z)[seq_len(S + 1)] }',
  '  else { z <- matrix(0, m + 1, S + 1); z[1, 1] <- 1',
  '    for (r in r2) for (k in m:1) z[k + 1, ] <- z[k + 1, ] + c(rep(0, r), z[k, ])[seq_len(S + 1)]',
  '    z <- z[m + 1, ] }',
  '  v <- z / sum(z); s <- 0:S',
  '  min(1, 2 * min(sum(v[s <= s2]), sum(v[s >= s2])))',
  '}'
];
const bindungR = (x: string): string => `bind <- sum(table(${x})^3 - table(${x}))`;
const rangKopf = (name: string): string[] => ['', `# ${L(`Rangtest (${name}): steht im Ergebnis zur Wahl`, `Rank test (${name}): offered as an option in the result`)}`];
const exaktWort = (exakt: boolean): string => (exakt ? L('exakt', 'exact') : L('Näherung', 'approximation'));

/** Mann-Whitney nach dem t-Test: dieselben `y` und `g`. */
function rangMannWhitney(r: MannWhitney): { rechnung: string[]; statable: string[] } {
  return {
    rechnung: [
      ...rangKopf('Mann-Whitney U'),
      `y_r <- signif(y, 12)   # ${L('wie Statable: auf 12 Stellen gerundet', 'as in Statable: rounded to 12 digits')}`,
      `rang <- wilcox.test(y_r ~ g, exact = FALSE, correct = FALSE)   # ${L('Normalnäherung mit Bindungskorrektur', 'normal approximation with tie correction')}`,
      'rg <- rank(y_r); in_a <- g == levels(g)[1]; n_a <- sum(in_a); n_b <- sum(!in_a); n_rang <- n_a + n_b',
      'u_a <- sum(rg[in_a]) - n_a * (n_a + 1) / 2', bindungR('y_r'),
      'z_rang <- (u_a - n_a * n_b / 2) / sqrt(n_a * n_b / 12 * ((n_rang + 1) - bind / (n_rang * (n_rang - 1))))',
      ...(r.exakt ? [...pBedingt(), `p_rang <- p_bedingt(round(2 * rg), n_a, round(2 * sum(rg[in_a])))   # ${L('exakt', 'exact')}`] : [`p_rang <- 2 * pnorm(-abs(z_rang))   # ${L('Näherung (große Gruppen)', 'approximation (large groups)')}`]),
      'r_rang <- abs(z_rang) / sqrt(n_rang)',
      `hl <- median(outer(y_r[in_a], y_r[!in_a], "-"))   # ${L('Hodges-Lehmann: Verschiebung erste minus zweite Gruppe', 'Hodges-Lehmann: shift first minus second group')}`,
      'print(rang)', 'print(c(U = u_a, z = z_rang, p = p_rang, r = r_rang, hodges_lehmann = hl))'
    ],
    statable: lz([`Mann-Whitney: U = ${zz(r.uA, 1)}, z = ${zz(r.z, 3)}, ${pp(r.p)} (${exaktWort(r.exakt)}), r = ${zz(r.r, 3)}${r.hl ? `, Hodges-Lehmann = ${zz(r.hl.schaetzer, 3)}` : ''}`])
  };
}

/** Kruskal-Wallis mit Dunn-Paarvergleichen (Holm) nach der Varianzanalyse. */
function rangKruskal(r: KruskalWallis): { rechnung: string[]; statable: string[] } {
  return {
    rechnung: [
      ...rangKopf('Kruskal-Wallis'),
      'y_r <- signif(y, 12)',
      'rang <- kruskal.test(y_r ~ g)',
      'eps2_rang <- min(1, max(0, unname(rang$statistic) / (length(y_r) - 1)))   # ε²',
      `# ${L('Dunn-Paarvergleiche mit Holm-Korrektur', 'Dunn pairwise comparisons with Holm correction')}`,
      `rg <- rank(y_r); n_rang <- length(rg); ${bindungR('y_r')}`,
      'mr <- tapply(rg, g, mean); ni <- tapply(rg, g, length)',
      's2 <- n_rang * (n_rang + 1) / 12 - bind / (12 * (n_rang - 1))',
      'paare <- combn(nlevels(g), 2)',
      'z_dunn <- apply(paare, 2, function(ij) (mr[ij[2]] - mr[ij[1]]) / sqrt(s2 * (1 / ni[ij[1]] + 1 / ni[ij[2]])))',
      'dunn <- data.frame(i = levels(g)[paare[1, ]], j = levels(g)[paare[2, ]], z = z_dunn, p = 2 * pnorm(-abs(z_dunn)))',
      'dunn$p_holm <- p.adjust(dunn$p, "holm")',
      'print(rang)', 'print(c(eps2 = eps2_rang))', 'print(dunn)'
    ],
    statable: lz([`Kruskal-Wallis: H(${r.df}) = ${zz(r.h, 3)}, ${pp(r.p)}, ε² = ${zz(r.eps2, 3)}`])
  };
}

/** Wilcoxon (Vorzeichen-Rang) nach dem gepaarten t-Test: dieselben `vorher` und `nachher`. */
function rangWilcoxon(r: Wilcoxon): { rechnung: string[]; statable: string[] } {
  return {
    rechnung: [
      ...rangKopf('Wilcoxon'),
      `d <- signif(nachher - vorher, 12); n_rang <- length(d); d <- d[d != 0]   # ${L('Paare ohne Veränderung fallen weg', 'pairs without change are left out')}`,
      `rang <- wilcox.test(d, exact = FALSE, correct = FALSE)   # ${L('Normalnäherung mit Bindungskorrektur', 'normal approximation with tie correction')}`,
      `rg <- rank(abs(d)); m <- length(d); v_plus <- sum(rg[d > 0]); ${bindungR('abs(d)')}`,
      'z_rang <- (v_plus - m * (m + 1) / 4) / sqrt(m * (m + 1) * (2 * m + 1) / 24 - bind / 48)',
      ...(r.exakt ? [...pBedingt(), `p_rang <- p_bedingt(round(2 * rg), NA, round(2 * v_plus))   # ${L('exakt', 'exact')}`] : [`p_rang <- 2 * pnorm(-abs(z_rang))   # ${L('Näherung (viele Paare)', 'approximation (many pairs)')}`]),
      'r_rang <- abs(z_rang) / sqrt(n_rang)',
      `walsh <- outer(d, d, "+") / 2; hl <- median(walsh[upper.tri(walsh, diag = TRUE)])   # ${L('Pseudo-Median der Veränderung (Hodges-Lehmann)', 'pseudo-median of the change (Hodges-Lehmann)')}`,
      'print(rang)', 'print(c(V_plus = v_plus, z = z_rang, p = p_rang, r = r_rang, hodges_lehmann = hl))'
    ],
    statable: lz([`Wilcoxon: V+ = ${zz(r.vPlus, 1)}, z = ${zz(r.z, 3)}, ${pp(r.p)} (${exaktWort(r.exakt)}), r = ${zz(r.r, 3)}${r.hl ? `, Hodges-Lehmann = ${zz(r.hl.schaetzer, 3)}` : ''}`])
  };
}

/** Friedman-Test mit Wilcoxon-Paarvergleichen (Holm) nach der Messwiederholung: dieselbe Matrix `breit`. */
function rangFriedman(r: Friedman): { rechnung: string[]; statable: string[] } {
  return {
    rechnung: [
      ...rangKopf('Friedman'),
      `breit_r <- signif(breit, 12)   # ${L('wie Statable: auf 12 Stellen gerundet', 'as in Statable: rounded to 12 digits')}`,
      'rang <- friedman.test(breit_r)',
      'kendall_w <- unname(rang$statistic) / (n * (k - 1))   # Kendalls W',
      ...pBedingt(),
      `wilc <- function(d) {   # ${L('Wilcoxon-Paar wie Teil 2a: exakt bei unter 50 Paaren mit Unterschied, sonst Näherung', 'Wilcoxon pair as in part 2a: exact with fewer than 50 pairs showing a difference, otherwise approximation')}`,
      '  d <- d[d != 0]; m <- length(d)',
      '  if (m < 2) return(c(v_plus = NA, p = NA))',
      '  rg <- rank(abs(d)); v_plus <- sum(rg[d > 0]); bind <- sum(table(abs(d))^3 - table(abs(d)))',
      '  z <- (v_plus - m * (m + 1) / 4) / sqrt(m * (m + 1) * (2 * m + 1) / 24 - bind / 48)',
      '  p <- if (m < 50) p_bedingt(round(2 * rg), NA, round(2 * v_plus)) else 2 * pnorm(-abs(z))',
      '  c(v_plus = v_plus, p = p)',
      '}',
      'kombi_r <- combn(k, 2)',
      'wi <- t(sapply(seq_len(ncol(kombi_r)), function(m) wilc(signif(breit_r[, kombi_r[2, m]] - breit_r[, kombi_r[1, m]], 12))))',
      'rang_paare <- data.frame(i = kombi_r[1, ], j = kombi_r[2, ], v_plus = wi[, 1], p = wi[, 2])',
      'rang_paare$p_holm <- NA_real_; mit_p <- !is.na(rang_paare$p); rang_paare$p_holm[mit_p] <- p.adjust(rang_paare$p[mit_p], "holm")',
      'print(rang)', 'print(c(kendall_w = kendall_w))', 'print(rang_paare)'
    ],
    statable: lz([
      `Friedman: chi²(${r.df}) = ${zz(r.chi2, 3)}, ${pp(r.p)}, Kendalls W = ${zz(r.kendallW, 3)}`,
      ...r.paare.map(a => `${kom(a.von)} - ${kom(a.nach)}: V+ = ${zz(a.vPlus, 1)}, ${pp(a.p ?? undefined)}, Holm ${pp(a.pHolm ?? undefined)}`)
    ])
  };
}

/** Hängt den Rangtest an den Plan, wenn das Ergebnis einen passenden hält. */
function mitRang(p: Plan | null, rang: unknown, art: string): Plan | null {
  if (!p || !rang || typeof rang !== 'object') return p;
  const ra = (rang as { art?: string }).art;
  const teil = art === 'zwei-gruppen' && ra === 'mann-whitney' ? rangMannWhitney(rang as MannWhitney)
    : art === 'anova' && ra === 'kruskal-wallis' ? rangKruskal(rang as KruskalWallis)
    : art === 'prae-post' && ra === 'wilcoxon' ? rangWilcoxon(rang as Wilcoxon)
    : art === 'messwiederholung' && ra === 'friedman' && (rang as Friedman).k >= 3 ? rangFriedman(rang as Friedman) : null;
  if (!teil) return p;
  return { ...p, rechnung: [...p.rechnung, ...teil.rechnung], statable: [...p.statable, ...teil.statable] };
}

/* ------------------------------------------------------------------ Teil 2d: Regressionen aus webR (ordinal, multinomial, Zähldaten) */

/** Prädiktoren einer Kategorien-Regression: Gruppen mit ihren Stufen (Beschriftungen, Vergleichsgruppe zuerst), sonst Zahlen. */
function katPraed(ctx: RKontext, e: KatBasis): Praed[] | null {
  if (!e.praed?.length) return null;
  const aus: Praed[] = [];
  for (const kp of e.praed) {
    const sp = finde(ctx, kp.name);
    if (!sp || sp.name === e.ziel) return null;
    if (kp.art === 'faktor') { const st = stufenAusNamen(ctx, sp, kp.stufen); if (!st || st.length < 2) return null; aus.push({ sp, st }); }
    else if (sp.art === 'zahl') aus.push({ sp });
    else return null;
  }
  return new Set(aus.map(a => a.sp)).size === aus.length ? aus : null;
}
/** Gemeinsamer Anfang: Datenrahmen, listenweise vollständige Fälle, leere Stufen weg, Namen der Prädiktoren. */
const katAnfang = (kopf: string, p: Praed[], extra: string[] = []): string[] => [
  'd <- data.frame(', `  y = ${kopf},`, ...p.map((a, i) => `  x${i + 1} = ${spR(a.sp)},`), ...extra.map(x => `  ${x},`), '  check.names = FALSE)',
  `d <- d[complete.cases(d), , drop = FALSE]; rownames(d) <- NULL   # ${L('listenweise: nur vollständige Fälle', 'listwise: complete cases only')}`,
  `for (v in names(d)) if (is.factor(d[[v]])) d[[v]] <- droplevels(d[[v]])   # ${L('Stufen ohne Fälle fallen weg', 'levels without cases are dropped')}`,
  `praed <- c(${p.map((_, i) => `"x${i + 1}"`).join(', ')})`,
  'n_faelle <- nrow(d)'
];
/** Wald-Tabelle der Koeffizienten (wie Statable: z und p aus der Normalverteilung, KI = exp(B ± 1,96 · SE)). */
const katWald = (effekt: string): string =>
  `wald <- function(b, se) { z <- b / se; data.frame(b = b, se = se, z = z, p = 2 * pnorm(-abs(z)), ${effekt} = exp(b), ki_lo = exp(b - qnorm(0.975) * se), ki_hi = exp(b + qnorm(0.975) * se)) }`;
/** Likelihood-Quotienten-Test; `klemmen`: χ² ≤ 0 (Optimierer nicht ganz am Ende) wird 0 mit p = 1, wie Statable. */
const KAT_LR = 'lr_test <- function(ll1, ll0, df, klemmen = FALSE) { chi2 <- 2 * (ll1 - ll0); if (klemmen && chi2 <= 0) return(c(chi2 = 0, df = df, p = 1)); c(chi2 = chi2, df = df, p = pchisq(chi2, df, lower.tail = FALSE)) }';
const KAT_LL0 = 'll0 <- { t <- as.numeric(table(d$y)); t <- t[t > 0]; sum(t * log(t / sum(t))) }';
const KAT_PSEUDO = ['cox_snell <- 1 - exp(2 * (ll0 - ll) / n_faelle)', 'nagelkerke <- cox_snell / (1 - exp(2 * ll0 / n_faelle))'];
const katZeilen = (e: KatBasis, p: Praed[], effekt: string): string[] => lz([
  `n = ${e.n}, chi² (${e.modelltest.df}) = ${zz(e.modelltest.chi2, 3)}, ${pp(e.modelltest.p)}`,
  ...e.koef.filter(k => k.pIdx >= 0).map(k => `${k.kategorie !== undefined ? `${kom(k.kategorie)}: ` : ''}${kom(p[k.pIdx]?.sp.name ?? '')}${k.stufe ? ` ${kom(k.stufe)}` : ''}: B = ${zz(k.b, 3)}, ${effekt} = ${zz(k.effekt, 3)} [${zz(k.kiU, 3)}; ${zz(k.kiO, 3)}], ${pp(k.p)}`)
]);
const mitR = (paket: string) => `library(${paket})   # ${L('gehört zu jeder R-Installation', 'comes with every R installation')}`;
const lrKopf = `lr <- t(sapply(praed, function(x) { rest <- setdiff(praed, x)   # ${'LR'}`;

/** Ordinale Regression (Proportional-Odds-Modell, MASS::polr) mit den Einstellungen von Statable. */
function planOrdreg(e: OrdReg, ctx: RKontext): Plan | null {
  const y = finde(ctx, e.ziel);
  if (!y || y.art === 'datum' || (e.stufen?.length ?? 0) < 3) return null;
  const st = stufenAusNamen(ctx, y, e.stufen), p = katPraed(ctx, e);
  if (!st || !p) return null;
  return {
    spalten: [y, ...p.map(a => a.sp)], faktoren: [{ sp: y, st }, ...p.filter(a => a.st).map(a => ({ sp: a.sp, st: a.st! }))],
    rechnung: [
      mitR('MASS'),
      ...katAnfang(spR(y), p),
      `d$y <- factor(d$y, levels = levels(d$y), ordered = TRUE)   # ${L('Stufen von niedrig nach hoch', 'levels from low to high')}`,
      `ord_fit <- function(f) polr(f, data = d, method = "logistic", Hess = TRUE,   # ${L('feste Einstellungen der Optimierung wie Statable', 'fixed optimiser settings as in Statable')}`,
      '  control = list(reltol = 1e-14, maxit = 1000, ndeps = rep(1e-6, ncol(model.matrix(f, d)) - 1 + nlevels(d$y) - 1)))',
      'modell <- ord_fit(reformulate(praed, "y"))',
      'ergebnis <- summary(modell)',
      katWald('or'),
      'se_alle <- sqrt(diag(vcov(modell)))',
      'koef <- wald(coef(modell), se_alle[names(coef(modell))])',
      'schwellen <- data.frame(theta = modell$zeta, se = se_alle[names(modell$zeta)])',
      'll <- as.numeric(logLik(modell))',
      `${KAT_LL0}   # ${L('Modell ohne Prädiktoren', 'model without predictors')}`,
      KAT_LR,
      'modelltest <- lr_test(ll, ll0, length(coef(modell)))',
      ...KAT_PSEUDO,
      `${lrKopf} ${L('je Prädiktor', 'per predictor')}`,
      '  llr <- if (length(rest)) as.numeric(logLik(ord_fit(reformulate(rest, "y")))) else ll0',
      '  ncr <- if (length(rest)) ncol(model.matrix(reformulate(rest, "y"), d)) - 1 else 0',
      '  lr_test(ll, llr, length(coef(modell)) - ncr) }))',
      'print(ergebnis)', 'print(koef)', 'print(modelltest)', 'print(c(cox_snell = cox_snell, nagelkerke = nagelkerke))', 'print(lr)',
      `# ${L('Den Brant-Test (Brant 1990) rechnet Statable selbst; er steht hier nicht.', 'Statable calculates the Brant test (Brant 1990) itself; it is not included here.')}`
    ],
    statable: [...zuordnung(p), ...katZeilen(e, p, 'OR'), ...lz([`Nagelkerke R² = ${zz(e.nagelkerke, 3)}`, ...e.schwellen.map(s => `${kom(s.name)}: ${zz(s.theta, 3)}`)])]
  };
}

/** Multinomiale Regression (nnet::multinom) mit der Vergleichskategorie von Statable. */
function planMultreg(e: MultReg, ctx: RKontext): Plan | null {
  const y = finde(ctx, e.ziel);
  if (!y || y.art === 'datum' || !e.referenz || (e.kategorien?.length ?? 0) < 2) return null;
  const st = stufenAusNamen(ctx, y, [e.referenz, ...e.kategorien]), p = katPraed(ctx, e);
  if (!st || !p) return null;
  return {
    spalten: [y, ...p.map(a => a.sp)], faktoren: [{ sp: y, st }, ...p.filter(a => a.st).map(a => ({ sp: a.sp, st: a.st! }))],
    rechnung: [
      mitR('nnet'),
      ...katAnfang(spR(y), p),
      `# ${L(`Vergleichskategorie: „${kom(e.referenz)}“ (erste Stufe)`, `reference category: "${kom(e.referenz)}" (first level)`)}`,
      'mult_fit <- function(f) multinom(f, data = d, Hess = TRUE, maxit = 1000, reltol = 1e-12, trace = FALSE)',
      'modell <- mult_fit(reformulate(praed, "y"))',
      'ergebnis <- summary(modell)',
      katWald('or'),
      'koef <- do.call(rbind, lapply(rownames(ergebnis$coefficients), function(k) cbind(kategorie = k, name = colnames(ergebnis$coefficients),',
      '  wald(ergebnis$coefficients[k, ], ergebnis$standard.errors[k, ]))))',
      'll <- as.numeric(logLik(modell))',
      `${KAT_LL0}   # ${L('Modell ohne Prädiktoren', 'model without predictors')}`,
      'J <- nlevels(d$y); ncoef <- ncol(ergebnis$coefficients) - 1',
      KAT_LR,
      'modelltest <- lr_test(ll, ll0, (J - 1) * ncoef, klemmen = TRUE)',
      ...KAT_PSEUDO,
      `${lrKopf} ${L('je Prädiktor', 'per predictor')}`,
      '  if (length(rest)) { fr <- reformulate(rest, "y"); llr <- as.numeric(logLik(mult_fit(fr))); ncr <- ncol(model.matrix(fr, d)) - 1 } else { llr <- ll0; ncr <- 0 }',
      '  lr_test(ll, llr, (J - 1) * (ncoef - ncr), klemmen = TRUE) }))',
      'print(ergebnis)', 'print(koef)', 'print(modelltest)', 'print(c(cox_snell = cox_snell, nagelkerke = nagelkerke))', 'print(lr)'
    ],
    statable: [...zuordnung(p), ...katZeilen(e, p, 'OR'), ...lz([`Nagelkerke R² = ${zz(e.nagelkerke, 3)}`])]
  };
}

/** Zähldaten: Poisson oder negativ-binomial (θ über die Profil-Likelihood), so wie Statable gewählt hat; optional mit Beobachtungszeit (Offset). */
function planZaehlreg(e: ZaehlReg, ctx: RKontext): Plan | null {
  const y = finde(ctx, e.ziel);
  if (!y || y.art !== 'zahl') return null;
  const z = e.offset ? finde(ctx, e.offsetSpalte) : undefined;
  if (e.offset && (!z || z.art !== 'zahl' || z === y)) return null;
  const p = katPraed(ctx, e);
  if (!p || (z && p.some(a => a.sp === z))) return null;
  const neg = e.modell === 'negbin';
  const grund = e.grund === 'ueberdispersion' ? L('Die Werte streuen stärker, als Poisson erlaubt: negativ-binomial.', 'The values vary more than Poisson allows: negative binomial.')
    : e.grund === 'gewaehlt' ? L('Das Modell wurde in Statable gewählt.', 'The model was chosen in Statable.')
      : L('Keine Überdispersion erkennbar: Poisson.', 'No overdispersion detectable: Poisson.');
  return {
    spalten: [y, ...p.map(a => a.sp), ...(z ? [z] : [])], faktoren: p.filter(a => a.st).map(a => ({ sp: a.sp, st: a.st! })),
    rechnung: [
      mitR('MASS'),
      ...katAnfang(spR(y), p, z ? [`zeit = ${spR(z)}`] : []),
      `formel <- function(x) reformulate(c(if (length(x)) x else "1"${z ? ', "offset(log(zeit))"' : ''}), "y")${z ? `   # ${L('Beobachtungszeit als Offset', 'observation time as offset')}` : ''}`,
      'pois <- function(f) glm(f, family = poisson, data = d)',
      `nb <- function(f) {   # ${L('θ über die Profil-Likelihood (nicht glm.nb, das bei vielen Nullen versagt); B und SE bei festem θ', 'θ by profile likelihood (not glm.nb, which fails with many zeros); B and SE with θ fixed')}`,
      '  fit <- function(th) suppressWarnings(glm(f, family = negative.binomial(th), data = d))',
      '  o <- optimize(function(lt) sum(dnbinom(d$y, size = exp(lt), mu = fitted(fit(exp(lt))), log = TRUE)), log(c(1e-3, 1e4)), maximum = TRUE, tol = 1e-10)',
      '  th <- exp(o$maximum); m <- fit(th); mu <- fitted(m)',
      '  list(m = m, theta = th, loglik = o$objective, theta_se = 1 / sqrt(sum(trigamma(th) - trigamma(th + d$y) - 1 / th + 2 / (mu + th) - (d$y + th) / (mu + th)^2)))',
      '}',
      'modell_poisson <- pois(formel(praed))',
      `pearson_df <- sum(residuals(modell_poisson, "pearson")^2) / modell_poisson$df.residual   # ${L('über 1: die Werte streuen stärker als bei Poisson', 'above 1: the values vary more than with Poisson')}`,
      'nb_voll <- nb(formel(praed))',
      `lr_ueber <- max(2 * (nb_voll$loglik - as.numeric(logLik(modell_poisson))), 0)   # ${L('Poisson gegen negativ-binomial, p halbiert (Rand)', 'Poisson against negative binomial, p halved (boundary)')}`,
      'p_ueber <- if (lr_ueber <= 0) 1 else 0.5 * pchisq(lr_ueber, 1, lower.tail = FALSE)',
      `# ${L(`Statable hat gerechnet: ${neg ? 'negativ-binomial' : 'Poisson'}. ${grund}`, `Statable calculated: ${neg ? 'negative binomial' : 'Poisson'}. ${grund}`)}`,
      ...(neg ? [
        'modell <- nb_voll$m; theta <- nb_voll$theta; theta_se <- nb_voll$theta_se; ll <- nb_voll$loglik',
        'll0 <- nb(formel(character(0)))$loglik',
        'll_ohne <- function(x) nb(formel(setdiff(praed, x)))$loglik',
        'ncoef_ohne <- function(x) length(coef(nb(formel(setdiff(praed, x)))$m))'
      ] : [
        'modell <- modell_poisson; ll <- as.numeric(logLik(modell))',
        'll0 <- as.numeric(logLik(pois(formel(character(0)))))',
        'll_ohne <- function(x) as.numeric(logLik(pois(formel(setdiff(praed, x)))))',
        'ncoef_ohne <- function(x) length(coef(pois(formel(setdiff(praed, x)))))'
      ]),
      'ergebnis <- summary(modell, dispersion = 1)',
      katWald('irr'),
      'koef <- wald(coef(ergebnis)[, 1], coef(ergebnis)[, 2])',
      KAT_LR,
      'modelltest <- lr_test(ll, ll0, length(coef(modell)) - 1)',
      `lr <- t(sapply(praed, function(x) lr_test(ll, ll_ohne(x), length(coef(modell)) - ncoef_ohne(x), klemmen = TRUE)))   # ${L('je Prädiktor', 'per predictor')}`,
      'print(ergebnis)', 'print(koef)', 'print(modelltest)', 'print(lr)', `print(c(pearson_df = pearson_df, lr_ueber = lr_ueber, p_ueber = p_ueber${neg ? ', theta = theta' : ''}))`
    ],
    statable: [...zuordnung(p), ...(z ? lz([`zeit = ${kom(z.name)}`]) : []), ...katZeilen(e, p, 'IRR'), ...(neg ? lz([`theta = ${zz(e.theta ?? undefined, 3)}`]) : [])]
  };
}

/** Teil 2f: die Arten, die Statable mit Häufigkeitsgewicht rechnet (Tabelle in lib/gewichte.ts, Status „rechnen“): dort gibt das Erweitern der Zeilen dieselben Zahlen wie PSPP `WEIGHT BY`.
 *  Nicht dabei: logistische Regression, Skala, ICC, Messwiederholung, Rangtests, Rang- und Partialkorrelation, webR-Regressionen - die sperrt Statable mit Fallgewicht. */
export const GEWICHT_ARTEN = ['zwei-gruppen', 'anova', 'prae-post', 'zusammenhang', 'kreuz', 'vorhersage', 'verteilung', 'kappa', 'faktor'] as const;

function plane(erg: RErgebnis, ctx: RKontext): Plan | null {
  if (ctx.gewicht || !(ARTEN as readonly string[]).includes(erg.typ) || !erg.e) return null;
  if (!ctx.gewichtSpalte) return planeArt(erg, ctx);
  // Teil 2f: Häufigkeitsgewicht
  if (!(GEWICHT_ARTEN as readonly string[]).includes(erg.typ) || erg.rang) return null;
  if (erg.typ === 'zusammenhang') { const z = erg.e as Zusammenhang; if ((z.methode ?? 'pearson') !== 'pearson' || (z.kontroll ?? []).length) return null; }
  const w = finde(ctx, ctx.gewichtSpalte);
  if (!w || w.art !== 'zahl') return null;
  const p = planeArt(erg, ctx);
  if (!p || p.spalten.includes(w)) return null;
  return { ...p, spalten: [...p.spalten, w], gewicht: w };
}

function planeArt(erg: RErgebnis, ctx: RKontext): Plan | null {
  switch (erg.typ) {
    case 'zwei-gruppen': return mitRang(planZweiGruppen(erg.e as ZweiGruppen, ctx), erg.rang, erg.typ);
    case 'anova': return mitRang(planAnova(erg.e as Anova, ctx), erg.rang, erg.typ);
    case 'prae-post': return mitRang(planPraePost(erg.e as PraePost, ctx), erg.rang, erg.typ);
    case 'zusammenhang': return planZusammenhang(erg.e as Zusammenhang, ctx);
    case 'kreuz': return planKreuz(erg.e as Kreuz, ctx);
    case 'vorhersage': return planVorhersage(erg.e as Vorhersage, ctx);
    case 'verteilung': return planVerteilung(erg.e as Verteilung, ctx);
    case 'logistik': return planLogistik(erg.e as Logistik, ctx);
    case 'skala': return planSkala(erg.e as Skala, ctx);
    case 'kappa': return planKappa(erg.e as Kappa, ctx);
    case 'icc': return planIcc(erg.e as IccErgebnis, ctx);
    case 'faktor': return planFaktor(erg.e as Faktoren, ctx);
    case 'ordreg': return planOrdreg(erg.e as OrdReg, ctx);
    case 'multreg': return planMultreg(erg.e as MultReg, ctx);
    case 'zaehlreg': return planZaehlreg(erg.e as ZaehlReg, ctx);
    case 'messwiederholung': return mitRang(planMesswiederholung(erg.e as Messwiederholung, ctx), erg.rang, erg.typ);
    default: return null;
  }
}

/** Gibt es zu diesem Ergebnis ein R-Skript (eine der Arten; mit Häufigkeitsgewicht nur GEWICHT_ARTEN, mit Umfragegewicht nie; alle Spalten und Gruppen auffindbar)? Wirft nie. */
export function rSkriptMoeglich(erg: RErgebnis | null | undefined, ctx: RKontext): boolean {
  if (!erg) return false;
  try { return plane(erg, ctx) !== null; } catch { return false; }
}

/* ------------------------------------------------------------------ CSV */

const feld = (t: string): string => (/[",\r\n]/.test(t) || /^\s|\s$/.test(t) ? `"${t.replace(/"/g, '""')}"` : t);
function zelle(sp: RSpalte, v: string | number | null | undefined): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'number') return !Number.isFinite(v) || istFehlend(sp, v) ? '' : String(v);
  if (sp.art === 'datum') { const m = /^(\d{2})\.(\d{2})\.(\d{4})( \d{2}:\d{2}:\d{2})?$/.exec(v); return feld(m ? `${m[3]}-${m[2]}-${m[1]}${m[4] ?? ''}` : v); }
  return feld(v);
}
/** Die Daten als CSV: nur diese Spalten, nur diese Zeilen. */
export function datenCsv(ctx: RKontext, spalten: RSpalte[]): string {
  const ix = spalten.map(s => idx(ctx, s));
  const kopf = spalten.map(s => feld(s.name)).join(',');
  const zeilen = zeilenIndizes(ctx).map(z => spalten.map((s, k) => zelle(s, ctx.zeilen[z]?.[ix[k]!])).join(','));
  return [kopf, ...zeilen].join('\n') + '\n';
}

/* ------------------------------------------------------------------ Skript */

const kopfZeilen = (titel: string, datum: string): string[] => [
  `# ${kom(titel) || 'Statable'}`,
  `# ${L(`Erstellt mit Statable (statable.eu) am ${kom(datum)}`, `Created with Statable (statable.eu) on ${kom(datum)}`)}`,
  `# ${L('Statable rechnet mit PSPP. Dieses Skript rechnet dasselbe mit R. Kleine Unterschiede in der letzten Stelle sind möglich.', 'Statable calculates with PSPP. This script calculates the same with R. Small differences in the last digit are possible.')}`,
  `# ${L('Starten: Ordner entpacken, in R mit setwd() in den Ordner wechseln (in RStudio: Session > Set Working Directory > To Source File Location), dann source() mit dem Namen dieser Datei.', 'How to start it: unzip the folder, change to the folder in R with setwd() (in RStudio: Session > Set Working Directory > To Source File Location), then source() with the name of this file.')}`,
  ''
];
const leseZeile = (ziel: string, csvName: string, spalten: RSpalte[]): string => {
  const texte = spalten.filter(s => s.art === 'text');
  return `${ziel} <- read.csv(${q(csvName)}, fileEncoding = "UTF-8", check.names = FALSE, na.strings = ""${texte.length ? `, colClasses = c(${texte.map(s => `${q(s.name)} = "character"`).join(', ')})` : ''})`;
};
const LESEN_KOM = () => `# ${L('Daten lesen (Zahlen als Codes, fehlende Werte als leere Zelle)', 'Read the data (numbers as codes, missing values as an empty cell)')}`;
/** Gruppen, Rechnung und Vergleich eines Plans (ohne Kopf und ohne Lesen). */
function rumpf(p: Plan): string[] {
  const gewicht = p.gewicht ? [
    `# ${L(`Häufigkeitsgewicht ${kom(p.gewicht.name)}: Jede Zeile zählt so oft, wie ihr Gewicht sagt (wie PSPP mit WEIGHT BY). Zeilen ohne Gewicht oder mit 0 zählen nicht.`, `Frequency weight ${kom(p.gewicht.name)}: each row counts as often as its weight says (like PSPP with WEIGHT BY). Rows without a weight or with 0 are not counted.`)}`,
    `# ${L('Nicht lm(weights = ...): R zählte dann die Zeilen statt der Fälle, Freiheitsgrade und p-Werte wären falsch.', 'Not lm(weights = ...): R would then count the rows instead of the cases, so degrees of freedom and p-values would be wrong.')}`,
    `gewicht <- ${spR(p.gewicht)}`,
    'gewicht[is.na(gewicht) | gewicht < 0] <- 0',
    'daten <- daten[rep(seq_len(nrow(daten)), round(gewicht)), , drop = FALSE]',
    'rownames(daten) <- NULL', ''
  ] : [];
  const gruppen = p.faktoren.length ? [
    `# ${L('Gruppen: Stufen in der Reihenfolge von Statable', 'Groups: levels in the order used by Statable')}`,
    ...p.faktoren.map(f => `${spR(f.sp)} <- ${faktorR(f.sp, f.st)}`), ''
  ] : [];
  return [
    ...gewicht, ...gruppen, `# ${L('Rechnung', 'Calculation')}`, ...p.rechnung, '',
    `# ${L('Zum Vergleichen: Das hat Statable gezeigt (Zahlen mit Punkt)', 'To compare: this is what Statable showed (numbers with a decimal point)')}`, ...p.statable
  ];
}

/** Das Skript und die CSV zu einem Ergebnis. Wirft, wenn `rSkriptMoeglich` falsch ist. */
export function baueRSkript(erg: RErgebnis, ctx: RKontext): RSkript {
  const p = plane(erg, ctx);
  if (!p) throw new Error('Kein R-Skript für dieses Ergebnis');
  const basis = rDateiBasis(ctx.titel), csvName = `${basis}-daten.csv`, rName = `${basis}.R`;
  const r = [...kopfZeilen(ctx.titel, ctx.datum), LESEN_KOM(), leseZeile('daten', csvName, p.spalten), '', ...rumpf(p), ''].join('\n');
  return { r, csv: datenCsv(ctx, p.spalten), rName, csvName };
}

/* ------------------------------------------------------------------ ganzer Bericht (Teil 2e) */

/** Ein Blatt des Berichts: Ergebnis und Kontext wie beim einzelnen Blatt. */
export interface RBerichtBlatt { erg: RErgebnis | null | undefined; ctx: RKontext }
export interface RBerichtSkript extends RSkript { mit: string[]; ohne: string[] }

/**
 * B1 Teil 2e: alle Blätter des Berichts als EIN Skript mit EINER CSV (alle benutzten Spalten, alle Zeilen).
 * Jedes Blatt rechnet in einer eigenen Umgebung `blatt_<n> <- local({ … ; environment() })` mit einer frischen Kopie `daten <- daten_alle`,
 * damit Gruppen-Stufen eines Blatts das nächste nicht stören; die Objekte stehen danach z. B. als `blatt_1$ergebnis` bereit.
 * Blätter ohne Skript (andere Verfahren, Fallgewicht) stehen nur als Kommentar im Kopf. `null`, wenn kein Blatt ein Skript hat. Alle Blätter haben dieselben Daten (`ctx.spalten`, `ctx.zeilen`).
 */
export function baueRBericht(blaetter: RBerichtBlatt[], titel: string, datum: string): RBerichtSkript | null {
  const plaene: { p: Plan; titel: string; n: number }[] = [], ohne: string[] = [];
  blaetter.forEach(({ erg, ctx }) => {
    let p: Plan | null = null;
    try { p = erg ? plane(erg, ctx) : null; } catch { p = null; }
    if (p) plaene.push({ p, titel: ctx.titel, n: plaene.length + 1 }); else ohne.push(ctx.titel);
  });
  if (!plaene.length) return null;
  const ctx0 = blaetter[0]!.ctx;
  // Spalten in der Reihenfolge des Projekts (die Stellen der Pläne zeigen auf dieselben Objekte in ctx.spalten).
  const benutzt = new Set(plaene.flatMap(x => x.p.spalten.map(s => s.name)));
  const spalten = ctx0.spalten.filter(s => benutzt.has(s.name));
  const basis = rDateiBasis(titel), csvName = `${basis}-daten.csv`, rName = `${basis}.R`;
  const inhalt = [
    `# ${L('Inhalt', 'Contents')}:`,
    ...plaene.map(x => `#   blatt_${x.n}: ${kom(x.titel)}`),
    ...(ohne.length ? [`# ${L('Ohne R-Skript (anderes Verfahren, Umfragegewicht oder veraltet)', 'Without an R script (other method, survey weight or out of date)')}:`, ...ohne.map(t => `#   - ${kom(t)}`)] : []),
    `# ${L('Die Objekte eines Blatts stehen danach bereit, zum Beispiel blatt_1$ergebnis.', 'Afterwards the objects of a page are available, for example blatt_1$ergebnis.')}`,
    ''
  ];
  const teile = plaene.flatMap(x => [
    `# ${'='.repeat(70)}`,
    `# ${x.n}. ${kom(x.titel)}`,
    `# ${'='.repeat(70)}`,
    `cat(${q(`\n== ${x.n}. ${kom(x.titel)} ==\n`)})`,
    `blatt_${x.n} <- local({`,
    'daten <- daten_alle',
    ...rumpf(x.p),
    'environment()',
    '})',
    ''
  ]);
  const r = [...kopfZeilen(titel, datum), ...inhalt, LESEN_KOM(), leseZeile('daten_alle', csvName, spalten), '', ...teile].join('\n');
  return { r, csv: datenCsv(ctx0, spalten), rName, csvName, mit: plaene.map(x => x.titel), ohne };
}

/** Beide Dateien als ZIP (Bytes). */
export function rSkriptZip(res: RSkript): Uint8Array {
  return zipSync({ [res.rName]: strToU8(res.r), [res.csvName]: strToU8(res.csv) });
}
