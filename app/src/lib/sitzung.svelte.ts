/**
 * Die Sitzung: Engine, Daten, Blätter, Verlauf, Einstellungen. Einzige Stelle mit Zustand.
 * Rückgängig: vor jeder Datenänderung ein Schnappschuss der Datei (.sav) - einfach und verlässlich.
 */
import { markiereCodeSpalten } from './codespalten';
import { istFehlend } from './fehlend';
import { anhaengen, type Schritt } from './verlauf';
import type { DgOptionen, DvOptionen } from './diagramm';
import { fachAusSpeicher, FACH_STANDARD, type FachId } from './fachid';
import { WasmEngine, EngineAbbruch, EngineAbgebrochen } from '../engine/wasm-engine';
import type { OutputItem } from '../engine/types';
import { parseCsvJe } from '../dialogs/csv';
import { pruefe, type Fund, type SpalteDaten } from './datencheck';
import { leseStata, StataFehler } from './stata';
import { zm } from './zeitmarke';
import { sage, beginneRechnung, zaehleErgebnis } from './ansage';
import { leseSavZeilen } from './savlesen';
import { DateiFehler, leseCsv, leseDatei, liesFallzahl, planeSpalten, zurEngine, pruefeGroesseNachher, psppName, type Lesehinweis, type Tabelle, type Eingelesen } from './einlesen';
import { schaetzeSav, urteil, groesse as groesseVon, langsamText } from './groessengrenze';
import { leseVerzeichnis, mehrdeutigeSpalten, type Spalte } from './verzeichnis';
import { baueSpalte, neuAufbauen, type NeueSpalte, type Wert } from './eingabe';
import { ladeProjekt, listeProjekte, loescheProjekt, speichereProjekt, benenneProjektUm, neueId, istSpeicherVoll, AblageKonflikt, type Projekt, type Eintrag } from './ablage';
import { projektAlsDatei, projektDateiname, type DateiMeldung } from './projektdatei';
import { enthaeltPersoenliches, verschluesseleProjekt } from './projektpasswort';
import { frageNeuesPasswort, frageSpeicherart, pwUi } from './projektpasswort-ui.svelte';
import { meldeGespeichertHaken, speichernFrageNoetig } from './passwortfrage';
import type { Zusatz } from './zusatz';
import { integrationAusgefuellt, type Integration } from './integration';
import type { FragebogenPlan } from './fragebogenplan';
import { apiDa, waehleSpeicherort, holeZugriff, schreibeInDatei, zugriffGiltNoch, leseZiel, merkeZiel, vergissZiel, type DateiZugriff, type Ziel } from './dateiziel';
import { istSchuetzenswert } from './erinnerung';
import { istSetName, setAlsSpalte, brauchbareSets, type MehrfachSet } from './mehrfach';
import { gewichtAbgleich, gewichtBefehl, leseEngineGewicht, type Gewicht } from './gewichte';
import { brauchbareSkalen, type Skala } from './skalen';
import { leseVariablensets } from './variablensets';
import { text, mehrzahl, paarText, FREIGEGEBEN, istSprache, istRtl, ladeSprache, type Sprache, type Paar } from '../i18n/laufzeit';
import { zit as zitSicher } from './befehlstext';
import { befehle } from './befehlsspeicher.svelte';
import { zaehle } from './zaehlen';
import { randEngBeiStart } from './rundgang';
import { artAusSyntax, bezeichnerIn, pruefeSyntax, pruefsumme, standVon as protokollStand, vergleiche, type AbgleichAngabe, type Art, type DatenDatei, type NichtGrund, type ProtokollEintrag, type Stand, type Wiederhol } from './protokoll';
import { eurostatZeitAlsDatum, eurostatZeitSatz, type EurostatTabelle } from './eurostat';
import type { EurostatQuelle } from './eurostatquelle';
export { P, type Paar } from '../i18n/laufzeit';
export type { Sprache } from '../i18n/laufzeit';

export type Anrede = 'du' | 'sie';
/** Farben: wie das Gerät, hell, dunkel und fünf starke Kontraste (dieselben wie in den Sensorik-Apps). */
export type Thema = 'auto' | 'hell' | 'dunkel' | 'sw' | 'ws' | 'sg' | 'gs' | 'gb';
export interface Einstellungen { sprache: Sprache; anrede: Anrede;
  /** Dezimalzeichen in Sätzen, Tabellen und Eingabe: wie die Sprache (Vorgabe aus i18n/profil.ts), Komma oder Punkt (Johannes 09.10.: Schalter wieder da). */
  zahl: 'sprache' | 'komma' | 'punkt'; thema: Thema; profi: boolean; rundgang: boolean;
  /** „Wieder zeigen“ in den Einstellungen: der Rundgang erscheint auch für „Ich kenne mich aus“ (lib/rundgang.ts). Fehlt in alten Einstellungen = nein. */
  rundgangErneut?: boolean;
  /** Der einmalige Hinweis „Strg+K: alles suchen und ausführen“ wurde gesehen (oder weggeklickt). Fehlt in alten Einstellungen = nein. */
  strgKGesehen?: boolean;
  /** Schwierigkeit auf der Seite „Beispiele“ (0 = Alle, 1-3): die eigene Wahl. Fehlt = nie gewählt (Vorgabe „Einstieg“, für Profis „Alle“). */
  beispielStufe?: number;
  /** Welcher 95 %-Bereich in der t-Test-Zeile steht: der für d, der für die Mittelwertdifferenz (in Punkten) oder beide. */
  kiT: 'd' | 'punkte' | 'beide';
  /** Kursmodus (Andreas 23.10.): welcher t-Test und welche Varianzanalyse das Hauptergebnis sind - Welch (ohne gleiche Streuung, Standard) oder klassisch (gleiche Streuung angenommen, wie in vielen Lehrbüchern, in Excel und auf dem TI-84). */
  kurs?: 'welch' | 'klassisch';
  /** Ordnung der Karten auf „Neue Auswertung“ (Andreas 25.10.): nach Fragen (Standard) oder „wie im Kurs“ (eine, zwei, drei und mehr Stichproben × Anteil, Mittelwert, Varianz). Ändert nie Rechnungen. */
  ordnung?: 'frage' | 'kurs';
  /** Übungsmodus (Lehre, 23.10.): Die Sätze zur Deutung des Ergebnisses sind ausgeblendet, bis „Deutung zeigen“ gedrückt wird; die Kennzahlen bleiben sichtbar. */
  ohneDeutung?: boolean;
  /** Vergleich mit anderen Programmen (K7, 23.10.): welche Bezüge in Ergebnissen und Hilfe stehen; Standard alle aus. */
  bezuege?: { excel?: boolean; ti84?: boolean; spss?: boolean; r?: boolean; jamovi?: boolean; stata?: boolean; geogebra?: boolean; rechnung?: boolean };
  /** Null vor dem Komma auch bei Werten bis 1 (p, r, α, R², β): „p = 0,034“ statt „p = ,034“. Standard aus = APA wie im Deutschen (Johannes 09.10.); in manchen Ländern (pl, ro …) ist die Null üblich. */
  nullVorKomma?: boolean;
  /** Spaltenköpfe der Datentabelle: kurzer Name (wie SPSS), volle Bezeichnung umgebrochen, oder senkrecht. */
  koepfe: 'name' | 'lang' | 'senkrecht';
  /** Kurze Spaltenköpfe in Ergebnistabellen (SD, SE, p …) mit Abkürzungsliste unter der Tabelle (lib/kurzkoepfe.ts, Welle 3). Standard aus: die Sprachausgabe liest sonst die Kurzform. */
  kurzeKoepfe?: boolean;
  /** Word-Bericht: sichtbare Bildbeschreibung und Datentabelle nach jedem Diagramm. Standard an (undefined = an); der Alternativtext am Bild bleibt immer. */
  wordBildbeschreibungen?: boolean;
  /** Kodier-Arbeitsplatz (Stufe 6b): Ansicht „Text“ (Voreinstellung) oder „Sätze“. */
  kodierAnsicht: 'text' | 'saetze';
  /** Kodier-Arbeitsplatz: beim Lesen mit den Pfeiltasten ansagen, wenn die Schreibmarke in eine kodierte Stelle kommt (Voreinstellung aus). */
  kodierAnsageBeimLesen: boolean;
  /** Kodier-Arbeitsplatz (Stufe 6c): „Ähnliche Stellen“ anbieten (Wortvergleich TF-IDF, lokal). Voreinstellung an. */
  kodierAehnliche: boolean;
  /** Kleines Statable-Logo mit „statable.eu“ unten in gespeicherten Diagrammen. Standard an (undefined = an); aus = wissenschaftliche Abbildung ohne Marke. */
  bildLogo?: boolean;
  /** Wie Tabellen dargestellt werden, solange an einer Tabelle nichts anderes gewählt ist (lib/tabellenfarben.ts; Johannes 09.10.). */
  tabAnsicht?: import('./tabellenfarben').Ansicht;
  /** Bayes-Faktor als Zusatzzeile bei t-Test, Prä-Post und Pearson-Korrelation (und in der APA-Zeile); Standard aus. */
  bayes: boolean;
  /** „Sofort rechnen“ (wie jamovi und JASP): Ergebnisse rechnen sich bei jeder Änderung von Spalten oder Optionen neu. Standard an; aus = Knopf „Rechnen“. */
  sofort: boolean,
  /** „Mein Fachgebiet“: bestimmt NUR, welche Karten die Seite „Neue Auswertung“ zeigt (lib/fach.ts); ändert nie Rechnungen. Alte Speicherstände ohne Feld = Bildung und Psychologie. */
  fach: FachId }
/** „Wie im Kurs“ (Neue Auswertung): der Test, den das gewählte Feld meint. Das Blatt klappt ihn im Ergebnis auf und springt hin. */
export type KursZiel = 'ftest' | 'anteil' | 'varianz' | 'regelkarte' | 'zaehlkarte' | 'messsystem' | 'kalibrier' | 'kurven';

export interface Blatt {
  id: string; titel: string; art: string; l1: string | null; l2: string | null; l3?: string[];
  syntax: string; items: OutputItem[]; ergebnis: unknown; imBericht: boolean; notiz: string; zeit: number;
  /** Reiter aus einem REGRESSION-Befehl: Punkte fürs Streudiagramm zur Zeit des Laufs (lib/regstreu.ts); fehlt bei älteren Reitern, dann aus den aktuellen Daten */
  regstreu?: { x: string; y: string; punkte: [number, number][] }[];
  /** Feld aus „Wie im Kurs“, mit dem das Blatt angelegt wurde (F-Test, Binomialtest, χ²-Test für eine Varianz); fehlt = über die Karte gewählt. */
  kursZiel?: KursZiel;
  /** Diagramm-Einstellungen (nur Gruppenvergleich); fehlt = wie vorgeschlagen */
  dg?: DgOptionen;
  /** Wahl der Diagramme bei Verteilung, Kreuztabelle, Regression und Faktorenanalyse; fehlende Felder (alte Projekte) gelten als Vorschlag */
  dv?: Partial<DvOptionen>;
  /** Diagramme gestalten (S-G): je Diagramm (Schlüssel = Titel des Diagramms) die Wahl von Beschriftungen, Farben, Schrift- und Zeichengröße; fehlt = wie berechnet */
  gestalt?: Record<string, import('./gestalt').Gestalt>;
  /** Tabellen umbauen (S-G): je Tabelle (Schlüssel = Fingerabdruck, lib/pivot.ts) Tausch, Ausblenden, Reihenfolge; fehlt = wie berechnet */
  pivot?: Record<string, import('./pivot').Pivot>;
  /** Berichtswahl je Tabelle (Johannes 01.11.): abgewählte Vorschlags-Tabellen und zusätzlich gewählte weitere Tabellen, je als `tabellenSchluessel`. */
  berichtTabellenAus?: string[];
  berichtTabellenMit?: string[];
  /** Paarvergleich nach der Varianzanalyse (drei und mehr Gruppen); fehlt = Vorschlag (Games-Howell bei ungleicher Streuung, sonst Tukey) */
  ph?: import('./posthoc').PhArt;
  /** Kontrollgruppe (Index in der Reihenfolge der Gruppen) für den Dunnett-Test; fehlt = die erste Gruppe. */
  phKontrolle?: number;
  /** „Ohne Normalverteilung (Rangtest)“ gewählt (Gruppenvergleich und Prä-Post): Mann-Whitney, Kruskal-Wallis bzw. Wilcoxon statt t-Test und Varianzanalyse.
   *  Das Ergebnis des Rangtests steht im `ergebnis` (Feld `rang`); fehlt die Wahl (alte Projekte), gilt der Mittelwertvergleich. */
  rang?: boolean;
  /** Field-Stufe 3b: „Robust (getrimmte Mittel)“ gewählt (Yuen-Test, getrimmte Varianzanalyse); schließt `rang` aus. `robustTr`: Trimmung je Seite in Prozent (fehlt = 20). Gerechnet wird im Browser aus den Daten, nichts steht im `ergebnis`. */
  robust?: boolean;
  robustTr?: number;
  /** Welle S-B: welcher Rangtest unter „Ohne Normalverteilung“ gerechnet wird, wenn es nicht der Standard ist (Mann-Whitney, Kruskal-Wallis, Wilcoxon, Friedman):
   *  Vorzeichentest, Mediantest, Jonckheere-Terpstra oder Kolmogorov-Smirnov. Das Ergebnis steht, wie sonst, im `ergebnis.rang`; fehlt die Angabe, gilt der Standard. */
  rangArt?: import('./rangweitereblatt').WeitereArt;
  /** Jonckheere-Terpstra: Reihenfolge der Gruppen umgekehrt und welche Alternative (zweiseitig oder einseitig). */
  rangOpt?: import('./rangweitereblatt').JtWahl;
  /** „Weitere Wege“: Äquivalenztest (Grenze Δ) und Reliable Change Index (Reliabilität, Richtung) bei zwei Gruppen und Prä-Post; fehlt = nichts gewählt. Die Ergebnisse stehen im `ergebnis` (Felder `tost`, `rci`). */
  zus?: import('./aequirci').ZusatzWahl;
  /** Die Frage ist gesperrt (Gruppenvergleich: leere Zelle, zweite Gruppierung und Kontrollvariable zugleich): das frühere Ergebnis ist entfernt, das Blatt kommt nicht in den Bericht. */
  gesperrt?: boolean;
  /** Meldung von R, wenn die ordinale, multinomiale oder Zähldaten-Regression nicht gerechnet werden konnte (das Blatt ist dann gesperrt, Welle 3). */
  fehler?: string;
  /** ROC-Kurve (Zusatz „Trennt die Zahl die beiden Gruppen?“) als Abbildung im Bericht: gesetzt beim ersten Aufklappen, am Blatt abwählbar; fehlt = nicht im Bericht. */
  roc?: boolean;
  /** Stand der benutzten Daten bei der Rechnung (siehe lib/live: spaltenStand); weicht er ab, ist das Blatt veraltet. */
  stand?: string;
  /** Mit welchem Fallgewicht gerechnet wurde (Spalte, Art, Summe der Gewichte, Zeilen); fehlt = ungewichtet. Bleibt stehen, auch wenn das Projekt danach umgestellt wird: das Blatt ist dann veraltet und zeigt, wie früher gerechnet wurde. */
  gewicht?: import('./gewichte').GewichtAbdruck;
  /** „Offene Antworten ordnen“ (Welle 4, G7): Kategorien, Kodierleitfaden und Zuordnung (lib/kategorienblatt.ts); kommt mit dem Blatt in die Projektdatei. */
  kat?: import('./kategorienblatt').KatBlatt;
  /** Fälle vergleichen (Welle 4, G1): Gruppen, Verschiebungen, Namen, Notizen, Schwellen und markierte Zitate; kommt mit der Projektdatei. Fehlt = Vorschlag von Statable (lib/faelle.ts). */
  faelle?: import('./faelle').FaelleZustand;
  /** Wie verteilt sich etwas? (Welle S-D): Wahl für „Referenzbereich bestimmen“ und „Ausreißer prüfen“ unter „Weitere Wege“; fehlt = beide aus (lib/verteilungwege.ts). */
  weg?: import('./verteilungwege').VerteilungWege;
  /** Methodenvergleich (Später S-F, M6) unter dem ICC mit zwei Zahlenspalten: an/aus, λ und ob die Achsen getauscht sind (lib/methodenvergleichwahl.ts); fehlt = aus. */
  mv?: import('./methodenvergleichwahl').MvWahl;
}
export interface Meldung { id: number; text: string; rueck?: boolean; bleibt?: boolean; /** Tastenweg zum Rückgängigmachen (nur bei Meldungen mit „Rückgängig“) */ hinweis?: string; /** Uhrzeit (ms), für den Verlauf „Letzte Meldungen“ */ zeit?: number }

