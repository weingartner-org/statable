/**
 * Später S-D2, Bauer B: Gruppenvergleich (designbasierter t-Test, Wald-F ab drei Gruppen) und lineare/logistische Regression mit Umfragegewicht - die Sätze (APA), Hinweise und Tabellen.
 * Die Zahlen kommen aus webR (engine/statable-umfrage.R: sp_umfrage_gruppen, sp_umfrage_regression); hier steht keine Rechnung.
 * Fachblatt docs/fachblaetter/SPAETER-D2-UMFRAGEGEWICHTE.md Abschnitt 4 bis 6 mit „Entscheidungen Opus (17.10.)“ 4 und 9:
 *   - zwei Gruppen: nur designbasiert, Differenz ERSTE minus ZWEITE Gruppe (survey rechnet umgekehrt), keine Wahl Student/Welch, kein Levene-Test;
 *   - ab drei Gruppen nur der Gesamttest (Wald-F), keine Paarvergleiche;
 *   - lineare Regression: gewichtetes R² nur als beschreibende Zahl; standardisierte Koeffizienten gesperrt;
 *   - logistische Regression: quasibinomial; Trennung gibt einen Satz statt Zahlen; ROC/AUC und Pseudo-R² gibt es nicht.
 * n in den Sätzen ist die Zahl der Zeilen (Fälle der Frage), nie die Summe der Gewichte. Jeder Satz ist ein ganzer, fester Satz (übersetzbar, keine eingesetzten Wörter).
 */
import type { TableItem } from '../engine/types';
import { L, Lp } from './sitzung.svelte';
import { komma, ohneNull, pWert, type Saetze } from './ergebnis';
import { iv, proz, zitat, profil } from '../i18n/profil';
import { tabelle, fx, fo, fp, fd, type Z } from './mwsaetze';
import type { Gewicht, GewichtAbdruck } from './gewichte';
import { hinweisSatz, umfrageFehlerSatz, umfrageFuss, umfrageHinweise, type UmfrageErgebnis, type UmfrageSatz, type UmfrageSatzKontext } from './umfrage';

type Name = (spalte: string) => string;
type Wert = (spalte: string, wert: string | number) => string;

/** Was das Blatt nach der R-Rechnung festhält (reine Daten, übersteht Speichern und Sprachwechsel): die gelesene Antwort und die Spalten/Werte, aus denen die Anzeigenamen entstehen. */
export interface DesignB {
  art: 'gruppen' | 'regression';
  /** Antwort von R, gelesen mit `umfrageLesen` (camelCase) */ r: UmfrageErgebnis;
  /** Spalte der Zielgröße (gemessene Größe bzw. vorhergesagte Größe) */ ziel: string;
  /** Gruppenvergleich: Spalte der Gruppen und die Werte in der Reihenfolge von `r.gruppen` (Code 1, 2 …) */ gruppenSpalte?: string; gruppenWerte?: (string | number)[];
  /** Regression: je Koeffizient (Konstante zuerst: `null`) die Spalte, bei einer Gruppen-Spalte die Stufe und die Vergleichsstufe */ koefTerme?: ({ spalte: string; stufe?: string; referenz?: string } | null)[];
  /** Logistische Regression: das Ereignis (Wert und Vergleichswert der Zielspalte) */ ereignis?: { wert: string | number; referenz: string | number };
}

