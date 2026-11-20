/**
 * Welle 7, M1: Cox-Regression (proportionales Hazard-Modell, Cox 1972) in der Karte mit Kaplan-Meier - Typen, Daten für R, Lesen der R-Antwort und die reinen Prüfungen.
 * Die Rechnung steht in engine/statable.R (`sp_cox`, survival::coxph), der Aufruf in rverfahren.svelte.ts. Sätze und Tabellen: coxsaetze.ts.
 * Fachblatt: docs/fachblaetter/WELLE7-MEDIZIN-TESTS-PCA.md (Nachtrag nach den Sollwerten), Tests gegen R: engine/cox.webr.test.ts.
 *
 * Entscheidungen: Bindungen nach Efron (R-Voreinstellung; SPSS COXREG rechnet Breslow - die Hilfe sagt es, es gibt keinen Schalter). Wald-Intervalle der HR mit qnorm(,975).
 * Proportionalität der Hazards: Score-Test cox.zph (Grambsch & Therneau 1994), je Prädiktor und gesamt; bei p < ,05 steht der Hinweis vor den Hazard Ratios.
 * Faustregel: mindestens 10 Ereignisse je Koeffizient (Peduzzi et al. 1995). Konkordanz (Harrells C) nur beschreibend.
 * Gruppen-Prädiktoren: wie in der Regression (regfaktor.ts) 2 bis 12 Stufen, Vergleichsgruppe = erste Stufe.
 * ⚠ von der Fachperson abzunehmen: die Grenze von 10 Ereignissen je Koeffizient und die Wortlaute.
 */
import { istFehlend } from './fehlend';
import type { Spalte } from './verzeichnis';
import type { RSpalte } from '../engine/webr';
import { L, d } from './sitzung.svelte';
import { regFaktor } from './regfaktor';
import { textCodes, type Wert } from './eingabe';
import { rIds, rQ, rWahl, rAnzeigeName, rAnzeigeText } from '../engine/rsicher';

/** R-Paket der Cox-Regression (neu im webR-Repo, Welle 7). */
export const R_PAKETE_COX = ['survival'];
/** Weniger Ereignisse je Koeffizient als das: Hinweis nach Peduzzi et al. (1995). */
export const COX_EPV = 10;
/** Höchstens so viele Prädiktor-Spalten (mehr sind für Studierende kaum zu lesen und brauchen viele Ereignisse). */
export const COX_PRAED_MAX = 8;

/* ------------------------------------------------------------ Typen der Ergebnisse */

/** Ein Prädiktor: eine Zahlenspalte oder eine Gruppen-Spalte (`stufen` = Beschriftungen, die erste ist die Vergleichsgruppe). */
export interface CoxPraed { name: string; art: 'zahl' | 'faktor'; stufen: string[] }
/** Ein Koeffizient. `pIdx` zeigt auf den Prädiktor, `stufe` ist bei Gruppen die Stufe gegen die erste; `hr` = exp(B), Wald-Intervall [kiU, kiO]. */
export interface CoxKoef { pIdx: number; stufe: string; b: number; se: number; z: number; p: number; hr: number; kiU: number; kiO: number }
export interface CoxTest { chi2: number; df: number; p: number }
export interface CoxLr extends CoxTest { pIdx: number }
export interface CoxPh { gesamt: CoxTest; praed: (CoxTest & { pIdx: number })[] }
export interface CoxErgebnis {
  art: 'cox'; ties: 'efron' | 'breslow';
  praed: CoxPraed[];
  /** Fälle im Modell, ausgelassene Zeilen (Lücken), Ereignisse, Zahl der Koeffizienten, Ereignisse je Koeffizient */
  n: number; ausgelassen: number; ereignisse: number; npar: number; epv: number; epvHinweis: boolean;
  koef: CoxKoef[]; loglik: number; loglik0: number;
  /** Likelihood-Quotienten-Test des Modells und je Prädiktor (Gruppen zusammen) */
  modelltest: CoxTest; lr: CoxLr[];
  /** cox.zph (Score-Test); `null`, wenn nicht berechenbar (dann `phFehler`) */
  ph: CoxPh | null; phFehler?: string;
  konkordanz: { c: number; se: number };
  /** R meldete „coefficient may be infinite“ oder keine Konvergenz */
  trennung: boolean; warnungen: string[];
}

