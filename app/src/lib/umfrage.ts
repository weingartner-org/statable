/**
 * Umfragegewichte mit dem R-Paket survey (Später, Welle S-D2): die reinen Hilfen, die alle Karten gemeinsam brauchen - Grenzen, Freiheitsgrade, Intervall, Kish je Frage,
 * Hinweise, die R-Antwort lesen, Fehlersätze, Fußzeile, Methodensatz, Selbstprüfung. Gebaut vom Bauer A1 (Fundament); getestet in lib/umfrage.test.ts (Vertrag im Kopf dieser Datei).
 * Die Zahlen selbst kommen aus webR (engine/statable-umfrage.R, Aufruf über lib/rverfahren.svelte.ts mit R_PAKETE_UMFRAGE). Hier steht keine Rechnung außer Kish und t-Intervall.
 *
 * NOCH NICHT HIER (Bauer A2 und B): `umfrageSatz` - die Sätze (APA) je Art. Die Funktion ist da, damit alles übersetzt, und wirft, bis die Karte ihren Satz gebaut hat.
 *
 * Fachblatt docs/fachblaetter/SPAETER-D2-UMFRAGEGEWICHTE.md, Abschnitt 0 und „Entscheidungen Opus (17.10.)“: n in Sätzen = Zeilen, nie Σw; t-Quantile mit den Freiheitsgraden der Fälle
 * der Teilpopulation minus Zahl der Parameter; Warnschwellen sind Faustregeln ohne Quelle und der Satz sagt es.
 */
import { L, Lp, d, s } from './sitzung.svelte';
import { entwurfWerte } from './umfrageentwurf';
import { komma } from './ergebnis';
import { proz } from '../i18n/profil';
import { tQuantil } from './verteilung';
import { designMethodenTeil, entwurfWorte, type Gewicht } from './gewichte';
import { umfrageSatzVerteilung } from './umfragesaetze-verteilung';   // Bauer A2 (zyklisch: die Sätze nutzen hinweisSatz u. a. von hier, nur beim Aufruf)
import { umfrageSatzGr } from './umfrage-gr';

export type UmfrageArt = 'mittel' | 'anteil' | 'kreuz' | 'gruppen' | 'regression' | 'total' | 'kalibrieren';
export type UmfrageFehlerCode =
  | 'zu-wenig' | 'zu-wenig-gruppen' | 'gruppe-klein' | 'gruppe-leer' | 'konstant' | 'eine-stufe' | 'eine-kategorie' | 'rangmangel' | 'trennung'
  | 'zu-viele-zeilen' | 'zu-viele-zellen' | 'zu-viele-praediktoren' | 'gewicht-negativ' | 'gewicht-fehlt' | 'auswahl-passt-nicht' | 'unbekannt'
  | 'entwurf-ungueltig' | 'entwurf-luecken' | 'entwurf-zu-wenig-klumpen' | 'entwurf-fpc-klein' | 'entwurf-fpc-uneinheitlich' | 'einsamer-klumpen';
export type UmfrageHinweis = 'ungleiche-gewichte' | 'kleine-stichprobe' | 'kleine-gruppe' | 'wenige-faelle' | 'leere-zelle' | 'duenne-tabelle' | 'wenige-pro-praediktor' | 'wenige-ereignisse' | 'plan-varianz' | 'wenige-freiheitsgrade';

/** Das Ergebnis einer R-Antwort, gelesen: camelCase-Schlüssel, Skalare statt Vektoren der Länge 1, `null` statt {type:'null'}. Felder sind je Art verschieden (siehe Vertrag in lib/umfrage.test.ts). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type UmfrageErgebnis = Record<string, any>;

/* ---------------------------------------------------------------------------------------------------------------------------------- Grenzen */
/** Entscheidung Opus 7: mehr Zeilen rechnet die Umfragerechnung im Browser nicht; Kreuztabellen bis 400 Zellen. Dieselben Zahlen stehen in engine/statable-umfrage.R. */
export const UMFRAGE_MAX_ZEILEN = 200000, UMFRAGE_MAX_ZELLEN = 400;
/** Welche Grenze reißt? Die Zeilen werden zuerst geprüft. `null` = alles in Ordnung. */
export function umfrageGrenze(zeilen: number, zellen?: number): 'zu-viele-zeilen' | 'zu-viele-zellen' | null {
  if (zeilen > UMFRAGE_MAX_ZEILEN) return 'zu-viele-zeilen';
  if (zellen !== undefined && zellen > UMFRAGE_MAX_ZELLEN) return 'zu-viele-zellen';
  return null;
}

