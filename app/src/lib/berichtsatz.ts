import { istFehlend } from './fehlend';
import { L, Lp, mitFlag, s, spalteNach, type Blatt } from './sitzung.svelte';
import { dez } from '../i18n/profil';
import { lesbar } from './verzeichnis';
import type { TableItem } from '../engine/types';
import { saetzeOhneStreuung, saetzePraePost, saetzeKappa, saetzeIcc, saetzeZweiGruppen, saetzeAnova, saetzeZusammenhang, saetzeVorhersage, saetzeLogistik, saetzeSkala, saetzeFaktoren, saetzeKreuz, saetzeVerteilung, type Saetze, type ZweiGruppen, type Anova, type PraePost, type Kappa, type IccErgebnis, type Zusammenhang, type Vorhersage, type Logistik, type Skala, type Faktoren, type Kreuz, type Verteilung } from './ergebnis';

import type { Messwiederholung } from './messwiederholung';
import type { Mediation } from './mediation';
import type { Moderation } from './moderation';
import { mitRisiko, tabellenRisiko } from './risikosaetze';
import { mitMasse, tabellenMasse } from './massesaetze';
import { mitSchicht, tabellenSchicht } from './schichtsaetze';
import { mitTypicalError, tabellenTypicalError } from './typicalerrorsaetze';
import { mitAnpassung, tabellenAnpassung } from './anpassungsaetze';
import { mitEinstichprobe } from './einstichprobe';
import { mitKursTests } from './kurstests';
import { tabellenRobust } from './robustsaetze';
import { tabellenVielfalt } from './diversitaetsaetze';
import { tabelleDiagnose as tabellenDiagnose, tabelleBlandAltman as tabellenBlandAltman } from './guetetabellen';
import { saetzeMediation, tabellenMediation, saetzeModeration, tabellenModeration } from './medmodsaetze';
import { saetzeProzess, tabellenProzess } from './prozesssaetze';
import type { Prozess } from './prozess';
import type { Einzelfall } from './einzelfall';
import type { Kaplan } from './ueberleben';
import { saetzeKaplan, tabellenKaplan } from './ueberlebensaetze';
import type { Mehrfach } from './mehrfach';
import { saetzeMehrfach, saetzeMitMehrfach, tabellenMehrfach } from './mehrfachsaetze';
import { saetzeEinzelfall, tabellenEinzelfall } from './einzelfallsaetze';
import { bayesZweiGruppen, bayesPraePost, bayesZusammenhang, bayesVorhersage, bayesAnova, type BayesZeile } from './bayessaetze';
import { saetzeMesswiederholung, tabellenMesswiederholung, mwNamen, tabelle, fx, fo, fp, fd } from './mwsaetze';
import { mitOmega, mitCfa, tabellenOmega, tabellenCfa } from './rsaetze';
import { mitSplitHalf, tabellenSplitHalf } from './splithalf-saetze';
import { saetzeMehrebenen, tabellenMehrebenen } from './mehrebenensaetze';
import type { Mehrebenen } from './mehrebenen';
import { saetzeMeta, tabellenMeta } from './metasaetze';
import type { Meta } from './metaanalyse';
import { eigeneTabellen, hatR } from './eigenercode';
import { saetzeAnova2, saetzeAncova, tabellenAnova2, tabellenAncova, type Anova2E, type AncovaE } from './anova2saetze';
import { saetzeHierreg, tabellenHierreg } from './hierregsaetze';
import { saetzeKategreg, tabellenKategreg } from './kategregsaetze';
import { saetzeQuantil, tabellenQuantil } from './quantilsaetze';   // Später S-E
import { saetzeStraf, tabellenStraf } from './strafregsaetze';
import type { QuantilErgebnis } from './quantil';
import type { StrafErgebnis } from './strafreg';
import type { OrdReg, MultReg, ZaehlReg } from './kategreg';
import type { Hierreg } from './hierreg';
import { tabellenAnovaZusatz } from './posthocsaetze';
import { kleinste, groesste } from './menge';
import { saetzeRang, tabellenRang } from './rangsaetze';
import type { KruskalWallis, MannWhitney, RangErgebnis, Wilcoxon } from './rangtests';
import type { KorrMatrix } from './korrmatrix';
import { saetzeKorrMatrix, tabellenKorrMatrix } from './korrmatrixsaetze';
import { saetzeFaelle, tabellenFaelle, tabelleAlleFaelle } from './faellesaetze';
import { faelleVonBlatt, type FaelleErgebnis } from './faelledaten';
import { bildeGruppen } from './faelle';
import { saetzeTost, tabellenTost, saetzeRci, tabellenRci, apaTost, apaRci } from './aequisaetze';
import type { TostAnzeige, RciAnzeige } from './aequirci';
import { saetzeInter, mitInter, tabellenInter, type Inter } from './intercodersaetze';
import { saetzeMcNemar, tabellenMcNemar, saetzeCochran, tabellenCochran } from './jaNeinSaetze';
import type { McNemarE, CochranE } from './janein';
import type { Friedman } from './friedman';
import { saetzeTabelle, tabellenTabelle, berechnetVon as tabelleBerechnet } from './tabellenblatt';   // Später S-C: Tabelle zusammenstellen
import { saetzeAmtlich, tabellenAmtlich } from './amtlichblatt';   // M5a: Tabelle für die Veröffentlichung
import { saetzeKategorien, tabellenKategorien } from './kategoriensaetze';   // Welle 4, G7: Offene Antworten ordnen
import { saetzeZeitreihe, tabellenZeitreihe, type ZeitreiheE } from './zeitreiheblatt';   // Später S-E: Zeitreihen
import { saetzeCluster, tabellenCluster, type ClusterE } from './clusterblatt';   // Später S-E: Clusteranalyse
import type { KatAnzeige } from './kategorienblatt';
import { saetzeDiskr, tabellenDiskr, type DiskrE } from './diskriminanz';   // Kurs-Paket (Fachblatt KURSPAKET)
import { saetzeLog, tabellenLog, type LogE } from './loglinear';
import { saetzeManova, tabellenManova, type ManovaE } from './manova';
import { saetzeArmut, tabellenArmut, type ArmutE } from './armut';   // Abschnitt 3: Armut und Ungleichheit
import { saetzeProbit, tabellenProbit, type ProbitE } from './probit';
import { saetzeWls, tabellenWls, type WlsE } from './wls';
import { saetzeNls, tabellenNls, type NlsE } from './nls';
import { saetzeGewichtet, tabellenGewichtet, gewichtetN, type GewichtetE } from './gewichtbeschreibend';
import { gewichtBerichtSatz } from './gewichte';
import { saetzeZufall, tabellenZufall } from './zufallsaetze';
import type { ZufallErgebnis } from './zufallslauf';

