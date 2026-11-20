/**
 * Verfahren, die Statable mit R (webR) rechnet: McDonalds Omega und die konfirmatorische Faktorenanalyse (lavaan).
 * Die R-Funktionen stehen in engine/statable.R (dieselbe Datei läuft am Mac mit Rscript, scripts/cfa-omega-erwartet.R).
 * Daten kommen aus der Sitzung; fehlende Werte (auch die als „keine Angabe“ markierten) werden zu NA.
 *
 * Wahl der Omega-Variante (08.10.2026, nachgesehen): jamovi (jmv::reliability) ruft psych::omega(daten, 1) auf und gibt omega.tot ohne Intervall aus;
 * JASP (Bayesrel) schätzt ein Ein-Faktor-Modell mit lavaan und gibt ω_u mit Bootstrap-Intervall aus. Statable folgt JASP: ω_total aus dem Ein-Faktor-Modell
 * (ML, ω = (Σλ)² / ((Σλ)² + Σθ)). Das Intervall ist standardmäßig die Delta-Methode (lavaan, 0,2 s); „Bootstrap wie JASP“ ist als Option da (1000 Ziehungen,
 * Perzentil, fester Startwert; am Mac 27 s, im Browser länger). ω_h (hierarchisch) kommt aus psych::omega mit k Gruppenfaktoren und steht nur bei „Für Fachleute“.
 */
import { istFehlend } from './fehlend';
import { itemAnzeige } from './itemnamen';
import { Fertig, rMotor, type RSpalte } from '../engine/webr';
import { rAbbrechen, rStatus, setzeRAbbrechen } from './rlauf.svelte';
import { zm } from './zeitmarke';
import { rGanz, rZahl, rBool, rIds, rWahl, rQOderLeer, rListeIds, rArg } from '../engine/rsicher';
import STATABLE_R from '../engine/statable.R?raw';
import STATABLE_UMFRAGE_R from '../engine/statable-umfrage.R?raw';
import STATABLE_VORHERSAGE_E_R from '../engine/statable-vorhersage-e.R?raw';
import STATABLE_ZEITCLUSTER_R from '../engine/statable-zeitcluster.R?raw';   // Später S-E (Bauer B): Ward und k-Means
import STATABLE_UEBERLEBEN_R from '../engine/statable-ueberleben.R?raw';   // Später S-F (Bauer A): Cox mit zeitabhängiger Größe (Zählprozess)
import STATABLE_GLAETTUNG_R from '../engine/statable-glaettung.R?raw';   // ETS-Glättung und Modell auf neue Daten (Abschnitt 5): nur stats, kein Zusatzpaket
import STATABLE_PROGNOSE_R from '../engine/statable-prognose.R?raw';   // Prognose der Zeitreihen: nur stats, kein Zusatzpaket
import STATABLE_KURSPAKET_R from '../engine/statable-kurspaket.R?raw';   // Kurs-Paket (Diskriminanz, loglineare Modelle, MANOVA, Probit, gewichtete Regression): stats und MASS
import STATABLE_ARMUT_R from '../engine/statable-armut.R?raw';   // Armut und Ungleichheit (Abschnitt 3): nur survey
import { prognoseAufruf, etsAufruf, etsAutoStartAufruf, etsAutoKandidatAufruf, etsAutoEndeAufruf, etsAutoStartLesen, ETS_MODELLE, prognoseLesen, prognoseCodeSatz, type PrognoseWahl, type PrognoseAntwort } from './prognose';
import { ausreisserAufruf, ausreisserLesen, ausreisserCodeSatz, type AusreisserWahl, type AusreisserAntwort } from './ausreisserzeit';
import { massnahmeAufruf, massnahmeLesen, vorschlagAufruf, vorschlagLesen, massnahmeCodeSatz, type MassnahmeWahl, type MassnahmeAntwort, type VorschlagAntwort } from './massnahme';
import { neuAufruf, neuLesen, neuCodeSatz, type NeuModell } from './modellneu';
import { grangerAufruf, grangerLesen, grangerCodeSatz, type GrangerAntwort } from './granger';
import { differenzenAufruf, differenzenLesen, differenzenFehlerSatz, periodogrammAufruf, periodogrammLesen, periodogrammCodeSatz, type DifferenzenAntwort, type PeriodogrammAntwort } from './zeitreihenabrunden';
import { umfrageLesen, type UmfrageArt, type UmfrageErgebnis } from './umfrage';
import { s, spalteNach, L, Lp, d } from './sitzung.svelte';
import { mebDaten, mebLesen, R_PAKETE_MEB, type Mehrebenen, type MebTeil, type MebZentrierung } from './mehrebenen';
import { mebVergleichAuftrag, mebVergleichLesen, type MebVergleich } from './mebvergleich';
import { metaDaten, metaLesen, metaGrenzeText, R_PAKETE_META, type Meta, type MetaEingabe } from './metaanalyse';
import { coxDaten, coxAufruf, coxLesen, coxFehlerText, R_PAKETE_COX, type CoxErgebnis } from './cox';
import { coxZpDaten, coxZpAufruf, type ZpZeile } from './coxzeit';
import { aftDaten, aftAufruf, aftAicAufruf, aftLesen, aftVergleichLesen, aftFehlerText, frailtyDaten, frailtyAufruf, frailtyLesen, type AftErgebnis, type AftVerteilung, type FrailtyErgebnis, type FrailtyArt, type FrailtyBindung } from './aft';
import { quantilAufruf, quantilKiWahl, quantilKiR, quantilLesen, quantilRangFehler, quantilNidWarnung, quantilFehlerSatz, QR_B, QR_STARTWERT, R_PAKETE_QUANTIL, type QuantilErgebnis, type QuantilKiWunsch, type QuantilCode } from './quantil';
import { strafAufruf, strafAlleFaltungen, strafK, strafLesen, strafFehlerSatz, strafVollstaendig, strafCodeSatz, STRAF_STARTWERT, STRAF_WDH, R_PAKETE_STRAF, type StrafErgebnis, type StrafRegel } from './strafreg';
import { armutDaten, armutAufruf, armutLesen, armutPunkte, armutFehlerSatz, R_PAKETE_ARMUT, type ArmutE } from './armut';
import { diskrDaten, diskrAufruf, diskrLesen, diskrPunkte, diskrFehlerSatz, type DiskrE } from './diskriminanz';
import { logDaten, logAufruf, logLesen, logPunkte, logCodeSatz, type LogE, type LogWahl } from './loglinear';
import { manovaDaten, manovaAufruf, manovaLesen, manovaPunkte, manovaCodeSatz, type ManovaE } from './manova';
import { probitDaten, probitAufruf, probitLesen, probitPunkte, probitFehlerSatz, type ProbitE } from './probit';
import { wlsDaten, wlsAufruf, wlsLesen, wlsPunkte, wlsFehlerSatz, type WlsE } from './wls';
import { nlsDaten, nlsAufruf, nlsLesen, nlsPunkte, nlsFehlerSatz, type NlsE, type NlsArt } from './nls';
import { katDaten, katFehlerText, type RAufruf, ordAufruf, ordLesen, multAufruf, multLesen, zaehlAufruf, zaehlLesen, R_PAKETE_ORD, R_PAKETE_MULT, R_PAKETE_ZAEHL, type OrdReg, type MultReg, type ZaehlReg, type ZaehlModellWahl } from './kategreg';

export interface OmegaErg {
  omega: number; lo: number | null; hi: number | null; art: 'delta' | 'bootstrap'; ziehungen: number;
  n: number; nAlle: number; k: number; heywood: boolean; fiml: boolean;
  omegaH?: number; omegaTPsych?: number; nf?: number;
}
export interface CfaFaktorDef { name: string; fragen: string[] }
export interface CfaFit { chisq: number; df: number; p: number; cfi: number; tli: number; rmsea: number; rmseaLo: number; rmseaHi: number; srmr: number }
export interface CfaLadung { faktor: number; frage: string; std: number; se: number | null; p: number | null; lo: number | null; hi: number | null }
export interface CfaKor { a: number; b: number; r: number; se: number | null; p: number | null }
export interface CfaErg {
  faktoren: CfaFaktorDef[]; schaetzer: 'ML' | 'WLSMV'; fiml: boolean; n: number; nAlle: number;
  fit: CfaFit; ladungen: CfaLadung[]; kor: CfaKor[]; heywood: boolean; warnungen: string[];
}
export interface OmegaOptionen { fiml?: boolean; bootstrap?: boolean; nf?: number }
export interface CfaOptionen { ordinal?: boolean; fiml?: boolean }

export const R_PAKETE = ['lavaan', 'psych', 'GPArotation'];
/** Umfragegewichte (Später S-D2): survey mit mitools, DBI (Matrix, lattice, Rcpp, survival liegen schon für andere Verfahren da). Die R-Funktionen stehen in engine/statable-umfrage.R und werden beim ersten Laden dieses Pakets mitgeladen. */
export const R_PAKETE_UMFRAGE = ['survey'];

/* ---------- Zustand von R in dieser Sitzung (für Hinweise und Fortschritt) ---------- */
export { rStatus, rAbbrechen };
const motor = rMotor();
motor.onFortschritt = f => { rStatus.text = f.text; rStatus.geladen = f.geladen; rStatus.gesamt = f.gesamt; if (f.phase === 'bereit') rStatus.bereit = true; };

/** Was das erste Laden kostet: R und die Pakete in MB (gerundet); `null`, wenn R in dieser Installation fehlt. */
export async function rKosten(pakete: string[] = R_PAKETE): Promise<{ basisMB: number; paketeMB: number } | null> {
  try { const k = await motor.kosten(pakete); return { basisMB: Math.round(k.basisBytes / 1e6), paketeMB: Math.round(k.paketBytes / 1e6) }; } catch { return null; }
}

/** Woher die Daten kommen: die Sitzung (Standard) - oder, für Tests, eigene Zeilen und Spalten. */
export interface Quelle { zeilen: (string | number | null)[][]; spalten: typeof s.spalten }
const jetzt = (): Quelle => ({ zeilen: s.zeilen, spalten: s.spalten });