/* ---------------------------------------------------------------------------------------------------------------------------------- Bausteine */
const semi = () => `${profil().vorSemikolon ?? ''}; `;
const dfZahl = (v: number) => komma(v, Number.isInteger(v) ? 0 : 2);
const fKlammer = (a: number, b: number) => `F(${dfZahl(a)}${semi()}${dfZahl(b)})`;
const kiText = (u: number, o: number) => `${L('95-%-KI', '95% CI')} ${iv(komma(u), komma(o))}`;
const kiOr = (u: number, o: number) => `${L('95-%-KI', '95% CI')} ${iv(ohneNull(u), ohneNull(o))}`;
const sig = (p: number) => Number.isFinite(p) && p < 0.05;
const zahlOk = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/** Der Name einer Gruppe im Satz (in Anführungszeichen). */
function gruppenName(e: UmfrageErgebnis, ctx: UmfrageSatzKontext, i: number): string {
  const n = ctx.gruppenNamen?.[i], c = e.gruppen?.[i]?.code;
  return zitat(n ?? L(`Gruppe ${c ?? i + 1}`, `Group ${c ?? i + 1}`));
}
const mittelZeile = (e: UmfrageErgebnis, ctx: UmfrageSatzKontext): string => (e.gruppen as UmfrageErgebnis[]).map((g, i) => `${gruppenName(e, ctx, i)}: M = ${komma(g.mittel)}, SE = ${komma(g.se)}`).join('; ');

/* ---------------------------------------------------------------------------------------------------------------------------------- Gruppenvergleich */
function satzGruppen(e: UmfrageErgebnis, ctx: UmfrageSatzKontext): UmfrageSatz {
  const t = e.test, n = e.n as number, name = ctx.name;
  let haupt: string, detail: string;
  if (t.art === 't') {
    const a = gruppenName(e, ctx, 0), b = gruppenName(e, ctx, 1), s = sig(t.p);
    const werte = `${L('Differenz', 'difference')} = ${komma(t.diff)}; ${kiText(t.kiU, t.kiO)}; t(${dfZahl(t.df)}) = ${komma(t.t)}; p ${pWert(t.p)}; ${L('designbasierter t-Test', 'design-based t test')}, n = ${n}`;
    haupt = s
      ? L(`Bei ${name} unterscheiden sich die Gruppen ${a} und ${b} gewichtet signifikant (${werte}).`, `For ${name}, the groups ${a} and ${b} differ significantly when weighted (${werte}).`)
      : L(`Bei ${name} unterscheiden sich die Gruppen ${a} und ${b} gewichtet nicht signifikant (${werte}).`, `For ${name}, the groups ${a} and ${b} do not differ significantly when weighted (${werte}).`);
    detail = L(`Die Differenz ist der gewichtete Mittelwert von ${a} minus der gewichtete Mittelwert von ${b}. Gewichtete Mittelwerte: ${mittelZeile(e, ctx)}. Die Standardfehler kommen für jede Gruppe aus den Daten (Taylor-Linearisierung); es gibt keine Annahme gleicher Streuung und keine Wahl zwischen verschiedenen t-Test-Formen.`,
      `The difference is the weighted mean of ${a} minus the weighted mean of ${b}. Weighted means: ${mittelZeile(e, ctx)}. The standard errors come from the data for each group (Taylor linearization); there is no assumption of equal variances and no choice between different forms of the t test.`);
  } else {
    const s = sig(t.p), k = e.k as number;
    const werte = `${fKlammer(t.ndf, t.ddf)} = ${komma(t.f)}; p ${pWert(t.p)}; ${L('designbasierter Wald-Test', 'design-based Wald test')}, n = ${n}`;
    haupt = s
      ? L(`Bei ${name} unterscheiden sich die ${k} Gruppen gewichtet signifikant (${werte}).`, `For ${name}, the ${k} groups differ significantly when weighted (${werte}).`)
      : L(`Bei ${name} unterscheiden sich die ${k} Gruppen gewichtet nicht signifikant (${werte}).`, `For ${name}, the ${k} groups do not differ significantly when weighted (${werte}).`);
    detail = L(`Gewichtete Mittelwerte: ${mittelZeile(e, ctx)}. Der Test prüft nur, ob sich irgendwelche der Gruppen unterscheiden. Einzelne Paare vergleicht Statable mit einem Umfragegewicht nicht.`,
      `Weighted means: ${mittelZeile(e, ctx)}. The test only checks whether any of the groups differ. With a survey weight Statable does not compare single pairs.`);
  }
  return { haupt, detail, fuss: umfrageFuss(ctx.gewicht, { n: e.gewicht.n ?? n, kishNeff: e.gewicht.kishNeff }, e.entwurf?.deff), hinweise: umfrageHinweise('gruppen', e).map(c => hinweisSatz(c, e)) };
}