/** Erste Sprache: die des Browsers - Deutsch für de-*, sonst Englisch. Danach gilt, was gewählt wurde. */
/** Sprache des Systems: die erste bevorzugte Sprache des Browsers (folgt der Einstellung von Windows/macOS). Deutsch, sonst Englisch. */
export const browserSprache = (): Sprache => {
  try {
    if (typeof document === 'undefined') return 'de';
    // Zum Prüfen einer noch nicht freigegebenen Sprache: ?sprache=fr (gilt nur für diesen Aufruf, wird nicht gespeichert).
    const q = new URLSearchParams(location.search).get('sprache');
    if (istSprache(q)) return q;
    const erste = (navigator.languages?.[0] ?? navigator.language ?? '').slice(0, 2).toLowerCase();
    return FREIGEGEBEN.find(x => x === erste) ?? 'en';
  } catch { return 'de'; }
};
/** Sprache nur für diesen Aufruf (?sprache=xx) - überstimmt eine gespeicherte Wahl. */
const spracheAusAdresse = (): Sprache | null => { try { const q = new URLSearchParams(location.search).get('sprache'); return istSprache(q) ? q : null; } catch { return null; } };
/** Gesetzt nur, wenn jemand die Sprache im Kopf selbst wählt. Sonst folgt Statable bei jedem Start dem System (Johannes 10.10.) -
 *  vorher fror das erste Speichern irgendeiner Einstellung die damalige Sprache für immer ein. */
export const SPRACHE_GEWAEHLT = 'statable-sprache-gewaehlt';
const STANDARD: Einstellungen = { sprache: browserSprache(), anrede: 'du', zahl: 'sprache', thema: 'hell', tabAnsicht: 'c', profi: false, rundgang: true, rundgangErneut: false, strgKGesehen: false, kiT: 'd', koepfe: 'lang', bayes: false, sofort: true, nullVorKomma: false, fach: FACH_STANDARD, kodierAnsicht: 'text', kodierAnsageBeimLesen: false, kodierAehnliche: true };
/** Gesetzt, sobald jemand im Farbmenü selbst wählt (Farbwahl.svelte) - erst dann gilt ein gespeichertes „Wie das Gerät“. */
export const THEMA_GEWAEHLT = 'statable-thema-gewaehlt';
/** Gesetzt, sobald jemand „Zahlen“ selbst wählt. Bis 08.10. stand dort für alle fest „komma“ (Schalter abgeschafft) - diese alten Werte gelten nicht als Wahl. */
export const ZAHL_GEWAEHLT = 'statable-zahl-gewaehlt';
function einstLaden(): Einstellungen {
  try { const e = { ...STANDARD, ...JSON.parse(localStorage.getItem('statable-einst') ?? '{}') }; delete (e as Record<string, unknown>).bewegung; delete (e as Record<string, unknown>).abk; if (!localStorage.getItem(ZAHL_GEWAEHLT)) e.zahl = 'sprache'; e.koepfe = 'lang'; if (e.thema === 'auto' && !localStorage.getItem(THEMA_GEWAEHLT)) e.thema = 'hell'; if (!localStorage.getItem(SPRACHE_GEWAEHLT) || !istSprache(e.sprache)) e.sprache = browserSprache(); e.sprache = spracheAusAdresse() ?? e.sprache; /* Johannes 09.10.: Standard ist immer Hell; „Wie das Gerät“ nur, wenn ausdrücklich gewählt */ /* Johannes 08.10.: Standardansicht ist immer die volle waagrechte; Namen und senkrecht nur für diese Sitzung */ e.fach = fachAusSpeicher(e.fach); return e; }   // „Zahlen: Punkt“ entfernt 08.10. (Prüfung A6: wirkte nicht auf Sätze und PSPP-Tabellen); Punkt gibt es mit Englisch   // „Weniger Bewegung“ entfernt 08.10. - es gilt nur noch die Einstellung des Geräts
  catch { return { ...STANDARD }; }
}
/** Gerät wünscht weniger Bewegung (Bedienungshilfen des Betriebssystems). */
export const wenigBewegung = () => typeof matchMedia === 'function' && false;

export class SitzungsZustand {
  einst = $state(einstLaden());
  /** Seitenleiste eingeklappt? Beim Start nur bei „Ich kenne mich aus“ ja (Stufe 3, lib/rundgang.ts), sonst nein (Johannes 08.10.). */
  randEng = $state(randEngBeiStart(this.einst.profi));
  /** Der Rundgang ist gerade offen (gesetzt von bausteine/Rundgang.svelte): auch ein Profi, der ihn eben selbst gewählt hat, sieht ihn zu Ende. */
  rundgangOffen = $state(false);
  motor = $state<'aus' | 'laedt' | 'bereit' | 'fehler'>('aus');
  motorSchritt = $state(0);
  /** Engine-Datei: geladene Bytes und Gesamtgröße (für den Balken beim ersten Start) */
  motorBytes = $state<[number, number]>([0, 0]);
  projekt = $state<null | { id: string; name: string; quelle: string }>(null);
  /** Wie `zeilen` nicht tief reaktiv: jede Auswertung fragt je Zeile `istFehlend(spalte, …)`, und durch einen Proxy kostete das bei 100.000 Zeilen Sekunden. Geändert wird nur durch Zuweisen einer neuen Liste. */
  spalten = $state.raw<Spalte[]>([]);
  /** Die Datenzeilen: bewusst NICHT tief reaktiv (`$state.raw`). Ein tief reaktives Feld mit hunderttausend mal vierzig Zellen verpackt jede Zeile in einen Proxy; jeder Zugriff kostete dann Sekunden (Abschlusstest A2). Geändert wird nur durch Zuweisen eines neuen Arrays. */
  zeilen = $state.raw<(string | number | null)[][]>([]);
  /** Fund-Listen können Zehntausende Zeilennummern enthalten: nicht tief reaktiv, nur durch Zuweisen ersetzt. */
  funde = $state.raw<Fund[]>([]);
  /** Was beim Einlesen gedeutet wurde (1.333 als Dezimalzahl, Zeilen mit anderer Feldzahl) - steht im Daten-Check, bis es erledigt ist */
  lesehinweise = $state<Lesehinweis[]>([]);
  entscheid = $state<Record<string, 'erledigt' | 'gelassen'>>({});
  blaetter = $state<Blatt[]>([]);
  /** Mehrfachantworten-Sets (Fragebogen „Mehreres ankreuzen“), mit dem Projekt gespeichert */
  sets = $state<MehrfachSet[]>([]);
  /** Skalen, die die Person festgelegt hat (welche Fragen zusammen ein Merkmal messen), mit dem Projekt gespeichert */
  skalen = $state<Skala[]>([]);
  /** Namen der Spalten aus dem Codierungen-Import (Spalte.herkunft = 'codes'); werden bei jedem Einlesen der Spalten wieder aufgesetzt und mit dem Projekt gespeichert. */
  codeSpalten = $state<string[]>([]);
  /** Plausibilitätsregeln und Karte des Projekts (lib/zusatz.ts); verschachtelt: nur über `$state.snapshot` speichern */
  zusatz = $state<Zusatz>({});
  /** Integration der Daten (Mixed Methods, lib/integration.ts), mit dem Projekt gespeichert; leer = nichts eingetragen */
  integration = $state<Integration>({});
  /** Fragebogen-Pläne des Projekts (Stufe 2) und ihre Bilder (`<plan-id>/<datei>`); nicht tief reaktiv: Pläne und Bilder werden als Ganzes ersetzt. Mit Plan schreibt die Projektdatei Fassung 2 (ZIP). */
  fragebogen = $state.raw<FragebogenPlan[]>([]);
  fragebogenBilder = $state.raw<Record<string, Uint8Array>>({});
  /** Eingegebene Durchgänge je Plan (Paket 2F: Eingabemaske, doppelte Dateneingabe); im ZIP `fragebogen/<plan-id>/eingabe-A.json` usw. */
  fragebogenEingaben = $state.raw<Record<string, import("./doppeleingabe").PlanEingaben>>({});
  fragebogenPretest = $state.raw<Record<string, import("./pretest").PretestPlan>>({});
  /** Interview-Leitfäden des Projekts (Stufe 4, Paket 4D); als Ganzes ersetzt; im ZIP `qualitativ/leitfaeden.json`. */
  leitfaeden = $state.raw<import("./leitfaden").Leitfaden[]>([]);
  /** Forschungsplanung des Projekts (Stufe V2); als Ganzes ersetzt; im ZIP `planung/planung.json`. */
  planung = $state.raw<import("./planung").Planung[]>([]);
  /** Das qualitative Projekt (Stufe 4, Paket 4C); als Ganzes ersetzt; im ZIP `qualitativ/projekt.json` und `qualitativ/quellen/`. */
  qual = $state.raw<import("./qualprojekt").QualProjekt | undefined>(undefined);
  /** Offene Entscheidungen beim Konsens (Stufe 5, Paket 5E1); im ZIP `qualitativ/konsens.json`. */
  konsens = $state.raw<import("./konsens-zustand").KonsensEntwurf | undefined>(undefined);
  /** Aus der Fall-Code-Matrix wurden Zitate als Textspalten übernommen (Paket 5E1). */
  enthaeltZitate = $state(false);
  /** Das Fallgewicht des offenen Projekts (Spalte und Art; lib/gewichte.ts, lib/fallgewicht.svelte.ts). Fehlt = ungewichtet. */
  gewicht = $state<Gewicht | undefined>(undefined);
  /** Die Engine trägt ein Fallgewicht, dessen Art das Projekt nicht kennt (aus einer .sav von SPSS oder `WEIGHT BY` in den Befehlen): der Name der Spalte. Pflichtfrage nach der Art; bis dahin rechnet kein Blatt. */
  gewichtFrage = $state<string | null>(null);
  verlauf = $state<Schritt[]>([]);
  /** Protokoll jeder Datenänderung (Abschnitt 6, Teil B). Wird nie gelöscht; Rückgängig vermerkt „zurückgenommen“. Gehört in die Projektdatei. Nicht tief reaktiv: Einträge werden als Ganzes ersetzt. */
  protokoll = $state.raw<ProtokollEintrag[]>([]);
  /** Das Protokoll dieses Projekts begann erst mit der Fassung, die es eingeführt hat (Projekt aus der Zeit davor): frühere Änderungen stehen nicht darin. */
  protokollLuecke = $state(false);
  /** Name und Prüfsumme (SHA-256 über die Bytes) der Datei, aus der die Daten eingelesen wurden; `sha256: null`, wenn der Browser sie nicht bilden kann. Fehlt bei Beispielen, Eingabe und Umformen. */
  datei = $state<DatenDatei | undefined>(undefined);
  /** Was „Rückgängig“ zurückgenommen hat und „Wiederholen“ wieder anwendet; jede neue Änderung leert es. */
  wieder = $state<Schritt[]>([]);
  speicherStand = $state<'gespeichert' | 'speichert' | 'voll'>('gespeichert');
  /** Ein anderer Tab hat das offene Projekt geändert (D16): geschrieben wird erst nach der Entscheidung „Neu laden“ oder „Hier weiterarbeiten“. */
  konflikt = $state(false);
  /** Seit dem letzten Speichern als Datei (.statable) geändert. */
  ungesichert = $state(false);
  /** Seit wann es Änderungen gibt, die noch in keiner Datei stehen (für die Erinnerung); sonst null. */
  ungesichertSeit = $state<number | null>(null);
  /** Die Datei, mit der das offene Projekt zuletzt zu tun hatte. `frage`: Zugriff muss nach dem Neustart erst per Klick bestätigt werden. */
  ziel = $state<null | { name: string; zeit: number; art: 'datei' | 'download' | 'geoeffnet'; frage: boolean }>(null);
  meldungen = $state<Meldung[]>([]);
  /** Die letzten 30 Meldungen, jüngste zuerst - bleibt, wenn die Meldung selbst längst verschwunden ist (WCAG 2.2.1; Fenster „Letzte Meldungen“, Alt+M). */
  meldungsverlauf = $state<Meldung[]>([]);
  arbeitet = $state(false);
  /** Die Daten werden gerade aus der Engine geholt (Öffnen, Neuladen): solange noch keine Spalten da sind, zeigt die Oberfläche die Lade-Animation statt „0 Zeilen · 0 Spalten“ (Abschlusstest A6). */
  datenLaedt = $state(false);
  fehler = $state<null | { titel: string; text: string; details?: string }>(null);
  /** Die Projekte im Browser, das zuletzt bearbeitete zuerst (Liste der Startseite). */
  projekte = $state<Eintrag[]>([]);
}
export const s = new SitzungsZustand();