let definiert = false;
let umfrageDefiniert = false;
let vorhersageEDefiniert = false;
let zeitclusterDefiniert = false;
let ueberlebenDefiniert = false;
let prognoseDefiniert = false;
let kurspaketDefiniert = false;
let armutDefiniert = false;
/** Ein neues R kennt die festen Funktionen nicht mehr. */
motor.onNeustart = () => {
  definiert = umfrageDefiniert = vorhersageEDefiniert = zeitclusterDefiniert = ueberlebenDefiniert = prognoseDefiniert = kurspaketDefiniert = armutDefiniert = false;
  rStatus.bereit = false; rStatus.text = ''; rStatus.laedt = false; rStatus.geladen = 0; rStatus.gesamt = 0;
};
const rTeilArmut = STATABLE_ARMUT_R;
const rTeilKurspaket = STATABLE_KURSPAKET_R;
const rTeilUeberleben = STATABLE_UEBERLEBEN_R;
const rTeilPrognoseR = STATABLE_PROGNOSE_R;
const rTeilGlaettungR = STATABLE_GLAETTUNG_R;
const rTeilZeitcluster = STATABLE_ZEITCLUSTER_R;
const rTeilUmfrageR = STATABLE_UMFRAGE_R;
const rTeilVorhersageER = STATABLE_VORHERSAGE_E_R;
let kette: Promise<unknown> = Promise.resolve();
let offen = 0;
/** Rechnungen laufen nacheinander (R hat eine gemeinsame Umgebung). */
function nacheinander<T>(f: () => Promise<T>, still = false): Promise<T> {
  const gen = motor.generation;
  // Was beim Abbrechen schon in der Reihe stand, gehört zum selben Abbruch und rechnet nicht mehr los.
  const lauf = () => { if (gen !== motor.generation) throw motor.letzterAbbruch; return f(); };
  if (!still) { offen++; rStatus.belegt = true; }
  const p = kette.then(lauf, lauf);
  kette = p.catch(() => undefined);
  if (!still) { const fertig = () => { if (--offen === 0) rStatus.belegt = false; }; p.then(fertig, fertig); }
  return p;
}
setzeRAbbrechen(() => { if (offen) motor.neustart(); });
/** Die festen R-Funktionen von Statable einmal in R anlegen (Quelltext der Dateien, nie Text aus Daten). Gilt für alle Karten, die die Pakete brauchen. */
async function definiere(pakete: string[], kurspaket = false, armut = false): Promise<void> {
  if (!definiert) { await motor.rechne(`{ ${STATABLE_R}\nTRUE }`); definiert = true; }
  if (!ueberlebenDefiniert && pakete.includes('survival')) { await motor.rechne(`{ ${rTeilUeberleben}\nTRUE }`); ueberlebenDefiniert = true; }   // Später S-F: sp_cox_zp; fester Quelltext der Datei, kein Text aus Daten
  if (!umfrageDefiniert && pakete.includes('survey')) { await motor.rechne(`{ ${rTeilUmfrageR}\nTRUE }`); umfrageDefiniert = true; }   // fester Quelltext der Datei, kein Text aus Daten
  if (!vorhersageEDefiniert && (pakete.includes('quantreg') || pakete.includes('glmnet'))) { await motor.rechne(`{ ${rTeilVorhersageER}\nTRUE }`); vorhersageEDefiniert = true; }   // Später S-E: Quantilregression und Strafregression; fester Quelltext der Datei, kein Text aus Daten
  if (kurspaket && !kurspaketDefiniert) { await motor.rechne(`{ ${rTeilKurspaket}
TRUE }`); kurspaketDefiniert = true; }   // fester Quelltext der Datei, kein Text aus Daten
  if (armut && !armutDefiniert) { await motor.rechne(`{ ${rTeilArmut}
TRUE }`); armutDefiniert = true; }   // fester Quelltext der Datei, kein Text aus Daten
}
async function vorbereiten(spalten: RSpalte[], pakete: string[] = R_PAKETE, kurspaket = false, armut = false): Promise<void> {
  rStatus.laedt = true;
  try {
    zm('r-vorbereiten');
    await motor.pakete(pakete);
    await definiere(pakete, kurspaket, armut);
    zm('r-definiert');
    await motor.daten('d', spalten);
    zm('r-daten');
  } finally { rStatus.laedt = false; }
}

/* ---------- Vorwärmen: R laden, sobald klar ist, dass es gebraucht wird (Vorgabe Johannes 31.10.) ---------- */
let halter = 0;
let ausstehend = 0;
let vorKette: Promise<unknown> = Promise.resolve();
/**
 * Beginnt R und die Pakete zu laden, ohne zu rechnen. NUR rufen, wenn die Person ein Verfahren gewählt hat, das nur über R rechnet (nie auf Verdacht).
 * Der Fortschritt steht in `rStatus` (Bytes aller Stufen zusammen). Der Rückgabewert gibt die Wahl wieder frei: Waren alle Halter weg, bevor R fertig ist,
 * stoppt das Laden der Dateien (was fertig ist, bleibt im Cache); eine Rechnung, die R inzwischen verlangt, läuft weiter. Fehler (kein Netz, R fehlt in der
 * Installation) werden verschluckt: dann lädt R wie bisher erst beim Rechnen und meldet den Fehler dort.
 */