type Erg = { typ: 'zwei-gruppen'; e: ZweiGruppen; rang?: MannWhitney; tost?: TostAnzeige } | { typ: 'anova'; e: Anova; rang?: KruskalWallis } | { typ: 'zusammenhang'; e: Zusammenhang } | { typ: 'vorhersage'; e: Vorhersage } | { typ: 'hierreg'; e: Hierreg } | { typ: 'ordreg'; e: OrdReg } | { typ: 'quantil'; e: QuantilErgebnis } | { typ: 'penal'; e: StrafErgebnis } | { typ: 'multreg'; e: MultReg } | { typ: 'zaehlreg'; e: ZaehlReg } | { typ: 'logistik'; e: Logistik } | { typ: 'skala'; e: Skala } | { typ: 'faktor'; e: Faktoren } | { typ: 'kreuz'; e: Kreuz } | { typ: 'verteilung'; e: Verteilung }
  | { typ: 'prae-post'; e: PraePost; rang?: Wilcoxon; tost?: TostAnzeige; rci?: RciAnzeige } | { typ: 'kappa'; e: Kappa } | { typ: 'inter'; e: Inter } | { typ: 'icc'; e: IccErgebnis } | { typ: 'messwiederholung'; e: Messwiederholung; rang?: Friedman } | { typ: 'mcnemar'; e: McNemarE } | { typ: 'cochran'; e: CochranE } | { typ: 'mediation'; e: Mediation } | { typ: 'prozess'; e: Prozess } | { typ: 'moderation'; e: Moderation } | { typ: 'einzelfall'; e: Einzelfall } | { typ: 'mehrebenen'; e: Mehrebenen } | { typ: 'meta'; e: Meta } | { typ: 'kaplanmeier'; e: Kaplan } | { typ: 'mehrfach'; e: Mehrfach } | { typ: 'korrmatrix'; e: KorrMatrix } | { typ: 'anova2'; e: Anova2E } | { typ: 'ancova'; e: AncovaE }
  | { typ: 'faelle'; e: FaelleErgebnis }
  | { typ: 'zeitreihen'; e: ZeitreiheE } | { typ: 'cluster'; e: ClusterE }
  | { typ: 'diskriminanz'; e: DiskrE } | { typ: 'loglinear'; e: LogE } | { typ: 'manova'; e: ManovaE } | { typ: 'armut'; e: ArmutE } | { typ: 'probit'; e: ProbitE } | { typ: 'wls'; e: WlsE } | { typ: 'nls'; e: NlsE }
  | { typ: 'gewichtet'; e: GewichtetE }   // Umfragegewicht: nur beschreibend (lib/gewichtbeschreibend.ts)
  | { typ: 'ohne-streuung'; art: 'zwei-gruppen' | 'zusammenhang' | 'prae-post' | 'uebereinstimmung' | 'messwiederholung'; spalte: string; rang?: Wilcoxon; grund?: 'einPaar' | 'keinUnterschied' };

/** Gruppe mit 0/1-Kodierung wie in der Probeprüfung (oder genau zwei benannten Werten im Abstand 1): [Name tief, Name hoch]. */
function paar(n: string): [string, string] | null {
  const sp = spalteNach(n) ?? s.spalten.find(x => x.bezeichnung === n); if (!sp) return null; // die Koeffizienten-Tabelle nennt die Bezeichnung
  const w = Object.entries(sp.werteLabels).map(([k, v]) => [Number(k), v] as const).filter(([k]) => !Number.isNaN(k) && !istFehlend(sp, k)).sort((a, b) => a[0] - b[0]);
  const null1 = [w.find(([k]) => k === 0), w.find(([k]) => k === 1)];
  if (null1[0] && null1[1]) return [null1[0][1], null1[1][1]]; // 0/1-Kodierung, auch wenn ein weiteres Etikett (z. B. „keine Angabe“) unbenutzt dabeisteht
  return w.length === 2 && w[1]![0] - w[0]![0] === 1 ? [w[0]![1], w[1]![1]] : null;
}

/** Anzeigename eines Werts der Spalte: Wertebeschriftung, sonst der Wert (Zahlen ohne „.00“). */
export function wertName(spaltenName: string, w: string): string {
  const sp = spalteNach(spaltenName); const l = sp?.werteLabels;
  return l?.[w] ?? l?.[String(Number(w))] ?? (Number.isFinite(Number(w)) && w.trim() !== '' ? dez(String(Number(w))) : w);
}

/** Die Gruppen der Varianzanalyse mit lesbaren Namen: Wertebeschriftung, sonst die Zahl ohne „.0“ (PSPP schreibt „1.0“ und „.5“). */
function anovaMitNamen(e: Anova): Anova {
  return { ...e, gruppen: e.gruppen.map(g => ({ ...g, name: wertName(e.gruppenSpalte, g.name) })) };
}

/** Der Rangtest dieses Blatts, wenn er gewählt ist und gerechnet vorliegt (Mann-Whitney, Kruskal-Wallis, Wilcoxon); sonst `null`. */
export function rangVon(b: Blatt): RangErgebnis | null {
  const erg = b.ergebnis as ({ typ?: string; rang?: RangErgebnis } | null);
  return b.rang && erg?.rang && (erg.typ === 'zwei-gruppen' || erg.typ === 'anova' || erg.typ === 'prae-post' || erg.typ === 'messwiederholung' || erg.typ === 'ohne-streuung') ? erg.rang : null;
}
/** Anzeigenamen der Gruppen im Kruskal-Wallis-Ergebnis (Wertebeschriftung der Gruppenspalte, in der gewählten Sprache). */
const rangGruppen = (r: RangErgebnis): string[] => (r.art === 'kruskal-wallis' || r.art === 'median' || r.art === 'jt' || r.art === 'ks' ? (r.werte as string[]).map((w, i) => wertName(r.gruppenSpalte, w) || r.gruppen[i]!.name) : []);
const rangName = (n: string) => lesbar(spalteNach(n), true);