/** Deutsch mit du/Sie, Englisch (ohne Anrede-Unterschied). Fehlt das Englische, bleibt es deutsch - sichtbar als Lücke. */
export const d = (du: string, sie: string, en?: string, k?: string, w?: unknown[]) => (sprache() === 'de' || (en === undefined && !k) ? (s.einst.anrede === 'sie' ? sie : du) : text(sprache(), du, en ?? (s.einst.anrede === 'sie' ? sie : du), k, w));
/** Text ohne Anrede: Deutsch oder Englisch. */
export const L = (de: string, en: string, k?: string, w?: unknown[]) => text(sprache(), de, en, k, w);
export const istEn = () => sprache() === 'en';
/** Mehrzahl: Lp(n, `${n} Zeile`, `${n} Zeilen`, `${n} row`, `${n} rows`) - Einzahl nur bei genau 1; andere Sprachen nach Intl.PluralRules. */
export const Lp = (n: number, de1: string, deN: string, en1: string, enN: string, k?: string, w?: unknown[]) => mehrzahl(sprache(), n, de1, deN, en1, enN, k, w);
/** Ein Textpaar P(de, en) in der aktuellen Sprache. */
export const waehle = (p: Paar) => paarText(sprache(), p);
/** Die Sprache, in der gerade gerechnet wird (Einstellung, oder kurz erzwungen mit inSprache). */
export const aktuelleSprache = (): Sprache => sprache();
/** Für Funktionen mit Schalter `en` (aus Tests und alten Aufrufen): true = Englisch; false = Deutsch, wenn gerade Englisch gilt, sonst die gewählte Sprache. */
export const mitFlag = <T>(en: boolean, f: () => T): T => (en ? inSprache('en', f) : sprache() === 'en' ? inSprache('de', f) : f());
/** Für einen Augenblick in einer anderen Sprache rechnen (z. B. „Wie hieße dieser Titel auf Deutsch?“), ohne die Einstellung zu ändern. */
let zwang: Sprache | null = null;
const sprache = () => zwang ?? s.einst.sprache;
export function inSprache<T>(sp: Sprache, f: () => T): T { const vorher = zwang; zwang = sp; try { return f(); } finally { zwang = vorher; } }

/** Sprache wählen: 'system' folgt wieder dem Betriebssystem. */
export async function spracheWaehlen(w: Sprache | 'system') {
  try { if (w === 'system') localStorage.removeItem(SPRACHE_GEWAEHLT); else localStorage.setItem(SPRACHE_GEWAEHLT, '1'); } catch { /* privates Fenster */ }
  sprachWahl.system = w === 'system';
  await spracheSetzen(w === 'system' ? browserSprache() : w);
  einstSpeichern();
}
/** Erst die Sprachdatei laden (eigener Baustein), dann umschalten - so steht nie eine halb übersetzte Seite da. Scheitert das Laden (offline, alter Stand), bleibt die bisherige Sprache. */
export async function spracheSetzen(sp: Sprache) {
  try { await Promise.all([ladeSprache(sp), import('./texte').then(m => m.ladeTexte(sp))]); s.einst.sprache = sp; if (typeof document !== 'undefined') seiteSprache(document.documentElement, sp); }
  catch { meldeFehler(L('Diese Sprache lässt sich gerade nicht laden. Bitte später noch einmal versuchen.', 'This language cannot be loaded right now. Please try again later.')); }
}
export const spracheVomSystem = () => { try { return !localStorage.getItem(SPRACHE_GEWAEHLT); } catch { return true; } };
/** Folgt die Sprache dem System? Kopf und Einstellungen zeigen dieselbe Wahl. */
export const sprachWahl = $state({ system: spracheVomSystem() });
if (typeof window !== 'undefined') addEventListener('languagechange', () => { if (spracheVomSystem()) void spracheSetzen(browserSprache()); });
/** `lang` und `dir` der Seite setzen: Schrift von rechts nach links (Arabisch, Persisch, Prüfsprache xr) → `dir="rtl"`, sonst `ltr`. */
export function seiteSprache(h: { lang: string; dir: string }, sp: Sprache) { h.lang = sp; h.dir = istRtl(sp) ? 'rtl' : 'ltr'; }
export function einstSpeichern() {
  try { localStorage.setItem('statable-einst', JSON.stringify(s.einst)); } catch { /* privates Fenster */ }
  const h = document.documentElement;
  seiteSprache(h, s.einst.sprache);
  h.dataset.thema = s.einst.thema;
  browserleiste();
}
/** Farbe der Browserleiste am Handy = Hintergrund des Kopfs (`--grund`) des gewählten Farbschemas. In index.html stehen Hell und Dunkel
 *  als Vorgabe (vor dem Start); hier folgt die Leiste der echten Wahl, auch den starken Kontrasten. */
export function browserleiste() {
  try {
    const farbe = getComputedStyle(document.documentElement).getPropertyValue('--grund').trim();
    if (!farbe) return;
    document.querySelectorAll('meta[name="theme-color"]').forEach((m, i) => { if (i === 0) { m.removeAttribute('media'); m.setAttribute('content', farbe); } else m.remove(); });
  } catch { /* ohne Seite */ }
}
if (typeof window !== 'undefined') matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => queueMicrotask(browserleiste));

let meldungNr = 0;
/** Meldungen: höchstens drei, eine mit „Rückgängig“ wird nie von einer neuen verdrängt; sie bleibt 15 s, sonst 7 s.
 *  Beim Darüberfahren oder mit Fokus läuft die Zeit nicht ab (`haltMeldung`), Schließen-Knopf und Esc (Prüfung E2, WCAG 2.2.1). */
const meldungZeit = new Map<number, ReturnType<typeof setTimeout>>();
const meldungWeg = (id: number) => { s.meldungen = s.meldungen.filter(x => x.id !== id); meldungZeit.delete(id); };
const meldungStart = (id: number, ms: number) => { clearTimeout(meldungZeit.get(id)); meldungZeit.set(id, setTimeout(() => meldungWeg(id), ms)); };
/** Der Tastenweg zum Rückgängigmachen, wie ihn die Person sieht (Mac: Cmd). Steht an jeder Meldung mit „Rückgängig“, im Text für den Screenreader und im Verlauf. */
export const rueckgaengigHinweis = (): string => {
  const mac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/i.test(navigator.platform || navigator.userAgent || '');
  return L(`Rückgängig auch mit ${mac ? 'Cmd' : 'Strg'}+Z.`, `Undo also with ${mac ? 'Cmd' : 'Ctrl'}+Z.`);
};
export function melde(text: string, rueck = false, bleibt = false) {
  const m: Meldung = { id: ++meldungNr, text, rueck, bleibt, zeit: Date.now() };
  if (rueck) m.hinweis = rueckgaengigHinweis();
  s.meldungsverlauf = [m, ...s.meldungsverlauf].slice(0, 30);
  const alt = s.meldungen.length >= 3 ? (s.meldungen.find(x => !x.rueck) ?? s.meldungen[0]!) : null;
  s.meldungen = [...s.meldungen.filter(x => x !== alt), m];
  sage(m.hinweis ? `${text} ${m.hinweis}` : text, bleibt ? 'dringend' : 'hoeflich');   // die Karten stehen nicht mehr in einer Live-Region (App.svelte): Ansage nur über lib/ansage.ts, einmal
  if (!bleibt) meldungStart(m.id, rueck ? 15000 : 7000);
}
/** Fehlermeldung: verschwindet nicht von selbst, nur mit Schließen-Knopf oder Esc (WCAG 2.2.1). */
export const meldeFehler = (text: string) => melde(text, false, true);
export const schliesseMeldung = (id: number) => { clearTimeout(meldungZeit.get(id)); meldungWeg(id); };
export const haltMeldung = (id: number, halt: boolean) => { if (halt) clearTimeout(meldungZeit.get(id)); else if (!s.meldungen.find(x => x.id === id)?.bleibt) meldungStart(id, 5000); };

/* ---------- Engine ---------- */
let engine: WasmEngine | null = null;
let bereit: Promise<WasmEngine> | null = null;
/** Nur für Tests: eine Engine, die in Node läuft (lib/testmotor.ts), statt des Web-Workers. */
export function setzeTestMotor(e: WasmEngine) { bereit = Promise.resolve(e); engine = e; s.motor = 'bereit'; }
export function motor(): Promise<WasmEngine> {
  if (bereit) return bereit;
  s.motor = 'laedt'; s.motorSchritt = 0;
  bereit = (async () => {
    zm('motor-0');
    const e = new WasmEngine();
    e.onFortschritt = (g, n) => { s.motorBytes = [g, n]; if (g >= n) s.motorSchritt = 1; };
    // Nach einem Absturz der Engine: die Daten aus der Kopie in der Oberfläche wieder einfüllen (Stand vor dem abgebrochenen Befehl).
    e.nachNeustart = async roh => {
      if (!s.spalten.length) return;
      const { syntax, csv } = neuAufbauen($state.snapshot(s.spalten), s.zeilen);
      await roh('NEW FILE.\n' + syntax + (s.gewicht ? '\n' + gewichtBefehl(s.gewicht) : ''), { '/eingabe.csv': csv });
    };
    await e.run('SET PRINTBACK=OFF.');   // wartet, bis die Engine wirklich läuft
    zm('motor-1'); s.motorSchritt = 2; s.motor = 'bereit'; engine = e;
    return e;
  })().catch(err => { s.motor = 'fehler'; bereit = null; throw err; });
  return bereit;
}

/* ---------- Daten aus der Engine holen ---------- */
async function aktualisiere() {
  s.datenLaedt = true;
  try { await aktualisiereNun(); } finally { s.datenLaedt = false; }
}
/** Gesetzt, wenn die Person selbst `WEIGHT …` in den Befehlen ausgeführt hat: dann gilt, was die Engine danach trägt (auch „aus“), statt es zurückzusetzen. */
let gewichtVomBefehl = false;
/** Gleicht das Fallgewicht der Engine mit dem des Projekts ab - nach jedem Laden und jeder Änderung der Daten (Falle 1 im Fachblatt: Gewicht kommt unbemerkt ins Projekt).
 *  Engine hat eines, das Projekt kennt es nicht → Pflichtfrage nach der Art (`gewichtFrage`). Projekt hat eines, die Engine nicht (die Daten wurden neu aufgebaut) → wieder einsetzen. */
async function gewichtAbgleichen(e: WasmEngine, spalten: Spalte[]) {
  const eng = leseEngineGewicht((await e.run('SHOW WEIGHT.')).items);
  const vomBefehl = gewichtVomBefehl; gewichtVomBefehl = false;
  if (vomBefehl && !eng) { s.gewicht = undefined; s.gewichtFrage = null; return; }
  const a = gewichtAbgleich(eng, s.gewicht);
  if (a === 'ok') { s.gewichtFrage = null; return; }
  if (a === 'frage') { s.gewicht = undefined; s.gewichtFrage = eng; return; }
  const g = s.gewicht!, sp = spalten.find(x => x.name.toLowerCase() === g.spalte.toLowerCase());
  if (sp && sp.art === 'zahl') { await e.run(gewichtBefehl(g)); s.gewichtFrage = null; return; }
  s.gewicht = undefined; s.gewichtFrage = null;
  melde(L(`Die Spalte ${g.spalte}, die als Fallgewicht diente, gibt es nicht mehr oder sie enthält keine Zahlen. Das Projekt ist jetzt ungewichtet.`, `The column ${g.spalte} that served as the case weight no longer exists or does not contain numbers. The project is now unweighted.`), true);
}
/** Spalten und Zeilen der aktiven Daten aus der Engine lesen, ohne etwas zu setzen (auch für die Vorschau der Daten-Assistenten). */
/** Ab so vielen Zeilen holt `leseAktiveDaten` die Daten als `.sav` statt als CSV (0,6 s statt 7,8 s je 1 Mio. Zeilen); darunter bleibt alles beim bewährten Weg. */
export const SAV_AB_ZEILEN = 20000;
/** Wie viele Zeilen die Daten voraussichtlich haben (aus der eingelesenen Tabelle, bevor `s.zeilen` gesetzt ist). */
let zeilenHinweis = 0;
export async function leseAktiveDaten(e: WasmEngine, hinweisZeilen = 0, weg: 'auto' | 'csv' | 'sav' = 'auto'): Promise<{ spalten: Spalte[]; zeilen: Wert[][] }> {
  const v = await e.run('DISPLAY DICTIONARY.');
  // Zwei Spalten mit gleicher Anzeige (Bezeichnung von a = Name von b): die Wertelabels je Spalte einzeln erfragen, nicht über die Bezeichnung raten
  const nachfrage: Record<string, typeof v.items> = {};
  for (const name of mehrdeutigeSpalten(v.items).slice(0, 40)) nachfrage[name] = (await e.run(`DISPLAY DICTIONARY /VARIABLES=${name}.`)).items;
  const spalten = leseVerzeichnis(v.items, nachfrage);
  zm('verzeichnis');
  if (weg === 'sav' || (weg === 'auto' && hinweisZeilen >= SAV_AB_ZEILEN)) {
    // Binär statt CSV; versteht der Leser die Datei nicht sicher wie der CSV-Weg, bleibt der CSV-Weg (Ergebnis immer gleich)
    const { bytes } = await e.exportSav(); zm('daten-geholt');
    const z = leseSavZeilen(bytes, spalten);
    if (z) return { spalten, zeilen: z };
    zm('sav-nicht-gelesen');
  }
  const { csv } = await e.data(); zm('daten-geholt');
  // Zeile für Zeile umwandeln (Kopfzeile auslassen), ohne vorher die ganze Tabelle als Texte zu halten
  const zeilen = parseCsvJe(csv, (z, nr) => (nr === 0 ? undefined : spalten.map((sp, i) => {
    const w = (z[i] ?? '').trim();   // die Engine schreibt fehlende Zahlen als Leerzeichen
    if (w === '') return null;
    if (sp.art === 'datum') return w.replace(/^(\d{2})\/(\d{2})\/(\d{4})/, '$2.$1.$3');   // Engine schreibt MM/TT/JJJJ
    return sp.art === 'zahl' ? Number(w) : w;
  })));
  return { spalten, zeilen };
}
async function aktualisiereNun() {
  const e = await motor();
  const { spalten, zeilen } = await leseAktiveDaten(e, Math.max(s.zeilen.length, zeilenHinweis)); zm('zurueckgelesen'); zeilenHinweis = 0;
  // Spalten und Zeilen zusammen setzen: stünden kurz neue Spalten neben alten Zeilen (weniger Spalten als vorher), bräche die Tabelle ab.
  s.spalten = markiereCodeSpalten(spalten, s.codeSpalten); s.zeilen = zeilen;
  await gewichtAbgleichen(e, spalten);
  // Je Spalte erst dann gebaut, wenn die Prüfung sie braucht, und danach wieder frei: So liegt die Tabelle nicht ein zweites Mal im Speicher.
  const daten = function* (): Generator<SpalteDaten> { for (let i = 0; i < spalten.length; i++) { const sp = spalten[i]!; yield { name: sp.name, bezeichnung: sp.bezeichnung, art: sp.art, fehlend: sp.fehlend, fehlendBereich: sp.fehlendBereich, werte: zeilen.map(z => z[i] ?? null) }; } };
  // Beim Eingeben: ganz leere Zeilen (gerade angefügt) und noch leere Spalten sind kein Befund.
  const leereZeile = new Set(zeilen.flatMap((z, i) => (z.every(v => v === null) ? [i] : [])));
  zm('vor-check');
  const funde0 = pruefe(daten()); zm('check');
  s.funde = funde0.flatMap((f): Fund[] => {
    if (f.art !== 'leer') return [f];
    if (s.blaetter.some(b => b.kat?.uebernommen.some(u => u?.namen.includes(f.spalte)))) return [];   // Spalten von „Offene Antworten ordnen“: leer ist hier gewollt (fehlend)
    const i = spalten.findIndex(x => x.name === f.spalte);
    if (zeilen.every(z => z[i] === null)) return [];
    const zl = f.zeilen.filter(z => !leereZeile.has(z));
    return zl.length ? [{ ...f, zeilen: zl, anzahl: zl.length }] : [];
  });
}