/* ---------------------------------------------------------------------------------------------------------------------------------- Freiheitsgrade */
const nichtNegativ = (x: number) => Math.max(0, x);
/** Entscheidung Opus 5: t-Quantile mit df = Fälle der Teilpopulation − Zahl der Parameter. `n` = Fälle (Zeilen), nie Σw. */
export const umfrageDf = {
  /** Mittelwert und Anteil: n − 1 */ mittel: (n: number) => nichtNegativ(n - 1),
  /** Test gegen einen Wert: n − 1 (survey rechnet n − 2; Statable folgt dem Mittelwert-Intervall) */ einstichprobe: (n: number) => nichtNegativ(n - 1),
  /** t-Test, zwei Gruppen: n − 2 */ zweiGruppen: (n: number) => nichtNegativ(n - 2),
  /** Wald-F bei k Gruppen: Nenner n − k */ gruppenWald: (n: number, k: number) => nichtNegativ(n - k),
  /** Regression mit `npar` Koeffizienten (mit Konstante): n − npar */ regression: (n: number, npar: number) => nichtNegativ(n - npar),
  /** Rao-Scott: Nenner = Spielraum × (n − 1); hier die Freiheitsgrade des Designs: n − 1 */ raoScott: (n: number) => nichtNegativ(n - 1)
};

/* ---------------------------------------------------------------------------------------------------------------------------------- Intervall */
/** t-Intervall (nie z): Schätzer ± t(1 − α/2; df) · SE. SE 0 gibt ein Intervall der Breite 0. */
export function ki(schaetzer: number, se: number, df: number, niveau = 0.95): { u: number; o: number } {
  if (!(se > 0) || !(df > 0)) return { u: schaetzer, o: schaetzer };
  const t = tQuantil(1 - (1 - niveau) / 2, df);
  return { u: schaetzer - t * se, o: schaetzer + t * se };
}

/* ---------------------------------------------------------------------------------------------------------------------------------- Gewichte je Frage */
export interface GewichtKennzahlen { n: number; kishNeff: number; designeffektW: number; wMin: number; wMax: number; verhaeltnis: number }
/** Kish und Designeffekt der Gewichte auf den Fällen EINER Frage (`ok`: Fälle, die zählen; ohne Angabe alle). Gewicht 0, fehlend und nicht endlich zählen nicht (Zeilenregel). */
export function gewichtKennzahlen(w: (number | null | undefined)[], ok?: boolean[]): GewichtKennzahlen {
  const g: number[] = [];
  w.forEach((x, i) => { if (typeof x === 'number' && Number.isFinite(x) && x > 0 && (!ok || ok[i])) g.push(x); });
  if (!g.length) return { n: 0, kishNeff: 0, designeffektW: 0, wMin: 0, wMax: 0, verhaeltnis: 0 };
  let s = 0, q = 0, mn = Infinity, mx = -Infinity;
  for (const x of g) { s += x; q += x * x; if (x < mn) mn = x; if (x > mx) mx = x; }
  const neff = (s * s) / q;
  return { n: g.length, kishNeff: neff, designeffektW: g.length / neff, wMin: mn, wMax: mx, verhaeltnis: mx / mn };
}

/* ---------------------------------------------------------------------------------------------------------------------------------- R-Antwort lesen */
const camel = (k: string) => k.replace(/_([a-z0-9])/g, (_m, c: string) => c.toUpperCase());
const istNull = (x: unknown) => x === null || x === undefined || (typeof x === 'object' && !Array.isArray(x) && (x as { type?: unknown }).type === 'null');
/** webR liefert Skalare als Vektoren der Länge 1 (und NULL als {type:'null'}). Lesen: Vektor der Länge 1 aus einfachen Werten → Wert; Listen von Zeilen und Texte unter `warnungen` bleiben Listen. */
function lies(x: unknown, schluessel = ''): unknown {
  if (istNull(x)) return null;
  if (Array.isArray(x)) {
    if (schluessel === 'warnungen') return x.map(v => lies(v));
    if (x.length === 1 && (x[0] === null || typeof x[0] !== 'object')) return x[0];
    return x.map(v => lies(v));
  }
  if (typeof x === 'object') return Object.fromEntries(Object.entries(x as Record<string, unknown>).map(([k, v]) => [camel(k), lies(v, k)]));
  return x;
}
/** Die Antwort einer R-Funktion `sp_umfrage_<art>` als gelesenes Ergebnis. `art` bleibt für die Typen der Karten (die Form ist für alle Arten dieselbe). */
export function umfrageLesen(_art: UmfrageArt, antwort: unknown): UmfrageErgebnis {
  return lies(antwort) as UmfrageErgebnis;
}