/** Die Sätze zu einem Blatt - jedes Mal neu, damit sie der aktuellen Sprache folgen. Äquivalenztest und RCI (G15, G16) hängen ihre Angaben an die APA-Zeile. */
export function saetzeZu(b: Blatt): Saetze | null {
  const st = saetzeZuKern(b), z = zusatzErgebnis(b), nm = (n: string) => lesbar(spalteNach(n), true);
  const zf = zufallVon(b), mehr = [...(z.tost ? [apaTost(z.tost, nm)] : []), ...(z.rci ? [apaRci(z.rci)] : []), ...(zf ? [saetzeZufall(zf, nm).apa] : [])];
  return st && st.apa && mehr.length ? { ...st, apa: [st.apa, ...mehr].join('; ') } : st;
}
function saetzeZuKern(b: Blatt): Saetze | null {
  const rang = rangVon(b);
  if (rang) return saetzeRang(rang, rangName, rangGruppen(rang));   // Rangtest: kein Bayes-Faktor (der gehört zum t-Test)
  const st = saetzeOhneBayes(b);
  if (!st || !s.einst.bayes) return st;
  const erg = b.ergebnis as Erg | null;
  let z: BayesZeile | null = null;
  try { z = erg?.typ === 'zwei-gruppen' ? bayesZweiGruppen(erg.e) : erg?.typ === 'prae-post' ? bayesPraePost(erg.e) : erg?.typ === 'zusammenhang' ? bayesZusammenhang(erg.e) : erg?.typ === 'vorhersage' ? bayesVorhersage(erg.e) : erg?.typ === 'anova' ? bayesAnova(erg.e) : null; } catch { z = null; }
  return z ? { ...st, apa: `${st.apa}, ${z.kurz}`, bayes: z } : st;
}

function saetzeOhneBayes(b: Blatt): Saetze | null {
  if (b.art === 'kategorien') { const k = (b.ergebnis as { e?: KatAnzeige } | null)?.e; return k ? saetzeKategorien(k) : null; }   // Welle 4, G7
  if (b.art === 'tabelle') return saetzeTabelle(b);   // Später S-C: Tabelle zusammenstellen
  if (b.art === 'amtlich') return saetzeAmtlich(b);   // M5a: nur die veröffentlichbare Fassung
  const erg = b.ergebnis as Erg | null;
  const name = (n: string) => lesbar(spalteNach(n), true);
  switch (erg?.typ) {
    case 'zwei-gruppen': return saetzeZweiGruppen(erg.e, name);
    case 'anova': return saetzeAnova(anovaMitNamen(erg.e), name, b.ph, b.phKontrolle);
    case 'anova2': return saetzeAnova2(erg.e, name);
    case 'ancova': return saetzeAncova(erg.e, name);
    case 'zusammenhang': return saetzeZusammenhang(erg.e, name);
    case 'prae-post': return saetzePraePost(erg.e, name);
    case 'kappa': return mitInter(saetzeKappa(erg.e, name), erg.e.inter, w => wertName(erg.e.a, String(w)));
    case 'inter': return saetzeInter(erg.e, w => wertName(erg.e.spalten[0]!, String(w)));
    case 'icc': return mitTypicalError(saetzeIcc(erg.e), erg.e.te, erg.e.teBericht, name(erg.e.spalten[0]!), name(erg.e.spalten[1]!));
    case 'mediation': return saetzeMediation(erg.e);
    case 'prozess': return saetzeProzess(erg.e);
    case 'moderation': return saetzeModeration(erg.e);
    case 'einzelfall': return saetzeEinzelfall(erg.e);
    case 'mehrebenen': return saetzeMehrebenen(erg.e, name);
    case 'meta': return saetzeMeta(erg.e);
    case 'kaplanmeier': return saetzeKaplan(erg.e, name);
    case 'zeitreihen': return saetzeZeitreihe(erg.e, name);
    case 'cluster': return saetzeCluster(erg.e, name);
    case 'diskriminanz': return saetzeDiskr(erg.e, name);
    case 'loglinear': return saetzeLog(erg.e, name);
    case 'manova': return saetzeManova(erg.e, name);
    case 'armut': return saetzeArmut(erg.e, name);
    case 'probit': return saetzeProbit(erg.e, name);
    case 'wls': return saetzeWls(erg.e, name);
    case 'nls': return saetzeNls(erg.e, name);
    case 'korrmatrix': return saetzeKorrMatrix(erg.e, name);
    case 'faelle': { const f = faelleVonBlatt(b); return saetzeFaelle(f, bildeGruppen(f)); }
    case 'messwiederholung': { const n = mwNamen(erg.e); return saetzeMesswiederholung(erg.e, n.zn, n.gruppenName); }
    case 'mcnemar': return saetzeMcNemar(erg.e, name);
    case 'cochran': return saetzeCochran(erg.e, name);
    case 'vorhersage': return saetzeVorhersage(erg.e, name, paar);
    case 'hierreg': return saetzeHierreg(erg.e, name);
    case 'ordreg': case 'multreg': case 'zaehlreg': return saetzeKategreg(erg.e, name);
    case 'quantil': return saetzeQuantil(erg.e, name);
    case 'penal': return saetzeStraf(erg.e, name);
    case 'logistik': return saetzeLogistik(erg.e, name, wertName);
    case 'skala': return mitSplitHalf(mitOmega(saetzeSkala(erg.e), erg.e.omega), erg.e.splitHalf);
    case 'faktor': return mitCfa(saetzeFaktoren(erg.e), erg.e.cfa);
    case 'kreuz': return mitSchicht(mitMasse(mitRisiko(saetzeKreuz(erg.e), erg.e), erg.e), erg.e);
    case 'verteilung': return mitKursTests(mitEinstichprobe(mitAnpassung(erg.e.mehrfach?.length ? saetzeMitMehrfach(erg.e, saetzeVerteilung) : saetzeVerteilung(erg.e), erg.e), erg.e), erg.e);
    case 'mehrfach': return saetzeMehrfach(erg.e);
    case 'gewichtet': return saetzeGewichtet(erg.e, name, (sp, w) => wertName(sp, String(w)));
    case 'ohne-streuung': return saetzeOhneStreuung(erg.art, name(erg.spalte), { grund: erg.grund, rang: !!erg.rang });
    default: return null;
  }
}