/** Die Ausgaben auf der Befehle-Seite gehören zu den Daten, mit denen sie gerechnet wurden: beim Wechsel des Projekts weg damit
 *  (Testrunde 24.10.: unter d1-mtcars standen FREQUENCIES-Zahlen aus nacht.sav). Der Befehlstext bleibt - er ist ein Entwurf, keine Zahl. */
function ausgabenLeeren() { befehle.laeufe = []; }

/** Ein neues Projekt anlegen: das bisher offene wird vorher abgelegt und bleibt in der Liste. Ein unverändertes Projekt gleichen Namens (nur geöffnet, nie bearbeitet) wird dabei überschrieben statt verdoppelt. */
function starteProjekt(name: string, quelle: string) {
  const gleich = s.projekte.find(p => p.name === name && p.blaetter === 0 && !p.ungesichert);
  s.projekt = { id: gleich?.id ?? neueId(), name, quelle }; bekannteZeit = gleich?.zeit; s.konflikt = false; ausgabenLeeren();
  s.blaetter = []; s.lesehinweise = []; s.sets = []; s.skalen = []; s.codeSpalten = []; s.zusatz = {}; s.integration = {}; s.fragebogen = []; s.fragebogenBilder = {}; s.fragebogenEingaben = {}; s.fragebogenPretest = {}; s.leitfaeden = []; s.planung = []; s.qual = undefined; s.konsens = undefined; s.enthaeltZitate = false; s.gewicht = undefined; s.gewichtFrage = null; s.verlauf = []; s.wieder = []; s.protokoll = []; s.protokollLuecke = false; s.datei = undefined; s.entscheid = {}; s.fehler = null; s.ungesichert = false; s.ungesichertSeit = null; setzeZielNur(null); void vergissZiel(s.projekt.id);
}
/** Vor allem, was die Engine mit neuen Daten füllt: das offene Projekt ablegen (sonst landeten die neuen Daten unter seiner id) und die Liste lesen. */
async function vorNeuem() { await sichereSofort(); await ladeListe(); }
async function nachLaden(name: string, quelle: string) {
  starteProjekt(name, quelle);
  zm('vor-aktualisiere');
  await aktualisiere(); zm('aktualisiert');
  await sichern(false);
  // Große Tabelle, aber noch unter der Grenze: vorher sagen, dass es langsam wird (Abschlusstest A1)
  const g = groesseVon(s.zeilen.length, s.spalten.length);
  if (urteil(g) === 'langsam') melde(langsamText(g));
}

/** Die zuletzt eingelesene Tabelle samt den Spalten, die als Tausender gelesen werden sollen - für „Als Tausender lesen“ im Daten-Check. */
let letzteTabelle: { t: Tabelle; name: string; tausender: string[]; zahlen: string[] } | null = null;
/** Zu welchem Projekt die Tabelle gehört: öffnet die Person danach eine andere Art Datei, ist `letzteTabelle` veraltet und gilt nicht für das offene Projekt. */
let letzteTabelleId: string | undefined;
/** Die Zeilen von `letzteTabelle` wurden freigegeben (große Datei ohne Frage zum Lesen): Neu lesen geht dann nur über die Datei selbst. */
let zeilenFort = false;

/** Die Kopfzeile der Tabelle, aus der die Daten eingelesen wurden (für Schritte der Art „Lesart“ einer Vorlage); `null`, wenn die Daten nicht aus einer Tabelle stammen. */
export const kopfzeileDerTabelle = (): string[] | null => (letzteTabelle && letzteTabelleId === s.projekt?.id ? [...letzteTabelle.t.kopf] : null);
export async function oeffneTabelle(t: Tabelle, name: string, tausender: string[] = [], zahlen: string[] = [], zeilenFrei = false) {
  pruefeGroesseNachher(t.zeilen.length, t.kopf.length, name);   // zu groß für den Tab: Meldung statt Absturz (Abschlusstest A1)
  zm('tabelle-0');
  zeilenHinweis = t.zeilen.length;
  const e = await motor(); zm('motor-da'); await vorNeuem(); zm('vorNeuem');
  await e.run('NEW FILE.');
  zm('engine-bereit');
  const plan = planeSpalten(t, tausender, zahlen); zm('typen');
  // Große Datei ohne Frage zum Lesen: Die Zellen als Text braucht danach niemand mehr. Sie sind der größte Posten beim Öffnen (1 Mio. × 20: rund 700 MB), darum schon beim Bauen der CSV frei.
  const zeilenZahl = t.zeilen.length;
  zeilenFort = zeilenFrei && zeilenZahl >= SAV_AB_ZEILEN && !plan.some(p => p.lesart || p.beiwerk);
  const { syntax, csv } = zurEngine(t, plan, zeilenFort); zm('engine-csv');
  if (zeilenFort) t.zeilen = [];
  const r = await e.run(syntax + '\nSHOW N.', { '/import.csv': csv }, true); zm('engine-gelesen');
  const fehler = r.items.find(i => i.type === 'message' && i.severity === 'error');
  if (fehler && fehler.type === 'message') throw new DateiFehler('unlesbar', name);
  // D1: Die Engine muss genauso viele Fälle gelesen haben, wie die Tabelle Zeilen hat - sonst lieber ein Fehler als still falsche Daten.
  const fallzahl = liesFallzahl(r.items);
  if (fallzahl !== null && fallzahl !== zeilenZahl) throw new DateiFehler('unlesbar', name, `${fallzahl} / ${zeilenZahl}`);
  await nachLaden(name.replace(/\.[a-z0-9]+$/i, ''), t.quelle);
  letzteTabelle = { t, name, tausender, zahlen }; letzteTabelleId = s.projekt?.id;
  s.lesehinweise = [
    ...plan.flatMap((p, i): Lesehinweis[] => (p.lesart ? [{ art: 'lesart', kopf: t.kopf[i]!, spalte: p.name, beispiele: p.lesart.beispiele }] : [])),
    ...plan.flatMap((p, i): Lesehinweis[] => (p.beiwerk ? [{ art: 'beiwerk', kopf: t.kopf[i]!, spalte: p.name, ...p.beiwerk }] : [])),
    ...(t.titel ? [{ art: 'titel' as const, ...t.titel }] : []),
    ...(t.abweichend?.length ? [{ art: 'feldzahl' as const, erwartet: t.kopf.length, zeilen: t.abweichend }] : [])
  ];
  // Sagen, was beim Einlesen gedeutet wurde (Prüfung A12/C4, C5) - nie still.
  const gedeutet = plan.filter(p => p.marker).map(p => `${p.bezeichnung || p.name}: ${Object.entries(p.marker!).map(([m, n]) => `${n} × „${m}“`).join(', ')}`);
  const doppelt = plan.filter(p => p.umbenanntVon);
  const teile = [
    ...(doppelt.length ? [L(`Mehrere Spalten heißen gleich: ${doppelt.slice(0, 3).map(p => `die spätere „${p.umbenanntVon}“ heißt jetzt „${p.bezeichnung}“`).join('; ')}${doppelt.length > 3 ? ' …' : ''}.`, `Several columns have the same name: ${doppelt.slice(0, 3).map(p => `the later "${p.umbenanntVon}" is now called "${p.bezeichnung}"`).join('; ')}${doppelt.length > 3 ? ' …' : ''}.`)] : []),
    ...(gedeutet.length ? [L(`Als „keine Angabe“ gelesen - ${gedeutet.slice(0, 3).join('; ')}${gedeutet.length > 3 ? ' …' : ''}.`, `Read as "no answer" - ${gedeutet.slice(0, 3).join('; ').replace(/„|“/g, '"')}${gedeutet.length > 3 ? ' …' : ''}.`)] : []),
    ...(s.lesehinweise.length ? [L('Beim Einlesen gab es Fragen zu den Zahlen oder Zeilen - Näheres im Daten-Check.', 'Some numbers or rows were unclear while reading - see the data check for details.')] : []),
    ...(t.weitere?.length ? [t.gewaehlt
      ? L(`Geöffnet ist das Blatt „${t.blatt}“. Die anderen Blätter (${t.weitere.join(', ')}) wurden nicht gelesen. Ein anderes Blatt: die Datei noch einmal öffnen und es wählen.`, `The sheet "${t.blatt}" is open. The other sheets (${t.weitere.join(', ')}) were not read. For another sheet, open the file again and choose it.`)
      : L(`Die Datei hat weitere Blätter (${t.weitere.join(', ')}); geöffnet ist das erste. Ein anderes Blatt: in Excel als eigene Datei speichern.`, `The file has more sheets (${t.weitere.join(', ')}); the first one is open. For another sheet, save it as its own file in Excel.`)] : [])
  ];
  if (teile.length) melde(teile.join(' '));
}

/** Neu einlesen mit geänderter Lesart, mit dem Stand davor im Verlauf (N2): „Rückgängig“ liest die Spalte wieder wie vorher und bringt den Hinweis im Daten-Check zurück. */
async function liesNeu(text: string, tausender: string[], zahlen: string[], lesart: { modus: 'tausender' | 'zahl'; kopf: string }) {
  if (!letzteTabelle) return;
  if (zeilenFort) throw new Error(L('Diese große Datei lässt sich nicht anders lesen, ohne sie neu zu öffnen.', 'This large file cannot be read differently without opening it again.'));
  const { t, name } = letzteTabelle;
  const davor = { sav: (await (await motor()).exportSav()).bytes, hinweise: s.lesehinweise, tausender: letzteTabelle.tausender, zahlen: letzteTabelle.zahlen, entscheid: { ...s.entscheid } };
  const vor = standJetzt(), protokollAlt = s.protokoll, luecke = s.protokollLuecke, dateiAlt = s.datei;
  await oeffneTabelle(t, name, tausender, zahlen);
  s.protokoll = protokollAlt; s.protokollLuecke = luecke; s.datei = dateiAlt;   // dieselbe Datei, nur anders gelesen: das Protokoll bleibt
  const pnr = legeProtokollAn(vor, { art: 'lesart', opt: { wiederhol: { typ: 'lesart', modus: lesart.modus, kopf: lesart.kopf } } });
  s.verlauf = anhaengen(s.verlauf, { text, sav: davor.sav, pnr, entscheid: davor.entscheid, lese: { hinweise: davor.hinweise, tausender: davor.tausender, zahlen: davor.zahlen } });
  await sichern();
}
/** Daten-Check: die Werte der Spalte wie 1.333 als Tausender (1333) lesen - die Datei wird neu eingelesen. Nur solange nichts geändert wurde. */
export async function liesAlsTausender(kopf: string) {
  if (!letzteTabelle) return;
  await liesNeu(L('Als Tausender lesen', 'Read as thousands'), [...letzteTabelle.tausender, kopf], letzteTabelle.zahlen, { modus: 'tausender', kopf });
  melde(L(`${kopf}: Werte wie 1.333 werden jetzt als Tausender gelesen (1333).`, `${kopf}: values like 1.333 are now read as thousands (1333).`));
}
/** Daten-Check (D10): eine Spalte aus Zahlen mit %- oder Währungszeichen als Zahl lesen - das Zeichen entfällt (45 % wird 45). */
export async function liesAlsZahl(kopf: string) {
  if (!letzteTabelle) return;
  await liesNeu(L('Als Zahl lesen', 'Read as number'), letzteTabelle.tausender, [...letzteTabelle.zahlen, kopf], { modus: 'zahl', kopf });
  melde(L(`${kopf}: wird jetzt als Zahl gelesen.`, `${kopf}: is now read as a number.`));
}
/** Daten-Check: einen Lesehinweis abhaken - mit „Rückgängig“ wieder da (N2). */
export async function schliesseLesehinweis(i: number) {
  const h = s.lesehinweise[i]; if (!h) return;
  const sav = (await (await motor()).exportSav()).bytes;
  s.verlauf = anhaengen(s.verlauf, { text: h.art === 'feldzahl' || h.art === 'titel' ? L('Verstanden', 'Got it') : L('So richtig', 'That is right'), sav, entscheid: { ...s.entscheid }, lese: { hinweise: s.lesehinweise, tausender: letzteTabelle?.tausender ?? [], zahlen: letzteTabelle?.zahlen ?? [] } });
  s.wieder = [];
  s.lesehinweise = s.lesehinweise.filter((_, k) => k !== i);
}
/** Beim Rückgängig und Wiederholen: die Lesehinweise (und die Tausender-Spalten) des Schritts einsetzen, den heutigen Stand zurückgeben. */
function tauscheLese(neu: NonNullable<Schritt['lese']> | undefined): Schritt['lese'] {
  if (!neu) return undefined;
  const heute = { hinweise: s.lesehinweise, tausender: letzteTabelle?.tausender ?? [], zahlen: letzteTabelle?.zahlen ?? [] };
  s.lesehinweise = neu.hinweise;
  if (letzteTabelle) letzteTabelle = { ...letzteTabelle, tausender: neu.tausender, zahlen: neu.zahlen };
  return heute;
}

export async function oeffneSav(bytes: Uint8Array, name: string) {
  // Variablensets aus SPSS (oder aus einem Export von Statable) werden Skalen - vor dem Import lesen, die Engine übernimmt die Bytes
  const vs = leseVariablensets(bytes);
  const e = await motor(); await vorNeuem();
  const r = await e.importSav(bytes);
  const fehler = r.items.find(i => i.type === 'message' && i.severity === 'error');
  if (fehler && fehler.type === 'message') { s.fehler = { titel: L('Diese Datei lässt sich nicht lesen', "This file can't be read"), text: name, details: fehler.text }; throw new DateiFehler('unlesbar', name); }
  await nachLaden(name.replace(/\.[a-z0-9]+$/i, ''), name);
  const skalen = skalenAusSets(vs);
  if (skalen.length) { s.skalen = skalen; await sichern(false); melde(Lp(skalen.length, `Die Datei bringt ${skalen.length} Variablenset mit (${skalen.map(x => x.name).join(', ')}). Statable nimmt es als Skala; ändern unter „Spalten“.`, `Die Datei bringt ${skalen.length} Variablensets mit (${skalen.map(x => x.name).join(', ')}). Statable nimmt sie als Skalen; ändern unter „Spalten“.`, `The file contains ${skalen.length} variable set (${skalen.map(x => x.name).join(', ')}). Statable uses it as a scale; change it under "Columns".`, `The file contains ${skalen.length} variable sets (${skalen.map(x => x.name).join(', ')}). Statable uses them as scales; change them under "Columns".`), true); }
}
/** SPSS erlaubt, dass eine Spalte in mehreren Sets steht; eine Skala-Frage gehört nur zu einer Skala: die erste gewinnt. */
function skalenAusSets(vs: { name: string; spalten: string[] }[]): Skala[] {
  const belegt = new Set<string>(), aus: Skala[] = [];
  for (const v of vs) {
    const fragen = v.spalten.filter(n => !belegt.has(n) && s.spalten.some(sp => sp.name === n && sp.art === 'zahl'));
    if (fragen.length < 2 || aus.some(x => x.name.toLowerCase() === v.name.toLowerCase())) continue;
    fragen.forEach(n => belegt.add(n)); aus.push({ name: v.name.slice(0, 64), fragen });
  }
  return aus;
}

