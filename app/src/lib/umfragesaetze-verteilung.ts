/**
 * Später S-D2, Bauer A2: die Sätze (APA) der Umfrage-Rechnung für die Karte Verteilung (Mittelwert mit Test gegen einen Wert, Anteil) und die Kreuztabelle (Rao-Scott).
 * `umfrageSatz` in lib/umfrage.ts reicht diese drei Arten hierher; die Sätze von Gruppen und Regression baut Bauer B.
 * Ganze Sätze je Fall (übersetzbar, nie Wörter per ${}); Zahlen über komma/ohneNull/pWert und das Sprachprofil. n ist immer die Zahl der Fälle (Zeilen), nie Σw.
 * Fachblatt docs/fachblaetter/SPAETER-D2-UMFRAGEGEWICHTE.md 1.5, 2.5, 3.5, 3.6 und „Entscheidungen Opus (17.10.)“ 2 und 3: Logit-Intervall als Voreinstellung, Korn-Graubard unter „Weitere Wege“,
 * Rao-Scott F zweiter Ordnung als Kopfzeile, χ² erster Ordnung nur im Detail, Pearson-χ² nie.
 */
import { L } from './sitzung.svelte';
import { komma, pWert } from './ergebnis';
import { iv, profil, proz } from '../i18n/profil';
import { anteilGrenzeSatz, hinweisSatz, umfrageFehlerSatz, umfrageFuss, umfrageHinweise, type UmfrageArt, type UmfrageErgebnis, type UmfrageSatz, type UmfrageSatzKontext } from './umfrage';

type Z = Record<string, any>;   // eslint-disable-line @typescript-eslint/no-explicit-any
const SIG = 0.05;
/** Ganze Zahl ohne, sonst mit zwei Nachkommastellen (Freiheitsgrade: 199 oder 1,89). */
const dfText = (v: number) => komma(v, Number.isInteger(v) ? 0 : 2);
/** F(Zähler; Nenner): immer mit Semikolon (Dezimalkomma und Punkt gleich), auch wenn beide ganz sind; Französisch mit schmalem Leerzeichen davor. */
const fKlammer = (a: number, b: number) => `(${dfText(a)}${profil().vorSemikolon ?? ''}; ${dfText(b)})`;
/** Prozent mit dem Zeichen des Sprachprofils; ein geschütztes Leerzeichen davor wird zu einem gewöhnlichen (die Sätze stehen in Fließtext und Zellen, wo kein Umbruchschutz nötig ist). */
const prozent = (anteil: number) => proz(komma(100 * anteil, 1));   // geschütztes Leerzeichen aus dem Profil bleibt
const ki95 = (u: number, o: number, stellen = 2, mal = 1) => `${L('95-%-KI', '95% CI')} ${iv(komma(mal * u, stellen), komma(mal * o, stellen))}`;

/** Der Satz zu einem Ergebnis der Arten `mittel`, `anteil` und `kreuz`. Die Arten `gruppen` und `regression` gehören Bauer B. */
export function umfrageSatzVerteilung(art: UmfrageArt, e: UmfrageErgebnis, ctx: UmfrageSatzKontext): UmfrageSatz {
  if (art === 'mittel') return satzMittel(e, ctx);
  if (art === 'anteil') return satzAnteil(e, ctx);
  return satzKreuz(e, ctx);
}
const fehlerSatz = (e: Z): UmfrageSatz => ({ haupt: umfrageFehlerSatz(e as { fehlerCode?: string }), detail: '', fuss: '', hinweise: [] });
const hinweiseVon = (art: UmfrageArt, e: Z, weg: string[] = []) => umfrageHinweise(art, e).filter(c => !weg.includes(c)).map(c => hinweisSatz(c, e));