/** Ergebnissatz, danach die APA-Zeile („Statistik: …“), für Bericht, PDF und Word. */
export function berichtSatz(b: Blatt): string {
  const st = saetzeZu(b);
  if (!st) return '';
  if (!st.apa) return st.haupt;   // ohne Zahl (Spalte ohne Streuung)
  // Satz und APA-Angabe stehen getrennt: erst der Satz, dann „Statistik: …“ (Abnahme 3, M6). Früher wurde die APA-Angabe in die letzte Klammer des Satzes geschoben;
  // das ergab Klammern in Klammern, bei Intervallen eine zerbrochene Klammer und bei Meta-Analyse/Kaplan-Meier doppelte Werte.
  // Steht am Satzende eine Klammer mit „=“ (Skala: „(Cronbachs Alpha = ,86)“), nennt die Statistik-Zeile denselben Wert - die Klammer entfällt dann im Satz.
  // Eine Klammer ohne „=“ (Kreuztabelle: „(55 %)“, Intervall, Test-Name) gehört zum Satz und bleibt.
  const satz = st.haupt.replace(/\.$/, '').replace(/ \([^()]*=[^()]*\)$/, '');
  return `${satz}. ${st.ereignis ? st.ereignis + ' ' : ''}${L('Statistik', 'Statistics')}: ${st.apa}.${zusatzSaetze(b).map(x => ' ' + x).join('')}`;
}

/** Welle S-B, L5: das Ergebnis des Zufallsverfahrens (Permutationstest, Bootstrap), wenn es gewählt und gerechnet ist; sonst `undefined`. */
export function zufallVon(b: Blatt): ZufallErgebnis | undefined {
  const erg = b.ergebnis as { zufall?: ZufallErgebnis } | null;
  return b.zus?.zufall?.an ? erg?.zufall : undefined;
}
/** Äquivalenztest (G15) und Reliable Change Index (G16) am Blatt (zwei Gruppen, Prä-Post): `tost` und `rci` im Ergebnis, Wahl in `blatt.zus`. */
function zusatzErgebnis(b: Blatt): { tost?: TostAnzeige; rci?: RciAnzeige } {
  const erg = b.ergebnis as { typ?: string; tost?: TostAnzeige; rci?: RciAnzeige } | null;
  return (erg?.typ === 'zwei-gruppen' || erg?.typ === 'prae-post') && b.zus ? { tost: b.zus.tost.an ? erg.tost : undefined, rci: b.zus.rci.an ? erg.rci : undefined } : {};
}
/** Die Hauptsätze der beiden Zusatzverfahren für den Bericht (Word, PDF): eigener Satz je Verfahren, hinter der Statistik-Zeile. */
function zusatzSaetze(b: Blatt): string[] {
  const z = zusatzErgebnis(b), nm = (n: string) => lesbar(spalteNach(n), true);
  const zf = zufallVon(b);
  return [...(z.tost ? [saetzeTost(z.tost, nm).haupt] : []), ...(z.rci ? [saetzeRci(z.rci, nm).haupt] : []), ...(zf ? [saetzeZufall(zf, nm).haupt] : [])];
}
/** Die Tabellen der beiden Zusatzverfahren (leer, wenn sie nicht gewählt oder nicht gerechnet sind). */
export function zusatzTabellen(b: Blatt): TableItem[] {
  const z = zusatzErgebnis(b), nm = (n: string) => lesbar(spalteNach(n), true);
  const zf = zufallVon(b);
  return [...(z.tost ? tabellenTost(z.tost, nm) : []), ...(z.rci ? tabellenRci(z.rci, nm) : []), ...welle7Tabellen(b, nm), ...(zf ? tabellenZufall(zf, nm) : [])];
}
/** Welle 7: Tabellen der Risikomaße (Kreuztabelle 2 × 2), des Typical Errors (zwei Zahlenspalten, wenn für den Bericht gewählt) und der Anpassungstests (Normalverteilung, χ² der Kategorien). */
function welle7Tabellen(b: Blatt, nm: (n: string) => string): TableItem[] {
  const erg = b.ergebnis as { typ?: string; e?: unknown } | null;
  if (erg?.typ === 'kreuz') return [...tabellenRisiko(erg.e as Kreuz), ...tabellenMasse(erg.e as Kreuz), ...tabellenSchicht(erg.e as Kreuz)];
  if (erg?.typ === 'icc') { const e = erg.e as IccErgebnis; return e.teBericht ? tabellenTypicalError(e.te, nm, e.spalten[0]!, e.spalten[1]!) : []; }
  if (erg?.typ === 'verteilung') return [...tabellenAnpassung(erg.e as Verteilung), ...tabellenRobust(erg.e as Verteilung), ...tabellenVielfalt(erg.e as Verteilung)];
  return [];
}

/** Je Tabellenname nur die erste: Mit Gruppen-Spalten rechnet die Regression für den Gesamttest weitere Modelle ohne die Spalte (regfaktor.ts) - deren Tabellen
 *  stehen unter „Alle Zahlen“, nicht beim Ergebnis und nicht im Bericht. */
export const ersteJe = (t: TableItem[]): TableItem[] => t.filter((x, i) => t.findIndex(y => y.label === x.label) === i);

/** Krippendorffs Alpha und Verwandte zu einem Übereinstimmungs-Blatt: bei drei und mehr Kodierenden das ganze Ergebnis, bei zwei zusätzlich zu Cohens Kappa. */
export function interVon(b: Blatt): Inter | undefined {
  const erg = b.ergebnis as { typ?: string; e?: { inter?: Inter } & Inter } | null;
  return erg?.typ === 'inter' ? erg.e : erg?.typ === 'kappa' ? erg.e?.inter : undefined;
}

/** Die Tabellen, die zu einem Blatt in den Bericht gehören - wie in SPSS-Berichten üblich:
 *  Faktorenanalyse: Rotierte Komponentenmatrix · Skala: Alpha + Item-Statistiken · Regression: Modellzusammenfassung + Koeffizienten.
 *  Sonst die erste Tabelle; bei Befehlen alle. */