/** Stata-Datei (.dta): eigener Leser, dann wie eingegebene Daten in die Engine (Bezeichnungen, Wertelabels, fehlende Werte, Niveau). */
export async function oeffneStata(bytes: Uint8Array, name: string) {
  let daten;
  try { daten = leseStata(bytes); }
  catch (f) { if (f instanceof StataFehler && f.grund === 'version') throw new DateiFehler('stata', name, String(f.version)); throw new DateiFehler('unlesbar', name); }
  if (!daten.spalten.length) throw new DateiFehler('leer', name);
  pruefeGroesseNachher(daten.zeilen.length, daten.spalten.length, name);
  const e = await motor(); await vorNeuem();
  const { syntax, csv } = neuAufbauen(daten.spalten, daten.zeilen);
  const r = await e.run('NEW FILE.\n' + syntax, { '/eingabe.csv': csv });
  const fehler = r.items.find(i => i.type === 'message' && i.severity === 'error');
  if (fehler && fehler.type === 'message') { s.fehler = { titel: L('Diese Datei lässt sich nicht lesen', "This file can't be read"), text: name, details: fehler.text }; throw new DateiFehler('unlesbar', name); }
  await nachLaden(name.replace(/\.[a-z0-9]+$/i, ''), name);
  if (daten.hinweise.length) melde(daten.hinweise.join(' '));
}

/** SAS-Datei (.sas7bdat, .xpt): eigener Leser (erst jetzt geladen), dann wie eingegebene Daten in die Engine (Bezeichnungen, Datum, fehlende Werte). */
export async function oeffneSas(bytes: Uint8Array, name: string) {
  const { leseSas } = await import('./sas');
  let daten;
  try { daten = leseSas(bytes); }
  catch { throw new DateiFehler('unlesbar', name); }
  if (!daten.spalten.length) throw new DateiFehler('leer', name);
  pruefeGroesseNachher(daten.zeilen.length, daten.spalten.length, name);
  const e = await motor(); await vorNeuem();
  const { syntax, csv } = neuAufbauen(daten.spalten, daten.zeilen);
  const r = await e.run('NEW FILE.\n' + syntax, { '/eingabe.csv': csv });
  const fehler = r.items.find(i => i.type === 'message' && i.severity === 'error');
  if (fehler && fehler.type === 'message') { s.fehler = { titel: L('Diese Datei lässt sich nicht lesen', "This file can't be read"), text: name, details: fehler.text }; throw new DateiFehler('unlesbar', name); }
  await nachLaden(name.replace(/\.[a-z0-9]+$/i, ''), name);
  if (daten.hinweise.length) melde(daten.hinweise.join(' '));
}

export async function oeffneBeispiel() {
  const antwort = await fetch(new URL('beispiel/schlaf-und-konzentration.csv', document.baseURI));
  const t = leseCsv(await antwort.text(), 'schlaf-und-konzentration.csv');
  // Andere Sprache als Deutsch: die Gruppenwerte der Beispieldatei (auch die absichtlich uneinheitlichen) übersetzen; Spaltennamen bleiben.
  const wort: Record<string, string> = {
    weiblich: L('weiblich', 'female'), Weiblich: L('Weiblich', 'Female'), 'männlich': L('männlich', 'male'), 'männl.': L('männl.', 'male.'),
    w: L('w', 'f'), m: L('m', 'm'), divers: L('divers', 'diverse'), ja: L('ja', 'yes'), nein: L('nein', 'no')
  };
  const gruppe = new Set([t.kopf.indexOf('geschlecht'), t.kopf.indexOf('handy_im_bett')]);
  t.zeilen = t.zeilen.map(z => z.map((v, i) => (gruppe.has(i) && typeof v === 'string' && Object.hasOwn(wort, v) ? wort[v]! : v)));
  // Spaltennamen in der gewählten Sprache (wie bei den Übungsdateien, lib/beispiele.ts SPALTENNAMEN).
  const { namenFuer } = await import('./beispiele');
  const namen = namenFuer(t.kopf), nm = (n: string) => namen[n] ?? n;
  t.kopf = t.kopf.map(nm); t.festeNamen = true;
  await oeffneTabelle(t, L('Schlaf und Konzentration (Beispiel)', 'Sleep and Concentration (Example)'));
  // Eine CSV-Datei kennt keine Bezeichnungen - für das Beispiel setzen wir sie, wie es eine gute .sav-Datei hätte.
  const e = await motor();
  const b = [L('Laufende Nummer', 'Case number'), L('Geschlecht', 'Gender'), L('Alter (Jahre)', 'Age (years)'), L('Semester', 'Semester'), L('Handy im Bett', 'Phone in bed'),
    L('Schlaf (Stunden pro Nacht)', 'Sleep (hours per night)'), L('Kaffee (Tassen pro Tag)', 'Coffee (cups per day)'), L('Konzentration (Punkte)', 'Concentration (points)')];
  const spalten = ['nr', 'geschlecht', 'alter', 'semester', 'handy_im_bett', 'schlaf_stunden', 'kaffee_tassen', 'konzentration'];
  await e.run(`VARIABLE LABELS ${spalten.map((n, i) => `${nm(n)} ${zitSicher(b[i]!)}`).join(' /')}.
VARIABLE LEVEL ${nm('geschlecht')} ${nm('handy_im_bett')} (NOMINAL) /${nm('semester')} (ORDINAL).`);
  await aktualisiere(); await sichern(false);
}

/** Ein Beispiel aus dem Katalog (lib/beispiele.ts) öffnen: Daten, Bezeichnungen, Wertebezeichnungen, Niveaus und Mehrfachantworten-Sets.
 *  Die Spalten heißen danach wie in der gewählten Sprache (`namenFuer`); zurück kommt die Zuordnung Name der Datei → Name in den Daten, für den Begleiter. */
/** `nur`: nur diese Spalten (Namen wie in der Datei) kommen ins Projekt - für „Lernen“, wo ein Beispiel genau einen Schritt zeigt. */
export async function oeffneBeispielNr(b: import('./beispiele').Beispiel, nur?: string[]): Promise<Record<string, string>> {
  zaehle('beispiel', b.id);
  const antwort = await fetch(new URL(`beispiel/${b.datei}.csv`, document.baseURI));
  if (!antwort.ok) throw new DateiFehler('unlesbar', `${b.datei}.csv`);
  const tab = leseCsv(await antwort.text(), `${b.datei}.csv`);
  const teil = nur?.length && nur.every(n => tab.kopf.includes(n)) ? nur : undefined;
  if (teil) {
    const idx = tab.kopf.map((n, i) => (teil.includes(n) ? i : -1)).filter(i => i >= 0);
    tab.kopf = idx.map(i => tab.kopf[i]!); tab.zeilen = tab.zeilen.map(z => idx.map(i => z[i]!));
  }
  for (const [spalte, wort] of Object.entries(b.zellen ?? {})) {
    const i = tab.kopf.indexOf(spalte); if (i < 0) continue;
    tab.zeilen = tab.zeilen.map(z => z.map((v, k) => (k === i && typeof v === 'string' && Object.hasOwn(wort, v) ? waehle(wort[v]!) : v)));
  }
  const { namenFuer } = await import('./beispiele');
  const namen = namenFuer(tab.kopf), nm = (n: string) => namen[n] ?? n;
  const kopf = tab.kopf;
  tab.kopf = kopf.map(nm); tab.festeNamen = true;
  await oeffneTabelle(tab, `${waehle(b.titel)} (${teil ? L('Ausschnitt', 'Extract') : L('Beispiel', 'Example')})`);
  const e = await motor();
  const zit = zitSicher;
  const befehle: string[] = [];
  const bez = b.bez.filter(z => kopf.includes(z.spalte));
  if (bez.length) befehle.push('VARIABLE LABELS ' + bez.map(z => `${nm(z.spalte)} ${zit(waehle(z.bez))}`).join(' /') + '.');
  for (const { spalte, labels } of b.werte ?? []) befehle.push(`VALUE LABELS ${nm(spalte)} ${labels.map(([k, p]) => `${k} ${zit(waehle(p))}`).join(' ')}.`);
  if (b.nominal?.length) befehle.push(`VARIABLE LEVEL ${b.nominal.filter(n => kopf.includes(n)).map(nm).join(' ')} (NOMINAL).`);
  if (b.ordinal?.length) befehle.push(`VARIABLE LEVEL ${b.ordinal.filter(n => kopf.includes(n)).map(nm).join(' ')} (ORDINAL).`);
  if (befehle.length) await e.run(befehle.join('\n'));
  const sets = (b.sets ?? []).filter(x => x.spalten.every(n => kopf.includes(n)));
  if (sets.length) s.sets = sets.map(x => ({ ...x, spalten: x.spalten.map(nm) }));
  await aktualisiere(); await sichern(false);
  return namen;
}

/* ---------- Daten eingeben ---------- */
/** Baut den Datensatz mit neuen Spalten/Zeilen neu auf - ein Schritt zum Rückgängigmachen. */
export async function aendereDaten(text: string, spalten: Spalte[], zeilen: Wert[][], stumm = false, opt: AendereOpt = {}) {
  const e = await motor();
  const vor = standJetzt();
  const { bytes } = await e.exportSav();
  const { syntax, csv } = neuAufbauen(spalten, zeilen);
  const r = await e.run('NEW FILE.\n' + syntax, { '/eingabe.csv': csv });
  const fehler = r.items.find(i => i.type === 'message' && i.severity === 'error');
  if (fehler) { await e.importSav(bytes.slice()); await aktualisiere(); melde(L('Das ließ sich nicht speichern. Es ist alles wie vorher.', "That couldn't be saved. Everything is as it was before.")); return false; }
  s.verlauf = anhaengen(s.verlauf, { text, sav: bytes, gewicht: jetztGewicht(), entscheid: { ...s.entscheid } }); s.wieder = [];
  await aktualisiere();
  merkePnr(legeProtokollAn(vor, { art: opt.art ?? 'neuaufbau', opt }));
  await sichern();
  if (!stumm) melde(text + '.', true);
  return true;
}

/** Neue, leere Studie: Spalten wie im Formular, eine leere Zeile zum Losschreiben. */
export async function neueStudie(name: string, neu: NeueSpalte[]) {
  const spalten: Spalte[] = [];
  for (const n of neu) spalten.push(baueSpalte(n, spalten.map(x => x.name)));
  const e = await motor(); await vorNeuem();
  const { syntax, csv } = neuAufbauen(spalten, [spalten.map(() => null)]);
  const r = await e.run('NEW FILE.\n' + syntax, { '/eingabe.csv': csv });
  const fehler = r.items.find(i => i.type === 'message' && i.severity === 'error');
  if (fehler && fehler.type === 'message') throw new Error(fehler.text);
  await nachLaden(name.trim() || L('Neue Studie', 'New study'), L('in Statable eingegeben', 'entered in Statable'));
}

/** Öffnet aufgebaute Daten (z. B. nach dem Umstrukturieren) als neues Projekt. Schlägt der Aufbau fehl, bleibt das bisherige Projekt unverändert. */
export async function oeffneNeueDaten(name: string, quelle: string, spalten: Spalte[], zeilen: Wert[][], art?: Art) {
  const e = await motor(); await vorNeuem();
  const vorZeilen = s.projekt ? s.zeilen.length : 0;
  const { bytes } = await e.exportSav();
  const { syntax, csv } = neuAufbauen(spalten, zeilen);
  const r = await e.run('NEW FILE.\n' + syntax, { '/eingabe.csv': csv });
  const fehler = r.items.find(i => i.type === 'message' && i.severity === 'error');
  if (fehler && fehler.type === 'message') { if (s.projekt) await e.importSav(bytes.slice()); throw new Error(fehler.text); }
  await nachLaden(name.trim() || L('Umstrukturiert', 'Reshaped'), quelle);
  // Spalten aus dem Codierungen-Import merken (Namen aus dem Verzeichnis: die Engine kann sie umbenannt haben, die Reihenfolge bleibt)
  if (spalten.length === s.spalten.length && spalten.some(c => c.herkunft === 'codes')) { s.codeSpalten = spalten.flatMap((c, i) => (c.herkunft === 'codes' ? [s.spalten[i]!.name] : [])); s.spalten = markiereCodeSpalten(s.spalten, s.codeSpalten); await sichern(false); }
  if (art) { legeProtokollAn({ spalten: [], zeilen: [], zeichen: [] }, { art, opt: { nicht: 'neu' }, vorherZeilen: vorZeilen }); await sichern(false); }   // die Daten dieses Projekts sind aus einem anderen entstanden
}

/**
 * Öffnet Daten von Eurostat als neues Projekt (Fachblatt SAISON-EUROSTAT, Abschnitt 2): lange Form, eine Spalte je Dimension (Code), `wert`, `status`; ein fehlender Wert bleibt leer.
 * Die Quelle (Datensatz, Abrufdatum, `updated`, genaue Abfrage) und die Prüfsumme der Antwort werden an den Daten gespeichert (`s.datei`) und stehen im Protokoll und im Bericht.
 * Das Öffnen ist kein Schritt im Protokoll der Datenänderungen und gehört nicht in eine Vorlage. Die Namen der Spalten laufen wie bei jeder Datei durch `psppName`.
 */
export async function oeffneEurostat(tabRoh: EurostatTabelle, quelle: EurostatQuelle, sha256: string | null) {
  const name = `Eurostat ${quelle.datensatz}`;
  // Die Zeitspalte wird ein Datum, wenn alle Zeitangaben so lesbar sind (Monate, Tage, Jahre; derselbe Weg wie beim Einlesen einer CSV-Datei); sonst bleibt sie Text, mit Satz.
  const zeit = eurostatZeitAlsDatum(tabRoh), tab = zeit.tab;
  pruefeGroesseNachher(tab.zeilen.length, tab.kopf.length, name);
  const vergeben = new Set<string>();
  const spalten: Spalte[] = tab.kopf.map((k, i) => {
    const zahl = tab.art[i] === 'zahl', datum = tab.art[i] === 'datum';
    return { name: psppName(k, vergeben, i + 1), bezeichnung: tab.bezeichnungen[i] ?? '', art: zahl ? 'zahl' : datum ? 'datum' : 'text', niveau: zahl || datum ? 'metrisch' : 'nominal', format: zahl ? 'F8.0' : datum ? 'EDATE10' : 'A1', fehlend: [], fehlendText: '', werteLabels: {} };
  });
  await oeffneNeueDaten(name, L(`Eurostat, Datensatz ${quelle.datensatz}, abgerufen am ${quelle.abruf}`, `Eurostat, dataset ${quelle.datensatz}, requested on ${quelle.abruf}`), spalten, tab.zeilen);
  s.datei = { name, sha256, eurostat: { ...quelle } };
  await sichern(false);
  const satz = eurostatZeitSatz(zeit);
  if (satz) melde(satz);
}