/* ---------------------------------------------------------------------------------------------------------------------------------- Regression */
const bTeil = (k: UmfrageErgebnis, df: number) => `b = ${komma(k.b)}, SE = ${komma(k.se)}; ${kiText(k.kiU, k.kiO)}; t(${dfZahl(df)}) = ${komma(k.t)}; p ${pWert(k.p)}`;
const orTeil = (k: UmfrageErgebnis, df: number) => `OR = ${ohneNull(k.or)}; ${kiOr(k.orU, k.orO)}; t(${dfZahl(df)}) = ${komma(k.t)}; p ${pWert(k.p)}; ${L('designbasierte Standardfehler', 'design-based standard errors')}`;
const gesamtTeil = (e: UmfrageErgebnis) => `${fKlammer(e.gesamt.ndf, e.gesamt.ddf)} = ${komma(e.gesamt.f)}, p ${pWert(e.gesamt.p)}`;

/** Der Satz zu EINEM Koeffizienten (Index 0 = Konstante); `mitR2` hängt bei der linearen Regression den Satz zum gewichteten R² an. */
function satzKoef(e: UmfrageErgebnis, ctx: UmfrageSatzKontext, mitR2: boolean): string {
  const i = ctx.index ?? 1, k = (e.koef as UmfrageErgebnis[])[i];
  if (!k) return '';
  const name = ctx.name, ziel = ctx.ziel, df = e.df as number, s = sig(k.p), logistisch = typeof e.ereignisse === 'number';
  let t: string;
  if (logistisch) {
    const proz1 = proz(komma(Math.abs(k.or - 1) * 100, 1)), w = orTeil(k, df);
    t = i === 0
      ? L(`Die Konstante (die Odds für das Ereignis, wenn alle Vorhersagegrößen 0 sind) beträgt ${w}.`, `The constant (the odds of the event when all predictors are 0) is ${w}.`)
      : !s ? L(`In der gewichteten logistischen Regression zeigt sich bei ${name} kein signifikanter Zusammenhang mit den Odds für das Ereignis (${w}).`, `In the weighted logistic regression there is no significant relationship between ${name} and the odds of the event (${w}).`)
      : k.or < 1 ? L(`In der gewichteten logistischen Regression sinken die Odds für das Ereignis mit ${name} signifikant, je Einheit mehr um ${proz1} (${w}).`, `In the weighted logistic regression the odds of the event fall significantly with ${name}, by ${proz1} per additional unit (${w}).`)
      : L(`In der gewichteten logistischen Regression steigen die Odds für das Ereignis mit ${name} signifikant, je Einheit mehr um ${proz1} (${w}).`, `In the weighted logistic regression the odds of the event rise significantly with ${name}, by ${proz1} per additional unit (${w}).`);
  } else {
    const w = bTeil(k, df);
    // Mit Namen der Zielgröße (der Name ist ein Eigenname) oder ohne (eigene feste Sätze, kein eingesetztes Wort wie „der Zielgröße“)
    t = ziel !== undefined
      ? (i === 0
        ? L(`Die Konstante (der erwartete Wert bei ${ziel}, wenn alle Vorhersagegrößen 0 sind) beträgt ${w}.`, `The constant (the expected value of ${ziel} when all predictors are 0) is ${w}.`)
        : !s ? L(`In der gewichteten Regression zeigt sich bei ${name} kein signifikanter Zusammenhang mit ${ziel} (${w}).`, `In the weighted regression there is no significant relationship between ${name} and ${ziel} (${w}).`)
        : k.b < 0 ? L(`In der gewichteten Regression geht ${name} signifikant mit niedrigeren Werten bei ${ziel} einher (${w}).`, `In the weighted regression ${name} goes together with significantly lower values of ${ziel} (${w}).`)
        : L(`In der gewichteten Regression geht ${name} signifikant mit höheren Werten bei ${ziel} einher (${w}).`, `In the weighted regression ${name} goes together with significantly higher values of ${ziel} (${w}).`))
      : (i === 0
        ? L(`Die Konstante (der erwartete Wert der Zielgröße, wenn alle Vorhersagegrößen 0 sind) beträgt ${w}.`, `The constant (the expected value of the outcome when all predictors are 0) is ${w}.`)
        : !s ? L(`In der gewichteten Regression zeigt sich bei ${name} kein signifikanter Zusammenhang mit der Zielgröße (${w}).`, `In the weighted regression there is no significant relationship between ${name} and the outcome (${w}).`)
        : k.b < 0 ? L(`In der gewichteten Regression geht ${name} signifikant mit niedrigeren Werten der Zielgröße einher (${w}).`, `In the weighted regression ${name} goes together with significantly lower values of the outcome (${w}).`)
        : L(`In der gewichteten Regression geht ${name} signifikant mit höheren Werten der Zielgröße einher (${w}).`, `In the weighted regression ${name} goes together with significantly higher values of the outcome (${w}).`));
  }
  if (mitR2 && !logistisch && zahlOk(e.r2Gewichtet))
    t += ' ' + L(`Das Modell erklärte gewichtet ${proz(komma(100 * e.r2Gewichtet, 0))} der Streuung (R² = ${ohneNull(e.r2Gewichtet)}; beschreibend).`, `The model explained ${proz(komma(100 * e.r2Gewichtet, 0))} of the variance when weighted (R² = ${ohneNull(e.r2Gewichtet)}; descriptive).`);
  return t;
}
function satzRegression(e: UmfrageErgebnis, ctx: UmfrageSatzKontext): UmfrageSatz {
  const logistisch = typeof e.ereignisse === 'number', n = e.n as number;
  const gesamt = L(`Gesamttest aller Vorhersagegrößen: ${gesamtTeil(e)} (designbasierter Wald-Test, n = ${n}).`, `Overall test of all predictors: ${gesamtTeil(e)} (design-based Wald test, n = ${n}).`);
  const ereignis = logistisch ? Lp(e.ereignisse, `Es gab ${e.ereignisse} Ereignis (Zeilen, nicht hochgerechnet) bei ${n} Befragten.`, `Es gab ${e.ereignisse} Ereignisse (Zeilen, nicht hochgerechnet) bei ${n} Befragten.`,
    `There was ${e.ereignisse} event (rows, not scaled up) among ${n} respondents.`, `There were ${e.ereignisse} events (rows, not scaled up) among ${n} respondents.`) : '';
  const art = logistisch ? L('Die Odds Ratio (OR) ist kein Risikoverhältnis: sie vergleicht Chancen, nicht Wahrscheinlichkeiten.', 'The odds ratio (OR) is not a risk ratio: it compares odds, not probabilities.') : '';
  const gew = ctx.ereignis ? L(`Ereignis: ${ctx.ereignis}.`, `Event: ${ctx.ereignis}.`) : '';
  return {
    haupt: satzKoef(e, ctx, true),
    detail: [gesamt, ereignis, gew, art].filter(Boolean).join(' '),
    fuss: umfrageFuss(ctx.gewicht, { n: e.gewicht.n ?? n, kishNeff: e.gewicht.kishNeff }, e.entwurf?.deff),
    hinweise: umfrageHinweise('regression', e).map(c => hinweisSatz(c, e))
  };
}