/* ---------------------------------------------------------------------------------------------------------------------------------- Hinweise (Entscheidung Opus 6: Faustregeln ohne Quelle) */
const gewichtVon = (e: UmfrageErgebnis): UmfrageErgebnis | undefined => e.gewicht ?? (Array.isArray(e.ergebnisse) ? e.ergebnisse.find((r: UmfrageErgebnis) => r?.gewicht)?.gewicht : undefined);
const anzahlVon = (e: UmfrageErgebnis): number | undefined => (typeof e.n === 'number' ? e.n : Array.isArray(e.ergebnisse) ? e.ergebnisse[0]?.n : undefined);
/** Die Hinweise zu einem Ergebnis, als Codes (Sätze: `hinweisSatz`). Ein Fehler-Ergebnis hat keine Hinweise. */
export function umfrageHinweise(art: UmfrageArt, e: UmfrageErgebnis): UmfrageHinweis[] {
  if (!e || e.fehlerCode) return [];
  const aus: UmfrageHinweis[] = [];
  const pruefeGewichte = (g: UmfrageErgebnis | undefined, n: number | undefined) => {
    if (!g || n === undefined) return;
    const nn = typeof g.n === 'number' ? g.n : n;
    if (((!e.entwurf && g.kishNeff / nn < 0.5) || g.wMax / g.wMin > 10) && !aus.includes('ungleiche-gewichte')) aus.push('ungleiche-gewichte');   // Kish gilt nur für einzeln gezogene Personen: mit Stichprobenplan zählt nur das Verhältnis
    if (nn < 30 && !aus.includes('kleine-stichprobe')) aus.push('kleine-stichprobe');
  };
  if (art === 'mittel' && Array.isArray(e.ergebnisse)) for (const r of e.ergebnisse as UmfrageErgebnis[]) pruefeGewichte(r.gewicht, r.n);
  else pruefeGewichte(gewichtVon(e), anzahlVon(e));
  if (art === 'gruppen' && Array.isArray(e.gruppen) && e.gruppen.some((g: UmfrageErgebnis) => g.n < 10)) aus.push('kleine-gruppe');
  if (art === 'anteil' && Array.isArray(e.kategorien) && e.kategorien.some((k: UmfrageErgebnis) => !k.grenze && Math.min(k.treffer, e.n - k.treffer) < 10)) aus.push('wenige-faelle');
  if (art === 'kreuz' && e.zellen) {
    if (e.zellen.leer > 0) aus.push('leere-zelle');
    if (e.zellen.duennAnteil > 0.2) aus.push('duenne-tabelle');
  }
  if (art === 'regression' && typeof e.n === 'number' && typeof e.npar === 'number') {
    const praed = Math.max(e.npar - 1, 1);
    if (e.n < 10 * praed) aus.push('wenige-pro-praediktor');
    if (typeof e.ereignisse === 'number' && Math.min(e.ereignisse, e.n - e.ereignisse) < 10 * praed) aus.push('wenige-ereignisse');
  }
  if (e.entwurf) {   // Abschnitt 6, Teil A: Stichprobenplan
    if (e.entwurf.klumpen) aus.push('plan-varianz');
    const df = planDf(e);
    if (df !== undefined && df < 20) aus.push('wenige-freiheitsgrade');
  }
  return aus;
}
/** Die kleinsten Freiheitsgrade eines Ergebnisses mit Stichprobenplan. */
const planDf = (e?: UmfrageErgebnis): number | undefined => {
  if (!e) return undefined;
  const dfs = [e.df, e.test?.df, e.entwurf?.df, ...(Array.isArray(e.ergebnisse) ? e.ergebnisse.map((r: UmfrageErgebnis) => r?.df) : []), ...(Array.isArray(e.gruppen) ? e.gruppen.map((g: UmfrageErgebnis) => g?.df) : [])].filter((x): x is number => typeof x === 'number' && Number.isFinite(x));
  return dfs.length ? Math.min(...dfs) : undefined;
};
/** Wie viele Parameter die Freiheitsgrade der Rechnung abziehen (n − k): 1 bei Mittelwert, Anteil und Tabelle, 2 beim t-Test zweier Gruppen, k beim Wald-Test von k Gruppen, die Zahl der Koeffizienten bei der Regression. */
const dfAbzug = (e?: UmfrageErgebnis): number => (e && typeof e.npar === 'number' ? e.npar : e?.test?.art === 't' ? 2 : e?.test?.art === 'wald-f' && typeof e.k === 'number' ? e.k : 1);
const FAUSTREGEL = () => L(' Das ist eine Faustregel ohne feste Quelle.', ' This is a rule of thumb without a fixed source.');
/** Der Satz zu einem Hinweis. `e` (gelesenes Ergebnis) liefert die Zahlen, wo der Satz welche nennt; ohne `e` steht ein allgemeiner Satz ohne Zahlen. */
export function hinweisSatz(code: UmfrageHinweis, e?: UmfrageErgebnis): string {
  const g = e ? gewichtVon(e) : undefined;
  switch (code) {
    case 'ungleiche-gewichte': {
      if (g && e && e.entwurf) {
        return L(`Die Gewichte sind sehr ungleich (größtes durch kleinstes = ${komma(g.wMax / g.wMin, 1)}). Die Intervalle rechnen mit den Freiheitsgraden des Stichprobenplans und können zu schmal sein.`,
          `The weights are very unequal (largest divided by smallest = ${komma(g.wMax / g.wMin, 1)}). The intervals use the degrees of freedom of the sampling design and can be too narrow.`) + FAUSTREGEL();
      }
      if (g && e) {
        const verhaeltnis = komma(g.wMax / g.wMin, 1), neff = komma(g.kishNeff, 1), n = g.n ?? anzahlVon(e);
        const k = dfAbzug(e);
        return L(`Die Gewichte sind sehr ungleich (größtes durch kleinstes = ${verhaeltnis}; effektive Stichprobengröße ${neff} von ${n}). Die Intervalle rechnen mit n - ${k} Freiheitsgraden und können zu schmal sein.`,
          `The weights are very unequal (largest divided by smallest = ${verhaeltnis}; effective sample size ${neff} of ${n}). The intervals use n - ${k} degrees of freedom and can be too narrow.`) + FAUSTREGEL();
      }
      return L('Die Gewichte sind sehr ungleich. Die Intervalle rechnen mit n - 1 Freiheitsgraden und können zu schmal sein.', 'The weights are very unequal. The intervals use n - 1 degrees of freedom and can be too narrow.') + FAUSTREGEL();
    }
    case 'kleine-stichprobe': {
      const n = g?.n ?? (e ? anzahlVon(e) : undefined);
      return (n !== undefined ? L(`Kleine Stichprobe (n = ${n}): Intervalle und p-Werte sind Näherungen.`, `Small sample (n = ${n}): intervals and p values are approximations.`) : L('Kleine Stichprobe (weniger als 30 Fälle): Intervalle und p-Werte sind Näherungen.', 'Small sample (fewer than 30 cases): intervals and p values are approximations.')) + FAUSTREGEL();
    }
    case 'plan-varianz': {
      const f = e?.entwurf?.deff;
      return typeof f === 'number' && Number.isFinite(f)
        ? L(`Der Stichprobenplan vergrößert hier die Varianz um den Faktor ${komma(f)} (Designeffekt, deff). Die effektive Stichprobengröße ist n/deff. Rechnet man mit einzeln gezogenen Personen, werden die Intervalle viel zu schmal.`,
          `The sampling design increases the variance here by a factor of ${komma(f)} (design effect, deff). The effective sample size is n/deff. Calculating as if people were drawn individually makes the intervals far too narrow.`)
        : L('Die Klumpen vergrößern hier die Varianz gegenüber einzeln gezogenen Personen. Rechnet man mit einzeln gezogenen Personen, werden die Intervalle viel zu schmal.',
          'The clusters increase the variance here compared with people drawn individually. Calculating as if people were drawn individually makes the intervals far too narrow.');
    }
    case 'wenige-freiheitsgrade': {
      const df = planDf(e);
      return (df !== undefined ? L(`Der Stichprobenplan hat nur ${komma(df, 0)} Freiheitsgrade (Klumpen minus Schichten). Intervalle und Tests sind dann breit, und die Näherung ist schwächer.`, `The sampling design has only ${komma(df, 0)} degrees of freedom (clusters minus strata). Intervals and tests are then wide, and the approximation is weaker.`)
        : L('Der Stichprobenplan hat weniger als 20 Freiheitsgrade (Klumpen minus Schichten). Intervalle und Tests sind dann breit, und die Näherung ist schwächer.', 'The sampling design has fewer than 20 degrees of freedom (clusters minus strata). Intervals and tests are then wide, and the approximation is weaker.')) + FAUSTREGEL();
    }
    case 'kleine-gruppe': return L('Mindestens eine Gruppe hat weniger als 10 Fälle: Das Intervall dieser Gruppe und der Vergleich sind unsicher.', 'At least one group has fewer than 10 cases: the interval of this group and the comparison are uncertain.') + FAUSTREGEL();
    case 'wenige-faelle': return L('Auf der kleineren Seite stehen weniger als 10 Fälle. Das Logit-Intervall ist dann ungenau; das Intervall nach Korn-Graubard ist die bessere Wahl (unter „Weitere Wege“).', 'Fewer than 10 cases are on the smaller side. The logit interval is then imprecise; the Korn-Graubard interval is the better choice (under "More options").');
    case 'leere-zelle': return L('Mindestens eine Zelle der Tabelle ist leer. Der Test rechnet trotzdem; bei leeren Zellen ist er weniger zuverlässig.', 'At least one cell of the table is empty. The test still calculates; with empty cells it is less reliable.');
    case 'duenne-tabelle': return L(`Mehr als ${proz('20')} der Zellen sind sehr dünn besetzt. Der Test ist dann weniger zuverlässig.`, `More than ${proz('20')} of the cells are very sparsely filled. The test is then less reliable.`);
    case 'wenige-pro-praediktor': return L('Weniger als 10 Fälle je Prädiktor: Die Koeffizienten sind unsicher und die Intervalle können zu schmal sein.', 'Fewer than 10 cases per predictor: the coefficients are uncertain and the intervals can be too narrow.');
    case 'wenige-ereignisse': return L('Weniger als 10 Ereignisse (oder Nicht-Ereignisse) je Prädiktor: Die Koeffizienten der logistischen Regression sind unsicher.', 'Fewer than 10 events (or non-events) per predictor: the coefficients of the logistic regression are uncertain.');
  }
}