/** Gleich ist eine Tabelle, wenn Name und Zellen gleich sind (auch nach dem Stempeln mit dem Fallgewicht). */
export const tabellenSchluessel = (t: TableItem) => `${t.label}|${JSON.stringify(t.cells)}`;
/** Was Statable für den Bericht vorschlägt (ohne die Wahl der Person): erscheint auf dem Blatt unter „Ergebnis“ und „Für deine Arbeit“, jede Tabelle mit Schalter „Im Bericht“. */
export function berichtTabellenVorschlag(b: Blatt): TableItem[] {
  const z = zusatzTabellen(b);
  return stempel(z.length ? [...berichtTabellenOhneZusatz(b), ...z] : berichtTabellenOhneZusatz(b), b);
}
/** Was wirklich in Bericht, Word, PDF und Excel kommt: der Vorschlag ohne die abgewählten Tabellen, dazu die zusätzlich gewählten „Weiteren Auswertungen“. */
export function berichtTabellen(b: Blatt): TableItem[] {
  const v = berichtTabellenVorschlag(b), aus = b.berichtTabellenAus, mit = b.berichtTabellenMit;
  if (!aus?.length && !mit?.length) return v;
  const ohne = new Set(aus ?? []), da = new Set(v.map(tabellenSchluessel));
  const plus = (mit ?? []).length ? stempel(b.items.filter((i): i is TableItem => i.type === 'table' && (mit ?? []).includes(tabellenSchluessel(i)) && !da.has(tabellenSchluessel(i))), b) : [];
  return [...v.filter(t => !ohne.has(tabellenSchluessel(t))), ...plus];
}
/** Tabellen eines mit Fallgewicht gerechneten Blatts tragen es mit (Fußzeile unter jeder Tabelle: Bericht, Word, PDF, Excel, Kopie). */
const stempel = (t: TableItem[], b: Blatt): TableItem[] => (b.gewicht && b.art !== 'tabelle' && b.art !== 'amtlich' ? t.map(x => (x.gewicht ? x : { ...x, gewicht: b.gewicht })) : t);
function berichtTabellenOhneZusatz(b: Blatt): TableItem[] {
  const rang = rangVon(b);
  if (rang) return tabellenRang(rang, rangName, rangGruppen(rang));
  { const gwt = b.ergebnis as { typ?: string; e?: GewichtetE } | null; if (gwt?.typ === 'gewichtet' && gwt.e) return tabellenGewichtet(gwt.e, rangName, (sp, w) => wertName(sp, String(w))); }   // Umfragegewicht: die Tabellen entstehen aus dem Ergebnis
  const t = b.items.filter((i): i is TableItem => i.type === 'table' && !/Case Processing|Reading/.test(i.label));
  if (b.art === 'befehle') return t;
  // McNemar und Cochran-Q (G5) rechnet Statable selbst: Tabellen aus dem gespeicherten Ergebnis.
  { const jn = b.ergebnis as { typ?: string; e?: unknown } | null; if (jn?.e && jn.typ === 'mcnemar') return tabellenMcNemar(jn.e as McNemarE, rangName); if (jn?.e && jn.typ === 'cochran') return tabellenCochran(jn.e as CochranE, rangName); }
  // Messwiederholung: PSPP kann sie nicht, Statable baut die Tabellen aus dem gespeicherten Ergebnis (in der aktuellen Sprache).
  if (b.art === 'messwiederholung') { const erg = b.ergebnis as { typ?: string; e?: Messwiederholung } | null; if (erg?.typ === 'messwiederholung' && erg.e) { const n = mwNamen(erg.e); return tabellenMesswiederholung(erg.e, n.zn, n.gruppen); } return []; }
  if (b.art === 'einzelfall') { const erg = b.ergebnis as { typ?: string; e?: Einzelfall } | null; return erg?.typ === 'einzelfall' && erg.e ? tabellenEinzelfall(erg.e, n => { const sp = spalteNach(n); return sp ? lesbar(sp, true) : n; }) : []; }
  // Mehrfachantworten rechnet Statable selbst (PSPP 2.1.1 kennt MULT RESPONSE nicht): die Tabellen entstehen aus dem gespeicherten Ergebnis.
  if (b.art === 'kreuz' && (b.ergebnis as { typ?: string } | null)?.typ === 'mehrfach') return mehrfachTabellen(b);
  if (b.art === 'kaplanmeier') { const erg = b.ergebnis as { typ?: string; e?: Kaplan } | null; return erg?.typ === 'kaplanmeier' && erg.e ? tabellenKaplan(erg.e, n => { const sp = spalteNach(n); return sp ? lesbar(sp, true) : n; }) : []; }
  if (b.art === 'faelle') { const erg = b.ergebnis as { typ?: string } | null; return erg?.typ === 'faelle' ? tabellenFaelle(faelleVonBlatt(b)) : []; }
  if (b.art === 'zeitreihen') { const erg = b.ergebnis as { typ?: string; e?: ZeitreiheE } | null; return erg?.typ === 'zeitreihen' && erg.e ? tabellenZeitreihe(erg.e, n => { const sp = spalteNach(n); return sp ? lesbar(sp, true) : n; }) : []; }   // Später S-E
  if (b.art === 'cluster') { const erg = b.ergebnis as { typ?: string; e?: ClusterE } | null; return erg?.typ === 'cluster' && erg.e ? tabellenCluster(erg.e, n => { const sp = spalteNach(n); return sp ? lesbar(sp, true) : n; }) : []; }   // Später S-E
  { // Kurs-Paket: R rechnet, Statable baut die Tabellen aus dem gespeicherten Ergebnis (in der aktuellen Sprache)
    const kp = b.ergebnis as { typ?: string; e?: unknown } | null, nm = (n: string) => { const sp = spalteNach(n); return sp ? lesbar(sp, true) : n; };
    if (kp?.e) {
      if (b.art === 'diskriminanz' && kp.typ === 'diskriminanz') return tabellenDiskr(kp.e as DiskrE, nm);
      if (b.art === 'loglinear' && kp.typ === 'loglinear') return tabellenLog(kp.e as LogE, nm);
      if (b.art === 'manova' && kp.typ === 'manova') return tabellenManova(kp.e as ManovaE, nm);
      if (b.art === 'armut' && kp.typ === 'armut') return tabellenArmut(kp.e as ArmutE, nm);
      if (b.art === 'vorhersage' && kp.typ === 'probit') return tabellenProbit(kp.e as ProbitE, nm);
      if (b.art === 'vorhersage' && kp.typ === 'wls') return tabellenWls(kp.e as WlsE, nm);
      if (b.art === 'vorhersage' && kp.typ === 'nls') return tabellenNls(kp.e as NlsE, nm);
    }
    if (b.art === 'diskriminanz' || b.art === 'loglinear' || b.art === 'manova' || b.art === 'armut') return [];
  }
  if (b.art === 'korrmatrix') { const erg = b.ergebnis as { typ?: string; e?: KorrMatrix } | null; return erg?.typ === 'korrmatrix' && erg.e ? tabellenKorrMatrix(erg.e, n => { const sp = spalteNach(n); return sp ? lesbar(sp, true) : n; }) : []; }
  if (b.art === 'meta') { const erg = b.ergebnis as { typ?: string; e?: Meta } | null; return erg?.typ === 'meta' && erg.e ? tabellenMeta(erg.e) : []; }
  if (b.art === 'kategorien') { const k = (b.ergebnis as { e?: KatAnzeige } | null)?.e; return k ? tabellenKategorien(k) : []; }   // Welle 4, G7
  if (b.art === 'tabelle') return tabellenTabelle(b);   // Später S-C: Tabelle zusammenstellen
  if (b.art === 'amtlich') return tabellenAmtlich(b);   // M5a: nur die veröffentlichbare Fassung, nie Fallzahlen gesperrter Zellen, nie das Prüfprotokoll
  if (b.art === 'mehrebenen') { const erg = b.ergebnis as { typ?: string; e?: Mehrebenen } | null; return erg?.typ === 'mehrebenen' && erg.e ? tabellenMehrebenen(erg.e, n => { const sp = spalteNach(n); return sp ? lesbar(sp, true) : n; }) : []; }
  // Zweifaktorielle Varianzanalyse und Kovarianzanalyse: Statable baut die Tabellen aus dem gespeicherten Ergebnis (in der aktuellen Sprache).
  if (b.art === 'gruppen') { const erg = b.ergebnis as { typ?: string; e?: Anova2E & AncovaE } | null; const nm = (n: string) => { const sp = spalteNach(n); return sp ? lesbar(sp, true) : n; };
    if (erg?.typ === 'anova2' && erg.e) return tabellenAnova2(erg.e, nm); if (erg?.typ === 'ancova' && erg.e) return tabellenAncova(erg.e, nm); }
  if (b.art === 'mediation' || b.art === 'moderation') { const erg = b.ergebnis as { typ?: string; e?: Mediation & Moderation } | null; if (erg?.e && erg.typ === 'prozess' && b.art === 'mediation') return tabellenProzess(erg.e as unknown as Prozess); if (erg?.e && erg.typ === b.art) return b.art === 'mediation' ? tabellenMediation(erg.e) : tabellenModeration(erg.e); return []; }
  // Spearman und Kendall rechnet Statable selbst - die PSPP-Tabelle gehört dann nicht zum Satz (sie ist die Pearson-Tabelle).
  if (b.art === 'zusammenhang' && (((b.ergebnis as { e?: { methode?: string } } | null)?.e?.methode ?? 'pearson') !== 'pearson' || (b.ergebnis as { e?: { kontroll?: string[] } } | null)?.e?.kontroll?.length)) return [];
  const finde = (re: RegExp) => t.filter(i => re.test(i.label));
  // F3: Hauptachsen + Promax - Mustermatrix und Faktorkorrelationen statt der rotierten Komponentenmatrix
  if (b.art === 'faktor') { const pm = finde(/^Pattern Matrix/); if (pm.length) return [...pm, ...finde(/^Factor Correlation Matrix/), ...rTabellen(b)]; const r = finde(/^Rotated Component Matrix/); return [...(r.length ? r : finde(/^Component Matrix|^Factor Matrix/).slice(0, 1)), ...rTabellen(b)]; }
  if (b.art === 'skala') { const r = finde(/^(Reliability Statistics|Item-Total Statistics)/); const x = rTabellen(b); if (r.length || x.length) return [...r, ...x]; }
  if (b.art === 'uebereinstimmung') {
    // Gewichtetes Kappa: die PSPP-Tabelle „Symmetric Measures“ ist ungewichtet - sie käme sonst mit κ = ,52 neben dem Satz mit κ = ,65 (Prüfung B3).
    const kp = b.ergebnis as { typ?: string; e?: Kappa } | null, gew = kp?.typ === 'kappa' && kp.e && kp.e.gewicht !== 'keins' ? kp.e : null;
    const r = t.filter(i => i.cells.some(c => c.t === 'Count') || (gew ? /^Descriptive Statistics/ : /^(Symmetric Measures|Descriptive Statistics)/).test(i.label));
    if (gew) r.push(tabelle('Weighted Kappa', L('Gewichtetes Kappa', 'Weighted kappa'),
      ['', 'κ', 'SE', 'z', 'p', L('95 %-KI unten', '95% CI lower'), L('95 %-KI oben', '95% CI upper'), 'N'],
      [[gew.gewicht === 'linear' ? L('Linear gewichtet', 'Linear weights') : L('Quadratisch gewichtet', 'Quadratic weights'), fo(gew.kappa, 3), fx(gew.se, 3), fx(gew.z), fp(gew.p), fo(gew.kiLo, 3), fo(gew.kiHi, 3), fd(gew.n)]]));
    const icc = b.ergebnis as { typ?: string; e?: IccErgebnis } | null, ba = icc?.typ === 'icc' && icc.e ? tabellenBlandAltman(icc.e) : [];
    const it = interVon(b), inter = it ? tabellenInter(it) : [];
    if (it && (b.ergebnis as { typ?: string } | null)?.typ === 'inter') return inter;   // drei und mehr Kodierende: nur die eigenen Tabellen (die Häufigkeiten von PSPP stehen unter „Alle Zahlen“)
    if (r.length || ba.length || inter.length) return [...r, ...ba, ...inter];
  }
  // Varianzanalyse: die Welch-Tabelle (Hauptergebnis, F2) vor der klassischen ANOVA-Tabelle, die Paarvergleiche danach.
  if (b.art === 'gruppen' && (b.ergebnis as { typ?: string } | null)?.typ === 'anova') { const r = finde(/^(Descriptives|ANOVA)$/); if (r.length) { const z = tabellenAnovaZusatz(anovaMitNamen((b.ergebnis as { e: Anova }).e), b.ph, b.phKontrolle), w = z.filter(x => x.label === 'Welch ANOVA'); return [...r.filter(x => x.label === 'Descriptives'), ...w, ...r.filter(x => x.label !== 'Descriptives'), ...z.filter(x => !w.includes(x))]; } }
  if (b.art === 'praepost') { const r = finde(/^(Paired Sample Statistics|Paired Samples Test)/); if (r.length) return r; }
  // Hierarchische Regression (G4): Statable baut die Tabellen aus dem gespeicherten Ergebnis (PSPP liefert nur je ein Modell je Block).
  // Ordinale, multinomiale und Zähldaten-Regression (Welle 3): R rechnet, Statable baut die Tabellen aus dem gespeicherten Ergebnis.
  if (b.art === 'vorhersage') { const erg = b.ergebnis as { typ?: string; e?: OrdReg & MultReg & ZaehlReg } | null; if (erg?.e && (erg.typ === 'ordreg' || erg.typ === 'multreg' || erg.typ === 'zaehlreg')) return tabellenKategreg(erg.e, n => { const sp = spalteNach(n); return sp ? lesbar(sp, true) : n; }); }
  if (b.art === 'vorhersage') { const erg = b.ergebnis as { typ?: string; e?: QuantilErgebnis & StrafErgebnis } | null; const nm = (n: string) => { const sp = spalteNach(n); return sp ? lesbar(sp, true) : n; }; if (erg?.e && erg.typ === 'quantil') return tabellenQuantil(erg.e, nm); if (erg?.e && erg.typ === 'penal') return tabellenStraf(erg.e, nm); }   // Später S-E
  if (b.art === 'vorhersage') { const erg = b.ergebnis as { typ?: string; e?: Hierreg } | null; if (erg?.typ === 'hierreg' && erg.e) return tabellenHierreg(erg.e, n => { const sp = spalteNach(n); return sp ? lesbar(sp, true) : n; }); }
  if (b.art === 'vorhersage') { const r = ersteJe(finde(/^(Model Summary|Coefficients|Variables in the Equation)/)); if (r.length) return r; }
  // Kreuztabelle: die Tabelle selbst und der Chi-Quadrat-Test; Verteilung: alle Kennzahl- und Häufigkeitstabellen.
  if (b.art === 'kreuz') {
    const r = t.filter(i => i.cells.some(c => c.x && c.t === 'Expected') || /^Chi-Square Tests/.test(i.label));
    const k = b.ergebnis as { typ?: string; e?: Kreuz } | null, dg = k?.typ === 'kreuz' && k.e ? tabellenDiagnose(k.e) : [];
    if (r.length) return [...r, ...dg];
  }
  if (b.art === 'verteilung') { const r = [...t.filter(i => /^(Descriptive )?Statistics/.test(i.label) || i.cells.some(c => c.h && c.t === 'Valid Percent')), ...mehrfachTabellen(b)]; if (r.length) return r; }
  return t.slice(0, 1);
}