/** Von `umfrageSatz` (lib/umfrage.ts) gerufen: die Sätze zu einem Ergebnis der Arten `gruppen` und `regression`. Ein Fehlerergebnis gibt den Fehlersatz. */
export function umfrageSatzGr(art: 'gruppen' | 'regression', e: UmfrageErgebnis, ctx: UmfrageSatzKontext): UmfrageSatz {
  if (e.fehlerCode) return { haupt: umfrageFehlerSatz(e as { fehlerCode: string }), detail: '', fuss: '', hinweise: [] };
  return art === 'gruppen' ? satzGruppen(e, ctx) : satzRegression(e, ctx);
}

/* ---------------------------------------------------------------------------------------------------------------------------------- Namen am Blatt */
const gruppenNamenVon = (db: DesignB, wert: Wert): string[] | undefined => (db.gruppenSpalte && db.gruppenWerte ? db.gruppenWerte.map(w => wert(db.gruppenSpalte!, w)) : undefined);
/** Anzeigename eines Koeffizienten (Konstante zuerst). Gruppen-Spalten: „Spalte: Stufe (gegen Vergleichsstufe)“. */
export type KoefTerm = NonNullable<DesignB['koefTerme']>[number];
export function koefName(t: KoefTerm, name: Name, wert: Wert): string {
  if (!t) return L('Konstante', 'Constant');
  if (t.stufe === undefined) return name(t.spalte);
  return `${name(t.spalte)}: ${wert(t.spalte, t.stufe)} (${L('gegen', 'vs.')} ${wert(t.spalte, t.referenz ?? '')})`;
}
const ereignisText = (db: DesignB, name: Name, wert: Wert): string | undefined => (db.ereignis ? `${name(db.ziel)} = ${wert(db.ziel, db.ereignis.wert)} (${L('gegen', 'vs.')} ${wert(db.ziel, db.ereignis.referenz)})` : undefined);