/* ---------------------------------------------------------------------------------------------------------------------------------- Fehlersätze */
/** Der Satz zu einem Fehler der R-Rechnung (`fehlerCode`, Zahlen und Namen aus dem gelesenen Ergebnis). Ein unbekannter Code gibt einen allgemeinen Satz, nie eine Ausnahme. */
export function umfrageFehlerSatz(e: { fehlerCode?: string; [k: string]: unknown }): string {
  const n = typeof e.n === 'number' ? e.n : undefined, z = (v: number) => komma(v, 0);
  switch (e.fehlerCode as UmfrageFehlerCode) {
    case 'zu-wenig': return Lp(n ?? 0, `Es zählt nur ${n ?? 0} Fall. Für die Rechnung braucht es mindestens 2 Fälle mit gültigen Angaben.`, `Es zählen nur ${n ?? 0} Fälle. Für die Rechnung braucht es mindestens 2 Fälle mit gültigen Angaben.`,
      `Only ${n ?? 0} case counts. The calculation needs at least 2 cases with valid values.`, `Only ${n ?? 0} cases count. The calculation needs at least 2 cases with valid values.`);
    case 'zu-wenig-gruppen': return L('Für den Vergleich braucht es mindestens 2 Gruppen mit Fällen.', 'The comparison needs at least 2 groups with cases.');
    case 'gruppe-klein': return Lp(Number(e.nGruppe ?? 0), `Die Gruppe ${e.gruppe} hat nur ${e.nGruppe} Fall. Für den Vergleich braucht jede Gruppe mindestens 2 Fälle.`, `Die Gruppe ${e.gruppe} hat nur ${e.nGruppe} Fälle. Für den Vergleich braucht jede Gruppe mindestens 2 Fälle.`,
      `Group ${e.gruppe} has only ${e.nGruppe} case. For the comparison every group needs at least 2 cases.`, `Group ${e.gruppe} has only ${e.nGruppe} cases. For the comparison every group needs at least 2 cases.`);
    case 'gruppe-leer': return L(`Die Gruppe ${e.gruppe} hat keinen Fall mit gültigen Angaben. Für den Vergleich braucht jede Gruppe mindestens 2 Fälle.`, `Group ${e.gruppe} has no case with valid values. For the comparison every group needs at least 2 cases.`);
    case 'konstant': return L('Alle Werte sind gleich (konstant): Da es keine Streuung gibt, ist kein Vergleich möglich.', 'All values are the same (constant): with no variation, no comparison is possible.');
    case 'eine-stufe': return L(`Die Tabelle hat nur eine Stufe (Zeilen: ${e.zeilenstufen}, Spalten: ${e.spaltenstufen}). Für einen Test braucht es in Zeile und Spalte mindestens 2 Stufen.`, `The table has only one level (rows: ${e.zeilenstufen}, columns: ${e.spaltenstufen}). A test needs at least 2 levels in rows and columns.`);
    case 'eine-kategorie': return L('Die Zielgröße hat nur eine Kategorie. Für die Rechnung braucht es mindestens 2.', 'The outcome has only one category. The calculation needs at least 2.');
    case 'rangmangel': return d(`Die Spalte ${e.spalte} ist nicht schätzbar: Sie ist von anderen Spalten exakt abhängig. Nimm eine der abhängigen Spalten aus dem Modell.`, `Die Spalte ${e.spalte} ist nicht schätzbar: Sie ist von anderen Spalten exakt abhängig. Nehmen Sie eine der abhängigen Spalten aus dem Modell.`, `The column ${e.spalte} is not estimable: it is exactly dependent on other columns. Remove one of the dependent columns from the model.`);
    case 'trennung': return L('Die Rechnung hat nicht konvergiert. Meist trennt ein Prädiktor die beiden Gruppen vollständig oder fast vollständig.', 'The calculation did not converge. Usually a predictor separates the two groups completely or almost completely.');
    case 'zu-viele-zeilen': return L(`Zu viele Zeilen für die Umfragerechnung im Browser (${z(n ?? 0)}, höchstens ${z(UMFRAGE_MAX_ZEILEN)}).`, `Too many rows for the survey calculation in the browser (${z(n ?? 0)}, at most ${z(UMFRAGE_MAX_ZEILEN)}).`);
    case 'zu-viele-zellen': return L(`Tabelle mit ${z(Number(e.zellen ?? 0))} Zellen: nicht berechenbar (höchstens ${z(UMFRAGE_MAX_ZELLEN)}).`, `Table with ${z(Number(e.zellen ?? 0))} cells: not computable (at most ${z(UMFRAGE_MAX_ZELLEN)}).`);
    case 'zu-viele-praediktoren': return d(`Mit ${e.praediktoren} Prädiktoren bei ${n ?? 0} Fällen ist die Rechnung nicht möglich. Nimm weniger Prädiktoren.`, `Mit ${e.praediktoren} Prädiktoren bei ${n ?? 0} Fällen ist die Rechnung nicht möglich. Nehmen Sie weniger Prädiktoren.`, `With ${e.praediktoren} predictors and ${n ?? 0} cases the calculation is not possible. Use fewer predictors.`);
    case 'gewicht-negativ': return L('Das Fallgewicht hat negative Werte. Ein Fallgewicht darf nicht negativ sein.', 'The case weight has negative values. A case weight must not be negative.');
    case 'entwurf-ungueltig': return L('Der Stichprobenplan ist nicht vollständig oder passt nicht zusammen. Die zweite Stufe gilt nur mit der ersten Stufe und mit den Angaben zur Grundgesamtheit beider Stufen.', 'The sampling design is incomplete or inconsistent. The second stage only applies together with the first stage and with the population sizes of both stages.');
    case 'entwurf-luecken': {
      const was = ({ klumpen: L('zum Klumpen', 'on the cluster'), klumpen2: L('zum Klumpen der zweiten Stufe', 'on the cluster of the second stage'), schicht: L('zur Schicht', 'on the stratum'), fpc: L('zur Grundgesamtheit', 'on the population size'), fpc2: L('zur Grundgesamtheit der zweiten Stufe', 'on the population size of the second stage') } as Record<string, string>)[String(e.bereich)] ?? L('zum Stichprobenplan', 'on the sampling design');
      return Lp(n ?? 0, `In ${n ?? 0} Zeile fehlt die Angabe ${was}. Zeilen mit Gewicht fallen nicht still weg: Die Angabe ergänzen oder dem Fallgewicht in dieser Zeile den Wert 0 geben.`, `In ${n ?? 0} Zeilen fehlt die Angabe ${was}. Zeilen mit Gewicht fallen nicht still weg: Die Angabe ergänzen oder dem Fallgewicht in diesen Zeilen den Wert 0 geben.`,
        `In ${n ?? 0} row the information ${was} is missing. Rows with a weight do not drop out silently: add the information or give the case weight the value 0 in this row.`, `In ${n ?? 0} rows the information ${was} is missing. Rows with a weight do not drop out silently: add the information or give the case weight the value 0 in these rows.`);
    }
    case 'entwurf-zu-wenig-klumpen': return Lp(n ?? 0, `Der Stichprobenplan hat nur ${n ?? 0} Klumpen. Für Standardfehler braucht es mindestens 2.`, `Der Stichprobenplan hat nur ${n ?? 0} Klumpen. Für Standardfehler braucht es mindestens 2.`, `The sampling design has only ${n ?? 0} cluster. Standard errors need at least 2.`, `The sampling design has only ${n ?? 0} clusters. Standard errors need at least 2.`);
    case 'entwurf-fpc-klein': return L(`Die Angabe zur Grundgesamtheit ist bei ${n ?? 0} Schichten oder Klumpen kleiner als die Stichprobe. Sie zählt die Einheiten der Grundgesamtheit, keine Anteile.`, `The population size is smaller than the sample in ${n ?? 0} strata or clusters. It counts the units of the population, not proportions.`);
    case 'entwurf-fpc-uneinheitlich': return L(`Die Angabe zur Grundgesamtheit ist in ${n ?? 0} Schichten oder Klumpen nicht einheitlich. Sie muss innerhalb einer Schicht (bzw. eines Klumpens der zweiten Stufe) gleich sein.`, `The population size is not uniform in ${n ?? 0} strata or clusters. It must be the same within a stratum (or a cluster of the second stage).`);
    case 'einsamer-klumpen': return einsamerSatz(e);
    default: return L('Die Umfragerechnung konnte nicht rechnen.', 'The survey calculation could not calculate.');
  }
}
/** Schicht mit nur einem Klumpen: Sperre mit Satz, der die Schichten nennt; die Person wählt beim Fallgewicht eine Regel. `schichten`: die Codes der Schichten (Reihenfolge der Werte der Schichtspalte), `schichtNamen` ersetzt sie, wenn vorhanden. */
function einsamerSatz(e: { [k: string]: unknown }): string {
  const sp = s.gewicht?.entwurf?.schicht, werte = sp ? entwurfWerte({ spalten: s.spalten, zeilen: s.zeilen }, sp) : [];   // Codes (1, 2, ...) sind die Plätze in der sortierten Liste der Werte der Schichtspalte
  const namen = (Array.isArray(e.schichtNamen) ? e.schichtNamen : e.schichten !== undefined && e.schichten !== null ? ([] as unknown[]).concat(e.schichten).map(c => werte[Number(c) - 1] ?? L(`Nr. ${c}`, `no. ${c}`)) : []).map(String);
  const n = typeof e.n === 'number' && e.n > 0 ? e.n : namen.length, liste = namen.slice(0, 5).join(', ') + (namen.length > 5 ? L(' u. a.', ' and others') : '');
  const wo = namen.length ? ` (${liste})` : '';
  return Lp(n, `${n} Schicht${wo} hat nur einen Klumpen. Dafür lässt sich kein Standardfehler berechnen. Nötig ist beim Fallgewicht eine Regel für Schichten mit einem Klumpen; sie verändert den Standardfehler, das Mittel bleibt gleich.`, `${n} Schichten${wo} haben nur einen Klumpen. Dafür lässt sich kein Standardfehler berechnen. Nötig ist beim Fallgewicht eine Regel für Schichten mit einem Klumpen; sie verändert den Standardfehler, das Mittel bleibt gleich.`,
    `${n} stratum${wo} has only one cluster. No standard error can be calculated for it. Choose a rule for strata with one cluster in the case weight; it changes the standard error, the mean stays the same.`, `${n} strata${wo} have only one cluster. No standard error can be calculated for them. Choose a rule for strata with one cluster in the case weight; it changes the standard error, the mean stays the same.`);
}
/** Anteil 0 % oder 100 %: ein Satz statt eines Intervalls (Entscheidung Opus 2). `p` ist der Anteil (0 bis 1). */
export function anteilGrenzeSatz(p: number): string {
  const z = (x: string) => proz(x);   // Zeichen und Abstand vor dem Prozentzeichen nach dem Sprachprofil (geschütztes Leerzeichen bleibt)
  return p >= 1
    ? L(`Anteil ${z('100')}: Das Intervall ist nicht berechenbar. Der Anteil müsste kleiner als ${z('100')} sein, damit es ein Intervall gibt.`, `Proportion ${z('100')}: the interval is not computable. The proportion would have to be below ${z('100')} for an interval to exist.`)
    : L(`Anteil ${z('0')}: Das Intervall ist nicht berechenbar. Der Anteil müsste größer als ${z('0')} sein, damit es ein Intervall gibt.`, `Proportion ${z('0')}: the interval is not computable. The proportion would have to be above ${z('0')} for an interval to exist.`);
}