/** Die Tabellen der Mehrfachantworten-Sets eines Blatts (leer, wenn es keine hat). */
function mehrfachTabellen(b: Blatt): TableItem[] {
  const erg = b.ergebnis as { typ?: string; e?: Mehrfach & { mehrfach?: Mehrfach[] } } | null;
  if (erg?.typ === 'mehrfach' && erg.e) return tabellenMehrfach(erg.e);
  if (erg?.typ === 'verteilung' && erg.e?.mehrfach) return erg.e.mehrfach.flatMap(tabellenMehrfach);
  return [];
}

/** Wie viele Fälle in die Rechnung eines Blatts eingingen (ohne Lücken) und was sie sind; `null`, wenn das Blatt keine Zahl nennt. */
export function gerechneteN(b: Blatt): { n: number; art: 'personen' | 'faelle' | 'messungen' } | null {
  if (b.art === 'amtlich') return null;   // M5a: keine Fallzahl aus einer Tabelle mit Geheimhaltung in den Bericht
  if (b.art === 'tabelle') { const r = tabelleBerechnet(b); const n = r.art === 'ok' ? (r.e.spalten.find(c => c.schluessel === 'gesamt') ?? r.e.spalten.reduce((a, c) => ({ ...a, n: a.n + c.n }), { n: 0 })).n : 0; return n > 0 ? { n, art: 'personen' } : null; }   // Später S-C: Gesamtspalte der Tabelle
  const erg = b.ergebnis as Erg | null;
  if (!erg) return null;
  const p = (n: number | undefined) => (n !== undefined && Number.isFinite(n) && n > 0 ? { n, art: 'personen' as const } : null);
  switch (erg.typ) {
    case 'zwei-gruppen': return p(erg.e.a.n + erg.e.b.n);
    case 'anova': case 'anova2': case 'ancova': case 'mcnemar': case 'cochran': case 'prae-post': case 'zusammenhang': case 'logistik': case 'skala': case 'faktor': case 'kreuz': case 'mediation': case 'prozess': case 'moderation': case 'messwiederholung': return p(erg.e.n);
    case 'mehrfach': return p(erg.e.faelle);
    case 'vorhersage': return p(erg.e.df2 + erg.e.praediktoren.length + 1);
    case 'hierreg': return p(erg.e.n);
    case 'ordreg': case 'multreg': case 'zaehlreg': case 'quantil': case 'penal': return p(erg.e.n);
    case 'kappa': { const r = p(erg.e.n); return r && { ...r, art: 'faelle' }; }
    case 'inter': { const r = p(erg.e.nEinheiten); return r && { ...r, art: 'faelle' }; }
    case 'icc': { const r = p(erg.e.icc.n); return r && { ...r, art: 'faelle' }; }
    case 'mehrebenen': return p(erg.e.n);
    case 'meta': return null;
    case 'kaplanmeier': return p(erg.e.n);
    case 'zeitreihen': { const r = p(erg.e.n); return r && { ...r, art: 'messungen' }; }
    case 'cluster': { const r = p(erg.e.n); return r && { ...r, art: 'faelle' }; }
    case 'diskriminanz': case 'manova': case 'probit': case 'wls': case 'nls': return p(erg.e.n);
    case 'armut': { const r = p(erg.e.n); return r && { ...r, art: 'faelle' }; }
    case 'loglinear': { const r = p(erg.e.n); return r && { ...r, art: 'faelle' }; }
    case 'faelle': { const r = p(erg.e.n); return r && { ...r, art: 'faelle' }; }
    case 'korrmatrix': { const ns = erg.e.paare.map(q => q.n); return ns.length ? p(kleinste(ns)) : null; }
    case 'gewichtet': return p(gewichtetN(erg.e));
    case 'einzelfall': return { n: erg.e.zeilen - erg.e.ausgelassen, art: 'messungen' };
    default: return null;
  }
}