/** Einträge einer Projektdatei, die diese Fassung nicht kennt: einmal ansagen (gemeinsame Ansage über `melde`), bleibt stehen, bis sie geschlossen wird. */
export function meldeUnbekannteEintraege(m: DateiMeldung[] | undefined) {
  if (!m?.length) return;
  melde(m.length === 1 ? m[0]!.satz : L(`Die Datei enthält ${m.length} Einträge, die diese Statable-Fassung nicht kennt: ${m.map(x => '„' + x.name + '“').join(', ')}. Sie werden übersprungen.`, `The file contains ${m.length} entries that this version of Statable does not know: ${m.map(x => '"' + x.name + '"').join(', ')}. They are skipped.`), false, true);
}

/** Öffnet, was immer kommt, als neues Projekt. Syntax-Dateien gibt es an die Befehle-Seite zurück. */
export async function oeffneDatei(datei: File, handle?: DateiZugriff, vorgelesen?: Eingelesen): Promise<'daten' | 'projekt' | { syntax: string; name: string }> {
  zm('oeffneDatei-0');
  const e = vorgelesen ?? await leseDatei(datei);
  zaehle('datei', (/\.([a-z0-9]{1,8})$/i.exec(datei.name)?.[1] ?? ''));
  if (e.art === 'syntax') return { syntax: e.text, name: e.name };
  if (e.art === 'projekt') { await oeffneProjekt(e.projekt, { name: datei.name, zeit: datei.lastModified || Date.now(), handle }); if (e.verschluesselt) markiereVerschluesselt(); meldeUnbekannteEintraege(e.meldungen); return 'projekt'; }
  if (e.art === 'sav') await oeffneSav(e.bytes, e.name); else if (e.art === 'stata') await oeffneStata(e.bytes, e.name); else if (e.art === 'sas') await oeffneSas(e.bytes, e.name); else await oeffneTabelle(e.tabelle, e.name, [], [], true);
  await merkeDatei(datei);
  return 'daten';
}

/* ---------- Protokoll jeder Datenänderung (Abschnitt 6, Teil B) ---------- */
/** Läuft gerade eine Vorlage? Dann stehen die Einträge als „aus Vorlage“, mit der Datei der Vorlage und der Prüfsumme der neuen Datei. */
export const lauf: { vorlage: null | { datei: string; pruefsummeVorlage: string | null; schritt: number } } = { vorlage: null };
/** Angaben zu einer Datenänderung für das Protokoll und die Vorlage. Ohne Angabe: die Art ergibt sich aus dem Befehl, ein Befehl mit erlaubten Anweisungen ist wiederholbar. */
export interface AendereOpt {
  art?: Art;
  /** Der Befehl trüge Werte aus den Daten (gefundene Schreibweisen, Kennwerte der Stichprobe …): er kommt nicht in das Protokoll und die Vorlage, der Schritt ist „nicht wiederholbar“. */
  ausDaten?: boolean;
  wiederhol?: Wiederhol; nicht?: NichtGrund;
  /** Zuordnung einer vorhandenen Spalte zu einer der Vorlage: kommt in das Protokoll, nicht in spätere Vorlagen. */
  zuordnung?: { von: string; nach: string };
  /** Art `abgleich`: die Regel der Person (nur Namen und Zahlen) für das Protokoll. */
  abgleich?: AbgleichAngabe;
}
const NICHT_NACH_ART: Partial<Record<Art, NichtGrund>> = { abgleich: 'art', zelle: 'zeilen', zeilePlus: 'zeilen', zeileWeg: 'zeilen', einfuegen: 'zeilen', umformen: 'neu', kategorien: 'aus-daten', datencheck: 'aus-daten', zusammen: 'zweite-datei' };
/** Der Stand der Tabelle jetzt, für den Vergleich vorher/nachher (nur Namen, Arten, Fingerabdrücke der Eigenschaften und die Zeilen selbst als Verweis). */
const standJetzt = (): Stand => protokollStand(s.spalten.map(sp => ({ name: sp.name, art: sp.art, bezeichnung: sp.bezeichnung, niveau: sp.niveau, format: sp.format, fehlend: sp.fehlend, werteLabels: sp.werteLabels })), s.zeilen);

/** Legt einen Eintrag an. Gibt seine Nummer zurück. Die Daten sind schon geändert (`s.spalten` und `s.zeilen` zeigen den Stand danach). */
function legeProtokollAn(vor: Stand, o: { art: Art; syntax?: string; gewicht?: Gewicht | null; opt?: AendereOpt; ergebnis?: 'ok' | 'fehler'; vorherZeilen?: number }): number {
  const nach = standJetzt();
  const v = vergleiche(vor, nach);
  const nr = s.protokoll.reduce((m, e) => Math.max(m, e.nr), 0) + 1;
  const opt = o.opt ?? {};
  let wiederhol: Wiederhol | undefined = opt.wiederhol, nicht: NichtGrund | undefined = opt.nicht, werte: boolean | undefined;
  if (!wiederhol && !nicht) {
    if (opt.ausDaten) nicht = 'aus-daten';
    else if (o.syntax !== undefined) {
      const p = pruefeSyntax(o.syntax);
      if (p.ok) { wiederhol = { typ: 'syntax', befehle: p.befehle, ...(o.gewicht !== undefined ? { gewicht: o.gewicht } : {}) }; if (p.hatWerte) werte = true; }
      else nicht = p.grund === 'zeilen' ? 'zeilen' : p.grund === 'zu-lang' ? 'zu-lang' : o.art === 'zusammen' ? 'zweite-datei' : 'befehl';
    } else nicht = NICHT_NACH_ART[o.art] ?? 'art';
  }
  if (o.ergebnis === 'fehler') { wiederhol = undefined; nicht = 'fehler'; werte = undefined; }
  // Welche Spalten der Schritt aus den Daten liest (nur Namen und Arten)
  const namen = wiederhol?.typ === 'syntax' ? bezeichnerIn(wiederhol.befehle) : wiederhol?.typ === 'sortieren' ? wiederhol.schluessel.map(k => k.spalte) : wiederhol?.typ === 'spalteWeg' ? [wiederhol.name] : [];
  const liest: Record<string, 'zahl' | 'text' | 'datum'> = {};
  const artVor = new Map(vor.spalten.map(sp => [sp.name.toLowerCase(), sp] as const));
  for (const n of namen) { const sp = artVor.get(n.toLowerCase()); if (sp) liest[sp.name] = sp.art; }
  const l = lauf.vorlage;
  const e: ProtokollEintrag = {
    nr, art: o.art, spalten: v.spalten.slice(0, 500), betroffen: vor.spalten.length || vor.zeilen.length ? v.betroffen : null, vorher: o.vorherZeilen ?? vor.zeilen.length, nachher: nach.zeilen.length, zeit: Date.now(),
    quelle: l ? 'vorlage' : 'hand', ergebnis: o.ergebnis === 'fehler' ? 'fehler' : 'ok', ...(o.ergebnis === 'fehler' ? { grund: 'pspp' as const } : {}),
    ...(l ? { vorlage: { datei: l.datei, pruefsummeVorlage: l.pruefsummeVorlage, pruefsummeDaten: s.datei?.sha256 ?? null, datenName: s.datei?.name ?? null, schritt: l.schritt } } : {}),
    ...(wiederhol ? { wiederhol } : {}), ...(nicht ? { nicht } : {}), ...(werte ? { werte } : {}), ...(Object.keys(liest).length ? { liest } : {}), ...(v.erzeugt.length ? { erzeugt: v.erzeugt.slice(0, 500) } : {}),
    ...(opt.zuordnung ? { zuordnung: opt.zuordnung, ohneVorlage: true } : {}), ...(opt.abgleich ? { abgleich: opt.abgleich } : {})
  };
  s.protokoll = [...s.protokoll, e];
  return nr;
}
/** Hängt die Nummer des Protokolleintrags an den jüngsten Schritt des Verlaufs. */
function merkePnr(nr: number) { const l = s.verlauf.at(-1); if (l) l.pnr = nr; }
/** Rückgängig (oder abgebrochener Lauf): der Eintrag bleibt stehen und bekommt den Vermerk „zurückgenommen“. */
export function nimmZurueck(nrn: number[], grund: 'rueckgaengig' | 'abbruch') {
  const z = Date.now();
  s.protokoll = s.protokoll.map(e => (nrn.includes(e.nr) && !e.zurueck ? { ...e, zurueck: { zeit: z, grund } } : e));
}
/** Wiederholen nach Rückgängig: ein neuer Eintrag, der auf den zurückgenommenen verweist (das Protokoll wird nie bearbeitet). */
function wiederholeEintrag(nr: number): number | undefined {
  const o = s.protokoll.find(e => e.nr === nr); if (!o) return undefined;
  const neu = s.protokoll.reduce((m, e) => Math.max(m, e.nr), 0) + 1;
  const { zurueck: _z, vorlage: _v, ...rest } = o;
  s.protokoll = [...s.protokoll, { ...rest, nr: neu, zeit: Date.now(), quelle: 'hand', wiederholtVon: o.nr }];
  return neu;
}
/** Ein Vermerk im Protokoll, der keine Datenänderung ist (ein Vorlage-Lauf beginnt): `betroffen` ist leer. */
export function vermerkeImProtokoll(e: Pick<ProtokollEintrag, 'art' | 'ergebnis' | 'vorlage' | 'pruefung' | 'grund'>): number {
  const nr = s.protokoll.reduce((m, x) => Math.max(m, x.nr), 0) + 1;
  s.protokoll = [...s.protokoll, { nr, spalten: [], betroffen: null, vorher: s.zeilen.length, nachher: s.zeilen.length, zeit: Date.now(), quelle: 'vorlage', ohneVorlage: true, ...e }];
  return nr;
}
/** Nach dem Öffnen eines Projekts: das Protokoll aus der Ablage oder Datei übernehmen. Fehlt es, beginnt es mit dieser Fassung. */
function setzeProtokoll(p: Projekt) {
  s.zusatz = p.zusatz ? { ...p.zusatz } : {};
  s.integration = p.integration ? { ...p.integration } : {};
  s.fragebogen = p.fragebogen ?? []; s.fragebogenBilder = p.fragebogenBilder ?? {}; s.fragebogenEingaben = p.eingaben ?? {}; s.fragebogenPretest = p.pretest ?? {}; s.leitfaeden = p.leitfaeden ?? []; s.planung = p.planung ?? []; s.qual = p.qual; s.konsens = p.konsens; s.enthaeltZitate = p.enthaeltZitate === true;
  s.protokoll = p.protokoll ?? []; s.protokollLuecke = p.protokoll ? p.protokollLuecke === true : true; s.datei = p.datei ? { ...p.datei } : undefined;
}
/** Die Prüfsumme der Datei merken, aus der die Daten eingelesen wurden (SHA-256 über die Bytes). */
async function merkeDatei(datei: File) {
  let sha: string | null = null;
  try { sha = await pruefsumme(await datei.arrayBuffer()); } catch { sha = null; }
  if (s.projekt) { s.datei = { name: datei.name, sha256: sha }; await sichern(false); }
}

/* ---------- Ändern mit Rückgängig ---------- */
/** Das Fallgewicht als Kopie für einen Schritt des Verlaufs (null = ungewichtet). */
const jetztGewicht = (): Gewicht | null => (s.gewicht ? { ...s.gewicht } : null);
export async function aendere(text: string, syntax: string, gewichtNachher?: Gewicht | null, opt: AendereOpt = {}) {
  const e = await motor();
  const vor = standJetzt();
  const { bytes } = await e.exportSav();
  s.verlauf = anhaengen(s.verlauf, { text, sav: bytes, gewicht: jetztGewicht(), entscheid: { ...s.entscheid } }); s.wieder = [];
  let r;
  try { r = await e.run(syntax); }
  catch (err) { if (err instanceof EngineAbgebrochen) s.verlauf = s.verlauf.slice(0, -1); throw err; }   // abgebrochen: nichts hat sich geändert, also auch kein Schritt zum Rückgängigmachen
  if (gewichtNachher !== undefined) s.gewicht = gewichtNachher ?? undefined;   // gesetzt oder ausgeschaltet über die Daten-Seite: die Art kennt nur Statable
  else if (/^\s*WEIGHT\b/im.test(syntax)) gewichtVomBefehl = true;           // von Hand in den Befehlen: gilt, was die Engine danach trägt
  await aktualisiere();
  merkePnr(legeProtokollAn(vor, { art: opt.art ?? artAusSyntax(syntax), syntax, gewicht: gewichtNachher === undefined ? undefined : gewichtNachher ? { ...gewichtNachher } : null, opt, ergebnis: r.items.some(i => i.type === 'message' && i.severity === 'error') ? 'fehler' : 'ok' }));
  await sichern();
  return r;
}
export async function rueckgaengig(leise = false) {
  const letzter = s.verlauf.at(-1); if (!letzter) return;
  const e = await motor();
  const { bytes } = await e.exportSav();   // der Stand jetzt: den holt „Wiederholen“ zurück
  await e.importSav(letzter.sav.slice());
  const lese = tauscheLese(letzter.lese);
  if (letzter.pnr) nimmZurueck([letzter.pnr], 'rueckgaengig');
  s.wieder = anhaengen(s.wieder, { text: letzter.text, sav: bytes, ...(letzter.pnr ? { pnr: letzter.pnr } : {}), gewicht: jetztGewicht(), entscheid: { ...s.entscheid }, ...(lese ? { lese } : {}) });
  if (letzter.gewicht !== undefined) s.gewicht = letzter.gewicht ?? undefined;
  s.verlauf = s.verlauf.slice(0, -1);
  s.entscheid = letzter.entscheid;
  await aktualisiere(); await sichern();
  if (!leise) melde(L('Rückgängig gemacht: ', 'Undone: ') + letzter.text);
}
/** Wendet den zuletzt zurückgenommenen Schritt wieder an (Umkehrung von `rueckgaengig`). */
export async function wiederholen() {
  const r = s.wieder.at(-1); if (!r) return;
  const e = await motor();
  const { bytes } = await e.exportSav();
  await e.importSav(r.sav.slice());
  const lese = tauscheLese(r.lese);
  const neuePnr = r.pnr ? wiederholeEintrag(r.pnr) : undefined;
  s.verlauf = anhaengen(s.verlauf, { text: r.text, sav: bytes, ...(neuePnr ? { pnr: neuePnr } : {}), gewicht: jetztGewicht(), entscheid: { ...s.entscheid }, ...(lese ? { lese } : {}) });
  if (r.gewicht !== undefined) s.gewicht = r.gewicht ?? undefined;
  s.wieder = s.wieder.slice(0, -1);
  s.entscheid = r.entscheid;
  await aktualisiere(); await sichern();
  melde(L('Wiederholt: ', 'Redone: ') + r.text);
}