/* ---------------------------------------------------------------------------------------------------------------------------------- Fußzeile, Methode */
/** Fußzeile unter jedem designbasierten Ergebnis: n = Zeilen der Auswertung (nie Σw), effektive Stichprobengröße (Kish) für genau diese Fälle, das Gewicht und die Antwort „einzeln gezogen“. */
export function umfrageFuss(g: Gewicht, gew: { n: number; kishNeff: number }, deff?: number | null): string {
  if (g.entwurf) {   // Abschnitt 6, Teil A: mit Stichprobenplan gilt Kish nicht; die effektive Stichprobengröße ist n/deff
    const worte = entwurfWorte(g.entwurf), mitDeff = typeof deff === 'number' && Number.isFinite(deff) && deff > 0;
    const effektiv = mitDeff ? L(`; Designeffekt (deff) ${komma(deff)}; effektive Stichprobengröße n/deff ${komma(gew.n / deff, 1)}`, `; design effect (deff) ${komma(deff)}; effective sample size n/deff ${komma(gew.n / deff, 1)}`) : '';
    return Lp(gew.n, `n = ${gew.n} Befragte${effektiv}; Gewicht ${g.spalte}, Stichprobenplan: ${worte}. Standardfehler mit dem Stichprobenplan gerechnet.`, `n = ${gew.n} Befragte${effektiv}; Gewicht ${g.spalte}, Stichprobenplan: ${worte}. Standardfehler mit dem Stichprobenplan gerechnet.`,
      `n = ${gew.n} respondent${effektiv}; weight ${g.spalte}, sampling design: ${worte}. Standard errors calculated with the sampling design.`, `n = ${gew.n} respondents${effektiv}; weight ${g.spalte}, sampling design: ${worte}. Standard errors calculated with the sampling design.`);
  }
  const neff = komma(gew.kishNeff, 1);
  return Lp(gew.n, `n = ${gew.n} Befragte; effektive Stichprobengröße (Kish) ${neff}; Gewicht ${g.spalte}, Personen einzeln gezogen. Standardfehler ohne Schichten und Klumpen gerechnet.`, `n = ${gew.n} Befragte; effektive Stichprobengröße (Kish) ${neff}; Gewicht ${g.spalte}, Personen einzeln gezogen. Standardfehler ohne Schichten und Klumpen gerechnet.`,
    `n = ${gew.n} respondent; effective sample size (Kish) ${neff}; weight ${g.spalte}, people drawn individually. Standard errors calculated without strata and clusters.`, `n = ${gew.n} respondents; effective sample size (Kish) ${neff}; weight ${g.spalte}, people drawn individually. Standard errors calculated without strata and clusters.`);
}
/** Methodensatz (Bericht, Export): womit gewichtet und wie die Standardfehler gerechnet wurden. */
export function umfrageMethode(g: Gewicht): string {
  if (g.entwurf) return L(`Alle Schätzungen sind mit dem Umfragegewicht ${g.spalte} gewichtet. `, `All estimates are weighted by the survey weight ${g.spalte}. `) + designMethodenTeil(g.entwurf);
  return L(`Alle Schätzungen sind mit dem Umfragegewicht ${g.spalte} gewichtet (Personen einzeln gezogen). `, `All estimates are weighted by the survey weight ${g.spalte} (people drawn individually). `) + designMethodenTeil();
}