/* ---------------------------------------------------------------------------------------------------------------------------------- Mittelwert */
function satzMittel(e: UmfrageErgebnis, ctx: UmfrageSatzKontext): UmfrageSatz {
  const r: Z | undefined = e.ergebnisse?.[ctx.index ?? 0];
  if (e.fehlerCode) return fehlerSatz(e);
  if (!r || r.fehlerCode) return fehlerSatz(r ?? { fehlerCode: 'unbekannt' });
  const g: Z = r.gewicht, name = ctx.name, n = r.n, plan = !!ctx.gewicht.entwurf && typeof r.deffSurvey === 'number', neff = komma(plan ? n / r.deffSurvey : g.kishNeff, 1), m = komma(r.mittel), se = komma(r.se);   // mit Stichprobenplan ist die effektive Stichprobengröße n/deff (Kish gilt dort nicht)
  let haupt: string;
  if (r.konstant) {
    haupt = L(`Gewichtet hatten alle Fälle bei ${name} denselben Wert (M = ${m}; SE = 0, kein Intervall sinnvoll; n = ${n}, effektive Stichprobengröße ${neff}).`,
      `Weighted, all cases had the same value for ${name} (M = ${m}; SE = 0, no interval makes sense; n = ${n}, effective sample size ${neff}).`);
  } else {
    const k = ki95(r.kiU, r.kiO);
    haupt = L(`Gewichtet betrug der Mittelwert von ${name} M = ${m} (SE = ${se}; ${k}; n = ${n}, effektive Stichprobengröße ${neff}).`,
      `Weighted, the mean of ${name} was M = ${m} (SE = ${se}; ${k}; n = ${n}, effective sample size ${neff}).`);
    if (r.test) haupt += ' ' + testSatz(r.test);
  }
  const detail = plan
    ? L(`Designeffekt der Schätzung (deff) ${komma(r.deffSurvey)}. Gewichte: kleinstes ${komma(g.wMin)}, größtes ${komma(g.wMax)} (Verhältnis ${komma(g.wMax / g.wMin, 1)}).`, `Design effect of the estimate (deff) ${komma(r.deffSurvey)}. Weights: smallest ${komma(g.wMin)}, largest ${komma(g.wMax)} (ratio ${komma(g.wMax / g.wMin, 1)}).`)
    : r.deffSurvey === null || r.deffSurvey === undefined
    ? L(`Designeffekt der Gewichte (Kish) ${komma(g.deffW)}. Gewichte: kleinstes ${komma(g.wMin)}, größtes ${komma(g.wMax)} (Verhältnis ${komma(g.wMax / g.wMin, 1)}).`, `Design effect of the weights (Kish) ${komma(g.deffW)}. Weights: smallest ${komma(g.wMin)}, largest ${komma(g.wMax)} (ratio ${komma(g.wMax / g.wMin, 1)}).`)
    : L(`Designeffekt der Gewichte (Kish) ${komma(g.deffW)}; Designeffekt der Schätzung (survey) ${komma(r.deffSurvey)}. Gewichte: kleinstes ${komma(g.wMin)}, größtes ${komma(g.wMax)} (Verhältnis ${komma(g.wMax / g.wMin, 1)}).`,
      `Design effect of the weights (Kish) ${komma(g.deffW)}; design effect of the estimate (survey) ${komma(r.deffSurvey)}. Weights: smallest ${komma(g.wMin)}, largest ${komma(g.wMax)} (ratio ${komma(g.wMax / g.wMin, 1)}).`);
  return { haupt, detail, fuss: umfrageFuss(ctx.gewicht, { n: g.n, kishNeff: g.kishNeff }, r.deffSurvey), hinweise: hinweiseVon('mittel', { ergebnisse: [r], ...(e.entwurf ? { entwurf: { ...e.entwurf, deff: r.deffSurvey } } : {}) }) };
}
/** Test gegen einen Wert (zweiseitig, t mit n − 1): vier ganze Sätze (signifikant oder nicht, darüber oder darunter). */
function testSatz(t: Z): string {
  const mu = komma(t.mu0, Number.isInteger(t.mu0) ? 0 : 2), tt = komma(t.t), df = t.df, p = pWert(t.p), sig = t.p < SIG, ueber = t.diff >= 0;
  if (sig) return ueber
    ? L(`Er lag signifikant über ${mu}, t(${df}) = ${tt}, p ${p}.`, `It was significantly above ${mu}, t(${df}) = ${tt}, p ${p}.`)
    : L(`Er lag signifikant unter ${mu}, t(${df}) = ${tt}, p ${p}.`, `It was significantly below ${mu}, t(${df}) = ${tt}, p ${p}.`);
  return ueber
    ? L(`Er lag nicht signifikant über ${mu}, t(${df}) = ${tt}, p ${p}.`, `It was not significantly above ${mu}, t(${df}) = ${tt}, p ${p}.`)
    : L(`Er lag nicht signifikant unter ${mu}, t(${df}) = ${tt}, p ${p}.`, `It was not significantly below ${mu}, t(${df}) = ${tt}, p ${p}.`);
}