/** Einleitungssatz des Berichts: nennt die Zahl der Zeilen und, wenn die Rechnungen weniger Fälle nutzten (Lücken), die gerechnete Zahl.
 *  `en`: true = Englisch, false = Deutsch, wenn gerade Englisch gilt, sonst die gewählte Sprache (mitFlag). */
export function stichprobenText(blaetter: Blatt[], zeilen: number, en: boolean): { titel: string; text: string } {
  return mitFlag(en, () => stichprobenTextL(blaetter, zeilen));
}
function stichprobenTextL(blaetter: Blatt[], zeilen: number): { titel: string; text: string } {
  const ns = blaetter.map(gerechneteN).filter((x): x is NonNullable<ReturnType<typeof gerechneteN>> => !!x);
  const ef = blaetter.filter(b => b.art === 'einzelfall').map(b => (b.ergebnis as { e?: { faelle: unknown[] } } | null)?.e?.faelle.length ?? 0);
  const fmt = (n: number) => String(n);
  if (ef.length && ef.length === blaetter.length) {
    const k = Math.max(groesste(ef));
    const von = k > 1 ? L(` von ${k} Fällen`, ` from ${k} cases`) : L(' eines Falls', ' of one case');
    return { titel: L('Daten', 'Data'), text: L(`Die Daten enthalten ${zeilen} Messungen${von}.`, `The data contain ${zeilen} measurements${von}.`) };
  }
  const ms = blaetter.filter(b => b.art === 'meta').map(b => (b.ergebnis as { e?: { k?: number } } | null)?.e?.k ?? 0);
  if (ms.length && ms.length === blaetter.length) {
    const k = Math.max(groesste(ms));
    return { titel: L('Daten', 'Data'), text: L(`Die Meta-Analyse fasst ${k} Studien zusammen; die Daten sind Studienergebnisse, keine einzelnen Personen.`, `The meta-analysis combines ${k} studies; the data are study results, not individual people.`) };
  }
  const nurFaelle = ns.length > 0 && ns.every(x => x.art === 'faelle');
  const mitGewicht = gewichtBerichtSatz(blaetter), gw = mitGewicht ? ' ' + mitGewicht : '';   // der Satz zum Fallgewicht steht hinter dem Stichprobensatz
  const anz = nurFaelle ? Lp(zeilen, `${zeilen} Fall`, `${zeilen} Fälle`, `${zeilen} case`, `${zeilen} cases`) : Lp(zeilen, `${zeilen} Person`, `${zeilen} Personen`, `${zeilen} person`, `${zeilen} people`);
  const gerechnet = ns.filter(x => x.art !== 'messungen').map(x => x.n);
  const lo = gerechnet.length ? Math.min(kleinste(gerechnet)) : zeilen, hi = gerechnet.length ? Math.max(groesste(gerechnet)) : zeilen;
  let rest = '';
  if (gerechnet.length && lo < zeilen) {
    rest = lo === hi
      ? L(`, davon ${fmt(lo)} mit vollständigen Angaben für die Auswertung`, `, of whom ${fmt(lo)} had complete data for the analyses`)
      : L(`, davon je nach Auswertung ${fmt(lo)} bis ${fmt(hi)} mit vollständigen Angaben`, `, of whom ${fmt(lo)} to ${fmt(hi)} had complete data, depending on the analysis`);
  }
  // Mit Häufigkeitsgewicht steht eine Zeile für mehrere Fälle: „nahmen 14 Personen teil“ wäre falsch - der Satz zum Fallgewicht nennt N (Fachblatt S-A, 1.4).
  if (blaetter.some(b => b.gewicht?.art === 'haeufigkeit'))
    return { titel: L('Stichprobe', 'Sample'), text: Lp(zeilen, `Die Daten enthalten ${zeilen} Zeile.`, `Die Daten enthalten ${zeilen} Zeilen.`, `The data contain ${zeilen} row.`, `The data contain ${zeilen} rows.`) + gw };
  if (nurFaelle) return { titel: L('Stichprobe', 'Sample'), text: L(`Die Daten enthalten ${anz}${rest}.`, `The data contain ${anz}${rest}.`) + gw };
  return { titel: L('Stichprobe', 'Sample'), text: L(`An der Untersuchung nahmen ${anz} teil${rest}.`, `${anz} took part in the study${rest}.`) + gw };
}