export const textAbgebrochen = () => L('Rechnung abgebrochen. Die Daten sind unverändert.', 'Calculation cancelled. The data are unchanged.');
/** Knopf „Abbrechen“ bei einer lang laufenden Rechnung: die Engine startet neu und bekommt die Daten aus der Kopie zurück (D15). */
let abbruchZaehler = 0;
/** Wie oft die Person „Abbrechen“ gedrückt hat: JS-Rechnungen im Blatt (Bootstrap) vergleichen den Stand vor und nach, um ebenfalls aufzuhören. */
export const abbruchStand = () => abbruchZaehler;
export async function bricheRechnungAb() { abbruchZaehler++; (await motor()).abbrechen(); }

/** Rechnet, ohne die Daten zu ändern (Analysen). Bricht die Person ab, wirft sie `EngineAbgebrochen`. */
export async function rechne(syntax: string): Promise<OutputItem[]> {
  const e = await motor();
  s.arbeitet = true;
  // Ansage nur hier, an der zentralen Stelle: Anfang und Ende, nichts dazwischen (Plan Welle 1 Schritt 5).
  const ansageEnde = beginneRechnung(d('Statable rechnet …', 'Statable rechnet …', 'Statable is calculating …'));
  try { const items = (await e.run(syntax)).items; ansageEnde(ergebnisSatz(items)); return items; }
  catch (err) {
    ansageEnde(null);
    if (err instanceof EngineAbgebrochen) { melde(textAbgebrochen()); throw err; }
    if (!(err instanceof EngineAbbruch)) throw err;
    // Absturz in PSPP: die Engine startet neu und bekommt die Daten zurück - hier eine Fehlermeldung statt einer leeren Seite (Regel „engine-absturz“).
    return [{ type: 'message', severity: 'error', text: `Statable: PSPP crashed and was restarted. ${err.grund}` }];
  }
  finally { s.arbeitet = false; }
}
/** „Ergebnis fertig, 3 Tabellen, 1 Diagramm“ (ohne Tabellen und Diagramme nur „Ergebnis fertig“). */
function ergebnisSatz(items: OutputItem[]): string {
  const { tabellen: t, diagramme: g } = zaehleErgebnis(items);
  return [L('Ergebnis fertig', 'Result ready'),
    t ? Lp(t, `${t} Tabelle`, `${t} Tabellen`, `${t} table`, `${t} tables`) : '',
    g ? Lp(g, `${g} Diagramm`, `${g} Diagramme`, `${g} chart`, `${g} charts`) : ''].filter(Boolean).join(', ');
}

/* ---------- Ablage im Browser ---------- */
let sicherTimer: ReturnType<typeof setTimeout> | undefined;
let sicherLauf: Promise<void> = Promise.resolve();
let vollGemeldet = false;

/** Die Liste der Projekte im Browser neu lesen. */
export async function ladeListe() {
  try { s.projekte = await listeProjekte(); } catch { s.projekte = []; }
}

/** Der Stand (`zeit`) des offenen Projekts im Browser, den dieser Tab zuletzt gelesen oder selbst geschrieben hat. Ohne Wert (neues Projekt): es gibt nichts zu vergleichen. */
let bekannteZeit: number | undefined;

/** Schreibt das offene Projekt jetzt in den Browser. Meldet, wenn der Speicher voll ist. Hat ein anderer Tab das Projekt inzwischen geändert, schreibt es nichts und fragt (`s.konflikt`). */
async function schreibe() {
  try {
    if (s.konflikt) return;
    zm('sichern-0');
    const p = await jetzigesProjekt(); zm('sichern-sav');
    if (!p) return;
    await speichereProjekt({ ...p, ungesichert: s.ungesichert }, bekannteZeit); zm('sichern-1');
    bekannteZeit = p.zeit;
    s.speicherStand = 'gespeichert'; vollGemeldet = false;
    await ladeListe();
  } catch (e) {
    if (e instanceof AblageKonflikt) { bekannteZeit = e.gespeichert; s.konflikt = true; s.speicherStand = 'gespeichert'; return; }
    if (istSpeicherVoll(e)) {
      s.speicherStand = 'voll';
      if (!vollGemeldet) { vollGemeldet = true; melde(speicherVollText()); }
    } else s.speicherStand = 'gespeichert';   // Ablage nicht möglich (privates Fenster) - Arbeit bleibt im Speicher
  }
}
export const speicherVollText = () => d(
  'Der Speicher dieses Browsers ist voll - die letzte Änderung ist nicht gesichert. Speichere das Projekt jetzt als Datei (Strg+S) und entferne Projekte, die du nicht mehr brauchst, auf der Startseite aus dem Browser.',
  'Der Speicher dieses Browsers ist voll - die letzte Änderung ist nicht gesichert. Speichern Sie das Projekt jetzt als Datei (Strg+S) und entfernen Sie Projekte, die Sie nicht mehr brauchen, auf der Startseite aus dem Browser.',
  'This browser\'s storage is full - the last change is not saved. Save the project as a file now (Ctrl+S) and remove projects you no longer need from the browser on the start page.');

/** Legt die Arbeit (kurz verzögert) im Browser ab. `geaendert = false`: frisch geöffnet, nichts Neues gegenüber der Datei. */
export async function sichern(geaendert = true) {
  if (!s.projekt || !engine) return;
  if (geaendert) { if (!s.ungesichert) s.ungesichertSeit = Date.now(); s.ungesichert = true; aenderungen++; }
  s.speicherStand = 'speichert';
  clearTimeout(sicherTimer);
  sicherTimer = setTimeout(() => { sicherTimer = undefined; sicherLauf = schreibe(); }, 400);
}
/** Wartet nicht auf den Zeitgeber: schreibt, was noch aussteht, sofort (vor dem Wechsel zu einem anderen Projekt). */
async function sichereSofort() {
  await sicherLauf;
  if (sicherTimer === undefined || !s.projekt || !engine) return;
  clearTimeout(sicherTimer); sicherTimer = undefined;
  sicherLauf = schreibe(); await sicherLauf;
}

/** Das offene Projekt, wie es jetzt ist. Alles als Schnappschuss: Ein verschachtelter $state-Proxy (Stichprobenplan, Eurostat-Quelle) lässt sich nicht in IndexedDB ablegen. */
export async function jetzigesProjekt(): Promise<(Projekt & { id: string }) | null> {
  if (!s.projekt || !engine) return null;
  const { id, name, quelle } = s.projekt;
  const { bytes } = await engine.exportSav();
  return { id, name, quelle, sav: bytes, blaetter: $state.snapshot(s.blaetter) as Blatt[], sets: $state.snapshot(s.sets) as MehrfachSet[], skalen: $state.snapshot(s.skalen) as Skala[], ...(s.codeSpalten.length ? { codeSpalten: [...s.codeSpalten] } : {}), ...(s.zusatz.plausi || s.zusatz.karte ? { zusatz: $state.snapshot(s.zusatz) as Zusatz } : {}),...(s.gewicht ? { gewicht: $state.snapshot(s.gewicht) as Gewicht } : {}), ...(integrationAusgefuellt(s.integration) ? { integration: { ...$state.snapshot(s.integration) } as Integration } : {}),  ...(s.leitfaeden.length ? { leitfaeden: s.leitfaeden } : {}), ...(s.planung.length ? { planung: s.planung } : {}), ...(s.qual ? { qual: s.qual, ...(s.konsens ? { konsens: s.konsens } : {}) } : {}), ...(s.enthaeltZitate ? { enthaeltZitate: true } : {}), ...(s.fragebogen.length ? { fragebogen: s.fragebogen, fragebogenBilder: s.fragebogenBilder, ...(Object.keys(s.fragebogenEingaben).length ? { eingaben: s.fragebogenEingaben } : {}), ...(Object.keys(s.fragebogenPretest).length ? { pretest: s.fragebogenPretest } : {}) } : {}), protokoll: $state.snapshot(s.protokoll) as ProtokollEintrag[], protokollLuecke: s.protokollLuecke, ...(s.datei ? { datei: $state.snapshot(s.datei) } : {}), entscheid: $state.snapshot(s.entscheid), zeit: Date.now(), spalten: s.spalten.length, faelle: s.zeilen.length };
}

/* ---------- Projekt als Datei ---------- */
let zielHandle: DateiZugriff | null = null;
/** Merkt die Datei nur im Speicher (Anzeige). */
function setzeZielNur(z: Ziel | null, frage = false) {
  zielHandle = z?.handle ?? null;
  s.ziel = z ? { name: z.name, zeit: z.zeit, art: z.art, frage } : null;
}
/** Merkt die Datei zum offenen Projekt (auch über einen Neustart) und setzt „ungesichert“ zurück. */
async function setzeZiel(z: Ziel) {
  setzeZielNur(z);
  s.ungesichert = false; s.ungesichertSeit = null;
  if (s.projekt) void merkeZiel(s.projekt.id, z);
  await sichern(false);
}
/** Liest die gemerkte Datei zum Projekt mit dieser id; ohne Erlaubnis (nach Neustart) heißt es: per Klick bestätigen. */
async function ladeZielFuer(id: string) {
  const z = await leseZiel(id);
  if (s.projekt?.id !== id) return;
  if (!z) { setzeZielNur(null); return; }
  setzeZielNur(z, !!z.handle && !(await zugriffGiltNoch(z.handle)));
}
/** Was das Speichern zuletzt getan hat - für die Meldung. */
let letzteArt: 'datei' | 'download' = 'download';
/**
 * Passwort (Stufe 5, Paket 5E2). Beim ersten Speichern je Sitzung fragt ein Dialog, ob mit Passwort verschlüsselt wird, wenn das Projekt
 * persönliche Daten enthält (Transkripte, Memos, Segmente, Zitate); das ersetzt den früheren Hinweis aus Stufe 4.
 * Das Passwort wird nie gemerkt: Wer verschlüsselt gespeichert oder eine verschlüsselte Datei geöffnet hat, wird bei jedem Speichern
 * wieder gefragt, und das Autospeichern in die Datei ruht (es würde sonst unverschlüsselt schreiben).
 */
let pwGefragt = false;
let verschluesseltId: string | null = null;
let letzteMitPasswort = false;
/** Vermerk „enthält Zitate“ (5E1 legt ihn an Sitzung oder Projekt an); defensiv gelesen, solange es ihn nicht gibt. */
const zitateVermerk = (): boolean => s.enthaeltZitate === true;
/** Markiert das offene Projekt als „aus verschlüsselter Datei geöffnet“. */
export function markiereVerschluesselt(): void { verschluesseltId = s.projekt?.id ?? null; }
/** Ergebnis der Frage vor dem Speichern: `null` = abgebrochen, sonst das Passwort (oder keins). */
async function waehleSchutz(id: string | undefined, qual: import('./qualprojekt').QualProjekt | undefined, mitPasswort: boolean): Promise<{ passwort?: string } | null> {
  if (mitPasswort) { const pw = await frageNeuesPasswort(); return pw === null ? null : { passwort: pw }; }
  const noetig = speichernFrageNoetig({ gefragt: pwGefragt, persoenlich: enthaeltPersoenliches(qual, zitateVermerk()), verschluesselt: !!id && verschluesseltId === id });
  if (!noetig) return {};
  pwGefragt = true;
  const a = await frageSpeicherart();
  if (a === null) return null;
  if (a === 'ohne') return {};
  const pw = await frageNeuesPasswort();
  return pw === null ? null : { passwort: pw };
}
async function dateiBytes(p: Projekt, passwort?: string): Promise<Uint8Array> {
  const zip = projektAlsDatei(p);
  if (passwort === undefined) return zip;
  pwUi.arbeitet = true;
  sage(L('Die Datei wird verschlüsselt. Das dauert etwa eine Sekunde.', 'The file is being encrypted. This takes about a second.'));
  await new Promise(r => setTimeout(r, 50));   // erst die Anzeige zeichnen lassen, dann rechnen (scrypt hält die Seite kurz an)
  try { return await verschluesseleProjekt(zip, passwort); } finally { pwUi.arbeitet = false; }
}
export const meldeGespeichert = (name: string) => melde(letzteArt === 'datei'
  ? (letzteMitPasswort ? L(`Gespeichert in ${name}, mit Passwort.`, `Saved in ${name}, with a password.`) : L(`Gespeichert in ${name}.`, `Saved in ${name}.`))
  : (letzteMitPasswort
    ? L(`Als ${name} heruntergeladen (Ordner „Downloads“), mit Passwort. Dieser Browser kann nicht in dieselbe Datei zurückspeichern; jedes Speichern lädt eine neue Datei.`, `Downloaded as ${name} (your "Downloads" folder), with a password. This browser cannot write back to the same file; every save downloads a new file.`)
    : L(`Als ${name} heruntergeladen (Ordner „Downloads“). Dieser Browser kann nicht in dieselbe Datei zurückspeichern; jedes Speichern lädt eine neue Datei.`,
        `Downloaded as ${name} (your "Downloads" folder). This browser cannot write back to the same file; every save downloads a new file.`)));