/* ---------------------------------------------------------------------------------------------------------------------------------- Anteil */
function satzAnteil(e: UmfrageErgebnis, ctx: UmfrageSatzKontext): UmfrageSatz {
  if (e.fehlerCode) return fehlerSatz(e);
  const k: Z | undefined = e.kategorien?.[ctx.index ?? 0];
  if (!k) return fehlerSatz({ fehlerCode: 'unbekannt' });
  const g: Z = e.gewicht, name = ctx.name, n = e.n, neff = komma(ctx.gewicht.entwurf && typeof k.deff === 'number' ? n / k.deff : g.kishNeff, 1), p = prozent(k.p), beta = ctx.methode === 'beta';
  let haupt: string;
  if (k.grenze || !(beta ? k.beta : k.logit)) {
    haupt = L(`Gewichtet lag der Anteil ${name} bei ${p} (n = ${n}, effektive Stichprobengröße ${neff}). `, `Weighted, the proportion ${name} was ${p} (n = ${n}, effective sample size ${neff}). `) + anteilGrenzeSatz(k.p);
  } else {
    const w = beta ? k.beta : k.logit, ki = `${L('95-%-KI', '95% CI')} ${iv(komma(100 * w.u, 1), komma(100 * w.o, 1))}`;
    haupt = beta
      ? L(`Gewichtet lag der Anteil ${name} bei ${p} (${ki}; Intervall nach Korn-Graubard; n = ${n}, effektive Stichprobengröße ${neff}).`, `Weighted, the proportion ${name} was ${p} (${ki}; Korn-Graubard interval; n = ${n}, effective sample size ${neff}).`)
      : L(`Gewichtet lag der Anteil ${name} bei ${p} (${ki}; Logit-Intervall; n = ${n}, effektive Stichprobengröße ${neff}).`, `Weighted, the proportion ${name} was ${p} (${ki}; logit interval; n = ${n}, effective sample size ${neff}).`);
  }
  const detail = k.grenze ? ''
    : L(`Standardfehler des Anteils ${komma(100 * k.se, 1)} Prozentpunkte; ${k.treffer} von ${n} Fällen in dieser Kategorie.`, `Standard error of the proportion ${komma(100 * k.se, 1)} percentage points; ${k.treffer} of ${n} cases in this category.`);
  return { haupt, detail, fuss: umfrageFuss(ctx.gewicht, { n: g.n, kishNeff: g.kishNeff }, k.deff), hinweise: hinweiseVon('anteil', { n, df: e.df, kategorien: [k], gewicht: g, ...(e.entwurf ? { entwurf: { ...e.entwurf, deff: k.deff } } : {}) }, beta ? ['wenige-faelle'] : []) };
}

/* ---------------------------------------------------------------------------------------------------------------------------------- Kreuztabelle */
function satzKreuz(e: UmfrageErgebnis, ctx: UmfrageSatzKontext): UmfrageSatz {
  if (e.fehlerCode) return fehlerSatz(e);
  const g: Z = e.gewicht, name = ctx.name, n = e.n, f = `F${fKlammer(e.ndf, e.ddf)} = ${komma(e.f)}`, p = pWert(e.pF), sig = e.pF < SIG;
  const haupt = sig
    ? L(`Der Zusammenhang zwischen ${name} ist statistisch signifikant, ${f}, p ${p} (Rao-Scott-korrigierter Pearson-Test für gewichtete Daten, n = ${n}).`,
      `The association between ${name} is statistically significant, ${f}, p ${p} (Rao-Scott corrected Pearson test for weighted data, n = ${n}).`)
    : L(`Der Zusammenhang zwischen ${name} ist statistisch nicht signifikant, ${f}, p ${p} (Rao-Scott-korrigierter Pearson-Test für gewichtete Daten, n = ${n}).`,
      `The association between ${name} is not statistically significant, ${f}, p ${p} (Rao-Scott corrected Pearson test for weighted data, n = ${n}).`);
  const chi = `χ² = ${komma(e.chi2Rs1)}, df = ${komma(e.dfChi2, 0)}, p ${pWert(e.pChi2)}`;
  const ganz = Number.isInteger(e.ndf) && Number.isInteger(e.ddf);   // „nicht ganzzahlig“ nur, wenn es stimmt (2 × 2: Zähler 1, Nenner n − 1)
  const bruch = ganz ? '' : ' ' + L('Die Freiheitsgrade des F-Tests sind nicht ganzzahlig; das ist richtig und kein Anzeigefehler.', 'The degrees of freedom of the F test are not whole numbers; that is correct and not a display error.');
  const detail = (e.deltaMittel === null || e.deltaMittel === undefined
    ? L(`Rao-Scott erster Ordnung: ${chi}.`, `Rao-Scott first order: ${chi}.`)
    : L(`Rao-Scott erster Ordnung: ${chi}; mittlerer Designeffekt der Tabelle ${komma(e.deltaMittel)}.`, `Rao-Scott first order: ${chi}; mean design effect of the table ${komma(e.deltaMittel)}.`)) + bruch;
  return { haupt, detail, fuss: umfrageFuss(ctx.gewicht, { n: g.n, kishNeff: g.kishNeff }, e.entwurf?.deff), hinweise: hinweiseVon('kreuz', e) };
}