/** Die Tabellen aus R (Omega, CFA), falls das Blatt sie hat. */
export function rTabellen(b: Blatt): TableItem[] {
  const e = (b.ergebnis as { e?: { omega?: Parameters<typeof tabellenOmega>[0]; splitHalf?: Parameters<typeof tabellenSplitHalf>[0]; cfa?: Parameters<typeof tabellenCfa>[0] } } | null)?.e;
  const name = (q: string) => { const sp = spalteNach(q); return sp ? lesbar(sp, true) : q; };
  return [...(b.art === 'skala' && e?.omega ? tabellenOmega(e.omega) : []), ...(b.art === 'skala' && e?.splitHalf ? tabellenSplitHalf(e.splitHalf, b.l3 ?? [], name) : []), ...(b.art === 'faktor' && e?.cfa ? tabellenCfa(e.cfa, name) : [])];
}
/** Welch-Tabelle und Paarvergleiche, wenn das Blatt eine Varianzanalyse mit drei und mehr Gruppen ist. */
function anovaZusatz(b: Blatt): TableItem[] {
  const erg = b.ergebnis as { typ?: string; e?: Anova } | null;
  return b.art === 'gruppen' && erg?.typ === 'anova' && erg.e ? tabellenAnovaZusatz(anovaMitNamen(erg.e), b.ph, b.phKontrolle) : [];
}
/** Tabellen für Excel: bei Verfahren mit eigenen Tabellen nur diese, sonst die PSPP-Ausgabe (plus Tabellen aus R). */
export function excelTabellen(b: Blatt): TableItem[] | Blatt['items'] {
  const liste = excelTabellenRoh(b);
  return b.gewicht && b.art !== 'tabelle' && b.art !== 'amtlich' ? liste.map(x => (x.type === 'table' && !x.gewicht ? { ...x, gewicht: b.gewicht } : x)) as typeof liste : liste;
}
function excelTabellenRoh(b: Blatt): TableItem[] | Blatt['items'] {
  if (rangVon(b) || (b.ergebnis as { typ?: string } | null)?.typ === 'gewichtet') return berichtTabellen(b);
  if (b.art === 'faelle') { const erg = b.ergebnis as { typ?: string } | null; if (erg?.typ !== 'faelle') return []; const f = faelleVonBlatt(b); return [...tabellenFaelle(f), tabelleAlleFaelle(f)]; }   // Joint Display und dazu die volle Fall-Tabelle
  const it = interVon(b);
  return eigeneTabellen(b) && !hatR(b) ? berichtTabellen(b) : [...b.items, ...mehrfachTabellen(b), ...rTabellen(b), ...anovaZusatz(b), ...zusatzTabellen(b), ...(it ? tabellenInter(it) : [])];
}