/* ---------------------------------------------------------------------------------------------------------------------------------- Selbstprüfung */
/** Statable rechnet Mittel, Anteile und Koeffizienten zweimal (JS/PSPP und R). Die erste Abweichung über `tol` (relativ) ergibt `{ index, js, r }` und Abbruch; `null` = alles gleich.
 *  NaN auf einer Seite und verschieden lange Listen zählen als Abweichung - das fängt vertauschte oder falsch zugeordnete Spalten. */
export function pruefePunktschaetzer(js: number[], r: number[], tol = 1e-8): null | { index: number; js: number; r: number } {
  const n = Math.max(js.length, r.length);
  for (let i = 0; i < n; i++) {
    const a = js[i], b = r[i];
    if (a === undefined || b === undefined || !Number.isFinite(a) || !Number.isFinite(b)) return { index: i, js: a as number, r: b as number };
    if (Math.abs(a - b) > tol * Math.max(Math.abs(a), Math.abs(b), 1e-12)) return { index: i, js: a, r: b };
  }
  return null;
}

/* ---------------------------------------------------------------------------------------------------------------------------------- Sätze (Bauer A2 und B) */
export interface UmfrageSatzKontext { gewicht: Gewicht; name: string; index?: number; gruppenNamen?: string[]; methode?: 'logit' | 'beta'; /** Regression: Name der Zielgröße (im Satz „bei ‹Ziel›“) */ ziel?: string; /** logistische Regression: das Ereignis als Text */ ereignis?: string }
export interface UmfrageSatz { haupt: string; detail: string; fuss: string; hinweise: string[] }
/** Die Sätze (APA) zu einem Ergebnis. Noch nicht gebaut: A2 (mittel, anteil, kreuz) und B (gruppen, regression) ersetzen den Zweig ihrer Art. */
export function umfrageSatz(art: UmfrageArt, e: UmfrageErgebnis, ctx: UmfrageSatzKontext): UmfrageSatz {
  if (art === 'mittel' || art === 'anteil' || art === 'kreuz') return umfrageSatzVerteilung(art, e, ctx);   // Bauer A2: lib/umfragesaetze-verteilung.ts
  if (art === 'gruppen' || art === 'regression') return umfrageSatzGr(art, e, ctx);   // Bauer B: lib/umfrage-gr.ts
  throw new Error(d(`Der Satz für „${art}“ ist noch nicht gebaut.`, `Der Satz für „${art}“ ist noch nicht gebaut.`, `The sentence for "${art}" is not built yet.`));
}