/* ------------------------------------------------------------ Daten für R */

const rName = (k: number) => `p${String(k + 1).padStart(2, '0')}`;

/** Alles, was R braucht: die Spalten (R-Namen zeit, ereignis, p01, p02 …) und was die Oberfläche später zum Beschriften braucht. */
export interface CoxDaten { spalten: RSpalte[]; praed: CoxPraed[]; zeit: string; ereignis: string }

function gueltigFuer(sp: Spalte): (v: Wert | undefined) => v is string | number {
  const fehlText = sp.art === 'text' ? new Set(textCodes(sp.fehlendText)) : new Set<string>();
  return (v): v is string | number => {
    if (v === null || v === undefined || v === '') return false;
    if (sp.art === 'zahl') return typeof v === 'number' && Number.isFinite(v) && !istFehlend(sp, v);
    return typeof v === 'string' && !fehlText.has(v.trimEnd());
  };
}

/**
 * Baut die Spalten für R. `ereignisWert`: der Wert der Ereignisspalte, der das Ereignis ist (so wie in den Daten); `null` = jeder gültige Wert ist ein Ereignis (Spalte mit nur einem Wert).
 * Zeit: Zahl, negative Werte und Lücken werden NA. Gruppen-Prädiktoren: Faktor mit Codes 1 … k in Statable-Reihenfolge, erste Stufe = Vergleichsgruppe.
 */
export function coxDaten(zeit: string, ereignis: string, ereignisWert: string | number | null, praed: string[], zeilen: Wert[][], spalten: Spalte[]): CoxDaten {
  const ix = (n: string) => spalten.findIndex(x => x.name === n), sp = (n: string) => spalten.find(x => x.name === n)!;
  const out: RSpalte[] = [];
  const iz = ix(zeit), gz = gueltigFuer(sp(zeit));
  out.push({ name: 'zeit', art: 'zahl', werte: zeilen.map(z => (gz(z[iz]) && typeof z[iz] === 'number' && (z[iz] as number) >= 0 ? (z[iz] as number) : null)) });
  const ie = ix(ereignis), se = sp(ereignis), ge = gueltigFuer(se);
  out.push({ name: 'ereignis', art: 'zahl', werte: zeilen.map(z => {
    const v = z[ie];
    if (!ge(v)) return null;
    return ereignisWert === null || v === ereignisWert ? 1 : 0;
  }) });
  const infos: CoxPraed[] = [];
  praed.forEach((n, k) => {
    const i = ix(n), s = sp(n), g = gueltigFuer(s), rn = rName(k);
    const roh = zeilen.map(z => z[i]).filter((v): v is string | number => g(v));
    const f = regFaktor(s, roh, []);
    if (f) {
      const code = new Map(f.stufen.map((st, j) => [st.wert, j + 1]));
      out.push({ name: rn, art: 'faktor', werte: zeilen.map(z => (g(z[i]) ? code.get(f.text ? String(z[i]) : String(Number(z[i]))) ?? null : null)), labels: f.stufen.map((st, j) => ({ wert: j + 1, label: st.name })) });
      infos.push({ name: n, art: 'faktor', stufen: f.stufen.map(st => st.name) });
    } else {
      out.push({ name: rn, art: 'zahl', werte: zeilen.map(z => (g(z[i]) && typeof z[i] === 'number' ? (z[i] as number) : null)) });
      infos.push({ name: n, art: 'zahl', stufen: [] });
    }
  });
  return { spalten: out, praed: infos, zeit, ereignis };
}