/** Ein Fehlerergebnis mit Anzeigenamen statt der R-Namen: Spalte `p02` → Name des Prädiktors, Gruppe `2` → Name der Gruppe. */
function fehlerMitNamen(db: DesignB, name: Name, wert: Wert): { fehlerCode: string; [k: string]: unknown } {
  const e = { ...db.r } as { fehlerCode: string; [k: string]: unknown };
  const m = /^p(\d+)$/.exec(String(e.spalte ?? ''));
  if (m && db.koefTerme?.[Number(m[1])]) e.spalte = koefName(db.koefTerme[Number(m[1])] ?? null, name, wert);
  const gc = Array.isArray(e.gruppe) ? e.gruppe[0] : e.gruppe;
  if (typeof gc === 'number' && db.gruppenSpalte && db.gruppenWerte?.[gc - 1] !== undefined) e.gruppe = zitat(wert(db.gruppenSpalte, db.gruppenWerte[gc - 1]!));
  return e;
}
/** Das Ergebnis des Blattes als Sätze (Blatt, Bericht): `haupt` der Gesamtbefund, `zusatz` die Einzelheiten, `vorsicht` Hinweise und Fußzeile. */
export function saetzeDesignB(db: DesignB, g: Gewicht, name: Name, wert: Wert): Saetze {
  const e = db.r, marken = [{ text: `n = ${e.n ?? '-'}`, erklaer: 'stichprobe' }];
  if (e.fehlerCode) return { haupt: umfrageFehlerSatz(fehlerMitNamen(db, name, wert)), zusatz: '', vorsicht: '', apa: '', marken: [] };
  const ziel = name(db.ziel), ctx = (extra: Partial<UmfrageSatzKontext> = {}): UmfrageSatzKontext => ({ gewicht: g, name: ziel, ziel, ereignis: ereignisText(db, name, wert), ...extra });
  if (db.art === 'gruppen') {
    const s = umfrageSatzGr('gruppen', e, ctx({ gruppenNamen: gruppenNamenVon(db, wert) })), t = e.test;
    const apa = t.art === 't' ? `t(${dfZahl(t.df)}) = ${komma(t.t)}, p ${pWert(t.p)}, ${L('Differenz', 'difference')} = ${komma(t.diff)}, ${kiText(t.kiU, t.kiO)}` : `${fKlammer(t.ndf, t.ddf)} = ${komma(t.f)}, p ${pWert(t.p)}`;
    return { haupt: s.haupt, zusatz: s.detail, vorsicht: [...s.hinweise, s.fuss].filter(Boolean).join(' '), apa, marken };
  }
  const koefs = e.koef as UmfrageErgebnis[], terme = db.koefTerme ?? [];
  const jeKoef = koefs.map((_, i) => satzKoef(e, ctx({ name: koefName(terme[i] ?? null, name, wert), index: i }), false));
  const s = satzRegression(e, ctx({ index: 1 }));
  const logistisch = typeof e.ereignisse === 'number';
  const nv = koefs.length - 1, r2s = e.r2Gewichtet !== undefined ? `${proz(komma(100 * e.r2Gewichtet, 0))}` : '', r2o = e.r2Gewichtet !== undefined ? ohneNull(e.r2Gewichtet) : '';
  const modell = logistisch
    ? Lp(nv, `Die gewichtete logistische Regression sagt das Ereignis mit ${nv} Vorhersagegröße voraus (${gesamtTeil(e)}; designbasierter Wald-Test, n = ${e.n}).`, `Die gewichtete logistische Regression sagt das Ereignis mit ${nv} Vorhersagegrößen voraus (${gesamtTeil(e)}; designbasierter Wald-Test, n = ${e.n}).`,
      `The weighted logistic regression predicts the event from ${nv} predictor (${gesamtTeil(e)}; design-based Wald test, n = ${e.n}).`, `The weighted logistic regression predicts the event from ${nv} predictors (${gesamtTeil(e)}; design-based Wald test, n = ${e.n}).`)
    : Lp(nv, `Die gewichtete Regression sagt ${ziel} mit ${nv} Vorhersagegröße voraus (${gesamtTeil(e)}; designbasierter Wald-Test, n = ${e.n}). Das Modell erklärte gewichtet ${r2s} der Streuung (R² = ${r2o}; beschreibend).`,
      `Die gewichtete Regression sagt ${ziel} mit ${nv} Vorhersagegrößen voraus (${gesamtTeil(e)}; designbasierter Wald-Test, n = ${e.n}). Das Modell erklärte gewichtet ${r2s} der Streuung (R² = ${r2o}; beschreibend).`,
      `The weighted regression predicts ${ziel} from ${nv} predictor (${gesamtTeil(e)}; design-based Wald test, n = ${e.n}). The model explained ${r2s} of the variance when weighted (R² = ${r2o}; descriptive).`,
      `The weighted regression predicts ${ziel} from ${nv} predictors (${gesamtTeil(e)}; design-based Wald test, n = ${e.n}). The model explained ${r2s} of the variance when weighted (R² = ${r2o}; descriptive).`);
  const zusatz = [...jeKoef.slice(1), s.detail].filter(Boolean).join(' ');
  return { haupt: modell, zusatz, vorsicht: [...s.hinweise, s.fuss].filter(Boolean).join(' '), apa: `${gesamtTeil(e)}${logistisch ? '' : `, R² = ${ohneNull(e.r2Gewichtet)} (${L('gewichtet, beschreibend', 'weighted, descriptive')})`}`, marken };
}