export function rHalten(pakete: string[] = R_PAKETE): () => void {
  // Datensparmodus des Browsers: nicht vorab laden, R kommt dann erst beim Rechnen (Johannes 31.10.).
  if ((navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData) return () => {};
  halter++; ausstehend++; rStatus.vor = true;
  vorKette = vorKette.then(async () => {
    try {
      if (halter === 0) return;   // schon wieder freigegeben, bevor die Reihe an uns war
      await motor.vorwaermen(pakete);
      await nacheinander(async () => {
        await definiere(pakete);
        // Die Pakete schon in R einlesen (nicht anhängen): das ist beim ersten Rechnen der größte Brocken nach dem Laden. Namen aus festen Listen, als Argument gebunden.
        if (pakete.length) await motor.rechne(`invisible(lapply(${rArg('pk')}, function(p) suppressMessages(requireNamespace(p, quietly = TRUE))))`, { pk: pakete });
        zm('r-vorgewaermt');
      }, true);   // Vorwärmen: Niemand wartet auf ein Ergebnis, also gibt es auch nichts abzubrechen
    } catch { /* abgebrochen oder nicht möglich: beim Rechnen neu versuchen */ }
    finally { if (--ausstehend === 0) rStatus.vor = false; }
  });
  let frei = false;
  return () => { if (frei) return; frei = true; if (--halter === 0) motor.abbrechen(); };
}

/** Eine Umfrage-Rechnung mit dem R-Paket survey (Später S-D2): R und das Paket laden (die Oberfläche zeigt dabei die Lade-Animation), die Daten als `d` binden, den Aufruf rechnen, die Antwort lesen.
 *  Die R-Funktionen `sp_umfrage_*` werfen nie; Fehler der Rechnung kommen als `fehlerCode` im Ergebnis, fremde R-Fehler als Ausnahme mit lesbarem Satz.
 *  SICHERHEIT: `aufruf` enthält nur Festes (Wörter, eigene Namen über rQ/rIds, Zahlen über rZahl/rBool; siehe engine/rsicher.ts) - Namen und Texte aus Dateien stehen nur in den Daten `spalten`. */
export async function umfrageRechnen(art: UmfrageArt, spalten: RSpalte[], aufruf: string, pakete: string[] = R_PAKETE_UMFRAGE): Promise<UmfrageErgebnis> {
  return (await umfrageRechnenListe(spalten, [{ art, aufruf }], pakete))[0]!;
}
/** Mehrere Umfrage-Aufrufe auf denselben Daten (einmal laden, einmal binden), nacheinander gerechnet; die Antworten stehen in der Reihenfolge der Aufträge. */
export async function umfrageRechnenListe(spalten: RSpalte[], auftraege: { art: UmfrageArt; aufruf: string }[], pakete: string[] = R_PAKETE_UMFRAGE): Promise<UmfrageErgebnis[]> {
  return nacheinander(async () => {
    try {
      await vorbereiten(spalten, pakete);
      const aus: UmfrageErgebnis[] = [];
      for (const a of auftraege) {
        const rTeilAufruf = a.aufruf;
        const code = `tryCatch(${rTeilAufruf}, error = function(e) list(fehler_code = 'unbekannt', meldung = conditionMessage(e)))`;
        const r = umfrageLesen(a.art, await motor.rechne<unknown>(code));
        if (r.fehlerCode === 'unbekannt') throw new Fertig(rFehlerText(String(r.meldung ?? '')));
        aus.push(r);
      }
      return aus;
    } catch (e) {
      const t = (e as Error)?.message ?? String(e);
      throw e instanceof Fertig ? e : new Fertig(/^(R |Das |Es |The |Die |Interner|Internal)/.test(t) ? t : rFehlerText(t));
    }
  });
}

/** Die Spalten der Sitzung als R-Spalten v1, v2 …; fehlende Werte und „keine Angabe“-Codes werden zu NA, Text zu NA. */
export function rSpaltenVon(namen: string[], zeilen: (string | number | null)[][] = s.zeilen, spalten = s.spalten): RSpalte[] {
  return namen.map((n, k) => {
    const i = spalten.findIndex(x => x.name === n), sp = spalte(n, spalten);
    return { name: `v${k + 1}`, art: 'zahl' as const, werte: zeilen.map(z => { const w = z[i]; return typeof w === 'number' && Number.isFinite(w) && !istFehlend(sp, w) ? w : null; }) };
  });
}
const spalte = (n: string, spalten = s.spalten) => spalten.find(x => x.name === n) ?? spalteNach(n);

const eins = <T>(x: T | T[] | undefined | null): T | undefined => (Array.isArray(x) ? x[0] : x ?? undefined);
const zahl = (x: unknown): number | null => { const v = eins(x as number | number[]); return typeof v === 'number' && Number.isFinite(v) ? v : null; };
const liste = <T>(x: unknown): T[] => (x == null ? [] : Array.isArray(x) ? (x as T[]) : [x as T]);
const wahr = (x: unknown) => eins(x as boolean | boolean[]) === true;

export { Fertig };

/** R-Fehlermeldungen in verständliche Sätze. Unbekanntes bleibt als Zusatz stehen. */
export function rFehlerText(roh: string): string {
  const m = roh.toLowerCase();
  const zusatz = ` (R: ${roh.replace(/\s+/g, ' ').slice(0, 160)})`;
  // Ordinale, multinomiale und Zähldaten-Regression (Welle 3): eigene Kurztexte aus statable.R
  const kat = katFehlerText(roh); if (kat) return kat;
  // Cox-Regression (Welle 7)
  const cox = coxFehlerText(roh); if (cox) return cox;
  // AFT-Modell und Cox mit Kennung (Später S-F2)
  const aft = aftFehlerText(roh); if (aft) return aft;
  // Pfadmodell (S-J S1)
  if (/^cycle$/.test(m)) return L('Die Pfade bilden einen Kreis (zum Beispiel wirkt A auf B und B zurück auf A): Das rechnet Statable nicht.', 'The paths form a loop (for example A affects B and B affects A back): Statable does not calculate that.');
  if (/^self loop$/.test(m)) return L('Eine Variable kann nicht auf sich selbst wirken.', 'A variable cannot affect itself.');
  if (/^too many effects$/.test(m)) return L('Das Modell hat mehr als 12 indirekte Pfade. Weniger Pfade wählen.', 'The model has more than 12 indirect paths. Choose fewer paths.');
  // Wachstumskurvenmodell (B4 Teil 1)
  if (/^at least three time points needed$/.test(m)) return L('Ein Wachstumskurvenmodell braucht mindestens drei Messzeitpunkte (drei Spalten).', 'A growth curve model needs at least three time points (three columns).');
  if (/^time values must be numbers/.test(m)) return L('Die Zeitwerte müssen Zahlen sein, je Messzeitpunkt eine, und mindestens drei verschiedene.', 'The time values must be numbers, one per time point, at least three different ones.');
  if (/^too few complete cases$/.test(m)) return L('Zu wenige Personen mit Werten zu allen Zeitpunkten (mindestens 15). Mit „Lücken mitrechnen“ gehen auch Personen mit fehlenden Werten ein.', 'Too few people with values at all time points (at least 15). With “use incomplete cases” people with missing values are included.');
  // Meta-Analyse (metafor)
  if (/fewer than two usable studies/.test(m)) return d('Es bleiben weniger als zwei Studien mit gültigen Zahlen. Prüfe die Eingabe.', 'Es bleiben weniger als zwei Studien mit gültigen Zahlen. Prüfen Sie die Eingabe.', 'Fewer than two studies with valid numbers remain. Check the input.');
  if (/convergence|fisher scoring|did not converge|iterat/.test(m) && /rma|tau|reml|heterogeneity/.test(m)) return L('Die Schätzung der Streuung zwischen den Studien (τ²) ist nicht zu einem Ergebnis gekommen. Meist stimmt ein Wert nicht (zum Beispiel ein viel zu kleiner Standardfehler) oder es sind sehr wenige Studien.', 'The estimation of the between-study variance (τ²) did not converge. Usually a value is off (for example a far too small standard error) or there are very few studies.') + zusatz;
  // Mehrebenen-Modelle (lme4): die häufigen Fehler
  if (/must be < number of observations|one group only|more than one sampled level|> 1 sampled level/.test(m)) return d('Es gibt keine Gruppen mit mehreren Fällen: Jede Person steht für sich oder es gibt nur eine Gruppe. Ein Mehrebenenmodell braucht mehrere Gruppen mit je mehreren Personen. Prüfe die Spalte, die die Gruppen nennt.', 'Es gibt keine Gruppen mit mehreren Fällen: Jede Person steht für sich oder es gibt nur eine Gruppe. Ein Mehrebenenmodell braucht mehrere Gruppen mit je mehreren Personen. Prüfen Sie die Spalte, die die Gruppen nennt.', 'There are no groups with several cases: every person stands alone, or there is only one group. A multilevel model needs several groups with several people each. Check the column that names the groups.') + zusatz;
  if (/downdated vtv|not positive definite|pwrssupdate|cholmod|rank|eigen/.test(m) && /lmer|mer|vtv|pwrss|cholmod|chol/.test(m)) return d('Das Modell lässt sich mit diesen Daten nicht schätzen (meist sind zwei Spalten fast gleich oder eine Spalte hat in einer Gruppe nur einen Wert). Nimm eine Erklärungsspalte heraus oder zentriere die Zahlen.', 'Das Modell lässt sich mit diesen Daten nicht schätzen (meist sind zwei Spalten fast gleich oder eine Spalte hat in einer Gruppe nur einen Wert). Nehmen Sie eine Erklärungsspalte heraus oder zentrieren Sie die Zahlen.', 'The model cannot be estimated with these data (usually two columns are nearly identical, or a column has only one value in a group). Leave out an explanatory column or center the numbers.') + zusatz;
  if (/identif|not enough|negative.*degrees|df.*<\s*0|fewer.*observed/.test(m)) return d('Das Modell ist nicht identifiziert: Es hat mehr Unbekannte, als die Daten festlegen. Gib jedem Faktor mehr Fragen (am besten drei oder mehr) oder nimm weniger Faktoren.', 'Das Modell ist nicht identifiziert: Es hat mehr Unbekannte, als die Daten festlegen. Geben Sie jedem Faktor mehr Fragen (am besten drei oder mehr) oder nehmen Sie weniger Faktoren.', 'The model is not identified: it has more unknowns than the data can determine. Give every factor more questions (ideally three or more) or use fewer factors.') + zusatz;
  if (/converge/.test(m)) return L('Die Rechnung kommt zu keinem Ergebnis (keine Konvergenz). Meist passt die Zuordnung der Fragen nicht zu den Daten oder es sind zu wenige Personen.', 'The calculation does not arrive at a result (no convergence). Usually the assignment of questions does not fit the data, or there are too few people.') + zusatz;
  if (/singular|positive definite|non-positive|not positive/.test(m)) return d('Die Fragen hängen so eng zusammen oder sind so wenig verschieden, dass die Rechnung sie nicht trennen kann (Kovarianzmatrix nicht positiv definit). Prüfe, ob zwei Fragen fast dasselbe sind oder eine Frage bei allen Personen denselben Wert hat.', 'Die Fragen hängen so eng zusammen oder sind so wenig verschieden, dass die Rechnung sie nicht trennen kann (Kovarianzmatrix nicht positiv definit). Prüfen Sie, ob zwei Fragen fast dasselbe sind oder eine Frage bei allen Personen denselben Wert hat.', 'The questions are so closely related or so alike that the calculation cannot separate them (covariance matrix not positive definite). Check whether two questions are nearly identical or one question has the same value for everyone.') + zusatz;
  if (/variance|constant|zero/.test(m)) return d('Eine Frage hat bei allen Personen denselben Wert. Damit lässt sich nichts rechnen - nimm sie heraus.', 'Eine Frage hat bei allen Personen denselben Wert. Damit lässt sich nichts rechnen - nehmen Sie sie heraus.', 'A question has the same value for everyone. Nothing can be calculated with it - leave it out.') + zusatz;
  if (/memory|out of|cannot allocate/.test(m)) return d('R hat nicht genug Arbeitsspeicher. Schließe andere Tabs und versuche es noch einmal.', 'R hat nicht genug Arbeitsspeicher. Schließen Sie andere Tabs und versuchen Sie es noch einmal.', 'R ran out of memory. Close other tabs and try again.') + (/cannot allocate/.test(m) ? '' : zusatz);   // „cannot allocate vector of size …“ sagt der Person nichts (Abschlusstest A7)
  return L('R konnte nicht rechnen.', 'R could not calculate.') + zusatz;
}

/* ---------- Omega ---------- */
export async function omegaRechnen(fragen: string[], opt: OmegaOptionen = {}, quelle: Quelle = jetzt()): Promise<OmegaErg> {
  if (fragen.length < 3) throw new Error(L('Omega braucht mindestens drei Fragen.', 'Omega needs at least three questions.'));
  return nacheinander(async () => {
    try {
      await vorbereiten(rSpaltenVon(fragen, quelle.zeilen, quelle.spalten));
      const nf = opt.nf && opt.nf >= 2 && fragen.length >= 6 ? Math.trunc(opt.nf) : 0;
      const r = await motor.rechne<Record<string, unknown>>(`tryCatch(sp_omega(d, boot = ${rGanz(opt.bootstrap && !opt.fiml ? 1000 : 0)}, fiml = ${rBool(!!opt.fiml)}, nf = ${rGanz(nf)}), error = function(e) list(fehler = conditionMessage(e)))`);
      if (r.fehler) throw new Fertig(rFehlerText(String(eins(r.fehler))));
      const o: OmegaErg = { omega: zahl(r.omega)!, lo: zahl(r.lo), hi: zahl(r.hi), art: eins(r.art) === 'bootstrap' && opt.bootstrap && !opt.fiml ? 'bootstrap' : 'delta', ziehungen: zahl(r.ziehungen) ?? 0, n: zahl(r.n) ?? 0, nAlle: zahl(r.n_alle) ?? 0, k: zahl(r.k) ?? fragen.length, heywood: wahr(r.heywood), fiml: !!opt.fiml };
      if (zahl(r.omega_h) !== null) { o.omegaH = zahl(r.omega_h)!; o.omegaTPsych = zahl(r.omega_t_psych) ?? undefined; o.nf = zahl(r.nf) ?? nf; }
      return o;
    } catch (e) {
      const t = (e as Error)?.message ?? String(e);
      throw e instanceof Fertig ? e : new Fertig(/^(R |Das |Omega|The |A |Die )/.test(t) ? t : rFehlerText(t));
    }
  });
}

/* ---------- Clusteranalyse: Ward und k-Means (Basispaket stats; Später S-E) ---------- */
export type ClusterAuftrag = { art: 'ward'; standardisiert: boolean; ks: number[] } | { art: 'kmeans'; standardisiert: boolean; k: number; nstart: number; startwert: number };
/** Prognose einer Zeitreihe (ARIMA, Automatik, Glättung): R lädt (nur stats, kein Paket; die Oberfläche zeigt dabei die Lade-Animation), die Reihe geht als Spalte `y` der Tabelle `d` hinein, `sp_prognose_*` rechnet.
 *  Die R-Funktionen werfen nie; ein Fehler kommt als Kennwort und wird hier zu einem lesbaren Satz (`Fertig`). SICHERHEIT: der Aufruf enthält nur Wörter und Zahlen (rGanz, rBool, rWahl in lib/prognose.ts); die Werte stehen nur in den Daten. */
export async function prognoseRechnen(y: (number | null)[], m: number, wahl: PrognoseWahl, pr: number, fortschritt?: (fertig: number, gesamt: number) => void): Promise<PrognoseAntwort> {
  if (wahl.art === 'ets-auto') return etsAutoRechnen(y, m, wahl.h, pr, fortschritt);   // läuft lange: Modell für Modell, mit Fortschritt
  return reiheRechnen(y, prognoseAufruf(wahl, m, pr).code, prognoseLesen, prognoseCodeSatz);
}
/** Gemeinsamer Weg der Rechnungen mit der Reihe als Spalte `y` (stats, kein Paket): R laden, Reihe binden (null wird NA), Aufruf rechnen, Antwort lesen; ein Fehler wird zum Satz. */
async function reiheRechnen<A, C>(y: (number | null)[], code: string, lesen: (roh: unknown) => { ok: true; antwort: A } | { ok: false; code: C }, satz: (c: C) => string, davor: RSpalte[] = []): Promise<A> {
  const spalten: RSpalte[] = [...davor, { name: 'y', art: 'zahl', werte: y }];
  return nacheinander(async () => {
    try {
      rStatus.laedt = true;
      try {
        await motor.pakete([]);
        if (!prognoseDefiniert) { await motor.rechne(`{ ${rTeilPrognoseR}
TRUE }`); await motor.rechne(`{ ${rTeilGlaettungR}
TRUE }`); prognoseDefiniert = true; }   // fester Quelltext der Dateien, kein Text aus Daten
        await motor.daten('d', spalten);
      } finally { rStatus.laedt = false; }
      const l = lesen(await motor.rechne<unknown>(code));
      if (!l.ok) throw new Fertig(satz(l.code));
      return l.antwort;
    } catch (e) {
      const t = (e as Error)?.message ?? String(e);
      throw e instanceof Fertig ? e : new Fertig(rFehlerText(t));
    }
  });
}
/** Die Automatik über die Glättung (Fachblatt GLAETTUNG-SERIEN, Abschnitt 3) Modell für Modell: R lädt einmal, die Reihe wird einmal gebunden, dann rechnet R ein Modell nach dem anderen (`fortschritt(fertig, gesamt)` nach jedem) und wählt am Ende den kleinsten AICc.
 *  Die Kandidaten nennt R selbst (sp_ets_start); im Aufruf steht jedes Modell nur nach rWahl aus der Liste der neun. Dieselbe Rechnung wie `sp_prognose_ets_auto`. */
async function etsAutoRechnen(y: (number | null)[], m: number, h: number, pr: number, fortschritt?: (fertig: number, gesamt: number) => void): Promise<PrognoseAntwort> {
  return nacheinander(async () => {
    try {
      rStatus.laedt = true;
      try {
        await motor.pakete([]);
        if (!prognoseDefiniert) { await motor.rechne(`{ ${rTeilPrognoseR}
TRUE }`); await motor.rechne(`{ ${rTeilGlaettungR}
TRUE }`); prognoseDefiniert = true; }   // fester Quelltext der Dateien, kein Text aus Daten
        await motor.daten('d', [{ name: 'y', art: 'zahl', werte: y }]);
      } finally { rStatus.laedt = false; }
      let start: ReturnType<typeof etsAutoStartLesen>;
      { const aufruf = etsAutoStartAufruf(m); start = etsAutoStartLesen(await motor.rechne<unknown>(aufruf.code)); }
      if (!start.ok) throw new Fertig(prognoseCodeSatz(start.code));
      fortschritt?.(0, start.kandidaten.length);
      for (let i = 0; i < start.kandidaten.length; i++) {
        const aufruf = etsAutoKandidatAufruf(m, start.kandidaten[i]!);
        await motor.rechne<unknown>(aufruf.code);
        fortschritt?.(i + 1, start.kandidaten.length);
      }
      let l: ReturnType<typeof prognoseLesen>;
      { const aufruf = etsAutoEndeAufruf(m, h, pr); l = prognoseLesen(await motor.rechne<unknown>(aufruf.code)); }
      if (!l.ok) throw new Fertig(prognoseCodeSatz(l.code));
      return l.antwort;
    } catch (e) {
      const t = (e as Error)?.message ?? String(e);
      throw e instanceof Fertig ? e : new Fertig(rFehlerText(t));
    }
  });
}
/** Differenzen prüfen (Fachblatt ZEITREIHEN-ABRUNDEN, Abschnitt 2): KPSS, Streuung und r1 für d = 0, 1, 2 beim gewählten D, dazu ACF und PACF beim gewählten d. Wählt nichts aus. */
export async function differenzenRechnen(y: (number | null)[], m: number, log: boolean, d: number, D: number): Promise<DifferenzenAntwort> {
  return reiheRechnen(y, differenzenAufruf(m, log, d, D).code, differenzenLesen, differenzenFehlerSatz);
}
/** Periodogramm (Fachblatt ZEITREIHEN-ABRUNDEN, Abschnitt 3): Spektrum und die drei größten Spitzen. Die Reihe muss ohne Lücken sein (R meldet es sonst als Satz). */
export async function periodogrammRechnen(y: (number | null)[]): Promise<PeriodogrammAntwort> {
  return reiheRechnen(y, periodogrammAufruf().code, periodogrammLesen, periodogrammCodeSatz);
}
/** Ein gewähltes ETS-Modell (Fachblatt GLAETTUNG-SERIEN, Abschnitt 1): `modell` nur aus der Liste der neun (rWahl). Die Oberfläche nutzt den gedämpften Trend (AAdN) über `prognoseRechnen`; die übrigen Modelle rechnet die Automatik. */
export async function etsRechnen(y: (number | null)[], m: number, modell: (typeof ETS_MODELLE)[number], h: number, pr: number): Promise<PrognoseAntwort> {
  return reiheRechnen(y, etsAufruf(modell, m, h, pr).code, prognoseLesen, prognoseCodeSatz);
}
/** Ein gerechnetes ARIMA-Modell auf andere Daten anwenden (Fachblatt GLAETTUNG-SERIEN, Abschnitt 5): nichts wird neu geschätzt. `m`: Periode der neuen Reihe. Die Koeffizienten gehen als Zahlen in den Aufruf (rZahl in lib/modellneu.ts), die Reihe als Spalte `y`. */
export async function neuRechnen(y: (number | null)[], m: number, modell: NeuModell, h: number): Promise<PrognoseAntwort> {
  return reiheRechnen(y, neuAufruf(modell, m, h).code, neuLesen, neuCodeSatz);
}
/** „Hat die Maßnahme gewirkt?“ (Fachblatt MASSNAHME, Abschnitt 1): ARIMA mit Stufe und/oder Impuls. `wahl` ist schon bereinigt; die Reihe geht als Spalte `y` hinein, im Aufruf stehen nur Wörter und Zahlen (lib/massnahme.ts). */
export async function massnahmeRechnen(y: (number | null)[], m: number, wahl: MassnahmeWahl): Promise<MassnahmeAntwort> {
  return reiheRechnen(y, massnahmeAufruf(wahl, m).code, massnahmeLesen, massnahmeCodeSatz);
}
/** Modellvorschlag NUR aus den Werten vor der Maßnahme (Fachblatt MASSNAHME): wählt nichts aus, die Person übernimmt oder nicht. */
export async function massnahmeVorschlagRechnen(y: (number | null)[], m: number, t0: number, log: boolean): Promise<VorschlagAntwort> {
  return reiheRechnen(y, vorschlagAufruf(m, t0, log).code, vorschlagLesen, massnahmeCodeSatz);
}
/** „Auffällige Werte suchen“ (Sollwerte scripts/ausreisser-zeitreihe-erwartet.R): robuste STL-Zerlegung (mit Saison) bzw. ARIMA-Automatik, Reste mit MAD standardisiert; `wahl` ist schon bereinigt, die Reihe geht als Spalte `y` hinein, im Aufruf stehen nur Zahlen. */
export async function ausreisserRechnen(y: (number | null)[], m: number, wahl: AusreisserWahl): Promise<AusreisserAntwort> {
  return reiheRechnen(y, ausreisserAufruf(wahl, m).code, ausreisserLesen, ausreisserCodeSatz);
}
/** Granger-Test (Fachblatt MASSNAHME, Abschnitt 2) in beide Richtungen: `x` und `y` als Spalten der Tabelle `d`, k als Zahl. */
export async function grangerRechnen(x: (number | null)[], y: (number | null)[], k: number): Promise<GrangerAntwort> {
  return reiheRechnen(y, grangerAufruf(k).code, grangerLesen, grangerCodeSatz, [{ name: 'x', art: 'zahl', werte: x }]);
}

/** Rechnet die Aufträge nacheinander auf denselben Daten `spalten` (Namen v1, v2 …; fehlende Werte als NA) und gibt die Antworten der R-Funktionen zurück (`sp_cluster_ward`, `sp_cluster_kmeans`).
 *  Die R-Funktionen werfen nie: ein Fehler kommt als `fehler` (Text). SICHERHEIT: der Aufruf enthält nur Wörter, die eigenen Namen über rIds und Zahlen über rGanz/rBool - die Namen der Person bleiben in JS. */
export async function clusterRechnen(spalten: RSpalte[], auftraege: ClusterAuftrag[]): Promise<Record<string, unknown>[]> {
  return nacheinander(async () => {
    try {
      rStatus.laedt = true;
      try {
        await motor.pakete([]);
        if (!definiert) { await motor.rechne(`{ ${STATABLE_R}\nTRUE }`); definiert = true; }
        if (!zeitclusterDefiniert) { await motor.rechne(`{ ${rTeilZeitcluster}\nTRUE }`); zeitclusterDefiniert = true; }   // fester Quelltext der Datei, kein Text aus Daten
        await motor.daten('d', spalten);
      } finally { rStatus.laedt = false; }
      const namen = spalten.map(sp => sp.name), aus: Record<string, unknown>[] = [];
      for (const a of auftraege) {
        const rTeilKs = a.art === 'ward' ? `c(${a.ks.map(rGanz).join(', ')})` : 'NULL';
        const rTeilAufruf = a.art === 'ward'
          ? `sp_cluster_ward(d, ${rIds(namen)}, ${rBool(a.standardisiert)}, ${rTeilKs})`
          : `sp_cluster_kmeans(d, ${rIds(namen)}, ${rBool(a.standardisiert)}, ${rGanz(a.k)}, ${rGanz(a.nstart)}, ${rGanz(a.startwert)}, NULL)`;
        aus.push(await motor.rechne<Record<string, unknown>>(`tryCatch(${rTeilAufruf}, error = function(e) list(fehler = conditionMessage(e)))`));
      }
      return aus;
    } catch (e) {
      const t = (e as Error)?.message ?? String(e);
      throw e instanceof Fertig ? e : new Fertig(/^(R |Das |Es |The |Die )/.test(t) ? t : rFehlerText(t));
    }
  });
}

/* ---------- Mehrebenen-Modell (lme4, lmerTest) ---------- */
export interface MebOptionen { /** zweite Gruppierung (gekreuzte Zufallseffekte, z. B. Reize): nur zufällige Achsenabschnitte, nur Messwerte */ gruppe2?: string; steigung?: string; /** welche Zahlen-Spalten zentriert werden (fehlt: alle) */ zentrierSpalten?: string[]; /** `true` = Gesamtmittel (wie früher) */ zentrieren?: boolean | MebZentrierung; wechsel?: [MebTeil, MebTeil][] }
/** Rechnet das Nullmodell und (mit Erklärungsspalten) das Modell mit zufälligem Achsenabschnitt, auf Wunsch mit zufälliger Steigung. `steigung` ist die Kennung einer Größe des Modells (Spaltenname, bei Zentrieren am Gruppenmittel oder Produkten die Kennung aus `MebPraed.name`).
 *  Zentrieren und Produkte (Wechselwirkungen) entstehen vor R in `mebDaten`. */
export async function mehrebenenRechnen(y: string, gruppe: string, praed: string[], opt: MebOptionen = {}, quelle: Quelle = jetzt()): Promise<Mehrebenen> {
  const art: MebZentrierung = opt.zentrieren === true ? 'gesamt' : opt.zentrieren === false || opt.zentrieren === undefined ? 'keine' : opt.zentrieren;
  const wechsel = opt.wechsel ?? [];
  const zwei = !!opt.gruppe2;
  if (zwei && (art === 'gruppe' || opt.steigung)) throw new Fertig(L('Mit zwei Gruppierungen rechnet Statable nur zufällige Achsenabschnitte: ohne zufällige Steigung und ohne Zentrieren am Gruppenmittel.', 'With two groupings Statable only fits random intercepts: no random slope and no centring at the group mean.'));
  const d = mebDaten(y, gruppe, praed, quelle.zeilen, quelle.spalten, { zentrieren: art, wechsel, ...(opt.zentrierSpalten ? { zentrierSpalten: opt.zentrierSpalten } : {}), ...(zwei ? { gruppe2: opt.gruppe2! } : {}) });
  // Ja/Nein-Ergebnis (S-H): genau zwei verschiedene Werte → verallgemeinertes gemischtes Modell (Logit); das Ereignis ist der größere Wert.
  const yWerte = [...new Set((d.spalten[0]!.werte as (number | null)[]).filter((v): v is number => v !== null))].sort((a, b) => a - b);
  const binaer = yWerte.length === 2;
  if (zwei && binaer) throw new Fertig(d('Mit zwei Gruppierungen rechnet Statable nur Messwerte, kein Ja/Nein-Ergebnis. Nimm die zweite Gruppierung heraus oder rechne mit einer Gruppierung.', 'Mit zwei Gruppierungen rechnet Statable nur Messwerte, kein Ja/Nein-Ergebnis. Nehmen Sie die zweite Gruppierung heraus oder rechnen Sie mit einer Gruppierung.', 'With two groupings Statable only fits measured outcomes, not a yes/no outcome. Remove the second grouping or use one grouping.'));
  const ySp = quelle.spalten.find(sp => sp.name === y);
  const ereignis = binaer ? (ySp?.werteLabels[String(yWerte[1])] ?? String(yWerte[1])) : undefined;
  const steigung = !binaer && opt.steigung && d.praed.some(p => p.name === opt.steigung) ? opt.steigung : '';
  const rSteig = steigung ? `p${String(d.praed.findIndex(p => p.name === steigung) + 1).padStart(2, '0')}` : '';
  return nacheinander(async () => {
    try {
      await vorbereiten(d.spalten, R_PAKETE_MEB);
      const rTeilPraed = rIds(d.praed.map((_, i) => `p${String(i + 1).padStart(2, '0')}`));
      const r = await motor.rechne<Record<string, unknown>>(`tryCatch(sp_mehrebenen(d, ${rTeilPraed}, ${rQOderLeer(rSteig)}, FALSE, ${rBool(binaer)}), error = function(e) list(fehler = conditionMessage(e)))`);
      if (r.fehler) throw new Fertig(rFehlerText(String(eins(r.fehler))));
      return mebLesen(r, { y, gruppe, ...(zwei ? { gruppe2: opt.gruppe2!, gekreuzt: d.kreuzung !== 'geschachtelt' } : {}), praed: d.praed, steigung, zentriert: art !== 'keine', zentrierArt: art, wechsel, praedOrig: [...praed], ...(opt.zentrierSpalten ? { zentrierSpalten: [...opt.zentrierSpalten] } : {}), ...(ereignis !== undefined ? { ereignis } : {}) });
    } catch (e) {
      const t = (e as Error)?.message ?? String(e);
      throw e instanceof Fertig ? e : new Fertig(/^(R |Das |Es |The |There |Die )/.test(t) ? t : rFehlerText(t));
    }
  });
}

/** Mehrebenen: Modelle vergleichen (ML): Nullmodell, feste Effekte, plus Wechselwirkungen, plus zufällige Steigung (`steigung` = Kennung einer Größe von `e.praed`, '' = keine). Nur für Messwerte, nicht für Ja/Nein. */
export async function mebVergleichRechnen(e: Mehrebenen, steigung: string, quelle: Quelle = jetzt()): Promise<MebVergleich> {
  const a = mebVergleichAuftrag(e, steigung, quelle.zeilen, quelle.spalten);
  if (a.binaer) throw new Fertig(rFehlerText('model comparison needs a measured outcome'));
  return nacheinander(async () => {
    try {
      await vorbereiten(a.spalten, R_PAKETE_MEB);
      const r = await motor.rechne<Record<string, unknown>>(`tryCatch(sp_meb_vergleich(d, ${rIds(a.feste)}, ${rIds(a.produkte)}, ${rQOderLeer(a.steigung)}), error = function(e) list(fehler = conditionMessage(e)))`);
      if (r.fehler) throw new Fertig(rFehlerText(String(eins(r.fehler))));
      return mebVergleichLesen(r, a.steigung ? steigung : '');
    } catch (x) {
      const t = (x as Error)?.message ?? String(x);
      throw x instanceof Fertig ? x : new Fertig(/^(R |Das |Es |The |There |Die )/.test(t) ? t : rFehlerText(t));
    }
  });
}

/* ---------- Ordinale, multinomiale und Zähldaten-Regression (MASS, nnet; Welle 3) ---------- */
const KAT_ANFANG = /^(R |Das |Es |The |There |Die |Eine |Wähle|Wählen|Choose|Der )/;
/** Gemeinsamer Ablauf: Daten bauen, Pakete laden, rechnen, Fehler als fertigen Satz weitergeben. */
export async function katRechnen<T>(pakete: string[], dt: { spalten: RSpalte[] }, aufruf: RAufruf | string, lesen: (r: Record<string, unknown>) => T): Promise<T> {
  return nacheinander(async () => {
    try {
      await vorbereiten(dt.spalten, pakete);
      const r = typeof aufruf === 'string' ? await motor.rechne<Record<string, unknown>>(aufruf) : await motor.rechne<Record<string, unknown>>(aufruf.code, aufruf.args);   // Text aus den Daten (Stufen, Referenz) geht als Argument, nie im Code
      if (r.fehler) throw new Fertig(rFehlerText(String(eins(r.fehler))));
      return lesen(r);
    } catch (e) {
      const t = (e as Error)?.message ?? String(e);
      throw e instanceof Fertig ? e : new Fertig(KAT_ANFANG.test(t) ? t : rFehlerText(t));
    }
  });
}
/** Ordinale Regression (Proportional-Odds-Modell, MASS::polr) mit Brant-Test. Zielstufen in der Ordnung von Statable, erste Stufe der Gruppen-Prädiktoren = Vergleich. */
export async function ordregRechnen(ziel: string, praed: string[], quelle: Quelle = jetzt()): Promise<OrdReg> {
  const dt = katDaten('ordreg', ziel, praed, quelle.zeilen, quelle.spalten);
  return katRechnen(R_PAKETE_ORD, dt, ordAufruf(dt), r => ordLesen(r, dt));
}
/** Multinomiale Regression (nnet::multinom). `referenz`: Beschriftung der Vergleichskategorie des Ziels. */
export async function multregRechnen(ziel: string, praed: string[], referenz: string, quelle: Quelle = jetzt()): Promise<MultReg> {
  const dt = katDaten('multreg', ziel, praed, quelle.zeilen, quelle.spalten);
  return katRechnen(R_PAKETE_MULT, dt, multAufruf(dt, referenz), r => multLesen(r, dt));
}
/** Zähldaten-Regression: Poisson oder negativ-binomial (`modell` 'auto' prüft die Überdispersion), optional mit Beobachtungszeit (Offset). */
export async function zaehlregRechnen(ziel: string, praed: string[], opt: { modell?: ZaehlModellWahl; zeit?: string } = {}, quelle: Quelle = jetzt()): Promise<ZaehlReg> {
  const dt = katDaten('zaehlreg', ziel, praed, quelle.zeilen, quelle.spalten, { zeit: opt.zeit });
  return katRechnen(R_PAKETE_ZAEHL, dt, zaehlAufruf(dt, opt.modell ?? 'auto'), r => ({ ...zaehlLesen(r, dt), ...(opt.zeit ? { offsetSpalte: opt.zeit } : {}) }));
}

/* ---------- Kurs-Paket: Diskriminanzanalyse, loglineare Modelle, MANOVA, Probit, gewichtete Regression (stats, MASS) ---------- */
/** Gemeinsamer Ablauf: Sperren vorab als Satz, R und Pakete laden (die Oberfläche zeigt dabei die Lade-Animation), Daten binden, rechnen, Antwort lesen. Ein Fehler wird zum fertigen Satz (`Fertig`).
 *  SICHERHEIT: `aufruf.code` enthält nur Wörter, Bezeichner und Zahlen; Text aus den Daten (Gruppen) geht als Argument (`aufruf.args`), nie in den Code. */
async function kpRechnen<E, C>(spalten: RSpalte[], pakete: string[], aufruf: RAufruf, lesen: (roh: unknown) => { ok: true; e: E } | { ok: false; code: C }, satz: (c: C) => string, sperre: string | null, armut = false): Promise<E> {
  if (sperre) throw new Fertig(sperre);
  return nacheinander(async () => {
    try {
      await vorbereiten(spalten, pakete, !armut, armut);
      const l = lesen(await motor.rechne<unknown>(aufruf.code, aufruf.args));
      if (!l.ok) throw new Fertig(satz(l.code));
      return l.e;
    } catch (e) {
      const t = (e as Error)?.message ?? String(e);
      throw e instanceof Fertig ? e : new Fertig(KAT_ANFANG.test(t) ? t : rFehlerText(t));
    }
  });
}
const ersteSperre = (p: { art: string; text: string }[]): string | null => p.find(x => x.art === 'sperre')?.text ?? null;
/** Diskriminanzanalyse (MASS::lda, ohne prior): Gruppenspalte und mindestens zwei Zahlenspalten. */
export async function diskriminanzRechnen(gruppe: string, merkmale: string[], quelle: Quelle = jetzt()): Promise<DiskrE> {
  const dt = diskrDaten(gruppe, merkmale, quelle.zeilen, quelle.spalten);
  return kpRechnen(dt.spalten, ['MASS'], diskrAufruf(dt), roh => diskrLesen(roh, dt), c => diskrFehlerSatz(c, { n: dt.n, p: dt.merkmale.length }), ersteSperre(diskrPunkte(dt)));
}
/** Loglineares Modell nach der Wahl (hierarchisch); R rechnet das gewählte Modell, Unabhängigkeit und alle Zweifach-Wechselwirkungen. */
export async function loglinearRechnen(faktoren: string[], haeuf: string | null, wahl: LogWahl, quelle: Quelle = jetzt()): Promise<LogE> {
  const dt = logDaten(faktoren, haeuf, quelle.zeilen, quelle.spalten);
  return kpRechnen(dt.spalten, [], logAufruf(dt, wahl), roh => logLesen(roh, dt, wahl), c => logCodeSatz(c, { zellen: dt.zellen, leer: dt.leer, n: dt.n }).text, ersteSperre(logPunkte(dt)));
}
/** MANOVA (stats::manova): eine Gruppenspalte, mindestens zwei Zielgrößen. */
export async function manovaRechnen(gruppe: string, ziele: string[], quelle: Quelle = jetzt()): Promise<ManovaE> {
  const dt = manovaDaten(gruppe, ziele, quelle.zeilen, quelle.spalten);
  return kpRechnen(dt.spalten, [], manovaAufruf(dt), roh => manovaLesen(roh, dt), c => manovaCodeSatz(c, { n: dt.n, q: dt.ziele.length, k: dt.gruppenN.length }).text, ersteSperre(manovaPunkte(dt)));
}
/** Probit-Regression (glm, binomial('probit'), epsilon 1e-12): Ziel mit zwei Werten, Ereignis = der größere Wert. */
export async function probitRechnen(ziel: string, praed: string[], quelle: Quelle = jetzt()): Promise<ProbitE> {
  const dt = probitDaten(ziel, praed, quelle.zeilen, quelle.spalten);
  return kpRechnen(dt.spalten, [], probitAufruf(dt), roh => probitLesen(roh, dt), c => probitFehlerSatz(c), ersteSperre(probitPunkte(dt)));
}
/** Gewichtete Regression mit Präzisionsgewichten (lm, weights). */
export async function wlsRechnen(ziel: string, praed: string[], gewicht: string, quelle: Quelle = jetzt()): Promise<WlsE> {
  const dt = wlsDaten(ziel, praed, gewicht, quelle.zeilen, quelle.spalten);
  return kpRechnen(dt.spalten, [], wlsAufruf(dt), roh => wlsLesen(roh, dt), c => wlsFehlerSatz(c), ersteSperre(wlsPunkte(dt)));
}

/** Nichtlineare Regression mit fester Formel (nls, nur stats): Ziel, genau eine Zahl als Vorhersage, eine der vier Formeln. */
export async function nlsRechnen(ziel: string, praed: string[], art: NlsArt | '', quelle: Quelle = jetzt()): Promise<NlsE> {
  const dt = nlsDaten(ziel, praed, art, quelle.zeilen, quelle.spalten);
  const sperre = ersteSperre(nlsPunkte(dt));
  if (sperre) throw new Fertig(sperre);   // vor dem Aufruf: ohne gültige Formel gibt es keinen R-Text
  return kpRechnen(dt.spalten, [], nlsAufruf(dt), roh => nlsLesen(roh, dt), c => nlsFehlerSatz(c), null);
}

/** Armut und Ungleichheit (survey): Einkommen, Gewicht (Pflicht), Klumpen und Schicht wahlweise. Ohne Klumpen und Schicht gilt „einzeln gezogen“. */
export async function armutRechnen(einkommen: string, gewicht: string, klumpen: string | null, schicht: string | null, quelle: Quelle = jetzt()): Promise<ArmutE> {
  const dt = armutDaten(einkommen, gewicht, klumpen, schicht, quelle.zeilen, quelle.spalten);
  return kpRechnen(dt.spalten, R_PAKETE_ARMUT, armutAufruf(dt), roh => armutLesen(roh, dt), c => armutFehlerSatz(c), ersteSperre(armutPunkte(dt)), true);
}

/* ---------- Quantilregression (quantreg) und Strafregression (glmnet; Später S-E) ---------- */
/** Wie `katRechnen`, aber mit eigenen Sätzen für die Fehler aus R (`satz`) und dem rohen Ergebnis als Rückgabe. */
async function eRechnen(pakete: string[], dt: { spalten: RSpalte[] }, aufruf: RAufruf, satz: (roh: string) => string): Promise<Record<string, unknown>> {
  return nacheinander(async () => {
    try {
      await vorbereiten(dt.spalten, pakete);
      const r = await motor.rechne<Record<string, unknown>>(aufruf.code, aufruf.args);   // Text aus den Daten (Faltungen) geht als Argument, nie im Code
      if (r.fehler) throw new Fertig(satz(String(eins(r.fehler))));
      return r;
    } catch (e) {
      const t = (e as Error)?.message ?? String(e);
      throw e instanceof Fertig ? e : new Fertig(KAT_ANFANG.test(t) ? t : rFehlerText(t));
    }
  });
}
/** Quantilregression: τ nebeneinander, Intervalle nach der Fallzahl (Bootstrap-Perzentil bis 1000 Fälle, darüber nid); die Rang-Umkehr fällt bei einem R-Fehler auf die Standardmethode zurück (Code `rueckfall-rang`). */
export async function quantilRechnen(ziel: string, praed: string[], opt: { tau: number[]; ki: QuantilKiWunsch }, quelle: Quelle = jetzt()): Promise<QuantilErgebnis> {
  const dt = katDaten('zaehlreg', ziel, praed, quelle.zeilen, quelle.spalten), n = strafVollstaendig(dt);
  let wahl = quantilKiWahl(n, opt.ki);
  const lauf = () => eRechnen(R_PAKETE_QUANTIL, dt, quantilAufruf(dt, { tau: opt.tau, ki: quantilKiR(wahl.ki), B: QR_B, startwert: QR_STARTWERT }), quantilFehlerSatz);
  let r = await lauf();
  if (wahl.ki === 'rang' && quantilRangFehler(r)) { wahl = quantilKiWahl(n, 'rang', { rangFehler: true }); r = await lauf(); }
  if (wahl.ki === 'nid' && quantilNidWarnung(r)) wahl = { ki: 'nid', codes: [...new Set<QuantilCode>([...wahl.codes, 'nid-warnung'])] };
  return quantilLesen(r, dt, { ki: wahl.ki, B: QR_B, startwert: QR_STARTWERT, codes: wahl.codes });
}
/** Ridge, Lasso, Elastic Net: Faltungen aus JavaScript (fester Startwert), λ nach der Wahl, Antwort mit Kurven und Pfad. */
export async function strafRechnen(ziel: string, praed: string[], opt: { alpha: number; regel: StrafRegel; standardisieren: boolean }, quelle: Quelle = jetzt()): Promise<StrafErgebnis> {
  const dt = katDaten('zaehlreg', ziel, praed, quelle.zeilen, quelle.spalten), n = strafVollstaendig(dt), K = strafK(n);
  if (K === null) throw new Fertig(strafCodeSatz('zu-wenig-faelle', { n }));
  const r = await eRechnen(R_PAKETE_STRAF, dt, strafAufruf(dt, { alpha: opt.alpha, foldids: strafAlleFaltungen(n, K, STRAF_STARTWERT, STRAF_WDH), regel: opt.regel, standardisieren: opt.standardisieren }), strafFehlerSatz);
  return strafLesen(r, dt, { K, R: STRAF_WDH, startwert: STRAF_STARTWERT });
}

/** Cox-Regression (survival::coxph, Efron) mit den Prädiktoren `praed`. `ereignisWert`: der Wert der Ereignisspalte, der das Ereignis ist (`null` = jeder gültige Wert). */
export async function coxRechnen(zeit: string, ereignis: string, ereignisWert: string | number | null, praed: string[], quelle: Quelle = jetzt()): Promise<CoxErgebnis> {
  const dt = coxDaten(zeit, ereignis, ereignisWert, praed, quelle.zeilen, quelle.spalten);
  return katRechnen(R_PAKETE_COX, dt, coxAufruf(dt), r => coxLesen(r, dt));
}

/** AFT-Modell (Später S-F2, survival::survreg) mit der gewählten Verteilung; dazu der AIC-Vergleich aller vier Verteilungen auf denselben Daten. Zeit muss größer als 0 sein. */
export async function aftRechnen(zeit: string, ereignis: string, ereignisWert: string | number | null, praed: string[], dist: AftVerteilung, quelle: Quelle = jetzt()): Promise<AftErgebnis> {
  const dt = aftDaten(zeit, ereignis, ereignisWert, praed, quelle.zeilen, quelle.spalten);
  return nacheinander(async () => {
    try {
      await vorbereiten(dt.spalten, R_PAKETE_COX);
      const code = aftAufruf(dt, dist);   // nur feste Wörter und Bezeichner (engine/rsicher.ts)
      const r = await motor.rechne<Record<string, unknown>>(code);
      if (r.fehler) throw new Fertig(rFehlerText(String(eins(r.fehler))));
      const aufruf = aftAicAufruf(dt);
      const v = await motor.rechne<Record<string, unknown>>(aufruf);
      return aftLesen(r, dt, v.fehler ? [] : aftVergleichLesen(v));
    } catch (e) {
      const t = (e as Error)?.message ?? String(e);
      throw e instanceof Fertig ? e : new Fertig(KAT_ANFANG.test(t) ? t : rFehlerText(t));
    }
  });
}
/** Cox-Regression mit Kennung (Später S-F2): `art` 'cluster' (robuste Standardfehler) oder 'gamma' (Gamma-Frailty). Die Kennung geht als Ganzzahl-Code nach R. */
export async function frailtyRechnen(zeit: string, ereignis: string, ereignisWert: string | number | null, kennung: string, praed: string[], art: FrailtyArt, ties: FrailtyBindung, quelle: Quelle = jetzt()): Promise<FrailtyErgebnis> {
  const dt = frailtyDaten(zeit, ereignis, ereignisWert, kennung, praed, quelle.zeilen, quelle.spalten);
  return katRechnen(R_PAKETE_COX, dt, frailtyAufruf(dt, art, ties), r => frailtyLesen(r, dt));
}

/** Cox-Regression mit zeitabhängiger Größe (Später S-F): `zeilen` in Zählprozess-Form (Umformer oder Tabelle in Intervall-Form), `wertName` die zeitabhängige Größe, `festNamen` die festen Größen (Zahlen).
 *  An R gehen nur Zahlen (Start, Stopp, Ereignis, Ganzzahl-Kennung, Werte); die Namen bleiben in JS. */
export async function coxZpRechnen(zeilen: ZpZeile[], opt: { wertName: string; festNamen: string[]; faktoren?: Record<string, string[]>; ties?: 'efron' | 'breslow' }): Promise<CoxErgebnis> {
  const dt = coxZpDaten(zeilen, opt);
  return katRechnen(R_PAKETE_COX, dt, coxZpAufruf(dt, opt.ties ?? 'efron'), r => coxLesen(r, dt));
}

/* ---------- Meta-Analyse (metafor) ---------- */
/** Rechnet die Meta-Analyse (Random-Effects, REML) aus den Studien der Eingabe; die Daten kommen nicht aus der Sitzung, sondern aus der Eingabetabelle. */
export async function metaRechnen(ein: MetaEingabe): Promise<Meta> {
  const zuViele = metaGrenzeText(ein.zeilen.length);   // vor dem Rechnen, nicht erst nach Minuten als R-Meldung
  if (zuViele) throw new Fertig(zuViele);
  return nacheinander(async () => {
    try {
      await vorbereiten(metaDaten(ein), R_PAKETE_META);
      const r = await motor.rechne<Record<string, unknown>>(`tryCatch(sp_meta(d, ${rWahl(ein.art, ['es', 'smd', 'r'] as const)}, ${rBool(!!ein.kh)}), error = function(e) list(fehler = conditionMessage(e)))`);
      if (r.fehler) throw new Fertig(rFehlerText(String(eins(r.fehler))));
      return metaLesen(r, ein);
    } catch (e) {
      const t = (e as Error)?.message ?? String(e);
      throw e instanceof Fertig ? e : new Fertig(/^(R |Das |Es |The |There |Die |Mindestens)/.test(t) ? t : rFehlerText(t));
    }
  });
}

/* ---------- CFA ---------- */
/** Vorab-Prüfung der Zuordnung: Text für den Fehler, sonst `null`. Nicht identifiziert = weniger Datenwerte als Unbekannte. */
export function cfaPruefung(faktoren: CfaFaktorDef[], n: number): string | null {
  const f = faktoren.filter(x => x.fragen.length);
  if (!f.length) return d('Ordne den Faktoren mindestens zwei Fragen zu.', 'Ordnen Sie den Faktoren mindestens zwei Fragen zu.', 'Assign at least two questions to the factors.');
  const klein = f.find(x => x.fragen.length < 2);
  if (klein) return L(`Der Faktor „${klein.name}“ hat nur eine Frage. Jeder Faktor braucht mindestens zwei, besser drei Fragen.`, `Factor "${klein.name}" has only one question. Every factor needs at least two, preferably three.`);
  const p = f.reduce((a, x) => a + x.fragen.length, 0), m = f.length;
  // Daten: p(p+1)/2 Werte. Unbekannte (Markerfragen fest): p − m Ladungen + p Restvarianzen + m Faktorvarianzen + m(m−1)/2 Faktorkorrelationen.
  const df = (p * (p + 1)) / 2 - (2 * p + (m * (m - 1)) / 2);
  if (df < 0) return rFehlerText('model is not identified');
  if (n < p + 1) return Lp(p, `Zu wenige Personen: ${n} für ${p} Frage.`, `Zu wenige Personen: ${n} für ${p} Fragen.`, `Too few people: ${n} for ${p} question.`, `Too few people: ${n} for ${p} questions.`);
  return null;
}

export async function cfaRechnen(faktoren: CfaFaktorDef[], opt: CfaOptionen = {}, quelle: Quelle = jetzt()): Promise<CfaErg> {
  const def = faktoren.filter(f => f.fragen.length);
  const alle = [...new Set(def.flatMap(f => f.fragen))];
  return nacheinander(async () => {
    try {
      await vorbereiten(rSpaltenVon(alle, quelle.zeilen, quelle.spalten));
      const nameVon = (q: string) => `v${alle.indexOf(q) + 1}`;   // Statables eigene Namen v1, v2 …; der Name der Frage bleibt in JS
      const rTeilFaktoren = rListeIds(def.map((f, i) => [`F${i + 1}`, f.fragen.map(nameVon)]));
      const r = await motor.rechne<Record<string, unknown>>(`tryCatch(sp_cfa(d, ${rTeilFaktoren}, ordinal = ${rBool(!!opt.ordinal)}, fiml = ${rBool(!!opt.fiml)}), error = function(e) list(fehler = conditionMessage(e)))`);
      if (r.fehler) throw new Fertig(rFehlerText(String(eins(r.fehler))));
      const f = r.fit as Record<string, unknown>;
      const fi = (k: string) => zahl(f[k]) ?? NaN;
      const fnr = (x: string) => Number(x.slice(1)) - 1;
      const lf = liste<string>(r.last_faktor), li = liste<string>(r.last_item);
      const ladungen: CfaLadung[] = lf.map((fk, i) => ({ faktor: fnr(fk), frage: alle[Number(li[i]!.slice(1)) - 1]!, std: liste<number>(r.last_std)[i]!, se: liste<number | null>(r.last_se)[i] ?? null, p: liste<number | null>(r.last_p)[i] ?? null, lo: liste<number | null>(r.last_lo)[i] ?? null, hi: liste<number | null>(r.last_hi)[i] ?? null }));
      const ka = liste<string>(r.kor_a), kb = liste<string>(r.kor_b);
      const kor: CfaKor[] = ka.map((a, i) => ({ a: fnr(a), b: fnr(kb[i]!), r: liste<number>(r.kor_r)[i]!, se: liste<number | null>(r.kor_se)[i] ?? null, p: liste<number | null>(r.kor_p)[i] ?? null }));
      if (ladungen.some(l => l.se === null)) throw new Fertig(rFehlerText('model is not identified (standard errors could not be computed)'));
      return {
        faktoren: def, schaetzer: eins(r.schaetzer) === 'WLSMV' ? 'WLSMV' : 'ML', fiml: !!opt.fiml && !opt.ordinal, n: zahl(r.n) ?? 0, nAlle: zahl(r.n_alle) ?? 0,
        fit: { chisq: fi('chisq'), df: fi('df'), p: fi('pvalue'), cfi: fi('cfi'), tli: fi('tli'), rmsea: fi('rmsea'), rmseaLo: fi('rmsea.ci.lower'), rmseaHi: fi('rmsea.ci.upper'), srmr: fi('srmr') },
        ladungen, kor, heywood: wahr(r.heywood), warnungen: liste<string>(r.warnungen)
      };
    } catch (e) {
      const t = (e as Error)?.message ?? String(e);
      throw e instanceof Fertig ? e : new Fertig(/^(R |Das |Omega|The |A |Die |Zu |Ordne|Der )/.test(t) ? t : rFehlerText(t));
    }
  });
}

/* ---------- Messinvarianz (S-J) ---------- */
export interface InvarianzStufe { name: 'konfigural' | 'metrisch' | 'skalar'; chisq: number; df: number; p: number; cfi: number; tli: number; rmsea: number; srmr: number }
export interface InvarianzErg {
  stufen: InvarianzStufe[];
  /** Chi-Quadrat-Differenztest metrisch gegen konfigural und skalar gegen metrisch */
  diff: { chisq: number; df: number; p: number }[];
  gruppen: { name: string; n: number }[];
  warnungen: string[];
  /** Abgestufte Antworten (WLSMV): die Stufen bedeuten konfigural, gleiche Schwellen, gleiche Schwellen und Ladungen */
  ordinal: boolean;
  /** Ladungen nach Größe des Unterschieds zwischen den Gruppen (Score-Test des metrischen Modells), größte zuerst */
  vorschlag: { frage: string; x2: number; p: number }[];
  /** Ergebnis mit freigegebenen Fragen (teilweise Invarianz): Stufen metrisch und skalar mit Freigabe, nach demselben Muster wie `stufen`/`diff` */
  teil: { frei: string[]; stufen: InvarianzStufe[]; diff: { chisq: number; df: number; p: number }[] } | null;
}
/** Gleiche Faktoren in mehreren Gruppen (lavaan, ML, Gruppen aus einer Spalte): konfigurale, metrische und skalare Invarianz. Gruppen sind Daten (Spalte `g`), kein Code. */
export async function invarianzRechnen(faktoren: CfaFaktorDef[], gruppenSpalte: string, frei: string[] = [], ordinal = false, quelle: Quelle = jetzt()): Promise<InvarianzErg> {
  const def = faktoren.filter(f => f.fragen.length);
  const alle = [...new Set(def.flatMap(f => f.fragen))];
  return nacheinander(async () => {
    try {
      const gi = quelle.spalten.findIndex(x => x.name === gruppenSpalte), gs = quelle.spalten[gi];
      if (!gs) throw new Fertig(L('Die Gruppenspalte fehlt.', 'The group column is missing.'));
      const gruppe: RSpalte = { name: 'g', art: 'text', werte: quelle.zeilen.map(z => { const w = z[gi]; if (w === null || w === undefined || w === '' || (typeof w === 'number' && istFehlend(gs, w))) return null; return gs.werteLabels[String(w)] ?? String(w); }) };
      await vorbereiten([...rSpaltenVon(alle, quelle.zeilen, quelle.spalten), gruppe]);
      const nameVon = (q: string) => `v${alle.indexOf(q) + 1}`;
      const rTeilFrei = frei.length ? `, frei = ${rIds(frei.filter(q => alle.includes(q)).map(nameVon))}` : '';
      const r = await motor.rechne<Record<string, unknown>>(`tryCatch(sp_invarianz(d, ${rListeIds(def.map((f, i) => [`F${i + 1}`, f.fragen.map(nameVon)]))}, ordinal = ${rBool(ordinal)}${rTeilFrei}), error = function(e) list(fehler = conditionMessage(e)))`);
      if (r.fehler) throw new Fertig(rFehlerText(String(eins(r.fehler))));
      const st = liste<string>(r.stufe), v = (k: string) => liste<number>(r[k]);
      const stufen = st.map((n, i) => ({ name: n as InvarianzStufe['name'], chisq: v('chisq')[i]!, df: v('df')[i]!, p: v('p')[i]!, cfi: v('cfi')[i]!, tli: v('tli')[i]!, rmsea: v('rmsea')[i]!, srmr: v('srmr')[i]! }));
      const diff = [0, 1].map(i => ({ chisq: v('diff_chisq')[i] ?? NaN, df: v('diff_df')[i] ?? NaN, p: v('diff_p')[i] ?? NaN }));
      const gn = liste<string>(r.gruppen), nn = liste<number>(r.n_gruppe);
      const zurueck = (v: string) => alle[Number(v.slice(1)) - 1] ?? v;
      const vs = r.vorschlag as Record<string, unknown> | null;
      const vorschlag = vs ? liste<string>(vs.item).map((it, i) => ({ frage: zurueck(it), x2: liste<number>(vs.x2)[i]!, p: liste<number>(vs.p)[i]! })) : [];
      const ts = r.teil as Record<string, unknown> | null;
      const tv = (k: string) => liste<number>(ts![k]);
      const teil = ts ? { frei: liste<string>(ts.frei).map(zurueck), stufen: ['metrisch', 'skalar'].map((n, i) => ({ name: n as InvarianzStufe['name'], chisq: tv('chisq')[i]!, df: tv('df')[i]!, p: tv('p')[i]!, cfi: tv('cfi')[i]!, tli: tv('tli')[i]!, rmsea: tv('rmsea')[i]!, srmr: tv('srmr')[i]! })), diff: [0, 1].map(i => ({ chisq: tv('diff_chisq')[i] ?? NaN, df: tv('diff_df')[i] ?? NaN, p: tv('diff_p')[i] ?? NaN })) } : null;
      return { stufen, diff, gruppen: gn.map((name, i) => ({ name, n: nn[i]! })), warnungen: liste<string>(r.warnungen), ordinal: !!eins(r.ordinal), vorschlag, teil };
    } catch (e) {
      const t = (e as Error)?.message ?? String(e);
      throw e instanceof Fertig ? e : new Fertig(/^(R |Das |Die |The |Zu )/.test(t) ? t : rFehlerText(t));
    }
  });
}

/* ---------- Wachstumskurvenmodell (B4 Teil 1) ---------- */
export interface WachstumErg {
  n: number; nAlle: number; zeit: number[]; beobMittel: number[]; modellMittel: number[];
  mittel: { i: { est: number; se: number | null; p: number | null; lo: number | null; hi: number | null }; s: { est: number; se: number | null; p: number | null; lo: number | null; hi: number | null } };
  varianz: { i: { est: number; se: number | null; p: number | null }; s: { est: number; se: number | null; p: number | null } };
  kov: { est: number; se: number | null; p: number | null; r: number | null };
  restVarianz: number[]; negativeVarianz: boolean;
  fit: { chisq: number; df: number; p: number; cfi: number | null; tli: number | null; rmsea: number | null; srmr: number | null; aic: number | null; bic: number | null } | null;
  warnungen: string[];
}
/** Lineares Wachstumskurvenmodell (lavaan, ML) für Messzeitpunkte in der Reihenfolge von `spalten`; `zeit` = Zeitwert je Spalte (Achsenabschnitt gilt beim Zeitwert 0). Namen aus Dateien nur als Daten, im R-Code v1, v2 … */
export async function wachstumRechnen(spalten: string[], zeit: number[], gleichRest = false, fiml = false, quelle: Quelle = jetzt()): Promise<WachstumErg> {
  return nacheinander(async () => {
    try {
      await vorbereiten(rSpaltenVon(spalten, quelle.zeilen, quelle.spalten));
      const ids = spalten.map((_, i) => `v${i + 1}`), rTeilZeit = zeit.map(z => rZahl(z)).join(', ');
      const r = await motor.rechne<Record<string, unknown>>(`tryCatch(sp_wachstum(d[, ${rIds(ids)}, drop = FALSE], zeit = c(${rTeilZeit}), gleich_rest = ${rBool(gleichRest)}, fiml = ${rBool(fiml)}), error = function(e) list(fehler = conditionMessage(e)))`);
      if (r.fehler) throw new Fertig(rFehlerText(String(eins(r.fehler))));
      const v = (k: string) => liste<number | null>(r[k]);
      const nm = liste<string>(r.mw_name), vn = liste<string>(r.var_name);
      const mw = (n: string) => { const i = nm.indexOf(n); return { est: v('mw_est')[i]!, se: v('mw_se')[i] ?? null, p: v('mw_p')[i] ?? null, lo: v('mw_lo')[i] ?? null, hi: v('mw_hi')[i] ?? null }; };
      const va = (n: string) => { const i = vn.indexOf(n); return { est: v('var_est')[i]!, se: v('var_se')[i] ?? null, p: v('var_p')[i] ?? null }; };
      const f = r.fit as Record<string, unknown> | null, fi = (k: string) => (f ? zahl(f[k]) : null);
      return {
        n: zahl(r.n) ?? 0, nAlle: zahl(r.n_alle) ?? 0, zeit: v('zeit') as number[], beobMittel: v('beob_mw') as number[], modellMittel: v('impl_mw') as number[],
        mittel: { i: mw('i'), s: mw('s') }, varianz: { i: va('i'), s: va('s') },
        kov: { est: zahl(r.kov_est) ?? NaN, se: zahl(r.kov_se), p: zahl(r.kov_p), r: zahl(r.kov_std) },
        restVarianz: v('rest_var') as number[], negativeVarianz: !!eins(r.neg_var),
        fit: f ? { chisq: fi('chisq') ?? NaN, df: fi('df') ?? 0, p: fi('pvalue') ?? NaN, cfi: fi('cfi'), tli: fi('tli'), rmsea: fi('rmsea'), srmr: fi('srmr'), aic: fi('aic'), bic: fi('bic') } : null,
        warnungen: liste<string>(r.warnungen)
      };
    } catch (e) {
      const t = (e as Error)?.message ?? String(e);
      throw e instanceof Fertig ? e : new Fertig(/^(R |Das |Die |The |Zu |Ein |A )/.test(t) ? t : rFehlerText(t));
    }
  });
}

/* ---------- Pfadmodell (S-J S1) ---------- */
export interface PfadZeile { von: string; nach: string; est: number; se: number | null; z: number | null; p: number | null; lo: number | null; hi: number | null; std: number | null }
export interface PfadEffekt { art: 'indirect' | 'total'; pfad: string[]; est: number; se: number | null; p: number | null; lo: number | null; hi: number | null; std: number | null }
export interface PfadErg {
  n: number; nAlle: number; pfade: PfadZeile[]; effekte: PfadEffekt[]; r2: { variable: string; r2: number }[];
  /** Messmodell: Ladungen der Fragen auf die Faktoren (nur mit latenten Faktoren) */
  ladungen: { faktor: string; frage: string; est: number; std: number | null; se: number | null }[];
  df: number; fit: { chisq: number; df: number; p: number; cfi: number | null; tli: number | null; rmsea: number | null; srmr: number | null } | null; warnungen: string[]
  /** Zahl der Bootstrap-Ziehungen, mit denen die Intervalle der Effekte gerechnet wurden (0 = Delta-Methode) */
  boot: number
  /** Vergleich mit dem Modell, in dem die gewählten Pfade 0 sind (Chi-Quadrat-Differenz, AIC, BIC); null, wenn keine gewählt oder nicht gerechnet */
  vergleich: { k: number; dchisq: number; ddf: number; p: number | null; chisq0: number; df0: number; aic: number; aic0: number; bic: number; bic0: number } | null
}
/** Pfadmodell mit beobachteten Variablen (lavaan, ML): `modell[i]` = Ziel-Variable mit ihren Vorhersagegrößen (Spaltennamen). Namen aus Dateien nur als Daten, im R-Code nur v1, v2 … */
export async function pfadRechnen(modell: { ziel: string; praed: string[] }[], fiml = false, faktoren: { id: string; fragen: string[] }[] = [], boot = 0, nullen: { ziel: string; praed: string[] }[] = [], quelle: Quelle = jetzt()): Promise<PfadErg> {
  const istF = (n: string) => faktoren.some(f => f.id === n);
  const beob = [...new Set([...modell.flatMap(m => [m.ziel, ...m.praed]).filter(n => !istF(n)), ...faktoren.flatMap(f => f.fragen)])];
  return nacheinander(async () => {
    try {
      await vorbereiten(rSpaltenVon(beob, quelle.zeilen, quelle.spalten));
      const fk = (n: string) => `F${faktoren.findIndex(f => f.id === n) + 1}`;
      const nameVon = (q: string) => (istF(q) ? fk(q) : `v${beob.indexOf(q) + 1}`), zurueck = (v: string) => (/^F\d+$/.test(v) ? faktoren[Number(v.slice(1)) - 1]!.id : beob[Number(v.slice(1)) - 1]!);
      const rTeilFaktorenPfad = faktoren.length ? `, faktoren = ${rListeIds(faktoren.map(f => [fk(f.id), f.fragen.map(nameVon)]))}` : '';
      const rTeilNullPfade = nullen.length ? `, nullpfade = ${rListeIds(nullen.map(m => [nameVon(m.ziel), m.praed.map(nameVon)]))}` : '';
      const r = await motor.rechne<Record<string, unknown>>(`tryCatch(sp_pfad(d, ${rListeIds(modell.map(m => [nameVon(m.ziel), m.praed.map(nameVon)]))}, fiml = ${rBool(fiml)}${rTeilFaktorenPfad}, boot = ${rGanz(boot)}${rTeilNullPfade}), error = function(e) list(fehler = conditionMessage(e)))`);
      if (r.fehler) throw new Fertig(rFehlerText(String(eins(r.fehler))));
      const v = (k: string) => liste<number | null>(r[k]);
      const von = liste<string>(r.von), nach = liste<string>(r.nach);
      const pfade: PfadZeile[] = von.map((a, i) => ({ von: zurueck(a), nach: zurueck(nach[i]!), est: v('est')[i]!, se: v('se')[i] ?? null, z: v('z')[i] ?? null, p: v('p')[i] ?? null, lo: v('lo')[i] ?? null, hi: v('hi')[i] ?? null, std: v('std')[i] ?? null }));
      const en = liste<string>(r.eff_name), ea = liste<string>(r.eff_art), ep = liste<string>(r.eff_pfad);
      const effekte: PfadEffekt[] = en.map((_, i) => ({ art: ea[i] === 'total' ? 'total' : 'indirect', pfad: ep[i]!.split('>').map(zurueck), est: v('eff_est')[i]!, se: v('eff_se')[i] ?? null, p: v('eff_p')[i] ?? null, lo: v('eff_lo')[i] ?? null, hi: v('eff_hi')[i] ?? null, std: v('eff_std')[i] ?? null }));
      const rv = liste<string>(r.r2_var), r2 = liste<number>(r.r2), lf = liste<string>(r.last_faktor), li = liste<string>(r.last_item);
      const f = r.fit as Record<string, unknown> | null, fi = (k: string) => (f ? zahl(f[k]) : null);
      return {
        n: zahl(r.n) ?? 0, nAlle: zahl(r.n_alle) ?? 0, pfade, effekte, r2: rv.filter(a => /^(v|F)\d+$/.test(a)).map(a => ({ variable: zurueck(a), r2: r2[rv.indexOf(a)]! })), df: zahl(r.df) ?? 0,
        boot: zahl(r.boot) ?? 0,
        vergleich: r.vergleich ? (() => { const g = r.vergleich as Record<string, unknown>; return { k: zahl(g.k) ?? 0, dchisq: zahl(g.dchisq) ?? NaN, ddf: zahl(g.ddf) ?? 0, p: zahl(g.p), chisq0: zahl(g.chisq0) ?? NaN, df0: zahl(g.df0) ?? 0, aic: zahl(g.aic) ?? NaN, aic0: zahl(g.aic0) ?? NaN, bic: zahl(g.bic) ?? NaN, bic0: zahl(g.bic0) ?? NaN }; })() : null,
        ladungen: lf.map((fa, i) => ({ faktor: zurueck(fa), frage: zurueck(li[i]!), est: v('last_est')[i]!, std: v('last_std')[i] ?? null, se: v('last_se')[i] ?? null })),
        fit: f ? { chisq: fi('chisq') ?? NaN, df: fi('df') ?? 0, p: fi('pvalue') ?? NaN, cfi: fi('cfi'), tli: fi('tli'), rmsea: fi('rmsea'), srmr: fi('srmr') } : null,
        warnungen: liste<string>(r.warnungen)
      };
    } catch (e) {
      const t = (e as Error)?.message ?? String(e);
      throw e instanceof Fertig ? e : new Fertig(/^(R |Das |Die |The |Zu )/.test(t) ? t : rFehlerText(t));
    }
  });
}

/** Vorschlag für die Zuordnung aus der explorativen Lösung (Hauptkomponenten): je Gruppe die Fragen, Namen „Faktor 1“ … ; höchstens fünf, Gruppen mit weniger als zwei Fragen entfallen. */
export function zuordnungAusFaktoren(gruppen: { nr: number; fragen: { name: string }[] }[], spaltenNamen: string[], bezeichne: (n: string) => string, volleBezeichnung: (n: string) => string | undefined = () => undefined): CfaFaktorDef[] {
  // Im Ergebnis steht die Anzeige „pa1 · Text“ (itemAnzeige), nicht der Spaltenname: alle Schreibweisen einer Spalte gelten.
  const roh = (n: string) => spaltenNamen.find(x => x === n || bezeichne(x) === n || volleBezeichnung(x) === n || itemAnzeige(x, volleBezeichnung(x)) === n) ?? n;
  return gruppen.filter(g => g.fragen.length >= 2).slice(0, 5).map((g, i) => ({ name: L(`Faktor ${i + 1}`, `Factor ${i + 1}`), fragen: g.fragen.map(q => roh(q.name)) }));
}

/* ---------- Einordnung der Fit-Werte ---------- */
/** Faustregeln nach Hu & Bentler (1999): CFI/TLI ≥ ,95; RMSEA ≤ ,06; SRMR ≤ ,08. „Akzeptabel“: CFI/TLI ≥ ,90, RMSEA ≤ ,08, SRMR ≤ ,10 (Browne & Cudeck 1993; weiche Grenze).
 *  ⚠ Von der Fachperson abzunehmen. Es sind Faustregeln, keine Tests. */
export const FIT_GRENZEN = { cfi: 0.95, tli: 0.95, rmsea: 0.06, srmr: 0.08 };
export type FitUrteil = 'gut' | 'akzeptabel' | 'unzureichend';
export function fitUrteil(f: CfaFit): FitUrteil {
  if (f.cfi >= 0.95 && f.tli >= 0.95 && f.rmsea <= 0.06 && f.srmr <= 0.08) return 'gut';
  if (f.cfi >= 0.9 && f.tli >= 0.9 && f.rmsea <= 0.08 && f.srmr <= 0.1) return 'akzeptabel';
  return 'unzureichend';
}
export const fitErfuellt = (f: CfaFit) => ({ cfi: f.cfi >= FIT_GRENZEN.cfi, tli: f.tli >= FIT_GRENZEN.tli, rmsea: f.rmsea <= FIT_GRENZEN.rmsea, srmr: f.srmr <= FIT_GRENZEN.srmr });