function laden(name: string, bytes: Uint8Array) {
  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'application/octet-stream' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/**
 * Speichert ein Projekt als .statable-Datei: das offene, oder mit `id` ein beliebiges aus dem Browser. Gibt den Dateinamen zurück, `null` bei Abbruch.
 * Offenes Projekt in Chrome/Edge: in die gemerkte Datei (oder beim ersten Mal Ort wählen; `unter` fragt immer). Sonst Herunterladen.
 */
export async function projektSpeichern(id?: string, opt: { unter?: boolean; mitPasswort?: boolean } = {}): Promise<string | null> {
  const offen = !!s.projekt && (!id || id === s.projekt.id);
  /** Die Frage kommt zuerst: Klicks im Dialog geben dem Browser die frische Erlaubnis für Dateiwahl und Schreiben. */
  const frueh = offen ? await waehleSchutz(s.projekt!.id, s.qual, !!opt.mitPasswort) : undefined;
  if (frueh === null) return null;
  if (offen && apiDa()) {
    try {
      const vorschlag = projektDateiname(s.projekt!.name);
      let h = zielHandle;
      // Erlaubnis zuerst: nachfragen geht nur direkt nach dem Klick, vor dem Rechnen
      if (h && !opt.unter && !(await holeZugriff(h, true))) {
        melde(d(`Kein Zugriff auf ${h.name}. Wähle „Speichern unter“, um eine Datei zu wählen.`, `Kein Zugriff auf ${h.name}. Wählen Sie „Speichern unter“, um eine Datei zu wählen.`, `No access to ${h.name}. Choose "Save as" to pick a file.`));
        return null;
      }
      if (!h || opt.unter) { h = await waehleSpeicherort(vorschlag); if (!h) return null; }
      const p = await jetzigesProjekt(); if (!p) return null;
      const bytes = await dateiBytes(p, frueh?.passwort);
      let erg = await schreibeInDatei(h, bytes, true);
      if (erg === 'weg') {   // Datei verschoben oder gelöscht: neuen Ort wählen
        h = await waehleSpeicherort(vorschlag); if (!h) return null;
        erg = await schreibeInDatei(h, bytes, true);
      }
      if (erg === 'ok') { letzteArt = 'datei'; letzteMitPasswort = frueh?.passwort !== undefined; verschluesseltId = letzteMitPasswort ? (s.projekt?.id ?? null) : null; await setzeZiel({ name: h.name, zeit: Date.now(), art: 'datei', handle: h }); meldeGespeichertHaken(); return h.name; }
      melde(L(`Kein Zugriff auf ${h.name}. Die Datei wurde nicht geändert.`, `No access to ${h.name}. The file was not changed.`));
      return null;
    } catch (e) {
      console.warn('Speichern in Datei nicht möglich, Herunterladen als Ersatz', e);   // z. B. Ordner gesperrt: nichts verlieren
    }
  }
  const p = offen ? await jetzigesProjekt() : await ladeProjekt(id ?? '').catch(() => undefined);
  if (!p) return null;
  const spaet = frueh ?? await waehleSchutz(p.id, p.qual, !!opt.mitPasswort);   // nicht geöffnetes Projekt aus der Liste: Frage nach dem Laden
  if (spaet === null) return null;
  const name = projektDateiname(p.name);
  laden(name, await dateiBytes(p, spaet.passwort));
  letzteArt = 'download';
  letzteMitPasswort = spaet.passwort !== undefined;
  if (offen) verschluesseltId = letzteMitPasswort ? (s.projekt?.id ?? null) : null;
  meldeGespeichertHaken();
  const z: Ziel = { name, zeit: Date.now(), art: 'download' };
  if (offen) await setzeZiel(z);
  else if (p.id) { await speichereProjekt({ ...p, ungesichert: false }).catch(() => {}); void merkeZiel(p.id, z); await ladeListe(); }
  return name;
}

/** Zählt Änderungen - damit das Autospeichern nicht eine Änderung als gespeichert meldet, die während des Schreibens kam. */
let aenderungen = 0;
let autoLaeuft = false;
/**
 * Autospeichern (Johannes 09.10.): Wurde das offene Projekt einmal in eine Datei gespeichert (Chrome/Edge, `art: 'datei'`) und gilt die
 * Erlaubnis noch, schreibt Statable Änderungen still in dieselbe Datei - ohne Meldung. Ohne Erlaubnis (nach einem Neustart) fragt das
 * Projektmenü wie bisher einmal per Klick; danach läuft es wieder von selbst. Gibt true zurück, wenn geschrieben wurde.
 */
export async function autoSpeichern(): Promise<boolean> {
  const h = zielHandle;
  if (autoLaeuft || !s.projekt || !s.ungesichert || !h || verschluesseltId === s.projekt.id || s.ziel?.art !== 'datei' || s.ziel.frage || !apiDa()) return false;
  autoLaeuft = true;
  try {
    if (!(await zugriffGiltNoch(h))) { autoGescheitert(h.name); return false; }
    const stand = aenderungen, id = s.projekt.id;
    const p = await jetzigesProjekt(); if (!p || s.projekt?.id !== id) return false;
    if ((await schreibeInDatei(h, projektAlsDatei(p), false)) !== 'ok') { autoGescheitert(h.name); return false; }
    letzteArt = 'datei';
    if (stand === aenderungen) await setzeZiel({ name: h.name, zeit: Date.now(), art: 'datei', handle: h });
    else if (s.ziel) s.ziel.zeit = Date.now();   // inzwischen neu geändert: bleibt „ungesichert“, die nächste Runde schreibt es
    return true;
  } catch (e) { console.warn('Autospeichern nicht möglich', e); autoGescheitert(h.name); return false; }
  finally { autoLaeuft = false; }
}
/** Die Datei ist weg (verschoben, gelöscht), der Zugriff entzogen oder das Schreiben schlägt fehl: nicht alle 2 Sekunden still weiter versuchen,
 *  sondern einmal sagen und auf den Klick im Projektmenü warten („Weiter in … speichern“ fragt nach der Erlaubnis oder lässt einen neuen Ort wählen). */
function autoGescheitert(name: string) {
  if (!s.ziel || s.ziel.frage) return;
  s.ziel.frage = true;
  melde(d(`Autospeichern in ${name} ist nicht mehr möglich (Datei verschoben oder Zugriff entzogen). Öffne das Projektmenü und wähle „Weiter in ${name} speichern“.`, `Autospeichern in ${name} ist nicht mehr möglich (Datei verschoben oder Zugriff entzogen). Öffnen Sie das Projektmenü und wählen Sie „Weiter in ${name} speichern“.`, `Autosave to ${name} is no longer possible (file moved or access withdrawn). Open the project menu and choose "Keep saving in ${name}".`));
}

/** Hat das offene Projekt etwas, das man ungern verliert? (Nicht bei Beispieldaten, nicht bei leerer Tabelle.) */
export const projektSchuetzenswert = () => !!s.projekt && istSchuetzenswert({ quelle: s.projekt.quelle, blaetter: s.blaetter.length, sets: s.sets.length + s.skalen.length, hatWerte: s.zeilen.some(z => z.some(v => v !== null)) });

/** Öffnet ein Projekt aus einer .statable-Datei als neues Projekt: Daten, Blätter, Entscheidungen. `von`: die Datei (mit Zugriff, wenn über den Auswahldialog geöffnet). */
export async function oeffneProjekt(p: Projekt, von?: { name: string; zeit: number; handle?: DateiZugriff }) {
  const kopf = schaetzeSav(p.sav); if (kopf) pruefeGroesseNachher(kopf.zeilen, kopf.spalten, p.name);   // eine Projektdatei von woanders kann größer sein, als dieser Tab trägt
  const e = await motor(); await vorNeuem();
  const r = await e.importSav(p.sav.slice());
  const fehler = r.items.find(i => i.type === 'message' && i.severity === 'error');
  if (fehler && fehler.type === 'message') throw new DateiFehler('unlesbar', p.name);
  starteProjekt(p.name, p.quelle); s.blaetter = p.blaetter; s.sets = p.sets ?? []; s.skalen = p.skalen ?? []; s.codeSpalten = p.codeSpalten ?? []; s.gewicht = p.gewicht ? { ...p.gewicht } : undefined; s.entscheid = p.entscheid; setzeProtokoll(p);
  await aktualisiere();
  await sichern(false);
  if (von) await setzeZiel({ name: von.name, zeit: von.zeit, art: von.handle ? 'datei' : 'geoeffnet', handle: von.handle });
}

/** Geht zurück zur Startseite: das Projekt wird abgelegt, bleibt in der Liste, die Engine wird geleert. */
export async function projektSchliessen() {
  clearTimeout(sicherTimer); sicherTimer = undefined;
  await sicherLauf;
  if (s.projekt && engine) await schreibe();
  leereSitzung();
  await ladeListe();
}
function leereSitzung() {
  Object.assign(s, { projekt: null, spalten: [], zeilen: [], funde: [], lesehinweise: [], blaetter: [], sets: [], skalen: [], codeSpalten: [], zusatz: {}, integration: {}, fragebogen: [], fragebogenBilder: {}, fragebogenEingaben: {}, fragebogenPretest: {}, leitfaeden: [], planung: [], qual: undefined, konsens: undefined, enthaeltZitate: false, gewicht: undefined, gewichtFrage: null, verlauf: [], wieder: [], protokoll: [], protokollLuecke: false, datei: undefined, entscheid: {}, ungesichert: false, ungesichertSeit: null, speicherStand: 'gespeichert', fehler: null, konflikt: false }); bekannteZeit = undefined;
  setzeZielNur(null); ausgabenLeeren();
  if (engine) engine.run('NEW FILE.');
}

/** Entfernt ein Projekt aus dem Browser (endgültig, wenn es nicht als Datei vorliegt). Das Nachfragen macht vorher `fragVorEntfernen`. */
export async function entferneProjekt(id: string) {
  if (s.projekt?.id === id) { clearTimeout(sicherTimer); sicherTimer = undefined; await sicherLauf; leereSitzung(); }
  await loescheProjekt(id); void vergissZiel(id);
  await ladeListe();
}

/** Benennt ein Projekt um - das offene oder, mit `id`, eines aus der Liste. */
export async function benenneUm(id: string, name: string) {
  name = name.trim().slice(0, 120); if (!name) return;
  if (s.projekt?.id === id) { s.projekt.name = name; await sichern(); return; }
  await benenneProjektUm(id, name);
  await ladeListe();
}

/** Öffnet ein Projekt aus der Liste (ohne id: das zuletzt bearbeitete). Das bisher offene wird vorher abgelegt. */
export async function weiterarbeiten(id?: string, neuLesen = false) {
  if (!id && s.projekt) return;
  if (id && s.projekt?.id === id && !neuLesen) return;
  if (neuLesen) { clearTimeout(sicherTimer); sicherTimer = undefined; await sicherLauf; } else await sichereSofort();
  if (!id) await ladeListe();
  const wahl = id ?? s.projekte[0]?.id; if (!wahl) return;
  const p = await ladeProjekt(wahl); if (!p) { await ladeListe(); throw new Error('Projekt nicht gefunden'); }
  const e = await motor();
  await e.importSav(p.sav.slice());
  if (s.projekt?.id !== wahl) ausgabenLeeren();
  s.projekt = { id: wahl, name: p.name, quelle: p.quelle }; bekannteZeit = p.zeit; s.konflikt = false; s.lesehinweise = []; s.blaetter = p.blaetter; s.sets = p.sets ?? []; s.skalen = p.skalen ?? []; s.codeSpalten = p.codeSpalten ?? []; s.gewicht = p.gewicht ? { ...p.gewicht } : undefined; s.gewichtFrage = null; s.entscheid = p.entscheid; s.verlauf = []; s.wieder = []; s.fehler = null; setzeProtokoll(p);
  s.ungesichert = p.ungesichert ?? p.blaetter.length > 0; s.ungesichertSeit = s.ungesichert ? Date.now() : null;
  setzeZielNur(null);
  await aktualisiere();
  void ladeZielFuer(wahl);
}
/** Entscheidung 1 nach einer Änderung in einem anderen Tab: die gespeicherte Fassung laden, die eigenen ungespeicherten Änderungen dieses Tabs verwerfen. */
export async function konfliktNeuLaden() { const id = s.projekt?.id; if (id) await weiterarbeiten(id, true); }
/** Entscheidung 2: hier weiterarbeiten - der Stand aus dem anderen Tab wird überschrieben. */
export function konfliktHierWeiter() { s.konflikt = false; void sichern(false); }

/** Die Spalte mit diesem Namen; ein Mehrfachantworten-Set („$medien“) kommt als Spalte mit seiner Beschriftung zurück. */
export function spalteNach(name: string) {
  const sp = s.spalten.find(x => x.name === name);
  if (sp || !istSetName(name)) return sp;
  const set = s.sets.find(x => '$' + x.name === name);
  return set ? setAlsSpalte(set) : undefined;
}
/** Die Sets, deren Spalten alle noch da sind. */
export const nutzbareSets = () => brauchbareSets(s.sets, s.spalten);
/** Setzt die Sets (neu definiert, geändert, gelöscht) und legt sie ab. */
export function setzeSets(sets: MehrfachSet[]) { s.sets = sets; return sichern(); }
/** Die Skalen, deren Fragen alle noch da sind (gliedern die Spaltenauswahl, gehen in den .sav-Export). */
export const nutzbareSkalen = () => brauchbareSkalen(s.skalen, s.spalten);
/** Setzt die Skalen (festgelegt, geändert, gelöscht) und legt sie ab. */
export function setzeSkalen(skalen: Skala[]) { s.skalen = skalen; return sichern(); }
/** Setzt die Fragebogen-Pläne (und ihre Bilder) und legt sie im Projekt ab. Ohne offenes Projekt bleibt es beim Speicher (die Seite „Fragebogen planen“ hält dann einen Entwurf). */
export function setzeFragebogen(plaene: FragebogenPlan[], bilder?: Record<string, Uint8Array>) {
  s.fragebogen = plaene;
  if (bilder) s.fragebogenBilder = bilder;
  return sichern();
}
/** Setzt die eingegebenen Durchgänge (Paket 2F) und legt sie im Projekt ab. */
export function setzeFragebogenEingaben(eingaben: Record<string, import('./doppeleingabe').PlanEingaben>) {
  s.fragebogenEingaben = eingaben;
  return sichern();
}
/** Setzt die gesammelten Pretest-Kommentare (Paket 2G) und legt sie im Projekt ab. */
export function setzeFragebogenPretest(pretest: Record<string, import('./pretest').PretestPlan>) {
  s.fragebogenPretest = pretest;
  return sichern();
}
/** Setzt die Interview-Leitfäden (Paket 4D) und legt sie im Projekt ab. */
export function setzeLeitfaeden(liste: import('./leitfaden').Leitfaden[]) {
  s.leitfaeden = liste;
  return sichern();
}
/** Setzt die Forschungsplanung (Stufe V2) und legt sie im Projekt ab. */
export function setzePlanung(liste: import('./planung').Planung[]) {
  s.planung = liste;
  return sichern();
}
/** Setzt das qualitative Projekt (Paket 4C; `undefined` entfernt es) und legt es im Projekt ab. */
export function setzeQual(q: import('./qualprojekt').QualProjekt | undefined) {
  s.qual = q;
  return sichern();
}
/** Setzt die offenen Konsens-Entscheidungen (Paket 5E1; `undefined` entfernt sie) und legt sie im Projekt ab. */
export function setzeKonsens(k: import('./konsens-zustand').KonsensEntwurf | undefined) {
  s.konsens = k;
  return sichern();
}
/** Merkt am Projekt, dass Zitate aus Interviews als Textspalten in den Daten stehen (Paket 5E1). */
export function setzeEnthaeltZitate(ja: boolean) {
  s.enthaeltZitate = ja;
  return sichern();
}
/** Ein Feld der Integration (Mixed Methods) setzen und ablegen. */
export function setzeIntegration(feld: keyof Integration, text: string) { s.integration = { ...$state.snapshot(s.integration), [feld]: text }; return sichern(); }
/** Setzt Plausibilitätsregeln und/oder Karte (`undefined` entfernt das Feld) und legt sie ab. Die Angaben sind verschachtelt: s.zusatz bekommt eine Kopie, nie die übergebenen Objekte. */
export function setzeZusatz(teil: Partial<Zusatz>) {
  const jetzt = $state.snapshot(s.zusatz) as Zusatz;
  const neu: Zusatz = { ...jetzt, ...teil };
  if (neu.plausi === undefined || !neu.plausi.length) delete neu.plausi;
  if (neu.karte === undefined) delete neu.karte;
  s.zusatz = JSON.parse(JSON.stringify(neu)) as Zusatz;
  return sichern();
}