/** Zahl der Koeffizienten, die die Prädiktoren ergeben (Gruppe: Stufen − 1). */
export const coxKoeffizienten = (praed: CoxPraed[]): number => praed.reduce((a, p) => a + (p.art === 'faktor' ? Math.max(p.stufen.length - 1, 1) : 1), 0);

/* ------------------------------------------------------------ R-Aufruf */

/** Der Aufruf von `sp_cox`; Fehler kommen als `list(fehler = …)`. Im Code stehen nur feste Wörter und Bezeichner (zeit, ereignis, p01 …); Beschriftungen stecken in den Daten, nicht im Code. */
export function coxAufruf(dt: CoxDaten, ties: 'efron' | 'breslow' = 'efron'): string {
  const namen = dt.praed.map((_, k) => rName(k)), faktoren = dt.praed.flatMap((p, k) => (p.art === 'faktor' ? [rName(k)] : []));
  return `tryCatch(sp_cox(d, ${rQ('zeit')}, ${rQ('ereignis')}, ${rIds(namen)}, ${rIds(faktoren)}, ${rWahl(ties, ['efron', 'breslow'] as const)}), error = function(e) list(fehler = conditionMessage(e)))`;
}

/* ------------------------------------------------------------ R-Antwort lesen */

const arr = <T>(x: unknown): T[] => (x == null ? [] : Array.isArray(x) ? (x as T[]) : [x as T]);
const num = (x: unknown): number => { const v = arr<number | null>(x)[0]; return typeof v === 'number' && Number.isFinite(v) ? v : NaN; };
const wahr = (x: unknown) => arr<boolean>(x)[0] === true;
const text = (x: unknown): string => String(arr<string>(x)[0] ?? '');
const liste = (x: unknown): Record<string, unknown>[] => arr<Record<string, unknown>>(x).filter(z => z && typeof z === 'object' && !('type' in z && Object.keys(z).length === 1));
const testLesen = (x: unknown): CoxTest => { const z = (x ?? {}) as Record<string, unknown>; return { chi2: num(z.chi2), df: num(z.df), p: num(z.p) }; };
const pIdxVon = (name: string) => Number(name.slice(1)) - 1;

/** `p02Stufe` → Prädiktor (0-basiert) und Stufe. */
function zuordnen(name: string, praed: CoxPraed[]): { pIdx: number; stufe: string } {
  const m = /^p(\d\d)(.*)$/s.exec(name);
  if (!m) return { pIdx: -1, stufe: '' };
  const pIdx = Number(m[1]) - 1;
  return { pIdx, stufe: praed[pIdx]?.art === 'faktor' ? m[2]! : '' };
}

/** R-Antwort von `sp_cox` lesen. Wirft nicht; ein `fehler` in der Antwort prüft der Aufrufer vorher. */
export function coxLesen(r: Record<string, unknown>, dt: Pick<CoxDaten, 'praed'>): CoxErgebnis {
  const ph = r.ph as Record<string, unknown> | undefined, kk = (r.konkordanz ?? {}) as Record<string, unknown>;
  const e: CoxErgebnis = {
    art: 'cox', ties: text(r.ties) === 'breslow' ? 'breslow' : 'efron', praed: dt.praed,
    n: num(r.n), ausgelassen: num(r.ausgelassen), ereignisse: num(r.ereignisse), npar: num(r.npar), epv: num(r.epv), epvHinweis: wahr(r.epv_hinweis),
    koef: liste(r.koef).map(z => { const { pIdx, stufe } = zuordnen(text(z.name), dt.praed); return { pIdx, stufe, b: num(z.b), se: num(z.se), z: num(z.z), p: num(z.p), hr: num(z.hr), kiU: num(z.ki_u), kiO: num(z.ki_o) }; }),
    loglik: num(r.loglik), loglik0: num(r.loglik0), modelltest: testLesen(r.modelltest),
    lr: liste(r.lr_praed).map(z => ({ pIdx: pIdxVon(text(z.name)), ...testLesen(z) })),
    ph: null, konkordanz: { c: num(kk.c), se: num(kk.se) }, trennung: wahr(r.trennung), warnungen: arr<string>(r.warnungen).map(String)
  };
  if (ph && typeof ph === 'object' && !('type' in ph && Object.keys(ph).length === 1)) e.ph = { gesamt: testLesen(ph.gesamt), praed: liste(ph.praed).map(z => ({ pIdx: pIdxVon(text(z.name)), ...testLesen(z) })) };
  else e.phFehler = text(r.ph_fehler) || 'not available';
  return e;
}