/* ---------------------------------------------------------------------------------------------------------------------------------- Tabellen */
const fuss = (g: GewichtAbdruck | Gewicht, e: UmfrageErgebnis): string => umfrageFuss(g, { n: e.gewicht?.n ?? e.n, kishNeff: e.gewicht?.kishNeff ?? 0 }, e.entwurf?.deff);
/** Die Tabellen des Blattes. Zahlen mit Punkt (die Ausgabe wandelt in das Dezimalzeichen der Sprache). */
export function tabellenDesignB(db: DesignB, g: GewichtAbdruck, name: Name, wert: Wert): TableItem[] {
  const e = db.r;
  if (e.fehlerCode) return [];
  const aus: TableItem[] = [], ff = fuss(g, e);
  const kiKopf = [L('95-%-KI untere Grenze', '95% CI lower limit'), L('95-%-KI obere Grenze', '95% CI upper limit')];
  if (db.art === 'gruppen') {
    const gr = e.gruppen as UmfrageErgebnis[], gn = gruppenNamenVon(db, wert) ?? gr.map(x => String(x.code));
    aus.push(tabelle('Survey Group Means', L(`${name(db.ziel)} nach ${name(db.gruppenSpalte ?? '')}`, `${name(db.ziel)} by ${name(db.gruppenSpalte ?? '')}`), [L('Gruppe', 'Group'), 'n', 'M', 'SE', ...kiKopf],
      gr.map((x, i): Z[] => [gn[i]!, fd(x.n), fx(x.mittel), fx(x.se), fx(x.kiU), fx(x.kiO)]),
      [ff, g.entwurf
        ? L('M: gewichteter Mittelwert. SE und Intervall designbasiert (Taylor-Linearisierung, t-Verteilung mit den Freiheitsgraden des Stichprobenplans je Gruppe).', 'M: weighted mean. SE and interval design-based (Taylor linearization, t distribution with the degrees of freedom of the sampling design per group).')
        : L('M: gewichteter Mittelwert. SE und Intervall designbasiert (Taylor-Linearisierung, t-Verteilung mit n - 1 Freiheitsgraden je Gruppe).', 'M: weighted mean. SE and interval design-based (Taylor linearization, t distribution with n - 1 degrees of freedom per group).')]));
    const t = e.test;
    if (t.art === 't') aus.push(tabelle('Survey Group Test', L('Vergleich der beiden Gruppen (designbasierter t-Test)', 'Comparison of the two groups (design-based t test)'), [L('Vergleich', 'Comparison'), L('Differenz', 'Difference'), 'SE', 't', 'df', 'p', ...kiKopf],
      [[`${gn[0]} − ${gn[1]}`, fx(t.diff), fx(t.se), fx(t.t), fd(t.df), fp(t.p), fx(t.kiU), fx(t.kiO)]],
      [L('Differenz: Mittelwert der ersten minus Mittelwert der zweiten Gruppe.', 'Difference: mean of the first group minus mean of the second group.'), ff]));
    else aus.push(tabelle('Survey Group Test', L('Vergleich aller Gruppen (designbasierter Wald-Test)', 'Comparison of all groups (design-based Wald test)'), [L('Test', 'Test'), 'F', 'df1', 'df2', 'p'],
      [[L('Alle Gruppen', 'All groups'), fx(t.f), fd(t.ndf), fd(t.ddf), fp(t.p)]],
      [L('Der Test prüft nur, ob sich irgendwelche der Gruppen unterscheiden; Paarvergleiche gibt es mit einem Umfragegewicht nicht.', 'The test only checks whether any of the groups differ; with a survey weight there are no pairwise comparisons.'), ff]));
    return aus;
  }
  const koefs = e.koef as UmfrageErgebnis[], terme = db.koefTerme ?? [], logistisch = typeof e.ereignisse === 'number';
  const kopf = [L('Koeffizient', 'Coefficient'), 'b', 'SE', 't', 'df', 'p', ...kiKopf, ...(logistisch ? ['OR', L('OR 95-%-KI untere Grenze', 'OR 95% CI lower limit'), L('OR 95-%-KI obere Grenze', 'OR 95% CI upper limit')] : [])];
  aus.push(tabelle('Survey Regression Coefficients', logistisch ? L('Logistische Regression mit Umfragegewicht', 'Logistic regression with survey weight') : L('Lineare Regression mit Umfragegewicht', 'Linear regression with survey weight'), kopf,
    koefs.map((k, i): Z[] => [koefName(terme[i] ?? null, name, wert), fx(k.b, 3), fx(k.se, 3), fx(k.t), fd(e.df), fp(k.p), fx(k.kiU, 3), fx(k.kiO, 3), ...(logistisch ? [fx(k.or, 3), fx(k.orU, 3), fx(k.orO, 3)] : [])]),
    [logistisch
      ? (g.entwurf ? L('b: Logit-Koeffizient (quasibinomial gewichtet); OR = exp(b). Standardfehler designbasiert (Sandwich-Schätzer), t-Verteilung mit den Freiheitsgraden des Stichprobenplans minus Zahl der Koeffizienten.', 'b: logit coefficient (quasibinomial, weighted); OR = exp(b). Standard errors design-based (sandwich estimator), t distribution with the degrees of freedom of the sampling design minus the number of coefficients.')
        : L('b: Logit-Koeffizient (quasibinomial gewichtet); OR = exp(b). Standardfehler designbasiert (Sandwich-Schätzer), t-Verteilung mit n - Zahl der Koeffizienten Freiheitsgraden.', 'b: logit coefficient (quasibinomial, weighted); OR = exp(b). Standard errors design-based (sandwich estimator), t distribution with n - number of coefficients degrees of freedom.'))
      : (g.entwurf ? L('b: gewichteter Regressionskoeffizient. Standardfehler designbasiert (Sandwich-Schätzer), t-Verteilung mit den Freiheitsgraden des Stichprobenplans minus Zahl der Koeffizienten. Standardisierte Koeffizienten gibt es mit einem Umfragegewicht nicht.', 'b: weighted regression coefficient. Standard errors design-based (sandwich estimator), t distribution with the degrees of freedom of the sampling design minus the number of coefficients. There are no standardized coefficients with a survey weight.')
        : L('b: gewichteter Regressionskoeffizient. Standardfehler designbasiert (Sandwich-Schätzer), t-Verteilung mit n - Zahl der Koeffizienten Freiheitsgraden. Standardisierte Koeffizienten gibt es mit einem Umfragegewicht nicht.', 'b: weighted regression coefficient. Standard errors design-based (sandwich estimator), t distribution with n - number of coefficients degrees of freedom. There are no standardized coefficients with a survey weight.')), ff]));
  aus.push(tabelle('Survey Regression Model', L('Modell als Ganzes (designbasierter Wald-Test)', 'Model as a whole (design-based Wald test)'),
    logistisch ? ['n', L('Ereignisse', 'Events'), 'F', 'df1', 'df2', 'p'] : ['n', L('R² (gewichtet, beschreibend)', 'R² (weighted, descriptive)'), 'F', 'df1', 'df2', 'p'],
    [[fd(e.n), logistisch ? fd(e.ereignisse) : fo(e.r2Gewichtet), fx(e.gesamt.f), fd(e.gesamt.ndf), fd(e.gesamt.ddf), fp(e.gesamt.p)]],
    [logistisch ? L('Ereignisse sind Zeilen der Auswertung, nicht hochgerechnet. Pseudo-R² gibt es mit einem Umfragegewicht nicht.', 'Events are rows of the analysis, not scaled up. There is no pseudo R² with a survey weight.')
      : L('Das gewichtete R² ist eine beschreibende Zahl, ohne Test und ohne korrigierte Fassung.', 'The weighted R² is a descriptive number, without a test and without an adjusted version.'), ff]));
  return aus;
}

/** Der Satz in der Prüfliste: ROC-Kurve und AUC entfallen bei der logistischen Regression mit Umfragegewicht (survey rechnet sie nicht). */
export const rocEntfaelltSatz = (): string => L(
  'ROC-Kurve und AUC fehlen im Ergebnis: Mit einem Umfragegewicht rechnet Statable sie nicht. Die Regression selbst mit Standardfehlern und Odds Ratios ist da.',
  'The ROC curve and AUC are missing from the result: with a survey weight Statable does not calculate them. The regression itself with standard errors and odds ratios is there.');