/** Prädiktoren, für die die Annahme proportionaler Hazards verletzt ist (p < ,05), nach Index; leer, wenn alles in Ordnung oder nicht berechenbar. */
export const phVerletzt = (e: CoxErgebnis): number[] => (e.ph ? e.ph.praed.filter(q => Number.isFinite(q.p) && q.p < 0.05).map(q => q.pIdx) : []);
/** Ist die gesamte Annahme (GLOBAL) verletzt, ohne dass ein einzelner Prädiktor es ist? Bei einem Prädiktor sind beide gleich. */
export const phGesamtVerletzt = (e: CoxErgebnis): boolean => !!e.ph && Number.isFinite(e.ph.gesamt.p) && e.ph.gesamt.p < 0.05;

/* ------------------------------------------------------------ R-Fehlermeldungen in Sätze */

/** Die Kurztexte aus statable.R in Sätze; `null`, wenn die Meldung nicht von der Cox-Regression stammt. */
export function coxFehlerText(roh: string): string | null {
  const m = roh.toLowerCase();
  if (/no event among the valid cases/.test(m)) return L('Unter den Fällen mit gültigen Angaben tritt das Ereignis bei niemandem ein. Dann lässt sich kein Modell schätzen.', 'Among the cases with valid answers nobody has the event. No model can be estimated then.');
  if (/only one group left/.test(m)) return L('Eine Gruppen-Spalte hat nach dem Weglassen der Lücken nur noch eine Gruppe. Damit lässt sich kein Unterschied zwischen Gruppen schätzen.', 'A group column has only one group left once gaps are left out. No difference between groups can be estimated.');
  if (/negative times/.test(m)) return L('Die Zeitspalte enthält negative Werte. Eine Beobachtungszeit kann nicht negativ sein.', 'The time column contains negative values. An observation time cannot be negative.');
  if (/no predictors/.test(m)) return d('Wähle mindestens eine Spalte, die das Risiko erklären soll.', 'Wählen Sie mindestens eine Spalte, die das Risiko erklären soll.', 'Choose at least one column that is meant to explain the risk.');
  if (/event must be coded 0 or 1|time and event must be numbers/.test(m)) return L('Zeit und Ereignis müssen Zahlen sein (Ereignis: 0 oder 1).', 'Time and event must be numbers (event: 0 or 1).');
  return null;
}

/* ------------------------------------------------------------ Prüfungen vor dem Rechnen (reine Funktionen) */

/** Hinweise vor dem Rechnen. `sperre`: es wird nicht gerechnet. `hinweis`: es wird gerechnet. */
export interface CoxBefund { art: 'sperre' | 'hinweis'; code: string; text: string; klein?: string }

/**
 * `ereignisse` = Ereignisse unter den Fällen der Kaplan-Meier-Karte, `praed` = Prädiktoren (mit Stufen).
 * Sperre: mehr als COX_PRAED_MAX Spalten. Hinweis: weniger als 10 Ereignisse je Koeffizient (Peduzzi et al. 1995).
 */
export function coxBefunde(ereignisse: number, praed: CoxPraed[]): CoxBefund[] {
  const aus: CoxBefund[] = [];
  if (praed.length > COX_PRAED_MAX) aus.push({ art: 'sperre', code: 'zu-viele', text: L(`Mehr als ${COX_PRAED_MAX} Spalten für die Cox-Regression`, `More than ${COX_PRAED_MAX} columns for the Cox regression`),
    klein: d(`Wähle höchstens ${COX_PRAED_MAX} Spalten. Mit vielen Spalten braucht das Modell sehr viele Ereignisse.`, `Wählen Sie höchstens ${COX_PRAED_MAX} Spalten. Mit vielen Spalten braucht das Modell sehr viele Ereignisse.`, `Choose at most ${COX_PRAED_MAX} columns. With many columns the model needs very many events.`) });
  const k = coxKoeffizienten(praed);
  if (k > 0 && ereignisse / k < COX_EPV) aus.push({ art: 'hinweis', code: 'epv', text: L(`Wenige Ereignisse für die Cox-Regression: ${ereignisse} Ereignisse bei ${k} Koeffizienten`, `Few events for the Cox regression: ${ereignisse} events for ${k} coefficients`),
    klein: L('Faustregel (Peduzzi u. a. 1995): mindestens 10 Ereignisse je Koeffizient. Mit weniger sind die Hazard Ratios sehr unsicher.', 'Rule of thumb (Peduzzi et al. 1995): at least 10 events per coefficient. With fewer, the hazard ratios are very uncertain.') });
  return aus;
}

/* ------------------------------------------------------------ R-Aufruf zum Nachrechnen („Befehl“) */

// Nur zum Anzeigen (wird nie ausgeführt, aber vielleicht in RStudio eingefügt): Namen und Texte aus den Daten werden maskiert (engine/rsicher.ts).
const rn = rAnzeigeName;
const rq = rAnzeigeText;
/** Der gleiche Aufruf in R, den Statable rechnet (für „Befehl ansehen“ und den Bericht). */
export function coxRCode(e: { zeit: string; ereignis: string; ereignisWert: string | null; praed: CoxPraed[] }, T: (de: string, en: string) => string): string {
  const gruppen = e.praed.filter(p => p.art === 'faktor').map(p => `daten$${rn(p.name)} <- factor(daten$${rn(p.name)}, levels = c(${p.stufen.map(rq).join(', ')}))   # ${T('erste Stufe = Vergleichsgruppe', 'first level = reference group')}`);
  const status = e.ereignisWert === null ? '1' : `as.numeric(daten$${rn(e.ereignis)} == ${rq(e.ereignisWert)})`;
  return [
    T('# Der gleiche Aufruf in R (Paket survival), mit den Einstellungen, die Statable benutzt:', '# The same call in R (package survival), with the settings Statable uses:'), 'library(survival)', ...gruppen,
    `daten$ereignis01 <- ${status}   # ${T('1 = Ereignis, 0 = zensiert', '1 = event, 0 = censored')}`,
    `m <- coxph(Surv(${rn(e.zeit)}, ereignis01) ~ ${e.praed.map(p => rn(p.name)).join(' + ')}, data = daten, ties = 'efron')   # ${T('Bindungen nach Efron (R-Voreinstellung); SPSS COXREG rechnet Breslow', 'ties by Efron (R default); SPSS COXREG uses Breslow')}`,
    `summary(m)   # ${T('B, SE, HR = exp(B), Konkordanz; Statable nimmt für p und KI den Wald-Test (qnorm(.975))', 'B, SE, HR = exp(B), concordance; Statable uses the Wald test (qnorm(.975)) for p and CI')}`,
    `cox.zph(m, transform = 'km', terms = TRUE)   # ${T('Prüfung der proportionalen Hazards (Grambsch & Therneau 1994)', 'check of proportional hazards (Grambsch & Therneau 1994)')}`
  ].join('\n');
}
